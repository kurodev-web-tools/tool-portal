import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

const finalReviewRuntimePath = "lib/comment-translator-security-privacy-final-review.ts";
const finalReviewDocPath = "docs/active/COMMENT_TRANSLATOR_SECURITY_PRIVACY_FINAL_REVIEW.md";
const taskPath = "task.md";

const routePaths = [
  "app/api/comment-translator/session/route.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/api/comment-translator/youtube/disconnect/route.ts",
  "app/api/comment-translator/billing/webhook/route.ts"
];

const actionPaths = ["app/tools/comment-translator/actions.ts", "app/account/billing/actions.ts"];

const boundaryRuntimePaths = [
  "lib/comment-translator-youtube-credential-status-boundary.ts",
  "lib/comment-translator-youtube-token-store-runtime.ts",
  "lib/comment-translator-youtube-token-store-supabase-adapter.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "lib/comment-translator-provider-execution-runtime.ts",
  "lib/comment-translator-provider-policy-runtime.ts",
  "lib/comment-translator-billing-runtime.ts",
  "lib/comment-translator-abuse-rate-limit-runtime.ts",
  "lib/comment-translator-private-launch-access-gate.ts",
  "lib/comment-translator-youtube-bounded-polling-session-runtime.ts",
  "lib/comment-translator-durable-persistence-readiness.ts",
  "lib/comment-translator-monitoring-incident-readiness.ts"
];

const activeDocPaths = [
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_FINAL_QA.md",
  "docs/active/COMMENT_TRANSLATOR_PROVIDER_COST_POLICY.md",
  "docs/active/COMMENT_TRANSLATOR_STRIPE_LIVE_READINESS.md",
  "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md",
  "docs/active/COMMENT_TRANSLATOR_MONITORING_INCIDENT_READINESS.md",
  "docs/active/COMMENT_TRANSLATOR_PROVIDER_LEGAL_COPY_REFRESH.md"
];

const browserStorageSurfacePaths = [
  "app/tools/comment-translator/page.tsx",
  "components/comment-translator/CommentTranslatorDock.tsx",
  "components/comment-translator/CommentTranslatorPrivateLaunchUnavailable.tsx",
  "app/account/integrations/page.tsx",
  "components/account/AccountIntegrationsShell.tsx",
  "app/account/billing/page.tsx",
  "components/account/AccountBillingShell.tsx"
];

const sensitiveValuePattern =
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!never-returned-by-design["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!provider-channel-id-value["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!owner-user-id-value["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!(?:forbidden|server-only-not-displayed)["'])[^"']+/i;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function escapedFragment(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-preview...HEAD", {
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

    if (request === "@supabase/supabase-js") {
      return {
        createClient() {
          return {};
        }
      };
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

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(source, sensitiveValuePattern, `${label} does not contain secret values or private provider identifiers`);
}

for (const requiredPath of [
  finalReviewRuntimePath,
  finalReviewDocPath,
  taskPath,
  ...routePaths,
  ...actionPaths,
  ...boundaryRuntimePaths,
  ...activeDocPaths,
  ...browserStorageSurfacePaths
]) {
  assert.ok(exists(requiredPath), `${requiredPath} exists`);
}

const finalReviewSource = read(finalReviewRuntimePath);
const finalReviewDoc = read(finalReviewDocPath);
const taskSource = read(taskPath);
const combinedRouteSource = routePaths.map(read).join("\n");
const combinedActionSource = actionPaths.map(read).join("\n");
const combinedBrowserSurfaceSource = browserStorageSurfacePaths.map(read).join("\n");
const combinedBoundarySource = boundaryRuntimePaths.map(read).join("\n");
const combinedActiveDocs = activeDocPaths.map(read).join("\n");

assert.match(finalReviewSource, /^import "server-only";/m, "Task 26 final review runtime is server-only");
assert.match(finalReviewSource, /pre-main-task-26-security-privacy-final-review/, "runtime records Task 26 stage");
assert.match(finalReviewDoc, /^# Kuro Live Comment Translator Security And Privacy Final Review$/m);

for (const requiredSection of [
  "## Purpose",
  "## Inspected Surfaces",
  "## Authorization And Route Negative Checks",
  "## Sensitive Data And Browser Storage",
  "## Quota Budget Stop And Rollback Readiness",
  "## Accepted Risks",
  "## Completion Decision"
]) {
  assert.match(finalReviewDoc, new RegExp(`^${requiredSection}$`, "m"), `final review doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "route/API authorization",
  "token/credential boundaries",
  "browser storage",
  "logs/output",
  "docs/PR body safety",
  "provider target metadata",
  "liveChatId",
  "quota/budget stop paths",
  "rollback readiness",
  "no known high/critical security/privacy blocker",
  "public-release capable: no"
]) {
  assert.match(finalReviewDoc, new RegExp(escapedFragment(requiredFragment), "i"), `final review doc includes ${requiredFragment}`);
}

for (const routePath of routePaths) {
  const source = read(routePath);
  assert.match(source, /assertCommentTranslatorAbuseRequestAllowed/, `${routePath} applies abuse/rate-limit guard`);
  assertNoSensitiveValues(source, routePath);
}

assert.match(combinedRouteSource, /readCommentTranslatorPrivateLaunchAccess/, "comment translator API routes enforce private launch access");
assert.match(combinedRouteSource, /authorizeYouTubeOAuthCredentialStatusCaller/, "comment translator API routes derive caller authorization server-side");
assert.match(combinedRouteSource, /createServerSupabaseClient/, "comment translator API routes use server-side Supabase auth boundary");
assert.match(combinedRouteSource, /createTrustedYouTubeOAuthCredentialSupabaseStatusReader/, "credential status route uses trusted server-only status reader");
assert.match(combinedRouteSource, /createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime/, "disconnect route uses trusted server-only disconnect runtime");
assert.match(combinedRouteSource, /stripe-signature/, "billing webhook requires Stripe signature header");

assert.match(combinedActionSource, /readCommentTranslatorPrivateLaunchAccess/, "server actions enforce private launch access");
assert.match(combinedActionSource, /assertCommentTranslatorAbuseRequestAllowed/, "server actions apply abuse/rate-limit guard");
assert.match(combinedActionSource, /createTrustedYouTubeOAuthCredentialSupabaseStatusReader/, "server actions keep credential reads behind trusted server-only adapters");

assert.doesNotMatch(
  combinedBrowserSurfaceSource,
  /localStorage\.|sessionStorage\.|indexedDB\.|document\.cookie|providerTargetMetadata\s*[:=]\s*["'][^"']+|liveChatId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|access_token|refresh_token|authorization_code|Authorization\s*[:=]\s*["'][^"']+/i,
  "comment translator visible surfaces do not add browser storage or private value reads/writes"
);

for (const [label, source] of [
  ["Task 26 runtime", finalReviewSource],
  ["Task 26 doc", finalReviewDoc],
  ["task.md", taskSource],
  ["comment translator route source", combinedRouteSource],
  ["comment translator action source", combinedActionSource],
  ["comment translator boundary runtime source", combinedBoundarySource],
  ["comment translator active docs", combinedActiveDocs]
]) {
  assertNoSensitiveValues(source, label);
}

assert.match(combinedBoundarySource, /providerTargetMetadata:\s*"forbidden"/, "runtime boundaries forbid provider target metadata output");
assert.match(combinedBoundarySource, /liveChatId:\s*"never-returned-by-design"/, "bounded polling browser output never returns liveChatId");
assert.match(combinedBoundarySource, /tokenValue:\s*"never-returned-by-design"/, "browser-safe outputs keep token values out");
assert.match(combinedBoundarySource, /authorizationHeaderValue:\s*"never-returned-by-design"/, "browser-safe outputs keep Authorization header values out");
assert.match(combinedBoundarySource, /rawCommentText:\s*"never-recorded-by-design"/, "usage/monitoring boundaries keep raw comments out");
assert.match(combinedBoundarySource, /providerErrorBody:\s*"never-recorded-by-design"/, "usage/monitoring boundaries keep provider error bodies out");
assert.match(combinedBoundarySource, /provider-quota-stop/, "quota stop path remains represented");
assert.match(combinedBoundarySource, /global-budget-stop/, "global budget stop path remains represented");
assert.match(combinedBoundarySource, /ai-budget-stop/, "AI budget stop path remains represented");
assert.match(combinedBoundarySource, /freeze-new-public-comment-translator-sessions/, "rollback trigger remains represented");

const finalReview = loadTsModule(finalReviewRuntimePath);
const credentialBoundary = loadTsModule("lib/comment-translator-youtube-credential-status-boundary.ts");
const privateLaunch = loadTsModule("lib/comment-translator-private-launch-access-gate.ts");
const sessionRuntime = loadTsModule("lib/comment-translator-session-runtime.ts");
const billingRuntime = loadTsModule("lib/comment-translator-billing-runtime.ts");
const abuseRuntime = loadTsModule("lib/comment-translator-abuse-rate-limit-runtime.ts");
const boundedPolling = loadTsModule("lib/comment-translator-youtube-bounded-polling-session-runtime.ts");

assert.equal(
  finalReview.commentTranslatorSecurityPrivacyFinalReviewContract.implementationStage,
  "pre-main-task-26-security-privacy-final-review",
  "Task 26 final review contract records implementation stage"
);
assert.equal(finalReview.commentTranslatorSecurityPrivacyFinalReviewContract.runtime, "server-only");
assert.equal(finalReview.commentTranslatorSecurityPrivacyFinalReviewContract.outputPolicy, "sanitized-metadata-and-reference-only");
assert.equal(finalReview.commentTranslatorSecurityPrivacyFinalReviewContract.publicLaunchAllowed, false);
assert.equal(finalReview.commentTranslatorSecurityPrivacyFinalReviewContract.noKnownHighCriticalSecurityPrivacyBlocker, true);

const report = finalReview.createCommentTranslatorSecurityPrivacyFinalReviewReport({
  nowMs: 12_000,
  routeNegativeChecksPassed: true,
  noSecretScanPassed: true,
  changedFilesNoSecretScanPassed: true
});
const ownerUserIdForNegativeCheck = "server-only-owner-value";
const ownerChannelReferenceForNegativeCheck = "server-only-owner-channel-reference";
const liveChatIdForNegativeCheck = "server-only-live-chat-id-value";

assert.equal(report.stage, "pre-main-task-26-security-privacy-final-review");
assert.equal(report.generatedAtIso, "1970-01-01T00:00:12.000Z");
assert.equal(report.publicLaunchAllowed, false);
assert.equal(report.completionDecision, "task-26-complete-public-launch-still-gated");
assert.equal(report.noKnownHighCriticalSecurityPrivacyBlocker, true);
assert.ok(report.inspectedSurfaces.some((surface) => surface.id === "route-api-authorization" && surface.status === "passed"));
assert.ok(report.inspectedSurfaces.some((surface) => surface.id === "browser-storage" && surface.status === "passed"));
assert.ok(report.acceptedRisks.some((risk) => risk.id === "durable-public-operation-state"));
assert.ok(report.acceptedRisks.some((risk) => risk.id === "approval-gated-live-provider-stripe-deploy"));

const unauthenticatedStatus = credentialBoundary.createYouTubeOAuthCredentialStatusUnavailablePayload({
  credentialReferenceId: "credential-reference-for-negative-check",
  reason: "caller-not-authenticated"
});
assert.equal(unauthenticatedStatus.status, "unavailable");
assert.equal(unauthenticatedStatus.reason, "caller-not-authenticated");

const privateLaunchBlocked = privateLaunch.readCommentTranslatorPrivateLaunchAccess({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: ownerUserIdForNegativeCheck
  },
  env: {
    COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES: ""
  }
});
assert.equal(privateLaunchBlocked.status, "blocked");
assert.equal(privateLaunchBlocked.browserReadableOutput, "sanitized-private-launch-access-metadata-only");

const blockedStart = sessionRuntime.startCommentTranslatorSession({
  nowMs: 1_000,
  plan: "free",
  callerAuthorization: {
    status: "unavailable",
    reason: "caller-not-authenticated",
    reconnectRequired: true
  },
  credentialReadiness: {
    status: "not-ready",
    credentialReferenceId: "credential-reference-for-negative-check",
    reason: "caller-not-authenticated",
    reconnectRequired: true
  },
  activeSession: null,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true
  },
  createSessionReferenceId: () => "cts_should_not_be_used"
});
assert.equal(blockedStart.status, "stopped");
assert.equal(blockedStart.stopReason, "auth-failed");

const checkoutUnavailable = await billingRuntime.createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization: {
    status: "unauthenticated"
  },
  env: {},
  stripeAdapter: {
    async createCheckoutSession() {
      throw new Error("checkout adapter must not run for unauthenticated caller");
    }
  }
});
assert.equal(checkoutUnavailable.status, "unavailable");
assert.equal(checkoutUnavailable.reason, "caller-not-authenticated");

const webhookRejected = await billingRuntime.readCommentTranslatorStripeWebhookResult({
  payload: "{}",
  signature: null,
  env: {},
  verifier: {
    async constructEvent() {
      throw new Error("webhook verifier must not run without signature");
    }
  }
});
assert.equal(webhookRejected.status, "rejected");
assert.equal(webhookRejected.reason, "missing-signature");

const rateLimitStore = abuseRuntime.createInMemoryCommentTranslatorAbuseRateLimitStoreForTests();
let finalAbuseCheck = null;
for (let index = 0; index < 11; index += 1) {
  finalAbuseCheck = abuseRuntime.assertCommentTranslatorAbuseRequestAllowed({
    surface: "private-launch-gate-direct-call-denials",
    action: "private-launch-denied",
    callerAuthorization: { status: "unauthenticated" },
    requestIp: "203.0.113.10",
    nowMs: 10_000,
    rateLimitStore
  });
}
assert.equal(finalAbuseCheck.status, "blocked");
assert.equal(finalAbuseCheck.browserReadableOutput, "sanitized-rate-limit-metadata-only");

const pollingStart = await boundedPolling.startYouTubeBoundedPollingSession({
  credentialReferenceId: "credential-reference-for-negative-check",
  sessionReferenceId: "cts_polling_negative",
  nowMs: 20_000,
  adapter: {
    async verifyOwner() {
      return {
        status: "owner-verified",
        ownerChannelReference: ownerChannelReferenceForNegativeCheck
      };
    },
    async lookupOwnedBroadcasts() {
      return {
        broadcasts: [
          {
            broadcastReference: "server-only-broadcast-reference",
            lifecycleStatus: "live",
            liveChatId: liveChatIdForNegativeCheck
          }
        ]
      };
    },
    async pollLiveChatOnce() {
      throw new Error("polling tick is not part of the start negative check");
    }
  }
});
assert.equal(pollingStart.status, "active");
assert.equal(pollingStart.browserSafeState.liveChatId, "never-returned-by-design");
assert.equal(pollingStart.browserSafeState.providerTargetMetadata, "forbidden");

for (const [label, value] of [
  ["Task 26 report", report],
  ["unauthenticated credential status", unauthenticatedStatus],
  ["private launch blocked output", privateLaunchBlocked],
  ["blocked session start output", blockedStart],
  ["checkout unavailable output", checkoutUnavailable],
  ["webhook rejected output", webhookRejected],
  ["rate limit blocked output", finalAbuseCheck],
  ["bounded polling browser state", pollingStart.browserSafeState]
]) {
  assert.doesNotMatch(
    JSON.stringify(value),
    /server-only-owner-value|server-only-live-chat-id-value|server-only-owner-channel-reference|203\.0\.113\.10|access_token|refresh_token|authorization_code|Bearer\s+\S+|service_role|sk_live|sk_test|whsec|providerTargetMetadata\s*[:=]|providerChannelId\s*[:=]/i,
    `${label} excludes secret values, private identifiers, raw IPs, and provider target metadata values`
  );
}

const allowedChangedFiles = new Set([finalReviewRuntimePath, finalReviewDocPath, "scripts/comment-translator-security-privacy-final-review-contract.mjs", taskPath]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 26 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

assert.match(taskSource, /Task 26[\s\S]*Security and privacy final review[\s\S]*Status: complete/i, "task.md records Task 26 completion");
assert.match(taskSource, /width checks skipped[\s\S]*no visible UI\/CSS\/layout change/i, "task.md records width-check skip reason");
assert.match(taskSource, /public-release capable: no/i, "task.md keeps public release capability blocked");

console.log("comment translator security/privacy final review contract checks passed");
