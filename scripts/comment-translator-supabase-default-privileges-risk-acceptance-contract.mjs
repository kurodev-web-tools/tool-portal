import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const riskAcceptanceDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_RISK_ACCEPTANCE.md";
const supportPendingDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_SUPPORT_PENDING.md";
const taskBoardPath =
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync(
    "git diff --name-only origin/codex/comment-translator-free-public-beta-integration...HEAD",
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }
  )
    .split(/\r?\n/)
    .filter(Boolean);
  const uncommittedDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) =>
    file.replace(/\\/g, "/")
  );
}

function assertNoSensitiveValues(source, label) {
  const sensitivePatterns = [
    /sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}/,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    /postgres(?:ql)?:\/\/[^\s'")]+/i,
    /Authorization\s*:\s*[^\s'")]+/i,
    /Bearer\s+[A-Za-z0-9_.-]{20,}/i,
    /service_role\s*[:=]\s*["'][^"']+["']/i,
    /owner(?:_id| id)\s*[:=]\s*["'][^"']+["']/i,
    /project(?:_id| id)\s*[:=]\s*["'][^"']+["']/i,
    /support(?:_ticket| ticket| id)\s*[:=]\s*["'][^"']+["']/i,
    /liveChatId\s*[:=]\s*["'][^"']+["']/i,
    /providerTargetMetadata\s*[:=]\s*["'][^"']+["']/i,
    /rawComment(?:Text|s)?\s*[:=]\s*["'][^"']+["']/i
  ];

  for (const pattern of sensitivePatterns) {
    assert.doesNotMatch(source, pattern, `${label} has no sensitive match for ${pattern}`);
  }
}

for (const requiredPath of [
  riskAcceptanceDocPath,
  supportPendingDocPath,
  taskBoardPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `required Step 11 path exists: ${requiredPath}`);
}

const riskAcceptanceDoc = read(riskAcceptanceDocPath);
const supportPendingDoc = read(supportPendingDocPath);
const taskBoard = read(taskBoardPath);
const task = read(taskPath);
const combined = [riskAcceptanceDoc, supportPendingDoc, taskBoard, task].join("\n");
const currentDecisionSurface = [riskAcceptanceDoc, taskBoard].join("\n");

for (const marker of [
  "`supabase_default_privileges_step` | `public-launch-next-flow-step-11`",
  "`support_contact_status` | `submitted`",
  "`support_response_status` | `pending`",
  "`release_owner_risk_acceptance_decision_status` | `present`",
  "`risk_acceptance_status` | `accepted`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`current_table_rls_grant_status` | `pass`",
  "`remote_current_grant_drift_status` | `pass`",
  "`remote_default_privileges_posture_status` | `fail`",
  "`remote_default_privileges_status` | `fail-accepted-risk`",
  "`remote_unexpected_default_grant_count` | `48`",
  "`remote_default_privileges_apply_status` | `not-run`",
  "`remote_default_privileges_remediation_status` | `not-run`",
  "`remote_remediation_apply_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`public_release_capable_status` | `no`",
  "`public_gate_flip_status` | `not-run`",
  "`main_promotion_status` | `not-run`",
  "New `public` database object work still requires explicit object-level grant, RLS, and default-privileges review",
  "If Supabase Support later replies with a supported remediation path, consume that response in a separate follow-up"
]) {
  assert.ok(riskAcceptanceDoc.includes(marker), `risk acceptance doc records ${marker}`);
}

for (const marker of [
  "`remote_default_privileges_status` | `fail-accepted-risk`",
  "`remote_default_privileges_posture_status` | `fail`",
  "`risk_acceptance_status` | `accepted`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`public_release_capable_status` | `no`",
  "Supabase default privileges risk acceptance: decision only.",
  "Supabase default privileges remediation/apply: not run."
]) {
  assert.ok(taskBoard.includes(marker), `task board records ${marker}`);
}

for (const marker of [
  "codex/comment-translator-supabase-default-privileges-risk-acceptance",
  "support_response_status=pending",
  "remote_default_privileges_status=fail-accepted-risk",
  "remote_default_privileges_posture_status=fail",
  "risk_acceptance_status=accepted",
  "risk_acceptance_scope=future-public-object-default-privileges-only",
  "public_release_capable=no",
  "public_gate_flip_status=not-run",
  "main_promotion_status=not-run",
  "COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_RISK_ACCEPTANCE.md"
]) {
  assert.ok(task.includes(marker), `task.md records ${marker}`);
}

assert.ok(
  supportPendingDoc.includes("`support_response_status` | `pending`"),
  "support-pending evidence remains pending until Supabase replies"
);
assert.ok(
  supportPendingDoc.includes("`remote_mutation_status` | `not-run`"),
  "support-pending evidence remains remote-mutation-free"
);

assert.doesNotMatch(currentDecisionSurface, /public_release_capable(?:_status)?[=|]\s*`?yes`?/i);
assert.doesNotMatch(currentDecisionSurface, /remote_mutation_status[=|]\s*`?(?:applied|completed)`?/i);
assert.doesNotMatch(
  currentDecisionSurface,
  /public_gate_flip_status[=|]\s*`?(?:applied|completed|done)`?/i
);
assert.doesNotMatch(currentDecisionSurface, /deploy_upload_status[=|]\s*`?(?:applied|completed|done)`?/i);

for (const [label, source] of [
  [riskAcceptanceDocPath, riskAcceptanceDoc],
  [supportPendingDocPath, supportPendingDoc],
  [taskBoardPath, taskBoard],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  riskAcceptanceDocPath,
  taskBoardPath,
  taskPath,
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-supabase-default-privileges-risk-acceptance-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Step 11 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log(
  "comment translator Supabase default privileges risk acceptance contract passed (support=pending, risk_acceptance=accepted, remote_mutation=not_run, secret_scan=pass)"
);
