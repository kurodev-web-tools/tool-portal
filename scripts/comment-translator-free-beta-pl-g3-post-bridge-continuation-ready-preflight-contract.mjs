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
const bridgePath = "lib/comment-translator-real-comments-feed-session-bridge.ts";
const f10Path = "lib/comment-translator-azure-normal-translation-execution.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";

const branchName = "codex/pl-g3-usage-day-boundary-limit-fix";
const approvalLabel = "approved-pl-g3-post-bridge-full-continuation-after-pr542";
const pr542MergeCommit = "d1b2215d9cd1abe1ca8d93319d1e64c26115fa70";
const pr543MergeCommit = "cf4fc261ef961e52a3f68e366e3a27723cad3a6a";
const decisionLabel = "post-bridge-full-continuation-ready-preflight-prepared-after-pr542";
const blockerLabel = "blocked-start-auth-failed-after-pr543";

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
  const base = "origin/codex/comment-translator-free-public-beta-integration";
  const committedDiff = execSync(`git diff --name-only ${base}...HEAD`, {
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

for (const requiredPath of [completionDocPath, readyPreflightPath, taskPath, bridgePath, f10Path, actionsPath]) {
  assert.ok(exists(requiredPath), `post-bridge preflight required path exists: ${requiredPath}`);
}

const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);
const bridge = read(bridgePath);
const f10 = read(f10Path);
const actions = read(actionsPath);

for (const requiredFragment of [
  "## PL-G3 Post-bridge Full Start-to-translation Continuation Ready Preflight After PR #542",
  `Decision: ${decisionLabel}`,
  `Base state: PR #542 is merged at \`${pr542MergeCommit}\` and contained in \`origin/codex/comment-translator-free-public-beta-integration\``,
  `Exact approval label required before execution: \`${approvalLabel}\``,
  "Bridge baseline: local-feed-bridge-session-persistence-prepared",
  "browser-visible server-owned feed should read bridged sanitized translated rows for the active durable session",
  "source attribution label: required",
  "stop reason label: required",
  "usage/session counters: required",
  "translated count: required",
  "skipped count: required",
  "Start/Stop/live/provider/UI execution: not-run in this preflight slice",
  "## PL-G3 Post-bridge Full Start-to-translation Continuation Intake After PR #543",
  `Decision: ${blockerLabel}`,
  `Base state: PR #543 is merged at \`${pr543MergeCommit}\` and contained in \`origin/codex/comment-translator-free-public-beta-integration\``,
  "Same-thread ready preflight reviewed: present",
  "Sanitized output review: present",
  `Exact approval label present in this thread: present / \`${approvalLabel}\``,
  "Operator-local reference readiness in this thread: pass by operator report",
  "Active stream/chat ready label: pass by operator report",
  "Initial status precheck: executed / session status label `not-started` / usage-session counter label present / pass true",
  "Initial explicit Start: executed with corrected JSON / session status label `active` / usage-session counter label present / pass true",
  "Operator fresh visible chat comment window: completed by operator report",
  "dependency-module-missing / typescript-runtime-unavailable labels",
  "Stop rollback after command-startup blocker: executed / session status label `stopped` / stop reason label `auth-failed`",
  "Restart explicit Start: executed / session status label `stopped` / stop reason label `auth-failed` / pass false",
  "Server-only target lookup after dependency recovery: executed / status label `live-chat-target-lookup-sanitized-result` / target presence label present / returned count 5 / unavailableReason none / pass true",
  "not-run because Start was not active after the retry",
  "### PL-G3 Post-auth-failed Recovery Retry After PR #543",
  "Decision: blocked-start-daily-time-limit-after-auth-failed-recovery",
  `Same-thread retry approval label present: \`${approvalLabel}\``,
  "Operator-local post-auth-failed readiness: allowed-tester browser/session refreshed pass / connected credential status ready pass / reconnect required false pass / owner-session-credential binding same-account pass / active stream-chat ready pass / sanitized output boundary accepted pass",
  "Retry status precheck: executed / HTTP 2xx / session status label `stopped` / stop reason label `session-time-limit` / usage-session counter label present / pass true",
  "Retry explicit Start: executed / HTTP 2xx / session status label `stopped` / stop reason label `daily-time-limit` / usage-session counter label present / pass false / unavailableReason none",
  "not-run because retry Start did not become active",
  "### PL-G3 Status-only Limit-state Recheck After PR #543",
  "Decision: status-only-check-sanitized-result",
  "Status-only recheck: executed / HTTP 2xx / session status label `not-started` / stop reason label `none` / usage-session counter label present / pass true / unavailableReason none",
  "Start command executed label: no",
  "Stop command executed label: no",
  "Live/provider execution label: not-run",
  "### PL-G3 Approved Retry After Status-only Not-started/none Recheck",
  "Decision: blocked-start-daily-time-limit-after-status-only-recheck",
  "Status precheck: executed / HTTP 2xx / session status label `not-started` / stop reason label `none` / usage-session counter label present / pass true",
  "Explicit Start: executed / HTTP 2xx / session status label `stopped` / stop reason label `daily-time-limit` / usage-session counter label present / pass false / unavailableReason start-not-active",
  "not-run because Start did not become active",
  "### PL-G3 Durable Usage Ledger Sanitized Diagnostic After Daily-time-limit",
  "Decision: diagnosed-utc-day-boundary-elapsed-carryover",
  "Current UTC day sanitized aggregate: session-started event count 0 / session-stopped event count 1 / quota-budget-stop event count 3 / daily elapsed bucket label at-or-over-limit / limitReachedLabel true",
  "Previous UTC day sanitized aggregate: session-started event count 3 / session-stopped event count 2 / quota-budget-stop event count 0 / daily elapsed bucket label under-5m / limitReachedLabel false",
  "Day-boundary mismatch candidate label: present",
  "Raw rows printed label: no",
  "Raw IDs printed label: no",
  "records the whole stopped session elapsed against the stop event usage_day",
  "### PL-G3 Durable Usage Day-boundary Fix And Minimal Start Blocker Display",
  "Decision: implemented-utc-day-overlap-usage-aggregation-and-usage-policy-start-blocker",
  "Durable usage aggregation: implemented",
  "Minimal UI/status display: implemented",
  "Live/provider/Start/Stop execution after the fix: not-run",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(completionDoc, new RegExp(escaped(requiredFragment), "i"), `completion doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "After PR #542 post-bridge full PL-G3 Start-to-translation continuation approval boundary",
  approvalLabel,
  "server-owned feed bridge/session persistence",
  "browser-visible server-owned feed reads sanitized translated rows",
  "source attribution",
  "stop reason",
  "usage/session counters",
  "translated/skipped counts",
  "If exact approval is absent, stop with blocked-post-bridge-continuation-after-pr542-pending-exact-approval",
  "Do not run PL-G4, PL-G5, deploy/upload, remote mutation, OAuth flows, token refresh, Stripe actions, public access changes, main promotion, or public launch gate flip."
]) {
  assert.match(readyPreflight, new RegExp(escaped(requiredFragment), "i"), `ready preflight includes ${requiredFragment}`);
}

for (const requiredFragment of [
  `Current branch: \`${branchName}\``,
  "PL-G3 post-bridge full continuation ready preflight",
  `Decision: ${decisionLabel}`,
  `PR #542 merge commit: \`${pr542MergeCommit}\``,
  approvalLabel,
  "No live/provider/UI/Start/Stop execution was run in this slice",
  "PL-G3 post-bridge full continuation intake after PR #543",
  `Decision: ${blockerLabel}`,
  `PR #543 merge commit: \`${pr543MergeCommit}\``,
  "Same-thread ready preflight reviewed: present",
  "Sanitized output review: present",
  `Exact approval label present in this thread: present / \`${approvalLabel}\``,
  "Operator-local reference readiness in this thread: pass by operator report",
  "Initial status precheck returned session status label `not-started` / usage-session counter label present / pass true",
  "Initial Start with corrected JSON returned session status label `active` / usage-session counter label present / pass true",
  "dependency-module-missing / typescript-runtime-unavailable labels",
  "Stop rollback after that blocker returned session status label `stopped` / stop reason label `auth-failed`",
  "Restart Start returned stopped / auth-failed and did not become active",
  "Server-only target lookup after dependency recovery passed with status `live-chat-target-lookup-sanitized-result`, target presence label present, returned count 5, and unavailableReason none",
  "PL-G3 post-auth-failed recovery retry after PR #543",
  "Decision: blocked-start-daily-time-limit-after-auth-failed-recovery",
  `Same-thread retry approval label present: \`${approvalLabel}\``,
  "Operator-local post-auth-failed readiness: allowed-tester browser/session refreshed pass / connected credential status ready pass / reconnect required false pass / owner-session-credential binding same-account pass / active stream-chat ready pass / sanitized output boundary accepted pass",
  "Retry status precheck returned HTTP 2xx / session status label `stopped` / stop reason label `session-time-limit` / usage-session counter label present / pass true",
  "Retry explicit Start returned HTTP 2xx / session status label `stopped` / stop reason label `daily-time-limit` / usage-session counter label present / pass false / unavailableReason none",
  "not run because retry Start did not become active",
  "PL-G3 status-only limit-state recheck after PR #543",
  "Decision: status-only-check-sanitized-result",
  "Request intent label `status` only",
  "session status label `not-started`; stop reason label `none`; usage-session counter label present; pass true; unavailableReason none",
  "Start command executed label: no",
  "Stop command executed label: no",
  "Live/provider execution label: not-run",
  "PL-G3 approved retry after status-only not-started/none recheck",
  "Decision: blocked-start-daily-time-limit-after-status-only-recheck",
  "Status precheck returned HTTP 2xx / session status label `not-started` / stop reason label `none` / usage-session counter label present / pass true",
  "Explicit Start returned HTTP 2xx / session status label `stopped` / stop reason label `daily-time-limit` / usage-session counter label present / pass false / unavailableReason start-not-active",
  "not run because Start did not become active",
  "PL-G3 durable usage ledger sanitized diagnostic after daily-time-limit",
  "Decision: diagnosed-utc-day-boundary-elapsed-carryover",
  "Query mode label: read-only-sanitized-aggregate",
  "Current UTC day ledger read label passed with session-started event count 0, session-stopped event count 1, quota-budget-stop event count 3, daily elapsed bucket label at-or-over-limit, limitReachedLabel true",
  "Previous UTC day sanitized aggregate had session-started event count 3, session-stopped event count 2, quota-budget-stop event count 0, daily elapsed bucket label under-5m, limitReachedLabel false",
  "Day-boundary mismatch candidate label present",
  "No Start/Stop/live/provider/UI commands were run for this diagnostic",
  "PL-G3 durable usage day-boundary fix and minimal Start blocker display",
  "Decision: implemented-utc-day-overlap-usage-aggregation-and-usage-policy-start-blocker",
  "Durable usage snapshot now computes dailyUsedMs from session-stopped overlap with the requested UTC usage day",
  "derives startBlockedByUsagePolicy from sanitized usageDisplay.providerCallPolicy",
  "No ledger rows, remote data, live/provider execution, deploy/upload, public access change, or launch gate flip were performed",
  "Required later evidence: browser-visible server-owned feed reads sanitized translated rows",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(task, new RegExp(escaped(requiredFragment), "i"), `task.md includes ${requiredFragment}`);
}

assert.match(bridge, /^import "server-only";/m, "feed bridge remains server-only");
assert.match(bridge, /feedAuthority:\s*"server-owned-session-scoped-safe-feed"/, "feed bridge keeps server-owned session-scoped authority");
assert.match(bridge, /readCommentTranslatorRealCommentsFeedForActiveSession/, "feed bridge exposes active-session read");
assert.match(bridge, /clearCommentTranslatorRealCommentsFeedForSession/, "feed bridge exposes session clear");
assert.match(f10, /persistCommentTranslatorRealCommentsFeedForActiveSession/, "F10 persists safe feed rows into the bridge");
assert.match(actions, /readCommentTranslatorRealCommentsFeedForActiveSession/, "feed action reads bridge for active durable session");

for (const forbiddenFragment of [
  "public-release capable label: yes",
  "public gate state label: open",
  "browser-visible server-owned feed confirmation: completed",
  "post-bridge full continuation: completed",
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
  [bridgePath, bridge],
  [f10Path, f10],
  [actionsPath, actions]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  "components/comment-translator/CommentTranslatorDock.tsx",
  completionDocPath,
  "lib/comment-translator.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `post-bridge preflight change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 post-bridge continuation ready preflight contract checks passed");
