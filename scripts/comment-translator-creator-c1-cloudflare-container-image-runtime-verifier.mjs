import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const cli = process.env.C1_CONTAINER_CLI ?? "podman";
const image = "localhost/comment-translator-c1-evidence:a8fb4e195339";
const prefix = `c1-evidence-${process.pid}`;
const fixtures = [
  "synthetic-endpoint-retry-1",
  "synthetic-credential-retry-1",
  "synthetic-billing-reference-retry-1",
];
const createdContainers = [];

try {
  const imageInspect = inspectImage();
  assert.deepEqual(imageInspect.Config.Entrypoint, [
    "node",
    "/app/container-entrypoint.mjs",
  ]);
  assert.equal(imageInspect.Config.User, "node");
  assert.equal(imageInspect.Config.WorkingDir, "/app");
  assert.equal(
    imageInspect.Annotations["org.opencontainers.image.base.name"],
    "docker.io/library/node:22.22.2-bookworm-slim",
  );

  verifyDefaultEntrypointStop();
  verifyParentCase("available", 0, expectedPass("available"));
  verifyParentCase("missing", 0, expectedPass("missing"));
  verifyParentCase("unavailable", 1, expectedUnavailable());
  verifyMalformedFrame();
  inspectImage();

  process.stdout.write(JSON.stringify({
    executionStatus: "pass",
    defaultEntrypointRunCount: 1,
    parentRunCount: 4,
    runCount: 5,
    stopSignalCount: 1,
    retainedImageCount: 1,
    sanitizedCaseCount: 4,
    inputExposureCount: 0,
    productionReadCount: 0,
    remoteServiceOperationCount: 0,
    deployActivationCp2PublicLaunchCount: 0,
  }));
} finally {
  for (const name of createdContainers.reverse()) {
    run(["rm", "--force", name], { expectedStatus: [0, 1] });
  }
}

function verifyDefaultEntrypointStop() {
  const name = `${prefix}-entrypoint`;
  createdContainers.push(name);
  const started = run(["run", "--detach", "--name", name, image]);
  assert.match(started.stdout.trim(), /^[a-f0-9]{64}$/);
  const running = inspectContainer(name);
  assert.equal(running.State.Running, true);
  assert.equal(running.Path, "node");
  assert.deepEqual(running.Args, ["/app/container-entrypoint.mjs"]);
  assert.equal(run(["logs", name]).stdout, "");
  run(["stop", "--time", "5", name]);
  const stopped = inspectContainer(name);
  assert.equal(stopped.State.Running, false);
  assert.equal(stopped.State.ExitCode, 0);
}

function verifyParentCase(resultStatus, expectedStatus, expectedResult) {
  const name = `${prefix}-${resultStatus}`;
  createdContainers.push(name);
  const execution = run([
    "run",
    "--interactive",
    "--name",
    name,
    "--env",
    `C1_SYNTHETIC_RESULT=${resultStatus}`,
    "--entrypoint",
    "node",
    image,
    "/app/parent.mjs",
  ], {
    expectedStatus,
    input: frame(fixtures),
  });
  assert.equal(execution.stderr, "");
  assert.deepEqual(JSON.parse(execution.stdout), expectedResult);
  verifyNoInputExposure(name, expectedResult);
}

function verifyMalformedFrame() {
  const name = `${prefix}-malformed`;
  createdContainers.push(name);
  const execution = run([
    "run",
    "--interactive",
    "--name",
    name,
    "--entrypoint",
    "node",
    image,
    "/app/parent.mjs",
  ], {
    expectedStatus: 1,
    input: Buffer.from([0, 0, 0, 1]),
  });
  assert.equal(execution.stderr, "");
  const expected = {
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    terminationStatus: "parent-error",
    childExitCodeObserved: false,
    parentBufferZeroFillCount: 3,
    childBufferZeroFillCount: 0,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
  };
  assert.deepEqual(JSON.parse(execution.stdout), expected);
  verifyNoInputExposure(name, expected);
}

function verifyNoInputExposure(name, expectedResult) {
  const inspection = run(["inspect", name]).stdout;
  const logs = run(["logs", name]).stdout;
  const diff = run(["diff", name]).stdout;
  assert.deepEqual(JSON.parse(logs), expectedResult);
  for (const fixture of fixtures) {
    assert.equal(inspection.includes(fixture), false);
    assert.equal(logs.includes(fixture), false);
    assert.equal(diff.includes(fixture), false);
  }
  const metadata = JSON.parse(inspection)[0];
  assert.deepEqual(metadata.Args, ["/app/parent.mjs"]);
  assert.deepEqual(metadata.Mounts, []);
}

function inspectImage() {
  return JSON.parse(run(["image", "inspect", image]).stdout)[0];
}

function inspectContainer(name) {
  return JSON.parse(run(["inspect", name]).stdout)[0];
}

function expectedPass(resultStatus) {
  return {
    executionStatus: "pass",
    resultStatus,
    childBufferZeroFillCount: 3,
    childConstructionAttemptCount: 1,
    childReadAttemptCount: 1,
    terminationStatus: "child-exited-zero-parent-ready",
    childExitCodeObserved: true,
    parentBufferZeroFillCount: 3,
  };
}

function expectedUnavailable() {
  return {
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    terminationStatus: "child-failed",
    childExitCodeObserved: true,
    parentBufferZeroFillCount: 3,
    childBufferZeroFillCount: 3,
    childConstructionAttemptCount: 1,
    childReadAttemptCount: 1,
  };
}

function frame(values) {
  return Buffer.concat(values.flatMap((value) => {
    const bytes = Buffer.from(value);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    return [length, bytes];
  }));
}

function run(args, { expectedStatus = 0, input } = {}) {
  const result = spawnSync(cli, args, {
    input,
    encoding: input ? undefined : "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (Buffer.isBuffer(result.stdout)) result.stdout = result.stdout.toString("utf8");
  if (Buffer.isBuffer(result.stderr)) result.stderr = result.stderr.toString("utf8");
  const statuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  assert.equal(result.error, undefined);
  assert.equal(statuses.includes(result.status), true, result.stderr);
  return result;
}
