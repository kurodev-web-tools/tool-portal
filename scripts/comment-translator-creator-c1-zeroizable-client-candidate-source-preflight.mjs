import fs from "node:fs";
import path, { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_PROOFS = [
  "completeSourceReview",
  "immutableSecretCopyFree",
  "completeMutableAllocationRegistry",
  "boundedRetention",
  "synchronousAbortReadQuiescence",
  "synchronousDisposeAcknowledgement",
  "completeDownstreamZeroization",
];
const CUSTOM_BOUNDARY_REVISION =
  "pr693-head-e1f48e0cd6d0eeb94e4546b5c2d5c20487354e61";
const CUSTOM_BOUNDARY_FILES = [
  "comment-translator-creator-c1-zeroizable-client-api-preflight.mjs",
  "comment-translator-creator-c1-zeroizable-client-api-preflight-ownership.mjs",
  "comment-translator-creator-c1-zeroizable-client-api-preflight-contract.mjs",
];

export function classifyCandidateProof(proof) {
  const failedProofs = REQUIRED_PROOFS.filter((name) => proof[name] !== true);
  return Object.freeze({
    decision:
      failedProofs.length === 0
        ? "eligible-full-stack-proof"
        : "rejected-full-stack-proof-incomplete",
    failedProofs: Object.freeze(failedProofs),
  });
}

export function inspectLocalCandidateSourceEvidence(root) {
  const packageLock = JSON.parse(
    fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
  );
  const packages = packageLock.packages ?? {};
  const storeSource = fs.readFileSync(
    path.join(root, "lib/comment-translator-paid-entitlement-store.ts"),
    "utf8",
  );
  const nativeSources = process.binding("natives");
  const outgoingSource = nativeSources._http_outgoing ?? "";
  const streamBaseSource =
    nativeSources["internal/stream_base_commons"] ?? "";
  const writableSource = nativeSources["internal/streams/writable"] ?? "";
  const scriptsDirectory = path.join(root, "scripts");
  const customSources = CUSTOM_BOUNDARY_FILES.map((file) =>
    fs.readFileSync(path.join(scriptsDirectory, file), "utf8"),
  );
  const productionImportCount = ["app", "components", "lib"]
    .flatMap((directory) => collectSourceFiles(path.join(root, directory)))
    .map((file) => fs.readFileSync(file, "utf8"))
    .filter((source) =>
      /zeroizable-client-(?:api|candidate-source)-preflight/.test(source),
    ).length;

  const currentSdk = Object.freeze({
    version: readLockedVersion(packages, "@supabase/supabase-js"),
    sourcePresent: fs.existsSync(
      path.join(root, "node_modules", "@supabase", "supabase-js"),
    ),
    immutableConstructionCopyObserved:
      /env\[name\]\?\.trim\(\)/.test(storeSource) &&
      /createClient\(url, serviceRoleKey,/.test(storeSource),
  });
  const lockfileAlternatives = Object.freeze(
    ["undici", "node-fetch", "ws"].map((name) =>
      Object.freeze({
        name,
        version: readLockedVersion(packages, name),
        sourcePresent: fs.existsSync(path.join(root, "node_modules", name)),
      }),
    ),
  );
  const nodeBuiltin = Object.freeze({
    sourcePresent:
      outgoingSource.length > 0 &&
      streamBaseSource.length > 0 &&
      writableSource.length > 0,
    immutableHeaderConstructionObserved:
      outgoingSource.includes("state.header += key + ': ' + value"),
    bufferedRetentionObserved:
      streamBaseSource.includes("req.buffer = data") &&
      writableSource.includes("state[kBufferedValue]"),
    nativeWriteBoundaryObserved:
      streamBaseSource.includes("handle.writeBuffer(req, data)"),
    versionBinding:
      `node@${process.version},v8@${process.versions.v8},uv@${process.versions.uv},openssl@${process.versions.openssl}`,
  });
  const customBoundary = Object.freeze({
    revisionBinding: CUSTOM_BOUNDARY_REVISION,
    sourceFileCount: customSources.length,
    productionImportCount,
    transportImplementationPresent: customSources.some((source) =>
      /(?:from\s+|import\s+)["'](?:node:(?:http|https|net|tls)|undici|node-fetch|@supabase)/.test(
        source,
      ),
    ),
  });

  return Object.freeze({
    currentSdk,
    lockfileAlternatives,
    nodeBuiltin,
    customBoundary,
    candidateProofs: Object.freeze([
      createRejectedProof(),
      createRejectedProof(),
      createRejectedProof(),
      Object.freeze({
        completeSourceReview: false,
        immutableSecretCopyFree: true,
        completeMutableAllocationRegistry: true,
        boundedRetention: false,
        synchronousAbortReadQuiescence: false,
        synchronousDisposeAcknowledgement: false,
        completeDownstreamZeroization: false,
      }),
    ]),
  });
}

export function createCandidateSourceDecision(evidence) {
  const candidateDecisions = evidence.candidateProofs.map(
    classifyCandidateProof,
  );
  const eligibleCandidateCount = candidateDecisions.filter(
    ({ decision }) => decision === "eligible-full-stack-proof",
  ).length;
  const alternativeBinding = evidence.lockfileAlternatives
    .map(({ name, version }) => `${name}@${version}`)
    .join(",");

  return Object.freeze({
    executionStatus: "pass",
    preflightStatus: "local-source-audit-pass-not-adopted",
    candidateClassCount: candidateDecisions.length,
    eligibleCandidateCount,
    rejectedCandidateCount:
      candidateDecisions.length - eligibleCandidateCount,
    currentSdkVersion: evidence.currentSdk.version,
    currentSdkStatus:
      evidence.currentSdk.sourcePresent
        ? "rejected-full-stack-proof-incomplete"
        : "rejected-source-absent-and-immutable-construction",
    lockfileAlternativeVersionBinding: alternativeBinding,
    lockfileAlternativeStatus: evidence.lockfileAlternatives.every(
      ({ sourcePresent }) => !sourcePresent,
    )
      ? "rejected-source-absent"
      : "rejected-full-stack-proof-incomplete",
    nodeRuntimeVersionBinding: evidence.nodeBuiltin.versionBinding,
    nodeBuiltinTransportStatus:
      "rejected-immutable-header-and-unregistered-native-retention",
    customBoundaryRevisionBinding: evidence.customBoundary.revisionBinding,
    customBoundaryStatus:
      evidence.customBoundary.transportImplementationPresent
        ? "rejected-full-stack-proof-incomplete"
        : "rejected-repository-only-no-transport",
    sameProcessDecision: "rejected-immutable-copy",
    childProcessDecision: "not-adopted-exit-containment-only",
    zeroizableClientDecision:
      "recommended-direction-no-production-candidate",
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
}

export function formatCandidateSourceDecision(result) {
  return Object.entries(result)
    .map(([name, value]) => `${toSnakeCase(name)}=${value}`)
    .join("\n");
}

function createRejectedProof() {
  return Object.freeze(
    Object.fromEntries(REQUIRED_PROOFS.map((name) => [name, false])),
  );
}

function readLockedVersion(packages, name) {
  return packages[`node_modules/${name}`]?.version ?? "absent";
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

function toSnakeCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

const directInvocation =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (directInvocation) {
  const evidence = inspectLocalCandidateSourceEvidence(process.cwd());
  process.stdout.write(
    `${formatCandidateSourceDecision(createCandidateSourceDecision(evidence))}\n`,
  );
}
