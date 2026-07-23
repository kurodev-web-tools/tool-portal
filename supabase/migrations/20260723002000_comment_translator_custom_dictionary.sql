create table if not exists public.comment_translator_custom_dictionary_entries (
  entry_id uuid primary key,
  owner_user_id uuid not null,
  term text not null check (char_length(term) between 1 and 80),
  normalized_term text not null check (char_length(normalized_term) between 1 and 80),
  replacement text not null check (char_length(replacement) between 1 and 120),
  note text check (note is null or char_length(note) <= 240),
  source_language text not null check (source_language in ('ja', 'en', 'ko', 'zh')),
  target_language text not null check (target_language in ('ja', 'en')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (owner_user_id, source_language, target_language, normalized_term),
  constraint comment_translator_custom_dictionary_language_pair_check check (source_language <> target_language)
);

alter table public.comment_translator_custom_dictionary_entries enable row level security;

revoke all on table public.comment_translator_custom_dictionary_entries from anon;
revoke all on table public.comment_translator_custom_dictionary_entries from authenticated;
grant all on table public.comment_translator_custom_dictionary_entries to service_role;

drop policy if exists "comment_translator_custom_dictionary_service_role_all"
  on public.comment_translator_custom_dictionary_entries;
create policy "comment_translator_custom_dictionary_service_role_all"
  on public.comment_translator_custom_dictionary_entries
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists comment_translator_custom_dictionary_owner_idx
  on public.comment_translator_custom_dictionary_entries (owner_user_id, entry_id);

create or replace function public.create_comment_translator_custom_dictionary_entry(
  p_owner_user_id uuid,
  p_entry_id uuid,
  p_term text,
  p_normalized_term text,
  p_replacement text,
  p_note text,
  p_source_language text,
  p_target_language text,
  p_created_at timestamptz,
  p_updated_at timestamptz
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.comment_translator_custom_dictionary_entries%rowtype;
begin
  if char_length(p_term) not between 1 and 80
    or char_length(p_normalized_term) not between 1 and 80
    or char_length(p_replacement) not between 1 and 120
    or (p_note is not null and char_length(p_note) > 240)
    or p_source_language not in ('ja', 'en', 'ko', 'zh')
    or p_target_language not in ('ja', 'en')
    or p_source_language = p_target_language
    or p_updated_at < p_created_at then
    return 'invalid-entry';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text, 0));
  select * into current_row
  from public.comment_translator_custom_dictionary_entries
  where owner_user_id = p_owner_user_id
    and source_language = p_source_language
    and target_language = p_target_language
    and normalized_term = p_normalized_term;
  if found then
    if current_row.replacement = p_replacement then return 'duplicate-entry'; end if;
    return 'conflicting-entry';
  end if;
  if (select count(*) from public.comment_translator_custom_dictionary_entries where owner_user_id = p_owner_user_id) >= 30 then
    return 'term-limit-reached';
  end if;

  insert into public.comment_translator_custom_dictionary_entries (
    entry_id, owner_user_id, term, normalized_term, replacement, note,
    source_language, target_language, created_at, updated_at
  ) values (
    p_entry_id, p_owner_user_id, p_term, p_normalized_term, p_replacement, p_note,
    p_source_language, p_target_language, p_created_at, p_updated_at
  );
  return 'applied';
end;
$$;

create or replace function public.update_comment_translator_custom_dictionary_entry(
  p_owner_user_id uuid,
  p_entry_id uuid,
  p_expected_updated_at timestamptz,
  p_term text,
  p_normalized_term text,
  p_replacement text,
  p_note text,
  p_source_language text,
  p_target_language text,
  p_created_at timestamptz,
  p_updated_at timestamptz
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.comment_translator_custom_dictionary_entries%rowtype;
begin
  if char_length(p_term) not between 1 and 80
    or char_length(p_normalized_term) not between 1 and 80
    or char_length(p_replacement) not between 1 and 120
    or (p_note is not null and char_length(p_note) > 240)
    or p_source_language not in ('ja', 'en', 'ko', 'zh')
    or p_target_language not in ('ja', 'en')
    or p_source_language = p_target_language
    or p_updated_at < p_created_at then
    return 'invalid-entry';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text, 0));
  select * into current_row
  from public.comment_translator_custom_dictionary_entries
  where owner_user_id = p_owner_user_id and entry_id = p_entry_id
  for update;
  if not found then return 'entry-missing'; end if;
  if current_row.updated_at <> p_expected_updated_at then return 'stale-entry'; end if;
  if exists (
    select 1 from public.comment_translator_custom_dictionary_entries
    where owner_user_id = p_owner_user_id and entry_id <> p_entry_id
      and source_language = p_source_language and target_language = p_target_language
      and normalized_term = p_normalized_term
  ) then return 'conflicting-entry'; end if;
  if current_row.term = p_term and current_row.normalized_term = p_normalized_term
    and current_row.replacement = p_replacement and current_row.note is not distinct from p_note
    and current_row.source_language = p_source_language and current_row.target_language = p_target_language then
    return 'unchanged';
  end if;

  update public.comment_translator_custom_dictionary_entries set
    term = p_term,
    normalized_term = p_normalized_term,
    replacement = p_replacement,
    note = p_note,
    source_language = p_source_language,
    target_language = p_target_language,
    updated_at = p_updated_at
  where owner_user_id = p_owner_user_id and entry_id = p_entry_id;
  return 'applied';
end;
$$;

create or replace function public.delete_comment_translator_custom_dictionary_entry(
  p_owner_user_id uuid,
  p_entry_id uuid,
  p_expected_updated_at timestamptz
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.comment_translator_custom_dictionary_entries%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text, 0));
  select * into current_row
  from public.comment_translator_custom_dictionary_entries
  where owner_user_id = p_owner_user_id and entry_id = p_entry_id
  for update;
  if not found then return 'entry-missing'; end if;
  if current_row.updated_at <> p_expected_updated_at then return 'stale-entry'; end if;
  delete from public.comment_translator_custom_dictionary_entries
  where owner_user_id = p_owner_user_id and entry_id = p_entry_id and updated_at = p_expected_updated_at;
  return 'applied';
end;
$$;

revoke all on function public.create_comment_translator_custom_dictionary_entry(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.update_comment_translator_custom_dictionary_entry(
  uuid, uuid, timestamptz, text, text, text, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.delete_comment_translator_custom_dictionary_entry(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_comment_translator_custom_dictionary_entry(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz
) to service_role;
grant execute on function public.update_comment_translator_custom_dictionary_entry(
  uuid, uuid, timestamptz, text, text, text, text, text, text, timestamptz, timestamptz
) to service_role;
grant execute on function public.delete_comment_translator_custom_dictionary_entry(uuid, uuid, timestamptz)
  to service_role;

comment on table public.comment_translator_custom_dictionary_entries is
  'Service-role-only Creator custom dictionary authority. Every read and mutation is owner-scoped.';
