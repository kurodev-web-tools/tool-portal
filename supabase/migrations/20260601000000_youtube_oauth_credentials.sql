-- Kuro Live Comment Translator: YouTube OAuth encrypted credential references.
-- Reviewable migration only. Do not paste OAuth token values, authorization codes,
-- private credentials, or service role key values into this file.

create table if not exists public.youtube_oauth_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  credential_reference_id text not null,
  provider text not null default 'youtube' check (provider = 'youtube'),
  provider_channel_id text not null,
  scope_set text[] not null default array['https://www.googleapis.com/auth/youtube.readonly']::text[],
  scope_metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  access_token_ciphertext_ref text not null,
  refresh_token_ciphertext_ref text not null,
  encryption_key_version text not null,
  encryption_key_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youtube_oauth_credentials_reference_nonempty check (length(trim(credential_reference_id)) > 0),
  constraint youtube_oauth_credentials_channel_nonempty check (length(trim(provider_channel_id)) > 0),
  constraint youtube_oauth_credentials_access_ref_nonempty check (length(trim(access_token_ciphertext_ref)) > 0),
  constraint youtube_oauth_credentials_refresh_ref_nonempty check (length(trim(refresh_token_ciphertext_ref)) > 0),
  constraint youtube_oauth_credentials_key_version_nonempty check (length(trim(encryption_key_version)) > 0),
  constraint youtube_oauth_credentials_key_ref_nonempty check (length(trim(encryption_key_ref)) > 0),
  constraint youtube_oauth_credentials_readonly_scope check (
    scope_set <@ array['https://www.googleapis.com/auth/youtube.readonly']::text[]
  )
);

alter table public.youtube_oauth_credentials enable row level security;

revoke all on table public.youtube_oauth_credentials from anon;
revoke all on table public.youtube_oauth_credentials from authenticated;
grant all on table public.youtube_oauth_credentials to service_role;

drop policy if exists "youtube_oauth_credentials_service_role_all" on public.youtube_oauth_credentials;
create policy "youtube_oauth_credentials_service_role_all"
  on public.youtube_oauth_credentials
  for all
  to service_role
  using (true)
  with check (true);

create unique index if not exists youtube_oauth_credentials_reference_key
  on public.youtube_oauth_credentials (credential_reference_id);

create index if not exists youtube_oauth_credentials_owner_lookup_idx
  on public.youtube_oauth_credentials (owner_user_id, provider, provider_channel_id)
  where revoked_at is null;

create index if not exists youtube_oauth_credentials_expiry_idx
  on public.youtube_oauth_credentials (expires_at)
  where revoked_at is null;

comment on table public.youtube_oauth_credentials is
  'Server-owned encrypted YouTube OAuth credential references. Browser clients receive credential_reference_id and sanitized status only; token material, ciphertext, decrypt capability, and service credentials stay trusted-server-only.';

comment on column public.youtube_oauth_credentials.access_token_ciphertext_ref is
  'Reference to encrypted access-token ciphertext managed outside browser-readable state. This is not a token value.';

comment on column public.youtube_oauth_credentials.refresh_token_ciphertext_ref is
  'Reference to encrypted refresh-token ciphertext managed outside browser-readable state. This is not a token value.';

comment on column public.youtube_oauth_credentials.encryption_key_ref is
  'Managed secret or KMS reference name only. Do not store key material in this column.';

comment on column public.youtube_oauth_credentials.encryption_key_version is
  'Key version metadata for rotation, old-key decrypt window review, and re-encrypt follow-up.';

comment on column public.youtube_oauth_credentials.credential_reference_id is
  'Browser-safe opaque reference. Use credential resolution disable before rollback if token resolution is deployed.';

comment on column public.youtube_oauth_credentials.revoked_at is
  'Set before or during disconnect, rollback, or unusable reference invalidation. Keep no token value logging during rollback or investigation.';
