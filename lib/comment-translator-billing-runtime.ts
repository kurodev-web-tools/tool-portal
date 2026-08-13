import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

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
import {
  createTrustedCommentTranslatorPaidEntitlementStore,
  type CommentTranslatorPaidDisputeState,
  type CommentTranslatorPaidCheckoutLifecycle,
  type CommentTranslatorPaidCheckoutInitialization,
  type CommentTranslatorPaidEntitlementStatus,
  type CommentTranslatorPaidEntitlementProjectionClaim,
  type CommentTranslatorPaidEntitlementStore,
  type CommentTranslatorPaidStripeBinding
} from "./comment-translator-paid-entitlement-store";
import {
  type CommentTranslatorPaidConsentStore,
  type CommentTranslatorPaidConsentDocumentType,
  createTrustedCommentTranslatorPaidConsentStore
} from "./comment-translator-paid-consent-store";
import type { CommentTranslatorPaidRegionDecision } from "./comment-translator-paid-region-gate";

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
  | "COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID"
  | "NEXT_PUBLIC_SITE_URL"
  | "COMMENT_TRANSLATOR_TERMS_VERSION"
  | "COMMENT_TRANSLATOR_PRIVACY_VERSION"
  | "COMMENT_TRANSLATOR_PAID_CONDITIONS_VERSION"
  | "COMMENT_TRANSLATOR_STRIPE_PROMOTION_CODE_ID"
  | "COMMENT_TRANSLATOR_STRIPE_COUPON_ID";

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
  customerReferenceId: string;
  productReferenceId: string;
  priceReferenceId: string;
  currency: "usd";
  recurringInterval: "month";
  clientReferenceId: CommentTranslatorBillingUserReference;
  successUrl: string;
  cancelUrl: string;
  expiresAtIso: string;
  idempotencyKey: string;
  automaticTax: true;
  billingAddressCollection: "required";
  paymentMethodTypes: readonly ["card"];
  promotionCodeReferenceId?: string | null;
  couponReferenceId?: string | null;
  customerEmail?: string | null;
};

export type CommentTranslatorStripePortalSessionParams = {
  customerReferenceId: string;
  returnUrl: string;
  flow: "payment-method-update" | "contract-management";
  subscriptionReferenceId?: string | null;
};

export type CommentTranslatorStripeCheckoutSessionResult = {
  id: string | null;
  customerId: string | null;
  url: string | null;
  expiresAtIso: string | null;
  status: "open" | "complete" | "expired" | "unknown";
};

export type CommentTranslatorStripeCheckoutSessionReadResult = CommentTranslatorStripeCheckoutSessionResult;

export type CommentTranslatorStripeAdapter = {
  createCustomer?: (params: {
    email?: string | null;
    idempotencyKey: string;
  }) => Promise<{ id: string }>;
  createCheckoutSession: (
    params: CommentTranslatorStripeCheckoutSessionParams
  ) => Promise<CommentTranslatorStripeCheckoutSessionResult & { observed?: CommentTranslatorStripeCheckoutSessionParams }>;
  retrieveCheckoutSession?: (sessionId: string) => Promise<CommentTranslatorStripeCheckoutSessionReadResult>;
  expireCheckoutSession?: (params: {
    sessionId: string;
    idempotencyKey: string;
  }) => Promise<CommentTranslatorStripeCheckoutSessionReadResult>;
  createPortalSession: (params: CommentTranslatorStripePortalSessionParams) => Promise<{ url: string | null }>;
};

export const commentTranslatorPaidCheckoutConsentFieldNames = {
  termsChecked: "paid-consent-terms",
  privacyChecked: "paid-consent-privacy",
  paidConditionsChecked: "paid-consent-paid-conditions",
  termsVersion: "paid-terms-version",
  privacyVersion: "paid-privacy-version",
  paidConditionsVersion: "paid-conditions-version"
} as const;

export type CommentTranslatorPaidCheckoutConsentInput = {
  termsChecked: boolean;
  privacyChecked: boolean;
  paidConditionsChecked: boolean;
  termsVersion: string | null;
  privacyVersion: string | null;
  paidConditionsVersion: string | null;
};

export function readCommentTranslatorPaidCheckoutConsentInput(
  formData?: FormData | null
): CommentTranslatorPaidCheckoutConsentInput {
  const readChecked = (fieldName: string) => {
    const value = formData?.get(fieldName);
    return value === "on" || value === "true" || value === "1";
  };
  const readVersion = (fieldName: string) => {
    const value = formData?.get(fieldName);
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  };

  return {
    termsChecked: readChecked(commentTranslatorPaidCheckoutConsentFieldNames.termsChecked),
    privacyChecked: readChecked(commentTranslatorPaidCheckoutConsentFieldNames.privacyChecked),
    paidConditionsChecked: readChecked(commentTranslatorPaidCheckoutConsentFieldNames.paidConditionsChecked),
    termsVersion: readVersion(commentTranslatorPaidCheckoutConsentFieldNames.termsVersion),
    privacyVersion: readVersion(commentTranslatorPaidCheckoutConsentFieldNames.privacyVersion),
    paidConditionsVersion: readVersion(commentTranslatorPaidCheckoutConsentFieldNames.paidConditionsVersion)
  };
}

export type CommentTranslatorStripeWebhookEventType =
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "invoice.payment_succeeded"
  | "charge.dispute.created"
  | "charge.dispute.closed"
  | "charge.dispute.funds_reinstated"
  | "charge.dispute.funds_withdrawn"
  | "refund.created"
  | "refund.updated"
  | "refund.failed"
  | "credit_note.created"
  | "credit_note.updated";

export type CommentTranslatorStripeWebhookEvent = {
  id: string;
  created: number;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export type CommentTranslatorStripeCheckoutSessionSnapshot = {
  id: string;
  customerId: string | null;
  subscriptionId: string | null;
  status: "complete" | "expired" | "open" | "unknown";
  expiresAtIso: string | null;
  paymentStatus: "paid" | "unpaid" | "no_payment_required" | "unknown";
};

export type CommentTranslatorStripeSubscriptionSnapshot = {
  id: string;
  customerId: string | null;
  status: CommentTranslatorStripeSubscriptionStatus;
  productId: string | null;
  priceId: string | null;
  currentPeriodStartIso: string | null;
  currentPeriodEndIso: string | null;
  cancelAtPeriodEnd: boolean;
  latestInvoiceId: string | null;
};

export type CommentTranslatorStripeInvoiceSnapshot = {
  id: string;
  customerId: string | null;
  subscriptionId: string | null;
  status: "paid" | "open" | "uncollectible" | "void" | "draft" | "unknown";
  paid: boolean;
  paymentIntentId: string | null;
  chargeId: string | null;
  productId: string | null;
  priceId: string | null;
};

export type CommentTranslatorStripeDisputeSnapshot = {
  id: string;
  status: "needs_response" | "under_review" | "won" | "lost" | "warning_closed" | "unknown";
  customerId: string | null;
  subscriptionId: string | null;
  invoiceId: string | null;
  paymentIntentId: string | null;
  chargeId: string | null;
};

export type CommentTranslatorStripePaymentAdjustmentSnapshot = {
  status: "succeeded" | "pending" | "failed" | "canceled" | "requires_action" | "issued" | "void" | "unknown";
  successful: boolean;
  fullAmount: boolean;
  targetsCurrentPeriod: boolean;
};

export type CommentTranslatorStripeCurrentObjectGraph = {
  checkoutSession?: CommentTranslatorStripeCheckoutSessionSnapshot;
  subscription?: CommentTranslatorStripeSubscriptionSnapshot;
  invoice?: CommentTranslatorStripeInvoiceSnapshot;
  dispute?: CommentTranslatorStripeDisputeSnapshot;
  paymentAdjustment?: CommentTranslatorStripePaymentAdjustmentSnapshot;
};

export type CommentTranslatorStripeCurrentObjectReader = {
  retrieveCurrentObjectState: (request: {
    eventType: CommentTranslatorStripeWebhookEventType;
    objectId: string;
  }) => Promise<CommentTranslatorStripeCurrentObjectGraph>;
};

export type CommentTranslatorStripeSubscriptionCancelAdapter = {
  cancelSubscription: (request: {
    subscriptionId: string;
  }) => Promise<CommentTranslatorStripeSubscriptionSnapshot>;
};

export type CommentTranslatorStripeWebhookVerifier = {
  constructEvent: (
    payload: string,
    signature: string,
    webhookSecret: string
  ) => Promise<CommentTranslatorStripeWebhookEvent>;
};

export const commentTranslatorStripeBillingContract = {
  implementationStage: "comment-translator-paid-v1-task4-checkout-capacity-region-consent-gate",
  runtime: "server-only",
  freePlanAvailability: "permanent",
  paidCoreV1Availability: "unavailable-until-durable-entitlement",
  memoryEntitlementStore: "removed",
  stripeSurfaces: ["Checkout Sessions", "Billing Customer Portal", "signed webhook"],
  browserReadableOutput: "sanitized-billing-metadata-only",
  checkoutMode: "server-policy-gated",
  checkoutPrerequisites: ["authenticated", "cloudflare-region-jp-or-us", "durable-consent", "atomic-capacity-hold"],
  checkoutAuthority: "customer-binding-lifecycle-hold-session-binding-then-commit-url",
  checkoutIdempotency: "ct-paid-checkout-{hold_id}",
  checkoutExpiry: "server-now-plus-31-minutes-and-stripe-value-authoritative-after-binding",
  checkoutUrlPersistence: "forbidden",
  checkoutBindingFailure: "expire-required-without-url",
  checkoutResponseLoss: "same-idempotency-key-recovery",
  capacityLimit: 20,
  paymentFailureCapacity: "hold-seven-days-and-release-after-stripe-canceled-confirmed",
  discountPolicy: "configured-only-same-price",
  signedWebhookProjection: "durable-supabase-only-with-120-second-receipt-and-projection-leases",
  receiptProjectionStaleGuard: "local-receipt-deadline-before-projection-plus-durable-projection-cas",
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
  env,
  stripeAdapter,
  customerEmail,
  abuseRateLimit,
  regionGate,
  consent = readCommentTranslatorPaidCheckoutConsentInput(),
  paidEntitlementStore,
  paidConsentStore,
  nowMs = Date.now()
}: {
  callerAuthorization: CommentTranslatorBillingCallerAuthorization;
  env: CommentTranslatorStripeEnv;
  stripeAdapter: Pick<
    CommentTranslatorStripeAdapter,
    "createCheckoutSession" | "createCustomer" | "retrieveCheckoutSession" | "expireCheckoutSession" | "createPortalSession"
  >;
  customerEmail?: string | null;
  regionGate?: CommentTranslatorPaidRegionDecision | null;
  consent?: CommentTranslatorPaidCheckoutConsentInput;
  paidEntitlementStore?: CommentTranslatorPaidEntitlementStore | null;
  paidConsentStore?: CommentTranslatorPaidConsentStore | null;
  nowMs?: number;
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
        | "region-unavailable"
        | "unsupported-region"
        | "consent-required"
        | "consent-store-unavailable"
        | "missing-config"
        | "billing-store-unavailable"
        | "capacity-full"
        | "billing-state-conflict"
        | "stripe-customer-unavailable"
        | "checkout-response-unknown"
        | "checkout-expire-required"
        | "checkout-binding-failed"
        | "existing-checkout-session"
        | "portal-payment-method-update"
        | "contract-management"
        | "processing"
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

  if (callerAuthorization.status !== "authorized") {
    return {
      status: "unavailable",
      reason: "caller-not-authenticated",
      missingEnvReferences: []
    };
  }

  if (regionGate === undefined) {
    return {
      status: "unavailable",
      reason: "paid-core-v1-unavailable",
      missingEnvReferences: []
    };
  }
  if (regionGate === null || regionGate.status !== "allowed") {
    return {
      status: "unavailable",
      reason: regionGate?.reason ?? "region-unavailable",
      missingEnvReferences: []
    };
  }

  const checkoutConfig = readCommentTranslatorPaidCheckoutConfig(env);
  if (checkoutConfig.status === "missing") {
    return {
      status: "unavailable",
      reason: "missing-config",
      missingEnvReferences: checkoutConfig.missingEnvReferences
    };
  }

  const entitlementStore = paidEntitlementStore ?? createDefaultPaidEntitlementStore(env);
  const consentStore = paidConsentStore ?? createDefaultPaidConsentStore(env);
  if (!entitlementStore) {
    return { status: "unavailable", reason: "billing-store-unavailable", missingEnvReferences: [] };
  }

  const nowIso = new Date(nowMs).toISOString();
  const ownerUserId = callerAuthorization.ownerUserId;
  let existingLifecycle: CommentTranslatorPaidCheckoutLifecycle | null;
  try {
    existingLifecycle = await entitlementStore.readCheckoutLifecycle({ ownerUserId });
  } catch {
    return { status: "unavailable", reason: "billing-store-unavailable", missingEnvReferences: [] };
  }
  const existingLifecycleNeedsCheckoutConsent =
    existingLifecycle?.lifecycleState === "checkout_hold" || existingLifecycle?.lifecycleState === "incomplete";
  if (existingLifecycle && !existingLifecycleNeedsCheckoutConsent) {
    return convergeExistingPaidBillingLifecycle({
      lifecycle: existingLifecycle,
      stripeAdapter,
      siteOrigin: checkoutConfig.siteOrigin,
      checkoutConfig: checkoutConfig.config,
      paidEntitlementStore: entitlementStore,
      ownerUserId,
      customerEmail: customerEmail ?? null,
      env,
      nowIso
    });
  }

  if (!consentStore) {
    return { status: "unavailable", reason: "consent-store-unavailable", missingEnvReferences: [] };
  }
  const consentResult = await ensureCommentTranslatorPaidCheckoutConsent({
    ownerUserId,
    consent,
    env,
    store: consentStore,
    nowIso
  });
  if (consentResult.status !== "ready") {
    return {
      status: "unavailable",
      reason: consentResult.reason,
      missingEnvReferences: consentResult.missingEnvReferences
    };
  }

  if (existingLifecycle?.lifecycleState === "checkout_hold" && existingLifecycle.checkoutSessionId === null) {
    let lockedInitialization: CommentTranslatorPaidCheckoutInitialization;
    try {
      lockedInitialization = await entitlementStore.beginCheckout({
        ownerUserId,
        stripeCustomerId: existingLifecycle.stripeCustomerId,
        nowIso
      });
    } catch {
      return { status: "unavailable", reason: "billing-state-conflict", missingEnvReferences: [] };
    }
    if (
      lockedInitialization.lifecycleId !== existingLifecycle.lifecycleId ||
      lockedInitialization.customerBindingId !== existingLifecycle.customerBindingId ||
      lockedInitialization.holdId !== existingLifecycle.holdId ||
      lockedInitialization.idempotencyKey !== existingLifecycle.idempotencyKey
    ) {
      return { status: "unavailable", reason: "billing-state-conflict", missingEnvReferences: [] };
    }
    return convergeExistingPaidBillingLifecycle({
      lifecycle: {
        ...existingLifecycle,
        checkoutExpiresAtTargetIso: lockedInitialization.checkoutExpiresAtTargetIso
      },
      stripeAdapter,
      siteOrigin: checkoutConfig.siteOrigin,
      checkoutConfig: checkoutConfig.config,
      paidEntitlementStore: entitlementStore,
      ownerUserId,
      customerEmail: customerEmail ?? null,
      env,
      nowIso
    });
  }
  if (existingLifecycle) {
    return convergeExistingPaidBillingLifecycle({
      lifecycle: existingLifecycle,
      stripeAdapter,
      siteOrigin: checkoutConfig.siteOrigin,
      checkoutConfig: checkoutConfig.config,
      paidEntitlementStore: entitlementStore,
      ownerUserId,
      customerEmail: customerEmail ?? null,
      env,
      nowIso
    });
  }

  let stripeCustomerId: string;
  try {
    const customerBinding = await entitlementStore.readCustomerBinding({ ownerUserId });
    if (customerBinding) {
      stripeCustomerId = customerBinding.stripeCustomerId;
    } else {
      if (!stripeAdapter.createCustomer) {
        return { status: "unavailable", reason: "stripe-customer-unavailable", missingEnvReferences: [] };
      }
      const customer = await stripeAdapter.createCustomer({
        email: customerEmail ?? null,
        idempotencyKey: createStripeCustomerIdempotencyKey({ ownerUserId, env })
      });
      stripeCustomerId = readRequiredStripeReference(customer.id, "Stripe Customer");
    }
  } catch {
    return { status: "unavailable", reason: "stripe-customer-unavailable", missingEnvReferences: [] };
  }

  let initialization: CommentTranslatorPaidCheckoutInitialization;
  try {
    initialization = await entitlementStore.beginCheckout({ ownerUserId, stripeCustomerId, nowIso });
  } catch (error) {
    return {
      status: "unavailable",
      reason: isPaidCapacityFullError(error) ? "capacity-full" : "billing-state-conflict",
      missingEnvReferences: []
    };
  }

  const checkoutExpiresAtTargetIso = readOptionalIso(initialization.checkoutExpiresAtTargetIso);
  if (!checkoutExpiresAtTargetIso) {
    return { status: "unavailable", reason: "checkout-response-unknown", missingEnvReferences: [] };
  }

  const checkoutParams: CommentTranslatorStripeCheckoutSessionParams = {
    mode: "subscription",
    customerReferenceId: stripeCustomerId,
    productReferenceId: checkoutConfig.config.productReferenceId,
    priceReferenceId: checkoutConfig.priceReferenceId,
    currency: "usd",
    recurringInterval: "month",
    clientReferenceId: createCommentTranslatorBillingUserReferenceFromHold(initialization.holdId, env),
    successUrl: new URL("/account/billing?billing=checkout-returned", checkoutConfig.siteOrigin).toString(),
    cancelUrl: new URL("/account/billing?billing=checkout-canceled", checkoutConfig.siteOrigin).toString(),
    expiresAtIso: checkoutExpiresAtTargetIso,
    idempotencyKey: initialization.idempotencyKey,
    automaticTax: true,
    billingAddressCollection: "required",
    paymentMethodTypes: ["card"],
    promotionCodeReferenceId: checkoutConfig.config.promotionCodeReferenceId,
    couponReferenceId: checkoutConfig.config.couponReferenceId,
    customerEmail: customerEmail ?? null
  };

  let checkoutSession: CommentTranslatorStripeCheckoutSessionResult & { observed?: CommentTranslatorStripeCheckoutSessionParams };
  try {
    checkoutSession = await stripeAdapter.createCheckoutSession(checkoutParams);
  } catch {
    try {
      checkoutSession = await stripeAdapter.createCheckoutSession(checkoutParams);
    } catch {
      return { status: "unavailable", reason: "checkout-response-unknown", missingEnvReferences: [] };
    }
  }

  const sessionId = readOptionalStripeReference(checkoutSession.id);
  const sessionCustomerId = readOptionalStripeReference(checkoutSession.customerId) ?? stripeCustomerId;
  const sessionExpiresAtIso = readOptionalIso(checkoutSession.expiresAtIso);
  if (!sessionId || !sessionExpiresAtIso) {
    return { status: "unavailable", reason: "checkout-response-unknown", missingEnvReferences: [] };
  }
  if (
    sessionCustomerId !== stripeCustomerId ||
    sessionExpiresAtIso !== checkoutExpiresAtTargetIso ||
    checkoutSession.status === "expired"
  ) {
    await expirePaidCheckoutSessionAfterDurableMark({
      store: entitlementStore,
      stripeAdapter,
      ownerUserId,
      initialization,
      stripeCheckoutSessionId: sessionId,
      stripeCustomerId,
      stripeExpiresAtIso: sessionExpiresAtIso,
      nowIso
    });
    return { status: "unavailable", reason: "checkout-expire-required", missingEnvReferences: [] };
  }

  try {
    await entitlementStore.bindCheckoutSession({
      ownerUserId,
      lifecycleId: initialization.lifecycleId,
      holdId: initialization.holdId,
      customerBindingId: initialization.customerBindingId,
      stripeCheckoutSessionId: sessionId,
      stripeCustomerId: sessionCustomerId,
      stripeExpiresAtIso: sessionExpiresAtIso,
      isRecoveryBinding: false,
      idempotencyKey: initialization.idempotencyKey,
      nowIso
    });
  } catch {
    const expireMarked = await expirePaidCheckoutSessionAfterDurableMark({
      store: entitlementStore,
      stripeAdapter,
      ownerUserId,
      initialization,
      stripeCheckoutSessionId: sessionId,
      stripeCustomerId: sessionCustomerId,
      stripeExpiresAtIso: sessionExpiresAtIso,
      nowIso
    });
    return {
      status: "unavailable",
      reason: expireMarked ? "checkout-expire-required" : "checkout-binding-failed",
      missingEnvReferences: []
    };
  }

  if (checkoutSession.status !== "open") {
    return { status: "unavailable", reason: "processing", missingEnvReferences: [] };
  }
  if (!checkoutSession.url) {
    return { status: "unavailable", reason: "stripe-session-url-missing", missingEnvReferences: [] };
  }
  const redirectCommitted = await commitPaidCheckoutRedirect({
    store: entitlementStore,
    ownerUserId,
    initialization,
    stripeCheckoutSessionId: sessionId,
    stripeCustomerId: sessionCustomerId,
    stripeExpiresAtIso: sessionExpiresAtIso,
    nowIso
  });
  if (!redirectCommitted) {
    return { status: "unavailable", reason: "checkout-expire-required", missingEnvReferences: [] };
  }
  return { status: "redirect-ready", url: checkoutSession.url, observed: checkoutSession.observed };
}

export async function createCommentTranslatorStripePortalSessionResult({
  callerAuthorization,
  env,
  stripeAdapter,
  abuseRateLimit,
  paidEntitlementStore
}: {
  callerAuthorization: CommentTranslatorBillingCallerAuthorization;
  env: CommentTranslatorStripeEnv;
  stripeAdapter: Pick<CommentTranslatorStripeAdapter, "createPortalSession">;
  paidEntitlementStore?: CommentTranslatorPaidEntitlementStore | null;
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
        | "billing-store-unavailable"
        | "portal-payment-method-update"
        | "contract-management"
        | "processing"
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

  if (callerAuthorization.status !== "authorized") {
    return {
      status: "unavailable",
      reason: "caller-not-authenticated",
      missingEnvReferences: []
    };
  }

  const siteOrigin = readSiteOrigin(env.NEXT_PUBLIC_SITE_URL);
  if (!siteOrigin) {
    return { status: "unavailable", reason: "missing-config", missingEnvReferences: ["NEXT_PUBLIC_SITE_URL"] };
  }
  const entitlementStore = paidEntitlementStore ?? createDefaultPaidEntitlementStore(env);
  if (!entitlementStore) {
    return { status: "unavailable", reason: "paid-core-v1-unavailable", missingEnvReferences: [] };
  }

  let lifecycle: CommentTranslatorPaidCheckoutLifecycle | null;
  try {
    lifecycle = await entitlementStore.readCheckoutLifecycle({ ownerUserId: callerAuthorization.ownerUserId });
  } catch {
    return { status: "unavailable", reason: "billing-store-unavailable", missingEnvReferences: [] };
  }
  if (!lifecycle || !lifecycle.stripeCustomerId) {
    return { status: "unavailable", reason: "missing-customer", missingEnvReferences: [] };
  }

  const paymentMethodOnly = lifecycle.lifecycleState === "past_due" || lifecycle.lifecycleState === "unpaid";
  const contractManagement = lifecycle.lifecycleState === "active" || lifecycle.lifecycleState === "cancel_at_period_end";
  if (!paymentMethodOnly && !contractManagement) {
    return { status: "unavailable", reason: "processing", missingEnvReferences: [] };
  }

  const portal = await stripeAdapter.createPortalSession({
    customerReferenceId: lifecycle.stripeCustomerId,
    returnUrl: new URL("/account/billing?billing=portal-returned", siteOrigin).toString(),
    flow: paymentMethodOnly ? "payment-method-update" : "contract-management",
    subscriptionReferenceId: lifecycle.subscriptionId
  });
  if (!portal.url) {
    return { status: "unavailable", reason: "stripe-session-url-missing", missingEnvReferences: [] };
  }
  return { status: "redirect-ready", url: portal.url };
}

type CommentTranslatorPaidCheckoutConfig = {
  siteOrigin: string;
  priceReferenceId: string;
  productReferenceId: string;
  termsVersion: string;
  privacyVersion: string;
  paidConditionsVersion: string;
  promotionCodeReferenceId: string | null;
  couponReferenceId: string | null;
};

function readCommentTranslatorPaidCheckoutConfig(
  env: CommentTranslatorStripeEnv
):
  | { status: "ready"; config: CommentTranslatorPaidCheckoutConfig; siteOrigin: string; priceReferenceId: string }
  | { status: "missing"; missingEnvReferences: CommentTranslatorStripeEnvName[] } {
  const required: Array<[CommentTranslatorStripeEnvName, string | undefined]> = [
    ["STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY],
    ["COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID", env.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID],
    ["COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID", env.COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID],
    ["NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL]
  ];
  const missingEnvReferences = required.filter(([, value]) => !value?.trim()).map(([name]) => name);
  const siteOrigin = readSiteOrigin(env.NEXT_PUBLIC_SITE_URL);
  if (siteOrigin === null && !missingEnvReferences.includes("NEXT_PUBLIC_SITE_URL")) {
    missingEnvReferences.push("NEXT_PUBLIC_SITE_URL");
  }
  if (missingEnvReferences.length > 0 || !siteOrigin) {
    return { status: "missing", missingEnvReferences };
  }

  const priceReferenceId = env.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID?.trim();
  const productReferenceId = env.COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID?.trim();
  if (!priceReferenceId || !productReferenceId) {
    return { status: "missing", missingEnvReferences };
  }
  return {
    status: "ready",
    siteOrigin,
    priceReferenceId,
    config: {
      siteOrigin,
      priceReferenceId,
      productReferenceId,
      termsVersion: env.COMMENT_TRANSLATOR_TERMS_VERSION?.trim() ?? "",
      privacyVersion: env.COMMENT_TRANSLATOR_PRIVACY_VERSION?.trim() ?? "",
      paidConditionsVersion: env.COMMENT_TRANSLATOR_PAID_CONDITIONS_VERSION?.trim() ?? "",
      promotionCodeReferenceId: readOptionalEnv(env.COMMENT_TRANSLATOR_STRIPE_PROMOTION_CODE_ID),
      couponReferenceId: readOptionalEnv(env.COMMENT_TRANSLATOR_STRIPE_COUPON_ID)
    }
  };
}

function readSiteOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function readOptionalEnv(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function createCommentTranslatorBillingUserReferenceFromHold(
  holdId: string,
  env: CommentTranslatorStripeEnv
): CommentTranslatorBillingUserReference {
  const secret = env.STRIPE_SECRET_KEY?.trim() ?? "comment-translator-paid-client-reference";
  const digest = createHmac("sha256", secret).update(holdId, "utf8").digest("hex").slice(0, 48);
  return `ctbill_${digest}` as CommentTranslatorBillingUserReference;
}

function createStripeCustomerIdempotencyKey({
  ownerUserId,
  env
}: {
  ownerUserId: string;
  env: CommentTranslatorStripeEnv;
}): string {
  const secret = env.STRIPE_SECRET_KEY?.trim() ?? "comment-translator-paid-customer";
  const digest = createHmac("sha256", secret).update(ownerUserId, "utf8").digest("hex").slice(0, 48);
  return `ct-paid-customer-${digest}`;
}

function readRequiredStripeReference(value: unknown, label: string): string {
  const normalized = readOptionalStripeReference(value);
  if (!normalized) throw new Error(`${label} reference is unavailable.`);
  return normalized;
}

function readOptionalStripeReference(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readOptionalIso(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function isPaidCapacityFullError(error: unknown): boolean {
  return error instanceof Error && /capacity\s+is\s+full|capacity-full|twenty-first/i.test(error.message);
}

function createDefaultPaidConsentStore(env: CommentTranslatorStripeEnv): CommentTranslatorPaidConsentStore | null {
  const result = createTrustedCommentTranslatorPaidConsentStore({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
  return result.status === "ready" ? result.store : null;
}

async function ensureCommentTranslatorPaidCheckoutConsent({
  ownerUserId,
  consent,
  env,
  store,
  nowIso
}: {
  ownerUserId: string;
  consent: CommentTranslatorPaidCheckoutConsentInput;
  env: CommentTranslatorStripeEnv;
  store: CommentTranslatorPaidConsentStore;
  nowIso: string;
}): Promise<
  | { status: "ready" }
  | { status: "unavailable"; reason: "consent-required" | "consent-store-unavailable"; missingEnvReferences: CommentTranslatorStripeEnvName[] }
> {
  const versions = {
    terms: env.COMMENT_TRANSLATOR_TERMS_VERSION?.trim() ?? "",
    privacy: env.COMMENT_TRANSLATOR_PRIVACY_VERSION?.trim() ?? "",
    paid_conditions: env.COMMENT_TRANSLATOR_PAID_CONDITIONS_VERSION?.trim() ?? ""
  } satisfies Record<CommentTranslatorPaidConsentDocumentType, string>;
  const checked = {
    terms: consent.termsChecked,
    privacy: consent.privacyChecked,
    paid_conditions: consent.paidConditionsChecked
  } satisfies Record<CommentTranslatorPaidConsentDocumentType, boolean>;
  const submittedVersions = {
    terms: consent.termsVersion,
    privacy: consent.privacyVersion,
    paid_conditions: consent.paidConditionsVersion
  } satisfies Record<CommentTranslatorPaidConsentDocumentType, string | null>;

  for (const documentType of ["terms", "privacy", "paid_conditions"] as const) {
    if (!checked[documentType] || !versions[documentType] || submittedVersions[documentType] !== versions[documentType]) {
      return { status: "unavailable", reason: "consent-required", missingEnvReferences: [] };
    }
  }

  try {
    for (const documentType of ["terms", "privacy", "paid_conditions"] as const) {
      await store.recordConsent({
        ownerUserId,
        documentType,
        documentVersion: versions[documentType],
        consentedAtIso: nowIso,
        nowIso
      });
      const durable = await store.readConsent({
        ownerUserId,
        documentType,
        documentVersion: versions[documentType]
      });
      if (!durable || durable.ownerUserId !== ownerUserId || durable.documentVersion !== versions[documentType]) {
        return { status: "unavailable", reason: "consent-required", missingEnvReferences: [] };
      }
    }
  } catch {
    return { status: "unavailable", reason: "consent-store-unavailable", missingEnvReferences: [] };
  }
  return { status: "ready" };
}

async function markPaidCheckoutExpireRequired({
  store,
  ownerUserId,
  initialization,
  stripeCheckoutSessionId,
  stripeCustomerId,
  stripeExpiresAtIso,
  nowIso
}: {
  store: CommentTranslatorPaidEntitlementStore;
  ownerUserId: string;
  initialization: CommentTranslatorPaidCheckoutInitialization;
  stripeCheckoutSessionId: string;
  stripeCustomerId: string;
  stripeExpiresAtIso: string;
  nowIso: string;
}): Promise<boolean> {
  try {
    await store.markCheckoutExpireRequired({
      ownerUserId,
      lifecycleId: initialization.lifecycleId,
      holdId: initialization.holdId,
      customerBindingId: initialization.customerBindingId,
      stripeCheckoutSessionId,
      stripeCustomerId,
      stripeExpiresAtIso,
      idempotencyKey: initialization.idempotencyKey,
      checkoutExpiresAtTargetIso: initialization.checkoutExpiresAtTargetIso,
      nowIso
    });
    return true;
  } catch {
    return false;
  }
}

async function commitPaidCheckoutRedirect({
  store,
  ownerUserId,
  initialization,
  stripeCheckoutSessionId,
  stripeCustomerId,
  stripeExpiresAtIso,
  nowIso
}: {
  store: CommentTranslatorPaidEntitlementStore;
  ownerUserId: string;
  initialization: CommentTranslatorPaidCheckoutInitialization;
  stripeCheckoutSessionId: string;
  stripeCustomerId: string;
  stripeExpiresAtIso: string;
  nowIso: string;
}): Promise<boolean> {
  try {
    return await store.commitCheckoutRedirect({
      ownerUserId,
      lifecycleId: initialization.lifecycleId,
      holdId: initialization.holdId,
      customerBindingId: initialization.customerBindingId,
      stripeCheckoutSessionId,
      stripeCustomerId,
      stripeExpiresAtIso,
      idempotencyKey: initialization.idempotencyKey,
      nowIso
    });
  } catch {
    return false;
  }
}

async function expirePaidCheckoutSessionAfterDurableMark({
  store,
  stripeAdapter,
  ownerUserId,
  initialization,
  stripeCheckoutSessionId,
  stripeCustomerId,
  stripeExpiresAtIso,
  nowIso
}: {
  store: CommentTranslatorPaidEntitlementStore;
  stripeAdapter: Pick<CommentTranslatorStripeAdapter, "expireCheckoutSession" | "retrieveCheckoutSession">;
  ownerUserId: string;
  initialization: CommentTranslatorPaidCheckoutInitialization;
  stripeCheckoutSessionId: string;
  stripeCustomerId: string;
  stripeExpiresAtIso: string;
  nowIso: string;
}): Promise<boolean> {
  const durablyMarked = await markPaidCheckoutExpireRequired({
    store,
    ownerUserId,
    initialization,
    stripeCheckoutSessionId,
    stripeCustomerId,
    stripeExpiresAtIso,
    nowIso
  });
  if (!durablyMarked || !stripeAdapter.expireCheckoutSession || !stripeAdapter.retrieveCheckoutSession) return durablyMarked;

  try {
    let confirmed = await stripeAdapter.retrieveCheckoutSession(stripeCheckoutSessionId);
    if (confirmed.id !== stripeCheckoutSessionId || confirmed.customerId !== stripeCustomerId) return true;
    if (confirmed.status !== "expired") {
      try {
        await stripeAdapter.expireCheckoutSession({
          sessionId: stripeCheckoutSessionId,
          idempotencyKey: `ct-paid-expire-${initialization.holdId}`
        });
      } catch {
        // A response loss may still mean Stripe durably expired the Session; confirm by retrieval below.
      }
      confirmed = await stripeAdapter.retrieveCheckoutSession(stripeCheckoutSessionId);
    }
    if (
      confirmed.id !== stripeCheckoutSessionId ||
      confirmed.customerId !== stripeCustomerId ||
      confirmed.status !== "expired"
    ) {
      return true;
    }
    const checkedAtMs = Date.parse(nowIso);
    const releaseAfterMs = Math.max(Date.parse(initialization.checkoutExpiresAtTargetIso), Date.parse(stripeExpiresAtIso));
    if (!Number.isFinite(checkedAtMs) || !Number.isFinite(releaseAfterMs) || checkedAtMs < releaseAfterMs) return true;
    await store.expireCheckoutHold({
      lifecycleId: initialization.lifecycleId,
      ownerUserId,
      holdId: initialization.holdId,
      stripeSessionStatus: "expired",
      stripeSessionCheckedAtIso: nowIso,
      reconcileLeaseToken: null,
      nowIso
    });
  } catch {
    // Keep expire_required and its next_reconcile_at retry boundary fail-closed.
  }
  return true;
}

async function convergeExistingPaidBillingLifecycle({
  lifecycle,
  stripeAdapter,
  siteOrigin,
  checkoutConfig,
  paidEntitlementStore,
  ownerUserId,
  customerEmail,
  env,
  nowIso
}: {
  lifecycle: CommentTranslatorPaidCheckoutLifecycle;
  stripeAdapter: Pick<
    CommentTranslatorStripeAdapter,
    "retrieveCheckoutSession" | "expireCheckoutSession" | "createCheckoutSession" | "createPortalSession"
  >;
  siteOrigin: string;
  checkoutConfig: CommentTranslatorPaidCheckoutConfig;
  paidEntitlementStore: CommentTranslatorPaidEntitlementStore;
  ownerUserId: string;
  customerEmail: string | null;
  env: CommentTranslatorStripeEnv;
  nowIso: string;
}) {
  if (
    lifecycle.lifecycleState === "expire_required" &&
    lifecycle.holdId &&
    lifecycle.idempotencyKey &&
    lifecycle.checkoutExpiresAtTargetIso &&
    lifecycle.checkoutSessionId &&
    lifecycle.stripeExpiresAtIso
  ) {
    await expirePaidCheckoutSessionAfterDurableMark({
      store: paidEntitlementStore,
      stripeAdapter,
      ownerUserId,
      initialization: {
        lifecycleId: lifecycle.lifecycleId,
        holdId: lifecycle.holdId,
        customerBindingId: lifecycle.customerBindingId,
        idempotencyKey: lifecycle.idempotencyKey,
        checkoutExpiresAtTargetIso: lifecycle.checkoutExpiresAtTargetIso
      },
      stripeCheckoutSessionId: lifecycle.checkoutSessionId,
      stripeCustomerId: lifecycle.stripeCustomerId,
      stripeExpiresAtIso: lifecycle.stripeExpiresAtIso,
      nowIso
    });
    return { status: "unavailable" as const, reason: "processing" as const, missingEnvReferences: [] };
  }
  if (lifecycle.lifecycleState === "checkout_hold" || lifecycle.lifecycleState === "incomplete") {
    if (lifecycle.checkoutSessionId && stripeAdapter.retrieveCheckoutSession) {
      try {
        const session = await stripeAdapter.retrieveCheckoutSession(lifecycle.checkoutSessionId);
        if (
          session.url &&
          session.status === "open" &&
          lifecycle.holdId &&
          lifecycle.idempotencyKey &&
          lifecycle.checkoutExpiresAtTargetIso &&
          session.id === lifecycle.checkoutSessionId &&
          session.customerId === lifecycle.stripeCustomerId &&
          session.expiresAtIso === lifecycle.stripeExpiresAtIso
        ) {
          const redirectCommitted = await commitPaidCheckoutRedirect({
            store: paidEntitlementStore,
            ownerUserId,
            initialization: {
              lifecycleId: lifecycle.lifecycleId,
              holdId: lifecycle.holdId,
              customerBindingId: lifecycle.customerBindingId,
              idempotencyKey: lifecycle.idempotencyKey,
              checkoutExpiresAtTargetIso: lifecycle.checkoutExpiresAtTargetIso
            },
            stripeCheckoutSessionId: lifecycle.checkoutSessionId,
            stripeCustomerId: lifecycle.stripeCustomerId,
            stripeExpiresAtIso: lifecycle.stripeExpiresAtIso,
            nowIso
          });
          if (redirectCommitted) return { status: "redirect-ready" as const, url: session.url };
        }
        if (
          lifecycle.holdId &&
          lifecycle.idempotencyKey &&
          lifecycle.checkoutExpiresAtTargetIso &&
          lifecycle.stripeExpiresAtIso &&
          (
            session.id !== lifecycle.checkoutSessionId ||
            session.customerId !== lifecycle.stripeCustomerId ||
            session.expiresAtIso !== lifecycle.stripeExpiresAtIso ||
            session.status === "expired"
          )
        ) {
          await expirePaidCheckoutSessionAfterDurableMark({
            store: paidEntitlementStore,
            stripeAdapter,
            ownerUserId,
            initialization: {
              lifecycleId: lifecycle.lifecycleId,
              holdId: lifecycle.holdId,
              customerBindingId: lifecycle.customerBindingId,
              idempotencyKey: lifecycle.idempotencyKey,
              checkoutExpiresAtTargetIso: lifecycle.checkoutExpiresAtTargetIso
            },
            stripeCheckoutSessionId: lifecycle.checkoutSessionId,
            stripeCustomerId: lifecycle.stripeCustomerId,
            stripeExpiresAtIso: lifecycle.stripeExpiresAtIso,
            nowIso
          });
        }
      } catch {
        // The existing Session remains the only recovery authority; do not create a new Session.
      }
      return { status: "unavailable" as const, reason: "existing-checkout-session" as const, missingEnvReferences: [] };
    }

    if (
      lifecycle.lifecycleState === "checkout_hold" &&
      lifecycle.holdId &&
      lifecycle.idempotencyKey &&
      lifecycle.checkoutExpiresAtTargetIso &&
      !lifecycle.subscriptionId
    ) {
      const initialization: CommentTranslatorPaidCheckoutInitialization = {
        lifecycleId: lifecycle.lifecycleId,
        holdId: lifecycle.holdId,
        customerBindingId: lifecycle.customerBindingId,
        idempotencyKey: lifecycle.idempotencyKey,
        checkoutExpiresAtTargetIso: lifecycle.checkoutExpiresAtTargetIso
      };
      const checkoutParams: CommentTranslatorStripeCheckoutSessionParams = {
        mode: "subscription",
        customerReferenceId: lifecycle.stripeCustomerId,
        productReferenceId: checkoutConfig.productReferenceId,
        priceReferenceId: checkoutConfig.priceReferenceId,
        currency: "usd",
        recurringInterval: "month",
        clientReferenceId: createCommentTranslatorBillingUserReferenceFromHold(lifecycle.holdId, env),
        successUrl: new URL("/account/billing?billing=checkout-returned", siteOrigin).toString(),
        cancelUrl: new URL("/account/billing?billing=checkout-canceled", siteOrigin).toString(),
        expiresAtIso: lifecycle.checkoutExpiresAtTargetIso,
        idempotencyKey: lifecycle.idempotencyKey,
        automaticTax: true,
        billingAddressCollection: "required",
        paymentMethodTypes: ["card"],
        promotionCodeReferenceId: checkoutConfig.promotionCodeReferenceId,
        couponReferenceId: checkoutConfig.couponReferenceId,
        customerEmail
      };
      let session: CommentTranslatorStripeCheckoutSessionResult & { observed?: CommentTranslatorStripeCheckoutSessionParams };
      try {
        session = await stripeAdapter.createCheckoutSession(checkoutParams);
      } catch {
        try {
          session = await stripeAdapter.createCheckoutSession(checkoutParams);
        } catch {
          return { status: "unavailable" as const, reason: "existing-checkout-session" as const, missingEnvReferences: [] };
        }
      }
      const sessionId = readOptionalStripeReference(session.id);
      const sessionCustomerId = readOptionalStripeReference(session.customerId) ?? lifecycle.stripeCustomerId;
      const sessionExpiresAtIso = readOptionalIso(session.expiresAtIso);
      if (!sessionId || !sessionExpiresAtIso) {
        return { status: "unavailable" as const, reason: "processing" as const, missingEnvReferences: [] };
      }
      if (
        sessionCustomerId !== lifecycle.stripeCustomerId ||
        sessionExpiresAtIso !== lifecycle.checkoutExpiresAtTargetIso ||
        session.status === "expired"
      ) {
        await expirePaidCheckoutSessionAfterDurableMark({
          store: paidEntitlementStore,
          stripeAdapter,
          ownerUserId,
          initialization,
          stripeCheckoutSessionId: sessionId,
          stripeCustomerId: lifecycle.stripeCustomerId,
          stripeExpiresAtIso: sessionExpiresAtIso,
          nowIso
        });
        return { status: "unavailable" as const, reason: "processing" as const, missingEnvReferences: [] };
      }
      try {
        await paidEntitlementStore.bindCheckoutSession({
          ownerUserId,
          lifecycleId: initialization.lifecycleId,
          holdId: initialization.holdId,
          customerBindingId: initialization.customerBindingId,
          stripeCheckoutSessionId: sessionId,
          stripeCustomerId: sessionCustomerId,
          stripeExpiresAtIso: sessionExpiresAtIso,
          isRecoveryBinding: true,
          idempotencyKey: initialization.idempotencyKey,
          nowIso
        });
      } catch {
        await expirePaidCheckoutSessionAfterDurableMark({
          store: paidEntitlementStore,
          stripeAdapter,
          ownerUserId,
          initialization,
          stripeCheckoutSessionId: sessionId,
          stripeCustomerId: sessionCustomerId,
          stripeExpiresAtIso: sessionExpiresAtIso,
          nowIso
        });
        return { status: "unavailable" as const, reason: "processing" as const, missingEnvReferences: [] };
      }
      if (session.status === "open" && session.url) {
        const redirectCommitted = await commitPaidCheckoutRedirect({
          store: paidEntitlementStore,
          ownerUserId,
          initialization,
          stripeCheckoutSessionId: sessionId,
          stripeCustomerId: sessionCustomerId,
          stripeExpiresAtIso: sessionExpiresAtIso,
          nowIso
        });
        if (redirectCommitted) return { status: "redirect-ready" as const, url: session.url, observed: session.observed };
      }
      return { status: "unavailable" as const, reason: "processing" as const, missingEnvReferences: [] };
    }
    return { status: "unavailable" as const, reason: "processing" as const, missingEnvReferences: [] };
  }
  if (lifecycle.lifecycleState === "past_due" || lifecycle.lifecycleState === "unpaid") {
    if (lifecycle.stripeCustomerId && stripeAdapter.createPortalSession) {
      const portal = await stripeAdapter.createPortalSession({
        customerReferenceId: lifecycle.stripeCustomerId,
        returnUrl: new URL("/account/billing?billing=portal-returned", siteOrigin).toString(),
        flow: "payment-method-update",
        subscriptionReferenceId: lifecycle.subscriptionId
      });
      if (portal.url) return { status: "redirect-ready" as const, url: portal.url };
    }
    return { status: "unavailable" as const, reason: "portal-payment-method-update" as const, missingEnvReferences: [] };
  }
  if (lifecycle.lifecycleState === "active" || lifecycle.lifecycleState === "cancel_at_period_end") {
    return { status: "unavailable" as const, reason: "contract-management" as const, missingEnvReferences: [] };
  }
  return { status: "unavailable" as const, reason: "processing" as const, missingEnvReferences: [] };
}

export type CommentTranslatorStripeWebhookProjectionResult =
  | {
      status: "complete";
      eventId: string;
      receiptStatus: "complete";
      projection: "applied" | "ignored";
    }
  | {
      status: "rejected";
      eventId?: string;
      receiptStatus: "rejected";
      reason:
        | "missing-signature"
        | "missing-config"
        | "invalid-signature"
        | "unknown-event-type"
        | "event-identity-conflict"
        | "binding-conflict";
      missingEnvReferences?: CommentTranslatorStripeEnvName[];
    }
  | {
      status: "retryable";
      eventId?: string;
      receiptStatus: "retryable";
      reason:
        | "active-processing"
        | "object-retrieval-failed"
        | "database-transaction-failed"
        | "lease-conflict"
        | "binding-not-ready"
        | "missing-config";
    };

export const commentTranslatorPaidWebhookReceiptLeaseMs = 120_000;

export async function readCommentTranslatorStripeWebhookResult({
  payload,
  signature,
  env,
  verifier,
  store,
  currentObjectReader,
  subscriptionCancelAdapter,
  projectionEnabled = false,
  nowIso = new Date().toISOString(),
  clock = () => Date.now()
}: {
  payload: string;
  signature: string | null;
  env: CommentTranslatorStripeEnv;
  verifier: CommentTranslatorStripeWebhookVerifier;
  store?: CommentTranslatorPaidEntitlementStore;
  currentObjectReader?: CommentTranslatorStripeCurrentObjectReader;
  subscriptionCancelAdapter?: CommentTranslatorStripeSubscriptionCancelAdapter;
  projectionEnabled?: boolean;
  nowIso?: string;
  clock?: () => number;
}): Promise<CommentTranslatorStripeWebhookProjectionResult | { status: "rejected"; reason: "paid-core-v1-unavailable" }> {
  if (!projectionEnabled) {
    if (!signature) return { status: "rejected", receiptStatus: "rejected", reason: "missing-signature" };
    if (!env.STRIPE_WEBHOOK_SECRET?.trim()) {
      return {
        status: "rejected",
        receiptStatus: "rejected",
        reason: "missing-config"
      };
    }
    return { status: "rejected", reason: "paid-core-v1-unavailable" };
  }

  if (!signature) return { status: "rejected", receiptStatus: "rejected", reason: "missing-signature" };
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return {
      status: "rejected",
      receiptStatus: "rejected",
      reason: "missing-config",
      missingEnvReferences: ["STRIPE_WEBHOOK_SECRET"]
    };
  }

  let event: CommentTranslatorStripeWebhookEvent;
  try {
    event = await verifier.constructEvent(payload, signature, webhookSecret);
  } catch {
    return { status: "rejected", receiptStatus: "rejected", reason: "invalid-signature" };
  }

  const normalized = normalizeStripeWebhookEvent(event);
  if (normalized.status === "unidentifiable") {
    return { status: "rejected", receiptStatus: "rejected", reason: "event-identity-conflict" };
  }

  const eventId = normalized.eventId;
  const eventType = normalized.eventType;
  const objectType = normalized.objectType;
  const eventCreatedAtIso = new Date(normalized.created * 1000).toISOString();
  const resolvedStore = store ?? createDefaultPaidEntitlementStore(env);
  if (!resolvedStore) {
    return { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }
  const receiptLeaseDeadlineMs = clock() + commentTranslatorPaidWebhookReceiptLeaseMs;
  const receiptLeaseIsActive = () => clock() < receiptLeaseDeadlineMs;

  let claim;
  try {
    claim = await resolvedStore.claimStripeEvent({
      eventId,
      eventType,
      stripeEventCreatedAtIso: eventCreatedAtIso,
      objectType,
      nowIso
    });
  } catch {
    return { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }

  if (claim.claimStatus === "complete") {
    return { status: "complete", eventId, receiptStatus: "complete", projection: "applied" };
  }
  if (claim.claimStatus === "rejected") {
    return { status: "rejected", eventId, receiptStatus: "rejected", reason: "event-identity-conflict" };
  }
  if (!claim.leaseToken) {
    return { status: "retryable", eventId, receiptStatus: "retryable", reason: "active-processing" };
  }

  const finalize = async (
    status: "retryable" | "complete" | "rejected",
    errorClass?: string
  ): Promise<boolean> => {
    try {
      return await resolvedStore.finalizeStripeEvent({
        eventId,
        leaseToken: claim.leaseToken as string,
        status,
        errorClass,
        nowIso
      });
    } catch {
      return false;
    }
  };

  if (normalized.status === "claimable-invalid") {
    const finalized = await finalize("rejected", "event-identity-conflict");
    return finalized
      ? { status: "rejected", eventId, receiptStatus: "rejected", reason: "event-identity-conflict" }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }

  if (!isSupportedStripeWebhookEventType(eventType)) {
    const finalized = await finalize("rejected", "unknown-event-type");
    return finalized
      ? { status: "rejected", eventId, receiptStatus: "rejected", reason: "unknown-event-type" }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }

  if (!isExpectedStripeObjectType(eventType, objectType)) {
    const finalized = await finalize("rejected", "event-identity-conflict");
    return finalized
      ? { status: "rejected", eventId, receiptStatus: "rejected", reason: "event-identity-conflict" }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }

  const rawObject = normalized.event.data.object;
  const currentReader = currentObjectReader ?? createCommentTranslatorStripeCurrentObjectReader(env);
  let bindingResolution: Awaited<ReturnType<typeof resolveStripeBindingForEvent>>;
  try {
    bindingResolution = await resolveStripeBindingForEvent(resolvedStore, eventType, rawObject);
  } catch {
    const finalized = await finalize("retryable", "database-transaction-failed");
    return finalized
      ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }
  if (bindingResolution.status === "conflict") {
    const finalized = await finalize("rejected", "binding-conflict");
    return finalized
      ? { status: "rejected", eventId, receiptStatus: "rejected", reason: "binding-conflict" }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }
  if (
    bindingResolution.status === "missing" &&
    (eventType.startsWith("charge.dispute.") ||
      eventType.startsWith("refund.") ||
      eventType.startsWith("credit_note."))
  ) {
    let targetGraph: CommentTranslatorStripeCurrentObjectGraph;
    try {
      targetGraph = await currentReader.retrieveCurrentObjectState({ eventType, objectId: normalized.objectId });
    } catch {
      const finalized = await finalize("retryable", "object-retrieval-failed");
      return finalized
        ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "object-retrieval-failed" }
        : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
    }
    if (!receiptLeaseIsActive()) {
      const finalized = await finalize("retryable", "lease-conflict");
      return finalized
        ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "lease-conflict" }
        : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
    }
    try {
      bindingResolution = await resolveStripeBindingForGraph(resolvedStore, targetGraph);
    } catch {
      const finalized = await finalize("retryable", "database-transaction-failed");
      return finalized
        ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" }
        : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
    }
    if (bindingResolution.status === "conflict") {
      const finalized = await finalize("rejected", "binding-conflict");
      return finalized
        ? { status: "rejected", eventId, receiptStatus: "rejected", reason: "binding-conflict" }
        : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
    }
    if (bindingResolution.status === "missing") {
      const finalized = await finalize("retryable", "object-retrieval-failed");
      return finalized
        ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "binding-not-ready" }
        : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
    }
  }
  if (bindingResolution.status === "missing") {
    const finalized = await finalize("retryable", "object-retrieval-failed");
    return finalized
      ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "binding-not-ready" }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }

  if (!receiptLeaseIsActive()) {
    const finalized = await finalize("retryable", "lease-conflict");
    return finalized
      ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "lease-conflict" }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }

  let projectionLease: CommentTranslatorPaidEntitlementProjectionClaim | null = null;
  if (eventType !== "checkout.session.expired") {
    try {
      projectionLease = await resolvedStore.claimEntitlementProjection({
        ownerUserId: bindingResolution.binding.ownerUserId,
        lifecycleId: bindingResolution.binding.lifecycleId,
        nowIso
      });
    } catch {
      const finalized = await finalize("retryable", "database-transaction-failed");
      return finalized
        ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" }
        : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
    }
    if (!projectionLease) {
      const finalized = await finalize("retryable", "lease-conflict");
      return finalized
        ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "lease-conflict" }
        : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
    }
  }

  let graph: CommentTranslatorStripeCurrentObjectGraph;
  try {
    graph = await currentReader.retrieveCurrentObjectState({ eventType, objectId: normalized.objectId });
  } catch {
    const finalized = await finalize("retryable", "object-retrieval-failed");
    return finalized
      ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "object-retrieval-failed" }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }
  if (!receiptLeaseIsActive()) {
    const finalized = await finalize("retryable", "lease-conflict");
    return finalized
      ? { status: "retryable", eventId, receiptStatus: "retryable", reason: "lease-conflict" }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }

  const projection = await projectCurrentStripeGraph({
    eventType,
    graph,
    binding: bindingResolution.binding,
    store: resolvedStore,
    env,
    nowIso,
    eventCreatedAtIso,
    projectionLease,
    subscriptionCancelAdapter: subscriptionCancelAdapter ?? createCommentTranslatorStripeSubscriptionCancelAdapter(env),
    receiptLeaseIsActive
  });
  if (projection.status === "rejected") {
    const finalized = await finalize("rejected", projection.errorClass);
    return finalized
      ? { status: "rejected", eventId, receiptStatus: "rejected", reason: projection.reason }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }
  if (projection.status === "retryable") {
    const finalized = await finalize("retryable", projection.errorClass);
    return finalized
      ? { status: "retryable", eventId, receiptStatus: "retryable", reason: projection.reason }
      : { status: "retryable", eventId, receiptStatus: "retryable", reason: "database-transaction-failed" };
  }

  const finalized = await finalize("complete");
  if (!finalized) return { status: "retryable", eventId, receiptStatus: "retryable", reason: "lease-conflict" };
  return { status: "complete", eventId, receiptStatus: "complete", projection: projection.projection };
}

export function getCommentTranslatorStripeWebhookHttpStatus(
  result: CommentTranslatorStripeWebhookProjectionResult | { status: "rejected"; reason: "paid-core-v1-unavailable" }
): number {
  if (result.status === "complete") return 200;
  if (result.status === "rejected") {
    return "eventId" in result && typeof result.eventId === "string" && result.eventId.trim().length > 0 ? 200 : 400;
  }
  return 503;
}

type NormalizedStripeWebhookEvent =
  | {
      status: "valid";
      event: CommentTranslatorStripeWebhookEvent;
      eventId: string;
      eventType: string;
      created: number;
      objectType: string;
      objectId: string;
    }
  | {
      status: "claimable-invalid";
      eventId: string;
      eventType: string;
      created: number;
      objectType: string;
    }
  | { status: "unidentifiable" };

function normalizeStripeWebhookEvent(event: CommentTranslatorStripeWebhookEvent): NormalizedStripeWebhookEvent {
  if (!event || typeof event !== "object") return { status: "unidentifiable" };
  if (typeof event.id !== "string" || event.id.trim().length === 0) return { status: "unidentifiable" };
  if (typeof event.type !== "string" || event.type.trim().length === 0) return { status: "unidentifiable" };
  if (!Number.isSafeInteger(event.created) || event.created <= 0) return { status: "unidentifiable" };
  const eventId = event.id.trim();
  const eventType = event.type.trim();
  const created = event.created;
  if (!event.data || typeof event.data !== "object" || !event.data.object || typeof event.data.object !== "object") {
    return { status: "claimable-invalid", eventId, eventType, created, objectType: "unknown" };
  }
  const objectType = readObjectType(event.data.object);
  const objectId = readObjectId(event.data.object);
  if (!objectId) return { status: "claimable-invalid", eventId, eventType, created, objectType };
  return { status: "valid", event, eventId, eventType, created, objectType, objectId };
}

function readObjectId(object: Record<string, unknown>): string | null {
  const id = object.id;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
}

function readObjectType(object: Record<string, unknown>): string {
  const objectType = object.object;
  return typeof objectType === "string" && objectType.trim().length > 0 ? objectType.trim() : "unknown";
}

function isSupportedStripeWebhookEventType(value: string): value is CommentTranslatorStripeWebhookEventType {
  return [
    "checkout.session.completed",
    "checkout.session.expired",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.payment_succeeded",
    "charge.dispute.created",
    "charge.dispute.closed",
    "charge.dispute.funds_reinstated",
    "charge.dispute.funds_withdrawn",
    "refund.created",
    "refund.updated",
    "refund.failed",
    "credit_note.created",
    "credit_note.updated"
  ].includes(value);
}

function isExpectedStripeObjectType(eventType: CommentTranslatorStripeWebhookEventType, objectType: string): boolean {
  if (eventType.startsWith("checkout.")) return objectType === "checkout.session";
  if (eventType.startsWith("customer.subscription.")) return objectType === "subscription";
  if (eventType.startsWith("invoice.")) return objectType === "invoice";
  if (eventType.startsWith("charge.dispute.")) return objectType === "dispute";
  if (eventType.startsWith("refund.")) return objectType === "refund";
  return objectType === "credit_note";
}

function createDefaultPaidEntitlementStore(env: CommentTranslatorStripeEnv): CommentTranslatorPaidEntitlementStore | null {
  const result = createTrustedCommentTranslatorPaidEntitlementStore({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
  return result.status === "ready" ? result.store : null;
}

async function resolveStripeBindingForEvent(
  store: CommentTranslatorPaidEntitlementStore,
  eventType: CommentTranslatorStripeWebhookEventType,
  object: Record<string, unknown>
) {
  const customerId = readStripeReference(object.customer);
  const subscriptionId = eventType.startsWith("customer.subscription.")
    ? readObjectId(object)
    : eventType.startsWith("invoice.")
      ? readInvoiceSubscriptionReference(object)
      : readStripeReference(object.subscription);
  const checkoutSessionId = eventType.startsWith("checkout.") ? readObjectId(object) : null;
  return store.resolveStripeBinding({
    stripeCustomerId: customerId,
    stripeCheckoutSessionId: checkoutSessionId,
    stripeSubscriptionId: subscriptionId
  });
}

async function resolveStripeBindingForGraph(
  store: CommentTranslatorPaidEntitlementStore,
  graph: CommentTranslatorStripeCurrentObjectGraph
) {
  const customerIds = new Set(
    [graph.subscription?.customerId, graph.invoice?.customerId, graph.dispute?.customerId].filter(
      (value): value is string => Boolean(value)
    )
  );
  const subscriptionIds = new Set(
    [graph.subscription?.id, graph.invoice?.subscriptionId, graph.dispute?.subscriptionId].filter(
      (value): value is string => Boolean(value)
    )
  );
  if (customerIds.size > 1 || subscriptionIds.size > 1) return { status: "conflict" as const };
  return store.resolveStripeBinding({
    stripeCustomerId: customerIds.values().next().value ?? null,
    stripeSubscriptionId: subscriptionIds.values().next().value ?? null
  });
}

function readStripeReference(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const id = (value as Record<string, unknown>).id;
    return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
  }
  return null;
}

type ProjectCurrentStripeGraphResult =
  | { status: "complete"; projection: "applied" | "ignored" }
  | {
      status: "retryable";
      reason: "object-retrieval-failed" | "database-transaction-failed" | "lease-conflict" | "binding-not-ready" | "missing-config";
      errorClass: "object-retrieval-failed" | "database-transaction-failed" | "lease-conflict";
    }
  | {
      status: "rejected";
      reason: "binding-conflict" | "unknown-event-type";
      errorClass: "binding-conflict" | "unknown-event-type";
    };

async function projectCurrentStripeGraph({
  eventType,
  graph,
  binding,
  store,
  env,
  nowIso,
  eventCreatedAtIso,
  projectionLease,
  subscriptionCancelAdapter,
  receiptLeaseIsActive
}: {
  eventType: CommentTranslatorStripeWebhookEventType;
  graph: CommentTranslatorStripeCurrentObjectGraph;
  binding: CommentTranslatorPaidStripeBinding;
  store: CommentTranslatorPaidEntitlementStore;
  env: CommentTranslatorStripeEnv;
  nowIso: string;
  eventCreatedAtIso: string;
  projectionLease: CommentTranslatorPaidEntitlementProjectionClaim | null;
  subscriptionCancelAdapter: CommentTranslatorStripeSubscriptionCancelAdapter;
  receiptLeaseIsActive: () => boolean;
}): Promise<ProjectCurrentStripeGraphResult> {
  if (eventType === "checkout.session.expired") {
    const session = graph.checkoutSession;
    if (
      !session ||
      session.status !== "expired" ||
      !binding.holdId ||
      !binding.stripeCheckoutSessionId ||
      session.id !== binding.stripeCheckoutSessionId ||
      !session.customerId ||
      session.customerId !== binding.stripeCustomerId
    ) {
      return { status: "retryable", reason: "binding-not-ready", errorClass: "object-retrieval-failed" };
    }
    if (
      session.subscriptionId ||
      graph.subscription ||
      binding.stripeSubscriptionId ||
      binding.subscriptionBindingId
    ) {
      return { status: "complete", projection: "ignored" };
    }
    let existingEntitlement;
    try {
      existingEntitlement = await store.readEntitlement({
        ownerUserId: binding.ownerUserId,
        lifecycleId: binding.lifecycleId
      });
    } catch {
      return { status: "retryable", reason: "database-transaction-failed", errorClass: "database-transaction-failed" };
    }
    if (existingEntitlement && existingEntitlement.status !== "incomplete_expired") {
      return { status: "complete", projection: "ignored" };
    }
    if (!receiptLeaseIsActive()) {
      return { status: "retryable", reason: "lease-conflict", errorClass: "lease-conflict" };
    }
    try {
      if (!receiptLeaseIsActive()) {
        return { status: "retryable", reason: "lease-conflict", errorClass: "lease-conflict" };
      }
      await store.expireCheckoutHold({
        lifecycleId: binding.lifecycleId,
        ownerUserId: binding.ownerUserId,
        holdId: binding.holdId,
        stripeSessionStatus: "expired",
        stripeSessionCheckedAtIso: nowIso,
        reconcileLeaseToken: null,
        nowIso
      });
      return { status: "complete", projection: "applied" };
    } catch {
      return { status: "retryable", reason: "database-transaction-failed", errorClass: "database-transaction-failed" };
    }
  }

  if (eventType === "checkout.session.completed") {
    const session = graph.checkoutSession;
    const invoice = graph.invoice;
    const expiresAtMs = session?.expiresAtIso ? Date.parse(session.expiresAtIso) : Number.NaN;
    if (
      !session ||
      !session.id ||
      session.status !== "complete" ||
      !session.expiresAtIso ||
      !Number.isFinite(expiresAtMs) ||
      new Date(eventCreatedAtIso).getTime() > expiresAtMs ||
      (session.paymentStatus !== "paid" && session.paymentStatus !== "no_payment_required") ||
      !invoice ||
      !invoice.id ||
      invoice.status !== "paid" ||
      !invoice.paid ||
      !session.customerId ||
      !session.subscriptionId ||
      !graph.subscription?.id ||
      !invoice.customerId ||
      !invoice.subscriptionId
    ) {
      return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
    }
    if (
      !binding.stripeCheckoutSessionId ||
      session.id !== binding.stripeCheckoutSessionId ||
      session.customerId !== binding.stripeCustomerId ||
      session.subscriptionId !== graph.subscription.id ||
      (binding.stripeSubscriptionId !== null && session.subscriptionId !== binding.stripeSubscriptionId) ||
      invoice.customerId !== binding.stripeCustomerId ||
      invoice.customerId !== session.customerId ||
      invoice.subscriptionId !== session.subscriptionId
    ) {
      return { status: "rejected", reason: "binding-conflict", errorClass: "binding-conflict" };
    }
  }
  if (
    (eventType.startsWith("checkout.") || eventType.startsWith("customer.subscription.")) && !graph.invoice
  ) {
    return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
  }
  if (eventType.startsWith("invoice.") && !graph.invoice) {
    return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
  }
  if (
    (eventType.startsWith("refund.") || eventType.startsWith("credit_note.")) &&
    (!graph.invoice || !graph.paymentAdjustment)
  ) {
    return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
  }
  if (eventType.startsWith("charge.dispute.") && (!graph.dispute || !graph.invoice)) {
    return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
  }

  const subscription = graph.subscription;
  if (!subscription || !subscription.id || !subscription.currentPeriodStartIso || !subscription.currentPeriodEndIso) {
    return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
  }
  if (!subscription.customerId) {
    return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
  }
  if (subscription.customerId !== binding.stripeCustomerId) {
    return { status: "rejected", reason: "binding-conflict", errorClass: "binding-conflict" };
  }
  if (binding.stripeSubscriptionId && subscription.id !== binding.stripeSubscriptionId) {
    return { status: "rejected", reason: "binding-conflict", errorClass: "binding-conflict" };
  }
  if (graph.invoice) {
    if (!graph.invoice.id || !graph.invoice.customerId || !graph.invoice.subscriptionId) {
      return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
    }
    if (
      graph.invoice.customerId !== binding.stripeCustomerId ||
      graph.invoice.subscriptionId !== subscription.id ||
      (binding.stripeSubscriptionId !== null && graph.invoice.subscriptionId !== binding.stripeSubscriptionId)
    ) {
      return { status: "rejected", reason: "binding-conflict", errorClass: "binding-conflict" };
    }
  }
  if (
    eventType.startsWith("customer.subscription.") &&
    eventType !== "customer.subscription.deleted" &&
    (graph.invoice.status !== "paid" || !graph.invoice.paid)
  ) {
    return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
  }

  const priceId = subscription.priceId ?? graph.invoice?.priceId ?? null;
  const productId = subscription.productId ?? graph.invoice?.productId ?? null;
  const configuredPriceId = env.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID?.trim();
  const configuredProductId = env.COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID?.trim();
  if (!configuredPriceId) {
    return { status: "retryable", reason: "missing-config", errorClass: "object-retrieval-failed" };
  }
  if (!priceId || !productId || configuredPriceId !== priceId || (configuredProductId && configuredProductId !== productId)) {
    return { status: "rejected", reason: "binding-conflict", errorClass: "binding-conflict" };
  }
  if (binding.priceId && binding.priceId !== priceId) {
    return { status: "rejected", reason: "binding-conflict", errorClass: "binding-conflict" };
  }
  if (binding.productId && binding.productId !== productId) {
    return { status: "rejected", reason: "binding-conflict", errorClass: "binding-conflict" };
  }

  const adjustment = graph.paymentAdjustment;
  const requiresTerminalCancellation =
    (eventType.startsWith("charge.dispute.") &&
      (eventType === "charge.dispute.funds_withdrawn" || graph.dispute?.status === "lost")) ||
    ((eventType.startsWith("refund.") || eventType.startsWith("credit_note.")) &&
      adjustment?.successful === true &&
      adjustment.fullAmount &&
      adjustment.targetsCurrentPeriod);
  if (
    (eventType.startsWith("refund.") || eventType.startsWith("credit_note.")) &&
    !requiresTerminalCancellation
  ) {
    return { status: "complete", projection: "ignored" };
  }

  let existingEntitlement;
  try {
    existingEntitlement = await store.readEntitlement({
      ownerUserId: binding.ownerUserId,
      lifecycleId: binding.lifecycleId
    });
  } catch {
    return { status: "retryable", reason: "database-transaction-failed", errorClass: "database-transaction-failed" };
  }
  let currentSubscription = subscription;
  if (eventType.startsWith("charge.dispute.") && graph.dispute?.status === "won") {
    return { status: "complete", projection: "ignored" };
  }
  if (
    eventType.startsWith("charge.dispute.") &&
    !requiresTerminalCancellation &&
    currentSubscription.status !== "canceled" &&
    shouldPreserveExistingPaidStop(existingEntitlement)
  ) {
    return { status: "complete", projection: "ignored" };
  }
  if (
    !eventType.startsWith("charge.dispute.") &&
    !eventType.startsWith("refund.") &&
    !eventType.startsWith("credit_note.") &&
    currentSubscription.status !== "canceled" &&
    shouldPreserveExistingPaidStop(existingEntitlement)
  ) {
    return { status: "complete", projection: "ignored" };
  }

  if (!projectionLease || !receiptLeaseIsActive()) {
    return { status: "retryable", reason: "lease-conflict", errorClass: "lease-conflict" };
  }

  let subscriptionBindingId = binding.subscriptionBindingId;
  const writeState = async (
    state: NonNullable<ReturnType<typeof resolveProjectionState>>,
    targetSubscription: CommentTranslatorStripeSubscriptionSnapshot,
    targetProjectionLease: CommentTranslatorPaidEntitlementProjectionClaim
  ) => {
    if (!receiptLeaseIsActive()) throw new Error("receipt-lease-conflict");
    const common = {
      lifecycleId: binding.lifecycleId,
      ownerUserId: binding.ownerUserId,
      customerBindingId: binding.customerBindingId,
      stripeSubscriptionId: targetSubscription.id,
      stripeCustomerId: binding.stripeCustomerId,
      productId,
      priceId,
      entitlementStatus: state.status,
      currentPeriodStartIso: targetSubscription.currentPeriodStartIso,
      currentPeriodEndIso: targetSubscription.currentPeriodEndIso,
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      disputeState: state.disputeState,
      lifecycleState: state.lifecycleState,
      projectionLeaseToken: targetProjectionLease.projectionLeaseToken,
      reconcileLeaseToken: null,
      nowIso
    } as const;
    if (!subscriptionBindingId) {
      subscriptionBindingId = await store.bindFirstSubscription(common);
      return;
    }
    const { entitlementStatus, ...projectionCommon } = common;
    await store.projectEntitlement({
      ...projectionCommon,
      subscriptionBindingId,
      status: entitlementStatus,
      subscriptionStatus: state.subscriptionStatus
    });
  };

  let activeProjectionLease = projectionLease;
  if (requiresTerminalCancellation && currentSubscription.status !== "canceled") {
    const stoppedState = resolveProjectionState(eventType, currentSubscription, graph.dispute, adjustment, false);
    if (!stoppedState) return { status: "rejected", reason: "unknown-event-type", errorClass: "unknown-event-type" };
    try {
      await writeState(stoppedState, currentSubscription, activeProjectionLease);
    } catch (error) {
      return error instanceof Error && error.message === "receipt-lease-conflict"
        ? { status: "retryable", reason: "lease-conflict", errorClass: "lease-conflict" }
        : { status: "retryable", reason: "database-transaction-failed", errorClass: "database-transaction-failed" };
    }
    if (!receiptLeaseIsActive()) {
      return { status: "retryable", reason: "lease-conflict", errorClass: "lease-conflict" };
    }
    try {
      currentSubscription = await subscriptionCancelAdapter.cancelSubscription({ subscriptionId: currentSubscription.id });
    } catch {
      return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
    }
    if (!receiptLeaseIsActive()) {
      return { status: "retryable", reason: "lease-conflict", errorClass: "lease-conflict" };
    }
    if (
      !currentSubscription.id ||
      currentSubscription.status !== "canceled" ||
      !currentSubscription.customerId ||
      !currentSubscription.productId ||
      !currentSubscription.priceId ||
      !currentSubscription.currentPeriodStartIso ||
      !currentSubscription.currentPeriodEndIso
    ) {
      return { status: "retryable", reason: "object-retrieval-failed", errorClass: "object-retrieval-failed" };
    }
    if (
      currentSubscription.id !== subscription.id ||
      currentSubscription.customerId !== binding.stripeCustomerId ||
      currentSubscription.productId !== productId ||
      currentSubscription.priceId !== priceId
    ) {
      return { status: "rejected", reason: "binding-conflict", errorClass: "binding-conflict" };
    }
    if (!receiptLeaseIsActive()) {
      return { status: "retryable", reason: "lease-conflict", errorClass: "lease-conflict" };
    }
    try {
      const nextLease = await store.claimEntitlementProjection({
        ownerUserId: binding.ownerUserId,
        lifecycleId: binding.lifecycleId,
        nowIso
      });
      if (!nextLease) {
        return { status: "retryable", reason: "lease-conflict", errorClass: "lease-conflict" };
      }
      activeProjectionLease = nextLease;
    } catch {
      return { status: "retryable", reason: "database-transaction-failed", errorClass: "database-transaction-failed" };
    }
  }

  const state = resolveProjectionState(
    eventType,
    currentSubscription,
    graph.dispute,
    adjustment,
    requiresTerminalCancellation
  );
  if (!state) return { status: "rejected", reason: "unknown-event-type", errorClass: "unknown-event-type" };
  try {
    await writeState(state, currentSubscription, activeProjectionLease);
    return { status: "complete", projection: "applied" };
  } catch (error) {
    return error instanceof Error && error.message === "receipt-lease-conflict"
      ? { status: "retryable", reason: "lease-conflict", errorClass: "lease-conflict" }
      : { status: "retryable", reason: "database-transaction-failed", errorClass: "database-transaction-failed" };
  }
}

function resolveProjectionState(
  eventType: CommentTranslatorStripeWebhookEventType,
  subscription: CommentTranslatorStripeSubscriptionSnapshot,
  dispute: CommentTranslatorStripeDisputeSnapshot | undefined,
  paymentAdjustment: CommentTranslatorStripePaymentAdjustmentSnapshot | undefined,
  terminalCancellationConfirmed: boolean
): {
  status: CommentTranslatorPaidEntitlementStatus;
  lifecycleState: string;
  cancelAtPeriodEnd: boolean;
  disputeState: CommentTranslatorPaidDisputeState;
  subscriptionStatus: CommentTranslatorStripeSubscriptionStatus | null;
} | null {
  if (terminalCancellationConfirmed) {
    return {
      status: "canceled",
      lifecycleState: "canceled",
      cancelAtPeriodEnd: false,
      disputeState: "none",
      subscriptionStatus: "canceled"
    };
  }
  if (eventType.startsWith("charge.dispute.")) {
    if (!dispute) return null;
    if (dispute.status === "won") {
      const currentStatus = mapSubscriptionStatus(subscription.status);
      const canRestore = currentStatus === "active" || currentStatus === "cancel_at_period_end";
      return {
        status: canRestore ? (subscription.cancelAtPeriodEnd ? "cancel_at_period_end" : "active") : currentStatus,
        lifecycleState: canRestore ? (subscription.cancelAtPeriodEnd ? "cancel_at_period_end" : "active") : mapLifecycleState(subscription.status),
        cancelAtPeriodEnd: canRestore && subscription.cancelAtPeriodEnd,
        disputeState: canRestore ? "won" : "none",
        subscriptionStatus: subscription.status === "trialing" || subscription.status === "paused" ? null : subscription.status
      };
    }
    return {
      status: "dispute",
      lifecycleState: "dispute",
      cancelAtPeriodEnd: false,
      disputeState: dispute.status === "lost" ? "lost" : "investigating",
      subscriptionStatus: null
    };
  }
  if (
    (eventType.startsWith("refund.") || eventType.startsWith("credit_note.")) &&
    paymentAdjustment?.successful &&
    paymentAdjustment.fullAmount &&
    paymentAdjustment.targetsCurrentPeriod
  ) {
    return {
      status: "refund_reconciliation",
      lifecycleState: "refund_reconciliation",
      cancelAtPeriodEnd: false,
      disputeState: "none",
      subscriptionStatus: null
    };
  }

  const status = mapSubscriptionStatus(subscription.status);
  return {
    status: subscription.cancelAtPeriodEnd && status === "active" ? "cancel_at_period_end" : status,
    lifecycleState: subscription.cancelAtPeriodEnd && status === "active" ? "cancel_at_period_end" : mapLifecycleState(subscription.status),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd && status === "active",
    disputeState: "none",
    subscriptionStatus: subscription.status === "trialing" || subscription.status === "paused" ? null : subscription.status
  };
}

function shouldPreserveExistingPaidStop(
  entitlement: Awaited<ReturnType<CommentTranslatorPaidEntitlementStore["readEntitlement"]>>
): boolean {
  if (!entitlement) return false;
  if (entitlement.paymentFailureStartedAtIso !== null) {
    return !["past_due", "unpaid"].includes(entitlement.status);
  }
  return (
    [
      "dispute",
      "cancel_pending",
      "refund_reconciliation",
      "dispute_reconciliation",
      "paid_unentitled_reconciliation"
    ].includes(entitlement.status) ||
    ["investigating", "lost", "reconciliation"].includes(entitlement.disputeState)
  );
}

function mapSubscriptionStatus(status: CommentTranslatorStripeSubscriptionStatus): CommentTranslatorPaidEntitlementStatus {
  if (status === "trialing") return "active";
  if (status === "paused") return "incomplete";
  return status;
}

function mapLifecycleState(status: CommentTranslatorStripeSubscriptionStatus): string {
  if (status === "trialing") return "active";
  if (status === "paused") return "incomplete";
  return status;
}

export function createCommentTranslatorStripeAdapter(
  env: CommentTranslatorStripeEnv = process.env
): CommentTranslatorStripeAdapter {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  const requestStripe = async <T>(
    path: string,
    params: URLSearchParams,
    options: { idempotencyKey?: string } = {}
  ): Promise<T> => {
    if (!secretKey) throw new Error("Stripe secret key is unavailable.");
    const response = await fetch(`https://api.stripe.com${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
      },
      body: params.toString(),
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Stripe billing request failed.");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Stripe billing response is invalid.");
    return body as T;
  };

  const readStripeObject = async <T>(path: string): Promise<T> => {
    if (!secretKey) throw new Error("Stripe secret key is unavailable.");
    const response = await fetch(`https://api.stripe.com${path}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Stripe billing read failed.");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Stripe billing response is invalid.");
    return body as T;
  };

  const validateCheckoutPrice = async (params: CommentTranslatorStripeCheckoutSessionParams) => {
    if (params.currency !== "usd" || params.recurringInterval !== "month") {
      throw new Error("Paid Checkout Price policy is invalid.");
    }
    const price = await readStripeObject<Record<string, unknown>>(`/v1/prices/${encodeURIComponent(params.priceReferenceId)}`);
    const product = readStripeReference(price.product);
    const recurring = price.recurring && typeof price.recurring === "object" && !Array.isArray(price.recurring)
      ? (price.recurring as Record<string, unknown>)
      : null;
    if (
      readOptionalStripeReference(price.id) !== params.priceReferenceId ||
      price.currency !== "usd" ||
      price.unit_amount !== 600 ||
      price.tax_behavior !== "inclusive" ||
      recurring?.interval !== "month" ||
      product !== params.productReferenceId
    ) {
      throw new Error("Paid Checkout Price binding conflict.");
    }

    const discountReference = params.promotionCodeReferenceId ?? params.couponReferenceId;
    if (!discountReference) return;
    const discountPath = params.promotionCodeReferenceId
      ? `/v1/promotion_codes/${encodeURIComponent(discountReference)}`
      : `/v1/coupons/${encodeURIComponent(discountReference)}`;
    const discount = await readStripeObject<Record<string, unknown>>(discountPath);
    if (params.promotionCodeReferenceId && discount.active !== true) {
      throw new Error("Paid Checkout Promotion Code is inactive.");
    }
    const coupon = params.promotionCodeReferenceId && discount.coupon && typeof discount.coupon === "object" && !Array.isArray(discount.coupon)
      ? (discount.coupon as Record<string, unknown>)
      : discount;
    const appliesTo = coupon.applies_to && typeof coupon.applies_to === "object" && !Array.isArray(coupon.applies_to)
      ? (coupon.applies_to as Record<string, unknown>)
      : null;
    const products = Array.isArray(appliesTo?.products)
      ? appliesTo.products.filter((value): value is string => typeof value === "string")
      : [];
    if (products.length === 0 || !products.includes(params.productReferenceId)) {
      throw new Error("Paid Checkout discount is not restricted to the configured Price product.");
    }
  };

  const readCheckoutResponse = (body: Record<string, unknown>): CommentTranslatorStripeCheckoutSessionResult => {
    const id = readOptionalStripeReference(body.id);
    const customerId = readStripeReference(body.customer);
    const url = readOptionalStripeReference(body.url);
    const expiresAt = typeof body.expires_at === "number" && Number.isFinite(body.expires_at) ? body.expires_at : null;
    const expiresAtIso = expiresAt === null ? null : new Date(expiresAt * 1000).toISOString();
    const status = body.status === "open" || body.status === "complete" || body.status === "expired" ? body.status : "unknown";
    return { id, customerId, url, expiresAtIso, status };
  };

  return {
    async createCustomer(params) {
      const form = new URLSearchParams();
      if (params.email?.trim()) form.set("email", params.email.trim());
      const body = await requestStripe<Record<string, unknown>>("/v1/customers", form, {
        idempotencyKey: params.idempotencyKey
      });
      return { id: readRequiredStripeReference(body.id, "Stripe Customer") };
    },
    async createCheckoutSession(params) {
      if (params.paymentMethodTypes.length !== 1 || params.paymentMethodTypes[0] !== "card") {
        throw new Error("Paid Checkout payment method policy is invalid.");
      }
      if (params.mode !== "subscription" || params.automaticTax !== true || params.billingAddressCollection !== "required") {
        throw new Error("Paid Checkout policy is invalid.");
      }
      await validateCheckoutPrice(params);
      const expiresAtSeconds = Math.floor(new Date(params.expiresAtIso).getTime() / 1000);
      if (!Number.isFinite(expiresAtSeconds)) throw new Error("Paid Checkout expiry is invalid.");
      const form = new URLSearchParams();
      form.set("mode", "subscription");
      form.set("customer", params.customerReferenceId);
      form.set("client_reference_id", params.clientReferenceId);
      form.set("line_items[0][price]", params.priceReferenceId);
      form.set("line_items[0][quantity]", "1");
      form.set("success_url", params.successUrl);
      form.set("cancel_url", params.cancelUrl);
      form.set("expires_at", String(expiresAtSeconds));
      form.set("automatic_tax[enabled]", "true");
      form.set("billing_address_collection", "required");
      form.set("payment_method_types[0]", "card");
      if (params.customerEmail?.trim()) form.set("customer_email", params.customerEmail.trim());
      if (params.promotionCodeReferenceId && params.couponReferenceId) {
        throw new Error("Paid Checkout discount policy is ambiguous.");
      }
      if (params.promotionCodeReferenceId) form.set("discounts[0][promotion_code]", params.promotionCodeReferenceId);
      if (params.couponReferenceId) form.set("discounts[0][coupon]", params.couponReferenceId);
      const body = await requestStripe<Record<string, unknown>>("/v1/checkout/sessions", form, {
        idempotencyKey: params.idempotencyKey
      });
      return {
        ...readCheckoutResponse(body),
        observed: params
      };
    },
    async retrieveCheckoutSession(sessionId) {
      if (!secretKey) throw new Error("Stripe secret key is unavailable.");
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Stripe Checkout Session retrieval failed.");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Stripe Checkout Session response is invalid.");
      return readCheckoutResponse(body as Record<string, unknown>);
    },
    async expireCheckoutSession({ sessionId, idempotencyKey }) {
      const body = await requestStripe<Record<string, unknown>>(
        `/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`,
        new URLSearchParams(),
        { idempotencyKey }
      );
      return readCheckoutResponse(body);
    },
    async createPortalSession(params) {
      const form = new URLSearchParams();
      form.set("customer", params.customerReferenceId);
      form.set("return_url", params.returnUrl);
      if (params.flow === "payment-method-update") {
        form.set("flow_data[type]", "payment_method_update");
      }
      const body = await requestStripe<Record<string, unknown>>("/v1/billing_portal/sessions", form);
      return { url: readOptionalStripeReference(body.url) };
    }
  };
}

export function createCommentTranslatorStripeWebhookVerifier(
  env: CommentTranslatorStripeEnv = process.env
): CommentTranslatorStripeWebhookVerifier {
  return {
    async constructEvent(payload, signature, webhookSecret) {
      const secret = webhookSecret.trim() || env.STRIPE_WEBHOOK_SECRET?.trim();
      if (!secret) throw new Error("Stripe webhook secret is unavailable.");
      const timestamp = readStripeSignatureTimestamp(signature);
      if (!timestamp || Math.abs(Date.now() - timestamp * 1000) > 300_000) {
        throw new Error("Stripe webhook signature timestamp is invalid.");
      }
      const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
      const candidates = readStripeSignatureValues(signature);
      if (!candidates.some((candidate) => safeEqualHex(candidate, expected))) {
        throw new Error("Stripe webhook signature is invalid.");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch {
        throw new Error("Stripe webhook payload is invalid.");
      }
      if (!parsed || typeof parsed !== "object") throw new Error("Stripe webhook payload is invalid.");
      return parsed as CommentTranslatorStripeWebhookEvent;
    }
  };
}

export function createCommentTranslatorStripeCurrentObjectReader(
  env: CommentTranslatorStripeEnv = process.env
): CommentTranslatorStripeCurrentObjectReader {
  return {
    async retrieveCurrentObjectState({ eventType, objectId }) {
      const secretKey = env.STRIPE_SECRET_KEY?.trim();
      if (!secretKey) throw new Error("Stripe secret key is unavailable.");
      const fetchObject = async <T>(path: string, query = ""): Promise<T> => {
        const response = await fetch(`https://api.stripe.com${path}${query}`, {
          headers: {
            Authorization: `Bearer ${secretKey}`
          },
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Stripe current object retrieval failed.");
        const body: unknown = await response.json();
        if (!body || typeof body !== "object") throw new Error("Stripe current object retrieval failed.");
        return body as T;
      };

      if (eventType.startsWith("checkout.")) {
        const session = await fetchObject<Record<string, unknown>>(
          `/v1/checkout/sessions/${encodeURIComponent(objectId)}`,
          "?expand[]=subscription&expand[]=invoice"
        );
        const subscription = await retrieveExpandedSubscription(fetchObject, session.subscription);
        const invoice = await retrieveExpandedInvoice(fetchObject, session.invoice, subscription?.latest_invoice);
        return {
          checkoutSession: mapCheckoutSession(session),
          subscription: subscription ? mapSubscription(subscription) : undefined,
          invoice: invoice ? mapInvoice(invoice) : undefined
        };
      }

      if (eventType.startsWith("customer.subscription.")) {
        const subscription = await fetchObject<Record<string, unknown>>(
          `/v1/subscriptions/${encodeURIComponent(objectId)}`,
          "?expand[]=latest_invoice"
        );
        const mappedSubscription = mapSubscription(subscription);
        const invoice = await retrieveExpandedInvoice(fetchObject, subscription.latest_invoice, mappedSubscription.latestInvoiceId);
        return { subscription: mappedSubscription, invoice: invoice ? mapInvoice(invoice) : undefined };
      }

      if (eventType.startsWith("invoice.")) {
        const invoice = await fetchObject<Record<string, unknown>>(
          `/v1/invoices/${encodeURIComponent(objectId)}`
        );
        const subscription = await retrieveExpandedSubscription(fetchObject, readInvoiceSubscriptionReference(invoice));
        return { invoice: mapInvoice(invoice), subscription: subscription ? mapSubscription(subscription) : undefined };
      }

      if (eventType.startsWith("charge.dispute.")) {
        const dispute = await fetchObject<Record<string, unknown>>(
          `/v1/disputes/${encodeURIComponent(objectId)}`,
          "?expand[]=charge&expand[]=payment_intent"
        );
        const chargeReference = readStripeReference(dispute.charge);
        const charge =
          dispute.charge && typeof dispute.charge === "object" && !Array.isArray(dispute.charge)
            ? (dispute.charge as Record<string, unknown>)
            : chargeReference
              ? await fetchObject<Record<string, unknown>>(`/v1/charges/${encodeURIComponent(chargeReference)}`, "?expand[]=payment_intent")
              : null;
        const paymentIntentReference = readStripeReference(dispute.payment_intent) ?? readStripeReference(charge?.payment_intent);
        const paymentIntent =
          dispute.payment_intent && typeof dispute.payment_intent === "object" && !Array.isArray(dispute.payment_intent)
            ? (dispute.payment_intent as Record<string, unknown>)
            : paymentIntentReference
              ? await fetchObject<Record<string, unknown>>(`/v1/payment_intents/${encodeURIComponent(paymentIntentReference)}`)
              : null;
        const invoiceId =
          readStripeReference(dispute.invoice) ??
          readStripeReference(charge?.invoice) ??
          readStripeReference(paymentIntent?.invoice);
        const invoice = invoiceId ? await fetchObject<Record<string, unknown>>(`/v1/invoices/${encodeURIComponent(invoiceId)}`) : null;
        const subscription = await retrieveExpandedSubscription(fetchObject, invoice ? readInvoiceSubscriptionReference(invoice) : null);
        return {
          dispute: mapDispute(dispute, charge, paymentIntent, invoice),
          invoice: invoice ? mapInvoice(invoice) : undefined,
          subscription: subscription ? mapSubscription(subscription) : undefined
        };
      }

      const object = await fetchObject<Record<string, unknown>>(
        `/${eventType.startsWith("refund.") ? "v1/refunds" : "v1/credit_notes"}/${encodeURIComponent(objectId)}`
      );
      let charge: Record<string, unknown> | null = null;
      let paymentIntent: Record<string, unknown> | null = null;
      if (eventType.startsWith("refund.")) {
        const chargeId = readStripeReference(object.charge);
        const paymentIntentId = readStripeReference(object.payment_intent);
        charge = chargeId
          ? await fetchObject<Record<string, unknown>>(`/v1/charges/${encodeURIComponent(chargeId)}`, "?expand[]=payment_intent")
          : null;
        const resolvedPaymentIntent = charge?.payment_intent ?? paymentIntentId;
        const resolvedPaymentIntentId = readStripeReference(resolvedPaymentIntent);
        paymentIntent =
          resolvedPaymentIntent && typeof resolvedPaymentIntent === "object" && !Array.isArray(resolvedPaymentIntent)
            ? (resolvedPaymentIntent as Record<string, unknown>)
            : resolvedPaymentIntentId
              ? await fetchObject<Record<string, unknown>>(`/v1/payment_intents/${encodeURIComponent(resolvedPaymentIntentId)}`)
              : null;
      }
      const invoiceId =
        readStripeReference(object.invoice) ??
        readStripeReference(charge?.invoice) ??
        readStripeReference(paymentIntent?.invoice);
      const invoice = invoiceId ? await fetchObject<Record<string, unknown>>(`/v1/invoices/${encodeURIComponent(invoiceId)}`) : null;
      const subscription = await retrieveExpandedSubscription(fetchObject, invoice ? readInvoiceSubscriptionReference(invoice) : null);
      const mappedInvoice = invoice ? mapInvoice(invoice) : undefined;
      const mappedSubscription = subscription ? mapSubscription(subscription) : undefined;
      const chargeAmount = readPositiveInteger(charge?.amount);
      const refundedAmount = readNonNegativeInteger(charge?.amount_refunded);
      const invoiceAmountPaid = readPositiveInteger(invoice?.amount_paid);
      const cumulativePostPaymentCreditAmount = readNonNegativeInteger(invoice?.post_payment_credit_notes_amount);
      const rawStatus = object.status;
      const status: CommentTranslatorStripePaymentAdjustmentSnapshot["status"] =
        rawStatus === "succeeded" ||
        rawStatus === "pending" ||
        rawStatus === "failed" ||
        rawStatus === "canceled" ||
        rawStatus === "requires_action" ||
        rawStatus === "issued" ||
        rawStatus === "void"
          ? rawStatus
          : "unknown";
      const creditType = object.type;
      const successful = eventType.startsWith("refund.")
        ? status === "succeeded"
        : status === "issued" && (creditType === "post_payment" || creditType === "mixed");
      const fullAmount = eventType.startsWith("refund.")
        ? successful && chargeAmount !== null && refundedAmount !== null && refundedAmount >= chargeAmount
        : successful &&
          invoiceAmountPaid !== null &&
          cumulativePostPaymentCreditAmount !== null &&
          cumulativePostPaymentCreditAmount >= invoiceAmountPaid;
      const targetsCurrentPeriod = Boolean(
        mappedInvoice?.id &&
        mappedSubscription?.latestInvoiceId &&
        mappedSubscription.latestInvoiceId === mappedInvoice.id
      );
      return {
        invoice: mappedInvoice,
        subscription: mappedSubscription,
        paymentAdjustment: {
          status,
          successful,
          fullAmount,
          targetsCurrentPeriod
        }
      };
    }
  };
}

export function createCommentTranslatorStripeSubscriptionCancelAdapter(
  env: CommentTranslatorStripeEnv = process.env
): CommentTranslatorStripeSubscriptionCancelAdapter {
  return {
    async cancelSubscription({ subscriptionId }) {
      const secretKey = env.STRIPE_SECRET_KEY?.trim();
      if (!secretKey) throw new Error("Stripe secret key is unavailable.");
      const subscriptionPath = `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`;
      const response = await fetch(`https://api.stripe.com${subscriptionPath}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${secretKey}`
        },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Stripe subscription cancellation failed.");
      const currentResponse = await fetch(`https://api.stripe.com${subscriptionPath}?expand[]=latest_invoice`, {
        headers: {
          Authorization: `Bearer ${secretKey}`
        },
        cache: "no-store"
      });
      if (!currentResponse.ok) throw new Error("Stripe canceled subscription refetch failed.");
      const body: unknown = await currentResponse.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("Stripe subscription cancellation returned an invalid object.");
      }
      return mapSubscription(body as Record<string, unknown>);
    }
  };
}

function readStripeSignatureTimestamp(signature: string): number | null {
  const match = /(?:^|,)t=(\d+)(?:,|$)/.exec(signature);
  if (!match) return null;
  const timestamp = Number(match[1]);
  return Number.isSafeInteger(timestamp) ? timestamp : null;
}

function readStripeSignatureValues(signature: string): string[] {
  return [...signature.matchAll(/(?:^|,)v1=([a-f0-9]{64})(?:,|$)/gi)].map((match) => match[1].toLowerCase());
}

function safeEqualHex(left: string, right: string): boolean {
  try {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

async function retrieveExpandedSubscription(
  fetchObject: <T>(path: string, query?: string) => Promise<T>,
  value: unknown
): Promise<Record<string, unknown> | null> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  const id = readStripeReference(value);
  return id ? fetchObject<Record<string, unknown>>(`/v1/subscriptions/${encodeURIComponent(id)}`, "?expand[]=latest_invoice") : null;
}

async function retrieveExpandedInvoice(
  fetchObject: <T>(path: string, query?: string) => Promise<T>,
  value: unknown,
  fallbackId: string | null | undefined
): Promise<Record<string, unknown> | null> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  const id = readStripeReference(value) ?? fallbackId;
  return id ? fetchObject<Record<string, unknown>>(`/v1/invoices/${encodeURIComponent(id)}`) : null;
}

function mapCheckoutSession(value: Record<string, unknown>): CommentTranslatorStripeCheckoutSessionSnapshot {
  const status = value.status;
  const paymentStatus = value.payment_status;
  return {
    id: readObjectId(value) ?? "",
    customerId: readStripeReference(value.customer),
    subscriptionId: readStripeReference(value.subscription),
    status: status === "complete" || status === "expired" || status === "open" ? status : "unknown",
    expiresAtIso: readUnixSecondsIso(value.expires_at),
    paymentStatus:
      paymentStatus === "paid" || paymentStatus === "unpaid" || paymentStatus === "no_payment_required" ? paymentStatus : "unknown"
  };
}

function mapSubscription(value: Record<string, unknown>): CommentTranslatorStripeSubscriptionSnapshot {
  const status = value.status;
  if (!isStripeSubscriptionStatus(status)) throw new Error("Stripe subscription status is invalid.");
  const item = readFirstSubscriptionItem(value.items);
  return {
    id: readObjectId(value) ?? "",
    customerId: readStripeReference(value.customer),
    status,
    productId: readStripeReference(item?.price && typeof item.price === "object" ? (item.price as Record<string, unknown>).product : null),
    priceId: readStripeReference(item?.price),
    currentPeriodStartIso: readUnixSecondsIso(value.current_period_start) ?? readUnixSecondsIso(item?.current_period_start),
    currentPeriodEndIso: readUnixSecondsIso(value.current_period_end) ?? readUnixSecondsIso(item?.current_period_end),
    cancelAtPeriodEnd: value.cancel_at_period_end === true,
    latestInvoiceId: readStripeReference(value.latest_invoice)
  };
}

function mapInvoice(value: Record<string, unknown>): CommentTranslatorStripeInvoiceSnapshot {
  const status = value.status;
  return {
    id: readObjectId(value) ?? "",
    customerId: readStripeReference(value.customer),
    subscriptionId: readInvoiceSubscriptionReference(value),
    status: status === "paid" || status === "open" || status === "uncollectible" || status === "void" || status === "draft" ? status : "unknown",
    paid: value.paid === true || status === "paid",
    paymentIntentId: readStripeReference(value.payment_intent),
    chargeId: readStripeReference(value.charge),
    productId: null,
    priceId: null
  };
}

function readInvoiceSubscriptionReference(value: Record<string, unknown>): string | null {
  const legacyReference = readStripeReference(value.subscription);
  const parent = value.parent && typeof value.parent === "object" && !Array.isArray(value.parent)
    ? (value.parent as Record<string, unknown>)
    : null;
  const subscriptionDetails = parent?.subscription_details && typeof parent.subscription_details === "object" && !Array.isArray(parent.subscription_details)
    ? (parent.subscription_details as Record<string, unknown>)
    : null;
  const parentReference = parent?.type === "subscription_details"
    ? readStripeReference(subscriptionDetails?.subscription)
    : null;
  if (legacyReference && parentReference && legacyReference !== parentReference) return null;
  return parentReference ?? legacyReference;
}

function mapDispute(
  value: Record<string, unknown>,
  resolvedCharge: Record<string, unknown> | null = null,
  resolvedPaymentIntent: Record<string, unknown> | null = null,
  resolvedInvoice: Record<string, unknown> | null = null
): CommentTranslatorStripeDisputeSnapshot {
  const status = value.status;
  const charge = value.charge && typeof value.charge === "object" && !Array.isArray(value.charge)
    ? (value.charge as Record<string, unknown>)
    : resolvedCharge;
  const paymentIntent = value.payment_intent && typeof value.payment_intent === "object" && !Array.isArray(value.payment_intent)
    ? (value.payment_intent as Record<string, unknown>)
    : resolvedPaymentIntent;
  return {
    id: readObjectId(value) ?? "",
    status: status === "needs_response" || status === "under_review" || status === "won" || status === "lost" || status === "warning_closed" ? status : "unknown",
    customerId: readStripeReference(value.customer) ?? readStripeReference(charge?.customer) ?? readStripeReference(paymentIntent?.customer),
    subscriptionId:
      readStripeReference(value.subscription) ??
      readStripeReference(charge?.subscription) ??
      readInvoiceSubscriptionReference(resolvedInvoice ?? {}),
    invoiceId:
      readStripeReference(value.invoice) ??
      readStripeReference(charge?.invoice) ??
      readStripeReference(paymentIntent?.invoice) ??
      readObjectId(resolvedInvoice ?? {}),
    paymentIntentId: readStripeReference(value.payment_intent) ?? readStripeReference(charge?.payment_intent),
    chargeId: readStripeReference(value.charge)
  };
}

function readFirstSubscriptionItem(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = (value as Record<string, unknown>).data;
  return Array.isArray(data) && data[0] && typeof data[0] === "object" ? (data[0] as Record<string, unknown>) : null;
}

function readUnixSecondsIso(value: unknown): string | null {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) return null;
  return new Date((value as number) * 1000).toISOString();
}

function readPositiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

function isStripeSubscriptionStatus(value: unknown): value is CommentTranslatorStripeSubscriptionStatus {
  return ["active", "trialing", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"].includes(value as string);
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
