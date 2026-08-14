-- Task 7: read-only runtime authority adapters for Paid session integration.
-- These functions expose only bounded counters/booleans and never return
-- owner, provider, comment, OAuth, or secret material.

create table if not exists public.comment_translator_paid_message_rate_buckets (
  owner_user_id uuid not null,
  minute_start timestamptz not null,
  reserved_messages integer not null default 0,
  committed_messages integer not null default 0,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (date_trunc('minute', now()) + interval '2 minutes'),
  primary key (owner_user_id, minute_start),
  constraint comment_translator_paid_message_rate_reserved_nonnegative check (reserved_messages >= 0),
  constraint comment_translator_paid_message_rate_committed_nonnegative check (committed_messages >= 0),
  constraint comment_translator_paid_message_rate_total_bounded check (reserved_messages + committed_messages <= 60)
);

create table if not exists public.comment_translator_paid_message_rate_reservations (
  reservation_key text primary key,
  owner_user_id uuid not null,
  session_reference_id text not null,
  minute_start timestamptz not null,
  reserved_messages integer not null,
  committed_messages integer not null default 0,
  successful_message_count integer not null default 0,
  reservation_state text not null default 'reserved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint comment_translator_paid_message_rate_reservation_key_nonempty check (length(trim(reservation_key)) > 0),
  constraint comment_translator_paid_message_rate_reserved_positive check (reserved_messages > 0 and reserved_messages <= 60),
  constraint comment_translator_paid_message_rate_committed_valid check (committed_messages >= 0 and committed_messages <= reserved_messages),
  constraint comment_translator_paid_message_rate_successful_valid check (successful_message_count >= 0 and successful_message_count <= reserved_messages),
  constraint comment_translator_paid_message_rate_reservation_state_valid check (reservation_state in ('reserved', 'committed', 'released'))
);

create table if not exists public.comment_translator_paid_message_rate_reservation_tombstones (
  reservation_key text primary key,
  tombstoned_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint comment_translator_paid_message_rate_tombstone_key_nonempty check (length(trim(reservation_key)) > 0)
);

create index if not exists comment_translator_paid_message_rate_reservations_expiry_idx
  on public.comment_translator_paid_message_rate_reservations (expires_at);
create index if not exists comment_translator_paid_message_rate_buckets_expiry_idx
  on public.comment_translator_paid_message_rate_buckets (expires_at);
create index if not exists comment_translator_paid_message_rate_reservation_tombstones_expiry_idx
  on public.comment_translator_paid_message_rate_reservation_tombstones (expires_at);

create or replace function public.ct_paid_bound_message_rate_receipt_expiry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'stopped' and new.stopped_at is not null then
    update public.comment_translator_paid_message_rate_reservations
       set expires_at = least(expires_at, new.stopped_at + interval '24 hours'),
           updated_at = statement_timestamp()
     where owner_user_id = new.owner_user_id
       and session_reference_id = new.session_reference_id;
  end if;
  return new;
end;
$$;

drop trigger if exists comment_translator_paid_bound_message_rate_receipt_expiry
  on public.comment_translator_sessions;
create trigger comment_translator_paid_bound_message_rate_receipt_expiry
after update of status, stopped_at on public.comment_translator_sessions
for each row execute function public.ct_paid_bound_message_rate_receipt_expiry();

revoke all on function public.ct_paid_bound_message_rate_receipt_expiry()
  from public, anon, authenticated, service_role;

alter table public.comment_translator_paid_message_rate_buckets enable row level security;
alter table public.comment_translator_paid_message_rate_reservations enable row level security;
alter table public.comment_translator_paid_message_rate_reservation_tombstones enable row level security;
revoke all on table public.comment_translator_paid_message_rate_buckets from public, anon, authenticated, service_role;
revoke all on table public.comment_translator_paid_message_rate_reservations from public, anon, authenticated, service_role;
revoke all on table public.comment_translator_paid_message_rate_reservation_tombstones from public, anon, authenticated;
grant select, insert on table public.comment_translator_paid_message_rate_reservation_tombstones to service_role;

-- The durable session store must be able to persist the bounded Paid stop
-- reasons emitted by the Task 7 command path. This only widens the existing
-- enum-like check; it does not alter or remove session rows.
alter table public.comment_translator_sessions
  drop constraint if exists comment_translator_sessions_stop_reason_check;
alter table public.comment_translator_sessions
  add constraint comment_translator_sessions_stop_reason_check check (
    stop_reason is null
    or stop_reason in (
      'user-stop',
      'stream-ended',
      'stream-unavailable',
      'browser-disconnect',
      'missing-heartbeat',
      'auth-failed',
      'token-refresh-failed',
      'reconnect-required',
      'daily-time-limit',
      'session-time-limit',
      'translated-message-cap',
      'provider-quota-stop',
      'global-budget-stop',
      'ai-budget-stop',
      'translation-provider-limit',
      'session-limit',
      'paid-authority-unreadable',
      'paid-character-quota-stop',
      'paid-individual-cost-stop',
      'paid-global-cost-stop',
      'terminal-provider-error'
    )
  );

-- The durable usage ledger stores the same sanitized stop enum for
-- session-stopped events. Widen its existing check without changing rows or
-- the ledger event shape.
alter table public.comment_translator_usage_ledger_events
  drop constraint if exists comment_translator_usage_ledger_events_stop_reason_check;
alter table public.comment_translator_usage_ledger_events
  add constraint comment_translator_usage_ledger_events_stop_reason_check check (
    stop_reason is null
    or stop_reason in (
      'user-stop',
      'stream-ended',
      'stream-unavailable',
      'browser-disconnect',
      'missing-heartbeat',
      'auth-failed',
      'token-refresh-failed',
      'reconnect-required',
      'daily-time-limit',
      'session-time-limit',
      'translated-message-cap',
      'provider-quota-stop',
      'global-budget-stop',
      'ai-budget-stop',
      'translation-provider-limit',
      'session-limit',
      'paid-authority-unreadable',
      'paid-character-quota-stop',
      'paid-individual-cost-stop',
      'paid-global-cost-stop',
      'terminal-provider-error'
    )
  );

create or replace function public.ct_paid_read_runtime_authority(
  p_owner_user_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_utc_month date,
  p_now timestamptz default now()
)
returns table (
  billing_period_input_characters bigint,
  billing_period_character_limit bigint,
  billing_period_available boolean,
  individual_cost_available boolean,
  global_cost_available boolean,
  translated_messages_in_current_minute integer,
  translated_message_capacity_available_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with config as (
    select
      billing_period_character_limit,
      individual_cost_limit_micros,
      global_cost_limit_micros
      from public.comment_translator_paid_capacity_config
     where config_key = true
  ),
  period_usage as (
    select reserved_input_characters, committed_input_characters, period_state
      from public.comment_translator_paid_billing_period_usage
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     limit 1
  ),
  owner_cost as (
    select reserved_cost_micros, committed_cost_micros, cost_limit_micros, period_state
      from public.comment_translator_paid_owner_cost_buckets
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     limit 1
  ),
  global_cost as (
    select reserved_cost_micros, committed_cost_micros, cost_limit_micros, bucket_state
      from public.comment_translator_paid_global_cost_buckets
     where utc_month = p_utc_month
     limit 1
  ),
  message_rate as (
    select
      coalesce(reserved_messages, 0) + coalesce(committed_messages, 0) as used_messages,
      date_trunc('minute', statement_timestamp()) + interval '1 minute' as next_minute
      from public.comment_translator_paid_message_rate_buckets
     where owner_user_id = p_owner_user_id
       and minute_start = date_trunc('minute', statement_timestamp())
     limit 1
  )
  select
    least(
      coalesce(period_usage.reserved_input_characters, 0)
        + coalesce(period_usage.committed_input_characters, 0),
      config.billing_period_character_limit
    )::bigint,
    config.billing_period_character_limit,
    (
      period_usage.period_state is null
      or period_usage.period_state = 'open'
    ),
    (
      owner_cost.reserved_cost_micros is null
      or (
        owner_cost.period_state = 'open'
        and owner_cost.reserved_cost_micros + owner_cost.committed_cost_micros < owner_cost.cost_limit_micros
      )
    ),
    (
      global_cost.reserved_cost_micros is null
      or (
        global_cost.bucket_state = 'open'
        and global_cost.reserved_cost_micros + global_cost.committed_cost_micros < global_cost.cost_limit_micros
      )
    ),
    coalesce(message_rate.used_messages, 0)::integer,
    case
      when coalesce(message_rate.used_messages, 0) >= 60 then message_rate.next_minute
      else null::timestamptz
    end
    from config
    left join period_usage on true
    left join owner_cost on true
    left join global_cost on true
    left join message_rate on true
   where p_owner_user_id is not null
     and p_period_start is not null
     and p_period_end is not null
     and p_period_end > p_period_start
     and p_utc_month = date_trunc('month', statement_timestamp() at time zone 'UTC')::date;
$$;

create or replace function public.ct_paid_read_poll_budget(
  p_session_reference_id text,
  p_owner_user_id uuid,
  p_now timestamptz default now()
)
returns table (
  utc_day date,
  daily_budget integer,
  reserved_polls integer,
  session_reserved_polls integer,
  session_reservation_present boolean,
  next_reset_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_utc_day date;
  v_day_end timestamptz;
  v_bucket public.comment_translator_paid_poll_budget_buckets%rowtype;
  v_reservation public.comment_translator_paid_poll_reservations%rowtype;
begin
  -- Keep the caller-supplied timestamp only for signature compatibility. The
  -- database clock is the authority for UTC bucket selection.
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
  then
    raise exception 'poll budget authority request is not valid';
  end if;

  v_utc_day := (v_now at time zone 'UTC')::date;
  v_day_end := ((v_utc_day + 1)::timestamp at time zone 'UTC');

  select *
    into v_reservation
    from public.comment_translator_paid_poll_reservations
   where session_reference_id = p_session_reference_id
     and utc_day = v_utc_day
   limit 1;
  if v_reservation.id is not null and v_reservation.owner_user_id <> p_owner_user_id then
    raise exception 'poll reservation owner binding conflict';
  end if;

  select *
    into v_bucket
    from public.comment_translator_paid_poll_budget_buckets
   where utc_day = v_utc_day
   limit 1;

  return query
    select
      v_utc_day,
      v_bucket.daily_budget,
      coalesce(v_bucket.reserved_polls, 0),
      coalesce(v_reservation.reserved_polls, 0),
      v_reservation.id is not null,
      v_day_end;
end;
$$;

create or replace function public.ct_paid_reserve_poll_budget(
  p_session_reference_id text,
  p_owner_user_id uuid,
  p_daily_budget integer,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_existing public.comment_translator_paid_poll_reservations%rowtype;
  v_bucket public.comment_translator_paid_poll_budget_buckets%rowtype;
  v_utc_day date;
  v_day_end timestamptz;
  v_reserve_polls integer;
  v_session_reserved_polls integer;
  v_had_prior_reservation boolean;
begin
  -- Keep p_now only for signature compatibility; reservation authority is the
  -- database clock so a Worker cannot select the UTC bucket or threshold.
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or p_daily_budget <= 0
  then
    raise exception 'poll budget reservation request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290103);
  v_utc_day := (v_now at time zone 'UTC')::date;

  select *
    into v_existing
    from public.comment_translator_paid_poll_reservations
   where session_reference_id = p_session_reference_id
     and utc_day = v_utc_day
   for update;
  if v_existing.id is not null then
    if v_existing.owner_user_id <> p_owner_user_id then
      raise exception 'poll reservation owner binding conflict';
    end if;
    select *
      into v_bucket
      from public.comment_translator_paid_poll_budget_buckets
     where utc_day = v_utc_day
     for update;
    if v_bucket.utc_day is null or v_bucket.daily_budget <> p_daily_budget then
      raise exception 'poll budget configuration conflict';
    end if;
    return v_existing.reserved_polls;
  end if;

  if exists (
    select 1
      from public.comment_translator_paid_poll_reservations
     where session_reference_id = p_session_reference_id
       and owner_user_id <> p_owner_user_id
  ) then
    raise exception 'poll reservation owner binding conflict';
  end if;

  select
    coalesce(sum(reserved_polls), 0)::integer,
    count(*) > 0
    into v_session_reserved_polls, v_had_prior_reservation
    from public.comment_translator_paid_poll_reservations
   where session_reference_id = p_session_reference_id
     and owner_user_id = p_owner_user_id;

  v_day_end := ((v_utc_day + 1)::timestamp at time zone 'UTC');
  v_reserve_polls := least(
    720 - v_session_reserved_polls,
    floor(extract(epoch from (v_day_end - v_now)) / 15)::integer
  );
  if v_reserve_polls <= 0 then
    raise exception 'UTC poll budget window is exhausted';
  end if;

  insert into public.comment_translator_paid_poll_budget_buckets (
    utc_day, daily_budget, updated_at
  )
  values (v_utc_day, p_daily_budget, v_now)
  on conflict (utc_day) do nothing;
  select *
    into v_bucket
    from public.comment_translator_paid_poll_budget_buckets
   where utc_day = v_utc_day
   for update;
  if v_bucket.daily_budget <> p_daily_budget then
    raise exception 'poll budget configuration conflict';
  end if;

  if not v_had_prior_reservation
    and v_bucket.reserved_polls + v_reserve_polls >= floor(v_bucket.daily_budget * 0.90)
  then
    raise exception 'new Paid poll session threshold is exhausted';
  end if;
  if v_had_prior_reservation
    and v_bucket.reserved_polls + v_reserve_polls >= floor(v_bucket.daily_budget * 0.95)
  then
    raise exception 'active Paid poll session threshold is exhausted';
  end if;
  if v_bucket.reserved_polls + v_reserve_polls > v_bucket.daily_budget then
    raise exception 'daily Paid poll budget is exhausted';
  end if;

  insert into public.comment_translator_paid_poll_reservations (
    session_reference_id, owner_user_id, utc_day, reserved_polls, created_at
  )
  values (p_session_reference_id, p_owner_user_id, v_utc_day, v_reserve_polls, v_now);
  update public.comment_translator_paid_poll_budget_buckets
     set reserved_polls = reserved_polls + v_reserve_polls,
         updated_at = v_now
   where utc_day = v_utc_day;

  return v_reserve_polls;
end;
$$;

create or replace function public.ct_paid_start_session_and_reserve_poll_budget(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_plan_entitlement_reference_id text,
  p_credential_reference_id text,
  p_daily_budget integer,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_reserved_polls integer;
begin
  -- Keep p_now only for signature compatibility. Session start and UTC poll
  -- reservation authority both use the same database transaction and clock.
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
    or p_plan_entitlement_reference_id is null
    or length(trim(p_plan_entitlement_reference_id)) = 0
    or length(p_plan_entitlement_reference_id) > 200
    or p_credential_reference_id is null
    or length(trim(p_credential_reference_id)) = 0
    or length(p_credential_reference_id) > 200
    or p_daily_budget is null
    or p_daily_budget <= 0
  then
    raise exception 'Paid atomic session start request is not valid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text, 47290111));
  if exists (
    select 1
      from public.comment_translator_sessions
     where owner_user_id = p_owner_user_id
       and status = 'active'
  ) then
    raise exception 'Paid owner already has an active session';
  end if;

  insert into public.comment_translator_sessions (
    owner_user_id, session_reference_id, provider, plan,
    plan_entitlement_reference_id, status, started_at, last_heartbeat_at,
    stopped_at, stop_reason, credential_reference_id, created_at, updated_at
  )
  values (
    p_owner_user_id, p_session_reference_id, 'youtube', 'paid',
    p_plan_entitlement_reference_id, 'active', v_now, v_now,
    null, null, p_credential_reference_id, v_now, v_now
  );

  v_reserved_polls := public.ct_paid_reserve_poll_budget(
    p_session_reference_id,
    p_owner_user_id,
    p_daily_budget,
    v_now
  );
  if v_reserved_polls < 1 or v_reserved_polls > 720 then
    raise exception 'Paid atomic session poll reservation is invalid';
  end if;
  return v_reserved_polls;
end;
$$;

revoke all on function public.ct_paid_start_session_and_reserve_poll_budget(uuid, text, text, text, integer, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_start_session_and_reserve_poll_budget(uuid, text, text, text, integer, timestamptz)
  to service_role;

revoke all on function public.ct_paid_reserve_poll_budget(text, uuid, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_reserve_poll_budget(text, uuid, integer, timestamptz)
  to service_role;

revoke all on function public.ct_paid_read_runtime_authority(uuid, timestamptz, timestamptz, date, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_read_runtime_authority(uuid, timestamptz, timestamptz, date, timestamptz)
  to service_role;

drop function if exists public.ct_paid_touch_active_paid_session_heartbeat(uuid, text);

create or replace function public.ct_paid_touch_active_paid_session_heartbeat(
  p_owner_user_id uuid,
  p_session_reference_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_started_at timestamptz;
  v_last_heartbeat_at timestamptz;
begin
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
  then
    raise exception 'Paid session heartbeat request is not valid';
  end if;

  select started_at, last_heartbeat_at
    into v_started_at, v_last_heartbeat_at
    from public.comment_translator_sessions
   where owner_user_id = p_owner_user_id
     and session_reference_id = p_session_reference_id
     and status = 'active'
     and plan = 'paid'
   for update;
  if not found then
    raise exception 'Paid session heartbeat authority is unreadable';
  end if;

  if v_last_heartbeat_at is null then
    raise exception 'Paid session heartbeat authority is unreadable';
  end if;
  -- Active Paid polls arrive every 15 seconds, but section 17.1 permits at
  -- most one durable heartbeat write per minute. Preserve the existing
  -- 45-second missing-heartbeat grace after that bounded coalescing window.
  if v_last_heartbeat_at + interval '1 minute' + interval '45 seconds' < v_now then
    return jsonb_build_object('status', 'missing-heartbeat');
  end if;

  if v_started_at + interval '3 hours' <= v_now then
    return jsonb_build_object('status', 'expired');
  end if;

  if v_last_heartbeat_at + interval '1 minute' <= v_now then
    update public.comment_translator_sessions
       set last_heartbeat_at = v_now,
           updated_at = v_now
     where owner_user_id = p_owner_user_id
       and session_reference_id = p_session_reference_id
       and status = 'active'
       and plan = 'paid';
    if not found then
      raise exception 'Paid session heartbeat authority is unreadable';
    end if;
  end if;
  return jsonb_build_object(
    'status', 'touched',
    'heartbeatAtIso', to_jsonb(v_now)
  );
end;
$$;

revoke all on function public.ct_paid_touch_active_paid_session_heartbeat(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_touch_active_paid_session_heartbeat(uuid, text)
  to service_role;

drop function if exists public.ct_paid_reserve_message_rate(uuid, text, integer, timestamptz);
drop function if exists public.ct_paid_record_message_rate_success(uuid, text, integer, timestamptz);
drop function if exists public.ct_paid_finalize_message_rate(uuid, text, integer, timestamptz);

create or replace function public.ct_paid_reserve_message_rate(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_reservation_key text,
  p_message_count integer,
  p_now timestamptz default now()
)
returns table (
  reservation_status text,
  minute_start timestamptz,
  reserved_messages integer,
  committed_messages integer,
  successful_message_count integer,
  capacity_remaining integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_minute_start timestamptz;
  v_reservation public.comment_translator_paid_message_rate_reservations%rowtype;
  v_bucket public.comment_translator_paid_message_rate_buckets%rowtype;
  v_session public.comment_translator_sessions%rowtype;
  v_used integer;
begin
  -- The rate bucket must not be selected from a skewed Worker clock.
  v_now := statement_timestamp();
  v_minute_start := date_trunc('minute', v_now);
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
    or p_reservation_key is null
    or length(trim(p_reservation_key)) = 0
    or length(p_reservation_key) > 200
    or p_message_count is null
    or p_message_count <= 0
    or p_message_count > 60
  then
    raise exception 'Paid message-rate reservation request is not valid';
  end if;

  -- Shared per-key transaction lock: reserve and cleanup serialize before
  -- either side checks tombstones or locks/deletes a receipt row.
  perform pg_advisory_xact_lock(hashtextextended(p_reservation_key, 47290113));

  if exists (
    select 1
      from public.comment_translator_paid_message_rate_reservation_tombstones
     where reservation_key = p_reservation_key
       and expires_at > v_now
  ) then
    raise exception 'Paid message-rate reservation key is no longer available';
  end if;

  select *
    into v_session
    from public.comment_translator_sessions
   where owner_user_id = p_owner_user_id
     and session_reference_id = p_session_reference_id
     and status = 'active'
     and plan = 'paid'
   for update;
  if v_session.id is null or v_now >= v_session.started_at + interval '3 hours' then
    raise exception 'Paid message-rate session authority is unreadable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':' || v_minute_start::text, 47290107));

  select *
    into v_reservation
    from public.comment_translator_paid_message_rate_reservations
   where reservation_key = p_reservation_key
   for update;
  if v_reservation.reservation_key is not null then
    if v_reservation.owner_user_id <> p_owner_user_id then
      raise exception 'Paid message-rate reservation owner binding conflict';
    end if;
    if v_reservation.reserved_messages <> p_message_count then
      raise exception 'Paid message-rate reservation count binding conflict';
    end if;
    if v_reservation.session_reference_id <> p_session_reference_id
      or v_reservation.expires_at <= v_now
    then
      raise exception 'Paid message-rate reservation session authority is unreadable';
    end if;
    -- The key is stable across Worker retries and minute boundaries. A
    -- committed or still-reserved row remains bound to the original
    -- database-authoritative minute; only a released row may rebind to the
    -- current database minute below.
    if v_reservation.reservation_state = 'committed' then
      select *
        into v_bucket
        from public.comment_translator_paid_message_rate_buckets
       where owner_user_id = p_owner_user_id
         and minute_start = v_reservation.minute_start;
      return query
        select
          v_reservation.reservation_state,
          v_reservation.minute_start,
          v_reservation.reserved_messages,
          v_reservation.committed_messages,
          v_reservation.successful_message_count,
          greatest(0, 60 - (coalesce(v_bucket.reserved_messages, 0) + coalesce(v_bucket.committed_messages, 0)));
      return;
    end if;
    if v_reservation.reservation_state = 'reserved' then
      select *
        into v_bucket
        from public.comment_translator_paid_message_rate_buckets
       where owner_user_id = p_owner_user_id
         and minute_start = v_reservation.minute_start;
      return query
        select
          v_reservation.reservation_state,
          v_reservation.minute_start,
          v_reservation.reserved_messages,
          v_reservation.committed_messages,
          v_reservation.successful_message_count,
          greatest(0, 60 - (coalesce(v_bucket.reserved_messages, 0) + coalesce(v_bucket.committed_messages, 0)));
      return;
    end if;
    insert into public.comment_translator_paid_message_rate_buckets (owner_user_id, minute_start, updated_at, expires_at)
    values (p_owner_user_id, v_minute_start, v_now, v_minute_start + interval '2 minutes')
    on conflict (owner_user_id, minute_start) do nothing;
    select *
      into v_bucket
      from public.comment_translator_paid_message_rate_buckets
     where owner_user_id = p_owner_user_id
       and minute_start = v_minute_start
     for update;
    v_used := v_bucket.reserved_messages + v_bucket.committed_messages;
    if v_used + p_message_count > 60 then
      return query
        select 'rate-limited', v_minute_start, 0, 0, 0, greatest(0, 60 - v_used);
      return;
    end if;
    update public.comment_translator_paid_message_rate_reservations
       set session_reference_id = p_session_reference_id,
           minute_start = v_minute_start,
           reserved_messages = p_message_count,
           committed_messages = 0,
           successful_message_count = 0,
           reservation_state = 'reserved',
           updated_at = v_now,
           expires_at = least(v_session.started_at + interval '3 hours' + interval '24 hours', v_now + interval '27 hours')
     where reservation_key = p_reservation_key;
    update public.comment_translator_paid_message_rate_buckets
       set reserved_messages = reserved_messages + p_message_count,
           updated_at = v_now
     where owner_user_id = p_owner_user_id
       and minute_start = v_minute_start;
    return query
      select 'reserved', v_minute_start, p_message_count, 0, 0, 60 - v_used - p_message_count;
    return;
  end if;

  insert into public.comment_translator_paid_message_rate_buckets (owner_user_id, minute_start, updated_at, expires_at)
  values (p_owner_user_id, v_minute_start, v_now, v_minute_start + interval '2 minutes')
  on conflict (owner_user_id, minute_start) do nothing;
  select *
    into v_bucket
    from public.comment_translator_paid_message_rate_buckets
   where owner_user_id = p_owner_user_id
     and minute_start = v_minute_start
   for update;
  v_used := v_bucket.reserved_messages + v_bucket.committed_messages;
  if v_used + p_message_count > 60 then
    return query
      select 'rate-limited', v_minute_start, 0, 0, 0, greatest(0, 60 - v_used);
    return;
  end if;

  insert into public.comment_translator_paid_message_rate_reservations (
    reservation_key,
    owner_user_id,
    session_reference_id,
    minute_start,
    reserved_messages,
    committed_messages,
    successful_message_count,
    reservation_state,
    created_at,
    updated_at,
    expires_at
  )
  values (
    p_reservation_key,
    p_owner_user_id,
    p_session_reference_id,
    v_minute_start,
    p_message_count,
    0,
    0,
    'reserved',
    v_now,
    v_now,
    least(v_session.started_at + interval '3 hours' + interval '24 hours', v_now + interval '27 hours')
  );
  update public.comment_translator_paid_message_rate_buckets
     set reserved_messages = reserved_messages + p_message_count,
         updated_at = v_now
   where owner_user_id = p_owner_user_id
     and minute_start = v_minute_start;
  return query
    select 'reserved', v_minute_start, p_message_count, 0, 0, 60 - v_used - p_message_count;
end;
$$;

-- Extend the existing bounded retention RPC used by the approved scheduler.
-- Reserved rows remain replayable for crash recovery until their authoritative
-- expiry; every state becomes cleanup-eligible only after that boundary.
create or replace function public.ct_paid_cleanup_attempt_ledgers(
  p_now timestamptz default now(),
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt_ids text[];
  v_reservation_keys text[];
  v_reservation_key text;
  v_tombstone_keys text[];
  v_tombstone_key text;
  v_rate_deleted_for_key integer;
  v_tombstone_deleted_for_key integer;
  v_deleted integer := 0;
  v_rate_deleted integer := 0;
  v_tombstone_deleted integer := 0;
  v_bucket_deleted integer := 0;
  v_remaining integer;
  v_tombstone_remaining integer;
  v_bucket_remaining integer;
begin
  p_now := statement_timestamp();
  if p_limit < 1 or p_limit > 500 then
    raise exception 'attempt ledger cleanup limit is not valid';
  end if;

  select coalesce(array_agg(candidate.attempt_id), array[]::text[])
    into v_attempt_ids
    from (
      select logical_attempt.attempt_id
        from public.comment_translator_paid_logical_attempts logical_attempt
       where logical_attempt.expires_at <= p_now
         and logical_attempt.logical_state in ('committed', 'released')
         and not exists (
           select 1
             from public.comment_translator_paid_attempt_receipts provider_receipt
            where provider_receipt.attempt_id = logical_attempt.attempt_id
              and provider_receipt.attempt_state not in ('committed', 'released', 'expired')
         )
       order by logical_attempt.expires_at, logical_attempt.attempt_id
       limit p_limit
       for update of logical_attempt skip locked
    ) candidate;

  if cardinality(v_attempt_ids) > 0 then
    delete from public.comment_translator_paid_attempt_receipts
     where attempt_id = any(v_attempt_ids);
    delete from public.comment_translator_paid_logical_attempts
     where attempt_id = any(v_attempt_ids);
    get diagnostics v_deleted = row_count;
  end if;

  v_remaining := p_limit - v_deleted;
  if v_remaining > 0 then
    select coalesce(array_agg(candidate.reservation_key), array[]::text[])
      into v_reservation_keys
      from (
        select rate_receipt.reservation_key
          from public.comment_translator_paid_message_rate_reservations rate_receipt
         where rate_receipt.expires_at <= p_now
           and rate_receipt.reservation_state in ('reserved', 'committed', 'released')
        order by rate_receipt.expires_at, rate_receipt.reservation_key
        limit v_remaining
      ) candidate;

    if cardinality(v_reservation_keys) > 0 then
      foreach v_reservation_key in array v_reservation_keys loop
        -- This is the same deterministic lock and ordering used by reserve.
        perform pg_advisory_xact_lock(hashtextextended(v_reservation_key, 47290113));

        perform 1
          from public.comment_translator_paid_message_rate_reservations rate_receipt
         where rate_receipt.reservation_key = v_reservation_key
           and rate_receipt.expires_at <= p_now
           and rate_receipt.reservation_state in ('reserved', 'committed', 'released')
         for update;
        if found then
          insert into public.comment_translator_paid_message_rate_reservation_tombstones (
            reservation_key,
            tombstoned_at,
            expires_at
          )
          values (v_reservation_key, p_now, p_now + interval '7 days')
          on conflict (reservation_key) do update
            set tombstoned_at = excluded.tombstoned_at,
                expires_at = excluded.expires_at;

          delete from public.comment_translator_paid_message_rate_reservations
           where reservation_key = v_reservation_key;
          get diagnostics v_rate_deleted_for_key = row_count;
          v_rate_deleted := v_rate_deleted + v_rate_deleted_for_key;
        end if;
      end loop;
    end if;
  end if;

  v_tombstone_remaining := p_limit - v_deleted - v_rate_deleted;
  if v_tombstone_remaining > 0 then
    select coalesce(array_agg(candidate.reservation_key), array[]::text[])
      into v_tombstone_keys
      from (
        select tombstone.reservation_key
          from public.comment_translator_paid_message_rate_reservation_tombstones tombstone
         where tombstone.expires_at <= p_now
        order by tombstone.expires_at, tombstone.reservation_key
        limit v_tombstone_remaining
      ) candidate;

    if cardinality(v_tombstone_keys) > 0 then
      foreach v_tombstone_key in array v_tombstone_keys loop
        -- Reserve and both cleanup phases use the same per-key lock. Recheck
        -- expiry after locking so a concurrently refreshed tombstone survives.
        perform pg_advisory_xact_lock(hashtextextended(v_tombstone_key, 47290113));
        perform 1
          from public.comment_translator_paid_message_rate_reservation_tombstones tombstone
         where tombstone.reservation_key = v_tombstone_key
           and tombstone.expires_at <= p_now
         for update;
        if found then
          delete from public.comment_translator_paid_message_rate_reservation_tombstones
           where reservation_key = v_tombstone_key
             and expires_at <= p_now;
          get diagnostics v_tombstone_deleted_for_key = row_count;
          v_tombstone_deleted := v_tombstone_deleted + v_tombstone_deleted_for_key;
        end if;
      end loop;
    end if;
  end if;

  v_bucket_remaining := p_limit - v_deleted - v_rate_deleted - v_tombstone_deleted;
  if v_bucket_remaining > 0 then
    with bucket_candidates as (
      select rate_bucket.owner_user_id, rate_bucket.minute_start
        from public.comment_translator_paid_message_rate_buckets rate_bucket
       where rate_bucket.expires_at <= p_now
         and not exists (
           select 1
             from public.comment_translator_paid_message_rate_reservations rate_receipt
            where rate_receipt.owner_user_id = rate_bucket.owner_user_id
              and rate_receipt.minute_start = rate_bucket.minute_start
         )
       order by rate_bucket.expires_at, rate_bucket.owner_user_id, rate_bucket.minute_start
       limit v_bucket_remaining
       for update of rate_bucket skip locked
    )
    delete from public.comment_translator_paid_message_rate_buckets rate_bucket
     using bucket_candidates candidate
     where rate_bucket.owner_user_id = candidate.owner_user_id
       and rate_bucket.minute_start = candidate.minute_start;
    get diagnostics v_bucket_deleted = row_count;
  end if;

  return v_deleted + v_rate_deleted + v_tombstone_deleted + v_bucket_deleted;
end;
$$;

revoke all on function public.ct_paid_cleanup_attempt_ledgers(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.ct_paid_cleanup_attempt_ledgers(timestamptz, integer)
  to service_role;

create or replace function public.ct_paid_record_message_rate_success(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_reservation_key text,
  p_successful_message_count integer,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_reservation public.comment_translator_paid_message_rate_reservations%rowtype;
  v_session public.comment_translator_sessions%rowtype;
begin
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
    or p_reservation_key is null
    or length(trim(p_reservation_key)) = 0
    or length(p_reservation_key) > 200
    or p_successful_message_count is null
    or p_successful_message_count < 0
  then
    raise exception 'Paid message-rate success request is not valid';
  end if;
  select * into v_session
    from public.comment_translator_sessions
   where owner_user_id = p_owner_user_id
     and session_reference_id = p_session_reference_id
     and status = 'active'
     and plan = 'paid'
   for update;
  if v_session.id is null or v_now >= v_session.started_at + interval '3 hours' then
    raise exception 'Paid message-rate success session authority is unreadable';
  end if;
  select * into v_reservation
    from public.comment_translator_paid_message_rate_reservations
   where reservation_key = p_reservation_key
   for update;
  if v_reservation.reservation_key is null
    or v_reservation.owner_user_id <> p_owner_user_id
    or v_reservation.session_reference_id <> p_session_reference_id
    or v_reservation.expires_at <= v_now
    or v_reservation.reservation_state = 'released'
    or p_successful_message_count > v_reservation.reserved_messages
  then
    raise exception 'Paid message-rate success authority is unreadable';
  end if;
  update public.comment_translator_paid_message_rate_reservations
     set successful_message_count = greatest(successful_message_count, p_successful_message_count),
         updated_at = v_now
   where reservation_key = p_reservation_key
   returning successful_message_count into p_successful_message_count;
  return p_successful_message_count;
end;
$$;

create or replace function public.ct_paid_finalize_message_rate(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_reservation_key text,
  p_translated_message_count integer,
  p_now timestamptz default now()
)
returns table (
  reservation_status text,
  minute_start timestamptz,
  reserved_messages integer,
  committed_messages integer,
  released_messages integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_reservation public.comment_translator_paid_message_rate_reservations%rowtype;
  v_session public.comment_translator_sessions%rowtype;
  v_commit_count integer;
begin
  v_now := statement_timestamp();
  if p_owner_user_id is null
    or p_session_reference_id is null
    or length(trim(p_session_reference_id)) = 0
    or length(p_session_reference_id) > 200
    or p_reservation_key is null
    or length(trim(p_reservation_key)) = 0
    or length(p_reservation_key) > 200
    or p_translated_message_count is null
    or p_translated_message_count < 0
  then
    raise exception 'Paid message-rate finalize request is not valid';
  end if;

  select * into v_session
    from public.comment_translator_sessions
   where owner_user_id = p_owner_user_id
     and session_reference_id = p_session_reference_id
     and status = 'active'
     and plan = 'paid'
   for update;
  if v_session.id is null or v_now >= v_session.started_at + interval '3 hours' then
    raise exception 'Paid message-rate finalize session authority is unreadable';
  end if;

  select *
    into v_reservation
    from public.comment_translator_paid_message_rate_reservations
   where reservation_key = p_reservation_key
   for update;
  if v_reservation.reservation_key is null
    or v_reservation.owner_user_id <> p_owner_user_id
    or v_reservation.session_reference_id <> p_session_reference_id
    or v_reservation.expires_at <= v_now
  then
    raise exception 'Paid message-rate reservation is unreadable';
  end if;
  if v_reservation.reservation_state <> 'reserved' then
    if p_translated_message_count <> v_reservation.committed_messages then
      raise exception 'Paid message-rate finalize replay does not match';
    end if;
    return query
      select
        v_reservation.reservation_state,
        v_reservation.minute_start,
        v_reservation.reserved_messages,
        v_reservation.committed_messages,
        v_reservation.reserved_messages - v_reservation.committed_messages;
    return;
  end if;
  v_commit_count := greatest(p_translated_message_count, v_reservation.successful_message_count);
  if v_commit_count > v_reservation.reserved_messages then
    raise exception 'Paid message-rate finalize exceeds reservation';
  end if;

  update public.comment_translator_paid_message_rate_buckets
     set reserved_messages = reserved_messages - v_reservation.reserved_messages,
         committed_messages = committed_messages + v_commit_count,
         updated_at = v_now
   where owner_user_id = p_owner_user_id
     and minute_start = v_reservation.minute_start
     and reserved_messages >= v_reservation.reserved_messages;
  if not found then
    raise exception 'Paid message-rate bucket is unreadable';
  end if;
  update public.comment_translator_paid_message_rate_reservations
     set committed_messages = v_commit_count,
         reservation_state = case when v_commit_count = 0 then 'released' else 'committed' end,
         updated_at = v_now
   where reservation_key = p_reservation_key;
  return query
    select
      case when v_commit_count = 0 then 'released' else 'committed' end,
      v_reservation.minute_start,
      v_reservation.reserved_messages,
      v_commit_count,
      v_reservation.reserved_messages - v_commit_count;
end;
$$;

revoke all on function public.ct_paid_reserve_message_rate(uuid, text, text, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_reserve_message_rate(uuid, text, text, integer, timestamptz)
  to service_role;

revoke all on function public.ct_paid_record_message_rate_success(uuid, text, text, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_record_message_rate_success(uuid, text, text, integer, timestamptz)
  to service_role;

revoke all on function public.ct_paid_finalize_message_rate(uuid, text, text, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_finalize_message_rate(uuid, text, text, integer, timestamptz)
  to service_role;

revoke all on function public.ct_paid_read_poll_budget(text, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_read_poll_budget(text, uuid, timestamptz)
  to service_role;
