-- Forward-compatible fields used by the profile avatar and achievement description UI.
-- Apply through the normal staging migration workflow before deploying the frontend.
alter table public.profiles
  add column if not exists avatar_url text not null default '';

alter table public.achievements
  add column if not exists description text not null default '';
