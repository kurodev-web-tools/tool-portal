import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const runtimePath = "lib/comment-translator-billing-runtime.ts";
const reconcilerPath = "lib/comment-translator-paid-control-plane-reconciler.ts";
const billingShellPath = "components/account/AccountBillingShell.tsx";

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function resolveRelative(request, parentFilename) {
    if (request.startsWith("@/")) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.join(root, `${request.slice(2)}${extension}`);
        if (fs.existsSync(candidate)) return candidate;
      }
      return null;
    }
    if (!request.startsWith(".") || !parentFilename) return null;
    for (const extension of [".ts", ".tsx"]) {
      const candidate = path.resolve(path.dirname(parentFilename), `${request}${extension}`);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) return moduleCache.get(normalizedModulePath).exports;

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;
    const testModule = new Module(normalizedModulePath);
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") return {};
    const relativeModulePath = resolveRelative(request, parent?.filename);
    if (relativeModulePath) return compileTsModule(relativeModulePath);
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `source section starts with ${startMarker}`);
  assert.notEqual(end, -1, `source section ends with ${endMarker}`);
  return source.slice(start, end);
}

function assertMinimizedCheckoutPolicy(source, label) {
  assert.match(source, /automaticTax:\s*true/, `${label} keeps Stripe Tax automatic tax enabled`);
  assert.match(source, /billingAddressCollection:\s*"auto"/, `${label} minimizes billing address collection`);
  assert.match(source, /customerUpdateAddress:\s*"auto"/, `${label} lets Checkout update the existing Customer address`);
}

const runtimeSource = fs.readFileSync(path.join(root, runtimePath), "utf8");
const reconcilerSource = fs.readFileSync(path.join(root, reconcilerPath), "utf8");
const billingShellSource = fs.readFileSync(path.join(root, billingShellPath), "utf8");

assert.match(
  runtimeSource,
  /billingAddressCollection:\s*"auto";[\s\S]{0,120}customerUpdateAddress:\s*"auto";/,
  "Checkout params require the exact minimized billing and Customer update policy"
);

assertMinimizedCheckoutPolicy(
  sourceSection(
    runtimeSource,
    "export async function createCommentTranslatorStripeCheckoutSessionResult",
    "function readCommentTranslatorPaidCheckoutConfig"
  ),
  "initial Checkout"
);
assertMinimizedCheckoutPolicy(
  sourceSection(
    runtimeSource,
    "async function convergeExistingPaidBillingLifecycle",
    "export type CommentTranslatorStripeWebhookProjectionResult"
  ),
  "browser existing-hold recovery"
);
assertMinimizedCheckoutPolicy(
  sourceSection(
    reconcilerSource,
    "export function createCommentTranslatorPaidUnboundCheckoutSessionRecovery",
    "export function createCommentTranslatorPaidControlPlaneInvocation"
  ),
  "maintenance unbound recovery"
);

const runtime = loadTsModule(runtimePath);
const adapter = runtime.createCommentTranslatorStripeAdapter({ STRIPE_SECRET_KEY: "fixture-secret" });
const validCheckoutParams = {
  mode: "subscription",
  customerReferenceId: "cus_fixture",
  productReferenceId: "prod_fixture",
  priceReferenceId: "price_fixture",
  currency: "usd",
  recurringInterval: "month",
  clientReferenceId: "ctbill_fixture",
  successUrl: "https://example.test/account/billing?billing=checkout-returned",
  cancelUrl: "https://example.test/account/billing?billing=checkout-canceled",
  expiresAtIso: "2027-01-15T00:00:00.000Z",
  idempotencyKey: "ct-paid-idempotency-fixture",
  automaticTax: true,
  billingAddressCollection: "auto",
  customerUpdateAddress: "auto",
  paymentMethodTypes: ["card"]
};

for (const invalidParams of [
  { ...validCheckoutParams, billingAddressCollection: "required" },
  { ...validCheckoutParams, billingAddressCollection: undefined },
  { ...validCheckoutParams, customerUpdateAddress: "never" },
  { ...validCheckoutParams, customerUpdateAddress: undefined }
]) {
  await assert.rejects(
    () => adapter.createCheckoutSession(invalidParams),
    (error) => runtime.readCommentTranslatorStripeFailureDiagnostic(error) === "stripe-config-invalid",
    "Stripe adapter fails closed unless both address policy fields are exact"
  );
}

const originalFetch = globalThis.fetch;
let checkoutForm = null;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  if (url.endsWith("/v1/prices/price_fixture")) {
    return new Response(JSON.stringify({
      id: "price_fixture",
      currency: "usd",
      unit_amount: 600,
      tax_behavior: "inclusive",
      recurring: { interval: "month" },
      product: "prod_fixture"
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (url.endsWith("/v1/checkout/sessions")) {
    checkoutForm = new URLSearchParams(String(init.body ?? ""));
    return new Response(JSON.stringify({
      id: "cs_fixture",
      customer: "cus_fixture",
      url: "https://checkout.example.test/session",
      expires_at: Date.parse(validCheckoutParams.expiresAtIso) / 1000,
      status: "open"
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  throw new Error("unexpected Stripe fixture request");
};

try {
  await adapter.createCheckoutSession(validCheckoutParams);
} finally {
  globalThis.fetch = originalFetch;
}

assert.ok(checkoutForm, "Stripe Checkout form is captured");
assert.equal(checkoutForm.get("automatic_tax[enabled]"), "true");
assert.equal(checkoutForm.get("billing_address_collection"), "auto");
assert.equal(checkoutForm.get("customer_update[address]"), "auto");
for (const forbiddenPrefix of ["shipping_address_collection", "phone_number_collection", "tax_id_collection"]) {
  assert.equal(
    [...checkoutForm.keys()].some((key) => key === forbiddenPrefix || key.startsWith(`${forbiddenPrefix}[`)),
    false,
    `Stripe Checkout form sends no ${forbiddenPrefix}`
  );
}

assert.match(
  billingShellSource,
  /Stripe[^\n]{0,240}国[^\n]{0,120}郵便番号[^\n]{0,240}国・地域・決済方法[^\n]{0,240}Stripe Customer[^\n]{0,240}完全な請求先住所[^\n]{0,80}保持しません/,
  "Japanese UI discloses variable Stripe billing collection and the app retention boundary"
);
assert.match(
  billingShellSource,
  /Stripe[^\n]{0,240}country[^\n]{0,120}postal code[^\n]{0,240}country, region, and payment method[^\n]{0,240}Stripe Customer[^\n]{0,240}does not retain[^\n]{0,80}complete billing address/i,
  "English UI discloses variable Stripe billing collection and the app retention boundary"
);

console.log("comment translator paid core v1 Gate 0-A tax-location minimization contract checks passed");
