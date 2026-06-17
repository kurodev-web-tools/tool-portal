import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const evidenceDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE.md";
const readyPreflightDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_READY_PREFLIGHT.md";
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
const deployedEvidenceDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md";
const deployedPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md";
const finalQaDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const plG5DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md";
const plG5FollowUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md";
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
  evidenceDocPath,
  readyPreflightDocPath,
  publicUsabilityPreflightDocPath,
  remoteDurableEvidenceDocPath,
  remoteDurablePreflightDocPath,
  allowedTesterEvidenceDocPath,
  allowedTesterPreflightDocPath,
  startEvidenceDocPath,
  startPreflightDocPath,
  deployedEvidenceDocPath,
  deployedPreflightDocPath,
  finalQaDocPath,
  gapAuditPath,
  plG5DocPath,
  plG5FollowUpDocPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `FB-L6 required reference exists: ${requiredPath}`);
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
const deployedEvidenceDoc = read(deployedEvidenceDocPath);
const deployedPreflightDoc = read(deployedPreflightDocPath);
const finalQaDoc = read(finalQaDocPath);
const gapAudit = read(gapAuditPath);
const plG5Doc = read(plG5DocPath);
const plG5FollowUpDoc = read(plG5FollowUpDocPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Decision Options",
  "## Evidence Requirements",
  "## Local Contract Boundary",
  "## Sanitized Evidence Record",
  "## Next Safe Action",
  "## Unchecked Scope And Residual Risk",
  "## Completion Verification"
]) {
  assert.match(evidenceDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `FB-L6 evidence doc includes ${requiredSection}`);
}

for (const requiredSection of [
  "## Purpose",
  "## Preconditions",
  "## Exact Command Sequence",
  "## Release-Owner Decision Inputs",
  "## Approval Text",
  "## Sanitized Output Review",
  "## Abort Rules",
  "## Rollback Boundary",
  "## What Approval Would Prove",
  "## What Approval Would Not Prove",
  "## Completion Verification"
]) {
  assert.match(
    readyPreflightDoc,
    new RegExp(`^${escaped(requiredSection)}$`, "m"),
    `FB-L6 ready preflight doc includes ${requiredSection}`
  );
}

for (const requiredFragment of [
  "Status: FB-L6 Public launch gate decision",
  "Public-release capable: no",
  "blocked-no-approval",
  "keep blocked",
  "open limited public beta",
  "flip public gate",
  "release-owner",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "FB-L2 remote durable enforcement",
  "FB-L3 allowed-tester route/API smoke",
  "FB-L4 Start-to-translation smoke",
  "FB-L5 production/custom deployed smoke",
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
  "no handoff payload expansion",
  "public launch gate unchanged"
]) {
  assert.match(evidenceDoc, new RegExp(escaped(requiredFragment), "i"), `FB-L6 evidence doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "Status: FB-L6 public launch gate decision ready preflight",
  "Public-release capable: no",
  "node scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs",
  "approved-fb-l6-keep-blocked-launch-gate-decision",
  "approved-fb-l6-open-limited-public-beta",
  "approved-fb-l6-flip-public-gate",
  "keep blocked",
  "open limited public beta",
  "flip public gate",
  "release-owner",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "no remote Supabase migration apply",
  "no remote mutation",
  "no deploy/upload",
  "no provider target lookup",
  "no liveChatMessages.list",
  "no Azure/OpenAI provider execution",
  "no Stripe",
  "no main promotion"
]) {
  assert.match(
    readyPreflightDoc,
    new RegExp(escaped(requiredFragment), "i"),
    `FB-L6 ready preflight doc includes ${requiredFragment}`
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
  "approved-fb-l4-start-to-translation-smoke",
  "approved-fb-l5-production-custom-deployed-smoke"
]) {
  assert.doesNotMatch(
    readyPreflightDoc,
    new RegExp(escaped(forbiddenFragment), "i"),
    `FB-L6 ready preflight excludes out-of-scope command or prior smoke approval label: ${forbiddenFragment}`
  );
}

assert.match(publicUsabilityPreflightDoc, /FB-L6|Public launch gate decision/i, "FB-L1 preflight points to FB-L6 launch gate decision");
assert.match(finalQaDoc, /FB-L6|Public launch gate decision/i, "F15 readiness doc points to FB-L6 launch gate decision");
assert.match(gapAudit, /FB-L6|Public launch gate decision/i, "gap audit records FB-L6 follow-up");
assert.match(plG5Doc, /keep blocked \/ blocked-no-approval/i, "PL-G5 evidence keeps FB-L6 decision blocked");

assert.match(remoteDurableEvidenceDoc, /blocked-no-approval[\s\S]*public launch gate flip[\s\S]*not-run \/ approval-gated/i, "FB-L2 remains blocked before FB-L6 decision");
assert.match(remoteDurablePreflightDoc, /Approval label: `approved-fb-l2-remote-durable-enforcement-apply-and-smoke`/i, "FB-L2 approval label remains separate");
assert.match(allowedTesterEvidenceDoc, /blocked-no-approval[\s\S]*public launch gate flip[\s\S]*not-run \/ approval-gated/i, "FB-L3 remains blocked before FB-L6 decision");
assert.match(allowedTesterPreflightDoc, /Approval label: `approved-fb-l3-allowed-tester-route-api-smoke`/i, "FB-L3 approval label remains separate");
assert.match(startEvidenceDoc, /blocked-no-approval[\s\S]*public launch gate flip[\s\S]*not-run \/ approval-gated/i, "FB-L4 remains blocked before FB-L6 decision");
assert.match(startPreflightDoc, /Approval label: `approved-fb-l4-start-to-translation-smoke`/i, "FB-L4 approval label remains separate");
assert.match(deployedEvidenceDoc, /blocked-no-approval[\s\S]*public launch gate flip[\s\S]*not-run \/ approval-gated/i, "FB-L5 remains blocked before FB-L6 decision");
assert.match(deployedPreflightDoc, /Approval label: `approved-fb-l5-production-custom-deployed-smoke`/i, "FB-L5 approval label remains separate");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-(?:fb-l6|pl-g5)-public-launch-gate-decision(?:-follow-up-after-pl-g4)?`/i,
  "task.md records FB-L6 or PL-G5 branch"
);
assert.match(task, /FB-L6[\s\S]*Public launch gate decision[\s\S]*(preflight-ready|blocked-no-approval)/i, "task.md records FB-L6 state");
assert.match(task, /Latest FB-L6 Evidence/i, "task.md records Latest FB-L6 Evidence");
assert.match(task, /approved-fb-l6-keep-blocked-launch-gate-decision/i, "task.md records exact keep-blocked approval label");
assert.match(task, /public launch gate unchanged/i, "task.md records unchanged public launch gate");
assert.match(task, /unchecked scope[\s\S]*public launch gate flip/i, "task.md records unchecked public launch gate flip scope");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

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
  [deployedEvidenceDocPath, deployedEvidenceDoc],
  [deployedPreflightDocPath, deployedPreflightDoc],
  [finalQaDocPath, finalQaDoc],
  [gapAuditPath, gapAudit],
  [plG5DocPath, plG5Doc],
  [plG5FollowUpDocPath, plG5FollowUpDoc],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  evidenceDocPath,
  readyPreflightDocPath,
  publicUsabilityPreflightDocPath,
  plG5DocPath,
  plG5FollowUpDocPath,
  finalQaDocPath,
  gapAuditPath,
  taskPath,
  "scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `FB-L6 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta public launch gate decision contract checks passed");
