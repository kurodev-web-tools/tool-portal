import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const storeRelativePath = "lib/comment-translator-paid-entitlement-store.ts";
const lifecycleId = "lifecycle-fixture";
const ownerUserId = "owner-fixture";
const customerBindingId = "customer-binding-fixture";

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
    if (request === "@supabase/supabase-js") return { createClient() { throw new Error("fixture client factory must not run"); } };
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

function createFixtureSupabase({ entitlementResult }) {
  const rpcCalls = [];
  const directReads = [];
  const rows = {
    comment_translator_paid_billing_lifecycles: {
      id: lifecycleId,
      owner_user_id: ownerUserId,
      customer_binding_id: customerBindingId,
      lifecycle_state: "active",
      is_terminal: false,
      payment_failure_started_at: null,
      next_reconcile_at: "2026-08-19T06:00:00.000Z",
      paid_unentitled_operator_disposition: null
    },
    comment_translator_paid_customers: {
      id: customerBindingId,
      owner_user_id: ownerUserId,
      stripe_customer_id: "customer-reference-fixture"
    },
    comment_translator_paid_checkout_holds: {
      id: "hold-fixture",
      owner_user_id: ownerUserId,
      lifecycle_id: lifecycleId,
      checkout_expires_at_target: "2026-08-19T06:31:00.000Z",
      idempotency_key: "idempotency-fixture"
    },
    comment_translator_paid_checkout_session_bindings: {
      id: "session-binding-fixture",
      owner_user_id: ownerUserId,
      lifecycle_id: lifecycleId,
      customer_binding_id: customerBindingId,
      stripe_checkout_session_id: "checkout-session-fixture",
      stripe_customer_id: "customer-reference-fixture",
      stripe_expires_at: "2026-08-19T06:31:00.000Z"
    },
    comment_translator_paid_subscription_bindings: {
      id: "subscription-binding-fixture",
      owner_user_id: ownerUserId,
      lifecycle_id: lifecycleId,
      customer_binding_id: customerBindingId,
      stripe_subscription_id: "subscription-fixture",
      stripe_customer_id: "customer-reference-fixture",
      product_id: "product-fixture",
      price_id: "price-fixture"
    }
  };

  return {
    rpcCalls,
    directReads,
    supabase: {
      async rpc(functionName, params) {
        rpcCalls.push({ functionName, params });
        return typeof entitlementResult === "function" ? entitlementResult() : entitlementResult;
      },
      from(tableName) {
        directReads.push(tableName);
        if (tableName === "comment_translator_paid_entitlements") {
          throw new Error("direct entitlement read must not be attempted");
        }
        const query = {
          select() { return query; },
          eq() { return query; },
          limit() { return query; },
          async maybeSingle() { return { data: rows[tableName] ?? null, error: null }; }
        };
        return query;
      }
    }
  };
}

function activeEntitlementRow(overrides = {}) {
  return {
    id: "entitlement-fixture",
    lifecycle_id: lifecycleId,
    owner_user_id: ownerUserId,
    customer_binding_id: customerBindingId,
    subscription_binding_id: "subscription-binding-fixture",
    product_id: "product-fixture",
    price_id: "price-fixture",
    entitlement_status: "active",
    current_period_start: "2026-08-01T00:00:00.000Z",
    current_period_end: "2026-09-01T00:00:00.000Z",
    cancel_at_period_end: false,
    dispute_state: "investigating",
    payment_failure_started_at: null,
    projected_at: "2026-08-19T06:00:00.000Z",
    updated_at: "2026-08-19T06:00:00.000Z",
    ...overrides
  };
}

const { createCommentTranslatorPaidEntitlementStore } = loadTsModule(storeRelativePath);
const fixture = createFixtureSupabase({
  entitlementResult: { data: [activeEntitlementRow()], error: null }
});
const store = createCommentTranslatorPaidEntitlementStore({ supabase: fixture.supabase });
const unboundReadBillingLifecycle = store.readBillingLifecycle;
const lifecycle = await unboundReadBillingLifecycle({ lifecycleId });

assert.deepEqual(
  fixture.rpcCalls,
  [{
    functionName: "ct_paid_read_entitlement",
    params: { p_owner_user_id: ownerUserId, p_lifecycle_id: lifecycleId }
  }],
  "billing lifecycle read uses the owner- and lifecycle-scoped entitlement RPC"
);
assert.deepEqual(
  fixture.directReads,
  [
    "comment_translator_paid_billing_lifecycles",
    "comment_translator_paid_customers",
    "comment_translator_paid_checkout_holds",
    "comment_translator_paid_checkout_session_bindings",
    "comment_translator_paid_subscription_bindings"
  ],
  "billing lifecycle read keeps direct reads limited to the five ACL-repaired lifecycle tables"
);
assert.equal(lifecycle?.currentPeriodStartIso, "2026-08-01T00:00:00.000Z", "period start maps from RPC entitlement");
assert.equal(lifecycle?.currentPeriodEndIso, "2026-09-01T00:00:00.000Z", "period end maps from RPC entitlement");
assert.equal(lifecycle?.disputeState, "investigating", "dispute state maps from RPC entitlement");
assert.equal(lifecycle?.ownerUserId, ownerUserId, "lifecycle owner remains server-derived");

const zeroResultFixture = createFixtureSupabase({ entitlementResult: { data: [], error: null } });
const zeroResultStore = createCommentTranslatorPaidEntitlementStore({ supabase: zeroResultFixture.supabase });
const zeroResultLifecycle = await zeroResultStore.readBillingLifecycle({ lifecycleId });
assert.equal(zeroResultLifecycle?.currentPeriodStartIso, null, "zero entitlement rows map period start to null");
assert.equal(zeroResultLifecycle?.currentPeriodEndIso, null, "zero entitlement rows map period end to null");
assert.equal(zeroResultLifecycle?.disputeState, "none", "zero entitlement rows map dispute state to none");

const rpcErrorFixture = createFixtureSupabase({
  entitlementResult: { data: null, error: { code: "fixture-error" } }
});
const rpcErrorStore = createCommentTranslatorPaidEntitlementStore({ supabase: rpcErrorFixture.supabase });
await assert.rejects(
  () => rpcErrorStore.readBillingLifecycle({ lifecycleId }),
  (error) => error?.message === "Paid entitlement read failed.",
  "entitlement RPC errors fail closed with a sanitized message"
);

const ownerConflictFixture = createFixtureSupabase({
  entitlementResult: {
    data: [activeEntitlementRow({ owner_user_id: "different-owner-fixture" })],
    error: null
  }
});
const ownerConflictStore = createCommentTranslatorPaidEntitlementStore({ supabase: ownerConflictFixture.supabase });
await assert.rejects(
  () => ownerConflictStore.readBillingLifecycle({ lifecycleId }),
  (error) => error?.message === "Paid billing lifecycle entitlement binding conflict.",
  "RPC result owner mismatches fail closed before lifecycle mapping"
);

console.log("comment-translator-paid-core-v1-gate0a-billing-lifecycle-entitlement-rpc-behavior-contract: PASS");
