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

const branchName = "codex/pl-g3-post-bridge-continuation-ready-preflight";
const approvalLabel = "approved-pl-g3-post-bridge-full-continuation-after-pr542";
const pr542MergeCommit = "d1b2215d9cd1abe1ca8d93319d1e64c26115fa70";
const decisionLabel = "post-bridge-full-continuation-ready-preflight-prepared-after-pr542";

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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
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
  "Required later evidence: browser-visible server-owned feed reads sanitized translated rows",
  "Required later evidence: source attribution / stop reason / usage-session counters / translated and skipped counts",
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
  completionDocPath,
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `post-bridge preflight change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 post-bridge continuation ready preflight contract checks passed");
