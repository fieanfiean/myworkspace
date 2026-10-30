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
  episodeCount: number;
}

const progressColumns = 'id,user_id,anime_external_id,anime_title,anime_cover_url,current_episode_index,current_episode_label,position_seconds,duration_seconds,status,last_watched_at,created_at,updated_at';

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
  const { data, error } = await supabase.rpc('save_anime_watch_progress', {
    p_anime_external_id: payload.animeExternalId,
    p_anime_title: payload.animeTitle ?? null,
    p_anime_cover_url: payload.animeCoverUrl ?? null,
    p_episode_index: Math.max(0, Math.floor(payload.episodeIndex)),
    p_episode_label: payload.episodeLabel ?? null,
    p_position_seconds: Math.max(0, Math.floor(payload.positionSeconds)),
    p_duration_seconds: payload.durationSeconds === undefined ? null : Math.max(0, Math.floor(payload.durationSeconds)),
    p_episode_count: Math.max(0, Math.floor(payload.episodeCount)),
  });
  if (error) throw new Error(error.message);
  return data as WatchProgress;
}

export async function markEpisodeWatched(animeExternalId: string, episodeIndex: number, episodeCount: number): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase.rpc('advance_anime_watch_progress', {
    p_anime_external_id: animeExternalId,
    p_episode_index: Math.max(0, Math.floor(episodeIndex)),
    p_episode_count: Math.max(0, Math.floor(episodeCount)),
  });
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
