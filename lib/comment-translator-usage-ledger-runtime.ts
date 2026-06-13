import "server-only";

import { createHash } from "node:crypto";
import {
  type CommentTranslatorActiveSessionRecord,
  type CommentTranslatorSessionBrowserSafeState,
  type CommentTranslatorSessionPlan,
  type CommentTranslatorSessionPlanEntitlement,
  type CommentTranslatorSessionStopReason,
  createCommentTranslatorSessionPlanEntitlement
} from "./comment-translator-session-runtime";
import { type YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";

export type CommentTranslatorUsageQuotaBudgetLedgerRecordCategory =
  | "per-user-daily-session-minutes"
  | "plan-entitlement-reference"
  | "provider-request-estimate"
  | "ai-message-character-cost-estimate"
  | "quota-budget-stop-event"
  | "admin-safe-aggregate-metric";

export type CommentTranslatorUsageLedgerUserReference = `ctul_${string}`;

export type CommentTranslatorUsageLedgerProviderRequestEstimate = {
  requestEstimateCount: number;
  quotaUnitEstimate: number;
  providerTargetMetadata: "forbidden";
};

export type CommentTranslatorUsageLedgerAiUsageEstimate = {
  translatedMessageEstimate: number;
  translatedCharacterEstimate: number;
  estimatedCostMicros: number;
  rawCommentText: "never-recorded-by-design";
};

export type CommentTranslatorUsageLedgerProviderTranslationErrorEstimate = {
  providerErrorClass: "recoverable-error" | "terminal-error";
  errorCount: number;
  providerErrorBody: "never-recorded-by-design";
  rawCommentText: "never-recorded-by-design";
};

export type CommentTranslatorUsageQuotaBudgetStopCategory =
  | "provider-quota"
  | "global-budget"
  | "ai-budget"
  | "translated-message-cap"
  | "session-time-limit"
  | "daily-time-limit";

export type CommentTranslatorUsageLedgerEvent =
  | {
      type: "session-started";
      provider: "youtube";
      planEntitlement: CommentTranslatorSessionPlanEntitlement;
      sessionReferenceId: string;
      occurredAtMs: number;
    }
  | {
      type: "session-stopped";
      provider: "youtube";
      planEntitlement: CommentTranslatorSessionPlanEntitlement;
      sessionReferenceId: string | null;
      occurredAtMs: number;
      elapsedMs: number;
      stopReason: CommentTranslatorSessionStopReason;
    }
  | ({
      type: "provider-request-estimated";
      provider: "youtube";
      sessionReferenceId: string;
      occurredAtMs: number;
    } & CommentTranslatorUsageLedgerProviderRequestEstimate)
  | ({
      type: "ai-usage-estimated";
      provider: "youtube";
      sessionReferenceId: string;
      occurredAtMs: number;
    } & CommentTranslatorUsageLedgerAiUsageEstimate)
  | ({
      type: "provider-translation-error-estimated";
      provider: "youtube";
      sessionReferenceId: string;
      occurredAtMs: number;
    } & CommentTranslatorUsageLedgerProviderTranslationErrorEstimate)
  | {
      type: "quota-budget-stop";
      provider: "youtube";
      sessionReferenceId: string | null;
      occurredAtMs: number;
      stopReason: CommentTranslatorSessionStopReason;
      stopCategory: CommentTranslatorUsageQuotaBudgetStopCategory;
      clientReadableDetail: "sanitized-stop-reason-only";
    };

export type CommentTranslatorUsageLedgerRecord = CommentTranslatorUsageLedgerEvent & {
  userLedgerReferenceId: CommentTranslatorUsageLedgerUserReference;
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  authorizationHeaderValue: "never-returned-by-design";
  providerTargetMetadata: "forbidden";
};

export type CommentTranslatorUsageLedgerSnapshot = {
  dailyUsedMs: number;
  currentSessionElapsedMs: number;
  translatedMessagesInCurrentMinute: number;
  providerBudgetAvailable: boolean;
  globalBudgetAvailable: boolean;
  aiBudgetAvailable: boolean;
  translationProviderAvailable: boolean;
  planEntitlement: CommentTranslatorSessionPlanEntitlement;
  providerRequestEstimate: CommentTranslatorUsageLedgerProviderRequestEstimate;
  aiUsageEstimate: CommentTranslatorUsageLedgerAiUsageEstimate;
};

export type CommentTranslatorAdminSafeAggregateMetrics = {
  generatedAtIso: string;
  activeSessionCountEstimate: number;
  totalCompletedSessionMinutesEstimate: number;
  totalProviderRequestEstimate: number;
  totalProviderQuotaUnitEstimate: number;
  totalAiTranslatedMessageEstimate: number;
  totalAiTranslatedCharacterEstimate: number;
  totalAiCostEstimateMicros: number;
  quotaBudgetStopCounts: {
    providerQuotaStop: number;
    globalBudgetStop: number;
    aiBudgetStop: number;
    translatedMessageCap: number;
    sessionTimeLimit: number;
    dailyTimeLimit: number;
  };
  tokenValue: "never-returned-by-design";
  providerTargetMetadata: "forbidden";
  rawCommentText: "never-recorded-by-design";
};

export const commentTranslatorUsageQuotaBudgetLedgerContract = {
  implementationStage: "server-owned-usage-quota-budget-ledger-foundation",
  runtime: "server-only",
  storageStage: "in-process-contract-foundation",
  clientReadableOutput: "sanitized-usage-metadata-only",
  recordCategories: [
    "per-user-daily-session-minutes",
    "plan-entitlement-reference",
    "provider-request-estimate",
    "ai-message-character-cost-estimate",
    "quota-budget-stop-event",
    "admin-safe-aggregate-metric"
  ],
  freePaidLimitEnforcement: "derived-from-server-owned-plan-entitlement-state",
  paidPrioritization: "not-implemented-in-task-8",
  providerUsageCharging: "not-implemented-in-task-8",
  billingEnforcement: "not-implemented-in-task-8",
  liveProviderExecution: "not-run-in-task-8",
  providerTargetLookup: "not-run-in-task-8",
  remoteSupabaseMutation: "not-run-in-task-8",
  schemaMigration: "not-run-in-task-8",
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-comment-text",
    "provider-error-body"
  ]
} as const;

const usageLedgerRecords: CommentTranslatorUsageLedgerRecord[] = [];

export function resolveCommentTranslatorUsagePlanEntitlement({
  plan,
  paidEntitlement
}: {
  plan: CommentTranslatorSessionPlan;
  paidEntitlement?: Pick<
    CommentTranslatorSessionPlanEntitlement,
    "planEntitlementReferenceId" | "dailyLimitMs" | "sessionLimitMs" | "translatedMessagesPerMinute" | "activeSessionsPerUser"
  >;
}): CommentTranslatorSessionPlanEntitlement {
  return createCommentTranslatorSessionPlanEntitlement({
    plan,
    paidEntitlement
  });
}

export function createCommentTranslatorUsageLedgerUserReference(
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization
): CommentTranslatorUsageLedgerUserReference | null {
  if (callerAuthorization.status !== "authorized") {
    return null;
  }

  const digest = createHash("sha256")
    .update(`comment-translator-usage-ledger:${callerAuthorization.ownerUserId}`)
    .digest("hex")
    .slice(0, 24);

  return `ctul_${digest}`;
}

export function recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  event: CommentTranslatorUsageLedgerEvent;
}) {
  const userLedgerReferenceId = createCommentTranslatorUsageLedgerUserReference(callerAuthorization);
  if (!userLedgerReferenceId) {
    return;
  }

  usageLedgerRecords.push({
    ...event,
    userLedgerReferenceId,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    authorizationHeaderValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  });
}

export function recordInMemoryCommentTranslatorSessionLedgerState({
  callerAuthorization,
  intent,
  state,
  occurredAtMs,
  planEntitlement
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  intent: "status" | "start" | "stop" | "heartbeat";
  state: CommentTranslatorSessionBrowserSafeState;
  occurredAtMs: number;
  planEntitlement: CommentTranslatorSessionPlanEntitlement;
}) {
  if (intent === "start" && state.status === "active") {
    recordInMemoryCommentTranslatorUsageLedgerEvent({
      callerAuthorization,
      event: {
        type: "session-started",
        provider: "youtube",
        planEntitlement,
        sessionReferenceId: state.sessionReferenceId,
        occurredAtMs
      }
    });
    return;
  }

  if (state.status !== "stopped") {
    return;
  }

  recordInMemoryCommentTranslatorUsageLedgerEvent({
    callerAuthorization,
    event: {
      type: "session-stopped",
      provider: "youtube",
      planEntitlement,
      sessionReferenceId: state.sessionReferenceId,
      occurredAtMs,
      elapsedMs: state.elapsedSeconds * 1_000,
      stopReason: state.stopReason
    }
  });

  const stopCategory = mapStopReasonToQuotaBudgetCategory(state.stopReason);
  if (!stopCategory) {
    return;
  }

  recordInMemoryCommentTranslatorUsageLedgerEvent({
    callerAuthorization,
    event: {
      type: "quota-budget-stop",
      provider: "youtube",
      sessionReferenceId: state.sessionReferenceId,
      occurredAtMs,
      stopReason: state.stopReason,
      stopCategory,
      clientReadableDetail: "sanitized-stop-reason-only"
    }
  });
}

export function readInMemoryCommentTranslatorUsageSnapshot({
  callerAuthorization,
  nowMs,
  plan,
  activeSession,
  paidEntitlement
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  activeSession: CommentTranslatorActiveSessionRecord | null;
  paidEntitlement?: Parameters<typeof resolveCommentTranslatorUsagePlanEntitlement>[0]["paidEntitlement"];
}): CommentTranslatorUsageLedgerSnapshot {
  const planEntitlement = resolveCommentTranslatorUsagePlanEntitlement({ plan, paidEntitlement });
  const userLedgerReferenceId = createCommentTranslatorUsageLedgerUserReference(callerAuthorization);
  const records = userLedgerReferenceId
    ? usageLedgerRecords.filter((record) => record.userLedgerReferenceId === userLedgerReferenceId)
    : [];
  const currentDay = dayBucket(nowMs);
  const dailyRecords = records.filter((record) => dayBucket(record.occurredAtMs) === currentDay);
  const activeSessionRecords = activeSession
    ? dailyRecords.filter((record) => "sessionReferenceId" in record && record.sessionReferenceId === activeSession.sessionReferenceId)
    : [];
  const currentMinuteStartedAtMs = nowMs - 60_000;

  return {
    dailyUsedMs: dailyRecords
      .filter((record): record is Extract<CommentTranslatorUsageLedgerRecord, { type: "session-stopped" }> => record.type === "session-stopped")
      .reduce((total, record) => total + Math.max(0, record.elapsedMs), 0),
    currentSessionElapsedMs: activeSession ? Math.max(0, nowMs - activeSession.startedAtMs) : 0,
    translatedMessagesInCurrentMinute: activeSessionRecords
      .filter(
        (record): record is Extract<CommentTranslatorUsageLedgerRecord, { type: "ai-usage-estimated" }> =>
          record.type === "ai-usage-estimated" && record.occurredAtMs >= currentMinuteStartedAtMs
      )
      .reduce((total, record) => total + Math.max(0, record.translatedMessageEstimate), 0),
    providerBudgetAvailable: !dailyRecords.some(
      (record) => record.type === "quota-budget-stop" && record.stopCategory === "provider-quota"
    ),
    globalBudgetAvailable: !dailyRecords.some(
      (record) => record.type === "quota-budget-stop" && record.stopCategory === "global-budget"
    ),
    aiBudgetAvailable: !dailyRecords.some((record) => record.type === "quota-budget-stop" && record.stopCategory === "ai-budget"),
    translationProviderAvailable: true,
    planEntitlement,
    providerRequestEstimate: aggregateProviderRequestEstimate(activeSessionRecords),
    aiUsageEstimate: aggregateAiUsageEstimate(activeSessionRecords)
  };
}

export function createCommentTranslatorAdminSafeAggregateMetrics({
  nowMs,
  records
}: {
  nowMs: number;
  records: readonly CommentTranslatorUsageLedgerRecord[];
}): CommentTranslatorAdminSafeAggregateMetrics {
  const activeSessionReferences = new Set<string>();
  let completedSessionMs = 0;

  for (const record of records) {
    if (record.type === "session-started") {
      activeSessionReferences.add(record.sessionReferenceId);
    }

    if (record.type === "session-stopped") {
      if (record.sessionReferenceId) {
        activeSessionReferences.delete(record.sessionReferenceId);
      }
      completedSessionMs += Math.max(0, record.elapsedMs);
    }
  }

  const providerEstimate = aggregateProviderRequestEstimate(records);
  const aiEstimate = aggregateAiUsageEstimate(records);

  return {
    generatedAtIso: new Date(nowMs).toISOString(),
    activeSessionCountEstimate: activeSessionReferences.size,
    totalCompletedSessionMinutesEstimate: Math.floor(completedSessionMs / 60_000),
    totalProviderRequestEstimate: providerEstimate.requestEstimateCount,
    totalProviderQuotaUnitEstimate: providerEstimate.quotaUnitEstimate,
    totalAiTranslatedMessageEstimate: aiEstimate.translatedMessageEstimate,
    totalAiTranslatedCharacterEstimate: aiEstimate.translatedCharacterEstimate,
    totalAiCostEstimateMicros: aiEstimate.estimatedCostMicros,
    quotaBudgetStopCounts: {
      providerQuotaStop: countStop(records, "provider-quota"),
      globalBudgetStop: countStop(records, "global-budget"),
      aiBudgetStop: countStop(records, "ai-budget"),
      translatedMessageCap: countStop(records, "translated-message-cap"),
      sessionTimeLimit: countStop(records, "session-time-limit"),
      dailyTimeLimit: countStop(records, "daily-time-limit")
    },
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    rawCommentText: "never-recorded-by-design"
  };
}

export function readInMemoryCommentTranslatorUsageLedgerRecordsForTests() {
  return [...usageLedgerRecords];
}

export function resetInMemoryCommentTranslatorUsageLedgerForTests() {
  usageLedgerRecords.splice(0, usageLedgerRecords.length);
}

function aggregateProviderRequestEstimate(
  records: readonly CommentTranslatorUsageLedgerRecord[]
): CommentTranslatorUsageLedgerProviderRequestEstimate {
  return records
    .filter(
      (record): record is Extract<CommentTranslatorUsageLedgerRecord, { type: "provider-request-estimated" }> =>
        record.type === "provider-request-estimated"
    )
    .reduce(
      (total, record) => ({
        requestEstimateCount: total.requestEstimateCount + Math.max(0, record.requestEstimateCount),
        quotaUnitEstimate: total.quotaUnitEstimate + Math.max(0, record.quotaUnitEstimate),
        providerTargetMetadata: "forbidden"
      }),
      {
        requestEstimateCount: 0,
        quotaUnitEstimate: 0,
        providerTargetMetadata: "forbidden"
      } satisfies CommentTranslatorUsageLedgerProviderRequestEstimate
    );
}

function aggregateAiUsageEstimate(records: readonly CommentTranslatorUsageLedgerRecord[]): CommentTranslatorUsageLedgerAiUsageEstimate {
  return records
    .filter(
      (record): record is Extract<CommentTranslatorUsageLedgerRecord, { type: "ai-usage-estimated" }> =>
        record.type === "ai-usage-estimated"
    )
    .reduce(
      (total, record) => ({
        translatedMessageEstimate: total.translatedMessageEstimate + Math.max(0, record.translatedMessageEstimate),
        translatedCharacterEstimate: total.translatedCharacterEstimate + Math.max(0, record.translatedCharacterEstimate),
        estimatedCostMicros: total.estimatedCostMicros + Math.max(0, record.estimatedCostMicros),
        rawCommentText: "never-recorded-by-design"
      }),
      {
        translatedMessageEstimate: 0,
        translatedCharacterEstimate: 0,
        estimatedCostMicros: 0,
        rawCommentText: "never-recorded-by-design"
      } satisfies CommentTranslatorUsageLedgerAiUsageEstimate
    );
}

function countStop(records: readonly CommentTranslatorUsageLedgerRecord[], stopCategory: CommentTranslatorUsageQuotaBudgetStopCategory) {
  return records.filter((record) => record.type === "quota-budget-stop" && record.stopCategory === stopCategory).length;
}

function mapStopReasonToQuotaBudgetCategory(
  stopReason: CommentTranslatorSessionStopReason
): CommentTranslatorUsageQuotaBudgetStopCategory | null {
  if (stopReason === "provider-quota-stop") {
    return "provider-quota";
  }

  if (stopReason === "global-budget-stop") {
    return "global-budget";
  }

  if (stopReason === "ai-budget-stop") {
    return "ai-budget";
  }

  if (stopReason === "translated-message-cap") {
    return "translated-message-cap";
  }

  if (stopReason === "session-time-limit") {
    return "session-time-limit";
  }

  if (stopReason === "daily-time-limit") {
    return "daily-time-limit";
  }

  return null;
}

function dayBucket(nowMs: number) {
  return new Date(nowMs).toISOString().slice(0, 10);
}
