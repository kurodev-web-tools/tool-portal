import "server-only";

import type {
  CommentTranslatorSessionPlanEntitlement,
  CommentTranslatorSessionStopReason
} from "./comment-translator-session-runtime";

export type CommentTranslatorFreeBetaUsageDisplayUnavailableReason =
  | "durable-usage-unreadable"
  | "missing-entitlement"
  | "missing-provider-readiness";

export type CommentTranslatorFreeBetaUsageProviderCallPolicy =
  | {
      status: "allowed";
      stopReason: null;
      clientReadableDetail: "sanitized-usage-only";
    }
  | {
      status: "blocked-over-limit";
      stopReason: Extract<
        CommentTranslatorSessionStopReason,
        | "daily-time-limit"
        | "session-time-limit"
        | "translated-message-cap"
        | "provider-quota-stop"
        | "global-budget-stop"
        | "ai-budget-stop"
        | "translation-provider-limit"
        | "paid-authority-unreadable"
        | "paid-character-quota-stop"
        | "paid-individual-cost-stop"
        | "paid-global-cost-stop"
      >;
      clientReadableDetail: "sanitized-usage-only";
    }
  | {
      status: "blocked-unavailable";
      stopReason: Extract<CommentTranslatorSessionStopReason, "global-budget-stop" | "translation-provider-limit">;
      clientReadableDetail: "sanitized-usage-only";
    };

export type CommentTranslatorFreeBetaUsageLimitDisplay = {
  used: number;
  limit: number;
  remaining: number;
};

export type CommentTranslatorPaidUsageStopReason =
  | "character-quota"
  | "individual-safety-cap"
  | "global-safety-cap"
  | "infra-safety-stop"
  | "poll-budget-stop";

export type CommentTranslatorPaidUsageDisplay = {
  billingPeriod: CommentTranslatorFreeBetaUsageLimitDisplay;
  nextResetAtIso: string | null;
  providerRoute: "openai" | "azure-direct" | "blocked" | "unknown";
  fallbackActive: boolean;
  recoveryExpected: boolean;
  safetyStop: {
    reason: CommentTranslatorPaidUsageStopReason;
    nextResetAtIso: string | null;
  } | null;
  pollBudget: {
    status: "allowed" | "stop-checkout" | "stop-active-auto-poll" | "unknown";
    nextResetAtIso: string | null;
  };
  clientReadableDetail: "sanitized-paid-usage-only";
};

export type CommentTranslatorFreeBetaUsageTimeDisplay = {
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
};

export type CommentTranslatorFreeBetaUsageDisplay = {
  status: "available" | "over-limit" | "unavailable";
  session: CommentTranslatorFreeBetaUsageTimeDisplay;
  daily: CommentTranslatorFreeBetaUsageTimeDisplay;
  perMinute: CommentTranslatorFreeBetaUsageLimitDisplay;
  monthlyInputCharacterCap: CommentTranslatorFreeBetaUsageLimitDisplay;
  unavailableReason: CommentTranslatorFreeBetaUsageDisplayUnavailableReason | null;
  providerCallPolicy: CommentTranslatorFreeBetaUsageProviderCallPolicy;
  noProviderCallWhenOverLimit: true;
  clientReadableDetail: "sanitized-usage-only";
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
  serverOnlyCursor: "not-returned-by-design";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  paid?: CommentTranslatorPaidUsageDisplay;
  publicLaunchAllowed: false;
};

export type CommentTranslatorFreeBetaUsageDisplayInput = {
  dailyUsedMs: number;
  currentSessionElapsedMs?: number;
  translatedMessagesInCurrentMinute: number;
  monthlyProviderInputCharacterEstimate?: number;
  providerBudgetAvailable: boolean;
  globalBudgetAvailable: boolean;
  aiBudgetAvailable: boolean;
  translationProviderAvailable?: boolean;
  paidAuthorityReadable?: boolean;
  paidBillingPeriodInputCharacters?: number;
  paidBillingPeriodCharacterLimit?: number;
  paidIndividualCostAvailable?: boolean;
  paidGlobalCostAvailable?: boolean;
  paidBillingPeriodNextResetAtIso?: string | null;
  paidProviderRoute?: CommentTranslatorPaidUsageDisplay["providerRoute"];
  paidProviderFallbackActive?: boolean;
  paidProviderRecoveryExpected?: boolean;
  paidSafetyStopReason?: CommentTranslatorPaidUsageStopReason | null;
  paidSafetyStopNextResetAtIso?: string | null;
  paidPollBudgetStatus?: CommentTranslatorPaidUsageDisplay["pollBudget"]["status"];
  paidPollBudgetNextResetAtIso?: string | null;
  planEntitlement?: CommentTranslatorSessionPlanEntitlement;
};

export const commentTranslatorFreeBetaUsageDisplayContract = {
  implementationStage: "free-public-beta-f12-usage-display",
  runtime: "server-only",
  sourceAuthority: "server-owned-durable-session-usage-entitlement-baseline",
  displayBoundary: "sanitized-browser-safe-usage-metadata-only",
  monthlyInputCharacterCap: "free-public-beta-20000-provider-input-characters-month",
  noProviderCallWhenOverLimit: true,
  unreadableUsageFallback: "sanitized-unavailable-fail-closed",
  missingEntitlementFallback: "sanitized-unavailable-fail-closed",
  missingProviderReadinessFallback: "sanitized-unavailable-no-provider-call",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  publicLaunchAllowed: false,
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "live-target-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "server-only-cursor"
  ]
} as const;

const fallbackFreeMonthlyInputCharacterLimit = 20_000;

export function createCommentTranslatorFreeBetaUsageDisplay({
  usage,
  elapsedMs = usage.currentSessionElapsedMs ?? 0
}: {
  usage: CommentTranslatorFreeBetaUsageDisplayInput;
  elapsedMs?: number;
}): CommentTranslatorFreeBetaUsageDisplay {
  if (!usage.planEntitlement) {
    return createUnavailableCommentTranslatorFreeBetaUsageDisplay({
      reason: "missing-entitlement"
    });
  }

  const providerCallPolicy = resolveCommentTranslatorFreeBetaProviderCallPolicy({ usage, elapsedMs });
  const dailyUsedMs = Math.max(0, usage.dailyUsedMs) + Math.max(0, elapsedMs);
  const monthlyLimit = readMonthlyInputCharacterLimit(usage.planEntitlement);
  const monthlyUsed = Math.max(0, usage.monthlyProviderInputCharacterEstimate ?? 0);

  return createDisplay({
    status: providerCallPolicy.status === "blocked-over-limit" ? "over-limit" : "available",
    session: {
      usedSeconds: msToSeconds(elapsedMs),
      limitSeconds: msToSeconds(usage.planEntitlement.sessionLimitMs),
      remainingSeconds: msToRemainingSeconds(usage.planEntitlement.sessionLimitMs - Math.max(0, elapsedMs))
    },
    daily: {
      usedSeconds: msToSeconds(dailyUsedMs),
      limitSeconds: msToSeconds(usage.planEntitlement.dailyLimitMs),
      remainingSeconds: msToRemainingSeconds(usage.planEntitlement.dailyLimitMs - dailyUsedMs)
    },
    perMinute: {
      used: Math.max(0, usage.translatedMessagesInCurrentMinute),
      limit: Math.max(0, usage.planEntitlement.translatedMessagesPerMinute),
      remaining: Math.max(0, usage.planEntitlement.translatedMessagesPerMinute - usage.translatedMessagesInCurrentMinute)
    },
    monthlyInputCharacterCap: {
      used: monthlyUsed,
      limit: monthlyLimit,
      remaining: Math.max(0, monthlyLimit - monthlyUsed)
    },
    unavailableReason: null,
    providerCallPolicy,
    paid: usage.planEntitlement.plan === "paid"
      ? createPaidUsageDisplay({ usage, monthlyUsed, monthlyLimit })
      : undefined
  });
}

export function createUnavailableCommentTranslatorFreeBetaUsageDisplay({
  reason
}: {
  reason: CommentTranslatorFreeBetaUsageDisplayUnavailableReason;
}): CommentTranslatorFreeBetaUsageDisplay {
  return createDisplay({
    status: "unavailable",
    session: unavailableTimeDisplay(),
    daily: unavailableTimeDisplay(),
    perMinute: unavailableLimitDisplay(),
    monthlyInputCharacterCap: unavailableLimitDisplay(fallbackFreeMonthlyInputCharacterLimit),
    unavailableReason: reason,
    providerCallPolicy: {
      status: "blocked-unavailable",
      stopReason: reason === "missing-provider-readiness" ? "translation-provider-limit" : "global-budget-stop",
      clientReadableDetail: "sanitized-usage-only"
    }
  });
}

export function resolveCommentTranslatorFreeBetaProviderCallPolicy({
  usage,
  elapsedMs = usage.currentSessionElapsedMs ?? 0
}: {
  usage: CommentTranslatorFreeBetaUsageDisplayInput;
  elapsedMs?: number;
}): CommentTranslatorFreeBetaUsageProviderCallPolicy {
  if (!usage.planEntitlement) {
    return {
      status: "blocked-unavailable",
      stopReason: "global-budget-stop",
      clientReadableDetail: "sanitized-usage-only"
    };
  }

  const monthlyLimit = readMonthlyInputCharacterLimit(usage.planEntitlement);
  const monthlyUsed = Math.max(0, usage.monthlyProviderInputCharacterEstimate ?? 0);
  const dailyUsedMs = Math.max(0, usage.dailyUsedMs) + Math.max(0, elapsedMs);

  if (dailyUsedMs >= usage.planEntitlement.dailyLimitMs) {
    return blockedOverLimit("daily-time-limit");
  }

  if (Math.max(0, elapsedMs) >= usage.planEntitlement.sessionLimitMs) {
    return blockedOverLimit("session-time-limit");
  }

  if (usage.translatedMessagesInCurrentMinute >= usage.planEntitlement.translatedMessagesPerMinute) {
    return blockedOverLimit("translated-message-cap");
  }

  if (usage.planEntitlement.plan === "paid" && usage.paidAuthorityReadable !== true) {
    return blockedOverLimit("paid-authority-unreadable");
  }

  if (usage.planEntitlement.plan === "paid" && monthlyUsed >= monthlyLimit) {
    return blockedOverLimit("paid-character-quota-stop");
  }

  if (usage.planEntitlement.plan === "paid" && usage.paidIndividualCostAvailable === false) {
    return blockedOverLimit("paid-individual-cost-stop");
  }

  if (usage.planEntitlement.plan === "paid" && usage.paidGlobalCostAvailable === false) {
    return blockedOverLimit("paid-global-cost-stop");
  }

  if (!usage.providerBudgetAvailable) {
    return blockedOverLimit("provider-quota-stop");
  }

  if (!usage.globalBudgetAvailable) {
    return blockedOverLimit("global-budget-stop");
  }

  if (!usage.aiBudgetAvailable || (usage.planEntitlement.plan !== "paid" && monthlyUsed >= monthlyLimit)) {
    return blockedOverLimit("ai-budget-stop");
  }

  if (usage.translationProviderAvailable === false) {
    return blockedOverLimit("translation-provider-limit");
  }

  return {
    status: "allowed",
    stopReason: null,
    clientReadableDetail: "sanitized-usage-only"
  };
}

function blockedOverLimit(
  stopReason: Extract<CommentTranslatorFreeBetaUsageProviderCallPolicy, { status: "blocked-over-limit" }>["stopReason"]
): Extract<CommentTranslatorFreeBetaUsageProviderCallPolicy, { status: "blocked-over-limit" }> {
  return {
    status: "blocked-over-limit",
    stopReason,
    clientReadableDetail: "sanitized-usage-only"
  };
}

function createDisplay({
  status,
  session,
  daily,
  perMinute,
  monthlyInputCharacterCap,
  unavailableReason,
  providerCallPolicy,
  paid
}: Pick<
  CommentTranslatorFreeBetaUsageDisplay,
  "status" | "session" | "daily" | "perMinute" | "monthlyInputCharacterCap" | "unavailableReason" | "providerCallPolicy" | "paid"
>): CommentTranslatorFreeBetaUsageDisplay {
  return {
    status,
    session,
    daily,
    perMinute,
    monthlyInputCharacterCap,
    unavailableReason,
    providerCallPolicy,
    noProviderCallWhenOverLimit: true,
    clientReadableDetail: "sanitized-usage-only",
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    ...(paid ? { paid } : {}),
    publicLaunchAllowed: false
  };
}

function createPaidUsageDisplay({
  usage,
  monthlyUsed,
  monthlyLimit
}: {
  usage: CommentTranslatorFreeBetaUsageDisplayInput;
  monthlyUsed: number;
  monthlyLimit: number;
}): CommentTranslatorPaidUsageDisplay {
  const safetyStop = usage.paidSafetyStopReason
    ? {
        reason: usage.paidSafetyStopReason,
        nextResetAtIso: usage.paidSafetyStopNextResetAtIso ?? usage.paidBillingPeriodNextResetAtIso ?? null
      }
    : usage.paidAuthorityReadable !== true
      ? { reason: "infra-safety-stop" as const, nextResetAtIso: usage.paidBillingPeriodNextResetAtIso ?? null }
      : null;
  return {
    billingPeriod: {
      used: monthlyUsed,
      limit: monthlyLimit,
      remaining: Math.max(0, monthlyLimit - monthlyUsed)
    },
    nextResetAtIso: usage.paidBillingPeriodNextResetAtIso ?? null,
    providerRoute: usage.paidProviderRoute ?? "unknown",
    fallbackActive: usage.paidProviderFallbackActive ?? usage.paidProviderRoute === "azure-direct",
    recoveryExpected: usage.paidProviderRecoveryExpected ?? usage.paidProviderRoute === "azure-direct",
    safetyStop,
    pollBudget: {
      status: usage.paidPollBudgetStatus ?? "unknown",
      nextResetAtIso: usage.paidPollBudgetNextResetAtIso ?? null
    },
    clientReadableDetail: "sanitized-paid-usage-only"
  };
}

function readMonthlyInputCharacterLimit(entitlement: CommentTranslatorSessionPlanEntitlement) {
  return Math.max(0, entitlement.monthlyProviderInputCharacterLimit ?? fallbackFreeMonthlyInputCharacterLimit);
}

function unavailableTimeDisplay(): CommentTranslatorFreeBetaUsageTimeDisplay {
  return {
    usedSeconds: 0,
    limitSeconds: 0,
    remainingSeconds: 0
  };
}

function unavailableLimitDisplay(limit = 0): CommentTranslatorFreeBetaUsageLimitDisplay {
  return {
    used: 0,
    limit,
    remaining: 0
  };
}

function msToSeconds(ms: number) {
  return Math.floor(Math.max(0, ms) / 1_000);
}

function msToRemainingSeconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1_000));
}
