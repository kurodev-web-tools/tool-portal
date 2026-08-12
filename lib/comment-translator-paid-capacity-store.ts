import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorPaidCapacityStage =
  | "checkout_hold"
  | "incomplete"
  | "active"
  | "cancel_at_period_end"
  | "payment_failure_hold"
  | "dispute"
  | "cancel_pending"
  | "reconciliation";

export type CommentTranslatorPaidCapacityStore = {
  reserveCapacity: (request: {
    lifecycleId: string;
    ownerUserId: string;
    lifecycleStage: CommentTranslatorPaidCapacityStage;
    reconcileLeaseToken?: string | null;
    nowIso: string;
  }) => Promise<string>;
  convertCapacity: (request: {
    lifecycleId: string;
    lifecycleStage: Exclude<CommentTranslatorPaidCapacityStage, "checkout_hold">;
    reconcileLeaseToken?: string | null;
    nowIso: string;
  }) => Promise<boolean>;
  releaseCapacity: (request: { lifecycleId: string; reconcileLeaseToken?: string | null; nowIso: string }) => Promise<boolean>;
};

export type CommentTranslatorPaidCapacityStoreFactoryResult =
  | {
      status: "ready";
      store: CommentTranslatorPaidCapacityStore;
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

type SupabaseRpcResult = { data: unknown; error: { code?: string; message?: string } | null };
type SupabaseClient = {
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<SupabaseRpcResult>;
};

export const commentTranslatorPaidCapacityStoreContract = {
  implementationStage: "comment-translator-paid-v1-task2-durable-capacity-adapter",
  runtime: "server-only",
  tableName: "comment_translator_paid_capacity_reservations",
  capacityLimit: 20,
  capacityAuthority: "atomic-rpc",
  stageCounting: "one-capacity-slot-per-lifecycle",
  concurrencyBoundary: "twenty-first-reservation-rejected",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  browserReadableOutput: "never-returned-by-this-server-only-adapter",
  failClosedFallback: "paid-capacity-unavailable",
  trustedRpcNames: ["ct_paid_reserve_capacity", "ct_paid_convert_capacity", "ct_paid_release_capacity"] as const
} as const;

export function createTrustedCommentTranslatorPaidCapacityStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  env?: Partial<Record<"NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY", string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => SupabaseClient;
} = {}): CommentTranslatorPaidCapacityStoreFactoryResult {
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
    store: createCommentTranslatorPaidCapacityStore({ supabase: createSupabaseClient(url, serviceRoleKey) }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorPaidCapacityStore({
  supabase
}: {
  supabase: SupabaseClient;
}): CommentTranslatorPaidCapacityStore {
  return {
    async reserveCapacity(request) {
      const result = await supabase.rpc("ct_paid_reserve_capacity", {
        p_lifecycle_id: request.lifecycleId,
        p_owner_user_id: request.ownerUserId,
        p_lifecycle_stage: request.lifecycleStage,
        p_reconcile_lease_token: request.reconcileLeaseToken ?? null,
        p_now: request.nowIso
      });
      return readUuid(result, "Paid capacity reservation failed.");
    },
    async convertCapacity(request) {
      const result = await supabase.rpc("ct_paid_convert_capacity", {
        p_lifecycle_id: request.lifecycleId,
        p_lifecycle_stage: request.lifecycleStage,
        p_reconcile_lease_token: request.reconcileLeaseToken ?? null,
        p_now: request.nowIso
      });
      return readBoolean(result, "Paid capacity conversion failed.");
    },
    async releaseCapacity(request) {
      const result = await supabase.rpc("ct_paid_release_capacity", {
        p_lifecycle_id: request.lifecycleId,
        p_reconcile_lease_token: request.reconcileLeaseToken ?? null,
        p_now: request.nowIso
      });
      return readBoolean(result, "Paid capacity release failed.");
    }
  };
}

function readUuid(result: SupabaseRpcResult, message: string): string {
  if (result.error) throw new Error(message);
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const id = (value as Record<string, unknown>).id ?? (value as Record<string, unknown>).reservation_id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  throw new Error(message);
}

function readBoolean(result: SupabaseRpcResult, message: string): boolean {
  if (result.error || result.data !== true) throw new Error(message);
  return true;
}

function createTrustedSupabaseServiceRoleClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as unknown as SupabaseClient;
}
