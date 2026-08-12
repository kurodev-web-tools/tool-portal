import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260812120000_comment_translator_paid_core_v1.sql";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

assert.ok(fs.existsSync(path.join(root, migrationPath)), `Paid Core migration exists: ${migrationPath}`);
const sql = read(migrationPath);

const requiredTables = [
  "comment_translator_paid_customers",
  "comment_translator_paid_billing_lifecycles",
  "comment_translator_paid_checkout_holds",
  "comment_translator_paid_checkout_session_bindings",
  "comment_translator_paid_subscription_bindings",
  "comment_translator_paid_external_id_tombstones",
  "comment_translator_paid_entitlements",
  "comment_translator_paid_stripe_event_receipts",
  "comment_translator_paid_capacity_config",
  "comment_translator_paid_capacity_reservations",
  "comment_translator_paid_billing_period_usage",
  "comment_translator_paid_owner_cost_buckets",
  "comment_translator_paid_global_cost_buckets",
  "comment_translator_paid_azure_fallback_buckets",
  "comment_translator_paid_provider_circuits",
  "comment_translator_paid_session_leases",
  "comment_translator_paid_openai_slots",
  "comment_translator_paid_openai_minute_buckets",
  "comment_translator_paid_openai_rate_reservations",
  "comment_translator_paid_poll_budget_buckets",
  "comment_translator_paid_poll_reservations",
  "comment_translator_paid_logical_attempts",
  "comment_translator_paid_attempt_receipts",
  "comment_translator_paid_provider_detail_source_receipts",
  "comment_translator_paid_consents",
  "comment_translator_paid_provider_hourly_details",
  "comment_translator_paid_session_summaries"
];

for (const table of requiredTables) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, "i"), `migration creates ${table}`);
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"), `${table} enables RLS`);
  assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon`, "i"), `${table} rejects anon direct access`);
  assert.match(sql, new RegExp(`revoke all on table public\\.${table} from authenticated`, "i"), `${table} rejects authenticated direct access`);
}

assert.doesNotMatch(sql, /grant\s+all\s+on\s+table[\s\S]+?to\s+service_role/i, "service_role never receives ALL on Paid tables");
assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete|truncate|references|trigger)(?:\s*,\s*(?:insert|update|delete|truncate|references|trigger))*\s+on\s+table[\s\S]+?to\s+service_role/i, "service_role receives no direct Paid table mutation privilege");
assert.match(sql, /revoke all on table public\.%I from public, anon, authenticated, service_role/i, "Paid table privileges are revoked from every direct caller, including service_role");
assert.match(sql, /grant select on table public\.comment_translator_paid_consents to service_role/i, "the trusted consent read keeps its narrow SELECT privilege");
const privilegeBlock = sql.slice(sql.lastIndexOf("do $$"));
for (const table of requiredTables) {
  assert.match(privilegeBlock, new RegExp(`'${table}'`, "i"), `${table} is included in the service_role DML revocation loop`);
}

for (const requiredSql of [
  "owner_user_id uuid not null references auth.users(id) on delete cascade",
  "stripe_customer_id text not null",
  "subscription_binding_id uuid",
  "product_id text not null",
  "price_id text not null",
  "stripe_event_created_at timestamptz not null",
  "processing_started_at timestamptz",
  "lease_until timestamptz",
  "lease_token uuid",
  "attempt_count integer not null default 0",
  "last_error_class text",
  "next_reconcile_at timestamptz",
  "payment_failure_started_at timestamptz",
  "reconcile_lease_until timestamptz",
  "reconcile_lease_token uuid",
  "projection_lease_until timestamptz",
  "projection_lease_token uuid",
  "reconcile_attempt_count integer not null default 0",
  "reconcile_backoff_seconds integer not null default 60",
  "reserved_input_characters bigint not null default 0",
  "committed_input_characters bigint not null default 0",
  "reserved_cost_micros bigint not null default 0",
  "committed_cost_micros bigint not null default 0",
  "provider_attempt text not null",
  "expires_at timestamptz not null",
  "openai_slot_limit integer not null default 8",
  "poll_limit integer not null default 720",
  "azure_logical_limit_characters bigint not null default 200000",
  "physical_safety_margin_characters bigint not null default 600000",
  "billing_period_character_limit bigint not null default 500000"
]) {
  assert.ok(sql.toLowerCase().includes(requiredSql.toLowerCase()), `migration includes ${requiredSql}`);
}

for (const requiredIndex of [
  "comment_translator_paid_one_non_terminal_lifecycle_per_owner_idx",
  "comment_translator_paid_customers_owner_key",
  "comment_translator_paid_customers_stripe_key",
  "comment_translator_paid_checkout_session_stripe_key",
  "comment_translator_paid_subscription_stripe_key",
  "comment_translator_paid_capacity_one_per_lifecycle_key",
  "comment_translator_paid_attempt_receipts_key",
  "comment_translator_paid_session_one_active_lease_idx"
]) {
  assert.match(sql, new RegExp(requiredIndex, "i"), `migration includes ${requiredIndex}`);
}

for (const requiredRpc of [
  "ct_paid_begin_checkout",
  "ct_paid_bind_checkout_session",
  "ct_paid_expire_checkout_hold",
  "ct_paid_claim_stripe_event",
  "ct_paid_read_entitlement",
  "ct_paid_finalize_stripe_event",
  "ct_paid_bind_first_subscription",
  "ct_paid_claim_entitlement_projection",
  "ct_paid_claim_reconciler",
  "ct_paid_finalize_reconciler",
  "ct_paid_retry_reconciler",
  "ct_paid_assert_current_paid_period",
  "ct_paid_assert_current_utc_month",
  "ct_paid_reserve_capacity",
  "ct_paid_convert_capacity",
  "ct_paid_release_capacity",
  "ct_paid_reserve_billing_period_characters",
  "ct_paid_commit_billing_period_characters",
  "ct_paid_release_billing_period_characters",
  "ct_paid_settle_logical_attempt_after_provider_failure",
  "ct_paid_abandon_logical_attempt",
  "ct_paid_close_billing_period",
  "ct_paid_close_utc_month",
  "ct_paid_disable_provider_circuit",
  "ct_paid_openai_attempt",
  "ct_paid_extend_openai_attempt",
  "ct_paid_finalize_openai_attempt",
  "ct_paid_reclaim_openai_attempt",
  "ct_paid_azure_direct_fallback",
  "ct_paid_finalize_azure_fallback",
  "ct_paid_reclaim_azure_fallback",
  "ct_paid_reserve_poll_budget",
  "ct_paid_record_consent",
  "ct_paid_record_provider_hourly_detail",
  "ct_paid_upsert_session_summary",
  "ct_paid_project_entitlement"
]) {
  assert.match(sql, new RegExp(`create or replace function public\\.${requiredRpc}\\b`, "i"), `migration defines ${requiredRpc}`);
}
assert.match(sql, /v_functions constant text\[\].*ct_paid_claim_stripe_event/s, "migration enumerates every trusted RPC for privilege control");
assert.match(sql, /revoke all on function public\.%s from public, anon, authenticated/i, "RPCs reject public direct execute");
assert.match(sql, /grant execute on function public\.%s to service_role/i, "RPCs are trusted-server-only");
for (const mutatingRpc of [
  "ct_paid_begin_checkout",
  "ct_paid_bind_checkout_session",
  "ct_paid_expire_checkout_hold",
  "ct_paid_claim_stripe_event",
  "ct_paid_finalize_stripe_event",
  "ct_paid_bind_first_subscription",
  "ct_paid_claim_entitlement_projection",
  "ct_paid_project_entitlement",
  "ct_paid_claim_reconciler",
  "ct_paid_finalize_reconciler",
  "ct_paid_retry_reconciler",
  "ct_paid_reserve_capacity",
  "ct_paid_convert_capacity",
  "ct_paid_release_capacity",
  "ct_paid_reserve_billing_period_characters",
  "ct_paid_commit_billing_period_characters",
  "ct_paid_release_billing_period_characters",
  "ct_paid_settle_logical_attempt_after_provider_failure",
  "ct_paid_abandon_logical_attempt",
  "ct_paid_close_billing_period",
  "ct_paid_close_utc_month",
  "ct_paid_disable_provider_circuit",
  "ct_paid_record_provider_circuit_failure",
  "ct_paid_probe_provider_circuit",
  "ct_paid_record_provider_circuit_success",
  "ct_paid_openai_attempt",
  "ct_paid_extend_openai_attempt",
  "ct_paid_finalize_openai_attempt",
  "ct_paid_reclaim_openai_attempt",
  "ct_paid_azure_direct_fallback",
  "ct_paid_finalize_azure_fallback",
  "ct_paid_reclaim_azure_fallback",
  "ct_paid_reserve_poll_budget",
  "ct_paid_record_consent",
  "ct_paid_record_provider_hourly_detail",
  "ct_paid_upsert_session_summary"
]) {
  assert.match(
    sql,
    new RegExp(`create or replace function public\\.${mutatingRpc}\\b[\\s\\S]*?language plpgsql\\s+security definer\\s+set search_path = pg_catalog, public\\s+as \\$\\$`, "i"),
    `${mutatingRpc} writes only through a fixed-search-path SECURITY DEFINER boundary`
  );
}

const beginCheckoutSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_begin_checkout"),
  sql.indexOf("create or replace function public.ct_paid_bind_checkout_session")
);
assert.match(beginCheckoutSource, /returns table \(\s*lifecycle_id uuid,\s*hold_id uuid,\s*customer_binding_id uuid,\s*idempotency_key text,\s*checkout_expires_at_target timestamptz\s*\)/i, "Checkout begin returns canonical DB-owned Checkout authority");
assert.doesNotMatch(beginCheckoutSource, /p_idempotency_key text|p_checkout_expires_at_target timestamptz/i, "Checkout begin accepts no caller-owned idempotency or expiry authority");
assert.match(beginCheckoutSource, /v_hold_id := gen_random_uuid\(\)[\s\S]+?v_idempotency_key := 'ct-paid-checkout-' \|\| v_hold_id::text[\s\S]+?v_checkout_expires_at_target := p_now \+ interval '31 minutes'/i, "Checkout begin derives canonical key and target from hold ID and statement time");
assert.match(beginCheckoutSource, /where owner_user_id = p_owner_user_id[\s\S]+?and is_terminal = false[\s\S]+?where lifecycle_id = v_lifecycle\.id[\s\S]+?return query select\s+v_lifecycle\.id,\s+v_hold\.id,\s+v_customer\.id,\s+v_hold\.idempotency_key,\s+v_hold\.checkout_expires_at_target/i, "same-owner concurrent begin converges to the existing non-terminal lifecycle and hold");
assert.match(beginCheckoutSource, /pg_advisory_xact_lock\(47290101\)[\s\S]+?v_lifecycle\.lifecycle_state <> 'checkout_hold'[\s\S]+?v_hold\.hold_state <> 'held'[\s\S]+?v_capacity\.reservation_state <> 'held'/i, "Checkout begin remains serialized and returns only an unfinished held Checkout authority");
assert.match(sql, /ct_paid_bind_checkout_session[\s\S]+?stripe_checkout_session_id = p_stripe_checkout_session_id[\s\S]+?for update[\s\S]+?checkout session binding conflict/i, "Checkout Session binding locks and rejects reassignment");
assert.match(sql, /ct_paid_bind_checkout_session[\s\S]+?comment_translator_paid_checkout_session_bindings[\s\S]+?return v_existing\.id[\s\S]+?v_hold\.hold_state <> 'held'[\s\S]+?insert into public\.comment_translator_paid_checkout_session_bindings/i, "Checkout Session exact replay resolves before the held-only insert gate");
const bindCheckoutSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_bind_checkout_session"),
  sql.indexOf("create or replace function public.ct_paid_expire_checkout_hold")
);
assert.match(bindCheckoutSource, /p_is_recovery_binding boolean[\s\S]+?p_idempotency_key text/i, "Checkout Session binding has an explicit sanitized recovery boundary");
assert.match(bindCheckoutSource, /not p_is_recovery_binding and p_stripe_expires_at <= p_now/i, "normal Checkout Session binding rejects at or after trusted expiry time");
assert.doesNotMatch(bindCheckoutSource, /or\s+p_stripe_expires_at <= p_now/i, "recovery binding is not rejected by an unqualified expiry comparison");
assert.equal((bindCheckoutSource.match(/p_stripe_expires_at <= p_now/gi) ?? []).length, 1, "Checkout Session binding keeps exactly one mode-qualified expiry comparison");
assert.match(bindCheckoutSource, /p_idempotency_key is null[\s\S]+?v_hold\.idempotency_key is distinct from p_idempotency_key[\s\S]+?v_lifecycle\.lifecycle_state = 'expire_required'/i, "recovery binding requires matching hold idempotency and a non-expire-required lifecycle");
assert.match(bindCheckoutSource, /v_existing\.stripe_checkout_session_id <> p_stripe_checkout_session_id[\s\S]+?v_existing\.stripe_expires_at is distinct from p_stripe_expires_at[\s\S]+?return v_existing\.id/i, "exact recovery replay is idempotent and conflicting immutable replay is rejected");
assert.doesNotMatch(bindCheckoutSource, /\b(?:checkout_url|raw_stripe_payload|response_body|status_body)\b/i, "Checkout recovery persists no URL or raw status fields");
assert.match(sql, /ct_paid_expire_checkout_hold[\s\S]+?comment_translator_paid_subscription_bindings[\s\S]+?hold_state = 'released'[\s\S]+?lifecycle_state = 'incomplete_expired'[\s\S]+?reservation_state = 'released'/i, "Checkout expiry rejects Subscription authority and releases hold, lifecycle, and capacity atomically");
assert.match(sql, /ct_paid_expire_checkout_hold[\s\S]+?comment_translator_paid_entitlements[\s\S]+?where lifecycle_id = p_lifecycle_id[\s\S]+?for update[\s\S]+?nonterminal entitlement prevents checkout hold release[\s\S]+?reservation_state = 'released'/i, "Checkout expiry locks entitlement authority and cannot release capacity behind a nonterminal entitlement");
assert.match(sql, /ct_paid_expire_checkout_hold\([\s\S]+?p_reconcile_lease_token uuid default null[\s\S]+?p_now timestamptz default now\(\)/i, "Checkout expiry accepts nullable reconciler lease authority");
const expireCheckoutSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_expire_checkout_hold"),
  sql.indexOf("create or replace function public.ct_paid_claim_stripe_event")
);
assert.match(expireCheckoutSource, /p_reconcile_lease_token is not null[\s\S]+?reconcile_lease_token is distinct from p_reconcile_lease_token[\s\S]+?reconcile_lease_until <= p_now[\s\S]+?stale reconcile lease token is not valid for checkout expiry/i, "Checkout expiry rejects stale or expired supplied lease authority");
assert.match(expireCheckoutSource, /p_reconcile_lease_token is null[\s\S]+?reconcile_lease_token is not null[\s\S]+?reconcile_lease_until > p_now[\s\S]+?active reconcile lease token is required for checkout expiry/i, "Checkout expiry requires the matching token while a live lease exists");
assert.match(sql, /ct_paid_record_provider_hourly_detail[\s\S]+?insert into public\.comment_translator_paid_provider_detail_source_receipts[\s\S]+?on conflict \(attempt_id, provider_attempt\) do nothing[\s\S]+?if not found then[\s\S]+?return false[\s\S]+?on conflict \(owner_user_id, provider, utc_hour\) do update/i, "hourly provider aggregates no-op a duplicate short-lived source before the atomic increment");
for (const latencyBucket of ["latency_up_to_100_ms_count", "latency_101_to_250_ms_count", "latency_251_to_500_ms_count", "latency_501_to_1000_ms_count", "latency_1001_to_2500_ms_count", "latency_2501_to_5000_ms_count", "latency_5001_to_10000_ms_count", "latency_over_10000_ms_count"]) {
  assert.match(sql, new RegExp(`${latencyBucket} integer not null default 0`), `hourly provider detail has fixed histogram bucket ${latencyBucket}`);
  assert.match(sql, new RegExp(`${latencyBucket} = comment_translator_paid_provider_hourly_details\\.${latencyBucket} \\+ excluded\\.${latencyBucket}`), `${latencyBucket} is atomically incremented`);
}
assert.doesNotMatch(sql, /latency_p(?:50|95)_ms/i, "hourly provider detail does not claim non-composable p50/p95 aggregates");
assert.match(sql, /ct_paid_upsert_session_summary[\s\S]+?greatest\(comment_translator_paid_session_summaries\.provider_request_count, excluded\.provider_request_count\)[\s\S]+?session summary binding conflict/i, "session summaries keep immutable identity and monotonic cumulative counters");
for (const triggerHelper of [
  "comment_translator_paid_immutable_binding_guard",
  "comment_translator_paid_entitlement_binding_guard",
  "comment_translator_paid_lifecycle_binding_guard",
  "comment_translator_paid_checkout_hold_binding_guard"
]) {
  assert.match(
    sql,
    new RegExp(`create or replace function public\\.${triggerHelper}\\(\\)[\\s\\S]*?security definer\\s+set search_path = pg_catalog, public`, "i"),
    `${triggerHelper} has a fixed safe search_path`
  );
}

assert.match(sql, /on\s+public\.comment_translator_paid_billing_lifecycles\s*\(owner_user_id\)[\s\S]{0,120}where\s+is_terminal\s*=\s*false/i, "non-terminal lifecycle uniqueness is owner-scoped");
assert.match(sql, /for\s+update\s+skip\s+locked/i, "reconciler claim uses SKIP LOCKED semantics");
assert.match(sql, /limit\s+least\(greatest\(coalesce\(p_limit,\s*50\),\s*0\),\s*50\)/i, "reconciler claim coalesces a null limit before applying the bounded batch clamp");
assert.match(sql, /interval\s+'120 seconds'/i, "reconciler and provider leases use 120 seconds");
assert.match(sql, /greatest\(\s*60,\s*least\(\s*21600/i, "reconciler backoff is bounded from one minute through six hours");
assert.match(sql, /capacity_limit\s+integer\s+not null\s+default\s+20/i, "capacity is fixed at twenty");
assert.match(sql, /v_reserved_count\s*>=\s*v_capacity_limit/i, "capacity reservation rejects the twenty-first slot");
assert.match(sql, /v_reserved_slots\s*>=\s*v_config\.openai_slot_limit/i, "OpenAI reservation rejects the ninth slot");
const strictConvertCapacitySource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_convert_capacity"),
  sql.indexOf("create or replace function public.ct_paid_release_capacity")
);
const atomicBindFirstSubscriptionSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_bind_first_subscription"),
  sql.indexOf("create or replace function public.ct_paid_assert_current_paid_period")
);
const leaseAwareOpenAiAttemptSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_openai_attempt"),
  sql.indexOf("create or replace function public.ct_paid_extend_openai_attempt")
);
const leasePreservingOpenAiFinalizeSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_finalize_openai_attempt"),
  sql.indexOf("create or replace function public.ct_paid_reclaim_openai_attempt")
);
const leaseAwareAzureFallbackSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_azure_direct_fallback"),
  sql.indexOf("create or replace function public.ct_paid_finalize_azure_fallback")
);
assert.doesNotMatch(strictConvertCapacitySource, /v_lifecycle\.lifecycle_state = 'checkout_hold'[\s\S]+?p_lifecycle_stage in/i, "capacity conversion cannot bypass the locked lifecycle state");
assert.ok(atomicBindFirstSubscriptionSource.indexOf("set lifecycle_state = p_lifecycle_state") < atomicBindFirstSubscriptionSource.indexOf("perform public.ct_paid_convert_capacity"), "first Subscription binding updates lifecycle before capacity conversion");
assert.match(leaseAwareOpenAiAttemptSource, /v_prior_lease\.attempt_id = p_attempt_id|where attempt_id = p_attempt_id/i, "OpenAI retry keeps logical attempt identity bound to the mutable lease");
assert.match(leasePreservingOpenAiFinalizeSource, /lease_state = 'active'[\s\S]+?lease_until = p_now \+ interval '120 seconds'/i, "eligible OpenAI failure preserves a 120-second active lease");
assert.match(leaseAwareAzureFallbackSource, /v_lease\.provider_attempt is distinct from v_shared_attempt\.provider_attempt/i, "Azure fallback checks mutable lease ownership against the immutable OpenAI predecessor");
assert.match(sql, /physical_safety_margin_characters/i, "Azure physical shared-capacity margin is enforced");
assert.match(sql, /from public\.comment_translator_usage_ledger_events[\s\S]+?event_type = 'ai-usage-estimated'/i, "Azure physical capacity reads the durable Free usage ledger inside the reservation RPC");
assert.match(sql, /v_day_physical_total\s*>=\s*v_config\.physical_limit_characters/i, "Azure physical shared capacity uses a strict inequality");
assert.match(sql, /physical_limit_characters bigint not null default 2000000 check \(physical_limit_characters = 2000000\)/i, "Azure physical shared capacity is fixed at two million characters");
assert.match(sql, /not\s+valid\s+for\s+update/i, "immutable bindings reject reassignment and deletion");
assert.match(sql, /tg_op = 'DELETE'[\s\S]+?pg_trigger_depth\(\) > 1[\s\S]+?return old/i, "account cascade deletion is explicit while direct child DELETE remains blocked");
assert.match(sql, /create table if not exists public\.comment_translator_paid_external_id_tombstones[\s\S]+?external_id_kind text not null[\s\S]+?external_id text not null[\s\S]+?created_at timestamptz not null default now\(\)[\s\S]+?primary key \(external_id_kind, external_id\)/i, "external Customer, Checkout Session, and Subscription identities survive account cascade without owner or payload data");
assert.match(sql, /comment_translator_paid_external_id_tombstone_guard[\s\S]+?pg_trigger_depth\(\) <= 1[\s\S]+?insert into public\.comment_translator_paid_external_id_tombstones[\s\S]+?on conflict \(external_id_kind, external_id\) do nothing/i, "trusted cascade trigger records immutable external ID tombstones");
assert.match(sql, /comment_translator_paid_external_id_reuse_guard[\s\S]+?from public\.comment_translator_paid_external_id_tombstones[\s\S]+?external billing identity was previously deleted/i, "later inserts fail closed against tombstoned external IDs");
assert.match(sql, /create trigger comment_translator_paid_checkout_hold_binding_trigger[\s\S]+?before update or delete on public\.comment_translator_paid_checkout_holds[\s\S]+?comment_translator_paid_checkout_hold_binding_guard/i, "Checkout hold identity updates and direct deletion use the dedicated guard");
const holdGuardSource = sql.slice(
  sql.indexOf("create or replace function public.comment_translator_paid_checkout_hold_binding_guard"),
  sql.indexOf("drop trigger if exists comment_translator_paid_customers_immutable_trigger")
);
for (const immutableHoldField of ["id", "lifecycle_id", "owner_user_id", "idempotency_key", "checkout_expires_at_target", "created_at"]) {
  assert.match(holdGuardSource, new RegExp(`old\\.${immutableHoldField} is distinct from new\\.${immutableHoldField}`, "i"), `Checkout hold ${immutableHoldField} cannot be reassigned`);
}
assert.doesNotMatch(holdGuardSource, /old\.(?:hold_state|released_at|updated_at) is distinct from new\./i, "Checkout hold state conversion fields remain mutable through trusted RPCs");
const lifecycleGuardSource = sql.slice(
  sql.indexOf("create or replace function public.comment_translator_paid_lifecycle_binding_guard"),
  sql.indexOf("drop trigger if exists comment_translator_paid_customers_immutable_trigger")
);
for (const immutableLifecycleField of ["id", "owner_user_id", "customer_binding_id", "created_at"]) {
  assert.match(lifecycleGuardSource, new RegExp(`old\\.${immutableLifecycleField} is distinct from new\\.${immutableLifecycleField}`, "i"), `billing lifecycle ${immutableLifecycleField} cannot be reassigned`);
}
for (const [constraint, columns, referencedTable, referencedColumns] of [
  ["comment_translator_paid_customers_id_owner_stripe_key", "id, owner_user_id, stripe_customer_id", "comment_translator_paid_customers", "id, owner_user_id, stripe_customer_id"],
  ["comment_translator_paid_lifecycles_customer_owner_fk", "customer_binding_id, owner_user_id", "comment_translator_paid_customers", "id, owner_user_id"],
  ["comment_translator_paid_checkout_holds_lifecycle_owner_fk", "lifecycle_id, owner_user_id", "comment_translator_paid_billing_lifecycles", "id, owner_user_id"],
  ["comment_translator_paid_checkout_session_lifecycle_owner_fk", "lifecycle_id, owner_user_id", "comment_translator_paid_billing_lifecycles", "id, owner_user_id"],
  ["ct_paid_checkout_session_lifecycle_customer_owner_fk", "lifecycle_id, customer_binding_id, owner_user_id", "comment_translator_paid_billing_lifecycles", "id, customer_binding_id, owner_user_id"],
  ["ct_paid_checkout_session_customer_owner_stripe_fk", "customer_binding_id, owner_user_id, stripe_customer_id", "comment_translator_paid_customers", "id, owner_user_id, stripe_customer_id"],
  ["ct_paid_checkout_session_hold_owner_fk", "hold_id, lifecycle_id, owner_user_id", "comment_translator_paid_checkout_holds", "id, lifecycle_id, owner_user_id"],
  ["comment_translator_paid_subscription_lifecycle_owner_fk", "lifecycle_id, owner_user_id", "comment_translator_paid_billing_lifecycles", "id, owner_user_id"],
  ["ct_paid_subscription_lifecycle_customer_owner_fk", "lifecycle_id, customer_binding_id, owner_user_id", "comment_translator_paid_billing_lifecycles", "id, customer_binding_id, owner_user_id"],
  ["ct_paid_subscription_customer_owner_stripe_fk", "customer_binding_id, owner_user_id, stripe_customer_id", "comment_translator_paid_customers", "id, owner_user_id, stripe_customer_id"],
  ["ct_paid_entitlement_lifecycle_customer_owner_fk", "lifecycle_id, customer_binding_id, owner_user_id", "comment_translator_paid_billing_lifecycles", "id, customer_binding_id, owner_user_id"],
  ["ct_paid_entitlement_subscription_lifecycle_customer_owner_fk", "subscription_binding_id, lifecycle_id, customer_binding_id, owner_user_id", "comment_translator_paid_subscription_bindings", "id, lifecycle_id, customer_binding_id, owner_user_id"]
]) {
  if (constraint.endsWith("_key")) {
    assert.match(sql, new RegExp(`constraint ${constraint} unique \\(${columns}\\)`, "i"), `${constraint} is the immutable Customer composite key`);
    continue;
  }
  assert.match(
    sql,
    new RegExp(`constraint ${constraint} foreign key \\(${columns}\\)\\s+references public\\.${referencedTable}\\(${referencedColumns}\\)`, "i"),
    `${constraint} rejects an initial cross-owner or cross-lifecycle binding`
  );
}
assert.match(
  sql,
  /old\.subscription_binding_id is not null[\s\S]+?old\.subscription_binding_id is distinct from new\.subscription_binding_id/i,
  "nullable entitlement binding can attach once but cannot be cleared or reassigned"
);
assert.match(sql, /old\.lifecycle_id is distinct from new\.lifecycle_id/i, "entitlement lifecycle binding is immutable");
assert.match(sql, /p_stripe_event_created_at timestamptz/, "entitlement projection requires the sanitized Stripe Event created time");
assert.match(sql, /v_observed_subscription_status in \('past_due',\s*'unpaid'\)[\s\S]+?v_failure_started_at := p_now[\s\S]+?v_observed_subscription_status = 'active'[\s\S]+?v_failure_started_at := null/i, "payment failure origin is preserved across recovery and a later failure");
assert.match(sql, /last_observed_subscription_status = coalesce\(v_observed_subscription_status[\s\S]+?payment_failure_started_at = v_failure_started_at/i, "payment failure state is committed with entitlement projection");
assert.match(sql, /p_entitlement_status in \([\s\S]+?'active'[\s\S]+?\) and p_subscription_binding_id is null[\s\S]+?subscription binding is required/i, "active entitlement requires a subscription binding");
assert.match(sql, /ct_paid_assert_current_paid_period[\s\S]+?current Paid entitlement period is not authoritative/i, "billing-period reservations use the durable entitlement period");
assert.match(sql, /previous Paid billing period is not reconciled/i, "next billing period waits for prior period close");
assert.match(sql, /previous Paid UTC month is not reconciled/i, "next UTC month waits for prior month close");
assert.match(sql, /p_utc_month <> date_trunc\('month', p_now at time zone 'UTC'\)::date/i, "UTC-month reservations use the server UTC month");
assert.match(sql, /reconcile_lease_token is distinct from p_reconcile_lease_token/i, "state and capacity projection is protected by the reconciler token");
assert.match(sql, /capacity release requires a terminal billing lifecycle/i, "capacity release requires terminal lifecycle authority");
assert.match(sql, /capacity release requires terminal entitlement projection/i, "capacity release cannot run before terminal entitlement projection");
assert.match(sql, /v_entitlement\.entitlement_status not in \(\s*'canceled',\s*'incomplete_expired',\s*'inactive'\s*\)/i, "reconciliation entitlements retain capacity until terminal confirmation");
assert.match(sql, /terminal entitlement cannot regress/i, "terminal entitlement projection cannot return to an active state");
const projectionStart = sql.indexOf("create or replace function public.ct_paid_project_entitlement");
const projectionEnd = sql.indexOf("create or replace function public.ct_paid_bind_first_subscription");
const projectionSource = sql.slice(projectionStart, projectionEnd);
const projectionClaimStart = sql.indexOf("create or replace function public.ct_paid_claim_entitlement_projection");
assert.ok(projectionClaimStart >= 0 && projectionClaimStart < projectionStart, "projection claim RPC precedes projection mutation");
const projectionClaimSource = sql.slice(projectionClaimStart, projectionStart);
assert.match(projectionClaimSource, /p_owner_user_id uuid[\s\S]+?p_lifecycle_id uuid[\s\S]+?returns table \(projection_lease_token uuid, projection_lease_until timestamptz\)/i, "projection claim returns only opaque short-lived authority");
assert.match(projectionClaimSource, /projection_lease_until > p_now[\s\S]+?return;/i, "active projection lease rejects a concurrent claim with an empty result");
assert.match(projectionClaimSource, /v_projection_lease_token := gen_random_uuid\(\)[\s\S]+?v_projection_lease_until := p_now \+ interval '120 seconds'/i, "projection claim issues a fresh maximum-120-second lease");
assert.match(projectionSource, /from public\.comment_translator_paid_billing_lifecycles[\s\S]+?for update/i, "projection locks lifecycle authority before current-object projection");
assert.match(projectionSource, /p_projection_lease_token uuid[\s\S]+?p_projection_lease_token is null/i, "projection requires non-null current-object authority");
assert.match(projectionSource, /v_lifecycle\.projection_lease_token is distinct from p_projection_lease_token[\s\S]+?v_lifecycle\.projection_lease_until <= p_now[\s\S]+?stale projection lease token is not valid for projection/i, "projection uses exact live CAS authority independently of event order");
assert.match(projectionSource, /projection_lease_until = null[\s\S]+?projection_lease_token = null[\s\S]+?where id = p_lifecycle_id[\s\S]+?projection_lease_token = p_projection_lease_token/i, "successful projection alone clears the exact projection lease");
assert.doesNotMatch(projectionSource, /p_stripe_event_created_at|last_projection_event_created_at|projection freshness conflict|projection timestamp conflict/i, "generic Event.created freshness is absent from current-object projection");
assert.match(projectionSource, /v_observed_subscription_status in \('past_due', 'unpaid'\)[\s\S]+?v_failure_started_at := p_now[\s\S]+?v_observed_subscription_status = 'active'[\s\S]+?v_failure_started_at := null/i, "current subscription state monotonically sets and clears payment-failure authority");
assert.match(projectionSource, /entitlement projection state combination is not valid/i, "entitlement projection rejects incompatible status, lifecycle, and dispute combinations with a sanitized error");
assert.match(projectionSource, /p_entitlement_status = 'active'[\s\S]+?v_target_lifecycle_state = 'active'[\s\S]+?p_dispute_state in \('none',\s*'won'\)/i, "active billing projections exclude current dispute states while permitting an operator-won projection");
assert.match(projectionSource, /p_entitlement_status = 'dispute'[\s\S]+?v_target_lifecycle_state = 'dispute'[\s\S]+?p_dispute_state in \('investigating',\s*'lost',\s*'reconciliation'\)[\s\S]+?p_subscription_status is null/i, "dispute projection rejects an active subscription status and accepts only dispute lifecycle states");
assert.match(projectionSource, /p_entitlement_status = 'dispute_reconciliation'[\s\S]+?v_target_lifecycle_state = 'dispute_reconciliation'[\s\S]+?p_dispute_state = 'reconciliation'/i, "dispute reconciliation projection requires its reconciliation lifecycle and dispute state");
assert.match(projectionSource, /p_entitlement_status = 'incomplete'[\s\S]+?v_target_lifecycle_state in \('checkout_hold',\s*'incomplete',\s*'expire_required'\)/i, "expire_required remains auxiliary to an incomplete hold path");
assert.match(projectionSource, /p_entitlement_status = 'paid_unentitled_reconciliation'[\s\S]+?v_target_lifecycle_state = 'paid_unentitled_reconciliation'/i, "paid-unentitled reconciliation remains in its matching lifecycle");
assert.match(projectionSource, /p_entitlement_status = 'refund_reconciliation'[\s\S]+?v_target_lifecycle_state = 'refund_reconciliation'/i, "refund reconciliation remains in its matching lifecycle");
assert.match(projectionSource, /v_existing\.entitlement_status in \(\s*'canceled',\s*'incomplete_expired',\s*'inactive'\s*\)/i, "only true terminal entitlement projections block regression");
assert.doesNotMatch(projectionSource, /v_existing\.entitlement_status in \([\s\S]{0,160}paid_unentitled_reconciliation/i, "reconciliation statuses are not terminal regression guards");
assert.match(projectionSource, /when 'inactive' then 'terminated'/i, "inactive entitlement projection terminates the lifecycle and releases capacity");
const bindSubscriptionStart = sql.indexOf("create or replace function public.ct_paid_bind_first_subscription");
const bindSubscriptionEnd = sql.indexOf("create or replace function public.ct_paid_assert_current_paid_period");
assert.ok(bindSubscriptionStart >= 0 && bindSubscriptionEnd > bindSubscriptionStart, "first-subscription binding RPC block is bounded");
const bindSubscriptionSource = sql.slice(bindSubscriptionStart, bindSubscriptionEnd);
assert.match(bindSubscriptionSource, /v_lifecycle\.id is null[\s\S]+?v_lifecycle\.owner_user_id <> p_owner_user_id[\s\S]+?v_lifecycle\.is_terminal/i, "first-subscription binding requires a matching non-terminal lifecycle");
assert.match(bindSubscriptionSource, /v_lifecycle\.lifecycle_state = 'expire_required'[\s\S]+?billing lifecycle binding is not ready/i, "first-subscription binding rejects an expire-required lifecycle before insertion");
assert.match(bindSubscriptionSource, /v_hold\.id is null\s+or v_hold\.owner_user_id <> p_owner_user_id[\s\S]+?checkout hold binding is not ready/i, "first-subscription binding fails closed when the lifecycle hold is missing or owner-mismatched");
assert.match(bindSubscriptionSource, /v_hold\.hold_state not in \('held',\s*'converted'\)/i, "first-subscription binding accepts only a bind-ready or idempotently converted Checkout hold");
assert.match(bindSubscriptionSource, /where lifecycle_id = p_lifecycle_id\s+and hold_id = v_hold\.id\s+for update[\s\S]+?v_session\.id is null[\s\S]+?v_session\.owner_user_id <> p_owner_user_id[\s\S]+?v_session\.stripe_customer_id <> p_stripe_customer_id/i, "first-subscription binding requires the locked lifecycle/hold Checkout Session with matching owner and customer");
assert.match(bindSubscriptionSource, /v_session\.customer_binding_id <> p_customer_binding_id/i, "first-subscription binding requires the locked Checkout Session Customer binding ID");
assert.match(bindSubscriptionSource, /v_existing\.customer_binding_id <> p_customer_binding_id/i, "idempotent first-subscription binding preserves its Customer binding ID");
assert.match(bindSubscriptionSource, /p_projection_lease_token uuid[\s\S]+?ct_paid_project_entitlement\([\s\S]+?p_projection_lease_token => p_projection_lease_token/i, "first-subscription binding carries the same projection token into atomic projection");
assert.doesNotMatch(bindSubscriptionSource, /p_stripe_event_created_at|last_projection_event_created_at|projection is stale/i, "first-subscription binding has no generic Event.created freshness gate");
assert.match(bindSubscriptionSource, /insert into public\.comment_translator_paid_subscription_bindings \([\s\S]+?customer_binding_id[\s\S]+?\)\s+values \([\s\S]+?p_customer_binding_id/i, "initial Subscription binding persists the locked Customer binding ID");
assert.doesNotMatch(bindSubscriptionSource, /if v_hold\.id is not null then/i, "first-subscription binding never treats the Checkout hold as optional");
assert.match(projectionSource, /v_subscription\.customer_binding_id <> p_customer_binding_id/i, "entitlement projection rejects a Subscription from another Customer binding");
assert.match(sql, /ct_paid_project_entitlement\([\s\S]+?p_lifecycle_state text default null/i, "entitlement projection carries lifecycle state in the same trusted RPC");
assert.match(sql, /ct_paid_project_entitlement\([\s\S]+?p_subscription_status text default null/i, "entitlement projection carries current subscription status for payment-failure atomicity");
assert.match(sql, /comment_translator_paid_entitlements_period_shape check \([\s\S]+?subscription_binding_id is not null[\s\S]+?current_period_start is not null[\s\S]+?current_period_end is not null[\s\S]+?isfinite\(current_period_start\)[\s\S]+?isfinite\(current_period_end\)[\s\S]+?current_period_end > current_period_start/i, "subscription-bound entitlements require a complete finite increasing period");
assert.match(sql, /comment_translator_paid_entitlements_cancel_shape check \([\s\S]+?cancel_at_period_end = \(entitlement_status in \('cancel_at_period_end', 'cancel_pending'\)\)/i, "entitlement rows reject contradictory cancel-at-period-end flags");
assert.match(projectionSource, /p_subscription_binding_id is not null[\s\S]+?p_current_period_start is null[\s\S]+?p_current_period_end is null[\s\S]+?subscription-bound entitlement period is not valid/i, "projection rejects missing subscription period bounds");
assert.match(projectionSource, /p_current_period_end <= p_current_period_start[\s\S]+?entitlement period is not valid/i, "projection rejects partial or non-increasing periods");
assert.match(projectionSource, /p_cancel_at_period_end is distinct from \(\s*p_entitlement_status in \('cancel_at_period_end', 'cancel_pending'\)\s*\)[\s\S]+?cancel-at-period-end flag is not valid/i, "projection rejects contradictory cancellation flags");
assert.match(sql, /ct_paid_expire_checkout_hold\([\s\S]+?p_stripe_session_status text[\s\S]+?p_stripe_session_checked_at timestamptz[\s\S]+?p_reconcile_lease_token uuid default null[\s\S]+?p_now timestamptz default now\(\)/i, "Checkout expiry requires current Session confirmation and nullable lease authority before trusted DB time");
assert.match(sql, /ct_paid_project_entitlement[\s\S]+?ct_paid_release_capacity[\s\S]+?ct_paid_convert_capacity/i, "lifecycle, entitlement, and capacity projection share one atomic RPC");
assert.match(sql, /p_now := statement_timestamp\(\)/i, "time-sensitive RPCs use the database statement clock");
assert.match(sql, /create table if not exists public\.comment_translator_paid_logical_attempts/i, "logical character settlement is separate from provider attempts");
assert.match(sql, /logical_state text not null check \(logical_state in \('reserved', 'committed', 'released'\)\)/i, "logical character settlement has explicit sanitized state");
const commitCharactersSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_commit_billing_period_characters"),
  sql.indexOf("create or replace function public.ct_paid_release_billing_period_characters")
);
const releaseCharactersSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_release_billing_period_characters"),
  sql.indexOf("create or replace function public.ct_paid_settle_logical_attempt_after_provider_failure")
);
assert.match(commitCharactersSource, /v_commit_characters > v_logical\.input_characters[\s\S]+?reserved_input_characters = reserved_input_characters - v_logical\.input_characters[\s\S]+?reserved_input_characters >= v_logical\.input_characters/i, "subset commit consumes the full logical character reservation once");
assert.match(commitCharactersSource, /set reserved_input_characters = 0[\s\S]+?where attempt_id = p_attempt_id(?![\s\S]{0,120}provider_attempt = p_provider_attempt)/i, "commit zeros character reservations on all sibling receipts");
assert.match(releaseCharactersSource, /v_released := v_logical\.input_characters[\s\S]+?attempt_state in \('reserved', 'uncertain', 'expired'\)[\s\S]+?reserved_input_characters = reserved_input_characters - v_logical\.input_characters[\s\S]+?reserved_input_characters >= v_logical\.input_characters/i, "release retains active or unknown siblings and otherwise consumes the full logical reservation once");
assert.match(sql, /v_logical\.logical_state <> 'reserved'[\s\S]+?logical attempt is already settled/i, "a new provider attempt cannot reopen settled logical characters");
assert.match(sql, /requested_cost_micros bigint not null default 0/i, "provider idempotency retains sanitized requested cost binding after settlement");
assert.match(sql, /requested_request_count integer not null default 0/i, "provider idempotency retains sanitized request binding");
assert.match(sql, /requested_token_count bigint not null default 0/i, "provider idempotency retains sanitized token binding");
assert.match(sql, /attempt owner binding conflict[\s\S]+?attempt period binding conflict[\s\S]+?attempt input binding conflict/i, "provider duplicate fast paths validate owner, period, and input bindings");
assert.match(sql, /attempt cost binding conflict[\s\S]+?attempt request binding conflict[\s\S]+?attempt token binding conflict/i, "OpenAI duplicate fast path validates cost, request, and token bindings");
assert.match(sql, /v_existing\.owner_user_id <> p_owner_user_id[\s\S]+?v_bucket\.daily_budget <> p_daily_budget/i, "poll duplicate validates owner and budget configuration");
assert.match(sql, /receipt_status = 'processing'[\s\S]+?return query select 'processing'::text, null::uuid/i, "active duplicate Stripe claims do not receive the processing token");
const stripeClaimSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_claim_stripe_event"),
  sql.indexOf("create or replace function public.ct_paid_finalize_stripe_event")
);
const stripeIdentityMismatchSource = stripeClaimSource.slice(
  stripeClaimSource.indexOf("if v_existing.event_type <> p_event_type"),
  stripeClaimSource.indexOf("if v_existing.receipt_status in ('complete', 'rejected')")
);
assert.doesNotMatch(stripeIdentityMismatchSource, /update public\.comment_translator_paid_stripe_event_receipts/i, "Stripe identity mismatch does not mutate the canonical receipt");
assert.doesNotMatch(stripeIdentityMismatchSource, /receipt_status\s*=|lease_until\s*=|lease_token\s*=/i, "Stripe identity mismatch preserves canonical processing state and lease authority");
assert.match(stripeIdentityMismatchSource, /return query select 'rejected'::text, null::uuid, v_existing\.attempt_count/i, "Stripe identity mismatch returns sanitized rejection without processing authority");
assert.match(sql, /attempt_state in \('committed', 'released', 'expired'\)[\s\S]+?return query select v_attempt\.attempt_state, null::uuid/i, "settled provider reservation retries return without a live session token");
const openAiFinalizeSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_finalize_openai_attempt"),
  sql.indexOf("create or replace function public.ct_paid_reclaim_openai_attempt")
);
assert.match(openAiFinalizeSource, /from public\.comment_translator_paid_openai_rate_reservations[\s\S]+?for update/i, "OpenAI finalize locks its RPM reservation before settlement");
assert.match(openAiFinalizeSource, /p_outcome = 'provider_not_reached'[\s\S]+?reserved_requests = reserved_requests - v_rate\.request_count[\s\S]+?reserved_requests >= v_rate\.request_count/i, "OpenAI explicit pre-provider failure rolls back the matching minute bucket without underflow");
assert.match(openAiFinalizeSource, /p_outcome = 'provider_not_reached'[\s\S]+?v_rate\.reservation_state not in \('reserved',\s*'uncertain'\)/i, "OpenAI RPM rollback verifies an active reservation");
assert.match(openAiFinalizeSource, /set reservation_state = 'released'[\s\S]+?reservation_state in \('reserved',\s*'uncertain'\)/i, "OpenAI RPM rollback only releases an active reservation");
assert.match(openAiFinalizeSource, /v_attempt\.attempt_state = 'committed'[\s\S]+?v_attempt\.provider_failure_class is null and p_outcome = 'completed'[\s\S]+?return true/i, "duplicate completed OpenAI finalize is idempotent only for a normalized success receipt");
assert.match(openAiFinalizeSource, /coalesce\(p_actual_input_characters, v_attempt\.requested_input_characters\) is distinct from v_attempt\.committed_input_characters[\s\S]+?coalesce\(p_actual_cost_micros, v_attempt\.requested_cost_micros\) is distinct from v_attempt\.committed_cost_micros[\s\S]+?OpenAI terminal attempt outcome binding conflict[\s\S]+?return true/i, "completed OpenAI replay requires the exact stored committed characters and cost");
assert.match(openAiFinalizeSource, /attempt_state in \('committed', 'released', 'expired'\)[\s\S]+?attempt_state = 'expired'[\s\S]+?raise exception 'OpenAI terminal attempt outcome binding conflict'/i, "expired OpenAI receipts reject stale delayed finalization");
assert.ok(openAiFinalizeSource.indexOf("attempt_state in ('committed', 'released', 'expired')") < openAiFinalizeSource.indexOf("from public.comment_translator_paid_session_leases"), "OpenAI terminal idempotency precedes mutable session lease locking");
assert.ok(openAiFinalizeSource.indexOf("attempt_state in ('committed', 'released', 'expired')") < openAiFinalizeSource.indexOf("from public.comment_translator_paid_openai_slots"), "OpenAI terminal idempotency precedes mutable slot locking");
assert.match(openAiFinalizeSource, /p_outcome = 'completed'[\s\S]+?set attempt_state = 'committed',\s*provider_failure_class = null,\s*reserved_cost_micros = 0/i, "OpenAI completed finalize clears an earlier uncertain provider failure class atomically");
const azureFinalizeSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_finalize_azure_fallback"),
  sql.indexOf("create or replace function public.ct_paid_reclaim_azure_fallback")
);
assert.match(azureFinalizeSource, /p_provider_failure_class text default null[\s\S]+?provider failure class is required/i, "Azure failure finalization accepts only an explicit or backward-compatible sanitized failure class");
assert.match(azureFinalizeSource, /attempt_state = 'committed'[\s\S]+?provider_failure_class is null[\s\S]+?p_outcome = 'completed'[\s\S]+?return true[\s\S]+?p_outcome = 'provider_reached_failed'[\s\S]+?provider_failure_class is not distinct from p_provider_failure_class[\s\S]+?return true/i, "Azure committed terminal replay requires the exact stored success or reached-failure outcome");
assert.match(azureFinalizeSource, /coalesce\(p_actual_input_characters, v_attempt\.reserved_input_characters\) is distinct from v_attempt\.committed_input_characters[\s\S]+?Azure terminal attempt outcome binding conflict[\s\S]+?return true/i, "completed Azure replay requires the exact stored committed characters");
assert.match(azureFinalizeSource, /attempt_state = 'released'[\s\S]+?p_outcome = 'provider_not_reached'[\s\S]+?provider_failure_class is not distinct from p_provider_failure_class[\s\S]+?return true/i, "Azure released terminal replay requires the same failure class");
assert.match(azureFinalizeSource, /attempt_state = 'expired'[\s\S]+?raise exception 'Azure terminal attempt outcome binding conflict'/i, "expired Azure receipts reject stale delayed finalization");
assert.ok(azureFinalizeSource.indexOf("attempt_state in ('committed', 'released', 'expired')") < azureFinalizeSource.indexOf("from public.comment_translator_paid_session_leases"), "Azure terminal idempotency precedes mutable session lease locking");
const openAiReclaimSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_reclaim_openai_attempt"),
  sql.indexOf("create or replace function public.ct_paid_azure_direct_fallback")
);
const azureReclaimSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_reclaim_azure_fallback"),
  sql.indexOf("create or replace function public.ct_paid_reserve_poll_budget")
);
for (const [name, source] of [["OpenAI", openAiFinalizeSource], ["Azure", azureFinalizeSource]]) {
  assert.ok(source.indexOf("attempt_state in ('committed', 'released', 'expired')") < source.indexOf("from public.comment_translator_paid_session_leases"), `${name} settled finalize replays immutable receipt identity before mutable session lease authority`);
  assert.match(source, /v_lease\.lease_token is distinct from p_session_lease_token/i, `${name} active finalize rejects null and stale session lease tokens`);
}
assert.ok(openAiFinalizeSource.indexOf("attempt_state in ('committed', 'released', 'expired')") < openAiFinalizeSource.indexOf("from public.comment_translator_paid_openai_slots"), "OpenAI settled finalize replays immutable receipt identity before mutable slot authority");
for (const [name, source, providerKind] of [
  ["OpenAI finalize", openAiFinalizeSource, "openai_attempt"],
  ["OpenAI reclaim", openAiReclaimSource, "openai_attempt"],
  ["Azure finalize", azureFinalizeSource, "azure_direct_fallback"],
  ["Azure reclaim", azureReclaimSource, "azure_direct_fallback"]
]) {
  const providerGuard = source.indexOf(`provider_kind <> '${providerKind}'`);
  const stateFastPath = source.indexOf("attempt_state in ('committed', 'released', 'expired')") >= 0
    ? source.indexOf("attempt_state in ('committed', 'released', 'expired')")
    : source.indexOf("attempt_state not in ('reserved', 'uncertain')");
  assert.ok(providerGuard >= 0 && providerGuard < stateFastPath, `${name} rejects cross-provider mutation before any settled fast path`);
}
assert.equal((azureFinalizeSource.match(/Azure fallback bucket is missing/g) ?? []).length, 2, "Azure finalize fails atomically when completed or not-reached bucket update is missing");
assert.match(azureFinalizeSource, /p_outcome not in \('completed',\s*'uncertain_inflight',\s*'provider_not_reached',\s*'provider_reached_failed'\)/i, "Azure finalize supports uncertain inflight and reached-failure outcomes");
assert.match(azureFinalizeSource, /p_outcome = 'uncertain_inflight'[\s\S]+?attempt_state = 'uncertain'[\s\S]+?expires_at = p_now \+ interval '120 seconds'[\s\S]+?lease_state = 'uncertain'/i, "Azure unknown response retains a 120-second receipt and session lease");
assert.doesNotMatch(azureReclaimSource, /ct_paid_commit_billing_period_characters/i, "Azure unknown reclaim never commits billing-period user characters");
assert.match(azureReclaimSource, /committed_paid_characters = committed_paid_characters \+ v_attempt\.reserved_input_characters[\s\S]+?committed_input_characters = 0/i, "Azure unknown reclaim conservatively commits physical usage while user committed characters remain zero");
assert.match(openAiReclaimSource, /committed_cost_micros = committed_cost_micros \+ v_attempt\.reserved_cost_micros[\s\S]+?ct_paid_settle_logical_attempt_after_provider_failure\(p_attempt_id, true, p_now\)/i, "OpenAI unknown reclaim conservatively commits cost and releases logical characters through unknown-reclaim authority");
assert.match(azureReclaimSource, /committed_paid_characters = committed_paid_characters \+ v_attempt\.reserved_input_characters[\s\S]+?ct_paid_settle_logical_attempt_after_provider_failure\(p_attempt_id, true, p_now\)/i, "Azure unknown reclaim conservatively commits physical usage and releases logical characters through unknown-reclaim authority");
assert.match(sql, /ct_paid_settle_logical_attempt_after_provider_failure\(text,boolean,timestamptz\)/i, "logical provider-failure settlement helper is service-role controlled by exact signature");
assert.match(sql, /ct_paid_abandon_logical_attempt\(text,text,timestamptz\)/i, "explicit no-fallback abandonment is service-role controlled by exact signature");
const abandonSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_abandon_logical_attempt"),
  sql.indexOf("create or replace function public.ct_paid_close_billing_period")
);
assert.match(abandonSource, /pg_advisory_xact_lock\(47290102\)[\s\S]+?order by provider_attempt[\s\S]+?for update/i, "abandonment serializes against fallback creation and locks all provider receipts");
assert.match(abandonSource, /v_caller_receipt\.attempt_state <> 'released'[\s\S]+?v_caller_receipt\.attempt_state = 'committed'[\s\S]+?v_caller_receipt\.provider_failure_class is not null[\s\S]+?v_caller_receipt\.committed_input_characters = 0/i, "abandonment accepts a reached-provider terminal failure without treating cost commitment as character success");
assert.match(abandonSource, /attempt_state = 'committed'[\s\S]+?provider_failure_class is null[\s\S]+?attempt_state in \('reserved', 'uncertain', 'expired'\)/i, "abandonment rejects successful committed, active, uncertain, and unknown-expiry siblings");
assert.match(abandonSource, /logical_state in \('committed', 'released'\)[\s\S]+?return 0/i, "abandonment is idempotent after logical settlement");
assert.match(abandonSource, /reserved_input_characters >= v_logical\.input_characters[\s\S]+?set reserved_input_characters = 0[\s\S]+?set logical_state = 'released'/i, "abandonment releases the logical character reservation exactly once with a nonnegative guard");
assert.match(abandonSource, /attempt_state in \('reserved', 'uncertain', 'expired'\)[\s\S]+?set lease_state = 'released',[\s\S]+?where attempt_id = p_attempt_id[\s\S]+?lease_state in \('active', 'uncertain'\)/i, "abandonment releases only the same logical attempt's active session lease after sibling safety checks");
assert.match(openAiFinalizeSource, /p_outcome = 'provider_not_reached'[\s\S]+?ct_paid_settle_logical_attempt_after_provider_failure/i, "OpenAI explicit failure checks whether a prior Azure failure completes logical release");
assert.match(azureFinalizeSource, /p_outcome = 'provider_not_reached'[\s\S]+?ct_paid_settle_logical_attempt_after_provider_failure/i, "Azure explicit failure settles logical release after a prior OpenAI failure");
assert.match(sql, /ct_paid_read_entitlement[\s\S]+?p_lifecycle_id is not null[\s\S]+?l\.is_terminal = false/i, "owner entitlement read is lifecycle-exact or non-terminal only");
assert.match(sql, /references public\.comment_translator_paid_customers\(id\) on delete cascade/i, "account cascade has an explicit internal customer-to-lifecycle path");
assert.match(sql, /p_openai_slot_lease_token uuid[\s\S]+?stale OpenAI slot token is not valid for update/i, "OpenAI slot extension and finalize use a slot token CAS");
assert.match(sql, /ct_paid_reclaim_azure_fallback[\s\S]+?Azure fallback bucket is missing/i, "Azure fallback has a bounded TTL reclaim path");
assert.match(sql, /constraint comment_translator_paid_attempt_receipts_key unique \(attempt_id, provider_attempt\)/i, "provider retries and fallback use a composite short-lived idempotency key");
assert.match(sql, /create table if not exists public\.comment_translator_paid_provider_detail_source_receipts[\s\S]+?attempt_id text not null[\s\S]+?provider_attempt text not null[\s\S]+?expires_at timestamptz not null[\s\S]+?primary key \(attempt_id, provider_attempt\)/i, "provider detail source idempotency stores only the approved identity and bounded expiry");
assert.match(sql, /delete from public\.comment_translator_paid_provider_detail_source_receipts[\s\S]+?expires_at <= p_now[\s\S]+?limit 1000/i, "expired provider detail source receipts receive bounded cleanup");
assert.match(sql, /constraint comment_translator_paid_poll_reservation_session_day_key unique \(session_reference_id, utc_day\)/i, "poll reservations can renew only at the next UTC day");
const pollBudgetSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_reserve_poll_budget"),
  sql.indexOf("create or replace function public.ct_paid_record_consent")
);
assert.match(pollBudgetSource, /sum\(reserved_polls\)[\s\S]+?session_reference_id = p_session_reference_id/i, "poll reservation sums the session across UTC-day rows");
assert.match(pollBudgetSource, /720 - v_session_reserved_polls/i, "poll rollover caps the session at 720 cumulative polls");

const circuitFailureSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_record_provider_circuit_failure"),
  sql.indexOf("create or replace function public.ct_paid_probe_provider_circuit")
);
const disableCircuitSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_disable_provider_circuit"),
  sql.indexOf("create or replace function public.ct_paid_record_provider_circuit_failure")
);
assert.match(disableCircuitSource, /p_provider not in \('openai', 'azure_fallback'\)[\s\S]+?from public\.comment_translator_paid_provider_circuits[\s\S]+?for update[\s\S]+?circuit_state = 'disabled'[\s\S]+?probe_attempt_id = null[\s\S]+?probe_lease_until = null/i, "the trusted disable RPC locks a known provider and normalizes probe state");
const circuitSuccessSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_record_provider_circuit_success"),
  sql.indexOf("create or replace function public.ct_paid_openai_attempt")
);
assert.match(circuitFailureSource, /v_circuit\.circuit_state = 'disabled'[\s\S]+?return 'disabled'/i, "a delayed provider failure preserves disabled state");
assert.match(circuitSuccessSource, /from public\.comment_translator_paid_provider_circuits[\s\S]+?for update[\s\S]+?circuit_state = 'disabled'[\s\S]+?return true/i, "a delayed provider success locks and preserves disabled state");
assert.match(circuitSuccessSource, /attempt_state = 'committed'[\s\S]+?provider_failure_class is null/i, "a reached-provider failed receipt cannot close the provider circuit as a success");
assert.match(circuitSuccessSource, /p_probe_attempt_id text[\s\S]+?circuit_state = 'degraded'[\s\S]+?return false[\s\S]+?circuit_state <> 'half_open'[\s\S]+?return false/i, "delayed success cannot bypass degraded and half-open state transitions");
assert.match(circuitSuccessSource, /probe_attempt_id is distinct from p_probe_attempt_id[\s\S]+?probe_lease_until <= p_now[\s\S]+?return false/i, "only the current unexpired half-open probe can close a circuit");

const openAiReserveSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_openai_attempt"),
  sql.indexOf("create or replace function public.ct_paid_extend_openai_attempt")
);
assert.match(openAiReserveSource, /v_receipt_count > 0[\s\S]+?v_receipt_count <> 1[\s\S]+?v_shared_attempt\.reserved_cost_micros <> 0[\s\S]+?v_shared_attempt\.attempt_state <> 'committed'[\s\S]+?provider_failure_class is distinct from 'invalid-response'[\s\S]+?committed_cost_micros <= 0[\s\S]+?OpenAI retry predecessor is not safe/i, "OpenAI retry accepts only one conservatively committed invalid-response predecessor");
assert.doesNotMatch(openAiReserveSource, /attempt_state = 'released'[\s\S]{0,180}provider_failure_class in \('network', 'timeout'\)/i, "released network or timeout receipts cannot authorize another OpenAI attempt");
assert.match(openAiReserveSource, /v_slot\.slot_state <> 'released'[\s\S]+?v_prior_lease\.provider_attempt <> v_shared_attempt\.provider_attempt[\s\S]+?v_prior_lease\.lease_state = 'released'[\s\S]+?v_prior_lease\.lease_state in \('active', 'uncertain'\)[\s\S]+?v_prior_lease\.lease_until > p_now[\s\S]+?v_prior_rate\.reservation_state <> 'completed'/i, "invalid-response retry requires a released slot, completed prior rate, and exact live or safely released session lease");
assert.match(openAiReserveSource, /p_input_characters > v_logical\.input_characters[\s\S]+?logical attempt input binding conflict/i, "OpenAI subset retry cannot exceed the single logical character reservation");
for (const allocationMarker of [
  "from public.comment_translator_paid_provider_circuits",
  "insert into public.comment_translator_paid_owner_cost_buckets",
  "insert into public.comment_translator_paid_openai_slots",
  "insert into public.comment_translator_paid_openai_minute_buckets",
  "set reserved_input_characters = reserved_input_characters + p_input_characters",
  "set reserved_cost_micros = reserved_cost_micros + p_estimated_cost_micros"
]) {
  const retryRejectionIndex = openAiReserveSource.indexOf("OpenAI retry predecessor is not safe");
  assert.ok(retryRejectionIndex >= 0 && retryRejectionIndex < openAiReserveSource.indexOf(allocationMarker), `unsafe OpenAI retry rejection precedes ${allocationMarker}`);
}

const azureStart = sql.indexOf("create or replace function public.ct_paid_azure_direct_fallback");
const azureEnd = sql.indexOf("create or replace function public.ct_paid_finalize_azure_fallback");
assert.ok(azureStart >= 0 && azureEnd > azureStart, "Azure fallback RPC block is bounded");
const azureSource = sql.slice(azureStart, azureEnd);
assert.doesNotMatch(azureSource, /(?:insert\s+into|update|delete\s+from)\s+public\.comment_translator_paid_(?:openai_slots|openai_minute_buckets|openai_rate_reservations|owner_cost_buckets|global_cost_buckets)/i, "Azure direct fallback does not mutate OpenAI slots, rate, or cost");
assert.match(azureSource, /v_receipt_count = 0[\s\S]+?v_openai_circuit\.circuit_state <> 'degraded'[\s\S]+?degraded OpenAI is required for direct Azure/i, "Azure direct path requires degraded OpenAI");
assert.match(azureSource, /v_receipt_count = 0[\s\S]+?v_openai_circuit\.last_error_class not in \('network', 'timeout', 'rate-limit', 'server-error'\)[\s\S]+?OpenAI failure class does not permit direct Azure fallback/i, "direct Azure fallback requires a current allowed OpenAI circuit proof");
assert.match(azureSource, /from public\.comment_translator_paid_session_leases[\s\S]+?where attempt_id = p_attempt_id[\s\S]+?and session_reference_id = p_session_reference_id[\s\S]+?and owner_user_id = p_owner_user_id[\s\S]+?for update/i, "Azure predecessor checks lock the current session lease by attempt, session, and owner");
assert.match(azureSource, /from public\.comment_translator_paid_attempt_receipts[\s\S]+?where attempt_id = p_attempt_id[\s\S]+?and provider_kind = 'openai_attempt'[\s\S]+?order by created_at desc, id desc[\s\S]+?limit 1[\s\S]+?for update/i, "Azure fallback selects the latest OpenAI predecessor deterministically without using the mutable session provider_attempt");
assert.doesNotMatch(azureSource, /v_lease\.provider_attempt\s*<>\s*v_shared_attempt\.provider_attempt/i, "Azure predecessor identity is not compared with the mutable session lease provider_attempt");
assert.match(azureSource, /v_shared_attempt\.attempt_state = 'uncertain'[\s\S]+?v_openai_slot\.slot_state <> 'uncertain'[\s\S]+?v_openai_rate\.reservation_state <> 'uncertain'[\s\S]+?v_lease\.id is null[\s\S]+?v_lease\.lease_state <> 'uncertain'[\s\S]+?uncertain OpenAI resources are not retained/i, "Azure uncertain path retains the OpenAI receipt, slot, rate, cost, and current lease state");
assert.match(azureSource, /v_shared_attempt\.attempt_state = 'released'[\s\S]+?v_openai_slot\.slot_state <> 'released'[\s\S]+?v_openai_rate\.reservation_state <> 'released'[\s\S]+?OpenAI resources are not released/i, "Azure provider-not-reached path requires safely released OpenAI resources");
assert.match(azureSource, /v_shared_attempt\.attempt_state = 'committed'[\s\S]+?v_shared_attempt\.reserved_cost_micros <> 0[\s\S]+?v_openai_slot\.slot_state <> 'released'[\s\S]+?v_openai_rate\.reservation_state <> 'completed'[\s\S]+?OpenAI reached-failure resources are not safely terminal/i, "Azure reached-provider failure path requires committed cost and RPM plus a released slot");
assert.match(azureSource, /v_azure_receipt_count > 0[\s\S]+?Azure fallback permits no prior Azure/i, "a second Azure receipt is rejected");
assert.match(azureSource, /v_openai_receipt_count > 2[\s\S]+?at most two OpenAI receipts/i, "Azure fallback rejects more than two OpenAI receipts");
assert.match(azureSource, /v_openai_receipt_count = 2[\s\S]+?attempt_state in \('reserved', 'uncertain', 'expired'\)[\s\S]+?committed_input_characters <> 0[\s\S]+?OpenAI retry chain is not safely terminal/i, "two-attempt Azure fallback rejects unresolved, expired, or character-committed OpenAI history");
assert.match(azureSource, /v_openai_receipt_count = 2[\s\S]+?v_shared_attempt\.provider_failure_class not in \('network', 'timeout', 'rate-limit', 'server-error'\)/i, "two-attempt Azure fallback binds the latest OpenAI receipt to an allowed transient failure");
assert.match(azureSource, /p_input_characters > v_logical\.input_characters[\s\S]+?logical attempt input binding conflict/i, "Azure fallback accepts only a positive subset of the logical reservation");
assert.doesNotMatch(azureSource, /v_shared_attempt\.(?:requested_input_characters|reserved_input_characters)\s*<>\s*p_input_characters/i, "Azure fallback does not require equality with a predecessor provider receipt");
assert.match(azureSource, /v_logical\.billing_period_usage_id is distinct from v_shared_attempt\.billing_period_usage_id[\s\S]+?logical attempt billing period binding conflict/i, "Azure fallback binds the reused logical attempt to the same billing-period bucket");

const reserveCapacitySource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_reserve_capacity"),
  sql.indexOf("create or replace function public.ct_paid_convert_capacity")
);
const convertCapacitySource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_convert_capacity"),
  sql.indexOf("create or replace function public.ct_paid_release_capacity")
);
assert.match(reserveCapacitySource, /v_existing\.reservation_state <> 'released'[\s\S]+?v_existing\.lifecycle_stage is distinct from p_lifecycle_stage[\s\S]+?capacity stage binding conflict[\s\S]+?return v_existing\.id/i, "capacity reserve rejects a mismatched stage before idempotent replay");
assert.match(reserveCapacitySource, /case v_lifecycle\.lifecycle_state[\s\S]+?when 'past_due' then 'payment_failure_hold'[\s\S]+?when 'dispute_reconciliation' then 'reconciliation'[\s\S]+?capacity stage does not match billing lifecycle/i, "capacity reserve derives the allowed stage from locked lifecycle authority");
assert.doesNotMatch(convertCapacitySource, /v_lifecycle\.lifecycle_state = 'checkout_hold'[\s\S]+?v_existing\.lifecycle_stage = 'checkout_hold'[\s\S]+?p_lifecycle_stage in/i, "capacity conversion has no standalone checkout-hold transition exception");
assert.match(convertCapacitySource, /v_existing\.owner_user_id <> v_lifecycle\.owner_user_id[\s\S]+?capacity owner binding conflict/i, "capacity conversion preserves the locked lifecycle owner boundary");
assert.match(convertCapacitySource, /v_target_capacity_stage := case v_lifecycle\.lifecycle_state[\s\S]+?p_lifecycle_stage is distinct from v_target_capacity_stage[\s\S]+?capacity stage does not match billing lifecycle/i, "capacity conversion rejects arbitrary caller stages outside the locked lifecycle transition");

const beginCheckoutRepairSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_begin_checkout"),
  sql.indexOf("create or replace function public.ct_paid_bind_checkout_session")
);
assert.match(beginCheckoutRepairSource, /next_reconcile_at[\s\S]+?v_checkout_expires_at_target/i, "Checkout begin schedules canonical expiry reconciliation");
assert.match(beginCheckoutRepairSource, /v_lifecycle\.lifecycle_state <> 'checkout_hold'[\s\S]+?v_hold\.hold_state <> 'held'[\s\S]+?v_capacity\.reservation_state <> 'held'[\s\S]+?checkout initialization binding conflict/i, "Checkout begin replay rejects active, payment-failure, dispute, converted, and non-held capacity authority");
const bindCheckoutRepairSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_bind_checkout_session"),
  sql.indexOf("create or replace function public.ct_paid_mark_checkout_expire_required")
);
assert.match(bindCheckoutRepairSource, /v_lifecycle\.lifecycle_state = 'expire_required'[\s\S]+?checkout session binding conflict/i, "normal and recovery Checkout Session binding reject expire-required lifecycle authority");
assert.doesNotMatch(bindCheckoutRepairSource, /p_is_recovery_binding\s+and\s+v_lifecycle\.lifecycle_state = 'expire_required'/i, "expire-required binding rejection is not recovery-only");
const markExpireRequiredSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_mark_checkout_expire_required"),
  sql.indexOf("create or replace function public.ct_paid_expire_checkout_hold")
);
assert.match(markExpireRequiredSource, /security definer[\s\S]+?from public\.comment_translator_paid_billing_lifecycles[\s\S]+?for update[\s\S]+?from public\.comment_translator_paid_checkout_holds[\s\S]+?for update/i, "trusted expire-required marker locks lifecycle and hold");
assert.match(markExpireRequiredSource, /p_stripe_checkout_session_id text[\s\S]+?p_stripe_customer_id text[\s\S]+?p_stripe_expires_at timestamptz/i, "expire-required marker accepts only sanitized immutable Session identity");
assert.match(markExpireRequiredSource, /length\(trim\(p_stripe_checkout_session_id\)\) = 0[\s\S]+?length\(trim\(p_stripe_customer_id\)\) = 0[\s\S]+?not isfinite\(p_stripe_expires_at\)/i, "expire-required marker validates nonempty finite Session identity");
assert.match(markExpireRequiredSource, /where lifecycle_id = p_lifecycle_id\s+or hold_id = p_hold_id[\s\S]+?for update/i, "expire-required marker locks an existing Session by lifecycle or hold");
assert.match(markExpireRequiredSource, /v_session\.stripe_checkout_session_id <> p_stripe_checkout_session_id[\s\S]+?v_session\.stripe_customer_id <> p_stripe_customer_id[\s\S]+?v_session\.stripe_expires_at is distinct from p_stripe_expires_at[\s\S]+?insert into public\.comment_translator_paid_checkout_session_bindings/i, "expire-required marker idempotently replays exact Session identity and inserts the missing immutable binding");
assert.match(markExpireRequiredSource, /insert into public\.comment_translator_paid_checkout_session_bindings[\s\S]+?lifecycle_state = 'expire_required'[\s\S]+?hold_state = 'expire_required'/i, "expire-required marker binds the Session in the same transaction as the terminal-required transition");
assert.doesNotMatch(markExpireRequiredSource, /\b(?:checkout_url|raw_stripe_payload|response_body|status_body|secret_value)\b/i, "expire-required marker persists no URL, raw response, or secret");
assert.match(sql, /ct_paid_mark_checkout_expire_required\(uuid,uuid,uuid,uuid,text,text,timestamptz,text,timestamptz,timestamptz\)/i, "expire-required marker has an exact service-role grant signature");
const expireCheckoutRepairSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_expire_checkout_hold"),
  sql.indexOf("create or replace function public.ct_paid_claim_stripe_event")
);
assert.doesNotMatch(expireCheckoutRepairSource, /v_session\.stripe_expires_at is distinct from v_hold\.checkout_expires_at_target/i, "Checkout expiry permits the immutable Stripe expiry to differ from the hold target");
assert.match(expireCheckoutRepairSource, /p_stripe_session_checked_at < greatest\(v_session\.stripe_expires_at, v_hold\.checkout_expires_at_target\)/i, "Checkout expiry confirmation must be at or after both immutable timestamps");
assert.match(projectionSource, /v_failure_started_at \+ interval '7 days'[\s\S]+?v_observed_subscription_status = 'active'[\s\S]+?then null/i, "payment failure and active recovery repoint or clear reconciliation");
assert.match(pollBudgetSource, /v_session_reserved_polls = 0[\s\S]+?floor\(v_bucket\.daily_budget \* 0\.90\)[\s\S]+?new Paid poll session threshold is exhausted/i, "new poll sessions use the approved atomic ninety-percent gate");

assert.match(sql, /provider_failure_class text[\s\S]+?provider_failure_class is null\s+or provider_failure_class in \('network', 'timeout', 'rate-limit', 'server-error', 'invalid-response', 'quota', 'configuration', 'policy'\)/i, "OpenAI receipts persist only the sanitized provider failure allowlist");
assert.match(circuitFailureSource, /p_error_class in \('quota', 'configuration', 'policy'\)[\s\S]+?last_error_class = p_error_class[\s\S]+?return v_circuit\.circuit_state/i, "forbidden provider classes are recorded without advancing the fallback circuit");
assert.match(openAiFinalizeSource, /p_provider_failure_class text[\s\S]+?p_outcome in \('uncertain_inflight', 'provider_not_reached', 'provider_reached_failed'\)[\s\S]+?p_provider_failure_class is null[\s\S]+?provider failure class is required/i, "OpenAI failure finalization requires a sanitized provider failure class");
assert.match(openAiFinalizeSource, /p_outcome = 'provider_not_reached'[\s\S]+?p_provider_failure_class not in \('network', 'timeout', 'configuration', 'policy'\)[\s\S]+?OpenAI outcome and failure class binding conflict/i, "HTTP 429, HTTP 500, invalid response, and provider quota cannot use the not-reached release path");
assert.match(openAiFinalizeSource, /v_attempt\.provider_failure_class is not null[\s\S]+?v_attempt\.provider_failure_class is distinct from p_provider_failure_class[\s\S]+?provider failure class binding conflict/i, "OpenAI failure class binding rejects mixed concurrent finalizers");
assert.match(openAiFinalizeSource, /set attempt_state = 'uncertain',[\s\S]+?provider_failure_class = p_provider_failure_class/i, "uncertain OpenAI finalization atomically binds the failure class");
assert.match(openAiFinalizeSource, /set attempt_state = 'released',[\s\S]+?provider_failure_class = p_provider_failure_class/i, "provider-not-reached OpenAI finalization atomically binds the failure class");
assert.match(openAiFinalizeSource, /p_outcome = 'provider_reached_failed'[\s\S]+?committed_cost_micros = committed_cost_micros \+ v_attempt\.reserved_cost_micros[\s\S]+?reservation_state = 'completed'[\s\S]+?set attempt_state = 'committed',[\s\S]+?provider_failure_class = p_provider_failure_class/i, "reached-provider failure conservatively commits cost and RPM without character settlement");
const providerFailureSettlementSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_settle_logical_attempt_after_provider_failure"),
  sql.indexOf("create or replace function public.ct_paid_abandon_logical_attempt")
);
assert.match(providerFailureSettlementSource, /count\(\*\) filter \(where attempt_state = 'committed' and provider_failure_class is null\)/i, "provider-failure settlement treats only a successful committed receipt as logical character success");
assert.match(azureSource, /v_receipt_count = 0[\s\S]+?v_openai_circuit\.circuit_state <> 'degraded'[\s\S]+?v_openai_circuit\.last_error_class not in \('network', 'timeout', 'rate-limit', 'server-error'\)/i, "degraded direct Azure requires the latest allowed transient circuit class");
assert.match(azureSource, /v_shared_attempt\.provider_failure_class is null[\s\S]+?v_shared_attempt\.provider_failure_class not in \('network', 'timeout', 'rate-limit', 'server-error'\)[\s\S]+?OpenAI predecessor failure class does not permit Azure fallback/i, "predecessor Azure authorization uses the locked exact OpenAI receipt class and excludes invalid-response and policy");
assert.match(sql, /ct_paid_finalize_openai_attempt\(text,text,uuid,uuid,text,bigint,bigint,text,timestamptz\)/i, "OpenAI finalize grant includes the sanitized provider failure class");
assert.match(sql, /ct_paid_finalize_azure_fallback\(text,text,uuid,text,bigint,timestamptz,text\)/i, "Azure finalize grant includes the optional sanitized provider failure class without reordering existing arguments");
assert.match(sql, /create table if not exists public\.comment_translator_paid_logical_attempts[\s\S]+?expires_at timestamptz not null/i, "logical attempt ledger has an authoritative expiry");
assert.match(sql, /create index if not exists comment_translator_paid_logical_attempt_expiry_idx\s+on public\.comment_translator_paid_logical_attempts \(expires_at\)/i, "logical attempt expiry has a cleanup index");
assert.equal((sql.match(/p_now \+ interval '24 hours'/g) ?? []).length, 3, "each logical attempt creation path fixes the Task 2 server-clock TTL to 24 hours");
const cleanupAttemptLedgersSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_cleanup_attempt_ledgers"),
  sql.indexOf("create or replace function public.ct_paid_close_billing_period")
);
assert.match(cleanupAttemptLedgersSource, /p_limit integer default 500[\s\S]+?p_limit < 1 or p_limit > 500/i, "attempt-ledger cleanup is bounded to 500 rows");
assert.match(cleanupAttemptLedgersSource, /p_now := statement_timestamp\(\)[\s\S]+?expires_at <= p_now/i, "attempt-ledger cleanup uses authoritative server time");
assert.match(cleanupAttemptLedgersSource, /logical_state in \('committed', 'released'\)[\s\S]+?not exists[\s\S]+?attempt_state not in \('committed', 'released', 'expired'\)/i, "cleanup retains nonterminal logical or provider attempts");
assert.match(cleanupAttemptLedgersSource, /limit p_limit[\s\S]+?for update of logical_attempt skip locked[\s\S]+?delete from public\.comment_translator_paid_attempt_receipts[\s\S]+?delete from public\.comment_translator_paid_logical_attempts/i, "cleanup claims a bounded batch and removes receipts before logical rows");
const hourlyDetailSource = sql.slice(
  sql.indexOf("create or replace function public.ct_paid_record_provider_hourly_detail"),
  sql.indexOf("create or replace function public.ct_paid_upsert_session_summary")
);
assert.match(hourlyDetailSource, /from public\.comment_translator_paid_logical_attempts[\s\S]+?for update[\s\S]+?from public\.comment_translator_paid_attempt_receipts[\s\S]+?for update/i, "hourly detail locks logical and provider receipt authority before source-window validation");
assert.match(hourlyDetailSource, /from public\.comment_translator_paid_provider_detail_source_receipts[\s\S]+?expires_at > p_now[\s\S]+?return false[\s\S]+?p_source_expires_at is distinct from v_provider_receipt\.expires_at/i, "live duplicate source no-ops before caller expiry validation");
assert.match(hourlyDetailSource, /p_source_expires_at is distinct from v_provider_receipt\.expires_at[\s\S]+?v_provider_receipt\.expires_at <= p_now[\s\S]+?v_provider_receipt\.expires_at > p_now \+ interval '120 seconds'/i, "first source insert requires the exact live bounded DB provider receipt expiry");
assert.match(hourlyDetailSource, /p_attempt_id, p_provider_attempt, v_logical\.expires_at, p_now, p_now/i, "hourly detail stores logical expiry for delayed-replay dedupe retention");
assert.match(sql, /ct_paid_cleanup_attempt_ledgers\(timestamptz,integer\)/i, "attempt-ledger cleanup has an exact service-role grant signature");

assert.doesNotMatch(sql, /\b(?:raw_comment|raw_response|raw_stripe_payload|provider_message_id|comment_hash|body_hash|live_chat_id)\b/i, "forbidden content and provider identifiers are absent from the schema");
assert.doesNotMatch(sql, /\b(?:secret_key|secret_value|webhook_secret|api_secret)\s+(?:text|jsonb|bytea|varchar)/i, "secret-value columns are absent from the schema");
assert.doesNotMatch(sql, /\b(?:checkout_url|authorization_header|token_value|response_body)\s+(?:text|jsonb|bytea|varchar)/i, "credential, URL, and provider response columns are absent from the schema");
const sourceReceiptTable = sql.slice(
  sql.indexOf("create table if not exists public.comment_translator_paid_provider_detail_source_receipts"),
  sql.indexOf("create table if not exists public.comment_translator_paid_consents")
);
assert.doesNotMatch(sourceReceiptTable, /\b(?:owner_user_id|provider|message|body|hash|payload|jsonb)\b/i, "provider detail source receipts contain only short-lived source identity and timestamps");

console.log("comment translator Paid Core v1 schema contract checks passed");
