import { Pencil, Trash2 } from 'lucide-react';

export function ItemActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="flex shrink-0 items-center gap-1">
    <button type="button" aria-label="Edit" onClick={onEdit} className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-800/70 hover:text-blue-400"><Pencil size={15}/></button>
    <button type="button" aria-label="Delete" onClick={onDelete} className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-800/70 hover:text-red-400"><Trash2 size={15}/></button>
  </div>;
}
