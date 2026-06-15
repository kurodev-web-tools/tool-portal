import "server-only";

import {
  createCommentTranslatorSessionPlanEntitlement,
  type CommentTranslatorSessionPlan,
  type CommentTranslatorSessionPlanEntitlement,
  type CommentTranslatorSessionStopReason
} from "./comment-translator-session-runtime";
import { type CommentTranslatorBillingEntitlementSnapshot } from "./comment-translator-billing-runtime";
import {
  type CommentTranslatorDurableUsageRead,
  type CommentTranslatorDurableUsageSnapshot
} from "./comment-translator-durable-usage-counter-store";

export type CommentTranslatorPublicEntitlementBaselineResult =
  | {
      status: "ready";
      plan: CommentTranslatorSessionPlan;
      usage: CommentTranslatorDurableUsageSnapshot;
      planEntitlement: CommentTranslatorSessionPlanEntitlement;
      monthlyTranslatedCharacterLimit: number;
      monthlyTranslatedCharacterEstimate: number;
      monthlyTranslatedCharacterRemaining: number;
      entitlementSource: "free-public-beta-baseline";
      degradedFrom: "non-durable-paid-entitlement" | null;
      publicLaunchAllowed: false;
    }
  | {
      status: "fail-closed";
      stopReason: Extract<CommentTranslatorSessionStopReason, "global-budget-stop">;
      reason: Extract<CommentTranslatorDurableUsageRead, { status: "fail-closed" }>["reason"];
      authority: "durable-usage-store-unavailable";
      clientReadableDetail: "sanitized-stop-reason-only";
      publicLaunchAllowed: false;
    };

export const commentTranslatorPublicEntitlementBaselineContract = {
  implementationStage: "free-public-beta-f5-public-entitlement-baseline",
  runtime: "server-only",
  planAuthority: "server-owned-free-public-beta-baseline",
  billingReadPath: "safe-free-degradation-until-durable-paid-entitlement-c1",
  durableUsageAuthority: "durable-usage-counter-required",
  publicLaunchAllowed: false,
  freePlanLimits: {
    dailyMinutes: 30,
    sessionMinutes: 30,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyTranslatedCharacters: 20_000
  },
  safeDegradation: "paid-or-unreadable-entitlement-degrades-to-free-public-beta-baseline",
  failClosedFallback: "stop-session-when-durable-usage-store-unavailable",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "provider-error-body"
  ]
} as const;

export function resolveCommentTranslatorPublicEntitlementBaseline({
  billingSnapshot,
  durableUsageRead
}: {
  billingSnapshot: Pick<CommentTranslatorBillingEntitlementSnapshot, "plan" | "billingState" | "planEntitlement">;
  durableUsageRead: CommentTranslatorDurableUsageRead;
}): CommentTranslatorPublicEntitlementBaselineResult {
  if (durableUsageRead.status === "fail-closed") {
    return {
      status: "fail-closed",
      stopReason: "global-budget-stop",
      reason: durableUsageRead.reason,
      authority: "durable-usage-store-unavailable",
      clientReadableDetail: "sanitized-stop-reason-only",
      publicLaunchAllowed: false
    };
  }

  const planEntitlement = createCommentTranslatorSessionPlanEntitlement({ plan: "free" });
  const monthlyTranslatedCharacterLimit =
    planEntitlement.monthlyTranslatedCharacterLimit ??
    commentTranslatorPublicEntitlementBaselineContract.freePlanLimits.monthlyTranslatedCharacters;
  const monthlyTranslatedCharacterEstimate = Math.max(0, durableUsageRead.snapshot.monthlyTranslatedCharacterEstimate);
  const monthlyTranslatedCharacterRemaining = Math.max(0, monthlyTranslatedCharacterLimit - monthlyTranslatedCharacterEstimate);
  const monthlyCharacterBudgetAvailable = monthlyTranslatedCharacterEstimate < monthlyTranslatedCharacterLimit;

  return {
    status: "ready",
    plan: "free",
    usage: {
      ...durableUsageRead.snapshot,
      planEntitlement,
      aiBudgetAvailable: durableUsageRead.snapshot.aiBudgetAvailable && monthlyCharacterBudgetAvailable
    },
    planEntitlement,
    monthlyTranslatedCharacterLimit,
    monthlyTranslatedCharacterEstimate,
    monthlyTranslatedCharacterRemaining,
    entitlementSource: "free-public-beta-baseline",
    degradedFrom: billingSnapshot.plan === "paid" || billingSnapshot.billingState === "paid-active" ? "non-durable-paid-entitlement" : null,
    publicLaunchAllowed: false
  };
}
