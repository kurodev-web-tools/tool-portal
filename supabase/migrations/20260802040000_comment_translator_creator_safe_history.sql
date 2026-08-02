-- Reviewable local NC-H1 migration only. Remote application, retention operation,
-- Creator activation, and any live history access remain separately approved.

create table if not exists public.comment_translator_creator_safe_history (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  session_reference_id text not null references public.comment_translator_sessions(session_reference_id) on delete cascade,
  message_correlation_digest text not null check (message_correlation_digest ~ '^[a-f0-9]{64}$'),
  source_published_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  source_attribution_label text not null check (source_attribution_label = 'Source: YouTube Live Chat'),
  author_label text not null check (author_label = 'YouTube viewer'),
  author_display_name text,
  original_text text,
  translated_text text,
  translation_status text not null check (translation_status in (
    'not-run-f9',
    'translated-f10',
    'skipped-f10-language-policy',
    'skipped-f10-non-translatable',
    'provider-unavailable-f10',
    'provider-error-f10-recoverable',
    'provider-error-f10-terminal',
    'skipped-f12-usage-limit'
  )),
  moderation_label text not null check (moderation_label in ('visible', 'deleted', 'banned', 'ended', 'system')),
  badge_label text check (badge_label is null or badge_label in ('owner', 'moderator', 'member', 'super-chat', 'super-sticker', 'system')),
  purchase_label text,
  created_at timestamptz not null default clock_timestamp(),
  constraint comment_translator_creator_safe_history_tombstone_text_absent check (
    moderation_label = 'visible' or (original_text is null and translated_text is null)
  ),
  unique (owner_user_id, session_reference_id, message_correlation_digest)
);

alter table public.comment_translator_creator_safe_history enable row level security;

revoke all on table public.comment_translator_creator_safe_history from public, anon, authenticated, service_role;

create index if not exists comment_translator_creator_safe_history_owner_source_published_idx
  on public.comment_translator_creator_safe_history (owner_user_id, source_published_at desc);

create index if not exists comment_translator_creator_safe_history_session_source_published_idx
  on public.comment_translator_creator_safe_history (session_reference_id, source_published_at desc);

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
    purchase_label
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
    row.purchase_label
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
    purchase_label = excluded.purchase_label;
  get diagnostics v_recorded_count = row_count;

  return jsonb_build_object('status', 'recorded', 'recorded_count', v_recorded_count);
end;
$$;

create or replace function public.read_comment_translator_creator_safe_history(
  p_owner_user_id uuid,
  p_session_reference_id text
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
  v_rows jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null or nullif(trim(coalesce(p_session_reference_id, '')), '') is null then
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'recorded_at', history.recorded_at,
        'source_published_at', history.source_published_at,
        'source_attribution_label', history.source_attribution_label,
        'author_label', history.author_label,
        'author_display_name', history.author_display_name,
        'original_text', history.original_text,
        'translated_text', history.translated_text,
        'translation_status', history.translation_status,
        'moderation_label', history.moderation_label,
        'badge_label', history.badge_label,
        'purchase_label', history.purchase_label
      ) order by history.recorded_at desc
    ),
    '[]'::jsonb
  ) into v_rows
  from (
    select *
    from public.comment_translator_creator_safe_history
    where owner_user_id = p_owner_user_id
      and source_published_at >= v_cutoff
      and source_published_at <= v_now
    order by source_published_at desc
  ) as history;

  return jsonb_build_object('status', 'ready', 'evaluated_at', v_now, 'rows', v_rows);
end;
$$;

create or replace function public.cleanup_comment_translator_creator_safe_history_for_owner(
  p_owner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removed_count integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;
  if p_owner_user_id is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed-request');
  end if;

  perform 1
  from public.comment_translator_sessions
  where owner_user_id = p_owner_user_id
  order by started_at desc
  for update;
  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':creator-safe-history', 0));

  delete from public.comment_translator_creator_safe_history
  where owner_user_id = p_owner_user_id;
  get diagnostics v_removed_count = row_count;

  return jsonb_build_object('status', 'deleted', 'removed_count', v_removed_count);
end;
$$;

revoke all on function public.append_comment_translator_creator_safe_history(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.read_comment_translator_creator_safe_history(uuid, text) from public, anon, authenticated;
revoke all on function public.cleanup_comment_translator_creator_safe_history_for_owner(uuid) from public, anon, authenticated;

grant execute on function public.append_comment_translator_creator_safe_history(uuid, text, jsonb) to service_role;
grant execute on function public.read_comment_translator_creator_safe_history(uuid, text) to service_role;
grant execute on function public.cleanup_comment_translator_creator_safe_history_for_owner(uuid) to service_role;

comment on table public.comment_translator_creator_safe_history is
  'NC-H1 seven-day Creator safe-history snapshots. Only security-definer service-role RPCs may access rows.';

