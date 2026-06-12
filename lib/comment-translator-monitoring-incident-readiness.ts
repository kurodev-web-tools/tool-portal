import "server-only";

import type { CommentTranslatorAdminOperationalVisibilitySnapshot } from "./comment-translator-admin-operational-visibility";

export type CommentTranslatorMonitoringIncidentObservableSignal =
  | "provider-cost-spike"
  | "youtube-quota-stop"
  | "translation-error-class"
  | "stripe-webhook-failure"
  | "session-failure-timeout"
  | "rollback-trigger"
  | "support-escalation";

export type CommentTranslatorMonitoringIncidentAlertId = Exclude<
  CommentTranslatorMonitoringIncidentObservableSignal,
  "rollback-trigger" | "support-escalation"
>;

export type CommentTranslatorMonitoringIncidentThresholds = {
  aiCostSpikeMicros: number;
  youtubeQuotaUnitSpike: number;
  translationErrorCount: number;
  stripeWebhookFailureCount: number;
  sessionFailureTimeoutCount: number;
};

export type CommentTranslatorMonitoringStripeWebhookOutcome = {
  status: "applied" | "ignored" | "rejected";
  reason?:
    | "unsupported-event"
    | "missing-billing-user-reference"
    | "missing-signature"
    | "missing-config"
    | "invalid-signature";
  count?: number;
};

export type CommentTranslatorMonitoringIncidentAlert = {
  id: CommentTranslatorMonitoringIncidentAlertId;
  severity: "warning" | "critical";
  observedCount: number;
  thresholdCount: number;
  sourceMetric:
    | "admin-ai-estimated-cost-micros"
    | "admin-youtube-provider-quota-stop-count"
    | "admin-youtube-quota-unit-estimate"
    | "admin-provider-translation-error-count"
    | "stripe-webhook-rejected-or-ignored-count"
    | "admin-session-failure-timeout-count";
  operatorAction: string;
  clientReadableOutput: "sanitized-aggregate-only";
};

export type CommentTranslatorMonitoringIncidentReadinessReport = {
  stage: typeof commentTranslatorMonitoringIncidentReadinessContract.implementationStage;
  generatedAtIso: string;
  outputPolicy: "sanitized-aggregate-and-reference-only";
  publicLaunchAllowed: false;
  remoteAlertDashboardMutationStatus: "not-run";
  thresholds: CommentTranslatorMonitoringIncidentThresholds;
  alerts: readonly CommentTranslatorMonitoringIncidentAlert[];
  providerCostEstimateMicros: number;
  youtubeQuotaUnitEstimate: number;
  youtubeQuotaStopCount: number;
  translationErrorClassCounts: {
    recoverable: number;
    terminal: number;
  };
  stripeWebhookFailureCounts: {
    applied: number;
    ignored: number;
    rejected: number;
  };
  sessionFailureTimeoutCounts: {
    heartbeatTimeout: number;
    reconnectRequired: number;
  };
  rollbackTriggers: readonly string[];
  supportEscalationPath: readonly string[];
  sanitization: {
    tokenValue: "never-returned-by-design";
    refreshTokenValue: "never-returned-by-design";
    authorizationHeaderValue: "never-returned-by-design";
    stripeSecretKeyValue: "never-returned-by-design";
    stripeWebhookSigningSecretValue: "never-returned-by-design";
    providerTargetMetadata: "forbidden";
    providerErrorBody: "never-recorded-by-design";
    rawCommentText: "never-recorded-by-design";
  };
  remoteMutation: "not-run-by-contract";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
};

export const commentTranslatorMonitoringIncidentReadinessContract = {
  implementationStage: "pre-main-task-24-monitoring-alerting-incident-readiness",
  runtime: "server-only",
  outputPolicy: "sanitized-aggregate-and-reference-only",
  remoteAlertDashboardMutation: "not-run-by-contract",
  remoteSchemaMigration: "not-run-by-contract",
  liveProviderExecution: "not-run-by-contract",
  stripeLiveModeAction: "not-run-by-contract",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  publicLaunchCapability: "blocked-until-monitoring-and-durable-backing-are-approved",
  observableSignals: [
    "provider-cost-spike",
    "youtube-quota-stop",
    "translation-error-class",
    "stripe-webhook-failure",
    "session-failure-timeout",
    "rollback-trigger",
    "support-escalation"
  ],
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "stripe-secret-key-value",
    "stripe-webhook-secret-value",
    "provider-target-metadata",
    "provider-error-body",
    "raw-comment-text",
    "raw-request-ip"
  ]
} as const;

export const commentTranslatorMonitoringIncidentDefaultThresholds: CommentTranslatorMonitoringIncidentThresholds = {
  aiCostSpikeMicros: 1_000_000,
  youtubeQuotaUnitSpike: 500,
  translationErrorCount: 5,
  stripeWebhookFailureCount: 1,
  sessionFailureTimeoutCount: 1
} as const;

export const commentTranslatorMonitoringIncidentRollbackTriggers = [
  "freeze-new-public-comment-translator-sessions",
  "disable-paid-checkout-entry-if-webhook-failures-persist",
  "fail-closed-provider-execution-when-cost-or-quota-alerts-fire",
  "keep-free-plan-account-access-available-while-session-starts-are-disabled",
  "preserve-sanitized-aggregate-evidence-before-changing-dashboard-or-provider-settings"
] as const;

export const commentTranslatorMonitoringIncidentSupportEscalationPath = [
  "collect-sanitized-aggregate-report",
  "record-time-window-route-name-and-alert-id-only",
  "check-operator-local-provider-and-billing-dashboard-without-pasting-private-values",
  "escalate-to-operator-with-reference-only-event-window",
  "open-follow-up-task-for-approved-dashboard-or-durable-store-work"
] as const;

export function createCommentTranslatorMonitoringIncidentReadinessReport({
  nowMs,
  adminSnapshot,
  stripeWebhookOutcomes = [],
  thresholds = commentTranslatorMonitoringIncidentDefaultThresholds
}: {
  nowMs: number;
  adminSnapshot: CommentTranslatorAdminOperationalVisibilitySnapshot;
  stripeWebhookOutcomes?: readonly CommentTranslatorMonitoringStripeWebhookOutcome[];
  thresholds?: Partial<CommentTranslatorMonitoringIncidentThresholds>;
}): CommentTranslatorMonitoringIncidentReadinessReport {
  const normalizedThresholds = normalizeThresholds(thresholds);
  const providerCostEstimateMicros = Math.max(0, adminSnapshot.aiUsageEstimate.estimatedCostMicros);
  const youtubeQuotaUnitEstimate = Math.max(0, adminSnapshot.providerRequestEstimates.youtube.quotaUnitEstimate);
  const youtubeQuotaStopCount = Math.max(0, adminSnapshot.quotaBudgetStopCounts.providerQuotaStop);
  const translationErrorClassCounts = {
    recoverable: Math.max(0, adminSnapshot.providerTranslationErrorCounts.recoverable),
    terminal: Math.max(0, adminSnapshot.providerTranslationErrorCounts.terminal)
  };
  const stripeWebhookFailureCounts = aggregateStripeWebhookOutcomes(stripeWebhookOutcomes);
  const sessionFailureTimeoutCounts = {
    heartbeatTimeout: Math.max(0, adminSnapshot.operationalStopCounts.heartbeatTimeout),
    reconnectRequired: Math.max(0, adminSnapshot.operationalStopCounts.reconnectRequired)
  };
  const alerts = createAlerts({
    thresholds: normalizedThresholds,
    providerCostEstimateMicros,
    youtubeQuotaUnitEstimate,
    youtubeQuotaStopCount,
    translationErrorClassCounts,
    stripeWebhookFailureCounts,
    sessionFailureTimeoutCounts
  });

  return {
    stage: commentTranslatorMonitoringIncidentReadinessContract.implementationStage,
    generatedAtIso: new Date(nowMs).toISOString(),
    outputPolicy: "sanitized-aggregate-and-reference-only",
    publicLaunchAllowed: false,
    remoteAlertDashboardMutationStatus: "not-run",
    thresholds: normalizedThresholds,
    alerts,
    providerCostEstimateMicros,
    youtubeQuotaUnitEstimate,
    youtubeQuotaStopCount,
    translationErrorClassCounts,
    stripeWebhookFailureCounts,
    sessionFailureTimeoutCounts,
    rollbackTriggers: commentTranslatorMonitoringIncidentRollbackTriggers,
    supportEscalationPath: commentTranslatorMonitoringIncidentSupportEscalationPath,
    sanitization: {
      tokenValue: "never-returned-by-design",
      refreshTokenValue: "never-returned-by-design",
      authorizationHeaderValue: "never-returned-by-design",
      stripeSecretKeyValue: "never-returned-by-design",
      stripeWebhookSigningSecretValue: "never-returned-by-design",
      providerTargetMetadata: "forbidden",
      providerErrorBody: "never-recorded-by-design",
      rawCommentText: "never-recorded-by-design"
    },
    remoteMutation: "not-run-by-contract",
    browserStorage: "unchanged",
    handoffPayload: "unchanged"
  };
}

function createAlerts({
  thresholds,
  providerCostEstimateMicros,
  youtubeQuotaUnitEstimate,
  youtubeQuotaStopCount,
  translationErrorClassCounts,
  stripeWebhookFailureCounts,
  sessionFailureTimeoutCounts
}: {
  thresholds: CommentTranslatorMonitoringIncidentThresholds;
  providerCostEstimateMicros: number;
  youtubeQuotaUnitEstimate: number;
  youtubeQuotaStopCount: number;
  translationErrorClassCounts: CommentTranslatorMonitoringIncidentReadinessReport["translationErrorClassCounts"];
  stripeWebhookFailureCounts: CommentTranslatorMonitoringIncidentReadinessReport["stripeWebhookFailureCounts"];
  sessionFailureTimeoutCounts: CommentTranslatorMonitoringIncidentReadinessReport["sessionFailureTimeoutCounts"];
}) {
  const alerts: CommentTranslatorMonitoringIncidentAlert[] = [];

  if (providerCostEstimateMicros >= thresholds.aiCostSpikeMicros) {
    alerts.push({
      id: "provider-cost-spike",
      severity: "critical",
      observedCount: providerCostEstimateMicros,
      thresholdCount: thresholds.aiCostSpikeMicros,
      sourceMetric: "admin-ai-estimated-cost-micros",
      operatorAction: "freeze new sessions and review provider routing, fallback, and budget settings with sanitized counts only",
      clientReadableOutput: "sanitized-aggregate-only"
    });
  }

  if (youtubeQuotaStopCount > 0 || youtubeQuotaUnitEstimate >= thresholds.youtubeQuotaUnitSpike) {
    alerts.push({
      id: "youtube-quota-stop",
      severity: youtubeQuotaStopCount > 0 ? "critical" : "warning",
      observedCount: youtubeQuotaStopCount > 0 ? youtubeQuotaStopCount : youtubeQuotaUnitEstimate,
      thresholdCount: youtubeQuotaStopCount > 0 ? 1 : thresholds.youtubeQuotaUnitSpike,
      sourceMetric: youtubeQuotaStopCount > 0 ? "admin-youtube-provider-quota-stop-count" : "admin-youtube-quota-unit-estimate",
      operatorAction: "stop new polling sessions and preserve quota stop counts before any provider dashboard change",
      clientReadableOutput: "sanitized-aggregate-only"
    });
  }

  const translationErrorCount = translationErrorClassCounts.recoverable + translationErrorClassCounts.terminal;
  if (translationErrorCount >= thresholds.translationErrorCount) {
    alerts.push({
      id: "translation-error-class",
      severity: translationErrorClassCounts.terminal > 0 ? "critical" : "warning",
      observedCount: translationErrorCount,
      thresholdCount: thresholds.translationErrorCount,
      sourceMetric: "admin-provider-translation-error-count",
      operatorAction: "review provider error class counts and keep raw provider bodies out of logs and support notes",
      clientReadableOutput: "sanitized-aggregate-only"
    });
  }

  const stripeWebhookFailureCount = stripeWebhookFailureCounts.rejected + stripeWebhookFailureCounts.ignored;
  if (stripeWebhookFailureCount >= thresholds.stripeWebhookFailureCount) {
    alerts.push({
      id: "stripe-webhook-failure",
      severity: "critical",
      observedCount: stripeWebhookFailureCount,
      thresholdCount: thresholds.stripeWebhookFailureCount,
      sourceMetric: "stripe-webhook-rejected-or-ignored-count",
      operatorAction: "disable paid checkout entry if failures persist and inspect signed webhook evidence without secret values",
      clientReadableOutput: "sanitized-aggregate-only"
    });
  }

  const sessionFailureTimeoutCount = sessionFailureTimeoutCounts.heartbeatTimeout + sessionFailureTimeoutCounts.reconnectRequired;
  if (sessionFailureTimeoutCount >= thresholds.sessionFailureTimeoutCount) {
    alerts.push({
      id: "session-failure-timeout",
      severity: "warning",
      observedCount: sessionFailureTimeoutCount,
      thresholdCount: thresholds.sessionFailureTimeoutCount,
      sourceMetric: "admin-session-failure-timeout-count",
      operatorAction: "check session heartbeat, reconnect, and browser disconnect rates before public exposure",
      clientReadableOutput: "sanitized-aggregate-only"
    });
  }

  return alerts;
}

function aggregateStripeWebhookOutcomes(outcomes: readonly CommentTranslatorMonitoringStripeWebhookOutcome[]) {
  return outcomes.reduce(
    (total, outcome) => {
      const count = normalizeCount(outcome.count);
      if (outcome.status === "applied") {
        total.applied += count;
      } else if (outcome.status === "ignored") {
        total.ignored += count;
      } else {
        total.rejected += count;
      }

      return total;
    },
    {
      applied: 0,
      ignored: 0,
      rejected: 0
    }
  );
}

function normalizeThresholds(
  thresholds: Partial<CommentTranslatorMonitoringIncidentThresholds>
): CommentTranslatorMonitoringIncidentThresholds {
  return {
    aiCostSpikeMicros: normalizeCount(thresholds.aiCostSpikeMicros, commentTranslatorMonitoringIncidentDefaultThresholds.aiCostSpikeMicros),
    youtubeQuotaUnitSpike: normalizeCount(
      thresholds.youtubeQuotaUnitSpike,
      commentTranslatorMonitoringIncidentDefaultThresholds.youtubeQuotaUnitSpike
    ),
    translationErrorCount: normalizeCount(thresholds.translationErrorCount, commentTranslatorMonitoringIncidentDefaultThresholds.translationErrorCount),
    stripeWebhookFailureCount: normalizeCount(
      thresholds.stripeWebhookFailureCount,
      commentTranslatorMonitoringIncidentDefaultThresholds.stripeWebhookFailureCount
    ),
    sessionFailureTimeoutCount: normalizeCount(
      thresholds.sessionFailureTimeoutCount,
      commentTranslatorMonitoringIncidentDefaultThresholds.sessionFailureTimeoutCount
    )
  };
}

function normalizeCount(value: number | null | undefined, fallback = 1) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
