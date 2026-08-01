import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorCreatorUsageCounts = {
  readonly providerExecutionCount: number;
  readonly providerInputCharacterCount: number;
  readonly translatedCharacterCount: number;
};

export type CommentTranslatorCreatorUsageRecordRequest = {
  readonly ownerUserId: string;
  readonly entitlementReferenceId: string;
  readonly periodStartIso: string;
  readonly periodEndIso: string;
  readonly usageEventReference: string;
  readonly providerInputCharacterCount: number;
  readonly translatedCharacterCount: number;
};

export type CommentTranslatorCreatorUsageRecordFailureReason =
  | "duplicate"
  | "period-mismatch"
  | "entitlement-missing"
  | "entitlement-unreadable"
  | "accounting-unavailable";

export type CommentTranslatorCreatorUsageRecordResult =
  | {
      readonly status: "recorded";
      readonly counts: CommentTranslatorCreatorUsageCounts;
    }
  | {
      readonly status: "rejected";
      readonly reason: CommentTranslatorCreatorUsageRecordFailureReason;
    };

export interface CommentTranslatorCreatorUsageStore {
  recordProviderExecutedUsage(
    request: CommentTranslatorCreatorUsageRecordRequest
  ): Promise<CommentTranslatorCreatorUsageRecordResult>;
}

export type CommentTranslatorCreatorUsageStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorCreatorUsageStoreFactoryResult =
  | {
      readonly status: "ready";
      readonly store: CommentTranslatorCreatorUsageStore;
      readonly missingEnvReferences: readonly [];
      readonly failClosed: false;
    }
  | {
      readonly status: "unavailable";
      readonly store: null;
      readonly missingEnvReferences: readonly CommentTranslatorCreatorUsageStoreFactoryEnvName[];
      readonly failClosed: true;
      readonly reason: "trusted-service-role-env-missing";
    };

type SupabaseError = { readonly code?: string; readonly message?: string } | null;
type SupabaseRpcResult = { readonly data: unknown; readonly error: SupabaseError };

export type CommentTranslatorCreatorUsageSupabaseClient = {
  rpc(
    functionName: typeof commentTranslatorCreatorUsageStoreContract.recordUsageRpc,
    parameters: Record<string, unknown>
  ): Promise<SupabaseRpcResult>;
};

export const commentTranslatorCreatorUsageStoreContract = {
  implementationStage: "nc-u1-local-paid-usage-store",
  runtime: "server-only",
  recordUsageRpc: "record_comment_translator_creator_paid_usage",
  periodAuthority: "nc-d1-signed-entitlement-period-only",
  rowAccess: "trusted-server-service-role-only",
  writeMode: "atomic-rpc-only",
  cacheHitAccounting: "forbidden",
  browserAuthority: "forbidden",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseReadWrite: "not-run-in-this-thread",
  creatorActivation: "fixed-closed",
  productionRouteWiring: "disconnected",
  containerFallback: "forbidden"
} as const;

export function createTrustedCommentTranslatorCreatorUsageStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  readonly env?: Partial<Record<CommentTranslatorCreatorUsageStoreFactoryEnvName, string | undefined>>;
  readonly createSupabaseClient?: (
    url: string,
    serviceRoleKey: string
  ) => CommentTranslatorCreatorUsageSupabaseClient;
} = {}): CommentTranslatorCreatorUsageStoreFactoryResult {
  const trustedEnv = env ?? {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorCreatorUsageStoreFactoryEnvName[] = [];

  if (!url) missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
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
    store: createCommentTranslatorCreatorUsageSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey)
    }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorCreatorUsageSupabaseStore({
  supabase
}: {
  readonly supabase: CommentTranslatorCreatorUsageSupabaseClient;
}): CommentTranslatorCreatorUsageStore {
  return {
    async recordProviderExecutedUsage(request) {
      let result: SupabaseRpcResult;
      try {
        result = await supabase.rpc(commentTranslatorCreatorUsageStoreContract.recordUsageRpc, {
          p_owner_user_id: request.ownerUserId,
          p_entitlement_id: request.entitlementReferenceId,
          p_period_start: request.periodStartIso,
          p_period_end: request.periodEndIso,
          p_usage_event_reference: request.usageEventReference,
          p_provider_executed: true,
          p_cache_hit: false,
          p_provider_input_character_count: request.providerInputCharacterCount,
          p_translated_character_count: request.translatedCharacterCount
        });
      } catch (error) {
        if (error instanceof Error) return { status: "rejected", reason: "accounting-unavailable" };
        return { status: "rejected", reason: "accounting-unavailable" };
      }

      if (result.error) return { status: "rejected", reason: "accounting-unavailable" };
      return readRecordResult(result.data);
    }
  };
}

function readRecordResult(data: unknown): CommentTranslatorCreatorUsageRecordResult {
  if (!data || typeof data !== "object") return { status: "rejected", reason: "accounting-unavailable" };
  const status = Reflect.get(data, "status");
  if (status === "recorded") {
    const providerExecutionCount = Reflect.get(data, "provider_execution_count");
    const providerInputCharacterCount = Reflect.get(data, "provider_input_character_count");
    const translatedCharacterCount = Reflect.get(data, "translated_character_count");
    if (
      isCount(providerExecutionCount) &&
      isCount(providerInputCharacterCount) &&
      isCount(translatedCharacterCount)
    ) {
      return {
        status: "recorded",
        counts: { providerExecutionCount, providerInputCharacterCount, translatedCharacterCount }
      };
    }
    return { status: "rejected", reason: "accounting-unavailable" };
  }
  if (status !== "rejected") return { status: "rejected", reason: "accounting-unavailable" };
  return { status: "rejected", reason: readFailureReason(Reflect.get(data, "reason")) };
}

function readFailureReason(reason: unknown): CommentTranslatorCreatorUsageRecordFailureReason {
  switch (reason) {
    case "duplicate":
      return "duplicate";
    case "entitlement-period-mismatch":
    case "entitlement-inactive":
    case "entitlement-stale":
      return "period-mismatch";
    case "entitlement-missing":
      return "entitlement-missing";
    case "entitlement-unreadable":
      return "entitlement-unreadable";
    default:
      return "accounting-unavailable";
  }
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorCreatorUsageStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorCreatorUsageStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorCreatorUsageSupabaseClient {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return {
    async rpc(functionName, parameters) {
      const { data, error } = await client.rpc(functionName, parameters);
      return { data, error };
    }
  };
}
