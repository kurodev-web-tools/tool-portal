import "server-only";

import type {
  CommentTranslationCacheOutcome,
  CommentTranslationProvider,
  CommentTranslationProviderRecoverableError,
  CommentTranslationProviderRequest,
  CommentTranslationProviderResponse,
  CommentTranslationProviderResult,
  CommentTranslationProviderTerminalError
} from "./comment-translator-provider-boundary";
import type { CommentTranslatorTranslationProviderSet } from "./comment-translator-provider-policy-runtime";
import { resolveCommentTranslatorTranslationProviderRoute } from "./comment-translator-provider-policy-runtime";
import type { CommentTranslatorUsageLedgerEvent, CommentTranslatorUsageLedgerSnapshot } from "./comment-translator-usage-ledger-runtime";
import { recordInMemoryCommentTranslatorUsageLedgerEvent } from "./comment-translator-usage-ledger-runtime";
import { evaluateCommentTranslatorLanguagePolicy } from "./comment-translator-language-policy-runtime";
import { createYouTubeLiveCommentTranslatorPipelineRequestsForComments } from "./comment-translator-youtube-live-comment-intake-pipeline";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";
import {
  assertCommentTranslatorAbuseRequestAllowed,
  type CommentTranslatorAbuseRateLimitBlockedResult,
  type CommentTranslatorAbuseRateLimitStore
} from "./comment-translator-abuse-rate-limit-runtime";
import {
  createCommentTranslatorPaidAttemptId,
  estimateCommentTranslatorPaidOpenAiCostMicros
} from "./comment-translator-paid-cost-ledger";
import type {
  CommentTranslatorPaidOpenAiAttemptOutcome,
  CommentTranslatorPaidCircuitFailureState,
  CommentTranslatorPaidCircuitSuccessState,
  CommentTranslatorPaidProviderFailureClass,
  CommentTranslatorPaidProviderReservation,
  CommentTranslatorPaidReservationRefusal,
  CommentTranslatorPaidUsageStore
} from "./comment-translator-paid-usage-store";
import { CommentTranslatorPaidReservationRefusedError } from "./comment-translator-paid-usage-store";
import {
  commentTranslatorOpenAiMaxInputItemCodePoints,
  commentTranslatorOpenAiMaxOutputItemCodePoints,
  executeCommentTranslatorOpenAiBatch,
  estimateCommentTranslatorOpenAiBatchTokens,
  type CommentTranslatorOpenAiBatchItem,
  type CommentTranslatorOpenAiExecutionResult,
  type CommentTranslatorOpenAiFetch,
  type CommentTranslatorOpenAiProviderFailureClass,
  type CommentTranslatorOpenAiProviderPreflightDecision
} from "./comment-translator-openai-execution";
import type {
  CommentTranslatorProviderCircuitAuthority,
  CommentTranslatorProviderCircuitName,
  CommentTranslatorProviderCircuitSnapshot
} from "./comment-translator-provider-circuit-breaker";

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

export type CommentTranslatorPaidProviderKillSwitches = {
  checkout_enabled: boolean;
  paid_translation_enabled: boolean;
  openai_enabled: boolean;
  azure_fallback_enabled: boolean;
};

export type CommentTranslatorPaidOpenAiBatchExecutor = (request: {
  items: readonly CommentTranslatorOpenAiBatchItem[];
  maxSubsetRetries: 0;
  maxHttpRetries: number;
  beforeProviderCall?: () => Promise<CommentTranslatorOpenAiProviderPreflightDecision>;
}) => Promise<CommentTranslatorOpenAiExecutionResult>;

export type ExecuteCommentTranslatorPaidProviderBatchRequest = {
  comments: readonly YouTubeProviderSafeCommentPayload[];
  targetLanguage: string;
  sourceLanguages?: readonly string[];
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  ownerUserId: string;
  sessionReferenceId: string;
  occurredAtMs: number;
  periodStartIso: string;
  periodEndIso: string;
  utcMonth: string;
  usageStore: CommentTranslatorPaidUsageStore | null;
  serverSecret: string | null | undefined;
  attemptKeyVersion: string;
  openAi?: {
    apiKey: string | null | undefined;
    endpoint?: string | null;
    fetchImpl?: CommentTranslatorOpenAiFetch;
    executeBatch?: CommentTranslatorPaidOpenAiBatchExecutor;
  };
  azureProvider?: CommentTranslationProvider | null;
  circuitAuthority: CommentTranslatorProviderCircuitAuthority | null;
  killSwitches?: Partial<CommentTranslatorPaidProviderKillSwitches>;
  openAiCapacityAvailable?: boolean;
  activeRequestCount?: number;
  duplicateSessionBatch?: boolean;
  maxBatchSize?: number;
  /** Task 7 enables the durable Paid 60-message/minute reservation seam. */
  enforceMessageRate?: boolean;
};

export const commentTranslatorPaidProviderExecutionContract = {
  implementationStage: "comment-translator-paid-v1-task6-paid-provider-execution",
  runtime: "server-only",
  openAiAttempt: "atomic-session-lease-eight-slots-rpm-tpm-seventy-percent-character-quota-individual-global-cost",
  openAiProviderKind: "openai_attempt",
  azureDirectFallback: "session-lease-and-paid-character-quota-only-no-openai-capacity",
  azureProviderKind: "azure_direct_fallback",
  reservationTtlMs: 120_000,
  httpTimeoutMs: 20_000,
  maxAdditionalWaitMs: 250,
  uncertainInflight: "timeout-disconnect-crash-retains-capacity-until-reclaim",
  fallback: "eligible-network-timeout-408-504-500-503-bounded-429-only",
  parseSchemaPolicy: "never-fallback-to-azure",
  backpressure: "non-consuming-provider-capacity-paused",
  maxConcurrentRequests: 8,
  duplicateSessionBatch: "fail-closed",
  crashReclaim: "durable-ttl-reclaim",
  killSwitches: ["checkout_enabled", "paid_translation_enabled", "openai_enabled", "azure_fallback_enabled"],
  checkoutKillSwitchBoundary: "task4-checkout-only-provider-runtime-independent",
  paidToFreeFallback: "forbidden",
  unreadableAuthority: "no-provider-call"
} as const;

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
  terminalErrorCodeCounts?: CommentTranslatorProviderTerminalErrorCodeCounts;
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
  /** Internal-only signal: durable Paid work already committed, so callers must not rebuild output from empty translations. */
  paidCommittedReplay?: true;
  /** Internal-only count of successful items represented only by committed replay receipts. */
  paidCommittedReplaySuccessfulCount?: number;
  paidProviderStopReason?:
    | "authority-unreadable"
    | "configuration-unreadable"
    | "backpressure"
    | "provider-capacity-paused"
    | "paid-character-quota-stop"
    | "paid-individual-cost-stop"
    | "paid-global-cost-stop"
    | "paid-message-rate-stop"
    | "duplicate-session-batch"
    | "kill-switch";
};

type CommentTranslatorPaidMessageRateSettlementHandle = {
  settled: boolean;
  settle(translatedMessageCount: number): Promise<void>;
};

const paidMessageRateSettlementByExecution = new WeakMap<
  CommentTranslatorProviderExecutionResult,
  CommentTranslatorPaidMessageRateSettlementHandle
>();

export async function settleCommentTranslatorPaidMessageRateExecution(
  execution: CommentTranslatorProviderExecutionResult,
  translatedMessageCount: number
): Promise<"settled" | "already-settled" | "no-reservation" | "failed"> {
  const settlement = paidMessageRateSettlementByExecution.get(execution);
  if (!settlement) return "no-reservation";
  if (settlement.settled) return "already-settled";
  try {
    await settlement.settle(Math.max(0, Math.floor(translatedMessageCount)));
    settlement.settled = true;
    return "settled";
  } catch {
    return "failed";
  }
}

export type CommentTranslatorProviderTerminalErrorCodeCounts = {
  invalidRequest: number;
  unsupportedLanguage: number;
  providerNotConfigured: number;
  credentialMissing: number;
  policyBlocked: number;
  providerQuotaExhausted: number;
};

export type CommentTranslatorProviderExecutionTranslation = {
  commentReferenceId: string;
  translatedText: string;
  detectedSourceLanguage: string | null;
  confidence: number | null;
  cacheOutcome: CommentTranslationCacheOutcome;
  providerErrorClass: "translated";
  providerInputCharacterEstimate: number;
  translatedCharacterEstimate: number;
  estimatedCostMicros: number;
  recoverablePrimaryFallbackCount: number;
};

type CommentTranslatorProviderExecutionResultBaseOverrides = Partial<
  Omit<CommentTranslatorProviderExecutionResultBase, "terminalErrorCodeCounts">
> & {
  languagePolicySkippedCount?: number;
  perMinuteSkippedCount?: number;
  providerUnavailableSkippedCount?: number;
  recoverableErrorCount?: number;
  terminalErrorCount?: number;
  terminalErrorCodeCounts?: Partial<CommentTranslatorProviderTerminalErrorCodeCounts>;
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
  if (request.usage.planEntitlement.plan === "paid") {
    return createGenericPaidProviderExecutionBlockedResult(request.comments.length);
  }
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

  let remainingMinuteCapacity = Math.max(
    0,
    request.usage.planEntitlement.translatedMessagesPerMinute - request.usage.translatedMessagesInCurrentMinute
  );
  const maxBatchSize = normalizePositiveInteger(request.maxBatchSize, defaultMaxBatchSize);
  const maxProviderAttemptsPerComment = normalizePositiveInteger(
    request.maxProviderAttemptsPerComment,
    defaultMaxProviderAttemptsPerComment
  );
  const cache = request.cache ?? createInMemoryCommentTranslatorProviderExecutionCache();

  let providerRequestCount = 0;
  let providerCallCount = 0;
  let cacheHitCount = 0;
  let cacheMissCount = 0;
  let perMinuteSkippedCount = 0;
  let retryCount = 0;
  let recoverableErrorCount = 0;
  let terminalErrorCount = 0;
  const terminalErrorCodeCounts = createEmptyTerminalErrorCodeCounts();
  const batchSummaries: CommentTranslatorProviderExecutionBatchSummary[] = [];
  const translations: CommentTranslatorProviderExecutionTranslation[] = [];

  for (const providerRequest of bridge.providerRequests) {
    const lookupKey = providerRequest.cache.lookupKey;
    const cachedTranslation = lookupKey ? cache.read(lookupKey) : null;
    if (cachedTranslation) {
      providerRequestCount += 1;
      recordProviderRequestBatchSummary({
        batchSummaries,
        maxBatchSize,
        providerRequestCount
      });
      cacheHitCount += 1;
      translations.push(createTranslationFromCache(providerRequest, cachedTranslation));
      continue;
    }

    if (remainingMinuteCapacity <= 0) {
      perMinuteSkippedCount += 1;
      continue;
    }

    remainingMinuteCapacity -= 1;
    providerRequestCount += 1;
    recordProviderRequestBatchSummary({
      batchSummaries,
      maxBatchSize,
      providerRequestCount
    });
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
      incrementTerminalErrorCodeCount(terminalErrorCodeCounts, execution.result.code);
    }
  }
  const providerExecutedTranslations = filterProviderExecutedTranslations(translations);

  recordUsageEstimates({
    callerAuthorization: request.callerAuthorization,
    sessionReferenceId: request.sessionReferenceId,
    occurredAtMs: request.occurredAtMs,
    providerCallCount,
    translatedMessages: providerExecutedTranslations,
    recoverableErrorCount,
    terminalErrorCount
  });

  return {
    ...createResultBase({
      providerRequestCount,
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
      terminalErrorCodeCounts,
      providerUsageRecorded: providerCallCount > 0,
      aiUsageRecorded: providerExecutedTranslations.length > 0,
      recoverablePrimaryFallbackCount: translations.reduce(
        (total, translation) => total + translation.recoverablePrimaryFallbackCount,
        0
      ),
      estimatedCostMicros: providerExecutedTranslations.reduce((total, translation) => total + translation.estimatedCostMicros, 0),
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

export async function executeCommentTranslatorPaidProviderBatch(
  request: ExecuteCommentTranslatorPaidProviderBatchRequest
): Promise<CommentTranslatorProviderExecutionResult> {
  const safeSwitches = resolveCommentTranslatorPaidProviderKillSwitches(request.killSwitches);
  const circuitAuthority = request.circuitAuthority;
  const base = createResultBase({
    providerRouting: {
      plan: "paid",
      primaryProvider: "server-owned-policy-primary",
      fallbackProvider: request.azureProvider ? "server-owned-policy-fallback" : "none",
      providerIdentifiers: "server-only-not-returned"
    }
  });
  if (
    request.callerAuthorization.status !== "authorized"
    || request.callerAuthorization.ownerUserId !== request.ownerUserId
  ) {
    return createPaidProviderUnavailableResult(request.comments.length, base, "authority-unreadable");
  }
  // Checkout is an independent Task 4 control. Turning Checkout off must not
  // interrupt already-entitled Paid translation; this runtime owns only the
  // Paid/OpenAI/Azure provider switches.
  if (!safeSwitches.paid_translation_enabled) {
    return createPaidProviderUnavailableResult(request.comments.length, base, "kill-switch");
  }
  const serverSecret = request.serverSecret;
  if (!request.usageStore || !circuitAuthority || !serverSecret?.trim()) {
    return createPaidProviderUnavailableResult(request.comments.length, base, "configuration-unreadable");
  }
  if (request.duplicateSessionBatch) {
    return createPaidProviderUnavailableResult(request.comments.length, base, "duplicate-session-batch");
  }

  const boundedComments = request.comments.filter((comment) => {
    const normalizedText = comment.text.trim();
    return normalizedText.length > 0 && countUnicodeCharacters(normalizedText) <= commentTranslatorOpenAiMaxInputItemCodePoints;
  });
  const languagePolicy = evaluateCommentTranslatorLanguagePolicy({
    comments: boundedComments,
    sourceLanguages: request.sourceLanguages,
    targetLanguage: request.targetLanguage
  });
  const acceptedLanguageByCommentId = new Map(
    languagePolicy.acceptedComments.map((comment) => [comment.commentId, comment.detectedLanguage.providerLanguageCode])
  );
  const eligibleComments = boundedComments.flatMap((comment) => {
    const detectedProviderLanguageCode = acceptedLanguageByCommentId.get(comment.commentId);
    return detectedProviderLanguageCode
      ? [{ ...comment, platformLanguageHint: detectedProviderLanguageCode }]
      : [];
  });
  const languagePolicySkippedCount = request.comments.length - eligibleComments.length;
  if (eligibleComments.length === 0) {
    return {
      ...base,
      status: "completed",
      skippedCount: languagePolicySkippedCount,
      skipsByReason: {
        languagePolicy: languagePolicySkippedCount,
        perMinuteCap: 0,
        providerUnavailable: 0
      },
      batches: [],
      translations: []
    };
  }

  let openAiCircuit: CommentTranslatorProviderCircuitSnapshot;
  try {
    openAiCircuit = await circuitAuthority.read("openai");
  } catch {
    return createPaidProviderUnavailableResult(request.comments.length, base, "authority-unreadable");
  }
  if (openAiCircuit.provider !== "openai" || !["closed", "degraded", "half_open", "disabled"].includes(openAiCircuit.state)) {
    return createPaidProviderUnavailableResult(request.comments.length, base, "authority-unreadable");
  }
  if (openAiCircuit.state === "disabled") {
    return createPaidProviderUnavailableResult(request.comments.length, base, "kill-switch");
  }
    const maxBatchSize = Math.min(15, normalizePositiveInteger(request.maxBatchSize, 15));
    const itemGroups = createPaidProviderSafeMicrobatches({
      comments: eligibleComments,
      maxBatchSize
    });
  const batches: CommentTranslatorProviderExecutionBatchSummary[] = [];
  const translations: CommentTranslatorProviderExecutionTranslation[] = [];
  let providerCallCount = 0;
  let retryCount = 0;
  let fallbackCount = 0;
  let recoverableErrors = 0;
  let terminalErrors = 0;
  let estimatedCostMicros = 0;
  let paidCommittedReplay = false;
  let paidCommittedReplaySuccessfulCount = 0;
  let messageRateReservationKey: string | null = null;
  let messageRateReservationNeedsFinalize = false;
  let messageRateSettlementTransferred = false;
  let durableSuccessfulMessageCount = 0;

  if (request.enforceMessageRate) {
    if (
      !request.usageStore?.reserveMessageRate
      || !request.usageStore.recordMessageRateSuccess
      || !request.usageStore.finalizeMessageRate
    ) {
      return createPaidProviderUnavailableResult(request.comments.length, base, "authority-unreadable");
    }
    messageRateReservationKey = createPaidMessageRateReservationKey({
      serverSecret,
      keyVersion: request.attemptKeyVersion,
      ownerUserId: request.ownerUserId,
      sessionReferenceId: request.sessionReferenceId,
      comments: eligibleComments,
      targetLanguage: request.targetLanguage,
      nowMs: request.occurredAtMs
    });
    if (eligibleComments.length > 60) {
      return createPaidProviderStoppedResult(request.comments.length, base, "paid-message-rate-stop", {
        batches: [],
        translations: [],
        providerCallCount: 0,
        retryCount: 0,
        fallbackCount: 0,
        recoverableErrors: 0,
        terminalErrors: 0,
        estimatedCostMicros: 0
      });
    }
    try {
      const messageRateReservation = await request.usageStore.reserveMessageRate({
        sessionReferenceId: request.sessionReferenceId,
        ownerUserId: request.ownerUserId,
        reservationKey: messageRateReservationKey,
        messageCount: eligibleComments.length,
        nowIso: new Date(request.occurredAtMs).toISOString()
      });
      if (messageRateReservation.reservationStatus === "rate-limited") {
        return createPaidProviderStoppedResult(request.comments.length, base, "paid-message-rate-stop", {
          batches: [],
          translations: [],
          providerCallCount: 0,
          retryCount: 0,
          fallbackCount: 0,
          recoverableErrors: 0,
          terminalErrors: 0,
          estimatedCostMicros: 0
        });
      }
      if (messageRateReservation.reservationStatus === "committed") {
        // A deterministic retry after durable settlement must not send the
        // same comment batch to a Provider a second time.
        return createPaidProviderCompletedNoopResult(
          base,
          messageRateReservation.successfulMessageCount ?? messageRateReservation.committedMessages
        );
      }
      durableSuccessfulMessageCount = messageRateReservation.successfulMessageCount ?? messageRateReservation.committedMessages;
      messageRateReservationNeedsFinalize = messageRateReservation.reservationStatus === "reserved";
    } catch {
      return createPaidProviderUnavailableResult(request.comments.length, base, "authority-unreadable");
    }
  }

  const holdMessageRateSettlement = (
    result: CommentTranslatorProviderExecutionResult
  ): CommentTranslatorProviderExecutionResult => {
      const usageStore = request.usageStore;
      if (
        !messageRateReservationNeedsFinalize
        || !messageRateReservationKey
        || !usageStore?.finalizeMessageRate
      ) {
        return result;
      }
      const reservationKey = messageRateReservationKey;
      const finalizeMessageRate = usageStore.finalizeMessageRate.bind(usageStore);
      const recordMessageRateSuccess = usageStore.recordMessageRateSuccess?.bind(usageStore);
      paidMessageRateSettlementByExecution.set(result, {
        settled: false,
        settle: async (translatedMessageCount) => {
          const successfulMessageCount = Math.max(translatedMessageCount, durableSuccessfulMessageCount);
          if (successfulMessageCount > durableSuccessfulMessageCount) {
            if (!recordMessageRateSuccess) {
              throw new Error("Paid message-rate success authority is unavailable.");
            }
            durableSuccessfulMessageCount = await recordMessageRateSuccess({
              sessionReferenceId: request.sessionReferenceId,
              ownerUserId: request.ownerUserId,
              reservationKey,
              successfulMessageCount,
              nowIso: new Date(request.occurredAtMs).toISOString()
            });
          }
          await finalizeMessageRate({
            sessionReferenceId: request.sessionReferenceId,
            ownerUserId: request.ownerUserId,
            reservationKey,
            translatedMessageCount: Math.max(successfulMessageCount, durableSuccessfulMessageCount),
            nowIso: new Date(request.occurredAtMs).toISOString()
          });
        }
      });
      messageRateSettlementTransferred = true;
      return result;
  };

  if (messageRateReservationNeedsFinalize && durableSuccessfulMessageCount > 0) {
    // A prior process durably recorded Provider success but did not finish
    // settlement. Reuse that receipt without entering any Provider-attempt or
    // allowance path, and expose only the existing private settlement handle.
    return holdMessageRateSettlement(createPaidProviderCompletedNoopResult(base, durableSuccessfulMessageCount));
  }

  try {
    for (const group of itemGroups) {
    const first = group[0];
    if (!first) continue;
    const readCompletedState = () => ({
      batches: batches.slice(),
      translations: translations.slice(),
      paidCommittedReplay,
      paidCommittedReplaySuccessfulCount,
      providerCallCount,
      retryCount,
      fallbackCount,
      recoverableErrors,
      terminalErrors,
      estimatedCostMicros
    });
    const stopPaidProvider = (
      reason: NonNullable<CommentTranslatorProviderExecutionResultBase["paidProviderStopReason"]>
    ) => holdMessageRateSettlement(
      createPaidProviderStoppedResult(request.comments.length, base, reason, readCompletedState())
    );
    const nowIso = new Date(request.occurredAtMs).toISOString();
    const attemptId = createPaidBatchAttemptId({
      serverSecret,
      keyVersion: request.attemptKeyVersion,
      ownerUserId: request.ownerUserId,
      sessionReferenceId: request.sessionReferenceId,
      comments: group,
      targetLanguage: request.targetLanguage,
      nowMs: request.occurredAtMs
    });
    let groupCircuit: CommentTranslatorProviderCircuitSnapshot;
    try {
      groupCircuit = await circuitAuthority.read("openai");
    } catch {
      return stopPaidProvider("authority-unreadable");
    }
    if (
      groupCircuit.provider !== "openai"
      || !["closed", "degraded", "half_open", "disabled"].includes(groupCircuit.state)
    ) {
      return stopPaidProvider("authority-unreadable");
    }
    if (groupCircuit.state === "degraded" && groupCircuit.degradedUntilMs === null) {
      return stopPaidProvider("authority-unreadable");
    }
    if (groupCircuit.state === "disabled") {
      return stopPaidProvider("kill-switch");
    }
    if (
      groupCircuit.state === "degraded"
      && groupCircuit.degradedUntilMs !== null
      && groupCircuit.degradedUntilMs <= request.occurredAtMs
    ) {
      try {
        groupCircuit = await circuitAuthority.probe({
          provider: "openai",
          nowMs: request.occurredAtMs,
          probeAttemptId: attemptId
        });
      } catch {
        return stopPaidProvider("authority-unreadable");
      }
      if (groupCircuit.state === "disabled") {
        return stopPaidProvider("kill-switch");
      }
      if (groupCircuit.state !== "half_open" || groupCircuit.probeAttemptId !== attemptId) {
        return stopPaidProvider("provider-capacity-paused");
      }
    }
    let useAzureDirect = groupCircuit.state === "degraded";
    if (!useAzureDirect) {
      if (!safeSwitches.openai_enabled) {
        return stopPaidProvider("kill-switch");
      }
      if (!request.openAi?.executeBatch && !request.openAi?.apiKey?.trim()) {
        return stopPaidProvider("configuration-unreadable");
      }
      if (
        request.openAiCapacityAvailable === false
        || (request.activeRequestCount !== undefined
          && request.activeRequestCount >= commentTranslatorPaidProviderExecutionContract.maxConcurrentRequests)
      ) {
        return stopPaidProvider("provider-capacity-paused");
      }
      if (groupCircuit.state === "half_open") {
        let probeCircuit: CommentTranslatorProviderCircuitSnapshot;
        try {
          probeCircuit = await circuitAuthority.probe({
            provider: "openai",
            nowMs: request.occurredAtMs,
            probeAttemptId: attemptId
          });
        } catch {
          return stopPaidProvider("authority-unreadable");
        }
        if (probeCircuit.state === "disabled") {
          return stopPaidProvider("kill-switch");
        }
        if (probeCircuit.state === "degraded") {
          useAzureDirect = true;
        } else if (probeCircuit.state !== "half_open" || probeCircuit.probeAttemptId !== attemptId) {
          return stopPaidProvider("provider-capacity-paused");
        }
      }
    }
    if (useAzureDirect && (!safeSwitches.azure_fallback_enabled || !request.azureProvider)) {
      return stopPaidProvider(
        safeSwitches.azure_fallback_enabled ? "configuration-unreadable" : "kill-switch"
      );
    }
    const groupTranslationStart = translations.length;
    const groupBatchStart = batches.length;
    const appendCurrentGroupBatchIfNeeded = (providerRequestCount: number) => {
      if (batches.length === groupBatchStart) {
        batches.push({ batchIndex: batches.length, providerRequestCount });
      }
    };
    const inputCharacters = group.reduce((total, item) => total + countUnicodeCharacters(item.text), 0);
    if (useAzureDirect) {
      const azureCircuit = await preparePaidAzureCircuit({
        authority: circuitAuthority,
        nowMs: request.occurredAtMs,
        attemptId
      });
      if (azureCircuit.status === "blocked") {
        return stopPaidProvider(azureCircuit.reason);
      }
      const direct = await executePaidAzureDirectFallback({
        request,
        comments: group,
        attemptId,
        providerAttempt: createOpaqueProviderAttempt(attemptId, "azure_direct", 0, group.length),
        logicalInputCharacters: inputCharacters,
        halfOpenProbe: azureCircuit.halfOpen,
        nowIso
      });
      if (direct.authorityUnreadable) {
        return stopPaidProvider("authority-unreadable");
      }
      if (direct.reservationUnavailable) {
        return stopPaidProvider(mapPaidReservationRefusalToStopReason(direct.reservationRefusal));
      }
      providerCallCount += direct.providerCallCount;
      fallbackCount += direct.fallbackCount;
      recoverableErrors += direct.uncertain ? 1 : 0;
      terminalErrors += direct.terminal ? 1 : 0;
      if (direct.providerCallCount > 0) appendCurrentGroupBatchIfNeeded(group.length);
      translations.push(...direct.translations);
      continue;
    }

    const itemBindings = group.map((comment) => ({
      comment,
      item: {
        attemptId: createPaidItemAttemptId({
          serverSecret,
          keyVersion: request.attemptKeyVersion,
          ownerUserId: request.ownerUserId,
          sessionReferenceId: request.sessionReferenceId,
          providerMessageId: comment.commentId,
          targetLanguage: request.targetLanguage,
          nowMs: request.occurredAtMs
        }),
        text: comment.text,
        sourceLanguage: comment.platformLanguageHint ?? "auto",
        targetLanguage: request.targetLanguage
      } satisfies CommentTranslatorOpenAiBatchItem
    }));
    let nextOpenAiProviderAttemptIndex = 1;
    const executeFreshOpenAiAttempt = (
      retryItems: readonly { comment: YouTubeProviderSafeCommentPayload; item: CommentTranslatorOpenAiBatchItem }[],
      allowHalfOpenProbe: boolean
    ) => executePaidOpenAiReservedAttempt({
      request,
      attemptId,
      providerAttempt: createOpaqueProviderAttempt(
        attemptId,
        "openai",
        nextOpenAiProviderAttemptIndex++,
        retryItems.length
      ),
      items: retryItems.map((binding) => binding.item),
      logicalInputCharacters: inputCharacters,
      nowIso,
      allowHalfOpenProbe,
      deferRateLimitCircuitFailure: false
    });
    const firstAttempt = await executePaidOpenAiReservedAttempt({
      request,
      attemptId,
      providerAttempt: createOpaqueProviderAttempt(attemptId, "openai", 0, group.length),
      items: itemBindings.map((binding) => binding.item),
      logicalInputCharacters: inputCharacters,
      nowIso,
      allowHalfOpenProbe: groupCircuit.state === "half_open",
      deferRateLimitCircuitFailure: groupCircuit.state !== "half_open"
    });
    if (firstAttempt.status === "not-reserved") {
      return stopPaidProvider(mapPaidReservationRefusalToStopReason(firstAttempt.refusal));
    }
    if (firstAttempt.status !== "executed") {
      return stopPaidProvider(firstAttempt.status);
    }
    if (firstAttempt.committedReplay === true) {
      paidCommittedReplay = true;
      paidCommittedReplaySuccessfulCount += firstAttempt.result.successfulAttemptIds?.length ?? 0;
    }
    if (
      firstAttempt.result.status === "failed"
      && firstAttempt.result.preflightDecision === "circuit-unavailable"
    ) {
      // A competing half-open probe is backpressure, not a provider failure.
      // The reserved attempt never reached OpenAI, so release this logical
      // reservation before returning a non-consuming pause.
      if (!request.usageStore || !(await abandonPaidLogicalAttemptSafely(
        request.usageStore,
        attemptId,
        firstAttempt.providerAttempt,
        nowIso
      ))) {
        return stopPaidProvider("authority-unreadable");
      }
      return stopPaidProvider("provider-capacity-paused");
    }
    let result = firstAttempt.result;
    let latestOpenAiProviderAttempt = firstAttempt.providerAttempt;
    let circuitFailureRecorded = firstAttempt.circuitFailureRecorded;
    const successfulOpenAiAttemptIds = new Set<string>();
    providerCallCount += result.providerCallCount;
    estimatedCostMicros += result.estimatedCostMicros;
    if (result.providerCallCount > 0) {
      appendCurrentGroupBatchIfNeeded(group.length);
    }
    appendPaidOpenAiTranslations(translations, result, itemBindings, successfulOpenAiAttemptIds);
    mergeSuccessfulOpenAiAttemptIds(result, successfulOpenAiAttemptIds);
    if (firstAttempt.markerReconciliationFailed) {
      return stopPaidProvider("authority-unreadable");
    }
    let fallbackBindings = selectOpenAiFallbackBindings(result, itemBindings, successfulOpenAiAttemptIds);
    let openAiRetryUsed = false;

    // A bounded ordinary-429 retry obtains a fresh slot/RPM/TPM/cost
    // reservation. Half-open is deliberately not reused for the second POST;
    // the durable probe is one provider call owned by this logical attempt.
    if (!openAiRetryUsed && isBoundedOpenAiRateLimitFailure(result)) {
      openAiRetryUsed = true;
      const rateRetryBindings = fallbackBindings.length > 0 ? fallbackBindings : itemBindings;
      const initialCircuitFailureRecorded = circuitFailureRecorded;
      const rateRetryAttempt = await executeFreshOpenAiAttempt(rateRetryBindings, false);
      if (rateRetryAttempt.status === "authority-unreadable" || rateRetryAttempt.status === "kill-switch") {
        return stopPaidProvider(rateRetryAttempt.status);
      }
      if (rateRetryAttempt.status === "not-reserved") {
        // A fresh retry was not admitted, so the initial 429 is the terminal
        // provider failure for this logical attempt. Record it exactly once;
        // when the fresh retry is admitted, only its final result is counted.
        if (!circuitFailureRecorded) {
          const circuitAfterRateLimit = await recordAttemptCircuitFailureSafely({
            authority: circuitAuthority,
            provider: "openai",
            attemptId,
            providerAttempt: firstAttempt.providerAttempt,
            failureClass: result.providerFailureClass,
            nowMs: request.occurredAtMs,
            allowDeferredPromotion: true
          });
          if (!circuitAfterRateLimit) {
            return stopPaidProvider("authority-unreadable");
          }
          circuitFailureRecorded = true;
        }
        const stopReason = await settleLogicalAttemptAfterReservationRefusal({
          request,
          attemptId,
          releasedProviderAttempt: latestOpenAiProviderAttempt,
          nowIso,
          refusal: rateRetryAttempt.refusal
        });
        return stopPaidProvider(stopReason);
      }
      if (rateRetryAttempt.status !== "executed") {
        return stopPaidProvider(rateRetryAttempt.status);
      }
      retryCount += 1;
      result = rateRetryAttempt.result;
      latestOpenAiProviderAttempt = rateRetryAttempt.providerAttempt;
      circuitFailureRecorded = rateRetryAttempt.circuitFailureRecorded || initialCircuitFailureRecorded;
      providerCallCount += result.providerCallCount;
      estimatedCostMicros += result.estimatedCostMicros;
      if (result.providerCallCount > 0) appendCurrentGroupBatchIfNeeded(rateRetryBindings.length);
      appendPaidOpenAiTranslations(translations, result, rateRetryBindings, successfulOpenAiAttemptIds);
      mergeSuccessfulOpenAiAttemptIds(result, successfulOpenAiAttemptIds);
      fallbackBindings = selectOpenAiFallbackBindings(result, itemBindings, successfulOpenAiAttemptIds);
    }

    if (!openAiRetryUsed && result.status === "failed" && result.providerFailureClass === "invalid-response" && result.retryAttemptIds.length > 0) {
      openAiRetryUsed = true;
      const retryAttemptIds = new Set(result.retryAttemptIds);
      const retryItems = itemBindings.filter((binding) => retryAttemptIds.has(binding.item.attemptId));
      if (retryItems.length > 0) {
        const retryAttempt = await executeFreshOpenAiAttempt(retryItems, false);
        if (retryAttempt.status === "authority-unreadable" || retryAttempt.status === "kill-switch") {
          return stopPaidProvider(retryAttempt.status);
        }
        if (retryAttempt.status === "not-reserved") {
          const stopReason = await settleLogicalAttemptAfterReservationRefusal({
            request,
            attemptId,
            releasedProviderAttempt: latestOpenAiProviderAttempt,
            nowIso,
            refusal: retryAttempt.refusal
          });
          return stopPaidProvider(stopReason);
        }
        if (retryAttempt.status === "executed") {
          retryCount += 1;
          result = retryAttempt.result;
          latestOpenAiProviderAttempt = retryAttempt.providerAttempt;
          circuitFailureRecorded = retryAttempt.circuitFailureRecorded || circuitFailureRecorded;
          providerCallCount += result.providerCallCount;
          estimatedCostMicros += result.estimatedCostMicros;
          if (result.providerCallCount > 0) appendCurrentGroupBatchIfNeeded(retryItems.length);
          appendPaidOpenAiTranslations(translations, result, retryItems, successfulOpenAiAttemptIds);
          mergeSuccessfulOpenAiAttemptIds(result, successfulOpenAiAttemptIds);
          fallbackBindings = selectOpenAiFallbackBindings(result, itemBindings, successfulOpenAiAttemptIds);
        }
      }
    }

    if (result.status === "completed") {
      continue;
    }
    if (result.status === "failed" && result.preflightDecision === "circuit-unavailable") {
      // A fresh subset retry can lose the half-open probe to a competing
      // attempt. That is provider backpressure, never an Azure fallback.
      translations.splice(groupTranslationStart);
      if (!request.usageStore || !(await abandonPaidLogicalAttemptSafely(
        request.usageStore,
        attemptId,
        latestOpenAiProviderAttempt,
        nowIso
      ))) {
        return stopPaidProvider("authority-unreadable");
      }
      return stopPaidProvider("provider-capacity-paused");
    }
    if (result.fallbackEligible && fallbackBindings.length > 0 && safeSwitches.azure_fallback_enabled && request.azureProvider) {
      const azureCircuit = await preparePaidAzureCircuit({
        authority: circuitAuthority,
        nowMs: request.occurredAtMs,
        attemptId
      });
      if (azureCircuit.status === "blocked") {
        if (!result.uncertainInflight && request.usageStore && !(await abandonPaidLogicalAttemptSafely(
          request.usageStore,
          attemptId,
          latestOpenAiProviderAttempt,
          nowIso
        ))) {
          return stopPaidProvider("authority-unreadable");
        }
        return stopPaidProvider(azureCircuit.reason);
      }
      const fallback = await executePaidAzureDirectFallback({
        request,
        comments: fallbackBindings.map((binding) => binding.comment),
        attemptId,
        providerAttempt: createOpaqueProviderAttempt(attemptId, "azure_fallback", 0, fallbackBindings.length),
        logicalInputCharacters: inputCharacters,
        alreadySuccessfulInputCharacters: countPaidSuccessfulInputCharacters(
          result,
          itemBindings,
          successfulOpenAiAttemptIds
        ),
        halfOpenProbe: azureCircuit.halfOpen,
        nowIso
      });
      if (fallback.authorityUnreadable) {
        return stopPaidProvider("authority-unreadable");
      }
      if (fallback.reservationUnavailable) {
        const refusal = fallback.reservationRefusal;
        if (refusal === null) return stopPaidProvider("authority-unreadable");
        const stopReason = result.uncertainInflight
          ? mapPaidReservationRefusalToStopReason(refusal)
          : await settleLogicalAttemptAfterReservationRefusal({
              request,
              attemptId,
              releasedProviderAttempt: latestOpenAiProviderAttempt,
              nowIso,
              refusal
            });
        return stopPaidProvider(stopReason);
      }
      providerCallCount += fallback.providerCallCount;
      fallbackCount += fallback.fallbackCount;
      if (fallback.providerCallCount > 0) {
        appendCurrentGroupBatchIfNeeded(fallbackBindings.length);
      }
      if (fallback.uncertain || fallback.committedInputCharacters === 0) {
        // The logical batch is committed/released as one Task 5 unit. Keep
        // OpenAI successes only when Azure finalization committed them with
        // the known successful Azure subset.
        translations.splice(groupTranslationStart);
      }
      translations.push(...fallback.translations);
      recoverableErrors += fallback.uncertain ? 1 : 0;
      terminalErrors += fallback.terminal ? 1 : 0;
    } else if (result.providerFailureClass === "invalid-response") {
      const successfulInputCharacters = countPaidSuccessfulInputCharacters(
        result,
        itemBindings,
        successfulOpenAiAttemptIds
      );
      if (successfulInputCharacters > 0) {
        if (!request.usageStore || !(await commitTerminalOpenAiPartialSafely(
          request.usageStore,
          attemptId,
          latestOpenAiProviderAttempt,
          successfulInputCharacters,
          nowIso
        ))) {
          return stopPaidProvider("authority-unreadable");
        }
      } else {
        translations.splice(groupTranslationStart);
        if (!request.usageStore || !(await abandonPaidLogicalAttemptSafely(
          request.usageStore,
          attemptId,
          latestOpenAiProviderAttempt,
          nowIso
        ))) {
          return stopPaidProvider("authority-unreadable");
        }
      }
      terminalErrors += 1;
    } else if (result.providerFailureClass === "policy") {
      translations.splice(groupTranslationStart);
      if (!request.usageStore || !(await abandonPaidLogicalAttemptSafely(
        request.usageStore,
        attemptId,
        latestOpenAiProviderAttempt,
        nowIso
      ))) {
        return stopPaidProvider("authority-unreadable");
      }
      terminalErrors += 1;
    } else if (result.providerFailureClass) {
      translations.splice(groupTranslationStart);
      if (!result.uncertainInflight && request.usageStore && !(await abandonPaidLogicalAttemptSafely(
        request.usageStore,
        attemptId,
        latestOpenAiProviderAttempt,
        nowIso
      ))) {
        return stopPaidProvider("authority-unreadable");
      }
      recoverableErrors += 1;
    }
  }

    return holdMessageRateSettlement({
      ...base,
      status: "completed",
      ...(paidCommittedReplay ? { paidCommittedReplay: true as const } : {}),
      ...(paidCommittedReplaySuccessfulCount > 0 ? { paidCommittedReplaySuccessfulCount } : {}),
      providerRequestCount: eligibleComments.length,
      providerCallCount,
      translatedCount: translations.length,
      skippedCount: Math.max(0, request.comments.length - translations.length),
      skipsByReason: {
        languagePolicy: languagePolicySkippedCount,
        perMinuteCap: 0,
        providerUnavailable: Math.max(0, eligibleComments.length - translations.length)
      },
      retryCount,
      errorCounts: { recoverable: recoverableErrors, terminal: terminalErrors },
      fallbackReasonCounts: { recoverablePrimaryError: fallbackCount },
      estimatedCostMicros,
      usageRecorded: { providerRequestEstimate: providerCallCount > 0, aiUsageEstimate: translations.length > 0 },
      batches,
      translations
    });
  } finally {
    if (
      messageRateReservationNeedsFinalize
      && !messageRateSettlementTransferred
      && messageRateReservationKey
      && request.usageStore?.finalizeMessageRate
    ) {
      const successfulMessageCount = Math.max(
        durableSuccessfulMessageCount,
        Math.min(
          eligibleComments.length,
          translations.length + paidCommittedReplaySuccessfulCount
        )
      );
      if (successfulMessageCount > durableSuccessfulMessageCount) {
        if (!request.usageStore.recordMessageRateSuccess) {
          throw new Error("Paid message-rate success authority is unavailable.");
        }
        durableSuccessfulMessageCount = await request.usageStore.recordMessageRateSuccess({
          sessionReferenceId: request.sessionReferenceId,
          ownerUserId: request.ownerUserId,
          reservationKey: messageRateReservationKey,
          successfulMessageCount,
          nowIso: new Date(request.occurredAtMs).toISOString()
        });
      }
      await request.usageStore.finalizeMessageRate({
        sessionReferenceId: request.sessionReferenceId,
        ownerUserId: request.ownerUserId,
        reservationKey: messageRateReservationKey,
        translatedMessageCount: Math.max(successfulMessageCount, durableSuccessfulMessageCount),
        nowIso: new Date(request.occurredAtMs).toISOString()
      });
    }
  }
}

export async function executeCommentTranslatorProviderPolicyBatch(
  request: ExecuteCommentTranslatorProviderPolicyBatchRequest
): Promise<CommentTranslatorProviderExecutionResult> {
  if (request.usage.planEntitlement.plan === "paid") {
    return createGenericPaidProviderExecutionBlockedResult(request.comments.length);
  }
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

function createGenericPaidProviderExecutionBlockedResult(
  commentCount: number
): CommentTranslatorProviderExecutionResult {
  return {
    ...createResultBase({
      skippedCount: commentCount,
      providerUnavailableSkippedCount: commentCount,
      providerRouting: {
        plan: "paid",
        primaryProvider: "none",
        fallbackProvider: "none",
        providerIdentifiers: "server-only-not-returned"
      },
      paidProviderStopReason: "authority-unreadable"
    }),
    status: "completed",
    batches: [],
    translations: []
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

function resolveCommentTranslatorPaidProviderKillSwitches(
  value: Partial<CommentTranslatorPaidProviderKillSwitches> | undefined
): CommentTranslatorPaidProviderKillSwitches {
  return {
    checkout_enabled: value?.checkout_enabled === true,
    paid_translation_enabled: value?.paid_translation_enabled === true,
    openai_enabled: value?.openai_enabled === true,
    azure_fallback_enabled: value?.azure_fallback_enabled === true
  };
}

function createPaidProviderUnavailableResult(
  skippedCount: number,
  base: CommentTranslatorProviderExecutionResultBase,
  reason = "authority-unreadable"
): CommentTranslatorProviderExecutionResult {
  return {
    ...base,
    status: "completed",
    skippedCount,
    skipsByReason: {
      languagePolicy: 0,
      perMinuteCap: skippedCount,
      providerUnavailable: 0
    },
    errorCounts: {
      recoverable: 0,
      terminal: 0
    },
    fallbackReasonCounts: {
      recoverablePrimaryError: 0
    },
    rawCommentText: "never-returned-by-design",
    paidProviderStopReason: isPaidProviderStopReason(reason) ? reason : "authority-unreadable",
    batches: [],
    translations: []
  };
}

function createPaidProviderCompletedNoopResult(
  base: CommentTranslatorProviderExecutionResultBase,
  successfulMessageCount?: number
): CommentTranslatorProviderExecutionResult {
  const sanitizedSuccessfulMessageCount = successfulMessageCount === undefined
    ? undefined
    : Number.isFinite(successfulMessageCount)
      ? Math.max(0, Math.trunc(successfulMessageCount))
      : 0;
  return {
    ...base,
    status: "completed",
    paidCommittedReplay: true,
    ...(sanitizedSuccessfulMessageCount === undefined
      ? {}
      : { paidCommittedReplaySuccessfulCount: sanitizedSuccessfulMessageCount }),
    batches: [],
    translations: []
  };
}

function createPaidProviderStoppedResult(
  requestCount: number,
  base: CommentTranslatorProviderExecutionResultBase,
  reason: NonNullable<CommentTranslatorProviderExecutionResultBase["paidProviderStopReason"]>,
  completedState: {
    batches: readonly CommentTranslatorProviderExecutionBatchSummary[];
    translations: readonly CommentTranslatorProviderExecutionTranslation[];
    paidCommittedReplay?: boolean;
    paidCommittedReplaySuccessfulCount?: number;
    providerCallCount: number;
    retryCount: number;
    fallbackCount: number;
    recoverableErrors: number;
    terminalErrors: number;
    estimatedCostMicros: number;
  }
): CommentTranslatorProviderExecutionResult {
  const translatedCount = completedState.translations.length;
  const skippedCount = Math.max(0, requestCount - translatedCount);
  return {
    ...base,
    status: "completed",
    ...(completedState.paidCommittedReplay ? { paidCommittedReplay: true as const } : {}),
    ...(completedState.paidCommittedReplaySuccessfulCount
      ? { paidCommittedReplaySuccessfulCount: completedState.paidCommittedReplaySuccessfulCount }
      : {}),
    providerRequestCount: completedState.batches.reduce(
      (total, batch) => total + batch.providerRequestCount,
      0
    ),
    providerCallCount: completedState.providerCallCount,
    translatedCount,
    skippedCount,
    retryCount: completedState.retryCount,
    skipsByReason: {
      languagePolicy: 0,
      perMinuteCap: skippedCount,
      providerUnavailable: 0
    },
    errorCounts: {
      recoverable: completedState.recoverableErrors,
      terminal: completedState.terminalErrors
    },
    fallbackReasonCounts: {
      recoverablePrimaryError: completedState.fallbackCount
    },
    estimatedCostMicros: completedState.estimatedCostMicros,
    usageRecorded: {
      providerRequestEstimate: completedState.providerCallCount > 0,
      aiUsageEstimate: translatedCount > 0
    },
    rawCommentText: "never-returned-by-design",
    paidProviderStopReason: reason,
    batches: completedState.batches,
    translations: completedState.translations
  };
}

function isPaidProviderStopReason(
  value: string
): value is NonNullable<CommentTranslatorProviderExecutionResultBase["paidProviderStopReason"]> {
  return [
    "authority-unreadable",
    "configuration-unreadable",
    "backpressure",
    "provider-capacity-paused",
    "paid-character-quota-stop",
    "paid-individual-cost-stop",
    "paid-global-cost-stop",
    "paid-message-rate-stop",
    "duplicate-session-batch",
    "kill-switch"
  ].includes(value as NonNullable<CommentTranslatorProviderExecutionResultBase["paidProviderStopReason"]>);
}

function mapPaidReservationRefusalToStopReason(
  refusal: CommentTranslatorPaidReservationRefusal | "status" | null
): NonNullable<CommentTranslatorProviderExecutionResultBase["paidProviderStopReason"]> {
  switch (refusal) {
    case "capacity":
      return "provider-capacity-paused";
    case "quota":
      return "paid-character-quota-stop";
    case "individual-cost":
      return "paid-individual-cost-stop";
    case "global-cost":
      return "paid-global-cost-stop";
    case "cost":
    case "status":
    case null:
      return "authority-unreadable";
  }
}

async function settleLogicalAttemptAfterReservationRefusal({
  request,
  attemptId,
  releasedProviderAttempt,
  nowIso,
  refusal
}: {
  request: ExecuteCommentTranslatorPaidProviderBatchRequest;
  attemptId: string;
  releasedProviderAttempt: string;
  nowIso: string;
  refusal: CommentTranslatorPaidReservationRefusal | "status";
}): Promise<NonNullable<CommentTranslatorProviderExecutionResultBase["paidProviderStopReason"]>> {
  if (refusal === "capacity") return "provider-capacity-paused";
  if (refusal === "status" || !request.usageStore) return "authority-unreadable";
  if (!(await abandonPaidLogicalAttemptSafely(
    request.usageStore,
    attemptId,
    releasedProviderAttempt,
    nowIso
  ))) {
    return "authority-unreadable";
  }
  // Terminal quota/cost refusals release the logical reservation. Capacity
  // refusal is handled above as a resumable, non-consuming pause under the
  // same stable logical attempt identity.
  return mapPaidReservationRefusalToStopReason(refusal);
}

function compareStableText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function createPaidAttemptId({
  serverSecret,
  keyVersion,
  ownerUserId,
  sessionReferenceId,
  providerMessageId,
  targetLanguage,
  nowMs
}: {
  serverSecret: string;
  keyVersion: string;
  ownerUserId: string;
  sessionReferenceId: string;
  providerMessageId: string;
  targetLanguage: string;
  nowMs: number;
}): string {
  return createCommentTranslatorPaidAttemptId({
    serverSecret,
    keyVersion,
    ownerUserId,
    sessionReferenceId,
    providerMessageId,
    targetLanguage,
    nowMs
  }).attemptId;
}

function createPaidBatchAttemptId({
  serverSecret,
  keyVersion,
  ownerUserId,
  sessionReferenceId,
  comments,
  targetLanguage,
  nowMs
}: {
  serverSecret: string;
  keyVersion: string;
  ownerUserId: string;
  sessionReferenceId: string;
  comments: readonly YouTubeProviderSafeCommentPayload[];
  targetLanguage: string;
  nowMs: number;
}): string {
  const canonicalBatchMessageId = comments
    .map((comment) => comment.commentId.trim())
    .sort()
    .join("\u001f");
  return createPaidAttemptId({
    serverSecret,
    keyVersion,
    ownerUserId,
    sessionReferenceId,
    // The bounded batch identity is stable across Worker retries and poll
    // re-entry. The durable receipt/TTL controls whether a later poll may
    // proceed; time is used only for the expiry calculation below.
    providerMessageId: `batch:${canonicalBatchMessageId}`,
    targetLanguage,
    nowMs
  });
}

function createPaidMessageRateReservationKey({
  serverSecret,
  keyVersion,
  ownerUserId,
  sessionReferenceId,
  comments,
  targetLanguage,
  nowMs
}: {
  serverSecret: string;
  keyVersion: string;
  ownerUserId: string;
  sessionReferenceId: string;
  comments: readonly YouTubeProviderSafeCommentPayload[];
  targetLanguage: string;
  nowMs: number;
}): string {
  const canonicalCommentIds = comments
    .map((comment) => comment.commentId.trim())
    .sort()
    .join("\u001f");
  return createCommentTranslatorPaidAttemptId({
    serverSecret,
    keyVersion,
    ownerUserId,
    sessionReferenceId,
    // The reservation key identifies the logical bounded batch. The database
    // assigns it to the authoritative minute, so a Worker clock boundary
    // cannot create a second reservation for the same retry.
    providerMessageId: `message-rate:${canonicalCommentIds}`,
    targetLanguage,
    nowMs
  }).attemptId;
}

function createPaidItemAttemptId({
  serverSecret,
  keyVersion,
  ownerUserId,
  sessionReferenceId,
  providerMessageId,
  targetLanguage,
  nowMs
}: {
  serverSecret: string;
  keyVersion: string;
  ownerUserId: string;
  sessionReferenceId: string;
  providerMessageId: string;
  targetLanguage: string;
  nowMs: number;
}): string {
  return createPaidAttemptId({
    serverSecret,
    keyVersion,
    ownerUserId,
    sessionReferenceId,
    providerMessageId,
    targetLanguage,
    nowMs
  });
}

function createOpaqueProviderAttempt(
  attemptId: string,
  provider: "openai" | "azure_direct" | "azure_fallback",
  attemptIndex: number,
  itemCount: number
): string {
  return `${attemptId.slice(0, 80)}_${provider}_${attemptIndex}_${itemCount}`.slice(0, 200);
}

function createPaidProviderSafeMicrobatches({
  comments,
  maxBatchSize
}: {
  comments: readonly YouTubeProviderSafeCommentPayload[];
  maxBatchSize: number;
}): YouTubeProviderSafeCommentPayload[][] {
  const groups: YouTubeProviderSafeCommentPayload[][] = [];
  let current: YouTubeProviderSafeCommentPayload[] = [];
  let currentCodePoints = 0;
  let currentSourceLanguage = "";
  const orderedComments = [...comments].sort((left, right) => {
    const leftLanguage = left.platformLanguageHint?.trim().toLocaleLowerCase() || "auto";
    const rightLanguage = right.platformLanguageHint?.trim().toLocaleLowerCase() || "auto";
    return compareStableText(leftLanguage, rightLanguage)
      || compareStableText(left.commentId.trim(), right.commentId.trim())
      || compareStableText(left.text, right.text);
  });
  for (const comment of orderedComments) {
    const sourceLanguage = comment.platformLanguageHint?.trim().toLocaleLowerCase() || "auto";
    const codePoints = countUnicodeCharacters(comment.text);
    const samePair = current.length === 0 || currentSourceLanguage === sourceLanguage;
    const fits =
      samePair
      && current.length < maxBatchSize
      && currentCodePoints + codePoints <= 7_500;
    if (!fits && current.length > 0) {
      groups.push(current);
      current = [];
      currentCodePoints = 0;
      currentSourceLanguage = "";
    }
    if (current.length === 0) currentSourceLanguage = sourceLanguage;
    current.push(comment);
    currentCodePoints += codePoints;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

type PaidOpenAiAttemptExecution =
  | {
      status: "executed";
      result: CommentTranslatorOpenAiExecutionResult;
      providerAttempt: string;
      circuitFailureRecorded: boolean;
      committedReplay?: true;
      markerReconciliationFailed?: boolean;
    }
  | { status: "not-reserved"; refusal: CommentTranslatorPaidReservationRefusal | "status"; providerAttempt: string }
  | { status: "authority-unreadable" | "kill-switch" };

async function executePaidOpenAiReservedAttempt({
  request,
  attemptId,
  providerAttempt,
  items,
  logicalInputCharacters,
  nowIso,
  allowHalfOpenProbe = false,
  deferRateLimitCircuitFailure = false
}: {
  request: ExecuteCommentTranslatorPaidProviderBatchRequest;
  attemptId: string;
  providerAttempt: string;
  items: readonly CommentTranslatorOpenAiBatchItem[];
  logicalInputCharacters: number;
  nowIso: string;
  allowHalfOpenProbe?: boolean;
  deferRateLimitCircuitFailure?: boolean;
}): Promise<PaidOpenAiAttemptExecution> {
  const store = request.usageStore;
  if (!store) return { status: "authority-unreadable" };
  const attemptInputCharacters = items.reduce((total, item) => total + countUnicodeCharacters(item.text), 0);
  const estimatedCostMicros = estimateCommentTranslatorPaidOpenAiCostMicros({
    inputCharacters: attemptInputCharacters,
    commentCount: items.length
  });
  const tokenEstimate = estimateCommentTranslatorOpenAiBatchTokens({
    inputCodePoints: attemptInputCharacters,
    itemCount: items.length
  });
  // Paid retries are separate provider attempts. Each attempt reserves exactly
  // one request/slot before its single HTTP call; ordinary 429 retry is handled
  // by the caller so a second POST cannot share this reservation.
  const maxHttpRetries = 0;
  const reservationRequestCount = 1;
  const reservationCostMicros = estimatedCostMicros;
  const reservationTokenCount = tokenEstimate.inputTokens + tokenEstimate.outputTokens;
  let reservation: CommentTranslatorPaidProviderReservation;
  try {
    reservation = await store.openaiAttempt({
      attemptId,
      providerAttempt,
      ownerUserId: request.ownerUserId,
      sessionReferenceId: request.sessionReferenceId,
      periodStartIso: request.periodStartIso,
      periodEndIso: request.periodEndIso,
      utcMonth: request.utcMonth,
      inputCharacters: logicalInputCharacters,
      estimatedCostMicros: reservationCostMicros,
      requestCount: reservationRequestCount,
      tokenCount: reservationTokenCount,
      nowIso
    });
  } catch (error) {
    if (error instanceof CommentTranslatorPaidReservationRefusedError) {
      return { status: "not-reserved", refusal: error.refusal, providerAttempt };
    }
    return { status: "authority-unreadable" };
  }
  if (
    ["uncertain", "committed", "released", "expired"].includes(reservation.reservationStatus)
    && reservation.sessionLeaseToken === null
    && reservation.openAiSlotToken === null
  ) {
    let receipt: Awaited<ReturnType<CommentTranslatorPaidUsageStore["readOpenAiAttempt"]>>;
    try {
      receipt = await store.readOpenAiAttempt({ attemptId, providerAttempt });
    } catch {
      return { status: "authority-unreadable" };
    }
    if (!receipt || receipt.attemptState !== reservation.reservationStatus) {
      return { status: "authority-unreadable" };
    }
    const reconciled = await reconcileAttemptCircuitMetadata({
      authority: request.circuitAuthority,
      receipt,
      attemptId,
      providerAttempt,
      nowMs: request.occurredAtMs
    });
    if (!reconciled) return { status: "authority-unreadable" };
    if (receipt.providerFailureClass === null) {
      return {
        status: "executed",
        providerAttempt,
        ...(reservation.reservationStatus === "committed" ? { committedReplay: true as const } : {}),
        circuitFailureRecorded: receipt.circuitFailureState !== "deferred",
        result: {
          status: "completed",
          items: [],
          providerCallCount: 0,
          subsetRetryCount: 0,
          inputCodePoints: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostMicros: 0,
          retryAttemptIds: [],
          successfulAttemptIds: receipt.successfulItemAttemptIds,
          providerFailureClass: null,
          fallbackEligible: false,
          uncertainInflight: false,
          providerReached: true
        }
      };
    }
    const providerFailureClass = receipt.providerFailureClass;
    const successfulAttemptIds = new Set(receipt.successfulItemAttemptIds);
    return {
      status: "executed",
      providerAttempt,
      circuitFailureRecorded: receipt.circuitFailureState === "recorded" || receipt.circuitFailureState === "not-required",
      result: {
        status: "failed",
        items: [],
        providerCallCount: 0,
        subsetRetryCount: 0,
        inputCodePoints: receipt.successfulInputCharacters,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostMicros: 0,
        retryAttemptIds: items.filter((item) => !successfulAttemptIds.has(item.attemptId)).map((item) => item.attemptId),
        successfulAttemptIds: receipt.successfulItemAttemptIds,
        providerFailureClass,
        fallbackEligible: receipt.fallbackEligible,
        uncertainInflight: false,
        providerReached: true,
          httpStatus: null
      }
    };
  }
  if (!["reserved", "uncertain"].includes(reservation.reservationStatus) || !reservation.sessionLeaseToken || !reservation.openAiSlotToken) {
    return { status: "not-reserved", refusal: "status", providerAttempt };
  }

  let dispatchClaim: Awaited<ReturnType<CommentTranslatorPaidUsageStore["claimProviderDispatch"]>>;
  try {
    dispatchClaim = await store.claimProviderDispatch({
      attemptId,
      providerAttempt,
      providerKind: "openai_attempt",
      dispatchSequence: 0,
      sessionLeaseToken: reservation.sessionLeaseToken,
      openAiSlotToken: reservation.openAiSlotToken,
      nowIso
    });
  } catch {
    return { status: "authority-unreadable" };
  }
  if (dispatchClaim === "already-dispatched") {
    return {
      status: "executed",
      providerAttempt,
      circuitFailureRecorded: false,
      result: {
        status: "failed",
        items: [],
        providerCallCount: 0,
        subsetRetryCount: 0,
        inputCodePoints: attemptInputCharacters,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostMicros: 0,
        retryAttemptIds: items.map((item) => item.attemptId),
        successfulAttemptIds: [],
        providerFailureClass: "network",
        fallbackEligible: true,
        uncertainInflight: true,
        providerReached: true,
        httpStatus: null
      }
    };
  }

  const executeBatch = request.openAi?.executeBatch ?? ((batchRequest: {
    items: readonly CommentTranslatorOpenAiBatchItem[];
    maxSubsetRetries: 0;
    maxHttpRetries: number;
    beforeProviderCall?: () => Promise<CommentTranslatorOpenAiProviderPreflightDecision>;
  }) => executeCommentTranslatorOpenAiBatch({
    apiKey: request.openAi?.apiKey,
    endpoint: request.openAi?.endpoint,
    items: batchRequest.items,
    fetchImpl: request.openAi?.fetchImpl,
    maxSubsetRetries: batchRequest.maxSubsetRetries,
    maxHttpRetries: batchRequest.maxHttpRetries,
    beforeProviderCall: batchRequest.beforeProviderCall
  }));
  let result: CommentTranslatorOpenAiExecutionResult;
  try {
    result = await executeBatch({
      items,
      maxSubsetRetries: 0,
      maxHttpRetries,
      beforeProviderCall: async () => {
        const authority = request.circuitAuthority;
        if (!authority) return "authority-unreadable";
        let snapshot: CommentTranslatorProviderCircuitSnapshot;
        try {
          snapshot = await authority.read("openai");
        } catch {
          return "authority-unreadable";
        }
        if (snapshot.provider !== "openai") return "authority-unreadable";
        if (snapshot.state === "disabled") return "kill-switch";
        if (snapshot.state === "degraded") return "circuit-unavailable";
        if (
          snapshot.state === "half_open"
          && (!allowHalfOpenProbe || snapshot.probeAttemptId !== attemptId)
        ) return "circuit-unavailable";
        if (!["closed", "half_open"].includes(snapshot.state)) return "authority-unreadable";
        return "allow";
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "";
    const circuitUnavailable = errorMessage === "paid-openai-circuit-unavailable";
    const killSwitch = errorMessage === "paid-openai-kill-switch";
    const authorityUnreadable = errorMessage === "paid-openai-authority-unreadable";
    result = {
      status: "failed",
      items: [],
      providerCallCount: circuitUnavailable || killSwitch || authorityUnreadable ? 0 : 1,
      subsetRetryCount: 0,
      inputCodePoints: attemptInputCharacters,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostMicros: reservationCostMicros,
      retryAttemptIds: items.map((item) => item.attemptId),
      providerFailureClass: killSwitch || authorityUnreadable ? "configuration" : "network",
      fallbackEligible: circuitUnavailable,
      // An unreadable preflight never reached the Provider. Keep the
      // reservation releasable; uncertain-inflight is reserved for a call
      // that may have crossed the Provider boundary.
      uncertainInflight: !authorityUnreadable && !circuitUnavailable && !killSwitch,
      providerReached: !circuitUnavailable && !killSwitch && !authorityUnreadable,
      httpStatus: null,
      preflightDecision: authorityUnreadable ? "authority-unreadable" : killSwitch ? "kill-switch" : undefined
    };
  }
  let circuitFailureRecorded = false;
  const deferInitialOrdinaryRateLimit = deferRateLimitCircuitFailure
    && !allowHalfOpenProbe
    && result.status === "failed"
    && result.providerReached
    && result.providerCallCount > 0
    && result.providerFailureClass === "rate-limit"
    && result.httpStatus === 429
    && result.fallbackEligible;
  const circuitFailureState: CommentTranslatorPaidCircuitFailureState = deferInitialOrdinaryRateLimit
    ? "deferred"
    : result.status === "failed" && result.providerReached && result.providerCallCount > 0 && result.fallbackEligible
      ? "pending"
      : "not-required";
  const circuitSuccessState: CommentTranslatorPaidCircuitSuccessState = result.status === "completed"
    && allowHalfOpenProbe
    && result.providerCallCount > 0
    ? "pending"
    : "not-required";
  const paidFailureClass = result.status === "failed"
    ? mapPaidFailureClass(result.providerFailureClass)
    : null;
  const outcome: CommentTranslatorPaidOpenAiAttemptOutcome = result.status === "completed"
    ? "completed"
    : result.uncertainInflight
      ? "uncertain_inflight"
      : result.providerReached
        ? "provider_reached_failed"
        : "provider_not_reached";
  const finalized = await finalizeOpenAiAttemptSafely({
    store,
    attemptId,
    providerAttempt,
    reservation,
    outcome,
    providerFailureClass: outcome === "completed" ? null : paidFailureClass ?? "policy",
    actualInputCharacters: logicalInputCharacters,
    actualCostMicros: result.estimatedCostMicros,
    successfulItemAttemptIds: readCurrentOpenAiSuccessfulAttemptIds(result),
    successfulInputCharacters: countCurrentOpenAiSuccessfulInputCharacters(result, items),
    fallbackEligible: result.status === "failed" ? result.fallbackEligible : false,
    circuitFailureState,
    circuitSuccessState,
    nowIso
  });
  if (!finalized) return { status: "authority-unreadable" };
  if (circuitFailureState === "pending") {
    const recorded = await recordAttemptCircuitFailureSafely({
      authority: request.circuitAuthority,
      provider: "openai",
      attemptId,
      providerAttempt,
      failureClass: result.status === "failed" ? result.providerFailureClass : null,
      nowMs: request.occurredAtMs
    });
    if (!recorded) {
      return { status: "executed", result, providerAttempt, circuitFailureRecorded: false, markerReconciliationFailed: true };
    }
    circuitFailureRecorded = true;
  }
  if (circuitSuccessState === "pending") {
    const recorded = await recordAttemptCircuitSuccessSafely({
      authority: request.circuitAuthority,
      provider: "openai",
      attemptId,
      providerAttempt,
      nowMs: request.occurredAtMs
    });
    if (!recorded) {
      return { status: "executed", result, providerAttempt, circuitFailureRecorded, markerReconciliationFailed: true };
    }
  }
  if (result.status === "failed" && result.preflightDecision === "authority-unreadable") {
    return { status: "authority-unreadable" };
  }
  if (result.status === "failed" && result.preflightDecision === "kill-switch") {
    if (!(await abandonPaidLogicalAttemptSafely(store, attemptId, providerAttempt, nowIso))) {
      return { status: "authority-unreadable" };
    }
    return { status: "kill-switch" };
  }
  return { status: "executed", result, providerAttempt, circuitFailureRecorded };
}

function appendPaidOpenAiTranslations(
  translations: CommentTranslatorProviderExecutionTranslation[],
  result: CommentTranslatorOpenAiExecutionResult,
  bindings: readonly { comment: YouTubeProviderSafeCommentPayload; item: CommentTranslatorOpenAiBatchItem }[],
  successfulAttemptIds?: Set<string>
): void {
  for (const item of result.items) {
    if (successfulAttemptIds?.has(item.attemptId)) continue;
    const binding = bindings.find((candidate) => candidate.item.attemptId === item.attemptId);
    if (!binding) continue;
    const comment = binding.comment;
    translations.push({
      commentReferenceId: comment.commentId,
      translatedText: item.translatedText,
      detectedSourceLanguage: comment.platformLanguageHint,
      confidence: null,
      cacheOutcome: "miss",
      providerErrorClass: "translated",
      providerInputCharacterEstimate: countUnicodeCharacters(comment.text),
      translatedCharacterEstimate: countUnicodeCharacters(item.translatedText),
      estimatedCostMicros: result.estimatedCostMicros,
      recoverablePrimaryFallbackCount: 0
    });
    successfulAttemptIds?.add(item.attemptId);
  }
}

function mergeSuccessfulOpenAiAttemptIds(
  result: CommentTranslatorOpenAiExecutionResult,
  successfulAttemptIds: Set<string>
): void {
  for (const attemptId of result.successfulAttemptIds ?? []) {
    successfulAttemptIds.add(attemptId);
  }
}

function readCurrentOpenAiSuccessfulAttemptIds(
  result: CommentTranslatorOpenAiExecutionResult
): string[] {
  return Array.from(new Set([
    ...(result.successfulAttemptIds ?? []),
    ...result.items.map((item) => item.attemptId)
  ]));
}

function countCurrentOpenAiSuccessfulInputCharacters(
  result: CommentTranslatorOpenAiExecutionResult,
  items: readonly CommentTranslatorOpenAiBatchItem[]
): number {
  const successfulAttemptIds = new Set(readCurrentOpenAiSuccessfulAttemptIds(result));
  return items.reduce(
    (total, item) => successfulAttemptIds.has(item.attemptId)
      ? total + countUnicodeCharacters(item.text)
      : total,
    0
  );
}

function selectOpenAiFallbackBindings(
  result: CommentTranslatorOpenAiExecutionResult,
  bindings: readonly { comment: YouTubeProviderSafeCommentPayload; item: CommentTranslatorOpenAiBatchItem }[],
  successfulAttemptIds?: ReadonlySet<string>
): { comment: YouTubeProviderSafeCommentPayload; item: CommentTranslatorOpenAiBatchItem }[] {
  if (result.status !== "failed" || !result.fallbackEligible) return [];
  const completedAttemptIds = successfulAttemptIds ?? new Set(result.items.map((item) => item.attemptId));
  const explicitRetryAttemptIds = new Set(result.retryAttemptIds);
  return bindings.filter((binding) => {
    if (completedAttemptIds.has(binding.item.attemptId)) return false;
    return explicitRetryAttemptIds.size === 0 || explicitRetryAttemptIds.has(binding.item.attemptId);
  });
}

function countPaidSuccessfulInputCharacters(
  result: CommentTranslatorOpenAiExecutionResult,
  bindings: readonly { comment: YouTubeProviderSafeCommentPayload; item: CommentTranslatorOpenAiBatchItem }[],
  successfulAttemptIds?: ReadonlySet<string>
): number {
  if (result.status !== "failed") return 0;
  const completedAttemptIds = successfulAttemptIds ?? new Set(result.items.map((item) => item.attemptId));
  return bindings.reduce(
    (total, binding) => completedAttemptIds.has(binding.item.attemptId)
      ? total + countUnicodeCharacters(binding.comment.text)
      : total,
    0
  );
}

function isBoundedOpenAiRateLimitFailure(
  result: CommentTranslatorOpenAiExecutionResult
): result is Extract<CommentTranslatorOpenAiExecutionResult, { status: "failed" }> {
  return result.status === "failed"
    && result.providerFailureClass === "rate-limit"
    && result.fallbackEligible
    && result.providerReached;
}

async function finalizeOpenAiAttemptSafely({
  store,
  attemptId,
  providerAttempt,
  reservation,
  outcome,
  providerFailureClass,
  actualInputCharacters,
  actualCostMicros,
  successfulItemAttemptIds,
  successfulInputCharacters,
  fallbackEligible,
  circuitFailureState,
  circuitSuccessState,
  nowIso
}: {
  store: CommentTranslatorPaidUsageStore;
  attemptId: string;
  providerAttempt: string;
  reservation: CommentTranslatorPaidProviderReservation;
  outcome: CommentTranslatorPaidOpenAiAttemptOutcome;
  providerFailureClass: CommentTranslatorPaidProviderFailureClass | null;
  actualInputCharacters: number;
  actualCostMicros: number;
  successfulItemAttemptIds: readonly string[];
  successfulInputCharacters: number;
  fallbackEligible: boolean;
  circuitFailureState: CommentTranslatorPaidCircuitFailureState;
  circuitSuccessState: CommentTranslatorPaidCircuitSuccessState;
  nowIso: string;
}): Promise<boolean> {
  if (!reservation.sessionLeaseToken || !reservation.openAiSlotToken) return false;
  try {
    return await store.finalizeOpenAiAttempt({
      attemptId,
      providerAttempt,
      sessionLeaseToken: reservation.sessionLeaseToken,
      openAiSlotToken: reservation.openAiSlotToken,
      outcome,
      actualInputCharacters,
      actualCostMicros,
      providerFailureClass,
      successfulItemAttemptIds,
      successfulInputCharacters,
      fallbackEligible,
      circuitFailureState,
      circuitSuccessState,
      nowIso
    });
  } catch {
    return false;
  }
}

async function abandonPaidLogicalAttemptSafely(
  store: CommentTranslatorPaidUsageStore,
  attemptId: string,
  releasedProviderAttempt: string,
  nowIso: string
): Promise<boolean> {
  try {
    await store.abandonLogicalAttempt({
      attemptId,
      releasedProviderAttempt,
      nowIso
    });
    return true;
  } catch {
    return false;
  }
}

async function commitTerminalOpenAiPartialSafely(
  store: CommentTranslatorPaidUsageStore,
  attemptId: string,
  providerAttempt: string,
  actualCharacters: number,
  nowIso: string
): Promise<boolean> {
  try {
    return await store.commitTerminalOpenAiPartial({
      attemptId,
      providerAttempt,
      actualCharacters,
      nowIso
    }) === actualCharacters;
  } catch {
    return false;
  }
}

async function executePaidAzureDirectFallback({
  request,
  comments,
  attemptId,
  providerAttempt,
  logicalInputCharacters,
  alreadySuccessfulInputCharacters = 0,
  halfOpenProbe = false,
  nowIso
}: {
  request: ExecuteCommentTranslatorPaidProviderBatchRequest;
  comments: readonly YouTubeProviderSafeCommentPayload[];
  attemptId: string;
  providerAttempt: string;
  logicalInputCharacters?: number;
  alreadySuccessfulInputCharacters?: number;
  halfOpenProbe?: boolean;
  nowIso: string;
}): Promise<{
  providerCallCount: number;
  fallbackCount: number;
  translations: CommentTranslatorProviderExecutionTranslation[];
  uncertain: boolean;
  terminal: boolean;
  reservationUnavailable: boolean;
  reservationRefusal: CommentTranslatorPaidReservationRefusal | "status" | null;
  failureClass: CommentTranslatorPaidProviderFailureClass | null;
  authorityUnreadable: boolean;
  circuitFailureRecorded: boolean;
  committedInputCharacters: number;
}> {
  const store = request.usageStore;
  const azureProvider = request.azureProvider;
  if (!azureProvider || !store) {
    return {
      providerCallCount: 0,
      fallbackCount: 0,
      translations: [],
      uncertain: false,
      terminal: false,
      reservationUnavailable: false,
      reservationRefusal: null,
      failureClass: null,
      authorityUnreadable: true,
      circuitFailureRecorded: false,
      committedInputCharacters: 0
    };
  }
  const inputCharacters = comments.reduce((total, comment) => total + countUnicodeCharacters(comment.text), 0);
  const reservationInputCharacters = logicalInputCharacters ?? inputCharacters;
  let azureReservation: CommentTranslatorPaidProviderReservation;
  try {
    azureReservation = await store.azureDirectFallback({
      attemptId,
      providerAttempt,
      ownerUserId: request.ownerUserId,
      sessionReferenceId: request.sessionReferenceId,
      periodStartIso: request.periodStartIso,
      periodEndIso: request.periodEndIso,
      utcMonth: request.utcMonth,
      inputCharacters: reservationInputCharacters,
      nowIso
    });
  } catch (error) {
    if (error instanceof CommentTranslatorPaidReservationRefusedError) {
      return {
        providerCallCount: 0,
        fallbackCount: 0,
        translations: [],
        uncertain: false,
        terminal: false,
        reservationUnavailable: true,
        reservationRefusal: error.refusal,
        failureClass: null,
        authorityUnreadable: false,
        circuitFailureRecorded: false,
        committedInputCharacters: 0
      };
    }
    return {
      providerCallCount: 0,
      fallbackCount: 0,
      translations: [],
      uncertain: false,
      terminal: false,
      reservationUnavailable: false,
      reservationRefusal: null,
      failureClass: null,
      authorityUnreadable: true,
      circuitFailureRecorded: false,
      committedInputCharacters: 0
    };
  }
  if (
    ["uncertain", "committed", "released", "expired"].includes(azureReservation.reservationStatus)
    && azureReservation.sessionLeaseToken === null
  ) {
    try {
      const receipt = await store.readProviderAttemptReplayMetadata({ attemptId, providerAttempt });
      if (receipt.providerKind !== "azure_direct_fallback" || receipt.attemptState !== azureReservation.reservationStatus) {
        throw new Error("Azure replay receipt is unreadable.");
      }
      if (!(await reconcileAttemptCircuitMetadata({
        authority: request.circuitAuthority,
        receipt,
        attemptId,
        providerAttempt,
        nowMs: request.occurredAtMs
      }))) throw new Error("Azure replay circuit authority is unavailable.");
      return {
        providerCallCount: 0,
        fallbackCount: 0,
        translations: [],
        uncertain: receipt.attemptState === "uncertain",
        terminal: receipt.providerFailureClass !== null && receipt.attemptState !== "uncertain",
        reservationUnavailable: false,
        reservationRefusal: null,
        failureClass: receipt.providerFailureClass,
        authorityUnreadable: false,
        circuitFailureRecorded: receipt.circuitFailureState !== "pending",
        committedInputCharacters: receipt.successfulInputCharacters
      };
    } catch {
      return {
        providerCallCount: 0, fallbackCount: 0, translations: [], uncertain: false, terminal: false,
        reservationUnavailable: false, reservationRefusal: null, failureClass: null,
        authorityUnreadable: true, circuitFailureRecorded: false, committedInputCharacters: 0
      };
    }
  }
  if (!["reserved", "uncertain"].includes(azureReservation.reservationStatus) || !azureReservation.sessionLeaseToken) {
    return {
      providerCallCount: 0,
      fallbackCount: 0,
      translations: [],
      uncertain: false,
      terminal: false,
      reservationUnavailable: true,
      reservationRefusal: "status",
      failureClass: null,
      authorityUnreadable: false,
      circuitFailureRecorded: false,
      committedInputCharacters: 0
    };
  }

  const azureDeadlineMs = Date.now() + commentTranslatorPaidProviderExecutionContract.reservationTtlMs;
  const translations: CommentTranslatorProviderExecutionTranslation[] = [];
  let providerCallCount = 0;
  let azureUncertain = false;
  let azureDispatchAlreadyDispatchedReplay = false;
  let terminalFailureClass: CommentTranslatorPaidProviderFailureClass | null = null;
  let uncertainFailureClass: CommentTranslatorPaidProviderFailureClass = "network";
  let successfulAzureInputCharacters = 0;
  for (let commentIndex = 0; commentIndex < comments.length; commentIndex += 1) {
    const comment = comments[commentIndex];
    const remainingProviderWindowMs = azureDeadlineMs
      - Date.now()
      - commentTranslatorPaidProviderExecutionContract.maxAdditionalWaitMs;
    if (remainingProviderWindowMs <= 0) {
      terminalFailureClass = "timeout";
      break;
    }
    const providerTimeoutMs = Math.min(
      commentTranslatorPaidProviderExecutionContract.httpTimeoutMs,
      remainingProviderWindowMs
    );
    let dispatchClaim: Awaited<ReturnType<CommentTranslatorPaidUsageStore["claimProviderDispatch"]>>;
    try {
      dispatchClaim = await store.claimProviderDispatch({
        attemptId,
        providerAttempt,
        providerKind: "azure_direct_fallback",
        dispatchSequence: commentIndex,
        sessionLeaseToken: azureReservation.sessionLeaseToken,
        nowIso
      });
    } catch {
      return {
        providerCallCount,
        fallbackCount: 0,
        translations: [],
        uncertain: false,
        terminal: false,
        reservationUnavailable: false,
        reservationRefusal: null,
        failureClass: null,
        authorityUnreadable: true,
        circuitFailureRecorded: false,
        committedInputCharacters: 0
      };
    }
    if (dispatchClaim === "already-dispatched") {
      azureUncertain = true;
      azureDispatchAlreadyDispatchedReplay = true;
      uncertainFailureClass = "network";
      break;
    }
    providerCallCount += 1;
    try {
      const providerResult = await executeProviderCallWithTimeout(() => azureProvider.translate({
        requestId: createOpaqueProviderAttempt(providerAttempt, "azure_direct", commentIndex, comments.length),
        input: {
          kind: "live-comment",
          text: comment.text.trim(),
          sourceLanguage: comment.platformLanguageHint ?? "auto",
          targetLanguage: request.targetLanguage
        },
        glossary: { terms: [], version: null },
        cache: {
          lookupKey: null,
          keyMaterial: {
            normalizedTextHash: "paid-runtime-only",
            sourceLanguage: comment.platformLanguageHint ?? "auto",
            targetLanguage: request.targetLanguage,
            providerCapabilityVersion: "paid-v1-task6",
            glossaryVersion: null,
            moderationPolicyVersion: "paid-v1-task6",
            excludes: [
              "authorName", "channelId", "viewerId", "streamId", "rawSecret", "oauthToken", "refreshToken",
              "authorizationCode", "providerTargetIdentifier", "pollingCursor", "ownerIdentifier", "authorizationHeader",
              "serviceRoleKey", "browserLocalHandoffMaterial", "liveChatId", "providerChannelId", "rawProviderTargetMetadata"
            ]
          }
        },
        privacy: {
          logRetention: "short-lived-only",
          rawTextLogging: "disabled-by-default",
          piiMinimization: "exclude-author-and-channel-identifiers",
          moderationSkipReason: null
        },
        usageHandoff: {
          meteringEventId: "paid-v1-task6",
          providerId: "azure-translator",
          billingCategory: "translation",
          estimatedUnits: countUnicodeCharacters(comment.text),
          estimatedCostMicros: countUnicodeCharacters(comment.text),
          cacheOutcome: "miss",
          enforcement: "not-implemented",
          databaseWrite: "not-implemented",
          logPolicy: "short-lived-provider-diagnostic-only"
        }
      }), providerTimeoutMs);
      if (providerResult.type === "recoverable-error") {
        if (
          providerResult.code === "timeout"
          || providerResult.code === "transport-uncertain"
        ) {
          azureUncertain = true;
          uncertainFailureClass = providerResult.code === "timeout" ? "timeout" : "network";
        } else if (providerResult.code === "response-invalid" || providerResult.code === "content-filtered") {
          terminalFailureClass = "policy";
        } else {
          terminalFailureClass = mapAzureFailureClass(providerResult.code);
        }
        break;
      }
      if (providerResult.type === "terminal-error") {
        terminalFailureClass = providerResult.code === "provider-quota-exhausted"
          ? "quota"
          : mapAzureTerminalFailureClass(providerResult.code);
        break;
      }
      if (!providerResult.translatedText.trim()) {
        terminalFailureClass = "policy";
        break;
      }
      if (countUnicodeCharacters(providerResult.translatedText) > commentTranslatorOpenAiMaxOutputItemCodePoints) {
        terminalFailureClass = "policy";
        break;
      }
      translations.push({
        commentReferenceId: comment.commentId,
        translatedText: providerResult.translatedText,
        detectedSourceLanguage: providerResult.detectedSourceLanguage,
        confidence: providerResult.confidence,
        cacheOutcome: "miss",
        providerErrorClass: "translated",
        providerInputCharacterEstimate: countUnicodeCharacters(comment.text),
        translatedCharacterEstimate: countUnicodeCharacters(providerResult.translatedText),
        estimatedCostMicros: providerResult.usageHandoff.estimatedCostMicros ?? 0,
          recoverablePrimaryFallbackCount: 1
        });
      successfulAzureInputCharacters += countUnicodeCharacters(comment.text);
    } catch (error) {
      azureUncertain = true;
      uncertainFailureClass = isProviderTimeoutError(error) ? "timeout" : "network";
      break;
    }
  }
  const terminal = terminalFailureClass !== null;
  let circuitFailureRecorded = false;
  const circuitFailureClass = azureUncertain ? uncertainFailureClass : terminalFailureClass;
  const circuitFailureState = circuitFailureClass === null ? "not-required" : "pending";
  const circuitSuccessState = circuitFailureClass === null && halfOpenProbe ? "pending" : "not-required";
  let partialFailureSettled = false;
  try {
    const committedInputCharacters = alreadySuccessfulInputCharacters + successfulAzureInputCharacters;
    const finalizeBase = {
      attemptId,
      providerAttempt,
      sessionLeaseToken: azureReservation.sessionLeaseToken,
      nowIso
    };
    const hasKnownFailure = circuitFailureClass !== null;
    const shouldSettleKnownPartialFailure = !azureDispatchAlreadyDispatchedReplay
      && hasKnownFailure
      && (committedInputCharacters > 0 || !azureUncertain);
    const finalized = shouldSettleKnownPartialFailure
      ? await store.settleAzurePartialFailure({
          ...finalizeBase,
          actualInputCharacters: successfulAzureInputCharacters,
          actualBillingInputCharacters: committedInputCharacters,
          providerFailureClass: circuitFailureClass,
          nowIso
        })
      : azureUncertain
        ? await store.finalizeAzureDirectFallback({
          ...finalizeBase,
          outcome: "uncertain_inflight",
          providerFailureClass: uncertainFailureClass,
          circuitFailureState,
          circuitSuccessState
        })
        : await store.finalizeAzureDirectFallback({
            ...finalizeBase,
            outcome: "completed",
            providerFailureClass: null,
            actualInputCharacters: successfulAzureInputCharacters,
            actualBillingInputCharacters: alreadySuccessfulInputCharacters > 0
              ? committedInputCharacters
              : undefined,
            circuitFailureState,
            circuitSuccessState
        });
    partialFailureSettled = shouldSettleKnownPartialFailure;
    if (!finalized) {
      return {
        providerCallCount,
        fallbackCount: 0,
        translations: [],
        uncertain: azureUncertain,
        terminal,
        reservationUnavailable: false,
        reservationRefusal: null,
        failureClass: azureUncertain ? uncertainFailureClass : terminalFailureClass,
        authorityUnreadable: true,
        circuitFailureRecorded,
        committedInputCharacters: 0
      };
    }
    if (circuitFailureClass !== null) {
      const recorded = await recordAttemptCircuitFailureSafely({
        authority: request.circuitAuthority,
        provider: "azure_fallback",
        attemptId,
        providerAttempt,
        failureClass: circuitFailureClass,
        nowMs: request.occurredAtMs,
        disableProvider: circuitFailureClass === "quota"
      });
      if (!recorded) throw new Error("Azure circuit failure marker is unavailable.");
      circuitFailureRecorded = true;
    } else if (circuitSuccessState === "pending") {
      const recorded = await recordAttemptCircuitSuccessSafely({
        authority: request.circuitAuthority,
        provider: "azure_fallback",
        attemptId,
        providerAttempt,
        nowMs: request.occurredAtMs
      });
      if (!recorded) throw new Error("Azure circuit success marker is unavailable.");
    }
  } catch {
    return {
      providerCallCount,
      fallbackCount: 0,
      translations: [],
      uncertain: azureUncertain,
      terminal,
      reservationUnavailable: false,
      reservationRefusal: null,
      failureClass: azureUncertain ? uncertainFailureClass : terminalFailureClass,
      authorityUnreadable: true,
      circuitFailureRecorded,
      committedInputCharacters: 0
    };
  }
  return {
    providerCallCount,
    fallbackCount: (azureUncertain && !partialFailureSettled) || translations.length === 0 ? 0 : 1,
    translations: azureUncertain && !partialFailureSettled ? [] : translations,
    uncertain: azureUncertain && !partialFailureSettled,
    terminal,
    reservationUnavailable: false,
    reservationRefusal: null,
    failureClass: azureUncertain ? uncertainFailureClass : terminalFailureClass,
    authorityUnreadable: false,
    circuitFailureRecorded,
    committedInputCharacters: partialFailureSettled || circuitFailureClass === null
      ? alreadySuccessfulInputCharacters + successfulAzureInputCharacters
      : 0
  };
}

async function executeProviderCallWithTimeout<T>(execute: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      execute(),
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("provider-timeout")), Math.max(1, timeoutMs));
      })
    ]);
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

function isProviderTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === "provider-timeout";
}

function mapAzureFailureClass(
  code: CommentTranslationProviderRecoverableError["code"]
): CommentTranslatorPaidProviderFailureClass {
  if (code === "timeout") return "timeout";
  if (code === "rate-limited") return "rate-limit";
  if (code === "content-filtered") return "policy";
  return "server-error";
}

function mapAzureTerminalFailureClass(
  code: CommentTranslationProviderTerminalError["code"]
): CommentTranslatorPaidProviderFailureClass {
  if (code === "policy-blocked") return "policy";
  return "configuration";
}

type PaidAzureCircuitPreparationResult =
  | { status: "ready"; halfOpen: boolean }
  | {
      status: "blocked";
      reason: "authority-unreadable" | "provider-capacity-paused" | "kill-switch";
    };

async function preparePaidAzureCircuit({
  authority,
  nowMs,
  attemptId
}: {
  authority: CommentTranslatorProviderCircuitAuthority;
  nowMs: number;
  attemptId: string;
}): Promise<PaidAzureCircuitPreparationResult> {
  let snapshot: CommentTranslatorProviderCircuitSnapshot;
  try {
    snapshot = await authority.read("azure_fallback");
  } catch {
    return { status: "blocked", reason: "authority-unreadable" };
  }
  if (
    snapshot.provider !== "azure_fallback"
    || !["closed", "degraded", "half_open", "disabled"].includes(snapshot.state)
  ) {
    return { status: "blocked", reason: "authority-unreadable" };
  }
  if (snapshot.state === "disabled") return { status: "blocked", reason: "kill-switch" };
  if (snapshot.state === "degraded") {
    if (snapshot.degradedUntilMs === null) {
      return { status: "blocked", reason: "authority-unreadable" };
    }
    if (snapshot.degradedUntilMs > nowMs) {
      return { status: "blocked", reason: "provider-capacity-paused" };
    }
    try {
      snapshot = await authority.probe({
        provider: "azure_fallback",
        nowMs,
        probeAttemptId: attemptId
      });
    } catch {
      return { status: "blocked", reason: "authority-unreadable" };
    }
  } else if (snapshot.state === "half_open" && snapshot.probeAttemptId !== attemptId) {
    try {
      snapshot = await authority.probe({
        provider: "azure_fallback",
        nowMs,
        probeAttemptId: attemptId
      });
    } catch {
      return { status: "blocked", reason: "authority-unreadable" };
    }
  }
  if (snapshot.state === "disabled") return { status: "blocked", reason: "kill-switch" };
  if (snapshot.state !== "closed" && (snapshot.state !== "half_open" || snapshot.probeAttemptId !== attemptId)) {
    return { status: "blocked", reason: "provider-capacity-paused" };
  }
  return { status: "ready", halfOpen: snapshot.state === "half_open" };
}

async function recordAzureCircuitOutcomeSafely({
  authority,
  attemptId,
  nowMs,
  failureClass
}: {
  authority: CommentTranslatorProviderCircuitAuthority;
  attemptId: string;
  nowMs: number;
  failureClass: CommentTranslatorPaidProviderFailureClass | null;
}): Promise<boolean> {
  if (failureClass !== null) {
    return (await recordCircuitFailureSafely(
      authority,
      "azure_fallback",
      failureClass,
      nowMs,
      attemptId
    )) !== null;
  }
  try {
    const snapshot = await authority.recordSuccess({
      provider: "azure_fallback",
      nowMs,
      probeAttemptId: attemptId,
      receiptCommitted: true
    });
    return snapshot.provider === "azure_fallback";
  } catch {
    return false;
  }
}

async function recordCircuitFailureSafely(
  authority: CommentTranslatorProviderCircuitAuthority,
  provider: CommentTranslatorProviderCircuitName,
  failureClass: CommentTranslatorOpenAiProviderFailureClass | null,
  nowMs: number,
  probeAttemptId: string | null = null
): Promise<CommentTranslatorProviderCircuitSnapshot | null> {
  if (!failureClass) return null;
  try {
    return await authority.recordFailure({
      provider,
      failureClass,
      nowMs,
      probeAttemptId
    });
  } catch {
    return null;
  }
}

async function recordAttemptCircuitFailureSafely({
  authority,
  provider,
  attemptId,
  providerAttempt,
  failureClass,
  nowMs,
  allowDeferredPromotion = false,
  disableProvider = false
}: {
  authority: CommentTranslatorProviderCircuitAuthority | null;
  provider: CommentTranslatorProviderCircuitName;
  attemptId: string;
  providerAttempt: string;
  failureClass: CommentTranslatorOpenAiProviderFailureClass | null;
  nowMs: number;
  allowDeferredPromotion?: boolean;
  disableProvider?: boolean;
}): Promise<boolean> {
  if (!authority || !failureClass) return false;
  try {
    const snapshot = await authority.recordAttemptFailure({
      provider,
      attemptId,
      providerAttempt,
      failureClass,
      nowMs,
      allowDeferredPromotion,
      disableProvider
    });
    return snapshot.provider === provider;
  } catch {
    return false;
  }
}

async function recordAttemptCircuitSuccessSafely({
  authority,
  provider,
  attemptId,
  providerAttempt,
  nowMs
}: {
  authority: CommentTranslatorProviderCircuitAuthority | null;
  provider: CommentTranslatorProviderCircuitName;
  attemptId: string;
  providerAttempt: string;
  nowMs: number;
}): Promise<boolean> {
  if (!authority) return false;
  try {
    const snapshot = await authority.recordAttemptSuccess({ provider, attemptId, providerAttempt, nowMs });
    return snapshot.provider === provider;
  } catch {
    return false;
  }
}

async function reconcileAttemptCircuitMetadata({
  authority,
  receipt,
  attemptId,
  providerAttempt,
  nowMs
}: {
  authority: CommentTranslatorProviderCircuitAuthority | null;
  receipt: Awaited<ReturnType<CommentTranslatorPaidUsageStore["readProviderAttemptReplayMetadata"]>>;
  attemptId: string;
  providerAttempt: string;
  nowMs: number;
}): Promise<boolean> {
  const provider: CommentTranslatorProviderCircuitName = receipt.providerKind === "openai_attempt"
    ? "openai"
    : "azure_fallback";
  if (receipt.circuitFailureState === "pending") {
    return recordAttemptCircuitFailureSafely({
      authority,
      provider,
      attemptId,
      providerAttempt,
      failureClass: receipt.providerFailureClass,
      nowMs,
      disableProvider: provider === "azure_fallback" && receipt.providerFailureClass === "quota"
    });
  }
  if (receipt.circuitSuccessState === "pending") {
    return recordAttemptCircuitSuccessSafely({ authority, provider, attemptId, providerAttempt, nowMs });
  }
  return true;
}

async function recordCircuitSuccessSafely(
  authority: CommentTranslatorProviderCircuitAuthority,
  nowMs: number,
  attemptId: string
): Promise<CommentTranslatorProviderCircuitSnapshot | null> {
  try {
    return await authority.recordSuccess({
      provider: "openai",
      nowMs,
      probeAttemptId: attemptId,
      receiptCommitted: true
    });
  } catch {
    return null;
  }
}

function mapPaidFailureClass(
  failureClass: CommentTranslatorOpenAiProviderFailureClass | null
): CommentTranslatorPaidProviderFailureClass {
  switch (failureClass) {
    case "network":
      return "network";
    case "timeout":
      return "timeout";
    case "rate-limit":
      return "rate-limit";
    case "server-error":
      return "server-error";
    case "invalid-response":
      return "invalid-response";
    case "quota":
      return "quota";
    case "configuration":
    case "authentication":
    case "invalid-request":
    case "unsupported":
      return "configuration";
    case "cost":
      return "quota";
    case "policy":
      return "policy";
    default:
      return "policy";
  }
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
        providerInputCharacterEstimate: translatedMessages.reduce(
          (total, message) => total + message.providerInputCharacterEstimate,
          0
        ),
        translatedCharacterEstimate: translatedMessages.reduce(
          (total, message) => total + message.translatedCharacterEstimate,
          0
        ),
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
    providerInputCharacterEstimate: countUnicodeCharacters(providerRequest.input.text),
    translatedCharacterEstimate: countUnicodeCharacters(result.translatedText),
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
    providerInputCharacterEstimate: countUnicodeCharacters(providerRequest.input.text),
    translatedCharacterEstimate: countUnicodeCharacters(cachedTranslation.translatedText),
    estimatedCostMicros: 0,
    recoverablePrimaryFallbackCount: 0
  };
}

function countUnicodeCharacters(value: string) {
  return Array.from(value.trim()).length;
}

function filterProviderExecutedTranslations(
  translations: readonly CommentTranslatorProviderExecutionTranslation[]
): CommentTranslatorProviderExecutionTranslation[] {
  return translations.filter((translation) => translation.cacheOutcome !== "hit");
}

function recordProviderRequestBatchSummary({
  batchSummaries,
  maxBatchSize,
  providerRequestCount
}: {
  batchSummaries: CommentTranslatorProviderExecutionBatchSummary[];
  maxBatchSize: number;
  providerRequestCount: number;
}) {
  const batchIndex = Math.floor((providerRequestCount - 1) / maxBatchSize);
  const existing = batchSummaries[batchIndex];
  if (existing) {
    existing.providerRequestCount += 1;
    return;
  }

  batchSummaries.push({
    batchIndex,
    providerRequestCount: 1
  });
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
    terminalErrorCodeCounts: terminalErrorCodeCountOverrides,
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
    terminalErrorCodeCounts: {
      ...createEmptyTerminalErrorCodeCounts(),
      ...terminalErrorCodeCountOverrides
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

function createEmptyTerminalErrorCodeCounts(): CommentTranslatorProviderTerminalErrorCodeCounts {
  return {
    invalidRequest: 0,
    unsupportedLanguage: 0,
    providerNotConfigured: 0,
    credentialMissing: 0,
    policyBlocked: 0,
    providerQuotaExhausted: 0
  };
}

function incrementTerminalErrorCodeCount(
  counts: CommentTranslatorProviderTerminalErrorCodeCounts,
  code: CommentTranslationProviderTerminalError["code"]
) {
  counts[terminalErrorCodeCountKey(code)] += 1;
}

function terminalErrorCodeCountKey(
  code: CommentTranslationProviderTerminalError["code"]
): keyof CommentTranslatorProviderTerminalErrorCodeCounts {
  switch (code) {
    case "invalid-request":
      return "invalidRequest";
    case "unsupported-language":
      return "unsupportedLanguage";
    case "provider-not-configured":
      return "providerNotConfigured";
    case "credential-missing":
      return "credentialMissing";
    case "policy-blocked":
      return "policyBlocked";
    case "provider-quota-exhausted":
      return "providerQuotaExhausted";
  }
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
