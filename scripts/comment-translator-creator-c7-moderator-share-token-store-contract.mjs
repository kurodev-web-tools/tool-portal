import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { digestToken, expiresAtMs, nowMs, ownerAuthorization } from "./comment-translator-creator-c7-contract-fixture.mjs";

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

const stores = await import("../lib/comment-translator-moderator-share-token-store.ts");
assert.equal(stores.commentTranslatorModeratorShareTokenStoreContract.tableName, "comment_translator_moderator_share_tokens");
assert.equal(stores.commentTranslatorModeratorShareTokenStoreContract.rowAccess, "trusted-server-service-role-only");

const missingStore = stores.createTrustedCommentTranslatorModeratorShareTokenSupabaseStore({ env: {} });
assert.equal(missingStore.status, "unavailable");
assert.deepEqual(missingStore.missingEnvReferences, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const plaintext = randomBytes(32).toString("base64url");
const rpcCalls = [];
const queryFilters = [];
const durableRows = [];
const durableStore = stores.createCommentTranslatorModeratorShareTokenSupabaseStore({
  supabase: {
    from() {
      return {
        select() {
          const filters = [];
          const query = {
            eq(column, value) {
              filters.push([column, value]);
              queryFilters.push([column, value]);
              return query;
            },
            async single() {
              const row = durableRows.find((candidate) =>
                filters.every(([column, value]) => candidate[column] === value)
              ) ?? null;
              return { data: row, error: row ? null : { code: "PGRST116" } };
            }
          };
          return query;
        }
      };
    },
    async rpc(functionName, params) {
      rpcCalls.push({ functionName, params });
      return { data: functionName === "revoke_comment_translator_moderator_share_token" ? "revoked" : "applied", error: null };
    }
  }
});
assert.equal(await durableStore.writeCurrent({
  record: {
    ownerUserId: ownerAuthorization.ownerUserId,
    sessionReferenceId: "server-session-a",
    scope: "moderator-share-read",
    tokenDigest: digestToken(plaintext),
    issuedAtIso: new Date(nowMs).toISOString(),
    expiresAtIso: new Date(expiresAtMs).toISOString(),
    revokedAtIso: null
  }
}), "applied");
assert.equal(JSON.stringify(rpcCalls).includes(plaintext), false);
assert.equal(rpcCalls[0].functionName, "write_comment_translator_moderator_share_token");

const persistedRow = {
  owner_user_id: ownerAuthorization.ownerUserId,
  session_reference_id: "server-session-a",
  scope: "moderator-share-read",
  token_digest: digestToken(plaintext),
  issued_at: new Date(nowMs).toISOString(),
  expires_at: new Date(expiresAtMs).toISOString(),
  revoked_at: null,
  version: 1
};
durableRows.push(persistedRow);
assert.equal((await durableStore.readCurrent({
  ownerUserId: ownerAuthorization.ownerUserId,
  scope: "moderator-share-read"
})).tokenDigest, persistedRow.token_digest);
assert.equal((await durableStore.readByDigest({
  tokenDigest: persistedRow.token_digest,
  scope: "moderator-share-read"
})).ownerUserId, ownerAuthorization.ownerUserId);
assert.deepEqual(queryFilters.slice(0, 2), [
  ["owner_user_id", ownerAuthorization.ownerUserId],
  ["scope", "moderator-share-read"]
]);
assert.deepEqual(queryFilters.slice(2, 4), [
  ["token_digest", persistedRow.token_digest],
  ["scope", "moderator-share-read"]
]);
assert.equal(await durableStore.revokeCurrent({
  ownerUserId: ownerAuthorization.ownerUserId,
  scope: "moderator-share-read",
  revokedAtIso: new Date(nowMs + 1).toISOString()
}), "revoked");
assert.equal(rpcCalls[1].functionName, "revoke_comment_translator_moderator_share_token");
assert.equal(JSON.stringify(rpcCalls[1]).includes(plaintext), false);

durableRows.push({ ...persistedRow, owner_user_id: "creator-owner-unreadable", token_digest: "invalid" });
await assert.rejects(
  () => durableStore.readCurrent({ ownerUserId: "creator-owner-unreadable", scope: "moderator-share-read" }),
  /Trusted moderator share token store operation failed\./
);

const migration = fs.readFileSync(new URL("../supabase/migrations/20260723000000_comment_translator_moderator_share_tokens.sql", import.meta.url), "utf8");
assert.match(migration, /scope text not null check \(scope = 'moderator-share-read'\)/);
assert.match(migration, /token_digest text not null unique/);
assert.doesNotMatch(migration, /token_value|plaintext_token|raw_token/i);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on table public\.comment_translator_moderator_share_tokens from anon/);
assert.match(migration, /revoke all on table public\.comment_translator_moderator_share_tokens from authenticated/);
assert.match(migration, /grant all on table public\.comment_translator_moderator_share_tokens to service_role/);
assert.match(migration, /revoke all on function public\.write_comment_translator_moderator_share_token/);
assert.match(migration, /grant execute on function public\.write_comment_translator_moderator_share_token/);
assert.doesNotMatch(migration, /obs-overlay-read/);
assert.match(migration, /on conflict \(owner_user_id, scope\) do nothing/);
assert.match(migration, /get diagnostics inserted_rows = row_count/);

console.log("comment translator creator C7 moderator share token durable store contract passed");
