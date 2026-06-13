import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docPath = "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_CONNECT_CALLBACK_READINESS.md";
const taskPath = "task.md";

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

assert.ok(exists(docPath), "Task 2 YouTube OAuth connect/callback readiness doc exists");
assert.ok(exists(taskPath), "task.md exists");

const doc = read(docPath);
const task = read(taskPath);

for (const requiredFragment of [
  "server-only readiness contract",
  "does not contact Google OAuth",
  "does not redirect a browser to Google",
  "does not exchange an authorization code",
  "Allowed connect request metadata",
  "Allowed callback request metadata",
  "Allowed callback response metadata",
  "State, CSRF, And Session Ownership",
  "Redirect Allowlist",
  "Env Reference Names",
  "Sanitized Error States",
  "Rollback And Disable Gate",
  "Operator Preflight Requirements",
  "Exact No-Live-Connect Boundary",
  "Width checks are skipped"
]) {
  assert.match(doc, new RegExp(requiredFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `doc records: ${requiredFragment}`);
}

for (const requiredEnvName of [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "YOUTUBE_OAUTH_STATE_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
]) {
  assert.match(doc, new RegExp(`\\b${requiredEnvName}\\b`), `doc records env reference name: ${requiredEnvName}`);
}

for (const allowedPath of [
  "/account/integrations",
  "/tools/comment-translator",
  "/login?next=/account/integrations"
]) {
  assert.match(doc, new RegExp(allowedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `doc records redirect allowlist path: ${allowedPath}`);
}

for (const requiredStatus of [
  "youtube-oauth-disabled",
  "youtube-oauth-env-missing",
  "youtube-oauth-state-mismatch",
  "youtube-oauth-denied",
  "youtube-oauth-callback-error",
  "youtube-oauth-private-launch-gated",
  "youtube-oauth-sign-in-required",
  "youtube-oauth-token-store-blocked"
]) {
  assert.match(doc, new RegExp(`\\b${requiredStatus}\\b`), `doc records sanitized status: ${requiredStatus}`);
}

for (const forbiddenOutputLabel of [
  "authorization code value",
  "OAuth access token value",
  "OAuth refresh token value",
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
    `doc explicitly forbids output: ${forbiddenOutputLabel}`
  );
}

for (const liveBoundary of [
  "contact Google OAuth endpoints",
  "redirect a browser to Google OAuth",
  "exchange an authorization code",
  "create or persist OAuth credentials",
  "provider target lookup",
  "look up liveChatId",
  "start a translator session",
  "run live/provider execution",
  "run remote schema migration or remote mutation",
  "run Stripe live-mode actions"
]) {
  assert.match(
    doc,
    new RegExp(liveBoundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `doc records no-live boundary: ${liveBoundary}`
  );
}

assert.match(
  task,
  /YouTube OAuth connect\/callback readiness and exact gate contract[\s\S]*Status: complete in current Task 2 PR/i,
  "task.md records Task 2 completion status"
);
assert.match(
  task,
  /current PR scope: docs\/contract-only Task 2 YouTube OAuth connect\/callback readiness and exact gate contract/i,
  "task.md records docs/contract-only scope"
);
assert.match(
  task,
  /width checks skipped for Task 2/i,
  "task.md records width-check skip reason"
);
assert.match(
  task,
  /Google OAuth live connect execution, YouTube OAuth live connect execution, authorization code exchange, token persistence, provider target lookup, liveChatId lookup, session start smoke, deploy\/upload, remote mutation, remote schema migration, Stripe live-mode action, Customer Portal redirect, webhook registration, translation provider API execution, and live\/provider execution were not run/i,
  "task.md records gated actions not run"
);

const allowedChangedFiles = new Set([docPath, "scripts/comment-translator-youtube-oauth-connect-callback-readiness-contract.mjs", taskPath]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 2 docs/contract-only PR does not change unexpected file: ${file}`);
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
  /providerChannelId\s*[:=]\s*["'][^"']+["']/i,
  /ownerUserId\s*[:=]\s*["'][^"']+["']/i,
  /providerTargetMetadata\s*[:=]\s*\{/i
]) {
  assert.doesNotMatch(changedSource, forbiddenSecretPattern, `changed files avoid forbidden value pattern: ${forbiddenSecretPattern}`);
}

console.log("comment translator YouTube OAuth connect/callback readiness contract checks passed");
