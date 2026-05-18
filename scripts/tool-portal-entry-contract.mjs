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
const portalHeaderSource = fs.readFileSync(path.join(root, "components", "portal", "PortalHeader.tsx"), "utf8");
const portalSidebarSource = fs.readFileSync(path.join(root, "components", "portal", "PortalSidebar.tsx"), "utf8");
const feedbackNoticeSource = fs.readFileSync(path.join(root, "components", "portal", "FeedbackNotice.tsx"), "utf8");
const globalsSource = fs.readFileSync(path.join(root, "app", "globals.css"), "utf8");
const appLayoutSource = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");
const homePageSource = fs.readFileSync(path.join(root, "app", "page.tsx"), "utf8");
const toolsPageSource = fs.readFileSync(path.join(root, "app", "tools", "page.tsx"), "utf8");
const schedulePageSource = fs.readFileSync(path.join(root, "app", "tools", "schedule-calendar", "page.tsx"), "utf8");
const thumbnailPageSource = fs.readFileSync(path.join(root, "app", "tools", "thumbnail-editor", "page.tsx"), "utf8");
const snsPageSource = fs.readFileSync(path.join(root, "app", "tools", "sns-split-image-maker", "page.tsx"), "utf8");

function readPngDimensions(relativePath) {
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

const favicon = readPngDimensions("app/icon.png");
assert.equal(favicon.width, 256, "favicon keeps the optimized 256px width");
assert.equal(favicon.height, 256, "favicon keeps the optimized 256px height");
assert.ok(favicon.bytes < 200_000, "favicon stays lightweight enough for a public tab icon");

const appleIcon = readPngDimensions("app/apple-icon.png");
assert.equal(appleIcon.width, 180, "apple touch icon keeps the expected 180px width");
assert.equal(appleIcon.height, 180, "apple touch icon keeps the expected 180px height");
assert.ok(appleIcon.bytes < 100_000, "apple touch icon stays lightweight");
assert.ok(!fs.existsSync(path.join(root, "app", "icon.svg")), "old placeholder svg favicon is replaced by the generated PNG icon");

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
assert.match(thumbnailTool.notice ?? "", /生成・加工した抽象背景や装飾素材/, "thumbnail card discloses generated built-in visual assets");
assert.match(toolsSource, /notice\?: string/, "tool data supports a short card-level notice");
assert.match(portalToolsIndexSource + fs.readFileSync(path.join(root, "components", "portal", "ToolCard.tsx"), "utf8"), /tool\.notice/, "tool cards render short per-tool notices");

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

const suiteKeysFromTools = Array.from(new Set(toolsLib.tools.map((tool) => tool.suite))).sort();
const suiteKeysFromSuites = Array.from(suitesSource.matchAll(/key: "([^"]+)"/g), (match) => match[1]).sort();
assert.deepEqual(suiteKeysFromSuites, suiteKeysFromTools, "suite definitions cover the same suite keys as tool data");
assert.match(
  suitesSource,
  /toolCount: tools\.filter\(\(tool\) => tool\.suite === suite\.key\)\.length/,
  "suite tool count is derived from tool data"
);
assert.match(
  suitesSource,
  /totalSuiteToolCount = suites\.reduce/,
  "suite total count is derived from computed suite counts"
);

for (const source of [portalHomeSource, portalHeroSource, portalToolsIndexSource, appLayoutSource, homePageSource, toolsPageSource]) {
  assert.doesNotMatch(source, /Schedule Calendar (?:を最小セット|です。その他は準備中|です。準備中|と準備中)/, "portal copy does not say Schedule Calendar is the only available tool");
}

assert.match(appLayoutSource, /Schedule Calendar、Thumbnail Editor、SNS分割画像メーカー/, "root metadata names the available tool set");
assert.match(appLayoutSource, /default:\s*"Kuro Stream Kit"/, "root metadata uses the public product name");
assert.match(appLayoutSource, /template:\s*"%s \| Kuro Stream Kit"/, "root metadata title template uses the public product name");
assert.match(appLayoutSource, /title:\s*"Kuro Stream Kit"/, "open graph metadata uses the public product name");
assert.match(homePageSource, /Kuro Stream Kitの公開最小セット/, "home metadata uses the public product name");
assert.match(homePageSource, /Schedule Calendar、Thumbnail Editor、SNS分割画像メーカー/, "home metadata names the available tool set");
assert.match(portalToolsIndexSource, /Schedule Calendar \/ Thumbnail Editor \/ SNS分割画像メーカー/, "tools index names the available tool set");
assert.match(toolsPageSource, /Kuro Stream Kitのツール一覧/, "tools page metadata uses the public product name");
assert.match(toolsPageSource, /Schedule Calendar、Thumbnail Editor、SNS分割画像メーカー/, "tools page metadata names the available tool set");
assert.match(schedulePageSource, /Kuro Stream Kitの公開中ツール/, "schedule page metadata uses the public product name");
assert.match(thumbnailPageSource, /用途別プリセット/, "thumbnail page metadata keeps preset-first scope");
assert.match(thumbnailPageSource, /立ち絵/, "thumbnail page metadata keeps standee replacement scope");
assert.match(thumbnailPageSource, /Kuro Stream Kitのツール/, "thumbnail page metadata uses the public product name");
assert.match(snsPageSource, /2分割\/3分割\/4分割/, "sns page metadata lists all split presets");
assert.match(snsPageSource, /Kuro Stream Kitのツール/, "sns page metadata uses the public product name");
assert.match(suitesSource, /key: "fan-brand"[\s\S]*?status: "planned"/, "fan-brand suite stays planned until it has a public tool");
assert.match(suitesSource, /key: "stream-workflow"[\s\S]*?Schedule Calendar[\s\S]*?Thumbnail Editor[\s\S]*?SNS分割画像/, "stream workflow suite tags present the public tool flow");
assert.match(suitesSource, /key: "fan-brand"[\s\S]*?ファン交流[\s\S]*?プロフィール整備[\s\S]*?ブランド素材/, "fan-brand suite tags focus on fan and brand work");
assert.doesNotMatch(suitesSource.match(/key: "fan-brand"[\s\S]*?status: "planned"/)?.[0] ?? "", /Thumbnail Editor|SNS分割画像|サムネイル作成|分割画像づくり/, "fan-brand suite copy does not claim thumbnail or sns split creation");
assert.doesNotMatch(portalHeroSource, /開発中のツール/, "hero summary does not foreground the number of planned tools before launch");
assert.match(portalHeroSource, /公開導線/, "hero summary foregrounds the public workflow instead of planned inventory");
assert.doesNotMatch(portalHeroSource, />\s*V\s*</, "hero summary does not show the large V visual");
assert.match(portalHeaderSource, /return "Kuro Stream Kit"/, "portal header uses the public product name");
assert.match(portalHeaderSource, />\s*K\s*</, "portal mobile header uses the K brand mark");
assert.match(portalSidebarSource, /title="Kuro Stream Kit"/, "portal sidebar home link uses the public product name");
assert.match(portalSidebarSource, />Kuro Stream Kit</, "portal sidebar displays the public product name");
assert.match(portalSidebarSource, /© 2026 Kuro Stream Kit/, "portal sidebar copyright uses the public product name");
assert.match(feedbackNoticeSource, /feedback@kuro-lab\.com/, "feedback notice uses the public feedback address");
assert.match(
  feedbackNoticeSource,
  /mailto:feedback@kuro-lab\.com\?subject=Kuro%20Stream%20Kit%20feedback/,
  "feedback notice mail button uses the public feedback mailto"
);
assert.match(feedbackNoticeSource, /https:\/\/x\.com\/kurodev_v/, "feedback notice links to the public X profile");
assert.match(feedbackNoticeSource, /https:\/\/discord\.gg\/35rjbPfxz5/, "feedback notice links to the Discord invite");
assert.match(feedbackNoticeSource, /target="_blank"[\s\S]*?rel="noreferrer"/, "feedback external links open safely");
assert.doesNotMatch(feedbackNoticeSource, /準備予定|未確定/, "feedback notice does not present confirmed channels as planned");
assert.doesNotMatch(
  toolsSource + portalHomeSource + portalHeroSource + portalToolsIndexSource + feedbackNoticeSource,
  /MVP公開中|公開版ではまだ利用できません/,
  "public entry copy avoids internal MVP or unavailable wording"
);
assert.match(portalToolsIndexSource, /getDefaultStatusFilter/, "tools index defaults to available tools unless a selected suite has no public tools");
assert.doesNotMatch(toolsSource + toolsPageSource + appLayoutSource + homePageSource + portalHomeSource + portalHeroSource + portalToolsIndexSource, /ZIP 出力|一括ZIP|複数形式 export/, "portal entry copy keeps post-freeze export candidates out of current feature copy");
assert.doesNotMatch(
  appLayoutSource + homePageSource + toolsPageSource + schedulePageSource + thumbnailPageSource + snsPageSource + portalHeaderSource + portalSidebarSource + feedbackNoticeSource,
  /V Streamer Tools/,
  "public app shell and metadata no longer use the old product name"
);
assert.match(globalsSource, /html\s*{[\s\S]*?scrollbar-color:/, "document scrollbars use the portal accent palette");
assert.match(globalsSource, /html::-webkit-scrollbar\s*{[\s\S]*?width:\s*8px;[\s\S]*?height:\s*8px;/, "document webkit scrollbars avoid the OS default width");
assert.match(globalsSource, /\.scrollbar-accent::-webkit-scrollbar\s*{[\s\S]*?width:\s*8px;[\s\S]*?height:\s*8px;/, "tool scroll containers keep matching scrollbar dimensions");

console.log("tool-portal-entry contract checks passed");
