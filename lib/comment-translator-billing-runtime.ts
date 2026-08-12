import "server-only";

import {
  createCommentTranslatorSessionPlanEntitlement,
  type CommentTranslatorSessionPlan,
  type CommentTranslatorSessionPlanEntitlement
} from "./comment-translator-session-runtime";
import { type YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import {
  assertCommentTranslatorAbuseRequestAllowed,
  createCommentTranslatorBillingRateLimitUnavailableResult,
  type CommentTranslatorAbuseRateLimitBlockedResult,
  type CommentTranslatorAbuseRateLimitStore
} from "./comment-translator-abuse-rate-limit-runtime";

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
  | {
      status: "unauthenticated";
    };

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
  paidCoreV1Availability: "unavailable-until-durable-entitlement";
  checkoutAvailable: boolean;
  portalAvailable: boolean;
  planComparison: CommentTranslatorPlanComparisonViewModel;
};

export type CommentTranslatorPlanOptionId = string;

export type CommentTranslatorPlanOptionViewModel = {
  id: CommentTranslatorPlanOptionId;
  productName: string;
  interval: "free" | "monthly" | "yearly";
  implementationEntitlement: CommentTranslatorSessionPlan;
  displayPrice: {
    currency: "USD";
    monthlyAmount: number;
    yearlyAmount: number | null;
  };
  entitlement: CommentTranslatorSessionPlanEntitlement;
  badge: {
    ja: string;
    en: string;
  };
  description: {
    ja: string;
    en: string;
  };
  cta: {
    ja: string;
    en: string;
  };
};

export type CommentTranslatorPlanComparisonViewModel = {
  currentPlanId: CommentTranslatorPlanOptionId;
  implementationEntitlementShape: "free-only-until-durable-paid-entitlement";
  intervalPresentation: "free-only-paid-unavailable-until-durable-entitlement";
  advanceNoticeCopy: {
    ja: string;
    en: string;
  };
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
  createCheckoutSession: (
    params: CommentTranslatorStripeCheckoutSessionParams
  ) => Promise<{ url: string | null; observed?: CommentTranslatorStripeCheckoutSessionParams }>;
  createPortalSession: (params: CommentTranslatorStripePortalSessionParams) => Promise<{ url: string | null }>;
};

export type CommentTranslatorStripeWebhookEvent = {
  type:
    | "checkout.session.completed"
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted"
    | "invoice.payment_failed"
    | "invoice.payment_succeeded";
  customerReferenceId: string | null;
  subscriptionReferenceId: string | null;
  status: CommentTranslatorStripeSubscriptionStatus | null;
  priceReferenceId: string | null;
  billingUserReferenceId: CommentTranslatorBillingUserReference | null;
  currentPeriodEndMs: number | null;
};

export type CommentTranslatorStripeWebhookVerifier = {
  constructEvent: (
    payload: string,
    signature: string,
    webhookSecret: string
  ) => Promise<CommentTranslatorStripeWebhookEvent>;
};

export const commentTranslatorStripeBillingContract = {
  implementationStage: "comment-translator-paid-v1-task1-free-baseline-isolation",
  runtime: "server-only",
  freePlanAvailability: "permanent",
  paidCoreV1Availability: "unavailable-until-durable-entitlement",
  memoryEntitlementStore: "removed",
  stripeSurfaces: ["Checkout Sessions", "Billing Customer Portal", "signed webhook"],
  browserReadableOutput: "sanitized-billing-metadata-only",
  checkoutMode: "disabled-until-durable-entitlement",
  entitlementSync: "free-baseline-only-until-durable-paid-entitlement",
  safeDegradation: "paid-shaped-or-unreadable-billing-degrades-to-free-baseline",
  paidPrioritization: "not-implemented",
  providerUsageCharging: "not-implemented",
  liveProviderExecution: "not-run",
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
  implementationStage: "comment-translator-paid-v1-task1-free-baseline-isolation",
  runtime: "server-only",
  implementationEntitlementShape: "free-only-until-durable-paid-entitlement",
  intervalPresentation: "free-only-paid-unavailable-until-durable-entitlement",
  stripeLiveModeActions: "not-run",
  stripeMonthlyYearlyPriceCreation: "not-run",
  providerExecution: "free-azure-only",
  providerTargetMetadata: "server-only-not-displayed",
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  planNaming: "free-only-until-durable-paid-entitlement",
  forbiddenReadableOutput: commentTranslatorStripeBillingContract.forbiddenReadableOutput
} as const;

export function createCommentTranslatorBillingUserReference(
  callerAuthorization: CommentTranslatorBillingCallerAuthorization
): CommentTranslatorBillingUserReference | null {
  void callerAuthorization;
  return null;
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
  void snapshot;
  void env;
  const freeSnapshot = createFreeBillingSnapshot();

  return {
    plan: freeSnapshot.plan,
    billingState: freeSnapshot.billingState,
    freePlanAvailable: freeSnapshot.freePlanAvailable,
    planEntitlement: freeSnapshot.planEntitlement,
    paidPlan: freeSnapshot.paidPlan,
    paidCoreV1Availability: "unavailable-until-durable-entitlement",
    checkoutAvailable: false,
    portalAvailable: false,
    planComparison: createCommentTranslatorPlanComparisonViewModel({
      billingState: freeSnapshot.billingState,
      planEntitlement: freeSnapshot.planEntitlement
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
  void billingState;
  void planEntitlement;
  const freeEntitlement = createCommentTranslatorSessionPlanEntitlement({ plan: "free" });

  return {
    currentPlanId: "free",
    implementationEntitlementShape: "free-only-until-durable-paid-entitlement",
    intervalPresentation: "free-only-paid-unavailable-until-durable-entitlement",
    advanceNoticeCopy: {
      ja: "Free は常に利用できます。Paid Core v1 は、永続的な権限情報が接続されるまで利用不可として扱います。",
      en: "Free remains available. Paid Core v1 stays unavailable until durable entitlement authority is connected."
    },
    planOptions: [
      {
        id: "free",
        productName: "Free",
        interval: "free",
        implementationEntitlement: "free",
        displayPrice: {
          currency: "USD",
          monthlyAmount: 0,
          yearlyAmount: null
        },
        entitlement: freeEntitlement,
        badge: {
          ja: "常に利用可能",
          en: "Always available"
        },
        description: {
          ja: "YouTubeコメント翻訳のFree基準枠です。",
          en: "The Free baseline for YouTube comment translation."
        },
        cta: {
          ja: "現在のFree枠を確認",
          en: "Review Free limits"
        }
      }
    ]
  };
}

export async function createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization,
  stripeAdapter,
  abuseRateLimit
}: {
  callerAuthorization: CommentTranslatorBillingCallerAuthorization;
  env: CommentTranslatorStripeEnv;
  stripeAdapter: Pick<CommentTranslatorStripeAdapter, "createCheckoutSession">;
  customerEmail?: string | null;
  abuseRateLimit?: {
    nowMs?: number;
    requestIp?: string | null;
    rateLimitStore?: CommentTranslatorAbuseRateLimitStore;
    precomputedCheck?: CommentTranslatorAbuseRateLimitBlockedResult;
    rateLimitAlreadyChecked?: boolean;
  };
}): Promise<
  | {
      status: "redirect-ready";
      url: string;
      observed?: CommentTranslatorStripeCheckoutSessionParams;
    }
  | {
      status: "unavailable";
      reason:
        | "caller-not-authenticated"
        | "missing-config"
        | "stripe-session-url-missing"
        | "rate-limit-exceeded"
        | "paid-core-v1-unavailable";
      missingEnvReferences: CommentTranslatorStripeEnvName[];
      retryAfterSeconds?: number;
    }
> {
  const abuseCheck =
    abuseRateLimit?.rateLimitAlreadyChecked
      ? null
      : (abuseRateLimit?.precomputedCheck ??
        assertCommentTranslatorAbuseRequestAllowed({
          surface: "comment-translator-billing-actions",
          action: "billing-checkout",
          callerAuthorization,
          nowMs: abuseRateLimit?.nowMs,
          requestIp: abuseRateLimit?.requestIp,
          rateLimitStore: abuseRateLimit?.rateLimitStore
        }));
  if (abuseCheck?.status === "blocked") {
    return createCommentTranslatorBillingRateLimitUnavailableResult({ check: abuseCheck });
  }

  void stripeAdapter;
  if (callerAuthorization.status !== "authorized") {
    return {
      status: "unavailable",
      reason: "caller-not-authenticated",
      missingEnvReferences: []
    };
  }

  return {
    status: "unavailable",
    reason: "paid-core-v1-unavailable",
    missingEnvReferences: []
  };
}

export async function createCommentTranslatorStripePortalSessionResult({
  callerAuthorization,
  stripeAdapter,
  abuseRateLimit
}: {
  callerAuthorization: CommentTranslatorBillingCallerAuthorization;
  env: CommentTranslatorStripeEnv;
  stripeAdapter: Pick<CommentTranslatorStripeAdapter, "createPortalSession">;
  abuseRateLimit?: {
    nowMs?: number;
    requestIp?: string | null;
    rateLimitStore?: CommentTranslatorAbuseRateLimitStore;
    precomputedCheck?: CommentTranslatorAbuseRateLimitBlockedResult;
    rateLimitAlreadyChecked?: boolean;
  };
}): Promise<
  | {
      status: "redirect-ready";
      url: string;
    }
  | {
      status: "unavailable";
      reason:
        | "caller-not-authenticated"
        | "missing-config"
        | "missing-customer"
        | "stripe-session-url-missing"
        | "rate-limit-exceeded"
        | "paid-core-v1-unavailable";
      missingEnvReferences: CommentTranslatorStripeEnvName[];
      retryAfterSeconds?: number;
    }
> {
  const abuseCheck =
    abuseRateLimit?.rateLimitAlreadyChecked
      ? null
      : (abuseRateLimit?.precomputedCheck ??
        assertCommentTranslatorAbuseRequestAllowed({
          surface: "comment-translator-billing-actions",
          action: "billing-portal",
          callerAuthorization,
          nowMs: abuseRateLimit?.nowMs,
          requestIp: abuseRateLimit?.requestIp,
          rateLimitStore: abuseRateLimit?.rateLimitStore
        }));
  if (abuseCheck?.status === "blocked") {
    return createCommentTranslatorBillingRateLimitUnavailableResult({ check: abuseCheck });
  }

  void stripeAdapter;
  if (callerAuthorization.status !== "authorized") {
    return {
      status: "unavailable",
      reason: "caller-not-authenticated",
      missingEnvReferences: []
    };
  }

  return {
    status: "unavailable",
    reason: "paid-core-v1-unavailable",
    missingEnvReferences: []
  };
}

export async function readCommentTranslatorStripeWebhookResult({
  payload,
  signature,
  env,
  verifier
}: {
  payload: string;
  signature: string | null;
  env: CommentTranslatorStripeEnv;
  verifier: CommentTranslatorStripeWebhookVerifier;
}): Promise<
  | {
      status: "applied";
      entitlement: CommentTranslatorBillingEntitlementSnapshot;
    }
  | {
      status: "ignored";
      reason: "unsupported-event" | "missing-billing-user-reference";
    }
  | {
      status: "rejected";
      reason: "missing-signature" | "missing-config" | "invalid-signature" | "paid-core-v1-unavailable";
      missingEnvReferences?: CommentTranslatorStripeEnvName[];
    }
> {
  if (!signature) {
    return {
      status: "rejected",
      reason: "missing-signature"
    };
  }

  if (!env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return {
      status: "rejected",
      reason: "missing-config",
      missingEnvReferences: ["STRIPE_WEBHOOK_SECRET"]
    };
  }

  void payload;
  void verifier;
  return {
    status: "rejected",
    reason: "paid-core-v1-unavailable"
  };
}

export function createCommentTranslatorStripeAdapter(
  env: CommentTranslatorStripeEnv = process.env
): CommentTranslatorStripeAdapter {
  void env;
  return {
    async createCheckoutSession() {
      return { url: null };
    },
    async createPortalSession() {
      return { url: null };
    }
  };
}

export function createCommentTranslatorStripeWebhookVerifier(
  env: CommentTranslatorStripeEnv = process.env
): CommentTranslatorStripeWebhookVerifier {
  void env;
  return {
    async constructEvent() {
      throw new Error("Paid Core v1 entitlement is unavailable until durable entitlement authority exists");
    }
  };
}

export function resetInMemoryCommentTranslatorBillingEntitlementsForTests() {
  return undefined;
}

function createFreeBillingSnapshot(): CommentTranslatorBillingEntitlementSnapshot {
  return {
    plan: "free",
    billingState: "free",
    freePlanAvailable: true,
    planEntitlement: createCommentTranslatorSessionPlanEntitlement({ plan: "free" }),
    billingUserReferenceId: null,
    stripeCustomerReferenceId: null,
    stripeSubscriptionReferenceId: null,
    paidPlan: {
      status: "unconfigured",
      currentPeriodEndIso: null,
      provider: "stripe"
    },
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}
