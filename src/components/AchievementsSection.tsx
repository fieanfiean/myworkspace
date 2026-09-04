import { useState } from 'react';
import { Award, BadgeCheck, Download, FileText, FolderGit2, FolderKanban, GraduationCap, Trophy, type LucideIcon } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { Achievement, AchievementCategory } from '@/types/profile';
import { ItemActions } from './ItemActions';
import { SectionAddButton } from './SectionAddButton';
import { AchievementDetailModal } from './AchievementDetailModal';
import { fileNameFromUrl, isPdfUrl } from '@/lib/achievementFiles';

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

function TypePlaceholder({ category }: Pick<Achievement, 'category'>) {
  const Icon = category === 'project' ? FolderGit2 : category === 'award' ? Trophy : GraduationCap;
  const color = category === 'project' ? 'text-blue-400 bg-blue-500/10' : category === 'award' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10';
  return <div className="flex h-36 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900"><span className={`flex size-16 items-center justify-center rounded-2xl ${color}`}><Icon size={34}/></span></div>;
}

function AchievementMedia({ item }: { item: Achievement }) {
  const { t } = useT();
  const [imageFailed, setImageFailed] = useState(false);

  if (!item.imageUrl || imageFailed) {
    return <TypePlaceholder category={item.category}/>;
  }

  if (isPdfUrl(item.imageUrl)) {
    const fileName = fileNameFromUrl(item.imageUrl, item.title);
    return <div className="flex h-36 items-center gap-3 bg-slate-800/80 p-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400"><FileText size={28}/></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200" title={fileName}>{fileName}</p><p className="mt-1 text-xs uppercase tracking-wider text-red-400">PDF</p></div>
      <a href={item.imageUrl} download={fileName} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/10" aria-label={`${t('achievements.downloadPdf')}: ${fileName}`}><Download size={15}/><span className="hidden xl:inline">{t('achievements.downloadPdf')}</span></a>
    </div>;
  }

  return <img src={item.imageUrl} alt={item.title} onError={() => setImageFailed(true)} className="h-36 w-full object-cover"/>;
}

function AchievementCard({ item, onEdit, onDelete }: { item: Achievement; onEdit: () => void; onDelete: () => void }) {
  const { t } = useT();
  const [showDetails, setShowDetails] = useState(false);
  return <>
  <article role="button" tabIndex={0} onClick={() => setShowDetails(true)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setShowDetails(true); } }} className="achievement-card cursor-pointer transition-all hover:border-blue-500/50">
    <AchievementMedia key={item.imageUrl} item={item}/>
    <div className="p-4">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <span className="min-w-0 truncate rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">{item.tag || '—'}</span>
        <span className="min-w-0 truncate text-right text-xs font-semibold text-slate-300" title={item.rank}>{item.rank}</span>
      </div>
      <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><h4 className="truncate font-bold text-slate-100" title={item.title}>{item.title}</h4><p className="mt-1 text-xs text-slate-500">{item.year}</p>{item.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{item.description}</p>}<button type="button" onClick={event => { event.stopPropagation(); setShowDetails(true); }} className="mt-3 text-xs font-medium text-blue-400 transition hover:translate-x-0.5 hover:text-blue-300">{t('achievements.viewDetails')} →</button></div><div onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}><ItemActions onEdit={onEdit} onDelete={onDelete}/></div></div>
    </div>
  </article>
  {showDetails && <AchievementDetailModal item={item} onClose={() => setShowDetails(false)} onEdit={onEdit}/>}
  </>;
}

export function AchievementsSection({ items, onAdd, onEdit, onDelete }: AchievementsSectionProps) {
  const { t } = useT();
  return <section className="mb-12 mt-14">
    <span className="text-xs font-bold uppercase tracking-wider text-blue-500">{t('sections.recognition')}</span>
    <div className="mb-8 mt-1 flex items-center gap-3"><Trophy className="text-blue-500"/><h3 className="text-2xl font-bold">Portfolio &amp; Recognition</h3><SectionAddButton onClick={onAdd}/></div>
    <div className="space-y-10">
      {sections.map(section => {
        const categoryItems = items.filter(item => item.category === section.category || (section.category === 'certification' && item.category === 'certificate'));
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
