-- Task 6 additive replay/circuit authority. Provider receipts retain only
-- allowlisted decisions needed to resume without another provider POST.

alter table public.comment_translator_paid_attempt_receipts
  add column if not exists fallback_eligible boolean not null default false,
  add column if not exists circuit_failure_state text not null default 'not-required',
  add column if not exists circuit_success_state text not null default 'not-required';

alter table public.comment_translator_paid_attempt_receipts
  add constraint comment_translator_paid_attempt_receipts_circuit_metadata_check
  check (
    circuit_failure_state in ('not-required', 'deferred', 'pending', 'recorded')
    and circuit_success_state in ('not-required', 'pending', 'recorded')
    and not (circuit_failure_state <> 'not-required' and circuit_success_state <> 'not-required')
  );

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

revoke all on function public.ct_paid_finalize_openai_attempt_with_metadata(text,text,uuid,uuid,text,bigint,bigint,text,text[],bigint,boolean,text,text,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_finalize_openai_attempt_with_metadata(text,text,uuid,uuid,text,bigint,bigint,text,text[],bigint,boolean,text,text,timestamptz) to service_role;
revoke all on function public.ct_paid_finalize_azure_fallback_with_metadata(text,text,uuid,text,bigint,bigint,text,text,text,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_finalize_azure_fallback_with_metadata(text,text,uuid,text,bigint,bigint,text,text,text,timestamptz) to service_role;
revoke all on function public.ct_paid_read_provider_attempt_replay_metadata(text,text) from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_read_provider_attempt_replay_metadata(text,text) to service_role;
revoke all on function public.ct_paid_record_attempt_circuit_failure(text,text,text,text,boolean,boolean,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_record_attempt_circuit_failure(text,text,text,text,boolean,boolean,timestamptz) to service_role;
revoke all on function public.ct_paid_record_attempt_circuit_success(text,text,text,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_record_attempt_circuit_success(text,text,text,timestamptz) to service_role;
