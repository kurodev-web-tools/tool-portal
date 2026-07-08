import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const f10Path = "lib/comment-translator-azure-normal-translation-execution.ts";
const providerExecutionPath = "lib/comment-translator-provider-execution-runtime.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const durableUsagePath = "lib/comment-translator-durable-usage-counter-store.ts";
const entitlementPath = "lib/comment-translator-public-entitlement-baseline.ts";
const usageDisplayPath = "lib/comment-translator-free-beta-usage-display.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const copyPath = "lib/comment-translator.ts";
const taskPath = "task.md";
const boardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const migrationPath = "supabase/migrations/20260615001000_comment_translator_usage_ledger_events.sql";
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

function characterCount(value) {
  return Array.from(value.trim()).length;
}

for (const requiredPath of [
  f10Path,
  providerExecutionPath,
  "lib/comment-translator-admin-operational-visibility.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  usageLedgerPath,
  durableUsagePath,
  entitlementPath,
  usageDisplayPath,
  sessionRuntimePath,
  copyPath,
  taskPath,
  boardPath,
  migrationPath
]) {
  assert.ok(exists(requiredPath), `monthly input character accounting required file exists: ${requiredPath}`);
}

const f10Source = read(f10Path);
const providerExecutionSource = read(providerExecutionPath);
const usageLedgerSource = read(usageLedgerPath);
const durableUsageSource = read(durableUsagePath);
const entitlementSource = read(entitlementPath);
const usageDisplaySource = read(usageDisplayPath);
const sessionRuntimeSource = read(sessionRuntimePath);
const copySource = read(copyPath);
const taskSource = read(taskPath);
const boardSource = read(boardPath);
const migrationSource = read(migrationPath);

assert.match(sessionRuntimeSource, /monthlyProviderInputCharacterLimit/, "session entitlement names the monthly input character limit");
assert.match(sessionRuntimeSource, /monthlyProviderInputCharacters:\s*20_000/, "Free entitlement records 20,000 monthly provider-input characters");
assert.doesNotMatch(sessionRuntimeSource, /monthlyTranslatedCharacters/, "session runtime no longer names the cap as translated characters");

assert.match(usageLedgerSource, /providerInputCharacterEstimate/, "usage ledger records provider-input character estimates");
assert.match(usageLedgerSource, /monthlyProviderInputCharacterEstimate/, "usage ledger exposes monthly provider-input character usage");
assert.doesNotMatch(usageLedgerSource, /monthlyTranslatedCharacterEstimate/, "usage ledger no longer uses translated-output characters for monthly cap snapshots");

assert.match(durableUsageSource, /monthlyProviderInputCharacterEstimate/, "durable usage adapter exposes monthly provider-input character usage");
assert.match(
  durableUsageSource,
  /translated_character_estimate[\s\S]*providerInputCharacterEstimate|providerInputCharacterEstimate[\s\S]*translated_character_estimate/,
  "durable adapter maps provider-input characters into the legacy durable column without a schema change"
);
assert.doesNotMatch(durableUsageSource, /provider_input_character_estimate/, "durable adapter does not require a new public DB column");
assert.match(migrationSource, /translated_character_estimate integer not null default 0/i, "existing migration keeps the legacy durable character column");
assert.doesNotMatch(migrationSource, /provider_input_character_estimate/i, "this slice does not add a migration-only provider input column");

assert.match(entitlementSource, /monthlyProviderInputCharacterLimit/, "public entitlement baseline exposes monthly provider-input character limit");
assert.match(entitlementSource, /monthlyProviderInputCharacterRemaining/, "public entitlement baseline exposes monthly provider-input remaining");
assert.doesNotMatch(entitlementSource, /monthlyTranslatedCharacterLimit/, "public entitlement baseline no longer names the Free cap as translated-output characters");

assert.match(usageDisplaySource, /monthlyInputCharacterCap/, "usage display exposes monthly input character cap metadata");
assert.match(copySource, /Monthly input character cap|月間入力文字上限/, "localized usage copy names input characters");
assert.match(f10Source, /pendingProviderInputCharacterEstimate/, "F10 pre-provider monthly cap checks pending provider-input characters");
assert.doesNotMatch(f10Source, /monthlyTranslatedCharacterEstimate/, "F10 does not enforce the monthly cap from translated-output characters");
assert.match(providerExecutionSource, /providerInputCharacterEstimate/, "provider runtime carries provider-input estimates from requests to usage records");

assert.match(boardSource, /provider-input\/source characters/i, "public launch task board preserves the canonical monthly input-character scope");
assert.match(taskSource, /monthly_input_character_accounting_status=complete/, "task.md records monthly input-character accounting completion");

const runtime = loadTsModule(providerExecutionPath);
const ledger = loadTsModule(usageLedgerPath);
const durableUsage = loadTsModule(durableUsagePath);
const f10 = loadTsModule(f10Path);
const session = loadTsModule(sessionRuntimePath);
const entitlement = loadTsModule(entitlementPath);
const usageDisplay = loadTsModule(usageDisplayPath);

ledger.resetInMemoryCommentTranslatorUsageLedgerForTests();
const callerAuthorization = {
  status: "authorized",
  ownerUserId: "monthly-input-owner-reference"
};
const freeEntitlement = session.createCommentTranslatorSessionPlanEntitlement({ plan: "free" });
assert.equal(freeEntitlement.monthlyProviderInputCharacterLimit, 20_000);

const baseUsage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 0,
  translatedMessagesInCurrentMinute: 0,
  monthlyProviderInputCharacterEstimate: 0,
  providerBudgetAvailable: true,
  globalBudgetAvailable: true,
  aiBudgetAvailable: true,
  translationProviderAvailable: true,
  planEntitlement: freeEntitlement,
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

const providerInputText = "short input";
const translatedOutputText = "translated output intentionally longer than source text";
const providerInputCharacterEstimate = characterCount(providerInputText);
const translatedCharacterEstimate = characterCount(translatedOutputText);
let providerCallCount = 0;
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
    return {
      type: "translated",
      translatedText: translatedOutputText,
      detectedSourceLanguage: request.input.sourceLanguage === "auto" ? "en" : request.input.sourceLanguage,
      confidence: 0.9,
      cacheOutcome: "miss",
      usageHandoff: {
        meteringEventId: `meter-${request.requestId}`,
        providerId: "contract-provider",
        billingCategory: "translation",
        estimatedUnits: 1,
        estimatedCostMicros: 25,
        cacheOutcome: "miss",
        enforcement: "not-implemented",
        databaseWrite: "not-implemented",
        logPolicy: "short-lived-provider-diagnostic-only"
      }
    };
  }
};

const providerRun = await runtime.executeCommentTranslatorProviderBatch({
  provider,
  callerAuthorization,
  sessionReferenceId: "cts_monthly_input_provider_runtime",
  occurredAtMs: Date.parse("2026-07-08T00:00:00.000Z"),
  usage: baseUsage,
  targetLanguage: "ja",
  sourceLanguages: ["EN"],
  maxBatchSize: 1,
  comments: [
    {
      commentId: "comment-monthly-input-provider-runtime",
      publishedAt: "2026-07-08T00:00:00.000Z",
      text: providerInputText,
      platformLanguageHint: "en"
    }
  ]
});
assert.equal(providerRun.status, "completed");
assert.equal(providerCallCount, 1);
assert.equal(providerRun.translations[0].providerInputCharacterEstimate, providerInputCharacterEstimate);
assert.equal(providerRun.translations[0].translatedCharacterEstimate, translatedCharacterEstimate);

const providerRecords = ledger.readInMemoryCommentTranslatorUsageLedgerRecordsForTests();
const providerAiRecord = providerRecords.find((record) => record.type === "ai-usage-estimated");
assert.ok(providerAiRecord, "provider runtime records an AI usage estimate");
assert.equal(providerAiRecord.providerInputCharacterEstimate, providerInputCharacterEstimate);
assert.equal(providerAiRecord.translatedCharacterEstimate, translatedCharacterEstimate);

const providerSnapshot = ledger.readInMemoryCommentTranslatorUsageSnapshot({
  callerAuthorization,
  nowMs: Date.parse("2026-07-08T00:00:05.000Z"),
  plan: "free",
  activeSession: {
    sessionReferenceId: "cts_monthly_input_provider_runtime",
    startedAtMs: Date.parse("2026-07-08T00:00:00.000Z"),
    lastHeartbeatAtMs: Date.parse("2026-07-08T00:00:01.000Z")
  }
});
assert.equal(providerSnapshot.monthlyProviderInputCharacterEstimate, providerInputCharacterEstimate);
assert.equal(providerSnapshot.aiUsageEstimate.providerInputCharacterEstimate, providerInputCharacterEstimate);
assert.equal(providerSnapshot.aiUsageEstimate.translatedCharacterEstimate, translatedCharacterEstimate);

const aiUsageRowDraft = durableUsage.createCommentTranslatorDurableUsageCounterRowDraft({
  ownerUserId: callerAuthorization.ownerUserId,
  userLedgerReferenceId: ledger.createCommentTranslatorUsageLedgerUserReference(callerAuthorization),
  event: {
    type: "ai-usage-estimated",
    provider: "youtube",
    sessionReferenceId: "cts_monthly_input_durable",
    occurredAtMs: Date.parse("2026-07-08T00:10:00.000Z"),
    translatedMessageEstimate: 1,
    providerInputCharacterEstimate,
    translatedCharacterEstimate,
    estimatedCostMicros: 25,
    rawCommentText: "never-recorded-by-design"
  },
  nowIso: "2026-07-08T00:10:01.000Z"
});
assert.equal(aiUsageRowDraft.translated_character_estimate, providerInputCharacterEstimate);
assert.equal(aiUsageRowDraft.raw_comment_text, "never-recorded-by-design");
assert.equal(aiUsageRowDraft.provider_target_metadata, "forbidden");

const durableRows = [
  {
    ...aiUsageRowDraft,
    id: "ctule_monthly_input_001",
    created_at: "2026-07-08T00:10:01.000Z"
  }
];
const durableUsageCounterStore = {
  status: "ready",
  store: {
    async readUsageEvents() {
      return durableRows;
    },
    async persistUsageEvent() {}
  },
  missingEnvReferences: [],
  failClosed: false
};
const durableSnapshot = await durableUsage.readCommentTranslatorDurableUsageSnapshotOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore,
  nowMs: Date.parse("2026-07-08T00:10:05.000Z"),
  plan: "free",
  activeSession: {
    sessionReferenceId: "cts_monthly_input_durable",
    startedAtMs: Date.parse("2026-07-08T00:10:00.000Z"),
    lastHeartbeatAtMs: Date.parse("2026-07-08T00:10:01.000Z")
  }
});
assert.equal(durableSnapshot.status, "ready");
assert.equal(durableSnapshot.snapshot.monthlyProviderInputCharacterEstimate, providerInputCharacterEstimate);
assert.equal(durableSnapshot.snapshot.aiUsageEstimate.providerInputCharacterEstimate, providerInputCharacterEstimate);
assert.equal(durableSnapshot.snapshot.aiUsageEstimate.translatedCharacterEstimate, 0);

const baselineAtCap = entitlement.resolveCommentTranslatorPublicEntitlementBaseline({
  billingSnapshot: {
    plan: "free",
    billingState: "free",
    planEntitlement: freeEntitlement
  },
  durableUsageRead: {
    status: "ready",
    snapshot: {
      ...baseUsage,
      monthlyProviderInputCharacterEstimate: 20_000
    },
    authority: "durable-store"
  }
});
assert.equal(baselineAtCap.status, "ready");
assert.equal(baselineAtCap.monthlyProviderInputCharacterLimit, 20_000);
assert.equal(baselineAtCap.monthlyProviderInputCharacterRemaining, 0);
assert.equal(baselineAtCap.usage.aiBudgetAvailable, false);

const displayAtCap = usageDisplay.createCommentTranslatorFreeBetaUsageDisplay({
  usage: baselineAtCap.usage,
  elapsedMs: 0
});
assert.equal(displayAtCap.status, "over-limit");
assert.equal(displayAtCap.monthlyInputCharacterCap.used, 20_000);
assert.equal(displayAtCap.monthlyInputCharacterCap.remaining, 0);
assert.equal(displayAtCap.providerCallPolicy.status, "blocked-over-limit");
assert.equal(displayAtCap.providerCallPolicy.stopReason, "ai-budget-stop");

let f10ProviderCallCount = 0;
const f10Provider = {
  ...provider,
  async translate(request) {
    f10ProviderCallCount += 1;
    return provider.translate(request);
  }
};
const f10Result = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: [
    {
      provider: "youtube",
      messageReferenceId: "yt-monthly-input-f10",
      kind: "text",
      publishedAtIso: "2026-07-08T00:20:00.000Z",
      text: providerInputText,
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
  callerAuthorization,
  sessionReferenceId: "cts_monthly_input_f10",
  occurredAtMs: Date.parse("2026-07-08T00:20:01.000Z"),
  usage: baseUsage,
  providers: {
    azure: f10Provider
  },
  maxBatchSize: 1
});
assert.equal(f10Result.status, "completed");
assert.equal(f10ProviderCallCount, 1);
assert.equal(f10Result.usageHandoffEstimate.providerInputCharacterEstimate, providerInputCharacterEstimate);
assert.equal(f10Result.usageHandoffEstimate.translatedCharacterEstimate, translatedCharacterEstimate);

const overInputLimitResult = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: [
    {
      provider: "youtube",
      messageReferenceId: "yt-monthly-input-over-limit",
      kind: "text",
      publishedAtIso: "2026-07-08T00:30:00.000Z",
      text: providerInputText,
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
  callerAuthorization,
  sessionReferenceId: "cts_monthly_input_over_limit",
  occurredAtMs: Date.parse("2026-07-08T00:30:01.000Z"),
  usage: {
    ...baseUsage,
    monthlyProviderInputCharacterEstimate: 20_000 - providerInputCharacterEstimate + 1
  },
  providers: {
    azure: f10Provider
  },
  maxBatchSize: 1
});
assert.equal(overInputLimitResult.status, "over-limit");
assert.equal(f10ProviderCallCount, 1, "pre-provider monthly input character cap blocks provider execution");
assert.equal(overInputLimitResult.usageHandoffEstimate.providerInputCharacterEstimate, 0);
assert.equal(overInputLimitResult.usageHandoffEstimate.translatedCharacterEstimate, 0);

for (const source of [
  f10Source,
  providerExecutionSource,
  usageLedgerSource,
  durableUsageSource,
  entitlementSource,
  usageDisplaySource,
  sessionRuntimeSource,
  copySource,
  taskSource,
  boardSource
]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "monthly input character accounting source excludes secret values, token values, authorization values, and private provider identifiers"
  );
}

const allowedChangedFiles = new Set([
  f10Path,
  providerExecutionPath,
  "lib/comment-translator-admin-operational-visibility.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  usageLedgerPath,
  durableUsagePath,
  entitlementPath,
  usageDisplayPath,
  sessionRuntimePath,
  copyPath,
  "components/comment-translator/CommentTranslatorDock.tsx",
  "scripts/comment-translator-monthly-input-character-accounting-contract.mjs",
  "scripts/comment-translator-abuse-rate-limit-hardening-contract.mjs",
  "scripts/comment-translator-admin-operational-visibility-contract.mjs",
  "scripts/comment-translator-monitoring-incident-readiness-contract.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
  "scripts/comment-translator-provider-implementation-alignment-contract.mjs",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g1-remote-durable-enforcement-execution-contract.mjs",
  "scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-public-entitlement-baseline-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "scripts/comment-translator-free-beta-remote-durable-enforcement-evidence-contract.mjs",
  taskPath,
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
  boardPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `monthly input accounting change stays in allowed files: ${file}`);
}

console.log("comment translator monthly input character accounting contract checks passed");
