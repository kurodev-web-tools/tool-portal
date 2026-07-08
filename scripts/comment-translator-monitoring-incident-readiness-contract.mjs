import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const readinessRuntimePath = "lib/comment-translator-monitoring-incident-readiness.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_MONITORING_INCIDENT_READINESS.md";
const adminVisibilityPath = "lib/comment-translator-admin-operational-visibility.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const providerExecutionPath = "lib/comment-translator-provider-execution-runtime.ts";
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const stripeReadinessPath = "lib/comment-translator-stripe-live-readiness-runtime.ts";
const durableReadinessPath = "lib/comment-translator-durable-persistence-readiness.ts";
const abuseRuntimePath = "lib/comment-translator-abuse-rate-limit-runtime.ts";
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

assert.ok(exists(readinessRuntimePath), "Task 24 monitoring readiness runtime exists");
assert.ok(exists(readinessDocPath), "Task 24 monitoring readiness doc exists");
assert.ok(exists(adminVisibilityPath), "admin operational visibility runtime remains available");
assert.ok(exists(usageLedgerPath), "usage ledger runtime remains available");
assert.ok(exists(providerExecutionPath), "provider execution runtime remains available");
assert.ok(exists(billingRuntimePath), "billing runtime remains available");
assert.ok(exists(stripeReadinessPath), "Stripe readiness runtime remains available");
assert.ok(exists(durableReadinessPath), "durable persistence readiness runtime remains available");
assert.ok(exists(abuseRuntimePath), "abuse/rate-limit runtime remains available");

const readinessSource = read(readinessRuntimePath);
const readinessDoc = read(readinessDocPath);
const adminVisibilitySource = read(adminVisibilityPath);
const usageLedgerSource = read(usageLedgerPath);
const providerExecutionSource = read(providerExecutionPath);
const billingRuntimeSource = read(billingRuntimePath);
const stripeReadinessSource = read(stripeReadinessPath);
const durableReadinessSource = read(durableReadinessPath);
const abuseRuntimeSource = read(abuseRuntimePath);
const taskSource = read(taskPath);

assert.match(readinessSource, /^import "server-only";/m, "Task 24 readiness runtime is server-only");
assert.match(readinessSource, /pre-main-task-24-monitoring-alerting-incident-readiness/, "runtime records Task 24 stage");

for (const requiredSection of [
  "## Purpose",
  "## Observable Signals",
  "## Alert Thresholds",
  "## Sanitized Output Policy",
  "## Incident Response",
  "## Rollback Triggers",
  "## Support Escalation Path",
  "## Public Launch Blockers"
]) {
  assert.match(readinessDoc, new RegExp(`^${requiredSection}$`, "m"), `readiness doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "provider cost spike",
  "YouTube quota stop",
  "translation error classes",
  "Stripe webhook failure",
  "session failure/timeout",
  "rollback trigger",
  "support escalation",
  "sanitized aggregate",
  "no raw comments",
  "reference name only",
  "remote alert/dashboard mutation",
  "not run",
  "public-release capable: no"
]) {
  assert.match(readinessDoc, new RegExp(escapedFragment(requiredFragment), "i"), `readiness doc includes ${requiredFragment}`);
}

assert.match(adminVisibilitySource, /providerTranslationErrorCounts/, "admin visibility exposes translation error counts");
assert.match(adminVisibilitySource, /quotaBudgetStopCounts/, "admin visibility exposes quota/budget stop counts");
assert.match(adminVisibilitySource, /operationalStopCounts/, "admin visibility exposes session failure/timeout counts");
assert.match(usageLedgerSource, /provider-translation-error-estimated/, "usage ledger can record translation error classes");
assert.match(providerExecutionSource, /estimatedCostMicros/, "provider execution reports sanitized cost estimates");
assert.match(billingRuntimeSource, /readCommentTranslatorStripeWebhookResult/, "billing runtime exposes signed webhook result outcomes");
assert.match(stripeReadinessSource, /webhookRegistrationStatus:\s*"not-run"/, "Stripe webhook registration remains approval-gated");
assert.match(durableReadinessSource, /comment_translator_admin_daily_aggregates/, "durable readiness keeps aggregate monitoring storage proposal visible");
assert.match(abuseRuntimeSource, /fail-closed-before-cost-affecting-work/, "abuse guard keeps cost-affecting work fail-closed");

const readiness = loadTsModule(readinessRuntimePath);
const adminVisibility = loadTsModule(adminVisibilityPath);
const usageLedger = loadTsModule(usageLedgerPath);

assert.equal(
  readiness.commentTranslatorMonitoringIncidentReadinessContract.implementationStage,
  "pre-main-task-24-monitoring-alerting-incident-readiness",
  "Task 24 readiness contract records implementation stage"
);
assert.equal(readiness.commentTranslatorMonitoringIncidentReadinessContract.runtime, "server-only");
assert.equal(readiness.commentTranslatorMonitoringIncidentReadinessContract.outputPolicy, "sanitized-aggregate-and-reference-only");
assert.equal(readiness.commentTranslatorMonitoringIncidentReadinessContract.remoteAlertDashboardMutation, "not-run-by-contract");
assert.equal(readiness.commentTranslatorMonitoringIncidentReadinessContract.publicLaunchCapability, "blocked-until-monitoring-and-durable-backing-are-approved");
assert.deepEqual(
  readiness.commentTranslatorMonitoringIncidentReadinessContract.observableSignals,
  [
    "provider-cost-spike",
    "youtube-quota-stop",
    "translation-error-class",
    "stripe-webhook-failure",
    "session-failure-timeout",
    "rollback-trigger",
    "support-escalation"
  ],
  "Task 24 records every required observable signal"
);

usageLedger.resetInMemoryCommentTranslatorUsageLedgerForTests();
const callerAuthorization = {
  status: "authorized",
  ownerUserId: "server-only-owner-value"
};
const planEntitlement = usageLedger.resolveCommentTranslatorUsagePlanEntitlement({ plan: "free" });

usageLedger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "session-started",
    provider: "youtube",
    planEntitlement,
    sessionReferenceId: "cts_monitoring_001",
    occurredAtMs: 1_000
  }
});
usageLedger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "provider-request-estimated",
    provider: "youtube",
    sessionReferenceId: "cts_monitoring_001",
    occurredAtMs: 2_000,
    requestEstimateCount: 11,
    quotaUnitEstimate: 105,
    providerTargetMetadata: "forbidden"
  }
});
usageLedger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "ai-usage-estimated",
    provider: "youtube",
    sessionReferenceId: "cts_monitoring_001",
    occurredAtMs: 3_000,
    translatedMessageEstimate: 18,
    providerInputCharacterEstimate: 1800,
    translatedCharacterEstimate: 1800,
    estimatedCostMicros: 2500,
    rawCommentText: "never-recorded-by-design"
  }
});
usageLedger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "provider-translation-error-estimated",
    provider: "youtube",
    sessionReferenceId: "cts_monitoring_001",
    occurredAtMs: 4_000,
    providerErrorClass: "recoverable-error",
    errorCount: 3,
    providerErrorBody: "never-recorded-by-design",
    rawCommentText: "never-recorded-by-design"
  }
});
usageLedger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "provider-translation-error-estimated",
    provider: "youtube",
    sessionReferenceId: "cts_monitoring_001",
    occurredAtMs: 5_000,
    providerErrorClass: "terminal-error",
    errorCount: 1,
    providerErrorBody: "never-recorded-by-design",
    rawCommentText: "never-recorded-by-design"
  }
});
usageLedger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "quota-budget-stop",
    provider: "youtube",
    sessionReferenceId: "cts_monitoring_001",
    occurredAtMs: 6_000,
    stopReason: "provider-quota-stop",
    stopCategory: "provider-quota",
    clientReadableDetail: "sanitized-stop-reason-only"
  }
});
usageLedger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "session-stopped",
    provider: "youtube",
    planEntitlement,
    sessionReferenceId: "cts_monitoring_001",
    occurredAtMs: 7_000,
    elapsedMs: 90_000,
    stopReason: "missing-heartbeat"
  }
});

const adminSnapshot = adminVisibility.createCommentTranslatorAdminOperationalVisibilitySnapshot({
  nowMs: 8_000,
  records: usageLedger.readInMemoryCommentTranslatorUsageLedgerRecordsForTests()
});
const report = readiness.createCommentTranslatorMonitoringIncidentReadinessReport({
  nowMs: 9_000,
  adminSnapshot,
  stripeWebhookOutcomes: [
    { status: "rejected", reason: "invalid-signature", count: 2 },
    { status: "ignored", reason: "missing-billing-user-reference", count: 1 },
    { status: "applied", count: 1 }
  ],
  thresholds: {
    aiCostSpikeMicros: 2000,
    youtubeQuotaUnitSpike: 100,
    translationErrorCount: 4,
    stripeWebhookFailureCount: 1,
    sessionFailureTimeoutCount: 1
  }
});

assert.equal(report.stage, "pre-main-task-24-monitoring-alerting-incident-readiness");
assert.equal(report.generatedAtIso, "1970-01-01T00:00:09.000Z");
assert.equal(report.outputPolicy, "sanitized-aggregate-and-reference-only");
assert.equal(report.publicLaunchAllowed, false);
assert.equal(report.remoteAlertDashboardMutationStatus, "not-run");
assert.equal(report.alerts.length, 5, "report detects all cost/quota/error/webhook/session alert classes from sanitized counts");
assert.ok(report.alerts.some((alert) => alert.id === "provider-cost-spike" && alert.observedCount === 2500));
assert.ok(report.alerts.some((alert) => alert.id === "youtube-quota-stop" && alert.observedCount === 1));
assert.ok(report.alerts.some((alert) => alert.id === "translation-error-class" && alert.observedCount === 4));
assert.ok(report.alerts.some((alert) => alert.id === "stripe-webhook-failure" && alert.observedCount === 3));
assert.ok(report.alerts.some((alert) => alert.id === "session-failure-timeout" && alert.observedCount === 1));
assert.equal(report.stripeWebhookFailureCounts.rejected, 2);
assert.equal(report.stripeWebhookFailureCounts.ignored, 1);
assert.equal(report.stripeWebhookFailureCounts.applied, 1);
assert.deepEqual(report.translationErrorClassCounts, { recoverable: 3, terminal: 1 });
assert.equal(report.youtubeQuotaStopCount, 1);
assert.equal(report.sessionFailureTimeoutCounts.heartbeatTimeout, 1);
assert.ok(report.rollbackTriggers.includes("freeze-new-public-comment-translator-sessions"));
assert.ok(report.rollbackTriggers.includes("disable-paid-checkout-entry-if-webhook-failures-persist"));
assert.ok(report.supportEscalationPath.includes("collect-sanitized-aggregate-report"));
assert.ok(report.supportEscalationPath.includes("escalate-to-operator-with-reference-only-event-window"));

const serializedReport = JSON.stringify(report);
assert.doesNotMatch(
  serializedReport,
  /server-only-owner-value|access_token|refresh_token|authorization_code|Bearer\s+\S+|service_role|liveChatId|providerChannelId|ownerUserId|sk_live|sk_test|whsec|raw comment|provider target/i,
  "monitoring report excludes secret values, token values, private identifiers, raw comments, and provider target metadata"
);

const quietReport = readiness.createCommentTranslatorMonitoringIncidentReadinessReport({
  nowMs: 10_000,
  adminSnapshot,
  stripeWebhookOutcomes: [],
  thresholds: {
    aiCostSpikeMicros: 999_999,
    youtubeQuotaUnitSpike: 999_999,
    translationErrorCount: 999,
    stripeWebhookFailureCount: 999,
    sessionFailureTimeoutCount: 999
  }
});
assert.equal(quietReport.alerts.length, 1, "quota stop count remains an alert even if quota unit threshold is high");
assert.equal(quietReport.alerts[0].id, "youtube-quota-stop");

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

const allowedChangedFiles = new Set([readinessRuntimePath, readinessDocPath, "scripts/comment-translator-monitoring-incident-readiness-contract.mjs", taskPath]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 24 change stays in allowed files: ${file}`);
}

assert.match(taskSource, /Task 24[\s\S]*Monitoring, alerting, and incident response readiness[\s\S]*Status: complete/i, "task.md records Task 24 completion");
assert.match(taskSource, /width checks skipped[\s\S]*no visible UI\/CSS\/layout change/i, "task.md records width-check skip reason");
assert.match(taskSource, /remote alert\/dashboard mutation.*not run/i, "task.md records remote alert/dashboard mutation as not run");

console.log("comment translator monitoring incident readiness contract checks passed");
