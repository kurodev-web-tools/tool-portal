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
const sessionPanelPath = "components/comment-translator/CommentTranslatorSessionPanel.tsx";
const usageSidebarPath = "components/comment-translator/CommentTranslatorUsageSidebar.tsx";
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
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true
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
const componentSource = [componentPath, sessionPanelPath, usageSidebarPath].map(read).join("\n");
const copySource = [copyPath, "lib/comment-translator-copy-ja.json", "lib/comment-translator-copy-en.json"].map(read).join("\n");
const privateLaunchSource = read(privateLaunchPath);
const abuseRateLimitSource = read(abuseRateLimitPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(usageDisplaySource, /^import "server-only";/m, "F12 usage display resolver is server-only");
assert.match(usageDisplaySource, /commentTranslatorFreeBetaUsageDisplayContract/, "F12 exposes a focused usage display contract");
assert.match(usageDisplaySource, /monthlyInputCharacterCap/, "F12 resolver carries monthly character cap display");
assert.match(usageDisplaySource, /noProviderCallWhenOverLimit:\s*true/, "F12 contract fixes no-provider-call behavior");
assert.match(usageDisplaySource, /publicLaunchAllowed:\s*false/, "F12 does not open public launch gate");
assert.match(sessionRuntimeSource, /usageDisplay/, "browser-safe session state carries usage display metadata");
assert.match(f10Source, /resolveCommentTranslatorFreeBetaProviderCallPolicy/, "F10 checks F12 usage policy before provider execution");
assert.match(sharedFeedSource, /skipped-f12-usage-limit/, "browser-safe feed rows can explain usage-limit provider skips");
assert.match(
  componentSource,
  /data-comment-translator-free-beta-usage-display="right-authoritative-sanitized-usage-only"/,
  "UI renders a single authoritative sanitized F12 usage display in the right panel"
);
assert.match(
  componentSource,
  /data-comment-translator-active-phase=\{sessionState\.activePhase\}[\s\S]*usageDisplay\.perMinute\.used[\s\S]*usageDisplay\.perMinute\.limit/,
  "active pause and resync UI retain the authoritative per-minute count and limit"
);
assert.match(
  copySource,
  /Monthly input character cap|月間入力文字上限/,
  "localized copy includes monthly input character cap labels"
);
assert.match(privateLaunchSource, /usageDisplay/, "private-launch blocked session state keeps the F12 usage display shape");
assert.match(abuseRateLimitSource, /usageDisplay/, "abuse-rate-limited session state keeps the F12 usage display shape");
assert.match(readinessDoc, /F12 Usage display for Free beta/i, "durable readiness doc records F12");
assert.match(gapAudit, /F12[\s\S]*usage display/i, "gap audit keeps F12 visible");
assert.match(taskSource, /usage-policy Start blocker|Quota\/session hardening/i, "task.md records current usage-policy Start blocker work");

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
  monthlyProviderInputCharacterEstimate: 12_500,
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
    providerInputCharacterEstimate: 0,
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
assert.equal(display.monthlyInputCharacterCap.limit, 20_000);
assert.equal(display.monthlyInputCharacterCap.used, 12_500);
assert.equal(display.monthlyInputCharacterCap.remaining, 7_500);
assert.equal(display.providerCallPolicy.status, "allowed");
assert.equal(display.noProviderCallWhenOverLimit, true);
assert.equal(display.providerTargetMetadata, "forbidden");
assert.equal(display.rawComments, "not-returned-by-design");

const overLimitUsage = {
  ...baseUsage,
  monthlyProviderInputCharacterEstimate: 20_000,
  aiBudgetAvailable: false
};
const overLimitDisplay = usageDisplay.createCommentTranslatorFreeBetaUsageDisplay({
  usage: overLimitUsage,
  elapsedMs: 0
});
assert.equal(overLimitDisplay.status, "over-limit");
assert.equal(overLimitDisplay.providerCallPolicy.status, "blocked-over-limit");
assert.equal(overLimitDisplay.providerCallPolicy.stopReason, "ai-budget-stop");
assert.equal(overLimitDisplay.monthlyInputCharacterCap.remaining, 0);

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
assert.equal(activeState.usageDisplay.monthlyInputCharacterCap.remaining, 7_500);

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
  "lib/comment-translator-bounded-live-chat-polling-outcome-projection.ts",
  "lib/comment-translator-bounded-live-chat-polling-types.ts",
  "lib/comment-translator-bounded-live-chat-polling-result-projection.ts",
  "lib/comment-translator-bounded-live-chat-polling-terminal-policy.ts",
  "lib/comment-translator-bounded-live-chat-polling-static-wiring.ts",
  "lib/comment-translator-bounded-live-chat-polling-registry.ts",
  "lib/comment-translator-bounded-live-chat-polling-transition.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  privateLaunchPath,
  abuseRateLimitPath,
  "supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql",
  readinessDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  gapAuditPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  "lib/comment-translator-real-comments-feed-shared.ts",
  "lib/comment-translator-live-provider-session-step.ts",
  "lib/comment-translator-live-provider-session-step-result.ts",
  "lib/comment-translator-youtube-live-provider-runtime-adapter.ts",
  "lib/comment-translator-provider-execution-runtime.ts",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
  "scripts/comment-translator-durable-session-schema-adapter-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-creator-locked-waitlist-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533-contract.mjs",
  "scripts/comment-translator-public-ui-cleanup-contract.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-preview-author-display-name-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  taskPath
]);
const monthlyInputAccountingChangedFiles = new Set([
  "components/comment-translator/CommentTranslatorDock.tsx",
  "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md",
  "lib/comment-translator.ts",
  "lib/comment-translator-admin-operational-visibility.ts",
  "lib/comment-translator-azure-normal-translation-execution.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  "lib/comment-translator-free-beta-usage-display.ts",
  "lib/legal-content.ts",
  "lib/comment-translator-provider-execution-runtime.ts",
  "lib/comment-translator-public-entitlement-baseline.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "scripts/comment-translator-abuse-rate-limit-hardening-contract.mjs",
  "scripts/comment-translator-admin-operational-visibility-contract.mjs",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g1-remote-durable-enforcement-execution-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-remote-durable-enforcement-evidence-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-free-limits-public-copy-contract.mjs",
  "scripts/comment-translator-monitoring-incident-readiness-contract.mjs",
  "scripts/comment-translator-monthly-input-character-accounting-contract.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-provider-legal-copy-refresh-contract.mjs",
  "scripts/comment-translator-provider-implementation-alignment-contract.mjs",
  "scripts/comment-translator-public-entitlement-baseline-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "task.md"
]);
const highConfidenceSecretPattern = /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i;
const plG6dChangedFiles = new Set([
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6D_PREVIEW_RATE_LIMIT_SMOKE_OVERRIDE.md",
  "lib/comment-translator-free-beta-preview-rate-limit-smoke-override.ts",
  "scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs"
]);
const serverOnlyAdapterSecretPattern = /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i;
const perMinuteAutoResumeChangedFiles = new Set([
  "app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx",
  "app/api/comment-translator/session/route-context.ts",
  "app/tools/comment-translator/account-actions.ts",
  "app/tools/comment-translator/action-context.ts",
  "app/tools/comment-translator/feed-actions.ts",
  "app/tools/comment-translator/retention-waitlist-actions.ts",
  "app/tools/comment-translator/session-actions.ts",
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md",
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_IMPLEMENTATION_PLAN.md",
  "lib/comment-translator-per-minute-rate-pause.ts",
  "lib/comment-translator-copy-en.json",
  "lib/comment-translator-copy-ja.json",
  "lib/comment-translator-fixture-comments.ts",
  "lib/comment-translator-runtime.ts",
  "lib/comment-translator-snapshot-data.ts",
  "lib/comment-translator-types.ts",
  "lib/comment-translator-session-command-execution.ts",
  "lib/comment-translator-session-command.ts",
  "lib/comment-translator-session-memory-store.ts",
  "lib/comment-translator-session-policy.ts",
  "lib/comment-translator-session-start.ts",
  "lib/comment-translator-session-state.ts",
  "lib/comment-translator-session-types.ts",
  "components/comment-translator/CommentTranslatorActivePhaseNotice.tsx",
  "components/comment-translator/CommentTranslatorCommentCard.tsx",
  "components/comment-translator/CommentTranslatorCreatorWaitlistPanel.tsx",
  "components/comment-translator/CommentTranslatorDockAtoms.tsx",
  "components/comment-translator/CommentTranslatorDockHeader.tsx",
  "components/comment-translator/CommentTranslatorFeedPanel.tsx",
  "components/comment-translator/CommentTranslatorSessionPanel.tsx",
  "components/comment-translator/CommentTranslatorSettingsPanel.tsx",
  "components/comment-translator/CommentTranslatorUsageSidebar.tsx",
  "components/comment-translator/comment-translator-dock-format.ts",
  "components/comment-translator/comment-translator-dock-model.ts",
  "components/comment-translator/useCommentTranslatorBrowserTimeZone.ts",
  "components/comment-translator/useCommentTranslatorCreatorWaitlist.ts",
  "components/comment-translator/useCommentTranslatorDockControls.ts",
  "components/comment-translator/useCommentTranslatorSessionFeedController.ts",
  "components/portal/PortalShell.tsx",
  "scripts/account-remote-display-settings-contract.mjs",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-live-message-normalization-contract.mjs",
  "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs"
]);
const activeSessionStartReadinessChangedFiles = new Set([
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md",
  "docs/active/COMMENT_TRANSLATOR_ACTIVE_SESSION_START_READINESS_VISIBILITY_IMPLEMENTATION_PLAN.md",
  "components/comment-translator/comment-translator-session-panel-visibility.ts",
  "components/comment-translator/CommentTranslatorSessionPanel.tsx",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs"
]);
const loginOnlyRuntimeChangedFiles = new Set([
  "app/account/actions.ts",
  "app/account/integrations/page.tsx",
  "app/api/comment-translator/session/route.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/api/comment-translator/youtube/disconnect/route.ts",
  "app/api/comment-translator/youtube/oauth/callback/route.ts",
  "app/tools/comment-translator/account-actions.ts",
  "app/tools/comment-translator/page.tsx",
  "app/tools/comment-translator/session-actions.ts",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md",
  "lib/comment-translator-private-launch-access-gate.ts",
  "lib/comment-translator-public-beta-access-gate-policy.ts",
  "scripts/comment-translator-login-only-runtime-access-contract.mjs",
  "scripts/comment-translator-private-launch-access-gate-contract.mjs",
  "scripts/comment-translator-public-beta-access-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "task.md"
]);
for (const file of changedFiles()) {
  assert.ok(
    allowedChangedFiles.has(file) || monthlyInputAccountingChangedFiles.has(file) || plG6dChangedFiles.has(file) || perMinuteAutoResumeChangedFiles.has(file) || activeSessionStartReadinessChangedFiles.has(file) || loginOnlyRuntimeChangedFiles.has(file),
    `F12 change stays in allowed files: ${file}`
  );

  if (file.endsWith(".mjs")) {
    continue;
  }

  const source = read(file);
  const secretPattern =
    file === "lib/comment-translator-youtube-live-provider-runtime-adapter.ts"
      ? serverOnlyAdapterSecretPattern
      : highConfidenceSecretPattern;
  assert.doesNotMatch(
    source,
    secretPattern,
    `${file} does not contain secret values, token values, authorization values, or private provider identifiers`
  );
}

console.log("comment translator Free beta usage display contract checks passed");
