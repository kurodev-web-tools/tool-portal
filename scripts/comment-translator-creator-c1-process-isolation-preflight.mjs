import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

const CHILD_ARGUMENT = "--synthetic-child";
const SCENARIOS = new Set([
  "available",
  "missing",
  "construction-error",
  "read-error",
  "stop-during-read",
]);

export function createSingleUseChildProcessOwnershipPreflight({
  forkChild = fork,
} = {}) {
  let used = false;
  let completed = false;
  let completedWithObservedExit = false;

  return Object.freeze({
    async execute({ first, second, scenario }) {
      if (used) {
        if (!completed) {
          return createInFlightSuppressedResult(
            wipeParentInputs(first, second),
          );
        }
        return completedWithObservedExit
          ? createSuppressedResult(wipeParentInputs(first, second))
          : createSettledWithoutExitSuppressedResult(
              wipeParentInputs(first, second),
            );
      }
      used = true;

      if (
        !Buffer.isBuffer(first) ||
        !Buffer.isBuffer(second) ||
        first.length === 0 ||
        second.length === 0 ||
        !SCENARIOS.has(scenario)
      ) {
        completed = true;
        return createNotStartedResult(wipeParentInputs(first, second));
      }

      const result = await executeChildAttempt({
        first,
        second,
        scenario,
        forkChild,
      });
      completed = true;
      completedWithObservedExit =
        result.terminationStatus === "exited" ||
        result.terminationStatus === "exited-error" ||
        result.terminationStatus === "terminated-stop";
      return result;
    },
  });
}

function executeChildAttempt({ first, second, scenario, forkChild }) {
  let child;
  try {
    child = forkChild(fileURLToPath(import.meta.url), [CHILD_ARGUMENT, scenario], {
      serialization: "advanced",
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      windowsHide: true,
    });
  } catch {
    return Promise.resolve(
      createResult({
        executionStatus: "fail-closed",
        resultStatus: "unavailable",
        childSpawnAttemptCount: 1,
        parentTransferAttemptCount: 0,
        parentWriteAttemptCount: 0,
        parentBufferZeroFillCount: wipeParentInputs(first, second),
        childConstructionAttemptCount: 0,
        childReadAttemptCount: 0,
        terminationStatus: "spawn-error",
        postExitRepeatSuppressionCount: 0,
        lateSuccessCount: 0,
      }),
    );
  }

  return new Promise((resolveResult) => {
    let parentWriteAttemptCount = 0;
    let parentBufferZeroFillCount = 0;
    let childConstructionAttemptCount = 0;
    let childReadAttemptCount = 0;
    let executionStatus = "fail-closed";
    let resultStatus = "unavailable";
    let stopRequested = false;
    let lateSuccessCount = 0;
    let settled = false;

    function wipeOnce() {
      if (parentBufferZeroFillCount === 0) {
        parentBufferZeroFillCount = wipeParentInputs(first, second);
      }
    }

    function resolveOnce(terminationStatus, allowPass = false) {
      if (settled) {
        return;
      }
      settled = true;
      resolveResult(
        createResult({
          executionStatus: allowPass ? executionStatus : "fail-closed",
          resultStatus: allowPass ? resultStatus : "unavailable",
          childSpawnAttemptCount: 1,
          parentTransferAttemptCount: 1,
          parentWriteAttemptCount,
          parentBufferZeroFillCount,
          childConstructionAttemptCount,
          childReadAttemptCount,
          terminationStatus,
          postExitRepeatSuppressionCount: 0,
          lateSuccessCount,
        }),
      );
    }

    child.on("message", (message) => {
      if (!isSanitizedChildMessage(message)) {
        child.kill();
        return;
      }

      childConstructionAttemptCount = message.childConstructionAttemptCount;
      childReadAttemptCount = message.childReadAttemptCount;

      if (message.kind === "read-started") {
        if (scenario === "stop-during-read" && !stopRequested) {
          stopRequested = true;
          child.kill("SIGTERM");
        }
        return;
      }

      if (stopRequested && message.executionStatus === "pass") {
        lateSuccessCount += 1;
        return;
      }
      executionStatus = message.executionStatus;
      resultStatus = message.resultStatus;
    });

    child.once("error", () => {
      wipeOnce();
      child.kill();
      resolveOnce("child-error-no-exit");
    });

    child.once("exit", (code, signal) => {
      wipeOnce();
      const terminationStatus =
        stopRequested && (code === 0 || signal === "SIGTERM")
          ? "terminated-stop"
          : code === 0 && executionStatus === "pass"
            ? "exited"
            : "exited-error";
      resolveOnce(terminationStatus, terminationStatus === "exited");
    });

    try {
      child.send(
        {
          kind: "execute",
          first,
          second,
        },
        (error) => {
          wipeOnce();
          if (error) {
            child.kill();
            resolveOnce("ipc-write-error");
            return;
          }
          parentWriteAttemptCount = 1;
        },
      );
    } catch {
      wipeOnce();
      child.kill();
      resolveOnce("ipc-write-error");
    }
  });
}

function isSanitizedChildMessage(message) {
  if (
    message === null ||
    typeof message !== "object" ||
    !Number.isInteger(message.childConstructionAttemptCount) ||
    !Number.isInteger(message.childReadAttemptCount)
  ) {
    return false;
  }

  if (message.kind === "read-started") {
    return (
      message.childConstructionAttemptCount === 1 &&
      message.childReadAttemptCount === 1 &&
      Object.keys(message).length === 3
    );
  }

  return (
    message.kind === "result" &&
    (message.executionStatus === "pass" ||
      message.executionStatus === "fail-closed") &&
    (message.resultStatus === "available" ||
      message.resultStatus === "missing" ||
      message.resultStatus === "unavailable") &&
    Object.keys(message).length === 5
  );
}

function wipeParentInputs(first, second) {
  let wipeCount = 0;
  for (const input of [first, second]) {
    if (Buffer.isBuffer(input)) {
      input.fill(0);
      wipeCount += 1;
    }
  }
  return wipeCount;
}

function createResult(result) {
  return Object.freeze({
    executionStatus: result.executionStatus,
    resultStatus: result.resultStatus,
    childSpawnAttemptCount: result.childSpawnAttemptCount,
    parentTransferAttemptCount: result.parentTransferAttemptCount,
    parentWriteAttemptCount: result.parentWriteAttemptCount,
    parentBufferZeroFillCount: result.parentBufferZeroFillCount,
    childConstructionAttemptCount: result.childConstructionAttemptCount,
    childReadAttemptCount: result.childReadAttemptCount,
    terminationStatus: result.terminationStatus,
    postExitRepeatSuppressionCount: result.postExitRepeatSuppressionCount,
    lateSuccessCount: result.lateSuccessCount,
  });
}

function createSuppressedResult(parentBufferZeroFillCount) {
  return createResult({
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    childSpawnAttemptCount: 0,
    parentTransferAttemptCount: 0,
    parentWriteAttemptCount: 0,
    parentBufferZeroFillCount,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
    terminationStatus: "repeat-suppressed",
    postExitRepeatSuppressionCount: 1,
    lateSuccessCount: 0,
  });
}

function createInFlightSuppressedResult(parentBufferZeroFillCount) {
  return createResult({
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    childSpawnAttemptCount: 0,
    parentTransferAttemptCount: 0,
    parentWriteAttemptCount: 0,
    parentBufferZeroFillCount,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
    terminationStatus: "in-flight-repeat-suppressed",
    postExitRepeatSuppressionCount: 0,
    lateSuccessCount: 0,
  });
}

function createSettledWithoutExitSuppressedResult(parentBufferZeroFillCount) {
  return createResult({
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    childSpawnAttemptCount: 0,
    parentTransferAttemptCount: 0,
    parentWriteAttemptCount: 0,
    parentBufferZeroFillCount,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
    terminationStatus: "settled-without-exit-repeat-suppressed",
    postExitRepeatSuppressionCount: 0,
    lateSuccessCount: 0,
  });
}

function createNotStartedResult(parentBufferZeroFillCount) {
  return createResult({
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    childSpawnAttemptCount: 0,
    parentTransferAttemptCount: 0,
    parentWriteAttemptCount: 0,
    parentBufferZeroFillCount,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
    terminationStatus: "not-started",
    postExitRepeatSuppressionCount: 0,
    lateSuccessCount: 0,
  });
}

function createInertClient(first, second, scenario) {
  const firstImmutableCopy = first.toString("utf8").trim();
  const secondImmutableCopy = second.toString("utf8").trim();

  if (scenario === "construction-error") {
    throw new Error();
  }

  return Object.freeze({
    async read() {
      void firstImmutableCopy.length;
      void secondImmutableCopy.length;

      if (scenario === "read-error") {
        throw new Error();
      }
      if (scenario === "stop-during-read") {
        return new Promise(() => {});
      }
      return scenario === "missing" ? null : Object.freeze({});
    },
  });
}

function sendChildResult(message, exitCode, first, second) {
  process.send?.(message, () => {
    first.fill(0);
    second.fill(0);
    process.exitCode = exitCode;
    process.disconnect();
  });
}

function runSyntheticChild(scenario) {
  process.once("message", async (message) => {
    if (
      message === null ||
      typeof message !== "object" ||
      message.kind !== "execute" ||
      !Buffer.isBuffer(message.first) ||
      !Buffer.isBuffer(message.second) ||
      message.first.length === 0 ||
      message.second.length === 0
    ) {
      process.exitCode = 1;
      process.disconnect();
      return;
    }

    const { first, second } = message;
    let childConstructionAttemptCount = 0;
    let childReadAttemptCount = 0;

    process.once("SIGTERM", () => {
      first.fill(0);
      second.fill(0);
      process.exit(0);
    });

    try {
      childConstructionAttemptCount = 1;
      const client = createInertClient(first, second, scenario);
      childReadAttemptCount = 1;
      const readPromise = client.read();

      if (scenario === "stop-during-read") {
        process.send?.({
          kind: "read-started",
          childConstructionAttemptCount,
          childReadAttemptCount,
        });
        await readPromise;
        return;
      }

      const record = await readPromise;
      sendChildResult(
        {
          kind: "result",
          executionStatus: "pass",
          resultStatus: record === null ? "missing" : "available",
          childConstructionAttemptCount,
          childReadAttemptCount,
        },
        0,
        first,
        second,
      );
    } catch {
      sendChildResult(
        {
          kind: "result",
          executionStatus: "fail-closed",
          resultStatus: "unavailable",
          childConstructionAttemptCount,
          childReadAttemptCount,
        },
        1,
        first,
        second,
      );
    }
  });
}

if (
  process.argv[2] === CHILD_ARGUMENT &&
  typeof process.argv[3] === "string" &&
  SCENARIOS.has(process.argv[3])
) {
  runSyntheticChild(process.argv[3]);
}
