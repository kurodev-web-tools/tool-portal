-- Reviewable local NC-O1 migration only. Remote apply and production wiring are not authorized.

create table if not exists public.comment_translator_creator_obs_tokens (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  session_reference_id text not null references public.comment_translator_sessions(session_reference_id) on delete cascade,
  scope text not null check (scope = 'obs-overlay-read'),
  token_digest text not null unique,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  redeemed_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, scope),
  constraint comment_translator_creator_obs_tokens_digest_valid check (token_digest ~ '^[a-f0-9]{64}$'),
  constraint comment_translator_creator_obs_tokens_expiry_valid check (expires_at > issued_at),
  constraint comment_translator_creator_obs_tokens_revocation_valid check (revoked_at is null or revoked_at >= issued_at),
  constraint comment_translator_creator_obs_tokens_redemption_valid check (redeemed_at is null or redeemed_at >= issued_at)
);

alter table public.comment_translator_creator_obs_tokens enable row level security;

revoke all on table public.comment_translator_creator_obs_tokens from anon;
revoke all on table public.comment_translator_creator_obs_tokens from authenticated;
revoke all on table public.comment_translator_creator_obs_tokens from service_role;

create index if not exists comment_translator_creator_obs_tokens_session_idx
  on public.comment_translator_creator_obs_tokens (session_reference_id);

create or replace function public.read_comment_translator_creator_obs_token(p_owner_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_row public.comment_translator_creator_obs_tokens%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed');
  end if;

  select * into token_row
  from public.comment_translator_creator_obs_tokens
  where owner_user_id = p_owner_user_id and scope = 'obs-overlay-read';
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'owner_user_id', token_row.owner_user_id,
    'session_reference_id', token_row.session_reference_id,
    'token_digest', token_row.token_digest,
    'issued_at', token_row.issued_at,
    'expires_at', token_row.expires_at,
    'revoked_at', token_row.revoked_at,
    'redeemed_at', token_row.redeemed_at,
    'version', token_row.version
  );
end;
$$;

create or replace function public.read_comment_translator_creator_obs_token_by_digest(p_token_digest text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_row public.comment_translator_creator_obs_tokens%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_token_digest !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into token_row
  from public.comment_translator_creator_obs_tokens
  where token_digest = p_token_digest and scope = 'obs-overlay-read';
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'owner_user_id', token_row.owner_user_id,
    'session_reference_id', token_row.session_reference_id,
    'token_digest', token_row.token_digest,
    'issued_at', token_row.issued_at,
    'expires_at', token_row.expires_at,
    'revoked_at', token_row.revoked_at,
    'redeemed_at', token_row.redeemed_at,
    'version', token_row.version
  );
end;
$$;

create or replace function public.issue_or_rotate_comment_translator_creator_obs_token(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_scope text,
  p_token_digest text,
  p_issued_at timestamptz,
  p_expires_at timestamptz,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_row public.comment_translator_creator_obs_tokens%rowtype;
  session_row public.comment_translator_sessions%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null or nullif(trim(coalesce(p_session_reference_id, '')), '') is null
    or p_scope is distinct from 'obs-overlay-read' or p_token_digest !~ '^[a-f0-9]{64}$'
    or p_issued_at is null or p_expires_at is null or p_expires_at <= p_issued_at
    or p_mode not in ('issue', 'rotate') then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed');
  end if;

  select * into session_row
  from public.comment_translator_sessions
  where owner_user_id = p_owner_user_id
    and session_reference_id = p_session_reference_id
  for share;
  if not found or session_row.status <> 'active' then
    return jsonb_build_object('status', 'rejected', 'reason', 'session-mismatch');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':' || p_scope, 0));
  select * into token_row
  from public.comment_translator_creator_obs_tokens
  where owner_user_id = p_owner_user_id and scope = p_scope
  for update;

  if p_mode = 'issue' and found
    and token_row.revoked_at is null and token_row.redeemed_at is null and token_row.expires_at > p_issued_at then
    return jsonb_build_object('status', 'rejected', 'reason', 'current-token-exists');
  end if;
  if p_mode = 'rotate' and (
    not found or token_row.revoked_at is not null or token_row.redeemed_at is not null or token_row.expires_at <= p_issued_at
  ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'current-token-missing');
  end if;

  insert into public.comment_translator_creator_obs_tokens (
    owner_user_id, session_reference_id, scope, token_digest, issued_at, expires_at,
    revoked_at, redeemed_at, version, updated_at
  ) values (
    p_owner_user_id, p_session_reference_id, p_scope, p_token_digest, p_issued_at, p_expires_at,
    null, null, 1, p_issued_at
  )
  on conflict (owner_user_id, scope) do update set
    session_reference_id = excluded.session_reference_id,
    token_digest = excluded.token_digest,
    issued_at = excluded.issued_at,
    expires_at = excluded.expires_at,
    revoked_at = null,
    redeemed_at = null,
    version = public.comment_translator_creator_obs_tokens.version + 1,
    updated_at = excluded.updated_at;

  return jsonb_build_object('status', 'applied');
end;
$$;

create or replace function public.revoke_comment_translator_creator_obs_token(
  p_owner_user_id uuid,
  p_revoked_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_rows integer;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null or p_revoked_at is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed');
  end if;

  update public.comment_translator_creator_obs_tokens
  set revoked_at = p_revoked_at, updated_at = p_revoked_at
  where owner_user_id = p_owner_user_id and scope = 'obs-overlay-read' and revoked_at is null;
  get diagnostics changed_rows = row_count;
  return jsonb_build_object('status', case when changed_rows = 1 then 'revoked' else 'missing' end);
end;
$$;

create or replace function public.redeem_comment_translator_creator_obs_token(
  p_token_digest text,
  p_redeemed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_row public.comment_translator_creator_obs_tokens%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'denied', 'reason', 'service-role-required');
  end if;
  if p_token_digest !~ '^[a-f0-9]{64}$' or p_redeemed_at is null then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;

  select * into token_row
  from public.comment_translator_creator_obs_tokens
  where token_digest = p_token_digest and scope = 'obs-overlay-read'
  for update;
  if not found or token_row.revoked_at is not null or token_row.expires_at <= p_redeemed_at then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;
  if token_row.redeemed_at is not null then
    return jsonb_build_object('status', 'denied', 'reason', 'stale-or-replayed-token');
  end if;
  perform 1
  from public.comment_translator_sessions
  where owner_user_id = token_row.owner_user_id
    and session_reference_id = token_row.session_reference_id
    and status = 'active'
  for share;
  if not found then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid-token');
  end if;

  update public.comment_translator_creator_obs_tokens
  set redeemed_at = p_redeemed_at, updated_at = p_redeemed_at
  where owner_user_id = token_row.owner_user_id and scope = token_row.scope;

  return jsonb_build_object(
    'status', 'redeemed',
    'owner_user_id', token_row.owner_user_id,
    'session_reference_id', token_row.session_reference_id,
    'token_digest', token_row.token_digest,
    'issued_at', token_row.issued_at,
    'expires_at', token_row.expires_at,
    'revoked_at', token_row.revoked_at,
    'redeemed_at', p_redeemed_at,
    'version', token_row.version
  );
end;
$$;

revoke all on function public.read_comment_translator_creator_obs_token(uuid) from public, anon, authenticated;
revoke all on function public.read_comment_translator_creator_obs_token_by_digest(text) from public, anon, authenticated;
revoke all on function public.issue_or_rotate_comment_translator_creator_obs_token(
  uuid, text, text, text, timestamptz, timestamptz, text
) from public, anon, authenticated;
revoke all on function public.revoke_comment_translator_creator_obs_token(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.redeem_comment_translator_creator_obs_token(text, timestamptz) from public, anon, authenticated;

grant execute on function public.read_comment_translator_creator_obs_token(uuid) to service_role;
grant execute on function public.read_comment_translator_creator_obs_token_by_digest(text) to service_role;
grant execute on function public.issue_or_rotate_comment_translator_creator_obs_token(
  uuid, text, text, text, timestamptz, timestamptz, text
) to service_role;
grant execute on function public.revoke_comment_translator_creator_obs_token(uuid, timestamptz) to service_role;
grant execute on function public.redeem_comment_translator_creator_obs_token(text, timestamptz) to service_role;

comment on table public.comment_translator_creator_obs_tokens is
  'NC-O1 owner and session scoped OBS read capability authority. Stores one-way token digests only.';
