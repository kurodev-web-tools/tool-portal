import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const qaRecordPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_FINAL_QA.md";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
const runbookPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_DEPLOYMENT_LIVE_SMOKE_RUNBOOK.md";
const taskPath = "task.md";

const requiredSurfaces = [
  "app/account/integrations/page.tsx",
  "app/account/billing/page.tsx",
  "app/tools/comment-translator/page.tsx",
  "app/tools/comment-translator/actions.ts",
  "app/api/comment-translator/session/route.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/api/comment-translator/youtube/disconnect/route.ts",
  "app/api/comment-translator/billing/webhook/route.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "lib/comment-translator-language-policy-runtime.ts",
  "lib/comment-translator-youtube-bounded-polling-session-runtime.ts",
  "lib/comment-translator-provider-execution-runtime.ts",
  "lib/comment-translator-admin-operational-visibility.ts",
  "lib/comment-translator-billing-runtime.ts"
];

const requiredContractScripts = [
  "scripts/comment-translator-account-integrations-entry-contract.mjs",
  "scripts/comment-translator-youtube-token-refresh-reconnect-status-contract.mjs",
  "scripts/comment-translator-youtube-disconnect-revocation-runtime-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "scripts/comment-translator-filter-language-policy-runtime-contract.mjs",
  "scripts/comment-translator-youtube-bounded-polling-session-runtime-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-admin-operational-visibility-contract.mjs",
  "scripts/comment-translator-public-deployment-runbook-contract.mjs",
  "scripts/comment-translator-stripe-paid-plan-integration-contract.mjs"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assertNoSensitiveValues(relativePath) {
  const source = read(relativePath);
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*:\s*Bearer\s+\S+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY/i,
    `${relativePath} does not contain committed secret, token, authorization, or private key values`
  );
}

function assertClientReadableSourceDoesNotDefineProviderValues(relativePath) {
  const source = read(relativePath);
  assert.doesNotMatch(
    source,
    /\b(ownerUserId|providerChannelId|liveChatId|providerTargetMetadata)\b\s*[:=]\s*["'][^"']+["']/,
    `${relativePath} does not define client-readable owner, provider target, Live Chat target, or provider metadata values`
  );
}

assert.ok(exists(qaRecordPath), "Task 16 final QA record exists");
assert.ok(exists(requirementsPath), "canonical public release requirements exist");
assert.ok(exists(runbookPath), "deployment/live-smoke runbook exists");

for (const surface of requiredSurfaces) {
  assert.ok(exists(surface), `release surface exists: ${surface}`);
}

for (const script of requiredContractScripts) {
  assert.ok(exists(script), `prior roadmap contract exists: ${script}`);
}

const qaRecordSource = read(qaRecordPath);
const requirementsSource = read(requirementsPath);
const runbookSource = read(runbookPath);
const taskSource = read(taskPath);

for (const requiredSection of [
  "## Gate Status",
  "## Merge Evidence",
  "## Local QA Checklist",
  "## Approval-Gated Evidence",
  "## Residual Blockers",
  "## Next Safe Action"
]) {
  assert.match(qaRecordSource, new RegExp(`^${requiredSection}$`, "m"), `final QA record includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Task 1-15: merged",
  "PR #418",
  "0c394b95dfb3873aa337436a590a92e73d8bea6d",
  "Cloudflare Pages: FAILURE",
  "Workers Builds: SUCCESS",
  "public-release capable: no",
  "readiness/blocker PR approved",
  "deployed URL smoke: failed",
  "/tools/comment-translator/",
  "/account/integrations/",
  "returned 404",
  "Cloudflare version upload: failed before upload",
  "failed to automatically retrieve account IDs",
  "Cloudflare API authentication error `10000`",
  "Cloudflare version upload retry after auth refresh: succeeded",
  "Preview URL smoke: passed for the approved narrow preview scope",
  "Chrome authenticated smoke",
  "preview-only",
  "Pre-Main Launch Hardening Roadmap",
  "live/provider smoke: not run",
  "Stripe live-mode action: not run",
  "sanitized-metadata-only",
  "no secrets requested, printed, or stored"
]) {
  assert.match(
    qaRecordSource,
    new RegExp(requiredFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `final QA record includes ${requiredFragment}`
  );
}

assert.match(requirementsSource, /Kuro Live Comment Translator is public-release capable when/i, "requirements define release capable gate");
assert.match(runbookSource, /Do not run upload or deploy from a thread that lacks explicit deployment approval/i, "runbook keeps deploy approval gate");
assert.match(taskSource, /Task 16[\s\S]*Public release final QA and launch gate/i, "task board keeps Task 16");
assert.match(taskSource, /public-release capable: no/i, "task board does not overclaim public-release capability");
assert.match(taskSource, /deployed URL smoke[\s\S]*(failed|404)/i, "task board records failed deployed smoke evidence");
assert.match(taskSource, /Cloudflare version upload[\s\S]*failed/i, "task board records failed Cloudflare version upload");
assert.match(taskSource, /authentication error `10000`/i, "task board records sanitized Cloudflare authentication failure");
assert.match(taskSource, /Cloudflare version upload retry after auth refresh[\s\S]*succeeded/i, "task board records successful Cloudflare version upload retry");
assert.match(taskSource, /Preview URL smoke[\s\S]*passed for the approved narrow preview scope/i, "task board records preview URL smoke narrow pass");
assert.match(taskSource, /Chrome authenticated smoke[\s\S]*no console logs/i, "task board records authenticated preview smoke");
assert.match(taskSource, /preview-only/i, "task board records preview-only limitation");
assert.match(taskSource, /Pre-Main Launch Hardening Roadmap[\s\S]*17\. Private launch access gate/i, "task board records private launch gate follow-up");
assert.match(taskSource, /18\. Operator UX readiness polish[\s\S]*\/account\/integrations/i, "task board records operator UX follow-up");
assert.match(taskSource, /19\. Translation provider and cost policy finalization[\s\S]*Azure Translator[\s\S]*OpenAI mini[\s\S]*Gemini Flash\/Lite[\s\S]*DeepL/i, "task board records provider policy follow-up");
assert.match(taskSource, /20\. Translation provider implementation alignment[\s\S]*Free\/Paid provider routing/i, "task board records provider implementation follow-up");
assert.match(taskSource, /21\. Stripe live readiness and billing operations[\s\S]*live-mode actions only after explicit approval/i, "task board records Stripe live readiness follow-up");
assert.match(taskSource, /22\. Security and privacy final review[\s\S]*no-secret scan/i, "task board records security review follow-up");
assert.match(taskSource, /23\. Private-gated live\/provider smoke[\s\S]*raw comments/i, "task board records private live smoke follow-up");
assert.match(taskSource, /24\. Private-gated main promotion and production smoke[\s\S]*general access remains blocked/i, "task board records private main promotion follow-up");
assert.match(taskSource, /25\. Public launch gate flip[\s\S]*public-release capable/i, "task board records public launch gate flip follow-up");
assert.match(taskSource, /live\/provider smoke[\s\S]*not run/i, "task board records live/provider smoke as not run without approval");

for (const file of [qaRecordPath, requirementsPath, runbookPath, taskPath, ...requiredSurfaces]) {
  assertNoSensitiveValues(file);
}

for (const file of [
  qaRecordPath,
  requirementsPath,
  runbookPath,
  taskPath,
  "app/account/integrations/page.tsx",
  "app/account/billing/page.tsx",
  "app/tools/comment-translator/page.tsx"
]) {
  assertClientReadableSourceDoesNotDefineProviderValues(file);
}

console.log("comment translator public release final QA contract checks passed");
