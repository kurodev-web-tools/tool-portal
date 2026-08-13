import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const costPath = "lib/comment-translator-paid-cost-ledger.ts";
const usageStorePath = "lib/comment-translator-paid-usage-store.ts";
const sessionTypesPath = "lib/comment-translator-session-types.ts";
const sessionPolicyPath = "lib/comment-translator-session-policy.ts";
const freeLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const durableFreeStorePath = "lib/comment-translator-durable-usage-counter-store.ts";
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const migrationPath = "supabase/migrations/20260812120000_comment_translator_paid_core_v1.sql";

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

assert.ok(exists(costPath), "Task 5 paid cost ledger exists");
const cost = read(costPath);
const usage = read(usageStorePath);
const sessionTypes = read(sessionTypesPath);
const sessionPolicy = read(sessionPolicyPath);
const freeLedger = read(freeLedgerPath);
const durableFreeStore = read(durableFreeStorePath);
const billingRuntime = read(billingRuntimePath);
const migration = read(migrationPath);

assert.match(cost, /^import "server-only";/m, "paid cost ledger is server-only");
for (const constant of [
  "paidBillingPeriodCharacterLimit: 500_000",
  "paidPerItemCharacterLimit: 500",
  "paidIndividualCostLimitMicros: 3_000_000",
  "paidGlobalCostLimitMicros: 25_000_000",
  "paidAzureFallbackCharacterLimit: 200_000",
  "paidAzurePhysicalLimitCharacters: 2_000_000",
  "paidAzurePhysicalSafetyMarginCharacters: 600_000",
  "paidProviderReservationTtlMs: 120_000",
  "paidLogicalAttemptTtlMs: 24 * 60 * 60 * 1_000"
]) {
  assert.match(cost, new RegExp(constant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `Task 5 fixes ${constant}`);
}

for (const required of [
  "countCommentTranslatorPaidUnicodeCodePoints",
  "validateCommentTranslatorPaidInputItem",
  "createCommentTranslatorPaidAttemptId",
  "assessCommentTranslatorPaidCostReservation",
  "settleCommentTranslatorPaidCostReservation",
  "assessCommentTranslatorPaidAzureFallbackCapacity",
  "resolveCommentTranslatorPaidTranslationDisposition",
  "shouldConsumeCommentTranslatorPaidCharacters",
  "settleCommentTranslatorPaidLogicalAttempt",
  "CommentTranslatorPaidLogicalAttemptState",
  "CommentTranslatorPaidCostReservationState",
  "unknown-charge",
  "HMAC",
  "createHmac(\"sha256\"",
  "base64url",
  "timingSafeEqual"
]) {
  assert.match(cost, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `cost ledger contains ${required}`);
}

assert.doesNotMatch(cost, /fetch\(|axios|providerResponse|rawCommentText|commentHash/i, "cost policy has no Provider adapter or raw content path");
assert.match(cost, /providerMessageId/, "attempt identity accepts the transient provider message input only at the HMAC boundary");
assert.match(cost, /createHmac\("sha256"/, "attempt identity hashes transient inputs before returning an opaque value");
assert.match(cost, /const attemptId = `ctpa_\$\{/, "attempt identity returns an opaque prefixed value rather than source identifiers");
assert.match(cost, /export function isCommentTranslatorPaidAttemptId\(/, "attempt identity exports its persistence shape predicate");
assert.match(cost, /\^ctpa_\[A-Za-z0-9_-\]\{1,32\}_\[A-Za-z0-9_-\]\{43\}\$/, "attempt identity shape fixes key version and 43-character base64url digest");
assert.match(cost, /const expiresAtMs = nowMs \+ Math\.min\(ttlMs, commentTranslatorPaidCostLedgerContract\.paidLogicalAttemptTtlMs\)/, "attempt identity is explicitly short-lived and bounded");
assert.match(cost, /retryFallbackBoundary:\s*"same-logical-attempt-separate-provider-attempts"/, "retry and fallback remain under one logical attempt");

for (const disposition of ["provider", "cache-hit", "empty", "duplicate", "language-skip"]) {
  assert.match(cost, new RegExp(`"${disposition}"`), `disposition ${disposition} is modeled`);
}
assert.match(cost, /nonConsuming:\s*true/, "non-provider dispositions are non-consuming");
assert.match(cost, /codePoints[\s\S]{0,180}paidPerItemCharacterLimit|paidPerItemCharacterLimit[\s\S]{0,180}codePoints/, "whole-item code-point validation precedes reservation");
assert.match(cost, /partial[\s-]+translation|whole[\s-]+item|no-partial/i, "oversized input is rejected as a whole item");

assert.match(cost, /individualCommittedCostMicros[\s\S]{0,220}globalCommittedCostMicros/, "individual and global cost buckets are evaluated together");
assert.match(cost, /before-provider|pre-provider|provider[\s\S]{0,160}reserve/i, "cost reservation is a pre-provider gate");
assert.match(cost, /unknown-charge[\s\S]{0,260}(?:retain|hold|reserved|conservative)/i, "unknown charge remains conservatively retained");
assert.match(cost, /committedCostMicros[\s\S]{0,180}reservedCostMicros|reservedCostMicros[\s\S]{0,180}committedCostMicros/, "cost settlement separates reserved and committed amounts");
assert.match(cost, /at-most-once|once[\s\S]{0,140}committed|idempotent/i, "cost settlement is idempotent");

assert.match(
  cost,
  /const physicalProjectedCharacters = freeUsageCharacters\s*\+\s*paidFallbackReservedCharacters\s*\+\s*paidFallbackCommittedCharacters\s*\+\s*commentTranslatorPaidCostLedgerContract\.paidAzurePhysicalSafetyMarginCharacters\s*\+\s*requestedCharacters/,
  "Azure fallback uses the strict shared physical-capacity inequality"
);
assert.match(cost, /physicalProjectedCharacters\s*>=\s*commentTranslatorPaidCostLedgerContract\.paidAzurePhysicalLimitCharacters/, "Azure fallback rejects equality at the strict physical boundary");
assert.match(cost, /paidAzureFallbackCharacterLimit|logicalLimitCharacters/, "Azure fallback has a separate Paid logical limit");
assert.match(cost, /freeLedger[s:=][\s\S]{0,160}separate|separate[s\S]{0,160}Free ledger|free.*ledger.*not.*paid/i, "Paid Azure fallback is separate from the Free ledger");
assert.match(cost, /theoreticalFreeUsers:\s*60|strictFullFreeUsers:\s*59|F\s*<=\s*60|F\s*=\s*60/i, "Azure F boundary is explicit");

assert.match(sessionTypes, /monthlyProviderInputCharacterLimit\?:\s*number/, "session entitlement carries the character limit");
assert.match(sessionTypes, /paidIndividualCostLimitMicros\?:\s*number/, "session entitlement can carry the individual cost limit");
assert.match(sessionTypes, /paidGlobalCostLimitMicros\?:\s*number/, "session entitlement can carry the global cost limit");
assert.match(sessionTypes, /paid-character-quota-stop|paid-individual-cost-stop|paid-global-cost-stop/, "Paid stop reasons are typed");
assert.match(sessionPolicy, /monthlyProviderInputCharacterLimit:[\s\S]{0,200}commentTranslatorPaidCostLedgerContract\.paidBillingPeriodCharacterLimit/, "Paid entitlement fixes the 500k billing-period limit");
assert.match(sessionPolicy, /paidIndividualCostLimitMicros:[\s\S]{0,200}commentTranslatorPaidCostLedgerContract\.paidIndividualCostLimitMicros/, "Paid entitlement fixes the US$3 individual cost limit");
assert.match(sessionPolicy, /paidGlobalCostLimitMicros:[\s\S]{0,200}commentTranslatorPaidCostLedgerContract\.paidGlobalCostLimitMicros/, "Paid entitlement fixes the US$25 global cost limit");
assert.match(sessionPolicy, /paidAuthorityReadable|paidBillingPeriod|paidCostBudgetAvailable/, "Paid policy has an authority-readable fail-closed signal");
assert.match(sessionPolicy, /plan:\s*"paid"[\s\S]{0,700}paidAuthorityReadable:\s*false/, "Paid quota exhaustion or missing authority never falls back to the Free entitlement");

assert.match(usage, /implementationStage:\s*"comment-translator-paid-v1-task5/, "Paid usage store records the Task 5 stage");
assert.match(usage, /import \{ isCommentTranslatorPaidAttemptId \} from "@\/lib\/comment-translator-paid-cost-ledger";/, "Paid usage store imports the canonical attempt-id shape predicate");
for (const method of [
  "recordProviderHourlyDetail",
  "reserveBillingPeriodCharacters",
  "commitBillingPeriodCharacters",
  "releaseBillingPeriodCharacters",
  "abandonLogicalAttempt",
  "openaiAttempt",
  "extendOpenAiAttempt",
  "finalizeOpenAiAttempt",
  "reclaimOpenAiAttempt",
  "azureDirectFallback",
  "finalizeAzureDirectFallback",
  "reclaimAzureDirectFallback"
]) {
  assert.match(
    usage,
    new RegExp(`async ${method}\\(request\\) \\{[\\s\\S]{0,240}assertCommentTranslatorPaidAttemptId\\(request\\.attemptId\\)`),
    `${method} rejects arbitrary attempt ids before its RPC boundary`
  );
}
for (const [method, field] of [
  ["recordProviderHourlyDetail", "providerAttempt"],
  ["reserveBillingPeriodCharacters", "providerAttempt"],
  ["commitBillingPeriodCharacters", "providerAttempt"],
  ["releaseBillingPeriodCharacters", "providerAttempt"],
  ["abandonLogicalAttempt", "releasedProviderAttempt"],
  ["openaiAttempt", "providerAttempt"],
  ["extendOpenAiAttempt", "providerAttempt"],
  ["finalizeOpenAiAttempt", "providerAttempt"],
  ["reclaimOpenAiAttempt", "providerAttempt"],
  ["azureDirectFallback", "providerAttempt"],
  ["finalizeAzureDirectFallback", "providerAttempt"],
  ["reclaimAzureDirectFallback", "providerAttempt"]
]) {
  assert.match(
    usage,
    new RegExp(`async ${method}\\(request\\) \\{[\\s\\S]{0,360}assertBoundedOpaqueReference\\(request\\.${field}, "Paid provider attempt"\\)`),
    `${method} keeps provider_attempt as a separate bounded opaque reference`
  );
}
assert.match(usage, /pre-provider|atomic[s-]reservation|provider未呼出|provider.*before/i, "Paid usage store documents pre-provider atomic reservation");
assert.match(usage, /unreadable|failClosed|fail-closed/, "Paid usage store fails closed when authority is unreadable");
assert.doesNotMatch(usage, /rawProviderResponse\s*:/i, "Paid usage store defines no raw provider-response field");
assert.match(usage, /rawCommentText:\s*"forbidden"/i, "Paid usage store marks raw comment persistence as forbidden");
assert.match(freeLedger, /rawCommentText:\s*"never-recorded-by-design"/, "Free ledger raw comment boundary remains explicit");
assert.match(durableFreeStore, /comment_translator_usage_ledger_events/, "Free durable store remains on its existing ledger table");
assert.match(freeLedger, /paidFallbackLedgerIsolation:\s*"paid-fallback-and-cost-ledger-not-recorded-in-this-free-ledger"/, "Paid fallback and cost data remain outside the Free ledger");
assert.match(durableFreeStore, /paidFallbackLedgerAuthority:\s*"separate-comment_translator_paid_azure_fallback_buckets"/, "durable Free store names the separate Paid Azure ledger");

assert.match(migration, /billing_period_character_limit bigint not null default 500000/i, "migration keeps the billing-period character limit");
assert.match(migration, /individual_cost_limit_micros bigint not null default 3000000/i, "migration keeps the individual cost limit");
assert.match(migration, /global_cost_limit_micros bigint not null default 25000000/i, "migration keeps the global cost limit");
assert.match(migration, /azure_logical_limit_characters bigint not null default 200000/i, "migration keeps the separate Paid Azure logical limit");
assert.match(migration, /physical_safety_margin_characters bigint not null default 600000/i, "migration keeps the Azure safety margin");
assert.match(migration, /v_day_physical_total[\s\S]{0,500}>=\s*v_config\.physical_limit_characters/i, "migration rejects Azure equality at the strict boundary");
assert.match(migration, /create or replace function public\.ct_paid_finalize_azure_fallback[\s\S]+?p_outcome = 'completed'[\s\S]+?ct_paid_commit_billing_period_characters/i, "fallback success settles the shared logical character attempt");
assert.match(migration, /create or replace function public\.ct_paid_reclaim_azure_fallback[\s\S]+?ct_paid_settle_logical_attempt_after_provider_failure\(p_attempt_id, true, p_now\)/i, "unknown provider charge keeps conservative physical accounting while settling logical state safely");
assert.match(migration, /p_period_start[\s\S]{0,240}current_period_start|current_period_start[\s\S]{0,240}p_period_start/i, "Paid character reservation binds to the signed entitlement period");
assert.match(migration, /create or replace function public\.ct_paid_azure_direct_fallback[\s\S]+?v_owner_cost[\s\S]+?v_global_cost[\s\S]+?individual Paid cost limit is exhausted[\s\S]+?global Paid cost limit is exhausted/i, "Azure fallback cannot bypass readable individual and global Paid cost caps");
for (const table of [
  "comment_translator_paid_logical_attempts",
  "comment_translator_paid_attempt_receipts",
  "comment_translator_paid_provider_detail_source_receipts"
]) {
  const tableSource = new RegExp(`create table if not exists public\\.${table}[\\s\\S]+?\\n\\);`, "i").exec(migration)?.[0] ?? "";
  assert.match(
    tableSource,
    /check \(attempt_id ~ '\^ctpa_\[A-Za-z0-9_-\]\{1,32\}_\[A-Za-z0-9_-\]\{43\}\$'\)/i,
    `${table} persists only canonical HMAC attempt ids`
  );
}
const azureFallbackSource = /create or replace function public\.ct_paid_azure_direct_fallback[\s\S]+?\$\$;/.exec(migration)?.[0] ?? "";
const freeLedgerLockIndex = azureFallbackSource.indexOf("lock table public.comment_translator_usage_ledger_events in share mode");
const freeUsageAggregateIndex = azureFallbackSource.indexOf("select coalesce(sum(translated_character_estimate), 0)::bigint");
assert.ok(freeLedgerLockIndex >= 0, "Azure fallback takes a transaction-scoped Free ledger table lock");
assert.ok(freeUsageAggregateIndex > freeLedgerLockIndex, "Free ledger lock precedes the Azure fallback aggregate snapshot");
assert.match(
  billingRuntime,
  /eventType\.startsWith\("customer\.subscription\."\)[\s\S]{0,220}eventType !== "customer\.subscription\.deleted"[\s\S]{0,220}graph\.invoice\.status !== "paid"[\s\S]{0,120}!graph\.invoice\.paid/,
  "non-deleted Subscription projection requires a confirmed paid invoice"
);

const referenceCount = (value) => Array.from(value).length;
assert.equal(referenceCount("A😀"), 2, "fixture counts Unicode code points rather than UTF-16 units");
assert.equal(referenceCount("👨‍👩‍👧‍👦"), 7, "fixture keeps code-point behavior explicit for joined emoji sequences");

const strictAzure = (free, paid, request) => free + paid + 600_000 + request < 2_000_000;
assert.equal(strictAzure(0, 200_000, 1_199_999), true, "strict Azure fixture allows below-boundary reservation");
assert.equal(strictAzure(0, 200_000, 1_200_000), false, "strict Azure fixture rejects equality");
assert.equal(strictAzure(59 * 20_000, 200_000, 0), true, "F=59 full simultaneous use remains allowed");
assert.equal(strictAzure(60 * 20_000, 200_000, 0), false, "F=60 full simultaneous use is rejected");

class PaidTask5ConcurrencyFixture {
  constructor() {
    this.characterReserved = 0;
    this.characterCommitted = 0;
    this.costReserved = 0;
    this.costCommitted = 0;
    this.logical = new Map();
  }

  reserveLogicalAttempt(attemptId, characters, costMicros) {
    const existing = this.logical.get(attemptId);
    if (existing) return { accepted: false, idempotent: true };
    if (this.characterReserved + this.characterCommitted + characters > 500_000) return { accepted: false };
    if (this.costReserved + this.costCommitted + costMicros > 3_000_000) return { accepted: false };
    this.characterReserved += characters;
    this.costReserved += costMicros;
    this.logical.set(attemptId, { characters, costMicros, state: "reserved" });
    return { accepted: true, idempotent: false };
  }

  commitLogicalAttempt(attemptId, actualCharacters = undefined) {
    const existing = this.logical.get(attemptId);
    if (!existing || existing.state === "released") return 0;
    if (existing.state === "committed") return 0;
    this.characterReserved -= existing.characters;
    this.characterCommitted += actualCharacters ?? existing.characters;
    this.costReserved -= existing.costMicros;
    this.costCommitted += existing.costMicros;
    existing.state = "committed";
    return actualCharacters ?? existing.characters;
  }

  releaseLogicalAttempt(attemptId) {
    const existing = this.logical.get(attemptId);
    if (!existing || existing.state !== "reserved") return 0;
    this.characterReserved -= existing.characters;
    this.costReserved -= existing.costMicros;
    existing.state = "released";
    return existing.characters;
  }

  retainUnknownCost(attemptId) {
    const existing = this.logical.get(attemptId);
    if (!existing || existing.state !== "reserved") return false;
    this.costReserved -= existing.costMicros;
    this.costCommitted += existing.costMicros;
    existing.state = "unknown-charge";
    return true;
  }
}

const raceFixture = new PaidTask5ConcurrencyFixture();
assert.deepEqual(
  [
    raceFixture.reserveLogicalAttempt("same-logical-attempt", 500, 10),
    raceFixture.reserveLogicalAttempt("same-logical-attempt", 500, 10)
  ],
  [
    { accepted: true, idempotent: false },
    { accepted: false, idempotent: true }
  ],
  "concurrent duplicate reservation is idempotent"
);
assert.equal(raceFixture.characterReserved, 500, "duplicate race reserves characters only once");
assert.equal(raceFixture.commitLogicalAttempt("same-logical-attempt"), 500, "first provider success commits once");
assert.equal(raceFixture.commitLogicalAttempt("same-logical-attempt"), 0, "fallback/retry cannot commit the logical attempt twice");
assert.equal(raceFixture.characterCommitted, 500, "fallback success does not double-count characters");

const fallbackFixture = new PaidTask5ConcurrencyFixture();
assert.equal(fallbackFixture.reserveLogicalAttempt("fallback", 500, 25).accepted, true, "OpenAI attempt reserves before provider");
assert.equal(fallbackFixture.reserveLogicalAttempt("fallback", 500, 0).idempotent, true, "Azure fallback reuses the logical character reservation");
assert.equal(fallbackFixture.commitLogicalAttempt("fallback"), 500, "Azure fallback success commits the one logical reservation");
assert.equal(fallbackFixture.characterCommitted, 500, "OpenAI failure followed by Azure success consumes once");

const unknownFixture = new PaidTask5ConcurrencyFixture();
assert.equal(unknownFixture.reserveLogicalAttempt("unknown", 500, 40).accepted, true, "unknown-charge case starts with a reservation");
assert.equal(unknownFixture.retainUnknownCost("unknown"), true, "unknown charge is retained conservatively");
assert.equal(unknownFixture.costReserved, 0, "unknown charge leaves no falsely reusable cost reservation");
assert.equal(unknownFixture.costCommitted, 40, "unknown charge is retained as committed maximum");
assert.equal(unknownFixture.characterReserved, 500, "unknown provider character reservation remains independently tracked");

const capFixture = new PaidTask5ConcurrencyFixture();
capFixture.costCommitted = 3_000_000;
assert.equal(capFixture.reserveLogicalAttempt("cost-stop", 500, 1).accepted, false, "individual cost cap can stop before the character cap");
assert.equal(capFixture.characterReserved, 0, "pre-provider cost stop does not consume unsent characters");
assert.equal(shouldConsumeReference("cache-hit"), false, "cache hit is non-consuming");
assert.equal(shouldConsumeReference("empty"), false, "empty input is non-consuming");
assert.equal(shouldConsumeReference("duplicate"), false, "duplicate input is non-consuming");
assert.equal(shouldConsumeReference("language-skip"), false, "language skip is non-consuming");
assert.equal(shouldConsumeReference("provider"), true, "only an eligible provider send is consuming");

console.log("comment translator paid core v1 Task 5 usage/cost contract checks passed");

function shouldConsumeReference(disposition) {
  return disposition === "provider";
}
