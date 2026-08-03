-- Reviewable local migration only. No remote apply, read, write, or billing activation
-- is authorized by this file. Raw Stripe payloads and browser-controlled authority are never stored.

create table if not exists public.comment_translator_creator_checkout_reservations (
  reservation_id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  price_compatibility_key text not null check (
    price_compatibility_key = 'creator_monthly_jpy_980_v1'
  ),
  idempotency_key text not null unique,
  state text not null check (state in ('reserved', 'session-created', 'checkout-completed', 'checkout-expired')),
  expires_at timestamptz not null,
  stripe_checkout_session_reference text,
  stripe_customer_reference text,
  stripe_subscription_reference text,
  last_checkout_lifecycle_event_created_at timestamptz,
  last_checkout_lifecycle_event_reference text,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint comment_translator_creator_checkout_reservations_identifier_check check (
    reservation_id = trim(reservation_id)
    and length(reservation_id) between 1 and 255
    and idempotency_key = trim(idempotency_key)
    and length(idempotency_key) between 1 and 255
  ),
  constraint comment_translator_creator_checkout_reservations_expiry_check check (
    expires_at > created_at
  ),
  constraint comment_translator_creator_checkout_reservations_state_check check (
    (state = 'reserved' and stripe_checkout_session_reference is null)
    or (
      state in ('session-created', 'checkout-completed', 'checkout-expired')
      and stripe_checkout_session_reference is not null
      and stripe_checkout_session_reference = trim(stripe_checkout_session_reference)
      and length(stripe_checkout_session_reference) between 1 and 255
    )
  ),
  constraint comment_translator_creator_checkout_reservations_binding_check check (
    (stripe_customer_reference is null and stripe_subscription_reference is null)
    or (
      stripe_customer_reference is not null
      and stripe_subscription_reference is not null
      and stripe_customer_reference = trim(stripe_customer_reference)
      and length(stripe_customer_reference) between 1 and 255
      and stripe_subscription_reference = trim(stripe_subscription_reference)
      and length(stripe_subscription_reference) between 1 and 255
    )
  ),
  constraint comment_translator_creator_checkout_reservations_lifecycle_check check (
    (last_checkout_lifecycle_event_created_at is null and last_checkout_lifecycle_event_reference is null)
    or (
      last_checkout_lifecycle_event_created_at is not null
      and last_checkout_lifecycle_event_reference is not null
      and last_checkout_lifecycle_event_reference = trim(last_checkout_lifecycle_event_reference)
      and length(last_checkout_lifecycle_event_reference) between 1 and 255
    )
  )
);

alter table public.comment_translator_creator_checkout_reservations enable row level security;

revoke all on table public.comment_translator_creator_checkout_reservations from anon;
revoke all on table public.comment_translator_creator_checkout_reservations from authenticated;
revoke all on table public.comment_translator_creator_checkout_reservations from service_role;

create table if not exists public.comment_translator_creator_checkout_lifecycle_evidence (
  stripe_event_reference text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  reservation_id text not null,
  stripe_checkout_session_reference text not null,
  lifecycle text not null check (lifecycle in ('completed', 'expired')),
  signature_authority text not null check (signature_authority = 'stripe-signature-verified'),
  event_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint comment_translator_creator_checkout_lifecycle_evidence_identifier_check check (
    stripe_event_reference = trim(stripe_event_reference)
    and length(stripe_event_reference) between 1 and 255
    and reservation_id = trim(reservation_id)
    and length(reservation_id) between 1 and 255
    and stripe_checkout_session_reference = trim(stripe_checkout_session_reference)
    and length(stripe_checkout_session_reference) between 1 and 255
  )
);

alter table public.comment_translator_creator_checkout_lifecycle_evidence enable row level security;

revoke all on table public.comment_translator_creator_checkout_lifecycle_evidence from anon;
revoke all on table public.comment_translator_creator_checkout_lifecycle_evidence from authenticated;
revoke all on table public.comment_translator_creator_checkout_lifecycle_evidence from service_role;

create index if not exists comment_translator_creator_checkout_reservations_expiry_idx
  on public.comment_translator_creator_checkout_reservations (owner_user_id, expires_at);

create unique index if not exists comment_translator_creator_checkout_reservations_session_reference_idx
  on public.comment_translator_creator_checkout_reservations (stripe_checkout_session_reference)
  where stripe_checkout_session_reference is not null;

create or replace function public.reserve_comment_translator_creator_checkout(
  p_owner_user_id uuid,
  p_price_compatibility_key text,
  p_ttl_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_reservation public.comment_translator_creator_checkout_reservations%rowtype;
  reservation_identifier text;
  idempotency_identifier text;
  reservation_expiry timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if p_owner_user_id is null
    or p_price_compatibility_key is distinct from 'creator_monthly_jpy_980_v1'
    or p_ttl_seconds is null
    or p_ttl_seconds < 1800
    or p_ttl_seconds > 86400 then
    return jsonb_build_object('status', 'unavailable');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_owner_user_id::text));

  if exists (
    select 1
    from public.comment_translator_creator_paid_entitlements
    where owner_user_id = p_owner_user_id
  ) then
    return jsonb_build_object('status', 'owned');
  end if;

  select *
  into existing_reservation
  from public.comment_translator_creator_checkout_reservations
  where owner_user_id = p_owner_user_id
    and state in ('reserved', 'session-created', 'checkout-completed')
  order by updated_at desc
  limit 1
  for update;

  if found then
    return jsonb_build_object('status', 'duplicate');
  end if;

  reservation_identifier := 'ctcr_' || replace(gen_random_uuid()::text, '-', '');
  idempotency_identifier := 'ctci_' || replace(gen_random_uuid()::text, '-', '');
  reservation_expiry := now() + make_interval(secs => p_ttl_seconds);

  insert into public.comment_translator_creator_checkout_reservations (
    owner_user_id,
    price_compatibility_key,
    reservation_id,
    idempotency_key,
    state,
    expires_at
  ) values (
    p_owner_user_id,
    p_price_compatibility_key,
    reservation_identifier,
    idempotency_identifier,
    'reserved',
    reservation_expiry
  );

  return jsonb_build_object(
    'status', 'reserved',
    'reservationId', reservation_identifier,
    'idempotencyKey', idempotency_identifier,
    'expiresAtIso', reservation_expiry
  );
end;
$$;

create or replace function public.finalize_comment_translator_creator_checkout(
  p_owner_user_id uuid,
  p_reservation_id text,
  p_stripe_checkout_session_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_reservation public.comment_translator_creator_checkout_reservations%rowtype;
  finalized_reservation_id text;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if p_owner_user_id is null
    or length(trim(coalesce(p_reservation_id, ''))) = 0
    or p_reservation_id <> trim(p_reservation_id)
    or length(p_reservation_id) > 255
    or length(trim(coalesce(p_stripe_checkout_session_reference, ''))) = 0
    or p_stripe_checkout_session_reference <> trim(p_stripe_checkout_session_reference)
    or length(p_stripe_checkout_session_reference) > 255 then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select *
  into existing_reservation
  from public.comment_translator_creator_checkout_reservations
  where owner_user_id = p_owner_user_id
    and reservation_id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if existing_reservation.state in ('session-created', 'checkout-completed') then
    return jsonb_build_object(
      'status',
      case
        when existing_reservation.stripe_checkout_session_reference = p_stripe_checkout_session_reference then 'finalized'
        else 'unavailable'
      end
    );
  end if;

  update public.comment_translator_creator_checkout_reservations
  set state = 'session-created',
      stripe_checkout_session_reference = p_stripe_checkout_session_reference,
      finalized_at = now(),
      updated_at = now()
  where owner_user_id = p_owner_user_id
    and reservation_id = p_reservation_id
    and state = 'reserved'
  returning reservation_id into finalized_reservation_id;

  return jsonb_build_object(
    'status',
    case when finalized_reservation_id is null then 'unavailable' else 'finalized' end
  );
end;
$$;

create or replace function public.apply_comment_translator_creator_signed_checkout_lifecycle(
  p_owner_user_id uuid,
  p_checkout_reservation_id text,
  p_stripe_checkout_session_reference text,
  p_stripe_event_reference text,
  p_signature_verified boolean,
  p_lifecycle text,
  p_event_created_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_reservation public.comment_translator_creator_checkout_reservations%rowtype;
  inserted_event_reference text;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;

  if p_signature_verified is not true then
    return jsonb_build_object('status', 'rejected', 'reason', 'unsigned-evidence');
  end if;

  if p_owner_user_id is null
    or p_lifecycle is null
    or p_lifecycle not in ('completed', 'expired')
    or length(trim(coalesce(p_checkout_reservation_id, ''))) = 0
    or p_checkout_reservation_id <> trim(p_checkout_reservation_id)
    or length(p_checkout_reservation_id) > 255
    or length(trim(coalesce(p_stripe_checkout_session_reference, ''))) = 0
    or p_stripe_checkout_session_reference <> trim(p_stripe_checkout_session_reference)
    or length(p_stripe_checkout_session_reference) > 255
    or length(trim(coalesce(p_stripe_event_reference, ''))) = 0
    or p_stripe_event_reference <> trim(p_stripe_event_reference)
    or length(p_stripe_event_reference) > 255
    or p_event_created_at is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed-lifecycle-evidence');
  end if;

  if p_event_created_at > now() + interval '5 minutes' then
    return jsonb_build_object('status', 'rejected', 'reason', 'future-event');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_owner_user_id::text));

  select *
  into existing_reservation
  from public.comment_translator_creator_checkout_reservations
  where owner_user_id = p_owner_user_id
    and reservation_id = p_checkout_reservation_id
  for update;

  if not found then
    return jsonb_build_object('status', 'rejected', 'reason', 'reservation-unverified');
  end if;

  if p_event_created_at < existing_reservation.created_at - interval '5 minutes' then
    return jsonb_build_object('status', 'rejected', 'reason', 'stale-or-replayed-lifecycle');
  end if;

  if existing_reservation.last_checkout_lifecycle_event_created_at is not null
    and existing_reservation.last_checkout_lifecycle_event_created_at >= p_event_created_at then
    return jsonb_build_object('status', 'rejected', 'reason', 'stale-or-replayed-lifecycle');
  end if;

  if existing_reservation.stripe_checkout_session_reference is not null
    and existing_reservation.stripe_checkout_session_reference <> p_stripe_checkout_session_reference then
    return jsonb_build_object('status', 'rejected', 'reason', 'reservation-session-mismatch');
  end if;

  if p_lifecycle = 'completed'
    and existing_reservation.state not in ('reserved', 'session-created') then
    return jsonb_build_object('status', 'rejected', 'reason', 'lifecycle-state-mismatch');
  end if;

  if p_lifecycle = 'expired'
    and existing_reservation.state not in ('reserved', 'session-created') then
    return jsonb_build_object('status', 'rejected', 'reason', 'lifecycle-state-mismatch');
  end if;

  insert into public.comment_translator_creator_checkout_lifecycle_evidence (
    stripe_event_reference,
    owner_user_id,
    reservation_id,
    stripe_checkout_session_reference,
    lifecycle,
    signature_authority,
    event_created_at
  ) values (
    p_stripe_event_reference,
    p_owner_user_id,
    p_checkout_reservation_id,
    p_stripe_checkout_session_reference,
    p_lifecycle,
    'stripe-signature-verified',
    p_event_created_at
  )
  on conflict (stripe_event_reference) do nothing
  returning stripe_event_reference into inserted_event_reference;

  if inserted_event_reference is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'replayed-event');
  end if;

  update public.comment_translator_creator_checkout_reservations
  set state = case when p_lifecycle = 'completed' then 'checkout-completed' else 'checkout-expired' end,
      stripe_checkout_session_reference = p_stripe_checkout_session_reference,
      last_checkout_lifecycle_event_created_at = p_event_created_at,
      last_checkout_lifecycle_event_reference = p_stripe_event_reference,
      updated_at = now()
  where owner_user_id = p_owner_user_id
    and reservation_id = p_checkout_reservation_id;

  return jsonb_build_object('status', 'applied');
end;
$$;

create or replace function public.release_comment_translator_creator_checkout(
  p_owner_user_id uuid,
  p_reservation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  released_reservation_id text;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if p_owner_user_id is null
    or length(trim(coalesce(p_reservation_id, ''))) = 0
    or p_reservation_id <> trim(p_reservation_id)
    or length(p_reservation_id) > 255 then
    return jsonb_build_object('status', 'unavailable');
  end if;

  delete from public.comment_translator_creator_checkout_reservations
  where owner_user_id = p_owner_user_id
    and reservation_id = p_reservation_id
    and state = 'reserved'
  returning reservation_id into released_reservation_id;

  return jsonb_build_object(
    'status',
    case when released_reservation_id is null then 'unavailable' else 'released' end
  );
end;
$$;

-- Keep the prior RPC signature callable only as a fail-closed compatibility surface.
create or replace function public.apply_comment_translator_creator_signed_entitlement_evidence(
  p_owner_user_id uuid,
  p_stripe_customer_reference text,
  p_stripe_subscription_reference text,
  p_stripe_event_reference text,
  p_signature_verified boolean,
  p_plan_key text,
  p_product_compatibility_key text,
  p_price_compatibility_key text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_event_created_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return jsonb_build_object('status', 'rejected', 'reason', 'reservation-required');
end;
$$;

create or replace function public.apply_comment_translator_creator_signed_entitlement_evidence(
  p_owner_user_id uuid,
  p_stripe_customer_reference text,
  p_stripe_subscription_reference text,
  p_stripe_event_reference text,
  p_checkout_reservation_id text,
  p_signature_verified boolean,
  p_plan_key text,
  p_product_compatibility_key text,
  p_price_compatibility_key text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_event_created_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_entitlement public.comment_translator_creator_paid_entitlements%rowtype;
  existing_reservation public.comment_translator_creator_checkout_reservations%rowtype;
  inserted_event_reference text;
  applied_entitlement_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('status', 'rejected', 'reason', 'service-role-required');
  end if;

  if p_signature_verified is not true then
    return jsonb_build_object('status', 'rejected', 'reason', 'unsigned-evidence');
  end if;

  if p_plan_key is distinct from 'creator'
    or p_product_compatibility_key is distinct from 'comment_translator_creator_v1'
    or p_price_compatibility_key is distinct from 'creator_monthly_jpy_980_v1'
    or p_status is null
    or p_status not in ('active', 'inactive') then
    return jsonb_build_object('status', 'rejected', 'reason', 'compatibility-mismatch');
  end if;

  if p_owner_user_id is null
    or length(trim(coalesce(p_stripe_customer_reference, ''))) = 0
    or p_stripe_customer_reference <> trim(p_stripe_customer_reference)
    or length(p_stripe_customer_reference) > 255
    or length(trim(coalesce(p_stripe_subscription_reference, ''))) = 0
    or p_stripe_subscription_reference <> trim(p_stripe_subscription_reference)
    or length(p_stripe_subscription_reference) > 255
    or length(trim(coalesce(p_stripe_event_reference, ''))) = 0
    or p_stripe_event_reference <> trim(p_stripe_event_reference)
    or length(p_stripe_event_reference) > 255
    or length(trim(coalesce(p_checkout_reservation_id, ''))) = 0
    or p_checkout_reservation_id <> trim(p_checkout_reservation_id)
    or length(p_checkout_reservation_id) > 255
    or p_event_created_at is null
    or (p_status = 'active' and (
      p_period_start is null
      or p_period_end is null
      or p_period_end <= p_period_start
    ))
    or (p_status = 'inactive' and not (
      (p_period_start is null and p_period_end is null)
      or (p_period_start is not null and p_period_end is not null and p_period_end > p_period_start)
    )) then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed-evidence');
  end if;

  if p_event_created_at > now() + interval '5 minutes' then
    return jsonb_build_object('status', 'rejected', 'reason', 'future-event');
  end if;

  if p_status = 'active' and p_period_end <= now() then
    return jsonb_build_object('status', 'rejected', 'reason', 'stale-period');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_owner_user_id::text));

  select *
  into existing_reservation
  from public.comment_translator_creator_checkout_reservations
  where owner_user_id = p_owner_user_id
    and reservation_id = p_checkout_reservation_id
  for update;

  if not found or existing_reservation.state not in ('session-created', 'checkout-completed') then
    return jsonb_build_object('status', 'rejected', 'reason', 'reservation-unverified');
  end if;

  if (existing_reservation.stripe_customer_reference is null) <> (existing_reservation.stripe_subscription_reference is null) then
    return jsonb_build_object('status', 'rejected', 'reason', 'reservation-binding-malformed');
  end if;

  if existing_reservation.stripe_customer_reference is not null
    and (
      existing_reservation.stripe_customer_reference <> p_stripe_customer_reference
      or existing_reservation.stripe_subscription_reference <> p_stripe_subscription_reference
    ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'reservation-binding-mismatch');
  end if;

  if p_status = 'inactive' and p_period_start is null and p_period_end is null
    and existing_reservation.stripe_customer_reference is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'reservation-binding-required');
  end if;

  if exists (
    select 1
    from public.comment_translator_creator_paid_entitlements
    where stripe_subscription_reference = p_stripe_subscription_reference
      and owner_user_id <> p_owner_user_id
  ) or exists (
    select 1
    from public.comment_translator_creator_paid_entitlements
    where stripe_customer_reference = p_stripe_customer_reference
      and owner_user_id <> p_owner_user_id
  ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'owner-mismatch');
  end if;

  select *
  into existing_entitlement
  from public.comment_translator_creator_paid_entitlements
  where owner_user_id = p_owner_user_id
  for update;

  if found and (
    existing_entitlement.stripe_customer_reference <> p_stripe_customer_reference
    or existing_entitlement.stripe_subscription_reference <> p_stripe_subscription_reference
  ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'reservation-binding-mismatch');
  end if;

  if p_status = 'inactive' and p_period_start is null and p_period_end is null and not found then
    return jsonb_build_object('status', 'rejected', 'reason', 'periodless-inactive-requires-existing-entitlement');
  end if;

  if found and existing_entitlement.last_event_created_at > p_event_created_at then
    return jsonb_build_object('status', 'rejected', 'reason', 'stale-or-replayed-event');
  end if;

  if found and existing_entitlement.last_event_created_at = p_event_created_at then
    if existing_entitlement.status = 'inactive' and p_status = 'active' then
      return jsonb_build_object('status', 'rejected', 'reason', 'inactive-wins-tie');
    end if;
    if not (existing_entitlement.status = 'active' and p_status = 'inactive') then
      return jsonb_build_object('status', 'rejected', 'reason', 'stale-or-replayed-event');
    end if;
  end if;

  if found and p_status = 'active' and (
    existing_entitlement.period_start > p_period_start
    or existing_entitlement.period_end > p_period_end
  ) then
    return jsonb_build_object('status', 'rejected', 'reason', 'period-regression');
  end if;

  insert into public.comment_translator_creator_entitlement_evidence (
    stripe_event_reference,
    owner_user_id,
    signature_authority,
    event_created_at
  ) values (
    p_stripe_event_reference,
    p_owner_user_id,
    'stripe-signature-verified',
    p_event_created_at
  )
  on conflict (stripe_event_reference) do nothing
  returning stripe_event_reference into inserted_event_reference;

  if inserted_event_reference is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'replayed-event');
  end if;

  if existing_reservation.stripe_customer_reference is null then
    update public.comment_translator_creator_checkout_reservations
    set stripe_customer_reference = p_stripe_customer_reference,
        stripe_subscription_reference = p_stripe_subscription_reference,
        updated_at = now()
    where owner_user_id = p_owner_user_id
      and reservation_id = p_checkout_reservation_id
      and stripe_customer_reference is null
      and stripe_subscription_reference is null;
  end if;

  insert into public.comment_translator_creator_paid_entitlements (
    owner_user_id,
    stripe_customer_reference,
    stripe_subscription_reference,
    plan_key,
    product_compatibility_key,
    price_compatibility_key,
    status,
    period_start,
    period_end,
    last_event_created_at,
    last_stripe_event_reference
  ) values (
    p_owner_user_id,
    p_stripe_customer_reference,
    p_stripe_subscription_reference,
    p_plan_key,
    p_product_compatibility_key,
    p_price_compatibility_key,
    p_status,
    case when p_period_start is null then existing_entitlement.period_start else p_period_start end,
    case when p_period_end is null then existing_entitlement.period_end else p_period_end end,
    p_event_created_at,
    p_stripe_event_reference
  )
  on conflict (owner_user_id) do update set
    status = excluded.status,
    period_start = greatest(public.comment_translator_creator_paid_entitlements.period_start, excluded.period_start),
    period_end = greatest(public.comment_translator_creator_paid_entitlements.period_end, excluded.period_end),
    last_event_created_at = excluded.last_event_created_at,
    last_stripe_event_reference = excluded.last_stripe_event_reference,
    updated_at = now()
  where (
      public.comment_translator_creator_paid_entitlements.last_event_created_at < excluded.last_event_created_at
      or (
        public.comment_translator_creator_paid_entitlements.last_event_created_at = excluded.last_event_created_at
        and public.comment_translator_creator_paid_entitlements.status = 'active'
        and excluded.status = 'inactive'
      )
    )
    and (
      excluded.status = 'inactive'
      or (
        public.comment_translator_creator_paid_entitlements.period_start <= excluded.period_start
        and public.comment_translator_creator_paid_entitlements.period_end <= excluded.period_end
      )
    )
  returning id into applied_entitlement_id;

  if applied_entitlement_id is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'concurrent-stale-or-period-regression');
  end if;

  return jsonb_build_object('status', 'applied');
end;
$$;

revoke all on function public.reserve_comment_translator_creator_checkout(uuid, text, integer) from public;
revoke all on function public.reserve_comment_translator_creator_checkout(uuid, text, integer) from anon;
revoke all on function public.reserve_comment_translator_creator_checkout(uuid, text, integer) from authenticated;
grant execute on function public.reserve_comment_translator_creator_checkout(uuid, text, integer) to service_role;

revoke all on function public.finalize_comment_translator_creator_checkout(uuid, text, text) from public;
revoke all on function public.finalize_comment_translator_creator_checkout(uuid, text, text) from anon;
revoke all on function public.finalize_comment_translator_creator_checkout(uuid, text, text) from authenticated;
grant execute on function public.finalize_comment_translator_creator_checkout(uuid, text, text) to service_role;

revoke all on function public.release_comment_translator_creator_checkout(uuid, text) from public;
revoke all on function public.release_comment_translator_creator_checkout(uuid, text) from anon;
revoke all on function public.release_comment_translator_creator_checkout(uuid, text) from authenticated;
grant execute on function public.release_comment_translator_creator_checkout(uuid, text) to service_role;

revoke all on function public.apply_comment_translator_creator_signed_checkout_lifecycle(
  uuid, text, text, text, boolean, text, timestamptz
) from public;
revoke all on function public.apply_comment_translator_creator_signed_checkout_lifecycle(
  uuid, text, text, text, boolean, text, timestamptz
) from anon;
revoke all on function public.apply_comment_translator_creator_signed_checkout_lifecycle(
  uuid, text, text, text, boolean, text, timestamptz
) from authenticated;
grant execute on function public.apply_comment_translator_creator_signed_checkout_lifecycle(
  uuid, text, text, text, boolean, text, timestamptz
) to service_role;

revoke all on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) from public;
revoke all on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) from anon;
revoke all on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) from authenticated;
grant execute on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) to service_role;

revoke all on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) from public;
revoke all on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) from anon;
revoke all on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) from authenticated;
grant execute on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) to service_role;

comment on table public.comment_translator_creator_checkout_reservations is
  'NC-B1 durable owner-scoped Checkout reservation and Stripe session binding authority. Service-role RPC only.';
comment on function public.reserve_comment_translator_creator_checkout(uuid, text, integer) is
  'Atomically reserves one Creator Checkout session per owner and fixed price until signed Stripe lifecycle expiry.';
comment on function public.apply_comment_translator_creator_signed_checkout_lifecycle(
  uuid, text, text, text, boolean, text, timestamptz
) is 'Atomic signed Stripe Checkout lifecycle writer. Completion and expiry never grant Paid entitlement.';
comment on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) is 'Atomic signed Stripe evidence writer with reservation-bound customer/subscription identity and inactive-wins timestamp ties.';
