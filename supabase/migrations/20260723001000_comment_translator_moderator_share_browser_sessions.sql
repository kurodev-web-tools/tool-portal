create table if not exists public.comment_translator_moderator_share_browser_sessions (
  owner_user_id uuid not null,
  session_reference_id text not null
    references public.comment_translator_sessions (session_reference_id) on delete cascade,
  token_version bigint not null check (token_version > 0),
  capability_digest text not null unique,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  primary key (owner_user_id),
  constraint comment_translator_moderator_share_browser_sessions_digest_check
    check (capability_digest ~ '^[a-f0-9]{64}$'),
  constraint comment_translator_moderator_share_browser_sessions_expiry_check
    check (expires_at > issued_at)
);

alter table public.comment_translator_moderator_share_browser_sessions enable row level security;

revoke all on table public.comment_translator_moderator_share_browser_sessions from anon;
revoke all on table public.comment_translator_moderator_share_browser_sessions from authenticated;
grant all on table public.comment_translator_moderator_share_browser_sessions to service_role;

drop policy if exists "comment_translator_moderator_share_browser_sessions_service_role_all"
  on public.comment_translator_moderator_share_browser_sessions;
create policy "comment_translator_moderator_share_browser_sessions_service_role_all"
  on public.comment_translator_moderator_share_browser_sessions
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists comment_translator_moderator_share_browser_sessions_session_idx
  on public.comment_translator_moderator_share_browser_sessions (session_reference_id);

comment on table public.comment_translator_moderator_share_browser_sessions is
  'Service-role-only C8 browser capability authority. Every read remains bound to the current C7 token version and authoritative session.';
comment on column public.comment_translator_moderator_share_browser_sessions.capability_digest is
  'SHA-256 digest of the C8 browser capability. C7 plaintext share tokens are never persisted here.';
