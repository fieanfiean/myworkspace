import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, BookOpen, CalendarDays, Camera, Car, CircleDollarSign, Clapperboard, Dumbbell, Gift, HeartPulse, LoaderCircle, Plane, Plus, ReceiptText, Search, Shirt, ShoppingCart, Utensils, WalletCards, X, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import imageCompression from 'browser-image-compression';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useBudgetTransactions } from '@/hooks/useBudgetTransactions';
import { getMyrPerCurrency } from '@/lib/exchangeRates';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { TransactionEditModal } from '@/components/Budget/TransactionEditModal';
import { TransactionDetailModal } from '@/components/Budget/TransactionDetailModal';
import { ExchangeRateAttribution } from '@/components/Budget/ExchangeRateAttribution';
import { filterBudgetTransactions, type CategoryFilter, type DateRangePreset, type TransactionTypeFilter } from '@/lib/budgetFilters';
import { checkDuplicateTransaction, type DuplicateCheckResult, type ParsedOCRResult } from '@/lib/deduplication';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/storage';
import { categoriesForType, expenseCategories, incomeCategories, type BudgetTransaction, type CurrencyCode, type NewBudgetTransaction, type TransactionCategory, type TransactionType } from '@/types/budget';

const baseCurrency: CurrencyCode = 'MYR';
const transactionPageSize = 50;
const currencies: CurrencyCode[] = ['MYR', 'USD', 'SGD', 'JPY', 'EUR', 'GBP', 'CNY', 'THB', 'TWD'];
const categoryStyle: Record<TransactionCategory, { icon: typeof CircleDollarSign; classes: string }> = {
  salary: { icon: CircleDollarSign, classes: 'bg-emerald-500/15 text-emerald-400' },
  bonus: { icon: ArrowUpRight, classes: 'bg-lime-500/15 text-lime-400' },
  red_packet: { icon: Banknote, classes: 'bg-red-500/15 text-red-400' },
  allowance: { icon: WalletCards, classes: 'bg-teal-500/15 text-teal-400' },
  investment: { icon: ArrowUpRight, classes: 'bg-blue-500/15 text-blue-400' },
  other_income: { icon: CircleDollarSign, classes: 'bg-cyan-500/15 text-cyan-400' },
  groceries: { icon: ShoppingCart, classes: 'bg-orange-500/15 text-orange-400' },
  food: { icon: Utensils, classes: 'bg-amber-500/15 text-amber-400' },
  transport: { icon: Car, classes: 'bg-violet-500/15 text-violet-400' },
  utilities: { icon: Zap, classes: 'bg-sky-500/15 text-sky-400' },
  entertainment: { icon: Clapperboard, classes: 'bg-pink-500/15 text-pink-400' },
  freelance: { icon: Banknote, classes: 'bg-cyan-500/15 text-cyan-400' },
  healthcare: { icon: HeartPulse, classes: 'bg-rose-500/15 text-rose-400' },
  shopping: { icon: ShoppingCart, classes: 'bg-fuchsia-500/15 text-fuchsia-400' },
  other_expense: { icon: ReceiptText, classes: 'bg-slate-500/15 text-slate-300' },
  bills: { icon: Zap, classes: 'bg-sky-500/15 text-sky-400' },
  clothing: { icon: Shirt, classes: 'bg-pink-500/15 text-pink-400' },
  education: { icon: BookOpen, classes: 'bg-blue-500/15 text-blue-400' },
  fitness: { icon: Dumbbell, classes: 'bg-lime-500/15 text-lime-400' },
  gifts: { icon: Gift, classes: 'bg-fuchsia-500/15 text-fuchsia-400' },
  health: { icon: HeartPulse, classes: 'bg-rose-500/15 text-rose-400' },
  others: { icon: ReceiptText, classes: 'bg-slate-500/15 text-slate-300' },
  tips: { icon: Banknote, classes: 'bg-emerald-500/15 text-emerald-400' },
  transportation: { icon: Car, classes: 'bg-violet-500/15 text-violet-400' },
  travel: { icon: Plane, classes: 'bg-cyan-500/15 text-cyan-400' },
};
const fallbackCategoryStyle = { icon: ReceiptText, classes: 'bg-slate-500/15 text-slate-300' };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const percentChange = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;
type ChartGranularity = 'daily' | 'weekly' | 'monthly';

interface ReceiptOCRResult extends ParsedOCRResult {
  currency: 'MYR';
  transaction_time: string;
  type: TransactionType;
  suggested_category: 'Groceries' | 'Food' | 'Transport' | 'Utilities' | 'Entertainment' | 'Healthcare' | 'Other';
}

interface ReceiptBatchResult {
  transactions: ReceiptOCRResult[];
}

interface BatchImportItem {
  id: string;
  transaction: NewBudgetTransaction;
  duplicate: DuplicateCheckResult | null;
  selected: boolean;
}

interface ReceiptFunctionError {
  error: string;
}

type ReceiptFunctionResponse = ReceiptBatchResult | ReceiptFunctionError;

async function receiptInvokeErrorMessage(error: unknown, fallback: string, rateLimit: string, serviceUnavailable: string): Promise<string> {
  if (typeof error !== 'object' || error === null) return fallback;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return fallback;
  if (context.status === 429) return rateLimit;
  if (context.status === 503) return serviceUnavailable;
  try {
    const body = await context.clone().json() as unknown;
    if (typeof body === 'object' && body !== null) {
      const errorBody = body as { error?: unknown; details?: unknown };
      if (errorBody.details !== undefined) console.error('400 Detailed Response:', errorBody.details);
      if (typeof errorBody.error === 'string') {
        console.error('Parse Receipt Error:', errorBody.error);
        return errorBody.error;
      }
    }
  } catch {
    // The fallback remains actionable when the response body is not JSON.
  }
  console.error('Parse Receipt Error:', error instanceof Error ? error.message : fallback);
  return fallback;
}

export function BudgetPage({ toolsOpen, onCloseTools }: { toolsOpen: boolean; onCloseTools: () => void }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { transactions, loading, error, addTransaction, addTransactions, updateTransaction, deleteTransaction } = useBudgetTransactions(user?.id);
  const [form, setForm] = useState<NewBudgetTransaction>({ type: 'expense', amount: 0, description: '', transactionDate: today(), transaction_time: '', category: 'groceries', originalCurrency: baseCurrency, exchangeRate: 1 });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateCheckResult | null>(null);
  const [batchItems, setBatchItems] = useState<BatchImportItem[]>([]);
  const [viewing, setViewing] = useState<BudgetTransaction | null>(null);
  const [editing, setEditing] = useState<BudgetTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [transactionPage, setTransactionPage] = useState({ filterKey: '', count: transactionPageSize });
  const [granularity, setGranularity] = useState<ChartGranularity>('monthly');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const chartDrag = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const currency = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: baseCurrency, currencyDisplay: 'narrowSymbol' }), [locale]);
  const selectedCurrency = form.originalCurrency ?? baseCurrency;
  const exchangeRate = selectedCurrency === baseCurrency ? 1 : (form.exchangeRate ?? 0);
  const convertedAmount = Number.isFinite(form.amount * exchangeRate) ? Math.round(form.amount * exchangeRate * 100) / 100 : 0;

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    try {
      if (!file) return;
      setScanningReceipt(true);
      setFormError(null);
      setDuplicateMatch(null);
      setBatchItems([]);
      if (!file.type.startsWith('image/')) throw new Error('Receipt upload must be an image.');
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      const imageUrl = await uploadToR2(compressedFile, 'receipts');
      const { data, error: invokeError } = await supabase.functions.invoke<ReceiptFunctionResponse>('parse-receipt', { body: { imageUrl } });
      if (invokeError) {
        setFormError(await receiptInvokeErrorMessage(invokeError, t('budget.form.scanError'), t('budget.form.scanRateLimit'), t('budget.form.scanServiceUnavailable')));
        return;
      }
      if (!data) throw new Error(t('budget.form.scanError'));
      if ('error' in data) {
        setFormError(data.error);
        return;
      }
      if (!Array.isArray(data.transactions) || data.transactions.length === 0) throw new Error(t('budget.form.scanNoTransactions'));
      const parsedItems = data.transactions.map((item, index): BatchImportItem => {
        const normalizedCategory = item.suggested_category.toLocaleLowerCase();
        const suggestedCategory = normalizedCategory === 'other' ? 'other_expense' : normalizedCategory as TransactionCategory;
        const category = categoriesForType(item.type).includes(suggestedCategory) ? suggestedCategory : item.type === 'income' ? 'other_income' : 'other_expense';
        const parsed: ParsedOCRResult = { amount: item.amount, date: item.date, time: item.transaction_time, description: item.description };
        const duplicate = checkDuplicateTransaction(parsed, transactions);
        return {
          id: `${item.date}-${item.transaction_time}-${index}`,
          transaction: { type: item.type, amount: item.amount, description: item.description, transactionDate: item.date, transaction_time: item.transaction_time, category, originalCurrency: baseCurrency, originalAmount: item.amount, exchangeRate: 1 },
          duplicate: duplicate.isDuplicate ? duplicate : null,
          selected: !duplicate.isDuplicate,
        };
      });
      if (parsedItems.length === 1) {
        setForm(parsedItems[0].transaction);
        setDuplicateMatch(parsedItems[0].duplicate);
      } else {
        setBatchItems(parsedItems);
      }
      setRateError(null);
    } catch (cause) {
      console.error('Receipt scan failed.', cause);
      setFormError(cause instanceof Error ? cause.message : t('budget.form.scanError'));
    } finally {
      setScanningReceipt(false);
      input.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const importBatch = async () => {
    const selected = batchItems.filter(item => item.selected).map(item => item.transaction);
    if (selected.length === 0) {
      setFormError(t('budget.form.batchSelectOne'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await addTransactions(selected);
      setBatchItems([]);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : t('budget.form.batchSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const changeCurrency = async (originalCurrency: CurrencyCode) => {
    setForm(current => ({ ...current, originalCurrency, exchangeRate: originalCurrency === baseCurrency ? 1 : 0 }));
    setRateError(null);
    if (originalCurrency === baseCurrency) return;
    setLoadingRate(true);
    try {
      const latestRate = await getMyrPerCurrency(originalCurrency);
      setForm(current => current.originalCurrency === originalCurrency ? { ...current, exchangeRate: latestRate } : current);
    } catch {
      setRateError(t('budget.exchange.manualFallback'));
    } finally { setLoadingRate(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setFormError(null);
    try { await deleteTransaction(deleteTarget.id); setDeleteTarget(null); }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : t('budget.delete.error')); }
    finally { setDeleting(false); }
  };

  const summary = useMemo(() => {
    const now = new Date(), current = monthKey(now), previous = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    let total = 0, income = 0, expenses = 0, previousIncome = 0, previousExpenses = 0;
    transactions.forEach(item => {
      total += item.type === 'income' ? item.amount : -item.amount;
      const key = item.transactionDate.slice(0, 7);
      if (key === current) {
        if (item.type === 'income') income += item.amount;
        else expenses += item.amount;
      }
      if (key === previous) {
        if (item.type === 'income') previousIncome += item.amount;
        else previousExpenses += item.amount;
      }
    });
    return { total, income, expenses, incomeChange: percentChange(income, previousIncome), expenseChange: percentChange(expenses, previousExpenses) };
  }, [transactions]);

  const filteredTransactions = useMemo(() => filterBudgetTransactions(transactions, { search, category: categoryFilter, type: typeFilter, dateRange, customFrom, customTo }, category => t(`budget.categories.${category}`)), [categoryFilter, customFrom, customTo, dateRange, search, t, transactions, typeFilter]);
  const transactionFilterKey = `${search}\u0000${categoryFilter}\u0000${typeFilter}\u0000${dateRange}\u0000${customFrom}\u0000${customTo}`;
  const visibleTransactionCount = transactionPage.filterKey === transactionFilterKey ? transactionPage.count : transactionPageSize;
  const setVisibleTransactionCount = (update: (count: number) => number) => {
    setTransactionPage({ filterKey: transactionFilterKey, count: update(visibleTransactionCount) });
  };

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, BudgetTransaction[]>();
    filteredTransactions.slice(0, visibleTransactionCount).forEach(item => groups.set(item.transactionDate, [...(groups.get(item.transactionDate) ?? []), item]));
    return [...groups.entries()].map(([date, items]) => ({ date, items, total: items.reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0) }));
  }, [filteredTransactions, visibleTransactionCount]);

  const visualSummary = useMemo(() => {
    let income = 0, expense = 0;
    const categoryTotals = new Map<TransactionCategory, number>();
    filteredTransactions.forEach(item => {
      if (item.type === 'income') income += item.amount;
      else {
        expense += item.amount;
        categoryTotals.set(item.category, (categoryTotals.get(item.category) ?? 0) + item.amount);
      }
    });
    const topCategories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, amount]) => ({ category, amount, percent: expense > 0 ? amount / expense * 100 : 0 }));
    return { income, expense, net: income - expense, topCategories };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, { key: string; income: number; expenses: number }>();
    filteredTransactions.forEach(item => {
      const date = new Date(`${item.transactionDate}T00:00:00Z`);
      let key = item.transactionDate;
      if (granularity === 'monthly') key = item.transactionDate.slice(0, 7);
      if (granularity === 'weekly') {
        const day = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() - day + 1);
        key = date.toISOString().slice(0, 10);
      }
      const bucket = buckets.get(key) ?? { key, income: 0, expenses: 0 };
      bucket[item.type === 'income' ? 'income' : 'expenses'] += item.amount;
      buckets.set(key, bucket);
    });
    return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)).map(bucket => {
      const date = new Date(`${bucket.key}${granularity === 'monthly' ? '-01' : ''}T00:00:00Z`);
      const label = granularity === 'monthly'
        ? new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date)
        : new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
      return { ...bucket, month: granularity === 'weekly' ? `${t('budget.chart.weekOf')} ${label}` : label };
    });
  }, [filteredTransactions, granularity, locale, t]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!Number.isFinite(form.amount) || form.amount <= 0 || !form.description.trim() || !Number.isFinite(exchangeRate) || exchangeRate <= 0) { setFormError(t('budget.form.validation')); return; }
    setSaving(true); setFormError(null);
    try {
      await addTransaction({ ...form, amount: convertedAmount, originalAmount: form.amount, originalCurrency: selectedCurrency, exchangeRate });
      setForm(current => ({ ...current, amount: 0, description: '', transactionDate: today(), transaction_time: '' }));
      setDuplicateMatch(null);
    }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : t('budget.form.saveError')); }
    finally { setSaving(false); }
  };

  const changeBadge = (value: number, isExpense = false) => {
    const favorable = isExpense ? value <= 0 : value >= 0, Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
    const formatted = `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    return <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${favorable ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}><Icon size={13}/>{formatted}</span><span>{t('budget.stats.vsLastMonth', { value: formatted })}</span></div>;
  };

  const stats = [
    { label: t('budget.stats.totalBalance'), value: summary.total, icon: WalletCards, color: 'text-indigo-400', footer: <p className="text-xs text-slate-500">{t('budget.stats.updatedToday')}</p> },
    { label: t('budget.stats.monthlyIncome'), value: summary.income, icon: ArrowUpRight, color: 'text-emerald-400', footer: changeBadge(summary.incomeChange) },
    { label: t('budget.stats.monthlyExpenses'), value: summary.expenses, icon: ArrowDownRight, color: 'text-rose-400', footer: changeBadge(summary.expenseChange, true) },
  ];

  const startChartDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !chartScrollRef.current) return;
    chartDrag.current = { active: true, startX: event.clientX, scrollLeft: chartScrollRef.current.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveChartDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!chartDrag.current.active || !chartScrollRef.current) return;
    chartScrollRef.current.scrollLeft = chartDrag.current.scrollLeft - (event.clientX - chartDrag.current.startX);
  };
  const stopChartDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    chartDrag.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const chartWidth = Math.max(600, chartData.length * 90);

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <div><h1 className="text-2xl font-bold tracking-tight text-white">{t('budget.title')}</h1><p className="mt-1 text-sm text-slate-400">{t('budget.subtitle')}</p></div>
    {(error || formError) && <div role="alert" className="rounded-xl border border-rose-800/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{formError ?? error?.message}</div>}
    <section className="grid gap-4 md:grid-cols-3">{stats.map(({ label, value, icon: Icon, color, footer }) => <article key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-400">{label}</p><Icon size={19} className={color}/></div><p className="mt-3 text-3xl font-bold tracking-tight text-white">{currency.format(value)}</p><div className="mt-4">{footer}</div></article>)}</section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/10">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative block"><span className="sr-only">{t('budget.filters.search')}</span><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-500"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('budget.filters.searchPlaceholder')} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"/></label>
            <label><span className="sr-only">{t('budget.filters.category')}</span><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as CategoryFilter)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-indigo-500"><option value="all">{t('budget.filters.allCategories')}</option><optgroup label={t('budget.categoryGroups.income')}>{incomeCategories.map(category => <option key={category} value={category}>{t(`budget.categories.${category}`)}</option>)}</optgroup><optgroup label={t('budget.categoryGroups.expense')}>{expenseCategories.map(category => <option key={category} value={category}>{t(`budget.categories.${category}`)}</option>)}</optgroup></select></label>
            <label><span className="sr-only">{t('budget.filters.type')}</span><select value={typeFilter} onChange={event => setTypeFilter(event.target.value as TransactionTypeFilter)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-indigo-500"><option value="all">{t('budget.filters.allTypes')}</option><option value="income">{t('budget.income')}</option><option value="expense">{t('budget.expense')}</option></select></label>
            <label><span className="sr-only">{t('budget.filters.dateRange')}</span><select value={dateRange} onChange={event => setDateRange(event.target.value as DateRangePreset)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-indigo-500">{(['all','week','month','threeMonths','custom'] as DateRangePreset[]).map(range => <option key={range} value={range}>{t(`budget.filters.ranges.${range}`)}</option>)}</select></label>
          </div>
          {dateRange === 'custom' && <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2"><label className="text-xs text-slate-500"><span className="mb-1 block">{t('budget.filters.from')}</span><input type="date" value={customFrom} max={customTo || undefined} onChange={event => setCustomFrom(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-indigo-500"/></label><label className="text-xs text-slate-500"><span className="mb-1 block">{t('budget.filters.to')}</span><input type="date" value={customTo} min={customFrom || undefined} onChange={event => setCustomTo(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-indigo-500"/></label></div>}
          <p className="mt-3 text-xs text-slate-500">{t('budget.filters.results', { count: filteredTransactions.length })}</p>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-white">{t('budget.chart.title')}</h2><p className="mt-1 text-xs text-slate-500">{t('budget.chart.filteredPeriod')}</p></div><div className="flex gap-4 text-xs text-slate-400"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-400"/>{t('budget.income')}</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-rose-400"/>{t('budget.expense')}</span></div></div>
          <div className="mb-4 grid grid-cols-3 rounded-xl bg-slate-950 p-1">{(['daily','weekly','monthly'] as ChartGranularity[]).map(value => <button type="button" key={value} onClick={() => setGranularity(value)} className={`min-h-11 rounded-lg px-2 text-xs font-semibold transition sm:text-sm ${granularity === value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{t(`budget.chart.granularity.${value}`)}</button>)}</div>
          <div ref={chartScrollRef} data-horizontal-scroll className="scrollbar-none h-72 w-full cursor-grab touch-pan-x overflow-x-auto overscroll-x-contain active:cursor-grabbing" aria-label={t('budget.chart.title')} onPointerDown={startChartDrag} onPointerMove={moveChartDrag} onPointerUp={stopChartDrag} onPointerCancel={stopChartDrag}><div className="h-full" style={{ width: `max(100%, ${chartWidth}px)` }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fb7185" stopOpacity={0.25}/><stop offset="95%" stopColor="#fb7185" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="4 4"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value: number) => `RM ${value / 1000}k`}/><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} labelStyle={{ color: '#f8fafc' }} formatter={value => currency.format(Number(value))}/><Area type="monotone" dataKey="income" name={t('budget.income')} stroke="#34d399" strokeWidth={2.5} fill="url(#incomeFill)"/><Area type="monotone" dataKey="expenses" name={t('budget.expense')} stroke="#fb7185" strokeWidth={2.5} fill="url(#expenseFill)"/>
          </AreaChart></ResponsiveContainer></div></div>
        </section>
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div className="grid gap-3 sm:grid-cols-3">{[
            { label: t('budget.visual.totalIncome'), value: visualSummary.income, color: 'text-emerald-400', bar: 'bg-emerald-400' },
            { label: t('budget.visual.totalExpense'), value: visualSummary.expense, color: 'text-rose-400', bar: 'bg-rose-400' },
            { label: t('budget.visual.netBalance'), value: visualSummary.net, color: visualSummary.net >= 0 ? 'text-indigo-300' : 'text-rose-300', bar: 'bg-indigo-400' },
          ].map(item => <article key={item.label} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p><p className={`mt-2 text-xl font-bold ${item.color}`}>{currency.format(item.value)}</p><div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-800"><div className={`h-full w-2/3 rounded-full ${item.bar}`}/></div></article>)}</div>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><h3 className="font-semibold text-white">{t('budget.visual.topCategories')}</h3><div className="mt-4 space-y-3">{visualSummary.topCategories.length === 0 ? <p className="text-sm text-slate-500">{t('budget.visual.noExpenses')}</p> : visualSummary.topCategories.map(({ category, amount, percent }, index) => <div key={category}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-300">{t(`budget.categories.${category}`)}</span><span className="shrink-0 text-slate-500">{percent.toFixed(0)}% · {currency.format(amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={['bg-indigo-400','bg-rose-400','bg-amber-400','bg-cyan-400','bg-fuchsia-400'][index]} style={{ width: `${percent}%`, height: '100%' }}/></div></div>)}</div></article>
        </section>

        <section><div className="mb-3 flex items-center justify-between px-1"><h2 className="font-semibold text-white">{t('budget.recent.title')}</h2><span className="text-xs text-slate-500">{t('budget.recent.count', { count: filteredTransactions.length })}</span></div>{loading ? <div className="rounded-2xl border border-slate-800 bg-slate-900/80 py-12 text-center text-sm text-slate-500"><LoaderCircle className="mx-auto mb-2 animate-spin" size={20}/>{t('budget.loading')}</div> : groupedTransactions.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-900/80 py-12 text-center text-sm text-slate-500">{t('budget.recent.noMatches')}</div> : <div className="space-y-5">{groupedTransactions.map(group => <article key={group.date} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10"><header className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/35 px-4 py-3"><h3 className="text-sm font-semibold text-slate-200">{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${group.date}T00:00:00Z`))}</h3><p className={`text-sm font-semibold ${group.total >= 0 ? 'text-emerald-400' : 'text-rose-300'}`}>{t('budget.recent.dayTotal')}: {group.total >= 0 ? '+' : '-'}{currency.format(Math.abs(group.total))}</p></header><div className="divide-y divide-slate-800/80">{group.items.map(item => { const style = categoryStyle[item.category] ?? fallbackCategoryStyle, Icon = style.icon ?? ReceiptText; return <button type="button" key={item.id} onClick={() => setViewing(item)} className="grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"><span className={`rounded-xl p-2.5 ${style.classes}`}><Icon size={18}/></span><span className="min-w-0"><strong className="block truncate text-sm text-slate-100">{item.description}</strong><span className="mt-1 block truncate text-xs text-slate-500">{item.transaction_time || t('budget.detail.notRecorded')} · {t(`budget.categories.${item.category}`)}</span></span><span className={`whitespace-nowrap text-sm font-bold ${item.type === 'income' ? 'text-emerald-400' : 'text-rose-300'}`}>{item.type === 'income' ? '+' : '-'}{currency.format(item.amount)}</span></button>; })}</div></article>)}<div className="flex flex-col items-center gap-3 pt-1"><p className="text-xs text-slate-500">{t('budget.recent.showing', { shown: Math.min(visibleTransactionCount, filteredTransactions.length), total: filteredTransactions.length })}</p>{visibleTransactionCount < filteredTransactions.length && <button type="button" onClick={() => setVisibleTransactionCount(count => count + transactionPageSize)} className="min-h-11 rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-6 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20">{t('budget.recent.loadMore')}</button>}</div></div>}</section>
      </div>

      <button type="button" aria-label={t('sidebar.closeTools')} onClick={onCloseTools} className={`fixed inset-0 z-[55] bg-slate-950/60 backdrop-blur-sm transition-opacity md:hidden ${toolsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}/>
      <aside data-swipe-drawer="right" className={`fixed inset-y-0 right-0 z-[60] w-[min(22rem,calc(100vw-2rem))] touch-pan-y overflow-y-auto overscroll-x-contain border-l border-slate-800 bg-slate-900 p-5 shadow-2xl transition-transform duration-300 md:static md:z-auto md:w-auto md:translate-x-0 md:overflow-visible md:rounded-2xl md:border md:bg-slate-900/80 md:shadow-xl md:shadow-black/10 xl:sticky xl:top-6 ${toolsOpen ? 'translate-x-0' : 'translate-x-full'}`}><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-indigo-500/15 p-2 text-indigo-400"><Plus size={19}/></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-white">{t('budget.form.title')}</h2><p className="text-xs text-slate-500">{t('budget.form.subtitle')}</p></div><button type="button" onClick={onCloseTools} aria-label={t('sidebar.closeTools')} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 md:hidden"><X size={20}/></button></div>
        <form className="relative space-y-5" aria-busy={scanningReceipt} onSubmit={event => void submit(event)}>
          {scanningReceipt && <div className="absolute -inset-2 z-20 flex min-h-full items-center justify-center rounded-xl bg-slate-900/90 backdrop-blur-sm" role="status"><span className="flex flex-col items-center gap-3 text-sm font-semibold text-indigo-300"><LoaderCircle size={32} className="animate-spin"/>{t('budget.form.scanning')}</span></div>}
          <div className="space-y-3">
            <button type="button" disabled={scanningReceipt || saving} onClick={() => fileInputRef.current?.click()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-500/60 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60">
              <Camera size={19}/><span>{t('budget.form.scanReceipt')}</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" disabled={scanningReceipt || saving} onChange={event => void handleFileSelect(event)}/>
            <p className="text-center text-xs text-slate-500">{t('budget.form.scanHint')}</p>
          </div>
          {batchItems.length > 0 && <section className="space-y-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-3" aria-label={t('budget.form.batchTitle')}>
            <div><h3 className="text-sm font-bold text-indigo-200">{t('budget.form.batchTitle')}</h3><p className="mt-1 text-xs text-slate-400">{t('budget.form.batchFound', { count: batchItems.length })}</p></div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">{batchItems.map(item => <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${item.selected ? 'border-indigo-500/60 bg-slate-950/70' : 'border-slate-700 bg-slate-900/60'}`}>
              <input type="checkbox" checked={item.selected} disabled={saving} onChange={event => setBatchItems(current => current.map(candidate => candidate.id === item.id ? { ...candidate, selected: event.target.checked } : candidate))} className="mt-1 size-4 accent-indigo-500"/>
              <span className="min-w-0 flex-1"><span className="flex justify-between gap-2 text-sm"><strong className="truncate text-white">{item.transaction.description}</strong><span className={item.transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}>{currency.format(item.transaction.amount)}</span></span><span className="mt-1 block text-xs text-slate-400">{item.transaction.transactionDate} {item.transaction.transaction_time} · {t(`budget.categories.${item.transaction.category}`)}</span>{item.duplicate && <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-400"><AlertTriangle size={13}/>{t('budget.form.batchDuplicate')}</span>}</span>
            </label>)}</div>
            <div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={() => setBatchItems([])} className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:bg-slate-800">{t('common.cancel')}</button><button type="button" disabled={saving || !batchItems.some(item => item.selected)} onClick={() => void importBatch()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{saving && <LoaderCircle size={16} className="animate-spin"/>}{t('budget.form.batchImport', { count: batchItems.filter(item => item.selected).length })}</button></div>
          </section>}
          {duplicateMatch?.matchedTransaction && <div role="alert" className="rounded-xl border border-amber-500/70 bg-amber-500/15 p-4 text-amber-100 shadow-lg shadow-amber-950/20"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={21}/><div><p className="font-bold">{t('budget.form.duplicateWarningTitle')}</p><p className="mt-1 text-sm text-amber-200">{t('budget.form.duplicateWarningDesc', { date: duplicateMatch.matchedTransaction.date ?? duplicateMatch.matchedTransaction.transactionDate ?? '', amount: currency.format(duplicateMatch.matchedTransaction.amount), merchant: duplicateMatch.matchedTransaction.description })}</p></div></div></div>}
          <fieldset><legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.type')}</legend><div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1">{(['income', 'expense'] as TransactionType[]).map(type => <button key={type} type="button" onClick={() => setForm(current => ({ ...current, type, category: categoriesForType(type)[0] }))} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${form.type === type ? type === 'income' ? 'bg-emerald-700 text-white shadow' : 'bg-rose-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>{t(`budget.${type}`)}</button>)}</div></fieldset>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.currency')}</span><select value={selectedCurrency} onChange={event => void changeCurrency(event.target.value as CurrencyCode)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500">{currencies.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.amount')} ({selectedCurrency})</span><input required min="0.01" step="0.01" type="number" value={form.amount || ''} onChange={event => setForm(current => ({ ...current, amount: event.target.valueAsNumber }))} placeholder="0.00" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"/></label>
          </div>
          {selectedCurrency !== baseCurrency && <div className="grid grid-cols-1 gap-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 md:grid-cols-2">
            <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.exchangeRate')}</span><span className="relative block"><input required min="0.000001" step="0.000001" type="number" value={form.exchangeRate || ''} onChange={event => setForm(current => ({ ...current, exchangeRate: event.target.valueAsNumber }))} placeholder="0.000000" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-indigo-500"/>{loadingRate && <LoaderCircle size={17} className="absolute right-3 top-3 animate-spin text-indigo-400"/>}</span><span className="mt-1.5 block text-xs text-slate-500">1 {selectedCurrency} = {exchangeRate || 0} {baseCurrency}</span></label>
            <div><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.convertedAmount')}</span><output className="flex min-h-11 w-full items-center rounded-xl border border-slate-700 bg-slate-950/60 px-3 text-sm font-semibold text-indigo-400">{currency.format(convertedAmount)}</output></div>
          </div>}
          {selectedCurrency !== baseCurrency && <ExchangeRateAttribution />}
          {rateError && <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-400">{rateError}</p>}
          <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.description')}</span><input required maxLength={160} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder={t('budget.form.descriptionPlaceholder')} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"/></label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.date')}</span><span className="relative block"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500"/><input required type="date" value={form.transactionDate} onChange={event => setForm(current => ({ ...current, transactionDate: event.target.value }))} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-indigo-500"/></span></label><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.time')}</span><input type="time" value={form.transaction_time ?? ''} onChange={event => setForm(current => ({ ...current, transaction_time: event.target.value }))} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"/></label></div>
          <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.category')}</span><select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value as TransactionCategory }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"><optgroup label={t(`budget.categoryGroups.${form.type}`)}>{categoriesForType(form.type).map(category => <option key={category} value={category}>{t(`budget.categories.${category}`)}</option>)}</optgroup></select></label>
          <button disabled={saving || loadingRate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle size={17} className="animate-spin"/> : <Plus size={17}/>} {saving ? t('budget.form.saving') : t('budget.form.save')}</button>
        </form>
      </aside>
    </div>
    {viewing && <TransactionDetailModal
      transaction={viewing}
      locale={locale}
      onClose={() => setViewing(null)}
      onEdit={() => { setViewing(null); setEditing(viewing); }}
      onDelete={() => { setViewing(null); setDeleteTarget(viewing); }}
    />}
    {editing && <TransactionEditModal key={editing.id} transaction={editing} onClose={() => setEditing(null)} onSave={value => updateTransaction(editing.id, value)}/>}
    <DeleteConfirmDialog open={deleteTarget !== null} deleting={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} title={t('budget.delete.title')} message={t('budget.delete.message', { description: deleteTarget?.description ?? '' })}/>
  </div>;
}
