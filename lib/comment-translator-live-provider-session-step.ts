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
import { executeCommentTranslatorAzureNormalTranslationForNormalizedMessages } from "./comment-translator-azure-normal-translation-execution";
import { mapYouTubeProviderSafeCommentsToNormalizedLiveMessages } from "./comment-translator-live-message-normalization";
import { createCommentTranslatorFreeBetaUsageDisplay } from "./comment-translator-free-beta-usage-display";
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
  translationStatus: "not-run" | "completed" | "provider-unavailable" | "session-not-active" | "over-limit";
  translatedCount: number;
  persistedFeedRowCount: number;
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
};

export async function runCommentTranslatorLiveProviderSessionStep({
  activeSession,
  usage,
  callerAuthorization,
  credentialReadiness,
  targetLookupAdapter,
  pollingAdapter,
  nowMs,
  targetLanguage
}: {
  activeSession: CommentTranslatorActiveSessionRecord | null;
  usage: CommentTranslatorUsageLedgerSnapshot;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness;
  targetLookupAdapter: CommentTranslatorServerOnlyLiveChatTargetLookupAdapter;
  pollingAdapter: CommentTranslatorBoundedLiveChatPollingAdapter;
  nowMs: number;
  targetLanguage: CommentTranslatorTargetLanguageId;
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
    callerAuthorization,
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: nowMs,
    usage
  });

  return createResult({
    pollingTick,
    translationStatus: translation.status,
    translatedCount: translation.execution.translatedCount,
    persistedFeedRowCount: translation.feedPersistence.displayRowCount
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
  persistedFeedRowCount
}: {
  pollingTick: CommentTranslatorBoundedLiveChatPollingTickResult;
  translationStatus: CommentTranslatorLiveProviderSessionStepResult["translationStatus"];
  translatedCount: number;
  persistedFeedRowCount: number;
}): CommentTranslatorLiveProviderSessionStepResult {
  return {
    pollingTick,
    translationStatus,
    translatedCount,
    persistedFeedRowCount,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}
