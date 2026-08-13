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

revoke all on function public.ct_paid_commit_terminal_openai_partial(text, text, bigint, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_commit_terminal_openai_partial(text, text, bigint, timestamptz)
  to service_role;
