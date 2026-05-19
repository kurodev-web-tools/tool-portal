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

const thumbnailCopy = loadTsModule("lib/thumbnail-editor-copy.ts");
const snsCopy = loadTsModule("lib/sns-split-image-maker-copy.ts");
const thumbnailSource = read("components/thumbnail-editor/ThumbnailEditorApp.tsx");
const snsSource = read("components/sns-split-image-maker/SnsSplitImageMakerApp.tsx");
const snsLandingSource = read("components/sns-split-image-maker/SnsSplitPresetLanding.tsx");
const thumbnailLibSource = read("lib/thumbnail-editor.ts");
const snsLibSource = read("lib/sns-split-image-maker.ts");

assert.ok(thumbnailCopy.thumbnailEditorCopy.ja, "Thumbnail Editor copy exposes Japanese strings");
assert.ok(thumbnailCopy.thumbnailEditorCopy.en, "Thumbnail Editor copy exposes English strings");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("ja").header.category, "画像・デザイン", "Thumbnail Japanese category stays unchanged");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").header.category, "Image & Design", "Thumbnail English category is available");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("ja").panels.presets.title, "プリセット一覧", "Thumbnail Japanese preset title stays unchanged");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").panels.presets.title, "Presets", "Thumbnail English preset title is available");
assert.match(thumbnailCopy.getThumbnailEditorCopy("en").export.sendToSns, /SNS Split Image Maker/, "Thumbnail export handoff copy names SNS Split Image Maker");
assert.match(thumbnailCopy.getThumbnailEditorCopy("en").export.storageNote, /browser/i, "Thumbnail export copy keeps local browser storage boundary visible");
assert.equal(thumbnailCopy.getThumbnailPresetName("stream_announce", "ja"), "配信告知", "Thumbnail Japanese preset name stays unchanged");
assert.equal(thumbnailCopy.getThumbnailPresetName("stream_announce", "en"), "Stream Announcement", "Thumbnail English preset name is available");
assert.equal(thumbnailCopy.getThumbnailPresetCategoryLabel("告知画像", "en"), "Announcement Image", "Thumbnail English preset category is available");
assert.equal(thumbnailCopy.getThumbnailPresetUsageLabel("音楽配信", "en"), "Singing stream", "Thumbnail English usage label is available");

assert.ok(snsCopy.snsSplitImageMakerCopy.ja, "SNS Split copy exposes Japanese strings");
assert.ok(snsCopy.snsSplitImageMakerCopy.en, "SNS Split copy exposes English strings");
assert.equal(snsCopy.getSnsSplitImageMakerCopy("ja").header.title, "SNS分割画像メーカー", "SNS Japanese title stays unchanged");
assert.equal(snsCopy.getSnsSplitImageMakerCopy("en").header.title, "SNS Split Image Maker", "SNS English title is available");
assert.equal(snsCopy.getSnsSplitPresetCards("ja")[0].description, "横長2枚を保存順どおりに作ります。", "SNS Japanese landing copy stays unchanged");
assert.match(snsCopy.getSnsSplitPresetCards("en")[0].description, /two wide images/i, "SNS English landing copy is available");
assert.match(snsCopy.getSnsSplitImageMakerCopy("en").export.deferredNote, /ZIP/i, "SNS English export copy keeps deferred ZIP scope visible");
assert.equal(snsCopy.getSnsSplitModeLabel("concatenate", "en"), "Individual add", "SNS English mode label is available");
assert.equal(snsCopy.getSnsSplitJoinTypeLabel("five", "en"), "5-panel", "SNS English join label is available");

for (const [label, source] of [
  ["ThumbnailEditorApp", thumbnailSource],
  ["SnsSplitImageMakerApp", snsSource],
  ["SnsSplitPresetLanding", snsLandingSource]
]) {
  assert.match(source, /useLocale\(\)/, `${label} reads the active locale`);
}

assert.match(thumbnailSource, /getThumbnailEditorCopy\(locale\)/, "Thumbnail Editor resolves localized copy from active locale");
assert.match(thumbnailSource, /filterLocalizedThumbnailPresets/, "Thumbnail preset filtering can search localized copy");
assert.match(thumbnailSource, /getLocalizedThumbnailQualityGuardSummary/, "Thumbnail export preflight summary is localized at display time");
assert.match(snsSource, /getSnsSplitImageMakerCopy\(locale\)/, "SNS Split resolves localized copy from active locale");
assert.match(snsLandingSource, /getSnsSplitPresetCards\(locale\)/, "SNS Split landing uses localized preset cards");

assert.match(thumbnailLibSource, /v-streamer-tools:thumbnail-editor:draft:v1/, "Thumbnail copy work does not change draft storage key");
assert.match(snsLibSource, /v-streamer-tools:sns-split-image-maker:draft:v1/, "SNS copy work does not change draft storage key");
assert.doesNotMatch(thumbnailSource + snsSource + snsLandingSource, /i18next|next-intl|react-intl/, "PR4 does not add a large i18n framework");
assert.doesNotMatch(
  JSON.stringify(thumbnailCopy.thumbnailEditorCopy.en) + JSON.stringify(snsCopy.snsSplitImageMakerCopy.en),
  /Google Calendar|external posting|new storage|new schema/i,
  "English tool copy does not promise out-of-scope integrations or storage/schema changes"
);

console.log("thumbnail and SNS copy locale contract checks passed");
