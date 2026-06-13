import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

function pngDimensions(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  assert.deepEqual(
    Array.from(buffer.subarray(0, 8)),
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    `${relativePath} is a PNG`
  );

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bytes: buffer.byteLength
  };
}

const toolsLib = loadTsModule("lib/tools.ts");
const portalCopy = loadTsModule("lib/portal-copy.ts");
const commentTranslatorLib = loadTsModule("lib/comment-translator.ts");
const toolsSource = read("lib/tools.ts");
const portalCopySource = read("lib/portal-copy.ts");
const siteTipsSource = read("components/portal/SiteTipsDialog.tsx");
const portalHeaderSource = read("components/portal/PortalHeader.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const libSource = read("lib/comment-translator.ts");
const taskSource = read("task.md");

assert.ok(exists("app/tools/comment-translator/page.tsx"), "comment translator route exists");
assert.ok(exists("components/comment-translator/CommentTranslatorDock.tsx"), "comment translator UI shell exists");
assert.ok(exists("lib/comment-translator.ts"), "comment translator fixture/provider module exists");

const commentTranslatorTool = toolsLib.tools.find((tool) => tool.id === "comment-translator");
assert.ok(commentTranslatorTool, "comment translator tool entry exists");
assert.equal(commentTranslatorTool.status, "available", "comment translator is available on the preview branch");
assert.equal(commentTranslatorTool.category, "stream", "comment translator is a stream management tool");
assert.equal(commentTranslatorTool.suite, "stream-workflow", "comment translator belongs to the stream workflow suite");
assert.equal(commentTranslatorTool.href, "/tools/comment-translator", "comment translator route is registered");
assert.equal(commentTranslatorTool.sidebar, true, "comment translator appears in the workspace sidebar");
assert.match(commentTranslatorTool.description, /YouTube/, "tool entry is YouTube-first");
assert.match(commentTranslatorTool.description, /read-only|読み取り専用/i, "tool entry keeps read-only dock scope");

assert.match(portalCopy.getToolCopy("comment-translator", "ja").description, /YouTube/, "Japanese tool copy is YouTube-first");
assert.match(portalCopy.getToolCopy("comment-translator", "en").description, /YouTube/, "English tool copy is YouTube-first");
assert.match(portalCopySource, /Kuro Live Comment Translator/, "portal copy names the tool");
assert.match(siteTipsSource, /\/tools\/comment-translator/, "site tips include the comment translator route");
assert.match(portalHeaderSource, /\/tools\/comment-translator/, "mobile workspace header resolves the comment translator title");
assert.match(routeSource, /PortalShell mode="workspace"/, "route uses the workspace shell");
assert.match(routeSource, /CommentTranslatorDock/, "route renders the comment translator dock");

assert.equal(commentTranslatorLib.commentTranslatorPlatform.id, "youtube", "first platform is YouTube");
assert.equal(commentTranslatorLib.commentTranslatorPlatform.mode, "read-only-dock", "platform fixture is read-only dock");
assert.equal(commentTranslatorLib.commentTranslatorSettings.targetLanguage, "ja", "target language defaults to Japanese");
assert.ok(Array.isArray(commentTranslatorLib.commentTranslatorComments), "comment fixtures are exported");
assert.ok(commentTranslatorLib.commentTranslatorComments.length >= 7, "fixtures cover a useful live comment list");
assert.ok(
  commentTranslatorLib.commentTranslatorComments.some((comment) => comment.status === "translated" && comment.translatedText),
  "fixtures include translated comments"
);
assert.ok(
  commentTranslatorLib.commentTranslatorComments.some((comment) => comment.status === "skipped" && comment.skipReason),
  "fixtures include skipped comments with a reason"
);
assert.ok(
  commentTranslatorLib.commentTranslatorComments.some((comment) => comment.status === "error" && comment.errorMessage),
  "fixtures include an error-like comment state"
);
assert.ok(
  commentTranslatorLib.commentTranslatorComments.some((comment) => comment.cacheStatus === "hit"),
  "fixtures include cache hit preview"
);
assert.match(libSource, /MockTranslationProvider/, "mock provider boundary is named explicitly");
assert.match(componentSource, /originalText/, "UI renders original text");
assert.match(componentSource, /translatedText/, "UI renders translated text");
assert.match(componentSource, /skipReason/, "UI renders skip reasons");
assert.match(componentSource, /cacheStatus/, "UI renders cache state");
assert.match(componentSource, /quota/i, "UI renders quota preview");
assert.match(componentSource, /empty/i, "UI includes an empty state");
assert.match(componentSource, /error/i, "UI includes an error-like state");

const forbiddenRuntimePatterns = [
  /fetch\s*\(/,
  /XMLHttpRequest/,
  /EventSource/,
  /WebSocket/,
  /localStorage/,
  /indexedDB/,
  /createClient/,
  /server action/i,
  /use server/,
  /OPENAI|DEEPL|GEMINI|GOOGLE_API|GOOGLE_CLOUD|API[_ -]?KEY/i,
  /stripe|billing|checkout|ga4|gtag|cookie consent/i,
  /oauth|owner verification|liveChatMessages|polling/i
];

for (const [label, source] of [
  ["component", componentSource],
  ["lib", libSource],
  ["route", routeSource]
]) {
  for (const pattern of forbiddenRuntimePatterns) {
    if ((label === "component" || label === "route") && pattern.source === "oauth|owner verification|liveChatMessages|polling") {
      assert.match(
        taskSource,
        /PR #321.*credential status display UI wiring/i,
        "post-PR #321 display wiring may reference the existing OAuth-named sanitized status action"
      );
      continue;
    }
    assert.doesNotMatch(source, pattern, `${label} keeps the first PR mock-only boundary: ${pattern}`);
  }
}

assert.match(toolsSource, /id: "comment-translator"/, "tool entry source includes comment-translator id");

const mockSpecs = [
  ["docs/mockups/comment-translator/comment-translator-390.png", 390],
  ["docs/mockups/comment-translator/comment-translator-820.png", 820],
  ["docs/mockups/comment-translator/comment-translator-1024.png", 1024],
  ["docs/mockups/comment-translator/comment-translator-1280.png", 1280],
  ["docs/mockups/comment-translator/comment-translator-1366.png", 1366]
];

for (const [relativePath, expectedWidth] of mockSpecs) {
  assert.ok(exists(relativePath), `${relativePath} exists`);
  const dimensions = pngDimensions(relativePath);
  assert.equal(dimensions.width, expectedWidth, `${relativePath} uses the target width`);
  assert.ok(dimensions.height >= 500, `${relativePath} has useful viewport height`);
  assert.ok(dimensions.bytes > 50_000, `${relativePath} is a substantive mock image`);
}

const mockReadme = read("docs/mockups/comment-translator/README.md");
assert.match(mockReadme, /imagegen/, "mock README records imagegen usage");
assert.match(mockReadme, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366/, "mock README records target widths");
assert.match(mockReadme, /fixture|MockTranslationProvider/i, "mock README records mock provider boundary");
assert.match(mockReadme, /No real translation API/i, "mock README records external API boundary");

console.log("comment translator mock foundation contract checks passed");
