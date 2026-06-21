import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG4DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md";
const plG4FollowUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md";
const fbL5EvidencePath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md";
const fbL5ReadyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md";
const plG3DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md";
const publicUsabilityPreflightPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const finalQaPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const sessionRoutePath = "app/api/comment-translator/session/route.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
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
  plG4DocPath,
  plG4FollowUpDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md",
  fbL5EvidencePath,
  fbL5ReadyPreflightPath,
  plG3DocPath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  sessionRoutePath,
  actionsPath,
  dockPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G4 required path exists: ${requiredPath}`);
}

const plG4Doc = read(plG4DocPath);
const plG4FollowUpDoc = read(plG4FollowUpDocPath);
const fbL5Evidence = read(fbL5EvidencePath);
const fbL5ReadyPreflight = read(fbL5ReadyPreflightPath);
const plG3Doc = read(plG3DocPath);
const publicUsabilityPreflight = read(publicUsabilityPreflightPath);
const finalQa = read(finalQaPath);
const gapAudit = read(gapAuditPath);
const sessionRoute = read(sessionRoutePath);
const actions = read(actionsPath);
const dock = read(dockPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Production/Custom Deployed Boundary",
  "## Sanitized Evidence Shape",
  "## Blocker Evidence",
  "## Ready Preflight For Later Execution",
  "## What This Proves",
  "## What This Does Not Prove",
  "## Unchecked Scope And Residual Risk",
  "## Next Safe Action",
  "## Completion Verification"
]) {
  assert.match(plG4Doc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G4 doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G4 production/custom deployed smoke execution preflight/evidence",
  "Public-release capable: no",
  "Execution result: blocked-no-approval",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "approved-fb-l5-production-custom-deployed-smoke",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_DEPLOYED_VERSION_LABEL",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "deployed target freshness",
  "reviewed integration branch match",
  "allowed-tester route/UI reachability",
  "status-only session API",
  "usage/deletion/Creator locked gate",
  "Start-to-translation gate status",
  "not-run / approval-gated",
  "blocked-missing-env-or-operator-local-references",
  "counts/status/stop reasons only",
  "safe deployed target label",
  "safe deployment/version label",
  "source attribution label",
  "no browser storage expansion",
  "no handoff payload expansion",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(plG4Doc, new RegExp(escaped(requiredFragment), "i"), `PL-G4 doc includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "approved-fb-l4-start-to-translation-smoke",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "approved-fb-l2-remote-durable-enforcement-apply-and-smoke",
  "session Start: completed",
  "provider target lookup: completed",
  "liveChatMessages.list: completed",
  "Azure/OpenAI provider execution: completed",
  "deploy/upload: completed",
  "public launch gate flip: completed"
]) {
  assert.doesNotMatch(plG4Doc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G4 doc excludes ${forbiddenFragment}`);
}

assert.match(fbL5Evidence, /PL-G4[\s\S]*blocked-no-approval/i, "FB-L5 evidence records PL-G4 blocker");
assert.match(plG4FollowUpDoc, /keep blocked \/ blocked-no-approval/i, "PL-G4 follow-up records keep-blocked result");
assert.match(fbL5ReadyPreflight, /approved-fb-l5-production-custom-deployed-smoke/i, "FB-L5 ready preflight keeps PL-G4 approval label");
assert.match(plG3Doc, /Start-to-translation smoke execution[\s\S]*not-run \/ approval-gated/i, "PL-G3 remains not-run before PL-G4");
assert.match(publicUsabilityPreflight, /PL-G4[\s\S]*production\/custom deployed smoke/i, "FB-L1 public usability preflight records PL-G4");
assert.match(finalQa, /PL-G4[\s\S]*blocked-no-approval/i, "F15 readiness records PL-G4 blocker");
assert.match(gapAudit, /PL-G4[\s\S]*production\/custom deployed smoke/i, "gap audit records PL-G4");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-(?:pl-g5-after-pl-g4-provider-permission-triage-follow-up|pl-g4-production-custom-deployed-smoke(?:-evidence-follow-up)?|pl-g4-after-pl-g3-provider-permission-triage-follow-up|pl-g3-provider-permission-readiness-confirmation-after-pr503|pl-g3-operator-local-provider-permission-confirmation-after-pr504|pl-g3-start-to-translation-retry-after-pr507|pl-g3-token-material-availability-runtime-after-pr508|pl-g3-first-page-next-page-diagnostics-after-pr519|pl-g3-first-page-next-page-diagnostics-after-pr520|pl-g3-between-pages-fresh-comment-diagnostics-after-pr521|pl-g3-between-pages-fresh-comment-command-after-pr522|pl-g3-between-pages-fresh-comment-execution-after-pr523|between-pages-fresh-comment-retry-after-pr524)`/i,
  "task.md records PL-G4 branch"
);
assert.match(task, /PL-G4[\s\S]*blocked-no-approval/i, "task.md records PL-G4 blocked result");
assert.match(task, /approved-fb-l5-production-custom-deployed-smoke/i, "task.md records exact PL-G4 approval label");
assert.match(task, /production\/custom deployed smoke execution[\s\S]*not-run \/ approval-gated/i, "task.md records PL-G4 smoke not-run/gated");
assert.match(task, /unchecked scope[\s\S]*production\/custom deployed smoke execution/i, "task.md records unchecked PL-G4 scope");
assert.match(task, /residual risk[\s\S]*PL-G4 remains incomplete/i, "task.md records PL-G4 residual risk");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records PL-G4 width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

assert.match(sessionRoute, /readCommentTranslatorPrivateLaunchAccess[\s\S]*blocked[\s\S]*status:\s*403/, "session route keeps private launch gate");
assert.match(sessionRoute, /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "session route reads durable state before browser status");
assert.match(sessionRoute, /provider-target-lookup-not-approved/, "session route keeps provider target lookup unavailable by default");
assert.match(sessionRoute, /live-provider-polling-not-approved/, "session route keeps live provider polling unavailable by default");

for (const actionFragment of [
  "getCommentTranslatorSessionStatusAction",
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorLockedWaitlistAction",
  "recordCommentTranslatorCreatorLockedClickAction",
  "startCommentTranslatorSessionAction"
]) {
  assert.match(actions, new RegExp(escaped(actionFragment)), `actions expose PL-G4 reviewed surface: ${actionFragment}`);
}
assert.match(actions, /readCommentTranslatorPrivateLaunchAccess[\s\S]*private-launch-gated/, "actions keep private launch gate");
assert.match(actions, /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "actions use durable session and usage readiness");
assert.match(dock, /data-comment-translator-real-comments-feed="server-owned-safe-rows"/, "UI feed uses server-owned safe rows");
assert.match(dock, /Source: YouTube Live Chat/, "UI source attribution label remains present");

for (const [label, source] of [
  [plG4DocPath, plG4Doc],
  [plG4FollowUpDocPath, plG4FollowUpDoc],
  [fbL5EvidencePath, fbL5Evidence],
  [fbL5ReadyPreflightPath, fbL5ReadyPreflight],
  [plG3DocPath, plG3Doc],
  [publicUsabilityPreflightPath, publicUsabilityPreflight],
  [finalQaPath, finalQa],
  [gapAuditPath, gapAudit],
  [sessionRoutePath, sessionRoute],
  [actionsPath, actions],
  [dockPath, dock],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG4DocPath,
  plG4FollowUpDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md",
  fbL5EvidencePath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath,
  "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts",
  "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  "scripts/comment-translator-youtube-live-chat-target-lookup-command-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-after-pr504-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr515-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-root-cause-triage-after-pr528-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-same-process-target-refresh-to-bounded-polling-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G4 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G4 production/custom deployed smoke contract checks passed");
