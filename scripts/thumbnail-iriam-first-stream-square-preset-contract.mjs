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
const titlePrefix = "/assets/images/thumbnail-editor/iriam-square/first-stream/titles/";

assert.ok(
  lib.thumbnailPresets.some((preset) => preset.id === "first_stream"),
  "first_stream remains registered as a selectable preset"
);
assert.deepEqual(
  lib.thumbnailPresetVariantRelations.first_stream,
  {
    presetId: "first_stream",
    familyId: "first-stream",
    defaultVariantId: "landscape-16-9",
    variantIds: ["landscape-16-9", "portrait-9-16", "square-1-1"]
  },
  "first_stream keeps its existing preset relation while gaining a dedicated square body"
);

const landscapeDraft = lib.createDraftFromPresetVariant("first_stream", "landscape-16-9");
assert.deepEqual(landscapeDraft.canvas, { width: 1280, height: 720 }, "first_stream landscape draft is unchanged");
assert.equal(
  landscapeDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  "/assets/images/thumbnail-editor/phase5/first-stream-background-v1.png",
  "first_stream landscape keeps the existing phase5 background"
);

const squareDraft = lib.createDraftFromPresetVariant("first_stream", "square-1-1");
assert.deepEqual(squareDraft.canvas, { width: 1080, height: 1080 }, "first_stream square draft uses the IRIAM canvas");
assert.equal(squareDraft.presetId, "first_stream", "first_stream square keeps the existing preset id");
assert.equal(Object.hasOwn(squareDraft, "variantId"), false, "first_stream square does not add draft schema fields");

const imageLayers = squareDraft.layers.filter((layer) => layer.type === "image");
assert.deepEqual(
  imageLayers.map((layer) => layer.name),
  ["画像 1（背景）", "画像 2（タイトル 初配信）"],
  "first_stream square keeps image layers to the fixed background and transparent title"
);

const backgroundLayer = imageLayers.find((layer) => layer.name.includes("背景"));
assert.ok(backgroundLayer, "first_stream square has a background image layer");
assert.equal(
  backgroundLayer.src,
  `${backgroundPrefix}karaoke-square-soft-cloud-pink-blue-v1.png`,
  "first_stream square defaults to the adopted soft_cloud pink-blue background"
);
assert.equal(backgroundLayer.locked, true, "first_stream square background is locked");
assert.equal(backgroundLayer.width, 1080, "first_stream square background fills the canvas width");
assert.equal(backgroundLayer.height, 1080, "first_stream square background fills the canvas height");

const titleLayer = imageLayers.find((layer) => layer.name.includes("タイトル"));
assert.ok(titleLayer, "first_stream square has a title image layer");
assert.equal(
  titleLayer.src,
  `${titlePrefix}first-stream-square-title-pink-blue-v1.png`,
  "first_stream square uses the matching Mochiy Pop One transparent title image"
);
assert.equal(titleLayer.width, 760, "first_stream square title image keeps its source width");
assert.equal(titleLayer.height, 320, "first_stream square title image keeps its source height");

assert.equal(
  squareDraft.layers.some((layer) => layer.type === "text" && layer.text === "初配信"),
  false,
  "first_stream square does not duplicate the fixed title image as editable text"
);
for (const roleName of ["見出し", "時刻", "サブ", "ラベル"]) {
  assert.ok(
    squareDraft.layers.some((layer) => layer.type === "text" && layer.name.includes(roleName)),
    `first_stream square keeps editable ${roleName} text`
  );
}
assert.ok(
  squareDraft.layers.some((layer) => layer.type === "shape" && layer.name.includes("立ち絵挿入ガイド")),
  "first_stream square keeps a standee placement guide"
);

const normalized = lib.normalizeThumbnailDraft(squareDraft);
assert.ok(normalized, "first_stream square draft normalizes");
assert.deepEqual(normalized.canvas, { width: 1080, height: 1080 }, "first_stream square canvas survives normalization");
assert.equal(
  normalized.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}first-stream-square-title-pink-blue-v1.png`,
  "first_stream square title image survives normalization"
);

const configuredDraft = lib.createFirstStreamIriamSquareDraft({
  backgroundColorway: "mint",
  titleColorway: "yellow"
});
assert.deepEqual(configuredDraft.canvas, { width: 1080, height: 1080 }, "configured first_stream square draft keeps the IRIAM canvas");
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  `${backgroundPrefix}karaoke-square-soft-cloud-mint-v1.png`,
  "configured first_stream square draft keeps soft_cloud fixed while changing the background colorway"
);
assert.equal(
  configuredDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}first-stream-square-title-yellow-v1.png`,
  "configured first_stream square draft can choose a title colorway independently from the background"
);
const matchedTitleDraft = lib.createFirstStreamIriamSquareDraft({
  backgroundColorway: "blue",
  titleColorway: "match-background"
});
assert.equal(
  matchedTitleDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))?.src,
  `${titlePrefix}first-stream-square-title-blue-v1.png`,
  "first_stream match-background title selection follows the chosen background colorway"
);

assert.equal(
  componentSource.includes('variantId === "square-1-1" ? presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting" || presetId === "first_stream" || presetId === "endurance_stream" : presetId !== "dark_gacha"'),
  true,
  "preset list exposes karaoke, dark gacha, chatting, first_stream, and endurance_stream while the square variant is active"
);
assert.equal(
  componentSource.includes('type IriamSquarePresetModalPresetId = "karaoke" | "dark_gacha" | "chatting" | "first_stream"'),
  true,
  "square settings modal type includes first_stream"
);
assert.equal(
  componentSource.includes('presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting" || presetId === "first_stream"'),
  true,
  "square preset cards open the settings modal for karaoke, dark gacha, chatting, and first_stream"
);
assert.equal(
  componentSource.includes("defaultThumbnailIriamSquareFirstStreamPresetConfig"),
  true,
  "first_stream square modal uses a dedicated default config"
);
assert.equal(
  componentSource.includes("createFirstStreamIriamSquareDraft(config)"),
  true,
  "first_stream square modal applies the configured square draft helper"
);
assert.equal(
  componentSource.includes('presetId === "first_stream" ? "soft_cloud"'),
  true,
  "first_stream settings modal keeps the background style fixed to soft_cloud"
);
assert.equal(
  copySource.includes('first_stream: "初配信プリセット設定"'),
  true,
  "Japanese first_stream square settings modal title is localized"
);
assert.equal(
  copySource.includes('first_stream: "First Stream preset settings"'),
  true,
  "English first_stream square settings modal title is localized"
);
assert.equal(
  source.includes("createFirstStreamIriamSquareDraft"),
  true,
  "first_stream square application uses the dedicated square draft helper"
);

console.log("thumbnail iriam first_stream square preset contract checks passed");
