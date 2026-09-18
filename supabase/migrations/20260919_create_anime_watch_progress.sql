CREATE TABLE public.anime_watch_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_external_id TEXT NOT NULL,
  anime_title TEXT,
  anime_cover_url TEXT,
  current_episode_index INT NOT NULL DEFAULT 0,
  current_episode_label TEXT,
  position_seconds INT NOT NULL DEFAULT 0,
  duration_seconds INT,
  watched_episodes INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'watching'
    CHECK (status IN ('watching', 'completed', 'dropped')),
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, anime_external_id)
);

CREATE INDEX anime_watch_progress_user_last_watched_idx
  ON public.anime_watch_progress (user_id, last_watched_at DESC);

CREATE INDEX anime_watch_progress_user_status_idx
  ON public.anime_watch_progress (user_id, status);

CREATE OR REPLACE FUNCTION public.set_anime_watch_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_anime_watch_progress_updated_at
  BEFORE UPDATE ON public.anime_watch_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.set_anime_watch_progress_updated_at();

ALTER TABLE public.anime_watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own anime watch progress"
  ON public.anime_watch_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own anime watch progress"
  ON public.anime_watch_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own anime watch progress"
  ON public.anime_watch_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own anime watch progress"
  ON public.anime_watch_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
