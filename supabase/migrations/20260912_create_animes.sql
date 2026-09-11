CREATE TABLE IF NOT EXISTS public.animes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  cover_url TEXT,
  description TEXT,
  rating NUMERIC(3, 1) DEFAULT 8.5,
  year INT DEFAULT 2026,
  genres TEXT[] DEFAULT ARRAY['Action', 'Fantasy'],
  episodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_site TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.animes;
CREATE POLICY "Allow public read access" ON public.animes FOR SELECT TO anon, authenticated USING (true);

NOTIFY pgrst, 'reload schema';
