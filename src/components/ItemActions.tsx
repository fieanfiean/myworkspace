import { Pencil, Trash2 } from 'lucide-react';

export function ItemActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="flex shrink-0 items-center gap-1">
    <button type="button" aria-label="Edit" onClick={onEdit} className="flex size-11 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-800/70 hover:text-blue-400 sm:size-9"><Pencil size={15}/></button>
    <button type="button" aria-label="Delete" onClick={onDelete} className="flex size-11 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-800/70 hover:text-red-400 sm:size-9"><Trash2 size={15}/></button>
  </div>;
}
