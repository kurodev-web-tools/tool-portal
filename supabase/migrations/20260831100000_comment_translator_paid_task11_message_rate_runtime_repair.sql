-- Task 11: PostgreSQL 17 runtime repair for the Paid message-rate RPC.
-- The historical Task 7 migration remains applied as-is on existing targets;
-- this additive replacement preserves its RPC shape and privileges while
-- removing output-column ambiguity from bucket writes and conflict targets.

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

  perform pg_advisory_xact_lock(hashtextextended(p_reservation_key, 47290113));

  if exists (
    select 1
      from public.comment_translator_paid_message_rate_reservation_tombstones as rate_tombstone
     where rate_tombstone.reservation_key = p_reservation_key
       and rate_tombstone.expires_at > v_now
  ) then
    raise exception 'Paid message-rate reservation key is no longer available';
  end if;

  select *
    into v_session
    from public.comment_translator_sessions as paid_session
   where paid_session.owner_user_id = p_owner_user_id
     and paid_session.session_reference_id = p_session_reference_id
     and paid_session.status = 'active'
     and paid_session.plan = 'paid'
   for update;
  if v_session.id is null or v_now >= v_session.started_at + interval '3 hours' then
    raise exception 'Paid message-rate session authority is unreadable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':' || v_minute_start::text, 47290107));

  select *
    into v_reservation
    from public.comment_translator_paid_message_rate_reservations as rate_reservation
   where rate_reservation.reservation_key = p_reservation_key
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
    if v_reservation.reservation_state = 'committed' then
      select *
        into v_bucket
        from public.comment_translator_paid_message_rate_buckets as rate_bucket
       where rate_bucket.owner_user_id = p_owner_user_id
         and rate_bucket.minute_start = v_reservation.minute_start;
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
        from public.comment_translator_paid_message_rate_buckets as rate_bucket
       where rate_bucket.owner_user_id = p_owner_user_id
         and rate_bucket.minute_start = v_reservation.minute_start;
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
    insert into public.comment_translator_paid_message_rate_buckets as rate_bucket (owner_user_id, minute_start, updated_at, expires_at)
    values (p_owner_user_id, v_minute_start, v_now, v_minute_start + interval '2 minutes')
    on conflict on constraint comment_translator_paid_message_rate_buckets_pkey do nothing;
    select *
      into v_bucket
      from public.comment_translator_paid_message_rate_buckets as rate_bucket
     where rate_bucket.owner_user_id = p_owner_user_id
       and rate_bucket.minute_start = v_minute_start
     for update;
    v_used := v_bucket.reserved_messages + v_bucket.committed_messages;
    if v_used + p_message_count > 60 then
      return query
        select 'rate-limited', v_minute_start, 0, 0, 0, greatest(0, 60 - v_used);
      return;
    end if;
    update public.comment_translator_paid_message_rate_reservations as rate_reservation
       set session_reference_id = p_session_reference_id,
           minute_start = v_minute_start,
           reserved_messages = p_message_count,
           committed_messages = 0,
           successful_message_count = 0,
           reservation_state = 'reserved',
           updated_at = v_now,
           expires_at = least(v_session.started_at + interval '3 hours' + interval '24 hours', v_now + interval '27 hours')
     where rate_reservation.reservation_key = p_reservation_key;
    update public.comment_translator_paid_message_rate_buckets as rate_bucket
       set reserved_messages = rate_bucket.reserved_messages + p_message_count,
           updated_at = v_now
     where rate_bucket.owner_user_id = p_owner_user_id
       and rate_bucket.minute_start = v_minute_start;
    return query
      select 'reserved', v_minute_start, p_message_count, 0, 0, 60 - v_used - p_message_count;
    return;
  end if;

  insert into public.comment_translator_paid_message_rate_buckets as rate_bucket (owner_user_id, minute_start, updated_at, expires_at)
  values (p_owner_user_id, v_minute_start, v_now, v_minute_start + interval '2 minutes')
  on conflict on constraint comment_translator_paid_message_rate_buckets_pkey do nothing;
  select *
    into v_bucket
    from public.comment_translator_paid_message_rate_buckets as rate_bucket
   where rate_bucket.owner_user_id = p_owner_user_id
     and rate_bucket.minute_start = v_minute_start
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
  update public.comment_translator_paid_message_rate_buckets as rate_bucket
     set reserved_messages = rate_bucket.reserved_messages + p_message_count,
         updated_at = v_now
   where rate_bucket.owner_user_id = p_owner_user_id
     and rate_bucket.minute_start = v_minute_start;
  return query
    select 'reserved', v_minute_start, p_message_count, 0, 0, 60 - v_used - p_message_count;
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
    from public.comment_translator_sessions as paid_session
   where paid_session.owner_user_id = p_owner_user_id
     and paid_session.session_reference_id = p_session_reference_id
     and paid_session.status = 'active'
     and paid_session.plan = 'paid'
   for update;
  if v_session.id is null or v_now >= v_session.started_at + interval '3 hours' then
    raise exception 'Paid message-rate finalize session authority is unreadable';
  end if;

  select *
    into v_reservation
    from public.comment_translator_paid_message_rate_reservations as rate_reservation
   where rate_reservation.reservation_key = p_reservation_key
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

  update public.comment_translator_paid_message_rate_buckets as rate_bucket
     set reserved_messages = rate_bucket.reserved_messages - v_reservation.reserved_messages,
         committed_messages = rate_bucket.committed_messages + v_commit_count,
         updated_at = v_now
   where rate_bucket.owner_user_id = p_owner_user_id
     and rate_bucket.minute_start = v_reservation.minute_start
     and rate_bucket.reserved_messages >= v_reservation.reserved_messages;
  if not found then
    raise exception 'Paid message-rate bucket is unreadable';
  end if;
  update public.comment_translator_paid_message_rate_reservations as rate_reservation
     set committed_messages = v_commit_count,
         reservation_state = case when v_commit_count = 0 then 'released' else 'committed' end,
         updated_at = v_now
   where rate_reservation.reservation_key = p_reservation_key;
  return query
    select
      case when v_commit_count = 0 then 'released' else 'committed' end,
      v_reservation.minute_start,
      v_reservation.reserved_messages,
      v_commit_count,
      v_reservation.reserved_messages - v_commit_count;
end;
$$;
