import assert from "node:assert/strict";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260801020000_comment_translator_creator_paid_usage.sql";
const storePath = "lib/comment-translator-creator-usage-store.ts";
const runtimePath = "lib/comment-translator-creator-usage-runtime.ts";

assert.ok(fs.existsSync(path.join(root, migrationPath)), "NC-U1 additive paid usage migration exists");
assert.ok(fs.existsSync(path.join(root, storePath)), "NC-U1 server-only paid usage store exists");
assert.ok(fs.existsSync(path.join(root, runtimePath)), "NC-U1 server-only paid usage runtime exists");

const migration = read(migrationPath);
const storeSource = read(storePath);
const runtimeSource = read(runtimePath);

for (const marker of [
  "create table if not exists public.comment_translator_creator_paid_usage_events",
  "create table if not exists public.comment_translator_creator_paid_usage_period_counters",
  "create or replace function public.record_comment_translator_creator_paid_usage",
  "auth.role() is distinct from 'service_role'",
  "from public.comment_translator_creator_paid_entitlements",
  "for update",
  "existing_entitlement.period_start is distinct from p_period_start",
  "existing_entitlement.period_end is distinct from p_period_end",
  "existing_entitlement.period_end <= now()",
  "p_provider_executed is not true",
  "p_cache_hit is true",
  "on conflict (usage_event_reference) do nothing",
  "returning usage_event_reference into inserted_event_reference",
  "on conflict (owner_user_id, entitlement_id, period_start, period_end) do update",
  "provider_execution_count = public.comment_translator_creator_paid_usage_period_counters.provider_execution_count + 1",
  "revoke all on function public.record_comment_translator_creator_paid_usage",
  "grant execute on function public.record_comment_translator_creator_paid_usage",
  "to service_role"
]) {
  assert.match(migration, new RegExp(escapeRegExp(marker), "i"), `migration predicate exists: ${marker}`);
}
assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete|all).*\b(anon|authenticated)\b/i);
assert.doesNotMatch(migration, /raw_(comment|provider)|provider_payload|quota|budget|soft_stop|hard_stop/i);

for (const [source, label] of [[storeSource, "store"], [runtimeSource, "runtime"]]) {
  assert.match(source, /^import "server-only";/, `NC-U1 ${label} is server-only`);
  assert.doesNotMatch(source, /\bnew Map\b|\bMap<|localStorage|sessionStorage|indexedDB|console\.|fetch\s*\(/);
}
assert.match(storeSource, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(storeSource, /record_comment_translator_creator_paid_usage/);
assert.doesNotMatch(runtimeSource, /createClient\s*\(|process\.env|readEntitlement\s*\(/);

const storeModule = await importTypeScript(
  storeSource.replace('import "server-only";', "").replace(
    'import { createClient } from "@supabase/supabase-js";',
    "const createClient = () => { throw new Error('not-used'); };"
  )
);
const runtimeModule = await importTypeScript(runtimeSource.replace('import "server-only";', ""));

assert.deepEqual(storeModule.createTrustedCommentTranslatorCreatorUsageStore({ env: {} }), {
  status: "unavailable",
  store: null,
  missingEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  failClosed: true,
  reason: "trusted-service-role-env-missing"
});

const rpcCalls = [];
const supabaseStore = storeModule.createCommentTranslatorCreatorUsageSupabaseStore({
  supabase: {
    async rpc(name, parameters) {
      rpcCalls.push([name, parameters]);
      return {
        data: {
          status: "recorded",
          provider_execution_count: 2,
          provider_input_character_count: 20,
          translated_character_count: 15
        },
        error: null
      };
    }
  }
});
assert.deepEqual(
  await supabaseStore.recordProviderExecutedUsage({
    ownerUserId: "fixture-owner",
    entitlementReferenceId: "10000000-0000-4000-8000-000000000001",
    periodStartIso: "2026-08-01T00:00:00.000Z",
    periodEndIso: "2026-09-01T00:00:00.000Z",
    usageEventReference: "evt-store",
    providerInputCharacterCount: 12,
    translatedCharacterCount: 8
  }),
  {
    status: "recorded",
    counts: { providerExecutionCount: 2, providerInputCharacterCount: 20, translatedCharacterCount: 15 }
  }
);
assert.equal(rpcCalls[0][0], "record_comment_translator_creator_paid_usage");
assert.equal(rpcCalls[0][1].p_provider_executed, true);
assert.equal(rpcCalls[0][1].p_cache_hit, false);

const periodOne = readyEntitlement("2026-08-01T00:00:00.000Z", "2026-09-01T00:00:00.000Z");
const periodTwo = readyEntitlement("2026-09-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z");
const recordedCounts = { providerExecutionCount: 1, providerInputCharacterCount: 12, translatedCharacterCount: 8 };
const recordedStore = fixtureStore(async () => ({ status: "recorded", counts: recordedCounts }));
const runtime = runtimeModule.createCommentTranslatorCreatorUsageRuntime({ usageStore: recordedStore.store });

assert.deepEqual(await runtime.account(providerRequest(periodOne, "evt-1")), {
  status: "recorded",
  reason: "provider-executed-usage-recorded",
  resultDisposition: "success",
  counts: recordedCounts
});
assert.deepEqual(recordedStore.requests[0], {
  ownerUserId: "fixture-owner",
  entitlementReferenceId: "10000000-0000-4000-8000-000000000001",
  periodStartIso: periodOne.entitlement.periodStartIso,
  periodEndIso: periodOne.entitlement.periodEndIso,
  usageEventReference: "evt-1",
  providerInputCharacterCount: 12,
  translatedCharacterCount: 8
});

const excludedStore = fixtureStore(async () => ({ status: "rejected", reason: "accounting-unavailable" }));
assert.deepEqual(
  await runtimeModule.createCommentTranslatorCreatorUsageRuntime({ usageStore: excludedStore.store }).account({
    ...providerRequest(periodOne, "cache"),
    execution: { status: "cache-hit" }
  }),
  { status: "not-counted", reason: "cache-hit", resultDisposition: "success", counts: null }
);
assert.deepEqual(
  await runtimeModule.createCommentTranslatorCreatorUsageRuntime({ usageStore: excludedStore.store }).account({
    ...providerRequest(periodOne, "skip"),
    execution: { status: "not-provider-executed" }
  }),
  { status: "not-counted", reason: "provider-not-executed", resultDisposition: "preserved", counts: null }
);
assert.equal(excludedStore.requests.length, 0, "cache hits and non-provider outcomes never reach paid storage");

for (const [entitlementReason, resultReason] of [
  ["missing", "entitlement-missing"],
  ["unreadable", "entitlement-unreadable"],
  ["stale", "period-mismatch"]
]) {
  const result = await runtimeModule.createCommentTranslatorCreatorUsageRuntime({ usageStore: excludedStore.store }).account({
    ...providerRequest(periodOne, `evt-${entitlementReason}`),
    entitlementRead: { status: "paid-inactive", entitlement: null, authority: "fail-closed", reason: entitlementReason }
  });
  assert.deepEqual(result, { status: "fail-closed", reason: resultReason, resultDisposition: "suppressed", counts: null });
}
assert.equal(excludedStore.requests.length, 0, "missing, unreadable, and stale entitlement state never reaches storage");

for (const reason of ["duplicate", "period-mismatch", "entitlement-missing", "entitlement-unreadable", "accounting-unavailable"]) {
  const rejectedStore = fixtureStore(async () => ({ status: "rejected", reason }));
  const result = await runtimeModule
    .createCommentTranslatorCreatorUsageRuntime({ usageStore: rejectedStore.store })
    .account(providerRequest(periodOne, `evt-${reason}`));
  assert.deepEqual(result, { status: "fail-closed", reason, resultDisposition: "suppressed", counts: null });
}

const concurrentStore = fixtureStore(async (_request, index) =>
  index === 0 ? { status: "recorded", counts: recordedCounts } : { status: "rejected", reason: "duplicate" }
);
const concurrentRuntime = runtimeModule.createCommentTranslatorCreatorUsageRuntime({ usageStore: concurrentStore.store });
const concurrent = await Promise.all([
  concurrentRuntime.account(providerRequest(periodOne, "same-event")),
  concurrentRuntime.account(providerRequest(periodOne, "same-event"))
]);
assert.deepEqual(concurrent.map((result) => result.status).sort(), ["fail-closed", "recorded"]);

await runtime.account(providerRequest(periodTwo, "evt-rollover"));
assert.equal(recordedStore.requests[1].periodStartIso, periodTwo.entitlement.periodStartIso);
assert.equal(recordedStore.requests[1].periodEndIso, periodTwo.entitlement.periodEndIso);

const throwingStore = fixtureStore(async () => { throw new Error("fixture-unreadable"); });
assert.deepEqual(
  await runtimeModule.createCommentTranslatorCreatorUsageRuntime({ usageStore: throwingStore.store }).account(
    providerRequest(periodOne, "evt-unreadable")
  ),
  { status: "fail-closed", reason: "accounting-unavailable", resultDisposition: "suppressed", counts: null }
);

process.stdout.write("comment translator NC-U1 paid usage accounting contract passed\n");

function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
async function importTypeScript(source) {
  const executable = stripTypeScriptTypes(source, { mode: "transform" });
  return import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);
}
function readyEntitlement(periodStartIso, periodEndIso) {
  return {
    status: "ready",
    entitlement: {
      entitlementReferenceId: "10000000-0000-4000-8000-000000000001",
      plan: "creator",
      status: "active",
      periodStartIso,
      periodEndIso,
      lastEvidenceAtIso: periodStartIso
    },
    authority: "signed-stripe-evidence"
  };
}
function providerRequest(entitlementRead, usageEventReference) {
  return {
    callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" },
    entitlementRead,
    execution: { status: "provider-executed", usageEventReference, providerInputCharacterCount: 12, translatedCharacterCount: 8 }
  };
}
function fixtureStore(record) {
  const requests = [];
  return {
    requests,
    store: { async recordProviderExecutedUsage(request) { requests.push(request); return record(request, requests.length - 1); } }
  };
}
