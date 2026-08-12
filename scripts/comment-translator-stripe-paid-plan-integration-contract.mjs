import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const accountBillingShellPath = "components/account/AccountBillingShell.tsx";
const accountPreferencesShellPath = "components/account/AccountPreferencesShell.tsx";
const publicEntitlementPath = "lib/comment-translator-public-entitlement-baseline.ts";
const sessionPolicyPath = "lib/comment-translator-session-policy.ts";
const providerPolicyPath = "lib/comment-translator-provider-policy-runtime.ts";
const azureExecutionPath = "lib/comment-translator-azure-normal-translation-execution.ts";
const task1PlanPath = "docs/superpowers/plans/2026-08-12-comment-translator-paid-task1.md";

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
    if (!request.startsWith("@/")) {
      return null;
    }

    const withoutAlias = request.slice(2);
    for (const extension of [".ts", ".tsx"]) {
      const candidate = path.join(root, `${withoutAlias}${extension}`);
      if (fs.existsSync(candidate)) {
        return candidate;
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
    if (request === "server-only" || request === "next/headers" || request === "next/navigation" || request === "stripe") {
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

assert.ok(exists(billingRuntimePath), "Task 1 billing boundary exists");
assert.ok(exists(accountBillingShellPath), "Task 1 billing UI exists");
assert.ok(exists(accountPreferencesShellPath), "Task 1 account preferences UI exists");
assert.ok(exists(publicEntitlementPath), "Free entitlement baseline exists");
assert.ok(exists(sessionPolicyPath), "Free session policy exists");
assert.ok(exists(providerPolicyPath), "provider policy exists");
assert.ok(exists(azureExecutionPath), "Free Azure execution exists");
assert.ok(exists(task1PlanPath), "Task 1 implementation plan exists");

const billingSource = read(billingRuntimePath);
const accountBillingShellSource = read(accountBillingShellPath);
const accountPreferencesShellSource = read(accountPreferencesShellPath);
const publicEntitlementSource = read(publicEntitlementPath);
const sessionPolicySource = read(sessionPolicyPath);
const providerPolicySource = read(providerPolicyPath);
const azureExecutionSource = read(azureExecutionPath);

assert.match(billingSource, /^import "server-only";/m, "billing boundary remains server-only");
assert.match(billingSource, /paidCoreV1Availability:\s*"unavailable-until-durable-entitlement"/, "Paid Core v1 is explicitly disconnected until durable entitlement exists");
assert.match(billingSource, /memoryEntitlementStore:\s*"removed"/, "memory-backed Paid entitlement is marked removed");
assert.doesNotMatch(billingSource, /paidEntitlementsByBillingUser|new Map<.*Billing|pro-monthly|pro-yearly|Kuro Stream Kit Pro|currency:\s*"JPY"|monthlyAmount:\s*1_200|yearlyAmount:\s*12_000/, "old Paid plan presentation and memory entitlement are not retained in the boundary");
for (const [uiPath, uiSource] of [
  [accountBillingShellPath, accountBillingShellSource],
  [accountPreferencesShellPath, accountPreferencesShellSource]
]) {
  assert.match(uiSource, /Paid Core v1/, `${uiPath} names the explicit Paid Core v1 boundary`);
  assert.doesNotMatch(
    uiSource,
    /Kuro Stream Kit Pro|Free \/ Pro|Pro inactive|月額|年額|OpenAI mini|¥0/,
    `${uiPath} does not retain the old Paid name, price intervals, provider promise, or JPY zero price`
  );
}
assert.match(accountBillingShellSource, /paid-core-v1-unavailable/, "billing UI handles the Paid Core v1 unavailable query result");
assert.match(accountBillingShellSource, /"paid-core-v1-unavailable":\s*"Paid Core v1 は[^\n]+Free は引き続き利用できます。"/, "billing UI includes the Japanese unavailable result message");
assert.match(accountBillingShellSource, /"paid-core-v1-unavailable":\s*"Paid Core v1 is unavailable[^\n]+Free remains available\."/, "billing UI includes the English unavailable result message");
assert.match(accountBillingShellSource, /paidCoreV1Availability/, "billing UI renders browser-safe Paid Core v1 availability");
assert.match(accountBillingShellSource, /data-comment-translator-plan-comparison="free-only-paid-unavailable"/, "billing UI labels the Free-only and Paid-unavailable comparison");

assert.match(publicEntitlementSource, /billingSnapshot\??:\s*Pick<|billingSnapshot\??:/, "Free baseline accepts unavailable billing input");
assert.match(publicEntitlementSource, /billingSnapshot\?\.[\s\S]*plan/, "Free baseline does not require a readable Paid snapshot");
assert.match(sessionPolicySource, /dailyLimitMs:\s*freeLimitMs/, "Free daily limit remains server-owned");
assert.match(sessionPolicySource, /sessionLimitMs:\s*freeLimitMs/, "Free session limit remains server-owned");
assert.match(sessionPolicySource, /translatedMessagesPerMinute:\s*30/, "Free per-minute limit remains server-owned");
assert.match(sessionPolicySource, /monthlyProviderInputCharacterLimit:\s*20_000/, "Free monthly input-character cap remains server-owned");
assert.match(providerPolicySource, /freePlanPrimary:\s*"azure-translator"/, "Free provider remains Azure Translator");
assert.match(azureExecutionSource, /freePlanPrimary:\s*"azure-translator"/, "Free Azure execution contract remains present");

const billing = loadTsModule(billingRuntimePath);
const session = loadTsModule(sessionPolicyPath);

assert.equal(
  billing.commentTranslatorStripeBillingContract.paidCoreV1Availability,
  "unavailable-until-durable-entitlement",
  "Paid Core v1 stays unavailable until the durable authority is connected"
);
assert.equal(billing.commentTranslatorStripeBillingContract.memoryEntitlementStore, "removed");
assert.equal(billing.commentTranslatorStripeBillingContract.freePlanAvailability, "permanent");
assert.equal(billing.commentTranslatorStripeBillingContract.browserStorage, "forbidden");

const freeEntitlement = session.createCommentTranslatorSessionPlanEntitlement({ plan: "free" });
assert.equal(freeEntitlement.dailyLimitMs, 1_800_000);
assert.equal(freeEntitlement.sessionLimitMs, 1_800_000);
assert.equal(freeEntitlement.translatedMessagesPerMinute, 30);
assert.equal(freeEntitlement.activeSessionsPerUser, 1);
assert.equal(freeEntitlement.monthlyProviderInputCharacterLimit, 20_000);

const authorizedSnapshot = billing.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "opaque-owner-fixture"
  }
});
assert.equal(authorizedSnapshot.plan, "free", "authorized callers remain on Free while Paid is disconnected");
assert.equal(authorizedSnapshot.billingState, "free");
assert.equal(authorizedSnapshot.planEntitlement.plan, "free");
assert.equal(authorizedSnapshot.planEntitlement.dailyLimitMs, 1_800_000);
assert.equal(authorizedSnapshot.planEntitlement.sessionLimitMs, 1_800_000);
assert.equal(authorizedSnapshot.planEntitlement.translatedMessagesPerMinute, 30);
assert.equal(authorizedSnapshot.planEntitlement.monthlyProviderInputCharacterLimit, 20_000);

const paidShapedBrowserSnapshot = {
  ...authorizedSnapshot,
  plan: "paid",
  billingState: "paid-active",
  planEntitlement: {
    ...authorizedSnapshot.planEntitlement,
    plan: "paid",
    planEntitlementReferenceId: "opaque-paid-fixture",
    dailyLimitMs: 14_400_000,
    sessionLimitMs: 14_400_000,
    translatedMessagesPerMinute: 120,
    activeSessionsPerUser: 4,
    monthlyProviderInputCharacterLimit: 1_000_000
  },
  paidPlan: {
    status: "available",
    currentPeriodEndIso: null,
    provider: "stripe"
  }
};

const configuredBrowserView = billing.createCommentTranslatorBillingBrowserSafeViewModel({
  snapshot: paidShapedBrowserSnapshot,
  env: {
    STRIPE_SECRET_KEY: "fixture-secret",
    STRIPE_WEBHOOK_SECRET: "fixture-webhook-secret",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "fixture-price",
    NEXT_PUBLIC_SITE_URL: "https://example.test"
  }
});
assert.equal(configuredBrowserView.plan, "free");
assert.equal(configuredBrowserView.billingState, "free");
assert.equal(configuredBrowserView.planEntitlement.plan, "free");
assert.equal(configuredBrowserView.planEntitlement.dailyLimitMs, 1_800_000);
assert.equal(configuredBrowserView.planEntitlement.sessionLimitMs, 1_800_000);
assert.equal(configuredBrowserView.planEntitlement.translatedMessagesPerMinute, 30);
assert.equal(configuredBrowserView.planEntitlement.activeSessionsPerUser, 1);
assert.equal(configuredBrowserView.planEntitlement.monthlyProviderInputCharacterLimit, 20_000);
assert.equal(
  configuredBrowserView.paidCoreV1Availability,
  "unavailable-until-durable-entitlement",
  "browser-safe view intentionally distinguishes Paid Core v1 unavailability"
);
assert.equal(configuredBrowserView.checkoutAvailable, false, "configured Stripe does not open old Paid checkout");
assert.equal(configuredBrowserView.portalAvailable, false, "configured Stripe does not open old Paid portal");
assert.deepEqual(configuredBrowserView.planComparison.planOptions.map((option) => option.id), ["free"], "browser view exposes Free only");
assert.equal(configuredBrowserView.planComparison.planOptions[0].productName, "Free");
assert.equal(configuredBrowserView.planComparison.planOptions[0].entitlement.plan, "free");
assert.doesNotMatch(JSON.stringify(configuredBrowserView), /fixture-secret|fixture-webhook-secret|opaque-owner-fixture/, "browser view excludes private fixture values");

let checkoutAdapterCalls = 0;
const configuredCheckout = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "opaque-owner-fixture"
  },
  env: {
    STRIPE_SECRET_KEY: "fixture-secret",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "fixture-price",
    NEXT_PUBLIC_SITE_URL: "https://example.test"
  },
  stripeAdapter: {
    createCheckoutSession: async () => {
      checkoutAdapterCalls += 1;
      return { url: "https://checkout.example.test/should-not-run" };
    }
  }
});
assert.equal(configuredCheckout.status, "unavailable");
assert.equal(configuredCheckout.reason, "paid-core-v1-unavailable");
assert.equal(checkoutAdapterCalls, 0, "old Checkout adapter is not called");

const missingCheckout = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "opaque-owner-fixture"
  },
  env: {},
  stripeAdapter: {
    createCheckoutSession: async () => {
      throw new Error("old Checkout adapter must stay disconnected");
    }
  }
});
assert.equal(missingCheckout.status, "unavailable");
assert.equal(missingCheckout.reason, "paid-core-v1-unavailable", "missing Stripe config does not affect Free availability");

let portalAdapterCalls = 0;
const configuredPortal = await billing.createCommentTranslatorStripePortalSessionResult({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "opaque-owner-fixture"
  },
  env: {
    STRIPE_SECRET_KEY: "fixture-secret",
    NEXT_PUBLIC_SITE_URL: "https://example.test"
  },
  stripeAdapter: {
    createPortalSession: async () => {
      portalAdapterCalls += 1;
      return { url: "https://billing.example.test/should-not-run" };
    }
  }
});
assert.equal(configuredPortal.status, "unavailable");
assert.equal(configuredPortal.reason, "paid-core-v1-unavailable");
assert.equal(portalAdapterCalls, 0, "old Portal adapter is not called");

let webhookVerifierCalls = 0;
const activeWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "fixture-payload",
  signature: "fixture-signature",
  env: {
    STRIPE_WEBHOOK_SECRET: "fixture-webhook-secret"
  },
  verifier: {
    constructEvent: async () => {
      webhookVerifierCalls += 1;
      return {
        type: "customer.subscription.updated",
        customerReferenceId: "fixture-customer",
        subscriptionReferenceId: "fixture-subscription",
        status: "active",
        priceReferenceId: "fixture-price",
        billingUserReferenceId: null,
        currentPeriodEndMs: null
      };
    }
  }
});
assert.equal(activeWebhook.status, "rejected");
assert.equal(activeWebhook.reason, "paid-core-v1-unavailable", "old signed webhook projection cannot activate Paid");
assert.equal(webhookVerifierCalls, 0, "old webhook verifier is not invoked for the disconnected Paid path");

const unsignedWebhook = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "fixture-payload",
  signature: null,
  env: {
    STRIPE_WEBHOOK_SECRET: "fixture-webhook-secret"
  },
  verifier: {
    constructEvent: async () => {
      throw new Error("unsigned webhook must not reach verifier");
    }
  }
});
assert.equal(unsignedWebhook.status, "rejected");
assert.equal(unsignedWebhook.reason, "missing-signature");

const signedOutSnapshot = billing.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: {
    status: "unauthenticated"
  }
});
assert.equal(signedOutSnapshot.plan, "free", "signed-out callers also resolve to the Free-safe shape");
assert.equal(signedOutSnapshot.freePlanAvailable, true);

console.log("comment translator Paid Core v1 Task 1 Free baseline isolation contract checks passed");
