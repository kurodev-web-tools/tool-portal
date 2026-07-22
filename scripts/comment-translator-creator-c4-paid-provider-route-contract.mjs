import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export{}" };
    }
    if (specifier === "stripe") {
      return { shortCircuit: true, url: "data:text/javascript,export default class Stripe{}" };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export function createClient(){return {from(){return {}},rpc(){return {data:null,error:null}}}}"
      };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) {
        return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
    return nextResolve(specifier, context);
  }
});

const route = await import("../lib/comment-translator-creator-paid-provider-route.ts");
const billing = await import("../lib/comment-translator-billing-runtime.ts");
const entitlementStores = await import("../lib/comment-translator-paid-entitlement-test-store.ts");
const paidUsageStores = await import("../lib/comment-translator-paid-usage-test-store.ts");
const fixtures = await import("./comment-translator-creator-c4-contract-fixture.mjs");
const { callerAuthorization, configuredEnv, createAuthority, createProvider, createRequest, nowMs, ownerUserId } = fixtures;
const fixtureDependencies = { billing, entitlementStores, paidUsageStores };

assert.equal(route.commentTranslatorCreatorPaidProviderRouteContract.implementationStage, "creator-closed-beta-c4-paid-provider-route");
assert.equal(route.commentTranslatorCreatorPaidProviderRouteContract.runtime, "server-only");

const authority = await createAuthority(fixtureDependencies);
let openAiCalls = 0;
let azureCalls = 0;
const successProviders = {
  openAiMini: createProvider("openai-mini", async (request) => {
    openAiCalls += 1;
    return {
      type: "translated",
      translatedText: "こんにちは",
      detectedSourceLanguage: "en",
      confidence: 1,
      cacheOutcome: "miss",
      usageHandoff: { ...request.usageHandoff, estimatedCostMicros: 10 }
    };
  }),
  azure: createProvider("azure-translator", async (request) => {
    azureCalls += 1;
    return {
      type: "translated",
      translatedText: "こんにちは",
      detectedSourceLanguage: "en",
      confidence: 1,
      cacheOutcome: "miss",
      usageHandoff: { ...request.usageHandoff, estimatedCostMicros: 5 }
    };
  })
};

const firstSuccess = await route.executeCommentTranslatorCreatorPaidProviderRoute(createRequest(authority, successProviders));
assert.equal(firstSuccess.status, "completed");
assert.equal(firstSuccess.execution.providerRouting.plan, "paid");
assert.equal(firstSuccess.execution.translatedCount, 1);
assert.equal(firstSuccess.paidUsageAccounting, "recorded");
assert.equal(openAiCalls, 1);
assert.equal(azureCalls, 0);

const replaySuccess = await route.executeCommentTranslatorCreatorPaidProviderRoute(createRequest(authority, successProviders));
assert.equal(replaySuccess.status, "completed");
assert.equal(replaySuccess.paidUsageAccounting, "ignored-replay", "C3 server-only boundary deduplicates the same paid usage event");
const paidUsage = await authority.paidUsageCounterStore.store.readCurrentPeriod({
  billingUserReferenceId: billing.createCommentTranslatorBillingUserReference(callerAuthorization),
  expectedPeriodEndIso: "2026-08-22T00:00:00.000Z"
});
assert.equal(paidUsage.translatedMessageCount, 1, "replayed C4 execution is counted exactly once");

function createRecoverableProviders(code) {
  return {
    openAiMini: createProvider("openai-mini", async (request) => {
      openAiCalls += 1;
      return {
        type: "recoverable-error",
        code,
        message: "sanitized recoverable provider result",
        retry: { retryable: true, retryAfterMs: null, fallbackToOriginal: true },
        usageHandoff: request.usageHandoff
      };
    }),
    azure: successProviders.azure
  };
}
let fallback;
for (const code of ["timeout", "rate-limited", "temporary-unavailable"]) {
  const fallbackAuthority = await createAuthority(fixtureDependencies);
  fallback = await route.executeCommentTranslatorCreatorPaidProviderRoute(
    createRequest(fallbackAuthority, createRecoverableProviders(code), { maxProviderAttemptsPerComment: 1 })
  );
  assert.equal(fallback.status, "completed");
  assert.equal(fallback.execution.fallbackReasonCounts.recoverablePrimaryError, 1);
}
assert.equal(azureCalls, 3, "Azure fallback runs for each approved recoverable OpenAI class");

const contentFilteredProviders = {
  openAiMini: createProvider("openai-mini", async (request) => {
    openAiCalls += 1;
    return {
      type: "recoverable-error",
      code: "content-filtered",
      message: "sanitized content policy result",
      retry: { retryable: true, retryAfterMs: null, fallbackToOriginal: true },
      usageHandoff: request.usageHandoff
    };
  }),
  azure: successProviders.azure
};
const contentFilteredAuthority = await createAuthority(fixtureDependencies);
const azureCallsBeforeContentFilter = azureCalls;
const openAiCallsBeforeContentFilter = openAiCalls;
const contentFiltered = await route.executeCommentTranslatorCreatorPaidProviderRoute(
  createRequest(contentFilteredAuthority, contentFilteredProviders)
);
assert.equal(contentFiltered.status, "completed");
assert.equal(openAiCalls - openAiCallsBeforeContentFilter, 1, "content policy errors are not retried");
assert.equal(azureCalls, azureCallsBeforeContentFilter, "content policy errors never fall back to Azure");

const terminalProviders = {
  openAiMini: createProvider("openai-mini", async () => ({
    type: "terminal-error",
    code: "policy-blocked",
    message: "strict output parsing failed",
    retry: { retryable: false }
  })),
  azure: successProviders.azure
};
const terminalAuthority = await createAuthority(fixtureDependencies);
const terminal = await route.executeCommentTranslatorCreatorPaidProviderRoute(createRequest(terminalAuthority, terminalProviders));
assert.equal(terminal.status, "completed");
assert.equal(terminal.execution.errorCounts.terminal, 1);
assert.equal(azureCalls, azureCallsBeforeContentFilter, "output-parse/policy terminal errors never fall back to Azure");

const noAzureFallbackAuthority = await createAuthority(fixtureDependencies);
const noAzureFallback = await route.executeCommentTranslatorCreatorPaidProviderRoute(
  createRequest(noAzureFallbackAuthority, createRecoverableProviders("timeout"), {
    env: { ...configuredEnv, AZURE_TRANSLATOR_KEY: "" },
    maxProviderAttemptsPerComment: 1
  })
);
assert.equal(noAzureFallback.status, "completed");
assert.equal(noAzureFallback.execution.translatedCount, 0);
assert.equal(azureCalls, azureCallsBeforeContentFilter, "missing Azure configuration disables fallback without blocking OpenAI primary");

const accountingFailureAuthority = await createAuthority(fixtureDependencies);
const accountingFailure = await route.executeCommentTranslatorCreatorPaidProviderRoute(
  createRequest(accountingFailureAuthority, successProviders, {
    paidUsageCounterStore: {
      ...accountingFailureAuthority.paidUsageCounterStore,
      store: {
        readCurrentPeriod: (request) => accountingFailureAuthority.paidUsageCounterStore.store.readCurrentPeriod(request),
        async recordUsage() { return "rejected-missing-counter"; }
      }
    }
  })
);
assert.deepEqual(accountingFailure, {
  status: "paid-provider-unavailable",
  plan: "free",
  billingState: "paid-inactive",
  reason: "paid-usage-accounting-unavailable",
  providerCallCount: 0,
  providerIdentifiers: "server-only-not-returned",
  privateAuthorityReferences: "never-returned-by-design"
}, "C3 write failure suppresses the translated result");

const serialized = JSON.stringify({ firstSuccess, replaySuccess, fallback, contentFiltered, terminal, noAzureFallback, accountingFailure });
for (const privateValue of [
  ownerUserId,
  "private-comment-reference",
  "private-session-reference",
  "private-signed-event-fixture",
  "private-customer-fixture",
  "private-subscription-fixture",
  configuredEnv.OPENAI_API_KEY,
  configuredEnv.OPENAI_TRANSLATION_MODEL,
  configuredEnv.AZURE_TRANSLATOR_KEY,
  configuredEnv.AZURE_TRANSLATOR_ENDPOINT,
  configuredEnv.AZURE_TRANSLATOR_REGION
]) {
  assert.doesNotMatch(serialized, new RegExp(privateValue), "C4 output remains sanitized");
}

console.log("comment_translator_creator_c4_paid_provider_route_contract=pass");
