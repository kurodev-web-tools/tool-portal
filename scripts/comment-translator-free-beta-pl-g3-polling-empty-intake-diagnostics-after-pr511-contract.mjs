import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const foundationPath = "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts";
const commandContractPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs";
const plG3DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const taskPath = "task.md";

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
    `${label} does not contain secret values, token values, credential values, private provider identifiers, live target values, or raw provider/comment values`
  );
}

for (const requiredPath of [foundationPath, commandContractPath, plG3DocPath, readyPreflightPath, taskPath]) {
  assert.ok(exists(requiredPath), `PL-G3 after-PR #511 diagnostics required path exists: ${requiredPath}`);
}

const foundation = read(foundationPath);
const commandContract = read(commandContractPath);
const plG3Doc = read(plG3DocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);

for (const requiredFragment of [
  "pageInfoResultsPerPage",
  "intakeDiagnosticLabel",
  "non-empty-returned-intake",
  "empty-provider-ok-no-items",
  "empty-provider-ok-next-page-present",
  "empty-provider-ok-page-info-nonzero",
  "unavailable-provider-not-ok"
]) {
  assert.match(foundation, new RegExp(requiredFragment), `polling foundation includes ${requiredFragment}`);
  assert.match(commandContract, new RegExp(requiredFragment), `polling command contract covers ${requiredFragment}`);
}

assert.match(
  readyPreflight,
  /pageInfo resultsPerPage label\/count[\s\S]*intake diagnostic label/i,
  "ready preflight documents pageInfo resultsPerPage and intake diagnostic labels"
);
assert.match(
  readyPreflight,
  /non-empty-returned-intake[\s\S]*empty-provider-ok-no-items[\s\S]*empty-provider-ok-next-page-present[\s\S]*empty-provider-ok-page-info-nonzero[\s\S]*unavailable-provider-not-ok/i,
  "ready preflight documents allowed intake diagnostic labels"
);

assert.match(
  plG3Doc,
  /^## Operator-local Polling Empty-intake Diagnostics Metadata After PR #511$/m,
  "PL-G3 doc records after-PR #511 polling empty-intake diagnostics metadata"
);
assert.match(
  plG3Doc,
  /blocked-empty-polling-intake-diagnostics-output-prepared-after-pr511/,
  "PL-G3 doc records after-PR #511 diagnostics-output-prepared decision"
);
assert.match(
  plG3Doc,
  /pageInfo resultsPerPage label\/count[\s\S]*intake diagnostic label/i,
  "PL-G3 doc records prepared sanitized diagnostics metadata"
);
assert.match(
  plG3Doc,
  /Start: not-run[\s\S]*target lookup execution: not-run[\s\S]*`liveChatMessages\.list`: not-run[\s\S]*Azure\/OpenAI provider execution: not-run[\s\S]*UI\/feed confirmation: not-run[\s\S]*Stop: not-run/i,
  "PL-G3 doc keeps live/provider execution not-run for after-PR #511"
);
assert.match(plG3Doc, /public gate state label: unchanged \/ blocked/, "PL-G3 doc keeps public gate blocked");
assert.match(plG3Doc, /public-release capable label: no/, "PL-G3 doc keeps public-release capable no");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g3-(?:polling-empty-intake-diagnostics-after-pr511|empty-intake-polling-diagnostics-read-after-pr512|next-page-target-selection-follow-up-after-pr513|target-selection-diagnostics-after-pr514|start-to-translation-retry-after-pr515)`/,
  "task.md records current after-PR #511 branch"
);
assert.match(
  task,
  /^## Latest PL-G3 Polling Empty-intake Diagnostics Metadata After PR #511$/m,
  "task.md records after-PR #511 latest section"
);
assert.match(
  task,
  /blocked-empty-polling-intake-diagnostics-output-prepared-after-pr511/,
  "task.md records diagnostics-output-prepared decision"
);
assert.match(
  task,
  /Start: not-run[\s\S]*target lookup execution: not-run[\s\S]*`liveChatMessages\.list`: not-run[\s\S]*Azure\/OpenAI provider execution: not-run[\s\S]*UI\/feed confirmation: not-run[\s\S]*Stop: not-run/i,
  "task.md keeps live/provider execution not-run for after-PR #511"
);
assert.match(task, /public gate state label: unchanged \/ blocked/, "task.md keeps public gate blocked");
assert.match(task, /public-release capable label: no/, "task.md keeps public-release capable no");

for (const forbiddenFragment of [
  "Azure/OpenAI provider execution: completed",
  "UI/feed confirmation: completed",
  "public launch gate flip: completed",
  "main promotion: completed",
  "public-release capable label: yes",
  "liveChatMessages.list: executed"
]) {
  assert.doesNotMatch(plG3Doc, new RegExp(forbiddenFragment, "i"), `PL-G3 after-PR #511 doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(forbiddenFragment, "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [foundationPath, foundation],
  [commandContractPath, commandContract],
  [plG3DocPath, plG3Doc],
  [readyPreflightPath, readyPreflight],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  foundationPath,
  commandContractPath,
  plG3DocPath,
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr515-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after-PR #511 diagnostics change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 polling empty-intake diagnostics after PR #511 contract checks passed");
