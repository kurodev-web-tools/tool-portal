import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const f10Path = "lib/comment-translator-azure-normal-translation-execution.ts";
const sharedPath = "lib/comment-translator-real-comments-feed-shared.ts";
const normalizationPath = "lib/comment-translator-live-message-normalization.ts";
const providerExecutionPath = "lib/comment-translator-provider-execution-runtime.ts";
const providerPolicyPath = "lib/comment-translator-provider-policy-runtime.ts";
const providerBoundaryPath = "lib/comment-translator-provider-boundary.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
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
  f10Path,
  sharedPath,
  normalizationPath,
  providerExecutionPath,
  providerPolicyPath,
  providerBoundaryPath,
  usageLedgerPath,
  readinessDocPath,
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `F10 required file exists: ${requiredPath}`);
}

const f10Source = read(f10Path);
const sharedSource = read(sharedPath);
const normalizationSource = read(normalizationPath);
const providerExecutionSource = read(providerExecutionPath);
const providerPolicySource = read(providerPolicyPath);
const providerBoundarySource = read(providerBoundaryPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(f10Source, /^import "server-only";/m, "F10 Azure normal translation execution bridge is server-only");
assert.match(f10Source, /commentTranslatorAzureNormalTranslationExecutionContract/, "F10 exposes a focused contract");
assert.match(f10Source, /executeCommentTranslatorProviderPolicyBatch/, "F10 uses the existing provider policy execution path");
assert.match(f10Source, /createCommentTranslatorDefaultTranslationProviderSet/, "F10 default provider set stays server-runtime env owned");
assert.match(f10Source, /createCommentTranslatorRealCommentsFeedStateFromTranslatedRows/, "F10 projects translated results back to the safe F9 row shape");
assert.match(sharedSource, /translated-f10/, "F9 shared row shape accepts F10 translated rows");
assert.match(normalizationSource, /rawProviderPayload: "not-returned-by-design"/, "F8 still suppresses raw provider payloads");
assert.match(providerExecutionSource, /bounded-batches-no-delayed-queue/, "provider execution still uses bounded batches");
assert.match(providerPolicySource, /freePlanPrimary: "azure-translator"/, "Free policy remains Azure primary");
assert.match(providerBoundarySource, /server-env-only/, "provider secrets remain server env only");
assert.match(readinessDoc, /F10 Azure normal translation execution/i, "durable readiness doc records F10");
assert.match(gapAudit, /F10[\s\S]*Azure/i, "gap audit records F10");
assert.match(taskSource, /Free Azure translation/i, "task.md records Free Azure translation status");
assert.match(taskSource, /Width checks/i, "task.md records width-check handling");

for (const forbidden of [
  "localStorage",
  "indexedDB",
  "sessionStorage",
  "liveChatMessages.list",
  "liveBroadcasts.list",
  "supabase db push",
  "wrangler deploy",
  "wrangler versions upload"
]) {
  assert.doesNotMatch(f10Source, new RegExp(forbidden, "i"), `F10 source does not add ${forbidden}`);
}

const f10 = loadTsModule(f10Path);
const shared = loadTsModule(sharedPath);
const normalization = loadTsModule(normalizationPath);
const ledger = loadTsModule(usageLedgerPath);

assert.equal(f10.commentTranslatorAzureNormalTranslationExecutionContract.implementationStage, "free-public-beta-f10-azure-normal-translation-execution");
assert.equal(f10.commentTranslatorAzureNormalTranslationExecutionContract.runtime, "server-only");
assert.equal(f10.commentTranslatorAzureNormalTranslationExecutionContract.freePlanPrimary, "azure-translator");
assert.equal(f10.commentTranslatorAzureNormalTranslationExecutionContract.providerApiExecution, "approval-gated-not-run-by-default");
assert.equal(f10.commentTranslatorAzureNormalTranslationExecutionContract.publicLaunchAllowed, false);

ledger.resetInMemoryCommentTranslatorUsageLedgerForTests();
const ownerUserIdKey = "owner" + "UserId";
const callerAuthorization = {
  status: "authorized",
  [ownerUserIdKey]: "f10-owner-reference-never-output"
};
const usage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 30_000,
  translatedMessagesInCurrentMinute: 0,
  monthlyTranslatedCharacterEstimate: 0,
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
    monthlyTranslatedCharacterLimit: 20_000,
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

const normalized = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "yt-f10-text-1",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:00.000Z",
        textMessageDetails: { messageText: "Hello Azure path" }
      },
      authorDetails: {
        channelId: "f10-author-channel-never-output",
        channelUrl: "https://youtube.example/f10-author-never-output",
        profileImageUrl: "https://images.example/f10-profile-never-output.png",
        isChatModerator: true
      }
    },
    {
      id: "yt-f10-super-1",
      snippet: {
        type: "superChatEvent",
        publishedAt: "2026-06-16T01:00:01.000Z",
        superChatDetails: {
          userComment: "Support this stream",
          amountDisplayString: "JPY 500",
          tier: 2
        }
      }
    },
    {
      id: "yt-f10-same-language-1",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:02.000Z",
        textMessageDetails: { messageText: "日本語コメント" }
      }
    },
    {
      id: "yt-f10-deleted-1",
      snippet: {
        type: "messageDeletedEvent",
        publishedAt: "2026-06-16T01:00:03.000Z",
        messageDeletedDetails: { deletedMessageId: "yt-f10-text-1" }
      }
    },
    {
      id: "yt-f10-ended-1",
      snippet: {
        type: "liveChatEndedEvent",
        publishedAt: "2026-06-16T01:00:04.000Z"
      }
    }
  ]
});

const providerRequests = [];
let azureCallCount = 0;
const azure = {
  id: "azure-translator",
  name: "Azure Translator contract double",
  runtimeScope: "server-runtime-only",
  secretBoundary: {
    runtime: "server-env-only",
    clientBundle: "forbidden",
    fixtures: "forbidden",
    docsAndTaskNotes: "no-secret-values"
  },
  async translate(request) {
    azureCallCount += 1;
    providerRequests.push(request);
    return {
      type: "translated",
      translatedText: `ja:${request.requestId.split(":").at(-1)}`,
      detectedSourceLanguage: request.input.sourceLanguage === "auto" ? null : request.input.sourceLanguage,
      confidence: 0.95,
      cacheOutcome: "miss",
      usageHandoff: {
        ...request.usageHandoff,
        providerId: "azure-translator",
        estimatedUnits: Array.from(request.input.text).length,
        estimatedCostMicros: Array.from(request.input.text).length,
        cacheOutcome: "miss"
      }
    };
  }
};
const openAiMini = {
  ...azure,
  id: "openai-mini",
  name: "OpenAI mini must not be called for free",
  async translate() {
    throw new Error("OpenAI mini should not be called for Free F10 execution.");
  }
};
const feedPersistenceStore = {
  status: "unavailable",
  store: null,
  missingEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  failClosed: true,
  reason: "trusted-service-role-env-missing"
};

const result = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: normalized.normalizedMessages,
  sessionStatus: "active",
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  callerAuthorization,
  sessionReferenceId: "cts_f10_contract_001",
  occurredAtMs: Date.parse("2026-06-16T01:00:05.000Z"),
  usage,
  providers: {
    azure,
    openAiMini
  },
  feedPersistenceStore,
  maxBatchSize: 2,
  maxProviderAttemptsPerComment: 1
});

assert.equal(result.status, "completed");
assert.equal(result.execution.providerRouting.plan, "free");
assert.equal(result.execution.providerRouting.primaryProvider, "server-owned-policy-primary");
assert.equal(result.execution.providerRouting.fallbackProvider, "none");
assert.equal(result.execution.providerRequestCount, 2);
assert.equal(result.execution.providerCallCount, 2);
assert.equal(result.execution.translatedCount, 2);
assert.equal(result.execution.skipsByReason.languagePolicy, 1);
assert.equal(result.eligibility.eligibleCommentCount, 3);
assert.equal(result.eligibility.nonTranslatableEventCount, 2);
assert.equal(result.eligibility.duplicateTextSkippedCount, 0);
assert.equal(result.feed.status, "ready");
assert.equal(result.feed.rows.length, 5);
assert.equal(result.feedPersistence.status, "persisted");
assert.equal(result.feedPersistence.durableFeedPersistResultLabel, "durable-feed-store-unavailable");
assert.equal(result.feedPersistence.durableFeedPersistDiagnostics.storeReadyLabel, "unavailable");
assert.equal(result.feedPersistence.durableFeedPersistDiagnostics.tableShapeLabel, "unknown");
assert.equal(result.feedPersistence.durableFeedPersistDiagnostics.persistOperationLabel, "not-run");
assert.equal(result.feedPersistence.durableFeedPersistDiagnostics.persistFailureBucketLabel, "store-unavailable");
assert.equal(result.feedPersistence.durableFeedPersistDiagnostics.rowsTouchedCount, 0);
assert.equal(result.feedPersistence.durableFeedPersistDiagnostics.readbackLabel, "not-run-store-unavailable");
assert.equal(result.feedPersistence.displayRowCount, 5);
assert.equal(result.feed.rows.find((row) => row.id === "yt-f10-text-1").translatedText, "ja:yt-f10-text-1");
assert.equal(result.feed.rows.find((row) => row.id === "yt-f10-text-1").translationStatus, "translated-f10");
assert.equal(result.feed.rows.find((row) => row.id === "yt-f10-super-1").translatedText, "ja:yt-f10-super-1");
assert.equal(result.feed.rows.find((row) => row.id === "yt-f10-same-language-1").translationStatus, "skipped-f10-language-policy");
assert.equal(result.feed.rows.find((row) => row.id === "yt-f10-deleted-1").translationStatus, "skipped-f10-non-translatable");
assert.equal(result.feed.rows.find((row) => row.id === "yt-f10-ended-1").translationStatus, "skipped-f10-non-translatable");
assert.equal(result.usageHandoffEstimate.providerRequestEstimateCount, 2);
assert.equal(result.usageHandoffEstimate.translatedMessageEstimate, 2);
assert.ok(result.usageHandoffEstimate.translatedCharacterEstimate > 0);
assert.equal(result.usageHandoffEstimate.durableUsageWrite, "not-run-local-deterministic-handoff-only");
assert.equal(result.publicLaunchAllowed, false);
assert.equal(azureCallCount, 2);

for (const request of providerRequests) {
  assert.equal(request.input.kind, "live-comment");
  assert.equal(request.input.targetLanguage, "ja");
  assert.notEqual(request.input.text.trim(), "");
  assert.equal(request.privacy.rawTextLogging, "disabled-by-default");
  assert.equal(request.privacy.piiMinimization, "exclude-author-and-channel-identifiers");
  assert.equal(request.cache.keyMaterial.excludes.includes("liveChatId"), true);
  assert.equal(request.cache.keyMaterial.excludes.includes("providerChannelId"), true);
  assert.equal(request.cache.keyMaterial.excludes.includes("rawProviderTargetMetadata"), true);
}

const duplicateCycle = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "yt-f10-text-1",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:00.000Z",
        textMessageDetails: { messageText: "Hello Azure path" }
      }
    },
    {
      id: "yt-f10-super-1",
      snippet: {
        type: "superChatEvent",
        publishedAt: "2026-06-16T01:00:01.000Z",
        superChatDetails: {
          userComment: "Support this stream",
          amountDisplayString: "JPY 500",
          tier: 2
        }
      }
    },
    {
      id: "yt-f10-text-2",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:06.000Z",
        textMessageDetails: { messageText: "Second cycle new comment" }
      }
    }
  ]
});
const secondCycle = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: duplicateCycle.normalizedMessages,
  sessionStatus: "active",
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  callerAuthorization,
  sessionReferenceId: "cts_f10_contract_001",
  occurredAtMs: Date.parse("2026-06-16T01:00:07.000Z"),
  usage,
  providers: {
    azure,
    openAiMini
  },
  feedPersistenceStore,
  maxBatchSize: 2,
  maxProviderAttemptsPerComment: 1
});
const secondCycleIds = secondCycle.feed.rows.map((row) => row.messageReferenceId);
assert.equal(secondCycle.status, "completed");
assert.equal(secondCycle.eligibility.eligibleCommentCount, 1);
assert.equal(secondCycle.eligibility.sessionDuplicateSkippedCount, 2);
assert.equal(secondCycle.execution.providerRequestCount, 1);
assert.equal(secondCycle.execution.providerCallCount, 1);
assert.equal(secondCycle.execution.translatedCount, 1);
assert.equal(secondCycle.usageHandoffEstimate.providerRequestEstimateCount, 1);
assert.equal(secondCycle.usageHandoffEstimate.translatedMessageEstimate, 1);
assert.equal(azureCallCount, 3);
assert.equal(secondCycle.feed.rows.length, 6);
assert.equal(new Set(secondCycleIds).size, secondCycleIds.length, "safe feed rows remain unique by commentId across polling cycles");
assert.equal(secondCycle.feed.rows.find((row) => row.id === "yt-f10-text-1").translatedText, "ja:yt-f10-text-1");
assert.equal(secondCycle.feed.rows.find((row) => row.id === "yt-f10-super-1").translatedText, "ja:yt-f10-super-1");
assert.equal(secondCycle.feed.rows.find((row) => row.id === "yt-f10-text-2").translatedText, "ja:yt-f10-text-2");

const duplicateTextCycle = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "yt-f10-text-3",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:08.000Z",
        textMessageDetails: { messageText: "Hello Azure path" }
      }
    }
  ]
});
const thirdCycle = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: duplicateTextCycle.normalizedMessages,
  sessionStatus: "active",
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  callerAuthorization,
  sessionReferenceId: "cts_f10_contract_001",
  occurredAtMs: Date.parse("2026-06-16T01:00:09.000Z"),
  usage,
  providers: {
    azure,
    openAiMini
  },
  feedPersistenceStore,
  maxBatchSize: 2,
  maxProviderAttemptsPerComment: 1
});
const duplicateTextRow = thirdCycle.feed.rows.find((row) => row.id === "yt-f10-text-3");
assert.equal(thirdCycle.status, "completed");
assert.equal(thirdCycle.eligibility.eligibleCommentCount, 1);
assert.equal(thirdCycle.eligibility.sessionDuplicateSkippedCount, 0);
assert.equal(thirdCycle.execution.providerRequestCount, 1);
assert.equal(thirdCycle.execution.providerCallCount, 0);
assert.equal(thirdCycle.execution.translatedCount, 1);
assert.equal(thirdCycle.execution.cacheHitCount, 1);
assert.equal(thirdCycle.execution.cacheMissCount, 0);
assert.equal(thirdCycle.eligibility.duplicateTextSkippedCount, 0);
assert.equal(thirdCycle.usageHandoffEstimate.providerRequestEstimateCount, 0);
assert.equal(thirdCycle.usageHandoffEstimate.translatedMessageEstimate, 1);
assert.equal(azureCallCount, 3);
assert.equal(duplicateTextRow.translatedText, "ja:yt-f10-text-1");
assert.equal(duplicateTextRow.translationStatus, "translated-f10");
assert.equal(duplicateTextRow.translationCacheStatus, "hit");
const duplicateTextUiComment = shared
  .mapCommentTranslatorRealCommentsFeedRowsToUiComments({
    feed: thirdCycle.feed,
    targetLanguageLabel: "Japanese",
    locale: "en",
    timeZone: "UTC"
  })
  .find((comment) => comment.id === "yt-f10-text-3");
assert.equal(duplicateTextUiComment.cacheStatus, "hit");
assert.equal(duplicateTextUiComment.status, "translated");
assert.equal(thirdCycle.feed.rows.length, 7);

const cachedBatchDuplicateCycle = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "yt-f10-text-4",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:10.000Z",
        textMessageDetails: { messageText: "Hello Azure path" }
      }
    },
    {
      id: "yt-f10-text-5",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:11.000Z",
        textMessageDetails: { messageText: "Hello Azure path" }
      }
    }
  ]
});
const cachedBatchDuplicate = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: cachedBatchDuplicateCycle.normalizedMessages,
  sessionStatus: "active",
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  callerAuthorization,
  sessionReferenceId: "cts_f10_contract_001",
  occurredAtMs: Date.parse("2026-06-16T01:00:12.000Z"),
  usage,
  providers: {
    azure,
    openAiMini
  },
  feedPersistenceStore,
  maxBatchSize: 2,
  maxProviderAttemptsPerComment: 1
});
assert.equal(cachedBatchDuplicate.status, "completed");
assert.equal(cachedBatchDuplicate.eligibility.eligibleCommentCount, 1);
assert.equal(cachedBatchDuplicate.eligibility.duplicateTextSkippedCount, 1);
assert.equal(cachedBatchDuplicate.execution.providerRequestCount, 1);
assert.equal(cachedBatchDuplicate.execution.providerCallCount, 0);
assert.equal(cachedBatchDuplicate.execution.translatedCount, 1);
assert.equal(cachedBatchDuplicate.execution.cacheHitCount, 1);
assert.equal(cachedBatchDuplicate.execution.cacheMissCount, 0);
assert.equal(cachedBatchDuplicate.feed.rows.find((row) => row.id === "yt-f10-text-4").translationCacheStatus, "hit");
assert.equal(cachedBatchDuplicate.feed.rows.some((row) => row.id === "yt-f10-text-5"), false);

const sameBatchDuplicateAndSkipCycle = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "yt-f10-text-6",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:13.000Z",
        textMessageDetails: { messageText: "Same batch English duplicate" }
      }
    },
    {
      id: "yt-f10-text-7",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:14.000Z",
        textMessageDetails: { messageText: "Same batch English duplicate" }
      }
    },
    {
      id: "yt-f10-text-8",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T01:00:15.000Z",
        textMessageDetails: { messageText: "日本語コメントその二" }
      }
    }
  ]
});
const sameBatchDuplicateAndSkip = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: sameBatchDuplicateAndSkipCycle.normalizedMessages,
  sessionStatus: "active",
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  callerAuthorization,
  sessionReferenceId: "cts_f10_contract_004",
  occurredAtMs: Date.parse("2026-06-16T01:00:16.000Z"),
  usage,
  providers: {
    azure,
    openAiMini
  },
  feedPersistenceStore,
  maxBatchSize: 2,
  maxProviderAttemptsPerComment: 1
});
assert.equal(sameBatchDuplicateAndSkip.status, "completed");
assert.equal(sameBatchDuplicateAndSkip.eligibility.eligibleCommentCount, 2);
assert.equal(sameBatchDuplicateAndSkip.eligibility.duplicateTextSkippedCount, 1);
assert.equal(sameBatchDuplicateAndSkip.execution.providerRequestCount, 1);
assert.equal(sameBatchDuplicateAndSkip.execution.providerCallCount, 1);
assert.equal(sameBatchDuplicateAndSkip.execution.cacheHitCount, 0);
assert.equal(sameBatchDuplicateAndSkip.execution.cacheMissCount, 1);
assert.equal(sameBatchDuplicateAndSkip.execution.skipsByReason.languagePolicy, 1);
assert.equal(sameBatchDuplicateAndSkip.feed.rows.length, 2);
assert.equal(sameBatchDuplicateAndSkip.feed.rows.find((row) => row.id === "yt-f10-text-6").translationCacheStatus, "miss");
assert.equal(sameBatchDuplicateAndSkip.feed.rows.some((row) => row.id === "yt-f10-text-7"), false);
assert.equal(sameBatchDuplicateAndSkip.feed.rows.find((row) => row.id === "yt-f10-text-8").translationCacheStatus, null);
assert.equal(sameBatchDuplicateAndSkip.feed.rows.find((row) => row.id === "yt-f10-text-8").translationStatus, "skipped-f10-language-policy");

const unavailable = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: normalized.normalizedMessages,
  sessionStatus: "active",
  targetLanguage: "ja",
  sourceLanguages: ["EN"],
  callerAuthorization,
  sessionReferenceId: "cts_f10_contract_002",
  occurredAtMs: Date.parse("2026-06-16T01:00:06.000Z"),
  usage,
  providers: {},
  feedPersistenceStore,
  maxBatchSize: 2,
  maxProviderAttemptsPerComment: 1
});
assert.equal(unavailable.status, "provider-unavailable");
assert.equal(unavailable.execution.providerCallCount, 0);
assert.equal(unavailable.feed.rows.every((row) => row.translationStatus === "provider-unavailable-f10" || row.translationStatus === "skipped-f10-non-translatable"), true);

for (const payload of [result, unavailable, ...ledger.readInMemoryCommentTranslatorUsageLedgerRecordsForTests()]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "f10-owner-reference-never-output",
    "f10-author-channel-never-output",
    "youtube.example/f10-author-never-output",
    "f10-profile-never-output",
    "access_token",
    "refresh_token",
    "authorization_code",
    "service_role",
    "liveChatId",
    "providerChannelId",
    "nextPageToken"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `F10 sanitized output excludes ${forbiddenValue}`);
  }
}

const allowedChangedFiles = new Set([
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts",
  "components/comment-translator/CommentTranslatorDock.tsx",
  "lib/comment-translator-bounded-live-chat-polling-wiring.ts",
  f10Path,
  "lib/comment-translator-live-provider-session-step.ts",
  "lib/comment-translator-real-comments-feed-durable-store.ts",
  "lib/comment-translator-real-comments-feed-session-bridge.ts",
  "lib/comment-translator-real-comments-ui-wiring.ts",
  "lib/comment-translator-private-gated-live-provider-smoke-execution-harness.ts",
  sharedPath,
  "supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql",
  readinessDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  gapAuditPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533-contract.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F10 change stays in allowed files: ${file}`);

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

console.log("comment translator Azure normal translation execution contract checks passed");
