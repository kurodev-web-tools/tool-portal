import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const followUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md";
const plG5DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md";
const fbL6EvidencePath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE.md";
const fbL6ReadyPreflightPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_READY_PREFLIGHT.md";
const plG4FollowUpPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md";
const fbL5EvidencePath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md";
const plG3FollowUpPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_EVIDENCE_FOLLOW_UP.md";
const plG3ProviderPermissionTriagePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md";
const plG2cPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2C_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EVIDENCE.md";
const plG1Path = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md";
const publicUsabilityPreflightPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const finalQaPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  followUpDocPath,
  plG4FollowUpPath,
  fbL5EvidencePath,
  plG5DocPath,
  fbL6EvidencePath,
  fbL6ReadyPreflightPath,
  plG4FollowUpPath,
  plG3FollowUpPath,
  plG3ProviderPermissionTriagePath,
  plG2cPath,
  plG1Path,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G5 follow-up required path exists: ${requiredPath}`);
}

const followUpDoc = read(followUpDocPath);
const plG5Doc = read(plG5DocPath);
const fbL6Evidence = read(fbL6EvidencePath);
const fbL6ReadyPreflight = read(fbL6ReadyPreflightPath);
const plG4FollowUp = read(plG4FollowUpPath);
const plG3FollowUp = read(plG3FollowUpPath);
const plG3ProviderPermissionTriage = read(plG3ProviderPermissionTriagePath);
const plG2c = read(plG2cPath);
const plG1 = read(plG1Path);
const publicUsabilityPreflight = read(publicUsabilityPreflightPath);
const finalQa = read(finalQaPath);
const gapAudit = read(gapAuditPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Evidence Status Matrix",
  "## Decision Boundary",
  "## Sanitized Evidence Shape",
  "## Blocker Evidence",
  "## What This Proves",
  "## What This Does Not Prove",
  "## Unchecked Scope And Residual Risk",
  "## Next Safe Action",
  "## Completion Verification"
]) {
  assert.match(followUpDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G5 follow-up doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G5 public launch gate decision evidence follow-up after PL-G4 after-PL-G3-provider-permission-triage follow-up",
  "Public-release capable: no",
  "Execution result: keep blocked / blocked-no-approval",
  "This prompt is not release-owner exact approval",
  "approved-fb-l6-keep-blocked-launch-gate-decision",
  "approved-fb-l6-open-limited-public-beta",
  "approved-fb-l6-flip-public-gate",
  "Public gate state label: unchanged / blocked",
  "Public-release capable label: no",
  "PL-G1 remote durable enforcement",
  "remote-apply-and-deployed-smoke-completed",
  "PL-G2C prior blocker",
  "PL-G3 follow-up blocker",
  "PL-G3 provider-permission state",
  "blocked-provider-permission-rejected-after-target-present / Azure-UI-not-run",
  "non-empty intake, Free Azure translation, UI feed confirmation, usage, and source attribution remain unchecked",
  "PL-G4 after-PL-G3-provider-permission-triage follow-up",
  "Production/custom deployed smoke execution remains not-run / approval-gated",
  "cannot prove production/custom deployed smoke readiness without exact same-thread approval and sanitized output review",
  "Existing PL-G5 keep-blocked decision",
  "keep blocked / blocked-no-approval",
  "blocked-no-approval / not-run / approval-gated",
  "limited public beta open",
  "public access change",
  "public launch gate flip",
  "release-owner exact approval plus accepted/completed missing evidence",
  "main promotion",
  "separate reviewed access-change or gate-flip operation",
  "counts/status/stop reasons only",
  "no browser storage expansion",
  "no handoff payload expansion",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(followUpDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G5 follow-up doc includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "limited public beta open: completed",
  "public launch gate flip: completed",
  "public access change: completed",
  "deploy/upload: completed",
  "remote Supabase mutation: completed",
  "session Start: completed",
  "provider target lookup: completed",
  "liveChatMessages.list: completed",
  "Azure/OpenAI provider execution: completed",
  "Stripe action: completed"
]) {
  assert.doesNotMatch(followUpDoc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G5 follow-up doc excludes ${forbiddenFragment}`);
}

assert.match(plG5Doc, /keep blocked \/ blocked-no-approval/i, "existing PL-G5 decision stays blocked");
assert.match(fbL6Evidence, /keep blocked \/ blocked-no-approval/i, "FB-L6 evidence stays blocked");
assert.match(fbL6ReadyPreflight, /approved-fb-l6-keep-blocked-launch-gate-decision/i, "FB-L6 ready preflight keeps keep-blocked label");
assert.match(fbL6ReadyPreflight, /approved-fb-l6-open-limited-public-beta/i, "FB-L6 ready preflight keeps limited-beta label");
assert.match(fbL6ReadyPreflight, /approved-fb-l6-flip-public-gate/i, "FB-L6 ready preflight keeps gate-flip label");
assert.match(plG4FollowUp, /keep blocked \/ blocked-no-approval/i, "PL-G4 follow-up stays blocked");
assert.match(
  plG4FollowUp,
  /blocked-provider-permission-rejected-after-target-present \/ Azure-UI-not-run[\s\S]*cannot prove production\/custom deployed smoke readiness without exact same-thread approval and sanitized output review/i,
  "PL-G4 follow-up records provider-permission blocker and missing smoke readiness proof"
);
assert.match(plG3FollowUp, /keep blocked \/ blocked-no-approval/i, "PL-G3 follow-up stays blocked");
assert.match(
  plG3ProviderPermissionTriage,
  /blocked-provider-permission-rejected-after-target-present/i,
  "PL-G3 provider-permission triage records the provider-permission blocker"
);
assert.match(
  plG3ProviderPermissionTriage,
  /Free Azure translation[\s\S]*not-run \/ approval-gated/i,
  "PL-G3 provider-permission triage records Azure/UI evidence remains gated"
);
assert.match(
  plG3ProviderPermissionTriage,
  /public-release capable label: no/i,
  "PL-G3 provider-permission triage keeps public release blocked"
);
assert.match(plG2c, /keep blocked \/ blocked-no-approval/i, "PL-G2C prior blocker stays blocked");
assert.match(plG1, /remote-apply-and-deployed-smoke-completed/i, "PL-G1 durable boundary stays completed");
assert.match(publicUsabilityPreflight, /PL-G5[\s\S]*keep blocked \/ blocked-no-approval/i, "FB-L1 public usability preflight records PL-G5");
assert.match(finalQa, /PL-G5[\s\S]*keep blocked \/ blocked-no-approval/i, "F15 readiness records PL-G5");
assert.match(gapAudit, /PL-G5[\s\S]*Public launch gate decision/i, "gap audit records PL-G5");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-(?:pl-g5-after-pl-g4-provider-permission-triage-follow-up|pl-g5-public-launch-gate-decision-follow-up-after-pl-g4|pl-g4-after-pl-g3-provider-permission-triage-follow-up)`/i,
  "task.md records PL-G5 follow-up branch"
);
assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g5-after-pl-g4-provider-permission-triage-follow-up`/i,
  "task.md records current PL-G5 after-PL-G4 provider-permission follow-up branch"
);
assert.match(task, /Latest PL-G5 Follow-up Evidence/i, "task.md records Latest PL-G5 Follow-up Evidence");
assert.match(task, /PL-G5 follow-up[\s\S]*keep blocked \/ blocked-no-approval/i, "task.md records PL-G5 follow-up blocked result");
assert.match(
  task,
  /PL-G3 remains blocked-provider-permission-rejected-after-target-present \/ Azure-UI-not-run/i,
  "task.md records PL-G3 provider-permission blocker for this PL-G5 follow-up"
);
assert.match(task, /PL-G4 follow-up blocker[\s\S]*keep blocked \/ blocked-no-approval/i, "task.md records PL-G4 follow-up blocker status");
assert.match(
  task,
  /PL-G4 remains production\/custom deployed smoke not-run \/ approval-gated/i,
  "task.md records PL-G4 production/custom deployed smoke remains not-run and gated"
);
assert.match(
  task,
  /public launch cannot open or flip without release-owner exact approval plus accepted\/completed missing evidence/i,
  "task.md records public launch cannot open or flip without approval and evidence acceptance/completion"
);
assert.match(task, /public gate state label: unchanged \/ blocked/i, "task.md records unchanged public gate state label");
assert.match(task, /public-release capable label: no/i, "task.md records public-release capable label");
assert.match(task, /Next safe action[\s\S]*keep blocked[\s\S]*PL-G2C[\s\S]*PL-G3[\s\S]*PL-G4/i, "task.md records next safe action");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records follow-up width-check skip reason");

for (const [label, source] of [
  [followUpDocPath, followUpDoc],
  [plG5DocPath, plG5Doc],
  [fbL6EvidencePath, fbL6Evidence],
  [fbL6ReadyPreflightPath, fbL6ReadyPreflight],
  [plG4FollowUpPath, plG4FollowUp],
  [plG3FollowUpPath, plG3FollowUp],
  [plG3ProviderPermissionTriagePath, plG3ProviderPermissionTriage],
  [plG2cPath, plG2c],
  [plG1Path, plG1],
  [publicUsabilityPreflightPath, publicUsabilityPreflight],
  [finalQaPath, finalQa],
  [gapAuditPath, gapAudit],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  followUpDocPath,
  plG4FollowUpPath,
  fbL5EvidencePath,
  plG5DocPath,
  fbL6EvidencePath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath,
  "scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G5 follow-up change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G5 public launch gate decision evidence follow-up contract checks passed");
