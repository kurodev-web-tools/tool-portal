import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const guardMigrationPath = "supabase/migrations/20260706073204_supabase_default_privileges_guard.sql";
const auditDocPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_DB_AUTH_RLS_SECURITY_AUDIT.md";

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

const migrationPaths = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .filter((fileName) => fileName.endsWith(".sql"))
  .map((fileName) => `supabase/migrations/${fileName}`)
  .sort();

assert.ok(migrationPaths.includes(guardMigrationPath), "default privileges guard migration exists");

const guardMigration = read(guardMigrationPath);
const guardSql = compactSql(guardMigration);
const allMigrationSql = compactSql(migrationPaths.map(read).join("\n"));
const auditDoc = read(auditDocPath);
const task = read("task.md");
const taskLower = task.toLowerCase();

for (const requiredRevoke of [
  "alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke usage, select on sequences from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke execute on functions from public"
]) {
  assertSqlIncludes(guardSql, requiredRevoke, "guard migration revokes future public defaults");
}

assert.doesNotMatch(guardSql, /\bcreate\s+table\b/i, "guard migration does not create or rework tables");
assert.doesNotMatch(guardSql, /\balter\s+table\b/i, "guard migration does not alter existing table RLS");
assert.doesNotMatch(guardSql, /\bcreate\s+policy\b/i, "guard migration does not rework policies");
assert.doesNotMatch(guardSql, /\bgrant\s+[^;]*\bto\s+(anon|authenticated)\b/i, "guard migration does not grant browser roles");
assert.doesNotMatch(guardSql, /\bgrant\s+[^;]*\bon\s+(all\s+)?tables\s+in\s+schema\s+public\b/i, "guard migration does not bulk expose public tables");

const createdTables = [...allMigrationSql.matchAll(/create table if not exists public\.([a-z0-9_]+)/g)].map(
  (match) => match[1]
);
assert.equal(new Set(createdTables).size, 9, "local public table inventory remains the existing 9 tables");

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
  `comment translator Supabase default privileges guard contract passed (default_revoke_blocks=4, existing_public_tables=9, remote_apply=not_run)`
);
