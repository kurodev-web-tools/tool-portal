import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exactBase = "7365b9e2940acd34e1d9960f55e08041efa0e632";
const nextUnit = "C1-CLOUDFLARE-CONTAINER-RUNTIME-BOUNDARY-IMPLEMENTATION-1";
const authorityPaths = [
  "task.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md",
];
const requiredMarkers = [
  `c1_process_isolation_runtime_target_selection_base=${exactBase}`,
  "c1_process_isolation_runtime_target_selection_approval_unit=C1-PROCESS-ISOLATION-RUNTIME-TARGET-SELECTION-1",
  "c1_process_isolation_runtime_target_selection_status=selected-review-ready",
  "c1_process_isolation_runtime_target_candidate_count=2",
  "c1_process_isolation_runtime_target_selected_count=1",
  "c1_process_isolation_runtime_target_selected=cloudflare-containers",
  "c1_process_isolation_runtime_target_worker_child_process_status=nonfunctional-stub",
  "c1_process_isolation_runtime_target_container_process_status=functional-exec-with-stdin-exitcode-and-kill",
  "c1_process_isolation_runtime_target_container_availability=general-availability",
  "c1_process_isolation_runtime_target_container_beta_status=not-beta",
  "c1_process_isolation_runtime_target_container_sla=container-specific-public-sla-not-established",
  "c1_process_isolation_runtime_target_container_cost_class=workers-paid-usage-based-container-durable-object-and-worker",
  "c1_process_isolation_runtime_target_operator_node_service_status=rejected-no-approved-platform-topology",
  "c1_process_isolation_runtime_target_parent_owner=container-single-use-node-parent",
  "c1_process_isolation_runtime_target_child_owner=container-single-use-node-child",
  "c1_process_isolation_runtime_target_secret_input=worker-to-container-rpc-byte-stream-to-parent-stdin-never-argv-or-environment",
  "c1_process_isolation_runtime_target_transport=worker-container-durable-object-rpc-stream-in-fixed-sanitized-result-out",
  "c1_process_isolation_runtime_target_lifecycle=durable-object-coordinates-one-exec-parent-coordinates-one-child-success-after-valid-result-and-observed-zero-exits",
  "c1_process_isolation_runtime_target_repeat_boundary=inflight-and-post-settlement-suppressed-late-success-ignored",
  "c1_process_isolation_runtime_target_stop_boundary=kill-parent-and-child-zero-fill-owned-buffers-observe-exits-fail-closed",
  "c1_process_isolation_runtime_target_deployment_topology=opennext-worker-to-container-durable-object-binding-to-versioned-node-image",
  "c1_process_isolation_runtime_target_rollback=keep-disconnected-until-separate-approval-then-revert-worker-version-with-image-retained",
  "c1_process_isolation_runtime_target_abort=stream-ownership-or-exec-or-exit-observation-or-sanitized-shape-or-image-retention-mismatch",
  `c1_process_isolation_runtime_target_next_unit=${nextUnit}`,
  "production_wiring_status=disconnected-fail-closed",
  "production_source_change_count=0",
  "production_configuration_change_count=0",
  "dependency_install_count=0",
  "configuration_binding_count=0",
  "remote_service_operation_count=0",
  "deploy_activation_cp2_public_launch_count=0",
  "result_marker=C1_PROCESS_ISOLATION_RUNTIME_TARGET_SELECTED",
];

execFileSync("git", ["merge-base", "--is-ancestor", exactBase, "HEAD"], {
  cwd: root,
  stdio: "pipe",
});

for (const authorityPath of authorityPaths) {
  const source = fs.readFileSync(path.join(root, authorityPath), "utf8");
  for (const marker of requiredMarkers) {
    assert.match(source, new RegExp(`^(?:- )?${escapeRegExp(marker)}$`, "m"));
  }
}

const launchAuthority = fs.readFileSync(
  path.join(root, "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md"),
  "utf8",
);
for (const url of [
  "https://developers.cloudflare.com/workers/runtime-apis/nodejs/",
  "https://developers.cloudflare.com/changelog/post/2026-04-13-containers-sandbox-ga/",
  "https://developers.cloudflare.com/containers/execute-commands/",
  "https://developers.cloudflare.com/containers/pricing/",
  "https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/",
  "https://www.cloudflare.com/en-au/workers-service-level-agreement/",
  "https://nodejs.org/api/child_process.html",
]) {
  assert.match(launchAuthority, new RegExp(escapeRegExp(url)));
}

const wrangler = JSON.parse(
  readAtBase("wrangler.jsonc"),
);
assert.equal(wrangler.main, ".open-next/worker.js");
assert.equal(wrangler.compatibility_date, "2026-05-27");
assert.deepEqual(wrangler.compatibility_flags, ["nodejs_compat"]);
assert.equal(Object.hasOwn(wrangler, "containers"), false);
assert.equal(Object.hasOwn(wrangler, "durable_objects"), false);

const packageJson = JSON.parse(
  readAtBase("package.json"),
);
assert.equal(
  Object.hasOwn(packageJson.dependencies ?? {}, "@cloudflare/containers"),
  false,
);
assert.equal(
  Object.hasOwn(packageJson.devDependencies ?? {}, "@cloudflare/containers"),
  false,
);

process.stdout.write(
  "comment-translator-creator-c1-process-isolation-runtime-target-selection-contract: pass\n",
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readAtBase(file) {
  return execFileSync("git", ["show", `${exactBase}:${file}`], {
    cwd: root,
    encoding: "utf8",
  });
}
