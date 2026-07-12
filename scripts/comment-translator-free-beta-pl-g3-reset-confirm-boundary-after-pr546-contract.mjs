import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const commandPath = "scripts/comment-translator-free-beta-pl-g3-reset-confirm-boundary-after-pr546.mjs";
const contractPath = "scripts/comment-translator-free-beta-pl-g3-reset-confirm-boundary-after-pr546-contract.mjs";
const completionDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const taskPath = "task.md";

const approvalLabel = "approved-pl-g3-test-account-usage-session-reset-after-pr546";
const retryApprovalLabel = "approved-pl-g3-post-bridge-full-continuation-after-pr542";
const mergeCommit = "9e714e72e5143e1dd7ac5a60d5fb95a4137f3393";

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

for (const requiredPath of [commandPath, completionDocPath, readyPreflightPath, taskPath]) {
  assert.ok(exists(requiredPath), `PL-G3 reset boundary required path exists: ${requiredPath}`);
}

const commandSource = read(commandPath);
const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);

const blockedOutput = (() => {
  try {
    execFileSync("node", [commandPath, "--check-env-only"], {
      cwd: root,
      encoding: "utf8",
      env: {}
    });
    assert.fail("reset command should block when env references are absent");
  } catch (error) {
    return String(error.stdout ?? "");
  }
})();

assert.match(blockedOutput, /blocked-missing-env-references/i, "reset command blocks without env references");
assert.match(blockedOutput, /outputPolicy/i, "blocked output includes sanitized output policy");
assert.doesNotMatch(blockedOutput, /undefined|null|owner_user_id\s*[:=]|Bearer|Authorization\s*[:=]/i, "blocked output avoids private/raw labels");

const reviewOutput = execFileSync("node", [commandPath, "--print-exact-command-review"], {
  cwd: root,
  encoding: "utf8"
});
assert.match(reviewOutput, new RegExp(escaped(approvalLabel)), "command review prints exact reset approval label");
assert.match(reviewOutput, /comment_translator_sessions/i, "command review names the session limiter table");
assert.match(reviewOutput, /comment_translator_usage_ledger_events/i, "command review names the usage limiter table");
assert.doesNotMatch(reviewOutput, /owner_user_id value|raw row|raw id|raw time|quota value|cookie value/i, "command review avoids forbidden values");

for (const requiredFragment of [
  "const approvalLabel = \"approved-pl-g3-test-account-usage-session-reset-after-pr546\"",
  "COMMENT_TRANSLATOR_RESET_TEST_ACCOUNT_OWNER_USER_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "comment_translator_sessions",
  "comment_translator_usage_ledger_events",
  "blocked-pending-exact-approval",
  "resetStatusLabel",
  "sessionRowsTouchedCount",
  "usageLedgerRowsTouchedCount",
  "rawRowsPrintedLabel: \"no\"",
  "rawIdsPrintedLabel: \"no\"",
  "rawTimesPrintedLabel: \"no\"",
  "startCommandExecutedLabel: \"no\"",
  "stopCommandExecutedLabel: \"no\"",
  "liveProviderExecutionLabel: \"not-run\"",
  "publicGateStateLabel: \"unchanged / blocked\"",
  "publicReleaseCapableLabel: \"no\""
]) {
  assert.match(commandSource, new RegExp(escaped(requiredFragment), "i"), `reset command includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "liveChatMessages.list",
  "credentialReferenceId",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE",
  "wrangler deploy",
  "npx supabase db push",
  "public-release capable label: yes"
]) {
  assert.doesNotMatch(commandSource, new RegExp(escaped(forbiddenFragment), "i"), `reset command excludes ${forbiddenFragment}`);
}

for (const requiredFragment of [
  "## PL-G3 Post-#546 Test-account Usage/session Reset Confirmation Boundary",
  `Base state: PR #546 is merged at \`${mergeCommit}\` and contained in latest \`origin/codex/comment-translator-free-public-beta-integration\`.`,
  `Exact reset approval label required before mutation: \`${approvalLabel}\``,
  "Reviewed reset command shape:",
  "node scripts/comment-translator-free-beta-pl-g3-reset-confirm-boundary-after-pr546.mjs --check-env-only",
  "node scripts/comment-translator-free-beta-pl-g3-reset-confirm-boundary-after-pr546.mjs --print-exact-command-review",
  "node scripts/comment-translator-free-beta-pl-g3-reset-confirm-boundary-after-pr546.mjs --execute --approved-pl-g3-reset-confirm-boundary-after-pr546 --json",
  "Reset scope: test-account Free beta session/usage limiter state only",
  "Remote mutation status before exact approval: not-run / blocked-pending-exact-approval",
  "After reset, run status-only verification before asking the operator to start or keep the live stream/chat active",
  "Required sanitized status-only labels after an approved reset: sessionStatusLabel, stopReasonLabel, usage/session counter presence label, usage policy label, usage policy stop reason label, status label, Start label no, Stop label no, public gate state label unchanged / blocked, public-release capable label no",
  `PL-G3 retry approval remains separate: \`${retryApprovalLabel}\``,
  "Do not run Start/Stop/live/provider/UI commands from this reset boundary"
]) {
  assert.match(completionDoc, new RegExp(escaped(requiredFragment), "i"), `completion doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "After PR #546 reset-confirm-and-start-to-translation retry continuation",
  `Exact reset approval label: \`${approvalLabel}\``,
  "Confirm reset/status-only unblocked state before starting or keeping the stream/chat active",
  `Exact PL-G3 retry approval remains separate: \`${retryApprovalLabel}\``,
  "Do not conflate reset approval with Start-to-translation retry approval"
]) {
  assert.match(readyPreflight, new RegExp(escaped(requiredFragment), "i"), `ready preflight includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "Current branch: `codex/pl-g3-reset-confirm-boundary-after-546`",
  "Active PL-G3 Post-#546 Reset-confirm Boundary",
  "Decision: reset-confirm-boundary-prepared-after-pr546",
  `PR #546 merge commit: \`${mergeCommit}\``,
  "Pre-approval remote mutation state: not-run / blocked-pending-exact-approval",
  "Reset command boundary prepared: present",
  "Status-only verification after reset: not-run because reset was not approved/executed",
  "Start-to-translation retry: not-run / blocked-pending-separate-exact-approval",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(task, new RegExp(escaped(requiredFragment), "i"), `task.md includes ${requiredFragment}`);
}

for (const forbiddenFragment of [
  "reset execution: completed",
  "Start-to-translation retry: completed",
  "public-release capable label: yes",
  "public gate state label: open",
  "PL-G4: completed",
  "PL-G5: completed"
]) {
  assert.doesNotMatch(completionDoc, new RegExp(escaped(forbiddenFragment), "i"), `completion doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(escaped(forbiddenFragment), "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [commandPath, commandSource],
  [completionDocPath, completionDoc],
  [readyPreflightPath, readyPreflight],
  [taskPath, task],
  [contractPath, read(contractPath)]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  commandPath,
  contractPath,
  completionDocPath,
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 reset boundary change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 reset-confirm boundary after PR #546 contract checks passed");
