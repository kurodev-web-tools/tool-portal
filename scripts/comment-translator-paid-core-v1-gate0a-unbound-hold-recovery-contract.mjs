import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const migrationPath = "supabase/migrations/20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery.sql";
const migration = read(migrationPath);
const schedulePrivilegeRepairMigration = read("supabase/migrations/20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair.sql");
const scheduleFunctionGrants = schedulePrivilegeRepairMigration.match(/grant\s+(?:all(?:\s+privileges)?|execute)\s+on\s+(?:function|routine)\s+public\.ct_paid_schedule_unbound_checkout_recovery\(\)[\s\S]*?;/gi) ?? [];
const scheduleSchemaGrants = schedulePrivilegeRepairMigration.match(/grant\s+(?:all(?:\s+privileges)?|execute)\s+on\s+all\s+(?:functions|routines)\s+in\s+schema\s+public[\s\S]*?;/gi) ?? [];
const reconciler = read("lib/comment-translator-paid-control-plane-reconciler.ts");
const entitlementStore = read("lib/comment-translator-paid-entitlement-store.ts");
const retention = read("lib/comment-translator-paid-retention.ts");

function functionSource(source, functionName) {
  const start = source.indexOf(`function public.${functionName}`);
  assert.notEqual(start, -1, `${functionName} exists in the additive migration`);
  const end = source.indexOf("$$;", start);
  assert.notEqual(end, -1, `${functionName} has a bounded PL/pgSQL body`);
  return source.slice(start, end + 3);
}

const scheduleSource = functionSource(migration, "ct_paid_schedule_unbound_checkout_recovery");
const terminalizeSource = functionSource(migration, "ct_paid_terminalize_unbound_checkout_hold");

const shouldPullForward = ({ operation, oldWorkKind, nextReconcileAt, now, newWorkKind, hasCheckoutBinding, hasSubscriptionBinding }) => {
  const entersUnboundRecovery = operation === "INSERT" || oldWorkKind !== "unbound-checkout-session";
  return entersUnboundRecovery
    && !hasCheckoutBinding
    && !hasSubscriptionBinding
    && (nextReconcileAt === null || nextReconcileAt > now || newWorkKind !== "unbound-checkout-session");
};

assert.match(scheduleSource, /statement_timestamp\(\)/i, "unbound recovery scheduling uses the DB statement clock");
assert.match(scheduleSource, /security definer\s+set search_path = pg_catalog, public/i, "unbound recovery scheduling has a fixed-search-path SECURITY DEFINER boundary");
assert.match(scheduleSource, /next_reconcile_at\s*>\s*v_now/i, "only a future reconciliation target is pulled forward");
assert.match(scheduleSource, /set next_reconcile_at\s*=\s*case[\s\S]+?then v_now/i, "future unbound work is moved to the immediate claim boundary");
assert.match(scheduleSource, /if\s+tg_op\s*=\s*'insert'\s+then[\s\S]+?elsif\s+old\.reconcile_work_kind\s+is distinct from 'unbound-checkout-session'/i, "pull-forward is limited to creation or transition into unbound recovery");
assert.match(scheduleSource, /not exists\s*\([\s\S]+?comment_translator_paid_checkout_session_bindings/i, "schedule guard requires no Checkout Session binding");
assert.match(scheduleSource, /not exists\s*\([\s\S]+?comment_translator_paid_subscription_bindings/i, "schedule guard requires no Subscription binding");
assert.match(migration, /create trigger comment_translator_paid_unbound_checkout_recovery_schedule[\s\S]+?after insert or update/i, "future unbound lifecycles receive an additive schedule trigger");
const backfillIndex = migration.indexOf("-- Existing unbound rows are brought to the same immediate claim boundary");
const triggerIndex = migration.indexOf("create trigger comment_translator_paid_unbound_checkout_recovery_schedule");
assert.ok(backfillIndex >= 0 && triggerIndex > backfillIndex, "existing-row backfill runs before the pull-forward trigger is enabled");
const now = 1_000;
assert.equal(
  shouldPullForward({ operation: "UPDATE", oldWorkKind: "unbound-checkout-session", nextReconcileAt: now + 300, now, newWorkKind: "unbound-checkout-session", hasCheckoutBinding: false, hasSubscriptionBinding: false }),
  false,
  "retry-scheduled unbound work retains its future backoff target"
);
assert.equal(
  shouldPullForward({ operation: "INSERT", oldWorkKind: null, nextReconcileAt: now + 1_860_000, now, newWorkKind: "unbound-checkout-session", hasCheckoutBinding: false, hasSubscriptionBinding: false }),
  true,
  "new unbound work is pulled to the immediate claim boundary"
);
assert.equal(
  shouldPullForward({ operation: "UPDATE", oldWorkKind: "checkout-expiry", nextReconcileAt: now + 1_860_000, now, newWorkKind: "unbound-checkout-session", hasCheckoutBinding: false, hasSubscriptionBinding: false }),
  true,
  "a lifecycle transitioning into unbound recovery is pulled forward"
);

assert.match(terminalizeSource, /p_reconcile_lease_token\s+uuid/i, "expired unbound terminalization requires an opaque reconcile lease token");
assert.match(terminalizeSource, /(?:p_now|v_now)[^\n]*:=\s*statement_timestamp\(\)/i, "expired unbound terminalization ignores caller time and uses the DB clock");
assert.match(terminalizeSource, /pg_advisory_xact_lock\(47290101\)/i, "terminalization shares the existing lifecycle mutation lock");
assert.match(terminalizeSource, /from public\.comment_translator_paid_billing_lifecycles[\s\S]+?for update/i, "terminalization locks the lifecycle");
assert.match(terminalizeSource, /from public\.comment_translator_paid_checkout_holds[\s\S]+?for update/i, "terminalization locks the Checkout hold");
assert.match(terminalizeSource, /from public\.comment_translator_paid_capacity_reservations[\s\S]+?for update/i, "terminalization locks the capacity reservation");
assert.match(terminalizeSource, /exists\s*\([\s\S]+?comment_translator_paid_checkout_session_bindings[\s\S]+?raise exception/i, "terminalization fails closed when a Checkout Session is bound");
assert.match(terminalizeSource, /exists\s*\([\s\S]+?comment_translator_paid_subscription_bindings[\s\S]+?raise exception/i, "terminalization fails closed when a Subscription is bound");
assert.match(terminalizeSource, /from public\.comment_translator_paid_entitlements[\s\S]+?for update/i, "terminalization locks the entitlement projection before release");
assert.match(terminalizeSource, /v_entitlement\.id\s+is not null[\s\S]+?raise exception/i, "terminalization requires entitlement absence");
assert.match(terminalizeSource, /checkout_expires_at_target\s*>\s*(?:p_now|v_now)[\s\S]+?return false/i, "future holds are left intact for recovery");
assert.match(terminalizeSource, /reconcile_lease_token\s+is distinct from p_reconcile_lease_token[\s\S]+?reconcile_lease_until\s*<=\s*(?:p_now|v_now)/i, "terminalization rejects stale or mismatched leases");
assert.match(terminalizeSource, /reconcile_work_kind\s+is distinct from 'unbound-checkout-session'/i, "terminalization rejects a missing or incompatible work kind");
assert.match(terminalizeSource, /not isfinite\(v_lifecycle\.reconcile_lease_until\)[\s\S]+?not isfinite\(v_hold\.checkout_expires_at_target\)/i, "terminalization rejects non-finite lease and expiry authority");
assert.match(terminalizeSource, /hold_state\s*=\s*'released'[\s\S]+?is_terminal\s*=\s*true[\s\S]+?reservation_state\s*=\s*'released'/i, "terminalization atomically releases hold/capacity and closes lifecycle");
assert.match(terminalizeSource, /v_capacity\.lifecycle_stage\s*<>\s*'checkout_hold'/i, "terminalization requires the original Checkout capacity stage");
assert.doesNotMatch(terminalizeSource, /reconcile_lease_(?:until|token)\s*=\s*null/i, "terminalization leaves the claimed lease for the existing atomic reconciler finalizer");
assert.match(migration, /revoke all on function public\.ct_paid_terminalize_unbound_checkout_hold[\s\S]+?grant execute on function public\.ct_paid_terminalize_unbound_checkout_hold[\s\S]+?to service_role/i, "new RPC keeps the service-role-only execute boundary");
assert.doesNotMatch(migration, /grant\s+select\s+on\s+table\s+public\.comment_translator_paid_entitlements\s+to\s+service_role/i, "new migration does not add a direct entitlement SELECT grant");
assert.match(schedulePrivilegeRepairMigration, /revoke all on function public\.ct_paid_schedule_unbound_checkout_recovery\(\)[\s\S]+?from public, anon, authenticated/i, "schedule trigger function revokes default public execute privilege");
assert.match(schedulePrivilegeRepairMigration, /grant execute on function public\.ct_paid_schedule_unbound_checkout_recovery\(\)[\s\S]+?to service_role/i, "schedule trigger function keeps a service-role-only execute boundary");
assert.deepEqual(
  scheduleFunctionGrants.map((statement) => statement.replace(/\s+/g, " ").trim()),
  ["grant execute on function public.ct_paid_schedule_unbound_checkout_recovery() to service_role;"],
  "schedule trigger function has exactly one service_role-only EXECUTE grant"
);
assert.deepEqual(scheduleSchemaGrants, [], "schedule privilege repair does not use a broad public-schema function grant");
assert.doesNotMatch(schedulePrivilegeRepairMigration, /grant\s+select\s+on\s+table\s+public\.comment_translator_paid_entitlements\s+to\s+service_role/i, "privilege repair does not add a direct entitlement SELECT grant");

assert.match(entitlementStore, /terminalizeUnboundCheckoutHold:/i, "trusted store exposes the unbound terminalization operation");
assert.match(entitlementStore, /ct_paid_terminalize_unbound_checkout_hold/i, "trusted store calls only the additive terminalization RPC");
assert.match(reconciler, /terminalizeUnboundCheckoutHold/i, "control-plane reconciliation uses the atomic unbound terminalization operation");
assert.match(reconciler, /terminalizeUnboundCheckoutHold[\s\S]+?recoverUnboundCheckoutSession/i, "terminalization is attempted before any future Checkout recovery");
assert.match(reconciler, /30\s*\*\s*60\s*\*\s*1000/i, "future recovery preserves Stripe's thirty-minute minimum");
assert.match(retention, /schedule:\s*["']\*\/5 \* \* \* \*["']/i, "Task 9 keeps the existing five-minute scheduler contract");

console.log("comment translator paid core v1 Gate 0-A unbound hold recovery contract checks passed");
