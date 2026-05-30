import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

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

const lib = loadTsModule("lib/comment-translator.ts");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");

assert.match(routeSource, /PortalShell mode="workspace"/, "comment translator stays inside the workspace PortalShell");

assert.match(componentSource, /^"use client";/, "interactive shell is a client component");
assert.match(componentSource, /useState/, "interactive shell uses local fixture-driven state");
assert.match(componentSource, /<select[\s>]/, "setup and settings controls use real select menus");
assert.match(componentSource, /<input[\s>]/, "live comments can be searched");
assert.match(componentSource, /statusFilter/, "live comments expose a status filter");
assert.match(componentSource, /displayMode/, "comment text can switch between original, translated, and both");
assert.match(componentSource, /quotaScenarioId/, "cache and quota preview exposes selectable mock states");
assert.match(componentSource, /surfaceMode/, "display settings expose OBS dock and narrow viewport surfaces");
assert.doesNotMatch(componentSource, /href=|oauth|authorize|sign.?in with google/i, "interactive shell does not add an external connection path");

assert.ok(Array.isArray(lib.commentTranslatorConnectionStates), "mock connection states are exported");
assert.ok(lib.commentTranslatorConnectionStates.length >= 3, "mock connection menu has multiple states");
assert.ok(
  lib.commentTranslatorConnectionStates.every((state) => state.platformId === "youtube"),
  "connection states remain YouTube first"
);

assert.ok(Array.isArray(lib.commentTranslatorStreamOptions), "mock stream selection options are exported");
assert.ok(lib.commentTranslatorStreamOptions.length >= 3, "stream selection has multiple fixture choices");
assert.ok(
  lib.commentTranslatorStreamOptions.some((stream) => stream.dockStatus === "ready"),
  "stream selection includes a ready broadcaster dock status"
);

assert.ok(Array.isArray(lib.commentTranslatorSourceLanguageOptions), "source language menu options are exported");
assert.ok(
  lib.commentTranslatorSourceLanguageOptions.some((language) => language.id === "auto"),
  "source language can stay auto-detect"
);
assert.ok(Array.isArray(lib.commentTranslatorTargetLanguageOptions), "target language menu options are exported");
assert.ok(
  lib.commentTranslatorTargetLanguageOptions.some((language) => language.id === "ja") &&
    lib.commentTranslatorTargetLanguageOptions.some((language) => language.id === "en"),
  "target language menu supports Japanese and English fixtures"
);

assert.deepEqual(
  lib.commentTranslatorDisplayModeOptions.map((option) => option.id),
  ["both", "original", "translated"],
  "display mode supports both/original/translated"
);
assert.deepEqual(
  lib.commentTranslatorSurfaceOptions.map((option) => option.id),
  ["obs-browser-dock", "narrow-viewport"],
  "surface options stay scoped to OBS dock and narrow viewport"
);
assert.deepEqual(
  lib.commentTranslatorStatusFilters.map((option) => option.id),
  ["all", "translated", "skipped", "error"],
  "status tabs cover all, translated, skipped, and error states"
);

assert.ok(Array.isArray(lib.commentTranslatorQuotaScenarios), "quota preview scenarios are exported");
assert.deepEqual(
  lib.commentTranslatorQuotaScenarios.map((scenario) => scenario.id),
  ["normal", "warning", "empty", "error"],
  "quota preview supports normal, warning, empty, and error-like states"
);
assert.ok(
  lib.commentTranslatorComments.some((comment) => comment.cacheStatus === "hit") &&
    lib.commentTranslatorComments.some((comment) => comment.cacheStatus === "miss"),
  "comment fixtures contain cache hit and miss states"
);

const skippedOnly = lib.filterCommentTranslatorComments(lib.commentTranslatorComments, {
  statusFilter: "skipped",
  searchQuery: ""
});
assert.ok(skippedOnly.length > 0, "filter helper returns skipped fixtures");
assert.ok(skippedOnly.every((comment) => comment.status === "skipped"), "skipped filter excludes non-skipped comments");

const errorOnly = lib.filterCommentTranslatorComments(lib.commentTranslatorComments, {
  statusFilter: "error",
  searchQuery: ""
});
assert.ok(errorOnly.length > 0, "filter helper returns error-like fixtures");
assert.ok(errorOnly.every((comment) => comment.status === "error"), "error filter excludes non-error comments");

const searchMatchesTranslated = lib.filterCommentTranslatorComments(lib.commentTranslatorComments, {
  statusFilter: "all",
  searchQuery: "スペイン"
});
assert.ok(
  searchMatchesTranslated.some((comment) => comment.id === "c-004"),
  "search covers translated text as well as original text"
);

assert.doesNotMatch(
  `${read("lib/comment-translator.ts")}\n${componentSource}`,
  /fetch\s*\(|XMLHttpRequest|EventSource|WebSocket|localStorage|indexedDB|createClient|OPENAI|DEEPL|GEMINI|GOOGLE_API|GOOGLE_CLOUD|API[_ -]?KEY|stripe|billing|checkout|ga4|gtag|cookie consent|liveChatMessages|polling/i,
  "interactive shell stays fixture-only without external runtime integrations"
);

console.log("comment translator interactive shell contract checks passed");
