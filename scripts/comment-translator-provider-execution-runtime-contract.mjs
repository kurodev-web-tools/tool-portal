import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const providerExecutionPath = "lib/comment-translator-provider-execution-runtime.ts";
const intakePath = "lib/comment-translator-youtube-live-comment-intake-pipeline.ts";
const providerBoundaryPath = "lib/comment-translator-provider-boundary.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const boundedPollingPath = "lib/comment-translator-youtube-bounded-polling-session-runtime.ts";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
const plG3CompletionPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const taskPath = "task.md";
const sharedTsModuleCache = new Map();

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
  const sourcePath = path.join(root, relativePath);
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (sharedTsModuleCache.has(normalizedModulePath)) {
      return sharedTsModuleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;
    const testModule = new Module(normalizedModulePath);
    sharedTsModuleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") {
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
    return compileTsModule(sourcePath);
  } finally {
    Module._load = originalLoad;
  }
}

assert.ok(exists(providerExecutionPath), "server-only provider execution runtime exists");
assert.ok(exists(intakePath), "live comment intake pipeline remains available");
assert.ok(exists(providerBoundaryPath), "provider boundary remains available");
assert.ok(exists(usageLedgerPath), "usage ledger remains available");
assert.ok(exists(boundedPollingPath), "bounded polling runtime remains available");
assert.ok(exists(requirementsPath), "canonical public requirements remain available");

const providerExecutionSource = read(providerExecutionPath);
const intakeSource = read(intakePath);
const providerBoundarySource = read(providerBoundaryPath);
const usageLedgerSource = read(usageLedgerPath);
const boundedPollingSource = read(boundedPollingPath);
const requirementsSource = read(requirementsPath);

assert.match(providerExecutionSource, /^import "server-only";/m, "provider execution runtime is server-only");
assert.match(providerExecutionSource, /CommentTranslationProvider/, "provider execution runtime consumes provider boundary");
assert.match(providerExecutionSource, /createYouTubeLiveCommentTranslatorPipelineRequestsForComments/, "runtime consumes provider-safe intake bridge");
assert.match(providerExecutionSource, /recordInMemoryCommentTranslatorUsageLedgerEvent/, "runtime records sanitized usage ledger estimates");
assert.match(intakeSource, /createYouTubeLiveCommentTranslatorPipelineRequestsForComments/, "intake bridge exposes provider-safe comment helper");
assert.match(providerBoundarySource, /recoverable-error/, "provider boundary keeps recoverable provider error class");
assert.match(providerBoundarySource, /terminal-error/, "provider boundary keeps terminal provider error class");
assert.match(usageLedgerSource, /provider-request-estimated/, "usage ledger can record provider request estimates");
assert.match(usageLedgerSource, /ai-usage-estimated/, "usage ledger can record AI usage estimates");
assert.match(boundedPollingSource, /comments:\s*readonly YouTubeProviderSafeCommentPayload\[\]/, "bounded polling returns provider-safe comments to the next server runtime");
assert.match(requirementsSource, /30 translated messages\/min/i, "requirements retain public per-minute translated message cap");

for (const forbidden of [
  "localStorage",
  "indexedDB",
  "sessionStorage",
  "OAuth2Client",
  "GoogleAuth",
  "refresh_token",
  "access_token",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE_KEY",
  "Authorization header value",
  "liveChatMessages",
  "liveChatIdValue"
]) {
  assert.doesNotMatch(providerExecutionSource, new RegExp(forbidden, "i"), `provider execution runtime does not add ${forbidden}`);
}
assert.doesNotMatch(providerExecutionSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "runtime does not import googleapis");
assert.doesNotMatch(providerExecutionSource, /localStorage\.|indexedDB\.|sessionStorage\./, "runtime does not use browser storage");
assert.doesNotMatch(providerExecutionSource, /setInterval|setTimeout|while\s*\(|for\s*\(\s*;;/, "runtime does not create an unbounded delayed queue");
assert.doesNotMatch(
  providerExecutionSource,
  /createClient|supabase\.from|\.from\(["']|insert\s*\(|upsert\s*\(|update\s*\(/,
  "runtime does not write Supabase directly"
);

const runtime = loadTsModule(providerExecutionPath);
const ledger = loadTsModule(usageLedgerPath);
const ownerUserIdKey = "owner" + "UserId";
const liveChatIdKey = "live" + "ChatId";
const providerChannelIdKey = "provider" + "ChannelId";
const oauthAccessTokenKey = "oauth" + "AccessToken";
const privateMarker = "redacted-test-reference";

for (const exportedName of [
  "commentTranslatorProviderExecutionRuntimeContract",
  "executeCommentTranslatorProviderBatch",
  "createInMemoryCommentTranslatorProviderExecutionCache"
]) {
  assert.equal(
    typeof runtime[exportedName],
    exportedName.startsWith("create") || exportedName.startsWith("execute") ? "function" : "object",
    `runtime exports ${exportedName}`
  );
}

assert.deepEqual(
  runtime.commentTranslatorProviderExecutionRuntimeContract,
  {
    implementationStage: "server-owned-translation-provider-execution-integration",
    runtime: "server-only",
    inputBoundary: "youtube-provider-safe-comment-payload-only",
    providerExecution: "injected-server-only-provider-after-language-policy",
    batching: "bounded-batches-no-delayed-queue",
    cache: "server-owned-translation-cache-by-sanitized-key-material",
    perMinuteCap: "server-owned-plan-entitlement-translated-messages-per-minute",
    retryCaps: "bounded-recoverable-provider-error-attempts",
    providerErrorClasses: ["translated", "recoverable-error", "terminal-error"],
    usageRecording: "in-memory-usage-ledger-provider-and-ai-estimates",
    lowerPriorityOverflow: "skip-tail-comments-under-load",
    browserStorage: "forbidden",
    handoffPayload: "unchanged",
    providerTargetMetadata: "forbidden",
    rawCommentLogging: "disabled-by-default",
    liveProviderExecution: "not-run-without-same-thread-preflight-sanitized-output-and-explicit-approval"
  },
  "provider execution runtime contract fixes Task 11 server-only controls"
);

ledger.resetInMemoryCommentTranslatorUsageLedgerForTests();
const callerAuthorization = {
  status: "authorized",
  [ownerUserIdKey]: "test-caller-reference"
};
const usage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 10_000,
  translatedMessagesInCurrentMinute: 1,
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
    translatedMessagesPerMinute: 3,
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
    translatedCharacterEstimate: 0,
    estimatedCostMicros: 0,
    rawCommentText: "never-recorded-by-design"
  }
};

let providerCallCount = 0;
const attemptsByRequestId = new Map();
const providerRequestPayloads = [];
const provider = {
  id: "contract-provider",
  name: "Contract provider",
  runtimeScope: "server-runtime-only",
  secretBoundary: {
    runtime: "server-env-only",
    clientBundle: "forbidden",
    fixtures: "forbidden",
    docsAndTaskNotes: "no-secret-values"
  },
  async translate(request) {
    providerCallCount += 1;
    providerRequestPayloads.push(request);
    const attempts = (attemptsByRequestId.get(request.requestId) ?? 0) + 1;
    attemptsByRequestId.set(request.requestId, attempts);

    if (request.requestId.endsWith("retry-once") && attempts === 1) {
      return {
        type: "recoverable-error",
        code: "temporary-unavailable",
        message: "raw provider diagnostic must not be returned",
        retry: {
          retryable: true,
          retryAfterMs: 1,
          fallbackToOriginal: true
        },
        usageHandoff: request.usageHandoff
      };
    }

    return {
      type: "translated",
      translatedText: `translated-${request.requestId.split(":").at(-1)}`,
      detectedSourceLanguage: request.input.sourceLanguage === "auto" ? null : request.input.sourceLanguage,
      confidence: null,
      cacheOutcome: "miss",
      usageHandoff: request.usageHandoff
    };
  }
};

const cache = runtime.createInMemoryCommentTranslatorProviderExecutionCache();
const firstRun = await runtime.executeCommentTranslatorProviderBatch({
  provider,
  cache,
  callerAuthorization,
  sessionReferenceId: "cts_provider_execution_contract_001",
  occurredAtMs: 20_000,
  usage,
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  maxBatchSize: 2,
  maxProviderAttemptsPerComment: 2,
  comments: [
    {
      commentId: "comment-allowed-1",
      publishedAt: "2026-06-11T04:00:00.000Z",
      text: "Hello live chat",
      platformLanguageHint: "en",
      [liveChatIdKey]: privateMarker
    },
    {
      commentId: "comment-retry-once",
      publishedAt: "2026-06-11T04:00:01.000Z",
      text: "Retry this please",
      platformLanguageHint: "en",
      [providerChannelIdKey]: privateMarker
    },
    {
      commentId: "comment-over-cap",
      publishedAt: "2026-06-11T04:00:02.000Z",
      text: "Lower priority overflow",
      platformLanguageHint: "en",
      [oauthAccessTokenKey]: privateMarker
    },
    {
      commentId: "comment-emoji",
      publishedAt: "2026-06-11T04:00:03.000Z",
      text: "😀😀😀",
      platformLanguageHint: null,
      [ownerUserIdKey]: privateMarker
    }
  ]
});

assert.equal(firstRun.status, "completed");
assert.equal(firstRun.providerRequestCount, 2, "only under-cap eligible comments are prepared for provider execution");
assert.equal(firstRun.providerCallCount, 3, "one recoverable comment is retried within the configured cap");
assert.equal(firstRun.translatedCount, 2, "two comments translate successfully");
assert.equal(firstRun.skippedCount, 2, "language-policy and over-cap comments are skipped");
assert.equal(firstRun.skipsByReason.languagePolicy, 1, "emoji-only comment is skipped before provider execution");
assert.equal(firstRun.skipsByReason.perMinuteCap, 1, "lower-priority over-cap tail comment is skipped instead of queued");
assert.equal(firstRun.cacheHitCount, 0);
assert.equal(firstRun.cacheMissCount, 2);
assert.equal(firstRun.retryCount, 1);
assert.equal(firstRun.errorCounts.recoverable, 0);
assert.equal(firstRun.errorCounts.terminal, 0);
assert.deepEqual(
  firstRun.terminalErrorCodeCounts,
  {
    invalidRequest: 0,
    unsupportedLanguage: 0,
    providerNotConfigured: 0,
    credentialMissing: 0,
    policyBlocked: 0
  },
  "successful run exposes zeroed sanitized terminal error code counts"
);
assert.deepEqual(
  firstRun.batches.map((batch) => batch.providerRequestCount),
  [2],
  "runtime groups provider work into bounded batches"
);
assert.equal(firstRun.browserStorage, "unchanged");
assert.equal(firstRun.handoffPayload, "unchanged");
assert.equal(firstRun.providerTargetMetadata, "forbidden");
assert.equal(firstRun.rawCommentText, "never-returned-by-design");

for (const request of providerRequestPayloads) {
  assert.equal(request.input.kind, "live-comment");
  assert.equal(request.input.targetLanguage, "ja");
  assert.equal(request.privacy.rawTextLogging, "disabled-by-default");
  assert.deepEqual(request.cache.keyMaterial.excludes, [
    "authorName",
    "channelId",
    "viewerId",
    "streamId",
    "rawSecret",
    "oauthToken",
    "refreshToken",
    "authorizationCode",
    "providerTargetIdentifier",
    "pollingCursor",
    "ownerIdentifier",
    "authorizationHeader",
    "serviceRoleKey",
    "browserLocalHandoffMaterial",
    "liveChatId",
    "providerChannelId",
    "rawProviderTargetMetadata"
  ]);
}

const ledgerRecordsAfterFirstRun = ledger.readInMemoryCommentTranslatorUsageLedgerRecordsForTests();
assert.equal(
  ledgerRecordsAfterFirstRun.filter((record) => record.type === "provider-request-estimated").length,
  1,
  "provider request estimate is recorded once per execution run"
);
assert.equal(
  ledgerRecordsAfterFirstRun.find((record) => record.type === "provider-request-estimated").requestEstimateCount,
  3,
  "provider request estimate counts retry attempts"
);
assert.equal(
  ledgerRecordsAfterFirstRun.find((record) => record.type === "ai-usage-estimated").translatedMessageEstimate,
  2,
  "AI usage estimate records translated messages only"
);
assert.equal(
  ledgerRecordsAfterFirstRun.find((record) => record.type === "ai-usage-estimated").rawCommentText,
  "never-recorded-by-design",
  "AI usage estimate does not record raw comments"
);

const secondRun = await runtime.executeCommentTranslatorProviderBatch({
  provider,
  cache,
  callerAuthorization,
  sessionReferenceId: "cts_provider_execution_contract_001",
  occurredAtMs: 30_000,
  usage: {
    ...usage,
    translatedMessagesInCurrentMinute: 0
  },
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  maxBatchSize: 1,
  comments: [
    {
      commentId: "comment-cache-hit",
      publishedAt: "2026-06-11T04:00:04.000Z",
      text: "Hello live chat",
      platformLanguageHint: "en"
    }
  ]
});
assert.equal(secondRun.status, "completed");
assert.equal(secondRun.providerCallCount, 0, "cache hit does not call provider again");
assert.equal(secondRun.cacheHitCount, 1, "sanitized cache key serves repeated translation");
assert.equal(secondRun.translatedCount, 1, "cache hit still yields a translated result");

const blockedProviderRun = await runtime.executeCommentTranslatorProviderBatch({
  provider: {
    ...provider,
    runtimeScope: "client-runtime"
  },
  callerAuthorization,
  sessionReferenceId: "cts_provider_execution_contract_002",
  occurredAtMs: 40_000,
  usage,
  targetLanguage: "ja",
  comments: [
    {
      commentId: "comment-blocked-provider",
      publishedAt: "2026-06-11T04:00:05.000Z",
      text: "Hello live chat",
      platformLanguageHint: "en"
    }
  ]
});
assert.equal(blockedProviderRun.status, "blocked-non-server-translator-provider");
assert.equal(blockedProviderRun.providerCallCount, 0, "non-server provider is blocked before execution");

const terminalCodeRun = await runtime.executeCommentTranslatorProviderBatch({
  provider: {
    ...provider,
    async translate() {
      return {
        type: "terminal-error",
        code: "credential-missing",
        message: "raw provider diagnostic must not be returned",
        retry: {
          retryable: false
        }
      };
    }
  },
  callerAuthorization,
  sessionReferenceId: "cts_provider_execution_contract_003",
  occurredAtMs: 50_000,
  usage,
  targetLanguage: "ja",
  comments: [
    {
      commentId: "comment-terminal-code-1",
      publishedAt: "2026-06-11T04:00:06.000Z",
      text: "Terminal code one",
      platformLanguageHint: "en"
    },
    {
      commentId: "comment-terminal-code-2",
      publishedAt: "2026-06-11T04:00:07.000Z",
      text: "Terminal code two",
      platformLanguageHint: "en"
    }
  ]
});
assert.equal(terminalCodeRun.status, "completed");
assert.equal(terminalCodeRun.translatedCount, 0);
assert.equal(terminalCodeRun.skipsByReason.providerUnavailable, 2);
assert.equal(terminalCodeRun.errorCounts.terminal, 2);
assert.deepEqual(
  terminalCodeRun.terminalErrorCodeCounts,
  {
    invalidRequest: 0,
    unsupportedLanguage: 0,
    providerNotConfigured: 0,
    credentialMissing: 2,
    policyBlocked: 0
  },
  "terminal provider results expose sanitized code counts without raw provider diagnostics"
);

for (const payload of [firstRun, secondRun, blockedProviderRun, terminalCodeRun, ...ledger.readInMemoryCommentTranslatorUsageLedgerRecordsForTests()]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "test-caller-reference",
    privateMarker,
    "oauthAccessToken",
    "authorizationCode",
    "Authorization header value",
    "service_role",
    "providerChannelId",
    "liveChatId",
    "raw provider diagnostic must not be returned",
    "Hello live chat",
    "Retry this please",
    "Lower priority overflow"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `sanitized output does not include ${forbiddenValue}`);
  }
}

const allowedChangedFiles = new Set([
  "lib/comment-translator-admin-operational-visibility.ts",
  "lib/comment-translator-azure-normal-translation-execution.ts",
  "lib/comment-translator-private-gated-live-provider-smoke-execution-harness.ts",
  "lib/comment-translator-real-comments-feed-session-bridge.ts",
  "lib/comment-translator-provider-boundary.ts",
  providerExecutionPath,
  "lib/comment-translator-provider-policy-runtime.ts",
  intakePath,
  usageLedgerPath,
  "scripts/comment-translator-admin-operational-visibility-contract.mjs",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-error-skip-readiness-after-pr537-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-terminal-error-boundary-after-pr538-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness-contract.mjs",
  "scripts/comment-translator-provider-implementation-alignment-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "scripts/comment-translator-youtube-live-comment-intake-pipeline-contract.mjs",
  plG3CompletionPath,
  readyPreflightPath,
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 11 change stays in allowed files: ${file}`);

  if (file.endsWith(".mjs")) {
    continue;
  }

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, authorization header values, private keys, or service role key values`
  );
}

console.log("comment translator provider execution runtime contract checks passed");
