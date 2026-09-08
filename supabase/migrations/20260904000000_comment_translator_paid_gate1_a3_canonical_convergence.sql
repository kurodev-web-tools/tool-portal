-- A3 forward-only convergence for the two measured definition drifts.
-- Source bytes are copied from the repository migration after LF replay.
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

revoke all privileges on table public.comment_translator_paid_maintenance_work_items from public, anon, authenticated, service_role;
revoke all privileges on table public.comment_translator_paid_message_rate_reservation_tombstones from public, anon, authenticated, service_role;
revoke all privileges on table public.comment_translator_paid_scheduler_runs from public, anon, authenticated, service_role;
revoke all privileges on function public.ct_paid_schedule_durable_reconciliation() from public, anon, authenticated, service_role;
