import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  createCanonicalObservation,
  inspectCatalogReadbackArtifact,
  projectCanonicalStructuralState
} from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";

const expectedHashes = Object.freeze({
  production: "569c325d2e09274f1b24b8352b482e8e38fcd3c94478b45824bfc7f8254bd3db",
  preview: "489b36c13953b9fa1f508ea7e8bdb9a6ca5cb0aa0998de07cbbbe4189d174a16"
});
const rootValue = process.env.GATE1_CATALOG_READBACK_DIR;
const explicitTargetRoots = Object.freeze({
  production: process.env.GATE1_CATALOG_READBACK_PRODUCTION_DIR,
  preview: process.env.GATE1_CATALOG_READBACK_PREVIEW_DIR
});

function emptyMutationCounts() {
  return { ddl: 0, dml: 0, rpc: 0, remote: 0, total: 0 };
}

function inspectTarget(target) {
  const result = {
    target,
    artifactSha256Match: false,
    entryCount: 0,
    valid: false,
    missing: []
  };
  const explicitRoot = explicitTargetRoots[target];
  if ((typeof explicitRoot !== "string" || explicitRoot.length === 0)
    && (typeof rootValue !== "string" || rootValue.length === 0)) {
    result.missing = ["GATE1_CATALOG_READBACK_DIR"];
    return result;
  }

  try {
    const targetDirectory = typeof explicitRoot === "string" && explicitRoot.length > 0
      ? path.resolve(explicitRoot)
      : path.join(path.resolve(rootValue), target);
    const entries = fs.readdirSync(targetDirectory, { withFileTypes: true });
    result.entryCount = entries.length;
    const expectedFile = `${target}-catalog-readback.json`;
    if (entries.length !== 1 || entries[0].name !== expectedFile || !entries[0].isFile()) {
      result.missing = ["artifact.directory-shape"];
      return result;
    }
    const artifactPath = path.join(targetDirectory, expectedFile);
    if (fs.lstatSync(artifactPath).isSymbolicLink()) {
      result.missing = ["artifact.reparse"];
      return result;
    }
    const raw = fs.readFileSync(artifactPath);
    result.artifactSha256Match = crypto.createHash("sha256").update(raw).digest("hex") === expectedHashes[target];
    if (!result.artifactSha256Match) result.missing.push("artifact.sha256");
    const artifact = JSON.parse(raw.toString("utf8"));
    const validation = inspectCatalogReadbackArtifact(artifact, target);
    result.missing.push(...validation.missing);
    result.valid = result.artifactSha256Match && validation.valid;
    result.observed = validation.observed;
    if (result.valid && target === "preview") {
      const structural = projectCanonicalStructuralState(artifact.canonical);
      const observation = createCanonicalObservation(artifact.canonical, result.artifactSha256Match ? expectedHashes[target] : "");
      result.derived = {
        schemaVersion: 2,
        canonicalStructuralTableCount: structural.tables.length,
        canonicalStructuralFunctionCount: structural.functions.length,
        canonicalStructuralTriggerCount: structural.triggers.length,
        canonicalObservationRowCount: observation.rows.length,
        canonicalObservationAggregateSha256: observation.aggregateSha256
      };
    }
  } catch {
    result.missing = ["artifact.unreadable"];
  }
  result.missing = [...new Set(result.missing)].sort();
  return result;
}

const targets = [inspectTarget("production"), inspectTarget("preview")];
const valid = targets.every((target) => target.valid);
console.log(JSON.stringify({
  schemaVersion: 1,
  status: valid ? "PASS" : "FAIL",
  reason: valid ? null : "CATALOG_READBACK_INCOMPLETE",
  targets,
  mutationCounts: emptyMutationCounts()
}));
if (!valid) process.exitCode = 1;
