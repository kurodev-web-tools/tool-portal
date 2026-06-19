import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const evidenceDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md";
const readyPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md";
const publicUsabilityPreflightDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const remoteDurableEvidenceDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md";
const remoteDurablePreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md";
const allowedTesterEvidenceDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md";
const allowedTesterPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md";
const startEvidenceDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md";
const startPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const finalQaDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const productionEnvReadinessPath = "docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md";
const plG4DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md";
const plG4FollowUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md";
const taskPath = "task.md";

const runtimePaths = [
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts",
  "components/comment-translator/CommentTranslatorDock.tsx",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "lib/comment-translator-public-entitlement-baseline.ts",
  "lib/comment-translator-server-only-live-chat-target-lookup.ts",
  "lib/comment-translator-bounded-live-chat-polling-wiring.ts",
  "lib/comment-translator-azure-normal-translation-execution.ts",
  "package.json"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function escaped(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-free-public-beta-integration...HEAD", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
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

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
}

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  evidenceDocPath,
  readyPreflightDocPath,
  publicUsabilityPreflightDocPath,
  remoteDurableEvidenceDocPath,
  remoteDurablePreflightDocPath,
  allowedTesterEvidenceDocPath,
  allowedTesterPreflightDocPath,
  startEvidenceDocPath,
  startPreflightDocPath,
  finalQaDocPath,
  gapAuditPath,
  productionEnvReadinessPath,
  plG4DocPath,
  plG4FollowUpDocPath,
  taskPath,
  ...runtimePaths
]) {
  assert.ok(exists(requiredPath), `FB-L5 required reference exists: ${requiredPath}`);
}

const evidenceDoc = read(evidenceDocPath);
const readyPreflightDoc = read(readyPreflightDocPath);
const publicUsabilityPreflightDoc = read(publicUsabilityPreflightDocPath);
const remoteDurableEvidenceDoc = read(remoteDurableEvidenceDocPath);
const remoteDurablePreflightDoc = read(remoteDurablePreflightDocPath);
const allowedTesterEvidenceDoc = read(allowedTesterEvidenceDocPath);
const allowedTesterPreflightDoc = read(allowedTesterPreflightDocPath);
const startEvidenceDoc = read(startEvidenceDocPath);
const startPreflightDoc = read(startPreflightDocPath);
const finalQaDoc = read(finalQaDocPath);
const gapAudit = read(gapAuditPath);
const productionEnvReadiness = read(productionEnvReadinessPath);
const plG4Doc = read(plG4DocPath);
const plG4FollowUpDoc = read(plG4FollowUpDocPath);
const task = read(taskPath);
const runtimeSources = runtimePaths.map((runtimePath) => [runtimePath, read(runtimePath)]);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Production/Custom Smoke Boundary",
  "## Local Contract Boundary",
  "## What This Evidence Proves",
  "## What This Evidence Does Not Prove",
  "## Sanitized Evidence Record",
  "## Next Safe Action",
  "## Unchecked Scope And Residual Risk",
  "## Completion Verification"
]) {
  assert.match(evidenceDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `FB-L5 evidence doc includes ${requiredSection}`);
}

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Preconditions",
  "## Exact Command Sequence",
  "## Sanitized Output Review",
  "## Abort Rules",
  "## Approval Text",
  "## Rollback Boundary",
  "## What Approval Would Prove",
  "## What Approval Would Not Prove",
  "## Completion Verification"
]) {
  assert.match(
    readyPreflightDoc,
    new RegExp(`^${escaped(requiredSection)}$`, "m"),
    `FB-L5 ready preflight doc includes ${requiredSection}`
  );
}

for (const requiredFragment of [
  "Status: FB-L5 Production/custom deployed smoke",
  "Public-release capable: no",
  "blocked-no-approval",
  "production/custom deployed smoke execution",
  "reviewed integration branch",
  "codex/comment-translator-free-public-beta-integration",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_DEPLOYED_VERSION_LABEL",
  "allowed tester",
  "/tools/comment-translator/",
  "POST /api/comment-translator/session",
  "usage",
  "deletion",
  "Creator locked",
  "Start-to-translation",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "not-run / approval-gated",
  "30 minutes per user per day",
  "30 minutes per session",
  "1 active session per user",
  "30 translated messages per minute",
  "20,000 translated characters per month",
  "missing/unreadable durable state",
  "fail closed",
  "Paid entitlement C1/C3",
  "Stripe billing",
  "Creator paid limits",
  "counts/status/stop reasons only",
  "no browser storage expansion",
  "no handoff payload expansion"
]) {
  assert.match(evidenceDoc, new RegExp(escaped(requiredFragment), "i"), `FB-L5 evidence doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "Status: FB-L5 production/custom deployed smoke ready preflight",
  "Public-release capable: no",
  "preflight-ready",
  "not-run in this thread",
  "node scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs",
  "git rev-parse origin/codex/comment-translator-free-public-beta-integration",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_DEPLOYED_VERSION_LABEL",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "POST /api/comment-translator/session",
  "\"intent\":\"status\"",
  "/tools/comment-translator/",
  "/account/integrations/",
  "/account/billing/",
  "approved-fb-l5-production-custom-deployed-smoke",
  "reviewed integration branch",
  "counts/status/stop reasons only",
  "no remote Supabase migration apply",
  "no remote mutation",
  "no deploy/upload",
  "no provider target lookup",
  "no liveChatMessages.list",
  "no Azure/OpenAI provider execution",
  "no Stripe",
  "no main promotion",
  "no public launch gate flip"
]) {
  assert.match(
    readyPreflightDoc,
    new RegExp(escaped(requiredFragment), "i"),
    `FB-L5 ready preflight doc includes ${requiredFragment}`
  );
}

for (const forbiddenFragment of [
  "npx supabase db push --linked",
  "wrangler deploy",
  "wrangler versions upload",
  "--execute --approved-live-chat-target-lookup",
  "--execute --approved-live-chat-polling-smoke",
  "--approved-private-gated-live-provider-smoke",
  "approved-fb-l2-remote-durable-enforcement-apply-and-smoke",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "approved-fb-l4-start-to-translation-smoke"
]) {
  assert.doesNotMatch(
    readyPreflightDoc,
    new RegExp(escaped(forbiddenFragment), "i"),
    `FB-L5 ready preflight excludes out-of-scope command or approval label: ${forbiddenFragment}`
  );
}

assert.match(publicUsabilityPreflightDoc, /FB-L5|Production\/custom deployed smoke/i, "FB-L1 preflight points to FB-L5 deployed smoke");
assert.match(remoteDurableEvidenceDoc, /deployed target freshness/i, "FB-L2 evidence leaves deployed target freshness unchecked");
assert.match(remoteDurablePreflightDoc, /production\/custom deploy freshness/i, "FB-L2 ready preflight excludes production/custom freshness proof");
assert.match(allowedTesterEvidenceDoc, /deployed target freshness/i, "FB-L3 evidence leaves deployed target freshness unchecked");
assert.match(allowedTesterPreflightDoc, /production\/custom deploy freshness/i, "FB-L3 ready preflight excludes production/custom freshness proof");
assert.match(startEvidenceDoc, /deployed target freshness/i, "FB-L4 evidence leaves deployed target freshness unchecked");
assert.match(startPreflightDoc, /production\/custom deploy freshness/i, "FB-L4 ready preflight excludes production/custom freshness proof");
assert.match(finalQaDoc, /FB-L5|Production\/custom deployed smoke/i, "F15 readiness doc points to FB-L5 production/custom deployed smoke");
assert.match(gapAudit, /FB-L5|Production\/custom deployed smoke/i, "gap audit records FB-L5 follow-up");
assert.match(productionEnvReadiness, /COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES/, "production env readiness records private launch allowlist reference");
assert.match(productionEnvReadiness, /CLOUDFLARE_ACCOUNT_ID[\s\S]*deploy\/upload/, "production env readiness records deploy reference as approval-gated");
assert.match(plG4Doc, /approved-fb-l5-production-custom-deployed-smoke/i, "PL-G4 evidence keeps FB-L5 approval label");
assert.match(plG4Doc, /production\/custom deployed smoke execution[\s\S]*not-run \/ approval-gated/i, "PL-G4 evidence keeps deployed smoke not-run/gated");
assert.match(plG4FollowUpDoc, /keep blocked \/ blocked-no-approval/i, "PL-G4 follow-up keeps deployed smoke blocked");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-(?:pl-g5-after-pl-g4-provider-permission-triage-follow-up|(?:(?:fb-l5|pl-g4)-production-custom-deployed-smoke(?:-evidence-follow-up)?|pl-g4-after-pl-g3-provider-permission-triage-follow-up))`/i,
  "task.md records FB-L5 or PL-G4 branch"
);
assert.match(task, /FB-L5[\s\S]*Production\/custom deployed smoke[\s\S]*(preflight-ready|blocked-no-approval)/i, "task.md records FB-L5 state");
assert.match(task, /Latest FB-L5 Evidence/i, "task.md records Latest FB-L5 Evidence");
assert.match(task, /approved-fb-l5-production-custom-deployed-smoke/i, "task.md records exact FB-L5 approval label");
assert.match(task, /production\/custom deployed smoke execution[\s\S]*not-run\/approval-gated/i, "task.md records FB-L5 smoke not-run/gated");
assert.match(task, /unchecked scope[\s\S]*production\/custom deployed smoke execution/i, "task.md records unchecked deployed smoke execution scope");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

const routeSource = read("app/api/comment-translator/session/route.ts");
assert.match(routeSource, /readCommentTranslatorPrivateLaunchAccess[\s\S]*blocked[\s\S]*status:\s*403/, "route keeps private launch gate for production smoke");
assert.match(routeSource, /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "route reads durable session and usage before browser state");
assert.match(routeSource, /createUnavailableCommentTranslatorLiveChatTargetLookupAdapter[\s\S]*provider-target-lookup-not-approved/, "route keeps provider target lookup unavailable by default");
assert.match(routeSource, /createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter[\s\S]*live-provider-polling-not-approved/, "route keeps live provider polling unavailable by default");

const actionsSource = read("app/tools/comment-translator/actions.ts");
for (const actionFragment of [
  "getCommentTranslatorSessionStatusAction",
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorLockedWaitlistAction",
  "recordCommentTranslatorCreatorLockedClickAction",
  "startCommentTranslatorSessionAction"
]) {
  assert.match(actionsSource, new RegExp(escaped(actionFragment)), `actions expose FB-L5 reviewed server-owned surface: ${actionFragment}`);
}
assert.match(actionsSource, /readCommentTranslatorPrivateLaunchAccess[\s\S]*private-launch-gated/, "actions keep private launch gate for deployed allowed-tester smoke");
assert.match(actionsSource, /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "actions use durable session and usage readiness");

const dockSource = read("components/comment-translator/CommentTranslatorDock.tsx");
assert.match(dockSource, /commentTranslatorUiCopy/, "tool UI consumes the reviewed route copy");
assert.match(dockSource, /startCommentTranslatorSessionAction/, "tool UI exposes explicit Start through reviewed action");
assert.match(dockSource, /stopCommentTranslatorSessionAction/, "tool UI exposes explicit Stop through reviewed action");

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["build:cloudflare"], "opennextjs-cloudflare build", "Cloudflare build script remains explicit");
assert.match(packageJson.scripts["deploy:cloudflare"], /wrangler deploy --keep-vars/, "deploy script remains Cloudflare deploy command");
assert.match(packageJson.scripts["upload:cloudflare"], /wrangler versions upload --keep-vars/, "upload script remains Cloudflare upload command");

for (const [label, source] of [
  [evidenceDocPath, evidenceDoc],
  [readyPreflightDocPath, readyPreflightDoc],
  [publicUsabilityPreflightDocPath, publicUsabilityPreflightDoc],
  [remoteDurableEvidenceDocPath, remoteDurableEvidenceDoc],
  [remoteDurablePreflightDocPath, remoteDurablePreflightDoc],
  [allowedTesterEvidenceDocPath, allowedTesterEvidenceDoc],
  [allowedTesterPreflightDocPath, allowedTesterPreflightDoc],
  [startEvidenceDocPath, startEvidenceDoc],
  [startPreflightDocPath, startPreflightDoc],
  [finalQaDocPath, finalQaDoc],
  [gapAuditPath, gapAudit],
  [productionEnvReadinessPath, productionEnvReadiness],
  [plG4DocPath, plG4Doc],
  [plG4FollowUpDocPath, plG4FollowUpDoc],
  [taskPath, task],
  ...runtimeSources
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  evidenceDocPath,
  readyPreflightDocPath,
  publicUsabilityPreflightDocPath,
  plG4DocPath,
  plG4FollowUpDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md",
  finalQaDocPath,
  gapAuditPath,
  taskPath,
  "scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `FB-L5 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta production/custom deployed smoke contract checks passed");
