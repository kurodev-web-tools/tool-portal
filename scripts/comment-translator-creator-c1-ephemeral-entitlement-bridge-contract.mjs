import assert from "node:assert/strict";

import * as runnerModule from "./comment-translator-creator-c1-ephemeral-runner.mjs";

const { createEphemeralState, createPaidEntitlementReadBridge } = runnerModule;
const syntheticReadReference = `ctbill_${"a".repeat(24)}`;
const notSettled = Symbol("not-settled");
const forbiddenOutput =
  /synthetic-(?:endpoint|secret|factory|read)|ctbill_|aaaa|bbbb|cccc|dddd|eeee|ffff/;

function assertFixedResult(actual, expected) {
  assert.deepEqual(actual, expected);
  assert.deepEqual(Object.keys(actual), [
    "executionStatus",
    "sourceStatus",
    "readAttemptCount",
    "resultStatus",
  ]);
  assert.doesNotMatch(JSON.stringify(actual), forbiddenOutput);
}

function holdSyntheticInputs(state, firstByte, secondByte) {
  const first = Buffer.alloc(4, firstByte);
  const second = Buffer.alloc(5, secondByte);
  state.hold(first, second);
  return { first, second };
}

assert.equal(
  typeof createPaidEntitlementReadBridge,
  "function",
  "runner exports the paid-entitlement factory/store/read bridge",
);

{
  let factoryCount = 0;
  let clientCount = 0;
  let readCount = 0;
  let expectedFirst;
  let expectedSecond;
  const readAdapter = createPaidEntitlementReadBridge({
    readReference: syntheticReadReference,
    createStore(first, second) {
      factoryCount += 1;
      assert.equal(first, expectedFirst);
      assert.equal(second, expectedSecond);
      clientCount += 1;
      return {
        status: "ready",
        store: {
          async readByBillingUserReference(reference) {
            readCount += 1;
            assert.equal(reference, syntheticReadReference);
            return Object.freeze({});
          },
        },
        missingEnvReferences: [],
      };
    },
  });
  const state = createEphemeralState({ readAdapter });
  ({ first: expectedFirst, second: expectedSecond } = holdSyntheticInputs(
    state,
    0x61,
    0x62,
  ));

  assertFixedResult(await state.executeRead(), {
    executionStatus: "pass",
    sourceStatus: "complete",
    readAttemptCount: 1,
    resultStatus: "available",
  });
  assert.deepEqual(
    { factoryCount, clientCount, readCount },
    { factoryCount: 1, clientCount: 1, readCount: 1 },
  );
  assertFixedResult(await state.executeRead(), {
    executionStatus: "fail-closed",
    sourceStatus: "complete",
    readAttemptCount: 0,
    resultStatus: "unavailable",
  });
  assert.deepEqual(
    { factoryCount, clientCount, readCount },
    { factoryCount: 1, clientCount: 1, readCount: 1 },
  );
  state.wipe();
  assert.equal(expectedFirst.every((byte) => byte === 0), true);
  assert.equal(expectedSecond.every((byte) => byte === 0), true);
}

{
  let factoryCount = 0;
  let clientCount = 0;
  let readCount = 0;
  const state = createEphemeralState({
    readAdapter: createPaidEntitlementReadBridge({
      readReference: syntheticReadReference,
      createStore() {
        factoryCount += 1;
        clientCount += 1;
        return {
          status: "ready",
          store: {
            async readByBillingUserReference() {
              readCount += 1;
              return null;
            },
          },
          missingEnvReferences: [],
        };
      },
    }),
  });
  holdSyntheticInputs(state, 0x63, 0x64);

  assertFixedResult(await state.executeRead(), {
    executionStatus: "pass",
    sourceStatus: "complete",
    readAttemptCount: 1,
    resultStatus: "missing",
  });
  assert.deepEqual(
    { factoryCount, clientCount, readCount },
    { factoryCount: 1, clientCount: 1, readCount: 1 },
  );
  state.wipe();
}

{
  let factoryCount = 0;
  const readAdapter = createPaidEntitlementReadBridge({
    readReference: syntheticReadReference,
    createStore() {
      factoryCount += 1;
      throw new Error("synthetic-factory-error");
    },
  });
  const state = createEphemeralState({ readAdapter });

  assertFixedResult(await state.executeRead(), {
    executionStatus: "fail-closed",
    sourceStatus: "incomplete",
    readAttemptCount: 0,
    resultStatus: "unavailable",
  });
  assert.equal(factoryCount, 0);
  await assert.rejects(
    () => readAdapter(Buffer.alloc(0), Buffer.alloc(1, 0x65)),
    { message: "paid entitlement bridge unavailable" },
  );
  assert.equal(factoryCount, 0);
  state.wipe();
}

for (const fixture of [
  {
    label: "factory-unavailable",
    createStore() {
      return {
        status: "unavailable",
        store: null,
        missingEnvReferences: [],
        reason: "trusted-service-role-env-missing",
      };
    },
    expectedClientCount: 0,
    expectedReadCount: 0,
  },
  {
    label: "factory-error",
    createStore() {
      throw new Error("synthetic-factory-error");
    },
    expectedClientCount: 0,
    expectedReadCount: 0,
  },
  {
    label: "read-error",
    createStore({ countClient, countRead }) {
      countClient();
      return {
        status: "ready",
        store: {
          async readByBillingUserReference() {
            countRead();
            throw new Error("synthetic-read-error");
          },
        },
        missingEnvReferences: [],
      };
    },
    expectedClientCount: 1,
    expectedReadCount: 1,
  },
]) {
  let factoryCount = 0;
  let clientCount = 0;
  let readCount = 0;
  const state = createEphemeralState({
    readAdapter: createPaidEntitlementReadBridge({
      readReference: syntheticReadReference,
      createStore(first, second) {
        factoryCount += 1;
        return fixture.createStore({
          first,
          second,
          countClient() {
            clientCount += 1;
          },
          countRead() {
            readCount += 1;
          },
        });
      },
    }),
  });
  holdSyntheticInputs(state, 0x65, 0x66);

  assertFixedResult(await state.executeRead(), {
    executionStatus: "fail-closed",
    sourceStatus: "complete",
    readAttemptCount: 1,
    resultStatus: "unavailable",
  });
  assert.deepEqual(
    { factoryCount, clientCount, readCount },
    {
      factoryCount: 1,
      clientCount: fixture.expectedClientCount,
      readCount: fixture.expectedReadCount,
    },
    fixture.label,
  );
  state.wipe();
}

{
  let releaseFactory;
  let factoryCount = 0;
  let clientCount = 0;
  let readCount = 0;
  const factoryReady = new Promise((resolve) => {
    releaseFactory = resolve;
  });
  const state = createEphemeralState({
    readAdapter: createPaidEntitlementReadBridge({
      readReference: syntheticReadReference,
      async createStore() {
        factoryCount += 1;
        await factoryReady;
        clientCount += 1;
        return {
          status: "ready",
          store: {
            async readByBillingUserReference() {
              readCount += 1;
              return Object.freeze({});
            },
          },
          missingEnvReferences: [],
        };
      },
    }),
  });
  holdSyntheticInputs(state, 0x67, 0x68);

  const resultPromise = state.executeRead();
  await Promise.resolve();
  assert.equal(state.control("stop"), "termination_status=stopping");
  const stoppedResult = await Promise.race([
    resultPromise,
    new Promise((resolve) => setImmediate(() => resolve(notSettled))),
  ]);
  assert.notEqual(stoppedResult, notSettled);

  assertFixedResult(stoppedResult, {
    executionStatus: "fail-closed",
    sourceStatus: "complete",
    readAttemptCount: 1,
    resultStatus: "unavailable",
  });
  assert.deepEqual(
    { factoryCount, clientCount, readCount },
    { factoryCount: 1, clientCount: 0, readCount: 0 },
  );
  releaseFactory();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    { factoryCount, clientCount, readCount },
    { factoryCount: 1, clientCount: 1, readCount: 0 },
  );
}

{
  let releaseRead;
  let readCount = 0;
  const readReady = new Promise((resolve) => {
    releaseRead = resolve;
  });
  const state = createEphemeralState({
    readAdapter: createPaidEntitlementReadBridge({
      readReference: syntheticReadReference,
      createStore() {
        return {
          status: "ready",
          store: {
            async readByBillingUserReference() {
              readCount += 1;
              await readReady;
              return Object.freeze({});
            },
          },
          missingEnvReferences: [],
        };
      },
    }),
  });
  holdSyntheticInputs(state, 0x69, 0x6a);

  const resultPromise = state.executeRead();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(readCount, 1);
  assert.equal(state.control("stop"), "termination_status=stopping");
  const stoppedResult = await Promise.race([
    resultPromise,
    new Promise((resolve) => setImmediate(() => resolve(notSettled))),
  ]);
  assert.notEqual(stoppedResult, notSettled);
  releaseRead();

  assertFixedResult(stoppedResult, {
    executionStatus: "fail-closed",
    sourceStatus: "complete",
    readAttemptCount: 1,
    resultStatus: "unavailable",
  });
  assert.equal(readCount, 1);
}

process.stdout.write(
  "comment-translator-creator-c1-ephemeral-entitlement-bridge-contract: pass\n",
);
