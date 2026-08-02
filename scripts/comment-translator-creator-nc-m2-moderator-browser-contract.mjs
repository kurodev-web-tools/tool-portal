import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const root = process.cwd();
const requiredFiles = [
  "lib/comment-translator-creator-moderator-token-types.ts",
  "lib/comment-translator-creator-moderator-token-runtime.ts",
  "lib/comment-translator-creator-moderator-browser-session-cookie.ts",
  "lib/comment-translator-creator-moderator-browser-session-store.ts",
  "lib/comment-translator-creator-moderator-browser-session-runtime.ts",
  "lib/comment-translator-creator-moderator-session-authority.ts",
  "app/api/comment-translator/moderator-share/session/route.ts",
  "app/tools/comment-translator/moderator/page.tsx",
  "components/comment-translator/CommentTranslatorModeratorShare.tsx",
  "supabase/migrations/20260802030000_comment_translator_creator_moderator_browser_sessions.sql"
];

for (const relativePath of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `NC-M2 required file exists: ${relativePath}`);
}

const browserRuntime = await import("../lib/comment-translator-creator-moderator-browser-session-runtime.ts");
const moderatorTokenRuntime = await import("../lib/comment-translator-creator-moderator-token-runtime.ts");

const nowMs = Date.parse("2026-08-02T12:00:00.000Z");
const ownerUserId = "fixture-owner";
const sessionAuthority = createSessionAuthority({
  ownerUserId,
  sessionReferenceId: "fixture-session",
  expiresAtMs: nowMs + 60_000
});
const tokenStore = createTokenStore();
const tokenRuntime = moderatorTokenRuntime.createCommentTranslatorCreatorModeratorTokenRuntime({ tokenStore, sessionAuthority });
const browserSessionStore = createBrowserSessionStore({ tokenStore, sessionAuthority });

const issued = await tokenRuntime.issue({ callerAuthority: { status: "authenticated", ownerUserId }, nowMs });
assert.equal(issued.status, "issued", "NC-M1 creates the one-time moderator credential before NC-M2 redemption");
const redeemed = await browserRuntime.redeemCommentTranslatorCreatorModeratorBrowserSession({
  presentedToken: issued.token,
  browserSessionStore,
  nowMs,
  createCapability: () => "B".repeat(43)
});
assert.deepEqual(
  redeemed,
  { status: "ready", capability: "B".repeat(43), expiresAtIso: new Date(nowMs + 60_000).toISOString() },
  "a POST-body credential atomically becomes a separate browser capability"
);
assert.equal(browserSessionStore.current().capabilityDigest, digest(redeemed.capability), "only a capability digest persists");
assert.doesNotMatch(JSON.stringify(browserSessionStore.current()), new RegExp(escapeRegExp(issued.token)), "the NC-M1 plaintext never enters browser-session persistence");
assert.doesNotMatch(JSON.stringify(browserSessionStore.current()), new RegExp(escapeRegExp(redeemed.capability)), "the browser capability plaintext never persists");
assert.deepEqual(
  await tokenRuntime.validatePresentedToken({ presentedToken: issued.token, nowMs }),
  { status: "denied", reason: "invalid-token", retryable: false, browserSafe: true },
  "a successful NC-M2 redemption consumes the NC-M1 plaintext across its direct validation seam"
);

assert.equal(
  (await tokenRuntime.validateBrowserSession({
    ownerUserId,
    sessionReferenceId: "fixture-session",
    tokenVersion: browserSessionStore.current().tokenVersion,
    expiresAtIso: browserSessionStore.current().expiresAtIso,
    nowMs
  })).status,
  "authorized",
  "NC-M1 exposes a current-version and current-session browser validation seam"
);
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorModeratorBrowserSession({
    capability: redeemed.capability,
    tokenRuntime,
    browserSessionStore,
    nowMs
  })).status,
  "authorized",
  "every moderator feed read derives owner and session only from a stored capability digest"
);

assert.deepEqual(
  await browserRuntime.redeemCommentTranslatorCreatorModeratorBrowserSession({
    presentedToken: issued.token,
    browserSessionStore,
    nowMs: nowMs + 1,
    createCapability: () => "C".repeat(43)
  }),
  unavailable("invalid-credential", false),
  "a replayed NC-M1 plaintext cannot replace the browser capability"
);
assert.deepEqual(
  await browserRuntime.authorizeCommentTranslatorCreatorModeratorBrowserSession({
    capability: "malformed",
    tokenRuntime,
    browserSessionStore,
    nowMs
  }),
  unavailable("invalid-credential", false),
  "malformed capabilities fail closed"
);

sessionAuthority.replace({ ownerUserId, sessionReferenceId: "replaced-session", expiresAtMs: nowMs + 60_000 });
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorModeratorBrowserSession({
    capability: redeemed.capability,
    tokenRuntime,
    browserSessionStore,
    nowMs: nowMs + 2
  })).status,
  "unavailable",
  "an owner-bound durable session replacement invalidates the capability immediately"
);
sessionAuthority.replace({ ownerUserId, sessionReferenceId: "fixture-session", expiresAtMs: nowMs + 60_000 });
assert.equal(
  (await tokenRuntime.revoke({ callerAuthority: { status: "authenticated", ownerUserId }, nowMs: nowMs + 3 })).status,
  "revoked"
);
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorModeratorBrowserSession({
    capability: redeemed.capability,
    tokenRuntime,
    browserSessionStore,
    nowMs: nowMs + 3
  })).status,
  "unavailable",
  "NC-M1 revocation invalidates an already-issued browser capability immediately"
);

const reissued = await tokenRuntime.issue({ callerAuthority: { status: "authenticated", ownerUserId }, nowMs: nowMs + 4 });
assert.equal(reissued.status, "issued");
const currentRedemption = await browserRuntime.redeemCommentTranslatorCreatorModeratorBrowserSession({
  presentedToken: reissued.token,
  browserSessionStore,
  nowMs: nowMs + 4,
  createCapability: () => "D".repeat(43)
});
assert.equal(currentRedemption.status, "ready");
const versionChanged = await tokenRuntime.revoke({ callerAuthority: { status: "authenticated", ownerUserId }, nowMs: nowMs + 5 });
assert.equal(versionChanged.status, "revoked");
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorModeratorBrowserSession({
    capability: currentRedemption.capability,
    tokenRuntime,
    browserSessionStore,
    nowMs: nowMs + 5
  })).status,
  "unavailable",
  "a current NC-M1 state change cannot leave a moderator browser session authorized"
);
const safelyReissued = await tokenRuntime.issue({ callerAuthority: { status: "authenticated", ownerUserId }, nowMs: nowMs + 6 });
assert.equal(safelyReissued.status, "issued", "revocation permits a replacement NC-M1 plaintext");
assert.equal(tokenStore.current().redeemedAtIso, null, "safe NC-M1 reissue resets plaintext-consumption state");
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorModeratorBrowserSession({
    capability: currentRedemption.capability,
    tokenRuntime,
    browserSessionStore,
    nowMs: nowMs + 6
  })).status,
  "unavailable",
  "the old browser capability is invalid once the replacement token version becomes current"
);
const safelyRedeemed = await browserRuntime.redeemCommentTranslatorCreatorModeratorBrowserSession({
  presentedToken: safelyReissued.token,
  browserSessionStore,
  nowMs: nowMs + 6,
  createCapability: () => "G".repeat(43)
});
assert.equal(safelyRedeemed.status, "ready", "a safely reissued plaintext redeems exactly once");
assert.deepEqual(
  await tokenRuntime.validatePresentedToken({ presentedToken: safelyReissued.token, nowMs: nowMs + 6 }),
  { status: "denied", reason: "invalid-token", retryable: false, browserSafe: true },
  "the replacement plaintext is consumed across direct validation"
);
assert.deepEqual(
  await browserRuntime.redeemCommentTranslatorCreatorModeratorBrowserSession({
    presentedToken: safelyReissued.token,
    browserSessionStore,
    nowMs: nowMs + 7,
    createCapability: () => "H".repeat(43)
  }),
  unavailable("invalid-credential", false),
  "the replacement plaintext cannot redeem twice"
);

const concurrentTokenStore = createTokenStore();
const concurrentAuthority = createSessionAuthority({ ownerUserId: "concurrent-owner", sessionReferenceId: "concurrent-session", expiresAtMs: nowMs + 60_000 });
const concurrentRuntime = moderatorTokenRuntime.createCommentTranslatorCreatorModeratorTokenRuntime({ tokenStore: concurrentTokenStore, sessionAuthority: concurrentAuthority });
const concurrentIssued = await concurrentRuntime.issue({ callerAuthority: { status: "authenticated", ownerUserId: "concurrent-owner" }, nowMs });
assert.equal(concurrentIssued.status, "issued");
const concurrentBrowserStore = createBrowserSessionStore({ tokenStore: concurrentTokenStore, sessionAuthority: concurrentAuthority });
const concurrent = await Promise.all([
  browserRuntime.redeemCommentTranslatorCreatorModeratorBrowserSession({ presentedToken: concurrentIssued.token, browserSessionStore: concurrentBrowserStore, nowMs, createCapability: () => "E".repeat(43) }),
  browserRuntime.redeemCommentTranslatorCreatorModeratorBrowserSession({ presentedToken: concurrentIssued.token, browserSessionStore: concurrentBrowserStore, nowMs, createCapability: () => "F".repeat(43) })
]);
assert.equal(concurrent.filter((result) => result.status === "ready").length, 1, "one concurrent redemption wins");
assert.equal(concurrent.filter((result) => result.status === "unavailable").length, 1, "the competing redemption fails closed");

const migrationSource = read("supabase/migrations/20260802030000_comment_translator_creator_moderator_browser_sessions.sql");
const routeSource = read("app/api/comment-translator/moderator-share/session/route.ts");
const pageSource = read("app/tools/comment-translator/moderator/page.tsx");
const componentSource = read("components/comment-translator/CommentTranslatorModeratorShare.tsx");
const cookieSource = read("lib/comment-translator-creator-moderator-browser-session-cookie.ts");
const storeSource = read("lib/comment-translator-creator-moderator-browser-session-store.ts");
const runtimeSource = read("lib/comment-translator-creator-moderator-browser-session-runtime.ts");
const authoritySource = read("lib/comment-translator-creator-moderator-session-authority.ts");
const tokenRuntimeSource = read("lib/comment-translator-creator-moderator-token-runtime.ts");
const m1ContractSource = read("scripts/comment-translator-creator-nc-m1-moderator-token-contract.mjs");

for (const marker of [
  "comment_translator_creator_moderator_browser_sessions",
  "session_reference_id text not null references public.comment_translator_sessions(session_reference_id) on delete cascade",
  "token_version bigint not null",
  "capability_digest text not null unique",
  "enable row level security",
  "read_comment_translator_creator_moderator_browser_session",
  "redeem_and_write_comment_translator_creator_moderator_browser_session",
  "auth.role() is distinct from 'service_role'",
  "interval '45 seconds'",
  "grant execute on function",
  "to service_role"
]) assert.match(migrationSource, new RegExp(escapeRegExp(marker), "i"), `NC-M2 migration marker: ${marker}`);
for (const functionName of [
  "read_comment_translator_creator_moderator_token",
  "read_comment_translator_creator_moderator_token_by_digest",
  "issue_comment_translator_creator_moderator_token"
]) {
  assert.match(migrationSource, new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}`, "i"), `NC-M2 preserves ${functionName} with authoritative consumption state`);
  const body = migrationFunctionBody(migrationSource, functionName);
  const sessionLock = body.indexOf("from public.comment_translator_sessions");
  const tokenLock = body.indexOf("from public.comment_translator_creator_moderator_tokens", sessionLock);
  assert.ok(sessionLock >= 0 && tokenLock > sessionLock, `${functionName} keeps the durable session parent before its token child lock`);
  assert.match(body, /last_heartbeat_at[\s\S]{0,450}?45 seconds/i, `${functionName} retains the NC-M1 heartbeat boundary`);
  assert.match(body, /redeemed_at/i, `${functionName} carries authoritative plaintext-consumption state`);
}
assert.match(migrationSource, /redeemed_at\s*=\s*null/i, "NC-M1 reissue resets consumed plaintext state atomically");
assert.equal((migrationSource.match(/on\s+delete\s+cascade/gi) ?? []).length, 1, "only the established session FK cascade cleans up NC-M2 capabilities");
assert.doesNotMatch(migrationSource, /plaintext|token_value|raw_token|moderator_(?:id|email)|\bemail\b|recipient|delivery|invite/i, "NC-M2 persistence has no plaintext credential or moderator identity/delivery state");
assert.doesNotMatch(migrationSource, /comment_translator_creator_obs|obs-overlay-read|obs_overlay/i, "NC-M2 migration remains isolated from OBS authority");
assert.doesNotMatch(migrationSource, /grant\s+(select|insert|update|delete|all).*\b(anon|authenticated)\b/i, "browser roles receive no table grants");
for (const functionName of ["read_comment_translator_creator_moderator_browser_session", "redeem_and_write_comment_translator_creator_moderator_browser_session"]) {
  const body = migrationFunctionBody(migrationSource, functionName);
  const sessionLock = body.indexOf("from public.comment_translator_sessions");
  const tokenLock = body.indexOf("from public.comment_translator_creator_moderator_tokens", sessionLock);
  const capabilityLock = body.indexOf("from public.comment_translator_creator_moderator_browser_sessions", tokenLock);
  assert.ok(sessionLock >= 0 && tokenLock > sessionLock && capabilityLock > tokenLock, `${functionName} keeps parent session before token and capability child locks`);
  assert.match(body, /last_heartbeat_at[\s\S]{0,450}?45 seconds/i, `${functionName} enforces the durable heartbeat inside its atomic boundary`);
}

assert.match(routeSource, /export\s+async\s+function\s+POST\s*\(/, "redemption has a POST handler");
assert.doesNotMatch(routeSource, /export\s+(?:async\s+)?function\s+GET\s*\(/, "redemption has no GET handler");
assert.match(routeSource, /request\.formData\s*\(/, "the credential is read from a POST form body");
assert.match(routeSource, /NextResponse\.redirect\([^,]+,\s*303\)/, "redemption always redirects with 303");
assert.match(routeSource, /new URL\("\/tools\/comment-translator\/moderator\/", request\.url\)/, "the redirect is stable and token-free");
assert.doesNotMatch(routeSource, /searchParams|request\.json|console\.|localStorage|sessionStorage|indexedDB|moderator(?:Id|Email|Identity)|liveChatId|provider/i, "the route cannot accept browser-selected authority or retain credentials");
assert.match(cookieSource, /httpOnly:\s*true/, "the moderator capability cookie is HttpOnly");
assert.match(cookieSource, /sameSite:\s*"strict"/, "the moderator capability cookie is SameSite Strict");
assert.match(cookieSource, /path:\s*"\/tools\/comment-translator\/moderator\/"/, "the cookie is path bounded to the moderator route");
assert.match(cookieSource, /expires:\s*new Date\(expiresAtIso\)/, "the cookie expiry is bounded by NC-M1/current-session authority");

for (const [source, label] of [[storeSource, "store"], [runtimeSource, "runtime"], [authoritySource, "authority"]]) {
  assert.match(source, /^import "server-only";/, `NC-M2 ${label} is server-only`);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|console\.|searchParams|request\.json/i, `NC-M2 ${label} has no browser credential storage/query/log path`);
  assert.doesNotMatch(source, /comment_translator_creator_obs|obs-overlay-read|obs_overlay/i, `NC-M2 ${label} never reaches OBS authority`);
}
assert.match(runtimeSource, /randomBytes\(32\)/, "NC-M2 creates a distinct 32-byte browser capability");
assert.match(runtimeSource, /createHash\("sha256"\)/, "NC-M2 persists browser capabilities as one-way digests only");
assert.match(runtimeSource, /validateBrowserSession/, "each safe-feed read invokes the NC-M1 validation seam");
assert.match(authoritySource, /isCommentTranslatorHeartbeatMissing/, "the route authority rechecks the durable heartbeat");
assert.match(tokenRuntimeSource, /validateBrowserSession\s*:/, "NC-M1 exposes the compatible browser-session validation seam");
assert.match(m1ContractSource, /validateBrowserSession/, "the NC-M1 contract guards the NC-M2 compatibility seam");
assert.doesNotMatch(m1ContractSource, /NC-M2 live browser redemption remains absent|NC-M2 moderator UI remains absent|browserRouteWiring:\s*"not-implemented-nc-m2"/, "NC-M1 no longer asserts NC-M2 absence");

assert.doesNotMatch(pageSource, /searchParams|params\.|console\.|localStorage|sessionStorage|indexedDB|liveChatId|provider|moderator(?:Id|Email|Identity)|recipient|delivery|invite/i, "the moderator page has no browser-selected authority or private identifiers");
assert.match(pageSource, /authorizeCommentTranslatorCreatorModeratorBrowserSession/, "the page authorizes its cookie before every safe-feed read");
assert.match(pageSource, /readCommentTranslatorRealCommentsFeedForActiveSession/, "the page uses the existing safe active-session feed projection");
assert.match(pageSource, /projectModeratorSafeFeed/, "the server projects only required safe fields before passing data to the browser");
assert.doesNotMatch(componentSource, /messageReferenceId|rawProviderPayload|rawComments|authorChannelMaterial|providerTargetMetadata|serverOnlyCursor|memberMonthCount/, "the client receives no extra feed identifiers or private fields");
assert.doesNotMatch(componentSource, /priority|filter|useState|moderation action|onClick|onChange|timeout/i, "NC-M2 excludes NC-V1 priority work and moderation actions");
assert.match(componentSource, /action="\/api\/comment-translator\/moderator-share\/session\/"/, "the credential form submits only to the NC-M2 redemption boundary");
assert.match(componentSource, /method="post"/, "the credential form has no GET redemption path");
assert.match(componentSource, /name="moderatorShareCredential"/, "the form uses the POST-body-only credential field");
for (const field of ["translatedText", "originalText", "authorDisplayName", "authorLabel", "badgeLabel", "purchaseLabel", "sourceAttributionLabel", "translationStatus", "moderationLabel"]) {
  assert.match(componentSource, new RegExp(escapeRegExp(field)), `moderator safe-feed rendering is bounded to existing safe ${field}`);
}
const moderationStateLabels = {
  visible: "Visible",
  deleted: "Deleted",
  banned: "Banned",
  ended: "Stream ended",
  system: "System event"
};
for (const [state, label] of Object.entries(moderationStateLabels)) {
  assert.match(componentSource, new RegExp(`${state}:\\s*["']${escapeRegExp(label)}["']`), `the ${state} safe moderation state maps to its sanitized visible label`);
}
assert.equal(new Set(Object.values(moderationStateLabels)).size, 5, "all existing moderation states have distinct safe labels");
assert.match(componentSource, /resolveModeratorStateLabel\(row\.moderationLabel\)/, "each rendered row resolves its existing safe moderation state");

process.stdout.write("comment translator NC-M2 moderator browser contract passed\n");

function createSessionAuthority(initial) {
  let current = initial;
  return {
    replace(next) { current = next; },
    async readCurrentForOwner(ownerUserId) {
      return ownerUserId === current.ownerUserId
        ? { status: "active", sessionReferenceId: current.sessionReferenceId, expiresAtMs: current.expiresAtMs }
        : { status: "unavailable", reason: "active-session-missing" };
    }
  };
}

function createTokenStore() {
  let record = null;
  return {
    current: () => record,
    consumeCurrent: (tokenDigest, redeemedAtIso) => {
      if (!record || record.tokenDigest !== tokenDigest || record.redeemedAtIso !== null) return false;
      record = { ...record, redeemedAtIso };
      return true;
    },
    async readCurrent({ ownerUserId }) {
      return record?.ownerUserId === ownerUserId ? { status: "ready", record } : { status: "missing" };
    },
    async readByDigest({ tokenDigest }) {
      return record?.tokenDigest === tokenDigest ? { status: "ready", record } : { status: "missing" };
    },
    async issueCurrent({ record: next }) {
      if (record && !record.revokedAtIso && record.sessionReferenceId === next.sessionReferenceId && Date.parse(record.expiresAtIso) > Date.parse(next.issuedAtIso)) {
        return { status: "rejected", reason: "current-token-exists" };
      }
      record = { ...next, redeemedAtIso: null, scope: "moderator-share-read", version: (record?.version ?? 0) + 1 };
      return { status: "applied" };
    },
    async revokeCurrent({ ownerUserId, sessionReferenceId, revokedAtIso }) {
      if (!record || record.ownerUserId !== ownerUserId || record.sessionReferenceId !== sessionReferenceId || record.revokedAtIso) return { status: "missing" };
      record = { ...record, revokedAtIso };
      return { status: "revoked" };
    }
  };
}

function createBrowserSessionStore({ tokenStore, sessionAuthority }) {
  let record = null;
  let redeemedDigest = null;
  return {
    current: () => record,
    async readByDigest({ capabilityDigest }) {
      return record?.capabilityDigest === capabilityDigest ? { status: "ready", record } : { status: "missing" };
    },
    async redeemAndWriteCurrent({ tokenDigest, capabilityDigest, nowIso }) {
      const token = tokenStore.current();
      const nowMs = Date.parse(nowIso);
      const session = token ? await sessionAuthority.readCurrentForOwner(token.ownerUserId, nowMs) : null;
      if (!token || token.tokenDigest !== tokenDigest || redeemedDigest === tokenDigest || token.revokedAtIso || Date.parse(token.expiresAtIso) <= nowMs || session?.status !== "active" || session.sessionReferenceId !== token.sessionReferenceId || session.expiresAtMs <= nowMs) {
        return { status: "denied", reason: "invalid-token" };
      }
      if (!tokenStore.consumeCurrent(tokenDigest, nowIso)) return { status: "denied", reason: "invalid-token" };
      redeemedDigest = tokenDigest;
      record = {
        ownerUserId: token.ownerUserId,
        sessionReferenceId: token.sessionReferenceId,
        tokenVersion: token.version,
        capabilityDigest,
        issuedAtIso: nowIso,
        expiresAtIso: token.expiresAtIso
      };
      return { status: "redeemed", record };
    }
  };
}

function unavailable(reason, retryable) { return { status: "unavailable", reason, retryable }; }
function digest(value) { return createHash("sha256").update(value, "utf8").digest("hex"); }
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function migrationFunctionBody(source, functionName) {
  const start = source.indexOf(`create or replace function public.${functionName}`);
  assert.ok(start >= 0, `NC-M2 migration function exists: ${functionName}`);
  const end = source.indexOf("\n$$;", start);
  assert.ok(end > start, `NC-M2 migration function ends: ${functionName}`);
  return source.slice(start, end);
}
