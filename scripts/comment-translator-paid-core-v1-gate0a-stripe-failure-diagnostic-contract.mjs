import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

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

const runtime = loadTsModule("lib/comment-translator-billing-runtime.ts");
const validCheckoutParams = {
  mode: "subscription",
  customerReferenceId: "cus_fixture",
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
};

const originalFetch = globalThis.fetch;

async function assertCheckoutDiagnostic({ responseForPrice, responseForCheckout, fetchError, expected }) {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (fetchError) throw new Error("fixture network failure");
    if (url.endsWith("/v1/prices/price_fixture")) return responseForPrice();
    if (url.endsWith("/v1/checkout/sessions")) return responseForCheckout?.();
    throw new Error("unexpected fixture request");
  };

  try {
    const adapter = runtime.createCommentTranslatorStripeAdapter({ STRIPE_SECRET_KEY: "fixture-secret" });
    await assert.rejects(
      () => adapter.createCheckoutSession(validCheckoutParams),
      (error) => {
        assert.equal(runtime.readCommentTranslatorStripeFailureDiagnostic(error), expected);
        assert.deepEqual(Object.keys(error), [], "diagnostic error exposes no enumerable provider data");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await assertCheckoutDiagnostic({
  responseForPrice: () => new Response("{}", { status: 400 }),
  expected: "stripe-4xx"
});
await assertCheckoutDiagnostic({
  responseForPrice: () => new Response("{}", { status: 500 }),
  expected: "stripe-5xx"
});
await assertCheckoutDiagnostic({
  fetchError: true,
  responseForPrice: () => new Response("{}", { status: 200 }),
  expected: "stripe-network-failed"
});
await assertCheckoutDiagnostic({
  responseForPrice: () => new Response("[]", { status: 200 }),
  expected: "stripe-response-invalid"
});

globalThis.fetch = async (input) => {
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
  if (url.endsWith("/v1/checkout/sessions")) return new Response("{}", { status: 200 });
  throw new Error("unexpected fixture request");
};
try {
  const adapter = runtime.createCommentTranslatorStripeAdapter({ STRIPE_SECRET_KEY: "fixture-secret" });
  const result = await adapter.createCheckoutSession(validCheckoutParams);
  assert.equal(
    runtime.readCommentTranslatorStripeFailureDiagnostic({
      stripeFailureDiagnostic: result.failureDiagnostic
    }),
    "stripe-response-invalid",
    "a 2xx Checkout object missing required fields is classified without throwing raw response data"
  );
} finally {
  globalThis.fetch = originalFetch;
}

const configAdapter = runtime.createCommentTranslatorStripeAdapter({});
await assert.rejects(
  () => configAdapter.createCheckoutSession(validCheckoutParams),
  (error) => runtime.readCommentTranslatorStripeFailureDiagnostic(error) === "stripe-config-invalid"
);

console.log("comment-translator-paid-core-v1 Gate 0-A Stripe failure diagnostic contract checks passed");
