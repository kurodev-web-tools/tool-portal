import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export default {};#server-only" };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createClient=()=>({rpc:async()=>({data:null,error:null})});export default {};#supabase"
      };
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
      const source = fs.readFileSync(new URL(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: stripTypeScriptTypes(source, { mode: "transform", sourceMap: false })
      };
    }
    return nextLoad(url, context);
  }
});

const controlPlane = await import(pathToFileURL(
  path.join(root, "lib/comment-translator-paid-control-plane-reconciler.ts")
).href);
const nowIso = "2026-08-19T06:00:00.000Z";
const lifecycle = {
  lifecycleId: "lifecycle-fixture",
  ownerUserId: "owner-fixture",
  customerBindingId: "customer-binding-fixture",
  stripeCustomerId: "cus_fixture",
  lifecycleState: "checkout_hold",
  isTerminal: false,
  holdId: "hold-fixture",
  checkoutExpiresAtTargetIso: "2026-08-19T06:31:00.000Z",
  checkoutSessionId: null,
  stripeExpiresAtIso: null,
  idempotencyKey: "idempotency-fixture",
  subscriptionId: null,
  paymentFailureStartedAtIso: null,
  nextReconcileAtIso: nowIso
};
const env = {
  STRIPE_SECRET_KEY: "fixture-secret",
  NEXT_PUBLIC_SITE_URL: "https://example.test",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_fixture",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_fixture",
  COMMENT_TRANSLATOR_PAID_AUTOMATIC_TAX_ENABLED: "false",
  COMMENT_TRANSLATOR_PAID_TAX_REGISTRATION_READY: "false"
};
const authorityReader = {
  readCheckoutSafetyAuthority: async () => ({
    status: "ready",
    capacityAvailable: true,
    dailyPollBudget: 1_000,
    reservedPolls: 1
  })
};

const boundSessions = [];
const successfulCheckoutParams = [];
const entitlementStore = {
  async terminalizeUnboundCheckoutHold() {
    return false;
  },
  async bindCheckoutSession(request) {
    boundSessions.push(request);
  },
  async markCheckoutExpireRequired() {
    throw new Error("unexpected expire-required fixture path");
  }
};
const successfulStripeAdapter = {
  async createCheckoutSession(params) {
    successfulCheckoutParams.push(params);
    return {
      id: "cs_fixture",
      customerId: "cus_fixture",
      url: null,
      expiresAtIso: lifecycle.checkoutExpiresAtTargetIso,
      status: "open"
    };
  }
};

const recover = controlPlane.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore,
  stripeAdapter: successfulStripeAdapter,
  checkoutSafetyAuthorityReader: authorityReader,
  env
});
const recovered = await recover({ lifecycle, nowIso });
assert.equal(recovered, true, "unbound Checkout recovery succeeds with a valid fixture response");
assert.equal(successfulCheckoutParams.length, 1, "recovery creates one Checkout Session");
assert.equal(boundSessions.length, 1, "recovery binds the created Checkout Session once");
assert.equal("customerEmail" in successfulCheckoutParams[0], false, "recovery does not pass customerEmail");
assert.equal(successfulCheckoutParams[0].customerReferenceId, "cus_fixture", "recovery keeps the bound Customer ID");
assert.equal(successfulCheckoutParams[0].automaticTax, false, "monitoring-only recovery sends automaticTax=false");

let expiredCheckoutCreateCalls = 0;
const expiredCheckoutRecovery = controlPlane.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore,
  stripeAdapter: {
    async createCheckoutSession() {
      expiredCheckoutCreateCalls += 1;
      return {
        id: "cs_expired_fixture",
        customerId: "cus_fixture",
        url: null,
        expiresAtIso: expiredLifecycle.checkoutExpiresAtTargetIso,
        status: "open"
      };
    }
  },
  checkoutSafetyAuthorityReader: authorityReader,
  env
});
const expiredLifecycle = {
  ...lifecycle,
  checkoutExpiresAtTargetIso: "2026-08-19T05:59:00.000Z"
};
assert.equal(
  await expiredCheckoutRecovery({ lifecycle: expiredLifecycle, nowIso }),
  false,
  "expired unbound Checkout recovery fails closed without reusing the expired target"
);
assert.equal(expiredCheckoutCreateCalls, 0, "expired unbound Checkout recovery does not call Stripe");

const failingRecovery = controlPlane.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore,
  stripeAdapter: {
    async createCheckoutSession() {
      const error = new Error("fixture Stripe failure");
      error.stripeFailureDiagnostic = "stripe-4xx";
      throw error;
    }
  },
  checkoutSafetyAuthorityReader: authorityReader,
  env
});
await assert.rejects(
  () => failingRecovery({ lifecycle, nowIso }),
  (error) => (
    error?.reconcileErrorClass === "external-action-failed"
    && error?.reconcileDiagnosticClass === "stripe-4xx"
  ),
  "adapter failure keeps the existing class and propagates only the allowlisted diagnostic class"
);

const retrieveFailureRecovery = controlPlane.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: {
    async bindCheckoutSession() {
      throw new Error("fixture binding failure");
    },
    async markCheckoutExpireRequired() {
      return true;
    }
  },
  stripeAdapter: {
    async createCheckoutSession() {
      return {
        id: "cs_fixture_retrieve_failure",
        customerId: "cus_fixture",
        url: null,
        expiresAtIso: lifecycle.checkoutExpiresAtTargetIso,
        status: "open"
      };
    },
    async expireCheckoutSession() {
      return {
        id: "cs_fixture_retrieve_failure",
        customerId: "cus_fixture",
        url: null,
        expiresAtIso: lifecycle.checkoutExpiresAtTargetIso,
        status: "expired"
      };
    },
    async retrieveCheckoutSession() {
      const error = new Error("fixture retrieval failure");
      error.stripeFailureDiagnostic = "stripe-5xx";
      throw error;
    }
  },
  checkoutSafetyAuthorityReader: authorityReader,
  env
});
await assert.rejects(
  () => retrieveFailureRecovery({ lifecycle, nowIso }),
  (error) => (
    error?.reconcileErrorClass === "external-action-failed"
    && error?.reconcileDiagnosticClass === "stripe-5xx"
  ),
  "post-bind retrieval failure keeps its allowlisted diagnostic class"
);

const bindingFailureRecovery = controlPlane.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: {
    async bindCheckoutSession() {
      throw new Error("fixture binding failure");
    },
    async markCheckoutExpireRequired() {
      throw new Error("fixture expire-required persistence failure");
    }
  },
  stripeAdapter: successfulStripeAdapter,
  checkoutSafetyAuthorityReader: authorityReader,
  env
});
await assert.rejects(
  () => bindingFailureRecovery({ lifecycle, nowIso }),
  (error) => (
    error?.reconcileErrorClass === "database-transaction-failed"
    && error?.reconcileDiagnosticClass === "checkout-binding-failed"
  ),
  "a binding failure keeps the database error class and exposes its recovery diagnostic"
);

const expiryAdapterFailureRecovery = controlPlane.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: {
    async bindCheckoutSession() {
      throw new Error("fixture binding failure");
    },
    async markCheckoutExpireRequired() {
      return true;
    }
  },
  stripeAdapter: successfulStripeAdapter,
  checkoutSafetyAuthorityReader: authorityReader,
  env
});
await assert.rejects(
  () => expiryAdapterFailureRecovery({ lifecycle, nowIso }),
  (error) => (
    error?.reconcileErrorClass === "external-action-failed"
    && error?.reconcileDiagnosticClass === "checkout-expiry-failed"
  ),
  "missing expiry adapters keep the external-action error class and expose its recovery diagnostic"
);

const expiryConfirmationFailureRecovery = controlPlane.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: {
    async bindCheckoutSession() {
      throw new Error("fixture binding failure");
    },
    async markCheckoutExpireRequired() {
      return true;
    }
  },
  stripeAdapter: {
    async createCheckoutSession() {
      return {
        id: "cs_fixture_confirmation_failure",
        customerId: "cus_fixture",
        url: null,
        expiresAtIso: lifecycle.checkoutExpiresAtTargetIso,
        status: "open"
      };
    },
    async expireCheckoutSession() {
      return {
        id: "cs_fixture_confirmation_failure",
        customerId: "cus_fixture",
        url: null,
        expiresAtIso: lifecycle.checkoutExpiresAtTargetIso,
        status: "expired"
      };
    },
    async retrieveCheckoutSession() {
      return {
        id: "cs_fixture_confirmation_failure",
        customerId: "cus_fixture",
        url: null,
        expiresAtIso: lifecycle.checkoutExpiresAtTargetIso,
        status: "open"
      };
    }
  },
  checkoutSafetyAuthorityReader: authorityReader,
  env
});
await assert.rejects(
  () => expiryConfirmationFailureRecovery({ lifecycle, nowIso }),
  (error) => (
    error?.reconcileErrorClass === "external-action-failed"
    && error?.reconcileDiagnosticClass === "checkout-expiry-confirmation-failed"
  ),
  "an unexpired confirmation keeps the external-action error class and exposes its recovery diagnostic"
);

const invalidCheckoutResponseRecovery = controlPlane.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore,
  stripeAdapter: {
    async createCheckoutSession() {
      return {
        id: null,
        customerId: null,
        url: null,
        expiresAtIso: null,
        status: "unknown",
        failureDiagnostic: "stripe-response-invalid"
      };
    }
  },
  checkoutSafetyAuthorityReader: authorityReader,
  env
});
await assert.rejects(
  () => invalidCheckoutResponseRecovery({ lifecycle, nowIso }),
  (error) => (
    error?.reconcileErrorClass === "binding-not-ready"
    && error?.reconcileDiagnosticClass === "stripe-response-invalid"
  ),
  "a structurally invalid 2xx Checkout response remains fail-closed and exposes only its diagnostic class"
);

const lifecycleReadFailureResolver = controlPlane.createCommentTranslatorPaidControlPlaneWorkItemResolver({
  readBillingLifecycle: async () => {
    throw new Error("fixture lifecycle read failure");
  }
});
await assert.rejects(
  () => lifecycleReadFailureResolver({
    lifecycleId: lifecycle.lifecycleId,
    reconcileLeaseToken: "lease-lifecycle-read-failure",
    reconcileLeaseUntilIso: "2026-08-19T06:02:00.000Z",
    workKind: "unbound-checkout-session"
  }),
  (error) => (
    error?.reconcileErrorClass === "external-action-failed"
    && error?.reconcileDiagnosticClass === "checkout-lifecycle-read-failed"
  ),
  "an unbound recovery lifecycle read failure exposes only its sanitized recovery stage"
);

const unclassifiedRecoveryActions = controlPlane.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => lifecycle,
  entitlementStore,
  paidPlanAuthority: {
    productId: env.COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID,
    priceId: env.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() {
      throw new Error("unclassified recovery must not read a bound Stripe object");
    },
    async retrieveCurrentSubscriptionAdjustmentState() {
      throw new Error("unclassified recovery must not read a Subscription adjustment");
    }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription() {
      throw new Error("unclassified recovery must not cancel a Subscription");
    }
  },
  usageStore: {
    async closeBillingPeriod() { return false; },
    async closeUtcMonth() { return false; }
  },
  recoverUnboundCheckoutSession: async () => {
    throw new Error("fixture unclassified recovery failure");
  }
});
await assert.rejects(
  () => unclassifiedRecoveryActions.unboundCheckoutSession({
    item: { lifecycleId: lifecycle.lifecycleId, workKind: "unbound-checkout-session" },
    opaqueLeaseContext: {
      lifecycleId: lifecycle.lifecycleId,
      reconcileLeaseToken: "lease-unclassified-recovery",
      reconcileLeaseUntilIso: "2026-08-19T06:02:00.000Z"
    },
    nowIso
  }),
  (error) => (
    error?.reconcileErrorClass === "external-action-failed"
    && error?.reconcileDiagnosticClass === "checkout-recovery-unclassified-failed"
  ),
  "an unclassified unbound recovery failure exposes only its sanitized recovery stage"
);

const expiredUnboundTerminalizationRequests = [];
let expiredUnboundRecoveryCalls = 0;
const expiredUnboundActions = controlPlane.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => ({
    ...lifecycle,
    checkoutExpiresAtTargetIso: "2026-08-19T05:59:00.000Z",
    nextReconcileAtIso: nowIso
  }),
  entitlementStore: {
    async terminalizeUnboundCheckoutHold(request) {
      expiredUnboundTerminalizationRequests.push(request);
      return true;
    },
    async expireCheckoutHold() {
      throw new Error("expired unbound hold must use the unbound terminalization RPC");
    }
  },
  paidPlanAuthority: {
    productId: env.COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID,
    priceId: env.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() {
      throw new Error("expired unbound terminalization must not read Stripe");
    },
    async retrieveCurrentSubscriptionAdjustmentState() {
      throw new Error("expired unbound terminalization must not read a Subscription");
    }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription() {
      throw new Error("expired unbound terminalization must not cancel a Subscription");
    }
  },
  usageStore: {
    async closeBillingPeriod() { return false; },
    async closeUtcMonth() { return false; }
  },
  async recoverUnboundCheckoutSession() {
    expiredUnboundRecoveryCalls += 1;
    throw new Error("expired unbound terminalization must finish before recovery");
  }
});
await expiredUnboundActions.unboundCheckoutSession({
  item: { lifecycleId: lifecycle.lifecycleId, workKind: "unbound-checkout-session" },
  opaqueLeaseContext: {
    lifecycleId: lifecycle.lifecycleId,
    reconcileLeaseToken: "lease-expired-unbound-terminalization",
    reconcileLeaseUntilIso: "2026-08-19T06:02:00.000Z"
  },
  nowIso
});
assert.deepEqual(expiredUnboundTerminalizationRequests, [{
  lifecycleId: lifecycle.lifecycleId,
  ownerUserId: lifecycle.ownerUserId,
  holdId: lifecycle.holdId,
  reconcileLeaseToken: "lease-expired-unbound-terminalization"
}], "expired unbound holds use the lease-bound terminalization RPC");
assert.equal(expiredUnboundRecoveryCalls, 0, "expired unbound holds do not enter the Checkout recovery loop");

const futureRecoveryCreates = [];
const futureRecovery = controlPlane.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore,
  stripeAdapter: {
    async createCheckoutSession(params) {
      futureRecoveryCreates.push(params);
      return {
        id: "cs_fixture_future_recovery",
        customerId: "cus_fixture",
        url: null,
        expiresAtIso: params.expiresAtIso,
        status: "open"
      };
    }
  },
  checkoutSafetyAuthorityReader: authorityReader,
  env
});
assert.equal(
  await futureRecovery({
    lifecycle: { ...lifecycle, checkoutExpiresAtTargetIso: "2026-08-19T06:31:00.000Z" },
    nowIso
  }),
  true,
  "a future target with the Stripe sixty-second margin remains recoverable"
);
assert.equal(futureRecoveryCreates.length, 1, "recoverable future target creates one Checkout Session");
assert.equal(
  await futureRecovery({
    lifecycle: { ...lifecycle, checkoutExpiresAtTargetIso: "2026-08-19T06:29:00.000Z" },
    nowIso
  }),
  false,
  "a target below the Stripe thirty-minute minimum is not sent to Stripe"
);
assert.equal(futureRecoveryCreates.length, 1, "near-expiry recovery does not create a second Checkout Session");

const expiredUnboundFinalizes = [];
const expiredUnboundRun = await controlPlane.runCommentTranslatorPaidControlPlaneReconciler({
  store: {
    async claimDue() {
      return [{
        lifecycleId: lifecycle.lifecycleId,
        reconcileLeaseToken: "lease-expired-unbound-terminalization",
        reconcileLeaseUntilIso: "2026-08-19T06:02:00.000Z",
        workKind: "unbound-checkout-session"
      }];
    },
    async assertLeaseActive() { return true; },
    async finalize(request) {
      expiredUnboundFinalizes.push(request);
      return true;
    },
    async retry() { throw new Error("terminalized unbound hold must not retry"); },
    async markFailureSafe() { throw new Error("terminalized unbound hold must not enter failure safety"); }
  },
  resolveWorkItem: async () => ({ lifecycleId: lifecycle.lifecycleId, workKind: "unbound-checkout-session" }),
  actions: { unboundCheckoutSession: expiredUnboundActions.unboundCheckoutSession },
  clock: () => nowIso,
  nowIso
});
assert.equal(expiredUnboundRun.status, "success", "terminalized unbound work finalizes through the existing lease finalizer");
assert.equal(expiredUnboundRun.completedCount, 1, "terminalized unbound work completes one claimed item");
assert.equal(expiredUnboundFinalizes.length, 1, "terminalized unbound work invokes the existing reconciler finalizer");

const diagnosticClaim = {
  lifecycleId: "lifecycle-diagnostic-fixture",
  reconcileLeaseToken: "lease-diagnostic-fixture",
  reconcileLeaseUntilIso: "2026-08-19T06:02:00.000Z",
  workKind: "unbound-checkout-session"
};
const diagnosticReconcileResult = await controlPlane.runCommentTranslatorPaidControlPlaneReconciler({
  store: {
    async claimDue() { return [diagnosticClaim]; },
    async assertLeaseActive() { return true; },
    async finalize() { return true; },
    async retry() { return 1; },
    async markFailureSafe() { return true; }
  },
  resolveWorkItem: async () => ({
    lifecycleId: diagnosticClaim.lifecycleId,
    workKind: diagnosticClaim.workKind
  }),
  actions: {
    checkoutExpiry: async () => {},
    async unboundCheckoutSession() {
      const error = new Error("fixture diagnostic failure");
      error.reconcileErrorClass = "external-action-failed";
      error.reconcileDiagnosticClass = "stripe-4xx";
      throw error;
    },
    paymentFailureSevenDay: async () => {},
    cancelPending: async () => {},
    refundReconciliation: async () => {},
    disputeReconciliation: async () => {},
    paidUnentitledReconciliation: async () => {},
    billingPeriodRollover: async () => {},
    utcMonthCostRollover: async () => {}
  },
  nowIso
});
assert.equal(diagnosticReconcileResult.status, "retry-scheduled");
assert.deepEqual(
  diagnosticReconcileResult.errorClassCounts,
  { "external-action-failed": 1 },
  "the existing base error class remains available"
);
assert.deepEqual(
  diagnosticReconcileResult.diagnosticClassCounts,
  { "stripe-4xx": 1 },
  "the diagnostic class is returned as a separate aggregate"
);

for (const {
  diagnosticClass,
  errorClass,
  recovery,
  claimLifecycleId,
  resolveWorkItem,
  unboundCheckoutSession
} of [
  {
    diagnosticClass: "checkout-binding-failed",
    errorClass: "database-transaction-failed",
    recovery: bindingFailureRecovery
  },
  {
    diagnosticClass: "checkout-expiry-failed",
    errorClass: "external-action-failed",
    recovery: expiryAdapterFailureRecovery
  },
  {
    diagnosticClass: "checkout-expiry-confirmation-failed",
    errorClass: "external-action-failed",
    recovery: expiryConfirmationFailureRecovery
  },
  {
    diagnosticClass: "checkout-lifecycle-read-failed",
    errorClass: "external-action-failed",
    resolveWorkItem: lifecycleReadFailureResolver
  },
  {
    diagnosticClass: "checkout-recovery-unclassified-failed",
    errorClass: "external-action-failed",
    claimLifecycleId: lifecycle.lifecycleId,
    unboundCheckoutSession: (request) => unclassifiedRecoveryActions.unboundCheckoutSession(request)
  }
]) {
  const claim = {
    lifecycleId: claimLifecycleId ?? `lifecycle-${diagnosticClass}`,
    reconcileLeaseToken: `lease-${diagnosticClass}`,
    reconcileLeaseUntilIso: "2026-08-19T06:02:00.000Z",
    workKind: "unbound-checkout-session"
  };
  const failureSafeRequests = [];
  const retryRequests = [];
  const result = await controlPlane.runCommentTranslatorPaidControlPlaneReconciler({
    store: {
      async claimDue() { return [claim]; },
      async assertLeaseActive() { return true; },
      async finalize() { return true; },
      async retry(request) { retryRequests.push(request); return 1; },
      async markFailureSafe(request) { failureSafeRequests.push(request); return true; }
    },
    resolveWorkItem: resolveWorkItem ?? (async () => ({
      lifecycleId: claim.lifecycleId,
      workKind: claim.workKind
    })),
    actions: {
      checkoutExpiry: async () => {},
      unboundCheckoutSession: unboundCheckoutSession ?? (async () => recovery({ lifecycle, nowIso })),
      paymentFailureSevenDay: async () => {},
      cancelPending: async () => {},
      refundReconciliation: async () => {},
      disputeReconciliation: async () => {},
      paidUnentitledReconciliation: async () => {},
      billingPeriodRollover: async () => {},
      utcMonthCostRollover: async () => {}
    },
    nowIso
  });

  assert.equal(result.status, "retry-scheduled", `${diagnosticClass} remains retry-scheduled`);
  assert.deepEqual(result.errorClassCounts, { [errorClass]: 1 }, `${diagnosticClass} keeps its base error class`);
  assert.deepEqual(result.diagnosticClassCounts, { [diagnosticClass]: 1 }, `${diagnosticClass} reaches the reconciler aggregate`);
  assert.deepEqual(failureSafeRequests, [{
    lifecycleId: claim.lifecycleId,
    reconcileLeaseToken: claim.reconcileLeaseToken,
    workKind: claim.workKind,
    errorClass,
    nowIso
  }], `${diagnosticClass} preserves the failure-safe request`);
  assert.deepEqual(retryRequests, [{
    lifecycleId: claim.lifecycleId,
    reconcileLeaseToken: claim.reconcileLeaseToken,
    errorClass,
    nowIso
  }], `${diagnosticClass} preserves the retry request`);
}

console.log("comment translator paid core v1 Gate 0-A checkout recovery contract checks passed");
