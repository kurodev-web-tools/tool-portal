import "server-only";

import {
  readCommentTranslatorBoundedLiveChatPollingTick,
  seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession,
  type CommentTranslatorBoundedLiveChatPollingAdapter
} from "./comment-translator-bounded-live-chat-polling-wiring";
import {
  resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart,
  type CommentTranslatorServerOnlyLiveChatTargetLookupAdapter
} from "./comment-translator-server-only-live-chat-target-lookup";
import { executeCommentTranslatorAzureNormalTranslationForNormalizedMessages } from "./comment-translator-azure-normal-translation-execution";
import type { CommentTranslatorDurableUsageCounterStoreFactoryResult } from "./comment-translator-durable-usage-counter-store";
import { mapYouTubeProviderSafeCommentsToNormalizedLiveMessages } from "./comment-translator-live-message-normalization";
import { createCommentTranslatorFreeBetaUsageDisplay } from "./comment-translator-free-beta-usage-display";
import type { CommentTranslatorActiveSessionRecord, CommentTranslatorSessionBrowserSafeState } from "./comment-translator-session-runtime";
import type { CommentTranslatorUsageLedgerSnapshot } from "./comment-translator-usage-ledger-runtime";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { YouTubeOAuthCredentialTranslatorStartReadiness } from "./comment-translator-youtube-disconnect-runtime";
import type { CommentTranslatorTargetLanguageId } from "./comment-translator";
import { createCommentTranslatorPerMinuteRunningProjection } from "./comment-translator-per-minute-rate-pause";
import {
  createCommentTranslatorLiveProviderSessionStepResult,
  createCommentTranslatorLiveProviderTranslationDiagnostics,
  type CommentTranslatorLiveProviderSessionStepResult
} from "./comment-translator-live-provider-session-step-result";

export type { CommentTranslatorLiveProviderSessionStepResult } from "./comment-translator-live-provider-session-step-result";

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
  readonly activeSession: CommentTranslatorActiveSessionRecord | null;
  readonly usage: CommentTranslatorUsageLedgerSnapshot;
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness;
  readonly targetLookupAdapter: CommentTranslatorServerOnlyLiveChatTargetLookupAdapter;
  readonly pollingAdapter: CommentTranslatorBoundedLiveChatPollingAdapter;
  readonly durableUsageCounterStore?: CommentTranslatorDurableUsageCounterStoreFactoryResult;
  readonly nowMs: number;
  readonly targetLanguage: CommentTranslatorTargetLanguageId;
  readonly sourceLanguages?: readonly string[];
}): Promise<CommentTranslatorLiveProviderSessionStepResult> {
  let pollingTick = await readCommentTranslatorBoundedLiveChatPollingTick({ intent: "heartbeat", activeSession, usage, adapter: pollingAdapter, nowMs });
  const translatedMessagesPerMinute = usage.planEntitlement.translatedMessagesPerMinute;
  const hasPerMinuteCapacity = usage.translatedMessagesInCurrentMinute < translatedMessagesPerMinute;
  if (pollingTick.status === "unavailable-missing-server-only-polling-state" && activeSession && hasPerMinuteCapacity) {
    const target = await resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({ intent: "start", credentialReadiness, adapter: targetLookupAdapter });
    seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
      state: createActiveSeedState({ activeSession, usage, nowMs }),
      liveChatTargetReadiness: target,
      nowMs
    });
    pollingTick = await readCommentTranslatorBoundedLiveChatPollingTick({ intent: "heartbeat", activeSession, usage, adapter: pollingAdapter, nowMs });
  }
  if (!("serverOnlyCommentsForTranslation" in pollingTick) || pollingTick.serverOnlyCommentsForTranslation.length === 0) {
    return createCommentTranslatorLiveProviderSessionStepResult({ pollingTick, translationStatus: "not-run", translatedCount: 0, persistedFeedRowCount: 0 });
  }
  const normalizedMessages = mapYouTubeProviderSafeCommentsToNormalizedLiveMessages(pollingTick.serverOnlyCommentsForTranslation);
  if (!activeSession || normalizedMessages.length === 0) {
    return createCommentTranslatorLiveProviderSessionStepResult({ pollingTick, translationStatus: "not-run", translatedCount: 0, persistedFeedRowCount: 0 });
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
  return createCommentTranslatorLiveProviderSessionStepResult({
    pollingTick,
    translationStatus: translation.status,
    translatedCount: translation.execution.translatedCount,
    persistedFeedRowCount: translation.feedPersistence.displayRowCount,
    feed: translation.feed,
    translationDiagnostics: createCommentTranslatorLiveProviderTranslationDiagnostics(translation)
  });
}

function createActiveSeedState({
  activeSession,
  usage,
  nowMs
}: {
  readonly activeSession: CommentTranslatorActiveSessionRecord;
  readonly usage: CommentTranslatorUsageLedgerSnapshot;
  readonly nowMs: number;
}): CommentTranslatorSessionBrowserSafeState {
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - activeSession.startedAtMs) / 1000));
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
    heartbeat: { required: true, timeoutSeconds: 45, lastHeartbeatAtIso: new Date(activeSession.lastHeartbeatAtMs).toISOString() },
    stopReason: null,
    reasonUx: null,
    usageDisplay: createCommentTranslatorFreeBetaUsageDisplay({ usage, elapsedMs: elapsedSeconds * 1000 }),
    nextAction: "send-heartbeat-or-stop",
    providerApiUsage: "allowed-after-explicit-start-not-run-in-task-7",
    aiTranslationUsage: "allowed-after-explicit-start-not-run-in-task-7",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    ...createCommentTranslatorPerMinuteRunningProjection()
  };
}
