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

function assertIncludesAll(source, label, fragments) {
  for (const fragment of fragments) {
    assert.match(source, new RegExp(escapeRegex(fragment), "i"), `${label} includes ${fragment}`);
  }
}

function escapeRegex(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [wrapperPath, completionDocPath, readyPreflightPath, taskPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `required path exists: ${requiredPath}`);
}

const providerUnavailableFixture = runWrapper(["--run-contract-fixture", "provider-unavailable-skip-reasons"]);
assert.equal(providerUnavailableFixture.status, 0, "provider-unavailable fixture passes through sanitized wrapper");
assert.equal(providerUnavailableFixture.stderr, "", "wrapper does not print raw child stderr");
const providerUnavailablePayload = JSON.parse(providerUnavailableFixture.stdout);
assert.equal(providerUnavailablePayload.status, "pl-g3-sanitized-wrapper-summary");
assert.equal(providerUnavailablePayload.providerUnavailableSkippedCount, 3);
assert.equal(providerUnavailablePayload.terminalErrorCount, 3);
assert.deepEqual(providerUnavailablePayload.terminalErrorCodeCounts, {
  invalidRequest: 0,
  unsupportedLanguage: 0,
  providerNotConfigured: 0,
  credentialMissing: 3,
  policyBlocked: 0
});
assert.equal(providerUnavailablePayload.dominantTerminalErrorCodeLabel, "credential-missing");
assert.equal(providerUnavailablePayload.providerConfigPresenceLabel, "missing-credential");
assert.equal(providerUnavailablePayload.providerRouteAvailabilityLabel, "route-available-provider-reached");
assert.equal(providerUnavailablePayload.publicGateStateLabel, "unchanged / blocked");
assert.equal(providerUnavailablePayload.publicReleaseCapableLabel, "no");
assertNoSensitiveValues(JSON.stringify(providerUnavailablePayload), "provider terminal error boundary payload");

const requiredFragments = [
  "PL-G3 Provider Terminal-error Root-cause Boundary After PR #538",
  "after-pr538-provider-terminal-error-boundary-prepared",
  "ce9de24a65f79fe69c252b5cfef3f4d0c6c5a96d",
  "translated count 0 / skipped count 3 / providerUnavailableSkippedCount 3 / terminalErrorCount 3",
  "terminalErrorCodeCounts",
  "invalidRequest",
  "unsupportedLanguage",
  "providerNotConfigured",
  "credentialMissing",
  "policyBlocked",
  "dominantTerminalErrorCodeLabel",
  "providerConfigPresenceLabel",
  "providerRouteAvailabilityLabel",
  "terminalErrorCodeCounts.credentialMissing",
  "dominantTerminalErrorCodeLabel` `credential-missing",
  "providerConfigPresenceLabel` `missing-credential",
  "providerRouteAvailabilityLabel` `route-available-provider-reached",
  "Public gate state label: unchanged / blocked",
  "Public-release capable label: no",
  "Do not request or run another live/provider wrapper rerun"
];

for (const [label, source] of [
  [completionDocPath, read(completionDocPath)],
  [taskPath, read(taskPath)]
]) {
  assertIncludesAll(source, label, requiredFragments);
  assertNoSensitiveValues(source, label);
}

assertIncludesAll(read(readyPreflightPath), readyPreflightPath, [
  "terminalErrorCodeCounts",
  "dominantTerminalErrorCodeLabel",
  "providerConfigPresenceLabel",
  "providerRouteAvailabilityLabel",
  "no approval is carried over from PR #537, PR #538, or any handoff"
]);
assertNoSensitiveValues(read(readyPreflightPath), readyPreflightPath);

console.log("comment translator Free beta PL-G3 provider terminal-error boundary after PR #538 contract checks passed");
