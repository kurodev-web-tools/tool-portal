import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const ledgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const sessionPath = "lib/comment-translator-session-runtime.ts";
const sessionPolicyPath = "lib/comment-translator-session-policy.ts";
const commandExecutionPath = "lib/comment-translator-session-command-execution.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const feedActionPath = "app/tools/comment-translator/feed-actions.ts";
const retentionActionPath = "app/tools/comment-translator/retention-waitlist-actions.ts";
const sessionActionPath = "app/tools/comment-translator/session-actions.ts";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
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
  const sourcePath = path.join(root, relativePath);
  const moduleCache = new Map();
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

assert.ok(exists(ledgerPath), "server-only usage/quota/budget ledger runtime exists");
assert.ok(exists(sessionPath), "session runtime remains available");
assert.ok(exists(sessionPolicyPath), "session policy remains available");
assert.ok(exists(commandExecutionPath), "shared session command execution remains available");
assert.ok(exists(routePath), "session route remains available");
assert.ok(exists(actionPath), "session server actions remain available");
assert.ok(exists(requirementsPath), "canonical public release requirements remain available");

const ledgerSource = read(ledgerPath);
const sessionSource = [sessionPath, sessionPolicyPath, commandExecutionPath].map(read).join("\n");
const routeSource = [routePath, commandExecutionPath].map(read).join("\n");
const actionSource = [actionPath, feedActionPath, retentionActionPath, sessionActionPath, commandExecutionPath].map(read).join("\n");
const requirementsSource = read(requirementsPath);

assert.match(ledgerSource, /^import "server-only";/m, "usage ledger runtime is server-only");
assert.match(ledgerSource, /UsageQuotaBudgetLedger/, "ledger source names usage quota budget boundary");
assert.match(sessionSource, /planEntitlement/, "session runtime consumes server-owned plan entitlement state");
assert.match(
  routeSource,
  /readInMemoryCommentTranslatorUsageSnapshot|readCommentTranslatorDurableUsageSnapshotOrFailClosed/,
  "session route reads server-owned usage ledger snapshot"
);
assert.match(
  actionSource,
  /readInMemoryCommentTranslatorUsageSnapshot|readCommentTranslatorDurableUsageSnapshotOrFailClosed/,
  "session actions read server-owned usage ledger snapshot"
);
assert.match(requirementsSource, /estimated YouTube request count/, "requirements retain admin provider estimate metric");
assert.match(requirementsSource, /estimated AI cost/, "requirements retain admin AI cost metric");

for (const source of [ledgerSource, sessionSource, routeSource, actionSource]) {
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|ownerUserIdValue:\s*["'][^"']+|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "usage ledger boundary source does not contain token values, auth code values, authorization header values, private keys, owner id values, or provider target values"
  );
  assert.doesNotMatch(
    source,
    /localStorage\.|indexedDB\.|sessionStorage\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|billingPortal|priceId/i,
    "Task 8 ledger boundary avoids browser storage, live provider execution, and billing enforcement"
  );
}

const ledger = loadTsModule(ledgerPath);
const session = loadTsModule(sessionPath);

assert.equal(
  ledger.commentTranslatorUsageQuotaBudgetLedgerContract.implementationStage,
  "server-owned-usage-quota-budget-ledger-foundation",
  "ledger contract records Task 8 implementation stage"
);
assert.equal(ledger.commentTranslatorUsageQuotaBudgetLedgerContract.runtime, "server-only");
assert.equal(
  ledger.commentTranslatorUsageQuotaBudgetLedgerContract.clientReadableOutput,
  "sanitized-usage-metadata-only",
  "ledger output remains browser-safe metadata only"
);
assert.equal(
  ledger.commentTranslatorUsageQuotaBudgetLedgerContract.billingEnforcement,
  "not-implemented-in-task-8",
  "billing enforcement remains out of scope"
);
assert.equal(
  ledger.commentTranslatorUsageQuotaBudgetLedgerContract.providerUsageCharging,
  "not-implemented-in-task-8",
  "provider usage charging remains out of scope"
);
assert.deepEqual(
  ledger.commentTranslatorUsageQuotaBudgetLedgerContract.recordCategories,
  [
    "per-user-daily-session-minutes",
    "plan-entitlement-reference",
    "provider-request-estimate",
    "ai-message-character-cost-estimate",
    "quota-budget-stop-event",
    "admin-safe-aggregate-metric"
  ],
  "all Task 8 ledger record categories are modeled"
);

const freeEntitlement = ledger.resolveCommentTranslatorUsagePlanEntitlement({ plan: "free" });
assert.deepEqual(
  freeEntitlement,
  {
    plan: "free",
    planEntitlementReferenceId: "comment-translator-free-public-v1",
    entitlementSource: "server-owned",
    dailyLimitMs: 1_800_000,
    sessionLimitMs: 1_800_000,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyProviderInputCharacterLimit: 20_000,
    paidPrioritization: "not-implemented",
    providerUsageCharging: "not-implemented"
  },
  "free public release entitlement is server-owned and enforceable"
);

const paidEntitlement = ledger.resolveCommentTranslatorUsagePlanEntitlement({
  plan: "paid",
  paidEntitlement: {
    planEntitlementReferenceId: "comment-translator-paid-configured-v1",
    dailyLimitMs: 7_200_000,
    sessionLimitMs: 3_600_000,
    translatedMessagesPerMinute: 90,
    activeSessionsPerUser: 1
  }
});
assert.equal(paidEntitlement.plan, "paid", "paid entitlement can be resolved from server-owned state");
assert.equal(paidEntitlement.dailyLimitMs, 7_200_000, "paid daily limit is enforceable from entitlement state");
assert.equal(paidEntitlement.paidPrioritization, "not-implemented", "paid prioritization is not added by Task 8");
assert.equal(paidEntitlement.providerUsageCharging, "not-implemented", "provider usage charging is not added by Task 8");

const userReference = ledger.createCommentTranslatorUsageLedgerUserReference({
  status: "authorized",
  ownerUserId: "server-only-owner-value"
});
assert.match(userReference, /^ctul_[a-f0-9]{24}$/, "ledger user reference is deterministic sanitized metadata");
assert.doesNotMatch(userReference, /server-only-owner-value/, "ledger reference does not expose the owner id value");

ledger.resetInMemoryCommentTranslatorUsageLedgerForTests();
const activeSession = {
  sessionReferenceId: "cts_usage_session_001",
  startedAtMs: 10_000,
  lastHeartbeatAtMs: 10_000,
  credentialReferenceId: "ytcred_usage_reference_001"
};
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  event: {
    type: "session-started",
    provider: "youtube",
    planEntitlement: freeEntitlement,
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: 10_000
  }
});
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  event: {
    type: "provider-request-estimated",
    provider: "youtube",
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: 20_000,
    requestEstimateCount: 3,
    quotaUnitEstimate: 15,
    providerTargetMetadata: "forbidden"
  }
});
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  event: {
    type: "ai-usage-estimated",
    provider: "youtube",
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: 30_000,
    translatedMessageEstimate: 12,
    providerInputCharacterEstimate: 480,
    translatedCharacterEstimate: 480,
    estimatedCostMicros: 1200,
    rawCommentText: "never-recorded-by-design"
  }
});

const snapshot = ledger.readInMemoryCommentTranslatorUsageSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  nowMs: 40_000,
  plan: "free",
  activeSession
});

assert.equal(snapshot.planEntitlement.planEntitlementReferenceId, "comment-translator-free-public-v1");
assert.equal(snapshot.dailyUsedMs, 0, "active elapsed time is kept separate from completed daily minutes");
assert.equal(snapshot.currentSessionElapsedMs, 30_000, "snapshot includes current session elapsed minutes for enforcement");
assert.equal(snapshot.providerRequestEstimate.requestEstimateCount, 3, "provider request estimates are recorded");
assert.equal(snapshot.providerRequestEstimate.quotaUnitEstimate, 15, "provider quota unit estimates are recorded");
assert.equal(snapshot.aiUsageEstimate.translatedMessageEstimate, 12, "AI message estimates are recorded");
assert.equal(snapshot.aiUsageEstimate.translatedCharacterEstimate, 480, "AI character estimates are recorded");
assert.equal(snapshot.aiUsageEstimate.estimatedCostMicros, 1200, "AI cost estimates are recorded");
assert.equal(snapshot.translatedMessageCapacityAvailableAtMs, null, "below-cap in-memory usage has no recovery timestamp");
assert.equal(snapshot.providerBudgetAvailable, true);
assert.equal(snapshot.globalBudgetAvailable, true);
assert.equal(snapshot.aiBudgetAvailable, true);
assert.doesNotMatch(
  JSON.stringify(snapshot),
  /server-only-owner-value|providerChannelId|liveChatId|access_token|refresh_token|authorization_code|Authorization|service_role|raw comment/i,
  "usage snapshot excludes owner id values, provider targets, credentials, and raw comments"
);

const overDailyLimit = session.evaluateCommentTranslatorSessionStopCondition({
  activeSession: {
    sessionReferenceId: "cts_usage_session_002",
    startedAtMs: 1_790_000,
    lastHeartbeatAtMs: 1_801_000
  },
  nowMs: 1_801_000,
  plan: "free",
  browserConnected: true,
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "ytcred_usage_reference_001",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  usage: {
    ...snapshot,
    dailyUsedMs: 1_790_000,
    currentSessionElapsedMs: 11_000
  }
});
assert.equal(overDailyLimit.stopReason, "daily-time-limit", "daily limit enforcement uses server-owned entitlement plus active elapsed time");

ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  event: {
    type: "quota-budget-stop",
    provider: "youtube",
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: 45_000,
    stopReason: "global-budget-stop",
    stopCategory: "global-budget",
    clientReadableDetail: "sanitized-stop-reason-only"
  }
});

const stoppedSnapshot = ledger.readInMemoryCommentTranslatorUsageSnapshot({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  nowMs: 50_000,
  plan: "free",
  activeSession
});
assert.equal(stoppedSnapshot.globalBudgetAvailable, false, "budget stop event can stop future session work");

const aggregates = ledger.createCommentTranslatorAdminSafeAggregateMetrics({
  nowMs: 60_000,
  records: ledger.readInMemoryCommentTranslatorUsageLedgerRecordsForTests()
});
assert.equal(aggregates.activeSessionCountEstimate, 1, "admin aggregate records active session count");
assert.equal(aggregates.totalProviderRequestEstimate, 3, "admin aggregate records provider request estimate");
assert.equal(aggregates.totalAiTranslatedMessageEstimate, 12, "admin aggregate records AI message estimate");
assert.equal(aggregates.totalAiTranslatedCharacterEstimate, 480, "admin aggregate records AI character estimate");
assert.equal(aggregates.totalAiCostEstimateMicros, 1200, "admin aggregate records AI cost estimate");
assert.deepEqual(aggregates.quotaBudgetStopCounts, {
  providerQuotaStop: 0,
  globalBudgetStop: 1,
  aiBudgetStop: 0,
  translatedMessageCap: 0,
  sessionTimeLimit: 0,
  dailyTimeLimit: 0
});

ledger.resetInMemoryCommentTranslatorUsageLedgerForTests();
ledger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-value"
  },
  event: {
    type: "ai-usage-estimated",
    provider: "youtube",
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: Number.NaN,
    translatedMessageEstimate: 30,
    providerInputCharacterEstimate: 1,
    translatedCharacterEstimate: 1,
    estimatedCostMicros: 1,
    rawCommentText: "never-recorded-by-design"
  }
});
assert.throws(
  () =>
    ledger.readInMemoryCommentTranslatorUsageSnapshot({
      callerAuthorization: {
        status: "authorized",
        ownerUserId: "server-only-owner-value"
      },
      nowMs: 50_000,
      plan: "free",
      activeSession
    }),
  /recovery authority/i,
  "malformed capped in-memory authority fails closed"
);
assert.doesNotMatch(
  JSON.stringify(aggregates),
  /server-only-owner-value|ytcred_usage_reference_001|providerChannelId|liveChatId|access_token|refresh_token|authorization_code|Authorization|service_role|raw comment/i,
  "admin aggregate metrics exclude credential references, owner id values, provider targets, credentials, and raw comments"
);

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
  "scripts/comment-translator-monitoring-incident-readiness-contract.mjs",
  "scripts/comment-translator-monthly-input-character-accounting-contract.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-provider-implementation-alignment-contract.mjs",
  "scripts/comment-translator-public-entitlement-baseline-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "task.md"
]);

const perMinuteAutoResumeChangedFiles = new Set([
  "app/api/comment-translator/session/route-context.ts",
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/account-actions.ts",
  "app/tools/comment-translator/action-context.ts",
  "app/tools/comment-translator/actions.ts",
  "app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx",
  "app/tools/comment-translator/feed-actions.ts",
  "app/tools/comment-translator/retention-waitlist-actions.ts",
  "app/tools/comment-translator/session-actions.ts",
  "components/comment-translator/comment-translator-dock-format.ts",
  "components/comment-translator/comment-translator-dock-model.ts",
  "components/comment-translator/CommentTranslatorActivePhaseNotice.tsx",
  "components/comment-translator/CommentTranslatorCommentCard.tsx",
  "components/comment-translator/CommentTranslatorCreatorWaitlistPanel.tsx",
  "components/comment-translator/CommentTranslatorDock.tsx",
  "components/comment-translator/CommentTranslatorDockAtoms.tsx",
  "components/comment-translator/CommentTranslatorDockHeader.tsx",
  "components/comment-translator/CommentTranslatorFeedPanel.tsx",
  "components/comment-translator/CommentTranslatorSessionPanel.tsx",
  "components/comment-translator/CommentTranslatorSettingsPanel.tsx",
  "components/comment-translator/CommentTranslatorUsageSidebar.tsx",
  "components/comment-translator/useCommentTranslatorBrowserTimeZone.ts",
  "components/comment-translator/useCommentTranslatorCreatorWaitlist.ts",
  "components/comment-translator/useCommentTranslatorDockControls.ts",
  "components/comment-translator/useCommentTranslatorSessionFeedController.ts",
  "components/portal/PortalShell.tsx",
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md",
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_IMPLEMENTATION_PLAN.md",
  "lib/comment-translator-bounded-live-chat-polling-outcome-projection.ts",
  "lib/comment-translator-bounded-live-chat-polling-registry.ts",
  "lib/comment-translator-bounded-live-chat-polling-result-projection.ts",
  "lib/comment-translator-bounded-live-chat-polling-static-wiring.ts",
  "lib/comment-translator-bounded-live-chat-polling-terminal-policy.ts",
  "lib/comment-translator-bounded-live-chat-polling-transition.ts",
  "lib/comment-translator-bounded-live-chat-polling-types.ts",
  "lib/comment-translator-bounded-live-chat-polling-wiring.ts",
  "lib/comment-translator-copy-en.json",
  "lib/comment-translator-copy-ja.json",
  "lib/comment-translator-durable-usage-counter-store.ts",
  "lib/comment-translator-fixture-comments.ts",
  "lib/comment-translator-live-provider-session-step-result.ts",
  "lib/comment-translator-live-provider-session-step.ts",
  "lib/comment-translator-per-minute-rate-pause.ts",
  "lib/comment-translator-runtime.ts",
  "lib/comment-translator-session-command-execution.ts",
  "lib/comment-translator-session-command.ts",
  "lib/comment-translator-session-memory-store.ts",
  "lib/comment-translator-session-policy.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-session-start.ts",
  "lib/comment-translator-session-state.ts",
  "lib/comment-translator-session-types.ts",
  "lib/comment-translator-snapshot-data.ts",
  "lib/comment-translator-types.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "lib/comment-translator.ts",
  "scripts/account-remote-display-settings-contract.mjs",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-live-message-normalization-contract.mjs",
  "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
  "scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "task.md"
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

for (const file of changedFiles()) {
  const allowedChangedFiles = new Set([
    "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md",
    "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_IMPLEMENTATION_PLAN.md",
    "lib/comment-translator-admin-operational-visibility.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
    ledgerPath,
    sessionPath,
    sessionPolicyPath,
    commandExecutionPath,
    routePath,
    actionPath,
    feedActionPath,
    retentionActionPath,
    sessionActionPath,
    "components/comment-translator/CommentTranslatorDock.tsx",
    "lib/comment-translator-real-comments-feed-shared.ts",
    "lib/comment-translator-live-provider-session-step.ts",
    "lib/comment-translator-live-provider-session-step-result.ts",
    "lib/comment-translator-azure-normal-translation-execution.ts",
    "lib/comment-translator-provider-execution-runtime.ts",
    "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
    "scripts/comment-translator-admin-operational-visibility-contract.mjs",
    "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
    "scripts/comment-translator-durable-session-schema-adapter-contract.mjs",
    "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
    "scripts/comment-translator-free-beta-usage-display-contract.mjs",
    "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
    "scripts/comment-translator-provider-execution-runtime-contract.mjs",
    "scripts/comment-translator-public-operator-session-ui-contract.mjs",
    "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
    "scripts/comment-translator-session-start-stop-contract.mjs",
    "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
    taskPath
  ]);
  assert.ok(
    allowedChangedFiles.has(file) || monthlyInputAccountingChangedFiles.has(file) || perMinuteAutoResumeChangedFiles.has(file) || activeSessionStartReadinessChangedFiles.has(file),
    `Task 8 change stays in allowed files: ${file}`
  );
  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, authorization header values, private keys, or service role key values`
  );
}

console.log("comment translator usage/quota/budget ledger contract checks passed");
