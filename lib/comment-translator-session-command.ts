import "server-only";

import { resolveCommentTranslatorCredentialReadinessReasonUxCode, resolveCommentTranslatorStopReasonUxCode } from "./comment-translator-start-stop-reason-ux";
import {
  assessCommentTranslatorUsageStopReason,
  chargeableCommentTranslatorSessionElapsedMs,
  createDefaultCommentTranslatorUsageSnapshot,
  isCommentTranslatorHeartbeatMissing,
  mapCommentTranslatorCredentialReadinessToStopReason,
  normalizeCommentTranslatorActiveSession,
  commentTranslatorSessionLimitMs
} from "./comment-translator-session-policy";
import {
  createCommentTranslatorActiveSessionState,
  createCommentTranslatorNotStartedSessionState,
  createCommentTranslatorStoppedSessionState
} from "./comment-translator-session-state";
import { startCommentTranslatorSession } from "./comment-translator-session-start";
import type {
  CommentTranslatorSessionBrowserSafeState,
  EvaluateCommentTranslatorSessionStopRequest,
  ReadOnlyCommentTranslatorSessionStatusRequest,
  ReadCommentTranslatorSessionCommandRequest,
  StopCommentTranslatorSessionRequest
} from "./comment-translator-session-types";

export function evaluateCommentTranslatorSessionStopCondition(
  request: EvaluateCommentTranslatorSessionStopRequest
): CommentTranslatorSessionBrowserSafeState {
  const activeSession = normalizeCommentTranslatorActiveSession(request.activeSession);
  if (!activeSession) {
    return createCommentTranslatorNotStartedSessionState({
      nowMs: request.nowMs, plan: request.plan, dailyUsedMs: request.usage.dailyUsedMs, usage: request.usage
    });
  }
  if (!request.browserConnected) {
    return stopCommentTranslatorSession({
      activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: "browser-disconnect", reasonUxCode: "heartbeat-or-browser-disconnect"
    });
  }
  if (request.callerAuthorization.status !== "authorized") {
    return stopCommentTranslatorSession({
      activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: "auth-failed", reasonUxCode: "auth-unavailable"
    });
  }
  if (request.credentialReadiness && request.credentialReadiness.status !== "ready") {
    return stopCommentTranslatorSession({
      activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: mapCommentTranslatorCredentialReadinessToStopReason(request.credentialReadiness),
      reasonUxCode: resolveCommentTranslatorCredentialReadinessReasonUxCode({ reason: request.credentialReadiness.reason })
    });
  }
  if (isCommentTranslatorHeartbeatMissing(activeSession, request.nowMs)) {
    return stopCommentTranslatorSession({
      activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: "missing-heartbeat", reasonUxCode: "heartbeat-or-browser-disconnect"
    });
  }
  const activeElapsedMs = chargeableCommentTranslatorSessionElapsedMs(activeSession, request.nowMs, request.plan, request.usage);
  if (activeElapsedMs >= commentTranslatorSessionLimitMs(request.plan, request.usage)) {
    return stopCommentTranslatorSession({
      activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: "session-time-limit", reasonUxCode: "quota-or-budget-stop"
    });
  }
  const usageStopReason = assessCommentTranslatorUsageStopReason(request.usage, request.plan, activeElapsedMs);
  if (usageStopReason) {
    return stopCommentTranslatorSession({
      activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: usageStopReason, reasonUxCode: resolveCommentTranslatorStopReasonUxCode({ stopReason: usageStopReason })
    });
  }
  if (request.providerSignal) {
    return stopCommentTranslatorSession({
      activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: request.providerSignal, reasonUxCode: request.providerSignalReasonUxCode
    });
  }
  const ratePauseResolution = request.ratePauseResolution;
  if (ratePauseResolution.status === "fail-closed") {
    return stopCommentTranslatorSession({
      activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: ratePauseResolution.stopReason, reasonUxCode: "quota-or-budget-stop"
    });
  }
  return createCommentTranslatorActiveSessionState({
    activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage, phase: ratePauseResolution.projection
  });
}

export function readCommentTranslatorReadOnlySessionStatus(
  request: ReadOnlyCommentTranslatorSessionStatusRequest
): CommentTranslatorSessionBrowserSafeState {
  return evaluateCommentTranslatorSessionStopCondition({
    ...request,
    credentialReadiness: null
  });
}

export function stopCommentTranslatorSession(
  request: StopCommentTranslatorSessionRequest
): CommentTranslatorSessionBrowserSafeState {
  const usage = request.usage ?? createDefaultCommentTranslatorUsageSnapshot({ plan: request.plan, dailyUsedMs: 0 });
  return createCommentTranslatorStoppedSessionState({
    activeSession: normalizeCommentTranslatorActiveSession(request.activeSession),
    nowMs: request.nowMs,
    plan: request.plan,
    usage,
    reason: request.reason,
    reasonUxCode: request.reasonUxCode,
    nextAction: request.reason === "auth-failed" || request.reason === "reconnect-required"
      ? "reconnect-or-sign-in"
      : "session-stopped"
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
      reasonUxCode: request.stopReason
        ? resolveCommentTranslatorStopReasonUxCode({ stopReason: request.stopReason })
        : "user-stop"
    });
  }
  if (request.intent === "heartbeat") {
    const activeSession = normalizeCommentTranslatorActiveSession(request.activeSession);
    if (!activeSession) {
      return createCommentTranslatorNotStartedSessionState({
        nowMs: request.nowMs, plan: request.plan, dailyUsedMs: request.usage.dailyUsedMs, usage: request.usage
      });
    }
    return evaluateCommentTranslatorSessionStopCondition({
      activeSession: { ...activeSession, lastHeartbeatAtMs: request.nowMs },
      nowMs: request.nowMs,
      plan: request.plan,
      browserConnected: request.browserConnected ?? true,
      callerAuthorization: request.callerAuthorization,
      credentialReadiness: request.credentialReadiness,
      usage: request.usage,
      ratePauseResolution: request.ratePauseResolution,
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
    ratePauseResolution: request.ratePauseResolution,
    providerSignal: request.providerSignal,
    providerSignalReasonUxCode: request.providerSignalReasonUxCode
  });
}
