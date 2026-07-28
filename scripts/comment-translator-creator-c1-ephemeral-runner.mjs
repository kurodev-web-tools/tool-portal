import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CONTROL_PIPE_NAME =
  "comment-translator-creator-c1-ephemeral-runner-v1";

const CONTROL_PIPE_PATH = `\\\\.\\pipe\\${CONTROL_PIPE_NAME}`;
const MAX_INPUT_BYTES = 4096;
const MAX_CONTROL_BYTES = 32;

export function createEphemeralState({ readAdapter = null } = {}) {
  let heldInputs = null;
  let terminated = false;
  let readStarted = false;

  function wipe() {
    if (heldInputs !== null) {
      for (const input of heldInputs) {
        input.fill(0);
      }
      heldInputs = null;
    }
    terminated = true;
  }

  return Object.freeze({
    hold(first, second) {
      if (
        terminated ||
        heldInputs !== null ||
        !Buffer.isBuffer(first) ||
        !Buffer.isBuffer(second) ||
        first.length === 0 ||
        second.length === 0
      ) {
        throw new TypeError("ephemeral input state rejected");
      }

      heldInputs = [first, second];
    },

    control(command) {
      switch (command) {
        case "presence":
          return heldInputs === null
            ? "input_presence=incomplete"
            : "input_presence=complete";
        case "status":
          if (terminated) {
            return "runner_status=terminated";
          }
          return heldInputs === null
            ? "runner_status=awaiting-input"
            : "runner_status=held-idle";
        case "stop":
          wipe();
          return "termination_status=stopping";
        default:
          return "control_status=rejected";
      }
    },

    async executeRead() {
      if (terminated || heldInputs === null) {
        return createReadExecutionResult({
          sourceStatus: "incomplete",
          readAttemptCount: 0,
        });
      }

      if (readStarted || typeof readAdapter !== "function") {
        return createReadExecutionResult({
          sourceStatus: "complete",
          readAttemptCount: 0,
        });
      }

      readStarted = true;
      try {
        await readAdapter(heldInputs[0], heldInputs[1]);
        return Object.freeze({
          executionStatus: "pass",
          sourceStatus: "complete",
          readAttemptCount: 1,
          resultStatus: "available",
        });
      } catch {
        return createReadExecutionResult({
          sourceStatus: "complete",
          readAttemptCount: 1,
        });
      }
    },

    wipe,
  });
}

function createReadExecutionResult({ sourceStatus, readAttemptCount }) {
  return Object.freeze({
    executionStatus: "fail-closed",
    sourceStatus,
    readAttemptCount,
    resultStatus: "unavailable",
  });
}

function formatReadExecutionResult(result) {
  return [
    `execution_status=${result.executionStatus}`,
    `source_status=${result.sourceStatus}`,
    `read_attempt_count=${result.readAttemptCount}`,
    `result_status=${result.resultStatus}`,
  ].join(" ");
}

export function readHiddenInput({ input, output, prompt }) {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new TypeError("interactive input required");
  }

  return new Promise((resolveInput, rejectInput) => {
    const storage = Buffer.alloc(MAX_INPUT_BYTES);
    let length = 0;
    let settled = false;

    function finish() {
      if (settled) {
        return;
      }
      settled = true;
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    }

    function rejectSanitized() {
      storage.fill(0);
      finish();
      rejectInput(new Error("input rejected"));
    }

    function onData(chunk) {
      for (const byte of chunk) {
        if (byte === 0x03) {
          rejectSanitized();
          return;
        }

        if (byte === 0x0d || byte === 0x0a) {
          if (length === 0) {
            output.write("\ninput_status=required\n");
            output.write(prompt);
            continue;
          }

          const held = storage.subarray(0, length);
          finish();
          output.write("\n");
          resolveInput(held);
          return;
        }

        if (byte === 0x08 || byte === 0x7f) {
          if (length > 0) {
            length -= 1;
            storage[length] = 0;
          }
          continue;
        }

        if (length === MAX_INPUT_BYTES) {
          rejectSanitized();
          return;
        }

        storage[length] = byte;
        length += 1;
      }
    }

    output.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

export function decodeControlRequest(request) {
  const end =
    request.length > 0 && request[request.length - 1] === 0x0d
      ? request.length - 1
      : request.length;
  return request.subarray(0, end).toString("ascii");
}

function handleControlConnection(connection, state, stopRunner) {
  const request = Buffer.alloc(MAX_CONTROL_BYTES);
  let length = 0;
  let handled = false;

  function rejectControl() {
    request.fill(0);
    handled = true;
    connection.end("control_status=rejected\n");
  }

  connection.on("data", async (chunk) => {
    if (handled) {
      return;
    }

    for (const byte of chunk) {
      if (byte === 0x0a) {
        const command = decodeControlRequest(request.subarray(0, length));
        request.fill(0);
        handled = true;
        const response =
          command === "read"
            ? formatReadExecutionResult(await state.executeRead())
            : state.control(command);
        connection.end(`${response}\n`, () => {
          if (command === "stop") {
            stopRunner();
          }
        });
        return;
      }

      if (length === MAX_CONTROL_BYTES || byte > 0x7f) {
        rejectControl();
        return;
      }

      request[length] = byte;
      length += 1;
    }
  });

  connection.on("error", () => {
    request.fill(0);
    connection.destroy();
  });
}

export async function run({ readAdapter = null } = {}) {
  const state = createEphemeralState({ readAdapter });
  let first = null;
  let second = null;

  try {
    first = await readHiddenInput({
      input: process.stdin,
      output: process.stdout,
      prompt: "入力 1: ",
    });
    second = await readHiddenInput({
      input: process.stdin,
      output: process.stdout,
      prompt: "入力 2: ",
    });
    state.hold(first, second);
  } catch {
    first?.fill(0);
    second?.fill(0);
    state.wipe();
    process.stdout.write("runner_status=not-started\n");
    process.exitCode = 1;
    return;
  }

  const server = createServer();
  let stopping = false;

  function stopRunner() {
    if (stopping) {
      return;
    }
    stopping = true;
    state.wipe();
    server.close(() => {
      process.stdout.write("termination_status=terminated\n");
    });
  }

  server.on("connection", (connection) => {
    handleControlConnection(connection, state, stopRunner);
  });
  server.on("error", () => {
    state.wipe();
    process.stdout.write("runner_status=not-started\n");
    process.exitCode = 1;
  });

  process.once("SIGINT", stopRunner);
  process.once("SIGTERM", stopRunner);
  process.once("exit", state.wipe);

  server.listen(CONTROL_PIPE_PATH, () => {
    process.stdout.write("runner_status=held-idle\n");
  });
}

const directInvocation =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (directInvocation) {
  await run();
}
