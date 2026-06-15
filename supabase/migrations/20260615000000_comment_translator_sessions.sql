-- Kuro Live Comment Translator: durable active-session and session-history rows.
-- Reviewable local migration file only. This thread does not apply the migration
-- to a remote Supabase project and does not include private credential values.

create table if not exists public.comment_translator_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  session_reference_id text not null,
  provider text not null default 'youtube' check (provider = 'youtube'),
  plan text not null check (plan in ('free', 'paid')),
  plan_entitlement_reference_id text not null,
  status text not null check (status in ('active', 'stopped')),
  started_at timestamptz not null,
  last_heartbeat_at timestamptz not null,
  stopped_at timestamptz,
  stop_reason text check (
    stop_reason is null
    or stop_reason in (
      'user-stop',
      'stream-ended',
      'stream-unavailable',
      'browser-disconnect',
      'missing-heartbeat',
      'auth-failed',
      'token-refresh-failed',
      'reconnect-required',
      'daily-time-limit',
      'session-time-limit',
      'translated-message-cap',
      'provider-quota-stop',
      'global-budget-stop',
      'ai-budget-stop',
      'translation-provider-limit',
      'session-limit',
      'terminal-provider-error'
    )
  ),
  credential_reference_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_sessions_reference_nonempty check (length(trim(session_reference_id)) > 0),
  constraint comment_translator_sessions_entitlement_reference_nonempty check (length(trim(plan_entitlement_reference_id)) > 0),
  constraint comment_translator_sessions_stopped_reason_required check (
    (status = 'active' and stopped_at is null and stop_reason is null)
    or (status = 'stopped' and stopped_at is not null and stop_reason is not null)
  )
);

alter table public.comment_translator_sessions enable row level security;

revoke all on table public.comment_translator_sessions from anon;
revoke all on table public.comment_translator_sessions from authenticated;
grant all on table public.comment_translator_sessions to service_role;

drop policy if exists "comment_translator_sessions_service_role_all" on public.comment_translator_sessions;
create policy "comment_translator_sessions_service_role_all"
  on public.comment_translator_sessions
  for all
  to service_role
  using (true)
  with check (true);

create unique index if not exists comment_translator_sessions_reference_key
  on public.comment_translator_sessions (session_reference_id);

create unique index if not exists comment_translator_sessions_one_active_per_owner_idx
  on public.comment_translator_sessions (owner_user_id)
  where status = 'active';

create index if not exists comment_translator_sessions_owner_history_idx
  on public.comment_translator_sessions (owner_user_id, started_at desc);

create index if not exists comment_translator_sessions_stale_heartbeat_idx
  on public.comment_translator_sessions (last_heartbeat_at)
  where status = 'active';

comment on table public.comment_translator_sessions is
  'Server-owned Kuro Live Comment Translator session authority. Browser clients receive sanitized session metadata only; private owner, credential, and provider execution details stay server-only.';

comment on column public.comment_translator_sessions.owner_user_id is
  'Trusted server ownership reference used only for authorization and one-active-session enforcement.';

comment on column public.comment_translator_sessions.session_reference_id is
  'Opaque browser-safe session reference. It is not a channel identifier or credential value.';

comment on column public.comment_translator_sessions.credential_reference_id is
  'Opaque YouTube credential reference used by trusted server runtime. This column does not store credential material.';

comment on column public.comment_translator_sessions.stop_reason is
  'Sanitized stop reason enum used for support and rollback evidence without provider response bodies.';
