import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
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

function displayPath(absolutePath, repositoryRoot = root) {
  return path.relative(repositoryRoot, absolutePath).split(path.sep).join("/");
}

function gitOutput(args, repositoryRoot = root) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: timeoutMs,
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

function changedBaselinePaths(baselinePaths, baseSha, repositoryRoot = root) {
  const changed = gitOutput(["diff", "--name-only", "-z", baseSha, "--"], repositoryRoot)
    .split("\0")
    .filter(Boolean)
    .map((name) => name.split(path.sep).join("/"));
  return intersectBaselinePaths(baselinePaths, changed);
}

function runContract(relativePath, repositoryRoot = root, contractTimeoutMs = timeoutMs, executable = process.execPath) {
  const result = spawnSync(executable, [path.join(repositoryRoot, relativePath)], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "ignore",
    timeout: contractTimeoutMs,
    windowsHide: true,
  });
  return {
    passed: result.status === 0 && result.error === undefined,
    executionError: result.status === null || result.error !== undefined,
  };
}

function summaryLine(baselineTotal, baselinePass, counts) {
  return `baseline_total=${baselineTotal} baseline_pass=${baselinePass} preserved_pass=${counts.preservedPass} regressions=${counts.regressions} baseline_fail=${counts.baselineFail} new_pass=${counts.newPass} new_fail=${counts.newFail} baseline_scripts_modified=${counts.baselineScriptsModified} execution_errors=${counts.executionErrors}`;
}

function evaluateComparator({ manifest, currentPaths, modifiedPaths, contractRunner, focusedPath, emit }) {
  const counts = {
    preservedPass: 0,
    regressions: 0,
    baselineFail: 0,
    newPass: 0,
    newFail: 0,
    baselineScriptsModified: modifiedPaths.length,
    executionErrors: 0,
  };
  const baselineByPath = new Map(manifest.contracts.map((entry) => [entry.path, entry.status]));
  const baselinePaths = manifest.contracts.map((entry) => entry.path);
  const currentSet = new Set(currentPaths);
  const missingPaths = missingBaselinePaths(baselinePaths, currentPaths);

  if (modifiedPaths.length > 0) {
    emit("FAIL baseline_script_modified_gate exit=1");
    emit(summaryLine(manifest.baselineTotal, manifest.baselinePass, counts));
    return { exitCode: 1, counts };
  }

  for (const missingPath of missingPaths) emit(`MISSING_BASELINE ${missingPath}`);

  let focusedPassed = false;
  for (const currentPath of currentPaths) {
    const result = contractRunner(currentPath);
    const classification = classifyResult(baselineByPath.get(currentPath), result.passed);
    emit(`${classification} ${currentPath}`);
    if (result.executionError) {
      counts.executionErrors += 1;
      emit(`EXECUTION_ERROR ${currentPath}`);
    }
    if (classification === "PRESERVED_PASS") counts.preservedPass += 1;
    if (classification === "REGRESSION") counts.regressions += 1;
    if (classification === "BASELINE_FAIL") counts.baselineFail += 1;
    if (classification === "NEW_PASS") counts.newPass += 1;
    if (classification === "NEW_FAIL") counts.newFail += 1;
    if (currentPath === focusedPath) focusedPassed = result.passed;
  }

  if (!currentSet.has(focusedPath)) {
    emit(`NEW_FAIL ${focusedPath}`);
    counts.newFail += 1;
  }

  emit(summaryLine(manifest.baselineTotal, manifest.baselinePass, counts));
  const exitCode = (
    !focusedPassed
    || counts.regressions > 0
    || counts.newFail > 0
    || missingPaths.length > 0
    || counts.executionErrors > 0
  ) ? 1 : 0;
  return { exitCode, counts };
}

function createBehaviorFixture(baselineStatus = "PASS", baselineSource = "void 'task.md';") {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "task-contract-suite-"));
  fs.mkdirSync(path.join(fixtureRoot, "scripts"), { recursive: true });
  const baselinePath = "scripts/baseline-contract.mjs";
  const focusedPath = "scripts/focused-contract.mjs";
  fs.writeFileSync(path.join(fixtureRoot, baselinePath), baselineSource, "utf8");
  gitOutput(["init", "-q"], fixtureRoot);
  gitOutput(["config", "user.email", "contract-fixture@example.invalid"], fixtureRoot);
  gitOutput(["config", "user.name", "Contract Fixture"], fixtureRoot);
  gitOutput(["add", "--", baselinePath], fixtureRoot);
  gitOutput(["commit", "-q", "-m", "baseline"], fixtureRoot);
  const baseSha = gitOutput(["rev-parse", "HEAD"], fixtureRoot).trim();
  fs.writeFileSync(path.join(fixtureRoot, focusedPath), "void 'task.md';", "utf8");
  return {
    fixtureRoot,
    baselinePath,
    focusedPath,
    baseSha,
    manifest: {
      baselineTotal: 1,
      baselinePass: baselineStatus === "PASS" ? 1 : 0,
      contracts: [{ path: baselinePath, status: baselineStatus }],
    },
  };
}

function removeBehaviorFixture(fixtureRoot) {
  const temporaryRoot = path.resolve(os.tmpdir()).toLowerCase();
  const resolvedFixture = path.resolve(fixtureRoot).toLowerCase();
  assert.ok(resolvedFixture.startsWith(`${temporaryRoot}${path.sep.toLowerCase()}`));
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

function executeBehaviorFixture(options = {}) {
  const fixture = createBehaviorFixture(options.baselineStatus, options.baselineSource);
  try {
    options.prepare?.(fixture);
    const discovered = discoverTaskContracts(path.join(fixture.fixtureRoot, "scripts"))
      .map((absolutePath) => displayPath(absolutePath, fixture.fixtureRoot))
      .sort((left, right) => left.localeCompare(right, "en"));
    const currentPaths = options.currentPaths?.(fixture, discovered) ?? discovered;
    const modifiedPaths = options.modifiedPaths?.(fixture)
      ?? changedBaselinePaths([fixture.baselinePath], fixture.baseSha, fixture.fixtureRoot);
    const emitted = [];
    let contractRuns = 0;
    const result = evaluateComparator({
      manifest: fixture.manifest,
      currentPaths,
      modifiedPaths,
      focusedPath: fixture.focusedPath,
      emit: (line) => emitted.push(line),
      contractRunner: (relativePath) => {
        contractRuns += 1;
        return options.contractRunner?.(fixture, relativePath)
          ?? runContract(relativePath, fixture.fixtureRoot, options.contractTimeoutMs ?? timeoutMs, options.executable);
      },
    });
    return { ...result, emitted, contractRuns };
  } finally {
    removeBehaviorFixture(fixture.fixtureRoot);
  }
}

function runSelfTest() {
  const manifest = readValidatedManifest();
  const passIndex = manifest.contracts.findIndex((entry) => entry.status === "PASS");
  const failIndex = manifest.contracts.findIndex((entry) => entry.status === "FAIL");
  const swappedStatuses = manifest.contracts.map((entry) => ({ ...entry }));
  swappedStatuses[passIndex].status = "FAIL";
  swappedStatuses[failIndex].status = "PASS";
  assert.equal(swappedStatuses.filter((entry) => entry.status === "PASS").length, expectedBaselinePass);
  assert.throws(() => assertExactManifestMapping(swappedStatuses));

  assert.equal(executeBehaviorFixture().exitCode, 0);
  for (const staged of [false, true]) {
    const modified = executeBehaviorFixture({
      prepare: (fixture) => {
        fs.appendFileSync(path.join(fixture.fixtureRoot, fixture.baselinePath), "\nvoid 'changed';", "utf8");
        if (staged) gitOutput(["add", "--", fixture.baselinePath], fixture.fixtureRoot);
      },
    });
    assert.equal(modified.exitCode, 1);
    assert.equal(modified.contractRuns, 0);
    assert.equal(modified.counts.baselineScriptsModified, 1);
  }

  const missing = executeBehaviorFixture({
    currentPaths: (fixture, currentPaths) => currentPaths.filter((name) => name !== fixture.baselinePath),
    modifiedPaths: () => [],
  });
  assert.equal(missing.exitCode, 1);
  assert.ok(missing.emitted.some((line) => line.startsWith("MISSING_BASELINE ")));

  const regression = executeBehaviorFixture({
    prepare: (fixture) => fs.writeFileSync(path.join(fixture.fixtureRoot, fixture.baselinePath), "void 'task.md'; process.exitCode = 1;", "utf8"),
    modifiedPaths: () => [],
  });
  assert.equal(regression.exitCode, 1);
  assert.equal(regression.contractRuns, 2);
  assert.equal(regression.counts.regressions, 1);
  assert.equal(regression.counts.executionErrors, 0);
  assert.equal(regression.emitted.filter((line) => line === "REGRESSION scripts/baseline-contract.mjs").length, 1);
  assert.equal(regression.emitted.at(-1), summaryLine(1, 1, regression.counts));

  const recovered = executeBehaviorFixture({ baselineStatus: "FAIL" });
  assert.equal(recovered.exitCode, 0);
  assert.equal(recovered.contractRuns, 2);
  assert.equal(recovered.counts.regressions, 0);
  assert.equal(recovered.counts.baselineFail, 0);
  assert.equal(recovered.counts.executionErrors, 0);
  assert.equal(recovered.emitted.filter((line) => line === "RECOVERED scripts/baseline-contract.mjs").length, 1);
  assert.equal(recovered.emitted.at(-1), summaryLine(1, 0, recovered.counts));

  const focusedFailure = executeBehaviorFixture({
    prepare: (fixture) => fs.writeFileSync(path.join(fixture.fixtureRoot, fixture.focusedPath), "void 'task.md'; process.exitCode = 1;", "utf8"),
  });
  assert.equal(focusedFailure.exitCode, 1);
  assert.equal(focusedFailure.counts.newFail, 1);

  const newFailure = executeBehaviorFixture({
    prepare: (fixture) => fs.writeFileSync(path.join(fixture.fixtureRoot, "scripts/new-contract.mjs"), "void 'task.md'; process.exitCode = 1;", "utf8"),
  });
  assert.equal(newFailure.exitCode, 1);
  assert.equal(newFailure.counts.newFail, 1);

  const timedOut = executeBehaviorFixture({
    baselineStatus: "FAIL",
    baselineSource: "void 'task.md'; setInterval(() => {}, 1_000);",
    contractTimeoutMs: 25,
  });
  assert.equal(timedOut.exitCode, 1);
  assert.ok(timedOut.counts.executionErrors > 0);
  assert.ok(timedOut.emitted.some((line) => line.startsWith("EXECUTION_ERROR ")));

  const spawnError = executeBehaviorFixture({ executable: path.join(os.tmpdir(), "missing-node-executable") });
  assert.equal(spawnError.exitCode, 1);
  assert.ok(spawnError.counts.executionErrors > 0);
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
    executionErrors: 0,
  };

  try {
    const manifest = readValidatedManifest();
    const baselinePaths = manifest.contracts.map((entry) => entry.path);
    const currentPaths = discoverTaskContracts(scriptsRoot)
      .map((absolutePath) => displayPath(absolutePath))
      .sort((left, right) => left.localeCompare(right, "en"));
    const modifiedPaths = changedBaselinePaths(baselinePaths, manifest.baseSha);
    const result = evaluateComparator({
      manifest,
      currentPaths,
      modifiedPaths,
      focusedPath: focusedContractPath,
      emit: console.log,
      contractRunner: (relativePath) => runContract(relativePath),
    });
    process.exitCode = result.exitCode;
  } catch {
    console.log("FAIL task_contract_manifest_or_discovery exit=1");
    console.log(summaryLine(expectedBaselineTotal, expectedBaselinePass, emptyCounts));
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
