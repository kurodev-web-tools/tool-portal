import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG5DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md";
const plG5FollowUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md";
const plG4FollowUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md";
const fbL5EvidencePath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md";
const fbL6EvidencePath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE.md";
const fbL6ReadyPreflightPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_READY_PREFLIGHT.md";
const publicUsabilityPreflightPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const plG1DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md";
const plG2bDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2B_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE.md";
const plG3DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md";
const plG4DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md";
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  plG5DocPath,
  plG4FollowUpDocPath,
  fbL5EvidencePath,
  plG5FollowUpDocPath,
  fbL6EvidencePath,
  fbL6ReadyPreflightPath,
  publicUsabilityPreflightPath,
  plG1DocPath,
  plG2bDocPath,
  plG3DocPath,
  plG4DocPath,
  finalQaPath,
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G5 required path exists: ${requiredPath}`);
}

const plG5Doc = read(plG5DocPath);
const plG5FollowUpDoc = read(plG5FollowUpDocPath);
const fbL6Evidence = read(fbL6EvidencePath);
const fbL6ReadyPreflight = read(fbL6ReadyPreflightPath);
const publicUsabilityPreflight = read(publicUsabilityPreflightPath);
const plG1Doc = read(plG1DocPath);
const plG2bDoc = read(plG2bDocPath);
const plG3Doc = read(plG3DocPath);
const plG4Doc = read(plG4DocPath);
const finalQa = read(finalQaPath);
const gapAudit = read(gapAuditPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Decision Boundary",
  "## Evidence Status Matrix",
  "## Sanitized Evidence Shape",
  "## Blocker Evidence",
  "## What This Proves",
  "## What This Does Not Prove",
  "## Unchecked Scope And Residual Risk",
  "## Next Safe Action",
  "## Completion Verification"
]) {
  assert.match(plG5Doc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G5 doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G5 release-owner public launch decision preflight/evidence",
  "Public-release capable: no",
  "Execution result: keep blocked / blocked-no-approval",
  "approved-fb-l6-keep-blocked-launch-gate-decision",
  "approved-fb-l6-open-limited-public-beta",
  "approved-fb-l6-flip-public-gate",
  "same-thread release-owner ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "public launch gate unchanged",
  "public gate state label",
  "public-release capable label",
  "PL-G1 remote durable enforcement",
  "remote-apply-and-deployed-smoke-completed",
  "PL-G2B allowed-tester route/API harness smoke",
  "PL-G3 Start-to-translation smoke",
  "PL-G4 production/custom deployed smoke",
  "blocked-no-approval",
  "not-run / approval-gated",
  "limited public beta open",
  "public launch gate flip",
  "separate reviewed operation",
  "counts/status/stop reasons only",
  "no browser storage expansion",
  "no handoff payload expansion",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(plG5Doc, new RegExp(escaped(requiredFragment), "i"), `PL-G5 doc includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "limited public beta open: completed",
  "public launch gate flip: completed",
  "public access change: completed",
  "deploy/upload: completed",
  "session Start: completed",
  "provider target lookup: completed",
  "liveChatMessages.list: completed",
  "Azure/OpenAI provider execution: completed",
  "Stripe action: completed"
]) {
  assert.doesNotMatch(plG5Doc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G5 doc excludes ${forbiddenFragment}`);
}

assert.match(fbL6Evidence, /keep blocked \/ blocked-no-approval/i, "FB-L6 evidence keeps blocked decision");
assert.match(fbL6ReadyPreflight, /approved-fb-l6-keep-blocked-launch-gate-decision/i, "FB-L6 ready preflight keeps keep-blocked label");
assert.match(fbL6ReadyPreflight, /approved-fb-l6-open-limited-public-beta/i, "FB-L6 ready preflight keeps limited-beta label");
assert.match(fbL6ReadyPreflight, /approved-fb-l6-flip-public-gate/i, "FB-L6 ready preflight keeps gate-flip label");
assert.match(publicUsabilityPreflight, /PL-G5[\s\S]*keep blocked \/ blocked-no-approval/i, "FB-L1 public usability preflight records PL-G5");
assert.match(plG1Doc, /remote-apply-and-deployed-smoke-completed/i, "PL-G1 evidence records completed durable execution");
assert.match(plG1Doc, /remote Supabase migration apply: completed/i, "PL-G1 evidence records completed remote apply");
assert.match(plG1Doc, /deployed durable session\/usage smoke: completed/i, "PL-G1 evidence records completed deployed durable smoke");
assert.match(plG2bDoc, /blocked-no-approval[\s\S]*not-run \/ approval-gated/i, "PL-G2B remains blocked/gated");
assert.match(plG3Doc, /blocked-no-approval[\s\S]*not-run \/ approval-gated/i, "PL-G3 remains blocked/gated");
assert.match(plG4Doc, /blocked-no-approval[\s\S]*not-run \/ approval-gated/i, "PL-G4 remains blocked/gated");
assert.match(finalQa, /PL-G5[\s\S]*keep blocked \/ blocked-no-approval/i, "F15 readiness records PL-G5");
assert.match(gapAudit, /PL-G5[\s\S]*Public launch gate decision/i, "gap audit records PL-G5");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-(?:pl-g5-after-pl-g4-provider-permission-triage-follow-up|pl-g5-public-launch-gate-decision(?:-follow-up-after-pl-g4)?|pl-g4-after-pl-g3-provider-permission-triage-follow-up|pl-g3-provider-permission-readiness-confirmation-after-pr503|pl-g3-operator-local-provider-permission-confirmation-after-pr504|pl-g3-start-to-translation-retry-after-pr507|pl-g3-token-material-availability-runtime-after-pr508)`/i,
  "task.md records PL-G5 branch"
);
assert.match(task, /PL-G5[\s\S]*keep blocked \/ blocked-no-approval/i, "task.md records PL-G5 blocked result");
assert.match(task, /approved-fb-l6-keep-blocked-launch-gate-decision/i, "task.md records exact keep-blocked approval label");
assert.match(task, /remote-apply-and-deployed-smoke-completed/i, "task.md records PL-G1 completed status");
assert.match(task, /PL-G2B blocked-no-approval \/ deployed execution approval-gated/i, "task.md records PL-G2 blocked status");
assert.match(task, /PL-G3[\s\S]*blocked-no-approval \/ not-run \/ approval-gated/i, "task.md records PL-G3 blocked status");
assert.match(task, /PL-G4[\s\S]*blocked-no-approval \/ not-run \/ approval-gated/i, "task.md records PL-G4 blocked status");
assert.match(task, /unchecked scope[\s\S]*limited public beta open[\s\S]*public launch gate flip/i, "task.md records unchecked public access scope");
assert.match(task, /residual risk[\s\S]*public-release capable remains no/i, "task.md records PL-G5 residual risk");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records PL-G5 width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

for (const [label, source] of [
  [plG5DocPath, plG5Doc],
  [plG5FollowUpDocPath, plG5FollowUpDoc],
  [fbL6EvidencePath, fbL6Evidence],
  [fbL6ReadyPreflightPath, fbL6ReadyPreflight],
  [publicUsabilityPreflightPath, publicUsabilityPreflight],
  [plG1DocPath, plG1Doc],
  [plG2bDocPath, plG2bDoc],
  [plG3DocPath, plG3Doc],
  [plG4DocPath, plG4Doc],
  [finalQaPath, finalQa],
  [gapAuditPath, gapAudit],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG5DocPath,
  plG4FollowUpDocPath,
  fbL5EvidencePath,
  plG5FollowUpDocPath,
  fbL6EvidencePath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-after-pr504-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G5 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G5 public launch gate decision contract checks passed");
