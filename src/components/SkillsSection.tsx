import { Code2 } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { Skill, SkillCategory } from '@/types/profile';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';

export function SkillsSection({ items, onAdd, onEdit, onDelete }: { items: SkillCategory[]; onAdd: () => void; onEdit: (categoryId: string, item: Skill) => void; onDelete: (id: string) => void }) {
  const { t } = useT();
  return <section className="mt-14"><span className="text-xs font-bold uppercase tracking-wider text-blue-500">{t('sections.expertise')}</span><div className="mb-8 mt-1 flex items-center gap-3"><Code2 className="text-blue-500"/><h3 className="text-2xl font-bold">{t('sections.skills')}</h3><SectionAddButton onClick={onAdd}/></div><div className="grid grid-cols-1 gap-6 md:grid-cols-2">{items.map(category => <div key={category.id} className="skill-box"><span className="text-xs font-bold text-slate-400">{category.title}</span><div className="mt-6 space-y-3">{category.skills.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/40 px-3 py-2"><div className="min-w-0"><div className="truncate text-sm font-medium text-slate-100">{item.name}</div><span className="mt-1 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300">{item.level}</span></div><ItemActions onEdit={() => onEdit(category.id, item)} onDelete={() => onDelete(item.id)}/></div>)}</div></div>)}</div></section>;
}
