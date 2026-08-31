begin;

set local statement_timeout = '10min';
set local lock_timeout = '5s';

create temporary table task11_rpc_latency (
  operation text not null,
  elapsed_microseconds double precision not null check (elapsed_microseconds >= 0)
) on commit drop;

create temporary table task11_heartbeat_writes (
  session_reference_id text not null,
  heartbeat_iteration integer not null,
  primary key (session_reference_id, heartbeat_iteration)
) on commit drop;

insert into auth.users (id, aud, role, created_at, updated_at)
select
  md5('task11-owner-' || owner_number::text)::uuid,
  'authenticated',
  'authenticated',
  statement_timestamp(),
  statement_timestamp()
from generate_series(1, 20) as owner(owner_number);

do $$
declare
  owner_number integer;
  owner_id uuid;
  session_reference text;
  start_time timestamptz;
  reserved_polls integer;
begin
  for owner_number in select generate_series(1, 20) loop
    owner_id := md5('task11-owner-' || owner_number::text)::uuid;
    session_reference := 'task11-session-' || owner_number::text;
    start_time := clock_timestamp();
    reserved_polls := public.ct_paid_start_session_and_reserve_poll_budget(
      owner_id,
      session_reference,
      'task11-local-entitlement',
      'task11-local-credential',
      80000,
      statement_timestamp()
    );
    insert into task11_rpc_latency values (
      'start_session',
      extract(epoch from (clock_timestamp() - start_time)) * 1000000
    );
    if reserved_polls < 1 or reserved_polls > 720 then
      raise exception 'Task 11 session poll reservation is outside the bounded range';
    end if;
  end loop;
end;
$$;

do $$
declare
  owner_number integer;
  poll_iteration integer;
  heartbeat_iteration integer;
  owner_id uuid;
  session_reference text;
  start_time timestamptz;
  written_heartbeat_at timestamptz;
begin
  for owner_number in select generate_series(1, 20) loop
    owner_id := md5('task11-owner-' || owner_number::text)::uuid;
    session_reference := 'task11-session-' || owner_number::text;

    for poll_iteration in select generate_series(1, 720) loop
      start_time := clock_timestamp();
      perform * from public.ct_paid_read_poll_budget(session_reference, owner_id, statement_timestamp());
      insert into task11_rpc_latency values (
        'read_poll_budget',
        extract(epoch from (clock_timestamp() - start_time)) * 1000000
      );
    end loop;

    for heartbeat_iteration in select generate_series(1, 180) loop
      update public.comment_translator_sessions
         set last_heartbeat_at = statement_timestamp() - interval '1 minute'
       where owner_user_id = owner_id
         and session_reference_id = session_reference
         and status = 'active'
         and plan = 'paid';
      if not found then
        raise exception 'Task 11 heartbeat setup session is unreadable';
      end if;
      start_time := clock_timestamp();
      perform public.ct_paid_touch_active_paid_session_heartbeat(owner_id, session_reference);
      insert into task11_rpc_latency values (
        'heartbeat',
        extract(epoch from (clock_timestamp() - start_time)) * 1000000
      );
      select last_heartbeat_at
        into written_heartbeat_at
        from public.comment_translator_sessions
       where owner_user_id = owner_id
         and session_reference_id = session_reference
         and status = 'active'
         and plan = 'paid';
      if written_heartbeat_at is distinct from statement_timestamp() then
        raise exception 'Task 11 heartbeat did not take the durable write path';
      end if;
      insert into task11_heartbeat_writes values (session_reference, heartbeat_iteration);
    end loop;
  end loop;

  if (select count(*) from task11_heartbeat_writes) <> 3600 then
    raise exception 'Task 11 durable heartbeat write count must equal 3600';
  end if;
end;
$$;

insert into public.comment_translator_paid_billing_period_usage (
  id, owner_user_id, period_start, period_end, period_state
) values (
  md5('task11-billing-period')::uuid,
  md5('task11-owner-1')::uuid,
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '29 days',
  'open'
);

do $$
declare
  owner_id constant uuid := md5('task11-owner-1')::uuid;
  billing_period_id constant uuid := md5('task11-billing-period')::uuid;
  v_utc_hour constant timestamptz := date_trunc('hour', statement_timestamp());
  source_expires_at constant timestamptz := statement_timestamp() + interval '90 seconds';
  provider_iteration integer;
  cleanup_iteration integer;
  openai_attempt_id text;
  azure_attempt_id text;
  cleanup_attempt_id text;
  start_time timestamptz;
  recorded boolean;
  same_utc_hour_provider_rows integer;
begin
  for provider_iteration in select generate_series(1, 20) loop
    openai_attempt_id := 'ctpa_task11_openai_' || repeat('a', 41) || lpad(provider_iteration::text, 2, '0');
    azure_attempt_id := 'ctpa_task11_azure_' || repeat('b', 41) || lpad(provider_iteration::text, 2, '0');

    insert into public.comment_translator_paid_logical_attempts (
      attempt_id, owner_user_id, billing_period_usage_id, period_start, period_end,
      input_characters, logical_state, committed_input_characters, expires_at
    ) values
      (openai_attempt_id, owner_id, billing_period_id, statement_timestamp() - interval '1 day', statement_timestamp() + interval '29 days', 100, 'committed', 100, source_expires_at),
      (azure_attempt_id, owner_id, billing_period_id, statement_timestamp() - interval '1 day', statement_timestamp() + interval '29 days', 100, 'committed', 100, source_expires_at);

    insert into public.comment_translator_paid_attempt_receipts (
      attempt_id, provider_attempt, provider_kind, session_reference_id, owner_user_id,
      period_start, period_end, utc_month, attempt_state, expires_at,
      billing_period_usage_id, committed_input_characters
    ) values
      (openai_attempt_id, 'task11-openai-' || provider_iteration::text, 'openai_attempt', 'task11-session-1', owner_id,
        statement_timestamp() - interval '1 day', statement_timestamp() + interval '29 days', date_trunc('month', statement_timestamp() at time zone 'UTC')::date,
        'committed', source_expires_at, billing_period_id, 100),
      (azure_attempt_id, 'task11-azure-' || provider_iteration::text, 'azure_direct_fallback', 'task11-session-1', owner_id,
        statement_timestamp() - interval '1 day', statement_timestamp() + interval '29 days', date_trunc('month', statement_timestamp() at time zone 'UTC')::date,
        'committed', source_expires_at, billing_period_id, 100);

    start_time := clock_timestamp();
    recorded := public.ct_paid_record_provider_hourly_detail(
      openai_attempt_id, 'task11-openai-' || provider_iteration::text, source_expires_at, owner_id, 'openai', v_utc_hour,
      1, 1, 1, 100, 90, 30, 25, 50, 1, 0,
      0, 1, 0, 0, 0, 0, 0, 0, statement_timestamp()
    );
    insert into task11_rpc_latency values ('provider_hourly_openai', extract(epoch from (clock_timestamp() - start_time)) * 1000000);
    if not recorded then
      raise exception 'Task 11 OpenAI provider detail was not recorded';
    end if;

    start_time := clock_timestamp();
    recorded := public.ct_paid_record_provider_hourly_detail(
      azure_attempt_id, 'task11-azure-' || provider_iteration::text, source_expires_at, owner_id, 'azure_fallback', v_utc_hour,
      1, 1, 1, 100, 90, 0, 0, 0, 1, 0,
      0, 0, 1, 0, 0, 0, 0, 0, statement_timestamp()
    );
    insert into task11_rpc_latency values ('provider_hourly_azure_fallback', extract(epoch from (clock_timestamp() - start_time)) * 1000000);
    if not recorded then
      raise exception 'Task 11 Azure provider detail was not recorded';
    end if;
  end loop;

  openai_attempt_id := 'ctpa_task11_openai_' || repeat('a', 41) || '01';
  azure_attempt_id := 'ctpa_task11_azure_' || repeat('b', 41) || '01';

  if public.ct_paid_record_provider_hourly_detail(
    openai_attempt_id, 'task11-openai-1', source_expires_at, owner_id, 'openai', v_utc_hour,
    1, 1, 1, 100, 90, 30, 25, 50, 1, 0,
    0, 1, 0, 0, 0, 0, 0, 0, statement_timestamp()
  ) then
    raise exception 'Task 11 OpenAI detail replay was double counted';
  end if;
  if public.ct_paid_record_provider_hourly_detail(
    azure_attempt_id, 'task11-azure-1', source_expires_at, owner_id, 'azure_fallback', v_utc_hour,
    1, 1, 1, 100, 90, 0, 0, 0, 1, 0,
    0, 0, 1, 0, 0, 0, 0, 0, statement_timestamp()
  ) then
    raise exception 'Task 11 Azure detail replay was double counted';
  end if;

  select count(*) into same_utc_hour_provider_rows
    from public.comment_translator_paid_provider_hourly_details as provider_detail
   where provider_detail.owner_user_id = owner_id
     and provider_detail.utc_hour = v_utc_hour;
  if same_utc_hour_provider_rows <> 2 then
    raise exception 'Task 11 same UTC hour provider rows must equal two';
  end if;

  for cleanup_iteration in select generate_series(1, 20) loop
    cleanup_attempt_id := 'ctpa_task11_cleanup_' || repeat('c', 41) || lpad(cleanup_iteration::text, 2, '0');
    insert into public.comment_translator_paid_logical_attempts (
      attempt_id, owner_user_id, billing_period_usage_id, period_start, period_end,
      input_characters, logical_state, committed_input_characters, expires_at
    ) values (
      cleanup_attempt_id, owner_id, billing_period_id,
      statement_timestamp() - interval '100 years' - interval '1 day', statement_timestamp() - interval '100 years',
      1, 'committed', 1, statement_timestamp() - interval '100 years'
    );
    insert into public.comment_translator_paid_attempt_receipts (
      attempt_id, provider_attempt, provider_kind, session_reference_id, owner_user_id,
      period_start, period_end, utc_month, attempt_state, expires_at,
      billing_period_usage_id, committed_input_characters
    ) values (
      cleanup_attempt_id, 'task11-cleanup-' || cleanup_iteration::text, 'openai_attempt', 'task11-session-1', owner_id,
      statement_timestamp() - interval '100 years' - interval '1 day', statement_timestamp() - interval '100 years',
      date_trunc('month', (statement_timestamp() - interval '100 years') at time zone 'UTC')::date,
      'committed', statement_timestamp() - interval '100 years', billing_period_id, 1
    );
  end loop;
end;
$$;

do $$
declare
  owner_id constant uuid := md5('task11-owner-1')::uuid;
  session_reference constant text := 'task11-session-1';
  message_number integer;
  start_time timestamptz;
  replay_committed_messages integer;
  sixty_first_reservation_status text;
begin
  for message_number in 1..60 loop
    start_time := clock_timestamp();
    perform * from public.ct_paid_reserve_message_rate(
      owner_id, session_reference, 'task11-rate-' || message_number::text, 1, statement_timestamp()
    );
    insert into task11_rpc_latency values (
      'message_rate_reserve',
      extract(epoch from (clock_timestamp() - start_time)) * 1000000
    );

    if message_number = 1 then
      perform public.ct_paid_record_message_rate_success(
        owner_id, session_reference, 'task11-rate-1', 1, statement_timestamp()
      );
    end if;

    start_time := clock_timestamp();
    perform * from public.ct_paid_finalize_message_rate(
      owner_id, session_reference, 'task11-rate-' || message_number::text, 1, statement_timestamp()
    );
    insert into task11_rpc_latency values (
      'message_rate_finalize',
      extract(epoch from (clock_timestamp() - start_time)) * 1000000
    );
  end loop;

  select committed_messages into replay_committed_messages
    from public.ct_paid_finalize_message_rate(owner_id, session_reference, 'task11-rate-1', 1, statement_timestamp());
  if replay_committed_messages <> 1 then
    raise exception 'Task 11 committed replay must remain exactly one message';
  end if;

  select reservation_status into sixty_first_reservation_status
    from public.ct_paid_reserve_message_rate(owner_id, session_reference, 'task11-rate-61', 1, statement_timestamp());
  if sixty_first_reservation_status <> 'rate-limited' then
    raise exception 'Task 11 sixty-first message must be rate limited';
  end if;
end;
$$;

do $$
declare
  cleanup_count integer;
  cleanup_iteration integer;
  start_time timestamptz;
begin
  for cleanup_iteration in select generate_series(1, 20) loop
    start_time := clock_timestamp();
    cleanup_count := public.ct_paid_cleanup_attempt_ledgers(statement_timestamp(), 1);
    insert into task11_rpc_latency values (
      'cleanup_attempt_ledger',
      extract(epoch from (clock_timestamp() - start_time)) * 1000000
    );
    if cleanup_count <> 1 then
      raise exception 'Task 11 bounded cleanup must remove exactly one expired synthetic attempt per call';
    end if;
  end loop;

  if exists (
    select 1
      from public.comment_translator_paid_logical_attempts
     where attempt_id like 'ctpa_task11_cleanup_%'
  ) then
    raise exception 'Task 11 expired synthetic attempts remain after bounded cleanup';
  end if;
end;
$$;

do $$
begin
  if not has_function_privilege('service_role', 'public.ct_paid_reserve_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('anon', 'public.ct_paid_reserve_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.ct_paid_reserve_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.ct_paid_finalize_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('anon', 'public.ct_paid_finalize_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.ct_paid_finalize_message_rate(uuid,text,text,integer,timestamptz)', 'EXECUTE')
  then
    raise exception 'Task 11 service-only RPC ACL boundary is not closed';
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
    raise exception 'Task 11 latency operation has fewer than 20 samples';
  end if;
end;
$$;

select
  operation,
  count(*) as call_count,
  round(percentile_cont(0.50) within group (order by elapsed_microseconds)::numeric, 2) as p50_microseconds,
  round(percentile_cont(0.95) within group (order by elapsed_microseconds)::numeric, 2) as p95_microseconds,
  round(max(elapsed_microseconds)::numeric, 2) as max_microseconds
from task11_rpc_latency
group by operation
order by operation;

select
  (select count(*) from public.comment_translator_sessions where plan = 'paid' and status = 'active') as active_session_count,
  (select count(*) from task11_rpc_latency where operation = 'read_poll_budget') as poll_read_count,
  (select count(*) from task11_rpc_latency where operation = 'heartbeat') as heartbeat_call_count,
  (select count(*) from task11_heartbeat_writes) as heartbeat_write_count,
  (select count(*) from public.comment_translator_paid_provider_hourly_details) as same_utc_hour_provider_rows,
  (select count(*) from public.comment_translator_paid_message_rate_reservations where reservation_state = 'committed') as committed_message_receipts;

rollback;
