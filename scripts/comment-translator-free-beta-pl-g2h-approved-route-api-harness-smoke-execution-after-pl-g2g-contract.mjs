import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG2hDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2H_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2G.md";
const plG2gDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2G_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2F.md";
const plG2fDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2F_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_GATE_AFTER_PL_G2E.md";
const plG2eDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2E_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_GATE_AFTER_PL_G2D.md";
const plG2dDocPath =
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
  plG2hDocPath,
  plG2gDocPath,
  plG2fDocPath,
  plG2eDocPath,
  plG2dDocPath,
  plG2cDocPath,
  plG2bDocPath,
  plG2aDocPath,
  allowedTesterEvidencePath,
  allowedTesterPreflightPath,
  plG5FollowUpPath,
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
  assert.ok(exists(requiredPath), `PL-G2H required path exists: ${requiredPath}`);
}

const plG2hDoc = read(plG2hDocPath);
const plG2gDoc = read(plG2gDocPath);
const plG2fDoc = read(plG2fDocPath);
const plG2eDoc = read(plG2eDocPath);
const plG2dDoc = read(plG2dDocPath);
const plG2cDoc = read(plG2cDocPath);
const plG2bDoc = read(plG2bDocPath);
const plG2aDoc = read(plG2aDocPath);
const allowedTesterEvidence = read(allowedTesterEvidencePath);
const allowedTesterPreflight = read(allowedTesterPreflightPath);
const plG5FollowUp = read(plG5FollowUpPath);
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
  assert.match(plG2hDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G2H doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G2H approved allowed-tester route/API harness smoke execution after PL-G2G",
  "Public-release capable: no",
  "Execution result: keep blocked / blocked-missing-operator-local-reference-readiness",
  "Exact approval label: present",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "deployed origin reference ready: missing",
  "allowed-tester cookie/session reference ready: missing",
  "harness env gate reference ready: missing",
  "sanitized output shape reviewed: present",
  "readiness check result: blocked-missing-operator-local-reference-readiness",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "same-thread ready preflight",
  "sanitized output review",
  "operator-local reference readiness",
  "POST /api/comment-translator/session",
  "{\"intent\":\"status\"}",
  "POST /api/comment-translator/free-beta/route-api-harness",
  "real comments feed",
  "data deletion readiness",
  "Creator locked waitlist",
  "Creator locked click draft",
  "PL-G1 remote durable enforcement",
  "remote-apply-and-deployed-smoke-completed",
  "PL-G2G execution",
  "PL-G2F execution gate",
  "PL-G3 follow-up blocker",
  "PL-G4 follow-up blocker",
  "PL-G5 follow-up blocker/decision",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "blocked-missing-operator-local-reference-readiness / not-run / approval-gated",
  "counts/status/stop reasons",
  "no browser storage expansion",
  "no handoff payload expansion",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(plG2hDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G2H doc includes ${requiredFragment}`);
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
  assert.doesNotMatch(plG2hDoc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G2H doc excludes ${forbiddenFragment}`);
}

assert.match(plG2gDoc, /keep blocked \/ blocked-no-approval/i, "PL-G2G stays blocked");
assert.match(plG2fDoc, /keep blocked \/ blocked-no-approval/i, "PL-G2F stays blocked");
assert.match(plG2eDoc, /keep blocked \/ blocked-no-approval/i, "PL-G2E stays blocked");
assert.match(plG2dDoc, /keep blocked \/ blocked-no-approval/i, "PL-G2D stays blocked");
assert.match(plG2cDoc, /keep blocked \/ blocked-no-approval/i, "PL-G2C stays blocked");
assert.match(plG2bDoc, /blocked-no-approval[\s\S]*not-run \/ approval-gated/i, "PL-G2B stays blocked/gated");
assert.match(plG2aDoc, /POST \/api\/comment-translator\/free-beta\/route-api-harness/i, "PL-G2A harness route remains reviewed");
assert.match(allowedTesterEvidence, /PL-G2H[\s\S]*blocked-missing-operator-local-reference-readiness/i, "FB-L3 evidence records PL-G2H");
assert.match(allowedTesterPreflight, /approved-fb-l3-allowed-tester-route-api-smoke/i, "FB-L3 ready preflight keeps approval label");
assert.match(plG5FollowUp, /keep blocked \/ blocked-no-approval/i, "PL-G5 follow-up stays blocked");
assert.match(plG4FollowUp, /keep blocked \/ blocked-no-approval/i, "PL-G4 follow-up stays blocked");
assert.match(plG3FollowUp, /keep blocked \/ blocked-no-approval/i, "PL-G3 follow-up stays blocked");
assert.match(plG1Evidence, /remote-apply-and-deployed-smoke-completed/i, "PL-G1 evidence remains completed");
assert.match(publicUsabilityPreflight, /PL-G2H[\s\S]*allowed-tester route\/API harness smoke/i, "FB-L1 preflight records PL-G2H");
assert.match(finalQa, /PL-G2H[\s\S]*blocked-missing-operator-local-reference-readiness/i, "F15 readiness records PL-G2H");
assert.match(gapAudit, /PL-G2H[\s\S]*allowed-tester route\/API harness smoke/i, "gap audit records PL-G2H");

assert.match(routeHarness, /COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED/, "route harness remains env-gated");
assert.match(routeHarness, /x-comment-translator-harness-approval/, "route harness remains approval-header gated");
assert.match(routeHarness, /readCommentTranslatorPrivateLaunchAccess[\s\S]*status:\s*403/, "route harness remains private-launch gated");
assert.match(routeHarness, /getCommentTranslatorRealCommentsFeedAction/, "route harness includes feed action");
assert.match(routeHarness, /requestCommentTranslatorDataDeletionAction/, "route harness includes deletion action");
assert.match(routeHarness, /getCommentTranslatorCreatorLockedWaitlistAction/, "route harness includes Creator locked waitlist action");
assert.match(routeHarness, /recordCommentTranslatorCreatorLockedClickAction/, "route harness includes Creator locked click action");
assert.doesNotMatch(routeHarness, /return NextResponse\.json\(\s*(feed|state|draft|deletion)/, "harness does not return raw action payloads");
assert.match(sessionRoute, /readSessionCommand[\s\S]*normalizeCommandBody[\s\S]*intent[\s\S]*status/, "status route accepts status intent");
assert.match(sessionRoute, /readCommentTranslatorPrivateLaunchAccess[\s\S]*status:\s*403/, "status route remains private-launch gated");
assert.match(actions, /getCommentTranslatorRealCommentsFeedAction[\s\S]*live-provider-polling-not-approved/, "feed action remains provider-unavailable");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g2(?:h-approved-route-api-harness-smoke-execution-after-pl-g2g|i-approved-route-api-harness-smoke-execution-after-pl-g2h|j-approved-route-api-harness-smoke-execution-after-pl-g2i)`/i,
  "task.md records PL-G2H PL-G2I, or PL-G2J branch"
);
assert.match(task, /Latest PL-G2H Execution Evidence/i, "task.md records Latest PL-G2H Execution Evidence");
assert.match(
  task,
  /PL-G2H execution[\s\S]*blocked-missing-operator-local-reference-readiness/i,
  "task.md records PL-G2H readiness blocker"
);
assert.match(task, /Exact approval label[\s\S]*present/i, "task.md records PL-G2H approval label as present");
assert.match(task, /deployed origin reference ready[\s\S]*missing/i, "task.md records missing deployed origin reference");
assert.match(task, /allowed-tester cookie\/session reference ready[\s\S]*missing/i, "task.md records missing cookie/session reference");
assert.match(task, /harness env gate reference ready[\s\S]*missing/i, "task.md records missing harness env gate reference");
assert.match(
  task,
  /status route smoke[\s\S]*blocked-missing-operator-local-reference-readiness \/ not-run \/ approval-gated/i,
  "task.md records blocked status route smoke"
);
assert.match(
  task,
  /harness route smoke[\s\S]*blocked-missing-operator-local-reference-readiness \/ not-run \/ approval-gated/i,
  "task.md records blocked harness route smoke"
);
assert.match(task, /unchecked scope[\s\S]*authenticated allowed-tester route\/API smoke execution/i, "task.md records unchecked route/API scope");
assert.match(task, /residual risk[\s\S]*PL-G2 remains incomplete/i, "task.md records PL-G2H residual risk");
assert.match(task, /Next safe action[\s\S]*keep PL-G2 blocked[\s\S]*approved-fb-l3-allowed-tester-route-api-smoke/i, "task.md records PL-G2G next safe action");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records PL-G2H width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

for (const [label, source] of [
  [plG2hDocPath, plG2hDoc],
  [plG2gDocPath, plG2gDoc],
  [plG2fDocPath, plG2fDoc],
  [plG2eDocPath, plG2eDoc],
  [plG2dDocPath, plG2dDoc],
  [plG2cDocPath, plG2cDoc],
  [plG2bDocPath, plG2bDoc],
  [plG2aDocPath, plG2aDoc],
  [allowedTesterEvidencePath, allowedTesterEvidence],
  [allowedTesterPreflightPath, allowedTesterPreflight],
  [plG5FollowUpPath, plG5FollowUp],
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
  "scripts/comment-translator-free-beta-pl-g2j-approved-route-api-harness-smoke-execution-after-pl-g2i-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2J_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2I.md",
  plG2hDocPath,
  plG2gDocPath,
  allowedTesterEvidencePath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath,
  "scripts/comment-translator-free-beta-pl-g2b-allowed-tester-route-api-harness-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2c-allowed-tester-route-api-harness-smoke-evidence-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2d-route-api-harness-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2e-route-api-harness-smoke-execution-gate-after-pl-g2d-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2f-route-api-harness-smoke-execution-gate-after-pl-g2e-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2g-route-api-harness-smoke-execution-after-pl-g2f-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2h-approved-route-api-harness-smoke-execution-after-pl-g2g-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2I_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2H.md",
  "scripts/comment-translator-free-beta-pl-g2i-approved-route-api-harness-smoke-execution-after-pl-g2h-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G2H execution change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G2H approved route/API harness smoke execution contract checks passed");
