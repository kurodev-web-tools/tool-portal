import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expiresAtMs, nowMs, ownerAuthorization } from "./comment-translator-creator-c5-contract-fixture.mjs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export function createClient(){return {from(){return {}},rpc(){return {data:null,error:null}}}}"
      };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    return nextResolve(specifier, context);
  }
});

const stores = await import("../lib/comment-translator-obs-overlay-token-store.ts");
assert.equal(stores.commentTranslatorObsOverlayTokenStoreContract.tableName, "comment_translator_obs_overlay_tokens");
assert.equal(stores.commentTranslatorObsOverlayTokenStoreContract.rowAccess, "trusted-server-service-role-only");

const missingStore = stores.createTrustedCommentTranslatorObsOverlayTokenSupabaseStore({ env: {} });
assert.equal(missingStore.status, "unavailable");
assert.deepEqual(missingStore.missingEnvReferences, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const firstOpaqueToken = randomBytes(32).toString("base64url");
const rpcCalls = [];
const durableRows = [];
const durableStore = stores.createCommentTranslatorObsOverlayTokenSupabaseStore({
  nowIso: () => new Date(nowMs).toISOString(),
  supabase: {
    from() {
      return {
        select() {
          const filters = [];
          const query = {
            eq(column, value) { filters.push([column, value]); return query; },
            async single() {
              const row = durableRows.find((candidate) => filters.every(([column, value]) => candidate[column] === value)) ?? null;
              return { data: row, error: row ? null : { code: "PGRST116" } };
            }
          };
          return query;
        }
      };
    },
    async rpc(functionName, params) {
      rpcCalls.push({ functionName, params });
      return { data: functionName === "revoke_comment_translator_obs_overlay_token" ? "revoked" : "applied", error: null };
    }
  }
});

assert.equal(await durableStore.writeCurrent({
  mode: "issue",
  record: {
    ownerUserId: ownerAuthorization.ownerUserId,
    sessionReferenceId: "server-session-a",
    scope: "obs-overlay-read",
    tokenDigest: createHash("sha256").update(firstOpaqueToken, "utf8").digest("hex"),
    issuedAtIso: new Date(nowMs).toISOString(),
    expiresAtIso: new Date(expiresAtMs).toISOString(),
    revokedAtIso: null
  }
}), "applied");
assert.equal(JSON.stringify(rpcCalls).includes(firstOpaqueToken), false, "durable RPC receives a digest and never plaintext");
assert.equal(rpcCalls[0].functionName, "write_comment_translator_obs_overlay_token");

const migration = fs.readFileSync(new URL("../supabase/migrations/20260722002000_comment_translator_obs_overlay_tokens.sql", import.meta.url), "utf8");
assert.match(migration, /token_digest text not null unique/);
assert.doesNotMatch(migration, /token_value|plaintext_token|raw_token/i);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on table public\.comment_translator_obs_overlay_tokens from anon/);
assert.match(migration, /revoke all on table public\.comment_translator_obs_overlay_tokens from authenticated/);
assert.match(migration, /grant all on table public\.comment_translator_obs_overlay_tokens to service_role/);
assert.match(migration, /current-token-exists/);
assert.match(migration, /missing-current-token/);
assert.match(migration, /revoked/);

console.log("comment translator creator C5 OBS overlay token durable store contract passed");
