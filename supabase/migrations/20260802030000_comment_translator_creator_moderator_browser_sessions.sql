-- Reviewable local NC-M2 migration only. Remote apply and live moderator access remain unauthorized.

alter table public.comment_translator_creator_moderator_tokens
  add column if not exists redeemed_at timestamptz;

create table if not exists public.comment_translator_creator_moderator_browser_sessions (
  owner_user_id uuid not null,
  session_reference_id text not null references public.comment_translator_sessions(session_reference_id) on delete cascade,
  token_version bigint not null check (token_version > 0),
  capability_digest text not null unique,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id),
  constraint comment_translator_creator_moderator_browser_sessions_capability_digest_valid
    check (capability_digest ~ '^[a-f0-9]{64}$'),
  constraint comment_translator_creator_moderator_browser_sessions_expiry_valid
    check (expires_at > issued_at)
);

alter table public.comment_translator_creator_moderator_browser_sessions enable row level security;

revoke all on table public.comment_translator_creator_moderator_browser_sessions from public, anon, authenticated;
revoke all on table public.comment_translator_creator_moderator_browser_sessions from service_role;

create index if not exists comment_translator_creator_moderator_browser_sessions_session_idx
  on public.comment_translator_creator_moderator_browser_sessions (session_reference_id);

create or replace function public.read_comment_translator_creator_moderator_browser_session(
  p_capability_digest text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  browser_session_row public.comment_translator_creator_moderator_browser_sessions%rowtype;
  token_row public.comment_translator_creator_moderator_tokens%rowtype;
  session_row public.comment_translator_sessions%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'missing');
  end if;
  if p_capability_digest !~ '^[a-f0-9]{64}$' or p_now is null then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into browser_session_row
  from public.comment_translator_creator_moderator_browser_sessions
  where capability_digest = p_capability_digest;
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into session_row
  from public.comment_translator_sessions
  where owner_user_id = browser_session_row.owner_user_id
    and session_reference_id = browser_session_row.session_reference_id
  for share;
  if not found
    or session_row.owner_user_id is distinct from browser_session_row.owner_user_id
    or session_row.session_reference_id is distinct from browser_session_row.session_reference_id
    or session_row.status is distinct from 'active'
    or session_row.started_at is null
    or session_row.last_heartbeat_at is null
    or session_row.last_heartbeat_at < session_row.started_at
    or session_row.started_at > p_now
    or session_row.last_heartbeat_at > p_now
    or p_now - session_row.last_heartbeat_at > interval '45 seconds' then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into token_row
  from public.comment_translator_creator_moderator_tokens
  where owner_user_id = session_row.owner_user_id
    and session_reference_id = session_row.session_reference_id
    and scope = 'moderator-share-read'
  for share;
  if not found
    or token_row.revoked_at is not null
    or token_row.redeemed_at is null
    or token_row.expires_at <= p_now
    or token_row.version <> browser_session_row.token_version
    or token_row.expires_at <> browser_session_row.expires_at then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into browser_session_row
  from public.comment_translator_creator_moderator_browser_sessions
  where capability_digest = p_capability_digest
  for share;
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'owner_user_id', browser_session_row.owner_user_id,
    'session_reference_id', browser_session_row.session_reference_id,
    'token_version', browser_session_row.token_version,
    'capability_digest', browser_session_row.capability_digest,
    'issued_at', browser_session_row.issued_at,
    'expires_at', browser_session_row.expires_at
  );
end;
$$;

create or replace function public.redeem_and_write_comment_translator_creator_moderator_browser_session(
  p_token_digest text,
  p_capability_digest text,
  p_redeemed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_row public.comment_translator_creator_moderator_tokens%rowtype;
  browser_session_row public.comment_translator_creator_moderator_browser_sessions%rowtype;
  session_row public.comment_translator_sessions%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;
  if p_token_digest !~ '^[a-f0-9]{64}$' or p_capability_digest !~ '^[a-f0-9]{64}$'
    or p_redeemed_at is null then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;

  select * into token_row
  from public.comment_translator_creator_moderator_tokens
  where token_digest = p_token_digest and scope = 'moderator-share-read';
  if not found then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;

  select * into session_row
  from public.comment_translator_sessions
  where owner_user_id = token_row.owner_user_id
    and session_reference_id = token_row.session_reference_id
  for share;
  if not found
    or session_row.owner_user_id is distinct from token_row.owner_user_id
    or session_row.session_reference_id is distinct from token_row.session_reference_id
    or session_row.status is distinct from 'active'
    or session_row.started_at is null
    or session_row.last_heartbeat_at is null
    or session_row.last_heartbeat_at < session_row.started_at
    or session_row.started_at > p_redeemed_at
    or session_row.last_heartbeat_at > p_redeemed_at
    or p_redeemed_at - session_row.last_heartbeat_at > interval '45 seconds' then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(token_row.owner_user_id::text || ':moderator-share-browser-session', 0));
  select * into token_row
  from public.comment_translator_creator_moderator_tokens
  where token_digest = p_token_digest and scope = 'moderator-share-read'
  for update;
  if not found or token_row.revoked_at is not null or token_row.expires_at <= p_redeemed_at then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;

  select * into browser_session_row
  from public.comment_translator_creator_moderator_browser_sessions
  where owner_user_id = token_row.owner_user_id
  for update;
  if token_row.redeemed_at is not null
    and (not found or browser_session_row.token_version = token_row.version) then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;

  update public.comment_translator_creator_moderator_tokens
  set redeemed_at = p_redeemed_at, updated_at = p_redeemed_at
  where owner_user_id = token_row.owner_user_id
    and scope = 'moderator-share-read'
    and version = token_row.version
    and token_digest = p_token_digest
    and redeemed_at is not distinct from token_row.redeemed_at;
  if not found then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;

  insert into public.comment_translator_creator_moderator_browser_sessions (
    owner_user_id, session_reference_id, token_version, capability_digest, issued_at, expires_at, updated_at
  ) values (
    token_row.owner_user_id, token_row.session_reference_id, token_row.version, p_capability_digest,
    p_redeemed_at, token_row.expires_at, p_redeemed_at
  ) on conflict (owner_user_id) do update set
    session_reference_id = excluded.session_reference_id,
    token_version = excluded.token_version,
    capability_digest = excluded.capability_digest,
    issued_at = excluded.issued_at,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'status', 'redeemed',
    'owner_user_id', token_row.owner_user_id,
    'session_reference_id', token_row.session_reference_id,
    'token_version', token_row.version,
    'capability_digest', p_capability_digest,
    'issued_at', p_redeemed_at,
    'expires_at', token_row.expires_at
  );
end;
$$;

create or replace function public.read_comment_translator_creator_moderator_token(
  p_owner_user_id uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_row public.comment_translator_creator_moderator_tokens%rowtype;
  session_row public.comment_translator_sessions%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null or p_now is null then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into token_row
  from public.comment_translator_creator_moderator_tokens
  where owner_user_id = p_owner_user_id and scope = 'moderator-share-read';
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into session_row
  from public.comment_translator_sessions
  where owner_user_id = token_row.owner_user_id and session_reference_id = token_row.session_reference_id
  for share;
  if not found
    or session_row.owner_user_id is distinct from token_row.owner_user_id
    or session_row.session_reference_id is distinct from token_row.session_reference_id
    or session_row.status is distinct from 'active'
    or session_row.started_at is null
    or session_row.last_heartbeat_at is null
    or session_row.last_heartbeat_at < session_row.started_at
    or session_row.started_at > p_now
    or session_row.last_heartbeat_at > p_now
    or p_now - session_row.last_heartbeat_at > interval '45 seconds' then
    return jsonb_build_object('status', 'missing');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(token_row.owner_user_id::text || ':moderator-share-read', 0));
  select * into token_row
  from public.comment_translator_creator_moderator_tokens
  where owner_user_id = p_owner_user_id
    and session_reference_id = session_row.session_reference_id
    and scope = 'moderator-share-read'
  for update;
  if not found or token_row.revoked_at is not null or token_row.expires_at <= p_now then
    return jsonb_build_object('status', 'missing');
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'owner_user_id', token_row.owner_user_id,
    'session_reference_id', token_row.session_reference_id,
    'scope', token_row.scope,
    'token_digest', token_row.token_digest,
    'issued_at', token_row.issued_at,
    'expires_at', token_row.expires_at,
    'revoked_at', token_row.revoked_at,
    'redeemed_at', token_row.redeemed_at,
    'version', token_row.version
  );
end;
$$;

create or replace function public.read_comment_translator_creator_moderator_token_by_digest(
  p_token_digest text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_row public.comment_translator_creator_moderator_tokens%rowtype;
  session_row public.comment_translator_sessions%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'missing');
  end if;
  if p_token_digest !~ '^[a-f0-9]{64}$' or p_now is null then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into token_row
  from public.comment_translator_creator_moderator_tokens
  where token_digest = p_token_digest and scope = 'moderator-share-read';
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into session_row
  from public.comment_translator_sessions
  where owner_user_id = token_row.owner_user_id and session_reference_id = token_row.session_reference_id
  for share;
  if not found
    or session_row.owner_user_id is distinct from token_row.owner_user_id
    or session_row.session_reference_id is distinct from token_row.session_reference_id
    or session_row.status is distinct from 'active'
    or session_row.started_at is null
    or session_row.last_heartbeat_at is null
    or session_row.last_heartbeat_at < session_row.started_at
    or session_row.started_at > p_now
    or session_row.last_heartbeat_at > p_now
    or p_now - session_row.last_heartbeat_at > interval '45 seconds' then
    return jsonb_build_object('status', 'missing');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(token_row.owner_user_id::text || ':moderator-share-read', 0));
  select * into token_row
  from public.comment_translator_creator_moderator_tokens
  where owner_user_id = session_row.owner_user_id
    and session_reference_id = session_row.session_reference_id
    and scope = 'moderator-share-read'
    and token_digest = p_token_digest
  for update;
  if not found or token_row.revoked_at is not null or token_row.expires_at <= p_now then
    return jsonb_build_object('status', 'missing');
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'owner_user_id', token_row.owner_user_id,
    'session_reference_id', token_row.session_reference_id,
    'scope', token_row.scope,
    'token_digest', token_row.token_digest,
    'issued_at', token_row.issued_at,
    'expires_at', token_row.expires_at,
    'revoked_at', token_row.revoked_at,
    'redeemed_at', token_row.redeemed_at,
    'version', token_row.version
  );
end;
$$;

create or replace function public.issue_comment_translator_creator_moderator_token(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_scope text,
  p_token_digest text,
  p_issued_at timestamptz,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_row public.comment_translator_creator_moderator_tokens%rowtype;
  session_row public.comment_translator_sessions%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null or nullif(trim(coalesce(p_session_reference_id, '')), '') is null
    or p_scope is distinct from 'moderator-share-read' or p_token_digest !~ '^[a-f0-9]{64}$'
    or p_issued_at is null or p_expires_at is null or p_expires_at <= p_issued_at then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed');
  end if;

  select * into session_row
  from public.comment_translator_sessions
  where owner_user_id = p_owner_user_id and session_reference_id = p_session_reference_id
  for share;
  if not found
    or session_row.owner_user_id is distinct from p_owner_user_id
    or session_row.session_reference_id is distinct from p_session_reference_id
    or session_row.status is distinct from 'active'
    or session_row.started_at is null
    or session_row.last_heartbeat_at is null
    or session_row.last_heartbeat_at < session_row.started_at
    or session_row.started_at > p_issued_at
    or session_row.last_heartbeat_at > p_issued_at
    or p_issued_at - session_row.last_heartbeat_at > interval '45 seconds' then
    return jsonb_build_object('status', 'rejected', 'reason', 'session-mismatch');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':moderator-share-read', 0));
  select * into token_row
  from public.comment_translator_creator_moderator_tokens
  where owner_user_id = p_owner_user_id and scope = 'moderator-share-read'
  for update;
  if found and token_row.revoked_at is null and token_row.expires_at > p_issued_at
    and token_row.session_reference_id = p_session_reference_id then
    return jsonb_build_object('status', 'rejected', 'reason', 'current-token-exists');
  end if;

  insert into public.comment_translator_creator_moderator_tokens (
    owner_user_id, session_reference_id, scope, token_digest, issued_at, expires_at, revoked_at, redeemed_at, version, updated_at
  ) values (
    p_owner_user_id, p_session_reference_id, 'moderator-share-read', p_token_digest, p_issued_at, p_expires_at, null, null, 1, p_issued_at
  ) on conflict (owner_user_id, scope) do update set
    session_reference_id = excluded.session_reference_id,
    token_digest = excluded.token_digest,
    issued_at = excluded.issued_at,
    expires_at = excluded.expires_at,
    revoked_at = null,
    redeemed_at = null,
    version = public.comment_translator_creator_moderator_tokens.version + 1,
    updated_at = excluded.updated_at;

  return jsonb_build_object('status', 'applied');
end;
$$;

revoke all on function public.read_comment_translator_creator_moderator_browser_session(text, timestamptz) from public, anon, authenticated;
revoke all on function public.redeem_and_write_comment_translator_creator_moderator_browser_session(
  text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.read_comment_translator_creator_moderator_browser_session(text, timestamptz) to service_role;
grant execute on function public.redeem_and_write_comment_translator_creator_moderator_browser_session(
  text, text, timestamptz
) to service_role;

comment on table public.comment_translator_creator_moderator_browser_sessions is
  'NC-M2 owner/session/token-version-bound moderator browser capabilities. Stores SHA-256 capability digests only.';
