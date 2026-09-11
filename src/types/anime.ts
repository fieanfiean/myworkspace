export interface AnimeEpisode { ep: string; url: string }

export interface Anime {
  id: string;
  external_id: string;
  title: string;
  cover_url: string | null;
  description: string | null;
  rating: number;
  year: number;
  genres: string[];
  episodes: AnimeEpisode[];
  status: 'ongoing' | 'completed';
  region_category: string | null;
  area: string | null;
  release_date: string | null;
  source_site: string | null;
  updated_at: string;
}
