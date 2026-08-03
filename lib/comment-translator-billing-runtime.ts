import "server-only";

import { createHash } from "node:crypto";
import {
  createCommentTranslatorSessionPlanEntitlement,
  type CommentTranslatorSessionPlan,
  type CommentTranslatorSessionPlanEntitlement
} from "./comment-translator-session-runtime";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";

export type CommentTranslatorBillingUserReference = `ctbill_${string}`;
export type CommentTranslatorBillingState = "free" | "paid-active" | "paid-inactive";
export type CommentTranslatorStripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type CommentTranslatorBillingCallerAuthorization =
  | YouTubeOAuthCredentialStatusCallerAuthorization
  | { status: "unauthenticated" };

export type CommentTranslatorStripeEnvName =
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID"
  | "NEXT_PUBLIC_SITE_URL";

export type CommentTranslatorStripeEnv = Record<string, string | undefined>;

export type CommentTranslatorBillingEntitlementSnapshot = {
  plan: CommentTranslatorSessionPlan;
  billingState: CommentTranslatorBillingState;
  freePlanAvailable: true;
  planEntitlement: CommentTranslatorSessionPlanEntitlement;
  billingUserReferenceId: CommentTranslatorBillingUserReference | null;
  stripeCustomerReferenceId: string | null;
  stripeSubscriptionReferenceId: string | null;
  paidPlan: {
    status: "available" | "inactive" | "unconfigured";
    currentPeriodEndIso: string | null;
    provider: "stripe";
  };
  tokenValue: "never-returned-by-design";
  providerTargetMetadata: "forbidden";
};

export type CommentTranslatorBillingBrowserSafeViewModel = Omit<
  CommentTranslatorBillingEntitlementSnapshot,
  "billingUserReferenceId" | "stripeCustomerReferenceId" | "stripeSubscriptionReferenceId"
> & {
  checkoutAvailable: boolean;
  portalAvailable: boolean;
  planComparison: CommentTranslatorPlanComparisonViewModel;
};

export type CommentTranslatorPlanOptionId = "free" | "pro-monthly" | "pro-yearly";

export type CommentTranslatorPlanOptionViewModel = {
  id: CommentTranslatorPlanOptionId;
  productName: "Free" | "Kuro Stream Kit Pro";
  interval: "free" | "monthly" | "yearly";
  implementationEntitlement: CommentTranslatorSessionPlan;
  displayPrice: {
    currency: "JPY";
    monthlyAmount: number;
    yearlyAmount: number | null;
  };
  entitlement: CommentTranslatorSessionPlanEntitlement;
  badge: { ja: string; en: string };
  description: { ja: string; en: string };
  cta: { ja: string; en: string };
};

export type CommentTranslatorPlanComparisonViewModel = {
  currentPlanId: CommentTranslatorPlanOptionId;
  implementationEntitlementShape: "free-or-paid-only";
  intervalPresentation: "monthly-yearly-display-only-until-stripe-readiness";
  advanceNoticeCopy: { ja: string; en: string };
  planOptions: CommentTranslatorPlanOptionViewModel[];
};

export type CommentTranslatorStripeCheckoutSessionParams = {
  mode: "subscription";
  priceReferenceId: string;
  clientReferenceId: CommentTranslatorBillingUserReference;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
};

export type CommentTranslatorStripePortalSessionParams = {
  customerReferenceId: string;
  returnUrl: string;
};

export type CommentTranslatorStripeAdapter = {
  createCheckoutSession(
    params: CommentTranslatorStripeCheckoutSessionParams
  ): Promise<{ url: string | null; observed?: CommentTranslatorStripeCheckoutSessionParams }>;
  createPortalSession(params: CommentTranslatorStripePortalSessionParams): Promise<{ url: string | null }>;
};

export type CommentTranslatorStripeWebhookEvent = {
  type: string;
  customerReferenceId: string | null;
  subscriptionReferenceId: string | null;
  status: CommentTranslatorStripeSubscriptionStatus | null;
  priceReferenceId: string | null;
  billingUserReferenceId: CommentTranslatorBillingUserReference | null;
  currentPeriodEndMs: number | null;
};

export type CommentTranslatorStripeWebhookVerifier = {
  constructEvent(payload: string, signature: string, webhookSecret: string): Promise<CommentTranslatorStripeWebhookEvent>;
};

export const commentTranslatorStripeBillingContract = {
  implementationStage: "legacy-safe-billing-view-disconnected-by-nc-b1",
  runtime: "server-only",
  freePlanAvailability: "permanent",
  stripeSurfaces: ["Checkout Sessions", "Billing Customer Portal", "signed webhook"],
  browserReadableOutput: "sanitized-billing-metadata-only",
  checkoutMode: "subscription",
  entitlementSync: "signed-webhook-to-server-owned-plan-entitlement-state",
  legacyPaidStateAuthority: "removed",
  safeDegradation: "fixed-closed-creator-commands-use-free-or-paid-inactive",
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  forbiddenReadableOutput: [
    "stripe-secret-key-value",
    "stripe-webhook-secret-value",
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata"
  ]
} as const;

export const commentTranslatorOperatorUxReadinessContract = {
  implementationStage: "pre-main-task-18-operator-ux-readiness-polish",
  runtime: "server-only",
  implementationEntitlementShape: "free-or-paid-only",
  intervalPresentation: "monthly-yearly-display-only-until-stripe-readiness",
  stripeLiveModeActions: "not-run-in-task-18",
  stripeMonthlyYearlyPriceCreation: "deferred-to-stripe-readiness-task",
  providerExecution: "not-run-in-task-18",
  providerTargetMetadata: "server-only-not-displayed",
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  planNaming: "Kuro Stream Kit Pro",
  forbiddenReadableOutput: commentTranslatorStripeBillingContract.forbiddenReadableOutput
} as const;

export function createCommentTranslatorBillingUserReference(
  callerAuthorization: CommentTranslatorBillingCallerAuthorization
): CommentTranslatorBillingUserReference | null {
  if (callerAuthorization.status !== "authorized") return null;
  const digest = createHash("sha256")
    .update(`comment-translator-billing:${callerAuthorization.ownerUserId}`)
    .digest("hex")
    .slice(0, 24);
  return `ctbill_${digest}`;
}

export function readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization
}: {
  callerAuthorization: CommentTranslatorBillingCallerAuthorization;
}): CommentTranslatorBillingEntitlementSnapshot {
  void callerAuthorization;
  return createFreeBillingSnapshot();
}

export function createCommentTranslatorBillingBrowserSafeViewModel({
  snapshot,
  env
}: {
  snapshot: CommentTranslatorBillingEntitlementSnapshot;
  env: CommentTranslatorStripeEnv;
}): CommentTranslatorBillingBrowserSafeViewModel {
  void env;
  return {
    plan: snapshot.plan,
    billingState: snapshot.billingState,
    freePlanAvailable: snapshot.freePlanAvailable,
    planEntitlement: snapshot.planEntitlement,
    paidPlan: snapshot.paidPlan,
    checkoutAvailable: false,
    portalAvailable: false,
    planComparison: createCommentTranslatorPlanComparisonViewModel({
      billingState: snapshot.billingState,
      planEntitlement: snapshot.planEntitlement
    }),
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

export function createCommentTranslatorPlanComparisonViewModel({
  billingState,
  planEntitlement
}: {
  billingState: CommentTranslatorBillingState;
  planEntitlement: CommentTranslatorSessionPlanEntitlement;
}): CommentTranslatorPlanComparisonViewModel {
  const freeEntitlement = createCommentTranslatorSessionPlanEntitlement({ plan: "free" });
  const paidEntitlement = planEntitlement.plan === "paid" ? planEntitlement : createPaidPlanEntitlement();

  return {
    currentPlanId: billingState === "paid-active" ? "pro-monthly" : "free",
    implementationEntitlementShape: commentTranslatorOperatorUxReadinessContract.implementationEntitlementShape,
    intervalPresentation: commentTranslatorOperatorUxReadinessContract.intervalPresentation,
    advanceNoticeCopy: {
      ja: "Kuro Stream Kit Pro は、まず Comment Translator の利用上限拡張から価値提供を開始します。今後、対象ツールや提供内容が追加・変更される場合があります。価格や対象内容に変更がある場合は、事前にお知らせします。",
      en: "Kuro Stream Kit Pro starts with expanded Comment Translator limits. Covered tools or plan contents may be added or changed later. Price or content changes will be announced in advance."
    },
    planOptions: [
      {
        id: "free",
        productName: "Free",
        interval: "free",
        implementationEntitlement: "free",
        displayPrice: { currency: "JPY", monthlyAmount: 0, yearlyAmount: null },
        entitlement: freeEntitlement,
        badge: { ja: "常に利用可能", en: "Always available" },
        description: { ja: "まず試せる基本枠です。", en: "The basic plan for getting started." },
        cta: { ja: "現在の Free 枠を確認", en: "Review Free limits" }
      },
      {
        id: "pro-monthly",
        productName: "Kuro Stream Kit Pro",
        interval: "monthly",
        implementationEntitlement: "paid",
        displayPrice: { currency: "JPY", monthlyAmount: 1_200, yearlyAmount: null },
        entitlement: paidEntitlement,
        badge: { ja: "月額", en: "Paid monthly" },
        description: { ja: "Comment Translator の利用上限を Free より拡張します。", en: "Expands Comment Translator limits beyond Free." },
        cta: { ja: "月額 Pro 表示", en: "Monthly Pro display" }
      },
      {
        id: "pro-yearly",
        productName: "Kuro Stream Kit Pro",
        interval: "yearly",
        implementationEntitlement: "paid",
        displayPrice: { currency: "JPY", monthlyAmount: 1_000, yearlyAmount: 12_000 },
        entitlement: paidEntitlement,
        badge: { ja: "年額がお得", en: "Best value" },
        description: { ja: "年額は月額 12 か月分より安い表示例です。", en: "The yearly display is cheaper than 12 monthly payments." },
        cta: { ja: "年額 Pro 表示", en: "Yearly Pro display" }
      }
    ]
  };
}

export async function createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization
}: {
  callerAuthorization: CommentTranslatorBillingCallerAuthorization;
  env: CommentTranslatorStripeEnv;
  stripeAdapter: Pick<CommentTranslatorStripeAdapter, "createCheckoutSession">;
  customerEmail?: string | null;
}): Promise<
  | { status: "redirect-ready"; url: string; observed?: CommentTranslatorStripeCheckoutSessionParams }
  | { status: "unavailable"; reason: "caller-not-authenticated" | "activation-closed"; missingEnvReferences: CommentTranslatorStripeEnvName[] }
> {
  if (callerAuthorization.status !== "authorized") {
    return { status: "unavailable", reason: "caller-not-authenticated", missingEnvReferences: [] };
  }
  return { status: "unavailable", reason: "activation-closed", missingEnvReferences: [] };
}

export async function createCommentTranslatorStripePortalSessionResult({
  callerAuthorization
}: {
  callerAuthorization: CommentTranslatorBillingCallerAuthorization;
  env: CommentTranslatorStripeEnv;
  stripeAdapter: Pick<CommentTranslatorStripeAdapter, "createPortalSession">;
}): Promise<
  | { status: "redirect-ready"; url: string }
  | { status: "unavailable"; reason: "caller-not-authenticated" | "activation-closed"; missingEnvReferences: CommentTranslatorStripeEnvName[] }
> {
  if (callerAuthorization.status !== "authorized") {
    return { status: "unavailable", reason: "caller-not-authenticated", missingEnvReferences: [] };
  }
  return { status: "unavailable", reason: "activation-closed", missingEnvReferences: [] };
}

export async function readCommentTranslatorStripeWebhookResult(): Promise<{
  status: "rejected";
  reason: "activation-closed";
}> {
  return { status: "rejected", reason: "activation-closed" };
}

export function createCommentTranslatorStripeAdapter(): CommentTranslatorStripeAdapter {
  return {
    async createCheckoutSession() {
      return { url: null };
    },
    async createPortalSession() {
      return { url: null };
    }
  };
}

export function createCommentTranslatorStripeWebhookVerifier(): CommentTranslatorStripeWebhookVerifier {
  return {
    async constructEvent() {
      throw new Error("fixed-closed");
    }
  };
}

export function resetInMemoryCommentTranslatorBillingEntitlementsForTests() {}

function createFreeBillingSnapshot(): CommentTranslatorBillingEntitlementSnapshot {
  return {
    plan: "free",
    billingState: "free",
    freePlanAvailable: true,
    planEntitlement: createCommentTranslatorSessionPlanEntitlement({ plan: "free" }),
    billingUserReferenceId: null,
    stripeCustomerReferenceId: null,
    stripeSubscriptionReferenceId: null,
    paidPlan: { status: "unconfigured", currentPeriodEndIso: null, provider: "stripe" },
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

function createPaidPlanEntitlement() {
  return createCommentTranslatorSessionPlanEntitlement({
    plan: "paid",
    paidEntitlement: {
      planEntitlementReferenceId: "comment-translator-paid-public-v1",
      dailyLimitMs: 7_200_000,
      sessionLimitMs: 3_600_000,
      translatedMessagesPerMinute: 90,
      activeSessionsPerUser: 1
    }
  });
}
