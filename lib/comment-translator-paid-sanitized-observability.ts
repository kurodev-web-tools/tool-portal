import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { CommentTranslatorPaidSchedulerAuthority } from "./comment-translator-paid-retention";

type SanitizedErrorCounts = Readonly<Record<string, number>>;

export const commentTranslatorPaidSanitizedObservabilityContract = {
  implementationStage: "comment-translator-paid-v1-task9-sanitized-observability",
  runtime: "server-only",
  monitoredSurfaces: ["capacity", "entitlement", "provider", "cost", "infra"],
  schedulerFields: ["lastSuccessAtIso", "claimCount", "retryCount", "staleCount", "attemptAlertCount", "errorClassCounts"],
  rawCommentText: "never-recorded-by-design",
  forbiddenFields: ["owner-user-id-value", "raw-provider-payload", "provider-target-metadata", "secret-value"],
  outputBoundary: "sanitized-aggregate-and-reference-only",
  remoteReadOnly: true,
  trustedAdminReadRpc: "ct_paid_read_sanitized_admin_visibility"
} as const;

export type CommentTranslatorPaidSanitizedAdminViewInput = {
  nowIso: string;
  scheduler: {
    authority: CommentTranslatorPaidSchedulerAuthority;
    lastSuccessAtIso: string | null;
    runStatus: "success" | "failed" | "stale" | "unavailable" | "retry-scheduled";
    claimCount: number;
    retryCount: number;
    staleCount: number;
    attemptAlertCount: number;
    errorClassCounts: SanitizedErrorCounts;
  };
  capacity: { activeCount: number; heldCount: number; limit: number };
  entitlement: { activeCount: number; stoppedCount: number; reconciliationCount: number };
  provider: {
    requestCount: number;
    successCount: number;
    failureCount: number;
    fallbackCount: number;
    circuitState: "closed" | "degraded" | "half_open" | "disabled";
  };
  cost: {
    reservedMicros: number;
    committedMicros: number;
    individualLimitMicros: number;
    globalLimitMicros: number;
  };
  infra: {
    supabaseDbTotalBytes: number;
    supabaseDbLimitBytes: number;
    cloudflareDailyRequests: number | null;
    cloudflareDailyLimit: number;
    cloudflareStopCheckoutPercent?: number;
    cloudflareStopNewSessionPercent?: number;
    cloudflareStopActivePollPercent?: number;
  };
};

export function createCommentTranslatorPaidSanitizedAdminView(input: CommentTranslatorPaidSanitizedAdminViewInput) {
  return {
    generatedAtIso: input.nowIso,
    scheduler: {
      authority: input.scheduler.authority,
      lastSuccessAtIso: input.scheduler.lastSuccessAtIso,
      runStatus: input.scheduler.runStatus,
      claimCount: normalizeCount(input.scheduler.claimCount),
      retryCount: normalizeCount(input.scheduler.retryCount),
      staleCount: normalizeCount(input.scheduler.staleCount),
      attemptAlertCount: normalizeCount(input.scheduler.attemptAlertCount),
      errorClassCounts: copySanitizedErrorCounts(input.scheduler.errorClassCounts)
    },
    capacity: {
      activeCount: normalizeCount(input.capacity.activeCount),
      heldCount: normalizeCount(input.capacity.heldCount),
      limit: normalizeCount(input.capacity.limit)
    },
    entitlement: {
      activeCount: normalizeCount(input.entitlement.activeCount),
      stoppedCount: normalizeCount(input.entitlement.stoppedCount),
      reconciliationCount: normalizeCount(input.entitlement.reconciliationCount)
    },
    provider: {
      requestCount: normalizeCount(input.provider.requestCount),
      successCount: normalizeCount(input.provider.successCount),
      failureCount: normalizeCount(input.provider.failureCount),
      fallbackCount: normalizeCount(input.provider.fallbackCount),
      circuitState: input.provider.circuitState
    },
    cost: {
      reservedMicros: normalizeCount(input.cost.reservedMicros),
      committedMicros: normalizeCount(input.cost.committedMicros),
      individualLimitMicros: normalizeCount(input.cost.individualLimitMicros),
      globalLimitMicros: normalizeCount(input.cost.globalLimitMicros)
    },
    infra: {
      supabaseDbTotalBytes: normalizeCount(input.infra.supabaseDbTotalBytes),
      supabaseDbLimitBytes: normalizeCount(input.infra.supabaseDbLimitBytes),
      cloudflareDailyRequests: normalizeNullableCount(input.infra.cloudflareDailyRequests),
      cloudflareDailyLimit: normalizeCount(input.infra.cloudflareDailyLimit),
      cloudflareStopCheckoutPercent: normalizeCount(input.infra.cloudflareStopCheckoutPercent ?? 80),
      cloudflareStopNewSessionPercent: normalizeCount(input.infra.cloudflareStopNewSessionPercent ?? 90),
      cloudflareStopActivePollPercent: normalizeCount(input.infra.cloudflareStopActivePollPercent ?? 95)
    },
    outputBoundary: commentTranslatorPaidSanitizedObservabilityContract.outputBoundary
  } as const;
}

type SanitizedAdminVisibilitySupabaseResult = { data: unknown; error: { code?: string; message?: string } | null };
type SanitizedAdminVisibilitySupabaseClient = {
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<SanitizedAdminVisibilitySupabaseResult>;
};

export type CommentTranslatorPaidSanitizedAdminVisibilityReader = {
  read: (request?: { nowIso?: string }) => Promise<ReturnType<typeof createCommentTranslatorPaidSanitizedAdminView> | null>;
};

export function createCommentTranslatorPaidSanitizedAdminVisibilityReader({
  supabase
}: {
  supabase: SanitizedAdminVisibilitySupabaseClient;
}): CommentTranslatorPaidSanitizedAdminVisibilityReader {
  return {
    async read(request = {}) {
      const result = await supabase.rpc("ct_paid_read_sanitized_admin_visibility", {
        p_now: request.nowIso ?? new Date().toISOString()
      });
      if (result.error) throw new Error("Paid sanitized admin visibility read failed.");
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!row || typeof row !== "object" || Array.isArray(row)) return null;
      const value = row as Record<string, unknown>;
      const nowIso = readIso(value.generated_at) ?? request.nowIso ?? new Date().toISOString();
      return createCommentTranslatorPaidSanitizedAdminView({
        nowIso,
        scheduler: {
          authority: readSchedulerAuthority(value.scheduler_authority),
          lastSuccessAtIso: readIso(value.scheduler_last_success_at),
          runStatus: readRunStatus(value.scheduler_run_status),
          claimCount: readCount(value.scheduler_claim_count),
          retryCount: readCount(value.scheduler_retry_count),
          staleCount: readCount(value.scheduler_stale_count),
          attemptAlertCount: readCount(value.scheduler_attempt_alert_count),
          errorClassCounts: readErrorCounts(value.scheduler_error_class_counts)
        },
        capacity: {
          activeCount: readCount(value.capacity_active_count),
          heldCount: readCount(value.capacity_held_count),
          limit: readCount(value.capacity_limit)
        },
        entitlement: {
          activeCount: readCount(value.entitlement_active_count),
          stoppedCount: readCount(value.entitlement_stopped_count),
          reconciliationCount: readCount(value.reconciliation_count)
        },
        provider: {
          requestCount: readCount(value.provider_request_count),
          successCount: readCount(value.provider_success_count),
          failureCount: readCount(value.provider_failure_count),
          fallbackCount: readCount(value.provider_fallback_count),
          circuitState: readProviderCircuitState(
            value.provider_circuit_status,
            value.provider_circuit_degraded_count
          )
        },
        cost: {
          reservedMicros: readCount(value.reserved_cost_micros),
          committedMicros: readCount(value.committed_cost_micros),
          individualLimitMicros: readCount(value.individual_cost_limit_micros),
          globalLimitMicros: readCount(value.global_cost_limit_micros)
        },
        infra: {
          supabaseDbTotalBytes: readCount(value.supabase_db_total_bytes),
          supabaseDbLimitBytes: readCount(value.supabase_db_limit_bytes),
          cloudflareDailyRequests: readNullableCount(value.cloudflare_daily_requests),
          cloudflareDailyLimit: readCount(value.cloudflare_daily_limit),
          cloudflareStopCheckoutPercent: readCount(value.cloudflare_stop_checkout_percent),
          cloudflareStopNewSessionPercent: readCount(value.cloudflare_stop_new_session_percent),
          cloudflareStopActivePollPercent: readCount(value.cloudflare_stop_active_poll_percent)
        }
      });
    }
  };
}

export function createTrustedCommentTranslatorPaidSanitizedAdminVisibilityReader({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  env?: Partial<Record<"NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY", string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => SanitizedAdminVisibilitySupabaseClient;
} = {}) {
  const trustedEnv = env ?? process.env;
  const url = trustedEnv.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = trustedEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    return {
      status: "unavailable" as const,
      reader: null,
      missingEnvReferences: [
        ...(!url ? ["NEXT_PUBLIC_SUPABASE_URL" as const] : []),
        ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY" as const] : [])
      ] as const,
      failClosed: true as const
    };
  }
  return {
    status: "ready" as const,
    reader: createCommentTranslatorPaidSanitizedAdminVisibilityReader({
      supabase: createSupabaseClient(url, serviceRoleKey)
    }),
    missingEnvReferences: [] as const,
    failClosed: false as const
  };
}

function readSchedulerAuthority(value: unknown): CommentTranslatorPaidSchedulerAuthority {
  return value === "supabase-cron" || value === "cloudflare-cron-fallback" ? value : "unavailable";
}

function readRunStatus(value: unknown): CommentTranslatorPaidSanitizedAdminViewInput["scheduler"]["runStatus"] {
  return value === "success" || value === "failed" || value === "stale" || value === "retry-scheduled" || value === "unavailable"
    ? value
    : "unavailable";
}

function readProviderCircuitState(
  value: unknown,
  degradedCount: unknown
): CommentTranslatorPaidSanitizedAdminViewInput["provider"]["circuitState"] {
  if (value === "disabled" || value === "half_open" || value === "degraded" || value === "closed") {
    return value;
  }
  return readCount(degradedCount) > 0 ? "degraded" : "closed";
}

function readIso(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function readCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.trunc(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return 0;
}

function readNullableCount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const count = readCount(value);
  return count === 0 && value !== 0 && value !== "0" ? null : count;
}

function readErrorCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, count]) => [key, readCount(count)])
  );
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): SanitizedAdminVisibilitySupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) as unknown as SanitizedAdminVisibilitySupabaseClient;
}

function copySanitizedErrorCounts(value: SanitizedErrorCounts): Record<string, number> {
  const allowedErrorClasses = new Set([
    "object-retrieval-failed",
    "database-transaction-failed",
    "external-action-failed",
    "binding-not-ready",
    "capacity-reconciliation-failed",
    "period-reconciliation-failed",
    "scheduler-unavailable",
    "scheduler-ambiguous"
  ]);

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, count]) => allowedErrorClasses.has(key) && Number.isInteger(count) && count >= 0)
      .map(([key, count]) => [key, count])
  );
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function normalizeNullableCount(value: number | null): number | null {
  return value === null ? null : normalizeCount(value);
}
