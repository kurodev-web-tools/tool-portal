import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
const componentSourcePath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const materialAssetsRoot = path.join(root, "public", "assets", "images", "thumbnail-editor");
const source = fs.readFileSync(sourcePath, "utf8");
const componentSource = fs.readFileSync(componentSourcePath, "utf8");
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
const lib = testModule.exports;

const collectAssetFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? collectAssetFiles(fullPath) : [path.relative(materialAssetsRoot, fullPath).replaceAll("\\", "/")];
  });
};

const presetStructureBefore = JSON.stringify(
  lib.thumbnailPresets.map((preset) => ({
    id: preset.id,
    layerTypes: preset.layers.map((layer) => layer.type),
    textLayerNames: preset.layers.filter((layer) => layer.type === "text").map((layer) => layer.name),
    imageLayerNames: preset.layers.filter((layer) => layer.type === "image").map((layer) => layer.name)
  }))
);
const materialIdsBefore = JSON.stringify(lib.thumbnailMaterialLibrary.map((material) => material.id));
const assetFilesBefore = collectAssetFiles(materialAssetsRoot);

assert.equal(typeof lib.getThumbnailQualityGuardItems, "function", "thumbnail quality guard helper is exported");
assert.equal(typeof lib.getThumbnailOverallQualityGuardItems, "function", "overall thumbnail quality guard helper is exported");
assert.equal(typeof lib.getThumbnailQualityGuardSummary, "function", "thumbnail quality guard summary helper is exported");

const draft = lib.createDraftFromPreset("stream_announce");
const textLayer = draft.layers.find((layer) => layer.type === "text" && layer.name.includes("見出し"));
assert.ok(textLayer, "test preset has a headline text layer");
const riskyTextDraft = {
  ...draft,
  selectedLayerId: textLayer.id,
  layers: draft.layers.map((layer) =>
    layer.id === textLayer.id
      ? {
          ...layer,
          fontSize: 22,
          color: "#111111",
          strokeColor: "#111111",
          strokeWidth: 0,
          shadowBlur: 0,
          shadowColor: "#111111",
          x: -18
        }
      : layer
  )
};
const riskyTextBefore = JSON.stringify(riskyTextDraft);
const textGuardItems = lib.getThumbnailQualityGuardItems(riskyTextDraft, textLayer.id);

assert.ok(textGuardItems.length >= 3, "quality guard returns lightweight warnings and hints for selected text");
assert.ok(textGuardItems.some((item) => item.id === "selected-text-size" && item.tone === "warning"), "selected text size warning exists");
assert.ok(textGuardItems.some((item) => item.id === "selected-text-contrast"), "selected text contrast hint exists");
assert.ok(textGuardItems.some((item) => item.id === "selected-layer-safe-area"), "selected layer safe area warning exists");
assert.ok(
  textGuardItems.every((item) => ["warning", "hint", "ok"].includes(item.tone) && item.message.length <= 28),
  "quality guard copy stays short"
);
assert.equal(JSON.stringify(riskyTextDraft), riskyTextBefore, "quality guard does not auto-correct or mutate the draft");

const safeTextDraft = {
  ...draft,
  selectedLayerId: textLayer.id,
  layers: draft.layers.map((layer) =>
    layer.id === textLayer.id
      ? {
          ...layer,
          fontSize: 82,
          color: "#ffffff",
          strokeColor: "#111111",
          strokeWidth: 8,
          shadowBlur: 18,
          x: 80,
          y: 180,
          width: 760,
          height: 190
        }
      : layer
  )
};
assert.ok(
  lib.getThumbnailQualityGuardItems(safeTextDraft, textLayer.id).some((item) => item.id === "thumbnail-quality-ok" && item.tone === "ok"),
  "quality guard can show a compact ok state"
);

const imageLayer = lib.createImageLayer("data:image/png;base64,standee");
const imageGuardItems = lib.getThumbnailQualityGuardItems(
  {
    ...draft,
    selectedLayerId: imageLayer.id,
    layers: [...draft.layers, { ...imageLayer, x: 1190, y: 80, width: 220, height: 520 }]
  },
  imageLayer.id
);
assert.ok(imageGuardItems.some((item) => item.id === "selected-layer-safe-area"), "image layer guard checks standee safe area without changing placement schema");

const overallRiskyDraft = {
  ...draft,
  selectedLayerId: null,
  layers: draft.layers.map((layer) =>
    layer.id === textLayer.id
      ? {
          ...layer,
          fontSize: 22,
          x: -18
        }
      : layer.type === "image"
        ? {
            ...layer,
            locked: true,
            hidden: true
          }
        : layer
  )
};
const overallRiskyBefore = JSON.stringify(overallRiskyDraft);
const overallGuardItems = lib.getThumbnailOverallQualityGuardItems(overallRiskyDraft);

assert.ok(overallGuardItems.some((item) => item.id === "overall-text-size" && item.tone === "warning"), "overall guard checks small text without selecting a layer");
assert.ok(overallGuardItems.some((item) => item.id === "overall-safe-area" && item.tone === "warning"), "overall guard checks safe area without selecting a layer");
assert.ok(overallGuardItems.some((item) => item.id === "overall-hidden-layers" && item.tone === "hint"), "overall guard lightly notes hidden layers");
assert.ok(overallGuardItems.some((item) => item.id === "overall-locked-layers" && item.tone === "hint"), "overall guard lightly notes locked layers");
assert.ok(
  overallGuardItems.every((item) => ["warning", "hint", "ok"].includes(item.tone) && item.message.length <= 28),
  "overall quality guard copy stays short"
);
assert.equal(JSON.stringify(overallRiskyDraft), overallRiskyBefore, "overall guard does not auto-correct or mutate the draft");

const riskySummary = lib.getThumbnailQualityGuardSummary(overallGuardItems);
assert.equal(riskySummary.label, `注意 ${overallGuardItems.length}件`, "overall summary stays short near export actions");
assert.equal(riskySummary.tone, "warning", "overall summary uses warning tone when warnings exist");

const overallOkDraft = {
  ...safeTextDraft,
  layers: safeTextDraft.layers.map((layer) => (layer.type === "text" ? { ...layer, fontSize: Math.max(layer.fontSize, 44), x: Math.max(layer.x, 80) } : layer))
};
const overallOkItems = lib.getThumbnailOverallQualityGuardItems(overallOkDraft);
assert.ok(overallOkItems.some((item) => item.id === "thumbnail-quality-ok" && item.tone === "ok"), "overall guard can show compact ok state");
assert.equal(lib.getThumbnailQualityGuardSummary(overallOkItems).label, "品質チェックOK", "overall summary can show compact ok text");

assert.equal(
  JSON.stringify(
    lib.thumbnailPresets.map((preset) => ({
      id: preset.id,
      layerTypes: preset.layers.map((layer) => layer.type),
      textLayerNames: preset.layers.filter((layer) => layer.type === "text").map((layer) => layer.name),
      imageLayerNames: preset.layers.filter((layer) => layer.type === "image").map((layer) => layer.name)
    }))
  ),
  presetStructureBefore,
  "quality guard does not change major preset structure"
);
assert.equal(JSON.stringify(lib.thumbnailMaterialLibrary.map((material) => material.id)), materialIdsBefore, "quality guard does not change material library registration");
assert.deepEqual(collectAssetFiles(materialAssetsRoot), assetFilesBefore, "quality guard does not add or remove thumbnail material assets");

assert.ok(componentSource.includes("ThumbnailQualityGuardPanel"), "Thumbnail Editor renders a compact quality guard panel");
assert.ok(componentSource.includes("getThumbnailQualityGuardItems"), "component uses the shared quality guard helper");
assert.ok(componentSource.includes("overallQualityGuardSummary"), "Thumbnail Editor keeps a short overall quality summary near export actions");
assert.ok(componentSource.includes("qualityGuardSummary"), "ExportPanel can receive the quality summary without growing into a diagnostics UI");
assert.ok(componentSource.includes("サムネ品質"), "quality guard is visible as thumbnail quality, not a generic paint tool");
assert.ok(componentSource.includes("プリセットを選んで、文字と立ち絵を差し替える"), "UI briefly explains the preset-completion workflow");
assert.ok(componentSource.includes("<TextControls"), "text layer editing route remains rendered");
assert.ok(componentSource.includes("<StandeePlacementPanel"), "image layer standee placement route remains rendered");
assert.ok(!componentSource.includes("自動修正"), "quality guard does not promise automatic correction");
for (const misleadingCopy of ["ペイント", "Canva的", "Canva風", "汎用制作", "一括配置", "自動分割", "複数選択"]) {
  assert.equal(componentSource.includes(misleadingCopy), false, `quality guard UI does not imply unsupported ${misleadingCopy} behavior`);
}

console.log("thumbnail quality guard contract checks passed");
