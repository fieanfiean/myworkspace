import { useCallback, useMemo, useState } from 'react';
import { AchievementsSection } from '@/components/profile/AchievementsSection';
import { AchievementModal } from '@/components/profile/AchievementModal';
import { AddItemModal } from '@/components/profile/AddItemModal';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { EducationSection } from '@/components/profile/EducationSection';
import { ExperienceList } from '@/components/profile/ExperienceList';
import { ExportPanel } from '@/components/profile/ExportPanel';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SkillsSection } from '@/components/profile/SkillsSection';
import { SkillModal } from '@/components/profile/SkillModal';
import { useProfileData, type ProfileItemSection } from '@/hooks/useProfileData';
import type { Achievement, EducationItem, Experience, Skill } from '@/types/profile';
import { initialAboutMeData } from './mockData';
import { useAuth } from '@/hooks/useAuth';
import { sortEducationsByMostRecent, sortExperiencesByMostRecent } from '@/lib/timelineSort';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Editor =
  | { kind: 'experience'; item?: Experience }
  | { kind: 'education'; item?: EducationItem }
  | { kind: 'skill'; item?: Skill; categoryId?: string }
  | { kind: 'achievement'; item?: Achievement };
type DeleteTarget = { section: ProfileItemSection; id: string };

export function AboutMePage({ toolsOpen, onCloseTools, resumeExportToken = 0 }: { toolsOpen: boolean; onCloseTools: () => void; resumeExportToken?: number }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, loading, error, addItemToSection, updateItem, deleteItem } = useProfileData(user?.id ?? 'default', initialAboutMeData);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const closeEditor = useCallback(() => setEditor(null), []);
  const sortedData = useMemo(() => ({
    ...data,
    experiences: sortExperiencesByMostRecent(data.experiences),
    educations: sortEducationsByMostRecent(data.educations),
  }), [data]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteItem(deleteTarget.section, deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // The hook exposes the Firestore error in the page alert.
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading profile…</div>;
  const remove = (section: ProfileItemSection, id: string) => setDeleteTarget({ section, id });

  return <>
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">{error.message}</div>}
    <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-5 xl:flex-row xl:items-start xl:gap-8">
      <main className="grid w-full min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
        <ProfileHeader experiences={sortedData.experiences} achievements={sortedData.achievements}/>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-6">
        <ExperienceList items={sortedData.experiences} onAdd={() => setEditor({ kind: 'experience' })} onEdit={item => setEditor({ kind: 'experience', item })} onDelete={id => remove('experiences', id)}/>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-6">
        <EducationSection items={sortedData.educations} onAdd={() => setEditor({ kind: 'education' })} onEdit={item => setEditor({ kind: 'education', item })} onDelete={id => remove('educations', id)}/>
        </div>
        <div className="min-w-0 lg:col-span-2">
        <SkillsSection items={data.skillCategories} onAdd={() => setEditor({ kind: 'skill' })} onEdit={(categoryId, item) => setEditor({ kind: 'skill', categoryId, item })} onDelete={id => remove('skillCategories', id)}/>
        </div>
        <div className="min-w-0 lg:col-span-2">
        <AchievementsSection items={data.achievements} onAdd={() => setEditor({ kind: 'achievement' })} onEdit={item => setEditor({ kind: 'achievement', item })} onDelete={id => remove('achievements', id)}/>
        </div>
      </main>
      <button type="button" aria-label={t('sidebar.closeTools')} onClick={onCloseTools} className={`fixed inset-0 z-[55] bg-slate-950/60 backdrop-blur-sm transition-opacity md:hidden ${toolsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}/>
      <div data-swipe-drawer="right" className={`fixed inset-y-0 right-0 z-[60] w-[min(22rem,calc(100vw-2rem))] touch-pan-y overflow-y-auto overscroll-x-contain bg-slate-50 p-4 shadow-2xl transition-transform duration-300 md:static md:z-auto md:w-full md:translate-x-0 md:overflow-visible md:bg-transparent md:p-0 md:shadow-none xl:w-auto dark:bg-[#0B0F17] md:dark:bg-transparent ${toolsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-3 flex items-center justify-between md:hidden"><span className="font-semibold">{t('exportPanel.title')}</span><button type="button" onClick={onCloseTools} aria-label={t('sidebar.closeTools')} className="flex size-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800"><X size={20}/></button></div>
        <ExportPanel data={sortedData} autoResumeToken={resumeExportToken}/>
      </div>
    </div>

    {editor?.kind === 'experience' && <AddItemModal kind="experience" open initialValue={editor.item} onClose={closeEditor} onSubmit={item => editor.item ? updateItem('experiences', editor.item.id, item) : addItemToSection('experiences', item)}/>} 
    {editor?.kind === 'education' && <AddItemModal kind="education" open initialValue={editor.item} onClose={closeEditor} onSubmit={item => editor.item ? updateItem('educations', editor.item.id, item) : addItemToSection('educations', item)}/>} 
    {editor?.kind === 'skill' && <SkillModal open categories={data.skillCategories} initialValue={editor.item && { ...editor.item, categoryId: editor.categoryId ?? '' }} onClose={closeEditor} onSubmit={value => editor.item
      ? updateItem('skillCategories', editor.item.id, value.skill)
      : value.mode === 'existing'
        ? addItemToSection('skillCategories', { categoryId: value.categoryId, item: value.skill })
        : addItemToSection('skillCategories', { categoryName: value.categoryName, item: value.skill })}/>} 
    {editor?.kind === 'achievement' && <AchievementModal open initialValue={editor.item} onClose={closeEditor} onSubmit={item => editor.item ? updateItem('achievements', editor.item.id, item) : addItemToSection('achievements', item)}/>} 
    <DeleteConfirmDialog open={deleteTarget !== null} deleting={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()}/>
  </>;
}
