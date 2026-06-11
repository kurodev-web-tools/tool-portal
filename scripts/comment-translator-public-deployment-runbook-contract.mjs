import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const runbookPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_DEPLOYMENT_LIVE_SMOKE_RUNBOOK.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

assert.ok(exists(runbookPath), "Task 14 public deployment and live-smoke runbook exists");

const runbookSource = read(runbookPath);
const taskSource = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Operator-Local Preconditions",
  "## Safe Command Order",
  "## Sanitized Output Review",
  "## Deployed URL Smoke Checklist",
  "## Approval-Gated Live Provider Smoke",
  "## Rollback Notes",
  "## Evidence Record Template"
]) {
  assert.match(runbookSource, new RegExp(`^${requiredSection}$`, "m"), `runbook includes ${requiredSection}`);
}

for (const requiredFragment of [
  "same-thread / operator-local same-command-process ready preflight",
  "sanitized output review",
  "explicit in-thread approval",
  "Do not run",
  "npm run build",
  "npm run build:cloudflare",
  "npm run upload:cloudflare",
  "npm run deploy:cloudflare",
  "scripts/comment-translator-youtube-google-api-live-call-command.mjs",
  "scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  "sanitized-metadata-only",
  "Cloudflare Pages failure",
  "Workers Builds success",
  "rollback"
]) {
  assert.match(runbookSource, new RegExp(requiredFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `runbook includes ${requiredFragment}`);
}

assert.match(
  runbookSource,
  /live\/provider smoke commands[\s\S]*approval-gated/i,
  "runbook documents live/provider smoke commands as approval-gated"
);
assert.match(
  runbookSource,
  /deployed smoke evidence[\s\S]*sanitized[\s\S]*reproducible/i,
  "runbook requires sanitized and reproducible deployed smoke evidence"
);
assert.match(
  taskSource,
  /Task 14[\s\S]*Public deployment and live-smoke runbook[\s\S]*docs\/active\/COMMENT_TRANSLATOR_PUBLIC_DEPLOYMENT_LIVE_SMOKE_RUNBOOK\.md/i,
  "task.md records Task 14 runbook completion"
);
assert.match(
  taskSource,
  /width verification:[\s\S]*skipped[\s\S]*no visible UI\/layout change/i,
  "task.md records width-check skip reason for non-UI Task 14"
);

for (const [file, source] of [
  [runbookPath, runbookSource],
  [taskPath, taskSource]
]) {
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|service[_-]?role\s*key\s*[:=]\s*["'][^"']+|Authorization\s*:\s*Bearer\s+\S+|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain token, authorization, service role, or private key values`
  );
  assert.doesNotMatch(
    source,
    /\b(ownerUserId|providerChannelId|liveChatId|serverAuthorizationHeader|accessToken|refreshToken)\b\s*[:=]/,
    `${file} does not define sensitive identifier/header/token fields`
  );
}

console.log("comment translator public deployment and live-smoke runbook contract checks passed");
