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

for (const requiredPath of [completionDocPath, readyPreflightPath, taskPath, wrapperPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `required path exists: ${requiredPath}`);
}

const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);
const wrapper = read(wrapperPath);

for (const requiredFragment of [
  "## Approved Sanitized Wrapper Execution After PR #534",
  "partial-start-to-translation-continuation-counts-recorded-after-pr534 / blocked-translated-source-ui-evidence",
  "PR #534 merge commit `829480ee1be79dac0f7e00532dceb334a652d125`",
  "same-thread exact approval used label `approved-pl-g3-start-to-translation-continuation-after-pr531`",
  "status route precheck: executed / HTTP 200 / session status label `not-started`",
  "explicit Start: executed / HTTP 200 / session status label `active`",
  "reviewed sanitized wrapper: executed / child exit status label `exit-0` / stdout final JSON parsed true",
  "returned count 3 / eligible count 3 / provider request count 3 / provider call count 3 / translated count 0 / skipped count 3",
  "source attribution label `unavailable`",
  "explicit Stop: executed / HTTP 200 / session status label `stopped` / stop reason label `user-stop`",
  "post-Stop status: executed / HTTP 200 / session status label `not-started`",
  "UI/feed confirmation: not-run / requires-browser-visible-evidence-after-wrapper-counts-review",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(completionDoc, new RegExp(escaped(requiredFragment), "i"), `completion doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "Approved PL-G3 Sanitized Wrapper Execution After PR #534",
  "partial-start-to-translation-continuation-counts-recorded-after-pr534",
  "returned count 3 / eligible count 3 / provider request count 3 / provider call count 3 / translated count 0 / skipped count 3",
  "source attribution label `unavailable`",
  "UI/feed confirmation remains not-run / requires-browser-visible-evidence-after-wrapper-counts-review",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(task, new RegExp(escaped(requiredFragment), "i"), `task.md includes ${requiredFragment}`);
}

assert.match(
  readyPreflight,
  /node scripts\/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533\.mjs --execute --approved-pl-g3-sanitized-wrapper-after-pr533 --reviewed-provider-harness-child/,
  "ready preflight keeps the reviewed wrapper execution command"
);
assert.match(wrapper, /parseFinalJsonFromStdout/, "wrapper still parses final JSON from stdout only");
assert.match(wrapper, /child\.stderr/, "wrapper still captures stderr separately");

for (const forbiddenFragment of [
  "public-release capable label: yes",
  "public gate state label: open",
  "limited public beta open: completed",
  "public launch gate flip: completed",
  "UI/feed confirmation: completed",
  "source attribution label `youtube-live-chat`",
  "translated count 3",
  "deploy/upload: completed",
  "remote mutation: completed",
  "Stripe action: completed"
]) {
  assert.doesNotMatch(completionDoc, new RegExp(escaped(forbiddenFragment), "i"), `completion doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(escaped(forbiddenFragment), "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [completionDocPath, completionDoc],
  [readyPreflightPath, readyPreflight],
  [taskPath, task],
  [wrapperPath, wrapper]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  completionDocPath,
  taskPath,
  wrapperPath,
  "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-continuation-after-pr531-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-continuation-after-pr534-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-diagnostic-boundary-after-pr535-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after PR #534 execution evidence change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 Start-to-translation continuation after PR #534 contract checks passed");
