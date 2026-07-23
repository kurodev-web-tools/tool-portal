import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export function createClient(){return {from(){return {}}}}"
      };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    return nextResolve(specifier, context);
  }
});

const tokenRuntime = await import("../lib/comment-translator-moderator-share-token-runtime.ts");
const browserSessionRuntime = await import("../lib/comment-translator-moderator-share-browser-session-runtime.ts");
const cookiePolicy = await import("../lib/comment-translator-moderator-share-browser-session-cookie.ts");

const nowMs = Date.parse("2026-07-23T06:00:00.000Z");
const ownerUserId = "server-owned-c8-test-owner";
let sessionReferenceId = "server-owned-c8-test-session";
let expiresAtMs = nowMs + 60_000;
const sessionAuthority = {
  unavailable: false,
  async readCurrentForOwner(candidateOwnerUserId) {
    if (this.unavailable) throw new Error("private fixture failure");
    return candidateOwnerUserId === ownerUserId
      ? { status: "active", sessionReferenceId, expiresAtMs }
      : { status: "unavailable", reason: "active-session-missing" };
  }
};

const tokenRecords = new Map();
const tokenStore = {
  unreadable: false,
  async readCurrent({ ownerUserId: candidateOwnerUserId, scope }) {
    if (this.unreadable) throw new Error("private fixture failure");
    const record = tokenRecords.get(candidateOwnerUserId) ?? null;
    return record?.scope === scope ? record : null;
  },
  async readByDigest({ tokenDigest, scope }) {
    if (this.unreadable) throw new Error("private fixture failure");
    return [...tokenRecords.values()].find((record) => record.scope === scope && record.tokenDigest === tokenDigest) ?? null;
  },
  async writeCurrent({ record }) {
    const current = tokenRecords.get(record.ownerUserId) ?? null;
    if (current && !current.revokedAtIso && Date.parse(current.expiresAtIso) > Date.parse(record.issuedAtIso)) {
      return "current-token-exists";
    }
    tokenRecords.set(record.ownerUserId, { ...record, version: (current?.version ?? 0) + 1 });
    return "applied";
  },
  async revokeCurrent({ ownerUserId: candidateOwnerUserId, revokedAtIso }) {
    const current = tokenRecords.get(candidateOwnerUserId) ?? null;
    if (!current || current.revokedAtIso) return "missing-token";
    tokenRecords.set(candidateOwnerUserId, { ...current, revokedAtIso });
    return "revoked";
  }
};

const browserRecords = new Map();
const browserSessionStore = {
  unreadable: false,
  async readByDigest(capabilityDigest) {
    if (this.unreadable) throw new Error("private fixture failure");
    return browserRecords.get(capabilityDigest) ?? null;
  },
  async writeCurrent(record) {
    if (this.unreadable) throw new Error("private fixture failure");
    browserRecords.clear();
    browserRecords.set(record.capabilityDigest, record);
  }
};

const issued = await tokenRuntime.issueCommentTranslatorModeratorShareToken({
  callerAuthorization: { status: "authorized", ownerUserId },
  sessionAuthority,
  tokenStore,
  nowMs
});
assert.equal(issued.status, "issued");

const redeemed = await browserSessionRuntime.redeemCommentTranslatorModeratorShareBrowserSession({
  presentedToken: issued.token,
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs,
  createCapability: () => randomBytes(32).toString("base64url")
});
assert.equal(redeemed.status, "ready");
const persistedBrowserRecord = [...browserRecords.values()][0];
assert.equal(
  persistedBrowserRecord.capabilityDigest,
  createHash("sha256").update(redeemed.capability).digest("hex"),
  "C8 persists only the browser capability digest"
);
assert.equal(JSON.stringify(persistedBrowserRecord).includes(redeemed.capability), false);
assert.equal(JSON.stringify(persistedBrowserRecord).includes(issued.token), false);

const authorize = (capability, atMs = nowMs) => browserSessionRuntime.authorizeCommentTranslatorModeratorShareBrowserSession({
  capability,
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs: atMs
});
assert.equal((await authorize(redeemed.capability)).status, "authorized");

assert.deepEqual(await browserSessionRuntime.redeemCommentTranslatorModeratorShareBrowserSession({
  presentedToken: "malformed",
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs
}), { status: "unavailable", reason: "invalid-credential", retryable: false });
assert.deepEqual(await browserSessionRuntime.redeemCommentTranslatorModeratorShareBrowserSession({
  presentedToken: randomBytes(32).toString("base64url"),
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs
}), { status: "unavailable", reason: "invalid-credential", retryable: false }, "C5/C6-shaped capabilities cannot validate as C7 share tokens");

await tokenRuntime.revokeCommentTranslatorModeratorShareToken({
  callerAuthorization: { status: "authorized", ownerUserId },
  sessionAuthority,
  tokenStore,
  nowMs: nowMs + 1
});
assert.equal((await authorize(redeemed.capability, nowMs + 1)).status, "unavailable", "C7 revoke invalidates C8 on next read");

const reissued = await tokenRuntime.issueCommentTranslatorModeratorShareToken({
  callerAuthorization: { status: "authorized", ownerUserId },
  sessionAuthority,
  tokenStore,
  nowMs: nowMs + 2
});
assert.equal(reissued.status, "issued");
assert.equal((await authorize(redeemed.capability, nowMs + 2)).status, "unavailable", "C7 reissue/version change rejects replay");

const redeemedAfterReissue = await browserSessionRuntime.redeemCommentTranslatorModeratorShareBrowserSession({
  presentedToken: reissued.token,
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs: nowMs + 2
});
assert.equal(redeemedAfterReissue.status, "ready");
sessionReferenceId = "server-owned-c8-replacement-session";
assert.equal(
  (await authorize(redeemedAfterReissue.capability, nowMs + 3)).status,
  "unavailable",
  "authoritative session replacement rejects replay"
);
sessionReferenceId = "server-owned-c8-test-session";
expiresAtMs = nowMs + 4;
assert.equal((await authorize(redeemedAfterReissue.capability, nowMs + 5)).status, "unavailable", "expiry rejects replay");
expiresAtMs = nowMs + 60_000;

tokenStore.unreadable = true;
assert.deepEqual(await authorize(redeemedAfterReissue.capability, nowMs + 3), {
  status: "unavailable",
  reason: "moderator-share-unavailable",
  retryable: true
});
tokenStore.unreadable = false;

sessionAuthority.unavailable = true;
assert.deepEqual(await authorize(redeemedAfterReissue.capability, nowMs + 3), {
  status: "unavailable",
  reason: "moderator-share-unavailable",
  retryable: true
});
sessionAuthority.unavailable = false;

browserSessionStore.unreadable = true;
assert.deepEqual(await authorize(redeemedAfterReissue.capability, nowMs + 3), {
  status: "unavailable",
  reason: "moderator-share-unavailable",
  retryable: true
});
browserSessionStore.unreadable = false;
assert.deepEqual(await browserSessionRuntime.authorizeCommentTranslatorModeratorShareBrowserSession({
  capability: redeemedAfterReissue.capability,
  sessionAuthority,
  tokenStore,
  browserSessionStore: null,
  nowMs: nowMs + 3
}), { status: "unavailable", reason: "moderator-share-unavailable", retryable: true });
assert.deepEqual(await browserSessionRuntime.authorizeCommentTranslatorModeratorShareBrowserSession({
  capability: "malformed",
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs: nowMs + 3
}), { status: "unavailable", reason: "invalid-credential", retryable: false });

const cookieOptions = cookiePolicy.createCommentTranslatorModeratorShareBrowserSessionCookieOptions(
  new Date(nowMs + 60_000).toISOString()
);
assert.equal(cookieOptions.httpOnly, true);
assert.equal(cookieOptions.secure, true);
assert.equal(cookieOptions.sameSite, "strict");
assert.equal(cookieOptions.path, "/tools/comment-translator/moderator/");

const routeSource = fs.readFileSync(new URL("../app/api/comment-translator/moderator-share/session/route.ts", import.meta.url), "utf8");
const pageSource = fs.readFileSync(new URL("../app/tools/comment-translator/moderator/page.tsx", import.meta.url), "utf8");
const componentSource = fs.readFileSync(new URL("../components/comment-translator/CommentTranslatorModeratorShare.tsx", import.meta.url), "utf8");
const storeSource = fs.readFileSync(new URL("../lib/comment-translator-moderator-share-browser-session-store.ts", import.meta.url), "utf8");
const migrationSource = fs.readFileSync(new URL("../supabase/migrations/20260723001000_comment_translator_moderator_share_browser_sessions.sql", import.meta.url), "utf8");

assert.match(routeSource, /export async function POST/);
assert.doesNotMatch(routeSource, /export async function (GET|PUT|PATCH|DELETE)/);
assert.match(routeSource, /request\.formData\(\)/);
assert.match(routeSource, /\/tools\/comment-translator\/moderator\//);
assert.doesNotMatch(routeSource, /searchParams|localStorage|sessionStorage|indexedDB|console\./i);
assert.doesNotMatch(pageSource, /searchParams|localStorage|sessionStorage|indexedDB|console\./i);
assert.match(pageSource, /authorizeCommentTranslatorModeratorShareBrowserSession/);
assert.match(pageSource, /readCommentTranslatorRealCommentsFeedForActiveSession/);
assert.match(componentSource, /translated-f10/);
assert.match(componentSource, /moderationLabel/);
assert.match(componentSource, /badgeLabel/);
assert.match(componentSource, /purchaseLabel/);
assert.match(componentSource, /memberMonthCount/);
assert.match(componentSource, /originalText/);
assert.match(componentSource, /sourceAttributionLabel/);
assert.match(componentSource, /Read-only/);
assert.doesNotMatch(componentSource, /startCommentTranslator|stopCommentTranslator|translateComment|localStorage|sessionStorage|indexedDB/);
assert.doesNotMatch(componentSource, /ownerUserId|sessionReferenceId|tokenDigest|capabilityDigest|providerTargetMetadata|liveChatId/);
assert.match(storeSource, /comment_translator_moderator_share_browser_sessions/);
assert.doesNotMatch(storeSource, /obs_overlay_browser_sessions|moderator_share_tokens/);
assert.match(migrationSource, /capability_digest text not null unique/);
assert.match(migrationSource, /token_version bigint not null/);
assert.doesNotMatch(migrationSource, /plaintext_token|token_value|raw_token|share_token_digest/i);
assert.match(migrationSource, /revoke all on table public\.comment_translator_moderator_share_browser_sessions from anon/);
assert.match(migrationSource, /revoke all on table public\.comment_translator_moderator_share_browser_sessions from authenticated/);
assert.match(migrationSource, /grant all on table public\.comment_translator_moderator_share_browser_sessions to service_role/);

console.log("comment_translator_creator_c8_moderator_share_route_contract=pass");
