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

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const readPngSize = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.subarray(0, 8).equals(pngSignature), true, `${path.basename(filePath)} is a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

const expectedBackgroundFiles = [
  "karaoke-square-soft-cloud-pink-blue-v1.png",
  "karaoke-square-soft-cloud-blue-v1.png",
  "karaoke-square-soft-cloud-yellow-v1.png",
  "karaoke-square-soft-cloud-purple-v1.png",
  "karaoke-square-soft-cloud-mint-v1.png",
  "karaoke-square-pop-bubble-pink-blue-v1.png",
  "karaoke-square-pop-bubble-blue-v1.png",
  "karaoke-square-pop-bubble-yellow-v1.png",
  "karaoke-square-pop-bubble-purple-v1.png",
  "karaoke-square-pop-bubble-mint-v1.png",
  "karaoke-square-dark-cute-pink-blue-v1.png",
  "karaoke-square-dark-cute-blue-v1.png",
  "karaoke-square-dark-cute-yellow-v1.png",
  "karaoke-square-dark-cute-purple-v1.png",
  "karaoke-square-dark-cute-mint-v1.png"
];
const expectedTitleFiles = [
  "karaoke-square-title-pink-blue-v1.png",
  "karaoke-square-title-blue-v1.png",
  "karaoke-square-title-yellow-v1.png",
  "karaoke-square-title-purple-v1.png",
  "karaoke-square-title-mint-v1.png"
];

const backgroundPrefix = "/assets/images/thumbnail-editor/iriam-square/karaoke/backgrounds/";
const titlePrefix = "/assets/images/thumbnail-editor/iriam-square/karaoke/titles/";

assert.ok(Array.isArray(lib.thumbnailIriamSquareKaraokeBackgroundAssets), "karaoke square background asset metadata is exported");
assert.ok(Array.isArray(lib.thumbnailIriamSquareKaraokeTitleAssets), "karaoke square title asset metadata is exported");
assert.deepEqual(
  lib.thumbnailIriamSquareKaraokeBackgroundAssets.map((asset) => path.basename(asset.src)),
  expectedBackgroundFiles,
  "karaoke square registers the adopted 3 styles x 5 colorways background set"
);
assert.deepEqual(
  lib.thumbnailIriamSquareKaraokeTitleAssets.map((asset) => path.basename(asset.src)),
  expectedTitleFiles,
  "karaoke square registers the adopted Mochiy Pop P One title colorways"
);

for (const fileName of expectedBackgroundFiles) {
  const assetPath = path.join(root, "public", backgroundPrefix, fileName);
  assert.equal(fs.existsSync(assetPath), true, `${fileName} production background exists`);
  assert.deepEqual(readPngSize(assetPath), { width: 1080, height: 1080 }, `${fileName} uses IRIAM square size`);
  assert.ok(fs.statSync(assetPath).size < 2_400_000, `${fileName} stays reasonably lightweight`);
}

for (const fileName of expectedTitleFiles) {
  const assetPath = path.join(root, "public", titlePrefix, fileName);
  assert.equal(fs.existsSync(assetPath), true, `${fileName} production title image exists`);
  assert.deepEqual(readPngSize(assetPath), { width: 760, height: 320 }, `${fileName} keeps the title image layer size`);
  assert.ok(fs.statSync(assetPath).size < 140_000, `${fileName} stays reasonably lightweight`);
}

const landscapeDraft = lib.createDraftFromPresetVariant("karaoke", "landscape-16-9");
const landscapeBackground = landscapeDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
assert.equal(landscapeDraft.canvas.width, 1280, "karaoke landscape width is unchanged");
assert.equal(landscapeDraft.canvas.height, 720, "karaoke landscape height is unchanged");
assert.equal(
  landscapeBackground?.src,
  "/assets/images/thumbnail-editor/phase5/karaoke-background-v1.png",
  "karaoke landscape keeps the existing phase5 background"
);

const squareDraft = lib.createDraftFromPresetVariant("karaoke", "square-1-1");
assert.deepEqual(squareDraft.canvas, { width: 1080, height: 1080 }, "karaoke square draft uses the IRIAM canvas");
assert.equal(squareDraft.presetId, "karaoke", "karaoke square keeps the existing preset id");
assert.equal(Object.hasOwn(squareDraft, "variantId"), false, "karaoke square does not add draft schema fields");

const squareBackground = squareDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
assert.ok(squareBackground, "karaoke square has a background image layer");
assert.equal(squareBackground.src, `${backgroundPrefix}karaoke-square-soft-cloud-pink-blue-v1.png`, "karaoke square uses soft_cloud pink-blue as the default background");
assert.equal(squareBackground.locked, true, "karaoke square background is locked");
assert.equal(squareBackground.width, 1080, "karaoke square background fills the canvas width");
assert.equal(squareBackground.height, 1080, "karaoke square background fills the canvas height");

const titleLayer = squareDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"));
assert.ok(titleLayer, "karaoke square has a title image layer");
assert.equal(titleLayer.src, `${titlePrefix}karaoke-square-title-pink-blue-v1.png`, "karaoke square uses the adopted Mochiy title image");
assert.equal(titleLayer.width, 760, "karaoke square title image keeps its source width");
assert.equal(titleLayer.height, 320, "karaoke square title image keeps its source height");

assert.equal(
  squareDraft.layers.some((layer) => layer.type === "text" && layer.text === "歌枠"),
  false,
  "karaoke square does not duplicate the genre title as editable text"
);
for (const roleName of ["見出し", "時刻", "サブ", "ラベル"]) {
  assert.ok(
    squareDraft.layers.some((layer) => layer.type === "text" && layer.name.includes(roleName)),
    `karaoke square keeps editable ${roleName} text`
  );
}
assert.ok(
  squareDraft.layers.some((layer) => layer.type === "shape" && layer.name.includes("立ち絵挿入ガイド")),
  "karaoke square keeps a standee placement guide"
);

const normalized = lib.normalizeThumbnailDraft(squareDraft);
assert.ok(normalized, "karaoke square draft normalizes");
assert.deepEqual(normalized.canvas, { width: 1080, height: 1080 }, "karaoke square canvas survives normalization");
assert.equal(
  normalized.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}karaoke-square-title-pink-blue-v1.png`,
  "karaoke square title image survives normalization"
);

const configuredDraft = lib.createKaraokeIriamSquareDraft({
  backgroundStyle: "dark_cute",
  backgroundColorway: "blue",
  titleColorway: "purple"
});
assert.deepEqual(configuredDraft.canvas, { width: 1080, height: 1080 }, "configured karaoke square draft keeps the 1:1 IRIAM canvas");
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  `${backgroundPrefix}karaoke-square-dark-cute-blue-v1.png`,
  "configured karaoke square draft uses the selected background style and colorway"
);
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}karaoke-square-title-purple-v1.png`,
  "configured karaoke square draft can choose a title colorway independently from the background"
);
const matchedTitleDraft = lib.createKaraokeIriamSquareDraft({
  backgroundStyle: "pop_bubble",
  backgroundColorway: "mint",
  titleColorway: "match-background"
});
assert.equal(
  matchedTitleDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}karaoke-square-title-mint-v1.png`,
  "match-background title selection follows the chosen background colorway"
);

assert.equal(
  componentSource.includes('const disabled = !["landscape-16-9", "square-1-1"].includes(variant.id)'),
  true,
  "variant selector enables landscape and square while leaving portrait disabled for now"
);
assert.equal(
  componentSource.includes('"square-1-1"'),
  true,
  "variant selector leaves square 1:1 selectable for the karaoke IRIAM check"
);
assert.equal(
  componentSource.includes('disabled: variant.aspectRatio !== "16:9"'),
  false,
  "variant selector no longer disables every non-16:9 ratio"
);
assert.equal(
  componentSource.includes('className="block aspect-video max-w-none touch-none rounded-base border border-border bg-[#081117] shadow-lg"'),
  false,
  "editor canvas preview is not forced to 16:9 when the square variant is active"
);
assert.equal(
  componentSource.includes('className="relative aspect-video w-full max-w-[min(100%,calc((100vh-8rem)*16/9))]"'),
  false,
  "mobile full preview frame is not forced to 16:9 when the square variant is active"
);
assert.equal(
  componentSource.includes('height: `${draft.canvas.height * zoom}px`'),
  true,
  "editor canvas preview sets visual height from the active draft canvas"
);
assert.equal(
  componentSource.includes('const targetPresetId = variantId === "square-1-1" ? "karaoke" : draft.presetId'),
  true,
  "switching to square routes to the karaoke IRIAM preset body instead of scaling unrelated 16:9 presets"
);
assert.equal(
  componentSource.includes('currentVariantId === "square-1-1" && preset.id !== "karaoke"'),
  false,
  "square variant removes non-karaoke presets from lists instead of rendering disabled 16:9 cards"
);
assert.equal(
  componentSource.includes("getThumbnailPresetsForVariant"),
  true,
  "preset lists are derived from the active variant support instead of raw thumbnailPresets"
);
assert.equal(
  componentSource.includes("data-thumbnail-iriam-square-modal"),
  true,
  "karaoke square preset opens a dedicated settings modal"
);
assert.equal(
  componentSource.includes("titleColorway: \"match-background\""),
  true,
  "karaoke square modal defaults title color to background matching"
);

console.log("thumbnail iriam karaoke square preset contract checks passed");
