create table if not exists public.comment_translator_paid_entitlements (
  billing_user_reference_id text primary key,
  stripe_customer_reference_id text,
  stripe_subscription_reference_id text,
  subscription_status text not null check (
    subscription_status in ('active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused')
  ),
  billing_state text not null check (billing_state in ('paid-active', 'paid-inactive')),
  current_period_end timestamptz,
  evidence_source text not null default 'signed-stripe-webhook' check (
    evidence_source = 'signed-stripe-webhook'
  ),
  evidence_event_reference_id text not null,
  evidence_created_at timestamptz not null,
  evidence_recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  constraint comment_translator_paid_entitlements_billing_reference_check check (
    billing_user_reference_id ~ '^ctbill_[a-f0-9]{24}$'
  ),
  constraint comment_translator_paid_entitlements_active_state_check check (
    billing_state = 'paid-inactive'
    or (subscription_status in ('active', 'trialing') and billing_state = 'paid-active')
  ),
  constraint comment_translator_paid_entitlements_active_references_check check (
    billing_state <> 'paid-active'
    or (stripe_customer_reference_id is not null and stripe_subscription_reference_id is not null and current_period_end is not null)
  )
);

alter table public.comment_translator_paid_entitlements enable row level security;

revoke all on table public.comment_translator_paid_entitlements from anon;
revoke all on table public.comment_translator_paid_entitlements from authenticated;
grant all on table public.comment_translator_paid_entitlements to service_role;

drop policy if exists "comment_translator_paid_entitlements_service_role_all"
  on public.comment_translator_paid_entitlements;
create policy "comment_translator_paid_entitlements_service_role_all"
  on public.comment_translator_paid_entitlements
  for all
  to service_role
  using (true)
  with check (true);

create unique index if not exists comment_translator_paid_entitlements_customer_key
  on public.comment_translator_paid_entitlements (stripe_customer_reference_id)
  where stripe_customer_reference_id is not null;

create unique index if not exists comment_translator_paid_entitlements_subscription_key
  on public.comment_translator_paid_entitlements (stripe_subscription_reference_id)
  where stripe_subscription_reference_id is not null;

create unique index if not exists comment_translator_paid_entitlements_evidence_event_key
  on public.comment_translator_paid_entitlements (evidence_event_reference_id);

create or replace function public.apply_comment_translator_paid_entitlement_evidence(
  p_billing_user_reference_id text,
  p_stripe_customer_reference_id text,
  p_stripe_subscription_reference_id text,
  p_subscription_status text,
  p_billing_state text,
  p_current_period_end timestamptz,
  p_evidence_event_reference_id text,
  p_evidence_created_at timestamptz,
  p_evidence_recorded_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_rows integer;
begin
  insert into public.comment_translator_paid_entitlements (
    billing_user_reference_id, stripe_customer_reference_id, stripe_subscription_reference_id,
    subscription_status, billing_state, current_period_end, evidence_source,
    evidence_event_reference_id, evidence_created_at, evidence_recorded_at, updated_at
  ) values (
    p_billing_user_reference_id, p_stripe_customer_reference_id, p_stripe_subscription_reference_id,
    p_subscription_status, p_billing_state, p_current_period_end, 'signed-stripe-webhook',
    p_evidence_event_reference_id, p_evidence_created_at, p_evidence_recorded_at, p_evidence_recorded_at
  )
  on conflict (billing_user_reference_id) do update set
    stripe_customer_reference_id = excluded.stripe_customer_reference_id,
    stripe_subscription_reference_id = excluded.stripe_subscription_reference_id,
    subscription_status = excluded.subscription_status,
    billing_state = excluded.billing_state,
    current_period_end = excluded.current_period_end,
    evidence_event_reference_id = excluded.evidence_event_reference_id,
    evidence_created_at = excluded.evidence_created_at,
    evidence_recorded_at = excluded.evidence_recorded_at,
    updated_at = excluded.updated_at
  where excluded.evidence_created_at > comment_translator_paid_entitlements.evidence_created_at
    or (
      excluded.evidence_created_at = comment_translator_paid_entitlements.evidence_created_at
      and comment_translator_paid_entitlements.billing_state = 'paid-active'
      and excluded.billing_state = 'paid-inactive'
    );

  get diagnostics changed_rows = row_count;
  return changed_rows > 0;
end;
$$;

revoke all on function public.apply_comment_translator_paid_entitlement_evidence(
  text, text, text, text, text, timestamptz, text, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_comment_translator_paid_entitlement_evidence(
  text, text, text, text, text, timestamptz, text, timestamptz, timestamptz
) to service_role;

comment on table public.comment_translator_paid_entitlements is
  'Server-owned Creator paid entitlement rows derived only from verified signed billing webhook evidence. Service-role only.';
comment on column public.comment_translator_paid_entitlements.billing_user_reference_id is
  'Private deterministic server reference used for entitlement access decisions. Never browser or operator output.';
comment on column public.comment_translator_paid_entitlements.evidence_source is
  'Only signed-stripe-webhook evidence may create or update paid entitlement state.';
comment on function public.apply_comment_translator_paid_entitlement_evidence(
  text, text, text, text, text, timestamptz, text, timestamptz, timestamptz
) is 'Atomically ignores stale or replayed signed billing evidence; inactive state wins timestamp ties.';
