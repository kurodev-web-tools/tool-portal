import "server-only";

import type { CommentTranslatorCreatorEntitlementStore } from "./comment-translator-creator-entitlement-store";

export const commentTranslatorCreatorBillingActivationPolicy = {
  status: "closed"
} as const;

export const commentTranslatorCreatorBillingContract = {
  runtime: "server-only",
  activation: "fixed-closed",
  freePlanAvailability: "permanent",
  checkoutAuthority: "authenticated-allowlisted-server-command-only",
  portalAuthority: "owner-scoped-server-customer-read-only",
  entitlementWriteAuthority: "verified-stripe-webhook-only",
  browserAuthority: "forbidden",
  rawPayloadPersistence: "forbidden",
  containerFallback: "forbidden"
} as const;

const creatorProductCompatibilityKey = "comment_translator_creator_v1" as const;
const creatorMonthlyPriceCompatibilityKey = "creator_monthly_jpy_980_v1" as const;
const creatorCheckoutTtlSeconds = 45 * 60;

export type CommentTranslatorCreatorBillingActivationPolicy =
  | typeof commentTranslatorCreatorBillingActivationPolicy
  | {
      readonly status: "allowed";
      readonly authority: "deterministic-fixture";
    };

export type CommentTranslatorCreatorBillingCaller =
  | {
      readonly status: "allowed";
      readonly caller: {
        readonly status: "authorized";
        readonly ownerUserId: string;
      };
    }
  | {
      readonly status: "unauthenticated";
    }
  | {
      readonly status: "blocked";
      readonly reason: "private-launch-gated" | "auth-unavailable";
    };

export type CommentTranslatorCreatorBillingConfiguration = {
  readonly priceCompatibilityKey: typeof creatorMonthlyPriceCompatibilityKey;
  readonly stripePriceReference: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly portalReturnUrl: string;
};

export type CommentTranslatorCreatorCheckoutReservation = {
  reserveCheckout(request: {
    readonly ownerUserId: string;
    readonly priceCompatibilityKey: typeof creatorMonthlyPriceCompatibilityKey;
  }): Promise<
    | {
        readonly status: "reserved";
        readonly reservationId: string;
        readonly idempotencyKey: string;
        readonly expiresAtMs: number;
      }
    | { readonly status: "duplicate" }
    | { readonly status: "owned" }
    | { readonly status: "unavailable" }
  >;
  finalizeCheckout(request: {
    readonly ownerUserId: string;
    readonly reservationId: string;
    readonly stripeCheckoutSessionReference: string;
  }): Promise<{ readonly status: "finalized" } | { readonly status: "unavailable" }>;
  releaseCheckout(request: {
    readonly ownerUserId: string;
    readonly reservationId: string;
  }): Promise<{ readonly status: "released" } | { readonly status: "unavailable" }>;
};

export type CommentTranslatorCreatorCheckoutOwnerReferenceAuthority = {
  createOwnerReference(request: { readonly ownerUserId: string; readonly reservationId: string }): Promise<
    | { readonly status: "ready"; readonly ownerReference: string }
    | { readonly status: "unavailable" }
  >;
};

export type CommentTranslatorCreatorCheckoutStripeAdapter = {
  createCheckoutSession(request: {
    readonly mode: "subscription";
    readonly priceCompatibilityKey: typeof creatorMonthlyPriceCompatibilityKey;
    readonly stripePriceReference: string;
    readonly successUrl: string;
    readonly cancelUrl: string;
    readonly reservationId: string;
    readonly idempotencyKey: string;
    readonly ownerReference: string;
    readonly expiresAtMs: number;
  }): Promise<
    | { readonly status: "ready"; readonly redirectUrl: string; readonly stripeCheckoutSessionReference: string }
    | { readonly status: "unavailable" }
  >;
};

export type CommentTranslatorCreatorPortalCustomerAuthority = {
  readOwnedCustomerReference(request: { readonly ownerUserId: string }): Promise<
    | { readonly status: "owned"; readonly customerReference: string }
    | { readonly status: "missing" }
    | { readonly status: "mismatch" }
    | { readonly status: "unavailable" }
  >;
};

export type CommentTranslatorCreatorPortalStripeAdapter = {
  createPortalSession(request: {
    readonly customerReference: string;
    readonly returnUrl: string;
  }): Promise<
    | { readonly status: "ready"; readonly redirectUrl: string }
    | { readonly status: "unavailable" }
  >;
};

export type CommentTranslatorCreatorCanonicalStripeWebhookEvent = {
  readonly type: string;
  readonly evidenceDisposition: "exact-creator-price" | "creator-price-removed" | "unrelated";
  readonly eventReference: string | null;
  readonly eventCreatedAtIso: string | null;
  readonly customerReference: string | null;
  readonly subscriptionReference: string | null;
  readonly productCompatibilityKey: string | null;
  readonly priceCompatibilityKey: string | null;
  readonly subscriptionStatus: string | null;
  readonly periodStartIso: string | null;
  readonly periodEndIso: string | null;
  readonly ownerReference: string | null;
  readonly checkoutLifecycle: "completed" | "expired" | null;
  readonly checkoutSessionReference: string | null;
  readonly normalizationStatus?: "ready" | "retryable-invalid";
};

export type CommentTranslatorCreatorStripeWebhookVerifier = {
  constructEvent(
    rawBody: string,
    signature: string,
    webhookSecret: string
  ): Promise<CommentTranslatorCreatorCanonicalStripeWebhookEvent>;
};

export type CommentTranslatorCreatorWebhookOwnerMapping = {
  resolveOwner(request: {
    readonly customerReference: string;
    readonly subscriptionReference: string;
    readonly ownerReference: string | null;
  }): Promise<
    | { readonly status: "resolved"; readonly ownerUserId: string; readonly reservationId: string }
    | { readonly status: "missing" }
    | { readonly status: "mismatch" }
    | { readonly status: "unavailable" }
  >;
};

export type CommentTranslatorCreatorCheckoutLifecycleOwnerMapping = {
  resolveCheckoutOwner(request: { readonly ownerReference: string }): Promise<
    | { readonly status: "resolved"; readonly ownerUserId: string; readonly reservationId: string }
    | { readonly status: "missing" }
    | { readonly status: "mismatch" }
    | { readonly status: "unavailable" }
  >;
};

export type CommentTranslatorCreatorCheckoutCommandDependencies = {
  readonly activationPolicy: CommentTranslatorCreatorBillingActivationPolicy;
  readonly configuration: CommentTranslatorCreatorBillingConfiguration | null;
  readonly ownerReferenceAuthority: CommentTranslatorCreatorCheckoutOwnerReferenceAuthority;
  readonly reservation: CommentTranslatorCreatorCheckoutReservation;
  readonly stripe: CommentTranslatorCreatorCheckoutStripeAdapter;
};

export type CommentTranslatorCreatorPortalCommandDependencies = {
  readonly activationPolicy: CommentTranslatorCreatorBillingActivationPolicy;
  readonly configuration: CommentTranslatorCreatorBillingConfiguration | null;
  readonly customerAuthority: CommentTranslatorCreatorPortalCustomerAuthority;
  readonly stripe: CommentTranslatorCreatorPortalStripeAdapter;
};

export type CommentTranslatorCreatorSignedWebhookDependencies = {
  readonly activationPolicy: CommentTranslatorCreatorBillingActivationPolicy;
  readonly webhookSecret: string | null;
  readonly verifier: CommentTranslatorCreatorStripeWebhookVerifier;
  readonly ownerMapping: CommentTranslatorCreatorWebhookOwnerMapping;
  readonly checkoutLifecycleOwnerMapping: CommentTranslatorCreatorCheckoutLifecycleOwnerMapping;
  readonly entitlementWriter: Pick<CommentTranslatorCreatorEntitlementStore, "applySignedEvidence">;
  readonly checkoutLifecycleWriter: Pick<CommentTranslatorCreatorEntitlementStore, "applySignedCheckoutLifecycle">;
};

export type CommentTranslatorCreatorBillingCommandUnavailableReason =
  | "caller-not-authenticated"
  | "auth-unavailable"
  | "private-launch-gated"
  | "activation-closed"
  | "missing-config"
  | "checkout-in-progress"
  | "billing-already-owned"
  | "reservation-unavailable"
  | "stripe-unavailable"
  | "customer-missing"
  | "customer-ownership-unverified";

export type CommentTranslatorCreatorBillingCommandResult =
  | { readonly status: "redirect-ready"; readonly redirectUrl: string }
  | {
      readonly status: "unavailable";
      readonly reason: CommentTranslatorCreatorBillingCommandUnavailableReason;
      readonly retryable: boolean;
    };

export type CommentTranslatorCreatorSignedWebhookResult =
  | { readonly status: "applied"; readonly entitlement: "active" | "paid-inactive" }
  | { readonly status: "ignored"; readonly reason: "checkout-redirect-not-evidence" | "unsupported-event" | "price-product-incompatible" }
  | {
      readonly status: "rejected";
      readonly reason: "missing-signature" | "missing-config" | "invalid-signature";
      readonly retryable: false;
    }
  | {
      readonly status: "not-applied";
      readonly reason:
        | "activation-closed"
        | "event-normalization-unavailable"
        | "owner-resolution-rejected"
        | "entitlement-write-rejected"
        | "entitlement-write-unavailable";
      readonly retryable: boolean;
    };

export type CommentTranslatorCreatorBillingProductionEnv = Partial<
  Record<
    | "STRIPE_SECRET_KEY"
    | "STRIPE_WEBHOOK_SECRET"
    | "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID"
    | "NEXT_PUBLIC_SITE_URL"
    | "COMMENT_TRANSLATOR_CREATOR_BILLING_OWNER_REFERENCE_SECRET"
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "SUPABASE_SERVICE_ROLE_KEY",
    string | undefined
  >
>;

export function createCommentTranslatorCreatorProductionCheckoutDependencies({
  env = process.env as CommentTranslatorCreatorBillingProductionEnv
}: {
  readonly env?: CommentTranslatorCreatorBillingProductionEnv;
} = {}): CommentTranslatorCreatorCheckoutCommandDependencies {
  const configuration = readCommentTranslatorCreatorBillingConfiguration(env);
  const stripeSecretKey = readEnvironmentReference(env, "STRIPE_SECRET_KEY");
  const ownerReferenceSecret = readEnvironmentReference(env, "COMMENT_TRANSLATOR_CREATOR_BILLING_OWNER_REFERENCE_SECRET");

  return {
    activationPolicy: commentTranslatorCreatorBillingActivationPolicy,
    configuration,
    ownerReferenceAuthority: {
      async createOwnerReference(request) {
        if (!ownerReferenceSecret) return { status: "unavailable" };
        const { createCommentTranslatorCreatorOpaqueOwnerReference } = await import("./comment-translator-creator-billing-stripe-adapter");
        return createCommentTranslatorCreatorOpaqueOwnerReference({
          ownerUserId: request.ownerUserId,
          reservationId: request.reservationId,
          secret: ownerReferenceSecret
        });
      }
    },
    reservation: {
      async reserveCheckout(request) {
        const { createTrustedCommentTranslatorCreatorEntitlementStore } = await import("./comment-translator-creator-entitlement-store");
        const storeFactory = createTrustedCommentTranslatorCreatorEntitlementStore({ env });
        if (storeFactory.status !== "ready") return { status: "unavailable" };
        return storeFactory.store.reserveCheckout({
          ownerUserId: request.ownerUserId,
          priceCompatibilityKey: request.priceCompatibilityKey,
          ttlSeconds: creatorCheckoutTtlSeconds
        });
      },
      async finalizeCheckout(request) {
        const { createTrustedCommentTranslatorCreatorEntitlementStore } = await import("./comment-translator-creator-entitlement-store");
        const storeFactory = createTrustedCommentTranslatorCreatorEntitlementStore({ env });
        if (storeFactory.status !== "ready") return { status: "unavailable" };
        return storeFactory.store.finalizeCheckout(request);
      },
      async releaseCheckout(request) {
        const { createTrustedCommentTranslatorCreatorEntitlementStore } = await import("./comment-translator-creator-entitlement-store");
        const storeFactory = createTrustedCommentTranslatorCreatorEntitlementStore({ env });
        if (storeFactory.status !== "ready") return { status: "unavailable" };
        return storeFactory.store.releaseCheckout(request);
      }
    },
    stripe: {
      async createCheckoutSession(request) {
        if (!stripeSecretKey || !configuration) return { status: "unavailable" };
        const { createCommentTranslatorCreatorStripeAdapter } = await import("./comment-translator-creator-billing-stripe-adapter");
        return createCommentTranslatorCreatorStripeAdapter({
          stripeSecretKey,
          configuredPriceReference: configuration.stripePriceReference
        }).createCheckoutSession(request);
      }
    }
  };
}

export function createCommentTranslatorCreatorProductionPortalDependencies({
  env = process.env as CommentTranslatorCreatorBillingProductionEnv
}: {
  readonly env?: CommentTranslatorCreatorBillingProductionEnv;
} = {}): CommentTranslatorCreatorPortalCommandDependencies {
  const configuration = readCommentTranslatorCreatorBillingConfiguration(env);
  const stripeSecretKey = readEnvironmentReference(env, "STRIPE_SECRET_KEY");

  return {
    activationPolicy: commentTranslatorCreatorBillingActivationPolicy,
    configuration,
    customerAuthority: {
      async readOwnedCustomerReference(request) {
        const { createTrustedCommentTranslatorCreatorEntitlementStore } = await import("./comment-translator-creator-entitlement-store");
        const storeFactory = createTrustedCommentTranslatorCreatorEntitlementStore({ env });
        if (storeFactory.status !== "ready") return { status: "unavailable" };
        const ownership = await storeFactory.store.readBillingOwnership({ ownerUserId: request.ownerUserId });
        if (ownership.status === "ready") {
          return { status: "owned", customerReference: ownership.customerReference };
        }
        return ownership.reason === "missing" ? { status: "missing" } : { status: "unavailable" };
      }
    },
    stripe: {
      async createPortalSession(request) {
        if (!stripeSecretKey || !configuration) return { status: "unavailable" };
        const { createCommentTranslatorCreatorStripeAdapter } = await import("./comment-translator-creator-billing-stripe-adapter");
        return createCommentTranslatorCreatorStripeAdapter({
          stripeSecretKey,
          configuredPriceReference: configuration.stripePriceReference
        }).createPortalSession(request);
      }
    }
  };
}

export function createCommentTranslatorCreatorProductionSignedWebhookDependencies({
  env = process.env as CommentTranslatorCreatorBillingProductionEnv
}: {
  readonly env?: CommentTranslatorCreatorBillingProductionEnv;
} = {}): CommentTranslatorCreatorSignedWebhookDependencies {
  const configuration = readCommentTranslatorCreatorBillingConfiguration(env);
  const stripeSecretKey = readEnvironmentReference(env, "STRIPE_SECRET_KEY");
  const webhookSecret = readEnvironmentReference(env, "STRIPE_WEBHOOK_SECRET");
  const ownerReferenceSecret = readEnvironmentReference(env, "COMMENT_TRANSLATOR_CREATOR_BILLING_OWNER_REFERENCE_SECRET");

  return {
    activationPolicy: commentTranslatorCreatorBillingActivationPolicy,
    webhookSecret: stripeSecretKey && configuration && webhookSecret ? webhookSecret : null,
    verifier: {
      async constructEvent(rawBody, signature, verifiedWebhookSecret) {
        if (!stripeSecretKey || !configuration) throw new Error("unavailable");
        const { createCommentTranslatorCreatorStripeAdapter } = await import("./comment-translator-creator-billing-stripe-adapter");
        return createCommentTranslatorCreatorStripeAdapter({
          stripeSecretKey,
          configuredPriceReference: configuration.stripePriceReference
        }).constructEvent(rawBody, signature, verifiedWebhookSecret);
      }
    },
    ownerMapping: {
      async resolveOwner(request) {
        if (!ownerReferenceSecret) return { status: "unavailable" };
        const { resolveCommentTranslatorCreatorOpaqueOwnerReference } = await import("./comment-translator-creator-billing-stripe-adapter");
        return resolveCommentTranslatorCreatorOpaqueOwnerReference({
          ownerReference: request.ownerReference,
          secret: ownerReferenceSecret
        });
      }
    },
    checkoutLifecycleOwnerMapping: {
      async resolveCheckoutOwner(request) {
        if (!ownerReferenceSecret) return { status: "unavailable" };
        const { resolveCommentTranslatorCreatorOpaqueOwnerReference } = await import("./comment-translator-creator-billing-stripe-adapter");
        return resolveCommentTranslatorCreatorOpaqueOwnerReference({ ownerReference: request.ownerReference, secret: ownerReferenceSecret });
      }
    },
    entitlementWriter: {
      async applySignedEvidence(request) {
        const { createTrustedCommentTranslatorCreatorEntitlementStore } = await import("./comment-translator-creator-entitlement-store");
        const storeFactory = createTrustedCommentTranslatorCreatorEntitlementStore({ env });
        if (storeFactory.status !== "ready") return { status: "rejected", reason: "rpc-unavailable" };
        return storeFactory.store.applySignedEvidence(request);
      }
    },
    checkoutLifecycleWriter: {
      async applySignedCheckoutLifecycle(request) {
        const { createTrustedCommentTranslatorCreatorEntitlementStore } = await import("./comment-translator-creator-entitlement-store");
        const storeFactory = createTrustedCommentTranslatorCreatorEntitlementStore({ env });
        if (storeFactory.status !== "ready") return { status: "rejected", reason: "rpc-unavailable" };
        return storeFactory.store.applySignedCheckoutLifecycle(request);
      }
    }
  };
}

function readCommentTranslatorCreatorBillingConfiguration(
  env: CommentTranslatorCreatorBillingProductionEnv
): CommentTranslatorCreatorBillingConfiguration | null {
  const stripePriceReference = readEnvironmentReference(env, "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID");
  const siteUrl = readEnvironmentReference(env, "NEXT_PUBLIC_SITE_URL");
  if (!stripePriceReference || !siteUrl) return null;

  try {
    const site = new URL(siteUrl);
    if (site.protocol !== "https:") return null;
    const billingUrl = new URL("/account/billing", site.origin);
    return {
      priceCompatibilityKey: creatorMonthlyPriceCompatibilityKey,
      stripePriceReference,
      successUrl: new URL("/account/billing?billing=checkout-returned", site.origin).toString(),
      cancelUrl: new URL("/account/billing?billing=checkout-canceled", site.origin).toString(),
      portalReturnUrl: billingUrl.toString()
    };
  } catch {
    return null;
  }
}

function readEnvironmentReference(
  env: CommentTranslatorCreatorBillingProductionEnv,
  name: keyof CommentTranslatorCreatorBillingProductionEnv
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

export async function createCommentTranslatorCreatorCheckoutCommand({
  caller,
  dependencies
}: {
  readonly caller: CommentTranslatorCreatorBillingCaller;
  readonly dependencies: CommentTranslatorCreatorCheckoutCommandDependencies;
}): Promise<CommentTranslatorCreatorBillingCommandResult> {
  if (caller.status !== "allowed") return createCallerFailure(caller);
  const ownerUserId = caller.caller.ownerUserId;
  if (dependencies.activationPolicy.status === "closed") return unavailable("activation-closed", false);
  if (!isValidConfiguration(dependencies.configuration)) return unavailable("missing-config", false);

  let reservation: Awaited<ReturnType<CommentTranslatorCreatorCheckoutReservation["reserveCheckout"]>>;
  try {
    reservation = await dependencies.reservation.reserveCheckout({
      ownerUserId,
      priceCompatibilityKey: creatorMonthlyPriceCompatibilityKey
    });
  } catch {
    return unavailable("reservation-unavailable", true);
  }
  if (reservation.status === "duplicate") return unavailable("checkout-in-progress", true);
  if (reservation.status === "owned") return unavailable("billing-already-owned", false);
  if (
    reservation.status !== "reserved" ||
    !isNonEmptyString(reservation.reservationId) ||
    !isNonEmptyString(reservation.idempotencyKey) ||
    !isReservationExpiry(reservation.expiresAtMs)
  ) {
    return unavailable("reservation-unavailable", true);
  }

  let ownerReference: Awaited<ReturnType<CommentTranslatorCreatorCheckoutOwnerReferenceAuthority["createOwnerReference"]>>;
  try {
    ownerReference = await dependencies.ownerReferenceAuthority.createOwnerReference({
      ownerUserId,
      reservationId: reservation.reservationId
    });
  } catch {
    await releaseCheckoutReservation(dependencies.reservation, ownerUserId, reservation.reservationId);
    return unavailable("reservation-unavailable", true);
  }
  if (ownerReference.status !== "ready" || !isNonEmptyString(ownerReference.ownerReference)) {
    await releaseCheckoutReservation(dependencies.reservation, ownerUserId, reservation.reservationId);
    return unavailable("reservation-unavailable", true);
  }

  try {
    const session = await dependencies.stripe.createCheckoutSession({
      mode: "subscription",
      priceCompatibilityKey: creatorMonthlyPriceCompatibilityKey,
      stripePriceReference: dependencies.configuration.stripePriceReference,
      successUrl: dependencies.configuration.successUrl,
      cancelUrl: dependencies.configuration.cancelUrl,
      reservationId: reservation.reservationId,
      idempotencyKey: reservation.idempotencyKey,
      ownerReference: ownerReference.ownerReference,
      expiresAtMs: reservation.expiresAtMs
    });
    if (
      session.status !== "ready" ||
      !isNonEmptyString(session.redirectUrl) ||
      !isNonEmptyString(session.stripeCheckoutSessionReference)
    ) return unavailable("stripe-unavailable", true);
    const finalized = await dependencies.reservation.finalizeCheckout({
      ownerUserId,
      reservationId: reservation.reservationId,
      stripeCheckoutSessionReference: session.stripeCheckoutSessionReference
    });
    if (finalized.status !== "finalized") return unavailable("reservation-unavailable", true);
    return { status: "redirect-ready", redirectUrl: session.redirectUrl };
  } catch {
    return unavailable("stripe-unavailable", true);
  }
}

export async function createCommentTranslatorCreatorPortalCommand({
  caller,
  dependencies
}: {
  readonly caller: CommentTranslatorCreatorBillingCaller;
  readonly dependencies: CommentTranslatorCreatorPortalCommandDependencies;
}): Promise<CommentTranslatorCreatorBillingCommandResult> {
  if (caller.status !== "allowed") return createCallerFailure(caller);
  const ownerUserId = caller.caller.ownerUserId;
  if (dependencies.activationPolicy.status === "closed") return unavailable("activation-closed", false);
  if (!isValidConfiguration(dependencies.configuration)) return unavailable("missing-config", false);

  let customerRead: Awaited<ReturnType<CommentTranslatorCreatorPortalCustomerAuthority["readOwnedCustomerReference"]>>;
  try {
    customerRead = await dependencies.customerAuthority.readOwnedCustomerReference({ ownerUserId });
  } catch {
    return unavailable("customer-ownership-unverified", true);
  }
  if (customerRead.status === "missing") return unavailable("customer-missing", false);
  if (customerRead.status !== "owned" || !isNonEmptyString(customerRead.customerReference)) {
    return unavailable("customer-ownership-unverified", customerRead.status === "unavailable");
  }

  try {
    const session = await dependencies.stripe.createPortalSession({
      customerReference: customerRead.customerReference,
      returnUrl: dependencies.configuration.portalReturnUrl
    });
    if (session.status !== "ready" || !isNonEmptyString(session.redirectUrl)) return unavailable("stripe-unavailable", true);
    return { status: "redirect-ready", redirectUrl: session.redirectUrl };
  } catch {
    return unavailable("stripe-unavailable", true);
  }
}

export async function applyCommentTranslatorCreatorSignedWebhookCommand({
  rawBody,
  signature,
  dependencies
}: {
  readonly rawBody: string;
  readonly signature: string | null;
  readonly dependencies: CommentTranslatorCreatorSignedWebhookDependencies;
}): Promise<CommentTranslatorCreatorSignedWebhookResult> {
  if (dependencies.activationPolicy.status === "closed") {
    return { status: "not-applied", reason: "activation-closed", retryable: false };
  }
  if (!isNonEmptyString(signature)) return { status: "rejected", reason: "missing-signature", retryable: false };
  if (!isNonEmptyString(dependencies.webhookSecret)) return { status: "rejected", reason: "missing-config", retryable: false };

  let event: CommentTranslatorCreatorCanonicalStripeWebhookEvent;
  try {
    event = await dependencies.verifier.constructEvent(rawBody, signature, dependencies.webhookSecret);
  } catch {
    return { status: "rejected", reason: "invalid-signature", retryable: false };
  }
  if (event.normalizationStatus === "retryable-invalid") {
    return { status: "not-applied", reason: "event-normalization-unavailable", retryable: true };
  }
  if (isCheckoutLifecycleEvidence(event)) {
    return applyVerifiedCheckoutLifecycle({ event, dependencies });
  }
  if (event.type === "checkout.session.completed") {
    return { status: "ignored", reason: "checkout-redirect-not-evidence" };
  }
  if (!isSupportedEntitlementEvent(event.type)) return { status: "ignored", reason: "unsupported-event" };
  if (isCreatorPriceRemovalEvidence(event)) {
    return applyVerifiedCreatorEvidence({
      event,
      dependencies,
      entitlementStatus: "inactive",
      periodStartIso: null,
      periodEndIso: null
    });
  }
  if (!isExactCreatorEvidence(event)) return { status: "ignored", reason: "price-product-incompatible" };

  return applyVerifiedCreatorEvidence({
    event,
    dependencies,
    entitlementStatus: isActiveCreatorSubscriptionEvent(event) ? "active" : "inactive",
    periodStartIso: event.periodStartIso,
    periodEndIso: event.periodEndIso
  });
}

async function applyVerifiedCheckoutLifecycle({
  event,
  dependencies
}: {
  readonly event: CommentTranslatorCreatorCanonicalStripeWebhookEvent & {
    readonly eventReference: string;
    readonly eventCreatedAtIso: string;
    readonly ownerReference: string;
    readonly checkoutLifecycle: "completed" | "expired";
    readonly checkoutSessionReference: string;
  };
  readonly dependencies: CommentTranslatorCreatorSignedWebhookDependencies;
}): Promise<CommentTranslatorCreatorSignedWebhookResult> {
  let ownerResolution: Awaited<ReturnType<CommentTranslatorCreatorCheckoutLifecycleOwnerMapping["resolveCheckoutOwner"]>>;
  try {
    ownerResolution = await dependencies.checkoutLifecycleOwnerMapping.resolveCheckoutOwner({ ownerReference: event.ownerReference });
  } catch {
    return { status: "not-applied", reason: "owner-resolution-rejected", retryable: true };
  }
  if (
    ownerResolution.status !== "resolved" ||
    !isNonEmptyString(ownerResolution.ownerUserId) ||
    !isNonEmptyString(ownerResolution.reservationId)
  ) {
    return { status: "not-applied", reason: "owner-resolution-rejected", retryable: ownerResolution.status === "unavailable" };
  }

  let writerResult: Awaited<ReturnType<CommentTranslatorCreatorEntitlementStore["applySignedCheckoutLifecycle"]>>;
  try {
    writerResult = await dependencies.checkoutLifecycleWriter.applySignedCheckoutLifecycle({
      ownerUserId: ownerResolution.ownerUserId,
      checkoutReservationId: ownerResolution.reservationId,
      stripeCheckoutSessionReference: event.checkoutSessionReference,
      stripeEventReference: event.eventReference,
      signatureVerified: true,
      lifecycle: event.checkoutLifecycle,
      eventCreatedAtIso: event.eventCreatedAtIso
    });
  } catch {
    return { status: "not-applied", reason: "entitlement-write-unavailable", retryable: true };
  }
  if (writerResult?.status === "rejected" && writerResult.reason === "rpc-unavailable") {
    return { status: "not-applied", reason: "entitlement-write-unavailable", retryable: true };
  }
  if (!writerResult || writerResult.status !== "applied") {
    return { status: "not-applied", reason: "entitlement-write-rejected", retryable: false };
  }
  return { status: "ignored", reason: "checkout-redirect-not-evidence" };
}

async function applyVerifiedCreatorEvidence({
  event,
  dependencies,
  entitlementStatus,
  periodStartIso,
  periodEndIso
}: {
  readonly event: CommentTranslatorCreatorCanonicalStripeWebhookEvent & {
    readonly eventReference: string;
    readonly eventCreatedAtIso: string;
    readonly customerReference: string;
    readonly subscriptionReference: string;
  };
  readonly dependencies: CommentTranslatorCreatorSignedWebhookDependencies;
  readonly entitlementStatus: "active" | "inactive";
  readonly periodStartIso: string | null;
  readonly periodEndIso: string | null;
}): Promise<CommentTranslatorCreatorSignedWebhookResult> {
  let ownerResolution: Awaited<ReturnType<CommentTranslatorCreatorWebhookOwnerMapping["resolveOwner"]>>;
  try {
    ownerResolution = await dependencies.ownerMapping.resolveOwner({
      customerReference: event.customerReference,
      subscriptionReference: event.subscriptionReference,
      ownerReference: event.ownerReference
    });
  } catch {
    return { status: "not-applied", reason: "owner-resolution-rejected", retryable: true };
  }
  if (
    ownerResolution.status !== "resolved" ||
    !isNonEmptyString(ownerResolution.ownerUserId) ||
    !isNonEmptyString(ownerResolution.reservationId)
  ) {
    return { status: "not-applied", reason: "owner-resolution-rejected", retryable: ownerResolution.status === "unavailable" };
  }

  let writerResult: Awaited<ReturnType<CommentTranslatorCreatorEntitlementStore["applySignedEvidence"]>>;
  try {
    writerResult = await dependencies.entitlementWriter.applySignedEvidence({
      ownerUserId: ownerResolution.ownerUserId,
      stripeCustomerReference: event.customerReference,
      stripeSubscriptionReference: event.subscriptionReference,
      stripeEventReference: event.eventReference,
      checkoutReservationId: ownerResolution.reservationId,
      signatureVerified: true,
      planKey: "creator",
      productCompatibilityKey: creatorProductCompatibilityKey,
      priceCompatibilityKey: creatorMonthlyPriceCompatibilityKey,
      status: entitlementStatus,
      periodStartIso,
      periodEndIso,
      eventCreatedAtIso: event.eventCreatedAtIso
    });
  } catch {
    return { status: "not-applied", reason: "entitlement-write-unavailable", retryable: true };
  }
  if (writerResult?.status === "rejected") {
    const retryableReservationPrecondition = writerResult.reason === "reservation-unverified";
    const retryablePriceRemovalPrecondition =
      entitlementStatus === "inactive" &&
      periodStartIso === null &&
      periodEndIso === null &&
      (writerResult.reason === "reservation-binding-required" || writerResult.reason === "periodless-inactive-requires-existing-entitlement");
    if (writerResult.reason === "rpc-unavailable" || retryableReservationPrecondition || retryablePriceRemovalPrecondition) {
      return { status: "not-applied", reason: "entitlement-write-unavailable", retryable: true };
    }
  }
  if (!writerResult || writerResult.status !== "applied") {
    return { status: "not-applied", reason: "entitlement-write-rejected", retryable: false };
  }
  return { status: "applied", entitlement: entitlementStatus === "active" ? "active" : "paid-inactive" };
}

function createCallerFailure(
  caller: Exclude<CommentTranslatorCreatorBillingCaller, { readonly status: "allowed" }>
): Extract<CommentTranslatorCreatorBillingCommandResult, { readonly status: "unavailable" }> {
  if (caller.status === "unauthenticated") return unavailable("caller-not-authenticated", false);
  return unavailable(caller.reason, false);
}

function unavailable(
  reason: CommentTranslatorCreatorBillingCommandUnavailableReason,
  retryable: boolean
): Extract<CommentTranslatorCreatorBillingCommandResult, { readonly status: "unavailable" }> {
  return { status: "unavailable", reason, retryable };
}

function isValidConfiguration(
  configuration: CommentTranslatorCreatorBillingConfiguration | null
): configuration is CommentTranslatorCreatorBillingConfiguration {
  return Boolean(
    configuration &&
      configuration.priceCompatibilityKey === creatorMonthlyPriceCompatibilityKey &&
      isNonEmptyString(configuration.stripePriceReference) &&
      isCanonicalAccountBillingUrl(configuration.successUrl) &&
      isCanonicalAccountBillingUrl(configuration.cancelUrl) &&
      isCanonicalAccountBillingUrl(configuration.portalReturnUrl)
  );
}

function isCanonicalAccountBillingUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.startsWith("/account/billing");
  } catch {
    return false;
  }
}

function isSupportedEntitlementEvent(type: string): boolean {
  return (
    type === "customer.subscription.created" ||
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted" ||
    type === "invoice.payment_failed"
  );
}

function isCheckoutLifecycleEvidence(
  event: CommentTranslatorCreatorCanonicalStripeWebhookEvent
): event is CommentTranslatorCreatorCanonicalStripeWebhookEvent & {
  readonly eventReference: string;
  readonly eventCreatedAtIso: string;
  readonly ownerReference: string;
  readonly checkoutLifecycle: "completed" | "expired";
  readonly checkoutSessionReference: string;
} {
  return Boolean(
    (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") &&
      (event.checkoutLifecycle === "completed" || event.checkoutLifecycle === "expired") &&
      ((event.type === "checkout.session.completed" && event.checkoutLifecycle === "completed") ||
        (event.type === "checkout.session.expired" && event.checkoutLifecycle === "expired")) &&
      isNonEmptyString(event.eventReference) &&
      isTimestamp(event.eventCreatedAtIso) &&
      isNonEmptyString(event.ownerReference) &&
      isNonEmptyString(event.checkoutSessionReference)
  );
}

function isExactCreatorEvidence(
  event: CommentTranslatorCreatorCanonicalStripeWebhookEvent
): event is CommentTranslatorCreatorCanonicalStripeWebhookEvent & {
  readonly eventReference: string;
  readonly eventCreatedAtIso: string;
  readonly customerReference: string;
  readonly subscriptionReference: string;
  readonly productCompatibilityKey: typeof creatorProductCompatibilityKey;
  readonly priceCompatibilityKey: typeof creatorMonthlyPriceCompatibilityKey;
  readonly subscriptionStatus: string;
  readonly periodStartIso: string;
  readonly periodEndIso: string;
} {
  return Boolean(
    event.evidenceDisposition === "exact-creator-price" &&
      event.productCompatibilityKey === creatorProductCompatibilityKey &&
      event.priceCompatibilityKey === creatorMonthlyPriceCompatibilityKey &&
      isNonEmptyString(event.eventReference) &&
      isTimestamp(event.eventCreatedAtIso) &&
      isNonEmptyString(event.customerReference) &&
      isNonEmptyString(event.subscriptionReference) &&
      isNonEmptyString(event.subscriptionStatus) &&
      isOrderedPeriod(event.periodStartIso, event.periodEndIso)
  );
}

function isCreatorPriceRemovalEvidence(
  event: CommentTranslatorCreatorCanonicalStripeWebhookEvent
): event is CommentTranslatorCreatorCanonicalStripeWebhookEvent & {
  readonly eventReference: string;
  readonly eventCreatedAtIso: string;
  readonly customerReference: string;
  readonly subscriptionReference: string;
  readonly subscriptionStatus: string;
  readonly ownerReference: string;
  readonly productCompatibilityKey: null;
  readonly priceCompatibilityKey: null;
  readonly periodStartIso: null;
  readonly periodEndIso: null;
} {
  return Boolean(
    event.evidenceDisposition === "creator-price-removed" &&
      (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") &&
      event.productCompatibilityKey === null &&
      event.priceCompatibilityKey === null &&
      event.periodStartIso === null &&
      event.periodEndIso === null &&
      isNonEmptyString(event.eventReference) &&
      isTimestamp(event.eventCreatedAtIso) &&
      isNonEmptyString(event.customerReference) &&
      isNonEmptyString(event.subscriptionReference) &&
      isNonEmptyString(event.subscriptionStatus) &&
      isNonEmptyString(event.ownerReference)
  );
}

function isActiveCreatorSubscriptionEvent(event: CommentTranslatorCreatorCanonicalStripeWebhookEvent): boolean {
  return (
    (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") &&
    event.subscriptionStatus === "active"
  );
}

function isOrderedPeriod(periodStartIso: string | null, periodEndIso: string | null): boolean {
  if (!isTimestamp(periodStartIso) || !isTimestamp(periodEndIso)) return false;
  return Date.parse(periodEndIso) > Date.parse(periodStartIso);
}

function isTimestamp(value: string | null): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isReservationExpiry(value: number): boolean {
  return Number.isFinite(value) && value > Date.now();
}

async function releaseCheckoutReservation(
  reservation: CommentTranslatorCreatorCheckoutReservation,
  ownerUserId: string,
  reservationId: string
): Promise<void> {
  try {
    await reservation.releaseCheckout({ ownerUserId, reservationId });
  } catch {
    // The durable reservation remains authoritative; release failure must not turn into a redirect.
  }
}
