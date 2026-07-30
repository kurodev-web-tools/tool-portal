import { Container } from "@cloudflare/containers";

const COMMAND = Object.freeze(["node", "/app/parent.mjs"]);
const ATTEMPT_PREFIX = "C1_CONTAINER_ATTEMPT:";
const RUN_TIMEOUT_MS = 30_000;
const EXIT_OBSERVATION_MS = 5_000;

export class CommentTranslatorC1Container extends Container {
  sleepAfter = "1m";
  enableInternet = false;
  #active = new Map();

  async runAttempt(attemptKey, input) {
    if (!isAttemptKey(attemptKey) || !(input instanceof ReadableStream)) {
      return unavailable("invalid-boundary");
    }

    const storageKey = `${ATTEMPT_PREFIX}${attemptKey}`;
    const previous = await this.ctx.storage.get(storageKey);
    if (previous === "inflight" || previous === "settled" || previous === "aborted") {
      return unavailable("repeat-suppressed");
    }

    await this.ctx.storage.put(storageKey, "inflight");
    try {
      if (!this.ctx.container.running) {
        await this.start({ enableInternet: false });
      }
      const process = await this.ctx.container.exec(COMMAND, {
        stdin: input,
        stdout: "pipe",
        stderr: "ignore",
      });
      this.#active.set(attemptKey, process);

      const completion = await waitForProcess(process, RUN_TIMEOUT_MS);
      if (completion.timedOut) {
        process.kill(15);
        const exitCode = await observeExit(process, EXIT_OBSERVATION_MS);
        await this.ctx.storage.put(storageKey, "aborted");
        return unavailable(exitCode === null ? "termination-unobserved" : "aborted");
      }

      const current = await this.ctx.storage.get(storageKey);
      if (current !== "inflight") {
        return unavailable("late-success-suppressed");
      }
      const result = parseSanitizedResult(completion.stdout);
      if (completion.exitCode !== 0 || !result) {
        await this.ctx.storage.put(storageKey, "aborted");
        return unavailable("process-failed");
      }
      await this.ctx.storage.put(storageKey, "settled");
      return result;
    } catch {
      const process = this.#active.get(attemptKey);
      if (process) {
        process.kill(15);
        await observeExit(process, EXIT_OBSERVATION_MS);
      }
      await this.ctx.storage.put(storageKey, "aborted");
      return unavailable("runtime-error");
    } finally {
      this.#active.delete(attemptKey);
    }
  }

  async abortAttempt(attemptKey) {
    if (!isAttemptKey(attemptKey)) {
      return unavailable("invalid-boundary");
    }
    const storageKey = `${ATTEMPT_PREFIX}${attemptKey}`;
    const state = await this.ctx.storage.get(storageKey);
    if (state !== "inflight") {
      return unavailable("repeat-suppressed");
    }
    await this.ctx.storage.put(storageKey, "aborted");
    const process = this.#active.get(attemptKey);
    if (!process) {
      return unavailable("termination-unobserved");
    }
    process.kill(15);
    const exitCode = await observeExit(process, EXIT_OBSERVATION_MS);
    return unavailable(exitCode === null ? "termination-unobserved" : "aborted");
  }
}

async function observeProcess(process) {
  const stdoutPromise = process.stdout
    ? new Response(process.stdout).arrayBuffer()
    : Promise.resolve(new ArrayBuffer());
  const [stdout, exitCode] = await Promise.all([stdoutPromise, process.exitCode]);
  return { stdout, exitCode, timedOut: false };
}

async function observeExit(process, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      process.exitCode,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function waitForProcess(process, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      observeProcess(process),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function parseSanitizedResult(bytes) {
  if (bytes.byteLength > 1024) return null;
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    const keys = Object.keys(value).sort();
    const expected = [
      "billingState",
      "childBufferZeroFillCount", "childConstructionAttemptCount",
      "childExitCodeObserved", "childReadAttemptCount", "executionStatus",
      "parentBufferZeroFillCount", "resultStatus",
      "terminationStatus",
    ].sort();
    if (JSON.stringify(keys) !== JSON.stringify(expected)) return null;
    if (value.executionStatus !== "pass") return null;
    if (!["available", "missing"].includes(value.resultStatus)) return null;
    if (
      value.billingState !== null
      && !["paid-active", "paid-inactive"].includes(value.billingState)
    ) return null;
    if (value.resultStatus === "available" && value.billingState === null) return null;
    if (value.resultStatus === "missing" && value.billingState !== null) return null;
    if (value.terminationStatus !== "child-exited-zero-parent-ready") return null;
    if (value.childExitCodeObserved !== true) return null;
    if (value.parentBufferZeroFillCount !== 3 || value.childBufferZeroFillCount !== 3) return null;
    if (value.childConstructionAttemptCount !== 1 || value.childReadAttemptCount !== 1) return null;
    return Object.freeze({
      ...value,
      terminationStatus: "parent-and-child-exited-zero",
      parentExitCodeObserved: true,
    });
  } catch {
    return null;
  }
}

function unavailable(terminationStatus) {
  return Object.freeze({
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    billingState: null,
    terminationStatus,
    parentExitCodeObserved: false,
    childExitCodeObserved: false,
    parentBufferZeroFillCount: 0,
    childBufferZeroFillCount: 0,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
  });
}

function isAttemptKey(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
