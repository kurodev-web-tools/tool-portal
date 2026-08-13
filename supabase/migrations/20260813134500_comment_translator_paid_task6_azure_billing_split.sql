-- Task 6 additive settlement seam.
--
-- When OpenAI has already translated a subset and Azure translates the
-- remainder, the logical Paid billing-period commit is the combined
-- successful character count, while the Azure fallback bucket must receive
-- only the characters actually sent successfully to Azure. The Task 5
-- finalizer accepts one character value for both ledgers, so this narrow
-- completed-only RPC keeps those two authorities separate without changing
-- the existing finalizer contract.
-- Remote application is a separate approval gate and is intentionally not
-- run in this thread.

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

revoke all on function public.ct_paid_finalize_azure_fallback_with_billing_characters(
  text, text, uuid, text, bigint, bigint, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.ct_paid_finalize_azure_fallback_with_billing_characters(
  text, text, uuid, text, bigint, bigint, timestamptz, text
) to service_role;
