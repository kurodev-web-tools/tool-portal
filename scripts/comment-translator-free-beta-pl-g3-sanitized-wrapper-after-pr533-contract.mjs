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

function assertNoRawStreamLeak(payload, label) {
  const serialized = JSON.stringify(payload);
  for (const forbidden of [
    "operator stderr warning",
    "stderr-json-count-999",
    "stdout raw progress",
    "raw-provider-payload",
    "raw-comment-value",
    "providerTargetMetadata",
    "Authorization",
    "liveChatId",
    "ownerUserId",
    "providerChannelId"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbidden), `${label} does not leak ${forbidden}`);
  }
}

assert.ok(fs.existsSync(path.join(root, wrapperPath)), "PL-G3 after PR #533 sanitized wrapper exists");

const wrapperSource = read(wrapperPath);
assert.match(wrapperSource, /spawn\(/, "wrapper uses child process capture");
assert.match(wrapperSource, /child\.stdout/, "wrapper captures child stdout separately");
assert.match(wrapperSource, /child\.stderr/, "wrapper captures child stderr separately");
assert.match(wrapperSource, /parseFinalJsonFromStdout/, "wrapper parses final JSON from stdout only");
assert.match(wrapperSource, /projectAllowedSanitizedSummary/, "wrapper projects an allowed sanitized summary");
assert.match(wrapperSource, /--use-f10-feed-persistence-path/, "wrapper selects the reviewed F10 feed persistence provider child path");
assert.doesNotMatch(wrapperSource, /stdio:\s*["']inherit["']/, "wrapper does not inherit raw child streams");

const mixedStream = runWrapper(["--run-contract-fixture", "mixed-stderr-final-json"]);
assert.equal(mixedStream.status, 0, "fixture with stderr warning and stdout final JSON passes");
assert.equal(mixedStream.stderr, "", "wrapper does not print raw child stderr");
const mixedStreamPayload = parseJson(mixedStream.stdout);
assert.equal(mixedStreamPayload.status, "pl-g3-sanitized-wrapper-summary");
assert.equal(mixedStreamPayload.commandLabel, "pl-g3-provider-harness-contract-fixture");
assert.equal(mixedStreamPayload.childExitStatusLabel, "exit-0");
assert.equal(mixedStreamPayload.stdoutFinalJsonParsed, true);
assert.equal(mixedStreamPayload.stderrCaptureLabel, "captured-separate-not-parsed");
assert.equal(mixedStreamPayload.providerHarnessStatusLabel, "task-27-live-provider-smoke-sanitized-result");
assert.equal(mixedStreamPayload.providerTargetLookupLabel, "executed-presence-only");
assert.equal(mixedStreamPayload.liveChatPollingLabel, "executed-bounded-readonly-one-step");
assert.equal(mixedStreamPayload.translationProviderExecutionLabel, "executed-server-only-provider");
assert.equal(mixedStreamPayload.feedPersistencePathLabel, "not-run-direct-provider-execution-harness");
assert.equal(mixedStreamPayload.durableFeedPersistResultLabel, "unavailable");
assert.equal(mixedStreamPayload.feedDisplayRowCount, 0);
assert.equal(mixedStreamPayload.returnedCount, 3);
assert.equal(mixedStreamPayload.eligibleCount, 2);
assert.equal(mixedStreamPayload.providerRequestCount, 1);
assert.equal(mixedStreamPayload.providerCallCount, 1);
assert.equal(mixedStreamPayload.translatedCount, 1);
assert.equal(mixedStreamPayload.skippedCount, 1);
assert.equal(mixedStreamPayload.languagePolicySkippedCount, 0);
assert.equal(mixedStreamPayload.perMinuteSkippedCount, 0);
assert.equal(mixedStreamPayload.providerUnavailableSkippedCount, 1);
assert.equal(mixedStreamPayload.recoverableErrorCount, 1);
assert.equal(mixedStreamPayload.terminalErrorCount, 0);
assert.equal(mixedStreamPayload.stopReasonLabel, "none");
assert.equal(mixedStreamPayload.sourceAttributionLabel, "youtube-live-chat");
assert.equal(mixedStreamPayload.sourceAttributionAvailabilityLabel, "available");
assert.equal(mixedStreamPayload.publicGateStateLabel, "unchanged / blocked");
assert.equal(mixedStreamPayload.publicReleaseCapableLabel, "no");
assert.equal(mixedStreamPayload.pass, true);
assert.equal(mixedStreamPayload.unavailableReason, "none");
assertNoRawStreamLeak(mixedStreamPayload, "mixed stream payload");

const stderrJsonNoise = runWrapper(["--run-contract-fixture", "stderr-json-noise"]);
assert.equal(stderrJsonNoise.status, 0, "stderr JSON noise does not affect stdout final JSON parse");
const stderrJsonNoisePayload = parseJson(stderrJsonNoise.stdout);
assert.equal(stderrJsonNoisePayload.stderrCaptureLabel, "captured-separate-not-parsed");
assert.equal(stderrJsonNoisePayload.returnedCount, 4);
assert.equal(stderrJsonNoisePayload.eligibleCount, 4);
assert.equal(stderrJsonNoisePayload.translatedCount, 4);
assert.equal(stderrJsonNoisePayload.feedPersistencePathLabel, "not-run-direct-provider-execution-harness");
assert.equal(stderrJsonNoisePayload.durableFeedPersistResultLabel, "unavailable");
assert.equal(stderrJsonNoisePayload.feedDisplayRowCount, 0);
assert.equal(stderrJsonNoisePayload.skippedCount, 0);
assert.equal(stderrJsonNoisePayload.languagePolicySkippedCount, 0);
assert.equal(stderrJsonNoisePayload.perMinuteSkippedCount, 0);
assert.equal(stderrJsonNoisePayload.providerUnavailableSkippedCount, 0);
assert.equal(stderrJsonNoisePayload.recoverableErrorCount, 0);
assert.equal(stderrJsonNoisePayload.terminalErrorCount, 0);
assertNoRawStreamLeak(stderrJsonNoisePayload, "stderr JSON noise payload");

const f10PersistenceFixture = runWrapper(["--run-contract-fixture", "f10-feed-persistence-path"]);
assert.equal(f10PersistenceFixture.status, 0, "F10 feed persistence fixture passes");
const f10PersistencePayload = parseJson(f10PersistenceFixture.stdout);
assert.equal(f10PersistencePayload.feedPersistencePathLabel, "executed-f10-feed-persistence-path");
assert.equal(f10PersistencePayload.durableFeedPersistResultLabel, "durable-feed-persisted");
assert.equal(f10PersistencePayload.durableFeedStoreReadyLabel, "ready");
assert.equal(f10PersistencePayload.durableFeedTableShapeLabel, "available");
assert.equal(f10PersistencePayload.durableFeedPersistOperationLabel, "upsert-select-single");
assert.equal(f10PersistencePayload.durableFeedPersistFailureBucketLabel, "none");
assert.equal(f10PersistencePayload.durableFeedRowsTouchedCount, 1);
assert.equal(f10PersistencePayload.durableFeedReadbackLabel, "readback-ready");
assert.equal(f10PersistencePayload.feedDisplayRowCount, 2);
assert.equal(f10PersistencePayload.sourceAttributionAvailabilityLabel, "available");
assert.equal(f10PersistencePayload.pass, true);
assertNoRawStreamLeak(f10PersistencePayload, "F10 persistence payload");

const missingFinalJson = runWrapper(["--run-contract-fixture", "stdout-no-final-json"]);
assert.equal(missingFinalJson.status, 2, "stdout without final JSON fails closed");
assert.equal(missingFinalJson.stderr, "", "failed parse still does not print raw child stderr");
const missingFinalJsonPayload = parseJson(missingFinalJson.stdout);
assert.equal(missingFinalJsonPayload.status, "blocked-pl-g3-sanitized-wrapper-summary");
assert.equal(missingFinalJsonPayload.stdoutFinalJsonParsed, false);
assert.equal(missingFinalJsonPayload.unavailableReason, "stdout-final-json-parse-failed");
assert.equal(missingFinalJsonPayload.pass, false);
assertNoRawStreamLeak(missingFinalJsonPayload, "missing final JSON payload");

const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);

for (const [label, source] of [
  [completionDocPath, completionDoc],
  [readyPreflightPath, readyPreflight],
  [taskPath, task]
]) {
  assert.match(
    source,
    /stdout(?: and|\/)stderr separated capture|captures node stdout and stderr separately|stdout final JSON/i,
    `${label} records separated stdout/stderr wrapper boundary`
  );
  assert.match(
    source,
    /counts-source-UI evidence|counts, source-attribution, and browser-visible UI\/feed evidence/i,
    `${label} keeps PL-G3 counts/source/UI evidence blocked until approved execution`
  );
  assert.match(source, /public-release capable(?: label)?: no/i, `${label} keeps public release blocked`);
  assert.match(
    source,
    /feed persistence path[\s\S]*not-run-direct-provider-execution-harness/i,
    `${label} records the direct provider harness feed persistence diagnostic label`
  );
}

console.log("comment translator Free beta PL-G3 sanitized wrapper after PR #533 contract checks passed");
