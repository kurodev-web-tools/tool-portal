import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG3DocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const taskPath = "task.md";
const pollingFoundationPath = "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts";
const pollingCommandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";
const pollingCommandContractPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs";
const afterPr515ContractPath =
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr515-contract.mjs";

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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|credentialReferenceId\s*[:=]\s*["'](?!(?:never-returned-by-design|smoke-livechat-[^"']+))[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|raw(?:Provider|Error|Response|Message|Reason|Comment|Cursor)(?:Body|Payload|Message|Reason|Text|s|Value)?\s*[:=]\s*["'](?!not-requested-not-documented|not-returned-by-design|never-recorded-by-design|never-returned-by-design|forbidden)[^"']+/i,
    `${label} does not contain secret values, token values, credential values, private provider identifiers, live target values, raw provider/comment values, or private cursor values`
  );
}

for (const requiredPath of [
  plG3DocPath,
  readyPreflightPath,
  taskPath,
  pollingFoundationPath,
  pollingCommandPath,
  pollingCommandContractPath,
  afterPr515ContractPath
]) {
  assert.ok(exists(requiredPath), `after-PR #516 cursor diagnostics preparation required path exists: ${requiredPath}`);
}

const plG3Doc = read(plG3DocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);
const pollingFoundation = read(pollingFoundationPath);
const pollingCommand = read(pollingCommandPath);
const pollingCommandContract = read(pollingCommandContractPath);
const afterPr515Contract = read(afterPr515ContractPath);

assert.match(
  pollingCommandContract,
  /const providerOkEmptyWithNextPage = await foundation\.runYouTubeLiveChatPollingSmokeFoundation/,
  "polling command contract includes deterministic fake provider response for empty next-page diagnostics"
);
assert.match(
  pollingCommandContract,
  /nextPageToken: "next-page-token-never-returned"[\s\S]*totalResults: 0[\s\S]*resultsPerPage: 0[\s\S]*items: \[\]/,
  "fake provider response covers provider-ok / nextPageToken present / pageInfo zero / zero items"
);
assert.match(
  pollingCommandContract,
  /assert\.equal\(providerOkEmptyWithNextPage\.responseMetadata\.nextPageToken, "present"\)[\s\S]*assert\.equal\(providerOkEmptyWithNextPage\.responseMetadata\.intakeDiagnosticLabel, "empty-provider-ok-next-page-present"\)/,
  "fake provider response asserts value-free next-page-present diagnostics"
);

assert.match(
  plG3Doc,
  /^## Operator-local Empty-provider-ok Next-page Cursor Diagnostics Preparation After PR #516$/m,
  "PL-G3 doc records after-PR #516 cursor diagnostics preparation"
);
assert.match(
  plG3Doc,
  /Decision: blocked-empty-provider-ok-next-page-cursor-diagnostics-prepared-after-pr516/,
  "PL-G3 doc records after-PR #516 decision"
);
assert.match(
  plG3Doc,
  /provider-ok \/ returned count 0 \/ nextPageToken presence present \/ pageInfo total 0 \/ pageInfo resultsPerPage 0/i,
  "PL-G3 doc carries forward the value-free empty next-page evidence"
);
assert.match(
  plG3Doc,
  /first-page cursor source label[\s\S]*initial-page-no-page-token[\s\S]*next-page cursor presence label[\s\S]*present-withheld[\s\S]*next-page read proposal[\s\S]*approval-required-not-run/i,
  "PL-G3 doc defines first-page vs next-page cursor handling without cursor values"
);
assert.match(
  plG3Doc,
  /polling command page plan[\s\S]*first-page read then optional one bounded next-page read[\s\S]*fresh comment timing relation[\s\S]*fresh-post-start-comment-before-first-page-read/i,
  "PL-G3 doc records command page plan and fresh-comment timing relation"
);
assert.match(
  plG3Doc,
  /empty-provider-ok-next-page-present[\s\S]*treat as blocked pending cursor diagnostics[\s\S]*not as non-empty intake/i,
  "PL-G3 doc records retry handling for empty-provider-ok-next-page-present"
);
assert.match(
  plG3Doc,
  /safe diagnostic output categories[\s\S]*page role label[\s\S]*provider status label[\s\S]*returned count[\s\S]*pageInfo total count[\s\S]*pageInfo resultsPerPage count[\s\S]*nextPageToken presence label[\s\S]*polling interval presence label[\s\S]*intake diagnostic label[\s\S]*pass-fail[\s\S]*unavailableReason/i,
  "PL-G3 doc records safe sanitized diagnostic categories"
);
assert.match(
  plG3Doc,
  /Start: not-run[\s\S]*Stop: not-run[\s\S]*target lookup execution: not-run[\s\S]*`liveChatMessages\.list`: not-run[\s\S]*Azure\/OpenAI provider execution: not-run[\s\S]*UI\/feed confirmation: not-run/i,
  "PL-G3 doc keeps after-PR #516 as no-live-execution preparation"
);
assert.match(plG3Doc, /public gate state label: unchanged \/ blocked/i, "PL-G3 doc keeps public gate blocked");
assert.match(plG3Doc, /public-release capable label: no/i, "PL-G3 doc keeps public-release capable no");

assert.match(
  readyPreflight,
  /After PR #516 empty-provider-ok next-page cursor diagnostics preparation/i,
  "ready preflight records after-PR #516 diagnostics boundary"
);
assert.match(
  readyPreflight,
  /approved-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516/i,
  "ready preflight provides exact approval label for a future cursor diagnostic"
);
assert.match(
  readyPreflight,
  /one bounded next-page read only[\s\S]*same live target reference[\s\S]*server-only cursor consumed and never output/i,
  "ready preflight constrains the next-page diagnostic"
);
assert.match(
  readyPreflight,
  /no raw cursor[\s\S]*no liveChatId[\s\S]*no provider target metadata[\s\S]*no raw provider payload[\s\S]*no raw comments/i,
  "ready preflight forbids private cursor, target, provider, and comment values"
);
assert.match(
  readyPreflight,
  /--approved-live-chat-polling-next-page-diagnostics/,
  "ready preflight records the after-PR #517 next-page diagnostics command flag"
);
assert.match(
  readyPreflight,
  /same command process must already contain[\s\S]*server-only next-page cursor reference/i,
  "ready preflight records same-process cursor reference requirement"
);

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g3-(?:empty-provider-ok-next-page-cursor-diagnostics-after-pr516|next-page-cursor-diagnostics-after-pr517)`/,
  "task.md records current after-PR #516 or after-PR #517 branch"
);
assert.match(
  task,
  /^## Latest PL-G3 Empty-provider-ok Next-page Cursor Diagnostics Preparation After PR #516$/m,
  "task.md records after-PR #516 latest section"
);
assert.match(
  task,
  /Decision: blocked-empty-provider-ok-next-page-cursor-diagnostics-prepared-after-pr516/,
  "task.md records after-PR #516 decision"
);
assert.match(
  task,
  /recommended next approval label: approved-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516/i,
  "task.md records the recommended exact approval label"
);
assert.match(
  task,
  /Start: not-run[\s\S]*Stop: not-run[\s\S]*target lookup execution: not-run[\s\S]*`liveChatMessages\.list`: not-run[\s\S]*Azure\/OpenAI provider execution: not-run[\s\S]*UI\/feed confirmation: not-run/i,
  "task.md records no live/provider/UI execution in this slice"
);
assert.match(task, /public gate state label: unchanged \/ blocked/i, "task.md keeps public gate blocked");
assert.match(task, /public-release capable label: no/i, "task.md keeps public-release capable no");

assert.match(
  plG3Doc,
  /^## Operator-local Empty-provider-ok Next-page Cursor Diagnostics Follow-up After PR #517$/m,
  "PL-G3 doc records after-PR #517 approved follow-up"
);
assert.match(
  plG3Doc,
  /Decision: blocked-missing-operator-local-same-process-references-before-next-page-provider-access-after-pr517/,
  "PL-G3 doc records after-PR #517 blocker before provider access"
);
assert.match(
  plG3Doc,
  /page role label \| next-page-diagnostics-approved[\s\S]*provider status label \| not-run-before-provider-access[\s\S]*HTTP status label \| not-run/i,
  "PL-G3 doc records sanitized next-page blocker categories"
);
assert.match(
  plG3Doc,
  /`liveChatMessages\.list`: not-run \/ blocked-before-provider-access/i,
  "PL-G3 doc records no provider read occurred after PR #517"
);
assert.match(
  task,
  /^## Latest PL-G3 Approved Next-page Cursor Diagnostics Follow-up After PR #517$/m,
  "task.md records after-PR #517 latest follow-up"
);
assert.match(
  task,
  /Decision: blocked-missing-operator-local-same-process-references-before-next-page-provider-access-after-pr517/,
  "task.md records after-PR #517 blocker"
);
assert.match(
  task,
  /Contract gap fixed without live\/provider access[\s\S]*next-page diagnostics-only approval flag/i,
  "task.md records next-page command gap fix"
);

assert.match(pollingFoundation, /nextPageToken:\s*"present"\s*\|\s*"absent"/, "polling foundation returns token presence only");
assert.match(pollingFoundation, /empty-provider-ok-next-page-present/, "polling foundation labels empty provider-ok next page");
assert.match(pollingCommand, /--approved-live-chat-polling-diagnostics/, "polling command keeps diagnostics approval boundary");
assert.match(
  pollingCommand,
  /--approved-live-chat-polling-next-page-diagnostics/,
  "polling command exposes a next-page diagnostics-only approval boundary"
);
assert.match(
  pollingCommand,
  /YOUTUBE_LIVE_CHAT_POLLING_SMOKE_NEXT_PAGE_TOKEN/,
  "polling command consumes the server-only next-page cursor from an operator-local reference"
);
assert.match(pollingCommandContract, /empty-provider-ok-next-page-present/, "polling command contract covers next-page-present empty intake");
assert.match(afterPr515Contract, /blocked-empty-polling-intake-after-pr515/, "after-PR #515 contract remains the input blocker");

for (const forbiddenFragment of [
  "Free Azure provider harness: completed",
  "Azure/OpenAI provider execution: completed",
  "UI/feed confirmation: completed",
  "production/custom deployed smoke execution: completed",
  "public launch gate flip: completed",
  "main promotion: completed",
  "public-release capable label: yes",
  "raw cursor field",
  "nextPageToken value:"
]) {
  assert.doesNotMatch(plG3Doc, new RegExp(forbiddenFragment, "i"), `PL-G3 after-PR #516 doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(forbiddenFragment, "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [plG3DocPath, plG3Doc],
  [readyPreflightPath, readyPreflight],
  [taskPath, task],
  [pollingFoundationPath, pollingFoundation],
  [pollingCommandPath, pollingCommand],
  [pollingCommandContractPath, pollingCommandContract],
  [afterPr515ContractPath, afterPr515Contract]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG3DocPath,
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516-contract.mjs",
  pollingFoundationPath,
  pollingCommandPath,
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr515-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after-PR #516 cursor diagnostics preparation change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log(
  "comment translator Free beta PL-G3 empty-provider-ok next-page cursor diagnostics after PR #516 contract checks passed"
);
