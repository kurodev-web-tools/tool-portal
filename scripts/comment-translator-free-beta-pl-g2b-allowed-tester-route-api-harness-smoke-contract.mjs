import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG2bDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2B_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE.md";
const plG2cDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2C_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EVIDENCE.md";
const plG2aDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2A_SERVER_ACTION_ROUTE_API_HARNESS.md";
const allowedTesterEvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md";
const allowedTesterPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md";
const publicUsabilityPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const plG1EvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md";
const finalQaPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const routeHarnessPath = "app/api/comment-translator/free-beta/route-api-harness/route.ts";
const sessionRoutePath = "app/api/comment-translator/session/route.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  plG2bDocPath,
  plG2aDocPath,
  allowedTesterEvidencePath,
  allowedTesterPreflightPath,
  publicUsabilityPreflightPath,
  plG1EvidencePath,
  finalQaPath,
  gapAuditPath,
  routeHarnessPath,
  sessionRoutePath,
  actionsPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G2B required path exists: ${requiredPath}`);
}

const plG2bDoc = read(plG2bDocPath);
const plG2aDoc = read(plG2aDocPath);
const allowedTesterEvidence = read(allowedTesterEvidencePath);
const allowedTesterPreflight = read(allowedTesterPreflightPath);
const publicUsabilityPreflight = read(publicUsabilityPreflightPath);
const plG1Evidence = read(plG1EvidencePath);
const finalQa = read(finalQaPath);
const gapAudit = read(gapAuditPath);
const routeHarness = read(routeHarnessPath);
const sessionRoute = read(sessionRoutePath);
const actions = read(actionsPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Route And Harness Boundary",
  "## Sanitized Evidence Shape",
  "## Blocker Evidence",
  "## Ready Preflight For Later Execution",
  "## What This Proves",
  "## What This Does Not Prove",
  "## Unchecked Scope And Residual Risk",
  "## Next Safe Action",
  "## Completion Verification"
]) {
  assert.match(plG2bDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G2B doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G2B allowed-tester route/API harness smoke execution preflight/evidence",
  "Public-release capable: no",
  "Execution result: blocked-no-approval",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED",
  "x-comment-translator-harness-approval",
  "POST /api/comment-translator/session",
  "{\"intent\":\"status\"}",
  "POST /api/comment-translator/free-beta/route-api-harness",
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorLockedWaitlistAction",
  "recordCommentTranslatorCreatorLockedClickAction",
  "command label",
  "route/action name",
  "HTTP status",
  "session/feed/deletion/Creator locked status label",
  "count",
  "stop reason",
  "unavailable reason",
  "pass/fail",
  "not-run / approval-gated",
  "blocked-no-approval",
  "blocked-missing-env-or-operator-local-references",
  "next safe action",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(plG2bDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G2B doc includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "startCommentTranslatorSessionAction",
  "stopCommentTranslatorSessionAction",
  "heartbeatCommentTranslatorSessionAction",
  "provider target lookup execution: completed",
  "liveChatMessages.list execution: completed",
  "Azure execution: completed",
  "remote Supabase mutation: completed",
  "deploy/upload: completed",
  "public launch gate flip: completed"
]) {
  assert.doesNotMatch(plG2bDoc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G2B doc excludes ${forbiddenFragment}`);
}

for (const requiredFragment of [
  "COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "x-comment-translator-harness-approval",
  "readCommentTranslatorPrivateLaunchAccess",
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorLockedWaitlistAction",
  "recordCommentTranslatorCreatorLockedClickAction",
  "action",
  "pass",
  "status",
  "count",
  "unavailableReason"
]) {
  assert.match(routeHarness, new RegExp(escaped(requiredFragment)), `PL-G2B route harness still includes ${requiredFragment}`);
}

assert.doesNotMatch(routeHarness, /return NextResponse\.json\(\s*(feed|state|draft|deletion)/, "PL-G2B harness does not return raw action payloads");
assert.match(sessionRoute, /readSessionCommand[\s\S]*normalizeCommandBody[\s\S]*intent[\s\S]*status/, "PL-G2B status route accepts status intent");
assert.match(sessionRoute, /readCommentTranslatorPrivateLaunchAccess[\s\S]*status:\s*403/, "PL-G2B status route remains private-launch gated");
assert.match(actions, /getCommentTranslatorRealCommentsFeedAction[\s\S]*live-provider-polling-not-approved/, "PL-G2B feed action remains provider-unavailable");
assert.match(actions, /requestCommentTranslatorDataDeletionAction/, "PL-G2B deletion action surface exists");
assert.match(actions, /getCommentTranslatorCreatorLockedWaitlistAction/, "PL-G2B Creator locked waitlist action surface exists");
assert.match(actions, /recordCommentTranslatorCreatorLockedClickAction/, "PL-G2B Creator locked click action surface exists");

assert.match(plG2aDoc, /PL-G2A[\s\S]*deployed allowed-tester harness execution remains not-run \/ approval-gated/i, "PL-G2A leaves deployed execution to PL-G2B");
assert.match(allowedTesterEvidence, /PL-G2B[\s\S]*blocked-no-approval/i, "FB-L3 evidence records PL-G2B blocker");
assert.match(allowedTesterPreflight, /PL-G2B[\s\S]*approved-fb-l3-allowed-tester-route-api-smoke/i, "FB-L3 ready preflight records PL-G2B approval label");
assert.match(publicUsabilityPreflight, /PL-G2B[\s\S]*route\/API harness smoke/i, "FB-L1 public usability preflight records PL-G2B");
assert.match(plG1Evidence, /PL-G2[\s\S]*route\/API surfaces/i, "PL-G1 evidence keeps PL-G2 as separate proof");
assert.match(finalQa, /PL-G2B[\s\S]*blocked-no-approval/i, "F15 readiness records PL-G2B blocker");
assert.match(gapAudit, /PL-G2B[\s\S]*allowed-tester route\/API harness smoke/i, "gap audit records PL-G2B");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g2(?:b-allowed-tester-route-api-harness-smoke|c-route-api-harness-smoke-evidence|d-route-api-harness-smoke-follow-up-after-pl-g5)`/i,
  "task.md records PL-G2B, PL-G2C, or PL-G2D branch"
);
assert.match(task, /Latest PL-G2B Evidence/i, "task.md records Latest PL-G2B Evidence");
assert.match(task, /Execution result: blocked-no-approval/i, "task.md records PL-G2B blocked result");
assert.match(task, /approved-fb-l3-allowed-tester-route-api-smoke/i, "task.md records PL-G2B approval label");
assert.match(task, /unchecked scope[\s\S]*authenticated allowed-tester route\/API smoke execution/i, "task.md records unchecked route/API scope");
assert.match(task, /residual risk[\s\S]*PL-G2 remains incomplete/i, "task.md records PL-G2 residual risk");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records PL-G2B width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

for (const [label, source] of [
  [plG2bDocPath, plG2bDoc],
  [plG2aDocPath, plG2aDoc],
  [allowedTesterEvidencePath, allowedTesterEvidence],
  [allowedTesterPreflightPath, allowedTesterPreflight],
  [publicUsabilityPreflightPath, publicUsabilityPreflight],
  [plG1EvidencePath, plG1Evidence],
  [finalQaPath, finalQa],
  [gapAuditPath, gapAudit],
  [routeHarnessPath, routeHarness],
  [sessionRoutePath, sessionRoute],
  [actionsPath, actions],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG2bDocPath,
  plG2cDocPath,
  allowedTesterEvidencePath,
  allowedTesterPreflightPath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath,
  "scripts/comment-translator-free-beta-pl-g2b-allowed-tester-route-api-harness-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2c-allowed-tester-route-api-harness-smoke-evidence-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2D_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EVIDENCE_FOLLOW_UP_AFTER_PL_G5.md",
  "scripts/comment-translator-free-beta-pl-g2d-route-api-harness-smoke-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G2B change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G2B allowed-tester route/API harness smoke contract checks passed");
