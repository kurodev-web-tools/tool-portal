import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260801040000_comment_translator_creator_obs_tokens.sql";
const storePath = "lib/comment-translator-creator-obs-token-store.ts";
const runtimePath = "lib/comment-translator-creator-obs-token-runtime.ts";

assert.ok(fs.existsSync(path.join(root, migrationPath)), "NC-O1 additive OBS token migration exists");
assert.ok(fs.existsSync(path.join(root, storePath)), "NC-O1 server-only OBS token store exists");
assert.ok(fs.existsSync(path.join(root, runtimePath)), "NC-O1 server-only OBS token runtime exists");

const migration = read(migrationPath);
const storeSource = read(storePath);
const runtimeSource = read(runtimePath);

for (const marker of [
  "comment_translator_creator_obs_tokens",
  "owner_user_id uuid not null references auth.users(id) on delete cascade",
  "session_reference_id text not null references public.comment_translator_sessions",
  "token_digest text not null unique",
  "redeemed_at timestamptz",
  "enable row level security",
  "read_comment_translator_creator_obs_token_by_digest",
  "issue_or_rotate_comment_translator_creator_obs_token",
  "revoke_comment_translator_creator_obs_token",
  "redeem_comment_translator_creator_obs_token",
  "auth.role() is distinct from 'service_role'",
  "stale-or-replayed-token",
  "grant execute on function",
  "to service_role"
]) {
  assert.match(migration, new RegExp(escapeRegExp(marker), "i"), `migration predicate exists: ${marker}`);
}
assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete|all).*\b(anon|authenticated)\b/i);
assert.doesNotMatch(migration, /plaintext|token_value|raw_token/i, "migration never persists plaintext token material");
assert.match(
  migration,
  /from public\.comment_translator_sessions[\s\S]*owner_user_id = p_owner_user_id[\s\S]*session_reference_id = p_session_reference_id[\s\S]*for share[\s\S]*session_row\.status <> 'active'/,
  "issue and rotate recheck the owner-bound current active session inside the atomic RPC"
);
assert.match(
  migration,
  /perform 1[\s\S]*from public\.comment_translator_sessions[\s\S]*owner_user_id = token_row\.owner_user_id[\s\S]*session_reference_id = token_row\.session_reference_id[\s\S]*status = 'active'[\s\S]*for share[\s\S]*if not found/,
  "redemption rejects a capability whose authoritative session is no longer active"
);

for (const [source, label] of [[storeSource, "store"], [runtimeSource, "runtime"]]) {
  assert.match(source, /^import "server-only";/, `NC-O1 ${label} is server-only`);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|console\.|fetch\s*\(/);
}
assert.match(runtimeSource, /randomBytes\(32\)/, "runtime generates 32 random bytes");
assert.match(runtimeSource, /createHash\("sha256"\)/, "runtime persists a one-way SHA-256 digest");
assert.doesNotMatch(runtimeSource, /process\.env|createClient\s*\(/, "runtime owns no configuration or persistence client");
assert.doesNotMatch(readAppRuntimeSources(), /createCommentTranslatorCreatorObsTokenRuntime\s*\(/, "NC-O1 remains disconnected from app routes");

const storeModule = await importTypeScript(
  storeSource.replace('import "server-only";', "").replace(
    'import { createClient } from "@supabase/supabase-js";',
    "const createClient = () => { throw new Error('not-used'); };"
  )
);
const runtimeModule = await importTypeScript(runtimeSource.replace('import "server-only";', ""));

assert.deepEqual(storeModule.createTrustedCommentTranslatorCreatorObsTokenStore({ env: {} }), {
  status: "unavailable",
  store: null,
  reason: "trusted-service-role-env-missing"
});

const rpcCalls = [];
const adapter = storeModule.createCommentTranslatorCreatorObsTokenSupabaseStore({
  supabase: {
    async rpc(functionName, parameters) {
      rpcCalls.push([functionName, parameters]);
      if (
        functionName === "read_comment_translator_creator_obs_token" ||
        functionName === "read_comment_translator_creator_obs_token_by_digest"
      ) {
        return { data: readyRecord(), error: null };
      }
      if (functionName === "redeem_comment_translator_creator_obs_token") {
        return { data: { status: "redeemed", ...readyRecord() }, error: null };
      }
      return { data: { status: functionName.startsWith("revoke") ? "revoked" : "applied" }, error: null };
    }
  }
});
assert.equal((await adapter.readCurrent({ ownerUserId: "server-owner" })).status, "ready");
assert.equal(rpcCalls[0][1].p_owner_user_id, "server-owner", "store read binds the server-derived owner");
assert.equal((await adapter.readByDigest({ tokenDigest: "a".repeat(64) })).status, "ready");
assert.equal(rpcCalls[1][1].p_token_digest, "a".repeat(64), "preflight lookup receives only the one-way digest");
await adapter.issueOrRotate({
  mode: "issue",
  record: {
    ownerUserId: "server-owner",
    sessionReferenceId: "server-session",
    tokenDigest: "b".repeat(64),
    issuedAtIso: "2026-08-01T10:00:00.000Z",
    expiresAtIso: "2026-08-01T10:01:00.000Z",
    revokedAtIso: null,
    redeemedAtIso: null
  }
});
assert.equal(rpcCalls[2][1].p_token_digest, "b".repeat(64), "store write sends only a one-way digest");
assert.equal(JSON.stringify(rpcCalls).includes("fixture-plaintext-token"), false, "store adapter receives digests, never plaintext");

const nowMs = Date.parse("2026-08-01T10:00:00.000Z");
const expiresAtMs = nowMs + 60_000;
const ownerA = { status: "authenticated", ownerUserId: "owner-a" };
const ownerB = { status: "authenticated", ownerUserId: "owner-b" };
const session = createSessionAuthority({ ownerUserId: "owner-a", sessionReferenceId: "session-a", expiresAtMs });
const tokenStore = createFakeStore();
const runtime = runtimeModule.createCommentTranslatorCreatorObsTokenRuntime({ tokenStore, sessionAuthority: session });

const issued = await runtime.issue({ callerAuthority: ownerA, nowMs });
assert.equal(issued.status, "issued");
assert.equal(Buffer.from(issued.token, "base64url").byteLength, 32, "issued plaintext has 32 bytes of entropy");
assert.equal(tokenStore.persistedPlaintextCount(), 0, "plaintext is never persisted");
assert.equal(tokenStore.current().tokenDigest, digest(issued.token), "only the SHA-256 digest is persisted");
assert.doesNotMatch(JSON.stringify(tokenStore.current()), new RegExp(escapeRegExp(issued.token)));

assert.deepEqual(await runtime.readStatus({ callerAuthority: ownerB, nowMs }), failClosed("token-missing", false));
assert.deepEqual(await runtime.issue({ callerAuthority: { status: "unauthenticated" }, nowMs }), failClosed("caller-unavailable", false));

const rotated = await runtime.rotate({ callerAuthority: ownerA, nowMs: nowMs + 1_000 });
assert.equal(rotated.status, "rotated");
assert.notEqual(rotated.token, issued.token);
assert.deepEqual(await runtime.redeem({ presentedToken: issued.token, nowMs: nowMs + 2_000 }), denied("invalid-token", false));
assert.deepEqual(await runtime.redeem({ presentedToken: rotated.token, nowMs: nowMs + 2_000 }), authorized());
assert.deepEqual(await runtime.redeem({ presentedToken: rotated.token, nowMs: nowMs + 2_001 }), denied("stale-or-replayed-token", false));

const revokedRuntime = runtimeModule.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: createFakeStore(),
  sessionAuthority: session
});
const revokeToken = await revokedRuntime.issue({ callerAuthority: ownerA, nowMs });
assert.equal(revokeToken.status, "issued");
assert.deepEqual(await revokedRuntime.revoke({ callerAuthority: ownerA, nowMs: nowMs + 1_000 }), revoked());
assert.deepEqual(await revokedRuntime.redeem({ presentedToken: revokeToken.token, nowMs: nowMs + 2_000 }), denied("invalid-token", false));

const expiryStore = createFakeStore();
const expiryRuntime = runtimeModule.createCommentTranslatorCreatorObsTokenRuntime({ tokenStore: expiryStore, sessionAuthority: session });
const expiring = await expiryRuntime.issue({ callerAuthority: ownerA, nowMs });
assert.equal(expiring.status, "issued");
assert.deepEqual(await expiryRuntime.redeem({ presentedToken: expiring.token, nowMs: expiresAtMs }), denied("invalid-token", false));

const replacedSession = createSessionAuthority({ ownerUserId: "owner-a", sessionReferenceId: "session-b", expiresAtMs });
const sessionMismatchRuntime = runtimeModule.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: expiryStore,
  sessionAuthority: replacedSession
});
assert.deepEqual(
  await sessionMismatchRuntime.readStatus({ callerAuthority: ownerA, nowMs: nowMs + 1_000 }),
  failClosed("session-mismatch", false)
);

const retryStore = createFakeStore();
const retryIssueRuntime = runtimeModule.createCommentTranslatorCreatorObsTokenRuntime({ tokenStore: retryStore, sessionAuthority: session });
const retryToken = await retryIssueRuntime.issue({ callerAuthority: ownerA, nowMs });
assert.equal(retryToken.status, "issued");
let sessionReadable = false;
const retryRuntime = runtimeModule.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: retryStore,
  sessionAuthority: {
    async readCurrentForOwner() {
      return sessionReadable
        ? { status: "active", sessionReferenceId: "session-a", expiresAtMs }
        : { status: "unavailable", reason: "session-authority-unavailable" };
    }
  }
});
assert.deepEqual(
  await retryRuntime.redeem({ presentedToken: retryToken.token, nowMs: nowMs + 1_000 }),
  denied("overlay-unavailable", true),
  "temporary session-authority failure does not claim authorization"
);
sessionReadable = true;
assert.deepEqual(
  await retryRuntime.redeem({ presentedToken: retryToken.token, nowMs: nowMs + 2_000 }),
  authorized(),
  "retry succeeds because the failed preflight did not consume the capability"
);

const unreadableRuntime = runtimeModule.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: {
    async readCurrent() { throw new Error("private store failure"); },
    async readByDigest() { throw new Error("private store failure"); },
    async issueOrRotate() { throw new Error("private store failure"); },
    async revokeCurrent() { throw new Error("private store failure"); },
    async redeemByDigest() { throw new Error("private store failure"); }
  },
  sessionAuthority: session
});
assert.deepEqual(await unreadableRuntime.readStatus({ callerAuthority: ownerA, nowMs }), failClosed("token-store-unavailable", true));
assert.deepEqual(await unreadableRuntime.issue({ callerAuthority: ownerA, nowMs }), failClosed("token-store-unavailable", true));
assert.deepEqual(await unreadableRuntime.redeem({ presentedToken: "A".repeat(43), nowMs }), denied("overlay-unavailable", true));

const unavailableSessionRuntime = runtimeModule.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: createFakeStore(),
  sessionAuthority: { async readCurrentForOwner() { throw "private non-error failure"; } }
});
assert.deepEqual(await unavailableSessionRuntime.issue({ callerAuthority: ownerA, nowMs }), failClosed("session-unavailable", true));

for (const result of [
  issued,
  rotated,
  await runtime.readStatus({ callerAuthority: ownerA, nowMs: nowMs + 3_000 }),
  authorized(),
  denied("invalid-token", false),
  failClosed("token-store-unavailable", true),
  revoked()
]) {
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /owner-a|owner-b|session-a|session-b|[a-f0-9]{64}/, "results expose no private owner/session/digest metadata");
}

assert.deepEqual(runtimeModule.commentTranslatorCreatorObsTokenRuntimeContract, {
  implementationStage: "nc-o1-local-obs-token-runtime",
  runtime: "server-only",
  callerAuthority: "server-derived-owner-only",
  sessionAuthority: "current-durable-session-rechecked",
  tokenFormat: "opaque-random-32-byte-base64url",
  persistence: "sha256-digest-only",
  plaintextDelivery: "authenticated-issue-or-rotate-once",
  replayPolicy: "atomic-single-redemption",
  browserProjection: "sanitized-capability-metadata-only",
  creatorActivation: "fixed-closed",
  productionRouteWiring: "disconnected-until-nc-o2",
  remoteSupabaseMigrationApply: "not-run-in-this-thread"
});

process.stdout.write("comment translator NC-O1 OBS token runtime contract passed\n");

function createSessionAuthority(active) {
  return {
    async readCurrentForOwner(ownerUserId) {
      return ownerUserId === active.ownerUserId
        ? { status: "active", sessionReferenceId: active.sessionReferenceId, expiresAtMs: active.expiresAtMs }
        : { status: "unavailable", reason: "active-session-missing" };
    }
  };
}

function createFakeStore() {
  let record = null;
  let persistedPlaintexts = 0;
  return {
    current: () => record,
    persistedPlaintextCount: () => persistedPlaintexts,
    async readCurrent({ ownerUserId }) {
      return record?.ownerUserId === ownerUserId ? { status: "ready", record } : { status: "missing" };
    },
    async readByDigest({ tokenDigest }) {
      return record?.tokenDigest === tokenDigest ? { status: "ready", record } : { status: "missing" };
    },
    async issueOrRotate({ mode, record: next }) {
      persistedPlaintexts += Object.hasOwn(next, "token") ? 1 : 0;
      if (mode === "issue" && record && !record.revokedAtIso && !record.redeemedAtIso) return { status: "rejected", reason: "current-token-exists" };
      if (mode === "rotate" && (!record || record.revokedAtIso || record.redeemedAtIso)) return { status: "rejected", reason: "current-token-missing" };
      record = { ...next, version: (record?.version ?? 0) + 1 };
      return { status: "applied" };
    },
    async revokeCurrent({ ownerUserId, revokedAtIso }) {
      if (!record || record.ownerUserId !== ownerUserId || record.revokedAtIso) return { status: "missing" };
      record = { ...record, revokedAtIso };
      return { status: "revoked" };
    },
    async redeemByDigest({ tokenDigest, nowIso }) {
      if (!record || record.tokenDigest !== tokenDigest || record.revokedAtIso || Date.parse(record.expiresAtIso) <= Date.parse(nowIso)) {
        return { status: "denied", reason: "invalid-token" };
      }
      if (record.redeemedAtIso) return { status: "denied", reason: "stale-or-replayed-token" };
      record = { ...record, redeemedAtIso: nowIso };
      return { status: "redeemed", record };
    }
  };
}

function readyRecord() {
  return {
    status: "ready",
    owner_user_id: "server-owner",
    session_reference_id: "server-session",
    token_digest: "a".repeat(64),
    issued_at: "2026-08-01T10:00:00.000Z",
    expires_at: "2026-08-01T10:01:00.000Z",
    revoked_at: null,
    redeemed_at: null,
    version: 1
  };
}

function digest(token) { return createHash("sha256").update(token, "utf8").digest("hex"); }
function authorized() { return { status: "authorized", scope: "obs-overlay-read", access: "read-only", browserSafe: true }; }
function denied(reason, retryable) { return { status: "denied", reason, retryable, browserSafe: true }; }
function revoked() { return { status: "revoked", scope: "obs-overlay-read", access: "read-only", browserSafe: true }; }
function failClosed(reason, retryable) { return { status: "fail-closed", reason, retryable, browserSafe: true }; }
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function readAppRuntimeSources() {
  return fs.readdirSync(path.join(root, "app"), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name))
    .map((entry) => fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8"))
    .join("\n");
}
async function importTypeScript(source) {
  const executable = stripTypeScriptTypes(source, { mode: "transform" });
  return import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);
}
