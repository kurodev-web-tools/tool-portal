import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export function createClient(){return {from(){return {}},rpc(){return {}}}}"
      };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    return nextResolve(specifier, context);
  }
});

const root = process.cwd();
const requiredFiles = [
  "lib/comment-translator-creator-obs-overlay-browser-session-cookie.ts",
  "lib/comment-translator-creator-obs-overlay-browser-session-runtime.ts",
  "lib/comment-translator-creator-obs-overlay-browser-session-store.ts",
  "lib/comment-translator-creator-obs-overlay-session-authority.ts",
  "app/api/comment-translator/obs-overlay/session/route.ts",
  "app/tools/comment-translator/overlay/page.tsx",
  "components/comment-translator/CommentTranslatorObsOverlay.tsx",
  "supabase/migrations/20260802010000_comment_translator_creator_obs_overlay_browser_sessions.sql"
];

for (const relativePath of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `NC-O2 required file exists: ${relativePath}`);
}

const tokenRuntime = await import("../lib/comment-translator-creator-obs-token-runtime.ts");
const browserRuntime = await import("../lib/comment-translator-creator-obs-overlay-browser-session-runtime.ts");
const browserStoreModule = await import("../lib/comment-translator-creator-obs-overlay-browser-session-store.ts");
const overlaySessionAuthorityModule = await import("../lib/comment-translator-creator-obs-overlay-session-authority.ts");

const nowMs = Date.parse("2026-08-02T10:00:00.000Z");
const ownerUserId = "server-derived-owner";
const sessionReferenceId = "server-derived-session";
const sessionAuthority = createSessionAuthority({ ownerUserId, sessionReferenceId, expiresAtMs: nowMs + 60_000 });
const tokenStore = createTokenStore();
const tokenRuntimeInstance = tokenRuntime.createCommentTranslatorCreatorObsTokenRuntime({ tokenStore, sessionAuthority });
const browserSessionStore = createBrowserSessionStore({ tokenStore, sessionAuthority });

const issued = await tokenRuntimeInstance.issue({
  callerAuthority: { status: "authenticated", ownerUserId },
  nowMs
});
assert.equal(issued.status, "issued", "NC-O1 issues only the initial one-time plaintext capability");

const redeemed = await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
  presentedToken: issued.token,
  tokenRuntime: tokenRuntimeInstance,
  browserSessionStore,
  nowMs,
  createCapability: () => randomBytes(32).toString("base64url")
});
assert.equal(redeemed.status, "ready", "POST-only redemption creates a server-owned browser capability");
const storedBrowserSession = browserSessionStore.current();
assert.equal(storedBrowserSession.capabilityDigest, digest(redeemed.capability), "only a one-way browser capability digest persists");
assert.doesNotMatch(JSON.stringify(storedBrowserSession), new RegExp(escapeRegExp(redeemed.capability)));
assert.doesNotMatch(JSON.stringify(storedBrowserSession), new RegExp(escapeRegExp(issued.token)));
assert.equal((await sessionAuthority.readCurrentForOwner(ownerUserId)).status, "active", "fixture durable session remains readable");
assert.equal((await tokenStore.readCurrent({ ownerUserId })).status, "ready", "fixture NC-O1 current token remains readable");
const directBrowserSessionValidation = await tokenRuntimeInstance.validateBrowserSession({
  ownerUserId: storedBrowserSession.ownerUserId,
  sessionReferenceId: storedBrowserSession.sessionReferenceId,
  tokenVersion: storedBrowserSession.tokenVersion,
  expiresAtIso: storedBrowserSession.expiresAtIso,
  nowMs
});
assert.equal(
  directBrowserSessionValidation.status,
  "authorized",
  `NC-O1 current version/session validation retains the redeemed record (${JSON.stringify(directBrowserSessionValidation)})`
);
const firstAuthorization = await browserRuntime.authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
  capability: redeemed.capability,
  tokenRuntime: tokenRuntimeInstance,
  browserSessionStore,
  nowMs
});
assert.equal(
  firstAuthorization.status,
  "authorized",
  `an unreadable browser cannot select owner or session; the server derives both from the digest record (${JSON.stringify(firstAuthorization)})`
);

const heartbeatSession = {
  sessionReferenceId: "heartbeat-current-session",
  startedAtMs: nowMs,
  lastHeartbeatAtMs: nowMs
};
const heartbeatAuthority = overlaySessionAuthorityModule.createCommentTranslatorCreatorObsOverlaySessionAuthority({
  durableSessionStore: readyDurableSessionStore(heartbeatSession)
});
const heartbeatTokenStore = createTokenStore();
const heartbeatTokenRuntime = tokenRuntime.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: heartbeatTokenStore,
  sessionAuthority: heartbeatAuthority
});
const heartbeatIssued = await heartbeatTokenRuntime.issue({
  callerAuthority: { status: "authenticated", ownerUserId: "heartbeat-owner" },
  nowMs
});
assert.equal(heartbeatIssued.status, "issued");
assert.equal(
  heartbeatIssued.expiresAtIso,
  new Date(nowMs + (30 * 60 * 1_000)).toISOString(),
  "the fixed free capability expiry is the authoritative session limit, not the initial heartbeat window"
);
const heartbeatBrowserSessionStore = createBrowserSessionStore({
  tokenStore: heartbeatTokenStore,
  sessionAuthority: heartbeatAuthority
});
const heartbeatRedeemed = await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
  presentedToken: heartbeatIssued.token,
  tokenRuntime: heartbeatTokenRuntime,
  browserSessionStore: heartbeatBrowserSessionStore,
  nowMs
});
assert.equal(heartbeatRedeemed.status, "ready");
assert.equal(
  heartbeatRedeemed.expiresAtIso,
  new Date(nowMs + (30 * 60 * 1_000)).toISOString(),
  "the atomic browser capability keeps the fixed authoritative session expiry"
);
heartbeatSession.lastHeartbeatAtMs = nowMs + 44_000;
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
    capability: heartbeatRedeemed.capability,
    tokenRuntime: heartbeatTokenRuntime,
    browserSessionStore: heartbeatBrowserSessionStore,
    nowMs: nowMs + 45_001
  })).status,
  "authorized",
  "a refreshed durable heartbeat keeps the browser capability valid after its original 45-second boundary"
);
heartbeatSession.lastHeartbeatAtMs = nowMs;
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
    capability: heartbeatRedeemed.capability,
    tokenRuntime: heartbeatTokenRuntime,
    browserSessionStore: heartbeatBrowserSessionStore,
    nowMs: nowMs + 45_001
  })).status,
  "unavailable",
  "a heartbeat older than the existing 45-second policy fails closed on every browser authorization"
);

const exactHeartbeatAtomicFixture = await createAtomicHeartbeatFixture({
  ownerUserId: "exact-heartbeat-owner",
  sessionReferenceId: "exact-heartbeat-session"
});
assert.equal(
  (await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: exactHeartbeatAtomicFixture.issued.token,
    tokenRuntime: exactHeartbeatAtomicFixture.tokenRuntime,
    browserSessionStore: exactHeartbeatAtomicFixture.browserSessionStore,
    nowMs: nowMs + 45_000
  })).status,
  "ready",
  "atomic redemption allows the exact 45-second heartbeat boundary"
);
const staleHeartbeatAtomicFixture = await createAtomicHeartbeatFixture({
  ownerUserId: "stale-heartbeat-owner",
  sessionReferenceId: "stale-heartbeat-session"
});
assert.deepEqual(
  await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: staleHeartbeatAtomicFixture.issued.token,
    tokenRuntime: staleHeartbeatAtomicFixture.tokenRuntime,
    browserSessionStore: staleHeartbeatAtomicFixture.browserSessionStore,
    nowMs: nowMs + 45_001
  }),
  { status: "unavailable", reason: "invalid-credential", retryable: false },
  "atomic redemption rejects a heartbeat stale by one millisecond"
);
assert.equal(
  (await staleHeartbeatAtomicFixture.tokenStore.readCurrent({ ownerUserId: "stale-heartbeat-owner" })).record.redeemedAtIso,
  null,
  "a stale durable heartbeat cannot consume the one-time token"
);
staleHeartbeatAtomicFixture.activeSession.lastHeartbeatAtMs = nowMs + 45_000;
assert.equal(
  (await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: staleHeartbeatAtomicFixture.issued.token,
    tokenRuntime: staleHeartbeatAtomicFixture.tokenRuntime,
    browserSessionStore: staleHeartbeatAtomicFixture.browserSessionStore,
    nowMs: nowMs + 45_001
  })).status,
  "ready",
  "a newly persisted heartbeat permits the unchanged token to redeem later"
);

assert.deepEqual(
  await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: issued.token,
    tokenRuntime: tokenRuntimeInstance,
    browserSessionStore,
    nowMs: nowMs + 1
  }),
  { status: "unavailable", reason: "invalid-credential", retryable: false },
  "atomic NC-O1 redemption rejects replay before a replacement browser capability is stored"
);

const versionChanged = await tokenRuntimeInstance.issue({
  callerAuthority: { status: "authenticated", ownerUserId },
  nowMs: nowMs + 2
});
assert.equal(versionChanged.status, "issued", "a fresh current NC-O1 token changes the authority version after redemption");
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
    capability: redeemed.capability,
    tokenRuntime: tokenRuntimeInstance,
    browserSessionStore,
    nowMs: nowMs + 2
  })).status,
  "unavailable",
  "current NC-O1 version changes invalidate the prior browser capability immediately"
);

const redeemedCurrent = await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
  presentedToken: versionChanged.token,
  tokenRuntime: tokenRuntimeInstance,
  browserSessionStore,
  nowMs: nowMs + 3
});
assert.equal(redeemedCurrent.status, "ready");
assert.equal(
  (await tokenRuntimeInstance.revoke({
    callerAuthority: { status: "authenticated", ownerUserId },
    nowMs: nowMs + 4
  })).status,
  "revoked"
);
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
    capability: redeemedCurrent.capability,
    tokenRuntime: tokenRuntimeInstance,
    browserSessionStore,
    nowMs: nowMs + 4
  })).status,
  "unavailable",
  "NC-O1 revocation invalidates browser access immediately"
);

const sessionMismatchStore = createTokenStore();
const sessionMismatchRuntime = tokenRuntime.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: sessionMismatchStore,
  sessionAuthority
});
const sessionMismatchIssued = await sessionMismatchRuntime.issue({
  callerAuthority: { status: "authenticated", ownerUserId },
  nowMs
});
assert.equal(sessionMismatchIssued.status, "issued");
const sessionMismatchBrowserStore = createBrowserSessionStore({ tokenStore: sessionMismatchStore, sessionAuthority });
const sessionMismatchRedeemed = await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
  presentedToken: sessionMismatchIssued.token,
  tokenRuntime: sessionMismatchRuntime,
  browserSessionStore: sessionMismatchBrowserStore,
  nowMs
});
assert.equal(sessionMismatchRedeemed.status, "ready");
sessionAuthority.sessionReferenceId = "replaced-current-session";
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
    capability: sessionMismatchRedeemed.capability,
    tokenRuntime: sessionMismatchRuntime,
    browserSessionStore: sessionMismatchBrowserStore,
    nowMs: nowMs + 5
  })).status,
  "unavailable",
  "a durable current-session replacement fails closed"
);
sessionAuthority.sessionReferenceId = sessionReferenceId;
sessionAuthority.expiresAtMs = nowMs + 5;
assert.equal(
  (await browserRuntime.authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
    capability: sessionMismatchRedeemed.capability,
    tokenRuntime: sessionMismatchRuntime,
    browserSessionStore: sessionMismatchBrowserStore,
    nowMs: nowMs + 5
  })).status,
  "unavailable",
  "expiry is rechecked before safe feed access"
);

const atomicSessionAuthority = createSessionAuthority({
  ownerUserId: "atomic-owner",
  sessionReferenceId: "atomic-session",
  expiresAtMs: nowMs + 60_000
});
const atomicTokenStore = createTokenStore();
const atomicTokenRuntime = tokenRuntime.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: atomicTokenStore,
  sessionAuthority: atomicSessionAuthority
});
const atomicIssued = await atomicTokenRuntime.issue({
  callerAuthority: { status: "authenticated", ownerUserId: "atomic-owner" },
  nowMs
});
assert.equal(atomicIssued.status, "issued");
const atomicBrowserSessionStore = createBrowserSessionStore({
  tokenStore: atomicTokenStore,
  sessionAuthority: atomicSessionAuthority
});
atomicBrowserSessionStore.failNextPostValidationWrite();
assert.deepEqual(
  await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: atomicIssued.token,
    tokenRuntime: atomicTokenRuntime,
    browserSessionStore: atomicBrowserSessionStore,
    nowMs
  }),
  { status: "unavailable", reason: "overlay-unavailable", retryable: true },
  "a post-validation persistence failure is retryable only because the atomic transaction did not consume the token"
);
assert.equal(
  (await atomicTokenStore.readCurrent({ ownerUserId: "atomic-owner" })).record.redeemedAtIso,
  null,
  "atomic write failure does not partially consume the NC-O1 token"
);
const atomicRedeemed = await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
  presentedToken: atomicIssued.token,
  tokenRuntime: atomicTokenRuntime,
  browserSessionStore: atomicBrowserSessionStore,
  nowMs: nowMs + 1
});
assert.equal(atomicRedeemed.status, "ready", "the unchanged token can redeem after an atomic rollback");
assert.deepEqual(
  await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: atomicIssued.token,
    tokenRuntime: atomicTokenRuntime,
    browserSessionStore: atomicBrowserSessionStore,
    nowMs: nowMs + 2
  }),
  { status: "unavailable", reason: "invalid-credential", retryable: false },
  "atomic redemption rejects a replay"
);

const versionMismatchStore = createTokenStore();
const versionMismatchRuntime = tokenRuntime.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: versionMismatchStore,
  sessionAuthority: atomicSessionAuthority
});
const versionMismatchIssued = await versionMismatchRuntime.issue({
  callerAuthority: { status: "authenticated", ownerUserId: "atomic-owner" },
  nowMs
});
assert.equal(versionMismatchIssued.status, "issued");
assert.equal(
  (await versionMismatchRuntime.rotate({
    callerAuthority: { status: "authenticated", ownerUserId: "atomic-owner" },
    nowMs: nowMs + 1
  })).status,
  "rotated"
);
assert.deepEqual(
  await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: versionMismatchIssued.token,
    tokenRuntime: versionMismatchRuntime,
    browserSessionStore: createBrowserSessionStore({ tokenStore: versionMismatchStore, sessionAuthority: atomicSessionAuthority }),
    nowMs: nowMs + 2
  }),
  { status: "unavailable", reason: "invalid-credential", retryable: false },
  "a replaced current token digest cannot create a browser capability"
);

const concurrentSessionAuthority = createSessionAuthority({
  ownerUserId: "concurrent-owner",
  sessionReferenceId: "concurrent-session",
  expiresAtMs: nowMs + 60_000
});
const concurrentTokenStore = createTokenStore();
const concurrentTokenRuntime = tokenRuntime.createCommentTranslatorCreatorObsTokenRuntime({
  tokenStore: concurrentTokenStore,
  sessionAuthority: concurrentSessionAuthority
});
const concurrentIssued = await concurrentTokenRuntime.issue({
  callerAuthority: { status: "authenticated", ownerUserId: "concurrent-owner" },
  nowMs
});
assert.equal(concurrentIssued.status, "issued");
const concurrentBrowserSessionStore = createBrowserSessionStore({
  tokenStore: concurrentTokenStore,
  sessionAuthority: concurrentSessionAuthority
});
const concurrentRedemptions = await Promise.all([
  browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: concurrentIssued.token,
    tokenRuntime: concurrentTokenRuntime,
    browserSessionStore: concurrentBrowserSessionStore,
    nowMs
  }),
  browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: concurrentIssued.token,
    tokenRuntime: concurrentTokenRuntime,
    browserSessionStore: concurrentBrowserSessionStore,
    nowMs
  })
]);
assert.equal(concurrentRedemptions.filter((result) => result.status === "ready").length, 1, "exactly one concurrent redemption can create a browser capability");
assert.equal(concurrentRedemptions.filter((result) => result.status === "unavailable").length, 1, "the competing concurrent redemption fails closed");

assert.deepEqual(
  await browserRuntime.authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
    capability: "malformed",
    tokenRuntime: tokenRuntimeInstance,
    browserSessionStore,
    nowMs
  }),
  { status: "unavailable", reason: "invalid-credential", retryable: false }
);
assert.deepEqual(
  await browserRuntime.redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: "malformed",
    tokenRuntime: tokenRuntimeInstance,
    browserSessionStore: null,
    nowMs
  }),
  { status: "unavailable", reason: "overlay-unavailable", retryable: true },
  "unreadable browser-session persistence fails closed"
);

const fakeSupabase = createFakeBrowserSessionSupabase();
const trustedBrowserStore = browserStoreModule.createCommentTranslatorCreatorObsOverlayBrowserSessionStore({ supabase: fakeSupabase });
await trustedBrowserStore.redeemAndWriteCurrent({
  tokenDigest: "b".repeat(64),
  capabilityDigest: "a".repeat(64),
  nowIso: "2026-08-02T10:00:00.000Z"
});
assert.equal(fakeSupabase.rpcCalls[0][0], "redeem_and_write_comment_translator_creator_obs_overlay_browser_session");
assert.equal(fakeSupabase.rpcCalls[0][1].p_capability_digest, "a".repeat(64));
assert.equal(fakeSupabase.rpcCalls[0][1].p_token_digest, "b".repeat(64));
assert.equal(JSON.stringify(fakeSupabase.rpcCalls).includes("fixture-plaintext-capability"), false);

const paidSessionAuthority = overlaySessionAuthorityModule.createCommentTranslatorCreatorObsOverlaySessionAuthority({
  durableSessionStore: readyDurableSessionStore({
    sessionReferenceId: "paid-session",
    startedAtMs: nowMs,
    lastHeartbeatAtMs: nowMs + (30 * 60 * 1_000)
  }),
  readSessionLimitMsForOwner: async () => 60 * 60 * 1_000,
  requireAuthoritativeSessionLimit: true
});
const paidSession = await paidSessionAuthority.readCurrentForOwner("paid-owner", nowMs + (30 * 60 * 1_000) + 1);
assert.equal(paidSession.status, "active");
assert.equal(
  paidSession.expiresAtMs,
  nowMs + (60 * 60 * 1_000),
  "an injected 60-minute server-owned limit remains valid beyond minute 30 while heartbeat remains current"
);
const heartbeatBoundaryAuthority = overlaySessionAuthorityModule.createCommentTranslatorCreatorObsOverlaySessionAuthority({
  durableSessionStore: readyDurableSessionStore({
    sessionReferenceId: "heartbeat-session",
    startedAtMs: nowMs,
    lastHeartbeatAtMs: nowMs
  }),
  readSessionLimitMsForOwner: () => 60 * 60 * 1_000,
  requireAuthoritativeSessionLimit: true
});
assert.deepEqual(
  await heartbeatBoundaryAuthority.readCurrentForOwner("paid-owner", nowMs + 45_001),
  { status: "unavailable", reason: "active-session-missing" },
  "the exact existing heartbeat > 45,000ms boundary is dynamically fail-closed"
);
assert.deepEqual(
  await overlaySessionAuthorityModule.createCommentTranslatorCreatorObsOverlaySessionAuthority({
    durableSessionStore: readyDurableSessionStore({
      sessionReferenceId: "future-activation-session",
      startedAtMs: nowMs,
      lastHeartbeatAtMs: nowMs
    }),
    requireAuthoritativeSessionLimit: true
  }).readCurrentForOwner("paid-owner", nowMs),
  { status: "unavailable", reason: "session-authority-unavailable" },
  "a future activation must provide a server-owned session-limit resolver"
);
assert.equal(
  overlaySessionAuthorityModule.isCommentTranslatorCreatorObsOverlayBrowserRouteClosed({ nodeEnv: "production" }),
  true,
  "the shared production gate closes both route surfaces"
);
assert.equal(
  overlaySessionAuthorityModule.isCommentTranslatorCreatorObsOverlayBrowserRouteClosed({ nodeEnv: "development" }),
  false,
  "deterministic local contracts remain available outside production"
);

const routeSource = read("app/api/comment-translator/obs-overlay/session/route.ts");
const pageSource = read("app/tools/comment-translator/overlay/page.tsx");
const componentSource = read("components/comment-translator/CommentTranslatorObsOverlay.tsx");
const cookieSource = read("lib/comment-translator-creator-obs-overlay-browser-session-cookie.ts");
const browserRuntimeSource = read("lib/comment-translator-creator-obs-overlay-browser-session-runtime.ts");
const browserStoreSource = read("lib/comment-translator-creator-obs-overlay-browser-session-store.ts");
const sessionAuthoritySource = read("lib/comment-translator-creator-obs-overlay-session-authority.ts");
const migrationSource = read("supabase/migrations/20260802010000_comment_translator_creator_obs_overlay_browser_sessions.sql");
const cssSource = read("app/globals.css");

assert.match(routeSource, /export async function POST/);
assert.match(routeSource, /request\.formData\(\)/);
assert.match(routeSource, /NextResponse\.redirect\([^,]+, 303\)/);
assert.match(routeSource, /Cache-Control", "no-store/);
assert.match(routeSource, /isCommentTranslatorCreatorObsOverlayBrowserRouteClosed/);
assert.match(pageSource, /isCommentTranslatorCreatorObsOverlayBrowserRouteClosed/);
assert.ok(
  routeSource.indexOf("if (isCommentTranslatorCreatorObsOverlayBrowserRouteClosed())") < routeSource.indexOf("const browserSessionStoreResult"),
  "POST production gate runs before any trusted store read"
);
assert.ok(
  pageSource.indexOf("if (isCommentTranslatorCreatorObsOverlayBrowserRouteClosed())") < pageSource.indexOf("const browserSessionStoreResult"),
  "GET production gate runs before cookie, store, token, session, or feed reads"
);
assert.match(routeSource, /createCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions/);
for (const [source, label] of [[routeSource, "route"], [pageSource, "page"], [componentSource, "component"]]) {
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|searchParams|console\./, `NC-O2 ${label} never exposes credentials through browser storage, URL, or logs`);
}
assert.match(cookieSource, /httpOnly: true/);
assert.match(cookieSource, /sameSite: "strict"/);
assert.match(cookieSource, /secure: process\.env\.NODE_ENV === "production"/);
assert.match(cookieSource, /path: "\/tools\/comment-translator\/overlay\/"/);
assert.match(cookieSource, /expires: new Date\(expiresAtIso\)/);
assert.match(browserRuntimeSource, /createHash\("sha256"\)/);
assert.match(browserRuntimeSource, /redeemAndWriteCurrent/);
assert.match(browserRuntimeSource, /validateBrowserSession/);
assert.doesNotMatch(browserRuntimeSource, /redeemForBrowserSession/);
assert.match(browserStoreSource, /redeem_and_write_comment_translator_creator_obs_overlay_browser_session/);
assert.match(sessionAuthoritySource, /createTrustedCommentTranslatorSessionSupabaseStore/);
assert.match(sessionAuthoritySource, /readActiveSession/);
assert.match(sessionAuthoritySource, /isCommentTranslatorHeartbeatMissing/);
assert.match(sessionAuthoritySource, /commentTranslatorSessionLimitMs\("free"\)/);
assert.match(sessionAuthoritySource, /requireAuthoritativeSessionLimit/);
assert.match(pageSource, /readCommentTranslatorRealCommentsFeedForActiveSession/);
assert.match(pageSource, /createTrustedCommentTranslatorRealCommentsFeedDurableStore/);
assert.match(componentSource, /CommentTranslatorRealCommentsFeedState/);
assert.match(componentSource, /translated-f10/);
assert.match(componentSource, /row\.badgeLabel/);
assert.match(componentSource, /row\.purchaseLabel/);
assert.match(componentSource, /sourceAttributionLabel/);
assert.match(componentSource, /<details/);
assert.match(componentSource, /useRouter/);
assert.match(componentSource, /useEffect/);
assert.match(componentSource, /overlayRefreshIntervalMs = 15_000/);
assert.match(componentSource, /setInterval/);
assert.match(componentSource, /router\.refresh\(\)/);
assert.match(componentSource, /clearInterval/);
assert.match(cssSource, /comment-translator-obs-overlay-canvas/);
assert.match(cssSource, /background: transparent !important/);

for (const marker of [
  "comment_translator_creator_obs_overlay_browser_sessions",
  "capability_digest text not null unique",
  "token_version bigint not null",
  "enable row level security",
  "revoke all on table public.comment_translator_creator_obs_overlay_browser_sessions from anon",
  "revoke all on table public.comment_translator_creator_obs_overlay_browser_sessions from authenticated",
  "redeem_and_write_comment_translator_creator_obs_overlay_browser_session",
  "read_comment_translator_creator_obs_overlay_browser_session",
  "auth.role() is distinct from 'service_role'",
  "grant execute on function",
  "to service_role",
  "pg_advisory_xact_lock"
]) {
  assert.match(migrationSource, new RegExp(escapeRegExp(marker), "i"), `migration marker: ${marker}`);
}
assert.match(
  migrationSource,
  /update public\.comment_translator_creator_obs_tokens[\s\S]*redeemed_at = p_redeemed_at[\s\S]*insert into public\.comment_translator_creator_obs_overlay_browser_sessions/,
  "one SECURITY DEFINER transaction redeems NC-O1 and replaces the browser capability"
);
const lockedSessionHeartbeatPredicate = "p_redeemed_at - session_row.last_heartbeat_at > interval '45 seconds'";
const lockedSessionHeartbeatPredicateIndex = migrationSource.indexOf(lockedSessionHeartbeatPredicate);
const tokenRedeemUpdateIndex = migrationSource.indexOf("update public.comment_translator_creator_obs_tokens");
assert.ok(
  lockedSessionHeartbeatPredicateIndex >= 0 && lockedSessionHeartbeatPredicateIndex < tokenRedeemUpdateIndex,
  "the locked authoritative session heartbeat predicate denies stale sessions before consuming NC-O1 tokens"
);
assert.match(migrationSource, /select \* into session_row[\s\S]*for share[\s\S]*session_row\.last_heartbeat_at is null[\s\S]*session_row\.last_heartbeat_at < session_row\.started_at/);
assert.doesNotMatch(migrationSource, /plaintext|token_value|raw_token|raw_capability/i, "NC-O2 migration persists only digests");
assert.doesNotMatch(migrationSource, /grant\s+(select|insert|update|delete|all).*\b(anon|authenticated)\b/i);

process.stdout.write("comment translator NC-O2 OBS overlay browser contract passed\n");

function createSessionAuthority(active) {
  return {
    ...active,
    async readCurrentForOwner(candidateOwnerUserId) {
      return candidateOwnerUserId === this.ownerUserId
        ? { status: "active", sessionReferenceId: this.sessionReferenceId, expiresAtMs: this.expiresAtMs }
        : { status: "unavailable", reason: "active-session-missing" };
    }
  };
}

function createTokenStore() {
  let record = null;
  return {
    async readCurrent({ ownerUserId }) {
      return record?.ownerUserId === ownerUserId ? { status: "ready", record } : { status: "missing" };
    },
    async readByDigest({ tokenDigest }) {
      return record?.tokenDigest === tokenDigest ? { status: "ready", record } : { status: "missing" };
    },
    async issueOrRotate({ mode, record: next }) {
      if (mode === "issue" && record && !record.revokedAtIso && !record.redeemedAtIso) {
        return { status: "rejected", reason: "current-token-exists" };
      }
      if (mode === "rotate" && (!record || record.revokedAtIso || record.redeemedAtIso)) {
        return { status: "rejected", reason: "current-token-missing" };
      }
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

function createBrowserSessionStore({ tokenStore, sessionAuthority }) {
  let current = null;
  let failPostValidationWrite = false;
  return {
    current: () => current,
    failNextPostValidationWrite() {
      failPostValidationWrite = true;
    },
    async readByDigest(capabilityDigest) {
      return current?.capabilityDigest === capabilityDigest
        ? { status: "ready", record: current }
        : { status: "missing" };
    },
    async redeemAndWriteCurrent({ tokenDigest, capabilityDigest, nowIso }) {
      const preflight = await tokenStore.readByDigest({ tokenDigest });
      if (preflight.status === "missing") return { status: "denied", reason: "invalid-token" };
      if (preflight.status === "unreadable") return { status: "unreadable", retryable: false };
      const session = await sessionAuthority.readCurrentForOwner(preflight.record.ownerUserId, Date.parse(nowIso));
      if (
        session.status !== "active" ||
        session.sessionReferenceId !== preflight.record.sessionReferenceId ||
        session.expiresAtMs <= Date.parse(nowIso) ||
        preflight.record.revokedAtIso !== null ||
        preflight.record.redeemedAtIso !== null ||
        Date.parse(preflight.record.expiresAtIso) <= Date.parse(nowIso)
      ) return { status: "denied", reason: preflight.record.redeemedAtIso ? "stale-or-replayed-token" : "invalid-token" };
      if (failPostValidationWrite) {
        failPostValidationWrite = false;
        return { status: "unreadable", retryable: true };
      }
      const redeemed = await tokenStore.redeemByDigest({ tokenDigest, nowIso });
      if (redeemed.status === "denied") return redeemed;
      current = {
        ownerUserId: redeemed.record.ownerUserId,
        sessionReferenceId: redeemed.record.sessionReferenceId,
        tokenVersion: redeemed.record.version,
        capabilityDigest,
        issuedAtIso: nowIso,
        expiresAtIso: redeemed.record.expiresAtIso
      };
      return { status: "redeemed", record: current };
    }
  };
}

async function createAtomicHeartbeatFixture({ ownerUserId, sessionReferenceId }) {
  const activeSession = {
    sessionReferenceId,
    startedAtMs: nowMs,
    lastHeartbeatAtMs: nowMs
  };
  const sessionAuthority = overlaySessionAuthorityModule.createCommentTranslatorCreatorObsOverlaySessionAuthority({
    durableSessionStore: readyDurableSessionStore(activeSession)
  });
  const tokenStore = createTokenStore();
  const tokenRuntimeInstance = tokenRuntime.createCommentTranslatorCreatorObsTokenRuntime({
    tokenStore,
    sessionAuthority
  });
  const issued = await tokenRuntimeInstance.issue({
    callerAuthority: { status: "authenticated", ownerUserId },
    nowMs
  });
  assert.equal(issued.status, "issued");
  return {
    activeSession,
    browserSessionStore: createBrowserSessionStore({ tokenStore, sessionAuthority }),
    issued,
    tokenRuntime: tokenRuntimeInstance,
    tokenStore
  };
}

function createFakeBrowserSessionSupabase() {
  const rpcCalls = [];
  return {
    rpcCalls,
    async rpc(functionName, parameters) {
      rpcCalls.push([functionName, parameters]);
      if (functionName.startsWith("redeem_and_write")) {
        return {
          data: {
            status: "redeemed",
            owner_user_id: "server-owner",
            session_reference_id: "server-session",
            token_version: 2,
            capability_digest: parameters.p_capability_digest,
            issued_at: parameters.p_redeemed_at,
            expires_at: "2026-08-02T10:01:00.000Z"
          },
          error: null
        };
      }
      return { data: { status: "missing" }, error: null };
    }
  };
}

function readyDurableSessionStore(activeSession) {
  return {
    status: "ready",
    store: {
      async readActiveSession() {
        return activeSession;
      }
    }
  };
}

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
