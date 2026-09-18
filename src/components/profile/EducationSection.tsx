import { GraduationCap } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { EducationItem } from '@/types/profile';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';

export function EducationSection({ items, onAdd, onEdit, onDelete }: { items: EducationItem[]; onAdd: () => void; onEdit: (item: EducationItem) => void; onDelete: (id: string) => void }) {
  const { t } = useT();
  return <section>
    <span className="text-xs font-bold uppercase tracking-wider text-blue-500">{t('sections.academic')}</span>
    <div className="mb-6 mt-1 flex items-center gap-3 sm:mb-8"><GraduationCap className="shrink-0 text-blue-500"/><h3 className="text-xl font-bold sm:text-2xl">{t('sections.education')}</h3><SectionAddButton onClick={onAdd}/></div>
    <div className="relative space-y-6 pl-7 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-gradient-to-b before:from-emerald-500 before:via-emerald-400/40 before:to-transparent">{items.map((item, index) => <div key={item.id} className="relative rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/35">
      <span className="absolute -left-7 top-5 flex size-3.5 items-center justify-center"><span className={`absolute size-3.5 rounded-full bg-indigo-400/70 ${index === 0 ? 'animate-ping' : ''}`}/><span className="relative size-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900 dark:shadow-[0_0_12px_rgba(99,102,241,0.5)]"/></span>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="min-w-0"><h4 className="break-words text-lg font-bold sm:text-xl">{item.degree}</h4><p className="mt-1 break-words text-emerald-400">{item.school} <span className="text-slate-500">· {item.location}</span></p></div>
        <div className="flex min-h-11 items-center justify-between gap-2 sm:min-h-0 sm:items-start sm:justify-start"><div className="text-left text-xs text-slate-400 sm:text-right">{item.dateRange}<div className="mt-1 text-sm font-bold text-emerald-400">{item.gpa}</div></div><ItemActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)}/></div>
      </div>
      <p className="mt-3 break-words text-sm text-slate-600 dark:text-slate-300">{item.description}</p><div className="mt-4 flex flex-wrap gap-2">{item.badges.map(badge => <span key={badge} className="tag-green">{badge}</span>)}</div>
    </div>)}</div>
  </section>;
}
