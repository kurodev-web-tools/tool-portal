import "server-only";

import type { YouTubeOAuthCredentialTranslatorStartReadiness } from "./comment-translator-youtube-disconnect-runtime";
import type {
  CommentTranslatorActiveSessionRecord,
  CommentTranslatorSessionBrowserSafeState,
  CommentTranslatorSessionPlan,
  CommentTranslatorSessionPlanEntitlement,
  CommentTranslatorSessionStopReason,
  CommentTranslatorSessionUsageSnapshot
} from "./comment-translator-session-types";

const freeLimitMs = 30 * 60 * 1_000;
export const commentTranslatorHeartbeatTimeoutMs = 45_000;
const freePlanEntitlementReferenceId = "comment-translator-free-public-v1";

export function createCommentTranslatorSessionPlanEntitlement({
  plan,
  paidEntitlement
}: {
  readonly plan: CommentTranslatorSessionPlan;
  readonly paidEntitlement?: Pick<
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
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyProviderInputCharacterLimit: 20_000,
    paidPrioritization: "not-implemented",
    providerUsageCharging: "not-implemented"
  };
}

export function resolveCommentTranslatorUsageEntitlement(
  usage: CommentTranslatorSessionUsageSnapshot | undefined,
  plan: CommentTranslatorSessionPlan
): CommentTranslatorSessionPlanEntitlement {
  return usage?.planEntitlement ?? createCommentTranslatorSessionPlanEntitlement({ plan });
}

export function assessCommentTranslatorUsageStopReason(
  usage: CommentTranslatorSessionUsageSnapshot,
  plan: CommentTranslatorSessionPlan,
  activeElapsedMs = usage.currentSessionElapsedMs ?? 0
): CommentTranslatorSessionStopReason | null {
  const entitlement = resolveCommentTranslatorUsageEntitlement(usage, plan);
  if (usage.dailyUsedMs > 0 && usage.dailyUsedMs + Math.max(0, activeElapsedMs) >= entitlement.dailyLimitMs) {
    return "daily-time-limit";
  }
  if (!usage.providerBudgetAvailable) return "provider-quota-stop";
  if (!usage.globalBudgetAvailable) return "global-budget-stop";
  if (!usage.aiBudgetAvailable) return "ai-budget-stop";
  if (usage.translationProviderAvailable === false) return "translation-provider-limit";
  return null;
}

export function mapCommentTranslatorCredentialReadinessToStopReason(
  readiness: Exclude<YouTubeOAuthCredentialTranslatorStartReadiness, { readonly status: "ready" }>
): CommentTranslatorSessionStopReason {
  if (readiness.reason === "refresh-failed") return "token-refresh-failed";
  if (readiness.reason === "auth-unavailable" || readiness.reason === "caller-not-authenticated") return "auth-failed";
  return "reconnect-required";
}

export function normalizeCommentTranslatorActiveSession(
  state: CommentTranslatorActiveSessionRecord | CommentTranslatorSessionBrowserSafeState | null
): CommentTranslatorActiveSessionRecord | null {
  if (!state) return null;
  if (!("status" in state)) return state;
  if (state.status !== "active") return null;
  return {
    sessionReferenceId: state.sessionReferenceId,
    startedAtMs: Date.parse(state.startedAtIso),
    lastHeartbeatAtMs: state.heartbeat.lastHeartbeatAtIso
      ? Date.parse(state.heartbeat.lastHeartbeatAtIso)
      : Date.parse(state.startedAtIso),
    credentialReferenceId: state.credentialReferenceId ?? undefined
  };
}

export function commentTranslatorSessionElapsedMs(
  activeSession: CommentTranslatorActiveSessionRecord,
  nowMs: number
): number {
  return Math.max(0, nowMs - activeSession.startedAtMs);
}

export function commentTranslatorSessionLimitMs(
  plan: CommentTranslatorSessionPlan,
  usage?: CommentTranslatorSessionUsageSnapshot
): number {
  return resolveCommentTranslatorUsageEntitlement(usage, plan).sessionLimitMs;
}

export function chargeableCommentTranslatorSessionElapsedMs(
  activeSession: CommentTranslatorActiveSessionRecord,
  nowMs: number,
  plan: CommentTranslatorSessionPlan,
  usage?: CommentTranslatorSessionUsageSnapshot
): number {
  const heartbeatBoundedNowMs = Math.min(
    nowMs,
    Math.max(activeSession.startedAtMs, activeSession.lastHeartbeatAtMs) + commentTranslatorHeartbeatTimeoutMs
  );
  return Math.min(
    commentTranslatorSessionElapsedMs(activeSession, heartbeatBoundedNowMs),
    commentTranslatorSessionLimitMs(plan, usage)
  );
}

export function isCommentTranslatorHeartbeatMissing(
  activeSession: CommentTranslatorActiveSessionRecord,
  nowMs: number
): boolean {
  return nowMs - activeSession.lastHeartbeatAtMs > commentTranslatorHeartbeatTimeoutMs;
}

export function createDefaultCommentTranslatorUsageSnapshot({
  plan,
  dailyUsedMs
}: {
  readonly plan: CommentTranslatorSessionPlan;
  readonly dailyUsedMs: number;
}): CommentTranslatorSessionUsageSnapshot {
  return {
    dailyUsedMs,
    currentSessionElapsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    monthlyProviderInputCharacterEstimate: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: createCommentTranslatorSessionPlanEntitlement({ plan })
  };
}
