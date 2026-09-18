ALTER TABLE public.animes
  ADD COLUMN IF NOT EXISTS watched_episodes INTEGER NOT NULL DEFAULT 0
  CHECK (watched_episodes >= 0);

DROP POLICY IF EXISTS "Allow authenticated anime inserts" ON public.animes;
CREATE POLICY "Allow authenticated anime inserts"
  ON public.animes FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated anime updates" ON public.animes;
CREATE POLICY "Allow authenticated anime updates"
  ON public.animes FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
