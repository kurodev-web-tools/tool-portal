import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const paidEntitlementTestStorePath = "lib/comment-translator-paid-entitlement-test-store.ts";
const accountBillingPagePath = "app/account/billing/page.tsx";
const accountBillingActionsPath = "app/account/billing/actions.ts";
const accountBillingShellPath = "components/account/AccountBillingShell.tsx";
const webhookRoutePath = "app/api/comment-translator/billing/webhook/route.ts";
const accountPagePath = "components/account/AccountPreferencesShell.tsx";
const toolDockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const sessionActionPath = "app/tools/comment-translator/actions.ts";
const sessionRoutePath = "app/api/comment-translator/session/route.ts";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function resolveAlias(request) {
    if (request.startsWith("@/")) {
      const withoutAlias = request.slice(2);
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.join(root, `${withoutAlias}${extension}`);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) {
      return moduleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
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
    if (request === "server-only" || request === "next/navigation" || request === "next/headers") {
      return {};
    }

    const aliasPath = resolveAlias(request);
    if (aliasPath) {
      return compileTsModule(aliasPath);
    }

    if (request.startsWith(".") && parent?.filename) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.resolve(path.dirname(parent.filename), `${request}${extension}`);
        if (fs.existsSync(candidate)) {
          return compileTsModule(candidate);
        }
      }
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

assert.ok(exists(billingRuntimePath), "Task 15 server-only billing runtime exists");
assert.ok(exists(accountBillingPagePath), "account billing page exists");
assert.ok(exists(accountBillingActionsPath), "account billing server actions exist");
assert.ok(exists(accountBillingShellPath), "account billing shell exists");
assert.ok(exists(webhookRoutePath), "Stripe webhook route exists");
assert.ok(exists(requirementsPath), "canonical public requirements remain available");

const billingSource = read(billingRuntimePath);
const accountBillingPageSource = read(accountBillingPagePath);
const accountBillingActionsSource = read(accountBillingActionsPath);
const accountBillingShellSource = read(accountBillingShellPath);
const webhookRouteSource = read(webhookRoutePath);
const accountPageSource = read(accountPagePath);
const toolDockSource = read(toolDockPath);
const sessionActionSource = read(sessionActionPath);
const sessionRouteSource = read(sessionRoutePath);
const requirementsSource = read(requirementsPath);
const taskSource = read(taskPath);

assert.match(billingSource, /^import "server-only";/m, "billing runtime is server-only");
assert.match(billingSource, /Checkout Sessions/i, "billing runtime records Checkout Sessions integration intent");
assert.match(billingSource, /Customer Portal/i, "billing runtime records Customer Portal integration intent");
assert.match(webhookRouteSource, /STRIPE_WEBHOOK_SECRET/, "webhook route uses webhook secret reference");
assert.match(webhookRouteSource, /readCommentTranslatorStripeWebhookResult/, "webhook route delegates to the billing runtime");
assert.match(accountBillingActionsSource, /createCommentTranslatorBillingCheckoutAction/, "checkout server action exists");
assert.match(accountBillingActionsSource, /createCommentTranslatorBillingPortalAction/, "portal server action exists");
assert.match(accountBillingPageSource, /AccountBillingShell/, "billing page renders account billing shell");
assert.match(accountPageSource, /\/account\/billing/, "account page links to billing");
assert.match(toolDockSource, /data-comment-translator-billing-entry="stripe-paid-plan"/, "translator UI includes paid-plan entry point");
assert.match(sessionActionSource, /readCommentTranslatorBillingEntitlementSnapshot/, "server actions read billing entitlement state");
assert.match(sessionRouteSource, /readCommentTranslatorBillingEntitlementSnapshot/, "session route reads billing entitlement state");
assert.match(requirementsSource, /Free\/Paid plan state when entitlement enforcement exists/, "requirements retain Free/Paid usage display");

for (const source of [
  billingSource,
  accountBillingPageSource,
  accountBillingActionsSource,
  accountBillingShellSource,
  webhookRouteSource,
  accountPageSource,
  toolDockSource,
  sessionActionSource,
  sessionRouteSource
]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "Task 15 source does not contain Stripe secret values, provider credentials, provider targets, authorization values, or private keys"
  );
}

const billing = loadTsModule(billingRuntimePath);
const paidEntitlementTestStore = loadTsModule(paidEntitlementTestStorePath);

assert.equal(
  billing.commentTranslatorStripeBillingContract.runtime,
  "server-only",
  "billing contract is server-only"
);
assert.equal(
  billing.commentTranslatorStripeBillingContract.freePlanAvailability,
  "permanent",
  "free plan remains permanent"
);
assert.deepEqual(
  billing.commentTranslatorStripeBillingContract.stripeSurfaces,
  ["Checkout Sessions", "Billing Customer Portal", "signed webhook"],
  "Task 15 uses Stripe Checkout, Portal, and signed webhooks"
);
assert.equal(
  billing.commentTranslatorStripeBillingContract.browserStorage,
  "forbidden",
  "billing integration does not use browser storage"
);

const unsignedWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: null,
  env: {
    STRIPE_WEBHOOK_SECRET: "present-for-test-only"
  },
  verifier: {
    constructEvent: async () => {
      throw new Error("should not be called without a signature");
    }
  }
});
assert.equal(unsignedWebhook.status, "rejected");
assert.equal(unsignedWebhook.reason, "missing-signature");
assert.doesNotMatch(JSON.stringify(unsignedWebhook), /present-for-test-only/, "webhook output excludes secret values");

const customerUserReference = billing.createCommentTranslatorBillingUserReference({
  status: "authorized",
  ownerUserId: "server-only-owner-value"
});
assert.match(customerUserReference, /^ctbill_[a-f0-9]{24}$/, "billing user reference is sanitized metadata");
assert.doesNotMatch(customerUserReference, /server-only-owner-value/, "billing user reference does not expose owner id value");

let observedCheckoutParams = null;
const configuredCheckout = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  env: {
    STRIPE_SECRET_KEY: "present-for-test-only",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_test_public_paid",
    NEXT_PUBLIC_SITE_URL: "https://example.test"
  },
  stripeAdapter: {
    createCheckoutSession: async (params) => {
      observedCheckoutParams = params;
      return { url: "https://checkout.stripe.test/session" };
    }
  }
});
assert.equal(configuredCheckout.status, "redirect-ready");
assert.equal(configuredCheckout.url, "https://checkout.stripe.test/session");
assert.equal(observedCheckoutParams.mode, "subscription");
assert.equal(observedCheckoutParams.priceReferenceId, "price_test_public_paid");
assert.equal(observedCheckoutParams.clientReferenceId, customerUserReference);
assert.doesNotMatch(JSON.stringify(configuredCheckout), /present-for-test-only|server-only-owner-value/, "checkout output excludes secret and owner id values");

const missingCheckout = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  env: {},
  stripeAdapter: {
    createCheckoutSession: async () => {
      throw new Error("should not run when config is missing");
    }
  }
});
assert.equal(missingCheckout.status, "unavailable");
assert.deepEqual(
  missingCheckout.missingEnvReferences.sort(),
  ["COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID", "NEXT_PUBLIC_SITE_URL", "STRIPE_SECRET_KEY"].sort(),
  "checkout reports missing env references by name only"
);

const durableEntitlementStore = paidEntitlementTestStore.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
const activeWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: "signed-test-payload",
  env: {
    STRIPE_WEBHOOK_SECRET: "present-for-test-only",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_test_public_paid"
  },
  verifier: {
    constructEvent: async () => ({
      eventReferenceId: "evt_active",
      eventCreatedAtMs: 2_000,
      type: "customer.subscription.updated",
      customerReferenceId: "cus_public_reference",
      subscriptionReferenceId: "sub_public_reference",
      status: "active",
      priceReferenceId: "price_test_public_paid",
      billingUserReferenceId: customerUserReference,
      currentPeriodEndMs: 1_900_000_000_000
    })
  },
  entitlementStore: durableEntitlementStore
});
assert.equal(activeWebhook.status, "applied");
assert.equal(activeWebhook.plan, "paid");
assert.equal(activeWebhook.billingState, "paid-active");
assert.doesNotMatch(JSON.stringify(activeWebhook), /present-for-test-only|server-only-owner-value/, "webhook output excludes secret and owner id values");

const activeSnapshot = await billing.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  entitlementStore: durableEntitlementStore
});
assert.equal(activeSnapshot.plan, "paid", "applied active webhook activates paid plan");
assert.equal(activeSnapshot.billingState, "paid-active");
assert.equal(activeSnapshot.planEntitlement.dailyLimitMs, 7_200_000, "paid plan increases server-owned daily limit");

const canceledWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: "signed-test-payload",
  env: {
    STRIPE_WEBHOOK_SECRET: "present-for-test-only",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_test_public_paid"
  },
  verifier: {
    constructEvent: async () => ({
      eventReferenceId: "evt_canceled",
      eventCreatedAtMs: 3_000,
      type: "customer.subscription.deleted",
      customerReferenceId: "cus_public_reference",
      subscriptionReferenceId: "sub_public_reference",
      status: "canceled",
      priceReferenceId: "price_test_public_paid",
      billingUserReferenceId: customerUserReference,
      currentPeriodEndMs: 1_900_000_000_000
    })
  },
  entitlementStore: durableEntitlementStore
});
assert.equal(canceledWebhook.status, "applied");
assert.equal(canceledWebhook.plan, "free", "canceled paid state degrades to Free plan");
assert.equal(canceledWebhook.billingState, "paid-inactive");

const inactiveSnapshot = await billing.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  entitlementStore: durableEntitlementStore
});
assert.equal(inactiveSnapshot.plan, "free", "inactive paid snapshot uses Free plan for session limits");
assert.equal(inactiveSnapshot.billingState, "paid-inactive");
assert.equal(inactiveSnapshot.freePlanAvailable, true);

const signedOutSnapshot = await billing.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "unauthenticated"
  }
});
assert.equal(signedOutSnapshot.plan, "free", "signed-out or unavailable callers safely receive Free plan");
assert.equal(signedOutSnapshot.freePlanAvailable, true);

assert.match(taskSource, /Stripe paid-plan integration/i, "task board still tracks Task 15");

console.log("comment translator Stripe paid-plan integration contract checks passed");
