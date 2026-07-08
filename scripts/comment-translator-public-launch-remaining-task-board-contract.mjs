import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const doc = read(docPath);
const task = read("task.md");
const combined = [doc, task].join("\n");

for (const marker of [
  "`support_contact_status` | `submitted`",
  "`support_response_status` | `pending`",
  "`current_table_rls_grant_status` | `pass`",
  "`remote_default_privileges_status` | `fail-support-pending-or-risk-acceptance-required`",
  "`public_release_capable_status` | `no`",
  "`public_gate_flip_status` | `not-run`",
  "`main_promotion_status` | `not-run`",
  "`Monthly input character accounting`",
  "`Free limits public copy`",
  "`OBS Dock display-name policy`",
  "`Public beta access gate decision`",
  "`Public traffic rate-limit backing`",
  "`Supabase default privileges support response or risk acceptance`",
  "`PL-G5 release-owner decision`",
  "`PL-G6 public access change / promotion`",
  "Runtime accounting changes: not implemented in this task-board slice.",
  "Supabase default privileges remediation/apply: not run."
]) {
  assert.ok(doc.includes(marker), `launch remaining task board doc records ${marker}`);
}

for (const marker of [
  "codex/comment-translator-public-launch-remaining-task-board",
  "Public launch remaining task board",
  "monthly_input_character_accounting_status=pending",
  "free_limits_public_copy_status=pending",
  "public_beta_access_gate_decision_status=pending",
  "public_traffic_rate_limit_backing_status=pending",
  "support_response_status=pending",
  "risk_acceptance_status=not-recorded",
  "public_release_capable=no",
  "COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md"
]) {
  assert.ok(task.includes(marker), `task.md records ${marker}`);
}

const taskOrder = [
  "Monthly input character accounting",
  "Free limits public copy",
  "OBS Dock display-name policy",
  "Public beta access gate decision",
  "Public traffic rate-limit backing",
  "Supabase default privileges support response or risk acceptance",
  "PL-G5 release-owner decision",
  "PL-G6 public access change / promotion"
];

let previousIndex = -1;
for (const taskLabel of taskOrder) {
  const index = doc.indexOf(taskLabel);
  assert.ok(index > previousIndex, `${taskLabel} appears in launch order`);
  previousIndex = index;
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
  "comment translator public launch remaining task board contract passed (public_release_capable=no, support=pending, secret_scan=pass)"
);
