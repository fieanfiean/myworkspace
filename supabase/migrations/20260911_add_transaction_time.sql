ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transaction_time TIME NULL;

NOTIFY pgrst, 'reload schema';
