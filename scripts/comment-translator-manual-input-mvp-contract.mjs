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
const libSource = read("lib/comment-translator.ts");

assert.ok(Array.isArray(lib.commentTranslatorManualSamples), "manual input sample comments are exported");
assert.ok(lib.commentTranslatorManualSamples.length >= 3, "manual input has multiple sample comments");
assert.equal(typeof lib.splitManualCommentInput, "function", "manual input splitter helper is exported");
assert.equal(typeof lib.createManualCommentRows, "function", "manual input row factory is exported");

assert.deepEqual(
  lib.splitManualCommentInput({
    singleComment: "  Hello Kuro!  ",
    multilinePaste: "First pasted row\n\nSecond pasted row  "
  }),
  ["Hello Kuro!", "First pasted row", "Second pasted row"],
  "manual input trims single and multiline draft text and drops blank rows"
);

const translatedRows = lib.createManualCommentRows({
  texts: ["Hello from chat", "Gracias por el stream"],
  resultMode: "translated",
  targetLanguage: "ja",
  targetLanguageLabel: "Japanese",
  startIndex: 1
});

assert.equal(translatedRows.length, 2, "translated manual result creates one row per input line");
assert.ok(translatedRows.every((comment) => comment.id.startsWith("manual-")), "manual rows use manual ids");
assert.ok(translatedRows.every((comment) => comment.source === "manual"), "manual rows are source-tagged");
assert.ok(translatedRows.every((comment) => comment.badge === "manual"), "manual rows can be visually distinguished");
assert.ok(translatedRows.every((comment) => comment.status === "translated"), "translated manual mode creates translated rows");
assert.ok(
  translatedRows.every((comment) => comment.translatedText?.includes("Mock JA")),
  "translated manual rows use deterministic mock translation text"
);
assert.ok(
  translatedRows.every((comment) => comment.cacheStatus === "miss" && comment.unitCost === 1),
  "translated manual rows behave like cache misses with a mock unit cost"
);

const skippedRows = lib.createManualCommentRows({
  texts: ["ok"],
  resultMode: "skipped",
  targetLanguage: "ja",
  targetLanguageLabel: "Japanese",
  startIndex: 3
});
assert.equal(skippedRows[0].status, "skipped", "manual skipped mode creates skipped rows");
assert.equal(skippedRows[0].skipReason, "Too short", "manual skipped mode preserves a skip reason");
assert.equal(skippedRows[0].unitCost, 0, "manual skipped rows do not consume mock units");

const errorRows = lib.createManualCommentRows({
  texts: ["Why did translation fail?"],
  resultMode: "error",
  targetLanguage: "ja",
  targetLanguageLabel: "Japanese",
  startIndex: 4
});
assert.equal(errorRows[0].status, "error", "manual error mode creates error-like rows");
assert.match(errorRows[0].errorMessage, /Manual mock/i, "manual error mode exposes a mock error message");

const manualSearchMatches = lib.filterCommentTranslatorComments(translatedRows, {
  statusFilter: "all",
  searchQuery: "manual"
});
assert.equal(manualSearchMatches.length, translatedRows.length, "search covers manual source badges");

assert.equal(lib.commentTranslatorUiCopy.en.sections.manualInput, "Manual / Paste Input", "English copy includes manual panel heading");
assert.equal(lib.commentTranslatorUiCopy.ja.sections.manualInput, "手入力 / 貼り付け", "Japanese copy includes manual panel heading");
assert.match(componentSource, /singleCommentDraft/, "component stores single comment draft state");
assert.match(componentSource, /multilinePasteDraft/, "component stores multiline paste draft state");
assert.match(componentSource, /manualComments/, "component stores manual session rows");
assert.match(componentSource, /manualResultMode/, "component can switch manual translated, skipped, and error states");
assert.match(componentSource, /<textarea[\s>]/, "manual paste input uses a multiline textarea");
assert.match(componentSource, /commentTranslatorManualSamples/, "component can insert deterministic sample comments");
assert.match(componentSource, /clearManualSession/, "component can clear the manual session");
assert.match(componentSource, /allComments/, "component combines fixture rows and manual rows before filtering");

assert.doesNotMatch(
  `${libSource}\n${componentSource}`,
  /fetch\s*\(|XMLHttpRequest|EventSource|WebSocket|localStorage|indexedDB|createClient|OPENAI|DEEPL|GEMINI|GOOGLE_API|GOOGLE_CLOUD|API[_ -]?KEY|stripe|billing|checkout|ga4|gtag|cookie consent|liveChatMessages|polling|oauth|owner verification/i,
  "manual input MVP stays fixture-only without external runtime, storage, or credential boundaries"
);

console.log("comment translator manual input MVP contract checks passed");
