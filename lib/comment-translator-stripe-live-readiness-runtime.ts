import "server-only";

import {
  commentTranslatorStripeBillingContract,
  type CommentTranslatorBillingState,
  type CommentTranslatorStripeEnvName,
  type CommentTranslatorStripeSubscriptionStatus
} from "./comment-translator-billing-runtime";
import { createCommentTranslatorSessionPlanEntitlement, type CommentTranslatorSessionPlan } from "./comment-translator-session-runtime";

export type CommentTranslatorStripeLiveReadinessApprovalGate = {
  sameThreadOperatorLocalReadyPreflight: boolean;
  sanitizedOutputReview: boolean;
  explicitInThreadApproval: boolean;
};

export type CommentTranslatorStripeLiveReadinessApprovalGateReview =
  | {
      status: "approved-for-manual-operator-action";
      missingGateLabels: [];
    }
  | {
      status: "blocked-pending-approval";
      missingGateLabels: string[];
    };

export type CommentTranslatorStripeLiveReadinessChecklistItem = {
  id:
    | "product"
    | "price"
    | "checkout"
    | "portal"
    | "webhook-registration"
    | "signed-webhook-entitlement"
    | "failed-canceled-expired-state-review"
    | "rollback";
  label: string;
  status: "blocked-pending-operator-evidence" | "verified-local-contract";
  evidence: string;
  mutation: "not-run" | "not-applicable";
};

export type CommentTranslatorStripeSubscriptionLaunchReview = {
  stripeStatus: CommentTranslatorStripeSubscriptionStatus;
  entitlementPlan: CommentTranslatorSessionPlan;
  billingState: CommentTranslatorBillingState;
  sessionAccess: "paid-limits" | "safe-free-limits";
  operatorNote: string;
};

export type CommentTranslatorStripeLiveReadinessReport = {
  stage: typeof commentTranslatorStripeLiveReadinessContract.implementationStage;
  overallStatus: "blocked-pending-live-mode-approval" | "ready-for-approved-manual-operator-action";
  outputPolicy: "sanitized-metadata-only";
  liveModeActionStatus: "not-run";
  checkoutExecutionStatus: "not-run";
  portalRedirectStatus: "not-run";
  webhookRegistrationStatus: "not-run";
  billingSettingMutationStatus: "not-run";
  requiredEnvReferences: CommentTranslatorStripeEnvName[];
  approvalGate: CommentTranslatorStripeLiveReadinessApprovalGateReview;
  checklist: CommentTranslatorStripeLiveReadinessChecklistItem[];
  subscriptionStateReviews: CommentTranslatorStripeSubscriptionLaunchReview[];
  rollbackNotes: string[];
  forbiddenReadableOutput: readonly string[];
};

export const commentTranslatorStripeLiveReadinessContract = {
  implementationStage: "pre-main-task-21-stripe-live-readiness-and-billing-operations",
  runtime: "server-only",
  liveModeActions: "not-run-without-explicit-same-thread-approval",
  dashboardActions: "approval-gated-operator-local-only",
  dashboardMutation: "not-run-by-contract",
  checkoutExecution: "not-run-by-contract",
  portalRedirectExecution: "not-run-by-contract",
  webhookRegistration: "not-run-by-contract",
  billingSettingMutation: "not-run-by-contract",
  outputPolicy: "sanitized-metadata-only",
  envReferenceNamesOnly: [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID",
    "COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS",
    "NEXT_PUBLIC_SITE_URL"
  ],
  signedWebhookEntitlementEvidence: "local-deterministic-verifier-contract-only",
  failedCanceledExpiredStateReview: "safe-free-or-paid-inactive-degradation",
  rollback: "stop-new-checkout-disable-paid-entry-revert-price-or-webhook-dashboard-settings-after-approval",
  forbiddenReadableOutput: commentTranslatorStripeBillingContract.forbiddenReadableOutput
} as const;

const stripeSubscriptionStatusesForLaunchReview: CommentTranslatorStripeSubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused"
];

export function reviewCommentTranslatorStripeLiveReadinessApprovalGate(
  gate: CommentTranslatorStripeLiveReadinessApprovalGate
): CommentTranslatorStripeLiveReadinessApprovalGateReview {
  const missingGateLabels = [
    gate.sameThreadOperatorLocalReadyPreflight ? null : "same-thread/operator-local ready preflight",
    gate.sanitizedOutputReview ? null : "sanitized output review",
    gate.explicitInThreadApproval ? null : "explicit in-thread approval"
  ].filter((label): label is string => Boolean(label));

  if (missingGateLabels.length === 0) {
    return {
      status: "approved-for-manual-operator-action",
      missingGateLabels: []
    };
  }

  return {
    status: "blocked-pending-approval",
    missingGateLabels
  };
}

export function createCommentTranslatorStripeLiveReadinessReport({
  approvalGate
}: {
  approvalGate: CommentTranslatorStripeLiveReadinessApprovalGate;
}): CommentTranslatorStripeLiveReadinessReport {
  const approvalGateReview = reviewCommentTranslatorStripeLiveReadinessApprovalGate(approvalGate);

  return {
    stage: commentTranslatorStripeLiveReadinessContract.implementationStage,
    overallStatus:
      approvalGateReview.status === "approved-for-manual-operator-action"
        ? "ready-for-approved-manual-operator-action"
        : "blocked-pending-live-mode-approval",
    outputPolicy: "sanitized-metadata-only",
    liveModeActionStatus: "not-run",
    checkoutExecutionStatus: "not-run",
    portalRedirectStatus: "not-run",
    webhookRegistrationStatus: "not-run",
    billingSettingMutationStatus: "not-run",
    requiredEnvReferences: [...commentTranslatorStripeLiveReadinessContract.envReferenceNamesOnly],
    approvalGate: approvalGateReview,
    checklist: createCommentTranslatorStripeLiveReadinessChecklist(),
    subscriptionStateReviews: stripeSubscriptionStatusesForLaunchReview.map(
      reviewCommentTranslatorStripeSubscriptionStatusForLaunch
    ),
    rollbackNotes: [
      "Keep Free plan available and stop new paid Checkout entry if live Product or Price evidence is wrong.",
      "Disable or remove the live webhook endpoint registration only after preserving sanitized failure counts.",
      "Treat past_due, unpaid, canceled, incomplete, incomplete_expired, and paused as safe Free or paid-inactive session limits.",
      "Do not export or paste Stripe secret key, webhook signing secret, customer ids, subscription ids, or payment method details while rolling back."
    ],
    forbiddenReadableOutput: commentTranslatorStripeLiveReadinessContract.forbiddenReadableOutput
  };
}

export function reviewCommentTranslatorStripeSubscriptionStatusForLaunch(
  status: CommentTranslatorStripeSubscriptionStatus
): CommentTranslatorStripeSubscriptionLaunchReview {
  if (status === "active") {
    return {
      stripeStatus: status,
      entitlementPlan: "paid",
      billingState: "paid-active",
      sessionAccess: "paid-limits",
      operatorNote: "signed webhook entitlement evidence may activate paid limits"
    };
  }

  if (status === "trialing") {
    return {
      stripeStatus: status,
      entitlementPlan: "free",
      billingState: "paid-inactive",
      sessionAccess: "safe-free-limits",
      operatorNote: "trialing requires a separately reviewed server-owned policy before paid limits may activate"
    };
  }

  const freeEntitlement = createCommentTranslatorSessionPlanEntitlement({ plan: "free" });

  return {
    stripeStatus: status,
    entitlementPlan: freeEntitlement.plan,
    billingState: "paid-inactive",
    sessionAccess: "safe-free-limits",
    operatorNote: "failed, canceled, expired, incomplete, unpaid, or paused states degrade to safe Free limits"
  };
}

function createCommentTranslatorStripeLiveReadinessChecklist(): CommentTranslatorStripeLiveReadinessChecklistItem[] {
  return [
    {
      id: "product",
      label: "Stripe Product readiness",
      status: "blocked-pending-operator-evidence",
      evidence: "live Product must be checked or created in Dashboard only after explicit approval",
      mutation: "not-run"
    },
    {
      id: "price",
      label: "Stripe Price readiness",
      status: "blocked-pending-operator-evidence",
      evidence: "live monthly/yearly Price ids must remain operator-local references until approved",
      mutation: "not-run"
    },
    {
      id: "checkout",
      label: "Checkout readiness",
      status: "blocked-pending-operator-evidence",
      evidence: "Checkout execution and redirect are not run by this contract",
      mutation: "not-run"
    },
    {
      id: "portal",
      label: "Customer Portal readiness",
      status: "blocked-pending-operator-evidence",
      evidence: "Portal redirect and dashboard billing setting mutation are not run by this contract",
      mutation: "not-run"
    },
    {
      id: "webhook-registration",
      label: "Webhook registration readiness",
      status: "blocked-pending-operator-evidence",
      evidence: "live endpoint registration is approval-gated and operator-local",
      mutation: "not-run"
    },
    {
      id: "signed-webhook-entitlement",
      label: "Signed webhook entitlement evidence",
      status: "verified-local-contract",
      evidence: "Task 15 deterministic verifier applies signed subscription events without exposing secret values",
      mutation: "not-applicable"
    },
    {
      id: "failed-canceled-expired-state-review",
      label: "Failed, canceled, and expired state review",
      status: "verified-local-contract",
      evidence: "non-active subscription states degrade to Free or paid-inactive limits",
      mutation: "not-applicable"
    },
    {
      id: "rollback",
      label: "Safe rollback notes",
      status: "verified-local-contract",
      evidence: "rollback notes preserve Free access and forbid secret or private identifier output",
      mutation: "not-applicable"
    }
  ];
}
