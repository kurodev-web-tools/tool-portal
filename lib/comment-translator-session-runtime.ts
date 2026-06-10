import "server-only";

import { type YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import { type YouTubeOAuthCredentialTranslatorStartReadiness } from "./comment-translator-youtube-disconnect-runtime";

export type CommentTranslatorSessionPlan = "free" | "paid";

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
  translatedMessagesInCurrentMinute: number;
  providerBudgetAvailable: boolean;
  globalBudgetAvailable: boolean;
  aiBudgetAvailable: boolean;
  translationProviderAvailable?: boolean;
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
  providerSignal?: "stream-ended" | "stream-unavailable" | "terminal-provider-error" | null;
};

export type StopCommentTranslatorSessionRequest = {
  activeSession: CommentTranslatorActiveSessionRecord | CommentTranslatorSessionBrowserSafeState | null;
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  reason: CommentTranslatorSessionStopReason;
};

export type ReadCommentTranslatorSessionCommandRequest = StartCommentTranslatorSessionRequest & {
  intent: CommentTranslatorSessionCommandIntent;
  browserConnected?: boolean;
  stopReason?: CommentTranslatorSessionStopReason;
};

const secondsPerMinute = 60;
const freeLimitMs = 30 * secondsPerMinute * 1_000;
const heartbeatTimeoutMs = 45_000;

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
  liveProviderExecution: "not-run-in-task-7",
  providerTargetLookup: "not-run-in-task-7",
  quotaWrite: "not-run-in-task-7",
  billingEnforcement: "not-run-in-task-7",
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  freePlanLimits: {
    dailyMinutes: 30,
    sessionMinutes: 30,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1
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
  dailyUsedMs = 0
}: {
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  dailyUsedMs?: number;
}): CommentTranslatorSessionBrowserSafeState {
  void nowMs;

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
      nextAction: "reconnect-or-sign-in",
      credentialReferenceId: request.credentialReadiness.credentialReferenceId
    });
  }

  if (request.activeSession) {
    return createStoppedState({
      activeSession: request.activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      usage: request.usage,
      reason: "session-limit",
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
      nextAction: usageStopReason === "daily-time-limit" ? "wait-for-limit-reset" : "session-stopped",
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
      dailyUsedMs: request.usage.dailyUsedMs
    });
  }

  if (!request.browserConnected) {
    return stopCommentTranslatorSession({ activeSession, nowMs: request.nowMs, plan: request.plan, reason: "browser-disconnect" });
  }

  if (request.callerAuthorization.status !== "authorized") {
    return stopCommentTranslatorSession({ activeSession, nowMs: request.nowMs, plan: request.plan, reason: "auth-failed" });
  }

  if (request.credentialReadiness.status !== "ready") {
    return stopCommentTranslatorSession({
      activeSession,
      nowMs: request.nowMs,
      plan: request.plan,
      reason: mapCredentialReadinessToStopReason(request.credentialReadiness)
    });
  }

  const usageStopReason = assessUsageStopReason(request.usage, request.plan);
  if (usageStopReason) {
    return stopCommentTranslatorSession({ activeSession, nowMs: request.nowMs, plan: request.plan, reason: usageStopReason });
  }

  if (elapsedMs(activeSession, request.nowMs) >= sessionLimitMs(request.plan)) {
    return stopCommentTranslatorSession({ activeSession, nowMs: request.nowMs, plan: request.plan, reason: "session-time-limit" });
  }

  if (request.providerSignal) {
    return stopCommentTranslatorSession({ activeSession, nowMs: request.nowMs, plan: request.plan, reason: request.providerSignal });
  }

  if (request.nowMs - activeSession.lastHeartbeatAtMs > heartbeatTimeoutMs) {
    return stopCommentTranslatorSession({ activeSession, nowMs: request.nowMs, plan: request.plan, reason: "missing-heartbeat" });
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
    usage: {
      dailyUsedMs: 0,
      translatedMessagesInCurrentMinute: 0,
      providerBudgetAvailable: true,
      globalBudgetAvailable: true,
      aiBudgetAvailable: true
    },
    reason: request.reason,
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
      reason: request.stopReason ?? "user-stop"
    });
  }

  if (request.intent === "heartbeat") {
    const activeSession = normalizeActiveSession(request.activeSession);
    if (!activeSession) {
      return createCommentTranslatorNotStartedSessionState({
        nowMs: request.nowMs,
        plan: request.plan,
        dailyUsedMs: request.usage.dailyUsedMs
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
      usage: request.usage
    });
  }

  return evaluateCommentTranslatorSessionStopCondition({
    activeSession: request.activeSession,
    nowMs: request.nowMs,
    plan: request.plan,
    browserConnected: request.browserConnected ?? true,
    callerAuthorization: request.callerAuthorization,
    credentialReadiness: request.credentialReadiness,
    usage: request.usage
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

  return {
    status: "active",
    provider: "youtube",
    plan,
    sessionReferenceId: activeSession.sessionReferenceId,
    credentialReferenceId: activeSession.credentialReferenceId ?? null,
    startedAtIso: new Date(activeSession.startedAtMs).toISOString(),
    stoppedAtIso: null,
    elapsedSeconds: Math.floor(elapsed / 1_000),
    remainingSessionSeconds: Math.max(0, Math.ceil((sessionLimitMs(plan) - elapsed) / 1_000)),
    remainingDailySeconds: remainingDailySeconds({ dailyUsedMs: usage.dailyUsedMs, elapsedMs: elapsed, plan }),
    heartbeat: createHeartbeatState(activeSession.lastHeartbeatAtMs),
    stopReason: null,
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
  nextAction,
  credentialReferenceId
}: {
  activeSession: CommentTranslatorActiveSessionRecord | null;
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  usage: CommentTranslatorSessionUsageSnapshot;
  reason: CommentTranslatorSessionStopReason;
  nextAction: "session-stopped" | "reconnect-or-sign-in" | "wait-for-limit-reset";
  credentialReferenceId?: string;
}): CommentTranslatorSessionBrowserSafeState {
  const elapsed = activeSession ? Math.max(0, elapsedMs(activeSession, nowMs)) : 0;

  return {
    status: "stopped",
    provider: "youtube",
    plan,
    sessionReferenceId: activeSession?.sessionReferenceId ?? null,
    credentialReferenceId: activeSession?.credentialReferenceId ?? credentialReferenceId ?? null,
    startedAtIso: activeSession ? new Date(activeSession.startedAtMs).toISOString() : null,
    stoppedAtIso: new Date(nowMs).toISOString(),
    elapsedSeconds: Math.floor(elapsed / 1_000),
    remainingSessionSeconds: Math.max(0, Math.ceil((sessionLimitMs(plan) - elapsed) / 1_000)),
    remainingDailySeconds: remainingDailySeconds({ dailyUsedMs: usage.dailyUsedMs, elapsedMs: elapsed, plan }),
    heartbeat: createHeartbeatState(activeSession?.lastHeartbeatAtMs ?? null),
    stopReason: reason,
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
  plan: CommentTranslatorSessionPlan
): CommentTranslatorSessionStopReason | null {
  if (usage.dailyUsedMs >= sessionLimitMs(plan)) {
    return "daily-time-limit";
  }

  if (usage.translatedMessagesInCurrentMinute >= commentTranslatorSessionRuntimeContract.freePlanLimits.translatedMessagesPerMinute) {
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

function sessionLimitMs(plan: CommentTranslatorSessionPlan): number {
  void plan;
  return freeLimitMs;
}

function sessionLimitSeconds(plan: CommentTranslatorSessionPlan): number {
  return Math.floor(sessionLimitMs(plan) / 1_000);
}

function remainingDailySeconds({
  dailyUsedMs,
  elapsedMs,
  plan
}: {
  dailyUsedMs: number;
  elapsedMs: number;
  plan: CommentTranslatorSessionPlan;
}) {
  return Math.max(0, Math.ceil((sessionLimitMs(plan) - dailyUsedMs - elapsedMs) / 1_000));
}

function elapsedMs(activeSession: CommentTranslatorActiveSessionRecord, nowMs: number) {
  return nowMs - activeSession.startedAtMs;
}
