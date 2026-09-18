import { supabase } from '@/lib/supabase';

export type WatchStatus = 'watching' | 'completed' | 'dropped';

export interface WatchProgress {
  id: string;
  user_id: string;
  anime_external_id: string;
  anime_title: string | null;
  anime_cover_url: string | null;
  current_episode_index: number;
  current_episode_label: string | null;
  position_seconds: number;
  duration_seconds: number | null;
  watched_episodes: number;
  status: WatchStatus;
  last_watched_at: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertProgressPayload {
  animeExternalId: string;
  animeTitle?: string;
  animeCoverUrl?: string | null;
  episodeIndex: number;
  episodeLabel?: string;
  positionSeconds: number;
  durationSeconds?: number;
  watchedEpisodes?: number;
}

const progressColumns = 'id,user_id,anime_external_id,anime_title,anime_cover_url,current_episode_index,current_episode_label,position_seconds,duration_seconds,watched_episodes,status,last_watched_at,created_at,updated_at';

async function currentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (error.message.toLocaleLowerCase().includes('session')) return null;
    throw new Error(error.message);
  }
  return data.user?.id ?? null;
}

async function getProgressForUser(userId: string, animeExternalId: string): Promise<WatchProgress | null> {
  const { data, error } = await supabase.from('anime_watch_progress')
    .select(progressColumns)
    .eq('user_id', userId)
    .eq('anime_external_id', animeExternalId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as WatchProgress | null;
}

async function listByStatus(status?: WatchStatus): Promise<WatchProgress[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  let query = supabase.from('anime_watch_progress')
    .select(progressColumns)
    .eq('user_id', userId)
    .order('last_watched_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as WatchProgress[];
}

export async function getProgress(animeExternalId: string): Promise<WatchProgress | null> {
  const userId = await currentUserId();
  return userId ? getProgressForUser(userId, animeExternalId) : null;
}

export function listProgress(): Promise<WatchProgress[]> {
  return listByStatus();
}

export function listWatching(): Promise<WatchProgress[]> {
  return listByStatus('watching');
}

export function listCompleted(): Promise<WatchProgress[]> {
  return listByStatus('completed');
}

export async function upsertProgress(payload: UpsertProgressPayload): Promise<WatchProgress | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const existing = await getProgressForUser(userId, payload.animeExternalId);
  const now = new Date().toISOString();
  const watchedEpisodes = Math.max(existing?.watched_episodes ?? 0, payload.watchedEpisodes ?? 0);
  const { data, error } = await supabase.from('anime_watch_progress').upsert({
    user_id: userId,
    anime_external_id: payload.animeExternalId,
    ...(payload.animeTitle !== undefined && { anime_title: payload.animeTitle }),
    ...(payload.animeCoverUrl !== undefined && { anime_cover_url: payload.animeCoverUrl }),
    current_episode_index: Math.max(0, Math.floor(payload.episodeIndex)),
    ...(payload.episodeLabel !== undefined && { current_episode_label: payload.episodeLabel }),
    position_seconds: Math.max(0, Math.floor(payload.positionSeconds)),
    ...(payload.durationSeconds !== undefined && { duration_seconds: Math.max(0, Math.floor(payload.durationSeconds)) }),
    watched_episodes: watchedEpisodes,
    last_watched_at: now,
  }, { onConflict: 'user_id,anime_external_id' }).select(progressColumns).single();
  if (error) throw new Error(error.message);
  return data as WatchProgress;
}

export async function markEpisodeWatched(animeExternalId: string, episodeIndex: number): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const existing = await getProgressForUser(userId, animeExternalId);
  const watchedEpisodes = Math.max(existing?.watched_episodes ?? 0, Math.max(0, Math.floor(episodeIndex)) + 1);
  if (!existing) {
    const { error } = await supabase.from('anime_watch_progress').insert({
      user_id: userId,
      anime_external_id: animeExternalId,
      current_episode_index: Math.max(0, Math.floor(episodeIndex)),
      watched_episodes: watchedEpisodes,
      last_watched_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('anime_watch_progress').update({
    watched_episodes: watchedEpisodes,
    last_watched_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('anime_external_id', animeExternalId);
  if (error) throw new Error(error.message);
}

export async function markCompleted(animeExternalId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase.from('anime_watch_progress').update({
    status: 'completed',
    last_watched_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('anime_external_id', animeExternalId);
  if (error) throw new Error(error.message);
}

export async function deleteProgress(animeExternalId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase.from('anime_watch_progress').delete()
    .eq('user_id', userId)
    .eq('anime_external_id', animeExternalId);
  if (error) throw new Error(error.message);
}
