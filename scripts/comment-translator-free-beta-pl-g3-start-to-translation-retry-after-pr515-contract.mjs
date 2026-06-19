import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG3DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const taskPath = "task.md";
const afterPr514ContractPath =
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs";
const pollingCommandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|credentialReferenceId\s*[:=]\s*["'](?!(?:never-returned-by-design|smoke-livechat-[^"']+))[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|raw(?:Provider|Error|Response|Message|Reason|Comment)(?:Body|Payload|Message|Reason|Text|s|Value)?\s*[:=]\s*["'](?!not-requested-not-documented|not-returned-by-design|never-recorded-by-design|never-returned-by-design|forbidden)[^"']+/i,
    `${label} does not contain secret values, token values, credential values, private provider identifiers, live target values, raw provider/comment values, or private cursor values`
  );
}

for (const requiredPath of [plG3DocPath, taskPath, afterPr514ContractPath, pollingCommandPath]) {
  assert.ok(exists(requiredPath), `after-PR #515 retry required path exists: ${requiredPath}`);
}

const plG3Doc = read(plG3DocPath);
const task = read(taskPath);
const afterPr514Contract = read(afterPr514ContractPath);
const pollingCommand = read(pollingCommandPath);

assert.match(
  plG3Doc,
  /^## Operator-local Start-to-translation Retry After PR #515$/m,
  "PL-G3 doc records after-PR #515 Start-to-translation retry"
);
assert.match(
  plG3Doc,
  /Decision: blocked-empty-polling-intake-after-pr515/,
  "PL-G3 doc records after-PR #515 retry decision"
);
assert.match(
  plG3Doc,
  /Exact approval label consumed: `approved-fb-l4-start-to-translation-smoke`/,
  "PL-G3 doc records exact approval label"
);

for (const requiredRow of [
  /\| status route precheck \| not-started \| pass \| none \|/,
  /\| explicit Start \| active \| pass \| none \|/,
  /\| target lookup \| target presence present \/ provider route liveBroadcasts-list-target-lookup-only \/ returned count 5 \/ selected target rank rank-1 \/ usable target count 1 \| pass \| none \|/,
  /\| fresh chat message after Start \| posted-by-operator-local \| pass \| none \|/,
  /\| one bounded `liveChatMessages\.list` polling step \| provider-ok \/ returned count 0 \/ polling interval present \/ intake label empty-provider-ok-next-page-present \| fail-for-start-to-translation \| none \|/,
  /\| explicit Stop \| stopped \/ user-stop \| pass \| none \|/
]) {
  assert.match(plG3Doc, requiredRow, `PL-G3 doc records sanitized retry row: ${requiredRow}`);
}

assert.match(
  plG3Doc,
  /Free Azure provider harness: not-run[\s\S]*UI\/feed confirmation: not-run[\s\S]*public gate state label: unchanged \/ blocked[\s\S]*public-release capable label: no/i,
  "PL-G3 doc keeps Azure/UI/public gate blocked after empty intake"
);
assert.match(
  plG3Doc,
  /Target-selection diagnostics do not indicate selected-chat-surface mismatch[\s\S]*Non-empty intake remains unproven/i,
  "PL-G3 doc records the residual blocker after target selection pass"
);

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g3-(?:start-to-translation-retry-after-pr515|empty-provider-ok-next-page-cursor-diagnostics-after-pr516)`/,
  "task.md records current after-PR #515 branch"
);
assert.match(
  task,
  /^## Latest PL-G3 Start-to-translation Retry After PR #515$/m,
  "task.md records latest after-PR #515 section"
);
assert.match(
  task,
  /Decision: blocked-empty-polling-intake-after-pr515/,
  "task.md records after-PR #515 decision"
);
assert.match(task, /public gate state label: unchanged \/ blocked/i, "task.md keeps public gate blocked");
assert.match(task, /public-release capable label: no/i, "task.md keeps public-release capable no");

assert.match(
  afterPr514Contract,
  /blocked-target-selection-diagnostics-reviewed-after-pr514/,
  "after-PR #514 contract still records target-selection diagnostics"
);
assert.match(
  pollingCommand,
  /--approved-live-chat-polling-smoke/,
  "polling command still requires exact polling smoke approval"
);

for (const forbiddenFragment of [
  "Free Azure provider harness: completed",
  "Azure/OpenAI provider execution: completed",
  "UI/feed confirmation: completed",
  "public launch gate flip: completed",
  "main promotion: completed",
  "public-release capable label: yes"
]) {
  assert.doesNotMatch(plG3Doc, new RegExp(forbiddenFragment, "i"), `PL-G3 after-PR #515 doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(forbiddenFragment, "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [plG3DocPath, plG3Doc],
  [taskPath, task],
  [afterPr514ContractPath, afterPr514Contract],
  [pollingCommandPath, pollingCommand]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG3DocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  taskPath,
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr515-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after-PR #515 retry change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 Start-to-translation retry after PR #515 contract checks passed");
