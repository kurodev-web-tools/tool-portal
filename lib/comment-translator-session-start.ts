import "server-only";

import { createCommentTranslatorPerMinuteRunningProjection } from "./comment-translator-per-minute-rate-pause";
import { resolveCommentTranslatorCredentialReadinessReasonUxCode, resolveCommentTranslatorStopReasonUxCode } from "./comment-translator-start-stop-reason-ux";
import {
  assessCommentTranslatorUsageStopReason,
  isCommentTranslatorHeartbeatMissing,
  mapCommentTranslatorCredentialReadinessToStopReason,
  resolveCommentTranslatorUsageEntitlement
} from "./comment-translator-session-policy";
import { createCommentTranslatorActiveSessionState, createCommentTranslatorStoppedSessionState } from "./comment-translator-session-state";
import type { CommentTranslatorSessionBrowserSafeState, StartCommentTranslatorSessionRequest } from "./comment-translator-session-types";

export function startCommentTranslatorSession(
  request: StartCommentTranslatorSessionRequest
): CommentTranslatorSessionBrowserSafeState {
  if (request.callerAuthorization.status !== "authorized") {
    return createCommentTranslatorStoppedSessionState({
      activeSession: null, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: "auth-failed", reasonUxCode: "auth-unavailable", nextAction: "reconnect-or-sign-in"
    });
  }
  if (request.credentialReadiness.status !== "ready") {
    return createCommentTranslatorStoppedSessionState({
      activeSession: null, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: mapCommentTranslatorCredentialReadinessToStopReason(request.credentialReadiness),
      reasonUxCode: resolveCommentTranslatorCredentialReadinessReasonUxCode({ reason: request.credentialReadiness.reason }),
      nextAction: "reconnect-or-sign-in", credentialReferenceId: request.credentialReadiness.credentialReferenceId
    });
  }
  const entitlement = resolveCommentTranslatorUsageEntitlement(request.usage, request.plan);
  if (request.activeSession && isCommentTranslatorHeartbeatMissing(request.activeSession, request.nowMs)) {
    return createCommentTranslatorStoppedSessionState({
      activeSession: request.activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: "missing-heartbeat", reasonUxCode: "heartbeat-or-browser-disconnect", nextAction: "session-stopped"
    });
  }
  if (request.activeSession && entitlement.activeSessionsPerUser <= 1) {
    return createCommentTranslatorStoppedSessionState({
      activeSession: request.activeSession, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: "session-limit", reasonUxCode: "session-limit", nextAction: "session-stopped",
      credentialReferenceId: request.credentialReadiness.credentialReferenceId
    });
  }
  const usageStopReason = assessCommentTranslatorUsageStopReason(request.usage, request.plan);
  if (usageStopReason) {
    return createCommentTranslatorStoppedSessionState({
      activeSession: null, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: usageStopReason,
      reasonUxCode: resolveCommentTranslatorStopReasonUxCode({ stopReason: usageStopReason }),
      nextAction: usageStopReason === "daily-time-limit" ? "wait-for-limit-reset" : "session-stopped",
      nextResetAtIso: request.nextResetAtIso,
      credentialReferenceId: request.credentialReadiness.credentialReferenceId
    });
  }
  if (request.liveChatTargetReadiness?.status === "unavailable") {
    return createCommentTranslatorStoppedSessionState({
      activeSession: null, nowMs: request.nowMs, plan: request.plan, usage: request.usage,
      reason: request.liveChatTargetReadiness.stopReason,
      reasonUxCode: request.liveChatTargetReadiness.reasonUxCode,
      nextAction: "session-stopped", credentialReferenceId: request.credentialReadiness.credentialReferenceId
    });
  }
  return createCommentTranslatorActiveSessionState({
    activeSession: {
      sessionReferenceId: request.createSessionReferenceId(),
      startedAtMs: request.nowMs,
      lastHeartbeatAtMs: request.nowMs,
      credentialReferenceId: request.credentialReadiness.credentialReferenceId
    },
    nowMs: request.nowMs,
    plan: request.plan,
    usage: request.usage,
    phase: createCommentTranslatorPerMinuteRunningProjection()
  });
}
