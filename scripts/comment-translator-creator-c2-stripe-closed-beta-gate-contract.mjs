import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const checkoutActionsPath = "app/account/billing/actions.ts";
const webhookRoutePath = "app/api/comment-translator/billing/webhook/route.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export{}" };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export function createClient(){return {from(){return {}},rpc(){return {data:null,error:null}}}}"
      };
    }
    if (specifier === "stripe") {
      return { shortCircuit: true, url: "data:text/javascript,export default class Stripe{}" };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) {
        return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
    return nextResolve(specifier, context);
  }
});

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

for (const requiredPath of [billingRuntimePath, checkoutActionsPath, webhookRoutePath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `C2 required file exists: ${requiredPath}`);
}

const billingSource = read(billingRuntimePath);
const checkoutActionsSource = read(checkoutActionsPath);
const webhookRouteSource = read(webhookRoutePath);
assert.match(billingSource, /^import "server-only";/m, "C2 billing ownership remains server-only");
assert.match(billingSource, /COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS/, "C2 has an explicit server-owned activation reference");
assert.match(billingSource, /COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES/, "C2 reuses the established hash allowlist authority");
assert.match(checkoutActionsSource, /createCommentTranslatorStripeCheckoutSessionResult/, "Checkout remains a server action boundary");
assert.match(checkoutActionsSource, /createCommentTranslatorStripePortalSessionResult/, "Portal remains a server action boundary");
assert.match(webhookRouteSource, /readCommentTranslatorStripeWebhookResult/, "webhook route remains a signed verifier boundary");

const billing = await import("../lib/comment-translator-billing-runtime.ts");
const entitlementStores = await import("../lib/comment-translator-paid-entitlement-test-store.ts");
const paidUsage = await import("../lib/comment-translator-paid-usage-runtime.ts");
const paidUsageStores = await import("../lib/comment-translator-paid-usage-test-store.ts");
assert.equal(
  billing.commentTranslatorStripeBillingContract.implementationStage,
  "creator-closed-beta-c2-stripe-live-gate",
  "runtime authority identifies the current C2 boundary"
);

const ownerUserId = "server-only-closed-beta-owner";
const callerAuthorization = { status: "authorized", ownerUserId };
const allowedOwnerHash = createHash("sha256").update(ownerUserId).digest("hex");
const nowMs = Date.parse("2026-07-22T06:00:00.000Z");
const activePeriodEndMs = Date.parse("2026-08-22T00:00:00.000Z");
const configuredEnv = {
  STRIPE_SECRET_KEY: "stripe-secret-present-for-test-only",
  STRIPE_WEBHOOK_SECRET: "webhook-secret-present-for-test-only",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price-private-reference",
  NEXT_PUBLIC_SITE_URL: "https://closed-beta.example.test",
  COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES: allowedOwnerHash,
  COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "enabled-reviewed"
};

let checkoutCalls = 0;
const blockedCheckout = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization: { status: "authorized", ownerUserId: "not-allowlisted-owner" },
  env: configuredEnv,
  abuseRateLimit: { rateLimitAlreadyChecked: true },
  stripeAdapter: {
    async createCheckoutSession() {
      checkoutCalls += 1;
      return { url: "https://checkout.example.test/never" };
    }
  }
});
assert.deepEqual(blockedCheckout, {
  status: "unavailable",
  reason: "closed-beta-gated",
  missingEnvReferences: []
});
assert.equal(checkoutCalls, 0, "non-allowlisted authenticated callers never reach Stripe");

const disabledCheckout = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization,
  env: { ...configuredEnv, COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "" },
  abuseRateLimit: { rateLimitAlreadyChecked: true },
  stripeAdapter: {
    async createCheckoutSession() {
      checkoutCalls += 1;
      return { url: "https://checkout.example.test/never" };
    }
  }
});
assert.equal(disabledCheckout.status, "unavailable");
assert.equal(disabledCheckout.reason, "missing-config");
assert.deepEqual(disabledCheckout.missingEnvReferences, ["COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS"]);
assert.equal(checkoutCalls, 0, "unactivated closed-beta billing never reaches Stripe");

let observedCheckoutParams = null;
const emptyEntitlementStore = entitlementStores.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
const allowedCheckout = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization,
  env: configuredEnv,
  entitlementStore: emptyEntitlementStore,
  abuseRateLimit: { rateLimitAlreadyChecked: true },
  customerEmail: "account@example.test",
  stripeAdapter: {
    async createCheckoutSession(params) {
      checkoutCalls += 1;
      observedCheckoutParams = params;
      return { url: "https://checkout.example.test/session" };
    }
  }
});
assert.deepEqual(allowedCheckout, { status: "redirect-ready", url: "https://checkout.example.test/session" });
assert.equal(checkoutCalls, 1);
assert.equal(observedCheckoutParams.priceReferenceId, configuredEnv.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID);
assert.match(observedCheckoutParams.clientReferenceId, /^ctbill_[a-f0-9]{24}$/);
assert.doesNotMatch(observedCheckoutParams.clientReferenceId, new RegExp(ownerUserId));

const unreadableCheckout = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization,
  env: configuredEnv,
  abuseRateLimit: { rateLimitAlreadyChecked: true },
  entitlementStore: {
    async readByBillingUserReference() { throw new Error("simulated unreadable ownership"); },
    async readByCustomerReference() { return null; },
    async persistVerifiedBillingEvidence() { return "ignored-stale"; }
  },
  stripeAdapter: {
    async createCheckoutSession() {
      checkoutCalls += 1;
      return { url: "https://checkout.example.test/never" };
    }
  }
});
assert.deepEqual(unreadableCheckout, {
  status: "unavailable",
  reason: "billing-state-unavailable",
  missingEnvReferences: []
});
assert.equal(checkoutCalls, 1, "unreadable durable ownership never reaches Stripe");

const entitlementStore = entitlementStores.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
const billingUserReferenceId = billing.createCommentTranslatorBillingUserReference(callerAuthorization);
assert.ok(billingUserReferenceId);
await entitlementStore.persistVerifiedBillingEvidence({
  evidenceSource: "signed-stripe-webhook",
  evidenceEventReferenceId: "evt_existing_customer",
  evidenceCreatedAtIso: "2026-07-22T05:00:00.000Z",
  billingUserReferenceId,
  customerReferenceId: "customer-private-reference",
  subscriptionReferenceId: "subscription-private-reference",
  subscriptionStatus: "active",
  billingState: "paid-active",
  currentPeriodEndIso: new Date(activePeriodEndMs).toISOString()
});
let observedPortalParams = null;
const allowedPortal = await billing.createCommentTranslatorStripePortalSessionResult({
  callerAuthorization,
  env: configuredEnv,
  entitlementStore,
  abuseRateLimit: { rateLimitAlreadyChecked: true },
  stripeAdapter: {
    async createPortalSession(params) {
      observedPortalParams = params;
      return { url: "https://portal.example.test/session" };
    }
  }
});
assert.deepEqual(allowedPortal, { status: "redirect-ready", url: "https://portal.example.test/session" });
assert.equal(observedPortalParams.customerReferenceId, "customer-private-reference", "Portal customer comes from C1 durable ownership");

const event = {
  eventReferenceId: "evt_signed_active",
  eventCreatedAtMs: nowMs,
  type: "customer.subscription.updated",
  customerReferenceId: "customer-private-reference",
  subscriptionReferenceId: "subscription-private-reference",
  status: "active",
  priceReferenceId: configuredEnv.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID,
  billingUserReferenceId,
  currentPeriodEndMs: activePeriodEndMs
};
const verifier = { async constructEvent() { return event; } };

const unsignedWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "unsigned-browser-or-operator-input",
  signature: null,
  env: configuredEnv,
  verifier,
  entitlementStore,
  nowMs
});
assert.deepEqual(unsignedWebhook, { status: "rejected", reason: "missing-signature" });

const disabledWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "signed-payload",
  signature: "signed-header",
  env: { ...configuredEnv, COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "" },
  verifier,
  entitlementStore,
  nowMs
});
assert.equal(disabledWebhook.status, "rejected");
assert.equal(disabledWebhook.reason, "missing-config");
assert.deepEqual(disabledWebhook.missingEnvReferences, ["COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS"]);

const activeWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "signed-payload",
  signature: "signed-header",
  env: configuredEnv,
  verifier,
  entitlementStore,
  nowMs
});
assert.deepEqual(activeWebhook, { status: "applied", plan: "paid", billingState: "paid-active" });

const existingCustomerCheckout = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization,
  env: configuredEnv,
  entitlementStore,
  abuseRateLimit: { rateLimitAlreadyChecked: true },
  stripeAdapter: {
    async createCheckoutSession() {
      checkoutCalls += 1;
      return { url: "https://checkout.example.test/never" };
    }
  }
});
assert.deepEqual(existingCustomerCheckout, {
  status: "unavailable",
  reason: "existing-customer-use-portal",
  missingEnvReferences: []
});
assert.equal(checkoutCalls, 1, "an existing C1 Customer mapping cannot create a duplicate Checkout subscription");

const gatedSnapshot = await billing.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization,
  entitlementStore,
  env: { ...configuredEnv, COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "" },
  nowMs
});
assert.equal(gatedSnapshot.plan, "free", "disabled C2 activation suppresses an otherwise active C1 row");
assert.equal(gatedSnapshot.billingState, "free", "an unconfigured or closed C2 gate remains a normal sanitized Free state");
const gatedBrowserView = billing.createCommentTranslatorBillingBrowserSafeViewModel({
  snapshot: gatedSnapshot,
  env: { ...configuredEnv, COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "" }
});
assert.equal(gatedBrowserView.checkoutAvailable, false, "browser Checkout remains disabled while C2 activation is closed");
assert.equal(gatedBrowserView.portalAvailable, false, "browser Portal remains disabled while C2 activation is closed");
const allowedSnapshot = await billing.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization,
  entitlementStore,
  env: configuredEnv,
  nowMs
});
assert.equal(allowedSnapshot.plan, "paid", "C1 row becomes Paid only inside the active allowlisted C2 gate");

const activeEntitlement = await entitlementStore.readByBillingUserReference(billingUserReferenceId);
assert.ok(activeEntitlement);
const usageStore = paidUsageStores.createInMemoryCommentTranslatorPaidUsageStoreForTests();
usageStore.syncFromEntitlement(activeEntitlement);
const gatedUsage = await paidUsage.readCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore,
  paidUsageCounterStore: { status: "ready", store: usageStore, missingEnvReferences: [] },
  env: { ...configuredEnv, COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "" },
  nowMs
});
assert.equal(gatedUsage.status, "paid-inactive", "C3 usage authority also follows the C2 closed-beta gate");

const duplicateWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "signed-payload",
  signature: "signed-header",
  env: configuredEnv,
  verifier,
  entitlementStore,
  nowMs
});
assert.deepEqual(duplicateWebhook, { status: "ignored", reason: "stale-billing-evidence" });

const staleWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "signed-stale-payload",
  signature: "signed-header",
  env: configuredEnv,
  verifier: { async constructEvent() { return { ...event, eventReferenceId: "evt_signed_stale", eventCreatedAtMs: nowMs - 1 }; } },
  entitlementStore,
  nowMs
});
assert.deepEqual(staleWebhook, { status: "ignored", reason: "stale-billing-evidence" });

const trialStore = entitlementStores.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
const trialingWithoutPolicy = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "signed-trial-payload",
  signature: "signed-header",
  env: configuredEnv,
  verifier: { async constructEvent() { return { ...event, eventReferenceId: "evt_trial", status: "trialing" }; } },
  entitlementStore: trialStore,
  nowMs
});
assert.deepEqual(trialingWithoutPolicy, { status: "applied", plan: "free", billingState: "paid-inactive" });

const preexistingTrialStore = entitlementStores.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
await preexistingTrialStore.persistVerifiedBillingEvidence({
  ...activeEntitlement,
  evidenceEventReferenceId: "evt_preexisting_trial",
  subscriptionStatus: "trialing",
  billingState: "paid-active"
});
const preexistingTrialSnapshot = await billing.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization,
  entitlementStore: preexistingTrialStore,
  env: configuredEnv,
  nowMs
});
assert.equal(preexistingTrialSnapshot.plan, "free", "a pre-C2 trialing row cannot retain Paid without approved trial policy");
assert.equal(preexistingTrialSnapshot.billingState, "paid-inactive");
const preexistingTrialBrowserView = billing.createCommentTranslatorBillingBrowserSafeViewModel({
  snapshot: preexistingTrialSnapshot,
  env: configuredEnv
});

const unexpectedPrice = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "signed-other-price",
  signature: "signed-header",
  env: configuredEnv,
  verifier: { async constructEvent() { return { ...event, eventReferenceId: "evt_other_price", priceReferenceId: "other-price" }; } },
  entitlementStore,
  nowMs
});
assert.deepEqual(unexpectedPrice, { status: "ignored", reason: "unexpected-paid-price" });

const incompleteActive = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "signed-incomplete-active",
  signature: "signed-header",
  env: configuredEnv,
  verifier: {
    async constructEvent() {
      return { ...event, eventReferenceId: "evt_incomplete_active", priceReferenceId: null };
    }
  },
  entitlementStore: entitlementStores.createInMemoryCommentTranslatorPaidEntitlementStoreForTests(),
  nowMs
});
assert.deepEqual(incompleteActive, { status: "ignored", reason: "incomplete-billing-evidence" });

for (const result of [blockedCheckout, disabledCheckout, allowedCheckout, unreadableCheckout, allowedPortal, unsignedWebhook, disabledWebhook, activeWebhook, existingCustomerCheckout, gatedBrowserView, gatedUsage, duplicateWebhook, staleWebhook, trialingWithoutPolicy, preexistingTrialBrowserView, unexpectedPrice, incompleteActive]) {
  assert.doesNotMatch(
    JSON.stringify(result),
    /server-only-closed-beta-owner|ctbill_|customer-private-reference|subscription-private-reference|price-private-reference|present-for-test-only|signed-payload/i,
    "C2 browser/operator output remains sanitized"
  );
}

console.log("comment_translator_creator_c2_stripe_closed_beta_gate_contract=pass");
