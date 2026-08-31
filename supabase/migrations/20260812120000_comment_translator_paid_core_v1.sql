-- Comment Translator Paid Core v1 durable control plane.
-- This migration is reviewable source only. It is not applied to any remote
-- Supabase project by this task. Existing Free tables are not modified.

create table if not exists public.comment_translator_paid_customers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  created_at timestamptz not null default now(),
  constraint comment_translator_paid_customers_owner_key unique (owner_user_id),
  constraint comment_translator_paid_customers_id_owner_key unique (id, owner_user_id),
  constraint comment_translator_paid_customers_id_owner_stripe_key unique (id, owner_user_id, stripe_customer_id),
  constraint comment_translator_paid_customers_stripe_key unique (stripe_customer_id),
  constraint comment_translator_paid_customers_stripe_nonempty check (length(trim(stripe_customer_id)) > 0)
);

create table if not exists public.comment_translator_paid_billing_lifecycles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  customer_binding_id uuid not null references public.comment_translator_paid_customers(id) on delete cascade,
  lifecycle_state text not null check (
    lifecycle_state in (
      'checkout_hold',
      'incomplete',
      'active',
      'cancel_at_period_end',
      'past_due',
      'unpaid',
      'dispute',
      'cancel_pending',
      'paid_unentitled_reconciliation',
      'refund_reconciliation',
      'dispute_reconciliation',
      'expire_required',
      'incomplete_expired',
      'canceled',
      'terminated'
    )
  ),
  is_terminal boolean not null default false,
  payment_failure_started_at timestamptz,
  last_observed_subscription_status text,
  next_reconcile_at timestamptz,
  reconcile_lease_until timestamptz,
  reconcile_lease_token uuid,
  projection_lease_until timestamptz,
  projection_lease_token uuid,
  reconcile_attempt_count integer not null default 0 check (reconcile_attempt_count >= 0),
  reconcile_backoff_seconds integer not null default 60 check (reconcile_backoff_seconds between 60 and 21600),
  last_reconcile_error_class text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_lifecycles_terminal_shape check (
    (is_terminal and lifecycle_state in ('incomplete_expired', 'canceled', 'terminated'))
    or (not is_terminal and lifecycle_state not in ('incomplete_expired', 'canceled', 'terminated'))
  ),
  constraint comment_translator_paid_lifecycles_id_owner_key unique (id, owner_user_id),
  constraint comment_translator_paid_lifecycles_id_customer_owner_key unique (id, customer_binding_id, owner_user_id),
  constraint comment_translator_paid_lifecycles_customer_owner_fk foreign key (customer_binding_id, owner_user_id)
    references public.comment_translator_paid_customers(id, owner_user_id) on delete cascade
);

create table if not exists public.comment_translator_paid_checkout_holds (
  id uuid primary key default gen_random_uuid(),
  lifecycle_id uuid not null references public.comment_translator_paid_billing_lifecycles(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  hold_state text not null check (hold_state in ('held', 'expire_required', 'converted', 'released')),
  checkout_expires_at_target timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_checkout_holds_lifecycle_key unique (lifecycle_id),
  constraint comment_translator_paid_checkout_holds_id_lifecycle_owner_key unique (id, lifecycle_id, owner_user_id),
  constraint comment_translator_paid_checkout_holds_lifecycle_owner_fk foreign key (lifecycle_id, owner_user_id)
    references public.comment_translator_paid_billing_lifecycles(id, owner_user_id) on delete cascade,
  constraint comment_translator_paid_checkout_holds_idempotency_key unique (idempotency_key),
  constraint comment_translator_paid_checkout_holds_idempotency_nonempty check (length(trim(idempotency_key)) > 0),
  constraint comment_translator_paid_checkout_holds_release_shape check (
    (hold_state = 'released' and released_at is not null)
    or (hold_state <> 'released' and released_at is null)
  )
);

create table if not exists public.comment_translator_paid_checkout_session_bindings (
  id uuid primary key default gen_random_uuid(),
  lifecycle_id uuid not null references public.comment_translator_paid_billing_lifecycles(id) on delete cascade,
  hold_id uuid not null references public.comment_translator_paid_checkout_holds(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  customer_binding_id uuid not null references public.comment_translator_paid_customers(id) on delete cascade,
  stripe_checkout_session_id text not null,
  stripe_customer_id text not null,
  stripe_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint comment_translator_paid_checkout_session_lifecycle_key unique (lifecycle_id),
  constraint comment_translator_paid_checkout_session_hold_key unique (hold_id),
  constraint comment_translator_paid_checkout_session_stripe_key unique (stripe_checkout_session_id),
  constraint comment_translator_paid_checkout_session_lifecycle_owner_fk foreign key (lifecycle_id, owner_user_id)
    references public.comment_translator_paid_billing_lifecycles(id, owner_user_id) on delete cascade,
  constraint ct_paid_checkout_session_lifecycle_customer_owner_fk foreign key (lifecycle_id, customer_binding_id, owner_user_id)
    references public.comment_translator_paid_billing_lifecycles(id, customer_binding_id, owner_user_id) on delete cascade,
  constraint ct_paid_checkout_session_customer_owner_stripe_fk foreign key (customer_binding_id, owner_user_id, stripe_customer_id)
    references public.comment_translator_paid_customers(id, owner_user_id, stripe_customer_id) on delete cascade,
  constraint ct_paid_checkout_session_hold_owner_fk foreign key (hold_id, lifecycle_id, owner_user_id)
    references public.comment_translator_paid_checkout_holds(id, lifecycle_id, owner_user_id) on delete cascade,
  constraint comment_translator_paid_checkout_session_nonempty check (
    length(trim(stripe_checkout_session_id)) > 0 and length(trim(stripe_customer_id)) > 0
  )
);

create table if not exists public.comment_translator_paid_subscription_bindings (
  id uuid primary key default gen_random_uuid(),
  lifecycle_id uuid not null references public.comment_translator_paid_billing_lifecycles(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  customer_binding_id uuid not null references public.comment_translator_paid_customers(id) on delete cascade,
  stripe_subscription_id text not null,
  stripe_customer_id text not null,
  product_id text not null,
  price_id text not null,
  created_at timestamptz not null default now(),
  constraint comment_translator_paid_subscription_lifecycle_key unique (lifecycle_id),
  constraint comment_translator_paid_subscription_id_lifecycle_customer_owner_key unique (id, lifecycle_id, customer_binding_id, owner_user_id),
  constraint comment_translator_paid_subscription_lifecycle_owner_fk foreign key (lifecycle_id, owner_user_id)
    references public.comment_translator_paid_billing_lifecycles(id, owner_user_id) on delete cascade,
  constraint ct_paid_subscription_lifecycle_customer_owner_fk foreign key (lifecycle_id, customer_binding_id, owner_user_id)
    references public.comment_translator_paid_billing_lifecycles(id, customer_binding_id, owner_user_id) on delete cascade,
  constraint ct_paid_subscription_customer_owner_stripe_fk foreign key (customer_binding_id, owner_user_id, stripe_customer_id)
    references public.comment_translator_paid_customers(id, owner_user_id, stripe_customer_id) on delete cascade,
  constraint comment_translator_paid_subscription_stripe_key unique (stripe_subscription_id),
  constraint comment_translator_paid_subscription_values_nonempty check (
    length(trim(stripe_subscription_id)) > 0
    and length(trim(stripe_customer_id)) > 0
    and length(trim(product_id)) > 0
    and length(trim(price_id)) > 0
  )
);

create table if not exists public.comment_translator_paid_external_id_tombstones (
  external_id_kind text not null check (external_id_kind in ('customer', 'checkout_session', 'subscription')),
  external_id text not null,
  created_at timestamptz not null default now(),
  constraint comment_translator_paid_external_id_tombstones_kind_id_key primary key (external_id_kind, external_id),
  constraint comment_translator_paid_external_id_tombstones_nonempty check (length(trim(external_id)) > 0)
);

create table if not exists public.comment_translator_paid_entitlements (
  id uuid primary key default gen_random_uuid(),
  lifecycle_id uuid not null references public.comment_translator_paid_billing_lifecycles(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  customer_binding_id uuid not null references public.comment_translator_paid_customers(id) on delete cascade,
  subscription_binding_id uuid references public.comment_translator_paid_subscription_bindings(id) on delete cascade,
  product_id text not null,
  price_id text not null,
  entitlement_status text not null check (
    entitlement_status in (
      'active',
      'cancel_at_period_end',
      'past_due',
      'unpaid',
      'incomplete',
      'canceled',
      'incomplete_expired',
      'dispute',
      'cancel_pending',
      'paid_unentitled_reconciliation',
      'refund_reconciliation',
      'dispute_reconciliation',
      'inactive'
    )
  ),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  dispute_state text not null default 'none' check (dispute_state in ('none', 'investigating', 'won', 'lost', 'reconciliation')),
  payment_failure_started_at timestamptz,
  projected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_entitlements_lifecycle_key unique (lifecycle_id),
  constraint comment_translator_paid_entitlements_lifecycle_owner_fk foreign key (lifecycle_id, owner_user_id)
    references public.comment_translator_paid_billing_lifecycles(id, owner_user_id) on delete cascade,
  constraint comment_translator_paid_entitlements_customer_owner_fk foreign key (customer_binding_id, owner_user_id)
    references public.comment_translator_paid_customers(id, owner_user_id) on delete cascade,
  constraint ct_paid_entitlement_lifecycle_customer_owner_fk foreign key (lifecycle_id, customer_binding_id, owner_user_id)
    references public.comment_translator_paid_billing_lifecycles(id, customer_binding_id, owner_user_id) on delete cascade,
  constraint ct_paid_entitlement_subscription_lifecycle_customer_owner_fk foreign key (subscription_binding_id, lifecycle_id, customer_binding_id, owner_user_id)
    references public.comment_translator_paid_subscription_bindings(id, lifecycle_id, customer_binding_id, owner_user_id) on delete cascade,
  constraint comment_translator_paid_entitlements_product_nonempty check (length(trim(product_id)) > 0),
  constraint comment_translator_paid_entitlements_price_nonempty check (length(trim(price_id)) > 0),
  constraint comment_translator_paid_entitlements_subscription_shape check (
    entitlement_status not in (
      'active', 'cancel_at_period_end', 'past_due', 'unpaid', 'canceled',
      'incomplete_expired', 'dispute', 'cancel_pending',
      'paid_unentitled_reconciliation', 'refund_reconciliation', 'dispute_reconciliation'
    )
    or subscription_binding_id is not null
  ),
  constraint comment_translator_paid_entitlements_period_shape check (
    (
      subscription_binding_id is null
      and current_period_start is null
      and current_period_end is null
    )
    or (
      subscription_binding_id is not null
      and current_period_start is not null
      and current_period_end is not null
      and isfinite(current_period_start)
      and isfinite(current_period_end)
      and current_period_end > current_period_start
    )
  ),
  constraint comment_translator_paid_entitlements_cancel_shape check (
    cancel_at_period_end = (entitlement_status in ('cancel_at_period_end', 'cancel_pending'))
  )
);

create table if not exists public.comment_translator_paid_stripe_event_receipts (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_type text not null,
  stripe_event_created_at timestamptz not null,
  stripe_object_type text not null,
  receipt_status text not null check (receipt_status in ('processing', 'retryable', 'complete', 'rejected')),
  processing_started_at timestamptz,
  lease_until timestamptz,
  lease_token uuid,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_class text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_stripe_event_receipts_event_key unique (event_id),
  constraint comment_translator_paid_stripe_event_receipts_event_nonempty check (length(trim(event_id)) > 0),
  constraint comment_translator_paid_stripe_event_receipts_type_nonempty check (length(trim(event_type)) > 0),
  constraint comment_translator_paid_stripe_event_receipts_object_type_nonempty check (length(trim(stripe_object_type)) > 0)
);

create table if not exists public.comment_translator_paid_capacity_config (
  config_key boolean primary key default true check (config_key),
  capacity_limit integer not null default 20 check (capacity_limit = 20),
  openai_slot_limit integer not null default 8 check (openai_slot_limit = 8),
  poll_limit integer not null default 720 check (poll_limit = 720),
  billing_period_character_limit bigint not null default 500000 check (billing_period_character_limit = 500000),
  individual_cost_limit_micros bigint not null default 3000000 check (individual_cost_limit_micros = 3000000),
  global_cost_limit_micros bigint not null default 25000000 check (global_cost_limit_micros = 25000000),
  azure_logical_limit_characters bigint not null default 200000 check (azure_logical_limit_characters = 200000),
  physical_limit_characters bigint not null default 2000000 check (physical_limit_characters = 2000000),
  physical_safety_margin_characters bigint not null default 600000 check (physical_safety_margin_characters = 600000),
  openai_limits_configured boolean not null default false,
  openai_rpm_limit integer not null default 0 check (openai_rpm_limit >= 0),
  openai_tpm_limit bigint not null default 0 check (openai_tpm_limit >= 0),
  updated_at timestamptz not null default now()
);

insert into public.comment_translator_paid_capacity_config (config_key)
values (true)
on conflict (config_key) do nothing;

create table if not exists public.comment_translator_paid_capacity_reservations (
  id uuid primary key default gen_random_uuid(),
  lifecycle_id uuid not null references public.comment_translator_paid_billing_lifecycles(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  reservation_state text not null check (reservation_state in ('held', 'consuming', 'released')),
  lifecycle_stage text not null check (
    lifecycle_stage in (
      'checkout_hold',
      'incomplete',
      'active',
      'cancel_at_period_end',
      'payment_failure_hold',
      'dispute',
      'cancel_pending',
      'reconciliation'
    )
  ),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_capacity_one_per_lifecycle_key unique (lifecycle_id),
  constraint comment_translator_paid_capacity_release_shape check (
    (reservation_state = 'released' and released_at is not null)
    or (reservation_state <> 'released' and released_at is null)
  )
);

create table if not exists public.comment_translator_paid_billing_period_usage (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  character_limit bigint not null default 500000 check (character_limit = 500000),
  reserved_input_characters bigint not null default 0 check (reserved_input_characters >= 0),
  committed_input_characters bigint not null default 0 check (committed_input_characters >= 0),
  period_state text not null default 'open' check (period_state in ('open', 'closing', 'closed')),
  period_closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_billing_period_usage_key unique (owner_user_id, period_start, period_end),
  constraint comment_translator_paid_billing_period_usage_period_shape check (period_end > period_start),
  constraint comment_translator_paid_billing_period_usage_limit_shape check (
    reserved_input_characters + committed_input_characters <= character_limit
  ),
  constraint comment_translator_paid_billing_period_usage_state_shape check (
    (period_state = 'closed' and period_closed_at is not null)
    or (period_state <> 'closed' and period_closed_at is null)
  )
);

create table if not exists public.comment_translator_paid_owner_cost_buckets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  cost_limit_micros bigint not null default 3000000 check (cost_limit_micros = 3000000),
  reserved_cost_micros bigint not null default 0 check (reserved_cost_micros >= 0),
  committed_cost_micros bigint not null default 0 check (committed_cost_micros >= 0),
  period_state text not null default 'open' check (period_state in ('open', 'closing', 'closed')),
  period_closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_owner_cost_bucket_key unique (owner_user_id, period_start, period_end),
  constraint comment_translator_paid_owner_cost_period_shape check (period_end > period_start),
  constraint comment_translator_paid_owner_cost_limit_shape check (
    reserved_cost_micros + committed_cost_micros <= cost_limit_micros
  ),
  constraint comment_translator_paid_owner_cost_state_shape check (
    (period_state = 'closed' and period_closed_at is not null)
    or (period_state <> 'closed' and period_closed_at is null)
  )
);

create table if not exists public.comment_translator_paid_global_cost_buckets (
  id uuid primary key default gen_random_uuid(),
  utc_month date not null,
  cost_limit_micros bigint not null default 25000000 check (cost_limit_micros = 25000000),
  reserved_cost_micros bigint not null default 0 check (reserved_cost_micros >= 0),
  committed_cost_micros bigint not null default 0 check (committed_cost_micros >= 0),
  bucket_state text not null default 'open' check (bucket_state in ('open', 'closing', 'closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_global_cost_bucket_key unique (utc_month),
  constraint comment_translator_paid_global_cost_month_start check (date_trunc('month', utc_month)::date = utc_month),
  constraint comment_translator_paid_global_cost_limit_shape check (
    reserved_cost_micros + committed_cost_micros <= cost_limit_micros
  ),
  constraint comment_translator_paid_global_cost_state_shape check (
    (bucket_state = 'closed' and closed_at is not null)
    or (bucket_state <> 'closed' and closed_at is null)
  )
);

create table if not exists public.comment_translator_paid_azure_fallback_buckets (
  id uuid primary key default gen_random_uuid(),
  utc_month date not null,
  logical_limit_characters bigint not null default 200000 check (logical_limit_characters = 200000),
  physical_limit_characters bigint not null default 2000000 check (physical_limit_characters = 2000000),
  physical_safety_margin_characters bigint not null default 600000 check (physical_safety_margin_characters = 600000),
  free_usage_characters bigint not null default 0 check (free_usage_characters >= 0),
  reserved_paid_characters bigint not null default 0 check (reserved_paid_characters >= 0),
  committed_paid_characters bigint not null default 0 check (committed_paid_characters >= 0),
  bucket_state text not null default 'open' check (bucket_state in ('open', 'closing', 'closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_azure_fallback_bucket_key unique (utc_month),
  constraint comment_translator_paid_azure_fallback_month_start check (date_trunc('month', utc_month)::date = utc_month),
  constraint comment_translator_paid_azure_fallback_logical_shape check (
    reserved_paid_characters + committed_paid_characters <= logical_limit_characters
  ),
  constraint comment_translator_paid_azure_fallback_state_shape check (
    (bucket_state = 'closed' and closed_at is not null)
    or (bucket_state <> 'closed' and closed_at is null)
  )
);

create table if not exists public.comment_translator_paid_provider_circuits (
  provider text primary key check (provider in ('openai', 'azure_fallback')),
  circuit_state text not null check (circuit_state in ('closed', 'degraded', 'half_open', 'disabled')),
  failure_count integer not null default 0 check (failure_count >= 0),
  window_started_at timestamptz,
  degraded_until timestamptz,
  probe_attempt_id text,
  probe_lease_until timestamptz,
  last_error_class text,
  updated_at timestamptz not null default now()
);

insert into public.comment_translator_paid_provider_circuits (provider, circuit_state)
values ('openai', 'closed'), ('azure_fallback', 'closed')
on conflict (provider) do nothing;

create table if not exists public.comment_translator_paid_session_leases (
  id uuid primary key default gen_random_uuid(),
  session_reference_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  lease_state text not null check (lease_state in ('active', 'uncertain', 'released')),
  provider_attempt text not null,
  lease_until timestamptz not null,
  lease_token uuid not null,
  attempt_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_session_lease_session_key unique (session_reference_id),
  constraint comment_translator_paid_session_lease_attempt_key unique (attempt_id),
  constraint comment_translator_paid_session_lease_reference_nonempty check (length(trim(session_reference_id)) > 0),
  constraint comment_translator_paid_session_lease_attempt_nonempty check (length(trim(attempt_id)) > 0)
);

create table if not exists public.comment_translator_paid_openai_slots (
  id uuid primary key default gen_random_uuid(),
  session_reference_id text not null,
  attempt_id text not null,
  provider_attempt text not null,
  slot_state text not null check (slot_state in ('active', 'uncertain', 'released')),
  lease_until timestamptz not null,
  lease_token uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_openai_slot_attempt_key unique (attempt_id, provider_attempt),
  constraint comment_translator_paid_openai_slot_provider_attempt_nonempty check (length(trim(provider_attempt)) > 0)
);

create table if not exists public.comment_translator_paid_openai_minute_buckets (
  minute_start timestamptz primary key,
  reserved_requests integer not null default 0 check (reserved_requests >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_translator_paid_openai_rate_reservations (
  id uuid primary key default gen_random_uuid(),
  attempt_id text not null,
  provider_attempt text not null,
  minute_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  token_count bigint not null check (token_count > 0),
  reservation_state text not null check (reservation_state in ('reserved', 'completed', 'released', 'uncertain')),
  reserved_at timestamptz not null,
  expires_at timestamptz not null,
  constraint comment_translator_paid_openai_rate_attempt_key unique (attempt_id, provider_attempt),
  constraint comment_translator_paid_openai_rate_provider_attempt_nonempty check (length(trim(provider_attempt)) > 0)
);

create table if not exists public.comment_translator_paid_poll_budget_buckets (
  utc_day date primary key,
  daily_budget integer not null check (daily_budget > 0),
  reserved_polls integer not null default 0 check (reserved_polls >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_translator_paid_poll_reservations (
  id uuid primary key default gen_random_uuid(),
  session_reference_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  utc_day date not null,
  reserved_polls integer not null check (reserved_polls > 0 and reserved_polls <= 720),
  created_at timestamptz not null default now(),
  constraint comment_translator_paid_poll_reservation_session_day_key unique (session_reference_id, utc_day)
);

create table if not exists public.comment_translator_paid_logical_attempts (
  attempt_id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  billing_period_usage_id uuid not null references public.comment_translator_paid_billing_period_usage(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  input_characters bigint not null check (input_characters > 0),
  logical_state text not null check (logical_state in ('reserved', 'committed', 'released')),
  committed_input_characters bigint not null default 0 check (committed_input_characters >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_logical_attempt_id_shape check (attempt_id ~ '^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$'),
  constraint comment_translator_paid_logical_attempt_period_shape check (period_end > period_start),
  constraint comment_translator_paid_logical_attempt_commit_shape check (
    (logical_state = 'committed' and committed_input_characters > 0)
    or (logical_state <> 'committed' and committed_input_characters = 0)
  )
);

create table if not exists public.comment_translator_paid_attempt_receipts (
  id uuid primary key default gen_random_uuid(),
  attempt_id text not null,
  provider_attempt text not null,
  provider_kind text not null check (provider_kind in ('openai_attempt', 'azure_direct_fallback')),
  session_reference_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  utc_month date not null,
  attempt_state text not null check (attempt_state in ('reserved', 'uncertain', 'committed', 'released', 'expired')),
  provider_failure_class text check (
    provider_failure_class is null
    or provider_failure_class in ('network', 'timeout', 'rate-limit', 'server-error', 'invalid-response', 'quota', 'configuration', 'policy')
  ),
  expires_at timestamptz not null,
  billing_period_usage_id uuid references public.comment_translator_paid_billing_period_usage(id) on delete cascade,
  owner_cost_bucket_id uuid references public.comment_translator_paid_owner_cost_buckets(id) on delete cascade,
  global_cost_bucket_id uuid references public.comment_translator_paid_global_cost_buckets(id),
  azure_bucket_id uuid references public.comment_translator_paid_azure_fallback_buckets(id),
  reserved_input_characters bigint not null default 0 check (reserved_input_characters >= 0),
  committed_input_characters bigint not null default 0 check (committed_input_characters >= 0),
  requested_input_characters bigint not null default 0 check (requested_input_characters >= 0),
  reserved_cost_micros bigint not null default 0 check (reserved_cost_micros >= 0),
  committed_cost_micros bigint not null default 0 check (committed_cost_micros >= 0),
  requested_cost_micros bigint not null default 0 check (requested_cost_micros >= 0),
  requested_request_count integer not null default 0 check (requested_request_count >= 0),
  requested_token_count bigint not null default 0 check (requested_token_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_attempt_receipts_key unique (attempt_id, provider_attempt),
  constraint comment_translator_paid_attempt_receipts_attempt_id_shape check (attempt_id ~ '^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$'),
  constraint comment_translator_paid_attempt_receipts_nonempty check (length(trim(attempt_id)) > 0),
  constraint comment_translator_paid_attempt_receipts_provider_attempt_nonempty check (length(trim(provider_attempt)) > 0),
  constraint comment_translator_paid_attempt_receipts_session_nonempty check (length(trim(session_reference_id)) > 0)
);

create table if not exists public.comment_translator_paid_provider_detail_source_receipts (
  attempt_id text not null,
  provider_attempt text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, provider_attempt),
  constraint comment_translator_paid_provider_detail_source_attempt_id_shape check (attempt_id ~ '^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$'),
  constraint comment_translator_paid_provider_detail_source_attempt_nonempty check (length(trim(attempt_id)) > 0),
  constraint comment_translator_paid_provider_detail_source_provider_attempt_nonempty check (length(trim(provider_attempt)) > 0)
);

create table if not exists public.comment_translator_paid_consents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('terms', 'privacy', 'paid_conditions')),
  document_version text not null,
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint comment_translator_paid_consents_key unique (owner_user_id, document_type, document_version),
  constraint comment_translator_paid_consents_version_nonempty check (length(trim(document_version)) > 0)
);

create table if not exists public.comment_translator_paid_provider_hourly_details (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai', 'azure_fallback')),
  utc_hour timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  session_count integer not null default 0 check (session_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  input_characters bigint not null default 0 check (input_characters >= 0),
  output_characters bigint not null default 0 check (output_characters >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  estimated_cost_micros bigint not null default 0 check (estimated_cost_micros >= 0),
  success_count integer not null default 0 check (success_count >= 0),
  failure_count integer not null default 0 check (failure_count >= 0),
  latency_up_to_100_ms_count integer not null default 0 check (latency_up_to_100_ms_count >= 0),
  latency_101_to_250_ms_count integer not null default 0 check (latency_101_to_250_ms_count >= 0),
  latency_251_to_500_ms_count integer not null default 0 check (latency_251_to_500_ms_count >= 0),
  latency_501_to_1000_ms_count integer not null default 0 check (latency_501_to_1000_ms_count >= 0),
  latency_1001_to_2500_ms_count integer not null default 0 check (latency_1001_to_2500_ms_count >= 0),
  latency_2501_to_5000_ms_count integer not null default 0 check (latency_2501_to_5000_ms_count >= 0),
  latency_5001_to_10000_ms_count integer not null default 0 check (latency_5001_to_10000_ms_count >= 0),
  latency_over_10000_ms_count integer not null default 0 check (latency_over_10000_ms_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_provider_hourly_key unique (owner_user_id, provider, utc_hour),
  constraint comment_translator_paid_provider_hourly_hour_shape check (date_trunc('hour', utc_hour) = utc_hour),
  constraint comment_translator_paid_provider_hourly_latency_shape check (
    latency_up_to_100_ms_count + latency_101_to_250_ms_count
      + latency_251_to_500_ms_count + latency_501_to_1000_ms_count
      + latency_1001_to_2500_ms_count + latency_2501_to_5000_ms_count
      + latency_5001_to_10000_ms_count + latency_over_10000_ms_count
      <= request_count
  )
);

create table if not exists public.comment_translator_paid_session_summaries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  session_reference_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  stop_reason text,
  provider_request_count integer not null default 0 check (provider_request_count >= 0),
  translated_message_count integer not null default 0 check (translated_message_count >= 0),
  input_characters bigint not null default 0 check (input_characters >= 0),
  output_characters bigint not null default 0 check (output_characters >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_paid_session_summary_session_key unique (session_reference_id),
  constraint comment_translator_paid_session_summary_reference_nonempty check (length(trim(session_reference_id)) > 0),
  constraint comment_translator_paid_session_summary_period_shape check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists comment_translator_paid_one_non_terminal_lifecycle_per_owner_idx
  on public.comment_translator_paid_billing_lifecycles (owner_user_id)
  where is_terminal = false;

create index if not exists comment_translator_paid_reconciler_due_idx
  on public.comment_translator_paid_billing_lifecycles (next_reconcile_at, reconcile_lease_until)
  where is_terminal = false and next_reconcile_at is not null;

create unique index if not exists comment_translator_paid_session_one_active_lease_idx
  on public.comment_translator_paid_session_leases (session_reference_id)
  where lease_state in ('active', 'uncertain');

create index if not exists comment_translator_paid_attempt_expiry_idx
  on public.comment_translator_paid_attempt_receipts (expires_at)
  where attempt_state in ('reserved', 'uncertain');

create index if not exists comment_translator_paid_logical_attempt_expiry_idx
  on public.comment_translator_paid_logical_attempts (expires_at);

create index if not exists comment_translator_paid_provider_detail_source_expiry_idx
  on public.comment_translator_paid_provider_detail_source_receipts (expires_at);

create index if not exists comment_translator_paid_provider_hourly_owner_idx
  on public.comment_translator_paid_provider_hourly_details (owner_user_id, utc_hour desc);

create or replace function public.comment_translator_paid_immutable_binding_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    -- Direct child DELETE runs at depth 1 and remains forbidden. The only
    -- deletion exception is the nested FK cascade initiated by auth.users.
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

create or replace function public.comment_translator_paid_external_id_tombstone_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_external_id_kind text;
  v_external_id text;
begin
  if tg_op <> 'DELETE' or pg_trigger_depth() <= 1 then
    return old;
  end if;

  case tg_table_name
    when 'comment_translator_paid_customers' then
      v_external_id_kind := 'customer';
      v_external_id := old.stripe_customer_id;
    when 'comment_translator_paid_checkout_session_bindings' then
      v_external_id_kind := 'checkout_session';
      v_external_id := old.stripe_checkout_session_id;
    when 'comment_translator_paid_subscription_bindings' then
      v_external_id_kind := 'subscription';
      v_external_id := old.stripe_subscription_id;
    else
      raise exception 'external billing identity tombstone source is not valid';
  end case;

  insert into public.comment_translator_paid_external_id_tombstones (
    external_id_kind,
    external_id
  )
  values (v_external_id_kind, v_external_id)
  on conflict (external_id_kind, external_id) do nothing;
  return old;
end;
$$;

create or replace function public.comment_translator_paid_external_id_reuse_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_external_id_kind text;
  v_external_id text;
begin
  case tg_table_name
    when 'comment_translator_paid_customers' then
      v_external_id_kind := 'customer';
      v_external_id := new.stripe_customer_id;
    when 'comment_translator_paid_checkout_session_bindings' then
      v_external_id_kind := 'checkout_session';
      v_external_id := new.stripe_checkout_session_id;
    when 'comment_translator_paid_subscription_bindings' then
      v_external_id_kind := 'subscription';
      v_external_id := new.stripe_subscription_id;
    else
      raise exception 'external billing identity reuse source is not valid';
  end case;

  if exists (
    select 1
      from public.comment_translator_paid_external_id_tombstones
     where external_id_kind = v_external_id_kind
       and external_id = v_external_id
  ) then
    raise exception 'external billing identity was previously deleted';
  end if;
  return new;
end;
$$;

create or replace function public.comment_translator_paid_entitlement_binding_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- A nullable entitlement may receive its first immutable subscription binding
  -- exactly once. Once bound, the value cannot be cleared or reassigned.
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    raise exception 'entitlement binding is not valid for update';
  end if;
  if old.owner_user_id is distinct from new.owner_user_id
    or old.id is distinct from new.id
    or old.lifecycle_id is distinct from new.lifecycle_id
    or old.customer_binding_id is distinct from new.customer_binding_id
    or old.product_id is distinct from new.product_id
    or old.price_id is distinct from new.price_id
    or (
      old.subscription_binding_id is not null
      and old.subscription_binding_id is distinct from new.subscription_binding_id
    )
  then
    raise exception 'entitlement binding is not valid for update';
  end if;
  return new;
end;
$$;

create or replace function public.comment_translator_paid_lifecycle_binding_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    raise exception 'lifecycle binding is not valid for update';
  end if;
  if old.id is distinct from new.id
    or old.owner_user_id is distinct from new.owner_user_id
    or old.customer_binding_id is distinct from new.customer_binding_id
    or old.created_at is distinct from new.created_at
  then
    raise exception 'lifecycle binding is not valid for update';
  end if;
  return new;
end;
$$;

create or replace function public.comment_translator_paid_checkout_hold_binding_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    raise exception 'checkout hold binding is not valid for update';
  end if;
  if old.id is distinct from new.id
    or old.lifecycle_id is distinct from new.lifecycle_id
    or old.owner_user_id is distinct from new.owner_user_id
    or old.idempotency_key is distinct from new.idempotency_key
    or old.checkout_expires_at_target is distinct from new.checkout_expires_at_target
    or old.created_at is distinct from new.created_at
  then
    raise exception 'checkout hold binding is not valid for update';
  end if;
  return new;
end;
$$;

drop trigger if exists comment_translator_paid_customers_immutable_trigger on public.comment_translator_paid_customers;
drop trigger if exists comment_translator_paid_external_id_tombstone_customer_trigger on public.comment_translator_paid_customers;
create trigger comment_translator_paid_external_id_tombstone_customer_trigger
before delete on public.comment_translator_paid_customers
for each row execute function public.comment_translator_paid_external_id_tombstone_guard();
drop trigger if exists comment_translator_paid_external_id_reuse_customer_trigger on public.comment_translator_paid_customers;
create trigger comment_translator_paid_external_id_reuse_customer_trigger
before insert on public.comment_translator_paid_customers
for each row execute function public.comment_translator_paid_external_id_reuse_guard();
create trigger comment_translator_paid_customers_immutable_trigger
before update or delete on public.comment_translator_paid_customers
for each row execute function public.comment_translator_paid_immutable_binding_guard();

drop trigger if exists comment_translator_paid_lifecycle_binding_trigger on public.comment_translator_paid_billing_lifecycles;
create trigger comment_translator_paid_lifecycle_binding_trigger
before update or delete on public.comment_translator_paid_billing_lifecycles
for each row execute function public.comment_translator_paid_lifecycle_binding_guard();

drop trigger if exists comment_translator_paid_checkout_hold_immutable_delete_trigger on public.comment_translator_paid_checkout_holds;
drop trigger if exists comment_translator_paid_checkout_hold_binding_trigger on public.comment_translator_paid_checkout_holds;
create trigger comment_translator_paid_checkout_hold_binding_trigger
before update or delete on public.comment_translator_paid_checkout_holds
for each row execute function public.comment_translator_paid_checkout_hold_binding_guard();

drop trigger if exists comment_translator_paid_checkout_session_immutable_trigger on public.comment_translator_paid_checkout_session_bindings;
drop trigger if exists comment_translator_paid_external_id_tombstone_checkout_session_trigger on public.comment_translator_paid_checkout_session_bindings;
create trigger comment_translator_paid_external_id_tombstone_checkout_session_trigger
before delete on public.comment_translator_paid_checkout_session_bindings
for each row execute function public.comment_translator_paid_external_id_tombstone_guard();
drop trigger if exists comment_translator_paid_external_id_reuse_checkout_session_trigger on public.comment_translator_paid_checkout_session_bindings;
create trigger comment_translator_paid_external_id_reuse_checkout_session_trigger
before insert on public.comment_translator_paid_checkout_session_bindings
for each row execute function public.comment_translator_paid_external_id_reuse_guard();
create trigger comment_translator_paid_checkout_session_immutable_trigger
before update or delete on public.comment_translator_paid_checkout_session_bindings
for each row execute function public.comment_translator_paid_immutable_binding_guard();

drop trigger if exists comment_translator_paid_subscription_immutable_trigger on public.comment_translator_paid_subscription_bindings;
drop trigger if exists comment_translator_paid_external_id_tombstone_subscription_trigger on public.comment_translator_paid_subscription_bindings;
create trigger comment_translator_paid_external_id_tombstone_subscription_trigger
before delete on public.comment_translator_paid_subscription_bindings
for each row execute function public.comment_translator_paid_external_id_tombstone_guard();
drop trigger if exists comment_translator_paid_external_id_reuse_subscription_trigger on public.comment_translator_paid_subscription_bindings;
create trigger comment_translator_paid_external_id_reuse_subscription_trigger
before insert on public.comment_translator_paid_subscription_bindings
for each row execute function public.comment_translator_paid_external_id_reuse_guard();
create trigger comment_translator_paid_subscription_immutable_trigger
before update or delete on public.comment_translator_paid_subscription_bindings
for each row execute function public.comment_translator_paid_immutable_binding_guard();

drop trigger if exists comment_translator_paid_consents_immutable_trigger on public.comment_translator_paid_consents;
create trigger comment_translator_paid_consents_immutable_trigger
before update or delete on public.comment_translator_paid_consents
for each row execute function public.comment_translator_paid_immutable_binding_guard();

drop trigger if exists comment_translator_paid_entitlement_binding_trigger on public.comment_translator_paid_entitlements;
create trigger comment_translator_paid_entitlement_binding_trigger
before update or delete on public.comment_translator_paid_entitlements
for each row execute function public.comment_translator_paid_entitlement_binding_guard();

alter table public.comment_translator_paid_customers enable row level security;
alter table public.comment_translator_paid_billing_lifecycles enable row level security;
alter table public.comment_translator_paid_checkout_holds enable row level security;
alter table public.comment_translator_paid_checkout_session_bindings enable row level security;
alter table public.comment_translator_paid_subscription_bindings enable row level security;
alter table public.comment_translator_paid_external_id_tombstones enable row level security;
alter table public.comment_translator_paid_entitlements enable row level security;
alter table public.comment_translator_paid_stripe_event_receipts enable row level security;
alter table public.comment_translator_paid_capacity_config enable row level security;
alter table public.comment_translator_paid_capacity_reservations enable row level security;
alter table public.comment_translator_paid_billing_period_usage enable row level security;
alter table public.comment_translator_paid_owner_cost_buckets enable row level security;
alter table public.comment_translator_paid_global_cost_buckets enable row level security;
alter table public.comment_translator_paid_azure_fallback_buckets enable row level security;
alter table public.comment_translator_paid_provider_circuits enable row level security;
alter table public.comment_translator_paid_session_leases enable row level security;
alter table public.comment_translator_paid_openai_slots enable row level security;
alter table public.comment_translator_paid_openai_minute_buckets enable row level security;
alter table public.comment_translator_paid_openai_rate_reservations enable row level security;
alter table public.comment_translator_paid_poll_budget_buckets enable row level security;
alter table public.comment_translator_paid_poll_reservations enable row level security;
alter table public.comment_translator_paid_logical_attempts enable row level security;
alter table public.comment_translator_paid_attempt_receipts enable row level security;
alter table public.comment_translator_paid_provider_detail_source_receipts enable row level security;
alter table public.comment_translator_paid_consents enable row level security;
alter table public.comment_translator_paid_provider_hourly_details enable row level security;
alter table public.comment_translator_paid_session_summaries enable row level security;

revoke all on table public.comment_translator_paid_customers from anon;
revoke all on table public.comment_translator_paid_customers from authenticated;
revoke all on table public.comment_translator_paid_billing_lifecycles from anon;
revoke all on table public.comment_translator_paid_billing_lifecycles from authenticated;
revoke all on table public.comment_translator_paid_checkout_holds from anon;
revoke all on table public.comment_translator_paid_checkout_holds from authenticated;
revoke all on table public.comment_translator_paid_checkout_session_bindings from anon;
revoke all on table public.comment_translator_paid_checkout_session_bindings from authenticated;
revoke all on table public.comment_translator_paid_subscription_bindings from anon;
revoke all on table public.comment_translator_paid_subscription_bindings from authenticated;
revoke all on table public.comment_translator_paid_external_id_tombstones from anon;
revoke all on table public.comment_translator_paid_external_id_tombstones from authenticated;
revoke all on table public.comment_translator_paid_entitlements from anon;
revoke all on table public.comment_translator_paid_entitlements from authenticated;
revoke all on table public.comment_translator_paid_stripe_event_receipts from anon;
revoke all on table public.comment_translator_paid_stripe_event_receipts from authenticated;
revoke all on table public.comment_translator_paid_capacity_config from anon;
revoke all on table public.comment_translator_paid_capacity_config from authenticated;
revoke all on table public.comment_translator_paid_capacity_reservations from anon;
revoke all on table public.comment_translator_paid_capacity_reservations from authenticated;
revoke all on table public.comment_translator_paid_billing_period_usage from anon;
revoke all on table public.comment_translator_paid_billing_period_usage from authenticated;
revoke all on table public.comment_translator_paid_owner_cost_buckets from anon;
revoke all on table public.comment_translator_paid_owner_cost_buckets from authenticated;
revoke all on table public.comment_translator_paid_global_cost_buckets from anon;
revoke all on table public.comment_translator_paid_global_cost_buckets from authenticated;
revoke all on table public.comment_translator_paid_azure_fallback_buckets from anon;
revoke all on table public.comment_translator_paid_azure_fallback_buckets from authenticated;
revoke all on table public.comment_translator_paid_provider_circuits from anon;
revoke all on table public.comment_translator_paid_provider_circuits from authenticated;
revoke all on table public.comment_translator_paid_session_leases from anon;
revoke all on table public.comment_translator_paid_session_leases from authenticated;
revoke all on table public.comment_translator_paid_openai_slots from anon;
revoke all on table public.comment_translator_paid_openai_slots from authenticated;
revoke all on table public.comment_translator_paid_openai_minute_buckets from anon;
revoke all on table public.comment_translator_paid_openai_minute_buckets from authenticated;
revoke all on table public.comment_translator_paid_openai_rate_reservations from anon;
revoke all on table public.comment_translator_paid_openai_rate_reservations from authenticated;
revoke all on table public.comment_translator_paid_poll_budget_buckets from anon;
revoke all on table public.comment_translator_paid_poll_budget_buckets from authenticated;
revoke all on table public.comment_translator_paid_poll_reservations from anon;
revoke all on table public.comment_translator_paid_poll_reservations from authenticated;
revoke all on table public.comment_translator_paid_logical_attempts from anon;
revoke all on table public.comment_translator_paid_logical_attempts from authenticated;
revoke all on table public.comment_translator_paid_attempt_receipts from anon;
revoke all on table public.comment_translator_paid_attempt_receipts from authenticated;
revoke all on table public.comment_translator_paid_provider_detail_source_receipts from anon;
revoke all on table public.comment_translator_paid_provider_detail_source_receipts from authenticated;
revoke all on table public.comment_translator_paid_consents from anon;
revoke all on table public.comment_translator_paid_consents from authenticated;
revoke all on table public.comment_translator_paid_provider_hourly_details from anon;
revoke all on table public.comment_translator_paid_provider_hourly_details from authenticated;
revoke all on table public.comment_translator_paid_session_summaries from anon;
revoke all on table public.comment_translator_paid_session_summaries from authenticated;

create or replace function public.ct_paid_begin_checkout(
  p_owner_user_id uuid,
  p_stripe_customer_id text,
  p_now timestamptz default now()
)
returns table (
  lifecycle_id uuid,
  hold_id uuid,
  customer_binding_id uuid,
  idempotency_key text,
  checkout_expires_at_target timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_customer public.comment_translator_paid_customers%rowtype;
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_capacity public.comment_translator_paid_capacity_reservations%rowtype;
  v_capacity_limit integer;
  v_reserved_count integer;
  v_hold_id uuid;
  v_idempotency_key text;
  v_checkout_expires_at_target timestamptz;
begin
  p_now := statement_timestamp();
  if length(trim(p_stripe_customer_id)) = 0 then
    raise exception 'checkout initialization request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290101);

  select * into v_customer
    from public.comment_translator_paid_customers
   where owner_user_id = p_owner_user_id
   for update;
  if v_customer.id is not null and v_customer.stripe_customer_id <> p_stripe_customer_id then
    raise exception 'customer binding conflict';
  end if;
  if v_customer.id is null then
    if exists (
      select 1 from public.comment_translator_paid_customers
       where stripe_customer_id = p_stripe_customer_id
         and owner_user_id <> p_owner_user_id
    ) then
      raise exception 'customer binding conflict';
    end if;
    insert into public.comment_translator_paid_customers (owner_user_id, stripe_customer_id, created_at)
    values (p_owner_user_id, p_stripe_customer_id, p_now)
    returning * into v_customer;
  end if;

  select * into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where owner_user_id = p_owner_user_id
     and is_terminal = false
   for update;
  if v_lifecycle.id is not null then
    select * into v_hold
      from public.comment_translator_paid_checkout_holds
     where lifecycle_id = v_lifecycle.id
     for update;
    select * into v_capacity
      from public.comment_translator_paid_capacity_reservations
     where lifecycle_id = v_lifecycle.id
     for update;
    if v_lifecycle.customer_binding_id <> v_customer.id
      or v_lifecycle.lifecycle_state <> 'checkout_hold'
      or v_hold.id is null
      or v_hold.owner_user_id <> p_owner_user_id
      or v_hold.hold_state <> 'held'
      or v_capacity.id is null
      or v_capacity.owner_user_id <> p_owner_user_id
      or v_capacity.reservation_state <> 'held'
      or v_capacity.lifecycle_stage <> 'checkout_hold'
    then
      raise exception 'checkout initialization binding conflict';
    end if;
    return query select
      v_lifecycle.id,
      v_hold.id,
      v_customer.id,
      v_hold.idempotency_key,
      v_hold.checkout_expires_at_target;
    return;
  end if;

  select capacity_limit into v_capacity_limit
    from public.comment_translator_paid_capacity_config
   where config_key = true
   for update;
  if v_capacity_limit is null then
    raise exception 'paid capacity configuration is unavailable';
  end if;
  select count(*)::integer into v_reserved_count
    from public.comment_translator_paid_capacity_reservations
   where reservation_state in ('held', 'consuming');
  if v_reserved_count >= v_capacity_limit then
    raise exception 'paid capacity is full';
  end if;

  v_hold_id := gen_random_uuid();
  v_idempotency_key := 'ct-paid-checkout-' || v_hold_id::text;
  v_checkout_expires_at_target := date_trunc('second', p_now) + interval '31 minutes';

  insert into public.comment_translator_paid_billing_lifecycles (
    owner_user_id, customer_binding_id, lifecycle_state, is_terminal,
    next_reconcile_at, created_at, updated_at
  ) values (
    p_owner_user_id, v_customer.id, 'checkout_hold', false,
    v_checkout_expires_at_target, p_now, p_now
  ) returning * into v_lifecycle;

  insert into public.comment_translator_paid_capacity_reservations (
    lifecycle_id, owner_user_id, reservation_state, lifecycle_stage, created_at, updated_at
  ) values (
    v_lifecycle.id, p_owner_user_id, 'held', 'checkout_hold', p_now, p_now
  ) returning * into v_capacity;

  insert into public.comment_translator_paid_checkout_holds (
    id, lifecycle_id, owner_user_id, idempotency_key, hold_state,
    checkout_expires_at_target, created_at, updated_at
  ) values (
    v_hold_id, v_lifecycle.id, p_owner_user_id, v_idempotency_key, 'held',
    v_checkout_expires_at_target, p_now, p_now
  ) returning * into v_hold;

  return query select
    v_lifecycle.id,
    v_hold.id,
    v_customer.id,
    v_hold.idempotency_key,
    v_hold.checkout_expires_at_target;
end;
$$;

create or replace function public.ct_paid_bind_checkout_session(
  p_owner_user_id uuid,
  p_lifecycle_id uuid,
  p_hold_id uuid,
  p_customer_binding_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text,
  p_stripe_expires_at timestamptz,
  p_is_recovery_binding boolean,
  p_idempotency_key text,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_customer public.comment_translator_paid_customers%rowtype;
  v_existing public.comment_translator_paid_checkout_session_bindings%rowtype;
  v_binding_id uuid;
begin
  p_now := statement_timestamp();
  if length(trim(p_stripe_checkout_session_id)) = 0
    or length(trim(p_stripe_customer_id)) = 0
    or p_stripe_expires_at is null
    or p_is_recovery_binding is null
    or p_idempotency_key is null
    or length(trim(p_idempotency_key)) = 0
    or (not p_is_recovery_binding and p_stripe_expires_at <= p_now)
  then
    raise exception 'checkout session binding request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290101);

  select * into v_existing
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
      or hold_id = p_hold_id
      or stripe_checkout_session_id = p_stripe_checkout_session_id
   order by created_at
   limit 1
   for update;
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
  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_lifecycle.customer_binding_id <> p_customer_binding_id
    or v_lifecycle.is_terminal
    or v_hold.id is null
    or v_hold.lifecycle_id <> p_lifecycle_id
    or v_hold.owner_user_id <> p_owner_user_id
    or v_hold.hold_state not in ('held', 'converted')
    or v_hold.checkout_expires_at_target is distinct from p_stripe_expires_at
    or v_hold.idempotency_key is distinct from p_idempotency_key
    or v_lifecycle.lifecycle_state = 'expire_required'
    or v_customer.id is null
    or v_customer.owner_user_id <> p_owner_user_id
    or v_customer.stripe_customer_id <> p_stripe_customer_id
  then
    raise exception 'checkout session binding conflict';
  end if;

  if v_existing.id is not null then
    if v_existing.lifecycle_id <> p_lifecycle_id
      or v_existing.hold_id <> p_hold_id
      or v_existing.owner_user_id <> p_owner_user_id
      or v_existing.customer_binding_id <> p_customer_binding_id
      or v_existing.stripe_checkout_session_id <> p_stripe_checkout_session_id
      or v_existing.stripe_customer_id <> p_stripe_customer_id
      or v_existing.stripe_expires_at is distinct from p_stripe_expires_at
    then
      raise exception 'checkout session binding conflict';
    end if;
    update public.comment_translator_paid_billing_lifecycles
       set next_reconcile_at = p_stripe_expires_at,
           updated_at = p_now
     where id = p_lifecycle_id
       and lifecycle_state in ('checkout_hold', 'incomplete');
    return v_existing.id;
  end if;

  if v_hold.hold_state <> 'held' then
    raise exception 'checkout session binding conflict';
  end if;

  insert into public.comment_translator_paid_checkout_session_bindings (
    lifecycle_id, hold_id, owner_user_id, customer_binding_id,
    stripe_checkout_session_id, stripe_customer_id, stripe_expires_at, created_at
  ) values (
    p_lifecycle_id, p_hold_id, p_owner_user_id, p_customer_binding_id,
    p_stripe_checkout_session_id, p_stripe_customer_id, p_stripe_expires_at, p_now
  ) returning id into v_binding_id;
  update public.comment_translator_paid_billing_lifecycles
     set next_reconcile_at = p_stripe_expires_at,
         updated_at = p_now
   where id = p_lifecycle_id
     and lifecycle_state in ('checkout_hold', 'incomplete');
  return v_binding_id;
end;
$$;

create or replace function public.ct_paid_commit_checkout_redirect(
  p_owner_user_id uuid,
  p_lifecycle_id uuid,
  p_hold_id uuid,
  p_customer_binding_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text,
  p_stripe_expires_at timestamptz,
  p_idempotency_key text,
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
  then
    return false;
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
  select * into v_session
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
      or hold_id = p_hold_id
      or stripe_checkout_session_id = p_stripe_checkout_session_id
   order by created_at
   limit 1
   for update;
  select * into v_subscription
    from public.comment_translator_paid_subscription_bindings
   where lifecycle_id = p_lifecycle_id
   for update;

  return v_lifecycle.id is not null
    and v_lifecycle.owner_user_id = p_owner_user_id
    and v_lifecycle.customer_binding_id = p_customer_binding_id
    and not v_lifecycle.is_terminal
    and v_lifecycle.lifecycle_state in ('checkout_hold', 'incomplete')
    and v_hold.id is not null
    and v_hold.lifecycle_id = p_lifecycle_id
    and v_hold.owner_user_id = p_owner_user_id
    and v_hold.hold_state in ('held', 'converted')
    and v_hold.idempotency_key is not distinct from p_idempotency_key
    and v_hold.checkout_expires_at_target is not distinct from p_stripe_expires_at
    and v_customer.id is not null
    and v_customer.owner_user_id = p_owner_user_id
    and v_customer.stripe_customer_id = p_stripe_customer_id
    and v_session.id is not null
    and v_session.lifecycle_id = p_lifecycle_id
    and v_session.hold_id = p_hold_id
    and v_session.owner_user_id = p_owner_user_id
    and v_session.customer_binding_id = p_customer_binding_id
    and v_session.stripe_checkout_session_id = p_stripe_checkout_session_id
    and v_session.stripe_customer_id = p_stripe_customer_id
    and v_session.stripe_expires_at is not distinct from p_stripe_expires_at
    and v_subscription.id is null;
end;
$$;

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

  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_lifecycle.customer_binding_id <> p_customer_binding_id
    or v_lifecycle.is_terminal
    or v_lifecycle.lifecycle_state not in ('checkout_hold', 'expire_required')
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
  if v_lifecycle.lifecycle_state <> 'checkout_hold'
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
  if p_stripe_session_status is distinct from 'expired'
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
         next_reconcile_at = null, reconcile_lease_until = null,
         reconcile_lease_token = null, last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id;
  update public.comment_translator_paid_capacity_reservations
     set reservation_state = 'released', released_at = p_now, updated_at = p_now
   where id = v_capacity.id;
  return true;
end;
$$;

create or replace function public.ct_paid_claim_stripe_event(
  p_event_id text,
  p_event_type text,
  p_stripe_event_created_at timestamptz,
  p_object_type text,
  p_now timestamptz default now()
)
returns table (claim_status text, lease_token uuid, attempt_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.comment_translator_paid_stripe_event_receipts%rowtype;
  v_new_lease_token uuid;
begin
  p_now := statement_timestamp();
  if length(trim(p_event_id)) = 0 or length(trim(p_event_type)) = 0 or length(trim(p_object_type)) = 0 then
    raise exception 'event identity is not valid';
  end if;

  insert into public.comment_translator_paid_stripe_event_receipts (
    event_id,
    event_type,
    stripe_event_created_at,
    stripe_object_type,
    receipt_status,
    attempt_count
  )
  values (
    p_event_id,
    p_event_type,
    p_stripe_event_created_at,
    p_object_type,
    'retryable',
    0
  )
  on conflict (event_id) do nothing;

  select *
    into v_existing
    from public.comment_translator_paid_stripe_event_receipts
   where event_id = p_event_id
   for update;

  if v_existing.event_type <> p_event_type
    or v_existing.stripe_event_created_at is distinct from p_stripe_event_created_at
    or v_existing.stripe_object_type <> p_object_type
  then
    return query select 'rejected'::text, null::uuid, v_existing.attempt_count;
    return;
  end if;

  if v_existing.receipt_status in ('complete', 'rejected') then
    return query select v_existing.receipt_status, v_existing.lease_token, v_existing.attempt_count;
    return;
  end if;

  if v_existing.receipt_status = 'processing'
    and v_existing.lease_until is not null
    and v_existing.lease_until > p_now
  then
    return query select 'processing'::text, null::uuid, v_existing.attempt_count;
    return;
  end if;

  v_new_lease_token := gen_random_uuid();
  update public.comment_translator_paid_stripe_event_receipts
     set receipt_status = 'processing',
         processing_started_at = p_now,
         lease_until = p_now + interval '120 seconds',
         lease_token = v_new_lease_token,
         attempt_count = v_existing.attempt_count + 1,
         last_error_class = null,
         updated_at = p_now
   where event_id = p_event_id;

  return query
    select 'processing'::text, v_new_lease_token, v_existing.attempt_count + 1;
end;
$$;

create or replace function public.ct_paid_finalize_stripe_event(
  p_event_id text,
  p_lease_token uuid,
  p_receipt_status text,
  p_error_class text default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  if p_receipt_status not in ('retryable', 'complete', 'rejected') then
    raise exception 'receipt status is not valid';
  end if;

  if p_error_class is not null and p_error_class not in (
    'event-identity-conflict',
    'binding-conflict',
    'object-retrieval-failed',
    'database-transaction-failed',
    'lease-conflict',
    'unknown-event-type'
  ) then
    raise exception 'error class is not valid';
  end if;

  update public.comment_translator_paid_stripe_event_receipts
     set receipt_status = p_receipt_status,
         lease_until = null,
         lease_token = null,
         last_error_class = p_error_class,
         updated_at = p_now
   where event_id = p_event_id
     and receipt_status = 'processing'
     and lease_token = p_lease_token
     and lease_until > p_now;

  if not found then
    raise exception 'stale lease token is not valid for update';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_read_entitlement(
  p_owner_user_id uuid,
  p_lifecycle_id uuid default null
)
returns setof public.comment_translator_paid_entitlements
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select e.*
    from public.comment_translator_paid_entitlements e
    join public.comment_translator_paid_billing_lifecycles l
      on l.id = e.lifecycle_id
   where e.owner_user_id = p_owner_user_id
     and (
       (p_lifecycle_id is not null and e.lifecycle_id = p_lifecycle_id)
       or (p_lifecycle_id is null and l.is_terminal = false)
     )
   limit 1;
$$;

create or replace function public.ct_paid_reserve_capacity(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_lifecycle_stage text,
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_existing public.comment_translator_paid_capacity_reservations%rowtype;
  v_reservation_id uuid;
  v_capacity_limit integer;
  v_reserved_count integer;
  v_target_capacity_stage text;
begin
  p_now := statement_timestamp();
  if p_lifecycle_stage not in (
    'checkout_hold', 'incomplete', 'active', 'cancel_at_period_end',
    'payment_failure_hold', 'dispute', 'cancel_pending', 'reconciliation'
  ) then
    raise exception 'capacity stage is not valid';
  end if;

  perform pg_advisory_xact_lock(47290101);

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null or v_lifecycle.owner_user_id <> p_owner_user_id or v_lifecycle.is_terminal then
    raise exception 'billing lifecycle is not capacity eligible';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for capacity update';
  end if;

  v_target_capacity_stage := case v_lifecycle.lifecycle_state
    when 'checkout_hold' then 'checkout_hold'
    when 'incomplete' then 'incomplete'
    when 'active' then 'active'
    when 'cancel_at_period_end' then 'cancel_at_period_end'
    when 'past_due' then 'payment_failure_hold'
    when 'unpaid' then 'payment_failure_hold'
    when 'dispute' then 'dispute'
    when 'cancel_pending' then 'cancel_pending'
    when 'paid_unentitled_reconciliation' then 'reconciliation'
    when 'refund_reconciliation' then 'reconciliation'
    when 'dispute_reconciliation' then 'reconciliation'
    else null
  end;
  if v_target_capacity_stage is null
    or p_lifecycle_stage is distinct from v_target_capacity_stage
  then
    raise exception 'capacity stage does not match billing lifecycle';
  end if;

  select *
    into v_existing
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;

  if v_existing.id is not null and v_existing.reservation_state <> 'released' then
    if v_existing.owner_user_id <> p_owner_user_id then
      raise exception 'capacity owner binding conflict';
    end if;
    if v_existing.lifecycle_stage is distinct from p_lifecycle_stage then
      raise exception 'capacity stage binding conflict';
    end if;
    return v_existing.id;
  end if;

  if v_existing.id is not null then
    raise exception 'released capacity reservation cannot be reused';
  end if;

  select capacity_limit
    into v_capacity_limit
    from public.comment_translator_paid_capacity_config
   where config_key = true
   for update;
  if v_capacity_limit is null then
    raise exception 'paid capacity configuration is unavailable';
  end if;

  select count(*)::integer
    into v_reserved_count
    from public.comment_translator_paid_capacity_reservations
   where reservation_state in ('held', 'consuming');

  if v_reserved_count >= v_capacity_limit then
    raise exception 'paid capacity is full';
  end if;

  insert into public.comment_translator_paid_capacity_reservations (
    lifecycle_id,
    owner_user_id,
    reservation_state,
    lifecycle_stage,
    created_at,
    updated_at
  )
  values (
    p_lifecycle_id,
    p_owner_user_id,
    case when p_lifecycle_stage = 'checkout_hold' then 'held' else 'consuming' end,
    p_lifecycle_stage,
    p_now,
    p_now
  )
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

create or replace function public.ct_paid_convert_capacity(
  p_lifecycle_id uuid,
  p_lifecycle_stage text,
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
  v_existing public.comment_translator_paid_capacity_reservations%rowtype;
  v_target_capacity_stage text;
begin
  p_now := statement_timestamp();
  if p_lifecycle_stage not in (
    'incomplete', 'active', 'cancel_at_period_end',
    'payment_failure_hold', 'dispute', 'cancel_pending', 'reconciliation'
  ) then
    raise exception 'capacity stage is not valid';
  end if;

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null or v_lifecycle.is_terminal then
    raise exception 'billing lifecycle is not capacity eligible';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for capacity update';
  end if;

  select *
    into v_existing
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_existing.id is null or v_existing.reservation_state = 'released' then
    raise exception 'capacity reservation is missing';
  end if;
  if v_existing.owner_user_id <> v_lifecycle.owner_user_id then
    raise exception 'capacity owner binding conflict';
  end if;

  v_target_capacity_stage := case v_lifecycle.lifecycle_state
    when 'incomplete' then 'incomplete'
    when 'active' then 'active'
    when 'cancel_at_period_end' then 'cancel_at_period_end'
    when 'past_due' then 'payment_failure_hold'
    when 'unpaid' then 'payment_failure_hold'
    when 'dispute' then 'dispute'
    when 'cancel_pending' then 'cancel_pending'
    when 'paid_unentitled_reconciliation' then 'reconciliation'
    when 'refund_reconciliation' then 'reconciliation'
    when 'dispute_reconciliation' then 'reconciliation'
    else null
  end;
  if v_target_capacity_stage is null
    or p_lifecycle_stage is distinct from v_target_capacity_stage
  then
    raise exception 'capacity stage does not match billing lifecycle';
  end if;

  update public.comment_translator_paid_capacity_reservations
     set reservation_state = 'consuming',
         lifecycle_stage = p_lifecycle_stage,
         updated_at = p_now
   where id = v_existing.id
     and reservation_state <> 'released';

  if not found then
    raise exception 'capacity reservation is missing';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_release_capacity(
  p_lifecycle_id uuid,
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
  v_entitlement public.comment_translator_paid_entitlements%rowtype;
begin
  p_now := statement_timestamp();
  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null
    or not v_lifecycle.is_terminal
    or v_lifecycle.lifecycle_state not in ('incomplete_expired', 'canceled', 'terminated')
    or v_lifecycle.next_reconcile_at is not null
    or v_lifecycle.last_reconcile_error_class is not null
  then
    raise exception 'capacity release requires a terminal billing lifecycle';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for capacity update';
  end if;

  select *
    into v_entitlement
    from public.comment_translator_paid_entitlements
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_entitlement.id is not null
    and v_entitlement.entitlement_status not in (
      'canceled', 'incomplete_expired', 'inactive'
    )
  then
    raise exception 'capacity release requires terminal entitlement projection';
  end if;

  update public.comment_translator_paid_capacity_reservations
     set reservation_state = 'released',
         released_at = p_now,
         updated_at = p_now
   where lifecycle_id = p_lifecycle_id
     and reservation_state <> 'released';

  if not found then
    perform 1
      from public.comment_translator_paid_capacity_reservations
     where lifecycle_id = p_lifecycle_id
       and reservation_state = 'released';
    if found then
      return true;
    end if;
    raise exception 'capacity reservation is missing';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_claim_reconciler(
  p_now timestamptz default now(),
  p_limit integer default 50
)
returns table (lifecycle_id uuid, reconcile_lease_token uuid, reconcile_lease_until timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  return query
  with candidates as (
    select lifecycle.id
      from public.comment_translator_paid_billing_lifecycles lifecycle
     where lifecycle.is_terminal = false
       and lifecycle.next_reconcile_at is not null
       and lifecycle.next_reconcile_at <= p_now
       and (lifecycle.reconcile_lease_until is null or lifecycle.reconcile_lease_until <= p_now)
     order by lifecycle.next_reconcile_at, lifecycle.created_at
     for update skip locked
     limit least(greatest(coalesce(p_limit, 50), 0), 50)
  ), claimed as (
    update public.comment_translator_paid_billing_lifecycles lifecycle
       set reconcile_lease_token = gen_random_uuid(),
           reconcile_lease_until = p_now + interval '120 seconds',
           reconcile_attempt_count = lifecycle.reconcile_attempt_count + 1,
           updated_at = p_now
      from candidates
     where lifecycle.id = candidates.id
     returning lifecycle.id, lifecycle.reconcile_lease_token, lifecycle.reconcile_lease_until
  )
  select claimed.id, claimed.reconcile_lease_token, claimed.reconcile_lease_until
    from claimed;
end;
$$;

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
         reconcile_attempt_count = 0,
         next_reconcile_at = p_next_reconcile_at,
         reconcile_backoff_seconds = 60,
         last_reconcile_error_class = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now;

  if not found then
    raise exception 'stale reconcile lease token is not valid for update';
  end if;
  return true;
end;
$$;

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
    'object-retrieval-failed',
    'database-transaction-failed',
    'external-action-failed',
    'binding-not-ready',
    'capacity-reconciliation-failed',
    'period-reconciliation-failed'
  ) then
    raise exception 'error class is not valid';
  end if;

  update public.comment_translator_paid_billing_lifecycles
     set reconcile_backoff_seconds = greatest(
           60,
           least(
             21600,
             case
               when reconcile_attempt_count <= 1 then 60
               when reconcile_attempt_count = 2 then 300
               when reconcile_attempt_count = 3 then 900
               when reconcile_attempt_count = 4 then 3600
               else 21600
             end
           )
         ),
         next_reconcile_at = p_now + make_interval(secs => greatest(
           60,
           least(
             21600,
             case
               when reconcile_attempt_count <= 1 then 60
               when reconcile_attempt_count = 2 then 300
               when reconcile_attempt_count = 3 then 900
               when reconcile_attempt_count = 4 then 3600
               else 21600
             end
           )
         )),
         reconcile_lease_until = null,
         reconcile_lease_token = null,
         last_reconcile_error_class = p_error_class,
         updated_at = p_now
   where id = p_lifecycle_id
     and reconcile_lease_token = p_reconcile_lease_token
     and reconcile_lease_until > p_now
  returning reconcile_backoff_seconds into v_next_backoff;

  if not found then
    raise exception 'stale reconcile lease token is not valid for update';
  end if;
  return v_next_backoff;
end;
$$;

create or replace function public.ct_paid_claim_entitlement_projection(
  p_owner_user_id uuid,
  p_lifecycle_id uuid,
  p_now timestamptz default now()
)
returns table (projection_lease_token uuid, projection_lease_until timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_projection_lease_token uuid;
  v_projection_lease_until timestamptz;
begin
  p_now := statement_timestamp();
  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles lifecycle
   where lifecycle.id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null or v_lifecycle.owner_user_id <> p_owner_user_id then
    raise exception 'billing lifecycle binding is not ready';
  end if;
  if v_lifecycle.projection_lease_token is not null
    and v_lifecycle.projection_lease_until is not null
    and v_lifecycle.projection_lease_until > p_now
  then
    return;
  end if;

  v_projection_lease_token := gen_random_uuid();
  v_projection_lease_until := p_now + interval '120 seconds';
  update public.comment_translator_paid_billing_lifecycles lifecycle
     set projection_lease_token = v_projection_lease_token,
         projection_lease_until = v_projection_lease_until,
         updated_at = p_now
   where lifecycle.id = p_lifecycle_id;

  return query select v_projection_lease_token, v_projection_lease_until;
end;
$$;

create or replace function public.ct_paid_project_entitlement(
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
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now(),
  p_lifecycle_state text default null,
  p_subscription_status text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.comment_translator_paid_entitlements%rowtype;
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_customer public.comment_translator_paid_customers%rowtype;
  v_subscription public.comment_translator_paid_subscription_bindings%rowtype;
  v_target_lifecycle_state text;
  v_target_capacity_stage text;
  v_previous_subscription_status text;
  v_observed_subscription_status text;
  v_failure_started_at timestamptz;
  v_capacity_id uuid;
  v_id uuid;
begin
  p_now := statement_timestamp();
  if p_entitlement_status not in (
    'active', 'cancel_at_period_end', 'past_due', 'unpaid', 'incomplete',
    'canceled', 'incomplete_expired', 'dispute', 'cancel_pending',
    'paid_unentitled_reconciliation', 'refund_reconciliation',
    'dispute_reconciliation', 'inactive'
  ) then
    raise exception 'entitlement status is not valid';
  end if;

  if p_dispute_state not in ('none', 'investigating', 'won', 'lost', 'reconciliation') then
    raise exception 'dispute state is not valid';
  end if;
  if p_subscription_status is not null and p_subscription_status not in (
    'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'
  ) then
    raise exception 'subscription status is not valid';
  end if;
  if p_subscription_binding_id is not null
    and (p_current_period_start is null or p_current_period_end is null)
  then
    raise exception 'subscription-bound entitlement period is not valid';
  end if;
  if (p_current_period_start is null) <> (p_current_period_end is null)
    or (
      p_current_period_start is not null
      and (
        not isfinite(p_current_period_start)
        or not isfinite(p_current_period_end)
        or p_current_period_end <= p_current_period_start
      )
    )
  then
    raise exception 'entitlement period is not valid';
  end if;
  if p_subscription_binding_id is null and p_current_period_start is not null then
    raise exception 'unbound entitlement period is not valid';
  end if;
  if p_cancel_at_period_end is distinct from (
    p_entitlement_status in ('cancel_at_period_end', 'cancel_pending')
  ) then
    raise exception 'cancel-at-period-end flag is not valid';
  end if;

  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null or v_lifecycle.owner_user_id <> p_owner_user_id then
    raise exception 'billing lifecycle binding is not ready';
  end if;
  if p_projection_lease_token is null
    or v_lifecycle.projection_lease_token is distinct from p_projection_lease_token
    or v_lifecycle.projection_lease_until is null
    or v_lifecycle.projection_lease_until <= p_now
  then
    raise exception 'stale projection lease token is not valid for projection';
  end if;
  v_observed_subscription_status := coalesce(
    p_subscription_status,
    case
      when p_entitlement_status = 'cancel_at_period_end' then 'active'
      when p_entitlement_status in ('active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired') then p_entitlement_status
      else null
    end
  );
  if p_lifecycle_state is not null and p_lifecycle_state not in (
    'checkout_hold', 'incomplete', 'active', 'cancel_at_period_end',
    'past_due', 'unpaid', 'dispute', 'cancel_pending',
    'paid_unentitled_reconciliation', 'refund_reconciliation',
    'dispute_reconciliation', 'expire_required', 'incomplete_expired',
    'canceled', 'terminated'
  ) then
    raise exception 'billing lifecycle state is not valid';
  end if;

  v_target_lifecycle_state := coalesce(
    p_lifecycle_state,
    case p_entitlement_status
      when 'active' then 'active'
      when 'cancel_at_period_end' then 'cancel_at_period_end'
      when 'past_due' then 'past_due'
      when 'unpaid' then 'unpaid'
      when 'incomplete' then 'incomplete'
      when 'canceled' then 'canceled'
      when 'incomplete_expired' then 'incomplete_expired'
      when 'dispute' then 'dispute'
      when 'cancel_pending' then 'cancel_pending'
      when 'paid_unentitled_reconciliation' then 'paid_unentitled_reconciliation'
      when 'refund_reconciliation' then 'refund_reconciliation'
      when 'dispute_reconciliation' then 'dispute_reconciliation'
      when 'inactive' then 'terminated'
      else v_lifecycle.lifecycle_state
    end
  );

  if not (
    (
      p_entitlement_status = 'active'
      and v_target_lifecycle_state = 'active'
      and p_dispute_state in ('none', 'won')
      and (p_subscription_status is null or p_subscription_status = 'active')
    )
    or (
      p_entitlement_status = 'cancel_at_period_end'
      and v_target_lifecycle_state = 'cancel_at_period_end'
      and p_dispute_state in ('none', 'won')
      and (p_subscription_status is null or p_subscription_status = 'active')
    )
    or (
      p_entitlement_status = 'past_due'
      and v_target_lifecycle_state = 'past_due'
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'past_due')
    )
    or (
      p_entitlement_status = 'unpaid'
      and v_target_lifecycle_state = 'unpaid'
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'unpaid')
    )
    or (
      p_entitlement_status = 'incomplete'
      and v_target_lifecycle_state in ('checkout_hold', 'incomplete', 'expire_required')
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'incomplete')
    )
    or (
      p_entitlement_status = 'dispute'
      and v_target_lifecycle_state = 'dispute'
      and p_dispute_state in ('investigating', 'lost', 'reconciliation')
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'cancel_pending'
      and v_target_lifecycle_state = 'cancel_pending'
      and p_dispute_state = 'none'
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'paid_unentitled_reconciliation'
      and v_target_lifecycle_state = 'paid_unentitled_reconciliation'
      and p_dispute_state = 'none'
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'refund_reconciliation'
      and v_target_lifecycle_state = 'refund_reconciliation'
      and p_dispute_state = 'none'
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'dispute_reconciliation'
      and v_target_lifecycle_state = 'dispute_reconciliation'
      and p_dispute_state = 'reconciliation'
      and p_subscription_status is null
    )
    or (
      p_entitlement_status = 'incomplete_expired'
      and v_target_lifecycle_state = 'incomplete_expired'
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'incomplete_expired')
    )
    or (
      p_entitlement_status = 'canceled'
      and v_target_lifecycle_state = 'canceled'
      and p_dispute_state = 'none'
      and (p_subscription_status is null or p_subscription_status = 'canceled')
    )
    or (
      p_entitlement_status = 'inactive'
      and v_target_lifecycle_state = 'terminated'
      and p_dispute_state = 'none'
      and p_subscription_status is null
    )
  ) then
    raise exception 'entitlement projection state combination is not valid';
  end if;

  if v_lifecycle.is_terminal
    and v_target_lifecycle_state <> v_lifecycle.lifecycle_state
    and not (v_target_lifecycle_state = 'terminated' and v_lifecycle.lifecycle_state <> 'terminated')
  then
    raise exception 'terminal billing lifecycle cannot regress';
  end if;
  if v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated')
    and p_entitlement_status not in (
      'canceled', 'incomplete_expired', 'inactive'
    )
  then
    raise exception 'terminal billing lifecycle requires terminal entitlement projection';
  end if;
  if p_entitlement_status in ('canceled', 'incomplete_expired', 'inactive')
    and v_target_lifecycle_state not in ('incomplete_expired', 'canceled', 'terminated')
  then
    raise exception 'terminal entitlement requires terminal billing lifecycle';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for projection';
  end if;

  if p_entitlement_status in (
    'active', 'cancel_at_period_end', 'past_due', 'unpaid', 'canceled',
    'incomplete_expired', 'dispute', 'cancel_pending',
    'paid_unentitled_reconciliation', 'refund_reconciliation', 'dispute_reconciliation'
  ) and p_subscription_binding_id is null
  then
    raise exception 'subscription binding is required for entitlement status';
  end if;

  select *
    into v_customer
    from public.comment_translator_paid_customers
   where id = p_customer_binding_id
   for update;
  if v_customer.id is null
    or v_customer.owner_user_id <> p_owner_user_id
    or v_lifecycle.customer_binding_id <> v_customer.id
  then
    raise exception 'customer binding conflict';
  end if;

  if p_subscription_binding_id is not null then
    select *
      into v_subscription
      from public.comment_translator_paid_subscription_bindings
     where id = p_subscription_binding_id
     for update;
    if v_subscription.id is null
      or v_subscription.owner_user_id <> p_owner_user_id
      or v_subscription.lifecycle_id <> p_lifecycle_id
      or v_subscription.customer_binding_id <> p_customer_binding_id
      or v_subscription.product_id <> p_product_id
      or v_subscription.price_id <> p_price_id
    then
      raise exception 'subscription binding conflict';
    end if;
  end if;

  select *
    into v_existing
    from public.comment_translator_paid_entitlements
   where lifecycle_id = p_lifecycle_id
   for update;

  if v_existing.id is not null then
    if v_existing.owner_user_id <> p_owner_user_id
      or v_existing.customer_binding_id <> p_customer_binding_id
      or v_existing.product_id <> p_product_id
      or v_existing.price_id <> p_price_id
      or (v_existing.subscription_binding_id is not null and v_existing.subscription_binding_id is distinct from p_subscription_binding_id)
    then
      raise exception 'entitlement binding conflict';
    end if;
  end if;

  v_previous_subscription_status := v_lifecycle.last_observed_subscription_status;
  v_failure_started_at := v_lifecycle.payment_failure_started_at;
  if v_observed_subscription_status in ('past_due', 'unpaid')
    and (v_previous_subscription_status is null or v_previous_subscription_status not in ('past_due', 'unpaid'))
  then
    v_failure_started_at := p_now;
  elsif v_observed_subscription_status = 'active'
    and v_previous_subscription_status in ('past_due', 'unpaid')
  then
    v_failure_started_at := null;
  end if;

  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = v_target_lifecycle_state,
         is_terminal = v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated'),
         next_reconcile_at = case
           when v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated') then null
           when v_observed_subscription_status in ('past_due', 'unpaid')
             and v_failure_started_at is not null
           then v_failure_started_at + interval '7 days'
           when v_observed_subscription_status = 'active' then null
           else next_reconcile_at
         end,
         last_reconcile_error_class = case
           when v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated') then null
           else last_reconcile_error_class
         end,
         last_observed_subscription_status = coalesce(v_observed_subscription_status, last_observed_subscription_status),
         payment_failure_started_at = v_failure_started_at,
         updated_at = p_now
   where id = p_lifecycle_id;
  if not found then
    raise exception 'billing lifecycle is missing';
  end if;

  if v_existing.id is not null then
    if v_existing.entitlement_status in (
      'canceled', 'incomplete_expired', 'inactive'
    )
      and p_entitlement_status not in (
        'canceled', 'incomplete_expired', 'inactive'
      )
    then
      raise exception 'terminal entitlement cannot regress';
    end if;
    update public.comment_translator_paid_entitlements
       set subscription_binding_id = coalesce(v_existing.subscription_binding_id, p_subscription_binding_id),
           entitlement_status = p_entitlement_status,
           current_period_start = p_current_period_start,
           current_period_end = p_current_period_end,
           cancel_at_period_end = p_cancel_at_period_end,
           dispute_state = p_dispute_state,
           payment_failure_started_at = (
             select payment_failure_started_at
               from public.comment_translator_paid_billing_lifecycles
              where id = p_lifecycle_id
           ),
           projected_at = p_now,
           updated_at = p_now
     where id = v_existing.id
    returning id into v_id;
  else
    insert into public.comment_translator_paid_entitlements (
      lifecycle_id,
      owner_user_id,
      customer_binding_id,
      subscription_binding_id,
      product_id,
      price_id,
      entitlement_status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      dispute_state,
      payment_failure_started_at,
      projected_at,
      updated_at
    )
    values (
      p_lifecycle_id,
      p_owner_user_id,
      p_customer_binding_id,
      p_subscription_binding_id,
      p_product_id,
      p_price_id,
      p_entitlement_status,
      p_current_period_start,
      p_current_period_end,
      p_cancel_at_period_end,
      p_dispute_state,
      (
        select payment_failure_started_at
          from public.comment_translator_paid_billing_lifecycles
         where id = p_lifecycle_id
      ),
      p_now,
      p_now
    )
    returning id into v_id;
  end if;

  if v_target_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated') then
    perform public.ct_paid_release_capacity(
      p_lifecycle_id,
      p_reconcile_lease_token,
      p_now
    );
  else
    v_target_capacity_stage := case v_target_lifecycle_state
      when 'active' then 'active'
      when 'cancel_at_period_end' then 'cancel_at_period_end'
      when 'past_due' then 'payment_failure_hold'
      when 'unpaid' then 'payment_failure_hold'
      when 'dispute' then 'dispute'
      when 'cancel_pending' then 'cancel_pending'
      when 'paid_unentitled_reconciliation' then 'reconciliation'
      when 'refund_reconciliation' then 'reconciliation'
      when 'dispute_reconciliation' then 'reconciliation'
      else 'incomplete'
    end;
    select id
      into v_capacity_id
      from public.comment_translator_paid_capacity_reservations
     where lifecycle_id = p_lifecycle_id
     for update;
    if v_capacity_id is null then
      perform public.ct_paid_reserve_capacity(
        p_lifecycle_id,
        p_owner_user_id,
        v_target_capacity_stage,
        p_reconcile_lease_token,
        p_now
      );
    end if;
    perform public.ct_paid_convert_capacity(
      p_lifecycle_id,
      v_target_capacity_stage,
      p_reconcile_lease_token,
      p_now
    );
  end if;

  update public.comment_translator_paid_billing_lifecycles
     set projection_lease_until = null,
         projection_lease_token = null,
         updated_at = p_now
   where id = p_lifecycle_id
     and projection_lease_token = p_projection_lease_token
     and projection_lease_until > p_now;
  if not found then
    raise exception 'stale projection lease token is not valid for projection';
  end if;

  return v_id;
end;
$$;

create or replace function public.ct_paid_bind_first_subscription(
  p_lifecycle_id uuid,
  p_owner_user_id uuid,
  p_customer_binding_id uuid,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_product_id text,
  p_price_id text,
  p_entitlement_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_dispute_state text,
  p_lifecycle_state text,
  p_projection_lease_token uuid,
  p_reconcile_lease_token uuid default null,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lifecycle public.comment_translator_paid_billing_lifecycles%rowtype;
  v_customer public.comment_translator_paid_customers%rowtype;
  v_hold public.comment_translator_paid_checkout_holds%rowtype;
  v_session public.comment_translator_paid_checkout_session_bindings%rowtype;
  v_existing public.comment_translator_paid_subscription_bindings%rowtype;
  v_by_stripe public.comment_translator_paid_subscription_bindings%rowtype;
  v_binding_id uuid;
  v_capacity_id uuid;
  v_initial_capacity_stage text;
  v_target_capacity_stage text;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290101);
  select *
    into v_lifecycle
    from public.comment_translator_paid_billing_lifecycles
   where id = p_lifecycle_id
   for update;
  if v_lifecycle.id is null
    or v_lifecycle.owner_user_id <> p_owner_user_id
    or v_lifecycle.is_terminal
    or v_lifecycle.lifecycle_state = 'expire_required'
  then
    raise exception 'billing lifecycle binding is not ready';
  end if;
  if v_lifecycle.reconcile_lease_token is distinct from p_reconcile_lease_token
    or (
      v_lifecycle.reconcile_lease_token is not null
      and (v_lifecycle.reconcile_lease_until is null or v_lifecycle.reconcile_lease_until <= p_now)
    )
  then
    raise exception 'stale reconcile lease token is not valid for projection';
  end if;

  v_initial_capacity_stage := case v_lifecycle.lifecycle_state
    when 'checkout_hold' then 'checkout_hold'
    when 'incomplete' then 'incomplete'
    when 'active' then 'active'
    when 'cancel_at_period_end' then 'cancel_at_period_end'
    when 'past_due' then 'payment_failure_hold'
    when 'unpaid' then 'payment_failure_hold'
    when 'dispute' then 'dispute'
    when 'cancel_pending' then 'cancel_pending'
    when 'paid_unentitled_reconciliation' then 'reconciliation'
    when 'refund_reconciliation' then 'reconciliation'
    when 'dispute_reconciliation' then 'reconciliation'
    else null
  end;
  v_target_capacity_stage := case p_lifecycle_state
    when 'incomplete' then 'incomplete'
    when 'active' then 'active'
    when 'cancel_at_period_end' then 'cancel_at_period_end'
    when 'past_due' then 'payment_failure_hold'
    when 'unpaid' then 'payment_failure_hold'
    when 'dispute' then 'dispute'
    when 'cancel_pending' then 'cancel_pending'
    when 'paid_unentitled_reconciliation' then 'reconciliation'
    when 'refund_reconciliation' then 'reconciliation'
    when 'dispute_reconciliation' then 'reconciliation'
    else null
  end;
  if p_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated')
    or v_initial_capacity_stage is null
    or v_target_capacity_stage is null
  then
    raise exception 'first subscription lifecycle target is not capacity eligible';
  end if;

  select *
    into v_customer
    from public.comment_translator_paid_customers
   where id = p_customer_binding_id
   for update;
  if v_customer.id is null
    or v_customer.owner_user_id <> p_owner_user_id
    or v_customer.stripe_customer_id <> p_stripe_customer_id
  then
    raise exception 'customer binding conflict';
  end if;

  if v_lifecycle.customer_binding_id <> p_customer_binding_id then
    raise exception 'lifecycle customer binding conflict';
  end if;

  select *
    into v_hold
    from public.comment_translator_paid_checkout_holds
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_hold.id is null
    or v_hold.owner_user_id <> p_owner_user_id
    or v_hold.hold_state not in ('held', 'converted')
  then
    raise exception 'checkout hold binding is not ready';
  end if;

  select *
    into v_session
    from public.comment_translator_paid_checkout_session_bindings
   where lifecycle_id = p_lifecycle_id
     and hold_id = v_hold.id
   for update;
  if v_session.id is null
    or v_session.owner_user_id <> p_owner_user_id
    or v_session.customer_binding_id <> p_customer_binding_id
    or v_session.stripe_customer_id <> p_stripe_customer_id
  then
    raise exception 'checkout session binding is not ready';
  end if;

  select *
    into v_existing
    from public.comment_translator_paid_subscription_bindings
   where lifecycle_id = p_lifecycle_id
   for update;
  if v_existing.id is not null then
    if v_existing.owner_user_id <> p_owner_user_id
      or v_existing.customer_binding_id <> p_customer_binding_id
      or v_existing.stripe_subscription_id <> p_stripe_subscription_id
      or v_existing.stripe_customer_id <> p_stripe_customer_id
      or v_existing.product_id <> p_product_id
      or v_existing.price_id <> p_price_id
    then
      raise exception 'subscription binding conflict';
    end if;
    perform public.ct_paid_project_entitlement(
      p_lifecycle_id => p_lifecycle_id,
      p_owner_user_id => p_owner_user_id,
      p_customer_binding_id => p_customer_binding_id,
      p_subscription_binding_id => v_existing.id,
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
      p_lifecycle_state => p_lifecycle_state
    );
    return v_existing.id;
  end if;

  select *
    into v_by_stripe
    from public.comment_translator_paid_subscription_bindings
   where stripe_subscription_id = p_stripe_subscription_id
   for update;
  if v_by_stripe.id is not null then
    raise exception 'subscription binding conflict';
  end if;

  insert into public.comment_translator_paid_subscription_bindings (
    lifecycle_id,
    owner_user_id,
    customer_binding_id,
    stripe_subscription_id,
    stripe_customer_id,
    product_id,
    price_id
  )
  values (
    p_lifecycle_id,
    p_owner_user_id,
    p_customer_binding_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_product_id,
    p_price_id
  )
  returning id into v_binding_id;

  select id
    into v_capacity_id
    from public.comment_translator_paid_capacity_reservations
   where lifecycle_id = p_lifecycle_id
   for update;

  if v_capacity_id is null then
    v_capacity_id := public.ct_paid_reserve_capacity(
      p_lifecycle_id,
      p_owner_user_id,
      v_initial_capacity_stage,
      p_reconcile_lease_token,
      p_now
    );
  end if;

  -- The lifecycle and capacity stage move atomically in this RPC transaction.
  update public.comment_translator_paid_billing_lifecycles
     set lifecycle_state = p_lifecycle_state,
         is_terminal = p_lifecycle_state in ('incomplete_expired', 'canceled', 'terminated'),
         updated_at = p_now
   where id = p_lifecycle_id;

  perform public.ct_paid_convert_capacity(
    p_lifecycle_id,
    v_target_capacity_stage,
    p_reconcile_lease_token,
    p_now
  );

  update public.comment_translator_paid_checkout_holds
     set hold_state = 'converted',
         updated_at = p_now
   where lifecycle_id = p_lifecycle_id
     and hold_state = 'held';

  perform public.ct_paid_project_entitlement(
    p_lifecycle_id => p_lifecycle_id,
    p_owner_user_id => p_owner_user_id,
    p_customer_binding_id => p_customer_binding_id,
    p_subscription_binding_id => v_binding_id,
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
    p_lifecycle_state => p_lifecycle_state
  );

  return v_binding_id;
end;
$$;

create or replace function public.ct_paid_assert_current_paid_period(
  p_owner_user_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entitlement public.comment_translator_paid_entitlements%rowtype;
begin
  p_now := statement_timestamp();
  if p_period_end <= p_period_start
    or p_now < p_period_start
    or p_now >= p_period_end
  then
    raise exception 'billing period is not current';
  end if;

  select *
    into v_entitlement
    from public.comment_translator_paid_entitlements
   where owner_user_id = p_owner_user_id
     and entitlement_status in ('active', 'cancel_at_period_end')
   order by updated_at desc
   limit 1
   for update;
  if v_entitlement.id is null
    or v_entitlement.subscription_binding_id is null
    or v_entitlement.current_period_start is distinct from p_period_start
    or v_entitlement.current_period_end is distinct from p_period_end
  then
    raise exception 'current Paid entitlement period is not authoritative';
  end if;
  if exists (
    select 1
      from public.comment_translator_paid_billing_period_usage
     where owner_user_id = p_owner_user_id
       and period_end <= p_period_start
       and period_state <> 'closed'
  ) or exists (
    select 1
      from public.comment_translator_paid_owner_cost_buckets
     where owner_user_id = p_owner_user_id
       and period_end <= p_period_start
       and period_state <> 'closed'
  )
  then
    raise exception 'previous Paid billing period is not reconciled';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_assert_current_utc_month(
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_utc_month date := date_trunc('month', p_now at time zone 'UTC')::date;
begin
  p_now := statement_timestamp();
  v_utc_month := date_trunc('month', p_now at time zone 'UTC')::date;
  if exists (
    select 1
      from public.comment_translator_paid_global_cost_buckets
     where utc_month < v_utc_month
       and bucket_state <> 'closed'
  ) or exists (
    select 1
      from public.comment_translator_paid_azure_fallback_buckets
     where utc_month < v_utc_month
       and bucket_state <> 'closed'
  )
  then
    raise exception 'previous Paid UTC month is not reconciled';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_reserve_billing_period_characters(
  p_attempt_id text,
  p_provider_attempt text,
  p_owner_user_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_characters bigint,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_shared_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_usage_id uuid;
begin
  p_now := statement_timestamp();
  if length(trim(p_provider_attempt)) = 0 or length(trim(p_provider_attempt)) > 200 then
    raise exception 'provider attempt is not valid';
  end if;

  if p_characters <= 0 or p_characters > 500000 then
    raise exception 'billing period character reservation is not valid';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is not null then
    if v_logical.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt owner binding conflict';
    end if;
    if v_logical.period_start is distinct from p_period_start or v_logical.period_end is distinct from p_period_end then
      raise exception 'logical attempt period binding conflict';
    end if;
    if v_logical.input_characters <> p_characters then
      raise exception 'logical attempt character reservation is not idempotent';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set billing_period_usage_id = v_logical.billing_period_usage_id,
           reserved_input_characters = v_logical.input_characters,
           requested_input_characters = v_logical.input_characters,
           updated_at = p_now
     where id = v_attempt.id;
    return case when v_logical.logical_state = 'reserved' then v_logical.input_characters else 0 end;
  end if;

  if v_attempt.attempt_state in ('committed', 'expired', 'released') then
    return 0;
  end if;

  if v_attempt.reserved_input_characters > 0 or v_attempt.committed_input_characters > 0 then
    if v_attempt.reserved_input_characters > 0 and v_attempt.reserved_input_characters <> p_characters then
      raise exception 'billing period character reservation is not idempotent';
    end if;
    return v_attempt.reserved_input_characters;
  end if;

  select *
    into v_shared_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and billing_period_usage_id is not null
     and attempt_state in ('reserved', 'uncertain', 'committed', 'released', 'expired')
   order by created_at
   limit 1
   for update;

  if v_shared_attempt.id is not null then
    if v_shared_attempt.reserved_input_characters <> p_characters then
      raise exception 'logical attempt character reservation is not idempotent';
    end if;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where id = v_shared_attempt.billing_period_usage_id
     for update;
    if v_usage.id is null or v_usage.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt billing period binding conflict';
    end if;
    p_period_start := v_usage.period_start;
    p_period_end := v_usage.period_end;
  else
    perform public.ct_paid_assert_current_paid_period(
      p_owner_user_id,
      p_period_start,
      p_period_end,
      p_now
    );
  end if;

  insert into public.comment_translator_paid_billing_period_usage (
    owner_user_id,
    period_start,
    period_end,
    updated_at
  )
  values (p_owner_user_id, p_period_start, p_period_end, p_now)
  on conflict (owner_user_id, period_start, period_end) do nothing;

  select *
    into v_usage
    from public.comment_translator_paid_billing_period_usage
   where owner_user_id = p_owner_user_id
     and period_start = p_period_start
     and period_end = p_period_end
   for update;

  if v_shared_attempt.id is null
    and v_usage.reserved_input_characters + v_usage.committed_input_characters + p_characters > v_usage.character_limit
  then
    raise exception 'billing period character quota is exhausted';
  end if;
  if v_shared_attempt.id is null and v_usage.period_state <> 'open' then
    raise exception 'billing period is closed for new reservations';
  end if;

  if v_shared_attempt.id is null then
    update public.comment_translator_paid_billing_period_usage
       set reserved_input_characters = reserved_input_characters + p_characters,
           updated_at = p_now
     where id = v_usage.id
    returning id into v_usage_id;
  else
    v_usage_id := v_usage.id;
  end if;

  update public.comment_translator_paid_attempt_receipts
     set billing_period_usage_id = v_usage_id,
         reserved_input_characters = p_characters,
         updated_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt;

  insert into public.comment_translator_paid_logical_attempts (
    attempt_id, owner_user_id, billing_period_usage_id, period_start, period_end,
    input_characters, logical_state, expires_at, created_at, updated_at
  )
  values (
    p_attempt_id, p_owner_user_id, v_usage_id, p_period_start, p_period_end,
    p_characters, 'reserved', p_now + interval '24 hours', p_now, p_now
  );

  return p_characters;
end;
$$;

create or replace function public.ct_paid_commit_billing_period_characters(
  p_attempt_id text,
  p_provider_attempt text,
  p_actual_characters bigint default null,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_commit_characters bigint;
begin
  p_now := statement_timestamp();
  if length(trim(p_provider_attempt)) = 0 or length(trim(p_provider_attempt)) > 200 then
    raise exception 'provider attempt is not valid';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;
  if v_logical.logical_state = 'committed' then
    return v_logical.committed_input_characters;
  end if;
  if v_logical.logical_state = 'released' then
    return 0;
  end if;

  if v_attempt.attempt_state in ('committed', 'expired', 'released') then
    return v_attempt.committed_input_characters;
  end if;

  if v_attempt.committed_input_characters > 0 then
    return v_attempt.committed_input_characters;
  end if;
  if v_attempt.billing_period_usage_id is null or v_attempt.reserved_input_characters <= 0 then
    return 0;
  end if;
  if v_attempt.billing_period_usage_id is distinct from v_logical.billing_period_usage_id
    or v_attempt.owner_user_id <> v_logical.owner_user_id
    or v_attempt.period_start is distinct from v_logical.period_start
    or v_attempt.period_end is distinct from v_logical.period_end
  then
    raise exception 'logical attempt billing period binding conflict';
  end if;

  v_commit_characters := coalesce(p_actual_characters, v_attempt.reserved_input_characters);
  if v_commit_characters <= 0 or v_commit_characters > v_logical.input_characters then
    raise exception 'billing period character commit is not valid';
  end if;

  update public.comment_translator_paid_billing_period_usage
     set reserved_input_characters = reserved_input_characters - v_logical.input_characters,
         committed_input_characters = committed_input_characters + v_commit_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id
     and reserved_input_characters >= v_logical.input_characters;
  if not found then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         committed_input_characters = case
           when provider_attempt = p_provider_attempt then v_commit_characters
           else committed_input_characters
         end,
         updated_at = p_now
    where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'committed',
         committed_input_characters = v_commit_characters,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  return v_commit_characters;
end;
$$;

create or replace function public.ct_paid_release_billing_period_characters(
  p_attempt_id text,
  p_provider_attempt text,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_released bigint;
  v_sibling_count integer;
begin
  p_now := statement_timestamp();
  if length(trim(p_provider_attempt)) = 0 or length(trim(p_provider_attempt)) > 200 then
    raise exception 'provider attempt is not valid';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;
  if v_logical.logical_state in ('committed', 'released') then
    return 0;
  end if;

  if v_attempt.attempt_state in ('committed', 'expired', 'released') then
    return 0;
  end if;

  v_released := v_logical.input_characters;
  if v_attempt.reserved_input_characters = 0 or v_attempt.billing_period_usage_id is null then
    return 0;
  end if;
  if v_attempt.billing_period_usage_id is distinct from v_logical.billing_period_usage_id
    or v_attempt.owner_user_id <> v_logical.owner_user_id
    or v_attempt.period_start is distinct from v_logical.period_start
    or v_attempt.period_end is distinct from v_logical.period_end
  then
    raise exception 'logical attempt billing period binding conflict';
  end if;

  select count(*)::integer
    into v_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and billing_period_usage_id = v_attempt.billing_period_usage_id
     and attempt_state in ('reserved', 'uncertain', 'expired');

  if v_sibling_count > 0 then
    update public.comment_translator_paid_attempt_receipts
       set reserved_input_characters = 0,
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
    return 0;
  end if;

  update public.comment_translator_paid_billing_period_usage
     set reserved_input_characters = reserved_input_characters - v_logical.input_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id
     and reserved_input_characters >= v_logical.input_characters;
  if not found then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         updated_at = p_now
    where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'released',
         updated_at = p_now
   where attempt_id = p_attempt_id;

  return v_released;
end;
$$;

create or replace function public.ct_paid_settle_logical_attempt_after_provider_failure(
  p_attempt_id text,
  p_allow_unknown_reclaim boolean,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_has_azure_attempt boolean;
  v_committed_sibling_count integer;
  v_active_or_uncertain_sibling_count integer;
begin
  p_now := statement_timestamp();

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;
  if v_logical.logical_state in ('committed', 'released') then
    return 0;
  end if;

  select
    coalesce(bool_or(provider_kind = 'azure_direct_fallback'), false),
    count(*) filter (where attempt_state = 'committed' and provider_failure_class is null)::integer,
    count(*) filter (where attempt_state in ('reserved', 'uncertain'))::integer
    into v_has_azure_attempt, v_committed_sibling_count, v_active_or_uncertain_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;

  if (not v_has_azure_attempt and not p_allow_unknown_reclaim)
    or v_committed_sibling_count > 0
    or v_active_or_uncertain_sibling_count > 0
  then
    return 0;
  end if;

  select *
    into v_usage
    from public.comment_translator_paid_billing_period_usage
   where id = v_logical.billing_period_usage_id
   for update;
  if v_usage.id is null then
    raise exception 'billing period usage bucket is missing';
  end if;
  if v_usage.reserved_input_characters < v_logical.input_characters then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_billing_period_usage
     set reserved_input_characters = reserved_input_characters - v_logical.input_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id;
  if not found then
    raise exception 'billing period usage bucket is missing';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'released',
         updated_at = p_now
   where attempt_id = p_attempt_id;

  return v_logical.input_characters;
end;
$$;

create or replace function public.ct_paid_abandon_logical_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_caller_receipt public.comment_translator_paid_attempt_receipts%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_committed_sibling_count integer;
  v_unsafe_sibling_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if length(trim(p_provider_attempt)) = 0 or length(trim(p_provider_attempt)) > 200 then
    raise exception 'provider attempt is not valid';
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is null then
    raise exception 'logical attempt receipt is missing';
  end if;

  perform 1
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
   order by provider_attempt
   for update;

  select *
    into v_caller_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt;
  if v_caller_receipt.attempt_id is null
    or (
      v_caller_receipt.attempt_state <> 'released'
      and not (
        v_caller_receipt.attempt_state = 'committed'
        and v_caller_receipt.provider_failure_class is not null
        and v_caller_receipt.committed_input_characters = 0
      )
    )
  then
    raise exception 'abandonment requires a terminal released provider receipt';
  end if;

  if v_logical.logical_state in ('committed', 'released') then
    return 0;
  end if;

  select
    count(*) filter (
      where provider_attempt <> p_provider_attempt
        and attempt_state = 'committed'
        and provider_failure_class is null
    )::integer,
    count(*) filter (
      where provider_attempt <> p_provider_attempt
        and attempt_state in ('reserved', 'uncertain', 'expired')
    )::integer
    into v_committed_sibling_count, v_unsafe_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;

  if v_committed_sibling_count > 0 then
    raise exception 'committed provider receipt prevents abandonment';
  end if;
  if v_unsafe_sibling_count > 0 then
    raise exception 'active or unknown provider receipt prevents abandonment';
  end if;

  select *
    into v_usage
    from public.comment_translator_paid_billing_period_usage
   where id = v_logical.billing_period_usage_id
   for update;
  if v_usage.id is null then
    raise exception 'billing period usage bucket is missing';
  end if;
  if v_usage.reserved_input_characters < v_logical.input_characters then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_billing_period_usage
     set reserved_input_characters = reserved_input_characters - v_logical.input_characters,
         updated_at = p_now
   where id = v_logical.billing_period_usage_id
     and reserved_input_characters >= v_logical.input_characters;
  if not found then
    raise exception 'logical character reservation is inconsistent';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set reserved_input_characters = 0,
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_logical_attempts
     set logical_state = 'released',
         updated_at = p_now
   where attempt_id = p_attempt_id;

  update public.comment_translator_paid_session_leases
     set lease_state = 'released',
         lease_until = p_now,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and lease_state in ('active', 'uncertain');

  return v_logical.input_characters;
end;
$$;

create or replace function public.ct_paid_cleanup_attempt_ledgers(
  p_now timestamptz default now(),
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt_ids text[];
  v_deleted integer;
begin
  p_now := statement_timestamp();
  if p_limit < 1 or p_limit > 500 then
    raise exception 'attempt ledger cleanup limit is not valid';
  end if;

  select coalesce(array_agg(candidate.attempt_id), array[]::text[])
    into v_attempt_ids
    from (
      select logical_attempt.attempt_id
        from public.comment_translator_paid_logical_attempts logical_attempt
       where logical_attempt.expires_at <= p_now
         and logical_attempt.logical_state in ('committed', 'released')
         and not exists (
           select 1
             from public.comment_translator_paid_attempt_receipts provider_receipt
            where provider_receipt.attempt_id = logical_attempt.attempt_id
              and provider_receipt.attempt_state not in ('committed', 'released', 'expired')
         )
       order by logical_attempt.expires_at, logical_attempt.attempt_id
       limit p_limit
       for update of logical_attempt skip locked
    ) candidate;

  if cardinality(v_attempt_ids) = 0 then
    return 0;
  end if;

  delete from public.comment_translator_paid_attempt_receipts
   where attempt_id = any(v_attempt_ids);
  delete from public.comment_translator_paid_logical_attempts
   where attempt_id = any(v_attempt_ids);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.ct_paid_close_billing_period(
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
declare
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_owner_cost public.comment_translator_paid_owner_cost_buckets%rowtype;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_period_end <= p_period_start or p_period_end > p_now then
    raise exception 'billing period is not eligible for close';
  end if;

  select *
    into v_usage
    from public.comment_translator_paid_billing_period_usage
   where owner_user_id = p_owner_user_id
     and period_start = p_period_start
     and period_end = p_period_end
   for update;
  select *
    into v_owner_cost
    from public.comment_translator_paid_owner_cost_buckets
   where owner_user_id = p_owner_user_id
     and period_start = p_period_start
     and period_end = p_period_end
   for update;

  if v_usage.id is not null
    and v_usage.period_state <> 'closed'
    and v_usage.reserved_input_characters > 0
  then
    raise exception 'billing period has unresolved character reservations';
  end if;
  if v_owner_cost.id is not null
    and v_owner_cost.period_state <> 'closed'
    and v_owner_cost.reserved_cost_micros > 0
  then
    raise exception 'billing period has unresolved cost reservations';
  end if;

  if v_usage.id is not null and v_usage.period_state <> 'closed' then
    update public.comment_translator_paid_billing_period_usage
       set period_state = 'closed',
           period_closed_at = p_now,
           updated_at = p_now
     where id = v_usage.id;
  end if;
  if v_owner_cost.id is not null and v_owner_cost.period_state <> 'closed' then
    update public.comment_translator_paid_owner_cost_buckets
       set period_state = 'closed',
           period_closed_at = p_now,
           updated_at = p_now
     where id = v_owner_cost.id;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_close_utc_month(
  p_utc_month date,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_global public.comment_translator_paid_global_cost_buckets%rowtype;
  v_azure public.comment_translator_paid_azure_fallback_buckets%rowtype;
begin
  p_now := statement_timestamp();
  if date_trunc('month', p_utc_month)::date <> p_utc_month then
    raise exception 'UTC month is not month-aligned';
  end if;
  if p_utc_month >= date_trunc('month', p_now at time zone 'UTC')::date then
    raise exception 'UTC month is not eligible for close';
  end if;
  perform pg_advisory_xact_lock(47290102);

  select *
    into v_global
    from public.comment_translator_paid_global_cost_buckets
   where utc_month = p_utc_month
   for update;
  select *
    into v_azure
    from public.comment_translator_paid_azure_fallback_buckets
   where utc_month = p_utc_month
   for update;

  if v_global.id is not null
    and v_global.bucket_state <> 'closed'
    and v_global.reserved_cost_micros > 0
  then
    raise exception 'UTC month has unresolved OpenAI cost reservations';
  end if;
  if v_azure.id is not null
    and v_azure.bucket_state <> 'closed'
    and v_azure.reserved_paid_characters > 0
  then
    raise exception 'UTC month has unresolved Azure reservations';
  end if;

  if v_global.id is not null and v_global.bucket_state <> 'closed' then
    update public.comment_translator_paid_global_cost_buckets
       set bucket_state = 'closed',
           closed_at = p_now,
           updated_at = p_now
     where id = v_global.id;
  end if;
  if v_azure.id is not null and v_azure.bucket_state <> 'closed' then
    update public.comment_translator_paid_azure_fallback_buckets
       set bucket_state = 'closed',
           closed_at = p_now,
           updated_at = p_now
     where id = v_azure.id;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_disable_provider_circuit(
  p_provider text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
begin
  p_now := statement_timestamp();
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;

  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = p_provider
   for update;
  if v_circuit.provider is null then
    raise exception 'provider circuit is not configured';
  end if;
  if v_circuit.circuit_state = 'disabled' then
    return true;
  end if;

  update public.comment_translator_paid_provider_circuits
     set circuit_state = 'disabled',
         failure_count = 0,
         window_started_at = null,
         degraded_until = null,
         probe_attempt_id = null,
         probe_lease_until = null,
         last_error_class = null,
         updated_at = p_now
   where provider = p_provider;
  return found;
end;
$$;

create or replace function public.ct_paid_record_provider_circuit_failure(
  p_provider text,
  p_error_class text,
  p_now timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_state text;
  v_count integer;
begin
  p_now := statement_timestamp();
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;
  if p_error_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'quota', 'configuration', 'policy') then
    raise exception 'error class is not valid';
  end if;

  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = p_provider
   for update;

  if v_circuit.circuit_state = 'disabled' then
    return 'disabled';
  end if;

  if p_error_class in ('quota', 'configuration', 'policy') then
    update public.comment_translator_paid_provider_circuits
       set last_error_class = p_error_class,
           updated_at = p_now
     where provider = p_provider;
    return v_circuit.circuit_state;
  end if;

  if v_circuit.circuit_state = 'degraded' then
    update public.comment_translator_paid_provider_circuits
       set circuit_state = 'degraded',
           failure_count = greatest(v_circuit.failure_count + 1, 3),
           degraded_until = greatest(
             coalesce(v_circuit.degraded_until, p_now),
             p_now + interval '5 minutes'
           ),
           probe_attempt_id = null,
           probe_lease_until = null,
           last_error_class = p_error_class,
           updated_at = p_now
     where provider = p_provider;
    return 'degraded';
  end if;

  if v_circuit.circuit_state = 'half_open' then
    v_count := 3;
    v_state := 'degraded';
  elsif v_circuit.window_started_at is null or v_circuit.window_started_at + interval '60 seconds' <= p_now then
    v_count := 1;
    v_state := 'closed';
  else
    v_count := v_circuit.failure_count + 1;
    v_state := case when v_count >= 3 then 'degraded' else v_circuit.circuit_state end;
  end if;

  update public.comment_translator_paid_provider_circuits
     set circuit_state = v_state,
         failure_count = v_count,
         window_started_at = case when v_count = 1 then p_now else v_circuit.window_started_at end,
         degraded_until = case when v_state = 'degraded' then p_now + interval '5 minutes' else degraded_until end,
         probe_attempt_id = null,
         probe_lease_until = null,
         last_error_class = p_error_class,
         updated_at = p_now
   where provider = p_provider;
  return v_state;
end;
$$;

create or replace function public.ct_paid_probe_provider_circuit(
  p_provider text,
  p_now timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state text;
begin
  p_now := statement_timestamp();
  select circuit_state
    into v_state
    from public.comment_translator_paid_provider_circuits
   where provider = p_provider
   for update;
  if v_state is null then
    raise exception 'provider circuit is not configured';
  end if;
  if v_state = 'degraded' and exists (
    select 1
      from public.comment_translator_paid_provider_circuits
     where provider = p_provider
       and degraded_until is not null
       and degraded_until <= p_now
  ) then
    update public.comment_translator_paid_provider_circuits
       set circuit_state = 'half_open',
           probe_attempt_id = null,
           probe_lease_until = null,
           updated_at = p_now
     where provider = p_provider;
    return 'half_open';
  end if;
  return v_state;
end;
$$;

create or replace function public.ct_paid_record_provider_circuit_success(
  p_provider text,
  p_probe_attempt_id text default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_receipt public.comment_translator_paid_attempt_receipts%rowtype;
begin
  p_now := statement_timestamp();
  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = p_provider
   for update;
  if v_circuit.provider is null then
    return false;
  end if;
  if v_circuit.circuit_state = 'disabled' then
    return true;
  end if;
  if v_circuit.circuit_state = 'degraded' then
    return false;
  end if;
  if v_circuit.circuit_state = 'closed' then
    update public.comment_translator_paid_provider_circuits
       set failure_count = 0,
           window_started_at = null,
           degraded_until = null,
           probe_attempt_id = null,
           probe_lease_until = null,
           last_error_class = null,
           updated_at = p_now
     where provider = p_provider;
    return found;
  end if;
  if v_circuit.circuit_state <> 'half_open' then
    return false;
  end if;
  if v_circuit.probe_attempt_id is distinct from p_probe_attempt_id
    or v_circuit.probe_lease_until is null
    or v_circuit.probe_lease_until <= p_now
  then
    return false;
  end if;

  select *
    into v_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_probe_attempt_id
     and provider_kind = case
       when p_provider = 'openai' then 'openai_attempt'
       when p_provider = 'azure_fallback' then 'azure_direct_fallback'
       else null
     end
     and attempt_state = 'committed'
     and provider_failure_class is null
   order by provider_attempt
   limit 1
   for update;
  if v_receipt.id is null then
    return false;
  end if;

  update public.comment_translator_paid_provider_circuits
     set circuit_state = 'closed',
         failure_count = 0,
         window_started_at = null,
         degraded_until = null,
         probe_attempt_id = null,
         probe_lease_until = null,
         last_error_class = null,
         updated_at = p_now
   where provider = p_provider;
  return found;
end;
$$;

create or replace function public.ct_paid_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_utc_month date,
  p_input_characters bigint,
  p_estimated_cost_micros bigint,
  p_request_count integer,
  p_token_count bigint,
  p_now timestamptz default now()
)
returns table (reservation_status text, session_lease_token uuid, openai_slot_token uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_config public.comment_translator_paid_capacity_config%rowtype;
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_shared_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_owner_cost public.comment_translator_paid_owner_cost_buckets%rowtype;
  v_global_cost public.comment_translator_paid_global_cost_buckets%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_prior_lease public.comment_translator_paid_session_leases%rowtype;
  v_slot public.comment_translator_paid_openai_slots%rowtype;
  v_prior_rate public.comment_translator_paid_openai_rate_reservations%rowtype;
  v_minute public.comment_translator_paid_openai_minute_buckets%rowtype;
  v_minute_start timestamptz;
  v_session_lease_token uuid;
  v_openai_slot_token uuid;
  v_usage_id uuid;
  v_owner_cost_id uuid;
  v_global_cost_id uuid;
  v_reserved_slots integer;
  v_rpm_limit integer;
  v_rolling_tokens bigint;
  v_receipt_count integer;
begin
  p_now := statement_timestamp();
  if length(trim(p_attempt_id)) = 0
    or length(trim(p_provider_attempt)) = 0
    or length(trim(p_session_reference_id)) = 0
    or p_input_characters <= 0
    or p_input_characters > 7500
    or p_estimated_cost_micros <= 0
    or p_request_count <= 0
    or p_request_count > 15
    or p_token_count <= 0
  then
    raise exception 'OpenAI reservation request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290102);

  select *
    into v_attempt
   from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is not null then
    if v_attempt.provider_kind <> 'openai_attempt' then
      raise exception 'attempt provider binding conflict';
    end if;
    if v_attempt.session_reference_id <> p_session_reference_id then
      raise exception 'attempt session binding conflict';
    end if;
    if v_attempt.owner_user_id <> p_owner_user_id then
      raise exception 'attempt owner binding conflict';
    end if;
    if v_attempt.period_start is distinct from p_period_start or v_attempt.period_end is distinct from p_period_end then
      raise exception 'attempt period binding conflict';
    end if;
    if v_attempt.utc_month <> p_utc_month then
      raise exception 'attempt UTC month binding conflict';
    end if;
    if v_attempt.requested_input_characters <> p_input_characters then
      raise exception 'attempt input binding conflict';
    end if;
    if v_attempt.requested_cost_micros <> p_estimated_cost_micros then
      raise exception 'attempt cost binding conflict';
    end if;
    if v_attempt.requested_request_count <> p_request_count then
      raise exception 'attempt request binding conflict';
    end if;
    if v_attempt.requested_token_count <> p_token_count then
      raise exception 'attempt token binding conflict';
    end if;
    if v_attempt.attempt_state in ('committed', 'released', 'expired') then
      return query select v_attempt.attempt_state, null::uuid, null::uuid;
      return;
    end if;
    select *
      into v_lease
      from public.comment_translator_paid_session_leases
     where attempt_id = p_attempt_id
     for update;
    select *
      into v_slot
      from public.comment_translator_paid_openai_slots
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt
     for update;
    if v_lease.id is null
      or v_lease.owner_user_id <> p_owner_user_id
      or v_lease.session_reference_id <> p_session_reference_id
      or v_lease.lease_state not in ('active', 'uncertain')
      or v_lease.lease_until <= p_now
      or v_slot.id is null
      or v_slot.session_reference_id <> p_session_reference_id
      or v_slot.slot_state not in ('active', 'uncertain')
      or v_slot.lease_until <= p_now
    then
      raise exception 'active attempt lease binding is unavailable';
    end if;
    return query select v_attempt.attempt_state, v_lease.lease_token, v_slot.lease_token;
    return;
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is not null then
    if v_logical.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt owner binding conflict';
    end if;
    if v_logical.period_start is distinct from p_period_start or v_logical.period_end is distinct from p_period_end then
      raise exception 'logical attempt period binding conflict';
    end if;
    if p_input_characters > v_logical.input_characters then
      raise exception 'logical attempt input binding conflict';
    end if;
    if v_logical.logical_state <> 'reserved' then
      raise exception 'logical attempt is already settled';
    end if;
  end if;

  perform 1
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
   order by provider_attempt
   for update;
  select count(*)::integer
    into v_receipt_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;
  if v_receipt_count > 0 then
    select *
      into v_shared_attempt
      from public.comment_translator_paid_attempt_receipts
     where attempt_id = p_attempt_id
       and provider_kind = 'openai_attempt'
     order by created_at
     limit 1
     for update;
    if v_receipt_count <> 1
      or v_shared_attempt.id is null
      or v_shared_attempt.reserved_cost_micros <> 0
      or v_shared_attempt.attempt_state <> 'committed'
      or v_shared_attempt.provider_failure_class is distinct from 'invalid-response'
      or v_shared_attempt.committed_cost_micros <= 0
    then
      raise exception 'OpenAI retry predecessor is not safe';
    end if;
    select *
      into v_slot
      from public.comment_translator_paid_openai_slots
     where attempt_id = p_attempt_id
       and provider_attempt = v_shared_attempt.provider_attempt
     for update;
    select *
      into v_prior_rate
      from public.comment_translator_paid_openai_rate_reservations
     where attempt_id = p_attempt_id
       and provider_attempt = v_shared_attempt.provider_attempt
     for update;
    select *
      into v_prior_lease
      from public.comment_translator_paid_session_leases
     where attempt_id = p_attempt_id
     for update;
    if v_slot.id is null
      or v_slot.slot_state <> 'released'
      or v_prior_rate.id is null
      or v_prior_lease.id is null
      or v_prior_lease.provider_attempt <> v_shared_attempt.provider_attempt
      or not (
        v_prior_lease.lease_state = 'released'
        or (
          v_prior_lease.lease_state in ('active', 'uncertain')
          and v_prior_lease.lease_until > p_now
        )
      )
      or v_prior_rate.reservation_state <> 'completed'
    then
      raise exception 'OpenAI retry predecessor is not safe';
    end if;
  end if;

  if p_utc_month <> date_trunc('month', p_now at time zone 'UTC')::date then
    raise exception 'UTC month is not current';
  end if;
  perform public.ct_paid_assert_current_utc_month(p_now);

  select *
    into v_config
    from public.comment_translator_paid_capacity_config
   where config_key = true
   for update;
  if v_config.config_key is null
    or not v_config.openai_limits_configured
    or v_config.openai_rpm_limit <= 0
    or v_config.openai_tpm_limit <= 0
  then
    raise exception 'OpenAI capacity configuration is unavailable';
  end if;

  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = 'openai'
   for update;
  if v_circuit.provider is null or v_circuit.circuit_state in ('degraded', 'disabled') then
    raise exception 'OpenAI circuit is unavailable';
  end if;
  if v_circuit.circuit_state = 'half_open' then
    if v_circuit.probe_attempt_id is not null
      and v_circuit.probe_attempt_id <> p_attempt_id
      and v_circuit.probe_lease_until is not null
      and v_circuit.probe_lease_until > p_now
    then
      raise exception 'OpenAI circuit probe is already leased';
    end if;
    update public.comment_translator_paid_provider_circuits
       set probe_attempt_id = p_attempt_id,
           probe_lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where provider = 'openai';
  end if;

  select *
    into v_lease
    from public.comment_translator_paid_session_leases
   where session_reference_id = p_session_reference_id
   for update;
  if v_lease.id is not null
    and v_lease.owner_user_id <> p_owner_user_id
  then
    raise exception 'session owner binding conflict';
  end if;
  if v_lease.id is not null
    and v_lease.lease_state in ('active', 'uncertain')
    and v_lease.lease_until > p_now
    and v_lease.attempt_id <> p_attempt_id
  then
    raise exception 'session has an active provider lease';
  end if;

  select *
    into v_shared_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and billing_period_usage_id is not null
     and attempt_state in ('reserved', 'uncertain', 'committed', 'released', 'expired')
   order by created_at
   limit 1
   for update;
  if v_shared_attempt.id is not null then
    if v_logical.attempt_id is null
      or v_shared_attempt.reserved_input_characters <> v_logical.input_characters
      or p_input_characters > v_logical.input_characters
    then
      raise exception 'logical attempt character reservation is not idempotent';
    end if;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where id = v_shared_attempt.billing_period_usage_id
     for update;
    if v_usage.id is null then
      raise exception 'logical attempt billing period bucket is missing';
    end if;
    if v_usage.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt billing period binding conflict';
    end if;
    p_period_start := v_usage.period_start;
    p_period_end := v_usage.period_end;
  else
    perform public.ct_paid_assert_current_paid_period(
      p_owner_user_id,
      p_period_start,
      p_period_end,
      p_now
    );
    insert into public.comment_translator_paid_billing_period_usage (
      owner_user_id, period_start, period_end, updated_at
    )
    values (p_owner_user_id, p_period_start, p_period_end, p_now)
    on conflict (owner_user_id, period_start, period_end) do nothing;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     for update;
    if v_usage.reserved_input_characters + v_usage.committed_input_characters + p_input_characters > v_usage.character_limit then
      raise exception 'billing period character quota is exhausted';
    end if;
    if v_usage.period_state <> 'open' then
      raise exception 'billing period is closed for new reservations';
    end if;
  end if;

  insert into public.comment_translator_paid_owner_cost_buckets (
    owner_user_id, period_start, period_end, updated_at
  )
  values (p_owner_user_id, p_period_start, p_period_end, p_now)
  on conflict (owner_user_id, period_start, period_end) do nothing;
  select *
    into v_owner_cost
    from public.comment_translator_paid_owner_cost_buckets
   where owner_user_id = p_owner_user_id
     and period_start = p_period_start
     and period_end = p_period_end
     for update;
  if v_owner_cost.period_state <> 'open' then
    raise exception 'owner cost period is closed for new reservations';
  end if;
  if v_owner_cost.reserved_cost_micros + v_owner_cost.committed_cost_micros + p_estimated_cost_micros > v_owner_cost.cost_limit_micros then
    raise exception 'individual OpenAI cost limit is exhausted';
  end if;

  if v_shared_attempt.id is not null and v_shared_attempt.global_cost_bucket_id is not null then
    select *
      into v_global_cost
      from public.comment_translator_paid_global_cost_buckets
     where id = v_shared_attempt.global_cost_bucket_id
     for update;
    if v_global_cost.id is null or v_global_cost.utc_month <> p_utc_month then
      raise exception 'logical attempt UTC month binding conflict';
    end if;
  else
    insert into public.comment_translator_paid_global_cost_buckets (
      utc_month, updated_at
    )
    values (p_utc_month, p_now)
    on conflict (utc_month) do nothing;
    select *
      into v_global_cost
      from public.comment_translator_paid_global_cost_buckets
     where utc_month = p_utc_month
     for update;
  end if;
  if v_global_cost.bucket_state <> 'open' then
    raise exception 'global cost month is closed for new reservations';
  end if;
  if v_global_cost.reserved_cost_micros + v_global_cost.committed_cost_micros + p_estimated_cost_micros > v_global_cost.cost_limit_micros then
    raise exception 'global OpenAI cost limit is exhausted';
  end if;

  select count(*)::integer
    into v_reserved_slots
    from public.comment_translator_paid_openai_slots
   where slot_state in ('active', 'uncertain')
     and lease_until > p_now;
  if v_reserved_slots >= v_config.openai_slot_limit then
    raise exception 'OpenAI slot capacity is exhausted';
  end if;

  v_minute_start := date_trunc('minute', p_now);
  insert into public.comment_translator_paid_openai_minute_buckets (minute_start)
  values (v_minute_start)
  on conflict (minute_start) do nothing;
  select *
    into v_minute
    from public.comment_translator_paid_openai_minute_buckets
   where minute_start = v_minute_start
   for update;
  v_rpm_limit := floor(v_config.openai_rpm_limit * 0.70);
  if v_minute.reserved_requests + p_request_count > v_rpm_limit then
    raise exception 'OpenAI RPM reservation is exhausted';
  end if;

  select coalesce(sum(token_count), 0)::bigint
    into v_rolling_tokens
    from public.comment_translator_paid_openai_rate_reservations
    where reservation_state in ('reserved', 'uncertain', 'completed')
     and reserved_at > p_now - interval '60 seconds'
     and expires_at > p_now;
  if v_rolling_tokens + p_token_count > floor(v_config.openai_tpm_limit * 0.70) then
    raise exception 'OpenAI TPM reservation is exhausted';
  end if;

  v_session_lease_token := case
    when v_lease.id is not null
      and v_lease.lease_state in ('active', 'uncertain')
      and v_lease.lease_until > p_now
      and v_lease.attempt_id = p_attempt_id
    then v_lease.lease_token
    else gen_random_uuid()
  end;
  v_openai_slot_token := gen_random_uuid();

  if v_lease.id is null then
    insert into public.comment_translator_paid_session_leases (
    session_reference_id,
    owner_user_id,
    lease_state,
    provider_attempt,
    lease_until,
    lease_token,
    attempt_id,
    created_at,
    updated_at
  )
    values (
    p_session_reference_id,
    p_owner_user_id,
    'active',
    p_provider_attempt,
    p_now + interval '120 seconds',
    v_session_lease_token,
    p_attempt_id,
    p_now,
    p_now
    );
  else
    update public.comment_translator_paid_session_leases
       set owner_user_id = p_owner_user_id,
           lease_state = 'active',
           provider_attempt = p_provider_attempt,
           lease_until = p_now + interval '120 seconds',
           lease_token = v_session_lease_token,
           attempt_id = p_attempt_id,
           updated_at = p_now
     where id = v_lease.id;
  end if;

  insert into public.comment_translator_paid_openai_slots (
    session_reference_id,
    attempt_id,
    provider_attempt,
    slot_state,
    lease_until,
    lease_token,
    created_at,
    updated_at
  )
  values (
    p_session_reference_id,
    p_attempt_id,
    p_provider_attempt,
    'active',
    p_now + interval '120 seconds',
    v_openai_slot_token,
    p_now,
    p_now
  );

  insert into public.comment_translator_paid_openai_rate_reservations (
    attempt_id,
    provider_attempt,
    minute_start,
    request_count,
    token_count,
    reservation_state,
    reserved_at,
    expires_at
  )
  values (
    p_attempt_id,
    p_provider_attempt,
    v_minute_start,
    p_request_count,
    p_token_count,
    'reserved',
    p_now,
    p_now + interval '120 seconds'
  );

  update public.comment_translator_paid_openai_minute_buckets
     set reserved_requests = reserved_requests + p_request_count,
         updated_at = p_now
   where minute_start = v_minute_start;

  if v_shared_attempt.id is null then
    update public.comment_translator_paid_billing_period_usage
       set reserved_input_characters = reserved_input_characters + p_input_characters,
           updated_at = p_now
     where id = v_usage.id;
  end if;
  update public.comment_translator_paid_owner_cost_buckets
     set reserved_cost_micros = reserved_cost_micros + p_estimated_cost_micros,
         updated_at = p_now
   where id = v_owner_cost.id;
  update public.comment_translator_paid_global_cost_buckets
     set reserved_cost_micros = reserved_cost_micros + p_estimated_cost_micros,
         updated_at = p_now
   where id = v_global_cost.id;

  insert into public.comment_translator_paid_logical_attempts (
    attempt_id, owner_user_id, billing_period_usage_id, period_start, period_end,
    input_characters, logical_state, expires_at, created_at, updated_at
  )
  values (
    p_attempt_id, p_owner_user_id, v_usage.id, p_period_start, p_period_end,
    p_input_characters, 'reserved', p_now + interval '24 hours', p_now, p_now
  )
  on conflict (attempt_id) do nothing;

  insert into public.comment_translator_paid_attempt_receipts (
    attempt_id,
    provider_attempt,
    provider_kind,
    session_reference_id,
    owner_user_id,
    period_start,
    period_end,
    utc_month,
    attempt_state,
    expires_at,
    billing_period_usage_id,
    owner_cost_bucket_id,
    global_cost_bucket_id,
    reserved_input_characters,
    requested_input_characters,
    reserved_cost_micros,
    requested_cost_micros,
    requested_request_count,
    requested_token_count,
    created_at,
    updated_at
  )
  values (
    p_attempt_id,
    p_provider_attempt,
    'openai_attempt',
    p_session_reference_id,
    p_owner_user_id,
    p_period_start,
    p_period_end,
    p_utc_month,
    'reserved',
    p_now + interval '120 seconds',
    v_usage.id,
    v_owner_cost.id,
    v_global_cost.id,
    coalesce(v_logical.input_characters, p_input_characters),
    p_input_characters,
    p_estimated_cost_micros,
    p_estimated_cost_micros,
    p_request_count,
    p_token_count,
    p_now,
    p_now
  );

  return query select 'reserved'::text, v_session_lease_token, v_openai_slot_token;
end;
$$;

create or replace function public.ct_paid_extend_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_openai_slot_lease_token uuid,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  update public.comment_translator_paid_session_leases
     set lease_until = p_now + interval '120 seconds',
         updated_at = p_now
   where attempt_id = p_attempt_id
     and lease_token = p_session_lease_token
     and lease_state in ('active', 'uncertain')
     and lease_until > p_now;
  if not found then
    raise exception 'stale session lease token is not valid for update';
  end if;

  update public.comment_translator_paid_openai_slots
     set lease_until = p_now + interval '120 seconds',
         updated_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt
      and lease_token = p_openai_slot_lease_token
      and slot_state in ('active', 'uncertain')
     and lease_until > p_now;
  if not found then
    raise exception 'stale OpenAI slot token is not valid for update';
  end if;

  update public.comment_translator_paid_attempt_receipts
     set expires_at = p_now + interval '120 seconds',
         updated_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt
      and attempt_state in ('reserved', 'uncertain');
  if not found then
    raise exception 'attempt receipt is not extendable';
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_finalize_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_openai_slot_lease_token uuid,
  p_outcome text,
  p_actual_input_characters bigint default null,
  p_actual_cost_micros bigint default null,
  p_provider_failure_class text default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_slot public.comment_translator_paid_openai_slots%rowtype;
  v_actual_characters bigint;
  v_billing_characters bigint;
  v_active_sibling_count integer;
  v_openai_receipt_count integer;
  v_actual_cost bigint;
  v_logical_characters_already_settled boolean;
  v_rate public.comment_translator_paid_openai_rate_reservations%rowtype;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_outcome not in ('completed', 'uncertain_inflight', 'provider_not_reached', 'provider_reached_failed') then
    raise exception 'OpenAI attempt outcome is not valid';
  end if;
  if p_outcome in ('uncertain_inflight', 'provider_not_reached', 'provider_reached_failed')
    and p_provider_failure_class is null
  then
    raise exception 'OpenAI provider failure class is required';
  end if;
  if p_provider_failure_class is not null
    and p_provider_failure_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'invalid-response', 'quota', 'configuration', 'policy')
  then
    raise exception 'OpenAI provider failure class is not valid';
  end if;
  if p_outcome = 'provider_not_reached'
    and p_provider_failure_class not in ('network', 'timeout', 'configuration', 'policy')
  then
    raise exception 'OpenAI outcome and failure class binding conflict';
  end if;
  if p_outcome = 'completed' and p_provider_failure_class is not null then
    raise exception 'completed OpenAI attempt cannot bind a provider failure class';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;
  if v_attempt.provider_kind <> 'openai_attempt' then
    raise exception 'attempt provider binding conflict';
  end if;
  if v_attempt.attempt_state in ('committed', 'released', 'expired') then
    if v_attempt.attempt_state = 'committed' then
      if v_attempt.provider_failure_class is null and p_outcome = 'completed' then
        if coalesce(p_actual_input_characters, v_attempt.requested_input_characters) is distinct from v_attempt.committed_input_characters
          or coalesce(p_actual_cost_micros, v_attempt.requested_cost_micros) is distinct from v_attempt.committed_cost_micros
        then
          raise exception 'OpenAI terminal attempt outcome binding conflict';
        end if;
        return true;
      end if;
      if v_attempt.provider_failure_class is not null
        and p_outcome = 'provider_reached_failed'
        and v_attempt.provider_failure_class is not distinct from p_provider_failure_class
      then
        return true;
      end if;
    end if;
    if v_attempt.attempt_state = 'released'
      and p_outcome = 'provider_not_reached'
      and v_attempt.provider_failure_class is not distinct from p_provider_failure_class
    then
      return true;
    end if;
    if v_attempt.attempt_state = 'expired' then
      raise exception 'OpenAI terminal attempt outcome binding conflict';
    end if;
    raise exception 'OpenAI terminal attempt outcome binding conflict';
  end if;

  if p_outcome in ('uncertain_inflight', 'provider_not_reached', 'provider_reached_failed')
    and v_attempt.provider_failure_class is not null
    and v_attempt.provider_failure_class is distinct from p_provider_failure_class
  then
    raise exception 'OpenAI provider failure class binding conflict';
  end if;
  select *
    into v_lease
    from public.comment_translator_paid_session_leases
   where attempt_id = p_attempt_id
   for update;
  if v_lease.id is null
    or v_lease.lease_token is distinct from p_session_lease_token
    or v_lease.provider_attempt is distinct from p_provider_attempt
    or v_lease.owner_user_id is distinct from v_attempt.owner_user_id
    or v_lease.session_reference_id is distinct from v_attempt.session_reference_id
  then
    raise exception 'stale session lease token is not valid for update';
  end if;

  select *
    into v_slot
    from public.comment_translator_paid_openai_slots
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_slot.id is null
    or v_slot.lease_token is distinct from p_openai_slot_lease_token
  then
    raise exception 'stale OpenAI slot token is not valid for update';
  end if;

  if v_lease.lease_state not in ('active', 'uncertain')
    or v_lease.lease_until <= p_now
    or v_slot.slot_state not in ('active', 'uncertain')
    or v_slot.lease_until <= p_now
  then
    raise exception 'stale provider lease token is not valid for update';
  end if;

  select logical_state = 'committed'
    into v_logical_characters_already_settled
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;

  if p_outcome = 'uncertain_inflight' then
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'uncertain',
           provider_failure_class = p_provider_failure_class,
           expires_at = p_now + interval '120 seconds',
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
      update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = p_now + interval '120 seconds',
           updated_at = p_now
      where attempt_id = p_attempt_id
        and lease_token = p_session_lease_token;
      update public.comment_translator_paid_openai_slots
       set slot_state = 'uncertain',
           lease_until = p_now + interval '120 seconds',
           updated_at = p_now
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt
        and lease_token = p_openai_slot_lease_token;
    update public.comment_translator_paid_openai_rate_reservations
       set reservation_state = 'uncertain',
           expires_at = p_now + interval '120 seconds'
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt;
    return true;
  end if;

  if p_outcome = 'completed' then
    v_actual_characters := coalesce(p_actual_input_characters, v_attempt.requested_input_characters);
    v_billing_characters := case when v_logical_characters_already_settled then 0 else v_actual_characters end;
    v_actual_cost := coalesce(p_actual_cost_micros, v_attempt.reserved_cost_micros);
    if v_actual_characters < 0 or v_actual_characters > v_attempt.requested_input_characters then
      raise exception 'OpenAI character commit is not valid';
    end if;
    if v_actual_cost < 0 or v_actual_cost > v_attempt.reserved_cost_micros then
      raise exception 'OpenAI cost commit is not valid';
    end if;

    perform public.ct_paid_commit_billing_period_characters(
      p_attempt_id,
      p_provider_attempt,
      v_billing_characters,
      p_now
    );

    update public.comment_translator_paid_owner_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           committed_cost_micros = committed_cost_micros + v_actual_cost,
           updated_at = p_now
     where id = v_attempt.owner_cost_bucket_id;
    if not found then
      raise exception 'OpenAI owner cost bucket is missing';
    end if;
    update public.comment_translator_paid_global_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           committed_cost_micros = committed_cost_micros + v_actual_cost,
           updated_at = p_now
     where id = v_attempt.global_cost_bucket_id;
    if not found then
      raise exception 'OpenAI global cost bucket is missing';
    end if;

    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'committed',
           provider_failure_class = null,
           reserved_cost_micros = 0,
           committed_cost_micros = v_actual_cost,
           updated_at = p_now
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt;
    update public.comment_translator_paid_openai_rate_reservations
       set reservation_state = 'completed'
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt;
  elsif p_outcome = 'provider_reached_failed' then
    -- The provider was reached, so reserved cost and RPM are conservatively
    -- consumed. Logical characters remain reserved for an allowed fallback.
    update public.comment_translator_paid_owner_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           committed_cost_micros = committed_cost_micros + v_attempt.reserved_cost_micros,
           updated_at = p_now
     where id = v_attempt.owner_cost_bucket_id;
    if not found then
      raise exception 'OpenAI owner cost bucket is missing';
    end if;
    update public.comment_translator_paid_global_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           committed_cost_micros = committed_cost_micros + v_attempt.reserved_cost_micros,
           updated_at = p_now
     where id = v_attempt.global_cost_bucket_id;
    if not found then
      raise exception 'OpenAI global cost bucket is missing';
    end if;
    select *
      into v_rate
      from public.comment_translator_paid_openai_rate_reservations
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt
     for update;
    if v_rate.id is null or v_rate.reservation_state not in ('reserved', 'uncertain') then
      raise exception 'OpenAI rate reservation is not active';
    end if;
    update public.comment_translator_paid_openai_rate_reservations
       set reservation_state = 'completed'
     where id = v_rate.id
       and reservation_state in ('reserved', 'uncertain');
    if not found then
      raise exception 'OpenAI rate reservation is not active';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'committed',
           provider_failure_class = p_provider_failure_class,
           reserved_cost_micros = 0,
           committed_cost_micros = v_attempt.reserved_cost_micros,
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
  elsif p_outcome = 'provider_not_reached' then
    -- OpenAI provider failure releases only OpenAI cost/capacity. The logical
    -- character reservation remains available to the Azure provider attempt;
    -- Azure failure (or an explicit no-fallback release) settles it as released.
    update public.comment_translator_paid_owner_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           updated_at = p_now
     where id = v_attempt.owner_cost_bucket_id;
    if not found then
      raise exception 'OpenAI owner cost bucket is missing';
    end if;
    update public.comment_translator_paid_global_cost_buckets
       set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
           updated_at = p_now
     where id = v_attempt.global_cost_bucket_id;
    if not found then
      raise exception 'OpenAI global cost bucket is missing';
    end if;
    select *
      into v_rate
      from public.comment_translator_paid_openai_rate_reservations
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt
     for update;
    if v_rate.id is null or v_rate.reservation_state not in ('reserved', 'uncertain') then
      raise exception 'OpenAI rate reservation is not active';
    end if;
    update public.comment_translator_paid_openai_minute_buckets
       set reserved_requests = reserved_requests - v_rate.request_count,
           updated_at = p_now
     where minute_start = v_rate.minute_start
       and reserved_requests >= v_rate.request_count;
    if not found then
      raise exception 'OpenAI minute bucket is missing';
    end if;
    update public.comment_translator_paid_openai_rate_reservations
       set reservation_state = 'released'
     where id = v_rate.id
       and reservation_state in ('reserved', 'uncertain');
    if not found then
      raise exception 'OpenAI rate reservation is not active';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'released',
           provider_failure_class = p_provider_failure_class,
           reserved_cost_micros = 0,
           updated_at = p_now
      where attempt_id = p_attempt_id
        and provider_attempt = p_provider_attempt;
    perform public.ct_paid_settle_logical_attempt_after_provider_failure(p_attempt_id, false, p_now);
  end if;

  select
    count(*) filter (
      where provider_attempt <> p_provider_attempt
        and attempt_state in ('reserved', 'uncertain')
        and expires_at > p_now
    )::integer,
    count(*) filter (where provider_kind = 'openai_attempt')::integer
    into v_active_sibling_count, v_openai_receipt_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;
  if (
    p_outcome = 'provider_reached_failed'
    and (
      (p_provider_failure_class = 'invalid-response' and v_openai_receipt_count = 1)
      or p_provider_failure_class in ('network', 'timeout', 'rate-limit', 'server-error')
    )
  ) or (
    p_outcome = 'provider_not_reached'
    and p_provider_failure_class in ('network', 'timeout')
  ) then
    -- A retry/fallback-eligible terminal OpenAI failure keeps the logical batch
    -- mutually exclusive while the provider slot itself is released.
    update public.comment_translator_paid_session_leases
       set lease_state = 'active',
           lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt
       and lease_token = p_session_lease_token;
  elsif v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released',
           lease_until = p_now,
           updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  end if;
  update public.comment_translator_paid_openai_slots
     set slot_state = 'released',
         lease_until = p_now,
         updated_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt
      and lease_token = p_openai_slot_lease_token;
  if not found then
    raise exception 'OpenAI slot reservation is missing';
  end if;
  if p_outcome <> 'completed' then
    update public.comment_translator_paid_provider_circuits
       set probe_attempt_id = null,
           probe_lease_until = null,
           updated_at = p_now
     where provider = 'openai'
       and circuit_state = 'half_open'
       and probe_attempt_id = p_attempt_id;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_reclaim_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_active_sibling_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;
  if v_attempt.provider_kind <> 'openai_attempt' then
    raise exception 'attempt provider binding conflict';
  end if;
  if v_attempt.attempt_state not in ('reserved', 'uncertain') or v_attempt.expires_at > p_now then
    return false;
  end if;

  -- Expired uncertain OpenAI work conservatively commits the reserved cost,
  -- but does not claim logical translation success. Character settlement stays
  -- reserved for an authoritative result or Azure fallback.
  update public.comment_translator_paid_owner_cost_buckets
     set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
         committed_cost_micros = committed_cost_micros + v_attempt.reserved_cost_micros,
         updated_at = p_now
   where id = v_attempt.owner_cost_bucket_id;
  if not found then
    raise exception 'OpenAI owner cost bucket is missing';
  end if;
  update public.comment_translator_paid_global_cost_buckets
     set reserved_cost_micros = reserved_cost_micros - v_attempt.reserved_cost_micros,
         committed_cost_micros = committed_cost_micros + v_attempt.reserved_cost_micros,
         updated_at = p_now
   where id = v_attempt.global_cost_bucket_id;
  if not found then
    raise exception 'OpenAI global cost bucket is missing';
  end if;
  update public.comment_translator_paid_attempt_receipts
     set attempt_state = 'expired',
         reserved_cost_micros = 0,
         committed_cost_micros = v_attempt.reserved_cost_micros,
         updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
  perform public.ct_paid_settle_logical_attempt_after_provider_failure(p_attempt_id, true, p_now);
  select count(*)::integer
    into v_active_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and attempt_state in ('reserved', 'uncertain')
     and expires_at > p_now;
  if v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released', lease_until = p_now, updated_at = p_now
      where attempt_id = p_attempt_id;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
      where attempt_id = p_attempt_id;
  end if;
  update public.comment_translator_paid_openai_slots
     set slot_state = 'released', lease_until = p_now, updated_at = p_now
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt;
  if not found then
    raise exception 'OpenAI slot reservation is missing';
  end if;
  update public.comment_translator_paid_openai_rate_reservations
     set reservation_state = 'completed', expires_at = p_now
    where attempt_id = p_attempt_id
      and provider_attempt = p_provider_attempt;
  update public.comment_translator_paid_provider_circuits
     set probe_attempt_id = null,
         probe_lease_until = null,
         updated_at = p_now
   where provider = 'openai'
     and circuit_state = 'half_open'
     and probe_attempt_id = p_attempt_id;
  return true;
end;
$$;

create or replace function public.ct_paid_azure_direct_fallback(
  p_attempt_id text,
  p_provider_attempt text,
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_utc_month date,
  p_input_characters bigint,
  p_now timestamptz default now()
)
returns table (reservation_status text, session_lease_token uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_config public.comment_translator_paid_capacity_config%rowtype;
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_openai_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_usage public.comment_translator_paid_billing_period_usage%rowtype;
  v_shared_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_azure public.comment_translator_paid_azure_fallback_buckets%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_openai_slot public.comment_translator_paid_openai_slots%rowtype;
  v_openai_rate public.comment_translator_paid_openai_rate_reservations%rowtype;
  v_owner_cost public.comment_translator_paid_owner_cost_buckets%rowtype;
  v_global_cost public.comment_translator_paid_global_cost_buckets%rowtype;
  v_receipt_count integer;
  v_openai_receipt_count integer;
  v_azure_receipt_count integer;
  v_usage_id uuid;
  v_azure_id uuid;
  v_session_lease_token uuid;
  v_day_physical_total bigint;
  v_free_usage_characters bigint;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if length(trim(p_attempt_id)) = 0
    or length(trim(p_provider_attempt)) = 0
    or length(trim(p_session_reference_id)) = 0
    or p_input_characters <= 0
    or p_input_characters > 7500
  then
    raise exception 'Azure fallback reservation request is not valid';
  end if;

  select *
    into v_attempt
   from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is not null then
    if v_attempt.provider_kind <> 'azure_direct_fallback' then
      raise exception 'attempt provider binding conflict';
    end if;
    if v_attempt.session_reference_id <> p_session_reference_id then
      raise exception 'attempt session binding conflict';
    end if;
    if v_attempt.owner_user_id <> p_owner_user_id then
      raise exception 'attempt owner binding conflict';
    end if;
    if v_attempt.period_start is distinct from p_period_start or v_attempt.period_end is distinct from p_period_end then
      raise exception 'attempt period binding conflict';
    end if;
    if v_attempt.utc_month <> p_utc_month then
      raise exception 'attempt UTC month binding conflict';
    end if;
    if v_attempt.requested_input_characters <> p_input_characters then
      raise exception 'attempt input binding conflict';
    end if;
    if v_attempt.requested_cost_micros <> 0
      or v_attempt.requested_request_count <> 0
      or v_attempt.requested_token_count <> 0
    then
      raise exception 'Azure attempt cost binding conflict';
    end if;
    if v_attempt.attempt_state in ('committed', 'released', 'expired') then
      return query select v_attempt.attempt_state, null::uuid;
      return;
    end if;
    select lease_token
      into v_session_lease_token
      from public.comment_translator_paid_session_leases
     where attempt_id = p_attempt_id
       and owner_user_id = p_owner_user_id
       and session_reference_id = p_session_reference_id
       and lease_state in ('active', 'uncertain')
       and lease_until > p_now
     for update;
    if v_session_lease_token is null then
      raise exception 'active attempt lease binding is unavailable';
    end if;
    return query select v_attempt.attempt_state, v_session_lease_token;
    return;
  end if;

  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  if v_logical.attempt_id is not null then
    if v_logical.owner_user_id <> p_owner_user_id then
      raise exception 'logical attempt owner binding conflict';
    end if;
    if v_logical.period_start is distinct from p_period_start or v_logical.period_end is distinct from p_period_end then
      raise exception 'logical attempt period binding conflict';
    end if;
    if p_input_characters > v_logical.input_characters then
      raise exception 'logical attempt input binding conflict';
    end if;
    if v_logical.logical_state <> 'reserved' then
      raise exception 'logical attempt is already settled';
    end if;
  end if;

  perform 1
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
   order by provider_attempt
   for update;
  select count(*)::integer,
         count(*) filter (where provider_kind = 'openai_attempt')::integer,
         count(*) filter (where provider_kind = 'azure_direct_fallback')::integer
    into v_receipt_count, v_openai_receipt_count, v_azure_receipt_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id;
  if v_azure_receipt_count > 0
    or v_openai_receipt_count <> v_receipt_count
    or v_openai_receipt_count > 2
  then
    raise exception 'Azure fallback permits no prior Azure and at most two OpenAI receipts';
  end if;

  select *
    into v_openai_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = 'openai'
   for update;
  if v_openai_circuit.provider is null then
    raise exception 'OpenAI circuit state is unavailable';
  end if;
  if v_receipt_count = 0 then
    if v_logical.attempt_id is not null then
      raise exception 'direct Azure logical attempt binding conflict';
    end if;
    if v_openai_circuit.circuit_state <> 'degraded' then
      raise exception 'degraded OpenAI is required for direct Azure';
    end if;
    if v_openai_circuit.last_error_class is null
      or v_openai_circuit.last_error_class not in ('network', 'timeout', 'rate-limit', 'server-error')
    then
      raise exception 'OpenAI failure class does not permit direct Azure fallback';
    end if;
  else
    select *
      into v_lease
      from public.comment_translator_paid_session_leases
     where attempt_id = p_attempt_id
       and session_reference_id = p_session_reference_id
       and owner_user_id = p_owner_user_id
     for update;
    select *
      into v_shared_attempt
      from public.comment_translator_paid_attempt_receipts
     where attempt_id = p_attempt_id
       and provider_kind = 'openai_attempt'
     order by created_at desc, id desc
     limit 1
     for update;
    if v_shared_attempt.id is null then
      raise exception 'Azure fallback requires an OpenAI predecessor';
    end if;
    if v_shared_attempt.provider_failure_class is null
      or v_shared_attempt.provider_failure_class not in ('network', 'timeout', 'rate-limit', 'server-error')
    then
      raise exception 'OpenAI predecessor failure class does not permit Azure fallback';
    end if;
    if v_shared_attempt.owner_user_id <> p_owner_user_id
      or v_shared_attempt.session_reference_id <> p_session_reference_id
      or v_shared_attempt.period_start is distinct from p_period_start
      or v_shared_attempt.period_end is distinct from p_period_end
      or v_shared_attempt.utc_month <> p_utc_month
    then
      raise exception 'Azure fallback OpenAI binding conflict';
    end if;
    -- OpenAI terminal failure -> same batch lease remains active -> different
    -- batch cannot acquire -> Azure fallback succeeds. The immutable receipt
    -- selects the predecessor; the mutable lease only proves current ownership.
    if v_lease.id is null
      or v_lease.provider_attempt is distinct from v_shared_attempt.provider_attempt
      or not (
        v_lease.lease_state = 'released'
        or (
          v_lease.lease_state in ('active', 'uncertain')
          and v_lease.lease_until > p_now
        )
      )
    then
      raise exception 'OpenAI predecessor session lease is not safe for Azure fallback';
    end if;
    select *
      into v_openai_slot
      from public.comment_translator_paid_openai_slots
     where attempt_id = p_attempt_id
       and provider_attempt = v_shared_attempt.provider_attempt
     for update;
    select *
      into v_openai_rate
      from public.comment_translator_paid_openai_rate_reservations
     where attempt_id = p_attempt_id
       and provider_attempt = v_shared_attempt.provider_attempt
     for update;
    if v_openai_receipt_count = 2 then
      if v_shared_attempt.attempt_state not in ('committed', 'released')
        or v_shared_attempt.provider_failure_class not in ('network', 'timeout', 'rate-limit', 'server-error')
      then
        raise exception 'latest OpenAI retry receipt is not safe for Azure fallback';
      end if;
      if exists (
        select 1
          from public.comment_translator_paid_attempt_receipts receipt
         where receipt.attempt_id = p_attempt_id
           and receipt.provider_kind = 'openai_attempt'
           and (
             receipt.owner_user_id <> p_owner_user_id
             or receipt.session_reference_id <> p_session_reference_id
             or receipt.period_start is distinct from p_period_start
             or receipt.period_end is distinct from p_period_end
             or receipt.utc_month <> p_utc_month
             or receipt.attempt_state in ('reserved', 'uncertain', 'expired')
             or receipt.committed_input_characters <> 0
             or (
               receipt.attempt_state = 'committed'
               and (
                 receipt.provider_failure_class is null
                 or receipt.reserved_cost_micros <> 0
                 or receipt.committed_cost_micros <= 0
                 or not exists (
                   select 1
                     from public.comment_translator_paid_openai_slots slot_row
                    where slot_row.attempt_id = receipt.attempt_id
                      and slot_row.provider_attempt = receipt.provider_attempt
                      and slot_row.slot_state = 'released'
                 )
                 or not exists (
                   select 1
                     from public.comment_translator_paid_openai_rate_reservations rate_row
                    where rate_row.attempt_id = receipt.attempt_id
                      and rate_row.provider_attempt = receipt.provider_attempt
                      and rate_row.reservation_state = 'completed'
                 )
               )
             )
             or (
               receipt.attempt_state = 'released'
               and (
                 receipt.provider_failure_class is null
                 or receipt.reserved_cost_micros <> 0
                 or not exists (
                   select 1
                     from public.comment_translator_paid_openai_slots slot_row
                    where slot_row.attempt_id = receipt.attempt_id
                      and slot_row.provider_attempt = receipt.provider_attempt
                      and slot_row.slot_state = 'released'
                 )
                 or not exists (
                   select 1
                     from public.comment_translator_paid_openai_rate_reservations rate_row
                    where rate_row.attempt_id = receipt.attempt_id
                      and rate_row.provider_attempt = receipt.provider_attempt
                      and rate_row.reservation_state = 'released'
                 )
               )
             )
           )
      ) then
        raise exception 'OpenAI retry chain is not safely terminal';
      end if;
    elsif v_shared_attempt.attempt_state = 'uncertain' then
      if v_openai_receipt_count <> 1 then
        raise exception 'uncertain OpenAI fallback permits one OpenAI receipt';
      end if;
      if v_shared_attempt.reserved_cost_micros <= 0
        or v_openai_slot.id is null
        or v_openai_slot.slot_state <> 'uncertain'
        or v_openai_rate.id is null
        or v_openai_rate.reservation_state <> 'uncertain'
        or v_lease.id is null
        or v_lease.lease_state <> 'uncertain'
        or v_lease.lease_until <= p_now
      then
        raise exception 'uncertain OpenAI resources are not retained';
      end if;
    elsif v_shared_attempt.attempt_state = 'released' then
      if v_shared_attempt.reserved_cost_micros <> 0
        or v_openai_slot.id is null
        or v_openai_slot.slot_state <> 'released'
        or v_openai_rate.id is null
        or v_openai_rate.reservation_state <> 'released'
      then
        raise exception 'OpenAI resources are not released';
      end if;
    elsif v_shared_attempt.attempt_state = 'committed'
      and v_shared_attempt.provider_failure_class is not null
    then
      if v_shared_attempt.reserved_cost_micros <> 0
        or v_shared_attempt.committed_cost_micros <= 0
        or v_shared_attempt.committed_input_characters <> 0
        or v_openai_slot.id is null
        or v_openai_slot.slot_state <> 'released'
        or v_openai_rate.id is null
        or v_openai_rate.reservation_state <> 'completed'
      then
        raise exception 'OpenAI reached-failure resources are not safely terminal';
      end if;
    else
      raise exception 'OpenAI predecessor is not safe for Azure fallback';
    end if;
  end if;

  if p_utc_month <> date_trunc('month', p_now at time zone 'UTC')::date then
    raise exception 'UTC month is not current';
  end if;
  perform public.ct_paid_assert_current_utc_month(p_now);

  -- Azure fallback never bypasses the Paid OpenAI safety caps. It does not
  -- reserve OpenAI cost, but it must atomically prove that both cost
  -- authorities are readable and not already exhausted before a Provider
  -- reservation can be created.
  if v_shared_attempt.id is not null then
    if v_shared_attempt.owner_cost_bucket_id is null
      or v_shared_attempt.global_cost_bucket_id is null
    then
      raise exception 'Paid cost authority is unavailable for Azure fallback';
    end if;
    select *
      into v_owner_cost
      from public.comment_translator_paid_owner_cost_buckets
     where id = v_shared_attempt.owner_cost_bucket_id
     for update;
    select *
      into v_global_cost
      from public.comment_translator_paid_global_cost_buckets
     where id = v_shared_attempt.global_cost_bucket_id
     for update;
  else
    insert into public.comment_translator_paid_owner_cost_buckets (
      owner_user_id, period_start, period_end, updated_at
    )
    values (p_owner_user_id, p_period_start, p_period_end, p_now)
    on conflict (owner_user_id, period_start, period_end) do nothing;
    select *
      into v_owner_cost
      from public.comment_translator_paid_owner_cost_buckets
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     for update;

    insert into public.comment_translator_paid_global_cost_buckets (
      utc_month, updated_at
    )
    values (p_utc_month, p_now)
    on conflict (utc_month) do nothing;
    select *
      into v_global_cost
      from public.comment_translator_paid_global_cost_buckets
     where utc_month = p_utc_month
     for update;
  end if;
  if v_owner_cost.id is null
    or v_global_cost.id is null
  then
    raise exception 'Paid cost authority is unavailable for Azure fallback';
  end if;
  if v_owner_cost.period_state <> 'open'
    or v_owner_cost.reserved_cost_micros + v_owner_cost.committed_cost_micros
      >= v_owner_cost.cost_limit_micros
  then
    raise exception 'individual Paid cost limit is exhausted';
  end if;
  if v_global_cost.utc_month <> p_utc_month
    or v_global_cost.bucket_state <> 'open'
    or v_global_cost.reserved_cost_micros + v_global_cost.committed_cost_micros
      >= v_global_cost.cost_limit_micros
  then
    raise exception 'global Paid cost limit is exhausted';
  end if;

  lock table public.comment_translator_usage_ledger_events in share mode;
  select coalesce(sum(translated_character_estimate), 0)::bigint
    into v_free_usage_characters
    from public.comment_translator_usage_ledger_events
   where usage_month = p_utc_month
     and event_type = 'ai-usage-estimated';

  select *
    into v_config
    from public.comment_translator_paid_capacity_config
   where config_key = true
   for update;
  if v_config.config_key is null then
    raise exception 'Azure fallback capacity configuration is unavailable';
  end if;

  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = 'azure_fallback'
   for update;
  if v_circuit.provider is null or v_circuit.circuit_state in ('degraded', 'disabled') then
    raise exception 'Azure fallback circuit is unavailable';
  end if;
  if v_circuit.circuit_state = 'half_open' then
    if v_circuit.probe_attempt_id is not null
      and v_circuit.probe_attempt_id <> p_attempt_id
      and v_circuit.probe_lease_until is not null
      and v_circuit.probe_lease_until > p_now
    then
      raise exception 'Azure fallback circuit probe is already leased';
    end if;
    update public.comment_translator_paid_provider_circuits
       set probe_attempt_id = p_attempt_id,
           probe_lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where provider = 'azure_fallback';
  end if;

  insert into public.comment_translator_paid_azure_fallback_buckets (
    utc_month,
    free_usage_characters,
    updated_at
  )
  values (p_utc_month, v_free_usage_characters, p_now)
  on conflict (utc_month) do nothing;
  select *
    into v_azure
    from public.comment_translator_paid_azure_fallback_buckets
   where utc_month = p_utc_month
   for update;

  if v_azure.free_usage_characters <> v_free_usage_characters then
    update public.comment_translator_paid_azure_fallback_buckets
       set free_usage_characters = greatest(free_usage_characters, v_free_usage_characters),
           updated_at = p_now
     where id = v_azure.id
    returning * into v_azure;
  end if;
  if v_azure.bucket_state <> 'open' then
    raise exception 'Azure fallback month is closed for new reservations';
  end if;

  if v_azure.reserved_paid_characters + v_azure.committed_paid_characters + p_input_characters
    > v_config.azure_logical_limit_characters
  then
    raise exception 'Azure fallback logical character quota is exhausted';
  end if;

  v_day_physical_total := v_azure.free_usage_characters
    + v_azure.reserved_paid_characters
    + v_azure.committed_paid_characters
    + p_input_characters
    + v_config.physical_safety_margin_characters;
  if v_day_physical_total >= v_config.physical_limit_characters then
    raise exception 'Azure fallback physical shared capacity is exhausted';
  end if;

  if v_shared_attempt.id is not null then
    if v_logical.attempt_id is null
      or v_logical.billing_period_usage_id is distinct from v_shared_attempt.billing_period_usage_id
    then
      raise exception 'logical attempt billing period binding conflict';
    end if;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where id = v_logical.billing_period_usage_id
     for update;
    if v_usage.id is null then
      raise exception 'logical attempt billing period bucket is missing';
    end if;
    if v_usage.owner_user_id <> p_owner_user_id
      or v_usage.period_start is distinct from p_period_start
      or v_usage.period_end is distinct from p_period_end
    then
      raise exception 'logical attempt billing period binding conflict';
    end if;
  else
    perform public.ct_paid_assert_current_paid_period(
      p_owner_user_id,
      p_period_start,
      p_period_end,
      p_now
    );
    insert into public.comment_translator_paid_billing_period_usage (
      owner_user_id, period_start, period_end, updated_at
    )
    values (p_owner_user_id, p_period_start, p_period_end, p_now)
    on conflict (owner_user_id, period_start, period_end) do nothing;
    select *
      into v_usage
      from public.comment_translator_paid_billing_period_usage
     where owner_user_id = p_owner_user_id
       and period_start = p_period_start
       and period_end = p_period_end
     for update;
    if v_usage.period_state <> 'open' then
      raise exception 'billing period is closed for new reservations';
    end if;
    if v_usage.reserved_input_characters + v_usage.committed_input_characters + p_input_characters
      > v_usage.character_limit
    then
      raise exception 'billing period character quota is exhausted';
    end if;
  end if;

  select *
    into v_lease
    from public.comment_translator_paid_session_leases
   where session_reference_id = p_session_reference_id
   for update;
  if v_lease.id is not null
    and v_lease.owner_user_id <> p_owner_user_id
  then
    raise exception 'session owner binding conflict';
  end if;
  if v_lease.id is not null
    and v_lease.lease_state in ('active', 'uncertain')
    and v_lease.lease_until > p_now
    and v_lease.attempt_id <> p_attempt_id
  then
    raise exception 'session has an active provider lease';
  end if;

  v_session_lease_token := case
    when v_lease.id is not null
      and v_lease.lease_state in ('active', 'uncertain')
      and v_lease.lease_until > p_now
      and v_lease.attempt_id = p_attempt_id
    then v_lease.lease_token
    else gen_random_uuid()
  end;
  if v_lease.id is null then
    insert into public.comment_translator_paid_session_leases (
      session_reference_id,
      owner_user_id,
      lease_state,
      provider_attempt,
      lease_until,
      lease_token,
      attempt_id,
      created_at,
      updated_at
    )
    values (
      p_session_reference_id,
      p_owner_user_id,
      'active',
       p_provider_attempt,
      p_now + interval '120 seconds',
      v_session_lease_token,
      p_attempt_id,
      p_now,
      p_now
    );
  elsif v_lease.lease_state in ('active', 'uncertain')
    and v_lease.lease_until > p_now
    and v_lease.attempt_id = p_attempt_id
  then
    update public.comment_translator_paid_session_leases
       set lease_state = 'active',
           provider_attempt = p_provider_attempt,
           lease_until = p_now + interval '120 seconds',
           attempt_id = p_attempt_id,
           updated_at = p_now
     where id = v_lease.id;
  else
    update public.comment_translator_paid_session_leases
       set owner_user_id = p_owner_user_id,
           lease_state = 'active',
            provider_attempt = p_provider_attempt,
           lease_until = p_now + interval '120 seconds',
           lease_token = v_session_lease_token,
           attempt_id = p_attempt_id,
           updated_at = p_now
     where id = v_lease.id;
  end if;

  if v_shared_attempt.id is null then
    update public.comment_translator_paid_billing_period_usage
       set reserved_input_characters = reserved_input_characters + p_input_characters,
           updated_at = p_now
     where id = v_usage.id
    returning id into v_usage_id;
  else
    v_usage_id := v_usage.id;
  end if;

  update public.comment_translator_paid_azure_fallback_buckets
     set reserved_paid_characters = reserved_paid_characters + p_input_characters,
         updated_at = p_now
   where id = v_azure.id
  returning id into v_azure_id;

  insert into public.comment_translator_paid_logical_attempts (
    attempt_id, owner_user_id, billing_period_usage_id, period_start, period_end,
    input_characters, logical_state, expires_at, created_at, updated_at
  )
  values (
    p_attempt_id, p_owner_user_id, v_usage_id, p_period_start, p_period_end,
    p_input_characters, 'reserved', p_now + interval '24 hours', p_now, p_now
  )
  on conflict (attempt_id) do nothing;

  insert into public.comment_translator_paid_attempt_receipts (
    attempt_id,
    provider_attempt,
    provider_kind,
    session_reference_id,
    owner_user_id,
    period_start,
    period_end,
    utc_month,
    attempt_state,
    expires_at,
    billing_period_usage_id,
    azure_bucket_id,
    reserved_input_characters,
    requested_input_characters,
    created_at,
    updated_at
  )
  values (
    p_attempt_id,
    p_provider_attempt,
    'azure_direct_fallback',
    p_session_reference_id,
    p_owner_user_id,
    p_period_start,
    p_period_end,
    p_utc_month,
    'reserved',
    p_now + interval '120 seconds',
    v_usage_id,
    v_azure_id,
    p_input_characters,
    p_input_characters,
    p_now,
    p_now
  );

  return query select 'reserved'::text, v_session_lease_token;
end;
$$;

create or replace function public.ct_paid_finalize_azure_fallback(
  p_attempt_id text,
  p_provider_attempt text,
  p_session_lease_token uuid,
  p_outcome text,
  p_actual_input_characters bigint default null,
  p_now timestamptz default now(),
  p_provider_failure_class text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_lease public.comment_translator_paid_session_leases%rowtype;
  v_actual_characters bigint;
  v_billing_characters bigint;
  v_logical_characters_already_settled boolean;
  v_active_sibling_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  if p_outcome not in ('completed', 'uncertain_inflight', 'provider_not_reached', 'provider_reached_failed') then
    raise exception 'Azure fallback outcome is not valid';
  end if;
  if p_outcome = 'provider_not_reached' and p_provider_failure_class is null then
    -- Backward-compatible trusted caller normalization. No raw provider detail is
    -- persisted; new callers may provide a more specific sanitized class.
    p_provider_failure_class := 'network';
  end if;
  if p_outcome in ('uncertain_inflight', 'provider_not_reached', 'provider_reached_failed')
    and p_provider_failure_class is null
  then
    raise exception 'Azure provider failure class is required';
  end if;
  if p_provider_failure_class is not null
    and p_provider_failure_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'invalid-response', 'quota', 'configuration', 'policy')
  then
    raise exception 'Azure provider failure class is not valid';
  end if;
  if p_outcome = 'completed' and p_provider_failure_class is not null then
    raise exception 'completed Azure attempt cannot bind a provider failure class';
  end if;

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;
  if v_attempt.provider_kind <> 'azure_direct_fallback' then
    raise exception 'attempt provider binding conflict';
  end if;
  if v_attempt.attempt_state in ('committed', 'released', 'expired') then
    if v_attempt.attempt_state = 'committed' then
      if v_attempt.provider_failure_class is null and p_outcome = 'completed' then
        if coalesce(p_actual_input_characters, v_attempt.reserved_input_characters) is distinct from v_attempt.committed_input_characters then
          raise exception 'Azure terminal attempt outcome binding conflict';
        end if;
        return true;
      end if;
      if v_attempt.provider_failure_class is not null
        and p_outcome = 'provider_reached_failed'
        and v_attempt.provider_failure_class is not distinct from p_provider_failure_class
      then
        return true;
      end if;
    end if;
    if v_attempt.attempt_state = 'released'
      and p_outcome = 'provider_not_reached'
      and v_attempt.provider_failure_class is not distinct from p_provider_failure_class
    then
      return true;
    end if;
    if v_attempt.attempt_state = 'expired' then
      raise exception 'Azure terminal attempt outcome binding conflict';
    end if;
    raise exception 'Azure terminal attempt outcome binding conflict';
  end if;
  if p_outcome in ('uncertain_inflight', 'provider_not_reached', 'provider_reached_failed')
    and v_attempt.provider_failure_class is not null
    and v_attempt.provider_failure_class is distinct from p_provider_failure_class
  then
    raise exception 'Azure provider failure class binding conflict';
  end if;
  if p_outcome = 'provider_reached_failed' then
    raise exception 'Azure reached-provider failure is not valid for an active attempt';
  end if;
  select *
    into v_lease
    from public.comment_translator_paid_session_leases
   where attempt_id = p_attempt_id
   for update;
  if v_lease.id is null
    or v_lease.lease_token is distinct from p_session_lease_token
  then
    raise exception 'stale session lease token is not valid for update';
  end if;
  if v_lease.lease_state not in ('active', 'uncertain')
    or v_lease.lease_until <= p_now
  then
    raise exception 'stale session lease token is not valid for update';
  end if;

  select logical_state = 'committed'
    into v_logical_characters_already_settled
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;

  if p_outcome = 'uncertain_inflight' then
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'uncertain',
           provider_failure_class = p_provider_failure_class,
           expires_at = p_now + interval '120 seconds',
           updated_at = p_now
     where attempt_id = p_attempt_id
       and provider_attempt = p_provider_attempt;
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
    return true;
  elsif p_outcome = 'completed' then
    v_actual_characters := coalesce(p_actual_input_characters, v_attempt.reserved_input_characters);
    v_billing_characters := case when v_logical_characters_already_settled then 0 else v_actual_characters end;
    if v_actual_characters < 0 or v_actual_characters > v_attempt.reserved_input_characters then
      raise exception 'Azure fallback character commit is not valid';
    end if;
    perform public.ct_paid_commit_billing_period_characters(
      p_attempt_id,
      p_provider_attempt,
      v_billing_characters,
      p_now
    );
    update public.comment_translator_paid_azure_fallback_buckets
       set reserved_paid_characters = reserved_paid_characters - v_attempt.reserved_input_characters,
           committed_paid_characters = committed_paid_characters + v_actual_characters,
           updated_at = p_now
     where id = v_attempt.azure_bucket_id;
    if not found then
      raise exception 'Azure fallback bucket is missing';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'committed',
           provider_failure_class = null,
           updated_at = p_now
       where attempt_id = p_attempt_id
         and provider_attempt = p_provider_attempt;
  elsif p_outcome = 'provider_not_reached' then
    update public.comment_translator_paid_azure_fallback_buckets
       set reserved_paid_characters = reserved_paid_characters - v_attempt.reserved_input_characters,
           updated_at = p_now
     where id = v_attempt.azure_bucket_id;
    if not found then
      raise exception 'Azure fallback bucket is missing';
    end if;
    update public.comment_translator_paid_attempt_receipts
       set attempt_state = 'released',
           provider_failure_class = p_provider_failure_class,
           updated_at = p_now
       where attempt_id = p_attempt_id
         and provider_attempt = p_provider_attempt;
    perform public.ct_paid_settle_logical_attempt_after_provider_failure(p_attempt_id, false, p_now);
  end if;

  select count(*)::integer
    into v_active_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and attempt_state in ('reserved', 'uncertain')
     and expires_at > p_now;
  if v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released', lease_until = p_now, updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
     where attempt_id = p_attempt_id
       and lease_token = p_session_lease_token;
  end if;
  if p_outcome <> 'completed' then
    update public.comment_translator_paid_provider_circuits
       set probe_attempt_id = null,
           probe_lease_until = null,
           updated_at = p_now
     where provider = 'azure_fallback'
       and circuit_state = 'half_open'
       and probe_attempt_id = p_attempt_id;
  end if;
  return true;
end;
$$;

create or replace function public.ct_paid_reclaim_azure_fallback(
  p_attempt_id text,
  p_provider_attempt text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.comment_translator_paid_attempt_receipts%rowtype;
  v_active_sibling_count integer;
begin
  p_now := statement_timestamp();
  perform pg_advisory_xact_lock(47290102);

  select *
    into v_attempt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_attempt.attempt_id is null then
    raise exception 'attempt receipt is missing';
  end if;
  if v_attempt.provider_kind <> 'azure_direct_fallback' then
    raise exception 'attempt provider binding conflict';
  end if;
  if v_attempt.attempt_state not in ('reserved', 'uncertain') or v_attempt.expires_at > p_now then
    return false;
  end if;

  update public.comment_translator_paid_azure_fallback_buckets
     set reserved_paid_characters = reserved_paid_characters - v_attempt.reserved_input_characters,
         committed_paid_characters = committed_paid_characters + v_attempt.reserved_input_characters,
         updated_at = p_now
   where id = v_attempt.azure_bucket_id;
  if not found then
    raise exception 'Azure fallback bucket is missing';
  end if;
  update public.comment_translator_paid_attempt_receipts
     set attempt_state = 'expired',
         committed_input_characters = 0,
         updated_at = p_now
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt;
  perform public.ct_paid_settle_logical_attempt_after_provider_failure(p_attempt_id, true, p_now);

  select count(*)::integer
    into v_active_sibling_count
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt <> p_provider_attempt
     and attempt_state in ('reserved', 'uncertain')
     and expires_at > p_now;
  if v_active_sibling_count = 0 then
    update public.comment_translator_paid_session_leases
       set lease_state = 'released', lease_until = p_now, updated_at = p_now
     where attempt_id = p_attempt_id;
  else
    update public.comment_translator_paid_session_leases
       set lease_state = 'uncertain',
           lease_until = greatest(lease_until, p_now + interval '120 seconds'),
           updated_at = p_now
     where attempt_id = p_attempt_id;
  end if;
  update public.comment_translator_paid_provider_circuits
     set probe_attempt_id = null,
         probe_lease_until = null,
         updated_at = p_now
   where provider = 'azure_fallback'
     and circuit_state = 'half_open'
     and probe_attempt_id = p_attempt_id;
  return true;
end;
$$;

create or replace function public.ct_paid_reserve_poll_budget(
  p_session_reference_id text,
  p_owner_user_id uuid,
  p_daily_budget integer,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.comment_translator_paid_poll_reservations%rowtype;
  v_bucket public.comment_translator_paid_poll_budget_buckets%rowtype;
  v_utc_day date;
  v_day_end timestamptz;
  v_reserve_polls integer;
  v_session_reserved_polls integer;
begin
  p_now := statement_timestamp();
  if length(trim(p_session_reference_id)) = 0 or p_daily_budget <= 0 then
    raise exception 'poll budget reservation request is not valid';
  end if;

  perform pg_advisory_xact_lock(47290103);
  v_utc_day := (p_now at time zone 'UTC')::date;
  select *
    into v_existing
    from public.comment_translator_paid_poll_reservations
   where session_reference_id = p_session_reference_id
     and utc_day = v_utc_day
   for update;
  if v_existing.id is not null then
    if v_existing.owner_user_id <> p_owner_user_id then
      raise exception 'poll reservation owner binding conflict';
    end if;
    select *
      into v_bucket
      from public.comment_translator_paid_poll_budget_buckets
     where utc_day = v_utc_day
     for update;
    if v_bucket.utc_day is null or v_bucket.daily_budget <> p_daily_budget then
      raise exception 'poll budget configuration conflict';
    end if;
    return v_existing.reserved_polls;
  end if;

  if exists (
    select 1
      from public.comment_translator_paid_poll_reservations
     where session_reference_id = p_session_reference_id
       and owner_user_id <> p_owner_user_id
  ) then
    raise exception 'poll reservation owner binding conflict';
  end if;
  select coalesce(sum(reserved_polls), 0)::integer
    into v_session_reserved_polls
    from public.comment_translator_paid_poll_reservations
   where session_reference_id = p_session_reference_id;

  v_day_end := ((v_utc_day + 1)::timestamp at time zone 'UTC');
  v_reserve_polls := least(
    720 - v_session_reserved_polls,
    floor(extract(epoch from (v_day_end - p_now)) / 15)::integer
  );
  if v_reserve_polls <= 0 then
    raise exception 'UTC poll budget window is exhausted';
  end if;

  insert into public.comment_translator_paid_poll_budget_buckets (
    utc_day, daily_budget, updated_at
  )
  values (v_utc_day, p_daily_budget, p_now)
  on conflict (utc_day) do nothing;
  select *
    into v_bucket
    from public.comment_translator_paid_poll_budget_buckets
   where utc_day = v_utc_day
   for update;
  if v_bucket.daily_budget <> p_daily_budget then
    raise exception 'poll budget configuration conflict';
  end if;
  if v_session_reserved_polls = 0
    and v_bucket.reserved_polls + v_reserve_polls > floor(v_bucket.daily_budget * 0.90)
  then
    raise exception 'new Paid poll session threshold is exhausted';
  end if;
  if v_bucket.reserved_polls + v_reserve_polls > v_bucket.daily_budget then
    raise exception 'daily Paid poll budget is exhausted';
  end if;

  insert into public.comment_translator_paid_poll_reservations (
    session_reference_id, owner_user_id, utc_day, reserved_polls, created_at
  )
  values (p_session_reference_id, p_owner_user_id, v_utc_day, v_reserve_polls, p_now);
  update public.comment_translator_paid_poll_budget_buckets
     set reserved_polls = reserved_polls + v_reserve_polls,
         updated_at = p_now
   where utc_day = v_utc_day;

  return v_reserve_polls;
end;
$$;

create or replace function public.ct_paid_record_provider_hourly_detail(
  p_attempt_id text,
  p_provider_attempt text,
  p_source_expires_at timestamptz,
  p_owner_user_id uuid,
  p_provider text,
  p_utc_hour timestamptz,
  p_request_count integer,
  p_session_count integer,
  p_comment_count integer,
  p_input_characters bigint,
  p_output_characters bigint,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_estimated_cost_micros bigint,
  p_success_count integer,
  p_failure_count integer,
  p_latency_up_to_100_ms_count integer,
  p_latency_101_to_250_ms_count integer,
  p_latency_251_to_500_ms_count integer,
  p_latency_501_to_1000_ms_count integer,
  p_latency_1001_to_2500_ms_count integer,
  p_latency_2501_to_5000_ms_count integer,
  p_latency_5001_to_10000_ms_count integer,
  p_latency_over_10000_ms_count integer,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_latency_count integer;
  v_logical public.comment_translator_paid_logical_attempts%rowtype;
  v_provider_receipt public.comment_translator_paid_attempt_receipts%rowtype;
  v_source_receipt public.comment_translator_paid_provider_detail_source_receipts%rowtype;
begin
  p_now := statement_timestamp();
  select *
    into v_logical
    from public.comment_translator_paid_logical_attempts
   where attempt_id = p_attempt_id
   for update;
  select *
    into v_provider_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;

  if v_logical.attempt_id is null
    or v_logical.owner_user_id <> p_owner_user_id
    or v_logical.expires_at <= p_now
    or v_provider_receipt.id is null
    or v_provider_receipt.owner_user_id <> p_owner_user_id
    or v_provider_receipt.provider_kind is distinct from (case
      when p_provider = 'openai' then 'openai_attempt'
      when p_provider = 'azure_fallback' then 'azure_direct_fallback'
      else null
    end)
  then
    raise exception 'provider hourly source authority is not valid';
  end if;

  select *
    into v_source_receipt
    from public.comment_translator_paid_provider_detail_source_receipts
   where attempt_id = p_attempt_id
     and provider_attempt = p_provider_attempt
   for update;
  if v_source_receipt.attempt_id is not null and v_source_receipt.expires_at > p_now then
    return false;
  end if;

  v_latency_count := p_latency_up_to_100_ms_count + p_latency_101_to_250_ms_count
    + p_latency_251_to_500_ms_count + p_latency_501_to_1000_ms_count
    + p_latency_1001_to_2500_ms_count + p_latency_2501_to_5000_ms_count
    + p_latency_5001_to_10000_ms_count + p_latency_over_10000_ms_count;
  if length(trim(p_attempt_id)) = 0
    or length(trim(p_provider_attempt)) = 0
    or p_source_expires_at is distinct from v_provider_receipt.expires_at
    or v_provider_receipt.expires_at <= p_now
    or v_provider_receipt.expires_at > p_now + interval '120 seconds'
    or p_provider not in ('openai', 'azure_fallback')
    or date_trunc('hour', p_utc_hour) <> p_utc_hour
    or p_request_count < 0 or p_session_count < 0 or p_comment_count < 0
    or p_input_characters < 0 or p_output_characters < 0
    or p_input_tokens < 0 or p_output_tokens < 0
    or p_estimated_cost_micros < 0 or p_success_count < 0 or p_failure_count < 0
    or p_latency_up_to_100_ms_count < 0 or p_latency_101_to_250_ms_count < 0
    or p_latency_251_to_500_ms_count < 0 or p_latency_501_to_1000_ms_count < 0
    or p_latency_1001_to_2500_ms_count < 0 or p_latency_2501_to_5000_ms_count < 0
    or p_latency_5001_to_10000_ms_count < 0 or p_latency_over_10000_ms_count < 0
    or v_latency_count > p_request_count
  then
    raise exception 'provider hourly aggregate is not valid';
  end if;

  delete from public.comment_translator_paid_provider_detail_source_receipts
   where ctid in (
     select ctid
       from public.comment_translator_paid_provider_detail_source_receipts
      where expires_at <= p_now
      order by expires_at
      limit 1000
   );

  insert into public.comment_translator_paid_provider_detail_source_receipts (
    attempt_id, provider_attempt, expires_at, created_at, updated_at
  ) values (
    p_attempt_id, p_provider_attempt, v_logical.expires_at, p_now, p_now
  )
  on conflict (attempt_id, provider_attempt) do nothing;
  if not found then
    return false;
  end if;

  insert into public.comment_translator_paid_provider_hourly_details (
    owner_user_id, provider, utc_hour, request_count, session_count, comment_count,
    input_characters, output_characters, input_tokens, output_tokens,
    estimated_cost_micros, success_count, failure_count,
    latency_up_to_100_ms_count, latency_101_to_250_ms_count,
    latency_251_to_500_ms_count, latency_501_to_1000_ms_count,
    latency_1001_to_2500_ms_count, latency_2501_to_5000_ms_count,
    latency_5001_to_10000_ms_count, latency_over_10000_ms_count,
    created_at, updated_at
  ) values (
    p_owner_user_id, p_provider, p_utc_hour, p_request_count, p_session_count, p_comment_count,
    p_input_characters, p_output_characters, p_input_tokens, p_output_tokens,
    p_estimated_cost_micros, p_success_count, p_failure_count,
    p_latency_up_to_100_ms_count, p_latency_101_to_250_ms_count,
    p_latency_251_to_500_ms_count, p_latency_501_to_1000_ms_count,
    p_latency_1001_to_2500_ms_count, p_latency_2501_to_5000_ms_count,
    p_latency_5001_to_10000_ms_count, p_latency_over_10000_ms_count,
    p_now, p_now
  )
  on conflict (owner_user_id, provider, utc_hour) do update
     set request_count = comment_translator_paid_provider_hourly_details.request_count + excluded.request_count,
         session_count = comment_translator_paid_provider_hourly_details.session_count + excluded.session_count,
         comment_count = comment_translator_paid_provider_hourly_details.comment_count + excluded.comment_count,
         input_characters = comment_translator_paid_provider_hourly_details.input_characters + excluded.input_characters,
         output_characters = comment_translator_paid_provider_hourly_details.output_characters + excluded.output_characters,
         input_tokens = comment_translator_paid_provider_hourly_details.input_tokens + excluded.input_tokens,
         output_tokens = comment_translator_paid_provider_hourly_details.output_tokens + excluded.output_tokens,
         estimated_cost_micros = comment_translator_paid_provider_hourly_details.estimated_cost_micros + excluded.estimated_cost_micros,
         success_count = comment_translator_paid_provider_hourly_details.success_count + excluded.success_count,
         failure_count = comment_translator_paid_provider_hourly_details.failure_count + excluded.failure_count,
         latency_up_to_100_ms_count = comment_translator_paid_provider_hourly_details.latency_up_to_100_ms_count + excluded.latency_up_to_100_ms_count,
         latency_101_to_250_ms_count = comment_translator_paid_provider_hourly_details.latency_101_to_250_ms_count + excluded.latency_101_to_250_ms_count,
         latency_251_to_500_ms_count = comment_translator_paid_provider_hourly_details.latency_251_to_500_ms_count + excluded.latency_251_to_500_ms_count,
         latency_501_to_1000_ms_count = comment_translator_paid_provider_hourly_details.latency_501_to_1000_ms_count + excluded.latency_501_to_1000_ms_count,
         latency_1001_to_2500_ms_count = comment_translator_paid_provider_hourly_details.latency_1001_to_2500_ms_count + excluded.latency_1001_to_2500_ms_count,
         latency_2501_to_5000_ms_count = comment_translator_paid_provider_hourly_details.latency_2501_to_5000_ms_count + excluded.latency_2501_to_5000_ms_count,
         latency_5001_to_10000_ms_count = comment_translator_paid_provider_hourly_details.latency_5001_to_10000_ms_count + excluded.latency_5001_to_10000_ms_count,
         latency_over_10000_ms_count = comment_translator_paid_provider_hourly_details.latency_over_10000_ms_count + excluded.latency_over_10000_ms_count,
         updated_at = p_now;
  return true;
end;
$$;

create or replace function public.ct_paid_upsert_session_summary(
  p_owner_user_id uuid,
  p_session_reference_id text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_stop_reason text,
  p_provider_request_count integer,
  p_translated_message_count integer,
  p_input_characters bigint,
  p_output_characters bigint,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  p_now := statement_timestamp();
  if length(trim(p_session_reference_id)) = 0
    or p_provider_request_count < 0 or p_translated_message_count < 0
    or p_input_characters < 0 or p_output_characters < 0
    or (p_ended_at is not null and p_ended_at < p_started_at)
    or (p_stop_reason is not null and (
      length(p_stop_reason) = 0
      or length(p_stop_reason) > 64
      or p_stop_reason !~ '^[a-z0-9][a-z0-9_-]*$'
    ))
  then
    raise exception 'session summary is not valid';
  end if;

  insert into public.comment_translator_paid_session_summaries (
    owner_user_id, session_reference_id, started_at, ended_at, stop_reason,
    provider_request_count, translated_message_count, input_characters, output_characters,
    created_at, updated_at
  ) values (
    p_owner_user_id, p_session_reference_id, p_started_at, p_ended_at, p_stop_reason,
    p_provider_request_count, p_translated_message_count, p_input_characters, p_output_characters,
    p_now, p_now
  )
  on conflict (session_reference_id) do update
     set ended_at = case
           when comment_translator_paid_session_summaries.ended_at is null then excluded.ended_at
           when excluded.ended_at is null then comment_translator_paid_session_summaries.ended_at
           else greatest(comment_translator_paid_session_summaries.ended_at, excluded.ended_at)
         end,
         stop_reason = coalesce(excluded.stop_reason, comment_translator_paid_session_summaries.stop_reason),
         provider_request_count = greatest(comment_translator_paid_session_summaries.provider_request_count, excluded.provider_request_count),
         translated_message_count = greatest(comment_translator_paid_session_summaries.translated_message_count, excluded.translated_message_count),
         input_characters = greatest(comment_translator_paid_session_summaries.input_characters, excluded.input_characters),
         output_characters = greatest(comment_translator_paid_session_summaries.output_characters, excluded.output_characters),
         updated_at = p_now
   where comment_translator_paid_session_summaries.owner_user_id = excluded.owner_user_id
     and comment_translator_paid_session_summaries.started_at = excluded.started_at
  returning id into v_id;
  if v_id is null then
    raise exception 'session summary binding conflict';
  end if;
  return v_id;
end;
$$;

create or replace function public.ct_paid_record_consent(
  p_owner_user_id uuid,
  p_document_type text,
  p_document_version text,
  p_consented_at timestamptz,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  p_now := statement_timestamp();
  if p_document_type not in ('terms', 'privacy', 'paid_conditions')
    or length(trim(p_document_version)) = 0
  then
    raise exception 'consent record is not valid';
  end if;

  insert into public.comment_translator_paid_consents (
    owner_user_id, document_type, document_version, consented_at, created_at
  )
  values (p_owner_user_id, p_document_type, p_document_version, p_consented_at, p_now)
  on conflict (owner_user_id, document_type, document_version) do nothing
  returning id into v_id;

  if v_id is null then
    select id
      into v_id
      from public.comment_translator_paid_consents
     where owner_user_id = p_owner_user_id
       and document_type = p_document_type
       and document_version = p_document_version;
  end if;
  return v_id;
end;
$$;

do $$
declare
  v_table text;
  v_tables constant text[] := array[
    'comment_translator_paid_customers',
    'comment_translator_paid_billing_lifecycles',
    'comment_translator_paid_checkout_holds',
    'comment_translator_paid_checkout_session_bindings',
    'comment_translator_paid_subscription_bindings',
    'comment_translator_paid_external_id_tombstones',
    'comment_translator_paid_entitlements',
    'comment_translator_paid_stripe_event_receipts',
    'comment_translator_paid_capacity_config',
    'comment_translator_paid_capacity_reservations',
    'comment_translator_paid_billing_period_usage',
    'comment_translator_paid_owner_cost_buckets',
    'comment_translator_paid_global_cost_buckets',
    'comment_translator_paid_azure_fallback_buckets',
    'comment_translator_paid_provider_circuits',
    'comment_translator_paid_session_leases',
    'comment_translator_paid_openai_slots',
    'comment_translator_paid_openai_minute_buckets',
    'comment_translator_paid_openai_rate_reservations',
    'comment_translator_paid_poll_budget_buckets',
    'comment_translator_paid_poll_reservations',
    'comment_translator_paid_logical_attempts',
    'comment_translator_paid_attempt_receipts',
    'comment_translator_paid_provider_detail_source_receipts',
    'comment_translator_paid_consents',
    'comment_translator_paid_provider_hourly_details',
    'comment_translator_paid_session_summaries'
  ];
  v_functions constant text[] := array[
    'ct_paid_begin_checkout(uuid,text,timestamptz)',
    'ct_paid_bind_checkout_session(uuid,uuid,uuid,uuid,text,text,timestamptz,boolean,text,timestamptz)',
    'ct_paid_commit_checkout_redirect(uuid,uuid,uuid,uuid,text,text,timestamptz,text,timestamptz)',
    'ct_paid_mark_checkout_expire_required(uuid,uuid,uuid,uuid,text,text,timestamptz,text,timestamptz,timestamptz)',
    'ct_paid_expire_checkout_hold(uuid,uuid,uuid,text,timestamptz,uuid,timestamptz)',
    'ct_paid_claim_stripe_event(text,text,timestamptz,text,timestamptz)',
    'ct_paid_read_entitlement(uuid,uuid)',
    'ct_paid_finalize_stripe_event(text,uuid,text,text,timestamptz)',
    'ct_paid_claim_entitlement_projection(uuid,uuid,timestamptz)',
    'ct_paid_bind_first_subscription(uuid,uuid,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,text,text,uuid,uuid,timestamptz)',
    'ct_paid_project_entitlement(uuid,uuid,uuid,uuid,text,text,text,timestamptz,timestamptz,boolean,text,uuid,uuid,timestamptz,text,text)',
    'ct_paid_claim_reconciler(timestamptz,integer)',
    'ct_paid_finalize_reconciler(uuid,uuid,timestamptz,timestamptz)',
    'ct_paid_retry_reconciler(uuid,uuid,text,timestamptz)',
    'ct_paid_reserve_capacity(uuid,uuid,text,uuid,timestamptz)',
    'ct_paid_convert_capacity(uuid,text,uuid,timestamptz)',
    'ct_paid_release_capacity(uuid,uuid,timestamptz)',
    'ct_paid_reserve_billing_period_characters(text,text,uuid,timestamptz,timestamptz,bigint,timestamptz)',
    'ct_paid_commit_billing_period_characters(text,text,bigint,timestamptz)',
    'ct_paid_release_billing_period_characters(text,text,timestamptz)',
    'ct_paid_settle_logical_attempt_after_provider_failure(text,boolean,timestamptz)',
    'ct_paid_abandon_logical_attempt(text,text,timestamptz)',
    'ct_paid_cleanup_attempt_ledgers(timestamptz,integer)',
    'ct_paid_close_billing_period(uuid,timestamptz,timestamptz,timestamptz)',
    'ct_paid_close_utc_month(date,timestamptz)',
    'ct_paid_disable_provider_circuit(text,timestamptz)',
    'ct_paid_record_provider_circuit_failure(text,text,timestamptz)',
    'ct_paid_probe_provider_circuit(text,timestamptz)',
    'ct_paid_record_provider_circuit_success(text,text,timestamptz)',
    'ct_paid_openai_attempt(text,text,uuid,text,timestamptz,timestamptz,date,bigint,bigint,integer,bigint,timestamptz)',
    'ct_paid_extend_openai_attempt(text,text,uuid,uuid,timestamptz)',
    'ct_paid_finalize_openai_attempt(text,text,uuid,uuid,text,bigint,bigint,text,timestamptz)',
    'ct_paid_reclaim_openai_attempt(text,text,timestamptz)',
    'ct_paid_azure_direct_fallback(text,text,uuid,text,timestamptz,timestamptz,date,bigint,timestamptz)',
    'ct_paid_finalize_azure_fallback(text,text,uuid,text,bigint,timestamptz,text)',
    'ct_paid_reclaim_azure_fallback(text,text,timestamptz)',
    'ct_paid_reserve_poll_budget(text,uuid,integer,timestamptz)',
    'ct_paid_record_provider_hourly_detail(text,text,timestamptz,uuid,text,timestamptz,integer,integer,integer,bigint,bigint,bigint,bigint,bigint,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,timestamptz)',
    'ct_paid_upsert_session_summary(uuid,text,timestamptz,timestamptz,text,integer,integer,bigint,bigint,timestamptz)',
    'ct_paid_record_consent(uuid,text,text,timestamptz,timestamptz)',
    'ct_paid_assert_current_paid_period(uuid,timestamptz,timestamptz,timestamptz)',
    'ct_paid_assert_current_utc_month(timestamptz)'
  ];
  v_trigger_functions constant text[] := array[
    'comment_translator_paid_immutable_binding_guard()',
    'comment_translator_paid_external_id_tombstone_guard()',
    'comment_translator_paid_external_id_reuse_guard()',
    'comment_translator_paid_entitlement_binding_guard()',
    'comment_translator_paid_lifecycle_binding_guard()',
    'comment_translator_paid_checkout_hold_binding_guard()'
  ];
begin
  foreach v_table in array v_tables loop
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', v_table);
  end loop;
  grant select on table public.comment_translator_paid_consents to service_role;
  foreach v_table in array v_functions loop
    execute format('revoke all on function public.%s from public, anon, authenticated', v_table);
    execute format('grant execute on function public.%s to service_role', v_table);
  end loop;
  foreach v_table in array v_trigger_functions loop
    execute format('revoke all on function public.%s from public, anon, authenticated, service_role', v_table);
  end loop;
end;
$$;
