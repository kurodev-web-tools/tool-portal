-- Task 6 additive at-most-once dispatch and Azure partial-failure settlement.
-- Dispatch rows contain only opaque attempt identity and bounded sequence state;
-- provider payloads and responses are never persisted.

create table if not exists public.comment_translator_paid_provider_dispatch_claims (
  attempt_id text not null,
  provider_attempt text not null,
  dispatch_sequence smallint not null check (dispatch_sequence >= 0 and dispatch_sequence < 15),
  provider_kind text not null check (provider_kind in ('openai_attempt', 'azure_direct_fallback')),
  dispatched_at timestamptz not null,
  expires_at timestamptz not null,
  primary key (attempt_id, provider_attempt, dispatch_sequence),
  foreign key (attempt_id, provider_attempt)
    references public.comment_translator_paid_attempt_receipts(attempt_id, provider_attempt)
    on delete cascade
);

alter table public.comment_translator_paid_provider_dispatch_claims enable row level security;
revoke all on table public.comment_translator_paid_provider_dispatch_claims from public, anon, authenticated, service_role;

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

revoke all on function public.ct_paid_claim_provider_dispatch(text,text,text,integer,uuid,uuid,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_claim_provider_dispatch(text,text,text,integer,uuid,uuid,timestamptz) to service_role;
revoke all on function public.ct_paid_settle_azure_partial_failure(text,text,uuid,bigint,bigint,text,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_settle_azure_partial_failure(text,text,uuid,bigint,bigint,text,timestamptz) to service_role;
