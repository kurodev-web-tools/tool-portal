import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
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

const toolsLib = loadTsModule("lib/tools.ts");
const toolsSource = fs.readFileSync(path.join(root, "lib", "tools.ts"), "utf8");
const suitesSource = fs.readFileSync(path.join(root, "lib", "suites.ts"), "utf8");
const portalHomeSource = fs.readFileSync(path.join(root, "components", "portal", "PortalHome.tsx"), "utf8");
const portalHeroSource = fs.readFileSync(path.join(root, "components", "portal", "PortalHeroSummary.tsx"), "utf8");
const portalToolsIndexSource = fs.readFileSync(path.join(root, "components", "portal", "PortalToolsIndex.tsx"), "utf8");
const appLayoutSource = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");
const homePageSource = fs.readFileSync(path.join(root, "app", "page.tsx"), "utf8");
const toolsPageSource = fs.readFileSync(path.join(root, "app", "tools", "page.tsx"), "utf8");
const thumbnailPageSource = fs.readFileSync(path.join(root, "app", "tools", "thumbnail-editor", "page.tsx"), "utf8");
const snsPageSource = fs.readFileSync(path.join(root, "app", "tools", "sns-split-image-maker", "page.tsx"), "utf8");

const availableToolIds = toolsLib.availableTools.map((tool) => tool.id);
assert.deepEqual(
  availableToolIds,
  ["schedule-calendar", "thumbnail-editor", "sns-split-image-maker"],
  "portal available tools stay aligned with the freeze-ready tool set"
);

const thumbnailTool = toolsLib.tools.find((tool) => tool.id === "thumbnail-editor");
assert.ok(thumbnailTool, "thumbnail editor tool entry exists");
assert.equal(thumbnailTool.suite, "stream-workflow", "thumbnail editor belongs to stream workflow suite");
assert.equal(thumbnailTool.category, "design", "thumbnail editor keeps the design category");
assert.match(thumbnailTool.description, /用途別プリセット/, "thumbnail entry explains preset-first use");
assert.match(thumbnailTool.description, /文字/, "thumbnail entry mentions text replacement");
assert.match(thumbnailTool.description, /立ち絵/, "thumbnail entry mentions standee replacement");
assert.match(thumbnailTool.description, /VTuber/, "thumbnail entry keeps VTuber thumbnail scope");

const snsTool = toolsLib.tools.find((tool) => tool.id === "sns-split-image-maker");
assert.ok(snsTool, "sns split tool entry exists");
assert.equal(snsTool.suite, "stream-workflow", "sns split image maker belongs to stream workflow suite");
assert.equal(snsTool.category, "design", "sns split image maker keeps the design category");
assert.match(snsTool.description, /X向け/, "sns split entry keeps the X-focused freeze scope");
assert.match(snsTool.description, /2分割 \/ 3分割 \/ 4分割/, "sns split entry lists all current split presets");
assert.match(snsTool.description, /個別PNG\/JPEG/, "sns split entry keeps individual PNG/JPEG export scope");
assert.doesNotMatch(snsTool.description, /ZIP|一括ZIP|複数形式/, "sns split entry does not present deferred export expansions as current");

const streamWorkflowAvailableToolIds = toolsLib.tools
  .filter((tool) => tool.suite === "stream-workflow" && tool.status === "available")
  .map((tool) => tool.id);
assert.deepEqual(
  streamWorkflowAvailableToolIds,
  ["schedule-calendar", "thumbnail-editor", "sns-split-image-maker"],
  "stream workflow keeps the public tool flow in schedule -> thumbnail -> sns order"
);

for (const source of [portalHomeSource, portalHeroSource, portalToolsIndexSource, appLayoutSource, homePageSource, toolsPageSource]) {
  assert.doesNotMatch(source, /Schedule Calendar (?:を最小セット|です。その他は準備中|です。準備中|と準備中)/, "portal copy does not say Schedule Calendar is the only available tool");
}

assert.match(appLayoutSource, /Schedule Calendar、Thumbnail Editor、SNS分割画像メーカー/, "root metadata names the available tool set");
assert.match(homePageSource, /Schedule Calendar、Thumbnail Editor、SNS分割画像メーカー/, "home metadata names the available tool set");
assert.match(portalToolsIndexSource, /Schedule Calendar \/ Thumbnail Editor \/ SNS分割画像メーカー/, "tools index names the available tool set");
assert.match(toolsPageSource, /Schedule Calendar、Thumbnail Editor、SNS分割画像メーカー/, "tools page metadata names the available tool set");
assert.match(thumbnailPageSource, /用途別プリセット/, "thumbnail page metadata keeps preset-first scope");
assert.match(thumbnailPageSource, /立ち絵/, "thumbnail page metadata keeps standee replacement scope");
assert.match(snsPageSource, /2分割\/3分割\/4分割/, "sns page metadata lists all split presets");
assert.match(suitesSource, /key: "fan-brand"[\s\S]*?status: "available"/, "fan-brand suite is available while design tools are available");
assert.match(suitesSource, /key: "stream-workflow"[\s\S]*?Schedule Calendar[\s\S]*?Thumbnail Editor[\s\S]*?SNS分割画像/, "stream workflow suite tags present the public tool flow");
assert.match(suitesSource, /key: "fan-brand"[\s\S]*?ファン交流[\s\S]*?プロフィール整備[\s\S]*?ブランド素材/, "fan-brand suite tags focus on fan and brand work");
assert.doesNotMatch(suitesSource.match(/key: "fan-brand"[\s\S]*?status: "available"/)?.[0] ?? "", /Thumbnail Editor|SNS分割画像|サムネイル作成|分割画像づくり/, "fan-brand suite copy does not claim thumbnail or sns split creation");
assert.doesNotMatch(toolsSource + toolsPageSource + appLayoutSource + homePageSource + portalHomeSource + portalHeroSource + portalToolsIndexSource, /ZIP 出力|一括ZIP|複数形式 export/, "portal entry copy keeps post-freeze export candidates out of current feature copy");

console.log("tool-portal-entry contract checks passed");
