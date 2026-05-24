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
  ["画像 1（背景）", "画像 2（タイトル 耐久）"],
  "endurance_stream square keeps image layers to the fixed background and transparent title"
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
assert.equal(titleLayer.width, 760, "endurance_stream square title image keeps its source width");
assert.equal(titleLayer.height, 320, "endurance_stream square title image keeps its source height");

assert.equal(
  squareDraft.layers.some((layer) => layer.type === "text" && layer.text === "耐久"),
  false,
  "endurance_stream square does not duplicate the fixed title image as editable text"
);
for (const roleName of ["見出し", "時刻", "サブ", "ラベル"]) {
  assert.ok(
    squareDraft.layers.some((layer) => layer.type === "text" && layer.name.includes(roleName)),
    `endurance_stream square keeps editable ${roleName} text`
  );
}
assert.ok(
  squareDraft.layers.some((layer) => layer.type === "shape" && layer.name.includes("立ち絵挿入ガイド")),
  "endurance_stream square keeps a standee placement guide"
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
  componentSource.includes('currentVariantId === "square-1-1" && (presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting" || presetId === "first_stream")'),
  true,
  "endurance_stream square body does not join the settings modal in this slice"
);
assert.equal(
  source.includes("createEnduranceStreamIriamSquareDraft"),
  true,
  "endurance_stream square application uses the dedicated square draft helper"
);

console.log("thumbnail iriam endurance_stream square preset contract checks passed");
