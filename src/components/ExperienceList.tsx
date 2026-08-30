import { Briefcase, Calendar } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { Experience } from '@/types/profile';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';

export function ExperienceList({ items, onAdd, onEdit, onDelete }: { items: Experience[]; onAdd: () => void; onEdit: (item: Experience) => void; onDelete: (id: string) => void }) {
  const { t } = useT();
  return <section className="mt-12"><div className="mb-8 flex items-center gap-3"><Briefcase className="text-blue-500"/><h3 className="text-2xl font-bold">{t('sections.experience')}</h3><SectionAddButton onClick={onAdd}/></div><div className="relative space-y-12 pl-12">{items.map(item => <div key={item.id} className="relative"><div className={`absolute -left-[30px] top-4 flex h-6 w-6 items-center justify-center rounded-full ${item.isCurrent ? 'bg-blue-600' : 'bg-slate-800'}`}><Calendar size={14}/></div><div className={`exp-card ${item.isCurrent ? 'exp-card-active' : ''}`}><div className="flex justify-between gap-3"><div><h4 className="text-xl font-bold">{item.title}</h4><p className="mt-1 text-blue-400">{item.organization} · <span className="text-slate-400">{item.location}</span></p></div><div className="flex items-start gap-2"><span className="pt-1 text-sm text-slate-400">{item.dateRange}</span><ItemActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)}/></div></div><p className="mt-4 text-sm text-slate-300">{item.details}</p><div className="mt-4 flex flex-wrap gap-2">{item.tags.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}</div></div></div>)}</div></section>;
}
