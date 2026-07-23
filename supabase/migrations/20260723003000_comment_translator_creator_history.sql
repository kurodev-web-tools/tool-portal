create table if not exists public.comment_translator_creator_history (
  history_id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  session_reference_id text not null,
  history_rows jsonb not null check (jsonb_typeof(history_rows) = 'array'),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, session_reference_id),
  constraint comment_translator_creator_history_session_reference_nonempty
    check (length(trim(session_reference_id)) > 0)
);

alter table public.comment_translator_creator_history enable row level security;

revoke all on table public.comment_translator_creator_history from anon;
revoke all on table public.comment_translator_creator_history from authenticated;
grant all on table public.comment_translator_creator_history to service_role;

drop policy if exists "comment_translator_creator_history_service_role_all"
  on public.comment_translator_creator_history;
create policy "comment_translator_creator_history_service_role_all"
  on public.comment_translator_creator_history
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists comment_translator_creator_history_owner_recorded_idx
  on public.comment_translator_creator_history (owner_user_id, recorded_at desc);

comment on table public.comment_translator_creator_history is
  'Service-role-only Creator seven-day history containing browser-safe projected rows.';
comment on column public.comment_translator_creator_history.owner_user_id is
  'Server-only owner binding. Never returned in browser history output.';
comment on column public.comment_translator_creator_history.session_reference_id is
  'Server-only session binding used for deterministic snapshot replacement.';
comment on column public.comment_translator_creator_history.history_rows is
  'Minimum browser-safe history projection without provider targets, credentials, raw payloads, or private references.';
