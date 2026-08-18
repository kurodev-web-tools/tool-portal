-- Gate 0-A repair: retain the Task 7 poll-budget RPC contract while making
-- both UTC-day predicates explicit. The original function's RETURNS TABLE
-- output variable is also named utc_day, so unqualified table predicates are
-- ambiguous in PL/pgSQL.
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
    from public.comment_translator_paid_poll_reservations reservation
   where reservation.session_reference_id = p_session_reference_id
     and reservation.utc_day = v_utc_day
   limit 1;
  if v_reservation.id is not null and v_reservation.owner_user_id <> p_owner_user_id then
    raise exception 'poll reservation owner binding conflict';
  end if;

  select *
    into v_bucket
    from public.comment_translator_paid_poll_budget_buckets bucket
   where bucket.utc_day = v_utc_day
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

revoke all on function public.ct_paid_read_poll_budget(text, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_read_poll_budget(text, uuid, timestamptz)
  to service_role;
