create table if not exists public.comment_translator_obs_overlay_tokens (
  owner_user_id uuid not null,
  session_reference_id text not null
    references public.comment_translator_sessions (session_reference_id) on delete cascade,
  scope text not null check (scope = 'obs-overlay-read'),
  token_digest text not null unique,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  primary key (owner_user_id, scope),
  constraint comment_translator_obs_overlay_tokens_digest_check check (token_digest ~ '^[a-f0-9]{64}$'),
  constraint comment_translator_obs_overlay_tokens_expiry_check check (expires_at > issued_at),
  constraint comment_translator_obs_overlay_tokens_revocation_check check (revoked_at is null or revoked_at >= issued_at)
);

alter table public.comment_translator_obs_overlay_tokens enable row level security;

revoke all on table public.comment_translator_obs_overlay_tokens from anon;
revoke all on table public.comment_translator_obs_overlay_tokens from authenticated;
grant all on table public.comment_translator_obs_overlay_tokens to service_role;

drop policy if exists "comment_translator_obs_overlay_tokens_service_role_all"
  on public.comment_translator_obs_overlay_tokens;
create policy "comment_translator_obs_overlay_tokens_service_role_all"
  on public.comment_translator_obs_overlay_tokens
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists comment_translator_obs_overlay_tokens_session_idx
  on public.comment_translator_obs_overlay_tokens (session_reference_id);

create or replace function public.write_comment_translator_obs_overlay_token(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_scope text,
  p_token_digest text,
  p_issued_at timestamptz,
  p_expires_at timestamptz,
  p_mode text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.comment_translator_obs_overlay_tokens%rowtype;
begin
  if p_scope <> 'obs-overlay-read'
    or p_mode not in ('issue', 'rotate')
    or p_token_digest !~ '^[a-f0-9]{64}$'
    or p_expires_at <= p_issued_at then
    return 'missing-current-token';
  end if;

  select * into current_row
  from public.comment_translator_obs_overlay_tokens
  where owner_user_id = p_owner_user_id and scope = p_scope
  for update;

  if found then
    if p_mode = 'issue' and current_row.revoked_at is null and current_row.expires_at > p_issued_at then
      return 'current-token-exists';
    end if;
    if p_mode = 'rotate' and (current_row.revoked_at is not null or current_row.expires_at <= p_issued_at) then
      return 'missing-current-token';
    end if;

    update public.comment_translator_obs_overlay_tokens set
      session_reference_id = p_session_reference_id,
      token_digest = p_token_digest,
      issued_at = p_issued_at,
      expires_at = p_expires_at,
      revoked_at = null,
      version = current_row.version + 1,
      updated_at = p_issued_at
    where owner_user_id = p_owner_user_id and scope = p_scope;
    return 'applied';
  end if;

  if p_mode = 'rotate' then
    return 'missing-current-token';
  end if;

  insert into public.comment_translator_obs_overlay_tokens (
    owner_user_id, session_reference_id, scope, token_digest, issued_at, expires_at, revoked_at, version, updated_at
  ) values (
    p_owner_user_id, p_session_reference_id, p_scope, p_token_digest, p_issued_at, p_expires_at, null, 1, p_issued_at
  );
  return 'applied';
end;
$$;

create or replace function public.revoke_comment_translator_obs_overlay_token(
  p_owner_user_id uuid,
  p_scope text,
  p_revoked_at timestamptz
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_rows integer;
begin
  update public.comment_translator_obs_overlay_tokens set
    revoked_at = p_revoked_at,
    updated_at = p_revoked_at
  where owner_user_id = p_owner_user_id
    and scope = p_scope
    and revoked_at is null;

  get diagnostics changed_rows = row_count;
  if changed_rows = 0 then
    return 'missing-token';
  end if;
  return 'revoked';
end;
$$;

revoke all on function public.write_comment_translator_obs_overlay_token(
  uuid, text, text, text, timestamptz, timestamptz, text
) from public, anon, authenticated;
revoke all on function public.revoke_comment_translator_obs_overlay_token(
  uuid, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.write_comment_translator_obs_overlay_token(
  uuid, text, text, text, timestamptz, timestamptz, text
) to service_role;
grant execute on function public.revoke_comment_translator_obs_overlay_token(
  uuid, text, timestamptz
) to service_role;

comment on table public.comment_translator_obs_overlay_tokens is
  'Service-role-only current OBS overlay token authority. Stores one-way token digests only and binds read-only access to an authoritative translator session.';
comment on column public.comment_translator_obs_overlay_tokens.token_digest is
  'SHA-256 digest of the opaque token. Plaintext token values are never persisted.';
