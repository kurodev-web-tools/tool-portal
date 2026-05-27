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
const compiledCopy = ts.transpileModule(copySource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;
const copyModule = new Module(copySourcePath);
copyModule.filename = copySourcePath;
copyModule.paths = Module._nodeModulePaths(path.dirname(copySourcePath));
copyModule._compile(compiledCopy, copySourcePath);
const copyLib = copyModule.exports;

const backgroundPrefix = "/assets/images/thumbnail-editor/iriam-square/karaoke/backgrounds/";
const titlePrefix = "/assets/images/thumbnail-editor/iriam-square/endurance/titles/";

assert.ok(
  lib.thumbnailPresets.some((preset) => preset.id === "endurance_stream"),
  "endurance_stream remains registered as a selectable preset"
);
assert.deepEqual(
  lib.thumbnailPresetVariantRelations.endurance_stream,
  {
    presetId: "endurance_stream",
    familyId: "endurance-stream",
    defaultVariantId: "landscape-16-9",
    variantIds: ["landscape-16-9", "portrait-9-16", "square-1-1"]
  },
  "endurance_stream keeps its existing preset relation while gaining a dedicated square body"
);

const landscapeDraft = lib.createDraftFromPresetVariant("endurance_stream", "landscape-16-9");
assert.deepEqual(landscapeDraft.canvas, { width: 1280, height: 720 }, "endurance_stream landscape draft is unchanged");
assert.equal(
  landscapeDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  "/assets/images/thumbnail-editor/phase5/endurance-stream-background-v1.png",
  "endurance_stream landscape keeps the existing phase5 background"
);

const squareDraft = lib.createDraftFromPresetVariant("endurance_stream", "square-1-1");
assert.deepEqual(squareDraft.canvas, { width: 1080, height: 1080 }, "endurance_stream square draft uses the IRIAM canvas");
assert.equal(squareDraft.presetId, "endurance_stream", "endurance_stream square keeps the existing preset id");
assert.equal(Object.hasOwn(squareDraft, "variantId"), false, "endurance_stream square does not add draft schema fields");

const imageLayers = squareDraft.layers.filter((layer) => layer.type === "image");
assert.deepEqual(
  imageLayers.map((layer) => layer.name),
  ["画像 1（背景）", "画像 2（タイトル 耐久）", "素材: 黄桃リボン"],
  "endurance_stream square keeps the fixed background, transparent title, and final QA ribbon material"
);

const backgroundLayer = imageLayers.find((layer) => layer.name.includes("背景"));
assert.ok(backgroundLayer, "endurance_stream square has a background image layer");
assert.equal(
  backgroundLayer.src,
  `${backgroundPrefix}karaoke-square-pop-bubble-yellow-v1.png`,
  "endurance_stream square defaults to the adopted pop_bubble yellow background"
);
assert.equal(backgroundLayer.locked, true, "endurance_stream square background is locked");
assert.equal(backgroundLayer.width, 1080, "endurance_stream square background fills the canvas width");
assert.equal(backgroundLayer.height, 1080, "endurance_stream square background fills the canvas height");

const titleLayer = imageLayers.find((layer) => layer.name.includes("タイトル"));
assert.ok(titleLayer, "endurance_stream square has a title image layer");
assert.equal(
  titleLayer.src,
  `${titlePrefix}endurance-square-title-yellow-v1.png`,
  "endurance_stream square uses the matching Dela Gothic One transparent title image"
);
assert.deepEqual(
  {
    x: titleLayer.x,
    y: titleLayer.y,
    width: titleLayer.width,
    height: titleLayer.height
  },
  {
    x: -160.17249120706424,
    y: 588.4141285639453,
    width: 1384,
    height: 836
  },
  "endurance_stream square title image uses the final QA placement"
);

const ribbonLayer = imageLayers.find((layer) => layer.name === "素材: 黄桃リボン");
assert.ok(ribbonLayer, "endurance_stream square has the final QA ribbon material layer");
assert.deepEqual(
  {
    src: ribbonLayer.src,
    x: ribbonLayer.x,
    y: ribbonLayer.y,
    width: ribbonLayer.width,
    height: ribbonLayer.height
  },
  {
    src: "/assets/images/thumbnail-editor/materials/iriam-square-label-base/iriam-square-label-tiny-ribbon-yellow-pink-v1.png",
    x: -151.55167252862395,
    y: -291.37918132155954,
    width: 1378,
    height: 801
  },
  "endurance_stream square ribbon material uses the final QA placement"
);

assert.equal(
  squareDraft.layers.some((layer) => layer.type === "text" && layer.text === "耐久"),
  false,
  "endurance_stream square does not duplicate the fixed title image as editable text"
);
for (const roleName of ["時刻"]) {
  assert.ok(
    squareDraft.layers.some((layer) => layer.type === "text" && layer.name.includes(roleName)),
    `endurance_stream square keeps editable ${roleName} text`
  );
}
assert.equal(
  squareDraft.layers.filter((layer) => layer.type === "text").length,
  1,
  "endurance_stream square keeps only the final QA editable time text"
);
assert.equal(
  squareDraft.layers.find((layer) => layer.type === "text" && layer.name.includes("時刻"))?.fontFamily,
  "Dela Gothic One",
  "endurance_stream square time text uses the final QA font"
);
assert.ok(
  squareDraft.layers.some((layer) => layer.type === "shape" && layer.name.includes("立ち絵挿入ガイド")),
  "endurance_stream square keeps a standee placement guide"
);

const enSquareDraft = lib.createDraftFromPresetVariant("endurance_stream", "square-1-1", "en");
assert.deepEqual(enSquareDraft.canvas, { width: 1080, height: 1080 }, "endurance_stream EN square draft uses the IRIAM canvas");
assert.equal(enSquareDraft.presetId, "endurance_stream", "endurance_stream EN square keeps the existing preset id");
assert.deepEqual(
  enSquareDraft.layers.map((layer) => layer.name),
  [
    "Image 1 (Background)",
    "Shape 1 (Top challenge light)",
    "Image 2 (Endurance title)",
    "Shape 2 (Standee guide)",
    "Asset: Diagonal Cut Ribbon",
    "Text 2 (Time)"
  ],
  "endurance_stream EN square draft uses English layer labels in exported JSON"
);
const enTitleLayer = enSquareDraft.layers.find((layer) => layer.type === "image" && layer.name === "Image 2 (Endurance title)");
assert.ok(enTitleLayer, "endurance_stream EN square has a title image layer");
assert.equal(
  enTitleLayer.src,
  `${titlePrefix}endurance-square-en-title-yellow-v1.png`,
  "endurance_stream EN square uses the matching transparent EN title image"
);
assert.deepEqual(
  {
    x: enTitleLayer.x,
    y: enTitleLayer.y,
    width: enTitleLayer.width,
    height: enTitleLayer.height,
    rotation: enTitleLayer.rotation
  },
  {
    x: 275.5477981487745,
    y: 611.9131932483637,
    width: 918.0326358849836,
    height: 488.6869497833735,
    rotation: -30.20164646321526
  },
  "endurance_stream EN square title image uses the latest user-provided placement"
);
const enRibbonLayer = enSquareDraft.layers.find((layer) => layer.type === "image" && layer.name === "Asset: Diagonal Cut Ribbon");
assert.ok(enRibbonLayer, "endurance_stream EN square keeps the ribbon material layer");
assert.equal(
  enRibbonLayer.src,
  "/assets/images/thumbnail-editor/materials/labels/label-diagonal-ribbon-slate-cyan.png",
  "endurance_stream EN square uses the diagonal ribbon material"
);
assert.deepEqual(
  {
    x: enRibbonLayer.x,
    y: enRibbonLayer.y,
    width: enRibbonLayer.width,
    height: enRibbonLayer.height,
    rotation: enRibbonLayer.rotation
  },
  {
    x: 437.1478941878667,
    y: 715.6389829891508,
    width: 851.754878781992,
    height: 609.929600414004,
    rotation: -31.003891253382996
  },
  "endurance_stream EN square ribbon material uses the latest user-provided placement"
);
assert.deepEqual(
  enSquareDraft.layers.filter((layer) => layer.type === "text").map((layer) => ({
    name: layer.name,
    text: layer.text,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    fontSize: layer.fontSize,
    fontFamily: layer.fontFamily
  })),
  [
    {
      name: "Text 2 (Time)",
      text: "19:00 START",
      x: 750.0938516201176,
      y: 952.3983503601947,
      width: 330,
      height: 58,
      rotation: -31.269613517036777,
      fontSize: 50,
      fontFamily: "Dela Gothic One"
    }
  ],
  "endurance_stream EN square text layer uses the latest user-provided EN placement"
);
const localizedEnSquareDraft = copyLib.localizeThumbnailPresetTextLayerBodies(enSquareDraft, "en");
assert.deepEqual(
  localizedEnSquareDraft.layers.filter((layer) => layer.type === "text").map((layer) => ({
    name: layer.name,
    text: layer.text,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation
  })),
  [
    {
      name: "Text 2 (Time)",
      text: "19:00 START",
      x: 750.0938516201176,
      y: 952.3983503601947,
      width: 330,
      height: 58,
      rotation: -31.269613517036777
    }
  ],
  "endurance_stream EN square text localization preserves IRIAM square placement instead of applying legacy 16:9 visual offsets"
);

const normalized = lib.normalizeThumbnailDraft(squareDraft);
assert.ok(normalized, "endurance_stream square draft normalizes");
assert.deepEqual(normalized.canvas, { width: 1080, height: 1080 }, "endurance_stream square canvas survives normalization");
assert.equal(
  normalized.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}endurance-square-title-yellow-v1.png`,
  "endurance_stream square title image survives normalization"
);

const configuredDraft = lib.createEnduranceStreamIriamSquareDraft({
  backgroundColorway: "mint",
  titleColorway: "purple"
});
assert.deepEqual(configuredDraft.canvas, { width: 1080, height: 1080 }, "configured endurance_stream square draft keeps the IRIAM canvas");
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  `${backgroundPrefix}karaoke-square-pop-bubble-mint-v1.png`,
  "configured endurance_stream square draft keeps pop_bubble fixed while changing the background colorway"
);
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}endurance-square-title-purple-v1.png`,
  "configured endurance_stream square draft can choose a title colorway independently from the background"
);
const matchedTitleDraft = lib.createEnduranceStreamIriamSquareDraft({
  backgroundColorway: "blue",
  titleColorway: "match-background"
});
assert.equal(
  matchedTitleDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}endurance-square-title-blue-v1.png`,
  "endurance_stream match-background title selection follows the chosen background colorway"
);

assert.equal(
  componentSource.includes('variantId === "square-1-1" ? presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting" || presetId === "first_stream" || presetId === "endurance_stream" : presetId !== "dark_gacha"'),
  true,
  "preset list exposes karaoke, dark gacha, chatting, first_stream, and endurance_stream while the square variant is active"
);
assert.equal(
  componentSource.includes('type IriamSquarePresetModalPresetId = "karaoke" | "dark_gacha" | "chatting" | "first_stream" | "endurance_stream"'),
  true,
  "square settings modal type includes endurance_stream"
);
assert.equal(
  componentSource.includes('presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting" || presetId === "first_stream" || presetId === "endurance_stream"'),
  true,
  "square preset cards open the settings modal for karaoke, dark gacha, chatting, first_stream, and endurance_stream"
);
assert.equal(
  componentSource.includes("defaultThumbnailIriamSquareEndurancePresetConfig"),
  true,
  "endurance_stream square modal uses a dedicated default config"
);
assert.equal(
  componentSource.includes("createEnduranceStreamIriamSquareDraft(config, locale)"),
  true,
  "endurance_stream square modal applies the configured square draft helper"
);
assert.equal(
  componentSource.includes("function IriamSquarePresetDialogPreview"),
  true,
  "square settings modal has a real draft-based preview component"
);
assert.equal(
  componentSource.includes("drawThumbnail(buffer, previewDraft"),
  true,
  "square settings modal preview renders the same draft helper output instead of a fixed CSS mock"
);
assert.equal(
  componentSource.includes('className="absolute left-[14.8%] top-[11.7%] aspect-[760/320] w-[70.4%] bg-contain bg-center bg-no-repeat"'),
  false,
  "square settings modal preview no longer uses a fixed title placement mock"
);
assert.equal(
  source.includes('getThumbnailIriamSquareKaraokeBackgroundAsset("pop_bubble", config.backgroundColorway)'),
  true,
  "endurance_stream square draft helper keeps the background style fixed to pop_bubble"
);
assert.equal(
  copySource.includes('endurance_stream: "耐久プリセット設定"'),
  true,
  "Japanese endurance_stream square settings modal title is localized"
);
assert.equal(
  copySource.includes('endurance_stream: "Endurance Stream preset settings"'),
  true,
  "English endurance_stream square settings modal title is localized"
);
assert.equal(
  source.includes("createEnduranceStreamIriamSquareDraft"),
  true,
  "endurance_stream square application uses the dedicated square draft helper"
);

console.log("thumbnail iriam endurance_stream square preset contract checks passed");
