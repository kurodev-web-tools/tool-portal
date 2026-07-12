import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG3DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const taskPath = "task.md";
const targetLookupCommandPath = "scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs";
const afterPr513ContractPath =
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs";

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

for (const requiredPath of [plG3DocPath, taskPath, targetLookupCommandPath, afterPr513ContractPath]) {
  assert.ok(exists(requiredPath), `after-PR #514 target-selection diagnostics required path exists: ${requiredPath}`);
}

const plG3Doc = read(plG3DocPath);
const task = read(taskPath);
const targetLookupCommand = read(targetLookupCommandPath);
const afterPr513Contract = read(afterPr513ContractPath);

assert.match(
  plG3Doc,
  /^## Operator-local Target-selection Diagnostics After PR #514$/m,
  "PL-G3 doc records after-PR #514 target-selection diagnostics"
);
assert.match(
  plG3Doc,
  /Decision: blocked-target-selection-diagnostics-reviewed-after-pr514/,
  "PL-G3 doc records after-PR #514 decision"
);
assert.match(
  plG3Doc,
  /status label: live-chat-target-lookup-sanitized-result[\s\S]*provider route label: liveBroadcasts-list-target-lookup-only/i,
  "PL-G3 doc records the approved target-lookup-only route"
);

for (const requiredRow of [
  /\| selected target rank \| rank-1 \| pass \| none \|/,
  /\| usable target count \| usable-target-count-1 \| pass \| none \|/,
  /\| selected target presence \| present \| pass \| none \|/,
  /\| selected target source \| first-live-owned-broadcast-with-live-chat-target \| pass \| none \|/,
  /\| lifecycle\/privacy distribution \| returned-count-5 lifecycle\[complete=4;live=1\] privacy\[unlisted=5\] \| pass \| none \|/,
  /\| chat-surface mismatch hypothesis \| mismatch-not-indicated-by-target-selection-diagnostics \| pass \| none \|/
]) {
  assert.match(plG3Doc, requiredRow, `PL-G3 doc records sanitized row: ${requiredRow}`);
}

assert.match(
  plG3Doc,
  /Start: not-run[\s\S]*`liveChatMessages\.list`: not-run[\s\S]*Azure\/OpenAI provider execution: not-run[\s\S]*UI\/feed confirmation: not-run[\s\S]*Stop: not-run/i,
  "PL-G3 doc keeps non-approved actions not-run after PR #514"
);
assert.match(
  plG3Doc,
  /PL-G3 remains blocked because non-empty intake and Start-to-translation completion are still unproven/i,
  "PL-G3 doc keeps the launch blocker explicit"
);

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g3-(?:target-selection-diagnostics-after-pr514|start-to-translation-retry-after-pr515|empty-provider-ok-next-page-cursor-diagnostics-after-pr516|next-page-cursor-diagnostics-after-pr517|next-page-cursor-diagnostics-after-pr518|first-page-next-page-diagnostics-after-pr519|first-page-next-page-diagnostics-after-pr520|between-pages-fresh-comment-diagnostics-after-pr521|between-pages-fresh-comment-command-after-pr522|between-pages-fresh-comment-execution-after-pr523|between-pages-fresh-comment-retry-after-pr524)`/,
  "task.md records current after-PR #514 branch"
);
assert.match(
  task,
  /^## Latest PL-G3 Target-selection Diagnostics After PR #514$/m,
  "task.md records latest after-PR #514 section"
);
assert.match(
  task,
  /Decision: blocked-target-selection-diagnostics-reviewed-after-pr514/,
  "task.md records after-PR #514 decision"
);
assert.match(task, /public gate state label: unchanged \/ blocked/i, "task.md keeps public gate blocked");
assert.match(task, /public-release capable label: no/i, "task.md keeps public-release capable no");

assert.match(
  targetLookupCommand,
  /--approved-live-chat-target-lookup/,
  "target lookup command still requires exact execution approval"
);
assert.match(
  afterPr513Contract,
  /approved-pl-g3-target-selection-diagnostics-after-pr513/,
  "after-PR #513 contract still records the approval boundary consumed by this follow-up"
);

for (const forbiddenFragment of [
  "Azure/OpenAI provider execution: completed",
  "UI/feed confirmation: completed",
  "public launch gate flip: completed",
  "main promotion: completed",
  "public-release capable label: yes"
]) {
  assert.doesNotMatch(plG3Doc, new RegExp(forbiddenFragment, "i"), `PL-G3 after-PR #514 doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(forbiddenFragment, "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [plG3DocPath, plG3Doc],
  [taskPath, task],
  [targetLookupCommandPath, targetLookupCommand],
  [afterPr513ContractPath, afterPr513Contract]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG3DocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  taskPath,
  "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts",
  "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-root-cause-triage-after-pr528-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-same-process-target-refresh-to-bounded-polling-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr515-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after-PR #514 target-selection diagnostics change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 target-selection diagnostics after PR #514 contract checks passed");
