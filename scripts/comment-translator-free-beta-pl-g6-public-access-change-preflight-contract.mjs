import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG6DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md";
const plG5DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md";
const taskBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const operatorChecklistPath =
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md";
const cloudflareOperationsPath =
  "docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function escaped(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertIncludes(source, fragment, label) {
  assert.match(source, new RegExp(escaped(fragment), "i"), label);
}

function changedFiles() {
  const committedDiff = execSync(
    "git diff --name-only origin/codex/comment-translator-free-public-beta-integration...HEAD",
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+/,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+/i,
    /authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+/i,
    /Bearer\s+[A-Za-z0-9_.-]{20,}/i,
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+/i,
    /BEGIN\s+PRIVATE\s+KEY/i,
    /cloudflare(?:_api)?_token\s*[:=]\s*["'][^"']+/i,
    /(?:cloudflare_)?(?:account|zone|rule)(?:_id| id)\s*[:=]\s*["'][^"']+/i,
    /owner(?:_id| id|UserId)\s*[:=]\s*["'](?!server-only-owner-value["'])[^"']+/i,
    /liveChatId\s*[:=]\s*["'][^"']+/i,
    /providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+/i,
    /rawComment(?:Text|s)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design)["'])[^"']+/i,
    /postgres(?:ql)?:\/\/[^\s'")]+/i,
    /support(?:_ticket| ticket| id)\s*[:=]\s*["'][^"']+/i
  ];

  for (const pattern of sensitivePatterns) {
    assert.doesNotMatch(source, pattern, `${label} has no sensitive match for ${pattern}`);
  }
}

for (const requiredPath of [
  plG6DocPath,
  plG5DocPath,
  taskBoardPath,
  operatorChecklistPath,
  cloudflareOperationsPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G6 preflight required path exists: ${requiredPath}`);
}

const plG6Doc = read(plG6DocPath);
const plG5Doc = read(plG5DocPath);
const taskBoard = read(taskBoardPath);
const operatorChecklist = read(operatorChecklistPath);
const cloudflareOperations = read(cloudflareOperationsPath);
const task = read(taskPath);
const combinedDocs = [
  plG6Doc,
  plG5Doc,
  taskBoard,
  operatorChecklist,
  cloudflareOperations,
  task
].join("\n");

for (const section of [
  "## Preflight Labels",
  "## Required Same-Thread Approval Surface",
  "## Execution Boundary",
  "## Public Capability Result",
  "## Operator Checks Still Required",
  "## Sanitized Evidence Shape",
  "## Non-Actions",
  "## Completion Verification"
]) {
  assert.match(plG6Doc, new RegExp(`^${escaped(section)}$`, "m"), `PL-G6 doc includes ${section}`);
}

for (const fragment of [
  "Status: PL-G6 public access change / promotion execution preflight prepared. Public-release capable: no.",
  "`pl_g6_public_access_change_preflight_status` | `complete`",
  "`pl_g6_public_access_change_preflight_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`",
  "`pl_g6_public_access_change_status` | `not-run-approval-gated`",
  "`public_release_capable` | `no`",
  "`release_owner_decision_status` | `blocked-no-approval`",
  "`release_owner_exact_approval_status` | `absent`",
  "`release_owner_missing_approval_scope` | `public-capability-risk-acceptance-and-remaining-operator-checks`",
  "`operator_remaining_external_verification_status` | `action-required`",
  "`operator_production_harness_block_status` | `action-required-before-production`",
  "`operator_production_api_managed_challenge_status` | `not-selected`",
  "`public_beta_access_gate_selected` | `login-only`",
  "`public_beta_waitlist_boundary` | `creator-paid-beta-only`",
  "`public_traffic_rate_limit_backing_selected` | `cloudflare-edge`",
  "`support_response_status` | `pending`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`new_public_db_object_review_status` | `required-before-work`",
  "I approve PL-G6 public access change / promotion preflight execution for the Free public beta integration line only.",
  "Keep public_release_capable=no unless this same-thread approval explicitly changes it after the listed checks are closed or accepted.",
  "Do not run Cloudflare mutation, deploy/upload, public gate flip, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, or main promotion from this preflight slice.",
  "PL-G6 execution remains blocked until exact same-thread approval names the operation, target boundary, allowed evidence shape, and non-actions.",
  "Evidence stays labels/counts/pass-fail/status only."
]) {
  assertIncludes(plG6Doc, fragment, `PL-G6 doc records ${fragment}`);
}

for (const fragment of [
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md",
  "pl_g6_public_access_change_preflight_status=complete",
  "pl_g6_public_access_change_status=not-run-approval-gated",
  "public_release_capable=no"
]) {
  assertIncludes(task, fragment, `task.md records ${fragment}`);
}

for (const fragment of [
  "`pl_g6_public_access_change_preflight_status` | `complete`",
  "`pl_g6_public_access_change_preflight_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`",
  "`pl_g6_public_access_change_status` | `not-run-approval-gated`",
  "`public_release_capable_status` | `no`"
]) {
  assertIncludes(taskBoard, fragment, `task board records ${fragment}`);
}

for (const fragment of [
  "PL-G6 public access change / promotion remains approval-gated and not-run.",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md"
]) {
  assertIncludes(plG5Doc, fragment, `PL-G5 doc links PL-G6 preflight ${fragment}`);
}

for (const fragment of [
  "operator_remaining_external_verification_status` | `action-required`",
  "operator_production_harness_block_status` | `action-required-before-production`"
]) {
  assertIncludes(operatorChecklist, fragment, `operator checklist keeps ${fragment}`);
}

assertIncludes(
  cloudflareOperations,
  "Production route/API harness exposure must be blocked or removed before production exposure.",
  "Cloudflare operations keeps production harness boundary"
);

assert.doesNotMatch(combinedDocs, /public_release_capable(?:_status)?[=|]\s*`?yes`?/i);
assert.doesNotMatch(combinedDocs, /pl_g6_public_access_change_status[=|]\s*`?(?:configured|complete|completed|done|run)`?/i);
assert.doesNotMatch(combinedDocs, /public_gate_flip_status[=|]\s*`?(?:configured|complete|completed|done|run)`?/i);
assert.doesNotMatch(combinedDocs, /main_promotion_status[=|]\s*`?(?:configured|complete|completed|done|run)`?/i);

for (const [label, source] of [
  [plG6DocPath, plG6Doc],
  [plG5DocPath, plG5Doc],
  [taskBoardPath, taskBoard],
  [operatorChecklistPath, operatorChecklist],
  [cloudflareOperationsPath, cloudflareOperations],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG6DocPath,
  plG5DocPath,
  taskBoardPath,
  operatorChecklistPath,
  taskPath,
  "scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G6 preflight change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log(
  "comment translator Free beta PL-G6 public access change preflight contract checks passed"
);
