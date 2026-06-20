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
  readyPreflight,
  /After PR #519 first-page-to-next-page cursor diagnostics preparation/i,
  "ready preflight records after-PR #519 same-process diagnostics boundary"
);
assert.match(
  readyPreflight,
  /approved-pl-g3-first-page-to-next-page-cursor-diagnostics-after-pr519[\s\S]*Approval state in this thread: not present/i,
  "ready preflight records after-PR #519 approval label is not present"
);
assert.match(
  readyPreflight,
  /one first-page `liveChatMessages\.list` diagnostics read[\s\S]*consumes that cursor in memory only[\s\S]*one bounded next-page read/i,
  "ready preflight records first-page-to-next-page in-memory cursor handling"
);
assert.match(
  readyPreflight,
  /--approved-live-chat-polling-first-page-to-next-page-diagnostics/,
  "ready preflight records the after-PR #519 first-page-to-next-page diagnostics command flag"
);
assert.match(
  readyPreflight,
  /PL_G3_FIRST_PAGE_TO_NEXT_PAGE_CURSOR_DIAGNOSTICS_APPROVAL_LABEL=approved-pl-g3-first-page-to-next-page-cursor-diagnostics-after-pr519/,
  "ready preflight records value-free approval label reference"
);
assert.match(
  readyPreflight,
  /After PR #521 between-pages fresh-comment diagnostics preparation/i,
  "ready preflight records after-PR #521 between-pages fresh-comment diagnostics boundary"
);
assert.match(
  readyPreflight,
  /approved-pl-g3-between-pages-fresh-comment-diagnostics-after-pr521[\s\S]*Approval state in this thread: not present/i,
  "ready preflight records after-PR #521 approval label is not present"
);
assert.match(
  readyPreflight,
  /same-process first-page-to-next-page command currently has no reviewed operator pause boundary[\s\S]*do not run live\/provider execution until that command gap is implemented and reviewed/i,
  "ready preflight records the after-PR #521 command-preparation blocker"
);
assert.match(
  readyPreflight,
  /After PR #522 between-pages fresh-comment command preparation/i,
  "ready preflight records after-PR #522 between-pages command preparation"
);
assert.match(
  readyPreflight,
  /--approved-live-chat-polling-between-pages-fresh-comment-diagnostics/,
  "ready preflight records the after-PR #522 between-pages command flag"
);
assert.match(
  readyPreflight,
  /stderr[\s\S]*waits for the operator to send one fresh visible chat comment and press Enter[\s\S]*stdout remains final JSON only/i,
  "ready preflight records sanitized stderr operator window and stdout JSON-only boundary"
);

assert.match(
  task,
  /Current branch: `codex\/(?:comment-translator-free-beta-pl-g3-(?:empty-provider-ok-next-page-cursor-diagnostics-after-pr516|next-page-cursor-diagnostics-after-pr517|next-page-cursor-diagnostics-after-pr518|first-page-next-page-diagnostics-after-pr519|first-page-next-page-diagnostics-after-pr520|between-pages-fresh-comment-diagnostics-after-pr521|between-pages-fresh-comment-command-after-pr522|between-pages-fresh-comment-execution-after-pr523|between-pages-fresh-comment-retry-after-pr524|bounded-short-polling-prep-after-pr525)|pl-g3-fresh-comment-bounded-short-polling-command-after-pr526)`/,
  "task.md records current after-PR #516, after-PR #517, after-PR #518, after-PR #519, or after-PR #520 branch"
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

assert.match(
  plG3Doc,
  /^## Operator-local Empty-provider-ok Next-page Cursor Diagnostics Follow-up After PR #518$/m,
  "PL-G3 doc records after-PR #518 approved follow-up"
);
assert.match(
  plG3Doc,
  /Decision: blocked-missing-env-fixture-owner-verification-live-chat-readiness-or-target-references-after-pr518/,
  "PL-G3 doc records after-PR #518 blocker before provider access"
);
assert.match(
  plG3Doc,
  /page role label \| next-page-diagnostics-approved[\s\S]*provider status label \| not-run-before-provider-access[\s\S]*HTTP status label \| not-run/i,
  "PL-G3 doc records after-PR #518 sanitized next-page blocker categories"
);
assert.match(
  plG3Doc,
  /`liveChatMessages\.list`: not-run \/ blocked-before-provider-access/i,
  "PL-G3 doc records no provider read occurred after PR #518"
);
assert.match(
  task,
  /^## Latest PL-G3 Approved Next-page Cursor Diagnostics Follow-up After PR #518$/m,
  "task.md records after-PR #518 latest follow-up"
);
assert.match(
  task,
  /Decision: blocked-missing-env-fixture-owner-verification-live-chat-readiness-or-target-references-after-pr518/,
  "task.md records after-PR #518 blocker"
);
assert.match(
  task,
  /Approved command attempt:[\s\S]*stopped before provider access[\s\S]*required operator-local same-process refs\/cursor were unavailable/i,
  "task.md records after-PR #518 command stopped before provider access"
);

assert.match(
  plG3Doc,
  /^## Same-process First-page-to-next-page Cursor Diagnostics Preparation After PR #519$/m,
  "PL-G3 doc records after-PR #519 same-process cursor diagnostics preparation"
);
assert.match(
  plG3Doc,
  /Decision: blocked-first-page-to-next-page-cursor-diagnostics-prepared-after-pr519/,
  "PL-G3 doc records after-PR #519 decision"
);
assert.match(
  plG3Doc,
  /blocked-missing-live-chat-next-page-cursor-reference[\s\S]*`liveChatMessages\.list` was not run[\s\S]*provider access was not run/i,
  "PL-G3 doc carries forward the after-PR #519 missing cursor blocker"
);
assert.match(
  plG3Doc,
  /Exact approval label defined for a future same-process diagnostic: `approved-pl-g3-first-page-to-next-page-cursor-diagnostics-after-pr519`[\s\S]*Exact approval label present in this thread: not-present/i,
  "PL-G3 doc records after-PR #519 approval label absence"
);
assert.match(
  plG3Doc,
  /first-page-result-memory-only[\s\S]*optional-one-bounded-read-if-first-page-token-present[\s\S]*cursor-value-never-output-stored-documented-or-handed-off/i,
  "PL-G3 doc records first-page-to-next-page memory-only cursor handling"
);
assert.match(
  plG3Doc,
  /first-page `liveChatMessages\.list`: not-run \/ approval-gated[\s\S]*next-page `liveChatMessages\.list`: not-run \/ approval-gated/i,
  "PL-G3 doc records no first-page or next-page provider read after PR #519"
);
assert.match(
  task,
  /^## Latest PL-G3 First-page-to-next-page Cursor Diagnostics Preparation After PR #519$/m,
  "task.md records after-PR #519 latest follow-up"
);
assert.match(
  task,
  /Exact approval label present in this thread: not-present[\s\S]*Decision: blocked-first-page-to-next-page-cursor-diagnostics-prepared-after-pr519/i,
  "task.md records after-PR #519 blocker and missing approval"
);
assert.match(
  task,
  /one future approved first-page diagnostics read[\s\S]*consume that cursor in memory only[\s\S]*one bounded next-page read/i,
  "task.md records future same-process first-page-to-next-page diagnostic boundary"
);

assert.match(
  plG3Doc,
  /^## Approved Same-process First-page-to-next-page Cursor Diagnostics After PR #520$/m,
  "PL-G3 doc records after-PR #520 approved same-process cursor diagnostics"
);
assert.match(
  plG3Doc,
  /Decision: blocked-empty-provider-ok-first-page-next-page-present-after-pr520/,
  "PL-G3 doc records after-PR #520 decision"
);
assert.match(
  plG3Doc,
  /first-page[\s\S]*provider-ok[\s\S]*first-page returned count \| 0[\s\S]*first-page nextPageToken presence \| present/i,
  "PL-G3 doc records sanitized first-page result"
);
assert.match(
  plG3Doc,
  /next-page[\s\S]*provider-ok[\s\S]*next-page returned count \| 0[\s\S]*next-page nextPageToken presence \| present/i,
  "PL-G3 doc records sanitized next-page result"
);
assert.match(
  plG3Doc,
  /nextPageRead[\s\S]*executed-with-first-page-cursor-in-memory-only[\s\S]*translationExecution[\s\S]*not-run-diagnostics-only/i,
  "PL-G3 doc records cursor stayed in memory and translation did not run"
);
assert.match(
  task,
  /^## Latest PL-G3 Approved First-page-to-next-page Cursor Diagnostics After PR #520$/m,
  "task.md records after-PR #520 latest approved follow-up"
);
assert.match(
  task,
  /Decision: blocked-empty-provider-ok-first-page-next-page-present-after-pr520/,
  "task.md records after-PR #520 decision"
);
assert.match(
  task,
  /first-page `liveChatMessages\.list`: provider-ok \/ returned count 0 \/ nextPageToken presence present[\s\S]*next-page `liveChatMessages\.list`: provider-ok \/ returned count 0 \/ nextPageToken presence present/i,
  "task.md records sanitized first-page and next-page provider results"
);
assert.match(
  plG3Doc,
  /^## Between-pages Fresh-comment Diagnostics Preparation After PR #521$/m,
  "PL-G3 doc records after-PR #521 between-pages fresh-comment preparation"
);
assert.match(
  plG3Doc,
  /Decision: blocked-between-pages-fresh-comment-diagnostics-command-gap-after-pr521/,
  "PL-G3 doc records after-PR #521 command gap decision"
);
assert.match(
  plG3Doc,
  /Exact approval label defined for future use: `approved-pl-g3-between-pages-fresh-comment-diagnostics-after-pr521`[\s\S]*Exact approval label present in this thread: not-present/i,
  "PL-G3 doc records after-PR #521 approval label absence"
);
assert.match(
  plG3Doc,
  /desired future boundary[\s\S]*first-page read[\s\S]*operator fresh-comment window[\s\S]*next-page read[\s\S]*cursor remains process-memory-only/i,
  "PL-G3 doc records the desired future between-pages boundary"
);
assert.match(
  plG3Doc,
  /Existing command status[\s\S]*not suitable for this approval boundary[\s\S]*no reviewed pause or operator synchronization point/i,
  "PL-G3 doc records existing command is not suitable for between-pages fresh-comment diagnostics"
);
assert.match(
  task,
  /^## Latest PL-G3 Between-pages Fresh-comment Diagnostics Preparation After PR #521$/m,
  "task.md records after-PR #521 latest preparation"
);
assert.match(
  task,
  /Decision: blocked-between-pages-fresh-comment-diagnostics-command-gap-after-pr521/,
  "task.md records after-PR #521 command gap decision"
);
assert.match(
  task,
  /Existing command gap: the reviewed first-page-to-next-page command runs both reads back-to-back and has no reviewed operator fresh-comment window/i,
  "task.md records the after-PR #521 command gap"
);
assert.match(
  plG3Doc,
  /^## Between-pages Fresh-comment Command Preparation After PR #522$/m,
  "PL-G3 doc records after-PR #522 between-pages command preparation"
);
assert.match(
  plG3Doc,
  /Decision: blocked-between-pages-fresh-comment-diagnostics-approval-not-present-after-pr522/,
  "PL-G3 doc records after-PR #522 approval-not-present decision"
);
assert.match(
  plG3Doc,
  /Prepared command boundary:[\s\S]*--approved-live-chat-polling-between-pages-fresh-comment-diagnostics/,
  "PL-G3 doc records the prepared between-pages command"
);
assert.match(
  plG3Doc,
  /sanitized operator instruction on stderr[\s\S]*presses Enter[\s\S]*one bounded next-page read consumes the first-page cursor in process memory only/i,
  "PL-G3 doc records the same-process operator window"
);
assert.match(
  task,
  /^## Latest PL-G3 Between-pages Fresh-comment Command Preparation After PR #522$/m,
  "task.md records after-PR #522 latest command preparation"
);
assert.match(
  task,
  /Prepared command: `node scripts\/comment-translator-youtube-live-chat-polling-smoke-command\.mjs --execute --approved-live-chat-polling-between-pages-fresh-comment-diagnostics --json`/,
  "task.md records the after-PR #522 prepared command"
);
assert.match(
  plG3Doc,
  /^## Between-pages Fresh-comment Diagnostics Execution After PR #523$/m,
  "PL-G3 doc records after-PR #523 between-pages fresh-comment execution"
);
assert.match(
  plG3Doc,
  /Decision: blocked-between-pages-fresh-comment-next-page-auth-rejected-after-pr523/,
  "PL-G3 doc records after-PR #523 auth-rejected decision"
);
assert.match(
  plG3Doc,
  /Exact approval label consumed: `approved-pl-g3-between-pages-fresh-comment-diagnostics-after-pr521`/,
  "PL-G3 doc records consumed approval label"
);
assert.match(
  plG3Doc,
  /Operator fresh-comment window: completed-before-next-page-read[\s\S]*fresh visible comment was sent after the first-page diagnostic read and before the bounded next-page read/i,
  "PL-G3 doc records the between-pages fresh-comment timing"
);
assert.match(
  plG3Doc,
  /first-page provider status \| provider-ok[\s\S]*first-page HTTP status \| 200[\s\S]*first-page returned count \| 0[\s\S]*first-page nextPageToken presence \| present/i,
  "PL-G3 doc records sanitized first-page after-PR #523 result"
);
assert.match(
  plG3Doc,
  /next-page provider status \| provider-auth-rejected[\s\S]*next-page HTTP status \| 401[\s\S]*next-page returned count \| 0[\s\S]*next-page nextPageToken presence \| absent/i,
  "PL-G3 doc records sanitized next-page auth-rejected result"
);
assert.match(
  plG3Doc,
  /nextPageRead \| executed-with-first-page-cursor-in-memory-only[\s\S]*operatorFreshCommentWindow \| completed-before-next-page-read[\s\S]*translationExecution \| not-run-diagnostics-only/i,
  "PL-G3 doc records cursor memory-only handling and no translation execution after PR #523"
);
assert.match(
  task,
  /^## Latest PL-G3 Between-pages Fresh-comment Diagnostics Execution After PR #523$/m,
  "task.md records after-PR #523 latest execution"
);
assert.match(
  task,
  /Decision: blocked-between-pages-fresh-comment-next-page-auth-rejected-after-pr523/,
  "task.md records after-PR #523 decision"
);
assert.match(
  task,
  /first-page `liveChatMessages\.list`: provider-ok \/ HTTP 200 \/ returned count 0 \/ nextPageToken presence present[\s\S]*next-page `liveChatMessages\.list`: provider-auth-rejected \/ HTTP 401 \/ returned count 0 \/ nextPageToken presence absent/i,
  "task.md records sanitized first-page and next-page after-PR #523 provider results"
);
assert.match(
  task,
  /Operator fresh-comment window: completed-before-next-page-read[\s\S]*fresh visible comment was sent after the first-page diagnostic read and before the bounded next-page read/i,
  "task.md records the fresh-comment window execution"
);
assert.match(
  plG3Doc,
  /^## Between-pages Fresh-comment Diagnostics Retry After PR #524$/m,
  "PL-G3 doc records after-PR #524 between-pages fresh-comment retry"
);
assert.match(
  plG3Doc,
  /Decision: blocked-between-pages-fresh-comment-empty-provider-ok-next-page-present-after-pr524/,
  "PL-G3 doc records after-PR #524 empty-provider-ok decision"
);
assert.match(
  plG3Doc,
  /Prior same-thread retry attempt after PR #524: provider access not-run[\s\S]*expiry reference was missing/i,
  "PL-G3 doc records the pre-provider expiry-reference blocker"
);
assert.match(
  plG3Doc,
  /Operator fresh-comment window: completed-before-next-page-read[\s\S]*fresh visible comment was sent after the first-page diagnostic read and before the bounded next-page read/i,
  "PL-G3 doc records the after-PR #524 between-pages fresh-comment timing"
);
assert.match(
  plG3Doc,
  /first-page provider status \| provider-ok[\s\S]*first-page HTTP status \| 200[\s\S]*first-page returned count \| 0[\s\S]*first-page nextPageToken presence \| present/i,
  "PL-G3 doc records sanitized first-page after-PR #524 result"
);
assert.match(
  plG3Doc,
  /next-page provider status \| provider-ok[\s\S]*next-page HTTP status \| 200[\s\S]*next-page returned count \| 0[\s\S]*next-page nextPageToken presence \| present/i,
  "PL-G3 doc records sanitized next-page after-PR #524 result"
);
assert.match(
  task,
  /^## Latest PL-G3 Between-pages Fresh-comment Diagnostics Retry After PR #524$/m,
  "task.md records after-PR #524 latest retry"
);
assert.match(
  task,
  /Decision: blocked-between-pages-fresh-comment-empty-provider-ok-next-page-present-after-pr524/,
  "task.md records after-PR #524 decision"
);
assert.match(
  task,
  /first-page `liveChatMessages\.list`: provider-ok \/ HTTP 200 \/ returned count 0 \/ nextPageToken presence present[\s\S]*next-page `liveChatMessages\.list`: provider-ok \/ HTTP 200 \/ returned count 0 \/ nextPageToken presence present/i,
  "task.md records sanitized first-page and next-page after-PR #524 provider results"
);

assert.match(
  plG3Doc,
  /^## Fresh-comment Bounded Short Polling Diagnostics Preparation After PR #525$/m,
  "PL-G3 doc records after-PR #525 bounded short polling preparation"
);
assert.match(
  plG3Doc,
  /Decision: blocked-fresh-comment-bounded-short-polling-diagnostics-prepared-after-pr525/,
  "PL-G3 doc records after-PR #525 preparation decision"
);
assert.match(
  plG3Doc,
  /Exact approval label defined for future use: `approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525`[\s\S]*Exact approval label present in this thread: not-present/i,
  "PL-G3 doc records after-PR #525 exact approval label is absent"
);
assert.match(
  plG3Doc,
  /Desired future boundary:[\s\S]*operator sends one fresh visible chat comment[\s\S]*bounded short polling diagnostic[\s\S]*at most 2-3 pages\/attempts[\s\S]*respecting provider polling interval/i,
  "PL-G3 doc records the after-PR #525 future bounded short polling boundary"
);
assert.match(
  plG3Doc,
  /Stop condition:[\s\S]*first non-empty sanitized intake[\s\S]*bounded max attempts/i,
  "PL-G3 doc records bounded stop conditions"
);
assert.match(
  plG3Doc,
  /Allowed sanitized output categories[\s\S]*attempt\/page role label[\s\S]*provider route label[\s\S]*returned count[\s\S]*polling interval presence\/count label[\s\S]*bounded attempt count[\s\S]*stop reason label/i,
  "PL-G3 doc records allowed sanitized output categories for bounded short polling"
);
assert.match(
  plG3Doc,
  /Forbidden output\/storage[\s\S]*cursor values[\s\S]*provider URL query values[\s\S]*raw comments[\s\S]*raw provider payloads[\s\S]*quota values[\s\S]*provider target metadata/i,
  "PL-G3 doc forbids private values for after-PR #525 boundary"
);
assert.match(
  plG3Doc,
  /Start: not-run[\s\S]*Stop: not-run[\s\S]*target lookup execution: not-run[\s\S]*bounded short polling: not-run \/ approval-gated[\s\S]*Azure\/OpenAI provider execution: not-run[\s\S]*UI\/feed confirmation: not-run/i,
  "PL-G3 doc keeps after-PR #525 as preparation-only"
);
assert.match(
  readyPreflight,
  /After PR #525 fresh-comment bounded short polling diagnostics preparation/i,
  "ready preflight records after-PR #525 diagnostics boundary"
);
assert.match(
  readyPreflight,
  /approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525[\s\S]*Approval state in this thread: not present/i,
  "ready preflight records after-PR #525 approval label is not present"
);
assert.match(
  readyPreflight,
  /operator sends one fresh visible chat comment at the instructed point[\s\S]*very small bounded polling diagnostic[\s\S]*at most 2-3 pages\/attempts[\s\S]*respect provider polling interval/i,
  "ready preflight records the future bounded short polling shape"
);
assert.match(
  readyPreflight,
  /stop on first non-empty sanitized intake[\s\S]*bounded-max-attempts-reached/i,
  "ready preflight records bounded short polling stop reasons"
);
assert.match(
  readyPreflight,
  /must not output, store, document, or hand off[\s\S]*cursor values[\s\S]*provider URL query values[\s\S]*raw comments[\s\S]*quota values/i,
  "ready preflight forbids private values for after-PR #525 boundary"
);
assert.match(
  task,
  /^## Latest PL-G3 Fresh-comment Bounded Short Polling Diagnostics Preparation After PR #525$/m,
  "task.md records after-PR #525 latest preparation"
);
assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-pl-g3-bounded-short-polling-prep-after-pr525`/,
  "task.md records current after-PR #525 branch"
);
assert.match(
  task,
  /Decision: blocked-fresh-comment-bounded-short-polling-diagnostics-prepared-after-pr525/,
  "task.md records after-PR #525 decision"
);
assert.match(
  task,
  /Exact approval label defined for future use: `approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525`[\s\S]*Exact approval label present in this thread: not-present/i,
  "task.md records after-PR #525 approval label absence"
);
assert.match(
  task,
  /Prepared boundary: docs\/contracts\/command-preparation only[\s\S]*bounded short polling command is not implemented or run in this slice/i,
  "task.md records docs/contracts/command-preparation-only scope"
);
assert.match(
  task,
  /Start: not-run[\s\S]*Stop: not-run[\s\S]*target lookup execution: not-run[\s\S]*bounded short polling: not-run \/ approval-gated[\s\S]*Azure\/OpenAI provider execution: not-run[\s\S]*UI\/feed confirmation: not-run/i,
  "task.md records no live/provider/UI execution after PR #525"
);

assert.match(
  plG3Doc,
  /^## Fresh-comment Bounded Short Polling Command Preparation After PR #526$/m,
  "PL-G3 doc records after-PR #526 bounded short polling command preparation"
);
assert.match(
  plG3Doc,
  /Decision: blocked-fresh-comment-bounded-short-polling-command-prepared-after-pr526/,
  "PL-G3 doc records after-PR #526 command preparation decision"
);
assert.match(
  plG3Doc,
  /Prepared command boundary:[\s\S]*--approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics/,
  "PL-G3 doc records the after-PR #526 prepared bounded short polling command flag"
);
assert.match(
  plG3Doc,
  /operator sends one fresh visible chat comment[\s\S]*stderr[\s\S]*bounded short polling diagnostic[\s\S]*at most 3 attempts/i,
  "PL-G3 doc records the fresh-comment prompt and bounded short polling diagnostic bounds"
);
assert.match(
  plG3Doc,
  /Stop reasons:[\s\S]*non-empty-intake-found[\s\S]*bounded-max-attempts-reached[\s\S]*provider-not-ok/i,
  "PL-G3 doc records bounded stop reasons"
);
assert.match(
  plG3Doc,
  /Start: not-run[\s\S]*Stop: not-run[\s\S]*target lookup execution: not-run[\s\S]*bounded short polling: not-run \/ approval-gated[\s\S]*`liveChatMessages\.list`: not-run in this after-PR #526 command-preparation slice/i,
  "PL-G3 doc records after-PR #526 command preparation did not run provider access"
);
assert.match(
  readyPreflight,
  /After PR #526 fresh-comment bounded short polling command preparation/i,
  "ready preflight records after-PR #526 command boundary"
);
assert.match(
  readyPreflight,
  /--approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics/,
  "ready preflight records the after-PR #526 bounded short polling command flag"
);
assert.match(
  readyPreflight,
  /PL_G3_FRESH_COMMENT_BOUNDED_SHORT_POLLING_DIAGNOSTICS_APPROVAL_LABEL=approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525/,
  "ready preflight records the after-PR #526 value-free approval label reference"
);
assert.match(
  task,
  /^## Latest PL-G3 Fresh-comment Bounded Short Polling Command Preparation After PR #526$/m,
  "task.md records after-PR #526 latest command preparation"
);
assert.match(
  task,
  /Decision: blocked-fresh-comment-bounded-short-polling-command-prepared-after-pr526/,
  "task.md records after-PR #526 command preparation decision"
);
assert.match(
  task,
  /Prepared command: `node scripts\/comment-translator-youtube-live-chat-polling-smoke-command\.mjs --execute --approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics --json`/,
  "task.md records the after-PR #526 prepared command"
);
assert.match(
  task,
  /Start: not-run[\s\S]*Stop: not-run[\s\S]*target lookup execution: not-run[\s\S]*bounded short polling: not-run \/ approval-gated[\s\S]*`liveChatMessages\.list`: not-run in this after-PR #526 command-preparation slice/i,
  "task.md records no live/provider/UI execution after PR #526"
);

assert.match(pollingFoundation, /nextPageToken:\s*"present"\s*\|\s*"absent"/, "polling foundation returns token presence only");
assert.match(pollingFoundation, /empty-provider-ok-next-page-present/, "polling foundation labels empty provider-ok next page");
assert.match(
  pollingFoundation,
  /runYouTubeLiveChatPollingFirstPageToNextPageDiagnosticsFoundation/,
  "polling foundation exposes same-process first-page-to-next-page diagnostics"
);
assert.match(
  pollingFoundation,
  /readNextPageTokenValue[\s\S]*firstPageNextPageToken[\s\S]*pageToken: firstPageNextPageToken/,
  "polling foundation consumes the first-page cursor in memory only for the next-page read"
);
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
assert.match(
  pollingCommand,
  /--approved-live-chat-polling-first-page-to-next-page-diagnostics/,
  "polling command exposes a first-page-to-next-page diagnostics-only approval boundary"
);
assert.match(
  pollingCommand,
  /--approved-live-chat-polling-between-pages-fresh-comment-diagnostics/,
  "polling command exposes a between-pages fresh-comment diagnostics-only approval boundary"
);
assert.match(
  pollingCommand,
  /--approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics/,
  "polling command exposes a fresh-comment bounded short polling diagnostics-only approval boundary"
);
assert.match(
  pollingCommand,
  /PL_G3_BETWEEN_PAGES_FRESH_COMMENT_DIAGNOSTICS_APPROVAL_LABEL/,
  "polling command requires the between-pages value-free approval label reference"
);
assert.match(
  pollingCommand,
  /PL_G3_FRESH_COMMENT_BOUNDED_SHORT_POLLING_DIAGNOSTICS_APPROVAL_LABEL/,
  "polling command requires the bounded short polling value-free approval label reference"
);
assert.match(
  pollingCommand,
  /waitForOperatorFreshCommentWindow/,
  "polling command includes an operator fresh-comment window before next-page read"
);
assert.match(
  pollingCommand,
  /waitForOperatorFreshCommentBeforeBoundedShortPolling/,
  "polling command includes an operator fresh-comment window before bounded short polling"
);
assert.match(
  pollingFoundation,
  /runYouTubeLiveChatPollingFreshCommentBoundedShortPollingDiagnosticsFoundation/,
  "polling foundation exposes fresh-comment bounded short polling diagnostics"
);
assert.match(
  pollingFoundation,
  /boundedMaxAttempts[\s\S]*3[\s\S]*stopReason[\s\S]*non-empty-intake-found[\s\S]*bounded-max-attempts-reached[\s\S]*provider-not-ok/i,
  "polling foundation bounds short polling attempts and emits sanitized stop reasons"
);
assert.match(
  pollingCommand,
  /blocked-missing-first-page-to-next-page-diagnostics-approval-label/,
  "polling command blocks first-page-to-next-page diagnostics before provider access without the exact approval label"
);
assert.match(
  pollingCommand,
  /publicGateStateLabel: "unchanged \/ blocked"[\s\S]*publicReleaseCapableLabel: "no"/,
  "polling command returns public gate and public-release labels for first-page-to-next-page diagnostics"
);
assert.match(pollingCommandContract, /empty-provider-ok-next-page-present/, "polling command contract covers next-page-present empty intake");
assert.match(
  pollingCommandContract,
  /runYouTubeLiveChatPollingFirstPageToNextPageDiagnosticsFoundation[\s\S]*first-page-to-next-page diagnostics runs exactly two provider reads/i,
  "polling command contract covers first-page-to-next-page diagnostics"
);
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
