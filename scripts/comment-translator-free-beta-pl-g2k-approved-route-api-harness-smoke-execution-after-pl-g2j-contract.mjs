import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG2kDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2K_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2J.md";
const plG2jDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2J_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2I.md";
const plG2iDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2I_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2H.md";
const allowedTesterEvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md";
const allowedTesterPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md";
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
  plG2kDocPath,
  plG2jDocPath,
  plG2iDocPath,
  allowedTesterEvidencePath,
  allowedTesterPreflightPath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  routeHarnessPath,
  sessionRoutePath,
  actionsPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G2K required path exists: ${requiredPath}`);
}

const plG2kDoc = read(plG2kDocPath);
const plG2jDoc = read(plG2jDocPath);
const plG2iDoc = read(plG2iDocPath);
const allowedTesterEvidence = read(allowedTesterEvidencePath);
const allowedTesterPreflight = read(allowedTesterPreflightPath);
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
  assert.match(plG2kDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G2K doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G2K approved allowed-tester route/API harness smoke execution after PL-G2J",
  "Public-release capable: no",
  "Execution result: approved sanitized route/API harness smoke passed",
  "Authenticated allowed-tester route/API harness smoke execution: passed / approved-sanitized-output",
  "Exact approval label: present",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "deployed origin reference ready: ready",
  "allowed-tester cookie/session reference ready: ready",
  "harness env gate reference ready: ready",
  "sanitized output shape reviewed: present",
  "readiness check result: ready",
  "pl-g2k-status-route-smoke",
  "HTTP 200",
  "session status label: not-started",
  "pl-g2k-harness-route-smoke",
  "harness status label: passed",
  "count: 4",
  "getCommentTranslatorRealCommentsFeedAction",
  "live-provider-polling-not-approved",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorLockedWaitlistAction",
  "recordCommentTranslatorCreatorLockedClickAction",
  "recorded-local-draft",
  "pass: true",
  "POST /api/comment-translator/session",
  "{\"intent\":\"status\"}",
  "POST /api/comment-translator/free-beta/route-api-harness",
  "real comments feed",
  "data deletion readiness",
  "Creator locked waitlist",
  "Creator locked click draft",
  "remote-apply-and-deployed-smoke-completed",
  "PL-G2J execution",
  "PL-G3 follow-up blocker",
  "PL-G4 follow-up blocker",
  "PL-G5 follow-up blocker/decision",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "counts/status/stop reasons",
  "no browser storage expansion",
  "no handoff payload expansion",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(plG2kDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G2K doc includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
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
  assert.doesNotMatch(plG2kDoc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G2K doc excludes ${forbiddenFragment}`);
}

assert.match(plG2jDoc, /blocked-missing-operator-local-reference-readiness/i, "PL-G2J records readiness blocker");
assert.match(plG2iDoc, /blocked-missing-operator-local-reference-readiness/i, "PL-G2I records readiness blocker");
assert.match(allowedTesterEvidence, /PL-G2K[\s\S]*approved sanitized route\/API harness smoke passed/i, "FB-L3 evidence records PL-G2K passing smoke");
assert.match(allowedTesterPreflight, /approved-fb-l3-allowed-tester-route-api-smoke/i, "FB-L3 ready preflight keeps approval label");
assert.match(publicUsabilityPreflight, /PL-G2K[\s\S]*allowed-tester route\/API harness smoke/i, "FB-L1 preflight records PL-G2K");
assert.match(finalQa, /PL-G2K[\s\S]*approved sanitized route\/API harness smoke passed/i, "F15 readiness records PL-G2K passing smoke");
assert.match(gapAudit, /PL-G2K[\s\S]*allowed-tester route\/API harness smoke/i, "gap audit records PL-G2K");

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
  /Current branch: `codex\/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j`/i,
  "task.md records PL-G2K branch"
);
assert.match(task, /Latest PL-G2K Execution Evidence/i, "task.md records Latest PL-G2K Execution Evidence");
assert.match(task, /PL-G2K execution[\s\S]*approved sanitized route\/API harness smoke passed/i, "task.md records PL-G2K passing execution");
assert.match(task, /Exact approval label[\s\S]*present/i, "task.md records PL-G2K approval label as present");
assert.match(task, /deployed origin reference ready[\s\S]*ready/i, "task.md records ready deployed origin reference");
assert.match(task, /allowed-tester cookie\/session reference ready[\s\S]*ready/i, "task.md records ready cookie/session reference");
assert.match(task, /harness env gate reference ready[\s\S]*ready/i, "task.md records ready harness env gate reference");
assert.match(
  task,
  /status route smoke[\s\S]*HTTP 200[\s\S]*not-started[\s\S]*pass true/i,
  "task.md records sanitized status route smoke output"
);
assert.match(
  task,
  /harness route smoke[\s\S]*HTTP 200[\s\S]*passed[\s\S]*count 4[\s\S]*pass true/i,
  "task.md records sanitized harness route smoke output"
);
assert.match(
  task,
  /getCommentTranslatorRealCommentsFeedAction[\s\S]*live-provider-polling-not-approved[\s\S]*requestCommentTranslatorDataDeletionAction[\s\S]*getCommentTranslatorCreatorLockedWaitlistAction[\s\S]*recordCommentTranslatorCreatorLockedClickAction/i,
  "task.md records sanitized harness action output"
);
assert.match(task, /unchecked scope[\s\S]*session Start/i, "task.md records remaining unchecked scope");
assert.match(task, /residual risk[\s\S]*PL-G3[\s\S]*PL-G4[\s\S]*PL-G5/i, "task.md records residual risk after PL-G2K pass");
assert.match(task, /Next safe action[\s\S]*keep public gate blocked[\s\S]*PL-G3[\s\S]*PL-G4[\s\S]*PL-G5/i, "task.md records next safe action after PL-G2K pass");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records PL-G2K width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

for (const [label, source] of [
  [plG2kDocPath, plG2kDoc],
  [plG2jDocPath, plG2jDoc],
  [plG2iDocPath, plG2iDoc],
  [allowedTesterEvidencePath, allowedTesterEvidence],
  [allowedTesterPreflightPath, allowedTesterPreflight],
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
  plG2kDocPath,
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
  "scripts/comment-translator-free-beta-pl-g2i-approved-route-api-harness-smoke-execution-after-pl-g2h-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2j-approved-route-api-harness-smoke-execution-after-pl-g2i-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G2K execution change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G2K approved route/API harness smoke execution contract checks passed");
