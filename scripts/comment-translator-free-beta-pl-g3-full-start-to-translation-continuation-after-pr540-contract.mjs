import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const completionDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const taskPath = "task.md";
const wrapperPath = "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs";
const actionsPath = "app/tools/comment-translator/actions.ts";
const uiComponentPath = "components/comment-translator/CommentTranslatorDock.tsx";

const branchName = "codex/pl-g3-full-start-to-translation-continuation-after-pr540";
const approvalLabel = "approved-pl-g3-full-start-to-translation-continuation-after-pr540";
const pr540MergeCommit = "50c5bbeeef11ae3fffe2c958a3b83126c650f70b";
const decisionLabel = "blocked-full-start-to-translation-continuation-after-pr540-pending-exact-approval";
const rootCauseLabel = "blocked-ui-feed-action-fixed-unavailable-after-provider-translation";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

for (const requiredPath of [completionDocPath, readyPreflightPath, taskPath, wrapperPath, actionsPath, uiComponentPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `required path exists: ${requiredPath}`);
}

const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);
const wrapper = read(wrapperPath);
const actions = read(actionsPath);
const uiComponent = read(uiComponentPath);

for (const requiredFragment of [
  "## PL-G3 Full Start-to-translation Continuation After PR #540",
  `Base state: PR #540 is merged at \`${pr540MergeCommit}\``,
  `Decision: ${decisionLabel}`,
  `Exact approval label required before execution: \`${approvalLabel}\``,
  "PR #540 provider boundary baseline: passed",
  "status precheck: pending exact approval",
  "explicit Start: pending exact approval",
  "server-only target lookup: pending exact approval",
  "bounded liveChatMessages.list with fresh visible chat comment: pending exact approval",
  "Free provider translation: pending exact approval",
  "browser-visible UI/feed confirmation: pending exact approval",
  "usage/source attribution/stop reason: pending exact approval",
  "Stop and post-Stop status: pending exact approval",
  "## PL-G3 Full Start-to-translation Continuation Approved Attempt After PR #540",
  "Decision: partial-full-start-to-translation-continuation-after-pr540-browser-ui-blocked",
  "Same-thread exact approval: present",
  "route reference precheck: executed / deployed origin reference present / allowed-tester cookie reference present / credential reference present / pass true",
  "provider harness readiness: executed / ready-for-task-27-approved-live-provider-smoke-execution-harness",
  "status precheck: executed / HTTP 200 / session status label `not-started` / stop reason label `none` / pass true",
  "explicit Start: executed / HTTP 200 / session status label `active` / stop reason label `none` / pass true",
  "reviewed sanitized wrapper/provider boundary: executed / child exit status label `exit-0` / stdout final JSON parsed true / stderr capture label `absent` / pass true",
  "returned count 3 / eligible count 3 / provider request count 3 / provider call count 3 / translated count 3 / skipped count 0",
  "sourceAttributionAvailabilityLabel `not-produced-by-provider-harness`",
  "browser-visible UI/feed confirmation: attempted by operator screenshot / feed visible but empty / translated count 0 / skipped count 0",
  "usage/session display: visible / session remaining and daily remaining counters active",
  "source attribution: not-confirmed-on-visible-feed",
  "stop reason label: not-confirmed-on-visible-feed",
  "console error count: not-confirmed",
  "usage/source attribution/stop reason: blocked-empty-visible-feed-after-provider-translation",
  "## PL-G3 Browser-visible Feed Empty Root Cause After PR #540",
  `Root-cause label: ${rootCauseLabel}`,
  "The browser-visible feed action boundary remains fixed unavailable with unavailableReason `live-provider-polling-not-approved`",
  "The reviewed provider harness translated count 3 in its child process, but that result is not persisted into the server-owned UI feed state",
  "Next safe action: keep public launch blocked and implement a separate reviewed feed bridge/session persistence boundary before requesting more live comments",
  "Stop and post-Stop status: executed / Stop HTTP 200 / stopped / user-stop / post-Stop HTTP 200 / not-started",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(completionDoc, new RegExp(escaped(requiredFragment), "i"), `completion doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "After PR #540 full PL-G3 Start-to-translation continuation approval boundary",
  approvalLabel,
  "fresh visible chat comment",
  "browser-visible UI/feed confirmation",
  "usage/source-attribution/stop-reason evidence",
  "Stop and post-Stop status",
  "If browser-visible feed is empty after provider translation, treat the continuation as blocked-ui-feed-action-fixed-unavailable-after-provider-translation",
  "If exact approval is absent, stop with blocked-full-start-to-translation-continuation-after-pr540-pending-exact-approval",
  "Do not run PL-G4, PL-G5, deploy/upload, remote mutation, public access changes, OAuth flows, token refresh, Stripe actions, main promotion, or public launch gate flip."
]) {
  assert.match(readyPreflight, new RegExp(escaped(requiredFragment), "i"), `ready preflight includes ${requiredFragment}`);
}

for (const requiredFragment of [
  `Current branch: \`${branchName}\``,
  "Latest PL-G3 Full Start-to-translation Continuation After PR #540",
  "Decision: partial-full-start-to-translation-continuation-after-pr540-browser-ui-blocked",
  `PR #540 merge commit: \`${pr540MergeCommit}\``,
  approvalLabel,
  "Same-thread exact approval: present",
  "Approved attempt after PR #540: partial-provider-translation-passed-browser-ui-blocked",
  `Root-cause label after PR #540: ${rootCauseLabel}`,
  "Feed action root cause: getCommentTranslatorRealCommentsFeedAction still returns unavailable reason live-provider-polling-not-approved, so provider harness rows are not persisted into the browser-visible server-owned feed",
  "Live/provider/UI/Start/Stop execution: partially run with same-thread exact approval",
  "Next safe action: keep public launch blocked and implement a reviewed feed bridge/session persistence boundary before requesting more live comments",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(task, new RegExp(escaped(requiredFragment), "i"), `task.md includes ${requiredFragment}`);
}

assert.match(wrapper, /parseFinalJsonFromStdout/, "reviewed wrapper still parses stdout final JSON");
assert.match(wrapper, /sourceAttributionAvailabilityLabel/, "reviewed wrapper still projects source attribution availability labels");
assert.match(
  actions,
  /getCommentTranslatorRealCommentsFeedAction[\s\S]*createUnavailableCommentTranslatorRealCommentsFeedState[\s\S]*live-provider-polling-not-approved/,
  "server action still returns fixed provider-unavailable feed state instead of persisted translated rows"
);
assert.match(uiComponent, /data-public-operator-session-ui="sanitized-session-usage-only"/, "UI component still exposes the sanitized session usage panel");
assert.match(uiComponent, /sessionState\.stopReason/, "UI component still exposes sanitized stop reason display");

for (const forbiddenFragment of [
  "public-release capable label: yes",
  "public gate state label: open",
  "limited public beta open: completed",
  "public launch gate flip: completed",
  "full Start-to-translation continuation: completed",
  "browser-visible UI/feed confirmation: completed",
  "PL-G4: completed",
  "PL-G5: completed",
  "deploy/upload: completed",
  "remote mutation: completed",
  "OAuth flows: completed",
  "token refresh: completed",
  "Stripe action: completed"
]) {
  assert.doesNotMatch(completionDoc, new RegExp(escaped(forbiddenFragment), "i"), `completion doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(escaped(forbiddenFragment), "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [completionDocPath, completionDoc],
  [readyPreflightPath, readyPreflight],
  [taskPath, task],
  [wrapperPath, wrapper],
  [actionsPath, actions],
  [uiComponentPath, uiComponent]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  completionDocPath,
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-full-start-to-translation-continuation-after-pr540-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after PR #540 continuation preflight change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 full Start-to-translation continuation after PR #540 contract checks passed");
