import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  CommentTranslatorPaidEntitlementBillingState, CommentTranslatorPaidEntitlementRecord,
  CommentTranslatorPaidEntitlementStore, CommentTranslatorPaidEntitlementStoreFactoryEnvName,
  CommentTranslatorPaidEntitlementStoreFactoryResult, CommentTranslatorPaidEntitlementSubscriptionStatus
} from "./comment-translator-paid-entitlement-types";

export type {
  CommentTranslatorPaidEntitlementRecord,
  CommentTranslatorPaidEntitlementStore,
  CommentTranslatorVerifiedBillingEvidence
} from "./comment-translator-paid-entitlement-types";

type PaidEntitlementDbRow = {
  readonly billing_user_reference_id: string | null;
  readonly stripe_customer_reference_id: string | null;
  readonly stripe_subscription_reference_id: string | null;
  readonly subscription_status: string | null;
  readonly billing_state: string | null;
  readonly current_period_end: string | null;
  readonly evidence_source: string | null;
  readonly evidence_event_reference_id: string | null;
  readonly evidence_created_at: string | null;
  readonly evidence_recorded_at: string | null;
  readonly updated_at: string | null;
};

type SupabaseSingleResult = {
  readonly data: PaidEntitlementDbRow | null;
  readonly error: { readonly code?: string; readonly message?: string } | null;
};

type SupabaseRpcResult = {
  readonly data: boolean | null;
  readonly error: { readonly code?: string; readonly message?: string } | null;
};

type SupabaseFilterQuery = {
  readonly eq: (column: "billing_user_reference_id" | "stripe_customer_reference_id", value: string) => SupabaseFilterQuery;
  readonly single: () => Promise<SupabaseSingleResult>;
};

type SupabaseTableQuery = {
  readonly select: (columns: typeof commentTranslatorPaidEntitlementStoreContract.trustedSelectColumns) => SupabaseFilterQuery;
};

export type CommentTranslatorPaidEntitlementSupabaseClient = {
  readonly from: (tableName: typeof commentTranslatorPaidEntitlementStoreContract.tableName) => SupabaseTableQuery;
  readonly rpc: (
    functionName: "apply_comment_translator_paid_entitlement_evidence",
    params: Readonly<Record<string, string | null>>
  ) => Promise<SupabaseRpcResult>;
};

export const commentTranslatorPaidEntitlementStoreContract = {
  implementationStage: "creator-closed-beta-c1-durable-paid-entitlement-store",
  runtime: "server-only",
  tableName: "comment_translator_paid_entitlements",
  rowAccess: "trusted-server-service-role-only",
  acceptedEvidenceSource: "signed-stripe-webhook",
  accessDecisionAuthority: "durable-paid-entitlement-row",
  safeDegradation: "safe-free-or-paid-inactive",
  browserReadableOutput: "sanitized-plan-state-only",
  trustedSelectColumns:
    "billing_user_reference_id, stripe_customer_reference_id, stripe_subscription_reference_id, subscription_status, billing_state, current_period_end, evidence_source, evidence_event_reference_id, evidence_created_at, evidence_recorded_at, updated_at",
  remoteSupabaseMigrationApply: "not-run-in-c1-local-implementation",
  remoteSupabaseMutation: "not-run-by-codex-in-c1-local-implementation",
  forbiddenReadableOutput: [
    "owner-user-id-value",
    "billing-user-reference-value",
    "stripe-customer-reference-value",
    "stripe-subscription-reference-value",
    "stripe-price-reference-value",
    "service-role-key-value",
    "webhook-secret-value",
    "provider-target-metadata"
  ]
} as const;

export function createTrustedCommentTranslatorPaidEntitlementSupabaseStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  readonly env?: Partial<Record<CommentTranslatorPaidEntitlementStoreFactoryEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorPaidEntitlementSupabaseClient;
  readonly nowIso?: () => string;
} = {}): CommentTranslatorPaidEntitlementStoreFactoryResult {
  const trustedEnv = env ?? {
    ["NEXT_PUBLIC_SUPABASE_URL"]: process.env.NEXT_PUBLIC_SUPABASE_URL,
    ["SUPABASE_SERVICE_ROLE_KEY"]: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorPaidEntitlementStoreFactoryEnvName[] = [];

  if (!url) missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    return {
      status: "unavailable",
      store: null,
      missingEnvReferences,
      reason: "trusted-service-role-env-missing"
    };
  }

  return {
    status: "ready",
    store: createCommentTranslatorPaidEntitlementSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey),
      nowIso
    }),
    missingEnvReferences: []
  };
}

export function createCommentTranslatorPaidEntitlementSupabaseStore({
  supabase,
  nowIso
}: {
  readonly supabase: CommentTranslatorPaidEntitlementSupabaseClient;
  readonly nowIso: () => string;
}): CommentTranslatorPaidEntitlementStore {
  async function readBy(column: "billing_user_reference_id" | "stripe_customer_reference_id", value: string) {
    const result = await supabase
      .from(commentTranslatorPaidEntitlementStoreContract.tableName)
      .select(commentTranslatorPaidEntitlementStoreContract.trustedSelectColumns)
      .eq(column, value)
      .single();

    if (!result.data && (!result.error || result.error.code === "PGRST116")) return null;
    if (result.error || !result.data) throw new Error("Trusted paid entitlement read failed.");
    const record = parsePaidEntitlementRow(result.data);
    if (!record) throw new Error("Trusted paid entitlement row was incomplete.");
    return record;
  }

  return {
    readByBillingUserReference: (reference) => readBy("billing_user_reference_id", reference),
    readByCustomerReference: (reference) => readBy("stripe_customer_reference_id", reference),
    async persistVerifiedBillingEvidence(evidence) {
      const recordedAtIso = nowIso();
      const result = await supabase.rpc("apply_comment_translator_paid_entitlement_evidence", {
        p_billing_user_reference_id: evidence.billingUserReferenceId,
        p_stripe_customer_reference_id: evidence.customerReferenceId,
        p_stripe_subscription_reference_id: evidence.subscriptionReferenceId,
        p_subscription_status: evidence.subscriptionStatus,
        p_billing_state: evidence.billingState,
        p_current_period_end: evidence.currentPeriodEndIso,
        p_evidence_event_reference_id: evidence.evidenceEventReferenceId,
        p_evidence_created_at: evidence.evidenceCreatedAtIso,
        p_evidence_recorded_at: recordedAtIso
      });

      if (result.error || result.data === null) {
        throw new Error("Trusted paid entitlement write failed.");
      }
      return result.data ? "applied" : "ignored-stale";
    }
  };
}

function parsePaidEntitlementRow(row: PaidEntitlementDbRow): CommentTranslatorPaidEntitlementRecord | null {
  const status = parseSubscriptionStatus(row.subscription_status);
  const billingState = parseBillingState(row.billing_state);
  const activeStatus = status === "active" || status === "trialing";
  if (
    !isBillingUserReference(row.billing_user_reference_id) ||
    row.evidence_source !== "signed-stripe-webhook" ||
    !status ||
    !billingState ||
    (billingState === "paid-active" && !activeStatus) ||
    (billingState === "paid-active" && (!row.stripe_customer_reference_id || !row.stripe_subscription_reference_id)) ||
    (billingState === "paid-active" && (!row.current_period_end || Number.isNaN(Date.parse(row.current_period_end)))) ||
    !row.evidence_event_reference_id ||
    !row.evidence_created_at ||
    Number.isNaN(Date.parse(row.evidence_created_at)) ||
    !row.evidence_recorded_at ||
    !row.updated_at
  ) {
    return null;
  }

  return {
    evidenceSource: "signed-stripe-webhook",
    evidenceEventReferenceId: row.evidence_event_reference_id,
    evidenceCreatedAtIso: row.evidence_created_at,
    billingUserReferenceId: row.billing_user_reference_id,
    customerReferenceId: row.stripe_customer_reference_id,
    subscriptionReferenceId: row.stripe_subscription_reference_id,
    subscriptionStatus: status,
    billingState,
    currentPeriodEndIso: row.current_period_end,
    evidenceRecordedAtIso: row.evidence_recorded_at,
    updatedAtIso: row.updated_at
  };
}

function isBillingUserReference(value: string | null): value is `ctbill_${string}` {
  return typeof value === "string" && /^ctbill_[a-f0-9]{24}$/.test(value);
}

function parseBillingState(value: string | null): CommentTranslatorPaidEntitlementBillingState | null {
  return value === "paid-active" || value === "paid-inactive" ? value : null;
}

function parseSubscriptionStatus(value: string | null): CommentTranslatorPaidEntitlementSubscriptionStatus | null {
  return value === "active" || value === "trialing" || value === "past_due" || value === "unpaid" || value === "canceled" ||
    value === "incomplete" || value === "incomplete_expired" || value === "paused" ? value : null;
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorPaidEntitlementStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorPaidEntitlementStoreFactoryEnvName
) {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorPaidEntitlementSupabaseClient {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return {
    from(tableName) {
      let selectedColumns = commentTranslatorPaidEntitlementStoreContract.trustedSelectColumns;
      let filterColumn: "billing_user_reference_id" | "stripe_customer_reference_id" = "billing_user_reference_id";
      let filterValue = "";
      const filterQuery: SupabaseFilterQuery = {
        eq(column, value) {
          filterColumn = column;
          filterValue = value;
          return filterQuery;
        },
        async single() {
          const result = await client
            .from(tableName)
            .select(selectedColumns)
            .eq(filterColumn, filterValue)
            .single();
          return {
            data: result.data,
            error: result.error ? { code: result.error.code, message: result.error.message } : null
          };
        }
      };
      return {
        select(columns) {
          selectedColumns = columns;
          return filterQuery;
        }
      };
    },
    async rpc(functionName, params) {
      const result = await client.rpc(functionName, params);
      return {
        data: typeof result.data === "boolean" ? result.data : null,
        error: result.error ? { code: result.error.code, message: result.error.message } : null
      };
    }
  };
}
