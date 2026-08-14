import "server-only";

import { createClient } from "@supabase/supabase-js";

const dayMilliseconds = 24 * 60 * 60 * 1_000;
const paidDailyPollLimit = 100_000;
const paidPollSafetyMargin = 20_000;

export const commentTranslatorPaidRetentionPolicy = {
  sessionEndedPlus24Hours: dayMilliseconds,
  feedSnapshotAfterSessionEndMs: dayMilliseconds,
  providerDetailDays: 30,
  sessionSummaryDays: 90,
  stripeEventDays: 90,
  aggregateMonths: 13,
  standardFeedSnapshotBytes: 8 * 1024,
  hardFeedSnapshotBytes: 64 * 1024,
  cleanupMaxBatchSize: 500,
  paidPollDailyLimit: paidDailyPollLimit,
  paidPollSafetyMargin,
  storageMeasurementAuthority: "pg_total_relation_size",
  externalMeasurementStatus: "externally-unverified"
} as const;

export type CommentTranslatorPaidRetentionKind =
  | "feed-snapshot"
  | "provider-detail"
  | "session-summary"
  | "stripe-event"
  | "aggregate"
  | "ended-subscription";

export type CommentTranslatorPaidSchedulerAuthority =
  | "supabase-cron"
  | "cloudflare-cron-fallback"
  | "unavailable";

export type CommentTranslatorPaidSchedulerConfiguration = {
  supabaseCronAvailable: boolean;
  cloudflareCronAvailable: boolean;
  configuredAuthority?: Exclude<CommentTranslatorPaidSchedulerAuthority, "unavailable">;
  callerAuthority?: Exclude<CommentTranslatorPaidSchedulerAuthority, "unavailable">;
};

export type CommentTranslatorPaidRetentionCleanupCounts = {
  feedSnapshotDeleted: number;
  providerHourlyDetailDeleted: number;
  sessionSummaryDeleted: number;
  stripeEventDeleted: number;
  aggregateDeleted: number;
  endedSubscriptionDeleted: number;
  attemptLedgerDeleted: number;
};

type RetentionCleanupRpcResult = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

type RetentionCleanupSupabaseClient = {
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<RetentionCleanupRpcResult>;
};

export type CommentTranslatorPaidRetentionCleanupStore = {
  runBoundedCleanup: (request: { nowIso: string; limit: number }) => Promise<CommentTranslatorPaidRetentionCleanupCounts>;
  recordSchedulerRun?: (request: {
    authority: Exclude<CommentTranslatorPaidSchedulerAuthority, "unavailable">;
    runAtIso: string;
    status: "success" | "failed" | "stale" | "retry-scheduled" | "unavailable";
    claimCount: number;
    retryCount: number;
    staleCount: number;
    errorClassCounts: Record<string, number>;
    lastSuccessAtIso: string | null;
  }) => Promise<boolean>;
};

export const commentTranslatorPaidRetentionContract = {
  implementationStage: "comment-translator-paid-v1-task9-retention-cleanup",
  runtime: "server-only",
  cleanupRpcName: "ct_paid_run_retention_cleanup",
  schedulerStandard: "supabase-cron",
  schedulerFallback: "cloudflare-cron-fallback",
  schedulerAuthority: "one-authority-per-environment",
  ambiguousSchedulerPolicy: "fail-closed-unless-explicit-supabase-standard",
  scheduledMaintenanceSeam: "same-bounded-cleanup-and-reconcile-invocation",
  deploymentStatus: "repository-invocation-seam-only-not-deployed",
  cleanupIdempotency: "bounded-delete-with-skip-locked-recheck",
  rawProviderPayload: "never-recorded-by-design",
  commentHash: "forbidden",
  privateIdentifier: "never-returned-by-design",
  browserReadableOutput: "sanitized-aggregate-and-reference-only",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread"
} as const;

export const commentTranslatorPaidTask9SchedulerDefinition = {
  invocationPath: "/api/comment-translator/paid-maintenance",
  schedule: "*/5 * * * *",
  authorityEnv: "COMMENT_TRANSLATOR_PAID_SCHEDULER_AUTHORITY",
  tokenEnv: "COMMENT_TRANSLATOR_PAID_CRON_TOKEN",
  supabaseAuthority: "supabase-cron",
  supabaseCronInvocationFunction: "ct_paid_invoke_maintenance_http",
  supabaseCronBindingStatus: "existing-supabase-cron-binding-externally-unverified",
  cloudflareFallbackAuthority: "cloudflare-cron-fallback",
  cleanupRpcName: commentTranslatorPaidRetentionContract.cleanupRpcName,
  cleanupLimit: commentTranslatorPaidRetentionPolicy.cleanupMaxBatchSize,
  reconcileLimit: 50,
  sameBoundedClaimRpc: "ct_paid_claim_reconciler",
  schedulerPolicy: "one-authority-per-environment-no-new-service-queue-or-scheduler"
} as const;

export function resolveCommentTranslatorPaidRetentionCutoffIso({
  kind,
  nowIso
}: {
  kind: CommentTranslatorPaidRetentionKind;
  nowIso: string;
}): string {
  const now = new Date(nowIso);
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Paid retention cutoff timestamp is invalid.");
  }

  if (kind === "aggregate" || kind === "ended-subscription") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - commentTranslatorPaidRetentionPolicy.aggregateMonths, 1)).toISOString();
  }

  const days = kind === "provider-detail"
    ? commentTranslatorPaidRetentionPolicy.providerDetailDays
    : kind === "session-summary" || kind === "stripe-event"
      ? commentTranslatorPaidRetentionPolicy.sessionSummaryDays
      : 1;
  return new Date(now.getTime() - days * dayMilliseconds).toISOString();
}

export function selectCommentTranslatorPaidSchedulerAuthority({
  supabaseCronAvailable,
  cloudflareCronAvailable,
  configuredAuthority,
  callerAuthority
}: CommentTranslatorPaidSchedulerConfiguration): {
  authority: CommentTranslatorPaidSchedulerAuthority;
  cleanupRpcName: typeof commentTranslatorPaidRetentionContract.cleanupRpcName;
  singleAuthority: true;
  errorClass: "scheduler-unavailable" | "scheduler-ambiguous" | null;
} {
  if (callerAuthority && configuredAuthority && callerAuthority !== configuredAuthority) {
    return schedulerSelection("unavailable", "scheduler-ambiguous");
  }
  if (supabaseCronAvailable && cloudflareCronAvailable) {
    return schedulerSelection("unavailable", "scheduler-ambiguous");
  }
  if (configuredAuthority === "supabase-cron" && !supabaseCronAvailable) {
    return schedulerSelection("unavailable", "scheduler-unavailable");
  }
  if (configuredAuthority === "cloudflare-cron-fallback" && (!cloudflareCronAvailable || supabaseCronAvailable)) {
    return schedulerSelection(
      "unavailable",
      supabaseCronAvailable ? "scheduler-ambiguous" : "scheduler-unavailable"
    );
  }
  if (supabaseCronAvailable) {
    return schedulerSelection("supabase-cron", null);
  }
  if (cloudflareCronAvailable) {
    return schedulerSelection("cloudflare-cron-fallback", null);
  }
  return schedulerSelection("unavailable", "scheduler-unavailable");
}

function schedulerSelection(
  authority: CommentTranslatorPaidSchedulerAuthority,
  errorClass: "scheduler-unavailable" | "scheduler-ambiguous" | null
) {
  return {
    authority,
    cleanupRpcName: commentTranslatorPaidRetentionContract.cleanupRpcName,
    singleAuthority: true as const,
    errorClass
  };
}

export function measureCommentTranslatorPaidFeedSnapshotBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function isCommentTranslatorPaidFeedSnapshotWithinHardLimit(value: unknown): boolean {
  return resolveCommentTranslatorPaidFeedSnapshotSizeDisposition(value) !== "hard-limit-exceeded";
}

export function resolveCommentTranslatorPaidFeedSnapshotSizeDisposition(
  value: unknown
): "standard" | "oversize-within-hard-limit" | "hard-limit-exceeded" {
  const bytes = measureCommentTranslatorPaidFeedSnapshotBytes(value);
  if (bytes <= commentTranslatorPaidRetentionPolicy.standardFeedSnapshotBytes) {
    return "standard";
  }
  return bytes <= commentTranslatorPaidRetentionPolicy.hardFeedSnapshotBytes
    ? "oversize-within-hard-limit"
    : "hard-limit-exceeded";
}

export function calculateCommentTranslatorPaidRetentionRowPlan({
  activeUsers,
  sessionHoursPerDay,
  days,
  providerCount
}: {
  activeUsers: number;
  sessionHoursPerDay: number;
  days: number;
  providerCount: number;
}) {
  const naiveMinuteRowsPerProvider = activeUsers * sessionHoursPerDay * 60 * days;
  const hourBucketRowsPerProvider = activeUsers * sessionHoursPerDay * days;
  return {
    naiveMinuteRowsPerProvider,
    naiveMinuteRowsAllProviders: naiveMinuteRowsPerProvider * providerCount,
    hourBucketRowsPerProvider,
    hourBucketRowsAllProviders: hourBucketRowsPerProvider * providerCount
  };
}

export function runCommentTranslatorPaidRetentionLoadHarness({
  targetAvailable,
  scenario = "standard"
}: {
  targetAvailable: boolean;
  scenario?: "standard" | "max-dispatch";
}) {
  const activeUsers = 20;
  const hoursPerDay = 24;
  const minutesPerHour = 60;
  const pollsPerMinute = 4;
  const providerCount = 2;
  const internalDbReadsPerComment = 12;
  const internalDbWritesPerComment = 12;
  const counters = {
    harnessIterationsPerDay: 0,
    pollRequestsPerDay: 0,
    commentsPerDay: 0,
    providerRpcCallsPerDay: 0,
    heartbeatWritesPerDay: 0,
    attemptReceiptRowsPerDay: 0,
    feedRowWritesPerDay: 0,
    providerHourlyDetailCleanupRowsPerDay: 0,
    attemptLedgerCleanupRowsPerDay: 0,
    dbReadOperationsPerDay: 0,
    dbWriteOperationsPerDay: 0,
    sessionStartAndPollBudgetReservationsPerDay: 0
  };

  for (let userIndex = 0; userIndex < activeUsers; userIndex += 1) {
    for (let hour = 0; hour < hoursPerDay; hour += 1) {
      for (let minute = 0; minute < minutesPerHour; minute += 1) {
        counters.heartbeatWritesPerDay += 1;
        if (targetAvailable && minute === 0 && hour % 3 === 0) {
          counters.sessionStartAndPollBudgetReservationsPerDay += 1;
        }
        if (targetAvailable && minute === 0) {
          counters.providerHourlyDetailCleanupRowsPerDay += providerCount;
        }
        for (let poll = 0; poll < pollsPerMinute; poll += 1) {
          counters.harnessIterationsPerDay += 1;
          counters.pollRequestsPerDay += 1;
          const dispatchAvailableComment = targetAvailable && (scenario === "max-dispatch" || poll === 0);
          if (!dispatchAvailableComment) {
            continue;
          }
          counters.attemptReceiptRowsPerDay += 1;
          counters.attemptLedgerCleanupRowsPerDay += 1;
          counters.commentsPerDay += 1;
          counters.providerRpcCallsPerDay += providerCount;
          counters.feedRowWritesPerDay += 1;
          counters.dbReadOperationsPerDay += internalDbReadsPerComment;
          counters.dbWriteOperationsPerDay += internalDbWritesPerComment;
        }
      }
    }
  }
  return counters;
}

export function createCommentTranslatorPaidRetentionLoadFixture() {
  const activeUsers = 20;
  const daysPerStoragePlan = 30;
  const standardScenario = runCommentTranslatorPaidRetentionLoadHarness({ targetAvailable: true });
  const maxDispatchScenario = runCommentTranslatorPaidRetentionLoadHarness({
    targetAvailable: true,
    scenario: "max-dispatch"
  });
  const emptyScenario = runCommentTranslatorPaidRetentionLoadHarness({ targetAvailable: false });
  return {
    activeUsers,
    pollingSeconds: 15,
    ...standardScenario,
    standardScenario,
    maxDispatchScenario,
    attemptReceiptRowsFor27Hours: maxDispatchScenario.attemptReceiptRowsPerDay * 27 / 24,
    maxDispatchAttemptReceiptRowsFor27Hours: maxDispatchScenario.attemptReceiptRowsPerDay * 27 / 24,
    sessionSummaryRowsFor90Days: standardScenario.sessionStartAndPollBudgetReservationsPerDay * 90,
    dbReadOperationsPer30Days: standardScenario.dbReadOperationsPerDay * daysPerStoragePlan,
    dbWriteOperationsPer30Days: standardScenario.dbWriteOperationsPerDay * daysPerStoragePlan,
    heartbeatWritesPer30Days: standardScenario.heartbeatWritesPerDay * daysPerStoragePlan,
    sessionStartAndPollBudgetReservationsPer30Days:
      standardScenario.sessionStartAndPollBudgetReservationsPerDay * daysPerStoragePlan,
    paidStoragePlanBytes: 216_000_000,
    storageMeasurementAuthority: commentTranslatorPaidRetentionPolicy.storageMeasurementAuthority,
    externalMeasurementStatus: commentTranslatorPaidRetentionPolicy.externalMeasurementStatus,
    emptyCommentProviderCallsPerDay: emptyScenario.providerRpcCallsPerDay,
    emptyCommentAttemptReceiptRowsPerDay: emptyScenario.attemptReceiptRowsPerDay,
    emptyTargetScenario: {
      harnessIterationsPerDay: emptyScenario.harnessIterationsPerDay,
      pollRequestsPerDay: emptyScenario.pollRequestsPerDay,
      commentsPerDay: emptyScenario.commentsPerDay,
      providerRpcCallsPerDay: emptyScenario.providerRpcCallsPerDay,
      heartbeatWritesPerDay: emptyScenario.heartbeatWritesPerDay,
      attemptReceiptRowsPerDay: emptyScenario.attemptReceiptRowsPerDay,
      feedRowWritesPerDay: emptyScenario.feedRowWritesPerDay,
      dbReadOperationsPerDay: emptyScenario.dbReadOperationsPerDay,
      dbWriteOperationsPerDay: emptyScenario.dbWriteOperationsPerDay
    }
  } as const;
}

export function computeCommentTranslatorPaidDailyPollBudget({ p95BaselineRequests }: { p95BaselineRequests: number }): number {
  if (!Number.isFinite(p95BaselineRequests) || p95BaselineRequests < 0) {
    throw new Error("Cloudflare P95 baseline request count is invalid.");
  }
  return Math.max(0, paidDailyPollLimit - Math.ceil(p95BaselineRequests) - paidPollSafetyMargin);
}

export function resolveCommentTranslatorPaidPollStopDisposition({
  reservedPolls,
  dailyBudget
}: {
  reservedPolls: number;
  dailyBudget: number;
}) {
  if (!Number.isFinite(reservedPolls) || reservedPolls < 0 || !Number.isFinite(dailyBudget) || dailyBudget <= 0) {
    throw new Error("Paid poll budget input is invalid.");
  }
  return {
    checkout: reservedPolls >= dailyBudget * 0.8 ? "stop" : "allow",
    newSession: reservedPolls >= dailyBudget * 0.9 ? "stop" : "allow",
    activeAutoPoll: reservedPolls >= dailyBudget * 0.95 ? "stop" : "allow",
    stopClientAutoPoll: reservedPolls >= dailyBudget * 0.95
  } as const;
}

export function resolveCommentTranslatorPaidPollReservationForUtcBoundary({ nowIso }: { nowIso: string }): number {
  const now = new Date(nowIso);
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Paid poll reservation timestamp is invalid.");
  }
  const nextUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, Math.min(720, Math.floor((nextUtcMidnight - now.getTime()) / 15_000)));
}

export function createCommentTranslatorPaidRetentionStore({
  supabase
}: {
  supabase: RetentionCleanupSupabaseClient;
}): CommentTranslatorPaidRetentionCleanupStore {
  return {
    async runBoundedCleanup({ nowIso, limit }) {
      if (!Number.isInteger(limit) || limit < 1 || limit > commentTranslatorPaidRetentionPolicy.cleanupMaxBatchSize) {
        throw new Error("Paid retention cleanup limit is invalid.");
      }
      const result = await supabase.rpc(commentTranslatorPaidRetentionContract.cleanupRpcName, {
        p_now: nowIso,
        p_limit: limit
      });
      if (result.error) {
        throw new Error("Paid retention cleanup RPC failed.");
      }
      return readCleanupCounts(result.data);
    },
    async recordSchedulerRun(request) {
      const result = await supabase.rpc("ct_paid_record_sanitized_scheduler_run", {
        p_authority: request.authority,
        p_run_at: request.runAtIso,
        p_status: request.status,
        p_claim_count: request.claimCount,
        p_retry_count: request.retryCount,
        p_stale_count: request.staleCount,
        p_error_class_counts: request.errorClassCounts,
        p_last_success_at: request.lastSuccessAtIso
      });
      return result.error === null && result.data === true;
    }
  };
}

export async function runCommentTranslatorPaidRetentionJob({
  scheduler,
  cleanupStore,
  nowIso,
  limit = commentTranslatorPaidRetentionPolicy.cleanupMaxBatchSize
}: {
  scheduler: CommentTranslatorPaidSchedulerConfiguration;
  cleanupStore: CommentTranslatorPaidRetentionCleanupStore;
  nowIso: string;
  limit?: number;
}) {
  const authority = selectCommentTranslatorPaidSchedulerAuthority(scheduler);
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), commentTranslatorPaidRetentionPolicy.cleanupMaxBatchSize);
  if (authority.authority === "unavailable") {
    return {
      status: "unavailable" as const,
      schedulerAuthority: authority.authority,
      deletedCount: 0,
      limit: boundedLimit,
      errorClass: authority.errorClass ?? "scheduler-unavailable" as const,
      outputBoundary: commentTranslatorPaidRetentionContract.browserReadableOutput
    };
  }

  try {
    const counts = await cleanupStore.runBoundedCleanup({ nowIso, limit: boundedLimit });
    return {
      status: "success" as const,
      schedulerAuthority: authority.authority,
      deletedCount: sumCleanupCounts(counts),
      limit: boundedLimit,
      counts,
      lastSuccessAtIso: nowIso,
      outputBoundary: commentTranslatorPaidRetentionContract.browserReadableOutput
    };
  } catch {
    return {
      status: "failed" as const,
      schedulerAuthority: authority.authority,
      deletedCount: 0,
      limit: boundedLimit,
      errorClass: "database-transaction-failed" as const,
      lastSuccessAtIso: null,
      outputBoundary: commentTranslatorPaidRetentionContract.browserReadableOutput
    };
  }
}

export type CommentTranslatorPaidScheduledReconcileMetrics = {
  status?: "success" | "retry-scheduled" | "stale";
  claimedCount: number;
  retryCount: number;
  staleCount: number;
  errorClassCounts: Partial<Record<string, number>>;
};

export async function runCommentTranslatorPaidTask9ScheduledMaintenance({
  scheduler,
  cleanupStore,
  runReconcile,
  nowIso,
  cleanupLimit = commentTranslatorPaidRetentionPolicy.cleanupMaxBatchSize,
  reconcileLimit = 50
}: {
  scheduler: CommentTranslatorPaidSchedulerConfiguration;
  cleanupStore: CommentTranslatorPaidRetentionCleanupStore;
  runReconcile: (request: { nowIso: string; limit: number }) => Promise<CommentTranslatorPaidScheduledReconcileMetrics>;
  nowIso: string;
  cleanupLimit?: number;
  reconcileLimit?: number;
}) {
  const authority = selectCommentTranslatorPaidSchedulerAuthority(scheduler);
  const boundedCleanupLimit = Math.min(
    Math.max(Math.trunc(cleanupLimit), 1),
    commentTranslatorPaidRetentionPolicy.cleanupMaxBatchSize
  );
  const boundedReconcileLimit = Math.min(Math.max(Math.trunc(reconcileLimit), 0), 50);
  const base = {
    schedulerAuthority: authority.authority,
    cleanupLimit: boundedCleanupLimit,
    reconcileLimit: boundedReconcileLimit,
    outputBoundary: commentTranslatorPaidRetentionContract.browserReadableOutput,
    deploymentStatus: commentTranslatorPaidRetentionContract.deploymentStatus
  } as const;

  if (authority.authority === "unavailable") {
    return {
      ...base,
      status: "unavailable" as const,
      deletedCount: 0,
      claimCount: 0,
      retryCount: 0,
      staleCount: 0,
      errorClassCounts: {},
      errorClass: authority.errorClass ?? "scheduler-unavailable",
      lastSuccessAtIso: null
    };
  }

  const [cleanupResult, reconcileResult] = await Promise.allSettled([
    cleanupStore.runBoundedCleanup({ nowIso, limit: boundedCleanupLimit }),
    runReconcile({ nowIso, limit: boundedReconcileLimit })
  ]);
  const counts = cleanupResult.status === "fulfilled" ? cleanupResult.value : null;
  const reconcile = reconcileResult.status === "fulfilled" ? reconcileResult.value : null;
  if (counts && reconcile) {
    const retryCount = normalizeCount(reconcile.retryCount);
    const staleCount = normalizeCount(reconcile.staleCount);
    const reconcileStatus = reconcile.status === "stale" || staleCount > 0
      ? "stale" as const
      : reconcile.status === "retry-scheduled" || retryCount > 0
        ? "retry-scheduled" as const
        : "success" as const;
    const result = {
      ...base,
      status: reconcileStatus,
      deletedCount: sumCleanupCounts(counts),
      claimCount: normalizeCount(reconcile.claimedCount),
      retryCount,
      staleCount,
      errorClassCounts: sanitizeErrorClassCounts(reconcile.errorClassCounts),
      lastSuccessAtIso: reconcileStatus === "success" ? nowIso : null
    };
    const metricsRecorded = await recordSchedulerRunSafely(cleanupStore, {
      authority: authority.authority,
      runAtIso: nowIso,
      status: result.status,
      claimCount: result.claimCount,
      retryCount: result.retryCount,
      staleCount: result.staleCount,
      errorClassCounts: result.errorClassCounts,
      lastSuccessAtIso: result.lastSuccessAtIso
    });
    return metricsRecorded
      ? result
      : {
          ...result,
          status: "failed" as const,
          errorClass: "database-transaction-failed" as const,
          lastSuccessAtIso: null
        };
  }

  const result = {
    ...base,
    status: "failed" as const,
    deletedCount: counts ? sumCleanupCounts(counts) : 0,
    claimCount: reconcile ? normalizeCount(reconcile.claimedCount) : 0,
    retryCount: reconcile ? normalizeCount(reconcile.retryCount) : 0,
    staleCount: reconcile ? normalizeCount(reconcile.staleCount) : 0,
    errorClassCounts: sanitizeErrorClassCounts({
      ...(reconcile?.errorClassCounts ?? {})
    }),
    errorClass: cleanupResult.status === "rejected"
      ? "database-transaction-failed" as const
      : "external-action-failed" as const,
    lastSuccessAtIso: null
  };
  const metricsRecorded = await recordSchedulerRunSafely(cleanupStore, {
    authority: authority.authority,
    runAtIso: nowIso,
    status: result.status,
    claimCount: result.claimCount,
    retryCount: result.retryCount,
    staleCount: result.staleCount,
    errorClassCounts: result.errorClassCounts,
    lastSuccessAtIso: result.lastSuccessAtIso
  });
  return metricsRecorded
    ? result
    : {
        ...result,
        errorClass: "database-transaction-failed" as const
      };
}

async function recordSchedulerRunSafely(
  cleanupStore: CommentTranslatorPaidRetentionCleanupStore,
  request: Parameters<NonNullable<CommentTranslatorPaidRetentionCleanupStore["recordSchedulerRun"]>>[0]
): Promise<boolean> {
  if (!cleanupStore.recordSchedulerRun) return true;
  try {
    return await cleanupStore.recordSchedulerRun(request);
  } catch {
    return false;
  }
}

function sanitizeErrorClassCounts(value: Partial<Record<string, number>>) {
  const allowedErrorClasses = new Set([
    "object-retrieval-failed",
    "database-transaction-failed",
    "external-action-failed",
    "binding-not-ready",
    "capacity-reconciliation-failed",
    "period-reconciliation-failed",
    "scheduler-unavailable",
    "scheduler-ambiguous",
  ]);

  return Object.fromEntries(
    Object.entries(value ?? {})
      .filter(([key, count]) => allowedErrorClasses.has(key) && normalizeCount(count) > 0)
      .map(([key, count]) => [key, normalizeCount(count)])
  );
}

function sumCleanupCounts(counts: CommentTranslatorPaidRetentionCleanupCounts): number {
  return Object.values(counts).reduce((sum, value) => sum + normalizeCount(value), 0);
}

function readCleanupCounts(value: unknown): CommentTranslatorPaidRetentionCleanupCounts {
  const row = Array.isArray(value) ? value[0] : value;
  const record = row && typeof row === "object" ? row as Record<string, unknown> : {};
  return {
    feedSnapshotDeleted: normalizeCount(record.feed_snapshot_deleted),
    providerHourlyDetailDeleted: normalizeCount(record.provider_hourly_detail_deleted),
    sessionSummaryDeleted: normalizeCount(record.session_summary_deleted),
    stripeEventDeleted: normalizeCount(record.stripe_event_deleted),
    aggregateDeleted: normalizeCount(record.aggregate_deleted),
    endedSubscriptionDeleted: normalizeCount(record.ended_subscription_deleted),
    attemptLedgerDeleted: normalizeCount(record.attempt_ledger_deleted)
  };
}

function normalizeCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function createTrustedCommentTranslatorPaidRetentionStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  env?: Partial<Record<"NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY", string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => RetentionCleanupSupabaseClient;
} = {}) {
  const trustedEnv = env ?? process.env;
  const url = trustedEnv.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = trustedEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    return {
      status: "unavailable" as const,
      store: null,
      missingEnvReferences: [
        ...(!url ? ["NEXT_PUBLIC_SUPABASE_URL" as const] : []),
        ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY" as const] : [])
      ] as const,
      failClosed: true as const,
      reason: "trusted-service-role-env-missing" as const
    };
  }
  return {
    status: "ready" as const,
    store: createCommentTranslatorPaidRetentionStore({ supabase: createSupabaseClient(url, serviceRoleKey) }),
    missingEnvReferences: [] as const,
    failClosed: false as const
  };
}

function createTrustedSupabaseServiceRoleClient(url: string, serviceRoleKey: string): RetentionCleanupSupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) as unknown as RetentionCleanupSupabaseClient;
}
