import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";

import {
  createSingleUseChildProcessOwnershipPreflight,
} from "./comment-translator-creator-c1-process-isolation-preflight.mjs";

const expectedResultKeys = [
  "executionStatus",
  "resultStatus",
  "childSpawnAttemptCount",
  "parentTransferAttemptCount",
  "parentWriteAttemptCount",
  "parentBufferZeroFillCount",
  "childConstructionAttemptCount",
  "childReadAttemptCount",
  "terminationStatus",
  "postExitRepeatSuppressionCount",
  "lateSuccessCount",
];

function createSyntheticInputPair() {
  return [randomBytes(8), randomBytes(12)];
}

function assertFixedSanitizedResult(actual, expected) {
  assert.deepEqual(Object.keys(actual), expectedResultKeys);
  assert.deepEqual(actual, expected);
  assert.doesNotMatch(
    JSON.stringify(actual),
    /contents?|arguments?|adapterResult|adapterError|errorMessage|stack|path/i,
  );
}

async function runScenario(scenario, expected) {
  const preflight = createSingleUseChildProcessOwnershipPreflight();
  const [first, second] = createSyntheticInputPair();

  const result = await preflight.execute({ first, second, scenario });

  assert.equal(first.every((value) => value === 0), true);
  assert.equal(second.every((value) => value === 0), true);
  assertFixedSanitizedResult(result, expected);

  const repeatFirst = randomBytes(4);
  const repeatSecond = randomBytes(6);
  const repeatResult = await preflight.execute({
    first: repeatFirst,
    second: repeatSecond,
    scenario,
  });

  assert.equal(repeatFirst.every((value) => value === 0), true);
  assert.equal(repeatSecond.every((value) => value === 0), true);
  assertFixedSanitizedResult(repeatResult, {
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    childSpawnAttemptCount: 0,
    parentTransferAttemptCount: 0,
    parentWriteAttemptCount: 0,
    parentBufferZeroFillCount: 2,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
    terminationStatus: "repeat-suppressed",
    postExitRepeatSuppressionCount: 1,
    lateSuccessCount: 0,
  });
}

await runScenario("available", {
  executionStatus: "pass",
  resultStatus: "available",
  childSpawnAttemptCount: 1,
  parentTransferAttemptCount: 1,
  parentWriteAttemptCount: 1,
  parentBufferZeroFillCount: 2,
  childConstructionAttemptCount: 1,
  childReadAttemptCount: 1,
  terminationStatus: "exited",
  postExitRepeatSuppressionCount: 0,
  lateSuccessCount: 0,
});

await runScenario("missing", {
  executionStatus: "pass",
  resultStatus: "missing",
  childSpawnAttemptCount: 1,
  parentTransferAttemptCount: 1,
  parentWriteAttemptCount: 1,
  parentBufferZeroFillCount: 2,
  childConstructionAttemptCount: 1,
  childReadAttemptCount: 1,
  terminationStatus: "exited",
  postExitRepeatSuppressionCount: 0,
  lateSuccessCount: 0,
});

await runScenario("construction-error", {
  executionStatus: "fail-closed",
  resultStatus: "unavailable",
  childSpawnAttemptCount: 1,
  parentTransferAttemptCount: 1,
  parentWriteAttemptCount: 1,
  parentBufferZeroFillCount: 2,
  childConstructionAttemptCount: 1,
  childReadAttemptCount: 0,
  terminationStatus: "exited-error",
  postExitRepeatSuppressionCount: 0,
  lateSuccessCount: 0,
});

await runScenario("read-error", {
  executionStatus: "fail-closed",
  resultStatus: "unavailable",
  childSpawnAttemptCount: 1,
  parentTransferAttemptCount: 1,
  parentWriteAttemptCount: 1,
  parentBufferZeroFillCount: 2,
  childConstructionAttemptCount: 1,
  childReadAttemptCount: 1,
  terminationStatus: "exited-error",
  postExitRepeatSuppressionCount: 0,
  lateSuccessCount: 0,
});

await runScenario("stop-during-read", {
  executionStatus: "fail-closed",
  resultStatus: "unavailable",
  childSpawnAttemptCount: 1,
  parentTransferAttemptCount: 1,
  parentWriteAttemptCount: 1,
  parentBufferZeroFillCount: 2,
  childConstructionAttemptCount: 1,
  childReadAttemptCount: 1,
  terminationStatus: "terminated-stop",
  postExitRepeatSuppressionCount: 0,
  lateSuccessCount: 0,
});

{
  const preflight = createSingleUseChildProcessOwnershipPreflight();
  const [first, second] = createSyntheticInputPair();
  const firstResultPromise = preflight.execute({
    first,
    second,
    scenario: "available",
  });
  const inFlightFirst = randomBytes(4);
  const inFlightSecond = randomBytes(6);

  assertFixedSanitizedResult(
    await preflight.execute({
      first: inFlightFirst,
      second: inFlightSecond,
      scenario: "available",
    }),
    {
      executionStatus: "fail-closed",
      resultStatus: "unavailable",
      childSpawnAttemptCount: 0,
      parentTransferAttemptCount: 0,
      parentWriteAttemptCount: 0,
      parentBufferZeroFillCount: 2,
      childConstructionAttemptCount: 0,
      childReadAttemptCount: 0,
      terminationStatus: "in-flight-repeat-suppressed",
      postExitRepeatSuppressionCount: 0,
      lateSuccessCount: 0,
    },
  );
  assert.equal(inFlightFirst.every((value) => value === 0), true);
  assert.equal(inFlightSecond.every((value) => value === 0), true);

  assertFixedSanitizedResult(await firstResultPromise, {
    executionStatus: "pass",
    resultStatus: "available",
    childSpawnAttemptCount: 1,
    parentTransferAttemptCount: 1,
    parentWriteAttemptCount: 1,
    parentBufferZeroFillCount: 2,
    childConstructionAttemptCount: 1,
    childReadAttemptCount: 1,
    terminationStatus: "exited",
    postExitRepeatSuppressionCount: 0,
    lateSuccessCount: 0,
  });

  const postExitFirst = randomBytes(4);
  const postExitSecond = randomBytes(6);
  assertFixedSanitizedResult(
    await preflight.execute({
      first: postExitFirst,
      second: postExitSecond,
      scenario: "available",
    }),
    {
      executionStatus: "fail-closed",
      resultStatus: "unavailable",
      childSpawnAttemptCount: 0,
      parentTransferAttemptCount: 0,
      parentWriteAttemptCount: 0,
      parentBufferZeroFillCount: 2,
      childConstructionAttemptCount: 0,
      childReadAttemptCount: 0,
      terminationStatus: "repeat-suppressed",
      postExitRepeatSuppressionCount: 1,
      lateSuccessCount: 0,
    },
  );
}

{
  const [first, second] = createSyntheticInputPair();
  const preflight = createSingleUseChildProcessOwnershipPreflight({
    forkChild() {
      throw new Error();
    },
  });

  assertFixedSanitizedResult(
    await preflight.execute({
      first,
      second,
      scenario: "available",
    }),
    {
      executionStatus: "fail-closed",
      resultStatus: "unavailable",
      childSpawnAttemptCount: 1,
      parentTransferAttemptCount: 0,
      parentWriteAttemptCount: 0,
      parentBufferZeroFillCount: 2,
      childConstructionAttemptCount: 0,
      childReadAttemptCount: 0,
      terminationStatus: "spawn-error",
      postExitRepeatSuppressionCount: 0,
      lateSuccessCount: 0,
    },
  );
  assert.equal(first.every((value) => value === 0), true);
  assert.equal(second.every((value) => value === 0), true);
}

{
  class ErrorWithoutExitChild extends EventEmitter {
    send() {
      queueMicrotask(() => this.emit("error", new Error()));
    }

    kill() {}
  }

  const [first, second] = createSyntheticInputPair();
  const preflight = createSingleUseChildProcessOwnershipPreflight({
    forkChild() {
      return new ErrorWithoutExitChild();
    },
  });

  assertFixedSanitizedResult(
    await preflight.execute({
      first,
      second,
      scenario: "available",
    }),
    {
      executionStatus: "fail-closed",
      resultStatus: "unavailable",
      childSpawnAttemptCount: 1,
      parentTransferAttemptCount: 1,
      parentWriteAttemptCount: 0,
      parentBufferZeroFillCount: 2,
      childConstructionAttemptCount: 0,
      childReadAttemptCount: 0,
      terminationStatus: "child-error-no-exit",
      postExitRepeatSuppressionCount: 0,
      lateSuccessCount: 0,
    },
  );
  assert.equal(first.every((value) => value === 0), true);
  assert.equal(second.every((value) => value === 0), true);
}

{
  const preflight = createSingleUseChildProcessOwnershipPreflight();
  const first = Buffer.alloc(0);
  const second = randomBytes(6);

  assertFixedSanitizedResult(
    await preflight.execute({
      first,
      second,
      scenario: "available",
    }),
    {
      executionStatus: "fail-closed",
      resultStatus: "unavailable",
      childSpawnAttemptCount: 0,
      parentTransferAttemptCount: 0,
      parentWriteAttemptCount: 0,
      parentBufferZeroFillCount: 2,
      childConstructionAttemptCount: 0,
      childReadAttemptCount: 0,
      terminationStatus: "not-started",
      postExitRepeatSuppressionCount: 0,
      lateSuccessCount: 0,
    },
  );

  const repeatFirst = randomBytes(4);
  const repeatSecond = randomBytes(6);
  assertFixedSanitizedResult(
    await preflight.execute({
      first: repeatFirst,
      second: repeatSecond,
      scenario: "available",
    }),
    {
      executionStatus: "fail-closed",
      resultStatus: "unavailable",
      childSpawnAttemptCount: 0,
      parentTransferAttemptCount: 0,
      parentWriteAttemptCount: 0,
      parentBufferZeroFillCount: 2,
      childConstructionAttemptCount: 0,
      childReadAttemptCount: 0,
      terminationStatus: "settled-without-exit-repeat-suppressed",
      postExitRepeatSuppressionCount: 0,
      lateSuccessCount: 0,
    },
  );
}

const root = process.cwd();
const implementationSource = fs.readFileSync(
  path.join(
    root,
    "scripts/comment-translator-creator-c1-process-isolation-preflight.mjs",
  ),
  "utf8",
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
const requiredAuthorityMarkers = [
  "PR #690 is merged at",
  "4bd5dd09c4501a666bfc961104f3280bd66b8117",
  "c0f749ca5a6dc5ed5b8dab63b3c722a68835df6e",
  "process_isolation_preflight_status=local-synthetic-pass-not-adopted",
  "process_isolation_guarantee_decision=retain-buffer-zero-fill-do-not-replace-with-exit-containment",
  "process_isolation_unverified_lifetime_status=ipc-runtime-os-sdk-unverified",
  "process_isolation_recommendation=retain-disconnected-until-zeroizable-client-boundary-proven",
  "process_isolation_explicit_approval_status=absent-required-for-guarantee-change",
  "same-process is rejected because immutable copies survive Buffer zero-fill",
  "child-process proves bounded repository lifecycle and exit containment",
  "zeroizable-client boundary is the recommended design direction",
  "production wiring、real constructor/client/read、dependency install、remote operation、deploy/activation/CP2/public paid launchはこの承認に含めません。",
];

for (const source of authoritySources) {
  for (const marker of requiredAuthorityMarkers) {
    assert.match(source, new RegExp(escapeRegExp(marker)));
  }
}

assert.match(implementationSource, /serialization: "advanced"/);
assert.match(implementationSource, /input\.fill\(0\)/);
assert.match(implementationSource, /firstImmutableCopy/);
assert.match(implementationSource, /secondImmutableCopy/);
assert.doesNotMatch(
  implementationSource,
  /@supabase|createTrustedCommentTranslatorPaidEntitlementSupabaseStore/,
);

const productionSource = ["app", "components", "lib"]
  .flatMap((directory) =>
    collectProductionSource(path.join(root, directory)),
  )
  .join("\n");
assert.doesNotMatch(
  productionSource,
  /comment-translator-creator-c1-process-isolation-preflight/,
);

process.stdout.write(
  "comment-translator-creator-c1-process-isolation-preflight-contract: pass\n",
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
