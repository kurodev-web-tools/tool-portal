#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const argSet = new Set(args);
const wrapperApprovalFlag = "--approved-pl-g3-sanitized-wrapper-after-pr533";
const maxCapturedBytes = 1024 * 1024;

function writeJson(payload, exitCode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
}

function readOptionValue(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] ?? "" : "";
}

function createBaseSummary(overrides = {}) {
  return {
    status: "blocked-pl-g3-sanitized-wrapper-summary",
    commandLabel: "pl-g3-provider-harness-reviewed-command",
    childExitStatusLabel: "not-run",
    stdoutFinalJsonParsed: false,
    stderrCaptureLabel: "absent",
    providerHarnessStatusLabel: "unavailable",
    liveProviderExecutionLabel: "unavailable",
    providerTargetLookupLabel: "unavailable",
    liveChatPollingLabel: "unavailable",
    translationProviderExecutionLabel: "unavailable",
    returnedCount: 0,
    eligibleCount: 0,
    providerRequestCount: 0,
    providerCallCount: 0,
    translatedCount: 0,
    skippedCount: 0,
    languagePolicySkippedCount: 0,
    perMinuteSkippedCount: 0,
    providerUnavailableSkippedCount: 0,
    recoverableErrorCount: 0,
    terminalErrorCount: 0,
    terminalErrorCodeCounts: createEmptyTerminalErrorCodeCounts(),
    dominantTerminalErrorCodeLabel: "none",
    providerConfigPresenceLabel: "unavailable",
    providerRouteAvailabilityLabel: "unavailable",
    feedPersistencePathLabel: "unavailable",
    stopReasonLabel: "unavailable",
    sourceAttributionLabel: "unavailable",
    sourceAttributionAvailabilityLabel: "unavailable",
    publicGateStateLabel: "unchanged / blocked",
    publicReleaseCapableLabel: "no",
    pass: false,
    unavailableReason: "not-run",
    ...overrides
  };
}

function childExitStatusLabel(result) {
  if (typeof result.exitCode === "number") {
    return `exit-${result.exitCode}`;
  }
  return result.signal ? "signal-terminated" : "exit-unknown";
}

function stderrCaptureLabel(stderr) {
  return stderr.trim().length > 0 ? "captured-separate-not-parsed" : "absent";
}

function parseFinalJsonFromStdout(stdout) {
  const source = stdout.trim();
  if (!source) {
    return { ok: false, value: null };
  }

  for (let index = source.lastIndexOf("{"); index >= 0; index = source.lastIndexOf("{", index - 1)) {
    try {
      const parsed = JSON.parse(source.slice(index));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ok: true, value: parsed };
      }
    } catch {
      // Keep scanning for the root object of a pretty-printed final JSON payload.
    }
  }

  return { ok: false, value: null };
}

function projectAllowedSanitizedSummary({ childResult, parsedPayload, commandLabel }) {
  const parsed = parseFinalJsonFromStdout(childResult.stdout);
  if (!parsed.ok) {
    return createBaseSummary({
      commandLabel,
      childExitStatusLabel: childExitStatusLabel(childResult),
      stderrCaptureLabel: stderrCaptureLabel(childResult.stderr),
      unavailableReason: "stdout-final-json-parse-failed"
    });
  }

  const payload = parsedPayload ?? parsed.value;
  const evidence = asRecord(payload.evidence);
  const childExitLabel = childExitStatusLabel(childResult);
  const childExitedCleanly = childResult.exitCode === 0;
  const providerHarnessStatusLabel = safeLabel(payload.status);
  const sourceAttributionLabel = safeLabel(evidence.sourceAttributionLabel ?? payload.sourceAttributionLabel);
  const terminalErrorCodeCounts = readTerminalErrorCodeCounts(evidence.terminalErrorCodeCounts ?? payload.terminalErrorCodeCounts);
  const terminalErrorCount = readCount(evidence.terminalErrorCount ?? payload.terminalErrorCount);
  const providerRequestCount = readCount(evidence.providerRequestCount ?? payload.providerRequestCount);
  const providerCallCount = readCount(evidence.providerCallCount ?? payload.providerCallCount);
  const translationProviderExecutionLabel = safeLabel(evidence.translationProviderExecution ?? payload.translationProviderExecution);
  const pass =
    childExitedCleanly &&
    providerHarnessStatusLabel === "task-27-live-provider-smoke-sanitized-result" &&
    safeLabel(payload.outputPolicy) === "sanitized-metadata-only";

  return createBaseSummary({
    status: pass ? "pl-g3-sanitized-wrapper-summary" : "blocked-pl-g3-sanitized-wrapper-summary",
    commandLabel,
    childExitStatusLabel: childExitLabel,
    stdoutFinalJsonParsed: true,
    stderrCaptureLabel: stderrCaptureLabel(childResult.stderr),
    providerHarnessStatusLabel,
    liveProviderExecutionLabel: safeLabel(payload.liveProviderExecution),
    providerTargetLookupLabel: safeLabel(evidence.providerTargetLookup ?? payload.providerTargetLookup),
    liveChatPollingLabel: safeLabel(evidence.liveChatPollingSmoke ?? payload.liveChatPollingSmoke),
    translationProviderExecutionLabel,
    returnedCount: readCount(evidence.returnedItemCount ?? payload.returnedCount),
    eligibleCount: readCount(evidence.eligibleCommentCount ?? payload.eligibleCount),
    providerRequestCount,
    providerCallCount,
    translatedCount: readCount(evidence.translatedCount ?? payload.translatedCount),
    skippedCount: readCount(evidence.skippedCount ?? payload.skippedCount),
    languagePolicySkippedCount: readCount(evidence.languagePolicySkippedCount ?? payload.languagePolicySkippedCount),
    perMinuteSkippedCount: readCount(evidence.perMinuteSkippedCount ?? payload.perMinuteSkippedCount),
    providerUnavailableSkippedCount: readCount(evidence.providerUnavailableSkippedCount ?? payload.providerUnavailableSkippedCount),
    recoverableErrorCount: readCount(evidence.recoverableErrorCount ?? payload.recoverableErrorCount),
    terminalErrorCount,
    terminalErrorCodeCounts,
    dominantTerminalErrorCodeLabel: dominantTerminalErrorCodeLabel(terminalErrorCodeCounts),
    providerConfigPresenceLabel: providerConfigPresenceLabel({ terminalErrorCodeCounts, terminalErrorCount }),
    providerRouteAvailabilityLabel: providerRouteAvailabilityLabel({
      translationProviderExecutionLabel,
      providerRequestCount,
      providerCallCount
    }),
    feedPersistencePathLabel: safeLabel(
      evidence.feedPersistencePathLabel ?? payload.feedPersistencePathLabel,
      "not-run-direct-provider-execution-harness"
    ),
    stopReasonLabel: safeLabel(evidence.stopReason ?? payload.stopReason, "none"),
    sourceAttributionLabel,
    sourceAttributionAvailabilityLabel: resolveSourceAttributionAvailabilityLabel({
      sourceAttributionLabel,
      explicitLabel: evidence.sourceAttributionAvailabilityLabel ?? payload.sourceAttributionAvailabilityLabel
    }),
    pass,
    unavailableReason: pass ? "none" : childExitedCleanly ? "provider-harness-summary-not-passing" : "child-exit-nonzero"
  });
}

async function runChild({ command, childArgs, commandLabel, env = process.env }) {
  return await new Promise((resolve) => {
    const child = spawn(command, childArgs, {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let captureOverflow = false;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > maxCapturedBytes) {
        captureOverflow = true;
        child.kill();
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > maxCapturedBytes) {
        captureOverflow = true;
        child.kill();
      }
    });

    child.on("error", () => {
      resolve({
        commandLabel,
        exitCode: null,
        signal: null,
        stdout: "",
        stderr: ""
      });
    });

    child.on("close", (exitCode, signal) => {
      resolve({
        commandLabel,
        exitCode: captureOverflow ? null : exitCode,
        signal: captureOverflow ? "capture-overflow" : signal,
        stdout: captureOverflow ? "" : stdout,
        stderr: captureOverflow ? "" : stderr
      });
    });
  });
}

function createFixtureChild(fixtureName) {
  const fixtureScripts = {
    "mixed-stderr-final-json": `
      process.stderr.write("operator stderr warning: continue with sanitized review only\\n");
      process.stdout.write(JSON.stringify({
        status: "task-27-live-provider-smoke-sanitized-result",
        outputPolicy: "sanitized-metadata-only",
        liveProviderExecution: "approved-bounded-execution",
        evidence: {
          providerTargetLookup: "executed-presence-only",
          liveChatPollingSmoke: "executed-bounded-readonly-one-step",
          translationProviderExecution: "executed-server-only-provider",
          returnedItemCount: 3,
          eligibleCommentCount: 2,
          providerRequestCount: 1,
          providerCallCount: 1,
          translatedCount: 1,
          skippedCount: 1,
          languagePolicySkippedCount: 0,
          perMinuteSkippedCount: 0,
          providerUnavailableSkippedCount: 1,
          recoverableErrorCount: 1,
          terminalErrorCount: 0,
          stopReason: null,
          sourceAttributionLabel: "youtube-live-chat"
        }
      }, null, 2) + "\\n");
    `,
    "stderr-json-noise": `
      process.stderr.write(JSON.stringify({
        status: "stderr-json-count-999",
        evidence: { returnedItemCount: 999, translatedCount: 999 }
      }) + "\\n");
      process.stdout.write(JSON.stringify({
        status: "task-27-live-provider-smoke-sanitized-result",
        outputPolicy: "sanitized-metadata-only",
        liveProviderExecution: "approved-bounded-execution",
        evidence: {
          providerTargetLookup: "executed-presence-only",
          liveChatPollingSmoke: "executed-bounded-readonly-one-step",
          translationProviderExecution: "executed-server-only-provider",
          returnedItemCount: 4,
          eligibleCommentCount: 4,
          providerRequestCount: 1,
          providerCallCount: 1,
          translatedCount: 4,
          skippedCount: 0,
          languagePolicySkippedCount: 0,
          perMinuteSkippedCount: 0,
          providerUnavailableSkippedCount: 0,
          recoverableErrorCount: 0,
          terminalErrorCount: 0,
          stopReason: null,
          sourceAttributionLabel: "youtube-live-chat"
        }
      }, null, 2) + "\\n");
    `,
    "provider-unavailable-skip-reasons": `
      process.stdout.write(JSON.stringify({
        status: "task-27-live-provider-smoke-sanitized-result",
        outputPolicy: "sanitized-metadata-only",
        liveProviderExecution: "approved-bounded-execution",
        evidence: {
          providerTargetLookup: "executed-presence-only",
          liveChatPollingSmoke: "executed-bounded-readonly-one-step",
          translationProviderExecution: "executed-server-only-provider",
          returnedItemCount: 3,
          eligibleCommentCount: 3,
          providerRequestCount: 3,
          providerCallCount: 3,
          translatedCount: 0,
          skippedCount: 3,
          languagePolicySkippedCount: 0,
          perMinuteSkippedCount: 0,
          providerUnavailableSkippedCount: 3,
          recoverableErrorCount: 0,
          terminalErrorCount: 3,
          terminalErrorCodeCounts: {
            invalidRequest: 0,
            unsupportedLanguage: 0,
            providerNotConfigured: 0,
            credentialMissing: 3,
            policyBlocked: 0
          },
          stopReason: null
        }
      }, null, 2) + "\\n");
    `,
    "stdout-no-final-json": `
      process.stderr.write("operator stderr warning: stdout has no JSON\\n");
      process.stdout.write("stdout raw progress without a final JSON object\\n");
    `
  };

  return {
    command: process.execPath,
    childArgs: ["--eval", fixtureScripts[fixtureName] ?? fixtureScripts["stdout-no-final-json"]],
    commandLabel: "pl-g3-provider-harness-contract-fixture"
  };
}

function createReviewedProviderHarnessChild() {
  return {
    command: process.execPath,
    childArgs: [
      "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
      "--execute",
      "--approved-private-gated-live-provider-smoke",
      "--use-operator-local-runtime-adapters",
      "--operator-local-ready-preflight-reviewed"
    ],
    commandLabel: "pl-g3-provider-harness-reviewed-command"
  };
}

async function main() {
  if (argSet.has("--check-env-only")) {
    writeJson(
      createBaseSummary({
        status: "ready-for-pl-g3-sanitized-wrapper-after-pr533",
        unavailableReason: "none"
      }),
      0
    );
    return;
  }

  if (argSet.has("--print-exact-command-review")) {
    writeJson(
      createBaseSummary({
        status: "ready-for-pl-g3-sanitized-wrapper-exact-command-review",
        unavailableReason: "none"
      }),
      0
    );
    return;
  }

  let childCommand;
  if (argSet.has("--run-contract-fixture")) {
    childCommand = createFixtureChild(readOptionValue("--run-contract-fixture"));
  } else {
    if (!argSet.has("--execute") || !argSet.has(wrapperApprovalFlag) || !argSet.has("--reviewed-provider-harness-child")) {
      writeJson(
        createBaseSummary({
          unavailableReason: "missing-execute-approval-or-reviewed-child-flag"
        }),
        2
      );
      return;
    }
    childCommand = createReviewedProviderHarnessChild();
  }

  const childResult = await runChild(childCommand);
  const summary = projectAllowedSanitizedSummary({
    childResult,
    commandLabel: childCommand.commandLabel
  });
  writeJson(summary, summary.pass ? 0 : 2);
}

await main();

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readCount(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}

function readTerminalErrorCodeCounts(value) {
  const record = asRecord(value);
  return {
    invalidRequest: readCount(record.invalidRequest),
    unsupportedLanguage: readCount(record.unsupportedLanguage),
    providerNotConfigured: readCount(record.providerNotConfigured),
    credentialMissing: readCount(record.credentialMissing),
    policyBlocked: readCount(record.policyBlocked)
  };
}

function createEmptyTerminalErrorCodeCounts() {
  return readTerminalErrorCodeCounts(null);
}

function dominantTerminalErrorCodeLabel(counts) {
  const labels = [
    ["credential-missing", counts.credentialMissing],
    ["provider-not-configured", counts.providerNotConfigured],
    ["unsupported-language", counts.unsupportedLanguage],
    ["invalid-request", counts.invalidRequest],
    ["policy-blocked", counts.policyBlocked]
  ];
  const [label, count] = labels.reduce((current, candidate) => (candidate[1] > current[1] ? candidate : current), ["none", 0]);
  return count > 0 ? label : "none";
}

function providerConfigPresenceLabel({ terminalErrorCodeCounts, terminalErrorCount }) {
  if (terminalErrorCodeCounts.credentialMissing > 0) {
    return "missing-credential";
  }
  if (terminalErrorCodeCounts.providerNotConfigured > 0) {
    return "provider-config-rejected";
  }
  return terminalErrorCount > 0 ? "not-implicated-by-terminal-label" : "unavailable";
}

function providerRouteAvailabilityLabel({ translationProviderExecutionLabel, providerRequestCount, providerCallCount }) {
  if (translationProviderExecutionLabel === "executed-server-only-provider" && providerRequestCount > 0 && providerCallCount > 0) {
    return "route-available-provider-reached";
  }
  if (translationProviderExecutionLabel === "executed-server-only-provider" && providerRequestCount > 0) {
    return "route-available-provider-not-called";
  }
  return "unavailable";
}

function safeLabel(value, fallback = "unavailable") {
  if (value === null && fallback === "none") {
    return "none";
  }
  if (typeof value !== "string" || value.length === 0 || value.length > 100) {
    return fallback;
  }
  if (!/^[a-z0-9][a-z0-9 _./-]*$/i.test(value)) {
    return fallback;
  }
  return value;
}

function resolveSourceAttributionAvailabilityLabel({ sourceAttributionLabel, explicitLabel }) {
  const allowedExplicitLabel = safeLabel(explicitLabel);
  if (
    allowedExplicitLabel === "available" ||
    allowedExplicitLabel === "not-produced-by-provider-harness" ||
    allowedExplicitLabel === "requires-ui-feed-confirmation"
  ) {
    return allowedExplicitLabel;
  }
  return sourceAttributionLabel === "unavailable" ? "not-produced-by-provider-harness" : "available";
}
