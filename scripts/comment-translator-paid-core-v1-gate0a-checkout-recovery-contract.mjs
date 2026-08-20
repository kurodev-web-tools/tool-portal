import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function resolveRelative(request, parentFilename) {
    if (request.startsWith("@/")) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.join(root, `${request.slice(2)}${extension}`);
        if (fs.existsSync(candidate)) return candidate;
      }
      return null;
    }
    if (!request.startsWith(".") || !parentFilename) return null;
    for (const extension of [".ts", ".tsx"]) {
      const candidate = path.resolve(path.dirname(parentFilename), `${request}${extension}`);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) return moduleCache.get(normalizedModulePath).exports;

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;
    const testModule = new Module(normalizedModulePath);
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") return {};
    const relativePath = resolveRelative(request, parent?.filename);
    if (relativePath) return compileTsModule(relativePath);
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

const controlPlane = loadTsModule("lib/comment-translator-paid-control-plane-reconciler.ts");
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
  COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_fixture"
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
  recovery
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
  }
]) {
  const claim = {
    lifecycleId: `lifecycle-${diagnosticClass}`,
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
    resolveWorkItem: async () => ({
      lifecycleId: claim.lifecycleId,
      workKind: claim.workKind
    }),
    actions: {
      checkoutExpiry: async () => {},
      unboundCheckoutSession: async () => recovery({ lifecycle, nowIso }),
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
