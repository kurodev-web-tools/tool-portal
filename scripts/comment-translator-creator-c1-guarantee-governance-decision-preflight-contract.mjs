import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseRevision = "9d64995dd30fe560a44cf4cf82a3cc67cf00b8d0";
const candidateAuditHead = "0c3309d63a992decb083c95ce1ddffbd9fcadb4f";
const readinessPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md";
const boardPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md";
const taskPath = "task.md";
const externalEvidenceReconciliationPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_CP1_EXTERNAL_EVIDENCE_RECONCILIATION_PREFLIGHT.md";
const contractPath =
  "scripts/comment-translator-creator-c1-guarantee-governance-decision-preflight-contract.mjs";
const sourceProcurementResearchPrefix =
  "docs/archive/2026-07-28-c1-production-source-procurement-ulw-research/";
const allowedChangedPaths = new Set([
  readinessPath,
  externalEvidenceReconciliationPath,
  boardPath,
  taskPath,
  contractPath,
  "scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs",
  "scripts/comment-translator-creator-c1-production-source-procurement-preflight-contract.mjs",
]);

for (const revision of [baseRevision, candidateAuditHead]) {
  execFileSync("git", ["merge-base", "--is-ancestor", revision, "HEAD"], {
    cwd: root,
    stdio: "pipe",
  });
}
execFileSync(
  "git",
  ["merge-base", "--is-ancestor", candidateAuditHead, baseRevision],
  {
    cwd: root,
    stdio: "pipe",
  },
);

const sources = [
  fs.readFileSync(path.join(root, readinessPath), "utf8"),
  fs.readFileSync(path.join(root, boardPath), "utf8"),
  fs.readFileSync(path.join(root, taskPath), "utf8"),
];
const requiredGlobalMarkers = [
  `c1_guarantee_governance_base=${baseRevision}`,
  "c1_guarantee_governance_preflight_status=local-decision-pass-review-ready",
  "c1_guarantee_governance_route_count=3",
  "c1_guarantee_governance_recommendation=operator-provided-exact-source-revision-wait",
  "c1_guarantee_governance_current_guarantee=retained-buffer-zero-fill",
  "c1_guarantee_governance_exact_source_status=absent",
  "c1_guarantee_governance_repeat_candidate_audit_status=prohibited-no-new-exact-source",
  "c1_guarantee_governance_process_isolation_risk_acceptance_status=absent-not-in-this-approval",
  "c1_guarantee_governance_next_approval_unit=single-source-bound-full-stack-feasibility-audit-after-prerequisites",
  "c1_guarantee_governance_approval_status=consumed-local-decision-preflight-only",
  "c1_guarantee_governance_production_adoption_approval_status=absent",
  "production_wiring_status=disconnected-fail-closed",
];

for (const source of sources) {
  assert.match(
    source,
    new RegExp(
      `PR #694 is merged at \`${baseRevision}\`; reviewed candidate-audit head \`${candidateAuditHead}\` is contained in integration\\.`,
    ),
  );
  for (const marker of requiredGlobalMarkers) {
    assert.match(source, new RegExp(`^(?:- )?${escapeRegExp(marker)}$`, "m"));
  }
}

const routeBlocks = [...sources[0].matchAll(/```text\r?\n(route_id=[\s\S]*?)```/g)]
  .map((match) => parseRoute(match[1]))
  .filter((route) => route !== null);
assert.equal(routeBlocks.length, 3);
assert.equal(
  routeBlocks.filter((route) => route.recommendation_status === "selected")
    .length,
  1,
);

const expectedRoutes = new Map([
  [
    "retain-disconnected-current-guarantee",
    {
      recommendation_status: "not-selected-status-quo",
      security_guarantee: "current-buffer-zero-fill-no-production-wiring",
      creator_paid_readiness_impact:
        "blocked-paid-entitlement-production-read",
      evidence_prerequisite: "none-for-hold",
      reversibility: "immediate-status-quo",
      abort_condition: "abort-on-unapproved-wiring-or-guarantee-change",
      next_approval_unit: "none-hold-disconnected",
      repository_scope: "proven-buffer-zero-fill-and-disconnected",
      node_v8_scope: "not-entered-by-c1-production-wiring",
      ipc_native_transport_scope: "not-entered",
      os_scope: "not-entered",
      sdk_client_scope: "disconnected-unverified",
    },
  ],
  [
    "operator-provided-exact-source-revision-wait",
    {
      recommendation_status: "selected",
      security_guarantee: "current-buffer-zero-fill-no-production-wiring",
      creator_paid_readiness_impact:
        "blocked-until-one-candidate-proves-full-stack",
      evidence_prerequisite:
        "single-operator-provided-source-exact-revision-hash-and-full-stack-proof",
      reversibility: "candidate-reject-or-withdraw-to-disconnected",
      abort_condition:
        "missing-source-or-revision-hash-or-any-seven-proof-failure",
      next_approval_unit:
        "single-source-bound-full-stack-feasibility-audit-after-prerequisites",
      repository_scope: "proof-required-copy-free-complete-registry",
      node_v8_scope: "proof-required-no-hidden-or-immutable-retention",
      ipc_native_transport_scope:
        "proof-required-bounded-quiescent-zeroized",
      os_scope: "proof-required-complete-zeroization-attestation",
      sdk_client_scope:
        "proof-required-source-review-and-synchronous-dispose-ack",
    },
  ],
  [
    "accept-process-isolation-residual-risk-and-change-guarantee",
    {
      recommendation_status: "not-selected",
      security_guarantee:
        "changed-to-parent-child-buffer-zero-fill-and-exit-containment",
      creator_paid_readiness_impact:
        "design-candidate-only-production-still-disconnected",
      evidence_prerequisite:
        "explicit-residual-risk-and-guarantee-change-approval",
      reversibility: "disconnect-and-separate-guarantee-restoration",
      abort_condition:
        "absent-or-ambiguous-risk-acceptance-or-scope-drift",
      next_approval_unit:
        "explicit-process-isolation-guarantee-change-decision",
      repository_scope: "proven-bounded-lifecycle-and-observed-exit",
      node_v8_scope: "accepted-risk-unverified-copy-erasure",
      ipc_native_transport_scope: "accepted-risk-unverified-copy-erasure",
      os_scope: "accepted-risk-unverified-copy-erasure",
      sdk_client_scope: "accepted-risk-unverified-retention-teardown",
    },
  ],
]);

assert.deepEqual(
  new Set(routeBlocks.map(({ route_id }) => route_id)),
  new Set(expectedRoutes.keys()),
);
for (const route of routeBlocks) {
  assert.deepEqual(route, {
    route_id: route.route_id,
    ...expectedRoutes.get(route.route_id),
  });
}

const changedPaths = execFileSync(
  "git",
  ["status", "--porcelain=v1", "--untracked-files=all"],
  { cwd: root, encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).trim());
for (const changedPath of changedPaths) {
  assert.equal(
    allowedChangedPaths.has(changedPath) ||
      changedPath.startsWith(sourceProcurementResearchPrefix),
    true,
    changedPath,
  );
}
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
      "package.json",
      "package-lock.json",
      "scripts/comment-translator-creator-c1-zeroizable-client-candidate-source-preflight.mjs",
      "scripts/comment-translator-creator-c1-zeroizable-client-candidate-source-preflight-contract.mjs",
    ],
    { cwd: root, encoding: "utf8" },
  ).trim(),
  "",
);

process.stdout.write(
  "comment-translator-creator-c1-guarantee-governance-decision-preflight-contract: pass\n",
);

function parseRoute(block) {
  const entries = block
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split("=", 2));
  if (entries[0]?.[0] !== "route_id") return null;
  return Object.fromEntries(entries);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
