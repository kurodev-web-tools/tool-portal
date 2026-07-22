import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseSha = "e465e6b99a4c9082cd5f95b96ba585c15c37ab4a";
const manifestPath = path.join(root, "scripts/fixtures/comment-translator-task-board-contract-baseline.json");
const worktreesRoot = "D:/V_streamer_tools/.worktrees";
const timeoutMs = 60_000;
const expectedMappingSha256 = "071377319ac69be75093fa8569c1dceaabb1a6db079f4a9da95425d0917535d9";
const pinnedNodeVersion = "v22.22.2";
const pinnedPackageLockSha256 = "0f3b1074691b8296e1e6c957c469dcb536b6c67b90890170600d7f50aea138c8";
const overlayPaths = [
  "task.md",
  "docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
  "docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md",
];
const trackedOverlayPaths = overlayPaths.slice(0, 2);
const newOverlayPaths = overlayPaths.slice(2);
const approvedCurrentPaths = new Set([
  ...overlayPaths,
  "docs/superpowers/specs/2026-07-22-comment-translator-task-board-cleanup-design.md",
  "docs/superpowers/plans/2026-07-22-comment-translator-task-board-cleanup.md",
  "scripts/comment-translator-task-board-creator-roadmap-contract.mjs",
  "scripts/comment-translator-task-board-contract-suite.mjs",
  "scripts/fixtures/comment-translator-task-board-contract-baseline.json",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function run(command, args, cwd = root, stdio = ["ignore", "pipe", "ignore"], env = process.env) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env, stdio, timeout: timeoutMs, windowsHide: true });
  assert.equal(result.status, 0);
  assert.equal(result.error, undefined);
  return result.stdout ?? "";
}

function git(args, cwd = root) {
  return run("git", args, cwd);
}

function gitPaths(args, cwd) {
  return git(args, cwd).split("\0").filter(Boolean).map((entry) => entry.split(path.sep).join("/"));
}

function childContractEnvironment(excludeFile) {
  return {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.excludesFile",
    GIT_CONFIG_VALUE_0: excludeFile.split(path.sep).join("/"),
  };
}

function gitPathsWithEnvironment(args, cwd, env) {
  return run("git", args, cwd, ["ignore", "pipe", "ignore"], env)
    .split("\0").filter(Boolean).map((entry) => entry.split(path.sep).join("/"));
}

function readManifest(sourcePath = manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  assert.deepEqual(Object.keys(manifest).sort(), [
    "baseSha",
    "baselineFail",
    "baselinePass",
    "baselineTotal",
    "contracts",
    "nodeVersion",
    "packageLockSha256",
  ]);
  assert.equal(manifest.baseSha, baseSha);
  assert.equal(manifest.nodeVersion, pinnedNodeVersion);
  assert.equal(manifest.packageLockSha256, pinnedPackageLockSha256);
  assert.equal(manifest.baselineTotal, 170);
  assert.equal(manifest.baselinePass, 43);
  assert.equal(manifest.baselineFail, 127);
  assert.equal(manifest.contracts.length, 170);
  const canonical = manifest.contracts.map((entry) => `${entry.path}\t${entry.status}\n`).join("");
  assert.equal(sha256(canonical), expectedMappingSha256);
  assert.equal(new Set(manifest.contracts.map((entry) => entry.path)).size, 170);
  assert.deepEqual(
    manifest.contracts.map((entry) => entry.path),
    [...manifest.contracts.map((entry) => entry.path)].sort((left, right) => left.localeCompare(right, "en")),
  );
  for (const entry of manifest.contracts) {
    assert.deepEqual(Object.keys(entry).sort(), ["path", "status"]);
    assert.equal(typeof entry.path, "string");
    assert.match(entry.path, /^scripts\/[A-Za-z0-9._/-]+\.mjs$/);
    assert.ok(entry.status === "PASS" || entry.status === "FAIL");
  }
  return manifest;
}

function remoteRefsDigest() {
  return sha256(git(["for-each-ref", "--format=%(refname)%00%(objectname)%00", "refs/remotes"]));
}

function contentMarker(cwd, relativePath, status) {
  const target = path.join(cwd, relativePath);
  if (status === "D") return "tombstone";
  let fileStat;
  try {
    fileStat = fs.lstatSync(target);
  } catch (error) {
    if (error?.code === "ENOENT") return "tombstone";
    throw error;
  }
  if (fileStat.isSymbolicLink()) return `symlink-sha256:${sha256(fs.readlinkSync(target))}`;
  if (fileStat.isFile()) return `file-sha256:${fileSha256(target)}`;
  if (fileStat.isDirectory()) return "directory";
  return "other";
}

function changedContentSnapshot(cwd = root, comparisonRef = baseSha) {
  const trackedFields = git(["diff", "--name-status", "--no-renames", "-z", comparisonRef, "--"], cwd)
    .split("\0").filter(Boolean);
  assert.equal(trackedFields.length % 2, 0);
  const entries = [];
  for (let index = 0; index < trackedFields.length; index += 2) {
    entries.push({ status: trackedFields[index], path: trackedFields[index + 1].split(path.sep).join("/") });
  }
  for (const relativePath of gitPaths(["ls-files", "--others", "--exclude-standard", "-z", "--"], cwd)) {
    entries.push({ status: "??", path: relativePath });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path, "en") || left.status.localeCompare(right.status, "en"));
  const records = entries.map((entry) => ({
    ...entry,
    marker: contentMarker(cwd, entry.path, entry.status),
  }));
  const canonical = records.map((entry) => `${entry.status}\0${entry.path}\0${entry.marker}\n`).join("");
  return { changed: records.map((entry) => entry.path), records, digest: sha256(canonical) };
}

function overlaySourceSnapshot(cwd = root) {
  return overlayPaths.map((relativePath) => {
    const source = path.join(cwd, relativePath);
    return fs.existsSync(source) ? fileSha256(source) : null;
  });
}

function sourceSnapshotDriftCount(before, after) {
  return before.reduce((count, hash, index) => count + Number(hash !== after[index]), 0);
}

function contentSnapshotDriftCount(before, after) {
  const beforeRecords = new Map(before.records.map((entry) => [entry.path, `${entry.status}\0${entry.marker}`]));
  const afterRecords = new Map(after.records.map((entry) => [entry.path, `${entry.status}\0${entry.marker}`]));
  return [...new Set([...beforeRecords.keys(), ...afterRecords.keys()])]
    .reduce((count, entry) => count + Number(beforeRecords.get(entry) !== afterRecords.get(entry)), 0);
}

function acquireValidatedInputSnapshot({
  manifestReader = () => readManifest(),
  snapshotReader = () => changedContentSnapshot(),
} = {}) {
  const beforeManifestRead = snapshotReader();
  const manifest = manifestReader();
  const afterManifestRead = snapshotReader();
  const driftCount = contentSnapshotDriftCount(beforeManifestRead, afterManifestRead);
  return {
    driftCount,
    manifest,
    scopeSnapshot: afterManifestRead,
    unchanged: driftCount === 0 && beforeManifestRead.digest === afterManifestRead.digest,
  };
}

function currentScope(manifestPaths, snapshot = changedContentSnapshot()) {
  const { changed } = snapshot;
  return {
    unexpected: changed.filter((entry) => !approvedCurrentPaths.has(entry)),
    baselineModified: changed.filter((entry) => manifestPaths.has(entry)),
  };
}

function emptySummary() {
  return {
    preservedPass: 0,
    contentRegressions: 0,
    baselineFail: 0,
    recovered: 0,
    baselineScriptsModified: 0,
    overlayHashMismatches: 0,
    unexpectedCurrentPaths: 0,
    executionErrors: 0,
    baselineExecuted: 0,
    sourceSnapshotDriftCount: 0,
    sourceSnapshotUnchanged: true,
    currentScopeSnapshotDriftCount: 0,
    currentScopeSnapshotUnchanged: true,
    remoteRefsUnchanged: true,
    temporaryWorktreeCleanup: "pass",
  };
}

function summaryLine(summary) {
  return `baseline_total=170 baseline_pass=43 baseline_executed=${summary.baselineExecuted} preserved_pass=${summary.preservedPass} content_regressions=${summary.contentRegressions} baseline_fail=${summary.baselineFail} recovered=${summary.recovered} baseline_scripts_modified=${summary.baselineScriptsModified} overlay_hash_mismatches=${summary.overlayHashMismatches} unexpected_current_paths=${summary.unexpectedCurrentPaths} source_snapshot_unchanged=${summary.sourceSnapshotUnchanged} source_snapshot_drift_count=${summary.sourceSnapshotDriftCount} current_scope_snapshot_unchanged=${summary.currentScopeSnapshotUnchanged} current_scope_snapshot_drift_count=${summary.currentScopeSnapshotDriftCount} remote_refs_unchanged=${summary.remoteRefsUnchanged} temporary_worktree_cleanup=${summary.temporaryWorktreeCleanup} execution_errors=${summary.executionErrors}`;
}

function classifyContent(status, passed) {
  if (status === "PASS") return passed ? "PRESERVED_PASS" : "CONTENT_REGRESSION";
  return passed ? "RECOVERED" : "BASELINE_FAIL";
}

function finalExit(summary) {
  return summary.baselineExecuted !== 170
    || summary.preservedPass + summary.contentRegressions !== 43
    || summary.baselineFail + summary.recovered !== 127
    || summary.contentRegressions > 0
    || summary.baselineScriptsModified > 0
    || summary.overlayHashMismatches > 0
    || summary.unexpectedCurrentPaths > 0
    || !summary.sourceSnapshotUnchanged
    || summary.sourceSnapshotDriftCount > 0
    || !summary.currentScopeSnapshotUnchanged
    || summary.currentScopeSnapshotDriftCount > 0
    || !summary.remoteRefsUnchanged
    || summary.temporaryWorktreeCleanup !== "pass"
    || summary.executionErrors > 0 ? 1 : 0;
}

function runContentContracts(manifest, temporaryRoot, summary, env, beforeContractSpawn = () => {}, log = console.log) {
  for (const entry of manifest.contracts) {
    beforeContractSpawn(entry.path);
    const result = spawnSync(process.execPath, [path.join(temporaryRoot, entry.path)], {
      cwd: temporaryRoot,
      encoding: "utf8",
      env,
      stdio: "ignore",
      timeout: timeoutMs,
      windowsHide: true,
    });
    const passed = result.status === 0 && result.error === undefined;
    const classification = classifyContent(entry.status, passed);
    summary.baselineExecuted += 1;
    log(`${classification} ${entry.path}`);
    if (classification === "PRESERVED_PASS") summary.preservedPass += 1;
    if (classification === "CONTENT_REGRESSION") summary.contentRegressions += 1;
    if (classification === "BASELINE_FAIL") summary.baselineFail += 1;
    if (classification === "RECOVERED") summary.recovered += 1;
    if (result.status === null || result.error !== undefined) {
      summary.executionErrors += 1;
      log(`EXECUTION_ERROR ${entry.path}`);
    }
  }
}

function pathKey(target) {
  return path.resolve(target).toLowerCase();
}

function pathEntryExists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function canonicalTemporaryBoundary(realpathSync = fs.realpathSync) {
  const commonGitDirectory = path.resolve(git(["rev-parse", "--path-format=absolute", "--git-common-dir"]).trim());
  const repositoryRoot = path.dirname(commonGitDirectory);
  const resolvedWorktreesRoot = path.resolve(worktreesRoot);
  const repositoryStat = fs.lstatSync(repositoryRoot);
  const worktreesStat = fs.lstatSync(resolvedWorktreesRoot);
  assert.equal(repositoryStat.isDirectory(), true);
  assert.equal(repositoryStat.isSymbolicLink(), false);
  assert.equal(worktreesStat.isDirectory(), true);
  assert.equal(worktreesStat.isSymbolicLink(), false);
  const canonicalRepositoryRoot = realpathSync(repositoryRoot);
  const canonicalWorktreesRoot = realpathSync(resolvedWorktreesRoot);
  assert.equal(pathKey(path.dirname(canonicalWorktreesRoot)), pathKey(canonicalRepositoryRoot));
  assert.equal(path.basename(canonicalWorktreesRoot).toLowerCase(), ".worktrees");
  return { canonicalRepositoryRoot, canonicalWorktreesRoot };
}

function assertTemporaryCandidate(target, expectedBasename, expectedPrefix) {
  const { canonicalWorktreesRoot } = canonicalTemporaryBoundary();
  const resolvedTarget = path.resolve(target);
  assert.equal(path.basename(resolvedTarget), expectedBasename);
  assert.ok(expectedBasename.startsWith(expectedPrefix));
  assert.equal(pathKey(path.dirname(resolvedTarget)), pathKey(path.resolve(worktreesRoot)));
  assert.equal(pathKey(fs.realpathSync(path.dirname(resolvedTarget))), pathKey(canonicalWorktreesRoot));
  let absent = false;
  try {
    fs.lstatSync(resolvedTarget);
  } catch (error) {
    if (error?.code === "ENOENT") absent = true;
    else throw error;
  }
  assert.equal(absent, true);
}

function assertCanonicalTemporaryEntry(
  target,
  expectedBasename,
  expectedType,
  { lstatSync = fs.lstatSync, realpathSync = fs.realpathSync } = {},
) {
  const { canonicalWorktreesRoot } = canonicalTemporaryBoundary(realpathSync);
  const resolvedTarget = path.resolve(target);
  assert.equal(path.basename(resolvedTarget), expectedBasename);
  assert.equal(pathKey(path.dirname(resolvedTarget)), pathKey(path.resolve(worktreesRoot)));
  const fileStat = lstatSync(resolvedTarget);
  assert.equal(fileStat.isSymbolicLink(), false);
  if (expectedType === "directory") assert.equal(fileStat.isDirectory(), true);
  if (expectedType === "file") assert.equal(fileStat.isFile(), true);
  const canonicalTarget = realpathSync(resolvedTarget);
  assert.equal(pathKey(path.dirname(canonicalTarget)), pathKey(canonicalWorktreesRoot));
  assert.equal(path.basename(canonicalTarget), expectedBasename);
  assert.equal(pathKey(canonicalTarget), pathKey(path.join(canonicalWorktreesRoot, expectedBasename)));
}

function unlinkVerifiedDependencyJunction(dependencyLink, temporaryRoot, temporaryBasename) {
  assertCanonicalTemporaryEntry(temporaryRoot, temporaryBasename, "directory");
  assert.equal(pathKey(path.dirname(dependencyLink)), pathKey(temporaryRoot));
  const linkStat = fs.lstatSync(dependencyLink);
  assert.equal(linkStat.isSymbolicLink(), true);
  fs.unlinkSync(dependencyLink);
}

function runComparator({
  acquireInputs = () => acquireValidatedInputSnapshot(),
  beforeContractSpawn = () => {},
  beforeWorktreeCreate = () => {},
  log = console.log,
} = {}) {
  const summary = emptySummary();
  const initialInputs = acquireInputs();
  const { manifest, scopeSnapshot: scopeSnapshotBefore } = initialInputs;
  summary.currentScopeSnapshotDriftCount = initialInputs.driftCount;
  summary.currentScopeSnapshotUnchanged = initialInputs.unchanged;
  if (!initialInputs.unchanged) {
    log(`FAIL input_snapshot_drift source_count=0 scope_count=${initialInputs.driftCount}`);
    log(summaryLine(summary));
    return 1;
  }
  const sourceSnapshotBefore = overlaySourceSnapshot();
  const scope = currentScope(new Set(manifest.contracts.map((entry) => entry.path)), scopeSnapshotBefore);
  summary.baselineScriptsModified = scope.baselineModified.length;
  summary.unexpectedCurrentPaths = scope.unexpected.length;
  if (summary.baselineScriptsModified > 0 || summary.unexpectedCurrentPaths > 0) {
    log("FAIL current_scope_gate exit=1");
    log(summaryLine(summary));
    return 1;
  }

  const refsBefore = remoteRefsDigest();
  const temporaryBasename = `task-board-content-${process.pid}-${randomUUID()}`;
  const temporaryRoot = path.join(worktreesRoot, temporaryBasename);
  const excludeFile = `${temporaryRoot}.exclude`;
  const excludeBasename = `${temporaryBasename}.exclude`;
  const dependencyLink = path.join(temporaryRoot, "node_modules");
  let worktreeCreated = false;
  let junctionCreated = false;
  let contentLaneStage = "worktree-create";
  try {
    assertTemporaryCandidate(temporaryRoot, temporaryBasename, `task-board-content-${process.pid}-`);
    beforeWorktreeCreate(temporaryRoot);
    git(["worktree", "add", "--detach", temporaryRoot, baseSha]);
    worktreeCreated = true;
    assertCanonicalTemporaryEntry(temporaryRoot, temporaryBasename, "directory");
    assert.equal(git(["rev-parse", "HEAD"], temporaryRoot).trim(), baseSha);
    contentLaneStage = "baseline-presence";
    const basePaths = manifest.contracts.map((entry) => entry.path);
    for (const entry of basePaths) assert.ok(fs.existsSync(path.join(temporaryRoot, entry)));
    assert.deepEqual(
      gitPaths(["ls-files", "-z", "--error-unmatch", "--", ...trackedOverlayPaths], temporaryRoot).sort(),
      [...trackedOverlayPaths].sort(),
    );

    contentLaneStage = "overlay-copy";
    const expectedStagedOverlays = trackedOverlayPaths.filter((relativePath) => (
      fileSha256(path.join(root, relativePath)) !== fileSha256(path.join(temporaryRoot, relativePath))
    ));
    for (const relativePath of overlayPaths) {
      const source = path.join(root, relativePath);
      const destination = path.join(temporaryRoot, relativePath);
      if (!fs.existsSync(source)) {
        summary.overlayHashMismatches += 1;
        continue;
      }
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const sourceHash = fileSha256(source);
      fs.copyFileSync(source, destination);
      if (fileSha256(destination) !== sourceHash) summary.overlayHashMismatches += 1;
    }
    contentLaneStage = "overlay-index";
    git(["add", "--", ...trackedOverlayPaths], temporaryRoot);
    const stagedOverlays = gitPaths(["diff", "--cached", "--name-only", "-z"], temporaryRoot)
      .filter((entry) => overlayPaths.includes(entry))
      .sort((left, right) => left.localeCompare(right, "en"));
    const untrackedOverlays = gitPaths(["ls-files", "--others", "--exclude-standard", "-z", "--"], temporaryRoot)
      .filter((entry) => overlayPaths.includes(entry))
      .sort((left, right) => left.localeCompare(right, "en"));
    assert.deepEqual(stagedOverlays, expectedStagedOverlays.sort((left, right) => left.localeCompare(right, "en")));
    assert.deepEqual(untrackedOverlays, [...newOverlayPaths].sort((left, right) => left.localeCompare(right, "en")));
    assertTemporaryCandidate(excludeFile, excludeBasename, `task-board-content-${process.pid}-`);
    fs.writeFileSync(excludeFile, `${newOverlayPaths.join("\n")}\n`, "utf8");
    assertCanonicalTemporaryEntry(excludeFile, excludeBasename, "file");
    const childEnv = childContractEnvironment(excludeFile);
    assert.deepEqual(
      gitPathsWithEnvironment(["ls-files", "--others", "--exclude-standard", "-z", "--"], temporaryRoot, childEnv)
        .filter((entry) => overlayPaths.includes(entry)),
      [],
    );

    contentLaneStage = "runtime-pins";
    assert.equal(process.version, pinnedNodeVersion);
    assert.equal(fileSha256(path.join(root, "package-lock.json")), pinnedPackageLockSha256);
    assert.equal(fileSha256(path.join(temporaryRoot, "package-lock.json")), pinnedPackageLockSha256);
    assert.ok(fs.existsSync(path.join(root, "node_modules")));
    contentLaneStage = "dependency-link";
    fs.symlinkSync(path.join(root, "node_modules"), dependencyLink, "junction");
    junctionCreated = true;
    contentLaneStage = "contract-execution";
    if (summary.overlayHashMismatches === 0) {
      runContentContracts(manifest, temporaryRoot, summary, childEnv, beforeContractSpawn, log);
    }
  } catch {
    summary.executionErrors += 1;
    log(`FAIL content_lane_${contentLaneStage} exit=1`);
  } finally {
    try {
      if (junctionCreated && pathEntryExists(dependencyLink)) {
        unlinkVerifiedDependencyJunction(dependencyLink, temporaryRoot, temporaryBasename);
      }
      junctionCreated = false;
      if (pathEntryExists(excludeFile)) {
        assertCanonicalTemporaryEntry(excludeFile, excludeBasename, "file");
        fs.unlinkSync(excludeFile);
      }
      assert.equal(pathEntryExists(excludeFile), false);
      if (worktreeCreated) {
        assertCanonicalTemporaryEntry(temporaryRoot, temporaryBasename, "directory");
        assert.equal(git(["rev-parse", "HEAD"], temporaryRoot).trim(), baseSha);
        git(["worktree", "remove", "--force", temporaryRoot]);
      }
      assert.equal(pathEntryExists(temporaryRoot), false);
    } catch {
      summary.temporaryWorktreeCleanup = "fail";
    }
    try {
      summary.remoteRefsUnchanged = remoteRefsDigest() === refsBefore;
    } catch {
      summary.remoteRefsUnchanged = false;
    }
  }
  try {
    const sourceSnapshotAfter = overlaySourceSnapshot();
    summary.sourceSnapshotDriftCount = sourceSnapshotDriftCount(sourceSnapshotBefore, sourceSnapshotAfter);
    summary.sourceSnapshotUnchanged = summary.sourceSnapshotDriftCount === 0;
  } catch {
    summary.sourceSnapshotDriftCount = overlayPaths.length;
    summary.sourceSnapshotUnchanged = false;
  }
  try {
    const scopeSnapshotAfter = changedContentSnapshot();
    summary.currentScopeSnapshotDriftCount = contentSnapshotDriftCount(scopeSnapshotBefore, scopeSnapshotAfter);
    summary.currentScopeSnapshotUnchanged = scopeSnapshotAfter.digest === scopeSnapshotBefore.digest
      && summary.currentScopeSnapshotDriftCount === 0;
  } catch {
    summary.currentScopeSnapshotDriftCount = 1;
    summary.currentScopeSnapshotUnchanged = false;
  }
  if (!summary.sourceSnapshotUnchanged || !summary.currentScopeSnapshotUnchanged) {
    log(`FAIL input_snapshot_drift source_count=${summary.sourceSnapshotDriftCount} scope_count=${summary.currentScopeSnapshotDriftCount}`);
  }
  log(summaryLine(summary));
  return finalExit(summary);
}

function runSelfTest() {
  const success = emptySummary();
  success.baselineExecuted = 170;
  success.preservedPass = 43;
  success.baselineFail = 127;
  assert.equal(finalExit(success), 0);
  assert.equal(finalExit(emptySummary()), 1);
  assert.equal(finalExit({ ...success, baselineExecuted: 169 }), 1);
  for (const mutation of [
    { contentRegressions: 1 },
    { overlayHashMismatches: 1 },
    { baselineScriptsModified: 1 },
    { unexpectedCurrentPaths: 1 },
    { sourceSnapshotDriftCount: 1, sourceSnapshotUnchanged: false },
    { currentScopeSnapshotDriftCount: 1, currentScopeSnapshotUnchanged: false },
    { remoteRefsUnchanged: false },
    { temporaryWorktreeCleanup: "fail" },
    { executionErrors: 1 },
  ]) assert.equal(finalExit({ ...success, ...mutation }), 1);
  assert.equal(classifyContent("PASS", false), "CONTENT_REGRESSION");
  assert.equal(classifyContent("FAIL", true), "RECOVERED");
  assert.equal(success.sourceSnapshotUnchanged, true);
  assert.equal(success.currentScopeSnapshotUnchanged, true);
  assert.ok(summaryLine(success).includes("remote_refs_unchanged=true"));
  const fixtureBasename = `task-overlay-stage-${process.pid}-${randomUUID()}`;
  const fixtureRoot = path.join(worktreesRoot, fixtureBasename);
  const fixtureExcludeFile = `${fixtureRoot}.exclude`;
  const fixtureExcludeBasename = `${fixtureBasename}.exclude`;
  assertTemporaryCandidate(fixtureRoot, fixtureBasename, `task-overlay-stage-${process.pid}-`);
  fs.mkdirSync(fixtureRoot, { recursive: false });
  try {
    assertCanonicalTemporaryEntry(fixtureRoot, fixtureBasename, "directory");
    assert.throws(() => assertCanonicalTemporaryEntry(
      fixtureRoot,
      fixtureBasename,
      "directory",
      { lstatSync: () => ({ isSymbolicLink: () => true }) },
    ));
    const { canonicalWorktreesRoot } = canonicalTemporaryBoundary();
    const simulatedOwnedReparseTarget = path.join(canonicalWorktreesRoot, `${fixtureBasename}-simulated-reparse`);
    assert.throws(() => assertCanonicalTemporaryEntry(
      fixtureRoot,
      fixtureBasename,
      "directory",
      {
        realpathSync: (target) => (
          pathKey(target) === pathKey(fixtureRoot) ? simulatedOwnedReparseTarget : fs.realpathSync(target)
        ),
      },
    ));
    git(["init", "-q"], fixtureRoot);
    git(["config", "user.email", "overlay-fixture@example.invalid"], fixtureRoot);
    git(["config", "user.name", "Overlay Fixture"], fixtureRoot);
    const nonOverlaySnapshotPath = "docs/superpowers/specs/snapshot-fixture.md";
    const fixtureManifestRelativePath = "scripts/fixtures/comment-translator-task-board-contract-baseline.json";
    const fixtureManifestPath = path.join(fixtureRoot, fixtureManifestRelativePath);
    for (const relativePath of trackedOverlayPaths) {
      fs.mkdirSync(path.dirname(path.join(fixtureRoot, relativePath)), { recursive: true });
      fs.writeFileSync(path.join(fixtureRoot, relativePath), "base\n", "utf8");
    }
    fs.mkdirSync(path.dirname(path.join(fixtureRoot, nonOverlaySnapshotPath)), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, nonOverlaySnapshotPath), "base\n", "utf8");
    fs.mkdirSync(path.dirname(fixtureManifestPath), { recursive: true });
    fs.copyFileSync(manifestPath, fixtureManifestPath);
    git(["add", "--", ...trackedOverlayPaths, nonOverlaySnapshotPath, fixtureManifestRelativePath], fixtureRoot);
    git(["commit", "-q", "-m", "base"], fixtureRoot);
    const changedOverlaySource = path.join(fixtureRoot, "changed-overlay-source.md");
    const unchangedOverlaySource = path.join(fixtureRoot, "unchanged-overlay-source.md");
    fs.writeFileSync(changedOverlaySource, "overlay\n", "utf8");
    fs.writeFileSync(unchangedOverlaySource, "base\n", "utf8");
    for (const relativePath of overlayPaths) {
      const destination = path.join(fixtureRoot, relativePath);
      const source = relativePath === trackedOverlayPaths[1] ? unchangedOverlaySource : changedOverlaySource;
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
      assert.equal(fileSha256(destination), fileSha256(source));
    }
    git(["add", "--", ...trackedOverlayPaths], fixtureRoot);
    assert.equal(git(["diff", "--name-only"], fixtureRoot).trim(), "");
    assert.deepEqual(
      gitPaths(["diff", "--cached", "--name-only", "-z"], fixtureRoot).sort(),
      [trackedOverlayPaths[0]],
    );
    assert.deepEqual(
      gitPaths(["ls-files", "--others", "--exclude-standard", "-z", "--"], fixtureRoot)
        .filter((entry) => overlayPaths.includes(entry)).sort(),
      [...newOverlayPaths].sort(),
    );
    const originalConfigCount = process.env.GIT_CONFIG_COUNT;
    assertTemporaryCandidate(fixtureExcludeFile, fixtureExcludeBasename, `task-overlay-stage-${process.pid}-`);
    fs.writeFileSync(fixtureExcludeFile, `${newOverlayPaths.join("\n")}\n`, "utf8");
    assertCanonicalTemporaryEntry(fixtureExcludeFile, fixtureExcludeBasename, "file");
    const childEnv = childContractEnvironment(fixtureExcludeFile);
    assert.equal(process.env.GIT_CONFIG_COUNT, originalConfigCount);
    assert.deepEqual(
      gitPathsWithEnvironment(["ls-files", "--others", "--exclude-standard", "-z", "--"], fixtureRoot, childEnv)
        .filter((entry) => overlayPaths.includes(entry)),
      [],
    );
    assert.deepEqual(
      gitPathsWithEnvironment(["diff", "--cached", "--name-only", "-z"], fixtureRoot, childEnv).sort(),
      [trackedOverlayPaths[0]],
    );
    for (const relativePath of newOverlayPaths) assert.ok(fs.existsSync(path.join(fixtureRoot, relativePath)));

    fs.writeFileSync(path.join(fixtureRoot, nonOverlaySnapshotPath), "approved change\n", "utf8");
    const fixtureSourceSnapshot = overlaySourceSnapshot(fixtureRoot);
    const fixtureScopeSnapshot = changedContentSnapshot(fixtureRoot, "HEAD");
    assert.equal(sourceSnapshotDriftCount(fixtureSourceSnapshot, overlaySourceSnapshot(fixtureRoot)), 0);
    assert.equal(changedContentSnapshot(fixtureRoot, "HEAD").digest, fixtureScopeSnapshot.digest);

    fs.appendFileSync(path.join(fixtureRoot, trackedOverlayPaths[0]), "mid-run mutation\n", "utf8");
    const mutationDriftCount = sourceSnapshotDriftCount(fixtureSourceSnapshot, overlaySourceSnapshot(fixtureRoot));
    assert.equal(mutationDriftCount, 1);
    assert.equal(finalExit({
      ...success,
      sourceSnapshotDriftCount: mutationDriftCount,
      sourceSnapshotUnchanged: false,
    }), 1);
    fs.copyFileSync(changedOverlaySource, path.join(fixtureRoot, trackedOverlayPaths[0]));
    git(["add", "--", trackedOverlayPaths[0]], fixtureRoot);
    assert.equal(sourceSnapshotDriftCount(fixtureSourceSnapshot, overlaySourceSnapshot(fixtureRoot)), 0);

    fs.writeFileSync(path.join(fixtureRoot, nonOverlaySnapshotPath), "mid-run non-overlay mutation\n", "utf8");
    const nonOverlayMutationSnapshot = changedContentSnapshot(fixtureRoot, "HEAD");
    const nonOverlayMutationCount = contentSnapshotDriftCount(fixtureScopeSnapshot, nonOverlayMutationSnapshot);
    assert.deepEqual(nonOverlayMutationSnapshot.changed, fixtureScopeSnapshot.changed);
    assert.notEqual(nonOverlayMutationSnapshot.digest, fixtureScopeSnapshot.digest);
    assert.equal(nonOverlayMutationCount, 1);
    assert.equal(finalExit({
      ...success,
      currentScopeSnapshotDriftCount: nonOverlayMutationCount,
      currentScopeSnapshotUnchanged: false,
    }), 1);
    fs.writeFileSync(path.join(fixtureRoot, nonOverlaySnapshotPath), "approved change\n", "utf8");
    assert.equal(changedContentSnapshot(fixtureRoot, "HEAD").digest, fixtureScopeSnapshot.digest);

    fs.unlinkSync(path.join(fixtureRoot, nonOverlaySnapshotPath));
    const deletionSnapshot = changedContentSnapshot(fixtureRoot, "HEAD");
    const deletionRecord = deletionSnapshot.records.find((entry) => entry.path === nonOverlaySnapshotPath);
    assert.deepEqual(deletionRecord, { status: "D", path: nonOverlaySnapshotPath, marker: "tombstone" });
    assert.equal(contentSnapshotDriftCount(fixtureScopeSnapshot, deletionSnapshot), 1);
    fs.writeFileSync(path.join(fixtureRoot, nonOverlaySnapshotPath), "approved change\n", "utf8");
    assert.equal(changedContentSnapshot(fixtureRoot, "HEAD").digest, fixtureScopeSnapshot.digest);

    fs.writeFileSync(path.join(fixtureRoot, "scope-drift.md"), "mid-run path mutation\n", "utf8");
    const mutatedScopeSnapshot = changedContentSnapshot(fixtureRoot, "HEAD");
    const scopeMutationDriftCount = contentSnapshotDriftCount(fixtureScopeSnapshot, mutatedScopeSnapshot);
    assert.notEqual(mutatedScopeSnapshot.digest, fixtureScopeSnapshot.digest);
    assert.equal(scopeMutationDriftCount, 1);
    assert.equal(finalExit({
      ...success,
      currentScopeSnapshotDriftCount: scopeMutationDriftCount,
      currentScopeSnapshotUnchanged: false,
    }), 1);

    fs.unlinkSync(changedOverlaySource);
    fs.unlinkSync(unchangedOverlaySource);
    fs.unlinkSync(path.join(fixtureRoot, "scope-drift.md"));
    fs.writeFileSync(path.join(fixtureRoot, nonOverlaySnapshotPath), "base\n", "utf8");
    const racePreconditionScope = currentScope(
      new Set(readManifest(fixtureManifestPath).contracts.map((entry) => entry.path)),
      changedContentSnapshot(fixtureRoot, "HEAD"),
    );
    assert.deepEqual(racePreconditionScope.unexpected, []);
    assert.deepEqual(racePreconditionScope.baselineModified, []);

    let contractSpawnCount = 0;
    let manifestRace;
    let worktreeCreateCount = 0;
    const raceLogs = [];
    const manifestRaceExit = runComparator({
      acquireInputs: () => {
        manifestRace = acquireValidatedInputSnapshot({
          manifestReader: () => {
            fs.appendFileSync(fixtureManifestPath, " \n", "utf8");
            return readManifest(fixtureManifestPath);
          },
          snapshotReader: () => changedContentSnapshot(fixtureRoot, "HEAD"),
        });
        return manifestRace;
      },
      beforeContractSpawn: () => { contractSpawnCount += 1; },
      beforeWorktreeCreate: () => {
        worktreeCreateCount += 1;
        throw new Error("self-test must not create a worktree");
      },
      log: (message) => { raceLogs.push(message); },
    });
    assert.equal(manifestRaceExit, 1);
    assert.equal(manifestRace.unchanged, false);
    assert.equal(manifestRace.driftCount, 1);
    assert.equal(worktreeCreateCount, 0);
    assert.equal(contractSpawnCount, 0);
    assert.ok(raceLogs.some((message) => message === "FAIL input_snapshot_drift source_count=0 scope_count=1"));
  } finally {
    assertCanonicalTemporaryEntry(fixtureRoot, fixtureBasename, "directory");
    if (pathEntryExists(fixtureExcludeFile)) {
      assertCanonicalTemporaryEntry(fixtureExcludeFile, fixtureExcludeBasename, "file");
      fs.unlinkSync(fixtureExcludeFile);
    }
    assertCanonicalTemporaryEntry(fixtureRoot, fixtureBasename, "directory");
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    assert.equal(pathEntryExists(fixtureRoot), false);
    assert.equal(pathEntryExists(fixtureExcludeFile), false);
  }
  console.log("task_contract_comparator_self_test=pass");
}

if (process.argv.includes("--self-test")) {
  try { runSelfTest(); } catch { console.log("task_contract_comparator_self_test=fail"); process.exitCode = 1; }
} else {
  let selfTestPassed = true;
  try { runSelfTest(); }
  catch { console.log("task_contract_comparator_self_test=fail"); selfTestPassed = false; process.exitCode = 1; }
  if (selfTestPassed) {
    try { process.exitCode = runComparator(); }
    catch { console.log("FAIL task_contract_comparator exit=1"); console.log(summaryLine({ ...emptySummary(), executionErrors: 1 })); process.exitCode = 1; }
  }
}
