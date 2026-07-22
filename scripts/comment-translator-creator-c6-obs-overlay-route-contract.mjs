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

const tokenRuntime = await import("../lib/comment-translator-obs-overlay-token-runtime.ts");
const browserSessionRuntime = await import("../lib/comment-translator-obs-overlay-browser-session-runtime.ts");

assert.equal(
  typeof tokenRuntime.resolveCommentTranslatorObsOverlayTokenPrivateAuthorization,
  "function",
  "C5 remains the private token validation authority for C6"
);
assert.equal(
  fs.existsSync(new URL("../lib/comment-translator-obs-overlay-browser-session-runtime.ts", import.meta.url)),
  true,
  "C6 has a server-only browser-session runtime"
);
assert.equal(
  fs.existsSync(new URL("../app/api/comment-translator/obs-overlay/session/route.ts", import.meta.url)),
  true,
  "C6 redeems tokens only through a POST route"
);
assert.equal(
  fs.existsSync(new URL("../app/tools/comment-translator/overlay/page.tsx", import.meta.url)),
  true,
  "C6 has a browser-visible overlay route"
);

const nowMs = Date.parse("2026-07-22T06:00:00.000Z");
const expiresAtMs = nowMs + 60_000;
const ownerUserId = "server-owned-c6-test-owner";
const sessionReferenceId = "server-owned-c6-test-session";
const sessionAuthority = {
  active: true,
  async readCurrentForOwner(candidateOwnerUserId) {
    return this.active && candidateOwnerUserId === ownerUserId
      ? { status: "active", sessionReferenceId, expiresAtMs }
      : { status: "unavailable", reason: "active-session-missing" };
  }
};
const tokenRecords = new Map();
const tokenStore = {
  async readCurrent({ ownerUserId: candidateOwnerUserId, scope }) {
    const record = tokenRecords.get(candidateOwnerUserId) ?? null;
    return record?.scope === scope ? record : null;
  },
  async readByDigest({ tokenDigest, scope }) {
    return [...tokenRecords.values()].find((record) => record.scope === scope && record.tokenDigest === tokenDigest) ?? null;
  },
  async writeCurrent({ mode, record }) {
    const current = tokenRecords.get(record.ownerUserId) ?? null;
    if (mode === "issue" && current && !current.revokedAtIso) return "current-token-exists";
    if (mode === "rotate" && (!current || current.revokedAtIso)) return "missing-current-token";
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
const browserSessionsByDigest = new Map();
const browserSessionStore = {
  async readByDigest(digest) {
    return browserSessionsByDigest.get(digest) ?? null;
  },
  async writeCurrent(record) {
    browserSessionsByDigest.clear();
    browserSessionsByDigest.set(record.capabilityDigest, record);
  }
};

const issued = await tokenRuntime.issueCommentTranslatorObsOverlayToken({
  callerAuthorization: { status: "authorized", ownerUserId },
  sessionAuthority,
  tokenStore,
  nowMs
});
assert.equal(issued.status, "issued");
const redeemed = await browserSessionRuntime.redeemCommentTranslatorObsOverlayBrowserSession({
  presentedToken: issued.token,
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs,
  createCapability: () => randomBytes(32).toString("base64url")
});
assert.equal(redeemed.status, "ready");
const browserRecord = [...browserSessionsByDigest.values()][0];
assert.equal(browserRecord.capabilityDigest, createHash("sha256").update(redeemed.capability).digest("hex"));
assert.equal(JSON.stringify(browserRecord).includes(redeemed.capability), false);
assert.equal(JSON.stringify(browserRecord).includes(issued.token), false);
assert.equal((await browserSessionRuntime.authorizeCommentTranslatorObsOverlayBrowserSession({
  capability: redeemed.capability,
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs
})).status, "authorized");

const rotated = await tokenRuntime.rotateCommentTranslatorObsOverlayToken({
  callerAuthorization: { status: "authorized", ownerUserId },
  sessionAuthority,
  tokenStore,
  nowMs: nowMs + 1
});
assert.equal(rotated.status, "rotated");
assert.equal((await browserSessionRuntime.authorizeCommentTranslatorObsOverlayBrowserSession({
  capability: redeemed.capability,
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs: nowMs + 1
})).status, "unavailable", "rotation invalidates the previous browser session");

const redeemedAfterRotation = await browserSessionRuntime.redeemCommentTranslatorObsOverlayBrowserSession({
  presentedToken: rotated.token,
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs: nowMs + 1,
  createCapability: () => randomBytes(32).toString("base64url")
});
assert.equal(redeemedAfterRotation.status, "ready");
await tokenRuntime.revokeCommentTranslatorObsOverlayToken({
  callerAuthorization: { status: "authorized", ownerUserId },
  sessionAuthority,
  tokenStore,
  nowMs: nowMs + 2
});
assert.equal((await browserSessionRuntime.authorizeCommentTranslatorObsOverlayBrowserSession({
  capability: redeemedAfterRotation.capability,
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs: nowMs + 2
})).status, "unavailable", "revocation invalidates the current browser session");
assert.deepEqual(await browserSessionRuntime.authorizeCommentTranslatorObsOverlayBrowserSession({
  capability: "malformed",
  sessionAuthority,
  tokenStore,
  browserSessionStore,
  nowMs
}), { status: "unavailable", reason: "invalid-credential", retryable: false });
assert.deepEqual(await browserSessionRuntime.redeemCommentTranslatorObsOverlayBrowserSession({
  presentedToken: "malformed",
  sessionAuthority,
  tokenStore,
  browserSessionStore: null,
  nowMs
}), { status: "unavailable", reason: "overlay-unavailable", retryable: true });

const routeSource = fs.readFileSync(new URL("../app/api/comment-translator/obs-overlay/session/route.ts", import.meta.url), "utf8");
const pageSource = fs.readFileSync(new URL("../app/tools/comment-translator/overlay/page.tsx", import.meta.url), "utf8");
const componentSource = fs.readFileSync(new URL("../components/comment-translator/CommentTranslatorObsOverlay.tsx", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const migrationSource = fs.readFileSync(new URL("../supabase/migrations/20260722003000_comment_translator_obs_overlay_browser_sessions.sql", import.meta.url), "utf8");
assert.match(routeSource, /export async function POST/);
assert.match(routeSource, /request\.formData\(\)/);
assert.doesNotMatch(routeSource, /searchParams|localStorage|sessionStorage|console\./);
assert.doesNotMatch(pageSource, /searchParams|localStorage|sessionStorage|console\./);
assert.match(componentSource, /translated-f10/);
assert.match(componentSource, /resolveCommentTranslatorAuthorDisplayNamePolicy/);
assert.match(componentSource, /showSafeAuthorDisplayNamesInStreamSafeMode: false/);
assert.match(componentSource, /row\.badgeLabel/);
assert.match(componentSource, /row\.purchaseLabel/);
assert.match(componentSource, /<details/);
assert.match(componentSource, /sourceAttributionLabel/);
assert.match(cssSource, /background: transparent !important/);
assert.match(migrationSource, /capability_digest text not null unique/);
assert.doesNotMatch(migrationSource, /plaintext_token|token_value|raw_token/i);
assert.match(migrationSource, /revoke all on table public\.comment_translator_obs_overlay_browser_sessions from anon/);
assert.match(migrationSource, /revoke all on table public\.comment_translator_obs_overlay_browser_sessions from authenticated/);

console.log("comment_translator_creator_c6_obs_overlay_route_contract=pass");
