import "server-only";

import { createHash } from "node:crypto";
import {
  createCommentTranslatorBillingUserReference,
  isCommentTranslatorCreatorClosedBetaBillingActiveForCaller,
  type CommentTranslatorStripeEnv
} from "./comment-translator-billing-runtime";
import {
  createTrustedCommentTranslatorPaidEntitlementSupabaseStore,
  type CommentTranslatorPaidEntitlementRecord,
  type CommentTranslatorPaidEntitlementStore
} from "./comment-translator-paid-entitlement-store";
import { createTrustedCommentTranslatorPaidUsageSupabaseStore } from "./comment-translator-paid-usage-counter-store";
import type {
  CommentTranslatorPaidUsageCounterRecord,
  CommentTranslatorPaidUsageCounterStoreFactoryResult,
  CommentTranslatorPaidUsageEvent,
  CommentTranslatorPaidUsageEventReference,
  CommentTranslatorPaidUsageFailClosedResult,
  CommentTranslatorPaidUsageIncrement,
  CommentTranslatorPaidUsagePersistResult,
  CommentTranslatorPaidUsageReadResult
} from "./comment-translator-paid-usage-types";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";

export async function readCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore,
  paidUsageCounterStore,
  env = process.env,
  nowMs
}: {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly entitlementStore?: CommentTranslatorPaidEntitlementStore;
  readonly paidUsageCounterStore?: CommentTranslatorPaidUsageCounterStoreFactoryResult;
  readonly env?: CommentTranslatorStripeEnv;
  readonly nowMs: number;
}): Promise<CommentTranslatorPaidUsageReadResult> {
  const authority = await readPaidUsageAuthority({ callerAuthorization, entitlementStore, env, nowMs });
  if (authority.status === "paid-inactive") return authority;

  const storeResult = paidUsageCounterStore ?? createTrustedCommentTranslatorPaidUsageSupabaseStore();
  if (storeResult.status !== "ready") return createPaidUsageFailClosed("paid-usage-store-unavailable");

  try {
    const record = await storeResult.store.readCurrentPeriod({
      billingUserReferenceId: authority.billingUserReferenceId,
      expectedPeriodEndIso: authority.currentPeriodEndIso
    });
    if (!record || !isCompletePaidUsageRecord(record, authority.billingUserReferenceId)) {
      return createPaidUsageFailClosed("paid-usage-state-unavailable");
    }
    if (record.currentPeriodEndIso !== authority.currentPeriodEndIso) {
      return createPaidUsageFailClosed("paid-usage-period-stale");
    }
    return {
      status: "ready",
      plan: "paid",
      billingState: "paid-active",
      resetAuthority: "signed-entitlement-period-boundary",
      usage: {
        translatedMessageCount: record.translatedMessageCount,
        providerInputCharacterCount: record.providerInputCharacterCount,
        estimatedCostMicros: record.estimatedCostMicros
      }
    };
  } catch {
    return createPaidUsageFailClosed("paid-usage-state-unavailable");
  }
}

export async function recordCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore,
  paidUsageCounterStore,
  env = process.env,
  event,
  nowMs
}: {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly entitlementStore?: CommentTranslatorPaidEntitlementStore;
  readonly paidUsageCounterStore?: CommentTranslatorPaidUsageCounterStoreFactoryResult;
  readonly env?: CommentTranslatorStripeEnv;
  readonly event: CommentTranslatorPaidUsageEvent;
  readonly nowMs: number;
}): Promise<CommentTranslatorPaidUsagePersistResult> {
  const authority = await readPaidUsageAuthority({ callerAuthorization, entitlementStore, env, nowMs });
  if (authority.status === "paid-inactive") return authority;

  const storeResult = paidUsageCounterStore ?? createTrustedCommentTranslatorPaidUsageSupabaseStore();
  if (storeResult.status !== "ready") return createPaidUsageFailClosed("paid-usage-store-unavailable");
  if (
    !Number.isFinite(event.occurredAtMs) ||
    event.occurredAtMs > nowMs ||
    event.occurredAtMs >= Date.parse(authority.currentPeriodEndIso)
  ) {
    return createPaidUsageFailClosed("paid-usage-period-stale");
  }

  const increment = {
    billingUserReferenceId: authority.billingUserReferenceId,
    expectedPeriodEndIso: authority.currentPeriodEndIso,
    usageEventReferenceId: createPaidUsageEventReference({
      billingUserReferenceId: authority.billingUserReferenceId,
      event
    }),
    occurredAtIso: new Date(event.occurredAtMs).toISOString(),
    translatedMessageCount: normalizeCounterIncrement(event.translatedMessageEstimate),
    providerInputCharacterCount: normalizeCounterIncrement(event.providerInputCharacterEstimate),
    estimatedCostMicros: normalizeCounterIncrement(event.estimatedCostMicros)
  } satisfies CommentTranslatorPaidUsageIncrement;

  try {
    const result = await storeResult.store.recordUsage(increment);
    if (result === "applied" || result === "ignored-replay") {
      return {
        status: result === "applied" ? "recorded" : "ignored-replay",
        plan: "paid",
        billingState: "paid-active"
      };
    }
    return createPaidUsageFailClosed(result === "rejected-stale-period" ? "paid-usage-period-stale" : "paid-usage-state-unavailable");
  } catch {
    return createPaidUsageFailClosed("paid-usage-state-unavailable");
  }
}

async function readPaidUsageAuthority({
  callerAuthorization,
  entitlementStore,
  env,
  nowMs
}: {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly entitlementStore?: CommentTranslatorPaidEntitlementStore;
  readonly env: CommentTranslatorStripeEnv;
  readonly nowMs: number;
}): Promise<
  | {
      readonly status: "ready";
      readonly billingUserReferenceId: `ctbill_${string}`;
      readonly currentPeriodEndIso: string;
    }
  | CommentTranslatorPaidUsageFailClosedResult
> {
  if (!isCommentTranslatorCreatorClosedBetaBillingActiveForCaller({ callerAuthorization, env })) {
    return createPaidUsageFailClosed("paid-entitlement-inactive");
  }
  const billingUserReferenceId = createCommentTranslatorBillingUserReference(callerAuthorization);
  if (!billingUserReferenceId) return createPaidUsageFailClosed("caller-not-authorized");

  const resolvedEntitlementStore = entitlementStore ?? readDefaultPaidEntitlementStore();
  if (!resolvedEntitlementStore) return createPaidUsageFailClosed("paid-entitlement-unavailable");
  let record: CommentTranslatorPaidEntitlementRecord | null;
  try {
    record = await resolvedEntitlementStore.readByBillingUserReference(billingUserReferenceId);
  } catch {
    return createPaidUsageFailClosed("paid-entitlement-unavailable");
  }
  const currentPeriodEndMs = Date.parse(record?.currentPeriodEndIso ?? "");
  const evidenceCreatedAtMs = Date.parse(record?.evidenceCreatedAtIso ?? "");
  if (
    !record ||
    record.evidenceSource !== "signed-stripe-webhook" ||
    record.billingState !== "paid-active" ||
    record.subscriptionStatus !== "active" ||
    !record.customerReferenceId ||
    !record.subscriptionReferenceId ||
    !record.currentPeriodEndIso ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(currentPeriodEndMs) ||
    !Number.isFinite(evidenceCreatedAtMs) ||
    evidenceCreatedAtMs >= currentPeriodEndMs ||
    currentPeriodEndMs <= nowMs
  ) {
    return createPaidUsageFailClosed("paid-entitlement-inactive");
  }
  return {
    status: "ready",
    billingUserReferenceId,
    currentPeriodEndIso: record.currentPeriodEndIso
  };
}

function isCompletePaidUsageRecord(
  record: CommentTranslatorPaidUsageCounterRecord,
  billingUserReferenceId: `ctbill_${string}`
): boolean {
  const periodEndMs = Date.parse(record.currentPeriodEndIso);
  const resetEvidenceCreatedAtMs = Date.parse(record.resetEvidenceCreatedAtIso);
  return record.billingUserReferenceId === billingUserReferenceId &&
    Number.isFinite(periodEndMs) &&
    Number.isFinite(resetEvidenceCreatedAtMs) &&
    resetEvidenceCreatedAtMs < periodEndMs &&
    Number.isFinite(Date.parse(record.updatedAtIso)) &&
    isNonNegativeSafeInteger(record.translatedMessageCount) &&
    isNonNegativeSafeInteger(record.providerInputCharacterCount) &&
    isNonNegativeSafeInteger(record.estimatedCostMicros);
}

function isNonNegativeSafeInteger(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function createPaidUsageFailClosed(
  reason: CommentTranslatorPaidUsageFailClosedResult["reason"]
): CommentTranslatorPaidUsageFailClosedResult {
  return {
    status: "paid-inactive",
    plan: "free",
    billingState: "paid-inactive",
    reason,
    usage: null
  };
}

function createPaidUsageEventReference({
  billingUserReferenceId,
  event
}: {
  readonly billingUserReferenceId: `ctbill_${string}`;
  readonly event: CommentTranslatorPaidUsageEvent;
}): CommentTranslatorPaidUsageEventReference {
  const digest = createHash("sha256")
    .update([
      billingUserReferenceId,
      event.sessionReferenceId,
      event.occurredAtMs,
      event.translatedMessageEstimate,
      event.providerInputCharacterEstimate,
      event.estimatedCostMicros
    ].join(":"))
    .digest("hex")
    .slice(0, 24);
  return `ctpue_${digest}`;
}

function normalizeCounterIncrement(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function readDefaultPaidEntitlementStore(): CommentTranslatorPaidEntitlementStore | null {
  const result = createTrustedCommentTranslatorPaidEntitlementSupabaseStore();
  return result.status === "ready" ? result.store : null;
}
