import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const runtimePath = "lib/comment-translator-billing-runtime.ts";

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function resolveAlias(request) {
    if (!request.startsWith("@/")) return null;
    const candidateBase = path.join(root, request.slice(2));
    for (const extension of [".ts", ".tsx"]) {
      const candidate = `${candidateBase}${extension}`;
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  function compile(modulePath) {
    const normalized = path.normalize(modulePath);
    if (moduleCache.has(normalized)) return moduleCache.get(normalized).exports;
    const source = fs.readFileSync(normalized, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: normalized.endsWith(".tsx") ? ts.JsxEmit.ReactJSX : undefined
      }
    }).outputText;
    const testModule = new Module(normalized);
    moduleCache.set(normalized, testModule);
    testModule.filename = normalized;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalized));
    testModule._compile(compiled, normalized);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") return {};
    if (request === "@supabase/supabase-js") return { createClient: () => ({}) };
    const aliasPath = resolveAlias(request);
    if (aliasPath) return compile(aliasPath);
    if (request.startsWith(".") && parent?.filename) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.resolve(path.dirname(parent.filename), `${request}${extension}`);
        if (fs.existsSync(candidate)) return compile(candidate);
      }
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compile(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

const billing = loadTsModule(runtimePath);
assert.equal(typeof billing.readCommentTranslatorStripeWebhookResult, "function");
assert.equal(typeof billing.getCommentTranslatorStripeWebhookHttpStatus, "function");

const baseContext = {
  ownerUserId: "owner-reference",
  lifecycleId: "lifecycle-reference",
  customerBindingId: "customer-binding-reference",
  holdId: "hold-reference",
  stripeCustomerId: "customer-reference",
  stripeCheckoutSessionId: "checkout-reference",
  stripeSubscriptionId: "subscription-reference",
  subscriptionBindingId: "subscription-binding-reference",
  productId: "product-reference",
  priceId: "price-reference",
  lifecycleState: "active",
  stripeExpiresAtIso: "2026-08-13T01:00:00.000Z",
  idempotencyKey: "idempotency-reference"
};

function subscription(status = "active", overrides = {}) {
  return {
    id: "subscription-reference",
    customerId: "customer-reference",
    status,
    productId: "product-reference",
    priceId: "price-reference",
    currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
    currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    latestInvoiceId: "invoice-reference",
    ...overrides
  };
}

function invoice(overrides = {}) {
  return {
    id: "invoice-reference",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    status: "paid",
    paid: true,
    paymentIntentId: "payment-intent-reference",
    chargeId: "charge-reference",
    productId: "product-reference",
    priceId: "price-reference",
    ...overrides
  };
}

function checkout(overrides = {}) {
  return {
    id: "checkout-reference",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    status: "complete",
    expiresAtIso: "2026-08-13T01:00:00.000Z",
    paymentStatus: "paid",
    ...overrides
  };
}

function event(type, objectId = "subscription-reference", object = {}, eventOverrides = {}) {
  const objectType = type.startsWith("customer.subscription")
    ? "subscription"
    : type.startsWith("invoice.")
      ? "invoice"
      : type.startsWith("checkout.")
        ? "checkout.session"
        : type.startsWith("charge.dispute.")
          ? "dispute"
          : type.startsWith("refund.")
            ? "refund"
            : type.startsWith("credit_note.")
              ? "credit_note"
              : "unknown";
  return {
    id: eventOverrides.id ?? `event-${type}`,
    created: 1_755_000_000,
    type,
    data: {
      object: {
        id: objectId,
        object: objectType,
        ...object
      }
    }
  };
}

function createFixture() {
  const receipts = new Map();
  const projectionLeases = new Map();
  const projections = [];
  const bindings = [];
  const finalized = [];
  const currentGraphs = new Map();
  const verifierEvents = new Map();
  let tokenSequence = 0;
  let failProjectionOnce = false;
  let failBindingOnce = false;
  let crashAfterProjectionOnce = false;
  let keepProjectionLease = false;
  let failCancellation = false;
  let failCancellationOnce = false;
  let failProjectionAt = null;
  let projectionAttemptCount = 0;
  let currentEntitlement = null;
  const cancellations = [];
  const expiryRequests = [];
  const readerRequests = [];

  const store = {
    async resolveStripeBinding() {
      if (failBindingOnce) {
        failBindingOnce = false;
        throw new Error("binding lookup crash");
      }
      return { status: "ready", binding: { ...baseContext } };
    },
    async claimStripeEvent(request) {
      const existing = receipts.get(request.eventId);
      const nowMs = Date.parse(request.nowIso);
      if (existing?.identity && JSON.stringify(existing.identity) !== JSON.stringify({
        eventType: request.eventType,
        stripeEventCreatedAtIso: request.stripeEventCreatedAtIso,
        objectType: request.objectType
      })) {
        return { claimStatus: "rejected", leaseToken: null, attemptCount: existing.attemptCount };
      }
      if (!existing) {
        const record = {
          identity: {
            eventType: request.eventType,
            stripeEventCreatedAtIso: request.stripeEventCreatedAtIso,
            objectType: request.objectType
          },
          status: "processing",
          leaseUntilMs: nowMs + 120_000,
          token: `receipt-token-${++tokenSequence}`,
          attemptCount: 1
        };
        receipts.set(request.eventId, record);
        return { claimStatus: "processing", leaseToken: record.token, attemptCount: record.attemptCount };
      }
      if (existing.status === "complete" || existing.status === "rejected") {
        return { claimStatus: existing.status, leaseToken: null, attemptCount: existing.attemptCount };
      }
      if (existing.status === "processing" && existing.leaseUntilMs > nowMs) {
        return { claimStatus: "processing", leaseToken: null, attemptCount: existing.attemptCount };
      }
      existing.status = "processing";
      existing.leaseUntilMs = nowMs + 120_000;
      existing.token = `receipt-token-${++tokenSequence}`;
      existing.attemptCount += 1;
      return { claimStatus: "processing", leaseToken: existing.token, attemptCount: existing.attemptCount };
    },
    async finalizeStripeEvent(request) {
      const record = [...receipts.values()].find((candidate) => candidate.token === request.leaseToken);
      if (!record || record.leaseUntilMs <= Date.parse(request.nowIso)) throw new Error("stale lease token");
      record.status = request.status;
      finalized.push(request.status);
      return true;
    },
    async claimEntitlementProjection(request) {
      const existing = projectionLeases.get(request.lifecycleId);
      const nowMs = Date.parse(request.nowIso);
      if (existing && existing.leaseUntilMs > nowMs) return null;
      const lease = {
        token: `projection-token-${++tokenSequence}`,
        leaseUntilMs: nowMs + 120_000
      };
      projectionLeases.set(request.lifecycleId, lease);
      return { projectionLeaseToken: lease.token, projectionLeaseUntilIso: new Date(lease.leaseUntilMs).toISOString() };
    },
    async bindFirstSubscription(request) {
      const lease = projectionLeases.get(request.lifecycleId);
      assert.equal(request.projectionLeaseToken, lease?.token, "first subscription binding uses the projection lease token");
      bindings.push(request);
      currentEntitlement = {
        status: request.entitlementStatus,
        disputeState: request.disputeState,
        paymentFailureStartedAtIso: request.entitlementStatus === "past_due" || request.entitlementStatus === "unpaid"
          ? (currentEntitlement?.paymentFailureStartedAtIso ?? request.nowIso)
          : null
      };
      if (!keepProjectionLease) projectionLeases.delete(request.lifecycleId);
      return "subscription-binding-reference";
    },
    async projectEntitlement(request) {
      const lease = projectionLeases.get(request.lifecycleId);
      if (!lease || lease.token !== request.projectionLeaseToken || lease.leaseUntilMs <= Date.parse(request.nowIso)) {
        throw new Error("stale projection lease token");
      }
      projectionAttemptCount += 1;
      if (failProjectionOnce || projectionAttemptCount === failProjectionAt) {
        failProjectionOnce = false;
        throw new Error("projection crash");
      }
      projections.push(request);
      currentEntitlement = {
        status: request.status,
        disputeState: request.disputeState,
        paymentFailureStartedAtIso: request.status === "past_due" || request.status === "unpaid"
          ? (currentEntitlement?.paymentFailureStartedAtIso ?? request.nowIso)
          : null
      };
      if (crashAfterProjectionOnce) {
        crashAfterProjectionOnce = false;
        throw new Error("post-projection crash");
      }
      if (!keepProjectionLease) projectionLeases.delete(request.lifecycleId);
      return "entitlement-reference";
    },
    async expireCheckoutHold(request) {
      expiryRequests.push(request);
      projections.push({ status: "checkout-expired" });
      return true;
    },
    async readEntitlement() {
      return currentEntitlement;
    }
  };

  const cancelAdapter = {
    async cancelSubscription(request) {
      cancellations.push(request);
      if (failCancellationOnce) {
        failCancellationOnce = false;
        throw new Error("injected one-time cancellation failure");
      }
      if (failCancellation) throw new Error("injected cancellation failure");
      return subscription("canceled");
    }
  };

  const reader = {
    async retrieveCurrentObjectState({ eventType, objectId }) {
      readerRequests.push({ eventType, objectId });
      const stored = currentGraphs.get(`${eventType}:${objectId}`) ?? currentGraphs.get(eventType);
      const graph = Array.isArray(stored) ? stored.shift() : stored;
      if (graph instanceof Error) throw graph;
      return graph;
    }
  };

  const verifier = {
    async constructEvent(payload) {
      const resolved = verifierEvents.get(payload);
      if (!resolved) throw new Error("invalid signature");
      return resolved;
    }
  };

  return {
    store,
    reader,
    verifier,
    cancelAdapter,
    receipts,
    projections,
    bindings,
    finalized,
    cancellations,
    expiryRequests,
    readerRequests,
    currentGraphs,
    verifierEvents,
    setProjectionCrash() {
      failProjectionOnce = true;
    },
    setProjectionCrashAt(attempt) {
      failProjectionAt = attempt;
    },
    setBindingCrash() {
      failBindingOnce = true;
    },
    setPostProjectionCrash() {
      crashAfterProjectionOnce = true;
    },
    setActiveProjectionLease() {
      keepProjectionLease = true;
    },
    setCancellationFailure() {
      failCancellation = true;
    },
    setCancellationFailureOnce() {
      failCancellationOnce = true;
    },
    setCurrentEntitlement(value) {
      currentEntitlement = value;
    }
  };
}

async function run(fixture, webhookEvent, graph, overrides = {}) {
  const payload = `payload-${webhookEvent.id}-${overrides.suffix ?? "first"}`;
  fixture.verifierEvents.set(payload, webhookEvent);
  fixture.currentGraphs.set(webhookEvent.type, graph);
  return billing.readCommentTranslatorStripeWebhookResult({
    payload,
    signature: "signed-fixture",
    env: overrides.env ?? {
      STRIPE_WEBHOOK_SECRET: "webhook-secret-reference",
      COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price-reference"
    },
    verifier: fixture.verifier,
    store: fixture.store,
    currentObjectReader: overrides.currentObjectReader ?? fixture.reader,
    subscriptionCancelAdapter: fixture.cancelAdapter,
    projectionEnabled: true,
    nowIso: overrides.nowIso ?? "2026-08-13T00:00:00.000Z",
    clock: overrides.clock
  });
}

async function withStripeFetch(responses, action) {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(`${url.pathname}${url.search}`);
    const body = responses.get(url.pathname);
    assert.ok(body, `unexpected Stripe fixture request: ${url.pathname}`);
    return {
      ok: true,
      async json() {
        return structuredClone(body);
      }
    };
  };
  try {
    return { result: await action(), requests };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function basilSubscriptionObject(status = "active") {
  return {
    id: "subscription-reference",
    object: "subscription",
    customer: "customer-reference",
    status,
    cancel_at_period_end: false,
    latest_invoice: "invoice-reference",
    items: {
      data: [{
        current_period_start: 1_754_006_400,
        current_period_end: 1_756_684_800,
        price: { id: "price-reference", product: "product-reference" }
      }]
    }
  };
}

function basilInvoiceObject(overrides = {}) {
  return {
    id: "invoice-reference",
    object: "invoice",
    customer: "customer-reference",
    status: "paid",
    paid: true,
    amount_paid: 1_000,
    payment_intent: "payment-intent-reference",
    charge: "charge-reference",
    parent: {
      type: "subscription_details",
      subscription_details: { subscription: "subscription-reference" }
    },
    ...overrides
  };
}

function creditNoteObject(overrides = {}) {
  return {
    id: "credit-reference",
    object: "credit_note",
    invoice: "invoice-reference",
    status: "issued",
    type: "post_payment",
    amount: 400,
    ...overrides
  };
}

function expireReceiptLeaseAtCheck(checkNumber) {
  let clockCalls = 0;
  return () => {
    if (clockCalls++ === 0) return 0;
    return clockCalls - 1 >= checkNumber ? billing.commentTranslatorPaidWebhookReceiptLeaseMs + 1 : 0;
  };
}

const unsigned = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "unsigned-payload",
  signature: null,
  env: { STRIPE_WEBHOOK_SECRET: "webhook-secret-reference" },
  verifier: { constructEvent: async () => { throw new Error("must not verify unsigned body"); } },
  store: createFixture().store,
  currentObjectReader: createFixture().reader,
  projectionEnabled: true
});
assert.equal(unsigned.status, "rejected", "missing signature is rejected before receipt claim");
assert.equal(billing.getCommentTranslatorStripeWebhookHttpStatus(unsigned), 400);

const signedPayload = JSON.stringify(event("customer.subscription.updated"));
const signedTimestamp = Math.floor(Date.now() / 1000);
const signedSecret = "local-fixture-signing-secret";
const signedDigest = createHmac("sha256", signedSecret).update(`${signedTimestamp}.${signedPayload}`).digest("hex");
const signedEvent = await billing.createCommentTranslatorStripeWebhookVerifier().constructEvent(
  signedPayload,
  `t=${signedTimestamp},v1=${signedDigest}`,
  signedSecret
);
assert.equal(signedEvent.id, "event-customer.subscription.updated", "default verifier authenticates the raw body signature");
const invalidSignature = await billing.readCommentTranslatorStripeWebhookResult({
  payload: signedPayload,
  signature: `t=${signedTimestamp},v1=${"0".repeat(64)}`,
  env: { STRIPE_WEBHOOK_SECRET: signedSecret },
  verifier: billing.createCommentTranslatorStripeWebhookVerifier(),
  store: createFixture().store,
  currentObjectReader: createFixture().reader,
  projectionEnabled: true
});
assert.equal(invalidSignature.status, "rejected", "invalid raw-body signature is rejected");
assert.equal(invalidSignature.reason, "invalid-signature");

const fixture = createFixture();
const activeEvent = event("customer.subscription.updated");
const activeResult = await run(fixture, activeEvent, {
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(activeResult.status, "complete");
assert.equal(fixture.projections.at(-1).status, "active");
assert.equal(fixture.projections.at(-1).subscriptionStatus, "active");
assert.equal(fixture.finalized.at(-1), "complete");
assert.equal(billing.getCommentTranslatorStripeWebhookHttpStatus(activeResult), 200);

const unpaidRenewalFixture = createFixture();
const unpaidRenewal = await run(
  unpaidRenewalFixture,
  event("customer.subscription.updated", "subscription-reference", {}, { id: "event-unpaid-renewal" }),
  {
    subscription: subscription("active", {
      currentPeriodStartIso: "2026-09-01T00:00:00.000Z",
      currentPeriodEndIso: "2026-10-01T00:00:00.000Z"
    }),
    invoice: invoice({ status: "open", paid: false })
  }
);
assert.equal(unpaidRenewal.status, "retryable", "unpaid Subscription renewal remains retryable");
assert.equal(unpaidRenewal.reason, "object-retrieval-failed");
assert.equal(unpaidRenewalFixture.projections.length, 0, "unpaid Subscription renewal cannot project a new Paid period");

const unpaidDeletedFixture = createFixture();
const unpaidDeleted = await run(
  unpaidDeletedFixture,
  event("customer.subscription.deleted", "subscription-reference", {}, { id: "event-unpaid-deleted" }),
  { subscription: subscription("canceled"), invoice: invoice({ status: "open", paid: false }) }
);
assert.equal(unpaidDeleted.status, "complete", "Subscription deletion is not blocked by invoice payment state");
assert.equal(unpaidDeletedFixture.projections.at(-1).status, "canceled");

const duplicate = await run(fixture, activeEvent, {
  subscription: subscription("active"),
  invoice: invoice(),
  ignored: true
}, { suffix: "duplicate" });
assert.equal(duplicate.status, "complete");
assert.equal(fixture.projections.length, 1, "complete duplicate is not re-fetched or projected");

const leaseBlocked = createFixture();
leaseBlocked.setActiveProjectionLease();
const first = await run(leaseBlocked, activeEvent, { subscription: subscription("active"), invoice: invoice() });
assert.equal(first.status, "complete");
const blocked = await run(leaseBlocked, event("invoice.paid", "invoice-reference"), { subscription: subscription("active"), invoice: invoice() });
assert.equal(blocked.status, "retryable", "an active projection lease is retryable and not acknowledged");
assert.equal(billing.getCommentTranslatorStripeWebhookHttpStatus(blocked), 503);

const staleReceiptFixture = createFixture();
let staleReceiptClockCalls = 0;
const staleReceipt = await run(staleReceiptFixture, activeEvent, {
  subscription: subscription("active"),
  invoice: invoice()
}, {
  clock: () => (staleReceiptClockCalls++ === 0 ? 1 : billing.commentTranslatorPaidWebhookReceiptLeaseMs + 1)
});
assert.equal(staleReceipt.status, "retryable", "a stale receipt worker cannot begin projection");
assert.equal(staleReceiptFixture.projections.length, 0, "stale receipt worker does not project entitlement");

for (const [label, checkNumber] of [
  ["projection-start", 1],
  ["post-current-refetch", 2],
  ["pre-rpc-write", 4]
]) {
  const boundaryFixture = createFixture();
  const boundaryResult = await run(
    boundaryFixture,
    event("customer.subscription.updated", "subscription-reference", {}, { id: `event-stale-${label}` }),
    { subscription: subscription("active"), invoice: invoice() },
    { clock: expireReceiptLeaseAtCheck(checkNumber) }
  );
  assert.equal(boundaryResult.status, "retryable", `stale receipt is rejected at ${label}`);
  assert.equal(boundaryFixture.projections.length, 0, `${label} stale boundary does not write projection`);
}

const staleAfterCancelFixture = createFixture();
const staleAfterCancel = await run(
  staleAfterCancelFixture,
  event("charge.dispute.funds_withdrawn", "stale-after-cancel-dispute"),
  {
    dispute: {
      id: "stale-after-cancel-dispute",
      status: "lost",
      customerId: "customer-reference",
      subscriptionId: "subscription-reference",
      invoiceId: "invoice-reference"
    },
    subscription: subscription("active"),
    invoice: invoice()
  },
  { clock: expireReceiptLeaseAtCheck(6) }
);
assert.equal(staleAfterCancel.status, "retryable", "stale receipt after external cancel cannot release capacity");
assert.equal(staleAfterCancelFixture.cancellations.length, 1, "external cancel occurred before the stale boundary");
assert.deepEqual(
  staleAfterCancelFixture.projections.map((projection) => projection.status),
  ["dispute"],
  "post-cancel stale worker retains the pre-cancel stop and capacity"
);

const bindingFixture = createFixture();
bindingFixture.store.resolveStripeBinding = async () => ({
  status: "ready",
  binding: { ...baseContext, subscriptionBindingId: null }
});
const bindingResult = await run(bindingFixture, event("checkout.session.completed", "checkout-reference"), {
  checkoutSession: checkout(),
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(bindingResult.status, "complete");
assert.equal(bindingFixture.bindings.length, 1, "first Subscription binding uses the Task 2 RPC path");
assert.equal(bindingFixture.projections.length, 0, "binding RPC owns binding and projection atomically");
assert.equal(bindingFixture.bindings[0].entitlementStatus, "active");

for (const [eventType, objectId, graph] of [
  ["customer.subscription.created", "subscription-reference", { subscription: subscription("active"), invoice: invoice() }],
  ["invoice.paid", "invoice-reference", { subscription: subscription("active"), invoice: invoice() }]
]) {
  const orderingFixture = createFixture();
  orderingFixture.store.resolveStripeBinding = async () => ({
    status: "ready",
    binding: { ...baseContext, subscriptionBindingId: null }
  });
  const orderingResult = await run(orderingFixture, event(eventType, objectId, {}, { id: `event-${eventType}-first` }), graph);
  assert.equal(orderingResult.status, "complete", `${eventType} may arrive before Checkout Session completion`);
  assert.equal(orderingFixture.bindings.length, 1, `${eventType} first binding uses the Task 2 RPC path`);
  assert.equal(orderingFixture.projections.length, 0, `${eventType} first binding remains atomic`);
}

const firstFailureBindingFixture = createFixture();
firstFailureBindingFixture.store.resolveStripeBinding = async () => ({
  status: "ready",
  binding: { ...baseContext, subscriptionBindingId: null }
});
const firstFailureBinding = await run(
  firstFailureBindingFixture,
  event("invoice.payment_failed", "invoice-reference", {}, { id: "event-first-binding-payment-failure" }),
  { subscription: subscription("past_due"), invoice: invoice({ status: "open", paid: false }) }
);
assert.equal(firstFailureBinding.status, "complete");
assert.equal(firstFailureBindingFixture.bindings[0].entitlementStatus, "past_due");
assert.equal(
  Object.hasOwn(firstFailureBindingFixture.bindings[0], "subscriptionStatus"),
  false,
  "Task 2 bind RPC infers the observed first payment failure from entitlement_status"
);

const missingSessionBinding = createFixture();
missingSessionBinding.store.resolveStripeBinding = async (request) =>
  request.stripeCheckoutSessionId === "checkout-reference" ? { status: "missing" } : { status: "ready", binding: { ...baseContext } };
const missingSessionResult = await run(missingSessionBinding, event("checkout.session.completed", "checkout-reference"), {
  checkoutSession: checkout(),
  subscription: subscription(),
  invoice: invoice()
});
assert.equal(missingSessionResult.status, "retryable", "an explicit unbound Checkout Session remains retryable");
assert.equal(missingSessionBinding.projections.length, 0);

const subscriptionConflictFixture = createFixture();
subscriptionConflictFixture.store.resolveStripeBinding = async (request) =>
  request.stripeSubscriptionId === "subscription-reference" ? { status: "conflict" } : { status: "missing" };
const subscriptionConflict = await run(
  subscriptionConflictFixture,
  event("customer.subscription.created", "subscription-reference"),
  { subscription: subscription(), invoice: invoice() }
);
assert.equal(subscriptionConflict.status, "rejected", "a different immutable Subscription binding is permanent conflict");
assert.equal(billing.getCommentTranslatorStripeWebhookHttpStatus(subscriptionConflict), 200);

const currentIdentityFixture = createFixture();
const currentIdentityConflict = await run(currentIdentityFixture, event("customer.subscription.updated"), {
  subscription: subscription("active", { id: "different-subscription-reference" }),
  invoice: invoice({ subscriptionId: "different-subscription-reference" })
});
assert.equal(currentIdentityConflict.status, "rejected", "current Subscription must match immutable binding identity");

const missingPriceConfigFixture = createFixture();
const missingPriceConfig = await run(
  missingPriceConfigFixture,
  event("customer.subscription.updated"),
  { subscription: subscription(), invoice: invoice() },
  { env: { STRIPE_WEBHOOK_SECRET: "webhook-secret-reference" } }
);
assert.equal(missingPriceConfig.status, "retryable", "missing configured Paid Price fails closed and remains retryable");
assert.equal(billing.getCommentTranslatorStripeWebhookHttpStatus(missingPriceConfig), 503);

const checkoutPaymentFixture = createFixture();
const incompleteCheckoutPayment = await run(checkoutPaymentFixture, event("checkout.session.completed", "checkout-reference"), {
  checkoutSession: checkout({ expiresAtIso: null }),
  subscription: subscription(),
  invoice: invoice()
});
assert.equal(incompleteCheckoutPayment.status, "retryable", "Checkout requires a current non-empty expires_at");
const unpaidCheckout = await run(
  createFixture(),
  event("checkout.session.completed", "checkout-reference"),
  { checkoutSession: checkout(), subscription: subscription(), invoice: invoice({ status: "open", paid: false }) },
  { suffix: "unpaid-checkout" }
);
assert.equal(unpaidCheckout.status, "retryable", "Checkout requires a current paid Invoice");
const checkoutGraphConflict = await run(
  createFixture(),
  event("checkout.session.completed", "checkout-reference"),
  { checkoutSession: checkout(), subscription: subscription(), invoice: invoice({ customerId: "different-customer-reference" }) },
  { suffix: "checkout-graph-conflict" }
);
assert.equal(checkoutGraphConflict.status, "rejected", "Checkout Session and Invoice identity mismatch is permanent conflict");

const failureFixture = createFixture();
const failed = await run(failureFixture, event("invoice.payment_failed", "invoice-reference"), {
  subscription: subscription("past_due"),
  invoice: invoice({ status: "open", paid: false })
});
assert.equal(failed.status, "complete");
assert.equal(failureFixture.projections.at(-1).status, "past_due");
assert.equal(failureFixture.projections.at(-1).subscriptionStatus, "past_due");
const recovered = await run(failureFixture, event("invoice.paid", "invoice-reference"), {
  subscription: subscription("active"),
  invoice: invoice()
}, { suffix: "recovery" });
assert.equal(recovered.status, "complete");
assert.equal(failureFixture.projections.at(-1).status, "active", "current active object clears payment failure through the RPC projection");
const refailed = await run(
  failureFixture,
  event("invoice.payment_failed", "invoice-reference", {}, { id: "event-invoice.payment_failed-after-recovery" }),
  { subscription: subscription("past_due"), invoice: invoice({ status: "open", paid: false }) },
  { suffix: "re-failure", nowIso: "2026-08-13T00:04:00.000Z" }
);
assert.equal(refailed.status, "complete");
assert.equal(failureFixture.projections.at(-1).status, "past_due", "a later payment failure starts a new current failure projection");

const orderFixture = createFixture();
const canceled = await run(orderFixture, event("customer.subscription.deleted"), {
  subscription: subscription("canceled"),
  invoice: invoice({ status: "void", paid: false })
});
assert.equal(canceled.status, "complete");
const oldActive = await run(orderFixture, event("customer.subscription.updated"), {
  subscription: subscription("canceled"),
  invoice: invoice({ status: "void", paid: false })
}, { suffix: "old-active-after-cancel" });
assert.equal(oldActive.status, "complete", `old active convergence reason=${oldActive.reason ?? "none"}`);
assert.equal(orderFixture.projections.at(-1).status, "canceled", "current Stripe object wins over an old active event");

const disputeFixture = createFixture();
let disputeBindingLookupCount = 0;
disputeFixture.store.resolveStripeBinding = async (request) => {
  disputeBindingLookupCount += 1;
  return request.stripeCustomerId === "customer-reference" && request.stripeSubscriptionId === "subscription-reference"
    ? { status: "ready", binding: { ...baseContext } }
    : { status: "missing" };
};
const disputeGraph = {
  dispute: {
    id: "dispute-reference",
    status: "needs_response",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("active"),
  invoice: invoice()
};
const dispute = await run(
  disputeFixture,
  event("charge.dispute.created", "dispute-reference"),
  [structuredClone(disputeGraph), structuredClone(disputeGraph)]
);
assert.equal(dispute.status, "complete");
assert.equal(disputeFixture.projections.at(-1).status, "dispute");
assert.equal(disputeBindingLookupCount, 2, "normal dispute payload resolves its target from the current payment graph");
assert.equal(disputeFixture.readerRequests.length, 2, "dispute target discovery is followed by a post-projection-lease refetch");
const unknownDispute = createFixture();
unknownDispute.store.resolveStripeBinding = async () => ({ status: "missing" });
const isolated = await run(unknownDispute, event("charge.dispute.created", "unknown-dispute"), {
  dispute: { id: "unknown-dispute", status: "needs_response", customerId: "unknown-customer" }
});
assert.equal(isolated.status, "retryable", "unknown dispute remains retryable for manual reconciliation");
assert.equal(isolated.reason, "binding-not-ready");
assert.equal(unknownDispute.projections.length, 0, "unknown dispute does not trigger global projection");

const lostDisputeFixture = createFixture();
const lostDispute = await run(lostDisputeFixture, event("charge.dispute.funds_withdrawn", "lost-dispute-reference"), {
  dispute: {
    id: "lost-dispute-reference",
    status: "lost",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(lostDispute.status, "complete");
assert.equal(lostDisputeFixture.cancellations.length, 1, "lost dispute requests target Subscription cancellation");
assert.equal(lostDisputeFixture.cancellations[0].subscriptionId, "subscription-reference", "only the target Subscription is canceled");
assert.deepEqual(
  lostDisputeFixture.projections.map((projection) => projection.status ?? projection.entitlementStatus),
  ["dispute", "canceled"],
  "lost dispute stops Paid and retains capacity before terminal release"
);

const cancelFailureFixture = createFixture();
cancelFailureFixture.setCancellationFailure();
const cancelFailure = await run(cancelFailureFixture, event("charge.dispute.funds_withdrawn", "cancel-failure-dispute"), {
  dispute: {
    id: "cancel-failure-dispute",
    status: "lost",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(cancelFailure.status, "retryable", "cancel failure retains capacity and remains retryable");
assert.equal(cancelFailureFixture.projections.at(-1).status, "dispute", "cancel failure leaves Paid stopped with capacity retained");

const cancelRetryFixture = createFixture();
cancelRetryFixture.setCancellationFailureOnce();
const cancelRetryEvent = event("charge.dispute.funds_withdrawn", "cancel-retry-dispute");
const cancelRetryGraph = {
  dispute: {
    id: "cancel-retry-dispute",
    status: "lost",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("active"),
  invoice: invoice()
};
const failedCancelAttempt = await run(cancelRetryFixture, cancelRetryEvent, cancelRetryGraph);
assert.equal(failedCancelAttempt.status, "retryable");
assert.equal(cancelRetryFixture.projections.at(-1).status, "dispute");
const successfulCancelRetry = await run(
  cancelRetryFixture,
  cancelRetryEvent,
  cancelRetryGraph,
  { suffix: "same-event-cancel-retry", nowIso: "2026-08-13T00:03:00.000Z" }
);
assert.equal(successfulCancelRetry.status, "complete", "same terminal event retries a failed external cancel");
assert.equal(cancelRetryFixture.cancellations.length, 2, "active current Subscription is canceled again after a failed DELETE");
assert.equal(cancelRetryFixture.projections.at(-1).status, "canceled", "capacity releases only after retry confirms canceled");

const stopProjectionCrashFixture = createFixture();
stopProjectionCrashFixture.setPostProjectionCrash();
const stopProjectionCrashEvent = event("charge.dispute.funds_withdrawn", "stop-projection-crash-dispute");
const stopProjectionCrashGraph = {
  dispute: {
    id: "stop-projection-crash-dispute",
    status: "lost",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("active"),
  invoice: invoice()
};
const stopProjectionCrash = await run(stopProjectionCrashFixture, stopProjectionCrashEvent, stopProjectionCrashGraph);
assert.equal(stopProjectionCrash.status, "retryable", "crash after stop projection remains retryable");
assert.equal(stopProjectionCrashFixture.cancellations.length, 0, "crash occurred before external cancellation");
const stopProjectionCrashRecovery = await run(
  stopProjectionCrashFixture,
  stopProjectionCrashEvent,
  stopProjectionCrashGraph,
  { suffix: "same-event-stop-projection-retry", nowIso: "2026-08-13T00:03:00.000Z" }
);
assert.equal(stopProjectionCrashRecovery.status, "complete", "same terminal event recovers after stop projection crash");
assert.equal(stopProjectionCrashFixture.cancellations.length, 1, "recovery cancels the still-active Subscription");
assert.deepEqual(
  stopProjectionCrashFixture.projections.map((projection) => projection.status),
  ["dispute", "dispute", "canceled"],
  "stop remains projected until canceled confirmation releases capacity"
);

const alreadyCanceledDisputeFixture = createFixture();
const alreadyCanceledDispute = await run(alreadyCanceledDisputeFixture, event("charge.dispute.funds_withdrawn", "already-canceled-dispute"), {
  dispute: {
    id: "already-canceled-dispute",
    status: "lost",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("canceled"),
  invoice: invoice()
});
assert.equal(alreadyCanceledDispute.status, "complete");
assert.equal(alreadyCanceledDisputeFixture.cancellations.length, 0, "confirmed canceled Subscription is not DELETEd again");
assert.equal(alreadyCanceledDisputeFixture.projections.at(-1).status, "canceled");

const cancelCrashFixture = createFixture();
cancelCrashFixture.setProjectionCrashAt(2);
const cancelCrashEvent = event("charge.dispute.funds_withdrawn", "cancel-crash-dispute");
const cancelCrashGraph = {
  dispute: {
    id: "cancel-crash-dispute",
    status: "lost",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("active"),
  invoice: invoice()
};
const cancelCrash = await run(cancelCrashFixture, cancelCrashEvent, cancelCrashGraph);
assert.equal(cancelCrash.status, "retryable", "crash after cancel remains retryable");
assert.equal(cancelCrashFixture.cancellations.length, 1);
const cancelCrashRecovery = await run(
  cancelCrashFixture,
  cancelCrashEvent,
  { ...cancelCrashGraph, subscription: subscription("canceled") },
  { suffix: "cancel-crash-retry", nowIso: "2026-08-13T00:03:00.000Z" }
);
assert.equal(cancelCrashRecovery.status, "complete");
assert.equal(cancelCrashFixture.cancellations.length, 1, "retry after confirmed cancel does not repeat DELETE");
assert.equal(cancelCrashFixture.projections.at(-1).status, "canceled", "retry releases capacity only after canceled confirmation");

const restoreFixture = createFixture();
restoreFixture.setCurrentEntitlement({
  status: "dispute",
  disputeState: "investigating",
  paymentFailureStartedAtIso: null
});
const restoredDispute = await run(restoreFixture, event("charge.dispute.closed", "won-dispute-reference"), {
  dispute: {
    id: "won-dispute-reference",
    status: "won",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(restoredDispute.status, "complete");
assert.equal(restoredDispute.projection, "ignored");
assert.equal(
  restoreFixture.projections.length,
  0,
  "won dispute cannot restore without a durable same-dispute identifier"
);

const oldWonAfterSeparateDisputeFixture = createFixture();
const disputeA = await run(oldWonAfterSeparateDisputeFixture, event("charge.dispute.created", "dispute-a"), {
  dispute: {
    id: "dispute-a",
    status: "needs_response",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(disputeA.status, "complete");
const separateDisputeStop = await run(
  oldWonAfterSeparateDisputeFixture,
  event("charge.dispute.created", "dispute-b", {}, { id: "event-dispute-b" }),
  {
    dispute: {
      id: "dispute-b",
      status: "needs_response",
      customerId: "customer-reference",
      subscriptionId: "subscription-reference",
      invoiceId: "invoice-reference"
    },
    subscription: subscription("active"),
    invoice: invoice()
  },
  { suffix: "dispute-b" }
);
assert.equal(separateDisputeStop.status, "complete");
assert.equal(separateDisputeStop.projection, "ignored", "a later dispute cannot overwrite an existing dispute stop");
const oldWonAfterSeparateDispute = await run(
  oldWonAfterSeparateDisputeFixture,
  event("charge.dispute.closed", "dispute-a", {}, { id: "event-old-won-dispute-a" }),
  {
    dispute: {
      id: "dispute-a",
      status: "won",
      customerId: "customer-reference",
      subscriptionId: "subscription-reference",
      invoiceId: "invoice-reference"
    },
    subscription: subscription("active"),
    invoice: invoice()
  },
  { suffix: "old-won-dispute-a" }
);
assert.equal(oldWonAfterSeparateDispute.status, "retryable");
assert.equal(oldWonAfterSeparateDispute.reason, "lease-conflict", "a separate ignored dispute keeps the bounded projection lease");
const oldWonAfterLeaseExpiry = await run(
  oldWonAfterSeparateDisputeFixture,
  event("charge.dispute.closed", "dispute-a", {}, { id: "event-old-won-dispute-a" }),
  {
    dispute: {
      id: "dispute-a",
      status: "won",
      customerId: "customer-reference",
      subscriptionId: "subscription-reference",
      invoiceId: "invoice-reference"
    },
    subscription: subscription("active"),
    invoice: invoice()
  },
  { suffix: "old-won-dispute-a-retry", nowIso: "2026-08-13T00:02:01.000Z" }
);
assert.equal(oldWonAfterLeaseExpiry.status, "complete");
assert.equal(oldWonAfterLeaseExpiry.projection, "ignored");
assert.deepEqual(
  oldWonAfterSeparateDisputeFixture.projections.map((projection) => projection.status),
  ["dispute"],
  "dispute A -> separate dispute stop -> old won keeps Paid stopped"
);

const stoppedRestoreFixture = createFixture();
stoppedRestoreFixture.setCurrentEntitlement({
  status: "dispute",
  disputeState: "investigating",
  paymentFailureStartedAtIso: "2026-08-12T00:00:00.000Z"
});
const stoppedRestore = await run(stoppedRestoreFixture, event("charge.dispute.closed", "stopped-won-dispute"), {
  dispute: {
    id: "stopped-won-dispute",
    status: "won",
    customerId: "customer-reference",
    subscriptionId: "subscription-reference",
    invoiceId: "invoice-reference"
  },
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(stoppedRestore.status, "complete");
assert.equal(stoppedRestoreFixture.projections.length, 0, "won dispute does not clear an existing stop reason");

const fullRefundFixture = createFixture();
let fullRefundBindingLookupCount = 0;
fullRefundFixture.store.resolveStripeBinding = async (request) => {
  fullRefundBindingLookupCount += 1;
  return request.stripeCustomerId === "customer-reference" && request.stripeSubscriptionId === "subscription-reference"
    ? { status: "ready", binding: { ...baseContext } }
    : { status: "missing" };
};
const fullRefundGraph = {
  subscription: subscription("active"),
  invoice: invoice(),
  paymentAdjustment: { status: "succeeded", successful: true, fullAmount: true, targetsCurrentPeriod: true }
};
const fullRefund = await run(
  fullRefundFixture,
  event("refund.updated", "refund-reference"),
  [structuredClone(fullRefundGraph), structuredClone(fullRefundGraph)]
);
assert.equal(fullRefund.status, "complete");
assert.equal(fullRefundFixture.cancellations.length, 1, "full target refund cancels only the bound Subscription");
assert.equal(fullRefundBindingLookupCount, 2, "normal refund payload resolves binding from the current payment graph");
assert.equal(fullRefundFixture.readerRequests.length, 2, "refund binding discovery precedes the leased current graph refetch");
assert.deepEqual(
  fullRefundFixture.projections.map((projection) => projection.status),
  ["refund_reconciliation", "canceled"],
  "successful full current-period refund stops Paid before terminal release"
);

const refundCancelRetryFixture = createFixture();
refundCancelRetryFixture.setCancellationFailureOnce();
const refundCancelRetryEvent = event("refund.updated", "refund-cancel-retry");
const failedRefundCancel = await run(refundCancelRetryFixture, refundCancelRetryEvent, structuredClone(fullRefundGraph));
assert.equal(failedRefundCancel.status, "retryable");
const successfulRefundCancelRetry = await run(
  refundCancelRetryFixture,
  refundCancelRetryEvent,
  structuredClone(fullRefundGraph),
  { suffix: "same-refund-event-cancel-retry", nowIso: "2026-08-13T00:03:00.000Z" }
);
assert.equal(successfulRefundCancelRetry.status, "complete", "same refund event retries a failed external cancel");
assert.equal(refundCancelRetryFixture.cancellations.length, 2);
assert.equal(refundCancelRetryFixture.projections.at(-1).status, "canceled");

const oldWonAfterRefundStopFixture = createFixture();
const refundChainDispute = await run(
  oldWonAfterRefundStopFixture,
  event("charge.dispute.created", "refund-chain-dispute-a", {}, { id: "event-refund-chain-dispute-a" }),
  {
    dispute: {
      id: "refund-chain-dispute-a",
      status: "needs_response",
      customerId: "customer-reference",
      subscriptionId: "subscription-reference",
      invoiceId: "invoice-reference"
    },
    subscription: subscription("active"),
    invoice: invoice()
  },
  { suffix: "refund-chain-dispute-a" }
);
assert.equal(refundChainDispute.status, "complete");
oldWonAfterRefundStopFixture.setCancellationFailure();
const refundStop = await run(
  oldWonAfterRefundStopFixture,
  event("refund.updated", "refund-chain-reference", {}, { id: "event-refund-chain-reference" }),
  structuredClone(fullRefundGraph),
  { suffix: "refund-chain-reference" }
);
assert.equal(refundStop.status, "retryable");
assert.equal(oldWonAfterRefundStopFixture.projections.at(-1).status, "refund_reconciliation");
const oldWonAfterRefundStop = await run(
  oldWonAfterRefundStopFixture,
  event("charge.dispute.closed", "refund-chain-dispute-a", {}, { id: "event-refund-chain-old-won" }),
  {
    dispute: {
      id: "refund-chain-dispute-a",
      status: "won",
      customerId: "customer-reference",
      subscriptionId: "subscription-reference",
      invoiceId: "invoice-reference"
    },
    subscription: subscription("active"),
    invoice: invoice()
  },
  { suffix: "refund-chain-old-won", nowIso: "2026-08-13T00:03:00.000Z" }
);
assert.equal(oldWonAfterRefundStop.status, "complete");
assert.equal(oldWonAfterRefundStop.projection, "ignored");
assert.deepEqual(
  oldWonAfterRefundStopFixture.projections.map((projection) => projection.status),
  ["dispute", "refund_reconciliation"],
  "dispute A -> refund stop -> old won cannot restore Paid"
);

for (const [label, adjustment] of [
  ["pending", { status: "pending", successful: false, fullAmount: true, targetsCurrentPeriod: true }],
  ["failed", { status: "failed", successful: false, fullAmount: true, targetsCurrentPeriod: true }],
  ["canceled", { status: "canceled", successful: false, fullAmount: true, targetsCurrentPeriod: true }],
  ["partial", { status: "succeeded", successful: true, fullAmount: false, targetsCurrentPeriod: true }],
  ["past-period", { status: "succeeded", successful: true, fullAmount: true, targetsCurrentPeriod: false }]
]) {
  const adjustmentFixture = createFixture();
  const adjustmentResult = await run(
    adjustmentFixture,
    event("refund.updated", `${label}-refund`, {}, { id: `event-${label}-refund` }),
    { subscription: subscription("active"), invoice: invoice(), paymentAdjustment: adjustment }
  );
  assert.equal(adjustmentResult.status, "complete", `${label} refund is acknowledged without cancellation`);
  assert.equal(adjustmentFixture.cancellations.length, 0, `${label} refund does not cancel`);
  assert.equal(adjustmentFixture.projections.length, 0, `${label} refund does not rewrite entitlement`);
}

const creditFixture = createFixture();
let fullCreditBindingLookupCount = 0;
creditFixture.store.resolveStripeBinding = async (request) => {
  fullCreditBindingLookupCount += 1;
  return request.stripeCustomerId === "customer-reference" && request.stripeSubscriptionId === "subscription-reference"
    ? { status: "ready", binding: { ...baseContext } }
    : { status: "missing" };
};
const fullCreditGraph = {
  subscription: subscription("active"),
  invoice: invoice(),
  paymentAdjustment: { status: "issued", successful: true, fullAmount: true, targetsCurrentPeriod: true }
};
const fullCredit = await run(
  creditFixture,
  event("credit_note.updated", "credit-reference"),
  [structuredClone(fullCreditGraph), structuredClone(fullCreditGraph)]
);
assert.equal(fullCredit.status, "complete");
assert.equal(fullCreditBindingLookupCount, 2, "normal credit note payload resolves binding from the current payment graph");
assert.equal(creditFixture.readerRequests.length, 2, "credit binding discovery precedes the leased current graph refetch");
assert.deepEqual(creditFixture.projections.map((projection) => projection.status), ["refund_reconciliation", "canceled"]);

const cumulativeCreditFixture = createFixture();
const cumulativeCreditReader = billing.createCommentTranslatorStripeCurrentObjectReader({
  STRIPE_SECRET_KEY: "stripe-secret-reference"
});
const cumulativeCreditResponses = new Map([
  ["/v1/credit_notes/credit-reference", creditNoteObject({ amount: 400 })],
  ["/v1/invoices/invoice-reference", basilInvoiceObject({ post_payment_credit_notes_amount: 1_000 })],
  ["/v1/subscriptions/subscription-reference", basilSubscriptionObject()]
]);
const cumulativeCreditRun = await withStripeFetch(cumulativeCreditResponses, () => run(
  cumulativeCreditFixture,
  event("credit_note.updated", "credit-reference"),
  null,
  { currentObjectReader: cumulativeCreditReader }
));
assert.equal(cumulativeCreditRun.result.status, "complete");
assert.equal(cumulativeCreditFixture.cancellations.length, 1, "multiple cumulative post-payment credits can fully adjust the Invoice");
assert.deepEqual(
  cumulativeCreditFixture.projections.map((projection) => projection.status),
  ["refund_reconciliation", "canceled"]
);

const cumulativeMixedCreditFixture = createFixture();
const cumulativeMixedCreditReader = billing.createCommentTranslatorStripeCurrentObjectReader({
  STRIPE_SECRET_KEY: "stripe-secret-reference"
});
const cumulativeMixedCreditResponses = new Map([
  ["/v1/credit_notes/credit-reference", creditNoteObject({ type: "mixed", amount: 400 })],
  ["/v1/invoices/invoice-reference", basilInvoiceObject({ post_payment_credit_notes_amount: 1_000 })],
  ["/v1/subscriptions/subscription-reference", basilSubscriptionObject()]
]);
const cumulativeMixedCreditRun = await withStripeFetch(cumulativeMixedCreditResponses, () => run(
  cumulativeMixedCreditFixture,
  event("credit_note.updated", "credit-reference", {}, { id: "event-credit-mixed-full" }),
  null,
  { currentObjectReader: cumulativeMixedCreditReader, suffix: "mixed-full" }
));
assert.equal(cumulativeMixedCreditRun.result.status, "complete");
assert.equal(cumulativeMixedCreditFixture.cancellations.length, 1, "issued mixed Credit Note uses cumulative post-payment credit");
assert.deepEqual(
  cumulativeMixedCreditFixture.projections.map((projection) => projection.status),
  ["refund_reconciliation", "canceled"]
);

for (const [label, creditOverrides, invoiceOverrides] of [
  ["partial", {}, { post_payment_credit_notes_amount: 999 }],
  ["mixed-partial", { type: "mixed", amount: 900 }, { post_payment_credit_notes_amount: 999 }],
  ["void", { status: "void", amount: 1_000 }, { post_payment_credit_notes_amount: 1_000 }],
  ["missing-cumulative", {}, {}],
  ["invalid-cumulative", {}, { post_payment_credit_notes_amount: "1000" }]
]) {
  const safeCreditFixture = createFixture();
  const safeCreditReader = billing.createCommentTranslatorStripeCurrentObjectReader({
    STRIPE_SECRET_KEY: "stripe-secret-reference"
  });
  const safeCreditResponses = new Map([
    ["/v1/credit_notes/credit-reference", creditNoteObject(creditOverrides)],
    ["/v1/invoices/invoice-reference", basilInvoiceObject(invoiceOverrides)],
    ["/v1/subscriptions/subscription-reference", basilSubscriptionObject()]
  ]);
  const safeCreditRun = await withStripeFetch(safeCreditResponses, () => run(
    safeCreditFixture,
    event("credit_note.updated", "credit-reference", {}, { id: `event-credit-${label}` }),
    null,
    { currentObjectReader: safeCreditReader, suffix: label }
  ));
  assert.equal(safeCreditRun.result.status, "complete", `${label} Credit Note is safely acknowledged`);
  assert.equal(safeCreditFixture.cancellations.length, 0, `${label} Credit Note does not falsely cancel`);
  assert.equal(safeCreditFixture.projections.length, 0, `${label} Credit Note does not rewrite entitlement`);
}

const basilFixture = createFixture();
const basilReader = billing.createCommentTranslatorStripeCurrentObjectReader({
  STRIPE_SECRET_KEY: "stripe-secret-reference"
});
const basilResponses = new Map([
  ["/v1/invoices/invoice-reference", basilInvoiceObject()],
  ["/v1/subscriptions/subscription-reference", basilSubscriptionObject()]
]);
const basilRun = await withStripeFetch(basilResponses, () => run(
  basilFixture,
  event("invoice.paid", "invoice-reference", {
    customer: "customer-reference",
    parent: {
      type: "subscription_details",
      subscription_details: { subscription: "subscription-reference" }
    }
  }),
  null,
  { currentObjectReader: basilReader }
));
assert.equal(basilRun.result.status, "complete");
const basilProjection = basilFixture.projections.at(-1);
assert.equal(basilProjection.status, "active", "Basil current-object reader output reaches projection");
assert.equal(basilProjection.stripeSubscriptionId, "subscription-reference");
assert.equal(basilProjection.currentPeriodStartIso, new Date(1_754_006_400_000).toISOString());
assert.equal(basilProjection.currentPeriodEndIso, new Date(1_756_684_800_000).toISOString());
assert.ok(
  basilRun.requests.some((request) => request.startsWith("/v1/subscriptions/subscription-reference")),
  "Basil Invoice parent resolves and fetches the bound Subscription"
);

const preservedStopFixture = createFixture();
preservedStopFixture.setCurrentEntitlement({ status: "cancel_pending", disputeState: "none", paymentFailureStartedAtIso: null });
const preservedStop = await run(preservedStopFixture, event("invoice.paid", "invoice-reference"), {
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(preservedStop.status, "complete");
assert.equal(preservedStop.projection, "ignored");
assert.equal(preservedStopFixture.projections.length, 0, "normal active projection cannot erase cancel_pending");

const preservedDisputeFailureFixture = createFixture();
preservedDisputeFailureFixture.setCurrentEntitlement({ status: "dispute", disputeState: "investigating", paymentFailureStartedAtIso: null });
const preservedDisputeFailure = await run(preservedDisputeFailureFixture, event("invoice.payment_failed", "invoice-reference"), {
  subscription: subscription("past_due"),
  invoice: invoice({ status: "open", paid: false })
});
assert.equal(preservedDisputeFailure.status, "complete");
assert.equal(preservedDisputeFailure.projection, "ignored", "payment failure cannot erase an unresolved dispute stop");
assert.equal(preservedDisputeFailureFixture.projections.length, 0);

const expiryFixture = createFixture();
expiryFixture.store.resolveStripeBinding = async () => ({
  status: "ready",
  binding: {
    ...baseContext,
    stripeSubscriptionId: null,
    subscriptionBindingId: null,
    productId: null,
    priceId: null,
    lifecycleState: "checkout_hold"
  }
});
const expiryResult = await run(expiryFixture, event("checkout.session.expired", "checkout-reference"), {
  checkoutSession: checkout({ status: "expired", paymentStatus: "unpaid", subscriptionId: null })
});
assert.equal(expiryResult.status, "complete", "current expired Session releases its Task 2 hold");
assert.equal(expiryFixture.expiryRequests.length, 1);
assert.equal(expiryFixture.projections.at(-1).status, "checkout-expired");

const activeExpiryFixture = createFixture();
const activeExpiry = await run(activeExpiryFixture, event("checkout.session.expired", "checkout-reference"), {
  checkoutSession: checkout({ status: "expired", paymentStatus: "paid" }),
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(activeExpiry.status, "complete");
assert.equal(activeExpiry.projection, "ignored");
assert.equal(activeExpiryFixture.expiryRequests.length, 0, "active Subscription hold is never released by Session expiry");

const crashFixture = createFixture();
crashFixture.setProjectionCrash();
const crashed = await run(crashFixture, event("customer.subscription.updated"), {
  subscription: subscription("active"),
  invoice: invoice()
});
assert.equal(crashed.status, "retryable", "projection failure remains retryable");
const crashRecovery = await run(crashFixture, event("customer.subscription.updated"), {
  subscription: subscription("active"),
  invoice: invoice()
}, { suffix: "after-lease-expiry", nowIso: "2026-08-13T00:03:00.000Z" });
assert.equal(crashRecovery.status, "complete", "stale receipt lease can recover after a crash");

const receiptClaimCrashFixture = createFixture();
receiptClaimCrashFixture.setBindingCrash();
const receiptClaimCrash = await run(
  receiptClaimCrashFixture,
  event("customer.subscription.updated", "subscription-reference", {}, { id: "event-crash-after-receipt-claim" }),
  { subscription: subscription("active"), invoice: invoice() }
);
assert.equal(receiptClaimCrash.status, "retryable", "a crash after receipt claim remains retryable");
const receiptClaimRecovery = await run(
  receiptClaimCrashFixture,
  event("customer.subscription.updated", "subscription-reference", {}, { id: "event-crash-after-receipt-claim" }),
  { subscription: subscription("active"), invoice: invoice() },
  { nowIso: "2026-08-13T00:03:00.000Z", suffix: "receipt-claim-recovery" }
);
assert.equal(receiptClaimRecovery.status, "complete", "receipt-claim crash recovers after the lease expires");

const postProjectionCrashFixture = createFixture();
postProjectionCrashFixture.setPostProjectionCrash();
const postProjectionCrash = await run(
  postProjectionCrashFixture,
  event("customer.subscription.updated", "subscription-reference", {}, { id: "event-crash-after-projection" }),
  { subscription: subscription("active"), invoice: invoice() }
);
assert.equal(postProjectionCrash.status, "retryable", "a crash after projection remains retryable until receipt completion");
assert.equal(postProjectionCrashFixture.projections.length, 1, "post-projection crash records the attempted projection once");
const postProjectionRecovery = await run(
  postProjectionCrashFixture,
  event("customer.subscription.updated", "subscription-reference", {}, { id: "event-crash-after-projection" }),
  { subscription: subscription("active"), invoice: invoice() },
  { nowIso: "2026-08-13T00:03:00.000Z", suffix: "post-projection-recovery" }
);
assert.equal(postProjectionRecovery.status, "complete", "post-projection crash recovers after the lease expires");

const unknown = createFixture();
const unknownResult = await run(unknown, event("customer.unknown", "unknown-reference"), {});
assert.equal(unknownResult.status, "rejected");
assert.equal(unknown.finalized.at(-1), "rejected");

const malformed = createFixture();
const malformedEvent = event("customer.subscription.updated");
delete malformedEvent.data.object.id;
const malformedResult = await run(malformed, malformedEvent, {});
assert.equal(malformedResult.status, "rejected");
assert.equal(malformedResult.eventId, malformedEvent.id, "claimable malformed event persists its event id");
assert.equal(malformed.finalized.at(-1), "rejected");
assert.equal(billing.getCommentTranslatorStripeWebhookHttpStatus(malformedResult), 200);

const unidentifiable = createFixture();
const unidentifiableEvent = event("customer.subscription.updated");
unidentifiableEvent.id = "";
const unidentifiableResult = await run(unidentifiable, unidentifiableEvent, {});
assert.equal(unidentifiableResult.status, "rejected");
assert.equal(unidentifiable.receipts.size, 0, "input without a usable event id creates no receipt");
assert.equal(billing.getCommentTranslatorStripeWebhookHttpStatus(unidentifiableResult), 400);

const runtimeSource = fs.readFileSync(path.join(root, runtimePath), "utf8");
const storeSource = fs.readFileSync(path.join(root, "lib/comment-translator-paid-entitlement-store.ts"), "utf8");
const routeSource = fs.readFileSync(path.join(root, "app/api/comment-translator/billing/webhook/route.ts"), "utf8");
const baselineSource = fs.readFileSync(path.join(root, "lib/comment-translator-public-entitlement-baseline.ts"), "utf8");
assert.match(routeSource, /await request\.text\(\)/, "webhook route reads the raw body exactly as text");
assert.doesNotMatch(routeSource, /request\.json\(\)/, "webhook route does not replace raw-body verification with parsed JSON");
assert.match(routeSource, /projectionEnabled:\s*true/, "production route enables durable projection explicitly");
assert.match(runtimeSource, /createHmac\("sha256"/, "webhook signature uses an HMAC over the raw body");
assert.match(runtimeSource, /120_000/, "runtime retains the 120-second lease boundary");
assert.match(runtimeSource, /readUnixSecondsIso\(item\?\.current_period_start\)/, "current Stripe subscription item periods are supported");
assert.match(runtimeSource, /parentReference/, "current Stripe invoice parent subscription reference is supported");
assert.match(runtimeSource, /ct_paid_claim_stripe_event|claimStripeEvent/, "runtime claims the durable event receipt before projection");
assert.match(runtimeSource, /retrieveCurrentObjectState/, "entitlement projection uses a current Stripe object reader");
assert.ok(
  runtimeSource.indexOf("projectionLease = await resolvedStore.claimEntitlementProjection") < runtimeSource.indexOf("graph = await currentReader.retrieveCurrentObjectState"),
  "projection lease is claimed before the current Stripe object refetch"
);
assert.match(runtimeSource, /getCommentTranslatorStripeWebhookHttpStatus/, "HTTP acknowledgement is derived from terminal receipt status");
assert.match(runtimeSource, /createCommentTranslatorStripeSubscriptionCancelAdapter/, "target cancellation uses an injectable adapter seam");
assert.match(runtimeSource, /receiptLeaseDeadlineMs/, "projection is guarded by the receipt lease deadline");
assert.match(runtimeSource, /\/v1\/charges\//, "refund current-object retrieval follows the Charge chain");
assert.match(runtimeSource, /\/v1\/payment_intents\//, "refund current-object retrieval follows the PaymentIntent chain");
assert.doesNotMatch(
  runtimeSource,
  /read(?:Positive|NonNegative)Integer\(charge\?\.amount_refunded\)\s*\?\?\s*readPositiveInteger\(object\.amount\)/,
  "charge amount_refunded=0 never falls back to the requested refund amount"
);
assert.match(runtimeSource, /status === "succeeded"/, "refund cancellation requires current succeeded status");
assert.match(runtimeSource, /status === "issued"/, "credit cancellation requires current issued status");
assert.match(runtimeSource, /expireCheckoutHold\(/, "expired Checkout uses the existing Task 2 hold-release RPC boundary");
assert.match(baselineSource, /checkoutRedirectAuthority:\s*"never-grants-entitlement"/, "Checkout redirect is not an entitlement authority");
assert.match(baselineSource, /plan:\s*"free"/, "public baseline remains Free-owned");
assert.match(storeSource, /requestedCheckoutSessionId\s*&&\s*!sessionRow/, "explicit Checkout Session lookup cannot fall back to another lifecycle");
assert.match(storeSource, /existingSubscriptionId\s*&&\s*existingSubscriptionId\s*!==\s*requestedSubscriptionId/, "first Subscription fallback rejects a different existing immutable binding");
assert.doesNotMatch(`${runtimeSource}\n${storeSource}`, /rawStripePayload\s*:/i, "raw Stripe payload is not a persistence field");
assert.match(storeSource, /ct_paid_claim_stripe_event/);
assert.match(storeSource, /ct_paid_finalize_stripe_event/);
assert.match(storeSource, /ct_paid_bind_first_subscription/);
assert.match(storeSource, /ct_paid_project_entitlement/);
const bindFirstInterface = /bindFirstSubscription:\s*\(request:\s*\{([\s\S]*?)\}\)\s*=>\s*Promise/.exec(storeSource)?.[1] ?? "";
assert.doesNotMatch(bindFirstInterface, /subscriptionStatus:/, "first-binding keeps Task 2 entitlement-status inference");

console.log("comment translator Paid Core v1 signed webhook fixture contract checks passed");
