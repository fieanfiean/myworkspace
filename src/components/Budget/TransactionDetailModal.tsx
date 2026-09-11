import { CalendarDays, Clock3, Pencil, ReceiptText, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BudgetTransaction } from '@/types/budget';

interface TransactionDetailModalProps {
  transaction: BudgetTransaction;
  locale: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionDetailModal({ transaction, locale, onClose, onEdit, onDelete }: TransactionDetailModalProps) {
  const { t } = useTranslation();
  const myr = new Intl.NumberFormat(locale, { style: 'currency', currency: 'MYR', currencyDisplay: 'narrowSymbol' });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${transaction.transactionDate}T00:00:00Z`));
  const showOriginal = transaction.originalCurrency && transaction.originalCurrency !== 'MYR' && transaction.originalAmount !== undefined;

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title" className="mx-auto my-6 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-800 p-5"><div className="min-w-0"><p className={`text-xs font-bold uppercase tracking-widest ${transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{t(`budget.${transaction.type}`)}</p><h2 id="transaction-detail-title" className="mt-1 truncate text-xl font-bold text-white">{transaction.description}</h2></div><button type="button" onClick={onClose} aria-label={t('common.close')} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800"><X size={20}/></button></header>
      <div className="space-y-5 p-5"><div className={`rounded-2xl border p-5 ${transaction.type === 'income' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-rose-500/20 bg-rose-500/10'}`}><p className="text-xs uppercase tracking-wider text-slate-400">{t('budget.detail.convertedAmount')}</p><p className={`mt-2 text-3xl font-bold ${transaction.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>{transaction.type === 'income' ? '+' : '-'}{myr.format(transaction.amount)}</p></div>
        <dl className="grid grid-cols-2 gap-4 text-sm"><div className="rounded-xl bg-slate-950/60 p-3"><dt className="flex items-center gap-2 text-slate-500"><CalendarDays size={15}/>{t('budget.form.date')}</dt><dd className="mt-1 font-medium text-slate-200">{date}</dd></div><div className="rounded-xl bg-slate-950/60 p-3"><dt className="flex items-center gap-2 text-slate-500"><Clock3 size={15}/>{t('budget.form.time')}</dt><dd className="mt-1 font-medium text-slate-200">{transaction.transaction_time || t('budget.detail.notRecorded')}</dd></div><div className="rounded-xl bg-slate-950/60 p-3"><dt className="text-slate-500">{t('budget.form.category')}</dt><dd className="mt-1 font-medium text-slate-200">{t(`budget.categories.${transaction.category}`)}</dd></div><div className="rounded-xl bg-slate-950/60 p-3"><dt className="text-slate-500">{t('budget.form.type')}</dt><dd className="mt-1 font-medium capitalize text-slate-200">{t(`budget.${transaction.type}`)}</dd></div>{showOriginal && <><div className="rounded-xl bg-slate-950/60 p-3"><dt className="text-slate-500">{t('budget.detail.originalAmount')}</dt><dd className="mt-1 font-medium text-slate-200">{transaction.originalAmount} {transaction.originalCurrency}</dd></div><div className="rounded-xl bg-slate-950/60 p-3"><dt className="text-slate-500">{t('budget.form.exchangeRate')}</dt><dd className="mt-1 font-medium text-slate-200">1 {transaction.originalCurrency} = {transaction.exchangeRate} MYR</dd></div></>}</dl>
        {transaction.receiptUrl && <div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"><ReceiptText size={16}/>{t('budget.detail.receipt')}</p><img src={transaction.receiptUrl} alt={t('budget.detail.receipt')} className="max-h-72 w-full rounded-2xl bg-slate-950 object-contain"/></div>}
      </div>
      <footer className="grid grid-cols-2 gap-3 border-t border-slate-800 p-5"><button type="button" onClick={onEdit} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500"><Pencil size={17}/>{t('budget.edit.action')}</button><button type="button" onClick={onDelete} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 font-semibold text-rose-300 hover:bg-rose-500/20"><Trash2 size={17}/>{t('budget.delete.action')}</button></footer>
    </section>
  </div>;
}
