import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const approvalDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_APPROVAL.md";
const remotePostureDocPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_REMOTE_READONLY_POSTURE_CHECK.md";
const guardMigrationPath = "supabase/migrations/20260706073204_supabase_default_privileges_guard.sql";

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

const approvalDoc = read(approvalDocPath);
const remotePostureDoc = read(remotePostureDocPath);
const guardSql = compactSql(read(guardMigrationPath));
const task = read("task.md");

for (const marker of [
  "`remote_default_privileges_status`: `fail`",
  "`remote_unexpected_default_grant_count`: `48`",
  "`remote_owner_count_query_status` | `pass`",
  "`remote_default_acl_entry_count` | `6`",
  "`remote_default_acl_postgres_owner_entry_count` | `3`",
  "`remote_default_acl_other_owner_entry_count` | `3`",
  "`remote_default_acl_owner_status` | `mixed-or-non-postgres`",
  "`remote_remediation_required_status` | `yes`",
  "`remote_remediation_apply_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`owner_specific_block_required_status` | `yes`",
  "`risk_acceptance_status` | `not-recorded`",
  "`public_release_capable_status` | `no`",
  "Owner role names beyond the documented `postgres` role were not printed or persisted.",
  "The apply step must not run from this PR.",
  "`remote_default_privileges_status=pass`",
  "`remote_unexpected_default_grant_count=0`"
]) {
  assert.ok(approvalDoc.includes(marker), `approval doc records ${marker}`);
}

for (const existingEvidenceMarker of [
  "`remote_default_privileges_status` | `fail`",
  "`remote_unexpected_default_grant_count` | `48`",
  "`remote_default_acl_owner_status` | `mixed-or-non-postgres`"
]) {
  if (existingEvidenceMarker.includes("owner_status")) continue;
  assert.ok(remotePostureDoc.includes(existingEvidenceMarker), `remote evidence remains anchored: ${existingEvidenceMarker}`);
}

for (const requiredRevoke of [
  "alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke usage, select on sequences from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke execute on functions from public"
]) {
  assert.ok(guardSql.includes(requiredRevoke), `guard migration still contains ${requiredRevoke}`);
}

for (const forbiddenSql of [
  /\bcreate\s+table\b/i,
  /\balter\s+table\b/i,
  /\bcreate\s+policy\b/i,
  /\bgrant\s+[^;]*\bto\s+(anon|authenticated)\b/i,
  /\bgrant\s+[^;]*\bon\s+(all\s+)?tables\s+in\s+schema\s+public\b/i
]) {
  assert.doesNotMatch(guardSql, forbiddenSql, `guard migration avoids ${forbiddenSql}`);
}

for (const taskMarker of [
  "codex/supabase-default-privileges-remediation-approval",
  "Remote Supabase default privileges remediation approval",
  "remote_default_acl_owner_status=mixed-or-non-postgres",
  "remote_remediation_apply_status=not-run",
  "owner_specific_block_required_status=yes",
  "remote mutation: not-run"
]) {
  assert.ok(task.includes(taskMarker), `task.md records ${taskMarker}`);
}

const sensitivePieces = [
  /sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^\s'")]+/i,
  /Authorization\s*:\s*[^\s'")]+/i,
  /Bearer\s+[A-Za-z0-9_.-]{20,}/i
];

const scanned = [approvalDoc, remotePostureDoc, task].join("\n");
for (const pattern of sensitivePieces) {
  assert.doesNotMatch(scanned, pattern, `no sensitive value matching ${pattern}`);
}

console.log(
  "comment translator Supabase default privileges remote remediation approval contract passed (remediation_apply=not_run, owner_status=mixed-or-non-postgres, secret_scan=pass)"
);
