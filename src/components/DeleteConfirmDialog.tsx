import { Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmDialogProps {
  open: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export function DeleteConfirmDialog({ open, deleting, onCancel, onConfirm, title = 'Delete this item?', message = 'This action cannot be undone.' }: DeleteConfirmDialogProps) {
  const { t } = useTranslation();
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><Trash2 size={18} className="shrink-0 text-red-400"/><h2 id="delete-title" className="font-semibold">{title}</h2></div><button type="button" aria-label="Close" onClick={onCancel} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300"><X size={17}/></button></div>
      <p className="mt-3 break-words text-sm text-slate-400">{message}</p>
      <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={deleting} onClick={onCancel} className="min-h-11 rounded-lg px-3 text-sm text-slate-400 hover:bg-slate-800">{t('common.cancel')}</button><button type="button" disabled={deleting} onClick={onConfirm} className="min-h-11 rounded-lg bg-red-500/10 px-3 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50">{deleting ? t('common.deleting') : t('common.delete')}</button></div>
    </div>
  </div>;
}
