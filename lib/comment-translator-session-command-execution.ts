import "server-only";

import { randomUUID } from "node:crypto";
import { clearCommentTranslatorAzureNormalTranslationSessionDedupeState } from "./comment-translator-azure-normal-translation-execution";
import {
  clearCommentTranslatorBoundedLiveChatPollingState,
  createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter,
  readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage,
  readCommentTranslatorBoundedLiveChatPollingTick,
  seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession
} from "./comment-translator-bounded-live-chat-polling-wiring";
import {
  createCommentTranslatorDurableSessionFailClosedState,
  persistCommentTranslatorDurableSessionStateOrFailClosed,
  type CommentTranslatorDurableSessionStoreFactoryResult
} from "./comment-translator-durable-session-store";
import {
  recordCommentTranslatorDurableSessionLedgerStateOrFailClosed,
  type CommentTranslatorDurableUsageCounterStoreFactoryResult
} from "./comment-translator-durable-usage-counter-store";
import { runCommentTranslatorLiveProviderSessionStep } from "./comment-translator-live-provider-session-step";
import { resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart } from "./comment-translator-server-only-live-chat-target-lookup";
import {
  persistInMemoryCommentTranslatorActiveSession,
  readCommentTranslatorReadOnlySessionStatus,
  readCommentTranslatorSessionCommand,
  type CommentTranslatorActiveSessionRecord,
  type CommentTranslatorSessionBrowserSafeState,
  type CommentTranslatorSessionCommandIntent,
  type CommentTranslatorSessionPlan,
  type CommentTranslatorSessionStopReason
} from "./comment-translator-session-runtime";
import type { CommentTranslatorStartStopReasonUxCode } from "./comment-translator-start-stop-reason-ux";
import type { CommentTranslatorUsageLedgerSnapshot } from "./comment-translator-usage-ledger-runtime";
import { recordInMemoryCommentTranslatorSessionLedgerState } from "./comment-translator-usage-ledger-runtime";
import { createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter } from "./comment-translator-youtube-live-provider-runtime-adapter";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { YouTubeOAuthCredentialTranslatorStartReadiness } from "./comment-translator-youtube-disconnect-runtime";
import type { CommentTranslatorTargetLanguageId } from "./comment-translator";

type CommentTranslatorSessionCommandExecutionInputBase = {
  readonly nowMs: number;
  readonly plan: CommentTranslatorSessionPlan;
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly credentialReferenceId: string | null | undefined;
  readonly activeSession: CommentTranslatorActiveSessionRecord | null;
  readonly usage: CommentTranslatorUsageLedgerSnapshot;
  readonly durableSessionStore: CommentTranslatorDurableSessionStoreFactoryResult;
  readonly durableUsageCounterStore: CommentTranslatorDurableUsageCounterStoreFactoryResult;
  readonly browserConnected: boolean;
  readonly stopReason?: CommentTranslatorSessionStopReason;
  readonly targetLanguage: CommentTranslatorTargetLanguageId;
  readonly sourceLanguages?: readonly string[];
};

export type CommentTranslatorSessionCommandExecutionInput =
  CommentTranslatorSessionCommandExecutionInputBase & (
    | {
        readonly intent: "status";
        readonly credentialReadiness: null;
      }
    | {
        readonly intent: Exclude<CommentTranslatorSessionCommandIntent, "status">;
        readonly credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness;
      }
  );

export type CommentTranslatorSessionCommandExecutionRuntime = {
  readonly createLiveProviderRuntime: typeof createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter;
  readonly resolveLiveChatTarget: typeof resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart;
  readonly readPhaseResolution: typeof readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage;
};

export async function executeCommentTranslatorSessionCommand(
  input: CommentTranslatorSessionCommandExecutionInput,
  runtime: CommentTranslatorSessionCommandExecutionRuntime = {
    createLiveProviderRuntime: createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter,
    resolveLiveChatTarget: resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart,
    readPhaseResolution: readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage
  }
): Promise<CommentTranslatorSessionBrowserSafeState> {
  if (input.intent === "status") {
    return readCommentTranslatorReadOnlySessionStatus({
      activeSession: input.activeSession,
      nowMs: input.nowMs,
      plan: input.plan,
      browserConnected: input.browserConnected,
      callerAuthorization: input.callerAuthorization,
      usage: input.usage,
      ratePauseResolution: runtime.readPhaseResolution({
        sessionReferenceId: input.activeSession?.sessionReferenceId,
        usage: input.usage,
        nowMs: input.nowMs
      }),
      providerSignal: null,
      providerSignalReasonUxCode: null
    });
  }
  let liveChatTargetReadiness;
  let providerSignal: CommentTranslatorSessionStopReason | null = null;
  let providerSignalReasonUxCode: CommentTranslatorStartStopReasonUxCode | null = null;
  const isCappedHeartbeat = input.intent === "heartbeat" &&
    input.usage.translatedMessagesInCurrentMinute >= input.usage.planEntitlement.translatedMessagesPerMinute;
  let pollingTick;
  if (isCappedHeartbeat) {
    pollingTick = await readCommentTranslatorBoundedLiveChatPollingTick({
      intent: "heartbeat",
      activeSession: input.activeSession,
      usage: input.usage,
      adapter: createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter({ reason: "polling-runtime-not-wired" }),
      nowMs: input.nowMs
    });
  } else {
    const liveProviderRuntime = runtime.createLiveProviderRuntime({
      credentialReferenceId: input.credentialReferenceId,
      callerAuthorization: input.callerAuthorization
    });
    liveChatTargetReadiness = await runtime.resolveLiveChatTarget({
      intent: input.intent,
      credentialReadiness: input.credentialReadiness,
      adapter: liveProviderRuntime.targetLookupAdapter
    });
    const pollingStep = input.intent === "heartbeat"
      ? await runCommentTranslatorLiveProviderSessionStep({
          activeSession: input.activeSession,
          usage: input.usage,
          callerAuthorization: input.callerAuthorization,
          credentialReadiness: input.credentialReadiness,
          targetLookupAdapter: liveProviderRuntime.targetLookupAdapter,
          pollingAdapter: liveProviderRuntime.pollingAdapter,
          durableUsageCounterStore: input.durableUsageCounterStore,
          nowMs: input.nowMs,
          targetLanguage: input.targetLanguage,
          sourceLanguages: input.sourceLanguages
        })
      : null;
    pollingTick = pollingStep?.pollingTick ?? await readCommentTranslatorBoundedLiveChatPollingTick({
      intent: input.intent,
      activeSession: input.activeSession,
      usage: input.usage,
      adapter: liveProviderRuntime.pollingAdapter,
      nowMs: input.nowMs
    });
  }
  providerSignal = pollingTick.providerSignal;
  providerSignalReasonUxCode = "reasonUxCode" in pollingTick ? pollingTick.reasonUxCode : null;
  const ratePauseResolution = runtime.readPhaseResolution({
    sessionReferenceId: input.activeSession?.sessionReferenceId,
    usage: input.usage,
    nowMs: input.nowMs
  });
  const state = await readCommentTranslatorSessionCommand({
    intent: input.intent,
    nowMs: input.nowMs,
    plan: input.plan,
    callerAuthorization: input.callerAuthorization,
    credentialReadiness: input.credentialReadiness,
    activeSession: input.activeSession,
    usage: input.usage,
    liveChatTargetReadiness,
    ratePauseResolution,
    browserConnected: input.browserConnected,
    stopReason: input.stopReason,
    providerSignal,
    providerSignalReasonUxCode,
    createSessionReferenceId: () => `cts_${randomUUID()}`
  });
  const durablePersistResult = await persistCommentTranslatorDurableSessionStateOrFailClosed({
    callerAuthorization: input.callerAuthorization,
    durableSessionStore: input.durableSessionStore,
    state,
    planEntitlementReferenceId: input.usage.planEntitlement.planEntitlementReferenceId
  });
  if (durablePersistResult.status === "fail-closed") {
    return createCommentTranslatorDurableSessionFailClosedState({ nowMs: input.nowMs, plan: input.plan });
  }
  const durableUsagePersistResult = await recordCommentTranslatorDurableSessionLedgerStateOrFailClosed({
    callerAuthorization: input.callerAuthorization,
    durableUsageCounterStore: input.durableUsageCounterStore,
    intent: input.intent,
    state,
    occurredAtMs: input.nowMs,
    planEntitlement: input.usage.planEntitlement
  });
  if (durableUsagePersistResult.status === "fail-closed") {
    return createCommentTranslatorDurableSessionFailClosedState({ nowMs: input.nowMs, plan: input.plan });
  }
  if (state.status === "active" && input.intent === "start" && liveChatTargetReadiness) {
    seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
      state, liveChatTargetReadiness, nowMs: input.nowMs
    });
  }
  if (state.status === "stopped") {
    clearCommentTranslatorBoundedLiveChatPollingState(state.sessionReferenceId);
    clearCommentTranslatorAzureNormalTranslationSessionDedupeState(state.sessionReferenceId);
  }
  persistInMemoryCommentTranslatorActiveSession({ callerAuthorization: input.callerAuthorization, state });
  recordInMemoryCommentTranslatorSessionLedgerState({
    callerAuthorization: input.callerAuthorization,
    intent: input.intent,
    state,
    occurredAtMs: input.nowMs,
    planEntitlement: input.usage.planEntitlement
  });
  return state;
}
