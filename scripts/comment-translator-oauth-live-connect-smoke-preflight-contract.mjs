import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const preflightDocPath = "docs/active/COMMENT_TRANSLATOR_OAUTH_LIVE_CONNECT_SMOKE_PREFLIGHT.md";
const gapAuditDocPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const connectionReadinessDocPath =
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md";
const sessionReadinessDocPath =
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md";
const productionEnvReadinessDocPath = "docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md";
const securityReviewDocPath = "docs/active/COMMENT_TRANSLATOR_SECURITY_PRIVACY_FINAL_REVIEW.md";
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
  const committedDiff = execSync(
    "git diff --name-only origin/codex/comment-translator-free-public-beta-integration...HEAD",
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

for (const requiredPath of [
  preflightDocPath,
  gapAuditDocPath,
  connectionReadinessDocPath,
  sessionReadinessDocPath,
  productionEnvReadinessDocPath,
  securityReviewDocPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `${requiredPath} exists`);
}

const preflightDoc = read(preflightDocPath);
const gapAuditDoc = read(gapAuditDocPath);
const connectionReadinessDoc = read(connectionReadinessDocPath);
const sessionReadinessDoc = read(sessionReadinessDocPath);
const productionEnvReadinessDoc = read(productionEnvReadinessDocPath);
const securityReviewDoc = read(securityReviewDocPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Scope Boundary",
  "## Source Alignment",
  "## Same-Thread Approval Checklist",
  "## Operator-Local Env Reference Checklist",
  "## Sanitized Evidence Shape",
  "## Abort Conditions",
  "## Rollback Path",
  "## Not-Run Gated Actions",
  "## Verification And Closeout",
  "## Next Safe Action"
]) {
  assert.match(preflightDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `F1 preflight doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "F1 OAuth live connect smoke preflight",
  "Public-release capable: no",
  "codex/comment-translator-free-public-beta-integration",
  "same-thread ready preflight",
  "sanitized output review",
  "explicit in-thread approval",
  "operator-local env reference checklist",
  "status-label-only",
  "reference-name-only",
  "abort conditions",
  "rollback path",
  "blocked-no-approval",
  "blocked-missing-env",
  "blocked-disabled",
  "blocked-output-review-incomplete",
  "blocked-private-launch-gated",
  "blocked-no-allowed-tester-session",
  "not-inspected-not-recorded",
  "not-created",
  "Width checks skipped"
]) {
  assert.match(preflightDoc, new RegExp(escaped(requiredFragment), "i"), `F1 preflight doc records ${requiredFragment}`);
}

for (const sourceDocPath of [
  "COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md",
  "COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md",
  "COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md",
  "COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md",
  "COMMENT_TRANSLATOR_SECURITY_PRIVACY_FINAL_REVIEW.md"
]) {
  assert.match(preflightDoc, new RegExp(escaped(sourceDocPath), "i"), `F1 preflight doc aligns with ${sourceDocPath}`);
}

for (const forbiddenOutputLabel of [
  "OAuth code/token/refresh token",
  "Authorization header",
  "owner user id",
  "provider channel id",
  "liveChatId",
  "service_role",
  "Stripe secret",
  "provider target metadata",
  "browser storage payload",
  "handoff payload"
]) {
  assert.match(preflightDoc, new RegExp(escaped(forbiddenOutputLabel), "i"), `F1 preflight doc forbids output: ${forbiddenOutputLabel}`);
}

for (const gatedAction of [
  "real OAuth connect",
  "live authorization code exchange",
  "live token persistence smoke",
  "provider target lookup",
  "liveChatId lookup",
  "session start smoke",
  "translation provider API execution",
  "live/provider execution",
  "deploy/upload",
  "remote mutation",
  "schema migration",
  "Stripe live action",
  "main promotion",
  "public launch gate flip"
]) {
  assert.match(preflightDoc, new RegExp(`${escaped(gatedAction)}[\\s\\S]*not-run`, "i"), `F1 preflight doc records not-run gated action: ${gatedAction}`);
}

for (const envReference of [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES",
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  "SUPABASE_SERVICE_ROLE_KEY",
  "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
  "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
  "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
]) {
  assert.match(preflightDoc, new RegExp(`\\\`${escaped(envReference)}\\\``, "i"), `F1 preflight doc records env reference: ${envReference}`);
}

assert.match(gapAuditDoc, /F1[\s\S]*Docs\/contract preflight/i, "gap audit identifies F1 docs/contract preflight");
assert.match(connectionReadinessDoc, /Allowed-tester connection smoke readiness/i, "existing connection smoke readiness source exists");
assert.match(sessionReadinessDoc, /Allowed-tester session start smoke readiness/i, "existing session start readiness source exists");
assert.match(productionEnvReadinessDoc, /Approved-Smoke-Only Operator References/i, "production env readiness includes operator-local references");
assert.match(securityReviewDoc, /provider target metadata[\s\S]*liveChatId/i, "security review covers provider target metadata and liveChatId boundary");

assert.match(task, /Current branch: `codex\/comment-translator-oauth-live-connect-smoke-preflight`/i, "task.md records current F1 branch");
assert.match(task, /F1 \| OAuth live connect smoke preflight[\s\S]*complete in PR/i, "task.md records F1 status");
assert.match(task, /F1 status/i, "task.md records F1 status section");
assert.match(task, /F1 verification/i, "task.md records F1 verification section");
assert.match(task, /F1 residual risk/i, "task.md records F1 residual risk section");
assert.match(task, /next safe action/i, "task.md records next safe action");
assert.match(task, /width checks skipped for F1/i, "task.md records F1 width-check skip reason");

const allowedChangedFiles = new Set([preflightDocPath, taskPath, "scripts/comment-translator-oauth-live-connect-smoke-preflight-contract.mjs"]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F1 docs/contract slice does not change unexpected file: ${file}`);
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
  /SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/i,
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

console.log("comment translator OAuth live connect smoke preflight contract checks passed");
