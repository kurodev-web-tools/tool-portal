import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";
import {
  NC_Q1_EVIDENCE_CLASSES,
  createCommentTranslatorCreatorNcQ1Fixture
} from "./comment-translator-creator-nc-q1-fixture.mjs";

const root = process.cwd();
const fixture = createCommentTranslatorCreatorNcQ1Fixture();
const expectedLegacyIds = [
  "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12",
  "CP1", "CP2",
  "P1-1", "P1-2", "P1-3", "P1-4", "P1-5", "P1-6", "P1-7", "P1-8", "P1-9"
];
const priorLaneContracts = [
  "scripts/comment-translator-creator-nc-f1-boundary-contract.mjs",
  "scripts/comment-translator-creator-nc-f1-free-characterization-contract.mjs",
  "scripts/comment-translator-creator-nc-d1-entitlement-contract.mjs",
  "scripts/comment-translator-creator-nc-e1-entitlement-runtime-contract.mjs",
  "scripts/comment-translator-creator-nc-u1-paid-usage-contract.mjs",
  "scripts/comment-translator-creator-nc-p1-paid-provider-contract.mjs",
  "scripts/comment-translator-creator-nc-c1-glossary-contract.mjs",
  "scripts/comment-translator-creator-nc-o1-obs-token-contract.mjs",
  "scripts/comment-translator-creator-nc-o2-obs-overlay-contract.mjs",
  "scripts/comment-translator-creator-nc-m1-moderator-token-contract.mjs",
  "scripts/comment-translator-creator-nc-m2-moderator-browser-contract.mjs",
  "scripts/comment-translator-creator-nc-h1-history-contract.mjs",
  "scripts/comment-translator-creator-nc-v1-priority-projection-contract.mjs",
  "scripts/comment-translator-creator-nc-b1-billing-contract.mjs"
];

assert.equal(
  typeof createActualNcQ1RuntimeComposition,
  "function",
  "NC-Q1 exposes a composition of actual cross-lane runtime exports"
);
assert.equal(
  typeof verifyActualNcQ1RuntimeComposition,
  "function",
  "NC-Q1 verifies behavior across actual runtime exports"
);

function assertSafeLocalFixture(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(
    serialized,
    /(?:sk_(?:live|test)_|whsec_|bearer\s|authorization:|password|credential|cookie|localstorage|sessionstorage|indexeddb|searchparams|raw(?:provider|stripe)|customer(?:reference|id)?|subscription(?:reference|id)?|event(?:reference|id|key)|owner(?:reference|id)?|provider(?:channel|account)(?:id)?|livechat(?:id)?)/i,
    "the deterministic fixture contains no secret, browser state, raw external data, or private identifier"
  );
}

function assertFixtureModuleScope() {
  const source = fs.readFileSync(
    new URL("./comment-translator-creator-nc-q1-fixture.mjs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /(?:container|docker|cookie|token|localstorage|sessionstorage|indexeddb|searchparams|raw(?:provider|stripe))/i,
    "the fixture module excludes rejected runtime, browser state, and raw external-data vocabulary"
  );
}

async function importActualTypeScript(relativePath, transform = (source) => source) {
  const source = transform(fs.readFileSync(path.join(root, relativePath), "utf8"))
    .replace('import "server-only";', "");
  const executable = stripTypeScriptTypes(source, { mode: "transform" });
  return import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);
}

async function createActualNcQ1RuntimeComposition() {
  const priority = await importActualTypeScript("lib/comment-translator-priority-classification.ts");
  const priorityUrl = `data:text/javascript;base64,${Buffer.from(
    stripTypeScriptTypes(fs.readFileSync(path.join(root, "lib/comment-translator-priority-classification.ts"), "utf8"), { mode: "transform" })
  ).toString("base64")}`;
  const [billing, entitlementStore, entitlement, usage, glossary, provider, historyRuntime, obsToken, obsBrowser, moderatorToken, moderatorBrowser] = await Promise.all([
    importActualTypeScript("lib/comment-translator-creator-billing-runtime.ts"),
    importActualTypeScript(
      "lib/comment-translator-creator-entitlement-store.ts",
      (source) => source.replace('import { createClient } from "@supabase/supabase-js";', "const createClient = () => { throw new Error(\"local-only\"); };")
    ),
    importActualTypeScript("lib/comment-translator-creator-entitlement-runtime.ts"),
    importActualTypeScript("lib/comment-translator-creator-usage-runtime.ts"),
    importActualTypeScript("lib/comment-translator-creator-glossary-runtime.ts"),
    importActualTypeScript(
      "lib/comment-translator-creator-paid-provider-runtime.ts",
      (source) => source.replace("crypto.randomUUID()", '"fixture-usage"')
    ),
    importActualTypeScript("lib/comment-translator-creator-history-runtime.ts"),
    importActualTypeScript(
      "lib/comment-translator-creator-obs-token-runtime.ts",
      (source) => source.replace('randomBytes(32).toString("base64url")', '"O".repeat(43)')
    ),
    importActualTypeScript("lib/comment-translator-creator-obs-overlay-browser-session-runtime.ts"),
    importActualTypeScript(
      "lib/comment-translator-creator-moderator-token-runtime.ts",
      (source) => source.replace('randomBytes(32).toString("base64url")', '"M".repeat(43)')
    ),
    importActualTypeScript("lib/comment-translator-creator-moderator-browser-session-runtime.ts")
  ]);
  const [historyProjection, historyStore] = await Promise.all([
    importActualTypeScript(
      "lib/comment-translator-creator-history-projection.ts",
      (source) => source.replace('from "./comment-translator-priority-classification"', `from "${priorityUrl}"`)
    ),
    importActualTypeScript(
      "lib/comment-translator-creator-history-store.ts",
      (source) => source
        .replace('import { createClient } from "@supabase/supabase-js";', "const createClient = () => { throw new Error(\"local-only\"); };")
        .replace('from "./comment-translator-priority-classification"', `from "${priorityUrl}"`)
    )
  ]);
  return {
    billing,
    entitlementStore,
    entitlement,
    usage,
    glossary,
    provider,
    priority,
    historyProjection,
    historyStore,
    historyRuntime,
    obsToken,
    obsBrowser,
    moderatorToken,
    moderatorBrowser
  };
}

function resolveFixtureAuthority(row) {
  if (row.authentication !== "authenticated") {
    return { tier: "denied", paid: false, canUsePaidProvider: false, canWritePaidState: false };
  }

  if (row.entitlementEvidence === "verified-signed-active") {
    return { tier: "Paid", paid: true, canUsePaidProvider: true, canWritePaidState: false };
  }

  return { tier: "Free", paid: false, canUsePaidProvider: false, canWritePaidState: false };
}

function verifyLegacyCrosswalk() {
  const source = fs.readFileSync(
    path.join(root, "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md"),
    "utf8"
  );
  const actualIds = [...source.matchAll(/^\| (C(?:[1-9]|1[0-2])|CP[12]|P1-[1-9]) \|/gm)].map((match) => match[1]);

  assert.deepEqual(actualIds, expectedLegacyIds, "the legacy crosswalk retains all 23 rows in canonical order");
  assert.match(source, /legacy row count: 23/, "the crosswalk declares 23 complete legacy rows");
  assert.match(source, /unexplained omissions: 0/, "the crosswalk declares no unexplained omission");
  assert.match(source, /implementation-specific Container recovery: 0/, "rejected implementation recovery remains zero");
}

function verifyFixtureAuthorityMatrix() {
  assert.deepEqual(NC_Q1_EVIDENCE_CLASSES, ["fixture", "local", "gated", "blocked", "live"]);
  assert.equal(fixture.evidence.kind, "fixture");
  assert.equal(fixture.evidence.productionProof, false, "fixture evidence is never production proof");
  assert.equal(fixture.evidence.deployedProof, false, "fixture evidence is never deployed proof");
  assert.deepEqual(
    fixture.evidence.fixtureAndLocalSuccess,
    ["fixture", "local"],
    "fixture/local success has only fixture/local classification"
  );
  for (const classification of ["gated", "blocked", "live"]) {
    assert.equal(
      fixture.evidence.fixtureAndLocalSuccess.includes(classification),
      false,
      `fixture/local success cannot satisfy ${classification} evidence`
    );
  }
  assert.equal(fixture.activation.status, "closed", "every activation gate remains closed locally");
  assert.ok(fixture.activation.gates.every((gate) => gate.status === "closed"), "each activation gate is closed");
  assert.equal(fixture.free.permanent, true, "Free behavior is permanent");
  assert.equal(Object.isFrozen(fixture), true, "the exported fixture is deterministic and immutable");
  assertSafeLocalFixture(fixture);
  assertFixtureModuleScope();

  for (const row of fixture.authorityMatrix) {
    assert.deepEqual(
      resolveFixtureAuthority(row),
      row.expected,
      `${row.label} must retain its declared effective boundary`
    );
    if (!row.expected.paid) {
      assert.equal(row.expected.canUsePaidProvider, false, `${row.label} cannot reach the paid provider`);
      assert.equal(row.expected.canWritePaidState, false, `${row.label} cannot mutate paid state`);
    }
  }

  const paidRows = fixture.authorityMatrix.filter((row) => row.expected.paid);
  assert.deepEqual(
    paidRows.map((row) => row.entitlementEvidence),
    ["verified-signed-active"],
    "only verified signed subscription evidence can result in Paid"
  );
  assert.equal(
    fixture.authorityMatrix.find((row) => row.label === "checkout-completion")?.expected.tier,
    "Free",
    "Checkout redirect/completion is not Paid evidence"
  );
}

async function verifyActualNcQ1RuntimeComposition() {
  const actual = await createActualNcQ1RuntimeComposition();
  const nowMs = Date.parse("2026-08-04T00:00:00.000Z");
  const nowIso = new Date(nowMs).toISOString();
  const periodStartIso = new Date(nowMs - 60_000).toISOString();
  const periodEndIso = new Date(nowMs + 60_000).toISOString();
  const d1 = createDeterministicD1Supabase();
  const d1Store = actual.entitlementStore.createCommentTranslatorCreatorEntitlementSupabaseStore({
    supabase: d1.supabase,
    nowMs: () => nowMs
  });
  const callerAuthority = actual.entitlement.authorizeCommentTranslatorCreatorCaller({ callerUserId: "fixture-owner" });
  assert.deepEqual(callerAuthority, { status: "authenticated", ownerUserId: "fixture-owner" });

  const defaultAuthorization = await actual.entitlement.authorizeCommentTranslatorCreatorPaidProvider({
    callerAuthority,
    entitlementStore: d1Store,
    nowMs: () => nowMs
  });
  assert.deepEqual(
    defaultAuthorization,
    { status: "fail-closed", reason: "activation-closed" },
    "actual NC-E1 default policy stops before the actual NC-D1 read"
  );
  assert.equal(d1.readCount, 0, "closed actual NC-E1 creates no downstream D1 read");

  const closedProvider = createActualProviderFixture({
    actual,
    callerAuthority,
    entitlementStore: d1Store,
    activationPolicy: actual.entitlement.commentTranslatorCreatorPaidActivationPolicy,
    nowMs
  });
  const closedProviderResult = await closedProvider.runtime.execute(createActualProviderRequest(callerAuthority));
  assert.deepEqual(
    closedProviderResult,
    {
      status: "fail-closed",
      reason: "activation-closed",
      providerExecution: "not-started",
      translatedText: null,
      accounting: "not-committed",
      browserSafe: true
    },
    "actual NC-P1 consumes the closed NC-E1 authorization before glossary, provider, or NC-U1"
  );
  assert.deepEqual(
    closedProvider.calls,
    { budget: 0, provider: 0, usage: 0, glossary: 0 },
    "closed actual composition has zero downstream calls"
  );

  const fixtureOnlyHarness = {
    marker: fixture.fixtureHarness.marker,
    evidenceKind: fixture.evidence.kind,
    productionProof: fixture.evidence.productionProof,
    deployedProof: fixture.fixtureHarness.deployedProof
  };
  for (const invalidHarness of [
    { ...fixtureOnlyHarness, marker: "wrong-marker" },
    { ...fixtureOnlyHarness, evidenceKind: "local" },
    { ...fixtureOnlyHarness, productionProof: true },
    { ...fixtureOnlyHarness, deployedProof: true }
  ]) {
    assert.equal(
      isFixtureOnlyActualCompositionHarness(invalidHarness),
      false,
      "wrong marker, local evidence, production proof, and deployed proof cannot enable the actual fixture-only path"
    );
    assert.deepEqual(
      createFixtureOnlyActualActivationPolicies(invalidHarness),
      { billing: { status: "closed" }, entitlement: { status: "closed" } },
      "an invalid fixture-only harness remains closed at each actual runtime entrypoint"
    );
  }
  assert.equal(isFixtureOnlyActualCompositionHarness(fixtureOnlyHarness), true, "the explicit local fixture-only harness is bounded");
  const fixtureOnlyPolicies = createFixtureOnlyActualActivationPolicies(fixtureOnlyHarness);
  assert.deepEqual(
    fixtureOnlyPolicies,
    {
      billing: { status: "allowed", authority: "deterministic-fixture" },
      entitlement: { status: "allowed", authority: "server-owned-approved" }
    },
    "only the bounded fixture-only guard creates local actual-runtime activation policies"
  );

  const closedWebhook = await actual.billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-body",
    signature: "fixture-signature",
    dependencies: createActualWebhookDependencies({
      activationPolicy: actual.billing.commentTranslatorCreatorBillingActivationPolicy,
      event: createActualCanonicalCreatorEvent({ type: "customer.subscription.updated", periodStartIso, periodEndIso }),
      entitlementWriter: d1Store
    })
  });
  assert.deepEqual(closedWebhook, { status: "not-applied", reason: "activation-closed", retryable: false });
  assert.equal(d1.signedEvidenceWrites, 0, "closed actual NC-B1 cannot write NC-D1");

  const checkoutResult = await actual.billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-body",
    signature: "fixture-signature",
    dependencies: createActualWebhookDependencies({
      activationPolicy: fixtureOnlyPolicies.billing,
      event: createActualCanonicalCreatorEvent({ type: "checkout.session.completed", periodStartIso: null, periodEndIso: null }),
      entitlementWriter: d1Store
    })
  });
  assert.deepEqual(checkoutResult, { status: "ignored", reason: "checkout-redirect-not-evidence" });
  assert.equal(d1.signedEvidenceWrites, 0, "Checkout completion does not update the actual NC-D1 authority");

  const appliedEvidence = await actual.billing.applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody: "fixture-body",
    signature: "fixture-signature",
    dependencies: createActualWebhookDependencies({
      activationPolicy: fixtureOnlyPolicies.billing,
      event: createActualCanonicalCreatorEvent({ type: "customer.subscription.updated", periodStartIso, periodEndIso }),
      entitlementWriter: d1Store
    })
  });
  assert.deepEqual(appliedEvidence, { status: "applied", entitlement: "active" });
  assert.equal(d1.signedEvidenceWrites, 1, "actual NC-B1 signed evidence updates the actual NC-D1 store seam once");

  const allowedPolicy = fixtureOnlyPolicies.entitlement;
  const allowedAuthorization = await actual.entitlement.authorizeCommentTranslatorCreatorPaidProvider({
    callerAuthority,
    entitlementStore: d1Store,
    activationPolicy: allowedPolicy,
    nowMs: () => nowMs
  });
  assert.equal(allowedAuthorization.status, "ready", "actual NC-E1 consumes the actual NC-D1 signed entitlement read");
  assert.ok(d1.readCount > 0, "the fixture-only allowed branch observes the actual D1 read authority");

  const successProvider = createActualProviderFixture({ actual, callerAuthority, entitlementStore: d1Store, activationPolicy: allowedPolicy, nowMs });
  const glossaryContext = await successProvider.glossaryRuntime.resolveProviderContext({ callerAuthority, targetLanguage: "ja" });
  assert.deepEqual(glossaryContext, { status: "ready", glossaryTerms: ["fixture-term=>fixture-replacement"], glossaryVersion: "fixture-v1" });
  assert.doesNotMatch(JSON.stringify(glossaryContext), /fixture-note/, "actual NC-C1 excludes notes from actual NC-P1 context");
  assert.equal(successProvider.calls.glossary, 1, "the direct actual NC-C1 safe projection is read once before NC-P1 composition");
  const paidProviderResult = await successProvider.runtime.execute(createActualProviderRequest(callerAuthority));
  assert.equal(paidProviderResult.status, "success", "actual NC-P1 returns only after actual NC-U1 records provider execution");
  assert.equal(paidProviderResult.accounting, "provider-success-accounting-committed");
  assert.deepEqual(
    successProvider.calls,
    { budget: 1, provider: 1, usage: 1, glossary: 2 },
    "actual NC-P1 performs one additional NC-C1 read then one provider and NC-U1 success write"
  );

  const preBudgetFailure = createActualProviderFixture({
    actual,
    callerAuthority,
    entitlementStore: d1Store,
    activationPolicy: allowedPolicy,
    nowMs,
    budgetFailure: "over-limit"
  });
  const preBudgetFailureResult = await preBudgetFailure.runtime.execute(createActualProviderRequest(callerAuthority));
  assert.deepEqual(
    preBudgetFailureResult,
    {
      status: "fail-closed",
      reason: "budget-over-limit",
      providerExecution: "not-started",
      translatedText: null,
      accounting: "not-committed",
      browserSafe: true
    },
    "actual pre-provider budget/quota rejection fails closed before provider execution"
  );
  assert.deepEqual(
    {
      budget: preBudgetFailure.calls.budget,
      provider: preBudgetFailure.calls.provider,
      usage: preBudgetFailure.calls.usage
    },
    { budget: 1, provider: 0, usage: 0 },
    "actual pre-provider budget/quota rejection reaches neither provider nor NC-U1"
  );
  assert.equal(preBudgetFailure.calls.glossary, 1, "actual NC-P1 prepares glossary context before the pre-provider budget check");

  const providerFailure = createActualProviderFixture({ actual, callerAuthority, entitlementStore: d1Store, activationPolicy: allowedPolicy, nowMs, providerFailure: true });
  const providerFailureResult = await providerFailure.runtime.execute(createActualProviderRequest(callerAuthority));
  assert.deepEqual(
    providerFailureResult,
    {
      status: "fail-closed",
      reason: "provider-terminal",
      providerExecution: "failed",
      translatedText: null,
      accounting: "not-committed",
      browserSafe: true
    },
    "actual provider terminal failure is distinct from pre-provider budget rejection"
  );
  assert.deepEqual(
    {
      budget: providerFailure.calls.budget,
      provider: providerFailure.calls.provider,
      usage: providerFailure.calls.usage
    },
    { budget: 1, provider: 1, usage: 0 },
    "actual provider terminal failure calls the provider once and never commits NC-U1 usage"
  );
  const accountingFailure = createActualProviderFixture({ actual, callerAuthority, entitlementStore: d1Store, activationPolicy: allowedPolicy, nowMs, accountingFailure: true });
  const accountingFailureResult = await accountingFailure.runtime.execute(createActualProviderRequest(callerAuthority));
  assert.deepEqual(
    accountingFailureResult,
    {
      status: "fail-closed",
      reason: "accounting-unavailable",
      providerExecution: "succeeded-accounting-failed",
      translatedText: null,
      accounting: "not-committed",
      browserSafe: true
    },
    "actual post-provider successful work with usage commit failure fails closed without a translation result"
  );
  assert.deepEqual(
    {
      budget: accountingFailure.calls.budget,
      provider: accountingFailure.calls.provider,
      usage: accountingFailure.calls.usage
    },
    { budget: 1, provider: 1, usage: 1 },
    "actual post-provider successful work reaches NC-U1 once, then fails when its usage commit is rejected"
  );

  const priority = actual.priority.resolveCommentTranslatorPriorityClassification({
    kind: "super-chat",
    role: null,
    purchase: { kind: "super-chat" },
    member: null,
    moderation: "visible"
  });
  assert.equal(priority.category, "super-chat", "actual NC-V1 classifies the browser-safe shared row");
  const safeRow = {
    sourceAttributionLabel: "Source: YouTube Live Chat",
    authorLabel: "YouTube viewer",
    authorDisplayName: "fixture viewer",
    originalText: "fixture source",
    translatedText: paidProviderResult.status === "success" ? paidProviderResult.translatedText : null,
    translationStatus: "translated-f10",
    moderationLabel: "visible",
    priority,
    badgeLabel: "super-chat",
    purchaseLabel: "fixture purchase",
    publishedAtIso: nowIso,
    messageReferenceId: "fixture-message"
  };
  const projected = actual.historyProjection.projectCommentTranslatorCreatorSafeHistoryRow({
    row: safeRow,
    ownerUserId: "fixture-owner",
    sessionReferenceId: "fixture-session",
    nowMs
  });
  assert.ok(projected, "actual NC-H1 projects the actual NC-P1/V1 browser-safe row");
  assert.deepEqual(
    Object.keys(projected).sort(),
    [
      "authorDisplayName",
      "authorLabel",
      "badgeLabel",
      "messageCorrelationDigest",
      "moderationLabel",
      "originalText",
      "priority",
      "purchaseLabel",
      "sourceAttributionLabel",
      "sourcePublishedAtIso",
      "translatedText",
      "translationStatus"
    ],
    "actual NC-H1 snapshot has exactly its documented safe fields plus only the correlation digest"
  );
  assert.match(projected.messageCorrelationDigest, /^[a-f0-9]{64}$/, "actual NC-H1 snapshot correlation is a lowercase SHA-256 digest");
  assert.deepEqual(projected.priority, priority, "actual NC-H1 snapshot retains the actual NC-V1 priority projection");
  assert.equal(projected.translatedText, paidProviderResult.translatedText, "actual NC-H1 snapshot retains the actual NC-P1 translated text");
  const serializedSnapshot = JSON.stringify(projected);
  for (const forbiddenSnapshotField of ["ownerUserId", "sessionReferenceId", "messageReferenceId"]) {
    assert.equal(Object.hasOwn(projected, forbiddenSnapshotField), false, `actual NC-H1 snapshot excludes ${forbiddenSnapshotField}`);
    assert.doesNotMatch(serializedSnapshot, new RegExp(forbiddenSnapshotField), `actual NC-H1 snapshot serialization excludes ${forbiddenSnapshotField}`);
  }
  assert.doesNotMatch(serializedSnapshot, /fixture-(?:owner|session|message)/, "actual NC-H1 snapshot contains no raw private identifier values");
  const historyRpc = createDeterministicHistorySupabaseRpc(nowIso);
  const history = actual.historyStore.createCommentTranslatorCreatorSafeHistorySupabaseStore({
    supabase: historyRpc.supabase
  });
  const historyRuntime = actual.historyRuntime.createCommentTranslatorCreatorSafeHistoryRuntime({
    historyStore: history,
    paidAuthority: async () => {
      const result = await actual.entitlement.authorizeCommentTranslatorCreatorPaidProvider({
        callerAuthority,
        entitlementStore: d1Store,
        activationPolicy: allowedPolicy,
        nowMs: () => nowMs
      });
      return result.status === "ready" ? { status: "ready" } : { status: "fail-closed", reason: "paid-inactive" };
    },
    sessionAuthority: { async readCurrentForOwner() { return { status: "ready", sessionReferenceId: "fixture-session" }; } },
    readSafeFeed: async () => ({ status: "ready", rows: [projected] })
  });
  assert.deepEqual(await historyRuntime.capture({ callerAuthority, nowMs }), { status: "recorded", recordedCount: 1 });
  assert.equal(historyRpc.appendedRows.length, 1, "actual NC-H1 Supabase store sends one captured RPC snapshot row");
  assert.deepEqual(
    Object.keys(historyRpc.appendedRows[0]).sort(),
    [
      "author_display_name",
      "author_label",
      "badge_label",
      "message_correlation_digest",
      "moderation_label",
      "original_text",
      "purchase_label",
      "source_attribution_label",
      "source_published_at",
      "translated_text",
      "translation_status"
    ],
    "actual NC-H1 Supabase store serializes the snapshot through its exact snake_case RPC allowlist"
  );
  const historyRead = await historyRuntime.read({ callerAuthority, nowMs });
  assert.deepEqual(Object.keys(historyRead).sort(), ["rows", "status"], "actual NC-H1 runtime read result has exactly status and rows");
  assert.equal(historyRead.status, "ready", "actual NC-H1 stores and reads the actual safe projection");
  assert.equal(historyRead.rows.length, 1, "actual NC-H1 runtime read returns the one projected safe row");
  const historyRow = historyRead.rows[0];
  assert.deepEqual(
    Object.keys(historyRow).sort(),
    [
      "authorDisplayName",
      "authorLabel",
      "badgeLabel",
      "moderationLabel",
      "originalText",
      "priority",
      "purchaseLabel",
      "recordedAtIso",
      "sourceAttributionLabel",
      "sourcePublishedAtIso",
      "translatedText",
      "translationStatus"
    ],
    "actual NC-H1 runtime row contains only documented safe row fields with source and recorded timestamps"
  );
  assert.deepEqual(
    historyRow.priority,
    actual.priority.readCommentTranslatorProjectedPriority(undefined),
    "actual NC-H1 Supabase parser deliberately downgrades persisted priority to standard"
  );
  assert.equal(historyRow.priority.category, "standard", "actual NC-H1 store/browser boundary observes the safe standard-priority downgrade");
  assert.equal(historyRow.translatedText, paidProviderResult.translatedText, "actual NC-H1 runtime row retains the actual NC-P1 translated text");
  const serializedHistoryRow = JSON.stringify(historyRow);
  for (const forbiddenHistoryField of [
    "messageCorrelationDigest",
    "ownerUserId",
    "sessionReferenceId",
    "messageReferenceId",
    "message_correlation_digest",
    "owner_user_id",
    "session_reference_id",
    "message_reference_id",
    "unexpectedRawField",
    "unexpected_raw_field"
  ]) {
    assert.equal(Object.hasOwn(historyRow, forbiddenHistoryField), false, `actual NC-H1 runtime row excludes ${forbiddenHistoryField}`);
    assert.doesNotMatch(serializedHistoryRow, new RegExp(forbiddenHistoryField), `actual NC-H1 runtime row serialization excludes ${forbiddenHistoryField}`);
  }
  assert.doesNotMatch(serializedHistoryRow, /fixture-(?:owner|session|message|unexpected)/, "actual NC-H1 runtime row contains no raw private identifier values");

  await verifyActualCapabilityPairs({ actual, callerAuthority, nowMs });
}

function isFixtureOnlyActualCompositionHarness(value) {
  return value?.marker === fixture.fixtureHarness.marker &&
    value.evidenceKind === fixture.evidence.kind && value.evidenceKind === "fixture" &&
    value.productionProof === fixture.evidence.productionProof && value.productionProof === false &&
    value.deployedProof === fixture.fixtureHarness.deployedProof && value.deployedProof === false;
}

function createFixtureOnlyActualActivationPolicies(value) {
  if (!isFixtureOnlyActualCompositionHarness(value)) {
    return { billing: { status: "closed" }, entitlement: { status: "closed" } };
  }
  return {
    billing: { status: "allowed", authority: "deterministic-fixture" },
    entitlement: { status: "allowed", authority: "server-owned-approved" }
  };
}

function createDeterministicD1Supabase() {
  let row = null;
  const state = { readCount: 0, signedEvidenceWrites: 0 };
  const supabase = {
    from() {
      const query = {
        select() { return query; },
        eq() { return query; },
        async single() {
          state.readCount += 1;
          return row ? { data: row, error: null } : { data: null, error: { code: "PGRST116" } };
        }
      };
      return query;
    },
    async rpc(functionName, parameters) {
      if (functionName !== "apply_comment_translator_creator_signed_entitlement_evidence") {
        return { data: { status: "rejected", reason: "unsupported-local-rpc" }, error: null };
      }
      if (
        parameters.p_signature_verified !== true || parameters.p_status !== "active" ||
        parameters.p_plan_key !== "creator" || parameters.p_product_compatibility_key !== "comment_translator_creator_v1" ||
        parameters.p_price_compatibility_key !== "creator_monthly_jpy_980_v1"
      ) return { data: { status: "rejected", reason: "fixture-authority-rejected" }, error: null };
      state.signedEvidenceWrites += 1;
      row = {
        id: "fixture-entitlement",
        plan_key: "creator",
        product_compatibility_key: "comment_translator_creator_v1",
        price_compatibility_key: "creator_monthly_jpy_980_v1",
        status: "active",
        period_start: parameters.p_period_start,
        period_end: parameters.p_period_end,
        last_event_created_at: parameters.p_event_created_at,
        created_at: parameters.p_event_created_at,
        updated_at: parameters.p_event_created_at
      };
      return { data: { status: "applied" }, error: null };
    }
  };
  return { supabase, get readCount() { return state.readCount; }, get signedEvidenceWrites() { return state.signedEvidenceWrites; } };
}

function createActualCanonicalCreatorEvent({ type, periodStartIso, periodEndIso }) {
  return {
    normalizationStatus: "ready",
    type,
    evidenceDisposition: "exact-creator-price",
    eventReference: "fixture-evidence",
    eventCreatedAtIso: "2026-08-04T00:00:00.000Z",
    customerReference: "fixture-customer",
    subscriptionReference: "fixture-subscription",
    ownerReference: "fixture-owner-reference",
    productCompatibilityKey: "comment_translator_creator_v1",
    priceCompatibilityKey: "creator_monthly_jpy_980_v1",
    subscriptionStatus: "active",
    periodStartIso,
    periodEndIso,
    checkoutLifecycle: null,
    checkoutSessionReference: null
  };
}

function createActualWebhookDependencies({ activationPolicy, event, entitlementWriter }) {
  return {
    activationPolicy,
    webhookSecret: "fixture-webhook-configuration",
    verifier: { async constructEvent() { return event; } },
    ownerMapping: {
      async resolveOwner() {
        return { status: "resolved", ownerUserId: "fixture-owner", reservationId: "fixture-reservation" };
      }
    },
    entitlementWriter,
    checkoutLifecycleOwnerMapping: { async resolveCheckoutOwner() { return { status: "mismatch" }; } },
    checkoutLifecycleWriter: entitlementWriter
  };
}

function createActualProviderFixture({
  actual,
  callerAuthority,
  entitlementStore,
  activationPolicy,
  nowMs,
  providerFailure = false,
  accountingFailure = false,
  budgetFailure = null
}) {
  const calls = { budget: 0, provider: 0, usage: 0, glossary: 0 };
  const glossaryRuntime = actual.glossary.createCommentTranslatorCreatorGlossaryRuntime({
    glossaryStore: {
      async readGlossary() {
        calls.glossary += 1;
        return {
          status: "ready",
          termCount: 1,
          version: 1,
          effectiveVersion: "fixture-v1",
          entries: [{ term: "fixture-term", replacement: "fixture-replacement", note: "fixture-note", languageScope: "ja", normalizedTerm: "fixture-term" }]
        };
      },
      async replaceGlossary() { return { status: "rejected", reason: "unreadable" }; }
    }
  });
  const usageRuntime = actual.usage.createCommentTranslatorCreatorUsageRuntime({
    usageStore: {
      async recordProviderExecutedUsage() {
        calls.usage += 1;
        return accountingFailure
          ? { status: "rejected", reason: "duplicate" }
          : { status: "recorded", counts: { providerExecutionCount: 1, providerInputCharacterCount: 14, translatedCharacterCount: 18 } };
      }
    }
  });
  const primaryProvider = {
    id: "openai-mini",
    name: "fixture-provider",
    configurationStatus: "ready",
    runtimeScope: "server-runtime-only",
    secretBoundary: { runtime: "server-env-only", clientBundle: "forbidden", fixtures: "forbidden", docsAndTaskNotes: "no-secret-values" },
    async translate(request) {
      calls.provider += 1;
      if (providerFailure) return { type: "terminal-error", code: "policy-blocked", message: "fixture failure", retry: { retryable: false } };
      return {
        type: "translated",
        translatedText: "fixture translation",
        detectedSourceLanguage: "en",
        confidence: 1,
        cacheOutcome: "miss",
        usageHandoff: request.usageHandoff
      };
    }
  };
  const cache = new Map();
  const runtime = actual.provider.createCommentTranslatorCreatorPaidProviderRuntime({
    entitlementAuthorizer: {
      authorize(authority) {
        return actual.entitlement.authorizeCommentTranslatorCreatorPaidProvider({
          callerAuthority: authority,
          entitlementStore,
          activationPolicy,
          nowMs: () => nowMs
        });
      }
    },
    budgetAuthorizer: {
      async authorize() {
        calls.budget += 1;
        return budgetFailure ? { status: "blocked", reason: budgetFailure } : { status: "authorized" };
      }
    },
    glossaryRuntime,
    usageRuntime,
    providerRequestFactory: ({ comment, targetLanguage, glossaryTerms, glossaryVersion }) => ({
      status: "ready",
      providerRequest: {
        requestId: "fixture-request",
        input: { kind: "live-comment", text: comment.text, sourceLanguage: "en", targetLanguage },
        glossary: { terms: glossaryTerms, version: glossaryVersion },
        cache: {
          lookupKey: null,
          keyMaterial: {
            normalizedTextHash: "fixture-hash",
            sourceLanguage: "en",
            targetLanguage,
            providerCapabilityVersion: "fixture-v1",
            glossaryVersion,
            moderationPolicyVersion: "fixture-v1",
            excludes: []
          }
        },
        privacy: { logRetention: "short-lived-only", rawTextLogging: "disabled-by-default", piiMinimization: "excluded", moderationSkipReason: null },
        usageHandoff: { meteringEventId: "fixture-meter", providerId: "fixture", billingCategory: "translation", estimatedUnits: 1, cacheOutcome: "miss", enforcement: "not-implemented", databaseWrite: "not-implemented", logPolicy: "short-lived-only" }
      }
    }),
    providers: { openAiMini: primaryProvider, azure: null },
    cache: { read(key) { return cache.get(key) ?? null; }, write(key, value) { cache.set(key, value); } },
    timeoutMs: 10
  });
  return { runtime, glossaryRuntime, calls, callerAuthority };
}

function createActualProviderRequest(callerAuthority) {
  return {
    callerAuthority,
    comment: { commentId: "fixture-comment", publishedAt: "2026-08-04T00:00:00.000Z", text: "fixture input", platformLanguageHint: "en", authorDisplayName: "fixture viewer" },
    targetLanguage: "ja"
  };
}

function createDeterministicHistorySupabaseRpc(nowIso) {
  let appendedRows = [];
  const supabase = {
    async rpc(functionName, parameters) {
      if (functionName === "append_comment_translator_creator_safe_history") {
        if (!Array.isArray(parameters.p_rows)) return { data: null, error: { code: "fixture-invalid-rows" } };
        appendedRows = parameters.p_rows;
        return { data: { status: "recorded", recorded_count: appendedRows.length }, error: null };
      }
      if (functionName === "read_comment_translator_creator_safe_history") {
        return {
          data: {
            status: "ready",
            evaluated_at: nowIso,
            rows: appendedRows.map((row) => ({
              ...row,
              recorded_at: nowIso,
              owner_user_id: "fixture-owner",
              session_reference_id: "fixture-session",
              message_reference_id: "fixture-message",
              unexpected_raw_field: "fixture-unexpected"
            }))
          },
          error: null
        };
      }
      if (functionName === "cleanup_comment_translator_creator_safe_history_for_owner") {
        return { data: { status: "deleted", removed_count: 0 }, error: null };
      }
      return { data: null, error: { code: "fixture-unsupported-rpc" } };
    }
  };
  return { supabase, get appendedRows() { return appendedRows; } };
}

async function verifyActualCapabilityPairs({ actual, callerAuthority, nowMs }) {
  const obsPair = createDeterministicObsPairStore();
  const obsRuntime = actual.obsToken.createCommentTranslatorCreatorObsTokenRuntime({ tokenStore: obsPair.tokenStore, sessionAuthority: obsPair.sessionAuthority });
  const obsIssued = await obsRuntime.issue({ callerAuthority, nowMs });
  assert.equal(obsIssued.status, "issued", "actual NC-O1 issues a deterministic local capability input");
  const obsRedeemed = await actual.obsBrowser.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: obsIssued.token,
    browserSessionStore: obsPair.browserStore,
    nowMs,
    createCapability: () => "B".repeat(43)
  });
  assert.equal(obsRedeemed.status, "ready", "actual NC-O2 accepts the actual NC-O1 issued value through its browser-session store seam");
  assert.equal(
    (await actual.obsBrowser.authorizeCommentTranslatorCreatorObsOverlayBrowserSession({ capability: obsRedeemed.capability, tokenRuntime: obsRuntime, browserSessionStore: obsPair.browserStore, nowMs })).status,
    "authorized",
    "actual NC-O1 to NC-O2 revalidates the same current session record"
  );

  const moderatorPair = createDeterministicModeratorPairStore();
  const moderatorRuntime = actual.moderatorToken.createCommentTranslatorCreatorModeratorTokenRuntime({ tokenStore: moderatorPair.tokenStore, sessionAuthority: moderatorPair.sessionAuthority });
  const moderatorIssued = await moderatorRuntime.issue({ callerAuthority, nowMs });
  assert.equal(moderatorIssued.status, "issued", "actual NC-M1 issues a deterministic local capability input");
  const moderatorRedeemed = await actual.moderatorBrowser.redeemCommentTranslatorCreatorModeratorBrowserSession({
    presentedToken: moderatorIssued.token,
    browserSessionStore: moderatorPair.browserStore,
    nowMs,
    createCapability: () => "C".repeat(43)
  });
  assert.equal(moderatorRedeemed.status, "ready", "actual NC-M2 accepts the actual NC-M1 issued value through its separate store seam");
  assert.equal(
    (await actual.moderatorBrowser.authorizeCommentTranslatorCreatorModeratorBrowserSession({ capability: moderatorRedeemed.capability, tokenRuntime: moderatorRuntime, browserSessionStore: moderatorPair.browserStore, nowMs })).status,
    "authorized",
    "actual NC-M1 to NC-M2 revalidates the same current session record"
  );
}

function createDeterministicObsPairStore() {
  let current = null;
  let browserRecord = null;
  const sessionAuthority = {
    async readCurrentForOwner(ownerUserId) {
      return ownerUserId === "fixture-owner"
        ? { status: "active", sessionReferenceId: "fixture-session", expiresAtMs: Date.parse("2026-08-04T00:01:00.000Z") }
        : { status: "unavailable", reason: "active-session-missing" };
    }
  };
  const tokenStore = {
    async issueOrRotate({ record }) {
      current = { ...record, scope: "obs-overlay-read", version: (current?.version ?? 0) + 1 };
      return { status: "applied" };
    },
    async readCurrent({ ownerUserId }) {
      return current?.ownerUserId === ownerUserId ? { status: "ready", record: current } : { status: "missing" };
    },
    async readByDigest({ tokenDigest }) {
      return current?.tokenDigest === tokenDigest ? { status: "ready", record: current } : { status: "missing" };
    },
    async redeemByDigest({ tokenDigest, nowIso }) {
      if (!current || current.tokenDigest !== tokenDigest || current.redeemedAtIso !== null) return { status: "denied", reason: "invalid-token" };
      current = { ...current, redeemedAtIso: nowIso };
      return { status: "redeemed" };
    },
    async revokeCurrent() { return { status: "missing" }; }
  };
  const browserStore = {
    async readByDigest(capabilityDigest) {
      return browserRecord?.capabilityDigest === capabilityDigest ? { status: "ready", record: browserRecord } : { status: "missing" };
    },
    async redeemAndWriteCurrent({ tokenDigest, capabilityDigest, nowIso }) {
      const redeemed = await tokenStore.redeemByDigest({ tokenDigest, nowIso });
      if (redeemed.status !== "redeemed" || !current) return { status: "denied", reason: "invalid-token" };
      browserRecord = {
        ownerUserId: current.ownerUserId,
        sessionReferenceId: current.sessionReferenceId,
        tokenVersion: current.version,
        capabilityDigest,
        issuedAtIso: nowIso,
        expiresAtIso: current.expiresAtIso
      };
      return { status: "redeemed", record: browserRecord };
    }
  };
  return { tokenStore, browserStore, sessionAuthority };
}

function createDeterministicModeratorPairStore() {
  let current = null;
  let browserRecord = null;
  const sessionAuthority = {
    async readCurrentForOwner(ownerUserId) {
      return ownerUserId === "fixture-owner"
        ? { status: "active", sessionReferenceId: "fixture-session", expiresAtMs: Date.parse("2026-08-04T00:01:00.000Z") }
        : { status: "unavailable", reason: "active-session-missing" };
    }
  };
  const tokenStore = {
    async issueCurrent({ record }) {
      current = { ...record, scope: "moderator-share-read", version: (current?.version ?? 0) + 1 };
      return { status: "applied" };
    },
    async readCurrent({ ownerUserId }) {
      return current?.ownerUserId === ownerUserId ? { status: "ready", record: current } : { status: "missing" };
    },
    async readByDigest({ tokenDigest }) {
      return current?.tokenDigest === tokenDigest ? { status: "ready", record: current } : { status: "missing" };
    },
    async consumeCurrent(tokenDigest, redeemedAtIso) {
      if (!current || current.tokenDigest !== tokenDigest || current.redeemedAtIso !== null) return false;
      current = { ...current, redeemedAtIso };
      return true;
    },
    async revokeCurrent() { return { status: "missing" }; }
  };
  const browserStore = {
    async readByDigest({ capabilityDigest }) {
      return browserRecord?.capabilityDigest === capabilityDigest ? { status: "ready", record: browserRecord } : { status: "missing" };
    },
    async redeemAndWriteCurrent({ tokenDigest, capabilityDigest, nowIso }) {
      const accepted = await tokenStore.consumeCurrent(tokenDigest, nowIso);
      if (!accepted || !current) return { status: "denied", reason: "invalid-token" };
      browserRecord = {
        ownerUserId: current.ownerUserId,
        sessionReferenceId: current.sessionReferenceId,
        tokenVersion: current.version,
        capabilityDigest,
        issuedAtIso: nowIso,
        expiresAtIso: current.expiresAtIso
      };
      return { status: "redeemed", record: browserRecord };
    }
  };
  return { tokenStore, browserStore, sessionAuthority };
}

function runPriorLaneContracts() {
  assert.equal(priorLaneContracts.length, 14, "the local characterization baseline has exactly 14 contract commands");
  for (const relativePath of priorLaneContracts) {
    assert.match(relativePath, /^scripts\/comment-translator-creator-nc-[a-z0-9-]+-contract\.mjs$/);
    const result = spawnSync(process.execPath, [relativePath], {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000
    });
    assert.equal(
      result.status,
      0,
      `prior local contract failed: ${relativePath} (exit=${String(result.status)})`
    );
  }
}

verifyLegacyCrosswalk();
verifyFixtureAuthorityMatrix();
await verifyActualNcQ1RuntimeComposition();
runPriorLaneContracts();
process.stdout.write("comment translator Creator NC-Q1 integrated QA contract passed (14/14 local lanes; fixture/local only; activation=closed)\n");
