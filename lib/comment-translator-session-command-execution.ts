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
  createCommentTranslatorPaidStopPersistenceFailure,
  persistCommentTranslatorDurableSessionStateOrFailClosed,
  stopCommentTranslatorActivePaidSessionForUnreadableAuthority,
  type CommentTranslatorDurableSessionStoreFactoryResult,
  type CommentTranslatorPaidStopPersistenceFailure
} from "./comment-translator-durable-session-store";
import {
  recordCommentTranslatorDurableSessionLedgerStateOrFailClosed,
  type CommentTranslatorDurableUsageCounterStoreFactoryResult
} from "./comment-translator-durable-usage-counter-store";
import { runCommentTranslatorLiveProviderSessionStep } from "./comment-translator-live-provider-session-step";
import {
  resolveCommentTranslatorPaidPollBudgetGate,
  resolveCommentTranslatorPaidStopNextResetAtIso,
  type CommentTranslatorPaidSessionAuthorityRead
} from "./comment-translator-public-entitlement-baseline";
import { createQuotaBudgetStopHandoff } from "./comment-translator-bounded-live-chat-polling-result-projection";
import type { CommentTranslatorPollingQuotaStopReason } from "./comment-translator-bounded-live-chat-polling-types";
import { createCommentTranslatorStoppedSessionState } from "./comment-translator-session-state";
import { assessCommentTranslatorUsageStopReason, normalizeCommentTranslatorActiveSession } from "./comment-translator-session-policy";
import type { CommentTranslatorRealCommentsFeedDurableStoreFactoryResult } from "./comment-translator-real-comments-feed-durable-store";
import type { CommentTranslatorRealCommentsFeedState } from "./comment-translator-real-comments-feed-shared";
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
  readonly paidSessionAuthority?: Extract<CommentTranslatorPaidSessionAuthorityRead, { status: "ready" }> | null;
  readonly durableFeedStore?: CommentTranslatorRealCommentsFeedDurableStoreFactoryResult;
  /** Server-only sink for the exact safe feed produced by this Worker step. */
  readonly onSafeFeed?: (feed: CommentTranslatorRealCommentsFeedState) => void;
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
): Promise<CommentTranslatorSessionBrowserSafeState | CommentTranslatorPaidStopPersistenceFailure> {
  if (input.intent === "status") {
    const state = await readCommentTranslatorReadOnlySessionStatus({
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
    if (input.plan !== "paid" || !input.activeSession || state.status !== "stopped") {
      return state;
    }
    const durablePersistResult = await persistCommentTranslatorDurableSessionStateOrFailClosed({
      callerAuthorization: input.callerAuthorization,
      durableSessionStore: input.durableSessionStore,
      state,
      planEntitlementReferenceId: input.usage.planEntitlement.planEntitlementReferenceId
    });
    if (durablePersistResult.status === "fail-closed") {
      return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: state.stopReason });
    }
    clearCommentTranslatorBoundedLiveChatPollingState(state.sessionReferenceId);
    clearCommentTranslatorAzureNormalTranslationSessionDedupeState(state.sessionReferenceId);
    persistInMemoryCommentTranslatorActiveSession({ callerAuthorization: input.callerAuthorization, state });
    return state;
  }
  let paidHeartbeatPersistedByDatabaseClock = false;
  let effectiveActiveSession = input.activeSession;
  let terminalPaidHeartbeatState: CommentTranslatorSessionBrowserSafeState | null = null;
  let missingPaidHeartbeat = false;
  if (input.plan === "paid" && input.intent === "heartbeat" && input.activeSession) {
    if (
      input.callerAuthorization.status !== "authorized"
      || input.durableSessionStore.status !== "ready"
      || !input.durableSessionStore.store.touchActivePaidSessionHeartbeat
    ) {
      return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: "paid-authority-unreadable" });
    }
    try {
      const heartbeatTouch = await input.durableSessionStore.store.touchActivePaidSessionHeartbeat({
        ownerUserId: input.callerAuthorization.ownerUserId,
        sessionReferenceId: input.activeSession.sessionReferenceId
      });
      if (heartbeatTouch.status === "expired" || heartbeatTouch.status === "missing-heartbeat") {
        missingPaidHeartbeat = heartbeatTouch.status === "missing-heartbeat";
        terminalPaidHeartbeatState = createCommentTranslatorStoppedSessionState({
          activeSession: normalizeCommentTranslatorActiveSession(input.activeSession),
          nowMs: input.nowMs,
          plan: "paid",
          usage: input.usage,
          reason: missingPaidHeartbeat ? "missing-heartbeat" : "session-time-limit",
          reasonUxCode: missingPaidHeartbeat ? "heartbeat-or-browser-disconnect" : "quota-or-budget-stop",
          nextAction: "session-stopped",
          credentialReferenceId: input.credentialReadiness.credentialReferenceId
        });
      } else {
        // The returned RPC statement_timestamp() is authoritative for this active Paid heartbeat.
        const authoritativeHeartbeatAtMs = Date.parse(heartbeatTouch.heartbeatAtIso);
        if (!Number.isFinite(authoritativeHeartbeatAtMs)) {
          return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: "paid-authority-unreadable" });
        }
        effectiveActiveSession = {
          ...input.activeSession,
          lastHeartbeatAtMs: authoritativeHeartbeatAtMs
        };
        paidHeartbeatPersistedByDatabaseClock = true;
      }
    } catch {
      return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: "paid-authority-unreadable" });
    }
  }
  let liveChatTargetReadiness;
  let providerSignal: CommentTranslatorSessionStopReason | null = null;
  let providerSignalReasonUxCode: CommentTranslatorStartStopReasonUxCode | null = null;
  let liveProviderRuntime: ReturnType<typeof createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter> | null = null;
  const isCappedHeartbeat = input.intent === "heartbeat" &&
    input.usage.translatedMessagesInCurrentMinute >= input.usage.planEntitlement.translatedMessagesPerMinute;
  const paidAuthorityUnavailable = input.plan === "paid" && input.intent !== "stop" && !input.paidSessionAuthority;
  let pollingTick;
  const preflightPaidStopReason = input.plan === "paid"
    ? assessCommentTranslatorUsageStopReason(input.usage, input.plan)
    : null;
  const preflightPaidNextResetAtIso = preflightPaidStopReason
    ? resolveCommentTranslatorPaidStopNextResetAtIso({
        reason: preflightPaidStopReason,
        paidSessionAuthority: input.paidSessionAuthority,
        nowMs: input.nowMs
      })
    : undefined;
  if (terminalPaidHeartbeatState) {
    // The trusted RPC identified the exact terminal active Paid row. Stop it
    // locally before constructing target or Provider runtime dependencies.
    pollingTick = createQuotaBudgetStopHandoff(missingPaidHeartbeat ? "missing-heartbeat" : "session-time-limit");
  } else if (paidAuthorityUnavailable) {
    // Paid authority failure is a local sanitized stop; do not construct a target lookup or call a Provider.
    pollingTick = createQuotaBudgetStopHandoff("global-budget-stop", nextUtcResetAtIso(input.nowMs));
  } else if (isCappedHeartbeat) {
    pollingTick = await readCommentTranslatorBoundedLiveChatPollingTick({
      intent: "heartbeat",
      activeSession: effectiveActiveSession,
      usage: input.usage,
      adapter: createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter({ reason: "polling-runtime-not-wired" }),
      nowMs: input.nowMs
    });
  } else if (preflightPaidStopReason && input.intent === "heartbeat") {
    pollingTick = createQuotaBudgetStopHandoff(
      mapSessionStopReasonToPollingQuota(preflightPaidStopReason),
      preflightPaidNextResetAtIso
    );
  } else if (input.plan === "paid" && input.intent === "start") {
    pollingTick = await readCommentTranslatorBoundedLiveChatPollingTick({
      intent: "start",
      activeSession: effectiveActiveSession,
      usage: input.usage,
      adapter: createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter({ reason: "polling-runtime-not-wired" }),
      nowMs: input.nowMs
    });
  } else {
    liveProviderRuntime = runtime.createLiveProviderRuntime({
      credentialReferenceId: input.credentialReferenceId,
      callerAuthorization: input.callerAuthorization
    });
    // Paid polling performs its budget authority check inside the live step before any target lookup.
    if (input.plan !== "paid" && input.intent !== "stop") {
      liveChatTargetReadiness = await runtime.resolveLiveChatTarget({
        intent: input.intent,
        credentialReadiness: input.credentialReadiness,
        adapter: liveProviderRuntime.targetLookupAdapter
      });
    }
    const pollingStep = input.intent === "heartbeat"
      ? await runCommentTranslatorLiveProviderSessionStep({
          activeSession: effectiveActiveSession,
          usage: input.usage,
          callerAuthorization: input.callerAuthorization,
          credentialReadiness: input.credentialReadiness,
          targetLookupAdapter: liveProviderRuntime.targetLookupAdapter,
          pollingAdapter: liveProviderRuntime.pollingAdapter,
          durableUsageCounterStore: input.durableUsageCounterStore,
          paidSessionAuthority: input.paidSessionAuthority,
          durableFeedStore: input.durableFeedStore,
          nowMs: input.nowMs,
          targetLanguage: input.targetLanguage,
          sourceLanguages: input.sourceLanguages
        })
      : null;
    pollingTick = pollingStep?.pollingTick ?? await readCommentTranslatorBoundedLiveChatPollingTick({
      intent: input.intent,
      activeSession: effectiveActiveSession,
      usage: input.usage,
      adapter: liveProviderRuntime.pollingAdapter,
      nowMs: input.nowMs
    });
    if (pollingStep?.safeFeed) input.onSafeFeed?.(pollingStep.safeFeed);
  }
  providerSignal = pollingTick.providerSignal;
  providerSignalReasonUxCode = "reasonUxCode" in pollingTick ? pollingTick.reasonUxCode : null;
  const nextResetAtIso = "nextResetAtIso" in pollingTick
    ? pollingTick.nextResetAtIso ?? preflightPaidNextResetAtIso ?? null
    : preflightPaidNextResetAtIso ?? null;
  const ratePauseResolution = runtime.readPhaseResolution({
    sessionReferenceId: effectiveActiveSession?.sessionReferenceId,
    usage: input.usage,
    nowMs: input.nowMs
  });
  let state = terminalPaidHeartbeatState ?? await readCommentTranslatorSessionCommand({
    intent: input.intent,
    nowMs: input.nowMs,
    plan: input.plan,
    callerAuthorization: input.callerAuthorization,
    credentialReadiness: input.credentialReadiness,
    activeSession: effectiveActiveSession,
    usage: input.usage,
    liveChatTargetReadiness,
    ratePauseResolution,
    browserConnected: input.browserConnected,
    stopReason: input.stopReason,
    providerSignal,
    providerSignalReasonUxCode,
    nextResetAtIso,
    createSessionReferenceId: () => `cts_${randomUUID()}`
  });
  let paidAtomicActiveStartPersistedByDatabaseClock = false;
  if (input.plan === "paid" && input.intent === "start" && state.status === "active") {
    const atomicStartResult = await startPaidSessionAndReservePollBudget({ input, state });
    if (atomicStartResult.status === "fail-closed") {
      return atomicStartResult;
    }
    paidAtomicActiveStartPersistedByDatabaseClock = true;
    state = atomicStartResult;
    if (state.status === "active") {
      liveProviderRuntime = runtime.createLiveProviderRuntime({
        credentialReferenceId: input.credentialReferenceId,
        callerAuthorization: input.callerAuthorization
      });
      try {
        liveChatTargetReadiness = await runtime.resolveLiveChatTarget({
          intent: "start",
          credentialReadiness: input.credentialReadiness,
          adapter: liveProviderRuntime.targetLookupAdapter
        });
        if (liveChatTargetReadiness.status === "unavailable") {
          state = createCommentTranslatorStoppedSessionState({
            activeSession: normalizeCommentTranslatorActiveSession(state),
            nowMs: input.nowMs,
            plan: "paid",
            usage: input.usage,
            reason: liveChatTargetReadiness.stopReason,
            reasonUxCode: liveChatTargetReadiness.reasonUxCode,
            nextAction: "session-stopped",
            credentialReferenceId: input.credentialReadiness.credentialReferenceId
          });
        }
      } catch {
        state = createCommentTranslatorStoppedSessionState({
          activeSession: normalizeCommentTranslatorActiveSession(state),
          nowMs: input.nowMs,
          plan: "paid",
          usage: input.usage,
          reason: "stream-unavailable",
          reasonUxCode: "live-target-unavailable",
          nextAction: "session-stopped",
          credentialReferenceId: input.credentialReadiness.credentialReferenceId
        });
      }
    }
  }
  if (!(
    state.status === "active"
    && (paidAtomicActiveStartPersistedByDatabaseClock || paidHeartbeatPersistedByDatabaseClock)
  )) {
    const durablePersistResult = await persistCommentTranslatorDurableSessionStateOrFailClosed({
      callerAuthorization: input.callerAuthorization,
      durableSessionStore: input.durableSessionStore,
      state,
      planEntitlementReferenceId: input.usage.planEntitlement.planEntitlementReferenceId
    });
    if (durablePersistResult.status === "fail-closed") {
      if (input.plan === "paid" && state.status === "stopped") {
        return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: state.stopReason });
      }
      return createCommentTranslatorDurableSessionFailClosedState({ nowMs: input.nowMs, plan: input.plan });
    }
  }
  if (missingPaidHeartbeat && state.status === "stopped") {
    clearCommentTranslatorBoundedLiveChatPollingState(state.sessionReferenceId);
    clearCommentTranslatorAzureNormalTranslationSessionDedupeState(state.sessionReferenceId);
    persistInMemoryCommentTranslatorActiveSession({ callerAuthorization: input.callerAuthorization, state });
    return state;
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
    if (input.plan === "paid" && state.status === "stopped") {
      clearCommentTranslatorBoundedLiveChatPollingState(state.sessionReferenceId);
      clearCommentTranslatorAzureNormalTranslationSessionDedupeState(state.sessionReferenceId);
      persistInMemoryCommentTranslatorActiveSession({ callerAuthorization: input.callerAuthorization, state });
      return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: state.stopReason });
    }
    if (
      input.plan === "paid"
      && (paidAtomicActiveStartPersistedByDatabaseClock || paidHeartbeatPersistedByDatabaseClock)
      && state.status === "active"
    ) {
      const activeSession = effectiveActiveSession
        ?? (state.status === "active" ? normalizeCommentTranslatorActiveSession(state) : null);
      if (!activeSession) {
        return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: "paid-authority-unreadable" });
      }
      const stoppedState = await stopCommentTranslatorActivePaidSessionForUnreadableAuthority({
        callerAuthorization: input.callerAuthorization,
        durableSessionStore: input.durableSessionStore,
        activeSession,
        nowMs: input.nowMs
      });
      if (stoppedState.status !== "stopped") {
        return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: "paid-authority-unreadable" });
      }
      clearCommentTranslatorBoundedLiveChatPollingState(stoppedState.sessionReferenceId);
      clearCommentTranslatorAzureNormalTranslationSessionDedupeState(stoppedState.sessionReferenceId);
      persistInMemoryCommentTranslatorActiveSession({ callerAuthorization: input.callerAuthorization, state: stoppedState });
      return stoppedState;
    }
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

async function startPaidSessionAndReservePollBudget({
  input,
  state
}: {
  input: CommentTranslatorSessionCommandExecutionInput;
  state: CommentTranslatorSessionBrowserSafeState;
}): Promise<CommentTranslatorSessionBrowserSafeState | CommentTranslatorPaidStopPersistenceFailure> {
  // The live heartbeat reader repeats this exact authority check at each UTC
  // boundary; a new bucket is created only after the reservation RPC succeeds.
  if (
    state.status !== "active"
    || !input.paidSessionAuthority
    || input.durableSessionStore.status !== "ready"
    || !input.durableSessionStore.store.startPaidSessionAndReservePollBudget
  ) {
    return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: "global-budget-stop" });
  }
  if (input.callerAuthorization.status !== "authorized") {
    return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: "auth-failed" });
  }
  const ownerUserId = input.callerAuthorization.ownerUserId;
  const paidRuntime = input.paidSessionAuthority.providerRuntime;
  let reservedPolls: number;
  try {
    reservedPolls = await input.durableSessionStore.store.startPaidSessionAndReservePollBudget({
      ownerUserId,
      state,
      planEntitlementReferenceId: input.usage.planEntitlement.planEntitlementReferenceId,
      dailyBudget: paidRuntime.dailyPollBudget,
      nowIso: new Date(input.nowMs).toISOString()
    });
  } catch {
    return createCommentTranslatorPaidStopPersistenceFailure({ stopReason: "global-budget-stop" });
  }
  try {
    if (reservedPolls <= 0 || reservedPolls > 720) {
      throw new Error("Paid poll budget reservation returned an invalid capacity.");
    }
    const budget = await paidRuntime.usageStore.readPollBudget({
      sessionReferenceId: state.sessionReferenceId,
      ownerUserId,
      nowIso: new Date(input.nowMs).toISOString()
    });
    if (
      budget.dailyBudget === null
      || budget.dailyBudget !== paidRuntime.dailyPollBudget
      || !budget.sessionReservationPresent
      || budget.sessionReservedPolls <= 0
    ) {
      throw new Error("Paid poll budget authority is unreadable after reservation.");
    }
    const gate = resolveCommentTranslatorPaidPollBudgetGate({
      dailyBudget: budget.dailyBudget,
      reservedPolls: budget.reservedPolls,
      isNewSession: true,
      nowMs: input.nowMs
    });
    if (gate.status === "stop-new-session") {
      throw new Error("Paid poll budget does not permit a new session.");
    }
    return state;
  } catch {
    return createPaidStartPostReservationStopState({ input, state });
  }
}

function createPaidStartPostReservationStopState({
  input,
  state
}: {
  input: CommentTranslatorSessionCommandExecutionInput;
  state: Extract<CommentTranslatorSessionBrowserSafeState, { status: "active" }>;
}): CommentTranslatorSessionBrowserSafeState {
  return createCommentTranslatorStoppedSessionState({
    activeSession: normalizeCommentTranslatorActiveSession(state),
    nowMs: input.nowMs,
    plan: "paid",
    usage: input.usage,
    reason: "global-budget-stop",
    reasonUxCode: "quota-or-budget-stop",
    nextAction: "wait-for-limit-reset",
    nextResetAtIso: nextUtcResetAtIso(input.nowMs),
    credentialReferenceId: state.credentialReferenceId ?? undefined
  });
}

function mapSessionStopReasonToPollingQuota(
  reason: CommentTranslatorSessionStopReason
): CommentTranslatorPollingQuotaStopReason {
  if (
    reason === "paid-authority-unreadable"
    || reason === "paid-character-quota-stop"
    || reason === "paid-individual-cost-stop"
    || reason === "paid-global-cost-stop"
  ) return reason;
  if (
    reason === "missing-heartbeat"
    || reason === "daily-time-limit"
    || reason === "session-time-limit"
    || reason === "translated-message-cap"
    || reason === "provider-quota-stop"
    || reason === "global-budget-stop"
    || reason === "ai-budget-stop"
    || reason === "translation-provider-limit"
  ) return reason;
  return "global-budget-stop";
}

function nextUtcResetAtIso(nowMs: number): string {
  const date = new Date(nowMs);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)).toISOString();
}
