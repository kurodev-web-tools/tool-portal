-- Comment Translator Paid Core v1 Gate 0-A: canonicalize the existing
-- Checkout recovery floor to whole seconds without changing existing holds.
-- Stripe returns whole-second expiry authority, so ceil the DB statement clock
-- beyond forty minutes while preserving any legitimate later caller target.

create or replace function public.ct_paid_checkout_hold_recovery_window_floor()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_floor_expires_at timestamptz := date_trunc('second', statement_timestamp())
    + interval '40 minutes 1 second';
begin
  if new.checkout_expires_at_target is null
    or new.checkout_expires_at_target < v_floor_expires_at
  then
    new.checkout_expires_at_target := v_floor_expires_at;
  end if;
  return new;
end;
$$;

alter function public.ct_paid_checkout_hold_recovery_window_floor()
  owner to postgres;

revoke all on function public.ct_paid_checkout_hold_recovery_window_floor()
  from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_checkout_hold_recovery_window_floor()
  to service_role;
