import "server-only";

import { createHash } from "node:crypto";
import Stripe from "stripe";
import {
  createCommentTranslatorSessionPlanEntitlement,
  type CommentTranslatorSessionPlan,
  type CommentTranslatorSessionPlanEntitlement
} from "./comment-translator-session-runtime";
import { type YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";

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
  implementationEntitlementShape: "free-or-paid-only";
  intervalPresentation: "monthly-yearly-display-only-until-stripe-readiness";
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
  implementationStage: "public-release-task-15-stripe-paid-plan-integration",
  runtime: "server-only",
  freePlanAvailability: "permanent",
  stripeSurfaces: ["Checkout Sessions", "Billing Customer Portal", "signed webhook"],
  stripeApiVersion: "2026-05-27.dahlia",
  browserReadableOutput: "sanitized-billing-metadata-only",
  checkoutMode: "subscription",
  entitlementSync: "signed-webhook-to-server-owned-plan-entitlement-state",
  safeDegradation: "failed-expired-canceled-unavailable-payment-states-use-free-or-paid-inactive",
  paidPrioritization: "not-implemented",
  providerUsageCharging: "not-implemented",
  liveProviderExecution: "not-run-in-task-15",
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

const paidPlanEntitlementReferenceId = "comment-translator-paid-public-v1";
const billingUserMetadataKey = "comment_translator_billing_user_reference";
const paidEntitlementsByBillingUser = new Map<CommentTranslatorBillingUserReference, CommentTranslatorBillingEntitlementSnapshot>();

export function createCommentTranslatorBillingUserReference(
  callerAuthorization: CommentTranslatorBillingCallerAuthorization
): CommentTranslatorBillingUserReference | null {
  if (callerAuthorization.status !== "authorized") {
    return null;
  }

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
  const billingUserReferenceId = createCommentTranslatorBillingUserReference(callerAuthorization);
  if (!billingUserReferenceId) {
    return createFreeBillingSnapshot(null, "free");
  }

  return paidEntitlementsByBillingUser.get(billingUserReferenceId) ?? createFreeBillingSnapshot(billingUserReferenceId, "free");
}

export function createCommentTranslatorBillingBrowserSafeViewModel({
  snapshot,
  env
}: {
  snapshot: CommentTranslatorBillingEntitlementSnapshot;
  env: CommentTranslatorStripeEnv;
}): CommentTranslatorBillingBrowserSafeViewModel {
  return {
    plan: snapshot.plan,
    billingState: snapshot.billingState,
    freePlanAvailable: snapshot.freePlanAvailable,
    planEntitlement: snapshot.planEntitlement,
    paidPlan: snapshot.paidPlan,
    checkoutAvailable: missingCheckoutEnvReferences(env).length === 0,
    portalAvailable: Boolean(snapshot.stripeCustomerReferenceId) && missingPortalEnvReferences(env).length === 0,
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
        displayPrice: {
          currency: "JPY",
          monthlyAmount: 0,
          yearlyAmount: null
        },
        entitlement: freeEntitlement,
        badge: {
          ja: "常に利用可能",
          en: "Always available"
        },
        description: {
          ja: "まず試せる基本枠です。",
          en: "The basic plan for getting started."
        },
        cta: {
          ja: "現在の Free 枠を確認",
          en: "Review Free limits"
        }
      },
      {
        id: "pro-monthly",
        productName: "Kuro Stream Kit Pro",
        interval: "monthly",
        implementationEntitlement: "paid",
        displayPrice: {
          currency: "JPY",
          monthlyAmount: 1_200,
          yearlyAmount: null
        },
        entitlement: paidEntitlement,
        badge: {
          ja: "月額",
          en: "Paid monthly"
        },
        description: {
          ja: "Comment Translator の利用上限を Free より拡張します。",
          en: "Expands Comment Translator limits beyond Free."
        },
        cta: {
          ja: "月額 Pro 表示",
          en: "Monthly Pro display"
        }
      },
      {
        id: "pro-yearly",
        productName: "Kuro Stream Kit Pro",
        interval: "yearly",
        implementationEntitlement: "paid",
        displayPrice: {
          currency: "JPY",
          monthlyAmount: 1_000,
          yearlyAmount: 12_000
        },
        entitlement: paidEntitlement,
        badge: {
          ja: "年額がお得",
          en: "Best value"
        },
        description: {
          ja: "年額は月額 12 か月分より安い表示例です。",
          en: "The yearly display is cheaper than 12 monthly payments."
        },
        cta: {
          ja: "年額 Pro 表示",
          en: "Yearly Pro display"
        }
      }
    ]
  };
}

export async function createCommentTranslatorStripeCheckoutSessionResult({
  callerAuthorization,
  env,
  stripeAdapter,
  customerEmail = null
}: {
  callerAuthorization: CommentTranslatorBillingCallerAuthorization;
  env: CommentTranslatorStripeEnv;
  stripeAdapter: Pick<CommentTranslatorStripeAdapter, "createCheckoutSession">;
  customerEmail?: string | null;
}): Promise<
  | {
      status: "redirect-ready";
      url: string;
      observed?: CommentTranslatorStripeCheckoutSessionParams;
    }
  | {
      status: "unavailable";
      reason: "caller-not-authenticated" | "missing-config" | "stripe-session-url-missing";
      missingEnvReferences: CommentTranslatorStripeEnvName[];
    }
> {
  const billingUserReferenceId = createCommentTranslatorBillingUserReference(callerAuthorization);
  if (!billingUserReferenceId) {
    return {
      status: "unavailable",
      reason: "caller-not-authenticated",
      missingEnvReferences: []
    };
  }

  const missingEnvReferences = missingCheckoutEnvReferences(env);
  if (missingEnvReferences.length > 0) {
    return {
      status: "unavailable",
      reason: "missing-config",
      missingEnvReferences
    };
  }

  const siteUrl = readEnvValue(env, "NEXT_PUBLIC_SITE_URL");
  const priceReferenceId = readEnvValue(env, "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID");
  const result = await stripeAdapter.createCheckoutSession({
    mode: "subscription",
    priceReferenceId,
    clientReferenceId: billingUserReferenceId,
    successUrl: `${siteUrl}/account/billing?billing=checkout-returned`,
    cancelUrl: `${siteUrl}/account/billing?billing=checkout-canceled`,
    customerEmail
  });

  if (!result.url) {
    return {
      status: "unavailable",
      reason: "stripe-session-url-missing",
      missingEnvReferences: []
    };
  }

  return {
    status: "redirect-ready",
    url: result.url,
    observed: result.observed
  };
}

export async function createCommentTranslatorStripePortalSessionResult({
  callerAuthorization,
  env,
  stripeAdapter
}: {
  callerAuthorization: CommentTranslatorBillingCallerAuthorization;
  env: CommentTranslatorStripeEnv;
  stripeAdapter: Pick<CommentTranslatorStripeAdapter, "createPortalSession">;
}): Promise<
  | {
      status: "redirect-ready";
      url: string;
    }
  | {
      status: "unavailable";
      reason: "caller-not-authenticated" | "missing-config" | "missing-customer" | "stripe-session-url-missing";
      missingEnvReferences: CommentTranslatorStripeEnvName[];
    }
> {
  const snapshot = readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
  if (!snapshot.billingUserReferenceId) {
    return {
      status: "unavailable",
      reason: "caller-not-authenticated",
      missingEnvReferences: []
    };
  }

  if (!snapshot.stripeCustomerReferenceId) {
    return {
      status: "unavailable",
      reason: "missing-customer",
      missingEnvReferences: []
    };
  }

  const missingEnvReferences = missingPortalEnvReferences(env);
  if (missingEnvReferences.length > 0) {
    return {
      status: "unavailable",
      reason: "missing-config",
      missingEnvReferences
    };
  }

  const siteUrl = readEnvValue(env, "NEXT_PUBLIC_SITE_URL");
  const result = await stripeAdapter.createPortalSession({
    customerReferenceId: snapshot.stripeCustomerReferenceId,
    returnUrl: `${siteUrl}/account/billing?billing=portal-returned`
  });

  if (!result.url) {
    return {
      status: "unavailable",
      reason: "stripe-session-url-missing",
      missingEnvReferences: []
    };
  }

  return {
    status: "redirect-ready",
    url: result.url
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
      reason: "missing-signature" | "missing-config" | "invalid-signature";
      missingEnvReferences?: CommentTranslatorStripeEnvName[];
    }
> {
  if (!signature) {
    return {
      status: "rejected",
      reason: "missing-signature"
    };
  }

  const webhookSecret = readOptionalEnvValue(env, "STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return {
      status: "rejected",
      reason: "missing-config",
      missingEnvReferences: ["STRIPE_WEBHOOK_SECRET"]
    };
  }

  let event: CommentTranslatorStripeWebhookEvent;
  try {
    event = await verifier.constructEvent(payload, signature, webhookSecret);
  } catch {
    return {
      status: "rejected",
      reason: "invalid-signature"
    };
  }

  if (!isSupportedEntitlementEvent(event.type)) {
    return {
      status: "ignored",
      reason: "unsupported-event"
    };
  }

  const billingUserReferenceId = event.billingUserReferenceId ?? findBillingUserReferenceByCustomer(event.customerReferenceId);
  if (!billingUserReferenceId) {
    return {
      status: "ignored",
      reason: "missing-billing-user-reference"
    };
  }

  const entitlement = createSnapshotFromStripeSubscriptionEvent({
    billingUserReferenceId,
    customerReferenceId: event.customerReferenceId,
    subscriptionReferenceId: event.subscriptionReferenceId,
    status: event.status,
    currentPeriodEndMs: event.currentPeriodEndMs
  });

  paidEntitlementsByBillingUser.set(billingUserReferenceId, entitlement);

  return {
    status: "applied",
    entitlement
  };
}

export function createCommentTranslatorStripeAdapter(env: CommentTranslatorStripeEnv = process.env): CommentTranslatorStripeAdapter {
  const stripe = createStripeClient(env);

  return {
    async createCheckoutSession(params) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price: params.priceReferenceId,
            quantity: 1
          }
        ],
        client_reference_id: params.clientReferenceId,
        customer_email: params.customerEmail ?? undefined,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          [billingUserMetadataKey]: params.clientReferenceId
        },
        subscription_data: {
          metadata: {
            [billingUserMetadataKey]: params.clientReferenceId
          }
        }
      });

      return {
        url: session.url ?? null
      };
    },
    async createPortalSession(params) {
      const session = await stripe.billingPortal.sessions.create({
        customer: params.customerReferenceId,
        return_url: params.returnUrl
      });

      return {
        url: session.url ?? null
      };
    }
  };
}

export function createCommentTranslatorStripeWebhookVerifier(
  env: CommentTranslatorStripeEnv = process.env
): CommentTranslatorStripeWebhookVerifier {
  const stripe = createStripeClient(env);

  return {
    async constructEvent(payload, signature, webhookSecret) {
      const event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
      return normalizeStripeWebhookEvent(event);
    }
  };
}

export function resetInMemoryCommentTranslatorBillingEntitlementsForTests() {
  paidEntitlementsByBillingUser.clear();
}

function createStripeClient(env: CommentTranslatorStripeEnv) {
  const secretKey = readEnvValue(env, "STRIPE_SECRET_KEY");
  return new Stripe(secretKey, {
    apiVersion: "2026-05-27.dahlia"
  });
}

function createSnapshotFromStripeSubscriptionEvent({
  billingUserReferenceId,
  customerReferenceId,
  subscriptionReferenceId,
  status,
  currentPeriodEndMs
}: {
  billingUserReferenceId: CommentTranslatorBillingUserReference;
  customerReferenceId: string | null;
  subscriptionReferenceId: string | null;
  status: CommentTranslatorStripeSubscriptionStatus | null;
  currentPeriodEndMs: number | null;
}): CommentTranslatorBillingEntitlementSnapshot {
  const paidIsActive = status === "active" || status === "trialing";
  const billingState: CommentTranslatorBillingState = paidIsActive ? "paid-active" : "paid-inactive";

  return {
    plan: paidIsActive ? "paid" : "free",
    billingState,
    freePlanAvailable: true,
    planEntitlement: paidIsActive ? createPaidPlanEntitlement() : createCommentTranslatorSessionPlanEntitlement({ plan: "free" }),
    billingUserReferenceId,
    stripeCustomerReferenceId: customerReferenceId,
    stripeSubscriptionReferenceId: subscriptionReferenceId,
    paidPlan: {
      status: paidIsActive ? "available" : "inactive",
      currentPeriodEndIso: currentPeriodEndMs ? new Date(currentPeriodEndMs).toISOString() : null,
      provider: "stripe"
    },
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

function createFreeBillingSnapshot(
  billingUserReferenceId: CommentTranslatorBillingUserReference | null,
  billingState: "free" | "paid-inactive"
): CommentTranslatorBillingEntitlementSnapshot {
  return {
    plan: "free",
    billingState,
    freePlanAvailable: true,
    planEntitlement: createCommentTranslatorSessionPlanEntitlement({ plan: "free" }),
    billingUserReferenceId,
    stripeCustomerReferenceId: null,
    stripeSubscriptionReferenceId: null,
    paidPlan: {
      status: billingState === "paid-inactive" ? "inactive" : "unconfigured",
      currentPeriodEndIso: null,
      provider: "stripe"
    },
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

function createPaidPlanEntitlement() {
  return createCommentTranslatorSessionPlanEntitlement({
    plan: "paid",
    paidEntitlement: {
      planEntitlementReferenceId: paidPlanEntitlementReferenceId,
      dailyLimitMs: 7_200_000,
      sessionLimitMs: 3_600_000,
      translatedMessagesPerMinute: 90,
      activeSessionsPerUser: 1
    }
  });
}

function normalizeStripeWebhookEvent(event: Stripe.Event): CommentTranslatorStripeWebhookEvent {
  const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription | Stripe.Invoice;

  if (event.type === "checkout.session.completed") {
    const session = object as Stripe.Checkout.Session;
    return {
      type: event.type,
      customerReferenceId: stringReference(session.customer),
      subscriptionReferenceId: stringReference(session.subscription),
      status: null,
      priceReferenceId: null,
      billingUserReferenceId: normalizeBillingUserReference(session.client_reference_id ?? session.metadata?.[billingUserMetadataKey] ?? null),
      currentPeriodEndMs: null
    };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = object as Stripe.Subscription;
    return {
      type: event.type,
      customerReferenceId: stringReference(subscription.customer),
      subscriptionReferenceId: subscription.id,
      status: normalizeSubscriptionStatus(subscription.status),
      priceReferenceId: subscription.items.data[0]?.price.id ?? null,
      billingUserReferenceId: normalizeBillingUserReference(subscription.metadata?.[billingUserMetadataKey] ?? null),
      currentPeriodEndMs:
        typeof subscription.items.data[0]?.current_period_end === "number"
          ? subscription.items.data[0].current_period_end * 1_000
          : null
    };
  }

  const invoice = object as Stripe.Invoice;
  return {
    type: event.type as CommentTranslatorStripeWebhookEvent["type"],
    customerReferenceId: stringReference(invoice.customer),
    subscriptionReferenceId: typeof invoice.parent?.subscription_details?.subscription === "string" ? invoice.parent.subscription_details.subscription : null,
    status: event.type === "invoice.payment_failed" ? "past_due" : null,
    priceReferenceId: null,
    billingUserReferenceId: null,
    currentPeriodEndMs: null
  };
}

function isSupportedEntitlementEvent(type: CommentTranslatorStripeWebhookEvent["type"]) {
  return (
    type === "customer.subscription.created" ||
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted" ||
    type === "invoice.payment_failed"
  );
}

function findBillingUserReferenceByCustomer(customerReferenceId: string | null) {
  if (!customerReferenceId) {
    return null;
  }

  for (const [billingUserReferenceId, snapshot] of Array.from(paidEntitlementsByBillingUser.entries())) {
    if (snapshot.stripeCustomerReferenceId === customerReferenceId) {
      return billingUserReferenceId;
    }
  }

  return null;
}

function missingCheckoutEnvReferences(env: CommentTranslatorStripeEnv): CommentTranslatorStripeEnvName[] {
  return (["STRIPE_SECRET_KEY", "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID", "NEXT_PUBLIC_SITE_URL"] as const).filter(
    (name) => !readOptionalEnvValue(env, name)
  );
}

function missingPortalEnvReferences(env: CommentTranslatorStripeEnv): CommentTranslatorStripeEnvName[] {
  return (["STRIPE_SECRET_KEY", "NEXT_PUBLIC_SITE_URL"] as const).filter((name) => !readOptionalEnvValue(env, name));
}

function readEnvValue(env: CommentTranslatorStripeEnv, name: CommentTranslatorStripeEnvName) {
  const value = readOptionalEnvValue(env, name);
  if (!value) {
    throw new Error(`Missing required env reference: ${name}`);
  }

  return value;
}

function readOptionalEnvValue(env: CommentTranslatorStripeEnv, name: CommentTranslatorStripeEnvName) {
  const value = env[name]?.trim();
  return value ? value : null;
}

function normalizeBillingUserReference(value: string | null | undefined): CommentTranslatorBillingUserReference | null {
  return typeof value === "string" && /^ctbill_[a-f0-9]{24}$/.test(value) ? (value as CommentTranslatorBillingUserReference) : null;
}

function normalizeSubscriptionStatus(status: string): CommentTranslatorStripeSubscriptionStatus | null {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "unpaid" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "paused"
  ) {
    return status;
  }

  return null;
}

function stringReference(value: string | { id?: string } | null) {
  if (typeof value === "string") {
    return value;
  }

  return value?.id ?? null;
}
