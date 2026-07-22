import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  CommentTranslatorPaidUsageCounterRecord,
  CommentTranslatorPaidUsageCounterStore,
  CommentTranslatorPaidUsageCounterStoreFactoryEnvName,
  CommentTranslatorPaidUsageCounterStoreFactoryResult,
  CommentTranslatorPaidUsageRecordResult
} from "./comment-translator-paid-usage-types";

export type * from "./comment-translator-paid-usage-types";
export {
  readCommentTranslatorPaidUsageOrFailClosed,
  recordCommentTranslatorPaidUsageOrFailClosed
} from "./comment-translator-paid-usage-runtime";

type PaidUsageDbRow = {
  readonly billing_user_reference_id: string | null;
  readonly current_period_end: string | null;
  readonly reset_evidence_created_at: string | null;
  readonly translated_message_count: number | null;
  readonly provider_input_character_count: number | null;
  readonly estimated_cost_micros: number | null;
  readonly updated_at: string | null;
};

type SupabaseError = { readonly code?: string; readonly message?: string } | null;
type SupabaseSingleResult = { readonly data: PaidUsageDbRow | null; readonly error: SupabaseError };
type SupabaseRpcResult = { readonly data: string | null; readonly error: SupabaseError };
type SupabaseQuery = PromiseLike<SupabaseSingleResult> & {
  readonly select: (columns: typeof commentTranslatorPaidUsageCounterContract.trustedSelectColumns) => SupabaseQuery;
  readonly eq: (
    column: "billing_user_reference_id" | "current_period_end",
    value: string
  ) => SupabaseQuery;
  readonly single: () => Promise<SupabaseSingleResult>;
};

export type CommentTranslatorPaidUsageSupabaseClient = {
  readonly from: (tableName: typeof commentTranslatorPaidUsageCounterContract.counterTableName) => SupabaseQuery;
  readonly rpc: (
    functionName: "apply_comment_translator_paid_usage",
    params: Readonly<Record<string, string | number>>
  ) => Promise<SupabaseRpcResult>;
};

export class CommentTranslatorPaidUsageStoreError extends Error {
  readonly name = "CommentTranslatorPaidUsageStoreError";
  readonly operation: "read" | "write";

  constructor(operation: "read" | "write") {
    super(`Trusted paid usage ${operation} failed.`);
    this.operation = operation;
  }
}

export const commentTranslatorPaidUsageCounterContract = {
  implementationStage: "creator-closed-beta-c3-paid-usage-and-period-reset",
  runtime: "server-only",
  counterTableName: "comment_translator_paid_usage_counters",
  eventTableName: "comment_translator_paid_usage_events",
  entitlementAuthority: "c1-durable-paid-active-signed-billing-evidence",
  resetAuthority: "signed-entitlement-current-period-end-change",
  resetCadenceInference: "forbidden",
  quotaValueInference: "forbidden",
  atomicity: "entitlement-gated-deduplicated-rpc",
  safeDegradation: "sanitized-free-paid-inactive",
  trustedSelectColumns:
    "billing_user_reference_id, current_period_end, reset_evidence_created_at, translated_message_count, provider_input_character_count, estimated_cost_micros, updated_at",
  remoteSupabaseMigrationApply: "not-run-in-c3-local-implementation",
  remoteSupabaseMutation: "not-run-by-codex-in-c3-local-implementation",
  forbiddenReadableOutput: [
    "owner-user-id-value",
    "billing-user-reference-value",
    "usage-event-reference-value",
    "stripe-customer-reference-value",
    "stripe-subscription-reference-value",
    "provider-target-metadata",
    "credentials",
    "raw-provider-payload",
    "private-reset-counter-key"
  ]
} as const;

export function createTrustedCommentTranslatorPaidUsageSupabaseStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  readonly env?: Partial<Record<CommentTranslatorPaidUsageCounterStoreFactoryEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorPaidUsageSupabaseClient;
} = {}): CommentTranslatorPaidUsageCounterStoreFactoryResult {
  const trustedEnv = env ?? process.env;
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorPaidUsageCounterStoreFactoryEnvName[] = [];
  if (!url) missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    return { status: "unavailable", store: null, missingEnvReferences, reason: "trusted-service-role-env-missing" };
  }
  return {
    status: "ready",
    store: createCommentTranslatorPaidUsageSupabaseStore({ supabase: createSupabaseClient(url, serviceRoleKey) }),
    missingEnvReferences: []
  };
}

export function createCommentTranslatorPaidUsageSupabaseStore({
  supabase
}: {
  readonly supabase: CommentTranslatorPaidUsageSupabaseClient;
}): CommentTranslatorPaidUsageCounterStore {
  return {
    async readCurrentPeriod(request) {
      const result = await supabase
        .from(commentTranslatorPaidUsageCounterContract.counterTableName)
        .select(commentTranslatorPaidUsageCounterContract.trustedSelectColumns)
        .eq("billing_user_reference_id", request.billingUserReferenceId)
        .eq("current_period_end", request.expectedPeriodEndIso)
        .single();
      if (!result.data && (!result.error || result.error.code === "PGRST116")) return null;
      if (result.error || !result.data) throw new CommentTranslatorPaidUsageStoreError("read");
      const record = parsePaidUsageRow(result.data);
      if (!record) throw new CommentTranslatorPaidUsageStoreError("read");
      return record;
    },
    async recordUsage(request) {
      const result = await supabase.rpc("apply_comment_translator_paid_usage", {
        p_billing_user_reference_id: request.billingUserReferenceId,
        p_expected_period_end: request.expectedPeriodEndIso,
        p_usage_event_reference_id: request.usageEventReferenceId,
        p_occurred_at: request.occurredAtIso,
        p_translated_message_count: request.translatedMessageCount,
        p_provider_input_character_count: request.providerInputCharacterCount,
        p_estimated_cost_micros: request.estimatedCostMicros
      });
      if (result.error || !isPaidUsageRecordResult(result.data)) {
        throw new CommentTranslatorPaidUsageStoreError("write");
      }
      return result.data;
    }
  };
}

function parsePaidUsageRow(row: PaidUsageDbRow): CommentTranslatorPaidUsageCounterRecord | null {
  if (
    !isBillingUserReference(row.billing_user_reference_id) ||
    !isValidIso(row.current_period_end) ||
    !isValidIso(row.reset_evidence_created_at) ||
    !isNonNegativeSafeInteger(row.translated_message_count) ||
    !isNonNegativeSafeInteger(row.provider_input_character_count) ||
    !isNonNegativeSafeInteger(row.estimated_cost_micros) ||
    !isValidIso(row.updated_at)
  ) return null;
  return {
    billingUserReferenceId: row.billing_user_reference_id,
    currentPeriodEndIso: row.current_period_end,
    resetEvidenceCreatedAtIso: row.reset_evidence_created_at,
    translatedMessageCount: row.translated_message_count,
    providerInputCharacterCount: row.provider_input_character_count,
    estimatedCostMicros: row.estimated_cost_micros,
    updatedAtIso: row.updated_at
  };
}

function isPaidUsageRecordResult(value: string | null): value is CommentTranslatorPaidUsageRecordResult {
  return value === "applied" || value === "ignored-replay" || value === "rejected-paid-inactive" ||
    value === "rejected-stale-period" || value === "rejected-missing-counter";
}

function isBillingUserReference(value: string | null): value is `ctbill_${string}` {
  return typeof value === "string" && /^ctbill_[a-f0-9]{24}$/.test(value);
}

function isValidIso(value: string | null): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNonNegativeSafeInteger(value: number | null): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorPaidUsageCounterStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorPaidUsageCounterStoreFactoryEnvName
) {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorPaidUsageSupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    from(tableName) {
      return client.from(tableName);
    },
    async rpc(functionName, params) {
      return client.rpc(functionName, params);
    }
  };
}
