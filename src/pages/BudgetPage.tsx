import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, CalendarDays, Camera, Car, CircleDollarSign, Clapperboard, HeartPulse, LoaderCircle, Pencil, Plus, ReceiptText, Search, ShoppingCart, Trash2, Utensils, WalletCards, X, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import imageCompression from 'browser-image-compression';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useBudgetTransactions } from '@/hooks/useBudgetTransactions';
import { getMyrPerCurrency } from '@/lib/exchangeRates';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { TransactionEditModal } from '@/components/Budget/TransactionEditModal';
import { ExchangeRateAttribution } from '@/components/Budget/ExchangeRateAttribution';
import { filterBudgetTransactions, type CategoryFilter, type DateRangePreset, type TransactionTypeFilter } from '@/lib/budgetFilters';
import { checkDuplicateTransaction, type DuplicateCheckResult, type ParsedOCRResult } from '@/lib/deduplication';
import { supabase } from '@/lib/supabase';
import type { BudgetTransaction, CurrencyCode, NewBudgetTransaction, TransactionCategory, TransactionType } from '@/types/budget';

const baseCurrency: CurrencyCode = 'MYR';
const currencies: CurrencyCode[] = ['MYR', 'USD', 'SGD', 'JPY', 'EUR', 'GBP', 'CNY', 'THB', 'TWD'];
const categories: TransactionCategory[] = ['salary', 'groceries', 'food', 'transport', 'utilities', 'entertainment', 'freelance', 'healthcare', 'other'];
const categoryStyle: Record<TransactionCategory, { icon: typeof CircleDollarSign; classes: string }> = {
  salary: { icon: CircleDollarSign, classes: 'bg-emerald-500/15 text-emerald-400' },
  groceries: { icon: ShoppingCart, classes: 'bg-orange-500/15 text-orange-400' },
  food: { icon: Utensils, classes: 'bg-amber-500/15 text-amber-400' },
  transport: { icon: Car, classes: 'bg-violet-500/15 text-violet-400' },
  utilities: { icon: Zap, classes: 'bg-sky-500/15 text-sky-400' },
  entertainment: { icon: Clapperboard, classes: 'bg-pink-500/15 text-pink-400' },
  freelance: { icon: Banknote, classes: 'bg-cyan-500/15 text-cyan-400' },
  healthcare: { icon: HeartPulse, classes: 'bg-rose-500/15 text-rose-400' },
  other: { icon: ReceiptText, classes: 'bg-slate-500/15 text-slate-300' },
};
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const percentChange = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;
type ChartGranularity = 'daily' | 'weekly' | 'monthly';

interface ReceiptOCRResult extends ParsedOCRResult {
  currency: 'MYR';
  time: string;
  type: TransactionType;
  suggested_category: 'Groceries' | 'Food' | 'Transport' | 'Utilities' | 'Entertainment' | 'Healthcare' | 'Other';
}

interface ReceiptFunctionError {
  error: string;
}

type ReceiptFunctionResponse = ReceiptOCRResult | ReceiptFunctionError;

async function receiptInvokeErrorMessage(error: unknown, fallback: string, rateLimit: string, serviceUnavailable: string): Promise<string> {
  if (typeof error !== 'object' || error === null) return fallback;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return fallback;
  if (context.status === 429) return rateLimit;
  if (context.status === 503) return serviceUnavailable;
  try {
    const body = await context.clone().json() as unknown;
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') return body.error;
  } catch {
    // The fallback remains actionable when the response body is not JSON.
  }
  return fallback;
}

export function BudgetPage({ toolsOpen, onCloseTools }: { toolsOpen: boolean; onCloseTools: () => void }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { transactions, loading, error, addTransaction, updateTransaction, deleteTransaction } = useBudgetTransactions(user?.id);
  const [form, setForm] = useState<NewBudgetTransaction>({ type: 'expense', amount: 0, description: '', transactionDate: today(), transaction_time: '', category: 'groceries', originalCurrency: baseCurrency, exchangeRate: 1 });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateCheckResult | null>(null);
  const [editing, setEditing] = useState<BudgetTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [granularity, setGranularity] = useState<ChartGranularity>('monthly');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const chartDrag = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const currency = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: baseCurrency, currencyDisplay: 'narrowSymbol' }), [locale]);
  const originalNumber = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);
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
      if (!file.type.startsWith('image/')) throw new Error('Receipt upload must be an image.');
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      const body = new FormData();
      body.append('image', compressedFile, compressedFile.name);
      const { data, error: invokeError } = await supabase.functions.invoke<ReceiptFunctionResponse>('parse-receipt', { body });
      if (invokeError) {
        setFormError(await receiptInvokeErrorMessage(invokeError, t('budget.form.scanError'), t('budget.form.scanRateLimit'), t('budget.form.scanServiceUnavailable')));
        return;
      }
      if (!data) throw new Error(t('budget.form.scanError'));
      if ('error' in data) {
        setFormError(data.error);
        return;
      }
      const suggestedCategory = data.suggested_category.toLocaleLowerCase() as TransactionCategory;
      const category = categories.includes(suggestedCategory) ? suggestedCategory : 'other';
      const parsed: ParsedOCRResult = { amount: data.amount, date: data.date, time: data.time, description: data.description };
      setForm({
        type: data.type,
        amount: data.amount,
        description: data.description,
        transactionDate: data.date,
        transaction_time: data.time,
        category,
        originalCurrency: baseCurrency,
        originalAmount: data.amount,
        exchangeRate: 1,
      });
      const duplicate = checkDuplicateTransaction(parsed, transactions);
      setDuplicateMatch(duplicate.isDuplicate ? duplicate : null);
      setRateError(null);
    } catch (cause) {
      console.error('Receipt scan failed.', cause);
      setFormError(t('budget.form.scanError'));
    } finally {
      setScanningReceipt(false);
      input.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
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
            <label><span className="sr-only">{t('budget.filters.category')}</span><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as CategoryFilter)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-indigo-500"><option value="all">{t('budget.filters.allCategories')}</option>{categories.map(category => <option key={category} value={category}>{t(`budget.categories.${category}`)}</option>)}</select></label>
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

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10"><div className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><h2 className="font-semibold text-white">{t('budget.recent.title')}</h2><span className="text-xs text-slate-500">{t('budget.recent.count', { count: filteredTransactions.length })}</span></div><div data-horizontal-scroll className="overflow-x-auto"><table className="w-full min-w-[740px] text-left">
          <thead className="bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-500"><tr>{(['date','description','category','amount'] as const).map(key => <th key={key} className={`px-5 py-3 font-medium ${key === 'amount' ? 'text-right' : ''}`}>{t(`budget.recent.${key}`)}</th>)}<th className="px-3 py-3 text-right font-medium">{t('budget.recent.actions')}</th></tr></thead>
          <tbody className="divide-y divide-slate-800/80">{loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500"><LoaderCircle className="mx-auto mb-2 animate-spin" size={20}/>{t('budget.loading')}</td></tr> : filteredTransactions.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">{t('budget.recent.noMatches')}</td></tr> : filteredTransactions.slice(0, 50).map(item => {
            const style = categoryStyle[item.category], Icon = style.icon;
            const showOriginal = item.originalCurrency && item.originalCurrency !== baseCurrency && item.originalAmount !== undefined;
            return <tr key={item.id} className="transition hover:bg-slate-800/35"><td className="whitespace-nowrap px-5 py-4 text-sm text-slate-400">{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${item.transactionDate}T00:00:00Z`))}</td><td className="px-5 py-4 text-sm font-medium text-slate-200">{item.description}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${style.classes}`}><Icon size={14}/>{t(`budget.categories.${item.category}`)}</span></td><td className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold ${item.type === 'income' ? 'text-emerald-400' : 'text-rose-300'}`}><span className="block">{item.type === 'income' ? '+' : '-'}{currency.format(item.amount)}</span>{showOriginal && <span className="mt-1 block text-xs font-normal text-slate-500">({originalNumber.format(item.originalAmount!)} {item.originalCurrency})</span>}</td><td className="px-3 py-2"><div className="flex justify-end gap-1"><button type="button" onClick={() => setEditing(item)} aria-label={t('budget.edit.action')} className="flex size-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-500/10 hover:text-indigo-400"><Pencil size={16}/></button><button type="button" onClick={() => setDeleteTarget(item)} aria-label={t('budget.delete.action')} className="flex size-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={16}/></button></div></td></tr>;
          })}</tbody>
        </table></div></section>
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
          {duplicateMatch?.matchedTransaction && <div role="alert" className="rounded-xl border border-amber-500/70 bg-amber-500/15 p-4 text-amber-100 shadow-lg shadow-amber-950/20"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={21}/><div><p className="font-bold">{t('budget.form.duplicateWarningTitle')}</p><p className="mt-1 text-sm text-amber-200">{t('budget.form.duplicateWarningDesc', { date: duplicateMatch.matchedTransaction.date ?? duplicateMatch.matchedTransaction.transactionDate ?? '', amount: currency.format(duplicateMatch.matchedTransaction.amount), merchant: duplicateMatch.matchedTransaction.description })}</p></div></div></div>}
          <fieldset><legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.type')}</legend><div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1">{(['income', 'expense'] as TransactionType[]).map(type => <button key={type} type="button" onClick={() => setForm(current => ({ ...current, type }))} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${form.type === type ? type === 'income' ? 'bg-emerald-700 text-white shadow' : 'bg-rose-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>{t(`budget.${type}`)}</button>)}</div></fieldset>
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
          <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.category')}</span><select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value as TransactionCategory }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500">{categories.map(category => <option key={category} value={category}>{t(`budget.categories.${category}`)}</option>)}</select></label>
          <button disabled={saving || loadingRate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle size={17} className="animate-spin"/> : <Plus size={17}/>} {saving ? t('budget.form.saving') : t('budget.form.save')}</button>
        </form>
      </aside>
    </div>
    {editing && <TransactionEditModal key={editing.id} transaction={editing} onClose={() => setEditing(null)} onSave={value => updateTransaction(editing.id, value)}/>}
    <DeleteConfirmDialog open={deleteTarget !== null} deleting={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} title={t('budget.delete.title')} message={t('budget.delete.message', { description: deleteTarget?.description ?? '' })}/>
  </div>;
}
