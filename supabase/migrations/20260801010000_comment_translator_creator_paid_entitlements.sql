-- Reviewable local migration only. No remote apply, read, write, or billing activation
-- is authorized by this file. Raw Stripe payloads are never persisted.

create table if not exists public.comment_translator_creator_paid_entitlements (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_reference text not null,
  stripe_subscription_reference text not null,
  plan_key text not null check (plan_key = 'creator'),
  product_compatibility_key text not null check (
    product_compatibility_key = 'comment_translator_creator_v1'
  ),
  price_compatibility_key text not null check (
    price_compatibility_key = 'creator_monthly_jpy_980_v1'
  ),
  status text not null check (status in ('active', 'inactive')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  last_event_created_at timestamptz not null,
  last_stripe_event_reference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_creator_paid_entitlements_period_order check (
    period_end > period_start
  ),
  constraint comment_translator_creator_paid_entitlements_customer_reference_nonempty check (
    stripe_customer_reference = trim(stripe_customer_reference)
    and length(stripe_customer_reference) between 1 and 255
  ),
  constraint comment_translator_creator_paid_entitlements_subscription_reference_nonempty check (
    stripe_subscription_reference = trim(stripe_subscription_reference)
    and length(stripe_subscription_reference) between 1 and 255
  ),
  constraint comment_translator_creator_paid_entitlements_event_reference_nonempty check (
    last_stripe_event_reference = trim(last_stripe_event_reference)
    and length(last_stripe_event_reference) between 1 and 255
  )
);

create table if not exists public.comment_translator_creator_entitlement_evidence (
  stripe_event_reference text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  signature_authority text not null check (
    signature_authority = 'stripe-signature-verified'
  ),
  event_created_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint comment_translator_creator_entitlement_evidence_reference_nonempty check (
    stripe_event_reference = trim(stripe_event_reference)
    and length(stripe_event_reference) between 1 and 255
  )
);

alter table public.comment_translator_creator_paid_entitlements enable row level security;
alter table public.comment_translator_creator_entitlement_evidence enable row level security;

revoke all on table public.comment_translator_creator_paid_entitlements from anon;
revoke all on table public.comment_translator_creator_paid_entitlements from authenticated;
revoke all on table public.comment_translator_creator_paid_entitlements from service_role;
revoke all on table public.comment_translator_creator_entitlement_evidence from anon;
revoke all on table public.comment_translator_creator_entitlement_evidence from authenticated;
revoke all on table public.comment_translator_creator_entitlement_evidence from service_role;
grant select on table public.comment_translator_creator_paid_entitlements to service_role;

drop policy if exists "comment_translator_creator_paid_entitlements_service_role_all"
  on public.comment_translator_creator_paid_entitlements;
drop policy if exists "comment_translator_creator_paid_entitlements_service_role_select"
  on public.comment_translator_creator_paid_entitlements;
create policy "comment_translator_creator_paid_entitlements_service_role_select"
  on public.comment_translator_creator_paid_entitlements
  for select
  to service_role
  using (true);

create unique index if not exists comment_translator_creator_paid_entitlements_owner_key
  on public.comment_translator_creator_paid_entitlements (owner_user_id);
create unique index if not exists comment_translator_creator_paid_entitlements_customer_key
  on public.comment_translator_creator_paid_entitlements (stripe_customer_reference);
create unique index if not exists comment_translator_creator_paid_entitlements_subscription_key
  on public.comment_translator_creator_paid_entitlements (stripe_subscription_reference);
create index if not exists comment_translator_creator_paid_entitlements_active_period_idx
  on public.comment_translator_creator_paid_entitlements (status, period_end)
  where status = 'active';
create index if not exists comment_translator_creator_entitlement_evidence_owner_event_idx
  on public.comment_translator_creator_entitlement_evidence (owner_user_id, event_created_at desc);

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
declare
  existing_entitlement public.comment_translator_creator_paid_entitlements%rowtype;
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
    or p_period_start is null
    or p_period_end is null
    or p_event_created_at is null
    or p_period_end <= p_period_start then
    return jsonb_build_object('status', 'rejected', 'reason', 'malformed-evidence');
  end if;

  if p_event_created_at > now() + interval '5 minutes' then
    return jsonb_build_object('status', 'rejected', 'reason', 'future-event');
  end if;

  if p_status = 'active' and p_period_end <= now() then
    return jsonb_build_object('status', 'rejected', 'reason', 'stale-period');
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

  if found and existing_entitlement.last_event_created_at >= p_event_created_at then
    return jsonb_build_object('status', 'rejected', 'reason', 'stale-or-replayed-event');
  end if;

  if found and (
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
    p_period_start,
    p_period_end,
    p_event_created_at,
    p_stripe_event_reference
  )
  on conflict (owner_user_id) do update set
    stripe_customer_reference = excluded.stripe_customer_reference,
    stripe_subscription_reference = excluded.stripe_subscription_reference,
    plan_key = excluded.plan_key,
    product_compatibility_key = excluded.product_compatibility_key,
    price_compatibility_key = excluded.price_compatibility_key,
    status = excluded.status,
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    last_event_created_at = excluded.last_event_created_at,
    last_stripe_event_reference = excluded.last_stripe_event_reference,
    updated_at = now()
  where public.comment_translator_creator_paid_entitlements.last_event_created_at < excluded.last_event_created_at
    and public.comment_translator_creator_paid_entitlements.period_start <= excluded.period_start
    and public.comment_translator_creator_paid_entitlements.period_end <= excluded.period_end
  returning id into applied_entitlement_id;

  if applied_entitlement_id is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'concurrent-stale-or-period-regression');
  end if;

  return jsonb_build_object('status', 'applied');
end;
$$;

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

comment on table public.comment_translator_creator_paid_entitlements is
  'NC-D1 owner-scoped paid entitlement authority. Service-role only; browser roles receive no direct access.';
comment on table public.comment_translator_creator_entitlement_evidence is
  'Minimal signed Stripe evidence ledger for idempotency. Raw provider payloads are not stored.';
comment on function public.apply_comment_translator_creator_signed_entitlement_evidence(
  uuid, text, text, text, boolean, text, text, text, text, timestamptz, timestamptz, timestamptz
) is 'Atomic NC-D1 signed-evidence writer. Rejects ordinary roles, unsigned, stale, replayed, mismatched, or period-regressing evidence.';
