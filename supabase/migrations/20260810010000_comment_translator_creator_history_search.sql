-- Reviewable local NC-X2A migration only. Remote application, retention changes,
-- Creator activation, account observation, and live history access remain separately approved.

create extension if not exists pg_trgm;

alter table public.comment_translator_creator_safe_history
  add column if not exists pagination_key uuid not null default gen_random_uuid();

alter table public.comment_translator_creator_safe_history
  add column if not exists search_document text not null default '';

update public.comment_translator_creator_safe_history
set search_document = case
  when moderation_label = 'visible' then lower((
    regexp_replace(
      trim(concat_ws(
        ' ',
        nullif(trim(author_display_name), ''),
        nullif(trim(original_text), ''),
        nullif(trim(translated_text), '')
      )),
      '[[:space:]]+',
      ' ',
      'g'
    )
  ) collate "C")
  else ''
end;

alter table public.comment_translator_creator_safe_history
  alter column pagination_key set default gen_random_uuid();

alter table public.comment_translator_creator_safe_history
  alter column pagination_key set not null;

alter table public.comment_translator_creator_safe_history
  alter column search_document set not null;

drop index if exists public.comment_translator_creator_safe_history_owner_source_published_idx;

create index if not exists comment_translator_creator_safe_history_owner_source_published_idx
  on public.comment_translator_creator_safe_history (owner_user_id, source_published_at desc, pagination_key desc);

create index if not exists comment_translator_creator_safe_history_search_document_trgm_idx
  on public.comment_translator_creator_safe_history using gin (search_document gin_trgm_ops);

create or replace function public.append_comment_translator_creator_safe_history(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_cutoff timestamptz := v_now - interval '7 days';
  v_session public.comment_translator_sessions%rowtype;
  v_entitlement public.comment_translator_creator_paid_entitlements%rowtype;
  v_recorded_count integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null
    or nullif(trim(coalesce(p_session_reference_id, '')), '') is null
    or p_rows is null
    or jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed-request');
  end if;

  select * into v_session
  from public.comment_translator_sessions
  where owner_user_id = p_owner_user_id
    and session_reference_id = p_session_reference_id
  for update;
  if not found
    or v_session.owner_user_id is distinct from p_owner_user_id
    or v_session.session_reference_id is distinct from p_session_reference_id
    or v_session.status is distinct from 'active'
    or v_session.started_at is null
    or v_session.last_heartbeat_at is null
    or v_session.last_heartbeat_at < v_session.started_at
    or v_session.started_at > v_now
    or v_session.last_heartbeat_at > v_now
    or v_now - v_session.last_heartbeat_at > interval '45 seconds' then
    return jsonb_build_object('status', 'rejected', 'reason', 'session-unavailable');
  end if;

  select * into v_entitlement
  from public.comment_translator_creator_paid_entitlements
  where owner_user_id = p_owner_user_id
    and plan_key = 'creator'
    and product_compatibility_key = 'comment_translator_creator_v1'
    and price_compatibility_key = 'creator_monthly_jpy_980_v1'
  for share;
  if not found
    or v_entitlement.status is distinct from 'active'
    or v_entitlement.period_start is null
    or v_entitlement.period_end is null
    or v_entitlement.period_start > v_now
    or v_entitlement.period_end <= v_now then
    return jsonb_build_object('status', 'rejected', 'reason', 'paid-inactive');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':creator-safe-history', 0));
  delete from public.comment_translator_creator_safe_history
  where owner_user_id = p_owner_user_id
    and source_published_at < v_cutoff;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) as item(value)
    where jsonb_typeof(item.value) <> 'object'
  ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed-safe-row');
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_rows) as item(value)
    cross join lateral jsonb_object_keys(item.value) as key(name)
    where key.name not in (
      'message_correlation_digest',
      'source_published_at',
      'source_attribution_label',
      'author_label',
      'author_display_name',
      'original_text',
      'translated_text',
      'translation_status',
      'moderation_label',
      'badge_label',
      'purchase_label'
    )
  ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'safe-field-mismatch');
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as row(
      message_correlation_digest text,
      source_published_at timestamptz,
      source_attribution_label text,
      author_label text,
      author_display_name text,
      original_text text,
      translated_text text,
      translation_status text,
      moderation_label text,
      badge_label text,
      purchase_label text
    )
    where row.message_correlation_digest !~ '^[a-f0-9]{64}$'
      or row.source_published_at is null
      or row.source_published_at > v_now
      or row.source_published_at < v_cutoff
      or row.source_attribution_label is distinct from 'Source: YouTube Live Chat'
      or row.author_label is distinct from 'YouTube viewer'
      or row.translation_status not in (
        'not-run-f9', 'translated-f10', 'skipped-f10-language-policy', 'skipped-f10-non-translatable',
        'provider-unavailable-f10', 'provider-error-f10-recoverable', 'provider-error-f10-terminal', 'skipped-f12-usage-limit'
      )
      or row.moderation_label not in ('visible', 'deleted', 'banned', 'ended', 'system')
      or (row.badge_label is not null and row.badge_label not in ('owner', 'moderator', 'member', 'super-chat', 'super-sticker', 'system'))
      or (row.moderation_label <> 'visible' and (row.original_text is not null or row.translated_text is not null))
  ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'unsafe-safe-row');
  end if;

  insert into public.comment_translator_creator_safe_history (
    owner_user_id,
    session_reference_id,
    message_correlation_digest,
    source_published_at,
    recorded_at,
    source_attribution_label,
    author_label,
    author_display_name,
    original_text,
    translated_text,
    translation_status,
    moderation_label,
    badge_label,
    purchase_label,
    search_document
  )
  select
    p_owner_user_id,
    v_session.session_reference_id,
    row.message_correlation_digest,
    row.source_published_at,
    v_now,
    row.source_attribution_label,
    row.author_label,
    row.author_display_name,
    row.original_text,
    row.translated_text,
    row.translation_status,
    row.moderation_label,
    row.badge_label,
    row.purchase_label,
    case
      when row.moderation_label = 'visible' then lower((
        regexp_replace(
          trim(concat_ws(
            ' ',
            nullif(trim(row.author_display_name), ''),
            nullif(trim(row.original_text), ''),
            nullif(trim(row.translated_text), '')
          )),
          '[[:space:]]+',
          ' ',
          'g'
        )
      ) collate "C")
      else ''
    end
  from jsonb_to_recordset(p_rows) as row(
    message_correlation_digest text,
    source_published_at timestamptz,
    source_attribution_label text,
    author_label text,
    author_display_name text,
    original_text text,
    translated_text text,
    translation_status text,
    moderation_label text,
    badge_label text,
    purchase_label text
  )
  on conflict (owner_user_id, session_reference_id, message_correlation_digest) do update set
    source_published_at = least(
      public.comment_translator_creator_safe_history.source_published_at,
      excluded.source_published_at
    ),
    recorded_at = v_now,
    source_attribution_label = excluded.source_attribution_label,
    author_label = excluded.author_label,
    author_display_name = excluded.author_display_name,
    original_text = case
      when public.comment_translator_creator_safe_history.moderation_label <> 'visible'
        or excluded.moderation_label <> 'visible' then null
      else excluded.original_text
    end,
    translated_text = case
      when public.comment_translator_creator_safe_history.moderation_label <> 'visible'
        or excluded.moderation_label <> 'visible' then null
      else excluded.translated_text
    end,
    translation_status = excluded.translation_status,
    moderation_label = case
      when public.comment_translator_creator_safe_history.moderation_label <> 'visible'
        then public.comment_translator_creator_safe_history.moderation_label
      else excluded.moderation_label
    end,
    badge_label = excluded.badge_label,
    purchase_label = excluded.purchase_label,
    search_document = case
      when public.comment_translator_creator_safe_history.moderation_label <> 'visible'
        or excluded.moderation_label <> 'visible' then ''
      else excluded.search_document
    end;
  get diagnostics v_recorded_count = row_count;

  return jsonb_build_object('status', 'recorded', 'recorded_count', v_recorded_count);
end;
$$;

create or replace function public.search_comment_translator_creator_safe_history(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_query text,
  p_cursor text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_cutoff timestamptz := v_now - interval '7 days';
  v_session public.comment_translator_sessions%rowtype;
  v_entitlement public.comment_translator_creator_paid_entitlements%rowtype;
  v_normalized_query text;
  v_escaped_query text;
  v_cursor jsonb;
  v_cursor_source_published_at timestamptz;
  v_cursor_pagination_key uuid;
  v_rows jsonb;
  v_row_count bigint := 0;
  v_next_source_published_at timestamptz;
  v_next_pagination_key uuid;
  v_next_cursor text := null;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if p_owner_user_id is null
    or nullif(trim(coalesce(p_session_reference_id, '')), '') is null
    or p_query is null
    or (p_cursor is not null and (p_cursor = '' or char_length(p_cursor) > 2048)) then
    return jsonb_build_object('status', 'unavailable');
  end if;
  begin
    perform convert_to(p_query, 'UTF8');
  exception when others then
    return jsonb_build_object('status', 'unavailable');
  end;

  select * into v_session
  from public.comment_translator_sessions
  where owner_user_id = p_owner_user_id
    and session_reference_id = p_session_reference_id
  for update;
  if not found
    or v_session.owner_user_id is distinct from p_owner_user_id
    or v_session.session_reference_id is distinct from p_session_reference_id
    or v_session.status is distinct from 'active'
    or v_session.started_at is null
    or v_session.last_heartbeat_at is null
    or v_session.last_heartbeat_at < v_session.started_at
    or v_session.started_at > v_now
    or v_session.last_heartbeat_at > v_now
    or v_now - v_session.last_heartbeat_at > interval '45 seconds' then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select * into v_entitlement
  from public.comment_translator_creator_paid_entitlements
  where owner_user_id = p_owner_user_id
    and plan_key = 'creator'
    and product_compatibility_key = 'comment_translator_creator_v1'
    and price_compatibility_key = 'creator_monthly_jpy_980_v1'
  for share;
  if not found
    or v_entitlement.status is distinct from 'active'
    or v_entitlement.period_start is null
    or v_entitlement.period_end is null
    or v_entitlement.period_start > v_now
    or v_entitlement.period_end <= v_now then
    return jsonb_build_object('status', 'unavailable');
  end if;

  v_normalized_query := lower((
    regexp_replace(trim(p_query), '[[:space:]]+', ' ', 'g')
  ) collate "C");
  if v_normalized_query <> '' and (
    char_length(v_normalized_query) < 3 or char_length(v_normalized_query) > 64
  ) then
    return jsonb_build_object('status', 'unavailable');
  end if;
  v_escaped_query := replace(replace(replace(v_normalized_query, '\', '\\'), '%', '\%'), '_', '\_');

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':creator-safe-history', 0));
  delete from public.comment_translator_creator_safe_history
  where owner_user_id = p_owner_user_id
    and source_published_at < v_cutoff;

  if p_cursor is not null then
    begin
      v_cursor := convert_from(
        decode(replace(replace(p_cursor, '-', '+'), '_', '/'), 'base64'),
        'UTF8'
      )::jsonb;
    exception when others then
      return jsonb_build_object('status', 'unavailable');
    end;
    if jsonb_typeof(v_cursor) <> 'object'
      or v_cursor->>'version' <> 'nc-x2a-v1'
      or v_cursor->>'owner_digest' <> md5(p_owner_user_id::text || ':creator-safe-history-search-v1')
      or v_cursor->>'query_digest' <> md5(v_normalized_query) then
      return jsonb_build_object('status', 'unavailable');
    end if;
    begin
      v_cursor_source_published_at := (v_cursor->>'source_published_at')::timestamptz;
      v_cursor_pagination_key := (v_cursor->>'pagination_key')::uuid;
    exception when others then
      return jsonb_build_object('status', 'unavailable');
    end;
    if v_cursor_source_published_at is null or v_cursor_pagination_key is null then
      return jsonb_build_object('status', 'unavailable');
    end if;
    if not exists (
      select 1
      from public.comment_translator_creator_safe_history as anchor
      where anchor.owner_user_id = p_owner_user_id
        and anchor.source_published_at = v_cursor_source_published_at
        and anchor.pagination_key = v_cursor_pagination_key
        and anchor.source_published_at >= v_cutoff
        and anchor.source_published_at <= v_now
        and (
          v_normalized_query = ''
          or anchor.search_document like '%' || v_escaped_query || '%' escape '\'
        )
    ) then
      return jsonb_build_object('status', 'unavailable');
    end if;
  end if;

  with bounded as (
    select
      history.recorded_at,
      history.source_published_at,
      history.source_attribution_label,
      history.author_label,
      history.author_display_name,
      history.original_text,
      history.translated_text,
      history.translation_status,
      history.moderation_label,
      history.badge_label,
      history.purchase_label,
      history.pagination_key
    from public.comment_translator_creator_safe_history as history
    where history.owner_user_id = p_owner_user_id
      and history.source_published_at >= v_cutoff
      and history.source_published_at <= v_now
      and (
        v_normalized_query = ''
        or history.search_document like '%' || v_escaped_query || '%' escape '\'
      )
      and (
        p_cursor is null
        or history.source_published_at < v_cursor_source_published_at
        or (
          history.source_published_at = v_cursor_source_published_at
          and history.pagination_key < v_cursor_pagination_key
        )
      )
    order by history.source_published_at desc, history.pagination_key desc
    limit 51
  )
  select
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'recorded_at', rows.recorded_at,
            'source_published_at', rows.source_published_at,
            'source_attribution_label', rows.source_attribution_label,
            'author_label', rows.author_label,
            'author_display_name', rows.author_display_name,
            'original_text', rows.original_text,
            'translated_text', rows.translated_text,
            'translation_status', rows.translation_status,
            'moderation_label', rows.moderation_label,
            'badge_label', rows.badge_label,
            'purchase_label', rows.purchase_label
          )
          order by rows.source_published_at desc, rows.pagination_key desc
        )
        from (select * from bounded order by source_published_at desc, pagination_key desc limit 50) as rows
      ),
      '[]'::jsonb
    ),
    (select count(*) from bounded),
    (select rows.source_published_at from bounded as rows order by rows.source_published_at desc, rows.pagination_key desc offset 49 limit 1),
    (select rows.pagination_key from bounded as rows order by rows.source_published_at desc, rows.pagination_key desc offset 49 limit 1)
  into v_rows, v_row_count, v_next_source_published_at, v_next_pagination_key;

  if v_row_count > 50 then
    v_next_cursor := replace(replace(replace(replace(
      encode(convert_to(jsonb_build_object(
        'version', 'nc-x2a-v1',
        'owner_digest', md5(p_owner_user_id::text || ':creator-safe-history-search-v1'),
        'query_digest', md5(v_normalized_query),
        'source_published_at', v_next_source_published_at,
        'pagination_key', v_next_pagination_key
      )::text, 'UTF8'), 'base64'), '+', '-'), '/', '_'), E'\n', ''), E'\r', '');
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'evaluated_at', v_now,
    'rows', v_rows,
    'next_cursor', v_next_cursor
  );
end;
$$;

revoke all on function public.search_comment_translator_creator_safe_history(uuid, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.search_comment_translator_creator_safe_history(uuid, text, text, text) to service_role;

comment on column public.comment_translator_creator_safe_history.pagination_key is
  'NC-X2A dedicated random stable pagination key; not a domain or authority identifier.';

comment on column public.comment_translator_creator_safe_history.search_document is
  'NC-X2A trusted derived lower-C safe document from author_display_name, original_text, and translated_text; tombstones are empty.';
