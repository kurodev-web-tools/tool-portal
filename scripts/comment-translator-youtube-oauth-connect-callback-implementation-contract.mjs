import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const actionPath = "app/account/actions.ts";
const callbackRoutePath = "app/api/comment-translator/youtube/oauth/callback/route.ts";
const runtimePath = "lib/comment-translator-youtube-oauth-connect-callback.ts";
const readinessContractPath = "scripts/comment-translator-youtube-oauth-connect-callback-readiness-contract.mjs";
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

assert.ok(exists(actionPath), "account actions exist");
assert.ok(exists(runtimePath), "server-only OAuth connect/callback runtime exists");
assert.ok(exists(callbackRoutePath), "OAuth callback route exists");
assert.ok(exists(readinessContractPath), "Task 2 readiness contract remains available");
assert.ok(exists(taskPath), "task.md exists");

const actions = read(actionPath);
const runtime = read(runtimePath);
const callbackRoute = read(callbackRoutePath);
const task = read(taskPath);

assert.doesNotMatch(actions, /youtube-connect-prepared|youtube-reconnect-prepared/i, "prepared-only redirect labels are removed");
assert.match(actions, /startYouTubeOAuthConnectRedirect/i, "connect action delegates to OAuth URL construction");
assert.match(actions, /startYouTubeOAuthReconnectRedirect/i, "reconnect action delegates to OAuth URL construction");

assert.match(runtime, /import "server-only"/, "runtime is server-only");
for (const requiredExport of [
  "buildYouTubeOAuthAuthorizationUrl",
  "createYouTubeOAuthStateCookieValue",
  "validateYouTubeOAuthCallbackRequest",
  "readYouTubeOAuthEnvReadiness",
  "youtubeOAuthConnectCallbackImplementationContract"
]) {
  assert.match(runtime, new RegExp(`\\b${requiredExport}\\b`), `runtime exports ${requiredExport}`);
}

for (const envName of [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "YOUTUBE_OAUTH_STATE_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
]) {
  assert.match(runtime, new RegExp(`\\b${envName}\\b`), `runtime references ${envName} by name`);
}

for (const statusLabel of [
  "youtube-oauth-disabled",
  "youtube-oauth-env-missing",
  "youtube-oauth-state-missing",
  "youtube-oauth-state-mismatch",
  "youtube-oauth-state-expired",
  "youtube-oauth-denied",
  "youtube-oauth-callback-error",
  "youtube-oauth-private-launch-gated",
  "youtube-oauth-sign-in-required",
  "youtube-oauth-token-store-blocked"
]) {
  assert.match(runtime, new RegExp(`\\b${statusLabel}\\b`), `runtime allowlists sanitized status ${statusLabel}`);
}

assert.match(runtime, /https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/, "runtime constructs the Google OAuth authorization URL");
assert.match(runtime, /https:\/\/www\.googleapis\.com\/auth\/youtube\.readonly/, "runtime requests YouTube readonly scope");
assert.match(runtime, /httpOnly:\s*true/, "state binding uses an HttpOnly cookie");
assert.match(runtime, /sameSite:\s*"lax"/, "state binding uses SameSite lax cookie");
assert.match(runtime, /createHmac|timingSafeEqual/, "state validation uses signed/hash comparison");
assert.match(runtime, /token-store-blocked|youtube-oauth-token-store-blocked/, "valid callback fails closed before Task 4 persistence");
assert.doesNotMatch(
  runtime,
  /fetch\s*\(|OAuth2Client|oauth2\/v4\/token|oauth2\/token|access_token\s*[:=]|refresh_token\s*[:=]/i,
  "runtime does not exchange tokens or call Google APIs"
);

assert.match(callbackRoute, /validateYouTubeOAuthCallbackRequest/i, "callback route validates through server-only runtime");
assert.match(callbackRoute, /NextResponse\.redirect/i, "callback route returns sanitized redirect");
assert.doesNotMatch(callbackRoute, /console\.(log|error|warn)|request\.url\.toString\(\)/i, "callback route does not log or reflect raw callback input");
assert.doesNotMatch(callbackRoute, /access_token|refresh_token|Authorization:\s*Bearer/i, "callback route contains no token or Authorization value handling");

assert.match(task, /YouTube OAuth connect\/callback implementation, no live connect execution[\s\S]*Status: complete/i, "task.md records Task 3 completion");
assert.match(task, /width checks skipped for Task 3/i, "task.md records Task 3 width-check skip reason");
assert.match(task, /Google OAuth live connect execution, YouTube OAuth live connect execution[\s\S]*were not run/i, "task.md records gated OAuth execution was not run");

const allowedChangedFiles = new Set([
  actionPath,
  callbackRoutePath,
  runtimePath,
  "lib/comment-translator-youtube-oauth-token-store-persistence.ts",
  taskPath,
  readinessContractPath,
  "scripts/comment-translator-youtube-oauth-connect-callback-implementation-contract.mjs",
  "scripts/comment-translator-youtube-oauth-token-store-persistence-wiring-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 3 implementation PR does not change unexpected file: ${file}`);
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
  /providerTargetMetadata\s*[:=]\s*\{/i
]) {
  assert.doesNotMatch(changedSource, forbiddenSecretPattern, `changed files avoid forbidden value pattern: ${forbiddenSecretPattern}`);
}

console.log("comment translator YouTube OAuth connect/callback implementation contract checks passed");
