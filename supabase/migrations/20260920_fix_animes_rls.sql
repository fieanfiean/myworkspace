DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'animes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.animes', existing_policy.policyname);
  END LOOP;
END
$$;

ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view animes"
  ON public.animes
  FOR SELECT
  TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
