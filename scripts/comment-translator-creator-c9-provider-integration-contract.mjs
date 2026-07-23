import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createDictionaryStore, nowIso } from "./comment-translator-creator-c9-contract-fixture.mjs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier === "stripe") return { shortCircuit: true, url: "data:text/javascript,export default class Stripe{}" };
    if (specifier === "@supabase/supabase-js") {
      return { shortCircuit: true, url: "data:text/javascript,export function createClient(){return {from(){return {}},rpc(){return {data:null,error:null}}}}" };
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
const providerExecution = await import("../lib/comment-translator-provider-execution-runtime.ts");
const fixtures = await import("./comment-translator-creator-c4-contract-fixture.mjs");
const authority = await fixtures.createAuthority({ billing, entitlementStores, paidUsageStores });
const dictionary = createDictionaryStore();
const dictionaryFactory = { status: "ready", store: dictionary, missingEnvReferences: [] };
await dictionary.createEntry({
  ownerUserId: fixtures.ownerUserId,
  entry: {
    entryId: "33333333-3333-4333-8333-333333333333",
    term: "Kuro",
    normalizedTerm: "kuro",
    replacement: "クロ",
    note: "private note never sent to provider",
    sourceLanguage: "en",
    targetLanguage: "ja",
    createdAtIso: nowIso,
    updatedAtIso: nowIso
  }
});

let providerCalls = 0;
const observedGlossaries = [];
const providers = {
  openAiMini: fixtures.createProvider("openai-mini", async (request) => {
    providerCalls += 1;
    observedGlossaries.push(request.glossary);
    return {
      type: "translated", translatedText: "こんにちは", detectedSourceLanguage: "en", confidence: 1,
      cacheOutcome: "miss", usageHandoff: { ...request.usageHandoff, estimatedCostMicros: 10 }
    };
  }),
  azure: null
};
const cache = providerExecution.createInMemoryCommentTranslatorProviderExecutionCache();
const first = await route.executeCommentTranslatorCreatorPaidProviderRoute(
  fixtures.createRequest(authority, providers, { customDictionaryStore: dictionaryFactory, cache })
);
assert.equal(first.status, "completed");
assert.equal(providerCalls, 1);
assert.deepEqual(observedGlossaries[0].terms, ["[en->ja] Kuro => クロ"]);
assert.match(observedGlossaries[0].version, /^ctdict-[a-f0-9]{64}$/);
assert.doesNotMatch(JSON.stringify(observedGlossaries[0]), /private note/);

const cached = await route.executeCommentTranslatorCreatorPaidProviderRoute(
  fixtures.createRequest(authority, providers, { customDictionaryStore: dictionaryFactory, cache })
);
assert.equal(cached.status, "completed");
assert.equal(providerCalls, 1, "unchanged effective dictionary reuses the cache namespace");

const current = dictionary.entriesByOwner.get(fixtures.ownerUserId)[0];
await dictionary.updateEntry({
  ownerUserId: fixtures.ownerUserId,
  entryId: current.entryId,
  expectedUpdatedAtIso: current.updatedAtIso,
  entry: { ...current, replacement: "黒", updatedAtIso: "2026-07-23T06:01:00.000Z" }
});
const changed = await route.executeCommentTranslatorCreatorPaidProviderRoute(
  fixtures.createRequest(authority, providers, { customDictionaryStore: dictionaryFactory, cache })
);
assert.equal(changed.status, "completed");
assert.equal(providerCalls, 2, "effective dictionary changes separate the cache namespace");
assert.notEqual(observedGlossaries[1].version, observedGlossaries[0].version);

const callsBeforeUnavailable = providerCalls;
const unavailable = await route.executeCommentTranslatorCreatorPaidProviderRoute(
  fixtures.createRequest(authority, providers, {
    customDictionaryStore: {
      status: "unavailable", store: null, missingEnvReferences: ["SUPABASE_SERVICE_ROLE_KEY"],
      reason: "trusted-service-role-env-missing"
    },
    cache
  })
);
assert.equal(unavailable.reason, "custom-dictionary-unavailable");
assert.equal(providerCalls, callsBeforeUnavailable, "unconfigured dictionary storage fails before provider execution");

const unreadable = await route.executeCommentTranslatorCreatorPaidProviderRoute(
  fixtures.createRequest(authority, providers, {
    customDictionaryStore: {
      status: "ready",
      store: { ...dictionary, async readCurrent() { throw new Error("private dictionary storage detail"); } },
      missingEnvReferences: []
    },
    cache
  })
);
assert.equal(unreadable.reason, "custom-dictionary-unavailable");
assert.equal(providerCalls, callsBeforeUnavailable, "unreadable dictionary storage fails before provider execution");

for (const browserSurface of [
  "../app/api/comment-translator/custom-dictionary/route.ts",
  "../components/comment-translator/CommentTranslatorCustomDictionary.tsx"
]) {
  assert.equal(fs.existsSync(new URL(browserSurface, import.meta.url)), false, "C9 adds no public API or demonstration UI");
}

console.log("comment translator creator C9 provider and cache integration contract passed");
