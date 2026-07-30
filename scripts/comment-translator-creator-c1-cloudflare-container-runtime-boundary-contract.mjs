import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const paths = {
  worker: "cloudflare-worker.mjs",
  runtime: "cloudflare/comment-translator-c1-container.mjs",
  dockerfile: "containers/comment-translator-c1/Dockerfile",
  entrypoint: "containers/comment-translator-c1/container-entrypoint.mjs",
  parent: "containers/comment-translator-c1/parent.mjs",
  child: "containers/comment-translator-c1/child.mjs",
  workerBoundary: "lib/comment-translator-c1-container-boundary.ts",
};

for (const file of Object.values(paths)) {
  assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
}

const packageJson = readJson("package.json");
assert.equal(packageJson.dependencies["@cloudflare/containers"], "0.3.7");

const wrangler = readJson("wrangler.jsonc");
assert.equal(wrangler.main, "cloudflare-worker.mjs");
assert.deepEqual(wrangler.containers, [{
  class_name: "CommentTranslatorC1Container",
  image: "./containers/comment-translator-c1/Dockerfile",
  instance_type: "lite",
  max_instances: 1,
  rollout_active_grace_period: 300,
}]);
assert.deepEqual(wrangler.durable_objects.bindings, [{
  name: "COMMENT_TRANSLATOR_C1_CONTAINER",
  class_name: "CommentTranslatorC1Container",
}]);
assert.deepEqual(wrangler.migrations, [{
  tag: "c1-container-v1",
  new_sqlite_classes: ["CommentTranslatorC1Container"],
}]);

const worker = read(paths.worker);
assert.match(worker, /export \{ CommentTranslatorC1Container \}/);
assert.match(worker, /\.\/\.open-next\/worker\.js/);

const runtime = read(paths.runtime);
for (const marker of [
  "C1_CONTAINER_ATTEMPT",
  '"inflight"',
  '"settled"',
  '"aborted"',
  '["node", "/app/parent.mjs"]',
  "stdin: input",
  "process.exitCode",
  "process.kill(15)",
]) {
  assert.match(runtime, new RegExp(escapeRegExp(marker)));
}
assert.doesNotMatch(runtime, /console\./);
assert.doesNotMatch(runtime, /new Response\(input\)|input\.getReader\(\)/);
await verifyDurableAttemptSuppression(runtime);

const dockerfile = read(paths.dockerfile);
assert.match(dockerfile, /^FROM node:22\.22\.2-bookworm-slim$/m);
assert.match(dockerfile, /^ENTRYPOINT \["node", "\/app\/container-entrypoint\.mjs"\]$/m);

const parent = read(paths.parent);
const child = read(paths.child);
for (const source of [parent, child]) {
  assert.match(source, /\.fill\(0\)/);
  assert.doesNotMatch(source, /console\.(?:log|error|warn)/);
}
assert.match(parent, /serialization: "advanced"/);
assert.match(parent, /stdio: \["ignore", "ignore", "ignore", "ipc"\]/);
assert.match(parent, /childProcess\.once\("exit"/);
assert.match(child, /childBufferZeroFillCount: 3/);
assert.doesNotMatch(child, /@supabase|createClient|readByBillingUserReference/);

for (const resultStatus of ["available", "missing", "unavailable"]) {
  const payload = frame(["endpoint-fixture", "credential-fixture", "ctbill_fixture"]);
  const result = spawnSync(process.execPath, [path.join(root, paths.parent)], {
    input: payload,
    env: { ...process.env, C1_SYNTHETIC_RESULT: resultStatus },
    encoding: "utf8",
  });
  const output = JSON.parse(result.stdout.trim());
  assert.equal(output.resultStatus, resultStatus);
  assert.equal(output.parentBufferZeroFillCount, 3);
  assert.equal(output.childBufferZeroFillCount, 3);
  assert.equal(output.childExitCodeObserved, true);
  assert.equal(result.status, resultStatus === "unavailable" ? 1 : 0);
}

const billingRuntime = read("lib/comment-translator-billing-runtime.ts");
assert.match(billingRuntime, /createTrustedCommentTranslatorPaidEntitlementSupabaseStore/);
assert.doesNotMatch(billingRuntime, /COMMENT_TRANSLATOR_C1_CONTAINER/);
const workerBoundary = read(paths.workerBoundary);
assert.match(workerBoundary, /new ReadableStream<Uint8Array>/);
assert.match(workerBoundary, /type: "bytes"/);
assert.match(workerBoundary, /container\.runAttempt\(attemptKey, input\)/);
assert.match(workerBoundary, /productionRead: "connected-unactivated"/);
for (const authority of [
  "task.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md",
]) {
  const source = read(authority);
  assert.match(source, /c1_cloudflare_container_dependency=@cloudflare\/containers@0\.3\.7/);
  assert.match(source, /c1_cloudflare_container_production_read=disconnected-fail-closed|production_wiring_status=disconnected-fail-closed/);
  assert.match(source, /c1_cloudflare_container_image_build_status=blocked-local-docker-cli-unavailable/);
}

execFileSync("git", ["diff", "--check"], { cwd: root, stdio: "pipe" });
process.stdout.write("comment-translator-creator-c1-cloudflare-container-runtime-boundary-contract: pass\n");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function frame(values) {
  return Buffer.concat(values.flatMap((value) => {
    const bytes = Buffer.from(value);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    return [length, bytes];
  }));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function verifyDurableAttemptSuppression(source) {
  const testable = source.replace(
    'import { Container } from "@cloudflare/containers";',
    "class Container { constructor(ctx) { this.ctx = ctx; } async start() {} }",
  );
  const runtimeModule = await import(`data:text/javascript;base64,${Buffer.from(testable).toString("base64")}`);
  const stored = new Map();
  let execCount = 0;
  const parentResult = {
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
  const ctx = {
    storage: {
      get: async (key) => stored.get(key),
      put: async (key, value) => stored.set(key, value),
    },
    container: {
      running: true,
      async exec() {
        execCount += 1;
        return {
          stdout: new Blob([JSON.stringify(parentResult)]).stream(),
          exitCode: Promise.resolve(0),
          kill() {},
        };
      },
    },
  };
  const boundary = new runtimeModule.CommentTranslatorC1Container(ctx, {});
  const attemptKey = "a".repeat(64);
  const first = await boundary.runAttempt(attemptKey, emptyByteStream());
  const repeat = await boundary.runAttempt(attemptKey, emptyByteStream());
  assert.equal(first.executionStatus, "pass");
  assert.equal(first.parentExitCodeObserved, true);
  assert.equal(repeat.terminationStatus, "repeat-suppressed");
  assert.equal(execCount, 1);
  assert.equal(stored.get(`C1_CONTAINER_ATTEMPT:${attemptKey}`), "settled");
}

function emptyByteStream() {
  return new ReadableStream({
    type: "bytes",
    start(controller) {
      controller.close();
    },
  });
}
