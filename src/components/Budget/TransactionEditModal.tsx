import { useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getMyrPerCurrency } from '@/lib/exchangeRates';
import { ExchangeRateAttribution } from './ExchangeRateAttribution';
import { categoriesForType, type BudgetTransaction, type CurrencyCode, type NewBudgetTransaction, type TransactionCategory, type TransactionType } from '@/types/budget';

const baseCurrency: CurrencyCode = 'MYR';
const currencies: CurrencyCode[] = ['MYR', 'USD', 'SGD', 'JPY', 'EUR', 'GBP', 'CNY', 'THB', 'TWD'];
const control = 'min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500';

interface TransactionEditModalProps {
  transaction: BudgetTransaction;
  onClose: () => void;
  onSave: (transaction: NewBudgetTransaction) => Promise<void>;
}

export function TransactionEditModal({ transaction, onClose, onSave }: TransactionEditModalProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [originalCurrency, setOriginalCurrency] = useState<CurrencyCode>(transaction.originalCurrency ?? baseCurrency);
  const [originalAmount, setOriginalAmount] = useState(transaction.originalAmount ?? transaction.amount);
  const [exchangeRate, setExchangeRate] = useState(transaction.exchangeRate ?? 1);
  const [description, setDescription] = useState(transaction.description);
  const [transactionDate, setTransactionDate] = useState(transaction.transactionDate);
  const [transactionTime, setTransactionTime] = useState(transaction.transaction_time ?? '');
  const [category, setCategory] = useState<TransactionCategory>(transaction.category);
  const [loadingRate, setLoadingRate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rateRequest = useRef(0);
  const convertedAmount = Math.round(originalAmount * exchangeRate * 100) / 100;

  const changeType = (nextType: TransactionType) => {
    setType(nextType);
    setCategory(categoriesForType(nextType)[0]);
  };

  const changeCurrency = async (currency: CurrencyCode) => {
    const requestId = ++rateRequest.current;
    setOriginalCurrency(currency);
    setError(null);
    if (currency === baseCurrency) { setExchangeRate(1); return; }
    setExchangeRate(0);
    setLoadingRate(true);
    try {
      const latestRate = await getMyrPerCurrency(currency);
      if (requestId === rateRequest.current) setExchangeRate(latestRate);
    } catch {
      if (requestId === rateRequest.current) setError(t('budget.exchange.manualFallback'));
    } finally { if (requestId === rateRequest.current) setLoadingRate(false); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!description.trim() || !Number.isFinite(originalAmount) || originalAmount <= 0 || !Number.isFinite(exchangeRate) || exchangeRate <= 0) { setError(t('budget.form.validation')); return; }
    setSaving(true); setError(null);
    try {
      await onSave({ type, amount: convertedAmount, description, transactionDate, transaction_time: transactionTime, category, originalCurrency, originalAmount, exchangeRate });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('budget.form.saveError'));
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && !saving && onClose()}>
    <div role="dialog" aria-modal="true" aria-labelledby="edit-transaction-title" className="mx-auto my-2 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:my-8">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-6"><h2 id="edit-transaction-title" className="font-semibold text-white">{t('budget.edit.title')}</h2><button type="button" onClick={onClose} disabled={saving} aria-label={t('common.close')} className="flex size-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"><X size={20}/></button></header>
      <form onSubmit={event => void submit(event)} className="max-h-[calc(100dvh-6rem)] space-y-4 overflow-y-auto p-4 pb-24 sm:max-h-[80dvh] sm:p-6 sm:pb-6">
        <fieldset><legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.type')}</legend><div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1">{(['income', 'expense'] as TransactionType[]).map(value => <button key={value} type="button" onClick={() => changeType(value)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${type === value ? value === 'income' ? 'bg-emerald-700 text-white' : 'bg-rose-800 text-white' : 'text-slate-500'}`}>{t(`budget.${value}`)}</button>)}</div></fieldset>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.currency')}</span><select className={control} value={originalCurrency} onChange={event => void changeCurrency(event.target.value as CurrencyCode)}>{currencies.map(currency => <option key={currency}>{currency}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.amount')} ({originalCurrency})</span><input className={control} required type="number" min="0.01" step="0.01" value={originalAmount || ''} onChange={event => setOriginalAmount(event.target.valueAsNumber)}/></label></div>
        {originalCurrency !== baseCurrency && <div className="grid grid-cols-1 gap-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 md:grid-cols-2"><label><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.exchangeRate')}</span><div className="relative"><input className={control} required type="number" min="0.000001" step="0.000001" value={exchangeRate || ''} onChange={event => setExchangeRate(event.target.valueAsNumber)}/>{loadingRate && <LoaderCircle size={17} className="absolute right-3 top-3 animate-spin text-indigo-400"/>}</div><span className="mt-1.5 block text-xs text-slate-500">1 {originalCurrency} = {exchangeRate || 0} MYR</span></label><div><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.convertedAmount')}</span><output className="flex min-h-11 items-center rounded-xl border border-slate-700 bg-slate-950/60 px-3 font-semibold text-indigo-400">RM {convertedAmount.toFixed(2)}</output></div></div>}
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.description')}</span><input className={control} required maxLength={160} value={description} onChange={event => setDescription(event.target.value)}/></label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.date')}</span><input className={control} required type="date" value={transactionDate} onChange={event => setTransactionDate(event.target.value)}/></label><label><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.time')}</span><input className={control} type="time" value={transactionTime} onChange={event => setTransactionTime(event.target.value)}/></label></div>
        <label><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('budget.form.category')}</span><select className={control} value={category} onChange={event => setCategory(event.target.value as TransactionCategory)}><optgroup label={t(`budget.categoryGroups.${type}`)}>{categoriesForType(type).map(value => <option key={value} value={value}>{t(`budget.categories.${value}`)}</option>)}</optgroup></select></label>
        {originalCurrency !== baseCurrency && <ExchangeRateAttribution />}
        {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">{error}</p>}
        <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-slate-800 bg-slate-900 pt-4"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-slate-700 text-sm text-slate-300">{t('common.cancel')}</button><button disabled={saving || loadingRate} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-60">{saving && <LoaderCircle size={17} className="animate-spin"/>}{saving ? t('budget.form.saving') : t('budget.edit.save')}</button></footer>
      </form>
    </div>
  </div>;
}
