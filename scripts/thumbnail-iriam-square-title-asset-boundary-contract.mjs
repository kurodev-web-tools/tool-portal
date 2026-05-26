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

const darkGachaTitlePrefix = "/assets/images/thumbnail-editor/iriam-square/dark-gacha/titles/";
const chattingTitlePrefix = "/assets/images/thumbnail-editor/iriam-square/chatting/titles/";
const firstStreamTitlePrefix = "/assets/images/thumbnail-editor/iriam-square/first-stream/titles/";
const enduranceTitlePrefix = "/assets/images/thumbnail-editor/iriam-square/endurance/titles/";
const karaokeTitlePrefix = "/assets/images/thumbnail-editor/iriam-square/karaoke/titles/";
const colorways = ["pink-blue", "blue", "yellow", "purple", "mint"];
const expectedEnTitleMeta = {
  karaoke: {
    exportName: "thumbnailIriamSquareKaraokeEnTitleAssets",
    prefix: karaokeTitlePrefix,
    filePrefix: "karaoke",
    titleText: "Karaoke",
    fontFamily: "Lilita One"
  },
  dark_gacha: {
    exportName: "thumbnailIriamSquareDarkGachaEnTitleAssets",
    prefix: darkGachaTitlePrefix,
    filePrefix: "dark-gacha",
    titleText: "Dark Gacha",
    fontFamily: "Pirata One"
  },
  chatting: {
    exportName: "thumbnailIriamSquareChattingEnTitleAssets",
    prefix: chattingTitlePrefix,
    filePrefix: "chatting",
    titleText: "Chatting",
    fontFamily: "Fredoka"
  },
  first_stream: {
    exportName: "thumbnailIriamSquareFirstStreamEnTitleAssets",
    prefix: firstStreamTitlePrefix,
    filePrefix: "first-stream",
    titleText: "Debut Stream",
    fontFamily: "Lobster"
  },
  endurance_stream: {
    exportName: "thumbnailIriamSquareEnduranceEnTitleAssets",
    prefix: enduranceTitlePrefix,
    filePrefix: "endurance",
    titleText: "Endurance",
    fontFamily: "Anton"
  }
};
const expectedDarkGachaTitleFiles = [
  "dark-gacha-square-title-pink-blue-v1.png",
  "dark-gacha-square-title-blue-v1.png",
  "dark-gacha-square-title-yellow-v1.png",
  "dark-gacha-square-title-purple-v1.png",
  "dark-gacha-square-title-mint-v1.png"
];
const expectedChattingTitleFiles = [
  "chatting-square-title-pink-blue-v1.png",
  "chatting-square-title-blue-v1.png",
  "chatting-square-title-yellow-v1.png",
  "chatting-square-title-purple-v1.png",
  "chatting-square-title-mint-v1.png"
];
const expectedFirstStreamTitleFiles = [
  "first-stream-square-title-pink-blue-v1.png",
  "first-stream-square-title-blue-v1.png",
  "first-stream-square-title-yellow-v1.png",
  "first-stream-square-title-purple-v1.png",
  "first-stream-square-title-mint-v1.png"
];
const expectedEnduranceTitleFiles = [
  "endurance-square-title-pink-blue-v1.png",
  "endurance-square-title-blue-v1.png",
  "endurance-square-title-yellow-v1.png",
  "endurance-square-title-purple-v1.png",
  "endurance-square-title-mint-v1.png"
];

assert.ok(Array.isArray(lib.thumbnailIriamSquareTitleGenres), "square title genre registry is exported");
assert.deepEqual(lib.thumbnailIriamSquareTitleGenres, ["karaoke", "dark_gacha", "chatting", "first_stream", "endurance_stream"], "square title registry includes the connected square preset title genres");
assert.ok(Array.isArray(lib.thumbnailIriamSquareDarkGachaTitleAssets), "dark gacha square title asset metadata is exported");
assert.deepEqual(
  lib.thumbnailIriamSquareDarkGachaTitleAssets.map((asset) => path.basename(asset.src)),
  expectedDarkGachaTitleFiles,
  "dark gacha square registers the adopted New Tegomin title colorways"
);
assert.ok(Array.isArray(lib.thumbnailIriamSquareChattingTitleAssets), "chatting square title asset metadata is exported");
assert.deepEqual(
  lib.thumbnailIriamSquareChattingTitleAssets.map((asset) => path.basename(asset.src)),
  expectedChattingTitleFiles,
  "chatting square registers the adopted Yusei Magic title colorways"
);
assert.ok(Array.isArray(lib.thumbnailIriamSquareFirstStreamTitleAssets), "first_stream square title asset metadata is exported");
assert.deepEqual(
  lib.thumbnailIriamSquareFirstStreamTitleAssets.map((asset) => path.basename(asset.src)),
  expectedFirstStreamTitleFiles,
  "first_stream square registers the adopted Mochiy Pop One title colorways"
);
assert.ok(Array.isArray(lib.thumbnailIriamSquareEnduranceTitleAssets), "endurance_stream square title asset metadata is exported");
assert.deepEqual(
  lib.thumbnailIriamSquareEnduranceTitleAssets.map((asset) => path.basename(asset.src)),
  expectedEnduranceTitleFiles,
  "endurance_stream square registers the adopted Dela Gothic One title colorways"
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

for (const asset of lib.thumbnailIriamSquareChattingTitleAssets) {
  assert.equal(asset.genre, "chatting", "chatting title asset carries its square title genre");
  assert.equal(asset.titleText, "雑談", "chatting title asset keeps the fixed rendered text");
  assert.equal(asset.fontFamily, "Yusei Magic", "chatting title asset records the selected rendered font");
  assert.equal(asset.source, "generated-title-image", "chatting title asset is treated as a generated transparent PNG layer candidate");
  assert.equal(Object.hasOwn(asset, "storageId"), false, "chatting title asset does not mix user storage ids into project assets");
  assert.equal(Object.hasOwn(asset, "materialRef"), false, "chatting title asset does not mix user material refs into project assets");

  const publicPath = path.join(root, "public", asset.src.replace(/^\//, ""));
  assert.equal(fs.existsSync(publicPath), true, `${path.basename(asset.src)} production title image exists`);
  assert.deepEqual(readPngSize(publicPath), { width: 760, height: 320 }, `${path.basename(asset.src)} keeps the title image layer size`);
  assert.ok(fs.statSync(publicPath).size < 160_000, `${path.basename(asset.src)} stays reasonably lightweight`);
}

for (const asset of lib.thumbnailIriamSquareFirstStreamTitleAssets) {
  assert.equal(asset.genre, "first_stream", "first_stream title asset carries its square title genre");
  assert.equal(asset.titleText, "初配信", "first_stream title asset keeps the fixed rendered text");
  assert.equal(asset.fontFamily, "Mochiy Pop One", "first_stream title asset records the selected rendered font");
  assert.equal(asset.source, "generated-title-image", "first_stream title asset is treated as a generated transparent PNG layer candidate");
  assert.equal(Object.hasOwn(asset, "storageId"), false, "first_stream title asset does not mix user storage ids into project assets");
  assert.equal(Object.hasOwn(asset, "materialRef"), false, "first_stream title asset does not mix user material refs into project assets");

  const publicPath = path.join(root, "public", asset.src.replace(/^\//, ""));
  assert.equal(fs.existsSync(publicPath), true, `${path.basename(asset.src)} production title image exists`);
  assert.deepEqual(readPngSize(publicPath), { width: 760, height: 320 }, `${path.basename(asset.src)} keeps the title image layer size`);
  assert.ok(fs.statSync(publicPath).size < 160_000, `${path.basename(asset.src)} stays reasonably lightweight`);
}

for (const asset of lib.thumbnailIriamSquareEnduranceTitleAssets) {
  assert.equal(asset.genre, "endurance_stream", "endurance_stream title asset carries its square title genre");
  assert.equal(asset.titleText, "耐久", "endurance_stream title asset keeps the fixed rendered text");
  assert.equal(asset.fontFamily, "Dela Gothic One", "endurance_stream title asset records the selected rendered font");
  assert.equal(asset.source, "generated-title-image", "endurance_stream title asset is treated as a generated transparent PNG layer candidate");
  assert.equal(Object.hasOwn(asset, "storageId"), false, "endurance_stream title asset does not mix user storage ids into project assets");
  assert.equal(Object.hasOwn(asset, "materialRef"), false, "endurance_stream title asset does not mix user material refs into project assets");

  const publicPath = path.join(root, "public", asset.src.replace(/^\//, ""));
  assert.equal(fs.existsSync(publicPath), true, `${path.basename(asset.src)} production title image exists`);
  assert.deepEqual(readPngSize(publicPath), { width: 760, height: 320 }, `${path.basename(asset.src)} keeps the title image layer size`);
  assert.ok(fs.statSync(publicPath).size < 160_000, `${path.basename(asset.src)} stays reasonably lightweight`);
}

assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("dark_gacha", "purple")?.src,
  `${darkGachaTitlePrefix}dark-gacha-square-title-purple-v1.png`,
  "generic square title helper resolves dark gacha by genre and colorway"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("dark_gacha", "match-background", "mint")?.src,
  `${darkGachaTitlePrefix}dark-gacha-square-title-mint-v1.png`,
  "generic square title helper can match the background colorway without a preset body"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("chatting", "blue")?.src,
  `${chattingTitlePrefix}chatting-square-title-blue-v1.png`,
  "generic square title helper resolves chatting by genre and colorway"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("chatting", "match-background", "yellow")?.src,
  `${chattingTitlePrefix}chatting-square-title-yellow-v1.png`,
  "generic square title helper can match the chatting background colorway"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("first_stream", "purple")?.src,
  `${firstStreamTitlePrefix}first-stream-square-title-purple-v1.png`,
  "generic square title helper resolves first_stream by genre and colorway"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("first_stream", "match-background", "blue")?.src,
  `${firstStreamTitlePrefix}first-stream-square-title-blue-v1.png`,
  "generic square title helper can match the first_stream background colorway"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("endurance_stream", "yellow")?.src,
  `${enduranceTitlePrefix}endurance-square-title-yellow-v1.png`,
  "generic square title helper resolves endurance_stream by genre and colorway"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("endurance_stream", "match-background", "mint")?.src,
  `${enduranceTitlePrefix}endurance-square-title-mint-v1.png`,
  "generic square title helper can match the endurance_stream background colorway"
);
assert.equal(
  lib.getThumbnailIriamSquareTitleAsset("unknown", "purple"),
  null,
  "generic square title helper does not fall back across genres"
);

assert.deepEqual(
  Object.keys(lib.thumbnailIriamSquareEnTitleAssetsByGenre),
  lib.thumbnailIriamSquareTitleGenres,
  "English square title registry mirrors the Japanese title genres"
);
for (const [genre, meta] of Object.entries(expectedEnTitleMeta)) {
  const assets = lib[meta.exportName];
  assert.ok(Array.isArray(assets), `${genre} English title asset metadata is exported`);
  assert.deepEqual(
    assets.map((asset) => path.basename(asset.src)),
    colorways.map((colorway) => `${meta.filePrefix}-square-en-title-${colorway}-v1.png`),
    `${genre} registers five English title colorways`
  );
  assert.deepEqual(
    lib.thumbnailIriamSquareEnTitleAssetsByGenre[genre].map((asset) => path.basename(asset.src)),
    assets.map((asset) => path.basename(asset.src)),
    `${genre} English title registry points at its exported asset list`
  );

  for (const asset of assets) {
    assert.equal(asset.genre, genre, `${genre} English title asset carries its square title genre`);
    assert.equal(asset.titleText, meta.titleText, `${genre} English title asset records the final wording`);
    assert.equal(asset.fontFamily, meta.fontFamily, `${genre} English title asset records the selected Google Font`);
    assert.equal(asset.source, "generated-title-image", `${genre} English title asset is treated as a generated transparent PNG layer candidate`);
    assert.equal(Object.hasOwn(asset, "storageId"), false, `${genre} English title asset does not mix user storage ids into project assets`);
    assert.equal(Object.hasOwn(asset, "materialRef"), false, `${genre} English title asset does not mix user material refs into project assets`);

    const publicPath = path.join(root, "public", asset.src.replace(/^\//, ""));
    assert.equal(fs.existsSync(publicPath), true, `${path.basename(asset.src)} production English title image exists`);
    assert.deepEqual(readPngSize(publicPath), { width: 760, height: 320 }, `${path.basename(asset.src)} keeps the title image layer size`);
    assert.ok(fs.statSync(publicPath).size < 160_000, `${path.basename(asset.src)} stays reasonably lightweight`);
  }

  assert.equal(
    lib.getThumbnailIriamSquareTitleAsset(genre, "purple", "pink-blue", "en")?.src,
    `${meta.prefix}${meta.filePrefix}-square-en-title-purple-v1.png`,
    `${genre} generic square title helper resolves English purple title by locale`
  );
  assert.equal(
    lib.getThumbnailIriamSquareTitleAsset(genre, "match-background", "mint", "en")?.src,
    `${meta.prefix}${meta.filePrefix}-square-en-title-mint-v1.png`,
    `${genre} generic square title helper can match the English background colorway`
  );
}

assert.equal(
  lib.createDraftFromPresetVariant("karaoke", "square-1-1", "en").layers.some((layer) => layer.type === "image" && layer.src === `${karaokeTitlePrefix}karaoke-square-en-title-pink-blue-v1.png`),
  true,
  "English square variant draft starts with the English karaoke title image"
);
assert.equal(
  lib.createDraftFromPresetVariant("karaoke", "square-1-1", "ja").layers.some((layer) => layer.type === "image" && layer.src === `${karaokeTitlePrefix}karaoke-square-title-pink-blue-v1.png`),
  true,
  "Japanese square variant draft keeps the Japanese karaoke title image"
);
assert.equal(
  lib.createDraftFromPresetVariant("karaoke", "square-1-1").layers.some((layer) => layer.type === "image" && layer.src === `${karaokeTitlePrefix}karaoke-square-title-pink-blue-v1.png`),
  true,
  "default square variant draft remains Japanese"
);

assert.equal(
  lib.thumbnailPresets.some((preset) => preset.id === "dark_gacha"),
  true,
  "dark gacha title registration now connects to a dedicated square preset body"
);
assert.equal(
  source.includes("createChattingIriamSquareDraft"),
  true,
  "chatting title registration has a follow-up square preset body"
);
assert.equal(
  source.includes("createFirstStreamIriamSquareDraft"),
  true,
  "first_stream title registration has a follow-up square preset body"
);
assert.equal(
  source.includes("createEnduranceStreamIriamSquareDraft"),
  true,
  "endurance_stream title registration has a follow-up square preset body"
);

console.log("thumbnail iriam square title asset boundary contract checks passed");
