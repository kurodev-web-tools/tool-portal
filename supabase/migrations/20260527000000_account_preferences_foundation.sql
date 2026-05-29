-- Supabase Auth first slice: account/preferences additive foundation.
-- Review and apply from the Supabase SQL editor or CLI after confirming the target project.
-- The Supabase CLI was not available in this workspace, so this migration was authored as a reviewable SQL file.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  locale text check (locale in ('ja', 'en')),
  theme text check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tool_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  schema_version integer not null default 1,
  preferences_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

create table if not exists public.usage_quotas (
  user_id uuid not null references auth.users(id) on delete cascade,
  quota_key text not null,
  plan_id text not null default 'free',
  period_start timestamptz not null,
  period_end timestamptz not null,
  used_count integer not null default 0 check (used_count >= 0),
  limit_count integer not null default 0 check (limit_count >= 0),
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, quota_key, period_start)
);

alter table public.user_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.tool_preferences enable row level security;
alter table public.usage_quotas enable row level security;

revoke all on table public.user_profiles from anon;
revoke all on table public.user_preferences from anon;
revoke all on table public.tool_preferences from anon;
revoke all on table public.usage_quotas from anon;

grant usage on schema public to authenticated;
grant select, insert, update on table public.user_profiles to authenticated;
grant select, insert, update on table public.user_preferences to authenticated;
grant select, insert, update on table public.tool_preferences to authenticated;
grant select on table public.usage_quotas to authenticated;

drop policy if exists "user_profiles_owner_select" on public.user_profiles;
create policy "user_profiles_owner_select"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_profiles_owner_insert" on public.user_profiles;
create policy "user_profiles_owner_insert"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_profiles_owner_update" on public.user_profiles;
create policy "user_profiles_owner_update"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_owner_select" on public.user_preferences;
create policy "user_preferences_owner_select"
  on public.user_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_preferences_owner_insert" on public.user_preferences;
create policy "user_preferences_owner_insert"
  on public.user_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_owner_update" on public.user_preferences;
create policy "user_preferences_owner_update"
  on public.user_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tool_preferences_owner_select" on public.tool_preferences;
create policy "tool_preferences_owner_select"
  on public.tool_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "tool_preferences_owner_insert" on public.tool_preferences;
create policy "tool_preferences_owner_insert"
  on public.tool_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "tool_preferences_owner_update" on public.tool_preferences;
create policy "tool_preferences_owner_update"
  on public.tool_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "usage_quotas_owner_select" on public.usage_quotas;
create policy "usage_quotas_owner_select"
  on public.usage_quotas
  for select
  to authenticated
  using (auth.uid() = user_id);

comment on table public.usage_quotas is
  'quota writes are trusted-server-only; browser/authenticated clients receive owner read access only';
