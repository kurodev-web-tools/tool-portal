import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG3DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md";
const plG3FollowUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_EVIDENCE_FOLLOW_UP.md";
const plG3AfterPlG2kDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const fbL4EvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md";
const fbL4ReadyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const plG2bDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2B_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE.md";
const allowedTesterEvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md";
const publicUsabilityPreflightPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const finalQaPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const sessionRoutePath = "app/api/comment-translator/session/route.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const targetLookupPath = "lib/comment-translator-server-only-live-chat-target-lookup.ts";
const pollingPath = "lib/comment-translator-bounded-live-chat-polling-wiring.ts";
const azurePath = "lib/comment-translator-azure-normal-translation-execution.ts";
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
  plG3DocPath,
  plG3AfterPlG2kDocPath,
  fbL4EvidencePath,
  fbL4ReadyPreflightPath,
  plG2bDocPath,
  allowedTesterEvidencePath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  sessionRoutePath,
  actionsPath,
  targetLookupPath,
  pollingPath,
  azurePath,
  dockPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G3 required path exists: ${requiredPath}`);
}

const plG3Doc = read(plG3DocPath);
const plG3AfterPlG2kDoc = read(plG3AfterPlG2kDocPath);
const fbL4Evidence = read(fbL4EvidencePath);
const fbL4ReadyPreflight = read(fbL4ReadyPreflightPath);
const plG2bDoc = read(plG2bDocPath);
const allowedTesterEvidence = read(allowedTesterEvidencePath);
const publicUsabilityPreflight = read(publicUsabilityPreflightPath);
const finalQa = read(finalQaPath);
const gapAudit = read(gapAuditPath);
const sessionRoute = read(sessionRoutePath);
const actions = read(actionsPath);
const targetLookup = read(targetLookupPath);
const polling = read(pollingPath);
const azure = read(azurePath);
const dock = read(dockPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Start-to-translation Boundary",
  "## Sanitized Evidence Shape",
  "## Blocker Evidence",
  "## Ready Preflight For Later Execution",
  "## What This Proves",
  "## What This Does Not Prove",
  "## Unchecked Scope And Residual Risk",
  "## Next Safe Action",
  "## Completion Verification"
]) {
  assert.match(plG3Doc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G3 doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G3 Start-to-translation smoke execution preflight/evidence",
  "Public-release capable: no",
  "Execution result: blocked-no-approval",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "approved-fb-l4-start-to-translation-smoke",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE",
  "explicit Start",
  "server-only live target lookup",
  "one bounded `liveChatMessages.list` polling step",
  "Free Azure translation",
  "UI feed",
  "usage",
  "stop reason",
  "source attribution",
  "target presence label only",
  "polling interval label",
  "translated count",
  "skipped count",
  "error count",
  "not-run / approval-gated",
  "blocked-missing-env-or-operator-local-references",
  "counts/status/stop reasons only",
  "no browser storage expansion",
  "no handoff payload expansion",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(plG3Doc, new RegExp(escaped(requiredFragment), "i"), `PL-G3 doc includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "approved-fb-l2-remote-durable-enforcement-apply-and-smoke",
  "remote Supabase mutation: completed",
  "deploy/upload: completed",
  "public launch gate flip: completed",
  "OpenAI provider execution: completed",
  "multiple polling loops"
]) {
  assert.doesNotMatch(plG3Doc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G3 doc excludes ${forbiddenFragment}`);
}

assert.match(fbL4Evidence, /PL-G3[\s\S]*blocked-no-approval/i, "FB-L4 evidence records PL-G3 blocker");
assert.match(
  plG3AfterPlG2kDoc,
  /blocked-(?:empty-polling-intake-after-one-step|provider-permission-rejected-after-target-present)/i,
  "PL-G3 after PL-G2K records approved blocker"
);
assert.match(plG3AfterPlG2kDoc, /Status route precheck:\s*executed \/ HTTP 200[\s\S]*Explicit Start:\s*executed \/ HTTP 200[\s\S]*active[\s\S]*Server-only live target lookup:\s*executed[\s\S]*returned count 5[\s\S]*One bounded `liveChatMessages\.list` polling step:\s*executed[\s\S]*returned count 0[\s\S]*Explicit Stop:\s*executed \/ HTTP 200[\s\S]*user-stop/i, "PL-G3 after PL-G2K records sanitized status/start/target-lookup/polling/stop evidence");
assert.match(fbL4ReadyPreflight, /approved-fb-l4-start-to-translation-smoke/i, "FB-L4 ready preflight keeps PL-G3 approval label");
assert.match(plG2bDoc, /session Start[\s\S]*live target lookup[\s\S]*`liveChatMessages\.list`[\s\S]*Azure\/OpenAI provider execution/i, "PL-G2B evidence keeps Start/live/provider execution out of route/API harness scope");
assert.match(allowedTesterEvidence, /PL-G2B[\s\S]*blocked-no-approval/i, "FB-L3 evidence keeps route/API smoke blocked before PL-G3");
assert.match(publicUsabilityPreflight, /PL-G3[\s\S]*Start-to-translation smoke/i, "FB-L1 public usability preflight records PL-G3");
assert.match(finalQa, /PL-G3[\s\S]*blocked-no-approval/i, "F15 readiness records PL-G3 blocker");
assert.match(gapAudit, /PL-G3[\s\S]*Start-to-translation smoke/i, "gap audit records PL-G3");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g3-(?:start-to-translation-smoke(?:-evidence-follow-up|-completion-after-pl-g2k)?|start-to-translation-retry-after-pr507|start-to-translation-retry-after-pr509|start-to-translation-rerun-fresh-chat-after-pr510|token-material-availability-runtime-after-pr508|bounded-polling-empty-intake-evidence-after-start-lookup|polling-(?:sanitized-diagnostics|diagnostics-output-sanitization|403-reason-labels)|empty-intake-polling-diagnostics-read-after-pr512|next-page-target-selection-follow-up-after-pr513)`/i,
  "task.md records PL-G3 branch"
);
assert.match(task, /PL-G3[\s\S]*blocked-no-approval/i, "task.md records PL-G3 blocked result");
assert.match(task, /approved-fb-l4-start-to-translation-smoke/i, "task.md records exact PL-G3 approval label");
assert.match(task, /Start-to-translation smoke execution[\s\S]*not-run \/ approval-gated/i, "task.md records PL-G3 smoke not-run/gated");
assert.match(task, /unchecked scope[\s\S]*Start-to-translation smoke execution/i, "task.md records unchecked PL-G3 scope");
assert.match(task, /residual risk[\s\S]*PL-G3 remains incomplete/i, "task.md records PL-G3 residual risk");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records PL-G3 width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

assert.match(sessionRoute, /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "session route reads durable state before Start");
assert.match(sessionRoute, /resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart/, "session route keeps server-only live target lookup boundary");
assert.match(sessionRoute, /createSkippedCommentTranslatorLiveChatTargetLookupNotApproved/, "session route skips unapproved Start target lookup");
assert.match(sessionRoute, /readCommentTranslatorBoundedLiveChatPollingTick[\s\S]*live-provider-polling-not-approved/, "session route keeps polling unavailable by default");
assert.match(actions, /startCommentTranslatorSessionAction[\s\S]*intent:\s*"start"/, "server action exposes explicit Start");
assert.match(actions, /resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart/, "actions keep server-only live target lookup boundary");
assert.match(actions, /createSkippedCommentTranslatorLiveChatTargetLookupNotApproved/, "actions skip unapproved Start target lookup");
assert.match(actions, /readCommentTranslatorBoundedLiveChatPollingTick[\s\S]*live-provider-polling-not-approved/, "actions keep polling unavailable by default");
assert.match(targetLookup, /import "server-only"/, "target lookup remains server-only");
assert.match(targetLookup, /sessionBoundary:\s*"start-intent-only"/, "target lookup remains Start-only");
assert.match(targetLookup, /targetMetadataHandling:\s*"server-only-internal-never-client-readable"/, "target metadata stays server-only");
assert.match(polling, /import "server-only"/, "bounded polling remains server-only");
assert.match(polling, /liveTargetHandling:\s*"server-only-active-session-state"/, "polling target remains server-only active-session state");
assert.match(polling, /pollingCursor:\s*"nextPageToken-server-only"/, "polling cursor stays server-only");
assert.match(azure, /import "server-only"/, "Azure translation bridge remains server-only");
assert.match(azure, /freePlanPrimary:\s*"azure-translator"/, "Free route remains Azure Translator");
assert.match(azure, /providerApiExecution:\s*"approval-gated-not-run-by-default"/, "Azure provider execution remains approval-gated by default");
assert.match(dock, /data-comment-translator-real-comments-feed="server-owned-safe-rows"/, "UI feed uses server-owned safe rows");
assert.match(dock, /Source: YouTube Live Chat/, "UI source attribution label remains present");

for (const [label, source] of [
  [plG3DocPath, plG3Doc],
  [plG3AfterPlG2kDocPath, plG3AfterPlG2kDoc],
  [fbL4EvidencePath, fbL4Evidence],
  [fbL4ReadyPreflightPath, fbL4ReadyPreflight],
  [plG2bDocPath, plG2bDoc],
  [allowedTesterEvidencePath, allowedTesterEvidence],
  [publicUsabilityPreflightPath, publicUsabilityPreflight],
  [finalQaPath, finalQa],
  [gapAuditPath, gapAudit],
  [sessionRoutePath, sessionRoute],
  [actionsPath, actions],
  [targetLookupPath, targetLookup],
  [pollingPath, polling],
  [azurePath, azure],
  [dockPath, dock],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  sessionRoutePath,
  actionsPath,
  targetLookupPath,
  plG3DocPath,
  plG3AfterPlG2kDocPath,
  plG3FollowUpDocPath,
  fbL4EvidencePath,
  fbL4ReadyPreflightPath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md",
  "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts",
  "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  "scripts/comment-translator-youtube-live-chat-target-lookup-command-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-after-pr504-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-server-only-live-chat-target-lookup-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 Start-to-translation smoke contract checks passed");
