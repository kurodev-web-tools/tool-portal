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
  "c1_process_isolation_wiring_design_approval_status=consumed",
  "c1_process_isolation_wiring_design_execution_status=pass",
  "c1_process_isolation_wiring_implementation_readiness_status=blocked-current-worker-nonfunctional-child-process",
  "c1_process_isolation_wiring_parent_responsibility=authorize-derive-reference-own-three-input-buffers-spawn-once-validate-sanitized-result-wait-exit",
  "c1_process_isolation_wiring_child_responsibility=construct-once-read-once-return-status-only-zero-fill-three-input-buffers-exit",
  "c1_process_isolation_wiring_input_buffer_count=3",
  "c1_process_isolation_wiring_result_shape=execution-status-result-status-termination-status-fixed-counts-only",
  "c1_process_isolation_wiring_normal_boundary=parent-zero-fill-after-ipc-write-child-zero-fill-before-disconnect-parent-success-after-valid-result-and-observed-zero-exit",
  "c1_process_isolation_wiring_error_boundary=zero-fill-owned-buffers-fail-closed-no-success-without-valid-result-and-observed-zero-exit",
  "c1_process_isolation_wiring_stop_boundary=sigterm-child-zero-fill-exit-parent-zero-fill-fail-closed",
  "c1_process_isolation_wiring_repeat_boundary=single-use-inflight-and-post-settlement-suppressed-late-success-ignored",
  "c1_process_isolation_wiring_configuration_boundary=reference-names-only-next-public-supabase-url-and-supabase-service-role-key",
  "c1_process_isolation_wiring_runtime_target=opennext-cloudflare-worker",
  "c1_process_isolation_wiring_spawn_capability_status=blocked-workers-child-process-nonfunctional-stub",
  "c1_process_isolation_wiring_rollback=retain-disconnected-remove-future-wiring-only-under-separate-approval",
  "c1_process_isolation_wiring_abort=runtime-target-or-bundle-or-input-ownership-or-result-shape-mismatch",
  "c1_process_isolation_wiring_next_implementation_unit=C1-CLOUDFLARE-CONTAINER-RUNTIME-BOUNDARY-IMPLEMENTATION-1",
  "c1_process_isolation_wiring_next_implementation_unit_status=blocked-separate-implementation-approval",
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

const processIsolationSource = fs.readFileSync(
  path.join(
    root,
    "scripts/comment-translator-creator-c1-process-isolation-preflight.mjs",
  ),
  "utf8",
);
assert.match(processIsolationSource, /serialization: "advanced"/);
assert.match(
  processIsolationSource,
  /stdio: \["ignore", "ignore", "ignore", "ipc"\]/,
);
assert.match(processIsolationSource, /process\.once\("SIGTERM"/);
assert.match(processIsolationSource, /first\.fill\(0\)/);
assert.match(processIsolationSource, /second\.fill\(0\)/);
assert.match(processIsolationSource, /in-flight-repeat-suppressed/);
assert.match(processIsolationSource, /settled-without-exit-repeat-suppressed/);
assert.match(processIsolationSource, /repeat-suppressed/);

const bridgeSource = fs.readFileSync(
  path.join(
    root,
    "scripts/comment-translator-creator-c1-ephemeral-entitlement-bridge.mjs",
  ),
  "utf8",
);
assert.match(bridgeSource, /createPaidEntitlementReadBridge/);
assert.match(bridgeSource, /readByBillingUserReference/);
assert.match(bridgeSource, /return record === null \? "missing" : "available"/);

const billingSource = fs.readFileSync(
  path.join(root, "lib/comment-translator-billing-runtime.ts"),
  "utf8",
);
assert.match(billingSource, /readCommentTranslatorBillingEntitlementSnapshot/);
assert.match(billingSource, /createCommentTranslatorStripeCheckoutSessionResult/);
assert.match(billingSource, /readDefaultPaidEntitlementStore/);
assert.match(billingSource, /billing-state-unavailable/);

const wrangler = JSON.parse(
  readAtBase("wrangler.jsonc"),
);
assert.equal(wrangler.main, ".open-next/worker.js");
assert.deepEqual(wrangler.compatibility_flags, ["nodejs_compat"]);
assert.match(
  readAtBase("open-next.config.ts"),
  /defineCloudflareConfig/,
);

const productionSource = ["app", "components", "lib"]
  .flatMap((directory) =>
    collectSourceFiles(path.join(root, directory)),
  )
  .join("\n");
assert.doesNotMatch(
  productionSource,
  /comment-translator-creator-c1-process-isolation-preflight/,
);
process.stdout.write(
  "comment-translator-creator-c1-process-isolation-production-wiring-design-preflight-contract: pass\n",
);

function collectSourceFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }
    return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)
      ? [fs.readFileSync(entryPath, "utf8")]
      : [];
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readAtBase(file) {
  return execFileSync("git", ["show", `${exactBase}:${file}`], {
    cwd: root,
    encoding: "utf8",
  });
}
