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
  monthlyCharacterCap: CommentTranslatorFreeBetaUsageLimitDisplay;
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
  publicLaunchAllowed: false;
};

export type CommentTranslatorFreeBetaUsageDisplayInput = {
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

export const commentTranslatorFreeBetaUsageDisplayContract = {
  implementationStage: "free-public-beta-f12-usage-display",
  runtime: "server-only",
  sourceAuthority: "server-owned-durable-session-usage-entitlement-baseline",
  displayBoundary: "sanitized-browser-safe-usage-metadata-only",
  monthlyCharacterCap: "free-public-beta-20000-characters-month",
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

const fallbackFreeMonthlyCharacterLimit = 20_000;

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
  const monthlyLimit = readMonthlyCharacterLimit(usage.planEntitlement);
  const monthlyUsed = Math.max(0, usage.monthlyTranslatedCharacterEstimate ?? 0);

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
    monthlyCharacterCap: {
      used: monthlyUsed,
      limit: monthlyLimit,
      remaining: Math.max(0, monthlyLimit - monthlyUsed)
    },
    unavailableReason: null,
    providerCallPolicy
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
    monthlyCharacterCap: unavailableLimitDisplay(fallbackFreeMonthlyCharacterLimit),
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

  const monthlyLimit = readMonthlyCharacterLimit(usage.planEntitlement);
  const monthlyUsed = Math.max(0, usage.monthlyTranslatedCharacterEstimate ?? 0);
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

  if (!usage.providerBudgetAvailable) {
    return blockedOverLimit("provider-quota-stop");
  }

  if (!usage.globalBudgetAvailable) {
    return blockedOverLimit("global-budget-stop");
  }

  if (!usage.aiBudgetAvailable || monthlyUsed >= monthlyLimit) {
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
  monthlyCharacterCap,
  unavailableReason,
  providerCallPolicy
}: Pick<
  CommentTranslatorFreeBetaUsageDisplay,
  "status" | "session" | "daily" | "perMinute" | "monthlyCharacterCap" | "unavailableReason" | "providerCallPolicy"
>): CommentTranslatorFreeBetaUsageDisplay {
  return {
    status,
    session,
    daily,
    perMinute,
    monthlyCharacterCap,
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
    publicLaunchAllowed: false
  };
}

function readMonthlyCharacterLimit(entitlement: CommentTranslatorSessionPlanEntitlement) {
  return Math.max(0, entitlement.monthlyTranslatedCharacterLimit ?? fallbackFreeMonthlyCharacterLimit);
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
