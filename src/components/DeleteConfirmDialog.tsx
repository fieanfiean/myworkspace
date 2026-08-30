import { Trash2, X } from 'lucide-react';

export function DeleteConfirmDialog({ open, deleting, onCancel, onConfirm }: { open: boolean; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
    <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
      <div className="flex items-start justify-between"><div className="flex items-center gap-3"><Trash2 size={18} className="text-red-400"/><h2 id="delete-title" className="font-semibold">Delete this item?</h2></div><button type="button" aria-label="Close" onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X size={17}/></button></div>
      <p className="mt-3 text-sm text-slate-400">This action cannot be undone.</p>
      <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={deleting} onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800">Cancel</button><button type="button" disabled={deleting} onClick={onConfirm} className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete'}</button></div>
    </div>
  </div>;
}
