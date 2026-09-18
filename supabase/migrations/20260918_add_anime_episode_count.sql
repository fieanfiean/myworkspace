ALTER TABLE public.animes
  ADD COLUMN IF NOT EXISTS episode_count INTEGER NOT NULL DEFAULT 0
  CHECK (episode_count >= 0);

UPDATE public.animes
SET episode_count = jsonb_array_length(episodes)
WHERE episode_count = 0
  AND jsonb_typeof(episodes) = 'array'
  AND jsonb_array_length(episodes) > 0;

