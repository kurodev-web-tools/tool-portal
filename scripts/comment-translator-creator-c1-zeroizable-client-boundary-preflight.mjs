const DISPOSE_ACKNOWLEDGEMENT = "zeroized";

export function createSingleUseZeroizableClientBoundaryPreflight({
  createClient,
}) {
  if (typeof createClient !== "function") {
    throw new TypeError("zeroizable client boundary unavailable");
  }

  let used = false;
  let active = false;
  let settled = false;
  let stopRequested = false;
  let stopRequestCount = 0;
  let abortController = null;

  return Object.freeze({
    async execute(first, second) {
      if (used) {
        const repositoryBufferZeroFillCount = wipeInputs(first, second);
        return createResult({
          executionStatus: "fail-closed",
          resultStatus: "unavailable",
          factoryAttemptCount: 0,
          readAttemptCount: 0,
          stopRequestCount: 0,
          repositoryBufferZeroFillCount,
          zeroFillCompletionCount: countZeroFilled(first, second),
          disposeAttemptCount: 0,
          disposeAcknowledgementCount: 0,
          postSettlementRepeatSuppressionCount: settled ? 1 : 0,
          lateSuccessSuppressionCount: 0,
          terminationStatus: settled
            ? "repeat-suppressed"
            : "in-flight-repeat-suppressed",
        });
      }
      used = true;

      if (
        !Buffer.isBuffer(first) ||
        !Buffer.isBuffer(second) ||
        first.length === 0 ||
        second.length === 0
      ) {
        const repositoryBufferZeroFillCount = wipeInputs(first, second);
        settled = true;
        return createResult({
          executionStatus: "fail-closed",
          resultStatus: "unavailable",
          factoryAttemptCount: 0,
          readAttemptCount: 0,
          stopRequestCount: 0,
          repositoryBufferZeroFillCount,
          zeroFillCompletionCount: countZeroFilled(first, second),
          disposeAttemptCount: 0,
          disposeAcknowledgementCount: 0,
          postSettlementRepeatSuppressionCount: 0,
          lateSuccessSuppressionCount: 0,
          terminationStatus: "not-started",
        });
      }

      active = true;
      abortController = new AbortController();
      let client = null;
      let phase = "factory";
      let factoryAttemptCount = 0;
      let readAttemptCount = 0;
      let disposeAttemptCount = 0;
      let disposeAcknowledgementCount = 0;
      let lateSuccessSuppressionCount = 0;
      let candidateResultStatus = "unavailable";
      let terminationStatus = "factory-error";

      try {
        factoryAttemptCount = 1;
        client = await createClient(first, second, abortController.signal);
        if (!isZeroizableClient(client)) {
          terminationStatus = "factory-unavailable";
        } else if (stopRequested) {
          terminationStatus = "stopped";
        } else {
          phase = "read";
          readAttemptCount = 1;
          const record = await client.read(abortController.signal);
          if (stopRequested) {
            if (record === null || isRecord(record)) {
              lateSuccessSuppressionCount = 1;
            }
            terminationStatus = "stopped";
          } else if (record === null || isRecord(record)) {
            candidateResultStatus = record === null ? "missing" : "available";
            terminationStatus = "completed";
          } else {
            terminationStatus = "read-error";
          }
        }
      } catch {
        terminationStatus = stopRequested
          ? "stopped"
          : phase === "factory"
            ? "factory-error"
            : "read-error";
      }

      if (isZeroizableClient(client)) {
        disposeAttemptCount = 1;
        try {
          const acknowledgement = await client.dispose();
          if (
            acknowledgement === DISPOSE_ACKNOWLEDGEMENT &&
            countZeroFilled(first, second) === 2
          ) {
            disposeAcknowledgementCount = 1;
          } else {
            terminationStatus = "dispose-unverified";
          }
        } catch {
          terminationStatus = "dispose-error";
        }
      }

      if (stopRequested && terminationStatus === "completed") {
        lateSuccessSuppressionCount = 1;
        terminationStatus = "stopped";
      }

      const repositoryBufferZeroFillCount = wipeInputs(first, second);
      const zeroFillCompletionCount = countZeroFilled(first, second);
      const executionStatus =
        terminationStatus === "completed" &&
        disposeAcknowledgementCount === 1 &&
        zeroFillCompletionCount === 2 &&
        !stopRequested
          ? "pass"
          : "fail-closed";

      active = false;
      settled = true;
      abortController = null;

      return createResult({
        executionStatus,
        resultStatus:
          executionStatus === "pass" ? candidateResultStatus : "unavailable",
        factoryAttemptCount,
        readAttemptCount,
        stopRequestCount,
        repositoryBufferZeroFillCount,
        zeroFillCompletionCount,
        disposeAttemptCount,
        disposeAcknowledgementCount,
        postSettlementRepeatSuppressionCount: 0,
        lateSuccessSuppressionCount,
        terminationStatus,
      });
    },

    stop() {
      if (!active || settled || stopRequested) {
        return "termination_status=not-active";
      }
      stopRequested = true;
      stopRequestCount = 1;
      abortController?.abort();
      return "termination_status=stopping";
    },
  });
}

function isZeroizableClient(client) {
  return (
    client !== null &&
    typeof client === "object" &&
    typeof client.read === "function" &&
    typeof client.dispose === "function"
  );
}

function isRecord(value) {
  return value !== null && typeof value === "object";
}

function wipeInputs(first, second) {
  let count = 0;
  for (const input of [first, second]) {
    if (Buffer.isBuffer(input)) {
      input.fill(0);
      count += 1;
    }
  }
  return count;
}

function countZeroFilled(first, second) {
  let count = 0;
  for (const input of [first, second]) {
    if (Buffer.isBuffer(input) && input.every((byte) => byte === 0)) {
      count += 1;
    }
  }
  return count;
}

function createResult(result) {
  return Object.freeze({
    executionStatus: result.executionStatus,
    resultStatus: result.resultStatus,
    factoryAttemptCount: result.factoryAttemptCount,
    readAttemptCount: result.readAttemptCount,
    stopRequestCount: result.stopRequestCount,
    repositoryBufferZeroFillCount: result.repositoryBufferZeroFillCount,
    zeroFillCompletionCount: result.zeroFillCompletionCount,
    disposeAttemptCount: result.disposeAttemptCount,
    disposeAcknowledgementCount: result.disposeAcknowledgementCount,
    postSettlementRepeatSuppressionCount:
      result.postSettlementRepeatSuppressionCount,
    lateSuccessSuppressionCount: result.lateSuccessSuppressionCount,
    terminationStatus: result.terminationStatus,
  });
}
