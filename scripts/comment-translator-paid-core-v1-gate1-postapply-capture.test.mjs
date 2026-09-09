import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { createPsqlTransport, MAX_OUTPUT_BYTES } from "./comment-translator-paid-core-v1-gate1-preflight-readonly.mjs";
import { POSTAPPLY_MAX_OUTPUT_BYTES } from "./lib/comment-translator-paid-core-v1-gate1-evidence.mjs";

// Exercise the real OS pipe/maxBuffer behavior without a database or credentials.
// Only the child executable is substituted; native transport options are retained.
function nativeCapture(bytes, maxOutputBytes = POSTAPPLY_MAX_OUTPUT_BYTES, { versionOverflow = false, stderr = false } = {}) {
  const observations = [];
  const transport = createPsqlTransport({
    maxOutputBytes,
    spawnSyncImpl(_command, args, options) {
      const version = args[0] === "--version";
      const code = version
        ? `process.stdout.write('psql (PostgreSQL) 17.6' + ' '.repeat(${versionOverflow ? MAX_OUTPUT_BYTES : 0}));`
        : `process.stdout.write('界'.repeat(${Math.floor(bytes / 3)}) + 'x'.repeat(${bytes % 3}));${stderr ? "process.stderr.write('synthetic-warning');" : ""}`;
      const result = spawnSync(process.execPath, ["-e", code], { ...options, env: {}, input: undefined });
      observations.push({ version, limit: options.maxBuffer, status: result.status, error: result.error?.code ?? null });
      return result;
    }
  });
  const result = transport.execute({ command: "test-child", args: ["test-query"], env: {}, input: "" });
  return { result, observations };
}

test("native postapply capture accepts the observed size and exact 4MiB UTF8 boundary", () => {
  assert.equal(POSTAPPLY_MAX_OUTPUT_BYTES, 4 * 1024 * 1024);
  for (const size of [1133757, POSTAPPLY_MAX_OUTPUT_BYTES]) {
    const { result, observations } = nativeCapture(size);
    assert.equal(result.exitCode, 0);
    assert.equal(result.captureComplete, true);
    assert.equal(result.rowCount, 1);
    assert.equal(Buffer.byteLength(result.stdout), size);
    assert.equal(result.stdout.includes("\uFFFD"), false, "complete UTF8 bytes retained");
    assert.deepEqual(observations.map(row => row.limit), [MAX_OUTPUT_BYTES, POSTAPPLY_MAX_OUTPUT_BYTES]);
    assert.ok(observations.every(row => row.status === 0 && row.error === null));
  }
});

test("native over-limit/default-limit/stderr captures return no partial evidence or retry", () => {
  for (const [size, limit, options] of [
    [POSTAPPLY_MAX_OUTPUT_BYTES + 1, POSTAPPLY_MAX_OUTPUT_BYTES, {}],
    [POSTAPPLY_MAX_OUTPUT_BYTES + 65536, POSTAPPLY_MAX_OUTPUT_BYTES, {}],
    [1133757, MAX_OUTPUT_BYTES, {}],
    [1133757, POSTAPPLY_MAX_OUTPUT_BYTES, { stderr: true }]
  ]) {
    const { result, observations } = nativeCapture(size, limit, options);
    assert.deepEqual(result, { exitCode: 1, stdout: "", stderr: "", rowCount: 0 });
    assert.equal(observations.length, 2, "one version probe and one query attempt");
  }
});

test("larger query allowance does not widen the native version probe", () => {
  const { result, observations } = nativeCapture(1, POSTAPPLY_MAX_OUTPUT_BYTES, { versionOverflow: true });
  assert.deepEqual(result, { exitCode: 1, stdout: "", stderr: "", rowCount: 0 });
  assert.equal(observations.length, 1, "query never started");
});
