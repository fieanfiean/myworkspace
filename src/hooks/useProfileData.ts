import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AboutMeData, Achievement, AchievementCategory, EducationItem, Experience, Skill, SkillCategory, SkillLevel } from '@/types/profile';
import { parseLegacyDateRange, serializeDateRange } from '@/lib/profileStats';

type NewExperience = Omit<Experience, 'id'>;
type NewEducation = Omit<EducationItem, 'id'>;
type NewAchievement = Omit<Achievement, 'id'>;
type NewSkill = Omit<Skill, 'id'>;
type SkillInput = { categoryId: string; item: NewSkill } | { categoryName: string; item: NewSkill };
type Row = Record<string, unknown>;
const ACHIEVEMENT_IMAGE_COLUMN = 'image_url' as const;

export type ProfileItemSection = 'experiences' | 'educations' | 'skillCategories' | 'achievements';
export type ProfileItemUpdate = Partial<Omit<Experience | EducationItem | Skill | Achievement, 'id'>>;

export type AddItem = {
  (section: 'experiences', item: NewExperience): Promise<void>;
  (section: 'educations', item: NewEducation): Promise<void>;
  (section: 'achievements', item: NewAchievement): Promise<void>;
  (section: 'skillCategories', input: SkillInput): Promise<void>;
};

const emptyData: AboutMeData = { experiences: [], educations: [], skillCategories: [], achievements: [] };
const text = (value: unknown) => typeof value === 'string' ? value : '';
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const skillLevel = (value: unknown): SkillLevel => ['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(String(value)) ? value as SkillLevel : 'Beginner';

function toExperience(row: Row): Experience {
  const dates = parseLegacyDateRange(text(row.date_range));
  return { id: text(row.id), type: 'work', title: text(row.title), organization: text(row.organization), location: text(row.location), ...dates, isCurrent: Boolean(row.is_current) || dates.isCurrent, details: text(row.details), tags: strings(row.tags) };
}

function toEducation(row: Row): EducationItem {
  return { id: text(row.id), degree: text(row.degree), school: text(row.school), location: text(row.location), dateRange: text(row.date_range), gpa: text(row.gpa), description: text(row.description), badges: strings(row.badges) };
}

function toSkill(row: Row): Skill {
  return { id: text(row.id), name: text(row.name), level: skillLevel(row.level) };
}

const achievementCategory = (value: unknown): AchievementCategory => ['project', 'award', 'certificate', 'certification'].includes(String(value)) ? value as AchievementCategory : 'award';

function toAchievement(row: Row): Achievement {
  return { id: text(row.id), category: achievementCategory(row.category), title: text(row.title), year: text(row.year), tag: text(row.tag), rank: text(row.rank), description: text(row.description), imageUrl: text(row[ACHIEVEMENT_IMAGE_COLUMN]) };
}

function sectionPayload(section: ProfileItemSection, value: Row): Row {
  if (section === 'experiences') return {
    ...(value.title !== undefined && { title: value.title }),
    ...(value.organization !== undefined && { organization: value.organization }),
    ...(value.location !== undefined && { location: value.location }),
    ...((value.startDate !== undefined || value.endDate !== undefined || value.isCurrent !== undefined) && { date_range: serializeDateRange(value as unknown as Pick<Experience, 'startDate' | 'endDate' | 'isCurrent'>) }),
    ...(value.details !== undefined && { details: value.details }),
    ...(value.tags !== undefined && { tags: value.tags }),
    ...(value.isCurrent !== undefined && { is_current: value.isCurrent }),
    type: 'work',
  };
  if (section === 'educations') return {
    ...(value.degree !== undefined && { degree: value.degree }),
    ...(value.school !== undefined && { school: value.school }),
    ...(value.location !== undefined && { location: value.location }),
    ...(value.dateRange !== undefined && { date_range: value.dateRange }),
    ...(value.gpa !== undefined && { gpa: value.gpa }),
    ...(value.description !== undefined && { description: value.description }),
    ...(value.badges !== undefined && { badges: value.badges }),
  };
  if (section === 'achievements') return {
    ...(value.category !== undefined && { category: value.category }),
    ...(value.title !== undefined && { title: value.title }),
    ...(value.year !== undefined && { year: value.year }),
    ...(value.tag !== undefined && { tag: value.tag }),
    ...(value.rank !== undefined && { rank: value.rank }),
    ...(value.description !== undefined && { description: value.description }),
    ...(value.imageUrl !== undefined && { [ACHIEVEMENT_IMAGE_COLUMN]: value.imageUrl }),
  };
  return {
    ...(value.name !== undefined && { name: value.name }),
    ...(value.level !== undefined && { level: value.level }),
  };
}

export async function fetchSectionData(profileId = 'default'): Promise<AboutMeData> {
  const [experiencesResult, educationsResult, categoriesResult, achievementsResult] = await Promise.all([
    supabase.from('experiences').select('*').eq('profile_id', profileId),
    supabase.from('educations').select('*').eq('profile_id', profileId),
    supabase.from('skill_categories').select('*').eq('profile_id', profileId),
    supabase.from('achievements').select('*').eq('profile_id', profileId),
  ]);

  const firstError = experiencesResult.error ?? educationsResult.error ?? categoriesResult.error ?? achievementsResult.error;
  if (firstError) throw firstError;

  const categoryRows = (categoriesResult.data ?? []) as Row[];
  const categoryIds = categoryRows.map((row) => text(row.id)).filter(Boolean);
  let skillRows: Row[] = [];
  if (categoryIds.length) {
    const { data, error } = await supabase.from('skills').select('*').in('category_id', categoryIds);
    if (error) throw error;
    skillRows = (data ?? []) as Row[];
  }

  const skillCategories: SkillCategory[] = categoryRows.map((row) => ({
    id: text(row.id),
    title: text(row.title),
    color: text(row.color),
    skills: skillRows.filter((skill) => text(skill.category_id) === text(row.id)).map(toSkill),
  }));

  return {
    experiences: ((experiencesResult.data ?? []) as Row[]).map(toExperience),
    educations: ((educationsResult.data ?? []) as Row[]).map(toEducation),
    skillCategories,
    achievements: ((achievementsResult.data ?? []) as Row[]).map(toAchievement),
  };
}

export function useProfileData(profileId = 'default', initialData: AboutMeData = emptyData) {
  const [data, setData] = useState<AboutMeData>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await fetchSectionData(profileId);
    setData(nextData);
    return nextData;
  }, [profileId]);

  useEffect(() => {
    let active = true;
    void fetchSectionData(profileId).then((nextData) => {
      if (active) setData(nextData);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason : new Error(String(reason)));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [profileId]);

  const runMutation = useCallback(async (operation: () => PromiseLike<{ error: Error | null }>) => {
    setError(null);
    try {
      const { error: mutationError } = await operation();
      if (mutationError) throw mutationError;
      await refresh();
    } catch (reason) {
      const nextError = reason instanceof Error ? reason : new Error(String(reason));
      setError(nextError);
      throw nextError;
    }
  }, [refresh]);

  const addItem = useCallback<AddItem>(async (section: ProfileItemSection, input: NewExperience | NewEducation | NewAchievement | SkillInput) => {
    if (section === 'skillCategories') {
      const skillInput = input as SkillInput;
      if ('categoryId' in skillInput) {
        await runMutation(() => supabase.from('skills').insert({ category_id: skillInput.categoryId, ...sectionPayload(section, skillInput.item as Row) }));
        return;
      }

      setError(null);
      let createdCategoryId: string | null = null;
      try {
        const { data: category, error: categoryError } = await supabase.from('skill_categories').insert({
          profile_id: profileId,
          title: skillInput.categoryName,
          color: 'bg-blue-600',
        }).select('id').single();
        if (categoryError) throw categoryError;
        createdCategoryId = String(category.id);

        const { error: skillError } = await supabase.from('skills').insert({
          category_id: createdCategoryId,
          ...sectionPayload(section, skillInput.item as Row),
        });
        if (skillError) throw skillError;
        await refresh();
      } catch (reason) {
        if (createdCategoryId) await supabase.from('skill_categories').delete().eq('id', createdCategoryId);
        const nextError = reason instanceof Error ? reason : new Error(String(reason));
        setError(nextError);
        throw nextError;
      }
      return;
    }
    await runMutation(() => supabase.from(section).insert({ profile_id: profileId, ...sectionPayload(section, input as Row) }));
  }, [profileId, refresh, runMutation]);

  const updateItem = useCallback(async (section: ProfileItemSection, itemId: string, updatedData: ProfileItemUpdate) => {
    const table = section === 'skillCategories' ? 'skills' : section;
    await runMutation(() => supabase.from(table).update(sectionPayload(section, updatedData as Row)).eq('id', itemId));
  }, [runMutation]);

  const deleteItem = useCallback(async (section: ProfileItemSection, itemId: string) => {
    const table = section === 'skillCategories' ? 'skills' : section;
    await runMutation(() => supabase.from(table).delete().eq('id', itemId));
  }, [runMutation]);

  return { data, loading, error, fetchSectionData: refresh, addItem, addItemToSection: addItem, updateItem, deleteItem } as const;
}
