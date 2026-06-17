import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const followUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2D_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EVIDENCE_FOLLOW_UP_AFTER_PL_G5.md";
const plG2cDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2C_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EVIDENCE.md";
const plG2bDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2B_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE.md";
const plG2aDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2A_SERVER_ACTION_ROUTE_API_HARNESS.md";
const allowedTesterEvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md";
const allowedTesterPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md";
const plG5FollowUpPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md";
const plG5DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md";
const plG4FollowUpPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md";
const plG3FollowUpPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_EVIDENCE_FOLLOW_UP.md";
const plG1EvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md";
const publicUsabilityPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
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
  followUpDocPath,
  plG2cDocPath,
  plG2bDocPath,
  plG2aDocPath,
  allowedTesterEvidencePath,
  allowedTesterPreflightPath,
  plG5FollowUpPath,
  plG5DocPath,
  plG4FollowUpPath,
  plG3FollowUpPath,
  plG1EvidencePath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  routeHarnessPath,
  sessionRoutePath,
  actionsPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G2D required path exists: ${requiredPath}`);
}

const followUpDoc = read(followUpDocPath);
const plG2cDoc = read(plG2cDocPath);
const plG2bDoc = read(plG2bDocPath);
const plG2aDoc = read(plG2aDocPath);
const allowedTesterEvidence = read(allowedTesterEvidencePath);
const allowedTesterPreflight = read(allowedTesterPreflightPath);
const plG5FollowUp = read(plG5FollowUpPath);
const plG5Doc = read(plG5DocPath);
const plG4FollowUp = read(plG4FollowUpPath);
const plG3FollowUp = read(plG3FollowUpPath);
const plG1Evidence = read(plG1EvidencePath);
const publicUsabilityPreflight = read(publicUsabilityPreflightPath);
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
  "## Evidence Status Matrix",
  "## Sanitized Evidence Shape",
  "## Blocker Evidence",
  "## Ready Preflight For Later Execution",
  "## What This Proves",
  "## What This Does Not Prove",
  "## Unchecked Scope And Residual Risk",
  "## Next Safe Action",
  "## Completion Verification"
]) {
  assert.match(followUpDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G2D doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G2D allowed-tester route/API harness smoke evidence follow-up after PL-G5 follow-up",
  "Public-release capable: no",
  "Execution result: keep blocked / blocked-no-approval",
  "This prompt is not exact approval",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "operator-local env references",
  "POST /api/comment-translator/session",
  "{\"intent\":\"status\"}",
  "POST /api/comment-translator/free-beta/route-api-harness",
  "PL-G1 remote durable enforcement",
  "remote-apply-and-deployed-smoke-completed",
  "PL-G2C prior blocker",
  "PL-G3 follow-up blocker",
  "PL-G4 follow-up blocker",
  "PL-G5 follow-up blocker/decision",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "blocked-no-approval / not-run / approval-gated",
  "counts/status/stop reasons",
  "no browser storage expansion",
  "no handoff payload expansion",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(followUpDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G2D doc includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "status route smoke: completed",
  "harness route smoke: completed",
  "session Start: completed",
  "Stop mutation: completed",
  "heartbeat mutation: completed",
  "provider target lookup: completed",
  "liveChatMessages.list: completed",
  "Azure/OpenAI provider execution: completed",
  "production/custom deployed smoke: completed",
  "limited public beta open: completed",
  "public access change: completed",
  "public launch gate flip: completed",
  "remote Supabase mutation: completed",
  "deploy/upload: completed",
  "Stripe action: completed"
]) {
  assert.doesNotMatch(followUpDoc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G2D doc excludes ${forbiddenFragment}`);
}

assert.match(plG2cDoc, /keep blocked \/ blocked-no-approval/i, "PL-G2C prior blocker stays blocked");
assert.match(plG2bDoc, /blocked-no-approval[\s\S]*not-run \/ approval-gated/i, "PL-G2B prior blocker stays blocked/gated");
assert.match(plG2aDoc, /POST \/api\/comment-translator\/free-beta\/route-api-harness/i, "PL-G2A harness route remains reviewed");
assert.match(allowedTesterEvidence, /PL-G2D[\s\S]*keep blocked \/ blocked-no-approval/i, "FB-L3 evidence records PL-G2D follow-up");
assert.match(allowedTesterPreflight, /approved-fb-l3-allowed-tester-route-api-smoke/i, "FB-L3 ready preflight keeps approval label");
assert.match(plG5FollowUp, /PL-G2C prior blocker[\s\S]*keep blocked \/ blocked-no-approval/i, "PL-G5 follow-up keeps PL-G2C blocker");
assert.match(plG5Doc, /keep blocked \/ blocked-no-approval/i, "PL-G5 decision stays blocked");
assert.match(plG4FollowUp, /keep blocked \/ blocked-no-approval/i, "PL-G4 follow-up stays blocked");
assert.match(plG3FollowUp, /keep blocked \/ blocked-no-approval/i, "PL-G3 follow-up stays blocked");
assert.match(plG1Evidence, /remote-apply-and-deployed-smoke-completed/i, "PL-G1 evidence remains completed");
assert.match(publicUsabilityPreflight, /PL-G2D[\s\S]*allowed-tester route\/API harness smoke/i, "FB-L1 public usability preflight records PL-G2D");
assert.match(finalQa, /PL-G2D[\s\S]*keep blocked \/ blocked-no-approval/i, "F15 readiness records PL-G2D follow-up");
assert.match(gapAudit, /PL-G2D[\s\S]*allowed-tester route\/API harness smoke/i, "gap audit records PL-G2D");

assert.match(routeHarness, /COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED/, "PL-G2D route harness remains env-gated");
assert.match(routeHarness, /x-comment-translator-harness-approval/, "PL-G2D route harness remains approval-header gated");
assert.match(routeHarness, /readCommentTranslatorPrivateLaunchAccess[\s\S]*status:\s*403/, "PL-G2D route harness remains private-launch gated");
assert.match(routeHarness, /getCommentTranslatorRealCommentsFeedAction/, "PL-G2D route harness includes feed action");
assert.match(routeHarness, /requestCommentTranslatorDataDeletionAction/, "PL-G2D route harness includes deletion action");
assert.match(routeHarness, /getCommentTranslatorCreatorLockedWaitlistAction/, "PL-G2D route harness includes Creator locked waitlist action");
assert.match(routeHarness, /recordCommentTranslatorCreatorLockedClickAction/, "PL-G2D route harness includes Creator locked click action");
assert.doesNotMatch(routeHarness, /return NextResponse\.json\(\s*(feed|state|draft|deletion)/, "PL-G2D harness does not return raw action payloads");
assert.match(sessionRoute, /readSessionCommand[\s\S]*normalizeCommandBody[\s\S]*intent[\s\S]*status/, "PL-G2D status route accepts status intent");
assert.match(sessionRoute, /readCommentTranslatorPrivateLaunchAccess[\s\S]*status:\s*403/, "PL-G2D status route remains private-launch gated");
assert.match(actions, /getCommentTranslatorRealCommentsFeedAction[\s\S]*live-provider-polling-not-approved/, "PL-G2D feed action remains provider-unavailable");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g2(?:d-route-api-harness-smoke-follow-up-after-pl-g5|e-route-api-harness-smoke-execution-gate-after-pl-g2d|f-route-api-harness-smoke-execution-gate-after-pl-g2e)`/i,
  "task.md records PL-G2D, PL-G2E, or PL-G2F branch"
);
assert.match(task, /Latest PL-G2D Follow-up Evidence/i, "task.md records Latest PL-G2D Follow-up Evidence");
assert.match(task, /PL-G2D follow-up[\s\S]*keep blocked \/ blocked-no-approval/i, "task.md records PL-G2D blocked result");
assert.match(task, /PL-G1 remote durable enforcement[\s\S]*remote-apply-and-deployed-smoke-completed/i, "task.md records PL-G1 completed status");
assert.match(task, /PL-G2C prior blocker[\s\S]*keep blocked \/ blocked-no-approval/i, "task.md records PL-G2C prior blocker status");
assert.match(task, /PL-G3 follow-up blocker[\s\S]*keep blocked \/ blocked-no-approval/i, "task.md records PL-G3 blocker status");
assert.match(task, /PL-G4 follow-up blocker[\s\S]*keep blocked \/ blocked-no-approval/i, "task.md records PL-G4 blocker status");
assert.match(task, /PL-G5 follow-up blocker\/decision[\s\S]*keep blocked \/ blocked-no-approval/i, "task.md records PL-G5 blocker/decision status");
assert.match(task, /public gate state label: unchanged \/ blocked/i, "task.md records unchanged public gate state label");
assert.match(task, /public-release capable label: no/i, "task.md records public-release capable label");
assert.match(task, /Next safe action[\s\S]*keep PL-G2 blocked[\s\S]*approved-fb-l3-allowed-tester-route-api-smoke/i, "task.md records PL-G2D next safe action");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records PL-G2D width-check skip reason");

for (const [label, source] of [
  [followUpDocPath, followUpDoc],
  [plG2cDocPath, plG2cDoc],
  [plG2bDocPath, plG2bDoc],
  [plG2aDocPath, plG2aDoc],
  [allowedTesterEvidencePath, allowedTesterEvidence],
  [allowedTesterPreflightPath, allowedTesterPreflight],
  [plG5FollowUpPath, plG5FollowUp],
  [plG5DocPath, plG5Doc],
  [plG4FollowUpPath, plG4FollowUp],
  [plG3FollowUpPath, plG3FollowUp],
  [plG1EvidencePath, plG1Evidence],
  [publicUsabilityPreflightPath, publicUsabilityPreflight],
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
  followUpDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2E_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_GATE_AFTER_PL_G2D.md",
  allowedTesterEvidencePath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath,
  "scripts/comment-translator-free-beta-pl-g2b-allowed-tester-route-api-harness-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2c-allowed-tester-route-api-harness-smoke-evidence-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2d-route-api-harness-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2e-route-api-harness-smoke-execution-gate-after-pl-g2d-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2F_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_GATE_AFTER_PL_G2E.md",
  "scripts/comment-translator-free-beta-pl-g2f-route-api-harness-smoke-execution-gate-after-pl-g2e-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G2D follow-up change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G2D route/API harness smoke evidence follow-up contract checks passed");
