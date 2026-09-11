import { GraduationCap } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { EducationItem } from '@/types/profile';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';

export function EducationSection({ items, onAdd, onEdit, onDelete }: { items: EducationItem[]; onAdd: () => void; onEdit: (item: EducationItem) => void; onDelete: (id: string) => void }) {
  const { t } = useT();
  return <section className="mt-14">
    <span className="text-xs font-bold uppercase tracking-wider text-blue-500">{t('sections.academic')}</span>
    <div className="mb-6 mt-1 flex items-center gap-3 sm:mb-8"><GraduationCap className="shrink-0 text-blue-500"/><h3 className="text-xl font-bold sm:text-2xl">{t('sections.education')}</h3><SectionAddButton onClick={onAdd}/></div>
    <div className="space-y-6 pl-0 sm:space-y-8 sm:pl-12">{items.map(item => <div key={item.id} className="edu-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="min-w-0"><h4 className="break-words text-lg font-bold sm:text-xl">{item.degree}</h4><p className="mt-1 break-words text-emerald-400">{item.school} <span className="text-slate-500">· {item.location}</span></p></div>
        <div className="flex min-h-11 items-center justify-between gap-2 sm:min-h-0 sm:items-start sm:justify-start"><div className="text-left text-xs text-slate-400 sm:text-right">{item.dateRange}<div className="mt-1 text-sm font-bold text-emerald-400">{item.gpa}</div></div><ItemActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)}/></div>
      </div>
      <p className="mt-3 break-words text-sm text-slate-300">{item.description}</p><div className="mt-4 flex flex-wrap gap-2">{item.badges.map(badge => <span key={badge} className="tag-green">{badge}</span>)}</div>
    </div>)}</div>
  </section>;
}
