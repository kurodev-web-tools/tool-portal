import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase", "migrations");
const repairSuffix = "_comment_translator_paid_checkout_expiry_finalize_lease.sql";
const repairMigrations = fs.readdirSync(migrationsDir).filter((name) => name.endsWith(repairSuffix));

assert.equal(repairMigrations.length, 1, "exactly one additive Checkout expiry finalize-lease migration exists");

const repairMigration = fs.readFileSync(path.join(migrationsDir, repairMigrations[0]), "utf8");
const functionStart = repairMigration.indexOf("create or replace function public.ct_paid_expire_checkout_hold(");
const functionEnd = repairMigration.indexOf("revoke all on function public.ct_paid_expire_checkout_hold", functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart, "repair migration redefines only the existing Checkout expiry RPC surface");
const expireSource = repairMigration.slice(functionStart, functionEnd);

assert.match(
  expireSource,
  /p_lifecycle_id uuid,[\s\S]+?p_owner_user_id uuid,[\s\S]+?p_hold_id uuid,[\s\S]+?p_stripe_session_status text,[\s\S]+?p_stripe_session_checked_at timestamptz,[\s\S]+?p_reconcile_lease_token uuid default null,[\s\S]+?p_now timestamptz default now\(\)[\s\S]+?returns boolean/i,
  "repair keeps the existing RPC signature"
);
assert.match(expireSource, /p_owner_user_id\s+is\s+null[\s\S]+?raise exception/i, "repair explicitly rejects null owner authority");
assert.match(expireSource, /p_stripe_session_status\s+is\s+distinct\s+from\s+'expired'/i, "repair requires current Stripe expired status");
assert.match(expireSource, /p_stripe_session_checked_at\s*<\s*greatest\(v_session\.stripe_expires_at,\s*v_hold\.checkout_expires_at_target\)/i, "repair keeps the max Stripe/hold checked-at guard");
assert.match(expireSource, /v_lifecycle\.owner_user_id\s*<>\s*p_owner_user_id[\s\S]+?v_hold\.owner_user_id\s*<>\s*p_owner_user_id/i, "repair keeps owner and hold identity checks");
assert.match(expireSource, /subscription binding prevents checkout hold release/i, "repair keeps the Subscription boundary");
assert.match(expireSource, /nonterminal entitlement prevents checkout hold release[\s\S]+?entitlement binding prevents checkout hold release/i, "repair keeps entitlement boundaries");
assert.match(expireSource, /v_capacity\.reservation_state\s+not\s+in\s*\('held',\s*'consuming'\)/i, "repair keeps the capacity boundary");
assert.match(
  expireSource,
  /reconcile_lease_until\s*=\s*case\s+when\s+p_reconcile_lease_token\s+is\s+null\s+then\s+null\s+else\s+reconcile_lease_until\s+end/i,
  "direct expiry clears lease-until while reconciler expiry preserves it"
);
assert.match(
  expireSource,
  /reconcile_lease_token\s*=\s*case\s+when\s+p_reconcile_lease_token\s+is\s+null\s+then\s+null\s+else\s+reconcile_lease_token\s+end/i,
  "direct expiry clears lease-token while reconciler expiry preserves it"
);
assert.match(expireSource, /set lifecycle_state\s*=\s*'incomplete_expired',[\s\S]+?is_terminal\s*=\s*true/i, "repair keeps atomic terminal lifecycle projection");
assert.match(expireSource, /set hold_state\s*=\s*'released'[\s\S]+?set reservation_state\s*=\s*'released'/i, "repair keeps atomic hold and capacity release");
assert.match(repairMigration, /revoke all on function public\.ct_paid_expire_checkout_hold\([\s\S]+?from public, anon, authenticated/i, "repair revokes public-facing execute privileges");
assert.match(repairMigration, /grant execute on function public\.ct_paid_expire_checkout_hold\([\s\S]+?to service_role/i, "repair grants execute only to service_role");
assert.doesNotMatch(repairMigration, /grant\s+select\s+on\s+table/i, "repair adds no direct table grants");

for (const [historicalPath, expectedBlob] of [
  ["supabase/migrations/20260812120000_comment_translator_paid_core_v1.sql", "c9b1e7b93b858a2ad941893dfadc080000345ba8"],
  ["supabase/migrations/20260814110000_comment_translator_paid_task9_retention_observability.sql", "7a8adddcb2f2f007169ee9699e0c04c69dcc5947"]
]) {
  const committedBlob = execFileSync("git", ["rev-parse", `HEAD:${historicalPath}`], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(committedBlob, expectedBlob, `${historicalPath} committed blob remains unchanged`);
  let dirty = false;
  try {
    execFileSync("git", ["diff", "--quiet", "--", historicalPath], { cwd: root, stdio: "ignore" });
  } catch {
    dirty = true;
  }
  assert.equal(dirty, false, `${historicalPath} working-tree bytes remain unchanged`);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export default {};#server-only" };
    if (specifier === "@supabase/supabase-js") {
      return { shortCircuit: true, url: "data:text/javascript,export const createClient=()=>({rpc:async()=>({data:null,error:null})});export default {};#supabase" };
    }
    if (specifier.startsWith("@/")) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.join(root, `${specifier.slice(2)}${extension}`);
        if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = new URL(`${specifier}${extension}`, context.parentURL);
        if (fs.existsSync(candidate)) return { shortCircuit: true, url: candidate.href };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts") || url.endsWith(".tsx")) {
      return {
        format: "module",
        shortCircuit: true,
        source: stripTypeScriptTypes(fs.readFileSync(new URL(url), "utf8"), { mode: "transform", sourceMap: false })
      };
    }
    return nextLoad(url, context);
  }
});

const reconciler = await import(pathToFileURL(path.join(root, "lib/comment-translator-paid-control-plane-reconciler.ts")).href);
const lease = { token: "opaque-expiry-lease", active: true, terminal: false };
let finalizeCount = 0;
let retryCount = 0;
let failureSafetyCount = 0;

const run = await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() {
      return [{ lifecycleId: "fixture-lifecycle", reconcileLeaseToken: lease.token, reconcileLeaseUntilIso: "2026-08-27T02:02:00.000Z", workKind: "checkout-expiry" }];
    },
    async assertLeaseActive({ reconcileLeaseToken }) {
      return lease.active && reconcileLeaseToken === lease.token;
    },
    async finalize({ reconcileLeaseToken }) {
      assert.equal(lease.terminal, true, "terminal expiry action completes before common finalization");
      if (!lease.active || reconcileLeaseToken !== lease.token) throw new Error("stale reconcile lease token is not valid for update");
      lease.active = false;
      finalizeCount += 1;
      return true;
    },
    async retry() {
      retryCount += 1;
      return 60;
    },
    async markFailureSafe() {
      failureSafetyCount += 1;
      return true;
    }
  },
  resolveWorkItem: async () => ({ lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" }),
  actions: reconciler.createCommentTranslatorPaidControlPlaneActionImplementation({
    async expireCheckoutSession({ opaqueLeaseContext }) {
      assert.equal(opaqueLeaseContext.reconcileLeaseToken, lease.token);
      assert.equal(lease.active, true, "expiry action receives the active claimed lease");
      lease.terminal = true;
    },
    async reconcileUnboundCheckoutSession() { throw new Error("not used"); },
    async reconcilePaymentFailureAfterSevenDays() { throw new Error("not used"); },
    async applyCancelPending() { throw new Error("not used"); },
    async reconcileRefund() { throw new Error("not used"); },
    async reconcileDispute() { throw new Error("not used"); },
    async reconcilePaidUnentitled() { throw new Error("not used"); },
    async rollOverBillingPeriod() { throw new Error("not used"); },
    async rollOverUtcMonthCost() { throw new Error("not used"); }
  }),
  clock: () => "2026-08-27T02:00:00.000Z"
}).run({ nowIso: "2026-08-27T02:00:00.000Z" });

assert.equal(run.status, "success", "terminal expiry plus common finalization reports success");
assert.equal(run.completedCount, 1);
assert.equal(run.staleCount, 0);
assert.equal(run.retryCount, 0);
assert.deepEqual(run.errorClassCounts, {});
assert.equal(finalizeCount, 1, "common finalizer consumes the preserved lease once");
assert.equal(retryCount, 0, "successful expiry does not schedule retry");
assert.equal(failureSafetyCount, 0, "successful expiry does not enter failure safety");
assert.equal(lease.active, false, "common finalizer clears the lease");

console.log("comment translator Paid Core v1 Gate 0-A Checkout expiry finalize-lease contract checks passed");
