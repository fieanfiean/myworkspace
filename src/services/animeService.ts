import { supabase } from '@/lib/supabase';
import type { Anime } from '@/types/anime';

export interface AnimeQueryFilters {
  search: string;
  type: string;
  areas?: string[];
  genres?: string[];
  status: string;
  year: string;
}

const animeColumns = 'id,external_id,source,title,cover_url,description,rating,year,genres,episodes,episode_count,status,region_category,area,release_date,source_site,updated_at';

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

export async function getAnimeSources(title: string): Promise<Anime[]> {
  const { data, error } = await supabase.from('animes')
    .select('*')
    .eq('title', title)
    .order('source', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Anime[];
}
