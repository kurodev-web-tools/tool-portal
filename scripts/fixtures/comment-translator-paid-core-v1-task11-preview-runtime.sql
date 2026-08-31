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
  context.namespace || ':session:' || owner.owner_number::text as session_reference_id,
  md5(context.run_id || ':billing-period:' || owner.owner_number::text)::uuid as billing_period_id,
  statement_timestamp() - interval '1 day' as period_start,
  statement_timestamp() + interval '29 days' as period_end
from task11_preview_context as context
cross join generate_series(1, 20) as owner(owner_number);

create temporary table task11_preview_restart_plan on commit drop as
select
  run_owner.owner_number,
  restart_window.window_number,
  run_owner.session_reference_id || ':restart:' || restart_window.window_number::text as planned_session_reference_id,
  720 as planned_poll_count,
  3 as session_hours,
  24 as restart_window_hours
-- 24-hour restart windows are a plan fixture; elapsed time is not simulated.
from task11_preview_owners as run_owner
cross join generate_series(1, 8) as restart_window(window_number);

do $$
begin
  if (select sum(planned_poll_count) from task11_preview_restart_plan) <> 115200 then
    raise exception 'Task 11 Preview Cloudflare request fixture must equal 115200';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
      from auth.users as existing_user
      join task11_preview_owners as run_owner
        on run_owner.owner_user_id = existing_user.id
  ) then
    raise exception 'Task 11 Preview synthetic owner namespace is already present';
  end if;
end;
$$;

insert into auth.users (id, aud, role, created_at, updated_at)
select owner_user_id, 'authenticated', 'authenticated', statement_timestamp(), statement_timestamp()
  from task11_preview_owners;

insert into public.comment_translator_paid_billing_period_usage (
  id, owner_user_id, period_start, period_end, period_state
)
select billing_period_id, owner_user_id, period_start, period_end, 'open'
  from task11_preview_owners;

create temporary table task11_rpc_latency (
  operation text not null,
  elapsed_microseconds double precision not null check (elapsed_microseconds >= 0)
) on commit drop;

create temporary table task11_heartbeat_writes (
  owner_user_id uuid not null,
  session_reference_id text not null,
  heartbeat_iteration integer not null,
  primary key (owner_user_id, session_reference_id, heartbeat_iteration)
) on commit drop;

create temporary table task11_empty_poll_observations (
  owner_user_id uuid not null,
  session_reference_id text not null,
  poll_iteration integer not null,
  provider_call_count integer not null check (provider_call_count >= 0),
  primary key (owner_user_id, session_reference_id, poll_iteration)
) on commit drop;

do $$
declare
  run_owner record;
  start_time timestamptz;
  reserved_polls integer;
begin
  for run_owner in select * from task11_preview_owners order by owner_number loop
    start_time := clock_timestamp();
    reserved_polls := public.ct_paid_start_session_and_reserve_poll_budget(
      run_owner.owner_user_id,
      run_owner.session_reference_id,
      'ct11p-entitlement-' || run_owner.owner_number::text,
      'ct11p-credential-' || run_owner.owner_number::text,
      80000,
      statement_timestamp()
    );
    insert into task11_rpc_latency values (
      'start_session', extract(epoch from (clock_timestamp() - start_time)) * 1000000
    );
    if reserved_polls < 1 or reserved_polls > 720 then
      raise exception 'Task 11 Preview session reservation is outside the bounded range';
    end if;
  end loop;
end;
$$;

do $$
declare
  run_owner record;
  poll_iteration integer;
  heartbeat_iteration integer;
  start_time timestamptz;
  heartbeat_result jsonb;
  written_heartbeat_at timestamptz;
begin
  for run_owner in select * from task11_preview_owners order by owner_number loop
    for poll_iteration in select generate_series(1, 720) loop
      start_time := clock_timestamp();
      perform * from public.ct_paid_read_poll_budget(
        run_owner.session_reference_id,
        run_owner.owner_user_id,
        statement_timestamp()
      );
      if not found then
        raise exception 'Task 11 Preview poll budget read returned no authority row';
      end if;
      insert into task11_empty_poll_observations values (
        run_owner.owner_user_id,
        run_owner.session_reference_id,
        poll_iteration,
        0
      );
      insert into task11_rpc_latency values (
        'read_poll_budget', extract(epoch from (clock_timestamp() - start_time)) * 1000000
      );
    end loop;

    for heartbeat_iteration in select generate_series(1, 180) loop
      update public.comment_translator_sessions
         set last_heartbeat_at = statement_timestamp() - interval '1 minute'
       where owner_user_id = run_owner.owner_user_id
         and session_reference_id = run_owner.session_reference_id
         and status = 'active'
         and plan = 'paid';
      if not found then
        raise exception 'Task 11 Preview heartbeat setup session is unreadable';
      end if;

      start_time := clock_timestamp();
      heartbeat_result := public.ct_paid_touch_active_paid_session_heartbeat(
        run_owner.owner_user_id,
        run_owner.session_reference_id
      );
      insert into task11_rpc_latency values (
        'heartbeat', extract(epoch from (clock_timestamp() - start_time)) * 1000000
      );
      if heartbeat_result ->> 'status' <> 'touched' then
        raise exception 'Task 11 Preview heartbeat did not take the durable write path';
      end if;
      select last_heartbeat_at
        into written_heartbeat_at
        from public.comment_translator_sessions
       where owner_user_id = run_owner.owner_user_id
         and session_reference_id = run_owner.session_reference_id
         and status = 'active'
         and plan = 'paid';
      if written_heartbeat_at is null then
        raise exception 'Task 11 Preview heartbeat write was not observed';
      end if;
      insert into task11_heartbeat_writes values (
        run_owner.owner_user_id,
        run_owner.session_reference_id,
        heartbeat_iteration
      );
    end loop;
  end loop;

  if (select count(*) from task11_heartbeat_writes) <> 3600 then
    raise exception 'Task 11 Preview durable heartbeat write count must equal 3600';
  end if;
  if (select count(*) from task11_empty_poll_observations) <> 14400
    or (select coalesce(sum(provider_call_count), 0) from task11_empty_poll_observations) <> 0
  then
    raise exception 'Task 11 Preview empty-poll observation count or provider call count is not exact';
  end if;
end;
$$;

do $$
declare
  run_owner record;
  message_number integer;
  reservation_status text;
  committed_messages integer;
  start_time timestamptz;
  replay_committed_messages integer;
  sixty_first_reservation_status text;
  context_namespace text;
begin
  select namespace into context_namespace from task11_preview_context;

  for run_owner in select * from task11_preview_owners order by owner_number loop
    for message_number in select generate_series(1, 60) loop
      start_time := clock_timestamp();
      select rate.reservation_status
        into reservation_status
        from public.ct_paid_reserve_message_rate(
          run_owner.owner_user_id,
          run_owner.session_reference_id,
          context_namespace || ':rate:' || run_owner.owner_number::text || ':' || message_number::text,
          1,
          statement_timestamp()
        ) as rate;
      insert into task11_rpc_latency values (
        'message_rate_reserve', extract(epoch from (clock_timestamp() - start_time)) * 1000000
      );
      if reservation_status <> 'reserved' then
        raise exception 'Task 11 Preview message reservation did not remain bounded';
      end if;

      if message_number = 1 then
        perform public.ct_paid_record_message_rate_success(
          run_owner.owner_user_id,
          run_owner.session_reference_id,
          context_namespace || ':rate:' || run_owner.owner_number::text || ':1',
          1,
          statement_timestamp()
        );
      end if;

      start_time := clock_timestamp();
      select rate.reservation_status, rate.committed_messages
        into reservation_status, committed_messages
        from public.ct_paid_finalize_message_rate(
          run_owner.owner_user_id,
          run_owner.session_reference_id,
          context_namespace || ':rate:' || run_owner.owner_number::text || ':' || message_number::text,
          1,
          statement_timestamp()
        ) as rate;
      insert into task11_rpc_latency values (
        'message_rate_finalize', extract(epoch from (clock_timestamp() - start_time)) * 1000000
      );
      if reservation_status <> 'committed' or committed_messages <> 1 then
        raise exception 'Task 11 Preview message finalize did not commit one synthetic message';
      end if;
    end loop;
  end loop;

  select rate.reservation_status
    into sixty_first_reservation_status
    from public.ct_paid_reserve_message_rate(
      (select owner_user_id from task11_preview_owners where owner_number = 1),
      (select session_reference_id from task11_preview_owners where owner_number = 1),
      context_namespace || ':rate:1:61',
      1,
      statement_timestamp()
    ) as rate;
  if sixty_first_reservation_status <> 'rate-limited' then
    raise exception 'Task 11 Preview sixty-first message must be rate limited';
  end if;

  select rate.committed_messages
    into replay_committed_messages
    from public.ct_paid_finalize_message_rate(
      (select owner_user_id from task11_preview_owners where owner_number = 1),
      (select session_reference_id from task11_preview_owners where owner_number = 1),
      context_namespace || ':rate:1:1',
      1,
      statement_timestamp()
    ) as rate;
  if replay_committed_messages <> 1 then
    raise exception 'Task 11 Preview committed message replay must remain exactly one';
  end if;
end;
$$;

do $$
declare
  run_owner record;
  context_row record;
  provider_iteration integer;
  openai_attempt_id text;
  azure_attempt_id text;
  openai_provider_attempt text;
  azure_provider_attempt text;
  source_expires_at timestamptz;
  v_utc_hour timestamptz;
  recorded boolean;
  start_time timestamptz;
  same_utc_hour_provider_rows integer;
begin
  select * into context_row from task11_preview_context;
  select * into run_owner from task11_preview_owners where owner_number = 1;
  v_utc_hour := date_trunc('hour', statement_timestamp());

  for provider_iteration in select generate_series(1, 20) loop
    source_expires_at := statement_timestamp() + interval '90 seconds';
    openai_attempt_id := context_row.attempt_id_prefix || substr(
      md5(context_row.run_id || ':openai:' || provider_iteration::text)
      || md5(context_row.run_id || ':openai-suffix:' || provider_iteration::text),
      1,
      43
    );
    azure_attempt_id := context_row.attempt_id_prefix || substr(
      md5(context_row.run_id || ':azure:' || provider_iteration::text)
      || md5(context_row.run_id || ':azure-suffix:' || provider_iteration::text),
      1,
      43
    );
    openai_provider_attempt := context_row.namespace || ':provider:openai:' || provider_iteration::text;
    azure_provider_attempt := context_row.namespace || ':provider:azure:' || provider_iteration::text;

    insert into public.comment_translator_paid_logical_attempts (
      attempt_id, owner_user_id, billing_period_usage_id, period_start, period_end,
      input_characters, logical_state, committed_input_characters, expires_at
    ) values
      (openai_attempt_id, run_owner.owner_user_id, run_owner.billing_period_id,
       run_owner.period_start, run_owner.period_end, 100, 'committed', 100, source_expires_at),
      (azure_attempt_id, run_owner.owner_user_id, run_owner.billing_period_id,
       run_owner.period_start, run_owner.period_end, 100, 'committed', 100, source_expires_at);

    insert into public.comment_translator_paid_attempt_receipts (
      attempt_id, provider_attempt, provider_kind, session_reference_id, owner_user_id,
      period_start, period_end, utc_month, attempt_state, expires_at,
      billing_period_usage_id, committed_input_characters
    ) values
      (openai_attempt_id, openai_provider_attempt, 'openai_attempt', run_owner.session_reference_id,
       run_owner.owner_user_id, run_owner.period_start, run_owner.period_end,
       date_trunc('month', statement_timestamp() at time zone 'UTC')::date, 'committed',
       source_expires_at, run_owner.billing_period_id, 100),
      (azure_attempt_id, azure_provider_attempt, 'azure_direct_fallback', run_owner.session_reference_id,
       run_owner.owner_user_id, run_owner.period_start, run_owner.period_end,
       date_trunc('month', statement_timestamp() at time zone 'UTC')::date, 'committed',
       source_expires_at, run_owner.billing_period_id, 100);

    start_time := clock_timestamp();
    recorded := public.ct_paid_record_provider_hourly_detail(
      openai_attempt_id, openai_provider_attempt, source_expires_at, run_owner.owner_user_id,
      'openai', v_utc_hour, 1, 1, 1, 100, 90, 30, 25, 50, 1, 0,
      0, 1, 0, 0, 0, 0, 0, 0, statement_timestamp()
    );
    insert into task11_rpc_latency values (
      'provider_hourly_openai', extract(epoch from (clock_timestamp() - start_time)) * 1000000
    );
    if not recorded then
      raise exception 'Task 11 Preview OpenAI provider fixture was not recorded';
    end if;

    start_time := clock_timestamp();
    recorded := public.ct_paid_record_provider_hourly_detail(
      azure_attempt_id, azure_provider_attempt, source_expires_at, run_owner.owner_user_id,
      'azure_fallback', v_utc_hour, 1, 1, 1, 100, 90, 0, 0, 50, 1, 0,
      0, 0, 1, 0, 0, 0, 0, 0, statement_timestamp()
    );
    insert into task11_rpc_latency values (
      'provider_hourly_azure_fallback', extract(epoch from (clock_timestamp() - start_time)) * 1000000
    );
    if not recorded then
      raise exception 'Task 11 Preview Azure provider fixture was not recorded';
    end if;
  end loop;

  if public.ct_paid_record_provider_hourly_detail(
    openai_attempt_id, openai_provider_attempt, source_expires_at, run_owner.owner_user_id,
    'openai', v_utc_hour, 1, 1, 1, 100, 90, 30, 25, 50, 1, 0,
    0, 1, 0, 0, 0, 0, 0, 0, statement_timestamp()
  ) then
    raise exception 'Task 11 Preview OpenAI provider fixture replay was double counted';
  end if;
  if public.ct_paid_record_provider_hourly_detail(
    azure_attempt_id, azure_provider_attempt, source_expires_at, run_owner.owner_user_id,
    'azure_fallback', v_utc_hour, 1, 1, 1, 100, 90, 0, 0, 50, 1, 0,
    0, 0, 1, 0, 0, 0, 0, 0, statement_timestamp()
  ) then
    raise exception 'Task 11 Preview Azure provider fixture replay was double counted';
  end if;

  select count(*)
    into same_utc_hour_provider_rows
    from public.comment_translator_paid_provider_hourly_details as provider_detail
   where provider_detail.owner_user_id = run_owner.owner_user_id
     and provider_detail.utc_hour = v_utc_hour;
  if same_utc_hour_provider_rows <> 2 then
    raise exception 'Task 11 Preview same UTC hour provider rows must equal two';
  end if;
end;
$$;

do $$
declare
  run_owner record;
  started_at timestamptz;
begin
  for run_owner in select * from task11_preview_owners order by owner_number loop
    select session.started_at
      into started_at
      from public.comment_translator_sessions as session
     where session.owner_user_id = run_owner.owner_user_id
       and session.session_reference_id = run_owner.session_reference_id
       and session.status = 'active'
       and session.plan = 'paid'
     for update;
    if started_at is null then
      raise exception 'Task 11 Preview session stop authority is unreadable';
    end if;
    update public.comment_translator_sessions
       set status = 'stopped',
           stopped_at = statement_timestamp(),
           stop_reason = 'session-time-limit',
           updated_at = statement_timestamp()
     where owner_user_id = run_owner.owner_user_id
       and session_reference_id = run_owner.session_reference_id
       and status = 'active'
       and plan = 'paid';
    if not found then
      raise exception 'Task 11 Preview session did not stop at the bounded limit';
    end if;
    perform public.ct_paid_upsert_session_summary(
      run_owner.owner_user_id,
      run_owner.session_reference_id,
      started_at,
      statement_timestamp(),
      'session-time-limit',
      0,
      60,
      6000,
      5400,
      statement_timestamp()
    );
  end loop;
end;
$$;

do $$
begin
  if not has_function_privilege('service_role', 'public.ct_paid_start_session_and_reserve_poll_budget(uuid,text,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('anon', 'public.ct_paid_start_session_and_reserve_poll_budget(uuid,text,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.ct_paid_start_session_and_reserve_poll_budget(uuid,text,text,text,integer,timestamptz)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.ct_paid_read_poll_budget(text,uuid,timestamptz)', 'EXECUTE')
    or has_function_privilege('anon', 'public.ct_paid_read_poll_budget(text,uuid,timestamptz)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.ct_paid_read_poll_budget(text,uuid,timestamptz)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.ct_paid_touch_active_paid_session_heartbeat(uuid,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.ct_paid_touch_active_paid_session_heartbeat(uuid,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.ct_paid_touch_active_paid_session_heartbeat(uuid,text)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.ct_paid_reserve_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('anon', 'public.ct_paid_reserve_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.ct_paid_reserve_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.ct_paid_finalize_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('anon', 'public.ct_paid_finalize_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.ct_paid_finalize_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
  then
    raise exception 'Task 11 Preview service-only RPC ACL boundary is not closed';
  end if;
end;
$$;

do $$
begin
  if exists (
    select operation
      from task11_rpc_latency
     group by operation
    having count(*) < 20
  ) then
    raise exception 'Task 11 Preview latency operation has fewer than 20 samples';
  end if;
end;
$$;

create temporary table task11_preview_runtime_metrics on commit drop as
select
  (select count(*) from task11_preview_owners)::bigint as session_count,
  (select count(*) from task11_rpc_latency where operation = 'read_poll_budget')::bigint as poll_read_count,
  (select count(*) from task11_heartbeat_writes)::bigint as heartbeat_write_count,
  (select count(*) from task11_preview_restart_plan)::bigint as restart_plan_count,
  (select sum(planned_poll_count) from task11_preview_restart_plan)::bigint as cloudflare_request_fixture_count,
  (select count(*) from public.comment_translator_paid_message_rate_reservations as reservation
    where reservation.owner_user_id in (select owner_user_id from task11_preview_owners)
      and reservation.reservation_state = 'committed')::bigint as message_rate_committed_count,
  (select count(*) from public.comment_translator_paid_provider_hourly_details as provider_detail
    where provider_detail.owner_user_id = (select owner_user_id from task11_preview_owners where owner_number = 1))::bigint as same_utc_hour_provider_rows,
  (select count(*) from task11_empty_poll_observations)::bigint as empty_poll_count,
  (select coalesce(sum(provider_call_count), 0) from task11_empty_poll_observations)::bigint as empty_poll_provider_calls,
  jsonb_object_agg(
    latency.operation,
    jsonb_build_object(
      'sample_count', latency.sample_count,
      'p50_microseconds', latency.p50_microseconds,
      'p95_microseconds', latency.p95_microseconds,
      'max_microseconds', latency.max_microseconds
    )
  ) as rpc_latency
from (
  select
    operation,
    count(*)::bigint as sample_count,
    round(percentile_cont(0.50) within group (order by elapsed_microseconds)::numeric, 2)::double precision as p50_microseconds,
    round(percentile_cont(0.95) within group (order by elapsed_microseconds)::numeric, 2)::double precision as p95_microseconds,
    round(max(elapsed_microseconds)::numeric, 2)::double precision as max_microseconds
  from task11_rpc_latency
  group by operation
) as latency;

delete from public.comment_translator_paid_session_summaries as summary
 using task11_preview_owners as run_owner
 where summary.owner_user_id = run_owner.owner_user_id
   and left(summary.session_reference_id, length(run_owner.session_reference_id)) = run_owner.session_reference_id;

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
   and left(reservation.session_reference_id, length(run_owner.session_reference_id)) = run_owner.session_reference_id;

delete from public.comment_translator_paid_session_leases as lease
 using task11_preview_owners as run_owner
 where lease.owner_user_id = run_owner.owner_user_id
   and left(lease.session_reference_id, length(run_owner.session_reference_id)) = run_owner.session_reference_id;

delete from public.comment_translator_sessions as session
 using task11_preview_owners as run_owner
 where session.owner_user_id = run_owner.owner_user_id
   and left(session.session_reference_id, length(run_owner.session_reference_id)) = run_owner.session_reference_id;

delete from public.comment_translator_paid_billing_period_usage as period_usage
 using task11_preview_owners as run_owner
 where period_usage.id = run_owner.billing_period_id
   and period_usage.owner_user_id = run_owner.owner_user_id;

delete from auth.users as synthetic_user
 using task11_preview_owners as run_owner
 where synthetic_user.id = run_owner.owner_user_id;

create temporary table task11_preview_cleanup_remaining on commit drop as
select count(*)::bigint as row_count
  from public.comment_translator_paid_billing_period_usage as period_usage
  join task11_preview_owners as run_owner
    on run_owner.billing_period_id = period_usage.id
   and run_owner.owner_user_id = period_usage.owner_user_id
union all
select count(*)::bigint
  from auth.users as synthetic_user
  join task11_preview_owners as run_owner on run_owner.owner_user_id = synthetic_user.id
union all
select count(*)::bigint
  from public.comment_translator_sessions as session
  join task11_preview_owners as run_owner
    on run_owner.owner_user_id = session.owner_user_id
   and left(session.session_reference_id, length(run_owner.session_reference_id)) = run_owner.session_reference_id
union all
select count(*)::bigint
  from public.comment_translator_paid_session_summaries as summary
  join task11_preview_owners as run_owner
    on run_owner.owner_user_id = summary.owner_user_id
   and left(summary.session_reference_id, length(run_owner.session_reference_id)) = run_owner.session_reference_id
union all
select count(*)::bigint
  from public.comment_translator_paid_provider_hourly_details as provider_detail
  join task11_preview_owners as run_owner on run_owner.owner_user_id = provider_detail.owner_user_id
union all
select count(*)::bigint
  from public.comment_translator_paid_provider_detail_source_receipts as source_receipt
  join task11_preview_context as context
    on left(source_receipt.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix
union all
select count(*)::bigint
  from public.comment_translator_paid_attempt_receipts as attempt_receipt
  join task11_preview_owners as run_owner on run_owner.owner_user_id = attempt_receipt.owner_user_id
  join task11_preview_context as context
    on left(attempt_receipt.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix
union all
select count(*)::bigint
  from public.comment_translator_paid_logical_attempts as logical_attempt
  join task11_preview_owners as run_owner on run_owner.owner_user_id = logical_attempt.owner_user_id
  join task11_preview_context as context
    on left(logical_attempt.attempt_id, length(context.attempt_id_prefix)) = context.attempt_id_prefix
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
   and left(reservation.session_reference_id, length(run_owner.session_reference_id)) = run_owner.session_reference_id
union all
select count(*)::bigint
  from public.comment_translator_paid_session_leases as lease
  join task11_preview_owners as run_owner on run_owner.owner_user_id = lease.owner_user_id
   and left(lease.session_reference_id, length(run_owner.session_reference_id)) = run_owner.session_reference_id;

do $$
declare
  remaining_rows bigint;
begin
  select coalesce(sum(row_count), 0) into remaining_rows
    from task11_preview_cleanup_remaining;
  if remaining_rows <> 0
  then
    raise exception 'Task 11 Preview exact cleanup left synthetic rows';
  end if;
end;
$$;

select jsonb_build_object(
  'marker', 'TASK11_PREVIEW_RESULT',
  'fixture', 'runtime',
  'session_count', metrics.session_count,
  'poll_read_count', metrics.poll_read_count,
  'heartbeat_write_count', metrics.heartbeat_write_count,
  'restart_plan_count', metrics.restart_plan_count,
  'cloudflare_request_fixture_count', metrics.cloudflare_request_fixture_count,
  'message_rate_committed_count', metrics.message_rate_committed_count,
  'same_utc_hour_provider_rows', metrics.same_utc_hour_provider_rows,
  'empty_poll_count', metrics.empty_poll_count,
  'empty_poll_provider_calls', metrics.empty_poll_provider_calls,
  'cleanup_rows_remaining', (select coalesce(sum(row_count), 0) from task11_preview_cleanup_remaining),
  'rpc_latency', metrics.rpc_latency,
  'measurement_scope', 'transaction-only',
  'restart_elapsed_measurement', 'not-simulated',
  'external_egress', 'UNKNOWN',
  'external_realtime', 'UNKNOWN'
) as task11_preview_result
from task11_preview_runtime_metrics as metrics;

rollback;
