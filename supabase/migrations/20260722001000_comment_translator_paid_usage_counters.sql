create table if not exists public.comment_translator_paid_usage_counters (
  billing_user_reference_id text primary key
    references public.comment_translator_paid_entitlements (billing_user_reference_id) on delete cascade,
  current_period_end timestamptz not null,
  reset_evidence_created_at timestamptz not null,
  translated_message_count bigint not null default 0 check (translated_message_count >= 0),
  provider_input_character_count bigint not null default 0 check (provider_input_character_count >= 0),
  estimated_cost_micros bigint not null default 0 check (estimated_cost_micros >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  constraint comment_translator_paid_usage_counter_period_check check (
    reset_evidence_created_at < current_period_end
  )
);

create table if not exists public.comment_translator_paid_usage_events (
  usage_event_reference_id text primary key,
  billing_user_reference_id text not null
    references public.comment_translator_paid_usage_counters (billing_user_reference_id) on delete cascade,
  current_period_end timestamptz not null,
  occurred_at timestamptz not null,
  translated_message_count bigint not null check (translated_message_count >= 0),
  provider_input_character_count bigint not null check (provider_input_character_count >= 0),
  estimated_cost_micros bigint not null check (estimated_cost_micros >= 0),
  created_at timestamptz not null default now(),
  constraint comment_translator_paid_usage_event_reference_check check (
    usage_event_reference_id ~ '^ctpue_[a-f0-9]{24}$'
  )
);

alter table public.comment_translator_paid_usage_counters enable row level security;
alter table public.comment_translator_paid_usage_events enable row level security;

revoke all on table public.comment_translator_paid_usage_counters from anon;
revoke all on table public.comment_translator_paid_usage_counters from authenticated;
revoke all on table public.comment_translator_paid_usage_events from anon;
revoke all on table public.comment_translator_paid_usage_events from authenticated;
grant all on table public.comment_translator_paid_usage_counters to service_role;
grant all on table public.comment_translator_paid_usage_events to service_role;

drop policy if exists "comment_translator_paid_usage_counters_service_role_all"
  on public.comment_translator_paid_usage_counters;
create policy "comment_translator_paid_usage_counters_service_role_all"
  on public.comment_translator_paid_usage_counters
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "comment_translator_paid_usage_events_service_role_all"
  on public.comment_translator_paid_usage_events;
create policy "comment_translator_paid_usage_events_service_role_all"
  on public.comment_translator_paid_usage_events
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.sync_comment_translator_paid_usage_from_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.evidence_source = 'signed-stripe-webhook'
    and new.billing_state = 'paid-active'
    and new.current_period_end is not null
    and new.current_period_end > new.evidence_created_at then
    insert into public.comment_translator_paid_usage_counters (
      billing_user_reference_id,
      current_period_end,
      reset_evidence_created_at,
      translated_message_count,
      provider_input_character_count,
      estimated_cost_micros,
      updated_at
    ) values (
      new.billing_user_reference_id,
      new.current_period_end,
      new.evidence_created_at,
      0,
      0,
      0,
      new.evidence_recorded_at
    )
    on conflict (billing_user_reference_id) do update set
      current_period_end = case
        when excluded.current_period_end > comment_translator_paid_usage_counters.current_period_end
          then excluded.current_period_end
        else comment_translator_paid_usage_counters.current_period_end
      end,
      reset_evidence_created_at = case
        when excluded.current_period_end > comment_translator_paid_usage_counters.current_period_end
          then excluded.reset_evidence_created_at
        else comment_translator_paid_usage_counters.reset_evidence_created_at
      end,
      translated_message_count = case
        when excluded.current_period_end > comment_translator_paid_usage_counters.current_period_end then 0
        else comment_translator_paid_usage_counters.translated_message_count
      end,
      provider_input_character_count = case
        when excluded.current_period_end > comment_translator_paid_usage_counters.current_period_end then 0
        else comment_translator_paid_usage_counters.provider_input_character_count
      end,
      estimated_cost_micros = case
        when excluded.current_period_end > comment_translator_paid_usage_counters.current_period_end then 0
        else comment_translator_paid_usage_counters.estimated_cost_micros
      end,
      updated_at = excluded.updated_at
    where excluded.current_period_end >= comment_translator_paid_usage_counters.current_period_end;
  end if;

  return new;
end;
$$;

drop trigger if exists comment_translator_paid_usage_sync_from_entitlement
  on public.comment_translator_paid_entitlements;
create trigger comment_translator_paid_usage_sync_from_entitlement
  after insert or update of billing_state, current_period_end, evidence_created_at, evidence_recorded_at
  on public.comment_translator_paid_entitlements
  for each row
  execute function public.sync_comment_translator_paid_usage_from_entitlement();

insert into public.comment_translator_paid_usage_counters (
  billing_user_reference_id,
  current_period_end,
  reset_evidence_created_at,
  translated_message_count,
  provider_input_character_count,
  estimated_cost_micros,
  updated_at
)
select
  billing_user_reference_id,
  current_period_end,
  evidence_created_at,
  0,
  0,
  0,
  evidence_recorded_at
from public.comment_translator_paid_entitlements where evidence_source = 'signed-stripe-webhook'
  and billing_state = 'paid-active'
  and current_period_end is not null
  and current_period_end > now()
  and evidence_created_at < current_period_end
on conflict (billing_user_reference_id) do nothing;

create or replace function public.apply_comment_translator_paid_usage(
  p_billing_user_reference_id text,
  p_expected_period_end timestamptz,
  p_usage_event_reference_id text,
  p_occurred_at timestamptz,
  p_translated_message_count bigint,
  p_provider_input_character_count bigint,
  p_estimated_cost_micros bigint
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  entitlement_row public.comment_translator_paid_entitlements%rowtype;
  counter_row public.comment_translator_paid_usage_counters%rowtype;
  changed_rows integer;
begin
  select * into entitlement_row
  from public.comment_translator_paid_entitlements
  where billing_user_reference_id = p_billing_user_reference_id
  for share;

  if not found
    or entitlement_row.evidence_source <> 'signed-stripe-webhook'
    or entitlement_row.billing_state <> 'paid-active'
    or entitlement_row.current_period_end is null
    or entitlement_row.current_period_end <= now() then
    return 'rejected-paid-inactive';
  end if;

  if entitlement_row.current_period_end <> p_expected_period_end then
    return 'rejected-stale-period';
  end if;

  select * into counter_row
  from public.comment_translator_paid_usage_counters
  where billing_user_reference_id = p_billing_user_reference_id
  for update;

  if not found then
    return 'rejected-missing-counter';
  end if;

  if counter_row.current_period_end <> p_expected_period_end
    or p_occurred_at < counter_row.reset_evidence_created_at
    or p_occurred_at >= counter_row.current_period_end
    or p_occurred_at > now() then
    return 'rejected-stale-period';
  end if;

  insert into public.comment_translator_paid_usage_events (
    usage_event_reference_id,
    billing_user_reference_id,
    current_period_end,
    occurred_at,
    translated_message_count,
    provider_input_character_count,
    estimated_cost_micros
  ) values (
    p_usage_event_reference_id,
    p_billing_user_reference_id,
    p_expected_period_end,
    p_occurred_at,
    greatest(0, p_translated_message_count),
    greatest(0, p_provider_input_character_count),
    greatest(0, p_estimated_cost_micros)
  )
  on conflict (usage_event_reference_id) do nothing;

  get diagnostics changed_rows = row_count;
  if changed_rows = 0 then
    return 'ignored-replay';
  end if;

  update public.comment_translator_paid_usage_counters set
    translated_message_count = comment_translator_paid_usage_counters.translated_message_count
      + greatest(0, p_translated_message_count),
    provider_input_character_count = comment_translator_paid_usage_counters.provider_input_character_count
      + greatest(0, p_provider_input_character_count),
    estimated_cost_micros = comment_translator_paid_usage_counters.estimated_cost_micros
      + greatest(0, p_estimated_cost_micros),
    updated_at = now()
  where billing_user_reference_id = p_billing_user_reference_id
    and current_period_end = p_expected_period_end;

  get diagnostics changed_rows = row_count;
  if changed_rows = 0 then
    raise exception 'paid usage counter disappeared during atomic update';
  end if;

  return 'applied';
end;
$$;

revoke all on function public.sync_comment_translator_paid_usage_from_entitlement() from public, anon, authenticated;
revoke all on function public.apply_comment_translator_paid_usage(
  text, timestamptz, text, timestamptz, bigint, bigint, bigint
) from public, anon, authenticated;
grant execute on function public.apply_comment_translator_paid_usage(
  text, timestamptz, text, timestamptz, bigint, bigint, bigint
) to service_role;

comment on table public.comment_translator_paid_usage_counters is
  'Server-owned paid usage counters reset only when signed paid-active entitlement evidence advances current_period_end.';
comment on table public.comment_translator_paid_usage_events is
  'Private deduplication ledger for atomic paid usage updates. Never browser or operator output.';
comment on function public.apply_comment_translator_paid_usage(
  text, timestamptz, text, timestamptz, bigint, bigint, bigint
) is 'Atomically gates, deduplicates, and counts paid usage against the current signed entitlement period.';
