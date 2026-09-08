const { spawn, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { StringDecoder } = require("node:string_decoder");

const defaultRingBytes = 128 * 1024;
const structuredStdoutRingBytes = 512 * 1024;
const runnerMaxBufferBytes = 4 * 1024 * 1024;
const defaultTimeoutMs = 300 * 1000;
const maxTimeoutMs = 300 * 1000;
const terminateTreeTimeoutMs = 10 * 1000;
const closeGraceTimeoutMs = 10 * 1000;
const windowsTaskkillPath = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe");
if (structuredStdoutRingBytes >= runnerMaxBufferBytes) {
  throw new Error("STRUCTURED_STDOUT_LIMIT_EXCEEDS_RUNNER_BUFFER");
}
const maxDiagnosticValues = 64;
const identifierSegmentPattern = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const bridgeAssertionCodesByHash = new Map([
  ["c6bc392d2cf1c9ddba63e1fb6b9d37c9d06e79aa9a9b37869ffe7f50e02aa875", "BRIDGE_STATE_INVALID"],
  ["ab927b9b27e4a84af56f1eb00cd4e5d4f1c6462a674e14add61ac4205e3eaaeb", "PAID_CRON_CATALOG_UNAVAILABLE"],
  ["39fccf4b480aa3da346032d967d50552fd352fe27a134672f25ceabb2117e9fb", "PAID_CRON_JOB_PRESENT"],
  ["20e178417a45f44f85deaeb95b387e4e0b6d67d75a48d7e0bd59a59c0db5b172", "BRIDGE_CANONICAL_STATE_MISMATCH"],
  ["fc35ed207b76b05afa0f588fa1de19e3479a2bc597dd574bff916e0894048fff", "BRIDGE_CLEAN_STATE_MISMATCH"],
  ["ce2100439cf4f8011fb82df0a11c51545fff26e550850a8b8b2609cf89ee688b", "BRIDGE_LEGACY_ARCHIVE_PRESENT"],
  ["eb5e56445c2131a1fee46ddb198bdb3c8ecee20796a16e41f40d28f794188ebb", "BRIDGE_LEGACY_OWNER_DRIFT"],
  ["ca8a55704828a6d74b19de4288f11330e3e247b76a30400a09d4fcbfbfabe579", "BRIDGE_LEGACY_DEPENDENCY_DRIFT"],
  ["44ed894b08b473292c328ed31f01767e60c0c4c1a10609405160497ede3c9bc8", "BRIDGE_ARCHIVE_TABLE_COUNT_MISMATCH"],
  ["0d52aec950193506149f25adc4b1aaf64556269011735fbdb3aff8c50fd3821c", "BRIDGE_ARCHIVE_FUNCTION_COUNT_MISMATCH"],
  ["6e1ca5f2978ca97a6f662b4f2c58f8c19853b34efffffd5bb4fb20abeba4f9e8", "BRIDGE_ARCHIVE_EXTRA_OBJECT"],
  ["fbdb1a90252e39072aec6222b8aeaf99a67b9779644559312107074bb95395be", "BRIDGE_ARCHIVE_FORBIDDEN_FUNCTION"],
  ["10d9496b78c982b1c6df3c90ad9f715c533b00f1eb322e8c69626d75c2c228ed", "BRIDGE_ARCHIVE_ENTITLEMENT_ROWS_NONZERO"],
  ["514dddf93f7245dfd757e3dde9f72cf1c47da8617c47c690c0c628b304a97d94", "BRIDGE_ARCHIVE_USAGE_COUNTER_ROWS_NONZERO"],
  ["8820447c12dfee4151c0c4b5d5ce4a55904c239fafd2d70f245010883d46503f", "BRIDGE_ARCHIVE_USAGE_EVENT_ROWS_NONZERO"],
  ["985b1ca2a964a6791b0d008283f05f88be29003540a8ca822cfa0eb66a59529d", "BRIDGE_ARCHIVE_RLS_DRIFT"],
  ["58d9cb29eb0d4472debdda4097cc71e454fefcfd61cfd22708df11544e0c4df7", "BRIDGE_ARCHIVE_TRIGGER_DRIFT"],
  ["0ff7acda24c05be21cb846b5e1c804181703776985d8074036baad15b749545b", "BRIDGE_ARCHIVE_ACL_DRIFT"]
]);

function bridgeAssertionCodeForHash(hash) {
  return bridgeAssertionCodesByHash.get(String(hash ?? "").toLowerCase()) ?? null;
}

function bridgeAssertionCodeForMessage(message) {
  const hash = crypto.createHash("sha256").update(String(message ?? ""), "utf8").digest("hex");
  return bridgeAssertionCodeForHash(hash);
}

function stripAnsi(value) {
  return String(value ?? "")
    .replace(/(?:\u001b\][^\u0007]*(?:\u0007|\u001b\\)|\u001b\[[0-?]*[ -/]*[@-~]|\u001b[@-_])/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function kmpFailureTable(pattern) {
  const failure = new Array(pattern.length).fill(0);
  for (let index = 1, prefix = 0; index < pattern.length;) {
    if (pattern[index] === pattern[prefix]) {
      failure[index] = prefix + 1;
      index += 1;
      prefix += 1;
    } else if (prefix > 0) {
      prefix = failure[prefix - 1];
    } else {
      index += 1;
    }
  }
  return failure;
}

function createBridgeAssertionStreamMatcher(entries = []) {
  const patterns = [];
  const seenMessages = new Set();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const message = String(entry?.message ?? "");
    const code = String(entry?.code ?? "");
    if (!message || !/^[A-Z0-9_]{1,64}$/.test(code) || seenMessages.has(message)) continue;
    seenMessages.add(message);
    patterns.push({ message, code, failure: kmpFailureTable(message), index: 0 });
  }

  const streamState = new Map();
  let bridgeAssertionCode = "NONE";
  let bridgeAssertionInputCount = 0;
  let bridgeAssertionAllowlistMatch = false;

  function stateFor(stream) {
    const key = String(stream ?? "default");
    if (!streamState.has(key)) {
      streamState.set(key, {
        decoder: new StringDecoder("utf8"),
        controlMode: "TEXT"
      });
    }
    return streamState.get(key);
  }

  function feedText(stream, text) {
    const state = stateFor(stream);
    for (const character of text) {
      if (state.controlMode === "ESC") {
        if (character === "[") state.controlMode = "CSI";
        else if (character === "]") state.controlMode = "OSC";
        else state.controlMode = "TEXT";
        continue;
      }
      if (state.controlMode === "CSI") {
        if (character >= "@" && character <= "~") state.controlMode = "TEXT";
        continue;
      }
      if (state.controlMode === "OSC") {
        if (character === "\u0007") state.controlMode = "TEXT";
        else if (character === "\u001b") state.controlMode = "OSC_ESC";
        continue;
      }
      if (state.controlMode === "OSC_ESC") {
        if (character === "\\") state.controlMode = "TEXT";
        else if (character !== "\u001b") state.controlMode = "OSC";
        continue;
      }
      if (character === "\u001b") {
        state.controlMode = "ESC";
        continue;
      }
      const codePoint = character.codePointAt(0) ?? 0;
      if (codePoint <= 0x1f || codePoint === 0x7f) continue;

      for (const pattern of patterns) {
        while (pattern.index > 0 && character !== pattern.message[pattern.index]) {
          pattern.index = pattern.failure[pattern.index - 1];
        }
        if (character === pattern.message[pattern.index]) pattern.index += 1;
        if (pattern.index === pattern.message.length) {
          if (bridgeAssertionInputCount < maxDiagnosticValues) bridgeAssertionInputCount += 1;
          if (!bridgeAssertionAllowlistMatch) bridgeAssertionCode = pattern.code;
          bridgeAssertionAllowlistMatch = true;
          pattern.index = pattern.failure[pattern.index - 1];
        }
      }
    }
  }

  function write(input, stream = "default") {
    const state = stateFor(stream);
    const chunk = Buffer.isBuffer(input) ? input : Buffer.from(String(input ?? ""), "utf8");
    feedText(stream, state.decoder.write(chunk));
  }

  function finish() {
    for (const [stream, state] of streamState) feedText(stream, state.decoder.end());
    return {
      bridgeAssertionCode,
      bridgeAssertionInputCount,
      bridgeAssertionAllowlistMatch
    };
  }

  return { write, finish };
}

function bridgeAssertionEntriesFromSource(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const entries = [];
  for (const match of source.matchAll(/raise\s+exception\s+'((?:''|[^'])*)'/gi)) {
    const message = match[1].replace(/''/g, "'");
    const code = bridgeAssertionCodeForMessage(message);
    if (code) entries.push({ message, code });
  }
  if (entries.length !== bridgeAssertionCodesByHash.size) throw Object.assign(new Error(), { code: "CLI_BRIDGE_SOURCE_ALLOWLIST_MISMATCH" });
  return entries;
}

function boundedAdd(collection, value) {
  if (!value || collection.includes(value) || collection.length >= maxDiagnosticValues) return;
  collection.push(value);
}

function normalizeIdentifier(value) {
  const source = String(value ?? "");
  const parts = [];
  let index = 0;
  while (index < source.length) {
    if (source[index] === '"') {
      index += 1;
      let segment = "";
      let closed = false;
      while (index < source.length) {
        if (source[index] === '"') {
          if (source[index + 1] === '"') {
            segment += '"';
            index += 2;
            continue;
          }
          index += 1;
          closed = true;
          break;
        }
        segment += source[index];
        index += 1;
      }
      if (!closed) return null;
      parts.push(segment);
    } else {
      const match = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_$]*/);
      if (!match) return null;
      parts.push(match[0]);
      index += match[0].length;
    }
    if (index === source.length) break;
    if (source[index] !== ".") return null;
    index += 1;
  }
  const expanded = parts.length === 1 && parts[0].includes(".")
    ? parts[0].split(".")
    : parts;
  if (expanded.length < 1 || expanded.length > 2) return null;
  return expanded.every((part) => identifierSegmentPattern.test(part))
    ? expanded.join(".")
    : null;
}

function classifyErrorLine(line) {
  if (/gate1-atomicity-test/i.test(line)) return "INJECTED_ATOMICITY_FAILURE";
  if (/canonical/i.test(line) && /state/i.test(line)) return "BRIDGE_CANONICAL_ASSERTION";
  if (/syntax error/i.test(line)) return "SYNTAX_ERROR";
  if (/\brelation\b[\s\S]*\bdoes not exist/i.test(line)) return "MISSING_RELATION";
  if (/\bfunction\b[\s\S]*\bdoes not exist/i.test(line)) return "MISSING_FUNCTION";
  if (/\bcolumn\b[\s\S]*\bdoes not exist/i.test(line)) return "MISSING_COLUMN";
  if (/\bschema\b[\s\S]*\bdoes not exist/i.test(line)) return "MISSING_SCHEMA";
  if (/\btype\b[\s\S]*\bdoes not exist/i.test(line)) return "MISSING_TYPE";
  if (/permission denied|access denied/i.test(line)) return "PERMISSION_DENIED";
  if (/duplicate key|already exists/i.test(line)) return "DUPLICATE_OBJECT";
  if (/connection refused|could not connect|not running|docker daemon|timed out|timeout/i.test(line)) {
    return "CONNECTION_ERROR";
  }
  if (/failed to apply migration|migration failed|error applying migration|psql:.*(?:error|fatal)/i.test(line)) {
    return "MIGRATION_FAILURE";
  }
  if (/address already in use|\b(?:port|bind|listen)\b/i.test(line)) return "PORT";
  if (/health|ready/i.test(line)) return "HEALTH";
  return "ERROR";
}

function createCliOutputCollector({ preserveStdout = false, ringBytes = defaultRingBytes, stderrRingBytes = ringBytes, retainOutput = true } = {}) {
  const buffers = { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  const state = {
    preserveStdout,
    retainOutput,
    ringBytes: Math.max(1, Number(ringBytes) || defaultRingBytes),
    stderrRingBytes: Math.max(1, Number(stderrRingBytes) || defaultRingBytes),
    carry: { stdout: "", stderr: "" },
    bytes: { stdout: 0, stderr: 0 },
    truncated: { stdout: false, stderr: false },
    migrationVersions: [],
    migrationBasenames: [],
    sqlStates: [],
    missingRelationIdentities: [],
    injectedAtomicityFailure: false,
    bridgeAssertionCode: null,
    bridgeAssertionInputHashes: new Set(),
    bridgeAssertionAllowlistMatch: false,
    lastErrorClass: "NONE"
  };

  function observeErrorLine(line) {
    const normalizedLine = stripAnsi(line);
    if (!/\b(?:error|fatal)\b|failed to apply migration|migration failed|error applying migration/i.test(normalizedLine)) {
      return;
    }
    const messageMatch = normalizedLine.match(/\b(?:ERROR|FATAL)\s*:\s*(.*?)\s*$/i);
    if (!messageMatch) return;
    const message = messageMatch[1].trim();
    const messageHash = crypto.createHash("sha256").update(message, "utf8").digest("hex");
    if (state.bridgeAssertionInputHashes.size < maxDiagnosticValues) {
      state.bridgeAssertionInputHashes.add(messageHash);
    }
    const assertionCode = bridgeAssertionCodeForHash(messageHash);
    if (assertionCode) {
      state.bridgeAssertionCode = assertionCode;
      state.bridgeAssertionAllowlistMatch = true;
      state.lastErrorClass = "BRIDGE_ASSERTION";
      return;
    }
    state.lastErrorClass = classifyErrorLine(normalizedLine);
  }

  function scan(stream, chunk) {
    const rawText = `${state.carry[stream]}${chunk.toString("utf8")}`;
    state.carry[stream] = rawText.slice(-8192);
    const text = stripAnsi(rawText);
    for (const match of text.matchAll(/(?<!\d)(\d{14})(?!\d)/g)) boundedAdd(state.migrationVersions, match[1]);
    for (const match of text.matchAll(/\b(\d{14}_[A-Za-z0-9][A-Za-z0-9_-]*\.sql)\b/g)) {
      boundedAdd(state.migrationBasenames, match[1]);
    }
    for (const match of text.matchAll(/\bSQL(?:STATE| state)\s*[:=]?\s*([0-9A-Z]{5})\b/gi)) {
      boundedAdd(state.sqlStates, match[1].toUpperCase());
    }
    for (const match of text.matchAll(/\brelation\s+((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*))?)\s+does not exist/gi)) {
      const identity = normalizeIdentifier(match[1]);
      if (identity) boundedAdd(state.missingRelationIdentities, identity);
    }
    if (/gate1-atomicity-test/i.test(text)) state.injectedAtomicityFailure = true;
    const completeLines = text.split(/\r?\n/).slice(0, -1);
    for (const line of completeLines) observeErrorLine(line);
  }

  function write(stream, input) {
    const chunk = Buffer.isBuffer(input) ? input : Buffer.from(String(input ?? ""), "utf8");
    state.bytes[stream] += chunk.length;
    if (state.retainOutput) {
      const next = Buffer.concat([buffers[stream], chunk]);
      const limitBytes = stream === "stdout" ? state.ringBytes : state.stderrRingBytes;
      if (next.length > limitBytes) state.truncated[stream] = true;
      buffers[stream] = next.length > limitBytes ? next.subarray(next.length - limitBytes) : next;
    }
    scan(stream, chunk);
  }

  function finish() {
    for (const stream of ["stdout", "stderr"]) {
      const pending = state.carry[stream];
      if (pending && !/[\r\n]$/.test(pending)) {
        observeErrorLine(pending.split(/\r?\n/).at(-1) ?? "");
      }
    }
    const sqlErrorClasses = new Set([
      "DUPLICATE_OBJECT",
      "MIGRATION_FAILURE",
      "MISSING_COLUMN",
      "MISSING_FUNCTION",
      "MISSING_RELATION",
      "MISSING_SCHEMA",
      "MISSING_TYPE",
      "PERMISSION_DENIED",
      "BRIDGE_ASSERTION",
      "SYNTAX_ERROR"
    ]);
    const finalErrorClass = state.lastErrorClass === "ERROR" && state.sqlStates.at(-1) === "P0001"
      ? "USER_RAISED_EXCEPTION"
      : state.lastErrorClass;
    const bridgeAssertionCode = state.sqlStates.includes("P0001")
      ? (state.bridgeAssertionCode ?? "UNKNOWN_USER_RAISED_ASSERTION")
      : "NONE";
    if (finalErrorClass === "USER_RAISED_EXCEPTION") sqlErrorClasses.add(finalErrorClass);
    const outputClass = state.injectedAtomicityFailure
      ? "SQL"
      : sqlErrorClasses.has(finalErrorClass)
        ? "SQL"
        : finalErrorClass === "PORT"
          ? "PORT"
          : finalErrorClass === "HEALTH"
            ? "HEALTH"
            : finalErrorClass === "CONNECTION_ERROR"
              ? "HEALTH"
              : finalErrorClass === "NONE"
                ? "UNCLASSIFIED"
                : "CLI";
    return {
      stdout: preserveStdout && state.retainOutput && !state.truncated.stdout ? buffers.stdout.toString("utf8") : "",
      diagnostics: {
        outputClass,
        lastErrorClass: finalErrorClass,
        bridgeAssertionCode,
        bridgeAssertionInputCount: state.bridgeAssertionInputHashes.size,
        bridgeAssertionAllowlistMatch: state.bridgeAssertionAllowlistMatch,
        injectedAtomicityFailure: state.injectedAtomicityFailure,
        migrationVersions: state.migrationVersions,
        migrationBasenames: state.migrationBasenames,
        lastMigrationBasename: state.migrationBasenames.at(-1) ?? "UNSPECIFIED",
        sqlStates: state.sqlStates,
        missingRelationIdentities: state.missingRelationIdentities,
        stdoutBytes: state.bytes.stdout,
        stderrBytes: state.bytes.stderr,
        stdoutLimitBytes: state.ringBytes,
        stdoutTruncated: state.truncated.stdout,
        stderrTruncated: state.truncated.stderr
      }
    };
  }

  return { write, finish };
}

function sanitizedErrorCode(error) {
  const code = error && typeof error.code === "string" ? error.code : "";
  return /^[A-Z0-9_-]{1,64}$/.test(code) ? code : "CLI_RUNNER_ERROR";
}

function configuredTimeoutMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return defaultTimeoutMs;
  return Math.min(maxTimeoutMs, Math.max(1, Math.floor(numeric)));
}

function terminateChildTree(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return { success: false, code: "CLI_CHILD_PID_INVALID" };
  }
  if (process.platform !== "win32") {
    return { success: false, code: "CLI_TREE_TERMINATION_UNSUPPORTED" };
  }
  let result;
  try {
    result = spawnSync(
      windowsTaskkillPath,
      ["/PID", String(pid), "/T", "/F"],
      {
        encoding: "utf8",
        maxBuffer: 64 * 1024,
        shell: false,
        timeout: terminateTreeTimeoutMs,
        windowsHide: true
      }
    );
  } catch {
    return { success: false, code: "CLI_TREE_TERMINATION_FAILED" };
  }
  if (!result || result.error || result.signal || result.status !== 0) {
    return { success: false, code: "CLI_TREE_TERMINATION_FAILED" };
  }
  return { success: true, code: "NONE" };
}

function runConfiguredCli(config) {
  const ringBytes = config.structuredStdout === true
    ? structuredStdoutRingBytes
    : config.ringBytes;
  const preserveStdout = config.preserveStdout === true;
  const collector = createCliOutputCollector({
    preserveStdout,
    ringBytes,
    stderrRingBytes: config.ringBytes ?? defaultRingBytes,
    retainOutput: config.retainOutput !== false
  });
  const bridgeMatcher = typeof config.bridgeSourceFile === "string" && config.bridgeSourceFile.length > 0
    ? createBridgeAssertionStreamMatcher(bridgeAssertionEntriesFromSource(config.bridgeSourceFile))
    : null;
  let finished = false;
  let childClosed = false;
  let childStatus = 1;
  let childSignal = "NONE";
  let terminationRequested = false;
  let terminationSucceeded = false;
  let timedOut = false;
  let preSpawnFailure = false;
  let childExitObserved = false;
  let errorCode = "NONE";
  let inputStream = null;
  let timeoutHandle = null;
  let closeGraceHandle = null;
  let child;

  const clearTimers = () => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (closeGraceHandle) clearTimeout(closeGraceHandle);
    timeoutHandle = null;
    closeGraceHandle = null;
  };

  const destroyProcessHandles = (unknown = false) => {
    clearTimers();
    if (inputStream) {
      inputStream.unpipe?.(child?.stdin);
      inputStream.destroy?.();
      inputStream = null;
    }
    for (const stream of [child?.stdin, child?.stdout, child?.stderr]) {
      if (unknown) stream?.destroy?.();
      stream?.unref?.();
    }
    child?.unref?.();
  };

  const writeReceipt = (status, signal, diagnostics, capturedStdout, terminationConfirmed) => {
    process.stdout.write(JSON.stringify({
      status: typeof status === "number" ? status : 1,
      signal: typeof signal === "string" ? signal : "NONE",
      errorCode: sanitizedErrorCode({ code: errorCode }),
      stdout: preserveStdout && !timedOut && terminationConfirmed ? capturedStdout : "",
      diagnostics,
      terminationConfirmed: terminationConfirmed === true,
      timedOut: timedOut === true,
      preSpawnFailure: preSpawnFailure === true,
      captureFailure: errorCode === "CLI_CAPTURE_FAILURE"
    }));
  };

  const finish = (status, signal, terminationConfirmed, unknown = false) => {
    if (finished) return;
    finished = true;
    destroyProcessHandles(unknown);
    let captured;
    let streamMatch;
    try {
      captured = collector.finish();
      streamMatch = bridgeMatcher?.finish();
    } catch {
      errorCode = "CLI_CAPTURE_FAILURE";
      captured = {
        stdout: "",
        diagnostics: {
          outputClass: "RUNNER",
          lastErrorClass: "CLI_RUNNER_ERROR",
          bridgeAssertionCode: "NONE",
          bridgeAssertionInputCount: 0,
          bridgeAssertionAllowlistMatch: false,
          injectedAtomicityFailure: false,
          migrationVersions: [],
          migrationBasenames: [],
          lastMigrationBasename: "UNSPECIFIED",
          sqlStates: [],
          missingRelationIdentities: [],
          stdoutBytes: 0,
          stderrBytes: 0,
          stdoutLimitBytes: defaultRingBytes,
          stdoutTruncated: false,
          stderrTruncated: false
        }
      };
      streamMatch = null;
    }
    const diagnostics = streamMatch
      ? config.bridgeOnly === true
        ? {
            outputClass: streamMatch.bridgeAssertionCode !== "NONE" ? "SQL" : (status === 0 ? "UNCLASSIFIED" : "CLI"),
            lastErrorClass: streamMatch.bridgeAssertionCode !== "NONE" ? "BRIDGE_ASSERTION" : "NONE",
            ...streamMatch,
            stdoutBytes: captured.diagnostics.stdoutBytes,
            stderrBytes: captured.diagnostics.stderrBytes,
            stdoutLimitBytes: captured.diagnostics.stdoutLimitBytes,
            stdoutTruncated: captured.diagnostics.stdoutTruncated,
            stderrTruncated: captured.diagnostics.stderrTruncated
          }
        : { ...captured.diagnostics, ...streamMatch }
      : captured.diagnostics;
    writeReceipt(status, signal, diagnostics, config.bridgeOnly === true ? "" : captured.stdout, terminationConfirmed);
  };

  const requestTermination = (reason) => {
    if (finished || terminationRequested) return;
    terminationRequested = true;
    if (childExitObserved && !childClosed) {
      timedOut = reason === "timeout";
      if (errorCode === "NONE") errorCode = "CLI_TREE_TERMINATION_UNKNOWN";
      finish(1, childSignal, false, true);
      return;
    }
    const result = terminateChildTree(childPid);
    terminationSucceeded = result.success;
    if (!result.success && errorCode === "NONE") errorCode = result.code;
    if (reason === "timeout") {
      timedOut = true;
      if (errorCode === "NONE") errorCode = "CLI_TIMEOUT";
    }
    if (childClosed) {
      finish(1, childSignal, terminationSucceeded, !terminationSucceeded);
      return;
    }
    closeGraceHandle = setTimeout(() => {
      finish(1, "NONE", false, true);
    }, closeGraceTimeoutMs);
    closeGraceHandle.unref?.();
  };

  try {
    child = spawn(config.command, Array.isArray(config.args) ? config.args : [], {
      cwd: config.cwd,
      env: config.env,
      shell: config.shell === true,
      windowsHide: true
    });
  } catch (error) {
    preSpawnFailure = true;
    errorCode = sanitizedErrorCode(error);
    finish(1, "NONE", true);
    return;
  }

  const childPid = Number.isSafeInteger(child?.pid) && child.pid > 0 ? child.pid : null;
  if (child?.stdin?.on) {
    child.stdin.on("error", (error) => {
      if (finished) return;
      if (errorCode === "NONE") errorCode = sanitizedErrorCode(error);
      requestTermination("input-error");
    });
  }
  child?.stdout?.on?.("data", (chunk) => {
    collector.write("stdout", chunk);
    bridgeMatcher?.write(chunk, "stdout");
  });
  child?.stderr?.on?.("data", (chunk) => {
    collector.write("stderr", chunk);
    bridgeMatcher?.write(chunk, "stderr");
  });
  child?.once?.("error", (error) => {
    if (finished) return;
    errorCode = sanitizedErrorCode(error);
    if (childPid === null) {
      preSpawnFailure = true;
      finish(1, "NONE", true);
    } else {
      requestTermination("child-error");
    }
  });
  child?.once?.("exit", () => {
    childExitObserved = true;
  });
  child?.once?.("close", (status, signal) => {
    childClosed = true;
    childStatus = typeof status === "number" ? status : 1;
    childSignal = signal ?? "NONE";
    if (!terminationRequested) {
      finish(childStatus, childSignal, true);
    } else {
      finish(1, childSignal, terminationSucceeded, !terminationSucceeded);
    }
  });

  if (typeof config.inputFile === "string" && config.inputFile.length > 0) {
    try {
      inputStream = fs.createReadStream(config.inputFile);
      inputStream.on("error", (error) => {
        if (finished) return;
        errorCode = "CLI_INPUT_FILE_ERROR";
        requestTermination("input-error");
      });
      if (!child?.stdin || typeof inputStream.pipe !== "function") {
        errorCode = "CLI_INPUT_FILE_ERROR";
        requestTermination("input-error");
      } else {
        inputStream.pipe(child.stdin);
      }
    } catch {
      errorCode = "CLI_INPUT_FILE_ERROR";
      requestTermination("input-error");
    }
  } else if (child?.stdin?.end) {
    child.stdin.end();
  }

  timeoutHandle = setTimeout(() => requestTermination("timeout"), configuredTimeoutMs(config.timeoutMs));
  timeoutHandle.unref?.();
}

if (require.main === module) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", () => {
    try {
      runConfiguredCli(JSON.parse(input));
    } catch (error) {
      process.stdout.write(JSON.stringify({
        status: 1,
        signal: "NONE",
        errorCode: sanitizedErrorCode(error),
        stdout: "",
        terminationConfirmed: false,
        timedOut: false,
        preSpawnFailure: true,
        captureFailure: false,
        diagnostics: {
          outputClass: "RUNNER",
          lastErrorClass: "CLI_RUNNER_ERROR",
          bridgeAssertionCode: "NONE",
          bridgeAssertionInputCount: 0,
          bridgeAssertionAllowlistMatch: false,
          injectedAtomicityFailure: false,
          migrationVersions: [],
          migrationBasenames: [],
          lastMigrationBasename: "UNSPECIFIED",
          sqlStates: [],
          missingRelationIdentities: [],
          stdoutBytes: 0,
          stderrBytes: 0,
          stdoutLimitBytes: defaultRingBytes,
          stdoutTruncated: false,
          stderrTruncated: false
        }
      }));
    }
  });
} else {
  module.exports = {
    bridgeAssertionAllowlistSize: bridgeAssertionCodesByHash.size,
    bridgeAssertionCodeForHash,
    createCliOutputCollector,
    createBridgeAssertionStreamMatcher,
    structuredStdoutRingBytes
  };
}
