import { supabase } from '@/lib/supabase';

export interface AnimeQueryFilters {
  search: string;
  type: string;
  areas?: string[];
  genres?: string[];
  status: string;
  year: string;
}

const animeColumns = 'id,external_id,title,cover_url,description,rating,year,genres,episodes,episode_count,watched_episodes,status,region_category,area,release_date,source_site,updated_at';

export interface TrackedAnime {
  id: string;
  title: string;
  cover_url: string | null;
  watched_episodes: number;
  episode_count: number;
  status: 'ongoing' | 'completed';
}

export interface NewTrackedAnime {
  title: string;
  watchedEpisodes: number;
  episodeCount: number;
}

export async function fetchTrackedAnime(status: TrackedAnime['status']): Promise<TrackedAnime[]> {
  const { data, error } = await supabase.from('animes')
    .select('id,title,cover_url,watched_episodes,episode_count,status')
    .eq('status', status)
    .or('watched_episodes.gt.0,source_site.eq.manual-tracker')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TrackedAnime[];
}

export async function incrementWatchedEpisode(item: TrackedAnime): Promise<TrackedAnime> {
  const watchedEpisodes = Math.min(item.episode_count, item.watched_episodes + 1);
  const status = item.episode_count > 0 && watchedEpisodes >= item.episode_count ? 'completed' : 'ongoing';
  const { data, error } = await supabase.from('animes').update({
    watched_episodes: watchedEpisodes,
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', item.id).select('id,title,cover_url,watched_episodes,episode_count,status').single();
  if (error) throw new Error(error.message);
  return data as TrackedAnime;
}

export async function createTrackedAnime(input: NewTrackedAnime): Promise<TrackedAnime> {
  const watchedEpisodes = Math.min(input.watchedEpisodes, input.episodeCount);
  const status = input.episodeCount > 0 && watchedEpisodes >= input.episodeCount ? 'completed' : 'ongoing';
  const { data, error } = await supabase.from('animes').insert({
    external_id: `manual-${crypto.randomUUID()}`,
    title: input.title.trim(),
    watched_episodes: watchedEpisodes,
    episode_count: input.episodeCount,
    status,
    source_site: 'manual-tracker',
    genres: [],
    episodes: [],
  }).select('id,title,cover_url,watched_episodes,episode_count,status').single();
  if (error) throw new Error(error.message);
  return data as TrackedAnime;
}

export async function fetchAnimePage(filters: AnimeQueryFilters, page: number, pageSize: number) {
  let request = supabase.from('animes').select(animeColumns, { count: 'exact' }).order('updated_at', { ascending: false });
  if (filters.search) request = request.ilike('title', `%${filters.search}%`);
  if (filters.type === 'movie') request = request.like('region_category', '%片%');
  else if (filters.type === 'series') request = request.like('region_category', '%剧%');
  else if (filters.type === 'anime') request = request.like('region_category', '%动漫%');
  else if (filters.type === 'documentary') request = request.or('region_category.like.%记录片%,region_category.like.%纪录片%,region_category.like.%综艺%');
  if (filters.areas) request = request.in('area', filters.areas);
  if (filters.genres) request = request.overlaps('genres', filters.genres);
  if (filters.status !== 'all') request = request.eq('status', filters.status);
  if (filters.year === '2020s') request = request.gte('year', 2020).lte('year', 2029);
  else if (filters.year === '2010s') request = request.gte('year', 2010).lte('year', 2019);
  else if (filters.year !== 'all') request = request.eq('year', Number(filters.year));
  const from = (page - 1) * pageSize;
  const { data, error, count } = await request.range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  return { rows: data ?? [], total: count ?? 0, from };
}
