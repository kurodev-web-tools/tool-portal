import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const componentSource = fs.readFileSync(path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx"), "utf8");
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

assert.equal(typeof lib.normalizeThumbnailLayerName, "function", "layer name normalizer exists");
assert.equal(typeof lib.createThumbnailDuplicateLayerName, "function", "duplicate layer name helper exists");

assert.equal(lib.normalizeThumbnailLayerName("  曜日列  ", "fallback"), "曜日列", "normalizer trims layer names");
assert.equal(lib.normalizeThumbnailLayerName("", "fallback"), "fallback", "normalizer falls back for empty names");
assert.equal(lib.normalizeThumbnailLayerName("x".repeat(80), "fallback").length, 40, "normalizer caps names at 40 chars");

assert.equal(
  lib.createThumbnailDuplicateLayerName("曜日列", ["曜日列", "曜日列 コピー"]),
  "曜日列 コピー 2",
  "duplicate helper increments existing copy names"
);
assert.equal(
  lib.createThumbnailDuplicateLayerName("曜日列 コピー", ["曜日列", "曜日列 コピー", "曜日列 コピー 2"]),
  "曜日列 コピー 3",
  "duplicate helper does not create copy copy copy names"
);
assert.equal(
  lib.createThumbnailDuplicateLayerName("テキスト 3（サブ） コピー コピー コピー", [
    "テキスト 3（サブ）",
    "テキスト 3（サブ） コピー"
  ]),
  "テキスト 3（サブ） コピー 2",
  "duplicate helper collapses legacy copy-copy suffixes"
);

const weekly = lib.thumbnailPresets.find((preset) => preset.id === "weekly_schedule");
assert.ok(weekly, "weekly schedule preset exists");
const weeklyDayNames = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];
const weeklyDraftRowY = {
  月曜: 75,
  火曜: 159,
  水曜: 238,
  木曜: 315,
  金曜: 393,
  土曜: 474,
  日曜: 555
};
const weeklyColumnNames = ["曜日", "時間", "予定"];
const weeklyLayerByName = (name) => {
  const layer = weekly.layers.find((item) => item.name === name);
  assert.ok(layer, `weekly preset has ${name}`);
  return layer;
};

const assertPlacement = (layer, expected, label) => {
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(layer[key], value, `${label} ${key} matches the saved weekly draft placement`);
  }
};

for (const dayName of weeklyDayNames) {
  const dayLayers = weekly.layers.filter((layer) => layer.type === "text" && layer.name.startsWith(`${dayName} / `));
  assert.equal(dayLayers.length, 3, `weekly preset has three split text layers for ${dayName}`);
  for (const columnName of weeklyColumnNames) {
    assert.ok(dayLayers.some((layer) => layer.name === `${dayName} / ${columnName}`), `weekly preset has ${dayName} ${columnName} layer`);
  }
  assert.equal(new Set(dayLayers.map((layer) => layer.y)).size, 1, `${dayName} split layers share the same y position`);
  const weekdayLayer = dayLayers.find((layer) => layer.name === `${dayName} / 曜日`);
  const timeLayer = dayLayers.find((layer) => layer.name === `${dayName} / 時間`);
  const detailLayer = dayLayers.find((layer) => layer.name === `${dayName} / 予定`);
  assert.equal(weekdayLayer.y, weeklyDraftRowY[dayName], `${dayName} weekday y matches the saved weekly draft placement`);
  assert.equal(timeLayer.y, weeklyDraftRowY[dayName], `${dayName} time y matches the saved weekly draft placement`);
  assert.equal(detailLayer.y, weeklyDraftRowY[dayName], `${dayName} detail y matches the saved weekly draft placement`);
  assert.equal(weekdayLayer.height, 52, `${dayName} weekday height matches the saved weekly draft placement`);
  assert.equal(timeLayer.height, 52, `${dayName} time height matches the saved weekly draft placement`);
  assert.equal(detailLayer.height, 52, `${dayName} detail height matches the saved weekly draft placement`);
  assert.equal(weekdayLayer.x, 670, `${dayName} weekday x matches the saved weekly draft placement`);
  assert.equal(timeLayer.x, 770, `${dayName} time x matches the saved weekly draft placement`);
  assert.equal(detailLayer.x, 890, `${dayName} detail x matches the saved weekly draft placement`);
  assert.ok(detailLayer.width >= 320, `${dayName} detail column has enough room for longer schedule text`);
  assert.ok(detailLayer.x + detailLayer.width <= 1230, `${dayName} detail column stays inside the right-side safe area`);
}

assertPlacement(weeklyLayerByName("図形 3（立ち絵挿入ガイド）"), { x: 80, y: 505, width: 510, height: 155 }, "standee guide");
const weeklyHeadline = weeklyLayerByName("テキスト 1（見出し）");
assertPlacement(weeklyHeadline, { x: 50, y: 185, width: 530, height: 240 }, "weekly headline");
assert.equal(weeklyHeadline.align, "center", "weekly headline defaults to centered text");
assert.equal(weeklyHeadline.bold, true, "weekly headline defaults to bold text");
assert.equal(weeklyHeadline.italic, true, "weekly headline defaults to italic text");
assertPlacement(weeklyLayerByName("図形 2（ラベル）"), { x: 150, y: 115, width: 345, height: 60 }, "weekly label shape");
assertPlacement(weeklyLayerByName("テキスト 4（ラベル）"), { x: 190, y: 130, width: 270, height: 35 }, "weekly label text");
assertPlacement(weeklyLayerByName("図形 1（週範囲バッジ）"), { x: 205, y: 400, width: 220, height: 65 }, "weekly range badge");
assertPlacement(weeklyLayerByName("テキスト 2（時刻）"), { x: 240, y: 415, width: 245, height: 40 }, "weekly range text");
assert.ok(
  weekly.layers.every((layer) => !["曜日列", "時刻列", "内容列"].some((label) => layer.name.includes(label))),
  "weekly preset does not use column-only layer names"
);
assert.equal(
  weekly.layers.filter((layer) => layer.type === "text" && weeklyDayNames.some((dayName) => layer.name.startsWith(`${dayName} / `))).length,
  21,
  "weekly preset has 21 split schedule row layers"
);
assert.ok(
  weekly.layers.every((layer) => !/コピー\s*コピー/.test(layer.name)),
  "weekly preset layer names are not copy-copy artifacts"
);

assert.ok(componentSource.includes("getWeeklyScheduleLayerGroup"), "layer panel has weekly schedule grouping helper");
assert.ok(componentSource.includes("aria-expanded={"), "layer panel renders accordion buttons");
assert.ok(componentSource.includes("max-h-[min(52vh,560px)] overflow-y-auto"), "layer panel has an independent scroll area");
assert.ok(componentSource.includes("[group.id]: !collapsed"), "accordion toggles from the rendered collapsed state");
assert.ok(!componentSource.includes('>{collapsed ? "開く" : "閉じる"}</span>'), "accordion uses icon affordance instead of open-close text labels");
assert.ok(componentSource.includes('aria-label={`${group.label}グループを${collapsed ? "開く" : "閉じる"}`'), "accordion keeps an accessible open-close label");

console.log("thumbnail layer management contract checks passed");
