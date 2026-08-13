import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const policyRuntimePath = "lib/comment-translator-provider-policy-runtime.ts";
const executionRuntimePath = "lib/comment-translator-provider-execution-runtime.ts";
const providerBoundaryPath = "lib/comment-translator-provider-boundary.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const taskPath = "task.md";
const sharedTsModuleCache = new Map();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only archive/comment-translator-preview-2026-07-21...HEAD", {
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

assert.ok(exists(policyRuntimePath), "Task 20 provider policy runtime exists");
assert.ok(exists(executionRuntimePath), "provider execution runtime remains available");
assert.ok(exists(providerBoundaryPath), "provider boundary remains available");
assert.ok(exists(usageLedgerPath), "usage ledger remains available");

const policyRuntimeSource = read(policyRuntimePath);
const executionRuntimeSource = read(executionRuntimePath);
const providerBoundarySource = read(providerBoundaryPath);

assert.match(policyRuntimeSource, /^import "server-only";/m, "provider policy runtime is server-only");
assert.match(executionRuntimeSource, /^import "server-only";/m, "provider execution runtime is server-only");
assert.match(policyRuntimeSource, /azure-translator/i, "policy runtime names Azure as a server-owned provider kind");
assert.match(policyRuntimeSource, /openai-mini/i, "policy runtime names OpenAI mini as a server-owned provider kind");
assert.match(policyRuntimeSource, /parseOpenAITranslationProviderResponse/, "policy runtime exposes strict OpenAI output parser");
assert.match(executionRuntimeSource, /fallbackReasonCounts/, "execution runtime exposes sanitized fallback audit counts");
assert.match(providerBoundarySource, /estimatedCostMicros\?: number/, "usage handoff can carry sanitized estimated cost micros");

for (const forbidden of [
  "localStorage",
  "indexedDB",
  "sessionStorage",
  "googleapis",
  "OAuth2Client",
  "refresh_token",
  "access_token",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE_KEY"
]) {
  assert.doesNotMatch(policyRuntimeSource, new RegExp(forbidden, "i"), `policy runtime does not add ${forbidden}`);
  assert.doesNotMatch(executionRuntimeSource, new RegExp(forbidden, "i"), `execution runtime does not add ${forbidden}`);
}

const policyRuntime = loadTsModule(policyRuntimePath);
const executionRuntime = loadTsModule(executionRuntimePath);
const ledger = loadTsModule(usageLedgerPath);
const ownerUserIdKey = "owner" + "UserId";
const liveChatIdKey = "live" + "ChatId";
const providerChannelIdKey = "provider" + "ChannelId";
const privateMarker = "redacted-test-reference";

for (const exportedName of [
  "commentTranslatorProviderImplementationAlignmentContract",
  "createAzureCommentTranslationProvider",
  "createOpenAIMiniCommentTranslationProvider",
  "parseOpenAITranslationProviderResponse",
  "resolveCommentTranslatorTranslationProviderRoute"
]) {
  assert.ok(policyRuntime[exportedName], `policy runtime exports ${exportedName}`);
}

assert.equal(
  typeof executionRuntime.executeCommentTranslatorProviderPolicyBatch,
  "function",
  "execution runtime exports policy-owned provider batch execution"
);

const callerAuthorization = {
  status: "authorized",
  [ownerUserIdKey]: "test-caller-reference"
};
const baseUsage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 10_000,
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
    providerInputCharacterEstimate: 0,
    translatedCharacterEstimate: 0,
    estimatedCostMicros: 0,
    rawCommentText: "never-recorded-by-design"
  }
};
const paidEntitlement = {
  ...baseUsage.planEntitlement,
  plan: "paid",
  planEntitlementReferenceId: "comment-translator-paid-public-v1",
  translatedMessagesPerMinute: 90
};

function createContractProvider({ id, responseFactory }) {
  const calls = [];
  const provider = {
    id,
    name: `${id} contract provider`,
    runtimeScope: "server-runtime-only",
    secretBoundary: {
      runtime: "server-env-only",
      clientBundle: "forbidden",
      fixtures: "forbidden",
      docsAndTaskNotes: "no-secret-values"
    },
    calls,
    async translate(request) {
      calls.push(request);
      return responseFactory(request, calls.length);
    }
  };
  return provider;
}

const azureProvider = createContractProvider({
  id: "azure-translator",
  responseFactory(request) {
    return {
      type: "translated",
      translatedText: `azure-output-${request.requestId.split(":").at(-1)}`,
      detectedSourceLanguage: request.input.sourceLanguage === "auto" ? null : request.input.sourceLanguage,
      confidence: null,
      cacheOutcome: "miss",
      usageHandoff: {
        ...request.usageHandoff,
        providerId: "azure-translator",
        estimatedUnits: 24,
        estimatedCostMicros: 3
      }
    };
  }
});
const openAiRecoverableProvider = createContractProvider({
  id: "openai-mini",
  responseFactory(request) {
    return {
      type: "recoverable-error",
      code: "temporary-unavailable",
      message: "primary provider unavailable",
      retry: {
        retryable: true,
        retryAfterMs: null,
        fallbackToOriginal: true
      },
      usageHandoff: {
        ...request.usageHandoff,
        providerId: "openai-mini",
        estimatedUnits: 18,
        estimatedCostMicros: 7
      }
    };
  }
});
const openAiTerminalProvider = createContractProvider({
  id: "openai-mini",
  responseFactory(request) {
    return {
      type: "terminal-error",
      code: "policy-blocked",
      message: "strict output parsing failed",
      retry: {
        retryable: false
      },
      usageHandoff: {
        ...request.usageHandoff,
        providerId: "openai-mini",
        estimatedUnits: 18,
        estimatedCostMicros: 7
      }
    };
  }
});

const freeRoute = policyRuntime.resolveCommentTranslatorTranslationProviderRoute({
  planEntitlement: baseUsage.planEntitlement,
  providers: {
    azure: azureProvider,
    openAiMini: openAiRecoverableProvider
  }
});
assert.equal(freeRoute.status, "ready");
assert.equal(freeRoute.plan, "free");
assert.equal(freeRoute.fallbackProvider, null, "Free route does not silently fall back to a paid LLM");
assert.equal(freeRoute.providerIdentifiers, "server-only-not-returned");

const paidRoute = policyRuntime.resolveCommentTranslatorTranslationProviderRoute({
  planEntitlement: paidEntitlement,
  providers: {
    azure: azureProvider,
    openAiMini: openAiRecoverableProvider
  }
});
assert.equal(paidRoute.status, "ready");
assert.equal(paidRoute.plan, "paid");
assert.ok(paidRoute.fallbackProvider, "Paid route has Azure fallback when configured");
assert.equal(paidRoute.providerIdentifiers, "server-only-not-returned");

ledger.resetInMemoryCommentTranslatorUsageLedgerForTests();
const freeRun = await executionRuntime.executeCommentTranslatorProviderPolicyBatch({
  providers: {
    azure: azureProvider,
    openAiMini: openAiRecoverableProvider
  },
  callerAuthorization,
  sessionReferenceId: "cts_provider_alignment_free_001",
  occurredAtMs: 10_000,
  usage: baseUsage,
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  comments: [
    {
      commentId: "free-allowed",
      publishedAt: "2026-06-12T00:00:00.000Z",
      text: "free raw text must not return",
      platformLanguageHint: "en",
      [liveChatIdKey]: privateMarker
    },
    {
      commentId: "free-skipped",
      publishedAt: "2026-06-12T00:00:01.000Z",
      text: "😀😀😀",
      platformLanguageHint: null,
      [providerChannelIdKey]: privateMarker
    }
  ]
});
assert.equal(freeRun.status, "completed");
assert.equal(freeRun.providerRouting.plan, "free");
assert.equal(freeRun.providerRouting.primaryProvider, "server-owned-policy-primary");
assert.equal(freeRun.providerRouting.fallbackProvider, "none");
assert.equal(freeRun.providerCallCount, 1, "Free sends only eligible comments to Azure primary");
assert.equal(freeRun.skipsByReason.languagePolicy, 1, "skipped comments are not sent to a provider");
assert.equal(openAiRecoverableProvider.calls.length, 0, "Free route never calls paid OpenAI fallback");

ledger.resetInMemoryCommentTranslatorUsageLedgerForTests();
const paidFallbackOpenAiCallsBefore = openAiRecoverableProvider.calls.length;
const paidFallbackAzureCallsBefore = azureProvider.calls.length;
const paidFallbackRun = await executionRuntime.executeCommentTranslatorProviderPolicyBatch({
  providers: {
    azure: azureProvider,
    openAiMini: openAiRecoverableProvider
  },
  callerAuthorization,
  sessionReferenceId: "cts_provider_alignment_paid_001",
  occurredAtMs: 20_000,
  usage: {
    ...baseUsage,
    planEntitlement: paidEntitlement
  },
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  maxProviderAttemptsPerComment: 1,
  comments: [
    {
      commentId: "paid-fallback",
      publishedAt: "2026-06-12T00:00:02.000Z",
      text: "paid raw text must not return",
      platformLanguageHint: "en",
      [ownerUserIdKey]: privateMarker
    }
  ]
});
assert.equal(paidFallbackRun.status, "completed");
assert.equal(paidFallbackRun.providerRouting.plan, "paid");
assert.equal(paidFallbackRun.providerRouting.primaryProvider, "none");
assert.equal(paidFallbackRun.providerRouting.fallbackProvider, "none");
assert.equal(paidFallbackRun.paidProviderStopReason, "authority-unreadable", "generic Paid execution fails closed without durable Task 6 authority");
assert.equal(paidFallbackRun.providerCallCount, 0, "generic Paid execution reports zero provider calls");
assert.equal(paidFallbackRun.translatedCount, 0, "generic Paid execution returns zero translations");
assert.equal(openAiRecoverableProvider.calls.length, paidFallbackOpenAiCallsBefore, "generic Paid execution never calls OpenAI");
assert.equal(azureProvider.calls.length, paidFallbackAzureCallsBefore, "generic Paid execution never calls Azure fallback");

const paidTerminalOpenAiCallsBefore = openAiTerminalProvider.calls.length;
const paidTerminalAzureCallsBefore = azureProvider.calls.length;
const paidTerminalRun = await executionRuntime.executeCommentTranslatorProviderPolicyBatch({
  providers: {
    azure: azureProvider,
    openAiMini: openAiTerminalProvider
  },
  callerAuthorization,
  sessionReferenceId: "cts_provider_alignment_paid_002",
  occurredAtMs: 30_000,
  usage: {
    ...baseUsage,
    planEntitlement: paidEntitlement
  },
  targetLanguage: "ja",
  sourceLanguages: ["EN"],
  comments: [
    {
      commentId: "paid-terminal",
      publishedAt: "2026-06-12T00:00:03.000Z",
      text: "terminal raw text must not return",
      platformLanguageHint: "en"
    }
  ]
});
assert.equal(paidTerminalRun.status, "completed");
assert.equal(paidTerminalRun.providerRouting.plan, "paid");
assert.equal(paidTerminalRun.providerRouting.primaryProvider, "none");
assert.equal(paidTerminalRun.providerRouting.fallbackProvider, "none");
assert.equal(paidTerminalRun.paidProviderStopReason, "authority-unreadable", "generic Paid terminal provider setup also fails closed before execution");
assert.equal(paidTerminalRun.providerCallCount, 0, "generic Paid terminal setup reports zero provider calls");
assert.equal(paidTerminalRun.translatedCount, 0, "generic Paid terminal setup returns zero translations");
assert.equal(openAiTerminalProvider.calls.length, paidTerminalOpenAiCallsBefore, "generic Paid terminal setup never calls OpenAI");
assert.equal(azureProvider.calls.length, paidTerminalAzureCallsBefore, "generic Paid terminal setup never calls Azure");

assert.deepEqual(
  policyRuntime.parseOpenAITranslationProviderResponse({
    choices: [
      {
        message: {
          content: JSON.stringify({
            translatedText: "こんにちは",
            detectedSourceLanguage: "en",
            confidence: 0.91
          })
        }
      }
    ],
    usage: {
      total_tokens: 12
    }
  }).status,
  "parsed",
  "strict parser accepts exactly shaped OpenAI JSON output"
);
assert.equal(
  policyRuntime.parseOpenAITranslationProviderResponse({
    choices: [
      {
        message: {
          content: "not-json"
        }
      }
    ]
  }).status,
  "invalid",
  "strict parser rejects non-JSON OpenAI output"
);
assert.equal(
  policyRuntime.parseOpenAITranslationProviderResponse({
    choices: [
      {
        message: {
          content: JSON.stringify({
            translatedText: "こんにちは",
            provider: "openai-mini"
          })
        }
      }
    ]
  }).status,
  "invalid",
  "strict parser rejects extra provider identifier output"
);

const ledgerRecords = ledger.readInMemoryCommentTranslatorUsageLedgerRecordsForTests();
assert.ok(
  ledgerRecords.some((record) => record.type === "provider-request-estimated"),
  "provider request estimates are recorded for aligned provider execution"
);
assert.ok(
  ledgerRecords.some((record) => record.type === "ai-usage-estimated" && record.estimatedCostMicros >= 0),
  "AI usage estimate includes sanitized cost micros"
);

for (const payload of [freeRun, paidFallbackRun, paidTerminalRun, ...ledgerRecords]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "test-caller-reference",
    privateMarker,
    "free raw text must not return",
    "paid raw text must not return",
    "terminal raw text must not return",
    "azure-translator",
    "openai-mini",
    "providerChannelId",
    "liveChatId",
    "ownerUserId"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `sanitized output does not include ${forbiddenValue}`);
  }
}

const allowedChangedFiles = new Set([
  "lib/comment-translator-provider-boundary.ts",
  policyRuntimePath,
  executionRuntimePath,
  usageLedgerPath,
  "scripts/comment-translator-provider-implementation-alignment-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 20 change stays in allowed files: ${file}`);

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

console.log("comment translator provider implementation alignment contract checks passed");
