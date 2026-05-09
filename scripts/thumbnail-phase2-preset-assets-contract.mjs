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

const phase2Presets = new Map([
  ["collaboration", "/assets/images/thumbnail-editor/phase2/collaboration-background.png"]
]);

const mockupFiles = new Map([
  ["collaboration", "collaboration-mock.png"]
]);

for (const [presetId, expectedSrc] of phase2Presets) {
  const preset = lib.thumbnailPresets.find((item) => item.id === presetId);
  assert.ok(preset, `${presetId} preset exists`);

  const background = preset.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
  assert.ok(background, `${presetId} has a background image layer`);
  assert.equal(background.src, expectedSrc, `${presetId} uses the phase 2 background asset`);
  assert.equal(background.locked, true, `${presetId} background is locked by default`);

  const publicPath = path.join(root, "public", expectedSrc.replace(/^\//, ""));
  assert.equal(fs.existsSync(publicPath), true, `${presetId} background asset exists in public`);

  const mockupPath = path.join(root, "docs", "mockups", "thumbnail-editor-phase2-candidates", mockupFiles.get(presetId));
  assert.equal(fs.existsSync(mockupPath), true, `${presetId} finished mockup exists in docs/mockups`);

  const draft = lib.createDraftFromPreset(presetId);
  const normalized = lib.normalizeThumbnailDraft(draft);
  const normalizedBackground = normalized?.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
  assert.equal(normalizedBackground?.src, expectedSrc, `${presetId} asset src survives draft normalization`);

  for (const roleName of ["見出し", "時刻", "サブ", "ラベル"]) {
    assert.ok(
      preset.layers.some((layer) => layer.type === "text" && layer.name.includes(roleName)),
      `${presetId} keeps ${roleName} text handoff target`
    );
  }
}

const collaboration = lib.thumbnailPresets.find((item) => item.id === "collaboration");
assert.ok(
  collaboration.layers.some((layer) => layer.type === "shape" && layer.name.includes("左立ち絵")),
  "collaboration has a left standee guide shape"
);
assert.ok(
  collaboration.layers.some((layer) => layer.type === "shape" && layer.name.includes("右立ち絵")),
  "collaboration has a right standee guide shape"
);

console.log("thumbnail phase 2 preset asset contract checks passed");
