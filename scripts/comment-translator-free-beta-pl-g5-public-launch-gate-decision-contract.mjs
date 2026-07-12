import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG5DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md";
const plG6DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md";
const taskBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const operatorChecklistPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md";
const trafficBackingPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_TRAFFIC_RATE_LIMIT_BACKING_DECISION.md";
const cloudflareOperationsPath = "docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md";
const supabaseRiskAcceptancePath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_RISK_ACCEPTANCE.md";
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
  plG5DocPath,
  plG6DocPath,
  "app/api/comment-translator/free-beta/route-api-harness/route.ts",
  operatorChecklistPath,
  taskBoardPath,
  operatorChecklistPath,
  trafficBackingPath,
  cloudflareOperationsPath,
  supabaseRiskAcceptancePath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G5 required path exists: ${requiredPath}`);
}

const plG5Doc = read(plG5DocPath);
const plG6Doc = read(plG6DocPath);
const taskBoard = read(taskBoardPath);
const operatorChecklist = read(operatorChecklistPath);
const trafficBacking = read(trafficBackingPath);
const cloudflareOperations = read(cloudflareOperationsPath);
const supabaseRiskAcceptance = read(supabaseRiskAcceptancePath);
const task = read(taskPath);
const combinedDocs = [
  plG5Doc,
  plG6Doc,
  taskBoard,
  operatorChecklist,
  trafficBacking,
  cloudflareOperations,
  supabaseRiskAcceptance,
  task
].join("\n");

for (const section of [
  "## Decision Labels",
  "## Decision Inputs",
  "## What PL-G5 Can Decide",
  "## What PL-G5 Cannot Decide",
  "## Accepted Residual Risks",
  "## Missing Approval For Public Capability",
  "## Blocking Labels Before Public Capability",
  "## Operator Checks Still Required",
  "## PL-G6 Boundary",
  "## Post-PR 637 Promotion Decision",
  "## Sanitized Evidence Shape",
  "## Completion Verification"
]) {
  assert.match(plG5Doc, new RegExp(`^${escaped(section)}$`, "m"), `PL-G5 doc includes ${section}`);
}

for (const fragment of [
  "Status: PL-G5 release-owner public launch decision recorded. Public-release capable: no.",
  "Current execution result: release-owner-decision=accepted-promotion-readiness-only / public_release_capable=no.",
  "`pl_g5_release_owner_decision_preflight_doc_status` | `complete`",
  "`pl_g5_release_owner_decision_record_status` | `complete`",
  "`pl_g5_release_owner_decision_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md`",
  "`release_owner_decision_status` | `accepted-promotion-readiness-only`",
  "`release_owner_missing_approval_scope` | `promotion-operation-and-post-deploy-verification`",
  "`release_owner_exact_approval_status` | `present-promotion-readiness-only`",
  "`public_release_capable` | `no`",
  "`support_response_status` | `pending`",
  "`remote_default_privileges_status` | `fail-accepted-risk`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`current_table_rls_grant_status` | `pass-not-accepted-as-drift`",
  "`new_public_db_object_review_status` | `required-before-work`",
  "`public_beta_access_gate_selected` | `login-only`",
  "`public_beta_waitlist_boundary` | `creator-paid-beta-only`",
  "`public_traffic_rate_limit_backing_selected` | `cloudflare-edge`",
  "`cloudflare_custom_rule_operations_doc_status` | `complete`",
  "`operator_external_verification_status` | `partial-pass-preview-browser`",
  "`operator_remaining_external_verification_status` | `action-required`",
  "`operator_production_api_managed_challenge_status` | `not-selected`",
  "`operator_production_harness_block_status` | `action-required-before-production`",
  "`pl_g6_public_access_change_status` | `not-run-approval-gated`",
  "Supabase Support response remains pending; no support follow-up was run in this slice.",
  "Future `public` object default-privileges risk is accepted for PL-G5 evaluation only.",
  "Existing current-table/RLS/current-grant pass posture is not accepted as drift.",
  "No new `public` database object work may proceed without explicit object-level grant/RLS/default-privileges review.",
  "The current source-thread approval is approval to start this PL-G5 decision slice only.",
  "To change `public_release_capable` to `yes`, a later same-thread release-owner approval must explicitly accept or close all of these surfaces:",
  "PL-G5 can record the current release-owner decision surface.",
  "PL-G5 cannot flip the public gate, change public access, deploy/upload, promote to `main`, mutate Cloudflare, mutate Supabase, run live/provider flows, run OAuth live flows, run Google target lookup, run Stripe live actions, implement paid entitlement runtime, or add OBS overlay route/token runtime.",
  "Cloudflare custom-rule operations doc from PR #624 is the operational reference.",
  "Production API Managed Challenge remains `not-selected`.",
  "Production route/API harness blocking/removal remains `action-required-before-production`.",
  "PL-G6 public access change / promotion remains approval-gated and not-run.",
  "`post_pr_637_runtime_status` | `implemented-not-activated`",
  "`integration_to_main_promotion_readiness_status` | `ready-after-exact-approvals`",
  "Promotion to `main` must not set the login-only activation control and must not flip the public gate.",
  "I accept the PL-G5 residual risk limited to future public-object default privileges",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md",
  "counts/status/pass-fail labels only",
  "UI/browser width QA skipped because this slice changes only docs, deterministic contracts, and `task.md`."
]) {
  assertIncludes(plG5Doc, fragment, `PL-G5 doc records ${fragment}`);
}

for (const fragment of [
  "`pl_g5_release_owner_decision_preflight_doc_status` | `complete`",
  "`pl_g5_release_owner_decision_record_status` | `complete`",
  "`pl_g5_release_owner_decision_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md`",
  "`release_owner_decision_status` | `accepted-promotion-readiness-only`",
  "`release_owner_missing_approval_scope` | `promotion-operation-and-post-deploy-verification`",
  "`release_owner_exact_approval_status` | `present-promotion-readiness-only`",
  "`public_release_capable_status` | `no`"
]) {
  assertIncludes(taskBoard, fragment, `task board records ${fragment}`);
}

for (const fragment of [
  "codex/comment-translator-pl-g5-release-owner-decision",
  "pl_g5_release_owner_decision_preflight_doc_status=complete",
  "pl_g5_release_owner_decision_record_status=complete",
  "pl_g5_release_owner_decision_doc=docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md",
  "release_owner_decision_status=blocked-no-approval",
  "release-owner-decision=blocked-no-approval",
  "release_owner_missing_approval_scope=public-capability-risk-acceptance-and-remaining-operator-checks",
  "release_owner_exact_approval_status=absent",
  "public_release_capable=no",
  "support_response_status=pending",
  "remote_default_privileges_status=fail-accepted-risk",
  "risk_acceptance_scope=future-public-object-default-privileges-only",
  "operator_external_verification_status=partial-pass-preview-browser",
  "operator_remaining_external_verification_status=action-required",
  "operator_production_api_managed_challenge_status=not-selected",
  "operator_production_harness_block_status=action-required-before-production",
  "pl_g6_public_access_change_status=not-run-approval-gated",
  "pl_g6_public_access_change_preflight_status=complete",
  "pl_g6_public_access_change_preflight_doc=docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md",
  "COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md",
  "UI/browser width QA skipped"
]) {
  assertIncludes(task, fragment, `task.md records ${fragment}`);
}

for (const [label, source, fragment] of [
  [
    operatorChecklistPath,
    operatorChecklist,
    "`operator_external_verification_status` | `partial-pass-preview-and-production-private-launch-browser`"
  ],
  [trafficBackingPath, trafficBacking, "`public_traffic_rate_limit_backing_selected` | `cloudflare-edge`"],
  [
    cloudflareOperationsPath,
    cloudflareOperations,
    "`operator_production_api_managed_challenge_status` | `not-selected`"
  ],
  [
    supabaseRiskAcceptancePath,
    supabaseRiskAcceptance,
    "`risk_acceptance_scope` | `future-public-object-default-privileges-only`"
  ]
]) {
  assertIncludes(source, fragment, `${label} keeps related launch surface marker`);
}

assert.doesNotMatch(combinedDocs, /public_release_capable(?:_status)?[=|]\s*`?yes`?/i);
assert.doesNotMatch(combinedDocs, /release_owner_decision_status[=|]\s*`?(?:approved|complete|completed|yes)`?/i);
assert.doesNotMatch(combinedDocs, /public_gate_flip_status[=|]\s*`?(?:configured|complete|completed|done|run)`?/i);
assert.doesNotMatch(combinedDocs, /pl_g6_public_access_change_status[=|]\s*`?(?:configured|complete|completed|done|run)`?/i);
assert.doesNotMatch(combinedDocs, /operator_production_api_managed_challenge_status[=|]\s*`?(?:selected|enabled|complete|completed)`?/i);
assert.doesNotMatch(combinedDocs, /operator_production_harness_block_status[=|]\s*`?(?:complete|completed|done|not-required)`?/i);

for (const [label, source] of [
  [plG5DocPath, plG5Doc],
  [plG6DocPath, plG6Doc],
  [taskBoardPath, taskBoard],
  [operatorChecklistPath, operatorChecklist],
  [trafficBackingPath, trafficBacking],
  [cloudflareOperationsPath, cloudflareOperations],
  [supabaseRiskAcceptancePath, supabaseRiskAcceptance],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG5DocPath,
  plG6DocPath,
  "app/api/comment-translator/free-beta/route-api-harness/route.ts",
  operatorChecklistPath,
  taskBoardPath,
  taskPath,
  "scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G5 release-owner decision record change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log(
  "comment translator Free beta PL-G5 release-owner decision record contract checks passed"
);
