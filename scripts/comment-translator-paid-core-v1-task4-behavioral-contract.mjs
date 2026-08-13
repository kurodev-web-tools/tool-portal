import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only" || specifier === "@supabase/supabase-js") {
      return { shortCircuit: true, url: `data:text/javascript,export const createClient=()=>({});export default {};#${encodeURIComponent(specifier)}` };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: candidate.href };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
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

const billing = await import(pathToFileURL(path.join(root, "lib/comment-translator-billing-runtime.ts")).href);

const baseNowMs = Date.parse("2026-08-13T00:00:00.789Z");
const baseEnv = {
  STRIPE_SECRET_KEY: "test-only-secret",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_paid_usd_600",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_paid",
  NEXT_PUBLIC_SITE_URL: "https://example.test",
  COMMENT_TRANSLATOR_TERMS_VERSION: "terms-v1",
  COMMENT_TRANSLATOR_PRIVACY_VERSION: "privacy-v1",
  COMMENT_TRANSLATOR_PAID_CONDITIONS_VERSION: "paid-v1"
};
const allowedRegion = { status: "allowed", countryCode: "JP" };
const caller = (ownerUserId) => ({ status: "authorized", ownerUserId });
const exactConsent = (versions = baseEnv) => ({
  termsChecked: true,
  privacyChecked: true,
  paidConditionsChecked: true,
  termsVersion: versions.COMMENT_TRANSLATOR_TERMS_VERSION,
  privacyVersion: versions.COMMENT_TRANSLATOR_PRIVACY_VERSION,
  paidConditionsVersion: versions.COMMENT_TRANSLATOR_PAID_CONDITIONS_VERSION
});

class ConsentStore {
  constructor() {
    this.rows = new Map();
  }
  async recordConsent(request) {
    const key = `${request.ownerUserId}:${request.documentType}:${request.documentVersion}`;
    if (!this.rows.has(key)) this.rows.set(key, { ...request, consentId: `consent-${this.rows.size + 1}` });
    return this.rows.get(key);
  }
  async readConsent(request) {
    return this.rows.get(`${request.ownerUserId}:${request.documentType}:${request.documentVersion}`) ?? null;
  }
}

class EntitlementStore {
  constructor({ capacityLimit = 20 } = {}) {
    this.capacityLimit = capacityLimit;
    this.customers = new Map();
    this.lifecycles = new Map();
    this.bindShouldFail = false;
    this.finalCasShouldFail = false;
    this.expireReleaseCalls = 0;
  }
  async readCustomerBinding({ ownerUserId }) {
    return this.customers.get(ownerUserId) ?? null;
  }
  async readCheckoutLifecycle({ ownerUserId }) {
    return this.lifecycles.get(ownerUserId) ?? null;
  }
  async beginCheckout({ ownerUserId, stripeCustomerId, nowIso }) {
    const existing = this.lifecycles.get(ownerUserId);
    if (existing) {
      if (existing.lifecycleState !== "checkout_hold") throw new Error("billing state conflict");
      return this.initialization(existing);
    }
    const activeCount = [...this.lifecycles.values()].filter((row) => !row.isTerminal).length;
    if (activeCount >= this.capacityLimit) throw new Error("paid capacity is full");
    const ordinal = this.lifecycles.size + 1;
    const targetIso = new Date(Math.floor(Date.parse(nowIso) / 1000) * 1000 + 31 * 60_000).toISOString();
    const row = {
      lifecycleId: `lifecycle-${ordinal}`,
      ownerUserId,
      customerBindingId: `customer-binding-${ordinal}`,
      stripeCustomerId,
      lifecycleState: "checkout_hold",
      isTerminal: false,
      holdId: `opaque-hold-${ordinal}`,
      checkoutExpiresAtTargetIso: targetIso,
      checkoutSessionId: null,
      stripeExpiresAtIso: null,
      idempotencyKey: `ct-paid-checkout-opaque-hold-${ordinal}`,
      subscriptionId: null,
      paymentFailureStartedAtIso: null,
      nextReconcileAtIso: targetIso
    };
    this.customers.set(ownerUserId, {
      ownerUserId,
      customerBindingId: row.customerBindingId,
      stripeCustomerId
    });
    this.lifecycles.set(ownerUserId, row);
    return this.initialization(row);
  }
  initialization(row) {
    return {
      lifecycleId: row.lifecycleId,
      holdId: row.holdId,
      customerBindingId: row.customerBindingId,
      idempotencyKey: row.idempotencyKey,
      checkoutExpiresAtTargetIso: row.checkoutExpiresAtTargetIso
    };
  }
  async bindCheckoutSession(request) {
    if (this.bindShouldFail) throw new Error("binding failed");
    const row = this.lifecycles.get(request.ownerUserId);
    row.checkoutSessionId = request.stripeCheckoutSessionId;
    row.stripeExpiresAtIso = request.stripeExpiresAtIso;
    return `binding-${row.holdId}`;
  }
  async commitCheckoutRedirect(request) {
    const row = this.lifecycles.get(request.ownerUserId);
    if (this.finalCasShouldFail && row) row.lifecycleState = "expire_required";
    return Boolean(
      row &&
      !this.finalCasShouldFail &&
      !row.isTerminal &&
      (row.lifecycleState === "checkout_hold" || row.lifecycleState === "incomplete") &&
      row.lifecycleId === request.lifecycleId &&
      row.holdId === request.holdId &&
      row.customerBindingId === request.customerBindingId &&
      row.stripeCustomerId === request.stripeCustomerId &&
      row.checkoutSessionId === request.stripeCheckoutSessionId &&
      row.stripeExpiresAtIso === request.stripeExpiresAtIso &&
      row.idempotencyKey === request.idempotencyKey &&
      !row.subscriptionId
    );
  }
  async markCheckoutExpireRequired(request) {
    const row = this.lifecycles.get(request.ownerUserId);
    row.lifecycleState = "expire_required";
    row.checkoutSessionId = request.stripeCheckoutSessionId;
    row.stripeExpiresAtIso = request.stripeExpiresAtIso;
    row.nextReconcileAtIso = request.nowIso;
    return true;
  }
  async expireCheckoutHold(request) {
    this.expireReleaseCalls += 1;
    const row = this.lifecycles.get(request.ownerUserId);
    if (request.stripeSessionStatus !== "expired") throw new Error("not expired");
    if (Date.parse(request.stripeSessionCheckedAtIso) < Math.max(Date.parse(row.checkoutExpiresAtTargetIso), Date.parse(row.stripeExpiresAtIso))) {
      throw new Error("DB time rule not met");
    }
    row.lifecycleState = "incomplete_expired";
    row.isTerminal = true;
    return true;
  }
}

class StripeFixture {
  constructor() {
    this.createCalls = 0;
    this.retrieveCalls = 0;
    this.expireCalls = 0;
    this.sessions = new Map();
    this.throwFirstCreateAfterPersist = false;
    this.createdSessionStatus = "open";
    this.rejectExpireWhenExpired = false;
    this.throwExpireAfterPersist = false;
  }
  async createCustomer({ idempotencyKey }) {
    return { id: `cus_${idempotencyKey.slice(-12)}` };
  }
  async createCheckoutSession(params) {
    this.createCalls += 1;
    let session = this.sessions.get(params.idempotencyKey);
    if (!session) {
      session = {
        id: `cs_${this.sessions.size + 1}`,
        customerId: params.customerReferenceId,
        url: `https://checkout.example.test/${this.sessions.size + 1}`,
        expiresAtIso: params.expiresAtIso,
        status: this.createdSessionStatus,
        observed: params
      };
      this.sessions.set(params.idempotencyKey, session);
      if (this.throwFirstCreateAfterPersist) {
        this.throwFirstCreateAfterPersist = false;
        throw new Error("response lost");
      }
    }
    return session;
  }
  async retrieveCheckoutSession(sessionId) {
    this.retrieveCalls += 1;
    return [...this.sessions.values()].find((session) => session.id === sessionId) ?? {
      id: sessionId,
      customerId: null,
      url: null,
      expiresAtIso: null,
      status: "unknown"
    };
  }
  async expireCheckoutSession({ sessionId, idempotencyKey }) {
    this.expireCalls += 1;
    assert.match(idempotencyKey, /^ct-paid-expire-/);
    const session = [...this.sessions.values()].find((candidate) => candidate.id === sessionId) ?? {
      id: sessionId,
      customerId: null,
      url: null,
      expiresAtIso: null,
      status: "unknown"
    };
    if (this.rejectExpireWhenExpired && session.status === "expired") throw new Error("already expired");
    if (session.status !== "unknown") session.status = "expired";
    if (this.throwExpireAfterPersist) {
      this.throwExpireAfterPersist = false;
      throw new Error("expire response lost");
    }
    return session;
  }
  async createPortalSession(params) {
    return { url: `https://portal.example.test/${params.flow}` };
  }
}

async function checkout({ ownerUserId, store, stripe, consent = exactConsent(), regionGate = allowedRegion, env = baseEnv, nowMs = baseNowMs }) {
  return billing.createCommentTranslatorStripeCheckoutSessionResult({
    callerAuthorization: caller(ownerUserId),
    env,
    stripeAdapter: stripe,
    regionGate,
    consent,
    paidEntitlementStore: store,
    paidConsentStore: new ConsentStore(),
    nowMs
  });
}

for (const [regionGate, expectedReason] of [
  [null, "region-unavailable"],
  [{ status: "unavailable", reason: "region-unavailable" }, "region-unavailable"],
  [{ status: "unavailable", reason: "unsupported-region" }, "unsupported-region"]
]) {
  const stripe = new StripeFixture();
  const result = await checkout({ ownerUserId: "region-owner", store: new EntitlementStore(), stripe, regionGate });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, expectedReason);
  assert.equal(stripe.createCalls, 0, "null and unknown regions never create Checkout");
}

for (const consent of [
  { ...exactConsent(), privacyChecked: false },
  exactConsent({ ...baseEnv, COMMENT_TRANSLATOR_TERMS_VERSION: "terms-v0" })
]) {
  const stripe = new StripeFixture();
  const result = await checkout({ ownerUserId: "consent-owner", store: new EntitlementStore(), stripe, consent });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "consent-required");
  assert.equal(stripe.createCalls, 0, "missing or rotated consent never creates Checkout");
  assert.equal("url" in result, false);
}

{
  const store = new EntitlementStore();
  const stripe = new StripeFixture();
  stripe.throwFirstCreateAfterPersist = true;
  const result = await checkout({ ownerUserId: "response-loss-owner", store, stripe });
  assert.equal(result.status, "redirect-ready");
  assert.equal(stripe.createCalls, 2);
  assert.equal(stripe.sessions.size, 1, "response-loss recovery reuses one idempotency key");
  assert.equal(result.observed.expiresAtIso, "2026-08-13T00:31:00.000Z", "DB and Stripe round-trip the same UTC second");

  const rotatedEnv = { ...baseEnv, COMMENT_TRANSLATOR_TERMS_VERSION: "terms-v2" };
  const retrieveCallsBeforeRotation = stripe.retrieveCalls;
  const rotated = await checkout({
    ownerUserId: "response-loss-owner",
    store,
    stripe,
    env: rotatedEnv,
    consent: exactConsent(baseEnv)
  });
  assert.equal(rotated.status, "unavailable");
  assert.equal(rotated.reason, "consent-required");
  assert.equal(stripe.retrieveCalls, retrieveCallsBeforeRotation, "rotated consent blocks before existing Session recovery");
  assert.equal("url" in rotated, false);
}

{
  const store = new EntitlementStore();
  store.bindShouldFail = true;
  const stripe = new StripeFixture();
  stripe.throwExpireAfterPersist = true;
  const result = await checkout({ ownerUserId: "binding-failure-owner", store, stripe });
  assert.equal(result.status, "unavailable");
  assert.equal(store.lifecycles.get("binding-failure-owner").lifecycleState, "expire_required");
  assert.equal(stripe.expireCalls, 1, "durable expire_required requests Stripe expiry");
  assert.equal(stripe.retrieveCalls, 2, "an expire response loss is followed by retrieval confirmation");
  assert.equal(store.expireReleaseCalls, 0, "hold is not released before the DB time rule permits it");

  stripe.rejectExpireWhenExpired = true;
  const retry = await checkout({
    ownerUserId: "binding-failure-owner",
    store,
    stripe,
    consent: exactConsent({}),
    nowMs: baseNowMs + 31 * 60_000
  });
  assert.equal(retry.status, "unavailable");
  assert.equal(stripe.expireCalls, 1, "an already-expired retry skips the redundant expire request");
  assert.equal(store.expireReleaseCalls, 1, "confirmed expiry releases only after the DB time rule permits it");
  assert.equal(store.lifecycles.get("binding-failure-owner").lifecycleState, "incomplete_expired");
}

{
  const store = new EntitlementStore();
  const stripe = new StripeFixture();
  stripe.createdSessionStatus = "complete";
  const result = await checkout({ ownerUserId: "complete-session-owner", store, stripe });
  const lifecycle = store.lifecycles.get("complete-session-owner");
  assert.equal(lifecycle.checkoutSessionId, "cs_1", "complete Session remains immutably bound for webhook recovery");
  assert.equal(result.status, "unavailable");
  assert.equal("url" in result, false, "complete Session is never returned as a Checkout URL");
}

{
  const store = new EntitlementStore();
  store.finalCasShouldFail = true;
  const stripe = new StripeFixture();
  const result = await checkout({ ownerUserId: "cas-race-owner", store, stripe });
  assert.equal(result.status, "unavailable");
  assert.equal(store.lifecycles.get("cas-race-owner").lifecycleState, "expire_required");
  assert.equal("url" in result, false, "final CAS rejects a concurrent expire_required transition");
}

{
  const store = new EntitlementStore();
  const accepted = [];
  const stripes = new Map();
  for (let index = 1; index <= 20; index += 1) {
    const stripe = new StripeFixture();
    stripes.set(index, stripe);
    accepted.push(await checkout({ ownerUserId: `capacity-owner-${index}`, store, stripe }));
  }
  assert.equal(accepted.every((result) => result.status === "redirect-ready"), true, "20 owners are accepted");
  const rejected = await checkout({ ownerUserId: "capacity-owner-21", store, stripe: new StripeFixture() });
  assert.equal(rejected.reason, "capacity-full", "the 21st owner is rejected");
  const sameOwnerHold = store.lifecycles.get("capacity-owner-1").holdId;
  const sameOwner = await checkout({ ownerUserId: "capacity-owner-1", store, stripe: stripes.get(1) });
  assert.equal(sameOwner.status, "redirect-ready", "same owner converges to the immutable existing Session");
  assert.equal(store.lifecycles.get("capacity-owner-1").holdId, sameOwnerHold, "same owner retains one opaque hold");
  assert.doesNotMatch(sameOwnerHold, /capacity-owner-1/);
}

for (const lifecycleState of ["past_due", "unpaid"]) {
  const store = new EntitlementStore();
  store.lifecycles.set(`${lifecycleState}-owner`, {
    lifecycleId: `${lifecycleState}-lifecycle`, ownerUserId: `${lifecycleState}-owner`, customerBindingId: `${lifecycleState}-customer-binding`,
    stripeCustomerId: `${lifecycleState}-customer`, lifecycleState, isTerminal: false, holdId: null,
    checkoutExpiresAtTargetIso: null, checkoutSessionId: null, stripeExpiresAtIso: null, idempotencyKey: null,
    subscriptionId: `${lifecycleState}-subscription`, paymentFailureStartedAtIso: baseEnv.NEXT_PUBLIC_SITE_URL, nextReconcileAtIso: null
  });
  const result = await checkout({ ownerUserId: `${lifecycleState}-owner`, store, stripe: new StripeFixture(), consent: exactConsent({}) });
  assert.equal(result.status, "redirect-ready");
  assert.match(result.url, /payment-method-update/, `${lifecycleState} converges only to payment-method Portal`);
}

{
  const originalFetch = globalThis.fetch;
  const adapter = billing.createCommentTranslatorStripeAdapter({ STRIPE_SECRET_KEY: "test-only-secret" });
  const params = {
    mode: "subscription", customerReferenceId: "cus_test", productReferenceId: "prod_paid", priceReferenceId: "price_paid_usd_600",
    currency: "usd", recurringInterval: "month", clientReferenceId: "ctbill_test", successUrl: "https://example.test/success",
    cancelUrl: "https://example.test/cancel", expiresAtIso: "2026-08-13T00:31:00.000Z", idempotencyKey: "ct-paid-checkout-test",
    automaticTax: true, billingAddressCollection: "required", paymentMethodTypes: ["card"]
  };
  try {
    for (const price of [
      { id: params.priceReferenceId, product: params.productReferenceId, currency: "usd", unit_amount: 601, tax_behavior: "inclusive", recurring: { interval: "month" } },
      { id: params.priceReferenceId, product: params.productReferenceId, currency: "usd", unit_amount: 600, tax_behavior: "exclusive", recurring: { interval: "month" } }
    ]) {
      globalThis.fetch = async () => ({ ok: true, json: async () => price });
      await assert.rejects(adapter.createCheckoutSession(params), /Price binding conflict/);
    }

    let checkoutForm = null;
    globalThis.fetch = async (url, options = {}) => {
      if (String(url).includes("/v1/prices/")) {
        return {
          ok: true,
          json: async () => ({
            id: params.priceReferenceId,
            product: params.productReferenceId,
            currency: "usd",
            unit_amount: 600,
            tax_behavior: "inclusive",
            recurring: { interval: "month" }
          })
        };
      }
      checkoutForm = new URLSearchParams(options.body);
      return {
        ok: true,
        json: async () => ({
          id: "cs_policy",
          customer: params.customerReferenceId,
          url: "https://checkout.example.test/policy",
          expires_at: Date.parse(params.expiresAtIso) / 1000,
          status: "open"
        })
      };
    };
    const valid = await adapter.createCheckoutSession(params);
    assert.equal(valid.expiresAtIso, params.expiresAtIso);
    assert.equal(checkoutForm.get("expires_at"), String(Date.parse(params.expiresAtIso) / 1000), "Stripe receives the canonical DB UTC second");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log("comment translator paid core v1 Task 4 behavioral contract checks passed");
