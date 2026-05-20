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

const phase5BackgroundPrefix = "/assets/images/thumbnail-editor/phase5/";
const phase5DecorationPrefix = "/assets/images/thumbnail-editor/decorations/phase5/";
const expectedBackground = `${phase5BackgroundPrefix}asmr-stream-background-v1.png`;
const expectedDecorationAssets = [
  "asmr-stream-mic-silhouette-v1.png",
  "asmr-stream-sound-ring-v1.png",
  "asmr-stream-soft-label-v1.png",
  "asmr-stream-time-pill-v1.png",
  "asmr-stream-note-panel-v1.png"
].map((fileName) => `${phase5DecorationPrefix}${fileName}`);
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const readPngSize = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.subarray(0, 8).equals(pngSignature), true, `${path.basename(filePath)} is a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

const preset = lib.thumbnailPresets.find((item) => item.id === "asmr_stream");
assert.ok(preset, "asmr_stream preset exists");
assert.equal(preset.name, "ASMR配信", "asmr_stream keeps the expected display name");
assert.equal(preset.category, "配信ジャンル", "asmr_stream stays in the streaming category");
assert.equal(preset.usageLabel, "ASMR / relax night", "asmr_stream uses the scoped usage label");

const background = preset.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
assert.ok(background, "asmr_stream has a background image layer");
assert.equal(background.src, expectedBackground, "asmr_stream uses the generated production background");
assert.equal(background.locked, true, "asmr_stream background is locked by default");
const backgroundPath = path.join(root, "public", expectedBackground.replace(/^\//, ""));
assert.equal(fs.existsSync(backgroundPath), true, "asmr_stream generated background exists");
assert.deepEqual(readPngSize(backgroundPath), { width: 1280, height: 720 }, "asmr_stream background uses the app canvas size");
assert.ok(fs.statSync(backgroundPath).size < 2_500_000, "asmr_stream background stays reasonably lightweight");

for (const assetSrc of expectedDecorationAssets) {
  assert.ok(
    preset.layers.some((layer) => layer.type === "image" && layer.src === assetSrc),
    `asmr_stream uses generated decoration asset ${path.basename(assetSrc)}`
  );
  const assetPath = path.join(root, "public", assetSrc.replace(/^\//, ""));
  assert.equal(fs.existsSync(assetPath), true, `${path.basename(assetSrc)} exists`);
  const assetSize = readPngSize(assetPath);
  assert.ok(assetSize.width > 0 && assetSize.height > 0, `${path.basename(assetSrc)} has valid dimensions`);
  assert.ok(fs.statSync(assetPath).size < 2_500_000, `${path.basename(assetSrc)} stays reasonably lightweight`);
}

const expectedEditableText = new Map([
  ["見出し", "ASMR配信"],
  ["英字", "RELAX NIGHT"],
  ["時刻", "23:00 START"],
  ["補足", "睡眠導入 / quiet talk"],
  ["ラベル", "SLEEP AID"]
]);
for (const [roleName, text] of expectedEditableText) {
  const layer = preset.layers.find((item) => item.type === "text" && item.name.includes(roleName));
  assert.ok(layer, `asmr_stream keeps editable ${roleName} text layer`);
  assert.equal(layer.text, text, `asmr_stream initial ${roleName} text matches the scoped copy`);
}

for (const editableAssetName of ["マイクシルエット", "サウンドリング", "低彩度ラベル", "時刻ピル", "補足パネル"]) {
  assert.ok(
    preset.layers.some((layer) => layer.type === "image" && layer.name.includes(editableAssetName)),
    `asmr_stream keeps ${editableAssetName} as a generated asset layer instead of baking it into the background`
  );
}

assert.equal(
  preset.layers.filter((layer) => layer.type === "text").length >= expectedEditableText.size,
  true,
  "asmr_stream keeps key copy editable instead of baking it into the image"
);
assert.equal(
  lib.thumbnailPresetBatchCandidates.some((candidate) => candidate.id === "asmr_stream"),
  false,
  "asmr_stream is not listed as a future preset-body candidate"
);

const draft = lib.createDraftFromPreset("asmr_stream");
const normalized = lib.normalizeThumbnailDraft(draft);
assert.equal(
  normalized?.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  expectedBackground,
  "asmr_stream background survives draft normalization"
);

console.log("thumbnail asmr_stream usecase preset contract checks passed");
