import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorPaidEntitlementStatus =
  | "active"
  | "cancel_at_period_end"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "canceled"
  | "incomplete_expired"
  | "dispute"
  | "cancel_pending"
  | "paid_unentitled_reconciliation"
  | "refund_reconciliation"
  | "dispute_reconciliation"
  | "inactive";

export type CommentTranslatorPaidDisputeState = "none" | "investigating" | "won" | "lost" | "reconciliation";

export type CommentTranslatorPaidEntitlementRow = {
  id: string;
  lifecycle_id: string;
  owner_user_id: string;
  customer_binding_id: string;
  subscription_binding_id: string | null;
  product_id: string;
  price_id: string;
  entitlement_status: CommentTranslatorPaidEntitlementStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  dispute_state: CommentTranslatorPaidDisputeState;
  payment_failure_started_at: string | null;
  projected_at: string;
  updated_at: string;
};

export type CommentTranslatorPaidEntitlement = {
  id: string;
  lifecycleId: string;
  ownerUserId: string;
  customerBindingId: string;
  subscriptionBindingId: string | null;
  productId: string;
  priceId: string;
  status: CommentTranslatorPaidEntitlementStatus;
  currentPeriodStartIso: string | null;
  currentPeriodEndIso: string | null;
  cancelAtPeriodEnd: boolean;
  disputeState: CommentTranslatorPaidDisputeState;
  paymentFailureStartedAtIso: string | null;
  projectedAtIso: string;
  updatedAtIso: string;
};

export type CommentTranslatorPaidStripeEventClaim = {
  claimStatus: "processing" | "retryable" | "complete" | "rejected";
  leaseToken: string | null;
  attemptCount: number;
};

export type CommentTranslatorPaidCheckoutInitialization = {
  lifecycleId: string;
  holdId: string;
  customerBindingId: string;
  idempotencyKey: string;
  checkoutExpiresAtTargetIso: string;
};

export type CommentTranslatorPaidEntitlementProjectionClaim = {
  projectionLeaseToken: string;
  projectionLeaseUntilIso: string;
};

export type CommentTranslatorPaidStripeBinding = {
  ownerUserId: string;
  lifecycleId: string;
  customerBindingId: string;
  holdId: string | null;
  stripeCustomerId: string;
  stripeCheckoutSessionId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionBindingId: string | null;
  productId: string | null;
  priceId: string | null;
  lifecycleState: string;
  stripeExpiresAtIso: string | null;
  idempotencyKey: string | null;
};

export type CommentTranslatorPaidStripeBindingResolution =
  | { status: "ready"; binding: CommentTranslatorPaidStripeBinding }
  | { status: "missing" }
  | { status: "conflict" };

export type CommentTranslatorPaidEntitlementStore = {
  beginCheckout: (request: {
    ownerUserId: string;
    stripeCustomerId: string;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidCheckoutInitialization>;
  bindCheckoutSession: (request: {
    ownerUserId: string;
    lifecycleId: string;
    holdId: string;
    customerBindingId: string;
    stripeCheckoutSessionId: string;
    stripeCustomerId: string;
    stripeExpiresAtIso: string;
    isRecoveryBinding: boolean;
    idempotencyKey: string;
    nowIso: string;
  }) => Promise<string>;
  markCheckoutExpireRequired: (request: {
    ownerUserId: string;
    lifecycleId: string;
    holdId: string;
    customerBindingId: string;
    stripeCheckoutSessionId: string;
    stripeCustomerId: string;
    stripeExpiresAtIso: string;
    idempotencyKey: string;
    checkoutExpiresAtTargetIso: string;
    nowIso: string;
  }) => Promise<boolean>;
  expireCheckoutHold: (request: {
    lifecycleId: string;
    ownerUserId: string;
    holdId: string;
    stripeSessionStatus: "expired" | "complete" | "open" | "unknown";
    stripeSessionCheckedAtIso: string;
    reconcileLeaseToken: string | null;
    nowIso: string;
  }) => Promise<boolean>;
  readEntitlement: (request: { ownerUserId: string; lifecycleId?: string }) => Promise<CommentTranslatorPaidEntitlement | null>;
  resolveStripeBinding: (request: {
    stripeCustomerId?: string | null;
    stripeCheckoutSessionId?: string | null;
    stripeSubscriptionId?: string | null;
  }) => Promise<CommentTranslatorPaidStripeBindingResolution>;
  claimEntitlementProjection: (request: {
    ownerUserId: string;
    lifecycleId: string;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidEntitlementProjectionClaim | null>;
  projectEntitlement: (request: {
    lifecycleId: string;
    ownerUserId: string;
    customerBindingId: string;
    subscriptionBindingId: string | null;
    productId: string;
    priceId: string;
    status: CommentTranslatorPaidEntitlementStatus;
    currentPeriodStartIso: string | null;
    currentPeriodEndIso: string | null;
    cancelAtPeriodEnd: boolean;
    disputeState: CommentTranslatorPaidDisputeState;
    lifecycleState?: string | null;
    subscriptionStatus?: string | null;
    projectionLeaseToken: string;
    reconcileLeaseToken: string | null;
    nowIso: string;
  }) => Promise<string>;
  bindFirstSubscription: (request: {
    lifecycleId: string;
    ownerUserId: string;
    customerBindingId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    productId: string;
    priceId: string;
    entitlementStatus: CommentTranslatorPaidEntitlementStatus;
    currentPeriodStartIso: string | null;
    currentPeriodEndIso: string | null;
    cancelAtPeriodEnd: boolean;
    disputeState: CommentTranslatorPaidDisputeState;
    lifecycleState: string;
    projectionLeaseToken: string;
    reconcileLeaseToken: string | null;
    nowIso: string;
  }) => Promise<string>;
  claimStripeEvent: (request: {
    eventId: string;
    eventType: string;
    stripeEventCreatedAtIso: string;
    objectType: string;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidStripeEventClaim>;
  finalizeStripeEvent: (request: {
    eventId: string;
    leaseToken: string;
    status: "retryable" | "complete" | "rejected";
    errorClass?: string;
    nowIso: string;
  }) => Promise<boolean>;
};

export type CommentTranslatorPaidStoreFactoryEnvName = "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorPaidEntitlementStoreFactoryResult =
  | {
      status: "ready";
      store: CommentTranslatorPaidEntitlementStore;
      missingEnvReferences: readonly [];
      failClosed: false;
    }
  | {
      status: "unavailable";
      store: null;
      missingEnvReferences: readonly CommentTranslatorPaidStoreFactoryEnvName[];
      failClosed: true;
      reason: "trusted-service-role-env-missing";
    };

type SupabaseError = { code?: string; message?: string } | null;
type SupabaseRpcResult = { data: unknown; error: SupabaseError };
type SupabaseQuery = {
  select: (columns: string) => SupabaseQuery;
  eq: (column: string, value: unknown) => SupabaseQuery;
  limit: (count: number) => SupabaseQuery;
  maybeSingle: () => Promise<SupabaseRpcResult>;
};
type SupabaseClient = {
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<SupabaseRpcResult>;
  from?: (tableName: string) => SupabaseQuery;
};

export const commentTranslatorPaidEntitlementStoreContract = {
  implementationStage: "comment-translator-paid-v1-task2-durable-entitlement-adapter",
  runtime: "server-only",
  tableName: "comment_translator_paid_entitlements",
  eventReceiptTableName: "comment_translator_paid_stripe_event_receipts",
  rowAccess: "trusted-server-service-role-only",
  mutationAuthority: "atomic-trusted-rpc-only",
  checkoutInitializationAuthority: "customer-lifecycle-capacity-hold-in-one-trusted-rpc",
  checkoutCanonicalAuthority: "hold-derived-idempotency-key-and-statement-clock-31-minute-target",
  checkoutSessionBindingAuthority: "insert-once-immutable",
  checkoutBindingFailureAuthority: "session-binding-and-pending-hold-to-expire-required-in-one-trusted-rpc",
  checkoutExpiryAuthority: "hold-lifecycle-capacity-release-in-one-trusted-rpc",
  customerBindingAuthority: "insert-only-immutable",
  subscriptionBindingAuthority: "insert-only-immutable",
  projectionAuthority: "durable-entitlement-only",
  projectionFreshnessAuthority: "refetched-current-stripe-object-not-generic-event-created",
  projectionClaimAuthority: "lifecycle-scoped-opaque-120-second-cas-before-stripe-refetch",
  projectionAtomicity: "lifecycle-entitlement-capacity-in-one-trusted-rpc",
  paymentFailureAtomicity: "current-subscription-status-and-entitlement-in-one-trusted-rpc",
  stripeBindingLookupAuthority: "trusted-read-only-immutable-binding-resolution",
  genericSubscriptionVersion: "not-used",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  browserReadableOutput: "never-returned-by-this-server-only-adapter",
  failClosedFallback: "paid-unavailable-until-durable-entitlement-readable",
  trustedRpcNames: [
    "ct_paid_begin_checkout",
    "ct_paid_bind_checkout_session",
    "ct_paid_mark_checkout_expire_required",
    "ct_paid_expire_checkout_hold",
    "ct_paid_claim_entitlement_projection",
    "ct_paid_project_entitlement",
    "ct_paid_bind_first_subscription",
    "ct_paid_read_entitlement",
    "ct_paid_claim_stripe_event",
    "ct_paid_finalize_stripe_event"
  ] as const,
  trustedSelectColumns:
    "id, lifecycle_id, owner_user_id, customer_binding_id, subscription_binding_id, product_id, price_id, entitlement_status, current_period_start, current_period_end, cancel_at_period_end, dispute_state, payment_failure_started_at, projected_at, updated_at"
} as const;

export function createTrustedCommentTranslatorPaidEntitlementStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  env?: Partial<Record<CommentTranslatorPaidStoreFactoryEnvName, string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => SupabaseClient;
} = {}): CommentTranslatorPaidEntitlementStoreFactoryResult {
  const trustedEnv = env ?? (process.env as Partial<Record<CommentTranslatorPaidStoreFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorPaidStoreFactoryEnvName[] = [];

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
    store: createCommentTranslatorPaidEntitlementStore({ supabase: createSupabaseClient(url, serviceRoleKey) }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorPaidEntitlementStore({
  supabase
}: {
  supabase: SupabaseClient;
}): CommentTranslatorPaidEntitlementStore {
  return {
    async beginCheckout(request) {
      const result = await supabase.rpc("ct_paid_begin_checkout", {
        p_owner_user_id: request.ownerUserId,
        p_stripe_customer_id: request.stripeCustomerId,
        p_now: request.nowIso
      });
      if (result.error) throw new Error("Paid Checkout initialization failed.");
      const row = firstRpcRow(result.data);
      return {
        lifecycleId: readString(row, "lifecycle_id"),
        holdId: readString(row, "hold_id"),
        customerBindingId: readString(row, "customer_binding_id"),
        idempotencyKey: readString(row, "idempotency_key"),
        checkoutExpiresAtTargetIso: readString(row, "checkout_expires_at_target")
      };
    },
    async bindCheckoutSession(request) {
      const result = await supabase.rpc("ct_paid_bind_checkout_session", {
        p_owner_user_id: request.ownerUserId,
        p_lifecycle_id: request.lifecycleId,
        p_hold_id: request.holdId,
        p_customer_binding_id: request.customerBindingId,
        p_stripe_checkout_session_id: request.stripeCheckoutSessionId,
        p_stripe_customer_id: request.stripeCustomerId,
        p_stripe_expires_at: request.stripeExpiresAtIso,
        p_is_recovery_binding: request.isRecoveryBinding,
        p_idempotency_key: request.idempotencyKey,
        p_now: request.nowIso
      });
      return readRpcUuid(result, "Paid Checkout Session binding failed.");
    },
    async markCheckoutExpireRequired(request) {
      const result = await supabase.rpc("ct_paid_mark_checkout_expire_required", {
        p_owner_user_id: request.ownerUserId,
        p_lifecycle_id: request.lifecycleId,
        p_hold_id: request.holdId,
        p_customer_binding_id: request.customerBindingId,
        p_stripe_checkout_session_id: request.stripeCheckoutSessionId,
        p_stripe_customer_id: request.stripeCustomerId,
        p_stripe_expires_at: request.stripeExpiresAtIso,
        p_idempotency_key: request.idempotencyKey,
        p_checkout_expires_at_target: request.checkoutExpiresAtTargetIso,
        p_now: request.nowIso
      });
      if (result.error || result.data !== true) throw new Error("Paid Checkout expire-required transition failed.");
      return true;
    },
    async expireCheckoutHold(request) {
      const result = await supabase.rpc("ct_paid_expire_checkout_hold", {
        p_lifecycle_id: request.lifecycleId,
        p_owner_user_id: request.ownerUserId,
        p_hold_id: request.holdId,
        p_stripe_session_status: request.stripeSessionStatus,
        p_stripe_session_checked_at: request.stripeSessionCheckedAtIso,
        p_reconcile_lease_token: request.reconcileLeaseToken,
        p_now: request.nowIso
      });
      if (result.error || result.data !== true) throw new Error("Paid Checkout hold expiry failed.");
      return true;
    },
    async readEntitlement({ ownerUserId, lifecycleId }) {
      const result = await supabase.rpc("ct_paid_read_entitlement", {
        p_owner_user_id: ownerUserId,
        p_lifecycle_id: lifecycleId ?? null
      });
      if (result.error) throw new Error("Paid entitlement read failed.");
      const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
      if (rows.length === 0) return null;
      if (rows.length !== 1) throw new Error("Paid entitlement read was ambiguous.");
      return mapEntitlementRow(rows[0]);
    },
    async resolveStripeBinding(request) {
      if (!supabase.from) throw new Error("Paid Stripe binding lookup is unavailable.");

      const requestedCheckoutSessionId = normalizeOptionalReference(request.stripeCheckoutSessionId);
      const requestedSubscriptionId = normalizeOptionalReference(request.stripeSubscriptionId);
      const requestedCustomerId = normalizeOptionalReference(request.stripeCustomerId);
      const sessionRow = requestedCheckoutSessionId
        ? await readMaybeTrustedRow(
            supabase,
            "comment_translator_paid_checkout_session_bindings",
            "stripe_checkout_session_id",
            requestedCheckoutSessionId
          )
        : null;
      const subscriptionRow = requestedSubscriptionId
        ? await readMaybeTrustedRow(
            supabase,
            "comment_translator_paid_subscription_bindings",
            "stripe_subscription_id",
            requestedSubscriptionId
          )
        : null;

      if (requestedCheckoutSessionId && !sessionRow) {
        return { status: "missing" };
      }

      const directRows = [sessionRow, subscriptionRow].filter((row): row is Record<string, unknown> => row !== null);
      if (
        directRows.some(
          (row) =>
            requestedCustomerId !== null &&
            readOptionalString(row, "stripe_customer_id") !== requestedCustomerId
        )
      ) {
        return { status: "conflict" };
      }

      const stripeCustomerId =
        requestedCustomerId ??
        readOptionalString(sessionRow, "stripe_customer_id") ??
        readOptionalString(subscriptionRow, "stripe_customer_id");
      if (!stripeCustomerId) return { status: "missing" };

      const customerRow = await readMaybeTrustedRow(
        supabase,
        "comment_translator_paid_customers",
        "stripe_customer_id",
        stripeCustomerId
      );
      if (!customerRow) return { status: "missing" };
      const customerBindingId = readOptionalString(customerRow, "id");
      const ownerUserId = readOptionalString(customerRow, "owner_user_id");
      if (!customerBindingId || !ownerUserId || readOptionalString(customerRow, "stripe_customer_id") !== stripeCustomerId) {
        return { status: "conflict" };
      }

      const directLifecycleIds = new Set(
        directRows.map((row) => readOptionalString(row, "lifecycle_id")).filter((value): value is string => value !== null)
      );
      if (directLifecycleIds.size > 1) return { status: "conflict" };
      const directLifecycleId = [...directLifecycleIds][0] ?? null;
      const lifecycleRow = directLifecycleId
        ? await readMaybeTrustedRowById(supabase, "comment_translator_paid_billing_lifecycles", directLifecycleId)
        : await readMaybeTrustedRow(
            supabase,
            "comment_translator_paid_billing_lifecycles",
            "customer_binding_id",
            customerBindingId,
            { extraColumn: "is_terminal", extraValue: false }
          );
      if (!lifecycleRow) return { status: "missing" };
      const lifecycleId = readOptionalString(lifecycleRow, "id");
      const lifecycleOwnerUserId = readOptionalString(lifecycleRow, "owner_user_id");
      const lifecycleCustomerBindingId = readOptionalString(lifecycleRow, "customer_binding_id");
      const lifecycleState = readOptionalString(lifecycleRow, "lifecycle_state");
      if (
        !lifecycleId ||
        !lifecycleOwnerUserId ||
        !lifecycleCustomerBindingId ||
        !lifecycleState ||
        lifecycleOwnerUserId !== ownerUserId ||
        lifecycleCustomerBindingId !== customerBindingId ||
        (sessionRow && readOptionalString(sessionRow, "owner_user_id") !== ownerUserId) ||
        (subscriptionRow && readOptionalString(subscriptionRow, "owner_user_id") !== ownerUserId)
      ) {
        return { status: "conflict" };
      }

      const holdRow = await readMaybeTrustedRow(
        supabase,
        "comment_translator_paid_checkout_holds",
        "lifecycle_id",
        lifecycleId
      );
      const resolvedSessionRow =
        sessionRow ??
        (await readMaybeTrustedRow(
          supabase,
          "comment_translator_paid_checkout_session_bindings",
          "lifecycle_id",
          lifecycleId
        ));
      const resolvedSubscriptionRow =
        subscriptionRow ??
        (await readMaybeTrustedRow(
          supabase,
          "comment_translator_paid_subscription_bindings",
          "lifecycle_id",
          lifecycleId
        ));
      if (requestedSubscriptionId && !subscriptionRow) {
        if (!resolvedSessionRow) return { status: "missing" };
        const existingSubscriptionId = readOptionalString(resolvedSubscriptionRow, "stripe_subscription_id");
        if (existingSubscriptionId && existingSubscriptionId !== requestedSubscriptionId) {
          return { status: "conflict" };
        }
      }
      if (
        readOptionalString(resolvedSessionRow, "stripe_customer_id") !== null &&
        readOptionalString(resolvedSessionRow, "stripe_customer_id") !== stripeCustomerId
      ) {
        return { status: "conflict" };
      }
      if (
        requestedCheckoutSessionId &&
        readOptionalString(resolvedSessionRow, "stripe_checkout_session_id") !== requestedCheckoutSessionId
      ) {
        return { status: "conflict" };
      }
      if (
        requestedSubscriptionId &&
        subscriptionRow &&
        readOptionalString(resolvedSubscriptionRow, "stripe_subscription_id") !== requestedSubscriptionId
      ) {
        return { status: "conflict" };
      }

      return {
        status: "ready",
        binding: {
          ownerUserId,
          lifecycleId,
          customerBindingId,
          holdId: readOptionalString(holdRow, "id"),
          stripeCustomerId,
          stripeCheckoutSessionId: readOptionalString(resolvedSessionRow, "stripe_checkout_session_id"),
          stripeSubscriptionId: readOptionalString(resolvedSubscriptionRow, "stripe_subscription_id"),
          subscriptionBindingId: readOptionalString(resolvedSubscriptionRow, "id"),
          productId: readOptionalString(resolvedSubscriptionRow, "product_id"),
          priceId: readOptionalString(resolvedSubscriptionRow, "price_id"),
          lifecycleState,
          stripeExpiresAtIso: readOptionalString(resolvedSessionRow, "stripe_expires_at"),
          idempotencyKey: readOptionalString(holdRow, "idempotency_key")
        }
      };
    },
    async claimEntitlementProjection(request) {
      const result = await supabase.rpc("ct_paid_claim_entitlement_projection", {
        p_owner_user_id: request.ownerUserId,
        p_lifecycle_id: request.lifecycleId,
        p_now: request.nowIso
      });
      if (result.error) throw new Error("Paid entitlement projection claim failed.");
      const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
      if (rows.length === 0) return null;
      if (rows.length !== 1) throw new Error("Paid entitlement projection claim was ambiguous.");
      const row = asRecord(rows[0]);
      return {
        projectionLeaseToken: readString(row, "projection_lease_token"),
        projectionLeaseUntilIso: readString(row, "projection_lease_until")
      };
    },
    async projectEntitlement(request) {
      const result = await supabase.rpc("ct_paid_project_entitlement", {
        p_lifecycle_id: request.lifecycleId,
        p_owner_user_id: request.ownerUserId,
        p_customer_binding_id: request.customerBindingId,
        p_subscription_binding_id: request.subscriptionBindingId,
        p_product_id: request.productId,
        p_price_id: request.priceId,
        p_entitlement_status: request.status,
        p_current_period_start: request.currentPeriodStartIso,
        p_current_period_end: request.currentPeriodEndIso,
        p_cancel_at_period_end: request.cancelAtPeriodEnd,
        p_dispute_state: request.disputeState,
        p_projection_lease_token: request.projectionLeaseToken,
        p_reconcile_lease_token: request.reconcileLeaseToken,
        p_now: request.nowIso,
        p_lifecycle_state: request.lifecycleState ?? null,
        p_subscription_status: request.subscriptionStatus ?? null
      });
      return readRpcUuid(result, "Paid entitlement projection failed.");
    },
    async bindFirstSubscription(request) {
      const result = await supabase.rpc("ct_paid_bind_first_subscription", {
        p_lifecycle_id: request.lifecycleId,
        p_owner_user_id: request.ownerUserId,
        p_customer_binding_id: request.customerBindingId,
        p_stripe_subscription_id: request.stripeSubscriptionId,
        p_stripe_customer_id: request.stripeCustomerId,
        p_product_id: request.productId,
        p_price_id: request.priceId,
        p_entitlement_status: request.entitlementStatus,
        p_current_period_start: request.currentPeriodStartIso,
        p_current_period_end: request.currentPeriodEndIso,
        p_cancel_at_period_end: request.cancelAtPeriodEnd,
        p_dispute_state: request.disputeState,
        p_lifecycle_state: request.lifecycleState,
        p_projection_lease_token: request.projectionLeaseToken,
        p_reconcile_lease_token: request.reconcileLeaseToken,
        p_now: request.nowIso
      });
      return readRpcUuid(result, "Paid subscription binding failed.");
    },
    async claimStripeEvent(request) {
      const result = await supabase.rpc("ct_paid_claim_stripe_event", {
        p_event_id: request.eventId,
        p_event_type: request.eventType,
        p_stripe_event_created_at: request.stripeEventCreatedAtIso,
        p_object_type: request.objectType,
        p_now: request.nowIso
      });
      if (result.error) throw new Error("Stripe event claim failed.");
      const row = firstRpcRow(result.data);
      const claimStatus = readString(row, "claim_status");
      const attemptCount = readNonNegativeInteger(row, "attempt_count");
      if (!isStripeClaimStatus(claimStatus)) throw new Error("Stripe event claim returned an invalid status.");
      const leaseToken = readNullableString(row, "lease_token");
      if (claimStatus === "processing" && attemptCount > 0 && leaseToken === null) {
        return { claimStatus, leaseToken, attemptCount };
      }
      if (claimStatus === "processing" && leaseToken === null) {
        throw new Error("Stripe event claim returned processing without claim authority.");
      }
      return {
        claimStatus,
        leaseToken,
        attemptCount
      };
    },
    async finalizeStripeEvent(request) {
      const result = await supabase.rpc("ct_paid_finalize_stripe_event", {
        p_event_id: request.eventId,
        p_lease_token: request.leaseToken,
        p_receipt_status: request.status,
        p_error_class: request.errorClass ?? null,
        p_now: request.nowIso
      });
      if (result.error) throw new Error("Stripe event finalization failed.");
      if (result.data !== true) throw new Error("Stripe event finalization returned an invalid result.");
      return true;
    }
  };
}

function mapEntitlementRow(value: unknown): CommentTranslatorPaidEntitlement {
  const row = asRecord(value);
  const status = readString(row, "entitlement_status");
  const disputeState = readString(row, "dispute_state");
  if (!isEntitlementStatus(status) || !isDisputeState(disputeState)) {
    throw new Error("Paid entitlement row is invalid.");
  }
  return {
    id: readString(row, "id"),
    lifecycleId: readString(row, "lifecycle_id"),
    ownerUserId: readString(row, "owner_user_id"),
    customerBindingId: readString(row, "customer_binding_id"),
    subscriptionBindingId: readNullableString(row, "subscription_binding_id"),
    productId: readString(row, "product_id"),
    priceId: readString(row, "price_id"),
    status,
    currentPeriodStartIso: readNullableString(row, "current_period_start"),
    currentPeriodEndIso: readNullableString(row, "current_period_end"),
    cancelAtPeriodEnd: readBoolean(row, "cancel_at_period_end"),
    disputeState,
    paymentFailureStartedAtIso: readNullableString(row, "payment_failure_started_at"),
    projectedAtIso: readString(row, "projected_at"),
    updatedAtIso: readString(row, "updated_at")
  };
}

function readRpcUuid(result: SupabaseRpcResult, message: string): string {
  if (result.error) throw new Error(message);
  if (typeof result.data === "string" && result.data.length > 0) return result.data;
  if (Array.isArray(result.data) && typeof result.data[0] === "string" && result.data[0].length > 0) {
    return result.data[0];
  }
  const row = firstRpcRow(result.data);
  const id = row.id ?? row.binding_id ?? row.entitlement_id;
  if (typeof id !== "string" || id.length === 0) throw new Error(message);
  return id;
}

async function readMaybeTrustedRow(
  supabase: SupabaseClient,
  tableName: string,
  column: string,
  value: string,
  extra?: { extraColumn: string; extraValue: unknown }
): Promise<Record<string, unknown> | null> {
  if (!supabase.from) throw new Error("Paid Stripe binding lookup is unavailable.");
  let query = supabase.from(tableName).select("*").eq(column, value);
  if (extra) query = query.eq(extra.extraColumn, extra.extraValue);
  const result = await query.limit(2).maybeSingle();
  if (result.error) throw new Error("Paid Stripe binding lookup failed.");
  if (result.data === null || result.data === undefined) return null;
  return asRecord(result.data);
}

async function readMaybeTrustedRowById(
  supabase: SupabaseClient,
  tableName: string,
  id: string
): Promise<Record<string, unknown> | null> {
  return readMaybeTrustedRow(supabase, tableName, "id", id);
}

function normalizeOptionalReference(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readOptionalString(row: Record<string, unknown> | null, key: string): string | null {
  if (!row) return null;
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function firstRpcRow(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
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

function readNullableString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return readString(row, key);
}

function readBoolean(row: Record<string, unknown>, key: string): boolean {
  if (typeof row[key] !== "boolean") throw new Error("Trusted Paid store response is invalid.");
  return row[key] as boolean;
}

function readNonNegativeInteger(row: Record<string, unknown>, key: string): number {
  if (!Number.isInteger(row[key]) || (row[key] as number) < 0) throw new Error("Trusted Paid store response is invalid.");
  return row[key] as number;
}

function isStripeClaimStatus(value: string): value is CommentTranslatorPaidStripeEventClaim["claimStatus"] {
  return value === "processing" || value === "retryable" || value === "complete" || value === "rejected";
}

function isEntitlementStatus(value: string): value is CommentTranslatorPaidEntitlementStatus {
  return [
    "active",
    "cancel_at_period_end",
    "past_due",
    "unpaid",
    "incomplete",
    "canceled",
    "incomplete_expired",
    "dispute",
    "cancel_pending",
    "paid_unentitled_reconciliation",
    "refund_reconciliation",
    "dispute_reconciliation",
    "inactive"
  ].includes(value);
}

function isDisputeState(value: string): value is CommentTranslatorPaidDisputeState {
  return ["none", "investigating", "won", "lost", "reconciliation"].includes(value);
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorPaidStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorPaidStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value || null;
}

function createTrustedSupabaseServiceRoleClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as unknown as SupabaseClient;
}
