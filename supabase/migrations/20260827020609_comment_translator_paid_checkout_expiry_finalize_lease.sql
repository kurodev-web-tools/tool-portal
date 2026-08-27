-- Preserve a validated reconciler lease across the terminal Checkout expiry
-- action so the common reconciler finalizer remains the sole lease finalizer.
-- Direct service-role calls without lease authority keep the historical
-- lease-clearing behavior.

create or replace function public.ct_paid_expire_checkout_hold(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_hold_id uuid,
  p_stripe_session_status text,
  p_stripe_session_checked_at timestamptz,
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_session public.comment_translator_paid_checkout_session_bindings%rowtype;
  v_subscription public.comment_translator_paid_subscription_bindings%rowtype;
  v_entitlement public.comment_translator_paid_entitlements%rowtype;
  v_capacity public.comment_translator_paid_capacity_reservations%rowtype;
begin
  p_now := statement_timestamp();
  if p_owner_user_id is null
    or p_stripe_session_status is distinct from 'expired'
    or p_stripe_session_checked_at is null
    or not isfinite(p_stripe_session_checked_at)
    or p_stripe_session_checked_at > p_now
  then
    raise exception 'checkout session expiry confirmation is not valid';
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
  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_hold.id is null
    or v_hold.lifecycle_id <> p_lifecycle_id
    or v_hold.owner_user_id <> p_owner_user_id
  then
    raise exception 'checkout hold binding conflict';
  end if;
  if p_reconcile_lease_token is not null
    and (
      v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
      or v_lifecycle.reconcile_lease_until is null
      or v_lifecycle.reconcile_lease_until <= p_now
    )
  then
    raise exception 'stale reconcile lease token is not valid for checkout expiry';
  end if;
  if p_reconcile_lease_token is null
    and v_lifecycle.reconcile_lease_token is not null
    and v_lifecycle.reconcile_lease_until is not null
    and v_lifecycle.reconcile_lease_until > p_now
  then
    raise exception 'active reconcile lease token is required for checkout expiry';
  end if;
  select * into v_session
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_session.id is null
    or v_session.lifecycle_id <> p_lifecycle_id
    or v_session.hold_id <> p_hold_id
    or v_session.owner_user_id <> p_owner_user_id
    or v_session.customer_binding_id <> v_lifecycle.customer_binding_id
    or p_stripe_session_checked_at < greatest(v_session.stripe_expires_at, v_hold.checkout_expires_at_target)
  then
    raise exception 'checkout session binding conflict';
  end if;
  select * into v_subscription
    from public.comment_translator_paid_subscription_bindings
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_subscription.id is not null then
    raise exception 'subscription binding prevents checkout hold release';
  end if;
  select * into v_entitlement
    from public.comment_translator_paid_entitlements
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_entitlement.id is not null
    and v_entitlement.entitlement_status not in ('canceled', 'incomplete_expired', 'inactive')
  then
    raise exception 'nonterminal entitlement prevents checkout hold release';
  end if;
  if v_entitlement.id is not null
    and (
      v_entitlement.owner_user_id <> p_owner_user_id
      or v_entitlement.customer_binding_id <> v_lifecycle.customer_binding_id
      or v_entitlement.entitlement_status <> 'incomplete_expired'
      or v_entitlement.dispute_state <> 'none'
    )
  then
    raise exception 'entitlement binding prevents checkout hold release';
  end if;
  select * into v_capacity
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_hold.hold_state = 'released'
    and v_lifecycle.is_terminal
    and v_lifecycle.lifecycle_state = 'incomplete_expired'
    and v_capacity.reservation_state = 'released'
  then
    return true;
  end if;
  if v_lifecycle.is_terminal
    or v_hold.hold_state not in ('held', 'expire_required', 'converted')
    or v_capacity.id is null
    or v_capacity.owner_user_id <> p_owner_user_id
    or v_capacity.reservation_state not in ('held', 'consuming')
  then
    raise exception 'checkout hold release is not valid';
  end if;
  update public.comment_translator_paid_checkout_holds
     set hold_state = 'released', released_at = p_now, updated_at = p_now
   where id = p_hold_id;
  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = 'incomplete_expired', is_terminal = true,
         next_reconcile_at = null,
         reconcile_lease_until = case
           when p_reconcile_lease_token is null then null
           else reconcile_lease_until
         end,
         reconcile_lease_token = case
           when p_reconcile_lease_token is null then null
           else reconcile_lease_token
         end,
         last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id;
  update public.comment_translator_paid_capacity_reservations
     set reservation_state = 'released', released_at = p_now, updated_at = p_now
   where id = v_capacity.id;
  return true;
end;
$$;

revoke all on function public.ct_paid_expire_checkout_hold(uuid, uuid, uuid, text, timestamptz, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_expire_checkout_hold(uuid, uuid, uuid, text, timestamptz, uuid, timestamptz)
  to service_role;
