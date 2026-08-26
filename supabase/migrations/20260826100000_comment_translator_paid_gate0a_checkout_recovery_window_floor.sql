-- Comment Translator Paid Core v1 Gate 0-A: keep an unbound Checkout hold
-- recoverable across the existing five-minute scheduler and thirty-minute
-- recovery guard without changing existing holds or the caller's later target.
-- This is repository-side migration source only; remote apply is a separate gate.

create or replace function public.ct_paid_checkout_hold_recovery_window_floor()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_floor_expires_at timestamptz := statement_timestamp() + interval '40 minutes';
begin
  if new.checkout_expires_at_target is null
    or new.checkout_expires_at_target < v_floor_expires_at
  then
    new.checkout_expires_at_target := v_floor_expires_at;
  end if;
  return new;
end;
$$;

drop trigger if exists comment_translator_paid_checkout_hold_recovery_window_floor
  on public.comment_translator_paid_checkout_holds;

create trigger comment_translator_paid_checkout_hold_recovery_window_floor
before insert on public.comment_translator_paid_checkout_holds
for each row execute function public.ct_paid_checkout_hold_recovery_window_floor();

revoke all on function public.ct_paid_checkout_hold_recovery_window_floor()
  from public, anon, authenticated;
grant execute on function public.ct_paid_checkout_hold_recovery_window_floor()
  to service_role;
