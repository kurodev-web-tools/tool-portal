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
assert.ok(componentSource.includes("サムネ品質"), "quality guard is visible as thumbnail quality, not a generic paint tool");
assert.ok(componentSource.includes("プリセットを選んで、文字と立ち絵を差し替える"), "UI briefly explains the preset-completion workflow");
assert.ok(componentSource.includes("<TextControls"), "text layer editing route remains rendered");
assert.ok(componentSource.includes("<StandeePlacementPanel"), "image layer standee placement route remains rendered");
assert.ok(!componentSource.includes("自動修正"), "quality guard does not promise automatic correction");
for (const misleadingCopy of ["ペイント", "Canva的", "Canva風", "汎用制作", "一括配置", "自動分割", "複数選択"]) {
  assert.equal(componentSource.includes(misleadingCopy), false, `quality guard UI does not imply unsupported ${misleadingCopy} behavior`);
}

console.log("thumbnail quality guard contract checks passed");
