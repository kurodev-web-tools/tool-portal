import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docPath = "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md";
const taskPath = "task.md";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const toolCredentialSourcePath = "lib/comment-translator-youtube-tool-credential-source.ts";
const disconnectRuntimePath = "lib/comment-translator-youtube-disconnect-runtime.ts";
const connectionReadinessDocPath =
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync(
    "git diff --name-only origin/codex/comment-translator-youtube-oauth-integration...HEAD",
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }
  )
    .split(/\r?\n/)
    .filter(Boolean);
  const workingTreeDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const stagedDiff = execSync("git diff --cached --name-only", {
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

  return [...new Set([...committedDiff, ...workingTreeDiff, ...stagedDiff, ...untracked])].map((file) =>
    file.replace(/\\/g, "/")
  );
}

assert.ok(exists(docPath), "Task 8 allowed-tester session start smoke readiness doc exists");
assert.ok(exists(taskPath), "task.md exists");
assert.ok(exists(sessionRuntimePath), "session runtime exists");
assert.ok(exists(actionsPath), "tool session server actions exist");
assert.ok(exists(toolCredentialSourcePath), "Task 6 tool credential source boundary exists");
assert.ok(exists(disconnectRuntimePath), "translator start readiness runtime exists");
assert.ok(exists(connectionReadinessDocPath), "Task 7 connection smoke readiness doc remains available");

const doc = read(docPath);
const task = read(taskPath);
const sessionRuntime = read(sessionRuntimePath);
const actions = read(actionsPath);
const toolCredentialSource = read(toolCredentialSourcePath);
const disconnectRuntime = read(disconnectRuntimePath);
const connectionReadinessDoc = read(connectionReadinessDocPath);

for (const requiredFragment of [
  "Allowed-tester session start smoke readiness",
  "same-thread ready preflight",
  "sanitized output review",
  "explicit in-thread approval",
  "session start preflight",
  "provider/live execution boundary",
  "stop behavior checklist",
  "sanitized count/status evidence",
  "explicit blocker handling",
  "counts/status/stop reasons only",
  "blocker/readiness only",
  "emergency disable",
  "missing env",
  "browser-safe",
  "No provider target lookup",
  "No liveChatId lookup",
  "No session start smoke",
  "No live/provider execution",
  "Width checks are skipped"
]) {
  assert.match(doc, new RegExp(requiredFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `doc records: ${requiredFragment}`);
}

for (const forbiddenOutputLabel of [
  "OAuth access token value",
  "OAuth refresh token value",
  "authorization code value",
  "owner user id value",
  "provider channel id value",
  "liveChatId value",
  "service role key value",
  "Authorization header value",
  "Stripe secret key value",
  "webhook signing secret value",
  "provider target metadata",
  "raw comments",
  "browser storage payload",
  "handoff payload"
]) {
  assert.match(
    doc,
    new RegExp(forbiddenOutputLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `doc explicitly forbids evidence/output: ${forbiddenOutputLabel}`
  );
}

for (const gatedAction of [
  "provider target lookup",
  "liveChatId lookup",
  "session start smoke",
  "translation provider API execution",
  "live/provider execution",
  "Google OAuth live connect",
  "YouTube OAuth live connect",
  "live authorization code exchange",
  "live token persistence",
  "deploy/upload",
  "remote mutation",
  "remote schema migration",
  "Stripe live-mode action",
  "Customer Portal redirect",
  "webhook registration"
]) {
  assert.match(
    doc,
    new RegExp(gatedAction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `doc records gated action: ${gatedAction}`
  );
}

for (const allowedEvidenceLabel of [
  "preflight-ready",
  "blocked-missing-env",
  "blocked-disabled",
  "blocked-no-approval",
  "blocked-no-allowed-tester-session",
  "blocked-no-connected-credential",
  "blocked-private-launch-gated",
  "blocked-output-review-incomplete",
  "negative-session-start-not-run",
  "not-run",
  "not-started",
  "active",
  "stopped",
  "user-stop",
  "reconnect-required",
  "session-limit",
  "missing-heartbeat",
  "provider-quota-stop",
  "global-budget-stop",
  "ai-budget-stop"
]) {
  assert.match(doc, new RegExp(`\\b${allowedEvidenceLabel}\\b`), `doc records allowed evidence/status label: ${allowedEvidenceLabel}`);
}

assert.match(
  doc,
  /If approval is not present[\s\S]*blocker\/readiness only/i,
  "doc records the no-approval completion path"
);
assert.match(
  doc,
  /If approval is granted[\s\S]*counts\/status\/stop reasons only/i,
  "doc records the approved sanitized count/status/stop-reason evidence path"
);
assert.match(
  doc,
  /The approved session start smoke must stop after[\s\S]*sanitized session status[\s\S]*No polling loop[\s\S]*translation provider call/i,
  "doc bounds the approved smoke to session status and excludes provider execution"
);
assert.match(
  doc,
  /stop behavior checklist[\s\S]*user-stop[\s\S]*missing-heartbeat[\s\S]*session-time-limit[\s\S]*provider-quota-stop[\s\S]*global-budget-stop[\s\S]*ai-budget-stop/i,
  "doc records the stop behavior checklist"
);

assert.match(sessionRuntime, /^import "server-only";/m, "session runtime remains server-only");
assert.match(
  sessionRuntime,
  /providerApiUsageBeforeExplicitStart:\s*"not-started-before-explicit-start"/,
  "session runtime keeps provider usage blocked before explicit start"
);
assert.match(
  sessionRuntime,
  /aiUsageBeforeExplicitStart:\s*"not-started-before-explicit-start"/,
  "session runtime keeps AI translation usage blocked before explicit start"
);
assert.match(
  sessionRuntime,
  /providerTargetLookup:\s*"not-run-in-task-7"/,
  "session runtime still does not run provider target lookup in readiness path"
);
assert.match(sessionRuntime, /stopReasons:\s*\[/, "session runtime exposes sanitized stop reasons");
assert.match(actions, /startCommentTranslatorSessionAction/, "tool actions expose explicit session start action");
assert.match(actions, /readCredentialReadiness/, "session start reads credential readiness before start");
assert.match(actions, /readCommentTranslatorPrivateLaunchAccess/, "session start keeps private-launch gate");
assert.match(toolCredentialSource, /^import "server-only";/m, "Task 6 credential source remains server-only");
assert.match(toolCredentialSource, /providerTargetLookup:\s*"not-run"/, "Task 6 boundary still does not run provider target lookup");
assert.match(toolCredentialSource, /liveChatIdLookup:\s*"not-run"/, "Task 6 boundary still does not run liveChatId lookup");
assert.match(disconnectRuntime, /credential-resolution-disabled|credential-reference-env-missing/, "start readiness preserves disabled/missing-env fail-closed states");
assert.match(connectionReadinessDoc, /No session start smoke/i, "Task 7 readiness still keeps session start smoke out of connection evidence");

assert.match(
  task,
  /8\. Allowed-tester session start smoke readiness \/ sanitized evidence[\s\S]*Status: complete/i,
  "task.md records Task 8 readiness completion"
);
assert.match(
  task,
  /Task 8 RED\/GREEN `node scripts\/comment-translator-youtube-oauth-allowed-tester-session-start-smoke-readiness-contract\.mjs`/i,
  "task.md records Task 8 contract verification"
);
assert.match(
  task,
  /width checks skipped for Task 8/i,
  "task.md records Task 8 width-check skip reason"
);
assert.match(
  task,
  /provider target lookup, liveChatId lookup, session start smoke[\s\S]*were not run/i,
  "task.md records gated Task 8 actions were not run"
);

const allowedChangedFiles = new Set([docPath, taskPath, "scripts/comment-translator-youtube-oauth-allowed-tester-session-start-smoke-readiness-contract.mjs"]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 8 readiness/evidence slice does not change unexpected file: ${file}`);
}

const changedSource = changedFiles()
  .map((file) => `${file}\n${read(file)}`)
  .join("\n");

for (const forbiddenSecretPattern of [
  /access_token\s*[:=]\s*["'][^"']+["']/i,
  /refresh_token\s*[:=]\s*["'][^"']+["']/i,
  /authorization_code\s*[:=]\s*["'][^"']+["']/i,
  /Authorization:\s*Bearer\s+\S+/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/i,
  /STRIPE_SECRET_KEY\s*[:=]\s*["'][^"']+["']/i,
  /STRIPE_WEBHOOK_SECRET\s*[:=]\s*["'][^"']+["']/i,
  /liveChatId\s*[:=]\s*["'][^"']+["']/i,
  /providerChannelId\s*[:=]\s*["'][UC][^"']+["']/i,
  /ownerUserId\s*[:=]\s*["'][0-9a-f-]{20,}["']/i,
  /providerTargetMetadata\s*[:=]\s*\{/i,
  /rawComment(?:Text|s)?\s*[:=]\s*["'][^"']+["']/i,
  /localStorage\.|indexedDB\.|sessionStorage\./i
]) {
  assert.doesNotMatch(changedSource, forbiddenSecretPattern, `changed files avoid forbidden pattern: ${forbiddenSecretPattern}`);
}

console.log("comment translator YouTube OAuth allowed-tester session start smoke readiness contract checks passed");
