import "server-only";

import type {
  CommentTranslatorUsageLedgerAiUsageEstimate,
  CommentTranslatorUsageLedgerProviderRequestEstimate,
  CommentTranslatorUsageLedgerRecord
} from "./comment-translator-usage-ledger-runtime";

export type CommentTranslatorAdminOperationalVisibilityContract = {
  implementationStage: "admin-operational-visibility-task-13";
  runtime: "server-only";
  dataShape: "aggregate-and-reference-only";
  browserStorage: "forbidden";
  handoffPayload: "unchanged";
  exportBoundary: "sanitized-aggregate-and-reference-only";
  logBoundary: "sanitized-aggregate-and-reference-only";
  providerTargetMetadata: "forbidden";
  rawCommentText: "never-recorded-by-design";
  credentialValues: "never-returned-by-design";
};

export type CommentTranslatorAdminOperationalVisibilityProviderEstimate = {
  requestEstimateCount: number;
  quotaUnitEstimate: number;
  providerTargetMetadata: "forbidden";
  runtime: "implemented-youtube-public-path" | "not-implemented-youtube-first-release";
};

export type CommentTranslatorAdminOperationalVisibilityPerUserUsage = {
  userLedgerReferenceId: string;
  activeSessionCountEstimate: number;
  completedSessionCountEstimate: number;
  completedSessionMinutesEstimate: number;
};

export type CommentTranslatorAdminOperationalVisibilitySnapshot = {
  generatedAtIso: string;
  activeSessionCountEstimate: number;
  totalCompletedSessionMinutesEstimate: number;
  perUserUsage: readonly CommentTranslatorAdminOperationalVisibilityPerUserUsage[];
  providerRequestEstimates: {
    youtube: CommentTranslatorAdminOperationalVisibilityProviderEstimate;
    twitch: CommentTranslatorAdminOperationalVisibilityProviderEstimate;
  };
  aiUsageEstimate: CommentTranslatorUsageLedgerAiUsageEstimate;
  providerTranslationErrorCounts: {
    recoverable: number;
    terminal: number;
  };
  quotaBudgetStopCounts: {
    providerQuotaStop: number;
    globalBudgetStop: number;
    aiBudgetStop: number;
    translatedMessageCap: number;
    sessionTimeLimit: number;
    dailyTimeLimit: number;
  };
  operationalStopCounts: {
    heartbeatTimeout: number;
    reconnectRequired: number;
  };
  sanitization: {
    tokenValue: "never-returned-by-design";
    refreshTokenValue: "never-returned-by-design";
    authorizationHeaderValue: "never-returned-by-design";
    providerTargetMetadata: "forbidden";
    providerErrorBody: "never-recorded-by-design";
    rawCommentText: "never-recorded-by-design";
  };
  exportBoundary: "sanitized-aggregate-and-reference-only";
  logBoundary: "sanitized-aggregate-and-reference-only";
};

export const commentTranslatorAdminOperationalVisibilityContract = {
  implementationStage: "admin-operational-visibility-task-13",
  runtime: "server-only",
  dataShape: "aggregate-and-reference-only",
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  exportBoundary: "sanitized-aggregate-and-reference-only",
  logBoundary: "sanitized-aggregate-and-reference-only",
  providerTargetMetadata: "forbidden",
  rawCommentText: "never-recorded-by-design",
  credentialValues: "never-returned-by-design"
} as const satisfies CommentTranslatorAdminOperationalVisibilityContract;

export function createCommentTranslatorAdminOperationalVisibilitySnapshot({
  nowMs,
  records
}: {
  nowMs: number;
  records: readonly CommentTranslatorUsageLedgerRecord[];
}): CommentTranslatorAdminOperationalVisibilitySnapshot {
  const activeSessionReferences = new Set<string>();
  const perUser = new Map<string, MutablePerUserUsage>();
  let completedSessionMs = 0;
  let recoverableErrorCount = 0;
  let terminalErrorCount = 0;

  for (const record of records) {
    const perUserUsage = readOrCreatePerUserUsage(perUser, record.userLedgerReferenceId);

    if (record.type === "session-started") {
      activeSessionReferences.add(record.sessionReferenceId);
      perUserUsage.activeSessionReferences.add(record.sessionReferenceId);
      continue;
    }

    if (record.type === "session-stopped") {
      if (record.sessionReferenceId) {
        activeSessionReferences.delete(record.sessionReferenceId);
        perUserUsage.activeSessionReferences.delete(record.sessionReferenceId);
      }
      const elapsedMs = Math.max(0, record.elapsedMs);
      completedSessionMs += elapsedMs;
      perUserUsage.completedSessionCountEstimate += 1;
      perUserUsage.completedSessionMs += elapsedMs;
      continue;
    }

    if (record.type === "provider-translation-error-estimated") {
      if (record.providerErrorClass === "recoverable-error") {
        recoverableErrorCount += Math.max(0, record.errorCount);
      } else {
        terminalErrorCount += Math.max(0, record.errorCount);
      }
    }
  }

  const providerEstimate = aggregateProviderRequestEstimate(records);
  const aiEstimate = aggregateAiUsageEstimate(records);

  return {
    generatedAtIso: new Date(nowMs).toISOString(),
    activeSessionCountEstimate: activeSessionReferences.size,
    totalCompletedSessionMinutesEstimate: toWholeMinutes(completedSessionMs),
    perUserUsage: Array.from(perUser.values())
      .map((usage) => ({
        userLedgerReferenceId: usage.userLedgerReferenceId,
        activeSessionCountEstimate: usage.activeSessionReferences.size,
        completedSessionCountEstimate: usage.completedSessionCountEstimate,
        completedSessionMinutesEstimate: toWholeMinutes(usage.completedSessionMs)
      }))
      .sort((left, right) => left.userLedgerReferenceId.localeCompare(right.userLedgerReferenceId)),
    providerRequestEstimates: {
      youtube: {
        ...providerEstimate,
        runtime: "implemented-youtube-public-path"
      },
      twitch: {
        requestEstimateCount: 0,
        quotaUnitEstimate: 0,
        providerTargetMetadata: "forbidden",
        runtime: "not-implemented-youtube-first-release"
      }
    },
    aiUsageEstimate: aiEstimate,
    providerTranslationErrorCounts: {
      recoverable: recoverableErrorCount,
      terminal: terminalErrorCount
    },
    quotaBudgetStopCounts: {
      providerQuotaStop: countQuotaBudgetStop(records, "provider-quota"),
      globalBudgetStop: countQuotaBudgetStop(records, "global-budget"),
      aiBudgetStop: countQuotaBudgetStop(records, "ai-budget"),
      translatedMessageCap: countQuotaBudgetStop(records, "translated-message-cap"),
      sessionTimeLimit: countQuotaBudgetStop(records, "session-time-limit"),
      dailyTimeLimit: countQuotaBudgetStop(records, "daily-time-limit")
    },
    operationalStopCounts: {
      heartbeatTimeout: countSessionStop(records, "missing-heartbeat"),
      reconnectRequired: countSessionStop(records, "reconnect-required")
    },
    sanitization: {
      tokenValue: "never-returned-by-design",
      refreshTokenValue: "never-returned-by-design",
      authorizationHeaderValue: "never-returned-by-design",
      providerTargetMetadata: "forbidden",
      providerErrorBody: "never-recorded-by-design",
      rawCommentText: "never-recorded-by-design"
    },
    exportBoundary: "sanitized-aggregate-and-reference-only",
    logBoundary: "sanitized-aggregate-and-reference-only"
  };
}

type MutablePerUserUsage = {
  userLedgerReferenceId: string;
  activeSessionReferences: Set<string>;
  completedSessionCountEstimate: number;
  completedSessionMs: number;
};

function readOrCreatePerUserUsage(perUser: Map<string, MutablePerUserUsage>, userLedgerReferenceId: string) {
  const existing = perUser.get(userLedgerReferenceId);
  if (existing) {
    return existing;
  }

  const usage = {
    userLedgerReferenceId,
    activeSessionReferences: new Set<string>(),
    completedSessionCountEstimate: 0,
    completedSessionMs: 0
  };
  perUser.set(userLedgerReferenceId, usage);
  return usage;
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

function countQuotaBudgetStop(records: readonly CommentTranslatorUsageLedgerRecord[], stopCategory: string) {
  return records.filter((record) => record.type === "quota-budget-stop" && record.stopCategory === stopCategory).length;
}

function countSessionStop(records: readonly CommentTranslatorUsageLedgerRecord[], stopReason: string) {
  return records.filter((record) => record.type === "session-stopped" && record.stopReason === stopReason).length;
}

function toWholeMinutes(ms: number) {
  return Math.floor(ms / 60_000);
}
