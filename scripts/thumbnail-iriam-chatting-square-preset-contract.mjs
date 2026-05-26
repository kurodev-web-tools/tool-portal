import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
const componentSourcePath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const copySourcePath = path.join(root, "lib", "thumbnail-editor-copy.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const componentSource = fs.readFileSync(componentSourcePath, "utf8");
const copySource = fs.readFileSync(copySourcePath, "utf8");
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
const titlePrefix = "/assets/images/thumbnail-editor/iriam-square/chatting/titles/";

assert.ok(
  lib.thumbnailPresets.some((preset) => preset.id === "chatting"),
  "chatting remains registered as a selectable preset"
);
assert.deepEqual(
  lib.thumbnailPresetVariantRelations.chatting,
  {
    presetId: "chatting",
    familyId: "chatting",
    defaultVariantId: "landscape-16-9",
    variantIds: ["landscape-16-9", "portrait-9-16", "square-1-1"]
  },
  "chatting keeps its existing preset relation while gaining a dedicated square body"
);

const landscapeDraft = lib.createDraftFromPresetVariant("chatting", "landscape-16-9");
assert.deepEqual(landscapeDraft.canvas, { width: 1280, height: 720 }, "chatting landscape draft is unchanged");
assert.equal(
  landscapeDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  "/assets/images/thumbnail-editor/phase5/chatting-background-v1.png",
  "chatting landscape keeps the existing phase5 background"
);

const squareDraft = lib.createDraftFromPresetVariant("chatting", "square-1-1");
assert.deepEqual(squareDraft.canvas, { width: 1080, height: 1080 }, "chatting square draft uses the IRIAM canvas");
assert.equal(squareDraft.presetId, "chatting", "chatting square keeps the existing preset id");
assert.equal(Object.hasOwn(squareDraft, "variantId"), false, "chatting square does not add draft schema fields");

const imageLayers = squareDraft.layers.filter((layer) => layer.type === "image");
assert.deepEqual(
  imageLayers.map((layer) => layer.name),
  ["画像 1（背景）", "画像 2（タイトル 雑談）"],
  "chatting square keeps image layers to the fixed background and transparent title"
);

const backgroundLayer = imageLayers.find((layer) => layer.name.includes("背景"));
assert.ok(backgroundLayer, "chatting square has a background image layer");
assert.equal(
  backgroundLayer.src,
  `${backgroundPrefix}karaoke-square-pop-bubble-pink-blue-v1.png`,
  "chatting square defaults to the adopted pop_bubble pink-blue background"
);
assert.equal(backgroundLayer.locked, true, "chatting square background is locked");
assert.equal(backgroundLayer.width, 1080, "chatting square background fills the canvas width");
assert.equal(backgroundLayer.height, 1080, "chatting square background fills the canvas height");

const titleLayer = imageLayers.find((layer) => layer.name.includes("タイトル"));
assert.ok(titleLayer, "chatting square has a title image layer");
assert.equal(
  titleLayer.src,
  `${titlePrefix}chatting-square-title-pink-blue-v1.png`,
  "chatting square uses the matching Yusei Magic transparent title image"
);
assert.equal(titleLayer.x, -347.0687719823392, "chatting square title image uses the adjusted x position");
assert.equal(titleLayer.y, -105.17398787697368, "chatting square title image uses the adjusted y position");
assert.equal(titleLayer.width, 1286.0345730749082, "chatting square title image uses the adjusted display width");
assert.equal(titleLayer.height, 556.9672977624786, "chatting square title image uses the adjusted display height");

assert.equal(
  squareDraft.layers.some((layer) => layer.type === "text" && layer.text === "雑談"),
  false,
  "chatting square does not duplicate the fixed title image as editable text"
);
const textLayers = squareDraft.layers.filter((layer) => layer.type === "text");
assert.deepEqual(
  textLayers.map((layer) => layer.name),
  ["テキスト 1（見出し）", "テキスト 2（時刻）"],
  "chatting square keeps only the heading and time editable text by default"
);
assert.deepEqual(
  textLayers.map((layer) => ({
    name: layer.name,
    text: layer.text,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    fontSize: layer.fontSize,
    fontFamily: layer.fontFamily
  })),
  [
    {
      name: "テキスト 1（見出し）",
      text: "ゆるっと話そう",
      x: 99.55167252862384,
      y: 331.51672528623817,
      width: 400,
      height: 105,
      fontSize: 50,
      fontFamily: "Kiwi Maru"
    },
    {
      name: "テキスト 2（時刻）",
      text: "20:00 START",
      x: 30.136047294769185,
      y: 987.1070867320212,
      width: 330,
      height: 58,
      fontSize: 54,
      fontFamily: "Fredoka"
    }
  ],
  "chatting square text layers use the final QA positions"
);
const standeeGuide = squareDraft.layers.find((layer) => layer.type === "shape" && layer.name.includes("立ち絵挿入ガイド"));
assert.ok(standeeGuide, "chatting square keeps a standee placement guide");
assert.deepEqual(
  { x: standeeGuide.x, y: standeeGuide.y, width: standeeGuide.width, height: standeeGuide.height },
  { x: 639.7933098855048, y: 378.13829229963335, width: 340, height: 616 },
  "chatting square standee guide uses the final QA position"
);
const timeBadge = squareDraft.layers.find((layer) => layer.type === "shape" && layer.name.includes("時刻バッジ土台"));
assert.ok(timeBadge, "chatting square keeps a time badge base");
assert.deepEqual(
  { x: timeBadge.x, y: timeBadge.y, width: timeBadge.width, height: timeBadge.height },
  { x: 11.515976951283392, y: 968.9800194567088, width: 363.8398563196887, height: 84.60959365411952 },
  "chatting square time badge uses the final QA position"
);

const normalized = lib.normalizeThumbnailDraft(squareDraft);
assert.ok(normalized, "chatting square draft normalizes");
assert.deepEqual(normalized.canvas, { width: 1080, height: 1080 }, "chatting square canvas survives normalization");
assert.equal(
  normalized.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}chatting-square-title-pink-blue-v1.png`,
  "chatting square title image survives normalization"
);

const configuredDraft = lib.createChattingIriamSquareDraft({
  backgroundColorway: "mint",
  titleColorway: "yellow"
});
assert.deepEqual(configuredDraft.canvas, { width: 1080, height: 1080 }, "configured chatting square draft keeps the IRIAM canvas");
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  `${backgroundPrefix}karaoke-square-pop-bubble-mint-v1.png`,
  "configured chatting square draft keeps pop_bubble fixed while changing the background colorway"
);
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}chatting-square-title-yellow-v1.png`,
  "configured chatting square draft can choose a title colorway independently from the background"
);
const matchedTitleDraft = lib.createChattingIriamSquareDraft({
  backgroundColorway: "blue",
  titleColorway: "match-background"
});
assert.equal(
  matchedTitleDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}chatting-square-title-blue-v1.png`,
  "chatting match-background title selection follows the chosen background colorway"
);

assert.equal(
  componentSource.includes('variantId === "square-1-1" ? presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting" || presetId === "first_stream" || presetId === "endurance_stream" : presetId !== "dark_gacha"'),
  true,
  "preset list exposes karaoke, dark gacha, chatting, first_stream, and endurance_stream while the square variant is active"
);
assert.equal(
  componentSource.includes('type IriamSquarePresetModalPresetId = "karaoke" | "dark_gacha" | "chatting" | "first_stream"'),
  true,
  "square settings modal type includes chatting and first_stream"
);
assert.equal(
  componentSource.includes('presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting" || presetId === "first_stream"'),
  true,
  "square preset cards open the settings modal for karaoke, dark gacha, chatting, and first_stream"
);
assert.equal(
  componentSource.includes("defaultThumbnailIriamSquareChattingPresetConfig"),
  true,
  "chatting square modal uses a dedicated default config"
);
assert.equal(
  componentSource.includes("createChattingIriamSquareDraft(config, locale)"),
  true,
  "chatting square modal applies the configured square draft helper"
);
assert.equal(
  componentSource.includes('presetId === "chatting" ? "pop_bubble"'),
  true,
  "chatting settings modal keeps the background style fixed to pop_bubble"
);
assert.equal(
  copySource.includes('chatting: "雑談プリセット設定"'),
  true,
  "Japanese chatting square settings modal title is localized"
);
assert.equal(
  copySource.includes('chatting: "Chatting preset settings"'),
  true,
  "English chatting square settings modal title is localized"
);
assert.equal(
  source.includes("createChattingIriamSquareDraft"),
  true,
  "chatting square application uses the dedicated square draft helper"
);

console.log("thumbnail iriam chatting square preset contract checks passed");
