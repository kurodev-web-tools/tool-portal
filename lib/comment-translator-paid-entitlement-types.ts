export type CommentTranslatorPaidEntitlementBillingState = "paid-active" | "paid-inactive";

export type CommentTranslatorPaidEntitlementSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type CommentTranslatorVerifiedBillingEvidence = {
  readonly evidenceSource: "signed-stripe-webhook";
  readonly evidenceEventReferenceId: string;
  readonly evidenceCreatedAtIso: string;
  readonly billingUserReferenceId: `ctbill_${string}`;
  readonly customerReferenceId: string | null;
  readonly subscriptionReferenceId: string | null;
  readonly subscriptionStatus: CommentTranslatorPaidEntitlementSubscriptionStatus;
  readonly billingState: CommentTranslatorPaidEntitlementBillingState;
  readonly currentPeriodEndIso: string | null;
};

export type CommentTranslatorPaidEntitlementRecord = CommentTranslatorVerifiedBillingEvidence & {
  readonly evidenceRecordedAtIso: string;
  readonly updatedAtIso: string;
};

export type CommentTranslatorPaidEntitlementStore = {
  readonly readByBillingUserReference: (
    billingUserReferenceId: `ctbill_${string}`
  ) => Promise<CommentTranslatorPaidEntitlementRecord | null>;
  readonly readByCustomerReference: (customerReferenceId: string) => Promise<CommentTranslatorPaidEntitlementRecord | null>;
  readonly persistVerifiedBillingEvidence: (
    evidence: CommentTranslatorVerifiedBillingEvidence
  ) => Promise<"applied" | "ignored-stale">;
};

export type CommentTranslatorPaidEntitlementStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorPaidEntitlementStoreFactoryResult =
  | {
      readonly status: "ready";
      readonly store: CommentTranslatorPaidEntitlementStore;
      readonly missingEnvReferences: readonly [];
    }
  | {
      readonly status: "unavailable";
      readonly store: null;
      readonly missingEnvReferences: readonly CommentTranslatorPaidEntitlementStoreFactoryEnvName[];
      readonly reason: "trusted-service-role-env-missing";
    };
