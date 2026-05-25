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

const backgroundPrefix = "/assets/images/thumbnail-editor/iriam-square/karaoke/backgrounds/";
const titlePrefix = "/assets/images/thumbnail-editor/iriam-square/dark-gacha/titles/";

assert.ok(
  lib.thumbnailPresets.some((preset) => preset.id === "dark_gacha"),
  "dark gacha is registered as a selectable preset body after title asset registration"
);
assert.deepEqual(
  lib.thumbnailPresetVariantRelations.dark_gacha,
  {
    presetId: "dark_gacha",
    familyId: "dark-gacha",
    defaultVariantId: "square-1-1",
    variantIds: ["square-1-1"]
  },
  "dark gacha is limited to the 1:1 IRIAM square variant"
);
assert.equal(
  lib.getThumbnailPresetVariant("dark_gacha", "landscape-16-9"),
  null,
  "dark gacha does not create a 16:9 body in this slice"
);

const squareDraft = lib.createDraftFromPresetVariant("dark_gacha", "square-1-1");
assert.deepEqual(squareDraft.canvas, { width: 1080, height: 1080 }, "dark gacha square draft uses the IRIAM canvas");
assert.equal(squareDraft.presetId, "dark_gacha", "dark gacha square keeps its dedicated preset id");
assert.equal(Object.hasOwn(squareDraft, "variantId"), false, "dark gacha square does not add draft schema fields");

const imageLayers = squareDraft.layers.filter((layer) => layer.type === "image");
assert.deepEqual(
  imageLayers.map((layer) => layer.name),
  ["画像 1（背景）", "画像 2（タイトル 闇ガチャ）"],
  "dark gacha square keeps image layers to the background and fixed transparent title"
);

const backgroundLayer = imageLayers.find((layer) => layer.name.includes("背景"));
assert.ok(backgroundLayer, "dark gacha square has a background image layer");
assert.equal(
  backgroundLayer.src,
  `${backgroundPrefix}karaoke-square-dark-cute-purple-v1.png`,
  "dark gacha square uses the adopted dark_cute purple background"
);
assert.equal(backgroundLayer.locked, true, "dark gacha square background is locked");
assert.equal(backgroundLayer.width, 1080, "dark gacha square background fills the canvas width");
assert.equal(backgroundLayer.height, 1080, "dark gacha square background fills the canvas height");

const titleLayer = imageLayers.find((layer) => layer.name.includes("タイトル"));
assert.ok(titleLayer, "dark gacha square has a title image layer");
assert.equal(
  titleLayer.src,
  `${titlePrefix}dark-gacha-square-title-purple-v1.png`,
  "dark gacha square uses the matching New Tegomin transparent title image"
);
assert.equal(titleLayer.x, -246.87378115188247, "dark gacha square title image uses the adjusted x position");
assert.equal(titleLayer.y, 599.3330692685978, "dark gacha square title image uses the adjusted y position");
assert.equal(titleLayer.width, 1302.6268929693151, "dark gacha square title image uses the adjusted display width");
assert.equal(titleLayer.height, 553.0603199787986, "dark gacha square title image uses the adjusted display height");
assert.equal(titleLayer.rotation, 21.60856614090952, "dark gacha square title image uses the adjusted rotation");

assert.equal(
  squareDraft.layers.some((layer) => layer.type === "text" && layer.text === "闇ガチャ"),
  false,
  "dark gacha square does not duplicate the fixed title image as editable text"
);
const textLayers = squareDraft.layers.filter((layer) => layer.type === "text");
assert.deepEqual(
  textLayers.map((layer) => layer.name),
  ["テキスト 2（時刻）", "テキスト 3（サブ）"],
  "dark gacha square keeps only the time and sub editable text by default"
);
assert.deepEqual(
  textLayers.map((layer) => ({
    name: layer.name,
    text: layer.text,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize
  })),
  [
    {
      name: "テキスト 2（時刻）",
      text: "20:00 START",
      x: 758.5539175334877,
      y: 1008.1420339744074,
      width: 308,
      height: 58,
      fontFamily: "New Tegomin",
      fontSize: 52
    },
    {
      name: "テキスト 3（サブ）",
      text: "単発も10連も歓迎",
      x: 682.0713911546809,
      y: 947.4498241412856,
      width: 486,
      height: 50,
      fontFamily: "New Tegomin",
      fontSize: 34
    }
  ],
  "dark gacha square text layers use the final QA positions"
);
const standeeGuide = squareDraft.layers.find((layer) => layer.type === "shape" && layer.name.includes("立ち絵挿入ガイド"));
assert.ok(standeeGuide, "dark gacha square keeps a standee placement guide");
assert.deepEqual(
  { x: standeeGuide.x, y: standeeGuide.y, width: standeeGuide.width, height: standeeGuide.height },
  { x: 440.281074608995, y: 98.75536930330026, width: 360, height: 628 },
  "dark gacha square standee guide uses the final QA position"
);
const badgeShapes = squareDraft.layers.filter((layer) => layer.type === "shape" && layer.name.includes("時刻バッジ土台"));
assert.deepEqual(
  badgeShapes.map((layer) => ({ name: layer.name, x: layer.x, y: layer.y, width: layer.width, height: layer.height })),
  [
    {
      name: "図形 3（時刻バッジ土台）",
      x: 754.6718551223528,
      y: 1005.1874579061588,
      width: 320.6944548379854,
      height: 61.98877497567915
    },
    {
      name: "図形 3（時刻バッジ土台） コピー",
      x: 773.4993639152884,
      y: 935.5219636309212,
      width: 301.72865374541647,
      height: 61.988774975679064
    }
  ],
  "dark gacha square badge shapes use the final QA positions"
);

const normalized = lib.normalizeThumbnailDraft(squareDraft);
assert.ok(normalized, "dark gacha square draft normalizes");
assert.deepEqual(normalized.canvas, { width: 1080, height: 1080 }, "dark gacha square canvas survives normalization");
assert.equal(
  normalized.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}dark-gacha-square-title-purple-v1.png`,
  "dark gacha square title image survives normalization"
);

const configuredDraft = lib.createDarkGachaIriamSquareDraft({
  backgroundColorway: "blue",
  titleColorway: "yellow"
});
assert.deepEqual(configuredDraft.canvas, { width: 1080, height: 1080 }, "configured dark gacha square draft keeps the IRIAM canvas");
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  `${backgroundPrefix}karaoke-square-dark-cute-blue-v1.png`,
  "configured dark gacha square draft keeps dark_cute fixed while changing the background colorway"
);
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}dark-gacha-square-title-yellow-v1.png`,
  "configured dark gacha square draft can choose a title colorway independently from the background"
);
const matchedTitleDraft = lib.createDarkGachaIriamSquareDraft({
  backgroundColorway: "mint",
  titleColorway: "match-background"
});
assert.equal(
  matchedTitleDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}dark-gacha-square-title-mint-v1.png`,
  "dark gacha match-background title selection follows the chosen background colorway"
);

const karaokeSquareDraft = lib.createDraftFromPresetVariant("karaoke", "square-1-1");
assert.equal(karaokeSquareDraft.presetId, "karaoke", "karaoke square preset remains the existing square default");
assert.equal(
  karaokeSquareDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  "/assets/images/thumbnail-editor/iriam-square/karaoke/titles/karaoke-square-title-pink-blue-v1.png",
  "karaoke square title remains unchanged"
);

assert.equal(
  componentSource.includes('variantId === "square-1-1" ? presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting" || presetId === "first_stream" || presetId === "endurance_stream" : presetId !== "dark_gacha"'),
  true,
  "preset list exposes karaoke, dark gacha, chatting, first_stream, and endurance_stream while the square variant is active"
);
assert.equal(
  componentSource.includes('createDraftFromPresetVariant(presetId, currentVariantId, locale)'),
  true,
  "square preset application uses the variant body instead of scaling a 16:9 preset"
);
assert.equal(
  componentSource.includes('presetId === "karaoke" || presetId === "dark_gacha"'),
  true,
  "square preset cards open the settings modal for karaoke and dark gacha"
);
assert.equal(
  componentSource.includes("createDarkGachaIriamSquareDraft(config, locale)"),
  true,
  "dark gacha settings modal applies the configured square draft"
);
assert.equal(
  componentSource.includes('presetId === "dark_gacha" ? "dark_cute"'),
  true,
  "dark gacha settings modal keeps the background style fixed to dark_cute"
);
assert.equal(
  componentSource.includes('data-thumbnail-iriam-square-modal-preset={presetId}'),
  true,
  "square settings modal exposes the active preset for UI verification"
);

console.log("thumbnail iriam dark gacha square preset contract checks passed");
