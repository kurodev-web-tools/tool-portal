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
  createCommentTranslatorRealCommentsFeedStateFromNormalizedMessages
} from "./comment-translator-real-comments-ui-wiring";
import {
  persistCommentTranslatorRealCommentsFeedForActiveSession,
  type CommentTranslatorRealCommentsFeedSessionBridgePersistResult
} from "./comment-translator-real-comments-feed-session-bridge";
import type {
  CommentTranslatorRealCommentsFeedDurableStoreFactoryResult
} from "./comment-translator-real-comments-feed-durable-store";
import {
  resolveCommentTranslatorFreeBetaProviderCallPolicy
} from "./comment-translator-free-beta-usage-display";
import type {
  CommentTranslatorRealCommentsDisplayRow,
  CommentTranslatorRealCommentsFeedState,
  CommentTranslatorRealCommentsTranslationStatus
} from "./comment-translator-real-comments-feed-shared";
import type { CommentTranslatorNormalizedLiveMessage } from "./comment-translator-live-message-normalization";
import type { CommentTranslatorSessionBrowserSafeState } from "./comment-translator-session-runtime";
import type { CommentTranslatorUsageLedgerSnapshot } from "./comment-translator-usage-ledger-runtime";
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
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  authorChannelMaterial: "not-returned-by-design";
};

export type CommentTranslatorAzureNormalTranslationUsageHandoffEstimate = {
  providerRequestEstimateCount: number;
  translatedMessageEstimate: number;
  translatedCharacterEstimate: number;
  estimatedCostMicros: number;
  durableUsageWrite: "not-run-local-deterministic-handoff-only";
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
  maxBatchSize?: number;
  maxProviderAttemptsPerComment?: number;
};

export type CommentTranslatorAzureNormalTranslationExecutionResult = {
  status: "completed" | "provider-unavailable" | "session-not-active" | "over-limit";
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
  const baseFeed = createCommentTranslatorRealCommentsFeedStateFromNormalizedMessages({
    messages: sessionDedupe.messages,
    sessionStatus: request.sessionStatus,
    targetLanguage: request.targetLanguage
  });
  const eligibleMessages = sessionDedupe.messages.filter(isTranslationEligibleMessage);
  const nonTranslatableEventCount = Math.max(0, sessionDedupe.messages.length - eligibleMessages.length);
  const eligibility = createEligibilitySummary({
    eligibleCommentCount: eligibleMessages.length,
    nonTranslatableEventCount,
    sessionDuplicateSkippedCount: sessionDedupe.duplicateSkippedCount
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

  const providerCallPolicy = resolveCommentTranslatorFreeBetaProviderCallPolicy({
    usage: request.usage
  });
  if (providerCallPolicy.status !== "allowed") {
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
          eligibleMessages
        })
      })
    });
  }

  const providers = request.providers ?? createCommentTranslatorDefaultTranslationProviderSet();
  const comments = eligibleMessages.map(mapNormalizedMessageToProviderSafeComment);
  const execution = await executeCommentTranslatorProviderPolicyBatch({
    providers,
    cache:
      request.cache ??
      (request.sessionStatus === "active"
        ? getCommentTranslatorAzureNormalTranslationSessionDedupeState(request.sessionReferenceId).providerExecutionCache
        : createInMemoryCommentTranslatorProviderExecutionCache()),
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

  return await persistFeedBridgeResult({
    request,
    result: createExecutionResult({
      status: providerUnavailable ? "provider-unavailable" : "completed",
      execution,
      eligibility,
      feed: createCommentTranslatorRealCommentsFeedStateFromTranslatedRows({
        feed: baseFeed,
        execution,
        eligibleMessages
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
  const feedPersistence = await persistCommentTranslatorRealCommentsFeedForActiveSession({
    callerAuthorization: request.callerAuthorization,
    sessionReferenceId: request.sessionReferenceId,
    feed,
    recordedAtMs: request.occurredAtMs,
    durableFeedStore: request.feedPersistenceStore
  });

  return {
    ...result,
    feed,
    feedPersistence
  };
}

function createCommentTranslatorRealCommentsFeedStateFromUsageLimitRows({
  feed,
  eligibleMessages
}: {
  feed: CommentTranslatorRealCommentsFeedState;
  eligibleMessages: readonly CommentTranslatorNormalizedLiveMessage[];
}): CommentTranslatorRealCommentsFeedState {
  const eligibleMessageReferenceIds = new Set(eligibleMessages.map((message) => message.messageReferenceId));

  return {
    ...feed,
    rows: feed.rows.map((row) => {
      if (!eligibleMessageReferenceIds.has(row.messageReferenceId)) {
        return withTranslation(row, null, "skipped-f10-non-translatable");
      }

      return withTranslation(row, null, "skipped-f12-usage-limit");
    })
  };
}

export function createCommentTranslatorRealCommentsFeedStateFromTranslatedRows({
  feed,
  execution,
  eligibleMessages
}: {
  feed: CommentTranslatorRealCommentsFeedState;
  execution: CommentTranslatorProviderExecutionResult;
  eligibleMessages: readonly CommentTranslatorNormalizedLiveMessage[];
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

  return {
    ...feed,
    rows: feed.rows.map((row) => {
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
    })
  };
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
  feed
}: {
  status: CommentTranslatorAzureNormalTranslationExecutionResult["status"];
  execution: CommentTranslatorProviderExecutionResult;
  eligibility: CommentTranslatorAzureNormalTranslationEligibilitySummary;
  feed: CommentTranslatorRealCommentsFeedState;
}): Omit<CommentTranslatorAzureNormalTranslationExecutionResult, "feedPersistence"> {
  return {
    status,
    implementationStage: commentTranslatorAzureNormalTranslationExecutionContract.implementationStage,
    execution,
    eligibility,
    usageHandoffEstimate: createUsageHandoffEstimate(execution),
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
  sessionDuplicateSkippedCount
}: {
  eligibleCommentCount: number;
  nonTranslatableEventCount: number;
  sessionDuplicateSkippedCount: number;
}): CommentTranslatorAzureNormalTranslationEligibilitySummary {
  return {
    eligibleCommentCount,
    nonTranslatableEventCount,
    sessionDuplicateSkippedCount,
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
  execution: CommentTranslatorProviderExecutionResult
): CommentTranslatorAzureNormalTranslationUsageHandoffEstimate {
  return {
    providerRequestEstimateCount: execution.providerCallCount,
    translatedMessageEstimate: execution.translatedCount,
    translatedCharacterEstimate: execution.translations.reduce(
      (total, translation) => total + Array.from(translation.translatedText).length,
      0
    ),
    estimatedCostMicros: execution.estimatedCostMicros,
    durableUsageWrite: "not-run-local-deterministic-handoff-only",
    rawCommentText: "never-recorded-by-design",
    providerTargetMetadata: "forbidden"
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
  providerUnavailableSkippedCount
}: {
  skippedCount: number;
  providerUnavailableSkippedCount: number;
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
      perMinuteCap: 0,
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
