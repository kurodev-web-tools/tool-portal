import "server-only";

import {
  readCommentTranslatorBoundedLiveChatPollingTick,
  seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession,
  type CommentTranslatorBoundedLiveChatPollingAdapter,
  type CommentTranslatorBoundedLiveChatPollingTickResult
} from "./comment-translator-bounded-live-chat-polling-wiring";
import {
  resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart,
  type CommentTranslatorServerOnlyLiveChatTargetLookupAdapter
} from "./comment-translator-server-only-live-chat-target-lookup";
import {
  executeCommentTranslatorAzureNormalTranslationForNormalizedMessages,
  type CommentTranslatorAzureNormalTranslationExecutionResult
} from "./comment-translator-azure-normal-translation-execution";
import type {
  CommentTranslatorDurableUsageCounterStoreFactoryResult
} from "./comment-translator-durable-usage-counter-store";
import { mapYouTubeProviderSafeCommentsToNormalizedLiveMessages } from "./comment-translator-live-message-normalization";
import { createCommentTranslatorFreeBetaUsageDisplay } from "./comment-translator-free-beta-usage-display";
import type {
  CommentTranslatorLiveProviderDiagnostics,
  CommentTranslatorRealCommentsFeedState,
  CommentTranslatorRealCommentsTranslationStatus
} from "./comment-translator-real-comments-feed-shared";
import type {
  CommentTranslatorActiveSessionRecord,
  CommentTranslatorSessionBrowserSafeState
} from "./comment-translator-session-runtime";
import type { CommentTranslatorUsageLedgerSnapshot } from "./comment-translator-usage-ledger-runtime";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { YouTubeOAuthCredentialTranslatorStartReadiness } from "./comment-translator-youtube-disconnect-runtime";
import type { CommentTranslatorTargetLanguageId } from "./comment-translator";

export type CommentTranslatorLiveProviderSessionStepResult = {
  pollingTick: CommentTranslatorBoundedLiveChatPollingTickResult;
  translationStatus:
    | "not-run"
    | "completed"
    | "provider-unavailable"
    | "session-not-active"
    | "over-limit"
    | "usage-ledger-unavailable";
  translatedCount: number;
  persistedFeedRowCount: number;
  diagnostics: CommentTranslatorLiveProviderDiagnostics;
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
};

type CommentTranslatorLiveProviderTranslationDiagnostics = Pick<
  CommentTranslatorLiveProviderDiagnostics,
  | "providerCallCount"
  | "cacheHitCount"
  | "cacheMissCount"
  | "duplicateTextCacheHitCount"
  | "duplicateTextSkippedCount"
  | "languagePolicySkippedCount"
>;

export async function runCommentTranslatorLiveProviderSessionStep({
  activeSession,
  usage,
  callerAuthorization,
  credentialReadiness,
  targetLookupAdapter,
  pollingAdapter,
  durableUsageCounterStore,
  nowMs,
  targetLanguage,
  sourceLanguages
}: {
  activeSession: CommentTranslatorActiveSessionRecord | null;
  usage: CommentTranslatorUsageLedgerSnapshot;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness;
  targetLookupAdapter: CommentTranslatorServerOnlyLiveChatTargetLookupAdapter;
  pollingAdapter: CommentTranslatorBoundedLiveChatPollingAdapter;
  durableUsageCounterStore?: CommentTranslatorDurableUsageCounterStoreFactoryResult;
  nowMs: number;
  targetLanguage: CommentTranslatorTargetLanguageId;
  sourceLanguages?: readonly string[];
}): Promise<CommentTranslatorLiveProviderSessionStepResult> {
  let pollingTick = await readCommentTranslatorBoundedLiveChatPollingTick({
    intent: "heartbeat",
    activeSession,
    usage,
    adapter: pollingAdapter,
    nowMs
  });

  if (pollingTick.status === "unavailable-missing-server-only-polling-state" && activeSession) {
    const target = await resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
      intent: "start",
      credentialReadiness,
      adapter: targetLookupAdapter
    });
    seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
      state: createActiveSeedState({ activeSession, usage }),
      liveChatTargetReadiness: target,
      nowMs
    });
    pollingTick = await readCommentTranslatorBoundedLiveChatPollingTick({
      intent: "heartbeat",
      activeSession,
      usage,
      adapter: pollingAdapter,
      nowMs
    });
  }

  if (!("serverOnlyCommentsForTranslation" in pollingTick) || pollingTick.serverOnlyCommentsForTranslation.length === 0) {
    return createResult({
      pollingTick,
      translationStatus: "not-run",
      translatedCount: 0,
      persistedFeedRowCount: 0
    });
  }

  const normalizedMessages = mapYouTubeProviderSafeCommentsToNormalizedLiveMessages(
    pollingTick.serverOnlyCommentsForTranslation
  );
  if (!activeSession || normalizedMessages.length === 0) {
    return createResult({
      pollingTick,
      translationStatus: "not-run",
      translatedCount: 0,
      persistedFeedRowCount: 0
    });
  }

  const translation = await executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
    messages: normalizedMessages,
    sessionStatus: "active",
    targetLanguage,
    sourceLanguages,
    callerAuthorization,
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: nowMs,
    usage,
    durableUsageCounterStore
  });

  return createResult({
    pollingTick,
    translationStatus: translation.status,
    translatedCount: translation.execution.translatedCount,
    persistedFeedRowCount: translation.feedPersistence.displayRowCount,
    feed: translation.feed,
    translationDiagnostics: createTranslationDiagnostics(translation)
  });
}

function createActiveSeedState({
  activeSession,
  usage
}: {
  activeSession: CommentTranslatorActiveSessionRecord;
  usage: CommentTranslatorUsageLedgerSnapshot;
}): CommentTranslatorSessionBrowserSafeState {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - activeSession.startedAtMs) / 1000));
  return {
    status: "active",
    provider: "youtube",
    plan: usage.planEntitlement.plan,
    sessionReferenceId: activeSession.sessionReferenceId,
    credentialReferenceId: activeSession.credentialReferenceId ?? null,
    startedAtIso: new Date(activeSession.startedAtMs).toISOString(),
    stoppedAtIso: null,
    elapsedSeconds,
    remainingSessionSeconds: Math.max(0, Math.floor((usage.planEntitlement.sessionLimitMs - elapsedSeconds * 1000) / 1000)),
    remainingDailySeconds: Math.max(0, Math.floor((usage.planEntitlement.dailyLimitMs - usage.dailyUsedMs) / 1000)),
    heartbeat: {
      required: true,
      timeoutSeconds: 45,
      lastHeartbeatAtIso: new Date(activeSession.lastHeartbeatAtMs).toISOString()
    },
    stopReason: null,
    reasonUx: null,
    usageDisplay: createCommentTranslatorFreeBetaUsageDisplay({
      usage,
      elapsedMs: elapsedSeconds * 1000
    }),
    nextAction: "send-heartbeat-or-stop",
    providerApiUsage: "allowed-after-explicit-start-not-run-in-task-7",
    aiTranslationUsage: "allowed-after-explicit-start-not-run-in-task-7",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

function createResult({
  pollingTick,
  translationStatus,
  translatedCount,
  persistedFeedRowCount,
  feed,
  translationDiagnostics
}: {
  pollingTick: CommentTranslatorBoundedLiveChatPollingTickResult;
  translationStatus: CommentTranslatorLiveProviderSessionStepResult["translationStatus"];
  translatedCount: number;
  persistedFeedRowCount: number;
  feed?: CommentTranslatorRealCommentsFeedState;
  translationDiagnostics?: CommentTranslatorLiveProviderTranslationDiagnostics;
}): CommentTranslatorLiveProviderSessionStepResult {
  return {
    pollingTick,
    translationStatus,
    translatedCount,
    persistedFeedRowCount,
    diagnostics: createLiveProviderDiagnostics({
      pollingTick,
      translatedCount,
      persistedFeedRowCount,
      feed,
      translationStatus,
      translationDiagnostics: translationDiagnostics ?? createEmptyTranslationDiagnostics()
    }),
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

function createLiveProviderDiagnostics({
  pollingTick,
  translatedCount,
  persistedFeedRowCount,
  feed,
  translationStatus,
  translationDiagnostics
}: {
  pollingTick: CommentTranslatorBoundedLiveChatPollingTickResult;
  translatedCount: number;
  persistedFeedRowCount: number;
  feed?: CommentTranslatorRealCommentsFeedState;
  translationStatus: CommentTranslatorLiveProviderSessionStepResult["translationStatus"];
  translationDiagnostics: CommentTranslatorLiveProviderTranslationDiagnostics;
}): CommentTranslatorLiveProviderDiagnostics {
  const polling = "sanitizedPolling" in pollingTick ? pollingTick.sanitizedPolling : null;
  const skipReasonCounts = [
    ...(polling?.skipReasonCounts ?? []),
    ...createTranslationSkipReasonCounts({ feed, translationStatus })
  ];

  return {
    pollTickStatus: polling?.pollTickStatus ?? resolveFallbackPollTickStatus(pollingTick),
    returnedCount: polling?.returnedCount ?? 0,
    acceptedCount: polling?.acceptedCount ?? 0,
    skippedCount:
      (polling?.skippedCount ?? 0) +
      skipReasonCounts.reduce((total, item) => total + item.count, 0) -
      (polling?.skipReasonCounts ?? []).reduce((total, item) => total + item.count, 0) +
      translationDiagnostics.duplicateTextSkippedCount,
    preStartSkippedCount: polling?.preStartSkippedCount ?? 0,
    skipReasonCounts,
    providerCallCount: translationDiagnostics.providerCallCount,
    cacheHitCount: translationDiagnostics.cacheHitCount,
    cacheMissCount: translationDiagnostics.cacheMissCount,
    duplicateTextCacheHitCount: translationDiagnostics.duplicateTextCacheHitCount,
    duplicateTextSkippedCount: translationDiagnostics.duplicateTextSkippedCount,
    languagePolicySkippedCount: translationDiagnostics.languagePolicySkippedCount,
    translatedCount,
    persistedFeedRowCount,
    nextPollDue: polling?.nextPollDue ?? "waiting",
    stopReason: polling?.stopReason ?? ("providerSignal" in pollingTick ? pollingTick.providerSignal : null),
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design"
  };
}

function createTranslationDiagnostics(
  translation: CommentTranslatorAzureNormalTranslationExecutionResult
): CommentTranslatorLiveProviderTranslationDiagnostics {
  return {
    providerCallCount: translation.execution.providerCallCount,
    cacheHitCount: translation.execution.cacheHitCount,
    cacheMissCount: translation.execution.cacheMissCount,
    duplicateTextCacheHitCount: translation.execution.cacheHitCount,
    duplicateTextSkippedCount: translation.eligibility.duplicateTextSkippedCount,
    languagePolicySkippedCount: translation.execution.skipsByReason.languagePolicy
  };
}

function createEmptyTranslationDiagnostics(): CommentTranslatorLiveProviderTranslationDiagnostics {
  return {
    providerCallCount: 0,
    cacheHitCount: 0,
    cacheMissCount: 0,
    duplicateTextCacheHitCount: 0,
    duplicateTextSkippedCount: 0,
    languagePolicySkippedCount: 0
  };
}

function resolveFallbackPollTickStatus(
  pollingTick: CommentTranslatorBoundedLiveChatPollingTickResult
): CommentTranslatorLiveProviderDiagnostics["pollTickStatus"] {
  if (pollingTick.status === "unavailable-missing-server-only-polling-state") {
    return "missing-state";
  }

  if (pollingTick.status === "unavailable-polling-runtime-not-approved") {
    return "terminal";
  }

  if (pollingTick.status.startsWith("skipped-")) {
    return "not-due";
  }

  return "terminal";
}

function createTranslationSkipReasonCounts({
  feed,
  translationStatus
}: {
  feed?: CommentTranslatorRealCommentsFeedState;
  translationStatus: CommentTranslatorLiveProviderSessionStepResult["translationStatus"];
}): CommentTranslatorLiveProviderDiagnostics["skipReasonCounts"] {
  if (!feed || feed.status !== "ready") {
    return [];
  }

  const languagePolicyCount = countRowsByTranslationStatus(feed, "skipped-f10-language-policy");
  const usageLimitCount = countRowsByTranslationStatus(feed, "skipped-f12-usage-limit");
  const providerUnavailableCount =
    translationStatus === "provider-unavailable"
      ? countRowsByTranslationStatus(feed, "provider-unavailable-f10")
      : 0;
  const counts: {
    reason: "language-policy" | "usage-limit" | "provider-unavailable";
    count: number;
  }[] = [];
  if (languagePolicyCount > 0) {
    counts.push({ reason: "language-policy", count: languagePolicyCount });
  }
  if (usageLimitCount > 0) {
    counts.push({ reason: "usage-limit", count: usageLimitCount });
  }
  if (providerUnavailableCount > 0) {
    counts.push({ reason: "provider-unavailable", count: providerUnavailableCount });
  }
  return counts;
}

function countRowsByTranslationStatus(
  feed: CommentTranslatorRealCommentsFeedState,
  translationStatus: CommentTranslatorRealCommentsTranslationStatus
) {
  return feed.rows.filter((row) => row.translationStatus === translationStatus).length;
}
