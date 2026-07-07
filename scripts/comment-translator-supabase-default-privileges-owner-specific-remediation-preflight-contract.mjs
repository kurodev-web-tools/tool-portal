import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ownerPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_OWNER_SPECIFIC_REMEDIATION_PREFLIGHT.md";
const executionPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_EXECUTION_PREFLIGHT.md";
const runnerPath =
  "scripts/comment-translator-supabase-default-privileges-owner-specific-preflight-readonly.mjs";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const ownerDoc = read(ownerPreflightDocPath);
const executionDoc = read(executionPreflightDocPath);
const runner = read(runnerPath);
const task = read("task.md");
const combined = [ownerDoc, executionDoc, runner, task].join("\n");

for (const marker of [
  "`cli_status` | `local-cli-present`",
  "`link_status` | `supabase-link-metadata-present`",
  "`remote_catalog_query_status` | `pass`",
  "`remote_table_count` | `9`",
  "`remote_expected_missing_count` | `0`",
  "`remote_rls_status` | `pass`",
  "`remote_grant_status` | `pass`",
  "`remote_default_privileges_status` | `fail`",
  "`remote_unexpected_default_grant_count` | `48`",
  "`remote_default_acl_owner_status` | `mixed-or-non-postgres`",
  "`owner_specific_block_required_status` | `yes`",
  "`owner_specific_private_value_exposure_status` | `not-exposed`",
  "`owner_specific_block_review_status` | `blocked-private-owner-value-not-reviewed`",
  "`owner_specific_block_apply_status` | `not-run`",
  "`same_thread_exact_approval_status` | `absent`",
  "`same_thread_risk_acceptance_status` | `absent`",
  "`remote_apply_preflight_status` | `blocked-owner-specific-review-required`",
  "`remote_default_privileges_owner_specific_preflight_status` | `blocked-private-owner-value-not-reviewed`",
  "`remote_apply_approval_status` | `absent`",
  "`remote_remediation_apply_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`public_release_capable_status` | `no`",
  "No owner role names beyond the documented `postgres` role were printed or persisted.",
  "Remote default privileges remediation/apply: not run.",
  "Supabase default privileges guard migration or contract behavior: unchanged."
]) {
  assert.ok(ownerDoc.includes(marker), `owner-specific preflight doc records ${marker}`);
}

for (const marker of [
  "COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_OWNER_SPECIFIC_REMEDIATION_PREFLIGHT.md",
  "`owner_specific_private_value_exposure_status` | `not-exposed`",
  "`remote_default_privileges_owner_specific_preflight_status` | `blocked-private-owner-value-not-reviewed`"
]) {
  assert.ok(executionDoc.includes(marker), `execution preflight doc references ${marker}`);
}

for (const marker of [
  "comment-translator-supabase-default-privileges-remediation-apply-preflight-readonly.mjs",
  "cli_status",
  "link_status",
  "remote_default_acl_owner_status",
  "owner_specific_private_value_exposure_status=not-exposed",
  "owner_specific_block_review_status",
  "remote_default_privileges_owner_specific_preflight_status",
  "same_thread_exact_approval_status=absent",
  "same_thread_risk_acceptance_status=absent",
  "remote_mutation_status=not-run",
  "public_release_capable_status=no"
]) {
  assert.ok(runner.includes(marker), `owner-specific read-only runner records ${marker}`);
}

for (const forbiddenMutation of [
  /\balter\s+/i,
  /\bgrant\s+/i,
  /\brevoke\s+/i,
  /\bcreate\s+/i,
  /\bdrop\s+/i,
  /\binsert\s+into\b/i,
  /\bupdate\s+[a-z0-9_."]+\s+set\b/i,
  /\bdelete\s+from\b/i,
  /db\s+push/i,
  /migration\s+apply/i
]) {
  assert.doesNotMatch(runner, forbiddenMutation, `owner-specific runner avoids ${forbiddenMutation}`);
}

for (const taskMarker of [
  "codex/supabase-default-privileges-owner-specific-preflight",
  "Remote Supabase default privileges owner-specific remediation preflight",
  "owner_specific_block_review_status=blocked-private-owner-value-not-reviewed",
  "remote_default_privileges_owner_specific_preflight_status=blocked-private-owner-value-not-reviewed",
  "remote_apply_approval_status=absent",
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
  "comment translator Supabase default privileges owner-specific remediation preflight contract passed (owner_specific_review=blocked, remote_apply=not_run, secret_scan=pass)"
);
