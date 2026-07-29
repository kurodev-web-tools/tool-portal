import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseRevision = "d206ff2c07cc10aeb701d0d2034a29b17f58d42b";
const candidateCommit = "1e0bbefa8062043b34e89a7f04897304d7a7ffe7";
const readinessPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md";
const boardPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md";
const taskPath = "task.md";
const externalEvidenceReconciliationPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_CP1_EXTERNAL_EVIDENCE_RECONCILIATION_PREFLIGHT.md";
const contractPath =
  "scripts/comment-translator-creator-c1-production-source-procurement-preflight-contract.mjs";
const cp1ContractPath =
  "scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs";
const researchPrefix =
  "docs/archive/2026-07-28-c1-production-source-procurement-ulw-research/";
const researchPaths = [
  "cause-disappearance.md",
  "claim-graph.md",
  "expansion-log.md",
  "intent-diff.md",
  "observation-manifest.md",
  "verification-economics.md",
  "wave-1-candidate-skeptic.md",
  "wave-1-libcurl-transport.md",
  "wave-1-node-libcurl-provenance.md",
  "wave-1-node-runtime-native.md",
  "wave-1-repo-callpath.md",
  "wave-1-repo-guarantee.md",
  "wave-1-tls-os-attestation.md",
  "wave-2-attestation-countersearch.md",
  "wave-2-provenance-expansion.md",
].map((fileName) => `${researchPrefix}${fileName}`);

execFileSync("git", ["merge-base", "--is-ancestor", baseRevision, "HEAD"], {
  cwd: root,
  stdio: "pipe",
});

const sources = [readinessPath, boardPath, taskPath].map((sourcePath) =>
  fs.readFileSync(path.join(root, sourcePath), "utf8"),
);
const requiredMarkers = [
  `c1_source_procurement_base=${baseRevision}`,
  "c1_source_procurement_preflight_status=blocked-no-feasible-full-stack-candidate",
  "c1_source_procurement_candidate_envelope_count=1",
  "c1_source_procurement_candidate_id=node-libcurl-v5.1.2-libcurl-8.17.0-win32-x64-node-v127",
  "c1_source_procurement_candidate_commit=1e0bbefa8062043b34e89a7f04897304d7a7ffe7",
  "c1_source_procurement_candidate_tag=v5.1.2",
  "c1_source_procurement_tag_signature_status=unsigned-rejection-evidence-only-not-acquisition-authority",
  "c1_source_procurement_eligible_candidate_count=0",
  "c1_source_procurement_required_proof_count=7",
  "c1_source_procurement_proven_proof_count=0",
  "c1_source_procurement_pr694_repeat_audit_status=not-run",
  "c1_source_procurement_network_scope=official-metadata-read-only",
  "c1_source_procurement_transitive_source_closure_status=incomplete-no-sbom-or-license-closure",
  "c1_source_procurement_runtime_binding=node-v127-node22-v8-12.4-napi10-win32-x64",
  "c1_source_procurement_source_archive_download_status=not-run-not-approved",
  "c1_source_procurement_dependency_install_status=not-run-not-approved",
  "c1_source_procurement_guarantee_change_status=not-run-not-approved",
  "c1_source_procurement_residual_risk_acceptance_status=absent-not-in-this-approval",
  "c1_source_procurement_acquisition_procedure=future-rejection-evidence-preservation-only",
  "c1_source_procurement_rollback=discard-separate-evidence-worktree-retain-disconnected",
  "c1_source_procurement_evidence_preservation_abort_condition=revision-or-checksum-mismatch-or-new-provenance-discrepancy",
  "c1_source_procurement_eligibility_reject_condition=any-seven-proof-gap",
  "c1_source_procurement_final_blocker=missing-byte-only-api-and-full-stack-lifecycle-zeroization-attestation",
  "c1_source_procurement_next_approval_unit=none-no-feasible-source-acquisition",
  "production_wiring_status=disconnected-fail-closed",
];
for (const source of sources) {
  for (const marker of requiredMarkers) {
    assert.match(source, new RegExp(`^(?:- )?${escapeRegExp(marker)}$`, "m"));
  }
}

const candidateBlocks = [
  ...sources[0].matchAll(
    /```text\r?\n(c1_source_candidate_id=[\s\S]*?)```/g,
  ),
].map((match) => Object.fromEntries(
  match[1]
    .trim()
    .split(/\r?\n/)
    .map(splitMarker),
));
assert.equal(candidateBlocks.length, 1);
assert.deepEqual(candidateBlocks[0], {
  c1_source_candidate_id:
    "node-libcurl-v5.1.2-libcurl-8.17.0-win32-x64-node-v127",
  repository_url: "https://github.com/JCMais/node-libcurl",
  exact_tag: "v5.1.2",
  exact_commit: candidateCommit,
  npm_source_archive:
    "https://registry.npmjs.org/node-libcurl/-/node-libcurl-5.1.2.tgz",
  npm_source_archive_integrity:
    "sha512-lpPIQu7JqYhrlDbd3esuHyQ9lusvSReQfkpLRw7S80NdJ8hFBRlqHgwQ8RHUIf2JLaAmdUazj26sw0KR+5YsbQ==",
  win32_x64_node_v127_asset_sha256:
    "da05a3b1e51503a2df33f442cfa430926b386018647a37ebcfcd8a7d6c2a74e5",
  package_license: "MIT",
  candidate_status: "rejected-full-stack-proof-incomplete",
});

const proofBlocks = [
  ...sources[0].matchAll(
    /```text\r?\n(c1_source_proof=[\s\S]*?)```/g,
  ),
].map((match) => Object.fromEntries(
  match[1]
    .trim()
    .split(/\r?\n/)
    .map(splitMarker),
));
assert.equal(proofBlocks.length, 7);
assert.deepEqual(
  proofBlocks.map(({ c1_source_proof }) => c1_source_proof),
  [
    "completeSourceReview",
    "immutableSecretCopyFree",
    "completeMutableAllocationRegistry",
    "boundedRetention",
    "synchronousAbortReadQuiescence",
    "synchronousDisposeAcknowledgement",
    "completeDownstreamZeroization",
  ],
);
for (const proof of proofBlocks) {
  assert.equal(proof.status, "not-proven");
}

const allowedChangedPaths = new Set([
  readinessPath,
  externalEvidenceReconciliationPath,
  boardPath,
  taskPath,
  contractPath,
  cp1ContractPath,
  "scripts/comment-translator-creator-c1-guarantee-governance-decision-preflight-contract.mjs",
  "scripts/comment-translator-creator-c1-process-isolation-preflight-contract.mjs",
  "scripts/comment-translator-creator-c1-process-isolation-production-wiring-design-preflight-contract.mjs",
  "scripts/comment-translator-creator-c1-process-isolation-runtime-target-feasibility-contract.mjs",
  "scripts/comment-translator-creator-c1-process-isolation-runtime-target-selection-contract.mjs",
  "scripts/comment-translator-creator-c1-production-constructor-compatibility-contract.mjs",
  "scripts/comment-translator-task-board-creator-roadmap-contract.mjs",
  ...researchPaths,
]);
const atProcurementRevision =
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim()
  === baseRevision;
if (atProcurementRevision) {
  const changedPaths = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    { cwd: root, encoding: "utf8" },
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
  for (const changedPath of changedPaths) {
    assert.equal(allowedChangedPaths.has(changedPath), true, changedPath);
  }
}

process.stdout.write(
  "comment-translator-creator-c1-production-source-procurement-preflight-contract: pass\n",
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitMarker(line) {
  const separator = line.indexOf("=");
  return [line.slice(0, separator), line.slice(separator + 1)];
}
