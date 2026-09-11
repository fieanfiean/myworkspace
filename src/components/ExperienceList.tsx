import { Briefcase, Calendar } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { Experience } from '@/types/profile';
import { formatDateRange } from '@/lib/profileStats';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';

export function ExperienceList({ items, onAdd, onEdit, onDelete }: { items: Experience[]; onAdd: () => void; onEdit: (item: Experience) => void; onDelete: (id: string) => void }) {
  const { t } = useT();
  return <section className="mt-12">
    <div className="mb-6 flex items-center gap-3 sm:mb-8"><Briefcase className="shrink-0 text-blue-500"/><h3 className="text-xl font-bold sm:text-2xl">{t('sections.experience')}</h3><SectionAddButton onClick={onAdd}/></div>
    <div className="relative space-y-6 pl-0 sm:space-y-12 sm:pl-12">{items.map(item => <div key={item.id} className="relative">
      <div className={`absolute -left-[30px] top-4 hidden h-6 w-6 items-center justify-center rounded-full sm:flex ${item.isCurrent ? 'bg-blue-600' : 'bg-slate-800'}`}><Calendar size={14}/></div>
      <div className={`exp-card ${item.isCurrent ? 'exp-card-active' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="min-w-0"><h4 className="break-words text-lg font-bold sm:text-xl">{item.title}</h4><p className="mt-1 break-words text-blue-400">{item.organization} · <span className="text-slate-400">{item.location}</span></p></div>
          <div className="flex min-h-11 items-center justify-between gap-2 sm:min-h-0 sm:items-start sm:justify-start"><span className="text-sm text-slate-400 sm:pt-1">{formatDateRange(item)}</span><ItemActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)}/></div>
        </div>
        <p className="mt-4 break-words text-sm text-slate-300">{item.details}</p><div className="mt-4 flex flex-wrap gap-2">{item.tags.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}</div>
      </div>
    </div>)}</div>
  </section>;
}
