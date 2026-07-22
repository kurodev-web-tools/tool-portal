import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createSessionAuthority,
  createTokenStore,
  digestToken,
  expiresAtMs,
  nowMs,
  otherOwnerAuthorization,
  ownerAuthorization,
  unauthenticated
} from "./comment-translator-creator-c7-contract-fixture.mjs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    return nextResolve(specifier, context);
  }
});

const runtime = await import("../lib/comment-translator-moderator-share-token-runtime.ts");
const sessionAuthority = createSessionAuthority();
const tokenStore = createTokenStore();
const common = { callerAuthorization: ownerAuthorization, sessionAuthority, tokenStore, nowMs };

assert.equal(runtime.commentTranslatorModeratorShareTokenContract.scope, "moderator-share-read");
assert.equal(runtime.commentTranslatorModeratorShareTokenContract.tokenFormat, "opaque-32-byte-base64url");
assert.equal(runtime.commentTranslatorModeratorShareTokenContract.plaintextPersistence, "forbidden-digest-only");
assert.equal(runtime.commentTranslatorModeratorShareTokenContract.moderatorIdentityAuthority, "not-established-by-token");

const issued = await runtime.issueCommentTranslatorModeratorShareToken(common);
assert.equal(issued.status, "issued");
assert.match(issued.token, /^[A-Za-z0-9_-]{43}$/);
assert.deepEqual(issued, {
  status: "issued",
  token: issued.token,
  scope: "moderator-share-read",
  expiresAtIso: new Date(expiresAtMs).toISOString(),
  access: "read-only"
});

const persisted = tokenStore.recordsByOwner.get(ownerAuthorization.ownerUserId);
assert.ok(persisted);
assert.equal(persisted.tokenDigest, digestToken(issued.token));
assert.equal(JSON.stringify(persisted).includes(issued.token), false);

assert.deepEqual(await runtime.issueCommentTranslatorModeratorShareToken(common), {
  status: "unavailable", reason: "current-token-exists", retryable: false
});
assert.deepEqual(await runtime.readCommentTranslatorModeratorShareToken(common), {
  status: "ready",
  tokenState: "current",
  scope: "moderator-share-read",
  expiresAtIso: new Date(expiresAtMs).toISOString(),
  access: "read-only"
});
assert.equal(JSON.stringify(await runtime.readCommentTranslatorModeratorShareToken(common)).includes("creator-owner"), false);
assert.equal(JSON.stringify(await runtime.readCommentTranslatorModeratorShareToken(common)).includes("server-session"), false);
assert.equal(JSON.stringify(await runtime.readCommentTranslatorModeratorShareToken(common)).includes(persisted.tokenDigest), false);

assert.deepEqual(await runtime.readCommentTranslatorModeratorShareToken({
  ...common, callerAuthorization: otherOwnerAuthorization
}), { status: "unavailable", reason: "token-missing", retryable: false });

assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: issued.token, sessionAuthority, tokenStore, nowMs
}), { status: "authorized", scope: "moderator-share-read", access: "read-only" });

for (const malformed of ["", "short", "!".repeat(43), "A".repeat(42), "A".repeat(44)]) {
  assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
    presentedToken: malformed, sessionAuthority, tokenStore, nowMs
  }), { status: "denied", reason: "invalid-token", retryable: false });
}

const crossTypeStore = {
  ...tokenStore,
  async readByDigest() {
    return { ...persisted, scope: "obs-overlay-read" };
  }
};
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: issued.token, sessionAuthority, tokenStore: crossTypeStore, nowMs
}), { status: "denied", reason: "invalid-token", retryable: false });

assert.deepEqual(await runtime.revokeCommentTranslatorModeratorShareToken(common), {
  status: "revoked", scope: "moderator-share-read", access: "read-only"
});
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: issued.token, sessionAuthority, tokenStore, nowMs
}), { status: "denied", reason: "invalid-token", retryable: false });

const reissued = await runtime.issueCommentTranslatorModeratorShareToken(common);
assert.equal(reissued.status, "issued");
assert.notEqual(reissued.token, issued.token);
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: issued.token, sessionAuthority, tokenStore, nowMs
}), { status: "denied", reason: "invalid-token", retryable: false });

sessionAuthority.sessions.set(ownerAuthorization.ownerUserId, {
  status: "active", sessionReferenceId: "server-session-replaced", expiresAtMs: expiresAtMs + 1
});
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: reissued.token, sessionAuthority, tokenStore, nowMs: nowMs + 1
}), { status: "denied", reason: "invalid-token", retryable: false });
sessionAuthority.sessions.set(ownerAuthorization.ownerUserId, {
  status: "active", sessionReferenceId: "server-session-a", expiresAtMs
});
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: reissued.token, sessionAuthority, tokenStore, nowMs: expiresAtMs
}), { status: "denied", reason: "invalid-token", retryable: false });

assert.deepEqual(await runtime.readCommentTranslatorModeratorShareToken({
  ...common, callerAuthorization: unauthenticated
}), { status: "unavailable", reason: "auth-unavailable", retryable: false });
assert.deepEqual(await runtime.issueCommentTranslatorModeratorShareToken({ ...common, tokenStore: null }), {
  status: "unavailable", reason: "token-store-unavailable", retryable: true
});
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: reissued.token, sessionAuthority, tokenStore: null, nowMs
}), { status: "denied", reason: "moderator-share-unavailable", retryable: true });
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: "Z".repeat(43), sessionAuthority, tokenStore, nowMs
}), { status: "denied", reason: "invalid-token", retryable: false });
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: reissued.token,
  sessionAuthority: { async readCurrentForOwner() { return { status: "unavailable", reason: "active-session-missing" }; } },
  tokenStore,
  nowMs
}), { status: "denied", reason: "invalid-token", retryable: false });
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: reissued.token,
  sessionAuthority: { async readCurrentForOwner() { return { status: "unavailable", reason: "session-authority-unavailable" }; } },
  tokenStore,
  nowMs
}), { status: "denied", reason: "moderator-share-unavailable", retryable: true });
assert.deepEqual(await runtime.validateCommentTranslatorModeratorShareToken({
  presentedToken: reissued.token,
  sessionAuthority,
  tokenStore: { ...tokenStore, async readByDigest() { throw new Error("private-storage-detail"); } },
  nowMs
}), { status: "denied", reason: "moderator-share-unavailable", retryable: true });
assert.deepEqual(await runtime.readCommentTranslatorModeratorShareToken({
  ...common,
  tokenStore: { ...tokenStore, async readCurrent() { throw new Error("private-read-detail"); } }
}), { status: "unavailable", reason: "token-store-unavailable", retryable: true });
assert.deepEqual(await runtime.revokeCommentTranslatorModeratorShareToken({
  ...common,
  tokenStore: { ...tokenStore, async revokeCurrent() { throw new Error("private-revoke-detail"); } }
}), { status: "unavailable", reason: "token-store-unavailable", retryable: true });
assert.deepEqual(await runtime.issueCommentTranslatorModeratorShareToken({
  ...common,
  sessionAuthority: { async readCurrentForOwner() { return { status: "unavailable", reason: "active-session-missing" }; } }
}), { status: "unavailable", reason: "active-session-unavailable", retryable: false });

console.log("comment translator creator C7 moderator share token runtime contract passed");
