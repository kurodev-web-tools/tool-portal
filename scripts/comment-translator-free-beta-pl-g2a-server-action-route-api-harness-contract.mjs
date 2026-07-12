import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const routePath = "app/api/comment-translator/free-beta/route-api-harness/route.ts";
const evidenceDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2A_SERVER_ACTION_ROUTE_API_HARNESS.md";
const allowedTesterEvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md";
const allowedTesterPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md";
const publicUsabilityPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'](?![A-Za-z0-9_-]+-reference["']|[A-Za-z0-9_-]*(?:auto|fixture)[A-Za-z0-9_-]*["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  routePath,
  evidenceDocPath,
  allowedTesterEvidencePath,
  allowedTesterPreflightPath,
  publicUsabilityPreflightPath,
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G2A required path exists: ${requiredPath}`);
}

const routeSource = read(routePath);
const evidenceDoc = read(evidenceDocPath);
const allowedTesterEvidence = read(allowedTesterEvidencePath);
const allowedTesterPreflight = read(allowedTesterPreflightPath);
const publicUsabilityPreflight = read(publicUsabilityPreflightPath);
const gapAudit = read(gapAuditPath);
const task = read(taskPath);

for (const requiredFragment of [
  'export const dynamic = "force-dynamic"',
  "COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "x-comment-translator-harness-approval",
  "readCommentTranslatorPrivateLaunchAccess",
  "createServerSupabaseClient",
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorWaitlistAction",
  "runFeedAction",
  "runDataDeletionAction",
  "runCreatorWaitlistAction",
  "action",
  "pass",
  "status",
  "count",
  "unavailableReason"
]) {
  assert.match(routeSource, new RegExp(escaped(requiredFragment)), `PL-G2A route includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "startCommentTranslatorSessionAction",
  "stopCommentTranslatorSessionAction",
  "heartbeatCommentTranslatorSessionAction",
  "resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart",
  "readCommentTranslatorBoundedLiveChatPollingTick",
  "liveChatMessages.list",
  "stripe",
  "localStorage",
  "sessionStorage",
  "indexedDB"
]) {
  assert.doesNotMatch(routeSource, new RegExp(escaped(forbiddenFragment), "i"), `PL-G2A route excludes ${forbiddenFragment}`);
}

assert.match(
  routeSource,
  /type HarnessActionName[\s\S]*getCommentTranslatorRealCommentsFeedAction[\s\S]*requestCommentTranslatorDataDeletionAction[\s\S]*getCommentTranslatorCreatorWaitlistAction/,
  "PL-G2A harness action allowlist is limited to the requested server action surfaces"
);
assert.match(routeSource, /NextResponse\.json\(\s*\{[\s\S]*results[\s\S]*\}/, "PL-G2A route returns only projected results");
assert.doesNotMatch(routeSource, /return NextResponse\.json\(\s*(feed|state|draft|deletion)/, "PL-G2A route never returns raw action payloads");

for (const requiredSection of [
  "## Purpose",
  "## Reviewed Harness Decision",
  "## Existing Route Check",
  "## Harness Route Contract",
  "## Sanitized Output Shape",
  "## Approval-Gated Execution Preflight",
  "## What This Proves",
  "## What This Does Not Prove",
  "## Unchecked Scope And Residual Risk",
  "## Completion Verification"
]) {
  assert.match(evidenceDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G2A doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "PL-G2A",
  "reviewed harness implementation/preflight",
  "inert unless `COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED` matches the approval label",
  "approval header `x-comment-translator-harness-approval`",
  "private launch allowed-tester gate",
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorLockedWaitlistAction",
  "recordCommentTranslatorCreatorLockedClickAction",
  "action name, status label, count, unavailable reason, pass/fail",
  "no raw action payload",
  "no cookie values",
  "no Authorization header values",
  "no provider target metadata",
  "no liveChatId",
  "no browser storage",
  "no session Start",
  "no provider target lookup",
  "no liveChatMessages.list",
  "no Azure/OpenAI provider execution",
  "no deploy/upload",
  "no remote Supabase mutation/schema apply",
  "no Stripe",
  "public-release capable: no"
]) {
  assert.match(evidenceDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G2A doc includes ${requiredFragment}`);
}

assert.match(
  allowedTesterPreflight,
  /\/api\/comment-translator\/free-beta\/route-api-harness/i,
  "FB-L3 preflight points to the reviewed PL-G2A harness route"
);
assert.match(
  allowedTesterEvidence,
  /PL-G2A[\s\S]*server action route\/API harness/i,
  "FB-L3 evidence records the PL-G2A harness implementation"
);
assert.match(
  publicUsabilityPreflight,
  /PL-G2A[\s\S]*server action route\/API harness/i,
  "FB-L1 preflight records the PL-G2A harness bridge"
);
assert.match(gapAudit, /PL-G2A[\s\S]*server action route\/API harness/i, "gap audit records PL-G2A");
assert.match(
  task,
  /operator_production_harness_block_status=pass-production-404/i,
  "task.md records the current production harness block"
);
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

for (const [label, source] of [
  [routePath, routeSource],
  [evidenceDocPath, evidenceDoc],
  [allowedTesterEvidencePath, allowedTesterEvidence],
  [allowedTesterPreflightPath, allowedTesterPreflight],
  [publicUsabilityPreflightPath, publicUsabilityPreflight],
  [gapAuditPath, gapAudit],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  routePath,
  evidenceDocPath,
  allowedTesterEvidencePath,
  allowedTesterPreflightPath,
  publicUsabilityPreflightPath,
  gapAuditPath,
  taskPath,
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md",
  "scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2a-server-action-route-api-harness-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-monthly-input-character-accounting-contract.mjs",
  "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
  "scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G2A change stays in allowed files: ${file}`);
  if (file.endsWith(".mjs")) continue;
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G2A server action route/API harness contract checks passed");
