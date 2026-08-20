import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const runtimePath = "lib/comment-translator-billing-runtime.ts";

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
    const relativePath = resolveRelative(request, parent?.filename);
    if (relativePath) return compileTsModule(relativePath);
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

const runtime = loadTsModule(runtimePath);
const adapter = runtime.createCommentTranslatorStripeAdapter({ STRIPE_SECRET_KEY: "fixture-secret" });
const originalFetch = globalThis.fetch;
const checkoutRequests = [];

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
    checkoutRequests.push({ method: init.method, body: String(init.body ?? "") });
    return new Response(JSON.stringify({
      id: "cs_fixture",
      customer: "cus_fixture",
      url: "https://checkout.example.test/session",
      expires_at: 1_800_000_000,
      status: "open"
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  throw new Error("unexpected Stripe fixture request");
};

try {
  await adapter.createCheckoutSession({
    mode: "subscription",
    customerReferenceId: "cus_fixture",
    customerEmail: "fixture@example.com",
    productReferenceId: "prod_fixture",
    priceReferenceId: "price_fixture",
    currency: "usd",
    recurringInterval: "month",
    clientReferenceId: "ct-paid-user-fixture",
    successUrl: "https://example.test/account/billing?billing=checkout-returned",
    cancelUrl: "https://example.test/account/billing?billing=checkout-canceled",
    expiresAtIso: "2027-01-15T00:00:00.000Z",
    idempotencyKey: "ct-paid-idempotency-fixture",
    automaticTax: true,
    billingAddressCollection: "required",
    paymentMethodTypes: ["card"]
  });
} finally {
  globalThis.fetch = originalFetch;
}

assert.equal(checkoutRequests.length, 1, "Checkout Session is requested once");
const checkoutBody = new URLSearchParams(checkoutRequests[0].body);
assert.equal(checkoutBody.get("customer"), "cus_fixture", "Checkout Session keeps the bound Customer ID");
assert.equal(
  checkoutBody.has("customer_email"),
  false,
  "Checkout Session must not send customer_email when customer is supplied"
);

console.log("comment translator paid core v1 Stripe Checkout customer selector contract checks passed");
