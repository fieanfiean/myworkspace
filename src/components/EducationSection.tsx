import { GraduationCap } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { EducationItem } from '@/types/profile';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';

export function EducationSection({ items, onAdd, onEdit, onDelete }: { items: EducationItem[]; onAdd: () => void; onEdit: (item: EducationItem) => void; onDelete: (id: string) => void }) {
  const { t } = useT();
  return <section className="mt-14"><span className="text-xs font-bold uppercase tracking-wider text-blue-500">{t('sections.academic')}</span><div className="mb-8 mt-1 flex items-center gap-3"><GraduationCap className="text-blue-500"/><h3 className="text-2xl font-bold">{t('sections.education')}</h3><SectionAddButton onClick={onAdd}/></div><div className="space-y-8 pl-12">{items.map(item => <div key={item.id} className="edu-card"><div className="flex justify-between gap-3"><div><h4 className="text-xl font-bold">{item.degree}</h4><p className="mt-1 text-emerald-400">{item.school} <span className="text-slate-500">· {item.location}</span></p></div><div className="flex items-start gap-2"><div className="text-right text-xs text-slate-400">{item.dateRange}<div className="mt-1 text-sm font-bold text-emerald-400">{item.gpa}</div></div><ItemActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)}/></div></div><p className="mt-3 text-sm text-slate-300">{item.description}</p><div className="mt-4 flex flex-wrap gap-2">{item.badges.map(badge => <span key={badge} className="tag-green">{badge}</span>)}</div></div>)}</div></section>;
}
