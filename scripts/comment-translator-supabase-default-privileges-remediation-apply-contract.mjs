import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const applyDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_APPLY.md";
const executionPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_EXECUTION_PREFLIGHT.md";
const approvedRunnerPath =
  "scripts/comment-translator-supabase-default-privileges-remediation-apply-approved.mjs";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const applyDoc = read(applyDocPath);
const executionPreflightDoc = read(executionPreflightDocPath);
const approvedRunner = read(approvedRunnerPath);
const task = read("task.md");
const combined = [applyDoc, executionPreflightDoc, approvedRunner, task].join("\n");

for (const marker of [
  "`pr609_merge_status` | `merged`",
  "`approval_packet_status` | `present`",
  "`same_thread_exact_approval_status` | `present`",
  "`remote_apply_approval_status` | `present`",
  "`pre_remote_catalog_query_status` | `pass`",
  "`pre_remote_table_count` | `9`",
  "`pre_remote_expected_missing_count` | `0`",
  "`pre_remote_rls_status` | `pass`",
  "`pre_remote_grant_status` | `pass`",
  "`pre_remote_default_acl_owner_status` | `mixed-or-non-postgres`",
  "`pre_remote_unexpected_default_grant_count` | `48`",
  "`pre_remote_default_privileges_status` | `fail`",
  "`pre_owner_specific_block_required_status` | `yes`",
  "`owner_specific_block_apply_status` | `included`",
  "`remote_default_privileges_apply_preflight_status` | `pass`",
  "`remote_default_privileges_apply_failure_reason` | `permission-unavailable`",
  "`remote_default_privileges_apply_status` | `blocked-permission-unavailable`",
  "`remote_default_privileges_remediation_status` | `blocked-permission-unavailable`",
  "`remote_remediation_apply_status` | `blocked-permission-unavailable`",
  "`remote_mutation_status` | `not-applied`",
  "`remote_catalog_query_status` | `pass`",
  "`remote_table_count` | `9`",
  "`remote_expected_missing_count` | `0`",
  "`remote_rls_status` | `pass`",
  "`remote_grant_status` | `pass`",
  "`remote_readonly_authenticated_write_grant_count` | `0`",
  "`remote_default_acl_owner_status` | `mixed-or-non-postgres`",
  "`remote_unexpected_default_grant_count` | `48`",
  "`remote_public_default_grant_count` | `0`",
  "`remote_default_privileges_status` | `fail`",
  "`owner_specific_block_required_status` | `yes`",
  "`remote_default_privileges_owner_specific_preflight_status` | `blocked-private-owner-value-not-reviewed`",
  "`public_release_capable_status` | `no`",
  "No owner role names beyond the documented `postgres` role were printed or persisted.",
  "Remote Supabase migration apply, `db push`, repair, reset, deploy/upload, public gate flip, live/provider/OAuth/Stripe actions, row mutation, current-table grant/policy rewrite, raw response capture, browser storage capture, credential exposure, and public access change: not run."
]) {
  assert.ok(applyDoc.includes(marker), `apply doc records ${marker}`);
}

for (const marker of [
  "I approve remote Supabase default-privileges remediation against the currently linked project only.",
  "operator-local owner-specific block only if the same-process sanitized owner preflight still reports mixed-or-non-postgres",
  "Do not run db push, repair, reset, deploy/upload, public gate flip",
  "alter default privileges for role <approved-owner-role> in schema public"
]) {
  assert.ok(executionPreflightDoc.includes(marker), `execution preflight keeps ${marker}`);
}

for (const marker of [
  "COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMEDIATION_APPROVAL",
  "same_thread_exact_approval_status",
  "remote_apply_approval_status",
  "comment-translator-supabase-default-privileges-owner-specific-preflight-readonly.mjs",
  "alter default privileges for role postgres in schema public",
  "owner_role.rolname <> 'postgres'",
  "remote_default_privileges_apply_preflight_status",
  "remote_default_privileges_apply_failure_reason",
  "permission-unavailable",
  "remote_default_privileges_apply_status=blocked-",
  "remote_mutation_status=not-applied",
  "public_release_capable_status=no"
]) {
  assert.ok(approvedRunner.includes(marker), `approved runner records ${marker}`);
}

for (const forbiddenRunnerMarker of [
  /\bgrant\s+/i,
  /\bcreate\s+table\b/i,
  /\balter\s+table\b/i,
  /\bcreate\s+policy\b/i,
  /\binsert\s+into\b/i,
  /\bupdate\s+[a-z0-9_."]+\s+set\b/i,
  /\bdelete\s+from\b/i,
  /migration\s+apply/i
]) {
  assert.doesNotMatch(approvedRunner, forbiddenRunnerMarker, `approved runner avoids ${forbiddenRunnerMarker}`);
}

for (const taskMarker of [
  "codex/supabase-default-privileges-remediation-apply",
  "Remote Supabase default privileges remediation apply attempt",
  "same_thread_exact_approval_status=present",
  "remote_default_privileges_apply_preflight_status=pass",
  "owner_specific_block_apply_status=included",
  "remote_default_privileges_apply_failure_reason=permission-unavailable",
  "remote_default_privileges_apply_status=blocked-permission-unavailable",
  "remote_default_privileges_status=fail",
  "remote_unexpected_default_grant_count=48",
  "remote_default_privileges_remediation_status=blocked-permission-unavailable",
  "remote_remediation_apply_status=blocked-permission-unavailable",
  "remote_mutation_status=not-applied"
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
  "comment translator Supabase default privileges remediation apply contract passed (remote_default_privileges=blocked-permission-unavailable, remote_mutation=not_applied, secret_scan=pass)"
);
