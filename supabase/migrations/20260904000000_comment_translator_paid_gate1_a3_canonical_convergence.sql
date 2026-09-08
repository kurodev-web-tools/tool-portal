-- A3 convergence: two semantic and 76 observed newline-drift definitions.
-- Final repository declarations are LF; CREATE-only becomes CREATE OR REPLACE.
-- The ACL revokes are the measured safe-security contract deltas only.

create or replace function public.ct_paid_azure_direct_fallback(
  p_attempt_id text,
  p_provider_attempt text,
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_utc_month date,
  p_input_characters bigint,
  p_now timestamptz default now()
)
returns table (reservation_status text, session_lease_token uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_config public.comment_translator_paid_capacity_config%rowtype;
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_openai_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_shared_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_azure public.comment_translator_paid_azure_fallback_buckets%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_openai_slot public.comment_translator_paid_openai_slots%rowtype;
  v_openai_rate public.comment_translator_paid_openai_rate_reservations%rowtype;
  v_owner_cost public.comment_translator_paid_owner_cost_buckets%rowtype;
  v_global_cost public.comment_translator_paid_global_cost_buckets%rowtype;
  v_receipt_count integer;
  v_openai_receipt_count integer;
  v_azure_receipt_count integer;
  v_usage_id uuid;
  v_azure_id uuid;
  v_session_lease_token uuid;
  v_day_physical_total bigint;
  v_free_usage_characters bigint;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if length(trim(p_attempt_id)) = 0
    or length(trim(p_provider_attempt)) = 0
    or length(trim(p_session_reference_id)) = 0
    or p_input_characters <= 0
    or p_input_characters > 7500
  then
    raise exception 'Azure fallback reservation request is not valid';
  end if;

  select *
    into v_attempt
   from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is not null then
    if v_attempt.provider_kind <> 'azure_direct_fallback' then
      raise exception 'attempt provider binding conflict';
    end if;
    if v_attempt.session_reference_id <> p_session_reference_id then
      raise exception 'attempt session binding conflict';
    end if;
    if v_attempt.owner_user_id <> p_owner_user_id then
      raise exception 'attempt owner binding conflict';
    end if;
    if v_attempt.period_start is distinct from p_period_start or v_attempt.period_end is distinct from p_period_end then
      raise exception 'attempt period binding conflict';
    end if;
    if v_attempt.utc_month <> p_utc_month then
      raise exception 'attempt UTC month binding conflict';
    end if;
    if v_attempt.requested_input_characters <> p_input_characters then
      raise exception 'attempt input binding conflict';
    end if;
    if v_attempt.requested_cost_micros <> 0
      or v_attempt.requested_request_count <> 0
      or v_attempt.requested_token_count <> 0
    then
      raise exception 'Azure attempt cost binding conflict';
    end if;
    if v_attempt.attempt_state in ('committed', 'released', 'expired') then
      return query select v_attempt.attempt_state, null::uuid;
      return;
    end if;
    select lease_token
      into v_session_lease_token
      from public.comment_translator_paid_session_leases
     where attempt_id = p_attempt_id
       and owner_user_id = p_owner_user_id
       and session_reference_id = p_session_reference_id
       and lease_state in ('active', 'uncertain')
       and lease_until > p_now
     for update;
    if v_session_lease_token is null then
      raise exception 'active attempt lease binding is unavailable';
    end if;
    return query select v_attempt.attempt_state, v_session_lease_token;
    return;
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is not null then
    if v_logical.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt owner binding conflict';
    end if;
    if v_logical.period_start is distinct from p_period_start or v_logical.period_end is distinct from p_period_end then
      raise exception 'logical attempt period binding conflict';
    end if;
    if p_input_characters > v_logical.input_characters then
      raise exception 'logical attempt input binding conflict';
    end if;
    if v_logical.logical_state <> 'reserved' then
      raise exception 'logical attempt is already settled';
    end if;
  end if;

  perform 1
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
   order by provider_attempt
   for update;
  select count(*)::integer,
         count(*) filter (where provider_kind = 'openai_attempt')::integer,
         count(*) filter (where provider_kind = 'azure_direct_fallback')::integer
    into v_receipt_count, v_openai_receipt_count, v_azure_receipt_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;
  if v_azure_receipt_count > 0
    or v_openai_receipt_count <> v_receipt_count
    or v_openai_receipt_count > 2
  then
    raise exception 'Azure fallback permits no prior Azure and at most two OpenAI receipts';
  end if;

  select *
    into v_openai_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = 'openai'
   for update;
  if v_openai_circuit.provider is null then
    raise exception 'OpenAI circuit state is unavailable';
  end if;
  if v_receipt_count = 0 then
    if v_logical.attempt_id is not null then
      raise exception 'direct Azure logical attempt binding conflict';
    end if;
    if v_openai_circuit.circuit_state <> 'degraded' then
      raise exception 'degraded OpenAI is required for direct Azure';
    end if;
    if v_openai_circuit.last_error_class is null
      or v_openai_circuit.last_error_class not in ('network', 'timeout', 'rate-limit', 'server-error')
    then
      raise exception 'OpenAI failure class does not permit direct Azure fallback';
    end if;
  else
    select *
      into v_lease
      from public.comment_translator_paid_session_leases
     where attempt_id = p_attempt_id
       and session_reference_id = p_session_reference_id
       and owner_user_id = p_owner_user_id
     for update;
    select *
      into v_shared_attempt
      from public.comment_translator_paid_attempt_receipts
     where attempt_id = p_attempt_id
       and provider_kind = 'openai_attempt'
     order by created_at desc, id desc
     limit 1
     for update;
    if v_shared_attempt.id is null then
      raise exception 'Azure fallback requires an OpenAI predecessor';
    end if;
    if v_shared_attempt.provider_failure_class is null
      or v_shared_attempt.provider_failure_class not in ('network', 'timeout', 'rate-limit', 'server-error')
    then
      raise exception 'OpenAI predecessor failure class does not permit Azure fallback';
    end if;
    if v_shared_attempt.owner_user_id <> p_owner_user_id
      or v_shared_attempt.session_reference_id <> p_session_reference_id
      or v_shared_attempt.period_start is distinct from p_period_start
      or v_shared_attempt.period_end is distinct from p_period_end
      or v_shared_attempt.utc_month <> p_utc_month
    then
      raise exception 'Azure fallback OpenAI binding conflict';
    end if;
    -- OpenAI terminal failure -> same batch lease remains active -> different
    -- batch cannot acquire -> Azure fallback succeeds. The immutable receipt
    -- selects the predecessor; the mutable lease only proves current ownership.
    if v_lease.id is null
      or v_lease.provider_attempt is distinct from v_shared_attempt.provider_attempt
      or not (
        v_lease.lease_state = 'released'
        or (
          v_lease.lease_state in ('active', 'uncertain')
          and v_lease.lease_until > p_now
        )
      )
    then
      raise exception 'OpenAI predecessor session lease is not safe for Azure fallback';
    end if;
    select *
      into v_openai_slot
      from public.comment_translator_paid_openai_slots
     where attempt_id = p_attempt_id
       and provider_attempt = v_shared_attempt.provider_attempt
     for update;
    select *
      into v_openai_rate
      from public.comment_translator_paid_openai_rate_reservations
     where attempt_id = p_attempt_id
       and provider_attempt = v_shared_attempt.provider_attempt
     for update;
    if v_openai_receipt_count = 2 then
      if v_shared_attempt.attempt_state not in ('committed', 'released')
        or v_shared_attempt.provider_failure_class not in ('network', 'timeout', 'rate-limit', 'server-error')
      then
        raise exception 'latest OpenAI retry receipt is not safe for Azure fallback';
      end if;
      if exists (
        select 1
          from public.comment_translator_paid_attempt_receipts receipt
         where receipt.attempt_id = p_attempt_id
           and receipt.provider_kind = 'openai_attempt'
           and (
             receipt.owner_user_id <> p_owner_user_id
             or receipt.session_reference_id <> p_session_reference_id
             or receipt.period_start is distinct from p_period_start
             or receipt.period_end is distinct from p_period_end
             or receipt.utc_month <> p_utc_month
             or receipt.attempt_state in ('reserved', 'uncertain', 'expired')
             or receipt.committed_input_characters <> 0
             or (
               receipt.attempt_state = 'committed'
               and (
                 receipt.provider_failure_class is null
                 or receipt.reserved_cost_micros <> 0
                 or receipt.committed_cost_micros <= 0
                 or not exists (
                   select 1
                     from public.comment_translator_paid_openai_slots slot_row
                    where slot_row.attempt_id = receipt.attempt_id
                      and slot_row.provider_attempt = receipt.provider_attempt
                      and slot_row.slot_state = 'released'
                 )
                 or not exists (
                   select 1
                     from public.comment_translator_paid_openai_rate_reservations rate_row
                    where rate_row.attempt_id = receipt.attempt_id
                      and rate_row.provider_attempt = receipt.provider_attempt
                      and rate_row.reservation_state = 'completed'
                 )
               )
             )
             or (
               receipt.attempt_state = 'released'
               and (
                 receipt.provider_failure_class is null
                 or receipt.reserved_cost_micros <> 0
                 or not exists (
                   select 1
                     from public.comment_translator_paid_openai_slots slot_row
                    where slot_row.attempt_id = receipt.attempt_id
                      and slot_row.provider_attempt = receipt.provider_attempt
                      and slot_row.slot_state = 'released'
                 )
                 or not exists (
                   select 1
                     from public.comment_translator_paid_openai_rate_reservations rate_row
                    where rate_row.attempt_id = receipt.attempt_id
                      and rate_row.provider_attempt = receipt.provider_attempt
                      and rate_row.reservation_state = 'released'
                 )
               )
             )
           )
      ) then
        raise exception 'OpenAI retry chain is not safely terminal';
      end if;
    elsif v_shared_attempt.attempt_state = 'uncertain' then
      if v_openai_receipt_count <> 1 then
        raise exception 'uncertain OpenAI fallback permits one OpenAI receipt';
      end if;
      if v_shared_attempt.reserved_cost_micros <= 0
        or v_openai_slot.id is null
        or v_openai_slot.slot_state <> 'uncertain'
        or v_openai_rate.id is null
        or v_openai_rate.reservation_state <> 'uncertain'
        or v_lease.id is null
        or v_lease.lease_state <> 'uncertain'
        or v_lease.lease_until <= p_now
      then
        raise exception 'uncertain OpenAI resources are not retained';
      end if;
    elsif v_shared_attempt.attempt_state = 'released' then
      if v_shared_attempt.reserved_cost_micros <> 0
        or v_openai_slot.id is null
        or v_openai_slot.slot_state <> 'released'
        or v_openai_rate.id is null
        or v_openai_rate.reservation_state <> 'released'
      then
        raise exception 'OpenAI resources are not released';
      end if;
    elsif v_shared_attempt.attempt_state = 'committed'
      and v_shared_attempt.provider_failure_class is not null
    then
      if v_shared_attempt.reserved_cost_micros <> 0
        or v_shared_attempt.committed_cost_micros <= 0
        or v_shared_attempt.committed_input_characters <> 0
        or v_openai_slot.id is null
        or v_openai_slot.slot_state <> 'released'
        or v_openai_rate.id is null
        or v_openai_rate.reservation_state <> 'completed'
      then
        raise exception 'OpenAI reached-failure resources are not safely terminal';
      end if;
    else
      raise exception 'OpenAI predecessor is not safe for Azure fallback';
    end if;
  end if;

  if p_utc_month <> date_trunc('month', p_now at time zone 'UTC')::date then
    raise exception 'UTC month is not current';
  end if;
  perform public.ct_paid_assert_current_utc_month(p_now);

  -- Azure fallback never bypasses the Paid OpenAI safety caps. It does not
  -- reserve OpenAI cost, but it must atomically prove that both cost
  -- authorities are readable and not already exhausted before a Provider
  -- reservation can be created.
  if v_shared_attempt.id is not null then
    if v_shared_attempt.owner_cost_bucket_id is null
      or v_shared_attempt.global_cost_bucket_id is null
    then
      raise exception 'Paid cost authority is unavailable for Azure fallback';
    end if;
    select *
      into v_owner_cost
      from public.comment_translator_paid_owner_cost_buckets
     where id = v_shared_attempt.owner_cost_bucket_id
     for update;
    select *
      into v_global_cost
      from public.comment_translator_paid_global_cost_buckets
     where id = v_shared_attempt.global_cost_bucket_id
     for update;
  else
    insert into public.comment_translator_paid_owner_cost_buckets (
      owner_user_id, period_start, period_end, updated_at
    )
    values (p_owner_user_id, p_period_start, p_period_end, p_now)
    on conflict (owner_user_id, period_start, period_end) do nothing;
    select *
      into v_owner_cost
      from public.comment_translator_paid_owner_cost_buckets
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     for update;

    insert into public.comment_translator_paid_global_cost_buckets (
      utc_month, updated_at
    )
    values (p_utc_month, p_now)
    on conflict (utc_month) do nothing;
    select *
      into v_global_cost
      from public.comment_translator_paid_global_cost_buckets
     where utc_month = p_utc_month
     for update;
  end if;
  if v_owner_cost.id is null
    or v_global_cost.id is null
  then
    raise exception 'Paid cost authority is unavailable for Azure fallback';
  end if;
  if v_owner_cost.period_state <> 'open'
    or v_owner_cost.reserved_cost_micros + v_owner_cost.committed_cost_micros
      >= v_owner_cost.cost_limit_micros
  then
    raise exception 'individual Paid cost limit is exhausted';
  end if;
  if v_global_cost.utc_month <> p_utc_month
    or v_global_cost.bucket_state <> 'open'
    or v_global_cost.reserved_cost_micros + v_global_cost.committed_cost_micros
      >= v_global_cost.cost_limit_micros
  then
    raise exception 'global Paid cost limit is exhausted';
  end if;

  lock table public.comment_translator_usage_ledger_events in share mode;
  select coalesce(sum(translated_character_estimate), 0)::bigint
    into v_free_usage_characters
    from public.comment_translator_usage_ledger_events
   where usage_month = p_utc_month
     and event_type = 'ai-usage-estimated';

  select *
    into v_config
    from public.comment_translator_paid_capacity_config
   where config_key = true
   for update;
  if v_config.config_key is null then
    raise exception 'Azure fallback capacity configuration is unavailable';
  end if;

  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = 'azure_fallback'
   for update;
  if v_circuit.provider is null or v_circuit.circuit_state in ('degraded', 'disabled') then
    raise exception 'Azure fallback circuit is unavailable';
  end if;
  if v_circuit.circuit_state = 'half_open' then
    if v_circuit.probe_attempt_id is not null
      and v_circuit.probe_attempt_id <> p_attempt_id
      and v_circuit.probe_lease_until is not null
      and v_circuit.probe_lease_until > p_now
    then
      raise exception 'Azure fallback circuit probe is already leased';
    end if;
    update public.comment_translator_paid_provider_circuits
       set probe_attempt_id = p_attempt_id,
           probe_lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where provider = 'azure_fallback';
  end if;

  insert into public.comment_translator_paid_azure_fallback_buckets (
    utc_month,
    free_usage_characters,
    updated_at
  )
  values (p_utc_month, v_free_usage_characters, p_now)
  on conflict (utc_month) do nothing;
  select *
    into v_azure
    from public.comment_translator_paid_azure_fallback_buckets
   where utc_month = p_utc_month
   for update;

  if v_azure.free_usage_characters <> v_free_usage_characters then
    update public.comment_translator_paid_azure_fallback_buckets
       set free_usage_characters = greatest(free_usage_characters, v_free_usage_characters),
           updated_at = p_now
     where id = v_azure.id
    returning * into v_azure;
  end if;
  if v_azure.bucket_state <> 'open' then
    raise exception 'Azure fallback month is closed for new reservations';
  end if;

  if v_azure.reserved_paid_characters + v_azure.committed_paid_characters + p_input_characters
    > v_config.azure_logical_limit_characters
  then
    raise exception 'Azure fallback logical character quota is exhausted';
  end if;

  v_day_physical_total := v_azure.free_usage_characters
    + v_azure.reserved_paid_characters
    + v_azure.committed_paid_characters
    + p_input_characters
    + v_config.physical_safety_margin_characters;
  if v_day_physical_total >= v_config.physical_limit_characters then
    raise exception 'Azure fallback physical shared capacity is exhausted';
  end if;

  if v_shared_attempt.id is not null then
    if v_logical.attempt_id is null
      or v_logical.billing_period_usage_id is distinct from v_shared_attempt.billing_period_usage_id
    then
      raise exception 'logical attempt billing period binding conflict';
    end if;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where id = v_logical.billing_period_usage_id
     for update;
    if v_usage.id is null then
      raise exception 'logical attempt billing period bucket is missing';
    end if;
    if v_usage.owner_user_id <> p_owner_user_id
      or v_usage.period_start is distinct from p_period_start
      or v_usage.period_end is distinct from p_period_end
    then
      raise exception 'logical attempt billing period binding conflict';
    end if;
  else
    perform public.ct_paid_assert_current_paid_period(
      p_owner_user_id,
      p_period_start,
      p_period_end,
      p_now
    );
    insert into public.comment_translator_paid_billing_period_usage (
      owner_user_id, period_start, period_end, updated_at
    )
    values (p_owner_user_id, p_period_start, p_period_end, p_now)
    on conflict (owner_user_id, period_start, period_end) do nothing;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     for update;
    if v_usage.period_state <> 'open' then
      raise exception 'billing period is closed for new reservations';
    end if;
    if v_usage.reserved_input_characters + v_usage.committed_input_characters + p_input_characters
      > v_usage.character_limit
    then
      raise exception 'billing period character quota is exhausted';
    end if;
  end if;

  select *
    into v_lease
    from public.comment_translator_paid_session_leases
   where session_reference_id = p_session_reference_id
   for update;
  if v_lease.id is not null
    and v_lease.owner_user_id <> p_owner_user_id
  then
    raise exception 'session owner binding conflict';
  end if;
  if v_lease.id is not null
    and v_lease.lease_state in ('active', 'uncertain')
    and v_lease.lease_until > p_now
    and v_lease.attempt_id <> p_attempt_id
  then
    raise exception 'session has an active provider lease';
  end if;

  v_session_lease_token := case
    when v_lease.id is not null
      and v_lease.lease_state in ('active', 'uncertain')
      and v_lease.lease_until > p_now
      and v_lease.attempt_id = p_attempt_id
    then v_lease.lease_token
    else gen_random_uuid()
  end;
  if v_lease.id is null then
    insert into public.comment_translator_paid_session_leases (
      session_reference_id,
      owner_user_id,
      lease_state,
      provider_attempt,
      lease_until,
      lease_token,
      attempt_id,
      created_at,
      updated_at
    )
    values (
      p_session_reference_id,
      p_owner_user_id,
      'active',
       p_provider_attempt,
      p_now + interval '120 seconds',
      v_session_lease_token,
      p_attempt_id,
      p_now,
      p_now
    );
  elsif v_lease.lease_state in ('active', 'uncertain')
    and v_lease.lease_until > p_now
    and v_lease.attempt_id = p_attempt_id
  then
    update public.comment_translator_paid_session_leases
       set lease_state = 'active',
           provider_attempt = p_provider_attempt,
           lease_until = p_now + interval '120 seconds',
           attempt_id = p_attempt_id,
           updated_at = p_now
     where id = v_lease.id;
  else
    update public.comment_translator_paid_session_leases
       set owner_user_id = p_owner_user_id,
           lease_state = 'active',
            provider_attempt = p_provider_attempt,
           lease_until = p_now + interval '120 seconds',
           lease_token = v_session_lease_token,
           attempt_id = p_attempt_id,
           updated_at = p_now
     where id = v_lease.id;
  end if;

  if v_shared_attempt.id is null then
    update public.comment_translator_paid_billing_period_usage
       set reserved_input_characters = reserved_input_characters + p_input_characters,
           updated_at = p_now
     where id = v_usage.id
    returning id into v_usage_id;
  else
    v_usage_id := v_usage.id;
  end if;

  update public.comment_translator_paid_azure_fallback_buckets
     set reserved_paid_characters = reserved_paid_characters + p_input_characters,
         updated_at = p_now
   where id = v_azure.id
  returning id into v_azure_id;

  insert into public.comment_translator_paid_logical_attempts (
    attempt_id, owner_user_id, billing_period_usage_id, period_start, period_end,
    input_characters, logical_state, expires_at, created_at, updated_at
  )
  values (
    p_attempt_id, p_owner_user_id, v_usage_id, p_period_start, p_period_end,
    p_input_characters, 'reserved', p_now + interval '24 hours', p_now, p_now
  )
  on conflict (attempt_id) do nothing;

  insert into public.comment_translator_paid_attempt_receipts (
    attempt_id,
    provider_attempt,
    provider_kind,
    session_reference_id,
    owner_user_id,
    period_start,
    period_end,
    utc_month,
    attempt_state,
    expires_at,
    billing_period_usage_id,
    azure_bucket_id,
    reserved_input_characters,
    requested_input_characters,
    created_at,
    updated_at
  )
  values (
    p_attempt_id,
    p_provider_attempt,
    'azure_direct_fallback',
    p_session_reference_id,
    p_owner_user_id,
    p_period_start,
    p_period_end,
    p_utc_month,
    'reserved',
    p_now + interval '120 seconds',
    v_usage_id,
    v_azure_id,
    p_input_characters,
    p_input_characters,
    p_now,
    p_now
  );

  return query select 'reserved'::text, v_session_lease_token;
end;
$$;

create or replace function public.ct_paid_record_provider_hourly_detail(
  p_attempt_id text,
  p_provider_attempt text,
  p_source_expires_at timestamptz,
  p_owner_user_id uuid,
  p_provider text,
  p_utc_hour timestamptz,
  p_request_count integer,
  p_session_count integer,
  p_comment_count integer,
  p_input_characters bigint,
  p_output_characters bigint,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_estimated_cost_micros bigint,
  p_success_count integer,
  p_failure_count integer,
  p_latency_up_to_100_ms_count integer,
  p_latency_101_to_250_ms_count integer,
  p_latency_251_to_500_ms_count integer,
  p_latency_501_to_1000_ms_count integer,
  p_latency_1001_to_2500_ms_count integer,
  p_latency_2501_to_5000_ms_count integer,
  p_latency_5001_to_10000_ms_count integer,
  p_latency_over_10000_ms_count integer,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_latency_count integer;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_provider_receipt public.comment_translator_paid_attempt_receipts%rowtype;
  v_source_receipt public.comment_translator_paid_provider_detail_source_receipts%rowtype;
begin
  p_now := statement_timestamp();
  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  select *
    into v_provider_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;

  if v_logical.attempt_id is null
    or v_logical.owner_user_id <> p_owner_user_id
    or v_logical.expires_at <= p_now
    or v_provider_receipt.id is null
    or v_provider_receipt.owner_user_id <> p_owner_user_id
    or v_provider_receipt.provider_kind is distinct from (case
      when p_provider = 'openai' then 'openai_attempt'
      when p_provider = 'azure_fallback' then 'azure_direct_fallback'
      else null
    end)
  then
    raise exception 'provider hourly source authority is not valid';
  end if;

  select *
    into v_source_receipt
    from public.comment_translator_paid_provider_detail_source_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_source_receipt.attempt_id is not null and v_source_receipt.expires_at > p_now then
    return false;
  end if;

  v_latency_count := p_latency_up_to_100_ms_count + p_latency_101_to_250_ms_count
    + p_latency_251_to_500_ms_count + p_latency_501_to_1000_ms_count
    + p_latency_1001_to_2500_ms_count + p_latency_2501_to_5000_ms_count
    + p_latency_5001_to_10000_ms_count + p_latency_over_10000_ms_count;
  if length(trim(p_attempt_id)) = 0
    or length(trim(p_provider_attempt)) = 0
    or p_source_expires_at is distinct from v_provider_receipt.expires_at
    or v_provider_receipt.expires_at <= p_now
    or v_provider_receipt.expires_at > p_now + interval '120 seconds'
    or p_provider not in ('openai', 'azure_fallback')
    or date_trunc('hour', p_utc_hour) <> p_utc_hour
    or p_request_count < 0 or p_session_count < 0 or p_comment_count < 0
    or p_input_characters < 0 or p_output_characters < 0
    or p_input_tokens < 0 or p_output_tokens < 0
    or p_estimated_cost_micros < 0 or p_success_count < 0 or p_failure_count < 0
    or p_latency_up_to_100_ms_count < 0 or p_latency_101_to_250_ms_count < 0
    or p_latency_251_to_500_ms_count < 0 or p_latency_501_to_1000_ms_count < 0
    or p_latency_1001_to_2500_ms_count < 0 or p_latency_2501_to_5000_ms_count < 0
    or p_latency_5001_to_10000_ms_count < 0 or p_latency_over_10000_ms_count < 0
    or v_latency_count > p_request_count
  then
    raise exception 'provider hourly aggregate is not valid';
  end if;

  delete from public.comment_translator_paid_provider_detail_source_receipts
   where ctid in (
     select ctid
       from public.comment_translator_paid_provider_detail_source_receipts
      where expires_at <= p_now
      order by expires_at
      limit 1000
   );

  insert into public.comment_translator_paid_provider_detail_source_receipts (
    attempt_id, provider_attempt, expires_at, created_at, updated_at
  ) values (
    p_attempt_id, p_provider_attempt, v_logical.expires_at, p_now, p_now
  )
  on conflict (attempt_id, provider_attempt) do nothing;
  if not found then
    return false;
  end if;

  insert into public.comment_translator_paid_provider_hourly_details (
    owner_user_id, provider, utc_hour, request_count, session_count, comment_count,
    input_characters, output_characters, input_tokens, output_tokens,
    estimated_cost_micros, success_count, failure_count,
    latency_up_to_100_ms_count, latency_101_to_250_ms_count,
    latency_251_to_500_ms_count, latency_501_to_1000_ms_count,
    latency_1001_to_2500_ms_count, latency_2501_to_5000_ms_count,
    latency_5001_to_10000_ms_count, latency_over_10000_ms_count,
    created_at, updated_at
  ) values (
    p_owner_user_id, p_provider, p_utc_hour, p_request_count, p_session_count, p_comment_count,
    p_input_characters, p_output_characters, p_input_tokens, p_output_tokens,
    p_estimated_cost_micros, p_success_count, p_failure_count,
    p_latency_up_to_100_ms_count, p_latency_101_to_250_ms_count,
    p_latency_251_to_500_ms_count, p_latency_501_to_1000_ms_count,
    p_latency_1001_to_2500_ms_count, p_latency_2501_to_5000_ms_count,
    p_latency_5001_to_10000_ms_count, p_latency_over_10000_ms_count,
    p_now, p_now
  )
  on conflict (owner_user_id, provider, utc_hour) do update
     set request_count = comment_translator_paid_provider_hourly_details.request_count + excluded.request_count,
         session_count = comment_translator_paid_provider_hourly_details.session_count + excluded.session_count,
         comment_count = comment_translator_paid_provider_hourly_details.comment_count + excluded.comment_count,
         input_characters = comment_translator_paid_provider_hourly_details.input_characters + excluded.input_characters,
         output_characters = comment_translator_paid_provider_hourly_details.output_characters + excluded.output_characters,
         input_tokens = comment_translator_paid_provider_hourly_details.input_tokens + excluded.input_tokens,
         output_tokens = comment_translator_paid_provider_hourly_details.output_tokens + excluded.output_tokens,
         estimated_cost_micros = comment_translator_paid_provider_hourly_details.estimated_cost_micros + excluded.estimated_cost_micros,
         success_count = comment_translator_paid_provider_hourly_details.success_count + excluded.success_count,
         failure_count = comment_translator_paid_provider_hourly_details.failure_count + excluded.failure_count,
         latency_up_to_100_ms_count = comment_translator_paid_provider_hourly_details.latency_up_to_100_ms_count + excluded.latency_up_to_100_ms_count,
         latency_101_to_250_ms_count = comment_translator_paid_provider_hourly_details.latency_101_to_250_ms_count + excluded.latency_101_to_250_ms_count,
         latency_251_to_500_ms_count = comment_translator_paid_provider_hourly_details.latency_251_to_500_ms_count + excluded.latency_251_to_500_ms_count,
         latency_501_to_1000_ms_count = comment_translator_paid_provider_hourly_details.latency_501_to_1000_ms_count + excluded.latency_501_to_1000_ms_count,
         latency_1001_to_2500_ms_count = comment_translator_paid_provider_hourly_details.latency_1001_to_2500_ms_count + excluded.latency_1001_to_2500_ms_count,
         latency_2501_to_5000_ms_count = comment_translator_paid_provider_hourly_details.latency_2501_to_5000_ms_count + excluded.latency_2501_to_5000_ms_count,
         latency_5001_to_10000_ms_count = comment_translator_paid_provider_hourly_details.latency_5001_to_10000_ms_count + excluded.latency_5001_to_10000_ms_count,
         latency_over_10000_ms_count = comment_translator_paid_provider_hourly_details.latency_over_10000_ms_count + excluded.latency_over_10000_ms_count,
         updated_at = p_now;
  return true;
end;
$$;

-- R7: reinstall only the 76 observed CRLF-drift definitions from final source.
-- This preserves raw definition MD5 acceptance; no function is invoked.

create or replace function public.ct_paid_abandon_logical_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_caller_receipt public.comment_translator_paid_attempt_receipts%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_committed_sibling_count integer;
  v_unsafe_sibling_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if length(trim(p_provider_attempt)) = 0 or length(trim(p_provider_attempt)) > 200 then
    raise exception 'provider attempt is not valid';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;

  perform 1
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
   order by provider_attempt
   for update;

  select *
    into v_caller_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt;
  if v_caller_receipt.attempt_id is null
    or (
      v_caller_receipt.attempt_state <> 'released'
      and not (
        v_caller_receipt.attempt_state = 'committed'
        and v_caller_receipt.provider_failure_class is not null
        and v_caller_receipt.committed_input_characters = 0
      )
    )
  then
    raise exception 'abandonment requires a terminal released provider receipt';
  end if;

  if v_logical.logical_state in ('committed', 'released') then
    return 0;
  end if;

  select
    count(*) filter (
      where provider_attempt <> p_provider_attempt
        and attempt_state = 'committed'
        and provider_failure_class is null
    )::integer,
    count(*) filter (
      where provider_attempt <> p_provider_attempt
        and attempt_state in ('reserved', 'uncertain', 'expired')
    )::integer
    into v_committed_sibling_count, v_unsafe_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;

  if v_committed_sibling_count > 0 then
    raise exception 'committed provider receipt prevents abandonment';
  end if;
  if v_unsafe_sibling_count > 0 then
    raise exception 'active or unknown provider receipt prevents abandonment';
  end if;

  select *
    into v_usage
    from public.comment_translator_paid_billing_period_usage
   where id = v_logical.billing_period_usage_id
   for update;
  if v_usage.id is null then
    raise exception 'billing period usage bucket is missing';
  end if;
  if v_usage.reserved_input_characters < v_logical.input_characters then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_billing_period_usage
     set reserved_input_characters = reserved_input_characters - v_logical.input_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id
     and reserved_input_characters >= v_logical.input_characters;
  if not found then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'released',
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_session_leases
     set lease_state = 'released',
         lease_until = p_now,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and lease_state in ('active', 'uncertain');

  return v_logical.input_characters;
end;
$$;

create or replace function public.ct_paid_apply_paid_unentitled_disposition(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_customer_binding_id uuid,
  p_subscription_binding_id uuid,
  p_product_id text,
  p_price_id text,
  p_entitlement_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_dispute_state text,
  p_projection_lease_token uuid,
  p_reconcile_lease_token uuid,
  p_operator_disposition text,
  p_lifecycle_state text,
  p_subscription_status text,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_entitlement_id uuid;
begin
  p_now := statement_timestamp();
  if p_operator_disposition not in ('refund-cancel', 'capacity-correction-approved') then
    raise exception 'Paid unentitled operator disposition is not valid';
  end if;
  if p_operator_disposition = 'capacity-correction-approved' and not (
    (
      p_entitlement_status is not distinct from 'active'
      and p_lifecycle_state is not distinct from 'active'
      and p_subscription_status is not distinct from 'active'
    )
    or (
      p_entitlement_status is not distinct from 'cancel_at_period_end'
      and p_lifecycle_state is not distinct from 'cancel_at_period_end'
      and p_subscription_status is not distinct from 'active'
    )
  ) then
    raise exception 'Capacity correction must project the validated current Paid state';
  end if;
  if p_operator_disposition = 'refund-cancel' and (
    p_entitlement_status is distinct from 'canceled'
    or p_lifecycle_state is distinct from 'canceled'
    or p_subscription_status is distinct from 'canceled'
  ) then
    raise exception 'Refund cancellation must project the validated canceled state';
  end if;

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
     and owner_user_id = p_owner_user_id
   for update;
  if v_lifecycle.id is null
    or v_lifecycle.lifecycle_state <> 'paid_unentitled_reconciliation'
    or v_lifecycle.is_terminal
    or v_lifecycle.reconcile_work_kind <> 'paid-unentitled-reconciliation'
    or v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or v_lifecycle.reconcile_lease_until is null
    or v_lifecycle.reconcile_lease_until <= p_now
    or v_lifecycle.paid_unentitled_operator_disposition is distinct from p_operator_disposition
  then
    raise exception 'Paid unentitled disposition or reconcile lease is stale';
  end if;

  v_entitlement_id := public.ct_paid_project_entitlement(
    p_lifecycle_id => p_lifecycle_id,
    p_owner_user_id => p_owner_user_id,
    p_customer_binding_id => p_customer_binding_id,
    p_subscription_binding_id => p_subscription_binding_id,
    p_product_id => p_product_id,
    p_price_id => p_price_id,
    p_entitlement_status => p_entitlement_status,
    p_current_period_start => p_current_period_start,
    p_current_period_end => p_current_period_end,
    p_cancel_at_period_end => p_cancel_at_period_end,
    p_dispute_state => p_dispute_state,
    p_projection_lease_token => p_projection_lease_token,
    p_reconcile_lease_token => p_reconcile_lease_token,
    p_now => p_now,
    p_lifecycle_state => p_lifecycle_state,
    p_subscription_status => p_subscription_status
  );

  update public.comment_translator_paid_billing_lifecycles
     set paid_unentitled_operator_disposition = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and paid_unentitled_operator_disposition = p_operator_disposition;
  if not found then
    raise exception 'Paid unentitled operator disposition was not consumed';
  end if;
  return v_entitlement_id;
end;
$$;

create or replace function public.ct_paid_assert_current_paid_period(
  p_owner_user_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entitlement public.comment_translator_paid_entitlements%rowtype;
begin
  p_now := statement_timestamp();
  if p_period_end <= p_period_start
    or p_now < p_period_start
    or p_now >= p_period_end
  then
    raise exception 'billing period is not current';
  end if;

  select *
    into v_entitlement
    from public.comment_translator_paid_entitlements
   where owner_user_id = p_owner_user_id
     and entitlement_status in ('active', 'cancel_at_period_end')
   order by updated_at desc
   limit 1
   for update;
  if v_entitlement.id is null
    or v_entitlement.subscription_binding_id is null
    or v_entitlement.current_period_start is distinct from p_period_start
    or v_entitlement.current_period_end is distinct from p_period_end
  then
    raise exception 'current Paid entitlement period is not authoritative';
  end if;
  if exists (
    select 1
      from public.comment_translator_paid_billing_period_usage
     where owner_user_id = p_owner_user_id
       and period_end <= p_period_start
       and period_state <> 'closed'
  ) or exists (
    select 1
      from public.comment_translator_paid_owner_cost_buckets
     where owner_user_id = p_owner_user_id
       and period_end <= p_period_start
       and period_state <> 'closed'
  )
  then
    raise exception 'previous Paid billing period is not reconciled';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_assert_current_utc_month(
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_utc_month date := date_trunc('month', p_now at time zone 'UTC')::date;
begin
  p_now := statement_timestamp();
  v_utc_month := date_trunc('month', p_now at time zone 'UTC')::date;
  if exists (
    select 1
      from public.comment_translator_paid_global_cost_buckets
     where utc_month < v_utc_month
       and bucket_state <> 'closed'
  ) or exists (
    select 1
      from public.comment_translator_paid_azure_fallback_buckets
     where utc_month < v_utc_month
       and bucket_state <> 'closed'
  )
  then
    raise exception 'previous Paid UTC month is not reconciled';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_assert_reconcile_lease_active(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_work_kind text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := statement_timestamp();
begin
  if p_work_kind is not null and p_work_kind not in (
    'checkout-expiry',
    'unbound-checkout-session',
    'payment-failure-seven-day',
    'cancel-pending',
    'refund-reconciliation',
    'dispute-reconciliation',
    'paid-unentitled-reconciliation',
    'billing-period-rollover',
    'utc-month-cost-rollover'
  ) then
    return false;
  end if;

  if p_work_kind is null then
    return exists (
      select 1
        from public.comment_translator_paid_billing_lifecycles
       where id = p_lifecycle_id
         and reconcile_work_kind is not null
         and reconcile_lease_token = p_reconcile_lease_token
         and reconcile_lease_until > v_now
    ) or exists (
      select 1
        from public.comment_translator_paid_maintenance_work_items
       where id = p_lifecycle_id
         and work_kind is not null
         and reconcile_lease_token = p_reconcile_lease_token
         and reconcile_lease_until > v_now
    );
  end if;

  if p_work_kind = 'utc-month-cost-rollover' then
    return exists (
      select 1
        from public.comment_translator_paid_maintenance_work_items
       where id = p_lifecycle_id
         and work_kind = p_work_kind
         and reconcile_lease_token = p_reconcile_lease_token
         and reconcile_lease_until > v_now
    );
  end if;

  return exists (
    select 1
      from public.comment_translator_paid_billing_lifecycles
     where id = p_lifecycle_id
       and reconcile_work_kind = p_work_kind
       and reconcile_lease_token = p_reconcile_lease_token
       and reconcile_lease_until > v_now
  );
end;
$$;

create or replace function public.ct_paid_begin_checkout(
  p_owner_user_id uuid,
  p_stripe_customer_id text,
  p_now timestamptz default now()
)
returns table (
  lifecycle_id uuid,
  hold_id uuid,
  customer_binding_id uuid,
  idempotency_key text,
  checkout_expires_at_target timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_customer public.comment_translator_paid_customers%rowtype;
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_capacity public.comment_translator_paid_capacity_reservations%rowtype;
  v_capacity_limit integer;
  v_reserved_count integer;
  v_hold_id uuid;
  v_idempotency_key text;
  v_checkout_expires_at_target timestamptz;
begin
  p_now := statement_timestamp();
  if length(trim(p_stripe_customer_id)) = 0 then
    raise exception 'checkout initialization request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290101);

  select * into v_customer
    from public.comment_translator_paid_customers
   where owner_user_id = p_owner_user_id
   for update;
  if v_customer.id is not null and v_customer.stripe_customer_id <> p_stripe_customer_id then
    raise exception 'customer binding conflict';
  end if;
  if v_customer.id is null then
    if exists (
      select 1 from public.comment_translator_paid_customers
       where stripe_customer_id = p_stripe_customer_id
         and owner_user_id <> p_owner_user_id
    ) then
      raise exception 'customer binding conflict';
    end if;
    insert into public.comment_translator_paid_customers (owner_user_id, stripe_customer_id, created_at)
    values (p_owner_user_id, p_stripe_customer_id, p_now)
    returning * into v_customer;
  end if;

  select * into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where owner_user_id = p_owner_user_id
     and is_terminal = false
   for update;
  if v_lifecycle.id is not null then
    select * into v_hold
      from public.comment_translator_paid_checkout_holds
     where lifecycle_id = v_lifecycle.id
     for update;
    select * into v_capacity
      from public.comment_translator_paid_capacity_reservations
     where lifecycle_id = v_lifecycle.id
     for update;
    if v_lifecycle.customer_binding_id <> v_customer.id
      or v_lifecycle.lifecycle_state <> 'checkout_hold'
      or v_hold.id is null
      or v_hold.owner_user_id <> p_owner_user_id
      or v_hold.hold_state <> 'held'
      or v_capacity.id is null
      or v_capacity.owner_user_id <> p_owner_user_id
      or v_capacity.reservation_state <> 'held'
      or v_capacity.lifecycle_stage <> 'checkout_hold'
    then
      raise exception 'checkout initialization binding conflict';
    end if;
    return query select
      v_lifecycle.id,
      v_hold.id,
      v_customer.id,
      v_hold.idempotency_key,
      v_hold.checkout_expires_at_target;
    return;
  end if;

  select capacity_limit into v_capacity_limit
    from public.comment_translator_paid_capacity_config
   where config_key = true
   for update;
  if v_capacity_limit is null then
    raise exception 'paid capacity configuration is unavailable';
  end if;
  select count(*)::integer into v_reserved_count
    from public.comment_translator_paid_capacity_reservations
   where reservation_state in ('held', 'consuming');
  if v_reserved_count >= v_capacity_limit then
    raise exception 'paid capacity is full';
  end if;

  v_hold_id := gen_random_uuid();
  v_idempotency_key := 'ct-paid-checkout-' || v_hold_id::text;
  v_checkout_expires_at_target := date_trunc('second', p_now) + interval '31 minutes';

  insert into public.comment_translator_paid_billing_lifecycles (
    owner_user_id, customer_binding_id, lifecycle_state, is_terminal,
    next_reconcile_at, created_at, updated_at
  ) values (
    p_owner_user_id, v_customer.id, 'checkout_hold', false,
    v_checkout_expires_at_target, p_now, p_now
  ) returning * into v_lifecycle;

  insert into public.comment_translator_paid_capacity_reservations (
    lifecycle_id, owner_user_id, reservation_state, lifecycle_stage, created_at, updated_at
  ) values (
    v_lifecycle.id, p_owner_user_id, 'held', 'checkout_hold', p_now, p_now
  ) returning * into v_capacity;

  insert into public.comment_translator_paid_checkout_holds (
    id, lifecycle_id, owner_user_id, idempotency_key, hold_state,
    checkout_expires_at_target, created_at, updated_at
  ) values (
    v_hold_id, v_lifecycle.id, p_owner_user_id, v_idempotency_key, 'held',
    v_checkout_expires_at_target, p_now, p_now
  ) returning * into v_hold;

  return query select
    v_lifecycle.id,
    v_hold.id,
    v_customer.id,
    v_hold.idempotency_key,
    v_hold.checkout_expires_at_target;
end;
$$;

create or replace function public.ct_paid_bind_checkout_session(
  p_owner_user_id uuid,
  p_lifecycle_id uuid,
  p_hold_id uuid,
  p_customer_binding_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text,
  p_stripe_expires_at timestamptz,
  p_is_recovery_binding boolean,
  p_idempotency_key text,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_customer public.comment_translator_paid_customers%rowtype;
  v_existing public.comment_translator_paid_checkout_session_bindings%rowtype;
  v_binding_id uuid;
begin
  p_now := statement_timestamp();
  if length(trim(p_stripe_checkout_session_id)) = 0
    or length(trim(p_stripe_customer_id)) = 0
    or p_stripe_expires_at is null
    or p_is_recovery_binding is null
    or p_idempotency_key is null
    or length(trim(p_idempotency_key)) = 0
    or (not p_is_recovery_binding and p_stripe_expires_at <= p_now)
  then
    raise exception 'checkout session binding request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290101);

  select * into v_existing
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
      or hold_id = p_hold_id
      or stripe_checkout_session_id = p_stripe_checkout_session_id
   order by created_at
   limit 1
   for update;
  select * into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  select * into v_hold
    from public.comment_translator_paid_checkout_holds
   where id = p_hold_id
   for update;
  select * into v_customer
    from public.comment_translator_paid_customers
   where id = p_customer_binding_id
   for update;
  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_lifecycle.customer_binding_id <> p_customer_binding_id
    or v_lifecycle.is_terminal
    or v_hold.id is null
    or v_hold.lifecycle_id <> p_lifecycle_id
    or v_hold.owner_user_id <> p_owner_user_id
    or v_hold.hold_state not in ('held', 'converted')
    or v_hold.checkout_expires_at_target is distinct from p_stripe_expires_at
    or v_hold.idempotency_key is distinct from p_idempotency_key
    or v_lifecycle.lifecycle_state = 'expire_required'
    or v_customer.id is null
    or v_customer.owner_user_id <> p_owner_user_id
    or v_customer.stripe_customer_id <> p_stripe_customer_id
  then
    raise exception 'checkout session binding conflict';
  end if;

  if v_existing.id is not null then
    if v_existing.lifecycle_id <> p_lifecycle_id
      or v_existing.hold_id <> p_hold_id
      or v_existing.owner_user_id <> p_owner_user_id
      or v_existing.customer_binding_id <> p_customer_binding_id
      or v_existing.stripe_checkout_session_id <> p_stripe_checkout_session_id
      or v_existing.stripe_customer_id <> p_stripe_customer_id
      or v_existing.stripe_expires_at is distinct from p_stripe_expires_at
    then
      raise exception 'checkout session binding conflict';
    end if;
    update public.comment_translator_paid_billing_lifecycles
       set next_reconcile_at = p_stripe_expires_at,
           updated_at = p_now
     where id = p_lifecycle_id
       and lifecycle_state in ('checkout_hold', 'incomplete');
    return v_existing.id;
  end if;

  if v_hold.hold_state <> 'held' then
    raise exception 'checkout session binding conflict';
  end if;

  insert into public.comment_translator_paid_checkout_session_bindings (
    lifecycle_id, hold_id, owner_user_id, customer_binding_id,
    stripe_checkout_session_id, stripe_customer_id, stripe_expires_at, created_at
  ) values (
    p_lifecycle_id, p_hold_id, p_owner_user_id, p_customer_binding_id,
    p_stripe_checkout_session_id, p_stripe_customer_id, p_stripe_expires_at, p_now
  ) returning id into v_binding_id;
  update public.comment_translator_paid_billing_lifecycles
     set next_reconcile_at = p_stripe_expires_at,
         updated_at = p_now
   where id = p_lifecycle_id
     and lifecycle_state in ('checkout_hold', 'incomplete');
  return v_binding_id;
end;
$$;

create or replace function public.ct_paid_bind_first_subscription(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_customer_binding_id uuid,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_product_id text,
  p_price_id text,
  p_entitlement_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_dispute_state text,
  p_lifecycle_state text,
  p_projection_lease_token uuid,
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_customer public.comment_translator_paid_customers%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_session public.comment_translator_paid_checkout_session_bindings%rowtype;
  v_existing public.comment_translator_paid_subscription_bindings%rowtype;
  v_by_stripe public.comment_translator_paid_subscription_bindings%rowtype;
  v_binding_id uuid;
  v_capacity_id uuid;
  v_initial_capacity_stage text;
  v_target_capacity_stage text;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290101);
  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_lifecycle.is_terminal
    or v_lifecycle.lifecycle_state = 'expire_required'
  then
    raise exception 'billing lifecycle binding is not ready';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for projection';
  end if;

  v_initial_capacity_stage := case v_lifecycle.lifecycle_state
    when 'checkout_hold' then 'checkout_hold'
    when 'incomplete' then 'incomplete'
    when 'active' then 'active'
    when 'cancel_at_period_end' then 'cancel_at_period_end'
    when 'past_due' then 'payment_failure_hold'
    when 'unpaid' then 'payment_failure_hold'
    when 'dispute' then 'dispute'
    when 'cancel_pending' then 'cancel_pending'
    when 'paid_unentitled_reconciliation' then 'reconciliation'
    when 'refund_reconciliation' then 'reconciliation'
    when 'dispute_reconciliation' then 'reconciliation'
    else null
  end;
  v_target_capacity_stage := case p_lifecycle_state
    when 'incomplete' then 'incomplete'
    when 'active' then 'active'
    when 'cancel_at_period_end' then 'cancel_at_period_end'
    when 'past_due' then 'payment_failure_hold'
    when 'unpaid' then 'payment_failure_hold'
    when 'dispute' then 'dispute'
    when 'cancel_pending' then 'cancel_pending'
    when 'paid_unentitled_reconciliation' then 'reconciliation'
    when 'refund_reconciliation' then 'reconciliation'
    when 'dispute_reconciliation' then 'reconciliation'
    else null
  end;
  if p_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated')
    or v_initial_capacity_stage is null
    or v_target_capacity_stage is null
  then
    raise exception 'first subscription lifecycle target is not capacity eligible';
  end if;

  select *
    into v_customer
    from public.comment_translator_paid_customers
   where id = p_customer_binding_id
   for update;
  if v_customer.id is null
    or v_customer.owner_user_id <> p_owner_user_id
    or v_customer.stripe_customer_id <> p_stripe_customer_id
  then
    raise exception 'customer binding conflict';
  end if;

  if v_lifecycle.customer_binding_id <> p_customer_binding_id then
    raise exception 'lifecycle customer binding conflict';
  end if;

  select *
    into v_hold
    from public.comment_translator_paid_checkout_holds
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_hold.id is null
    or v_hold.owner_user_id <> p_owner_user_id
    or v_hold.hold_state not in ('held', 'converted')
  then
    raise exception 'checkout hold binding is not ready';
  end if;

  select *
    into v_session
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
     and hold_id = v_hold.id
   for update;
  if v_session.id is null
    or v_session.owner_user_id <> p_owner_user_id
    or v_session.customer_binding_id <> p_customer_binding_id
    or v_session.stripe_customer_id <> p_stripe_customer_id
  then
    raise exception 'checkout session binding is not ready';
  end if;

  select *
    into v_existing
    from public.comment_translator_paid_subscription_bindings
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_existing.id is not null then
    if v_existing.owner_user_id <> p_owner_user_id
      or v_existing.customer_binding_id <> p_customer_binding_id
      or v_existing.stripe_subscription_id <> p_stripe_subscription_id
      or v_existing.stripe_customer_id <> p_stripe_customer_id
      or v_existing.product_id <> p_product_id
      or v_existing.price_id <> p_price_id
    then
      raise exception 'subscription binding conflict';
    end if;
    perform public.ct_paid_project_entitlement(
      p_lifecycle_id => p_lifecycle_id,
      p_owner_user_id => p_owner_user_id,
      p_customer_binding_id => p_customer_binding_id,
      p_subscription_binding_id => v_existing.id,
      p_product_id => p_product_id,
      p_price_id => p_price_id,
      p_entitlement_status => p_entitlement_status,
      p_current_period_start => p_current_period_start,
      p_current_period_end => p_current_period_end,
      p_cancel_at_period_end => p_cancel_at_period_end,
      p_dispute_state => p_dispute_state,
      p_projection_lease_token => p_projection_lease_token,
      p_reconcile_lease_token => p_reconcile_lease_token,
      p_now => p_now,
      p_lifecycle_state => p_lifecycle_state
    );
    return v_existing.id;
  end if;

  select *
    into v_by_stripe
    from public.comment_translator_paid_subscription_bindings
   where stripe_subscription_id = p_stripe_subscription_id
   for update;
  if v_by_stripe.id is not null then
    raise exception 'subscription binding conflict';
  end if;

  insert into public.comment_translator_paid_subscription_bindings (
    lifecycle_id,
    owner_user_id,
    customer_binding_id,
    stripe_subscription_id,
    stripe_customer_id,
    product_id,
    price_id
  )
  values (
    p_lifecycle_id,
    p_owner_user_id,
    p_customer_binding_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_product_id,
    p_price_id
  )
  returning id into v_binding_id;

  select id
    into v_capacity_id
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;

  if v_capacity_id is null then
    v_capacity_id := public.ct_paid_reserve_capacity(
      p_lifecycle_id,
      p_owner_user_id,
      v_initial_capacity_stage,
      p_reconcile_lease_token,
      p_now
    );
  end if;

  -- The lifecycle and capacity stage move atomically in this RPC transaction.
  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = p_lifecycle_state,
         is_terminal = p_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated'),
         updated_at = p_now
   where id = p_lifecycle_id;

  perform public.ct_paid_convert_capacity(
    p_lifecycle_id,
    v_target_capacity_stage,
    p_reconcile_lease_token,
    p_now
  );

  update public.comment_translator_paid_checkout_holds
     set hold_state = 'converted',
         updated_at = p_now
   where lifecycle_id = p_lifecycle_id
     and hold_state = 'held';

  perform public.ct_paid_project_entitlement(
    p_lifecycle_id => p_lifecycle_id,
    p_owner_user_id => p_owner_user_id,
    p_customer_binding_id => p_customer_binding_id,
    p_subscription_binding_id => v_binding_id,
    p_product_id => p_product_id,
    p_price_id => p_price_id,
    p_entitlement_status => p_entitlement_status,
    p_current_period_start => p_current_period_start,
    p_current_period_end => p_current_period_end,
    p_cancel_at_period_end => p_cancel_at_period_end,
    p_dispute_state => p_dispute_state,
    p_projection_lease_token => p_projection_lease_token,
    p_reconcile_lease_token => p_reconcile_lease_token,
    p_now => p_now,
    p_lifecycle_state => p_lifecycle_state
  );

  return v_binding_id;
end;
$$;

create or replace function public.ct_paid_bound_message_rate_receipt_expiry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'stopped' and new.stopped_at is not null then
    update public.comment_translator_paid_message_rate_reservations
       set expires_at = least(expires_at, new.stopped_at + interval '24 hours'),
           updated_at = statement_timestamp()
     where owner_user_id = new.owner_user_id
       and session_reference_id = new.session_reference_id;
  end if;
  return new;
end;
$$;

create or replace function public.ct_paid_claim_entitlement_projection(
  p_owner_user_id uuid,
  p_lifecycle_id uuid,
  p_now timestamptz default now()
)
returns table (projection_lease_token uuid, projection_lease_until timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_projection_lease_token uuid;
  v_projection_lease_until timestamptz;
begin
  p_now := statement_timestamp();
  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles lifecycle
   where lifecycle.id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null or v_lifecycle.owner_user_id <> p_owner_user_id then
    raise exception 'billing lifecycle binding is not ready';
  end if;
  if v_lifecycle.projection_lease_token is not null
    and v_lifecycle.projection_lease_until is not null
    and v_lifecycle.projection_lease_until > p_now
  then
    return;
  end if;

  v_projection_lease_token := gen_random_uuid();
  v_projection_lease_until := p_now + interval '120 seconds';
  update public.comment_translator_paid_billing_lifecycles lifecycle
     set projection_lease_token = v_projection_lease_token,
         projection_lease_until = v_projection_lease_until,
         updated_at = p_now
   where lifecycle.id = p_lifecycle_id;

  return query select v_projection_lease_token, v_projection_lease_until;
end;
$$;

create or replace function public.ct_paid_claim_provider_circuit_probe(
  p_provider text,
  p_probe_attempt_id text,
  p_now timestamptz default now()
)
returns table (
  provider text,
  circuit_state text,
  failure_count integer,
  window_started_at timestamptz,
  degraded_until timestamptz,
  probe_attempt_id text,
  probe_lease_until timestamptz,
  last_error_class text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  circuit public.comment_translator_paid_provider_circuits%rowtype;
begin
  p_now := statement_timestamp();
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;
  if p_probe_attempt_id is null
    or length(trim(p_probe_attempt_id)) = 0
    or length(p_probe_attempt_id) > 200
  then
    raise exception 'provider circuit probe attempt is not valid';
  end if;

  select *
    into circuit
    from public.comment_translator_paid_provider_circuits as circuit_row
   where circuit_row.provider = p_provider
   for update;
  if circuit.provider is null then
    raise exception 'provider circuit is not configured';
  end if;

  if circuit.circuit_state = 'degraded'
    and circuit.degraded_until is not null
    and circuit.degraded_until <= p_now
  then
    update public.comment_translator_paid_provider_circuits as circuit_row
       set circuit_state = 'half_open',
           probe_attempt_id = p_probe_attempt_id,
           probe_lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where circuit_row.provider = p_provider;
  elsif circuit.circuit_state = 'half_open'
    and (circuit.probe_lease_until is null or circuit.probe_lease_until <= p_now)
  then
    update public.comment_translator_paid_provider_circuits as circuit_row
       set probe_attempt_id = p_probe_attempt_id,
           probe_lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where circuit_row.provider = p_provider;
  end if;

  return query
  select
    circuit_row.provider,
    circuit_row.circuit_state,
    circuit_row.failure_count,
    circuit_row.window_started_at,
    circuit_row.degraded_until,
    circuit_row.probe_attempt_id,
    circuit_row.probe_lease_until,
    circuit_row.last_error_class
    from public.comment_translator_paid_provider_circuits as circuit_row
   where circuit_row.provider = p_provider;
end;
$$;

create or replace function public.ct_paid_claim_provider_dispatch(
  p_attempt_id text,
  p_provider_attempt text,
  p_provider_kind text,
  p_dispatch_sequence integer,
  p_session_lease_token uuid,
  p_openai_slot_lease_token uuid default null,
  p_now timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_slot public.comment_translator_paid_openai_slots%rowtype;
  v_dispatch public.comment_translator_paid_provider_dispatch_claims%rowtype;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_provider_kind not in ('openai_attempt', 'azure_direct_fallback')
    or p_dispatch_sequence < 0
    or p_dispatch_sequence >= 15
    or p_session_lease_token is null
    or (p_provider_kind = 'openai_attempt' and p_openai_slot_lease_token is null)
    or (p_provider_kind = 'azure_direct_fallback' and p_openai_slot_lease_token is not null)
  then
    raise exception 'provider dispatch claim is not valid';
  end if;

  select * into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.id is null
    or v_attempt.provider_kind <> p_provider_kind
    or v_attempt.attempt_state not in ('reserved', 'uncertain')
    or v_attempt.expires_at <= p_now
  then
    raise exception 'provider dispatch attempt is not active';
  end if;

  select * into v_lease
    from public.comment_translator_paid_session_leases
   where attempt_id = p_attempt_id
     and lease_token = p_session_lease_token
   for update;
  if v_lease.id is null
    or v_lease.owner_user_id <> v_attempt.owner_user_id
    or v_lease.session_reference_id <> v_attempt.session_reference_id
    or v_lease.provider_attempt <> p_provider_attempt
    or v_lease.lease_state not in ('active', 'uncertain')
    or v_lease.lease_until <= p_now
  then
    raise exception 'provider dispatch session lease is not active';
  end if;

  if p_provider_kind = 'openai_attempt' then
    select * into v_slot
      from public.comment_translator_paid_openai_slots
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt
       and lease_token = p_openai_slot_lease_token
     for update;
    if v_slot.id is null
      or v_slot.session_reference_id <> v_attempt.session_reference_id
      or v_slot.slot_state not in ('active', 'uncertain')
      or v_slot.lease_until <= p_now
    then
      raise exception 'provider dispatch OpenAI slot is not active';
    end if;
  end if;

  select * into v_dispatch
    from public.comment_translator_paid_provider_dispatch_claims
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
     and dispatch_sequence = p_dispatch_sequence
   for update;
  if v_dispatch.attempt_id is not null then
    if v_dispatch.provider_kind <> p_provider_kind then
      raise exception 'provider dispatch binding conflict';
    end if;
    return 'already-dispatched';
  end if;
  if v_attempt.attempt_state = 'uncertain' and not exists (
    select 1
      from public.comment_translator_paid_provider_dispatch_claims
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt
  ) then
    -- A pre-migration or crash-finalized uncertain receipt has already crossed
    -- the Provider boundary; absence of a claim must never authorize replay.
    return 'already-dispatched';
  end if;

  insert into public.comment_translator_paid_provider_dispatch_claims (
    attempt_id, provider_attempt, dispatch_sequence, provider_kind, dispatched_at, expires_at
  ) values (
    p_attempt_id, p_provider_attempt, p_dispatch_sequence, p_provider_kind,
    p_now, p_now + interval '120 seconds'
  );

  update public.comment_translator_paid_attempt_receipts
     set attempt_state = 'uncertain',
         expires_at = greatest(expires_at, p_now + interval '120 seconds'),
         updated_at = p_now
   where id = v_attempt.id;
  update public.comment_translator_paid_session_leases
     set lease_state = 'uncertain',
         lease_until = greatest(lease_until, p_now + interval '120 seconds'),
         updated_at = p_now
   where id = v_lease.id;
  if p_provider_kind = 'openai_attempt' then
    update public.comment_translator_paid_openai_slots
       set slot_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
     where id = v_slot.id;
    update public.comment_translator_paid_openai_rate_reservations
       set reservation_state = 'uncertain',
           expires_at = greatest(expires_at, p_now + interval '120 seconds')
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt
       and reservation_state in ('reserved', 'uncertain');
    if not found then
      raise exception 'provider dispatch OpenAI rate reservation is not active';
    end if;
  end if;
  return 'claimed';
end;
$$;

create or replace function public.ct_paid_claim_reconciler(
  p_now timestamptz default now(),
  p_limit integer default 50
)
returns table (
  lifecycle_id uuid,
  reconcile_lease_token uuid,
  reconcile_lease_until timestamptz,
  work_kind text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  return query
  with lifecycle_candidates as (
    select
      lifecycle.id,
      case
        when lifecycle.lifecycle_state = 'expire_required' then 'checkout-expiry'
        when lifecycle.lifecycle_state in ('checkout_hold', 'incomplete')
          and not exists (
            select 1
              from public.comment_translator_paid_checkout_session_bindings session_binding
             where session_binding.lifecycle_id = lifecycle.id
          )
          and not exists (
            select 1
              from public.comment_translator_paid_subscription_bindings subscription_binding
             where subscription_binding.lifecycle_id = lifecycle.id
          ) then 'unbound-checkout-session'
        when lifecycle.lifecycle_state in ('checkout_hold', 'incomplete') then 'checkout-expiry'
        when lifecycle.lifecycle_state in ('past_due', 'unpaid')
          and lifecycle.payment_failure_started_at is not null
          and lifecycle.payment_failure_started_at <= p_now - interval '7 days' then 'payment-failure-seven-day'
        when lifecycle.lifecycle_state = 'cancel_pending' then 'cancel-pending'
        when lifecycle.lifecycle_state = 'refund_reconciliation' then 'refund-reconciliation'
        when lifecycle.lifecycle_state in ('dispute', 'dispute_reconciliation') then 'dispute-reconciliation'
        when lifecycle.lifecycle_state = 'paid_unentitled_reconciliation'
          and lifecycle.paid_unentitled_operator_disposition is not null
          then 'paid-unentitled-reconciliation'
        when exists (
          select 1
            from public.comment_translator_paid_entitlements entitlement
           where entitlement.lifecycle_id = lifecycle.id
             and entitlement.current_period_end <= p_now
             and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
        ) then 'billing-period-rollover'
        else null
      end as resolved_work_kind
      from public.comment_translator_paid_billing_lifecycles lifecycle
     where lifecycle.is_terminal = false
       and (lifecycle.reconcile_lease_until is null or lifecycle.reconcile_lease_until <= p_now)
       and (
         lifecycle.next_reconcile_at is null
         or lifecycle.next_reconcile_at <= p_now
         or exists (
           select 1
             from public.comment_translator_paid_entitlements entitlement
            where entitlement.lifecycle_id = lifecycle.id
              and entitlement.current_period_end <= p_now
              and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
         )
       )
       and case
         when lifecycle.lifecycle_state = 'expire_required' then true
         when lifecycle.lifecycle_state in ('checkout_hold', 'incomplete') then true
         when lifecycle.lifecycle_state in ('past_due', 'unpaid') then
           lifecycle.payment_failure_started_at is not null
           and lifecycle.payment_failure_started_at <= p_now - interval '7 days'
         when lifecycle.lifecycle_state in (
           'cancel_pending', 'refund_reconciliation', 'dispute',
           'dispute_reconciliation'
         ) then true
         when lifecycle.lifecycle_state = 'paid_unentitled_reconciliation'
           then lifecycle.paid_unentitled_operator_disposition is not null
         when lifecycle.lifecycle_state in ('active', 'cancel_at_period_end') then exists (
           select 1
             from public.comment_translator_paid_entitlements entitlement
            where entitlement.lifecycle_id = lifecycle.id
              and entitlement.current_period_end <= p_now
              and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
         )
         else false
       end
     order by lifecycle.next_reconcile_at nulls first, lifecycle.created_at
     for update skip locked
     -- Reserve one place in the same max-50 lease batch so the singleton UTC
     -- rollover cannot be starved by a continuously full lifecycle backlog.
     limit greatest(least(greatest(coalesce(p_limit, 50), 0), 50) - 1, 0)
  ), claimed_lifecycles as (
    update public.comment_translator_paid_billing_lifecycles lifecycle
       set reconcile_lease_token = gen_random_uuid(),
           reconcile_lease_until = p_now + interval '120 seconds',
           reconcile_attempt_count = lifecycle.reconcile_attempt_count + 1,
           reconcile_work_kind = lifecycle_candidates.resolved_work_kind,
           updated_at = p_now
      from lifecycle_candidates
     where lifecycle.id = lifecycle_candidates.id
     returning lifecycle.id, lifecycle.reconcile_lease_token, lifecycle.reconcile_lease_until, lifecycle.reconcile_work_kind
  ), maintenance_candidates as (
    select work_item.id
      from public.comment_translator_paid_maintenance_work_items work_item
     where work_item.next_reconcile_at <= p_now
       and (work_item.reconcile_lease_until is null or work_item.reconcile_lease_until <= p_now)
     order by work_item.next_reconcile_at, work_item.id
     for update skip locked
     limit greatest(
       least(greatest(coalesce(p_limit, 50), 0), 50) - (select count(*) from claimed_lifecycles),
       0
     )
  ), claimed_maintenance as (
    update public.comment_translator_paid_maintenance_work_items work_item
       set reconcile_lease_token = gen_random_uuid(),
           reconcile_lease_until = p_now + interval '120 seconds',
           reconcile_attempt_count = work_item.reconcile_attempt_count + 1,
           updated_at = p_now
      from maintenance_candidates
     where work_item.id = maintenance_candidates.id
     returning work_item.id, work_item.reconcile_lease_token, work_item.reconcile_lease_until, work_item.work_kind
  )
  select claimed.id, claimed.reconcile_lease_token, claimed.reconcile_lease_until, claimed.reconcile_work_kind
    from claimed_lifecycles claimed
  union all
  select claimed.id, claimed.reconcile_lease_token, claimed.reconcile_lease_until, claimed.work_kind
    from claimed_maintenance claimed;
end;
$$;

create or replace function public.ct_paid_claim_stripe_event(
  p_event_id text,
  p_event_type text,
  p_stripe_event_created_at timestamptz,
  p_object_type text,
  p_now timestamptz default now()
)
returns table (claim_status text, lease_token uuid, attempt_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.comment_translator_paid_stripe_event_receipts%rowtype;
  v_new_lease_token uuid;
begin
  p_now := statement_timestamp();
  if length(trim(p_event_id)) = 0 or length(trim(p_event_type)) = 0 or length(trim(p_object_type)) = 0 then
    raise exception 'event identity is not valid';
  end if;

  insert into public.comment_translator_paid_stripe_event_receipts (
    event_id,
    event_type,
    stripe_event_created_at,
    stripe_object_type,
    receipt_status,
    attempt_count
  )
  values (
    p_event_id,
    p_event_type,
    p_stripe_event_created_at,
    p_object_type,
    'retryable',
    0
  )
  on conflict (event_id) do nothing;

  select *
    into v_existing
    from public.comment_translator_paid_stripe_event_receipts
   where event_id = p_event_id
   for update;

  if v_existing.event_type <> p_event_type
    or v_existing.stripe_event_created_at is distinct from p_stripe_event_created_at
    or v_existing.stripe_object_type <> p_object_type
  then
    return query select 'rejected'::text, null::uuid, v_existing.attempt_count;
    return;
  end if;

  if v_existing.receipt_status in ('complete', 'rejected') then
    return query select v_existing.receipt_status, v_existing.lease_token, v_existing.attempt_count;
    return;
  end if;

  if v_existing.receipt_status = 'processing'
    and v_existing.lease_until is not null
    and v_existing.lease_until > p_now
  then
    return query select 'processing'::text, null::uuid, v_existing.attempt_count;
    return;
  end if;

  v_new_lease_token := gen_random_uuid();
  update public.comment_translator_paid_stripe_event_receipts
     set receipt_status = 'processing',
         processing_started_at = p_now,
         lease_until = p_now + interval '120 seconds',
         lease_token = v_new_lease_token,
         attempt_count = v_existing.attempt_count + 1,
         last_error_class = null,
         updated_at = p_now
   where event_id = p_event_id;

  return query
    select 'processing'::text, v_new_lease_token, v_existing.attempt_count + 1;
end;
$$;

create or replace function public.ct_paid_cleanup_attempt_ledgers(
  p_now timestamptz default now(),
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt_ids text[];
  v_reservation_keys text[];
  v_reservation_key text;
  v_tombstone_keys text[];
  v_tombstone_key text;
  v_rate_deleted_for_key integer;
  v_tombstone_deleted_for_key integer;
  v_deleted integer := 0;
  v_rate_deleted integer := 0;
  v_tombstone_deleted integer := 0;
  v_bucket_deleted integer := 0;
  v_remaining integer;
  v_tombstone_remaining integer;
  v_bucket_remaining integer;
begin
  p_now := statement_timestamp();
  if p_limit < 1 or p_limit > 500 then
    raise exception 'attempt ledger cleanup limit is not valid';
  end if;

  select coalesce(array_agg(candidate.attempt_id), array[]::text[])
    into v_attempt_ids
    from (
      select logical_attempt.attempt_id
        from public.comment_translator_paid_logical_attempts logical_attempt
       where logical_attempt.expires_at <= p_now
         and logical_attempt.logical_state in ('committed', 'released')
         and not exists (
           select 1
             from public.comment_translator_paid_attempt_receipts provider_receipt
            where provider_receipt.attempt_id = logical_attempt.attempt_id
              and provider_receipt.attempt_state not in ('committed', 'released', 'expired')
         )
       order by logical_attempt.expires_at, logical_attempt.attempt_id
       limit p_limit
       for update of logical_attempt skip locked
    ) candidate;

  if cardinality(v_attempt_ids) > 0 then
    delete from public.comment_translator_paid_attempt_receipts
     where attempt_id = any(v_attempt_ids);
    delete from public.comment_translator_paid_logical_attempts
     where attempt_id = any(v_attempt_ids);
    get diagnostics v_deleted = row_count;
  end if;

  v_remaining := p_limit - v_deleted;
  if v_remaining > 0 then
    select coalesce(array_agg(candidate.reservation_key), array[]::text[])
      into v_reservation_keys
      from (
        select rate_receipt.reservation_key
          from public.comment_translator_paid_message_rate_reservations rate_receipt
         where rate_receipt.expires_at <= p_now
           and rate_receipt.reservation_state in ('reserved', 'committed', 'released')
        order by rate_receipt.expires_at, rate_receipt.reservation_key
        limit v_remaining
      ) candidate;

    if cardinality(v_reservation_keys) > 0 then
      foreach v_reservation_key in array v_reservation_keys loop
        -- This is the same deterministic lock and ordering used by reserve.
        perform pg_advisory_xact_lock(hashtextextended(v_reservation_key, 47290113));

        perform 1
          from public.comment_translator_paid_message_rate_reservations rate_receipt
         where rate_receipt.reservation_key = v_reservation_key
           and rate_receipt.expires_at <= p_now
           and rate_receipt.reservation_state in ('reserved', 'committed', 'released')
         for update;
        if found then
          insert into public.comment_translator_paid_message_rate_reservation_tombstones (
            reservation_key,
            tombstoned_at,
            expires_at
          )
          values (v_reservation_key, p_now, p_now + interval '7 days')
          on conflict (reservation_key) do update
            set tombstoned_at = excluded.tombstoned_at,
                expires_at = excluded.expires_at;

          delete from public.comment_translator_paid_message_rate_reservations
           where reservation_key = v_reservation_key;
          get diagnostics v_rate_deleted_for_key = row_count;
          v_rate_deleted := v_rate_deleted + v_rate_deleted_for_key;
        end if;
      end loop;
    end if;
  end if;

  v_tombstone_remaining := p_limit - v_deleted - v_rate_deleted;
  if v_tombstone_remaining > 0 then
    select coalesce(array_agg(candidate.reservation_key), array[]::text[])
      into v_tombstone_keys
      from (
        select tombstone.reservation_key
          from public.comment_translator_paid_message_rate_reservation_tombstones tombstone
         where tombstone.expires_at <= p_now
        order by tombstone.expires_at, tombstone.reservation_key
        limit v_tombstone_remaining
      ) candidate;

    if cardinality(v_tombstone_keys) > 0 then
      foreach v_tombstone_key in array v_tombstone_keys loop
        -- Reserve and both cleanup phases use the same per-key lock. Recheck
        -- expiry after locking so a concurrently refreshed tombstone survives.
        perform pg_advisory_xact_lock(hashtextextended(v_tombstone_key, 47290113));
        perform 1
          from public.comment_translator_paid_message_rate_reservation_tombstones tombstone
         where tombstone.reservation_key = v_tombstone_key
           and tombstone.expires_at <= p_now
         for update;
        if found then
          delete from public.comment_translator_paid_message_rate_reservation_tombstones
           where reservation_key = v_tombstone_key
             and expires_at <= p_now;
          get diagnostics v_tombstone_deleted_for_key = row_count;
          v_tombstone_deleted := v_tombstone_deleted + v_tombstone_deleted_for_key;
        end if;
      end loop;
    end if;
  end if;

  v_bucket_remaining := p_limit - v_deleted - v_rate_deleted - v_tombstone_deleted;
  if v_bucket_remaining > 0 then
    with bucket_candidates as (
      select rate_bucket.owner_user_id, rate_bucket.minute_start
        from public.comment_translator_paid_message_rate_buckets rate_bucket
       where rate_bucket.expires_at <= p_now
         and not exists (
           select 1
             from public.comment_translator_paid_message_rate_reservations rate_receipt
            where rate_receipt.owner_user_id = rate_bucket.owner_user_id
              and rate_receipt.minute_start = rate_bucket.minute_start
         )
       order by rate_bucket.expires_at, rate_bucket.owner_user_id, rate_bucket.minute_start
       limit v_bucket_remaining
       for update of rate_bucket skip locked
    )
    delete from public.comment_translator_paid_message_rate_buckets rate_bucket
     using bucket_candidates candidate
     where rate_bucket.owner_user_id = candidate.owner_user_id
       and rate_bucket.minute_start = candidate.minute_start;
    get diagnostics v_bucket_deleted = row_count;
  end if;

  return v_deleted + v_rate_deleted + v_tombstone_deleted + v_bucket_deleted;
end;
$$;

create or replace function public.ct_paid_close_billing_period(
  p_owner_user_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_owner_cost public.comment_translator_paid_owner_cost_buckets%rowtype;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_period_end <= p_period_start or p_period_end > p_now then
    raise exception 'billing period is not eligible for close';
  end if;

  select *
    into v_usage
    from public.comment_translator_paid_billing_period_usage
   where owner_user_id = p_owner_user_id
     and period_start = p_period_start
     and period_end = p_period_end
   for update;
  select *
    into v_owner_cost
    from public.comment_translator_paid_owner_cost_buckets
   where owner_user_id = p_owner_user_id
     and period_start = p_period_start
     and period_end = p_period_end
   for update;

  if v_usage.id is not null
    and v_usage.period_state <> 'closed'
    and v_usage.reserved_input_characters > 0
  then
    raise exception 'billing period has unresolved character reservations';
  end if;
  if v_owner_cost.id is not null
    and v_owner_cost.period_state <> 'closed'
    and v_owner_cost.reserved_cost_micros > 0
  then
    raise exception 'billing period has unresolved cost reservations';
  end if;

  if v_usage.id is not null and v_usage.period_state <> 'closed' then
    update public.comment_translator_paid_billing_period_usage
       set period_state = 'closed',
           period_closed_at = p_now,
           updated_at = p_now
     where id = v_usage.id;
  end if;
  if v_owner_cost.id is not null and v_owner_cost.period_state <> 'closed' then
    update public.comment_translator_paid_owner_cost_buckets
       set period_state = 'closed',
           period_closed_at = p_now,
           updated_at = p_now
     where id = v_owner_cost.id;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_close_billing_period_reconciled(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_owner_user_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  perform 1
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
     and owner_user_id = p_owner_user_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
     and reconcile_work_kind = 'billing-period-rollover'
   for update;
  if not found then
    raise exception 'stale billing rollover lease token is not valid for close';
  end if;
  return public.ct_paid_close_billing_period(
    p_owner_user_id,
    p_period_start,
    p_period_end,
    p_now
  );
end;
$$;

create or replace function public.ct_paid_close_utc_month(
  p_utc_month date,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_global public.comment_translator_paid_global_cost_buckets%rowtype;
  v_azure public.comment_translator_paid_azure_fallback_buckets%rowtype;
begin
  p_now := statement_timestamp();
  if date_trunc('month', p_utc_month)::date <> p_utc_month then
    raise exception 'UTC month is not month-aligned';
  end if;
  if p_utc_month >= date_trunc('month', p_now at time zone 'UTC')::date then
    raise exception 'UTC month is not eligible for close';
  end if;
  perform pg_advisory_xact_lock(47290102);

  select *
    into v_global
    from public.comment_translator_paid_global_cost_buckets
   where utc_month = p_utc_month
   for update;
  select *
    into v_azure
    from public.comment_translator_paid_azure_fallback_buckets
   where utc_month = p_utc_month
   for update;

  if v_global.id is not null
    and v_global.bucket_state <> 'closed'
    and v_global.reserved_cost_micros > 0
  then
    raise exception 'UTC month has unresolved OpenAI cost reservations';
  end if;
  if v_azure.id is not null
    and v_azure.bucket_state <> 'closed'
    and v_azure.reserved_paid_characters > 0
  then
    raise exception 'UTC month has unresolved Azure reservations';
  end if;

  if v_global.id is not null and v_global.bucket_state <> 'closed' then
    update public.comment_translator_paid_global_cost_buckets
       set bucket_state = 'closed',
           closed_at = p_now,
           updated_at = p_now
     where id = v_global.id;
  end if;
  if v_azure.id is not null and v_azure.bucket_state <> 'closed' then
    update public.comment_translator_paid_azure_fallback_buckets
       set bucket_state = 'closed',
           closed_at = p_now,
           updated_at = p_now
     where id = v_azure.id;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_close_utc_month_reconciled(
  p_work_item_id uuid,
  p_reconcile_lease_token uuid,
  p_utc_month date,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_oldest_open_month date;
  v_more_overdue boolean;
begin
  p_now := statement_timestamp();
  if date_trunc('month', p_utc_month)::date <> p_utc_month
    or p_utc_month >= date_trunc('month', p_now at time zone 'UTC')::date
  then
    raise exception 'UTC rollover upper month is not eligible for close';
  end if;
  perform 1
    from public.comment_translator_paid_maintenance_work_items
   where id = p_work_item_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
     and work_kind = 'utc-month-cost-rollover'
   for update;
  if not found then
    raise exception 'stale UTC rollover lease token is not valid for close';
  end if;

  select min(overdue.utc_month)
    into v_oldest_open_month
    from (
      select utc_month
        from public.comment_translator_paid_global_cost_buckets
       where utc_month <= p_utc_month
         and bucket_state <> 'closed'
      union
      select utc_month
        from public.comment_translator_paid_azure_fallback_buckets
       where utc_month <= p_utc_month
         and bucket_state <> 'closed'
    ) overdue;

  if v_oldest_open_month is null then
    return false;
  end if;

  perform public.ct_paid_close_utc_month(v_oldest_open_month, p_now);

  select exists (
    select 1
      from public.comment_translator_paid_global_cost_buckets
     where utc_month <= p_utc_month
       and bucket_state <> 'closed'
    union all
    select 1
      from public.comment_translator_paid_azure_fallback_buckets
     where utc_month <= p_utc_month
       and bucket_state <> 'closed'
  ) into v_more_overdue;
  return v_more_overdue;
end;
$$;

create or replace function public.ct_paid_commit_billing_period_characters(
  p_attempt_id text,
  p_provider_attempt text,
  p_actual_characters bigint default null,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_commit_characters bigint;
begin
  p_now := statement_timestamp();
  if length(trim(p_provider_attempt)) = 0 or length(trim(p_provider_attempt)) > 200 then
    raise exception 'provider attempt is not valid';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;
  if v_logical.logical_state = 'committed' then
    return v_logical.committed_input_characters;
  end if;
  if v_logical.logical_state = 'released' then
    return 0;
  end if;

  if v_attempt.attempt_state in ('committed', 'expired', 'released') then
    return v_attempt.committed_input_characters;
  end if;

  if v_attempt.committed_input_characters > 0 then
    return v_attempt.committed_input_characters;
  end if;
  if v_attempt.billing_period_usage_id is null or v_attempt.reserved_input_characters <= 0 then
    return 0;
  end if;
  if v_attempt.billing_period_usage_id is distinct from v_logical.billing_period_usage_id
    or v_attempt.owner_user_id <> v_logical.owner_user_id
    or v_attempt.period_start is distinct from v_logical.period_start
    or v_attempt.period_end is distinct from v_logical.period_end
  then
    raise exception 'logical attempt billing period binding conflict';
  end if;

  v_commit_characters := coalesce(p_actual_characters, v_attempt.reserved_input_characters);
  if v_commit_characters <= 0 or v_commit_characters > v_logical.input_characters then
    raise exception 'billing period character commit is not valid';
  end if;

  update public.comment_translator_paid_billing_period_usage
     set reserved_input_characters = reserved_input_characters - v_logical.input_characters,
         committed_input_characters = committed_input_characters + v_commit_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id
     and reserved_input_characters >= v_logical.input_characters;
  if not found then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         committed_input_characters = case
           when provider_attempt = p_provider_attempt then v_commit_characters
           else committed_input_characters
         end,
         updated_at = p_now
    where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'committed',
         committed_input_characters = v_commit_characters,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  return v_commit_characters;
end;
$$;

create or replace function public.ct_paid_commit_checkout_redirect(
  p_owner_user_id uuid,
  p_lifecycle_id uuid,
  p_hold_id uuid,
  p_customer_binding_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text,
  p_stripe_expires_at timestamptz,
  p_idempotency_key text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_customer public.comment_translator_paid_customers%rowtype;
  v_session public.comment_translator_paid_checkout_session_bindings%rowtype;
  v_subscription public.comment_translator_paid_subscription_bindings%rowtype;
begin
  p_now := statement_timestamp();
  if p_stripe_checkout_session_id is null
    or length(trim(p_stripe_checkout_session_id)) = 0
    or p_stripe_customer_id is null
    or length(trim(p_stripe_customer_id)) = 0
    or p_stripe_expires_at is null
    or not isfinite(p_stripe_expires_at)
    or p_idempotency_key is null
    or length(trim(p_idempotency_key)) = 0
  then
    return false;
  end if;

  perform pg_advisory_xact_lock(47290101);
  select * into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  select * into v_hold
    from public.comment_translator_paid_checkout_holds
   where id = p_hold_id
   for update;
  select * into v_customer
    from public.comment_translator_paid_customers
   where id = p_customer_binding_id
   for update;
  select * into v_session
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
      or hold_id = p_hold_id
      or stripe_checkout_session_id = p_stripe_checkout_session_id
   order by created_at
   limit 1
   for update;
  select * into v_subscription
    from public.comment_translator_paid_subscription_bindings
   where lifecycle_id = p_lifecycle_id
   for update;

  return v_lifecycle.id is not null
    and v_lifecycle.owner_user_id = p_owner_user_id
    and v_lifecycle.customer_binding_id = p_customer_binding_id
    and not v_lifecycle.is_terminal
    and v_lifecycle.lifecycle_state in ('checkout_hold', 'incomplete')
    and v_hold.id is not null
    and v_hold.lifecycle_id = p_lifecycle_id
    and v_hold.owner_user_id = p_owner_user_id
    and v_hold.hold_state in ('held', 'converted')
    and v_hold.idempotency_key is not distinct from p_idempotency_key
    and v_hold.checkout_expires_at_target is not distinct from p_stripe_expires_at
    and v_customer.id is not null
    and v_customer.owner_user_id = p_owner_user_id
    and v_customer.stripe_customer_id = p_stripe_customer_id
    and v_session.id is not null
    and v_session.lifecycle_id = p_lifecycle_id
    and v_session.hold_id = p_hold_id
    and v_session.owner_user_id = p_owner_user_id
    and v_session.customer_binding_id = p_customer_binding_id
    and v_session.stripe_checkout_session_id = p_stripe_checkout_session_id
    and v_session.stripe_customer_id = p_stripe_customer_id
    and v_session.stripe_expires_at is not distinct from p_stripe_expires_at
    and v_subscription.id is null;
end;
$$;

create or replace function public.ct_paid_commit_terminal_openai_partial(
  p_attempt_id text,
  p_provider_attempt text,
  p_actual_characters bigint,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_latest_receipt public.comment_translator_paid_attempt_receipts%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_unsafe_receipt_count integer;
  v_duplicate_success_id_count integer;
  v_durable_successful_characters bigint;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_attempt_id is null
    or p_attempt_id !~ '^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$'
    or p_provider_attempt is null
    or length(trim(p_provider_attempt)) = 0
    or length(p_provider_attempt) > 200
  then
    raise exception 'terminal OpenAI partial receipt reference is not valid';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;

  perform 1
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
   order by created_at, id
   for update;

  select *
    into v_latest_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
   order by created_at desc, id desc
   limit 1;
  if v_latest_receipt.attempt_id is null
    or v_latest_receipt.provider_attempt is distinct from p_provider_attempt
  then
    raise exception 'terminal OpenAI partial requires the latest provider receipt';
  end if;

  select count(*)::integer
    into v_unsafe_receipt_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and (
       provider_kind <> 'openai_attempt'
       or attempt_state <> 'committed'
       or provider_failure_class is null
       or provider_failure_class not in ('invalid-response', 'rate-limit')
       or successful_metadata_recorded = false
       or not public.ct_paid_valid_successful_item_attempt_ids(successful_item_attempt_ids)
       or successful_input_characters < 0
       or successful_input_characters > 7500
       or ((cardinality(successful_item_attempt_ids) = 0) <> (successful_input_characters = 0))
       or billing_period_usage_id is distinct from v_logical.billing_period_usage_id
       or owner_user_id is distinct from v_logical.owner_user_id
       or period_start is distinct from v_logical.period_start
       or period_end is distinct from v_logical.period_end
     );
  if v_unsafe_receipt_count > 0 then
    raise exception 'terminal OpenAI partial has an active or unknown provider receipt';
  end if;

  select count(*)::integer
    into v_duplicate_success_id_count
    from (
      select successful_item_attempt_id
        from public.comment_translator_paid_attempt_receipts receipt
        cross join lateral unnest(receipt.successful_item_attempt_ids) as successful(successful_item_attempt_id)
       where receipt.attempt_id = p_attempt_id
       group by successful_item_attempt_id
      having count(*) > 1
    ) duplicate_successes;
  if v_duplicate_success_id_count > 0 then
    raise exception 'terminal OpenAI partial has duplicate successful item identities';
  end if;

  select coalesce(sum(successful_input_characters), 0)::bigint
    into v_durable_successful_characters
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;
  if v_durable_successful_characters <= 0
    or v_durable_successful_characters is distinct from p_actual_characters
    or v_durable_successful_characters > v_logical.input_characters
  then
    raise exception 'terminal OpenAI partial character authority does not match durable receipts';
  end if;

  if v_logical.logical_state = 'committed' then
    if v_logical.committed_input_characters is distinct from v_durable_successful_characters then
      raise exception 'terminal OpenAI partial replay binding conflict';
    end if;
    return v_logical.committed_input_characters;
  end if;
  if v_logical.logical_state <> 'reserved' then
    raise exception 'terminal OpenAI partial logical attempt is not reservable';
  end if;

  select *
    into v_usage
    from public.comment_translator_paid_billing_period_usage
   where id = v_logical.billing_period_usage_id
   for update;
  if v_usage.id is null then
    raise exception 'billing period usage bucket is missing';
  end if;
  if v_usage.reserved_input_characters < v_logical.input_characters then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_billing_period_usage
     set reserved_input_characters = reserved_input_characters - v_logical.input_characters,
         committed_input_characters = committed_input_characters + v_durable_successful_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id
     and reserved_input_characters >= v_logical.input_characters;
  if not found then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         committed_input_characters = case
           when provider_attempt = p_provider_attempt then v_durable_successful_characters
           else committed_input_characters
         end,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'committed',
         committed_input_characters = v_durable_successful_characters,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_session_leases
     set lease_state = 'released',
         lease_until = p_now,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and lease_state in ('active', 'uncertain');

  return v_durable_successful_characters;
end;
$$;

create or replace function public.ct_paid_convert_capacity(
  p_lifecycle_id uuid,
  p_lifecycle_stage text,
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_existing public.comment_translator_paid_capacity_reservations%rowtype;
  v_target_capacity_stage text;
begin
  p_now := statement_timestamp();
  if p_lifecycle_stage not in (
    'incomplete', 'active', 'cancel_at_period_end',
    'payment_failure_hold', 'dispute', 'cancel_pending', 'reconciliation'
  ) then
    raise exception 'capacity stage is not valid';
  end if;

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null or v_lifecycle.is_terminal then
    raise exception 'billing lifecycle is not capacity eligible';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for capacity update';
  end if;

  select *
    into v_existing
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_existing.id is null or v_existing.reservation_state = 'released' then
    raise exception 'capacity reservation is missing';
  end if;
  if v_existing.owner_user_id <> v_lifecycle.owner_user_id then
    raise exception 'capacity owner binding conflict';
  end if;

  v_target_capacity_stage := case v_lifecycle.lifecycle_state
    when 'incomplete' then 'incomplete'
    when 'active' then 'active'
    when 'cancel_at_period_end' then 'cancel_at_period_end'
    when 'past_due' then 'payment_failure_hold'
    when 'unpaid' then 'payment_failure_hold'
    when 'dispute' then 'dispute'
    when 'cancel_pending' then 'cancel_pending'
    when 'paid_unentitled_reconciliation' then 'reconciliation'
    when 'refund_reconciliation' then 'reconciliation'
    when 'dispute_reconciliation' then 'reconciliation'
    else null
  end;
  if v_target_capacity_stage is null
    or p_lifecycle_stage is distinct from v_target_capacity_stage
  then
    raise exception 'capacity stage does not match billing lifecycle';
  end if;

  update public.comment_translator_paid_capacity_reservations
     set reservation_state = 'consuming',
         lifecycle_stage = p_lifecycle_stage,
         updated_at = p_now
   where id = v_existing.id
     and reservation_state <> 'released';

  if not found then
    raise exception 'capacity reservation is missing';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_disable_provider_circuit(
  p_provider text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
begin
  p_now := statement_timestamp();
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;

  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = p_provider
   for update;
  if v_circuit.provider is null then
    raise exception 'provider circuit is not configured';
  end if;
  if v_circuit.circuit_state = 'disabled' then
    return true;
  end if;

  update public.comment_translator_paid_provider_circuits
     set circuit_state = 'disabled',
         failure_count = 0,
         window_started_at = null,
         degraded_until = null,
         probe_attempt_id = null,
         probe_lease_until = null,
         last_error_class = null,
         updated_at = p_now
   where provider = p_provider;
  return found;
end;
$$;

create or replace function public.ct_paid_expire_checkout_hold(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_hold_id uuid,
  p_stripe_session_status text,
  p_stripe_session_checked_at timestamptz,
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_session public.comment_translator_paid_checkout_session_bindings%rowtype;
  v_subscription public.comment_translator_paid_subscription_bindings%rowtype;
  v_entitlement public.comment_translator_paid_entitlements%rowtype;
  v_capacity public.comment_translator_paid_capacity_reservations%rowtype;
begin
  p_now := statement_timestamp();
  if p_owner_user_id is null
    or p_stripe_session_status is distinct from 'expired'
    or p_stripe_session_checked_at is null
    or not isfinite(p_stripe_session_checked_at)
    or p_stripe_session_checked_at > p_now
  then
    raise exception 'checkout session expiry confirmation is not valid';
  end if;
  perform pg_advisory_xact_lock(47290101);
  select * into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  select * into v_hold
    from public.comment_translator_paid_checkout_holds
   where id = p_hold_id
   for update;
  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_hold.id is null
    or v_hold.lifecycle_id <> p_lifecycle_id
    or v_hold.owner_user_id <> p_owner_user_id
  then
    raise exception 'checkout hold binding conflict';
  end if;
  if p_reconcile_lease_token is not null
    and (
      v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
      or v_lifecycle.reconcile_lease_until is null
      or v_lifecycle.reconcile_lease_until <= p_now
    )
  then
    raise exception 'stale reconcile lease token is not valid for checkout expiry';
  end if;
  if p_reconcile_lease_token is null
    and v_lifecycle.reconcile_lease_token is not null
    and v_lifecycle.reconcile_lease_until is not null
    and v_lifecycle.reconcile_lease_until > p_now
  then
    raise exception 'active reconcile lease token is required for checkout expiry';
  end if;
  select * into v_session
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_session.id is null
    or v_session.lifecycle_id <> p_lifecycle_id
    or v_session.hold_id <> p_hold_id
    or v_session.owner_user_id <> p_owner_user_id
    or v_session.customer_binding_id <> v_lifecycle.customer_binding_id
    or p_stripe_session_checked_at < greatest(v_session.stripe_expires_at, v_hold.checkout_expires_at_target)
  then
    raise exception 'checkout session binding conflict';
  end if;
  select * into v_subscription
    from public.comment_translator_paid_subscription_bindings
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_subscription.id is not null then
    raise exception 'subscription binding prevents checkout hold release';
  end if;
  select * into v_entitlement
    from public.comment_translator_paid_entitlements
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_entitlement.id is not null
    and v_entitlement.entitlement_status not in ('canceled', 'incomplete_expired', 'inactive')
  then
    raise exception 'nonterminal entitlement prevents checkout hold release';
  end if;
  if v_entitlement.id is not null
    and (
      v_entitlement.owner_user_id <> p_owner_user_id
      or v_entitlement.customer_binding_id <> v_lifecycle.customer_binding_id
      or v_entitlement.entitlement_status <> 'incomplete_expired'
      or v_entitlement.dispute_state <> 'none'
    )
  then
    raise exception 'entitlement binding prevents checkout hold release';
  end if;
  select * into v_capacity
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_hold.hold_state = 'released'
    and v_lifecycle.is_terminal
    and v_lifecycle.lifecycle_state = 'incomplete_expired'
    and v_capacity.reservation_state = 'released'
  then
    return true;
  end if;
  if v_lifecycle.is_terminal
    or v_hold.hold_state not in ('held', 'expire_required', 'converted')
    or v_capacity.id is null
    or v_capacity.owner_user_id <> p_owner_user_id
    or v_capacity.reservation_state not in ('held', 'consuming')
  then
    raise exception 'checkout hold release is not valid';
  end if;
  update public.comment_translator_paid_checkout_holds
     set hold_state = 'released', released_at = p_now, updated_at = p_now
   where id = p_hold_id;
  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = 'incomplete_expired', is_terminal = true,
         next_reconcile_at = null,
         reconcile_lease_until = case
           when p_reconcile_lease_token is null then null
           else reconcile_lease_until
         end,
         reconcile_lease_token = case
           when p_reconcile_lease_token is null then null
           else reconcile_lease_token
         end,
         last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id;
  update public.comment_translator_paid_capacity_reservations
     set reservation_state = 'released', released_at = p_now, updated_at = p_now
   where id = v_capacity.id;
  return true;
end;
$$;

create or replace function public.ct_paid_extend_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_openai_slot_lease_token uuid,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  update public.comment_translator_paid_session_leases
     set lease_until = p_now + interval '120 seconds',
         updated_at = p_now
   where attempt_id = p_attempt_id
     and lease_token = p_session_lease_token
     and lease_state in ('active', 'uncertain')
     and lease_until > p_now;
  if not found then
    raise exception 'stale session lease token is not valid for update';
  end if;

  update public.comment_translator_paid_openai_slots
     set lease_until = p_now + interval '120 seconds',
         updated_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt
      and lease_token = p_openai_slot_lease_token
      and slot_state in ('active', 'uncertain')
     and lease_until > p_now;
  if not found then
    raise exception 'stale OpenAI slot token is not valid for update';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set expires_at = p_now + interval '120 seconds',
         updated_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt
      and attempt_state in ('reserved', 'uncertain');
  if not found then
    raise exception 'attempt receipt is not extendable';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_finalize_azure_fallback(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_outcome text,
  p_actual_input_characters bigint default null,
  p_now timestamptz default now(),
  p_provider_failure_class text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_actual_characters bigint;
  v_billing_characters bigint;
  v_logical_characters_already_settled boolean;
  v_active_sibling_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_outcome not in ('completed', 'uncertain_inflight', 'provider_not_reached', 'provider_reached_failed') then
    raise exception 'Azure fallback outcome is not valid';
  end if;
  if p_outcome = 'provider_not_reached' and p_provider_failure_class is null then
    -- Backward-compatible trusted caller normalization. No raw provider detail is
    -- persisted; new callers may provide a more specific sanitized class.
    p_provider_failure_class := 'network';
  end if;
  if p_outcome in ('uncertain_inflight', 'provider_not_reached', 'provider_reached_failed')
    and p_provider_failure_class is null
  then
    raise exception 'Azure provider failure class is required';
  end if;
  if p_provider_failure_class is not null
    and p_provider_failure_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'invalid-response', 'quota', 'configuration', 'policy')
  then
    raise exception 'Azure provider failure class is not valid';
  end if;
  if p_outcome = 'completed' and p_provider_failure_class is not null then
    raise exception 'completed Azure attempt cannot bind a provider failure class';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;
  if v_attempt.provider_kind <> 'azure_direct_fallback' then
    raise exception 'attempt provider binding conflict';
  end if;
  if v_attempt.attempt_state in ('committed', 'released', 'expired') then
    if v_attempt.attempt_state = 'committed' then
      if v_attempt.provider_failure_class is null and p_outcome = 'completed' then
        if coalesce(p_actual_input_characters, v_attempt.reserved_input_characters) is distinct from v_attempt.committed_input_characters then
          raise exception 'Azure terminal attempt outcome binding conflict';
        end if;
        return true;
      end if;
      if v_attempt.provider_failure_class is not null
        and p_outcome = 'provider_reached_failed'
        and v_attempt.provider_failure_class is not distinct from p_provider_failure_class
      then
        return true;
      end if;
    end if;
    if v_attempt.attempt_state = 'released'
      and p_outcome = 'provider_not_reached'
      and v_attempt.provider_failure_class is not distinct from p_provider_failure_class
    then
      return true;
    end if;
    if v_attempt.attempt_state = 'expired' then
      raise exception 'Azure terminal attempt outcome binding conflict';
    end if;
    raise exception 'Azure terminal attempt outcome binding conflict';
  end if;
  if p_outcome in ('uncertain_inflight', 'provider_not_reached', 'provider_reached_failed')
    and v_attempt.provider_failure_class is not null
    and v_attempt.provider_failure_class is distinct from p_provider_failure_class
  then
    raise exception 'Azure provider failure class binding conflict';
  end if;
  if p_outcome = 'provider_reached_failed' then
    raise exception 'Azure reached-provider failure is not valid for an active attempt';
  end if;
  select *
    into v_lease
    from public.comment_translator_paid_session_leases
   where attempt_id = p_attempt_id
   for update;
  if v_lease.id is null
    or v_lease.lease_token is distinct from p_session_lease_token
  then
    raise exception 'stale session lease token is not valid for update';
  end if;
  if v_lease.lease_state not in ('active', 'uncertain')
    or v_lease.lease_until <= p_now
  then
    raise exception 'stale session lease token is not valid for update';
  end if;

  select logical_state = 'committed'
    into v_logical_characters_already_settled
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;

  if p_outcome = 'uncertain_inflight' then
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'uncertain',
           provider_failure_class = p_provider_failure_class,
           expires_at = p_now + interval '120 seconds',
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
    return true;
  elsif p_outcome = 'completed' then
    v_actual_characters := coalesce(p_actual_input_characters, v_attempt.reserved_input_characters);
    v_billing_characters := case when v_logical_characters_already_settled then 0 else v_actual_characters end;
    if v_actual_characters < 0 or v_actual_characters > v_attempt.reserved_input_characters then
      raise exception 'Azure fallback character commit is not valid';
    end if;
    perform public.ct_paid_commit_billing_period_characters(
      p_attempt_id,
      p_provider_attempt,
      v_billing_characters,
      p_now
    );
    update public.comment_translator_paid_azure_fallback_buckets
       set reserved_paid_characters = reserved_paid_characters - v_attempt.reserved_input_characters,
           committed_paid_characters = committed_paid_characters + v_actual_characters,
           updated_at = p_now
     where id = v_attempt.azure_bucket_id;
    if not found then
      raise exception 'Azure fallback bucket is missing';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'committed',
           provider_failure_class = null,
           updated_at = p_now
       where attempt_id = p_attempt_id
         and provider_attempt = p_provider_attempt;
  elsif p_outcome = 'provider_not_reached' then
    update public.comment_translator_paid_azure_fallback_buckets
       set reserved_paid_characters = reserved_paid_characters - v_attempt.reserved_input_characters,
           updated_at = p_now
     where id = v_attempt.azure_bucket_id;
    if not found then
      raise exception 'Azure fallback bucket is missing';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'released',
           provider_failure_class = p_provider_failure_class,
           updated_at = p_now
       where attempt_id = p_attempt_id
         and provider_attempt = p_provider_attempt;
    perform public.ct_paid_settle_logical_attempt_after_provider_failure(p_attempt_id, false, p_now);
  end if;

  select count(*)::integer
    into v_active_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and attempt_state in ('reserved', 'uncertain')
     and expires_at > p_now;
  if v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released', lease_until = p_now, updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  end if;
  if p_outcome <> 'completed' then
    update public.comment_translator_paid_provider_circuits
       set probe_attempt_id = null,
           probe_lease_until = null,
           updated_at = p_now
     where provider = 'azure_fallback'
       and circuit_state = 'half_open'
       and probe_attempt_id = p_attempt_id;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_finalize_azure_fallback_with_billing_characters(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_outcome text,
  p_actual_input_characters bigint default null,
  p_actual_billing_input_characters bigint default null,
  p_now timestamptz default now(),
  p_provider_failure_class text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_active_sibling_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_outcome <> 'completed' then
    raise exception 'combined Azure billing finalization requires completed outcome';
  end if;
  if p_provider_failure_class is not null then
    raise exception 'completed Azure attempt cannot bind a provider failure class';
  end if;
  if p_actual_input_characters is null
    or p_actual_input_characters <= 0
    or p_actual_billing_input_characters is null
    or p_actual_billing_input_characters <= 0
  then
    raise exception 'combined Azure billing characters are not valid';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;
  if v_attempt.provider_kind <> 'azure_direct_fallback' then
    raise exception 'attempt provider binding conflict';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;

  if v_attempt.attempt_state in ('committed', 'released', 'expired') then
    if v_attempt.attempt_state = 'committed'
      and v_attempt.provider_failure_class is null
      and p_actual_input_characters = v_attempt.committed_input_characters
      and v_logical.logical_state = 'committed'
      and p_actual_billing_input_characters = v_logical.committed_input_characters
    then
      return true;
    end if;
    raise exception 'Azure terminal attempt outcome binding conflict';
  end if;
  if v_logical.logical_state <> 'reserved' then
    raise exception 'logical attempt is not available for combined Azure billing';
  end if;
  if p_actual_billing_input_characters < p_actual_input_characters
    or p_actual_input_characters > v_attempt.reserved_input_characters
    or p_actual_billing_input_characters > v_logical.input_characters
  then
    raise exception 'combined Azure billing character commit is not valid';
  end if;

  select *
    into v_lease
    from public.comment_translator_paid_session_leases
   where attempt_id = p_attempt_id
   for update;
  if v_lease.id is null
    or v_lease.lease_token is distinct from p_session_lease_token
  then
    raise exception 'stale session lease token is not valid for update';
  end if;
  if v_lease.lease_state not in ('active', 'uncertain')
    or v_lease.lease_until <= p_now
  then
    raise exception 'stale session lease token is not valid for update';
  end if;

  perform public.ct_paid_commit_billing_period_characters(
    p_attempt_id,
    p_provider_attempt,
    p_actual_billing_input_characters,
    p_now
  );

  update public.comment_translator_paid_azure_fallback_buckets
     set reserved_paid_characters = reserved_paid_characters - v_attempt.reserved_input_characters,
         committed_paid_characters = committed_paid_characters + p_actual_input_characters,
         updated_at = p_now
   where id = v_attempt.azure_bucket_id;
  if not found then
    raise exception 'Azure fallback bucket is missing';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set attempt_state = 'committed',
         provider_failure_class = null,
         committed_input_characters = p_actual_input_characters,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt;

  select count(*)::integer
    into v_active_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and attempt_state in ('reserved', 'uncertain')
     and expires_at > p_now;
  if v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released', lease_until = p_now, updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_finalize_azure_fallback_with_metadata(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_outcome text,
  p_actual_input_characters bigint,
  p_actual_billing_input_characters bigint,
  p_provider_failure_class text,
  p_circuit_failure_state text,
  p_circuit_success_state text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_receipt public.comment_translator_paid_attempt_receipts%rowtype;
begin
  p_now := statement_timestamp();
  if p_circuit_failure_state not in ('not-required', 'pending', 'recorded')
    or p_circuit_success_state not in ('not-required', 'pending', 'recorded')
    or (p_circuit_failure_state <> 'not-required' and p_circuit_success_state <> 'not-required')
  then
    raise exception 'Azure circuit metadata is not valid';
  end if;

  select * into v_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
     and provider_kind = 'azure_direct_fallback'
   for update;
  if v_receipt.id is null then
    raise exception 'Azure attempt receipt is missing';
  end if;

  if p_actual_billing_input_characters is null then
    perform public.ct_paid_finalize_azure_fallback(
      p_attempt_id, p_provider_attempt, p_session_lease_token, p_outcome,
      p_actual_input_characters, p_now, p_provider_failure_class
    );
  else
    perform public.ct_paid_finalize_azure_fallback_with_billing_characters(
      p_attempt_id, p_provider_attempt, p_session_lease_token, p_outcome,
      p_actual_input_characters, p_actual_billing_input_characters, p_now,
      p_provider_failure_class
    );
  end if;

  update public.comment_translator_paid_attempt_receipts
     set fallback_eligible = false,
         circuit_failure_state = p_circuit_failure_state,
         circuit_success_state = p_circuit_success_state,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
     and provider_kind = 'azure_direct_fallback'
     and (
       circuit_failure_state = 'not-required'
       and circuit_success_state = 'not-required'
       or (
         circuit_failure_state is not distinct from p_circuit_failure_state
         and circuit_success_state is not distinct from p_circuit_success_state
       )
     );
  if not found then
    raise exception 'Azure circuit metadata binding conflict';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_finalize_message_rate(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_reservation_key text,
  p_translated_message_count integer,
  p_now timestamptz default now()
)
returns table (
  reservation_status text,
  minute_start timestamptz,
  reserved_messages integer,
  committed_messages integer,
  released_messages integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_reservation public.comment_translator_paid_message_rate_reservations%rowtype;
  v_session public.comment_translator_sessions%rowtype;
  v_commit_count integer;
begin
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
    or p_reservation_key is null
    or length(trim(p_reservation_key)) = 0
    or length(p_reservation_key) > 200
    or p_translated_message_count is null
    or p_translated_message_count < 0
  then
    raise exception 'Paid message-rate finalize request is not valid';
  end if;

  select * into v_session
    from public.comment_translator_sessions as paid_session
   where paid_session.owner_user_id = p_owner_user_id
     and paid_session.session_reference_id = p_session_reference_id
     and paid_session.status = 'active'
     and paid_session.plan = 'paid'
   for update;
  if v_session.id is null or v_now >= v_session.started_at + interval '3 hours' then
    raise exception 'Paid message-rate finalize session authority is unreadable';
  end if;

  select *
    into v_reservation
    from public.comment_translator_paid_message_rate_reservations as rate_reservation
   where rate_reservation.reservation_key = p_reservation_key
   for update;
  if v_reservation.reservation_key is null
    or v_reservation.owner_user_id <> p_owner_user_id
    or v_reservation.session_reference_id <> p_session_reference_id
    or v_reservation.expires_at <= v_now
  then
    raise exception 'Paid message-rate reservation is unreadable';
  end if;
  if v_reservation.reservation_state <> 'reserved' then
    if p_translated_message_count <> v_reservation.committed_messages then
      raise exception 'Paid message-rate finalize replay does not match';
    end if;
    return query
      select
        v_reservation.reservation_state,
        v_reservation.minute_start,
        v_reservation.reserved_messages,
        v_reservation.committed_messages,
        v_reservation.reserved_messages - v_reservation.committed_messages;
    return;
  end if;
  v_commit_count := greatest(p_translated_message_count, v_reservation.successful_message_count);
  if v_commit_count > v_reservation.reserved_messages then
    raise exception 'Paid message-rate finalize exceeds reservation';
  end if;

  update public.comment_translator_paid_message_rate_buckets as rate_bucket
     set reserved_messages = rate_bucket.reserved_messages - v_reservation.reserved_messages,
         committed_messages = rate_bucket.committed_messages + v_commit_count,
         updated_at = v_now
   where rate_bucket.owner_user_id = p_owner_user_id
     and rate_bucket.minute_start = v_reservation.minute_start
     and rate_bucket.reserved_messages >= v_reservation.reserved_messages;
  if not found then
    raise exception 'Paid message-rate bucket is unreadable';
  end if;
  update public.comment_translator_paid_message_rate_reservations as rate_reservation
     set committed_messages = v_commit_count,
         reservation_state = case when v_commit_count = 0 then 'released' else 'committed' end,
         updated_at = v_now
   where rate_reservation.reservation_key = p_reservation_key;
  return query
    select
      case when v_commit_count = 0 then 'released' else 'committed' end,
      v_reservation.minute_start,
      v_reservation.reserved_messages,
      v_commit_count,
      v_reservation.reserved_messages - v_commit_count;
end;
$$;

create or replace function public.ct_paid_finalize_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_openai_slot_lease_token uuid,
  p_outcome text,
  p_actual_input_characters bigint default null,
  p_actual_cost_micros bigint default null,
  p_provider_failure_class text default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_slot public.comment_translator_paid_openai_slots%rowtype;
  v_actual_characters bigint;
  v_billing_characters bigint;
  v_active_sibling_count integer;
  v_openai_receipt_count integer;
  v_actual_cost bigint;
  v_logical_characters_already_settled boolean;
  v_rate public.comment_translator_paid_openai_rate_reservations%rowtype;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_outcome not in ('completed', 'uncertain_inflight', 'provider_not_reached', 'provider_reached_failed') then
    raise exception 'OpenAI attempt outcome is not valid';
  end if;
  if p_outcome in ('uncertain_inflight', 'provider_not_reached', 'provider_reached_failed')
    and p_provider_failure_class is null
  then
    raise exception 'OpenAI provider failure class is required';
  end if;
  if p_provider_failure_class is not null
    and p_provider_failure_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'invalid-response', 'quota', 'configuration', 'policy')
  then
    raise exception 'OpenAI provider failure class is not valid';
  end if;
  if p_outcome = 'provider_not_reached'
    and p_provider_failure_class not in ('network', 'timeout', 'configuration', 'policy')
  then
    raise exception 'OpenAI outcome and failure class binding conflict';
  end if;
  if p_outcome = 'completed' and p_provider_failure_class is not null then
    raise exception 'completed OpenAI attempt cannot bind a provider failure class';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;
  if v_attempt.provider_kind <> 'openai_attempt' then
    raise exception 'attempt provider binding conflict';
  end if;
  if v_attempt.attempt_state in ('committed', 'released', 'expired') then
    if v_attempt.attempt_state = 'committed' then
      if v_attempt.provider_failure_class is null and p_outcome = 'completed' then
        if coalesce(p_actual_input_characters, v_attempt.requested_input_characters) is distinct from v_attempt.committed_input_characters
          or coalesce(p_actual_cost_micros, v_attempt.requested_cost_micros) is distinct from v_attempt.committed_cost_micros
        then
          raise exception 'OpenAI terminal attempt outcome binding conflict';
        end if;
        return true;
      end if;
      if v_attempt.provider_failure_class is not null
        and p_outcome = 'provider_reached_failed'
        and v_attempt.provider_failure_class is not distinct from p_provider_failure_class
      then
        return true;
      end if;
    end if;
    if v_attempt.attempt_state = 'released'
      and p_outcome = 'provider_not_reached'
      and v_attempt.provider_failure_class is not distinct from p_provider_failure_class
    then
      return true;
    end if;
    if v_attempt.attempt_state = 'expired' then
      raise exception 'OpenAI terminal attempt outcome binding conflict';
    end if;
    raise exception 'OpenAI terminal attempt outcome binding conflict';
  end if;

  if p_outcome in ('uncertain_inflight', 'provider_not_reached', 'provider_reached_failed')
    and v_attempt.provider_failure_class is not null
    and v_attempt.provider_failure_class is distinct from p_provider_failure_class
  then
    raise exception 'OpenAI provider failure class binding conflict';
  end if;
  select *
    into v_lease
    from public.comment_translator_paid_session_leases
   where attempt_id = p_attempt_id
   for update;
  if v_lease.id is null
    or v_lease.lease_token is distinct from p_session_lease_token
    or v_lease.provider_attempt is distinct from p_provider_attempt
    or v_lease.owner_user_id is distinct from v_attempt.owner_user_id
    or v_lease.session_reference_id is distinct from v_attempt.session_reference_id
  then
    raise exception 'stale session lease token is not valid for update';
  end if;

  select *
    into v_slot
    from public.comment_translator_paid_openai_slots
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_slot.id is null
    or v_slot.lease_token is distinct from p_openai_slot_lease_token
  then
    raise exception 'stale OpenAI slot token is not valid for update';
  end if;

  if v_lease.lease_state not in ('active', 'uncertain')
    or v_lease.lease_until <= p_now
    or v_slot.slot_state not in ('active', 'uncertain')
    or v_slot.lease_until <= p_now
  then
    raise exception 'stale provider lease token is not valid for update';
  end if;

  select logical_state = 'committed'
    into v_logical_characters_already_settled
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;

  if p_outcome = 'uncertain_inflight' then
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'uncertain',
           provider_failure_class = p_provider_failure_class,
           expires_at = p_now + interval '120 seconds',
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
      update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = p_now + interval '120 seconds',
           updated_at = p_now
      where attempt_id = p_attempt_id
        and lease_token = p_session_lease_token;
      update public.comment_translator_paid_openai_slots
       set slot_state = 'uncertain',
           lease_until = p_now + interval '120 seconds',
           updated_at = p_now
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt
        and lease_token = p_openai_slot_lease_token;
    update public.comment_translator_paid_openai_rate_reservations
       set reservation_state = 'uncertain',
           expires_at = p_now + interval '120 seconds'
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt;
    return true;
  end if;

  if p_outcome = 'completed' then
    v_actual_characters := coalesce(p_actual_input_characters, v_attempt.requested_input_characters);
    v_billing_characters := case when v_logical_characters_already_settled then 0 else v_actual_characters end;
    v_actual_cost := coalesce(p_actual_cost_micros, v_attempt.reserved_cost_micros);
    if v_actual_characters < 0 or v_actual_characters > v_attempt.requested_input_characters then
      raise exception 'OpenAI character commit is not valid';
    end if;
    if v_actual_cost < 0 or v_actual_cost > v_attempt.reserved_cost_micros then
      raise exception 'OpenAI cost commit is not valid';
    end if;

    perform public.ct_paid_commit_billing_period_characters(
      p_attempt_id,
      p_provider_attempt,
      v_billing_characters,
      p_now
    );

    update public.comment_translator_paid_owner_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           committed_cost_micros = committed_cost_micros + v_actual_cost,
           updated_at = p_now
     where id = v_attempt.owner_cost_bucket_id;
    if not found then
      raise exception 'OpenAI owner cost bucket is missing';
    end if;
    update public.comment_translator_paid_global_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           committed_cost_micros = committed_cost_micros + v_actual_cost,
           updated_at = p_now
     where id = v_attempt.global_cost_bucket_id;
    if not found then
      raise exception 'OpenAI global cost bucket is missing';
    end if;

    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'committed',
           provider_failure_class = null,
           reserved_cost_micros = 0,
           committed_cost_micros = v_actual_cost,
           updated_at = p_now
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt;
    update public.comment_translator_paid_openai_rate_reservations
       set reservation_state = 'completed'
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt;
  elsif p_outcome = 'provider_reached_failed' then
    -- The provider was reached, so reserved cost and RPM are conservatively
    -- consumed. Logical characters remain reserved for an allowed fallback.
    update public.comment_translator_paid_owner_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           committed_cost_micros = committed_cost_micros + v_attempt.reserved_cost_micros,
           updated_at = p_now
     where id = v_attempt.owner_cost_bucket_id;
    if not found then
      raise exception 'OpenAI owner cost bucket is missing';
    end if;
    update public.comment_translator_paid_global_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           committed_cost_micros = committed_cost_micros + v_attempt.reserved_cost_micros,
           updated_at = p_now
     where id = v_attempt.global_cost_bucket_id;
    if not found then
      raise exception 'OpenAI global cost bucket is missing';
    end if;
    select *
      into v_rate
      from public.comment_translator_paid_openai_rate_reservations
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt
     for update;
    if v_rate.id is null or v_rate.reservation_state not in ('reserved', 'uncertain') then
      raise exception 'OpenAI rate reservation is not active';
    end if;
    update public.comment_translator_paid_openai_rate_reservations
       set reservation_state = 'completed'
     where id = v_rate.id
       and reservation_state in ('reserved', 'uncertain');
    if not found then
      raise exception 'OpenAI rate reservation is not active';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'committed',
           provider_failure_class = p_provider_failure_class,
           reserved_cost_micros = 0,
           committed_cost_micros = v_attempt.reserved_cost_micros,
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
  elsif p_outcome = 'provider_not_reached' then
    -- OpenAI provider failure releases only OpenAI cost/capacity. The logical
    -- character reservation remains available to the Azure provider attempt;
    -- Azure failure (or an explicit no-fallback release) settles it as released.
    update public.comment_translator_paid_owner_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           updated_at = p_now
     where id = v_attempt.owner_cost_bucket_id;
    if not found then
      raise exception 'OpenAI owner cost bucket is missing';
    end if;
    update public.comment_translator_paid_global_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           updated_at = p_now
     where id = v_attempt.global_cost_bucket_id;
    if not found then
      raise exception 'OpenAI global cost bucket is missing';
    end if;
    select *
      into v_rate
      from public.comment_translator_paid_openai_rate_reservations
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt
     for update;
    if v_rate.id is null or v_rate.reservation_state not in ('reserved', 'uncertain') then
      raise exception 'OpenAI rate reservation is not active';
    end if;
    update public.comment_translator_paid_openai_minute_buckets
       set reserved_requests = reserved_requests - v_rate.request_count,
           updated_at = p_now
     where minute_start = v_rate.minute_start
       and reserved_requests >= v_rate.request_count;
    if not found then
      raise exception 'OpenAI minute bucket is missing';
    end if;
    update public.comment_translator_paid_openai_rate_reservations
       set reservation_state = 'released'
     where id = v_rate.id
       and reservation_state in ('reserved', 'uncertain');
    if not found then
      raise exception 'OpenAI rate reservation is not active';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'released',
           provider_failure_class = p_provider_failure_class,
           reserved_cost_micros = 0,
           updated_at = p_now
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt;
    perform public.ct_paid_settle_logical_attempt_after_provider_failure(p_attempt_id, false, p_now);
  end if;

  select
    count(*) filter (
      where provider_attempt <> p_provider_attempt
        and attempt_state in ('reserved', 'uncertain')
        and expires_at > p_now
    )::integer,
    count(*) filter (where provider_kind = 'openai_attempt')::integer
    into v_active_sibling_count, v_openai_receipt_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;
  if (
    p_outcome = 'provider_reached_failed'
    and (
      (p_provider_failure_class = 'invalid-response' and v_openai_receipt_count = 1)
      or p_provider_failure_class in ('network', 'timeout', 'rate-limit', 'server-error')
    )
  ) or (
    p_outcome = 'provider_not_reached'
    and p_provider_failure_class in ('network', 'timeout')
  ) then
    -- A retry/fallback-eligible terminal OpenAI failure keeps the logical batch
    -- mutually exclusive while the provider slot itself is released.
    update public.comment_translator_paid_session_leases
       set lease_state = 'active',
           lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt
       and lease_token = p_session_lease_token;
  elsif v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released',
           lease_until = p_now,
           updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  end if;
  update public.comment_translator_paid_openai_slots
     set slot_state = 'released',
         lease_until = p_now,
         updated_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt
      and lease_token = p_openai_slot_lease_token;
  if not found then
    raise exception 'OpenAI slot reservation is missing';
  end if;
  if p_outcome <> 'completed' then
    update public.comment_translator_paid_provider_circuits
       set probe_attempt_id = null,
           probe_lease_until = null,
           updated_at = p_now
     where provider = 'openai'
       and circuit_state = 'half_open'
       and probe_attempt_id = p_attempt_id;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_finalize_openai_attempt_with_metadata(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_openai_slot_lease_token uuid,
  p_outcome text,
  p_actual_input_characters bigint,
  p_actual_cost_micros bigint,
  p_provider_failure_class text,
  p_successful_item_attempt_ids text[],
  p_successful_input_characters bigint,
  p_fallback_eligible boolean,
  p_circuit_failure_state text,
  p_circuit_success_state text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_receipt public.comment_translator_paid_attempt_receipts%rowtype;
begin
  p_now := statement_timestamp();
  if p_fallback_eligible is null
    or p_circuit_failure_state not in ('not-required', 'deferred', 'pending', 'recorded')
    or p_circuit_success_state not in ('not-required', 'pending', 'recorded')
    or (p_circuit_failure_state <> 'not-required' and p_circuit_success_state <> 'not-required')
  then
    raise exception 'OpenAI replay metadata is not valid';
  end if;

  select * into v_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
     and provider_kind = 'openai_attempt'
   for update;
  if v_receipt.id is null then
    raise exception 'OpenAI attempt receipt is missing';
  end if;

  perform public.ct_paid_finalize_openai_attempt_with_successes(
    p_attempt_id, p_provider_attempt, p_session_lease_token,
    p_openai_slot_lease_token, p_outcome, p_actual_input_characters,
    p_actual_cost_micros, p_provider_failure_class,
    p_successful_item_attempt_ids, p_successful_input_characters, p_now
  );

  update public.comment_translator_paid_attempt_receipts
     set fallback_eligible = p_fallback_eligible,
         circuit_failure_state = p_circuit_failure_state,
         circuit_success_state = p_circuit_success_state,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
     and provider_kind = 'openai_attempt'
     and (
       circuit_failure_state = 'not-required'
       and circuit_success_state = 'not-required'
       or (
         fallback_eligible is not distinct from p_fallback_eligible
         and circuit_failure_state is not distinct from p_circuit_failure_state
         and circuit_success_state is not distinct from p_circuit_success_state
       )
     );
  if not found then
    raise exception 'OpenAI replay metadata binding conflict';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_finalize_openai_attempt_with_successes(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_openai_slot_lease_token uuid,
  p_outcome text,
  p_actual_input_characters bigint,
  p_actual_cost_micros bigint,
  p_provider_failure_class text,
  p_successful_item_attempt_ids text[],
  p_successful_input_characters bigint,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_receipt public.comment_translator_paid_attempt_receipts%rowtype;
  v_was_terminal boolean;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if not public.ct_paid_valid_successful_item_attempt_ids(p_successful_item_attempt_ids)
    or p_successful_input_characters < 0
    or p_successful_input_characters > 7500
    or ((cardinality(p_successful_item_attempt_ids) = 0) <> (p_successful_input_characters = 0))
  then
    raise exception 'OpenAI successful item metadata is not valid';
  end if;

  select *
    into v_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
     and provider_kind = 'openai_attempt'
   for update;
  if v_receipt.attempt_id is null then
    raise exception 'OpenAI attempt receipt is missing';
  end if;

  v_was_terminal := v_receipt.attempt_state in ('committed', 'released', 'expired');
  if v_was_terminal then
    if v_receipt.successful_metadata_recorded = false
      or v_receipt.successful_item_attempt_ids is distinct from p_successful_item_attempt_ids
      or v_receipt.successful_input_characters is distinct from p_successful_input_characters
    then
      raise exception 'OpenAI successful item metadata replay binding conflict';
    end if;
  end if;

  perform public.ct_paid_finalize_openai_attempt(
    p_attempt_id,
    p_provider_attempt,
    p_session_lease_token,
    p_openai_slot_lease_token,
    p_outcome,
    p_actual_input_characters,
    p_actual_cost_micros,
    p_provider_failure_class,
    p_now
  );

  update public.comment_translator_paid_attempt_receipts
     set successful_item_attempt_ids = p_successful_item_attempt_ids,
         successful_input_characters = p_successful_input_characters,
         successful_metadata_recorded = true,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
     and provider_kind = 'openai_attempt'
     and (
       successful_metadata_recorded = false
       or (
         successful_item_attempt_ids is not distinct from p_successful_item_attempt_ids
         and successful_input_characters is not distinct from p_successful_input_characters
       )
     );
  if not found then
    raise exception 'OpenAI successful item metadata binding conflict';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_finalize_reconciler(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_next_reconcile_at timestamptz default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  update public.comment_translator_paid_billing_lifecycles
     set reconcile_lease_until = null,
         reconcile_lease_token = null,
         reconcile_work_kind = null,
         reconcile_attempt_count = 0,
         next_reconcile_at = p_next_reconcile_at,
         reconcile_backoff_seconds = 60,
         last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now;

  if found then
    return true;
  end if;

  update public.comment_translator_paid_maintenance_work_items
     set reconcile_lease_until = null,
         reconcile_lease_token = null,
         reconcile_attempt_count = 0,
         next_reconcile_at = coalesce(p_next_reconcile_at, next_reconcile_at),
         reconcile_backoff_seconds = 60,
         last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now;

  if not found then raise exception 'stale reconcile lease token is not valid for update'; end if;
  return true;
end;
$$;

create or replace function public.ct_paid_finalize_stripe_event(
  p_event_id text,
  p_lease_token uuid,
  p_receipt_status text,
  p_error_class text default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  if p_receipt_status not in ('retryable', 'complete', 'rejected') then
    raise exception 'receipt status is not valid';
  end if;

  if p_error_class is not null and p_error_class not in (
    'event-identity-conflict',
    'binding-conflict',
    'object-retrieval-failed',
    'database-transaction-failed',
    'lease-conflict',
    'unknown-event-type'
  ) then
    raise exception 'error class is not valid';
  end if;

  update public.comment_translator_paid_stripe_event_receipts
     set receipt_status = p_receipt_status,
         lease_until = null,
         lease_token = null,
         last_error_class = p_error_class,
         updated_at = p_now
   where event_id = p_event_id
     and receipt_status = 'processing'
     and lease_token = p_lease_token
     and lease_until > p_now;

  if not found then
    raise exception 'stale lease token is not valid for update';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_invoke_maintenance_http(
  p_maintenance_url text,
  p_cron_token text,
  p_authority text default 'supabase-cron'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request_id bigint;
begin
  if p_authority is distinct from 'supabase-cron'
    or p_maintenance_url is null
    or p_maintenance_url <> btrim(p_maintenance_url)
    or length(p_maintenance_url) > 2048
    or p_maintenance_url !~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*/api/comment-translator/paid-maintenance/?$'
    or p_cron_token is null
    or p_cron_token <> btrim(p_cron_token)
    or length(p_cron_token) < 1
    or length(p_cron_token) > 4096
    or p_cron_token ~ '[[:cntrl:]]'
  then
    raise exception 'paid maintenance invocation configuration is not valid';
  end if;

  if pg_catalog.to_regprocedure('net.http_get(text,jsonb,jsonb,integer)') is null then
    raise exception 'paid maintenance HTTP capability is unavailable';
  end if;

  execute $http$
    select net.http_get(
      url := $1,
      params := '{}'::jsonb,
      headers := $2,
      timeout_milliseconds := $3
    )
  $http$
  into v_request_id
  using
    p_maintenance_url,
    pg_catalog.jsonb_build_object(
      'x-comment-translator-paid-cron-token', p_cron_token,
      'x-comment-translator-paid-scheduler-authority', p_authority
    ),
    10000;

  if v_request_id is null then
    raise exception 'paid maintenance HTTP invocation was not accepted';
  end if;
end;
$$;

create or replace function public.ct_paid_mark_checkout_expire_required(
  p_owner_user_id uuid,
  p_lifecycle_id uuid,
  p_hold_id uuid,
  p_customer_binding_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text,
  p_stripe_expires_at timestamptz,
  p_idempotency_key text,
  p_checkout_expires_at_target timestamptz,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_customer public.comment_translator_paid_customers%rowtype;
  v_capacity public.comment_translator_paid_capacity_reservations%rowtype;
  v_session public.comment_translator_paid_checkout_session_bindings%rowtype;
  v_subscription public.comment_translator_paid_subscription_bindings%rowtype;
begin
  p_now := statement_timestamp();
  if p_stripe_checkout_session_id is null
    or length(trim(p_stripe_checkout_session_id)) = 0
    or p_stripe_customer_id is null
    or length(trim(p_stripe_customer_id)) = 0
    or p_stripe_expires_at is null
    or not isfinite(p_stripe_expires_at)
    or p_idempotency_key is null
    or length(trim(p_idempotency_key)) = 0
    or p_checkout_expires_at_target is null
    or not isfinite(p_checkout_expires_at_target)
  then
    raise exception 'checkout expire-required request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290101);
  select * into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  select * into v_hold
    from public.comment_translator_paid_checkout_holds
   where id = p_hold_id
   for update;
  select * into v_customer
    from public.comment_translator_paid_customers
   where id = p_customer_binding_id
   for update;
  select * into v_capacity
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;
  select * into v_session
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
      or hold_id = p_hold_id
   order by created_at
   limit 1
   for update;
  select * into v_subscription
    from public.comment_translator_paid_subscription_bindings
   where lifecycle_id = p_lifecycle_id
   limit 1
   for update;

  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_lifecycle.customer_binding_id <> p_customer_binding_id
    or v_lifecycle.is_terminal
    or v_lifecycle.lifecycle_state not in ('checkout_hold', 'incomplete', 'expire_required')
    or v_hold.id is null
    or v_hold.lifecycle_id <> p_lifecycle_id
    or v_hold.owner_user_id <> p_owner_user_id
    or v_hold.idempotency_key is distinct from p_idempotency_key
    or v_hold.checkout_expires_at_target is distinct from p_checkout_expires_at_target
    or v_hold.hold_state not in ('held', 'expire_required')
    or v_customer.id is null
    or v_customer.owner_user_id <> p_owner_user_id
    or v_customer.stripe_customer_id <> p_stripe_customer_id
    or v_capacity.id is null
    or v_capacity.owner_user_id <> p_owner_user_id
    or v_capacity.reservation_state <> 'held'
    or v_subscription.id is not null
  then
    raise exception 'checkout expire-required binding conflict';
  end if;
  if v_session.id is not null then
    if v_session.lifecycle_id <> p_lifecycle_id
      or v_session.hold_id <> p_hold_id
      or v_session.owner_user_id <> p_owner_user_id
      or v_session.customer_binding_id <> p_customer_binding_id
      or v_session.stripe_checkout_session_id <> p_stripe_checkout_session_id
      or v_session.stripe_customer_id <> p_stripe_customer_id
      or v_session.stripe_expires_at is distinct from p_stripe_expires_at
    then
      raise exception 'checkout expire-required binding conflict';
    end if;
  else
    insert into public.comment_translator_paid_checkout_session_bindings (
      lifecycle_id, hold_id, owner_user_id, customer_binding_id,
      stripe_checkout_session_id, stripe_customer_id, stripe_expires_at, created_at
    ) values (
      p_lifecycle_id, p_hold_id, p_owner_user_id, p_customer_binding_id,
      p_stripe_checkout_session_id, p_stripe_customer_id, p_stripe_expires_at, p_now
    );
  end if;
  if v_lifecycle.lifecycle_state = 'expire_required'
    and v_hold.hold_state = 'expire_required'
  then
    return true;
  end if;
  if v_lifecycle.lifecycle_state not in ('checkout_hold', 'incomplete')
    or v_hold.hold_state <> 'held'
  then
    raise exception 'checkout expire-required transition is not valid';
  end if;

  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = 'expire_required',
         next_reconcile_at = p_now,
         updated_at = p_now
   where id = p_lifecycle_id;
  update public.comment_translator_paid_checkout_holds
     set hold_state = 'expire_required',
         updated_at = p_now
   where id = p_hold_id;
  return true;
end;
$$;

create or replace function public.ct_paid_mark_reconcile_failure_safe(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_work_kind text,
  p_error_class text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_entitlement public.comment_translator_paid_entitlements%rowtype;
  v_target_lifecycle_state text;
  v_authoritative_work_kind text;
begin
  p_now := statement_timestamp();
  if p_error_class not in (
    'object-retrieval-failed',
    'database-transaction-failed',
    'external-action-failed',
    'binding-not-ready',
    'capacity-reconciliation-failed',
    'period-reconciliation-failed'
  ) then
    raise exception 'reconcile error class is not valid';
  end if;
  if p_work_kind is not null and p_work_kind not in (
    'checkout-expiry',
    'unbound-checkout-session',
    'payment-failure-seven-day',
    'cancel-pending',
    'refund-reconciliation',
    'dispute-reconciliation',
    'paid-unentitled-reconciliation',
    'billing-period-rollover',
    'utc-month-cost-rollover'
  ) then
    raise exception 'reconcile work kind is not valid';
  end if;

  if p_work_kind = 'utc-month-cost-rollover' then
    update public.comment_translator_paid_maintenance_work_items
       set last_reconcile_error_class = p_error_class,
           updated_at = p_now
     where id = p_lifecycle_id
       and work_kind = p_work_kind
       and reconcile_lease_token = p_reconcile_lease_token
       and reconcile_lease_until > p_now;
    if not found then raise exception 'stale maintenance lease token is not valid for failure safety'; end if;

    update public.comment_translator_paid_global_cost_buckets
       set bucket_state = 'closing',
           updated_at = p_now
     where bucket_state = 'open'
       and utc_month < date_trunc('month', p_now at time zone 'UTC')::date;

    update public.comment_translator_paid_azure_fallback_buckets
       set bucket_state = 'closing',
           updated_at = p_now
     where bucket_state = 'open'
       and utc_month < date_trunc('month', p_now at time zone 'UTC')::date;
    return true;
  end if;

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
   for update;
  if v_lifecycle.id is null then
    raise exception 'stale reconcile lease token is not valid for failure safety';
  end if;

  v_authoritative_work_kind := case
    when v_lifecycle.lifecycle_state = 'expire_required' then 'checkout-expiry'
    when v_lifecycle.lifecycle_state in ('checkout_hold', 'incomplete')
      and not exists (
        select 1
          from public.comment_translator_paid_checkout_session_bindings session_binding
         where session_binding.lifecycle_id = v_lifecycle.id
      )
      and not exists (
        select 1
          from public.comment_translator_paid_subscription_bindings subscription_binding
         where subscription_binding.lifecycle_id = v_lifecycle.id
      ) then 'unbound-checkout-session'
    when v_lifecycle.lifecycle_state in ('checkout_hold', 'incomplete') then 'checkout-expiry'
    when v_lifecycle.lifecycle_state in ('past_due', 'unpaid')
      and v_lifecycle.payment_failure_started_at is not null
      and v_lifecycle.payment_failure_started_at <= p_now - interval '7 days'
      then 'payment-failure-seven-day'
    when v_lifecycle.lifecycle_state = 'cancel_pending' then 'cancel-pending'
    when v_lifecycle.lifecycle_state = 'refund_reconciliation' then 'refund-reconciliation'
    when v_lifecycle.lifecycle_state in ('dispute', 'dispute_reconciliation') then 'dispute-reconciliation'
    when v_lifecycle.lifecycle_state = 'paid_unentitled_reconciliation'
      and v_lifecycle.paid_unentitled_operator_disposition is not null
      then 'paid-unentitled-reconciliation'
    when v_lifecycle.lifecycle_state in ('active', 'cancel_at_period_end')
      and exists (
        select 1
          from public.comment_translator_paid_entitlements entitlement
         where entitlement.lifecycle_id = v_lifecycle.id
           and entitlement.current_period_end <= p_now
           and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
      ) then 'billing-period-rollover'
    else null
  end;
  p_work_kind := coalesce(p_work_kind, v_authoritative_work_kind);
  if p_work_kind is null or p_work_kind is distinct from v_authoritative_work_kind then
    raise exception 'stale reconcile work kind is not valid for failure safety';
  end if;

  v_target_lifecycle_state := case
    when p_work_kind = 'paid-unentitled-reconciliation'
      then 'paid_unentitled_reconciliation'
    else v_lifecycle.lifecycle_state
  end;

  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = v_target_lifecycle_state,
         reconcile_work_kind = p_work_kind,
         last_reconcile_error_class = p_error_class,
         updated_at = p_now
   where id = v_lifecycle.id;

  select *
    into v_entitlement
    from public.comment_translator_paid_entitlements
   where lifecycle_id = v_lifecycle.id
   for update;

  if v_entitlement.id is not null
    and p_work_kind in ('paid-unentitled-reconciliation', 'billing-period-rollover')
  then
    update public.comment_translator_paid_entitlements
       set entitlement_status = 'paid_unentitled_reconciliation',
           cancel_at_period_end = false,
           dispute_state = 'none',
           updated_at = p_now,
           projected_at = p_now
     where id = v_entitlement.id;

    -- Keep the slot held/consuming. Only a later authoritative success or a
    -- confirmed terminal object may release capacity.
    update public.comment_translator_paid_capacity_reservations
       set lifecycle_stage = 'reconciliation',
           updated_at = p_now
     where lifecycle_id = v_lifecycle.id
       and reservation_state in ('held', 'consuming');
  end if;

  if p_work_kind = 'billing-period-rollover' then
    -- An authoritative rollover failure leaves every eligible period in the
    -- non-reservable closing state. A later successful close RPC is the only
    -- path from closing to closed.
    update public.comment_translator_paid_billing_period_usage
       set period_state = 'closing',
           updated_at = p_now
     where owner_user_id = v_lifecycle.owner_user_id
       and period_state = 'open'
       and period_end <= p_now;

    update public.comment_translator_paid_owner_cost_buckets
       set period_state = 'closing',
           updated_at = p_now
     where owner_user_id = v_lifecycle.owner_user_id
       and period_state = 'open'
       and period_end <= p_now;

  end if;

  if p_work_kind = 'utc-month-cost-rollover' then
    update public.comment_translator_paid_global_cost_buckets
       set bucket_state = 'closing',
           updated_at = p_now
     where bucket_state = 'open'
       and utc_month < date_trunc('month', p_now at time zone 'UTC')::date;

    update public.comment_translator_paid_azure_fallback_buckets
       set bucket_state = 'closing',
           updated_at = p_now
     where bucket_state = 'open'
       and utc_month < date_trunc('month', p_now at time zone 'UTC')::date;
  end if;

  return true;
end;
$$;

create or replace function public.ct_paid_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_utc_month date,
  p_input_characters bigint,
  p_estimated_cost_micros bigint,
  p_request_count integer,
  p_token_count bigint,
  p_now timestamptz default now()
)
returns table (reservation_status text, session_lease_token uuid, openai_slot_token uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_config public.comment_translator_paid_capacity_config%rowtype;
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_shared_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_owner_cost public.comment_translator_paid_owner_cost_buckets%rowtype;
  v_global_cost public.comment_translator_paid_global_cost_buckets%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_prior_lease public.comment_translator_paid_session_leases%rowtype;
  v_slot public.comment_translator_paid_openai_slots%rowtype;
  v_prior_rate public.comment_translator_paid_openai_rate_reservations%rowtype;
  v_minute public.comment_translator_paid_openai_minute_buckets%rowtype;
  v_minute_start timestamptz;
  v_session_lease_token uuid;
  v_openai_slot_token uuid;
  v_usage_id uuid;
  v_owner_cost_id uuid;
  v_global_cost_id uuid;
  v_reserved_slots integer;
  v_rpm_limit integer;
  v_rolling_tokens bigint;
  v_receipt_count integer;
begin
  p_now := statement_timestamp();
  if length(trim(p_attempt_id)) = 0
    or length(trim(p_provider_attempt)) = 0
    or length(trim(p_session_reference_id)) = 0
    or p_input_characters <= 0
    or p_input_characters > 7500
    or p_estimated_cost_micros <= 0
    or p_request_count <= 0
    or p_request_count > 15
    or p_token_count <= 0
  then
    raise exception 'OpenAI reservation request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290102);

  select *
    into v_attempt
   from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is not null then
    if v_attempt.provider_kind <> 'openai_attempt' then
      raise exception 'attempt provider binding conflict';
    end if;
    if v_attempt.session_reference_id <> p_session_reference_id then
      raise exception 'attempt session binding conflict';
    end if;
    if v_attempt.owner_user_id <> p_owner_user_id then
      raise exception 'attempt owner binding conflict';
    end if;
    if v_attempt.period_start is distinct from p_period_start or v_attempt.period_end is distinct from p_period_end then
      raise exception 'attempt period binding conflict';
    end if;
    if v_attempt.utc_month <> p_utc_month then
      raise exception 'attempt UTC month binding conflict';
    end if;
    if v_attempt.requested_input_characters <> p_input_characters then
      raise exception 'attempt input binding conflict';
    end if;
    if v_attempt.requested_cost_micros <> p_estimated_cost_micros then
      raise exception 'attempt cost binding conflict';
    end if;
    if v_attempt.requested_request_count <> p_request_count then
      raise exception 'attempt request binding conflict';
    end if;
    if v_attempt.requested_token_count <> p_token_count then
      raise exception 'attempt token binding conflict';
    end if;
    if v_attempt.attempt_state in ('committed', 'released', 'expired') then
      return query select v_attempt.attempt_state, null::uuid, null::uuid;
      return;
    end if;
    select *
      into v_lease
      from public.comment_translator_paid_session_leases
     where attempt_id = p_attempt_id
     for update;
    select *
      into v_slot
      from public.comment_translator_paid_openai_slots
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt
     for update;
    if v_lease.id is null
      or v_lease.owner_user_id <> p_owner_user_id
      or v_lease.session_reference_id <> p_session_reference_id
      or v_lease.lease_state not in ('active', 'uncertain')
      or v_lease.lease_until <= p_now
      or v_slot.id is null
      or v_slot.session_reference_id <> p_session_reference_id
      or v_slot.slot_state not in ('active', 'uncertain')
      or v_slot.lease_until <= p_now
    then
      raise exception 'active attempt lease binding is unavailable';
    end if;
    return query select v_attempt.attempt_state, v_lease.lease_token, v_slot.lease_token;
    return;
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is not null then
    if v_logical.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt owner binding conflict';
    end if;
    if v_logical.period_start is distinct from p_period_start or v_logical.period_end is distinct from p_period_end then
      raise exception 'logical attempt period binding conflict';
    end if;
    if p_input_characters > v_logical.input_characters then
      raise exception 'logical attempt input binding conflict';
    end if;
    if v_logical.logical_state <> 'reserved' then
      raise exception 'logical attempt is already settled';
    end if;
  end if;

  perform 1
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
   order by provider_attempt
   for update;
  select count(*)::integer
    into v_receipt_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;
  if v_receipt_count > 0 then
    select *
      into v_shared_attempt
      from public.comment_translator_paid_attempt_receipts
     where attempt_id = p_attempt_id
       and provider_kind = 'openai_attempt'
     order by created_at
     limit 1
     for update;
    if v_receipt_count <> 1
      or v_shared_attempt.id is null
      or v_shared_attempt.reserved_cost_micros <> 0
      or v_shared_attempt.attempt_state <> 'committed'
      or v_shared_attempt.provider_failure_class is null or v_shared_attempt.provider_failure_class not in ('invalid-response', 'rate-limit')
      or v_shared_attempt.committed_cost_micros <= 0
    then
      raise exception 'OpenAI retry predecessor is not safe';
    end if;
    select *
      into v_slot
      from public.comment_translator_paid_openai_slots
     where attempt_id = p_attempt_id
       and provider_attempt = v_shared_attempt.provider_attempt
     for update;
    select *
      into v_prior_rate
      from public.comment_translator_paid_openai_rate_reservations
     where attempt_id = p_attempt_id
       and provider_attempt = v_shared_attempt.provider_attempt
     for update;
    select *
      into v_prior_lease
      from public.comment_translator_paid_session_leases
     where attempt_id = p_attempt_id
     for update;
    if v_slot.id is null
      or v_slot.slot_state <> 'released'
      or v_prior_rate.id is null
      or v_prior_lease.id is null
      or v_prior_lease.provider_attempt <> v_shared_attempt.provider_attempt
      or not (
        v_prior_lease.lease_state = 'released'
        or (
          v_prior_lease.lease_state in ('active', 'uncertain')
          and v_prior_lease.lease_until > p_now
        )
      )
      or v_prior_rate.reservation_state <> 'completed'
    then
      raise exception 'OpenAI retry predecessor is not safe';
    end if;
  end if;

  if p_utc_month <> date_trunc('month', p_now at time zone 'UTC')::date then
    raise exception 'UTC month is not current';
  end if;
  perform public.ct_paid_assert_current_utc_month(p_now);

  select *
    into v_config
    from public.comment_translator_paid_capacity_config
   where config_key = true
   for update;
  if v_config.config_key is null
    or not v_config.openai_limits_configured
    or v_config.openai_rpm_limit <= 0
    or v_config.openai_tpm_limit <= 0
  then
    raise exception 'OpenAI capacity configuration is unavailable';
  end if;

  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = 'openai'
   for update;
  if v_circuit.provider is null or v_circuit.circuit_state in ('degraded', 'disabled') then
    raise exception 'OpenAI circuit is unavailable';
  end if;
  if v_circuit.circuit_state = 'half_open' then
    if v_circuit.probe_attempt_id is not null
      and v_circuit.probe_attempt_id <> p_attempt_id
      and v_circuit.probe_lease_until is not null
      and v_circuit.probe_lease_until > p_now
    then
      raise exception 'OpenAI circuit probe is already leased';
    end if;
    update public.comment_translator_paid_provider_circuits
       set probe_attempt_id = p_attempt_id,
           probe_lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where provider = 'openai';
  end if;

  select *
    into v_lease
    from public.comment_translator_paid_session_leases
   where session_reference_id = p_session_reference_id
   for update;
  if v_lease.id is not null
    and v_lease.owner_user_id <> p_owner_user_id
  then
    raise exception 'session owner binding conflict';
  end if;
  if v_lease.id is not null
    and v_lease.lease_state in ('active', 'uncertain')
    and v_lease.lease_until > p_now
    and v_lease.attempt_id <> p_attempt_id
  then
    raise exception 'session has an active provider lease';
  end if;

  select *
    into v_shared_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and billing_period_usage_id is not null
     and attempt_state in ('reserved', 'uncertain', 'committed', 'released', 'expired')
   order by created_at
   limit 1
   for update;
  if v_shared_attempt.id is not null then
    if v_logical.attempt_id is null
      or v_shared_attempt.reserved_input_characters <> v_logical.input_characters
      or p_input_characters > v_logical.input_characters
    then
      raise exception 'logical attempt character reservation is not idempotent';
    end if;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where id = v_shared_attempt.billing_period_usage_id
     for update;
    if v_usage.id is null then
      raise exception 'logical attempt billing period bucket is missing';
    end if;
    if v_usage.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt billing period binding conflict';
    end if;
    p_period_start := v_usage.period_start;
    p_period_end := v_usage.period_end;
  else
    perform public.ct_paid_assert_current_paid_period(
      p_owner_user_id,
      p_period_start,
      p_period_end,
      p_now
    );
    insert into public.comment_translator_paid_billing_period_usage (
      owner_user_id, period_start, period_end, updated_at
    )
    values (p_owner_user_id, p_period_start, p_period_end, p_now)
    on conflict (owner_user_id, period_start, period_end) do nothing;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     for update;
    if v_usage.reserved_input_characters + v_usage.committed_input_characters + p_input_characters > v_usage.character_limit then
      raise exception 'billing period character quota is exhausted';
    end if;
    if v_usage.period_state <> 'open' then
      raise exception 'billing period is closed for new reservations';
    end if;
  end if;

  insert into public.comment_translator_paid_owner_cost_buckets (
    owner_user_id, period_start, period_end, updated_at
  )
  values (p_owner_user_id, p_period_start, p_period_end, p_now)
  on conflict (owner_user_id, period_start, period_end) do nothing;
  select *
    into v_owner_cost
    from public.comment_translator_paid_owner_cost_buckets
   where owner_user_id = p_owner_user_id
     and period_start = p_period_start
     and period_end = p_period_end
     for update;
  if v_owner_cost.period_state <> 'open' then
    raise exception 'owner cost period is closed for new reservations';
  end if;
  if v_owner_cost.reserved_cost_micros + v_owner_cost.committed_cost_micros + p_estimated_cost_micros > v_owner_cost.cost_limit_micros then
    raise exception 'individual OpenAI cost limit is exhausted';
  end if;

  if v_shared_attempt.id is not null and v_shared_attempt.global_cost_bucket_id is not null then
    select *
      into v_global_cost
      from public.comment_translator_paid_global_cost_buckets
     where id = v_shared_attempt.global_cost_bucket_id
     for update;
    if v_global_cost.id is null or v_global_cost.utc_month <> p_utc_month then
      raise exception 'logical attempt UTC month binding conflict';
    end if;
  else
    insert into public.comment_translator_paid_global_cost_buckets (
      utc_month, updated_at
    )
    values (p_utc_month, p_now)
    on conflict (utc_month) do nothing;
    select *
      into v_global_cost
      from public.comment_translator_paid_global_cost_buckets
     where utc_month = p_utc_month
     for update;
  end if;
  if v_global_cost.bucket_state <> 'open' then
    raise exception 'global cost month is closed for new reservations';
  end if;
  if v_global_cost.reserved_cost_micros + v_global_cost.committed_cost_micros + p_estimated_cost_micros > v_global_cost.cost_limit_micros then
    raise exception 'global OpenAI cost limit is exhausted';
  end if;

  select count(*)::integer
    into v_reserved_slots
    from public.comment_translator_paid_openai_slots
   where slot_state in ('active', 'uncertain')
     and lease_until > p_now;
  if v_reserved_slots >= v_config.openai_slot_limit then
    raise exception 'OpenAI slot capacity is exhausted';
  end if;

  v_minute_start := date_trunc('minute', p_now);
  insert into public.comment_translator_paid_openai_minute_buckets (minute_start)
  values (v_minute_start)
  on conflict (minute_start) do nothing;
  select *
    into v_minute
    from public.comment_translator_paid_openai_minute_buckets
   where minute_start = v_minute_start
   for update;
  v_rpm_limit := floor(v_config.openai_rpm_limit * 0.70);
  if v_minute.reserved_requests + p_request_count > v_rpm_limit then
    raise exception 'OpenAI RPM reservation is exhausted';
  end if;

  select coalesce(sum(token_count), 0)::bigint
    into v_rolling_tokens
    from public.comment_translator_paid_openai_rate_reservations
    where reservation_state in ('reserved', 'uncertain', 'completed')
     and reserved_at > p_now - interval '60 seconds'
     and expires_at > p_now;
  if v_rolling_tokens + p_token_count > floor(v_config.openai_tpm_limit * 0.70) then
    raise exception 'OpenAI TPM reservation is exhausted';
  end if;

  v_session_lease_token := case
    when v_lease.id is not null
      and v_lease.lease_state in ('active', 'uncertain')
      and v_lease.lease_until > p_now
      and v_lease.attempt_id = p_attempt_id
    then v_lease.lease_token
    else gen_random_uuid()
  end;
  v_openai_slot_token := gen_random_uuid();

  if v_lease.id is null then
    insert into public.comment_translator_paid_session_leases (
    session_reference_id,
    owner_user_id,
    lease_state,
    provider_attempt,
    lease_until,
    lease_token,
    attempt_id,
    created_at,
    updated_at
  )
    values (
    p_session_reference_id,
    p_owner_user_id,
    'active',
    p_provider_attempt,
    p_now + interval '120 seconds',
    v_session_lease_token,
    p_attempt_id,
    p_now,
    p_now
    );
  else
    update public.comment_translator_paid_session_leases
       set owner_user_id = p_owner_user_id,
           lease_state = 'active',
           provider_attempt = p_provider_attempt,
           lease_until = p_now + interval '120 seconds',
           lease_token = v_session_lease_token,
           attempt_id = p_attempt_id,
           updated_at = p_now
     where id = v_lease.id;
  end if;

  insert into public.comment_translator_paid_openai_slots (
    session_reference_id,
    attempt_id,
    provider_attempt,
    slot_state,
    lease_until,
    lease_token,
    created_at,
    updated_at
  )
  values (
    p_session_reference_id,
    p_attempt_id,
    p_provider_attempt,
    'active',
    p_now + interval '120 seconds',
    v_openai_slot_token,
    p_now,
    p_now
  );

  insert into public.comment_translator_paid_openai_rate_reservations (
    attempt_id,
    provider_attempt,
    minute_start,
    request_count,
    token_count,
    reservation_state,
    reserved_at,
    expires_at
  )
  values (
    p_attempt_id,
    p_provider_attempt,
    v_minute_start,
    p_request_count,
    p_token_count,
    'reserved',
    p_now,
    p_now + interval '120 seconds'
  );

  update public.comment_translator_paid_openai_minute_buckets
     set reserved_requests = reserved_requests + p_request_count,
         updated_at = p_now
   where minute_start = v_minute_start;

  if v_shared_attempt.id is null then
    update public.comment_translator_paid_billing_period_usage
       set reserved_input_characters = reserved_input_characters + p_input_characters,
           updated_at = p_now
     where id = v_usage.id;
  end if;
  update public.comment_translator_paid_owner_cost_buckets
     set reserved_cost_micros = reserved_cost_micros + p_estimated_cost_micros,
         updated_at = p_now
   where id = v_owner_cost.id;
  update public.comment_translator_paid_global_cost_buckets
     set reserved_cost_micros = reserved_cost_micros + p_estimated_cost_micros,
         updated_at = p_now
   where id = v_global_cost.id;

  insert into public.comment_translator_paid_logical_attempts (
    attempt_id, owner_user_id, billing_period_usage_id, period_start, period_end,
    input_characters, logical_state, expires_at, created_at, updated_at
  )
  values (
    p_attempt_id, p_owner_user_id, v_usage.id, p_period_start, p_period_end,
    p_input_characters, 'reserved', p_now + interval '24 hours', p_now, p_now
  )
  on conflict (attempt_id) do nothing;

  insert into public.comment_translator_paid_attempt_receipts (
    attempt_id,
    provider_attempt,
    provider_kind,
    session_reference_id,
    owner_user_id,
    period_start,
    period_end,
    utc_month,
    attempt_state,
    expires_at,
    billing_period_usage_id,
    owner_cost_bucket_id,
    global_cost_bucket_id,
    reserved_input_characters,
    requested_input_characters,
    reserved_cost_micros,
    requested_cost_micros,
    requested_request_count,
    requested_token_count,
    created_at,
    updated_at
  )
  values (
    p_attempt_id,
    p_provider_attempt,
    'openai_attempt',
    p_session_reference_id,
    p_owner_user_id,
    p_period_start,
    p_period_end,
    p_utc_month,
    'reserved',
    p_now + interval '120 seconds',
    v_usage.id,
    v_owner_cost.id,
    v_global_cost.id,
    coalesce(v_logical.input_characters, p_input_characters),
    p_input_characters,
    p_estimated_cost_micros,
    p_estimated_cost_micros,
    p_request_count,
    p_token_count,
    p_now,
    p_now
  );

  return query select 'reserved'::text, v_session_lease_token, v_openai_slot_token;
end;
$$;

create or replace function public.ct_paid_probe_provider_circuit(
  p_provider text,
  p_now timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state text;
begin
  p_now := statement_timestamp();
  select circuit_state
    into v_state
    from public.comment_translator_paid_provider_circuits
   where provider = p_provider
   for update;
  if v_state is null then
    raise exception 'provider circuit is not configured';
  end if;
  if v_state = 'degraded' and exists (
    select 1
      from public.comment_translator_paid_provider_circuits
     where provider = p_provider
       and degraded_until is not null
       and degraded_until <= p_now
  ) then
    update public.comment_translator_paid_provider_circuits
       set circuit_state = 'half_open',
           probe_attempt_id = null,
           probe_lease_until = null,
           updated_at = p_now
     where provider = p_provider;
    return 'half_open';
  end if;
  return v_state;
end;
$$;

create or replace function public.ct_paid_project_entitlement(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_customer_binding_id uuid,
  p_subscription_binding_id uuid,
  p_product_id text,
  p_price_id text,
  p_entitlement_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_dispute_state text,
  p_projection_lease_token uuid,
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now(),
  p_lifecycle_state text default null,
  p_subscription_status text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.comment_translator_paid_entitlements%rowtype;
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_customer public.comment_translator_paid_customers%rowtype;
  v_subscription public.comment_translator_paid_subscription_bindings%rowtype;
  v_target_lifecycle_state text;
  v_target_capacity_stage text;
  v_previous_subscription_status text;
  v_observed_subscription_status text;
  v_failure_started_at timestamptz;
  v_capacity_id uuid;
  v_id uuid;
begin
  p_now := statement_timestamp();
  if p_entitlement_status not in (
    'active', 'cancel_at_period_end', 'past_due', 'unpaid', 'incomplete',
    'canceled', 'incomplete_expired', 'dispute', 'cancel_pending',
    'paid_unentitled_reconciliation', 'refund_reconciliation',
    'dispute_reconciliation', 'inactive'
  ) then
    raise exception 'entitlement status is not valid';
  end if;

  if p_dispute_state not in ('none', 'investigating', 'won', 'lost', 'reconciliation') then
    raise exception 'dispute state is not valid';
  end if;
  if p_subscription_status is not null and p_subscription_status not in (
    'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'
  ) then
    raise exception 'subscription status is not valid';
  end if;
  if p_subscription_binding_id is not null
    and (p_current_period_start is null or p_current_period_end is null)
  then
    raise exception 'subscription-bound entitlement period is not valid';
  end if;
  if (p_current_period_start is null) <> (p_current_period_end is null)
    or (
      p_current_period_start is not null
      and (
        not isfinite(p_current_period_start)
        or not isfinite(p_current_period_end)
        or p_current_period_end <= p_current_period_start
      )
    )
  then
    raise exception 'entitlement period is not valid';
  end if;
  if p_subscription_binding_id is null and p_current_period_start is not null then
    raise exception 'unbound entitlement period is not valid';
  end if;
  if p_cancel_at_period_end is distinct from (
    p_entitlement_status in ('cancel_at_period_end', 'cancel_pending')
  ) then
    raise exception 'cancel-at-period-end flag is not valid';
  end if;

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null or v_lifecycle.owner_user_id <> p_owner_user_id then
    raise exception 'billing lifecycle binding is not ready';
  end if;
  if p_projection_lease_token is null
    or v_lifecycle.projection_lease_token is distinct from p_projection_lease_token
    or v_lifecycle.projection_lease_until is null
    or v_lifecycle.projection_lease_until <= p_now
  then
    raise exception 'stale projection lease token is not valid for projection';
  end if;
  v_observed_subscription_status := coalesce(
    p_subscription_status,
    case
      when p_entitlement_status = 'cancel_at_period_end' then 'active'
      when p_entitlement_status in ('active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired') then p_entitlement_status
      else null
    end
  );
  if p_lifecycle_state is not null and p_lifecycle_state not in (
    'checkout_hold', 'incomplete', 'active', 'cancel_at_period_end',
    'past_due', 'unpaid', 'dispute', 'cancel_pending',
    'paid_unentitled_reconciliation', 'refund_reconciliation',
    'dispute_reconciliation', 'expire_required', 'incomplete_expired',
    'canceled', 'terminated'
  ) then
    raise exception 'billing lifecycle state is not valid';
  end if;

  v_target_lifecycle_state := coalesce(
    p_lifecycle_state,
    case p_entitlement_status
      when 'active' then 'active'
      when 'cancel_at_period_end' then 'cancel_at_period_end'
      when 'past_due' then 'past_due'
      when 'unpaid' then 'unpaid'
      when 'incomplete' then 'incomplete'
      when 'canceled' then 'canceled'
      when 'incomplete_expired' then 'incomplete_expired'
      when 'dispute' then 'dispute'
      when 'cancel_pending' then 'cancel_pending'
      when 'paid_unentitled_reconciliation' then 'paid_unentitled_reconciliation'
      when 'refund_reconciliation' then 'refund_reconciliation'
      when 'dispute_reconciliation' then 'dispute_reconciliation'
      when 'inactive' then 'terminated'
      else v_lifecycle.lifecycle_state
    end
  );

  if not (
    (
      p_entitlement_status = 'active'
      and v_target_lifecycle_state = 'active'
      and p_dispute_state in ('none', 'won')
      and (p_subscription_status is null or p_subscription_status = 'active')
    )
    or (
      p_entitlement_status = 'cancel_at_period_end'
      and v_target_lifecycle_state = 'cancel_at_period_end'
      and p_dispute_state in ('none', 'won')
      and (p_subscription_status is null or p_subscription_status = 'active')
    )
    or (
      p_entitlement_status = 'past_due'
      and v_target_lifecycle_state = 'past_due'
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'past_due')
    )
    or (
      p_entitlement_status = 'unpaid'
      and v_target_lifecycle_state = 'unpaid'
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'unpaid')
    )
    or (
      p_entitlement_status = 'incomplete'
      and v_target_lifecycle_state in ('checkout_hold', 'incomplete', 'expire_required')
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'incomplete')
    )
    or (
      p_entitlement_status = 'dispute'
      and v_target_lifecycle_state = 'dispute'
      and p_dispute_state in ('investigating', 'lost', 'reconciliation')
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'cancel_pending'
      and v_target_lifecycle_state = 'cancel_pending'
      and p_dispute_state = 'none'
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'paid_unentitled_reconciliation'
      and v_target_lifecycle_state = 'paid_unentitled_reconciliation'
      and p_dispute_state = 'none'
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'refund_reconciliation'
      and v_target_lifecycle_state = 'refund_reconciliation'
      and p_dispute_state = 'none'
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'dispute_reconciliation'
      and v_target_lifecycle_state = 'dispute_reconciliation'
      and p_dispute_state = 'reconciliation'
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'incomplete_expired'
      and v_target_lifecycle_state = 'incomplete_expired'
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'incomplete_expired')
    )
    or (
      p_entitlement_status = 'canceled'
      and v_target_lifecycle_state = 'canceled'
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'canceled')
    )
    or (
      p_entitlement_status = 'inactive'
      and v_target_lifecycle_state = 'terminated'
      and p_dispute_state = 'none'
      and p_subscription_status is null
    )
  ) then
    raise exception 'entitlement projection state combination is not valid';
  end if;

  if v_lifecycle.is_terminal
    and v_target_lifecycle_state <> v_lifecycle.lifecycle_state
    and not (v_target_lifecycle_state = 'terminated' and v_lifecycle.lifecycle_state <> 'terminated')
  then
    raise exception 'terminal billing lifecycle cannot regress';
  end if;
  if v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated')
    and p_entitlement_status not in (
      'canceled', 'incomplete_expired', 'inactive'
    )
  then
    raise exception 'terminal billing lifecycle requires terminal entitlement projection';
  end if;
  if p_entitlement_status in ('canceled', 'incomplete_expired', 'inactive')
    and v_target_lifecycle_state not in ('incomplete_expired', 'canceled', 'terminated')
  then
    raise exception 'terminal entitlement requires terminal billing lifecycle';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for projection';
  end if;

  if p_entitlement_status in (
    'active', 'cancel_at_period_end', 'past_due', 'unpaid', 'canceled',
    'incomplete_expired', 'dispute', 'cancel_pending',
    'paid_unentitled_reconciliation', 'refund_reconciliation', 'dispute_reconciliation'
  ) and p_subscription_binding_id is null
  then
    raise exception 'subscription binding is required for entitlement status';
  end if;

  select *
    into v_customer
    from public.comment_translator_paid_customers
   where id = p_customer_binding_id
   for update;
  if v_customer.id is null
    or v_customer.owner_user_id <> p_owner_user_id
    or v_lifecycle.customer_binding_id <> v_customer.id
  then
    raise exception 'customer binding conflict';
  end if;

  if p_subscription_binding_id is not null then
    select *
      into v_subscription
      from public.comment_translator_paid_subscription_bindings
     where id = p_subscription_binding_id
     for update;
    if v_subscription.id is null
      or v_subscription.owner_user_id <> p_owner_user_id
      or v_subscription.lifecycle_id <> p_lifecycle_id
      or v_subscription.customer_binding_id <> p_customer_binding_id
      or v_subscription.product_id <> p_product_id
      or v_subscription.price_id <> p_price_id
    then
      raise exception 'subscription binding conflict';
    end if;
  end if;

  select *
    into v_existing
    from public.comment_translator_paid_entitlements
   where lifecycle_id = p_lifecycle_id
   for update;

  if v_existing.id is not null then
    if v_existing.owner_user_id <> p_owner_user_id
      or v_existing.customer_binding_id <> p_customer_binding_id
      or v_existing.product_id <> p_product_id
      or v_existing.price_id <> p_price_id
      or (v_existing.subscription_binding_id is not null and v_existing.subscription_binding_id is distinct from p_subscription_binding_id)
    then
      raise exception 'entitlement binding conflict';
    end if;
  end if;

  v_previous_subscription_status := v_lifecycle.last_observed_subscription_status;
  v_failure_started_at := v_lifecycle.payment_failure_started_at;
  if v_observed_subscription_status in ('past_due', 'unpaid')
    and (v_previous_subscription_status is null or v_previous_subscription_status not in ('past_due', 'unpaid'))
  then
    v_failure_started_at := p_now;
  elsif v_observed_subscription_status = 'active'
    and v_previous_subscription_status in ('past_due', 'unpaid')
  then
    v_failure_started_at := null;
  end if;

  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = v_target_lifecycle_state,
         is_terminal = v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated'),
         next_reconcile_at = case
           when v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated') then null
           when v_observed_subscription_status in ('past_due', 'unpaid')
             and v_failure_started_at is not null
           then v_failure_started_at + interval '7 days'
           when v_observed_subscription_status = 'active' then null
           else next_reconcile_at
         end,
         last_reconcile_error_class = case
           when v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated') then null
           else last_reconcile_error_class
         end,
         last_observed_subscription_status = coalesce(v_observed_subscription_status, last_observed_subscription_status),
         payment_failure_started_at = v_failure_started_at,
         updated_at = p_now
   where id = p_lifecycle_id;
  if not found then
    raise exception 'billing lifecycle is missing';
  end if;

  if v_existing.id is not null then
    if v_existing.entitlement_status in (
      'canceled', 'incomplete_expired', 'inactive'
    )
      and p_entitlement_status not in (
        'canceled', 'incomplete_expired', 'inactive'
      )
    then
      raise exception 'terminal entitlement cannot regress';
    end if;
    update public.comment_translator_paid_entitlements
       set subscription_binding_id = coalesce(v_existing.subscription_binding_id, p_subscription_binding_id),
           entitlement_status = p_entitlement_status,
           current_period_start = p_current_period_start,
           current_period_end = p_current_period_end,
           cancel_at_period_end = p_cancel_at_period_end,
           dispute_state = p_dispute_state,
           payment_failure_started_at = (
             select payment_failure_started_at
               from public.comment_translator_paid_billing_lifecycles
              where id = p_lifecycle_id
           ),
           projected_at = p_now,
           updated_at = p_now
     where id = v_existing.id
    returning id into v_id;
  else
    insert into public.comment_translator_paid_entitlements (
      lifecycle_id,
      owner_user_id,
      customer_binding_id,
      subscription_binding_id,
      product_id,
      price_id,
      entitlement_status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      dispute_state,
      payment_failure_started_at,
      projected_at,
      updated_at
    )
    values (
      p_lifecycle_id,
      p_owner_user_id,
      p_customer_binding_id,
      p_subscription_binding_id,
      p_product_id,
      p_price_id,
      p_entitlement_status,
      p_current_period_start,
      p_current_period_end,
      p_cancel_at_period_end,
      p_dispute_state,
      (
        select payment_failure_started_at
          from public.comment_translator_paid_billing_lifecycles
         where id = p_lifecycle_id
      ),
      p_now,
      p_now
    )
    returning id into v_id;
  end if;

  if v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated') then
    perform public.ct_paid_release_capacity(
      p_lifecycle_id,
      p_reconcile_lease_token,
      p_now
    );
  else
    v_target_capacity_stage := case v_target_lifecycle_state
      when 'active' then 'active'
      when 'cancel_at_period_end' then 'cancel_at_period_end'
      when 'past_due' then 'payment_failure_hold'
      when 'unpaid' then 'payment_failure_hold'
      when 'dispute' then 'dispute'
      when 'cancel_pending' then 'cancel_pending'
      when 'paid_unentitled_reconciliation' then 'reconciliation'
      when 'refund_reconciliation' then 'reconciliation'
      when 'dispute_reconciliation' then 'reconciliation'
      else 'incomplete'
    end;
    select id
      into v_capacity_id
      from public.comment_translator_paid_capacity_reservations
     where lifecycle_id = p_lifecycle_id
     for update;
    if v_capacity_id is null then
      perform public.ct_paid_reserve_capacity(
        p_lifecycle_id,
        p_owner_user_id,
        v_target_capacity_stage,
        p_reconcile_lease_token,
        p_now
      );
    end if;
    perform public.ct_paid_convert_capacity(
      p_lifecycle_id,
      v_target_capacity_stage,
      p_reconcile_lease_token,
      p_now
    );
  end if;

  update public.comment_translator_paid_billing_lifecycles
     set projection_lease_until = null,
         projection_lease_token = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and projection_lease_token = p_projection_lease_token
     and projection_lease_until > p_now;
  if not found then
    raise exception 'stale projection lease token is not valid for projection';
  end if;

  return v_id;
end;
$$;

create or replace function public.ct_paid_read_entitlement(
  p_owner_user_id uuid,
  p_lifecycle_id uuid default null
)
returns setof public.comment_translator_paid_entitlements
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select e.*
    from public.comment_translator_paid_entitlements e
    join public.comment_translator_paid_billing_lifecycles l
      on l.id = e.lifecycle_id
   where e.owner_user_id = p_owner_user_id
     and (
       (p_lifecycle_id is not null and e.lifecycle_id = p_lifecycle_id)
       or (p_lifecycle_id is null and l.is_terminal = false)
     )
   limit 1;
$$;

create or replace function public.ct_paid_read_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text
)
returns table (attempt_state text, provider_failure_class text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_attempt_id is null
    or p_attempt_id !~ '^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$'
    or p_provider_attempt is null
    or length(trim(p_provider_attempt)) = 0
    or length(p_provider_attempt) > 200
  then
    raise exception 'OpenAI attempt receipt reference is invalid';
  end if;

  return query
  select receipt.attempt_state, receipt.provider_failure_class
    from public.comment_translator_paid_attempt_receipts receipt
   where receipt.attempt_id = p_attempt_id
     and receipt.provider_attempt = p_provider_attempt
     and receipt.provider_kind = 'openai_attempt'
     and receipt.attempt_state in ('reserved', 'uncertain', 'committed', 'released', 'expired')
     and (
       receipt.provider_failure_class is null
       or receipt.provider_failure_class in (
         'network', 'timeout', 'rate-limit', 'server-error',
         'invalid-response', 'quota', 'configuration', 'policy'
       )
     );
end;
$$;

create or replace function public.ct_paid_read_openai_attempt_with_successes(
  p_attempt_id text,
  p_provider_attempt text
)
returns table (attempt_state text, provider_failure_class text, successful_item_attempt_ids text[], successful_input_characters bigint)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_attempt_id is null
    or p_attempt_id !~ '^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$'
    or p_provider_attempt is null
    or length(trim(p_provider_attempt)) = 0
    or length(p_provider_attempt) > 200
  then
    raise exception 'OpenAI attempt receipt reference is invalid';
  end if;

  return query
  select receipt.attempt_state,
         receipt.provider_failure_class,
         receipt.successful_item_attempt_ids,
         receipt.successful_input_characters
    from public.comment_translator_paid_attempt_receipts receipt
   where receipt.attempt_id = p_attempt_id
     and receipt.provider_attempt = p_provider_attempt
     and receipt.provider_kind = 'openai_attempt'
     and receipt.attempt_state in ('reserved', 'uncertain', 'committed', 'released', 'expired')
     and public.ct_paid_valid_successful_item_attempt_ids(receipt.successful_item_attempt_ids)
     and receipt.successful_input_characters between 0 and 7500
     and (
       receipt.successful_metadata_recorded = false
       and cardinality(receipt.successful_item_attempt_ids) = 0
       and receipt.successful_input_characters = 0
       or receipt.successful_metadata_recorded = true
       and ((cardinality(receipt.successful_item_attempt_ids) = 0) = (receipt.successful_input_characters = 0))
     )
     and (
       receipt.provider_failure_class is null
       or receipt.provider_failure_class in (
         'network', 'timeout', 'rate-limit', 'server-error',
         'invalid-response', 'quota', 'configuration', 'policy'
       )
     );
end;
$$;

create or replace function public.ct_paid_read_poll_budget(
  p_session_reference_id text,
  p_owner_user_id uuid,
  p_now timestamptz default now()
)
returns table (
  utc_day date,
  daily_budget integer,
  reserved_polls integer,
  session_reserved_polls integer,
  session_reservation_present boolean,
  next_reset_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_utc_day date;
  v_day_end timestamptz;
  v_bucket public.comment_translator_paid_poll_budget_buckets%rowtype;
  v_reservation public.comment_translator_paid_poll_reservations%rowtype;
begin
  -- Keep the caller-supplied timestamp only for signature compatibility. The
  -- database clock is the authority for UTC bucket selection.
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
  then
    raise exception 'poll budget authority request is not valid';
  end if;

  v_utc_day := (v_now at time zone 'UTC')::date;
  v_day_end := ((v_utc_day + 1)::timestamp at time zone 'UTC');

  select *
    into v_reservation
    from public.comment_translator_paid_poll_reservations reservation
   where reservation.session_reference_id = p_session_reference_id
     and reservation.utc_day = v_utc_day
   limit 1;
  if v_reservation.id is not null and v_reservation.owner_user_id <> p_owner_user_id then
    raise exception 'poll reservation owner binding conflict';
  end if;

  select *
    into v_bucket
    from public.comment_translator_paid_poll_budget_buckets bucket
   where bucket.utc_day = v_utc_day
   limit 1;

  return query
    select
      v_utc_day,
      v_bucket.daily_budget,
      coalesce(v_bucket.reserved_polls, 0),
      coalesce(v_reservation.reserved_polls, 0),
      v_reservation.id is not null,
      v_day_end;
end;
$$;

create or replace function public.ct_paid_read_provider_attempt_replay_metadata(
  p_attempt_id text,
  p_provider_attempt text
)
returns table (
  attempt_state text,
  provider_failure_class text,
  successful_item_attempt_ids text[],
  successful_input_characters bigint,
  fallback_eligible boolean,
  circuit_failure_state text,
  circuit_success_state text,
  provider_kind text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_attempt_id is null
    or p_attempt_id !~ '^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$'
    or p_provider_attempt is null
    or length(trim(p_provider_attempt)) = 0
    or length(p_provider_attempt) > 200
  then
    raise exception 'provider attempt receipt reference is invalid';
  end if;

  return query
  select receipt.attempt_state,
         receipt.provider_failure_class,
         receipt.successful_item_attempt_ids,
         receipt.successful_input_characters,
         receipt.fallback_eligible,
         receipt.circuit_failure_state,
         receipt.circuit_success_state,
         receipt.provider_kind
    from public.comment_translator_paid_attempt_receipts receipt
   where receipt.attempt_id = p_attempt_id
     and receipt.provider_attempt = p_provider_attempt
     and receipt.provider_kind in ('openai_attempt', 'azure_direct_fallback')
     and receipt.attempt_state in ('reserved', 'uncertain', 'committed', 'released', 'expired')
     and receipt.circuit_failure_state in ('not-required', 'deferred', 'pending', 'recorded')
     and receipt.circuit_success_state in ('not-required', 'pending', 'recorded');
end;
$$;

create or replace function public.ct_paid_read_provider_circuit(
  p_provider text
)
returns table (
  provider text,
  circuit_state text,
  failure_count integer,
  window_started_at timestamptz,
  degraded_until timestamptz,
  probe_attempt_id text,
  probe_lease_until timestamptz,
  last_error_class text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;
  if not exists (
    select 1
      from public.comment_translator_paid_provider_circuits
     where comment_translator_paid_provider_circuits.provider = p_provider
  ) then
    raise exception 'provider circuit is not configured';
  end if;

  return query
  select
    circuit.provider,
    circuit.circuit_state,
    circuit.failure_count,
    circuit.window_started_at,
    circuit.degraded_until,
    circuit.probe_attempt_id,
    circuit.probe_lease_until,
    circuit.last_error_class
    from public.comment_translator_paid_provider_circuits as circuit
   where circuit.provider = p_provider;
end;
$$;

create or replace function public.ct_paid_read_runtime_authority(
  p_owner_user_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_utc_month date,
  p_now timestamptz default now()
)
returns table (
  billing_period_input_characters bigint,
  billing_period_character_limit bigint,
  billing_period_available boolean,
  individual_cost_available boolean,
  global_cost_available boolean,
  translated_messages_in_current_minute integer,
  translated_message_capacity_available_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with config as (
    select
      billing_period_character_limit,
      individual_cost_limit_micros,
      global_cost_limit_micros
      from public.comment_translator_paid_capacity_config
     where config_key = true
  ),
  period_usage as (
    select reserved_input_characters, committed_input_characters, period_state
      from public.comment_translator_paid_billing_period_usage
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     limit 1
  ),
  owner_cost as (
    select reserved_cost_micros, committed_cost_micros, cost_limit_micros, period_state
      from public.comment_translator_paid_owner_cost_buckets
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     limit 1
  ),
  global_cost as (
    select reserved_cost_micros, committed_cost_micros, cost_limit_micros, bucket_state
      from public.comment_translator_paid_global_cost_buckets
     where utc_month = p_utc_month
     limit 1
  ),
  message_rate as (
    select
      coalesce(reserved_messages, 0) + coalesce(committed_messages, 0) as used_messages,
      date_trunc('minute', statement_timestamp()) + interval '1 minute' as next_minute
      from public.comment_translator_paid_message_rate_buckets
     where owner_user_id = p_owner_user_id
       and minute_start = date_trunc('minute', statement_timestamp())
     limit 1
  )
  select
    least(
      coalesce(period_usage.reserved_input_characters, 0)
        + coalesce(period_usage.committed_input_characters, 0),
      config.billing_period_character_limit
    )::bigint,
    config.billing_period_character_limit,
    (
      period_usage.period_state is null
      or period_usage.period_state = 'open'
    ),
    (
      owner_cost.reserved_cost_micros is null
      or (
        owner_cost.period_state = 'open'
        and owner_cost.reserved_cost_micros + owner_cost.committed_cost_micros < owner_cost.cost_limit_micros
      )
    ),
    (
      global_cost.reserved_cost_micros is null
      or (
        global_cost.bucket_state = 'open'
        and global_cost.reserved_cost_micros + global_cost.committed_cost_micros < global_cost.cost_limit_micros
      )
    ),
    coalesce(message_rate.used_messages, 0)::integer,
    case
      when coalesce(message_rate.used_messages, 0) >= 60 then message_rate.next_minute
      else null::timestamptz
    end
    from config
    left join period_usage on true
    left join owner_cost on true
    left join global_cost on true
    left join message_rate on true
   where p_owner_user_id is not null
     and p_period_start is not null
     and p_period_end is not null
     and p_period_end > p_period_start
     and p_utc_month = date_trunc('month', statement_timestamp() at time zone 'UTC')::date;
$$;

create or replace function public.ct_paid_read_sanitized_admin_visibility(
  p_now timestamptz default now()
)
returns table (
  generated_at timestamptz,
  scheduler_authority text,
  scheduler_last_run_at timestamptz,
  scheduler_last_success_at timestamptz,
  scheduler_run_status text,
  scheduler_claim_count integer,
  scheduler_retry_count integer,
  scheduler_stale_count integer,
  scheduler_error_class_counts jsonb,
  scheduler_attempt_alert_count integer,
  capacity_active_count integer,
  capacity_held_count integer,
  capacity_limit integer,
  entitlement_active_count integer,
  entitlement_stopped_count integer,
  reconciliation_count integer,
  provider_request_count bigint,
  provider_success_count bigint,
  provider_failure_count bigint,
  provider_fallback_count bigint,
  provider_circuit_status text,
  provider_circuit_degraded_count integer,
  reserved_cost_micros numeric,
  committed_cost_micros numeric,
  individual_cost_limit_micros bigint,
  global_cost_limit_micros bigint,
  supabase_db_total_bytes bigint,
  supabase_db_limit_bytes bigint,
  cloudflare_daily_requests bigint,
  cloudflare_daily_limit bigint,
  cloudflare_stop_checkout_percent integer,
  cloudflare_stop_new_session_percent integer,
  cloudflare_stop_active_poll_percent integer
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  with capacity as (
    select
      count(*) filter (where reservation_state = 'consuming')::integer as active_count,
      count(*) filter (where reservation_state = 'held')::integer as held_count
    from public.comment_translator_paid_capacity_reservations
    where reservation_state <> 'released'
  ),
  entitlement as (
    select
      count(*) filter (where entitlement_status in ('active', 'cancel_at_period_end'))::integer as active_count,
      count(*) filter (where entitlement_status not in ('active', 'cancel_at_period_end'))::integer as stopped_count,
      count(*) filter (where entitlement_status in (
        'cancel_pending', 'paid_unentitled_reconciliation', 'refund_reconciliation', 'dispute_reconciliation'
      ))::integer as reconciliation_count
    from public.comment_translator_paid_entitlements
  ),
  provider as (
    select
      coalesce(sum(request_count), 0)::bigint as request_count,
      coalesce(sum(success_count), 0)::bigint as success_count,
      coalesce(sum(failure_count), 0)::bigint as failure_count,
      coalesce(sum(request_count) filter (where provider = 'azure_fallback'), 0)::bigint as fallback_count
    from public.comment_translator_paid_provider_hourly_details
    where utc_hour >= p_now - interval '30 days'
  ),
  owner_cost as (
    select
      coalesce(sum(reserved_cost_micros), 0)::numeric as reserved_cost_micros,
      coalesce(sum(committed_cost_micros), 0)::numeric as committed_cost_micros,
      coalesce(max(cost_limit_micros), 3_000_000)::bigint as individual_limit_micros
    from public.comment_translator_paid_owner_cost_buckets
    where period_state <> 'closed'
  ),
  global_cost as (
    select
      coalesce(max(cost_limit_micros), 25_000_000)::bigint as global_limit_micros
    from public.comment_translator_paid_global_cost_buckets
    where bucket_state <> 'closed'
  ),
  db_size as (
    select coalesce(sum(pg_total_relation_size(c.oid)), 0)::bigint as total_bytes
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'm')
  ),
  scheduler as (
    select
      scheduler_run.scheduler_authority,
      scheduler_run.last_run_at,
      scheduler_run.last_success_at,
      scheduler_run.run_status,
      scheduler_run.claim_count,
      scheduler_run.retry_count,
      scheduler_run.stale_count,
      scheduler_run.error_class_counts
      from public.comment_translator_paid_scheduler_runs scheduler_run
     order by scheduler_run.last_run_at desc
     limit 1
  ),
  attempt_alert as (
    select (
      (select count(*)
         from public.comment_translator_paid_billing_lifecycles lifecycle
        where lifecycle.reconcile_attempt_count >= 5)
      +
      (select count(*)
         from public.comment_translator_paid_maintenance_work_items work_item
        where work_item.reconcile_attempt_count >= 5)
    )::integer as alert_count
  )
  select
    p_now,
    scheduler.scheduler_authority,
    scheduler.last_run_at,
    scheduler.last_success_at,
    scheduler.run_status,
    scheduler.claim_count,
    scheduler.retry_count,
    scheduler.stale_count,
    scheduler.error_class_counts,
    attempt_alert.alert_count,
    capacity.active_count,
    capacity.held_count,
    config.capacity_limit,
    entitlement.active_count,
    entitlement.stopped_count,
    entitlement.reconciliation_count,
    provider.request_count,
    provider.success_count,
    provider.failure_count,
    provider.fallback_count,
    case
      when exists (
        select 1 from public.comment_translator_paid_provider_circuits where circuit_state = 'disabled'
      ) then 'disabled'
      when exists (
        select 1 from public.comment_translator_paid_provider_circuits where circuit_state = 'half_open'
      ) then 'half_open'
      when exists (
        select 1 from public.comment_translator_paid_provider_circuits where circuit_state = 'degraded'
      ) then 'degraded'
      else 'closed'
    end,
    (select count(*)::integer from public.comment_translator_paid_provider_circuits where circuit_state in ('degraded', 'half_open')),
    owner_cost.reserved_cost_micros,
    owner_cost.committed_cost_micros,
    owner_cost.individual_limit_micros,
    coalesce(global_cost.global_limit_micros, 25_000_000),
    db_size.total_bytes,
    300_000_000::bigint,
    null::bigint,
    100_000::bigint,
    80,
    90,
    95
  from capacity
  cross join entitlement
  cross join provider
  cross join owner_cost
  cross join global_cost
  cross join db_size
  cross join attempt_alert
  left join scheduler on true
  cross join lateral (
    select capacity_limit
      from public.comment_translator_paid_capacity_config
     where config_key = true
     limit 1
  ) config;
$$;

create or replace function public.ct_paid_read_sanitized_scheduler_run(
  p_authority text default null
)
returns table (
  scheduler_authority text,
  last_run_at timestamptz,
  last_success_at timestamptz,
  run_status text,
  claim_count integer,
  retry_count integer,
  stale_count integer,
  error_class_counts jsonb
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select
    runs.scheduler_authority,
    runs.last_run_at,
    runs.last_success_at,
    runs.run_status,
    runs.claim_count,
    runs.retry_count,
    runs.stale_count,
    runs.error_class_counts
    from public.comment_translator_paid_scheduler_runs runs
   where p_authority is null or runs.scheduler_authority = p_authority
   order by runs.last_run_at desc
   limit 1;
$$;

create or replace function public.ct_paid_reclaim_azure_fallback(
  p_attempt_id text,
  p_provider_attempt text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_active_sibling_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;
  if v_attempt.provider_kind <> 'azure_direct_fallback' then
    raise exception 'attempt provider binding conflict';
  end if;
  if v_attempt.attempt_state not in ('reserved', 'uncertain') or v_attempt.expires_at > p_now then
    return false;
  end if;

  update public.comment_translator_paid_azure_fallback_buckets
     set reserved_paid_characters = reserved_paid_characters - v_attempt.reserved_input_characters,
         committed_paid_characters = committed_paid_characters + v_attempt.reserved_input_characters,
         updated_at = p_now
   where id = v_attempt.azure_bucket_id;
  if not found then
    raise exception 'Azure fallback bucket is missing';
  end if;
  update public.comment_translator_paid_attempt_receipts
     set attempt_state = 'expired',
         committed_input_characters = 0,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt;
  perform public.ct_paid_settle_logical_attempt_after_provider_failure(p_attempt_id, true, p_now);

  select count(*)::integer
    into v_active_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and attempt_state in ('reserved', 'uncertain')
     and expires_at > p_now;
  if v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released', lease_until = p_now, updated_at = p_now
     where attempt_id = p_attempt_id;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
     where attempt_id = p_attempt_id;
  end if;
  update public.comment_translator_paid_provider_circuits
     set probe_attempt_id = null,
         probe_lease_until = null,
         updated_at = p_now
   where provider = 'azure_fallback'
     and circuit_state = 'half_open'
     and probe_attempt_id = p_attempt_id;
  return true;
end;
$$;

create or replace function public.ct_paid_reclaim_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_active_sibling_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;
  if v_attempt.provider_kind <> 'openai_attempt' then
    raise exception 'attempt provider binding conflict';
  end if;
  if v_attempt.attempt_state not in ('reserved', 'uncertain') or v_attempt.expires_at > p_now then
    return false;
  end if;

  -- Expired uncertain OpenAI work conservatively commits the reserved cost,
  -- but does not claim logical translation success. Character settlement stays
  -- reserved for an authoritative result or Azure fallback.
  update public.comment_translator_paid_owner_cost_buckets
     set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
         committed_cost_micros = committed_cost_micros + v_attempt.reserved_cost_micros,
         updated_at = p_now
   where id = v_attempt.owner_cost_bucket_id;
  if not found then
    raise exception 'OpenAI owner cost bucket is missing';
  end if;
  update public.comment_translator_paid_global_cost_buckets
     set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
         committed_cost_micros = committed_cost_micros + v_attempt.reserved_cost_micros,
         updated_at = p_now
   where id = v_attempt.global_cost_bucket_id;
  if not found then
    raise exception 'OpenAI global cost bucket is missing';
  end if;
  update public.comment_translator_paid_attempt_receipts
     set attempt_state = 'expired',
         reserved_cost_micros = 0,
         committed_cost_micros = v_attempt.reserved_cost_micros,
         updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
  perform public.ct_paid_settle_logical_attempt_after_provider_failure(p_attempt_id, true, p_now);
  select count(*)::integer
    into v_active_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and attempt_state in ('reserved', 'uncertain')
     and expires_at > p_now;
  if v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released', lease_until = p_now, updated_at = p_now
      where attempt_id = p_attempt_id;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
      where attempt_id = p_attempt_id;
  end if;
  update public.comment_translator_paid_openai_slots
     set slot_state = 'released', lease_until = p_now, updated_at = p_now
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt;
  if not found then
    raise exception 'OpenAI slot reservation is missing';
  end if;
  update public.comment_translator_paid_openai_rate_reservations
     set reservation_state = 'completed', expires_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt;
  update public.comment_translator_paid_provider_circuits
     set probe_attempt_id = null,
         probe_lease_until = null,
         updated_at = p_now
   where provider = 'openai'
     and circuit_state = 'half_open'
     and probe_attempt_id = p_attempt_id;
  return true;
end;
$$;

create or replace function public.ct_paid_record_attempt_circuit_failure(
  p_provider text,
  p_attempt_id text,
  p_provider_attempt text,
  p_error_class text,
  p_allow_deferred_promotion boolean,
  p_disable_provider boolean default false,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_receipt public.comment_translator_paid_attempt_receipts%rowtype;
  v_expected_kind text;
  v_ignored record;
begin
  p_now := statement_timestamp();
  v_expected_kind := case when p_provider = 'openai' then 'openai_attempt'
                          when p_provider = 'azure_fallback' then 'azure_direct_fallback'
                          else null end;
  if v_expected_kind is null
    or p_error_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'quota', 'configuration', 'policy')
    or p_allow_deferred_promotion is null
    or p_disable_provider is null
  then
    raise exception 'attempt circuit failure marker is not valid';
  end if;

  select * into v_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
     and provider_kind = v_expected_kind
   for update;
  if v_receipt.id is null
    or v_receipt.attempt_state not in ('committed', 'released', 'uncertain')
    or v_receipt.provider_failure_class is distinct from p_error_class
  then
    raise exception 'attempt circuit failure receipt is not valid';
  end if;
  if v_receipt.circuit_failure_state = 'recorded' then
    return true;
  end if;
  if v_receipt.circuit_failure_state <> 'pending'
    and not (v_receipt.circuit_failure_state = 'deferred' and p_allow_deferred_promotion)
  then
    raise exception 'attempt circuit failure state is not recordable';
  end if;

  if p_disable_provider then
    if p_provider <> 'azure_fallback' or p_error_class <> 'quota' then
      raise exception 'provider disable marker is not valid';
    end if;
    update public.comment_translator_paid_provider_circuits
       set circuit_state = 'disabled', failure_count = 0,
           window_started_at = null, degraded_until = null,
           probe_attempt_id = null, probe_lease_until = null,
           last_error_class = 'quota', updated_at = p_now
     where provider = p_provider;
    if not found then raise exception 'provider circuit is not configured'; end if;
  else
    select * into v_ignored
      from public.ct_paid_record_provider_circuit_failure_owned(
        p_provider, p_error_class, p_attempt_id, p_now
      );
  end if;

  update public.comment_translator_paid_attempt_receipts
     set circuit_failure_state = 'recorded', updated_at = p_now
   where id = v_receipt.id;
  return true;
end;
$$;

create or replace function public.ct_paid_record_attempt_circuit_success(
  p_provider text,
  p_attempt_id text,
  p_provider_attempt text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_receipt public.comment_translator_paid_attempt_receipts%rowtype;
  v_expected_kind text;
begin
  p_now := statement_timestamp();
  v_expected_kind := case when p_provider = 'openai' then 'openai_attempt'
                          when p_provider = 'azure_fallback' then 'azure_direct_fallback'
                          else null end;
  if v_expected_kind is null then raise exception 'provider circuit is not valid'; end if;

  select * into v_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
     and provider_kind = v_expected_kind
   for update;
  if v_receipt.id is null
    or v_receipt.attempt_state <> 'committed'
    or v_receipt.provider_failure_class is not null
  then
    raise exception 'attempt circuit success receipt is not valid';
  end if;
  if v_receipt.circuit_success_state = 'recorded' then return true; end if;
  if v_receipt.circuit_success_state <> 'pending' then
    raise exception 'attempt circuit success state is not recordable';
  end if;
  if not public.ct_paid_record_provider_circuit_success(p_provider, p_attempt_id, p_now) then
    return false;
  end if;
  update public.comment_translator_paid_attempt_receipts
     set circuit_success_state = 'recorded', updated_at = p_now
   where id = v_receipt.id;
  return true;
end;
$$;

create or replace function public.ct_paid_record_consent(
  p_owner_user_id uuid,
  p_document_type text,
  p_document_version text,
  p_consented_at timestamptz,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  p_now := statement_timestamp();
  if p_document_type not in ('terms', 'privacy', 'paid_conditions')
    or length(trim(p_document_version)) = 0
  then
    raise exception 'consent record is not valid';
  end if;

  insert into public.comment_translator_paid_consents (
    owner_user_id, document_type, document_version, consented_at, created_at
  )
  values (p_owner_user_id, p_document_type, p_document_version, p_consented_at, p_now)
  on conflict (owner_user_id, document_type, document_version) do nothing
  returning id into v_id;

  if v_id is null then
    select id
      into v_id
      from public.comment_translator_paid_consents
     where owner_user_id = p_owner_user_id
       and document_type = p_document_type
       and document_version = p_document_version;
  end if;
  return v_id;
end;
$$;

create or replace function public.ct_paid_record_message_rate_success(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_reservation_key text,
  p_successful_message_count integer,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_reservation public.comment_translator_paid_message_rate_reservations%rowtype;
  v_session public.comment_translator_sessions%rowtype;
begin
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
    or p_reservation_key is null
    or length(trim(p_reservation_key)) = 0
    or length(p_reservation_key) > 200
    or p_successful_message_count is null
    or p_successful_message_count < 0
  then
    raise exception 'Paid message-rate success request is not valid';
  end if;
  select * into v_session
    from public.comment_translator_sessions
   where owner_user_id = p_owner_user_id
     and session_reference_id = p_session_reference_id
     and status = 'active'
     and plan = 'paid'
   for update;
  if v_session.id is null or v_now >= v_session.started_at + interval '3 hours' then
    raise exception 'Paid message-rate success session authority is unreadable';
  end if;
  select * into v_reservation
    from public.comment_translator_paid_message_rate_reservations
   where reservation_key = p_reservation_key
   for update;
  if v_reservation.reservation_key is null
    or v_reservation.owner_user_id <> p_owner_user_id
    or v_reservation.session_reference_id <> p_session_reference_id
    or v_reservation.expires_at <= v_now
    or v_reservation.reservation_state = 'released'
    or p_successful_message_count > v_reservation.reserved_messages
  then
    raise exception 'Paid message-rate success authority is unreadable';
  end if;
  update public.comment_translator_paid_message_rate_reservations
     set successful_message_count = greatest(successful_message_count, p_successful_message_count),
         updated_at = v_now
   where reservation_key = p_reservation_key
   returning successful_message_count into p_successful_message_count;
  return p_successful_message_count;
end;
$$;

create or replace function public.ct_paid_record_provider_circuit_failure(
  p_provider text,
  p_error_class text,
  p_now timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_state text;
  v_count integer;
begin
  p_now := statement_timestamp();
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;
  if p_error_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'quota', 'configuration', 'policy') then
    raise exception 'error class is not valid';
  end if;

  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = p_provider
   for update;

  if v_circuit.circuit_state = 'disabled' then
    return 'disabled';
  end if;

  if p_error_class in ('quota', 'configuration', 'policy') then
    update public.comment_translator_paid_provider_circuits
       set last_error_class = p_error_class,
           updated_at = p_now
     where provider = p_provider;
    return v_circuit.circuit_state;
  end if;

  if v_circuit.circuit_state = 'degraded' then
    update public.comment_translator_paid_provider_circuits
       set circuit_state = 'degraded',
           failure_count = greatest(v_circuit.failure_count + 1, 3),
           degraded_until = greatest(
             coalesce(v_circuit.degraded_until, p_now),
             p_now + interval '5 minutes'
           ),
           probe_attempt_id = null,
           probe_lease_until = null,
           last_error_class = p_error_class,
           updated_at = p_now
     where provider = p_provider;
    return 'degraded';
  end if;

  if v_circuit.circuit_state = 'half_open' then
    v_count := 3;
    v_state := 'degraded';
  elsif v_circuit.window_started_at is null or v_circuit.window_started_at + interval '60 seconds' <= p_now then
    v_count := 1;
    v_state := 'closed';
  else
    v_count := v_circuit.failure_count + 1;
    v_state := case when v_count >= 3 then 'degraded' else v_circuit.circuit_state end;
  end if;

  update public.comment_translator_paid_provider_circuits
     set circuit_state = v_state,
         failure_count = v_count,
         window_started_at = case when v_count = 1 then p_now else v_circuit.window_started_at end,
         degraded_until = case when v_state = 'degraded' then p_now + interval '5 minutes' else degraded_until end,
         probe_attempt_id = null,
         probe_lease_until = null,
         last_error_class = p_error_class,
         updated_at = p_now
   where provider = p_provider;
  return v_state;
end;
$$;

create or replace function public.ct_paid_record_provider_circuit_failure_owned(
  p_provider text,
  p_error_class text,
  p_probe_attempt_id text,
  p_now timestamptz default now()
)
returns table (
  provider text,
  circuit_state text,
  failure_count integer,
  window_started_at timestamptz,
  degraded_until timestamptz,
  probe_attempt_id text,
  probe_lease_until timestamptz,
  last_error_class text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  circuit public.comment_translator_paid_provider_circuits%rowtype;
  ignored_state text;
begin
  p_now := statement_timestamp();
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;
  if p_error_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'quota', 'configuration', 'policy') then
    raise exception 'error class is not valid';
  end if;
  if p_probe_attempt_id is not null
    and (length(trim(p_probe_attempt_id)) = 0 or length(p_probe_attempt_id) > 200)
  then
    raise exception 'provider circuit probe attempt is not valid';
  end if;

  select *
    into circuit
    from public.comment_translator_paid_provider_circuits as circuit_row
   where circuit_row.provider = p_provider
   for update;
  if circuit.provider is null then
    raise exception 'provider circuit is not configured';
  end if;

  if circuit.circuit_state = 'half_open'
    and (
      p_probe_attempt_id is null
      or circuit.probe_attempt_id is distinct from p_probe_attempt_id
      or circuit.probe_lease_until is null
      or circuit.probe_lease_until <= p_now
    )
  then
    return query
    select
      circuit.provider,
      circuit.circuit_state,
      circuit.failure_count,
      circuit.window_started_at,
      circuit.degraded_until,
      circuit.probe_attempt_id,
      circuit.probe_lease_until,
      circuit.last_error_class;
    return;
  end if;

  select public.ct_paid_record_provider_circuit_failure(
    p_provider,
    p_error_class,
    p_now
  ) into ignored_state;

  return query
  select
    circuit_row.provider,
    circuit_row.circuit_state,
    circuit_row.failure_count,
    circuit_row.window_started_at,
    circuit_row.degraded_until,
    circuit_row.probe_attempt_id,
    circuit_row.probe_lease_until,
    circuit_row.last_error_class
    from public.comment_translator_paid_provider_circuits as circuit_row
   where circuit_row.provider = p_provider;
end;
$$;

create or replace function public.ct_paid_record_provider_circuit_success(
  p_provider text,
  p_probe_attempt_id text default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_receipt public.comment_translator_paid_attempt_receipts%rowtype;
begin
  p_now := statement_timestamp();
  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = p_provider
   for update;
  if v_circuit.provider is null then
    return false;
  end if;
  if v_circuit.circuit_state = 'disabled' then
    return true;
  end if;
  if v_circuit.circuit_state = 'degraded' then
    return false;
  end if;
  if v_circuit.circuit_state = 'closed' then
    return true;
  end if;
  if v_circuit.circuit_state <> 'half_open' then
    return false;
  end if;
  if v_circuit.probe_attempt_id is distinct from p_probe_attempt_id
    or v_circuit.probe_lease_until is null
    or v_circuit.probe_lease_until <= p_now
  then
    return false;
  end if;

  select *
    into v_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_probe_attempt_id
     and provider_kind = case
       when p_provider = 'openai' then 'openai_attempt'
       when p_provider = 'azure_fallback' then 'azure_direct_fallback'
       else null
     end
     and attempt_state = 'committed'
     and provider_failure_class is null
   order by provider_attempt
   limit 1
   for update;
  if v_receipt.id is null then
    return false;
  end if;

  update public.comment_translator_paid_provider_circuits
     set circuit_state = 'closed',
         failure_count = 0,
         window_started_at = null,
         degraded_until = null,
         probe_attempt_id = null,
         probe_lease_until = null,
         last_error_class = null,
         updated_at = p_now
   where provider = p_provider;
  return found;
end;
$$;

create or replace function public.ct_paid_record_sanitized_scheduler_run(
  p_authority text,
  p_run_at timestamptz,
  p_status text,
  p_claim_count integer,
  p_retry_count integer,
  p_stale_count integer,
  p_error_class_counts jsonb default '{}'::jsonb,
  p_last_success_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_authority not in ('supabase-cron', 'cloudflare-cron-fallback')
    or p_status not in ('success', 'failed', 'stale', 'retry-scheduled', 'unavailable')
    or p_run_at is null
    or p_claim_count is null or p_claim_count < 0
    or p_retry_count is null or p_retry_count < 0
    or p_stale_count is null or p_stale_count < 0
    or p_error_class_counts is null
    or jsonb_typeof(p_error_class_counts) <> 'object'
  then
    raise exception 'sanitized scheduler run is not valid';
  end if;
  if exists (
    select 1
      from jsonb_object_keys(p_error_class_counts) as error_key
     where error_key not in (
       'object-retrieval-failed',
       'database-transaction-failed',
       'external-action-failed',
       'binding-not-ready',
       'capacity-reconciliation-failed',
       'period-reconciliation-failed',
       'scheduler-unavailable',
       'scheduler-ambiguous'
     )
  ) then
    raise exception 'sanitized scheduler error class is not valid';
  end if;
  if exists (
    select 1
      from jsonb_each_text(p_error_class_counts) as error_count(error_key, error_value)
     where error_value !~ '^[0-9]+$'
  ) then
    raise exception 'sanitized scheduler error count is not valid';
  end if;

  insert into public.comment_translator_paid_scheduler_runs (
    scheduler_authority,
    last_run_at,
    last_success_at,
    run_status,
    claim_count,
    retry_count,
    stale_count,
    error_class_counts,
    updated_at
  ) values (
    p_authority,
    p_run_at,
    case when p_status = 'success' then coalesce(p_last_success_at, p_run_at) else null end,
    p_status,
    p_claim_count,
    p_retry_count,
    p_stale_count,
    p_error_class_counts,
    p_run_at
  )
  on conflict (scheduler_authority) do update set
    last_run_at = excluded.last_run_at,
    last_success_at = case
      when excluded.run_status = 'success' then excluded.last_success_at
      else comment_translator_paid_scheduler_runs.last_success_at
    end,
    run_status = excluded.run_status,
    claim_count = excluded.claim_count,
    retry_count = excluded.retry_count,
    stale_count = excluded.stale_count,
    error_class_counts = excluded.error_class_counts,
    updated_at = excluded.updated_at;
  return true;
end;
$$;

create or replace function public.ct_paid_release_billing_period_characters(
  p_attempt_id text,
  p_provider_attempt text,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_released bigint;
  v_sibling_count integer;
begin
  p_now := statement_timestamp();
  if length(trim(p_provider_attempt)) = 0 or length(trim(p_provider_attempt)) > 200 then
    raise exception 'provider attempt is not valid';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;
  if v_logical.logical_state in ('committed', 'released') then
    return 0;
  end if;

  if v_attempt.attempt_state in ('committed', 'expired', 'released') then
    return 0;
  end if;

  v_released := v_logical.input_characters;
  if v_attempt.reserved_input_characters = 0 or v_attempt.billing_period_usage_id is null then
    return 0;
  end if;
  if v_attempt.billing_period_usage_id is distinct from v_logical.billing_period_usage_id
    or v_attempt.owner_user_id <> v_logical.owner_user_id
    or v_attempt.period_start is distinct from v_logical.period_start
    or v_attempt.period_end is distinct from v_logical.period_end
  then
    raise exception 'logical attempt billing period binding conflict';
  end if;

  select count(*)::integer
    into v_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and billing_period_usage_id = v_attempt.billing_period_usage_id
     and attempt_state in ('reserved', 'uncertain', 'expired');

  if v_sibling_count > 0 then
    update public.comment_translator_paid_attempt_receipts
       set reserved_input_characters = 0,
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
    return 0;
  end if;

  update public.comment_translator_paid_billing_period_usage
     set reserved_input_characters = reserved_input_characters - v_logical.input_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id
     and reserved_input_characters >= v_logical.input_characters;
  if not found then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         updated_at = p_now
    where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'released',
         updated_at = p_now
   where attempt_id = p_attempt_id;

  return v_released;
end;
$$;

create or replace function public.ct_paid_release_capacity(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_entitlement public.comment_translator_paid_entitlements%rowtype;
begin
  p_now := statement_timestamp();
  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null
    or not v_lifecycle.is_terminal
    or v_lifecycle.lifecycle_state not in ('incomplete_expired', 'canceled', 'terminated')
    or v_lifecycle.next_reconcile_at is not null
    or v_lifecycle.last_reconcile_error_class is not null
  then
    raise exception 'capacity release requires a terminal billing lifecycle';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for capacity update';
  end if;

  select *
    into v_entitlement
    from public.comment_translator_paid_entitlements
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_entitlement.id is not null
    and v_entitlement.entitlement_status not in (
      'canceled', 'incomplete_expired', 'inactive'
    )
  then
    raise exception 'capacity release requires terminal entitlement projection';
  end if;

  update public.comment_translator_paid_capacity_reservations
     set reservation_state = 'released',
         released_at = p_now,
         updated_at = p_now
   where lifecycle_id = p_lifecycle_id
     and reservation_state <> 'released';

  if not found then
    perform 1
      from public.comment_translator_paid_capacity_reservations
     where lifecycle_id = p_lifecycle_id
       and reservation_state = 'released';
    if found then
      return true;
    end if;
    raise exception 'capacity reservation is missing';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_reserve_billing_period_characters(
  p_attempt_id text,
  p_provider_attempt text,
  p_owner_user_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_characters bigint,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_shared_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_usage_id uuid;
begin
  p_now := statement_timestamp();
  if length(trim(p_provider_attempt)) = 0 or length(trim(p_provider_attempt)) > 200 then
    raise exception 'provider attempt is not valid';
  end if;

  if p_characters <= 0 or p_characters > 500000 then
    raise exception 'billing period character reservation is not valid';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is not null then
    if v_logical.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt owner binding conflict';
    end if;
    if v_logical.period_start is distinct from p_period_start or v_logical.period_end is distinct from p_period_end then
      raise exception 'logical attempt period binding conflict';
    end if;
    if v_logical.input_characters <> p_characters then
      raise exception 'logical attempt character reservation is not idempotent';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set billing_period_usage_id = v_logical.billing_period_usage_id,
           reserved_input_characters = v_logical.input_characters,
           requested_input_characters = v_logical.input_characters,
           updated_at = p_now
     where id = v_attempt.id;
    return case when v_logical.logical_state = 'reserved' then v_logical.input_characters else 0 end;
  end if;

  if v_attempt.attempt_state in ('committed', 'expired', 'released') then
    return 0;
  end if;

  if v_attempt.reserved_input_characters > 0 or v_attempt.committed_input_characters > 0 then
    if v_attempt.reserved_input_characters > 0 and v_attempt.reserved_input_characters <> p_characters then
      raise exception 'billing period character reservation is not idempotent';
    end if;
    return v_attempt.reserved_input_characters;
  end if;

  select *
    into v_shared_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and billing_period_usage_id is not null
     and attempt_state in ('reserved', 'uncertain', 'committed', 'released', 'expired')
   order by created_at
   limit 1
   for update;

  if v_shared_attempt.id is not null then
    if v_shared_attempt.reserved_input_characters <> p_characters then
      raise exception 'logical attempt character reservation is not idempotent';
    end if;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where id = v_shared_attempt.billing_period_usage_id
     for update;
    if v_usage.id is null or v_usage.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt billing period binding conflict';
    end if;
    p_period_start := v_usage.period_start;
    p_period_end := v_usage.period_end;
  else
    perform public.ct_paid_assert_current_paid_period(
      p_owner_user_id,
      p_period_start,
      p_period_end,
      p_now
    );
  end if;

  insert into public.comment_translator_paid_billing_period_usage (
    owner_user_id,
    period_start,
    period_end,
    updated_at
  )
  values (p_owner_user_id, p_period_start, p_period_end, p_now)
  on conflict (owner_user_id, period_start, period_end) do nothing;

  select *
    into v_usage
    from public.comment_translator_paid_billing_period_usage
   where owner_user_id = p_owner_user_id
     and period_start = p_period_start
     and period_end = p_period_end
   for update;

  if v_shared_attempt.id is null
    and v_usage.reserved_input_characters + v_usage.committed_input_characters + p_characters > v_usage.character_limit
  then
    raise exception 'billing period character quota is exhausted';
  end if;
  if v_shared_attempt.id is null and v_usage.period_state <> 'open' then
    raise exception 'billing period is closed for new reservations';
  end if;

  if v_shared_attempt.id is null then
    update public.comment_translator_paid_billing_period_usage
       set reserved_input_characters = reserved_input_characters + p_characters,
           updated_at = p_now
     where id = v_usage.id
    returning id into v_usage_id;
  else
    v_usage_id := v_usage.id;
  end if;

  update public.comment_translator_paid_attempt_receipts
     set billing_period_usage_id = v_usage_id,
         reserved_input_characters = p_characters,
         updated_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt;

  insert into public.comment_translator_paid_logical_attempts (
    attempt_id, owner_user_id, billing_period_usage_id, period_start, period_end,
    input_characters, logical_state, expires_at, created_at, updated_at
  )
  values (
    p_attempt_id, p_owner_user_id, v_usage_id, p_period_start, p_period_end,
    p_characters, 'reserved', p_now + interval '24 hours', p_now, p_now
  );

  return p_characters;
end;
$$;

create or replace function public.ct_paid_reserve_capacity(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_lifecycle_stage text,
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_existing public.comment_translator_paid_capacity_reservations%rowtype;
  v_reservation_id uuid;
  v_capacity_limit integer;
  v_reserved_count integer;
  v_target_capacity_stage text;
begin
  p_now := statement_timestamp();
  if p_lifecycle_stage not in (
    'checkout_hold', 'incomplete', 'active', 'cancel_at_period_end',
    'payment_failure_hold', 'dispute', 'cancel_pending', 'reconciliation'
  ) then
    raise exception 'capacity stage is not valid';
  end if;

  perform pg_advisory_xact_lock(47290101);

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null or v_lifecycle.owner_user_id <> p_owner_user_id or v_lifecycle.is_terminal then
    raise exception 'billing lifecycle is not capacity eligible';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for capacity update';
  end if;

  v_target_capacity_stage := case v_lifecycle.lifecycle_state
    when 'checkout_hold' then 'checkout_hold'
    when 'incomplete' then 'incomplete'
    when 'active' then 'active'
    when 'cancel_at_period_end' then 'cancel_at_period_end'
    when 'past_due' then 'payment_failure_hold'
    when 'unpaid' then 'payment_failure_hold'
    when 'dispute' then 'dispute'
    when 'cancel_pending' then 'cancel_pending'
    when 'paid_unentitled_reconciliation' then 'reconciliation'
    when 'refund_reconciliation' then 'reconciliation'
    when 'dispute_reconciliation' then 'reconciliation'
    else null
  end;
  if v_target_capacity_stage is null
    or p_lifecycle_stage is distinct from v_target_capacity_stage
  then
    raise exception 'capacity stage does not match billing lifecycle';
  end if;

  select *
    into v_existing
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;

  if v_existing.id is not null and v_existing.reservation_state <> 'released' then
    if v_existing.owner_user_id <> p_owner_user_id then
      raise exception 'capacity owner binding conflict';
    end if;
    if v_existing.lifecycle_stage is distinct from p_lifecycle_stage then
      raise exception 'capacity stage binding conflict';
    end if;
    return v_existing.id;
  end if;

  if v_existing.id is not null then
    raise exception 'released capacity reservation cannot be reused';
  end if;

  select capacity_limit
    into v_capacity_limit
    from public.comment_translator_paid_capacity_config
   where config_key = true
   for update;
  if v_capacity_limit is null then
    raise exception 'paid capacity configuration is unavailable';
  end if;

  select count(*)::integer
    into v_reserved_count
    from public.comment_translator_paid_capacity_reservations
   where reservation_state in ('held', 'consuming');

  if v_reserved_count >= v_capacity_limit then
    raise exception 'paid capacity is full';
  end if;

  insert into public.comment_translator_paid_capacity_reservations (
    lifecycle_id,
    owner_user_id,
    reservation_state,
    lifecycle_stage,
    created_at,
    updated_at
  )
  values (
    p_lifecycle_id,
    p_owner_user_id,
    case when p_lifecycle_stage = 'checkout_hold' then 'held' else 'consuming' end,
    p_lifecycle_stage,
    p_now,
    p_now
  )
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

create or replace function public.ct_paid_reserve_message_rate(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_reservation_key text,
  p_message_count integer,
  p_now timestamptz default now()
)
returns table (
  reservation_status text,
  minute_start timestamptz,
  reserved_messages integer,
  committed_messages integer,
  successful_message_count integer,
  capacity_remaining integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_minute_start timestamptz;
  v_reservation public.comment_translator_paid_message_rate_reservations%rowtype;
  v_bucket public.comment_translator_paid_message_rate_buckets%rowtype;
  v_session public.comment_translator_sessions%rowtype;
  v_used integer;
begin
  v_now := statement_timestamp();
  v_minute_start := date_trunc('minute', v_now);
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
    or p_reservation_key is null
    or length(trim(p_reservation_key)) = 0
    or length(p_reservation_key) > 200
    or p_message_count is null
    or p_message_count <= 0
    or p_message_count > 60
  then
    raise exception 'Paid message-rate reservation request is not valid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_reservation_key, 47290113));

  if exists (
    select 1
      from public.comment_translator_paid_message_rate_reservation_tombstones as rate_tombstone
     where rate_tombstone.reservation_key = p_reservation_key
       and rate_tombstone.expires_at > v_now
  ) then
    raise exception 'Paid message-rate reservation key is no longer available';
  end if;

  select *
    into v_session
    from public.comment_translator_sessions as paid_session
   where paid_session.owner_user_id = p_owner_user_id
     and paid_session.session_reference_id = p_session_reference_id
     and paid_session.status = 'active'
     and paid_session.plan = 'paid'
   for update;
  if v_session.id is null or v_now >= v_session.started_at + interval '3 hours' then
    raise exception 'Paid message-rate session authority is unreadable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':' || v_minute_start::text, 47290107));

  select *
    into v_reservation
    from public.comment_translator_paid_message_rate_reservations as rate_reservation
   where rate_reservation.reservation_key = p_reservation_key
   for update;
  if v_reservation.reservation_key is not null then
    if v_reservation.owner_user_id <> p_owner_user_id then
      raise exception 'Paid message-rate reservation owner binding conflict';
    end if;
    if v_reservation.reserved_messages <> p_message_count then
      raise exception 'Paid message-rate reservation count binding conflict';
    end if;
    if v_reservation.session_reference_id <> p_session_reference_id
      or v_reservation.expires_at <= v_now
    then
      raise exception 'Paid message-rate reservation session authority is unreadable';
    end if;
    if v_reservation.reservation_state = 'committed' then
      select *
        into v_bucket
        from public.comment_translator_paid_message_rate_buckets as rate_bucket
       where rate_bucket.owner_user_id = p_owner_user_id
         and rate_bucket.minute_start = v_reservation.minute_start;
      return query
        select
          v_reservation.reservation_state,
          v_reservation.minute_start,
          v_reservation.reserved_messages,
          v_reservation.committed_messages,
          v_reservation.successful_message_count,
          greatest(0, 60 - (coalesce(v_bucket.reserved_messages, 0) + coalesce(v_bucket.committed_messages, 0)));
      return;
    end if;
    if v_reservation.reservation_state = 'reserved' then
      select *
        into v_bucket
        from public.comment_translator_paid_message_rate_buckets as rate_bucket
       where rate_bucket.owner_user_id = p_owner_user_id
         and rate_bucket.minute_start = v_reservation.minute_start;
      return query
        select
          v_reservation.reservation_state,
          v_reservation.minute_start,
          v_reservation.reserved_messages,
          v_reservation.committed_messages,
          v_reservation.successful_message_count,
          greatest(0, 60 - (coalesce(v_bucket.reserved_messages, 0) + coalesce(v_bucket.committed_messages, 0)));
      return;
    end if;
    insert into public.comment_translator_paid_message_rate_buckets as rate_bucket (owner_user_id, minute_start, updated_at, expires_at)
    values (p_owner_user_id, v_minute_start, v_now, v_minute_start + interval '2 minutes')
    on conflict on constraint comment_translator_paid_message_rate_buckets_pkey do nothing;
    select *
      into v_bucket
      from public.comment_translator_paid_message_rate_buckets as rate_bucket
     where rate_bucket.owner_user_id = p_owner_user_id
       and rate_bucket.minute_start = v_minute_start
     for update;
    v_used := v_bucket.reserved_messages + v_bucket.committed_messages;
    if v_used + p_message_count > 60 then
      return query
        select 'rate-limited', v_minute_start, 0, 0, 0, greatest(0, 60 - v_used);
      return;
    end if;
    update public.comment_translator_paid_message_rate_reservations as rate_reservation
       set session_reference_id = p_session_reference_id,
           minute_start = v_minute_start,
           reserved_messages = p_message_count,
           committed_messages = 0,
           successful_message_count = 0,
           reservation_state = 'reserved',
           updated_at = v_now,
           expires_at = least(v_session.started_at + interval '3 hours' + interval '24 hours', v_now + interval '27 hours')
     where rate_reservation.reservation_key = p_reservation_key;
    update public.comment_translator_paid_message_rate_buckets as rate_bucket
       set reserved_messages = rate_bucket.reserved_messages + p_message_count,
           updated_at = v_now
     where rate_bucket.owner_user_id = p_owner_user_id
       and rate_bucket.minute_start = v_minute_start;
    return query
      select 'reserved', v_minute_start, p_message_count, 0, 0, 60 - v_used - p_message_count;
    return;
  end if;

  insert into public.comment_translator_paid_message_rate_buckets as rate_bucket (owner_user_id, minute_start, updated_at, expires_at)
  values (p_owner_user_id, v_minute_start, v_now, v_minute_start + interval '2 minutes')
  on conflict on constraint comment_translator_paid_message_rate_buckets_pkey do nothing;
  select *
    into v_bucket
    from public.comment_translator_paid_message_rate_buckets as rate_bucket
   where rate_bucket.owner_user_id = p_owner_user_id
     and rate_bucket.minute_start = v_minute_start
   for update;
  v_used := v_bucket.reserved_messages + v_bucket.committed_messages;
  if v_used + p_message_count > 60 then
    return query
      select 'rate-limited', v_minute_start, 0, 0, 0, greatest(0, 60 - v_used);
    return;
  end if;

  insert into public.comment_translator_paid_message_rate_reservations (
    reservation_key,
    owner_user_id,
    session_reference_id,
    minute_start,
    reserved_messages,
    committed_messages,
    successful_message_count,
    reservation_state,
    created_at,
    updated_at,
    expires_at
  )
  values (
    p_reservation_key,
    p_owner_user_id,
    p_session_reference_id,
    v_minute_start,
    p_message_count,
    0,
    0,
    'reserved',
    v_now,
    v_now,
    least(v_session.started_at + interval '3 hours' + interval '24 hours', v_now + interval '27 hours')
  );
  update public.comment_translator_paid_message_rate_buckets as rate_bucket
     set reserved_messages = rate_bucket.reserved_messages + p_message_count,
         updated_at = v_now
   where rate_bucket.owner_user_id = p_owner_user_id
     and rate_bucket.minute_start = v_minute_start;
  return query
    select 'reserved', v_minute_start, p_message_count, 0, 0, 60 - v_used - p_message_count;
end;
$$;

create or replace function public.ct_paid_reserve_poll_budget(
  p_session_reference_id text,
  p_owner_user_id uuid,
  p_daily_budget integer,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_existing public.comment_translator_paid_poll_reservations%rowtype;
  v_bucket public.comment_translator_paid_poll_budget_buckets%rowtype;
  v_utc_day date;
  v_day_end timestamptz;
  v_reserve_polls integer;
  v_session_reserved_polls integer;
  v_had_prior_reservation boolean;
begin
  -- Keep p_now only for signature compatibility; reservation authority is the
  -- database clock so a Worker cannot select the UTC bucket or threshold.
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or p_daily_budget <= 0
  then
    raise exception 'poll budget reservation request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290103);
  v_utc_day := (v_now at time zone 'UTC')::date;

  select *
    into v_existing
    from public.comment_translator_paid_poll_reservations
   where session_reference_id = p_session_reference_id
     and utc_day = v_utc_day
   for update;
  if v_existing.id is not null then
    if v_existing.owner_user_id <> p_owner_user_id then
      raise exception 'poll reservation owner binding conflict';
    end if;
    select *
      into v_bucket
      from public.comment_translator_paid_poll_budget_buckets
     where utc_day = v_utc_day
     for update;
    if v_bucket.utc_day is null or v_bucket.daily_budget <> p_daily_budget then
      raise exception 'poll budget configuration conflict';
    end if;
    return v_existing.reserved_polls;
  end if;

  if exists (
    select 1
      from public.comment_translator_paid_poll_reservations
     where session_reference_id = p_session_reference_id
       and owner_user_id <> p_owner_user_id
  ) then
    raise exception 'poll reservation owner binding conflict';
  end if;

  select
    coalesce(sum(reserved_polls), 0)::integer,
    count(*) > 0
    into v_session_reserved_polls, v_had_prior_reservation
    from public.comment_translator_paid_poll_reservations
   where session_reference_id = p_session_reference_id
     and owner_user_id = p_owner_user_id;

  v_day_end := ((v_utc_day + 1)::timestamp at time zone 'UTC');
  v_reserve_polls := least(
    720 - v_session_reserved_polls,
    floor(extract(epoch from (v_day_end - v_now)) / 15)::integer
  );
  if v_reserve_polls <= 0 then
    raise exception 'UTC poll budget window is exhausted';
  end if;

  insert into public.comment_translator_paid_poll_budget_buckets (
    utc_day, daily_budget, updated_at
  )
  values (v_utc_day, p_daily_budget, v_now)
  on conflict (utc_day) do nothing;
  select *
    into v_bucket
    from public.comment_translator_paid_poll_budget_buckets
   where utc_day = v_utc_day
   for update;
  if v_bucket.daily_budget <> p_daily_budget then
    raise exception 'poll budget configuration conflict';
  end if;

  if not v_had_prior_reservation
    and v_bucket.reserved_polls + v_reserve_polls >= floor(v_bucket.daily_budget * 0.90)
  then
    raise exception 'new Paid poll session threshold is exhausted';
  end if;
  if v_had_prior_reservation
    and v_bucket.reserved_polls + v_reserve_polls >= floor(v_bucket.daily_budget * 0.95)
  then
    raise exception 'active Paid poll session threshold is exhausted';
  end if;
  if v_bucket.reserved_polls + v_reserve_polls > v_bucket.daily_budget then
    raise exception 'daily Paid poll budget is exhausted';
  end if;

  insert into public.comment_translator_paid_poll_reservations (
    session_reference_id, owner_user_id, utc_day, reserved_polls, created_at
  )
  values (p_session_reference_id, p_owner_user_id, v_utc_day, v_reserve_polls, v_now);
  update public.comment_translator_paid_poll_budget_buckets
     set reserved_polls = reserved_polls + v_reserve_polls,
         updated_at = v_now
   where utc_day = v_utc_day;

  return v_reserve_polls;
end;
$$;

create or replace function public.ct_paid_retry_reconciler(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_error_class text,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_next_backoff integer;
begin
  p_now := statement_timestamp();
  if p_error_class not in (
    'object-retrieval-failed', 'database-transaction-failed', 'external-action-failed',
    'binding-not-ready', 'capacity-reconciliation-failed', 'period-reconciliation-failed'
  ) then raise exception 'error class is not valid'; end if;

  update public.comment_translator_paid_billing_lifecycles
     set reconcile_backoff_seconds = case
           when reconcile_attempt_count <= 1 then 60 when reconcile_attempt_count = 2 then 300
           when reconcile_attempt_count = 3 then 900 when reconcile_attempt_count = 4 then 3600 else 21600 end,
         next_reconcile_at = p_now + make_interval(secs => case
           when reconcile_attempt_count <= 1 then 60 when reconcile_attempt_count = 2 then 300
           when reconcile_attempt_count = 3 then 900 when reconcile_attempt_count = 4 then 3600 else 21600 end),
         reconcile_lease_until = null,
         reconcile_lease_token = null,
         last_reconcile_error_class = p_error_class,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
   returning reconcile_backoff_seconds into v_next_backoff;
  if found then return v_next_backoff; end if;

  update public.comment_translator_paid_maintenance_work_items
     set reconcile_backoff_seconds = case
           when reconcile_attempt_count <= 1 then 60 when reconcile_attempt_count = 2 then 300
           when reconcile_attempt_count = 3 then 900 when reconcile_attempt_count = 4 then 3600 else 21600 end,
         next_reconcile_at = p_now + make_interval(secs => case
           when reconcile_attempt_count <= 1 then 60 when reconcile_attempt_count = 2 then 300
           when reconcile_attempt_count = 3 then 900 when reconcile_attempt_count = 4 then 3600 else 21600 end),
         reconcile_lease_until = null,
         reconcile_lease_token = null,
         last_reconcile_error_class = p_error_class,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
   returning reconcile_backoff_seconds into v_next_backoff;
  if not found then raise exception 'stale reconcile lease token is not valid for retry'; end if;
  return v_next_backoff;
end;
$$;

create or replace function public.ct_paid_run_retention_cleanup(
  p_now timestamptz default now(),
  p_limit integer default 500
)
returns table (
  feed_snapshot_deleted integer,
  provider_hourly_detail_deleted integer,
  session_summary_deleted integer,
  stripe_event_deleted integer,
  aggregate_deleted integer,
  ended_subscription_deleted integer,
  attempt_ledger_deleted integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_remaining integer;
  v_deleted integer;
  v_total_deleted integer := 0;
  v_feed_snapshot_deleted integer := 0;
  v_provider_hourly_detail_deleted integer := 0;
  v_session_summary_deleted integer := 0;
  v_stripe_event_deleted integer := 0;
  v_aggregate_deleted integer := 0;
  v_ended_subscription_deleted integer := 0;
  v_attempt_ledger_deleted integer := 0;
  v_calendar_month_cutoff timestamptz := (
    date_trunc('month', v_now at time zone 'UTC') - interval '13 months'
  ) at time zone 'UTC';
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'paid retention cleanup limit is not valid';
  end if;

  -- The feed snapshot is the only durable browser-safe content exception.
  -- It is deleted only after the authoritative session ended plus 24 hours.
  with candidates as (
    select snapshot.id
      from public.comment_translator_real_comments_feed_snapshots snapshot
      join public.comment_translator_sessions session_row
        on session_row.session_reference_id = snapshot.session_reference_id
     where session_row.status = 'stopped'
       and session_row.stopped_at + interval '24 hours' <= v_now
     order by snapshot.updated_at, snapshot.id
     limit p_limit
     for update of snapshot skip locked
  )
  delete from public.comment_translator_real_comments_feed_snapshots target
   using candidates
   where target.id = candidates.id;
  get diagnostics v_feed_snapshot_deleted = row_count;
  v_deleted := v_feed_snapshot_deleted;
  v_total_deleted := v_total_deleted + v_deleted;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select detail.id
        from public.comment_translator_paid_provider_hourly_details detail
       where detail.utc_hour <= v_now - interval '30 days'
       order by detail.utc_hour, detail.id
       limit v_remaining
       for update of detail skip locked
    )
    delete from public.comment_translator_paid_provider_hourly_details target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_provider_hourly_detail_deleted = row_count;
    v_deleted := v_provider_hourly_detail_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select summary.id
        from public.comment_translator_paid_session_summaries summary
       where summary.ended_at is not null
         and summary.ended_at <= v_now - interval '90 days'
       order by summary.ended_at, summary.id
       limit v_remaining
       for update of summary skip locked
    )
    delete from public.comment_translator_paid_session_summaries target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_session_summary_deleted = row_count;
    v_deleted := v_session_summary_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select
        receipt.id,
        receipt.receipt_status,
        receipt.lease_until,
        receipt.lease_token
        from public.comment_translator_paid_stripe_event_receipts receipt
       where receipt.stripe_event_created_at <= v_now - interval '90 days'
         and not (
           receipt.receipt_status = 'processing'
           and receipt.lease_until > v_now
         )
       order by receipt.stripe_event_created_at, receipt.id
       limit v_remaining
       for update of receipt skip locked
    )
    delete from public.comment_translator_paid_stripe_event_receipts target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_stripe_event_deleted = row_count;
    v_deleted := v_stripe_event_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  -- Aggregate buckets are retained for 13 calendar months. Open buckets are
  -- never removed by retention; period and UTC-month reconciliation owns them.
  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select bucket.id
        from public.comment_translator_paid_owner_cost_buckets bucket
       where bucket.period_state = 'closed'
         and bucket.period_end < v_calendar_month_cutoff
       order by bucket.period_end, bucket.id
       limit v_remaining
       for update of bucket skip locked
    )
    delete from public.comment_translator_paid_owner_cost_buckets target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    v_aggregate_deleted := v_aggregate_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select bucket.id
        from public.comment_translator_paid_global_cost_buckets bucket
       where bucket.bucket_state = 'closed'
         and bucket.utc_month < v_calendar_month_cutoff::date
       order by bucket.utc_month, bucket.id
       limit v_remaining
       for update of bucket skip locked
    )
    delete from public.comment_translator_paid_global_cost_buckets target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    v_aggregate_deleted := v_aggregate_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select bucket.id
        from public.comment_translator_paid_azure_fallback_buckets bucket
       where bucket.bucket_state = 'closed'
         and bucket.utc_month < v_calendar_month_cutoff::date
       order by bucket.utc_month, bucket.id
       limit v_remaining
       for update of bucket skip locked
    )
    delete from public.comment_translator_paid_azure_fallback_buckets target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    v_aggregate_deleted := v_aggregate_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select usage_row.id
        from public.comment_translator_paid_billing_period_usage usage_row
       where usage_row.period_state = 'closed'
         and usage_row.period_end < v_calendar_month_cutoff
       order by usage_row.period_end, usage_row.id
       limit v_remaining
       for update of usage_row skip locked
    )
    delete from public.comment_translator_paid_billing_period_usage target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    v_aggregate_deleted := v_aggregate_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  -- Delete only terminal subscription references beyond the 13-calendar-month
  -- cutoff. Active/current subscriptions are retained. Direct retention delete
  -- does not create a new tombstone, and old subscription tombstones expire on
  -- the same bounded authority rather than extending raw IDs indefinitely.
  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    perform set_config('app.ct_paid_retention_cleanup', 'subscription-reference', true);
    with candidates as (
      select binding.id
        from public.comment_translator_paid_subscription_bindings binding
        join public.comment_translator_paid_billing_lifecycles lifecycle
          on lifecycle.id = binding.lifecycle_id
       where lifecycle.is_terminal = true
         and lifecycle.updated_at < v_calendar_month_cutoff
         and not exists (
           select 1
             from public.comment_translator_paid_entitlements entitlement
            where entitlement.lifecycle_id = lifecycle.id
              and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'past_due', 'unpaid')
         )
       order by lifecycle.updated_at, binding.id
       limit v_remaining
       for update of binding skip locked
    )
    delete from public.comment_translator_paid_subscription_bindings target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    perform set_config('app.ct_paid_retention_cleanup', 'off', true);
    v_ended_subscription_deleted := v_ended_subscription_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select tombstone.external_id_kind, tombstone.external_id
        from public.comment_translator_paid_external_id_tombstones tombstone
       where tombstone.external_id_kind = 'subscription'
         and tombstone.created_at < v_calendar_month_cutoff
       order by tombstone.created_at, tombstone.external_id
       limit v_remaining
       for update of tombstone skip locked
    )
    delete from public.comment_translator_paid_external_id_tombstones target
     using candidates
     where target.external_id_kind = candidates.external_id_kind
       and target.external_id = candidates.external_id;
    get diagnostics v_deleted = row_count;
    v_ended_subscription_deleted := v_ended_subscription_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    v_attempt_ledger_deleted := public.ct_paid_cleanup_attempt_ledgers(v_now, v_remaining);
  else
    v_attempt_ledger_deleted := 0;
  end if;

  return query
    select
      v_feed_snapshot_deleted,
      v_provider_hourly_detail_deleted,
      v_session_summary_deleted,
      v_stripe_event_deleted,
      v_aggregate_deleted,
      v_ended_subscription_deleted,
      v_attempt_ledger_deleted;
end;
$$;

create or replace function public.ct_paid_schedule_durable_reconciliation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_state_work_kind text;
  v_has_checkout_binding boolean := false;
  v_has_subscription_binding boolean := false;
  v_has_due_billing_period boolean := false;
begin
  if new.is_terminal then
    return new;
  end if;

  if new.lifecycle_state in ('checkout_hold', 'incomplete') then
    select exists (
      select 1
        from public.comment_translator_paid_checkout_session_bindings session_binding
       where session_binding.lifecycle_id = new.id
    ) into v_has_checkout_binding;
    select exists (
      select 1
        from public.comment_translator_paid_subscription_bindings subscription_binding
       where subscription_binding.lifecycle_id = new.id
    ) into v_has_subscription_binding;
  end if;
  if new.lifecycle_state in ('active', 'cancel_at_period_end') then
    select exists (
      select 1
        from public.comment_translator_paid_entitlements entitlement
       where entitlement.lifecycle_id = new.id
         and entitlement.current_period_end <= statement_timestamp()
         and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
    ) into v_has_due_billing_period;
  end if;

  v_state_work_kind := case
    when new.lifecycle_state = 'expire_required' then 'checkout-expiry'
    when new.lifecycle_state in ('checkout_hold', 'incomplete')
      and not v_has_checkout_binding
      and not v_has_subscription_binding
      then 'unbound-checkout-session'
    when new.lifecycle_state in ('checkout_hold', 'incomplete') then 'checkout-expiry'
    when new.lifecycle_state in ('past_due', 'unpaid')
      and new.payment_failure_started_at is not null
      and new.payment_failure_started_at <= statement_timestamp() - interval '7 days'
      then 'payment-failure-seven-day'
    when new.lifecycle_state = 'cancel_pending' then 'cancel-pending'
    when new.lifecycle_state = 'refund_reconciliation' then 'refund-reconciliation'
    when new.lifecycle_state in ('dispute', 'dispute_reconciliation') then 'dispute-reconciliation'
    when new.lifecycle_state = 'paid_unentitled_reconciliation'
      and new.paid_unentitled_operator_disposition is not null
      then 'paid-unentitled-reconciliation'
    when new.lifecycle_state in ('active', 'cancel_at_period_end') and v_has_due_billing_period
      then 'billing-period-rollover'
    else null
  end;

  if v_state_work_kind is not null then
    new.reconcile_work_kind := v_state_work_kind;
    new.next_reconcile_at := coalesce(new.next_reconcile_at, statement_timestamp());
  else
    -- A recovered or otherwise incompatible lifecycle must not inherit stale
    -- checkout, payment-failure, or Paid-stopping work.
    new.reconcile_work_kind := null;
    new.next_reconcile_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.ct_paid_set_paid_unentitled_operator_disposition(
  p_lifecycle_id uuid,
  p_operator_disposition text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  if p_operator_disposition not in ('refund-cancel', 'capacity-correction-approved') then
    raise exception 'Paid unentitled operator disposition is not valid';
  end if;
  update public.comment_translator_paid_billing_lifecycles
     set paid_unentitled_operator_disposition = p_operator_disposition,
         reconcile_work_kind = 'paid-unentitled-reconciliation',
         next_reconcile_at = p_now,
         last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and lifecycle_state = 'paid_unentitled_reconciliation'
     and is_terminal = false
     and paid_unentitled_operator_disposition is null;
  if not found then
    raise exception 'Paid unentitled lifecycle is not eligible for operator disposition';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_settle_azure_partial_failure(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_actual_input_characters bigint,
  p_actual_billing_input_characters bigint,
  p_provider_failure_class text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_active_sibling_count integer;
  v_expected_attempt_state text;
  v_expected_circuit_state text;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_actual_input_characters < 0
    or p_actual_billing_input_characters < p_actual_input_characters
    or p_provider_failure_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'invalid-response', 'quota', 'configuration', 'policy')
  then
    raise exception 'Azure partial failure settlement is not valid';
  end if;
  v_expected_attempt_state := case when p_actual_input_characters > 0 then 'committed' else 'released' end;
  v_expected_circuit_state := case when p_provider_failure_class = 'quota' then 'recorded' else 'pending' end;

  select * into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.id is null or v_attempt.provider_kind <> 'azure_direct_fallback' then
    raise exception 'Azure partial failure attempt is missing';
  end if;

  select * into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'Azure partial failure logical attempt is missing';
  end if;
  if p_actual_input_characters > v_attempt.reserved_input_characters
    or p_actual_billing_input_characters > v_logical.input_characters
  then
    raise exception 'Azure partial failure character settlement is not valid';
  end if;

  if v_attempt.attempt_state in ('committed', 'released', 'expired') then
    if v_attempt.attempt_state = v_expected_attempt_state
      and v_attempt.provider_failure_class is not distinct from p_provider_failure_class
      and v_attempt.committed_input_characters = p_actual_input_characters
      and v_attempt.successful_input_characters = p_actual_input_characters
      and v_attempt.circuit_failure_state in (v_expected_circuit_state, 'recorded')
      and (
        (p_actual_billing_input_characters = 0 and v_logical.logical_state = 'released')
        or (
          p_actual_billing_input_characters > 0
          and v_logical.logical_state = 'committed'
          and v_logical.committed_input_characters = p_actual_billing_input_characters
        )
      )
    then
      return true;
    end if;
    raise exception 'Azure partial failure terminal binding conflict';
  end if;
  if v_attempt.attempt_state not in ('reserved', 'uncertain') or v_logical.logical_state <> 'reserved' then
    raise exception 'Azure partial failure authority is not active';
  end if;

  select * into v_lease
    from public.comment_translator_paid_session_leases
   where attempt_id = p_attempt_id
     and lease_token = p_session_lease_token
   for update;
  if v_lease.id is null
    or v_lease.provider_attempt <> p_provider_attempt
    or v_lease.lease_state not in ('active', 'uncertain')
    or v_lease.lease_until <= p_now
  then
    raise exception 'Azure partial failure session lease is not active';
  end if;

  if p_actual_billing_input_characters > 0 then
    perform public.ct_paid_commit_billing_period_characters(
      p_attempt_id, p_provider_attempt, p_actual_billing_input_characters, p_now
    );
  else
    perform public.ct_paid_settle_logical_attempt_after_provider_failure(p_attempt_id, false, p_now);
  end if;

  update public.comment_translator_paid_azure_fallback_buckets
     set reserved_paid_characters = reserved_paid_characters - v_attempt.reserved_input_characters,
         committed_paid_characters = committed_paid_characters + p_actual_input_characters,
         updated_at = p_now
   where id = v_attempt.azure_bucket_id;
  if not found then
    raise exception 'Azure partial failure bucket is missing';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set attempt_state = v_expected_attempt_state,
         provider_failure_class = p_provider_failure_class,
         committed_input_characters = p_actual_input_characters,
         successful_input_characters = p_actual_input_characters,
         fallback_eligible = false,
         circuit_failure_state = v_expected_circuit_state,
         circuit_success_state = 'not-required',
         updated_at = p_now
   where id = v_attempt.id;

  if p_provider_failure_class = 'quota' then
    select * into v_circuit
      from public.comment_translator_paid_provider_circuits
     where provider = 'azure_fallback'
     for update;
    if v_circuit.provider is null then
      raise exception 'Azure fallback circuit is missing';
    end if;
    update public.comment_translator_paid_provider_circuits
       set circuit_state = 'disabled', failure_count = 0,
           window_started_at = null, degraded_until = null,
           probe_attempt_id = null, probe_lease_until = null,
           last_error_class = 'quota', updated_at = p_now
     where provider = 'azure_fallback';
  end if;

  select count(*)::integer into v_active_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and attempt_state in ('reserved', 'uncertain')
     and expires_at > p_now;
  if v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released', lease_until = p_now, updated_at = p_now
     where id = v_lease.id;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
     where id = v_lease.id;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_settle_logical_attempt_after_provider_failure(
  p_attempt_id text,
  p_allow_unknown_reclaim boolean,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_has_azure_attempt boolean;
  v_committed_sibling_count integer;
  v_active_or_uncertain_sibling_count integer;
begin
  p_now := statement_timestamp();

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;
  if v_logical.logical_state in ('committed', 'released') then
    return 0;
  end if;

  select
    coalesce(bool_or(provider_kind = 'azure_direct_fallback'), false),
    count(*) filter (where attempt_state = 'committed' and provider_failure_class is null)::integer,
    count(*) filter (where attempt_state in ('reserved', 'uncertain'))::integer
    into v_has_azure_attempt, v_committed_sibling_count, v_active_or_uncertain_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;

  if (not v_has_azure_attempt and not p_allow_unknown_reclaim)
    or v_committed_sibling_count > 0
    or v_active_or_uncertain_sibling_count > 0
  then
    return 0;
  end if;

  select *
    into v_usage
    from public.comment_translator_paid_billing_period_usage
   where id = v_logical.billing_period_usage_id
   for update;
  if v_usage.id is null then
    raise exception 'billing period usage bucket is missing';
  end if;
  if v_usage.reserved_input_characters < v_logical.input_characters then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_billing_period_usage
     set reserved_input_characters = reserved_input_characters - v_logical.input_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id;
  if not found then
    raise exception 'billing period usage bucket is missing';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'released',
         updated_at = p_now
   where attempt_id = p_attempt_id;

  return v_logical.input_characters;
end;
$$;

create or replace function public.ct_paid_start_session_and_reserve_poll_budget(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_plan_entitlement_reference_id text,
  p_credential_reference_id text,
  p_daily_budget integer,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_reserved_polls integer;
begin
  -- Keep p_now only for signature compatibility. Session start and UTC poll
  -- reservation authority both use the same database transaction and clock.
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
    or p_plan_entitlement_reference_id is null
    or length(trim(p_plan_entitlement_reference_id)) = 0
    or length(p_plan_entitlement_reference_id) > 200
    or p_credential_reference_id is null
    or length(trim(p_credential_reference_id)) = 0
    or length(p_credential_reference_id) > 200
    or p_daily_budget is null
    or p_daily_budget <= 0
  then
    raise exception 'Paid atomic session start request is not valid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text, 47290111));
  if exists (
    select 1
      from public.comment_translator_sessions
     where owner_user_id = p_owner_user_id
       and status = 'active'
  ) then
    raise exception 'Paid owner already has an active session';
  end if;

  insert into public.comment_translator_sessions (
    owner_user_id, session_reference_id, provider, plan,
    plan_entitlement_reference_id, status, started_at, last_heartbeat_at,
    stopped_at, stop_reason, credential_reference_id, created_at, updated_at
  )
  values (
    p_owner_user_id, p_session_reference_id, 'youtube', 'paid',
    p_plan_entitlement_reference_id, 'active', v_now, v_now,
    null, null, p_credential_reference_id, v_now, v_now
  );

  v_reserved_polls := public.ct_paid_reserve_poll_budget(
    p_session_reference_id,
    p_owner_user_id,
    p_daily_budget,
    v_now
  );
  if v_reserved_polls < 1 or v_reserved_polls > 720 then
    raise exception 'Paid atomic session poll reservation is invalid';
  end if;
  return v_reserved_polls;
end;
$$;

create or replace function public.ct_paid_touch_active_paid_session_heartbeat(
  p_owner_user_id uuid,
  p_session_reference_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_started_at timestamptz;
  v_last_heartbeat_at timestamptz;
begin
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
  then
    raise exception 'Paid session heartbeat request is not valid';
  end if;

  select started_at, last_heartbeat_at
    into v_started_at, v_last_heartbeat_at
    from public.comment_translator_sessions
   where owner_user_id = p_owner_user_id
     and session_reference_id = p_session_reference_id
     and status = 'active'
     and plan = 'paid'
   for update;
  if not found then
    raise exception 'Paid session heartbeat authority is unreadable';
  end if;

  if v_last_heartbeat_at is null then
    raise exception 'Paid session heartbeat authority is unreadable';
  end if;
  -- Active Paid polls arrive every 15 seconds, but section 17.1 permits at
  -- most one durable heartbeat write per minute. Preserve the existing
  -- 45-second missing-heartbeat grace after that bounded coalescing window.
  if v_last_heartbeat_at + interval '1 minute' + interval '45 seconds' < v_now then
    return jsonb_build_object('status', 'missing-heartbeat');
  end if;

  if v_started_at + interval '3 hours' <= v_now then
    return jsonb_build_object('status', 'expired');
  end if;

  if v_last_heartbeat_at + interval '1 minute' <= v_now then
    update public.comment_translator_sessions
       set last_heartbeat_at = v_now,
           updated_at = v_now
     where owner_user_id = p_owner_user_id
       and session_reference_id = p_session_reference_id
       and status = 'active'
       and plan = 'paid';
    if not found then
      raise exception 'Paid session heartbeat authority is unreadable';
    end if;
  end if;
  return jsonb_build_object(
    'status', 'touched',
    'heartbeatAtIso', to_jsonb(v_now)
  );
end;
$$;

create or replace function public.ct_paid_upsert_session_summary(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_stop_reason text,
  p_provider_request_count integer,
  p_translated_message_count integer,
  p_input_characters bigint,
  p_output_characters bigint,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  p_now := statement_timestamp();
  if length(trim(p_session_reference_id)) = 0
    or p_provider_request_count < 0 or p_translated_message_count < 0
    or p_input_characters < 0 or p_output_characters < 0
    or (p_ended_at is not null and p_ended_at < p_started_at)
    or (p_stop_reason is not null and (
      length(p_stop_reason) = 0
      or length(p_stop_reason) > 64
      or p_stop_reason !~ '^[a-z0-9][a-z0-9_-]*$'
    ))
  then
    raise exception 'session summary is not valid';
  end if;

  insert into public.comment_translator_paid_session_summaries (
    owner_user_id, session_reference_id, started_at, ended_at, stop_reason,
    provider_request_count, translated_message_count, input_characters, output_characters,
    created_at, updated_at
  ) values (
    p_owner_user_id, p_session_reference_id, p_started_at, p_ended_at, p_stop_reason,
    p_provider_request_count, p_translated_message_count, p_input_characters, p_output_characters,
    p_now, p_now
  )
  on conflict (session_reference_id) do update
     set ended_at = case
           when comment_translator_paid_session_summaries.ended_at is null then excluded.ended_at
           when excluded.ended_at is null then comment_translator_paid_session_summaries.ended_at
           else greatest(comment_translator_paid_session_summaries.ended_at, excluded.ended_at)
         end,
         stop_reason = coalesce(excluded.stop_reason, comment_translator_paid_session_summaries.stop_reason),
         provider_request_count = greatest(comment_translator_paid_session_summaries.provider_request_count, excluded.provider_request_count),
         translated_message_count = greatest(comment_translator_paid_session_summaries.translated_message_count, excluded.translated_message_count),
         input_characters = greatest(comment_translator_paid_session_summaries.input_characters, excluded.input_characters),
         output_characters = greatest(comment_translator_paid_session_summaries.output_characters, excluded.output_characters),
         updated_at = p_now
   where comment_translator_paid_session_summaries.owner_user_id = excluded.owner_user_id
     and comment_translator_paid_session_summaries.started_at = excluded.started_at
  returning id into v_id;
  if v_id is null then
    raise exception 'session summary binding conflict';
  end if;
  return v_id;
end;
$$;

create or replace function public.ct_paid_valid_successful_item_attempt_ids(
  p_successful_item_attempt_ids text[]
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select p_successful_item_attempt_ids is not null
    and cardinality(p_successful_item_attempt_ids) <= 15
    and not exists (
      select 1
        from unnest(p_successful_item_attempt_ids) as item(attempt_id)
       where item.attempt_id is null
          or item.attempt_id !~ '^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$'
    )
    and cardinality(p_successful_item_attempt_ids) = (
      select count(distinct item.attempt_id)::integer
        from unnest(p_successful_item_attempt_ids) as item(attempt_id)
    );
$$;

revoke all privileges on table public.comment_translator_paid_maintenance_work_items from public, anon, authenticated, service_role;
revoke all privileges on table public.comment_translator_paid_message_rate_reservation_tombstones from public, anon, authenticated, service_role;
revoke all privileges on table public.comment_translator_paid_scheduler_runs from public, anon, authenticated, service_role;
revoke all privileges on function public.ct_paid_schedule_durable_reconciliation() from public, anon, authenticated, service_role;
