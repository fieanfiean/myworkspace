DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND policyname = 'Users can update own transactions'
  ) THEN
    CREATE POLICY "Users can update own transactions" ON public.transactions
      FOR UPDATE USING (auth.uid() = profile_id)
      WITH CHECK (auth.uid() = profile_id);
  END IF;
END $$;
