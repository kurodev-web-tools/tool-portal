import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const completionDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const plG3DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md";
const plG3FollowUpDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_EVIDENCE_FOLLOW_UP.md";
const fbL4EvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md";
const fbL4ReadyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const plG2kDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2K_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2J.md";
const allowedTesterEvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md";
const plG1DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md";
const publicUsabilityPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const finalQaPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const sessionRoutePath = "app/api/comment-translator/session/route.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const targetLookupPath = "lib/comment-translator-server-only-live-chat-target-lookup.ts";
const pollingPath = "lib/comment-translator-bounded-live-chat-polling-wiring.ts";
const azurePath = "lib/comment-translator-azure-normal-translation-execution.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const targetLookupCommandPath = "scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs";
const pollingCommandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";
const providerHarnessPath = "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs";
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned|f11-live-chat-id-never-output)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned|f12-owner-reference-never-output|f11-owner-reference-never-output)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  completionDocPath,
  plG3DocPath,
  plG3FollowUpDocPath,
  fbL4EvidencePath,
  fbL4ReadyPreflightPath,
  plG2kDocPath,
  allowedTesterEvidencePath,
  plG1DocPath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  sessionRoutePath,
  actionsPath,
  targetLookupPath,
  pollingPath,
  azurePath,
  dockPath,
  targetLookupCommandPath,
  pollingCommandPath,
  providerHarnessPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G3 after PL-G2K required path exists: ${requiredPath}`);
}

const completionDoc = read(completionDocPath);
const plG3Doc = read(plG3DocPath);
const plG3FollowUpDoc = read(plG3FollowUpDocPath);
const fbL4Evidence = read(fbL4EvidencePath);
const fbL4ReadyPreflight = read(fbL4ReadyPreflightPath);
const plG2kDoc = read(plG2kDocPath);
const allowedTesterEvidence = read(allowedTesterEvidencePath);
const plG1Doc = read(plG1DocPath);
const publicUsabilityPreflight = read(publicUsabilityPreflightPath);
const finalQa = read(finalQaPath);
const gapAudit = read(gapAuditPath);
const sessionRoute = read(sessionRoutePath);
const actions = read(actionsPath);
const targetLookup = read(targetLookupPath);
const polling = read(pollingPath);
const azure = read(azurePath);
const dock = read(dockPath);
const targetLookupCommand = read(targetLookupCommandPath);
const pollingCommand = read(pollingCommandPath);
const providerHarness = read(providerHarnessPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Operator-local Readiness Instructions",
  "## Start-to-translation Boundary",
  "## Evidence Status Matrix",
  "## Sanitized Evidence Shape",
  "## Blocker Evidence",
  "## What This Proves",
  "## What This Does Not Prove",
  "## Unchecked Scope And Residual Risk",
  "## Next Safe Action",
  "## Completion Verification"
]) {
  assert.match(completionDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G3 after PL-G2K doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G3 Start-to-translation smoke completion after PL-G2K",
  "Public-release capable: no",
  "Execution result: blocked-empty-polling-intake-after-pr515",
  "Start-to-translation smoke execution: blocked-empty-polling-intake-after-fresh-chat-after-pr510",
  "PL-G1 remote durable enforcement is `remote-apply-and-deployed-smoke-completed`",
  "PL-G2K route/API harness evidence is captured as approved sanitized route/API harness smoke passed",
  "approved-fb-l4-start-to-translation-smoke",
  "Exact approval label: present",
  "deployed origin reference ready: ready",
  "allowed-tester cookie/session reference ready: ready",
  "connected YouTube credential reference ready: ready",
  "safe owned live test target reference ready: ready",
  "credential status check after reconnect: executed / status label available / reconnect required false / reason label none / pass true",
  "sanitized output shape reviewed: present",
  "status route precheck: executed / HTTP 200 / session status label not-started / stop reason label none / unavailable reason label none / pass true",
  "explicit Start: executed / HTTP 200 / session status label active / stop reason label none / unavailable reason label none / pass true",
  "server-only live target lookup: executed / target presence label present / provider route label liveBroadcasts-list-target-lookup-only / returned count 5 / unavailable reason label none / pass true",
  "one bounded `liveChatMessages.list` polling step: executed / target presence label present / provider route label liveChatMessages-list-one-step-only / returned count 0 / polling interval label unavailable / unavailable reason label none / pass false",
  "Latest same-thread PR #509 retry evidence",
  "provider status provider-ok",
  "pageInfo resultsPerPage label/count",
  "intake diagnostic label",
  "blocked-empty-polling-intake-diagnostics-output-prepared-after-pr511",
  "blocked-empty-polling-intake-next-page-present-after-pr512",
  "blocked-empty-polling-intake-after-pr515",
  "provider harness gate blocked-before-provider-harness",
  "Latest same-thread PR #510 fresh-chat rerun evidence",
  "fresh chat message after Start",
  "explicit Stop: executed / HTTP 200 / session status label stopped / stop reason label user-stop / unavailable reason label none / pass true",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "Operator-local Readiness Instructions",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE",
  "do not print provider target metadata",
  "Approval Text",
  "status route precheck",
  "explicit Start",
  "server-only live target lookup",
  "one bounded `liveChatMessages.list` polling step",
  "Free Azure translation",
  "UI/feed confirmation",
  "explicit Stop",
  "target presence label only",
  "provider route label",
  "returned count",
  "eligible count",
  "translated count",
  "skipped count",
  "error count",
  "polling interval label",
  "usage count / Free cap label",
  "stop reason label",
  "unavailable reason label",
  "source attribution label",
  "not-run / approval-gated",
  "no browser storage expansion",
  "no handoff payload expansion",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(completionDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G3 after PL-G2K doc includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "status route precheck: completed",
  "explicit Start: active",
  "liveChatMessages.list: completed",
  "Free Azure translation: completed",
  "UI/feed confirmation: completed",
  "explicit Stop: completed",
  "limited public beta open: completed",
  "public launch gate flip: completed",
  "remote Supabase mutation: completed",
  "deploy/upload: completed",
  "Stripe action: completed"
]) {
  assert.doesNotMatch(completionDoc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G3 after PL-G2K doc excludes ${forbiddenFragment}`);
}

assert.match(plG1Doc, /remote-apply-and-deployed-smoke-completed/i, "PL-G1 evidence records completed durable boundary");
assert.match(plG2kDoc, /approved sanitized route\/API harness smoke passed/i, "PL-G2K evidence records passing route/API harness smoke");
assert.match(allowedTesterEvidence, /PL-G2K[\s\S]*approved sanitized route\/API harness smoke passed/i, "FB-L3 evidence points to PL-G2K passing output");
assert.match(plG3Doc, /blocked-no-approval[\s\S]*not-run \/ approval-gated/i, "PL-G3 prior blocker remains blocked");
assert.match(plG3FollowUpDoc, /keep blocked \/ blocked-no-approval/i, "PL-G3 follow-up remains blocked");
assert.match(fbL4Evidence, /Start-to-translation smoke execution[\s\S]*not-run \/ approval-gated/i, "FB-L4 evidence remains not-run");
assert.match(fbL4ReadyPreflight, /Approval Text[\s\S]*approved-fb-l4-start-to-translation-smoke/i, "FB-L4 ready preflight carries exact approval text");
assert.match(publicUsabilityPreflight, /PL-G3 after PL-G2K[\s\S]*(?:blocked-empty-polling-intake-after-one-step|blocked-provider-permission-rejected-after-target-present)/i, "FB-L1 preflight records prior PL-G3 after PL-G2K blocker");
assert.match(finalQa, /PL-G3 after PL-G2K[\s\S]*(?:blocked-empty-polling-intake-after-one-step|blocked-provider-permission-rejected-after-target-present)/i, "F15 readiness records prior PL-G3 after PL-G2K blocker");
assert.match(gapAudit, /PL-G3 after PL-G2K[\s\S]*(?:blocked-empty-polling-intake-after-one-step|blocked-provider-permission-rejected-after-target-present)/i, "gap audit records prior PL-G3 after PL-G2K blocker");

assert.match(sessionRoute, /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "session route reads durable state before Start");
assert.match(sessionRoute, /resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart/, "session route keeps Start-only live target lookup boundary");
assert.match(
  sessionRoute,
  /createSkippedCommentTranslatorLiveChatTargetLookupNotApproved/,
  "session route skips unapproved live target lookup instead of blocking explicit Start"
);
assert.match(sessionRoute, /readCommentTranslatorBoundedLiveChatPollingTick[\s\S]*live-provider-polling-not-approved/, "session route keeps polling unavailable by default");
assert.match(actions, /startCommentTranslatorSessionAction[\s\S]*intent:\s*"start"/, "server action exposes explicit Start");
assert.match(actions, /stopCommentTranslatorSessionAction[\s\S]*intent:\s*"stop"/, "server action exposes explicit Stop");
assert.match(
  actions,
  /createSkippedCommentTranslatorLiveChatTargetLookupNotApproved/,
  "server action skips unapproved live target lookup instead of blocking explicit Start"
);
assert.match(targetLookup, /import "server-only"/, "target lookup remains server-only");
assert.match(targetLookup, /targetMetadataHandling:\s*"server-only-internal-never-client-readable"/, "target metadata stays server-only");
assert.match(polling, /import "server-only"/, "bounded polling remains server-only");
assert.match(polling, /pollingCursor:\s*"nextPageToken-server-only"/, "polling cursor stays server-only");
assert.match(azure, /import "server-only"/, "Azure translation bridge remains server-only");
assert.match(azure, /providerApiExecution:\s*"approval-gated-not-run-by-default"/, "Azure provider execution remains approval-gated by default");
assert.match(dock, /data-comment-translator-real-comments-feed="server-owned-safe-rows"/, "UI feed uses server-owned safe rows");
assert.match(dock, /Source: YouTube Live Chat/, "UI source attribution label remains present");
assert.match(targetLookupCommand, /approved-live-chat-target-lookup/, "target lookup command requires approval flag");
assert.match(pollingCommand, /approved-live-chat-polling-smoke/, "polling command requires approval flag");
assert.match(pollingCommand, /approved-live-chat-polling-diagnostics/, "polling command supports diagnostics approval flag");
assert.match(pollingCommand, /live-chat-polling-diagnostics-sanitized-result/, "polling command emits sanitized diagnostics status");
assert.match(providerHarness, /approved-private-gated-live-provider-smoke/, "provider harness requires approval flag");

assert.match(
  task,
  /Current branch: `codex\/(?:pl-g3-sanitized-wrapper-boundary-after-pr533|pl-g3-start-to-translation-continuation-after-pr531|pl-g3-continuation-after-pr534-blocked|comment-translator-free-beta-pl-g3-(?:start-to-translation-retry-after-pr507|start-to-translation-retry-after-pr509|start-to-translation-rerun-fresh-chat-after-pr510|token-material-availability-runtime-after-pr508|bounded-polling-empty-intake-evidence-after-start-lookup|polling-(?:sanitized-diagnostics|diagnostics-output-sanitization|403-reason-labels|empty-intake-diagnostics-after-pr511)|empty-intake-polling-diagnostics-read-after-pr512|next-page-target-selection-follow-up-after-pr513|target-selection-diagnostics-after-pr514|start-to-translation-retry-after-pr515|empty-provider-ok-next-page-cursor-diagnostics-after-pr516|next-page-cursor-diagnostics-after-pr517|next-page-cursor-diagnostics-after-pr518|first-page-next-page-diagnostics-after-pr519|first-page-next-page-diagnostics-after-pr520|between-pages-fresh-comment-diagnostics-after-pr521|between-pages-fresh-comment-command-after-pr522|between-pages-fresh-comment-execution-after-pr523|between-pages-fresh-comment-retry-after-pr524))`/i,
  "task.md records PL-G3 after PL-G2K branch"
);
assert.match(task, /Latest PL-G3 After PL-G2K Evidence/i, "task.md records latest PL-G3 after PL-G2K evidence");
assert.match(task, /blocked-empty-polling-intake-after-fresh-chat-after-pr510/i, "task.md records PR #510 fresh-chat empty intake blocker");
assert.match(task, /deployed origin reference ready[\s\S]*ready/i, "task.md records ready deployed origin readiness");
assert.match(task, /allowed-tester cookie\/session reference ready[\s\S]*ready/i, "task.md records ready cookie/session readiness");
assert.match(task, /connected YouTube credential reference ready[\s\S]*ready/i, "task.md records ready credential readiness");
assert.match(task, /safe owned live test target reference ready[\s\S]*ready/i, "task.md records ready owned live target readiness");
assert.match(task, /status route[\s\S]*HTTP 200[\s\S]*not-started[\s\S]*pass true/i, "task.md records sanitized status route pass");
assert.match(task, /credential status[\s\S]*available[\s\S]*reconnect required false[\s\S]*pass true/i, "task.md records sanitized credential status recovery");
assert.match(task, /Start[\s\S]*HTTP 200[\s\S]*active[\s\S]*pass true/i, "task.md records sanitized Start active pass");
assert.match(task, /target lookup execute[\s\S]*target presence label present[\s\S]*returned count 5[\s\S]*pass true/i, "task.md records sanitized target lookup pass");
assert.match(task, /polling execute[\s\S]*returned count 0[\s\S]*pass false/i, "task.md records sanitized empty polling blocker");
assert.match(task, /Stop[\s\S]*HTTP 200[\s\S]*stopped[\s\S]*user-stop[\s\S]*pass true/i, "task.md records sanitized Stop rollback pass");
assert.match(task, /approved-fb-l4-start-to-translation-smoke/i, "task.md records exact PL-G3 approval label");
assert.match(task, /Readiness details:[\s\S]*deployed origin reference ready[\s\S]*safe owned live test target reference ready/i, "task.md records value-free operator-local readiness details");
assert.match(task, /Start-to-translation smoke[\s\S]*blocked-empty-polling-intake-after-fresh-chat-after-pr510/i, "task.md records PL-G3 fresh-chat empty intake blocked state");
assert.match(task, /public gate state label: unchanged \/ blocked/i, "task.md keeps public gate blocked");
assert.match(task, /public-release capable label: no/i, "task.md keeps public-release capable no");
assert.match(
  task,
  /Latest PL-G3 Polling (?:(?:Sanitized Diagnostics|403 \/ Target Selection Diagnostics|403 Reason Labels) Follow-up|Empty-intake Diagnostics Metadata After PR #511)/i,
  "task.md records PL-G3 polling diagnostics follow-up"
);
assert.match(task, /sanitized provider error reason\/class labels|sanitized polling diagnostic helper/i, "task.md records sanitized polling diagnostic helper");
assert.match(task, /live-chat-polling-diagnostics-sanitized-result/i, "task.md records sanitized diagnostics status");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records width-check skip reason");

for (const [label, source] of [
  [completionDocPath, completionDoc],
  [plG3DocPath, plG3Doc],
  [plG3FollowUpDocPath, plG3FollowUpDoc],
  [fbL4EvidencePath, fbL4Evidence],
  [fbL4ReadyPreflightPath, fbL4ReadyPreflight],
  [plG2kDocPath, plG2kDoc],
  [allowedTesterEvidencePath, allowedTesterEvidence],
  [plG1DocPath, plG1Doc],
  [publicUsabilityPreflightPath, publicUsabilityPreflight],
  [finalQaPath, finalQa],
  [gapAuditPath, gapAudit],
  [sessionRoutePath, sessionRoute],
  [actionsPath, actions],
  [targetLookupPath, targetLookup],
  [pollingPath, polling],
  [azurePath, azure],
  [dockPath, dock],
  [targetLookupCommandPath, targetLookupCommand],
  [pollingCommandPath, pollingCommand],
  [providerHarnessPath, providerHarness],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  "components/comment-translator/CommentTranslatorDock.tsx",
  sessionRoutePath,
  actionsPath,
  targetLookupPath,
  completionDocPath,
  plG3DocPath,
  plG3FollowUpDocPath,
  fbL4EvidencePath,
  fbL4ReadyPreflightPath,
  publicUsabilityPreflightPath,
  finalQaPath,
  gapAuditPath,
  "lib/comment-translator.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  taskPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md",
  "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts",
  "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr515-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-root-cause-triage-after-pr528-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-same-process-target-refresh-to-bounded-polling-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-continuation-after-pr531-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-continuation-after-pr534-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-full-start-to-translation-continuation-after-pr540-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs",
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  "scripts/comment-translator-youtube-live-chat-target-lookup-command-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-after-pr504-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-server-only-live-chat-target-lookup-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after PL-G2K change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 Start-to-translation smoke completion after PL-G2K contract checks passed");
