import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exactBase = "d20add97f05fc4298043939049e8931c45b43500";
const authorityPaths = [
  "task.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md",
];
const requiredMarkers = [
  "c1_process_isolation_runtime_target_feasibility_approval_unit=C1-PROCESS-ISOLATION-RUNTIME-TARGET-FEASIBILITY-1",
  "c1_process_isolation_runtime_target_feasibility_approval_status=consumed-goal-authority",
  "c1_process_isolation_runtime_target_feasibility_status=blocked-current-worker-no-functional-child-process",
  "c1_process_isolation_runtime_target_current=opennext-cloudflare-worker",
  "c1_process_isolation_runtime_target_worker_compatibility_date=2026-05-27",
  "c1_process_isolation_runtime_target_worker_child_process_status=nonfunctional-stub",
  "c1_process_isolation_runtime_target_required=process-capable-isolated-node-host",
  "c1_process_isolation_runtime_target_alternative=separate-cloudflare-container-or-operator-node-service",
  "c1_process_isolation_runtime_target_topology_authority_status=absent",
  "c1_process_isolation_runtime_target_production_implementation_status=blocked-no-authorized-process-host",
  "c1_process_isolation_runtime_target_next_unit=C1-PROCESS-ISOLATION-RUNTIME-TARGET-SELECTION-1",
  "production_wiring_status=disconnected-fail-closed",
];

execFileSync("git", ["merge-base", "--is-ancestor", exactBase, "HEAD"], {
  cwd: root,
  stdio: "pipe",
});

for (const authorityPath of authorityPaths) {
  const source = fs.readFileSync(path.join(root, authorityPath), "utf8");
  for (const marker of requiredMarkers) {
    assert.match(
      source,
      new RegExp(`^(?:- )?${escapeRegExp(marker)}$`, "m"),
    );
  }
}

const wrangler = JSON.parse(
  fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"),
);
assert.equal(wrangler.main, ".open-next/worker.js");
assert.equal(wrangler.compatibility_date, "2026-05-27");
assert.deepEqual(wrangler.compatibility_flags, ["nodejs_compat"]);
assert.equal(Object.hasOwn(wrangler, "containers"), false);
assert.equal(Object.hasOwn(wrangler, "durable_objects"), false);

assert.match(
  fs.readFileSync(path.join(root, "open-next.config.ts"), "utf8"),
  /defineCloudflareConfig/,
);
assert.equal(
  execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "HEAD",
      "--",
      "app",
      "components",
      "lib",
      "open-next.config.ts",
      "wrangler.jsonc",
      "package.json",
      "package-lock.json",
    ],
    { cwd: root, encoding: "utf8" },
  ).trim(),
  "",
);

process.stdout.write(
  "comment-translator-creator-c1-process-isolation-runtime-target-feasibility-contract: pass\n",
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
