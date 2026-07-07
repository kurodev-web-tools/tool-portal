import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const applyPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPLY_PREFLIGHT.md";
const approvalPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPROVAL_PREFLIGHT.md";
const applyPreflightRunnerPath =
  "scripts/comment-translator-supabase-current-grant-remediation-apply-preflight-readonly.mjs";
const triageDocPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_DRIFT_READONLY_TRIAGE.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const applyDoc = read(applyPreflightDocPath);
const approvalDoc = read(approvalPreflightDocPath);
const runner = read(applyPreflightRunnerPath);
const triageDoc = read(triageDocPath);
const task = read("task.md");
const combined = [applyDoc, approvalDoc, runner, triageDoc, task].join("\n");

for (const marker of [
  "`pr606_merge_status` | `merged`",
  "`approval_packet_status` | `present`",
  "`same_thread_exact_approval_status` | `absent`",
  "`same_thread_risk_acceptance_status` | `absent`",
  "`remote_current_grant_remediation_approval_status` | `absent`",
  "`remote_current_grant_drift_query_status` | `pass`",
  "`remote_current_grant_drift_count` | `1`",
  "`remote_current_grant_drift_breakdown_count` | `1`",
  "`remote_usage_quotas_authenticated_write_drift_count` | `1`",
  "`remote_anon_grant_drift_breakdown_count` | `0`",
  "`remote_server_only_authenticated_grant_drift_breakdown_count` | `0`",
  "`grant_drift_table_label` | `public.usage_quotas`",
  "`grant_drift_role_label` | `authenticated`",
  "`grant_drift_privilege_type_label` | `TRUNCATE`",
  "`grant_drift_count` | `1`",
  "`remote_current_grant_drift_status` | `fail`",
  "`remote_current_grant_preapply_expected_drift_status` | `pass`",
  "`remote_current_grant_apply_preflight_status` | `blocked-approval-absent`",
  "`remote_current_grant_remediation_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`public_release_capable_status` | `no`",
  "Remote current grant remediation: not run.",
  "Remote default privileges remediation/apply: not run.",
  "Remote Supabase migration apply, `db push`, repair, or reset: not run."
]) {
  assert.ok(applyDoc.includes(marker), `apply preflight doc records ${marker}`);
}

for (const approvalMarker of [
  "I approve remote Supabase current-grant remediation against the currently linked project only.",
  "Scope is revoking TRUNCATE on public.usage_quotas from authenticated only",
  "I explicitly accept the remote Supabase current-grant drift for the currently linked project."
]) {
  assert.ok(approvalDoc.includes(approvalMarker), `approval packet still records ${approvalMarker}`);
}

for (const runnerMarker of [
  "comment-translator-supabase-current-grant-drift-readonly-triage.mjs",
  "remote_current_grant_preapply_expected_drift_status",
  "remote_current_grant_remediation_approval_status=absent",
  "blocked-approval-absent",
  "remote_current_grant_remediation_status=not-run",
  "remote_mutation_status=not-run"
]) {
  assert.ok(runner.includes(runnerMarker), `read-only apply preflight runner records ${runnerMarker}`);
}

for (const forbiddenMutation of [
  /\brevoke\s+truncate\b/i,
  /\balter\s+/i,
  /\bgrant\s+/i,
  /\bcreate\s+/i,
  /\bdrop\s+/i,
  /\binsert\s+into\b/i,
  /\bupdate\s+[a-z0-9_."]+\s+set\b/i,
  /\bdelete\s+from\b/i,
  /db\s+push/i,
  /migration\s+apply/i
]) {
  assert.doesNotMatch(runner, forbiddenMutation, `read-only apply preflight runner avoids ${forbiddenMutation}`);
}

for (const sourceMarker of [
  "`remote_current_grant_drift_query_status` | `pass`",
  "`remote_current_grant_drift_count` | `1`",
  "`grant_drift_table_label` | `public.usage_quotas`",
  "`grant_drift_role_label` | `authenticated`",
  "`grant_drift_privilege_type_label` | `TRUNCATE`"
]) {
  assert.ok(triageDoc.includes(sourceMarker), `triage evidence remains anchored: ${sourceMarker}`);
}

for (const taskMarker of [
  "codex/supabase-current-grant-remediation-apply-preflight",
  "Remote Supabase current grant remediation apply preflight",
  "same_thread_exact_approval_status=absent",
  "remote_current_grant_preapply_expected_drift_status=pass",
  "remote_current_grant_apply_preflight_status=blocked-approval-absent",
  "remote_current_grant_remediation_status=not-run",
  "remote_mutation_status=not-run",
  "remote current grant remediation remains approval-gated"
]) {
  assert.ok(task.includes(taskMarker), `task.md records ${taskMarker}`);
}

for (const forbiddenTaskMarker of [
  "remote_current_grant_remediation_status=pass",
  "remote_current_grant_apply_preflight_status=pass",
  "remote_mutation_scope_status=current-grant-truncate-only"
]) {
  assert.ok(!task.includes(forbiddenTaskMarker), `task.md does not claim ${forbiddenTaskMarker}`);
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
  "comment translator Supabase current grant remediation apply preflight contract passed (preflight=blocked_approval_absent, remote_current_grant_apply=not_run, secret_scan=pass)"
);
