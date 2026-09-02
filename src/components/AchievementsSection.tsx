import { Award, BadgeCheck, FolderKanban, Trophy, type LucideIcon } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { Achievement, AchievementCategory } from '@/types/profile';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';

interface CategorySection {
  category: AchievementCategory;
  title: string;
  emptyText: string;
  icon: LucideIcon;
}

const sections: CategorySection[] = [
  { category: 'project', title: 'Projects', emptyText: 'No projects added yet.', icon: FolderKanban },
  { category: 'award', title: 'Awards & Honors', emptyText: 'No awards or honors added yet.', icon: Award },
  { category: 'certification', title: 'Certifications & Workshops', emptyText: 'No certifications or workshops added yet.', icon: BadgeCheck },
];

interface AchievementsSectionProps {
  items: Achievement[];
  onAdd: () => void;
  onEdit: (item: Achievement) => void;
  onDelete: (id: string) => void;
}

function AchievementCard({ item, onEdit, onDelete }: { item: Achievement; onEdit: () => void; onDelete: () => void }) {
  return <article className="achievement-card">
    <div className="relative h-36 overflow-hidden">
      {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center bg-slate-800 text-slate-600"><Trophy size={32}/></div>}
      {item.tag && <span className="absolute left-3 top-3 rounded bg-blue-900/80 px-2 py-1 text-xs">{item.tag}</span>}
      {item.rank && <span className="absolute right-3 top-3 rounded bg-slate-900 px-2 py-1 text-xs font-bold">{item.rank}</span>}
    </div>
    <div className="flex items-start justify-between gap-2 p-4"><div><h4 className="font-bold">{item.title}</h4><p className="mt-1 text-xs text-slate-500">{item.year}</p></div><ItemActions onEdit={onEdit} onDelete={onDelete}/></div>
  </article>;
}

export function AchievementsSection({ items, onAdd, onEdit, onDelete }: AchievementsSectionProps) {
  const { t } = useT();
  return <section className="mb-12 mt-14">
    <span className="text-xs font-bold uppercase tracking-wider text-blue-500">{t('sections.recognition')}</span>
    <div className="mb-8 mt-1 flex items-center gap-3"><Trophy className="text-blue-500"/><h3 className="text-2xl font-bold">Portfolio &amp; Recognition</h3><SectionAddButton onClick={onAdd}/></div>
    <div className="space-y-10">
      {sections.map(section => {
        const categoryItems = items.filter(item => item.category === section.category);
        const Icon = section.icon;
        return <section key={section.category}>
          <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3"><Icon size={19} className="text-blue-400"/><h4 className="text-lg font-semibold text-slate-100">{section.title}</h4><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{categoryItems.length}</span></div>
          {categoryItems.length > 0
            ? <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{categoryItems.map(item => <AchievementCard key={item.id} item={item} onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)}/>)}</div>
            : <div className="rounded-xl border border-dashed border-slate-800 px-5 py-6 text-center text-sm text-slate-500">{section.emptyText}</div>}
        </section>;
      })}
    </div>
  </section>;
}
