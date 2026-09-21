ALTER TABLE public.animes
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ffzy5';

ALTER TABLE public.animes
  DROP CONSTRAINT IF EXISTS animes_external_id_key;

ALTER TABLE public.animes
  DROP CONSTRAINT IF EXISTS animes_external_id_source_key;

ALTER TABLE public.animes
  ADD CONSTRAINT animes_external_id_source_key UNIQUE (external_id, source);

CREATE INDEX IF NOT EXISTS animes_source_idx ON public.animes (source);

NOTIFY pgrst, 'reload schema';
