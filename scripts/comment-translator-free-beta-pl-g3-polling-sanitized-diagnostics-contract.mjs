import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const foundationPath = "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts";
const commandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";
const commandContractPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs";
const completionDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

for (const requiredPath of [foundationPath, commandPath, commandContractPath, completionDocPath, readyPreflightPath, taskPath]) {
  assert.ok(exists(requiredPath), `PL-G3 polling diagnostics required path exists: ${requiredPath}`);
}

const foundation = read(foundationPath);
const command = read(commandPath);
const commandContract = read(commandContractPath);
const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);

assert.match(command, /--approved-live-chat-polling-diagnostics/, "polling command adds explicit diagnostics approval flag");
assert.match(
  command,
  /blocked-conflicting-live-chat-polling-approval-flags/,
  "polling command rejects mixed smoke and diagnostics approval flags"
);
assert.match(
  command,
  /live-chat-polling-diagnostics-sanitized-result/,
  "polling command emits a dedicated sanitized diagnostics status"
);
assert.match(
  command,
  /diagnosticMode:\s*"sanitized-metadata-only"/,
  "polling command records diagnostics as sanitized metadata only"
);
assert.match(
  command,
  /translationExecution:\s*"not-run-diagnostics-only"/,
  "polling diagnostics command does not proceed to translation execution"
);

assert.match(foundation, /itemTypeDistribution/, "polling foundation returns item type distribution metadata");
assert.match(foundation, /pageInfoTotalResults/, "polling foundation returns pageInfo total result metadata");
assert.match(foundation, /nextPageToken:\s*"present"\s*\|\s*"absent"/, "polling foundation returns token presence only");
assert.match(foundation, /textPayload:\s*"not-returned-by-design"/, "polling foundation keeps text payload suppressed");
assert.doesNotMatch(
  foundation,
  /displayMessage[\s\S]{0,120}responseMetadata|textMessageDetails[\s\S]{0,120}responseMetadata/,
  "polling metadata does not expose raw message text fields"
);

assert.match(
  commandContract,
  /--approved-live-chat-polling-diagnostics/,
  "polling command contract covers diagnostics approval flag"
);
assert.match(
  commandContract,
  /live-chat-polling-diagnostics-sanitized-result/,
  "polling command contract covers diagnostics sanitized result"
);
assert.match(commandContract, /itemTypeDistribution/, "polling command contract covers item type distribution");

assert.match(
  readyPreflight,
  /Optional sanitized empty-intake diagnostic follow-up/i,
  "ready preflight documents optional sanitized empty-intake diagnostics"
);
assert.match(
  readyPreflight,
  /--execute --approved-live-chat-polling-diagnostics --json/,
  "ready preflight documents diagnostics command shape"
);
assert.match(
  readyPreflight,
  /not part of the normal FB-L4 Start-to-translation smoke/i,
  "ready preflight keeps diagnostics outside normal FB-L4 smoke"
);
assert.match(
  completionDoc,
  /sanitized empty-intake diagnostic helper/i,
  "PL-G3 completion doc records diagnostics helper follow-up"
);
assert.match(
  completionDoc,
  /live-chat-polling-diagnostics-sanitized-result/i,
  "PL-G3 completion doc records diagnostics sanitized status"
);
assert.match(
  task,
  /codex\/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics/i,
  "task.md records diagnostics branch"
);
assert.match(
  task,
  /sanitized empty-intake diagnostic helper/i,
  "task.md records sanitized diagnostics helper"
);

for (const [label, source] of [
  [foundationPath, foundation],
  [commandPath, command],
  [commandContractPath, commandContract],
  [completionDocPath, completionDoc],
  [readyPreflightPath, readyPreflight],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  foundationPath,
  commandPath,
  commandContractPath,
  completionDocPath,
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 polling diagnostics change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 polling sanitized diagnostics contract checks passed");
