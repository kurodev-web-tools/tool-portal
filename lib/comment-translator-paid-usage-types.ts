import type { CommentTranslatorUsageLedgerEvent } from "./comment-translator-usage-ledger-runtime";

export type CommentTranslatorPaidUsageEventReference = `ctpue_${string}`;

export type CommentTranslatorPaidUsageCounterRecord = {
  readonly billingUserReferenceId: `ctbill_${string}`;
  readonly currentPeriodEndIso: string;
  readonly resetEvidenceCreatedAtIso: string;
  readonly translatedMessageCount: number;
  readonly providerInputCharacterCount: number;
  readonly estimatedCostMicros: number;
  readonly updatedAtIso: string;
};

export type CommentTranslatorPaidUsageIncrement = {
  readonly billingUserReferenceId: `ctbill_${string}`;
  readonly expectedPeriodEndIso: string;
  readonly usageEventReferenceId: CommentTranslatorPaidUsageEventReference;
  readonly occurredAtIso: string;
  readonly translatedMessageCount: number;
  readonly providerInputCharacterCount: number;
  readonly estimatedCostMicros: number;
};

export type CommentTranslatorPaidUsageRecordResult =
  | "applied"
  | "ignored-replay"
  | "rejected-paid-inactive"
  | "rejected-stale-period"
  | "rejected-missing-counter";

export type CommentTranslatorPaidUsageCounterStore = {
  readonly readCurrentPeriod: (request: {
    readonly billingUserReferenceId: `ctbill_${string}`;
    readonly expectedPeriodEndIso: string;
  }) => Promise<CommentTranslatorPaidUsageCounterRecord | null>;
  readonly recordUsage: (request: CommentTranslatorPaidUsageIncrement) => Promise<CommentTranslatorPaidUsageRecordResult>;
};

export type CommentTranslatorPaidUsageCounterStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorPaidUsageCounterStoreFactoryResult =
  | {
      readonly status: "ready";
      readonly store: CommentTranslatorPaidUsageCounterStore;
      readonly missingEnvReferences: readonly [];
    }
  | {
      readonly status: "unavailable";
      readonly store: null;
      readonly missingEnvReferences: readonly CommentTranslatorPaidUsageCounterStoreFactoryEnvName[];
      readonly reason: "trusted-service-role-env-missing";
    };

export type CommentTranslatorPaidUsageFailClosedResult = {
  readonly status: "paid-inactive";
  readonly plan: "free";
  readonly billingState: "paid-inactive";
  readonly reason:
    | "caller-not-authorized"
    | "paid-entitlement-unavailable"
    | "paid-entitlement-inactive"
    | "paid-usage-store-unavailable"
    | "paid-usage-state-unavailable"
    | "paid-usage-period-stale";
  readonly usage: null;
};

export type CommentTranslatorPaidUsageReadResult =
  | {
      readonly status: "ready";
      readonly plan: "paid";
      readonly billingState: "paid-active";
      readonly resetAuthority: "signed-entitlement-period-boundary";
      readonly usage: {
        readonly translatedMessageCount: number;
        readonly providerInputCharacterCount: number;
        readonly estimatedCostMicros: number;
      };
    }
  | CommentTranslatorPaidUsageFailClosedResult;

export type CommentTranslatorPaidUsagePersistResult =
  | {
      readonly status: "recorded" | "ignored-replay";
      readonly plan: "paid";
      readonly billingState: "paid-active";
    }
  | CommentTranslatorPaidUsageFailClosedResult;

export type CommentTranslatorPaidUsageEvent = Extract<
  CommentTranslatorUsageLedgerEvent,
  { readonly type: "ai-usage-estimated" }
>;
