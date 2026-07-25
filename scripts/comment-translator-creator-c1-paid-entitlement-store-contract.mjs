import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const storePath = "lib/comment-translator-paid-entitlement-store.ts";
const testStorePath = "lib/comment-translator-paid-entitlement-test-store.ts";
const billingPath = "lib/comment-translator-billing-runtime.ts";
const webhookRoutePath = "app/api/comment-translator/billing/webhook/route.ts";
const migrationPath = "supabase/migrations/20260722000000_comment_translator_paid_entitlements.sql";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

for (const requiredPath of [storePath, testStorePath, billingPath, webhookRoutePath, migrationPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `C1 required file exists: ${requiredPath}`);
}

const storeSource = read(storePath);
const billingSource = read(billingPath);
const webhookRouteSource = read(webhookRoutePath);
const migrationSource = read(migrationPath);

assert.match(storeSource, /^import "server-only";/m, "paid entitlement store is server-only");
assert.match(storeSource, /comment_translator_paid_entitlements/, "store owns the durable paid entitlement table");
assert.match(storeSource, /signed-stripe-webhook/, "store accepts signed billing evidence only");
assert.match(storeSource, /trusted-server-service-role-only/, "store access is trusted-server only");
assert.match(storeSource, /safe-free-or-paid-inactive/, "store records safe degradation");
assert.match(storeSource, /apply_comment_translator_paid_entitlement_evidence/, "store uses the atomic stale-evidence guard");

assert.doesNotMatch(billingSource, /paidEntitlementsByBillingUser|new Map<CommentTranslatorBillingUserReference/, "billing runtime has no authoritative in-memory paid state");
assert.match(billingSource, /createTrustedCommentTranslatorPaidEntitlementSupabaseStore/, "billing reads and writes through the durable store boundary");
assert.match(billingSource, /unexpected-paid-price/, "signed subscription evidence must match the configured paid price");
assert.match(webhookRouteSource, /readCommentTranslatorStripeWebhookResult/, "webhook remains behind signature verification");

for (const fragment of [
  "create table if not exists public.comment_translator_paid_entitlements",
  "enable row level security",
  "revoke all on table public.comment_translator_paid_entitlements from anon",
  "revoke all on table public.comment_translator_paid_entitlements from authenticated",
  "grant all on table public.comment_translator_paid_entitlements to service_role",
  "evidence_source = 'signed-stripe-webhook'",
  "billing_state in ('paid-active', 'paid-inactive')",
  "evidence_event_reference_id text not null",
  "evidence_created_at timestamptz not null",
  "create or replace function public.apply_comment_translator_paid_entitlement_evidence",
  "excluded.evidence_created_at > comment_translator_paid_entitlements.evidence_created_at"
]) {
  assert.match(migrationSource, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    return nextResolve(specifier, context);
  }
});

const storeModule = await import("../lib/comment-translator-paid-entitlement-store.ts");
const testStoreModule = await import("../lib/comment-translator-paid-entitlement-test-store.ts");
const billingModule = await import("../lib/comment-translator-billing-runtime.ts");

process.env.COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS = "enabled-reviewed";
process.env.COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES = [
  "server-only-owner-value",
  "different-server-only-owner"
].map((ownerUserId) => createHash("sha256").update(ownerUserId).digest("hex")).join(",");

const webhookEnv = {
  STRIPE_WEBHOOK_SECRET: "present-for-test-only",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_creator_paid",
  COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "enabled-reviewed"
};

const billingUserReferenceId = billingModule.createCommentTranslatorBillingUserReference({
  status: "authorized",
  ownerUserId: "server-only-owner-value"
});
assert.ok(billingUserReferenceId);

let observedRpcName = null;
const atomicStore = storeModule.createCommentTranslatorPaidEntitlementSupabaseStore({
  nowIso: () => new Date(5_000).toISOString(),
  supabase: {
    from() {
      throw new Error("read query is not used by this write check");
    },
    async rpc(functionName) {
      observedRpcName = functionName;
      return { data: false, error: null };
    }
  }
});
const atomicStaleResult = await atomicStore.persistVerifiedBillingEvidence({
  evidenceSource: "signed-stripe-webhook",
  evidenceEventReferenceId: "evt_atomic_stale",
  evidenceCreatedAtIso: new Date(1_000).toISOString(),
  billingUserReferenceId,
  customerReferenceId: "atomic-customer-private-reference",
  subscriptionReferenceId: "atomic-subscription-private-reference",
  subscriptionStatus: "active",
  billingState: "paid-active",
  currentPeriodEndIso: new Date(1_900_000_000_000).toISOString()
});
assert.equal(observedRpcName, "apply_comment_translator_paid_entitlement_evidence");
assert.equal(atomicStaleResult, "ignored-stale");

const durableStore = testStoreModule.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
const incompleteStore = testStoreModule.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
const incompleteWebhook = await billingModule.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: "signed-test-payload",
  env: webhookEnv,
  verifier: {
    constructEvent: async () => ({
      eventReferenceId: "evt_incomplete",
      eventCreatedAtMs: 1_000,
      type: "customer.subscription.updated",
      customerReferenceId: "customer-private-reference",
      subscriptionReferenceId: "subscription-private-reference",
      status: "active",
      priceReferenceId: "price_creator_paid",
      billingUserReferenceId,
      currentPeriodEndMs: null
    })
  },
  entitlementStore: incompleteStore
});
assert.deepEqual(incompleteWebhook, {
  status: "ignored",
  reason: "incomplete-billing-evidence"
});

const missingBillingReferences = await billingModule.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: "signed-test-payload",
  env: webhookEnv,
  verifier: {
    constructEvent: async () => ({
      eventReferenceId: "evt_missing_references",
      eventCreatedAtMs: 1_500,
      type: "customer.subscription.updated",
      customerReferenceId: null,
      subscriptionReferenceId: null,
      status: "active",
      priceReferenceId: "price_creator_paid",
      billingUserReferenceId,
      currentPeriodEndMs: 1_900_000_000_000
    })
  },
  entitlementStore: incompleteStore
});
assert.deepEqual(missingBillingReferences, {
  status: "ignored",
  reason: "incomplete-billing-evidence"
});

const expiredActiveStore = testStoreModule.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
await expiredActiveStore.persistVerifiedBillingEvidence({
  evidenceSource: "signed-stripe-webhook",
  evidenceEventReferenceId: "evt_previous_active",
  evidenceCreatedAtIso: new Date(500).toISOString(),
  billingUserReferenceId,
  customerReferenceId: "expired-customer-private-reference",
  subscriptionReferenceId: "expired-subscription-private-reference",
  subscriptionStatus: "active",
  billingState: "paid-active",
  currentPeriodEndIso: new Date(Date.now() + 60_000).toISOString()
});
const expiredActiveWebhook = await billingModule.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: "signed-test-payload",
  env: webhookEnv,
  verifier: {
    constructEvent: async () => ({
      eventReferenceId: "evt_expired_active",
      eventCreatedAtMs: 1_000,
      type: "customer.subscription.updated",
      customerReferenceId: "expired-customer-private-reference",
      subscriptionReferenceId: "expired-subscription-private-reference",
      status: "active",
      priceReferenceId: "price_creator_paid",
      billingUserReferenceId,
      currentPeriodEndMs: Date.now() - 60_000
    })
  },
  entitlementStore: expiredActiveStore
});
assert.deepEqual(expiredActiveWebhook, {
  status: "applied",
  plan: "free",
  billingState: "paid-inactive"
});
const expiredActiveRecord = await expiredActiveStore.readByBillingUserReference(billingUserReferenceId);
assert.equal(expiredActiveRecord?.billingState, "paid-inactive", "new expired evidence revokes the existing paid-active row");
const expiredActiveSnapshot = await billingModule.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  entitlementStore: expiredActiveStore
});
assert.equal(expiredActiveSnapshot.plan, "free");
assert.equal(expiredActiveSnapshot.billingState, "paid-inactive");

const activeWebhook = await billingModule.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: "signed-test-payload",
  env: webhookEnv,
  verifier: {
    constructEvent: async () => ({
      eventReferenceId: "evt_active",
      eventCreatedAtMs: 2_000,
      type: "customer.subscription.updated",
      customerReferenceId: "customer-private-reference",
      subscriptionReferenceId: "subscription-private-reference",
      status: "active",
      priceReferenceId: "price_creator_paid",
      billingUserReferenceId,
      currentPeriodEndMs: 1_900_000_000_000
    })
  },
  entitlementStore: durableStore
});

assert.deepEqual(activeWebhook, {
  status: "applied",
  plan: "paid",
  billingState: "paid-active"
});
assert.doesNotMatch(
  JSON.stringify(activeWebhook),
  /owner|customer-private-reference|subscription-private-reference|price_creator_paid|stripe|provider/i,
  "operator-visible webhook output contains no private or provider billing metadata"
);

const activeSnapshot = await billingModule.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  entitlementStore: durableStore
});
assert.equal(activeSnapshot.plan, "paid");
assert.equal(activeSnapshot.billingState, "paid-active");

const canceledWebhook = await billingModule.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: "signed-test-payload",
  env: webhookEnv,
  verifier: {
    constructEvent: async () => ({
      eventReferenceId: "evt_canceled",
      eventCreatedAtMs: 3_000,
      type: "customer.subscription.deleted",
      customerReferenceId: "customer-private-reference",
      subscriptionReferenceId: "subscription-private-reference",
      status: "canceled",
      priceReferenceId: "price_creator_paid",
      billingUserReferenceId,
      currentPeriodEndMs: 1_900_000_000_000
    })
  },
  entitlementStore: durableStore
});
assert.deepEqual(canceledWebhook, {
  status: "applied",
  plan: "free",
  billingState: "paid-inactive"
});

const staleReplay = await billingModule.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: "signed-test-payload",
  env: webhookEnv,
  verifier: {
    constructEvent: async () => ({
      eventReferenceId: "evt_active_replay",
      eventCreatedAtMs: 2_000,
      type: "customer.subscription.updated",
      customerReferenceId: "customer-private-reference",
      subscriptionReferenceId: "subscription-private-reference",
      status: "active",
      priceReferenceId: "price_creator_paid",
      billingUserReferenceId,
      currentPeriodEndMs: 1_900_000_000_000
    })
  },
  entitlementStore: durableStore
});
assert.deepEqual(staleReplay, {
  status: "ignored",
  reason: "stale-billing-evidence"
});
const replaySnapshot = await billingModule.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  entitlementStore: durableStore
});
assert.equal(replaySnapshot.plan, "free");
assert.equal(replaySnapshot.billingState, "paid-inactive");

const expiredStore = testStoreModule.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
await expiredStore.persistVerifiedBillingEvidence({
  evidenceSource: "signed-stripe-webhook",
  evidenceEventReferenceId: "evt_expired",
  evidenceCreatedAtIso: new Date(500).toISOString(),
  billingUserReferenceId,
  customerReferenceId: "expired-customer-private-reference",
  subscriptionReferenceId: "expired-subscription-private-reference",
  subscriptionStatus: "active",
  billingState: "paid-active",
  currentPeriodEndIso: new Date(1_000).toISOString()
});
const expiredSnapshot = await billingModule.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  entitlementStore: expiredStore
});
assert.equal(expiredSnapshot.plan, "free");
assert.equal(expiredSnapshot.billingState, "paid-inactive");

const missingSnapshot = await billingModule.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "different-server-only-owner"
  },
  entitlementStore: durableStore
});
assert.equal(missingSnapshot.plan, "free");
assert.equal(missingSnapshot.billingState, "free");

const unreadableSnapshot = await billingModule.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  entitlementStore: {
    async readByBillingUserReference() {
      throw new Error("simulated durable read failure");
    },
    async readByCustomerReference() {
      throw new Error("simulated durable read failure");
    },
    async persistVerifiedBillingEvidence() {
      throw new Error("simulated durable write failure");
    }
  }
});
assert.equal(unreadableSnapshot.plan, "free");
assert.equal(unreadableSnapshot.billingState, "paid-inactive");

const unexpectedPrice = await billingModule.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: "signed-test-payload",
  env: webhookEnv,
  verifier: {
    constructEvent: async () => ({
      eventReferenceId: "evt_unexpected_price",
      eventCreatedAtMs: 4_000,
      type: "customer.subscription.updated",
      customerReferenceId: "customer-private-reference",
      subscriptionReferenceId: "subscription-private-reference",
      status: "active",
      priceReferenceId: "different-price",
      billingUserReferenceId,
      currentPeriodEndMs: 1_900_000_000_000
    })
  },
  entitlementStore: durableStore
});
assert.deepEqual(unexpectedPrice, {
  status: "ignored",
  reason: "unexpected-paid-price"
});

console.log("comment_translator_creator_c1_paid_entitlement_store_contract=pass");
