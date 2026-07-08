import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const copyPath = "lib/comment-translator.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const legalContentPath = "lib/legal-content.ts";
const usageDisplayPath = "lib/comment-translator-free-beta-usage-display.ts";
const taskBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const taskPath = "task.md";

const jaFreeLimits = ["1日最大30分", "1セッション最大30分", "30翻訳メッセージ/分", "月20,000入力文字"];
const enFreeLimits = [
  "Up to 30 minutes per day",
  "Up to 30 minutes per session",
  "30 translated messages per minute",
  "20,000 provider-input/source characters per month"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const testModule = new Module(sourcePath);
  testModule.filename = sourcePath;
  testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  testModule._compile(compiled, sourcePath);
  return testModule.exports;
}

function changedFiles() {
  const base = "origin/codex/comment-translator-free-public-beta-integration";
  const committedDiff = execSync(`git diff --name-only ${base}...HEAD`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const uncommittedDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
}

function assertAllIncluded(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} includes ${snippet}`);
  }
}

const copyModule = loadTsModule(copyPath);
const legalModule = loadTsModule(legalContentPath);
const copySource = read(copyPath);
const dockSource = read(dockPath);
const legalContentSource = read(legalContentPath);
const usageDisplaySource = read(usageDisplayPath);
const taskBoard = read(taskBoardPath);
const task = read(taskPath);

assert.deepEqual(
  copyModule.commentTranslatorUiCopy.ja.operatorSession.publicLimitSummary,
  jaFreeLimits,
  "Japanese public UI copy states every enforced Free limit"
);
assert.deepEqual(
  copyModule.commentTranslatorUiCopy.en.operatorSession.publicLimitSummary,
  enFreeLimits,
  "English public UI copy states every enforced Free limit"
);
assertAllIncluded(copyModule.commentTranslatorUiCopy.ja.quotaScenarios.normal.helper, jaFreeLimits, "Japanese Free limit helper");
assertAllIncluded(copyModule.commentTranslatorUiCopy.en.quotaScenarios.normal.helper, enFreeLimits, "English Free limit helper");

assert.match(
  dockSource,
  /data-comment-translator-free-limits-public-copy="enforced-free-limits"/,
  "Dock renders the public Free limits copy surface"
);
assert.match(
  dockSource,
  /copy\.operatorSession\.publicLimitSummary\.map/,
  "Dock renders localized Free limit summary items from shared copy"
);
assert.match(usageDisplaySource, /monthlyInputCharacterCap/, "usage display keeps monthly input-character metadata");
assert.match(usageDisplaySource, /provider-input-characters-month/, "usage display keeps provider-input monthly authority");

const termsText = legalModule.legalDocuments.terms.sections
  .flatMap((section) => [...(section.paragraphs ?? []), ...(section.list ?? []), ...(section.rows ?? []).map((row) => row.value)])
  .join("\n");
assertAllIncluded(termsText, jaFreeLimits, "Terms legal copy");
assert.match(
  termsText,
  /月20,000入力文字/,
  "Terms legal copy names monthly input characters, not translated output characters"
);

for (const source of [copySource, dockSource, legalContentSource]) {
  assert.doesNotMatch(
    source,
    /translated[- ]?output characters? per month|translated characters per month|monthly translated characters|月[^。]*翻訳出力文字|翻訳出力文字[^。]*月/i,
    "public UI and legal copy do not describe the monthly cap as translated-output characters"
  );
}

assert.match(
  taskBoard,
  /`Free limits public copy`:\s*complete/i,
  "public launch task board marks Free limits public copy complete"
);
assertAllIncluded(taskBoard, jaFreeLimits, "public launch task board Japanese Free limits");
assert.match(
  taskBoard,
  /provider-input\/source characters/i,
  "public launch task board preserves provider-input/source monthly authority"
);
assert.match(task, /free_limits_public_copy_status=complete/, "task.md marks Free limits public copy complete");
assert.match(task, /20,000 provider-input\/source characters per month/i, "task.md preserves provider-input/source monthly cap");

const allowedChangedFiles = new Set([
  copyPath,
  dockPath,
  legalContentPath,
  taskBoardPath,
  "scripts/comment-translator-free-limits-public-copy-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-provider-legal-copy-refresh-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  taskPath
]);
const highConfidenceSecretPattern =
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'][^"']+/i;

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Free limits public copy change stays in allowed files: ${file}`);
  if (file.endsWith(".mjs")) {
    continue;
  }

  assert.doesNotMatch(
    read(file),
    highConfidenceSecretPattern,
    `${file} does not contain secret values, token values, authorization values, or private provider identifiers`
  );
}

console.log(
  "comment translator Free limits public copy contract passed (ui=aligned, legal=aligned, monthly_authority=provider-input-source)"
);
