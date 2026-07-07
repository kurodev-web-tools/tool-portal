import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const preflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPROVAL_PREFLIGHT.md";
const triageDocPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_DRIFT_READONLY_TRIAGE.md";
const triageRunnerPath = "scripts/comment-translator-supabase-current-grant-drift-readonly-triage.mjs";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const preflightDoc = read(preflightDocPath);
const triageDoc = read(triageDocPath);
const triageRunner = read(triageRunnerPath);
const task = read("task.md");
const combined = [preflightDoc, triageDoc, task].join("\n");

for (const marker of [
  "`pr605_merge_status` | `merged`",
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
  "`current_grant_remediation_decision_status` | `pending`",
  "`current_grant_risk_acceptance_status` | `not-recorded`",
  "`remote_current_grant_remediation_approval_status` | `absent`",
  "`remote_current_grant_apply_preflight_status` | `not-run`",
  "`remote_current_grant_remediation_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`public_release_capable_status` | `no`",
  "revoke truncate on table public.usage_quotas from authenticated;",
  "`remote_current_grant_drift_count=0`",
  "`remote_current_grant_drift_status=pass`",
  "`remote_mutation_scope_status=current-grant-truncate-only`",
  "Remote current grant remediation: not run.",
  "Remote default privileges remediation/apply: not run.",
  "Remote Supabase migration apply, `db push`, repair, or reset: not run."
]) {
  assert.ok(preflightDoc.includes(marker), `current grant remediation preflight doc records ${marker}`);
}

for (const approvalText of [
  "I approve remote Supabase current-grant remediation against the currently linked project only.",
  "Scope is revoking TRUNCATE on public.usage_quotas from authenticated only",
  "Keep evidence sanitized to pass/fail/count/status/table/role/privilege labels only.",
  "Do not run db push, repair, reset, deploy/upload, public gate flip",
  "default-privileges remediation/apply",
  "I explicitly accept the remote Supabase current-grant drift for the currently linked project.",
  "Do not run current grant remediation.",
  "record current_grant_risk_acceptance_status=accepted"
]) {
  assert.ok(preflightDoc.includes(approvalText), `exact approval boundary includes ${approvalText}`);
}

for (const sourceMarker of [
  "`remote_current_grant_drift_query_status` | `pass`",
  "`remote_current_grant_drift_count` | `1`",
  "`grant_drift_table_label` | `public.usage_quotas`",
  "`grant_drift_role_label` | `authenticated`",
  "`grant_drift_privilege_type_label` | `TRUNCATE`",
  "`remote_grant_remediation_status` | `not-run`",
  "`remote_mutation_status` | `not-run`"
]) {
  assert.ok(triageDoc.includes(sourceMarker), `triage evidence remains anchored: ${sourceMarker}`);
}

for (const taskMarker of [
  "codex/supabase-current-grant-remediation-approval-preflight",
  "Remote Supabase current grant remediation approval preflight",
  "current_grant_remediation_decision_status=pending",
  "current_grant_risk_acceptance_status=not-recorded",
  "remote_current_grant_remediation_approval_status=absent",
  "remote_current_grant_apply_preflight_status=not-run",
  "remote_current_grant_remediation_status=not-run",
  "remote_mutation_status=not-run",
  "remote current grant remediation remains approval-gated"
]) {
  assert.ok(task.includes(taskMarker), `task.md records ${taskMarker}`);
}

for (const runnerMarker of [
  "remote_current_grant_drift_query_status",
  "remote_usage_quotas_authenticated_write_drift_count",
  "grant_drift_table_label",
  "grant_drift_role_label",
  "grant_drift_privilege_type_label",
  "remote_grant_remediation_status=not-run",
  "remote_mutation_status=not-run"
]) {
  assert.ok(triageRunner.includes(runnerMarker), `read-only triage runner records ${runnerMarker}`);
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
  "comment translator Supabase current grant remediation approval preflight contract passed (decision=pending, remote_current_grant_apply=not_run, secret_scan=pass)"
);
