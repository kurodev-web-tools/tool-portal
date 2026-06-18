import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const followUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_EVIDENCE_FOLLOW_UP.md";
const plG3DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md";
const plG3AfterPlG2kDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const fbL4EvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md";
const fbL4ReadyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const plG2cDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2C_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EVIDENCE.md";
const plG1DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md";
const plG4DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md";
const plG5DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md";
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
  followUpDocPath,
  plG3DocPath,
  plG3AfterPlG2kDocPath,
  fbL4EvidencePath,
  fbL4ReadyPreflightPath,
  plG2cDocPath,
  plG1DocPath,
  plG4DocPath,
  plG5DocPath,
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
  assert.ok(exists(requiredPath), `PL-G3 follow-up required path exists: ${requiredPath}`);
}

const followUpDoc = read(followUpDocPath);
const plG3Doc = read(plG3DocPath);
const plG3AfterPlG2kDoc = read(plG3AfterPlG2kDocPath);
const fbL4Evidence = read(fbL4EvidencePath);
const fbL4ReadyPreflight = read(fbL4ReadyPreflightPath);
const plG2cDoc = read(plG2cDocPath);
const plG1Doc = read(plG1DocPath);
const plG4Doc = read(plG4DocPath);
const plG5Doc = read(plG5DocPath);
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
  assert.match(followUpDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G3 follow-up doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G3 Start-to-translation smoke execution/evidence follow-up",
  "Public-release capable: no",
  "Execution result: keep blocked / blocked-no-approval",
  "this prompt is not exact approval",
  "approved-fb-l4-start-to-translation-smoke",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "operator-local env references",
  "status precheck",
  "explicit Start",
  "server-only live target lookup",
  "one bounded `liveChatMessages.list` polling step",
  "Free Azure translation",
  "UI/feed confirmation",
  "usage",
  "stop reason",
  "source attribution",
  "Stop",
  "command label",
  "route/action name",
  "HTTP status",
  "session status label",
  "target presence label",
  "polling interval label",
  "intake count",
  "translated count",
  "skipped count",
  "error count",
  "usage count or Free cap label",
  "unavailable reason",
  "pass/fail",
  "public gate state label",
  "public-release capable label",
  "PL-G1 remote durable enforcement",
  "remote-apply-and-deployed-smoke-completed",
  "PL-G2C prior blocker",
  "PL-G3 prior blocker",
  "PL-G4 production/custom deployed smoke",
  "PL-G5 keep-blocked decision",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "blocked-missing-approval-or-evidence",
  "not-run / approval-gated",
  "no browser storage expansion",
  "no handoff payload expansion",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(followUpDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G3 follow-up doc includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "status precheck: completed",
  "explicit Start: completed",
  "liveChatMessages.list: completed",
  "Free Azure translation: completed",
  "UI/feed confirmation: completed",
  "Stop: completed",
  "production/custom deployed smoke: completed",
  "limited public beta open: completed",
  "public launch gate flip: completed",
  "remote Supabase mutation: completed",
  "deploy/upload: completed",
  "Stripe action: completed"
]) {
  assert.doesNotMatch(followUpDoc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G3 follow-up doc excludes ${forbiddenFragment}`);
}

assert.match(plG3Doc, /blocked-no-approval[\s\S]*not-run \/ approval-gated/i, "PL-G3 prior blocker remains blocked/gated");
assert.match(plG3AfterPlG2kDoc, /blocked-empty-polling-intake-after-one-step/i, "PL-G3 after PL-G2K records approved empty polling blocker");
assert.match(plG3AfterPlG2kDoc, /Status route precheck:\s*executed \/ HTTP 200[\s\S]*Explicit Start:\s*executed \/ HTTP 200[\s\S]*active[\s\S]*Server-only live target lookup:\s*executed[\s\S]*returned count 5[\s\S]*One bounded `liveChatMessages\.list` polling step:\s*executed[\s\S]*returned count 0[\s\S]*Explicit Stop:\s*executed \/ HTTP 200[\s\S]*user-stop/i, "PL-G3 after PL-G2K records sanitized status/start/target-lookup/polling/stop evidence");
assert.match(fbL4Evidence, /PL-G3[\s\S]*blocked-no-approval/i, "FB-L4 evidence records PL-G3 blocker");
assert.match(fbL4ReadyPreflight, /approved-fb-l4-start-to-translation-smoke/i, "FB-L4 ready preflight keeps exact approval label");
assert.match(plG2cDoc, /keep blocked \/ blocked-no-approval/i, "PL-G2C prior blocker remains keep blocked");
assert.match(plG1Doc, /remote-apply-and-deployed-smoke-completed/i, "PL-G1 evidence records completed durable boundary");
assert.match(plG4Doc, /blocked-no-approval[\s\S]*not-run \/ approval-gated/i, "PL-G4 remains blocked/gated");
assert.match(plG5Doc, /keep blocked \/ blocked-no-approval/i, "PL-G5 keeps launch blocked");
assert.match(publicUsabilityPreflight, /PL-G3[\s\S]*Start-to-translation smoke/i, "FB-L1 public usability preflight records PL-G3");
assert.match(finalQa, /PL-G3[\s\S]*blocked-no-approval/i, "F15 readiness records PL-G3");
assert.match(gapAudit, /PL-G3[\s\S]*Start-to-translation smoke/i, "gap audit records PL-G3");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g3-(?:start-to-translation-smoke(?:-evidence-follow-up|-completion-after-pl-g2k)?|bounded-polling-empty-intake-evidence-after-start-lookup|polling-(?:sanitized-diagnostics|diagnostics-output-sanitization))`/i,
  "task.md records PL-G3 follow-up branch"
);
assert.match(task, /Latest PL-G3 Follow-up Evidence/i, "task.md records Latest PL-G3 Follow-up Evidence");
assert.match(task, /keep blocked \/ blocked-no-approval/i, "task.md records PL-G3 follow-up blocked result");
assert.match(task, /approved-fb-l4-start-to-translation-smoke/i, "task.md records exact PL-G3 approval label");
assert.match(task, /Start-to-translation smoke execution[\s\S]*not-run \/ approval-gated/i, "task.md records PL-G3 smoke not-run/gated");
assert.match(task, /unchecked scope[\s\S]*Start-to-translation smoke execution/i, "task.md records unchecked PL-G3 scope");
assert.match(task, /residual risk[\s\S]*PL-G3 remains incomplete/i, "task.md records PL-G3 residual risk");
assert.match(task, /next safe action[\s\S]*approved-fb-l4-start-to-translation-smoke/i, "task.md records next safe action");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records PL-G3 follow-up width-check skip reason");
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
assert.match(targetLookup, /targetMetadataHandling:\s*"server-only-internal-never-client-readable"/, "target metadata stays server-only");
assert.match(polling, /import "server-only"/, "bounded polling remains server-only");
assert.match(polling, /liveTargetHandling:\s*"server-only-active-session-state"/, "polling target remains server-only active-session state");
assert.match(azure, /import "server-only"/, "Azure translation bridge remains server-only");
assert.match(azure, /providerApiExecution:\s*"approval-gated-not-run-by-default"/, "Azure provider execution remains approval-gated by default");
assert.match(dock, /data-comment-translator-real-comments-feed="server-owned-safe-rows"/, "UI feed uses server-owned safe rows");

for (const [label, source] of [
  [followUpDocPath, followUpDoc],
  [plG3DocPath, plG3Doc],
  [plG3AfterPlG2kDocPath, plG3AfterPlG2kDoc],
  [fbL4EvidencePath, fbL4Evidence],
  [fbL4ReadyPreflightPath, fbL4ReadyPreflight],
  [plG2cDocPath, plG2cDoc],
  [plG1DocPath, plG1Doc],
  [plG4DocPath, plG4Doc],
  [plG5DocPath, plG5Doc],
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
  followUpDocPath,
  plG3DocPath,
  plG3AfterPlG2kDocPath,
  fbL4EvidencePath,
  fbL4ReadyPreflightPath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath,
  "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-server-only-live-chat-target-lookup-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 follow-up change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 Start-to-translation smoke evidence follow-up contract checks passed");
