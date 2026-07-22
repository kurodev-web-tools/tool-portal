import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createSessionAuthority,
  createTokenStore,
  expiresAtMs,
  nowMs,
  otherOwnerAuthorization,
  ownerAuthorization,
  unauthenticated
} from "./comment-translator-creator-c5-contract-fixture.mjs";

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
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) {
        return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
    return nextResolve(specifier, context);
  }
});

const runtime = await import("../lib/comment-translator-obs-overlay-token-runtime.ts");

assert.equal(runtime.commentTranslatorObsOverlayTokenContract.implementationStage, "creator-closed-beta-c5-obs-overlay-token-runtime");
assert.equal(runtime.commentTranslatorObsOverlayTokenContract.runtime, "server-only");
assert.equal(runtime.commentTranslatorObsOverlayTokenContract.scope, "obs-overlay-read");
assert.equal(runtime.commentTranslatorObsOverlayTokenContract.plaintextPersistence, "forbidden-digest-only");

const sessionAuthority = createSessionAuthority();
const tokenStore = createTokenStore();
const common = { callerAuthorization: ownerAuthorization, sessionAuthority, tokenStore, nowMs };

const issued = await runtime.issueCommentTranslatorObsOverlayToken(common);
assert.equal(issued.status, "issued");
const firstOpaqueToken = issued.token;
assert.match(firstOpaqueToken, /^[A-Za-z0-9_-]{43}$/);
assert.deepEqual(issued, {
  status: "issued",
  token: firstOpaqueToken,
  scope: "obs-overlay-read",
  expiresAtIso: new Date(expiresAtMs).toISOString(),
  access: "read-only"
});

const persisted = tokenStore.recordsByOwner.get(ownerAuthorization.ownerUserId);
assert.ok(persisted, "issued token is persisted");
assert.equal(persisted.tokenDigest, createHash("sha256").update(firstOpaqueToken, "utf8").digest("hex"));
assert.equal(JSON.stringify(persisted).includes(firstOpaqueToken), false, "persistence contains only a one-way digest");

const duplicateIssue = await runtime.issueCommentTranslatorObsOverlayToken({
  ...common
});
assert.deepEqual(duplicateIssue, { status: "unavailable", reason: "current-token-exists", retryable: false });

const current = await runtime.readCommentTranslatorObsOverlayToken({ ...common });
assert.deepEqual(current, {
  status: "ready",
  tokenState: "current",
  scope: "obs-overlay-read",
  expiresAtIso: new Date(expiresAtMs).toISOString(),
  access: "read-only"
});
assert.equal(JSON.stringify(current).includes(ownerAuthorization.ownerUserId), false);
assert.equal(JSON.stringify(current).includes("server-session-a"), false);
assert.equal(JSON.stringify(current).includes(persisted.tokenDigest), false);

const wrongOwnerRead = await runtime.readCommentTranslatorObsOverlayToken({
  ...common,
  callerAuthorization: otherOwnerAuthorization
});
assert.deepEqual(wrongOwnerRead, { status: "unavailable", reason: "token-missing", retryable: false });

const valid = await runtime.validateCommentTranslatorObsOverlayToken({
  presentedToken: firstOpaqueToken,
  sessionAuthority,
  tokenStore,
  nowMs
});
assert.deepEqual(valid, { status: "authorized", scope: "obs-overlay-read", access: "read-only" });

for (const malformed of ["", "short", "!".repeat(43), "A".repeat(42), "A".repeat(44)]) {
  const malformedResult = await runtime.validateCommentTranslatorObsOverlayToken({
    presentedToken: malformed,
    sessionAuthority,
    tokenStore,
    nowMs
  });
  assert.deepEqual(malformedResult, { status: "denied", reason: "invalid-token", retryable: false });
}

const rotated = await runtime.rotateCommentTranslatorObsOverlayToken({
  ...common
});
assert.equal(rotated.status, "rotated");
const rotatedOpaqueToken = rotated.token;
assert.match(rotatedOpaqueToken, /^[A-Za-z0-9_-]{43}$/);
assert.notEqual(rotatedOpaqueToken, firstOpaqueToken);
assert.deepEqual(rotated, {
  status: "rotated",
  token: rotatedOpaqueToken,
  scope: "obs-overlay-read",
  expiresAtIso: new Date(expiresAtMs).toISOString(),
  access: "read-only"
});
assert.deepEqual(await runtime.validateCommentTranslatorObsOverlayToken({
  presentedToken: firstOpaqueToken, sessionAuthority, tokenStore, nowMs
}), { status: "denied", reason: "invalid-token", retryable: false }, "rotation immediately invalidates the previous token");
assert.equal((await runtime.validateCommentTranslatorObsOverlayToken({
  presentedToken: rotatedOpaqueToken, sessionAuthority, tokenStore, nowMs
})).status, "authorized");

const revoked = await runtime.revokeCommentTranslatorObsOverlayToken({ ...common });
assert.deepEqual(revoked, { status: "revoked", scope: "obs-overlay-read", access: "read-only" });
assert.deepEqual(await runtime.validateCommentTranslatorObsOverlayToken({
  presentedToken: rotatedOpaqueToken, sessionAuthority, tokenStore, nowMs
}), { status: "denied", reason: "invalid-token", retryable: false });

const afterRevoke = await runtime.issueCommentTranslatorObsOverlayToken({
  ...common
});
assert.equal(afterRevoke.status, "issued", "an authenticated owner can issue after explicit revocation");
const afterRevokeOpaqueToken = afterRevoke.token;

sessionAuthority.sessions.delete(ownerAuthorization.ownerUserId);
assert.deepEqual(await runtime.revokeCommentTranslatorObsOverlayToken({ ...common }), {
  status: "revoked",
  scope: "obs-overlay-read",
  access: "read-only"
}, "an authenticated owner can revoke residual state after the session has stopped");
sessionAuthority.sessions.set(ownerAuthorization.ownerUserId, {
  status: "active",
  sessionReferenceId: "server-session-a",
  expiresAtMs
});
const expiryBoundIssue = await runtime.issueCommentTranslatorObsOverlayToken(common);
assert.equal(expiryBoundIssue.status, "issued");
const expiryBoundToken = expiryBoundIssue.token;

assert.deepEqual(await runtime.readCommentTranslatorObsOverlayToken({
  ...common,
  callerAuthorization: unauthenticated
}), { status: "unavailable", reason: "auth-unavailable", retryable: false });

sessionAuthority.sessions.set(ownerAuthorization.ownerUserId, {
  status: "active",
  sessionReferenceId: "server-session-a",
  expiresAtMs: nowMs
});
assert.deepEqual(await runtime.readCommentTranslatorObsOverlayToken(common), {
  status: "unavailable",
  reason: "active-session-unavailable",
  retryable: false
}, "authenticated reads recheck authoritative session expiry");
sessionAuthority.sessions.set(ownerAuthorization.ownerUserId, {
  status: "active",
  sessionReferenceId: "server-session-a",
  expiresAtMs
});

assert.deepEqual(await runtime.validateCommentTranslatorObsOverlayToken({
  presentedToken: expiryBoundToken,
  sessionAuthority,
  tokenStore,
  nowMs: expiresAtMs
}), { status: "denied", reason: "invalid-token", retryable: false }, "expiry is exclusive and fails closed");

sessionAuthority.sessions.set(ownerAuthorization.ownerUserId, {
  status: "active",
  sessionReferenceId: "server-session-replaced",
  expiresAtMs: expiresAtMs + 1
});
assert.deepEqual(await runtime.validateCommentTranslatorObsOverlayToken({
  presentedToken: expiryBoundToken,
  sessionAuthority,
  tokenStore,
  nowMs: nowMs + 1
}), { status: "denied", reason: "invalid-token", retryable: false }, "a replaced session invalidates its previous overlay token");

const unavailableSessionAuthority = {
  async readCurrentForOwner() {
    return { status: "unavailable", reason: "session-authority-unavailable" };
  }
};
assert.deepEqual(await runtime.validateCommentTranslatorObsOverlayToken({
  presentedToken: expiryBoundToken,
  sessionAuthority: unavailableSessionAuthority,
  tokenStore,
  nowMs: nowMs + 1
}), { status: "denied", reason: "overlay-unavailable", retryable: true });

const throwingStore = {
  ...tokenStore,
  async readCurrent() { throw "private-storage-detail"; }
};
assert.deepEqual(await runtime.readCommentTranslatorObsOverlayToken({
  ...common,
  tokenStore: throwingStore
}), { status: "unavailable", reason: "token-store-unavailable", retryable: true });
const rejectingSessionAuthority = {
  async readCurrentForOwner() { throw { privateDetail: "never-return" }; }
};
assert.deepEqual(await runtime.issueCommentTranslatorObsOverlayToken({
  ...common,
  sessionAuthority: rejectingSessionAuthority
}), { status: "unavailable", reason: "token-store-unavailable", retryable: true });
assert.deepEqual(await runtime.revokeCommentTranslatorObsOverlayToken({
  ...common,
  tokenStore: { ...tokenStore, async revokeCurrent() { throw "private-revoke-detail"; } }
}), { status: "unavailable", reason: "token-store-unavailable", retryable: true });
assert.deepEqual(await runtime.validateCommentTranslatorObsOverlayToken({
  presentedToken: expiryBoundToken,
  sessionAuthority,
  tokenStore: { ...tokenStore, async readByDigest() { throw "private-read-detail"; } },
  nowMs: nowMs + 1
}), { status: "denied", reason: "overlay-unavailable", retryable: true });
assert.deepEqual(await runtime.issueCommentTranslatorObsOverlayToken({
  ...common,
  tokenStore: null
}), { status: "unavailable", reason: "token-store-unavailable", retryable: true });

console.log("comment translator creator C5 OBS overlay token runtime contract passed");
