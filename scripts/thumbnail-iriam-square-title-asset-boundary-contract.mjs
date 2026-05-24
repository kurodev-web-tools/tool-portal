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

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const readPngSize = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.subarray(0, 8).equals(pngSignature), true, `${path.basename(filePath)} is a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

const titlePrefix = "/assets/images/thumbnail-editor/iriam-square/dark-gacha/titles/";
const expectedTitleFiles = [
  "dark-gacha-square-title-pink-blue-v1.png",
  "dark-gacha-square-title-blue-v1.png",
  "dark-gacha-square-title-yellow-v1.png",
  "dark-gacha-square-title-purple-v1.png",
  "dark-gacha-square-title-mint-v1.png"
];

assert.ok(Array.isArray(lib.thumbnailIriamSquareTitleGenres), "square title genre registry is exported");
assert.deepEqual(lib.thumbnailIriamSquareTitleGenres, ["karaoke", "dark_gacha"], "square title registry adds only one non-karaoke genre");
assert.ok(Array.isArray(lib.thumbnailIriamSquareDarkGachaTitleAssets), "dark gacha square title asset metadata is exported");
assert.deepEqual(
  lib.thumbnailIriamSquareDarkGachaTitleAssets.map((asset) => path.basename(asset.src)),
  expectedTitleFiles,
  "dark gacha square registers the adopted New Tegomin title colorways"
);

for (const asset of lib.thumbnailIriamSquareDarkGachaTitleAssets) {
  assert.equal(asset.genre, "dark_gacha", "dark gacha title asset carries its square title genre");
  assert.equal(asset.titleText, "闇ガチャ", "dark gacha title asset keeps the fixed rendered text");
  assert.equal(asset.fontFamily, "New Tegomin", "dark gacha title asset records the selected rendered font");
  assert.equal(asset.source, "generated-title-image", "dark gacha title asset is treated as a generated transparent PNG layer candidate");
  assert.equal(Object.hasOwn(asset, "storageId"), false, "dark gacha title asset does not mix user storage ids into project assets");
  assert.equal(Object.hasOwn(asset, "materialRef"), false, "dark gacha title asset does not mix user material refs into project assets");

  const publicPath = path.join(root, "public", asset.src.replace(/^\//, ""));
  assert.equal(fs.existsSync(publicPath), true, `${path.basename(asset.src)} production title image exists`);
  assert.deepEqual(readPngSize(publicPath), { width: 760, height: 320 }, `${path.basename(asset.src)} keeps the title image layer size`);
  assert.ok(fs.statSync(publicPath).size < 160_000, `${path.basename(asset.src)} stays reasonably lightweight`);
}

assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("dark_gacha", "purple")?.src,
  `${titlePrefix}dark-gacha-square-title-purple-v1.png`,
  "generic square title helper resolves dark gacha by genre and colorway"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("dark_gacha", "match-background", "mint")?.src,
  `${titlePrefix}dark-gacha-square-title-mint-v1.png`,
  "generic square title helper can match the background colorway without a preset body"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("unknown", "purple"),
  null,
  "generic square title helper does not fall back across genres"
);

assert.equal(
  lib.thumbnailPresets.some((preset) => preset.id === "dark_gacha"),
  true,
  "dark gacha title registration now connects to a dedicated square preset body"
);
assert.equal(
  source.includes("createDarkGachaIriamSquareDraft"),
  true,
  "dark gacha title registration has a follow-up square preset body"
);

console.log("thumbnail iriam square title asset boundary contract checks passed");
