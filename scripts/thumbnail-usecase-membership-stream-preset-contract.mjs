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
const expectedBackground = `${phase5BackgroundPrefix}membership-stream-background-v1.png`;
const expectedDecorationAssets = [
  "membership-stream-member-badge-v1.png",
  "membership-stream-lock-badge-v1.png",
  "membership-stream-premium-label-v1.png",
  "membership-stream-time-pill-v1.png",
  "membership-stream-note-panel-v1.png"
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

const preset = lib.thumbnailPresets.find((item) => item.id === "membership_stream");
assert.ok(preset, "membership_stream preset exists");
assert.equal(preset.name, "メン限配信", "membership_stream keeps the expected display name");
assert.equal(preset.category, "配信ジャンル", "membership_stream stays in the streaming category");
assert.equal(preset.usageLabel, "メン限 / members only", "membership_stream uses the scoped usage label");

const background = preset.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
assert.ok(background, "membership_stream has a background image layer");
assert.equal(background.src, expectedBackground, "membership_stream uses the generated production background");
assert.equal(background.locked, true, "membership_stream background is locked by default");
const backgroundPath = path.join(root, "public", expectedBackground.replace(/^\//, ""));
assert.equal(fs.existsSync(backgroundPath), true, "membership_stream generated background exists");
assert.deepEqual(readPngSize(backgroundPath), { width: 1280, height: 720 }, "membership_stream background uses the app canvas size");
assert.ok(fs.statSync(backgroundPath).size < 2_500_000, "membership_stream background stays reasonably lightweight");

for (const assetSrc of expectedDecorationAssets) {
  assert.ok(
    preset.layers.some((layer) => layer.type === "image" && layer.src === assetSrc),
    `membership_stream uses generated decoration asset ${path.basename(assetSrc)}`
  );
  const assetPath = path.join(root, "public", assetSrc.replace(/^\//, ""));
  assert.equal(fs.existsSync(assetPath), true, `${path.basename(assetSrc)} exists`);
  const assetSize = readPngSize(assetPath);
  assert.ok(assetSize.width > 0 && assetSize.height > 0, `${path.basename(assetSrc)} has valid dimensions`);
  assert.ok(fs.statSync(assetPath).size < 2_500_000, `${path.basename(assetSrc)} stays reasonably lightweight`);
}

const expectedEditableText = new Map([
  ["見出し", "メン限配信"],
  ["英字", "MEMBERS ONLY"],
  ["時刻", "21:00 START"],
  ["補足", "限定アーカイブあり"],
  ["会員ラベル", "MEMBER PERK"],
  ["バッジ", "VIP"]
]);
for (const [roleName, text] of expectedEditableText) {
  const layer = preset.layers.find((item) => item.type === "text" && item.name.includes(roleName));
  assert.ok(layer, `membership_stream keeps editable ${roleName} text layer`);
  assert.equal(layer.text, text, `membership_stream initial ${roleName} text matches the scoped copy`);
}

for (const editableAssetName of ["メンバーバッジ", "ロックバッジ", "プレミアムラベル", "時刻ピル", "補足パネル"]) {
  assert.ok(
    preset.layers.some((layer) => layer.type === "image" && layer.name.includes(editableAssetName)),
    `membership_stream keeps ${editableAssetName} as a generated asset layer instead of baking it into the background`
  );
}

assert.equal(
  preset.layers.some((layer) => layer.type === "image" && layer.name.includes("限定CTA")),
  false,
  "membership_stream default does not keep the unused CTA panel layer after review placement"
);
assert.equal(
  preset.layers.some((layer) => layer.type === "text" && layer.name.includes("CTA")),
  false,
  "membership_stream default does not keep unused CTA text after review placement"
);

const expectedLayerGeometry = new Map([
  ["画像 3（ロックバッジ）", { x: 497.1820401312275, y: -1.503560528992864, width: 342, height: 342 }],
  ["画像 4（プレミアムラベル）", { x: 29.83443961242088, y: 336.06307222787393, width: 575.7904173342488, height: 292.08748728382494 }],
  ["画像 5（時刻ピル）", { x: -10.813763637750867, y: 558.4374364191252, width: 390, height: 152 }],
  ["画像 7（補足パネル）", { x: 304.1782253757533, y: 566.5615462868769, width: 350, height: 118 }],
  ["図形 2（限定公開フレーム）", { x: 806.8757152666515, y: 166.43947100712103, width: 394, height: 438 }],
  ["図形 3（見出し下ライン）", { x: 80, y: 326, width: 500, height: 16 }],
  ["テキスト 5（英字）", { x: 99.74990463111317, y: 459.3774160732452, width: 430, height: 54 }],
  ["テキスト 2（時刻）", { x: 63.123521782253704, y: 613.3123092573753, width: 238, height: 46 }],
  ["テキスト 4（補足）", { x: 350.42832074464036, y: 614.3743641912513, width: 270, height: 34 }]
]);

for (const [layerName, geometry] of expectedLayerGeometry) {
  const layer = preset.layers.find((item) => item.name === layerName);
  assert.ok(layer, `membership_stream keeps adjusted layer ${layerName}`);
  assert.deepEqual(
    { x: layer.x, y: layer.y, width: layer.width, height: layer.height },
    geometry,
    `membership_stream keeps reviewed geometry for ${layerName}`
  );
}

assert.equal(
  preset.layers.filter((layer) => layer.type === "text").length >= expectedEditableText.size,
  true,
  "membership_stream keeps key copy editable instead of baking it into the image"
);
assert.equal(
  lib.thumbnailPresetBatchCandidates.some((candidate) => candidate.id === "membership_stream"),
  false,
  "membership_stream is not listed as a future preset-body candidate"
);

const draft = lib.createDraftFromPreset("membership_stream");
const normalized = lib.normalizeThumbnailDraft(draft);
assert.equal(
  normalized?.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  expectedBackground,
  "membership_stream background survives draft normalization"
);

console.log("thumbnail membership_stream usecase preset contract checks passed");
