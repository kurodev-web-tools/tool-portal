import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// allow: SIZE_OK - public launch QA contract intentionally keeps marker tables colocated.
const root = process.cwd();
const checklistPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md";
const taskBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const taskPath = "task.md";
const rateLimitDecisionPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_TRAFFIC_RATE_LIMIT_BACKING_DECISION.md";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
const operationsDocPath = "docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md";
const plG6PreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const usageDisplayPath = "lib/comment-translator-free-beta-usage-display.ts";
const abuseRuntimePath = "lib/comment-translator-abuse-rate-limit-runtime.ts";
const publicAccessPolicyPath = "lib/comment-translator-public-beta-access-gate-policy.ts";
const azureRuntimeContractPath = "scripts/comment-translator-azure-normal-translation-execution-contract.mjs";
const monthlyContractPath = "scripts/comment-translator-monthly-input-character-accounting-contract.mjs";
const publicAccessContractPath = "scripts/comment-translator-public-beta-access-gate-decision-contract.mjs";

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

function escaped(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertIncludes(source, fragment, label) {
  assert.match(source, new RegExp(escaped(fragment), "i"), label);
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
    /zone(?:_id| id)\s*[:=]\s*["'][^"']+/i,
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
  checklistPath,
  taskBoardPath,
  taskPath,
  rateLimitDecisionPath,
  requirementsPath,
  operationsDocPath,
  plG6PreflightPath,
  sessionRuntimePath,
  usageDisplayPath,
  abuseRuntimePath,
  publicAccessPolicyPath,
  azureRuntimeContractPath,
  monthlyContractPath,
  publicAccessContractPath
]) {
  assert.ok(exists(requiredPath), `required public launch QA checklist path exists: ${requiredPath}`);
}

const checklist = read(checklistPath);
const taskBoard = read(taskBoardPath);
const task = read(taskPath);
const rateLimitDecision = read(rateLimitDecisionPath);
const requirements = read(requirementsPath);
const operationsDoc = read(operationsDocPath);
const plG6Preflight = read(plG6PreflightPath);
const sessionRuntime = read(sessionRuntimePath);
const usageDisplay = read(usageDisplayPath);
const abuseRuntime = read(abuseRuntimePath);
const publicAccessPolicy = read(publicAccessPolicyPath);
const azureRuntimeContract = read(azureRuntimeContractPath);
const monthlyContract = read(monthlyContractPath);
const publicAccessContract = read(publicAccessContractPath);
const combinedDocs = [
  checklist,
  taskBoard,
  task,
  rateLimitDecision,
  requirements,
  operationsDoc,
  plG6Preflight
].join("\n");

for (const section of [
  "## Current Decision Labels",
  "## Operator Update 2026-07-09",
  "## User-Owned External Checks",
  "### Cloudflare Edge Rate-Limit Check",
  "### Browser Smoke Check",
  "### Limit Behavior Checks",
  "## Codex-Owned Local Checks",
  "## Completion Labels"
]) {
  assert.match(checklist, new RegExp(`^${escaped(section)}$`, "m"), `checklist includes ${section}`);
}

for (const fragment of [
  "`operator_cloudflare_edge_rate_limit_activation_status`",
  "`operator_cloudflare_env_reference_status`",
  "`operator_external_verification_status` | `partial-pass-preview-browser`",
  "`operator_remaining_external_verification_status` | `action-required`",
  "`operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge`",
  "`operator_cloudflare_preview_rule_scope` | `preview-host-translator-integrations-comment-translator-api-route-classes`",
  "`operator_cloudflare_env_reference_status` | `present-enabled-label`",
  "`operator_free_beta_login_browser_smoke_status`",
  "`operator_free_beta_login_browser_smoke_status` | `pass-preview-browser`",
  "`operator_waitlist_boundary_browser_smoke_status`",
  "`operator_waitlist_boundary_browser_smoke_status` | `pass-preview-browser`",
  "`operator_youtube_connect_no_autostart_smoke_status`",
  "`operator_youtube_connect_no_autostart_smoke_status` | `pass-preview-browser`",
  "`operator_production_api_managed_challenge_status` | `not-selected`",
  "`operator_production_harness_block_status` | `action-required-before-production`",
  "`cloudflare_custom_rule_operations_doc_status` | `complete`",
  "`cloudflare_custom_rule_operations_doc` | `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`",
  "`api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only`",
  "`pl_g6_public_access_change_preflight_status` | `complete`",
  "`pl_g6_public_access_change_status` | `not-run-approval-gated`",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md",
  "`operator_start_to_translation_smoke_status`",
  "`operator_burst_comment_smoke_status`",
  "`operator_session_30_min_smoke_status`",
  "`operator_monthly_20000_character_limit_smoke_status`",
  "`COMMENT_TRANSLATOR_EDGE_RATE_LIMITING`",
  "`codex_public_traffic_rate_limit_contract_status`",
  "`codex_session_30_min_contract_status`",
  "`codex_per_minute_message_cap_contract_status`",
  "`codex_monthly_20000_input_character_contract_status`",
  "`codex_public_access_policy_contract_status`",
  "do not start with one person manually typing 30 comments into production",
  "fake-clock or server-fixture coverage is the primary proof",
  "do not consume real monthly quota just to prove the cap",
  "Operational guidance for Free public launch, Creator/Paid transition, traffic-growth response, and API-vs-HTML boundaries is centralized in `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`.",
  "Preferred API protection order is app-side durable quotas/session caps/rate guards",
  "public_launch_operator_qa_checklist_status=complete",
  "cloudflare_custom_rule_operations_doc_status=complete",
  "operator_external_verification_status=partial-pass-preview-browser",
  "operator_remaining_external_verification_status=action-required",
  "public_release_capable_status=no"
]) {
  assertIncludes(checklist, fragment, `checklist records ${fragment}`);
}

for (const fragment of [
  "`public_launch_operator_qa_checklist_status` | `complete`",
  "`operator_external_verification_status` | `partial-pass-preview-browser`",
  "`operator_remaining_external_verification_status` | `action-required`",
  "`operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge`",
  "`operator_cloudflare_env_reference_status` | `present-enabled-label`",
  "`operator_free_beta_login_browser_smoke_status` | `pass-preview-browser`",
  "`operator_waitlist_boundary_browser_smoke_status` | `pass-preview-browser`",
  "`operator_youtube_connect_no_autostart_smoke_status` | `pass-preview-browser`",
  "`operator_production_api_managed_challenge_status` | `not-selected`",
  "`operator_production_harness_block_status` | `action-required-before-production`",
  "`cloudflare_custom_rule_operations_doc_status` | `complete`",
  "`cloudflare_custom_rule_operations_doc` | `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`",
  "`free_public_launch_default` | `login-turnstile-app-quotas-no-constant-ordinary-route-challenge`",
  "`api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only`",
  "`traffic_growth_response_ladder_status` | `documented`",
  "`codex_local_verification_status` | `pass`",
  "`Public launch operator QA checklist`",
  "`Cloudflare custom-rule operations doc`",
  "preview Cloudflare/browser checks are partially passed by operator report",
  "not-run / approval-gated"
]) {
  assertIncludes(taskBoard, fragment, `task board records ${fragment}`);
}

for (const fragment of [
  "Current branch: `codex/comment-translator-pl-g6-execution-readiness`",
  "public_launch_operator_qa_checklist_status=complete",
  "operator_external_verification_status=partial-pass-preview-browser",
  "operator_remaining_external_verification_status=action-required",
  "operator_cloudflare_preview_custom_rule_status=configured-preview-only-managed-challenge",
  "operator_cloudflare_env_reference_status=present-enabled-label",
  "operator_free_beta_login_browser_smoke_status=pass-preview-browser",
  "operator_waitlist_boundary_browser_smoke_status=pass-preview-browser",
  "operator_youtube_connect_no_autostart_smoke_status=pass-preview-browser",
  "operator_production_api_managed_challenge_status=not-selected",
  "operator_production_harness_block_status=action-required-before-production",
  "cloudflare_custom_rule_operations_doc_status=complete",
  "cloudflare_custom_rule_operations_doc=docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md",
  "free_public_launch_default=login-turnstile-app-quotas-no-constant-ordinary-route-challenge",
  "api_protection_preference_order=app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only",
  "turnstile_pre_clearance_status=later-improvement-not-free-launch-requirement",
  "traffic_growth_response_ladder_status=documented",
  "codex_local_verification_status=pass",
  "Public launch operator QA checklist",
  "preview Managed Challenge setup",
  "safe `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` presence",
  "optional 30 translated messages/min smoke",
  "optional 30-minute session smoke",
  "monthly 20,000 provider-input-character fixture/live proof",
  "COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md",
  "Remaining public launch operator external checks remain action-required",
  "COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md"
]) {
  assertIncludes(task, fragment, `task.md records ${fragment}`);
}

assert.match(
  rateLimitDecision,
  /public_traffic_rate_limit_backing_selected`\s*\|\s*`cloudflare-edge`/,
  "rate-limit decision keeps Cloudflare edge selected"
);
assert.match(
  abuseRuntime,
  /edgeControlReference:\s*"COMMENT_TRANSLATOR_EDGE_RATE_LIMITING"/,
  "abuse runtime keeps the edge control reference"
);
assert.match(
  sessionRuntime,
  /sessionMinutes:\s*30[\s\S]*translatedMessagesPerMinute:\s*30[\s\S]*monthlyProviderInputCharacters:\s*20_000/,
  "session runtime contract keeps Free session, per-minute, and monthly caps"
);
assert.match(
  usageDisplay,
  /translatedMessagesInCurrentMinute\s*>=\s*usage\.planEntitlement\.translatedMessagesPerMinute[\s\S]*monthlyUsed\s*>=\s*monthlyLimit/,
  "usage display blocks per-minute and monthly over-limit states before provider use"
);
assert.match(
  azureRuntimeContract,
  /translatedMessagesInCurrentMinute:\s*usage\.planEntitlement\.translatedMessagesPerMinute[\s\S]*status,\s*"over-limit"/,
  "provider execution contract covers per-minute cap over-limit before provider execution"
);
assert.match(
  monthlyContract,
  /monthlyProviderInputCharacterLimit,\s*20_000[\s\S]*monthlyProviderInputCharacterEstimate:\s*20_000 - providerInputCharacterEstimate \+ 1[\s\S]*pre-provider monthly input character cap blocks provider execution/,
  "monthly input contract covers 20,000 provider-input-character over-limit behavior"
);
assert.match(
  publicAccessPolicy,
  /selectedGate:\s*"login-only"/,
  "public access policy keeps Free public beta login-only"
);
assert.match(requirements, /30 translated messages\/min/, "requirements keep public per-minute limit");
assert.match(requirements, /30 min\/session/, "requirements keep public session limit");

assert.doesNotMatch(combinedDocs, /public_release_capable(?:_status)?[=|]\s*`?yes`?/i);
assert.doesNotMatch(combinedDocs, /edge_activation_status[=|]\s*`?(?:configured|complete|completed|done)`?/i);
assert.doesNotMatch(combinedDocs, /live_provider_execution_status[=|]\s*`?(?:configured|complete|completed|done)`?/i);
assert.doesNotMatch(combinedDocs, /public_gate_flip_status[=|]\s*`?(?:configured|complete|completed|done)`?/i);

for (const [label, source] of [
  [checklistPath, checklist],
  [taskBoardPath, taskBoard],
  [taskPath, task],
  [rateLimitDecisionPath, rateLimitDecision],
  [requirementsPath, requirements],
  [operationsDocPath, operationsDoc],
  [plG6PreflightPath, plG6Preflight]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  checklistPath,
  taskBoardPath,
  taskPath,
  rateLimitDecisionPath,
  operationsDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md",
  plG6PreflightPath,
  "scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `operator QA checklist change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log(
  "comment translator public launch operator QA checklist contract passed (operator_external_verification=partial-pass-preview-browser, public_release_capable=no, secret_scan=pass)"
);
