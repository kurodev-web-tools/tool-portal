import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260812120000_comment_translator_paid_core_v1.sql";
const sql = fs.readFileSync(path.join(root, migrationPath), "utf8");

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

const requiredFunctions = [
  "ct_paid_begin_checkout",
  "ct_paid_bind_checkout_session",
  "ct_paid_mark_checkout_expire_required",
  "ct_paid_expire_checkout_hold",
  "ct_paid_claim_stripe_event",
  "ct_paid_read_entitlement",
  "ct_paid_finalize_stripe_event",
  "ct_paid_bind_first_subscription",
  "ct_paid_claim_entitlement_projection",
  "ct_paid_project_entitlement",
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
  "ct_paid_cleanup_attempt_ledgers",
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
];

const scan = scanSql(sql);
assert.equal(scan.parenthesesDepth, 0, "migration parentheses are balanced outside SQL strings/comments");
assert.equal(scan.unterminatedDollarQuote, null, "migration dollar-quoted functions are terminated");
assert.equal(scan.unterminatedString, false, "migration single-quoted literals are terminated");
assert.doesNotMatch(sql, /\b(?:drop\s+table|truncate\s+table)\b/i, "migration is additive and does not remove tables or truncate data");
const deleteTargets = [...sql.matchAll(/delete\s+from\s+public\.([a-z0-9_]+)/gi)].map((match) => match[1]);
assert.deepEqual(deleteTargets, ["comment_translator_paid_attempt_receipts", "comment_translator_paid_logical_attempts", "comment_translator_paid_provider_detail_source_receipts"], "only bounded terminal attempt ledgers and expired source receipts are deleted");

for (const table of requiredTables) {
  const declaration = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\s*\\(`, "i").exec(sql);
  assert.ok(declaration, `table declaration is parseable: ${table}`);
  const body = readParenthesizedBody(sql, declaration.index + declaration[0].lastIndexOf("("));
  const columnNames = topLevelColumnNames(body);
  assert.ok(columnNames.length > 0, `${table} has parseable columns`);
  assert.equal(new Set(columnNames).size, columnNames.length, `${table} has no duplicate column names`);
}

for (const functionName of requiredFunctions) {
  const matches = sql.match(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}\\s*\\(`, "gi")) ?? [];
  assert.equal(matches.length, 1, `migration defines ${functionName} once`);
}

assert.doesNotMatch(sql, /grant\s+all\s+on\s+table[\s\S]+?to\s+service_role/i, "parser rejects broad service_role table grants");
assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete|truncate|references|trigger)(?:\s*,\s*(?:insert|update|delete|truncate|references|trigger))*\s+on\s+table[\s\S]+?to\s+service_role/i, "parser rejects direct service_role table DML grants");
assert.match(sql, /revoke all on table public\.%I from public, anon, authenticated, service_role/i, "parser sees service_role table privilege revocation");
for (const functionName of requiredFunctions.filter((name) => !["ct_paid_read_entitlement", "ct_paid_assert_current_paid_period", "ct_paid_assert_current_utc_month"].includes(name))) {
  const source = functionSourceByTerminator(sql, functionName);
  assert.match(source, /language plpgsql\s+security definer\s+set search_path = pg_catalog, public\s+as \$\$/i, `${functionName} parses as a fixed-search-path SECURITY DEFINER RPC`);
}

assert.match(sql, /create unique index if not exists comment_translator_paid_one_non_terminal_lifecycle_per_owner_idx[\s\S]+?where\s+is_terminal\s*=\s*false/i);
assert.match(sql, /create unique index if not exists comment_translator_paid_session_one_active_lease_idx[\s\S]+?where\s+lease_state\s+in\s*\('active',\s*'uncertain'\)/i);
assert.match(sql, /for\s+update\s+skip\s+locked/i, "claim RPC retains row-lock skip semantics");
assert.match(sql, /limit\s+least\(greatest\(coalesce\(p_limit,\s*50\),\s*0\),\s*50\)/i, "claim RPC parses a null-safe bounded limit");
const reconcilerClaimSource = functionSource(sql, "ct_paid_claim_reconciler", "ct_paid_finalize_reconciler");
assert.match(reconcilerClaimSource, /from public\.comment_translator_paid_billing_lifecycles lifecycle[\s\S]+?lifecycle\.reconcile_lease_until is null[\s\S]+?lifecycle\.reconcile_lease_until <= p_now/i, "reconciler candidate fields are table-qualified instead of colliding with output variables");
const beginCheckoutSource = functionSource(sql, "ct_paid_begin_checkout", "ct_paid_bind_checkout_session");
assert.match(beginCheckoutSource, /returns table \(\s*lifecycle_id uuid,\s*hold_id uuid,\s*customer_binding_id uuid,\s*idempotency_key text,\s*checkout_expires_at_target timestamptz\s*\)/i, "Checkout begin parser exposes canonical DB-owned authority");
assert.doesNotMatch(beginCheckoutSource, /p_idempotency_key text|p_checkout_expires_at_target timestamptz/i, "Checkout begin parser accepts no caller-owned key or expiry authority");
assert.match(beginCheckoutSource, /v_hold_id := gen_random_uuid\(\)[\s\S]+?v_idempotency_key := 'ct-paid-checkout-' \|\| v_hold_id::text[\s\S]+?v_checkout_expires_at_target := date_trunc\('second', p_now\) \+ interval '31 minutes'/i, "Checkout begin parser derives key and canonical UTC-second target from hold ID and statement time");
assert.match(beginCheckoutSource, /where owner_user_id = p_owner_user_id[\s\S]+?and is_terminal = false[\s\S]+?v_lifecycle\.lifecycle_state <> 'checkout_hold'[\s\S]+?v_hold\.hold_state <> 'held'[\s\S]+?v_capacity\.reservation_state <> 'held'[\s\S]+?return query select\s+v_lifecycle\.id,\s+v_hold\.id,\s+v_customer\.id,\s+v_hold\.idempotency_key,\s+v_hold\.checkout_expires_at_target/i, "Checkout begin parser returns only an unfinished held Checkout authority");
assert.match(beginCheckoutSource, /v_lifecycle\.customer_binding_id <> v_customer\.id[\s\S]+?return query select\s+v_lifecycle\.id,\s+v_hold\.id,\s+v_customer\.id/i, "Checkout begin returns the exact converged lifecycle, hold, and Customer bindings");
assert.ok(beginCheckoutSource.indexOf("where owner_user_id = p_owner_user_id") < beginCheckoutSource.indexOf("v_hold_id := gen_random_uuid()"), "Checkout begin parses owner convergence before new hold generation");
assert.match(beginCheckoutSource, /insert into public\.comment_translator_paid_billing_lifecycles[\s\S]+?next_reconcile_at[\s\S]+?v_checkout_expires_at_target/i, "Checkout begin schedules the lifecycle at the canonical expiry target");
const bindCheckoutSource = functionSource(sql, "ct_paid_bind_checkout_session", "ct_paid_mark_checkout_expire_required");
assert.match(bindCheckoutSource, /v_existing\.lifecycle_id <> p_lifecycle_id[\s\S]+?v_existing\.hold_id <> p_hold_id[\s\S]+?v_existing\.customer_binding_id <> p_customer_binding_id/i, "Checkout Session replay rejects lifecycle, hold, and Customer reassignment");
assert.ok(bindCheckoutSource.indexOf("from public.comment_translator_paid_checkout_session_bindings") < bindCheckoutSource.indexOf("v_hold.hold_state <> 'held'"), "Checkout Session replay parses before the held-only new-binding gate");
assert.match(bindCheckoutSource, /next_reconcile_at = p_stripe_expires_at/i, "Checkout Session binding repoints reconciliation to the immutable Stripe expiry");
assert.match(bindCheckoutSource, /p_is_recovery_binding boolean[\s\S]+?p_idempotency_key text/i, "Checkout Session binding parses explicit recovery mode and idempotency authority");
assert.match(bindCheckoutSource, /p_is_recovery_binding is null[\s\S]+?not p_is_recovery_binding and p_stripe_expires_at <= p_now/i, "only normal Checkout Session binding rejects the trusted expiry boundary");
assert.doesNotMatch(bindCheckoutSource, /or\s+p_stripe_expires_at <= p_now/i, "Checkout Session binding has no unqualified expiry-time rejection");
assert.equal((bindCheckoutSource.match(/p_stripe_expires_at <= p_now/gi) ?? []).length, 1, "Checkout Session binding has exactly one mode-qualified expiry comparison");
assert.match(bindCheckoutSource, /p_is_recovery_binding[\s\S]+?p_idempotency_key is null[\s\S]+?v_hold\.idempotency_key is distinct from p_idempotency_key[\s\S]+?v_lifecycle\.lifecycle_state = 'expire_required'/i, "late recovery requires the locked hold idempotency key and rejects expire-required lifecycle state");
assert.doesNotMatch(bindCheckoutSource, /p_is_recovery_binding\s+and\s+v_lifecycle\.lifecycle_state = 'expire_required'/i, "expire-required rejection is unconditional across normal and recovery binding");
assert.match(bindCheckoutSource, /v_hold\.checkout_expires_at_target is distinct from p_stripe_expires_at/i, "recovery binding requires the immutable expiry boundary");
const markExpireRequiredSource = functionSource(sql, "ct_paid_mark_checkout_expire_required", "ct_paid_expire_checkout_hold");
assert.match(markExpireRequiredSource, /from public\.comment_translator_paid_billing_lifecycles[\s\S]+?for update[\s\S]+?from public\.comment_translator_paid_checkout_holds[\s\S]+?for update[\s\S]+?from public\.comment_translator_paid_capacity_reservations[\s\S]+?for update/i, "expire-required marker locks lifecycle, hold, and capacity authority");
assert.match(markExpireRequiredSource, /p_stripe_checkout_session_id text[\s\S]+?p_stripe_customer_id text[\s\S]+?p_stripe_expires_at timestamptz/i, "expire-required marker parses sanitized Session identity");
assert.match(markExpireRequiredSource, /from public\.comment_translator_paid_checkout_session_bindings[\s\S]+?where lifecycle_id = p_lifecycle_id\s+or hold_id = p_hold_id[\s\S]+?for update/i, "expire-required marker locks an existing Checkout Session by lifecycle or hold");
assert.match(markExpireRequiredSource, /v_session\.stripe_checkout_session_id <> p_stripe_checkout_session_id[\s\S]+?v_session\.stripe_expires_at is distinct from p_stripe_expires_at[\s\S]+?insert into public\.comment_translator_paid_checkout_session_bindings/i, "expire-required marker rejects conflicting replay and inserts a missing immutable Session binding");
assert.match(markExpireRequiredSource, /lifecycle_state = 'expire_required'[\s\S]+?next_reconcile_at = p_now[\s\S]+?hold_state = 'expire_required'/i, "expire-required marker atomically schedules reconciliation and blocks hold reuse");
const expireCheckoutSource = functionSource(sql, "ct_paid_expire_checkout_hold", "ct_paid_claim_stripe_event");
assert.match(expireCheckoutSource, /subscription binding prevents checkout hold release[\s\S]+?hold_state = 'released'[\s\S]+?reservation_state = 'released'/i, "Checkout expiry rejects a Subscription and releases the hold and capacity");
assert.match(expireCheckoutSource, /from public\.comment_translator_paid_entitlements[\s\S]+?where lifecycle_id = p_lifecycle_id[\s\S]+?for update[\s\S]+?nonterminal entitlement prevents checkout hold release[\s\S]+?reservation_state = 'released'/i, "Checkout expiry parser requires a locked terminal entitlement invariant before capacity release");
assert.match(expireCheckoutSource, /v_session\.id is null[\s\S]+?v_session\.lifecycle_id <> p_lifecycle_id[\s\S]+?v_session\.hold_id <> p_hold_id[\s\S]+?v_session\.owner_user_id <> p_owner_user_id/i, "Checkout expiry requires the immutable bound Session identity");
assert.doesNotMatch(expireCheckoutSource, /v_session\.stripe_expires_at is distinct from v_hold\.checkout_expires_at_target/i, "Checkout expiry parser permits immutable target mismatch");
assert.match(expireCheckoutSource, /p_stripe_session_status is distinct from 'expired'[\s\S]+?p_stripe_session_checked_at is null[\s\S]+?p_stripe_session_checked_at > p_now[\s\S]+?p_stripe_session_checked_at < greatest\(v_session\.stripe_expires_at, v_hold\.checkout_expires_at_target\)/i, "Checkout expiry requires an expired Session confirmation at or after both immutable timestamps and no later than statement time");
assert.match(expireCheckoutSource, /p_reconcile_lease_token uuid default null/i, "Checkout expiry parser accepts nullable lease authority");
assert.match(expireCheckoutSource, /p_reconcile_lease_token is not null[\s\S]+?reconcile_lease_token is distinct from p_reconcile_lease_token[\s\S]+?reconcile_lease_until <= p_now/i, "Checkout expiry parser rejects stale supplied lease authority");
assert.match(expireCheckoutSource, /p_reconcile_lease_token is null[\s\S]+?reconcile_lease_until > p_now/i, "Checkout expiry parser blocks lease-free mutation while a live lease exists");
const hourlyDetailSource = functionSource(sql, "ct_paid_record_provider_hourly_detail", "ct_paid_upsert_session_summary");
assert.match(hourlyDetailSource, /insert into public\.comment_translator_paid_provider_detail_source_receipts[\s\S]+?on conflict \(attempt_id, provider_attempt\) do nothing[\s\S]+?if not found then[\s\S]+?return false[\s\S]+?on conflict \(owner_user_id, provider, utc_hour\) do update/i, "hourly provider detail parses source-idempotency before aggregate mutation");
assert.match(hourlyDetailSource, /from public\.comment_translator_paid_logical_attempts[\s\S]+?for update[\s\S]+?from public\.comment_translator_paid_attempt_receipts[\s\S]+?for update[\s\S]+?from public\.comment_translator_paid_provider_detail_source_receipts[\s\S]+?expires_at > p_now[\s\S]+?return false[\s\S]+?p_source_expires_at is distinct from v_provider_receipt\.expires_at[\s\S]+?v_provider_receipt\.expires_at <= p_now[\s\S]+?v_provider_receipt\.expires_at > p_now \+ interval '120 seconds'[\s\S]+?v_logical\.expires_at/i, "hourly detail locks DB authority, no-ops delayed duplicates, and retains dedupe to logical expiry");
const sessionSummarySource = functionSource(sql, "ct_paid_upsert_session_summary", "ct_paid_record_consent");
assert.match(sessionSummarySource, /greatest\(comment_translator_paid_session_summaries\.translated_message_count, excluded\.translated_message_count\)[\s\S]+?owner_user_id = excluded\.owner_user_id[\s\S]+?started_at = excluded\.started_at/i, "session summary replay keeps identity exact and cumulative counters monotonic");
assert.match(sessionSummarySource, /length\(p_stop_reason\) > 64[\s\S]+?p_stop_reason !~ '\^\[a-z0-9\]\[a-z0-9_-\]\*\$'/i, "session summary persists only a bounded sanitized stop reason");
const bindSubscriptionSource = functionSource(sql, "ct_paid_bind_first_subscription", "ct_paid_assert_current_paid_period");
assert.match(bindSubscriptionSource, /v_lifecycle\.id is null[\s\S]+?v_lifecycle\.owner_user_id <> p_owner_user_id[\s\S]+?v_lifecycle\.is_terminal/i, "binding parser requires a matching non-terminal lifecycle");
assert.match(bindSubscriptionSource, /v_lifecycle\.lifecycle_state = 'expire_required'[\s\S]+?billing lifecycle binding is not ready/i, "first-subscription binding rejects expire-required lifecycle authority");
assert.match(bindSubscriptionSource, /v_hold\.id is null\s+or v_hold\.owner_user_id <> p_owner_user_id/i, "binding parser requires a hold and matching owner");
assert.match(bindSubscriptionSource, /v_hold\.hold_state not in \('held',\s*'converted'\)/i, "binding parser accepts only bind-ready or idempotently converted holds");
assert.match(bindSubscriptionSource, /where lifecycle_id = p_lifecycle_id\s+and hold_id = v_hold\.id\s+for update/i, "binding parser requires the locked Checkout Session for the lifecycle hold");
assert.match(bindSubscriptionSource, /v_session\.id is null[\s\S]+?v_session\.owner_user_id <> p_owner_user_id[\s\S]+?v_session\.stripe_customer_id <> p_stripe_customer_id/i, "binding parser requires Session owner/customer proof");
assert.match(bindSubscriptionSource, /v_session\.customer_binding_id <> p_customer_binding_id/i, "binding parser rejects a same-owner Checkout Session from another Customer binding");
assert.match(bindSubscriptionSource, /v_existing\.customer_binding_id <> p_customer_binding_id/i, "binding parser preserves the Subscription Customer binding on idempotent replay");
assert.doesNotMatch(bindSubscriptionSource, /if v_hold\.id is not null then/i, "binding parser rejects an optional-hold branch");
const reserveCapacitySource = functionSource(sql, "ct_paid_reserve_capacity", "ct_paid_convert_capacity");
const convertCapacitySource = functionSource(sql, "ct_paid_convert_capacity", "ct_paid_release_capacity");
assert.doesNotMatch(convertCapacitySource, /v_lifecycle\.lifecycle_state = 'checkout_hold'[\s\S]+?v_existing\.lifecycle_stage = 'checkout_hold'[\s\S]+?p_lifecycle_stage in/i, "standalone capacity conversion has no checkout-hold transition exception");
assert.match(convertCapacitySource, /v_target_capacity_stage is null[\s\S]+?p_lifecycle_stage is distinct from v_target_capacity_stage[\s\S]+?capacity stage does not match billing lifecycle/i, "standalone capacity conversion requires the exact locked lifecycle stage");
assert.match(bindSubscriptionSource, /v_initial_capacity_stage := case v_lifecycle\.lifecycle_state[\s\S]+?when 'checkout_hold' then 'checkout_hold'[\s\S]+?ct_paid_reserve_capacity\([\s\S]+?v_initial_capacity_stage/i, "first-subscription binding reserves the stage matching its initially locked lifecycle");
assert.match(bindSubscriptionSource, /v_target_capacity_stage := case p_lifecycle_state[\s\S]+?when 'dispute' then 'dispute'[\s\S]+?when 'cancel_pending' then 'cancel_pending'[\s\S]+?when 'dispute_reconciliation' then 'reconciliation'/i, "first-subscription target capacity mapping matches lifecycle semantics");
assert.match(bindSubscriptionSource, /p_lifecycle_state in \('incomplete_expired', 'canceled', 'terminated'\)[\s\S]+?first subscription lifecycle target is not capacity eligible/i, "first-subscription binding excludes terminal capacity conversion targets");
assert.ok(
  bindSubscriptionSource.indexOf("set lifecycle_state = p_lifecycle_state") < bindSubscriptionSource.indexOf("perform public.ct_paid_convert_capacity"),
  "first-subscription binding updates lifecycle before capacity conversion"
);
assert.ok(reserveCapacitySource.indexOf("for update") >= 0, "capacity reservation still locks lifecycle authority");
const projectionSource = functionSource(sql, "ct_paid_project_entitlement", "ct_paid_bind_first_subscription");
const projectionClaimSource = functionSource(sql, "ct_paid_claim_entitlement_projection", "ct_paid_project_entitlement");
assert.match(projectionClaimSource, /projection_lease_until > p_now[\s\S]+?return;/i, "projection claim parser rejects concurrent live ownership");
assert.match(projectionClaimSource, /v_projection_lease_token := gen_random_uuid\(\)[\s\S]+?v_projection_lease_until := p_now \+ interval '120 seconds'/i, "projection claim parser issues bounded opaque authority");
assert.match(projectionSource, /p_projection_lease_token uuid[\s\S]+?v_lifecycle\.projection_lease_token is distinct from p_projection_lease_token[\s\S]+?v_lifecycle\.projection_lease_until <= p_now/i, "projection parser requires exact live projection CAS authority");
assert.match(projectionSource, /projection_lease_until = null[\s\S]+?projection_lease_token = null[\s\S]+?projection_lease_token = p_projection_lease_token/i, "projection parser clears only its successful CAS lease");
assert.match(bindSubscriptionSource, /p_projection_lease_token uuid[\s\S]+?p_projection_lease_token => p_projection_lease_token/i, "first-subscription parser forwards the projection token");
assert.doesNotMatch(projectionSource, /p_stripe_event_created_at|last_projection_event_created_at|projection freshness conflict|projection timestamp conflict/i, "projection parser has no generic Event.created freshness gate");
assert.doesNotMatch(bindSubscriptionSource, /p_stripe_event_created_at|last_projection_event_created_at|projection is stale/i, "first-subscription parser has no generic Event.created freshness gate");
assert.match(projectionSource, /if not \([\s\S]+?entitlement projection state combination is not valid/i, "projection state matrix remains inside one parseable RPC block");
assert.match(projectionSource, /p_entitlement_status = 'dispute'[\s\S]+?p_dispute_state in \('investigating',\s*'lost',\s*'reconciliation'\)/i, "dispute projection matrix is parser-visible");
assert.match(projectionSource, /p_subscription_binding_id is not null[\s\S]+?p_current_period_start is null[\s\S]+?p_current_period_end is null[\s\S]+?subscription-bound entitlement period is not valid/i, "projection parser requires complete subscription period bounds");
assert.match(projectionSource, /p_cancel_at_period_end is distinct from \(\s*p_entitlement_status in \('cancel_at_period_end', 'cancel_pending'\)\s*\)/i, "projection parser rejects contradictory cancellation flags");
assert.match(projectionSource, /v_subscription\.customer_binding_id <> p_customer_binding_id/i, "projection parser rejects a Subscription from another Customer binding");
assert.match(projectionSource, /next_reconcile_at = case[\s\S]+?v_observed_subscription_status in \('past_due', 'unpaid'\)[\s\S]+?v_failure_started_at \+ interval '7 days'[\s\S]+?v_observed_subscription_status = 'active'[\s\S]+?then null/i, "payment failure projection schedules seven-day retention and active recovery clears it");
const circuitFailureSource = functionSource(sql, "ct_paid_record_provider_circuit_failure", "ct_paid_probe_provider_circuit");
const disableCircuitSource = functionSource(sql, "ct_paid_disable_provider_circuit", "ct_paid_record_provider_circuit_failure");
const circuitSuccessSource = functionSource(sql, "ct_paid_record_provider_circuit_success", "ct_paid_openai_attempt");
assert.match(disableCircuitSource, /p_provider not in \('openai', 'azure_fallback'\)[\s\S]+?for update[\s\S]+?circuit_state = 'disabled'/i, "provider disable RPC validates and locks the fixed provider row");
assert.match(circuitFailureSource, /circuit_state = 'disabled'[\s\S]+?return 'disabled'/i, "disabled failure guard remains in the failure RPC");
assert.match(circuitFailureSource, /circuit_state = 'degraded'[\s\S]+?circuit_state = 'degraded'[\s\S]+?degraded_until = greatest\([\s\S]+?return 'degraded'/i, "a delayed failure keeps an existing degraded circuit degraded and preserves or extends its deadline");
assert.ok(circuitFailureSource.indexOf("circuit_state = 'degraded'") < circuitFailureSource.indexOf("window_started_at + interval '60 seconds'"), "degraded state is handled before the closed-state rolling window can reset it");
assert.match(circuitFailureSource, /circuit_state = 'half_open'[\s\S]+?v_state := 'degraded'[\s\S]+?degraded_until = case when v_state = 'degraded' then p_now \+ interval '5 minutes'/i, "a half-open failure returns to degraded with a fresh five-minute deadline");
assert.match(circuitSuccessSource, /from public\.comment_translator_paid_provider_circuits[\s\S]+?for update[\s\S]+?circuit_state = 'disabled'/i, "disabled success guard follows a row lock");
assert.match(circuitSuccessSource, /p_probe_attempt_id text[\s\S]+?circuit_state = 'degraded'[\s\S]+?return false[\s\S]+?circuit_state <> 'half_open'[\s\S]+?return false/i, "circuit success is state-aware and does not close degraded or unknown states");
assert.match(circuitSuccessSource, /probe_attempt_id is distinct from p_probe_attempt_id[\s\S]+?probe_lease_until is null[\s\S]+?probe_lease_until <= p_now[\s\S]+?return false/i, "circuit success validates the live half-open probe identity and lease");
const openAiFinalizeSource = functionSource(sql, "ct_paid_finalize_openai_attempt", "ct_paid_reclaim_openai_attempt");
const openAiReclaimSource = functionSource(sql, "ct_paid_reclaim_openai_attempt", "ct_paid_azure_direct_fallback");
const azureFinalizeSource = functionSource(sql, "ct_paid_finalize_azure_fallback", "ct_paid_reclaim_azure_fallback");
for (const [name, source] of [["OpenAI", openAiFinalizeSource], ["Azure", azureFinalizeSource]]) {
  assert.match(source, /v_lease\.lease_token is distinct from p_session_lease_token/i, `${name} finalize parses a null-safe session lease CAS`);
  assert.ok(source.indexOf("attempt_state in ('committed', 'released', 'expired')") < source.indexOf("v_lease.lease_token is distinct from p_session_lease_token"), `${name} terminal replay uses immutable receipt identity before mutable session lease authority`);
  assert.match(source, /attempt_state = 'expired'[\s\S]+?raise exception '[^']*terminal attempt outcome binding conflict'/i, `${name} expired receipt rejects stale delayed finalization`);
}
assert.ok(openAiFinalizeSource.indexOf("attempt_state in ('committed', 'released', 'expired')") < openAiFinalizeSource.indexOf("v_slot.lease_token is distinct from p_openai_slot_lease_token"), "OpenAI terminal replay uses immutable receipt identity before mutable slot authority");
assert.match(openAiFinalizeSource, /coalesce\(p_actual_input_characters, v_attempt\.requested_input_characters\) is distinct from v_attempt\.committed_input_characters[\s\S]+?coalesce\(p_actual_cost_micros, v_attempt\.requested_cost_micros\) is distinct from v_attempt\.committed_cost_micros[\s\S]+?terminal attempt outcome binding conflict/i, "OpenAI terminal success replay parses exact committed character and cost binding");
assert.match(azureFinalizeSource, /coalesce\(p_actual_input_characters, v_attempt\.reserved_input_characters\) is distinct from v_attempt\.committed_input_characters[\s\S]+?terminal attempt outcome binding conflict/i, "Azure terminal success replay parses exact committed character binding");
assert.match(azureFinalizeSource, /p_outcome not in \('completed',\s*'uncertain_inflight',\s*'provider_not_reached',\s*'provider_reached_failed'\)/i, "Azure finalize accepts the approved uncertain and reached-failure outcomes");
assert.match(azureFinalizeSource, /p_outcome = 'uncertain_inflight'[\s\S]+?attempt_state = 'uncertain'[\s\S]+?expires_at = p_now \+ interval '120 seconds'[\s\S]+?lease_state = 'uncertain'/i, "Azure uncertain finalize retains a short-lived receipt and session lease");
const azureReclaimSource = functionSource(sql, "ct_paid_reclaim_azure_fallback", "ct_paid_reserve_poll_budget");
assert.doesNotMatch(azureReclaimSource, /ct_paid_commit_billing_period_characters/i, "Azure unknown TTL reclaim never commits user quota");
assert.match(azureReclaimSource, /attempt_state = 'expired'[\s\S]+?committed_input_characters = 0/i, "Azure unknown TTL reclaim preserves zero user committed characters");
assert.match(openAiReclaimSource, /ct_paid_settle_logical_attempt_after_provider_failure\(p_attempt_id, true, p_now\)/i, "OpenAI unknown reclaim invokes conservative logical release authority");
assert.match(azureReclaimSource, /ct_paid_settle_logical_attempt_after_provider_failure\(p_attempt_id, true, p_now\)/i, "Azure unknown reclaim invokes conservative logical release authority");
assert.match(openAiFinalizeSource, /from public\.comment_translator_paid_openai_rate_reservations[\s\S]+?for update[\s\S]+?reserved_requests = reserved_requests - v_rate\.request_count/i, "provider_not_reached RPM rollback remains parseable and row-locked");
assert.match(openAiFinalizeSource, /p_outcome not in \('completed',\s*'uncertain_inflight',\s*'provider_not_reached',\s*'provider_reached_failed'\)/i, "OpenAI finalize accepts the reached-provider failure outcome");
assert.match(openAiFinalizeSource, /p_outcome = 'provider_not_reached'[\s\S]+?p_provider_failure_class not in \('network', 'timeout', 'configuration', 'policy'\)[\s\S]+?OpenAI outcome and failure class binding conflict/i, "OpenAI finalize rejects reached-only classes on the not-reached release path");
assert.match(openAiFinalizeSource, /p_outcome = 'provider_reached_failed'[\s\S]+?committed_cost_micros = committed_cost_micros \+ v_attempt\.reserved_cost_micros[\s\S]+?reservation_state = 'completed'[\s\S]+?attempt_state = 'committed'[\s\S]+?provider_failure_class = p_provider_failure_class/i, "reached-provider failure conservatively commits cost and RPM while terminating the receipt");
const reachedOpenAiFailureSource = openAiFinalizeSource.slice(
  openAiFinalizeSource.indexOf("elsif p_outcome = 'provider_reached_failed'"),
  openAiFinalizeSource.indexOf("elsif p_outcome = 'provider_not_reached'")
);
assert.doesNotMatch(reachedOpenAiFailureSource, /reserved_requests = reserved_requests - v_rate\.request_count/i, "reached-provider failure never rolls back RPM");
const openAiReserveSource = functionSource(sql, "ct_paid_openai_attempt", "ct_paid_extend_openai_attempt");
assert.match(openAiReserveSource, /provider_kind = 'openai_attempt'[\s\S]+?v_receipt_count <> 1[\s\S]+?v_shared_attempt\.reserved_cost_micros <> 0[\s\S]+?v_shared_attempt\.attempt_state <> 'committed'[\s\S]+?provider_failure_class is distinct from 'invalid-response'[\s\S]+?committed_cost_micros <= 0[\s\S]+?OpenAI retry predecessor is not safe/i, "OpenAI parser permits only one committed invalid-response subset retry");
assert.doesNotMatch(openAiReserveSource, /attempt_state = 'released'[\s\S]{0,180}provider_failure_class in \('network', 'timeout'\)/i, "OpenAI parser excludes released network and timeout retries");
assert.match(openAiReserveSource, /v_slot\.slot_state <> 'released'[\s\S]+?v_prior_lease\.provider_attempt <> v_shared_attempt\.provider_attempt[\s\S]+?v_prior_lease\.lease_state = 'released'[\s\S]+?v_prior_lease\.lease_state in \('active', 'uncertain'\)[\s\S]+?v_prior_lease\.lease_until > p_now[\s\S]+?v_prior_rate\.reservation_state <> 'completed'/i, "OpenAI retry parser accepts the exact predecessor's live same-batch lease or the existing safe released path");
assert.match(openAiReserveSource, /p_input_characters > v_logical\.input_characters[\s\S]+?logical attempt input binding conflict/i, "OpenAI retry input may be a subset of the logical reservation");
for (const allocationMarker of ["insert into public.comment_translator_paid_openai_slots", "insert into public.comment_translator_paid_openai_minute_buckets", "reserved_input_characters = reserved_input_characters + p_input_characters", "reserved_cost_micros = reserved_cost_micros + p_estimated_cost_micros"]) {
  const retryRejectionIndex = openAiReserveSource.indexOf("OpenAI retry predecessor is not safe");
  assert.ok(retryRejectionIndex >= 0 && retryRejectionIndex < openAiReserveSource.indexOf(allocationMarker), `unsafe OpenAI retry rejection parses before ${allocationMarker}`);
}
const azureReserveSource = functionSource(sql, "ct_paid_azure_direct_fallback", "ct_paid_finalize_azure_fallback");
assert.match(azureReserveSource, /v_receipt_count = 0[\s\S]+?v_openai_circuit\.last_error_class not in \('network', 'timeout', 'rate-limit', 'server-error'\)[\s\S]+?OpenAI failure class does not permit direct Azure fallback/i, "direct Azure parser fails closed without an allowed current OpenAI circuit class");
assert.match(azureReserveSource, /provider_kind = 'openai_attempt'[\s\S]+?order by created_at desc, id desc[\s\S]+?limit 1[\s\S]+?for update/i, "Azure parser selects the latest OpenAI predecessor with a deterministic tie-break");
assert.doesNotMatch(azureReserveSource, /provider_attempt = v_lease\.provider_attempt/i, "Azure parser does not derive predecessor identity from the mutable session lease");
assert.match(azureReserveSource, /v_lease\.provider_attempt is distinct from v_shared_attempt\.provider_attempt[\s\S]+?v_lease\.lease_state = 'released'[\s\S]+?v_lease\.lease_state in \('active', 'uncertain'\)[\s\S]+?v_lease\.lease_until > p_now/i, "Azure parser requires exact predecessor lease identity and permits only live same-batch or safe released state");
assert.match(azureReserveSource, /set lease_state = 'active',[\s\S]+?provider_attempt = p_provider_attempt[\s\S]+?attempt_id = p_attempt_id/i, "Azure reservation transfers the mutable same-batch lease to its provider attempt");
assert.match(openAiFinalizeSource, /count\(\*\) filter \(where provider_kind = 'openai_attempt'\)[\s\S]+?p_provider_failure_class = 'invalid-response'[\s\S]+?v_openai_receipt_count = 1[\s\S]+?p_provider_failure_class in \('network', 'timeout', 'rate-limit', 'server-error'\)[\s\S]+?lease_state = 'active'[\s\S]+?p_now \+ interval '120 seconds'/i, "only the first invalid-response receipt preserves the OpenAI retry lease while fallback-eligible classes remain active");
assert.match(circuitFailureSource, /p_error_class in \('quota', 'configuration', 'policy'\)[\s\S]+?last_error_class = p_error_class[\s\S]+?return v_circuit\.circuit_state/i, "forbidden classes do not advance the provider circuit");
assert.match(openAiFinalizeSource, /p_provider_failure_class text[\s\S]+?provider_failure_class = p_provider_failure_class/i, "OpenAI finalize parses and persists the sanitized receipt failure class");
assert.match(azureReserveSource, /v_shared_attempt\.provider_failure_class is null[\s\S]+?v_shared_attempt\.provider_failure_class not in \('network', 'timeout', 'rate-limit', 'server-error'\)[\s\S]+?v_shared_attempt\.attempt_state = 'committed'[\s\S]+?v_shared_attempt\.reserved_cost_micros <> 0[\s\S]+?v_openai_rate\.reservation_state <> 'completed'/i, "Azure predecessor parsing accepts only a conservatively committed reached-provider failure with an allowed exact class");
const cleanupAttemptLedgersSource = functionSource(sql, "ct_paid_cleanup_attempt_ledgers", "ct_paid_close_billing_period");
assert.match(cleanupAttemptLedgersSource, /limit p_limit[\s\S]+?for update of logical_attempt skip locked/i, "attempt-ledger cleanup parser sees bounded skip-locked selection");
assert.match(cleanupAttemptLedgersSource, /logical_state in \('committed', 'released'\)[\s\S]+?attempt_state not in \('committed', 'released', 'expired'\)/i, "attempt-ledger cleanup parser retains every nonterminal row");
const commitCharactersSource = functionSource(sql, "ct_paid_commit_billing_period_characters", "ct_paid_release_billing_period_characters");
const releaseCharactersSource = functionSource(sql, "ct_paid_release_billing_period_characters", "ct_paid_settle_logical_attempt_after_provider_failure");
const providerFailureSettlementSource = functionSource(sql, "ct_paid_settle_logical_attempt_after_provider_failure", "ct_paid_abandon_logical_attempt");
const abandonLogicalSource = functionSource(sql, "ct_paid_abandon_logical_attempt", "ct_paid_cleanup_attempt_ledgers");
assert.match(providerFailureSettlementSource, /attempt_state = 'committed' and provider_failure_class is null/i, "logical failure settlement excludes reached-provider cost commitments from successful character commits");
assert.match(abandonLogicalSource, /attempt_state = 'committed'[\s\S]+?provider_failure_class is not null[\s\S]+?committed_input_characters = 0/i, "explicit no-fallback abandonment accepts a reached-provider terminal failure");
assert.match(abandonLogicalSource, /attempt_state in \('reserved', 'uncertain', 'expired'\)[\s\S]+?update public\.comment_translator_paid_session_leases[\s\S]+?lease_state = 'released'[\s\S]+?where attempt_id = p_attempt_id[\s\S]+?lease_state in \('active', 'uncertain'\)/i, "explicit abandonment releases only its own safe active session lease");
assert.match(commitCharactersSource, /v_commit_characters > v_logical\.input_characters[\s\S]+?reserved_input_characters = reserved_input_characters - v_logical\.input_characters[\s\S]+?reserved_input_characters >= v_logical\.input_characters/i, "subset provider commit consumes the full logical reservation with a nonnegative guard");
assert.match(commitCharactersSource, /set reserved_input_characters = 0[\s\S]+?where attempt_id = p_attempt_id(?![\s\S]{0,120}provider_attempt = p_provider_attempt)/i, "logical commit zeros reserved characters on every sibling receipt");
assert.match(releaseCharactersSource, /attempt_state in \('reserved', 'uncertain', 'expired'\)[\s\S]+?set reserved_input_characters = 0[\s\S]+?where attempt_id = p_attempt_id[\s\S]+?reserved_input_characters = reserved_input_characters - v_logical\.input_characters[\s\S]+?reserved_input_characters >= v_logical\.input_characters/i, "subset provider release retains an active sibling or consumes the full logical reservation once");
assert.match(azureReserveSource, /v_receipt_count = 0[\s\S]+?v_openai_circuit\.circuit_state <> 'degraded'[\s\S]+?degraded OpenAI is required for direct Azure/i, "Azure accepts a no-OpenAI direct path only while OpenAI is degraded");
assert.match(azureReserveSource, /p_input_characters > v_logical\.input_characters[\s\S]+?logical attempt input binding conflict/i, "Azure predecessor input may be a positive subset of the logical reservation");
assert.doesNotMatch(azureReserveSource, /v_shared_attempt\.(?:requested_input_characters|reserved_input_characters)\s*<>\s*p_input_characters/i, "Azure subset fallback does not require equality to a full predecessor receipt");
assert.match(azureReserveSource, /v_logical\.billing_period_usage_id is distinct from v_shared_attempt\.billing_period_usage_id[\s\S]+?logical attempt billing period binding conflict/i, "Azure subset fallback preserves the logical billing-period binding");
assert.match(azureReserveSource, /attempt_state = 'uncertain'[\s\S]+?slot_state <> 'uncertain'[\s\S]+?reservation_state <> 'uncertain'[\s\S]+?lease_state <> 'uncertain'[\s\S]+?uncertain OpenAI resources are not retained/i, "Azure accepts uncertain OpenAI only while its resources and current lease state remain retained");
assert.match(azureReserveSource, /attempt_state = 'released'[\s\S]+?slot_state <> 'released'[\s\S]+?reservation_state <> 'released'[\s\S]+?OpenAI resources are not released/i, "Azure accepts released OpenAI only after safe resource release");
for (const allocationMarker of ["insert into public.comment_translator_paid_azure_fallback_buckets", "reserved_paid_characters = reserved_paid_characters + p_input_characters"]) {
  for (const rejection of ["degraded OpenAI is required for direct Azure", "uncertain OpenAI resources are not retained", "OpenAI resources are not released"]) {
    assert.ok(azureReserveSource.indexOf(rejection) < azureReserveSource.indexOf(allocationMarker), `${rejection} parses before ${allocationMarker}`);
  }
}
const abandonSource = functionSource(sql, "ct_paid_abandon_logical_attempt", "ct_paid_close_billing_period");
assert.match(abandonSource, /pg_advisory_xact_lock\(47290102\)[\s\S]+?order by provider_attempt[\s\S]+?for update/i, "abandonment lock ordering remains parser-visible");
assert.match(abandonSource, /attempt_state in \('reserved', 'uncertain', 'expired'\)[\s\S]+?reserved_input_characters >= v_logical\.input_characters/i, "abandonment rejects unsafe siblings before its nonnegative release");
const pollBudgetSource = functionSource(sql, "ct_paid_reserve_poll_budget", "ct_paid_record_consent");
assert.match(pollBudgetSource, /coalesce\(sum\(reserved_polls\),\s*0\)[\s\S]+?720 - v_session_reserved_polls/i, "cross-day poll cap remains inside the poll reservation RPC");
assert.match(pollBudgetSource, /v_session_reserved_polls = 0[\s\S]+?floor\(v_bucket\.daily_budget \* 0\.90\)[\s\S]+?new Paid poll session threshold is exhausted/i, "new poll sessions are atomically gated at ninety percent of the daily budget");
assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.%s\s+to\s+service_role/i, "trusted RPC privilege loop is present");
assert.match(
  sql,
  /'ct_paid_settle_logical_attempt_after_provider_failure\(text,boolean,timestamptz\)'/i,
  "logical provider-failure settlement helper has an exact service-role privilege signature"
);
assert.match(sql, /'ct_paid_abandon_logical_attempt\(text,text,timestamptz\)'/i, "abandonment has an exact service-role privilege signature");
for (const signature of [
  "ct_paid_begin_checkout(uuid,text,timestamptz)",
  "ct_paid_bind_checkout_session(uuid,uuid,uuid,uuid,text,text,timestamptz,boolean,text,timestamptz)",
  "ct_paid_mark_checkout_expire_required(uuid,uuid,uuid,uuid,text,text,timestamptz,text,timestamptz,timestamptz)",
  "ct_paid_expire_checkout_hold(uuid,uuid,uuid,text,timestamptz,uuid,timestamptz)",
  "ct_paid_claim_entitlement_projection(uuid,uuid,timestamptz)",
  "ct_paid_bind_first_subscription(uuid,uuid,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,text,text,uuid,uuid,timestamptz)",
  "ct_paid_project_entitlement(uuid,uuid,uuid,uuid,text,text,text,timestamptz,timestamptz,boolean,text,uuid,uuid,timestamptz,text,text)",
  "ct_paid_disable_provider_circuit(text,timestamptz)",
  "ct_paid_record_provider_circuit_failure(text,text,timestamptz)",
  "ct_paid_probe_provider_circuit(text,timestamptz)",
  "ct_paid_record_provider_circuit_success(text,text,timestamptz)",
  "ct_paid_record_provider_hourly_detail(text,text,timestamptz,uuid,text,timestamptz,integer,integer,integer,bigint,bigint,bigint,bigint,bigint,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,timestamptz)",
  "ct_paid_upsert_session_summary(uuid,text,timestamptz,timestamptz,text,integer,integer,bigint,bigint,timestamptz)"
]) {
  assert.ok(sql.includes(`'${signature}'`), `exact service-role privilege signature is present: ${signature}`);
}
for (const constraint of [
  "comment_translator_paid_lifecycles_customer_owner_fk",
  "comment_translator_paid_checkout_holds_lifecycle_owner_fk",
  "ct_paid_checkout_session_lifecycle_customer_owner_fk",
  "ct_paid_checkout_session_customer_owner_stripe_fk",
  "ct_paid_checkout_session_hold_owner_fk",
  "comment_translator_paid_subscription_lifecycle_owner_fk",
  "ct_paid_subscription_lifecycle_customer_owner_fk",
  "ct_paid_subscription_customer_owner_stripe_fk",
  "ct_paid_entitlement_lifecycle_customer_owner_fk",
  "ct_paid_entitlement_subscription_lifecycle_customer_owner_fk"
]) {
  assert.match(sql, new RegExp(`constraint ${constraint} foreign key`, "i"), `${constraint} remains parser-visible`);
}
assert.match(sql, /constraint comment_translator_paid_customers_id_owner_stripe_key unique \(id, owner_user_id, stripe_customer_id\)/i, "Customer owner and Stripe identity composite key remains parser-visible");
const holdGuardSource = functionSourceByTerminator(sql, "comment_translator_paid_checkout_hold_binding_guard");
for (const immutableField of ["id", "lifecycle_id", "owner_user_id", "idempotency_key", "checkout_expires_at_target", "created_at"]) {
  assert.match(holdGuardSource, new RegExp(`old\\.${immutableField} is distinct from new\\.${immutableField}`, "i"), `Checkout hold ${immutableField} immutability remains parser-visible`);
}
assert.match(sql, /before update or delete on public\.comment_translator_paid_checkout_holds/i, "Checkout hold update/delete guard remains parser-visible");
const lifecycleGuardSource = functionSourceByTerminator(sql, "comment_translator_paid_lifecycle_binding_guard");
for (const immutableField of ["id", "owner_user_id", "customer_binding_id", "created_at"]) {
  assert.match(lifecycleGuardSource, new RegExp(`old\\.${immutableField} is distinct from new\\.${immutableField}`, "i"), `lifecycle ${immutableField} immutability remains parser-visible`);
}
assert.match(sql, /comment_translator_paid_external_id_tombstones[\s\S]+?external_id_kind[\s\S]+?external_id[\s\S]+?created_at/i, "tombstone schema stores only kind, external ID, and creation time");
assert.match(sql, /comment_translator_paid_external_id_tombstone_guard[\s\S]+?insert into public\.comment_translator_paid_external_id_tombstones[\s\S]+?on conflict \(external_id_kind, external_id\) do nothing/i, "cascade tombstone trigger remains parser-visible");
assert.match(sql, /comment_translator_paid_external_id_reuse_guard[\s\S]+?external billing identity was previously deleted/i, "tombstoned external ID reuse rejection remains parser-visible");

console.log("comment translator Paid Core v1 migration parser contract checks passed");

function scanSql(source) {
  let parenthesesDepth = 0;
  let singleQuote = false;
  let blockComment = false;
  let dollarTag = null;
  let unterminatedDollarQuote = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (dollarTag) {
      if (source.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (singleQuote) {
      if (character === "'" && next === "'") {
        index += 1;
      } else if (character === "'") {
        singleQuote = false;
      }
      continue;
    }
    if (character === "-" && next === "-") {
      index = source.indexOf("\n", index + 2);
      if (index === -1) break;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'") {
      singleQuote = true;
      continue;
    }
    if (character === "$" ) {
      const tag = source.slice(index).match(/^\$[A-Za-z_0-9]*\$/)?.[0];
      if (tag) {
        dollarTag = tag;
        index += tag.length - 1;
        continue;
      }
    }
    if (character === "(") parenthesesDepth += 1;
    if (character === ")") {
      parenthesesDepth -= 1;
      assert.ok(parenthesesDepth >= 0, `migration has no unmatched closing parenthesis near offset ${index}`);
    }
  }
  if (dollarTag) unterminatedDollarQuote = dollarTag;
  return { parenthesesDepth, unterminatedDollarQuote, unterminatedString: singleQuote };
}

function functionSource(source, functionName, nextFunctionName) {
  const start = source.indexOf(`create or replace function public.${functionName}`);
  const end = source.indexOf(`create or replace function public.${nextFunctionName}`, start + 1);
  assert.ok(start >= 0 && end > start, `function block is bounded: ${functionName}`);
  return source.slice(start, end);
}

function functionSourceByTerminator(source, functionName) {
  const start = source.indexOf(`create or replace function public.${functionName}`);
  assert.ok(start >= 0, `function block starts: ${functionName}`);
  const end = source.indexOf("\n$$;", start);
  assert.ok(end > start, `function block terminates: ${functionName}`);
  return source.slice(start, end + 4);
}

function readParenthesizedBody(source, openingOffset) {
  let depth = 0;
  let singleQuote = false;
  for (let index = openingOffset; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (singleQuote) {
      if (character === "'" && next === "'") index += 1;
      else if (character === "'") singleQuote = false;
      continue;
    }
    if (character === "'") {
      singleQuote = true;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(openingOffset + 1, index);
    }
  }
  throw new Error("table declaration has no matching closing parenthesis");
}

function topLevelColumnNames(body) {
  const entries = [];
  let entryStart = 0;
  let depth = 0;
  let quote = false;
  for (let index = 0; index <= body.length; index += 1) {
    const character = body[index];
    const next = body[index + 1];
    if (quote) {
      if (character === "'" && next === "'") index += 1;
      else if (character === "'") quote = false;
      continue;
    }
    if (character === "'") {
      quote = true;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if ((character === "," && depth === 0) || index === body.length) {
      entries.push(body.slice(entryStart, index).trim());
      entryStart = index + 1;
    }
  }
  return entries
    .filter((entry) => entry.length > 0)
    .filter((entry) => !/^(?:constraint|primary\s+key|unique|check|foreign\s+key)\b/i.test(entry))
    .map((entry) => entry.match(/^([a-z_][a-z0-9_]*)\b/i)?.[1]?.toLowerCase())
    .filter(Boolean);
}
