"use server";

import { readCommentTranslatorCreatorHistory } from "@/lib/comment-translator-creator-history";
import { createTrustedCommentTranslatorCreatorHistoryStore } from "@/lib/comment-translator-creator-history-store";
import { readCommentTranslatorBillingEntitlementSnapshot } from "@/lib/comment-translator-billing-runtime";
import { readCommentTranslatorActionCallerAuthorization } from "./action-context";

export async function getCommentTranslatorCreatorHistoryAction() {
  const callerAuthorization = await readCommentTranslatorActionCallerAuthorization();
  const billingSnapshot = await readCommentTranslatorBillingEntitlementSnapshot({
    callerAuthorization
  });
  return readCommentTranslatorCreatorHistory({
    callerAuthorization,
    creatorAccess:
      billingSnapshot.plan === "paid" && billingSnapshot.billingState === "paid-active"
        ? "paid-active"
        : "unavailable",
    historyStore: createTrustedCommentTranslatorCreatorHistoryStore()
  });
}
