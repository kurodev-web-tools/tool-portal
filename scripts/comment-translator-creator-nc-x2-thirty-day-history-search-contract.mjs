import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

const root = process.cwd();
const searchMigrationPath = "supabase/migrations/20260810010000_comment_translator_creator_history_search.sql";
const h1MigrationPath = "supabase/migrations/20260802040000_comment_translator_creator_safe_history.sql";
const requiredFiles = [
  searchMigrationPath,
  "lib/comment-translator-creator-history-types.ts",
  "lib/comment-translator-creator-history-store.ts",
  "lib/comment-translator-creator-history-runtime.ts",
  "app/tools/comment-translator/history-actions.ts",
  "app/tools/comment-translator/actions.ts",
  "components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx"
];

for (const relativePath of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `NC-X2A required file exists: ${relativePath}`);
}

const typesSource = read("lib/comment-translator-creator-history-types.ts");
const storeSource = read("lib/comment-translator-creator-history-store.ts");
const runtimeSource = read("lib/comment-translator-creator-history-runtime.ts");
const historyActionsSource = read("app/tools/comment-translator/history-actions.ts");
const aggregateActionsSource = read("app/tools/comment-translator/actions.ts");
const panelSource = read("components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx");
const migrationSource = read(searchMigrationPath);
const h1MigrationSource = read(h1MigrationPath);
const accountActionsSource = read("app/tools/comment-translator/account-actions.ts");
const retentionActionsSource = read("app/tools/comment-translator/retention-waitlist-actions.ts");

assert.doesNotMatch(h1MigrationSource, /pagination_key|search_document|pg_trgm|search_comment_translator_creator_safe_history/i, "NC-X2A is additive and does not modify the applied NC-H1 migration");
assert.match(migrationSource, /create extension if not exists pg_trgm/i, "NC-X2A enables pg_trgm only in the new local migration");
assert.match(migrationSource, /add column if not exists pagination_key\s+uuid\s+not null\s+default\s+gen_random_uuid\(\)/i, "pagination_key is a dedicated random non-null cursor key");
assert.match(migrationSource, /add column if not exists search_document\s+text\s+not null\s+default\s+''/i, "search_document is a derived non-null safe document");
assert.match(migrationSource, /author_display_name[\s\S]{0,400}original_text[\s\S]{0,400}translated_text/i, "search document derives from exactly the three approved safe search fields");
assert.match(migrationSource, /when\s+moderation_label\s*=\s*'visible'[\s\S]{0,700}else\s+''\s*end/i, "tombstones exclude text from the backfilled search_document");
assert.match(migrationSource, /search_document\s*=\s*case[\s\S]{0,500}then\s+''[\s\S]{0,120}else\s+excluded\.search_document/i, "tombstone upserts keep search_document empty and visible updates derived");
for (const reason of ["service-role-required", "malformed-request", "session-unavailable", "paid-inactive", "malformed-safe-row", "safe-field-mismatch", "unsafe-safe-row"]) {
  assert.match(migrationSource, new RegExp(`'${reason}'`), `NC-H1 append rejection reason remains compatible: ${reason}`);
}
assert.match(migrationSource, /using\s+gin\s*\(\s*search_document\s+gin_trgm_ops\s*\)/i, "search_document has the local pg_trgm GIN index");
assert.match(migrationSource, /comment_translator_creator_safe_history_owner_source_published_idx[\s\S]{0,220}owner_user_id\s*,\s*source_published_at\s+desc\s*,\s*pagination_key\s+desc/i, "owner browse index has stable source-time and pagination-key order");
assert.match(migrationSource, /create or replace function public\.search_comment_translator_creator_safe_history/i, "exactly one bounded search RPC is added");
assert.match(migrationSource, /search_comment_translator_creator_safe_history[\s\S]{0,1600}security definer[\s\S]{0,500}set search_path\s*=\s*''/i, "search RPC is a fixed-search-path security-definer function");
assert.match(migrationSource, /search_comment_translator_creator_safe_history[\s\S]{0,2600}auth\.role\(\)\s+is\s+distinct\s+from\s+'service_role'/i, "search RPC is service-role-only");
assert.match(migrationSource, /regexp_replace\(\s*trim\(\s*p_query/i, "RPC normalization trims and collapses query whitespace");
assert.match(migrationSource, /convert_to\(\s*p_query\s*,\s*['"]UTF8['"]\s*\)/i, "RPC accepts and validates UTF-8 text at the database boundary");
assert.match(migrationSource, /lower\([\s\S]{0,240}collate\s+"C"/i, "RPC lower normalization uses the fixed C collation");
assert.match(migrationSource, /char_length\([\s\S]{0,180}(?:<\s*3|>\s*64)/i, "RPC enforces the three-to-sixty-four Unicode-code-point non-empty query bound");
assert.match(migrationSource, /v_escaped_query\s*:=\s*replace\([\s\S]{0,220}['"]%['"]/i, "RPC escapes percent before literal LIKE matching");
assert.match(migrationSource, /v_escaped_query\s*:=\s*replace\([\s\S]{0,300}['"]_['"]/i, "RPC escapes underscore before literal LIKE matching");
assert.match(migrationSource, /escape\s+['"]\\['"]/i, "RPC uses an explicit LIKE escape character");
assert.match(migrationSource, /limit\s+51/i, "RPC fetches at most fifty-one rows for next-page detection");
assert.match(migrationSource, /order\s+by[\s\S]{0,160}source_published_at\s+desc[\s\S]{0,160}pagination_key\s+desc/i, "RPC uses the stable two-key order");
assert.match(migrationSource, /next_cursor/i, "RPC returns at most one opaque next cursor");
assert.doesNotMatch(migrationSource, /['"]total['"]|count\s*\(\s*\*\s*\)\s+as\s+total/i, "RPC does not expose a total count");
assert.match(migrationSource, /source_published_at\s*>=\s*v_cutoff/i, "NC-X2A keeps the inclusive source-time cutoff");
assert.match(migrationSource, /v_cutoff(?:\s+timestamptz)?\s*:=\s*[\s\S]{0,80}interval\s+'7 days'/i, "NC-X2A keeps seven-day retention in the server-clock RPC");
assert.doesNotMatch(migrationSource, /interval\s+'30 days'|30[- ]day|thirty[- ]day/i, "NC-X2A does not switch retention to thirty days");
assert.match(migrationSource, /revoke\s+all\s+on\s+function[\s\S]{0,180}search_comment_translator_creator_safe_history/i, "search RPC direct execution is revoked from public roles");
assert.match(migrationSource, /grant\s+execute\s+on\s+function[\s\S]{0,180}search_comment_translator_creator_safe_history[\s\S]{0,80}to\s+service_role/i, "only service_role receives search RPC execution");
assert.match(migrationSource, /cursor[\s\S]{0,1800}(?:owner_digest|owner_binding)[\s\S]{0,1200}(?:query_digest|query_binding)/i, "cursor binds to the server-derived owner and normalized query without returning private identifiers");
assert.match(migrationSource, /not exists\s*\([\s\S]{0,500}pagination_key[\s\S]{0,500}source_published_at/i, "stale or cross-owner cursor anchors fail closed");
assert.match(migrationSource, /search_document\s+like[\s\S]{0,180}escape/i, "search authority is the derived document, not browser-selected fields");
assert.match(migrationSource, /on\s+conflict[\s\S]{0,2200}search_document\s*=\s*case/i, "trusted append/upsert logic keeps the derived document current");
assert.doesNotMatch(migrationSource, /raw_provider|provider_payload|raw_comments|owner_user_id.*next_cursor|session_reference_id.*next_cursor|livechat|purchase_value|priority|console\./i, "search migration exposes no private/provider/revenue authority or logging path");

assert.match(typesSource, /CommentTranslatorCreatorSafeHistorySearchInput/, "types define a sanitized query/cursor input");
assert.match(typesSource, /searchSafeHistory\s*\(/, "store contract exposes a bounded search method");
assert.match(typesSource, /nextCursor:\s*string\s*\|\s*null/, "search result carries only an opaque nullable next cursor");
assert.doesNotMatch(typesSource, /totalCount|ownerUserId.*nextCursor|sessionReferenceId.*nextCursor/i, "browser search result has no count or authority identifiers");
assert.match(storeSource, /search_comment_translator_creator_safe_history/, "store calls the dedicated search RPC");
assert.match(storeSource, /p_query/, "store passes only the sanitized query to the search RPC");
assert.match(storeSource, /p_cursor/, "store passes only the previously returned cursor to the search RPC");
assert.doesNotMatch(storeSource, /\.from\(/, "search store retains RPC-only table access");
assert.doesNotMatch(storeSource, /console\.|reason.*(?:owner|session|query|cursor)/i, "store has no reason-detail or payload logging");
assert.match(runtimeSource, /search:\s*\(/, "runtime exposes a search seam");
assert.match(runtimeSource, /retention:\s*["']inclusive-seven-days-server-clock-rpc["']/, "runtime retains seven-day server-clock retention");
assert.match(runtimeSource, /query:\s*unknown|input:\s*unknown/, "runtime parses untrusted search input before store access");
assert.match(runtimeSource, /nextCursor/, "runtime validates and returns the opaque cursor only");
assert.match(runtimeSource, /cleanupWiring:\s*["']oauth-disconnect-wired-account-deletion-seam-not-authoritative["']/, "cleanup wiring distinguishes OAuth disconnect from missing account-deletion execution");
assert.match(historyActionsSource, /export async function searchCommentTranslatorCreatorSafeHistoryAction\s*\(\s*input:\s*unknown\s*\)/, "search action accepts only one untrusted query/cursor input object");
assert.match(historyActionsSource, /runtime\.search\(/, "search action delegates to the existing server-owned runtime");
assert.match(aggregateActionsSource, /searchCommentTranslatorCreatorSafeHistoryAction/, "aggregate actions expose the bounded search action");
assert.match(accountActionsSource, /cleanupCommentTranslatorCreatorSafeHistoryForDisconnectAction/, "authoritative OAuth disconnect invokes owner-derived history cleanup");
assert.match(accountActionsSource, /status\s*===\s*["']disconnected["'][\s\S]{0,300}status\s*===\s*["']already-disconnected["']/i, "disconnect cleanup is limited to successful or already-complete disconnect states");
assert.match(accountActionsSource, /let\s+historyCleanupStatus:\s*["']deleted["']\s*\|\s*["']unavailable["']\s*=\s*["']unavailable["']/, "disconnect cleanup defaults failures to a sanitized unavailable status");
assert.match(accountActionsSource, /cleanupResult\.status\s*===\s*["']deleted["'][\s\S]{0,160}historyCleanupStatus\s*=\s*["']deleted["']/, "disconnect cleanup surfaces a deleted status only for a deleted cleanup result");
assert.match(accountActionsSource, /return\s*\{\s*\.\.\.disconnectResult,\s*historyCleanupStatus\s*\}/, "successful disconnect results surface the sanitized cleanup status");
assert.doesNotMatch(accountActionsSource, /cleanupCommentTranslatorCreatorSafeHistoryForDisconnectAction\(\)\.catch\(\(\)\s*=>\s*undefined\)/, "disconnect cleanup failures are not silently discarded");
assert.doesNotMatch(retentionActionsSource, /cleanupCommentTranslatorCreatorSafeHistoryForAccountDeletionAction|cleanupCommentTranslatorCreatorSafeHistoryForDisconnectAction/, "request-only account deletion has no invented cleanup execution seam");

assert.match(panelSource, /onSearch/, "panel has a props-only search callback");
assert.match(panelSource, /onLoadMore/, "panel has a props-only load-more callback");
assert.match(panelSource, /nextCursor/, "panel consumes the opaque next cursor without decoding it");
assert.match(panelSource, /<form[\s\S]{0,800}(?:Search|search)/, "panel provides a keyboard-submit search form");
assert.match(panelSource, /Clear|clear/, "panel provides a clear control");
assert.match(panelSource, /Load more|load more/i, "panel provides a bounded load-more control");
assert.match(panelSource, /No safe history matches|No safe history is available/, "panel has a safe empty-search state");
assert.match(panelSource, /Seven-day safe history/, "panel keeps exact seven-day copy");
assert.doesNotMatch(panelSource, /Thirty-day|thirty-day|30-day|30 days/i, "panel does not claim thirty-day retention");
assert.doesNotMatch(panelSource, /fetch\s*\(|useEffect|localStorage|sessionStorage|indexedDB|searchParams|console\.|ownerUserId|sessionReferenceId|messageReferenceId|liveChatId|rawProvider/i, "panel remains deterministic props-only with no browser authority, persistence, or logs");
assert.match(panelSource, /min-w-0|break-words|overflow-x-auto/, "panel controls and rows are overflow-safe");

const runtime = await importTypeScript(runtimeSource.replace('import "server-only";', ""));
const nowMs = Date.parse("2026-08-10T12:00:00.000Z");
const safeRow = {
  sourceAttributionLabel: "Source: YouTube Live Chat",
  authorLabel: "YouTube viewer",
  authorDisplayName: "Fixture viewer",
  originalText: "Original text",
  translatedText: "Translated text",
  translationStatus: "translated-f10",
  moderationLabel: "visible",
  priority: { category: "standard", lane: "standard", rank: 5, badgeLabel: null },
  badgeLabel: "member",
  purchaseLabel: null,
  sourcePublishedAtIso: "2026-08-10T11:59:59.000Z",
  recordedAtIso: "2026-08-10T12:00:00.000Z"
};

const searchCalls = [];
const searchStore = {
  async appendSafeHistory() { return { status: "recorded", recordedCount: 0 }; },
  async readSafeHistory() { return { status: "ready", evaluatedAtIso: new Date(nowMs).toISOString(), rows: [] }; },
  async searchSafeHistory(request) {
    searchCalls.push(request);
    return {
      status: "ready",
      evaluatedAtIso: new Date(nowMs).toISOString(),
      rows: request.query === "empty" ? [] : [safeRow],
      nextCursor: request.cursor === null ? "opaque-next-cursor" : null
    };
  },
  async cleanupOwner() { return { status: "deleted", removedCount: 0 }; }
};
const historyRuntime = runtime.createCommentTranslatorCreatorSafeHistoryRuntime({
  historyStore: searchStore,
  paidAuthority: async () => ({ status: "ready" }),
  sessionAuthority: { async readCurrentForOwner(ownerUserId) { return { status: "ready", sessionReferenceId: `${ownerUserId}-session` }; } },
  readSafeFeed: async () => ({ status: "ready", rows: [] })
});

assert.deepEqual(
  await historyRuntime.search({
    callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" },
    nowMs,
    input: { query: "  Foo\t  Bar ", cursor: null }
  }),
  { status: "ready", rows: [safeRow], nextCursor: "opaque-next-cursor" },
  "search returns safe rows and one opaque cursor while leaving normalization to the RPC store boundary"
);
assert.deepEqual(searchCalls[0], {
  ownerUserId: "fixture-owner",
  sessionReferenceId: "fixture-owner-session",
  query: "  Foo\t  Bar ",
  cursor: null
}, "runtime derives owner/session and passes raw sanitized search text without browser authority");
assert.deepEqual(
  await historyRuntime.search({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs, input: { query: "empty", cursor: "opaque-next-cursor" } }),
  { status: "ready", rows: [], nextCursor: null },
  "empty results remain ready with zero rows"
);
assert.equal(
  (await historyRuntime.search({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs, input: { query: "search", cursor: { owner: "other-owner" } } })).status,
  "unavailable",
  "malformed cursor input fails closed before the store"
);
assert.equal(
  (await historyRuntime.search({ callerAuthority: { status: "authenticated", ownerUserId: "other-owner" }, nowMs, input: { query: "search", cursor: null } })).status,
  "ready",
  "an authenticated owner uses a server-derived owner scope rather than a browser-selected owner"
);
assert.equal(
  (await runtime.createCommentTranslatorCreatorSafeHistoryRuntime({
    historyStore: searchStore,
    paidAuthority: async () => ({ status: "fail-closed", reason: "missing" }),
    sessionAuthority: { async readCurrentForOwner() { return { status: "ready", sessionReferenceId: "not-used" }; } },
    readSafeFeed: async () => ({ status: "ready", rows: [] })
  }).search({ callerAuthority: { status: "authenticated", ownerUserId: "fixture-owner" }, nowMs, input: { query: "search", cursor: null } })).status,
  "unavailable",
  "missing paid authority is sanitized unavailable"
);

process.stdout.write("comment translator Creator NC-X2A bounded seven-day search contract passed\n");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

async function importTypeScript(source) {
  const executable = stripTypeScriptTypes(source, { mode: "transform" });
  return import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);
}
