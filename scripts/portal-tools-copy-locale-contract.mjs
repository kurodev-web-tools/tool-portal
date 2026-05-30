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

const portalCopy = loadTsModule("lib/portal-copy.ts");
const metadataCopy = loadTsModule("lib/portal-metadata.ts");
const portalHomeSource = read("components/portal/PortalHome.tsx");
const portalHeroSource = read("components/portal/PortalHeroSummary.tsx");
const portalToolsIndexSource = read("components/portal/PortalToolsIndex.tsx");
const portalFilterBarSource = read("components/portal/PortalFilterBar.tsx");
const suiteCardSource = read("components/portal/SuiteCard.tsx");
const toolCardSource = read("components/portal/ToolCard.tsx");
const statusBadgeSource = read("components/portal/StatusBadge.tsx");
const feedbackNoticeSource = read("components/portal/FeedbackNotice.tsx");
const portalHeaderSource = read("components/portal/PortalHeader.tsx");
const portalSidebarSource = read("components/portal/PortalSidebar.tsx");
const appLayoutSource = read("app/layout.tsx");
const homePageSource = read("app/page.tsx");
const toolsPageSource = read("app/tools/page.tsx");

assert.ok(portalCopy.portalCopy.ja, "portal copy exposes Japanese strings");
assert.ok(portalCopy.portalCopy.en, "portal copy exposes English strings");
assert.equal(portalCopy.portalCopy.ja.home.hero.title, "配信準備を、いま使えるツールから。", "Japanese hero title stays unchanged");
assert.equal(portalCopy.portalCopy.en.home.hero.title, "Start your stream prep with tools you can use today.", "English hero title is available");
assert.equal(portalCopy.portalCopy.ja.tools.title, "ツール一覧", "Japanese tools title stays unchanged");
assert.equal(portalCopy.portalCopy.en.tools.title, "Tools", "English tools title is available");
assert.equal(portalCopy.portalCopy.ja.filters.all, "すべて", "Japanese all filter stays unchanged");
assert.equal(portalCopy.portalCopy.en.filters.all, "All", "English all filter is available");
assert.equal(portalCopy.getStatusLabel("available", "ja"), "利用可能", "Japanese status label is preserved");
assert.equal(portalCopy.getStatusLabel("available", "en"), "Available", "English status label is available");
assert.equal(portalCopy.getCategoryLabel("design", "ja"), "画像・デザイン", "Japanese category label is preserved");
assert.equal(portalCopy.getCategoryLabel("design", "en"), "Image & Design", "English category label is available");

const streamWorkflowJa = portalCopy.getSuiteCopy("stream-workflow", "ja");
const streamWorkflowEn = portalCopy.getSuiteCopy("stream-workflow", "en");
assert.equal(streamWorkflowJa.name, "配信ワークフロー", "Japanese suite name stays unchanged");
assert.equal(streamWorkflowEn.name, "Stream Workflow", "English suite name is available");
assert.deepEqual(streamWorkflowEn.tags.slice(0, 3), ["Schedule Calendar", "Thumbnail Editor", "SNS Split Image Maker"], "English suite tags keep the public flow");

const snsJa = portalCopy.getToolCopy("sns-split-image-maker", "ja");
const snsEn = portalCopy.getToolCopy("sns-split-image-maker", "en");
assert.equal(snsJa.name, "SNS分割画像メーカー", "Japanese SNS tool name stays unchanged");
assert.equal(snsEn.name, "SNS Split Image Maker", "English SNS tool name is available");
assert.match(snsEn.description, /2, 3, or 4 images for X/, "English SNS description explains the current split scope");
assert.doesNotMatch(snsEn.description, /ZIP|Google Calendar|localStorage|IndexedDB/, "English portal copy does not promise out-of-scope features");

const thumbnailEn = portalCopy.getToolCopy("thumbnail-editor", "en");
assert.match(thumbnailEn.notice ?? "", /built-in presets include abstract backgrounds and decorative assets/i, "English thumbnail notice is available");

for (const [label, source] of [
  ["PortalHome", portalHomeSource],
  ["PortalHeroSummary", portalHeroSource],
  ["PortalToolsIndex", portalToolsIndexSource],
  ["FeedbackNotice", feedbackNoticeSource],
  ["PortalHeader", portalHeaderSource],
  ["PortalSidebar", portalSidebarSource]
]) {
  assert.match(source, /useLocale\(\)/, `${label} reads the active locale`);
}

assert.match(portalFilterBarSource, /portalCopy\[locale\]\.filters/, "filter bar reads localized filter copy");
assert.match(suiteCardSource, /getSuiteCopy\(suite\.key,\s*locale\)/, "suite cards resolve localized suite copy");
assert.match(toolCardSource, /getToolCopy\(tool\.id,\s*locale\)/, "tool cards resolve localized tool copy");
assert.match(toolCardSource, /getCategoryLabel\(tool\.category,\s*locale\)/, "tool cards resolve localized category copy");
assert.match(statusBadgeSource, /getStatusLabel\(status,\s*locale\)/, "status badges resolve localized status copy");

assert.equal(metadataCopy.portalMetadata.ja.root.title, "Kuro Stream Kit", "metadata copy keeps Japanese-rooted public name");
assert.match(metadataCopy.portalMetadata.ja.root.description, /VTuber向け/, "metadata copy keeps the current Japanese root description");
assert.match(metadataCopy.portalMetadata.en.root.description, /tool portal for VTubers/i, "metadata copy prepares English root description");
assert.match(appLayoutSource, /portalMetadata\.en\.root/, "root static metadata uses conservative English copy for EN support");
assert.match(homePageSource, /portalMetadata\.en\.home/, "home static metadata uses conservative English copy for EN support");
assert.match(toolsPageSource, /portalMetadata\.en\.tools/, "tools static metadata uses conservative English copy for EN support");
assert.equal(portalCopy.portalCopy.en.tools.resultCountSuffix, "visible", "English result count copy reads naturally in isolation");
assert.equal(portalCopy.portalCopy.en.feedback.discordAria, "Open the Kuro Stream Kit Discord feedback channel", "English Discord feedback aria is natural");
assert.equal(portalCopy.portalCopy.en.navigation.loginTitle, "Save display settings", "English login title matches active account display settings copy");

console.log("portal tools copy locale contract checks passed");
