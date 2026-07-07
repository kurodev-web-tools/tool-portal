import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const preflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_EXECUTION_PREFLIGHT.md";
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

const preflightDoc = read(preflightDocPath);
const approvalDoc = read(approvalDocPath);
const remotePostureDoc = read(remotePostureDocPath);
const guardSql = compactSql(read(guardMigrationPath));
const task = read("task.md");
const combined = [preflightDoc, approvalDoc, remotePostureDoc, task].join("\n");

for (const marker of [
  "`remote_default_privileges_status` | `fail`",
  "`remote_unexpected_default_grant_count` | `48`",
  "`remote_default_acl_entry_count` | `6`",
  "`remote_default_acl_owner_status` | `mixed-or-non-postgres`",
  "`owner_specific_block_required_status` | `yes`",
  "`remediation_decision_status` | `pending`",
  "`risk_acceptance_status` | `not-recorded`",
  "`remote_apply_approval_status` | `absent`",
  "`remote_apply_preflight_status` | `blocked-safe-readonly-preflight-unavailable`",
  "`remote_remediation_apply_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`public_release_capable_status` | `no`",
  "`cli_status` | `local-cli-unavailable`",
  "`cli_version_status` | `unavailable`",
  "`link_status` | `supabase-link-metadata-missing`",
  "`mcp_status` | `available-but-blocked-without-safe-project-selector`",
  "`remote_catalog_query_status` | `blocked`",
  "`remote_table_count` | `unchecked`",
  "`remote_expected_missing_count` | `unchecked`",
  "`remote_rls_status` | `unchecked`",
  "`remote_grant_status` | `unchecked`",
  "`remote_default_privileges_status` | `fail-from-merged-evidence`",
  "`remote_unexpected_default_grant_count` | `48-from-merged-evidence`",
  "`remote_default_acl_owner_status` | `mixed-or-non-postgres-from-merged-evidence`",
  "`owner_specific_block_review_status` | `blocked-private-owner-value-not-reviewed`",
  "Owner role names beyond the documented `postgres` role were not printed or persisted",
  "Do not store the private owner role value in repo docs",
  "Because a local Supabase CLI/link path and a safe MCP project selector were not both available",
  "The safe target selection requirement was not met",
  "If any check cannot run safely, emits raw output, requires printing credentials or project identity",
  "Any shorter approval, ambiguous \"go ahead\"",
  "`risk_acceptance_status=accepted`",
  "`remote_default_privileges_status=pass`",
  "`remote_unexpected_default_grant_count=0`",
  "Supabase default privileges guard migration or contract behavior: unchanged."
]) {
  assert.ok(preflightDoc.includes(marker), `preflight doc records ${marker}`);
}

for (const approvalText of [
  "I approve remote Supabase default-privileges remediation against the currently linked project only.",
  "Scope is future public object default privileges only",
  "operator-local owner-specific block only if the same-process sanitized owner preflight still reports mixed-or-non-postgres",
  "Keep evidence sanitized to pass/fail/count/status labels only.",
  "Do not run db push, repair, reset, deploy/upload, public gate flip",
  "I explicitly accept the remote Supabase future default-privileges risk for the currently linked project.",
  "Do not run remediation apply.",
  "record risk_acceptance_status=accepted"
]) {
  assert.ok(preflightDoc.includes(approvalText), `exact approval boundary includes ${approvalText}`);
}

for (const requiredSql of [
  "alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke usage, select on sequences from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, service_role",
  "alter default privileges for role postgres in schema public revoke execute on functions from public"
]) {
  assert.ok(guardSql.includes(requiredSql), `guard migration remains unchanged for ${requiredSql}`);
}

for (const ownerTemplate of [
  "alter default privileges for role <approved-owner-role> in schema public",
  "revoke select, insert, update, delete on tables from anon, authenticated, service_role;",
  "revoke usage, select on sequences from anon, authenticated, service_role;",
  "revoke execute on functions from anon, authenticated, service_role;",
  "revoke execute on functions from public;"
]) {
  assert.ok(preflightDoc.includes(ownerTemplate), `owner-specific template includes ${ownerTemplate}`);
}

for (const sourceMarker of [
  "`remote_default_privileges_status`: `fail`",
  "`remote_unexpected_default_grant_count`: `48`",
  "`remote_default_acl_owner_status` | `mixed-or-non-postgres`",
  "`risk_acceptance_status` | `not-recorded`"
]) {
  assert.ok(approvalDoc.includes(sourceMarker), `approval packet remains anchored: ${sourceMarker}`);
}

for (const sourceMarker of [
  "`remote_default_privileges_status` | `fail`",
  "`remote_unexpected_default_grant_count` | `48`",
  "`remote_readonly_check_status` | `fail`"
]) {
  assert.ok(remotePostureDoc.includes(sourceMarker), `remote posture remains anchored: ${sourceMarker}`);
}

for (const taskMarker of [
  "codex/supabase-default-privileges-remediation-preflight",
  "codex/supabase-default-privileges-remediation-apply-preflight",
  "Remote Supabase default privileges remediation execution preflight",
  "remediation_decision_status=pending",
  "risk_acceptance_status=not-recorded",
  "remote_apply_approval_status=absent",
  "remote_apply_preflight_status=blocked-safe-readonly-preflight-unavailable",
  "remote_catalog_query_status=blocked",
  "owner_specific_block_review_status=blocked-private-owner-value-not-reviewed",
  "remote_remediation_apply_status=not-run",
  "remote_mutation_status=not-run",
  "remote default privileges remediation/apply and risk acceptance remain approval-gated"
]) {
  assert.ok(task.includes(taskMarker), `task.md records ${taskMarker}`);
}

const sensitivePatterns = [
  /sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^\s'")]+/i,
  /Authorization\s*:\s*[^\s'")]+/i,
  /Bearer\s+[A-Za-z0-9_.-]{20,}/i,
  /service_role\s*[:=]\s*["'][^"']+["']/i,
  /owner(?:_id| id)\s*[:=]\s*["'][^"']+["']/i,
  /project(?:_id| id)\s*[:=]\s*["'][^"']+["']/i
];

for (const pattern of sensitivePatterns) {
  assert.doesNotMatch(combined, pattern, `no sensitive value matching ${pattern}`);
}

console.log(
  "comment translator Supabase default privileges remediation execution preflight contract passed (decision=pending, remote_apply=not_run, risk_acceptance=not_recorded, secret_scan=pass)"
);
