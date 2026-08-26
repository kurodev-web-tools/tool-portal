import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const reconcilerPath = path.join(root, "lib/comment-translator-paid-control-plane-reconciler.ts");
const reconcilerSource = fs.readFileSync(reconcilerPath, "utf8");

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

const controlPlane = await import(pathToFileURL(reconcilerPath).href);

assert.match(
  reconcilerSource,
  /sessionExpiryMs\s*===\s*stripeBindingExpiryMs/,
  "Session expiry and immutable Stripe binding expiry remain strict-equality guarded"
);
assert.match(
  reconcilerSource,
  /const targetMs\s*=\s*Math\.max\(\s*Date\.parse\(lifecycle\.checkoutExpiresAtTargetIso \?\? \"\"\),\s*Date\.parse\(lifecycle\.stripeExpiresAtIso \?\? \"\"\)\s*\)/,
  "Checkout hold expiry guard continues to use the maximum target"
);
assert.match(
  reconcilerSource,
  /checkedAtMs\s*<\s*targetMs/,
  "Checkout hold expiry guard does not release before the maximum target"
);

const sessionExpiryIso = "2026-08-26T00:40:00.000Z";
const legacyExpiryIso = "2026-08-26T00:40:00.500Z";
const sessionSecondWithFractionIso = "2026-08-26T00:40:00.900Z";
const nextSecondWithFractionIso = "2026-08-26T00:40:01.100Z";
assert.equal(
  Math.floor(Date.parse(sessionExpiryIso) / 1_000),
  Math.floor(Date.parse(legacyExpiryIso) / 1_000),
  "legacy target and Session share one canonical UTC second"
);

const baseLifecycle = {
  lifecycleId: "lifecycle-fixture",
  ownerUserId: "owner-fixture",
  customerBindingId: "customer-binding-fixture",
  stripeCustomerId: "customer-fixture",
  lifecycleState: "expire_required",
  isTerminal: false,
  holdId: "hold-fixture",
  checkoutExpiresAtTargetIso: sessionExpiryIso,
  checkoutSessionId: "session-fixture",
  stripeExpiresAtIso: sessionExpiryIso,
  idempotencyKey: "idempotency-fixture",
  subscriptionId: null,
  paymentFailureStartedAtIso: null,
  nextReconcileAtIso: sessionExpiryIso
};

const createCase = ({
  targetExpiryIso = sessionExpiryIso,
  stripeExpiryIso = sessionExpiryIso,
  sessionExpiry = sessionExpiryIso,
  sessionId = "session-fixture",
  sessionCustomerId = "customer-fixture",
  nowIso = "2026-08-26T00:40:02.000Z"
} = {}) => {
  const expireCalls = [];
  const actions = controlPlane.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
    readBillingLifecycle: async () => ({
      ...baseLifecycle,
      checkoutExpiresAtTargetIso: targetExpiryIso,
      stripeExpiresAtIso: stripeExpiryIso,
      checkoutSessionId: sessionId
    }),
    entitlementStore: {
      async expireCheckoutHold(request) {
        expireCalls.push(request);
        return true;
      },
      async terminalizeUnboundCheckoutHold() { return false; },
      async resolveStripeBinding() { return { status: "missing" }; },
      async claimEntitlementProjection() { return null; },
      async bindFirstSubscription() { return false; },
      async projectEntitlement() { return "projection-fixture"; },
      async projectPaidUnentitledDisposition() { return true; }
    },
    paidPlanAuthority: { productId: "product-fixture", priceId: "price-fixture" },
    currentObjectReader: {
      async retrieveCurrentObjectState() {
        return {
          checkoutSession: {
            id: sessionId,
            customerId: sessionCustomerId,
            subscriptionId: null,
            status: "expired",
            expiresAtIso: sessionExpiry,
            paymentStatus: "unpaid"
          }
        };
      },
      async retrieveCurrentSubscriptionAdjustmentState() {
        throw new Error("expiry compatibility fixture must not read a Subscription");
      }
    },
    subscriptionCancelAdapter: {
      async cancelSubscription() {
        throw new Error("expiry compatibility fixture must not cancel a Subscription");
      }
    },
    usageStore: {
      async closeBillingPeriod() { return false; },
      async closeUtcMonth() { return false; }
    }
  });
  const request = {
    item: { lifecycleId: baseLifecycle.lifecycleId, workKind: "checkout-expiry" },
    opaqueLeaseContext: {
      lifecycleId: baseLifecycle.lifecycleId,
      reconcileLeaseToken: "lease-fixture",
      reconcileLeaseUntilIso: "2026-08-26T00:42:00.000Z"
    },
    nowIso
  };
  return {
    expireCalls,
    run: () => actions.checkoutExpiry(request)
  };
};

const expectBindingNotReady = async (testCase, message) => {
  await assert.rejects(
    testCase.run,
    (error) => error?.reconcileErrorClass === "binding-not-ready",
    message
  );
  assert.equal(testCase.expireCalls.length, 0, `${message}: hold expiry RPC is not reached`);
};

const exact = createCase();
await exact.run();
assert.equal(exact.expireCalls.length, 1, "exact Session/Stripe/hold expiry identity remains accepted");

const legacy = createCase({ targetExpiryIso: legacyExpiryIso, nowIso: "2026-08-26T00:40:00.501Z" });
await legacy.run();
assert.equal(
  legacy.expireCalls.length,
  1,
  "legacy hold target later within the same canonical second is accepted after its own expiry"
);

await expectBindingNotReady(
  createCase({
    sessionExpiry: legacyExpiryIso,
    targetExpiryIso: sessionExpiryIso,
    stripeExpiryIso: legacyExpiryIso
  }),
  "hold target earlier than Session expiry is rejected"
);

await expectBindingNotReady(
  createCase({
    targetExpiryIso: nextSecondWithFractionIso,
    nowIso: "2026-08-26T00:40:02.000Z"
  }),
  "hold target in a different canonical second is rejected"
);

await expectBindingNotReady(
  createCase({
    targetExpiryIso: "2026-08-26T00:40:01.001Z",
    nowIso: "2026-08-26T00:40:02.000Z"
  }),
  "hold target one second or more after Session expiry is rejected"
);

await expectBindingNotReady(
  createCase({ targetExpiryIso: null }),
  "null hold target is rejected"
);
await expectBindingNotReady(
  createCase({ targetExpiryIso: "not-a-timestamp" }),
  "invalid hold target is rejected"
);

await expectBindingNotReady(
  createCase({ stripeExpiryIso: "2026-08-26T00:40:00.001Z" }),
  "Session expiry and immutable Stripe binding expiry remain exact even for a one-millisecond mismatch"
);

await expectBindingNotReady(
  createCase({ targetExpiryIso: legacyExpiryIso, nowIso: "2026-08-26T00:40:00.499Z" }),
  "checkedAt guard rejects before the later legacy hold target"
);

await expectBindingNotReady(
  createCase({
    sessionExpiry: sessionSecondWithFractionIso,
    targetExpiryIso: nextSecondWithFractionIso,
    stripeExpiryIso: sessionSecondWithFractionIso,
    nowIso: "2026-08-26T00:40:02.000Z"
  }),
  "a sub-second target in the next canonical second is rejected"
);

console.log("comment translator paid core v1 Gate 0-A legacy expiry compatibility contract checks passed");
