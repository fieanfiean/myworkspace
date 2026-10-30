BEGIN;

UPDATE public.anime_watch_progress
SET current_episode_index = GREATEST(
  current_episode_index,
  watched_episodes - 1,
  0
);

ALTER TABLE public.anime_watch_progress
  DROP COLUMN watched_episodes;

ALTER TABLE public.anime_watch_progress
  ADD CONSTRAINT anime_watch_progress_current_episode_index_nonnegative
  CHECK (current_episode_index >= 0);

ALTER TABLE public.animes
  DROP COLUMN IF EXISTS watched_episodes;

CREATE OR REPLACE FUNCTION public.save_anime_watch_progress(
  p_anime_external_id TEXT,
  p_anime_title TEXT,
  p_anime_cover_url TEXT,
  p_episode_index INT,
  p_episode_label TEXT,
  p_position_seconds INT,
  p_duration_seconds INT,
  p_episode_count INT
)
RETURNS public.anime_watch_progress
LANGUAGE SQL
SET search_path = public
AS $$
  INSERT INTO public.anime_watch_progress (
    user_id,
    anime_external_id,
    anime_title,
    anime_cover_url,
    current_episode_index,
    current_episode_label,
    position_seconds,
    duration_seconds,
    status,
    last_watched_at
  ) VALUES (
    auth.uid(),
    p_anime_external_id,
    p_anime_title,
    p_anime_cover_url,
    GREATEST(0, p_episode_index),
    p_episode_label,
    GREATEST(0, p_position_seconds),
    CASE WHEN p_duration_seconds IS NULL THEN NULL ELSE GREATEST(0, p_duration_seconds) END,
    CASE
      WHEN p_episode_count > 0 AND GREATEST(0, p_episode_index) + 1 >= p_episode_count THEN 'completed'
      ELSE 'watching'
    END,
    NOW()
  )
  ON CONFLICT (user_id, anime_external_id) DO UPDATE
  SET anime_title = COALESCE(EXCLUDED.anime_title, anime_watch_progress.anime_title),
      anime_cover_url = COALESCE(EXCLUDED.anime_cover_url, anime_watch_progress.anime_cover_url),
      current_episode_index = GREATEST(
        anime_watch_progress.current_episode_index,
        EXCLUDED.current_episode_index
      ),
      current_episode_label = CASE
        WHEN EXCLUDED.current_episode_index >= anime_watch_progress.current_episode_index
          THEN COALESCE(EXCLUDED.current_episode_label, anime_watch_progress.current_episode_label)
        ELSE anime_watch_progress.current_episode_label
      END,
      position_seconds = CASE
        WHEN EXCLUDED.current_episode_index > anime_watch_progress.current_episode_index
          THEN EXCLUDED.position_seconds
        WHEN EXCLUDED.current_episode_index = anime_watch_progress.current_episode_index
          THEN GREATEST(EXCLUDED.position_seconds, anime_watch_progress.position_seconds)
        ELSE anime_watch_progress.position_seconds
      END,
      duration_seconds = CASE
        WHEN EXCLUDED.current_episode_index >= anime_watch_progress.current_episode_index
          THEN EXCLUDED.duration_seconds
        ELSE anime_watch_progress.duration_seconds
      END,
      status = CASE
        WHEN p_episode_count > 0
          AND GREATEST(anime_watch_progress.current_episode_index, EXCLUDED.current_episode_index) + 1 >= p_episode_count
          THEN 'completed'
        ELSE anime_watch_progress.status
      END,
      last_watched_at = NOW()
  RETURNING anime_watch_progress.*;
$$;

CREATE OR REPLACE FUNCTION public.advance_anime_watch_progress(
  p_anime_external_id TEXT,
  p_episode_index INT,
  p_episode_count INT
)
RETURNS public.anime_watch_progress
LANGUAGE SQL
SET search_path = public
AS $$
  INSERT INTO public.anime_watch_progress (
    user_id,
    anime_external_id,
    current_episode_index,
    status,
    last_watched_at
  ) VALUES (
    auth.uid(),
    p_anime_external_id,
    GREATEST(0, p_episode_index),
    CASE
      WHEN p_episode_count > 0 AND GREATEST(0, p_episode_index) + 1 >= p_episode_count THEN 'completed'
      ELSE 'watching'
    END,
    NOW()
  )
  ON CONFLICT (user_id, anime_external_id) DO UPDATE
  SET current_episode_index = GREATEST(
        anime_watch_progress.current_episode_index,
        EXCLUDED.current_episode_index
      ),
      status = CASE
        WHEN p_episode_count > 0
          AND GREATEST(anime_watch_progress.current_episode_index, EXCLUDED.current_episode_index) + 1 >= p_episode_count
          THEN 'completed'
        ELSE anime_watch_progress.status
      END,
      last_watched_at = NOW()
  RETURNING anime_watch_progress.*;
$$;

REVOKE ALL ON FUNCTION public.save_anime_watch_progress(TEXT, TEXT, TEXT, INT, TEXT, INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_anime_watch_progress(TEXT, TEXT, TEXT, INT, TEXT, INT, INT, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.advance_anime_watch_progress(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_anime_watch_progress(TEXT, INT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
