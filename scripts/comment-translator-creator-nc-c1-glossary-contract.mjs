import assert from "node:assert/strict";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260801030000_comment_translator_creator_glossary.sql";
const storePath = "lib/comment-translator-creator-glossary-store.ts";
const runtimePath = "lib/comment-translator-creator-glossary-runtime.ts";

assert.ok(fs.existsSync(path.join(root, migrationPath)), "NC-C1 additive glossary migration exists");
assert.ok(fs.existsSync(path.join(root, storePath)), "NC-C1 server-only glossary store exists");
assert.ok(fs.existsSync(path.join(root, runtimePath)), "NC-C1 server-only glossary runtime exists");

const migration = read(migrationPath);
const storeSource = read(storePath);
const runtimeSource = read(runtimePath);

for (const marker of [
  "comment_translator_creator_glossary_states",
  "comment_translator_creator_glossary_entries",
  "owner_user_id uuid not null references auth.users(id) on delete cascade",
  "enable row level security",
  "read_comment_translator_creator_glossary",
  "replace_comment_translator_creator_glossary",
  "auth.role() is distinct from 'service_role'",
  "jsonb_array_length(p_entries) > 30",
  "pg_advisory_xact_lock",
  "expected-version-stale",
  "normalized-term-collision",
  "grant execute on function",
  "to service_role"
]) {
  assert.match(migration, new RegExp(escapeRegExp(marker), "i"), `migration predicate exists: ${marker}`);
}
assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete|all).*\b(anon|authenticated)\b/i);

for (const [source, label] of [[storeSource, "store"], [runtimeSource, "runtime"]]) {
  assert.match(source, /^import "server-only";/, `NC-C1 ${label} is server-only`);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|console\.|fetch\s*\(/);
}
assert.doesNotMatch(runtimeSource, /\bnew Map\b|\bMap</);
assert.match(storeSource, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(storeSource, /replace_comment_translator_creator_glossary/);
assert.match(runtimeSource, /normalize\("NFKC"\)/);

const storeModule = await importTypeScript(
  storeSource.replace('import "server-only";', "").replace(
    'import { createClient } from "@supabase/supabase-js";',
    "const createClient = () => { throw new Error('not-used'); };"
  )
);
const runtimeModule = await importTypeScript(runtimeSource.replace('import "server-only";', ""));
const ownerA = { status: "authenticated", ownerUserId: "owner-a" };
const ownerB = { status: "authenticated", ownerUserId: "owner-b" };
const initialEntries = [
  { term: "ＯＢＳ", replacement: "OBS Studio", note: "operator-only note", languageScope: "JA_jp" }
];

assert.deepEqual(storeModule.createTrustedCommentTranslatorCreatorGlossaryStore({ env: {} }), {
  status: "unavailable",
  store: null,
  reason: "trusted-service-role-env-missing"
});
const rpcCalls = [];
const adapter = storeModule.createCommentTranslatorCreatorGlossarySupabaseStore({
  supabase: {
    async rpc(functionName, parameters) {
      rpcCalls.push([functionName, parameters]);
      if (functionName === "read_comment_translator_creator_glossary") {
        return {
          data: {
            status: "ready",
            version: 4,
            effective_version: "glossary-fixture",
            term_count: 1,
            entries: [{ term: "OBS", replacement: "OBS Studio", note: "private note", language_scope: "ja", normalized_term: "obs" }]
          },
          error: null
        };
      }
      return { data: { status: "updated", version: 5, effective_version: "glossary-next", term_count: 1 }, error: null };
    }
  }
});
assert.equal((await adapter.readGlossary({ ownerUserId: "owner-a" })).status, "ready");
assert.equal(rpcCalls[0][1].p_owner_user_id, "owner-a", "store binds every read to the server-derived owner");
await adapter.replaceGlossary({
  ownerUserId: "owner-b",
  expectedVersion: 4,
  entries: [{ term: "OBS", replacement: "OBS Studio", note: null, languageScope: "ja", normalizedTerm: "obs" }]
});
assert.equal(rpcCalls[1][1].p_owner_user_id, "owner-b", "store binds every write to the server-derived owner");
assert.equal(rpcCalls[1][1].p_expected_version, 4);

const ownerStore = createFakeStore();
const runtime = runtimeModule.createCommentTranslatorCreatorGlossaryRuntime({ glossaryStore: ownerStore });

assert.deepEqual(await runtime.replace({ callerAuthority: ownerA, expectedVersion: 0, entries: initialEntries }), {
  status: "updated",
  termCount: 1,
  version: 1,
  effectiveVersion: ownerStore.effectiveVersion("owner-a")
});
assert.deepEqual(await runtime.readStatus({ callerAuthority: ownerA }), {
  status: "ready",
  termCount: 1,
  version: 1,
  effectiveVersion: ownerStore.effectiveVersion("owner-a")
});
assert.deepEqual(await runtime.readStatus({ callerAuthority: ownerB }), {
  status: "fail-closed",
  reason: "glossary-missing",
  termCount: 0,
  version: null,
  effectiveVersion: null
});

const providerContext = await runtime.resolveProviderContext({ callerAuthority: ownerA, targetLanguage: "ja-JP" });
assert.equal(providerContext.status, "ready");
assert.deepEqual(providerContext.glossaryTerms, ["OBS=>OBS Studio"]);
assert.equal(providerContext.glossaryVersion, ownerStore.effectiveVersion("owner-a"));
assert.equal(JSON.stringify(providerContext).includes("operator-only note"), false, "notes never enter provider context");

assert.deepEqual(
  await runtime.replace({
    callerAuthority: ownerA,
    expectedVersion: 1,
    entries: [
      ...initialEntries,
      { term: "obs", replacement: "collision", note: null, languageScope: "ja-JP" }
    ]
  }),
  { status: "rejected", reason: "normalized-term-collision", termCount: 1, version: 1, effectiveVersion: ownerStore.effectiveVersion("owner-a") }
);
assert.deepEqual(
  await runtime.replace({ callerAuthority: ownerA, expectedVersion: 0, entries: initialEntries }),
  { status: "rejected", reason: "expected-version-stale", termCount: 1, version: 1, effectiveVersion: ownerStore.effectiveVersion("owner-a") }
);
assert.deepEqual(
  await runtime.replace({
    callerAuthority: ownerB,
    expectedVersion: 0,
    entries: Array.from({ length: 31 }, (_, index) => ({
      term: `term-${index}`,
      replacement: `replacement-${index}`,
      note: null,
      languageScope: "*"
    }))
  }),
  { status: "rejected", reason: "term-limit-exceeded", termCount: 0, version: null, effectiveVersion: null }
);

const versionBeforeMaterialChange = providerContext.glossaryVersion;
await runtime.replace({
  callerAuthority: ownerA,
  expectedVersion: 1,
  entries: [{ ...initialEntries[0], note: "changed metadata only" }]
});
const noteOnlyContext = await runtime.resolveProviderContext({ callerAuthority: ownerA, targetLanguage: "ja-jp" });
assert.equal(noteOnlyContext.glossaryVersion, versionBeforeMaterialChange, "note-only changes preserve effective cache identity");
await runtime.replace({
  callerAuthority: ownerA,
  expectedVersion: 2,
  entries: [{ ...initialEntries[0], replacement: "Open Broadcaster Software" }]
});
const changedContext = await runtime.resolveProviderContext({ callerAuthority: ownerA, targetLanguage: "ja_jp" });
assert.equal(changedContext.status, "ready");
assert.notEqual(changedContext.glossaryVersion, versionBeforeMaterialChange, "material content separates cache identity");

const unreadableRuntime = runtimeModule.createCommentTranslatorCreatorGlossaryRuntime({
  glossaryStore: {
    async readGlossary() { return { status: "fail-closed", reason: "unreadable" }; },
    async replaceGlossary() { return { status: "rejected", reason: "unreadable" }; }
  }
});
assert.deepEqual(await unreadableRuntime.readStatus({ callerAuthority: ownerA }), {
  status: "fail-closed",
  reason: "glossary-unreadable",
  termCount: 0,
  version: null,
  effectiveVersion: null
});

process.stdout.write("comment translator NC-C1 glossary authority contract passed\n");

function createFakeStore() {
  const state = new Map();
  return {
    effectiveVersion(ownerUserId) { return state.get(ownerUserId)?.effectiveVersion ?? null; },
    async readGlossary({ ownerUserId }) { return state.get(ownerUserId) ?? { status: "fail-closed", reason: "missing" }; },
    async replaceGlossary({ ownerUserId, expectedVersion, entries }) {
      const current = state.get(ownerUserId);
      const currentVersion = current?.version ?? 0;
      if (currentVersion !== expectedVersion) return { status: "rejected", reason: "expected-version-stale" };
      const version = currentVersion + 1;
      const effectiveVersion = `fixture-${JSON.stringify(entries.map(({ term, replacement, languageScope }) => [term, replacement, languageScope]))}`;
      const next = { status: "ready", version, effectiveVersion, termCount: entries.length, entries };
      state.set(ownerUserId, next);
      return { status: "updated", version, effectiveVersion, termCount: entries.length };
    }
  };
}

function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
async function importTypeScript(source) {
  const executable = stripTypeScriptTypes(source, { mode: "transform" });
  return import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);
}
