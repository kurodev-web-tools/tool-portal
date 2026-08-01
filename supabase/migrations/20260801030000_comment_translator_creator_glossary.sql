-- Reviewable local NC-C1 migration only. Remote apply and production wiring are not authorized.

create table if not exists public.comment_translator_creator_glossary_states (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null check (version > 0),
  effective_version text not null check (effective_version = trim(effective_version) and length(effective_version) between 1 and 80),
  term_count integer not null check (term_count between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_translator_creator_glossary_entries (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  language_scope text not null,
  normalized_term text not null,
  term text not null,
  replacement text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, language_scope, normalized_term),
  constraint comment_translator_creator_glossary_entries_term_valid check (
    term = trim(term) and length(term) between 1 and 100
  ),
  constraint comment_translator_creator_glossary_entries_replacement_valid check (
    replacement = trim(replacement) and length(replacement) between 1 and 200
  ),
  constraint comment_translator_creator_glossary_entries_note_valid check (
    note is null or (note = trim(note) and length(note) <= 500)
  ),
  constraint comment_translator_creator_glossary_entries_language_valid check (
    language_scope = '*' or language_scope ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'
  )
);

alter table public.comment_translator_creator_glossary_states enable row level security;
alter table public.comment_translator_creator_glossary_entries enable row level security;

revoke all on table public.comment_translator_creator_glossary_states from anon;
revoke all on table public.comment_translator_creator_glossary_states from authenticated;
revoke all on table public.comment_translator_creator_glossary_states from service_role;
revoke all on table public.comment_translator_creator_glossary_entries from anon;
revoke all on table public.comment_translator_creator_glossary_entries from authenticated;
revoke all on table public.comment_translator_creator_glossary_entries from service_role;

create or replace function public.read_comment_translator_creator_glossary(p_owner_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  glossary_state public.comment_translator_creator_glossary_states%rowtype;
  glossary_entries jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed');
  end if;

  select * into glossary_state
  from public.comment_translator_creator_glossary_states
  where owner_user_id = p_owner_user_id;

  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'term', term,
        'replacement', replacement,
        'note', note,
        'language_scope', language_scope,
        'normalized_term', normalized_term
      ) order by language_scope, normalized_term
    ),
    '[]'::jsonb
  ) into glossary_entries
  from public.comment_translator_creator_glossary_entries
  where owner_user_id = p_owner_user_id;

  if jsonb_array_length(glossary_entries) <> glossary_state.term_count then
    return jsonb_build_object('status', 'rejected', 'reason', 'unreadable');
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'version', glossary_state.version,
    'effective_version', glossary_state.effective_version,
    'term_count', glossary_state.term_count,
    'entries', glossary_entries
  );
end;
$$;

create or replace function public.replace_comment_translator_creator_glossary(
  p_owner_user_id uuid,
  p_expected_version bigint,
  p_entries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  glossary_state public.comment_translator_creator_glossary_states%rowtype;
  next_version bigint;
  next_effective_version text;
  next_term_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null or p_expected_version is null or p_expected_version < 0
    or p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed');
  end if;
  if jsonb_array_length(p_entries) > 30 then
    return jsonb_build_object('status', 'rejected', 'reason', 'term-limit-exceeded');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text, 0));

  if exists (
    select 1 from jsonb_array_elements(p_entries) entry
    where jsonb_typeof(entry) <> 'object'
      or nullif(trim(entry->>'term'), '') is null
      or length(normalize(trim(entry->>'term'), NFKC)) > 100
      or nullif(trim(entry->>'replacement'), '') is null
      or length(normalize(trim(entry->>'replacement'), NFKC)) > 200
      or (entry ? 'note' and entry->>'note' is not null and length(normalize(trim(entry->>'note'), NFKC)) > 500)
      or nullif(trim(entry->>'language_scope'), '') is null
      or lower(replace(normalize(trim(entry->>'language_scope'), NFKC), '_', '-')) !~ '^([a-z]{2,3}(-[a-z0-9]{2,8})*|\*)$'
  ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed');
  end if;

  if (
    select count(*) from jsonb_array_elements(p_entries)
  ) <> (
    select count(distinct jsonb_build_array(
      lower(replace(normalize(trim(entry->>'language_scope'), NFKC), '_', '-')),
      lower(normalize(regexp_replace(trim(entry->>'term'), '\s+', ' ', 'g'), NFKC))
    )) from jsonb_array_elements(p_entries) entry
  ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'normalized-term-collision');
  end if;

  select * into glossary_state
  from public.comment_translator_creator_glossary_states
  where owner_user_id = p_owner_user_id
  for update;

  if found and glossary_state.version <> p_expected_version then
    return jsonb_build_object('status', 'rejected', 'reason', 'expected-version-stale');
  end if;
  if not found and p_expected_version <> 0 then
    return jsonb_build_object('status', 'rejected', 'reason', 'expected-version-stale');
  end if;

  next_version := coalesce(glossary_state.version, 0) + 1;
  next_term_count := jsonb_array_length(p_entries);
  select 'glossary-' || md5(coalesce(jsonb_agg(
    jsonb_build_object(
      'language_scope', lower(replace(normalize(trim(entry->>'language_scope'), NFKC), '_', '-')),
      'term', normalize(regexp_replace(trim(entry->>'term'), '\s+', ' ', 'g'), NFKC),
      'replacement', normalize(regexp_replace(trim(entry->>'replacement'), '\s+', ' ', 'g'), NFKC)
    ) order by
      lower(replace(normalize(trim(entry->>'language_scope'), NFKC), '_', '-')),
      lower(normalize(regexp_replace(trim(entry->>'term'), '\s+', ' ', 'g'), NFKC))
  ), '[]'::jsonb)::text) into next_effective_version
  from jsonb_array_elements(p_entries) entry;

  delete from public.comment_translator_creator_glossary_entries where owner_user_id = p_owner_user_id;
  insert into public.comment_translator_creator_glossary_entries (
    owner_user_id, language_scope, normalized_term, term, replacement, note
  )
  select
    p_owner_user_id,
    lower(replace(normalize(trim(entry->>'language_scope'), NFKC), '_', '-')),
    lower(normalize(regexp_replace(trim(entry->>'term'), '\s+', ' ', 'g'), NFKC)),
    normalize(regexp_replace(trim(entry->>'term'), '\s+', ' ', 'g'), NFKC),
    normalize(regexp_replace(trim(entry->>'replacement'), '\s+', ' ', 'g'), NFKC),
    case when entry->>'note' is null then null else normalize(regexp_replace(trim(entry->>'note'), '\s+', ' ', 'g'), NFKC) end
  from jsonb_array_elements(p_entries) entry;

  insert into public.comment_translator_creator_glossary_states (
    owner_user_id, version, effective_version, term_count
  ) values (
    p_owner_user_id, next_version, next_effective_version, next_term_count
  )
  on conflict (owner_user_id) do update set
    version = excluded.version,
    effective_version = excluded.effective_version,
    term_count = excluded.term_count,
    updated_at = now();

  return jsonb_build_object(
    'status', 'updated',
    'version', next_version,
    'effective_version', next_effective_version,
    'term_count', next_term_count
  );
end;
$$;

revoke all on function public.read_comment_translator_creator_glossary(uuid) from public;
revoke all on function public.read_comment_translator_creator_glossary(uuid) from anon;
revoke all on function public.read_comment_translator_creator_glossary(uuid) from authenticated;
grant execute on function public.read_comment_translator_creator_glossary(uuid) to service_role;

revoke all on function public.replace_comment_translator_creator_glossary(uuid, bigint, jsonb) from public;
revoke all on function public.replace_comment_translator_creator_glossary(uuid, bigint, jsonb) from anon;
revoke all on function public.replace_comment_translator_creator_glossary(uuid, bigint, jsonb) from authenticated;
grant execute on function public.replace_comment_translator_creator_glossary(uuid, bigint, jsonb) to service_role;

comment on table public.comment_translator_creator_glossary_states is
  'NC-C1 owner-scoped optimistic and effective glossary versions. Service-role RPC only.';
comment on table public.comment_translator_creator_glossary_entries is
  'NC-C1 bounded glossary entries. Notes are metadata and must not be forwarded to providers.';
