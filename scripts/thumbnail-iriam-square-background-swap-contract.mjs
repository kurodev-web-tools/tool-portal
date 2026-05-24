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

assert.ok(Array.isArray(lib.thumbnailIriamSquareBackgroundAssets), "shared IRIAM square background registry is exported");
assert.deepEqual(
  lib.thumbnailIriamSquareBackgroundAssets.map((asset) => `${asset.style}:${asset.colorway}`),
  lib.thumbnailIriamSquareKaraokeBackgroundAssets.map((asset) => `${asset.style}:${asset.colorway}`),
  "shared IRIAM square background registry mirrors the adopted 3 styles x 5 colorways asset set"
);

const expectedRules = {
  karaoke: ["soft_cloud", "pop_bubble", "dark_cute"],
  dark_gacha: ["dark_cute"],
  chatting: ["pop_bubble"],
  first_stream: ["soft_cloud"],
  endurance_stream: ["pop_bubble"]
};
for (const [presetId, styles] of Object.entries(expectedRules)) {
  const rule = lib.getThumbnailIriamSquareBackgroundSwapRule(presetId);
  assert.ok(rule, `${presetId} has an IRIAM square background swap rule`);
  assert.deepEqual(rule.styles, styles, `${presetId} exposes only allowed background styles`);
  assert.deepEqual(rule.colorways, lib.thumbnailIriamSquareColorways, `${presetId} reuses the shared square colorway list`);
}
assert.equal(lib.getThumbnailIriamSquareBackgroundSwapRule("clip"), null, "non-IRIAM square presets do not expose background swap rules");

const karaokeDraft = lib.createDraftFromPresetVariant("karaoke", "square-1-1");
const karaokeBackground = karaokeDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
assert.ok(karaokeBackground, "karaoke square draft has a background image layer");

const renamedBackground = { ...karaokeBackground, name: "renamed user label" };
assert.deepEqual(
  lib.getThumbnailIriamSquareBackgroundLayerMatch(renamedBackground),
  {
    style: "soft_cloud",
    colorway: "pink-blue",
    src: `${backgroundPrefix}karaoke-square-soft-cloud-pink-blue-v1.png`
  },
  "background layer detection is based on the registry src, not the layer name"
);
assert.equal(
  lib.getThumbnailIriamSquareBackgroundLayerMatch({ ...renamedBackground, src: "/assets/images/thumbnail-editor/phase5/karaoke-background-v1.png" }),
  null,
  "16:9 preset backgrounds are not treated as IRIAM square backgrounds"
);
assert.equal(
  lib.getThumbnailIriamSquareBackgroundLayerMatch(karaokeDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("タイトル"))),
  null,
  "IRIAM square title image layers are not treated as background layers"
);

assert.equal(
  lib.getThumbnailIriamSquareBackgroundPanelModel("square-1-1", "karaoke", renamedBackground)?.selectedStyle,
  "soft_cloud",
  "panel model is available for a selected square background layer in square-1-1"
);
assert.equal(
  lib.getThumbnailIriamSquareBackgroundPanelModel("landscape-16-9", "karaoke", renamedBackground),
  null,
  "panel model is hidden outside square-1-1 even if the selected layer src matches"
);
assert.equal(
  lib.getThumbnailIriamSquareBackgroundPanelModel("square-1-1", "clip", renamedBackground),
  null,
  "panel model is hidden for presets without IRIAM square swap rules"
);

const swapped = lib.replaceThumbnailIriamSquareBackgroundLayerSource(renamedBackground, "karaoke", {
  style: "dark_cute",
  colorway: "mint"
});
assert.equal(swapped.src, `${backgroundPrefix}karaoke-square-dark-cute-mint-v1.png`, "karaoke swap can change style and colorway");
for (const key of ["id", "name", "type", "x", "y", "width", "height", "locked", "opacity", "rotation", "blur"]) {
  assert.deepEqual(swapped[key], renamedBackground[key], `background swap preserves ${key}`);
}

const darkGachaDraft = lib.createDraftFromPresetVariant("dark_gacha", "square-1-1");
const darkGachaBackground = darkGachaDraft.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
const darkGachaSwapped = lib.replaceThumbnailIriamSquareBackgroundLayerSource(darkGachaBackground, "dark_gacha", {
  style: "soft_cloud",
  colorway: "blue"
});
assert.equal(
  darkGachaSwapped.src,
  `${backgroundPrefix}karaoke-square-dark-cute-blue-v1.png`,
  "dark_gacha ignores incoming style changes and keeps dark_cute fixed while swapping colorway"
);

assert.ok(
  componentSource.includes("IriamSquareBackgroundSwapPanel"),
  "PropertyPanel wires a small IRIAM square background swap panel"
);
assert.ok(
  componentSource.includes('currentVariantId === "square-1-1"') && componentSource.includes("getThumbnailIriamSquareBackgroundPanelModel"),
  "UI gates the panel by square-1-1 and the registry-based selected layer model"
);
assert.ok(
  componentSource.includes("replaceThumbnailIriamSquareBackgroundLayerSource") && componentSource.includes("src"),
  "UI background replacement updates the selected layer source through the helper"
);

console.log("thumbnail iriam square background swap contract checks passed");
