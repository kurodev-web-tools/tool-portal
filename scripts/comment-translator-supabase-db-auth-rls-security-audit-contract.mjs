import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const auditDocPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_DB_AUTH_RLS_SECURITY_AUDIT.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function escapeRegExp(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactSql(source) {
  return source
    .replace(/--.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function assertSqlIncludes(sql, snippet, label) {
  assert.ok(sql.includes(snippet.toLowerCase()), `${label}: ${snippet}`);
}

function assertSqlMatches(sql, pattern, label) {
  assert.match(sql, pattern, label);
}

const migrationPaths = [
  "supabase/migrations/20260527000000_account_preferences_foundation.sql",
  "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  "supabase/migrations/20260615000000_comment_translator_sessions.sql",
  "supabase/migrations/20260615001000_comment_translator_usage_ledger_events.sql",
  "supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql",
  "supabase/migrations/20260624000000_account_display_timezone_preference.sql",
  "supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql"
];

for (const migrationPath of migrationPaths) {
  assert.ok(exists(migrationPath), `migration exists: ${migrationPath}`);
}

assert.ok(exists(auditDocPath), `audit doc exists: ${auditDocPath}`);

const migrationSql = compactSql(migrationPaths.map(read).join("\n"));
const auditDoc = read(auditDocPath);
const task = read("task.md");
const taskLower = task.toLowerCase();

const browserOwnedTables = [
  "user_profiles",
  "user_preferences",
  "tool_preferences"
];

const browserReadOnlyTables = ["usage_quotas"];

const serverOnlyTables = [
  "youtube_oauth_credentials",
  "comment_translator_sessions",
  "comment_translator_usage_ledger_events",
  "comment_translator_real_comments_feed_snapshots",
  "comment_translator_creator_waitlist_registrations"
];

const publicTables = [...browserOwnedTables, ...browserReadOnlyTables, ...serverOnlyTables];

assert.equal(publicTables.length, 9, "audit contract tracks exactly 9 local public tables");

const createdTables = [...migrationSql.matchAll(/create table if not exists public\.([a-z0-9_]+)/g)].map((match) => match[1]);
assert.deepEqual([...new Set(createdTables)].sort(), [...publicTables].sort(), "local migrations create only expected public tables");

for (const table of publicTables) {
  assertSqlIncludes(migrationSql, `alter table public.${table} enable row level security`, `${table} enables RLS`);
  assert.doesNotMatch(
    migrationSql,
    new RegExp(`grant\\s+[^;]*on\\s+table\\s+public\\.${escapeRegExp(table)}\\s+to\\s+anon`, "i"),
    `${table} does not grant table access to anon`
  );
}

for (const table of browserOwnedTables) {
  assertSqlIncludes(migrationSql, `revoke all on table public.${table} from anon`, `${table} revokes anon`);
  assertSqlIncludes(
    migrationSql,
    `grant select, insert, update on table public.${table} to authenticated`,
    `${table} grants authenticated owner writes`
  );
  assertSqlMatches(
    migrationSql,
    new RegExp(`create policy "${escapeRegExp(table)}_owner_select" .*? for select to authenticated using \\(auth\\.uid\\(\\) = user_id\\)`, "i"),
    `${table} select policy has owner predicate`
  );
  assertSqlMatches(
    migrationSql,
    new RegExp(`create policy "${escapeRegExp(table)}_owner_insert" .*? for insert to authenticated with check \\(auth\\.uid\\(\\) = user_id\\)`, "i"),
    `${table} insert policy has owner check`
  );
  assertSqlMatches(
    migrationSql,
    new RegExp(
      `create policy "${escapeRegExp(table)}_owner_update" .*? for update to authenticated using \\(auth\\.uid\\(\\) = user_id\\) with check \\(auth\\.uid\\(\\) = user_id\\)`,
      "i"
    ),
    `${table} update policy has using and with check`
  );
  assert.doesNotMatch(
    migrationSql,
    new RegExp(`create policy "${escapeRegExp(table)}_[^"]+" .*? to authenticated using \\(true\\)`, "i"),
    `${table} has no authenticated-role-only policy`
  );
}

for (const table of browserReadOnlyTables) {
  assertSqlIncludes(migrationSql, `revoke all on table public.${table} from anon`, `${table} revokes anon`);
  assertSqlIncludes(migrationSql, `grant select on table public.${table} to authenticated`, `${table} grants authenticated owner read`);
  assertSqlMatches(
    migrationSql,
    new RegExp(`create policy "${escapeRegExp(table)}_owner_select" .*? for select to authenticated using \\(auth\\.uid\\(\\) = user_id\\)`, "i"),
    `${table} select policy has owner predicate`
  );
  assert.doesNotMatch(
    migrationSql,
    new RegExp(`grant\\s+(all|insert|update|delete|select, insert|select, update)[^;]*on\\s+table\\s+public\\.${escapeRegExp(table)}\\s+to\\s+authenticated`, "i"),
    `${table} has no authenticated write grant`
  );
}

for (const table of serverOnlyTables) {
  assertSqlIncludes(migrationSql, `revoke all on table public.${table} from anon`, `${table} revokes anon`);
  assertSqlIncludes(migrationSql, `revoke all on table public.${table} from authenticated`, `${table} revokes authenticated`);
  assertSqlIncludes(migrationSql, `grant all on table public.${table} to service_role`, `${table} grants trusted server role`);
  assertSqlMatches(
    migrationSql,
    new RegExp(`create policy "[^"]+" on public\\.${escapeRegExp(table)} for all to service_role using \\(true\\) with check \\(true\\)`, "i"),
    `${table} has trusted server role all policy`
  );
}

assert.doesNotMatch(migrationSql, /\bcreate\s+(or\s+replace\s+)?view\b/i, "local migrations create no views");
assert.doesNotMatch(migrationSql, /\bcreate\s+(or\s+replace\s+)?function\b/i, "local migrations create no functions");
assert.doesNotMatch(migrationSql, /\bsecurity\s+definer\b/i, "local migrations create no definer functions");
assert.doesNotMatch(migrationSql, /\bcreate\s+trigger\b/i, "local migrations create no triggers");
assert.doesNotMatch(migrationSql, /\bstorage\./i, "local migrations create no storage policies");
assert.doesNotMatch(migrationSql, /\b(user_metadata|raw_user_meta_data)\b/i, "local migrations do not authorize from user-editable metadata");

const browserClient = read("lib/supabase/browser.ts");
assert.match(browserClient, /createBrowserClient/, "browser Supabase client is present");
assert.match(browserClient, /getSupabasePublicConfig/, "browser Supabase client uses public config");
assert.doesNotMatch(browserClient, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/, "browser Supabase client excludes trusted env references");

const serverClient = read("lib/supabase/server.ts");
assert.match(serverClient, /createServerClient/, "server Supabase session client is present");
assert.match(serverClient, /getSupabasePublicConfig/, "server Supabase session client uses public config");
assert.doesNotMatch(serverClient, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/, "server session helper excludes trusted env references");

const trustedStorePaths = [
  "lib/comment-translator-youtube-token-store-supabase-adapter.ts",
  "lib/comment-translator-durable-session-store.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  "lib/comment-translator-real-comments-feed-durable-store.ts",
  "lib/comment-translator-creator-waitlist-durable-store.ts"
];

for (const trustedStorePath of trustedStorePaths) {
  const source = read(trustedStorePath);
  assert.match(source, /^import "server-only";/m, `${trustedStorePath} is server-only`);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/, `${trustedStorePath} uses trusted env reference by name`);
  assert.match(source, /persistSession:\s*false/, `${trustedStorePath} disables Supabase session persistence`);
  assert.match(source, /autoRefreshToken:\s*false/, `${trustedStorePath} disables Supabase token auto refresh`);
}

for (const requiredDocMarker of [
  "P0: No Local Current-Table RLS Disablement Found",
  "P1 High: Internal Account Id Is Still Present In Client Props",
  "P1 Medium: Future Public-Table Default Privilege Guard",
  "P1 Medium: Remote Read-Only Posture Unchecked",
  "Remote Supabase migration apply: not run"
]) {
  assert.ok(auditDoc.includes(requiredDocMarker), `audit doc records ${requiredDocMarker}`);
}

for (const requiredTaskMarker of [
  "Supabase DB/Auth/RLS security audit",
  "internal account id client prop minimization",
  "remote read-only Supabase posture check"
]) {
  assert.ok(taskLower.includes(requiredTaskMarker.toLowerCase()), `task.md records ${requiredTaskMarker}`);
}

assert.doesNotMatch(
  auditDoc,
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
  "audit doc contains no high-confidence secret or provider-private values"
);

console.log(
  `comment translator Supabase DB/Auth/RLS security audit contract passed (tables=${publicTables.length}, migrations=${migrationPaths.length}, privileged_objects=0, remote_readonly=unavailable)`
);
