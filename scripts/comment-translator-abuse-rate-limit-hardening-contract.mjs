import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const abuseRuntimePath = "lib/comment-translator-abuse-rate-limit-runtime.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const providerRuntimePath = "lib/comment-translator-provider-execution-runtime.ts";
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const privateLaunchPath = "lib/comment-translator-private-launch-access-gate.ts";
const toolActionsPath = "app/tools/comment-translator/actions.ts";
const sessionRoutePath = "app/api/comment-translator/session/route.ts";
const credentialStatusRoutePath = "app/api/comment-translator/youtube/credential-status/route.ts";
const disconnectRoutePath = "app/api/comment-translator/youtube/disconnect/route.ts";
const billingActionsPath = "app/account/billing/actions.ts";
const webhookRoutePath = "app/api/comment-translator/billing/webhook/route.ts";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-free-public-beta-integration...HEAD", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const uncommittedDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
}

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) {
      return moduleCache.get(normalizedModulePath).exports;
    }

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
    if (request === "server-only" || request === "stripe") {
      return {};
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
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

assert.ok(exists(abuseRuntimePath), "Task 22 server-only abuse/rate-limit runtime exists");
assert.ok(exists(sessionRuntimePath), "session runtime remains available");
assert.ok(exists(providerRuntimePath), "provider execution runtime remains available");
assert.ok(exists(billingRuntimePath), "billing runtime remains available");
assert.ok(exists(privateLaunchPath), "private launch gate remains available");

const abuseSource = read(abuseRuntimePath);
const sessionRuntimeSource = read(sessionRuntimePath);
const providerRuntimeSource = read(providerRuntimePath);
const billingRuntimeSource = read(billingRuntimePath);
const privateLaunchSource = read(privateLaunchPath);
const toolActionsSource = read(toolActionsPath);
const sessionRouteSource = read(sessionRoutePath);
const credentialStatusRouteSource = read(credentialStatusRoutePath);
const disconnectRouteSource = read(disconnectRoutePath);
const billingActionsSource = read(billingActionsPath);
const webhookRouteSource = read(webhookRoutePath);
const taskSource = read(taskPath);

assert.match(abuseSource, /^import "server-only";/m, "abuse runtime is server-only");
assert.match(abuseSource, /pre-main-task-22-abuse-rate-limit-hardening/, "abuse runtime records Task 22 stage");
assert.match(abuseSource, /COMMENT_TRANSLATOR_EDGE_RATE_LIMITING/, "runtime records edge rate-limit control reference by name only");

for (const [file, source] of [
  [toolActionsPath, toolActionsSource],
  [sessionRoutePath, sessionRouteSource],
  [credentialStatusRoutePath, credentialStatusRouteSource],
  [disconnectRoutePath, disconnectRouteSource],
  [billingActionsPath, billingActionsSource],
  [webhookRoutePath, webhookRouteSource],
  [providerRuntimePath, providerRuntimeSource],
  [privateLaunchPath, privateLaunchSource]
]) {
  assert.match(source, /comment-translator-abuse-rate-limit-runtime|assertCommentTranslatorAbuseRequestAllowed/, `${file} uses Task 22 abuse guard`);
}

assert.match(sessionRouteSource, /status:\s*429/, "session API returns 429 for repeated attempts");
assert.match(credentialStatusRouteSource, /status:\s*429/, "credential status API returns 429 for repeated direct calls");
assert.match(disconnectRouteSource, /status:\s*429/, "disconnect API returns 429 for repeated direct calls");
assert.match(webhookRouteSource, /status:\s*429/, "billing webhook returns 429 before verifier work under abuse");
assert.match(billingActionsSource, /billing=rate-limit-exceeded/, "billing actions fail closed before Stripe calls under abuse");
assert.match(providerRuntimeSource, /blocked-abuse-rate-limit/, "provider execution can fail closed before provider calls");

for (const source of [
  abuseSource,
  sessionRuntimeSource,
  providerRuntimeSource,
  billingRuntimeSource,
  privateLaunchSource,
  toolActionsSource,
  sessionRouteSource,
  credentialStatusRouteSource,
  disconnectRouteSource,
  billingActionsSource,
  webhookRouteSource
]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "Task 22 source does not contain secret values, token values, authorization values, or private provider identifiers"
  );
}

const abuse = loadTsModule(abuseRuntimePath);
const providerRuntime = loadTsModule(providerRuntimePath);
const billing = loadTsModule(billingRuntimePath);

assert.equal(abuse.commentTranslatorAbuseRateLimitContract.runtime, "server-only");
assert.equal(
  abuse.commentTranslatorAbuseRateLimitContract.defaultPosture,
  "fail-closed-before-cost-affecting-work",
  "abuse guard fails closed before cost-affecting work"
);
assert.equal(abuse.commentTranslatorAbuseRateLimitContract.browserReadableOutput, "sanitized-rate-limit-metadata-only");
assert.deepEqual(
  abuse.commentTranslatorAbuseRateLimitContract.protectedSurfaces.sort(),
  [
    "/api/comment-translator/billing/webhook",
    "/api/comment-translator/session",
    "/api/comment-translator/youtube/credential-status",
    "/api/comment-translator/youtube/disconnect",
    "comment-translator-billing-actions",
    "comment-translator-provider-execution",
    "comment-translator-server-actions",
    "private-launch-gate-direct-call-denials"
  ].sort(),
  "Task 22 records all protected surfaces"
);

abuse.resetInMemoryCommentTranslatorAbuseRateLimitForTests();
const caller = {
  status: "authorized",
  ownerUserId: "server-only-owner-value"
};

for (let index = 0; index < 6; index += 1) {
  const result = abuse.assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action: "session-start",
    callerAuthorization: caller,
    nowMs: 1_000 + index,
    requestIp: "203.0.113.10"
  });
  assert.equal(result.status, "allowed", `session start attempt ${index + 1} remains allowed within the small burst`);
}
const blockedStart = abuse.assertCommentTranslatorAbuseRequestAllowed({
  surface: "comment-translator-server-actions",
  action: "session-start",
  callerAuthorization: caller,
  nowMs: 1_100,
  requestIp: "203.0.113.10"
});
assert.equal(blockedStart.status, "blocked", "repeated Start attempts are bounded");
assert.equal(blockedStart.reason, "rate-limit-exceeded");
assert.equal(blockedStart.retryAfterSeconds, 60);
assert.doesNotMatch(
  JSON.stringify(blockedStart),
  /server-only-owner-value|203\.0\.113\.10|access_token\s*[:=]|refresh_token\s*[:=]|Bearer\s+\S+|service_role|liveChatId|providerChannelId/i,
  "rate-limit output excludes owner ids, IP values, credentials, headers, and provider targets"
);

const resetWindow = abuse.assertCommentTranslatorAbuseRequestAllowed({
  surface: "comment-translator-server-actions",
  action: "session-start",
  callerAuthorization: caller,
  nowMs: 61_100,
  requestIp: "203.0.113.10"
});
assert.equal(resetWindow.status, "allowed", "rate-limit window resets deterministically");

abuse.resetInMemoryCommentTranslatorAbuseRateLimitForTests();
for (let index = 0; index < 10; index += 1) {
  abuse.assertCommentTranslatorAbuseRequestAllowed({
    surface: "private-launch-gate-direct-call-denials",
    action: "private-launch-denied",
    callerAuthorization: {
      status: "unavailable",
      reason: "caller-not-authenticated",
      reconnectRequired: true
    },
    nowMs: 10_000 + index,
    requestIp: "198.51.100.20"
  });
}
assert.equal(
  abuse.assertCommentTranslatorAbuseRequestAllowed({
    surface: "private-launch-gate-direct-call-denials",
    action: "private-launch-denied",
    callerAuthorization: {
      status: "unavailable",
      reason: "caller-not-authenticated",
      reconnectRequired: true
    },
    nowMs: 10_100,
    requestIp: "198.51.100.20"
  }).status,
  "blocked",
  "non-allowed or unauthenticated direct-call denials are bounded by coarse request identity"
);

abuse.resetInMemoryCommentTranslatorAbuseRateLimitForTests();
let providerCalls = 0;
const provider = {
  id: "contract-provider",
  name: "contract provider",
  runtimeScope: "server-runtime-only",
  secretBoundary: {
    runtime: "server-env-only",
    clientBundle: "forbidden",
    fixtures: "forbidden",
    docsAndTaskNotes: "no-secret-values"
  },
  async translate(request) {
    providerCalls += 1;
    return {
      type: "translated",
      translatedText: `translated-${request.requestId}`,
      detectedSourceLanguage: "en",
      confidence: 0.9,
      cacheOutcome: "miss",
      usageHandoff: {
        ...request.usageHandoff,
        estimatedCostMicros: 1
      }
    };
  }
};
const limitStore = abuse.createInMemoryCommentTranslatorAbuseRateLimitStoreForTests();
for (let index = 0; index < 20; index += 1) {
  abuse.assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-provider-execution",
    action: "provider-translation-batch",
    callerAuthorization: caller,
    nowMs: 20_000 + index,
    rateLimitStore: limitStore
  });
}
const providerRun = await providerRuntime.executeCommentTranslatorProviderBatch({
  provider,
  callerAuthorization: caller,
  sessionReferenceId: "cts_abuse_contract_provider_001",
  occurredAtMs: 20_100,
  usage: {
    dailyUsedMs: 0,
    currentSessionElapsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: {
      plan: "free",
      planEntitlementReferenceId: "comment-translator-free-public-v1",
      entitlementSource: "server-owned",
      dailyLimitMs: 1_800_000,
      sessionLimitMs: 1_800_000,
      translatedMessagesPerMinute: 30,
      activeSessionsPerUser: 1,
      paidPrioritization: "not-implemented",
      providerUsageCharging: "not-implemented"
    },
    providerRequestEstimate: {
      requestEstimateCount: 0,
      quotaUnitEstimate: 0,
      providerTargetMetadata: "forbidden"
    },
    aiUsageEstimate: {
      translatedMessageEstimate: 0,
      providerInputCharacterEstimate: 0,
      translatedCharacterEstimate: 0,
      estimatedCostMicros: 0,
      rawCommentText: "never-recorded-by-design"
    }
  },
  targetLanguage: "ja",
  sourceLanguages: ["EN"],
  abuseRateLimit: {
    nowMs: 20_100,
    rateLimitStore: limitStore
  },
  comments: [
    {
      commentId: "abuse-provider-blocked",
      publishedAt: "2026-06-12T00:00:00.000Z",
      text: "raw text must not be returned",
      platformLanguageHint: "en"
    }
  ]
});
assert.equal(providerRun.status, "blocked-abuse-rate-limit", "provider execution fails closed under abuse");
assert.equal(providerRun.providerCallCount, 0, "provider was not called after abuse limit was exceeded");
assert.equal(providerCalls, 0, "injected provider did not run under abuse");
assert.doesNotMatch(JSON.stringify(providerRun), /raw text must not be returned|server-only-owner-value/i);

abuse.resetInMemoryCommentTranslatorAbuseRateLimitForTests();
const billingGuard = abuse.createCommentTranslatorBillingRateLimitUnavailableResult({
  check: abuse.createCommentTranslatorAbuseRateLimitExceededResult({
    surface: "comment-translator-billing-actions",
    action: "billing-checkout",
    retryAfterSeconds: 60
  })
});
assert.equal(billingGuard.status, "unavailable");
assert.equal(billingGuard.reason, "rate-limit-exceeded");
assert.deepEqual(billingGuard.missingEnvReferences, []);

const checkoutUnderAbuse = await billing.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization: caller,
  env: {
    STRIPE_SECRET_KEY: "present-for-test-only",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_test_public_paid",
    NEXT_PUBLIC_SITE_URL: "https://example.test"
  },
  abuseRateLimit: {
    nowMs: 30_000,
    precomputedCheck: abuse.createCommentTranslatorAbuseRateLimitExceededResult({
      surface: "comment-translator-billing-actions",
      action: "billing-checkout",
      retryAfterSeconds: 60
    })
  },
  stripeAdapter: {
    createCheckoutSession: async () => {
      throw new Error("Stripe checkout must not run when abuse guard blocks");
    }
  }
});
assert.equal(checkoutUnderAbuse.status, "unavailable", "checkout degrades safely under abuse");
assert.equal(checkoutUnderAbuse.reason, "rate-limit-exceeded");
assert.doesNotMatch(JSON.stringify(checkoutUnderAbuse), /present-for-test-only|server-only-owner-value/i);

const changed = changedFiles();
const allowedChangedFiles = new Set([
  abuseRuntimePath,
  sessionRuntimePath,
  providerRuntimePath,
  billingRuntimePath,
  privateLaunchPath,
  toolActionsPath,
  sessionRoutePath,
  credentialStatusRoutePath,
  disconnectRoutePath,
  billingActionsPath,
  webhookRoutePath,
  "lib/comment-translator-public-traffic-rate-limit-backing-policy.ts",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_TRAFFIC_RATE_LIMIT_BACKING_DECISION.md",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md",
  "scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-abuse-rate-limit-hardening-contract.mjs",
  taskPath
]);
for (const file of changed) {
  assert.ok(allowedChangedFiles.has(file), `Task 22 change stays in allowed files: ${file}`);
}

assert.match(
  taskSource,
  /Public traffic rate-limit backing[\s\S]*cloudflare-edge[\s\S]*defense-in-depth/i,
  "task.md records current public traffic rate-limit backing decision"
);
assert.match(
  taskSource,
  /width checks skipped[\s\S]*no visible UI\/CSS\/layout(?:\/copy)? change/i,
  "task.md records width-check skip reason"
);

console.log("comment translator abuse/rate-limit hardening contract checks passed");
