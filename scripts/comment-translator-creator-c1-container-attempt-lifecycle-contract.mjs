import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const runtimePath = path.join(
  process.cwd(),
  "cloudflare/comment-translator-c1-container.mjs",
);
const source = fs.readFileSync(runtimePath, "utf8").replace(
  'import { Container } from "@cloudflare/containers";',
  "class Container { constructor(ctx) { this.ctx = ctx; } async start() {} }",
);
const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const attemptKeys = {
  error: "b".repeat(64),
  late: "c".repeat(64),
  stop: "d".repeat(64),
};

{
  const fixture = createFixture({
    async exec() {
      throw new Error("synthetic-exec-error");
    },
  });
  const boundary = new runtime.CommentTranslatorC1Container(fixture.ctx, {});
  const first = await boundary.runAttempt(attemptKeys.error, emptyByteStream());
  const repeat = await boundary.runAttempt(attemptKeys.error, emptyByteStream());
  assert.equal(first.terminationStatus, "runtime-error");
  assert.equal(repeat.terminationStatus, "repeat-suppressed");
  assert.equal(fixture.stored.get(storageKey(attemptKeys.error)), "aborted");
}

{
  const exit = deferred();
  const fixture = createFixture({
    async exec() {
      return successfulProcess({ exit });
    },
  });
  const boundary = new runtime.CommentTranslatorC1Container(fixture.ctx, {});
  const resultPromise = boundary.runAttempt(attemptKeys.late, emptyByteStream());
  await fixture.execStarted;
  fixture.stored.set(storageKey(attemptKeys.late), "aborted");
  exit.resolve(0);
  const result = await resultPromise;
  const repeat = await boundary.runAttempt(attemptKeys.late, emptyByteStream());
  assert.equal(result.terminationStatus, "late-success-suppressed");
  assert.equal(repeat.terminationStatus, "repeat-suppressed");
}

{
  const exit = deferred();
  let killCount = 0;
  const fixture = createFixture({
    async exec() {
      const process = successfulProcess({ exit });
      process.kill = () => {
        killCount += 1;
        exit.resolve(143);
      };
      return process;
    },
  });
  const boundary = new runtime.CommentTranslatorC1Container(fixture.ctx, {});
  const runPromise = boundary.runAttempt(attemptKeys.stop, emptyByteStream());
  await fixture.execStarted;
  const stop = await boundary.abortAttempt(attemptKeys.stop);
  const run = await runPromise;
  const repeat = await boundary.runAttempt(attemptKeys.stop, emptyByteStream());
  assert.equal(stop.terminationStatus, "aborted");
  assert.equal(run.executionStatus, "fail-closed");
  assert.equal(repeat.terminationStatus, "repeat-suppressed");
  assert.equal(killCount, 1);
  assert.equal(fixture.stored.get(storageKey(attemptKeys.stop)), "aborted");
}

process.stdout.write(
  "comment_translator_creator_c1_container_attempt_lifecycle_contract=pass\n",
);

function createFixture(container) {
  const stored = new Map();
  const execReady = deferred();
  return {
    stored,
    execStarted: execReady.promise,
    ctx: {
      storage: {
        get: async (key) => stored.get(key),
        put: async (key, value) => stored.set(key, value),
      },
      container: {
        running: true,
        async exec(...args) {
          const process = await container.exec(...args);
          execReady.resolve();
          return process;
        },
      },
    },
  };
}

function successfulProcess({ exit }) {
  const output = {
    executionStatus: "pass",
    resultStatus: "available",
    billingState: "paid-active",
    terminationStatus: "child-exited-zero-parent-ready",
    childExitCodeObserved: true,
    parentBufferZeroFillCount: 3,
    childBufferZeroFillCount: 3,
    childConstructionAttemptCount: 1,
    childReadAttemptCount: 1,
  };
  return {
    stdout: new Blob([JSON.stringify(output)]).stream(),
    exitCode: exit.promise,
    kill() {},
  };
}

function emptyByteStream() {
  return new ReadableStream({
    type: "bytes",
    start(controller) {
      controller.close();
    },
  });
}

function storageKey(attemptKey) {
  return `C1_CONTAINER_ATTEMPT:${attemptKey}`;
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
