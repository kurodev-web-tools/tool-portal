import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

const MAX_INPUT_BYTES = 65_536;
const CHILD_PATH = fileURLToPath(new URL("./child.mjs", import.meta.url));
let ownedInputs = [];
let child = null;
let stopping = false;

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    stopping = true;
    wipeOwnedInputs();
    child?.kill("SIGTERM");
  });
}

try {
  ownedInputs = parseFrame(await readStdin());
  child = fork(CHILD_PATH, [], {
    serialization: "advanced",
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    env: process.env.C1_SYNTHETIC_RESULT
      ? { C1_SYNTHETIC_RESULT: process.env.C1_SYNTHETIC_RESULT }
      : {},
  });
  const result = await runChild(child, ownedInputs);
  wipeOwnedInputs();
  process.stdout.write(JSON.stringify(result));
  process.exitCode = result.executionStatus === "pass" ? 0 : 1;
} catch {
  wipeOwnedInputs();
  process.stdout.write(JSON.stringify(failClosed("parent-error", false)));
  process.exitCode = 1;
}

function runChild(childProcess, [endpoint, credential, billingReference]) {
  return new Promise((resolve) => {
    let message = null;
    let writeSettled = false;

    childProcess.once("message", (candidate) => {
      if (isChildResult(candidate)) message = candidate;
      else childProcess.kill("SIGTERM");
    });
    childProcess.once("error", () => {
      wipeOwnedInputs();
      childProcess.kill("SIGTERM");
    });
    childProcess.once("exit", (code) => {
      const exitedZero = code === 0;
      if (
        !stopping
        && writeSettled
        && exitedZero
        && message?.executionStatus === "pass"
        && ["available", "missing"].includes(message.resultStatus)
      ) {
        resolve({
          ...message,
          terminationStatus: "child-exited-zero-parent-ready",
          childExitCodeObserved: true,
          parentBufferZeroFillCount: 3,
        });
        return;
      }
      resolve(failClosed(stopping ? "stopped" : "child-failed", true, message));
    });

    childProcess.send({ endpoint, credential, billingReference }, (error) => {
      wipeOwnedInputs();
      if (error) {
        childProcess.kill("SIGTERM");
        return;
      }
      writeSettled = true;
    });
  });
}

function failClosed(terminationStatus, childExitCodeObserved, message = null) {
  return {
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    billingState: null,
    terminationStatus,
    childExitCodeObserved,
    parentBufferZeroFillCount: 3,
    childBufferZeroFillCount: message?.childBufferZeroFillCount === 3 ? 3 : 0,
    childConstructionAttemptCount: message?.childConstructionAttemptCount === 1 ? 1 : 0,
    childReadAttemptCount: message?.childReadAttemptCount === 1 ? 1 : 0,
  };
}

function isChildResult(value) {
  const expectedKeys =
    "billingState,childBufferZeroFillCount,childConstructionAttemptCount,"
    + "childReadAttemptCount,executionStatus,resultStatus";
  return value !== null
    && typeof value === "object"
    && Object.keys(value).sort().join(",") === expectedKeys
    && ["pass", "fail-closed"].includes(value.executionStatus)
    && ["available", "missing", "unavailable"].includes(value.resultStatus)
    && (
      value.billingState === null
      || ["paid-active", "paid-inactive"].includes(value.billingState)
    )
    && value.childBufferZeroFillCount === 3
    && value.childConstructionAttemptCount === 1
    && value.childReadAttemptCount === 1;
}

async function readStdin() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > MAX_INPUT_BYTES) throw new Error();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseFrame(frame) {
  const inputs = [];
  try {
    let offset = 0;
    for (let index = 0; index < 3; index += 1) {
      if (offset + 4 > frame.length) throw new Error();
      const length = frame.readUInt32BE(offset);
      offset += 4;
      if (length === 0 || offset + length > frame.length) throw new Error();
      inputs.push(Buffer.from(frame.subarray(offset, offset + length)));
      offset += length;
    }
    if (offset !== frame.length) throw new Error();
    return inputs;
  } catch {
    for (const input of inputs) input.fill(0);
    throw new Error();
  } finally {
    frame.fill(0);
  }
}

function wipeOwnedInputs() {
  for (const input of ownedInputs) input.fill(0);
}
