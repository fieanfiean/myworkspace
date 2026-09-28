import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/profile';

export type DatabaseRow = Record<string, unknown>;
export type ProfileTable = 'experiences' | 'educations' | 'achievements' | 'skills';

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getProfile(profileId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
  throwIfError(error);
  return data as Profile | null;
}

export async function getProfileSummary(profileId: string) {
  const { data, error } = await supabase.from('profiles').select('full_name, nickname, headline, avatar_url').eq('id', profileId).maybeSingle();
  throwIfError(error);
  return data as Pick<Profile, 'full_name' | 'nickname' | 'headline' | 'avatar_url'> | null;
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' }).select().single();
  throwIfError(error);
  return { ...profile, ...(data as Partial<Profile>) };
}

export async function updateProfileAvatar(profileId: string, avatarUrl: string) {
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profileId);
  throwIfError(error);
}

export async function getProfileSectionRows(profileId: string) {
  const [experiences, educations, categories, achievements] = await Promise.all([
    supabase.from('experiences').select('*').eq('profile_id', profileId),
    supabase.from('educations').select('*').eq('profile_id', profileId),
    supabase.from('skill_categories').select('*').eq('profile_id', profileId),
    supabase.from('achievements').select('*').eq('profile_id', profileId),
  ]);
  throwIfError(experiences.error ?? educations.error ?? categories.error ?? achievements.error);
  const categoryRows = (categories.data ?? []) as DatabaseRow[];
  const categoryIds = categoryRows.map(row => String(row.id ?? '')).filter(Boolean);
  let skills: DatabaseRow[] = [];
  if (categoryIds.length) {
    const result = await supabase.from('skills').select('*').in('category_id', categoryIds);
    throwIfError(result.error);
    skills = (result.data ?? []) as DatabaseRow[];
  }
  return {
    experiences: (experiences.data ?? []) as DatabaseRow[],
    educations: (educations.data ?? []) as DatabaseRow[],
    categories: categoryRows,
    achievements: (achievements.data ?? []) as DatabaseRow[],
    skills,
  };
}

export async function insertProfileItem(table: ProfileTable, payload: DatabaseRow) {
  const { error } = await supabase.from(table).insert(payload);
  throwIfError(error);
}

export async function updateProfileItem(table: ProfileTable, itemId: string, payload: DatabaseRow) {
  const { error } = await supabase.from(table).update(payload).eq('id', itemId);
  throwIfError(error);
}

export async function deleteProfileItem(table: ProfileTable, itemId: string) {
  const { error } = await supabase.from(table).delete().eq('id', itemId);
  throwIfError(error);
}

export async function createSkillCategoryWithSkill(profileId: string, title: string, skill: DatabaseRow) {
  let categoryId: string | null = null;
  try {
    const { data, error } = await supabase.from('skill_categories').insert({ profile_id: profileId, title, color: 'bg-blue-600' }).select('id').single();
    throwIfError(error);
    if (!data) throw new Error('Unable to create the skill category.');
    categoryId = String(data.id);
    await insertProfileItem('skills', { category_id: categoryId, ...skill });
  } catch (error) {
    if (categoryId) await supabase.from('skill_categories').delete().eq('id', categoryId);
    throw error;
  }
}

export async function getResumeExtras(profileId: string, includePublications: boolean, includeCertifications: boolean) {
  const [profile, publications, certifications] = await Promise.all([
    getProfile(profileId),
    includePublications ? supabase.from('publications').select('*').eq('profile_id', profileId) : Promise.resolve({ data: [], error: null }),
    includeCertifications ? supabase.from('certifications').select('*').eq('profile_id', profileId) : Promise.resolve({ data: [], error: null }),
  ]);
  throwIfError(publications.error ?? certifications.error);
  return { profile, publications: publications.data ?? [], certifications: certifications.data ?? [] };
}
