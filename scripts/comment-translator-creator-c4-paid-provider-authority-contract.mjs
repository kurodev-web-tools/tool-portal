import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier === "stripe") return { shortCircuit: true, url: "data:text/javascript,export default class Stripe{}" };
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export function createClient(){return {from(){return {}},rpc(){return {data:null,error:null}}}}"
      };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    return nextResolve(specifier, context);
  }
});

const route = await import("../lib/comment-translator-creator-paid-provider-route.ts");
const billing = await import("../lib/comment-translator-billing-runtime.ts");
const entitlementStores = await import("../lib/comment-translator-paid-entitlement-test-store.ts");
const paidUsageStores = await import("../lib/comment-translator-paid-usage-test-store.ts");
const providerPolicy = await import("../lib/comment-translator-provider-policy-runtime.ts");
const fixtures = await import("./comment-translator-creator-c4-contract-fixture.mjs");
const { callerAuthorization, configuredEnv, createAuthority, createProvider, createRequest, createUsage, nowMs } = fixtures;
const fixtureDependencies = { billing, entitlementStores, paidUsageStores };

const strictExtraKey = providerPolicy.parseOpenAITranslationProviderResponse({
  choices: [{ message: { content: JSON.stringify({ translatedText: "translated", detectedSourceLanguage: "en", confidence: 1, extra: true }) } }],
  usage: { total_tokens: 1 }
});
assert.deepEqual(strictExtraKey, { status: "invalid", reason: "invalid-shape" }, "OpenAI output remains strict-structure only");

let paidProviderCalls = 0;
const providers = {
  openAiMini: createProvider("openai-mini", async (request) => {
    paidProviderCalls += 1;
    return {
      type: "translated",
      translatedText: "translated",
      detectedSourceLanguage: "en",
      confidence: 1,
      cacheOutcome: "miss",
      usageHandoff: request.usageHandoff
    };
  }),
  azure: null
};
const authority = await createAuthority(fixtureDependencies);
const expiredAuthority = await createAuthority(fixtureDependencies, {
  evidenceCreatedAtIso: "2026-06-21T00:00:00.000Z",
  currentPeriodEndIso: "2026-07-21T00:00:00.000Z"
});
const billingUserReferenceId = billing.createCommentTranslatorBillingUserReference(callerAuthorization);
assert.ok(billingUserReferenceId);

const unreadableEntitlementStore = {
  async readByBillingUserReference() { throw new Error("simulated C1 read failure"); },
  async readByCustomerReference() { return null; },
  async persistVerifiedBillingEvidence() { return "ignored-stale"; }
};
const missingEntitlementStore = {
  async readByBillingUserReference() { return null; },
  async readByCustomerReference() { return null; },
  async persistVerifiedBillingEvidence() { return "ignored-stale"; }
};
const mismatchedEntitlementStore = {
  async readByBillingUserReference() {
    return {
      billingUserReferenceId: "ctbill_mismatched_private_fixture",
      evidenceSource: "signed-stripe-webhook",
      evidenceEventReferenceId: "private-mismatched-event-fixture",
      evidenceCreatedAtIso: "2026-07-22T05:00:00.000Z",
      evidenceRecordedAtIso: "2026-07-22T05:00:00.000Z",
      updatedAtIso: "2026-07-22T05:00:00.000Z",
      customerReferenceId: "private-mismatched-customer-fixture",
      subscriptionReferenceId: "private-mismatched-subscription-fixture",
      subscriptionStatus: "active",
      billingState: "paid-active",
      currentPeriodEndIso: "2026-08-22T00:00:00.000Z"
    };
  },
  async readByCustomerReference() { return null; },
  async persistVerifiedBillingEvidence() { return "ignored-stale"; }
};
const unreadablePaidUsageStore = {
  status: "ready",
  missingEnvReferences: [],
  store: {
    async readCurrentPeriod() { throw new Error("simulated C3 read failure"); },
    async recordUsage() { return "rejected-missing-counter"; }
  }
};
const stalePaidUsageStore = {
  status: "ready",
  missingEnvReferences: [],
  store: {
    async readCurrentPeriod() {
      return {
        billingUserReferenceId,
        currentPeriodEndIso: "2026-09-22T00:00:00.000Z",
        resetEvidenceCreatedAtIso: "2026-07-22T05:00:00.000Z",
        translatedMessageCount: 0,
        providerInputCharacterCount: 0,
        estimatedCostMicros: 0,
        updatedAtIso: "2026-07-22T05:00:00.000Z"
      };
    },
    async recordUsage() { return "rejected-stale-period"; }
  }
};

const blockedRequests = [
  createRequest(authority, providers, { callerAuthorization: { status: "unauthorized" } }),
  createRequest(authority, providers, { env: { ...configuredEnv, COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "" } }),
  createRequest(authority, providers, { entitlementStore: unreadableEntitlementStore }),
  createRequest(authority, providers, { entitlementStore: missingEntitlementStore }),
  createRequest(authority, providers, { entitlementStore: mismatchedEntitlementStore }),
  createRequest(expiredAuthority, providers),
  createRequest(authority, providers, { paidUsageCounterStore: unreadablePaidUsageStore }),
  createRequest(authority, providers, { paidUsageCounterStore: stalePaidUsageStore }),
  createRequest(authority, providers, {
    paidUsageCounterStore: { status: "unavailable", store: null, missingEnvReferences: [], reason: "trusted-service-role-env-missing" }
  }),
  createRequest(authority, providers, { env: { ...configuredEnv, COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER: "" } }),
  createRequest(authority, providers, { env: { ...configuredEnv, COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER: "browser-selected-provider" } }),
  createRequest(authority, providers, { env: { ...configuredEnv, COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD: "" } }),
  createRequest(authority, providers, { env: { ...configuredEnv, COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO: "0.60" } }),
  createRequest(authority, providers, { usage: { ...createUsage(), globalBudgetAvailable: false } }),
  createRequest(authority, providers, { usage: { ...createUsage(), translationProviderAvailable: false } })
];
for (const request of blockedRequests) {
  const result = await route.executeCommentTranslatorCreatorPaidProviderRoute(request);
  assert.equal(result.status, "paid-provider-unavailable");
  assert.equal(result.providerCallCount, 0);
}

const overBudgetAuthority = await createAuthority(fixtureDependencies);
await overBudgetAuthority.paidUsageCounterStore.store.recordUsage({
  billingUserReferenceId,
  expectedPeriodEndIso: "2026-08-22T00:00:00.000Z",
  usageEventReferenceId: "ctpue_over_budget_fixture",
  occurredAtIso: new Date(nowMs).toISOString(),
  translatedMessageCount: 1,
  providerInputCharacterCount: 1,
  estimatedCostMicros: 22_000_000
});
const overBudget = await route.executeCommentTranslatorCreatorPaidProviderRoute(createRequest(overBudgetAuthority, providers));
assert.equal(overBudget.status, "paid-provider-unavailable");
assert.equal(overBudget.reason, "paid-provider-budget-stop");
assert.equal(overBudget.providerCallCount, 0);
assert.equal(paidProviderCalls, 0, "every unavailable authority/config/budget state fails before paid provider execution");

console.log("comment_translator_creator_c4_paid_provider_authority_contract=pass");
