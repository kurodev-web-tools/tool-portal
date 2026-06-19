import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const triageDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md";
const taskPath = "task.md";

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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|raw(?:Provider|Error|Response|Message|Reason|Comment)(?:Body|Payload|Message|Reason|Text|s|Value)?\s*[:=]\s*["'](?!not-requested-not-documented|not-returned-by-design|never-recorded-by-design|never-returned-by-design|forbidden)[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw provider/comment values`
  );
}

for (const requiredPath of [triageDocPath, taskPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `PL-G3 after-PR #505 confirmation-output required path exists: ${requiredPath}`);
}

const triageDoc = read(triageDocPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Operator-local Sanitized Confirmation Output Collection Ready After PR #505",
  "## Operator-local Sanitized Output Template After PR #505",
  "## Operator-local Local Action Instructions After PR #505"
]) {
  assert.match(triageDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G3 after-PR #505 doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "PR #505",
  "next follow-up after PR #505",
  "blocked-missing-operator-local-confirmation-output",
  "operator-local sanitized confirmation output",
  "category / label / pass-fail / unavailableReason",
  "OAuth scope category",
  "target live chat availability",
  "owner/channel binding",
  "provider permission state",
  "quota/rate-limit state",
  "values stay local",
  "do not paste values into chat",
  "PL-G3 remains blocked-provider-permission-rejected-after-target-present / Azure-UI-not-run",
  "PL-G4 remains production/custom deployed smoke not-run / approval-gated",
  "PL-G5 remains keep blocked / blocked-no-approval",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(triageDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G3 after-PR #505 doc includes ${requiredFragment}`);
}

for (const requiredRow of [
  "| OAuth scope category | pending-operator-local-confirmation-output | fail | operator-local sanitized confirmation output not supplied after PR #505 |",
  "| target live chat availability | pending-operator-local-confirmation-output | fail | operator-local sanitized confirmation output not supplied after PR #505 |",
  "| owner/channel binding | pending-operator-local-confirmation-output | fail | operator-local sanitized confirmation output not supplied after PR #505 |",
  "| provider permission state | pending-operator-local-confirmation-output | fail | operator-local sanitized confirmation output not supplied after PR #505 |",
  "| quota/rate-limit state | pending-operator-local-confirmation-output | fail | operator-local sanitized confirmation output not supplied after PR #505 |"
]) {
  assert.match(triageDoc, new RegExp(escaped(requiredRow), "i"), `PL-G3 after-PR #505 doc includes sanitized pending row: ${requiredRow}`);
}

assert.match(
  triageDoc,
  /If env setup, YouTube-side confirmation, stream start, OAuth reconnect, browser session refresh, or provider console review is required[\s\S]*set or confirm it only in operator-local context[\s\S]*record only the allowed category \/ label \/ pass-fail \/ unavailableReason output/i,
  "PL-G3 after-PR #505 doc gives operator-local setup instructions without requesting values"
);

assert.match(
  triageDoc,
  /Do not run Start[\s\S]*Do not run Stop[\s\S]*Do not run target lookup[\s\S]*Do not run `liveChatMessages\.list`[\s\S]*Do not run Azure\/OpenAI provider execution[\s\S]*Do not run UI\/feed confirmation/i,
  "PL-G3 after-PR #505 doc preserves no-live boundary"
);

for (const requiredTaskFragment of [
  "Current branch: `codex/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505`",
  "Latest PL-G3 Operator-local Provider-permission Confirmation Output Preparation After PR #505",
  "next follow-up after PR #505",
  "pending-operator-local-confirmation-output",
  "operator-local sanitized confirmation output not supplied after PR #505",
  "values stay local",
  "do not paste values into chat",
  "PL-G3 remains blocked-provider-permission-rejected-after-target-present / Azure-UI-not-run",
  "PL-G4 remains production/custom deployed smoke not-run / approval-gated",
  "PL-G5 remains keep blocked / blocked-no-approval",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "no-live docs/contracts/task follow-up",
  "width checks skipped"
]) {
  assert.match(task, new RegExp(escaped(requiredTaskFragment), "i"), `task.md includes ${requiredTaskFragment}`);
}

for (const forbiddenFragment of [
  "Start: completed",
  "Stop: completed",
  "target lookup: completed",
  "liveChatMessages.list: completed",
  "Azure translation: completed",
  "UI/feed confirmation: completed",
  "production/custom deployed smoke execution: completed",
  "limited public beta open: completed",
  "public launch gate flip: completed",
  "main promotion: completed"
]) {
  assert.doesNotMatch(triageDoc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G3 after-PR #505 doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(escaped(forbiddenFragment), "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [triageDocPath, triageDoc],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  triageDocPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-after-pr504-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after-PR #505 confirmation-output change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 operator-local provider-permission confirmation output after PR #505 contract checks passed");
