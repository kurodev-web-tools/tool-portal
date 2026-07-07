import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_DRIFT_READONLY_TRIAGE.md";
const runnerPath = "scripts/comment-translator-supabase-current-grant-drift-readonly-triage.mjs";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const doc = read(docPath);
const runner = read(runnerPath);
const task = read("task.md");
const combined = [doc, runner, task].join("\n");

for (const marker of [
  "`base_branch` | `codex/comment-translator-free-public-beta-integration`",
  "`pr604_merge_status` | `merged`",
  "`cli_status` | `local-cli-present`",
  "`link_status` | `supabase-link-metadata-present`",
  "`remote_query_mode` | `read-only`",
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
  "`remote_grant_remediation_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "Remote current grant remediation: not run.",
  "Remote default privileges remediation/apply: not run.",
  "Remote Supabase migration apply, `db push`, repair, or reset: not run."
]) {
  assert.ok(doc.includes(marker), `drift triage doc records ${marker}`);
}

for (const taskMarker of [
  "codex/supabase-current-grant-drift-readonly-triage",
  "Remote Supabase current grant drift read-only triage",
  "remote_current_grant_drift_query_status=pass",
  "remote_current_grant_drift_count=1",
  "grant_drift_table_label=public.usage_quotas",
  "grant_drift_role_label=authenticated",
  "grant_drift_privilege_type_label=TRUNCATE",
  "remote_current_grant_drift_status=fail",
  "remote_grant_remediation_status=not-run",
  "remote_mutation_status=not-run"
]) {
  assert.ok(task.includes(taskMarker), `task.md records ${taskMarker}`);
}

for (const runnerMarker of [
  "db",
  "query",
  "--linked",
  "remote_current_grant_drift_query_status",
  "grant_drift_table_label",
  "grant_drift_role_label",
  "grant_drift_privilege_type_label",
  "remote_grant_remediation_status=not-run",
  "remote_mutation_status=not-run"
]) {
  assert.ok(runner.includes(runnerMarker), `runner records ${runnerMarker}`);
}

for (const forbiddenMutation of [
  /\balter\s+table\b/i,
  /\balter\s+default\s+privileges\b/i,
  /\bgrant\s+[^'"]/i,
  /\brevoke\s+[^'"]/i,
  /\bcreate\s+table\b/i,
  /\bdrop\s+table\b/i,
  /\binsert\s+into\b/i,
  /\bupdate\s+[a-z0-9_."]+\s+set\b/i,
  /\bdelete\s+from\b/i,
  /db\s+push/i,
  /migration\s+apply/i
]) {
  assert.doesNotMatch(runner, forbiddenMutation, `runner avoids mutation pattern ${forbiddenMutation}`);
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
  "comment translator Supabase current grant drift read-only triage contract passed (drift=usage_quotas_authenticated_truncate, remote_mutation=not_run, secret_scan=pass)"
);
