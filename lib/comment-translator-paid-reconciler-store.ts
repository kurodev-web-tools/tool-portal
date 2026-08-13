import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorPaidReconcileClaim = {
  lifecycleId: string;
  reconcileLeaseToken: string;
  reconcileLeaseUntilIso: string;
};

export type CommentTranslatorPaidReconcilerErrorClass =
  | "object-retrieval-failed"
  | "database-transaction-failed"
  | "external-action-failed"
  | "binding-not-ready"
  | "capacity-reconciliation-failed"
  | "period-reconciliation-failed";

export type CommentTranslatorPaidCircuitProvider = "openai" | "azure_fallback";
export type CommentTranslatorPaidCircuitState = "closed" | "degraded" | "half_open" | "disabled";
export type CommentTranslatorPaidCircuitErrorClass =
  | "network"
  | "timeout"
  | "rate-limit"
  | "server-error"
  | "quota"
  | "configuration"
  | "policy";

export type CommentTranslatorPaidReconcilerStore = {
  claimDue: (request: { nowIso: string; limit?: number }) => Promise<readonly CommentTranslatorPaidReconcileClaim[]>;
  finalize: (request: {
    lifecycleId: string;
    reconcileLeaseToken: string;
    nextReconcileAtIso: string | null;
    nowIso: string;
  }) => Promise<boolean>;
  retry: (request: {
    lifecycleId: string;
    reconcileLeaseToken: string;
    errorClass: CommentTranslatorPaidReconcilerErrorClass;
    nowIso: string;
  }) => Promise<number>;
  recordProviderCircuitFailure: (request: {
    provider: CommentTranslatorPaidCircuitProvider;
    errorClass: CommentTranslatorPaidCircuitErrorClass;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidCircuitState>;
  probeProviderCircuit: (request: {
    provider: CommentTranslatorPaidCircuitProvider;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidCircuitState>;
  recordProviderCircuitSuccess: (request: {
    provider: CommentTranslatorPaidCircuitProvider;
    probeAttemptId?: string;
    nowIso: string;
  }) => Promise<boolean>;
  disableProviderCircuit: (request: {
    provider: CommentTranslatorPaidCircuitProvider;
    nowIso: string;
  }) => Promise<boolean>;
};

export type CommentTranslatorPaidReconcilerStoreFactoryResult =
  | {
      status: "ready";
      store: CommentTranslatorPaidReconcilerStore;
      missingEnvReferences: readonly [];
      failClosed: false;
    }
  | {
      status: "unavailable";
      store: null;
      missingEnvReferences: readonly ("NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY")[];
      failClosed: true;
      reason: "trusted-service-role-env-missing";
    };

type SupabaseError = { code?: string; message?: string } | null;
type SupabaseRpcResult = { data: unknown; error: SupabaseError };
type SupabaseClient = {
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<SupabaseRpcResult>;
};

export const commentTranslatorPaidReconcilerStoreContract = {
  implementationStage: "comment-translator-paid-v1-task2-durable-reconciler-adapter",
  runtime: "server-only",
  tableName: "comment_translator_paid_billing_lifecycles",
  maxBatchSize: 50,
  leaseSeconds: 120,
  backoffSeconds: [60, 300, 900, 3600, 21600] as const,
  claimAuthority: "atomic-skip-locked-rpc",
  finalizeAuthority: "opaque-token-cas-rpc",
  staleTokenPolicy: "reject",
  verificationBoundary: "source-and-fixture-only-no-real-postgresql-rls-or-concurrency-run",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  browserReadableOutput: "never-returned-by-this-server-only-adapter",
  failClosedFallback: "billing-reconciliation-unavailable",
  trustedRpcNames: [
    "ct_paid_claim_reconciler",
    "ct_paid_finalize_reconciler",
    "ct_paid_retry_reconciler",
    "ct_paid_record_provider_circuit_failure",
    "ct_paid_record_provider_circuit_failure_owned",
    "ct_paid_probe_provider_circuit",
    "ct_paid_read_provider_circuit",
    "ct_paid_claim_provider_circuit_probe",
    "ct_paid_record_provider_circuit_success",
    "ct_paid_disable_provider_circuit"
  ] as const
} as const;

export function createTrustedCommentTranslatorPaidReconcilerStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  env?: Partial<Record<"NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY", string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => SupabaseClient;
} = {}): CommentTranslatorPaidReconcilerStoreFactoryResult {
  const trustedEnv = env ?? process.env;
  const url = trustedEnv.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = trustedEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missingEnvReferences: ("NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY")[] = [];
  if (!url) missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missingEnvReferences.length > 0 || !url || !serviceRoleKey) {
    return {
      status: "unavailable",
      store: null,
      missingEnvReferences,
      failClosed: true,
      reason: "trusted-service-role-env-missing"
    };
  }
  return {
    status: "ready",
    store: createCommentTranslatorPaidReconcilerStore({ supabase: createSupabaseClient(url, serviceRoleKey) }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorPaidReconcilerStore({
  supabase
}: {
  supabase: SupabaseClient;
}): CommentTranslatorPaidReconcilerStore {
  return {
    async claimDue(request) {
      const limit = normalizeClaimLimit(request.limit);
      const result = await supabase.rpc("ct_paid_claim_reconciler", {
        p_now: request.nowIso,
        p_limit: limit
      });
      if (result.error) throw new Error("Paid reconciler claim failed.");
      if (!Array.isArray(result.data)) throw new Error("Paid reconciler claim response is invalid.");
      return result.data.map(mapClaim);
    },
    async finalize(request) {
      const result = await supabase.rpc("ct_paid_finalize_reconciler", {
        p_lifecycle_id: request.lifecycleId,
        p_reconcile_lease_token: request.reconcileLeaseToken,
        p_next_reconcile_at: request.nextReconcileAtIso,
        p_now: request.nowIso
      });
      return readBoolean(result, "Paid reconciler finalization failed.");
    },
    async retry(request) {
      const result = await supabase.rpc("ct_paid_retry_reconciler", {
        p_lifecycle_id: request.lifecycleId,
        p_reconcile_lease_token: request.reconcileLeaseToken,
        p_error_class: request.errorClass,
        p_now: request.nowIso
      });
      return readInteger(result, "Paid reconciler retry scheduling failed.");
    },
    async recordProviderCircuitFailure(request) {
      const result = await supabase.rpc("ct_paid_record_provider_circuit_failure", {
        p_provider: request.provider,
        p_error_class: request.errorClass,
        p_now: request.nowIso
      });
      return readCircuitState(result, "Paid provider circuit failure recording failed.");
    },
    async probeProviderCircuit(request) {
      const result = await supabase.rpc("ct_paid_probe_provider_circuit", {
        p_provider: request.provider,
        p_now: request.nowIso
      });
      return readCircuitState(result, "Paid provider circuit probe failed.");
    },
    async recordProviderCircuitSuccess(request) {
      const result = await supabase.rpc("ct_paid_record_provider_circuit_success", {
        p_provider: request.provider,
        p_probe_attempt_id: request.probeAttemptId ?? null,
        p_now: request.nowIso
      });
      return readBoolean(result, "Paid provider circuit success recording failed.");
    },
    async disableProviderCircuit(request) {
      const result = await supabase.rpc("ct_paid_disable_provider_circuit", {
        p_provider: request.provider,
        p_now: request.nowIso
      });
      return readBoolean(result, "Paid provider circuit disable failed.");
    }
  };
}

function normalizeClaimLimit(requestedLimit: number | undefined): number {
  const limit = requestedLimit === undefined
    ? commentTranslatorPaidReconcilerStoreContract.maxBatchSize
    : requestedLimit;
  if (!Number.isFinite(limit) || !Number.isInteger(limit)) {
    throw new Error("Paid reconciler claim limit is invalid.");
  }
  return Math.min(Math.max(limit, 0), commentTranslatorPaidReconcilerStoreContract.maxBatchSize);
}

function mapClaim(value: unknown): CommentTranslatorPaidReconcileClaim {
  const row = asRecord(value);
  return {
    lifecycleId: readString(row, "lifecycle_id"),
    reconcileLeaseToken: readString(row, "reconcile_lease_token"),
    reconcileLeaseUntilIso: readString(row, "reconcile_lease_until")
  };
}

function readBoolean(result: SupabaseRpcResult, message: string): boolean {
  if (result.error || result.data !== true) throw new Error(message);
  return true;
}

function readInteger(result: SupabaseRpcResult, message: string): number {
  if (result.error) throw new Error(message);
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  throw new Error(message);
}

function readCircuitState(result: SupabaseRpcResult, message: string): CommentTranslatorPaidCircuitState {
  if (
    result.error
    || typeof result.data !== "string"
    || !["closed", "degraded", "half_open", "disabled"].includes(result.data)
  ) {
    throw new Error(message);
  }
  return result.data as CommentTranslatorPaidCircuitState;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Trusted Paid store response is invalid.");
  return value as Record<string, unknown>;
}

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) throw new Error("Trusted Paid store response is invalid.");
  return value;
}

function createTrustedSupabaseServiceRoleClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as unknown as SupabaseClient;
}
