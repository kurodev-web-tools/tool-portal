import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// allow: SIZE_OK - one executable matrix reviews the complete lifecycle ordering.
const root = process.cwd();
const implementationPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-zeroizable-client-api-preflight.mjs",
);

assert.equal(
  fs.existsSync(implementationPath),
  true,
  "zeroizable client API preflight implementation exists",
);

const {
  createExclusiveMutableByteOwnership,
  createSingleUseZeroizableClientApiPreflight,
} = await import("./comment-translator-creator-c1-zeroizable-client-api-preflight.mjs");

const resultKeys = [
  "executionStatus",
  "resultStatus",
  "factoryAttemptCount",
  "readAttemptCount",
  "ownershipTransferCount",
  "stopRequestCount",
  "disposeAttemptCount",
  "disposeAcknowledgementCount",
  "clientOwnedMutableByteCount",
  "clientZeroFilledMutableByteCount",
  "repositoryZeroFillCount",
  "successSettlementCount",
  "lateSuccessSuppressionCount",
  "repeatSuppressionCount",
  "terminationStatus",
];

function createInputs() {
  return [randomBytes(8), randomBytes(12)];
}

function createScratch() {
  let scratch;
  do {
    scratch = randomBytes(4);
  } while (scratch.every((byte) => byte === 0));
  return scratch;
}

function assertZeroFilled(...inputs) {
  for (const input of inputs) {
    assert.equal(input.every((byte) => byte === 0), true);
  }
}

function assertSanitizedResult(actual, expected) {
  assert.deepEqual(Object.keys(actual), resultKeys);
  assert.deepEqual(actual, expected);
  assert.doesNotMatch(
    JSON.stringify(actual),
    /contents?|arguments?|adapterResult|adapterError|errorMessage|stack|path|credential|token|cookie|identifier/i,
  );
}

function expectedResult(overrides) {
  return {
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
    repositoryZeroFillCount: 2,
    successSettlementCount: 0,
    lateSuccessSuppressionCount: 0,
    repeatSuppressionCount: 0,
    terminationStatus: "factory-error",
    ...overrides,
  };
}

for (const createAliasedPair of [
  () => {
    const shared = randomBytes(8);
    return [shared, shared];
  },
  () => {
    const shared = randomBytes(12);
    return [shared.subarray(0, 8), shared.subarray(4, 12)];
  },
]) {
  const [first, second] = createAliasedPair();
  assert.throws(
    () => createExclusiveMutableByteOwnership(first, second),
    new TypeError("exclusive mutable byte ownership unavailable"),
  );
  assertZeroFilled(first, second);
}

function createClientFixture({
  zeroizationRegistry,
  record = Object.freeze({}),
  disposeStatus = "verified",
  onRead = null,
  onDispose = null,
  onScratch = null,
} = {}) {
  assert.deepEqual(Object.keys(zeroizationRegistry), ["registerMutableBytes"]);
  assert.equal(Object.isFrozen(zeroizationRegistry), true);
  const scratch = createScratch();
  zeroizationRegistry.registerMutableBytes(scratch);
  onScratch?.(scratch);
  let ownedInputs = null;
  return {
    read(ownership, signal) {
      assert.deepEqual(Object.keys(ownership), ["take"]);
      assert.equal(Object.isFrozen(ownership), true);
      assert.equal(signal.aborted, false);
      ownedInputs = ownership.take();
      assert.throws(
        () => ownership.take(),
        new TypeError("exclusive mutable byte ownership unavailable"),
      );
      onRead?.(ownedInputs, signal);
      return record;
    },
    dispose() {
      onDispose?.();
      if (disposeStatus === "error") {
        throw new Error();
      }
      if (disposeStatus === "async") {
        return Promise.resolve({ status: "zeroized" });
      }
      if (disposeStatus === "async-error") {
        return Promise.reject(new Error());
      }
      if (disposeStatus === "verified") {
        ownedInputs.first.fill(0);
        ownedInputs.second.fill(0);
        scratch.fill(0);
        return Object.freeze({
          status: "zeroized",
          ownedMutableByteCount: 3,
          zeroFilledMutableByteCount: 3,
        });
      }
      return Object.freeze({
        status: "unverified",
        ownedMutableByteCount: 3,
        zeroFilledMutableByteCount: 0,
      });
    },
  };
}

async function runSuccess(record, resultStatus) {
  const [first, second] = createInputs();
  const ownership = createExclusiveMutableByteOwnership(first, second);
  assert.equal(Object.isFrozen(ownership), true);
  assert.deepEqual(Object.keys(ownership), []);
  let factoryArgumentCount = -1;
  let receivedInputs = null;
  let scratch = null;
  const lifecycle = [];
  const preflight = createSingleUseZeroizableClientApiPreflight({
    createClient(...args) {
      lifecycle.push("factory");
      factoryArgumentCount = args.length;
      return createClientFixture({
        zeroizationRegistry: args[0],
        record,
        onRead(inputs) {
          lifecycle.push("read");
          receivedInputs = inputs;
        },
        onDispose() {
          lifecycle.push("dispose");
        },
        onScratch(value) {
          scratch = value;
        },
      });
    },
  });

  const result = await preflight.execute(ownership);

  assert.equal(factoryArgumentCount, 1);
  assert.equal(receivedInputs.first, first);
  assert.equal(receivedInputs.second, second);
  assertZeroFilled(first, second, scratch);
  assert.deepEqual(lifecycle, ["factory", "read", "dispose"]);
  assertSanitizedResult(
    result,
    expectedResult({
      executionStatus: "pass",
      resultStatus,
      readAttemptCount: 1,
      ownershipTransferCount: 1,
      disposeAttemptCount: 1,
      disposeAcknowledgementCount: 1,
      clientOwnedMutableByteCount: 3,
      clientZeroFilledMutableByteCount: 3,
      repositoryZeroFillCount: 0,
      successSettlementCount: 1,
      terminationStatus: "completed",
    }),
  );
  return preflight;
}

const completedPreflight = await runSuccess(Object.freeze({}), "available");
await runSuccess(null, "missing");

for (const fixture of [
  {
    label: "factory-error",
    createClient() {
      throw new Error();
    },
    expected: expectedResult({}),
  },
  {
    label: "factory-unavailable",
    createClient() {
      return null;
    },
    expected: expectedResult({ terminationStatus: "factory-unavailable" }),
  },
  {
    label: "async-factory-rejected",
    createClient() {
      return Promise.resolve(null);
    },
    expected: expectedResult({ terminationStatus: "factory-unavailable" }),
  },
  {
    label: "async-factory-rejection-suppressed",
    createClient() {
      return Promise.reject(new Error());
    },
    expected: expectedResult({ terminationStatus: "factory-unavailable" }),
  },
  {
    label: "registered-factory-error",
    createClient(zeroizationRegistry, onScratch) {
      const scratch = createScratch();
      zeroizationRegistry.registerMutableBytes(scratch);
      onScratch(scratch);
      throw new Error();
    },
    expected: expectedResult({
      repositoryZeroFillCount: 3,
    }),
  },
  {
    label: "client-getter-error",
    createClient(zeroizationRegistry, onScratch) {
      const scratch = createScratch();
      zeroizationRegistry.registerMutableBytes(scratch);
      onScratch(scratch);
      return Object.defineProperty({}, "read", {
        get() {
          throw new Error();
        },
      });
    },
    expected: expectedResult({
      repositoryZeroFillCount: 3,
      terminationStatus: "factory-unavailable",
    }),
  },
  {
    label: "read-error",
    createClient(zeroizationRegistry, onScratch) {
      const client = createClientFixture({
        zeroizationRegistry,
        onScratch,
      });
      return {
        read(ownership, signal) {
          client.read(ownership, signal);
          throw new Error();
        },
        dispose: client.dispose,
      };
    },
    expected: expectedResult({
      readAttemptCount: 1,
      ownershipTransferCount: 1,
      disposeAttemptCount: 1,
      disposeAcknowledgementCount: 1,
      clientOwnedMutableByteCount: 3,
      clientZeroFilledMutableByteCount: 3,
      repositoryZeroFillCount: 0,
      terminationStatus: "read-error",
    }),
  },
  {
    label: "dispose-error",
    createClient(zeroizationRegistry, onScratch) {
      return createClientFixture({
        zeroizationRegistry,
        disposeStatus: "error",
        onScratch,
      });
    },
    expected: expectedResult({
      readAttemptCount: 1,
      ownershipTransferCount: 1,
      disposeAttemptCount: 1,
      clientOwnedMutableByteCount: 3,
      repositoryZeroFillCount: 3,
      terminationStatus: "dispose-error",
    }),
  },
  {
    label: "dispose-acknowledgement-getter-error",
    createClient(zeroizationRegistry, onScratch) {
      const scratch = createScratch();
      zeroizationRegistry.registerMutableBytes(scratch);
      onScratch(scratch);
      let ownedInputs = null;
      return {
        read(ownership) {
          ownedInputs = ownership.take();
          return Object.freeze({});
        },
        dispose() {
          assert.notEqual(ownedInputs, null);
          return Object.defineProperty({}, "status", {
            get() {
              throw new Error();
            },
          });
        },
      };
    },
    expected: expectedResult({
      readAttemptCount: 1,
      ownershipTransferCount: 1,
      disposeAttemptCount: 1,
      clientOwnedMutableByteCount: 3,
      repositoryZeroFillCount: 3,
      terminationStatus: "dispose-error",
    }),
  },
  {
    label: "dispose-unverified",
    createClient(zeroizationRegistry, onScratch) {
      return createClientFixture({
        zeroizationRegistry,
        disposeStatus: "unverified",
        onScratch,
      });
    },
    expected: expectedResult({
      readAttemptCount: 1,
      ownershipTransferCount: 1,
      disposeAttemptCount: 1,
      clientOwnedMutableByteCount: 3,
      repositoryZeroFillCount: 3,
      terminationStatus: "dispose-unverified",
    }),
  },
  {
    label: "dispose-async-rejected",
    createClient(zeroizationRegistry, onScratch) {
      return createClientFixture({
        zeroizationRegistry,
        disposeStatus: "async",
        onScratch,
      });
    },
    expected: expectedResult({
      readAttemptCount: 1,
      ownershipTransferCount: 1,
      disposeAttemptCount: 1,
      clientOwnedMutableByteCount: 3,
      repositoryZeroFillCount: 3,
      terminationStatus: "dispose-unverified",
    }),
  },
  {
    label: "dispose-async-rejection-suppressed",
    createClient(zeroizationRegistry, onScratch) {
      return createClientFixture({
        zeroizationRegistry,
        disposeStatus: "async-error",
        onScratch,
      });
    },
    expected: expectedResult({
      readAttemptCount: 1,
      ownershipTransferCount: 1,
      disposeAttemptCount: 1,
      clientOwnedMutableByteCount: 3,
      repositoryZeroFillCount: 3,
      terminationStatus: "dispose-unverified",
    }),
  },
]) {
  const [first, second] = createInputs();
  const scratchBuffers = [];
  const result = await createSingleUseZeroizableClientApiPreflight({
    createClient(zeroizationRegistry) {
      return fixture.createClient(zeroizationRegistry, (scratch) => {
        scratchBuffers.push(scratch);
      });
    },
  }).execute(createExclusiveMutableByteOwnership(first, second));
  assertZeroFilled(first, second, ...scratchBuffers);
  assertSanitizedResult(result, fixture.expected);
}

{
  const [first, second] = createInputs();
  let scratch = null;
  let stopResponse = null;
  let preflight = null;
  preflight = createSingleUseZeroizableClientApiPreflight({
    createClient(zeroizationRegistry) {
      return createClientFixture({
        zeroizationRegistry,
        onScratch(value) {
          scratch = value;
        },
        onDispose() {
          stopResponse = preflight.stop();
        },
      });
    },
  });
  const result = await preflight.execute(
    createExclusiveMutableByteOwnership(first, second),
  );
  assert.equal(stopResponse, "termination_status=not-active");
  assertZeroFilled(first, second, scratch);
  assertSanitizedResult(
    result,
    expectedResult({
      executionStatus: "pass",
      resultStatus: "available",
      readAttemptCount: 1,
      ownershipTransferCount: 1,
      disposeAttemptCount: 1,
      disposeAcknowledgementCount: 1,
      clientOwnedMutableByteCount: 3,
      clientZeroFilledMutableByteCount: 3,
      repositoryZeroFillCount: 0,
      successSettlementCount: 1,
      terminationStatus: "completed",
    }),
  );
}

{
  let releaseRead;
  let markLateReadFinished;
  const readGate = new Promise((resolve) => {
    releaseRead = resolve;
  });
  const lateReadFinished = new Promise((resolve) => {
    markLateReadFinished = resolve;
  });
  const [first, second] = createInputs();
  let readSettledCount = 0;
  let scratch = null;
  const preflight = createSingleUseZeroizableClientApiPreflight({
    createClient(zeroizationRegistry) {
      const client = createClientFixture({
        zeroizationRegistry,
        onRead() {},
        onScratch(value) {
          scratch = value;
        },
      });
      return {
        async read(ownership, signal) {
          client.read(ownership, signal);
          await readGate;
          first.fill(randomBytes(1)[0] || 1);
          readSettledCount += 1;
          markLateReadFinished();
          return Object.freeze({});
        },
        dispose: client.dispose,
      };
    },
  });
  const resultPromise = preflight.execute(
    createExclusiveMutableByteOwnership(first, second),
  );
  await Promise.resolve();
  const [repeatFirst, repeatSecond] = createInputs();
  assertSanitizedResult(
    await preflight.execute(
      createExclusiveMutableByteOwnership(repeatFirst, repeatSecond),
    ),
    expectedResult({
      factoryAttemptCount: 0,
      repeatSuppressionCount: 1,
      terminationStatus: "in-flight-repeat-suppressed",
    }),
  );
  assertZeroFilled(repeatFirst, repeatSecond);
  assert.equal(preflight.stop(), "termination_status=stopping");
  const result = await resultPromise;

  assertZeroFilled(first, second, scratch);
  assert.equal(readSettledCount, 0);
  assertSanitizedResult(
    result,
    expectedResult({
      readAttemptCount: 1,
      ownershipTransferCount: 1,
      stopRequestCount: 1,
      disposeAttemptCount: 1,
      disposeAcknowledgementCount: 1,
      clientOwnedMutableByteCount: 3,
      clientZeroFilledMutableByteCount: 3,
      repositoryZeroFillCount: 0,
      lateSuccessSuppressionCount: 1,
      terminationStatus: "stopped",
    }),
  );
  releaseRead();
  await lateReadFinished;
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(readSettledCount, 1);
  assertZeroFilled(first, second, scratch);
}

{
  const [first, second] = createInputs();
  const repeatResult = await completedPreflight.execute(
    createExclusiveMutableByteOwnership(first, second),
  );
  assertZeroFilled(first, second);
  assertSanitizedResult(
    repeatResult,
    expectedResult({
      factoryAttemptCount: 0,
      repeatSuppressionCount: 1,
      terminationStatus: "repeat-suppressed",
    }),
  );
}

const implementationSource = [
  fs.readFileSync(implementationPath, "utf8"),
  fs.readFileSync(
    path.join(
      root,
      "scripts/comment-translator-creator-c1-zeroizable-client-api-preflight-ownership.mjs",
    ),
    "utf8",
  ),
].join("\n");
assert.doesNotMatch(implementationSource, /\.toString\(|TextDecoder|String\(/);
assert.doesNotMatch(
  implementationSource,
  /@supabase|fetch\(|https?:|authorization|cookie|\bheader\b|\brequest\b|\btransport\b/i,
);

const productionSource = ["app", "components", "lib"]
  .flatMap((directory) => collectSource(path.join(root, directory)))
  .join("\n");
assert.doesNotMatch(
  productionSource,
  /comment-translator-creator-c1-zeroizable-client-api-preflight/,
);

process.stdout.write(
  "comment-translator-creator-c1-zeroizable-client-api-preflight-contract: pass\n",
);

function collectSource(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? collectSource(entryPath)
      : /\.(?:[cm]?[jt]sx?)$/.test(entry.name)
        ? [fs.readFileSync(entryPath, "utf8")]
        : [];
  });
}
