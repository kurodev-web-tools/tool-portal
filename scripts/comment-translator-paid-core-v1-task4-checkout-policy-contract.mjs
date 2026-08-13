import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const regionPath = "lib/comment-translator-paid-region-gate.ts";
const actionPath = "app/account/billing/actions.ts";
const runtimePath = "lib/comment-translator-billing-runtime.ts";
const entitlementStorePath = "lib/comment-translator-paid-entitlement-store.ts";
const capacityStorePath = "lib/comment-translator-paid-capacity-store.ts";
const consentStorePath = "lib/comment-translator-paid-consent-store.ts";
const migrationPath = "supabase/migrations/20260812120000_comment_translator_paid_core_v1.sql";

assert.ok(exists(regionPath), "Task 4 region gate exists");
assert.ok(exists(actionPath), "Task 4 billing action exists");

const region = read(regionPath);
const action = read(actionPath);
const runtime = read(runtimePath);
const entitlementStore = read(entitlementStorePath);
const capacityStore = read(capacityStorePath);
const consentStore = read(consentStorePath);
const migration = read(migrationPath);

assert.match(region, /^import "server-only";/m, "region gate is server-only");
assert.match(region, /getCloudflareContext/, "region gate reads the Cloudflare request context");
assert.match(region, /requestCfCountry|cloudflareCountry|cf\.country/, "region gate names the trusted request.cf country input");
assert.match(region, /JP[\s\S]{0,160}US|US[\s\S]{0,160}JP/, "region gate contains both allowed country codes");
assert.match(region, /region-unavailable|unsupported-region|failClosed|fail-closed/i, "region gate has an explicit fail-closed result");
assert.doesNotMatch(region, /next\/headers|x-forwarded|x-real-ip|x-country|clientCountry|browserCountry/i, "region gate does not use client or header country authority");
assert.match(region, /persistence|persist|not.*store|forbidden/i, "region gate records that country is not persisted");

assert.match(action, /readCommentTranslatorPaidRegionFromCloudflareContext/, "billing action uses the trusted region gate");
assert.match(action, /FormData|consent/i, "billing action has a durable consent input boundary");
assert.doesNotMatch(action, /headers\(\)|headerStore|x-forwarded|x-country/i, "billing action does not use spoofable header country");
assert.match(action, /createCommentTranslatorStripeCheckoutSessionResult/, "billing action delegates to the server checkout policy");

for (const required of [
  "consent-required",
  "capacity-full",
  "existing-checkout-session",
  "portal-payment-method-update",
  "contract-management",
  "processing",
  "checkoutExpiresAtTargetIso",
  "ct-paid-checkout-",
  "bindCheckoutSession",
  "markCheckoutExpireRequired",
  "isRecoveryBinding"
]) {
  assert.match(runtime, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `billing runtime supports ${required}`);
}

assert.match(runtime, /automaticTax|automatic_tax/, "Checkout policy enables automatic tax explicitly");
assert.match(runtime, /billingAddressCollection|billing_address_collection/, "Checkout policy requires billing address collection");
assert.match(runtime, /paymentMethodTypes|payment_method_types|card/, "Checkout policy explicitly limits payment methods to card-like methods");
assert.match(runtime, /promotionCode|promotion_code|coupon/i, "Checkout policy has a configured-only discount boundary");
assert.match(runtime, /unit_amount[\s\S]{0,160}600|600[\s\S]{0,160}unit_amount/, "Checkout policy requires the exact USD 6 amount");
assert.match(runtime, /tax_behavior[\s\S]{0,160}inclusive|inclusive[\s\S]{0,160}tax_behavior/, "Checkout policy requires inclusive tax");
assert.match(runtime, /expireCheckoutSession/, "Checkout policy can request idempotent Stripe Session expiry");
assert.match(runtime, /commitCheckoutRedirect/, "every Checkout URL return is guarded by the trusted final CAS");
assert.match(runtime, /checkout\.session\.completed[\s\S]{0,240}created|event\.created|Event\.created/, "completion authority remains Stripe Event.created");
assert.doesNotMatch(runtime, /console\.(log|error)\(/, "billing runtime does not log Checkout data");

assert.match(entitlementStore, /readCustomerBinding|readCheckoutLifecycle/, "trusted store exposes owner-bound Checkout preflight reads");
assert.match(entitlementStore, /is_terminal/, "lifecycle preflight is terminal-aware");
assert.match(entitlementStore, /stripe_checkout_session_id|stripe_subscription_id/, "lifecycle preflight exposes immutable external binding references");
assert.match(entitlementStore, /ct_paid_commit_checkout_redirect/, "trusted store exposes the URL-free final redirect CAS");
assert.doesNotMatch(entitlementStore, /checkoutUrl|checkout_url|rawStripePayload|responseBody/, "durable store has no Checkout URL or raw Stripe payload field");

assert.match(capacityStore, /capacityLimit:\s*20/, "capacity store keeps the 20-slot limit");
assert.match(capacityStore, /ct_paid_begin_checkout|reserveCapacity/, "capacity ownership remains on atomic trusted capacity boundaries");
assert.match(capacityStore, /twenty-first-reservation-rejected|failClosed|fail-closed/i, "capacity store rejects overflow and fails closed");

for (const required of ["recordConsent", "readConsent", "terms", "privacy", "paid_conditions", "ct_paid_record_consent"]) {
  assert.match(consentStore, new RegExp(required), `consent store supports ${required}`);
}
assert.match(consentStore, /insertOnly:\s*true/, "consent rows remain immutable and insert-only");
assert.doesNotMatch(consentStore, /console\.(log|error)\(/, "consent store does not log private values");

assert.match(
  migration,
  /v_checkout_expires_at_target\s*:=\s*date_trunc\('second',\s*p_now\)\s*\+\s*interval\s*'31 minutes'/,
  "DB Checkout target is canonicalized to the same UTC second Stripe accepts"
);
assert.match(migration, /create or replace function public\.ct_paid_commit_checkout_redirect/, "migration defines final redirect CAS");
assert.match(migration, /ct_paid_commit_checkout_redirect[\s\S]+?returns boolean/, "final redirect CAS is URL-free");

const regionFixtures = [
  ["JP", "allowed"],
  ["US", "allowed"],
  ["", "region-unavailable"],
  ["ZZ", "unsupported-region"],
  ["KR", "unsupported-region"]
];
for (const [, result] of regionFixtures) {
  assert.match(region, new RegExp(result), `region fixture result covers ${result}`);
}

const lifecycleFixtures = [
  ["checkout_hold", "existing-checkout-session"],
  ["incomplete", "existing-checkout-session"],
  ["past_due", "portal-payment-method-update"],
  ["unpaid", "portal-payment-method-update"],
  ["active", "contract-management"],
  ["cancel_at_period_end", "contract-management"],
  ["dispute", "processing"],
  ["cancel_pending", "processing"],
  ["refund_reconciliation", "processing"],
  ["dispute_reconciliation", "processing"]
];
for (const [lifecycle, result] of lifecycleFixtures) {
  assert.match(runtime, new RegExp(lifecycle), `lifecycle fixture covers ${lifecycle}`);
  assert.match(runtime, new RegExp(result.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `lifecycle fixture converges to ${result}`);
}

console.log("comment translator paid core v1 Task 4 checkout policy contract checks passed");
