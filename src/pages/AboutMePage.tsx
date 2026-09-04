import { useCallback, useMemo, useState } from 'react';
import { AchievementsSection } from '@/components/AchievementsSection';
import { AchievementModal } from '@/components/AchievementModal';
import { AddItemModal } from '@/components/AddItemModal';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { EducationSection } from '@/components/EducationSection';
import { ExperienceList } from '@/components/ExperienceList';
import { ExportPanel } from '@/components/ExportPanel';
import { ProfileHeader } from '@/components/ProfileHeader';
import { SkillsSection } from '@/components/SkillsSection';
import { SkillModal } from '@/components/SkillModal';
import { useProfileData, type ProfileItemSection } from '@/hooks/useProfileData';
import type { Achievement, EducationItem, Experience, Skill } from '@/types/profile';
import { initialAboutMeData } from './mockData';
import { useAuth } from '@/hooks/useAuth';
import { sortEducationsByMostRecent, sortExperiencesByMostRecent } from '@/lib/timelineSort';

type Editor =
  | { kind: 'experience'; item?: Experience }
  | { kind: 'education'; item?: EducationItem }
  | { kind: 'skill'; item?: Skill; categoryId?: string }
  | { kind: 'achievement'; item?: Achievement };
type DeleteTarget = { section: ProfileItemSection; id: string };

export function AboutMePage() {
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
    <div className="mx-auto flex max-w-7xl items-start gap-8">
      <main className="min-w-0 flex-1 space-y-4">
        <ProfileHeader experiences={sortedData.experiences} achievements={sortedData.achievements}/>
        <ExperienceList items={sortedData.experiences} onAdd={() => setEditor({ kind: 'experience' })} onEdit={item => setEditor({ kind: 'experience', item })} onDelete={id => remove('experiences', id)}/>
        <EducationSection items={sortedData.educations} onAdd={() => setEditor({ kind: 'education' })} onEdit={item => setEditor({ kind: 'education', item })} onDelete={id => remove('educations', id)}/>
        <SkillsSection items={data.skillCategories} onAdd={() => setEditor({ kind: 'skill' })} onEdit={(categoryId, item) => setEditor({ kind: 'skill', categoryId, item })} onDelete={id => remove('skillCategories', id)}/>
        <AchievementsSection items={data.achievements} onAdd={() => setEditor({ kind: 'achievement' })} onEdit={item => setEditor({ kind: 'achievement', item })} onDelete={id => remove('achievements', id)}/>
      </main>
      <ExportPanel data={sortedData}/>
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
