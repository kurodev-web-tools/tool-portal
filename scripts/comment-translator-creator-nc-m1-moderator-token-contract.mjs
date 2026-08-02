import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260802020000_comment_translator_creator_moderator_tokens.sql";
const storePath = "lib/comment-translator-creator-moderator-token-store.ts";
const runtimePath = "lib/comment-translator-creator-moderator-token-runtime.ts";

// Keep these reads ordered: Phase 1 must RED as an ENOENT until NC-M1 production
// files exist, rather than failing because this dependency-free contract is malformed.
const migrationSource = read(migrationPath);
const storeSource = read(storePath);
const runtimeSource = read(runtimePath);

for (const marker of [
  "comment_translator_creator_moderator_tokens",
  "owner_user_id uuid not null",
  "session_reference_id text not null references public.comment_translator_sessions",
  "scope text not null check (scope = 'moderator-share-read')",
  "token_digest text not null unique",
  "primary key (owner_user_id, scope)",
  "enable row level security",
  "read_comment_translator_creator_moderator_token",
  "read_comment_translator_creator_moderator_token_by_digest",
  "issue_comment_translator_creator_moderator_token",
  "revoke_comment_translator_creator_moderator_token",
  "auth.role() is distinct from 'service_role'",
  "pg_advisory_xact_lock",
  "grant execute on function",
  "to service_role"
]) {
  assert.match(migrationSource, new RegExp(escapeRegExp(marker), "i"), `NC-M1 migration predicate exists: ${marker}`);
}
for (const subject of ["table public.comment_translator_creator_moderator_tokens", "function public.read_comment_translator_creator_moderator_token", "function public.issue_comment_translator_creator_moderator_token", "function public.revoke_comment_translator_creator_moderator_token"]) {
  for (const role of ["public", "anon", "authenticated"]) {
    assert.match(
      migrationSource,
      new RegExp(`revoke\\s+all\\s+on\\s+${escapeRegExp(subject)}[\\s\\S]{0,200}?\\b${role}\\b`, "i"),
      `NC-M1 explicitly revokes ${role} access to ${subject}`
    );
  }
}
assert.doesNotMatch(migrationSource, /plaintext|token_value|raw_token|moderator_(?:id|email)|recipient|delivery/i, "NC-M1 migration stores neither plaintext nor moderator-recipient data");
assert.doesNotMatch(migrationSource, /owner_user_id\s+uuid\s+not\s+null\s+references\s+auth\.users/i, "NC-M1 has no direct auth user cascade parent");
assert.match(
  migrationSource,
  /session_reference_id\s+text\s+not\s+null\s+references\s+public\.comment_translator_sessions\(session_reference_id\)\s+on\s+delete\s+cascade/i,
  "NC-M1 token cleanup is owned by the session cascade parent"
);
assert.equal(
  (migrationSource.match(/on\s+delete\s+cascade/gi) ?? []).length,
  1,
  "NC-M1 has one session-parent cascade cleanup authority"
);
assert.doesNotMatch(migrationSource, /comment_translator_creator_obs|obs-overlay-read|obs_overlay/i, "NC-M1 migration remains separate from NC-O1/NC-O2");
assert.doesNotMatch(migrationSource, /grant\s+(select|insert|update|delete|all).*\b(anon|authenticated)\b/i, "NC-M1 grants no table access to browser roles");
assert.match(
  migrationSource,
  /issue_comment_translator_creator_moderator_token[\s\S]*from public\.comment_translator_sessions[\s\S]*owner_user_id = p_owner_user_id[\s\S]*session_reference_id = p_session_reference_id[\s\S]*for share[\s\S]*session_row\.status is distinct from 'active'/,
  "atomic issue rechecks the owner-bound current active session"
);
assert.match(
  migrationSource,
  /if found and token_row\.revoked_at is null and token_row\.expires_at > p_issued_at[\s\S]*token_row\.session_reference_id = p_session_reference_id then/,
  "only a current token for the same authoritative session blocks issue"
);
assert.match(
  migrationSource,
  /revoke_comment_translator_creator_moderator_token[\s\S]*from public\.comment_translator_sessions[\s\S]*owner_user_id = p_owner_user_id[\s\S]*session_reference_id = p_session_reference_id[\s\S]*for share/,
  "atomic revoke rechecks the owner-bound current session"
);
assert.match(
  migrationSource,
  /read_comment_translator_creator_moderator_token[\s\S]*from public\.comment_translator_sessions[\s\S]*for share/,
  "atomic read rechecks durable current-session authority"
);
for (const [functionName, ownerExpression, sessionExpression, operationTime] of [
  ["read_comment_translator_creator_moderator_token", "token_row.owner_user_id", "token_row.session_reference_id", "p_now"],
  ["read_comment_translator_creator_moderator_token_by_digest", "token_row.owner_user_id", "token_row.session_reference_id", "p_now"],
  ["issue_comment_translator_creator_moderator_token", "p_owner_user_id", "p_session_reference_id", "p_issued_at"],
  ["revoke_comment_translator_creator_moderator_token", "p_owner_user_id", "p_session_reference_id", "p_revoked_at"]
]) {
  const body = migrationFunctionBody(functionName);
  for (const predicate of [
    `session_row.owner_user_id is distinct from ${ownerExpression}`,
    `session_row.session_reference_id is distinct from ${sessionExpression}`,
    "session_row.status is distinct from 'active'",
    "session_row.started_at is null",
    "session_row.last_heartbeat_at is null",
    "session_row.last_heartbeat_at < session_row.started_at",
    `session_row.started_at > ${operationTime}`,
    `session_row.last_heartbeat_at > ${operationTime}`,
    `${operationTime} - session_row.last_heartbeat_at > interval '45 seconds'`
  ]) {
    assert.match(body, new RegExp(escapeRegExp(predicate), "i"), `${functionName} heartbeat predicate: ${predicate}`);
  }
}
for (const functionName of ["read_comment_translator_creator_moderator_token", "read_comment_translator_creator_moderator_token_by_digest"]) {
  assertParentSessionBeforeChildTokenLock(migrationFunctionBody(functionName), functionName);
}

for (const [source, label] of [[storeSource, "store"], [runtimeSource, "runtime"]]) {
  assert.match(source, /^import "server-only";/, `NC-M1 ${label} is server-only`);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|console\.|searchParams|formData|request\.json|cookies\s*\(/, `NC-M1 ${label} has no browser credential path`);
  assert.doesNotMatch(source, /moderator_(?:id|email)|\bemail\b|\brecipient\b|\bdelivery\b|\binvite\b/i, `NC-M1 ${label} neither infers nor stores moderator-recipient data`);
}
assert.doesNotMatch(storeSource, /comment_translator_creator_obs|obs-overlay-read|obs_overlay/i, "NC-M1 store never reaches NC-O1/NC-O2 authority");
assert.doesNotMatch(runtimeSource, /comment_translator_creator_obs|obs-overlay-read|obs_overlay/i, "NC-M1 runtime never accepts NC-O1/NC-O2 authority");
assert.match(runtimeSource, /randomBytes\(32\)/, "NC-M1 runtime generates 32 random bytes");
assert.match(runtimeSource, /createHash\("sha256"\)/, "NC-M1 runtime persists a one-way SHA-256 digest");
assert.doesNotMatch(runtimeSource, /process\.env|createClient\s*\(/, "NC-M1 runtime owns no configuration or persistence client");
assert.match(runtimeSource, /issue\s*:/, "NC-M1 exposes issue");
assert.match(runtimeSource, /readStatus\s*:/, "NC-M1 exposes readStatus");
assert.match(runtimeSource, /revoke\s*:/, "NC-M1 exposes revoke");
assert.match(runtimeSource, /validatePresentedToken\s*:/, "NC-M1 exposes token validation without a browser route");
assert.match(runtimeSource, /validateBrowserSession\s*:/, "NC-M1 exposes the NC-M2 browser-session validation seam");
assert.match(storeSource, /redeemed_at/, "NC-M1 trusted reads require the NC-M2 plaintext-consumption state");
assert.match(runtimeSource, /redeemedAtIso\s*!==\s*null/, "NC-M1 plaintext validation rejects an atomically consumed credential");

const storeModule = await importTypeScript(
  storeSource
    .replace('import "server-only";', "")
    .replace(/import\s+\{\s*createClient\s*\}\s+from\s+["']@supabase\/supabase-js["'];?/, "const createClient = () => { throw new Error('not-used'); };")
);
const runtimeModule = await importTypeScript(runtimeSource.replace('import "server-only";', ""));

assert.deepEqual(storeModule.createTrustedCommentTranslatorCreatorModeratorTokenStore({ env: {} }), {
  status: "unavailable",
  store: null,
  reason: "trusted-service-role-env-missing"
});

const rpcCalls = [];
const adapter = storeModule.createCommentTranslatorCreatorModeratorTokenSupabaseStore({
  supabase: {
    async rpc(functionName, parameters) {
      rpcCalls.push([functionName, parameters]);
      if (functionName === "read_comment_translator_creator_moderator_token" || functionName === "read_comment_translator_creator_moderator_token_by_digest") {
        return { data: { status: "ready", ...readyRecord() }, error: null };
      }
      if (functionName === "issue_comment_translator_creator_moderator_token") return { data: { status: "applied" }, error: null };
      return { data: { status: "revoked" }, error: null };
    }
  }
});
assert.equal((await adapter.readCurrent({ ownerUserId: "server-owner", nowIso: "2026-08-02T10:00:00.000Z" })).status, "ready");
assert.equal(rpcCalls[0][0], "read_comment_translator_creator_moderator_token");
assert.equal(rpcCalls[0][1].p_owner_user_id, "server-owner", "store read binds the server-derived owner");
assert.equal((await adapter.readByDigest({ tokenDigest: "a".repeat(64), nowIso: "2026-08-02T10:00:00.000Z" })).status, "ready");
assert.equal(rpcCalls[1][0], "read_comment_translator_creator_moderator_token_by_digest");
assert.equal(rpcCalls[1][1].p_token_digest, "a".repeat(64), "validation store input is a digest only");
await adapter.issueCurrent({
  record: {
    ownerUserId: "server-owner",
    sessionReferenceId: "server-session",
    tokenDigest: "b".repeat(64),
    issuedAtIso: "2026-08-02T10:00:00.000Z",
    expiresAtIso: "2026-08-02T10:01:00.000Z",
    revokedAtIso: null
  }
});
assert.equal(rpcCalls[2][0], "issue_comment_translator_creator_moderator_token");
assert.equal(rpcCalls[2][1].p_token_digest, "b".repeat(64), "store issue sends only a one-way digest");
await adapter.revokeCurrent({
  ownerUserId: "server-owner",
  sessionReferenceId: "server-session",
  revokedAtIso: "2026-08-02T10:00:01.000Z"
});
assert.equal(rpcCalls[3][0], "revoke_comment_translator_creator_moderator_token");
assert.equal(rpcCalls[3][1].p_session_reference_id, "server-session", "atomic revoke binds the active server session");
assert.equal(JSON.stringify(rpcCalls).includes("fixture-plaintext-token"), false, "store adapter never receives plaintext");

const nowMs = Date.parse("2026-08-02T10:00:00.000Z");
const expiresAtMs = nowMs + 60_000;
const ownerA = { status: "authenticated", ownerUserId: "owner-a" };
const ownerB = { status: "authenticated", ownerUserId: "owner-b" };
const sessionAuthority = createSessionAuthority({ ownerUserId: "owner-a", sessionReferenceId: "session-a", expiresAtMs });
const tokenStore = createFakeStore();
const runtime = runtimeModule.createCommentTranslatorCreatorModeratorTokenRuntime({ tokenStore, sessionAuthority });

const issued = await runtime.issue({ callerAuthority: ownerA, nowMs, ownerUserId: "owner-b", sessionReferenceId: "session-b" });
assert.equal(issued.status, "issued");
assert.equal(Buffer.from(issued.token, "base64url").byteLength, 32, "issued plaintext has 32 bytes of entropy");
assert.equal(tokenStore.persistedPlaintextCount(), 0, "plaintext is never persisted");
assert.equal(tokenStore.current().ownerUserId, "owner-a", "caller input cannot select a different owner");
assert.equal(tokenStore.current().sessionReferenceId, "session-a", "caller input cannot select a different session");
assert.equal(tokenStore.current().tokenDigest, digest(issued.token), "only the SHA-256 digest is persisted");
assert.equal(tokenStore.current().redeemedAtIso, null, "a newly issued plaintext starts unconsumed");
assert.doesNotMatch(JSON.stringify(tokenStore.current()), new RegExp(escapeRegExp(issued.token)));
assert.deepEqual(await runtime.readStatus({ callerAuthority: ownerA, nowMs }), ready());
assert.deepEqual(await runtime.readStatus({ callerAuthority: ownerB, nowMs }), failClosed("token-missing", false));
assert.deepEqual(await runtime.issue({ callerAuthority: { status: "unauthenticated" }, nowMs }), failClosed("caller-unavailable", false));
assert.deepEqual(await runtime.validatePresentedToken({ presentedToken: issued.token, nowMs }), authorized());
assert.deepEqual(
  await runtime.validateBrowserSession({
    ownerUserId: "owner-a",
    sessionReferenceId: "session-a",
    tokenVersion: tokenStore.current().version,
    expiresAtIso: tokenStore.current().expiresAtIso,
    nowMs
  }),
  denied("invalid-token", false),
  "an unconsumed NC-M1 plaintext cannot be treated as a browser capability"
);
tokenStore.markCurrentRedeemed(new Date(nowMs).toISOString());
assert.deepEqual(
  await runtime.validatePresentedToken({ presentedToken: issued.token, nowMs }),
  denied("invalid-token", false),
  "an atomically consumed NC-M1 plaintext is denied by its direct validation seam"
);
assert.deepEqual(
  await runtime.validateBrowserSession({
    ownerUserId: "owner-a",
    sessionReferenceId: "session-a",
    tokenVersion: tokenStore.current().version,
    expiresAtIso: tokenStore.current().expiresAtIso,
    nowMs
  }),
  { status: "authorized", expiresAtIso: new Date(expiresAtMs).toISOString() },
  "only a consumed NC-M1 token can validate an NC-M2 browser record against the current version and durable session"
);

const concurrentStore = createFakeStore();
const concurrentRuntime = runtimeModule.createCommentTranslatorCreatorModeratorTokenRuntime({ tokenStore: concurrentStore, sessionAuthority });
const concurrentIssues = await Promise.all([
  concurrentRuntime.issue({ callerAuthority: ownerA, nowMs }),
  concurrentRuntime.issue({ callerAuthority: ownerA, nowMs })
]);
assert.equal(concurrentIssues.filter((result) => result.status === "issued").length, 1, "one concurrent issue wins deterministically");
assert.equal(
  concurrentIssues.filter((result) => result.status === "fail-closed" && result.reason === "current-token-exists").length,
  1,
  "the concurrent loser receives the stable current-token failure"
);

const replacementStore = createFakeStore();
const replacementSessionAuthority = createSessionAuthority({ ownerUserId: "owner-a", sessionReferenceId: "session-a", expiresAtMs });
const replacementRuntime = runtimeModule.createCommentTranslatorCreatorModeratorTokenRuntime({
  tokenStore: replacementStore,
  sessionAuthority: replacementSessionAuthority
});
const sessionAIssued = await replacementRuntime.issue({ callerAuthority: ownerA, nowMs });
assert.equal(sessionAIssued.status, "issued");
replacementSessionAuthority.replace({ ownerUserId: "owner-a", sessionReferenceId: "session-b", expiresAtMs });
assert.deepEqual(
  await replacementRuntime.validatePresentedToken({ presentedToken: sessionAIssued.token, nowMs: nowMs + 1_000 }),
  denied("invalid-token", false),
  "a former-session token becomes unavailable immediately"
);
const sessionBIssued = await replacementRuntime.issue({ callerAuthority: ownerA, nowMs: nowMs + 1_000 });
assert.equal(sessionBIssued.status, "issued", "the newly authoritative current session can replace a former-session token");
assert.equal(replacementStore.current().sessionReferenceId, "session-b", "replacement persists only the current session binding");
assert.deepEqual(
  await replacementRuntime.validatePresentedToken({ presentedToken: sessionAIssued.token, nowMs: nowMs + 2_000 }),
  denied("invalid-token", false),
  "the former-session token remains denied after current-session replacement"
);
assert.deepEqual(
  await replacementRuntime.issue({ callerAuthority: ownerA, nowMs: nowMs + 2_000 }),
  failClosed("current-token-exists", false),
  "a second issue within the same current session remains rejected"
);

assert.deepEqual(await runtime.revoke({ callerAuthority: ownerA, nowMs: nowMs + 1_000 }), revoked());
assert.deepEqual(await runtime.validatePresentedToken({ presentedToken: issued.token, nowMs: nowMs + 2_000 }), denied("invalid-token", false));
const reissued = await runtime.issue({ callerAuthority: ownerA, nowMs: nowMs + 3_000 });
assert.equal(reissued.status, "issued", "revocation permits safe reissue");
assert.notEqual(reissued.token, issued.token);
assert.deepEqual(
  await runtime.validatePresentedToken({ presentedToken: issued.token, nowMs: nowMs + 4_000 }),
  denied("invalid-token", false),
  "the pre-revoke token is rejected as a replay after reissue"
);
assert.deepEqual(await runtime.validatePresentedToken({ presentedToken: reissued.token, nowMs: nowMs + 4_000 }), authorized());

sessionAuthority.replace({ ownerUserId: "owner-a", sessionReferenceId: "session-b", expiresAtMs });
assert.deepEqual(await runtime.readStatus({ callerAuthority: ownerA, nowMs: nowMs + 5_000 }), failClosed("session-mismatch", false));
assert.deepEqual(await runtime.validatePresentedToken({ presentedToken: reissued.token, nowMs: nowMs + 5_000 }), denied("invalid-token", false));
sessionAuthority.replace({ ownerUserId: "owner-a", sessionReferenceId: "session-a", expiresAtMs });
assert.deepEqual(await runtime.validatePresentedToken({ presentedToken: reissued.token, nowMs: expiresAtMs }), denied("invalid-token", false));

assert.deepEqual(
  await runtime.validatePresentedToken({ presentedToken: "A".repeat(43), nowMs: nowMs + 6_000 }),
  denied("invalid-token", false),
  "an unknown same-shaped token cannot cross into the moderator scope"
);
const crossScopeRuntime = runtimeModule.createCommentTranslatorCreatorModeratorTokenRuntime({
  tokenStore: {
    ...createFakeStore(),
    async readByDigest() { return { status: "ready", record: { ...readyRecord(), scope: "obs-overlay-read" } }; }
  },
  sessionAuthority
});
assert.deepEqual(
  await crossScopeRuntime.validatePresentedToken({ presentedToken: reissued.token, nowMs: nowMs + 6_000 }),
  denied("invalid-token", false),
  "an NC-O1/NC-O2-shaped record never authorizes moderator access"
);

const unreadableStore = {
  async readCurrent() { return { status: "unreadable" }; },
  async readByDigest() { return { status: "unreadable" }; },
  async issueCurrent() { return { status: "rejected", reason: "unreadable" }; },
  async revokeCurrent() { return { status: "unreadable" }; }
};
const unreadableRuntime = runtimeModule.createCommentTranslatorCreatorModeratorTokenRuntime({ tokenStore: unreadableStore, sessionAuthority });
assert.deepEqual(await unreadableRuntime.readStatus({ callerAuthority: ownerA, nowMs }), failClosed("token-store-unavailable", true));
assert.deepEqual(await unreadableRuntime.issue({ callerAuthority: ownerA, nowMs }), failClosed("token-store-unavailable", true));
assert.deepEqual(await unreadableRuntime.revoke({ callerAuthority: ownerA, nowMs }), failClosed("token-store-unavailable", true));
assert.deepEqual(await unreadableRuntime.validatePresentedToken({ presentedToken: reissued.token, nowMs }), denied("moderator-share-unavailable", true));
const unavailableSessionRuntime = runtimeModule.createCommentTranslatorCreatorModeratorTokenRuntime({
  tokenStore: createFakeStore(),
  sessionAuthority: { async readCurrentForOwner() { return { status: "unavailable", reason: "session-authority-unavailable" }; } }
});
assert.deepEqual(await unavailableSessionRuntime.issue({ callerAuthority: ownerA, nowMs }), failClosed("session-unavailable", true));

for (const result of [
  issued,
  reissued,
  await runtime.readStatus({ callerAuthority: ownerA, nowMs: nowMs + 4_000 }),
  authorized(),
  denied("invalid-token", false),
  failClosed("token-store-unavailable", true),
  revoked()
]) {
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /owner-a|owner-b|session-a|session-b|[a-f0-9]{64}|ownerUserId|sessionReferenceId|tokenDigest|\bemail\b|\brecipient\b|\bdelivery\b/i, "NC-M1 output contains safe metadata only");
}

assert.deepEqual(runtimeModule.commentTranslatorCreatorModeratorTokenRuntimeContract, {
  implementationStage: "nc-m1-local-moderator-share-token-runtime",
  runtime: "server-only",
  scope: "moderator-share-read",
  callerAuthority: "server-derived-owner-only",
  sessionAuthority: "current-durable-session-rechecked",
  tokenFormat: "opaque-random-32-byte-base64url",
  persistence: "sha256-digest-only",
  plaintextDelivery: "authenticated-issue-once",
  currentTokenSemantics: "one-current-token-per-owner-session-scope",
  replayPolicy: "revoked-expired-reissued-or-cross-scope-denied",
  moderatorIdentityAuthority: "not-established-or-persisted",
  browserSessionValidation: "current-token-version-and-durable-session-rechecked",
  creatorActivation: "fixed-closed",
  productionLiveOperation: "fixed-closed",
  remoteSupabaseMigrationApply: "not-run-in-this-thread"
});

process.stdout.write("comment translator NC-M1 moderator token contract passed\n");

function createSessionAuthority(activeSession) {
  let current = activeSession;
  return {
    replace(next) { current = next; },
    async readCurrentForOwner(ownerUserId) {
      return ownerUserId === current.ownerUserId
        ? { status: "active", sessionReferenceId: current.sessionReferenceId, expiresAtMs: current.expiresAtMs }
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
    markCurrentRedeemed: (redeemedAtIso) => { record = record ? { ...record, redeemedAtIso } : null; },
    async readCurrent({ ownerUserId }) {
      return record?.ownerUserId === ownerUserId ? { status: "ready", record } : { status: "missing" };
    },
    async readByDigest({ tokenDigest }) {
      return record?.tokenDigest === tokenDigest ? { status: "ready", record } : { status: "missing" };
    },
    async issueCurrent({ record: next }) {
      persistedPlaintexts += Object.hasOwn(next, "token") ? 1 : 0;
      if (
        record && !record.revokedAtIso && Date.parse(record.expiresAtIso) > Date.parse(next.issuedAtIso) &&
        record.sessionReferenceId === next.sessionReferenceId
      ) {
        return { status: "rejected", reason: "current-token-exists" };
      }
      record = { ...next, redeemedAtIso: null, scope: "moderator-share-read", version: (record?.version ?? 0) + 1 };
      return { status: "applied" };
    },
    async revokeCurrent({ ownerUserId, sessionReferenceId, revokedAtIso }) {
      if (!record || record.ownerUserId !== ownerUserId || record.sessionReferenceId !== sessionReferenceId || record.revokedAtIso) {
        return { status: "missing" };
      }
      record = { ...record, revokedAtIso };
      return { status: "revoked" };
    }
  };
}

function readyRecord() {
  return {
    owner_user_id: "server-owner",
    session_reference_id: "server-session",
    scope: "moderator-share-read",
    token_digest: "a".repeat(64),
    issued_at: "2026-08-02T10:00:00.000Z",
    expires_at: "2026-08-02T10:01:00.000Z",
    revoked_at: null,
    redeemed_at: null,
    version: 1
  };
}

function digest(token) { return createHash("sha256").update(token, "utf8").digest("hex"); }
function ready() { return { status: "ready", scope: "moderator-share-read", access: "read-only", expiresAtIso: "2026-08-02T10:01:00.000Z", browserSafe: true }; }
function authorized() { return { status: "authorized", scope: "moderator-share-read", access: "read-only", browserSafe: true }; }
function denied(reason, retryable) { return { status: "denied", reason, retryable, browserSafe: true }; }
function revoked() { return { status: "revoked", scope: "moderator-share-read", access: "read-only", browserSafe: true }; }
function failClosed(reason, retryable) { return { status: "fail-closed", reason, retryable, browserSafe: true }; }
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function migrationFunctionBody(functionName) {
  const start = migrationSource.indexOf(`create or replace function public.${functionName}`);
  assert.ok(start >= 0, `migration function exists: ${functionName}`);
  const end = migrationSource.indexOf("\n$$;", start);
  assert.ok(end > start, `migration function has a bounded body: ${functionName}`);
  return migrationSource.slice(start, end);
}
function assertParentSessionBeforeChildTokenLock(body, functionName) {
  const preflightTokenSelect = body.indexOf("from public.comment_translator_creator_moderator_tokens");
  const sessionSelect = body.indexOf("from public.comment_translator_sessions");
  const sessionLock = body.indexOf("for share", sessionSelect);
  const advisoryLock = body.indexOf("pg_advisory_xact_lock", sessionLock);
  const tokenLock = body.indexOf("for update", advisoryLock);
  assert.ok(preflightTokenSelect >= 0, `${functionName} derives a token owner/session preflight`);
  assert.ok(sessionSelect > preflightTokenSelect && sessionLock > sessionSelect, `${functionName} locks the parent session before the child token`);
  assert.ok(advisoryLock > sessionLock, `${functionName} acquires the owner advisory lock after the parent session`);
  assert.ok(tokenLock > advisoryLock, `${functionName} locks the child token only after the parent session and advisory lock`);
}
async function importTypeScript(source) {
  const executable = stripTypeScriptTypes(source, { mode: "transform" });
  return import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);
}
