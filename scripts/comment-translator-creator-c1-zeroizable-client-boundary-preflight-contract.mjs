import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  createSingleUseZeroizableClientBoundaryPreflight,
} from "./comment-translator-creator-c1-zeroizable-client-boundary-preflight.mjs";

const resultKeys = [
  "executionStatus",
  "resultStatus",
  "factoryAttemptCount",
  "readAttemptCount",
  "stopRequestCount",
  "repositoryBufferZeroFillCount",
  "zeroFillCompletionCount",
  "disposeAttemptCount",
  "disposeAcknowledgementCount",
  "postSettlementRepeatSuppressionCount",
  "lateSuccessSuppressionCount",
  "terminationStatus",
];

function createSyntheticPair() {
  return [randomBytes(4), randomBytes(6)];
}

function assertZeroFilled(...inputs) {
  for (const input of inputs) {
    assert.equal(input.every((byte) => byte === 0), true);
  }
}

function assertFixedSanitizedResult(actual, expected) {
  assert.deepEqual(Object.keys(actual), resultKeys);
  assert.deepEqual(actual, expected);
  assert.doesNotMatch(
    JSON.stringify(actual),
    /constructorArguments?|transportContents?|headerContents?|requestContents?|adapterResult|adapterError|errorMessage|stack|path|credential|token|cookie|identifier/i,
  );
}

function expectedResult(overrides) {
  return {
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    factoryAttemptCount: 1,
    readAttemptCount: 0,
    stopRequestCount: 0,
    repositoryBufferZeroFillCount: 2,
    zeroFillCompletionCount: 2,
    disposeAttemptCount: 0,
    disposeAcknowledgementCount: 0,
    postSettlementRepeatSuppressionCount: 0,
    lateSuccessSuppressionCount: 0,
    terminationStatus: "factory-error",
    ...overrides,
  };
}

async function runCompletedFixture(record, resultStatus) {
  const [first, second] = createSyntheticPair();
  let factoryCount = 0;
  let readCount = 0;
  let disposeCount = 0;
  const lifecycle = [];
  const preflight = createSingleUseZeroizableClientBoundaryPreflight({
    createClient(candidateFirst, candidateSecond, signal) {
      factoryCount += 1;
      lifecycle.push("factory");
      assert.equal(candidateFirst, first);
      assert.equal(candidateSecond, second);
      assert.equal(signal.aborted, false);
      return {
        async read(readSignal) {
          readCount += 1;
          lifecycle.push("read");
          assert.equal(readSignal, signal);
          assert.equal(readSignal.aborted, false);
          return record;
        },
        async dispose() {
          disposeCount += 1;
          lifecycle.push("dispose");
          candidateFirst.fill(0);
          candidateSecond.fill(0);
          return "zeroized";
        },
      };
    },
  });

  const result = await preflight.execute(first, second);

  assertZeroFilled(first, second);
  assert.deepEqual(lifecycle, ["factory", "read", "dispose"]);
  assert.deepEqual(
    { factoryCount, readCount, disposeCount },
    { factoryCount: 1, readCount: 1, disposeCount: 1 },
  );
  assertFixedSanitizedResult(
    result,
    expectedResult({
      executionStatus: "pass",
      resultStatus,
      readAttemptCount: 1,
      disposeAttemptCount: 1,
      disposeAcknowledgementCount: 1,
      terminationStatus: "completed",
    }),
  );

  return preflight;
}

const availablePreflight = await runCompletedFixture(Object.freeze({}), "available");
await runCompletedFixture(null, "missing");

{
  const [first, second] = createSyntheticPair();
  const result = await createSingleUseZeroizableClientBoundaryPreflight({
    createClient() {
      throw new Error();
    },
  }).execute(first, second);

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(result, expectedResult({}));
}

{
  const [first, second] = createSyntheticPair();
  const result = await createSingleUseZeroizableClientBoundaryPreflight({
    createClient() {
      return null;
    },
  }).execute(first, second);

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    result,
    expectedResult({
      terminationStatus: "factory-unavailable",
    }),
  );
}

{
  const [first, second] = createSyntheticPair();
  const result = await createSingleUseZeroizableClientBoundaryPreflight({
    createClient(candidateFirst, candidateSecond) {
      return {
        async read() {
          throw new Error();
        },
        async dispose() {
          candidateFirst.fill(0);
          candidateSecond.fill(0);
          return "zeroized";
        },
      };
    },
  }).execute(first, second);

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    result,
    expectedResult({
      readAttemptCount: 1,
      disposeAttemptCount: 1,
      disposeAcknowledgementCount: 1,
      terminationStatus: "read-error",
    }),
  );
}

{
  const [first, second] = createSyntheticPair();
  const result = await createSingleUseZeroizableClientBoundaryPreflight({
    createClient() {
      return {
        async read() {
          return Object.freeze({});
        },
        async dispose() {
          throw new Error();
        },
      };
    },
  }).execute(first, second);

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    result,
    expectedResult({
      readAttemptCount: 1,
      disposeAttemptCount: 1,
      terminationStatus: "dispose-error",
    }),
  );
}

{
  const [first, second] = createSyntheticPair();
  const result = await createSingleUseZeroizableClientBoundaryPreflight({
    createClient() {
      return {
        async read() {
          return Object.freeze({});
        },
        async dispose() {
          return "zeroized";
        },
      };
    },
  }).execute(first, second);

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    result,
    expectedResult({
      readAttemptCount: 1,
      disposeAttemptCount: 1,
      terminationStatus: "dispose-unverified",
    }),
  );
}

{
  const [first, second] = createSyntheticPair();
  const result = await createSingleUseZeroizableClientBoundaryPreflight({
    createClient(candidateFirst, candidateSecond) {
      return {
        async read() {
          return Object.freeze({});
        },
        async dispose() {
          candidateFirst.fill(0);
          candidateSecond.fill(0);
          return null;
        },
      };
    },
  }).execute(first, second);

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    result,
    expectedResult({
      readAttemptCount: 1,
      disposeAttemptCount: 1,
      terminationStatus: "dispose-unverified",
    }),
  );
}

{
  let releaseFactory;
  const factoryGate = new Promise((resolve) => {
    releaseFactory = resolve;
  });
  const [first, second] = createSyntheticPair();
  const preflight = createSingleUseZeroizableClientBoundaryPreflight({
    async createClient(candidateFirst, candidateSecond, signal) {
      await factoryGate;
      assert.equal(signal.aborted, true);
      return {
        async read() {
          return Object.freeze({});
        },
        async dispose() {
          candidateFirst.fill(0);
          candidateSecond.fill(0);
          return "zeroized";
        },
      };
    },
  });
  const resultPromise = preflight.execute(first, second);
  await Promise.resolve();
  assert.equal(preflight.stop(), "termination_status=stopping");
  releaseFactory();
  const result = await resultPromise;

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    result,
    expectedResult({
      stopRequestCount: 1,
      disposeAttemptCount: 1,
      disposeAcknowledgementCount: 1,
      terminationStatus: "stopped",
    }),
  );
}

{
  let releaseRead;
  const readGate = new Promise((resolve) => {
    releaseRead = resolve;
  });
  const [first, second] = createSyntheticPair();
  let readCount = 0;
  const preflight = createSingleUseZeroizableClientBoundaryPreflight({
    createClient(candidateFirst, candidateSecond, signal) {
      return {
        async read(readSignal) {
          readCount += 1;
          assert.equal(readSignal, signal);
          await readGate;
          assert.equal(readSignal.aborted, true);
          return Object.freeze({});
        },
        async dispose() {
          candidateFirst.fill(0);
          candidateSecond.fill(0);
          return "zeroized";
        },
      };
    },
  });
  const resultPromise = preflight.execute(first, second);
  await Promise.resolve();
  assert.equal(readCount, 1);
  assert.equal(preflight.stop(), "termination_status=stopping");
  releaseRead();
  const result = await resultPromise;

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    result,
    expectedResult({
      readAttemptCount: 1,
      stopRequestCount: 1,
      disposeAttemptCount: 1,
      disposeAcknowledgementCount: 1,
      lateSuccessSuppressionCount: 1,
      terminationStatus: "stopped",
    }),
  );
}

{
  let releaseDispose;
  let markDisposeStarted;
  const disposeGate = new Promise((resolve) => {
    releaseDispose = resolve;
  });
  const disposeStarted = new Promise((resolve) => {
    markDisposeStarted = resolve;
  });
  const [first, second] = createSyntheticPair();
  const preflight = createSingleUseZeroizableClientBoundaryPreflight({
    createClient(candidateFirst, candidateSecond) {
      return {
        async read() {
          return Object.freeze({});
        },
        async dispose() {
          markDisposeStarted();
          await disposeGate;
          candidateFirst.fill(0);
          candidateSecond.fill(0);
          return "zeroized";
        },
      };
    },
  });
  const resultPromise = preflight.execute(first, second);
  await disposeStarted;
  assert.equal(preflight.stop(), "termination_status=stopping");
  releaseDispose();
  const result = await resultPromise;

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    result,
    expectedResult({
      readAttemptCount: 1,
      stopRequestCount: 1,
      disposeAttemptCount: 1,
      disposeAcknowledgementCount: 1,
      lateSuccessSuppressionCount: 1,
      terminationStatus: "stopped",
    }),
  );
}

{
  const [first, second] = createSyntheticPair();
  const repeatResult = await availablePreflight.execute(first, second);

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    repeatResult,
    expectedResult({
      factoryAttemptCount: 0,
      postSettlementRepeatSuppressionCount: 1,
      terminationStatus: "repeat-suppressed",
    }),
  );
}

{
  const first = Buffer.alloc(0);
  const second = randomBytes(2);
  const result = await createSingleUseZeroizableClientBoundaryPreflight({
    createClient() {
      throw new Error("must not run");
    },
  }).execute(first, second);

  assertZeroFilled(first, second);
  assertFixedSanitizedResult(
    result,
    expectedResult({
      factoryAttemptCount: 0,
      terminationStatus: "not-started",
    }),
  );
}

const root = process.cwd();
const implementationPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-zeroizable-client-boundary-preflight.mjs",
);
const implementationSource = fs.readFileSync(implementationPath, "utf8");
assert.doesNotMatch(implementationSource, /\.toString\(|TextDecoder|String\(/);
assert.doesNotMatch(
  implementationSource,
  /@supabase|from\s+["']@supabase|fetch\(|https?:|authorization|cookie/i,
);

const productionSource = ["app", "components", "lib"]
  .flatMap((directory) => collectProductionSource(path.join(root, directory)))
  .join("\n");
assert.doesNotMatch(
  productionSource,
  /comment-translator-creator-c1-zeroizable-client-boundary-preflight/,
);

const authoritySources = [
  fs.readFileSync(path.join(root, "task.md"), "utf8"),
  fs.readFileSync(
    path.join(
      root,
      "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
    ),
    "utf8",
  ),
  fs.readFileSync(
    path.join(
      root,
      "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md",
    ),
    "utf8",
  ),
];
const authorityMarkers = [
  "PR #691 is merged at `340d6b0ec719e1e871205a03d48cda295f07068b`",
  "zeroizable_client_boundary_preflight_status=local-synthetic-pass-not-adopted",
  "zeroizable_client_boundary_repository_contract_status=pass",
  "zeroizable_client_boundary_production_api_status=absent-unverified",
  "zeroizable_client_boundary_decision=retain-disconnected-fail-closed",
  "zeroizable_client_boundary_required_api=exclusive-zeroizable-byte-ownership-copy-free-construction-read-explicit-dispose-ack",
  "zeroizable_client_boundary_unverified_scope=node-v8-transport-os-sdk-internals",
  "zeroizable_client_boundary_explicit_approval_status=absent-required-for-production-api-change",
  "Fixed comparison: same-process is rejected because immutable copies survive Buffer zero-fill; child-process proves bounded repository lifecycle and exit containment but not IPC/V8/runtime/OS/SDK copy erasure; zeroizable-client boundary is the recommended design direction but is not present or proven.",
  "承認します。C1 の現行 Buffer zero-fill 保証を維持する zeroizable-client boundary 候補として、exclusive mutable-byte ownership、immutable string copy を伴わない construction/read、bounded stop/error termination、全内部 mutable byte の zero-fill と明示 dispose acknowledgement、late success/repeat suppressionを必須条件とする adapter/client API 変更の設計・synthetic implementation preflight を開始することを承認します。現行 production SDK/client の採用、production wiring、real input/constructor/read、dependency install、network/remote operation、deploy/activation/CP2/public paid launchはこの承認に含めません。",
];

for (const source of authoritySources) {
  for (const marker of authorityMarkers) {
    assert.match(source, new RegExp(escapeRegExp(marker)));
  }
}

process.stdout.write(
  "comment-translator-creator-c1-zeroizable-client-boundary-preflight-contract: pass\n",
);

function collectProductionSource(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectProductionSource(entryPath);
    }
    return /\.(?:[cm]?[jt]sx?)$/.test(entry.name)
      ? [fs.readFileSync(entryPath, "utf8")]
      : [];
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
