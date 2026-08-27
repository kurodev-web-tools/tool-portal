import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const stripSqlComments = (sql) => sql
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--[^\r\n]*/g, "");
const normalizeSqlStatement = (statement) => statement.replace(/\s+/g, " ").trim().toLowerCase();

const originalFloorMigrationPath = "supabase/migrations/20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor.sql";
const canonicalFloorMigrationPath = "supabase/migrations/20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization.sql";
const originalFloorMigration = read(originalFloorMigrationPath);
const billingRuntime = read("lib/comment-translator-billing-runtime.ts");
const originalFloorMigrationSha256 = crypto
  .createHash("sha256")
  .update(originalFloorMigration.replace(/\r\n/g, "\n"))
  .digest("hex");

assert.equal(
  originalFloorMigrationSha256,
  "53b073fcb8229ac5c674d9bc247a946a9a36ed1c81965503dc0ca279a4f28944",
  "the original floor migration content remains unchanged across platform checkout line endings"
);
assert.ok(
  canonicalFloorMigrationPath > originalFloorMigrationPath,
  "the second-canonicalization repair is ordered after the original floor migration"
);

const originalExecutableSql = stripSqlComments(originalFloorMigration);
assert.match(
  originalExecutableSql,
  /create trigger comment_translator_paid_checkout_hold_recovery_window_floor\s+before insert on public\.comment_translator_paid_checkout_holds\s+for each row execute function public\.ct_paid_checkout_hold_recovery_window_floor\(\)/i,
  "the existing INSERT trigger attachment remains the authority reused by the additive repair"
);

const migrationPath = fs.existsSync(path.join(root, canonicalFloorMigrationPath))
  ? canonicalFloorMigrationPath
  : originalFloorMigrationPath;
const migration = read(migrationPath);
const executableSql = stripSqlComments(migration);
const functionStart = executableSql.indexOf("function public.ct_paid_checkout_hold_recovery_window_floor");
assert.notEqual(functionStart, -1, "the recovery floor trigger function exists");
const functionEnd = executableSql.indexOf("$$;", functionStart);
assert.notEqual(functionEnd, -1, "the recovery floor trigger function has a bounded body");
const functionSql = executableSql.slice(functionStart, functionEnd + 3);

assert.match(functionSql, /returns trigger/i, "the repaired floor remains a trigger function");
assert.match(
  functionSql,
  /language plpgsql\s+security definer\s+set search_path = pg_catalog, public/i,
  "the repaired floor retains its fixed-search-path SECURITY DEFINER boundary"
);
assert.match(
  functionSql,
  /v_floor_expires_at\s+timestamptz\s*:=\s*date_trunc\('second',\s*statement_timestamp\(\)\)\s*\+\s*interval\s+'40 minutes 1 second';/i,
  "RED: the DB-authoritative floor must be whole-second and never earlier than statement_timestamp() + 40 minutes"
);
assert.match(
  functionSql,
  /if\s+new\.checkout_expires_at_target\s+is null\s+or\s+new\.checkout_expires_at_target\s*<\s*v_floor_expires_at\s+then\s+new\.checkout_expires_at_target\s*:=\s*v_floor_expires_at;\s+end if;\s+return new;/i,
  "the repaired floor raises only null or earlier targets and preserves a legitimate later caller target"
);
assert.equal(
  (functionSql.match(/new\.checkout_expires_at_target\s*:=/gi) ?? []).length,
  1,
  "the repaired floor has no unconditional caller-target overwrite"
);

if (migrationPath === originalFloorMigrationPath) {
  assert.fail(`RED: ${canonicalFloorMigrationPath} is absent`);
}

assert.equal(
  (executableSql.match(/create\s+or\s+replace\s+function\s+public\.ct_paid_checkout_hold_recovery_window_floor\s*\(\s*\)/gi) ?? []).length,
  1,
  "the additive migration minimally redefines the existing floor function once"
);
const ownerStatements = executableSql.match(/\balter\s+function\b[\s\S]*?;/gi) ?? [];
assert.deepEqual(
  ownerStatements.map(normalizeSqlStatement),
  ["alter function public.ct_paid_checkout_hold_recovery_window_floor() owner to postgres;"],
  "the redefined SECURITY DEFINER function is explicitly and uniquely restored to postgres ownership"
);
const ownerStatementStart = executableSql.indexOf(ownerStatements[0]);
const revokeStatementStart = executableSql.search(/\brevoke\b/i);
assert.ok(
  ownerStatementStart > functionEnd && revokeStatementStart > ownerStatementStart,
  "postgres ownership is restored after function replacement and before ACL reapplication"
);
assert.doesNotMatch(
  executableSql,
  /\b(?:update|insert\s+into|delete\s+from|truncate|alter\s+table|create\s+table|drop\s+table)\b/i,
  "the additive migration performs no backfill, data mutation, or table change"
);
assert.doesNotMatch(
  executableSql,
  /\b(?:create|drop)\s+trigger\b/i,
  "the additive migration preserves the existing trigger attachment without replacing it"
);
assert.doesNotMatch(
  executableSql,
  /\bgrant\s+(?:select|insert|update|delete|all)\s+on\s+(?:table|all\s+tables|schema)\b/i,
  "the additive migration adds no table, schema, or entitlement grant"
);

const revokeStatements = executableSql.match(/\brevoke\b[\s\S]*?;/gi) ?? [];
assert.deepEqual(
  revokeStatements.map(normalizeSqlStatement),
  ["revoke all on function public.ct_paid_checkout_hold_recovery_window_floor() from public, anon, authenticated, service_role;"],
  "the repaired function strictly revokes direct execution from API roles and service_role before regrant"
);
const grantStatements = executableSql.match(/\bgrant\b[\s\S]*?;/gi) ?? [];
assert.deepEqual(
  grantStatements.map(normalizeSqlStatement),
  ["grant execute on function public.ct_paid_checkout_hold_recovery_window_floor() to service_role;"],
  "the ACL reapplication grants only explicit service_role EXECUTE"
);

const statementTimestampMs = Date.parse("2026-08-26T00:00:00.731Z");
const oldFloorMs = statementTimestampMs + 40 * 60 * 1000;
const stripeWholeSecondMs = Math.floor(oldFloorMs / 1000) * 1000;
assert.match(
  billingRuntime,
  /sessionExpiresAtIso\s*!==\s*checkoutExpiresAtTargetIso/,
  "redirect commit guards the Stripe expiry with strict equality"
);
assert.notEqual(
  new Date(oldFloorMs).toISOString(),
  new Date(stripeWholeSecondMs).toISOString(),
  "the original fractional floor reproduces the strict redirect-commit equality risk"
);

const canonicalFloorMs = Math.floor(statementTimestampMs / 1000) * 1000 + (40 * 60 + 1) * 1000;
assert.equal(canonicalFloorMs % 1000, 0, "the repaired floor is whole-second canonical");
assert.ok(
  canonicalFloorMs >= statementTimestampMs + 40 * 60 * 1000,
  "the repaired whole-second floor is never earlier than the DB statement clock plus 40 minutes"
);
assert.equal(
  new Date(canonicalFloorMs).toISOString(),
  new Date(Math.floor(canonicalFloorMs / 1000) * 1000).toISOString(),
  "Stripe whole-second round-trip preserves strict redirect-commit equality"
);
const laterCallerTargetMs = canonicalFloorMs + 5 * 60 * 1000;
assert.equal(
  Math.max(laterCallerTargetMs, canonicalFloorMs),
  laterCallerTargetMs,
  "a legitimate later caller target remains unchanged"
);

console.log("comment translator paid core v1 Gate 0-A recovery-floor second-canonicalization contract checks passed");
