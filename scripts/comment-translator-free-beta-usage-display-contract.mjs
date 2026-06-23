import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const usageDisplayPath = "lib/comment-translator-free-beta-usage-display.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const f10Path = "lib/comment-translator-azure-normal-translation-execution.ts";
const sharedFeedPath = "lib/comment-translator-real-comments-feed-shared.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const copyPath = "lib/comment-translator.ts";
const privateLaunchPath = "lib/comment-translator-private-launch-access-gate.ts";
const abuseRateLimitPath = "lib/comment-translator-abuse-rate-limit-runtime.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";
const sharedTsModuleCache = new Map();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const base = "origin/codex/comment-translator-free-public-beta-integration";
  const committedDiff = execSync(`git diff --name-only ${base}...HEAD`, {
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

    if (request === "@supabase/supabase-js") {
      return {
        createClient(url, key) {
          return { url, key, from: () => ({}) };
        }
      };
    }

    if (request.startsWith("@/") && parent?.filename) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.join(root, `${request.slice(2)}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
      }
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.resolve(path.dirname(parent.filename), `${request}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
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

for (const requiredPath of [
  usageDisplayPath,
  sessionRuntimePath,
  f10Path,
  sharedFeedPath,
  componentPath,
  copyPath,
  privateLaunchPath,
  abuseRateLimitPath,
  readinessDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `F12 required file exists: ${requiredPath}`);
}

const usageDisplaySource = read(usageDisplayPath);
const sessionRuntimeSource = read(sessionRuntimePath);
const f10Source = read(f10Path);
const sharedFeedSource = read(sharedFeedPath);
const componentSource = read(componentPath);
const copySource = read(copyPath);
const privateLaunchSource = read(privateLaunchPath);
const abuseRateLimitSource = read(abuseRateLimitPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(usageDisplaySource, /^import "server-only";/m, "F12 usage display resolver is server-only");
assert.match(usageDisplaySource, /commentTranslatorFreeBetaUsageDisplayContract/, "F12 exposes a focused usage display contract");
assert.match(usageDisplaySource, /monthlyCharacterCap/, "F12 resolver carries monthly character cap display");
assert.match(usageDisplaySource, /noProviderCallWhenOverLimit:\s*true/, "F12 contract fixes no-provider-call behavior");
assert.match(usageDisplaySource, /publicLaunchAllowed:\s*false/, "F12 does not open public launch gate");
assert.match(sessionRuntimeSource, /usageDisplay/, "browser-safe session state carries usage display metadata");
assert.match(f10Source, /resolveCommentTranslatorFreeBetaProviderCallPolicy/, "F10 checks F12 usage policy before provider execution");
assert.match(sharedFeedSource, /skipped-f12-usage-limit/, "browser-safe feed rows can explain usage-limit provider skips");
assert.match(componentSource, /data-comment-translator-free-beta-usage-display="sanitized-usage-only"/, "UI renders sanitized F12 usage display");
assert.match(copySource, /monthlyCharacterCap/, "localized copy includes monthly character cap labels");
assert.match(privateLaunchSource, /usageDisplay/, "private-launch blocked session state keeps the F12 usage display shape");
assert.match(abuseRateLimitSource, /usageDisplay/, "abuse-rate-limited session state keeps the F12 usage display shape");
assert.match(readinessDoc, /F12 Usage display for Free beta/i, "durable readiness doc records F12");
assert.match(gapAudit, /F12[\s\S]*usage display/i, "gap audit keeps F12 visible");
assert.match(taskSource, /usage-policy Start blocker/i, "task.md records current usage-policy Start blocker work");

const usageDisplay = loadTsModule(usageDisplayPath);
const session = loadTsModule(sessionRuntimePath);
const f10 = loadTsModule(f10Path);

assert.equal(usageDisplay.commentTranslatorFreeBetaUsageDisplayContract.implementationStage, "free-public-beta-f12-usage-display");
assert.equal(usageDisplay.commentTranslatorFreeBetaUsageDisplayContract.runtime, "server-only");
assert.equal(usageDisplay.commentTranslatorFreeBetaUsageDisplayContract.noProviderCallWhenOverLimit, true);
assert.equal(usageDisplay.commentTranslatorFreeBetaUsageDisplayContract.publicLaunchAllowed, false);

const planEntitlement = session.createCommentTranslatorSessionPlanEntitlement({ plan: "free" });
const baseUsage = {
  dailyUsedMs: 600_000,
  currentSessionElapsedMs: 120_000,
  translatedMessagesInCurrentMinute: 7,
  monthlyTranslatedCharacterEstimate: 12_500,
  providerBudgetAvailable: true,
  globalBudgetAvailable: true,
  aiBudgetAvailable: true,
  translationProviderAvailable: true,
  planEntitlement,
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

const display = usageDisplay.createCommentTranslatorFreeBetaUsageDisplay({
  usage: baseUsage,
  elapsedMs: 120_000
});
assert.equal(display.status, "available");
assert.equal(display.session.usedSeconds, 120);
assert.equal(display.session.remainingSeconds, 1_680);
assert.equal(display.daily.usedSeconds, 720);
assert.equal(display.daily.remainingSeconds, 1_080);
assert.equal(display.perMinute.used, 7);
assert.equal(display.perMinute.remaining, 23);
assert.equal(display.monthlyCharacterCap.limit, 20_000);
assert.equal(display.monthlyCharacterCap.used, 12_500);
assert.equal(display.monthlyCharacterCap.remaining, 7_500);
assert.equal(display.providerCallPolicy.status, "allowed");
assert.equal(display.noProviderCallWhenOverLimit, true);
assert.equal(display.providerTargetMetadata, "forbidden");
assert.equal(display.rawComments, "not-returned-by-design");

const overLimitUsage = {
  ...baseUsage,
  monthlyTranslatedCharacterEstimate: 20_000,
  aiBudgetAvailable: false
};
const overLimitDisplay = usageDisplay.createCommentTranslatorFreeBetaUsageDisplay({
  usage: overLimitUsage,
  elapsedMs: 0
});
assert.equal(overLimitDisplay.status, "over-limit");
assert.equal(overLimitDisplay.providerCallPolicy.status, "blocked-over-limit");
assert.equal(overLimitDisplay.providerCallPolicy.stopReason, "ai-budget-stop");
assert.equal(overLimitDisplay.monthlyCharacterCap.remaining, 0);

const unavailableDisplay = usageDisplay.createUnavailableCommentTranslatorFreeBetaUsageDisplay({
  reason: "durable-usage-unreadable"
});
assert.equal(unavailableDisplay.status, "unavailable");
assert.equal(unavailableDisplay.providerCallPolicy.status, "blocked-unavailable");
assert.equal(unavailableDisplay.providerCallPolicy.stopReason, "global-budget-stop");

const activeState = session.startCommentTranslatorSession({
  nowMs: Date.parse("2026-06-16T00:00:00.000Z"),
  plan: "free",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "f12-owner-reference-never-output"
  },
  credentialReadiness: {
    status: "ready",
    credentialReferenceId: "ytcred_f12_reference"
  },
  activeSession: null,
  usage: baseUsage,
  createSessionReferenceId: () => "cts_f12_usage_reference"
});
assert.equal(activeState.status, "active");
assert.equal(activeState.usageDisplay.status, "available");
assert.equal(activeState.usageDisplay.monthlyCharacterCap.remaining, 7_500);

const cappedStart = session.startCommentTranslatorSession({
  nowMs: Date.parse("2026-06-16T00:00:00.000Z"),
  plan: "free",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "f12-owner-reference-never-output"
  },
  credentialReadiness: {
    status: "ready",
    credentialReferenceId: "ytcred_f12_reference"
  },
  activeSession: null,
  usage: overLimitUsage,
  createSessionReferenceId: () => "cts_f12_over_limit_reference"
});
assert.equal(cappedStart.status, "stopped");
assert.equal(cappedStart.stopReason, "ai-budget-stop");
assert.equal(cappedStart.usageDisplay.status, "over-limit");
assert.equal(cappedStart.usageDisplay.providerCallPolicy.status, "blocked-over-limit");

let providerCallCount = 0;
const provider = {
  id: "azure-translator",
  name: "Azure Translator contract double",
  runtimeScope: "server-runtime-only",
  secretBoundary: {
    runtime: "server-env-only",
    clientBundle: "forbidden",
    fixtures: "forbidden",
    docsAndTaskNotes: "no-secret-values"
  },
  async translate() {
    providerCallCount += 1;
    return {
      type: "translated",
      translatedText: "should-not-be-returned",
      detectedSourceLanguage: null,
      confidence: 0.9,
      cacheOutcome: "miss",
      usageHandoff: {
        providerId: "azure-translator",
        estimatedUnits: 1,
        estimatedCostMicros: 1,
        cacheOutcome: "miss"
      }
    };
  }
};
const f10Result = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: [
    {
      provider: "youtube",
      messageReferenceId: "yt-f12-text-1",
      kind: "text",
      publishedAtIso: "2026-06-16T00:00:01.000Z",
      text: "Hello F12",
      source: "youtube-live-chat",
      role: "viewer",
      purchase: null,
      member: null,
      system: null,
      targetMessageReferenceId: null,
      terminalSignal: null,
      moderation: {
        visibility: "visible",
        deletionHandling: "not-deleted",
        historyUpdateStrategy: "not-required"
      },
      rawProviderPayload: "not-returned-by-design",
      authorChannelMaterial: "not-returned-by-design"
    }
  ],
  sessionStatus: "active",
  targetLanguage: "ja",
  sourceLanguages: ["EN"],
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "f12-owner-reference-never-output"
  },
  sessionReferenceId: "cts_f12_usage_reference",
  occurredAtMs: Date.parse("2026-06-16T00:00:02.000Z"),
  usage: overLimitUsage,
  providers: {
    azure: provider
  },
  feedPersistenceStore: {
    status: "unavailable",
    store: null,
    missingEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    failClosed: true,
    reason: "trusted-service-role-env-missing"
  },
  maxBatchSize: 1,
  maxProviderAttemptsPerComment: 1
});
assert.equal(f10Result.status, "over-limit");
assert.equal(f10Result.execution.providerCallCount, 0);
assert.equal(f10Result.execution.translatedCount, 0);
assert.equal(f10Result.execution.skipsByReason.providerUnavailable, 0);
assert.equal(f10Result.execution.skipsByReason.perMinuteCap, 0);
assert.equal(f10Result.execution.usageRecorded.providerRequestEstimate, false);
assert.equal(f10Result.execution.usageRecorded.aiUsageEstimate, false);
assert.equal(f10Result.feed.rows[0].translationStatus, "skipped-f12-usage-limit");
assert.equal(providerCallCount, 0);

for (const payload of [display, overLimitDisplay, unavailableDisplay, activeState, cappedStart, f10Result]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "f12-owner-reference-never-output",
    "access_token",
    "refresh_token",
    "authorization_code",
    "service_role",
    "Authorization",
    "liveChatId",
    "providerChannelId",
    "provider-target-metadata",
    "nextPageToken"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `F12 sanitized output excludes ${forbiddenValue}`);
  }
}

const allowedChangedFiles = new Set([
  usageDisplayPath,
  sessionRuntimePath,
  f10Path,
  sharedFeedPath,
  componentPath,
  copyPath,
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts",
  "lib/comment-translator-azure-normal-translation-execution.ts",
  "lib/comment-translator-real-comments-feed-durable-store.ts",
  "lib/comment-translator-real-comments-feed-session-bridge.ts",
  "lib/comment-translator-private-gated-live-provider-smoke-execution-harness.ts",
  "lib/comment-translator-bounded-live-chat-polling-wiring.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  privateLaunchPath,
  abuseRateLimitPath,
  "supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql",
  readinessDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  gapAuditPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533-contract.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F12 change stays in allowed files: ${file}`);

  if (file.endsWith(".mjs")) {
    continue;
  }

  const source = read(file);
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    `${file} does not contain secret values, token values, authorization values, or private provider identifiers`
  );
}

console.log("comment translator Free beta usage display contract checks passed");
