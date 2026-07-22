import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const scriptsRoot = path.join(root, "scripts");
const selfPath = fileURLToPath(import.meta.url);
const manifestPath = path.join(root, "scripts/fixtures/comment-translator-task-board-contract-baseline.json");
const timeoutMs = 60_000;
const approvedBaseSha = "e465e6b99a4c9082cd5f95b96ba585c15c37ab4a";
const expectedBaselineTotal = 170;
const expectedBaselinePass = 43;
const expectedBaselineFail = 127;
const expectedManifestMappingSha256 = "071377319ac69be75093fa8569c1dceaabb1a6db079f4a9da95425d0917535d9";
const focusedContractPath = "scripts/comment-translator-task-board-creator-roadmap-contract.mjs";
const selfTestFlag = "--self-test";

function discoverTaskContracts(directory) {
  const discovered = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"));

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      discovered.push(...discoverTaskContracts(absolutePath));
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name) !== ".mjs" || path.resolve(absolutePath) === selfPath) {
      continue;
    }

    const source = fs.readFileSync(absolutePath, "utf8").toLowerCase();
    if (source.includes("task") && source.includes(".md")) {
      discovered.push(absolutePath);
    }
  }

  return discovered;
}

function displayPath(absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function gitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
  });
  assert.equal(result.status, 0);
  assert.equal(result.error, undefined);
  return result.stdout;
}

function discoverBaseTaskContracts(baseSha) {
  const names = gitOutput(["ls-tree", "-r", "--name-only", "-z", baseSha, "--", "scripts"])
    .split("\0")
    .filter((name) => name.endsWith(".mjs"));
  const discovered = [];
  for (const name of names) {
    const source = gitOutput(["show", `${baseSha}:${name}`]).toLowerCase();
    if (source.includes("task") && source.includes(".md")) {
      discovered.push(name);
    }
  }
  return discovered.sort((left, right) => left.localeCompare(right, "en"));
}

function manifestMappingSha256(contracts) {
  const canonical = contracts.map((entry) => `${entry.path}\t${entry.status}\n`).join("");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function assertExactManifestMapping(contracts) {
  assert.equal(manifestMappingSha256(contracts), expectedManifestMappingSha256);
}

function readValidatedManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.deepEqual(Object.keys(manifest).sort(), [
    "baseSha",
    "baselineFail",
    "baselinePass",
    "baselineTotal",
    "contracts",
  ]);
  assert.equal(manifest.baseSha, approvedBaseSha);
  assert.equal(manifest.baselineTotal, expectedBaselineTotal);
  assert.equal(manifest.baselinePass, expectedBaselinePass);
  assert.equal(manifest.baselineFail, expectedBaselineFail);
  assert.ok(Array.isArray(manifest.contracts));
  assert.equal(manifest.contracts.length, expectedBaselineTotal);

  const paths = [];
  let passCount = 0;
  for (const entry of manifest.contracts) {
    assert.deepEqual(Object.keys(entry).sort(), ["path", "status"]);
    assert.equal(typeof entry.path, "string");
    assert.match(entry.path, /^scripts\/[A-Za-z0-9._/-]+\.mjs$/);
    assert.equal(path.posix.normalize(entry.path), entry.path);
    assert.ok(entry.status === "PASS" || entry.status === "FAIL");
    paths.push(entry.path);
    if (entry.status === "PASS") {
      passCount += 1;
    }
  }

  assert.equal(new Set(paths).size, expectedBaselineTotal);
  assert.deepEqual(paths, [...paths].sort((left, right) => left.localeCompare(right, "en")));
  assert.equal(passCount, expectedBaselinePass);
  assert.equal(paths.length - passCount, expectedBaselineFail);
  assert.deepEqual(paths, discoverBaseTaskContracts(manifest.baseSha));
  assertExactManifestMapping(manifest.contracts);
  return manifest;
}

function classifyResult(baselineStatus, passed) {
  if (baselineStatus === "PASS") {
    return passed ? "PRESERVED_PASS" : "REGRESSION";
  }
  if (baselineStatus === "FAIL") {
    return passed ? "RECOVERED" : "BASELINE_FAIL";
  }
  return passed ? "NEW_PASS" : "NEW_FAIL";
}

function missingBaselinePaths(baselinePaths, currentPaths) {
  const current = new Set(currentPaths);
  return baselinePaths.filter((name) => !current.has(name));
}

function intersectBaselinePaths(baselinePaths, changedPaths) {
  const changed = new Set(changedPaths);
  return baselinePaths.filter((name) => changed.has(name));
}

function changedBaselinePaths(baselinePaths, baseSha) {
  const changed = gitOutput(["diff", "--name-only", "-z", baseSha, "--"])
    .split("\0")
    .filter(Boolean)
    .map((name) => name.split(path.sep).join("/"));
  return intersectBaselinePaths(baselinePaths, changed);
}

function runContract(relativePath) {
  const result = spawnSync(process.execPath, [path.join(root, relativePath)], {
    cwd: root,
    encoding: "utf8",
    stdio: "ignore",
    timeout: timeoutMs,
    windowsHide: true,
  });
  return {
    passed: result.status === 0 && result.error === undefined,
    executionError: result.status === null || result.error !== undefined,
  };
}

function emitSummary(counts) {
  console.log(
    `baseline_total=${expectedBaselineTotal} baseline_pass=${expectedBaselinePass} preserved_pass=${counts.preservedPass} regressions=${counts.regressions} baseline_fail=${counts.baselineFail} new_pass=${counts.newPass} new_fail=${counts.newFail} baseline_scripts_modified=${counts.baselineScriptsModified}`,
  );
}

function runSelfTest() {
  assert.equal(classifyResult("PASS", true), "PRESERVED_PASS");
  assert.equal(classifyResult("PASS", false), "REGRESSION");
  assert.equal(classifyResult("FAIL", false), "BASELINE_FAIL");
  assert.equal(classifyResult("FAIL", true), "RECOVERED");
  assert.equal(classifyResult(undefined, true), "NEW_PASS");
  assert.equal(classifyResult(undefined, false), "NEW_FAIL");
  const manifest = readValidatedManifest();
  const baselinePaths = manifest.contracts.map((entry) => entry.path);
  assert.equal(baselinePaths.length, expectedBaselineTotal);
  assert.equal(missingBaselinePaths(baselinePaths, []).length, expectedBaselineTotal);
  assert.deepEqual(missingBaselinePaths(baselinePaths, baselinePaths), []);
  assert.deepEqual(intersectBaselinePaths(baselinePaths, [baselinePaths[0]]), [baselinePaths[0]]);
  const passIndex = manifest.contracts.findIndex((entry) => entry.status === "PASS");
  const failIndex = manifest.contracts.findIndex((entry) => entry.status === "FAIL");
  assert.notEqual(passIndex, -1);
  assert.notEqual(failIndex, -1);
  const swappedStatuses = manifest.contracts.map((entry) => ({ ...entry }));
  swappedStatuses[passIndex].status = "FAIL";
  swappedStatuses[failIndex].status = "PASS";
  assert.equal(swappedStatuses.filter((entry) => entry.status === "PASS").length, expectedBaselinePass);
  assert.throws(() => assertExactManifestMapping(swappedStatuses));
  console.log("task_contract_comparator_self_test=pass");
}

function runSuite() {
  const emptyCounts = {
    preservedPass: 0,
    regressions: 0,
    baselineFail: 0,
    newPass: 0,
    newFail: 0,
    baselineScriptsModified: 0,
  };

  try {
    const manifest = readValidatedManifest();
    const baselineByPath = new Map(manifest.contracts.map((entry) => [entry.path, entry.status]));
    const baselinePaths = manifest.contracts.map((entry) => entry.path);
    const currentPaths = discoverTaskContracts(scriptsRoot)
      .map(displayPath)
      .sort((left, right) => left.localeCompare(right, "en"));
    const currentSet = new Set(currentPaths);
    const missingPaths = missingBaselinePaths(baselinePaths, currentPaths);
    const modifiedPaths = changedBaselinePaths(baselinePaths, manifest.baseSha);
    const counts = { ...emptyCounts, baselineScriptsModified: modifiedPaths.length };
    let executionErrors = 0;

    if (modifiedPaths.length > 0) {
      console.log("FAIL baseline_script_modified_gate exit=1");
      emitSummary(counts);
      process.exitCode = 1;
      return;
    }

    for (const missingPath of missingPaths) {
      console.log(`MISSING_BASELINE ${missingPath}`);
    }

    let focusedPassed = false;
    for (const currentPath of currentPaths) {
      const result = runContract(currentPath);
      const classification = classifyResult(baselineByPath.get(currentPath), result.passed);
      console.log(`${classification} ${currentPath}`);
      if (classification === "PRESERVED_PASS") counts.preservedPass += 1;
      if (classification === "REGRESSION") counts.regressions += 1;
      if (classification === "BASELINE_FAIL") counts.baselineFail += 1;
      if (classification === "NEW_PASS") counts.newPass += 1;
      if (classification === "NEW_FAIL") counts.newFail += 1;
      if (result.executionError) executionErrors += 1;
      if (currentPath === focusedContractPath) focusedPassed = result.passed;
    }

    if (!currentSet.has(focusedContractPath)) {
      console.log(`NEW_FAIL ${focusedContractPath}`);
      counts.newFail += 1;
    }

    emitSummary(counts);
    if (
      !focusedPassed
      || counts.regressions > 0
      || counts.newFail > 0
      || missingPaths.length > 0
      || counts.baselineScriptsModified > 0
      || executionErrors > 0
    ) {
      process.exitCode = 1;
    }
  } catch {
    console.log("FAIL task_contract_manifest_or_discovery exit=1");
    emitSummary(emptyCounts);
    process.exitCode = 1;
  }
}

if (process.argv.includes(selfTestFlag)) {
  try {
    runSelfTest();
  } catch {
    console.log("task_contract_comparator_self_test=fail");
    process.exitCode = 1;
  }
} else {
  runSuite();
}
