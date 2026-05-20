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
const expectedBackground = `${phase5BackgroundPrefix}goods-notice-background-v2.png`;
const expectedDecorationAssets = [
  "goods-notice-product-card-v1.png",
  "goods-notice-release-badge-v1.png",
  "goods-notice-price-badge-v1.png",
  "goods-notice-time-pill-v1.png",
  "goods-notice-cta-panel-v1.png",
  "goods-notice-note-panel-v1.png"
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

const preset = lib.thumbnailPresets.find((item) => item.id === "goods_notice");
assert.ok(preset, "goods_notice preset exists");
assert.equal(preset.name, "グッズ告知", "goods_notice keeps the expected display name");
assert.equal(preset.category, "告知画像", "goods_notice stays in the announcement category");
assert.equal(preset.usageLabel, "物販 / merch release", "goods_notice uses the scoped usage label");

const background = preset.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
assert.ok(background, "goods_notice has a background image layer");
assert.equal(background.src, expectedBackground, "goods_notice uses the generated production background");
assert.equal(background.locked, true, "goods_notice background is locked by default");
const backgroundPath = path.join(root, "public", expectedBackground.replace(/^\//, ""));
assert.equal(fs.existsSync(backgroundPath), true, "goods_notice generated background exists");
assert.deepEqual(readPngSize(backgroundPath), { width: 1280, height: 720 }, "goods_notice background uses the app canvas size");
assert.ok(fs.statSync(backgroundPath).size < 2_500_000, "goods_notice background stays reasonably lightweight");

for (const assetSrc of expectedDecorationAssets) {
  assert.ok(
    preset.layers.some((layer) => layer.type === "image" && layer.src === assetSrc),
    `goods_notice uses generated decoration asset ${path.basename(assetSrc)}`
  );
  const assetPath = path.join(root, "public", assetSrc.replace(/^\//, ""));
  assert.equal(fs.existsSync(assetPath), true, `${path.basename(assetSrc)} exists`);
  const assetSize = readPngSize(assetPath);
  assert.ok(assetSize.width > 0 && assetSize.height > 0, `${path.basename(assetSrc)} has valid dimensions`);
  assert.ok(fs.statSync(assetPath).size < 2_500_000, `${path.basename(assetSrc)} stays reasonably lightweight`);
}

const expectedEditableText = new Map([
  ["見出し", "新グッズ"],
  ["英字", "MERCH DROP"],
  ["時刻", "20:00 START"],
  ["CTA", "販売ページ公開"],
  ["補足", "数量限定アイテムあり!"],
  ["価格1", "¥1,800"],
  ["価格2", "¥800"],
  ["価格3", "¥1,200"],
  ["商品1", "ACRYLIC STAND"],
  ["商品2", "STICKER SET"],
  ["商品3", "DIGITAL GOODS"],
  ["発売バッジ", "NEW"]
]);
for (const [roleName, text] of expectedEditableText) {
  const layer = preset.layers.find((item) => item.type === "text" && item.name.includes(roleName));
  assert.ok(layer, `goods_notice keeps editable ${roleName} text layer`);
  assert.equal(layer.text, text, `goods_notice initial ${roleName} text matches the scoped copy`);
}

for (const editableAssetName of ["商品カード1", "商品カード2", "商品カード3", "価格バッジ", "発売バッジ", "時刻ピル", "販売CTA", "注意書きパネル"]) {
  assert.ok(
    preset.layers.some((layer) => layer.type === "image" && layer.name.includes(editableAssetName)),
    `goods_notice keeps ${editableAssetName} as a generated asset layer instead of baking it into the background`
  );
}

assert.equal(
  preset.layers.filter((layer) => layer.type === "text").length >= expectedEditableText.size,
  true,
  "goods_notice keeps key copy editable instead of baking it into the image"
);
assert.equal(
  lib.thumbnailPresetBatchCandidates.some((candidate) => candidate.id === "goods_notice"),
  false,
  "goods_notice is not listed as a future preset-body candidate"
);

const draft = lib.createDraftFromPreset("goods_notice");
const normalized = lib.normalizeThumbnailDraft(draft);
assert.equal(
  normalized?.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  expectedBackground,
  "goods_notice background survives draft normalization"
);

console.log("thumbnail goods_notice usecase preset contract checks passed");
