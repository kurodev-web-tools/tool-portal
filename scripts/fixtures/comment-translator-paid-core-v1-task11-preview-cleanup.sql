begin;

set local statement_timeout = '10min';
set local lock_timeout = '5s';
set local synchronous_commit = off;

create temporary table task11_preview_context on commit drop as
select
  supplied.run_id,
  'ct11p:' || md5(supplied.run_id) as namespace,
  'task11preview' || substr(md5(supplied.run_id), 1, 16) as attempt_prefix,
  statement_timestamp() as observed_at
from (select __TASK11_PREVIEW_RUN_ID__::text as run_id) as supplied;

alter table task11_preview_context
  add column attempt_id_prefix text;

update task11_preview_context
   set attempt_id_prefix = 'ctpa_' || attempt_prefix || '_';

create temporary table task11_preview_owners on commit drop as
select
  owner.owner_number,
  md5(context.run_id || ':owner:' || owner.owner_number::text)::uuid as owner_user_id,
  context.namespace || ':session:' || owner.owner_number::text as runtime_session_reference_id,
  context.namespace || ':storage-session:' || owner.owner_number::text as storage_session_reference_id,
  md5(context.run_id || ':billing-period:' || owner.owner_number::text)::uuid as billing_period_id
from task11_preview_context as context
cross join generate_series(1, 20) as owner(owner_number);

delete from public.comment_translator_paid_session_summaries as summary
 using task11_preview_owners as run_owner
 where summary.owner_user_id = run_owner.owner_user_id
   and (
     left(summary.session_reference_id, length(run_owner.runtime_session_reference_id)) = run_owner.runtime_session_reference_id
     or left(summary.session_reference_id, length(run_owner.storage_session_reference_id)) = run_owner.storage_session_reference_id
   );

delete from public.comment_translator_paid_provider_hourly_details as provider_detail
 using task11_preview_owners as run_owner
 where provider_detail.owner_user_id = run_owner.owner_user_id;

delete from public.comment_translator_paid_provider_detail_source_receipts as source_receipt
 using task11_preview_context as context
 where left(source_receipt.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix;

delete from public.comment_translator_paid_attempt_receipts as attempt_receipt
 using task11_preview_owners as run_owner,
       task11_preview_context as context
 where attempt_receipt.owner_user_id = run_owner.owner_user_id
   and left(attempt_receipt.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix;

delete from public.comment_translator_paid_logical_attempts as logical_attempt
 using task11_preview_owners as run_owner,
       task11_preview_context as context
 where logical_attempt.owner_user_id = run_owner.owner_user_id
   and left(logical_attempt.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix;

delete from public.comment_translator_paid_message_rate_reservation_tombstones as tombstone
 using task11_preview_context as context
 where left(tombstone.reservation_key, length(context.namespace || ':rate:')) = context.namespace || ':rate:';

delete from public.comment_translator_paid_message_rate_reservations as reservation
 using task11_preview_owners as run_owner,
       task11_preview_context as context
 where reservation.owner_user_id = run_owner.owner_user_id
   and left(reservation.reservation_key, length(context.namespace || ':rate:')) = context.namespace || ':rate:';

delete from public.comment_translator_paid_message_rate_buckets as bucket
 using task11_preview_owners as run_owner
 where bucket.owner_user_id = run_owner.owner_user_id;

delete from public.comment_translator_paid_poll_reservations as reservation
 using task11_preview_owners as run_owner
 where reservation.owner_user_id = run_owner.owner_user_id
   and (
     left(reservation.session_reference_id, length(run_owner.runtime_session_reference_id)) = run_owner.runtime_session_reference_id
     or left(reservation.session_reference_id, length(run_owner.storage_session_reference_id)) = run_owner.storage_session_reference_id
   );

delete from public.comment_translator_paid_session_leases as lease
 using task11_preview_owners as run_owner
 where lease.owner_user_id = run_owner.owner_user_id
   and (
     left(lease.session_reference_id, length(run_owner.runtime_session_reference_id)) = run_owner.runtime_session_reference_id
     or left(lease.session_reference_id, length(run_owner.storage_session_reference_id)) = run_owner.storage_session_reference_id
   );

delete from public.comment_translator_sessions as session
 using task11_preview_owners as run_owner
 where session.owner_user_id = run_owner.owner_user_id
   and (
     left(session.session_reference_id, length(run_owner.runtime_session_reference_id)) = run_owner.runtime_session_reference_id
     or left(session.session_reference_id, length(run_owner.storage_session_reference_id)) = run_owner.storage_session_reference_id
   );

delete from public.comment_translator_paid_openai_slots as slot
 using task11_preview_context as context
 where left(slot.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix;

delete from public.comment_translator_paid_openai_rate_reservations as reservation
 using task11_preview_context as context
 where left(reservation.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix;

delete from public.comment_translator_paid_billing_period_usage as period_usage
 using task11_preview_owners as run_owner
 where period_usage.id = run_owner.billing_period_id
   and period_usage.owner_user_id = run_owner.owner_user_id;

delete from auth.users as synthetic_user
 using task11_preview_owners as run_owner
 where synthetic_user.id = run_owner.owner_user_id;

create temporary table task11_preview_cleanup_remaining on commit drop as
select count(*)::bigint as row_count
  from auth.users as synthetic_user
  join task11_preview_owners as run_owner on run_owner.owner_user_id = synthetic_user.id
union all
select count(*)::bigint
  from public.comment_translator_paid_logical_attempts as logical_attempt
  join task11_preview_context as context
    on left(logical_attempt.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix
union all
select count(*)::bigint
  from public.comment_translator_paid_attempt_receipts as attempt_receipt
  join task11_preview_context as context
    on left(attempt_receipt.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix
union all
select count(*)::bigint
  from public.comment_translator_paid_provider_detail_source_receipts as source_receipt
  join task11_preview_context as context
    on left(source_receipt.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix
union all
select count(*)::bigint
  from public.comment_translator_paid_message_rate_reservation_tombstones as tombstone
  join task11_preview_context as context
    on left(tombstone.reservation_key, length(context.namespace || ':rate:')) = context.namespace || ':rate:'
union all
select count(*)::bigint
  from public.comment_translator_paid_message_rate_reservations as reservation
  join task11_preview_owners as run_owner on run_owner.owner_user_id = reservation.owner_user_id
  join task11_preview_context as context
    on left(reservation.reservation_key, length(context.namespace || ':rate:')) = context.namespace || ':rate:'
union all
select count(*)::bigint
  from public.comment_translator_paid_message_rate_buckets as bucket
  join task11_preview_owners as run_owner on run_owner.owner_user_id = bucket.owner_user_id
union all
select count(*)::bigint
  from public.comment_translator_paid_poll_reservations as reservation
  join task11_preview_owners as run_owner on run_owner.owner_user_id = reservation.owner_user_id
  where left(reservation.session_reference_id, length(run_owner.runtime_session_reference_id)) = run_owner.runtime_session_reference_id
     or left(reservation.session_reference_id, length(run_owner.storage_session_reference_id)) = run_owner.storage_session_reference_id
union all
select count(*)::bigint
  from public.comment_translator_paid_session_leases as lease
  join task11_preview_owners as run_owner on run_owner.owner_user_id = lease.owner_user_id
  where left(lease.session_reference_id, length(run_owner.runtime_session_reference_id)) = run_owner.runtime_session_reference_id
     or left(lease.session_reference_id, length(run_owner.storage_session_reference_id)) = run_owner.storage_session_reference_id
union all
select count(*)::bigint
  from public.comment_translator_sessions as session
  join task11_preview_owners as run_owner on run_owner.owner_user_id = session.owner_user_id
  where left(session.session_reference_id, length(run_owner.runtime_session_reference_id)) = run_owner.runtime_session_reference_id
     or left(session.session_reference_id, length(run_owner.storage_session_reference_id)) = run_owner.storage_session_reference_id
union all
select count(*)::bigint
  from public.comment_translator_paid_session_summaries as summary
  join task11_preview_owners as run_owner on run_owner.owner_user_id = summary.owner_user_id
  where left(summary.session_reference_id, length(run_owner.runtime_session_reference_id)) = run_owner.runtime_session_reference_id
     or left(summary.session_reference_id, length(run_owner.storage_session_reference_id)) = run_owner.storage_session_reference_id
union all
select count(*)::bigint
  from public.comment_translator_paid_provider_hourly_details as provider_detail
  join task11_preview_owners as run_owner on run_owner.owner_user_id = provider_detail.owner_user_id
union all
select count(*)::bigint
  from public.comment_translator_paid_openai_slots as slot
  join task11_preview_context as context
    on left(slot.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix
union all
select count(*)::bigint
  from public.comment_translator_paid_openai_rate_reservations as reservation
  join task11_preview_context as context
    on left(reservation.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix
union all
select count(*)::bigint
  from public.comment_translator_paid_billing_period_usage as period_usage
  join task11_preview_owners as run_owner
    on run_owner.billing_period_id = period_usage.id
   and run_owner.owner_user_id = period_usage.owner_user_id;

do $$
declare
  remaining_rows bigint;
begin
  select coalesce(sum(row_count), 0) into remaining_rows
    from task11_preview_cleanup_remaining;
  if remaining_rows <> 0 then
    raise exception 'Task 11 Preview exact cleanup left synthetic rows';
  end if;
end;
$$;

select jsonb_build_object(
  'marker', 'TASK11_PREVIEW_RESULT',
  'fixture', 'cleanup',
  'cleanup_rows_remaining', (select coalesce(sum(row_count), 0) from task11_preview_cleanup_remaining),
  'measurement_scope', 'exact-run-namespace-only',
  'external_egress', 'UNKNOWN',
  'external_realtime', 'UNKNOWN'
) as task11_preview_result;

commit;
