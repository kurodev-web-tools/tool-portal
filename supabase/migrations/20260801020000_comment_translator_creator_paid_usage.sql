-- Reviewable local migration only. No remote apply, provider execution, paid
-- activation, or production read/write is authorized by this file.

create table if not exists public.comment_translator_creator_paid_usage_events (
  usage_event_reference text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_id uuid not null references public.comment_translator_creator_paid_entitlements(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  provider_input_character_count bigint not null check (provider_input_character_count >= 0),
  translated_character_count bigint not null check (translated_character_count >= 0),
  recorded_at timestamptz not null default now(),
  constraint comment_translator_creator_paid_usage_events_period_order check (period_end > period_start),
  constraint comment_translator_creator_paid_usage_events_reference_nonempty check (
    usage_event_reference = trim(usage_event_reference)
    and length(usage_event_reference) between 1 and 255
  )
);

create table if not exists public.comment_translator_creator_paid_usage_period_counters (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_id uuid not null references public.comment_translator_creator_paid_entitlements(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  provider_execution_count bigint not null default 0 check (provider_execution_count >= 0),
  provider_input_character_count bigint not null default 0 check (provider_input_character_count >= 0),
  translated_character_count bigint not null default 0 check (translated_character_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, entitlement_id, period_start, period_end),
  constraint comment_translator_creator_paid_usage_period_counters_period_order check (period_end > period_start)
);

alter table public.comment_translator_creator_paid_usage_events enable row level security;
alter table public.comment_translator_creator_paid_usage_period_counters enable row level security;

revoke all on table public.comment_translator_creator_paid_usage_events from anon;
revoke all on table public.comment_translator_creator_paid_usage_events from authenticated;
revoke all on table public.comment_translator_creator_paid_usage_events from service_role;
revoke all on table public.comment_translator_creator_paid_usage_period_counters from anon;
revoke all on table public.comment_translator_creator_paid_usage_period_counters from authenticated;
revoke all on table public.comment_translator_creator_paid_usage_period_counters from service_role;

drop policy if exists "comment_translator_creator_paid_usage_events_service_role_all"
  on public.comment_translator_creator_paid_usage_events;
create policy "comment_translator_creator_paid_usage_events_service_role_all"
  on public.comment_translator_creator_paid_usage_events
  for all to service_role using (true) with check (true);

drop policy if exists "comment_translator_creator_paid_usage_period_counters_service_role_all"
  on public.comment_translator_creator_paid_usage_period_counters;
create policy "comment_translator_creator_paid_usage_period_counters_service_role_all"
  on public.comment_translator_creator_paid_usage_period_counters
  for all to service_role using (true) with check (true);

create index if not exists comment_translator_creator_paid_usage_events_owner_period_idx
  on public.comment_translator_creator_paid_usage_events (owner_user_id, period_start, recorded_at desc);

create or replace function public.record_comment_translator_creator_paid_usage(
  p_owner_user_id uuid,
  p_entitlement_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_usage_event_reference text,
  p_provider_executed boolean,
  p_cache_hit boolean,
  p_provider_input_character_count bigint,
  p_translated_character_count bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_entitlement public.comment_translator_creator_paid_entitlements%rowtype;
  inserted_event_reference text;
  recorded_provider_execution_count bigint;
  recorded_provider_input_character_count bigint;
  recorded_translated_character_count bigint;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;

  if p_provider_executed is not true then
    return jsonb_build_object('status', 'rejected', 'reason', 'provider-not-executed');
  end if;

  if p_cache_hit is true then
    return jsonb_build_object('status', 'rejected', 'reason', 'cache-hit-excluded');
  end if;

  if p_owner_user_id is null
    or p_entitlement_id is null
    or p_period_start is null
    or p_period_end is null
    or p_period_end <= p_period_start
    or length(trim(coalesce(p_usage_event_reference, ''))) = 0
    or p_usage_event_reference <> trim(p_usage_event_reference)
    or length(p_usage_event_reference) > 255
    or p_provider_input_character_count is null
    or p_provider_input_character_count < 0
    or p_translated_character_count is null
    or p_translated_character_count < 0 then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed-usage');
  end if;

  select *
  into existing_entitlement
  from public.comment_translator_creator_paid_entitlements
  where id = p_entitlement_id
    and owner_user_id = p_owner_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'rejected', 'reason', 'entitlement-missing');
  end if;

  if existing_entitlement.status is distinct from 'active'
    or existing_entitlement.plan_key is distinct from 'creator'
    or existing_entitlement.product_compatibility_key is distinct from 'comment_translator_creator_v1'
    or existing_entitlement.price_compatibility_key is distinct from 'creator_monthly_jpy_980_v1' then
    return jsonb_build_object('status', 'rejected', 'reason', 'entitlement-inactive');
  end if;

  if existing_entitlement.period_start is distinct from p_period_start
    or existing_entitlement.period_end is distinct from p_period_end then
    return jsonb_build_object('status', 'rejected', 'reason', 'entitlement-period-mismatch');
  end if;

  if existing_entitlement.period_end <= now() then
    return jsonb_build_object('status', 'rejected', 'reason', 'entitlement-stale');
  end if;

  insert into public.comment_translator_creator_paid_usage_events (
    usage_event_reference,
    owner_user_id,
    entitlement_id,
    period_start,
    period_end,
    provider_input_character_count,
    translated_character_count
  ) values (
    p_usage_event_reference,
    p_owner_user_id,
    p_entitlement_id,
    p_period_start,
    p_period_end,
    p_provider_input_character_count,
    p_translated_character_count
  )
  on conflict (usage_event_reference) do nothing
  returning usage_event_reference into inserted_event_reference;

  if inserted_event_reference is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'duplicate');
  end if;

  insert into public.comment_translator_creator_paid_usage_period_counters (
    owner_user_id,
    entitlement_id,
    period_start,
    period_end,
    provider_execution_count,
    provider_input_character_count,
    translated_character_count
  ) values (
    p_owner_user_id,
    p_entitlement_id,
    p_period_start,
    p_period_end,
    1,
    p_provider_input_character_count,
    p_translated_character_count
  )
  on conflict (owner_user_id, entitlement_id, period_start, period_end) do update set
    provider_execution_count = public.comment_translator_creator_paid_usage_period_counters.provider_execution_count + 1,
    provider_input_character_count = public.comment_translator_creator_paid_usage_period_counters.provider_input_character_count + excluded.provider_input_character_count,
    translated_character_count = public.comment_translator_creator_paid_usage_period_counters.translated_character_count + excluded.translated_character_count,
    updated_at = now()
  returning
    provider_execution_count,
    provider_input_character_count,
    translated_character_count
  into
    recorded_provider_execution_count,
    recorded_provider_input_character_count,
    recorded_translated_character_count;

  return jsonb_build_object(
    'status', 'recorded',
    'provider_execution_count', recorded_provider_execution_count,
    'provider_input_character_count', recorded_provider_input_character_count,
    'translated_character_count', recorded_translated_character_count
  );
end;
$$;

revoke all on function public.record_comment_translator_creator_paid_usage(
  uuid, uuid, timestamptz, timestamptz, text, boolean, boolean, bigint, bigint
) from public;
revoke all on function public.record_comment_translator_creator_paid_usage(
  uuid, uuid, timestamptz, timestamptz, text, boolean, boolean, bigint, bigint
) from anon;
revoke all on function public.record_comment_translator_creator_paid_usage(
  uuid, uuid, timestamptz, timestamptz, text, boolean, boolean, bigint, bigint
) from authenticated;
grant execute on function public.record_comment_translator_creator_paid_usage(
  uuid, uuid, timestamptz, timestamptz, text, boolean, boolean, bigint, bigint
) to service_role;

comment on table public.comment_translator_creator_paid_usage_events is
  'NC-U1 opaque provider-executed usage events. Service-role only and deduplicated atomically.';
comment on table public.comment_translator_creator_paid_usage_period_counters is
  'NC-U1 counts bound only to the current NC-D1 signed entitlement period.';
comment on function public.record_comment_translator_creator_paid_usage(
  uuid, uuid, timestamptz, timestamptz, text, boolean, boolean, bigint, bigint
) is 'Atomic NC-U1 recorder. Rejects cache hits, duplicates, stale or mismatched periods, and ordinary roles.';
