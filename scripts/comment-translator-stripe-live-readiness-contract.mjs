import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const readinessRuntimePath = "lib/comment-translator-stripe-live-readiness-runtime.ts";
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_STRIPE_LIVE_READINESS.md";
const webhookRoutePath = "app/api/comment-translator/billing/webhook/route.ts";
const accountBillingActionsPath = "app/account/billing/actions.ts";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function escapedFragment(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

assert.ok(exists(readinessRuntimePath), "Task 21 Stripe live readiness runtime exists");
assert.ok(exists(billingRuntimePath), "Task 15 billing runtime remains available");
assert.ok(exists(readinessDocPath), "Task 21 Stripe live readiness checklist doc exists");
assert.ok(exists(webhookRoutePath), "Stripe webhook route remains available");
assert.ok(exists(accountBillingActionsPath), "billing server actions remain available");

const readinessSource = read(readinessRuntimePath);
const billingSource = read(billingRuntimePath);
const readinessDoc = read(readinessDocPath);
const webhookRouteSource = read(webhookRoutePath);
const accountBillingActionsSource = read(accountBillingActionsPath);
const taskSource = read(taskPath);

assert.match(readinessSource, /^import "server-only";/m, "Task 21 readiness runtime is server-only");
assert.match(readinessSource, /pre-main-task-21-stripe-live-readiness-and-billing-operations/, "runtime records Task 21 stage");
assert.match(billingSource, /signed-webhook-to-server-owned-plan-entitlement-state/, "Task 15 signed-webhook entitlement anchor remains");
assert.match(webhookRouteSource, /stripe-signature/, "webhook route still reads Stripe signature header");
assert.match(accountBillingActionsSource, /createCommentTranslatorStripeCheckoutSessionResult/, "checkout action remains server-owned");

for (const requiredSection of [
  "## Purpose",
  "## Approval Gate",
  "## Product Price Checkout Portal Readiness",
  "## Signed Webhook Entitlement Evidence",
  "## Failed Canceled Expired State Review",
  "## Safe Rollback Notes",
  "## Evidence Record Template"
]) {
  assert.match(readinessDoc, new RegExp(`^${requiredSection}$`, "m"), `readiness doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Stripe Product",
  "Stripe Price",
  "Checkout",
  "Customer Portal",
  "webhook",
  "signed webhook",
  "failed",
  "canceled",
  "expired",
  "rollback",
  "same-thread/operator-local ready preflight",
  "sanitized output review",
  "explicit in-thread approval",
  "not run",
  "reference name only",
  "sanitized-metadata-only"
]) {
  assert.match(readinessDoc, new RegExp(escapedFragment(requiredFragment), "i"), `readiness doc includes ${requiredFragment}`);
}

const readiness = loadTsModule(readinessRuntimePath);
const report = readiness.createCommentTranslatorStripeLiveReadinessReport({
  approvalGate: {
    sameThreadOperatorLocalReadyPreflight: false,
    sanitizedOutputReview: false,
    explicitInThreadApproval: false
  }
});

assert.equal(
  readiness.commentTranslatorStripeLiveReadinessContract.runtime,
  "server-only",
  "Task 21 readiness contract is server-only"
);
assert.equal(
  readiness.commentTranslatorStripeLiveReadinessContract.liveModeActions,
  "not-run-without-explicit-same-thread-approval",
  "live-mode actions stay approval-gated"
);
assert.equal(report.liveModeActionStatus, "not-run", "default readiness report does not run live-mode actions");
assert.equal(report.billingSettingMutationStatus, "not-run", "default readiness report does not mutate billing settings");
assert.equal(report.overallStatus, "blocked-pending-live-mode-approval", "default report records blocker rather than overclaiming readiness");
assert.equal(report.outputPolicy, "sanitized-metadata-only", "report output policy is sanitized");
assert.deepEqual(
  report.requiredEnvReferences.sort(),
  ["COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID", "NEXT_PUBLIC_SITE_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"].sort(),
  "report lists env reference names only"
);
assert.ok(
  report.checklist.every((item) => item.status === "blocked-pending-operator-evidence" || item.status === "verified-local-contract"),
  "checklist is local evidence or explicit blocker only"
);

const approvedGate = readiness.reviewCommentTranslatorStripeLiveReadinessApprovalGate({
  sameThreadOperatorLocalReadyPreflight: true,
  sanitizedOutputReview: true,
  explicitInThreadApproval: true
});
assert.equal(approvedGate.status, "approved-for-manual-operator-action", "all three gates are required for approval status");

for (const status of ["past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"]) {
  const reviewed = readiness.reviewCommentTranslatorStripeSubscriptionStatusForLaunch(status);
  assert.equal(reviewed.entitlementPlan, "free", `${status} degrades to Free entitlement`);
  assert.equal(reviewed.billingState, "paid-inactive", `${status} records paid-inactive billing state`);
  assert.equal(reviewed.sessionAccess, "safe-free-limits", `${status} keeps safe Free limits`);
}

for (const status of ["active", "trialing"]) {
  const reviewed = readiness.reviewCommentTranslatorStripeSubscriptionStatusForLaunch(status);
  assert.equal(reviewed.entitlementPlan, "paid", `${status} keeps paid entitlement`);
  assert.equal(reviewed.sessionAccess, "paid-limits", `${status} keeps paid limits`);
}

const serialized = JSON.stringify({ report, approvedGate });
assert.doesNotMatch(
  serialized,
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|Bearer\s+\S+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|server-only-owner-value|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
  "Task 21 report output excludes secret, token, authorization, owner, provider target, and liveChatId values"
);

for (const [file, source] of [
  [readinessRuntimePath, readinessSource],
  [readinessDocPath, readinessDoc],
  [taskPath, taskSource]
]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    `${file} does not contain secret values or private provider identifiers`
  );
}

assert.match(taskSource, /Task 21[\s\S]*Stripe live readiness and billing operations[\s\S]*Status: complete/i, "task.md records Task 21 completion");
assert.match(taskSource, /width checks skipped[\s\S]*no visible UI\/CSS\/layout change/i, "task.md records width-check skip reason");

console.log("comment translator Stripe live readiness contract checks passed");
