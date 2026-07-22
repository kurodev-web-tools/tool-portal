import "server-only";

import type { CommentTranslatorPaidEntitlementRecord } from "./comment-translator-paid-entitlement-types";
import type {
  CommentTranslatorPaidUsageCounterRecord,
  CommentTranslatorPaidUsageCounterStore,
  CommentTranslatorPaidUsageIncrement
} from "./comment-translator-paid-usage-counter-store";

export function createInMemoryCommentTranslatorPaidUsageStoreForTests(): CommentTranslatorPaidUsageCounterStore & {
  readonly syncFromEntitlement: (entitlement: CommentTranslatorPaidEntitlementRecord) => void;
} {
  const counters = new Map<string, CommentTranslatorPaidUsageCounterRecord>();
  const usageEventReferences = new Set<string>();

  return {
    syncFromEntitlement(entitlement) {
      if (entitlement.billingState !== "paid-active" || !entitlement.currentPeriodEndIso) return;
      const existing = counters.get(entitlement.billingUserReferenceId);
      if (existing?.currentPeriodEndIso === entitlement.currentPeriodEndIso) return;
      if (existing && Date.parse(existing.currentPeriodEndIso) > Date.parse(entitlement.currentPeriodEndIso)) return;
      counters.set(entitlement.billingUserReferenceId, {
        billingUserReferenceId: entitlement.billingUserReferenceId,
        currentPeriodEndIso: entitlement.currentPeriodEndIso,
        resetEvidenceCreatedAtIso: entitlement.evidenceCreatedAtIso,
        translatedMessageCount: 0,
        providerInputCharacterCount: 0,
        estimatedCostMicros: 0,
        updatedAtIso: entitlement.evidenceRecordedAtIso
      });
    },
    async readCurrentPeriod(request) {
      const record = counters.get(request.billingUserReferenceId);
      return record?.currentPeriodEndIso === request.expectedPeriodEndIso ? record : null;
    },
    async recordUsage(request) {
      const record = counters.get(request.billingUserReferenceId);
      if (!record) return "rejected-missing-counter";
      if (record.currentPeriodEndIso !== request.expectedPeriodEndIso) return "rejected-stale-period";
      if (Date.parse(request.occurredAtIso) < Date.parse(record.resetEvidenceCreatedAtIso)) {
        return "rejected-stale-period";
      }
      if (usageEventReferences.has(request.usageEventReferenceId)) return "ignored-replay";
      usageEventReferences.add(request.usageEventReferenceId);
      counters.set(request.billingUserReferenceId, incrementRecord(record, request));
      return "applied";
    }
  };
}

function incrementRecord(
  record: CommentTranslatorPaidUsageCounterRecord,
  increment: CommentTranslatorPaidUsageIncrement
): CommentTranslatorPaidUsageCounterRecord {
  return {
    ...record,
    translatedMessageCount: record.translatedMessageCount + increment.translatedMessageCount,
    providerInputCharacterCount: record.providerInputCharacterCount + increment.providerInputCharacterCount,
    estimatedCostMicros: record.estimatedCostMicros + increment.estimatedCostMicros,
    updatedAtIso: increment.occurredAtIso
  };
}
