import assert from "node:assert/strict";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const runnerPath = path.join(
  process.cwd(),
  "scripts",
  "lib",
  "comment-translator-paid-core-v1-gate1-cli-runner.cjs"
);
const integrationSource = fs.readFileSync(
  path.join(process.cwd(), "scripts", "comment-translator-paid-core-v1-gate1-database-integration-contract.mjs"),
  "utf8"
);
const runnerSource = fs.readFileSync(runnerPath, "utf8");
assert.equal(fs.existsSync(runnerPath), true, "bounded CLI runner exists");
const runner = (await import(pathToFileURL(runnerPath))).default;
assert.equal(typeof runner.createCliOutputCollector, "function", "bounded collector is exported");
assert.equal(typeof runner.createBridgeAssertionStreamMatcher, "function", "stream matcher is exported");
assert.equal(runner.bridgeAssertionAllowlistSize, 18, "all bridge assertions are allowlisted");
assert.equal(typeof runner.bridgeAssertionCodeForHash, "function", "bridge assertion hash lookup is exported");
assert.match(runnerSource, /if\s*\(childExitObserved\s*&&\s*!childClosed\)/, "timeout does not kill an already-exited child before close");
assert.match(runnerSource, /finish\(1, childSignal, false, true\)/, "exit-before-close race returns termination unknown");

function createInjectedRunner({ taskkillResult = { status: 0, stdout: "", stderr: "" } } = {}) {
  const timers = [];
  const taskkillCalls = [];
  const spawnCalls = [];
  const output = [];
  const inputStream = new EventEmitter();
  inputStream.unpipe = () => {};
  inputStream.destroy = () => { inputStream.destroyed = true; };
  inputStream.unref = () => {};
  inputStream.pipe = (destination) => {
    inputStream.destination = destination;
    return destination;
  };
  const makeStream = () => {
    const stream = new EventEmitter();
    stream.unpipe = () => {};
    stream.destroy = () => { stream.destroyed = true; };
    stream.unref = () => {};
    return stream;
  };
  const child = new EventEmitter();
  child.pid = 43123;
  child.stdin = makeStream();
  child.stdin.end = () => { child.stdinEnded = true; };
  child.stdout = makeStream();
  child.stderr = makeStream();
  child.unref = () => {};
  const fakeSpawn = (command, args, options) => {
    spawnCalls.push({ command, args, options });
    return child;
  };
  const fakeSpawnSync = (command, args, options) => {
    taskkillCalls.push({ command, args, options });
    return typeof taskkillResult === "function" ? taskkillResult(command, args, options) : taskkillResult;
  };
  const fakeSetTimeout = (callback, delay) => {
    const timer = { callback, delay, cleared: false, unref() {} };
    timers.push(timer);
    return timer;
  };
  const fakeClearTimeout = (timer) => {
    if (timer) timer.cleared = true;
  };
  const fireTimer = (delay) => {
    const timer = timers.find((candidate) => candidate.delay === delay && !candidate.cleared);
    assert.ok(timer, `injected timer ${delay}ms is pending`);
    timer.cleared = true;
    timer.callback();
  };
  const fakeProcess = {
    platform: "win32",
    env: { SystemRoot: "C:\\Windows" },
    stdout: { write: (value) => { output.push(String(value)); return true; } },
    cwd: () => process.cwd()
  };
  const fakeFs = { ...fs, createReadStream: () => inputStream };
  const fakeChildProcess = { spawn: fakeSpawn, spawnSync: fakeSpawnSync };
  const fakeRequire = (specifier) => {
    if (specifier === "node:child_process") return fakeChildProcess;
    if (specifier === "node:crypto") return crypto;
    if (specifier === "node:fs") return fakeFs;
    if (specifier === "node:path") return path;
    if (specifier === "node:string_decoder") return { StringDecoder };
    throw new Error(`unexpected injected require: ${specifier}`);
  };
  fakeRequire.main = {};
  const transformedSource = runnerSource.replace(
    "module.exports = {\n    bridgeAssertionAllowlistSize:",
    "module.exports = {\n    runConfiguredCli,\n    bridgeAssertionAllowlistSize:"
  );
  assert.notEqual(transformedSource, runnerSource, "test seam exports the existing runner entrypoint only inside the VM");
  const runnerModule = { exports: {} };
  vm.runInNewContext(transformedSource, {
    Buffer,
    clearTimeout: fakeClearTimeout,
    module: runnerModule,
    process: fakeProcess,
    require: fakeRequire,
    setTimeout: fakeSetTimeout
  }, { filename: runnerPath });
  return {
    runner: runnerModule.exports,
    child,
    fireTimer,
    inputStream,
    output,
    spawnCalls,
    taskkillCalls,
    timers
  };
}

function injectedReceipt(harness) {
  assert.equal(harness.output.length, 1, "runner emits one receipt");
  return JSON.parse(harness.output[0]);
}

function runInjectedRunnerScenario({ taskkillResult, configure = {}, drive }) {
  const harness = createInjectedRunner({ taskkillResult });
  harness.runner.runConfiguredCli({
    command: "owned-node",
    args: [],
    cwd: process.cwd(),
    shell: false,
    preserveStdout: false,
    ...configure
  });
  drive(harness);
  return { harness, receipt: injectedReceipt(harness) };
}

const injectedNormalClose = runInjectedRunnerScenario({
  drive: ({ child }) => child.emit("close", 0, null)
});
assert.equal(injectedNormalClose.receipt.status, 0);
assert.equal(injectedNormalClose.receipt.terminationConfirmed, true);
assert.equal(injectedNormalClose.receipt.timedOut, false);
assert.equal(injectedNormalClose.harness.taskkillCalls.length, 0);
assert.equal(injectedNormalClose.harness.spawnCalls[0].options.shell, false);
assert.equal(injectedNormalClose.harness.timers.every(({ cleared }) => cleared), true, "normal close clears its timer");

const injectedTimeoutClose = runInjectedRunnerScenario({
  configure: { timeoutMs: 50 },
  drive: ({ child, fireTimer, taskkillCalls }) => {
    fireTimer(50);
    assert.equal(taskkillCalls.length, 1);
    child.emit("close", 1, "SIGTERM");
  }
});
assert.equal(injectedTimeoutClose.receipt.status, 1);
assert.equal(injectedTimeoutClose.receipt.terminationConfirmed, true, "kill success plus close confirms timeout termination");
assert.equal(injectedTimeoutClose.receipt.timedOut, true);
assert.match(injectedTimeoutClose.harness.taskkillCalls[0].command, /System32[\\/]taskkill\.exe$/i);
assert.deepEqual(Array.from(injectedTimeoutClose.harness.taskkillCalls[0].args), ["/PID", "43123", "/T", "/F"]);
assert.equal(injectedTimeoutClose.harness.taskkillCalls[0].options.shell, false);
assert.equal(injectedTimeoutClose.harness.taskkillCalls[0].options.timeout, 10000);
assert.equal(injectedTimeoutClose.harness.timers.every(({ cleared }) => cleared), true, "confirmed timeout clears all timers");

const injectedTaskkillSuccessWithoutClose = runInjectedRunnerScenario({
  taskkillResult: { status: 0, stdout: "", stderr: "" },
  configure: { timeoutMs: 50 },
  drive: ({ fireTimer, taskkillCalls }) => {
    fireTimer(50);
    assert.equal(taskkillCalls.length, 1, "successful taskkill is attempted once");
    fireTimer(10000);
  }
});
assert.equal(
  injectedTaskkillSuccessWithoutClose.receipt.terminationConfirmed,
  false,
  "successful taskkill without child close remains termination-unknown after the 10s grace timer"
);
assert.equal(injectedTaskkillSuccessWithoutClose.receipt.timedOut, true);
assert.equal(injectedTaskkillSuccessWithoutClose.receipt.errorCode, "CLI_TIMEOUT");
assert.equal(injectedTaskkillSuccessWithoutClose.harness.child.stdout.destroyed, true);
assert.equal(injectedTaskkillSuccessWithoutClose.harness.child.stderr.destroyed, true);

const injectedKillFailure = runInjectedRunnerScenario({
  taskkillResult: { status: 1, stdout: "", stderr: "" },
  configure: { timeoutMs: 50 },
  drive: ({ fireTimer }) => {
    fireTimer(50);
    fireTimer(10000);
  }
});
assert.equal(injectedKillFailure.receipt.status, 1);
assert.equal(injectedKillFailure.receipt.terminationConfirmed, false, "kill failure cannot confirm termination");
assert.equal(injectedKillFailure.receipt.timedOut, true);
assert.equal(injectedKillFailure.receipt.errorCode, "CLI_TREE_TERMINATION_FAILED");
assert.equal(injectedKillFailure.harness.child.stdout.destroyed, true, "unknown termination destroys stdout");
assert.equal(injectedKillFailure.harness.child.stderr.destroyed, true, "unknown termination destroys stderr");

const injectedExitBeforeClose = runInjectedRunnerScenario({
  configure: { timeoutMs: 50 },
  drive: ({ child, fireTimer, taskkillCalls }) => {
    child.emit("exit", 0, null);
    fireTimer(50);
    assert.equal(taskkillCalls.length, 0, "exit-before-close does not taskkill the old PID");
  }
});
assert.equal(injectedExitBeforeClose.receipt.status, 1);
assert.equal(injectedExitBeforeClose.receipt.terminationConfirmed, false);
assert.equal(injectedExitBeforeClose.receipt.timedOut, true);
assert.equal(injectedExitBeforeClose.receipt.errorCode, "CLI_TREE_TERMINATION_UNKNOWN");

const injectedInputError = runInjectedRunnerScenario({
  configure: { inputFile: "owned-input.sql" },
  drive: ({ child, inputStream }) => {
    inputStream.emit("error", Object.assign(new Error("synthetic input failure"), { code: "EIO" }));
    child.emit("close", 1, "SIGTERM");
  }
});
assert.equal(injectedInputError.receipt.status, 1);
assert.equal(injectedInputError.receipt.terminationConfirmed, true, "input error kill plus close confirms termination");
assert.equal(injectedInputError.receipt.timedOut, false);
assert.equal(injectedInputError.receipt.errorCode, "CLI_INPUT_FILE_ERROR");
assert.equal(injectedInputError.harness.inputStream.destroyed, true, "input error closes the input stream");

assert.match(
  integrationSource,
  /structuredStdout: cliNeedsStructuredStdout\(args\),/,
  "structured CLI output receives the bounded structured stdout limit"
);

const bridgeSource = fs.readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql"),
  "utf8"
);
const expectedBridgeAssertions = new Map([
  [477, "BRIDGE_STATE_INVALID"],
  [481, "PAID_CRON_CATALOG_UNAVAILABLE"],
  [484, "PAID_CRON_JOB_PRESENT"],
  [490, "BRIDGE_CANONICAL_STATE_MISMATCH"],
  [496, "BRIDGE_CLEAN_STATE_MISMATCH"],
  [500, "BRIDGE_LEGACY_ARCHIVE_PRESENT"],
  [509, "BRIDGE_LEGACY_OWNER_DRIFT"],
  [518, "BRIDGE_LEGACY_DEPENDENCY_DRIFT"],
  [565, "BRIDGE_ARCHIVE_TABLE_COUNT_MISMATCH"],
  [572, "BRIDGE_ARCHIVE_FUNCTION_COUNT_MISMATCH"],
  [583, "BRIDGE_ARCHIVE_EXTRA_OBJECT"],
  [588, "BRIDGE_ARCHIVE_FORBIDDEN_FUNCTION"],
  [591, "BRIDGE_ARCHIVE_ENTITLEMENT_ROWS_NONZERO"],
  [593, "BRIDGE_ARCHIVE_USAGE_COUNTER_ROWS_NONZERO"],
  [595, "BRIDGE_ARCHIVE_USAGE_EVENT_ROWS_NONZERO"],
  [603, "BRIDGE_ARCHIVE_RLS_DRIFT"],
  [616, "BRIDGE_ARCHIVE_TRIGGER_DRIFT"],
  [641, "BRIDGE_ARCHIVE_ACL_DRIFT"]
]);
for (const [lineNumber, assertionCode] of expectedBridgeAssertions) {
  const line = bridgeSource.split(/\r?\n/)[lineNumber - 1];
  const match = line.match(/raise\s+exception\s+'((?:''|[^'])*)'/i);
  assert.ok(match, `bridge assertion source line ${lineNumber} exists`);
  const message = match[1].replace(/''/g, "'");
  const hash = crypto.createHash("sha256").update(message, "utf8").digest("hex");
  assert.equal(runner.bridgeAssertionCodeForHash(hash), assertionCode, `bridge assertion ${lineNumber} is exact-allowlisted`);

  const assertionOutput = runner.createCliOutputCollector({ preserveStdout: false });
  assertionOutput.write("stderr", Buffer.from(`ERROR:  ${message}\nSQL state: P0001\n`, "utf8"));
  const captured = assertionOutput.finish();
  assert.equal(captured.diagnostics.bridgeAssertionCode, assertionCode);
  assert.equal(captured.diagnostics.bridgeAssertionInputCount, 1);
  assert.equal(captured.diagnostics.bridgeAssertionAllowlistMatch, true);
  assert.doesNotMatch(JSON.stringify(captured), /ERROR:\s|SQL state:/);
}
assert.equal(runner.bridgeAssertionCodeForHash("0".repeat(64)), null, "unknown assertion hash is not allowlisted");

const splitSourceLine = bridgeSource.split(/\r?\n/)[480];
const splitSourceMatch = splitSourceLine.match(/raise\s+exception\s+'((?:''|[^'])*)'/i);
const splitSourceMessage = splitSourceMatch[1].replace(/''/g, "'");
const splitAt = Math.max(1, Math.floor(splitSourceMessage.length / 2));
const splitCollector = runner.createCliOutputCollector({ preserveStdout: false });
splitCollector.write("stderr", Buffer.from(`ERROR:  ${splitSourceMessage.slice(0, splitAt)}`, "utf8"));
splitCollector.write(
  "stderr",
  Buffer.from(`${splitSourceMessage.slice(splitAt)}\nSQL state: P0001\n`, "utf8")
);
const splitCaptured = splitCollector.finish();
assert.equal(splitCaptured.diagnostics.bridgeAssertionInputCount, 1);
assert.equal(splitCaptured.diagnostics.bridgeAssertionAllowlistMatch, true);

const prefixedCollector = runner.createCliOutputCollector({ preserveStdout: false });
prefixedCollector.write("stderr", Buffer.from("\u001b[31mSupabase CLI: psql: er", "utf8"));
prefixedCollector.write(
  "stderr",
  Buffer.from(`ror:\u001b[0m \u0007${splitSourceMessage}\u001b[0m\nSQL state: P0001\n`, "utf8")
);
const prefixedCaptured = prefixedCollector.finish();
assert.equal(prefixedCaptured.diagnostics.bridgeAssertionCode, "PAID_CRON_CATALOG_UNAVAILABLE");
assert.equal(prefixedCaptured.diagnostics.bridgeAssertionInputCount, 1);
assert.equal(prefixedCaptured.diagnostics.bridgeAssertionAllowlistMatch, true);

const streamMatcher = runner.createBridgeAssertionStreamMatcher([
  { message: splitSourceMessage, code: "PAID_CRON_CATALOG_UNAVAILABLE" }
]);
streamMatcher.write(Buffer.from(`\u001b[31mSupabase CLI: psql: error:  \u0007${splitSourceMessage.slice(0, splitAt)}`, "utf8"));
streamMatcher.write(Buffer.from(`${splitSourceMessage.slice(splitAt)}\u001b[0m`, "utf8"));
const streamMatch = streamMatcher.finish();
assert.equal(streamMatch.bridgeAssertionCode, "PAID_CRON_CATALOG_UNAVAILABLE");
assert.equal(streamMatch.bridgeAssertionInputCount, 1);
assert.equal(streamMatch.bridgeAssertionAllowlistMatch, true);
assert.doesNotMatch(JSON.stringify(streamMatch), /PAID_CRON_CATALOG_UNAVAILABLE.*message/);

const nonRetainingCollector = runner.createCliOutputCollector({
  preserveStdout: true,
  retainOutput: false
});
nonRetainingCollector.write("stderr", Buffer.from("ERROR: hidden stderr marker\n", "utf8"));
const nonRetained = nonRetainingCollector.finish();
assert.equal(nonRetained.stdout, "");
assert.doesNotMatch(JSON.stringify(nonRetained), /hidden stderr marker/);

const collector = runner.createCliOutputCollector({ preserveStdout: false, ringBytes: 128 });
collector.write(
  "stderr",
  Buffer.from([
    "Applying migration 20260904000000_comment_translator_paid_gate1_a3_canonical_convergence.sql\n",
    "ERROR:  relation \"cron.job\" does not exist\n",
    "SQL state: 42P01\n",
    "select secret_payload from private.unrelated_source;\n"
  ].join(""))
);
const failure = collector.finish();
assert.equal(failure.diagnostics.lastErrorClass, "MISSING_RELATION");
assert.deepEqual(failure.diagnostics.sqlStates, ["42P01"]);
assert.deepEqual(
  failure.diagnostics.migrationBasenames,
  ["20260904000000_comment_translator_paid_gate1_a3_canonical_convergence.sql"]
);
assert.equal(
  failure.diagnostics.lastMigrationBasename,
  "20260904000000_comment_translator_paid_gate1_a3_canonical_convergence.sql"
);
assert.deepEqual(failure.diagnostics.migrationVersions, ["20260904000000"]);
assert.deepEqual(failure.diagnostics.missingRelationIdentities, ["cron.job"]);
assert.equal(failure.diagnostics.stderrBytes > 0, true);
assert.equal(failure.diagnostics.stderrTruncated, true);
assert.equal(Object.prototype.hasOwnProperty.call(failure, "stderr"), false);
assert.doesNotMatch(JSON.stringify(failure), /secret_payload|unrelated_source/);

const injected = runner.createCliOutputCollector({ preserveStdout: false });
injected.write("stderr", Buffer.from("ERROR: gate1-atomicity-test\n"));
assert.equal(injected.finish().diagnostics.injectedAtomicityFailure, true);

const userRaised = runner.createCliOutputCollector({ preserveStdout: false });
userRaised.write(
  "stderr",
  Buffer.from("ERROR: bridge assertion failed for a canonical relation\nSQL state: P0001\n")
);
const userRaisedFailure = userRaised.finish();
assert.equal(userRaisedFailure.diagnostics.lastErrorClass, "USER_RAISED_EXCEPTION");
assert.equal(userRaisedFailure.diagnostics.outputClass, "SQL");
assert.equal(userRaisedFailure.diagnostics.bridgeAssertionCode, "UNKNOWN_USER_RAISED_ASSERTION");
assert.equal(userRaisedFailure.diagnostics.bridgeAssertionInputCount, 1);
assert.equal(userRaisedFailure.diagnostics.bridgeAssertionAllowlistMatch, false);
assert.match(
  integrationSource,
  /USER_RAISED_EXCEPTION[\s\S]*CLI_SQL_USER_RAISED_EXCEPTION/,
  "integration diagnostics preserves the user-raised SQL failure class"
);

const bridgeAssertion = runner.createCliOutputCollector({ preserveStdout: false });
bridgeAssertion.write(
  "stderr",
  Buffer.from("ERROR: canonical state mismatch for the observed relation\nSQL state: P0001\n")
);
assert.equal(bridgeAssertion.finish().diagnostics.lastErrorClass, "BRIDGE_CANONICAL_ASSERTION");
assert.match(
  integrationSource,
  /BRIDGE_CANONICAL_ASSERTION[\s\S]*CLI_SQL_BRIDGE_CANONICAL_ASSERTION/,
  "integration diagnostics preserves the bridge canonical assertion class"
);

const jsonOutput = runner.createCliOutputCollector({ preserveStdout: true });
jsonOutput.write("stdout", Buffer.from('{"rows":[{"json_build_object":{"ok":true}}]}\n'));
const preserved = jsonOutput.finish();
assert.equal(preserved.stdout, '{"rows":[{"json_build_object":{"ok":true}}]}\n');

const structuredStdoutLimit = runner.structuredStdoutRingBytes;
assert.equal(Number.isInteger(structuredStdoutLimit), true, "structured stdout limit is an integer");
assert.equal(structuredStdoutLimit > 288709, true, "structured stdout limit contains the canonical catalog envelope");
assert.equal(structuredStdoutLimit < 4 * 1024 * 1024, true, "structured stdout limit remains below the runner maxBuffer");
const structuredPayload = JSON.stringify({ rows: [{ json_build_object: { value: "x".repeat(288000) } }] }) + "\n";
const structuredPayloadBytes = Buffer.byteLength(structuredPayload, "utf8");
assert.equal(structuredPayloadBytes > 128 * 1024, true, "structured regression payload exceeds the default ring");
assert.equal(structuredPayloadBytes < structuredStdoutLimit, true, "structured regression payload fits the explicit limit");
const structuredRunnerProcess = spawnSync(
  process.execPath,
  [runnerPath],
  {
    input: JSON.stringify({
      command: process.execPath,
      args: [
        "-e",
        "process.stdout.write(JSON.stringify({ rows: [{ json_build_object: { value: 'x'.repeat(288000) } }] }) + '\\n')"
      ],
      cwd: process.cwd(),
      shell: false,
      preserveStdout: true,
      structuredStdout: true
    }),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024
  }
);
assert.equal(structuredRunnerProcess.status, 0, "structured stdout runner completes");
const structuredRunnerPayload = JSON.parse(String(structuredRunnerProcess.stdout ?? "").trim());
assert.equal(structuredRunnerPayload.terminationConfirmed, true, "normal runner close confirms termination");
assert.equal(structuredRunnerPayload.timedOut, false, "normal runner close is not timed out");
assert.equal(structuredRunnerPayload.diagnostics.stdoutBytes, structuredPayloadBytes);
assert.equal(structuredRunnerPayload.diagnostics.stdoutTruncated, false);
assert.equal(structuredRunnerPayload.diagnostics.stdoutLimitBytes, structuredStdoutLimit);
const parsedStructuredStdout = JSON.parse(structuredRunnerPayload.stdout.trim());
assert.equal(parsedStructuredStdout.rows[0].json_build_object.value.length, 288000);

const normalFailureRunner = spawnSync(
  process.execPath,
  [runnerPath],
  {
    input: JSON.stringify({
      command: process.execPath,
      args: ["-e", "process.stderr.write('ERROR: gate1-atomicity-test\\n'); process.exit(1)"],
      cwd: process.cwd(),
      shell: false,
      preserveStdout: false
    }),
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  }
);
assert.equal(normalFailureRunner.status, 0, "normal nonzero child still emits a receipt");
const normalFailurePayload = JSON.parse(String(normalFailureRunner.stdout ?? "").trim());
assert.equal(normalFailurePayload.status, 1);
assert.equal(normalFailurePayload.terminationConfirmed, true, "normal nonzero close confirms termination");
assert.equal(normalFailurePayload.timedOut, false);
assert.equal(normalFailurePayload.captureFailure, false);
assert.equal(normalFailurePayload.diagnostics.injectedAtomicityFailure, true);

const ordinaryDiagnosticRunner = spawnSync(
  process.execPath,
  [runnerPath],
  {
    input: JSON.stringify({
      command: process.execPath,
      args: ["-e", "process.stdout.write('x'.repeat(200000))"],
      cwd: process.cwd(),
      shell: false,
      preserveStdout: false
    }),
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  }
);
assert.equal(ordinaryDiagnosticRunner.status, 0);
const ordinaryDiagnosticPayload = JSON.parse(String(ordinaryDiagnosticRunner.stdout ?? "").trim());
assert.equal(ordinaryDiagnosticPayload.status, 0);
assert.equal(ordinaryDiagnosticPayload.terminationConfirmed, true);
assert.equal(ordinaryDiagnosticPayload.captureFailure, false, "diagnostic ring truncation is not capture failure");
assert.equal(ordinaryDiagnosticPayload.diagnostics.stdoutTruncated, true);

const oversizedStructuredCollector = runner.createCliOutputCollector({
  preserveStdout: true,
  ringBytes: 256
});
oversizedStructuredCollector.write("stdout", Buffer.from(structuredPayload, "utf8"));
const oversizedStructured = oversizedStructuredCollector.finish();
assert.equal(oversizedStructured.stdout, "");
assert.equal(oversizedStructured.diagnostics.stdoutBytes, structuredPayloadBytes);
assert.equal(oversizedStructured.diagnostics.stdoutTruncated, true);
assert.equal(oversizedStructured.diagnostics.stdoutLimitBytes, 256);
assert.doesNotMatch(JSON.stringify(oversizedStructured), /xxxxxxxx/);

// Exercise the actual process transport at both limits, including discarded output.
for (const structuredStdout of [false, true]) {
  const limit = (structuredStdout ? 512 : 128) * 1024;
  for (const extra of [0, 1]) {
    const transported = spawnSync(process.execPath, [runnerPath], {
      input: JSON.stringify({
        command: process.execPath,
        args: ["-e", `process.stdout.write('x'.repeat(${limit + extra}));process.stderr.write('y'.repeat(131073));`],
        preserveStdout: true,
        structuredStdout
      }),
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024
    });
    assert.equal(transported.status, 0);
    const payload = JSON.parse(transported.stdout);
    assert.equal(payload.terminationConfirmed, true, "normal diagnostic transport confirms termination");
    assert.equal(payload.timedOut, false, "normal diagnostic transport is not timed out");
    assert.equal(payload.diagnostics.stdoutBytes, limit + extra);
    assert.equal(payload.diagnostics.stdoutLimitBytes, limit);
    assert.equal(payload.diagnostics.stdoutTruncated, extra === 1);
    assert.equal(payload.stdout.length, extra === 1 ? 0 : limit);
    assert.equal(payload.diagnostics.stderrBytes, 131073);
    assert.equal(payload.diagnostics.stderrTruncated, true, "stderr stays bounded at 128 KiB for JSON queries");
    assert.doesNotMatch(JSON.stringify(payload.diagnostics), /xxxx|yyyy/);
    assert.equal(Object.hasOwn(payload, "stderr"), false);
  }
}

const runnerInputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gate1-cli-runner-input-"));
try {
  const inputFile = path.join(runnerInputDirectory, "input.txt");
  fs.writeFileSync(inputFile, "isolated-input", "utf8");
  const childScript = "let saw=false;process.stdin.on('data',()=>{saw=true});process.stdin.on('end',()=>{if(saw)process.stderr.write('ERROR: synthetic runner input consumed\\n')});setTimeout(()=>process.exit(saw?0:2),500);";
  const runnerProcess = spawnSync(
    process.execPath,
    [runnerPath],
    {
      input: JSON.stringify({
        command: process.execPath,
        args: ["-e", childScript],
        cwd: process.cwd(),
        shell: false,
        preserveStdout: false,
        inputFile
      }),
      encoding: "utf8",
      maxBuffer: 1024 * 1024
    }
  );
  assert.equal(runnerProcess.status, 0, "runner streams inputFile and closes stdin");
  const runnerPayload = JSON.parse(String(runnerProcess.stdout ?? "").trim());
  assert.equal(runnerPayload.terminationConfirmed, true, "input transport confirms termination");
  assert.equal(runnerPayload.timedOut, false, "input transport is not timed out");
  assert.equal(runnerPayload.status, 0);
  assert.equal(runnerPayload.diagnostics.stderrBytes > 0, true);
  assert.doesNotMatch(JSON.stringify(runnerPayload), /synthetic runner input consumed/);
} finally {
  fs.rmSync(runnerInputDirectory, { recursive: true, force: true });
}

if (process.platform === "win32") {
  const timeoutDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gate1-cli-runner-timeout-"));
  let childPid = null;
  let grandchildPid = null;
  let allOwnedProcessesGone = false;
  let runnerResultPromise = null;

  const waitForReadyPid = async (filePath, timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const value = Number(fs.readFileSync(filePath, "utf8").trim());
        if (Number.isSafeInteger(value) && value > 0) return value;
      } catch {
        // The owned child has not published readiness yet.
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("OWNED_PROCESS_PID_NOT_READY");
  };

  const isPidAlive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  const waitForPidsGone = async (pids, timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (pids.every((pid) => !isPidAlive(pid))) return true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return pids.every((pid) => !isPidAlive(pid));
  };

  const awaitRunner = (runnerChild, input) => new Promise((resolve) => {
    const stdout = [];
    const stderr = [];
    runnerChild.stdout.setEncoding("utf8");
    runnerChild.stderr.setEncoding("utf8");
    runnerChild.stdout.on("data", (chunk) => stdout.push(chunk));
    runnerChild.stderr.on("data", (chunk) => stderr.push(chunk));
    const timer = setTimeout(() => {
      runnerChild.kill();
      resolve({ status: null, signal: "TEST_TIMEOUT", stdout: stdout.join(""), stderr: stderr.join("") });
    }, 25 * 1000);
    runnerChild.once("close", (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal: signal ?? "NONE", stdout: stdout.join(""), stderr: stderr.join("") });
    });
    runnerChild.stdin.end(input);
  });

  try {
    const childPidFile = path.join(timeoutDirectory, "child.pid");
    const grandchildPidFile = path.join(timeoutDirectory, "grandchild.pid");
    const goFile = path.join(timeoutDirectory, "go");
    const childScript = [
      "const { spawn } = require('node:child_process');",
      "const fs = require('node:fs');",
      `fs.writeFileSync(${JSON.stringify(childPidFile)}, String(process.pid)); const readiness = setInterval(() => { if (!fs.existsSync(${JSON.stringify(goFile)})) return; clearInterval(readiness); const grandchild = spawn(process.execPath, ['-e', ${JSON.stringify("setTimeout(() => process.exit(0), 15000)")}], { stdio: 'ignore', windowsHide: true }); fs.writeFileSync(${JSON.stringify(grandchildPidFile)}, String(grandchild.pid)); }, 10);`,
      "setTimeout(() => process.exit(0), 15000);"
    ].join(" ");
    const runnerChild = spawn(
      process.execPath,
      [runnerPath],
      {
        cwd: process.cwd(),
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      }
    );
    runnerResultPromise = awaitRunner(runnerChild, JSON.stringify({
      command: process.execPath,
      args: ["-e", childScript],
      cwd: process.cwd(),
      shell: false,
      preserveStdout: false,
      timeoutMs: 5000
    }));
    childPid = await waitForReadyPid(childPidFile, 5000);
    fs.writeFileSync(goFile, "ready", "utf8");
    grandchildPid = await waitForReadyPid(grandchildPidFile, 5000);
    const timedOutRunner = await runnerResultPromise;
    assert.equal(timedOutRunner.status, 0, "runner emits a bounded timeout receipt");
    const timeoutPayload = JSON.parse(String(timedOutRunner.stdout ?? "").trim());
    assert.equal(timeoutPayload.status === 0, false, "timeout cannot claim success");
    assert.equal(timeoutPayload.timedOut, true, "runner reports timeout");
    assert.equal(timeoutPayload.terminationConfirmed, true, "runner confirms tree termination after taskkill and close");
    allOwnedProcessesGone = await waitForPidsGone([childPid, grandchildPid], 20000);
    assert.equal(allOwnedProcessesGone, true, "both owned processes are gone before cleanup");
  } finally {
    if (runnerResultPromise) await runnerResultPromise;
    if (childPid && grandchildPid) {
      allOwnedProcessesGone = allOwnedProcessesGone || await waitForPidsGone([childPid, grandchildPid], 20000);
    }
    if (allOwnedProcessesGone) fs.rmSync(timeoutDirectory, { recursive: true, force: true });
  }
}

console.log("comment-translator-paid-core-v1-gate1 CLI diagnostics regression: PASS");
