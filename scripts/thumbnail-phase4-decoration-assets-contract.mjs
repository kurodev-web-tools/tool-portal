import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
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
const lib = testModule.exports;

const decorationPrefix = "/assets/images/thumbnail-editor/decorations/phase4/";
const expectedDecorationFiles = [
  "soft-light-particles.svg",
  "sparkle-small.svg",
  "clip-focus-rays.svg",
  "clip-speed-lines.svg",
  "arrow-accent.svg",
  "x-corner-ornaments.svg",
  "dot-dash-row.svg"
];
const phase4PresetIds = ["chatting", "clip", "x_announcement"];

for (const fileName of expectedDecorationFiles) {
  const filePath = path.join(root, "public", "assets", "images", "thumbnail-editor", "decorations", "phase4", fileName);
  assert.equal(fs.existsSync(filePath), true, `${fileName} decoration asset exists`);
  assert.ok(fs.statSync(filePath).size < 16_000, `${fileName} stays lightweight`);

  const svg = fs.readFileSync(filePath, "utf8");
  assert.match(svg, /<svg\b/, `${fileName} is an SVG`);
  assert.doesNotMatch(svg, /<text\b|font-family|<image\b|href=/i, `${fileName} has no embedded readable text, image refs, or external hrefs`);
}

for (const presetId of phase4PresetIds) {
  const preset = lib.thumbnailPresets.find((item) => item.id === presetId);
  assert.ok(preset, `${presetId} preset exists`);

  const decorationLayers = preset.layers.filter((layer) => layer.type === "image" && layer.src.startsWith(decorationPrefix));
  assert.ok(decorationLayers.length >= 2, `${presetId} uses initial phase 4 decoration image layers`);

  for (const layer of decorationLayers) {
    const filePath = path.join(root, "public", layer.src.replace(/^\//, ""));
    assert.equal(fs.existsSync(filePath), true, `${presetId} decoration layer asset exists: ${layer.src}`);
  }
}

const allShapeTypes = new Set(lib.thumbnailPresets.flatMap((preset) => preset.layers.filter((layer) => layer.type === "shape").map((layer) => layer.shapeType)));
for (const shapeType of ["line", "burst", "frame", "polygon"]) {
  assert.equal(allShapeTypes.has(shapeType), true, `${shapeType} shapeType is used by preset initial layers`);
  assert.equal(typeof lib.thumbnailShapeTypeLabels[shapeType], "string", `${shapeType} has a shape label`);
}

const clipDraft = lib.createDraftFromPreset("clip");
const normalized = lib.normalizeThumbnailDraft(clipDraft);
assert.ok(normalized?.layers.some((layer) => layer.type === "shape" && layer.shapeType === "burst"), "burst shape survives draft normalization");
assert.ok(normalized?.layers.some((layer) => layer.type === "shape" && layer.shapeType === "polygon"), "polygon shape survives draft normalization");

console.log("thumbnail phase 4 decoration asset contract checks passed");
