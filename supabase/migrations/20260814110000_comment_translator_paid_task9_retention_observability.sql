-- Comment Translator Paid Core v1 Task 9: bounded retention and sanitized
-- observability. This file is repository-side migration source only. It is not
-- applied to a remote Supabase project by this task.
--
-- Scheduler contract: an existing Supabase Cron is the standard authority and
-- calls the bounded cleanup RPC below. Only an environment that cannot use its
-- existing Supabase Cron may call the same RPC from its existing Cloudflare
-- Cron. The two surfaces are not co-authorities and no new scheduler, queue,
-- Durable Object, or paid service is introduced here.

alter table public.comment_translator_paid_billing_lifecycles
  add column if not exists reconcile_work_kind text,
  add column if not exists paid_unentitled_operator_disposition text;

create table if not exists public.comment_translator_paid_maintenance_work_items (
  id uuid primary key,
  singleton_key text not null unique check (singleton_key = 'utc-month-cost-rollover'),
  work_kind text not null check (work_kind = 'utc-month-cost-rollover'),
  next_reconcile_at timestamptz not null,
  reconcile_lease_token uuid,
  reconcile_lease_until timestamptz,
  reconcile_attempt_count integer not null default 0 check (reconcile_attempt_count >= 0),
  reconcile_backoff_seconds integer not null default 60 check (reconcile_backoff_seconds in (60, 300, 900, 3600, 21600)),
  last_reconcile_error_class text,
  updated_at timestamptz not null default now()
);

alter table public.comment_translator_paid_maintenance_work_items enable row level security;
revoke all on table public.comment_translator_paid_maintenance_work_items from public, anon, authenticated;

insert into public.comment_translator_paid_maintenance_work_items (
  id,
  singleton_key,
  work_kind,
  next_reconcile_at
) values (
  '00000000-0000-4000-8000-000000000009'::uuid,
  'utc-month-cost-rollover',
  'utc-month-cost-rollover',
  statement_timestamp()
)
on conflict (singleton_key) do nothing;

-- Task 9 recovery can create a Checkout Session while an unbound lifecycle is
-- already incomplete. Preserve the Task 2 marker signature and safety checks,
-- while allowing that state only when no Subscription binding exists.
create or replace function public.ct_paid_mark_checkout_expire_required(
  p_owner_user_id uuid,
  p_lifecycle_id uuid,
  p_hold_id uuid,
  p_customer_binding_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text,
  p_stripe_expires_at timestamptz,
  p_idempotency_key text,
  p_checkout_expires_at_target timestamptz,
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
  v_customer public.comment_translator_paid_customers%rowtype;
  v_capacity public.comment_translator_paid_capacity_reservations%rowtype;
  v_session public.comment_translator_paid_checkout_session_bindings%rowtype;
  v_subscription public.comment_translator_paid_subscription_bindings%rowtype;
begin
  p_now := statement_timestamp();
  if p_stripe_checkout_session_id is null
    or length(trim(p_stripe_checkout_session_id)) = 0
    or p_stripe_customer_id is null
    or length(trim(p_stripe_customer_id)) = 0
    or p_stripe_expires_at is null
    or not isfinite(p_stripe_expires_at)
    or p_idempotency_key is null
    or length(trim(p_idempotency_key)) = 0
    or p_checkout_expires_at_target is null
    or not isfinite(p_checkout_expires_at_target)
  then
    raise exception 'checkout expire-required request is not valid';
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
  select * into v_customer
    from public.comment_translator_paid_customers
   where id = p_customer_binding_id
   for update;
  select * into v_capacity
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;
  select * into v_session
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
      or hold_id = p_hold_id
   order by created_at
   limit 1
   for update;
  select * into v_subscription
    from public.comment_translator_paid_subscription_bindings
   where lifecycle_id = p_lifecycle_id
   limit 1
   for update;

  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_lifecycle.customer_binding_id <> p_customer_binding_id
    or v_lifecycle.is_terminal
    or v_lifecycle.lifecycle_state not in ('checkout_hold', 'incomplete', 'expire_required')
    or v_hold.id is null
    or v_hold.lifecycle_id <> p_lifecycle_id
    or v_hold.owner_user_id <> p_owner_user_id
    or v_hold.idempotency_key is distinct from p_idempotency_key
    or v_hold.checkout_expires_at_target is distinct from p_checkout_expires_at_target
    or v_hold.hold_state not in ('held', 'expire_required')
    or v_customer.id is null
    or v_customer.owner_user_id <> p_owner_user_id
    or v_customer.stripe_customer_id <> p_stripe_customer_id
    or v_capacity.id is null
    or v_capacity.owner_user_id <> p_owner_user_id
    or v_capacity.reservation_state <> 'held'
    or v_subscription.id is not null
  then
    raise exception 'checkout expire-required binding conflict';
  end if;
  if v_session.id is not null then
    if v_session.lifecycle_id <> p_lifecycle_id
      or v_session.hold_id <> p_hold_id
      or v_session.owner_user_id <> p_owner_user_id
      or v_session.customer_binding_id <> p_customer_binding_id
      or v_session.stripe_checkout_session_id <> p_stripe_checkout_session_id
      or v_session.stripe_customer_id <> p_stripe_customer_id
      or v_session.stripe_expires_at is distinct from p_stripe_expires_at
    then
      raise exception 'checkout expire-required binding conflict';
    end if;
  else
    insert into public.comment_translator_paid_checkout_session_bindings (
      lifecycle_id, hold_id, owner_user_id, customer_binding_id,
      stripe_checkout_session_id, stripe_customer_id, stripe_expires_at, created_at
    ) values (
      p_lifecycle_id, p_hold_id, p_owner_user_id, p_customer_binding_id,
      p_stripe_checkout_session_id, p_stripe_customer_id, p_stripe_expires_at, p_now
    );
  end if;
  if v_lifecycle.lifecycle_state = 'expire_required'
    and v_hold.hold_state = 'expire_required'
  then
    return true;
  end if;
  if v_lifecycle.lifecycle_state not in ('checkout_hold', 'incomplete')
    or v_hold.hold_state <> 'held'
  then
    raise exception 'checkout expire-required transition is not valid';
  end if;

  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = 'expire_required',
         next_reconcile_at = p_now,
         updated_at = p_now
   where id = p_lifecycle_id;
  update public.comment_translator_paid_checkout_holds
     set hold_state = 'expire_required',
         updated_at = p_now
   where id = p_hold_id;
  return true;
end;
$$;

revoke all on function public.ct_paid_mark_checkout_expire_required(uuid, uuid, uuid, uuid, text, text, timestamptz, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_mark_checkout_expire_required(uuid, uuid, uuid, uuid, text, text, timestamptz, text, timestamptz, timestamptz)
  to service_role;

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_constraint
     where conrelid = 'public.comment_translator_paid_billing_lifecycles'::regclass
       and conname = 'comment_translator_paid_reconcile_work_kind_check'
  ) then
    alter table public.comment_translator_paid_billing_lifecycles
      add constraint comment_translator_paid_reconcile_work_kind_check check (
        reconcile_work_kind is null
        or reconcile_work_kind in (
          'checkout-expiry',
          'unbound-checkout-session',
          'payment-failure-seven-day',
          'cancel-pending',
          'refund-reconciliation',
          'dispute-reconciliation',
          'paid-unentitled-reconciliation',
          'billing-period-rollover',
          'utc-month-cost-rollover'
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_constraint
     where conrelid = 'public.comment_translator_paid_billing_lifecycles'::regclass
       and conname = 'comment_translator_paid_unentitled_operator_disposition_check'
  ) then
    alter table public.comment_translator_paid_billing_lifecycles
      add constraint comment_translator_paid_unentitled_operator_disposition_check check (
        paid_unentitled_operator_disposition is null
        or paid_unentitled_operator_disposition in ('refund-cancel', 'capacity-correction-approved')
      );
  end if;
end;
$$;

create or replace function public.ct_paid_schedule_durable_reconciliation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_state_work_kind text;
  v_has_checkout_binding boolean := false;
  v_has_subscription_binding boolean := false;
  v_has_due_billing_period boolean := false;
begin
  if new.is_terminal then
    return new;
  end if;

  if new.lifecycle_state in ('checkout_hold', 'incomplete') then
    select exists (
      select 1
        from public.comment_translator_paid_checkout_session_bindings session_binding
       where session_binding.lifecycle_id = new.id
    ) into v_has_checkout_binding;
    select exists (
      select 1
        from public.comment_translator_paid_subscription_bindings subscription_binding
       where subscription_binding.lifecycle_id = new.id
    ) into v_has_subscription_binding;
  end if;
  if new.lifecycle_state in ('active', 'cancel_at_period_end') then
    select exists (
      select 1
        from public.comment_translator_paid_entitlements entitlement
       where entitlement.lifecycle_id = new.id
         and entitlement.current_period_end <= statement_timestamp()
         and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
    ) into v_has_due_billing_period;
  end if;

  v_state_work_kind := case
    when new.lifecycle_state = 'expire_required' then 'checkout-expiry'
    when new.lifecycle_state in ('checkout_hold', 'incomplete')
      and not v_has_checkout_binding
      and not v_has_subscription_binding
      then 'unbound-checkout-session'
    when new.lifecycle_state in ('checkout_hold', 'incomplete') then 'checkout-expiry'
    when new.lifecycle_state in ('past_due', 'unpaid')
      and new.payment_failure_started_at is not null
      and new.payment_failure_started_at <= statement_timestamp() - interval '7 days'
      then 'payment-failure-seven-day'
    when new.lifecycle_state = 'cancel_pending' then 'cancel-pending'
    when new.lifecycle_state = 'refund_reconciliation' then 'refund-reconciliation'
    when new.lifecycle_state in ('dispute', 'dispute_reconciliation') then 'dispute-reconciliation'
    when new.lifecycle_state = 'paid_unentitled_reconciliation'
      and new.paid_unentitled_operator_disposition is not null
      then 'paid-unentitled-reconciliation'
    when new.lifecycle_state in ('active', 'cancel_at_period_end') and v_has_due_billing_period
      then 'billing-period-rollover'
    else null
  end;

  if v_state_work_kind is not null then
    new.reconcile_work_kind := v_state_work_kind;
    new.next_reconcile_at := coalesce(new.next_reconcile_at, statement_timestamp());
  else
    -- A recovered or otherwise incompatible lifecycle must not inherit stale
    -- checkout, payment-failure, or Paid-stopping work.
    new.reconcile_work_kind := null;
    new.next_reconcile_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists comment_translator_paid_durable_reconcile_schedule
  on public.comment_translator_paid_billing_lifecycles;
create trigger comment_translator_paid_durable_reconcile_schedule
before insert or update on public.comment_translator_paid_billing_lifecycles
for each row execute function public.ct_paid_schedule_durable_reconciliation();

with authoritative_backfill as (
  select
    lifecycle.id,
    case
      when lifecycle.lifecycle_state = 'expire_required' then 'checkout-expiry'
      when lifecycle.lifecycle_state in ('checkout_hold', 'incomplete')
        and not exists (
          select 1
            from public.comment_translator_paid_checkout_session_bindings session_binding
           where session_binding.lifecycle_id = lifecycle.id
        )
        and not exists (
          select 1
            from public.comment_translator_paid_subscription_bindings subscription_binding
           where subscription_binding.lifecycle_id = lifecycle.id
        ) then 'unbound-checkout-session'
      when lifecycle.lifecycle_state in ('checkout_hold', 'incomplete') then 'checkout-expiry'
      when lifecycle.lifecycle_state in ('past_due', 'unpaid')
        and lifecycle.payment_failure_started_at is not null
        and lifecycle.payment_failure_started_at <= statement_timestamp() - interval '7 days'
        then 'payment-failure-seven-day'
      when lifecycle.lifecycle_state = 'cancel_pending' then 'cancel-pending'
      when lifecycle.lifecycle_state = 'refund_reconciliation' then 'refund-reconciliation'
      when lifecycle.lifecycle_state in ('dispute', 'dispute_reconciliation') then 'dispute-reconciliation'
      when lifecycle.lifecycle_state = 'paid_unentitled_reconciliation'
        and lifecycle.paid_unentitled_operator_disposition is not null
        then 'paid-unentitled-reconciliation'
      when lifecycle.lifecycle_state in ('active', 'cancel_at_period_end')
        and exists (
          select 1
            from public.comment_translator_paid_entitlements entitlement
           where entitlement.lifecycle_id = lifecycle.id
             and entitlement.current_period_end <= statement_timestamp()
             and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
        ) then 'billing-period-rollover'
      else null
    end as resolved_work_kind
    from public.comment_translator_paid_billing_lifecycles lifecycle
   where lifecycle.is_terminal = false
)
update public.comment_translator_paid_billing_lifecycles lifecycle
   set reconcile_work_kind = authoritative_backfill.resolved_work_kind,
       next_reconcile_at = case
         when authoritative_backfill.resolved_work_kind is null then null
         else coalesce(lifecycle.next_reconcile_at, statement_timestamp())
       end,
       updated_at = statement_timestamp()
  from authoritative_backfill
 where lifecycle.id = authoritative_backfill.id
   and (
     lifecycle.reconcile_work_kind is distinct from authoritative_backfill.resolved_work_kind
     or (
       authoritative_backfill.resolved_work_kind is not null
       and lifecycle.next_reconcile_at is null
     )
     or (
       authoritative_backfill.resolved_work_kind is null
       and lifecycle.next_reconcile_at is not null
     )
   );

create index if not exists comment_translator_paid_reconcile_work_kind_due_idx
  on public.comment_translator_paid_billing_lifecycles (reconcile_work_kind, next_reconcile_at, reconcile_lease_until)
  where is_terminal = false and next_reconcile_at is not null;

drop function if exists public.ct_paid_claim_reconciler(timestamptz, integer);

create function public.ct_paid_claim_reconciler(
  p_now timestamptz default now(),
  p_limit integer default 50
)
returns table (
  lifecycle_id uuid,
  reconcile_lease_token uuid,
  reconcile_lease_until timestamptz,
  work_kind text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  return query
  with lifecycle_candidates as (
    select
      lifecycle.id,
      case
        when lifecycle.lifecycle_state = 'expire_required' then 'checkout-expiry'
        when lifecycle.lifecycle_state in ('checkout_hold', 'incomplete')
          and not exists (
            select 1
              from public.comment_translator_paid_checkout_session_bindings session_binding
             where session_binding.lifecycle_id = lifecycle.id
          )
          and not exists (
            select 1
              from public.comment_translator_paid_subscription_bindings subscription_binding
             where subscription_binding.lifecycle_id = lifecycle.id
          ) then 'unbound-checkout-session'
        when lifecycle.lifecycle_state in ('checkout_hold', 'incomplete') then 'checkout-expiry'
        when lifecycle.lifecycle_state in ('past_due', 'unpaid')
          and lifecycle.payment_failure_started_at is not null
          and lifecycle.payment_failure_started_at <= p_now - interval '7 days' then 'payment-failure-seven-day'
        when lifecycle.lifecycle_state = 'cancel_pending' then 'cancel-pending'
        when lifecycle.lifecycle_state = 'refund_reconciliation' then 'refund-reconciliation'
        when lifecycle.lifecycle_state in ('dispute', 'dispute_reconciliation') then 'dispute-reconciliation'
        when lifecycle.lifecycle_state = 'paid_unentitled_reconciliation'
          and lifecycle.paid_unentitled_operator_disposition is not null
          then 'paid-unentitled-reconciliation'
        when exists (
          select 1
            from public.comment_translator_paid_entitlements entitlement
           where entitlement.lifecycle_id = lifecycle.id
             and entitlement.current_period_end <= p_now
             and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
        ) then 'billing-period-rollover'
        else null
      end as resolved_work_kind
      from public.comment_translator_paid_billing_lifecycles lifecycle
     where lifecycle.is_terminal = false
       and (lifecycle.reconcile_lease_until is null or lifecycle.reconcile_lease_until <= p_now)
       and (
         lifecycle.next_reconcile_at is null
         or lifecycle.next_reconcile_at <= p_now
         or exists (
           select 1
             from public.comment_translator_paid_entitlements entitlement
            where entitlement.lifecycle_id = lifecycle.id
              and entitlement.current_period_end <= p_now
              and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
         )
       )
       and case
         when lifecycle.lifecycle_state = 'expire_required' then true
         when lifecycle.lifecycle_state in ('checkout_hold', 'incomplete') then true
         when lifecycle.lifecycle_state in ('past_due', 'unpaid') then
           lifecycle.payment_failure_started_at is not null
           and lifecycle.payment_failure_started_at <= p_now - interval '7 days'
         when lifecycle.lifecycle_state in (
           'cancel_pending', 'refund_reconciliation', 'dispute',
           'dispute_reconciliation'
         ) then true
         when lifecycle.lifecycle_state = 'paid_unentitled_reconciliation'
           then lifecycle.paid_unentitled_operator_disposition is not null
         when lifecycle.lifecycle_state in ('active', 'cancel_at_period_end') then exists (
           select 1
             from public.comment_translator_paid_entitlements entitlement
            where entitlement.lifecycle_id = lifecycle.id
              and entitlement.current_period_end <= p_now
              and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
         )
         else false
       end
     order by lifecycle.next_reconcile_at nulls first, lifecycle.created_at
     for update skip locked
     -- Reserve one place in the same max-50 lease batch so the singleton UTC
     -- rollover cannot be starved by a continuously full lifecycle backlog.
     limit greatest(least(greatest(coalesce(p_limit, 50), 0), 50) - 1, 0)
  ), claimed_lifecycles as (
    update public.comment_translator_paid_billing_lifecycles lifecycle
       set reconcile_lease_token = gen_random_uuid(),
           reconcile_lease_until = p_now + interval '120 seconds',
           reconcile_attempt_count = lifecycle.reconcile_attempt_count + 1,
           reconcile_work_kind = lifecycle_candidates.resolved_work_kind,
           updated_at = p_now
      from lifecycle_candidates
     where lifecycle.id = lifecycle_candidates.id
     returning lifecycle.id, lifecycle.reconcile_lease_token, lifecycle.reconcile_lease_until, lifecycle.reconcile_work_kind
  ), maintenance_candidates as (
    select work_item.id
      from public.comment_translator_paid_maintenance_work_items work_item
     where work_item.next_reconcile_at <= p_now
       and (work_item.reconcile_lease_until is null or work_item.reconcile_lease_until <= p_now)
     order by work_item.next_reconcile_at, work_item.id
     for update skip locked
     limit greatest(
       least(greatest(coalesce(p_limit, 50), 0), 50) - (select count(*) from claimed_lifecycles),
       0
     )
  ), claimed_maintenance as (
    update public.comment_translator_paid_maintenance_work_items work_item
       set reconcile_lease_token = gen_random_uuid(),
           reconcile_lease_until = p_now + interval '120 seconds',
           reconcile_attempt_count = work_item.reconcile_attempt_count + 1,
           updated_at = p_now
      from maintenance_candidates
     where work_item.id = maintenance_candidates.id
     returning work_item.id, work_item.reconcile_lease_token, work_item.reconcile_lease_until, work_item.work_kind
  )
  select claimed.id, claimed.reconcile_lease_token, claimed.reconcile_lease_until, claimed.reconcile_work_kind
    from claimed_lifecycles claimed
  union all
  select claimed.id, claimed.reconcile_lease_token, claimed.reconcile_lease_until, claimed.work_kind
    from claimed_maintenance claimed;
end;
$$;

revoke all on function public.ct_paid_claim_reconciler(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.ct_paid_claim_reconciler(timestamptz, integer)
  to service_role;

create or replace function public.ct_paid_set_paid_unentitled_operator_disposition(
  p_lifecycle_id uuid,
  p_operator_disposition text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  if p_operator_disposition not in ('refund-cancel', 'capacity-correction-approved') then
    raise exception 'Paid unentitled operator disposition is not valid';
  end if;
  update public.comment_translator_paid_billing_lifecycles
     set paid_unentitled_operator_disposition = p_operator_disposition,
         reconcile_work_kind = 'paid-unentitled-reconciliation',
         next_reconcile_at = p_now,
         last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and lifecycle_state = 'paid_unentitled_reconciliation'
     and is_terminal = false
     and paid_unentitled_operator_disposition is null;
  if not found then
    raise exception 'Paid unentitled lifecycle is not eligible for operator disposition';
  end if;
  return true;
end;
$$;

revoke all on function public.ct_paid_set_paid_unentitled_operator_disposition(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_set_paid_unentitled_operator_disposition(uuid, text, timestamptz)
  to service_role;

create or replace function public.ct_paid_apply_paid_unentitled_disposition(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_customer_binding_id uuid,
  p_subscription_binding_id uuid,
  p_product_id text,
  p_price_id text,
  p_entitlement_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_dispute_state text,
  p_projection_lease_token uuid,
  p_reconcile_lease_token uuid,
  p_operator_disposition text,
  p_lifecycle_state text,
  p_subscription_status text,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_entitlement_id uuid;
begin
  p_now := statement_timestamp();
  if p_operator_disposition not in ('refund-cancel', 'capacity-correction-approved') then
    raise exception 'Paid unentitled operator disposition is not valid';
  end if;
  if p_operator_disposition = 'capacity-correction-approved' and not (
    (
      p_entitlement_status is not distinct from 'active'
      and p_lifecycle_state is not distinct from 'active'
      and p_subscription_status is not distinct from 'active'
    )
    or (
      p_entitlement_status is not distinct from 'cancel_at_period_end'
      and p_lifecycle_state is not distinct from 'cancel_at_period_end'
      and p_subscription_status is not distinct from 'active'
    )
  ) then
    raise exception 'Capacity correction must project the validated current Paid state';
  end if;
  if p_operator_disposition = 'refund-cancel' and (
    p_entitlement_status is distinct from 'canceled'
    or p_lifecycle_state is distinct from 'canceled'
    or p_subscription_status is distinct from 'canceled'
  ) then
    raise exception 'Refund cancellation must project the validated canceled state';
  end if;

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
     and owner_user_id = p_owner_user_id
   for update;
  if v_lifecycle.id is null
    or v_lifecycle.lifecycle_state <> 'paid_unentitled_reconciliation'
    or v_lifecycle.is_terminal
    or v_lifecycle.reconcile_work_kind <> 'paid-unentitled-reconciliation'
    or v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or v_lifecycle.reconcile_lease_until is null
    or v_lifecycle.reconcile_lease_until <= p_now
    or v_lifecycle.paid_unentitled_operator_disposition is distinct from p_operator_disposition
  then
    raise exception 'Paid unentitled disposition or reconcile lease is stale';
  end if;

  v_entitlement_id := public.ct_paid_project_entitlement(
    p_lifecycle_id => p_lifecycle_id,
    p_owner_user_id => p_owner_user_id,
    p_customer_binding_id => p_customer_binding_id,
    p_subscription_binding_id => p_subscription_binding_id,
    p_product_id => p_product_id,
    p_price_id => p_price_id,
    p_entitlement_status => p_entitlement_status,
    p_current_period_start => p_current_period_start,
    p_current_period_end => p_current_period_end,
    p_cancel_at_period_end => p_cancel_at_period_end,
    p_dispute_state => p_dispute_state,
    p_projection_lease_token => p_projection_lease_token,
    p_reconcile_lease_token => p_reconcile_lease_token,
    p_now => p_now,
    p_lifecycle_state => p_lifecycle_state,
    p_subscription_status => p_subscription_status
  );

  update public.comment_translator_paid_billing_lifecycles
     set paid_unentitled_operator_disposition = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and paid_unentitled_operator_disposition = p_operator_disposition;
  if not found then
    raise exception 'Paid unentitled operator disposition was not consumed';
  end if;
  return v_entitlement_id;
end;
$$;

revoke all on function public.ct_paid_apply_paid_unentitled_disposition(
  uuid, uuid, uuid, uuid, text, text, text, timestamptz, timestamptz,
  boolean, text, uuid, uuid, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.ct_paid_apply_paid_unentitled_disposition(
  uuid, uuid, uuid, uuid, text, text, text, timestamptz, timestamptz,
  boolean, text, uuid, uuid, text, text, text, timestamptz
) to service_role;

create or replace function public.ct_paid_assert_reconcile_lease_active(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_work_kind text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := statement_timestamp();
begin
  if p_work_kind is not null and p_work_kind not in (
    'checkout-expiry',
    'unbound-checkout-session',
    'payment-failure-seven-day',
    'cancel-pending',
    'refund-reconciliation',
    'dispute-reconciliation',
    'paid-unentitled-reconciliation',
    'billing-period-rollover',
    'utc-month-cost-rollover'
  ) then
    return false;
  end if;

  if p_work_kind is null then
    return exists (
      select 1
        from public.comment_translator_paid_billing_lifecycles
       where id = p_lifecycle_id
         and reconcile_work_kind is not null
         and reconcile_lease_token = p_reconcile_lease_token
         and reconcile_lease_until > v_now
    ) or exists (
      select 1
        from public.comment_translator_paid_maintenance_work_items
       where id = p_lifecycle_id
         and work_kind is not null
         and reconcile_lease_token = p_reconcile_lease_token
         and reconcile_lease_until > v_now
    );
  end if;

  if p_work_kind = 'utc-month-cost-rollover' then
    return exists (
      select 1
        from public.comment_translator_paid_maintenance_work_items
       where id = p_lifecycle_id
         and work_kind = p_work_kind
         and reconcile_lease_token = p_reconcile_lease_token
         and reconcile_lease_until > v_now
    );
  end if;

  return exists (
    select 1
      from public.comment_translator_paid_billing_lifecycles
     where id = p_lifecycle_id
       and reconcile_work_kind = p_work_kind
       and reconcile_lease_token = p_reconcile_lease_token
       and reconcile_lease_until > v_now
  );
end;
$$;

revoke all on function public.ct_paid_assert_reconcile_lease_active(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.ct_paid_assert_reconcile_lease_active(uuid, uuid, text)
  to service_role;

create or replace function public.ct_paid_finalize_reconciler(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_next_reconcile_at timestamptz default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  update public.comment_translator_paid_billing_lifecycles
     set reconcile_lease_until = null,
         reconcile_lease_token = null,
         reconcile_work_kind = null,
         reconcile_attempt_count = 0,
         next_reconcile_at = p_next_reconcile_at,
         reconcile_backoff_seconds = 60,
         last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now;

  if found then
    return true;
  end if;

  update public.comment_translator_paid_maintenance_work_items
     set reconcile_lease_until = null,
         reconcile_lease_token = null,
         reconcile_attempt_count = 0,
         next_reconcile_at = coalesce(p_next_reconcile_at, next_reconcile_at),
         reconcile_backoff_seconds = 60,
         last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now;

  if not found then raise exception 'stale reconcile lease token is not valid for update'; end if;
  return true;
end;
$$;

revoke all on function public.ct_paid_finalize_reconciler(uuid, uuid, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_finalize_reconciler(uuid, uuid, timestamptz, timestamptz)
  to service_role;

create or replace function public.ct_paid_retry_reconciler(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_error_class text,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_next_backoff integer;
begin
  p_now := statement_timestamp();
  if p_error_class not in (
    'object-retrieval-failed', 'database-transaction-failed', 'external-action-failed',
    'binding-not-ready', 'capacity-reconciliation-failed', 'period-reconciliation-failed'
  ) then raise exception 'error class is not valid'; end if;

  update public.comment_translator_paid_billing_lifecycles
     set reconcile_backoff_seconds = case
           when reconcile_attempt_count <= 1 then 60 when reconcile_attempt_count = 2 then 300
           when reconcile_attempt_count = 3 then 900 when reconcile_attempt_count = 4 then 3600 else 21600 end,
         next_reconcile_at = p_now + make_interval(secs => case
           when reconcile_attempt_count <= 1 then 60 when reconcile_attempt_count = 2 then 300
           when reconcile_attempt_count = 3 then 900 when reconcile_attempt_count = 4 then 3600 else 21600 end),
         reconcile_lease_until = null,
         reconcile_lease_token = null,
         last_reconcile_error_class = p_error_class,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
   returning reconcile_backoff_seconds into v_next_backoff;
  if found then return v_next_backoff; end if;

  update public.comment_translator_paid_maintenance_work_items
     set reconcile_backoff_seconds = case
           when reconcile_attempt_count <= 1 then 60 when reconcile_attempt_count = 2 then 300
           when reconcile_attempt_count = 3 then 900 when reconcile_attempt_count = 4 then 3600 else 21600 end,
         next_reconcile_at = p_now + make_interval(secs => case
           when reconcile_attempt_count <= 1 then 60 when reconcile_attempt_count = 2 then 300
           when reconcile_attempt_count = 3 then 900 when reconcile_attempt_count = 4 then 3600 else 21600 end),
         reconcile_lease_until = null,
         reconcile_lease_token = null,
         last_reconcile_error_class = p_error_class,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
   returning reconcile_backoff_seconds into v_next_backoff;
  if not found then raise exception 'stale reconcile lease token is not valid for retry'; end if;
  return v_next_backoff;
end;
$$;

revoke all on function public.ct_paid_retry_reconciler(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_retry_reconciler(uuid, uuid, text, timestamptz)
  to service_role;

create or replace function public.ct_paid_close_billing_period_reconciled(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_owner_user_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  perform 1
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
     and owner_user_id = p_owner_user_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
     and reconcile_work_kind = 'billing-period-rollover'
   for update;
  if not found then
    raise exception 'stale billing rollover lease token is not valid for close';
  end if;
  return public.ct_paid_close_billing_period(
    p_owner_user_id,
    p_period_start,
    p_period_end,
    p_now
  );
end;
$$;

revoke all on function public.ct_paid_close_billing_period_reconciled(uuid, uuid, uuid, timestamptz, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_close_billing_period_reconciled(uuid, uuid, uuid, timestamptz, timestamptz, timestamptz)
  to service_role;

create or replace function public.ct_paid_close_utc_month_reconciled(
  p_work_item_id uuid,
  p_reconcile_lease_token uuid,
  p_utc_month date,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_oldest_open_month date;
  v_more_overdue boolean;
begin
  p_now := statement_timestamp();
  if date_trunc('month', p_utc_month)::date <> p_utc_month
    or p_utc_month >= date_trunc('month', p_now at time zone 'UTC')::date
  then
    raise exception 'UTC rollover upper month is not eligible for close';
  end if;
  perform 1
    from public.comment_translator_paid_maintenance_work_items
   where id = p_work_item_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
     and work_kind = 'utc-month-cost-rollover'
   for update;
  if not found then
    raise exception 'stale UTC rollover lease token is not valid for close';
  end if;

  select min(overdue.utc_month)
    into v_oldest_open_month
    from (
      select utc_month
        from public.comment_translator_paid_global_cost_buckets
       where utc_month <= p_utc_month
         and bucket_state <> 'closed'
      union
      select utc_month
        from public.comment_translator_paid_azure_fallback_buckets
       where utc_month <= p_utc_month
         and bucket_state <> 'closed'
    ) overdue;

  if v_oldest_open_month is null then
    return false;
  end if;

  perform public.ct_paid_close_utc_month(v_oldest_open_month, p_now);

  select exists (
    select 1
      from public.comment_translator_paid_global_cost_buckets
     where utc_month <= p_utc_month
       and bucket_state <> 'closed'
    union all
    select 1
      from public.comment_translator_paid_azure_fallback_buckets
     where utc_month <= p_utc_month
       and bucket_state <> 'closed'
  ) into v_more_overdue;
  return v_more_overdue;
end;
$$;

revoke all on function public.ct_paid_close_utc_month_reconciled(uuid, uuid, date, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_close_utc_month_reconciled(uuid, uuid, date, timestamptz)
  to service_role;

create index if not exists comment_translator_real_comments_feed_snapshots_retention_idx
  on public.comment_translator_real_comments_feed_snapshots (updated_at, id);

create index if not exists comment_translator_paid_provider_hourly_retention_idx
  on public.comment_translator_paid_provider_hourly_details (utc_hour, id);

create index if not exists comment_translator_paid_session_summary_retention_idx
  on public.comment_translator_paid_session_summaries (ended_at, id)
  where ended_at is not null;

create index if not exists comment_translator_paid_stripe_event_retention_idx
  on public.comment_translator_paid_stripe_event_receipts (stripe_event_created_at, id);

create index if not exists comment_translator_paid_terminal_subscription_retention_idx
  on public.comment_translator_paid_billing_lifecycles (updated_at, id)
  where is_terminal = true;

-- A failed current-object read must fail closed without releasing a reservation
-- or making a lifecycle terminal. The next retry may project the authoritative
-- current object back to active; until then the reconciliation state blocks
-- Paid translation while the capacity reservation remains held.
drop function if exists public.ct_paid_mark_reconcile_failure_safe(uuid, uuid, text, timestamptz);

create or replace function public.ct_paid_mark_reconcile_failure_safe(
  p_lifecycle_id uuid,
  p_reconcile_lease_token uuid,
  p_work_kind text,
  p_error_class text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_entitlement public.comment_translator_paid_entitlements%rowtype;
  v_target_lifecycle_state text;
  v_authoritative_work_kind text;
begin
  p_now := statement_timestamp();
  if p_error_class not in (
    'object-retrieval-failed',
    'database-transaction-failed',
    'external-action-failed',
    'binding-not-ready',
    'capacity-reconciliation-failed',
    'period-reconciliation-failed'
  ) then
    raise exception 'reconcile error class is not valid';
  end if;
  if p_work_kind is not null and p_work_kind not in (
    'checkout-expiry',
    'unbound-checkout-session',
    'payment-failure-seven-day',
    'cancel-pending',
    'refund-reconciliation',
    'dispute-reconciliation',
    'paid-unentitled-reconciliation',
    'billing-period-rollover',
    'utc-month-cost-rollover'
  ) then
    raise exception 'reconcile work kind is not valid';
  end if;

  if p_work_kind = 'utc-month-cost-rollover' then
    update public.comment_translator_paid_maintenance_work_items
       set last_reconcile_error_class = p_error_class,
           updated_at = p_now
     where id = p_lifecycle_id
       and work_kind = p_work_kind
       and reconcile_lease_token = p_reconcile_lease_token
       and reconcile_lease_until > p_now;
    if not found then raise exception 'stale maintenance lease token is not valid for failure safety'; end if;

    update public.comment_translator_paid_global_cost_buckets
       set bucket_state = 'closing',
           updated_at = p_now
     where bucket_state = 'open'
       and utc_month < date_trunc('month', p_now at time zone 'UTC')::date;

    update public.comment_translator_paid_azure_fallback_buckets
       set bucket_state = 'closing',
           updated_at = p_now
     where bucket_state = 'open'
       and utc_month < date_trunc('month', p_now at time zone 'UTC')::date;
    return true;
  end if;

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
   for update;
  if v_lifecycle.id is null then
    raise exception 'stale reconcile lease token is not valid for failure safety';
  end if;

  v_authoritative_work_kind := case
    when v_lifecycle.lifecycle_state = 'expire_required' then 'checkout-expiry'
    when v_lifecycle.lifecycle_state in ('checkout_hold', 'incomplete')
      and not exists (
        select 1
          from public.comment_translator_paid_checkout_session_bindings session_binding
         where session_binding.lifecycle_id = v_lifecycle.id
      )
      and not exists (
        select 1
          from public.comment_translator_paid_subscription_bindings subscription_binding
         where subscription_binding.lifecycle_id = v_lifecycle.id
      ) then 'unbound-checkout-session'
    when v_lifecycle.lifecycle_state in ('checkout_hold', 'incomplete') then 'checkout-expiry'
    when v_lifecycle.lifecycle_state in ('past_due', 'unpaid')
      and v_lifecycle.payment_failure_started_at is not null
      and v_lifecycle.payment_failure_started_at <= p_now - interval '7 days'
      then 'payment-failure-seven-day'
    when v_lifecycle.lifecycle_state = 'cancel_pending' then 'cancel-pending'
    when v_lifecycle.lifecycle_state = 'refund_reconciliation' then 'refund-reconciliation'
    when v_lifecycle.lifecycle_state in ('dispute', 'dispute_reconciliation') then 'dispute-reconciliation'
    when v_lifecycle.lifecycle_state = 'paid_unentitled_reconciliation'
      and v_lifecycle.paid_unentitled_operator_disposition is not null
      then 'paid-unentitled-reconciliation'
    when v_lifecycle.lifecycle_state in ('active', 'cancel_at_period_end')
      and exists (
        select 1
          from public.comment_translator_paid_entitlements entitlement
         where entitlement.lifecycle_id = v_lifecycle.id
           and entitlement.current_period_end <= p_now
           and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'paid_unentitled_reconciliation')
      ) then 'billing-period-rollover'
    else null
  end;
  p_work_kind := coalesce(p_work_kind, v_authoritative_work_kind);
  if p_work_kind is null or p_work_kind is distinct from v_authoritative_work_kind then
    raise exception 'stale reconcile work kind is not valid for failure safety';
  end if;

  v_target_lifecycle_state := case
    when p_work_kind = 'paid-unentitled-reconciliation'
      then 'paid_unentitled_reconciliation'
    else v_lifecycle.lifecycle_state
  end;

  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = v_target_lifecycle_state,
         reconcile_work_kind = p_work_kind,
         last_reconcile_error_class = p_error_class,
         updated_at = p_now
   where id = v_lifecycle.id;

  select *
    into v_entitlement
    from public.comment_translator_paid_entitlements
   where lifecycle_id = v_lifecycle.id
   for update;

  if v_entitlement.id is not null
    and p_work_kind in ('paid-unentitled-reconciliation', 'billing-period-rollover')
  then
    update public.comment_translator_paid_entitlements
       set entitlement_status = 'paid_unentitled_reconciliation',
           cancel_at_period_end = false,
           dispute_state = 'none',
           updated_at = p_now,
           projected_at = p_now
     where id = v_entitlement.id;

    -- Keep the slot held/consuming. Only a later authoritative success or a
    -- confirmed terminal object may release capacity.
    update public.comment_translator_paid_capacity_reservations
       set lifecycle_stage = 'reconciliation',
           updated_at = p_now
     where lifecycle_id = v_lifecycle.id
       and reservation_state in ('held', 'consuming');
  end if;

  if p_work_kind = 'billing-period-rollover' then
    -- An authoritative rollover failure leaves every eligible period in the
    -- non-reservable closing state. A later successful close RPC is the only
    -- path from closing to closed.
    update public.comment_translator_paid_billing_period_usage
       set period_state = 'closing',
           updated_at = p_now
     where owner_user_id = v_lifecycle.owner_user_id
       and period_state = 'open'
       and period_end <= p_now;

    update public.comment_translator_paid_owner_cost_buckets
       set period_state = 'closing',
           updated_at = p_now
     where owner_user_id = v_lifecycle.owner_user_id
       and period_state = 'open'
       and period_end <= p_now;

  end if;

  if p_work_kind = 'utc-month-cost-rollover' then
    update public.comment_translator_paid_global_cost_buckets
       set bucket_state = 'closing',
           updated_at = p_now
     where bucket_state = 'open'
       and utc_month < date_trunc('month', p_now at time zone 'UTC')::date;

    update public.comment_translator_paid_azure_fallback_buckets
       set bucket_state = 'closing',
           updated_at = p_now
     where bucket_state = 'open'
       and utc_month < date_trunc('month', p_now at time zone 'UTC')::date;
  end if;

  return true;
end;
$$;

revoke all on function public.ct_paid_mark_reconcile_failure_safe(uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_mark_reconcile_failure_safe(uuid, uuid, text, text, timestamptz)
  to service_role;

-- Retention may remove only an already-terminal subscription reference selected
-- by the cleanup RPC below. The transaction-local flag does not authorize any
-- other immutable binding deletion and is reset before the RPC returns.
create or replace function public.comment_translator_paid_immutable_binding_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('app.ct_paid_retention_cleanup', true) = 'subscription-reference'
      and tg_table_name = 'comment_translator_paid_subscription_bindings'
    then
      if exists (
        select 1
          from public.comment_translator_paid_billing_lifecycles lifecycle
         where lifecycle.id = old.lifecycle_id
           and lifecycle.is_terminal = true
           and lifecycle.updated_at < (
             date_trunc('month', statement_timestamp() at time zone 'UTC') - interval '13 months'
           ) at time zone 'UTC'
           and not exists (
             select 1
               from public.comment_translator_paid_entitlements entitlement
              where entitlement.lifecycle_id = lifecycle.id
                and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'past_due', 'unpaid')
           )
      ) then
        return old;
      end if;
      raise exception 'subscription reference is not eligible for retention cleanup';
    end if;
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    raise exception 'immutable binding is not valid for update';
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'immutable binding is not valid for update';
  end if;
  return new;
end;
$$;

create or replace function public.ct_paid_invoke_maintenance_http(
  p_maintenance_url text,
  p_cron_token text,
  p_authority text default 'supabase-cron'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request_id bigint;
begin
  if p_authority is distinct from 'supabase-cron'
    or p_maintenance_url is null
    or p_maintenance_url <> btrim(p_maintenance_url)
    or length(p_maintenance_url) > 2048
    or p_maintenance_url !~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*/api/comment-translator/paid-maintenance/?$'
    or p_cron_token is null
    or p_cron_token <> btrim(p_cron_token)
    or length(p_cron_token) < 1
    or length(p_cron_token) > 4096
    or p_cron_token ~ '[[:cntrl:]]'
  then
    raise exception 'paid maintenance invocation configuration is not valid';
  end if;

  if pg_catalog.to_regprocedure('net.http_get(text,jsonb,jsonb,integer)') is null then
    raise exception 'paid maintenance HTTP capability is unavailable';
  end if;

  execute $http$
    select net.http_get(
      url := $1,
      params := '{}'::jsonb,
      headers := $2,
      timeout_milliseconds := $3
    )
  $http$
  into v_request_id
  using
    p_maintenance_url,
    pg_catalog.jsonb_build_object(
      'x-comment-translator-paid-cron-token', p_cron_token,
      'x-comment-translator-paid-scheduler-authority', p_authority
    ),
    10000;

  if v_request_id is null then
    raise exception 'paid maintenance HTTP invocation was not accepted';
  end if;
end;
$$;

revoke all on function public.ct_paid_invoke_maintenance_http(text, text, text)
  from public, anon, authenticated;
grant execute on function public.ct_paid_invoke_maintenance_http(text, text, text)
  to service_role;

comment on function public.ct_paid_invoke_maintenance_http(text, text, text) is
  'Task 9 paid maintenance standard contract: existing Supabase Cron binding name comment-translator-paid-maintenance, schedule */5 * * * *, authority supabase-cron. URL and token are runtime arguments and are not stored, returned, or logged. Remote Cron binding is externally unverified.';

create or replace function public.ct_paid_run_retention_cleanup(
  p_now timestamptz default now(),
  p_limit integer default 500
)
returns table (
  feed_snapshot_deleted integer,
  provider_hourly_detail_deleted integer,
  session_summary_deleted integer,
  stripe_event_deleted integer,
  aggregate_deleted integer,
  ended_subscription_deleted integer,
  attempt_ledger_deleted integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_remaining integer;
  v_deleted integer;
  v_total_deleted integer := 0;
  v_feed_snapshot_deleted integer := 0;
  v_provider_hourly_detail_deleted integer := 0;
  v_session_summary_deleted integer := 0;
  v_stripe_event_deleted integer := 0;
  v_aggregate_deleted integer := 0;
  v_ended_subscription_deleted integer := 0;
  v_attempt_ledger_deleted integer := 0;
  v_calendar_month_cutoff timestamptz := (
    date_trunc('month', v_now at time zone 'UTC') - interval '13 months'
  ) at time zone 'UTC';
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'paid retention cleanup limit is not valid';
  end if;

  -- The feed snapshot is the only durable browser-safe content exception.
  -- It is deleted only after the authoritative session ended plus 24 hours.
  with candidates as (
    select snapshot.id
      from public.comment_translator_real_comments_feed_snapshots snapshot
      join public.comment_translator_sessions session_row
        on session_row.session_reference_id = snapshot.session_reference_id
     where session_row.status = 'stopped'
       and session_row.stopped_at + interval '24 hours' <= v_now
     order by snapshot.updated_at, snapshot.id
     limit p_limit
     for update of snapshot skip locked
  )
  delete from public.comment_translator_real_comments_feed_snapshots target
   using candidates
   where target.id = candidates.id;
  get diagnostics v_feed_snapshot_deleted = row_count;
  v_deleted := v_feed_snapshot_deleted;
  v_total_deleted := v_total_deleted + v_deleted;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select detail.id
        from public.comment_translator_paid_provider_hourly_details detail
       where detail.utc_hour <= v_now - interval '30 days'
       order by detail.utc_hour, detail.id
       limit v_remaining
       for update of detail skip locked
    )
    delete from public.comment_translator_paid_provider_hourly_details target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_provider_hourly_detail_deleted = row_count;
    v_deleted := v_provider_hourly_detail_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select summary.id
        from public.comment_translator_paid_session_summaries summary
       where summary.ended_at is not null
         and summary.ended_at <= v_now - interval '90 days'
       order by summary.ended_at, summary.id
       limit v_remaining
       for update of summary skip locked
    )
    delete from public.comment_translator_paid_session_summaries target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_session_summary_deleted = row_count;
    v_deleted := v_session_summary_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select
        receipt.id,
        receipt.receipt_status,
        receipt.lease_until,
        receipt.lease_token
        from public.comment_translator_paid_stripe_event_receipts receipt
       where receipt.stripe_event_created_at <= v_now - interval '90 days'
         and not (
           receipt.receipt_status = 'processing'
           and receipt.lease_until > v_now
         )
       order by receipt.stripe_event_created_at, receipt.id
       limit v_remaining
       for update of receipt skip locked
    )
    delete from public.comment_translator_paid_stripe_event_receipts target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_stripe_event_deleted = row_count;
    v_deleted := v_stripe_event_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  -- Aggregate buckets are retained for 13 calendar months. Open buckets are
  -- never removed by retention; period and UTC-month reconciliation owns them.
  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select bucket.id
        from public.comment_translator_paid_owner_cost_buckets bucket
       where bucket.period_state = 'closed'
         and bucket.period_end < v_calendar_month_cutoff
       order by bucket.period_end, bucket.id
       limit v_remaining
       for update of bucket skip locked
    )
    delete from public.comment_translator_paid_owner_cost_buckets target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    v_aggregate_deleted := v_aggregate_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select bucket.id
        from public.comment_translator_paid_global_cost_buckets bucket
       where bucket.bucket_state = 'closed'
         and bucket.utc_month < v_calendar_month_cutoff::date
       order by bucket.utc_month, bucket.id
       limit v_remaining
       for update of bucket skip locked
    )
    delete from public.comment_translator_paid_global_cost_buckets target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    v_aggregate_deleted := v_aggregate_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select bucket.id
        from public.comment_translator_paid_azure_fallback_buckets bucket
       where bucket.bucket_state = 'closed'
         and bucket.utc_month < v_calendar_month_cutoff::date
       order by bucket.utc_month, bucket.id
       limit v_remaining
       for update of bucket skip locked
    )
    delete from public.comment_translator_paid_azure_fallback_buckets target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    v_aggregate_deleted := v_aggregate_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select usage_row.id
        from public.comment_translator_paid_billing_period_usage usage_row
       where usage_row.period_state = 'closed'
         and usage_row.period_end < v_calendar_month_cutoff
       order by usage_row.period_end, usage_row.id
       limit v_remaining
       for update of usage_row skip locked
    )
    delete from public.comment_translator_paid_billing_period_usage target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    v_aggregate_deleted := v_aggregate_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  -- Delete only terminal subscription references beyond the 13-calendar-month
  -- cutoff. Active/current subscriptions are retained. Direct retention delete
  -- does not create a new tombstone, and old subscription tombstones expire on
  -- the same bounded authority rather than extending raw IDs indefinitely.
  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    perform set_config('app.ct_paid_retention_cleanup', 'subscription-reference', true);
    with candidates as (
      select binding.id
        from public.comment_translator_paid_subscription_bindings binding
        join public.comment_translator_paid_billing_lifecycles lifecycle
          on lifecycle.id = binding.lifecycle_id
       where lifecycle.is_terminal = true
         and lifecycle.updated_at < v_calendar_month_cutoff
         and not exists (
           select 1
             from public.comment_translator_paid_entitlements entitlement
            where entitlement.lifecycle_id = lifecycle.id
              and entitlement.entitlement_status in ('active', 'cancel_at_period_end', 'past_due', 'unpaid')
         )
       order by lifecycle.updated_at, binding.id
       limit v_remaining
       for update of binding skip locked
    )
    delete from public.comment_translator_paid_subscription_bindings target
     using candidates
     where target.id = candidates.id;
    get diagnostics v_deleted = row_count;
    perform set_config('app.ct_paid_retention_cleanup', 'off', true);
    v_ended_subscription_deleted := v_ended_subscription_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    with candidates as (
      select tombstone.external_id_kind, tombstone.external_id
        from public.comment_translator_paid_external_id_tombstones tombstone
       where tombstone.external_id_kind = 'subscription'
         and tombstone.created_at < v_calendar_month_cutoff
       order by tombstone.created_at, tombstone.external_id
       limit v_remaining
       for update of tombstone skip locked
    )
    delete from public.comment_translator_paid_external_id_tombstones target
     using candidates
     where target.external_id_kind = candidates.external_id_kind
       and target.external_id = candidates.external_id;
    get diagnostics v_deleted = row_count;
    v_ended_subscription_deleted := v_ended_subscription_deleted + v_deleted;
    v_total_deleted := v_total_deleted + v_deleted;
  end if;

  v_remaining := p_limit - v_total_deleted;
  if v_remaining > 0 then
    v_attempt_ledger_deleted := public.ct_paid_cleanup_attempt_ledgers(v_now, v_remaining);
  else
    v_attempt_ledger_deleted := 0;
  end if;

  return query
    select
      v_feed_snapshot_deleted,
      v_provider_hourly_detail_deleted,
      v_session_summary_deleted,
      v_stripe_event_deleted,
      v_aggregate_deleted,
      v_ended_subscription_deleted,
      v_attempt_ledger_deleted;
end;
$$;

-- The RPC returns category counts only. It intentionally does not return
-- owner identifiers, session references, subscription references, provider
-- targets, comment text, response bodies, hashes, or credential material.
revoke all on function public.ct_paid_run_retention_cleanup(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.ct_paid_run_retention_cleanup(timestamptz, integer)
  to service_role;

create table if not exists public.comment_translator_paid_scheduler_runs (
  scheduler_authority text primary key check (scheduler_authority in ('supabase-cron', 'cloudflare-cron-fallback')),
  last_run_at timestamptz not null,
  last_success_at timestamptz,
  run_status text not null check (run_status in ('success', 'failed', 'stale', 'retry-scheduled', 'unavailable')),
  claim_count integer not null check (claim_count >= 0),
  retry_count integer not null check (retry_count >= 0),
  stale_count integer not null check (stale_count >= 0),
  error_class_counts jsonb not null default '{}'::jsonb check (jsonb_typeof(error_class_counts) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.comment_translator_paid_scheduler_runs enable row level security;
revoke all on table public.comment_translator_paid_scheduler_runs from public, anon, authenticated;

create or replace function public.ct_paid_record_sanitized_scheduler_run(
  p_authority text,
  p_run_at timestamptz,
  p_status text,
  p_claim_count integer,
  p_retry_count integer,
  p_stale_count integer,
  p_error_class_counts jsonb default '{}'::jsonb,
  p_last_success_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_authority not in ('supabase-cron', 'cloudflare-cron-fallback')
    or p_status not in ('success', 'failed', 'stale', 'retry-scheduled', 'unavailable')
    or p_run_at is null
    or p_claim_count is null or p_claim_count < 0
    or p_retry_count is null or p_retry_count < 0
    or p_stale_count is null or p_stale_count < 0
    or p_error_class_counts is null
    or jsonb_typeof(p_error_class_counts) <> 'object'
  then
    raise exception 'sanitized scheduler run is not valid';
  end if;
  if exists (
    select 1
      from jsonb_object_keys(p_error_class_counts) as error_key
     where error_key not in (
       'object-retrieval-failed',
       'database-transaction-failed',
       'external-action-failed',
       'binding-not-ready',
       'capacity-reconciliation-failed',
       'period-reconciliation-failed',
       'scheduler-unavailable',
       'scheduler-ambiguous'
     )
  ) then
    raise exception 'sanitized scheduler error class is not valid';
  end if;
  if exists (
    select 1
      from jsonb_each_text(p_error_class_counts) as error_count(error_key, error_value)
     where error_value !~ '^[0-9]+$'
  ) then
    raise exception 'sanitized scheduler error count is not valid';
  end if;

  insert into public.comment_translator_paid_scheduler_runs (
    scheduler_authority,
    last_run_at,
    last_success_at,
    run_status,
    claim_count,
    retry_count,
    stale_count,
    error_class_counts,
    updated_at
  ) values (
    p_authority,
    p_run_at,
    case when p_status = 'success' then coalesce(p_last_success_at, p_run_at) else null end,
    p_status,
    p_claim_count,
    p_retry_count,
    p_stale_count,
    p_error_class_counts,
    p_run_at
  )
  on conflict (scheduler_authority) do update set
    last_run_at = excluded.last_run_at,
    last_success_at = case
      when excluded.run_status = 'success' then excluded.last_success_at
      else comment_translator_paid_scheduler_runs.last_success_at
    end,
    run_status = excluded.run_status,
    claim_count = excluded.claim_count,
    retry_count = excluded.retry_count,
    stale_count = excluded.stale_count,
    error_class_counts = excluded.error_class_counts,
    updated_at = excluded.updated_at;
  return true;
end;
$$;

revoke all on function public.ct_paid_record_sanitized_scheduler_run(text, timestamptz, text, integer, integer, integer, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_record_sanitized_scheduler_run(text, timestamptz, text, integer, integer, integer, jsonb, timestamptz)
  to service_role;

create or replace function public.ct_paid_read_sanitized_scheduler_run(
  p_authority text default null
)
returns table (
  scheduler_authority text,
  last_run_at timestamptz,
  last_success_at timestamptz,
  run_status text,
  claim_count integer,
  retry_count integer,
  stale_count integer,
  error_class_counts jsonb
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select
    runs.scheduler_authority,
    runs.last_run_at,
    runs.last_success_at,
    runs.run_status,
    runs.claim_count,
    runs.retry_count,
    runs.stale_count,
    runs.error_class_counts
    from public.comment_translator_paid_scheduler_runs runs
   where p_authority is null or runs.scheduler_authority = p_authority
   order by runs.last_run_at desc
   limit 1;
$$;

revoke all on function public.ct_paid_read_sanitized_scheduler_run(text)
  from public, anon, authenticated;
grant execute on function public.ct_paid_read_sanitized_scheduler_run(text)
  to service_role;

create or replace function public.ct_paid_read_sanitized_admin_visibility(
  p_now timestamptz default now()
)
returns table (
  generated_at timestamptz,
  scheduler_authority text,
  scheduler_last_run_at timestamptz,
  scheduler_last_success_at timestamptz,
  scheduler_run_status text,
  scheduler_claim_count integer,
  scheduler_retry_count integer,
  scheduler_stale_count integer,
  scheduler_error_class_counts jsonb,
  scheduler_attempt_alert_count integer,
  capacity_active_count integer,
  capacity_held_count integer,
  capacity_limit integer,
  entitlement_active_count integer,
  entitlement_stopped_count integer,
  reconciliation_count integer,
  provider_request_count bigint,
  provider_success_count bigint,
  provider_failure_count bigint,
  provider_fallback_count bigint,
  provider_circuit_status text,
  provider_circuit_degraded_count integer,
  reserved_cost_micros numeric,
  committed_cost_micros numeric,
  individual_cost_limit_micros bigint,
  global_cost_limit_micros bigint,
  supabase_db_total_bytes bigint,
  supabase_db_limit_bytes bigint,
  cloudflare_daily_requests bigint,
  cloudflare_daily_limit bigint,
  cloudflare_stop_checkout_percent integer,
  cloudflare_stop_new_session_percent integer,
  cloudflare_stop_active_poll_percent integer
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  with capacity as (
    select
      count(*) filter (where reservation_state = 'consuming')::integer as active_count,
      count(*) filter (where reservation_state = 'held')::integer as held_count
    from public.comment_translator_paid_capacity_reservations
    where reservation_state <> 'released'
  ),
  entitlement as (
    select
      count(*) filter (where entitlement_status in ('active', 'cancel_at_period_end'))::integer as active_count,
      count(*) filter (where entitlement_status not in ('active', 'cancel_at_period_end'))::integer as stopped_count,
      count(*) filter (where entitlement_status in (
        'cancel_pending', 'paid_unentitled_reconciliation', 'refund_reconciliation', 'dispute_reconciliation'
      ))::integer as reconciliation_count
    from public.comment_translator_paid_entitlements
  ),
  provider as (
    select
      coalesce(sum(request_count), 0)::bigint as request_count,
      coalesce(sum(success_count), 0)::bigint as success_count,
      coalesce(sum(failure_count), 0)::bigint as failure_count,
      coalesce(sum(request_count) filter (where provider = 'azure_fallback'), 0)::bigint as fallback_count
    from public.comment_translator_paid_provider_hourly_details
    where utc_hour >= p_now - interval '30 days'
  ),
  owner_cost as (
    select
      coalesce(sum(reserved_cost_micros), 0)::numeric as reserved_cost_micros,
      coalesce(sum(committed_cost_micros), 0)::numeric as committed_cost_micros,
      coalesce(max(cost_limit_micros), 3_000_000)::bigint as individual_limit_micros
    from public.comment_translator_paid_owner_cost_buckets
    where period_state <> 'closed'
  ),
  global_cost as (
    select
      coalesce(max(cost_limit_micros), 25_000_000)::bigint as global_limit_micros
    from public.comment_translator_paid_global_cost_buckets
    where bucket_state <> 'closed'
  ),
  db_size as (
    select coalesce(sum(pg_total_relation_size(c.oid)), 0)::bigint as total_bytes
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'm')
  ),
  scheduler as (
    select
      scheduler_run.scheduler_authority,
      scheduler_run.last_run_at,
      scheduler_run.last_success_at,
      scheduler_run.run_status,
      scheduler_run.claim_count,
      scheduler_run.retry_count,
      scheduler_run.stale_count,
      scheduler_run.error_class_counts
      from public.comment_translator_paid_scheduler_runs scheduler_run
     order by scheduler_run.last_run_at desc
     limit 1
  ),
  attempt_alert as (
    select (
      (select count(*)
         from public.comment_translator_paid_billing_lifecycles lifecycle
        where lifecycle.reconcile_attempt_count >= 5)
      +
      (select count(*)
         from public.comment_translator_paid_maintenance_work_items work_item
        where work_item.reconcile_attempt_count >= 5)
    )::integer as alert_count
  )
  select
    p_now,
    scheduler.scheduler_authority,
    scheduler.last_run_at,
    scheduler.last_success_at,
    scheduler.run_status,
    scheduler.claim_count,
    scheduler.retry_count,
    scheduler.stale_count,
    scheduler.error_class_counts,
    attempt_alert.alert_count,
    capacity.active_count,
    capacity.held_count,
    config.capacity_limit,
    entitlement.active_count,
    entitlement.stopped_count,
    entitlement.reconciliation_count,
    provider.request_count,
    provider.success_count,
    provider.failure_count,
    provider.fallback_count,
    case
      when exists (
        select 1 from public.comment_translator_paid_provider_circuits where circuit_state = 'disabled'
      ) then 'disabled'
      when exists (
        select 1 from public.comment_translator_paid_provider_circuits where circuit_state = 'half_open'
      ) then 'half_open'
      when exists (
        select 1 from public.comment_translator_paid_provider_circuits where circuit_state = 'degraded'
      ) then 'degraded'
      else 'closed'
    end,
    (select count(*)::integer from public.comment_translator_paid_provider_circuits where circuit_state in ('degraded', 'half_open')),
    owner_cost.reserved_cost_micros,
    owner_cost.committed_cost_micros,
    owner_cost.individual_limit_micros,
    coalesce(global_cost.global_limit_micros, 25_000_000),
    db_size.total_bytes,
    300_000_000::bigint,
    null::bigint,
    100_000::bigint,
    80,
    90,
    95
  from capacity
  cross join entitlement
  cross join provider
  cross join owner_cost
  cross join global_cost
  cross join db_size
  cross join attempt_alert
  left join scheduler on true
  cross join lateral (
    select capacity_limit
      from public.comment_translator_paid_capacity_config
     where config_key = true
     limit 1
  ) config;
$$;

revoke all on function public.ct_paid_read_sanitized_admin_visibility(timestamptz)
  from public, anon, authenticated;
grant execute on function public.ct_paid_read_sanitized_admin_visibility(timestamptz)
  to service_role;

comment on function public.ct_paid_run_retention_cleanup(timestamptz, integer) is
  'Bounded, idempotent Task 9 retention cleanup. Existing Supabase Cron is standard; existing Cloudflare Cron is fallback-only.';

comment on function public.ct_paid_read_sanitized_admin_visibility(timestamptz) is
  'Returns sanitized aggregate capacity, entitlement, provider, cost, database, and threshold metrics only.';
