import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const storePath = "lib/comment-translator-paid-usage-counter-store.ts";
const runtimePath = "lib/comment-translator-paid-usage-runtime.ts";
const typesPath = "lib/comment-translator-paid-usage-types.ts";
const testStorePath = "lib/comment-translator-paid-usage-test-store.ts";
const migrationPath = "supabase/migrations/20260722001000_comment_translator_paid_usage_counters.sql";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export{}" };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export function createClient(){return {from(){return {}},rpc(){return {data:null,error:null}}}}"
      };
    }
    if (specifier === "stripe") {
      return { shortCircuit: true, url: "data:text/javascript,export default class Stripe{}" };
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

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

for (const requiredPath of [storePath, runtimePath, typesPath, testStorePath, migrationPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `C3 required file exists: ${requiredPath}`);
}

const storeSource = read(storePath);
const runtimeSource = read(runtimePath);
const implementationSource = `${storeSource}\n${runtimeSource}`;
const migrationSource = read(migrationPath);

assert.match(storeSource, /^import "server-only";/m, "paid usage ownership remains server-only");
assert.match(implementationSource, /createCommentTranslatorBillingUserReference/, "paid usage derives its private owner reference on the server");
assert.match(implementationSource, /billingState !== "paid-active"/, "paid usage requires the C1 paid-active decision");
assert.match(implementationSource, /currentPeriodEndIso/, "paid usage uses the signed entitlement period boundary");
assert.doesNotMatch(implementationSource, /monthlyLimit|quotaAmount|resetDay|resetTimezone/, "C3 does not invent paid quota or reset policy");

for (const fragment of [
  "create table if not exists public.comment_translator_paid_usage_counters",
  "create table if not exists public.comment_translator_paid_usage_events",
  "revoke all on table public.comment_translator_paid_usage_counters from anon",
  "revoke all on table public.comment_translator_paid_usage_events from authenticated",
  "create trigger comment_translator_paid_usage_sync_from_entitlement",
  "from public.comment_translator_paid_entitlements where evidence_source = 'signed-stripe-webhook'",
  "create or replace function public.apply_comment_translator_paid_usage",
  "billing_state = 'paid-active'",
  "current_period_end = p_expected_period_end",
  "on conflict (usage_event_reference_id) do nothing",
  "translated_message_count = comment_translator_paid_usage_counters.translated_message_count",
  "provider_input_character_count = comment_translator_paid_usage_counters.provider_input_character_count",
  "estimated_cost_micros = comment_translator_paid_usage_counters.estimated_cost_micros"
]) {
  assert.match(migrationSource, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

const billingModule = await import("../lib/comment-translator-billing-runtime.ts");
const entitlementTestStoreModule = await import("../lib/comment-translator-paid-entitlement-test-store.ts");
const paidUsageModule = await import("../lib/comment-translator-paid-usage-counter-store.ts");
const paidUsageTestStoreModule = await import("../lib/comment-translator-paid-usage-test-store.ts");

const callerAuthorization = {
  status: "authorized",
  ownerUserId: "server-only-owner-value"
};
process.env.COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS = "enabled-reviewed";
process.env.COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES = createHash("sha256")
  .update(callerAuthorization.ownerUserId)
  .digest("hex");
const billingUserReferenceId = billingModule.createCommentTranslatorBillingUserReference(callerAuthorization);
assert.ok(billingUserReferenceId);

const nowMs = Date.parse("2026-07-22T02:00:00.000Z");
const firstPeriodEndIso = "2026-08-22T00:00:00.000Z";
const entitlementStore = entitlementTestStoreModule.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
await entitlementStore.persistVerifiedBillingEvidence({
  evidenceSource: "signed-stripe-webhook",
  evidenceEventReferenceId: "evt_paid_period_one",
  evidenceCreatedAtIso: "2026-07-22T00:00:00.000Z",
  billingUserReferenceId,
  customerReferenceId: "customer-private-reference",
  subscriptionReferenceId: "subscription-private-reference",
  subscriptionStatus: "active",
  billingState: "paid-active",
  currentPeriodEndIso: firstPeriodEndIso
});
const firstEntitlement = await entitlementStore.readByBillingUserReference(billingUserReferenceId);
assert.ok(firstEntitlement);

const paidUsageTestStore = paidUsageTestStoreModule.createInMemoryCommentTranslatorPaidUsageStoreForTests();
paidUsageTestStore.syncFromEntitlement(firstEntitlement);
const paidUsageStore = { status: "ready", store: paidUsageTestStore, missingEnvReferences: [] };

const firstUsageEvent = {
  type: "ai-usage-estimated",
  provider: "youtube",
  sessionReferenceId: "server-session-reference",
  occurredAtMs: nowMs,
  translatedMessageEstimate: 2,
  providerInputCharacterEstimate: 120,
  translatedCharacterEstimate: 0,
  estimatedCostMicros: 30,
  rawCommentText: "never-recorded-by-design"
};

const concurrentResults = await Promise.all([
  paidUsageModule.recordCommentTranslatorPaidUsageOrFailClosed({
    callerAuthorization,
    entitlementStore,
    paidUsageCounterStore: paidUsageStore,
    event: firstUsageEvent,
    nowMs
  }),
  paidUsageModule.recordCommentTranslatorPaidUsageOrFailClosed({
    callerAuthorization,
    entitlementStore,
    paidUsageCounterStore: paidUsageStore,
    event: firstUsageEvent,
    nowMs
  })
]);
assert.deepEqual(
  concurrentResults.map((result) => result.status).sort(),
  ["ignored-replay", "recorded"],
  "concurrent duplicate usage is counted exactly once"
);

const firstSnapshot = await paidUsageModule.readCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore,
  paidUsageCounterStore: paidUsageStore,
  nowMs
});
assert.deepEqual(firstSnapshot, {
  status: "ready",
  plan: "paid",
  billingState: "paid-active",
  resetAuthority: "signed-entitlement-period-boundary",
  usage: {
    translatedMessageCount: 2,
    providerInputCharacterCount: 120,
    estimatedCostMicros: 30
  }
});

const futureDatedUsage = await paidUsageModule.recordCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore,
  paidUsageCounterStore: paidUsageStore,
  event: { ...firstUsageEvent, occurredAtMs: nowMs + 1 },
  nowMs
});
assert.equal(futureDatedUsage.status, "paid-inactive", "future operator/browser timestamps cannot advance paid usage");

const secondPeriodEndIso = "2026-09-22T00:00:00.000Z";
await entitlementStore.persistVerifiedBillingEvidence({
  evidenceSource: "signed-stripe-webhook",
  evidenceEventReferenceId: "evt_paid_period_two",
  evidenceCreatedAtIso: "2026-08-22T00:00:00.000Z",
  billingUserReferenceId,
  customerReferenceId: "customer-private-reference",
  subscriptionReferenceId: "subscription-private-reference",
  subscriptionStatus: "active",
  billingState: "paid-active",
  currentPeriodEndIso: secondPeriodEndIso
});
const secondEntitlement = await entitlementStore.readByBillingUserReference(billingUserReferenceId);
assert.ok(secondEntitlement);
paidUsageTestStore.syncFromEntitlement(secondEntitlement);

const resetSnapshot = await paidUsageModule.readCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore,
  paidUsageCounterStore: paidUsageStore,
  nowMs: Date.parse("2026-08-22T01:00:00.000Z")
});
assert.deepEqual(resetSnapshot.usage, {
  translatedMessageCount: 0,
  providerInputCharacterCount: 0,
  estimatedCostMicros: 0
});

const stalePeriodResult = await paidUsageTestStore.recordUsage({
  billingUserReferenceId,
  expectedPeriodEndIso: firstPeriodEndIso,
  usageEventReferenceId: "ctpue_111111111111111111111111",
  occurredAtIso: "2026-08-22T01:00:00.000Z",
  translatedMessageCount: 1,
  providerInputCharacterCount: 10,
  estimatedCostMicros: 1
});
assert.equal(stalePeriodResult, "rejected-stale-period");

await entitlementStore.persistVerifiedBillingEvidence({
  evidenceSource: "signed-stripe-webhook",
  evidenceEventReferenceId: "evt_paid_downgrade",
  evidenceCreatedAtIso: "2026-08-22T02:00:00.000Z",
  billingUserReferenceId,
  customerReferenceId: "customer-private-reference",
  subscriptionReferenceId: "subscription-private-reference",
  subscriptionStatus: "canceled",
  billingState: "paid-inactive",
  currentPeriodEndIso: secondPeriodEndIso
});
const downgraded = await paidUsageModule.recordCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore,
  paidUsageCounterStore: paidUsageStore,
  event: { ...firstUsageEvent, occurredAtMs: Date.parse("2026-08-22T03:00:00.000Z") },
  nowMs: Date.parse("2026-08-22T03:00:00.000Z")
});
assert.equal(downgraded.status, "paid-inactive");

const unreadableEntitlement = await paidUsageModule.readCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore: {
    async readByBillingUserReference() { throw new Error("simulated entitlement read failure"); },
    async readByCustomerReference() { throw new Error("unused"); },
    async persistVerifiedBillingEvidence() { throw new Error("unused"); }
  },
  paidUsageCounterStore: paidUsageStore,
  nowMs
});
assert.equal(unreadableEntitlement.status, "paid-inactive");

const activeEntitlementStore = entitlementTestStoreModule.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
await activeEntitlementStore.persistVerifiedBillingEvidence({ ...firstEntitlement, evidenceEventReferenceId: "evt_active_again" });
const missingUsage = await paidUsageModule.readCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore: activeEntitlementStore,
  paidUsageCounterStore: {
    status: "ready",
    store: paidUsageTestStoreModule.createInMemoryCommentTranslatorPaidUsageStoreForTests(),
    missingEnvReferences: []
  },
  nowMs
});
assert.equal(missingUsage.status, "paid-inactive");
assert.equal(missingUsage.reason, "paid-usage-state-unavailable");

const unreadableUsage = await paidUsageModule.readCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore: activeEntitlementStore,
  paidUsageCounterStore: {
    status: "ready",
    missingEnvReferences: [],
    store: {
      async readCurrentPeriod() { throw new Error("simulated usage read failure"); },
      async recordUsage() { throw new Error("simulated usage write failure"); }
    }
  },
  nowMs
});
assert.equal(unreadableUsage.status, "paid-inactive");
assert.equal(unreadableUsage.reason, "paid-usage-state-unavailable");

const incompleteEntitlement = await paidUsageModule.readCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore: {
    async readByBillingUserReference() {
      return { ...firstEntitlement, currentPeriodEndIso: "not-an-entitlement-period" };
    },
    async readByCustomerReference() { return null; },
    async persistVerifiedBillingEvidence() { return "ignored-stale"; }
  },
  paidUsageCounterStore: {
    status: "ready",
    missingEnvReferences: [],
    store: {
      async readCurrentPeriod() {
        return { ...resetSnapshot.usage, billingUserReferenceId, currentPeriodEndIso: "not-an-entitlement-period", resetEvidenceCreatedAtIso: "2026-07-22T00:00:00.000Z", updatedAtIso: "2026-07-22T00:00:00.000Z" };
      },
      async recordUsage() { return "applied"; }
    }
  },
  nowMs
});
assert.equal(incompleteEntitlement.status, "paid-inactive", "incomplete active entitlement fails closed");

const incompleteUsage = await paidUsageModule.readCommentTranslatorPaidUsageOrFailClosed({
  callerAuthorization,
  entitlementStore: activeEntitlementStore,
  paidUsageCounterStore: {
    status: "ready",
    missingEnvReferences: [],
    store: {
      async readCurrentPeriod() {
        return {
          billingUserReferenceId,
          currentPeriodEndIso: firstPeriodEndIso,
          resetEvidenceCreatedAtIso: "2026-07-22T00:00:00.000Z",
          translatedMessageCount: -1,
          providerInputCharacterCount: 0,
          estimatedCostMicros: 0,
          updatedAtIso: "2026-07-22T00:00:00.000Z"
        };
      },
      async recordUsage() { return "applied"; }
    }
  },
  nowMs
});
assert.equal(incompleteUsage.status, "paid-inactive", "incomplete paid usage state fails closed");

for (const result of [...concurrentResults, firstSnapshot, resetSnapshot, downgraded, unreadableEntitlement, missingUsage, unreadableUsage, incompleteEntitlement, incompleteUsage]) {
  assert.doesNotMatch(
    JSON.stringify(result),
    /server-only-owner-value|ctbill_|ctpue_|customer-private-reference|subscription-private-reference|stripe|providerTargetMetadata/i,
    "C3 output exposes no private owner, billing, provider, or counter key material"
  );
}

console.log("comment_translator_creator_c3_paid_usage_counter_contract=pass");
