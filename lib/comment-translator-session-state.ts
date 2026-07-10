import "server-only";

import { createCommentTranslatorFreeBetaUsageDisplay } from "./comment-translator-free-beta-usage-display";
import { createCommentTranslatorStartStopReasonUx, resolveCommentTranslatorStopReasonUxCode } from "./comment-translator-start-stop-reason-ux";
import {
  chargeableCommentTranslatorSessionElapsedMs,
  commentTranslatorSessionElapsedMs,
  createDefaultCommentTranslatorUsageSnapshot,
  resolveCommentTranslatorUsageEntitlement
} from "./comment-translator-session-policy";
import type { CommentTranslatorPerMinuteRatePauseProjection } from "./comment-translator-per-minute-rate-pause";
import type { CommentTranslatorStartStopReasonUxCode } from "./comment-translator-start-stop-reason-ux";
import type {
  CommentTranslatorActiveSessionRecord,
  CommentTranslatorSessionBrowserSafeState,
  CommentTranslatorSessionHeartbeatState,
  CommentTranslatorSessionPlan,
  CommentTranslatorSessionStopReason,
  CommentTranslatorSessionUsageSnapshot
} from "./comment-translator-session-types";

export function createCommentTranslatorNotStartedSessionState({
  plan,
  dailyUsedMs = 0,
  usage
}: {
  readonly nowMs: number;
  readonly plan: CommentTranslatorSessionPlan;
  readonly dailyUsedMs?: number;
  readonly usage?: CommentTranslatorSessionUsageSnapshot;
}): CommentTranslatorSessionBrowserSafeState {
  const displayUsage = usage ?? createDefaultCommentTranslatorUsageSnapshot({ plan, dailyUsedMs });
  return {
    status: "not-started",
    provider: "youtube",
    plan,
    startedAtIso: null,
    stoppedAtIso: null,
    elapsedSeconds: 0,
    remainingSessionSeconds: Math.floor(resolveCommentTranslatorUsageEntitlement(undefined, plan).sessionLimitMs / 1_000),
    remainingDailySeconds: remainingDailySeconds({ dailyUsedMs, elapsedMs: 0, plan }),
    heartbeat: createHeartbeatState(null),
    stopReason: null,
    reasonUx: null,
    usageDisplay: createCommentTranslatorFreeBetaUsageDisplay({ usage: displayUsage, elapsedMs: 0 }),
    nextAction: "press-start",
    providerApiUsage: "not-started-before-explicit-start",
    aiTranslationUsage: "not-started-before-explicit-start",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

export function createCommentTranslatorActiveSessionState({
  activeSession,
  nowMs,
  plan,
  usage,
  phase
}: {
  readonly activeSession: CommentTranslatorActiveSessionRecord;
  readonly nowMs: number;
  readonly plan: CommentTranslatorSessionPlan;
  readonly usage: CommentTranslatorSessionUsageSnapshot;
  readonly phase: CommentTranslatorPerMinuteRatePauseProjection;
}): CommentTranslatorSessionBrowserSafeState {
  const elapsed = commentTranslatorSessionElapsedMs(activeSession, nowMs);
  const entitlement = resolveCommentTranslatorUsageEntitlement(usage, plan);
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
    usageDisplay: createCommentTranslatorFreeBetaUsageDisplay({ usage, elapsedMs: elapsed }),
    nextAction: "send-heartbeat-or-stop",
    providerApiUsage: "allowed-after-explicit-start-not-run-in-task-7",
    aiTranslationUsage: "allowed-after-explicit-start-not-run-in-task-7",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    ...phase
  };
}

export function createCommentTranslatorStoppedSessionState({
  activeSession,
  nowMs,
  plan,
  usage,
  reason,
  reasonUxCode,
  nextAction,
  credentialReferenceId
}: {
  readonly activeSession: CommentTranslatorActiveSessionRecord | null;
  readonly nowMs: number;
  readonly plan: CommentTranslatorSessionPlan;
  readonly usage: CommentTranslatorSessionUsageSnapshot;
  readonly reason: CommentTranslatorSessionStopReason;
  readonly reasonUxCode?: CommentTranslatorStartStopReasonUxCode | null;
  readonly nextAction: "session-stopped" | "reconnect-or-sign-in" | "wait-for-limit-reset";
  readonly credentialReferenceId?: string;
}): CommentTranslatorSessionBrowserSafeState {
  const elapsed = activeSession ? chargeableCommentTranslatorSessionElapsedMs(activeSession, nowMs, plan, usage) : 0;
  const entitlement = resolveCommentTranslatorUsageEntitlement(usage, plan);
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
    reasonUx: createCommentTranslatorStartStopReasonUx(resolveCommentTranslatorStopReasonUxCode({ stopReason: reason, reasonUxCode })),
    usageDisplay: createCommentTranslatorFreeBetaUsageDisplay({ usage, elapsedMs: elapsed }),
    nextAction,
    providerApiUsage: "stopped",
    aiTranslationUsage: "stopped",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    providerErrorBody: "never-returned-by-design"
  };
}

function createHeartbeatState(lastHeartbeatAtMs: number | null): CommentTranslatorSessionHeartbeatState {
  return {
    required: true,
    timeoutSeconds: 45,
    lastHeartbeatAtIso: lastHeartbeatAtMs === null ? null : new Date(lastHeartbeatAtMs).toISOString()
  };
}

function remainingDailySeconds({ dailyUsedMs, elapsedMs, plan, entitlement }: {
  readonly dailyUsedMs: number;
  readonly elapsedMs: number;
  readonly plan: CommentTranslatorSessionPlan;
  readonly entitlement?: ReturnType<typeof resolveCommentTranslatorUsageEntitlement>;
}): number {
  const dailyLimitMs = entitlement?.dailyLimitMs ?? resolveCommentTranslatorUsageEntitlement(undefined, plan).dailyLimitMs;
  return Math.max(0, Math.ceil((dailyLimitMs - dailyUsedMs - elapsedMs) / 1_000));
}
