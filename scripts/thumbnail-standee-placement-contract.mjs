import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
const componentSourcePath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
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

assert.ok(Array.isArray(lib.thumbnailStandeePlacementPresets), "standee placement presets are exported");
assert.equal(typeof lib.applyThumbnailStandeePlacementPreset, "function", "standee placement applier is exported");

const expectedPresetIds = [
  "solo-right-half",
  "solo-left-half",
  "solo-center-half",
  "solo-right-bust",
  "solo-center-face",
  "duo-left",
  "duo-right",
  "trio-left",
  "trio-center",
  "trio-right"
];

assert.deepEqual(
  lib.thumbnailStandeePlacementPresets.map((preset) => preset.id),
  expectedPresetIds,
  "standee placement presets stay compact and reviewable"
);
assert.ok(
  lib.thumbnailStandeePlacementPresets.every((preset) => preset.name.length <= 16 && preset.description.length >= 10),
  "standee placement presets have concise labels and useful descriptions"
);
const cropDependentPresets = lib.thumbnailStandeePlacementPresets.filter((preset) => ["solo-right-bust", "solo-center-face"].includes(preset.id));
assert.deepEqual(
  cropDependentPresets.map((preset) => preset.name),
  ["右 / バスト", "中央 / 顔寄り"],
  "crop-dependent standee presets keep their user-facing names"
);
assert.ok(
  cropDependentPresets.every((preset) => !preset.disabledReason),
  "crop-dependent standee presets are enabled after image crop support exists"
);

const draft = lib.createDraftFromPreset("stream_announce");
const imageLayer = lib.createImageLayer("data:image/png;base64,standee");
const textBefore = draft.layers.filter((layer) => layer.type === "text").map((layer) => ({ ...layer }));
const working = {
  ...draft,
  layers: [...draft.layers, imageLayer],
  selectedLayerId: imageLayer.id
};

const applied = lib.applyThumbnailStandeePlacementPreset(working, "solo-right-half");
assert.ok(applied, "selected standee image receives a placement preset");
const movedLayer = applied.layers.find((layer) => layer.id === imageLayer.id);
assert.deepEqual(
  {
    x: movedLayer.x,
    y: movedLayer.y,
    width: movedLayer.width,
    height: movedLayer.height,
    rotation: movedLayer.rotation
  },
  { x: 790, y: 70, width: 390, height: 610, rotation: 0 },
  "right half-body placement uses the expected 16:9 slot"
);
assert.equal(applied.selectedLayerId, imageLayer.id, "standee placement keeps the selected layer active");
assert.deepEqual(
  applied.layers.filter((layer) => layer.type === "text").map((layer) => ({ ...layer })),
  textBefore,
  "standee placement does not rewrite editable text layers"
);
assert.equal(applied.version, 1, "standee placement keeps the existing draft schema version");
assert.equal(applied.presetId, working.presetId, "standee placement keeps the current thumbnail preset");

const bustApplied = lib.applyThumbnailStandeePlacementPreset(working, "solo-right-bust");
assert.ok(bustApplied, "bust-up placement is available after crop support exists");
const bustLayer = bustApplied.layers.find((layer) => layer.id === imageLayer.id);
assert.deepEqual(
  {
    x: bustLayer.x,
    y: bustLayer.y,
    width: bustLayer.width,
    height: bustLayer.height,
    rotation: bustLayer.rotation,
    crop: bustLayer.crop
  },
  {
    x: 730,
    y: 110,
    width: 470,
    height: 560,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 0.5 }
  },
  "bust-up placement crops to the upper half of the standee image"
);

const faceApplied = lib.applyThumbnailStandeePlacementPreset(working, "solo-center-face");
assert.ok(faceApplied, "face-close placement is available after crop support exists");
const faceLayer = faceApplied.layers.find((layer) => layer.id === imageLayer.id);
assert.deepEqual(
  {
    x: faceLayer.x,
    y: faceLayer.y,
    width: faceLayer.width,
    height: faceLayer.height,
    rotation: faceLayer.rotation,
    crop: faceLayer.crop
  },
  {
    x: 390,
    y: 36,
    width: 500,
    height: 650,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 / 3 }
  },
  "face-close placement crops to the upper third of the standee image"
);

const normalizedBust = lib.normalizeThumbnailDraft(bustApplied);
assert.deepEqual(
  normalizedBust.layers.find((layer) => layer.id === imageLayer.id)?.crop,
  { x: 0, y: 0, width: 1, height: 0.5 },
  "standee crop metadata survives draft normalization"
);
assert.deepEqual(
  lib.getThumbnailImageCropSourceRect(bustLayer, { naturalWidth: 900, naturalHeight: 1800, width: 900, height: 1800 }),
  { x: 0, y: 0, width: 900, height: 900 },
  "draw helper converts bust-up crop metadata to the upper-half source rectangle"
);
assert.equal(
  lib.getThumbnailImageCropSourceRect(movedLayer, { naturalWidth: 900, naturalHeight: 1800, width: 900, height: 1800 }),
  null,
  "draw helper keeps crop-free image layers on the full source image"
);
assert.deepEqual(
  lib.cloneThumbnailLayer(bustLayer, applied.layers.map((layer) => layer.name)).crop,
  { x: 0, y: 0, width: 1, height: 0.5 },
  "duplicating a cropped image layer preserves crop metadata"
);
const normalizedLegacyDraft = lib.normalizeThumbnailDraft(working);
assert.equal(
  Object.hasOwn(normalizedLegacyDraft.layers.find((layer) => layer.id === imageLayer.id), "crop"),
  false,
  "existing v1 image layers without crop stay full-image layers"
);
const resetFullImage = lib.applyThumbnailStandeePlacementPreset(
  {
    ...working,
    layers: working.layers.map((layer) => (layer.id === imageLayer.id ? { ...layer, crop: { x: 0, y: 0, width: 1, height: 0.5 } } : layer))
  },
  "solo-right-half"
);
assert.equal(
  Object.hasOwn(resetFullImage.layers.find((layer) => layer.id === imageLayer.id), "crop"),
  false,
  "regular standee placements clear prior crop metadata and return to full-image display"
);

const fullHdDraft = lib.createDraftFromPreset("stream_announce", { width: 1920, height: 1080 });
const fullHdImage = lib.createImageLayer("data:image/png;base64,standee");
const fullHdApplied = lib.applyThumbnailStandeePlacementPreset(
  {
    ...fullHdDraft,
    layers: [...fullHdDraft.layers, fullHdImage],
    selectedLayerId: fullHdImage.id
  },
  "trio-center"
);
const fullHdMovedLayer = fullHdApplied.layers.find((layer) => layer.id === fullHdImage.id);
assert.deepEqual(
  { x: fullHdMovedLayer.x, y: fullHdMovedLayer.y, width: fullHdMovedLayer.width, height: fullHdMovedLayer.height },
  { x: 720, y: 165, width: 480, height: 825 },
  "standee placement scales from HD to Full HD without changing canvas modes"
);

const lockedImage = { ...imageLayer, id: "locked-image", locked: true };
assert.equal(
  lib.applyThumbnailStandeePlacementPreset({ ...draft, layers: [...draft.layers, lockedImage], selectedLayerId: lockedImage.id }, "solo-left-half"),
  null,
  "locked image layers are not moved by standee placement presets"
);
assert.equal(
  lib.applyThumbnailStandeePlacementPreset(working, "missing-preset"),
  null,
  "unknown standee placement preset ids are ignored"
);
assert.equal(
  lib.applyThumbnailStandeePlacementPreset(draft, "solo-right-half"),
  null,
  "standee placement requires a selected editable image layer"
);

assert.ok(componentSource.includes("StandeePlacementPanel"), "Thumbnail Editor renders the standee placement panel");
assert.ok(componentSource.includes("applyStandeePlacementPreset"), "component wires standee placement presets to draft updates");
assert.ok(componentSource.includes("立ち絵配置"), "standee placement UI is visible to users");

console.log("thumbnail standee placement contract checks passed");
