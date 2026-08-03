import assert from "node:assert/strict";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const runtimePath = "lib/comment-translator-creator-billing-runtime.ts";
const stripeAdapterPath = "lib/comment-translator-creator-billing-stripe-adapter.ts";
const legacyRuntimePath = "lib/comment-translator-billing-runtime.ts";
const entitlementStorePath = "lib/comment-translator-creator-entitlement-store.ts";
const billingReservationsMigrationPath = "supabase/migrations/20260803010000_comment_translator_creator_billing_reservations.sql";
const actionPath = "app/account/billing/actions.ts";
const webhookRoutePath = "app/api/comment-translator/billing/webhook/route.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadRuntime() {
  const source = read(runtimePath);
  const executableSource = stripTypeScriptTypes(source.replace('import "server-only";', ""), {
    mode: "transform"
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(executableSource).toString("base64")}`;
  return import(moduleUrl);
}

function loadStripeAdapterForContract() {
  const source = read(stripeAdapterPath)
    .replace('import "server-only";', "")
    .replace('import Stripe from "stripe";', "const Stripe = class {};");
  const executableSource = stripTypeScriptTypes(source, { mode: "transform" });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(executableSource).toString("base64")}`;
  return import(moduleUrl);
}

assert.ok(fs.existsSync(path.join(root, runtimePath)), "NC-B1 Creator billing command runtime exists");
assert.ok(fs.existsSync(path.join(root, stripeAdapterPath)), "NC-B1 real lazy Stripe adapter exists");
assert.ok(fs.existsSync(path.join(root, entitlementStorePath)), "NC-D1 entitlement writer exists");
assert.ok(
  fs.existsSync(path.join(root, billingReservationsMigrationPath)),
  "NC-B1 durable checkout reservation and binding migration exists"
);

const runtimeSource = read(runtimePath);
const stripeAdapterSource = read(stripeAdapterPath);
const legacyRuntimeSource = read(legacyRuntimePath);
const actionSource = read(actionPath);
const webhookRouteSource = read(webhookRoutePath);
const entitlementStoreSource = read(entitlementStorePath);

assert.match(runtimeSource, /^import "server-only";/m, "Creator billing runtime is server-only");
assert.match(actionSource, /^"use server";/m, "billing actions remain server actions");
assert.match(actionSource, /^import "server-only";/m, "billing actions are server-only");
assert.match(webhookRouteSource, /^import "server-only";/m, "webhook route is server-only");
assert.match(runtimeSource, /creator_monthly_jpy_980_v1/, "exact Creator price compatibility is fixed in the command core");
assert.match(runtimeSource, /comment_translator_creator_v1/, "exact Creator product compatibility is fixed in the command core");
assert.match(runtimeSource, /const\s+commentTranslatorCreatorBillingActivationPolicy\s*=\s*\{\s*status:\s*"closed"/s, "activation is compile-time fixed closed");
assert.doesNotMatch(runtimeSource, /activationPolicy\s*:\s*process\.env|status\s*:\s*process\.env/i, "environment cannot activate billing");
assert.match(
  runtimeSource,
  /if \(caller\.status !== "allowed"\)[\s\S]{0,240}const ownerUserId = caller\.caller\.ownerUserId/,
  "owner access follows an explicit discriminant narrowing"
);
assert.match(runtimeSource, /reserveCheckout/, "Checkout requires a server-owned reservation boundary");
assert.match(runtimeSource, /finalizeCheckout/, "Checkout has an explicit success/finalize transition");
assert.match(runtimeSource, /expiresAtMs/, "Checkout reservation lifecycle is bounded by expiry");
assert.match(runtimeSource, /idempotencyKey/, "Checkout passes a server-owned idempotency key to its Stripe seam");
assert.doesNotMatch(runtimeSource, /new\s+Map\s*\(/, "Creator billing command state has no in-memory authority");
assert.match(runtimeSource, /readOwnedCustomerReference/, "Portal reads only an owner-scoped customer authority");
assert.match(runtimeSource, /constructEvent/, "webhook command verifies signature through an injected verifier");
assert.match(runtimeSource, /applySignedEvidence/, "only canonical webhook flow has the NC-D1 writer seam");
assert.equal(
  (runtimeSource.match(/\.applySignedEvidence\s*\(/g) ?? []).length,
  2,
  "NC-D1 writer is reachable only through the production webhook seam and canonical command bridge"
);
assert.doesNotMatch(legacyRuntimeSource, /paidEntitlementsByBillingUser|new\s+Map\s*\(/, "legacy billing runtime has no in-memory paid authority");
assert.doesNotMatch(
  `${runtimeSource}\n${actionSource}\n${webhookRouteSource}`,
  /localStorage|sessionStorage|indexedDB|console\.(?:log|info|warn|error)|searchParams|URLSearchParams|request\.url/i,
  "NC-B1 has no browser storage, query authority, or private logging"
);
assert.doesNotMatch(
  `${runtimeSource}\n${actionSource}\n${webhookRouteSource}\n${entitlementStoreSource}`,
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|stripeCustomerReference\s*:\s*["'][^"']+|stripeSubscriptionReference\s*:\s*["'][^"']+|stripeEventReference\s*:\s*["'][^"']+/i,
  "NC-B1 source contains no secret or private identifier literal"
);
assert.match(actionSource, /readCommentTranslatorPrivateLaunchAccessForAccountSession/, "actions use the SHA-256 allowlist gate");
assert.match(actionSource, /getAccountSessionState/, "actions derive their caller from account session state");
assert.match(actionSource, /private-launch-gate-direct-call-denials/, "actions rate-limit direct private-launch denials");
assert.match(actionSource, /comment-translator-billing-actions/, "actions rate-limit Checkout and Portal commands");
assert.match(actionSource, /rate-limit-exceeded/, "actions retain sanitized rate-limit redirects");
assert.match(webhookRouteSource, /stripe-signature/, "route reads Stripe signature header");
assert.match(webhookRouteSource, /readCommentTranslatorRequestIp/, "webhook applies abuse request identity before body handling");
assert.match(webhookRouteSource, /assertCommentTranslatorAbuseRequestAllowed/, "webhook restores abuse guard before verifier work");
assert.match(webhookRouteSource, /status:\s*429/, "webhook retains sanitized rate-limit HTTP 429 response");
assert.match(webhookRouteSource, /commentTranslatorCreatorBillingActivationPolicy/, "production webhook route checks the fixed-closed policy");
assert.match(
  webhookRouteSource,
  /retryable\s*\?\s*503\s*:\s*result\.status\s*===\s*"rejected"\s*\?\s*400\s*:\s*200/,
  "retryable webhook failures map to HTTP 503 while invalid signatures remain HTTP 400"
);
assert.match(actionSource, /commentTranslatorCreatorBillingActivationPolicy/, "production actions check the fixed-closed policy");
assert.doesNotMatch(actionSource, /\(\s*(?:formData|input|owner|customer|subscription|price|plan|returnUrl|billingId|idempotencyKey)/, "server actions are zero-input commands");
assert.match(stripeAdapterSource, /^import "server-only";/m, "real Stripe adapter is server-only");
assert.match(stripeAdapterSource, /from "stripe"/, "real Stripe adapter uses the installed Stripe dependency");
assert.match(stripeAdapterSource, /checkout\.sessions\.create/, "real Stripe adapter creates Checkout Sessions");
assert.match(stripeAdapterSource, /billingPortal\.sessions\.create/, "real Stripe adapter creates Portal sessions");
assert.match(stripeAdapterSource, /webhooks\.constructEventAsync/, "real Stripe adapter verifies raw webhook body and signature");
assert.match(stripeAdapterSource, /apiVersion:\s*stripeApiVersion/, "real Stripe adapter pins an explicit Stripe API version");
assert.match(stripeAdapterSource, /idempotencyKey/, "real Stripe adapter forwards server idempotency options");
assert.match(stripeAdapterSource, /expires_at:\s*expiresAtSeconds/, "Checkout Session expiry is server-owned and matches the reservation");
assert.match(stripeAdapterSource, /stripeCheckoutSessionReference/, "Stripe Session reference is returned only to durable finalization");
assert.match(stripeAdapterSource, /comment_translator_creator_owner_reference/, "real Stripe adapter carries a sealed server owner reference only in server-created metadata");
assert.match(
  stripeAdapterSource,
  /function\s+readCreatorSubscriptionLine[\s\S]{0,1800}function\s+readCreatorInvoiceLine/s,
  "subscription and invoice normalize exactly one configured Creator line independently of line ordering"
);
assert.match(stripeAdapterSource, /normalizationStatus:\s*"retryable-invalid"/, "unexpected API versions and malformed matched lines are retryable");
assert.match(stripeAdapterSource, /has_more\s*!==\s*false/, "Stripe List evidence is complete only when has_more is explicitly false");
assert.doesNotMatch(stripeAdapterSource, /createCommentTranslatorCreatorTimeBucketReservation/, "stateless time-bucket reservation authority is removed");
assert.match(
  stripeAdapterSource,
  /hasStrongOwnerReferenceSecret[\s\S]{0,300}Buffer\.byteLength\(secret,\s*"utf8"\)\s*>=\s*minimumOwnerReferenceSecretUtf8Bytes/s,
  "owner-reference secrets require a defensible UTF-8 byte minimum"
);
assert.match(entitlementStoreSource, /readBillingOwnership/, "NC-D1 store exposes an owner-scoped Portal ownership read");
assert.match(entitlementStoreSource, /reserve_comment_translator_creator_checkout/, "NC-D1 exposes the durable Checkout reservation RPC");
assert.match(entitlementStoreSource, /p_checkout_reservation_id/, "NC-D1 signed evidence carries the sealed reservation binding");

const stripeAdapter = await loadStripeAdapterForContract();
const strongFixtureOwnerReferenceSecret = "fixture-owner-reference-secret-with-at-least-32-utf8-bytes";
const weakFixtureOwnerReferenceSecret = "too-short";
const exactOwnerReference = stripeAdapter.createCommentTranslatorCreatorOpaqueOwnerReference({
  ownerUserId: "fixture-owner",
  reservationId: "fixture-reservation",
  secret: strongFixtureOwnerReferenceSecret
});
assert.equal(exactOwnerReference.status, "ready", "strong owner-reference secret seals the owner reference");
const fixtureSealedOwnerReference = exactOwnerReference.ownerReference;
assert.deepEqual(
  stripeAdapter.createCommentTranslatorCreatorOpaqueOwnerReference({
    ownerUserId: "fixture-owner",
    reservationId: "fixture-reservation",
    secret: strongFixtureOwnerReferenceSecret
  }),
  exactOwnerReference,
  "same reservation receives a stable opaque owner reference for Stripe idempotency"
);
assert.deepEqual(
  stripeAdapter.resolveCommentTranslatorCreatorOpaqueOwnerReference({
    ownerReference: fixtureSealedOwnerReference,
    secret: strongFixtureOwnerReferenceSecret
  }),
  { status: "resolved", ownerUserId: "fixture-owner", reservationId: "fixture-reservation" },
  "opaque owner reference resolves both owner and durable reservation binding"
);
assert.deepEqual(
  stripeAdapter.createCommentTranslatorCreatorOpaqueOwnerReference({
    ownerUserId: "fixture-owner",
    reservationId: "fixture-reservation",
    secret: weakFixtureOwnerReferenceSecret
  }),
  { status: "unavailable" },
  "weak owner-reference secret cannot seal metadata"
);
assert.deepEqual(
  stripeAdapter.resolveCommentTranslatorCreatorOpaqueOwnerReference({
    ownerReference: exactOwnerReference.status === "ready" ? exactOwnerReference.ownerReference : null,
    secret: weakFixtureOwnerReferenceSecret
  }),
  { status: "unavailable" },
  "weak owner-reference secret cannot unseal metadata"
);
const exactPriceCanonicalEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-stripe-event",
    type: "customer.subscription.updated",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: {
          data: [
            {
              price: "fixture-price",
              current_period_start: 1_785_000_000,
              current_period_end: 1_787_592_000
            }
          ],
          has_more: false
        },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.deepEqual(
  {
    productCompatibilityKey: exactPriceCanonicalEvent.productCompatibilityKey,
    priceCompatibilityKey: exactPriceCanonicalEvent.priceCompatibilityKey
  },
  {
    productCompatibilityKey: "comment_translator_creator_v1",
    priceCompatibilityKey: "creator_monthly_jpy_980_v1"
  },
  "exact verified Stripe Price preserves distinct product and price compatibility keys"
);
const multiplePriceCanonicalEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-multiple-price-event",
    type: "customer.subscription.updated",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: {
          data: [
            { price: "other-price", current_period_start: 1_700_000_000, current_period_end: 1_700_010_000 },
            { price: "fixture-price", current_period_start: 1_785_000_000, current_period_end: 1_787_592_000 }
          ],
          has_more: false
        },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.deepEqual(
  {
    productCompatibilityKey: multiplePriceCanonicalEvent.productCompatibilityKey,
    priceCompatibilityKey: multiplePriceCanonicalEvent.priceCompatibilityKey
  },
  {
    productCompatibilityKey: "comment_translator_creator_v1",
    priceCompatibilityKey: "creator_monthly_jpy_980_v1"
  },
  "non-Creator first line and proration-like extra line preserve the unique Creator line"
);
assert.equal(
  multiplePriceCanonicalEvent.periodStartIso,
  new Date(1_785_000_000 * 1_000).toISOString(),
  "Creator line period is used rather than the first line period"
);
const incompleteSubscriptionWithoutCreatorEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-incomplete-subscription-without-creator",
    type: "customer.subscription.updated",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: {
          data: [{ price: "other-price", current_period_start: 1_700_000_000, current_period_end: 1_700_010_000 }],
          has_more: true
        },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  incompleteSubscriptionWithoutCreatorEvent.normalizationStatus,
  "retryable-invalid",
  "a truncated subscription List without the Creator Price cannot be safely ignored"
);
const incompleteSubscriptionWithCreatorEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-incomplete-subscription-with-creator",
    type: "customer.subscription.updated",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: {
          data: [{ price: "fixture-price", current_period_start: 1_785_000_000, current_period_end: 1_787_592_000 }],
          has_more: true
        },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  incompleteSubscriptionWithCreatorEvent.normalizationStatus,
  "retryable-invalid",
  "a truncated subscription List with one visible Creator Price cannot prove uniqueness"
);
const missingSubscriptionHasMoreEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-missing-subscription-has-more",
    type: "customer.subscription.updated",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: {
          data: [{ price: "fixture-price", current_period_start: 1_785_000_000, current_period_end: 1_787_592_000 }]
        },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  missingSubscriptionHasMoreEvent.normalizationStatus,
  "retryable-invalid",
  "a subscription List with omitted has_more cannot prove a complete Creator Price scan"
);
const ambiguousPriceCanonicalEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-ambiguous-price-event",
    type: "customer.subscription.updated",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        items: { data: [{ price: "fixture-price" }, { price: "fixture-price" }], has_more: false }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(ambiguousPriceCanonicalEvent.normalizationStatus, "retryable-invalid", "duplicate configured Price is retryable malformed evidence");
const unexpectedApiVersionEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-version-event",
    type: "customer.subscription.deleted",
    created: 1_785_000_000,
    api_version: "unexpected-version",
    data: { object: {} }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(unexpectedApiVersionEvent.normalizationStatus, "retryable-invalid", "unexpected Stripe API version is retryable");
const checkoutVersionMismatchEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-checkout-version-event",
    type: "checkout.session.completed",
    created: 1_785_000_000,
    api_version: "unexpected-version",
    data: { object: {} }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  checkoutVersionMismatchEvent.normalizationStatus,
  "retryable-invalid",
  "Checkout lifecycle evidence requires the pinned Stripe API version"
);
const unsupportedVersionMismatchEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-unsupported-version-event",
    type: "customer.created",
    created: 1_785_000_000,
    api_version: "unexpected-version",
    data: { object: {} }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  unsupportedVersionMismatchEvent.normalizationStatus,
  "ready",
  "unsupported events are a safe ignore before Stripe API-version compatibility"
);
const malformedCreatorSubscriptionCollectionEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-malformed-subscription-collection-event",
    type: "customer.subscription.updated",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: { data: "not-an-array", has_more: false },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  malformedCreatorSubscriptionCollectionEvent.normalizationStatus,
  "retryable-invalid",
  "sealed Creator subscription metadata cannot downgrade malformed item collections to a safe ignore"
);
const malformedCreatorInvoiceCollectionEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-malformed-invoice-collection-event",
    type: "invoice.payment_failed",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        customer: "fixture-customer",
        lines: { data: ["not-a-record"], has_more: false },
        parent: {
          subscription_details: {
            subscription: "fixture-subscription",
            metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
          }
        }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  malformedCreatorInvoiceCollectionEvent.normalizationStatus,
  "retryable-invalid",
  "sealed Creator invoice metadata cannot downgrade malformed line collections to a safe ignore"
);
const invoiceProrationCanonicalEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-invoice-event",
    type: "invoice.payment_failed",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        customer: "fixture-customer",
        lines: {
          data: [
            { price: "other-price", period: { start: 1_700_000_000, end: 1_700_010_000 } },
            { price: "fixture-price", period: { start: 1_785_000_000, end: 1_787_592_000 } }
          ],
          has_more: false
        },
        parent: {
          subscription_details: {
            subscription: "fixture-subscription",
            metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
          }
        }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.deepEqual(
  {
    productCompatibilityKey: invoiceProrationCanonicalEvent.productCompatibilityKey,
    priceCompatibilityKey: invoiceProrationCanonicalEvent.priceCompatibilityKey,
    periodStartIso: invoiceProrationCanonicalEvent.periodStartIso
  },
  {
    productCompatibilityKey: "comment_translator_creator_v1",
    priceCompatibilityKey: "creator_monthly_jpy_980_v1",
    periodStartIso: new Date(1_785_000_000 * 1_000).toISOString()
  },
  "invoice proration uses the uniquely matched Creator line rather than the first line"
);
const incompleteInvoiceWithoutCreatorEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-incomplete-invoice-without-creator",
    type: "invoice.payment_failed",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        customer: "fixture-customer",
        lines: {
          data: [{ price: "other-price", period: { start: 1_700_000_000, end: 1_700_010_000 } }],
          has_more: true
        },
        parent: {
          subscription_details: {
            subscription: "fixture-subscription",
            metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
          }
        }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  incompleteInvoiceWithoutCreatorEvent.normalizationStatus,
  "retryable-invalid",
  "a truncated invoice List without the Creator Price cannot be safely ignored"
);
const incompleteInvoiceWithCreatorEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-incomplete-invoice-with-creator",
    type: "invoice.payment_failed",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        customer: "fixture-customer",
        lines: {
          data: [{ price: "fixture-price", period: { start: 1_785_000_000, end: 1_787_592_000 } }],
          has_more: true
        },
        parent: {
          subscription_details: {
            subscription: "fixture-subscription",
            metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
          }
        }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  incompleteInvoiceWithCreatorEvent.normalizationStatus,
  "retryable-invalid",
  "a truncated invoice List with one visible Creator Price cannot prove uniqueness"
);
const nonBooleanInvoiceHasMoreEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-nonboolean-invoice-has-more",
    type: "invoice.payment_failed",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        customer: "fixture-customer",
        lines: {
          data: [{ price: "fixture-price", period: { start: 1_785_000_000, end: 1_787_592_000 } }],
          has_more: "false"
        },
        parent: {
          subscription_details: {
            subscription: "fixture-subscription",
            metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
          }
        }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  nonBooleanInvoiceHasMoreEvent.normalizationStatus,
  "retryable-invalid",
  "an invoice List with nonboolean has_more cannot prove a complete Creator Price scan"
);
const malformedCreatorInvoiceEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-malformed-invoice-event",
    type: "invoice.payment_failed",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: { object: { lines: { data: [{ price: "fixture-price", period: {} }], has_more: false } } }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(malformedCreatorInvoiceEvent.normalizationStatus, "retryable-invalid", "malformed configured Creator invoice line is retryable");
const missingCreatorEventIdentity = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "",
    type: "customer.subscription.updated",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: {
          data: [{ price: "fixture-price", current_period_start: 1_785_000_000, current_period_end: 1_787_592_000 }],
          has_more: false
        },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  missingCreatorEventIdentity.normalizationStatus,
  "retryable-invalid",
  "a matched Creator line without Stripe event identity is retryable rather than silently ignored"
);
const creatorPriceRemovedUpdatedEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-creator-price-removed-updated",
    type: "customer.subscription.updated",
    created: 1_785_000_000,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: {
          data: [{ price: "other-price", current_period_start: 1_785_000_000, current_period_end: 1_787_592_000 }],
          has_more: false
        },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  creatorPriceRemovedUpdatedEvent.evidenceDisposition,
  "creator-price-removed",
  "a complete bound subscription update with the Creator Price removed has an explicit inactive-only disposition"
);
assert.deepEqual(
  [creatorPriceRemovedUpdatedEvent.productCompatibilityKey, creatorPriceRemovedUpdatedEvent.priceCompatibilityKey, creatorPriceRemovedUpdatedEvent.periodStartIso],
  [null, null, null],
  "Creator Price removal does not fabricate a positive compatibility or period"
);
const creatorPriceRemovedDeletedEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-creator-price-removed-deleted",
    type: "customer.subscription.deleted",
    created: 1_785_000_001,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "canceled",
        items: {
          data: [{ price: "other-price", current_period_start: 1_785_000_000, current_period_end: 1_787_592_000 }],
          has_more: false
        },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(creatorPriceRemovedDeletedEvent.evidenceDisposition, "creator-price-removed");
const creatorPriceMissingOnCreateEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-creator-price-missing-created",
    type: "customer.subscription.created",
    created: 1_785_000_002,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: {
          data: [{ price: "other-price", current_period_start: 1_785_000_000, current_period_end: 1_787_592_000 }],
          has_more: false
        },
        metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.equal(
  creatorPriceMissingOnCreateEvent.evidenceDisposition,
  "unrelated",
  "subscription creation without the Creator Price remains unrelated rather than a removal"
);
const creatorPriceMissingOwnerRemovalEvents = ["customer.subscription.updated", "customer.subscription.deleted"].map((type) =>
  stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
    event: {
      id: `fixture-creator-price-missing-owner-${type}`,
      type,
      created: 1_785_000_003,
      api_version: "2026-05-27.dahlia",
      data: {
        object: {
          id: "fixture-subscription",
          customer: "fixture-customer",
          status: type === "customer.subscription.deleted" ? "canceled" : "active",
          items: {
            data: [{ price: "other-price", current_period_start: 1_785_000_000, current_period_end: 1_787_592_000 }],
            has_more: false
          }
        }
      }
    },
    configuredPriceReference: "fixture-price"
  })
);
for (const event of creatorPriceMissingOwnerRemovalEvents) {
  assert.deepEqual(
    [event.normalizationStatus, event.evidenceDisposition],
    ["ready", "unrelated"],
    "complete subscription updates/deletions without a sealed owner reference remain safe ignores"
  );
}
const creatorPriceTamperedOwnerRemovalEvent = stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
  event: {
    id: "fixture-creator-price-tampered-owner",
    type: "customer.subscription.updated",
    created: 1_785_000_004,
    api_version: "2026-05-27.dahlia",
    data: {
      object: {
        id: "fixture-subscription",
        customer: "fixture-customer",
        status: "active",
        items: {
          data: [{ price: "other-price", current_period_start: 1_785_000_000, current_period_end: 1_787_592_000 }],
          has_more: false
        },
        metadata: { comment_translator_creator_owner_reference: "fixture-tampered-owner-reference" }
      }
    }
  },
  configuredPriceReference: "fixture-price"
});
assert.deepEqual(
  [creatorPriceTamperedOwnerRemovalEvent.normalizationStatus, creatorPriceTamperedOwnerRemovalEvent.evidenceDisposition],
  ["ready", "creator-price-removed"],
  "a nonempty but invalid sealed reference stays on the later owner-resolution fail-closed path"
);
const checkoutLifecycleEvents = [
  ["checkout.session.completed", "completed"],
  ["checkout.session.expired", "expired"]
].map(([type, checkoutLifecycle]) =>
  stripeAdapter.normalizeCommentTranslatorCreatorStripeWebhookEvent({
    event: {
      id: `fixture-${checkoutLifecycle}-event`,
      type,
      created: 1_785_000_010,
      api_version: "2026-05-27.dahlia",
      data: {
        object: {
          id: "fixture-checkout-session",
          metadata: { comment_translator_creator_owner_reference: fixtureSealedOwnerReference }
        }
      }
    },
    configuredPriceReference: "fixture-price"
  })
);
for (const [event, checkoutLifecycle] of checkoutLifecycleEvents.map((event, index) => [event, ["completed", "expired"][index]])) {
  assert.deepEqual(
    [event.normalizationStatus, event.checkoutLifecycle, event.checkoutSessionReference, event.ownerReference],
    ["ready", checkoutLifecycle, "fixture-checkout-session", fixtureSealedOwnerReference],
    "signed Checkout lifecycle evidence carries only the sealed reservation binding and event/session references"
  );
}

const billing = await loadRuntime();

assert.deepEqual(billing.commentTranslatorCreatorBillingActivationPolicy, { status: "closed" });
assert.deepEqual(billing.commentTranslatorCreatorBillingContract, {
  runtime: "server-only",
  activation: "fixed-closed",
  freePlanAvailability: "permanent",
  checkoutAuthority: "authenticated-allowlisted-server-command-only",
  portalAuthority: "owner-scoped-server-customer-read-only",
  entitlementWriteAuthority: "verified-stripe-webhook-only",
  browserAuthority: "forbidden",
  rawPayloadPersistence: "forbidden",
  containerFallback: "forbidden"
});

const caller = { status: "authorized", ownerUserId: "fixture-owner" };
const allowlistedCaller = { status: "allowed", caller };
const blockedCaller = { status: "blocked", reason: "private-launch-gated" };
const activePolicy = { status: "allowed", authority: "deterministic-fixture" };
const configured = {
  priceCompatibilityKey: "creator_monthly_jpy_980_v1",
  stripePriceReference: "fixture-price",
  successUrl: "https://fixture.invalid/account/billing/checkout-complete",
  cancelUrl: "https://fixture.invalid/account/billing/checkout-canceled",
  portalReturnUrl: "https://fixture.invalid/account/billing"
};

let checkoutCalls = 0;
let reservationCalls = 0;
const fixtureCheckoutExpiry = Date.now() + 45 * 60_000;
const checkoutDependencies = {
  activationPolicy: activePolicy,
  configuration: configured,
  ownerReferenceAuthority: {
    async createOwnerReference({ ownerUserId, reservationId }) {
      assert.equal(ownerUserId, "fixture-owner");
      assert.equal(reservationId, "fixture-reservation");
      return { status: "ready", ownerReference: "fixture-sealed-owner-reference" };
    }
  },
  reservation: {
    async reserveCheckout({ ownerUserId, priceCompatibilityKey }) {
      reservationCalls += 1;
      assert.equal(ownerUserId, "fixture-owner");
      assert.equal(priceCompatibilityKey, "creator_monthly_jpy_980_v1");
      return {
        status: "reserved",
        reservationId: "fixture-reservation",
        idempotencyKey: "fixture-idempotency-key",
        expiresAtMs: fixtureCheckoutExpiry
      };
    },
    async finalizeCheckout({ ownerUserId, reservationId, stripeCheckoutSessionReference }) {
      assert.equal(ownerUserId, "fixture-owner");
      assert.equal(reservationId, "fixture-reservation");
      assert.equal(stripeCheckoutSessionReference, "fixture-checkout-session");
      return { status: "finalized" };
    },
    async releaseCheckout() {
      return { status: "released" };
    }
  },
  stripe: {
    async createCheckoutSession(params) {
      checkoutCalls += 1;
      assert.deepEqual(params, {
        mode: "subscription",
        priceCompatibilityKey: "creator_monthly_jpy_980_v1",
        stripePriceReference: "fixture-price",
        successUrl: "https://fixture.invalid/account/billing/checkout-complete",
        cancelUrl: "https://fixture.invalid/account/billing/checkout-canceled",
        reservationId: "fixture-reservation",
        idempotencyKey: "fixture-idempotency-key",
        ownerReference: "fixture-sealed-owner-reference",
        expiresAtMs: fixtureCheckoutExpiry
      });
      return {
        status: "ready",
        redirectUrl: "https://checkout.fixture.invalid/session",
        stripeCheckoutSessionReference: "fixture-checkout-session"
      };
    }
  }
};

assert.deepEqual(
  await billing.createCommentTranslatorCreatorCheckoutCommand({ caller: { status: "unauthenticated" }, dependencies: checkoutDependencies }),
  { status: "unavailable", reason: "caller-not-authenticated", retryable: false },
  "unauthenticated checkout fails before reservation or Stripe"
);
assert.deepEqual(
  await billing.createCommentTranslatorCreatorCheckoutCommand({ caller: blockedCaller, dependencies: checkoutDependencies }),
  { status: "unavailable", reason: "private-launch-gated", retryable: false },
  "non-allowlisted checkout fails before reservation or Stripe"
);
assert.equal(reservationCalls, 0);
assert.equal(checkoutCalls, 0);

assert.deepEqual(
  await billing.createCommentTranslatorCreatorCheckoutCommand({
    caller: allowlistedCaller,
    dependencies: { ...checkoutDependencies, activationPolicy: billing.commentTranslatorCreatorBillingActivationPolicy }
  }),
  { status: "unavailable", reason: "activation-closed", retryable: false },
  "production fixed closure cannot call Stripe"
);
assert.equal(reservationCalls, 0);
assert.equal(checkoutCalls, 0);

assert.deepEqual(
  await billing.createCommentTranslatorCreatorCheckoutCommand({
    caller: allowlistedCaller,
    dependencies: { ...checkoutDependencies, configuration: null }
  }),
  { status: "unavailable", reason: "missing-config", retryable: false },
  "missing configuration fails before reservation or Stripe"
);
assert.equal(reservationCalls, 0);
assert.equal(checkoutCalls, 0);

const duplicateCheckout = await billing.createCommentTranslatorCreatorCheckoutCommand({
  caller: allowlistedCaller,
  dependencies: {
    ...checkoutDependencies,
    reservation: {
      async reserveCheckout() {
        return { status: "duplicate" };
      },
      async finalizeCheckout() {
        return { status: "finalized" };
      },
      async releaseCheckout() {
        return { status: "released" };
      }
    }
  }
});
assert.deepEqual(duplicateCheckout, { status: "unavailable", reason: "checkout-in-progress", retryable: true });
assert.equal(checkoutCalls, 0, "concurrent/duplicate checkout cannot call Stripe");

assert.deepEqual(
  await billing.createCommentTranslatorCreatorCheckoutCommand({
    caller: allowlistedCaller,
    dependencies: {
      ...checkoutDependencies,
      reservation: {
        async reserveCheckout() {
          return { status: "owned" };
        },
        async finalizeCheckout() {
          return { status: "unavailable" };
        },
        async releaseCheckout() {
          return { status: "unavailable" };
        }
      }
    }
  }),
  { status: "unavailable", reason: "billing-already-owned", retryable: false },
  "existing durable billing ownership cannot open another Checkout"
);
assert.equal(checkoutCalls, 0);

const unavailableReservation = await billing.createCommentTranslatorCreatorCheckoutCommand({
  caller: allowlistedCaller,
  dependencies: {
    ...checkoutDependencies,
    reservation: {
      async reserveCheckout() {
        return { status: "unavailable" };
      },
      async finalizeCheckout() {
        return { status: "finalized" };
      },
      async releaseCheckout() {
        return { status: "released" };
      }
    }
  }
});
assert.deepEqual(unavailableReservation, { status: "unavailable", reason: "reservation-unavailable", retryable: true });
assert.equal(checkoutCalls, 0, "unreadable reservation state cannot call Stripe");

let ownerReferenceFailureReleaseCalls = 0;
let ownerReferenceFailureStripeCalls = 0;
let ownerReferenceFailureReservationState = "reserved";
const ownerReferenceFailure = await billing.createCommentTranslatorCreatorCheckoutCommand({
  caller: allowlistedCaller,
  dependencies: {
    ...checkoutDependencies,
    ownerReferenceAuthority: {
      async createOwnerReference() {
        return { status: "unavailable" };
      }
    },
    reservation: {
      async reserveCheckout() {
        return {
          status: "reserved",
          reservationId: "owner-reference-failure-reservation",
          idempotencyKey: "owner-reference-failure-idempotency",
          expiresAtMs: fixtureCheckoutExpiry
        };
      },
      async finalizeCheckout() {
        throw new Error("owner-reference-failure-must-not-finalize");
      },
      async releaseCheckout({ ownerUserId, reservationId }) {
        assert.equal(ownerUserId, "fixture-owner");
        assert.equal(reservationId, "owner-reference-failure-reservation");
        assert.equal(ownerReferenceFailureReservationState, "reserved", "only a pre-Stripe reserved row may be released");
        ownerReferenceFailureReservationState = "released";
        ownerReferenceFailureReleaseCalls += 1;
        return { status: "released" };
      }
    },
    stripe: {
      async createCheckoutSession() {
        ownerReferenceFailureStripeCalls += 1;
        throw new Error("owner-reference-failure-must-not-call-stripe");
      }
    }
  }
});
assert.deepEqual(ownerReferenceFailure, { status: "unavailable", reason: "reservation-unavailable", retryable: true });
assert.equal(ownerReferenceFailureReleaseCalls, 1, "owner-reference failure releases the exact reserved row");
assert.equal(ownerReferenceFailureReservationState, "released");
assert.equal(ownerReferenceFailureStripeCalls, 0, "owner-reference failure releases before any Stripe call");

const checkoutReady = await billing.createCommentTranslatorCreatorCheckoutCommand({ caller: allowlistedCaller, dependencies: checkoutDependencies });
assert.deepEqual(checkoutReady, { status: "redirect-ready", redirectUrl: "https://checkout.fixture.invalid/session" });
assert.equal(reservationCalls, 1);
assert.equal(checkoutCalls, 1);

let durableNowMs = Date.now();
let durableReservationSequence = 0;
const durableReservations = [];
const durableLifecycleEventReferences = new Set();
let durableFinalizeCalls = 0;
let durableReleaseCalls = 0;
let durableCheckoutCalls = 0;
let durableLifecycleEntitlementWrites = 0;

function applyDurableFixtureSignedCheckoutLifecycle({
  ownerUserId,
  reservationId,
  stripeCheckoutSessionReference,
  stripeEventReference,
  lifecycle,
  eventCreatedAtMs
}) {
  const reservation = durableReservations.find(
    (entry) => entry.ownerUserId === ownerUserId && entry.reservationId === reservationId
  );
  if (!reservation) return { status: "rejected", reason: "reservation-unverified" };
  if (
    (lifecycle !== "completed" && lifecycle !== "expired") ||
    !Number.isFinite(eventCreatedAtMs) ||
    !stripeCheckoutSessionReference ||
    !stripeEventReference
  ) {
    return { status: "rejected", reason: "malformed-lifecycle-evidence" };
  }
  if (eventCreatedAtMs < reservation.createdAtMs - 5 * 60_000) {
    return { status: "rejected", reason: "stale-or-replayed-lifecycle" };
  }
  if (
    reservation.lastCheckoutLifecycleEventCreatedAtMs !== null &&
    reservation.lastCheckoutLifecycleEventCreatedAtMs >= eventCreatedAtMs
  ) {
    return { status: "rejected", reason: "stale-or-replayed-lifecycle" };
  }
  if (
    reservation.stripeCheckoutSessionReference !== null &&
    reservation.stripeCheckoutSessionReference !== stripeCheckoutSessionReference
  ) {
    return { status: "rejected", reason: "reservation-session-mismatch" };
  }
  if (reservation.state !== "reserved" && reservation.state !== "session-created") {
    return { status: "rejected", reason: "lifecycle-state-mismatch" };
  }
  if (durableLifecycleEventReferences.has(stripeEventReference)) {
    return { status: "rejected", reason: "replayed-event" };
  }

  durableLifecycleEventReferences.add(stripeEventReference);
  reservation.state = lifecycle === "completed" ? "checkout-completed" : "checkout-expired";
  reservation.stripeCheckoutSessionReference = stripeCheckoutSessionReference;
  reservation.lastCheckoutLifecycleEventCreatedAtMs = eventCreatedAtMs;
  reservation.lastCheckoutLifecycleEventReference = stripeEventReference;
  return { status: "applied" };
}

const durableReservationDependencies = {
  ...checkoutDependencies,
  ownerReferenceAuthority: {
    async createOwnerReference({ reservationId }) {
      return { status: "ready", ownerReference: `sealed-${reservationId}` };
    }
  },
  reservation: {
    async reserveCheckout({ ownerUserId }) {
      if (
        durableReservations.some(
          (reservation) =>
            reservation.ownerUserId === ownerUserId &&
            (reservation.state === "reserved" ||
              reservation.state === "session-created" ||
              reservation.state === "checkout-completed")
        )
      ) {
        return { status: "duplicate" };
      }
      durableReservationSequence += 1;
      const reservation = {
        sequence: durableReservationSequence,
        ownerUserId,
        reservationId: `durable-reservation-${durableReservationSequence}`,
        idempotencyKey: `durable-idempotency-${durableReservationSequence}`,
        expiresAtMs: durableNowMs + 45 * 60_000,
        createdAtMs: durableNowMs,
        state: "reserved",
        stripeCheckoutSessionReference: null,
        lastCheckoutLifecycleEventCreatedAtMs: null,
        lastCheckoutLifecycleEventReference: null
      };
      durableReservations.push(reservation);
      return {
        status: "reserved",
        reservationId: reservation.reservationId,
        idempotencyKey: reservation.idempotencyKey,
        expiresAtMs: reservation.expiresAtMs
      };
    },
    async finalizeCheckout({ ownerUserId, reservationId, stripeCheckoutSessionReference }) {
      assert.equal(ownerUserId, "fixture-owner");
      const reservation = durableReservations.find((entry) => entry.reservationId === reservationId);
      if (reservation?.ownerUserId !== ownerUserId || reservation.state !== "reserved") return { status: "unavailable" };
      durableFinalizeCalls += 1;
      reservation.state = "session-created";
      reservation.stripeCheckoutSessionReference = stripeCheckoutSessionReference;
      return { status: "finalized" };
    },
    async releaseCheckout({ ownerUserId, reservationId }) {
      assert.equal(ownerUserId, "fixture-owner");
      const reservationIndex = durableReservations.findIndex(
        (reservation) =>
          reservation.ownerUserId === ownerUserId &&
          reservation.reservationId === reservationId &&
          reservation.state === "reserved"
      );
      if (reservationIndex >= 0) {
        durableReservations.splice(reservationIndex, 1);
        durableReleaseCalls += 1;
        return { status: "released" };
      }
      return { status: "unavailable" };
    }
  },
  stripe: {
    async createCheckoutSession({ idempotencyKey, reservationId, expiresAtMs }) {
      durableCheckoutCalls += 1;
      const reservation = durableReservations.find((entry) => entry.reservationId === reservationId);
      assert.equal(idempotencyKey, reservation?.idempotencyKey);
      assert.equal(expiresAtMs, reservation?.expiresAtMs);
      return {
        status: "ready",
        redirectUrl: `https://checkout.fixture.invalid/${idempotencyKey}`,
        stripeCheckoutSessionReference: `fixture-session-${reservationId}`
      };
    }
  }
};

const parallelCheckoutResults = await Promise.all([
  billing.createCommentTranslatorCreatorCheckoutCommand({ caller: allowlistedCaller, dependencies: durableReservationDependencies }),
  billing.createCommentTranslatorCreatorCheckoutCommand({ caller: allowlistedCaller, dependencies: durableReservationDependencies })
]);
assert.equal(parallelCheckoutResults.filter((result) => result.status === "redirect-ready").length, 1, "parallel durable reservation creates one Checkout Session");
assert.deepEqual(
  parallelCheckoutResults.find((result) => result.status === "unavailable"),
  { status: "unavailable", reason: "checkout-in-progress", retryable: true },
  "parallel reservation loser cannot call Stripe"
);
assert.equal(durableCheckoutCalls, 1);
assert.equal(durableFinalizeCalls, 1, "successful Stripe creation durably finalizes its private session reference");
const expiredSessionCreatedReservationId = durableReservations[0].reservationId;
const expiredSessionCreatedReference = durableReservations[0].stripeCheckoutSessionReference;
assert.deepEqual(
  await billing.createCommentTranslatorCreatorCheckoutCommand({ caller: allowlistedCaller, dependencies: durableReservationDependencies }),
  { status: "unavailable", reason: "checkout-in-progress", retryable: true },
  "an active Checkout lifecycle blocks a new owner Checkout after finalization"
);
durableNowMs += 46 * 60_000;
const expiredDurableRetry = await billing.createCommentTranslatorCreatorCheckoutCommand({
  caller: allowlistedCaller,
  dependencies: durableReservationDependencies
});
assert.deepEqual(
  expiredDurableRetry,
  { status: "unavailable", reason: "checkout-in-progress", retryable: true },
  "an expired Checkout Session TTL alone cannot permit a fresh durable reservation"
);
assert.equal(durableCheckoutCalls, 1);
assert.equal(durableReservations.length, 1, "an expired session-created reservation remains the active lifecycle record");
assert.equal(
  durableReservations.find((reservation) => reservation.reservationId === expiredSessionCreatedReservationId)?.state,
  "session-created",
  "wall-clock expiry never overwrites the active Stripe Session binding"
);
assert.deepEqual(
  applyDurableFixtureSignedCheckoutLifecycle({
    ownerUserId: "fixture-owner",
    reservationId: expiredSessionCreatedReservationId,
    stripeCheckoutSessionReference: "other-session",
    stripeEventReference: "fixture-lifecycle-session-mismatch",
    lifecycle: "expired",
    eventCreatedAtMs: durableNowMs
  }),
  { status: "rejected", reason: "reservation-session-mismatch" },
  "a signed lifecycle transition must preserve the exact Checkout Session binding"
);
assert.deepEqual(
  applyDurableFixtureSignedCheckoutLifecycle({
    ownerUserId: "other-owner",
    reservationId: expiredSessionCreatedReservationId,
    stripeCheckoutSessionReference: expiredSessionCreatedReference,
    stripeEventReference: "fixture-lifecycle-owner-mismatch",
    lifecycle: "expired",
    eventCreatedAtMs: durableNowMs
  }),
  { status: "rejected", reason: "reservation-unverified" },
  "a signed lifecycle transition must preserve the exact owner and reservation binding"
);
assert.deepEqual(
  applyDurableFixtureSignedCheckoutLifecycle({
    ownerUserId: "fixture-owner",
    reservationId: expiredSessionCreatedReservationId,
    stripeCheckoutSessionReference: expiredSessionCreatedReference,
    stripeEventReference: "fixture-lifecycle-expired-a",
    lifecycle: "expired",
    eventCreatedAtMs: durableNowMs
  }),
  { status: "applied" },
  "only an exact signed expired lifecycle transition can make the historical Checkout terminal"
);
assert.equal(
  durableReservations.find((reservation) => reservation.reservationId === expiredSessionCreatedReservationId)?.state,
  "checkout-expired",
  "the signed expired transition keeps A as historical terminal evidence"
);
assert.deepEqual(
  applyDurableFixtureSignedCheckoutLifecycle({
    ownerUserId: "fixture-owner",
    reservationId: expiredSessionCreatedReservationId,
    stripeCheckoutSessionReference: expiredSessionCreatedReference,
    stripeEventReference: "fixture-lifecycle-stale-a",
    lifecycle: "expired",
    eventCreatedAtMs: durableNowMs
  }),
  { status: "rejected", reason: "stale-or-replayed-lifecycle" },
  "a lifecycle event at the accepted event time cannot replay or replace the terminal transition"
);
const postExpiryCheckout = await billing.createCommentTranslatorCreatorCheckoutCommand({
  caller: allowlistedCaller,
  dependencies: durableReservationDependencies
});
assert.deepEqual(
  postExpiryCheckout,
  {
    status: "redirect-ready",
    redirectUrl: "https://checkout.fixture.invalid/durable-idempotency-2"
  },
  "the exact signed expired transition permits B while retaining historical A"
);
assert.equal(durableReservations.length, 2);
const durableReservationB = durableReservations.find((reservation) => reservation.reservationId !== expiredSessionCreatedReservationId);
assert.equal(durableReservationB?.state, "session-created");
assert.equal(durableCheckoutCalls, 2);
durableReservations.push({
  ownerUserId: "other-owner",
  reservationId: "durable-replay-reservation",
  stripeCheckoutSessionReference: "fixture-replay-session",
  createdAtMs: durableNowMs,
  lastCheckoutLifecycleEventCreatedAtMs: null,
  lastCheckoutLifecycleEventReference: null,
  state: "session-created"
});
assert.deepEqual(
  applyDurableFixtureSignedCheckoutLifecycle({
    ownerUserId: "other-owner",
    reservationId: "durable-replay-reservation",
    stripeCheckoutSessionReference: "fixture-replay-session",
    stripeEventReference: "fixture-lifecycle-expired-a",
    lifecycle: "expired",
    eventCreatedAtMs: durableNowMs + 1
  }),
  { status: "rejected", reason: "replayed-event" },
  "a signed lifecycle event reference cannot be replayed onto another exact reservation binding"
);
assert.deepEqual(
  applyDurableFixtureSignedCheckoutLifecycle({
    ownerUserId: "fixture-owner",
    reservationId: durableReservationB?.reservationId,
    stripeCheckoutSessionReference: durableReservationB?.stripeCheckoutSessionReference,
    stripeEventReference: "fixture-lifecycle-completed-b",
    lifecycle: "completed",
    eventCreatedAtMs: durableNowMs + 2
  }),
  { status: "applied" },
  "a signed completed lifecycle transition is terminal and remains non-entitlement evidence"
);
assert.equal(durableLifecycleEntitlementWrites, 0, "Checkout lifecycle transitions never write a Paid entitlement");
durableNowMs += 46 * 60_000;
assert.deepEqual(
  await billing.createCommentTranslatorCreatorCheckoutCommand({ caller: allowlistedCaller, dependencies: durableReservationDependencies }),
  { status: "unavailable", reason: "checkout-in-progress", retryable: true },
  "a signed completed Checkout remains blocking regardless of wall-clock TTL"
);

const finalizeFailure = await billing.createCommentTranslatorCreatorCheckoutCommand({
  caller: allowlistedCaller,
  dependencies: {
    ...durableReservationDependencies,
    reservation: {
      ...durableReservationDependencies.reservation,
      async reserveCheckout() {
        return {
          status: "reserved",
          reservationId: "finalize-failure-reservation",
          idempotencyKey: "finalize-failure-idempotency",
          expiresAtMs: Date.now() + 45 * 60_000
        };
      },
      async finalizeCheckout() {
        return { status: "unavailable" };
      }
    },
    stripe: {
      async createCheckoutSession() {
        return {
          status: "ready",
          redirectUrl: "https://checkout.fixture.invalid/finalize-failure",
          stripeCheckoutSessionReference: "finalize-failure-session"
        };
      }
    }
  }
});
assert.deepEqual(finalizeFailure, { status: "unavailable", reason: "reservation-unavailable", retryable: true });
assert.equal(durableReleaseCalls, 0, "finalize failure after Stripe leaves the reservation durable and fails closed");

const ambiguousStripeFailure = await billing.createCommentTranslatorCreatorCheckoutCommand({
  caller: allowlistedCaller,
  dependencies: {
    ...durableReservationDependencies,
    reservation: {
      ...durableReservationDependencies.reservation,
      async reserveCheckout() {
        return {
          status: "reserved",
          reservationId: "ambiguous-stripe-reservation",
          idempotencyKey: "ambiguous-stripe-idempotency",
          expiresAtMs: Date.now() + 45 * 60_000
        };
      }
    },
    stripe: { async createCheckoutSession() { return { status: "unavailable" }; } }
  }
});
assert.deepEqual(ambiguousStripeFailure, { status: "unavailable", reason: "stripe-unavailable", retryable: true });
assert.equal(durableReleaseCalls, 0, "ambiguous Stripe response never releases a durable reservation");

let portalCalls = 0;
const portalDependencies = {
  activationPolicy: activePolicy,
  configuration: configured,
  customerAuthority: {
    async readOwnedCustomerReference({ ownerUserId }) {
      assert.equal(ownerUserId, "fixture-owner");
      return { status: "owned", customerReference: "fixture-customer" };
    }
  },
  stripe: {
    async createPortalSession(params) {
      portalCalls += 1;
      assert.deepEqual(params, {
        customerReference: "fixture-customer",
        returnUrl: "https://fixture.invalid/account/billing"
      });
      return { status: "ready", redirectUrl: "https://billing.fixture.invalid/portal" };
    }
  }
};

assert.deepEqual(
  await billing.createCommentTranslatorCreatorPortalCommand({
    caller: allowlistedCaller,
    dependencies: { ...portalDependencies, activationPolicy: billing.commentTranslatorCreatorBillingActivationPolicy }
  }),
  { status: "unavailable", reason: "activation-closed", retryable: false },
  "fixed closure cannot look up or open a Portal"
);
assert.equal(portalCalls, 0);
assert.deepEqual(
  await billing.createCommentTranslatorCreatorPortalCommand({
    caller: allowlistedCaller,
    dependencies: { ...portalDependencies, configuration: null }
  }),
  { status: "unavailable", reason: "missing-config", retryable: false },
  "Portal configuration is server-owned and missing configuration fails closed"
);
assert.equal(portalCalls, 0);
assert.deepEqual(
  await billing.createCommentTranslatorCreatorPortalCommand({
    caller: allowlistedCaller,
    dependencies: {
      ...portalDependencies,
      customerAuthority: { async readOwnedCustomerReference() { return { status: "mismatch" }; } }
    }
  }),
  { status: "unavailable", reason: "customer-ownership-unverified", retryable: false },
  "Portal rejects a customer reference not proven for the caller"
);
assert.equal(portalCalls, 0);
assert.deepEqual(
  await billing.createCommentTranslatorCreatorPortalCommand({ caller: allowlistedCaller, dependencies: portalDependencies }),
  { status: "redirect-ready", redirectUrl: "https://billing.fixture.invalid/portal" },
  "Portal only receives the owner-scoped customer reference"
);
assert.equal(portalCalls, 1);

function validEvent(overrides = {}) {
  return {
    type: "customer.subscription.updated",
    evidenceDisposition: "exact-creator-price",
    eventReference: "fixture-event",
    eventCreatedAtIso: "2026-08-10T00:00:00.000Z",
    customerReference: "fixture-customer",
    subscriptionReference: "fixture-subscription",
    productCompatibilityKey: "comment_translator_creator_v1",
    priceCompatibilityKey: "creator_monthly_jpy_980_v1",
    subscriptionStatus: "active",
    periodStartIso: "2026-08-01T00:00:00.000Z",
    periodEndIso: "2026-09-01T00:00:00.000Z",
    ownerReference: "fixture-sealed-owner-reference",
    ...overrides
  };
}

let writerCalls = 0;
const webhookDependencies = {
  activationPolicy: activePolicy,
  webhookSecret: "fixture-webhook-secret",
  verifier: {
    async constructEvent(rawBody, signature, secret) {
      assert.equal(rawBody, "fixture-raw-body");
      assert.equal(signature, "fixture-signature");
      assert.equal(secret, "fixture-webhook-secret");
      return validEvent();
    }
  },
  ownerMapping: {
    async resolveOwner({ customerReference, subscriptionReference, ownerReference }) {
      assert.equal(customerReference, "fixture-customer");
      assert.equal(subscriptionReference, "fixture-subscription");
      assert.equal(ownerReference, "fixture-sealed-owner-reference");
      return { status: "resolved", ownerUserId: "fixture-owner", reservationId: "fixture-reservation" };
    }
  },
  entitlementWriter: {
    async applySignedEvidence(request) {
      writerCalls += 1;
      assert.deepEqual(request, {
        ownerUserId: "fixture-owner",
        stripeCustomerReference: "fixture-customer",
        stripeSubscriptionReference: "fixture-subscription",
        stripeEventReference: "fixture-event",
        checkoutReservationId: "fixture-reservation",
        signatureVerified: true,
        planKey: "creator",
        productCompatibilityKey: "comment_translator_creator_v1",
        priceCompatibilityKey: "creator_monthly_jpy_980_v1",
        status: "active",
        periodStartIso: "2026-08-01T00:00:00.000Z",
        periodEndIso: "2026-09-01T00:00:00.000Z",
        eventCreatedAtIso: "2026-08-10T00:00:00.000Z"
      });
      return { status: "applied" };
    }
  }
};

const checkoutLifecycleWrites = [];
for (const [event, lifecycle] of checkoutLifecycleEvents.map((event, index) => [event, ["completed", "expired"][index]])) {
  assert.deepEqual(
    await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
      rawBody: "fixture-raw-body",
      signature: "fixture-signature",
      dependencies: {
        ...webhookDependencies,
        verifier: { async constructEvent() { return event; } },
        checkoutLifecycleOwnerMapping: {
          async resolveCheckoutOwner({ ownerReference }) {
            assert.equal(ownerReference, fixtureSealedOwnerReference);
            return { status: "resolved", ownerUserId: "fixture-owner", reservationId: "fixture-reservation" };
          }
        },
        checkoutLifecycleWriter: {
          async applySignedCheckoutLifecycle(request) {
            checkoutLifecycleWrites.push(request);
            return { status: "applied" };
          }
        },
        entitlementWriter: {
          async applySignedEvidence() {
            throw new Error("checkout-lifecycle-must-never-write-entitlement");
          }
        }
      }
    }),
    { status: "ignored", reason: "checkout-redirect-not-evidence" },
    "signed Checkout lifecycle is safe non-Paid evidence"
  );
}
assert.deepEqual(
  checkoutLifecycleWrites.map((request) => [request.lifecycle, request.stripeCheckoutSessionReference]),
  [
    ["completed", "fixture-checkout-session"],
    ["expired", "fixture-checkout-session"]
  ],
  "completed and expired lifecycle transitions reach only the lifecycle writer"
);
for (const [writerResult, expected] of [
  [
    { status: "rejected", reason: "rpc-unavailable" },
    { status: "not-applied", reason: "entitlement-write-unavailable", retryable: true }
  ],
  [
    { status: "rejected", reason: "reservation-session-mismatch" },
    { status: "not-applied", reason: "entitlement-write-rejected", retryable: false }
  ]
]) {
  const result = await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return checkoutLifecycleEvents[0]; } },
      checkoutLifecycleOwnerMapping: {
        async resolveCheckoutOwner() {
          return { status: "resolved", ownerUserId: "fixture-owner", reservationId: "fixture-reservation" };
        }
      },
      checkoutLifecycleWriter: { async applySignedCheckoutLifecycle() { return writerResult; } },
      entitlementWriter: { async applySignedEvidence() { throw new Error("checkout-lifecycle-must-never-write-entitlement"); } }
    }
  });
  assert.deepEqual(result, expected, "Checkout lifecycle writer failures remain fail-closed and use only safe webhook results");
  assert.doesNotMatch(JSON.stringify(result), /reservation-session-mismatch/);
}

assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: null,
    dependencies: webhookDependencies
  }),
  { status: "rejected", reason: "missing-signature", retryable: false },
  "unsigned webhook writes nothing"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return checkoutVersionMismatchEvent; } }
    }
  }),
  { status: "not-applied", reason: "event-normalization-unavailable", retryable: true },
  "actual normalizer retries API-mismatched Checkout lifecycle evidence without treating it as Paid"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return unsupportedVersionMismatchEvent; } }
    }
  }),
  { status: "ignored", reason: "unsupported-event" },
  "actual normalizer keeps API-mismatched unsupported events on the safe 200 ignore path"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return unexpectedApiVersionEvent; } }
    }
  }),
  { status: "not-applied", reason: "event-normalization-unavailable", retryable: true },
  "actual Stripe normalizer invalid API-version result reaches the retryable webhook path"
);
assert.equal(writerCalls, 0);
for (const [label, event] of [
  ["subscription without Creator Price", incompleteSubscriptionWithoutCreatorEvent],
  ["subscription with Creator Price", incompleteSubscriptionWithCreatorEvent],
  ["subscription with omitted has_more", missingSubscriptionHasMoreEvent],
  ["invoice without Creator Price", incompleteInvoiceWithoutCreatorEvent],
  ["invoice with Creator Price", incompleteInvoiceWithCreatorEvent],
  ["invoice with nonboolean has_more", nonBooleanInvoiceHasMoreEvent]
]) {
  assert.deepEqual(
    await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
      rawBody: "fixture-raw-body",
      signature: "fixture-signature",
      dependencies: {
        ...webhookDependencies,
        verifier: { async constructEvent() { return event; } }
      }
    }),
    { status: "not-applied", reason: "event-normalization-unavailable", retryable: true },
    `${label} on a truncated Stripe List reaches the retryable webhook path without writing NC-D1`
  );
  assert.equal(writerCalls, 0);
}
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return validEvent({ normalizationStatus: "retryable-invalid" }); } }
    }
  }),
  { status: "not-applied", reason: "event-normalization-unavailable", retryable: true },
  "malformed matched Stripe evidence is retryable and cannot write NC-D1"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      ownerMapping: { async resolveOwner() { return { status: "unavailable" }; } }
    }
  }),
  { status: "not-applied", reason: "owner-resolution-rejected", retryable: true },
  "unavailable owner mapping is fail-closed and retryable"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: { ...webhookDependencies, webhookSecret: null }
  }),
  { status: "rejected", reason: "missing-config", retryable: false },
  "missing webhook configuration writes nothing"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { throw new Error("fixture-invalid-signature"); } }
    }
  }),
  { status: "rejected", reason: "invalid-signature", retryable: false },
  "malformed or invalidly signed webhook writes nothing"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return validEvent({ type: "checkout.session.completed" }); } }
    }
  }),
  { status: "ignored", reason: "checkout-redirect-not-evidence" },
  "Checkout completion/redirect is never entitlement evidence"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return validEvent({ type: "unrelated.event" }); } }
    }
  }),
  { status: "ignored", reason: "unsupported-event" },
  "unknown event writes nothing"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return validEvent({ priceCompatibilityKey: "wrong-price" }); } }
    }
  }),
  { status: "ignored", reason: "price-product-incompatible" },
  "noncanonical product or price writes nothing"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return validEvent({ productCompatibilityKey: "wrong-product" }); } }
    }
  }),
  { status: "ignored", reason: "price-product-incompatible" },
  "noncanonical product writes nothing"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return validEvent({ eventReference: null }); } }
    }
  }),
  { status: "ignored", reason: "price-product-incompatible" },
  "malformed canonical event writes nothing"
);
assert.equal(writerCalls, 0);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      ownerMapping: { async resolveOwner() { return { status: "mismatch" }; } }
    }
  }),
  { status: "not-applied", reason: "owner-resolution-rejected", retryable: false },
  "owner mapping mismatch writes nothing"
);
assert.equal(writerCalls, 0);

const appliedWebhook = await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
  rawBody: "fixture-raw-body",
  signature: "fixture-signature",
  dependencies: webhookDependencies
});
assert.deepEqual(appliedWebhook, { status: "applied", entitlement: "active" });
assert.equal(writerCalls, 1, "only verified canonical evidence reaches NC-D1");
assert.doesNotMatch(JSON.stringify(appliedWebhook), /fixture-(?:owner|customer|subscription|event|webhook-secret|raw-body)/, "webhook result is sanitized");

const retainedPeriod = {
  start: exactPriceCanonicalEvent.periodStartIso,
  end: exactPriceCanonicalEvent.periodEndIso
};
const removalWrites = [];
const priceRemovalDependencies = {
  ...webhookDependencies,
  ownerMapping: {
    async resolveOwner({ customerReference, subscriptionReference, ownerReference }) {
      assert.equal(customerReference, "fixture-customer");
      assert.equal(subscriptionReference, "fixture-subscription");
      assert.equal(ownerReference, fixtureSealedOwnerReference, "price removal still requires the sealed owner reference");
      return { status: "resolved", ownerUserId: "fixture-owner", reservationId: "fixture-reservation" };
    }
  },
  entitlementWriter: {
    async applySignedEvidence(request) {
      removalWrites.push(request);
      if (request.status === "active") {
        assert.deepEqual([request.periodStartIso, request.periodEndIso], [retainedPeriod.start, retainedPeriod.end]);
      } else {
        assert.deepEqual(
          [request.periodStartIso, request.periodEndIso],
          [null, null],
          "Creator Price removal sends no invented period; NC-D1 preserves the existing bound period"
        );
      }
      return { status: "applied" };
    }
  }
};
for (const event of [exactPriceCanonicalEvent, creatorPriceRemovedUpdatedEvent, creatorPriceRemovedDeletedEvent]) {
  assert.deepEqual(
    await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
      rawBody: "fixture-raw-body",
      signature: "fixture-signature",
      dependencies: {
        ...priceRemovalDependencies,
        verifier: { async constructEvent() { return event; } }
      }
    }),
    { status: "applied", entitlement: event.evidenceDisposition === "exact-creator-price" ? "active" : "paid-inactive" },
    "the exact bound Creator subscription can become inactive when the complete update or deletion removes its configured Price"
  );
}
assert.deepEqual(
  removalWrites.map((request) => [request.status, request.periodStartIso, request.periodEndIso]),
  [
    ["active", retainedPeriod.start, retainedPeriod.end],
    ["inactive", null, null],
    ["inactive", null, null]
  ],
  "same bound update/deletion remains an inactive-only signed path with period preservation delegated to NC-D1"
);

assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...priceRemovalDependencies,
      verifier: { async constructEvent() { return creatorPriceMissingOnCreateEvent; } }
    }
  }),
  { status: "ignored", reason: "price-product-incompatible" },
  "subscription creation without the configured Creator Price remains a signed no-op"
);
assert.equal(removalWrites.length, 3, "unrelated signed evidence cannot reach NC-D1");

for (const event of creatorPriceMissingOwnerRemovalEvents) {
  const before = writerCalls;
  assert.deepEqual(
    await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
      rawBody: "fixture-raw-body",
      signature: "fixture-signature",
      dependencies: {
        ...webhookDependencies,
        verifier: { async constructEvent() { return event; } }
      }
    }),
    { status: "ignored", reason: "price-product-incompatible" },
    "actual normalizer ownerless price removal does not enter the retryable webhook path"
  );
  assert.equal(writerCalls, before, "ownerless price removal cannot reach NC-D1");
}
let tamperedOwnerWriterCalls = 0;
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return creatorPriceTamperedOwnerRemovalEvent; } },
      ownerMapping: { async resolveOwner() { return { status: "mismatch" }; } },
      entitlementWriter: {
        async applySignedEvidence() {
          tamperedOwnerWriterCalls += 1;
          return { status: "applied" };
        }
      }
    }
  }),
  { status: "not-applied", reason: "owner-resolution-rejected", retryable: false },
  "tampered owner evidence remains fail-closed after normalization"
);
assert.equal(tamperedOwnerWriterCalls, 0, "tampered owner evidence cannot reach NC-D1");

assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...priceRemovalDependencies,
      verifier: { async constructEvent() { return creatorPriceRemovedUpdatedEvent; } },
      entitlementWriter: {
        async applySignedEvidence() {
          return { status: "rejected", reason: "reservation-binding-mismatch" };
        }
      }
    }
  }),
  { status: "not-applied", reason: "entitlement-write-rejected", retryable: false },
  "a removal bound to a different reservation, customer, or subscription cannot deactivate another entitlement"
);

const outOfOrderEntitlement = { status: null, periodStartIso: null, periodEndIso: null };
const outOfOrderPreconditionReasons = [
  "reservation-binding-required",
  "periodless-inactive-requires-existing-entitlement"
];
const outOfOrderDependencies = {
  ...priceRemovalDependencies,
  entitlementWriter: {
    async applySignedEvidence(request) {
      if (request.status === "inactive" && outOfOrderEntitlement.status === null) {
        const reason = outOfOrderPreconditionReasons.shift();
        assert.ok(reason, "the deterministic writer has a bounded precondition failure");
        return { status: "rejected", reason };
      }
      if (request.status === "active") {
        outOfOrderEntitlement.status = "active";
        outOfOrderEntitlement.periodStartIso = request.periodStartIso;
        outOfOrderEntitlement.periodEndIso = request.periodEndIso;
        return { status: "applied" };
      }
      assert.deepEqual(
        [request.periodStartIso, request.periodEndIso],
        [null, null],
        "a replayed price removal remains periodless after the exact active evidence exists"
      );
      assert.equal(outOfOrderEntitlement.status, "active", "only the exact active evidence establishes the deterministic entitlement");
      outOfOrderEntitlement.status = "inactive";
      return { status: "applied" };
    }
  }
};
for (const reason of ["reservation binding", "missing entitlement"]) {
  const result = await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...outOfOrderDependencies,
      verifier: { async constructEvent() { return creatorPriceRemovedUpdatedEvent; } }
    }
  });
  assert.deepEqual(
    result,
    { status: "not-applied", reason: "entitlement-write-unavailable", retryable: true },
    `${reason} precondition retry never exposes an RPC reason or becomes a generic 200 rejection`
  );
  assert.doesNotMatch(JSON.stringify(result), /reservation-binding-required|periodless-inactive-requires-existing-entitlement/);
}
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...outOfOrderDependencies,
      verifier: { async constructEvent() { return exactPriceCanonicalEvent; } }
    }
  }),
  { status: "applied", entitlement: "active" },
  "the later exact active evidence establishes the entitlement after the safe precondition retries"
);
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...outOfOrderDependencies,
      verifier: { async constructEvent() { return creatorPriceRemovedUpdatedEvent; } }
    }
  }),
  { status: "applied", entitlement: "paid-inactive" },
  "the retried removal applies only after its exact active entitlement exists"
);
assert.deepEqual(outOfOrderEntitlement, {
  status: "inactive",
  periodStartIso: retainedPeriod.start,
  periodEndIso: retainedPeriod.end
});

let subscriptionBeforeFinalizeReservationState = "reserved";
let subscriptionBeforeFinalizeEntitlementWrites = 0;
const subscriptionBeforeFinalizeEvent = validEvent({ eventReference: "fixture-subscription-before-finalize" });
const subscriptionBeforeFinalizeDependencies = {
  ...webhookDependencies,
  verifier: { async constructEvent() { return subscriptionBeforeFinalizeEvent; } },
  entitlementWriter: {
    async applySignedEvidence(request) {
      assert.equal(request.status, "active");
      if (subscriptionBeforeFinalizeReservationState === "reserved") {
        return { status: "rejected", reason: "reservation-unverified" };
      }
      assert.ok(
        subscriptionBeforeFinalizeReservationState === "session-created" ||
          subscriptionBeforeFinalizeReservationState === "checkout-completed",
        "only a finalized or completed reservation can receive active entitlement evidence"
      );
      subscriptionBeforeFinalizeEntitlementWrites += 1;
      return { status: "applied" };
    }
  }
};
const subscriptionBeforeFinalize = await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
  rawBody: "fixture-raw-body",
  signature: "fixture-signature",
  dependencies: subscriptionBeforeFinalizeDependencies
});
assert.deepEqual(
  subscriptionBeforeFinalize,
  { status: "not-applied", reason: "entitlement-write-unavailable", retryable: true },
  "an exact active subscription before reservation finalization is a safe retry, never a lost 200"
);
assert.doesNotMatch(JSON.stringify(subscriptionBeforeFinalize), /reservation-unverified/);
assert.equal(subscriptionBeforeFinalizeEntitlementWrites, 0, "unverified reservation evidence never writes an entitlement");
subscriptionBeforeFinalizeReservationState = "session-created";
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: subscriptionBeforeFinalizeDependencies
  }),
  { status: "applied", entitlement: "active" },
  "the same exact active subscription applies after its reservation becomes session-created/completed"
);
assert.equal(subscriptionBeforeFinalizeEntitlementWrites, 1);
subscriptionBeforeFinalizeReservationState = "checkout-completed";
assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...subscriptionBeforeFinalizeDependencies,
      verifier: {
        async constructEvent() {
          return validEvent({ eventReference: "fixture-subscription-after-checkout-completed" });
        }
      }
    }
  }),
  { status: "applied", entitlement: "active" },
  "a later exact active subscription remains applicable after Checkout completion"
);
assert.equal(subscriptionBeforeFinalizeEntitlementWrites, 2);

for (const [label, event] of [
  ["trial", validEvent({ subscriptionStatus: "trialing" })],
  ["past-due", validEvent({ subscriptionStatus: "past_due" })],
  ["canceled", validEvent({ type: "customer.subscription.deleted", subscriptionStatus: "canceled" })],
  ["payment-failed", validEvent({ type: "invoice.payment_failed", subscriptionStatus: "past_due" })]
]) {
  const before = writerCalls;
  const result = await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      verifier: { async constructEvent() { return event; } },
      entitlementWriter: {
        async applySignedEvidence(request) {
          writerCalls += 1;
          assert.equal(request.status, "inactive", `${label} can only request inactive entitlement`);
          return { status: "applied" };
        }
      }
    }
  });
  assert.deepEqual(result, { status: "applied", entitlement: "paid-inactive" }, `${label} remains Free/paid-inactive`);
  assert.equal(writerCalls, before + 1);
}

for (const writerResult of [
  { status: "rejected", reason: "replay" },
  { status: "rejected", reason: "stale-event" },
  { status: "rejected", reason: "out-of-order" },
  { status: "rejected", reason: "period-regression" },
  { status: "rejected", reason: "owner-mismatch" },
  { status: "rejected", reason: "reservation-binding-mismatch" },
  { status: "rejected", reason: "price-product-incompatible" },
  { status: "malformed" }
]) {
  const result = await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      entitlementWriter: { async applySignedEvidence() { return writerResult; } }
    }
  });
  assert.deepEqual(result, { status: "not-applied", reason: "entitlement-write-rejected", retryable: false }, "writer rejection is never fresh activation");
}

assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      entitlementWriter: { async applySignedEvidence() { return { status: "rejected", reason: "rpc-unavailable" }; } }
    }
  }),
  { status: "not-applied", reason: "entitlement-write-unavailable", retryable: true },
  "NC-D1 rpc unavailability is fail-closed and retryable"
);

assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: {
      ...webhookDependencies,
      entitlementWriter: { async applySignedEvidence() { throw new Error("fixture-writer-unavailable"); } }
    }
  }),
  { status: "not-applied", reason: "entitlement-write-unavailable", retryable: true },
  "writer unavailability cannot activate entitlement"
);

assert.deepEqual(
  await billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-raw-body",
    signature: "fixture-signature",
    dependencies: { ...webhookDependencies, activationPolicy: billing.commentTranslatorCreatorBillingActivationPolicy }
  }),
  { status: "not-applied", reason: "activation-closed", retryable: false },
  "production fixed closure cannot verify live Stripe or write NC-D1"
);

process.stdout.write("comment translator Creator NC-B1 billing contract passed\n");
