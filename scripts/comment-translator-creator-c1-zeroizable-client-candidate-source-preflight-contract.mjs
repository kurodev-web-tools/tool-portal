import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const implementationPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-zeroizable-client-candidate-source-preflight.mjs",
);

assert.equal(
  fs.existsSync(implementationPath),
  true,
  "candidate source preflight implementation exists",
);

const {
  classifyCandidateProof,
  createCandidateSourceDecision,
  formatCandidateSourceDecision,
  inspectLocalCandidateSourceEvidence,
} = await import("./comment-translator-creator-c1-zeroizable-client-candidate-source-preflight.mjs");

const requiredProofNames = [
  "completeSourceReview",
  "immutableSecretCopyFree",
  "completeMutableAllocationRegistry",
  "boundedRetention",
  "synchronousAbortReadQuiescence",
  "synchronousDisposeAcknowledgement",
  "completeDownstreamZeroization",
];
const completeProof = Object.fromEntries(
  requiredProofNames.map((name) => [name, true]),
);

assert.deepEqual(classifyCandidateProof(completeProof), {
  decision: "eligible-full-stack-proof",
  failedProofs: [],
});

for (const missingProof of requiredProofNames) {
  assert.deepEqual(
    classifyCandidateProof({
      ...completeProof,
      [missingProof]: false,
    }),
    {
      decision: "rejected-full-stack-proof-incomplete",
      failedProofs: [missingProof],
    },
  );
}

const inspectedEvidence = inspectLocalCandidateSourceEvidence(root);
const evidence = {
  ...inspectedEvidence,
  currentSdk: { ...inspectedEvidence.currentSdk, sourcePresent: false },
  lockfileAlternatives: inspectedEvidence.lockfileAlternatives.map((candidate) => ({
    ...candidate,
    sourcePresent: false,
  })),
};
assert.deepEqual(evidence.currentSdk, {
  version: "2.106.2",
  sourcePresent: false,
  immutableConstructionCopyObserved: true,
});
assert.deepEqual(evidence.lockfileAlternatives, [
  { name: "undici", version: "7.24.8", sourcePresent: false },
  { name: "node-fetch", version: "2.7.0", sourcePresent: false },
  { name: "ws", version: "8.20.1", sourcePresent: false },
]);
assert.equal(evidence.nodeBuiltin.sourcePresent, true);
assert.equal(evidence.nodeBuiltin.immutableHeaderConstructionObserved, true);
assert.equal(evidence.nodeBuiltin.bufferedRetentionObserved, true);
assert.equal(evidence.nodeBuiltin.nativeWriteBoundaryObserved, true);
assert.equal(evidence.customBoundary.sourceFileCount, 3);
assert.equal(evidence.customBoundary.productionImportCount, 0);
assert.equal(evidence.customBoundary.transportImplementationPresent, false);

const result = createCandidateSourceDecision(evidence);
assert.deepEqual(Object.keys(result), [
  "executionStatus",
  "preflightStatus",
  "candidateClassCount",
  "eligibleCandidateCount",
  "rejectedCandidateCount",
  "currentSdkVersion",
  "currentSdkStatus",
  "lockfileAlternativeVersionBinding",
  "lockfileAlternativeStatus",
  "nodeRuntimeVersionBinding",
  "nodeBuiltinTransportStatus",
  "customBoundaryRevisionBinding",
  "customBoundaryStatus",
  "sameProcessDecision",
  "childProcessDecision",
  "zeroizableClientDecision",
  "repositoryProofStatus",
  "nodeV8ProofStatus",
  "nativeTransportProofStatus",
  "osProofStatus",
  "sdkClientProofStatus",
  "abortReadQuiescenceStatus",
  "synchronousDisposeAcknowledgementStatus",
  "downstreamZeroizationStatus",
  "productionWiringStatus",
  "productionAdoptionApprovalStatus",
  "sanitizedResultFieldCount",
]);
assert.deepEqual(result, {
  executionStatus: "pass",
  preflightStatus: "local-source-audit-pass-not-adopted",
  candidateClassCount: 4,
  eligibleCandidateCount: 0,
  rejectedCandidateCount: 4,
  currentSdkVersion: "2.106.2",
  currentSdkStatus: "rejected-source-absent-and-immutable-construction",
  lockfileAlternativeVersionBinding:
    "undici@7.24.8,node-fetch@2.7.0,ws@8.20.1",
  lockfileAlternativeStatus: "rejected-source-absent",
  nodeRuntimeVersionBinding:
    `node@${process.version},v8@${process.versions.v8},uv@${process.versions.uv},openssl@${process.versions.openssl}`,
  nodeBuiltinTransportStatus:
    "rejected-immutable-header-and-unregistered-native-retention",
  customBoundaryRevisionBinding:
    "pr693-head-e1f48e0cd6d0eeb94e4546b5c2d5c20487354e61",
  customBoundaryStatus: "rejected-repository-only-no-transport",
  sameProcessDecision: "rejected-immutable-copy",
  childProcessDecision: "not-adopted-exit-containment-only",
  zeroizableClientDecision: "recommended-direction-no-production-candidate",
  repositoryProofStatus: "pass-synthetic-only",
  nodeV8ProofStatus: "partial-js-hidden-allocation-unverified",
  nativeTransportProofStatus: "unverified",
  osProofStatus: "unverified",
  sdkClientProofStatus: "source-absent-unverified",
  abortReadQuiescenceStatus:
    "unverified-no-synchronous-quiescence-attestation",
  synchronousDisposeAcknowledgementStatus:
    "unverified-no-full-stack-acknowledgement",
  downstreamZeroizationStatus: "unverified",
  productionWiringStatus: "disconnected-fail-closed",
  productionAdoptionApprovalStatus:
    "absent-required-after-full-stack-proof",
  sanitizedResultFieldCount: 27,
});

const formatted = formatCandidateSourceDecision(result);
assert.equal(formatted.trim().split("\n").length, 27);
assert.doesNotMatch(
  formatted,
  /credential|token|cookie|authorization|payload|constructor.arguments|request.contents|private.path/i,
);
assert.match(
  formatted,
  /^execution_status=pass[\s\S]*production_wiring_status=disconnected-fail-closed$/m,
);

for (const directory of ["app", "components", "lib"]) {
  const sources = collectSourceFiles(path.join(root, directory))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  assert.doesNotMatch(
    sources,
    /zeroizable-client-candidate-source-preflight/,
  );
}

function collectSourceFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? collectSourceFiles(entryPath)
      : /\.(?:[cm]?[jt]sx?)$/.test(entry.name)
        ? [entryPath]
        : [];
  });
}

process.stdout.write(
  "comment-translator-creator-c1-zeroizable-client-candidate-source-preflight-contract: pass\n",
);
