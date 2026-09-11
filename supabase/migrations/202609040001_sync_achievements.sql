-- Sync achievements table schema for Production
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS rank TEXT;

NOTIFY pgrst, 'reload schema';
