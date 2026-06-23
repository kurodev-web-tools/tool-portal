import "server-only";

import { type YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import { type YouTubeOAuthCredentialTranslatorStartReadiness } from "./comment-translator-youtube-disconnect-runtime";
import { type CommentTranslatorServerOnlyLiveChatTargetLookupResult } from "./comment-translator-server-only-live-chat-target-lookup";
import {
  createCommentTranslatorStartStopReasonUx,
  resolveCommentTranslatorCredentialReadinessReasonUxCode,
  resolveCommentTranslatorStopReasonUxCode,
  type CommentTranslatorStartStopReasonUx,
  type CommentTranslatorStartStopReasonUxCode
} from "./comment-translator-start-stop-reason-ux";
import {
  createCommentTranslatorFreeBetaUsageDisplay,
  type CommentTranslatorFreeBetaUsageDisplay
} from "./comment-translator-free-beta-usage-display";

export type CommentTranslatorSessionPlan = "free" | "paid";

export type CommentTranslatorSessionPlanEntitlement = {
  plan: CommentTranslatorSessionPlan;
  planEntitlementReferenceId: string;
  entitlementSource: "server-owned";
  dailyLimitMs: number;
  sessionLimitMs: number;
  translatedMessagesPerMinute: number;
  activeSessionsPerUser: number;
  monthlyTranslatedCharacterLimit?: number;
  paidPrioritization: "not-implemented";
  providerUsageCharging: "not-implemented";
};

export type CommentTranslatorSessionStopReason =
  | "user-stop"
  | "stream-ended"
  | "stream-unavailable"
  | "browser-disconnect"
  | "missing-heartbeat"
  | "auth-failed"
  | "token-refresh-failed"
  | "reconnect-required"
  | "daily-time-limit"
  | "session-time-limit"
  | "translated-message-cap"
  | "provider-quota-stop"
  | "global-budget-stop"
  | "ai-budget-stop"
  | "translation-provider-limit"
  | "session-limit"
  | "terminal-provider-error";

export type CommentTranslatorSessionUsageSnapshot = {
  dailyUsedMs: number;
  currentSessionElapsedMs?: number;
  translatedMessagesInCurrentMinute: number;
  monthlyTranslatedCharacterEstimate?: number;
  providerBudgetAvailable: boolean;
  globalBudgetAvailable: boolean;
  aiBudgetAvailable: boolean;
  translationProviderAvailable?: boolean;
  planEntitlement?: CommentTranslatorSessionPlanEntitlement;
};

export type CommentTranslatorActiveSessionRecord = {
  sessionReferenceId: string;
  startedAtMs: number;
  lastHeartbeatAtMs: number;
  credentialReferenceId?: string;
};

export type CommentTranslatorSessionCommandIntent = "status" | "start" | "stop" | "heartbeat";

export type CommentTranslatorSessionHeartbeatState = {
  required: true;
  timeoutSeconds: 45;
  lastHeartbeatAtIso: string | null;
};

export type CommentTranslatorSessionBrowserSafeState =
  | {
      status: "not-started";
      provider: "youtube";
      plan: CommentTranslatorSessionPlan;
      startedAtIso: null;
      stoppedAtIso: null;
      elapsedSeconds: 0;
      remainingSessionSeconds: number;
      remainingDailySeconds: number;
      heartbeat: CommentTranslatorSessionHeartbeatState;
      stopReason: null;
      reasonUx: null;
      usageDisplay: CommentTranslatorFreeBetaUsageDisplay;
      nextAction: "press-start";
      providerApiUsage: "not-started-before-explicit-start";
      aiTranslationUsage: "not-started-before-explicit-start";
      tokenValue: "never-returned-by-design";
      providerTargetMetadata: "forbidden";
    }
  | {
      status: "active";
      provider: "youtube";
      plan: CommentTranslatorSessionPlan;
      sessionReferenceId: string;
      credentialReferenceId: string | null;
      startedAtIso: string;
      stoppedAtIso: null;
      elapsedSeconds: number;
      remainingSessionSeconds: number;
      remainingDailySeconds: number;
      heartbeat: CommentTranslatorSessionHeartbeatState;
      stopReason: null;
      reasonUx: null;
      usageDisplay: CommentTranslatorFreeBetaUsageDisplay;
      nextAction: "send-heartbeat-or-stop";
      providerApiUsage: "allowed-after-explicit-start-not-run-in-task-7";
      aiTranslationUsage: "allowed-after-explicit-start-not-run-in-task-7";
      tokenValue: "never-returned-by-design";
      providerTargetMetadata: "forbidden";
    }
  | {
      status: "stopped";
      provider: "youtube";
      plan: CommentTranslatorSessionPlan;
      sessionReferenceId: string | null;
      credentialReferenceId: string | null;
      startedAtIso: string | null;
      stoppedAtIso: string;
      elapsedSeconds: number;
      remainingSessionSeconds: number;
      remainingDailySeconds: number;
      heartbeat: CommentTranslatorSessionHeartbeatState;
      stopReason: CommentTranslatorSessionStopReason;
      reasonUx: CommentTranslatorStartStopReasonUx;
      usageDisplay: CommentTranslatorFreeBetaUsageDisplay;
      nextAction: "session-stopped" | "reconnect-or-sign-in" | "wait-for-limit-reset";
      providerApiUsage: "stopped";
      aiTranslationUsage: "stopped";
      tokenValue: "never-returned-by-design";
      providerTargetMetadata: "forbidden";
      providerErrorBody: "never-returned-by-design";
    };

export type StartCommentTranslatorSessionRequest = {
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness;
  activeSession: CommentTranslatorActiveSessionRecord | null;
  usage: CommentTranslatorSessionUsageSnapshot;
  liveChatTargetReadiness?: CommentTranslatorServerOnlyLiveChatTargetLookupResult;
  createSessionReferenceId: () => string;
};

export type EvaluateCommentTranslatorSessionStopRequest = {
  activeSession: CommentTranslatorActiveSessionRecord | CommentTranslatorSessionBrowserSafeState | null;
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  browserConnected: boolean;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness;
  usage: CommentTranslatorSessionUsageSnapshot;
  providerSignal?: CommentTranslatorSessionStopReason | null;
  providerSignalReasonUxCode?: CommentTranslatorStartStopReasonUxCode | null;
};

export type StopCommentTranslatorSessionRequest = {
  activeSession: CommentTranslatorActiveSessionRecord | CommentTranslatorSessionBrowserSafeState | null;
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  usage?: CommentTranslatorSessionUsageSnapshot;
  reason: CommentTranslatorSessionStopReason;
  reasonUxCode?: CommentTranslatorStartStopReasonUxCode | null;
};

export type ReadCommentTranslatorSessionCommandRequest = StartCommentTranslatorSessionRequest & {
  intent: CommentTranslatorSessionCommandIntent;
  browserConnected?: boolean;
  stopReason?: CommentTranslatorSessionStopReason;
  providerSignal?: EvaluateCommentTranslatorSessionStopRequest["providerSignal"];
  providerSignalReasonUxCode?: CommentTranslatorStartStopReasonUxCode | null;
};

const secondsPerMinute = 60;
const freeLimitMs = 30 * secondsPerMinute * 1_000;
const heartbeatTimeoutMs = 45_000;
const freePlanEntitlementReferenceId = "comment-translator-free-public-v1";

export const commentTranslatorSessionRuntimeContract = {
  implementationStage: "server-owned-session-start-stop-contract",
  runtime: "server-only",
  route: "/api/comment-translator/session",
  serverActions: [
    "startCommentTranslatorSessionAction",
    "stopCommentTranslatorSessionAction",
    "heartbeatCommentTranslatorSessionAction"
  ],
  providerApiUsageBeforeExplicitStart: "not-started-before-explicit-start",
  aiUsageBeforeExplicitStart: "not-started-before-explicit-start",
  liveProviderExecution: "not-run-in-f7",
  providerTargetLookup: "start-only-server-boundary-f6",
  quotaWrite: "not-run-in-task-7",
  usageQuotaBudgetLedger: "server-owned-usage-quota-budget-ledger-foundation-in-task-8",
  durableSessionAuthority: "required-before-public-session-start",
  entitlementState: "server-owned-plan-entitlement-reference",
  billingEnforcement: "not-run-in-task-7",
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  freePlanLimits: {
    dailyMinutes: 30,
    sessionMinutes: 30,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyTranslatedCharacters: 20_000
  },
  heartbeatTimeoutSeconds: 45,
    stopReasons: [
    "user-stop",
    "stream-ended",
    "stream-unavailable",
    "browser-disconnect",
    "missing-heartbeat",
    "auth-failed",
    "token-refresh-failed",
    "reconnect-required",
    "daily-time-limit",
    "session-time-limit",
    "translated-message-cap",
    "provider-quota-stop",
    "global-budget-stop",
    "ai-budget-stop",
    "translation-provider-limit",
    "session-limit",
    "terminal-provider-error"
  ],
  reasonUx: "sanitized-browser-safe-reason-metadata-only",
  forbiddenBrowserOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "provider-error-body",
    "ciphertext-reference",
    "decrypt-capability"
  ]
} as const;

const activeSessionsByOwner = new Map<string, CommentTranslatorActiveSessionRecord>();

export function createCommentTranslatorNotStartedSessionState({
  nowMs,
  plan,
  dailyUsedMs = 0,
  usage
}: {
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  dailyUsedMs?: number;
  usage?: CommentTranslatorSessionUsageSnapshot;
}): CommentTranslatorSessionBrowserSafeState {
  void nowMs;
  const displayUsage =
    usage ??
    createDefaultCommentTranslatorUsageSnapshot({
      plan,
      dailyUsedMs
    });

  return {
    status: "not-started",
    provider: "youtube",
    plan,
    startedAtIso: null,
    stoppedAtIso: null,
    elapsedSeconds: 0,
    remainingSessionSeconds: sessionLimitSeconds(plan),
    remainingDailySeconds: remainingDailySeconds({ dailyUsedMs, elapsedMs: 0, plan }),
    heartbeat: createHeartbeatState(null),
    stopReason: null,
    reasonUx: null,
    usageDisplay: createCommentTranslatorFreeBetaUsageDisplay({
      usage: displayUsage,
      elapsedMs: 0
    }),
    nextAction: "press-start",
    providerApiUsage: "not-started-before-explicit-start",
    aiTranslationUsage: "not-started-before-explicit-start",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

export function startCommentTranslatorSession(
  request: StartCommentTranslatorSessionRequest
): CommentTranslatorSessionBrowserSafeState {
  if (request.callerAuthorization.status !== "authorized") {
    return createStoppedState({
      activeSession: null,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: "auth-failed",
      reasonUxCode: "auth-unavailable",
      nextAction: "reconnect-or-sign-in"
    });
  }

  if (request.credentialReadiness.status !== "ready") {
    return createStoppedState({
      activeSession: null,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: mapCredentialReadinessToStopReason(request.credentialReadiness),
      reasonUxCode: resolveCommentTranslatorCredentialReadinessReasonUxCode({
        reason: request.credentialReadiness.reason
      }),
      nextAction: "reconnect-or-sign-in",
      credentialReferenceId: request.credentialReadiness.credentialReferenceId
    });
  }

  const entitlement = resolveUsageEntitlement(request.usage, request.plan);

  if (request.activeSession && entitlement.activeSessionsPerUser <= 1) {
    return createStoppedState({
      activeSession: request.activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: "session-limit",
      reasonUxCode: "session-limit",
      nextAction: "session-stopped",
      credentialReferenceId: request.credentialReadiness.credentialReferenceId
    });
  }

  const usageStopReason = assessUsageStopReason(request.usage, request.plan);
  if (usageStopReason) {
    return createStoppedState({
      activeSession: null,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: usageStopReason,
      reasonUxCode: resolveCommentTranslatorStopReasonUxCode({ stopReason: usageStopReason }),
      nextAction: usageStopReason === "daily-time-limit" ? "wait-for-limit-reset" : "session-stopped",
      credentialReferenceId: request.credentialReadiness.credentialReferenceId
    });
  }

  if (request.liveChatTargetReadiness?.status === "unavailable") {
    return createStoppedState({
      activeSession: null,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: request.liveChatTargetReadiness.stopReason,
      reasonUxCode: request.liveChatTargetReadiness.reasonUxCode,
      nextAction: "session-stopped",
      credentialReferenceId: request.credentialReadiness.credentialReferenceId
    });
  }

  return createActiveState({
    activeSession: {
      sessionReferenceId: request.createSessionReferenceId(),
      startedAtMs: request.nowMs,
      lastHeartbeatAtMs: request.nowMs,
      credentialReferenceId: request.credentialReadiness.credentialReferenceId
    },
    nowMs: request.nowMs,
    plan: request.plan,
    usage: request.usage
  });
}

export function evaluateCommentTranslatorSessionStopCondition(
  request: EvaluateCommentTranslatorSessionStopRequest
): CommentTranslatorSessionBrowserSafeState {
  const activeSession = normalizeActiveSession(request.activeSession);

  if (!activeSession) {
    return createCommentTranslatorNotStartedSessionState({
      nowMs: request.nowMs,
      plan: request.plan,
      dailyUsedMs: request.usage.dailyUsedMs,
      usage: request.usage
    });
  }

  if (!request.browserConnected) {
    return stopCommentTranslatorSession({
      activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: "browser-disconnect",
      reasonUxCode: "heartbeat-or-browser-disconnect"
    });
  }

  if (request.callerAuthorization.status !== "authorized") {
    return stopCommentTranslatorSession({
      activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: "auth-failed",
      reasonUxCode: "auth-unavailable"
    });
  }

  if (request.credentialReadiness.status !== "ready") {
    return stopCommentTranslatorSession({
      activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: mapCredentialReadinessToStopReason(request.credentialReadiness),
      reasonUxCode: resolveCommentTranslatorCredentialReadinessReasonUxCode({
        reason: request.credentialReadiness.reason
      })
    });
  }

  if (isMissingHeartbeat(activeSession, request.nowMs)) {
    return stopCommentTranslatorSession({
      activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: "missing-heartbeat",
      reasonUxCode: "heartbeat-or-browser-disconnect"
    });
  }

  const activeElapsedMs = chargeableElapsedMs(activeSession, request.nowMs, request.plan, request.usage);
  if (activeElapsedMs >= sessionLimitMs(request.plan, request.usage)) {
    return stopCommentTranslatorSession({
      activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: "session-time-limit",
      reasonUxCode: "quota-or-budget-stop"
    });
  }

  const usageStopReason = assessUsageStopReason(request.usage, request.plan, activeElapsedMs);
  if (usageStopReason) {
    return stopCommentTranslatorSession({
      activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: usageStopReason,
      reasonUxCode: resolveCommentTranslatorStopReasonUxCode({ stopReason: usageStopReason })
    });
  }

  if (request.providerSignal) {
    return stopCommentTranslatorSession({
      activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: request.providerSignal,
      reasonUxCode: request.providerSignalReasonUxCode
    });
  }

  return createActiveState({
    activeSession,
    nowMs: request.nowMs,
    plan: request.plan,
    usage: request.usage
  });
}

export function stopCommentTranslatorSession(
  request: StopCommentTranslatorSessionRequest
): CommentTranslatorSessionBrowserSafeState {
  return createStoppedState({
    activeSession: normalizeActiveSession(request.activeSession),
    nowMs: request.nowMs,
    plan: request.plan,
    usage:
      request.usage ?? {
        dailyUsedMs: 0,
        translatedMessagesInCurrentMinute: 0,
        providerBudgetAvailable: true,
        globalBudgetAvailable: true,
        aiBudgetAvailable: true
      },
    reason: request.reason,
    reasonUxCode: request.reasonUxCode,
    nextAction: request.reason === "auth-failed" || request.reason === "reconnect-required" ? "reconnect-or-sign-in" : "session-stopped"
  });
}

export async function readCommentTranslatorSessionCommand(
  request: ReadCommentTranslatorSessionCommandRequest
): Promise<CommentTranslatorSessionBrowserSafeState> {
  if (request.intent === "start") {
    return startCommentTranslatorSession(request);
  }

  if (request.intent === "stop") {
    return stopCommentTranslatorSession({
      activeSession: request.activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: request.stopReason ?? "user-stop",
      reasonUxCode: request.stopReason ? resolveCommentTranslatorStopReasonUxCode({ stopReason: request.stopReason }) : "user-stop"
    });
  }

  if (request.intent === "heartbeat") {
    const activeSession = normalizeActiveSession(request.activeSession);
    if (!activeSession) {
      return createCommentTranslatorNotStartedSessionState({
        nowMs: request.nowMs,
        plan: request.plan,
        dailyUsedMs: request.usage.dailyUsedMs,
        usage: request.usage
      });
    }

    return evaluateCommentTranslatorSessionStopCondition({
      activeSession: {
        ...activeSession,
        lastHeartbeatAtMs: request.nowMs
      },
      nowMs: request.nowMs,
      plan: request.plan,
      browserConnected: request.browserConnected ?? true,
      callerAuthorization: request.callerAuthorization,
      credentialReadiness: request.credentialReadiness,
      usage: request.usage,
      providerSignal: request.providerSignal,
      providerSignalReasonUxCode: request.providerSignalReasonUxCode
    });
  }

  return evaluateCommentTranslatorSessionStopCondition({
    activeSession: request.activeSession,
    nowMs: request.nowMs,
    plan: request.plan,
    browserConnected: request.browserConnected ?? true,
    callerAuthorization: request.callerAuthorization,
    credentialReadiness: request.credentialReadiness,
    usage: request.usage,
    providerSignal: request.providerSignal,
    providerSignalReasonUxCode: request.providerSignalReasonUxCode
  });
}

export function readInMemoryCommentTranslatorActiveSession(
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization
): CommentTranslatorActiveSessionRecord | null {
  if (callerAuthorization.status !== "authorized") {
    return null;
  }

  return activeSessionsByOwner.get(callerAuthorization.ownerUserId) ?? null;
}

export function persistInMemoryCommentTranslatorActiveSession({
  callerAuthorization,
  state
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  state: CommentTranslatorSessionBrowserSafeState;
}) {
  if (callerAuthorization.status !== "authorized") {
    return;
  }

  if (state.status === "active") {
    activeSessionsByOwner.set(callerAuthorization.ownerUserId, {
      sessionReferenceId: state.sessionReferenceId,
      startedAtMs: Date.parse(state.startedAtIso),
      lastHeartbeatAtMs: state.heartbeat.lastHeartbeatAtIso ? Date.parse(state.heartbeat.lastHeartbeatAtIso) : Date.parse(state.startedAtIso),
      credentialReferenceId: state.credentialReferenceId ?? undefined
    });
    return;
  }

  if (state.status === "stopped") {
    activeSessionsByOwner.delete(callerAuthorization.ownerUserId);
  }
}

function createActiveState({
  activeSession,
  nowMs,
  plan,
  usage
}: {
  activeSession: CommentTranslatorActiveSessionRecord;
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  usage: CommentTranslatorSessionUsageSnapshot;
}): CommentTranslatorSessionBrowserSafeState {
  const elapsed = Math.max(0, elapsedMs(activeSession, nowMs));
  const entitlement = resolveUsageEntitlement(usage, plan);

  return {
    status: "active",
    provider: "youtube",
    plan,
    sessionReferenceId: activeSession.sessionReferenceId,
    credentialReferenceId: activeSession.credentialReferenceId ?? null,
    startedAtIso: new Date(activeSession.startedAtMs).toISOString(),
    stoppedAtIso: null,
    elapsedSeconds: Math.floor(elapsed / 1_000),
    remainingSessionSeconds: Math.max(0, Math.ceil((entitlement.sessionLimitMs - elapsed) / 1_000)),
    remainingDailySeconds: remainingDailySeconds({ dailyUsedMs: usage.dailyUsedMs, elapsedMs: elapsed, plan, entitlement }),
    heartbeat: createHeartbeatState(activeSession.lastHeartbeatAtMs),
    stopReason: null,
    reasonUx: null,
    usageDisplay: createCommentTranslatorFreeBetaUsageDisplay({
      usage,
      elapsedMs: elapsed
    }),
    nextAction: "send-heartbeat-or-stop",
    providerApiUsage: "allowed-after-explicit-start-not-run-in-task-7",
    aiTranslationUsage: "allowed-after-explicit-start-not-run-in-task-7",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

function createStoppedState({
  activeSession,
  nowMs,
  plan,
  usage,
  reason,
  reasonUxCode,
  nextAction,
  credentialReferenceId
}: {
  activeSession: CommentTranslatorActiveSessionRecord | null;
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  usage: CommentTranslatorSessionUsageSnapshot;
  reason: CommentTranslatorSessionStopReason;
  reasonUxCode?: CommentTranslatorStartStopReasonUxCode | null;
  nextAction: "session-stopped" | "reconnect-or-sign-in" | "wait-for-limit-reset";
  credentialReferenceId?: string;
}): CommentTranslatorSessionBrowserSafeState {
  const elapsed = activeSession ? Math.max(0, chargeableElapsedMs(activeSession, nowMs, plan, usage)) : 0;
  const entitlement = resolveUsageEntitlement(usage, plan);

  return {
    status: "stopped",
    provider: "youtube",
    plan,
    sessionReferenceId: activeSession?.sessionReferenceId ?? null,
    credentialReferenceId: activeSession?.credentialReferenceId ?? credentialReferenceId ?? null,
    startedAtIso: activeSession ? new Date(activeSession.startedAtMs).toISOString() : null,
    stoppedAtIso: new Date(nowMs).toISOString(),
    elapsedSeconds: Math.floor(elapsed / 1_000),
    remainingSessionSeconds: Math.max(0, Math.ceil((entitlement.sessionLimitMs - elapsed) / 1_000)),
    remainingDailySeconds: remainingDailySeconds({ dailyUsedMs: usage.dailyUsedMs, elapsedMs: elapsed, plan, entitlement }),
    heartbeat: createHeartbeatState(activeSession?.lastHeartbeatAtMs ?? null),
    stopReason: reason,
    reasonUx: createCommentTranslatorStartStopReasonUx(
      resolveCommentTranslatorStopReasonUxCode({
        stopReason: reason,
        reasonUxCode
      })
    ),
    usageDisplay: createCommentTranslatorFreeBetaUsageDisplay({
      usage,
      elapsedMs: elapsed
    }),
    nextAction,
    providerApiUsage: "stopped",
    aiTranslationUsage: "stopped",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    providerErrorBody: "never-returned-by-design"
  };
}

function assessUsageStopReason(
  usage: CommentTranslatorSessionUsageSnapshot,
  plan: CommentTranslatorSessionPlan,
  activeElapsedMs = usage.currentSessionElapsedMs ?? 0
): CommentTranslatorSessionStopReason | null {
  const entitlement = resolveUsageEntitlement(usage, plan);

  if (usage.dailyUsedMs > 0 && usage.dailyUsedMs + Math.max(0, activeElapsedMs) >= entitlement.dailyLimitMs) {
    return "daily-time-limit";
  }

  if (usage.translatedMessagesInCurrentMinute >= entitlement.translatedMessagesPerMinute) {
    return "translated-message-cap";
  }

  if (!usage.providerBudgetAvailable) {
    return "provider-quota-stop";
  }

  if (!usage.globalBudgetAvailable) {
    return "global-budget-stop";
  }

  if (!usage.aiBudgetAvailable) {
    return "ai-budget-stop";
  }

  if (usage.translationProviderAvailable === false) {
    return "translation-provider-limit";
  }

  return null;
}

function mapCredentialReadinessToStopReason(
  readiness: Exclude<YouTubeOAuthCredentialTranslatorStartReadiness, { status: "ready" }>
): CommentTranslatorSessionStopReason {
  if (readiness.reason === "refresh-failed") {
    return "token-refresh-failed";
  }

  if (readiness.reason === "auth-unavailable" || readiness.reason === "caller-not-authenticated") {
    return "auth-failed";
  }

  return "reconnect-required";
}

function normalizeActiveSession(
  state: CommentTranslatorActiveSessionRecord | CommentTranslatorSessionBrowserSafeState | null
): CommentTranslatorActiveSessionRecord | null {
  if (!state) {
    return null;
  }

  if (!("status" in state)) {
    return state;
  }

  if (state.status !== "active") {
    return null;
  }

  return {
    sessionReferenceId: state.sessionReferenceId,
    startedAtMs: Date.parse(state.startedAtIso),
    lastHeartbeatAtMs: state.heartbeat.lastHeartbeatAtIso ? Date.parse(state.heartbeat.lastHeartbeatAtIso) : Date.parse(state.startedAtIso),
    credentialReferenceId: state.credentialReferenceId ?? undefined
  };
}

function createHeartbeatState(lastHeartbeatAtMs: number | null): CommentTranslatorSessionHeartbeatState {
  return {
    required: true,
    timeoutSeconds: 45,
    lastHeartbeatAtIso: typeof lastHeartbeatAtMs === "number" ? new Date(lastHeartbeatAtMs).toISOString() : null
  };
}

export function createCommentTranslatorSessionPlanEntitlement({
  plan,
  paidEntitlement
}: {
  plan: CommentTranslatorSessionPlan;
  paidEntitlement?: Pick<
    CommentTranslatorSessionPlanEntitlement,
    "planEntitlementReferenceId" | "dailyLimitMs" | "sessionLimitMs" | "translatedMessagesPerMinute" | "activeSessionsPerUser"
  >;
}): CommentTranslatorSessionPlanEntitlement {
  if (plan === "paid" && paidEntitlement) {
    return {
      plan,
      ...paidEntitlement,
      entitlementSource: "server-owned",
      paidPrioritization: "not-implemented",
      providerUsageCharging: "not-implemented"
    };
  }

  return {
    plan: "free",
    planEntitlementReferenceId: freePlanEntitlementReferenceId,
    entitlementSource: "server-owned",
    dailyLimitMs: freeLimitMs,
    sessionLimitMs: freeLimitMs,
    translatedMessagesPerMinute: commentTranslatorSessionRuntimeContract.freePlanLimits.translatedMessagesPerMinute,
    activeSessionsPerUser: commentTranslatorSessionRuntimeContract.freePlanLimits.activeSessionsPerUser,
    monthlyTranslatedCharacterLimit: commentTranslatorSessionRuntimeContract.freePlanLimits.monthlyTranslatedCharacters,
    paidPrioritization: "not-implemented",
    providerUsageCharging: "not-implemented"
  };
}

function sessionLimitMs(plan: CommentTranslatorSessionPlan, usage?: CommentTranslatorSessionUsageSnapshot): number {
  return resolveUsageEntitlement(usage, plan).sessionLimitMs;
}

function sessionLimitSeconds(plan: CommentTranslatorSessionPlan): number {
  return Math.floor(sessionLimitMs(plan) / 1_000);
}

function remainingDailySeconds({
  dailyUsedMs,
  elapsedMs,
  plan,
  entitlement
}: {
  dailyUsedMs: number;
  elapsedMs: number;
  plan: CommentTranslatorSessionPlan;
  entitlement?: CommentTranslatorSessionPlanEntitlement;
}) {
  return Math.max(
    0,
    Math.ceil(((entitlement ?? createCommentTranslatorSessionPlanEntitlement({ plan })).dailyLimitMs - dailyUsedMs - elapsedMs) / 1_000)
  );
}

function elapsedMs(activeSession: CommentTranslatorActiveSessionRecord, nowMs: number) {
  return Math.max(0, nowMs - activeSession.startedAtMs);
}

function chargeableElapsedMs(
  activeSession: CommentTranslatorActiveSessionRecord,
  nowMs: number,
  plan: CommentTranslatorSessionPlan,
  usage?: CommentTranslatorSessionUsageSnapshot
) {
  const heartbeatBoundedNowMs = Math.min(nowMs, Math.max(activeSession.startedAtMs, activeSession.lastHeartbeatAtMs) + heartbeatTimeoutMs);
  return Math.min(elapsedMs(activeSession, heartbeatBoundedNowMs), sessionLimitMs(plan, usage));
}

function isMissingHeartbeat(activeSession: CommentTranslatorActiveSessionRecord, nowMs: number) {
  return nowMs - activeSession.lastHeartbeatAtMs > heartbeatTimeoutMs;
}

function resolveUsageEntitlement(
  usage: CommentTranslatorSessionUsageSnapshot | undefined,
  plan: CommentTranslatorSessionPlan
) {
  return usage?.planEntitlement ?? createCommentTranslatorSessionPlanEntitlement({ plan });
}

function createDefaultCommentTranslatorUsageSnapshot({
  plan,
  dailyUsedMs
}: {
  plan: CommentTranslatorSessionPlan;
  dailyUsedMs: number;
}): CommentTranslatorSessionUsageSnapshot {
  return {
    dailyUsedMs,
    currentSessionElapsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    monthlyTranslatedCharacterEstimate: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: createCommentTranslatorSessionPlanEntitlement({ plan })
  };
}
