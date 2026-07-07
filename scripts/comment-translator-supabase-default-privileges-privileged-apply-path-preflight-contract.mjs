import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const privilegedPathDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_PRIVILEGED_APPLY_PATH_PREFLIGHT.md";
const applyDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_APPLY.md";
const executionPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_EXECUTION_PREFLIGHT.md";
const runnerPath =
  "scripts/comment-translator-supabase-default-privileges-privileged-apply-path-preflight-readonly.mjs";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const privilegedPathDoc = read(privilegedPathDocPath);
const applyDoc = read(applyDocPath);
const executionPreflightDoc = read(executionPreflightDocPath);
const runner = read(runnerPath);
const task = read("task.md");
const combined = [privilegedPathDoc, applyDoc, executionPreflightDoc, runner, task].join("\n");

for (const marker of [
  "`pr610_merge_status` | `merged`",
  "`approval_packet_status` | `present`",
  "`same_thread_exact_approval_status` | `present`",
  "`remote_apply_approval_status` | `present`",
  "`remote_catalog_query_status` | `pass`",
  "`remote_table_count` | `9`",
  "`remote_expected_missing_count` | `0`",
  "`remote_rls_status` | `pass`",
  "`remote_grant_status` | `pass`",
  "`remote_default_acl_owner_status` | `mixed-or-non-postgres`",
  "`remote_unexpected_default_grant_count` | `48`",
  "`remote_default_privileges_status` | `fail`",
  "`owner_specific_block_required_status` | `yes`",
  "`owner_specific_private_value_exposure_status` | `not-exposed`",
  "`owner_specific_block_review_status` | `blocked-private-owner-value-not-reviewed`",
  "`owner_specific_block_apply_status` | `not-run`",
  "`remote_default_privileges_owner_specific_preflight_status` | `blocked-private-owner-value-not-reviewed`",
  "`remote_owner_specific_apply_permission_query_status` | `pass`",
  "`remote_default_acl_owner_count` | `2`",
  "`remote_default_acl_owner_membership_available_count` | `1`",
  "`remote_default_acl_owner_membership_missing_count` | `1`",
  "`remote_owner_specific_apply_required_owner_count` | `1`",
  "`remote_owner_specific_apply_permission_available_count` | `0`",
  "`remote_owner_specific_apply_permission_missing_count` | `1`",
  "`remote_owner_specific_apply_permission_status` | `blocked-permission-unavailable`",
  "`remote_default_privileges_apply_permission_status` | `blocked-permission-unavailable`",
  "`remote_default_privileges_privileged_apply_path_status` | `blocked-permission-unavailable`",
  "`remote_remediation_apply_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`public_release_capable_status` | `no`",
  "No owner role names beyond the documented `postgres` role were printed or persisted.",
  "Remote default privileges remediation/apply: not run.",
  "Supabase default privileges guard migration or contract behavior: unchanged."
]) {
  assert.ok(privilegedPathDoc.includes(marker), `privileged path doc records ${marker}`);
}

for (const marker of [
  "`remote_default_privileges_apply_status` | `blocked-permission-unavailable`",
  "`remote_mutation_status` | `not-applied`",
  "Public release remains blocked until the apply is rerun through a permission-capable private owner role handling path"
]) {
  assert.ok(applyDoc.includes(marker), `apply doc preserves ${marker}`);
}

for (const marker of [
  "I approve remote Supabase default-privileges remediation against the currently linked project only.",
  "operator-local owner-specific block only if the same-process sanitized owner preflight still reports mixed-or-non-postgres",
  "Do not run db push, repair, reset, deploy/upload, public gate flip"
]) {
  assert.ok(executionPreflightDoc.includes(marker), `execution preflight keeps ${marker}`);
}

for (const marker of [
  "comment-translator-supabase-default-privileges-owner-specific-preflight-readonly.mjs",
  "COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMEDIATION_APPROVAL",
  "same_thread_exact_approval_status",
  "remote_apply_approval_status",
  "pg_has_role(oid, 'MEMBER')",
  "remote_owner_specific_apply_permission_query_status",
  "remote_default_acl_owner_membership_missing_count",
  "remote_owner_specific_apply_permission_missing_count",
  "remote_owner_specific_apply_permission_status",
  "remote_default_privileges_apply_permission_status",
  "remote_default_privileges_privileged_apply_path_status",
  "owner_specific_private_value_exposure_status=not-exposed",
  "owner_specific_block_apply_status=not-run",
  "remote_remediation_apply_status=not-run",
  "remote_mutation_status=not-run",
  "public_release_capable_status=no"
]) {
  assert.ok(runner.includes(marker), `privileged path runner records ${marker}`);
}

for (const forbiddenMutation of [
  /alter\s+default\s+privileges/i,
  /\brevoke\s+/i,
  /\bgrant\s+/i,
  /\bcreate\s+(?:table|policy|schema|function|view)\b/i,
  /\bdrop\s+/i,
  /\binsert\s+into\b/i,
  /\bupdate\s+[a-z0-9_."]+\s+set\b/i,
  /\bdelete\s+from\b/i,
  /"db",\s*"push"/i,
  /migration\s+apply/i
]) {
  assert.doesNotMatch(runner, forbiddenMutation, `privileged path runner avoids ${forbiddenMutation}`);
}

for (const taskMarker of [
  "codex/supabase-default-privileges-privileged-apply-path-preflight",
  "Remote Supabase default privileges privileged apply path preflight",
  "remote_default_acl_owner_membership_missing_count=1",
  "remote_owner_specific_apply_permission_missing_count=1",
  "remote_owner_specific_apply_permission_status=blocked-permission-unavailable",
  "remote_default_privileges_apply_permission_status=blocked-permission-unavailable",
  "remote_default_privileges_privileged_apply_path_status=blocked-permission-unavailable",
  "remote_remediation_apply_status=not-run",
  "remote_mutation_status=not-run"
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
  "comment translator Supabase default privileges privileged apply path preflight contract passed (privileged_path=blocked-permission-unavailable, remote_mutation=not_run, secret_scan=pass)"
);
