-- Reviewable local NC-M1 migration only. Remote application and production wiring are not authorized.

create table if not exists public.comment_translator_creator_moderator_tokens (
  owner_user_id uuid not null,
  session_reference_id text not null references public.comment_translator_sessions(session_reference_id) on delete cascade,
  scope text not null check (scope = 'moderator-share-read'),
  token_digest text not null unique,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, scope),
  constraint comment_translator_creator_moderator_tokens_digest_valid check (token_digest ~ '^[a-f0-9]{64}$'),
  constraint comment_translator_creator_moderator_tokens_expiry_valid check (expires_at > issued_at),
  constraint comment_translator_creator_moderator_tokens_revocation_valid check (revoked_at is null or revoked_at >= issued_at)
);

alter table public.comment_translator_creator_moderator_tokens enable row level security;

revoke all on table public.comment_translator_creator_moderator_tokens from public, anon, authenticated;
revoke all on table public.comment_translator_creator_moderator_tokens from service_role;

create index if not exists comment_translator_creator_moderator_tokens_session_idx
  on public.comment_translator_creator_moderator_tokens (session_reference_id);

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
    owner_user_id, session_reference_id, scope, token_digest, issued_at, expires_at, revoked_at, version, updated_at
  ) values (
    p_owner_user_id, p_session_reference_id, 'moderator-share-read', p_token_digest, p_issued_at, p_expires_at, null, 1, p_issued_at
  )
  on conflict (owner_user_id, scope) do update set
    session_reference_id = excluded.session_reference_id,
    token_digest = excluded.token_digest,
    issued_at = excluded.issued_at,
    expires_at = excluded.expires_at,
    revoked_at = null,
    version = public.comment_translator_creator_moderator_tokens.version + 1,
    updated_at = excluded.updated_at;

  return jsonb_build_object('status', 'applied');
end;
$$;

create or replace function public.revoke_comment_translator_creator_moderator_token(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_revoked_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.comment_translator_sessions%rowtype;
  changed_rows integer;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null or nullif(trim(coalesce(p_session_reference_id, '')), '') is null or p_revoked_at is null then
    return jsonb_build_object('status', 'missing');
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
    or session_row.started_at > p_revoked_at
    or session_row.last_heartbeat_at > p_revoked_at
    or p_revoked_at - session_row.last_heartbeat_at > interval '45 seconds' then
    return jsonb_build_object('status', 'missing');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':moderator-share-read', 0));
  update public.comment_translator_creator_moderator_tokens
  set revoked_at = p_revoked_at, updated_at = p_revoked_at
  where owner_user_id = p_owner_user_id
    and session_reference_id = p_session_reference_id
    and scope = 'moderator-share-read'
    and revoked_at is null;
  get diagnostics changed_rows = row_count;
  return jsonb_build_object('status', case when changed_rows = 1 then 'revoked' else 'missing' end);
end;
$$;

revoke all on function public.read_comment_translator_creator_moderator_token(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.read_comment_translator_creator_moderator_token_by_digest(text, timestamptz) from public, anon, authenticated;
revoke all on function public.issue_comment_translator_creator_moderator_token(uuid, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.revoke_comment_translator_creator_moderator_token(uuid, text, timestamptz) from public, anon, authenticated;

grant execute on function public.read_comment_translator_creator_moderator_token(uuid, timestamptz) to service_role;
grant execute on function public.read_comment_translator_creator_moderator_token_by_digest(text, timestamptz) to service_role;
grant execute on function public.issue_comment_translator_creator_moderator_token(uuid, text, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.revoke_comment_translator_creator_moderator_token(uuid, text, timestamptz) to service_role;

comment on table public.comment_translator_creator_moderator_tokens is
  'NC-M1 owner and session scoped moderator read authority. Stores one-way token digests only.';
