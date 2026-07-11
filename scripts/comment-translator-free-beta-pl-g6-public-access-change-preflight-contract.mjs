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
  "## Login-Only Runtime Activation And Later Public Gate Flip",
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
  "Status: PL-G6 public access change / promotion execution preflight prepared. Preview auto deploy evidence and production/main-domain private-launch smoke evidence recorded from sanitized operator-provided status. Public-release capable: no.",
  "PL-G6C production/main-domain env readiness is confirmed by operator-provided labels, and production/main-domain private-launch-only smoke is pass by operator-provided browser evidence.",
  "`pl_g6_public_access_change_preflight_status` | `complete`",
  "`pl_g6_public_access_change_preflight_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`",
  "`pl_g6_public_access_change_status` | `not-run-approval-gated`",
  "`public_release_capable` | `no`",
  "`deploy_upload_status` | `complete-auto-preview-after-merge`",
  "`deploy_upload_evidence_source` | `operator-provided`",
  "`preview_deployment_target` | `cloudflare-preview-domain`",
  "`preview_deployment_status` | `deployed-operator-provided`",
  "`production_env_apply_status` | `confirmed-ready-operator-provided`",
  "`production_main_domain_smoke_status` | `pass-operator-provided-private-launch-browser`",
  "`pl_g6c_production_main_domain_env_readiness_status` | `prepared-approval-gated`",
  "`pl_g6c_production_env_operator_action_status` | `action-required-sanitized-instructions-only`",
  "`pl_g6c_production_env_apply_readiness_confirmation_approval_status` | `present`",
  "`pl_g6c_production_env_apply_readiness_confirmation_status` | `recorded-no-mutation`",
  "`pl_g6c_production_smoke_approval_status` | `present`",
  "`operator_start_to_translation_smoke_status` | `pass-production-main-domain-private-launch`",
  "`live_provider_execution_status` | `pass-operator-provided-private-launch-smoke`",
  "`release_owner_decision_status` | `blocked-no-approval`",
  "`release_owner_exact_approval_status` | `absent`",
  "`release_owner_missing_approval_scope` | `public-capability-risk-acceptance-and-remaining-operator-checks`",
  "`operator_remaining_external_verification_status` | `action-required`",
  "`operator_production_harness_block_status` | `pass-production-404`",
  "`operator_production_api_managed_challenge_status` | `not-selected`",
  "`public_beta_access_gate_selected` | `login-only`",
  "`public_beta_waitlist_boundary` | `creator-paid-beta-only`",
  "`login_only_runtime_activation_preflight_status` | `prepared-local-only`",
  "`login_only_runtime_activation_target` | `cloudflare-production-worker-runtime`",
  "`login_only_runtime_activation_approval_status` | `present-insufficient-for-required-deploy`",
  "`login_only_runtime_activation_apply_status` | `blocked-deploy-upload-not-approved`",
  "`public_traffic_rate_limit_backing_selected` | `cloudflare-edge`",
  "`pl_g6_first_operational_target` | `production-route-api-harness-block-removal`",
  "`pl_g6_first_operational_target_status` | `complete-repository-side-not-deployed`",
  "`pl_g6_first_operational_target_approval_status` | `approved-in-thread`",
  "`pl_g6a_repository_route_api_harness_block_status` | `complete`",
  "`pl_g6a_repository_route_api_harness_block_evidence` | `production-deployment-env-guard`",
  "`support_response_status` | `pending`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`new_public_db_object_review_status` | `required-before-work`",
  "I approve PL-G6 public access change / promotion preflight execution for the Free public beta integration line only.",
  "## Smallest Safe First Operational Target",
  "The smallest safe first PL-G6 operational target is `production-route-api-harness-block-removal`.",
  "local source inspection confirms the route/API harness file still exists at `app/api/comment-translator/free-beta/route-api-harness/route.ts`",
  "production route/API harness exposure is already labeled `action-required-before-production`",
  "PL-G6A repository-side block status: complete.",
  "The route now returns `blocked-production-route-api-harness` with HTTP 404 when the production deployment label is present.",
  "This does not prove deployed production behavior until a later approved deploy/upload and production confirmation.",
  "PL-G6B preview deploy evidence status: recorded.",
  "Operator-provided sanitized evidence states that PR #628 is merged and Cloudflare preview domain deployment is complete.",
  "This records preview deploy/upload as `complete-auto-preview-after-merge` only; it is not production/main-domain smoke, production env apply, public gate flip, public access change, or main promotion evidence.",
  "## PL-G6C Production/Main-Domain Env Readiness And Smoke Approval Gate",
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
  "Keep public_release_capable=no unless this same-thread approval explicitly changes it after the listed checks are closed or accepted.",
  "The smallest safe next activation operation after the merged runtime is a production-only environment apply for the exact server-owned login-only runtime control.",
  "I approve the login-only runtime activation environment apply for the Kuro Stream Kit / Comment Translator Free public beta integration line in the Cloudflare production Worker environment only.",
  "I approve the PL-G6 public gate flip for the Kuro Stream Kit / Comment Translator Free public beta integration line in the Cloudflare production environment only",
  "existing allowed tester allowed; preview 5/min override tester-only; Creator/paid waitlist, billing, admin, and privileged surfaces unchanged",
  "activation_apply_status=blocked-deploy-upload-not-approved",
  "remote_mutation_count=0",
  "Do not run Cloudflare mutation, production/main deploy/upload, production env apply, public gate flip, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, or main promotion from this preflight slice.",
  "PL-G6 execution remains blocked until exact same-thread approval names the operation, target boundary, allowed evidence shape, and non-actions.",
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
  "`pl_g6c_production_main_domain_env_readiness_status` | `prepared-approval-gated`",
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
  "operator_production_harness_block_status` | `pass-production-404`"
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
  taskPath,
  routeHarnessPath,
  "scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G6 preflight change stays in allowed files: ${file}`);
  if (file.endsWith(".mjs")) continue;
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log(
  "comment translator Free beta PL-G6 public access change preflight contract checks passed"
);
