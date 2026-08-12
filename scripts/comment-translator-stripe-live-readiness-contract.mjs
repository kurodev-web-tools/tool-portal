import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const webhookRoutePath = "app/api/comment-translator/billing/webhook/route.ts";
const accountBillingActionsPath = "app/account/billing/actions.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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
    if (request === "server-only" || request === "stripe") {
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

const billingSource = read(billingRuntimePath);
const webhookRouteSource = read(webhookRoutePath);
const accountBillingActionsSource = read(accountBillingActionsPath);

assert.match(billingSource, /^import "server-only";/m, "Task 1 billing runtime is server-only");
assert.match(
  billingSource,
  /paidCoreV1Availability:\s*"unavailable-until-durable-entitlement"/,
  "Task 1 Paid Core v1 remains unavailable until durable entitlement exists"
);
assert.match(billingSource, /memoryEntitlementStore:\s*"removed"/, "Task 1 memory entitlement store remains removed");
assert.match(billingSource, /browserStorage:\s*"forbidden"/, "Task 1 browser storage remains forbidden");
assert.doesNotMatch(
  billingSource,
  /signed-webhook-to-server-owned-plan-entitlement-state/,
  "Task 1 billing runtime does not retain the superseded signed-webhook entitlement anchor"
);

assert.match(webhookRouteSource, /from "next\/server"/, "Task 1 webhook route remains server-owned");
assert.doesNotMatch(webhookRouteSource, /^"use client";/m, "Task 1 webhook route is not browser-owned");
assert.match(webhookRouteSource, /request\.headers\.get\("stripe-signature"\)/, "webhook route reads stripe-signature");
assert.match(
  webhookRouteSource,
  /await readCommentTranslatorStripeWebhookResult\s*\(/,
  "webhook route delegates to the Task 1 billing runtime"
);
assert.match(accountBillingActionsSource, /^"use server";/m, "Task 1 billing actions remain server-owned");

const billing = loadTsModule(billingRuntimePath);
assert.equal(billing.commentTranslatorStripeBillingContract.runtime, "server-only");
assert.equal(
  billing.commentTranslatorStripeBillingContract.paidCoreV1Availability,
  "unavailable-until-durable-entitlement"
);
assert.equal(billing.commentTranslatorStripeBillingContract.memoryEntitlementStore, "removed");
assert.equal(billing.commentTranslatorStripeBillingContract.browserStorage, "forbidden");

const configuredEnv = {
  STRIPE_SECRET_KEY: "fixture-secret-key-reference",
  STRIPE_WEBHOOK_SECRET: "fixture-webhook-secret-reference",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "fixture-paid-price-reference",
  NEXT_PUBLIC_SITE_URL: "https://fixture.invalid"
};
const authorizedCaller = {
  status: "authorized",
  ownerUserId: "fixture-owner-reference"
};

let adapterCallCount = 0;
const checkoutResult = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization: authorizedCaller,
  env: configuredEnv,
  customerEmail: "fixture-email-reference",
  abuseRateLimit: {
    rateLimitAlreadyChecked: true
  },
  stripeAdapter: {
    async createCheckoutSession() {
      adapterCallCount += 1;
      return { url: "https://fixture.invalid/should-not-be-returned" };
    }
  }
});

assert.deepEqual(
  checkoutResult,
  {
    status: "unavailable",
    reason: "paid-core-v1-unavailable",
    missingEnvReferences: []
  },
  "authorized configured Checkout remains fail-closed"
);
assert.equal(adapterCallCount, 0, "fail-closed Checkout never calls the injected adapter");

let verifierCallCount = 0;
const webhookResult = await billing.readCommentTranslatorStripeWebhookResult({
  payload: "fixture-webhook-payload",
  signature: "fixture-signature-reference",
  env: configuredEnv,
  verifier: {
    async constructEvent() {
      verifierCallCount += 1;
      throw new Error("injected verifier must not be called");
    }
  }
});

assert.deepEqual(
  webhookResult,
  {
    status: "rejected",
    reason: "paid-core-v1-unavailable"
  },
  "authorized signed webhook remains fail-closed"
);
assert.equal(verifierCallCount, 0, "fail-closed webhook never calls the injected verifier");

const serializedOutputs = JSON.stringify({
  checkoutResult,
  webhookResult,
  adapterCallCount,
  verifierCallCount
});
assert.doesNotMatch(
  serializedOutputs,
  /fixture-(?:secret|webhook|paid|owner|email|signature)|sk_(?:live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|Bearer\s+\S+|access_token|refresh_token|authorization_code|liveChatId|providerChannelId/i,
  "Task 1 local evidence contains no secret, token, or private identifier values"
);

console.log("comment translator Task 1 superseded/fail-closed Stripe boundary contract checks passed");
