import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { nowIso, ownerAuthorization } from "./comment-translator-creator-c9-contract-fixture.mjs";

const storeUrl = new URL("../lib/comment-translator-custom-dictionary-store.ts", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260723002000_comment_translator_custom_dictionary.sql", import.meta.url);
assert.equal(fs.existsSync(storeUrl), true, "C9 durable dictionary store must exist");
assert.equal(fs.existsSync(migrationUrl), true, "C9 service-role-only migration must exist");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
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

const stores = await import(storeUrl);
assert.equal(stores.commentTranslatorCustomDictionaryStoreContract.tableName, "comment_translator_custom_dictionary_entries");
assert.equal(stores.commentTranslatorCustomDictionaryStoreContract.rowAccess, "trusted-server-service-role-only");
assert.equal(stores.commentTranslatorCustomDictionaryStoreContract.ownerIsolation, "owner-filter-required-for-every-read-and-mutation");

const missingStore = stores.createTrustedCommentTranslatorCustomDictionarySupabaseStore({ env: {} });
assert.equal(missingStore.status, "unavailable");
assert.deepEqual(missingStore.missingEnvReferences, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const queryFilters = [];
const rpcCalls = [];
const durableRows = [{
  entry_id: "11111111-1111-4111-8111-111111111111",
  owner_user_id: ownerAuthorization.ownerUserId,
  term: "Kuro",
  normalized_term: "kuro",
  replacement: "クロ",
  note: null,
  source_language: "en",
  target_language: "ja",
  created_at: nowIso,
  updated_at: nowIso
}];
const durableStore = stores.createCommentTranslatorCustomDictionarySupabaseStore({
  supabase: {
    from() {
      return {
        select() {
          const query = {
            eq(column, value) {
              queryFilters.push([column, value]);
              return query;
            },
            async order() {
              return { data: durableRows, error: null };
            }
          };
          return query;
        }
      };
    },
    async rpc(functionName, params) {
      rpcCalls.push({ functionName, params });
      if (functionName === "delete_comment_translator_custom_dictionary_entry") return { data: "applied", error: null };
      return { data: "applied", error: null };
    }
  }
});

const rows = await durableStore.readCurrent({ ownerUserId: ownerAuthorization.ownerUserId });
assert.equal(rows.length, 1);
assert.equal(rows[0].normalizedTerm, "kuro");
assert.deepEqual(queryFilters, [["owner_user_id", ownerAuthorization.ownerUserId]]);

const entry = {
  entryId: "22222222-2222-4222-8222-222222222222",
  term: "Studio",
  normalizedTerm: "studio",
  replacement: "スタジオ",
  note: null,
  sourceLanguage: "en",
  targetLanguage: "ja",
  createdAtIso: nowIso,
  updatedAtIso: nowIso
};
assert.equal(await durableStore.createEntry({ ownerUserId: ownerAuthorization.ownerUserId, entry }), "applied");
assert.equal(await durableStore.updateEntry({
  ownerUserId: ownerAuthorization.ownerUserId, entryId: entry.entryId, expectedUpdatedAtIso: nowIso, entry
}), "applied");
assert.equal(await durableStore.deleteEntry({
  ownerUserId: ownerAuthorization.ownerUserId, entryId: entry.entryId, expectedUpdatedAtIso: nowIso
}), "applied");
for (const call of rpcCalls) assert.equal(call.params.p_owner_user_id, ownerAuthorization.ownerUserId);

const unreadableStore = stores.createCommentTranslatorCustomDictionarySupabaseStore({
  supabase: {
    from() {
      return { select() { return { eq() { return this; }, async order() { return { data: [{ ...durableRows[0], source_language: "fr" }], error: null }; } }; } };
    },
    async rpc() { return { data: "applied", error: null }; }
  }
});
await assert.rejects(
  () => unreadableStore.readCurrent({ ownerUserId: ownerAuthorization.ownerUserId }),
  /Trusted custom dictionary store operation failed\./
);

const migration = fs.readFileSync(migrationUrl, "utf8");
assert.match(migration, /unique \(owner_user_id, source_language, target_language, normalized_term\)/i);
assert.match(migration, /count\(\*\).*>= 30/is);
assert.match(migration, /pg_advisory_xact_lock/i);
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all on table public\.comment_translator_custom_dictionary_entries from anon/i);
assert.match(migration, /revoke all on table public\.comment_translator_custom_dictionary_entries from authenticated/i);
assert.match(migration, /grant all on table public\.comment_translator_custom_dictionary_entries to service_role/i);
assert.match(migration, /revoke all on function public\.create_comment_translator_custom_dictionary_entry/is);
assert.match(migration, /grant execute on function public\.create_comment_translator_custom_dictionary_entry/is);
assert.match(migration, /where owner_user_id = p_owner_user_id/is);
assert.match(migration, /updated_at = p_expected_updated_at/is);
assert.doesNotMatch(migration, /grant .* to anon|grant .* to authenticated/i);

console.log("comment translator creator C9 custom dictionary durable store contract passed");
