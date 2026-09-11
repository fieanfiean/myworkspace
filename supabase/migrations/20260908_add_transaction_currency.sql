ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS original_currency VARCHAR(10) DEFAULT 'MYR',
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 6) DEFAULT 1.000000;

NOTIFY pgrst, 'reload schema';
