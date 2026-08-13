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

revoke all on function public.ct_paid_valid_successful_item_attempt_ids(text[])
  from public, anon, authenticated, service_role;

alter table public.comment_translator_paid_attempt_receipts
  add column if not exists successful_item_attempt_ids text[] not null default array[]::text[],
  add column if not exists successful_input_characters bigint not null default 0,
  add column if not exists successful_metadata_recorded boolean not null default false;

alter table public.comment_translator_paid_attempt_receipts
  add constraint comment_translator_paid_attempt_receipts_success_metadata_check
  check (
    public.ct_paid_valid_successful_item_attempt_ids(successful_item_attempt_ids)
    and successful_input_characters between 0 and 7500
    and (
      successful_metadata_recorded = false
      and cardinality(successful_item_attempt_ids) = 0
      and successful_input_characters = 0
      or successful_metadata_recorded = true
      and ((cardinality(successful_item_attempt_ids) = 0) = (successful_input_characters = 0))
    )
  );

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

revoke all on function public.ct_paid_finalize_openai_attempt_with_successes(text,text,uuid,uuid,text,bigint,bigint,text,text[],bigint,timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_finalize_openai_attempt_with_successes(text,text,uuid,uuid,text,bigint,bigint,text,text[],bigint,timestamptz)
  to service_role;

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

revoke all on function public.ct_paid_read_openai_attempt_with_successes(text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_read_openai_attempt_with_successes(text,text)
  to service_role;
