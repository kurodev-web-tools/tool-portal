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
const overlayPaths = [
  "task.md",
  "docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
  "docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md",
];
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

function run(command, args, cwd = root, stdio = ["ignore", "pipe", "ignore"]) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio, timeout: timeoutMs, windowsHide: true });
  assert.equal(result.status, 0);
  assert.equal(result.error, undefined);
  return result.stdout ?? "";
}

function git(args, cwd = root) {
  return run("git", args, cwd);
}

function normalizedGitPaths(args) {
  return git(args).split("\0").filter(Boolean).map((entry) => entry.split(path.sep).join("/"));
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.baseSha, baseSha);
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
  for (const entry of manifest.contracts) assert.ok(entry.status === "PASS" || entry.status === "FAIL");
  return manifest;
}

function remoteRefsDigest() {
  return sha256(git(["for-each-ref", "--format=%(refname)%00%(objectname)%00", "refs/remotes"]));
}

function currentScope(manifestPaths) {
  const tracked = normalizedGitPaths(["diff", "--name-only", "-z", baseSha, "--"]);
  const untracked = normalizedGitPaths(["ls-files", "--others", "--exclude-standard", "-z", "--"]);
  const changed = [...new Set([...tracked, ...untracked])].sort((left, right) => left.localeCompare(right, "en"));
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
    remoteRefsUnchanged: true,
    temporaryWorktreeCleanup: "pass",
  };
}

function summaryLine(summary) {
  return `baseline_total=170 baseline_pass=43 preserved_pass=${summary.preservedPass} content_regressions=${summary.contentRegressions} baseline_fail=${summary.baselineFail} recovered=${summary.recovered} baseline_scripts_modified=${summary.baselineScriptsModified} overlay_hash_mismatches=${summary.overlayHashMismatches} unexpected_current_paths=${summary.unexpectedCurrentPaths} remote_refs_unchanged=${summary.remoteRefsUnchanged} temporary_worktree_cleanup=${summary.temporaryWorktreeCleanup} execution_errors=${summary.executionErrors}`;
}

function classifyContent(status, passed) {
  if (status === "PASS") return passed ? "PRESERVED_PASS" : "CONTENT_REGRESSION";
  return passed ? "RECOVERED" : "BASELINE_FAIL";
}

function finalExit(summary) {
  return summary.contentRegressions > 0
    || summary.baselineScriptsModified > 0
    || summary.overlayHashMismatches > 0
    || summary.unexpectedCurrentPaths > 0
    || !summary.remoteRefsUnchanged
    || summary.temporaryWorktreeCleanup !== "pass"
    || summary.executionErrors > 0 ? 1 : 0;
}

function runContentContracts(manifest, temporaryRoot, summary) {
  for (const entry of manifest.contracts) {
    const result = spawnSync(process.execPath, [path.join(temporaryRoot, entry.path)], {
      cwd: temporaryRoot,
      encoding: "utf8",
      stdio: "ignore",
      timeout: timeoutMs,
      windowsHide: true,
    });
    const passed = result.status === 0 && result.error === undefined;
    const classification = classifyContent(entry.status, passed);
    console.log(`${classification} ${entry.path}`);
    if (classification === "PRESERVED_PASS") summary.preservedPass += 1;
    if (classification === "CONTENT_REGRESSION") summary.contentRegressions += 1;
    if (classification === "BASELINE_FAIL") summary.baselineFail += 1;
    if (classification === "RECOVERED") summary.recovered += 1;
    if (result.status === null || result.error !== undefined) {
      summary.executionErrors += 1;
      console.log(`EXECUTION_ERROR ${entry.path}`);
    }
  }
}

function safeTemporaryPath(temporaryRoot) {
  const parent = path.resolve(worktreesRoot).toLowerCase();
  const candidate = path.resolve(temporaryRoot).toLowerCase();
  return candidate.startsWith(`${parent}${path.sep.toLowerCase()}`) && candidate !== parent;
}

function runComparator() {
  const manifest = readManifest();
  const summary = emptySummary();
  const scope = currentScope(new Set(manifest.contracts.map((entry) => entry.path)));
  summary.baselineScriptsModified = scope.baselineModified.length;
  summary.unexpectedCurrentPaths = scope.unexpected.length;
  if (summary.baselineScriptsModified > 0 || summary.unexpectedCurrentPaths > 0) {
    console.log("FAIL current_scope_gate exit=1");
    console.log(summaryLine(summary));
    return 1;
  }

  const refsBefore = remoteRefsDigest();
  const temporaryRoot = path.join(worktreesRoot, `task-board-content-${process.pid}-${randomUUID()}`);
  const dependencyLink = path.join(temporaryRoot, "node_modules");
  let worktreeCreated = false;
  let junctionCreated = false;
  try {
    assert.ok(safeTemporaryPath(temporaryRoot));
    git(["worktree", "add", "--detach", temporaryRoot, baseSha]);
    worktreeCreated = true;
    assert.equal(git(["rev-parse", "HEAD"], temporaryRoot).trim(), baseSha);
    const basePaths = manifest.contracts.map((entry) => entry.path);
    for (const entry of basePaths) assert.ok(fs.existsSync(path.join(temporaryRoot, entry)));

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
    git(["add", "--", ...overlayPaths], temporaryRoot);

    assert.equal(fileSha256(path.join(root, "package-lock.json")), fileSha256(path.join(temporaryRoot, "package-lock.json")));
    assert.equal(run(process.execPath, ["--version"], temporaryRoot).trim(), process.version);
    assert.ok(fs.existsSync(path.join(root, "node_modules")));
    fs.symlinkSync(path.join(root, "node_modules"), dependencyLink, "junction");
    junctionCreated = true;
    if (summary.overlayHashMismatches === 0) runContentContracts(manifest, temporaryRoot, summary);
  } catch {
    summary.executionErrors += 1;
    console.log("FAIL content_lane_setup_or_execution exit=1");
  } finally {
    try {
      if (junctionCreated && fs.existsSync(dependencyLink)) fs.unlinkSync(dependencyLink);
      junctionCreated = false;
      assert.ok(safeTemporaryPath(temporaryRoot));
      if (worktreeCreated) {
        assert.equal(git(["rev-parse", "HEAD"], temporaryRoot).trim(), baseSha);
        git(["worktree", "remove", "--force", temporaryRoot]);
      }
      assert.equal(fs.existsSync(temporaryRoot), false);
    } catch {
      summary.temporaryWorktreeCleanup = "fail";
    }
    try {
      summary.remoteRefsUnchanged = remoteRefsDigest() === refsBefore;
    } catch {
      summary.remoteRefsUnchanged = false;
    }
  }
  console.log(summaryLine(summary));
  return finalExit(summary);
}

function runSelfTest() {
  const success = emptySummary();
  success.preservedPass = 43;
  success.baselineFail = 127;
  assert.equal(finalExit(success), 0);
  for (const mutation of [
    { contentRegressions: 1 },
    { overlayHashMismatches: 1 },
    { baselineScriptsModified: 1 },
    { unexpectedCurrentPaths: 1 },
    { remoteRefsUnchanged: false },
    { temporaryWorktreeCleanup: "fail" },
    { executionErrors: 1 },
  ]) assert.equal(finalExit({ ...success, ...mutation }), 1);
  assert.equal(classifyContent("PASS", false), "CONTENT_REGRESSION");
  assert.equal(classifyContent("FAIL", true), "RECOVERED");
  assert.ok(summaryLine(success).includes("remote_refs_unchanged=true"));
  console.log("task_contract_comparator_self_test=pass");
}

if (process.argv.includes("--self-test")) {
  try { runSelfTest(); } catch { console.log("task_contract_comparator_self_test=fail"); process.exitCode = 1; }
} else {
  try { process.exitCode = runComparator(); }
  catch { console.log("FAIL task_contract_comparator exit=1"); console.log(summaryLine({ ...emptySummary(), executionErrors: 1 })); process.exitCode = 1; }
}
