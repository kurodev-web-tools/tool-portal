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

assert.equal(typeof lib.filterThumbnailPresets, "function", "preset filter exists");
assert.equal(typeof lib.normalizeThumbnailPresetDiscoveryState, "function", "preset discovery storage normalizer exists");
assert.equal(typeof lib.createNextRecentThumbnailPresetIds, "function", "recent preset updater exists");
assert.equal(typeof lib.toggleThumbnailPresetFavorite, "function", "favorite preset toggler exists");

const searchResult = lib.filterThumbnailPresets(lib.thumbnailPresets, {
  query: "投稿添付",
  category: "all",
  usageLabel: "all"
});
assert.deepEqual(
  searchResult.map((preset) => preset.id),
  ["x_announcement"],
  "search includes usage label"
);

const categoryResult = lib.filterThumbnailPresets(lib.thumbnailPresets, {
  query: "",
  category: "配信ジャンル",
  usageLabel: "all"
});
assert.deepEqual(
  categoryResult.map((preset) => preset.id),
  ["first_stream", "karaoke", "chatting", "game_live", "collaboration"],
  "category filter narrows presets"
);

const usageResult = lib.filterThumbnailPresets(lib.thumbnailPresets, {
  query: "",
  category: "all",
  usageLabel: "初回 / 自己紹介"
});
assert.deepEqual(
  usageResult.map((preset) => preset.id),
  ["first_stream"],
  "usage label filter narrows presets"
);

assert.deepEqual(
  lib.createNextRecentThumbnailPresetIds(["karaoke", "chatting"], "karaoke"),
  ["karaoke", "chatting"],
  "recent presets dedupe existing id"
);
assert.deepEqual(
  lib.createNextRecentThumbnailPresetIds(["stream_announce", "karaoke", "chatting", "clip", "game_live", "collaboration"], "announcement"),
  ["announcement", "stream_announce", "karaoke", "chatting", "clip", "game_live"],
  "recent presets keep only preset ids with a fixed limit"
);

assert.deepEqual(
  lib.toggleThumbnailPresetFavorite(["stream_announce"], "stream_announce"),
  [],
  "favorite toggle removes an existing preset id"
);
assert.deepEqual(
  lib.toggleThumbnailPresetFavorite(["stream_announce"], "karaoke"),
  ["stream_announce", "karaoke"],
  "favorite toggle appends a new preset id"
);

const normalized = lib.normalizeThumbnailPresetDiscoveryState({
  version: 1,
  recentPresetIds: ["missing", "karaoke", "karaoke", "x_announcement"],
  favoritePresetIds: ["clip", "unknown", "clip", "announcement"],
  image: "data:image/png;base64,should-not-be-kept"
});
assert.deepEqual(normalized.recentPresetIds, ["karaoke", "x_announcement"], "normalizer strips invalid duplicate recent ids");
assert.deepEqual(normalized.favoritePresetIds, ["clip", "announcement"], "normalizer strips invalid duplicate favorite ids");
assert.equal(Object.hasOwn(normalized, "image"), false, "normalizer does not keep image data");

console.log("thumbnail-preset-discovery contract checks passed");
