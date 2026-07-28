import {
  bindExclusiveMutableByteOwnership,
  closeMutableByteRegistrationScope,
  createClientOwnershipTransfer,
  createExclusiveMutableByteOwnership,
  createMutableByteRegistrationScope,
  ownershipWasTransferred,
  registeredMutableByteCount,
  zeroFilledMutableByteCount,
  zeroizeAllRegisteredMutableBytes,
} from "./comment-translator-creator-c1-zeroizable-client-api-preflight-ownership.mjs";

// allow: SIZE_OK - one coordinator keeps stop, dispose, and settlement ordering reviewable.
export { createExclusiveMutableByteOwnership };

export function createSingleUseZeroizableClientApiPreflight({ createClient }) {
  if (typeof createClient !== "function") {
    throw new TypeError("zeroizable client API unavailable");
  }

  let used = false;
  let active = false;
  let settled = false;
  let stopRequested = false;
  let stopRequestCount = 0;
  let abortController = null;
  let resolveStop = null;

  return Object.freeze({
    async execute(ownership) {
      const ownershipState = bindExclusiveMutableByteOwnership(ownership);
      if (used) {
        const repositoryZeroFillCount = ownershipState
          ? zeroizeAllRegisteredMutableBytes(ownershipState)
          : 0;
        return createResult({
          factoryAttemptCount: 0,
          repositoryZeroFillCount,
          repeatSuppressionCount: 1,
          terminationStatus: settled
            ? "repeat-suppressed"
            : "in-flight-repeat-suppressed",
        });
      }
      used = true;

      if (!ownershipState) {
        settled = true;
        return createResult({
          factoryAttemptCount: 0,
          repositoryZeroFillCount: 0,
          terminationStatus: "not-started",
        });
      }

      const zeroizationRegistry =
        createMutableByteRegistrationScope(ownershipState);

      let client;
      try {
        client = createClient(zeroizationRegistry);
      } catch {
        closeMutableByteRegistrationScope(ownershipState);
        settled = true;
        return createResult({
          repositoryZeroFillCount:
            zeroizeAllRegisteredMutableBytes(ownershipState),
          terminationStatus: "factory-error",
        });
      }
      closeMutableByteRegistrationScope(ownershipState);

      const clientContract = captureZeroizableClientContract(client);
      if (clientContract === null) {
        settled = true;
        return createResult({
          repositoryZeroFillCount:
            zeroizeAllRegisteredMutableBytes(ownershipState),
          terminationStatus: "factory-unavailable",
        });
      }

      active = true;
      abortController = new AbortController();
      const stopOutcome = new Promise((resolve) => {
        resolveStop = resolve;
      });
      const clientOwnership = createClientOwnershipTransfer(ownershipState);

      let readValue;
      try {
        readValue = clientContract.read(
          clientOwnership,
          abortController.signal,
        );
      } catch {
        active = false;
        const result = settleAttempt({
          client: clientContract,
          ownershipState,
          stopRequestCount,
          terminationStatus: stopRequested ? "stopped" : "read-error",
          lateSuccessSuppressionCount: stopRequested ? 1 : 0,
        });
        finishAttempt();
        return result;
      }

      const readOutcome = Promise.resolve(readValue).then(
        (value) => ({ kind: "value", value }),
        () => ({ kind: "error" }),
      );
      const outcome = await Promise.race([readOutcome, stopOutcome]);

      let resultStatus = "unavailable";
      let terminationStatus = "read-error";
      let lateSuccessSuppressionCount = 0;
      if (outcome.kind === "stopped" || stopRequested) {
        terminationStatus = "stopped";
        lateSuccessSuppressionCount = 1;
        readOutcome.then(() => {
          zeroizeAllRegisteredMutableBytes(ownershipState);
        });
      } else if (
        outcome.kind === "value" &&
        (outcome.value === null ||
          (typeof outcome.value === "object" && outcome.value !== null))
      ) {
        resultStatus = outcome.value === null ? "missing" : "available";
        terminationStatus = "completed";
      }

      active = false;
      const result = settleAttempt({
        client: clientContract,
        ownershipState,
        stopRequestCount,
        terminationStatus,
        resultStatus,
        lateSuccessSuppressionCount,
      });
      finishAttempt();
      return result;

      function finishAttempt() {
        active = false;
        settled = true;
        abortController = null;
        resolveStop = null;
      }
    },

    stop() {
      if (!active || settled || stopRequested) {
        return "termination_status=not-active";
      }
      stopRequested = true;
      stopRequestCount = 1;
      abortController.abort();
      resolveStop({ kind: "stopped" });
      return "termination_status=stopping";
    },
  });
}

function settleAttempt({
  client,
  ownershipState,
  stopRequestCount,
  terminationStatus,
  resultStatus = "unavailable",
  lateSuccessSuppressionCount = 0,
}) {
  let acknowledgement = null;
  let disposeFailure = null;
  try {
    acknowledgement = client.dispose();
  } catch {
    disposeFailure = "dispose-error";
  }

  let acknowledgementThenable = false;
  let acknowledgementStatus = null;
  let acknowledgementOwnedMutableByteCount = null;
  let acknowledgementZeroFilledMutableByteCount = null;
  if (disposeFailure === null) {
    try {
      acknowledgementThenable = isThenable(acknowledgement);
      if (acknowledgementThenable) {
        Promise.resolve(acknowledgement).catch(() => {});
      } else {
        acknowledgementStatus = acknowledgement?.status;
        acknowledgementOwnedMutableByteCount =
          acknowledgement?.ownedMutableByteCount;
        acknowledgementZeroFilledMutableByteCount =
          acknowledgement?.zeroFilledMutableByteCount;
      }
    } catch {
      disposeFailure = "dispose-error";
    }
  }
  const registeredCount = registeredMutableByteCount(ownershipState);
  const acknowledgementVerified =
    disposeFailure === null &&
    !acknowledgementThenable &&
    acknowledgementStatus === "zeroized" &&
    acknowledgementOwnedMutableByteCount === registeredCount &&
    acknowledgementZeroFilledMutableByteCount === registeredCount &&
    zeroFilledMutableByteCount(ownershipState) === registeredCount;

  if (!acknowledgementVerified) {
    terminationStatus = disposeFailure ?? "dispose-unverified";
  }
  const repositoryZeroFillCount = acknowledgementVerified
    ? 0
    : zeroizeAllRegisteredMutableBytes(ownershipState);
  const completed =
    terminationStatus === "completed" &&
    ownershipWasTransferred(ownershipState) &&
    acknowledgementVerified &&
    stopRequestCount === 0;

  return createResult({
    executionStatus: completed ? "pass" : "fail-closed",
    resultStatus: completed ? resultStatus : "unavailable",
    readAttemptCount: 1,
    ownershipTransferCount: ownershipWasTransferred(ownershipState) ? 1 : 0,
    stopRequestCount,
    disposeAttemptCount: 1,
    disposeAcknowledgementCount: acknowledgementVerified ? 1 : 0,
    clientOwnedMutableByteCount: registeredCount,
    clientZeroFilledMutableByteCount: acknowledgementVerified
      ? registeredCount
      : 0,
    repositoryZeroFillCount,
    successSettlementCount: completed ? 1 : 0,
    lateSuccessSuppressionCount,
    terminationStatus,
  });
}

function captureZeroizableClientContract(client) {
  try {
    if (isThenable(client)) {
      Promise.resolve(client).catch(() => {});
      return null;
    }
    if (client === null || typeof client !== "object") {
      return null;
    }
    const read = client.read;
    const dispose = client.dispose;
    if (typeof read !== "function" || typeof dispose !== "function") {
      return null;
    }
    return Object.freeze({
      read(...args) {
        return Reflect.apply(read, client, args);
      },
      dispose() {
        return Reflect.apply(dispose, client, []);
      },
    });
  } catch {
    return null;
  }
}

function isThenable(value) {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof value.then === "function"
  );
}

function createResult(overrides) {
  return Object.freeze({
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    factoryAttemptCount: 1,
    readAttemptCount: 0,
    ownershipTransferCount: 0,
    stopRequestCount: 0,
    disposeAttemptCount: 0,
    disposeAcknowledgementCount: 0,
    clientOwnedMutableByteCount: 0,
    clientZeroFilledMutableByteCount: 0,
    repositoryZeroFillCount: 0,
    successSettlementCount: 0,
    lateSuccessSuppressionCount: 0,
    repeatSuppressionCount: 0,
    terminationStatus: "factory-error",
    ...overrides,
  });
}
