import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
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
const routeHarnessPath = "app/api/comment-translator/free-beta/route-api-harness/route.ts";

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
  const branchContainsMain = isAncestor("origin/main", "HEAD");
  const committedDiffBase = selectCommittedDiffBase(
    integrationIsPromoted,
    branchContainsMain,
    integrationDiffBase
  );
  const committedDiff = execSync(
    `git diff --name-only ${committedDiffBase}...HEAD`,
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
  taskPath,
  routeHarnessPath
]) {
  assert.ok(exists(requiredPath), `PL-G6 preflight required path exists: ${requiredPath}`);
}

const plG6Doc = read(plG6DocPath);
const plG5Doc = read(plG5DocPath);
const taskBoard = read(taskBoardPath);
const operatorChecklist = read(operatorChecklistPath);
const cloudflareOperations = read(cloudflareOperationsPath);
const task = read(taskPath);
const routeHarness = read(routeHarnessPath);
const combinedDocs = [
  plG6Doc,
  plG5Doc,
  taskBoard,
  operatorChecklist,
  cloudflareOperations,
  task,
  routeHarness
].join("\n");

for (const section of [
  "## Preflight Labels",
  "## Required Same-Thread Approval Surface",
  "## Completed Login-Only Runtime Activation And Later Final Public Release Declaration",
  "## Final Public Gate Definition",
  "## Completed Integration-To-Main Promotion Sequence",
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
  "Status: promotion, main-connected production deployment, login-only runtime activation, and 11/11 post-activation browser verification are complete. Final public release declaration remains blocked. Public-release capable: no.",
  "PL-G6C production/main-domain env readiness is confirmed by operator-provided labels, and production/main-domain private-launch-only smoke is pass by operator-provided browser evidence.",
  "`pl_g6_public_access_change_preflight_status` | `complete`",
  "`pl_g6_public_access_change_preflight_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`",
  "`pl_g6_public_access_change_status` | `not-run-approval-gated`",
  "`public_release_capable` | `no`",
  "`deploy_upload_status` | `complete-main-connected-and-activation-deployments`",
  "`deploy_upload_evidence_source` | `operator-provided`",
  "`preview_deployment_target` | `cloudflare-preview-domain`",
  "`preview_deployment_status` | `deployed-operator-provided`",
  "`production_env_apply_status` | `applied-login-only-runtime`",
  "`production_main_domain_smoke_status` | `pass-post-activation-browser-11-of-11`",
  "`pl_g6c_production_main_domain_env_readiness_status` | `complete`",
  "`pl_g6c_production_env_operator_action_status` | `complete-for-login-only-activation`",
  "`pl_g6c_production_env_apply_readiness_confirmation_approval_status` | `present`",
  "`pl_g6c_production_env_apply_readiness_confirmation_status` | `recorded-no-mutation`",
  "`pl_g6c_production_smoke_approval_status` | `present`",
  "`operator_start_to_translation_smoke_status` | `pass-production-main-domain-private-launch`",
  "`live_provider_execution_status` | `pass-operator-provided-private-launch-smoke`",
  "`release_owner_decision_status` | `accepted-promotion-readiness-only`",
  "`release_owner_exact_approval_status` | `present-promotion-readiness-only`",
  "`release_owner_missing_approval_scope` | `promotion-operation-and-post-deploy-verification`",
  "`operator_remaining_external_verification_status` | `action-required-google-edge-final-smoke`",
  "`operator_production_harness_block_status` | `pass-production-404`",
  "`operator_production_api_managed_challenge_status` | `not-selected`",
  "`google_auth_verification_status` | `submitted-pending`",
  "`final_public_gate_target` | `free-public-beta-release-declaration`",
  "`final_public_gate_mutation_target` | `none`",
  "`login_only_runtime_binding_action` | `unchanged`",
  "`edge_protection_operation_boundary` | `separate-approval-if-activation-required`",
  "`public_beta_access_gate_selected` | `login-only`",
  "`public_beta_waitlist_boundary` | `creator-paid-beta-only`",
  "`login_only_runtime_activation_preflight_status` | `pass`",
  "`login_only_runtime_activation_target` | `cloudflare-production-worker-runtime`",
  "`login_only_runtime_activation_approval_status` | `present-separate-production-deployment`",
  "`login_only_runtime_activation_apply_status` | `complete`",
  "`public_traffic_rate_limit_backing_selected` | `cloudflare-edge`",
  "`pl_g6_first_operational_target` | `production-route-api-harness-block-removal`",
  "`pl_g6_first_operational_target_status` | `complete-repository-side-not-deployed`",
  "`pl_g6_first_operational_target_approval_status` | `approved-in-thread`",
  "`pl_g6a_repository_route_api_harness_block_status` | `complete`",
  "`pl_g6a_repository_route_api_harness_block_evidence` | `production-deployment-env-guard`",
  "`support_response_status` | `pending`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`new_public_db_object_review_status` | `required-before-work`",
  "## Completed First Operational Target",
  "The smallest safe first PL-G6 operational target is `production-route-api-harness-block-removal`.",
  "local source inspection confirms the route/API harness file still exists at `app/api/comment-translator/free-beta/route-api-harness/route.ts`",
  "production route/API harness exposure is already labeled `action-required-before-production`",
  "PL-G6A repository-side block status: complete.",
  "The route now returns `blocked-production-route-api-harness` with HTTP 404 when the production deployment label is present.",
  "This does not prove deployed production behavior until a later approved deploy/upload and production confirmation.",
  "PL-G6B preview deploy evidence status: recorded.",
  "Operator-provided sanitized evidence states that PR #628 is merged and Cloudflare preview domain deployment is complete.",
  "This records preview deploy/upload as `complete-auto-preview-after-merge` only; it is not production/main-domain smoke, production env apply, public gate flip, public access change, or main promotion evidence.",
  "## Completed PL-G6C Production/Main-Domain Env Readiness And Smoke Gate",
  "| `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` | Cloudflare production Worker runtime | required-for-public-traffic-control-reference | Cloudflare dashboard production variables/secrets for the Worker service |",
  "| `NEXT_PUBLIC_SITE_URL` | Cloudflare production Worker runtime | required-main-domain-url-reference | Cloudflare dashboard production variables/secrets for the Worker service |",
  "| Supabase public auth variables | Cloudflare production Worker runtime | required-auth-runtime-reference | Cloudflare dashboard production variables/secrets for the Worker service |",
  "| Supabase service role secret | Cloudflare production Worker runtime | required-server-only-status-session-reference | Cloudflare dashboard production secrets for the Worker service |",
  "| YouTube credential resolution controls | Cloudflare production Worker runtime | required-reconnect-and-token-resolution-reference | Cloudflare dashboard production variables/secrets for the Worker service |",
  "| Azure Translator provider references | Cloudflare production Worker runtime | required-free-translation-provider-reference | Cloudflare dashboard production variables/secrets for the Worker service |",
  "| Turnstile public/secret references | Cloudflare production Worker runtime | required-login-abuse-control-reference | Cloudflare dashboard production variables/secrets for the Worker service |",
  "| Stripe and paid entitlement references | Cloudflare production Worker runtime | optional-not-required-for-free-public-beta-smoke | Cloudflare dashboard production variables/secrets for the Worker service |",
  "| live/provider smoke fixture references | operator-local smoke environment only | smoke-only-explicit-approval-required | operator-local shell or approved smoke runner environment |",
  "Do not ask the user to paste values in chat. The operator should add or confirm the labels in the Cloudflare dashboard for the production Worker environment and report only presence labels.",
  "Smallest safe next action: request exact approval for production env apply readiness confirmation only, or ask the operator to add/confirm the listed labels in Cloudflare without exposing values.",
  "I approve PL-G6C production/main-domain env apply readiness confirmation for the Free public beta integration line only.",
  "PL-G6C env apply readiness confirmation approval is present for readiness confirmation only.",
  "This confirmation records operator-action instructions and approval status only; it does not apply production env vars or confirm values.",
  "I approve PL-G6C production/main-domain smoke for the Free public beta integration line only after production env apply readiness is confirmed.",
  "Keep `public_release_capable=no` through this preflight and declaration task.",
  "The separately approved production Worker activation is complete.",
  "I approve the login-only runtime activation environment apply for the Kuro Stream Kit / Comment Translator Free public beta integration line in the Cloudflare production Worker environment only.",
  "I approve the PL-G6 final public release declaration for the Kuro Stream Kit / Comment Translator Free public beta integration line only after the separately approved login-only runtime activation and required post-activation checks are recorded pass",
  "The final public gate does not create, remove, or change a Worker binding.",
  "`COMMENT_TRANSLATOR_FREE_BETA_RUNTIME_ACCESS` remains unchanged at the separately activated login-only runtime policy.",
  "Cloudflare production edge protection activation or confirmation remains a separate approval-gated operation when required.",
  "The final public gate is a release declaration after the separately approved login-only activation and required post-activation checks are recorded pass, Google OAuth verification is approved, production edge protection is confirmed ready, and the production route/API harness remains blocked with HTTP 404.",
  "Google OAuth verification is currently submitted and pending, so the final release declaration remains blocked.",
  "Final production/main-domain smoke remains a later separate approval-gated task after the release declaration.",
  "`main_promotion_status` | `complete-pr-640-merged-main-contained`",
  "`main_connected_deployment_status` | `pass`",
  "`main_connected_workers_build_status` | `success`",
  "`main_connected_workers_build_evidence_source` | `github-check-run-cloudflare-workers-and-pages`",
  "`login_only_runtime_activation_status` | `complete-production-worker-deployment`",
  "`post_activation_browser_verification_status` | `pass-11-of-11`",
  "`post_activation_browser_failure_count` | `0`",
  "`production_main_domain_health_status` | `pass`",
  "`unauthenticated_access_status` | `pass-blocked`",
  "`auth_unavailable_access_status` | `pass-fail-closed`",
  "`authenticated_free_access_status` | `pass-allowed`",
  "`existing_allowed_tester_parity_status` | `pass`",
  "`preview_rate_limit_override_boundary_status` | `pass-tester-only`",
  "`privileged_boundaries_status` | `pass-unchanged`",
  "`youtube_connect_no_autostart_status` | `pass`",
  "`production_route_api_harness_status` | `pass-404`",
  "`browser_output_sanitization_status` | `pass`",
  "`optional_limit_proof_disposition` | `accepted-deterministic-evidence`",
  "`edge_protection_readiness_status` | `blocked-activation-or-confirmation-required`",
  "existing allowed tester allowed; preview 5/min override tester-only; Creator/paid waitlist, billing, admin, and privileged surfaces unchanged",
  "activation_apply_status=blocked-deploy-upload-not-approved",
  "remote_mutation_count=0",
  "Do not run Cloudflare mutation, production/main deploy/upload, production env apply, public gate flip, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, or main promotion from this preflight slice.",
  "The only current unrun release operation in this chain is the final public release declaration.",
  "`main_connected_deployment_activation_state` | `login-only-active`",
  "I approve creating and merging the integration-to-main promotion PR",
  "I approve post-deploy private-default production verification for the main-connected deployment only.",
  "Approval for the promotion does not approve the post-deploy verification.",
  "Evidence stays labels/counts/pass-fail/status only."
]) {
  assertIncludes(plG6Doc, fragment, `PL-G6 doc records ${fragment}`);
}

for (const fragment of [
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md",
  "pl_g6_public_access_change_preflight_status=complete",
  "pl_g6_public_access_change_status=not-run-approval-gated",
  "pl_g6_first_operational_target=production-route-api-harness-block-removal",
  "pl_g6_first_operational_target_status=complete-repository-side-not-deployed",
  "pl_g6_first_operational_target_approval_status=approved-in-thread",
  "pl_g6a_repository_route_api_harness_block_status=complete",
  "pl_g6a_repository_route_api_harness_block_evidence=production-deployment-env-guard",
  "deploy_upload_status=complete-auto-preview-after-merge",
  "deploy_upload_evidence_source=operator-provided",
  "preview_deployment_target=cloudflare-preview-domain",
  "preview_deployment_status=deployed-operator-provided",
  "production_env_apply_status=confirmed-ready-operator-provided",
  "production_main_domain_smoke_status=pass-operator-provided-private-launch-browser",
  "pl_g6c_production_main_domain_env_readiness_status=prepared-approval-gated",
  "pl_g6c_production_env_operator_action_status=action-required-sanitized-instructions-only",
  "pl_g6c_production_env_apply_readiness_confirmation_approval_status=present",
  "pl_g6c_production_env_apply_readiness_confirmation_status=recorded-no-mutation",
  "pl_g6c_production_smoke_approval_status=present",
  "operator_start_to_translation_smoke_status=pass-production-main-domain-private-launch",
  "live_provider_execution_status=pass-operator-provided-private-launch-smoke",
  "target_language_selection_status=pass-operator-provided-private-launch-browser",
  "short_reaction_filter_status=pass-operator-provided-private-launch-browser",
  "unauthorized_admin_visibility_status=pass-hidden-for-non-admin-account",
  "unauthorized_translator_access_status=pass-blocked-for-non-allowed-account",
  "google_auth_verification_status=submitted-pending",
  "final_public_gate_target=free-public-beta-release-declaration",
  "final_public_gate_mutation_target=none",
  "login_only_runtime_binding_action=unchanged",
  "edge_protection_operation_boundary=separate-approval-if-activation-required",
  "main_promotion_status=complete-pr-640-merged-main-contained",
  "main_connected_deployment_status=pass",
  "main_connected_workers_build_status=success",
  "login_only_runtime_activation_status=complete-production-worker-deployment",
  "post_activation_browser_verification_status=pass-11-of-11",
  "post_activation_browser_failure_count=0",
  "edge_protection_readiness_status=blocked-activation-or-confirmation-required",
  "public_release_capable=no"
]) {
  assertIncludes(task, fragment, `task.md records ${fragment}`);
}

for (const fragment of [
  'const productionDeploymentEnv = "production"',
  "function isProductionDeploymentEnvironment()",
  "process.env.VERCEL_ENV === productionDeploymentEnv",
  "blocked-production-route-api-harness",
  "status: 404"
]) {
  assertIncludes(routeHarness, fragment, `route harness records production block ${fragment}`);
}

assert.match(
  routeHarness,
  /export async function POST\(request: NextRequest\) \{\s*if \(isProductionDeploymentEnvironment\(\)\)/,
  "route harness checks production deployment before harness env/header/private gate"
);

for (const fragment of [
  "`pl_g6_public_access_change_preflight_status` | `complete`",
  "`pl_g6_public_access_change_preflight_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`",
  "`pl_g6_public_access_change_status` | `not-run-approval-gated`",
  "`pl_g6c_production_main_domain_env_readiness_status` | `complete`",
  "`google_auth_verification_status` | `submitted-pending`",
  "`final_public_gate_target` | `free-public-beta-release-declaration`",
  "`final_public_gate_mutation_target` | `none`",
  "`main_promotion_status` | `complete-pr-640-merged-main-contained`",
  "`main_connected_workers_build_status` | `success`",
  "`login_only_runtime_activation_status` | `complete-production-worker-deployment`",
  "`post_activation_browser_verification_status` | `pass-11-of-11`",
  "`edge_protection_readiness_status` | `blocked-activation-or-confirmation-required`",
  "`public_release_capable_status` | `no`"
]) {
  assertIncludes(taskBoard, fragment, `task board records ${fragment}`);
}

for (const fragment of [
  "At decision time, PL-G6 public access change / promotion was approval-gated and not-run.",
  "The final public gate is a release declaration, not a second Worker binding mutation.",
  "Google OAuth verification must be approved before that release declaration.",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md"
]) {
  assertIncludes(plG5Doc, fragment, `PL-G5 doc links PL-G6 preflight ${fragment}`);
}

for (const fragment of [
  "operator_remaining_external_verification_status` | `action-required-google-edge-final-smoke`",
  "operator_production_harness_block_status` | `pass-production-404`",
  "google_auth_verification_status` | `submitted-pending`",
  "final_public_gate_mutation_target` | `none`"
]) {
  assertIncludes(operatorChecklist, fragment, `operator checklist keeps ${fragment}`);
}

for (const fragment of [
  "login_only_runtime_activation_status` | `complete-production-worker-deployment`",
  "post_activation_browser_verification_status` | `pass-11-of-11`",
  "post_activation_browser_failure_count` | `0`",
  "main_promotion_status` | `complete-pr-640-merged-main-contained`",
  "main_connected_workers_build_status` | `success`",
  "edge_protection_readiness_status` | `blocked-activation-or-confirmation-required`"
]) {
  assertIncludes(operatorChecklist, fragment, `operator checklist reconciles current activation ${fragment}`);
}

assertIncludes(
  cloudflareOperations,
  "Production route/API harness exposure must be blocked or removed before production exposure.",
  "Cloudflare operations keeps production harness boundary"
);
assertIncludes(
  cloudflareOperations,
  "Cloudflare edge protection is a separate approval-gated operation and is not the final public gate declaration itself.",
  "Cloudflare operations separates edge protection from the final release declaration"
);

assert.doesNotMatch(combinedDocs, /public_release_capable(?:_status)?[=|]\s*`?yes`?/i);
assert.doesNotMatch(combinedDocs, /pl_g6_public_access_change_status[=|]\s*`?(?:configured|complete|completed|done|run)`?/i);
assert.doesNotMatch(combinedDocs, /public_gate_flip_status[=|]\s*`?(?:configured|complete|completed|done|run)`?/i);

for (const [label, source] of [
  [plG6DocPath, plG6Doc],
  [plG5DocPath, plG5Doc],
  [taskBoardPath, taskBoard],
  [operatorChecklistPath, operatorChecklist],
  [cloudflareOperationsPath, cloudflareOperations],
  [taskPath, task],
  [routeHarnessPath, routeHarness]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  "app/account/actions.ts",
  "app/account/integrations/page.tsx",
  "app/api/comment-translator/session/route.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/api/comment-translator/youtube/disconnect/route.ts",
  "app/api/comment-translator/youtube/oauth/callback/route.ts",
  "app/tools/comment-translator/account-actions.ts",
  "app/tools/comment-translator/page.tsx",
  "app/tools/comment-translator/session-actions.ts",
  "lib/comment-translator-private-launch-access-gate.ts",
  "lib/comment-translator-public-beta-access-gate-policy.ts",
  "scripts/comment-translator-login-only-runtime-access-contract.mjs",
  "scripts/comment-translator-private-launch-access-gate-contract.mjs",
  "scripts/comment-translator-public-beta-access-gate-decision-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  plG6DocPath,
  plG5DocPath,
  taskBoardPath,
  operatorChecklistPath,
  cloudflareOperationsPath,
  taskPath,
  routeHarnessPath,
  "scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2a-server-action-route-api-harness-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-monthly-input-character-accounting-contract.mjs",
  "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
  "scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G6 preflight change stays in allowed files: ${file}`);
  if (file.endsWith(".mjs")) continue;
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log(
  "comment translator Free beta PL-G6 public access change preflight contract checks passed"
);
