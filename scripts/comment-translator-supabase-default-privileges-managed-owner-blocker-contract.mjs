import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const managedOwnerBlockerDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_MANAGED_OWNER_BLOCKER.md";
const permissionCapableApplyDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_PERMISSION_CAPABLE_APPLY.md";
const runnerPath =
  "scripts/comment-translator-supabase-default-privileges-permission-capable-apply-approved.mjs";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const managedOwnerBlockerDoc = read(managedOwnerBlockerDocPath);
const permissionCapableApplyDoc = read(permissionCapableApplyDocPath);
const permissionCapableRunner = read(runnerPath);
const task = read("task.md");
const combined = [managedOwnerBlockerDoc, permissionCapableApplyDoc, permissionCapableRunner, task].join(
  "\n"
);

for (const marker of [
  "`pr612_merge_status` | `merged`",
  "`side_check_source_status` | `operator-provided-sanitized`",
  "`side_check_mutation_status` | `not-run`",
  "`remote_default_acl_owner_count` | `2`",
  "`remote_default_acl_owner_membership_available_count` | `1`",
  "`remote_default_acl_owner_membership_missing_count` | `1`",
  "`remote_owner_specific_apply_required_owner_count` | `1`",
  "`remote_owner_specific_apply_permission_available_count` | `0`",
  "`remote_owner_specific_apply_permission_missing_count` | `1`",
  "`remote_default_privileges_privileged_apply_path_status` | `blocked-permission-unavailable`",
  "`remote_default_privileges_managed_owner_boundary_status` | `blocked-managed-or-internal-owner-boundary`",
  "`remote_default_privileges_force_role_membership_change_status` | `not-attempted`",
  "`remote_default_privileges_apply_status` | `not-run`",
  "`remote_default_privileges_remediation_status` | `not-run`",
  "`remote_remediation_apply_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`public_release_capable_status` | `no`",
  "Role membership change / owner role change: not attempted.",
  "Remote default privileges remediation/apply: not run.",
  "Supabase default privileges guard migration or contract behavior: unchanged."
]) {
  assert.ok(managedOwnerBlockerDoc.includes(marker), `managed owner blocker doc records ${marker}`);
}

for (const marker of [
  "`remote_default_privileges_permission_capable_apply_preflight_status` | `blocked-permission-unavailable`",
  "`permission_capable_apply_runner_status` | `not-run`",
  "`remote_mutation_status` | `not-run`"
]) {
  assert.ok(permissionCapableApplyDoc.includes(marker), `permission-capable doc preserves ${marker}`);
}

for (const marker of [
  "remote_default_privileges_privileged_apply_path_status",
  "blocked-permission-unavailable",
  "remote_mutation_status=not-run"
]) {
  assert.ok(permissionCapableRunner.includes(marker), `permission-capable runner preserves ${marker}`);
}

for (const taskMarker of [
  "codex/supabase-default-privileges-managed-owner-blocker",
  "Remote Supabase default privileges managed/internal owner blocker",
  "remote_default_privileges_managed_owner_boundary_status=blocked-managed-or-internal-owner-boundary",
  "remote_default_privileges_force_role_membership_change_status=not-attempted",
  "remote_default_privileges_apply_status=not-run",
  "remote_default_privileges_remediation_status=not-run",
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
  "comment translator Supabase default privileges managed owner blocker contract passed (managed_boundary=blocked, remote_mutation=not_run, secret_scan=pass)"
);
