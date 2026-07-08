import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const adminVisibilityPath = "lib/comment-translator-admin-operational-visibility.ts";
const ledgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const sessionPath = "lib/comment-translator-session-runtime.ts";
const providerExecutionPath = "lib/comment-translator-provider-execution-runtime.ts";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
const taskPath = "task.md";
const sharedTsModuleCache = new Map();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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
  const sourcePath = path.join(root, relativePath);
  const originalLoad = Module._load;

  function resolveAlias(request) {
    if (request.startsWith("@/")) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

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

    const aliasPath = resolveAlias(request);
    if (aliasPath) {
      return compileTsModule(aliasPath);
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

assert.ok(exists(adminVisibilityPath), "server-only admin operational visibility boundary exists");
assert.ok(exists(ledgerPath), "usage ledger runtime remains available");
assert.ok(exists(sessionPath), "session runtime remains available");
assert.ok(exists(providerExecutionPath), "provider execution runtime remains available");
assert.ok(exists(requirementsPath), "canonical public requirements remain available");

const adminVisibilitySource = read(adminVisibilityPath);
const ledgerSource = read(ledgerPath);
const sessionSource = read(sessionPath);
const providerExecutionSource = read(providerExecutionPath);
const requirementsSource = read(requirementsPath);

assert.match(adminVisibilitySource, /^import "server-only";/m, "admin visibility boundary is server-only");
assert.match(requirementsSource, /active session count/, "requirements retain active session admin metric");
assert.match(requirementsSource, /per-user daily\/session minutes/, "requirements retain per-user minute metric");
assert.match(requirementsSource, /estimated YouTube request count/, "requirements retain YouTube request metric");
assert.match(requirementsSource, /provider and translation error classes/, "requirements retain provider/translation error metric");
assert.match(requirementsSource, /heartbeat timeout and reconnect-required counts/, "requirements retain operational stop metrics");
assert.match(ledgerSource, /provider-translation-error-estimated/, "usage ledger can record provider translation error classes");
assert.match(providerExecutionSource, /provider-translation-error-estimated/, "provider execution records provider translation error classes");

for (const source of [adminVisibilitySource, ledgerSource, sessionSource, providerExecutionSource]) {
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "admin visibility source does not contain token values, authorization headers, private keys, service role key values, liveChatId values, or provider target id values"
  );
  assert.doesNotMatch(
    source,
    /localStorage\.|indexedDB\.|sessionStorage\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|billingPortal|priceId/i,
    "Task 13 visibility avoids browser storage, live provider execution, and billing enforcement"
  );
}

const adminVisibility = loadTsModule(adminVisibilityPath);
const ledger = loadTsModule(ledgerPath);
const providerExecution = loadTsModule(providerExecutionPath);

assert.equal(
  adminVisibility.commentTranslatorAdminOperationalVisibilityContract.implementationStage,
  "admin-operational-visibility-task-13",
  "admin visibility contract records Task 13 implementation stage"
);
assert.equal(adminVisibility.commentTranslatorAdminOperationalVisibilityContract.runtime, "server-only");
assert.equal(adminVisibility.commentTranslatorAdminOperationalVisibilityContract.browserStorage, "forbidden");
assert.equal(adminVisibility.commentTranslatorAdminOperationalVisibilityContract.handoffPayload, "unchanged");
assert.equal(adminVisibility.commentTranslatorAdminOperationalVisibilityContract.exportBoundary, "sanitized-aggregate-and-reference-only");
assert.equal(adminVisibility.commentTranslatorAdminOperationalVisibilityContract.logBoundary, "sanitized-aggregate-and-reference-only");

ledger.resetInMemoryCommentTranslatorUsageLedgerForTests();
const callerAuthorization = {
  status: "authorized",
  ownerUserId: "server-only-owner-value"
};
const planEntitlement = ledger.resolveCommentTranslatorUsagePlanEntitlement({ plan: "free" });
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "session-started",
    provider: "youtube",
    planEntitlement,
    sessionReferenceId: "cts_admin_visibility_001",
    occurredAtMs: 1_000
  }
});
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "provider-request-estimated",
    provider: "youtube",
    sessionReferenceId: "cts_admin_visibility_001",
    occurredAtMs: 2_000,
    requestEstimateCount: 4,
    quotaUnitEstimate: 12,
    providerTargetMetadata: "forbidden"
  }
});
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "ai-usage-estimated",
    provider: "youtube",
    sessionReferenceId: "cts_admin_visibility_001",
    occurredAtMs: 3_000,
    translatedMessageEstimate: 8,
    providerInputCharacterEstimate: 640,
    translatedCharacterEstimate: 640,
    estimatedCostMicros: 1600,
    rawCommentText: "never-recorded-by-design"
  }
});
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "provider-translation-error-estimated",
    provider: "youtube",
    sessionReferenceId: "cts_admin_visibility_001",
    occurredAtMs: 4_000,
    providerErrorClass: "recoverable-error",
    errorCount: 2,
    providerErrorBody: "never-recorded-by-design",
    rawCommentText: "never-recorded-by-design"
  }
});
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "session-stopped",
    provider: "youtube",
    planEntitlement,
    sessionReferenceId: "cts_admin_visibility_001",
    occurredAtMs: 5_000,
    elapsedMs: 120_000,
    stopReason: "missing-heartbeat"
  }
});
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "session-stopped",
    provider: "youtube",
    planEntitlement,
    sessionReferenceId: "cts_admin_visibility_002",
    occurredAtMs: 6_000,
    elapsedMs: 60_000,
    stopReason: "reconnect-required"
  }
});
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "quota-budget-stop",
    provider: "youtube",
    sessionReferenceId: "cts_admin_visibility_002",
    occurredAtMs: 7_000,
    stopReason: "provider-quota-stop",
    stopCategory: "provider-quota",
    clientReadableDetail: "sanitized-stop-reason-only"
  }
});

const snapshot = adminVisibility.createCommentTranslatorAdminOperationalVisibilitySnapshot({
  nowMs: 8_000,
  records: ledger.readInMemoryCommentTranslatorUsageLedgerRecordsForTests()
});

assert.equal(snapshot.generatedAtIso, "1970-01-01T00:00:08.000Z");
assert.equal(snapshot.activeSessionCountEstimate, 0, "admin snapshot derives active sessions from sanitized references");
assert.equal(snapshot.totalCompletedSessionMinutesEstimate, 3, "admin snapshot records completed minutes");
assert.equal(snapshot.providerRequestEstimates.youtube.requestEstimateCount, 4, "YouTube request estimates are visible");
assert.equal(snapshot.providerRequestEstimates.youtube.quotaUnitEstimate, 12, "YouTube quota unit estimates are visible");
assert.equal(snapshot.providerRequestEstimates.twitch.requestEstimateCount, 0, "Twitch estimate is present but zero until runtime is scoped");
assert.equal(snapshot.providerRequestEstimates.twitch.runtime, "not-implemented-youtube-first-release");
assert.equal(snapshot.aiUsageEstimate.translatedMessageEstimate, 8, "AI message estimate is visible");
assert.equal(snapshot.aiUsageEstimate.translatedCharacterEstimate, 640, "AI character estimate is visible");
assert.equal(snapshot.aiUsageEstimate.estimatedCostMicros, 1600, "AI cost estimate is visible");
assert.equal(snapshot.providerTranslationErrorCounts.recoverable, 2, "recoverable provider/translation errors are visible as counts");
assert.equal(snapshot.providerTranslationErrorCounts.terminal, 0, "terminal provider/translation errors are visible as counts");
assert.equal(snapshot.operationalStopCounts.heartbeatTimeout, 1, "heartbeat timeouts are counted");
assert.equal(snapshot.operationalStopCounts.reconnectRequired, 1, "reconnect-required stops are counted");
assert.equal(snapshot.quotaBudgetStopCounts.providerQuotaStop, 1, "provider quota stops are counted");
assert.equal(snapshot.perUserUsage.length, 1, "per-user visibility is reference-only");
assert.match(snapshot.perUserUsage[0].userLedgerReferenceId, /^ctul_[a-f0-9]{24}$/);
assert.equal(snapshot.perUserUsage[0].completedSessionMinutesEstimate, 3);
assert.equal(snapshot.perUserUsage[0].activeSessionCountEstimate, 0);
assert.equal(snapshot.sanitization.tokenValue, "never-returned-by-design");
assert.equal(snapshot.sanitization.providerTargetMetadata, "forbidden");
assert.equal(snapshot.sanitization.rawCommentText, "never-recorded-by-design");
assert.equal(snapshot.exportBoundary, "sanitized-aggregate-and-reference-only");
assert.equal(snapshot.logBoundary, "sanitized-aggregate-and-reference-only");

const serializedSnapshot = JSON.stringify(snapshot);
for (const forbiddenValue of [
  "server-only-owner-value",
  "providerChannelId",
  "liveChatId",
  "access_token",
  "refresh_token",
  "authorization_code",
  "Authorization header value",
  "service_role",
  "raw comment",
  "ytcred"
]) {
  assert.doesNotMatch(serializedSnapshot, new RegExp(forbiddenValue, "i"), `admin snapshot excludes ${forbiddenValue}`);
}

assert.equal(
  typeof providerExecution.executeCommentTranslatorProviderBatch,
  "function",
  "provider execution remains callable after error-count ledger integration"
);

const allowedChangedFiles = new Set([
  adminVisibilityPath,
  ledgerPath,
  providerExecutionPath,
  "scripts/comment-translator-admin-operational-visibility-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 13 change stays in allowed files: ${file}`);
  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, authorization header values, private keys, or service role key values`
  );
}

console.log("comment translator admin operational visibility contract checks passed");
