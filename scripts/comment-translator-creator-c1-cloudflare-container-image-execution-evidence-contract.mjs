import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const authorities = [
  "task.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md",
];
const exactBlocker =
  "blocked-no-existing-engine-safe-install-requires-license-or-admin-restart";

for (const authority of authorities) {
  const source = read(authority);
  assert.match(
    source,
    /c1_cloudflare_container_image_execution_evidence_base=c7e320473da88d9fd3dc0354be27997912a5ef2c/,
  );
  assert.match(
    source,
    /c1_cloudflare_container_image_execution_evidence_status=blocked-fail-closed/,
  );
  assert.match(
    source,
    new RegExp(
      `c1_cloudflare_container_image_execution_evidence_blocker=${exactBlocker}`,
    ),
  );
  assert.match(source, /c1_cloudflare_container_runtime_cli_count=0/);
  assert.match(source, /c1_cloudflare_container_runtime_engine_count=0/);
  assert.match(source, /c1_cloudflare_container_wsl_distribution_count=0/);
  assert.match(source, /c1_cloudflare_container_runtime_install_count=0/);
  assert.match(source, /c1_cloudflare_container_image_build_count=0/);
  assert.match(source, /c1_cloudflare_container_run_count=0/);
  assert.match(source, /c1_cloudflare_container_stop_signal_count=0/);
  assert.match(
    source,
    /c1_cloudflare_container_production_read=disconnected-fail-closed|production_wiring_status=disconnected-fail-closed/,
  );
  assert.match(source, /remote_service_operation_count=0/);
  assert.match(source, /deploy_activation_cp2_public_launch_count=0/);
}

const dockerfile = read("containers/comment-translator-c1/Dockerfile");
assert.match(dockerfile, /^FROM node:22\.22\.2-bookworm-slim$/m);
assert.match(
  dockerfile,
  /^ENTRYPOINT \["node", "\/app\/container-entrypoint\.mjs"\]$/m,
);

const malformed = spawnSync(
  process.execPath,
  [path.join(root, "containers/comment-translator-c1/parent.mjs")],
  {
    input: Buffer.from([0, 0, 0, 1]),
    encoding: "utf8",
  },
);
assert.equal(malformed.status, 1);
assert.equal(malformed.stderr, "");
assert.deepEqual(JSON.parse(malformed.stdout), {
  executionStatus: "fail-closed",
  resultStatus: "unavailable",
  terminationStatus: "parent-error",
  childExitCodeObserved: false,
  parentBufferZeroFillCount: 3,
  childBufferZeroFillCount: 0,
  childConstructionAttemptCount: 0,
  childReadAttemptCount: 0,
});

const wrangler = JSON.parse(read("wrangler.jsonc"));
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

const billingRuntime = read("lib/comment-translator-billing-runtime.ts");
assert.doesNotMatch(billingRuntime, /COMMENT_TRANSLATOR_C1_CONTAINER/);

process.stdout.write(
  "comment-translator-creator-c1-cloudflare-container-image-execution-evidence-contract: pass\n",
);

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}
