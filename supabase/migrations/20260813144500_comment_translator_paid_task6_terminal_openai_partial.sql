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
  v_receipt public.comment_translator_paid_attempt_receipts%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_unsafe_receipt_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if length(trim(p_provider_attempt)) = 0 or length(trim(p_provider_attempt)) > 200 then
    raise exception 'provider attempt is not valid';
  end if;
  if p_actual_characters <= 0 then
    raise exception 'terminal OpenAI partial character commit is not valid';
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
    into v_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt;
  if v_receipt.attempt_id is null
    or v_receipt.provider_kind <> 'openai_attempt'
    or v_receipt.attempt_state <> 'committed'
    or v_receipt.provider_failure_class <> 'invalid-response'
    or v_receipt.committed_input_characters <> 0
  then
    raise exception 'terminal OpenAI partial commit requires a committed invalid-response receipt';
  end if;

  if v_logical.logical_state = 'committed' then
    if v_logical.committed_input_characters is distinct from p_actual_characters then
      raise exception 'terminal OpenAI partial replay binding conflict';
    end if;
    return v_logical.committed_input_characters;
  end if;
  if v_logical.logical_state <> 'reserved' then
    raise exception 'terminal OpenAI partial logical attempt is not reservable';
  end if;
  if p_actual_characters > v_logical.input_characters then
    raise exception 'terminal OpenAI partial character commit is not valid';
  end if;
  if v_receipt.billing_period_usage_id is distinct from v_logical.billing_period_usage_id
    or v_receipt.owner_user_id <> v_logical.owner_user_id
    or v_receipt.period_start is distinct from v_logical.period_start
    or v_receipt.period_end is distinct from v_logical.period_end
  then
    raise exception 'terminal OpenAI partial billing period binding conflict';
  end if;

  select count(*)::integer
    into v_unsafe_receipt_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and (
       attempt_state not in ('committed', 'released')
       or (
         attempt_state = 'committed'
         and (
           provider_failure_class is null
           or provider_failure_class not in ('invalid-response', 'rate-limit')
         )
       )
     );
  if v_unsafe_receipt_count > 0 then
    raise exception 'active or unknown provider receipt prevents terminal OpenAI partial commit';
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
         committed_input_characters = committed_input_characters + p_actual_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id
     and reserved_input_characters >= v_logical.input_characters;
  if not found then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         committed_input_characters = case
           when provider_attempt = p_provider_attempt then p_actual_characters
           else committed_input_characters
         end,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'committed',
         committed_input_characters = p_actual_characters,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_session_leases
     set lease_state = 'released',
         lease_until = p_now,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and lease_state in ('active', 'uncertain');

  return p_actual_characters;
end;
$$;

revoke all on function public.ct_paid_commit_terminal_openai_partial(text, text, bigint, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_commit_terminal_openai_partial(text, text, bigint, timestamptz)
  to service_role;
