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
const comparableLayer = (layer) => {
  const { id: _id, ...rest } = layer;
  return rest;
};

assert.equal(typeof lib.getThumbnailMainTextCarryover, "function", "main text carryover extractor exists");
assert.equal(typeof lib.applyThumbnailMainTextCarryover, "function", "main text carryover applier exists");
assert.equal(typeof lib.applyThumbnailPresetPartial, "function", "partial preset apply helper exists");
assert.equal(typeof lib.isThumbnailDraftPristineForPreset, "function", "pristine preset draft detector exists");

const pristine = lib.createDraftFromPreset("stream_announce");
assert.equal(lib.isThumbnailDraftPristineForPreset(pristine), true, "new preset draft is pristine");
assert.equal(
  lib.isThumbnailDraftPristineForPreset({
    ...pristine,
    selectedLayerId: pristine.layers[0].id,
    updatedAt: "2099-01-01T00:00:00.000Z",
    layers: pristine.layers.map((layer) => ({ ...layer, id: `${layer.id}-changed` }))
  }),
  true,
  "detector ignores generated ids, selection, and timestamps"
);
assert.equal(
  lib.isThumbnailDraftPristineForPreset({
    ...pristine,
    layers: pristine.layers.map((layer) =>
      layer.type === "text" && layer.name.includes("見出し") ? { ...layer, text: "手動編集済み" } : layer
    )
  }),
  false,
  "detector treats changed text as edited"
);
assert.equal(
  lib.isThumbnailDraftPristineForPreset({
    ...pristine,
    layers: [...pristine.layers, lib.createTextLayer()]
  }),
  false,
  "detector treats added layers as edited"
);

const current = lib.createDraftFromPreset("stream_announce");
const editedLayers = current.layers.map((layer) => {
  if (layer.type !== "text") {
    return layer;
  }
  if (layer.name.includes("見出し")) {
    return { ...layer, text: "手動で直した見出し" };
  }
  if (layer.name.includes("時刻")) {
    return { ...layer, text: "5/5 22:00" };
  }
  if (layer.name.includes("サブ")) {
    return { ...layer, text: "手動サブコピー" };
  }
  if (layer.name.includes("ラベル")) {
    return { ...layer, text: "手動ラベル" };
  }
  return layer;
});
const edited = { ...current, layers: editedLayers };
const carryover = lib.getThumbnailMainTextCarryover(edited);
const materialIdsBeforePartialApply = JSON.stringify(lib.thumbnailMaterialLibrary.map((material) => material.id));

assert.deepEqual(
  carryover,
  {
    headline: "手動で直した見出し",
    time: "5/5 22:00",
    sub: "手動サブコピー",
    label: "手動ラベル"
  },
  "carryover extracts only named main text roles"
);

const target = lib.createDraftFromPreset("karaoke");
const applied = lib.applyThumbnailMainTextCarryover(target, carryover);

assert.equal(
  applied.layers.find((layer) => layer.type === "text" && layer.name.includes("見出し")).text,
  "手動で直した見出し",
  "headline text is carried into the target preset"
);
assert.equal(
  applied.layers.find((layer) => layer.type === "text" && layer.name.includes("時刻")).text,
  "5/5 22:00",
  "time text is carried into the target preset"
);
assert.equal(
  applied.layers.find((layer) => layer.type === "text" && layer.name.includes("サブ")).text,
  "手動サブコピー",
  "sub text is carried into the target preset"
);
assert.equal(
  applied.layers.find((layer) => layer.type === "text" && layer.name.includes("ラベル")).text,
  "手動ラベル",
  "label text is carried into the target preset"
);
assert.equal(applied.presetId, "karaoke", "target preset id is preserved");
assert.ok(
  applied.layers.some((layer) => layer.type === "shape" && layer.name.includes("ラベル")),
  "shape layers that include role words are not treated as text carryover targets"
);
assert.equal(
  lib.applyThumbnailMainTextCarryover(target, { headline: "見出しだけ" }).layers.find(
    (layer) => layer.type === "text" && layer.name.includes("時刻")
  ).text,
  target.layers.find((layer) => layer.type === "text" && layer.name.includes("時刻")).text,
  "missing carryover roles leave target preset text unchanged"
);

const editedWithUserStandee = {
  ...edited,
  selectedLayerId: "user-standee",
  layers: [
    ...edited.layers,
    {
      ...lib.createImageLayer("data:image/png;base64,user-standee"),
      id: "user-standee",
      name: "アップロード立ち絵",
      x: 760,
      y: 44,
      width: 430,
      height: 650,
      crop: { x: 0, y: 0, width: 1, height: 0.5 }
    }
  ]
};
const partiallyApplied = lib.applyThumbnailPresetPartial(editedWithUserStandee, "karaoke");
const pristineKaraoke = lib.createDraftFromPreset("karaoke", edited.canvas);

assert.equal(partiallyApplied.version, editedWithUserStandee.version, "partial apply keeps draft schema version");
assert.deepEqual(partiallyApplied.canvas, editedWithUserStandee.canvas, "partial apply keeps the current canvas size");
assert.equal(partiallyApplied.presetId, "karaoke", "partial apply switches to the target preset id");
assert.equal(
  partiallyApplied.layers.find((layer) => layer.type === "text" && layer.name.includes("見出し")).text,
  "手動で直した見出し",
  "partial apply keeps edited headline text"
);
assert.equal(
  partiallyApplied.layers.find((layer) => layer.type === "text" && layer.name.includes("時刻")).text,
  "5/5 22:00",
  "partial apply keeps edited time text"
);
assert.deepEqual(
  partiallyApplied.layers.find((layer) => layer.id === "user-standee"),
  editedWithUserStandee.layers.find((layer) => layer.id === "user-standee"),
  "partial apply keeps user-added standee image layers including crop metadata"
);
assert.ok(
  partiallyApplied.layers.some((layer) => layer.type === "image" && layer.src === pristineKaraoke.layers.find((item) => item.type === "image").src),
  "partial apply uses target preset initial background and decoration image layers"
);
assert.equal(
  partiallyApplied.layers.filter((layer) => layer.id === "user-standee").length,
  1,
  "partial apply does not duplicate preserved user image layers"
);
assert.ok(
  partiallyApplied.layers.every((layer) => layer.type !== "image" || layer.src !== current.layers.find((item) => item.type === "image").src),
  "partial apply does not keep source preset initial image layers"
);
assert.deepEqual(
  Object.keys(partiallyApplied.layers.find((layer) => layer.id === "user-standee")).sort(),
  Object.keys(editedWithUserStandee.layers.find((layer) => layer.id === "user-standee")).sort(),
  "partial apply does not change image layer schema keys"
);
assert.equal(
  JSON.stringify(lib.thumbnailMaterialLibrary.map((material) => material.id)),
  materialIdsBeforePartialApply,
  "partial apply does not mutate material library registration"
);
assert.equal(
  lib.getThumbnailPresetVariant("karaoke", lib.getDefaultThumbnailPresetVariantRef("karaoke").variantId).id,
  "landscape-16-9",
  "partial apply keeps target preset default variant relation intact"
);

const pristinePartial = lib.applyThumbnailPresetPartial(lib.createDraftFromPreset("stream_announce"), "karaoke");
assert.equal(
  lib.isThumbnailDraftPristineForPreset(pristinePartial),
  true,
  "partial apply on a pristine draft produces a pristine target preset draft"
);
assert.deepEqual(
  pristinePartial.layers.map((layer) => comparableLayer(layer)),
  pristineKaraoke.layers.map((layer) => comparableLayer(layer)),
  "pristine draft apply does not carry source text or source user layers"
);

const canvasSizeChangeBody = componentSource.match(/const changeCanvasSize = \(sizeId: ThumbnailCanvasSizeId\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
assert.ok(canvasSizeChangeBody.length > 0, "canvas size change handler exists");
assert.ok(
  canvasSizeChangeBody.includes("applyThumbnailMainTextCarryover(next, getThumbnailMainTextCarryover(draft))"),
  "canvas size changes preserve manually edited main text when no schedule handoff is active"
);
assert.ok(
  componentSource.includes("applyThumbnailPresetPartial(draft, presetId)"),
  "edited preset changes use partial apply to preserve text and user standee/image layers"
);

console.log("thumbnail-preset-apply-safety contract checks passed");
