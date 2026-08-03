import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "supabase/migrations/20260802040000_comment_translator_creator_safe_history.sql",
  "lib/comment-translator-creator-history-types.ts",
  "lib/comment-translator-creator-history-projection.ts",
  "lib/comment-translator-creator-history-store.ts",
  "lib/comment-translator-creator-history-runtime.ts",
  "app/tools/comment-translator/history-actions.ts",
  "app/tools/comment-translator/actions.ts",
  "components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx"
];

for (const relativePath of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `NC-H1 required file exists: ${relativePath}`);
}

const projectionSource = read("lib/comment-translator-creator-history-projection.ts");
const runtimeSource = read("lib/comment-translator-creator-history-runtime.ts");
const storeSource = read("lib/comment-translator-creator-history-store.ts");
const typesSource = read("lib/comment-translator-creator-history-types.ts");
const migrationSource = read("supabase/migrations/20260802040000_comment_translator_creator_safe_history.sql");
const historyActionsSource = read("app/tools/comment-translator/history-actions.ts");
const aggregateActionsSource = read("app/tools/comment-translator/actions.ts");
const panelSource = read("components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx");

assert.match(
  runtimeSource,
  /Promise<\{ readonly historyStore: CommentTranslatorCreatorSafeHistoryStore; readonly ownerUserId: string; readonly sessionReferenceId: string \} \| null>/,
  "authorized history context carries the non-null store proven by the authority boundary"
);
assert.match(
  runtimeSource,
  /context\.historyStore\.appendSafeHistory/,
  "history writes use the store narrowed by the authorized context"
);
assert.match(
  runtimeSource,
  /context\.historyStore\.readSafeHistory/,
  "history reads use the store narrowed by the authorized context"
);

const projection = await importTypeScript(projectionSource.replace('import "server-only";', ""));
const runtime = await importTypeScript(runtimeSource.replace('import "server-only";', ""));

const nowMs = Date.parse("2026-08-02T12:00:00.000Z");
const cutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
const safeFeedRow = {
  messageReferenceId: "fixture-message",
  sourceAttributionLabel: "Source: YouTube Live Chat",
  authorLabel: "YouTube viewer",
  authorDisplayName: "Fixture viewer",
  originalText: "Fixture original",
  translatedText: "Fixture translated",
  translationStatus: "translated-f10",
  moderationLabel: "visible",
  badgeLabel: "member",
  purchaseLabel: null,
  publishedAtIso: "2026-08-02T11:59:59.000Z"
};

const expectedCorrelationDigest = createHash("sha256")
  .update("fixture-owner\u0000fixture-session\u0000fixture-message", "utf8")
  .digest("hex");
const projected = projection.projectCommentTranslatorCreatorSafeHistoryRow({
  row: safeFeedRow,
  ownerUserId: "fixture-owner",
  sessionReferenceId: "fixture-session",
  nowMs
});
assert.deepEqual(projected, {
  messageCorrelationDigest: expectedCorrelationDigest,
  sourcePublishedAtIso: "2026-08-02T11:59:59.000Z",
  sourceAttributionLabel: "Source: YouTube Live Chat",
  authorLabel: "YouTube viewer",
  authorDisplayName: "Fixture viewer",
  originalText: "Fixture original",
  translatedText: "Fixture translated",
  translationStatus: "translated-f10",
  moderationLabel: "visible",
  badgeLabel: "member",
  purchaseLabel: null
}, "the projection retains only the approved safe-feed whitelist");
assert.equal(
  projection.projectCommentTranslatorCreatorSafeHistoryRow({
    row: { ...safeFeedRow, moderationLabel: "deleted", originalText: "must-not-retain", translatedText: null },
    ownerUserId: "fixture-owner",
    sessionReferenceId: "fixture-session",
    nowMs
  }),
  null,
  "a tombstone carrying text fails closed rather than retaining it"
);
assert.equal(
  projection.projectCommentTranslatorCreatorSafeHistoryRow({
    row: { ...safeFeedRow, publishedAtIso: "not-a-time" },
    ownerUserId: "fixture-owner",
    sessionReferenceId: "fixture-session",
    nowMs
  }),
  null,
  "malformed feed timestamps fail closed"
);
assert.equal(
  projection.projectCommentTranslatorCreatorSafeHistoryRow({
    row: { ...safeFeedRow, publishedAtIso: "2026-08-02T12:00:00.001Z" },
    ownerUserId: "fixture-owner",
    sessionReferenceId: "fixture-session",
    nowMs
  }),
  null,
  "future feed timestamps fail closed with UTC-stable comparison"
);
assert.equal(
  projection.projectCommentTranslatorCreatorSafeHistoryRow({
    row: { ...safeFeedRow, publishedAtIso: new Date(cutoffMs - 1).toISOString() },
    ownerUserId: "fixture-owner",
    sessionReferenceId: "fixture-session",
    nowMs
  }),
  null,
  "source timestamps older than the inclusive seven-day window fail closed before persistence"
);

const storedBoundaryRow = {
  sourceAttributionLabel: "Source: YouTube Live Chat",
  authorLabel: "YouTube viewer",
  authorDisplayName: "Fixture viewer",
  originalText: "Fixture original",
  translatedText: "Fixture translated",
  translationStatus: "translated-f10",
  moderationLabel: "visible",
  badgeLabel: "member",
  purchaseLabel: null,
  sourcePublishedAtIso: new Date(cutoffMs).toISOString(),
  recordedAtIso: new Date(nowMs).toISOString()
};
assert.equal(
  runtime.isCommentTranslatorCreatorSafeHistoryWithinInclusiveCutoff({ sourcePublishedAtIso: storedBoundaryRow.sourcePublishedAtIso, nowMs }),
  true,
  "the seven-day cutoff is inclusive at the exact UTC boundary"
);
assert.equal(
  runtime.isCommentTranslatorCreatorSafeHistoryWithinInclusiveCutoff({ sourcePublishedAtIso: new Date(cutoffMs - 1).toISOString(), nowMs }),
  false,
  "a row older than the exact UTC cutoff is excluded"
);
assert.equal(
  runtime.isCommentTranslatorCreatorSafeHistoryWithinInclusiveCutoff({ sourcePublishedAtIso: "not-a-time", nowMs }),
  false,
  "malformed stored timestamps fail closed"
);
assert.equal(
  runtime.isCommentTranslatorCreatorSafeHistoryWithinInclusiveCutoff({ sourcePublishedAtIso: new Date(nowMs + 1).toISOString(), nowMs }),
  false,
  "future stored timestamps fail closed"
);

const store = createFixtureStore({ nowMs });
let fixtureFeed = [projected];
const paidAuthority = async ({ callerAuthority }) => callerAuthority.status === "authenticated" && callerAuthority.ownerUserId === "fixture-owner"
  ? { status: "ready" }
  : { status: "fail-closed", reason: "paid-inactive" };
const sessionAuthority = {
  async readCurrentForOwner(ownerUserId) {
    return ownerUserId === "fixture-owner"
      ? { status: "ready", sessionReferenceId: "fixture-session" }
      : { status: "unavailable", reason: "session-unavailable" };
  }
};
const historyRuntime = runtime.createCommentTranslatorCreatorSafeHistoryRuntime({
  historyStore: store,
  paidAuthority,
  sessionAuthority,
  readSafeFeed: async ({ ownerUserId, sessionReferenceId }) => (
    ownerUserId === "fixture-owner" && sessionReferenceId === "fixture-session"
      ? { status: "ready", rows: fixtureFeed }
      : { status: "unavailable", reason: "safe-feed-unavailable" }
  )
});

assert.deepEqual(
  await historyRuntime.capture({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs }),
  { status: "recorded", recordedCount: 1 },
  "a paid-active authenticated owner writes only the current safe session projection"
);
assert.deepEqual(
  await historyRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs }),
  { status: "ready", rows: [toBrowserSafeRow(projected, nowMs)] },
  "a paid-active authenticated owner reads a safe stored projection"
);
assert.deepEqual(store.calls.at(-1), { operation: "read", ownerUserId: "fixture-owner", sessionReferenceId: "fixture-session" }, "runtime derives the current owner and session server-side");
assert.ok(store.calls.every((call) => !("cutoff" in call) && !("retentionWindow" in call)), "the browser/runtime never supplies a cutoff or retention window to the store");

fixtureFeed = [{ ...projected, moderationLabel: "deleted", originalText: null, translatedText: null }];
assert.deepEqual(
  await historyRuntime.capture({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs }),
  { status: "recorded", recordedCount: 1 },
  "a later safe tombstone updates the correlated history item"
);
assert.deepEqual(
  (await historyRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).rows,
  [{ ...toBrowserSafeRow(projected, nowMs), moderationLabel: "deleted", originalText: null, translatedText: null }],
  "visible-to-tombstone propagation removes prior retained text"
);
fixtureFeed = [projected];
await historyRuntime.capture({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs });
assert.equal(store.rowCount, 1, "repeat capture upserts one correlated history item rather than duplicating it");
assert.deepEqual(
  (await historyRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).rows,
  [{ ...toBrowserSafeRow(projected, nowMs), moderationLabel: "deleted", originalText: null, translatedText: null }],
  "a visible update cannot resurrect a prior tombstone"
);
store.seedPriorSession({
  ownerUserId: "fixture-owner",
  sessionReferenceId: "prior-session",
  row: { ...toBrowserSafeRow(projected, nowMs), sourcePublishedAtIso: new Date(nowMs - 1_000).toISOString() }
});
assert.equal(
  (await historyRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).rows.length,
  2,
  "current-session authorization returns the same owner's in-window prior-session history without exposing a session identifier"
);
store.seedExpiredRows({ ownerUserId: "fixture-owner", count: 101 });
assert.equal(store.rowCount, 103, "the expiry fixture starts with more than the former 100-row cleanup cap");
await historyRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs });
assert.equal(store.rowCount, 2, "each successful read expires every old source-time row, including all 101 fixture rows");

const dbEvaluatedAtIso = new Date(nowMs + 2).toISOString();
const clockStore = createFixtureStore({ nowMs, evaluatedAtIso: dbEvaluatedAtIso });
const clockRuntime = runtime.createCommentTranslatorCreatorSafeHistoryRuntime({
  historyStore: clockStore,
  paidAuthority,
  sessionAuthority,
  readSafeFeed: async () => ({ status: "ready", rows: [projected] })
});
const workerFutureButDbValidRow = {
  ...toBrowserSafeRow(projected, nowMs),
  sourcePublishedAtIso: new Date(nowMs + 1).toISOString()
};
clockStore.replaceRows([workerFutureButDbValidRow]);
assert.deepEqual(
  await clockRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs }),
  { status: "ready", rows: [workerFutureButDbValidRow] },
  "a row newer than the pre-RPC Worker clock but valid at the DB evaluation clock remains readable"
);
clockStore.setEvaluatedAtIso("not-a-time");
assert.equal(
  (await clockRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).status,
  "unavailable",
  "a malformed authoritative DB evaluation clock fails closed"
);
clockStore.setEvaluatedAtIso(dbEvaluatedAtIso);
clockStore.replaceRows([{ ...workerFutureButDbValidRow, sourcePublishedAtIso: new Date(nowMs + 3).toISOString() }]);
assert.equal(
  (await clockRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).status,
  "unavailable",
  "a row truly newer than the DB evaluation clock fails closed"
);

const freeStore = createFixtureStore();
const freeRuntime = runtime.createCommentTranslatorCreatorSafeHistoryRuntime({
  historyStore: freeStore,
  paidAuthority: async () => ({ status: "fail-closed", reason: "paid-inactive" }),
  sessionAuthority,
  readSafeFeed: async () => ({ status: "ready", rows: [projected] })
});
assert.equal(
  (await freeRuntime.capture({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).status,
  "unavailable",
  "Free or paid-inactive authority cannot retain history"
);
assert.equal(freeStore.calls.length, 0, "Free or paid-inactive authority never reaches the history store");
assert.equal(
  (await historyRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "other-owner" }, nowMs })).status,
  "unavailable",
  "cross-owner reads fail before store access"
);
assert.equal(
  (await historyRuntime.read({ callerAuthority: { status: "unauthenticated" }, nowMs })).status,
  "unavailable",
  "unauthenticated reads fail closed"
);
assert.equal(
  (await runtime.createCommentTranslatorCreatorSafeHistoryRuntime({
    historyStore: null,
    paidAuthority,
    sessionAuthority,
    readSafeFeed: async () => ({ status: "ready", rows: [projected] })
  }).read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).status,
  "unavailable",
  "an unavailable history store fails closed"
);

store.replaceRows([{ ...storedBoundaryRow, sourcePublishedAtIso: new Date(nowMs + 1).toISOString() }]);
assert.equal(
  (await historyRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).status,
  "unavailable",
  "a future row returned by an unreadable/malformed store fails closed"
);
store.replaceRows([{ ...storedBoundaryRow, recordedAtIso: new Date(nowMs + 1).toISOString() }]);
assert.equal(
  (await historyRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).status,
  "unavailable",
  "a future authoritative recorded timestamp fails closed"
);
store.replaceRows([{ ...storedBoundaryRow, moderationLabel: "deleted", originalText: "must-not-render", translatedText: null }]);
assert.equal(
  (await historyRuntime.read({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })).status,
  "unavailable",
  "a tombstone with text returned by a store fails closed"
);
store.replaceRows([toBrowserSafeRow(projected, nowMs)]);

const concurrentResults = await Promise.all([
  historyRuntime.capture({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs }),
  historyRuntime.capture({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs })
]);
assert.deepEqual(concurrentResults.map((result) => result.status), ["recorded", "recorded"], "concurrent fixture writes complete through one atomic store seam");
assert.equal(store.atomicWrites, 5, "the runtime delegates each accepted write exactly once to the atomic store seam");

const cleanupStore = createFixtureStore();
const cleanupRuntime = runtime.createCommentTranslatorCreatorSafeHistoryRuntime({
  historyStore: cleanupStore,
  paidAuthority: async () => ({ status: "fail-closed", reason: "paid-inactive" }),
  sessionAuthority,
  readSafeFeed: async () => ({ status: "unavailable", reason: "safe-feed-unavailable" })
});
assert.deepEqual(
  await cleanupRuntime.cleanupForDisconnect({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" } }),
  { status: "deleted", removedCount: 1 },
  "disconnect cleanup is owner-derived and does not require a browser-paid flag"
);
assert.deepEqual(
  await cleanupRuntime.cleanupForAccountDeletion({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" } }),
  { status: "deleted", removedCount: 0 },
  "account-deletion cleanup is idempotent after disconnect cleanup"
);
assert.equal(cleanupStore.calls.every((call) => call.ownerUserId === "fixture-owner"), true, "cleanup never accepts a browser-selected cleanup owner");

for (const source of [typesSource, projectionSource, storeSource, runtimeSource]) {
  assert.match(source, /^import "server-only";/, "every NC-H1 server data module is server-only");
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|console\.|searchParams|request\.json/i, "NC-H1 server modules have no browser storage/query/log path");
  assert.doesNotMatch(source, /comment_translator_creator_(?:obs|moderator)|obs-overlay-read|moderator-share-read/i, "NC-H1 remains isolated from NC-O and NC-M scopes");
}
assert.match(typesSource, /CommentTranslatorCreatorSafeHistoryRow/, "the history interface uses a named safe-row contract");
assert.match(typesSource, /messageCorrelationDigest/, "only the server-side write snapshot carries the correlation digest");
assert.match(typesSource, /evaluatedAtIso/, "the read contract carries the authoritative DB evaluation clock internally");
assert.match(projectionSource, /createHash\("sha256"\)/, "the projection derives the correlation as a one-way digest");
assert.match(projectionSource, /messageReferenceId/, "the projection consumes the existing safe-feed message reference only server-side");
assert.doesNotMatch(projectionSource, /rawProviderPayload|rawComments|providerTargetMetadata|memberMonthCount/i, "the projection cannot expand the existing safe whitelist");
assert.match(runtimeSource, /paidAuthority/, "runtime requires a server-owned paid authority seam");
assert.match(historyActionsSource, /commentTranslatorCreatorPaidActivationPolicy/, "production actions retain the fixed NC-E1 activation policy");
assert.match(historyActionsSource, /createTrustedCommentTranslatorCreatorEntitlementStore/, "the future seam constructs the established NC-D1 trusted store");
assert.match(historyActionsSource, /authorizeCommentTranslatorCreatorPaidProvider/, "the future seam delegates paid authority to NC-E1");
assert.match(historyActionsSource, /activationPolicy:\s*commentTranslatorCreatorPaidActivationPolicy/, "the current fixed-closed policy is passed to NC-E1 before any store read");
assert.match(historyActionsSource, /nowMs:\s*\(\)\s*=>\s*nowMs/, "the future NC-E1 seam receives its established clock function interface");
assert.ok(
  historyActionsSource.indexOf('if (commentTranslatorCreatorPaidActivationPolicy.status === "closed")') < historyActionsSource.indexOf("createEntitlementStore()"),
  "the fixed-closed policy short-circuits before constructing the trusted entitlement store"
);
assert.doesNotMatch(historyActionsSource, /status:\s*["']allowed|(?:request|options|args)\.[\s\S]{0,60}?(?:owner|entitlement|session|retention|target|liveChatId)/i, "history actions accept no browser-selected owner, entitlement, retention, or target authority");
for (const name of [
  "readCommentTranslatorCreatorSafeHistoryAction",
  "captureCommentTranslatorCreatorSafeHistoryAction",
  "cleanupCommentTranslatorCreatorSafeHistoryForDisconnectAction",
  "cleanupCommentTranslatorCreatorSafeHistoryForAccountDeletionAction"
]) assert.match(historyActionsSource, new RegExp(`export\\s+async\\s+function\\s+${name}\\s*\\(\\s*\\)`), `history action takes no browser authority input: ${name}`);
assert.match(runtimeSource, /cleanupWiring:\s*["']server-orchestration-seam-not-wired/, "cleanup is explicitly an unwired server orchestration seam");
assert.match(aggregateActionsSource, /from "\.\/history-actions"/, "the aggregate action module exposes the disconnected NC-H1 actions");
assert.doesNotMatch(aggregateActionsSource, /NC-H1|history.*(?:localStorage|sessionStorage|indexedDB|console\.)/i, "the aggregate action module adds no browser authority or logging");

for (const marker of [
  "comment_translator_creator_safe_history",
  "enable row level security",
  "append_comment_translator_creator_safe_history",
  "read_comment_translator_creator_safe_history",
  "cleanup_comment_translator_creator_safe_history_for_owner",
  "security definer",
  "set search_path = ''",
  "auth.role() is distinct from 'service_role'",
  "interval '45 seconds'",
  "interval '7 days'",
  "source_published_at >= v_cutoff",
  "clock_timestamp()",
  "pg_advisory_xact_lock",
  "grant execute on function",
  "to service_role"
]) assert.match(migrationSource, new RegExp(escapeRegExp(marker), "i"), `NC-H1 migration marker: ${marker}`);
assert.match(migrationSource, /message_correlation_digest\s+text\s+not\s+null/i, "the table stores only a server-side fixed-format correlation digest");
assert.match(migrationSource, /source_published_at\s+timestamptz\s+not\s+null/i, "the table retains the safe source timestamp separately from audit time");
assert.match(migrationSource, /'evaluated_at'\s*,\s*v_now/i, "read returns the authoritative DB evaluation clock with its rows");
assert.match(migrationSource, /unique\s*\(\s*owner_user_id\s*,\s*session_reference_id\s*,\s*message_correlation_digest\s*\)/i, "owner/session correlation is unique for atomic upsert");
assert.match(migrationSource, /revoke\s+all\s+on\s+table[\s\S]{0,200}?\bservice_role\b/i, "direct service_role table access is revoked");
assert.doesNotMatch(migrationSource, /grant\s+(?:select|insert|update|delete|all)\s+on\s+table/i, "no role receives direct NC-H1 table access");
const executeGrantStatements = migrationSource.match(/grant\s+execute[\s\S]*?;/gi) ?? [];
assert.equal(executeGrantStatements.length, 3, "NC-H1 exposes exactly its three atomic RPC grants");
assert.ok(executeGrantStatements.every((statement) => /to\s+service_role\s*;$/i.test(statement)), "only service_role receives NC-H1 RPC execution");
for (const functionName of [
  "append_comment_translator_creator_safe_history",
  "read_comment_translator_creator_safe_history"
]) {
  const body = migrationFunctionBody(migrationSource, functionName);
  const sessionLock = body.indexOf("from public.comment_translator_sessions");
  const entitlementLock = body.indexOf("from public.comment_translator_creator_paid_entitlements", sessionLock);
  const historyLock = body.indexOf("from public.comment_translator_creator_safe_history", entitlementLock);
  assert.ok(sessionLock >= 0 && entitlementLock > sessionLock && historyLock > entitlementLock, `${functionName} locks session parent, entitlement, then history child`);
  assert.match(body, /last_heartbeat_at[\s\S]{0,500}?45 seconds/i, `${functionName} rechecks the durable heartbeat atomically`);
  assert.match(body, /period_start[\s\S]{0,500}?period_end/i, `${functionName} rechecks paid-active entitlement atomically`);
  assert.doesNotMatch(body, /limit\s+100[\s\S]{0,80}?for\s+update\s+skip\s+locked/i, `${functionName} expires every eligible row rather than only 100`);
}
const appendBody = migrationFunctionBody(migrationSource, "append_comment_translator_creator_safe_history");
assert.match(appendBody, /on\s+conflict\s*\(\s*owner_user_id\s*,\s*session_reference_id\s*,\s*message_correlation_digest\s*\)\s*do\s+update/i, "append atomically deduplicates the correlated safe history row");
assert.doesNotMatch(appendBody, /jsonb_array_length\s*\(\s*p_rows\s*\)\s*>\s*\d+/i, "append accepts every safe-feed row without an unapproved numeric batch cap");
assert.match(appendBody, /original_text\s*=\s*case[\s\S]{0,700}?null/i, "a tombstone transition clears previously retained text atomically");
assert.match(appendBody, /when\s+public\.comment_translator_creator_safe_history\.moderation_label\s*<>\s*'visible'/i, "a prior tombstone is monotonic and cannot be resurrected by a visible update");
const readBody = migrationFunctionBody(migrationSource, "read_comment_translator_creator_safe_history");
assert.match(readBody, /source_published_at\s*>=\s*v_cutoff/i, "read retention uses the inclusive source-time cutoff");
assert.doesNotMatch(readBody, /session_reference_id\s*=\s*v_session\.session_reference_id/i, "current-session authorization reads all of the owner's in-window prior-session history");
assert.doesNotMatch(readBody, /\blimit\s+\d+/i, "read returns every owner in-window row without an unapproved numeric cap");
for (const [operation, body] of [["append", appendBody], ["read", readBody]]) {
  const expiryStart = body.indexOf("delete from public.comment_translator_creator_safe_history");
  const expirySection = body.slice(expiryStart, body.indexOf(";", expiryStart) + 1);
  assert.match(expirySection, /delete\s+from\s+public\.comment_translator_creator_safe_history[\s\S]{0,180}?source_published_at\s*<\s*v_cutoff/i, `${operation} expires every owner row by source time`);
  assert.doesNotMatch(expirySection, /limit\s+\d+/i, `${operation} expiry is not capped at 100 rows`);
}
const cleanupBody = migrationFunctionBody(migrationSource, "cleanup_comment_translator_creator_safe_history_for_owner");
assert.ok(cleanupBody.indexOf("from public.comment_translator_sessions") < cleanupBody.indexOf("from public.comment_translator_creator_safe_history"), "cleanup locks parent sessions before deleting history children");
assert.ok(cleanupBody.indexOf("from public.comment_translator_sessions") < cleanupBody.indexOf("pg_advisory_xact_lock"), "cleanup takes parent session locks before the owner serialization lock");
assert.match(cleanupBody, /delete[\s\S]{0,120}?comment_translator_creator_safe_history/i, "cleanup is an atomic owner-scoped delete seam");
assert.doesNotMatch(migrationSource, /raw_provider|raw_comments|token|cookie|livechat|priority|filter|csv|queue|workflow|cron|r2|container|docker/i, "migration excludes private retention and out-of-scope NC-H1 surfaces");

assert.match(storeSource, /\.rpc\(/, "the store uses RPCs rather than table CRUD");
assert.match(storeSource, /evaluated_at/, "the store requires the authoritative DB read evaluation timestamp");
assert.doesNotMatch(storeSource, /\.from\(/, "the store never uses direct table CRUD");
assert.doesNotMatch(storeSource, /p_now|p_cutoff|retentionWindow|ownerUserId.*return|sessionReferenceId.*return/i, "the store does not send clocks/retention or return authority identifiers");
assert.match(panelSource, /aria-live="polite"/, "the panel exposes status changes accessibly");
assert.match(panelSource, /commentTranslatorCreatorHistoryPanelContract/, "the panel declares deterministic-prop-only lifecycle scope");
assert.match(panelSource, /deterministic-props-only-not-production-wired/, "the panel does not claim closed production reachability");
assert.match(panelSource, /<details/, "the panel offers a keyboard-focusable safe original-text control");
assert.match(panelSource, /w-full/, "the panel has a width-safe layout class");
for (const state of ["ready", "unavailable", "deleted"]) assert.match(panelSource, new RegExp(`status\\s*===\\s*["']${state}["']`), `panel renders the ${state} state`);
assert.doesNotMatch(panelSource, /messageReferenceId|ownerUserId|sessionReferenceId|liveChatId|rawProviderPayload|rawComments|localStorage|sessionStorage|indexedDB|searchParams|console\.|priority|filter/i, "the panel has no identifiers, private fields, browser storage, or NC-V1 work");

process.stdout.write("comment translator NC-H1 seven-day safe history contract passed\n");

function createFixtureStore({
  nowMs = Date.parse("2026-08-02T12:00:00.000Z"),
  evaluatedAtIso = new Date(nowMs).toISOString()
} = {}) {
  let rows = [];
  let currentEvaluatedAtIso = evaluatedAtIso;
  let explicitRows = false;
  const records = new Map();
  const calls = [];
  let cleanupCount = 1;
  let writeQueue = Promise.resolve();
  let atomicWrites = 0;
  return {
    calls,
    get rowCount() { return records.size; },
    get atomicWrites() { return atomicWrites; },
    setEvaluatedAtIso(next) { currentEvaluatedAtIso = next; },
    replaceRows(next) {
      rows = next;
      explicitRows = true;
    },
    seedPriorSession({ ownerUserId, sessionReferenceId, row }) {
      records.set(`${ownerUserId}:${sessionReferenceId}:prior`, { ownerUserId, sessionReferenceId, row });
      rows = [...records.values()].filter((record) => record.ownerUserId === ownerUserId).map((record) => record.row);
      explicitRows = false;
    },
    seedExpiredRows({ ownerUserId, count }) {
      for (let index = 0; index < count; index += 1) {
        records.set(`${ownerUserId}:expired-${index}`, {
          ownerUserId,
          sessionReferenceId: `expired-${index}`,
          row: {
            ...toBrowserSafeRow(projected, nowMs),
            sourcePublishedAtIso: new Date(nowMs - 7 * 24 * 60 * 60 * 1000 - 1).toISOString()
          }
        });
      }
      rows = [...records.values()].filter((record) => record.ownerUserId === ownerUserId).map((record) => record.row);
      explicitRows = false;
    },
    async appendSafeHistory({ ownerUserId, sessionReferenceId, rows: nextRows }) {
      calls.push({ operation: "append", ownerUserId, sessionReferenceId, rowCount: nextRows.length });
      const previous = writeQueue;
      let release;
      writeQueue = new Promise((resolve) => { release = resolve; });
      await previous;
      atomicWrites += 1;
      release();
      removeExpiredOwnerRecords(records, ownerUserId, nowMs);
      for (const next of nextRows) {
        const key = `${ownerUserId}:${sessionReferenceId}:${next.messageCorrelationDigest}`;
        const existing = records.get(key);
        const priorTombstone = existing?.row.moderationLabel !== undefined && existing.row.moderationLabel !== "visible";
        const tombstone = priorTombstone || next.moderationLabel !== "visible";
        const row = {
          ...toBrowserSafeRow(next, nowMs),
          sourcePublishedAtIso: existing?.row.sourcePublishedAtIso && existing.row.sourcePublishedAtIso < next.sourcePublishedAtIso
            ? existing.row.sourcePublishedAtIso
            : next.sourcePublishedAtIso,
          moderationLabel: priorTombstone ? existing.row.moderationLabel : next.moderationLabel,
          originalText: tombstone ? null : next.originalText,
          translatedText: tombstone ? null : next.translatedText
        };
        records.set(key, { ownerUserId, sessionReferenceId, row });
      }
      rows = [...records.values()].filter((record) => record.ownerUserId === ownerUserId).map((record) => record.row);
      explicitRows = false;
      return { status: "recorded", recordedCount: nextRows.length };
    },
    async readSafeHistory({ ownerUserId, sessionReferenceId }) {
      calls.push({ operation: "read", ownerUserId, sessionReferenceId });
      removeExpiredOwnerRecords(records, ownerUserId, nowMs);
      if (!explicitRows) rows = [...records.values()].filter((record) => record.ownerUserId === ownerUserId).map((record) => record.row);
      return { status: "ready", evaluatedAtIso: currentEvaluatedAtIso, rows };
    },
    async cleanupOwner({ ownerUserId }) {
      calls.push({ operation: "cleanup", ownerUserId });
      const removedCount = cleanupCount;
      cleanupCount = 0;
      return { status: "deleted", removedCount };
    }
  };
}

function removeExpiredOwnerRecords(records, ownerUserId, nowMs) {
  const cutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  for (const [key, record] of records) {
    if (record.ownerUserId === ownerUserId && Date.parse(record.row.sourcePublishedAtIso) < cutoffMs) records.delete(key);
  }
}

function toBrowserSafeRow(snapshot, nowMs) {
  return {
    sourceAttributionLabel: snapshot.sourceAttributionLabel,
    authorLabel: snapshot.authorLabel,
    authorDisplayName: snapshot.authorDisplayName,
    originalText: snapshot.originalText,
    translatedText: snapshot.translatedText,
    translationStatus: snapshot.translationStatus,
    moderationLabel: snapshot.moderationLabel,
    badgeLabel: snapshot.badgeLabel,
    purchaseLabel: snapshot.purchaseLabel,
    sourcePublishedAtIso: snapshot.sourcePublishedAtIso,
    recordedAtIso: new Date(nowMs).toISOString()
  };
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function migrationFunctionBody(source, functionName) {
  const start = source.indexOf(`create or replace function public.${functionName}`);
  assert.ok(start >= 0, `NC-H1 migration function exists: ${functionName}`);
  const end = source.indexOf("\n$$;", start);
  assert.ok(end > start, `NC-H1 migration function ends: ${functionName}`);
  return source.slice(start, end);
}

async function importTypeScript(source) {
  const executable = stripTypeScriptTypes(source, { mode: "transform" });
  return import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);
}
