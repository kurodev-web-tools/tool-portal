-- Kuro Live Comment Translator: durable session-scoped browser-safe feed snapshots.
-- Stores only the F8/F9/F10 browser-safe feed shape. Raw provider payloads, raw comments,
-- provider target metadata, liveChatId, cursor, and author channel material are not stored.

create table if not exists public.comment_translator_real_comments_feed_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  session_reference_id text not null,
  feed_snapshot jsonb not null,
  display_row_count integer not null default 0,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_real_comments_feed_reference_nonempty check (length(trim(session_reference_id)) > 0),
  constraint comment_translator_real_comments_feed_display_count_nonnegative check (display_row_count >= 0),
  constraint comment_translator_real_comments_feed_safe_source check (
    feed_snapshot ->> 'source' = 'server-owned-live-session-state'
  ),
  constraint comment_translator_real_comments_feed_safe_payload_markers check (
    feed_snapshot ->> 'rawProviderPayload' = 'not-returned-by-design'
    and feed_snapshot ->> 'rawComments' = 'not-returned-by-design'
    and feed_snapshot ->> 'providerTargetMetadata' = 'forbidden'
    and feed_snapshot ->> 'serverOnlyCursor' = 'not-returned-by-design'
    and feed_snapshot ->> 'browserStorage' = 'unchanged'
    and feed_snapshot ->> 'handoffPayload' = 'unchanged'
  )
);

alter table public.comment_translator_real_comments_feed_snapshots enable row level security;

revoke all on table public.comment_translator_real_comments_feed_snapshots from anon;
revoke all on table public.comment_translator_real_comments_feed_snapshots from authenticated;
grant all on table public.comment_translator_real_comments_feed_snapshots to service_role;

drop policy if exists "comment_translator_real_comments_feed_snapshots_service_role_all"
  on public.comment_translator_real_comments_feed_snapshots;
create policy "comment_translator_real_comments_feed_snapshots_service_role_all"
  on public.comment_translator_real_comments_feed_snapshots
  for all
  to service_role
  using (true)
  with check (true);

create unique index if not exists comment_translator_real_comments_feed_snapshots_session_key
  on public.comment_translator_real_comments_feed_snapshots (session_reference_id);

create index if not exists comment_translator_real_comments_feed_snapshots_owner_session_idx
  on public.comment_translator_real_comments_feed_snapshots (owner_user_id, session_reference_id);

comment on table public.comment_translator_real_comments_feed_snapshots is
  'Server-owned Kuro Live Comment Translator safe feed snapshots scoped to an active session. Service-role only.';
comment on column public.comment_translator_real_comments_feed_snapshots.owner_user_id is
  'Server-only owner binding for authorization. The value is never browser-readable.';
comment on column public.comment_translator_real_comments_feed_snapshots.session_reference_id is
  'Opaque Comment Translator session reference used to bind safe feed rows to the active session.';
comment on column public.comment_translator_real_comments_feed_snapshots.feed_snapshot is
  'Browser-safe feed JSON only; no raw provider payloads, raw comments, provider target metadata, liveChatId, cursor, or author channel material.';
