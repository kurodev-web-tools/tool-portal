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
import { type CommentTranslatorFreeBetaPreviewRateLimitSmokeOverride } from "./comment-translator-free-beta-preview-rate-limit-smoke-override";

export type CommentTranslatorPublicEntitlementBaselineResult =
  | {
      status: "ready";
      plan: CommentTranslatorSessionPlan;
      usage: CommentTranslatorDurableUsageSnapshot;
      planEntitlement: CommentTranslatorSessionPlanEntitlement;
      monthlyProviderInputCharacterLimit: number;
      monthlyProviderInputCharacterEstimate: number;
      monthlyProviderInputCharacterRemaining: number;
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
    monthlyProviderInputCharacters: 20_000
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
  durableUsageRead,
  previewRateLimitSmokeOverride
}: {
  billingSnapshot: Pick<CommentTranslatorBillingEntitlementSnapshot, "plan" | "billingState" | "planEntitlement">;
  durableUsageRead: CommentTranslatorDurableUsageRead;
  previewRateLimitSmokeOverride?: CommentTranslatorFreeBetaPreviewRateLimitSmokeOverride;
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

  const defaultPlanEntitlement = createCommentTranslatorSessionPlanEntitlement({ plan: "free" });
  const planEntitlement = {
    ...defaultPlanEntitlement,
    translatedMessagesPerMinute:
      previewRateLimitSmokeOverride?.translatedMessagesPerMinute ?? defaultPlanEntitlement.translatedMessagesPerMinute
  };
  const monthlyProviderInputCharacterLimit =
    planEntitlement.monthlyProviderInputCharacterLimit ??
    commentTranslatorPublicEntitlementBaselineContract.freePlanLimits.monthlyProviderInputCharacters;
  const monthlyProviderInputCharacterEstimate = Math.max(0, durableUsageRead.snapshot.monthlyProviderInputCharacterEstimate);
  const monthlyProviderInputCharacterRemaining = Math.max(
    0,
    monthlyProviderInputCharacterLimit - monthlyProviderInputCharacterEstimate
  );
  const monthlyCharacterBudgetAvailable = monthlyProviderInputCharacterEstimate < monthlyProviderInputCharacterLimit;

  return {
    status: "ready",
    plan: "free",
    usage: {
      ...durableUsageRead.snapshot,
      planEntitlement,
      aiBudgetAvailable: durableUsageRead.snapshot.aiBudgetAvailable && monthlyCharacterBudgetAvailable
    },
    planEntitlement,
    monthlyProviderInputCharacterLimit,
    monthlyProviderInputCharacterEstimate,
    monthlyProviderInputCharacterRemaining,
    entitlementSource: "free-public-beta-baseline",
    degradedFrom: billingSnapshot.plan === "paid" || billingSnapshot.billingState === "paid-active" ? "non-durable-paid-entitlement" : null,
    publicLaunchAllowed: false
  };
}
