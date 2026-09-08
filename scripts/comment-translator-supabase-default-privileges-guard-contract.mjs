import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { maskSql } from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";

const root = process.cwd();
const guardMigrationPath = "supabase/migrations/20260706073204_supabase_default_privileges_guard.sql";
const auditDocPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_DB_AUTH_RLS_SECURITY_AUDIT.md";
const HISTORICAL_TABLE_NAMES = Object.freeze([
  "user_profiles",
  "user_preferences",
  "tool_preferences",
  "usage_quotas",
  "youtube_oauth_credentials",
  "comment_translator_sessions",
  "comment_translator_usage_ledger_events",
  "comment_translator_real_comments_feed_snapshots",
  "comment_translator_creator_waitlist_registrations"
]);
const CURRENT_TABLE_NAMES = Object.freeze([
  ...HISTORICAL_TABLE_NAMES,
  "comment_translator_paid_customers",
  "comment_translator_paid_billing_lifecycles",
  "comment_translator_paid_checkout_holds",
  "comment_translator_paid_checkout_session_bindings",
  "comment_translator_paid_subscription_bindings",
  "comment_translator_paid_external_id_tombstones",
  "comment_translator_paid_entitlements",
  "comment_translator_paid_stripe_event_receipts",
  "comment_translator_paid_capacity_config",
  "comment_translator_paid_capacity_reservations",
  "comment_translator_paid_billing_period_usage",
  "comment_translator_paid_owner_cost_buckets",
  "comment_translator_paid_global_cost_buckets",
  "comment_translator_paid_azure_fallback_buckets",
  "comment_translator_paid_provider_circuits",
  "comment_translator_paid_session_leases",
  "comment_translator_paid_openai_slots",
  "comment_translator_paid_openai_minute_buckets",
  "comment_translator_paid_openai_rate_reservations",
  "comment_translator_paid_poll_budget_buckets",
  "comment_translator_paid_poll_reservations",
  "comment_translator_paid_logical_attempts",
  "comment_translator_paid_attempt_receipts",
  "comment_translator_paid_provider_detail_source_receipts",
  "comment_translator_paid_consents",
  "comment_translator_paid_provider_hourly_details",
  "comment_translator_paid_session_summaries",
  "comment_translator_paid_provider_dispatch_claims",
  "comment_translator_paid_message_rate_buckets",
  "comment_translator_paid_message_rate_reservations",
  "comment_translator_paid_message_rate_reservation_tombstones",
  "comment_translator_paid_maintenance_work_items",
  "comment_translator_paid_scheduler_runs"
]);
const REQUIRED_REVOKES = Object.freeze([
  "alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke usage, select on sequences from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke execute on functions from public"
]);
const SECURITY_DENY_CONTRACTS = Object.freeze([
  {
    label: "guard migration does not create or rework tables",
    pattern: /\bcreate\s+table\b/i,
    fixture: "CREATE TABLE public.synthetic_guard_mutant (id bigint);"
  },
  {
    label: "guard migration does not alter existing table RLS",
    pattern: /\balter\s+table\b/i,
    fixture: "ALTER TABLE public.synthetic_guard_mutant ENABLE ROW LEVEL SECURITY;"
  },
  {
    label: "guard migration does not rework policies",
    pattern: /\bcreate\s+policy\b/i,
    fixture: "CREATE POLICY synthetic_guard_mutant ON public.synthetic_guard_mutant USING (true);"
  },
  {
    label: "guard migration does not grant browser roles",
    pattern: /\bgrant\s+[^;]*\bto\s+(anon|authenticated)\b/i,
    fixture: "GRANT SELECT ON public.synthetic_guard_mutant TO anon;"
  },
  {
    label: "guard migration does not bulk expose public tables",
    pattern: /\bgrant\s+[^;]*\bon\s+(all\s+)?tables\s+in\s+schema\s+public\b/i,
    fixture: "GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;"
  }
]);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

function parsePublicTableDeclarations(source) {
  const declarations = [];
  const masked = maskSql(String(source));
  for (const statement of masked.split(";")) {
    const normalized = statement.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const createTableMatches = [...normalized.matchAll(/\bcreate\s+(?:(?:unlogged|temporary|temp)\s+)?table\b/gi)];
    if (createTableMatches.length === 0) continue;
    const supported = /^create\s+table\s+if\s+not\s+exists\s+public\.([a-z_][a-z0-9_]*)\s*\(/i.exec(normalized);
    if (createTableMatches.length !== 1 || !supported) {
      throw new Error("unsupported top-level CREATE TABLE declaration");
    }
    declarations.push(supported[1].toLowerCase());
  }
  return declarations;
}

function assertExactTableInventory(actual, expected, label) {
  assert.ok(Array.isArray(actual) && Array.isArray(expected), `${label} inventory arrays are required`);
  assert.ok(actual.every((name) => typeof name === "string" && /^[a-z_][a-z0-9_]*$/.test(name)), `${label} inventory names are valid`);
  assert.ok(expected.every((name) => typeof name === "string" && /^[a-z_][a-z0-9_]*$/.test(name)), `${label} expected names are valid`);
  assert.equal(new Set(actual).size, actual.length, `${label} inventory has no duplicate identities`);
  assert.equal(new Set(expected).size, expected.length, `${label} authority has no duplicate identities`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} inventory matches exact authority`);
  return true;
}

function parseAuditTableNames(source) {
  return [...String(source).matchAll(/^\|\s*`?public\.([a-z_][a-z0-9_]*)`?\s*\|/gim)]
    .map((match) => match[1].toLowerCase());
}

function assertGuardSecurityContract(source, { skipDenyIndex = null } = {}) {
  const guardSql = compactSql(source);
  for (const requiredRevoke of REQUIRED_REVOKES) {
    assertSqlIncludes(guardSql, requiredRevoke, "guard migration revokes future public defaults");
  }
  assert.ok(skipDenyIndex === null || (Number.isInteger(skipDenyIndex) && skipDenyIndex >= 0 && skipDenyIndex < SECURITY_DENY_CONTRACTS.length), "security deny mutation index is bounded");
  for (const [index, denial] of SECURITY_DENY_CONTRACTS.entries()) {
    if (index === skipDenyIndex) continue;
    assert.doesNotMatch(guardSql, denial.pattern, denial.label);
  }
}

function runSyntheticInventoryRegressions() {
  const historical = [...HISTORICAL_TABLE_NAMES];
  const current = [...CURRENT_TABLE_NAMES];
  const declarations = current.map((name) => `CREATE TABLE IF NOT EXISTS public.${name} (id bigint);`).join("\n");
  assert.deepEqual(parsePublicTableDeclarations(declarations), current);
  const historicalWithoutPreference = historical.filter((name) => name !== "user_preferences");
  assert.deepEqual(parsePublicTableDeclarations("CREATE TABLE IF NOT EXISTS public.user_preferences (id bigint);"), ["user_preferences"]);
  assert.throws(() => assertExactTableInventory(
    parsePublicTableDeclarations(historicalWithoutPreference.map((name) => `CREATE TABLE IF NOT EXISTS public.${name} (id bigint);`).join("\n")),
    historical,
    "synthetic-historical-missing-even-when-declared-later"
  ));
  assert.throws(() => assertExactTableInventory(current.slice(0, -1), current, "synthetic-current-missing"));
  assert.throws(() => assertExactTableInventory([...current, "comment_translator_paid_unknown"], current, "synthetic-current-extra"));
  assert.throws(() => assertExactTableInventory([...current.slice(0, -1), "comment_translator_paid_wrong_identity"], current, "synthetic-current-wrong"));
  assert.throws(() => parsePublicTableDeclarations('CREATE TABLE public.user_profiles (id bigint);'));
  assert.throws(() => parsePublicTableDeclarations('CREATE TABLE IF NOT EXISTS user_profiles (id bigint);'));
  assert.throws(() => parsePublicTableDeclarations('CREATE TABLE IF NOT EXISTS "public"."user_profiles" (id bigint);'));
  assert.deepEqual(
    parsePublicTableDeclarations("-- CREATE TABLE IF NOT EXISTS public.fake (id bigint);\nSELECT 'CREATE TABLE IF NOT EXISTS public.fake (id bigint);';\nDO $$ BEGIN CREATE TABLE IF NOT EXISTS public.fake (id bigint); END $$;"),
    []
  );
  const revokeSql = [
    "alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated, service_role;",
    "alter default privileges for role postgres in schema public revoke usage, select on sequences from anon, authenticated, service_role;",
    "alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, service_role;",
    "alter default privileges for role postgres in schema public revoke execute on functions from public;"
  ].join("\n");
  assert.doesNotThrow(() => assertGuardSecurityContract(revokeSql));
  for (const requiredRevoke of REQUIRED_REVOKES) {
    assert.throws(
      () => assertGuardSecurityContract(revokeSql.replace(requiredRevoke, "")),
      `removing one required revoke is rejected: ${requiredRevoke}`
    );
  }
  for (const denial of SECURITY_DENY_CONTRACTS) {
    assert.throws(
      () => assertGuardSecurityContract(`${revokeSql}\n${denial.fixture}`),
      `forbidden operation is rejected independently: ${denial.label}`
    );
  }
  for (const [index, denial] of SECURITY_DENY_CONTRACTS.entries()) {
    assert.throws(
      () => {
        const mutantSuite = () => {
          assert.doesNotThrow(() => assertGuardSecurityContract(revokeSql));
          for (const candidate of SECURITY_DENY_CONTRACTS) {
            assert.throws(() => assertGuardSecurityContract(`${revokeSql}\n${candidate.fixture}`, { skipDenyIndex: index }));
          }
        };
        mutantSuite();
      },
      `in-memory deny-assertion removal is caught: ${denial.label}`
    );
  }
}

runSyntheticInventoryRegressions();

const migrationPaths = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .filter((fileName) => fileName.endsWith(".sql"))
  .map((fileName) => `supabase/migrations/${fileName}`)
  .sort();

assert.ok(migrationPaths.includes(guardMigrationPath), "default privileges guard migration exists");

const guardMigration = read(guardMigrationPath);
const auditDoc = read(auditDocPath);
const task = read("task.md");
const taskLower = task.toLowerCase();
const migrationSources = migrationPaths.map(read);
const historicalCutoff = path.basename(guardMigrationPath);
const historicalMigrationSources = migrationPaths
  .filter((migrationPath) => path.basename(migrationPath) <= historicalCutoff)
  .map(read);

assertGuardSecurityContract(guardMigration);
const historicalMigrationTables = parsePublicTableDeclarations(historicalMigrationSources.join("\n"));
const currentMigrationTables = parsePublicTableDeclarations(migrationSources.join("\n"));
assertExactTableInventory(parseAuditTableNames(auditDoc), HISTORICAL_TABLE_NAMES, "historical audit table");
assertExactTableInventory(historicalMigrationTables, HISTORICAL_TABLE_NAMES, "historical migration table");
assertExactTableInventory(currentMigrationTables, CURRENT_TABLE_NAMES, "current source table");

for (const requiredDocMarker of [
  "Future Public-Table Default Privilege Guard",
  "Guard status: local migration proposal added",
  "Existing public tables keep their current explicit grants and RLS policies",
  "If a remote project creates migration objects with a different owner role",
  "Remote Supabase migration apply: not run"
]) {
  assert.ok(auditDoc.includes(requiredDocMarker), `audit doc records ${requiredDocMarker}`);
}

for (const requiredTaskMarker of [
  "Supabase default privileges guard",
  "node scripts/comment-translator-supabase-default-privileges-guard-contract.mjs",
  "existing 9 public tables remain unchanged",
  "remote migration apply: not-run"
]) {
  assert.ok(taskLower.includes(requiredTaskMarker.toLowerCase()), `task.md records ${requiredTaskMarker}`);
}

console.log(
  `comment translator Supabase default privileges guard contract passed (default_revoke_blocks=4, historical_public_tables=${HISTORICAL_TABLE_NAMES.length}, current_source_public_tables=${CURRENT_TABLE_NAMES.length}, remote_apply=not_run)`
);
