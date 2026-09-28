export interface AnimeEpisode { ep: string; url: string }

export interface Anime {
  id: string;
  external_id: string;
  source: string;
  title: string;
  cover_url: string | null;
  description: string | null;
  rating: number;
  year: number;
  genres: string[];
  episodes: AnimeEpisode[];
  episode_count: number;
  watched_episodes: number;
  status: 'ongoing' | 'completed';
  category: string | null;
  region_category: string | null;
  area: string | null;
  release_date: string | null;
  source_site: string | null;
  updated_at: string;
}
