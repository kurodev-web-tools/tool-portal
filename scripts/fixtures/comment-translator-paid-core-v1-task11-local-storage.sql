begin;

set local statement_timeout = '10min';
set local lock_timeout = '5s';
set local synchronous_commit = off;

insert into auth.users (id, aud, role, created_at, updated_at)
select
  md5('task11-storage-owner-' || owner_number::text)::uuid,
  'authenticated',
  'authenticated',
  statement_timestamp(),
  statement_timestamp()
from generate_series(1, 20) as owner(owner_number);

insert into public.comment_translator_paid_billing_period_usage (
  id,
  owner_user_id,
  period_start,
  period_end,
  period_state
)
select
  md5('task11-storage-billing-' || owner_number::text)::uuid,
  md5('task11-storage-owner-' || owner_number::text)::uuid,
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '29 days',
  'open'
from generate_series(1, 20) as billing_period(owner_number);

create temporary table task11_storage_provider_source_plan on commit drop as
select
  source_number,
  'ctpa_storage_' || lpad(source_number::text, 43, '0') as attempt_id,
  'storage-provider-attempt-' || source_number::text as provider_attempt,
  md5('task11-storage-owner-' || (((source_number - 1) % 20) + 1)::text)::uuid as owner_user_id,
  case
    when (((source_number - 1) / 20) % 2) = 0 then 'openai_attempt'
    else 'azure_direct_fallback'
  end as provider_kind,
  case
    when (((source_number - 1) / 20) % 2) = 0 then 'openai'
    else 'azure_fallback'
  end as provider,
  date_trunc('hour', statement_timestamp()) - (((source_number - 1) / 40)::integer * interval '1 hour') as utc_hour
from generate_series(1, 28800) as provider_source(source_number);

insert into public.comment_translator_paid_logical_attempts (
  attempt_id,
  owner_user_id,
  billing_period_usage_id,
  period_start,
  period_end,
  input_characters,
  logical_state,
  committed_input_characters,
  expires_at
)
select
  'ctpa_storage_' || lpad(attempt_number::text, 43, '0'),
  md5('task11-storage-owner-' || (((attempt_number - 1) % 20) + 1)::text)::uuid,
  md5('task11-storage-billing-' || (((attempt_number - 1) % 20) + 1)::text)::uuid,
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '29 days',
  100,
  'committed',
  100,
  statement_timestamp() + interval '27 hours'
from generate_series(1, 129600) as logical_attempt(attempt_number);

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
  requested_input_characters,
  requested_cost_micros,
  requested_request_count,
  requested_token_count,
  billing_period_usage_id,
  committed_input_characters
)
select
  coalesce(provider_source.attempt_id, 'ctpa_storage_' || lpad(receipt_number::text, 43, '0')),
  coalesce(provider_source.provider_attempt, 'storage-provider-attempt-' || receipt_number::text),
  coalesce(
    provider_source.provider_kind,
    case when receipt_number % 2 = 0 then 'openai_attempt' else 'azure_direct_fallback' end
  ),
  'storage-session-' || (((receipt_number - 1) % 14400) + 1)::text,
  coalesce(
    provider_source.owner_user_id,
    md5('task11-storage-owner-' || (((receipt_number - 1) % 20) + 1)::text)::uuid
  ),
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '29 days',
  date_trunc('month', statement_timestamp() at time zone 'UTC')::date,
  'committed',
  statement_timestamp() + interval '27 hours',
  100,
  50,
  1,
  30,
  md5('task11-storage-billing-' || (((receipt_number - 1) % 20) + 1)::text)::uuid,
  100
from generate_series(1, 129600) as receipt(receipt_number)
left join task11_storage_provider_source_plan provider_source
  on provider_source.source_number = receipt_number;

insert into public.comment_translator_paid_provider_detail_source_receipts (
  attempt_id,
  provider_attempt,
  expires_at
)
select
  provider_source.attempt_id,
  provider_source.provider_attempt,
  statement_timestamp() + interval '27 hours'
from task11_storage_provider_source_plan provider_source;

insert into public.comment_translator_paid_provider_hourly_details (
  owner_user_id,
  provider,
  utc_hour,
  request_count,
  session_count,
  comment_count,
  input_characters,
  output_characters,
  input_tokens,
  output_tokens,
  estimated_cost_micros,
  success_count,
  failure_count,
  latency_101_to_250_ms_count
)
select
  provider_source.owner_user_id,
  provider_source.provider,
  provider_source.utc_hour,
  60,
  1,
  60,
  6000,
  5400,
  1800,
  1500,
  3000,
  59,
  1,
  60
from task11_storage_provider_source_plan provider_source;

insert into public.comment_translator_paid_session_summaries (
  owner_user_id,
  session_reference_id,
  started_at,
  ended_at,
  stop_reason,
  provider_request_count,
  translated_message_count,
  input_characters,
  output_characters
)
select
  md5('task11-storage-owner-' || (((summary_number - 1) % 20) + 1)::text)::uuid,
  'storage-session-' || summary_number::text,
  statement_timestamp() - (summary_number::text || ' minutes')::interval,
  statement_timestamp() - (summary_number::text || ' minutes')::interval + interval '3 hours',
  'session-time-limit',
  180,
  180,
  18000,
  16200
from generate_series(1, 14400) as summary(summary_number);

analyze public.comment_translator_paid_attempt_receipts;
analyze public.comment_translator_paid_logical_attempts;
analyze public.comment_translator_paid_provider_detail_source_receipts;
analyze public.comment_translator_paid_billing_period_usage;
analyze public.comment_translator_paid_provider_hourly_details;
analyze public.comment_translator_paid_session_summaries;

do $$
begin
  if (select count(*) from public.comment_translator_paid_billing_period_usage) <> 20
    or (select count(*) from public.comment_translator_paid_logical_attempts) <> 129600
    or (select count(*) from public.comment_translator_paid_attempt_receipts) <> 129600
    or exists (
      select logical_attempt.attempt_id
        from public.comment_translator_paid_logical_attempts logical_attempt
        left join public.comment_translator_paid_attempt_receipts attempt_receipt
          on attempt_receipt.attempt_id = logical_attempt.attempt_id
       group by logical_attempt.attempt_id
      having count(attempt_receipt.id) <> 1
    )
    or exists (
      select 1
        from public.comment_translator_paid_attempt_receipts attempt_receipt
        left join public.comment_translator_paid_logical_attempts logical_attempt
          on logical_attempt.attempt_id = attempt_receipt.attempt_id
       where logical_attempt.attempt_id is null
    )
    or (select count(*) from task11_storage_provider_source_plan)
      <> (select count(*) from generate_series(1, 28800))
    or (select count(*) from public.comment_translator_paid_provider_detail_source_receipts) <> 28800
    or (
      select count(*)
        from public.comment_translator_paid_attempt_receipts attempt_receipt
        join task11_storage_provider_source_plan provider_source
          on provider_source.attempt_id = attempt_receipt.attempt_id
         and provider_source.provider_attempt = attempt_receipt.provider_attempt
         and provider_source.owner_user_id = attempt_receipt.owner_user_id
         and provider_source.provider_kind = attempt_receipt.provider_kind
        join public.comment_translator_paid_provider_hourly_details provider_hourly_details
          on provider_hourly_details.owner_user_id = provider_source.owner_user_id
         and provider_hourly_details.provider = provider_source.provider
         and provider_hourly_details.utc_hour = provider_source.utc_hour
        join public.comment_translator_paid_provider_detail_source_receipts provider_detail_source_receipts
          on provider_detail_source_receipts.attempt_id = provider_source.attempt_id
         and provider_detail_source_receipts.provider_attempt = provider_source.provider_attempt
    ) <> 28800
    or (select count(*) from public.comment_translator_paid_provider_hourly_details) <> 28800
    or (select count(*) from public.comment_translator_paid_session_summaries) <> 14400
  then
    raise exception 'Task 11 storage fixture row cardinality is not exact';
  end if;
end;
$$;

create temporary table task11_storage_measurement on commit drop as
select
  sum(pg_total_relation_size(class.oid))::bigint as paid_total_bytes,
  sum(pg_indexes_size(class.oid))::bigint as paid_index_bytes,
  pg_database_size(current_database())::bigint as local_database_bytes
from pg_class class
join pg_namespace namespace on namespace.oid = class.relnamespace
where namespace.nspname = 'public'
  and class.relkind in ('r', 'p')
  and class.relname like 'comment_translator_paid_%';

do $$
declare
  paid_total_bytes bigint;
  local_database_bytes bigint;
begin
  select measurement.paid_total_bytes, measurement.local_database_bytes
    into paid_total_bytes, local_database_bytes
    from task11_storage_measurement measurement;
  if paid_total_bytes >= 300 * 1024 * 1024 then
    raise exception 'Task 11 local Paid relation total reached the 300MB ceiling';
  end if;
  if local_database_bytes >= 300 * 1024 * 1024 then
    raise exception 'Task 11 local database total reached the 300MB ceiling';
  end if;
end;
$$;

select
  (select count(*) from public.comment_translator_paid_billing_period_usage) as billing_period_usage_rows,
  (select count(*) from public.comment_translator_paid_logical_attempts) as logical_attempt_rows,
  (select count(*) from public.comment_translator_paid_attempt_receipts) as attempt_receipt_rows,
  (select count(*) from public.comment_translator_paid_provider_detail_source_receipts) as provider_detail_source_receipt_rows,
  (select count(*) from public.comment_translator_paid_provider_hourly_details) as provider_hourly_rows,
  (select count(*) from public.comment_translator_paid_session_summaries) as session_summary_rows,
  measurement.paid_total_bytes,
  measurement.paid_index_bytes,
  measurement.paid_total_bytes - measurement.paid_index_bytes as paid_table_and_toast_bytes,
  measurement.local_database_bytes
from task11_storage_measurement measurement;

rollback;
