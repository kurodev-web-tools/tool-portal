import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const supportPendingDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_SUPPORT_PENDING.md";
const managedOwnerBlockerDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_MANAGED_OWNER_BLOCKER.md";
const permissionCapableApplyDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_PERMISSION_CAPABLE_APPLY.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const supportPendingDoc = read(supportPendingDocPath);
const managedOwnerBlockerDoc = read(managedOwnerBlockerDocPath);
const permissionCapableApplyDoc = read(permissionCapableApplyDocPath);
const task = read("task.md");
const combined = [
  supportPendingDoc,
  managedOwnerBlockerDoc,
  permissionCapableApplyDoc,
  task
].join("\n");

for (const marker of [
  "`pr613_merge_status` | `merged`",
  "`support_contact_status` | `submitted`",
  "`support_response_status` | `pending`",
  "`support_contact_mutation_status` | `not-run`",
  "`sql_editor_current_user_status` | `postgres`",
  "`direct_db_current_user_status` | `not-checked-psql-unavailable`",
  "`remote_default_acl_owner_count` | `2`",
  "`remote_default_acl_owner_membership_available_count` | `1`",
  "`remote_default_acl_owner_membership_missing_count` | `1`",
  "`remote_owner_specific_apply_required_owner_count` | `1`",
  "`remote_owner_specific_apply_permission_available_count` | `0`",
  "`remote_owner_specific_apply_permission_missing_count` | `1`",
  "`remote_default_privileges_privileged_apply_path_status` | `blocked-permission-unavailable`",
  "`remote_default_privileges_managed_owner_boundary_status` | `blocked-managed-or-internal-owner-boundary`",
  "`remote_default_privileges_apply_status` | `not-run`",
  "`remote_default_privileges_remediation_status` | `not-run`",
  "`remote_remediation_apply_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`risk_acceptance_status` | `not-recorded`",
  "`public_release_capable_status` | `no`",
  "Do not create new `public` database objects while this blocker is unresolved",
  "Non-DB tasks may continue while support response is pending.",
  "Public release may proceed only if PL-G5 records explicit risk acceptance",
  "Supabase default privileges guard migration or contract behavior: unchanged."
]) {
  assert.ok(supportPendingDoc.includes(marker), `support pending doc records ${marker}`);
}

for (const marker of [
  "`remote_default_privileges_managed_owner_boundary_status` | `blocked-managed-or-internal-owner-boundary`",
  "`remote_mutation_status` | `not-run`"
]) {
  assert.ok(managedOwnerBlockerDoc.includes(marker), `managed blocker doc preserves ${marker}`);
}

for (const marker of [
  "`remote_default_privileges_permission_capable_apply_preflight_status` | `blocked-permission-unavailable`",
  "`remote_mutation_status` | `not-run`"
]) {
  assert.ok(permissionCapableApplyDoc.includes(marker), `permission-capable doc preserves ${marker}`);
}

for (const taskMarker of [
  "codex/supabase-default-privileges-support-pending",
  "Remote Supabase default privileges support pending",
  "support_contact_status=submitted",
  "support_response_status=pending",
  "sql_editor_current_user_status=postgres",
  "direct_db_current_user_status=not-checked-psql-unavailable",
  "risk_acceptance_status=not-recorded",
  "remote_default_privileges_apply_status=not-run",
  "remote_mutation_status=not-run",
  "No new `public` database object work should proceed",
  "OBS Dock display-name policy"
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
  /project(?:_id| id)\s*[:=]\s*["'][^"']+["']/i,
  /support(?:_ticket| ticket| id)\s*[:=]\s*["'][^"']+["']/i
];

for (const pattern of sensitivePatterns) {
  assert.doesNotMatch(combined, pattern, `no sensitive value matching ${pattern}`);
}

console.log(
  "comment translator Supabase default privileges support pending contract passed (support=submitted, response=pending, remote_mutation=not_run, secret_scan=pass)"
);
