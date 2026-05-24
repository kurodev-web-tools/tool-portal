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

const titlePrefix = "/assets/images/thumbnail-editor/iriam-square/";
const karaokeTitlePrefix = `${titlePrefix}karaoke/titles/`;
const darkGachaTitlePrefix = `${titlePrefix}dark-gacha/titles/`;
const chattingTitlePrefix = `${titlePrefix}chatting/titles/`;

assert.equal(typeof lib.getThumbnailIriamSquareTitleLayerMatch, "function", "title layer registry matcher is exported");
assert.equal(typeof lib.getThumbnailIriamSquareTitlePanelModel, "function", "title swap panel model helper is exported");
assert.equal(typeof lib.replaceThumbnailIriamSquareTitleLayerSource, "function", "title swap source replacement helper is exported");

const karaokeDraft = lib.createDraftFromPresetVariant("karaoke", "square-1-1");
const karaokeTitleLayer = karaokeDraft.layers.find((layer) => layer.type === "image" && layer.src.startsWith(karaokeTitlePrefix));
const karaokeBackgroundLayer = karaokeDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
assert.ok(karaokeTitleLayer, "karaoke square draft has a transparent title image layer");

const renamedTitleLayer = { ...karaokeTitleLayer, name: "renamed user label" };
assert.deepEqual(
  lib.getThumbnailIriamSquareTitleLayerMatch(renamedTitleLayer),
  {
    genre: "karaoke",
    colorway: "pink-blue",
    src: `${karaokeTitlePrefix}karaoke-square-title-pink-blue-v1.png`,
    titleText: "歌枠",
    fontFamily: "Mochiy Pop P One",
    source: "generated-title-image"
  },
  "title layer detection is based on registry src, not the layer name"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleLayerMatch({ ...renamedTitleLayer, src: "/assets/images/thumbnail-editor/phase5/karaoke-background-v1.png" }),
  null,
  "16:9 preset assets are not treated as IRIAM square title layers"
);
assert.equal(lib.getThumbnailIriamSquareTitleLayerMatch(karaokeBackgroundLayer), null, "IRIAM square background layers are not treated as title layers");

const karaokeModel = lib.getThumbnailIriamSquareTitlePanelModel("square-1-1", renamedTitleLayer);
assert.equal(karaokeModel?.selectedGenre, "karaoke", "panel model keeps the selected title asset genre");
assert.equal(karaokeModel?.selectedColorway, "pink-blue", "panel model exposes the selected title colorway");
assert.deepEqual(
  karaokeModel?.colorways,
  lib.thumbnailIriamSquareColorways,
  "panel model exposes only the existing square colorways"
);
assert.equal(
  lib.getThumbnailIriamSquareTitlePanelModel("landscape-16-9", renamedTitleLayer),
  null,
  "title panel model is hidden outside square-1-1 even if the selected layer src matches"
);
assert.equal(
  lib.getThumbnailIriamSquareTitlePanelModel("square-1-1", karaokeBackgroundLayer),
  null,
  "title panel model is hidden unless the selected image layer is a registered title asset"
);

const swapped = lib.replaceThumbnailIriamSquareTitleLayerSource(renamedTitleLayer, "purple");
assert.equal(swapped.src, `${karaokeTitlePrefix}karaoke-square-title-purple-v1.png`, "title swap changes only to a title asset in the same genre");
for (const key of ["id", "name", "type", "x", "y", "width", "height", "locked", "opacity", "rotation", "blur"]) {
  assert.deepEqual(swapped[key], renamedTitleLayer[key], `title swap preserves ${key}`);
}
assert.deepEqual(
  lib.replaceThumbnailIriamSquareTitleLayerSource(swapped, "unknown"),
  swapped,
  "title swap ignores unknown colorways instead of falling back across genres"
);

const darkGachaDraft = lib.createDraftFromPresetVariant("dark_gacha", "square-1-1");
const darkGachaTitleLayer = darkGachaDraft.layers.find((layer) => layer.type === "image" && layer.src.startsWith(darkGachaTitlePrefix));
assert.ok(darkGachaTitleLayer, "dark_gacha square draft has a transparent title image layer");
assert.equal(
  lib.replaceThumbnailIriamSquareTitleLayerSource(darkGachaTitleLayer, "blue").src,
  `${darkGachaTitlePrefix}dark-gacha-square-title-blue-v1.png`,
  "title swap keeps dark_gacha inside the detected title genre"
);
assert.notEqual(
  lib.replaceThumbnailIriamSquareTitleLayerSource(darkGachaTitleLayer, "blue").src,
  `${karaokeTitlePrefix}karaoke-square-title-blue-v1.png`,
  "title swap does not cross from dark_gacha to karaoke"
);

const chattingDraft = lib.createDraftFromPresetVariant("chatting", "square-1-1");
const chattingTitleLayer = chattingDraft.layers.find((layer) => layer.type === "image" && layer.src.startsWith(chattingTitlePrefix));
assert.equal(
  lib.replaceThumbnailIriamSquareTitleLayerSource(chattingTitleLayer, "mint").src,
  `${chattingTitlePrefix}chatting-square-title-mint-v1.png`,
  "title swap keeps chatting inside the detected title genre"
);

assert.ok(componentSource.includes("IriamSquareTitleSwapPanel"), "PropertyPanel wires a small IRIAM square title swap panel");
assert.ok(
  componentSource.includes("getThumbnailIriamSquareTitlePanelModel") && componentSource.includes('currentVariantId === "square-1-1"'),
  "UI gates the title panel by square-1-1 and the registry-based selected layer model"
);
assert.ok(
  componentSource.includes("replaceThumbnailIriamSquareTitleLayerSource") && componentSource.includes("data-thumbnail-iriam-square-title-swap"),
  "UI title replacement updates the selected layer source through the helper"
);
const titlePanelStart = componentSource.indexOf("function IriamSquareTitleSwapPanel");
assert.notEqual(titlePanelStart, -1, "title swap panel function is present");
const titlePanelEnd = componentSource.indexOf("function LayerQuickAdjustPanel", titlePanelStart);
assert.notEqual(titlePanelEnd, -1, "title swap panel stays scoped before general layer controls");
const titlePanelSource = componentSource.slice(titlePanelStart, titlePanelEnd);
assert.equal(
  titlePanelSource.includes("match-background"),
  false,
  "right-panel title swap does not expose the preset-modal match-background concept"
);

console.log("thumbnail iriam square title swap contract checks passed");
