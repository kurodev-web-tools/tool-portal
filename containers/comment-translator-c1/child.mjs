const ALLOWED_RESULTS = new Set(["available", "missing", "unavailable"]);

process.once("message", async (message) => {
  if (!isInputMessage(message)) {
    if (message !== null && typeof message === "object") {
      for (const value of Object.values(message)) {
        if (Buffer.isBuffer(value)) value.fill(0);
      }
    }
    process.exit(1);
  }

  const inputs = [message.endpoint, message.credential, message.billingReference];
  let constructionCount = 0;
  let readCount = 0;
  let resultStatus = "unavailable";

  const wipeAndExit = (exitCode) => {
    for (const input of inputs) input.fill(0);
    process.exitCode = exitCode;
    process.disconnect();
  };

  process.once("SIGTERM", () => {
    for (const input of inputs) input.fill(0);
    process.exit(1);
  });

  try {
    constructionCount = 1;
    const inertReader = createInertReader();
    readCount = 1;
    resultStatus = await inertReader.read();
  } catch {
    resultStatus = "unavailable";
  }

  const exitCode = resultStatus === "unavailable" ? 1 : 0;
  process.send?.({
    executionStatus: exitCode === 0 ? "pass" : "fail-closed",
    resultStatus,
    childBufferZeroFillCount: 3,
    childConstructionAttemptCount: constructionCount,
    childReadAttemptCount: readCount,
  }, () => wipeAndExit(exitCode));
});

function createInertReader() {
  const configured = process.env.C1_SYNTHETIC_RESULT;
  const result = ALLOWED_RESULTS.has(configured) ? configured : "unavailable";
  return Object.freeze({
    async read() {
      return result;
    },
  });
}

function isInputMessage(message) {
  return message !== null
    && typeof message === "object"
    && Object.keys(message).sort().join(",") === "billingReference,credential,endpoint"
    && [message.endpoint, message.credential, message.billingReference]
      .every((input) => Buffer.isBuffer(input) && input.length > 0);
}
