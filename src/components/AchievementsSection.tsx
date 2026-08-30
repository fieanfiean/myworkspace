import { Trophy } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { Achievement } from '@/types/profile';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';

export function AchievementsSection({ items, onAdd, onEdit, onDelete }: { items: Achievement[]; onAdd: () => void; onEdit: (item: Achievement) => void; onDelete: (id: string) => void }) {
  const { t } = useT();
  return <section className="mb-12 mt-14"><span className="text-xs font-bold uppercase tracking-wider text-blue-500">{t('sections.recognition')}</span><div className="mb-8 mt-1 flex items-center gap-3"><Trophy className="text-blue-500"/><h3 className="text-2xl font-bold">{t('sections.achievements')}</h3><SectionAddButton onClick={onAdd}/></div><div className="grid grid-cols-1 gap-6 md:grid-cols-3">{items.map(item => <div key={item.id} className="achievement-card"><div className="relative h-36 overflow-hidden">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover"/> : <div className="h-full bg-slate-800"/>}<span className="absolute left-3 top-3 rounded bg-blue-900/80 px-2 py-1 text-xs">{item.tag}</span><span className="absolute right-3 top-3 rounded bg-slate-900 px-2 py-1 text-xs font-bold">{item.rank}</span></div><div className="flex items-start justify-between gap-2 p-4"><div><h4 className="font-bold">{item.title}</h4><p className="mt-1 text-xs text-slate-500">{item.year}</p></div><ItemActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)}/></div></div>)}</div></section>;
}
