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

assert.equal(typeof lib.getThumbnailMainTextCarryover, "function", "main text carryover extractor exists");
assert.equal(typeof lib.applyThumbnailMainTextCarryover, "function", "main text carryover applier exists");
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

const canvasSizeChangeBody = componentSource.match(/const changeCanvasSize = \(sizeId: ThumbnailCanvasSizeId\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
assert.ok(canvasSizeChangeBody.length > 0, "canvas size change handler exists");
assert.ok(
  canvasSizeChangeBody.includes("applyThumbnailMainTextCarryover(next, getThumbnailMainTextCarryover(draft))"),
  "canvas size changes preserve manually edited main text when no schedule handoff is active"
);

console.log("thumbnail-preset-apply-safety contract checks passed");
