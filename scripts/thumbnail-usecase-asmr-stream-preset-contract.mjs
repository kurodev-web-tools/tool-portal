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

const expectedLayerGeometry = new Map([
  ["画像 2（サウンドリング）", { x: 446.6875715266651, y: 147.25127161749748, width: 382, height: 410 }],
  ["画像 3（低彩度ラベル）", { x: 17.373617151140536, y: 12.810783316378462, width: 430, height: 170 }],
  ["画像 4（マイクシルエット）", { x: 828.2485694666971, y: 323.45066124109866, width: 190.6634622720685, height: 300.1749745676501 }],
  ["画像 5（時刻ピル）", { x: 18.998855573357787, y: 580.3133265513734, width: 360, height: 147 }],
  ["画像 6（補足パネル）", { x: 397.50019073777366, y: 526.6246185147508, width: 760, height: 289 }],
  ["図形 2（見出し下ライン）", { x: 85.56176089112682, y: 430.0671414038657, width: 478, height: 16 }],
  ["図形 3（立ち絵挿入ガイド）", { x: 869.0634775310901, y: 119.43845371312307, width: 390, height: 540 }],
  ["テキスト 5（ラベル）", { x: 95.24856946669723, y: 86.06103763987791, width: 260, height: 38 }],
  ["テキスト 1（見出し）", { x: 69.81185626001371, y: 313.6297049847406, width: 600, height: 116 }],
  ["テキスト 3（英字）", { x: 91.12428473334853, y: 460.7548321464904, width: 450, height: 54 }],
  ["テキスト 2（時刻）", { x: 72.99885557335773, y: 632.3133265513732, width: 250, height: 48 }],
  ["テキスト 4（補足）", { x: 504.50019073777366, y: 648.563580874873, width: 536, height: 42 }]
]);

for (const [layerName, geometry] of expectedLayerGeometry) {
  const layer = preset.layers.find((item) => item.name === layerName);
  assert.ok(layer, `asmr_stream keeps reviewed layer ${layerName}`);
  assert.deepEqual(
    { x: layer.x, y: layer.y, width: layer.width, height: layer.height },
    geometry,
    `asmr_stream keeps reviewed geometry for ${layerName}`
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
