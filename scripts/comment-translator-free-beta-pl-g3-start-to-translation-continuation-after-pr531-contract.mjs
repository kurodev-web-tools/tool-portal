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
const pollingCommandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";
const providerHarnessPath = "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs";

const continuationDecision = "blocked-start-to-translation-continuation-approval-required-after-pr531";
const continuationApprovalLabel = "approved-pl-g3-start-to-translation-continuation-after-pr531";

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

for (const requiredPath of [completionDocPath, readyPreflightPath, taskPath, pollingCommandPath, providerHarnessPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `required path exists: ${requiredPath}`);
}

const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);
const pollingCommand = read(pollingCommandPath);
const providerHarness = read(providerHarnessPath);

for (const requiredFragment of [
  "## Start-to-translation Continuation Boundary After PR #531",
  continuationDecision,
  "PR #531 merge commit `bebd725ffc36c5040d0f518f882be03873976a38`",
  "same-process target-refresh non-empty intake evidence",
  "natural child process exit cleanliness is not proven",
  "Free Azure translation: not-run / approval-gated",
  "UI/feed confirmation: not-run / approval-gated",
  "usage/source-attribution evidence: not-run / approval-gated",
  "Stop after successful intake: not-run / approval-gated",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  continuationApprovalLabel
]) {
  assert.match(completionDoc, new RegExp(escaped(requiredFragment), "i"), `completion doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "After PR #531 Start-to-translation continuation approval boundary",
  continuationApprovalLabel,
  "limited to the exact status, Start, server-only live target lookup, bounded liveChatMessages.list polling needed to preserve the non-empty intake path, Free Azure translation, UI feed confirmation, usage/source-attribution evidence, and Stop boundary",
  "Do not run PL-G4, PL-G5, deploy/upload, remote mutation, public access changes, cursor regeneration, OAuth flows, token refresh, Stripe actions, Paid entitlement C1/C3, Creator paid limits, main promotion, or public launch gate flip.",
  "If polling returns empty intake, provider-not-ok, or a missing readiness reference, stop before Azure/UI and record sanitized blocker labels only."
]) {
  assert.match(readyPreflight, new RegExp(escaped(requiredFragment), "i"), `ready preflight includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "Current branch: `codex/pl-g3-start-to-translation-continuation-after-pr531`",
  "Latest PL-G3 Start-to-translation Continuation Boundary After PR #531",
  continuationDecision,
  continuationApprovalLabel,
  "PR #531 merge commit: `bebd725ffc36c5040d0f518f882be03873976a38`",
  "same-process target-refresh non-empty intake evidence",
  "natural child process exit cleanliness is not proven",
  "Free Azure translation: not-run / approval-gated",
  "UI/feed confirmation: not-run / approval-gated",
  "usage/source-attribution evidence: not-run / approval-gated",
  "Stop after successful intake: not-run / approval-gated",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(task, new RegExp(escaped(requiredFragment), "i"), `task.md includes ${requiredFragment}`);
}

assert.match(
  pollingCommand,
  /approved-live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics/,
  "polling command keeps the reviewed same-process target-refresh diagnostic boundary"
);
assert.match(
  providerHarness,
  /approved-private-gated-live-provider-smoke/,
  "provider harness remains explicit-approval gated before Azure provider execution"
);

for (const forbiddenFragment of [
  "public-release capable label: yes",
  "public gate state label: open",
  "limited public beta open: completed",
  "public launch gate flip: completed",
  "Free Azure translation: completed",
  "UI/feed confirmation: completed",
  "Stop after successful intake: completed",
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
  [pollingCommandPath, pollingCommand],
  [providerHarnessPath, providerHarness]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  completionDocPath,
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-root-cause-triage-after-pr528-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-continuation-after-pr531-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after PR #531 continuation change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 Start-to-translation continuation after PR #531 contract checks passed");
