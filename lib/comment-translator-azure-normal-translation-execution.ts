import "server-only";

import {
  createCommentTranslatorDefaultTranslationProviderSet,
  type CommentTranslatorTranslationProviderSet
} from "./comment-translator-provider-policy-runtime";
import {
  createInMemoryCommentTranslatorProviderExecutionCache,
  executeCommentTranslatorProviderPolicyBatch,
  type CommentTranslatorProviderExecutionCache,
  type CommentTranslatorProviderExecutionResult
} from "./comment-translator-provider-execution-runtime";
import {
  createCommentTranslatorRealCommentsFeedStateFromNormalizedMessages,
  createUnavailableCommentTranslatorRealCommentsFeedState
} from "./comment-translator-real-comments-ui-wiring";
import {
  persistCommentTranslatorRealCommentsFeedForActiveSession,
  type CommentTranslatorRealCommentsFeedSessionBridgePersistResult
} from "./comment-translator-real-comments-feed-session-bridge";
import type {
  CommentTranslatorRealCommentsFeedDurableStoreFactoryResult
} from "./comment-translator-real-comments-feed-durable-store";
import {
  recordCommentTranslatorDurableUsageLedgerEventOrFailClosed,
  type CommentTranslatorDurableUsageCounterStoreFactoryResult
} from "./comment-translator-durable-usage-counter-store";
import {
  resolveCommentTranslatorFreeBetaProviderCallPolicy
} from "./comment-translator-free-beta-usage-display";
import {
  createYouTubeLiveCommentTranslatorPipelineRequestsForComments
} from "./comment-translator-youtube-live-comment-intake-pipeline";
import {
  normalizeCommentTranslatorTextForPolicyDedupe
} from "./comment-translator-language-policy-runtime";
import {
  attachCommentTranslatorLiveProviderDiagnosticsToFeed,
  type CommentTranslatorLiveProviderDiagnostics,
  type CommentTranslatorRealCommentsDisplayRow,
  type CommentTranslatorRealCommentsFeedState,
  type CommentTranslatorRealCommentsTranslationStatus
} from "./comment-translator-real-comments-feed-shared";
import type { CommentTranslatorNormalizedLiveMessage } from "./comment-translator-live-message-normalization";
import type { CommentTranslatorSessionBrowserSafeState } from "./comment-translator-session-runtime";
import type {
  CommentTranslatorUsageLedgerEvent,
  CommentTranslatorUsageLedgerSnapshot
} from "./comment-translator-usage-ledger-runtime";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";
import type { CommentTranslatorTargetLanguageId } from "./comment-translator";

export type CommentTranslatorAzureNormalTranslationExecutionContract = {
  implementationStage: "free-public-beta-f10-azure-normal-translation-execution";
  runtime: "server-only";
  freePlanPrimary: "azure-translator";
  inputBoundary: "f8-normalized-message-to-server-only-provider-boundary";
  outputBoundary: "f9-browser-safe-feed-row-only";
  providerApiExecution: "approval-gated-not-run-by-default";
  batching: "bounded-batches-no-delayed-queue";
  cache: "sanitized-key-material-dedupe";
  retry: "bounded-recoverable-provider-error-attempts";
  providerErrorDegradation: "recoverable-and-terminal-errors-degrade-to-safe-row-status";
  usageHandoffEstimate: "local-deterministic-provider-and-ai-usage-estimates";
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  authorChannelMaterial: "not-returned-by-design";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  providerTargetMetadata: "forbidden";
  publicLaunchAllowed: false;
};

export type CommentTranslatorAzureNormalTranslationEligibilitySummary = {
  eligibleCommentCount: number;
  nonTranslatableEventCount: number;
  sessionDuplicateSkippedCount: number;
  duplicateTextSkippedCount: number;
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  authorChannelMaterial: "not-returned-by-design";
};

export type CommentTranslatorAzureNormalTranslationUsageHandoffEstimate = {
  providerRequestEstimateCount: number;
  translatedMessageEstimate: number;
  providerInputCharacterEstimate: number;
  translatedCharacterEstimate: number;
  estimatedCostMicros: number;
  durableUsageWrite:
    | "not-run-local-deterministic-handoff-only"
    | "not-run-no-usage-estimate"
    | "durable-counter-persisted"
    | "durable-counter-fail-closed";
  rawCommentText: "never-recorded-by-design";
  providerTargetMetadata: "forbidden";
};

export type ExecuteCommentTranslatorAzureNormalTranslationForNormalizedMessagesRequest = {
  messages: readonly CommentTranslatorNormalizedLiveMessage[];
  sessionStatus: CommentTranslatorSessionBrowserSafeState["status"];
  targetLanguage: CommentTranslatorTargetLanguageId;
  sourceLanguages?: readonly string[];
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  sessionReferenceId: string;
  occurredAtMs: number;
  usage: CommentTranslatorUsageLedgerSnapshot;
  providers?: CommentTranslatorTranslationProviderSet;
  cache?: CommentTranslatorProviderExecutionCache;
  feedPersistenceStore?: CommentTranslatorRealCommentsFeedDurableStoreFactoryResult;
  durableUsageCounterStore?: CommentTranslatorDurableUsageCounterStoreFactoryResult;
  maxBatchSize?: number;
  maxProviderAttemptsPerComment?: number;
};

export type CommentTranslatorAzureNormalTranslationExecutionResult = {
  status: "completed" | "provider-unavailable" | "session-not-active" | "over-limit" | "usage-ledger-unavailable";
  implementationStage: CommentTranslatorAzureNormalTranslationExecutionContract["implementationStage"];
  execution: CommentTranslatorProviderExecutionResult;
  eligibility: CommentTranslatorAzureNormalTranslationEligibilitySummary;
  usageHandoffEstimate: CommentTranslatorAzureNormalTranslationUsageHandoffEstimate;
  feedPersistence: CommentTranslatorRealCommentsFeedSessionBridgePersistResult;
  feed: CommentTranslatorRealCommentsFeedState;
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  providerTargetMetadata: "forbidden";
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  publicLaunchAllowed: false;
};

export const commentTranslatorAzureNormalTranslationExecutionContract = {
  implementationStage: "free-public-beta-f10-azure-normal-translation-execution",
  runtime: "server-only",
  freePlanPrimary: "azure-translator",
  inputBoundary: "f8-normalized-message-to-server-only-provider-boundary",
  outputBoundary: "f9-browser-safe-feed-row-only",
  providerApiExecution: "approval-gated-not-run-by-default",
  batching: "bounded-batches-no-delayed-queue",
  cache: "sanitized-key-material-dedupe",
  retry: "bounded-recoverable-provider-error-attempts",
  providerErrorDegradation: "recoverable-and-terminal-errors-degrade-to-safe-row-status",
  usageHandoffEstimate: "local-deterministic-provider-and-ai-usage-estimates",
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  authorChannelMaterial: "not-returned-by-design",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  providerTargetMetadata: "forbidden",
  publicLaunchAllowed: false
} as const satisfies CommentTranslatorAzureNormalTranslationExecutionContract;

type CommentTranslatorAzureNormalTranslationSessionDedupeState = {
  processedCommentIds: Set<string>;
  feedRowsByCommentId: Map<string, CommentTranslatorRealCommentsDisplayRow>;
  providerExecutionCache: CommentTranslatorProviderExecutionCache;
};

const sessionDedupeStateBySessionReference = new Map<string, CommentTranslatorAzureNormalTranslationSessionDedupeState>();

export async function executeCommentTranslatorAzureNormalTranslationForNormalizedMessages(
  request: ExecuteCommentTranslatorAzureNormalTranslationForNormalizedMessagesRequest
): Promise<CommentTranslatorAzureNormalTranslationExecutionResult> {
  const sessionDedupe =
    request.sessionStatus === "active"
      ? selectNewCommentTranslatorAzureNormalTranslationMessagesForSession({
          sessionReferenceId: request.sessionReferenceId,
          messages: request.messages
        })
      : {
          messages: request.messages,
          duplicateSkippedCount: 0
        };
  const batchTextDedupe =
    request.sessionStatus === "active"
      ? selectFirstCommentTranslatorAzureNormalTranslationMessagePerNormalizedText({
          messages: sessionDedupe.messages,
          targetLanguage: request.targetLanguage,
          sourceLanguages: request.sourceLanguages
        })
      : {
          messages: sessionDedupe.messages,
          duplicateTextSkippedCount: 0
        };
  const languagePolicySkippedMessageReferenceIds = createLanguagePolicySkippedMessageReferenceIds({
    eligibleMessages: batchTextDedupe.messages.filter(isTranslationEligibleMessage),
    targetLanguage: request.targetLanguage,
    sourceLanguages: request.sourceLanguages
  });
  const baseFeed = createCommentTranslatorRealCommentsFeedStateFromNormalizedMessages({
    messages: batchTextDedupe.messages,
    sessionStatus: request.sessionStatus,
    targetLanguage: request.targetLanguage
  });
  const eligibleMessages = batchTextDedupe.messages.filter(isTranslationEligibleMessage);
  const nonTranslatableEventCount = Math.max(0, batchTextDedupe.messages.length - eligibleMessages.length);
  const eligibility = createEligibilitySummary({
    eligibleCommentCount: eligibleMessages.length,
    nonTranslatableEventCount,
    sessionDuplicateSkippedCount: sessionDedupe.duplicateSkippedCount,
    duplicateTextSkippedCount: batchTextDedupe.duplicateTextSkippedCount
  });

  if (request.sessionStatus !== "active") {
    const execution = createSkippedExecutionResult({
      skippedCount: eligibleMessages.length,
      providerUnavailableSkippedCount: 0
    });

    return await persistFeedBridgeResult({
      request,
      result: createExecutionResult({
        status: "session-not-active",
        execution,
        eligibility,
        feed: baseFeed
      })
    });
  }

  const providerExecutionCache =
    request.cache ??
    (request.sessionStatus === "active"
      ? getCommentTranslatorAzureNormalTranslationSessionDedupeState(request.sessionReferenceId).providerExecutionCache
      : createInMemoryCommentTranslatorProviderExecutionCache());
  const providerCandidateCacheState = createProviderCandidateCacheState({
    eligibleMessages,
    targetLanguage: request.targetLanguage,
    sourceLanguages: request.sourceLanguages,
    cache: providerExecutionCache
  });
  const providerCallPolicy = resolveCommentTranslatorFreeBetaProviderCallPolicy({
    usage: request.usage
  });
  if (
    providerCallPolicy.status !== "allowed" &&
    !canServeCacheOnlyTranslationsWhenProviderCallPolicyBlocks({
      providerCallPolicy,
      providerCandidateCacheState
    })
  ) {
    const execution = createSkippedExecutionResult({
      skippedCount: eligibleMessages.length,
      providerUnavailableSkippedCount: 0
    });

    return await persistFeedBridgeResult({
      request,
      result: createExecutionResult({
        status: "over-limit",
        execution,
        eligibility,
        feed: createCommentTranslatorRealCommentsFeedStateFromUsageLimitRows({
          feed: baseFeed,
          eligibleMessages,
          languagePolicySkippedMessageReferenceIds
        })
      })
    });
  }

  const preProviderQuotaPolicy = resolvePreProviderQuotaPolicy({
    usage: request.usage,
    cacheMissCandidateMessages: providerCandidateCacheState.cacheMissCandidateMessages
  });
  if (preProviderQuotaPolicy.status !== "allowed") {
    const execution = createSkippedExecutionResult({
      skippedCount: eligibleMessages.length,
      providerUnavailableSkippedCount: 0,
      perMinuteCapSkippedCount: preProviderQuotaPolicy.stopReason === "translated-message-cap" ? eligibleMessages.length : 0
    });

    return await persistFeedBridgeResult({
      request,
      result: createExecutionResult({
        status: "over-limit",
        execution,
        eligibility,
        feed: createCommentTranslatorRealCommentsFeedStateFromUsageLimitRows({
          feed: baseFeed,
          eligibleMessages,
          languagePolicySkippedMessageReferenceIds
        })
      })
    });
  }

  const providers = request.providers ?? createCommentTranslatorDefaultTranslationProviderSet();
  const comments = eligibleMessages.map(mapNormalizedMessageToProviderSafeComment);
  const execution = await executeCommentTranslatorProviderPolicyBatch({
    providers,
    cache: providerExecutionCache,
    callerAuthorization: request.callerAuthorization,
    sessionReferenceId: request.sessionReferenceId,
    occurredAtMs: request.occurredAtMs,
    usage: request.usage,
    targetLanguage: request.targetLanguage,
    sourceLanguages: request.sourceLanguages,
    maxBatchSize: request.maxBatchSize,
    maxProviderAttemptsPerComment: request.maxProviderAttemptsPerComment,
    comments
  });
  const providerUnavailable =
    execution.providerCallCount === 0 &&
    execution.translatedCount === 0 &&
    eligibleMessages.length > 0 &&
    execution.skipsByReason.providerUnavailable >= eligibleMessages.length;
  const durableUsageWrite = await recordDurableUsageHandoffEstimate({
    request,
    execution
  });
  if (durableUsageWrite === "durable-counter-fail-closed") {
    return await persistFeedBridgeResult({
      request,
      result: createExecutionResult({
        status: "usage-ledger-unavailable",
        execution,
        eligibility,
        durableUsageWrite,
        feed: createUnavailableCommentTranslatorRealCommentsFeedState({
          reason: "durable-usage-ledger-unavailable"
        })
      })
    });
  }

  return await persistFeedBridgeResult({
    request,
    result: createExecutionResult({
      status: providerUnavailable ? "provider-unavailable" : "completed",
      execution,
      eligibility,
      durableUsageWrite,
      feed: createCommentTranslatorRealCommentsFeedStateFromTranslatedRows({
        feed: baseFeed,
        execution,
        eligibleMessages,
        languagePolicySkippedMessageReferenceIds
      })
    })
  });
}

async function persistFeedBridgeResult({
  request,
  result
}: {
  request: ExecuteCommentTranslatorAzureNormalTranslationForNormalizedMessagesRequest;
  result: Omit<CommentTranslatorAzureNormalTranslationExecutionResult, "feedPersistence">;
}) {
  const feed =
    request.sessionStatus === "active"
      ? mergeCommentTranslatorAzureNormalTranslationFeedRowsForSession({
          sessionReferenceId: request.sessionReferenceId,
          feed: result.feed
        })
      : result.feed;
  const feedWithDiagnostics = attachCommentTranslatorLiveProviderDiagnosticsToFeed({
    feed,
    diagnostics: createLiveProviderDiagnosticsForFeed({
      result,
      persistedFeedRowCount: feed.rows.length
    })
  });
  const feedPersistence = await persistCommentTranslatorRealCommentsFeedForActiveSession({
    callerAuthorization: request.callerAuthorization,
    sessionReferenceId: request.sessionReferenceId,
    feed: feedWithDiagnostics,
    recordedAtMs: request.occurredAtMs,
    durableFeedStore: request.feedPersistenceStore
  });

  return {
    ...result,
    feed: feedWithDiagnostics,
    feedPersistence
  };
}

function createLiveProviderDiagnosticsForFeed({
  result,
  persistedFeedRowCount
}: {
  result: Omit<CommentTranslatorAzureNormalTranslationExecutionResult, "feedPersistence">;
  persistedFeedRowCount: number;
}): CommentTranslatorLiveProviderDiagnostics {
  const languagePolicySkippedCount = result.execution.skipsByReason.languagePolicy;
  const usageLimitSkippedCount = result.status === "over-limit" ? result.execution.skippedCount : 0;
  const providerUnavailableSkippedCount = result.status === "provider-unavailable"
    ? result.execution.skipsByReason.providerUnavailable
    : 0;
  const skipReasonCounts: CommentTranslatorLiveProviderDiagnostics["skipReasonCounts"] = [
    ...(languagePolicySkippedCount > 0 ? [{ reason: "language-policy" as const, count: languagePolicySkippedCount }] : []),
    ...(usageLimitSkippedCount > 0 ? [{ reason: "usage-limit" as const, count: usageLimitSkippedCount }] : []),
    ...(providerUnavailableSkippedCount > 0
      ? [{ reason: "provider-unavailable" as const, count: providerUnavailableSkippedCount }]
      : [])
  ];

  return {
    pollTickStatus: "polled",
    returnedCount:
      result.eligibility.eligibleCommentCount +
      result.eligibility.nonTranslatableEventCount +
      result.eligibility.sessionDuplicateSkippedCount +
      result.eligibility.duplicateTextSkippedCount,
    acceptedCount: result.eligibility.eligibleCommentCount,
    skippedCount:
      result.execution.skippedCount +
      result.eligibility.nonTranslatableEventCount +
      result.eligibility.sessionDuplicateSkippedCount +
      result.eligibility.duplicateTextSkippedCount,
    preStartSkippedCount: 0,
    skipReasonCounts,
    providerCallCount: result.execution.providerCallCount,
    cacheHitCount: result.execution.cacheHitCount,
    cacheMissCount: result.execution.cacheMissCount,
    duplicateTextCacheHitCount: result.execution.cacheHitCount,
    duplicateTextSkippedCount: result.eligibility.duplicateTextSkippedCount,
    languagePolicySkippedCount,
    translatedCount: result.execution.translatedCount,
    persistedFeedRowCount,
    nextPollDue: "waiting",
    stopReason: null,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design"
  };
}

function createCommentTranslatorRealCommentsFeedStateFromUsageLimitRows({
  feed,
  eligibleMessages,
  languagePolicySkippedMessageReferenceIds
}: {
  feed: CommentTranslatorRealCommentsFeedState;
  eligibleMessages: readonly CommentTranslatorNormalizedLiveMessage[];
  languagePolicySkippedMessageReferenceIds: ReadonlySet<string>;
}): CommentTranslatorRealCommentsFeedState {
  const eligibleMessageReferenceIds = new Set(eligibleMessages.map((message) => message.messageReferenceId));
  const rows = feed.rows
    .filter((row) => !languagePolicySkippedMessageReferenceIds.has(row.messageReferenceId))
    .map((row) => {
      if (!eligibleMessageReferenceIds.has(row.messageReferenceId)) {
        return withTranslation(row, null, "skipped-f10-non-translatable");
      }

      return withTranslation(row, null, "skipped-f12-usage-limit");
    });

  return replaceCommentTranslatorRealCommentsFeedRows({ feed, rows });
}

export function createCommentTranslatorRealCommentsFeedStateFromTranslatedRows({
  feed,
  execution,
  eligibleMessages,
  languagePolicySkippedMessageReferenceIds = new Set()
}: {
  feed: CommentTranslatorRealCommentsFeedState;
  execution: CommentTranslatorProviderExecutionResult;
  eligibleMessages: readonly CommentTranslatorNormalizedLiveMessage[];
  languagePolicySkippedMessageReferenceIds?: ReadonlySet<string>;
}): CommentTranslatorRealCommentsFeedState {
  const translationByMessageReferenceId = new Map(
    execution.translations.map((translation) => [readMessageReferenceIdFromProviderRequestId(translation.commentReferenceId), translation])
  );
  const eligibleMessageReferenceIds = new Set(eligibleMessages.map((message) => message.messageReferenceId));
  const providerUnavailable =
    execution.providerCallCount === 0 &&
    execution.translatedCount === 0 &&
    eligibleMessageReferenceIds.size > 0 &&
    execution.skipsByReason.providerUnavailable >= eligibleMessageReferenceIds.size;
  const providerErrorStatus = resolveProviderErrorStatus(execution);

  const rows = feed.rows
    .filter((row) => !languagePolicySkippedMessageReferenceIds.has(row.messageReferenceId))
    .map((row) => {
      if (!eligibleMessageReferenceIds.has(row.messageReferenceId)) {
        return withTranslation(row, null, "skipped-f10-non-translatable");
      }

      const translation = translationByMessageReferenceId.get(row.messageReferenceId);
      if (translation) {
        return withTranslation(row, translation.translatedText, "translated-f10", translation.cacheOutcome);
      }

      if (providerUnavailable) {
        return withTranslation(row, null, "provider-unavailable-f10");
      }

      if (providerErrorStatus) {
        return withTranslation(row, null, providerErrorStatus);
      }

      return withTranslation(row, null, "skipped-f10-language-policy");
    });

  return replaceCommentTranslatorRealCommentsFeedRows({ feed, rows });
}

function createLanguagePolicySkippedMessageReferenceIds({
  eligibleMessages,
  targetLanguage,
  sourceLanguages
}: {
  eligibleMessages: readonly CommentTranslatorNormalizedLiveMessage[];
  targetLanguage: CommentTranslatorTargetLanguageId;
  sourceLanguages?: readonly string[];
}): ReadonlySet<string> {
  if (eligibleMessages.length === 0) {
    return new Set();
  }

  const comments = eligibleMessages.map(mapNormalizedMessageToProviderSafeComment);
  const bridge = createYouTubeLiveCommentTranslatorPipelineRequestsForComments({
    comments,
    targetLanguage,
    sourceLanguages
  });
  if (bridge.status !== "ready-for-translator-pipeline") {
    return new Set(eligibleMessages.map((message) => message.messageReferenceId));
  }

  const acceptedMessageReferenceIds = new Set(
    bridge.providerRequests.map((providerRequest) => readMessageReferenceIdFromProviderRequestId(providerRequest.requestId))
  );
  return new Set(
    eligibleMessages
      .map((message) => message.messageReferenceId)
      .filter((messageReferenceId) => !acceptedMessageReferenceIds.has(messageReferenceId))
  );
}

function isTranslationEligibleMessage(message: CommentTranslatorNormalizedLiveMessage) {
  return (
    (message.kind === "text" || message.kind === "super-chat" || message.kind === "member") &&
    message.moderation.visibility === "visible" &&
    Boolean(message.text?.trim())
  );
}

function mapNormalizedMessageToProviderSafeComment(message: CommentTranslatorNormalizedLiveMessage): YouTubeProviderSafeCommentPayload {
  return {
    commentId: message.messageReferenceId,
    publishedAt: message.publishedAtIso,
    text: message.text?.trim() ?? "",
    platformLanguageHint: null
  };
}

function createExecutionResult({
  status,
  execution,
  eligibility,
  durableUsageWrite = "not-run-local-deterministic-handoff-only",
  feed
}: {
  status: CommentTranslatorAzureNormalTranslationExecutionResult["status"];
  execution: CommentTranslatorProviderExecutionResult;
  eligibility: CommentTranslatorAzureNormalTranslationEligibilitySummary;
  durableUsageWrite?: CommentTranslatorAzureNormalTranslationUsageHandoffEstimate["durableUsageWrite"];
  feed: CommentTranslatorRealCommentsFeedState;
}): Omit<CommentTranslatorAzureNormalTranslationExecutionResult, "feedPersistence"> {
  return {
    status,
    implementationStage: commentTranslatorAzureNormalTranslationExecutionContract.implementationStage,
    execution,
    eligibility,
    usageHandoffEstimate: createUsageHandoffEstimate(execution, durableUsageWrite),
    feed,
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    providerTargetMetadata: "forbidden",
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    publicLaunchAllowed: false
  };
}

function createEligibilitySummary({
  eligibleCommentCount,
  nonTranslatableEventCount,
  sessionDuplicateSkippedCount,
  duplicateTextSkippedCount
}: {
  eligibleCommentCount: number;
  nonTranslatableEventCount: number;
  sessionDuplicateSkippedCount: number;
  duplicateTextSkippedCount: number;
}): CommentTranslatorAzureNormalTranslationEligibilitySummary {
  return {
    eligibleCommentCount,
    nonTranslatableEventCount,
    sessionDuplicateSkippedCount,
    duplicateTextSkippedCount,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    authorChannelMaterial: "not-returned-by-design"
  };
}

export function clearCommentTranslatorAzureNormalTranslationSessionDedupeState(
  sessionReferenceId: string | null | undefined
) {
  if (!sessionReferenceId) {
    return;
  }

  sessionDedupeStateBySessionReference.delete(sessionReferenceId);
}

export function resetCommentTranslatorAzureNormalTranslationSessionDedupeStateForTests() {
  sessionDedupeStateBySessionReference.clear();
}

function selectFirstCommentTranslatorAzureNormalTranslationMessagePerNormalizedText({
  messages,
  targetLanguage,
  sourceLanguages
}: {
  messages: readonly CommentTranslatorNormalizedLiveMessage[];
  targetLanguage: CommentTranslatorTargetLanguageId;
  sourceLanguages?: readonly string[];
}) {
  const seenNormalizedTextKeys = new Set<string>();
  const selectedMessages: CommentTranslatorNormalizedLiveMessage[] = [];
  let duplicateTextSkippedCount = 0;

  for (const message of messages) {
    if (!isTranslationEligibleMessage(message)) {
      selectedMessages.push(message);
      continue;
    }

    const normalizedTextKey = createServerOnlyNormalizedTextBatchDedupeKey({
      text: message.text ?? "",
      targetLanguage,
      sourceLanguages
    });
    if (seenNormalizedTextKeys.has(normalizedTextKey)) {
      duplicateTextSkippedCount += 1;
      continue;
    }

    seenNormalizedTextKeys.add(normalizedTextKey);
    selectedMessages.push(message);
  }

  return {
    messages: selectedMessages,
    duplicateTextSkippedCount
  };
}

function createServerOnlyNormalizedTextBatchDedupeKey({
  text,
  targetLanguage,
  sourceLanguages
}: {
  text: string;
  targetLanguage: CommentTranslatorTargetLanguageId;
  sourceLanguages?: readonly string[];
}) {
  const normalizedText = normalizeCommentTranslatorTextForPolicyDedupe(text);
  const normalizedSources = (sourceLanguages ?? []).map((language) => language.trim().toLocaleLowerCase()).sort().join(",");
  return [normalizedText, targetLanguage.trim().toLocaleLowerCase(), normalizedSources].join("\u0000");
}

function selectNewCommentTranslatorAzureNormalTranslationMessagesForSession({
  sessionReferenceId,
  messages
}: {
  sessionReferenceId: string;
  messages: readonly CommentTranslatorNormalizedLiveMessage[];
}) {
  const state = getCommentTranslatorAzureNormalTranslationSessionDedupeState(sessionReferenceId);
  const messagesForProviderAndFeed: CommentTranslatorNormalizedLiveMessage[] = [];
  let duplicateSkippedCount = 0;

  for (const message of messages) {
    const commentId = message.messageReferenceId.trim();
    if (!commentId) {
      continue;
    }

    if (state.processedCommentIds.has(commentId)) {
      duplicateSkippedCount += 1;
      continue;
    }

    state.processedCommentIds.add(commentId);
    messagesForProviderAndFeed.push(message);
  }

  return {
    messages: messagesForProviderAndFeed,
    duplicateSkippedCount
  };
}

function mergeCommentTranslatorAzureNormalTranslationFeedRowsForSession({
  sessionReferenceId,
  feed
}: {
  sessionReferenceId: string;
  feed: CommentTranslatorRealCommentsFeedState;
}): CommentTranslatorRealCommentsFeedState {
  if (feed.status !== "ready") {
    return feed;
  }

  const state = getCommentTranslatorAzureNormalTranslationSessionDedupeState(sessionReferenceId);
  for (const row of feed.rows) {
    state.feedRowsByCommentId.set(row.messageReferenceId, row);
  }

  return replaceCommentTranslatorRealCommentsFeedRows({
    feed,
    rows: Array.from(state.feedRowsByCommentId.values())
  });
}

function replaceCommentTranslatorRealCommentsFeedRows({
  feed,
  rows
}: {
  feed: CommentTranslatorRealCommentsFeedState;
  rows: readonly CommentTranslatorRealCommentsDisplayRow[];
}): CommentTranslatorRealCommentsFeedState {
  return {
    ...feed,
    rows,
    sanitizedSummary: {
      ...feed.sanitizedSummary,
      displayRowCount: rows.length
    }
  };
}

function getCommentTranslatorAzureNormalTranslationSessionDedupeState(
  sessionReferenceId: string
): CommentTranslatorAzureNormalTranslationSessionDedupeState {
  const existing = sessionDedupeStateBySessionReference.get(sessionReferenceId);
  if (existing) {
    return existing;
  }

  const state: CommentTranslatorAzureNormalTranslationSessionDedupeState = {
    processedCommentIds: new Set(),
    feedRowsByCommentId: new Map(),
    providerExecutionCache: createInMemoryCommentTranslatorProviderExecutionCache()
  };
  sessionDedupeStateBySessionReference.set(sessionReferenceId, state);
  return state;
}

function createUsageHandoffEstimate(
  execution: CommentTranslatorProviderExecutionResult,
  durableUsageWrite: CommentTranslatorAzureNormalTranslationUsageHandoffEstimate["durableUsageWrite"]
): CommentTranslatorAzureNormalTranslationUsageHandoffEstimate {
  const providerExecutedTranslations = filterProviderExecutedTranslations(execution.translations);
  return {
    providerRequestEstimateCount: execution.providerCallCount,
    translatedMessageEstimate: providerExecutedTranslations.length,
    providerInputCharacterEstimate: providerExecutedTranslations.reduce(
      (total, translation) => total + translation.providerInputCharacterEstimate,
      0
    ),
    translatedCharacterEstimate: providerExecutedTranslations.reduce(
      (total, translation) => total + translation.translatedCharacterEstimate,
      0
    ),
    estimatedCostMicros: providerExecutedTranslations.reduce((total, translation) => total + translation.estimatedCostMicros, 0),
    durableUsageWrite,
    rawCommentText: "never-recorded-by-design",
    providerTargetMetadata: "forbidden"
  };
}

async function recordDurableUsageHandoffEstimate({
  request,
  execution
}: {
  request: ExecuteCommentTranslatorAzureNormalTranslationForNormalizedMessagesRequest;
  execution: CommentTranslatorProviderExecutionResult;
}): Promise<CommentTranslatorAzureNormalTranslationUsageHandoffEstimate["durableUsageWrite"]> {
  const durableUsageCounterStore = request.durableUsageCounterStore;
  if (!durableUsageCounterStore) {
    return "not-run-local-deterministic-handoff-only";
  }

  const events = createDurableUsageHandoffEvents({
    request,
    execution
  });
  if (events.length === 0) {
    return "not-run-no-usage-estimate";
  }

  for (const event of events) {
    const write = await recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
      callerAuthorization: request.callerAuthorization,
      durableUsageCounterStore,
      event
    });
    if (write.status === "fail-closed") {
      return "durable-counter-fail-closed";
    }
  }

  return "durable-counter-persisted";
}

function createDurableUsageHandoffEvents({
  request,
  execution
}: {
  request: ExecuteCommentTranslatorAzureNormalTranslationForNormalizedMessagesRequest;
  execution: CommentTranslatorProviderExecutionResult;
}): CommentTranslatorUsageLedgerEvent[] {
  const events: CommentTranslatorUsageLedgerEvent[] = [];
  const providerExecutedTranslations = filterProviderExecutedTranslations(execution.translations);

  if (execution.providerCallCount > 0) {
    events.push({
      type: "provider-request-estimated",
      provider: "youtube",
      sessionReferenceId: request.sessionReferenceId,
      occurredAtMs: request.occurredAtMs,
      requestEstimateCount: execution.providerCallCount,
      quotaUnitEstimate: execution.providerCallCount,
      providerTargetMetadata: "forbidden"
    });
  }

  if (providerExecutedTranslations.length > 0) {
    events.push({
      type: "ai-usage-estimated",
      provider: "youtube",
      sessionReferenceId: request.sessionReferenceId,
      occurredAtMs: request.occurredAtMs,
      translatedMessageEstimate: providerExecutedTranslations.length,
      providerInputCharacterEstimate: providerExecutedTranslations.reduce(
        (total, translation) => total + translation.providerInputCharacterEstimate,
        0
      ),
      translatedCharacterEstimate: providerExecutedTranslations.reduce(
        (total, translation) => total + translation.translatedCharacterEstimate,
        0
      ),
      estimatedCostMicros: providerExecutedTranslations.reduce((total, translation) => total + translation.estimatedCostMicros, 0),
      rawCommentText: "never-recorded-by-design"
    });
  }

  return events;
}

function filterProviderExecutedTranslations(
  translations: CommentTranslatorProviderExecutionResult["translations"]
): CommentTranslatorProviderExecutionResult["translations"] {
  return translations.filter((translation) => translation.cacheOutcome !== "hit");
}

function createProviderCandidateCacheState({
  eligibleMessages,
  targetLanguage,
  sourceLanguages,
  cache
}: {
  eligibleMessages: readonly CommentTranslatorNormalizedLiveMessage[];
  targetLanguage: CommentTranslatorTargetLanguageId;
  sourceLanguages?: readonly string[];
  cache: CommentTranslatorProviderExecutionCache;
}) {
  const comments = eligibleMessages.map(mapNormalizedMessageToProviderSafeComment);
  const bridge = createYouTubeLiveCommentTranslatorPipelineRequestsForComments({
    comments,
    targetLanguage,
    sourceLanguages
  });
  if (bridge.status !== "ready-for-translator-pipeline") {
    return {
      providerCandidateCount: 0,
      cacheHitCandidateCount: 0,
      cacheMissCandidateMessages: []
    };
  }

  const messageByReferenceId = new Map(eligibleMessages.map((message) => [message.messageReferenceId, message]));
  const cacheMissCandidateMessages: CommentTranslatorNormalizedLiveMessage[] = [];
  let cacheHitCandidateCount = 0;

  for (const providerRequest of bridge.providerRequests) {
    const messageReferenceId = readMessageReferenceIdFromProviderRequestId(providerRequest.requestId);
    const message = messageByReferenceId.get(messageReferenceId);
    if (!message) {
      continue;
    }

    const lookupKey = providerRequest.cache.lookupKey;
    const cachedTranslation = lookupKey ? cache.read(lookupKey) : null;
    if (cachedTranslation) {
      cacheHitCandidateCount += 1;
      continue;
    }

    cacheMissCandidateMessages.push(message);
  }

  return {
    providerCandidateCount: bridge.providerRequests.length,
    cacheHitCandidateCount,
    cacheMissCandidateMessages
  };
}

function canServeCacheOnlyTranslationsWhenProviderCallPolicyBlocks({
  providerCallPolicy,
  providerCandidateCacheState
}: {
  providerCallPolicy: ReturnType<typeof resolveCommentTranslatorFreeBetaProviderCallPolicy>;
  providerCandidateCacheState: ReturnType<typeof createProviderCandidateCacheState>;
}) {
  return (
    providerCallPolicy.status === "blocked-over-limit" &&
    (providerCallPolicy.stopReason === "translated-message-cap" || providerCallPolicy.stopReason === "ai-budget-stop") &&
    providerCandidateCacheState.providerCandidateCount > 0 &&
    providerCandidateCacheState.cacheHitCandidateCount > 0 &&
    providerCandidateCacheState.cacheMissCandidateMessages.length === 0
  );
}

function resolvePreProviderQuotaPolicy({
  usage,
  cacheMissCandidateMessages
}: {
  usage: CommentTranslatorUsageLedgerSnapshot;
  cacheMissCandidateMessages: readonly CommentTranslatorNormalizedLiveMessage[];
}):
  | {
      status: "allowed";
      stopReason: null;
    }
  | {
      status: "blocked";
      stopReason: "translated-message-cap" | "ai-budget-stop";
    } {
  const entitlement = usage.planEntitlement;
  const providerCandidateMessages = cacheMissCandidateMessages;
  if (!entitlement || providerCandidateMessages.length === 0) {
    return {
      status: "allowed",
      stopReason: null
    };
  }

  const translatedMessagesInCurrentMinute = Math.max(0, usage.translatedMessagesInCurrentMinute);
  const translatedMessagesPerMinute = Math.max(0, entitlement.translatedMessagesPerMinute);
  if (translatedMessagesInCurrentMinute + providerCandidateMessages.length > translatedMessagesPerMinute) {
    return {
      status: "blocked",
      stopReason: "translated-message-cap"
    };
  }

  const monthlyProviderInputCharacterEstimate = Math.max(0, usage.monthlyProviderInputCharacterEstimate ?? 0);
  const monthlyProviderInputCharacterLimit = Math.max(0, entitlement.monthlyProviderInputCharacterLimit ?? 20_000);
  const pendingProviderInputCharacterEstimate = providerCandidateMessages.reduce(
    (total, message) => total + Array.from(message.text?.trim() ?? "").length,
    0
  );
  if (monthlyProviderInputCharacterEstimate + pendingProviderInputCharacterEstimate > monthlyProviderInputCharacterLimit) {
    return {
      status: "blocked",
      stopReason: "ai-budget-stop"
    };
  }

  return {
    status: "allowed",
    stopReason: null
  };
}

function withTranslation(
  row: CommentTranslatorRealCommentsDisplayRow,
  translatedText: string | null,
  translationStatus: CommentTranslatorRealCommentsTranslationStatus,
  translationCacheStatus: CommentTranslatorRealCommentsDisplayRow["translationCacheStatus"] = null
): CommentTranslatorRealCommentsDisplayRow {
  return {
    ...row,
    translatedText,
    translationStatus,
    translationCacheStatus
  };
}

function resolveProviderErrorStatus(
  execution: CommentTranslatorProviderExecutionResult
): Extract<CommentTranslatorRealCommentsTranslationStatus, "provider-error-f10-recoverable" | "provider-error-f10-terminal"> | null {
  if (execution.errorCounts.terminal > 0) {
    return "provider-error-f10-terminal";
  }

  if (execution.errorCounts.recoverable > 0) {
    return "provider-error-f10-recoverable";
  }

  return null;
}

function readMessageReferenceIdFromProviderRequestId(requestId: string) {
  return requestId.startsWith("youtube-live-comment:") ? requestId.slice("youtube-live-comment:".length) : requestId;
}

function createSkippedExecutionResult({
  skippedCount,
  providerUnavailableSkippedCount,
  perMinuteCapSkippedCount = 0
}: {
  skippedCount: number;
  providerUnavailableSkippedCount: number;
  perMinuteCapSkippedCount?: number;
}): CommentTranslatorProviderExecutionResult {
  return {
    implementationStage: "server-owned-translation-provider-execution-integration",
    providerRequestCount: 0,
    providerCallCount: 0,
    translatedCount: 0,
    skippedCount,
    cacheHitCount: 0,
    cacheMissCount: 0,
    retryCount: 0,
    skipsByReason: {
      languagePolicy: 0,
      perMinuteCap: perMinuteCapSkippedCount,
      providerUnavailable: providerUnavailableSkippedCount
    },
    errorCounts: {
      recoverable: 0,
      terminal: 0
    },
    usageRecorded: {
      providerRequestEstimate: false,
      aiUsageEstimate: false
    },
    providerRouting: {
      plan: "unresolved",
      primaryProvider: "none",
      fallbackProvider: "none",
      providerIdentifiers: "server-only-not-returned"
    },
    fallbackReasonCounts: {
      recoverablePrimaryError: 0
    },
    estimatedCostMicros: 0,
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    providerTargetMetadata: "forbidden",
    rawCommentText: "never-returned-by-design",
    status: "completed",
    batches: [],
    translations: []
  };
}
