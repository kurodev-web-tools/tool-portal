import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const operationsDocPath = "docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md";
const taskPath = "task.md";
const taskBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const checklistPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md";
const rateLimitDecisionPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_TRAFFIC_RATE_LIMIT_BACKING_DECISION.md";
const plG6PreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function isAncestor(ancestor, descendant) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: root,
      stdio: "ignore"
    });
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.status === 1) return false;
    throw error;
  }
}

function selectCommittedDiffBase(integrationIsPromoted, branchContainsMain, integrationDiffBase) {
  return integrationIsPromoted && branchContainsMain ? "origin/main" : integrationDiffBase;
}

function mergeInProgressIncludesMain() {
  try {
    return execSync("git rev-parse --verify MERGE_HEAD", { cwd: root, encoding: "utf8" }).trim()
      === execSync("git rev-parse origin/main", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return false;
  }
}

function contractScopedChangedFiles(files, isCommentTranslatorBranch) {
  if (isCommentTranslatorBranch) return files;
  return files.filter((file) => {
    const normalizedFile = file.toLowerCase();
    return file === taskPath
      || normalizedFile.includes("comment-translator")
      || normalizedFile.includes("comment_translator")
      || file === "scripts/viewer-engagement-prompt-board-governance-contract.mjs";
  });
}

function changedFiles() {
  const integrationDiffBase = "origin/codex/comment-translator-free-public-beta-integration";
  assert.equal(
    selectCommittedDiffBase(false, true, integrationDiffBase),
    integrationDiffBase,
    "a pre-promotion integration branch retains the integration diff base"
  );
  assert.equal(
    selectCommittedDiffBase(true, false, integrationDiffBase),
    integrationDiffBase,
    "a branch not containing promoted main retains the integration diff base"
  );
  assert.equal(
    selectCommittedDiffBase(true, true, integrationDiffBase),
    "origin/main",
    "a post-promotion branch based on main uses the main diff base"
  );
  const integrationIsPromoted = isAncestor(integrationDiffBase, "origin/main");
  const branchContainsMain = isAncestor("origin/main", "HEAD") || mergeInProgressIncludesMain();
  const committedDiffBase = selectCommittedDiffBase(
    integrationIsPromoted,
    branchContainsMain,
    integrationDiffBase
  );
  const committedDiff = execSync(
    `git diff --name-only ${committedDiffBase}...HEAD`,
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
  const stagedDiff = execSync("git diff --cached --name-only HEAD", {
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

  return [...new Set([...committedDiff, ...stagedDiff, ...uncommittedDiff, ...untracked])].map((file) =>
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
  operationsDocPath,
  taskPath,
  taskBoardPath,
  checklistPath,
  rateLimitDecisionPath,
  plG6PreflightPath
]) {
  assert.ok(exists(requiredPath), `required Cloudflare custom-rule operations path exists: ${requiredPath}`);
}

const operationsDoc = read(operationsDocPath);
const task = read(taskPath);
const taskBoard = read(taskBoardPath);
const checklist = read(checklistPath);
const rateLimitDecision = read(rateLimitDecisionPath);
const plG6Preflight = read(plG6PreflightPath);
const combinedDocs = [
  operationsDoc,
  task,
  taskBoard,
  checklist,
  rateLimitDecision,
  plG6Preflight
].join("\n");

for (const section of [
  "## Current Labels",
  "## Operating Principles",
  "## Phase Guidance",
  "### Preview Period",
  "### Free Public Launch Period",
  "### Creator/Paid Launch Transition",
  "### Traffic Growth Response",
  "## API And HTML Boundary",
  "## Release Operator Checks",
  "## Non-Actions",
  "## Verification Boundary"
]) {
  assert.match(operationsDoc, new RegExp(`^${escaped(section)}$`, "m"), `operations doc includes ${section}`);
}

for (const fragment of [
  "`cloudflare_custom_rule_operations_doc_status` | `complete`",
  "`operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge`",
  "`operator_production_api_managed_challenge_status` | `not-selected`",
  "`operator_production_harness_block_status` | `pass-production-404`",
  "`cloudflare_free_rate_limiting_slot_status` | `occupied-leaked-credential-protection`",
  "`edge_rate_limiting_disposition` | `deferred-existing-free-slot-reserved-for-leaked-credential-protection`",
  "`edge_activation_status` | `deferred-not-required-for-free-public-beta`",
  "`edge_protection_readiness_status` | `pass-with-optional-edge-control-deferred`",
  "`app_enforcement_authority` | `durable-quotas-session-caps-rate-guards`",
  "`comment_translator_edge_rate_limiting_reference` | `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING`",
  "`comment_translator_edge_rate_limiting_runtime_role` | `control-reference-label-not-parsed-behavior-flag`",
  "`free_public_launch_default` | `login-turnstile-app-quotas-no-constant-ordinary-route-challenge`",
  "`api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only`",
  "`turnstile_pre_clearance_status` | `later-improvement-not-free-launch-requirement`",
  "`managed_challenge_passage_guidance` | `about-45-minutes-if-html-managed-challenge-is-used`",
  "`paid_creator_boundary_authority` | `app-side-entitlement-session-usage-quota-not-cloudflare-clearance`",
  "`traffic_growth_response_ladder_status` | `documented`",
  "`public_release_capable_status` | `yes`",
  "Free public beta access is `login-only`",
  "YouTube connection alone must not start monitoring, polling, translation, target lookup, or quota consumption.",
  "Start is the first provider-affecting action.",
  "Normal Free public launch should not challenge every ordinary route constantly.",
  "Production route/API harness remains blocked with HTTP 404.",
  "API Managed Challenge can break fetch, heartbeat, credential-status, OAuth, and server-action-like traffic",
  "Cloudflare Rate Limiting Rules are preferred for API load shedding when available.",
  "Managed Challenge is reserved for HTML route protection, targeted suspicious traffic, or temporary emergency response.",
  "Do not tie Cloudflare clearance duration to Free plan duration.",
  "Do not make Cloudflare clearance, Challenge Passage, or Managed Challenge success the plan boundary.",
  "session starts",
  "session heartbeat volume",
  "credential-status request spikes",
  "Start failures per user",
  "login and signup attempts",
  "durable session/usage fail-closed counts",
  "provider quota stops",
  "global budget stops",
  "AI budget stops",
  "Azure Translator usage",
  "Supabase Auth failures",
  "Cloudflare Security Events",
  "Tune app-side Start, heartbeat, credential-status, session, and quota guards.",
  "Add or tune Cloudflare Rate Limiting Rules for API load shedding when available.",
  "Use temporary emergency Managed Challenge or access controls only when targeted controls are not enough.",
  "app-side durable quotas, session caps, and rate guards",
  "Cloudflare Rate Limiting Rules for load shedding when available",
  "Managed Challenge only for emergency, temporary response or HTML routes",
  "production API Managed Challenge remains `not-selected`",
  "Challenge Passage, if changed, is not used as an entitlement or plan-duration boundary",
  "This guide is verified by `node scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs`"
]) {
  assertIncludes(operationsDoc, fragment, `operations doc records ${fragment}`);
}

for (const [label, source] of [
  [taskPath, task],
  [taskBoardPath, taskBoard],
  [checklistPath, checklist],
  [rateLimitDecisionPath, rateLimitDecision],
  [plG6PreflightPath, plG6Preflight]
]) {
  assertIncludes(
    source,
    "docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md",
    `${label} links the Cloudflare custom-rule operations doc`
  );
}

for (const fragment of [
  "cloudflare_custom_rule_operations_doc_status=complete",
  "free_public_launch_default=login-turnstile-app-quotas-no-constant-ordinary-route-challenge",
  "api_protection_preference_order=app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only",
  "turnstile_pre_clearance_status=later-improvement-not-free-launch-requirement",
  "traffic_growth_response_ladder_status=documented",
  "`Cloudflare custom-rule operations doc`",
  "COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md"
]) {
  assertIncludes(task, fragment, `task.md records ${fragment}`);
}

for (const fragment of [
  "`cloudflare_custom_rule_operations_doc_status` | `complete`",
  "`free_public_launch_default` | `login-turnstile-app-quotas-no-constant-ordinary-route-challenge`",
  "`api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only`",
  "`traffic_growth_response_ladder_status` | `documented`",
  "`Cloudflare custom-rule operations doc`",
  "Cloudflare custom-rule operations: complete for docs/contract guidance only."
]) {
  assertIncludes(taskBoard, fragment, `task board records ${fragment}`);
}

for (const fragment of [
  "`cloudflare_custom_rule_operations_doc_status` | `complete`",
  "`api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only`",
  "Production should not use API Managed Challenge as the default API protection",
  "Preferred API protection order is app-side durable quotas/session caps/rate guards"
]) {
  assertIncludes(checklist, fragment, `operator checklist records ${fragment}`);
}

assert.match(operationsDoc, /`public_release_capable_status` \| `yes`/);
assert.doesNotMatch(combinedDocs, /operator_production_api_managed_challenge_status[=|]\s*`?(?:selected|enabled|complete|completed)`?/i);
assert.doesNotMatch(combinedDocs, /edge_activation_status[=|]\s*`?(?:configured|complete|completed|done)`?/i);
assert.doesNotMatch(combinedDocs, /live_provider_execution_status[=|]\s*`?(?:configured|complete|completed|done)`?/i);
assertIncludes(
  combinedDocs,
  "public_gate_flip_status` | `complete-release-declaration-no-mutation`",
  "release declaration completes without a Cloudflare mutation"
);
assert.doesNotMatch(combinedDocs, /paid entitlement runtime: complete|paid_entitlement_runtime_status[=|]\s*`?(?:complete|completed|enabled)`?/i);

for (const [label, source] of [
  [operationsDocPath, operationsDoc],
  [taskPath, task],
  [taskBoardPath, taskBoard],
  [checklistPath, checklist],
  [rateLimitDecisionPath, rateLimitDecision],
  [plG6PreflightPath, plG6Preflight]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  operationsDocPath,
  taskPath,
  taskBoardPath,
  checklistPath,
  rateLimitDecisionPath,
  "docs/active/COMMENT_TRANSLATOR_GOOGLE_OAUTH_REVIEW_RESPONSE_PACKET.md",
  "lib/comment-translator-public-traffic-rate-limit-backing-policy.ts",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md",
  plG6PreflightPath,
  "app/api/comment-translator/free-beta/route-api-harness/route.ts",
  "scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2a-server-action-route-api-harness-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-monthly-input-character-accounting-contract.mjs",
  "scripts/comment-translator-oauth-public-info-page-contract.mjs",
  "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
  "scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/viewer-engagement-prompt-board-governance-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md"
]);

const isCommentTranslatorBranch = execSync("git branch --show-current", { cwd: root, encoding: "utf8" })
  .trim()
  .includes("comment-translator");
assert.deepEqual(
  contractScopedChangedFiles(["app/tools/viewer-engagement-prompt-board/page.tsx", taskBoardPath, taskPath], false),
  [taskBoardPath, taskPath],
  "cross-feature promotion scopes the contract allowlist to Comment Translator authority"
);

for (const file of contractScopedChangedFiles(changedFiles(), isCommentTranslatorBranch)) {
  assert.ok(allowedChangedFiles.has(file), `Cloudflare custom-rule operations change stays in allowed files: ${file}`);
  if (file.endsWith(".mjs")) continue;
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log(
  "comment translator Cloudflare custom-rule operations contract passed (doc=complete, api_managed_challenge=not-selected, public_release_capable=yes, secret_scan=pass)"
);
