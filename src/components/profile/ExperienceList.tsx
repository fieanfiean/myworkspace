import { Briefcase } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { Experience } from '@/types/profile';
import { formatDateRange } from '@/lib/profileStats';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';

export function ExperienceList({ items, onAdd, onEdit, onDelete }: { items: Experience[]; onAdd: () => void; onEdit: (item: Experience) => void; onDelete: (id: string) => void }) {
  const { t } = useT();
  return <section>
    <div className="mb-6 flex items-center gap-3"><Briefcase className="shrink-0 text-blue-500"/><h3 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{t('sections.experience')}</h3><SectionAddButton onClick={onAdd}/></div>
    <div className="relative space-y-6 pl-7 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-gradient-to-b before:from-blue-500 before:via-blue-400/40 before:to-transparent">{items.map(item => <div key={item.id} className="relative">
      <span className="absolute -left-7 top-5 flex size-3.5 items-center justify-center"><span className={`absolute size-3.5 rounded-full ${item.isCurrent ? 'animate-ping bg-indigo-400/70' : 'bg-slate-300/40 dark:bg-slate-600/50'}`}/><span className={`relative size-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${item.isCurrent ? 'bg-indigo-500 dark:shadow-[0_0_12px_rgba(99,102,241,0.5)]' : 'bg-slate-400 dark:bg-slate-600'}`}/></span>
      <div className={`rounded-2xl border bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950/35 ${item.isCurrent ? 'border-blue-300 dark:border-blue-500/40' : 'border-slate-200 dark:border-slate-800'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="min-w-0"><h4 className="break-words text-lg font-bold sm:text-xl">{item.title}</h4><p className="mt-1 break-words text-blue-400">{item.organization} · <span className="text-slate-400">{item.location}</span></p></div>
          <div className="flex min-h-11 items-center justify-between gap-2 sm:min-h-0 sm:items-start sm:justify-start"><span className="text-sm text-slate-400 sm:pt-1">{formatDateRange(item)}</span><ItemActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)}/></div>
        </div>
        <p className="mt-4 break-words text-sm text-slate-600 dark:text-slate-300">{item.details}</p><div className="mt-4 flex flex-wrap gap-2">{item.tags.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}</div>
      </div>
    </div>)}</div>
  </section>;
}
