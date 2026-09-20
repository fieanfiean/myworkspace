alter table public.profiles
  add column if not exists full_name text,
  add column if not exists nickname text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name'
  ) then
    execute $sql$
      update public.profiles
      set nickname = coalesce(nullif(btrim(nickname), ''), nullif(btrim(display_name), ''))
      where nullif(btrim(nickname), '') is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'name'
  ) then
    execute $sql$
      update public.profiles
      set nickname = coalesce(nullif(btrim(nickname), ''), nullif(btrim(name), ''))
      where nullif(btrim(nickname), '') is null
    $sql$;
  end if;
end
$$;

notify pgrst, 'reload schema';
