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
const targetLookupFoundationPath = "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts";
const pollingCommandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";
const targetLookupCommandPath = "scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs";

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
  targetLookupFoundationPath,
  pollingCommandPath,
  targetLookupCommandPath
]) {
  assert.ok(exists(requiredPath), `after-PR #528 root-cause triage required path exists: ${requiredPath}`);
}

const plG3Doc = read(plG3DocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);
const pollingFoundation = read(pollingFoundationPath);
const targetLookupFoundation = read(targetLookupFoundationPath);
const pollingCommand = read(pollingCommandPath);
const targetLookupCommand = read(targetLookupCommandPath);

assert.match(
  pollingFoundation,
  /endpoint: "liveChatMessages\.list"[\s\S]*part: "id,snippet"[\s\S]*fields: "nextPageToken,pollingIntervalMillis,pageInfo\(totalResults,resultsPerPage\),items\(id,snippet\(publishedAt,type\)\)"/,
  "polling foundation keeps the reviewed liveChatMessages.list request shape"
);
assert.match(
  pollingFoundation,
  /createYouTubeLiveChatMessagesListSmokeRequest[\s\S]*liveChatId[\s\S]*pageToken[\s\S]*new URLSearchParams/,
  "polling foundation builds request from server-only liveChatId and optional pageToken"
);
assert.match(
  pollingFoundation,
  /if \(nextPageToken === "present"\)[\s\S]*return "empty-provider-ok-next-page-present"/,
  "polling foundation classifies provider-ok empty pages with nextPageToken present"
);
assert.match(
  targetLookupFoundation,
  /endpoint: "liveBroadcasts\.list-mine-active"[\s\S]*part: "id,snippet,status"[\s\S]*mine: "true"[\s\S]*fields: "items\(id,snippet\(liveChatId\),status\(lifeCycleStatus,privacyStatus\)\),pageInfo\(totalResults,resultsPerPage\)"/,
  "target lookup foundation keeps owned active broadcast lookup shape"
);
assert.match(
  targetLookupFoundation,
  /createUsableTargetCandidates[\s\S]*status\.lifeCycleStatus === "live"[\s\S]*target[\s\S]*candidates\.push/,
  "target lookup foundation selects live owned broadcasts with a live chat target"
);

assert.match(
  plG3Doc,
  /^## Empty-provider-ok Root-cause Triage After PR #528$/m,
  "PL-G3 doc records after-PR #528 root-cause triage"
);
assert.match(
  plG3Doc,
  /Decision: blocked-empty-provider-ok-root-cause-triage-prepared-after-pr528/,
  "PL-G3 doc records after-PR #528 decision"
);
assert.match(
  plG3Doc,
  /No live\/provider, Start, Stop, target lookup execution, cursor regeneration, OAuth flow, token refresh, Azure\/OpenAI provider execution, UI\/feed confirmation, deploy\/upload, remote mutation, public access change, or launch gate flip was run in this follow-up/i,
  "PL-G3 doc records no forbidden execution in after-PR #528 triage"
);

for (const requiredRow of [
  /\| polling request shape \| mostly-refuted-as-primary-cause \| provider-ok HTTP 200 and nextPageToken present prove the reviewed request was accepted; fields omission cannot explain zero item count \| no provider read without new approval \|/,
  /\| owner binding and credential identity \| mostly-refuted-for-PR527-provider-ok-runs \| owner binding and token material were verified before polling; PR527 returned provider-ok rather than auth\/permission rejection \| keep owner-binding label in any future proof \|/,
  /\| selected target ordering \| partially-refuted-but-not-closed \| prior target-selection diagnostics showed rank-1, usable-target-count-1, and mismatch-not-indicated; PR527 did not rerun target lookup in the same provider-read boundary \| needs same-process target-refresh-to-polling proof \|/,
  /\| target source or stale live target \| remains-plausible \| bounded polling consumed an operator-local live target reference while target lookup execution was not run in PR527; empty provider-ok can still happen if the reference points at a different or stale chat surface \| needs value-free refreshed-target-source labels \|/,
  /\| cursor handling \| weakened-as-sole-cause \| initial-page attempts after a fresh-comment window also returned zero, so next-page-only skipping is not enough to explain the symptom \| keep page-role and nextPageToken presence labels \|/,
  /\| provider delay or hidden item type \| possible-but-unsupported \| three bounded attempts across two approved runs returned zero items and empty type distribution; no returned item exists to classify \| only a future bounded proof can close it \|/
]) {
  assert.match(plG3Doc, requiredRow, `PL-G3 doc records hypothesis row: ${requiredRow}`);
}

assert.match(
  plG3Doc,
  /`nextPageToken` presence with returned count 0 refutes target absence, missing required query shape, and immediate provider rejection for those approved reads/i,
  "PL-G3 doc states what nextPageToken present refutes"
);
assert.match(
  plG3Doc,
  /It does not refute a stale or wrong live target reference, operator-visible chat surface mismatch, fresh-comment visibility delay, or an API-level empty page for the selected chat/i,
  "PL-G3 doc states what nextPageToken present leaves open"
);
assert.match(
  plG3Doc,
  /Next smallest proof: use the separate same-process target-refresh-to-bounded-polling diagnostic boundary only in a later approval thread/i,
  "PL-G3 doc identifies the next smallest proof after command preparation"
);
assert.match(
  plG3Doc,
  /reviewed command now refreshes the selected owned live target and then consumes that live target in the same process for the fresh-comment bounded polling read without outputting target or cursor values/i,
  "PL-G3 doc records the command boundary is now prepared"
);
assert.match(
  plG3Doc,
  /Allowed future sanitized categories[\s\S]*request shape labels[\s\S]*target-source labels[\s\S]*target-count labels[\s\S]*selected-target position\/role labels[\s\S]*owner-binding status label[\s\S]*provider route label[\s\S]*HTTP status label[\s\S]*returned count[\s\S]*pageInfo total count[\s\S]*pageInfo resultsPerPage count[\s\S]*nextPageToken presence label[\s\S]*polling interval presence\/count label[\s\S]*item type distribution counts[\s\S]*bounded attempt count[\s\S]*stop reason label[\s\S]*operator window label[\s\S]*public gate state label[\s\S]*public-release capable label[\s\S]*pass\/fail[\s\S]*unavailableReason/i,
  "PL-G3 doc records allowed future sanitized categories"
);
assert.match(
  readyPreflight,
  /After PR #529 same-process target-refresh command preparation/,
  "ready preflight records after-PR #529 command preparation"
);
assert.match(
  readyPreflight,
  /same-process target-refresh-to-bounded-polling diagnostic boundary is implemented for a future reviewed approval thread/i,
  "ready preflight records future command boundary is implemented"
);
assert.match(
  readyPreflight,
  /PL_G3_SAME_PROCESS_TARGET_REFRESH_BOUNDED_POLLING_DIAGNOSTICS_APPROVAL_LABEL/,
  "ready preflight records value-free same-process approval label reference"
);
assert.match(
  task,
  /Current branch: `codex\/(?:pl-g3-start-to-translation-continuation-after-pr531|pl-g3-same-process-target-refresh-boundary)`/,
  "task.md records current after-PR #529 branch"
);
assert.match(
  task,
  /^## Latest PL-G3 Same-process Target-refresh To Bounded Polling Command Boundary After PR #529$/m,
  "task.md records after-PR #529 latest follow-up"
);
assert.match(
  task,
  /Decision: blocked-same-process-target-refresh-to-bounded-polling-command-prepared-after-pr529/,
  "task.md records after-PR #529 decision"
);
assert.match(
  task,
  /Next safe action: keep PL-G3 blocked\. Run the same-process target-refresh-to-bounded-polling diagnostic only in a later reviewed approval thread/i,
  "task.md records next safe action and approval-gated command boundary"
);
assert.match(task, /public gate state label: unchanged \/ blocked/i, "task.md keeps public gate blocked");
assert.match(task, /public-release capable label: no/i, "task.md keeps public-release capable no");

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
  assert.doesNotMatch(plG3Doc, new RegExp(forbiddenFragment, "i"), `PL-G3 after-PR #528 doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(forbiddenFragment, "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [plG3DocPath, plG3Doc],
  [readyPreflightPath, readyPreflight],
  [taskPath, task],
  [pollingFoundationPath, pollingFoundation],
  [targetLookupFoundationPath, targetLookupFoundation],
  [pollingCommandPath, pollingCommand],
  [targetLookupCommandPath, targetLookupCommand]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  plG3DocPath,
  readyPreflightPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-root-cause-triage-after-pr528-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-continuation-after-pr531-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-same-process-target-refresh-to-bounded-polling-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 after-PR #528 root-cause triage change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 empty-provider-ok root-cause triage after PR #528 contract checks passed");
