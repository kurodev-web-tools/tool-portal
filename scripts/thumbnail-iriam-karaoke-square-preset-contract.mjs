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
assert.equal(titleLayer.x, 323.79555489036886, "karaoke square title image uses the adjusted x position");
assert.equal(titleLayer.y, 644.8372371473471, "karaoke square title image uses the adjusted y position");
assert.equal(titleLayer.width, 991.2295143306144, "karaoke square title image uses the adjusted display width");
assert.equal(titleLayer.height, 468.41412856394516, "karaoke square title image uses the adjusted display height");

assert.deepEqual(
  squareDraft.layers.filter((layer) => layer.type === "image").map((layer) => layer.name),
  [
    "画像 1（背景）",
    "画像 4（ピンク音符）",
    "画像 5（金色音符）",
    "画像 2（タイトル 歌枠）",
    "画像 3（小粒きらめき）",
    "素材: 青雲ラベル",
    "素材: 青雲ラベル",
    "素材: 青雲ラベル",
    "素材: ミントきらきら"
  ],
  "karaoke square image layers match the final QA starter composition order"
);

const cloudLabelSrc = "/assets/images/thumbnail-editor/materials/iriam-square-label-base/iriam-square-label-cloud-blue-v1.png";
const cloudLabels = squareDraft.layers.filter((layer) => layer.type === "image" && layer.name === "素材: 青雲ラベル");
assert.equal(cloudLabels.length, 3, "karaoke square includes three existing blue cloud label material layers");
assert.deepEqual(
  cloudLabels.map((layer) => ({ src: layer.src, x: layer.x, y: layer.y, width: layer.width, height: layer.height })),
  [
    { src: cloudLabelSrc, x: 582.4475791364213, y: 184.48551971862605, width: 434.29716381052174, height: 304.02596722292895 },
    { src: cloudLabelSrc, x: 813.4855197186262, y: -0.9056349622090636, width: 304, height: 267 },
    { src: cloudLabelSrc, x: 841.0721394896357, y: 335.3062934969693, width: 304, height: 267 }
  ],
  "karaoke square blue cloud label material layers use the final QA positions"
);

const mintSparkle = squareDraft.layers.find((layer) => layer.type === "image" && layer.name === "素材: ミントきらきら");
assert.ok(mintSparkle, "karaoke square includes the existing mint sparkle material layer");
assert.deepEqual(
  { src: mintSparkle.src, x: mintSparkle.x, y: mintSparkle.y, width: mintSparkle.width, height: mintSparkle.height },
  {
    src: "/assets/images/thumbnail-editor/materials/iriam-square-accent/iriam-square-accent-sparkle-mint-v1.png",
    x: 885.7082990346481,
    y: 922.4275985931303,
    width: 244.83125046770948,
    height: 203.45132081119505
  },
  "karaoke square mint sparkle material layer uses the final QA position"
);

assert.equal(
  squareDraft.layers.some((layer) => layer.type === "text" && layer.text === "歌枠"),
  false,
  "karaoke square does not duplicate the genre title as editable text"
);
const textLayers = squareDraft.layers.filter((layer) => layer.type === "text");
assert.equal(textLayers.length, 1, "karaoke square keeps only the time text editable by default");
assert.deepEqual(
  {
    name: textLayers[0].name,
    text: textLayers[0].text,
    x: textLayers[0].x,
    y: textLayers[0].y,
    width: textLayers[0].width,
    height: textLayers[0].height,
    fontFamily: textLayers[0].fontFamily,
    fontSize: textLayers[0].fontSize,
    color: textLayers[0].color
  },
  {
    name: "テキスト 2（時刻）",
    text: "20:00 START",
    x: 639.0416822569782,
    y: 313.5107386066003,
    width: 330,
    height: 58,
    fontFamily: "Fredoka",
    fontSize: 54,
    color: "#7a3f86"
  },
  "karaoke square time text uses the final QA position"
);
const standeeGuide = squareDraft.layers.find((layer) => layer.type === "shape" && layer.name.includes("立ち絵挿入ガイド"));
assert.ok(standeeGuide, "karaoke square keeps a standee placement guide");
assert.deepEqual(
  { x: standeeGuide.x, y: standeeGuide.y, width: standeeGuide.width, height: standeeGuide.height },
  { x: 620, y: 352, width: 338, height: 620 },
  "karaoke square standee guide keeps the final QA position"
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
  componentSource.includes('isPresetSelectableForVariant(draft.presetId, variantId)'),
  true,
  "switching to square preserves square-capable presets and falls back to karaoke for unrelated 16:9 presets"
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
