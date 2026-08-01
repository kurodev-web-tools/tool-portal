import assert from "node:assert/strict";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const runtimePath = "lib/comment-translator-creator-paid-provider-runtime.ts";
const runtimeTypesPath = "lib/comment-translator-creator-paid-provider-types.ts";
const entitlementRuntimePath = "lib/comment-translator-creator-entitlement-runtime.ts";
const providerBoundaryPath = "lib/comment-translator-provider-boundary.ts";
const providerPolicyPath = "lib/comment-translator-provider-policy-runtime.ts";

assert.ok(fs.existsSync(path.join(root, runtimePath)), "NC-P1 paid provider runtime exists");

const runtimeSource = read(runtimePath);
const runtimeTypesSource = read(runtimeTypesPath);
const entitlementSource = read(entitlementRuntimePath);
const providerBoundarySource = read(providerBoundaryPath);
const providerPolicySource = read(providerPolicyPath);

assert.match(runtimeSource, /^import "server-only";/);
assert.match(runtimeTypesSource, /comment-translator-creator-entitlement-runtime/);
assert.match(runtimeTypesSource, /comment-translator-creator-usage-runtime/);
assert.match(runtimeTypesSource, /comment-translator-creator-glossary-runtime/);
assert.match(runtimeSource, /approvedRecoverableFallbackCodes/);
assert.match(runtimeSource, /provider-success-accounting-committed/);
assert.match(runtimeSource, /cache-hit-not-counted/);
assert.match(runtimeSource, /effective-glossary-version/);
assert.doesNotMatch(runtimeSource, /localStorage|sessionStorage|indexedDB|console\.|process\.env|createClient\s*\(/);
assert.doesNotMatch(runtimeSource, /rawProvider|providerMessage|authorizationHeader|serviceRoleKey/);
assert.match(providerBoundarySource, /readonly signal\?: AbortSignal/);
assert.match(providerPolicySource, /signal:\s*request\.signal/);

const entitlementModule = await importTypeScript(entitlementSource.replace('import "server-only";', ""));
const runtimeModule = await importTypeScript(runtimeSource.replace('import "server-only";', ""));
const providerPolicyModule = await importTypeScript(providerPolicySource.replace('import "server-only";', ""));

const period = readyEntitlement();
const openActivation = { status: "allowed", authority: "server-owned-approved" };
const closedActivation = entitlementModule.commentTranslatorCreatorPaidActivationPolicy;
const authenticatedCaller = { status: "authenticated", ownerUserId: "fixture-owner" };

assert.equal(providerPolicyModule.parseOpenAITranslationProviderResponse({ choices: [{ message: { content: '{"translatedText":"ok","detectedSourceLanguage":"en","confidence":1}' } }], usage: { total_tokens: 3 } }).status, "parsed");
assert.equal(providerPolicyModule.parseOpenAITranslationProviderResponse({ choices: [{ message: { content: '{"translatedText":"ok","detectedSourceLanguage":"en","confidence":1,"metadata":"forbidden"}' } }] }).status, "invalid");
assert.equal(providerPolicyModule.parseOpenAITranslationProviderResponse({ choices: [{ message: { content: "not-json" } }] }).status, "invalid");

{
  const fixture = createFixture({ activationPolicy: openActivation });
  const result = await fixture.runtime.execute(request({ status: "unauthenticated" }));
  assert.deepEqual(result, failClosed("caller-not-authenticated", "not-started"));
  assert.equal(fixture.entitlementReads.length, 0);
  assert.equal(fixture.budgetReads.length, 0);
  assert.equal(fixture.primaryCalls.length, 0);
}

{
  const fixture = createFixture({ activationPolicy: closedActivation });
  const result = await fixture.runtime.execute(request(authenticatedCaller));
  assert.deepEqual(result, failClosed("activation-closed", "not-started"));
  assert.equal(fixture.entitlementReads.length, 0);
  assert.equal(fixture.primaryCalls.length, 0);
}

for (const entitlementRead of [
  { status: "paid-inactive", entitlement: null, authority: "fail-closed", reason: "missing" },
  { status: "paid-inactive", entitlement: null, authority: "fail-closed", reason: "unreadable" },
  { status: "paid-inactive", entitlement: null, authority: "fail-closed", reason: "inactive" }
]) {
  const fixture = createFixture({ activationPolicy: openActivation, entitlementRead });
  const result = await fixture.runtime.execute(request(authenticatedCaller));
  assert.equal(result.status, "fail-closed");
  assert.match(result.reason, /^entitlement-/);
  assert.equal(fixture.budgetReads.length, 0);
  assert.equal(fixture.primaryCalls.length, 0);
}

for (const budgetResult of [
  { status: "blocked", reason: "over-limit" },
  { status: "blocked", reason: "unavailable" }
]) {
  const fixture = createFixture({ activationPolicy: openActivation, budgetResult });
  const result = await fixture.runtime.execute(request(authenticatedCaller));
  assert.deepEqual(
    result,
    failClosed(budgetResult.reason === "over-limit" ? "budget-over-limit" : "budget-unavailable", "not-started")
  );
  assert.equal(fixture.primaryCalls.length, 0);
}

{
  const fixture = createFixture({ activationPolicy: openActivation, primaryProvider: null });
  assert.deepEqual(
    await fixture.runtime.execute(request(authenticatedCaller)),
    failClosed("provider-config-missing", "not-started")
  );
  assert.equal(fixture.primaryCalls.length, 0);
}

{
  let fetchCalls = 0;
  const missingPrimary = providerPolicyModule.createOpenAIMiniCommentTranslationProvider({
    apiKey: "server-fixture-key",
    model: null,
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("must not run");
    }
  });
  const fixture = createFixture({ activationPolicy: openActivation, primaryProvider: missingPrimary });
  assert.deepEqual(await fixture.runtime.execute(request(authenticatedCaller)), failClosed("provider-config-missing", "not-started"));
  assert.equal(fetchCalls, 0, "real OpenAI provider missing model fails before fetch");
}

{
  let primaryFetchCalls = 0;
  let fallbackFetchCalls = 0;
  const readyPrimary = providerPolicyModule.createOpenAIMiniCommentTranslationProvider({
    apiKey: "server-fixture-key",
    model: "approved-fixture-model",
    fetchImpl: async () => {
      primaryFetchCalls += 1;
      return providerResponse({
        choices: [{ message: { content: '{"translatedText":"primary","detectedSourceLanguage":"en","confidence":1}' } }],
        usage: { total_tokens: 3 }
      });
    }
  });
  const missingFallback = providerPolicyModule.createAzureCommentTranslationProvider({
    key: null,
    endpoint: null,
    fetchImpl: async () => {
      fallbackFetchCalls += 1;
      throw new Error("must not run");
    }
  });
  const fixture = createFixture({
    activationPolicy: openActivation,
    primaryProvider: readyPrimary,
    fallbackProvider: missingFallback
  });
  assert.equal((await fixture.runtime.execute(request(authenticatedCaller))).status, "success");
  assert.equal(primaryFetchCalls, 1);
  assert.equal(fallbackFetchCalls, 0, "real Azure missing key disables only optional fallback");
}

{
  const providerCalls = [];
  const fixture = createFixture({
    activationPolicy: openActivation,
    primaryProvider: {
      ...fakeProvider("openai-mini", providerCalls, (providerRequest) => translated("must-not-run", providerRequest)),
      configurationStatus: "missing"
    }
  });
  assert.deepEqual(await fixture.runtime.execute(request(authenticatedCaller)), failClosed("provider-config-missing", "not-started"));
  assert.equal(providerCalls.length, 0, "missing key/model configuration fails before provider call");
}

{
  const primaryCalls = [];
  const fallbackCalls = [];
  const fixture = createFixture({
    activationPolicy: openActivation,
    primaryProvider: fakeProvider("openai-mini", primaryCalls, (providerRequest) => translated("primary", providerRequest)),
    fallbackProvider: {
      ...fakeProvider("azure-translator", fallbackCalls, (providerRequest) => translated("must-not-run", providerRequest)),
      configurationStatus: "missing"
    }
  });
  assert.equal((await fixture.runtime.execute(request(authenticatedCaller))).status, "success");
  assert.equal(primaryCalls.length, 1);
  assert.equal(fallbackCalls.length, 0, "missing optional Azure config disables only fallback");
}

{
  const futureEntitlement = readyEntitlement();
  futureEntitlement.entitlement.periodStartIso = "2099-01-01T00:00:00.000Z";
  futureEntitlement.entitlement.periodEndIso = "2099-02-01T00:00:00.000Z";
  const fixture = createFixture({ activationPolicy: openActivation, entitlementRead: futureEntitlement });
  assert.deepEqual(await fixture.runtime.execute(request(authenticatedCaller)), failClosed("entitlement-inactive", "not-started"));
  assert.equal(fixture.primaryCalls.length, 0);
}

{
  const fixture = createFixture({ activationPolicy: openActivation, glossaryResult: { status: "fail-closed", reason: "glossary-unreadable", glossaryTerms: [], glossaryVersion: null } });
  assert.deepEqual(
    await fixture.runtime.execute(request(authenticatedCaller)),
    failClosed("glossary-unavailable", "not-started")
  );
  assert.equal(fixture.primaryCalls.length, 0);
}

{
  const events = [];
  const fixture = createFixture({
    activationPolicy: openActivation,
    onProviderCall(providerRequest) {
      events.push(["provider", providerRequest.glossary.terms, providerRequest.glossary.version]);
      return translated("翻訳済み", providerRequest);
    },
    onAccount(accountRequest) {
      events.push(["account", accountRequest.execution.status]);
      return recorded();
    },
    onCacheWrite(key) {
      events.push(["cache-write", key]);
    }
  });
  const result = await fixture.runtime.execute(request(authenticatedCaller));
  assert.equal(result.status, "success");
  assert.equal(result.source, "provider");
  assert.equal(result.translatedText, "翻訳済み");
  assert.equal(result.accounting, "provider-success-accounting-committed");
  assert.equal(fixture.budgetReads[0].entitlement?.entitlementReferenceId, "entitlement-fixture");
  assert.deepEqual(events.map(([kind]) => kind), ["provider", "account", "cache-write"]);
  assert.deepEqual(events[0][1], ["VTuber=>配信者"]);
  assert.equal(events[0][2], "effective-v1");
  assert.equal(JSON.stringify(fixture.primaryCalls[0]).includes("private-note"), false);
}

{
  const fixture = createFixture({
    activationPolicy: openActivation,
    onAccount() {
      return { status: "fail-closed", reason: "accounting-unavailable", resultDisposition: "suppressed", counts: null };
    }
  });
  assert.deepEqual(
    await fixture.runtime.execute(request(authenticatedCaller)),
    failClosed("accounting-unavailable", "succeeded-accounting-failed")
  );
  assert.equal(fixture.cacheWrites.length, 0, "unaccounted provider success never enters cache");
}

for (const recoverableCode of ["temporary-unavailable", "rate-limited", "timeout"]) {
  const fixture = createFixture({
    activationPolicy: openActivation,
    onProviderCall(providerRequest) {
      return recoverable(recoverableCode, providerRequest);
    },
    onFallbackCall(providerRequest) {
      return translated("fallback", providerRequest);
    }
  });
  const result = await fixture.runtime.execute(request(authenticatedCaller));
  assert.equal(result.status, "success");
  assert.equal(fixture.fallbackCalls.length, 1, `${recoverableCode} permits Azure fallback`);
}

for (const primaryFailure of [
  (providerRequest) => recoverable("content-filtered", providerRequest),
  () => ({ type: "terminal-error", code: "policy-blocked", message: "private provider detail", retry: { retryable: false } }),
  () => { throw new TypeError("unexpected provider defect"); }
]) {
  const fixture = createFixture({ activationPolicy: openActivation, onProviderCall: primaryFailure });
  const result = await fixture.runtime.execute(request(authenticatedCaller));
  assert.equal(result.status, "fail-closed");
  assert.equal(fixture.fallbackCalls.length, 0, "non-approved or terminal failures never fallback");
  assert.equal(JSON.stringify(result).includes("private provider detail"), false);
}

{
  const fallbackCalls = [];
  const malformedOpenAi = providerPolicyModule.createOpenAIMiniCommentTranslationProvider({
    apiKey: "synthetic-key",
    model: "synthetic-model",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() { throw new SyntaxError("malformed provider JSON"); },
      async text() { return ""; }
    })
  });
  const fixture = createFixture({
    activationPolicy: openActivation,
    primaryProvider: malformedOpenAi,
    fallbackProvider: fakeProvider("azure-translator", fallbackCalls, (providerRequest) => translated("must-not-fallback", providerRequest))
  });
  assert.equal((await fixture.runtime.execute(request(authenticatedCaller))).status, "fail-closed");
  assert.equal(fallbackCalls.length, 0, "malformed strict output is terminal and never falls back");
}


{
  const fallbackCalls = [];
  const unreadableOpenAi = providerPolicyModule.createOpenAIMiniCommentTranslationProvider({
    apiKey: "synthetic-key",
    model: "synthetic-model",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() { throw new Error("transient body read failure"); },
      async text() { return ""; }
    })
  });
  const fixture = createFixture({
    activationPolicy: openActivation,
    primaryProvider: unreadableOpenAi,
    fallbackProvider: fakeProvider("azure-translator", fallbackCalls, (providerRequest) => translated("fallback", providerRequest))
  });
  assert.equal((await fixture.runtime.execute(request(authenticatedCaller))).status, "success");
  assert.equal(fallbackCalls.length, 1, "transient body read failure permits approved Azure fallback");
}

{
  const fixture = createFixture({
    activationPolicy: openActivation,
    timeoutMs: 5,
    onProviderCall(_providerRequest) {
      return new Promise(() => {});
    },
    fallbackProvider: null
  });
  assert.deepEqual(
    await fixture.runtime.execute(request(authenticatedCaller)),
    failClosed("provider-timeout", "failed")
  );
}

{
  const fixture = createFixture({
    activationPolicy: openActivation,
    timeoutMs: 5,
    onProviderCall(providerRequest) {
      return new Promise((_resolve, reject) => providerRequest.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    },
    fallbackProvider: null
  });
  assert.deepEqual(
    await fixture.runtime.execute(request(authenticatedCaller)),
    failClosed("provider-timeout", "failed")
  );
}

{
  const fixture = createFixture({ activationPolicy: openActivation });
  const versionOneCaller = { status: "authenticated", ownerUserId: "fixture-owner-v1" };
  const versionTwoCaller = { status: "authenticated", ownerUserId: "fixture-owner-v2" };
  const first = await fixture.runtime.execute(request(versionOneCaller));
  const second = await fixture.runtime.execute(request(versionTwoCaller));
  const third = await fixture.runtime.execute(request(versionTwoCaller));
  assert.equal(first.status, "success");
  assert.equal(second.status, "success");
  assert.equal(third.status, "success");
  assert.equal(third.source, "cache");
  assert.equal(third.accounting, "cache-hit-not-counted");
  assert.equal(fixture.primaryCalls.length, 2, "materially different effective glossary versions have separate cache entries");
  assert.equal(fixture.providerAccountingRequests.length, 2);
  assert.equal(fixture.cacheAccountingRequests.length, 1);
}

{
  const first = createFixture({ activationPolicy: openActivation });
  const second = createFixture({ activationPolicy: openActivation });
  await first.runtime.execute(request(authenticatedCaller));
  await second.runtime.execute(request(authenticatedCaller));
  assert.notEqual(
    first.providerAccountingRequests[0].execution.usageEventReference,
    second.providerAccountingRequests[0].execution.usageEventReference,
    "separate provider executions never dedupe only because cache identity matches"
  );
}

process.stdout.write("comment translator NC-P1 paid provider route contract passed\n");

function createFixture({
  activationPolicy,
  entitlementRead = period,
  budgetResult = { status: "authorized" },
  glossaryResult = glossary("effective-v1"),
  primaryProvider = undefined,
  fallbackProvider = undefined,
  timeoutMs = 25,
  onProviderCall = (providerRequest) => translated("translated", providerRequest),
  onFallbackCall = (providerRequest) => translated("fallback", providerRequest),
  onAccount = (input) => input.execution.status === "cache-hit"
    ? { status: "not-counted", reason: "cache-hit", resultDisposition: "success", counts: null }
    : recorded(),
  onCacheWrite = () => {}
}) {
  const entitlementReads = [];
  const budgetReads = [];
  const primaryCalls = [];
  const fallbackCalls = [];
  const cacheWrites = [];
  const providerAccountingRequests = [];
  const cacheAccountingRequests = [];
  const cache = new Map();
  const entitlementStore = {
    async readEntitlement(input) {
      entitlementReads.push(input);
      return entitlementRead;
    }
  };
  const entitlementAuthorizer = {
    authorize(callerAuthority) {
      return entitlementModule.authorizeCommentTranslatorCreatorPaidProvider({
        callerAuthority,
        entitlementStore,
        activationPolicy
      });
    }
  };
  const primary = primaryProvider === null ? null : primaryProvider ?? fakeProvider("openai-mini", primaryCalls, onProviderCall);
  const fallback = fallbackProvider === null ? null : fallbackProvider ?? fakeProvider("azure-translator", fallbackCalls, onFallbackCall);
  const runtime = runtimeModule.createCommentTranslatorCreatorPaidProviderRuntime({
    entitlementAuthorizer,
    budgetAuthorizer: {
      async authorize(input) {
        budgetReads.push(input);
        return budgetResult;
      }
    },
    glossaryRuntime: {
      async resolveProviderContext({ callerAuthority }) {
        if (glossaryResult.status !== "ready") return glossaryResult;
        return callerAuthority.status === "authenticated" && callerAuthority.ownerUserId.endsWith("-v2")
          ? glossary("effective-v2")
          : glossaryResult;
      }
    },
    usageRuntime: {
      async account(input) {
        if (input.execution.status === "cache-hit") cacheAccountingRequests.push(input);
        if (input.execution.status === "provider-executed") providerAccountingRequests.push(input);
        return onAccount(input);
      }
    },
    providerRequestFactory: ({ comment, targetLanguage, glossaryTerms, glossaryVersion }) => ({
      status: "ready",
      providerRequest: providerRequest(comment, targetLanguage, glossaryTerms, glossaryVersion)
    }),
    providers: { openAiMini: primary, azure: fallback },
    cache: {
      read(key) { return cache.get(key) ?? null; },
      write(key, value) { cacheWrites.push(key); onCacheWrite(key, value); cache.set(key, value); }
    },
    timeoutMs
  });
  return { runtime, entitlementReads, budgetReads, primaryCalls, fallbackCalls, cacheWrites, providerAccountingRequests, cacheAccountingRequests };
}

function request(callerAuthority) {
  return {
    callerAuthority,
    comment: { commentId: "comment-fixture", publishedAt: "2026-08-01T00:00:00.000Z", text: "hello", platformLanguageHint: "en", authorDisplayName: "safe" },
    targetLanguage: "ja"
  };
}

function glossary(version) {
  return { status: "ready", glossaryTerms: ["VTuber=>配信者"], glossaryVersion: version };
}

function fakeProvider(id, calls, translate) {
  return {
    id,
    name: id,
    configurationStatus: "ready",
    runtimeScope: "server-runtime-only",
    secretBoundary: { runtime: "server-env-only", clientBundle: "forbidden", fixtures: "forbidden", docsAndTaskNotes: "no-secret-values" },
    async translate(providerRequest) {
      calls.push(providerRequest);
      return translate(providerRequest);
    }
  };
}

function providerRequest(comment, targetLanguage, glossaryTerms, glossaryVersion) {
  return {
    requestId: `paid:${comment.commentId}`,
    input: { kind: "live-comment", text: comment.text, sourceLanguage: "en", targetLanguage },
    glossary: { terms: glossaryTerms, version: glossaryVersion },
    cache: {
      lookupKey: `paid:${comment.text}:${targetLanguage}:${glossaryVersion ?? "no-glossary"}`,
      keyMaterial: {
        normalizedTextHash: "fixture-hash",
        sourceLanguage: "en",
        targetLanguage,
        providerCapabilityVersion: "paid-v1",
        glossaryVersion,
        moderationPolicyVersion: "fixture-v1",
        excludes: []
      }
    },
    privacy: { logRetention: "short-lived-only", rawTextLogging: "disabled-by-default", piiMinimization: "exclude-author-and-channel-identifiers", moderationSkipReason: null },
    usageHandoff: { meteringEventId: `paid:${comment.commentId}`, providerId: "pending-provider-selection", billingCategory: "translation", estimatedUnits: 1, cacheOutcome: "miss", enforcement: "not-implemented", databaseWrite: "not-implemented", logPolicy: "short-lived-provider-diagnostic-only" }
  };
}

function translated(translatedText, providerRequest) {
  return { type: "translated", translatedText, detectedSourceLanguage: "en", confidence: 1, cacheOutcome: "miss", usageHandoff: providerRequest.usageHandoff };
}

function providerResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get() { return null; } },
    async json() { return body; },
    async text() { return ""; }
  };
}

function recoverable(code, providerRequest) {
  return { type: "recoverable-error", code, message: "sanitized", retry: { retryable: true, retryAfterMs: null, fallbackToOriginal: true }, usageHandoff: providerRequest.usageHandoff };
}

function recorded() {
  return { status: "recorded", reason: "provider-executed-usage-recorded", resultDisposition: "success", counts: { providerExecutionCount: 1, providerInputCharacterCount: 5, translatedCharacterCount: 5 } };
}

function readyEntitlement() {
  return {
    status: "ready",
    entitlement: { entitlementReferenceId: "entitlement-fixture", plan: "creator", status: "active", periodStartIso: "2026-08-01T00:00:00.000Z", periodEndIso: "2026-09-01T00:00:00.000Z", lastEvidenceAtIso: "2026-08-01T00:00:00.000Z" },
    authority: "signed-stripe-evidence"
  };
}

function failClosed(reason, providerExecution) {
  return { status: "fail-closed", reason, providerExecution, translatedText: null, accounting: "not-committed", browserSafe: true };
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

async function importTypeScript(source) {
  const executable = stripTypeScriptTypes(source, { mode: "transform" });
  return import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);
}
