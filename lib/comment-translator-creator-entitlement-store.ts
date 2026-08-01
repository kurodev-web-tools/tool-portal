import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorCreatorEntitlementRow = {
  id: string;
  plan_key: "creator";
  product_compatibility_key: "comment_translator_creator_v1";
  price_compatibility_key: "creator_monthly_jpy_980_v1";
  status: "active" | "inactive";
  period_start: string;
  period_end: string;
  last_event_created_at: string;
  created_at: string;
  updated_at: string;
};

export type CommentTranslatorCreatorEntitlementRecord = {
  readonly entitlementReferenceId: string;
  readonly plan: "creator";
  readonly status: "active";
  readonly periodStartIso: string;
  readonly periodEndIso: string;
  readonly lastEvidenceAtIso: string;
};

export type CommentTranslatorCreatorEntitlementRead =
  | {
      readonly status: "ready";
      readonly entitlement: CommentTranslatorCreatorEntitlementRecord;
      readonly authority: "signed-stripe-evidence";
    }
  | {
      readonly status: "paid-inactive";
      readonly entitlement: null;
      readonly authority: "fail-closed";
      readonly reason: "missing" | "unreadable" | "malformed" | "inactive" | "stale";
    };

export type CommentTranslatorCreatorSignedEvidenceRequest = {
  readonly ownerUserId: string;
  readonly stripeCustomerReference: string;
  readonly stripeSubscriptionReference: string;
  readonly stripeEventReference: string;
  readonly signatureVerified: boolean;
  readonly planKey: "creator";
  readonly productCompatibilityKey: "comment_translator_creator_v1";
  readonly priceCompatibilityKey: "creator_monthly_jpy_980_v1";
  readonly status: "active" | "inactive";
  readonly periodStartIso: string;
  readonly periodEndIso: string;
  readonly eventCreatedAtIso: string;
};

export type CommentTranslatorCreatorSignedEvidenceResult =
  | { readonly status: "applied" }
  | { readonly status: "rejected"; readonly reason: string };

export type CommentTranslatorCreatorEntitlementStore = {
  readEntitlement(request: { readonly ownerUserId: string }): Promise<CommentTranslatorCreatorEntitlementRead>;
  applySignedEvidence(
    request: CommentTranslatorCreatorSignedEvidenceRequest
  ): Promise<CommentTranslatorCreatorSignedEvidenceResult>;
};

export type CommentTranslatorCreatorEntitlementStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorCreatorEntitlementStoreFactoryResult =
  | {
      readonly status: "ready";
      readonly store: CommentTranslatorCreatorEntitlementStore;
      readonly missingEnvReferences: readonly [];
      readonly failClosed: false;
    }
  | {
      readonly status: "unavailable";
      readonly store: null;
      readonly missingEnvReferences: readonly CommentTranslatorCreatorEntitlementStoreFactoryEnvName[];
      readonly failClosed: true;
      readonly reason: "trusted-service-role-env-missing";
    };

type SupabaseError = { readonly code?: string; readonly message?: string } | null;
type SupabaseSingleResult = {
  readonly data: CommentTranslatorCreatorEntitlementRow | null;
  readonly error: SupabaseError;
};
type SupabaseRpcResult = {
  readonly data: unknown;
  readonly error: SupabaseError;
};
type SupabaseEntitlementQuery = {
  select(columns: typeof commentTranslatorCreatorEntitlementStoreContract.trustedSelectColumns): SupabaseEntitlementQuery;
  eq(column: "owner_user_id", value: string): SupabaseEntitlementQuery;
  single(): Promise<SupabaseSingleResult>;
};

export type CommentTranslatorCreatorEntitlementSupabaseClient = {
  from(tableName: typeof commentTranslatorCreatorEntitlementStoreContract.tableName): SupabaseEntitlementQuery;
  rpc(
    functionName: typeof commentTranslatorCreatorEntitlementStoreContract.signedEvidenceRpc,
    parameters: Record<string, unknown>
  ): Promise<SupabaseRpcResult>;
};

export const commentTranslatorCreatorEntitlementStoreContract = {
  implementationStage: "nc-d1-local-schema-adapter",
  runtime: "server-only",
  tableName: "comment_translator_creator_paid_entitlements",
  evidenceTableName: "comment_translator_creator_entitlement_evidence",
  signedEvidenceRpc: "apply_comment_translator_creator_signed_entitlement_evidence",
  writeAuthority: "signed-stripe-webhook-evidence-only",
  rowAccess: "trusted-server-service-role-only",
  writeMode: "atomic-rpc-only",
  browserAuthority: "forbidden",
  rawProviderPayloadPersistence: "forbidden",
  missingOrUnreadableFallback: "paid-inactive",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseReadWrite: "not-run-in-this-thread",
  creatorActivation: "disabled-nc-f1-boundary-unchanged",
  containerFallback: "forbidden",
  trustedSelectColumns:
    "id, plan_key, product_compatibility_key, price_compatibility_key, status, period_start, period_end, last_event_created_at, created_at, updated_at"
} as const;

export function createTrustedCommentTranslatorCreatorEntitlementStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowMs = () => Date.now()
}: {
  readonly env?: Partial<Record<CommentTranslatorCreatorEntitlementStoreFactoryEnvName, string | undefined>>;
  readonly createSupabaseClient?: (
    url: string,
    serviceRoleKey: string
  ) => CommentTranslatorCreatorEntitlementSupabaseClient;
  readonly nowMs?: () => number;
} = {}): CommentTranslatorCreatorEntitlementStoreFactoryResult {
  const trustedEnv =
    env ?? (process.env as Partial<Record<CommentTranslatorCreatorEntitlementStoreFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorCreatorEntitlementStoreFactoryEnvName[] = [];

  if (!url) {
    missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  }

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
    store: createCommentTranslatorCreatorEntitlementSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey),
      nowMs
    }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorCreatorEntitlementSupabaseStore({
  supabase,
  nowMs = () => Date.now()
}: {
  readonly supabase: CommentTranslatorCreatorEntitlementSupabaseClient;
  readonly nowMs?: () => number;
}): CommentTranslatorCreatorEntitlementStore {
  return {
    async readEntitlement(request) {
      let result: SupabaseSingleResult;
      try {
        result = await supabase
          .from(commentTranslatorCreatorEntitlementStoreContract.tableName)
          .select(commentTranslatorCreatorEntitlementStoreContract.trustedSelectColumns)
          .eq("owner_user_id", request.ownerUserId)
          .single();
      } catch {
        return createPaidInactiveRead("unreadable");
      }

      if (!result.data && (!result.error || result.error.code === "PGRST116")) {
        return createPaidInactiveRead("missing");
      }
      if (result.error || !result.data) {
        return createPaidInactiveRead("unreadable");
      }
      if (result.data.status === "inactive") {
        return createPaidInactiveRead("inactive");
      }

      const entitlement = createEntitlementRecord(result.data);
      if (!entitlement) {
        return createPaidInactiveRead("malformed");
      }
      if (Date.parse(entitlement.periodEndIso) <= nowMs()) {
        return createPaidInactiveRead("stale");
      }

      return {
        status: "ready",
        entitlement,
        authority: "signed-stripe-evidence"
      };
    },
    async applySignedEvidence(request) {
      let result: SupabaseRpcResult;
      try {
        result = await supabase.rpc(commentTranslatorCreatorEntitlementStoreContract.signedEvidenceRpc, {
          p_owner_user_id: request.ownerUserId,
          p_stripe_customer_reference: request.stripeCustomerReference,
          p_stripe_subscription_reference: request.stripeSubscriptionReference,
          p_stripe_event_reference: request.stripeEventReference,
          p_signature_verified: request.signatureVerified,
          p_plan_key: request.planKey,
          p_product_compatibility_key: request.productCompatibilityKey,
          p_price_compatibility_key: request.priceCompatibilityKey,
          p_status: request.status,
          p_period_start: request.periodStartIso,
          p_period_end: request.periodEndIso,
          p_event_created_at: request.eventCreatedAtIso
        });
      } catch {
        return { status: "rejected", reason: "rpc-unavailable" };
      }

      if (result.error) {
        return { status: "rejected", reason: "rpc-unavailable" };
      }

      return readSignedEvidenceResult(result.data);
    }
  };
}

function createEntitlementRecord(row: CommentTranslatorCreatorEntitlementRow): CommentTranslatorCreatorEntitlementRecord | null {
  if (
    row.plan_key !== "creator" ||
    row.product_compatibility_key !== "comment_translator_creator_v1" ||
    row.price_compatibility_key !== "creator_monthly_jpy_980_v1" ||
    (row.status !== "active" && row.status !== "inactive") ||
    !isOrderedIsoPeriod(row.period_start, row.period_end) ||
    !isIsoTimestamp(row.last_event_created_at)
  ) {
    return null;
  }

  return {
    entitlementReferenceId: row.id,
    plan: "creator",
    status: "active",
    periodStartIso: row.period_start,
    periodEndIso: row.period_end,
    lastEvidenceAtIso: row.last_event_created_at
  };
}

function createPaidInactiveRead(
  reason: "missing" | "unreadable" | "malformed" | "inactive" | "stale"
): CommentTranslatorCreatorEntitlementRead {
  return {
    status: "paid-inactive",
    entitlement: null,
    authority: "fail-closed",
    reason
  };
}

function readSignedEvidenceResult(data: unknown): CommentTranslatorCreatorSignedEvidenceResult {
  if (!data || typeof data !== "object" || !("status" in data)) {
    return { status: "rejected", reason: "malformed-rpc-result" };
  }

  const result = data as { readonly status?: unknown; readonly reason?: unknown };
  if (result.status === "applied") {
    return { status: "applied" };
  }
  if (result.status === "rejected" && typeof result.reason === "string") {
    return { status: "rejected", reason: result.reason };
  }
  return { status: "rejected", reason: "malformed-rpc-result" };
}

function isOrderedIsoPeriod(periodStartIso: string, periodEndIso: string): boolean {
  const periodStart = Date.parse(periodStartIso);
  const periodEnd = Date.parse(periodEndIso);
  return Number.isFinite(periodStart) && Number.isFinite(periodEnd) && periodEnd > periodStart;
}

function isIsoTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorCreatorEntitlementStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorCreatorEntitlementStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorCreatorEntitlementSupabaseClient {
  const client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return {
    from(tableName) {
      return client.from(tableName) as unknown as SupabaseEntitlementQuery;
    },
    rpc(functionName, parameters) {
      return client.rpc(functionName, parameters) as unknown as Promise<SupabaseRpcResult>;
    }
  };
}
