-- Comment Translator Paid Core v1 Gate 0-A: pull unbound Checkout work to an
-- immediate claim boundary and terminalize an already-expired unbound hold
-- without requiring a Stripe Session binding.
-- This is repository-side migration source only; remote apply is a separate gate.

create or replace function public.ct_paid_schedule_unbound_checkout_recovery()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_pull_forward boolean := false;
begin
  if tg_op = 'INSERT' then
    v_pull_forward := true;
  elsif old.reconcile_work_kind is distinct from 'unbound-checkout-session' then
    v_pull_forward := true;
  end if;

  if v_pull_forward
    and new.is_terminal = false
    and new.lifecycle_state in ('checkout_hold', 'incomplete')
    and (
      new.next_reconcile_at is null
      or new.next_reconcile_at > v_now
      or new.reconcile_work_kind is distinct from 'unbound-checkout-session'
    )
    and not exists (
      select 1
        from public.comment_translator_paid_checkout_session_bindings session_binding
       where session_binding.lifecycle_id = new.id
    )
    and not exists (
      select 1
        from public.comment_translator_paid_subscription_bindings subscription_binding
       where subscription_binding.lifecycle_id = new.id
    )
  then
    update public.comment_translator_paid_billing_lifecycles lifecycle
       set next_reconcile_at = case
             when lifecycle.next_reconcile_at is null or lifecycle.next_reconcile_at > v_now then v_now
             else lifecycle.next_reconcile_at
           end,
           reconcile_work_kind = 'unbound-checkout-session',
           updated_at = v_now
     where lifecycle.id = new.id
       and lifecycle.is_terminal = false
       and lifecycle.lifecycle_state in ('checkout_hold', 'incomplete')
       and (
         lifecycle.next_reconcile_at is null
         or lifecycle.next_reconcile_at > v_now
         or lifecycle.reconcile_work_kind is distinct from 'unbound-checkout-session'
       )
       and not exists (
         select 1
           from public.comment_translator_paid_checkout_session_bindings session_binding
          where session_binding.lifecycle_id = lifecycle.id
       )
       and not exists (
         select 1
           from public.comment_translator_paid_subscription_bindings subscription_binding
          where subscription_binding.lifecycle_id = lifecycle.id
       );
  end if;
  return new;
end;
$$;

drop trigger if exists comment_translator_paid_unbound_checkout_recovery_schedule
  on public.comment_translator_paid_billing_lifecycles;

-- Existing unbound rows are brought to the same immediate claim boundary when
-- this additive migration is applied. Bound Checkout/Subscription rows remain
-- on their immutable Stripe expiry reconciliation target.
update public.comment_translator_paid_billing_lifecycles lifecycle
   set reconcile_work_kind = 'unbound-checkout-session',
       next_reconcile_at = case
         when lifecycle.next_reconcile_at is null or lifecycle.next_reconcile_at > statement_timestamp()
           then statement_timestamp()
         else lifecycle.next_reconcile_at
       end,
       updated_at = statement_timestamp()
 where lifecycle.is_terminal = false
   and lifecycle.lifecycle_state in ('checkout_hold', 'incomplete')
   and not exists (
     select 1
       from public.comment_translator_paid_checkout_session_bindings session_binding
      where session_binding.lifecycle_id = lifecycle.id
   )
   and not exists (
     select 1
       from public.comment_translator_paid_subscription_bindings subscription_binding
      where subscription_binding.lifecycle_id = lifecycle.id
   );

create trigger comment_translator_paid_unbound_checkout_recovery_schedule
after insert or update on public.comment_translator_paid_billing_lifecycles
for each row execute function public.ct_paid_schedule_unbound_checkout_recovery();

create or replace function public.ct_paid_terminalize_unbound_checkout_hold(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_hold_id uuid,
  p_reconcile_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_capacity public.comment_translator_paid_capacity_reservations%rowtype;
  v_entitlement public.comment_translator_paid_entitlements%rowtype;
begin
  if p_lifecycle_id is null
    or p_owner_user_id is null
    or p_hold_id is null
    or p_reconcile_lease_token is null
  then
    raise exception 'unbound checkout hold terminalization request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290101);

  select * into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  select * into v_hold
    from public.comment_translator_paid_checkout_holds
   where id = p_hold_id
   for update;
  select * into v_capacity
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;
  select * into v_entitlement
    from public.comment_translator_paid_entitlements
   where lifecycle_id = p_lifecycle_id
   for update;

  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_lifecycle.is_terminal
    or v_lifecycle.lifecycle_state not in ('checkout_hold', 'incomplete')
    or v_lifecycle.reconcile_work_kind is distinct from 'unbound-checkout-session'
    or v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or v_lifecycle.reconcile_lease_until is null
    or not isfinite(v_lifecycle.reconcile_lease_until)
    or v_lifecycle.reconcile_lease_until <= v_now
    or v_hold.id is null
    or v_hold.lifecycle_id <> p_lifecycle_id
    or v_hold.owner_user_id <> p_owner_user_id
    or v_hold.hold_state <> 'held'
    or not isfinite(v_hold.checkout_expires_at_target)
    or v_capacity.id is null
    or v_capacity.lifecycle_id <> p_lifecycle_id
    or v_capacity.owner_user_id <> p_owner_user_id
    or v_capacity.reservation_state <> 'held'
    or v_capacity.lifecycle_stage <> 'checkout_hold'
  then
    raise exception 'unbound checkout hold terminalization binding conflict';
  end if;

  if exists (
    select 1
      from public.comment_translator_paid_checkout_session_bindings session_binding
     where session_binding.lifecycle_id = p_lifecycle_id
        or session_binding.hold_id = p_hold_id
  ) then
    raise exception 'Checkout Session binding prevents unbound hold terminalization';
  end if;
  if exists (
    select 1
      from public.comment_translator_paid_subscription_bindings subscription_binding
     where subscription_binding.lifecycle_id = p_lifecycle_id
  ) then
    raise exception 'Subscription binding prevents unbound hold terminalization';
  end if;
  if v_entitlement.id is not null then
    raise exception 'entitlement binding prevents unbound hold terminalization';
  end if;

  if v_hold.checkout_expires_at_target > v_now then
    return false;
  end if;

  update public.comment_translator_paid_checkout_holds
     set hold_state = 'released',
         released_at = v_now,
         updated_at = v_now
   where id = p_hold_id
     and lifecycle_id = p_lifecycle_id
     and owner_user_id = p_owner_user_id
     and hold_state = 'held';

  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = 'incomplete_expired',
         is_terminal = true,
         reconcile_work_kind = null,
         next_reconcile_at = null,
         last_reconcile_error_class = null,
         updated_at = v_now
   where id = p_lifecycle_id
     and owner_user_id = p_owner_user_id
     and is_terminal = false;

  update public.comment_translator_paid_capacity_reservations
     set reservation_state = 'released',
         released_at = v_now,
         updated_at = v_now
   where id = v_capacity.id
     and lifecycle_id = p_lifecycle_id
     and owner_user_id = p_owner_user_id
     and reservation_state = 'held';

  return true;
end;
$$;

revoke all on function public.ct_paid_terminalize_unbound_checkout_hold(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.ct_paid_terminalize_unbound_checkout_hold(uuid, uuid, uuid, uuid)
  to service_role;
