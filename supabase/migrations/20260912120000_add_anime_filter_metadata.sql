ALTER TABLE public.animes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ongoing'
    CHECK (status IN ('ongoing', 'completed')),
  ADD COLUMN IF NOT EXISTS region_category TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ;

UPDATE public.animes
SET release_date = updated_at
WHERE release_date IS NULL;

CREATE INDEX IF NOT EXISTS animes_updated_at_desc_idx
  ON public.animes (updated_at DESC);

CREATE INDEX IF NOT EXISTS animes_filter_metadata_idx
  ON public.animes (status, region_category, area, year);

NOTIFY pgrst, 'reload schema';
