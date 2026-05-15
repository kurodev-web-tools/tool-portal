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

const placementSpecs = [
  {
    id: "stream_announce",
    mock: "docs/mockups/thumbnail-editor-phase1/stream-announce-mock.png",
    layers: [
      ["テキスト 1（見出し）", { x: 64, y: 134, width: 700, height: 268, fontSize: 116 }],
      ["画像 7（時刻バッジ土台）", { x: 44, y: 420, width: 704, height: 166, rotation: -2 }],
      ["テキスト 2（時刻）", { x: 136, y: 474, width: 520, height: 64, fontSize: 60 }],
      ["テキスト 3（サブ）", { x: 132, y: 606, width: 588, height: 46, fontSize: 34 }],
      ["図形 3（立ち絵挿入ガイド）", { x: 806, y: 86, width: 360, height: 530, opacity: 0.34 }]
    ]
  },
  {
    id: "weekly_schedule",
    mock: "docs/mockups/thumbnail-editor-phase1/weekly-schedule-mock.png",
    layers: [
      ["図形 4（予定表フレーム）", { x: 640, y: 54, width: 560, height: 556, opacity: 0.3 }],
      ["月曜 / 曜日", { x: 686, y: 75, width: 108, height: 52, fontSize: 34 }],
      ["月曜 / 時間", { x: 806, y: 75, width: 126, height: 52, fontSize: 34 }],
      ["月曜 / 予定", { x: 952, y: 75, width: 220, height: 52, fontSize: 34 }],
      ["図形 3（立ち絵挿入ガイド）", { x: 70, y: 536, width: 404, height: 118, opacity: 0.34 }]
    ]
  },
  {
    id: "game_live",
    mock: "docs/mockups/thumbnail-editor-phase2-candidates/game-live-mock.png",
    layers: [
      ["図形 3（立ち絵guide枠）", { x: 780, y: 104, width: 360, height: 500, opacity: 0.36 }],
      ["画像 5（時刻バッジ土台）", { x: 44, y: 486, width: 430, height: 162, opacity: 0.94 }],
      ["テキスト 2（時刻）", { x: 82, y: 536, width: 330, height: 52, fontSize: 46 }],
      ["テキスト 3（サブ）", { x: 78, y: 632, width: 560, height: 42, fontSize: 31 }]
    ]
  },
  {
    id: "announcement",
    mock: "docs/mockups/thumbnail-editor-phase2-candidates/announcement-mock.png",
    layers: [
      ["図形 3（立ち絵guide枠）", { x: 930, y: 152, width: 228, height: 430, opacity: 0.28 }],
      ["テキスト 1（見出し）", { x: 126, y: 168, width: 610, height: 224, fontSize: 82 }],
      ["テキスト 2（時刻）", { x: 194, y: 464, width: 390, height: 54, fontSize: 47 }]
    ]
  },
  {
    id: "clip",
    mock: "docs/mockups/thumbnail-editor-phase3-candidates/clip-mock.png",
    layers: [
      ["図形 8（動画フレーム）", { x: 204, y: 148, width: 514, height: 300, rotation: -5, opacity: 0.72 }],
      ["テキスト 4（ラベル）", { x: 104, y: 84, width: 238, height: 48, rotation: -5, fontSize: 44 }],
      ["テキスト 1（見出し）", { x: 566, y: 402, width: 478, height: 156, rotation: -2, fontSize: 74 }],
      ["テキスト 2（時刻）", { x: 756, y: 302, width: 228, height: 48, rotation: 2, fontSize: 39 }]
    ]
  },
  {
    id: "x_announcement",
    mock: "docs/mockups/thumbnail-editor-phase3-candidates/x-announcement-mock.png",
    layers: [
      ["図形 7（本文カード）", { x: 148, y: 218, width: 650, height: 300, opacity: 0.5 }],
      ["図形 3（立ち絵guide枠）", { x: 936, y: 142, width: 190, height: 440, opacity: 0.18 }],
      ["テキスト 1（見出し）", { x: 180, y: 286, width: 560, height: 86, fontSize: 66 }],
      ["テキスト 2（時刻）", { x: 348, y: 548, width: 216, height: 42, fontSize: 38 }]
    ]
  },
  {
    id: "endurance_stream",
    mock: "docs/mockups/thumbnail-editor-usecase-preset-candidates/endurance-stream-mock.png",
    layers: [
      ["画像 13（時刻バッジ土台）", { x: 36, y: 42, width: 270, height: 180, opacity: 0.98 }],
      ["テキスト 2（時刻）", { x: 76, y: 104, width: 190, height: 48, fontSize: 39 }],
      ["画像 10（ラベル土台）", { x: 604, y: 42, width: 454, height: 303, opacity: 0.98 }],
      ["テキスト 1（見出し）", { x: 64, y: 184, width: 760, height: 188, fontSize: 154 }],
      ["画像 11（目標バッジ土台）", { x: 96, y: 390, width: 706, height: 226, opacity: 0.98 }],
      ["画像 12（進捗ディバイダー）", { x: 28, y: 600, width: 780, height: 130, opacity: 0.96 }]
    ]
  },
  {
    id: "privacy_notice",
    layers: [
      ["テキスト 1（見出し）", { x: 124, y: 190, width: 656, height: 120, fontSize: 88 }],
      ["画像 2（プライバシー目隠しバー）", { x: 778, y: 130, width: 390, height: 68, opacity: 0.96 }],
      ["画像 3（プライバシー目隠しパネル）", { x: 824, y: 472, width: 354, height: 197, opacity: 0.9 }]
    ]
  },
  {
    id: "whiteboard_plan",
    layers: [
      ["テキスト 1（見出し）", { x: 88, y: 174, width: 880, height: 100, fontSize: 78 }],
      ["テキスト 3（サブ）", { x: 92, y: 336, width: 820, height: 58, fontSize: 42 }],
      ["テキスト 2（時刻）", { x: 92, y: 512, width: 420, height: 54, fontSize: 44 }]
    ]
  }
];

const numericKeys = ["x", "y", "width", "height", "rotation", "opacity", "fontSize"];

for (const spec of placementSpecs) {
  if (spec.mock) {
    assert.equal(fs.existsSync(path.join(root, spec.mock)), true, `${spec.id} placement mock exists`);
  }

  const preset = lib.thumbnailPresets.find((item) => item.id === spec.id);
  assert.ok(preset, `${spec.id} preset exists`);
  const draft = lib.createDraftFromPreset(spec.id);
  assert.equal(draft.canvas.width, 1280, `${spec.id} uses 16:9 HD width`);
  assert.equal(draft.canvas.height, 720, `${spec.id} uses 16:9 HD height`);

  for (const [layerName, expected] of spec.layers) {
    const layer = draft.layers.find((item) => item.name === layerName);
    assert.ok(layer, `${spec.id} keeps adjustable layer ${layerName}`);
    for (const key of numericKeys) {
      if (key in expected) {
        assert.equal(layer[key], expected[key], `${spec.id} ${layerName} ${key} matches mock placement target`);
      }
    }
    assert.ok(layer.x >= -160, `${spec.id} ${layerName} does not start far outside the canvas`);
    assert.ok(layer.y >= -120, `${spec.id} ${layerName} does not start far above the canvas`);
    assert.ok(layer.x + layer.width <= 1360, `${spec.id} ${layerName} does not overflow the right edge badly`);
    assert.ok(layer.y + layer.height <= 760, `${spec.id} ${layerName} does not overflow the bottom edge badly`);
  }
}

const clip = lib.thumbnailPresets.find((item) => item.id === "clip");
const clipFrameIndex = clip.layers.findIndex((layer) => layer.name === "図形 8（動画フレーム）");
const clipTitleIndex = clip.layers.findIndex((layer) => layer.name === "テキスト 1（見出し）");
assert.ok(clipFrameIndex > -1 && clipFrameIndex < clipTitleIndex, "clip video frame sits below the title text in layer order");

console.log("thumbnail preset placement polish contract checks passed");
