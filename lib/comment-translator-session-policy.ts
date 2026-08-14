import "server-only";

import { commentTranslatorPaidCostLedgerContract } from "./comment-translator-paid-cost-ledger";
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
const commentTranslatorPaidHeartbeatCoalescingWindowMs = 60_000;
const freePlanEntitlementReferenceId = "comment-translator-free-public-v1";

export function createCommentTranslatorSessionPlanEntitlement({
  plan,
  paidEntitlement
}: {
  readonly plan: CommentTranslatorSessionPlan;
  readonly paidEntitlement?: Pick<
    CommentTranslatorSessionPlanEntitlement,
    | "planEntitlementReferenceId"
    | "dailyLimitMs"
    | "sessionLimitMs"
    | "translatedMessagesPerMinute"
    | "activeSessionsPerUser"
    | "monthlyProviderInputCharacterLimit"
    | "paidIndividualCostLimitMicros"
    | "paidGlobalCostLimitMicros"
    | "paidAzureFallbackMonthlyCharacterLimit"
    | "paidAuthorityReadable"
  >;
}): CommentTranslatorSessionPlanEntitlement {
  if (plan === "paid" && paidEntitlement) {
    const baseEntitlement: CommentTranslatorSessionPlanEntitlement = {
      plan,
      ...paidEntitlement,
      entitlementSource: "server-owned",
      paidPrioritization: "not-implemented",
      providerUsageCharging: "not-implemented"
    };
    if (paidEntitlement.paidAuthorityReadable !== true) return baseEntitlement;
    return {
      ...baseEntitlement,
      monthlyProviderInputCharacterLimit:
        paidEntitlement.monthlyProviderInputCharacterLimit
        ?? commentTranslatorPaidCostLedgerContract.paidBillingPeriodCharacterLimit,
      paidIndividualCostLimitMicros:
        paidEntitlement.paidIndividualCostLimitMicros
        ?? commentTranslatorPaidCostLedgerContract.paidIndividualCostLimitMicros,
      paidGlobalCostLimitMicros:
        paidEntitlement.paidGlobalCostLimitMicros
        ?? commentTranslatorPaidCostLedgerContract.paidGlobalCostLimitMicros,
      paidAzureFallbackMonthlyCharacterLimit:
        paidEntitlement.paidAzureFallbackMonthlyCharacterLimit
        ?? commentTranslatorPaidCostLedgerContract.paidAzureFallbackCharacterLimit,
      paidAuthorityReadable: true,
      paidPrioritization: "server-authorized",
      providerUsageCharging: "server-authorized"
    };
  }
  if (plan === "paid") {
    return {
      plan: "paid",
      paidAuthorityReadable: false,
      planEntitlementReferenceId: "comment-translator-paid-authority-unavailable",
      entitlementSource: "server-owned",
      dailyLimitMs: 0,
      sessionLimitMs: 0,
      translatedMessagesPerMinute: 0,
      activeSessionsPerUser: 1,
      monthlyProviderInputCharacterLimit: commentTranslatorPaidCostLedgerContract.paidBillingPeriodCharacterLimit,
      paidIndividualCostLimitMicros: commentTranslatorPaidCostLedgerContract.paidIndividualCostLimitMicros,
      paidGlobalCostLimitMicros: commentTranslatorPaidCostLedgerContract.paidGlobalCostLimitMicros,
      paidAzureFallbackMonthlyCharacterLimit: commentTranslatorPaidCostLedgerContract.paidAzureFallbackCharacterLimit,
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
  if (plan === "paid") {
    if (
      entitlement.plan !== "paid"
      || entitlement.paidAuthorityReadable !== true
      || usage.paidAuthorityReadable !== true
      || usage.paidBillingPeriodInputCharacters === undefined
      || usage.paidBillingPeriodCharacterLimit === undefined
      || usage.paidIndividualCostAvailable === undefined
      || usage.paidGlobalCostAvailable === undefined
    ) {
      return "paid-authority-unreadable";
    }
    if (usage.paidBillingPeriodInputCharacters >= usage.paidBillingPeriodCharacterLimit) {
      return "paid-character-quota-stop";
    }
    if (!usage.paidIndividualCostAvailable) return "paid-individual-cost-stop";
    if (!usage.paidGlobalCostAvailable) return "paid-global-cost-stop";
  }
  if (plan !== "paid" && usage.dailyUsedMs > 0 && usage.dailyUsedMs + Math.max(0, activeElapsedMs) >= entitlement.dailyLimitMs) {
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
    credentialReferenceId: state.credentialReferenceId ?? undefined,
    plan: state.plan
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

export function isCommentTranslatorHeartbeatMissingForPlan(
  activeSession: CommentTranslatorActiveSessionRecord,
  nowMs: number,
  plan: CommentTranslatorSessionPlan
): boolean {
  const missingHeartbeatTimeoutMs = commentTranslatorHeartbeatTimeoutMs
    + (plan === "paid" ? commentTranslatorPaidHeartbeatCoalescingWindowMs : 0);
  return nowMs - activeSession.lastHeartbeatAtMs > missingHeartbeatTimeoutMs;
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
