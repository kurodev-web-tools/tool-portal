import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac } from "node:crypto";
import Stripe from "stripe";

import type {
  CommentTranslatorCreatorCanonicalStripeWebhookEvent,
  CommentTranslatorCreatorCheckoutStripeAdapter,
  CommentTranslatorCreatorPortalStripeAdapter,
  CommentTranslatorCreatorStripeWebhookVerifier
} from "./comment-translator-creator-billing-runtime";

const ownerReferenceMetadataKey = "comment_translator_creator_owner_reference";
const ownerReferencePurpose = "comment-translator-creator-owner-v1";
const creatorProductCompatibilityKey = "comment_translator_creator_v1" as const;
const creatorMonthlyPriceCompatibilityKey = "creator_monthly_jpy_980_v1" as const;
const minimumOwnerReferenceSecretUtf8Bytes = 32;
const stripeApiVersion = "2026-05-27.dahlia" as const;

export type CommentTranslatorCreatorStripeAdapterConfiguration = {
  readonly stripeSecretKey: string;
  readonly configuredPriceReference: string;
};

export type CommentTranslatorCreatorOpaqueOwnerReferenceResult =
  | { readonly status: "ready"; readonly ownerReference: string }
  | { readonly status: "unavailable" };

export function createCommentTranslatorCreatorStripeAdapter({
  stripeSecretKey,
  configuredPriceReference
}: CommentTranslatorCreatorStripeAdapterConfiguration): CommentTranslatorCreatorCheckoutStripeAdapter &
  CommentTranslatorCreatorPortalStripeAdapter &
  CommentTranslatorCreatorStripeWebhookVerifier {
  let stripeClient: Stripe | null = null;
  const stripe = () => {
    stripeClient ??= new Stripe(stripeSecretKey, { apiVersion: stripeApiVersion });
    return stripeClient;
  };

  return {
    async createCheckoutSession(request) {
      if (
        request.priceCompatibilityKey !== creatorMonthlyPriceCompatibilityKey ||
        request.stripePriceReference !== configuredPriceReference ||
        !isNonEmptyString(request.ownerReference) ||
        !isNonEmptyString(request.idempotencyKey)
      ) {
        return { status: "unavailable" };
      }
      const expiresAtSeconds = Math.floor(request.expiresAtMs / 1_000);
      if (!Number.isFinite(expiresAtSeconds) || expiresAtSeconds <= Math.floor(Date.now() / 1_000)) {
        return { status: "unavailable" };
      }

      const session = await stripe().checkout.sessions.create(
        {
          mode: "subscription",
          line_items: [{ price: configuredPriceReference, quantity: 1 }],
          success_url: request.successUrl,
          cancel_url: request.cancelUrl,
          expires_at: expiresAtSeconds,
          metadata: {
            [ownerReferenceMetadataKey]: request.ownerReference
          },
          subscription_data: {
            metadata: {
              [ownerReferenceMetadataKey]: request.ownerReference
            }
          }
        },
        { idempotencyKey: request.idempotencyKey }
      );
      return session.url && isNonEmptyString(session.id)
        ? { status: "ready", redirectUrl: session.url, stripeCheckoutSessionReference: session.id }
        : { status: "unavailable" };
    },
    async createPortalSession(request) {
      if (!isNonEmptyString(request.customerReference)) return { status: "unavailable" };
      const session = await stripe().billingPortal.sessions.create({
        customer: request.customerReference,
        return_url: request.returnUrl
      });
      return session.url ? { status: "ready", redirectUrl: session.url } : { status: "unavailable" };
    },
    async constructEvent(rawBody, signature, webhookSecret) {
      const event = await stripe().webhooks.constructEventAsync(rawBody, signature, webhookSecret);
      return normalizeCommentTranslatorCreatorStripeWebhookEvent({ event, configuredPriceReference });
    }
  };
}

export function createCommentTranslatorCreatorOpaqueOwnerReference({
  ownerUserId,
  reservationId,
  secret
}: {
  readonly ownerUserId: string;
  readonly reservationId: string;
  readonly secret: string;
}): CommentTranslatorCreatorOpaqueOwnerReferenceResult {
  if (!isNonEmptyString(ownerUserId) || !isNonEmptyString(reservationId) || !hasStrongOwnerReferenceSecret(secret)) {
    return { status: "unavailable" };
  }
  try {
    const iv = createHmac("sha256", secret)
      .update(`${ownerReferencePurpose}:${reservationId}:${ownerUserId}`)
      .digest()
      .subarray(0, 12);
    const cipher = createCipheriv("aes-256-gcm", createOwnerReferenceKey(secret), iv);
    const plaintext = JSON.stringify({ purpose: ownerReferencePurpose, ownerUserId, reservationId });
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      status: "ready",
      ownerReference: ["v1", iv.toString("base64url"), ciphertext.toString("base64url"), tag.toString("base64url")].join(".")
    };
  } catch {
    return { status: "unavailable" };
  }
}

export function resolveCommentTranslatorCreatorOpaqueOwnerReference({
  ownerReference,
  secret
}: {
  readonly ownerReference: string | null;
  readonly secret: string;
}):
  | { readonly status: "resolved"; readonly ownerUserId: string; readonly reservationId: string }
  | { readonly status: "missing" | "mismatch" | "unavailable" } {
  if (!hasStrongOwnerReferenceSecret(secret)) return { status: "unavailable" };
  if (!isNonEmptyString(ownerReference)) return { status: "missing" };
  const parts = ownerReference.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return { status: "mismatch" };

  try {
    const iv = Buffer.from(parts[1], "base64url");
    const ciphertext = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) return { status: "mismatch" };
    const decipher = createDecipheriv("aes-256-gcm", createOwnerReferenceKey(secret), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plaintext) as { purpose?: unknown; ownerUserId?: unknown; reservationId?: unknown };
    if (
      parsed.purpose !== ownerReferencePurpose ||
      !isNonEmptyString(parsed.ownerUserId) ||
      !isNonEmptyString(parsed.reservationId)
    ) {
      return { status: "mismatch" };
    }
    return { status: "resolved", ownerUserId: parsed.ownerUserId, reservationId: parsed.reservationId };
  } catch {
    return { status: "mismatch" };
  }
}

export function normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event,
  configuredPriceReference
}: {
  readonly event: Stripe.Event;
  readonly configuredPriceReference: string;
}): CommentTranslatorCreatorCanonicalStripeWebhookEvent {
  const eventReference = isNonEmptyString(event.id) ? event.id : null;
  const eventCreatedAtIso = unixSecondsToIso(event.created);
  const object = asRecord(event.data.object);

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
    if (event.api_version !== stripeApiVersion) {
      return createRetryableInvalidWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso });
    }
    const checkoutSessionReference = referenceString(object?.id);
    const ownerReference = readOwnerReference(object);
    if (!eventReference || !eventCreatedAtIso || !checkoutSessionReference || !ownerReference) {
      return createRetryableInvalidWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso });
    }
    return {
      ...createEmptyWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso }),
      checkoutLifecycle: event.type === "checkout.session.completed" ? "completed" : "expired",
      checkoutSessionReference,
      ownerReference
    };
  }
  if (!isSupportedEntitlementEventType(event.type)) {
    return createEmptyWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso });
  }
  if (event.api_version !== stripeApiVersion) {
    return createRetryableInvalidWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso });
  }
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const creatorLine = readCreatorSubscriptionLine({ object, configuredPriceReference });
    if (creatorLine.status === "retryable-invalid") {
      return createRetryableInvalidWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso });
    }
    const customerReference = referenceString(object?.customer);
    const subscriptionReference = referenceString(object?.id);
    const subscriptionStatus = normalizeSubscriptionStatus(object?.status);
    const ownerReference = readOwnerReference(object);
    const creatorPriceRemoved =
      creatorLine.status === "incompatible" &&
      (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") &&
      isNonEmptyString(ownerReference);
    const evidenceDisposition =
      creatorLine.status === "matched"
        ? "exact-creator-price"
        : creatorPriceRemoved
          ? "creator-price-removed"
          : "unrelated";
    if (
      evidenceDisposition !== "unrelated" &&
      (!eventReference ||
        !eventCreatedAtIso ||
        !customerReference ||
        !subscriptionReference ||
        !subscriptionStatus ||
        !ownerReference)
    ) {
      return createRetryableInvalidWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso });
    }
    return {
      type: event.type,
      evidenceDisposition,
      eventReference,
      eventCreatedAtIso,
      customerReference,
      subscriptionReference,
      productCompatibilityKey: creatorLine.status === "matched" ? creatorProductCompatibilityKey : null,
      priceCompatibilityKey: creatorLine.status === "matched" ? creatorMonthlyPriceCompatibilityKey : null,
      subscriptionStatus,
      periodStartIso: creatorLine.status === "matched" ? unixSecondsToIso(creatorLine.periodStart) : null,
      periodEndIso: creatorLine.status === "matched" ? unixSecondsToIso(creatorLine.periodEnd) : null,
      ownerReference,
      normalizationStatus: "ready"
    };
  }
  if (event.type === "invoice.payment_failed") {
    const creatorLine = readCreatorInvoiceLine({ object, configuredPriceReference });
    if (creatorLine.status === "retryable-invalid") {
      return createRetryableInvalidWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso });
    }
    const customerReference = referenceString(object?.customer);
    const subscriptionReference = readInvoiceSubscriptionReference(object);
    const ownerReference = readOwnerReference(object);
    if (
      creatorLine.status === "matched" &&
      (!eventReference || !eventCreatedAtIso || !customerReference || !subscriptionReference || !ownerReference)
    ) {
      return createRetryableInvalidWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso });
    }
    return {
      type: event.type,
      evidenceDisposition: creatorLine.status === "matched" ? "exact-creator-price" : "unrelated",
      eventReference,
      eventCreatedAtIso,
      customerReference,
      subscriptionReference,
      productCompatibilityKey: creatorLine.status === "matched" ? creatorProductCompatibilityKey : null,
      priceCompatibilityKey: creatorLine.status === "matched" ? creatorMonthlyPriceCompatibilityKey : null,
      subscriptionStatus: "past_due",
      periodStartIso: creatorLine.status === "matched" ? unixSecondsToIso(creatorLine.periodStart) : null,
      periodEndIso: creatorLine.status === "matched" ? unixSecondsToIso(creatorLine.periodEnd) : null,
      ownerReference,
      normalizationStatus: "ready"
    };
  }
  return createEmptyWebhookEvent({ type: event.type, eventReference, eventCreatedAtIso });
}

function createEmptyWebhookEvent({
  type,
  eventReference,
  eventCreatedAtIso
}: {
  readonly type: string;
  readonly eventReference: string | null;
  readonly eventCreatedAtIso: string | null;
}): CommentTranslatorCreatorCanonicalStripeWebhookEvent {
  return {
    type,
    evidenceDisposition: "unrelated",
    eventReference,
    eventCreatedAtIso,
    customerReference: null,
    subscriptionReference: null,
    productCompatibilityKey: null,
    priceCompatibilityKey: null,
    subscriptionStatus: null,
    periodStartIso: null,
    periodEndIso: null,
    ownerReference: null,
    checkoutLifecycle: null,
    checkoutSessionReference: null,
    normalizationStatus: "ready"
  };
}

function createRetryableInvalidWebhookEvent({
  type,
  eventReference,
  eventCreatedAtIso
}: {
  readonly type: string;
  readonly eventReference: string | null;
  readonly eventCreatedAtIso: string | null;
}): CommentTranslatorCreatorCanonicalStripeWebhookEvent {
  return {
    ...createEmptyWebhookEvent({ type, eventReference, eventCreatedAtIso }),
    normalizationStatus: "retryable-invalid"
  };
}

type CreatorPriceLine =
  | { readonly status: "matched"; readonly periodStart: unknown; readonly periodEnd: unknown }
  | { readonly status: "incompatible" }
  | { readonly status: "retryable-invalid" };

function readCreatorSubscriptionLine({
  object,
  configuredPriceReference
}: {
  readonly object: Record<string, unknown> | null;
  readonly configuredPriceReference: string;
}): CreatorPriceLine {
  const items = readCompleteStripeList(object?.items);
  if (!items) return { status: "retryable-invalid" };
  const matches = items.filter(
    (item) => referenceString(item.price) === configuredPriceReference
  );
  if (matches.length === 0) return { status: "incompatible" };
  if (matches.length !== 1) return { status: "retryable-invalid" };
  const item = matches[0];
  if (!isOrderedUnixPeriod(item.current_period_start, item.current_period_end)) {
    return { status: "retryable-invalid" };
  }
  return { status: "matched", periodStart: item.current_period_start, periodEnd: item.current_period_end };
}

function readCreatorInvoiceLine({
  object,
  configuredPriceReference
}: {
  readonly object: Record<string, unknown> | null;
  readonly configuredPriceReference: string;
}): CreatorPriceLine {
  const lines = readCompleteStripeList(object?.lines);
  if (!lines) return { status: "retryable-invalid" };
  const matches = lines.filter(
    (line) => readInvoiceLinePriceReference(line) === configuredPriceReference
  );
  if (matches.length === 0) return { status: "incompatible" };
  if (matches.length !== 1) return { status: "retryable-invalid" };
  const period = asRecord(matches[0].period);
  if (!period || !isOrderedUnixPeriod(period.start, period.end)) return { status: "retryable-invalid" };
  return { status: "matched", periodStart: period.start, periodEnd: period.end };
}

function readInvoiceLinePriceReference(line: Record<string, unknown>): string | null {
  return (
    referenceString(asRecord(asRecord(line.pricing)?.price_details)?.price) ??
    referenceString(asRecord(line.pricing)?.price) ??
    referenceString(line.price)
  );
}

function isOrderedUnixPeriod(periodStart: unknown, periodEnd: unknown): boolean {
  return (
    typeof periodStart === "number" &&
    Number.isFinite(periodStart) &&
    typeof periodEnd === "number" &&
    Number.isFinite(periodEnd) &&
    periodEnd > periodStart
  );
}

function readInvoiceSubscriptionReference(object: Record<string, unknown> | null): string | null {
  return (
    referenceString(object?.subscription) ??
    referenceString(asRecord(asRecord(object?.parent)?.subscription_details)?.subscription)
  );
}

function readOwnerReference(object: Record<string, unknown> | null): string | null {
  const metadata = asRecord(object?.metadata);
  const parentMetadata = asRecord(asRecord(asRecord(object?.parent)?.subscription_details)?.metadata);
  return stringValue(metadata?.[ownerReferenceMetadataKey]) ?? stringValue(parentMetadata?.[ownerReferenceMetadataKey]);
}

function normalizeSubscriptionStatus(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isSupportedEntitlementEventType(type: string): boolean {
  return (
    type === "customer.subscription.created" ||
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted" ||
    type === "invoice.payment_failed"
  );
}

function unixSecondsToIso(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1_000).toISOString() : null;
}

function createOwnerReferenceKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function hasStrongOwnerReferenceSecret(secret: string): boolean {
  return (
    isNonEmptyString(secret) &&
    Buffer.byteLength(secret, "utf8") >= minimumOwnerReferenceSecretUtf8Bytes
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readRecordCollection(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) return null;
  const records: Record<string, unknown>[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) return null;
    records.push(record);
  }
  return records;
}

function readCompleteStripeList(value: unknown): Record<string, unknown>[] | null {
  const collection = asRecord(value);
  if (!collection || collection.has_more !== false) return null;
  return readRecordCollection(collection.data);
}

function referenceString(value: unknown): string | null {
  return stringValue(value) ?? stringValue(asRecord(value)?.id);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
