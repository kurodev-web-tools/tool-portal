import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG3DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|credentialReferenceId\s*[:=]\s*["'](?!(?:never-returned-by-design|smoke-livechat-[^"']+))[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|raw(?:Provider|Error|Response|Message|Reason|Comment)(?:Body|Payload|Message|Reason|Text|s|Value)?\s*[:=]\s*["'](?!not-requested-not-documented|not-returned-by-design|never-recorded-by-design|never-returned-by-design|forbidden)[^"']+/i,
    `${label} does not contain secret values, token values, credential values, private provider identifiers, live target values, or raw provider/comment values`
  );
}

for (const requiredPath of [plG3DocPath, taskPath]) {
  assert.ok(exists(requiredPath), `PL-G3 token material after PR #508 required path exists: ${requiredPath}`);
}

const plG3Doc = read(plG3DocPath);
const task = read(taskPath);

assert.match(
  plG3Doc,
  /^## Operator-local Token Material Availability Recheck After PR #508$/m,
  "PL-G3 doc records token material availability recheck after PR #508"
);

for (const requiredFragment of [
  "token-material-availability-resolved-after-pr508",
  "live-chat-target-lookup-token-material-available",
  "live-chat-polling-token-material-available",
  "tokenMaterialAvailability: available",
  "serverFetchBinding: resolved-for-server-fetch",
  "providerAccess: not-run-token-material-availability-only",
  "Start: not-run",
  "`liveChatMessages.list`: not-run",
  "Azure/OpenAI provider execution: not-run",
  "UI/feed confirmation: not-run",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(plG3Doc, new RegExp(escaped(requiredFragment), "i"), `PL-G3 doc includes ${requiredFragment}`);
}

for (const requiredTaskFragment of [
  "Current branch: `codex/comment-translator-free-beta-pl-g3-token-material-availability-runtime-after-pr508`",
  "Latest PL-G3 Token Material Availability After PR #508",
  "token-material-availability-resolved-after-pr508",
  "live-chat-target-lookup-token-material-available",
  "live-chat-polling-token-material-available",
  "Start: not-run",
  "`liveChatMessages.list`: not-run",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "width checks skipped"
]) {
  assert.match(task, new RegExp(escaped(requiredTaskFragment), "i"), `task.md includes ${requiredTaskFragment}`);
}

for (const forbiddenFragment of [
  "Start: completed",
  "`liveChatMessages.list`: completed",
  "Azure/OpenAI provider execution: completed",
  "UI/feed confirmation: completed",
  "public launch gate flip: completed",
  "main promotion: completed"
]) {
  assert.doesNotMatch(plG3Doc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G3 after-PR #508 doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(escaped(forbiddenFragment), "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [plG3DocPath, plG3Doc],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG3DocPath,
  taskPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-after-pr504-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr515-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 token material after-PR #508 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 token material availability after PR #508 contract checks passed");
