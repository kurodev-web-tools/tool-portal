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
    if (specifier.startsWith("@/")) {
      const candidate = path.join(root, `${specifier.slice(2)}.ts`);
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
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
const paidPollBudget = await import(pathToFileURL(path.join(root, "lib/comment-translator-paid-poll-budget-gate.ts")).href);
const publicEntitlement = await import(pathToFileURL(path.join(root, "lib/comment-translator-public-entitlement-baseline.ts")).href);

const baseNowMs = Date.parse("2026-08-13T00:00:00.789Z");
const baseEnv = {
  STRIPE_SECRET_KEY: "test-only-secret",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_paid_usd_600",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_paid",
  COMMENT_TRANSLATOR_PAID_CHECKOUT_ENABLED: "true",
  NEXT_PUBLIC_SITE_URL: "https://example.test",
  COMMENT_TRANSLATOR_TERMS_VERSION: "terms-v1",
  COMMENT_TRANSLATOR_PRIVACY_VERSION: "privacy-v1",
  COMMENT_TRANSLATOR_PAID_CONDITIONS_VERSION: "paid-v1"
};
const allowedRegion = { status: "allowed", countryCode: "JP" };
const caller = (ownerUserId) => ({ status: "authorized", ownerUserId });
const availableCheckoutSafetyAuthorityReader = {
  async readCheckoutSafetyAuthority() {
    return { status: "ready", capacityAvailable: true, dailyPollBudget: 90_000, reservedPolls: 0 };
  }
};
const capacityAwareCheckoutSafetyAuthorityReader = (activeReservationCount) => ({
  async readCheckoutSafetyAuthority({ capacityReservationAlreadyHeld = false } = {}) {
    const effectiveReservationCount = activeReservationCount - (capacityReservationAlreadyHeld ? 1 : 0);
    return {
      status: "ready",
      capacityAvailable: effectiveReservationCount < 20,
      dailyPollBudget: 90_000,
      reservedPolls: 0
    };
  }
});
const exactConsent = (versions = baseEnv) => ({
  termsChecked: true,
  privacyChecked: true,
  paidConditionsChecked: true,
  termsVersion: versions.COMMENT_TRANSLATOR_TERMS_VERSION,
  privacyVersion: versions.COMMENT_TRANSLATOR_PRIVACY_VERSION,
  paidConditionsVersion: versions.COMMENT_TRANSLATOR_PAID_CONDITIONS_VERSION
});

const providerKillSwitchEnv = {
  COMMENT_TRANSLATOR_PAID_CHECKOUT_ENABLED: "true",
  COMMENT_TRANSLATOR_PAID_TRANSLATION_ENABLED: "true",
  COMMENT_TRANSLATOR_PAID_OPENAI_ENABLED: "true",
  COMMENT_TRANSLATOR_PAID_AZURE_FALLBACK_ENABLED: "true"
};
assert.deepEqual(
  publicEntitlement.readCommentTranslatorPaidProviderKillSwitches(providerKillSwitchEnv),
  {
    checkout_enabled: true,
    paid_translation_enabled: true,
    openai_enabled: true,
    azure_fallback_enabled: true
  },
  "Paid provider kill switches accept only the literal true/false forms"
);
for (const key of Object.keys(providerKillSwitchEnv)) {
  for (const invalidEnabledValue of ["1", "on"]) {
    const parsed = publicEntitlement.readCommentTranslatorPaidProviderKillSwitches({
      ...providerKillSwitchEnv,
      [key]: invalidEnabledValue
    });
    assert.equal(parsed, null, `${key}=${invalidEnabledValue} must fail closed instead of enabling the provider`);
  }
}

for (const invalidDailyBudget of ["1e5", "+100000", "0x186a0"]) {
  assert.equal(
    paidPollBudget.readCommentTranslatorPaidPositiveIntegerEnv(invalidDailyBudget),
    null,
    `${invalidDailyBudget} must not be accepted as a Paid daily poll budget`
  );
}
assert.equal(
  paidPollBudget.readCommentTranslatorPaidPositiveIntegerEnv("100000"),
  100000,
  "the shared Paid daily poll budget parser accepts decimal digits"
);

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

async function checkout({
  ownerUserId,
  store,
  stripe,
  consent = exactConsent(),
  regionGate = allowedRegion,
  env = baseEnv,
  checkoutSafetyAuthorityReader = availableCheckoutSafetyAuthorityReader,
  nowMs = baseNowMs
}) {
  return billing.createCommentTranslatorStripeCheckoutSessionResult({
    callerAuthorization: caller(ownerUserId),
    env,
    stripeAdapter: stripe,
    regionGate,
    consent,
    paidEntitlementStore: store,
    paidConsentStore: new ConsentStore(),
    checkoutSafetyAuthorityReader,
    nowMs
  });
}

let defaultReaderReservedPolls = 0;
let defaultReaderCapacityCount = 0;
const defaultReaderSupabase = {
  async rpc() {
    return {
      data: [{
        utc_day: "2026-08-13",
        daily_budget: null,
        reserved_polls: defaultReaderReservedPolls,
        session_reserved_polls: 0,
        session_reservation_present: false,
        next_reset_at: "2026-08-14T00:00:00.000Z"
      }],
      error: null
    };
  },
  from(table) {
    if (table === "comment_translator_paid_capacity_config") {
      return {
        select() {
          return {
            eq() {
              return { maybeSingle: async () => ({ data: { capacity_limit: 20, poll_limit: 720 }, error: null }) };
            }
          };
        }
      };
    }
    return {
      select() {
        return { in: async () => ({ count: defaultReaderCapacityCount, error: null }) };
      }
    };
  }
};
const defaultCheckoutSafetyReader = billing.createDefaultCommentTranslatorBillingCheckoutSafetyAuthorityReader(
  {
    ...baseEnv,
    NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-fixture-key",
    COMMENT_TRANSLATOR_PAID_POLL_DAILY_BUDGET: "90000"
  },
  { createSupabaseClient: () => defaultReaderSupabase }
);
assert.ok(defaultCheckoutSafetyReader, "the default Checkout safety reader is constructible with trusted server dependencies");
const emptyBucketCheckoutAuthority = await defaultCheckoutSafetyReader.readCheckoutSafetyAuthority({
  ownerUserId: "default-reader-empty-bucket",
  nowIso: new Date(baseNowMs).toISOString()
});
assert.deepEqual(
  emptyBucketCheckoutAuthority,
  { status: "ready", capacityAvailable: true, dailyPollBudget: 90_000, reservedPolls: 0 },
  "the default reader uses the configured daily budget when the UTC bucket is empty"
);
defaultReaderCapacityCount = 20;
assert.deepEqual(
  await defaultCheckoutSafetyReader.readCheckoutSafetyAuthority({
    ownerUserId: "default-reader-own-capacity-hold",
    nowIso: new Date(baseNowMs).toISOString(),
    capacityReservationAlreadyHeld: true
  }),
  { status: "ready", capacityAvailable: true, dailyPollBudget: 90_000, reservedPolls: 0 },
  "the final Checkout safety read excludes the atomic hold created for this request"
);
defaultReaderCapacityCount = 0;
defaultReaderReservedPolls = 1;
const malformedDefaultReaderAuthority = await defaultCheckoutSafetyReader.readCheckoutSafetyAuthority({
  ownerUserId: "default-reader-malformed-bucket",
  nowIso: new Date(baseNowMs).toISOString()
});
assert.deepEqual(malformedDefaultReaderAuthority, { status: "unreadable" }, "the default reader fails closed for a null bucket with reservations");
defaultReaderReservedPolls = 0;
const missingDailyBudgetReader = billing.createDefaultCommentTranslatorBillingCheckoutSafetyAuthorityReader(
  {
    ...baseEnv,
    NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-fixture-key"
  },
  { createSupabaseClient: () => defaultReaderSupabase }
);
assert.ok(missingDailyBudgetReader, "the default reader remains constructible when its daily budget setting is absent");
assert.deepEqual(
  await missingDailyBudgetReader.readCheckoutSafetyAuthority({ ownerUserId: "default-reader-missing-config", nowIso: new Date(baseNowMs).toISOString() }),
  { status: "unreadable" },
  "the default reader fails closed when no trusted daily budget exists"
);
for (const invalidDailyBudget of ["1e5", "+100000", "0x186a0"]) {
  const invalidBudgetReader = billing.createDefaultCommentTranslatorBillingCheckoutSafetyAuthorityReader(
    {
      ...baseEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.test",
      SUPABASE_SERVICE_ROLE_KEY: "server-only-fixture-key",
      COMMENT_TRANSLATOR_PAID_POLL_DAILY_BUDGET: invalidDailyBudget
    },
    { createSupabaseClient: () => defaultReaderSupabase }
  );
  assert.deepEqual(
    await invalidBudgetReader.readCheckoutSafetyAuthority({ ownerUserId: `default-reader-invalid-${invalidDailyBudget}`, nowIso: new Date(baseNowMs).toISOString() }),
    { status: "unreadable" },
    `${invalidDailyBudget} must not make Checkout appear safe when the daily poll budget is malformed`
  );
}

const portalLifecycleFixture = {
  lifecycleState: "active",
  isTerminal: false,
  stripeCustomerId: "cus_portal_fixture",
  subscriptionId: "sub_portal_fixture"
};
const portalRejectingResult = await billing.createCommentTranslatorStripePortalSessionResult({
  callerAuthorization: caller("portal-owner"),
  env: baseEnv,
  stripeAdapter: { async createPortalSession() { throw new Error("fixture Stripe failure"); } },
  paidEntitlementStore: { async readCheckoutLifecycle() { return portalLifecycleFixture; } },
  abuseRateLimit: { rateLimitAlreadyChecked: true }
});
assert.deepEqual(
  portalRejectingResult,
  { status: "unavailable", reason: "contract-management", missingEnvReferences: [] },
  "a rejected Customer Portal adapter returns a sanitized contract-management result"
);
const portalMissingSecretResult = await billing.createCommentTranslatorStripePortalSessionResult({
  callerAuthorization: caller("portal-missing-secret-owner"),
  env: { ...baseEnv, STRIPE_SECRET_KEY: undefined },
  stripeAdapter: { async createPortalSession() { throw new Error("must not call Stripe without a secret"); } },
  paidEntitlementStore: { async readCheckoutLifecycle() { return portalLifecycleFixture; } },
  abuseRateLimit: { rateLimitAlreadyChecked: true }
});
assert.deepEqual(
  portalMissingSecretResult,
  { status: "unavailable", reason: "missing-config", missingEnvReferences: ["STRIPE_SECRET_KEY"] },
  "Customer Portal is unavailable when the server Stripe secret is missing"
);
const checkoutConvergencePastDueStore = new EntitlementStore();
checkoutConvergencePastDueStore.lifecycles.set("checkout-convergence-past-due-owner", {
  lifecycleState: "past_due",
  isTerminal: false,
  stripeCustomerId: "cus_convergence_fixture",
  subscriptionId: "sub_convergence_fixture"
});
const checkoutConvergencePortalRejectingStripe = new StripeFixture();
checkoutConvergencePortalRejectingStripe.createPortalSession = async () => {
  throw new Error("fixture convergence Stripe failure");
};
const checkoutConvergencePastDueResult = await checkout({
  ownerUserId: "checkout-convergence-past-due-owner",
  store: checkoutConvergencePastDueStore,
  stripe: checkoutConvergencePortalRejectingStripe
});
assert.deepEqual(
  checkoutConvergencePastDueResult,
  { status: "unavailable", reason: "portal-payment-method-update", missingEnvReferences: [] },
  "past_due Checkout convergence catches a rejected Portal adapter"
);

const durablePaidEntitlementFixture = {
  id: "fixture-paid-entitlement",
  lifecycleId: "fixture-paid-lifecycle",
  ownerUserId: "durable-paid-owner",
  customerBindingId: "fixture-customer-binding",
  subscriptionBindingId: "fixture-subscription-binding",
  productId: "prod_paid",
  priceId: "price_paid_usd_600",
  status: "active",
  currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
  currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  disputeState: "none",
  paymentFailureStartedAtIso: null,
  projectedAtIso: "2026-08-01T00:00:00.000Z",
  updatedAtIso: "2026-08-01T00:00:00.000Z"
};
const durablePaidStoreFixture = (entitlement, lifecycle = null) => ({
  async readEntitlement() { return entitlement; },
  async readCheckoutLifecycle() { return lifecycle; }
});
const missingCheckoutConfigEnv = { ...baseEnv };
delete missingCheckoutConfigEnv.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID;
const durablePaidViewWithMissingConfig = await billing.createCommentTranslatorBillingPageBrowserSafeViewModel({
  callerAuthorization: caller("durable-paid-owner"),
  env: missingCheckoutConfigEnv,
  regionGate: allowedRegion,
  paidEntitlementStore: durablePaidStoreFixture(durablePaidEntitlementFixture),
  nowMs: baseNowMs
});
assert.equal(durablePaidViewWithMissingConfig.plan, "paid", "missing Checkout settings do not downgrade a current durable Paid entitlement to Free");
assert.equal(durablePaidViewWithMissingConfig.billingState, "paid-active", "missing Checkout settings preserve the durable Paid active state");
assert.equal(durablePaidViewWithMissingConfig.planComparison.currentPlanId, "paid", "missing Checkout settings preserve the Paid current-plan projection");
const durablePastDueEntitlementFixture = { ...durablePaidEntitlementFixture, status: "past_due" };
const durablePastDueLifecycleFixture = { lifecycleState: "past_due", isTerminal: false, stripeCustomerId: "cus_fixture" };
const durablePastDueViewWithMissingConfig = await billing.createCommentTranslatorBillingPageBrowserSafeViewModel({
  callerAuthorization: caller("durable-paid-owner"),
  env: missingCheckoutConfigEnv,
  regionGate: allowedRegion,
  paidEntitlementStore: durablePaidStoreFixture(durablePastDueEntitlementFixture, durablePastDueLifecycleFixture),
  nowMs: baseNowMs
});
assert.equal(durablePastDueViewWithMissingConfig.billingState, "paid-inactive", "missing Checkout settings preserve the durable Paid payment-stopped state");
assert.equal(durablePastDueViewWithMissingConfig.portalAvailable, true, "missing Checkout settings do not remove the existing Customer Portal path");

{
  const projectedReservationResult = await checkout({
    ownerUserId: "poll-budget-projected-reservation-owner",
    store: new EntitlementStore(),
    stripe: new StripeFixture(),
    checkoutSafetyAuthorityReader: {
      async readCheckoutSafetyAuthority() {
        return { status: "ready", capacityAvailable: true, dailyPollBudget: 90_000, reservedPolls: 71_500 };
      }
    }
  });
  assert.equal(projectedReservationResult.status, "unavailable");
  assert.equal(projectedReservationResult.reason, "poll-budget-stop", "the 80% Checkout gate includes the pending 720-poll reservation");
}

{
  const result = await checkout({
    ownerUserId: "poll-budget-owner",
    store: new EntitlementStore(),
    stripe: new StripeFixture(),
    checkoutSafetyAuthorityReader: {
      async readCheckoutSafetyAuthority() {
        return { status: "ready", capacityAvailable: true, dailyPollBudget: 90_000, reservedPolls: 72_000 };
      }
    }
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "poll-budget-stop", "the exact 80% boundary stops Checkout");
}

{
  let safetyReads = 0;
  const stripe = new StripeFixture();
  const result = await checkout({
    ownerUserId: "poll-budget-recheck-owner",
    store: new EntitlementStore(),
    stripe,
    checkoutSafetyAuthorityReader: {
      async readCheckoutSafetyAuthority() {
        safetyReads += 1;
        return safetyReads === 1
          ? { status: "ready", capacityAvailable: true, dailyPollBudget: 90_000, reservedPolls: 71_000 }
          : { status: "ready", capacityAvailable: true, dailyPollBudget: 90_000, reservedPolls: 72_000 };
      }
    }
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "poll-budget-stop", "Checkout rechecks poll authority after its durable hold before Stripe");
  assert.equal(safetyReads, 2, "Checkout uses a final server-side poll authority recheck");
  assert.equal(stripe.createCalls, 0, "a changed poll authority never creates a Stripe Checkout Session");
}

{
  const store = new EntitlementStore();
  store.lifecycles.set("existing-hold-recheck-owner", {
    lifecycleId: "existing-hold-recheck-lifecycle",
    ownerUserId: "existing-hold-recheck-owner",
    customerBindingId: "existing-hold-recheck-customer-binding",
    stripeCustomerId: "cus_existing_hold_recheck",
    lifecycleState: "checkout_hold",
    isTerminal: false,
    holdId: "opaque-existing-hold-recheck",
    checkoutExpiresAtTargetIso: "2026-08-13T00:31:00.000Z",
    checkoutSessionId: null,
    stripeExpiresAtIso: null,
    idempotencyKey: "ct-paid-checkout-existing-hold-recheck",
    subscriptionId: null,
    paymentFailureStartedAtIso: null,
    nextReconcileAtIso: "2026-08-13T00:31:00.000Z"
  });
  const stripe = new StripeFixture();
  const result = await checkout({
    ownerUserId: "existing-hold-recheck-owner",
    store,
    stripe,
    checkoutSafetyAuthorityReader: {
      async readCheckoutSafetyAuthority() {
        return { status: "ready", capacityAvailable: true, dailyPollBudget: 90_000, reservedPolls: 72_000 };
      }
    }
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "poll-budget-stop", "existing Checkout holds recheck poll authority before creating a new Stripe Session");
  assert.equal(stripe.createCalls, 0, "existing Checkout hold recovery never bypasses the poll-budget gate");
}

{
  const store = new EntitlementStore();
  const checkoutExpiresAtTargetIso = "2026-08-13T00:31:00.000Z";
  store.lifecycles.set("existing-open-at-capacity-owner", {
    lifecycleId: "existing-open-at-capacity-lifecycle",
    ownerUserId: "existing-open-at-capacity-owner",
    customerBindingId: "existing-open-at-capacity-customer-binding",
    stripeCustomerId: "cus_existing_open_at_capacity",
    lifecycleState: "checkout_hold",
    isTerminal: false,
    holdId: "opaque-existing-open-at-capacity-hold",
    checkoutExpiresAtTargetIso,
    checkoutSessionId: "cs_existing_open_at_capacity",
    stripeExpiresAtIso: checkoutExpiresAtTargetIso,
    idempotencyKey: "ct-paid-checkout-existing-open-at-capacity",
    subscriptionId: null,
    paymentFailureStartedAtIso: null,
    nextReconcileAtIso: checkoutExpiresAtTargetIso
  });
  const stripe = new StripeFixture();
  stripe.sessions.set("ct-paid-checkout-existing-open-at-capacity", {
    id: "cs_existing_open_at_capacity",
    customerId: "cus_existing_open_at_capacity",
    url: "https://checkout.example.test/existing-open-at-capacity",
    expiresAtIso: checkoutExpiresAtTargetIso,
    status: "open",
    observed: {}
  });
  const result = await checkout({
    ownerUserId: "existing-open-at-capacity-owner",
    store,
    stripe,
    checkoutSafetyAuthorityReader: capacityAwareCheckoutSafetyAuthorityReader(20)
  });
  assert.equal(result.status, "redirect-ready", "an existing open Checkout Session converges at the 20-slot boundary");
  assert.equal(stripe.createCalls, 0, "existing open Session recovery does not create another Checkout Session");
}

{
  const store = new EntitlementStore();
  const checkoutExpiresAtTargetIso = "2026-08-13T00:31:00.000Z";
  store.lifecycles.set("existing-hold-at-capacity-owner", {
    lifecycleId: "existing-hold-at-capacity-lifecycle",
    ownerUserId: "existing-hold-at-capacity-owner",
    customerBindingId: "existing-hold-at-capacity-customer-binding",
    stripeCustomerId: "cus_existing_hold_at_capacity",
    lifecycleState: "checkout_hold",
    isTerminal: false,
    holdId: "opaque-existing-hold-at-capacity-hold",
    checkoutExpiresAtTargetIso,
    checkoutSessionId: null,
    stripeExpiresAtIso: null,
    idempotencyKey: "ct-paid-checkout-existing-hold-at-capacity",
    subscriptionId: null,
    paymentFailureStartedAtIso: null,
    nextReconcileAtIso: checkoutExpiresAtTargetIso
  });
  const stripe = new StripeFixture();
  const result = await checkout({
    ownerUserId: "existing-hold-at-capacity-owner",
    store,
    stripe,
    checkoutSafetyAuthorityReader: capacityAwareCheckoutSafetyAuthorityReader(20)
  });
  assert.equal(result.status, "redirect-ready", "a session-less existing Checkout hold converges at the 20-slot boundary");
  assert.equal(stripe.createCalls, 1, "a session-less existing hold creates exactly one recovery Checkout Session");
  assert.equal(store.lifecycles.get("existing-hold-at-capacity-owner").checkoutSessionId, "cs_1");
}

for (const checkoutEnabled of [undefined, "invalid", "1", "on"]) {
  const env = { ...baseEnv };
  if (checkoutEnabled === undefined) delete env.COMMENT_TRANSLATOR_PAID_CHECKOUT_ENABLED;
  else env.COMMENT_TRANSLATOR_PAID_CHECKOUT_ENABLED = checkoutEnabled;
  const result = await checkout({
    ownerUserId: `settings-stopped-${checkoutEnabled ?? "missing"}`,
    store: new EntitlementStore(),
    stripe: new StripeFixture(),
    env
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "settings-stopped", "missing or invalid kill switch stops Checkout");
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
  const result = await checkout({
    ownerUserId: `${lifecycleState}-owner`,
    store,
    stripe: new StripeFixture(),
    consent: exactConsent({}),
    checkoutSafetyAuthorityReader: null
  });
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
    automaticTax: true, billingAddressCollection: "auto", customerUpdateAddress: "auto", paymentMethodTypes: ["card"]
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
