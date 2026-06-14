import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const qaDocPath = "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_INTEGRATION_FINAL_QA_PROMOTION_READINESS.md";
const taskPath = "task.md";

const requiredOAuthDocs = [
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_CONNECT_CALLBACK_READINESS.md",
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md",
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md"
];

const requiredOAuthContracts = [
  "scripts/comment-translator-youtube-oauth-connect-callback-readiness-contract.mjs",
  "scripts/comment-translator-youtube-oauth-connect-callback-implementation-contract.mjs",
  "scripts/comment-translator-youtube-oauth-token-store-persistence-wiring-contract.mjs",
  "scripts/comment-translator-youtube-oauth-account-status-wiring-contract.mjs",
  "scripts/comment-translator-youtube-oauth-tool-credential-source-contract.mjs",
  "scripts/comment-translator-youtube-oauth-allowed-tester-connection-smoke-readiness-contract.mjs",
  "scripts/comment-translator-youtube-oauth-allowed-tester-session-start-smoke-readiness-contract.mjs"
];

const routeAndBoundaryPaths = [
  "app/account/actions.ts",
  "app/api/comment-translator/youtube/oauth/callback/route.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts",
  "lib/comment-translator-youtube-oauth-connect-callback.ts",
  "lib/comment-translator-youtube-oauth-token-store-persistence.ts",
  "lib/comment-translator-youtube-account-integration-status.ts",
  "lib/comment-translator-youtube-tool-credential-source.ts",
  "lib/comment-translator-youtube-credential-status-boundary.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-private-launch-access-gate.ts"
];

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

for (const requiredPath of [qaDocPath, taskPath, ...requiredOAuthDocs, ...requiredOAuthContracts, ...routeAndBoundaryPaths]) {
  assert.ok(exists(requiredPath), `${requiredPath} exists`);
}

const qaDoc = read(qaDocPath);
const task = read(taskPath);
const combinedBoundarySource = routeAndBoundaryPaths.map(read).join("\n");

for (const requiredSection of [
  "## Merge Gate",
  "## Integration Branch Diff Review",
  "## Verification Matrix",
  "## Route API Negative Checks",
  "## Legal Copy Security Boundary Review",
  "## Gated Actions Not Run",
  "## Accepted Risks",
  "## Rollback Notes",
  "## Promotion Readiness Decision",
  "## Public Release Capability Decision",
  "## Next Task Handoff"
]) {
  assert.match(qaDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `Task 9 QA doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Task 9 Integration branch final QA and promotion readiness to main",
  "PR #441",
  "PR #442",
  "PR #443",
  "PR #444",
  "PR #445",
  "PR #446",
  "PR #447",
  "PR #448",
  "03b5685461668ae1604961272fa52907b7e9710a",
  "contained in `origin/codex/comment-translator-youtube-oauth-integration`",
  "promotion-to-main remains a separate PR",
  "No main promotion",
  "public-release capable: no",
  "Emergency disable and missing env/reference states remain fail closed and browser-safe",
  "no background monitoring starts from connection alone",
  "width checks are skipped",
  "docs/contract/task-board only"
]) {
  assert.match(qaDoc, new RegExp(escaped(requiredFragment), "i"), `Task 9 QA doc records ${requiredFragment}`);
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
  "webhook registration",
  "production/custom deployed smoke",
  "main promotion"
]) {
  assert.match(qaDoc, new RegExp(`${escaped(gatedAction)}[\\s\\S]*not-run`, "i"), `Task 9 QA doc records not-run: ${gatedAction}`);
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
  assert.match(qaDoc, new RegExp(escaped(forbiddenOutputLabel), "i"), `Task 9 QA doc forbids output: ${forbiddenOutputLabel}`);
}

for (const expectedCheck of [
  "node scripts/comment-translator-youtube-oauth-integration-final-qa-promotion-readiness-contract.mjs",
  "node scripts/comment-translator-youtube-oauth-connect-callback-readiness-contract.mjs",
  "node scripts/comment-translator-youtube-oauth-connect-callback-implementation-contract.mjs",
  "node scripts/comment-translator-youtube-oauth-token-store-persistence-wiring-contract.mjs",
  "node scripts/comment-translator-youtube-oauth-account-status-wiring-contract.mjs",
  "node scripts/comment-translator-youtube-oauth-tool-credential-source-contract.mjs",
  "node scripts/comment-translator-youtube-oauth-allowed-tester-connection-smoke-readiness-contract.mjs",
  "node scripts/comment-translator-youtube-oauth-allowed-tester-session-start-smoke-readiness-contract.mjs",
  "node scripts/comment-translator-security-privacy-final-review-contract.mjs",
  "npm run lint",
  "npx tsc --noEmit",
  "npm run build",
  "git diff --check"
]) {
  assert.match(qaDoc, new RegExp(escaped(expectedCheck), "i"), `Task 9 QA doc lists verification: ${expectedCheck}`);
}

assert.match(
  qaDoc,
  /route\/API negative checks[\s\S]*private-launch-gated[\s\S]*caller-not-authenticated[\s\S]*credential-resolution-disabled[\s\S]*credential-reference-env-missing[\s\S]*missing-signature/i,
  "Task 9 QA doc records route/API negative check labels"
);
assert.match(
  qaDoc,
  /accepted risk[\s\S]*allowed-tester connection smoke[\s\S]*allowed-tester session start smoke[\s\S]*not-run/i,
  "Task 9 QA doc records accepted live/OAuth smoke risk"
);
assert.match(
  qaDoc,
  /rollback[\s\S]*YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED[\s\S]*private launch gate[\s\S]*separate promotion PR/i,
  "Task 9 QA doc records rollback notes"
);

assert.match(combinedBoundarySource, /^import "server-only";/m, "server-only boundaries remain present");
assert.match(combinedBoundarySource, /YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED/, "emergency disable boundary remains present");
assert.match(combinedBoundarySource, /credential-resolution-disabled/, "disabled credential resolution remains fail closed");
assert.match(combinedBoundarySource, /credential-reference-env-missing/, "missing credential reference remains fail closed");
assert.match(combinedBoundarySource, /readCommentTranslatorPrivateLaunchAccess/, "private-launch access gate remains enforced");
assert.match(combinedBoundarySource, /providerTargetLookup:\s*"not-run"/, "provider target lookup remains not-run in readiness boundary");
assert.match(combinedBoundarySource, /liveChatIdLookup:\s*"not-run"/, "liveChatId lookup remains not-run in readiness boundary");
assert.match(combinedBoundarySource, /backgroundMonitoring:\s*"not-started-by-connection"/, "connection alone does not start monitoring");

assert.match(
  task,
  /current PR scope: Task 9 integration branch final QA and promotion readiness/i,
  "task.md records Task 9 as current PR scope"
);
assert.match(
  task,
  /9\. Integration branch final QA and promotion readiness to main[\s\S]*Status: complete/i,
  "task.md records Task 9 completion"
);
assert.match(
  task,
  /width checks skipped for Task 9/i,
  "task.md records Task 9 width-check skip reason"
);
assert.match(
  task,
  /public-release capable: no/i,
  "task.md keeps public-release capability blocked"
);
assert.match(
  task,
  /next safe action: open a separate promotion-to-main PR only after release owner approval/i,
  "task.md records separate promotion PR handoff"
);

const allowedChangedFiles = new Set([
  qaDocPath,
  taskPath,
  "scripts/comment-translator-youtube-oauth-integration-final-qa-promotion-readiness-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 9 final QA slice does not change unexpected file: ${file}`);
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

console.log("comment translator YouTube OAuth integration final QA promotion readiness contract checks passed");
