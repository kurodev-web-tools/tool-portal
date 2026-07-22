import "server-only";

import type {
  CommentTranslatorPaidEntitlementRecord,
  CommentTranslatorPaidEntitlementStore,
  CommentTranslatorVerifiedBillingEvidence
} from "./comment-translator-paid-entitlement-types";

export function createInMemoryCommentTranslatorPaidEntitlementStoreForTests(): CommentTranslatorPaidEntitlementStore {
  const records = new Map<string, CommentTranslatorPaidEntitlementRecord>();
  return {
    async readByBillingUserReference(reference) {
      return records.get(reference) ?? null;
    },
    async readByCustomerReference(reference) {
      return [...records.values()].find((record) => record.customerReferenceId === reference) ?? null;
    },
    async persistVerifiedBillingEvidence(evidence) {
      const existing = records.get(evidence.billingUserReferenceId);
      if (existing && !shouldApplyEvidence(existing, evidence)) return "ignored-stale";
      const recordedAtIso = new Date(0).toISOString();
      records.set(evidence.billingUserReferenceId, {
        ...evidence,
        evidenceRecordedAtIso: recordedAtIso,
        updatedAtIso: recordedAtIso
      });
      return "applied";
    }
  };
}

function shouldApplyEvidence(
  existing: CommentTranslatorPaidEntitlementRecord,
  incoming: CommentTranslatorVerifiedBillingEvidence
) {
  const existingCreatedAt = Date.parse(existing.evidenceCreatedAtIso);
  const incomingCreatedAt = Date.parse(incoming.evidenceCreatedAtIso);
  return incomingCreatedAt > existingCreatedAt ||
    (incomingCreatedAt === existingCreatedAt && existing.billingState === "paid-active" && incoming.billingState === "paid-inactive");
}
