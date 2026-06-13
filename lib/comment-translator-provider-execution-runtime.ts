import "server-only";

import type {
  CommentTranslationCacheOutcome,
  CommentTranslationProvider,
  CommentTranslationProviderRecoverableError,
  CommentTranslationProviderRequest,
  CommentTranslationProviderResponse,
  CommentTranslationProviderResult
} from "./comment-translator-provider-boundary";
import type { CommentTranslatorTranslationProviderSet } from "./comment-translator-provider-policy-runtime";
import { resolveCommentTranslatorTranslationProviderRoute } from "./comment-translator-provider-policy-runtime";
import type { CommentTranslatorUsageLedgerEvent, CommentTranslatorUsageLedgerSnapshot } from "./comment-translator-usage-ledger-runtime";
import { recordInMemoryCommentTranslatorUsageLedgerEvent } from "./comment-translator-usage-ledger-runtime";
import { createYouTubeLiveCommentTranslatorPipelineRequestsForComments } from "./comment-translator-youtube-live-comment-intake-pipeline";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";
import {
  assertCommentTranslatorAbuseRequestAllowed,
  type CommentTranslatorAbuseRateLimitBlockedResult,
  type CommentTranslatorAbuseRateLimitStore
} from "./comment-translator-abuse-rate-limit-runtime";

export type CommentTranslatorProviderExecutionRuntimeContract = {
  implementationStage: "server-owned-translation-provider-execution-integration";
  runtime: "server-only";
  inputBoundary: "youtube-provider-safe-comment-payload-only";
  providerExecution: "injected-server-only-provider-after-language-policy";
  batching: "bounded-batches-no-delayed-queue";
  cache: "server-owned-translation-cache-by-sanitized-key-material";
  perMinuteCap: "server-owned-plan-entitlement-translated-messages-per-minute";
  retryCaps: "bounded-recoverable-provider-error-attempts";
  providerErrorClasses: readonly ["translated", "recoverable-error", "terminal-error"];
  usageRecording: "in-memory-usage-ledger-provider-and-ai-estimates";
  lowerPriorityOverflow: "skip-tail-comments-under-load";
  browserStorage: "forbidden";
  handoffPayload: "unchanged";
  providerTargetMetadata: "forbidden";
  rawCommentLogging: "disabled-by-default";
  liveProviderExecution: "not-run-without-same-thread-preflight-sanitized-output-and-explicit-approval";
};

export type CommentTranslatorProviderExecutionCache = {
  read(lookupKey: string): CachedCommentTranslation | null;
  write(lookupKey: string, translation: CachedCommentTranslation): void;
};

export type CachedCommentTranslation = {
  translatedText: string;
  detectedSourceLanguage: string | null;
  confidence: number | null;
};

export type ExecuteCommentTranslatorProviderBatchRequest = {
  provider: CommentTranslationProvider;
  fallbackProvider?: CommentTranslationProvider | null;
  fallbackOnRecoverableProviderError?: boolean;
  comments: readonly YouTubeProviderSafeCommentPayload[];
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  sessionReferenceId: string;
  occurredAtMs: number;
  usage: CommentTranslatorUsageLedgerSnapshot;
  targetLanguage: string;
  sourceLanguages?: readonly string[];
  glossaryTerms?: readonly string[];
  glossaryVersion?: string | null;
  providerCapabilityVersion?: string;
  moderationPolicyVersion?: string;
  maxBatchSize?: number;
  maxProviderAttemptsPerComment?: number;
  cache?: CommentTranslatorProviderExecutionCache;
  abuseRateLimit?: {
    nowMs?: number;
    requestIp?: string | null;
    rateLimitStore?: CommentTranslatorAbuseRateLimitStore;
    precomputedCheck?: CommentTranslatorAbuseRateLimitBlockedResult;
  };
};

export type ExecuteCommentTranslatorProviderPolicyBatchRequest = Omit<ExecuteCommentTranslatorProviderBatchRequest, "provider"> & {
  providers: CommentTranslatorTranslationProviderSet;
};

export type CommentTranslatorProviderExecutionBatchSummary = {
  batchIndex: number;
  providerRequestCount: number;
};

export type CommentTranslatorProviderExecutionResult =
  | (CommentTranslatorProviderExecutionResultBase & {
      status: "completed";
      batches: readonly CommentTranslatorProviderExecutionBatchSummary[];
      translations: readonly CommentTranslatorProviderExecutionTranslation[];
    })
  | (CommentTranslatorProviderExecutionResultBase & {
      status: "blocked-non-server-translator-provider";
      batches: readonly [];
      translations: readonly [];
      reason: "translator-provider-must-be-server-runtime-only";
    })
  | (CommentTranslatorProviderExecutionResultBase & {
      status: "blocked-abuse-rate-limit";
      batches: readonly [];
      translations: readonly [];
      reason: "rate-limit-exceeded";
      rateLimit: Pick<CommentTranslatorAbuseRateLimitBlockedResult, "retryAfterSeconds" | "browserReadableOutput">;
    });

export type CommentTranslatorProviderExecutionResultBase = {
  implementationStage: CommentTranslatorProviderExecutionRuntimeContract["implementationStage"];
  providerRequestCount: number;
  providerCallCount: number;
  translatedCount: number;
  skippedCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
  retryCount: number;
  skipsByReason: {
    languagePolicy: number;
    perMinuteCap: number;
    providerUnavailable: number;
  };
  errorCounts: {
    recoverable: number;
    terminal: number;
  };
  usageRecorded: {
    providerRequestEstimate: boolean;
    aiUsageEstimate: boolean;
  };
  providerRouting: {
    plan: "free" | "paid" | "unresolved";
    primaryProvider: "server-owned-policy-primary" | "direct-injected-provider" | "none";
    fallbackProvider: "server-owned-policy-fallback" | "direct-injected-provider" | "none";
    providerIdentifiers: "server-only-not-returned";
  };
  fallbackReasonCounts: {
    recoverablePrimaryError: number;
  };
  estimatedCostMicros: number;
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  providerTargetMetadata: "forbidden";
  rawCommentText: "never-returned-by-design";
};

export type CommentTranslatorProviderExecutionTranslation = {
  commentReferenceId: string;
  translatedText: string;
  detectedSourceLanguage: string | null;
  confidence: number | null;
  cacheOutcome: CommentTranslationCacheOutcome;
  providerErrorClass: "translated";
  estimatedCostMicros: number;
  recoverablePrimaryFallbackCount: number;
};

type CommentTranslatorProviderExecutionResultBaseOverrides = Partial<CommentTranslatorProviderExecutionResultBase> & {
  languagePolicySkippedCount?: number;
  perMinuteSkippedCount?: number;
  providerUnavailableSkippedCount?: number;
  recoverableErrorCount?: number;
  terminalErrorCount?: number;
  providerUsageRecorded?: boolean;
  aiUsageRecorded?: boolean;
  recoverablePrimaryFallbackCount?: number;
};

const defaultMaxBatchSize = 10;
const defaultMaxProviderAttemptsPerComment = 2;

export const commentTranslatorProviderExecutionRuntimeContract = {
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
} as const satisfies CommentTranslatorProviderExecutionRuntimeContract;

export function createInMemoryCommentTranslatorProviderExecutionCache(): CommentTranslatorProviderExecutionCache {
  const cache = new Map<string, CachedCommentTranslation>();

  return {
    read(lookupKey) {
      return cache.get(lookupKey) ?? null;
    },
    write(lookupKey, translation) {
      cache.set(lookupKey, translation);
    }
  };
}

export async function executeCommentTranslatorProviderBatch(
  request: ExecuteCommentTranslatorProviderBatchRequest
): Promise<CommentTranslatorProviderExecutionResult> {
  const abuseCheck =
    request.abuseRateLimit?.precomputedCheck ??
    assertCommentTranslatorAbuseRequestAllowed({
      surface: "comment-translator-provider-execution",
      action: "provider-translation-batch",
      callerAuthorization: request.callerAuthorization,
      nowMs: request.abuseRateLimit?.nowMs ?? request.occurredAtMs,
      requestIp: request.abuseRateLimit?.requestIp,
      rateLimitStore: request.abuseRateLimit?.rateLimitStore
    });
  if (abuseCheck.status === "blocked") {
    return {
      ...createResultBase({
        skippedCount: request.comments.length,
        providerUnavailableSkippedCount: request.comments.length
      }),
      status: "blocked-abuse-rate-limit",
      batches: [],
      translations: [],
      reason: abuseCheck.reason,
      rateLimit: {
        retryAfterSeconds: abuseCheck.retryAfterSeconds,
        browserReadableOutput: abuseCheck.browserReadableOutput
      }
    };
  }

  if (!isServerOnlyTranslatorProvider(request.provider)) {
    return {
      ...createResultBase(),
      status: "blocked-non-server-translator-provider",
      batches: [],
      translations: [],
      reason: "translator-provider-must-be-server-runtime-only"
    };
  }

  const bridge = createYouTubeLiveCommentTranslatorPipelineRequestsForComments({
    comments: request.comments,
    targetLanguage: request.targetLanguage,
    sourceLanguages: request.sourceLanguages,
    glossaryTerms: request.glossaryTerms,
    glossaryVersion: request.glossaryVersion,
    providerCapabilityVersion: request.providerCapabilityVersion,
    moderationPolicyVersion: request.moderationPolicyVersion
  });

  if (bridge.status !== "ready-for-translator-pipeline") {
    return {
      ...createResultBase({
        skippedCount: request.comments.length,
        languagePolicySkippedCount: request.comments.length
      }),
      status: "completed",
      batches: [],
      translations: []
    };
  }

  const remainingMinuteCapacity = Math.max(
    0,
    request.usage.planEntitlement.translatedMessagesPerMinute - request.usage.translatedMessagesInCurrentMinute
  );
  const providerRequests = bridge.providerRequests.slice(0, remainingMinuteCapacity);
  const perMinuteSkippedCount = Math.max(0, bridge.providerRequests.length - providerRequests.length);
  const maxBatchSize = normalizePositiveInteger(request.maxBatchSize, defaultMaxBatchSize);
  const maxProviderAttemptsPerComment = normalizePositiveInteger(
    request.maxProviderAttemptsPerComment,
    defaultMaxProviderAttemptsPerComment
  );
  const cache = request.cache ?? createInMemoryCommentTranslatorProviderExecutionCache();
  const batches = chunk(providerRequests, maxBatchSize);
  const batchSummaries = batches.map((batch, batchIndex) => ({
    batchIndex,
    providerRequestCount: batch.length
  }));

  let providerCallCount = 0;
  let cacheHitCount = 0;
  let cacheMissCount = 0;
  let retryCount = 0;
  let recoverableErrorCount = 0;
  let terminalErrorCount = 0;
  const translations: CommentTranslatorProviderExecutionTranslation[] = [];

  for (const batch of batches) {
    for (const providerRequest of batch) {
      const lookupKey = providerRequest.cache.lookupKey;
      const cachedTranslation = lookupKey ? cache.read(lookupKey) : null;
      if (cachedTranslation) {
        cacheHitCount += 1;
        translations.push(createTranslationFromCache(providerRequest, cachedTranslation));
        continue;
      }

      cacheMissCount += 1;
      const execution = await translateWithRetry({
        provider: request.provider,
        fallbackProvider: request.fallbackProvider,
        fallbackOnRecoverableProviderError: request.fallbackOnRecoverableProviderError ?? false,
        providerRequest,
        maxProviderAttemptsPerComment
      });
      providerCallCount += execution.providerCallCount;
      retryCount += execution.retryCount;

      if (execution.result.type === "translated") {
        const translation = createTranslationFromProviderResult(
          providerRequest,
          execution.result,
          execution.recoverablePrimaryFallbackCount
        );
        translations.push(translation);

        if (lookupKey) {
          cache.write(lookupKey, {
            translatedText: translation.translatedText,
            detectedSourceLanguage: translation.detectedSourceLanguage,
            confidence: translation.confidence
          });
        }
        continue;
      }

      if (execution.result.type === "recoverable-error") {
        recoverableErrorCount += 1;
      } else {
        terminalErrorCount += 1;
      }
    }
  }

  recordUsageEstimates({
    callerAuthorization: request.callerAuthorization,
    sessionReferenceId: request.sessionReferenceId,
    occurredAtMs: request.occurredAtMs,
    providerCallCount,
    translatedMessages: translations,
    recoverableErrorCount,
    terminalErrorCount
  });

  return {
    ...createResultBase({
      providerRequestCount: providerRequests.length,
      providerCallCount,
      translatedCount: translations.length,
      skippedCount: bridge.skippedCommentCount + perMinuteSkippedCount + recoverableErrorCount + terminalErrorCount,
      languagePolicySkippedCount: bridge.skippedCommentCount,
      perMinuteSkippedCount,
      providerUnavailableSkippedCount: recoverableErrorCount + terminalErrorCount,
      cacheHitCount,
      cacheMissCount,
      retryCount,
      recoverableErrorCount,
      terminalErrorCount,
      providerUsageRecorded: providerCallCount > 0,
      aiUsageRecorded: translations.length > 0,
      recoverablePrimaryFallbackCount: translations.reduce(
        (total, translation) => total + translation.recoverablePrimaryFallbackCount,
        0
      ),
      estimatedCostMicros: translations.reduce((total, translation) => total + translation.estimatedCostMicros, 0),
      providerRouting: {
        plan: "unresolved",
        primaryProvider: "direct-injected-provider",
        fallbackProvider: request.fallbackProvider ? "direct-injected-provider" : "none",
        providerIdentifiers: "server-only-not-returned"
      }
    }),
    status: "completed",
    batches: batchSummaries,
    translations
  };
}

export async function executeCommentTranslatorProviderPolicyBatch(
  request: ExecuteCommentTranslatorProviderPolicyBatchRequest
): Promise<CommentTranslatorProviderExecutionResult> {
  const route = resolveCommentTranslatorTranslationProviderRoute({
    planEntitlement: request.usage.planEntitlement,
    providers: request.providers
  });

  if (route.status !== "ready") {
    return {
      ...createResultBase({
        skippedCount: request.comments.length,
        providerUnavailableSkippedCount: request.comments.length,
        providerRouting: {
          plan: route.plan,
          primaryProvider: "none",
          fallbackProvider: "none",
          providerIdentifiers: "server-only-not-returned"
        }
      }),
      status: "completed",
      batches: [],
      translations: []
    };
  }

  const result = await executeCommentTranslatorProviderBatch({
    ...request,
    provider: route.primaryProvider,
    fallbackProvider: route.fallbackProvider,
    fallbackOnRecoverableProviderError: route.fallbackBehavior === "paid-openai-recoverable-to-azure"
  });

  return {
    ...result,
    providerRouting: {
      plan: route.plan,
      primaryProvider: "server-owned-policy-primary",
      fallbackProvider: route.fallbackProvider ? "server-owned-policy-fallback" : "none",
      providerIdentifiers: "server-only-not-returned"
    }
  };
}

async function translateWithRetry({
  provider,
  fallbackProvider,
  fallbackOnRecoverableProviderError,
  providerRequest,
  maxProviderAttemptsPerComment
}: {
  provider: CommentTranslationProvider;
  fallbackProvider?: CommentTranslationProvider | null;
  fallbackOnRecoverableProviderError: boolean;
  providerRequest: CommentTranslationProviderRequest;
  maxProviderAttemptsPerComment: number;
}): Promise<{
  result: CommentTranslationProviderResult;
  providerCallCount: number;
  retryCount: number;
  recoverablePrimaryFallbackCount: number;
}> {
  let lastResult: CommentTranslationProviderResult | null = null;
  let providerCallCount = 0;
  let retryCount = 0;
  let recoverablePrimaryFallbackCount = 0;

  for (let attempt = 1; attempt <= maxProviderAttemptsPerComment; attempt += 1) {
    const result = await provider.translate(providerRequest);
    providerCallCount += 1;
    lastResult = result;

    if (result.type !== "recoverable-error") {
      return {
        result,
        providerCallCount,
        retryCount,
        recoverablePrimaryFallbackCount
      };
    }

    if (attempt < maxProviderAttemptsPerComment && isRetryableRecoverableError(result)) {
      retryCount += 1;
      continue;
    }

    if (fallbackProvider && fallbackOnRecoverableProviderError) {
      const fallbackResult = await fallbackProvider.translate(providerRequest);
      providerCallCount += 1;
      recoverablePrimaryFallbackCount += 1;
      return {
        result: fallbackResult,
        providerCallCount,
        retryCount,
        recoverablePrimaryFallbackCount
      };
    }

    return {
      result,
      providerCallCount,
      retryCount,
      recoverablePrimaryFallbackCount
    };
  }

  return {
    result: lastResult ?? {
      type: "recoverable-error",
      code: "temporary-unavailable",
      message: "Translation provider was unavailable.",
      retry: {
        retryable: true,
        retryAfterMs: null,
        fallbackToOriginal: true
      },
      usageHandoff: providerRequest.usageHandoff
    },
    providerCallCount,
    retryCount,
    recoverablePrimaryFallbackCount
  };
}

function recordUsageEstimates({
  callerAuthorization,
  sessionReferenceId,
  occurredAtMs,
  providerCallCount,
  translatedMessages,
  recoverableErrorCount,
  terminalErrorCount
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  sessionReferenceId: string;
  occurredAtMs: number;
  providerCallCount: number;
  translatedMessages: readonly CommentTranslatorProviderExecutionTranslation[];
  recoverableErrorCount: number;
  terminalErrorCount: number;
}) {
  if (providerCallCount > 0) {
    recordUsage({
      callerAuthorization,
      event: {
        type: "provider-request-estimated",
        provider: "youtube",
        sessionReferenceId,
        occurredAtMs,
        requestEstimateCount: providerCallCount,
        quotaUnitEstimate: providerCallCount,
        providerTargetMetadata: "forbidden"
      }
    });
  }

  if (translatedMessages.length > 0) {
    recordUsage({
      callerAuthorization,
      event: {
        type: "ai-usage-estimated",
        provider: "youtube",
        sessionReferenceId,
        occurredAtMs,
        translatedMessageEstimate: translatedMessages.length,
        translatedCharacterEstimate: translatedMessages.reduce((total, message) => total + Array.from(message.translatedText).length, 0),
        estimatedCostMicros: translatedMessages.reduce((total, message) => total + message.estimatedCostMicros, 0),
        rawCommentText: "never-recorded-by-design"
      }
    });
  }

  if (recoverableErrorCount > 0) {
    recordUsage({
      callerAuthorization,
      event: {
        type: "provider-translation-error-estimated",
        provider: "youtube",
        sessionReferenceId,
        occurredAtMs,
        providerErrorClass: "recoverable-error",
        errorCount: recoverableErrorCount,
        providerErrorBody: "never-recorded-by-design",
        rawCommentText: "never-recorded-by-design"
      }
    });
  }

  if (terminalErrorCount > 0) {
    recordUsage({
      callerAuthorization,
      event: {
        type: "provider-translation-error-estimated",
        provider: "youtube",
        sessionReferenceId,
        occurredAtMs,
        providerErrorClass: "terminal-error",
        errorCount: terminalErrorCount,
        providerErrorBody: "never-recorded-by-design",
        rawCommentText: "never-recorded-by-design"
      }
    });
  }
}

function recordUsage({
  callerAuthorization,
  event
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  event: CommentTranslatorUsageLedgerEvent;
}) {
  recordInMemoryCommentTranslatorUsageLedgerEvent({
    callerAuthorization,
    event
  });
}

function createTranslationFromProviderResult(
  providerRequest: CommentTranslationProviderRequest,
  result: CommentTranslationProviderResponse,
  recoverablePrimaryFallbackCount = 0
): CommentTranslatorProviderExecutionTranslation {
  return {
    commentReferenceId: providerRequest.requestId,
    translatedText: result.translatedText,
    detectedSourceLanguage: result.detectedSourceLanguage,
    confidence: result.confidence,
    cacheOutcome: result.cacheOutcome,
    providerErrorClass: "translated",
    estimatedCostMicros: Math.max(0, result.usageHandoff.estimatedCostMicros ?? 0),
    recoverablePrimaryFallbackCount
  };
}

function createTranslationFromCache(
  providerRequest: CommentTranslationProviderRequest,
  cachedTranslation: CachedCommentTranslation
): CommentTranslatorProviderExecutionTranslation {
  return {
    commentReferenceId: providerRequest.requestId,
    translatedText: cachedTranslation.translatedText,
    detectedSourceLanguage: cachedTranslation.detectedSourceLanguage,
    confidence: cachedTranslation.confidence,
    cacheOutcome: "hit",
    providerErrorClass: "translated",
    estimatedCostMicros: 0,
    recoverablePrimaryFallbackCount: 0
  };
}

function createResultBase(
  overrides: CommentTranslatorProviderExecutionResultBaseOverrides = {}
): CommentTranslatorProviderExecutionResultBase {
  const {
    languagePolicySkippedCount,
    perMinuteSkippedCount,
    providerUnavailableSkippedCount,
    recoverableErrorCount,
    terminalErrorCount,
    providerUsageRecorded,
    aiUsageRecorded,
    recoverablePrimaryFallbackCount,
    skipsByReason,
    errorCounts,
    usageRecorded,
    fallbackReasonCounts,
    ...directOverrides
  } = overrides;

  return {
    implementationStage: commentTranslatorProviderExecutionRuntimeContract.implementationStage,
    providerRequestCount: 0,
    providerCallCount: 0,
    translatedCount: 0,
    skippedCount: 0,
    cacheHitCount: 0,
    cacheMissCount: 0,
    retryCount: 0,
    estimatedCostMicros: 0,
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    providerTargetMetadata: "forbidden",
    rawCommentText: "never-returned-by-design",
    ...directOverrides,
    skipsByReason: {
      languagePolicy: skipsByReason?.languagePolicy ?? languagePolicySkippedCount ?? 0,
      perMinuteCap: skipsByReason?.perMinuteCap ?? perMinuteSkippedCount ?? 0,
      providerUnavailable: skipsByReason?.providerUnavailable ?? providerUnavailableSkippedCount ?? 0
    },
    errorCounts: {
      recoverable: errorCounts?.recoverable ?? recoverableErrorCount ?? 0,
      terminal: errorCounts?.terminal ?? terminalErrorCount ?? 0
    },
    usageRecorded: {
      providerRequestEstimate: usageRecorded?.providerRequestEstimate ?? providerUsageRecorded ?? false,
      aiUsageEstimate: usageRecorded?.aiUsageEstimate ?? aiUsageRecorded ?? false
    },
    providerRouting: directOverrides.providerRouting ?? {
      plan: "unresolved",
      primaryProvider: "direct-injected-provider",
      fallbackProvider: "none",
      providerIdentifiers: "server-only-not-returned"
    },
    fallbackReasonCounts: {
      recoverablePrimaryError:
        fallbackReasonCounts?.recoverablePrimaryError ?? recoverablePrimaryFallbackCount ?? 0
    }
  };
}

function isServerOnlyTranslatorProvider(provider: CommentTranslationProvider): boolean {
  return (
    provider.runtimeScope === "server-runtime-only" &&
    provider.secretBoundary.runtime === "server-env-only" &&
    provider.secretBoundary.clientBundle === "forbidden" &&
    provider.secretBoundary.fixtures === "forbidden" &&
    provider.secretBoundary.docsAndTaskNotes === "no-secret-values"
  );
}

function isRetryableRecoverableError(result: CommentTranslationProviderRecoverableError) {
  return result.retry.retryable;
}

function normalizePositiveInteger(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
