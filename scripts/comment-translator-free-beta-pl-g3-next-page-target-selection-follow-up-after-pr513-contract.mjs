import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG3DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const taskPath = "task.md";
const pr512ContractPath =
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs";

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

for (const requiredPath of [plG3DocPath, readyPreflightPath, taskPath, pr512ContractPath]) {
  assert.ok(exists(requiredPath), `after-PR #513 next-page target-selection required path exists: ${requiredPath}`);
}

const plG3Doc = read(plG3DocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);
const pr512Contract = read(pr512ContractPath);

assert.match(
  plG3Doc,
  /^## Operator-local Next-page Target-selection Follow-up After PR #513$/m,
  "PL-G3 doc records after-PR #513 next-page target-selection follow-up"
);
assert.match(
  plG3Doc,
  /Decision: blocked-next-page-target-selection-follow-up-prepared-after-pr513/,
  "PL-G3 doc records after-PR #513 decision"
);
assert.match(
  plG3Doc,
  /empty-provider-ok-next-page-present[\s\S]*not non-empty intake[\s\S]*target-selection review/i,
  "PL-G3 doc treats next-page-present empty intake as a target-selection/paging blocker"
);
assert.match(
  plG3Doc,
  /selected target rank label[\s\S]*usable target count[\s\S]*lifecycle\/privacy distribution labels\/counts[\s\S]*no provider title[\s\S]*no broadcast id[\s\S]*no liveChatId/i,
  "PL-G3 doc defines value-free target-selection output shape"
);
assert.match(
  plG3Doc,
  /Start: not-run[\s\S]*target lookup execution: not-run[\s\S]*`liveChatMessages\.list`: not-run[\s\S]*Azure\/OpenAI provider execution: not-run[\s\S]*UI\/feed confirmation: not-run[\s\S]*Stop: not-run/i,
  "PL-G3 doc keeps after-PR #513 as no-live-execution preparation"
);

assert.match(
  readyPreflight,
  /After PR #513 next-page target-selection follow-up/i,
  "ready preflight records after-PR #513 follow-up boundary"
);
assert.match(
  readyPreflight,
  /approved-pl-g3-target-selection-diagnostics-after-pr513/i,
  "ready preflight provides exact approval label for target-selection diagnostics"
);
assert.match(
  readyPreflight,
  /category \/ label \/ pass-fail \/ unavailableReason/i,
  "ready preflight keeps output shape value-free"
);
assert.match(
  readyPreflight,
  /no provider title[\s\S]*no broadcast id[\s\S]*no liveChatId[\s\S]*no raw cursor[\s\S]*no raw comments/i,
  "ready preflight forbids private provider, cursor, and comment values"
);

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513`/,
  "task.md records current after-PR #513 branch"
);
assert.match(
  task,
  /^## Latest PL-G3 Next-page Target-selection Follow-up After PR #513$/m,
  "task.md records after-PR #513 latest section"
);
assert.match(
  task,
  /Decision: blocked-next-page-target-selection-follow-up-prepared-after-pr513/,
  "task.md records after-PR #513 decision"
);
assert.match(
  task,
  /recommended next approval label: approved-pl-g3-target-selection-diagnostics-after-pr513/i,
  "task.md records recommended exact approval label"
);
assert.match(task, /public gate state label: unchanged \/ blocked/i, "task.md keeps public gate blocked");
assert.match(task, /public-release capable label: no/i, "task.md keeps public-release capable no");

assert.match(
  pr512Contract,
  /empty-provider-ok-next-page-present/,
  "after-PR #512 contract still records next-page-present evidence"
);

for (const forbiddenFragment of [
  "Azure/OpenAI provider execution: completed",
  "UI/feed confirmation: completed",
  "public launch gate flip: completed",
  "main promotion: completed",
  "public-release capable label: yes",
  "provider title value",
  "broadcast id value"
]) {
  assert.doesNotMatch(plG3Doc, new RegExp(forbiddenFragment, "i"), `PL-G3 after-PR #513 doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(forbiddenFragment, "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [plG3DocPath, plG3Doc],
  [readyPreflightPath, readyPreflight],
  [taskPath, task],
  [pr512ContractPath, pr512Contract]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG3DocPath,
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  pr512ContractPath,
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after-PR #513 next-page target-selection change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 next-page target-selection follow-up after PR #513 contract checks passed");
