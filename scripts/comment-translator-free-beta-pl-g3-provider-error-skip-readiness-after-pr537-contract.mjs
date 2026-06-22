import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const wrapperPath = "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs";
const completionDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function runWrapper(args) {
  return spawnSync(process.execPath, [wrapperPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      Path: process.env.Path ?? process.env.PATH ?? "",
      PATH: process.env.PATH ?? process.env.Path ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      WINDIR: process.env.WINDIR ?? "",
      TEMP: process.env.TEMP ?? "",
      TMP: process.env.TMP ?? ""
    }
  });
}

function parseJson(stdout) {
  assert.ok(stdout.trim().length > 0, "wrapper writes JSON");
  return JSON.parse(stdout);
}

function escaped(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertIncludesAll(source, label, fragments) {
  for (const fragment of fragments) {
    assert.match(source, new RegExp(escaped(fragment), "i"), `${label} includes ${fragment}`);
  }
}

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [wrapperPath, completionDocPath, readyPreflightPath, taskPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `required path exists: ${requiredPath}`);
}

const checkEnv = runWrapper(["--check-env-only"]);
assert.equal(checkEnv.status, 0, "wrapper check-env-only is safe and does not execute provider access");
const checkEnvPayload = parseJson(checkEnv.stdout);
assert.equal(checkEnvPayload.status, "ready-for-pl-g3-sanitized-wrapper-after-pr533");
assert.equal(checkEnvPayload.unavailableReason, "none");
assert.equal(checkEnvPayload.publicGateStateLabel, "unchanged / blocked");
assert.equal(checkEnvPayload.publicReleaseCapableLabel, "no");
assertNoSensitiveValues(JSON.stringify(checkEnvPayload), "wrapper check-env-only payload");

const commandReview = runWrapper(["--print-exact-command-review"]);
assert.equal(commandReview.status, 0, "wrapper exact command review is safe and does not execute provider access");
const commandReviewPayload = parseJson(commandReview.stdout);
assert.equal(commandReviewPayload.status, "ready-for-pl-g3-sanitized-wrapper-exact-command-review");
assert.equal(commandReviewPayload.unavailableReason, "none");
assert.equal(commandReviewPayload.liveProviderExecutionLabel, "unavailable");
assert.equal(commandReviewPayload.publicGateStateLabel, "unchanged / blocked");
assert.equal(commandReviewPayload.publicReleaseCapableLabel, "no");
assertNoSensitiveValues(JSON.stringify(commandReviewPayload), "wrapper exact command review payload");

const providerUnavailableFixture = runWrapper(["--run-contract-fixture", "provider-unavailable-skip-reasons"]);
assert.equal(providerUnavailableFixture.status, 0, "provider-unavailable fixture passes through sanitized wrapper");
assert.equal(providerUnavailableFixture.stderr, "", "wrapper does not print raw child stderr");
const providerUnavailablePayload = parseJson(providerUnavailableFixture.stdout);
assert.deepEqual(
  {
    returnedCount: providerUnavailablePayload.returnedCount,
    eligibleCount: providerUnavailablePayload.eligibleCount,
    providerRequestCount: providerUnavailablePayload.providerRequestCount,
    providerCallCount: providerUnavailablePayload.providerCallCount,
    translatedCount: providerUnavailablePayload.translatedCount,
    skippedCount: providerUnavailablePayload.skippedCount,
    languagePolicySkippedCount: providerUnavailablePayload.languagePolicySkippedCount,
    perMinuteSkippedCount: providerUnavailablePayload.perMinuteSkippedCount,
    providerUnavailableSkippedCount: providerUnavailablePayload.providerUnavailableSkippedCount,
    recoverableErrorCount: providerUnavailablePayload.recoverableErrorCount,
    terminalErrorCount: providerUnavailablePayload.terminalErrorCount,
    terminalCredentialMissingCount: providerUnavailablePayload.terminalErrorCodeCounts.credentialMissing,
    dominantTerminalErrorCodeLabel: providerUnavailablePayload.dominantTerminalErrorCodeLabel,
    providerConfigPresenceLabel: providerUnavailablePayload.providerConfigPresenceLabel,
    providerRouteAvailabilityLabel: providerUnavailablePayload.providerRouteAvailabilityLabel,
    sourceAttributionLabel: providerUnavailablePayload.sourceAttributionLabel,
    sourceAttributionAvailabilityLabel: providerUnavailablePayload.sourceAttributionAvailabilityLabel,
    publicGateStateLabel: providerUnavailablePayload.publicGateStateLabel,
    publicReleaseCapableLabel: providerUnavailablePayload.publicReleaseCapableLabel,
    pass: providerUnavailablePayload.pass,
    unavailableReason: providerUnavailablePayload.unavailableReason
  },
  {
    returnedCount: 3,
    eligibleCount: 3,
    providerRequestCount: 3,
    providerCallCount: 3,
    translatedCount: 0,
    skippedCount: 3,
    languagePolicySkippedCount: 0,
    perMinuteSkippedCount: 0,
    providerUnavailableSkippedCount: 3,
    recoverableErrorCount: 0,
    terminalErrorCount: 3,
    terminalCredentialMissingCount: 3,
    dominantTerminalErrorCodeLabel: "credential-missing",
    providerConfigPresenceLabel: "missing-credential",
    providerRouteAvailabilityLabel: "route-available-provider-reached",
    sourceAttributionLabel: "unavailable",
    sourceAttributionAvailabilityLabel: "not-produced-by-provider-harness",
    publicGateStateLabel: "unchanged / blocked",
    publicReleaseCapableLabel: "no",
    pass: true,
    unavailableReason: "none"
  }
);
assertNoSensitiveValues(JSON.stringify(providerUnavailablePayload), "provider unavailable payload");

const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);

const afterPr537Fragments = [
  "PL-G3 Provider Error / Skip Reason Readiness After PR #537",
  "after-pr537-provider-error-skip-wrapper-rerun-preflight-reviewed",
  "PR #537 merge commit: `55061e90acb2608d0683aadd55c630c83ad96b8c`",
  "approved-pl-g3-provider-error-skip-wrapper-rerun-after-pr537",
  "node scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs --check-env-only",
  "node scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs --print-exact-command-review",
  "node scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs --execute --approved-pl-g3-sanitized-wrapper-after-pr533 --reviewed-provider-harness-child",
  "Start, Stop, target lookup execution, liveChatMessages.list, Azure/OpenAI provider execution, and UI/feed confirmation were not run",
  "languagePolicySkippedCount",
  "perMinuteSkippedCount",
  "providerUnavailableSkippedCount",
  "recoverableErrorCount",
  "terminalErrorCount",
  "terminalErrorCodeCounts",
  "dominantTerminalErrorCodeLabel",
  "providerConfigPresenceLabel",
  "providerRouteAvailabilityLabel",
  "sourceAttributionAvailabilityLabel",
  "not-produced-by-provider-harness",
  "not a UI/feed confirmation",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "exact explicit in-thread approval is absent"
];

const afterPr537ExecutionFragments = [
  "PL-G3 Provider Error / Skip Reason Wrapper Rerun After PR #537 Approval",
  "approved-pl-g3-provider-error-skip-wrapper-rerun-after-pr537",
  "pl-g3-sanitized-wrapper-summary",
  "child exit status label `exit-0`",
  "stdout final JSON parsed true",
  "provider harness status label `task-27-live-provider-smoke-sanitized-result`",
  "live provider execution label `approved-bounded-execution`",
  "provider target lookup label `executed-presence-only`",
  "live chat polling label `executed-bounded-readonly-one-step`",
  "translation provider execution label `executed-server-only-provider`",
  "returned count 3 / eligible count 3",
  "provider request count 3 / provider call count 3",
  "translated count 0 / skipped count 3",
  "languagePolicySkippedCount 0",
  "perMinuteSkippedCount 0",
  "providerUnavailableSkippedCount 3",
  "recoverableErrorCount 0",
  "terminalErrorCount 3",
  "sourceAttributionAvailabilityLabel `not-produced-by-provider-harness`",
  "pass true / unavailableReason none",
  "Public gate state label: unchanged / blocked",
  "Public-release capable label: no"
];

for (const [label, source] of [
  [completionDocPath, completionDoc],
  [taskPath, task]
]) {
  assertIncludesAll(source, label, afterPr537Fragments);
  assertIncludesAll(source, label, afterPr537ExecutionFragments);
  assertNoSensitiveValues(source, label);
}

assertIncludesAll(readyPreflight, readyPreflightPath, [
  "approved-pl-g3-provider-error-skip-wrapper-rerun-after-pr537",
  "providerUnavailableSkippedCount",
  "recoverableErrorCount",
  "terminalErrorCount",
  "sourceAttributionAvailabilityLabel"
]);
assertNoSensitiveValues(readyPreflight, readyPreflightPath);

console.log("comment translator Free beta PL-G3 provider error/skip readiness after PR #537 contract checks passed");
