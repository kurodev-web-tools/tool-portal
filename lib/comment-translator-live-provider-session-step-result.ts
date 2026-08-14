import "server-only";

import type { CommentTranslatorBoundedLiveChatPollingTickResult } from "./comment-translator-bounded-live-chat-polling-wiring";
import type { CommentTranslatorAzureNormalTranslationExecutionResult } from "./comment-translator-azure-normal-translation-execution";
import type {
  CommentTranslatorLiveProviderDiagnostics,
  CommentTranslatorRealCommentsFeedState,
  CommentTranslatorRealCommentsTranslationStatus
} from "./comment-translator-real-comments-feed-shared";

export type CommentTranslatorLiveProviderSessionStepResult = {
  readonly pollingTick: CommentTranslatorBoundedLiveChatPollingTickResult;
  readonly translationStatus: "not-run" | "completed" | "provider-unavailable" | "session-not-active" | "over-limit" | "usage-ledger-unavailable";
  readonly translatedCount: number;
  readonly persistedFeedRowCount: number;
  readonly diagnostics: CommentTranslatorLiveProviderDiagnostics;
  readonly safeFeed?: CommentTranslatorRealCommentsFeedState;
  readonly rawProviderPayload: "not-returned-by-design";
  readonly rawComments: "not-returned-by-design";
  readonly providerTargetMetadata: "forbidden";
};

export type CommentTranslatorLiveProviderTranslationDiagnostics = Pick<
  CommentTranslatorLiveProviderDiagnostics,
  "providerCallCount" | "cacheHitCount" | "cacheMissCount" | "duplicateTextCacheHitCount" | "duplicateTextSkippedCount" | "languagePolicySkippedCount"
>;

export function createCommentTranslatorLiveProviderSessionStepResult({
  pollingTick,
  translationStatus,
  translatedCount,
  persistedFeedRowCount,
  feed,
  translationDiagnostics
}: {
  readonly pollingTick: CommentTranslatorBoundedLiveChatPollingTickResult;
  readonly translationStatus: CommentTranslatorLiveProviderSessionStepResult["translationStatus"];
  readonly translatedCount: number;
  readonly persistedFeedRowCount: number;
  readonly feed?: CommentTranslatorRealCommentsFeedState;
  readonly translationDiagnostics?: CommentTranslatorLiveProviderTranslationDiagnostics;
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
    ...(feed ? { safeFeed: feed } : {}),
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

export function createCommentTranslatorLiveProviderTranslationDiagnostics(
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

function createLiveProviderDiagnostics({
  pollingTick,
  translatedCount,
  persistedFeedRowCount,
  feed,
  translationStatus,
  translationDiagnostics
}: {
  readonly pollingTick: CommentTranslatorBoundedLiveChatPollingTickResult;
  readonly translatedCount: number;
  readonly persistedFeedRowCount: number;
  readonly feed?: CommentTranslatorRealCommentsFeedState;
  readonly translationStatus: CommentTranslatorLiveProviderSessionStepResult["translationStatus"];
  readonly translationDiagnostics: CommentTranslatorLiveProviderTranslationDiagnostics;
}): CommentTranslatorLiveProviderDiagnostics {
  const polling = "sanitizedPolling" in pollingTick ? pollingTick.sanitizedPolling : null;
  const skipReasonCounts = [...(polling?.skipReasonCounts ?? []), ...createTranslationSkipReasonCounts({ feed, translationStatus })];
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
    nextResetAtIso: "nextResetAtIso" in pollingTick ? pollingTick.nextResetAtIso ?? null : null,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design"
  };
}

function createEmptyTranslationDiagnostics(): CommentTranslatorLiveProviderTranslationDiagnostics {
  return { providerCallCount: 0, cacheHitCount: 0, cacheMissCount: 0, duplicateTextCacheHitCount: 0, duplicateTextSkippedCount: 0, languagePolicySkippedCount: 0 };
}

function resolveFallbackPollTickStatus(
  pollingTick: CommentTranslatorBoundedLiveChatPollingTickResult
): CommentTranslatorLiveProviderDiagnostics["pollTickStatus"] {
  if (pollingTick.status === "unavailable-missing-server-only-polling-state") return "missing-state";
  if (pollingTick.status === "unavailable-polling-runtime-not-approved") return "terminal";
  if (pollingTick.status === "rate-limit-paused" || pollingTick.status === "stale-completion-discarded") return "not-due";
  if (pollingTick.status.startsWith("skipped-")) return "not-due";
  return "terminal";
}

function createTranslationSkipReasonCounts({
  feed,
  translationStatus
}: {
  readonly feed?: CommentTranslatorRealCommentsFeedState;
  readonly translationStatus: CommentTranslatorLiveProviderSessionStepResult["translationStatus"];
}): CommentTranslatorLiveProviderDiagnostics["skipReasonCounts"] {
  if (!feed || feed.status !== "ready") return [];
  const languagePolicyCount = countRowsByTranslationStatus(feed, "skipped-f10-language-policy");
  const usageLimitCount = countRowsByTranslationStatus(feed, "skipped-f12-usage-limit");
  const providerUnavailableCount = translationStatus === "provider-unavailable" ? countRowsByTranslationStatus(feed, "provider-unavailable-f10") : 0;
  const counts: { reason: "language-policy" | "usage-limit" | "provider-unavailable"; count: number }[] = [];
  if (languagePolicyCount > 0) counts.push({ reason: "language-policy", count: languagePolicyCount });
  if (usageLimitCount > 0) counts.push({ reason: "usage-limit", count: usageLimitCount });
  if (providerUnavailableCount > 0) counts.push({ reason: "provider-unavailable", count: providerUnavailableCount });
  return counts;
}

function countRowsByTranslationStatus(
  feed: CommentTranslatorRealCommentsFeedState,
  translationStatus: CommentTranslatorRealCommentsTranslationStatus
): number {
  return feed.rows.filter((row) => row.translationStatus === translationStatus).length;
}
