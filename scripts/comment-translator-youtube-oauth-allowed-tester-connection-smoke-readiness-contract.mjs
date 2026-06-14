import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docPath = "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md";
const taskPath = "task.md";
const toolCredentialSourcePath = "lib/comment-translator-youtube-tool-credential-source.ts";
const accountIntegrationPath = "lib/comment-translator-youtube-account-integration.ts";
const accountStatusPath = "lib/comment-translator-youtube-account-integration-status.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const disconnectRuntimePath = "lib/comment-translator-youtube-disconnect-runtime.ts";

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

assert.ok(exists(docPath), "Task 7 allowed-tester connection smoke readiness doc exists");
assert.ok(exists(taskPath), "task.md exists");
assert.ok(exists(toolCredentialSourcePath), "Task 6 tool credential source boundary exists");
assert.ok(exists(accountIntegrationPath), "Task 5 account integration boundary exists");
assert.ok(exists(accountStatusPath), "trusted account credential status boundary exists");
assert.ok(exists(statusBoundaryPath), "trusted credential browser-safe status boundary exists");
assert.ok(exists(disconnectRuntimePath), "disconnect/start readiness fail-closed runtime exists");

const doc = read(docPath);
const task = read(taskPath);
const toolCredentialSource = read(toolCredentialSourcePath);
const accountIntegrationSource = read(accountIntegrationPath);
const accountStatusSource = read(accountStatusPath);
const statusBoundarySource = read(statusBoundaryPath);
const disconnectRuntimeSource = read(disconnectRuntimePath);

for (const requiredFragment of [
  "Allowed-tester connection smoke readiness",
  "same-thread ready preflight",
  "sanitized output review",
  "explicit in-thread approval",
  "exact UI action",
  "sanitized output checklist",
  "evidence template",
  "negative checks",
  "status labels only",
  "blocker/readiness only",
  "no background monitoring starts from connection alone",
  "emergency disable",
  "missing env",
  "browser-safe",
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
  "Google OAuth live connect",
  "YouTube OAuth live connect",
  "authorization code exchange",
  "token persistence",
  "provider target lookup",
  "liveChatId lookup",
  "session start smoke",
  "live/provider execution",
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
  "connection-status-connected",
  "connection-status-reconnect-required",
  "connection-status-disconnected",
  "negative-non-allowed-user-denied",
  "negative-callback-without-state-denied",
  "negative-session-start-not-run",
  "not-run"
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
  /If approval is granted[\s\S]*status labels only/i,
  "doc records the approved sanitized evidence path"
);
assert.match(
  doc,
  /No provider target lookup[\s\S]*No liveChatId lookup[\s\S]*No session start smoke[\s\S]*No live\/provider execution/i,
  "doc keeps connection smoke isolated from provider/session execution"
);

assert.match(toolCredentialSource, /^import "server-only";/m, "Task 6 credential source remains server-only");
assert.match(toolCredentialSource, /backgroundMonitoring:\s*"not-started-by-connection"/, "Task 6 boundary still forbids background monitoring from connection alone");
assert.match(toolCredentialSource, /providerTargetLookup:\s*"not-run"/, "Task 6 boundary still does not run provider target lookup");
assert.match(toolCredentialSource, /liveChatIdLookup:\s*"not-run"/, "Task 6 boundary still does not run liveChatId lookup");
assert.match(accountStatusSource, /^import "server-only";/m, "Task 5 account status wiring remains server-only");
assert.match(accountStatusSource, /YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED/, "account status keeps emergency disable fail-closed");
assert.match(accountIntegrationSource, /backgroundMonitoring:\s*"not-started-by-connection"/, "account integration still forbids background monitoring from connection alone");
assert.match(statusBoundarySource, /credential-resolution-disabled|credential-reference-env-missing/, "trusted status boundary preserves fail-closed disabled/missing-env states");
assert.match(disconnectRuntimeSource, /credential-resolution-disabled|credential-reference-env-missing/, "start readiness runtime preserves fail-closed disabled/missing-env states");

assert.match(
  task,
  /7\. Allowed-tester connection smoke readiness \/ sanitized evidence[\s\S]*Status: complete/i,
  "task.md records Task 7 readiness completion"
);
assert.match(
  task,
  /Task 7 RED\/GREEN `node scripts\/comment-translator-youtube-oauth-allowed-tester-connection-smoke-readiness-contract\.mjs`/i,
  "task.md records Task 7 contract verification"
);
assert.match(
  task,
  /width checks skipped for Task 7/i,
  "task.md records Task 7 width-check skip reason"
);
assert.match(
  task,
  /Google OAuth live connect execution, YouTube OAuth live connect execution, live authorization code exchange, live token persistence[\s\S]*were not run/i,
  "task.md records gated OAuth actions were not run"
);

const allowedChangedFiles = new Set([
  docPath,
  taskPath,
  "scripts/comment-translator-youtube-oauth-allowed-tester-connection-smoke-readiness-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 7 readiness/evidence slice does not change unexpected file: ${file}`);
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
  /localStorage\.|indexedDB\.|sessionStorage\./i
]) {
  assert.doesNotMatch(changedSource, forbiddenSecretPattern, `changed files avoid forbidden pattern: ${forbiddenSecretPattern}`);
}

console.log("comment translator YouTube OAuth allowed-tester connection smoke readiness contract checks passed");
