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

const phase3Presets = new Map([
  ["chatting", "/assets/images/thumbnail-editor/phase3/chatting-background.png"],
  ["x_announcement", "/assets/images/thumbnail-editor/phase3/x-announcement-background.png"]
]);

const mockupFiles = new Map([
  ["chatting", "chatting-mock.png"],
  ["x_announcement", "x-announcement-mock.png"]
]);

for (const [presetId, expectedSrc] of phase3Presets) {
  const preset = lib.thumbnailPresets.find((item) => item.id === presetId);
  assert.ok(preset, `${presetId} preset exists`);

  const background = preset.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
  assert.ok(background, `${presetId} has a background image layer`);
  assert.equal(background.src, expectedSrc, `${presetId} uses the phase 3 background asset`);
  assert.equal(background.locked, true, `${presetId} background is locked by default`);

  const publicPath = path.join(root, "public", expectedSrc.replace(/^\//, ""));
  assert.equal(fs.existsSync(publicPath), true, `${presetId} background asset exists in public`);

  const mockupPath = path.join(root, "docs", "mockups", "thumbnail-editor-phase3-candidates", mockupFiles.get(presetId));
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

const chatting = lib.thumbnailPresets.find((item) => item.id === "chatting");
assert.ok(
  chatting.layers.some((layer) => layer.type === "shape" && layer.name.includes("立ち絵挿入ガイド")),
  "chatting has an editable standee guide shape"
);

const xAnnouncement = lib.thumbnailPresets.find((item) => item.id === "x_announcement");
assert.ok(
  xAnnouncement.layers.some((layer) => layer.type === "image" && layer.src.endsWith("/decorations/phase4/x-post-card-base.svg")),
  "x_announcement keeps the post card as a dedicated phase 4 asset layer"
);
assert.ok(
  xAnnouncement.layers.some((layer) => layer.type === "shape" && layer.name.includes("立ち絵挿入ガイド")),
  "x_announcement has an editable standee guide shape"
);

console.log("thumbnail phase 3 preset asset contract checks passed");
