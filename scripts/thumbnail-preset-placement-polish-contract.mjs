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
      ["画像 4（見出し左下アクセント）", { x: -42, y: 355, width: 292, height: 195, rotation: -9 }],
      ["画像 5（見出し右アクセント）", { x: 627, y: 346, width: 224, height: 149, rotation: 129.76169454987416 }],
      ["図形 4（ラベル横ライン）", { x: 446, y: 112, width: 310, height: 16, opacity: 0.64 }],
      ["画像 6（ラベル土台）", { x: 73, y: 0, width: 438, height: 200, opacity: 0.98 }],
      ["テキスト 1（見出し）", { x: 133, y: 137, width: 700, height: 268, fontSize: 116 }],
      ["画像 7（時刻バッジ土台）", { x: 90, y: 233, width: 683, height: 532, rotation: -2 }],
      ["テキスト 2（時刻）", { x: 265, y: 466, width: 249, height: 55, rotation: -2.670047202154523, fontSize: 80 }],
      ["テキスト 3（サブ）", { x: 132, y: 606, width: 588, height: 46, fontSize: 34 }],
      ["図形 3（立ち絵挿入ガイド）", { x: 806, y: 86, width: 360, height: 530, opacity: 0.34 }]
    ]
  },
  {
    id: "karaoke",
    mock: "docs/mockups/thumbnail-editor-phase1/karaoke-mock.png",
    layers: [
      ["画像 2（ピンク三角アクセント）", { x: -104, y: 48, width: 390, height: 260, opacity: 0.62 }],
      ["画像 4（ピンク音符）", { x: -34, y: 327, width: 260, height: 173, rotation: -7, opacity: 0.78 }],
      ["画像 6（右立ち絵枠の発光）", { x: 608, y: -44, width: 830, height: 842, opacity: 0.96, maxRight: 1440, maxBottom: 805 }],
      ["図形 3（立ち絵挿入ガイド）", { x: 825, y: 73, width: 390, height: 590, opacity: 0.34 }],
      ["図形 2（ラベル横ライン）", { x: 397, y: 112, width: 209, height: 16, opacity: 0.62 }],
      ["画像 7（ラベル土台）", { x: 26, y: -17, width: 507, height: 249, opacity: 0.98 }],
      ["テキスト 4（ラベル）", { x: 156, y: 82, width: 263, height: 42, fontSize: 35 }],
      ["テキスト 1（見出し）", { x: 173, y: 171, width: 640, height: 230, fontSize: 184 }],
      ["テキスト 5（見出し英字）", { x: 80, y: 408, width: 610, height: 70, fontSize: 54 }],
      ["画像 8（時刻バッジ土台）", { x: 67, y: 386, width: 619, height: 337, opacity: 0.98 }],
      ["図形 5（時刻下ライン）", { x: 158, y: 612, width: 470, height: 16, opacity: 0.38 }],
      ["テキスト 2（時刻）", { x: 224, y: 524, width: 311, height: 68, fontSize: 70 }],
      ["テキスト 3（サブ）", { x: 61, y: 633, width: 610, height: 52, fontSize: 38 }]
    ]
  },
  {
    id: "first_stream",
    mock: "docs/mockups/thumbnail-editor-usecase-preset-candidates/first-stream-mock.png",
    layers: [
      ["画像 2（右立ち絵枠の発光）", { x: 441, y: -36, width: 1026, height: 868, opacity: 0.82, maxRight: 1500, maxBottom: 860 }],
      ["図形 3（立ち絵挿入ガイド）", { x: 797, y: 114, width: 333, height: 549, opacity: 0.34 }],
      ["図形 4（ラベル横ライン）", { x: 448, y: 126, width: 238, height: 16, opacity: 0.6 }],
      ["画像 7（ラベル土台）", { x: -27, y: -31, width: 708, height: 276, opacity: 0.98 }],
      ["テキスト 4（ラベル）", { x: 168, y: 96, width: 324, height: 42, fontSize: 34 }],
      ["図形 6（見出し下ライン）", { x: 92, y: 404, width: 568, height: 16, opacity: 0.54 }],
      ["画像 8（時刻バッジ土台）", { x: 45, y: 338, width: 660, height: 313, opacity: 0.98 }],
      ["図形 5（時刻下ライン）", { x: 154, y: 610, width: 418, height: 16, opacity: 0.46 }],
      ["テキスト 2（時刻）", { x: 145, y: 470, width: 462, height: 65, fontSize: 60 }]
    ]
  },
  {
    id: "anniversary_stream",
    mock: "docs/mockups/thumbnail-editor-usecase-preset-candidates/anniversary-stream-mock.png",
    layers: [
      ["画像 4（記念バッジ）", { x: 615, y: 56, width: 292, height: 224, opacity: 0.94 }],
      ["図形 3（立ち絵挿入ガイド）", { x: 801, y: 79, width: 350, height: 564, opacity: 0.32 }],
      ["図形 4（ラベル横ライン）", { x: 189, y: 177, width: 436, height: 16, opacity: 0.52 }],
      ["テキスト 1（見出し）", { x: 132, y: 198, width: 704, height: 148, fontSize: 126 }],
      ["図形 6（見出し下ライン）", { x: 108, y: 354, width: 614, height: 16, opacity: 0.58 }],
      ["画像 7（ラベル土台）", { x: 124, y: 311, width: 596, height: 242, opacity: 0.98 }],
      ["画像 8（時刻バッジ土台）", { x: 87, y: 418, width: 639, height: 386, opacity: 0.98, maxBottom: 810 }],
      ["図形 5（時刻下ライン）", { x: 233, y: 642, width: 407, height: 16, opacity: 0.46 }],
      ["テキスト 2（時刻）", { x: 278, y: 587, width: 344, height: 54, fontSize: 52 }]
    ]
  },
  {
    id: "weekly_schedule",
    mock: "docs/mockups/thumbnail-editor-phase1/weekly-schedule-mock.png",
    layers: [
      ["画像 2（予定表アクセント）", { x: 282, y: -207, width: 1160, height: 1114, opacity: 0.5, minY: -220, maxRight: 1450, maxBottom: 920 }],
      ["画像 3（控えめな角グリント）", { x: -267, y: -100, width: 1060, height: 679, opacity: 0.5, minX: -280 }],
      ["画像 4（ラベル土台）", { x: 62, y: -24, width: 404, height: 198, opacity: 0.98 }],
      ["テキスト 4（ラベル）", { x: 111, y: 62, width: 312, height: 38, fontSize: 31 }],
      ["テキスト 1（見出し）", { x: 5, y: 145, width: 510, height: 232, fontSize: 92 }],
      ["画像 5（週範囲バッジ土台）", { x: 29, y: 307, width: 477, height: 223, opacity: 0.98 }],
      ["テキスト 2（時刻）", { x: 142, y: 401, width: 245, height: 42, fontSize: 36 }],
      ["月曜 / 曜日", { x: 550, y: 95, width: 108, height: 50, fontSize: 34 }],
      ["月曜 / 時間", { x: 720, y: 95, width: 126, height: 52, fontSize: 34 }],
      ["月曜 / 予定", { x: 930, y: 95, width: 220, height: 52, fontSize: 34 }],
      ["日曜 / 曜日", { x: 550, y: 565, width: 108, height: 50, fontSize: 34 }],
      ["日曜 / 時間", { x: 720, y: 565, width: 126, height: 52, fontSize: 34 }],
      ["日曜 / 予定", { x: 930, y: 565, width: 220, height: 52, fontSize: 34 }],
      ["図形 3（立ち絵挿入ガイド）", { x: 60, y: 479, width: 407, height: 220, opacity: 0.34 }]
    ]
  },
  {
    id: "game_live",
    mock: "docs/mockups/thumbnail-editor-phase2-candidates/game-live-mock.png",
    layers: [
      ["画像 3（立ち絵guideのHUD角）", { x: 632, y: 13, width: 744, height: 636, opacity: 0.66, maxRight: 1380 }],
      ["図形 3（立ち絵guide枠）", { x: 820, y: 82, width: 360, height: 500, opacity: 0.36 }],
      ["画像 2（スピードアクセント）", { x: 393, y: 432, width: 350, height: 234, rotation: -7, opacity: 1 }],
      ["図形 6（ゲーム感ライン）", { x: 416, y: 112, width: 319, height: 16, opacity: 0.64 }],
      ["画像 4（ラベル土台）", { x: 31, y: -45, width: 522, height: 346, opacity: 0.96 }],
      ["テキスト 1（見出し）", { x: 82, y: 212, width: 664, height: 266, fontSize: 108 }],
      ["画像 5（時刻バッジ土台）", { x: -60, y: 418, width: 625, height: 242, opacity: 0.94 }],
      ["図形 2（時刻下ライン）", { x: 94, y: 604, width: 330, height: 16, opacity: 0.58 }],
      ["テキスト 2（時刻）", { x: 92, y: 519, width: 330, height: 52, fontSize: 46 }],
      ["テキスト 3（サブ）", { x: -23, y: 624, width: 560, height: 42, fontSize: 31 }]
    ]
  },
  {
    id: "collaboration",
    layers: [
      ["画像 3（接続アクセント）", { x: 209, y: -15, width: 1376, height: 1076, opacity: 0.3, maxRight: 1600, maxBottom: 1080 }],
      ["図形 1（左立ち絵ガイド）", { x: 926, y: 143, width: 292, height: 452, opacity: 0.42 }],
      ["図形 2（右立ち絵ガイド）", { x: 599, y: 143, width: 300, height: 452, opacity: 0.42 }],
      ["画像 4（ラベル土台）", { x: 65, y: -32, width: 467, height: 251, opacity: 0.98 }],
      ["テキスト 4（ラベル）", { x: 179, y: 75, width: 250, height: 44, fontSize: 42 }],
      ["テキスト 1（見出し）", { x: -3, y: 189, width: 590, height: 248, fontSize: 112 }],
      ["画像 5（時刻バッジ土台）", { x: 19, y: 343, width: 568, height: 339, opacity: 0.96 }],
      ["テキスト 3（サブ）", { x: 62, y: 586, width: 490, height: 50, fontSize: 35 }]
    ]
  },
  {
    id: "announcement",
    mock: "docs/mockups/thumbnail-editor-phase2-candidates/announcement-mock.png",
    layers: [
      ["画像 3（角飾り）", { x: 181, y: 181, width: 155, height: 104, opacity: 0.5 }],
      ["画像 3（角飾り） コピー", { x: 590, y: 323, width: 155, height: 104, rotation: 179.92572478013122, opacity: 0.5 }],
      ["図形 3（立ち絵guide枠）", { x: 930, y: 152, width: 228, height: 430, opacity: 0.28 }],
      ["画像 5（ラベル土台）", { x: 150, y: 29, width: 200, height: 128, opacity: 0.98 }],
      ["テキスト 4（ラベル）", { x: 158, y: 78, width: 190, height: 40, fontSize: 34 }],
      ["テキスト 1（見出し）", { x: 254, y: 208, width: 392, height: 203, fontSize: 82 }],
      ["画像 6（日付バッジ）", { x: 172, y: 353, width: 574, height: 251, opacity: 0.98 }],
      ["テキスト 2（時刻）", { x: 254, y: 453, width: 390, height: 54, fontSize: 47 }],
      ["図形 6（サブ下ライン）", { x: 178, y: 616, width: 390, height: 16, opacity: 0.48 }],
      ["テキスト 3（サブ）", { x: 203, y: 550, width: 520, height: 52, fontSize: 34 }]
    ]
  },
  {
    id: "clip",
    mock: "docs/mockups/thumbnail-editor-phase3-candidates/clip-mock.png",
    layers: [
      ["画像 2（小さな破片候補）", { x: 975, y: 17, width: 360, height: 240, rotation: -4, opacity: 1 }],
      ["図形 8（動画フレーム）", { x: 90, y: 145, width: 825, height: 469, rotation: -6.828551922652353, opacity: 0.72 }],
      ["画像 3（衝撃マーク）", { x: 824, y: 58, width: 168, height: 112, rotation: 9, opacity: 1 }],
      ["画像 4（矢印アクセント）", { x: 382, y: 540, width: 264, height: 176, rotation: -7.4388855438519, opacity: 1 }],
      ["画像 5（見出しステッカー土台）", { x: 540, y: 343, width: 600, height: 400, rotation: -2, opacity: 0.96 }],
      ["図形 1（見出し下線）", { x: 681, y: 605, width: 342, height: 18, rotation: -2, opacity: 0.84 }],
      ["テキスト 4（ラベル）", { x: 137, y: 144, width: 238, height: 48, rotation: -5, fontSize: 44 }],
      ["テキスト 1（見出し）", { x: 616, y: 470, width: 478, height: 156, rotation: -2, fontSize: 74 }],
      ["画像 7（時刻バッジ土台）", { x: 733, y: 203, width: 374, height: 249, rotation: 2, opacity: 0.98 }],
      ["テキスト 2（時刻）", { x: 812, y: 303, width: 228, height: 48, rotation: -2.466059199935571, fontSize: 39 }],
      ["テキスト 3（サブ）", { x: 588, y: 632, width: 540, height: 44, rotation: -2.7616696896097266, fontSize: 31 }]
    ]
  },
  {
    id: "x_announcement",
    mock: "docs/mockups/thumbnail-editor-phase3-candidates/x-announcement-mock.png",
    layers: [
      ["図形 3（立ち絵guide枠）", { x: 936, y: 142, width: 190, height: 440, opacity: 0.18 }],
      ["図形 7（本文カード）", { x: 120, y: 214, width: 650, height: 300, opacity: 0.5 }],
      ["画像 3（角飾り）", { x: 99, y: 427, width: 138, height: 92, opacity: 1 }],
      ["画像 3（角飾り） コピー", { x: 96, y: 212, width: 138, height: 92, rotation: 89.51333367717555, opacity: 1 }],
      ["画像 3（角飾り） コピー 2", { x: 659, y: 209, width: 138, height: 92, rotation: -179.16078283456477, opacity: 1 }],
      ["画像 3（角飾り） コピー 3", { x: 657, y: 427, width: 138, height: 92, rotation: -89.82275489153494, opacity: 1 }],
      ["画像 5（ラベル土台）", { x: 247, y: 75, width: 384, height: 181, opacity: 0.98 }],
      ["テキスト 1（見出し）", { x: 215, y: 269, width: 560, height: 86, fontSize: 66 }],
      ["図形 5（本文罫線）", { x: 147, y: 348, width: 604, height: 16, opacity: 0.54 }],
      ["テキスト 3（サブ）", { x: 165, y: 405, width: 564, height: 44, fontSize: 31 }],
      ["図形 6（サブ下ライン）", { x: 254, y: 453, width: 392, height: 16, opacity: 0.38 }],
      ["画像 6（日付バッジ）", { x: 253, y: 467, width: 407, height: 197, opacity: 0.98 }],
      ["テキスト 2（時刻）", { x: 348, y: 548, width: 216, height: 42, fontSize: 38 }]
    ]
  },
  {
    id: "endurance_stream",
    mock: "docs/mockups/thumbnail-editor-usecase-preset-candidates/endurance-stream-mock.png",
    layers: [
      ["画像 2（右上フレーム角）", { x: 880, y: -53, width: 560, height: 373, opacity: 1, maxRight: 1440 }],
      ["画像 3（右下フレーム角）", { x: 864, y: 398, width: 560, height: 373, rotation: 180, opacity: 1, maxRight: 1440, maxBottom: 780 }],
      ["画像 4（左上フレーム角）", { x: -135, y: -47, width: 520, height: 347, opacity: 1 }],
      ["画像 5（左下フレーム角）", { x: -151, y: 421, width: 520, height: 347, rotation: 180, opacity: 1 }],
      ["図形 3（立ち絵挿入ガイド）", { x: 851, y: 97, width: 332, height: 548, opacity: 0.34 }],
      ["テキスト 4（ラベル）", { x: 703, y: 173, width: 244, height: 48, fontSize: 42 }],
      ["テキスト 1（見出し）", { x: 64, y: 198, width: 760, height: 188, fontSize: 154 }],
      ["画像 11（目標バッジ土台）", { x: 90, y: 299, width: 705, height: 374, opacity: 0.98 }],
      ["画像 13（時刻バッジ土台）", { x: 60, y: 38, width: 270, height: 180, opacity: 0.98 }],
      ["テキスト 2（時刻）", { x: 91, y: 105, width: 190, height: 48, fontSize: 39 }],
      ["画像 10（ラベル土台）", { x: 604, y: 42, width: 454, height: 303, opacity: 0.98 }],
      ["画像 12（進捗ディバイダー）", { x: 28, y: 600, width: 780, height: 130, opacity: 0.96 }]
    ]
  },
  {
    id: "project_stream",
    mock: "docs/mockups/thumbnail-editor-usecase-preset-candidates/project-stream-mock.png",
    layers: [
      ["画像 4（ラベル土台）", { x: -37, y: 7, width: 684, height: 233, rotation: -5, opacity: 0.98 }],
      ["テキスト 5（英字）", { x: 111, y: 98, width: 404, height: 48, rotation: -7.913055327753359, fontSize: 41 }],
      ["テキスト 1（見出し）", { x: 162, y: 198, width: 650, height: 198, fontSize: 166 }],
      ["画像 5（サブ用キューカード）", { x: 79, y: 305, width: 681, height: 495, rotation: -3, opacity: 0.98, maxBottom: 805 }],
      ["画像 6（参加ラベル用カード）", { x: 28, y: 550, width: 346, height: 222, rotation: 1, opacity: 0.98, maxBottom: 775 }],
      ["画像 7（時刻カード土台）", { x: 438, y: 524, width: 461, height: 243, rotation: -1, opacity: 0.98 }],
      ["画像 10（時刻カードタブ）", { x: 595, y: 505, width: 128, height: 85, rotation: -2, opacity: 0.94 }],
      ["テキスト 4（ラベル）", { x: 81, y: 645, width: 236, height: 42, fontSize: 33 }]
    ]
  },
  {
    id: "cover_song_notice",
    mock: "docs/mockups/thumbnail-editor-usecase-preset-candidates/cover-song-notice-mock.png",
    layers: [
      ["画像 2（カバーアート枠）", { x: 502, y: 56, width: 929, height: 613, opacity: 0.92, maxRight: 1440 }],
      ["図形 3（カバーアート挿入ガイド）", { x: 759, y: 138, width: 430, height: 430, opacity: 0.28 }],
      ["図形 4（立ち絵挿入ガイド）", { x: 1024, y: 430, width: 142, height: 150, opacity: 0.32 }],
      ["テキスト 5（カバーアート注記）", { x: 832, y: 335, width: 274, height: 38, fontSize: 29 }],
      ["画像 3（プレミアバッジ土台）", { x: 184, y: 15, width: 481, height: 289, opacity: 0.96 }],
      ["テキスト 4（ラベル）", { x: 288, y: 146, width: 274, height: 42, fontSize: 36 }],
      ["画像 4（左上きらめき）", { x: -82, y: 45, width: 403, height: 259, rotation: -9, opacity: 0.78 }],
      ["画像 5（右上きらめき）", { x: 501, y: 328, width: 312, height: 249, rotation: 18.772374617834746, opacity: 0.58 }],
      ["テキスト 1（見出し）", { x: 51, y: 227, width: 650, height: 176, fontSize: 134 }],
      ["画像 7（時刻ラベル土台）", { x: 63, y: 370, width: 660, height: 440, opacity: 0.98, maxBottom: 815 }],
      ["画像 6（サウンドウェーブ）", { x: 90, y: 430, width: 592, height: 395, opacity: 0.86, maxBottom: 830 }],
      ["図形 5（時刻下ライン）", { x: 216, y: 629, width: 342, height: 16, opacity: 0.62 }]
    ]
  },
  {
    id: "event_notice",
    mock: "docs/mockups/thumbnail-editor-usecase-preset-candidates/event-notice-mock.png",
    layers: [
      ["画像 2（キービジュアル枠）", { x: 279, y: 21, width: 1389, height: 698, opacity: 0.9, maxRight: 1670 }],
      ["図形 3（キービジュアル挿入ガイド）", { x: 790, y: 97, width: 354, height: 492, opacity: 0.28 }],
      ["テキスト 5（キービジュアル注記）", { x: 858, y: 364, width: 238, height: 40, fontSize: 30 }],
      ["テキスト 1（見出し）", { x: 4, y: 163, width: 674, height: 150, fontSize: 118 }],
      ["図形 5（見出し下ライン）", { x: 135, y: 288, width: 520, height: 16, opacity: 0.72 }],
      ["画像 6（日付チケットバッジ）", { x: 107, y: 231, width: 558, height: 372, rotation: -2, opacity: 0.98 }],
      ["テキスト 2（時刻）", { x: 211, y: 383, width: 344, height: 74, rotation: -3.7852430235988384, fontSize: 69 }],
      ["画像 7（参加情報バンド）", { x: -20, y: 365, width: 796, height: 526, opacity: 0.96, maxBottom: 895 }],
      ["画像 8（マップラインディバイダー）", { x: 76, y: 417, width: 646, height: 397, rotation: -2, opacity: 0.78, maxBottom: 815 }],
      ["テキスト 3（サブ）", { x: 99, y: 584, width: 540, height: 58, fontSize: 47 }],
      ["図形 6（情報区切りライン）", { x: 134, y: 586, width: 470, height: 16, opacity: 0.62 }]
    ]
  },
  {
    id: "privacy_notice",
    mock: "docs/mockups/thumbnail-editor-usecase-preset-candidates/privacy-notice-mock.png",
    layers: [
      ["画像 2（ラベル土台）", { x: 229, y: 28, width: 410, height: 170, opacity: 0.98 }],
      ["画像 3（見出しカード）", { x: 48, y: 108, width: 720, height: 360, opacity: 0.98 }],
      ["画像 4（サブ情報カード）", { x: -9, y: 288, width: 900, height: 457, opacity: 0.96 }],
      ["画像 5（プライバシー目隠しバー）", { x: 758, y: 125, width: 520, height: 210, rotation: -4.321548693397255, opacity: 0.96 }],
      ["画像 6（プライバシー目隠しパネル）", { x: 533, y: 303, width: 912, height: 340, opacity: 0.9, maxRight: 1450 }],
      ["画像 7（プライバシーロックバッジ）", { x: 1038, y: 481, width: 232, height: 232, opacity: 0.92 }],
      ["画像 8（時刻ピル土台）", { x: 110, y: 519, width: 523, height: 242, opacity: 0.98 }],
      ["テキスト 4（ラベル）", { x: 288, y: 106, width: 300, height: 38, fontSize: 31 }],
      ["テキスト 1（見出し）", { x: 113, y: 254, width: 590, height: 100, fontSize: 82 }],
      ["テキスト 3（サブ）", { x: 256, y: 498, width: 520, height: 44, fontSize: 31 }],
      ["テキスト 2（時刻）", { x: 212, y: 624, width: 330, height: 42, fontSize: 38 }]
    ]
  },
  {
    id: "whiteboard_plan",
    layers: [
      ["テキスト 1（見出し）", { x: 88, y: 174, width: 880, height: 100, fontSize: 78 }],
      ["テキスト 3（サブ）", { x: 92, y: 336, width: 820, height: 58, fontSize: 42 }],
      ["テキスト 2（時刻）", { x: 92, y: 512, width: 420, height: 54, fontSize: 44 }]
    ]
  },
  {
    id: "chatting",
    mock: "docs/mockups/thumbnail-editor-phase3-candidates/chatting-mock.png",
    layers: [
      ["画像 2（やわらかい光粒）", { x: -124, y: -14, width: 974, height: 697, opacity: 0.28 }],
      ["図形 4（やわらかい下線）", { x: 92, y: 610, width: 474, height: 16, opacity: 0.58 }],
      ["図形 3（立ち絵挿入ガイド）", { x: 762, y: 92, width: 358, height: 528, opacity: 0.28 }],
      ["画像 3（ラベル土台）", { x: 68, y: -12, width: 358, height: 207, opacity: 0.96 }],
      ["画像 4（時刻バッジ土台）", { x: 18, y: 353, width: 558, height: 294, opacity: 0.94 }],
      ["画像 5（時刻アイコン）", { x: 103, y: 461, width: 78, height: 78, opacity: 0.96 }]
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
    assert.ok(layer.x >= (expected.minX ?? -160), `${spec.id} ${layerName} does not start far outside the canvas`);
    assert.ok(layer.y >= (expected.minY ?? -120), `${spec.id} ${layerName} does not start far above the canvas`);
    assert.ok(layer.x + layer.width <= (expected.maxRight ?? 1360), `${spec.id} ${layerName} does not overflow the right edge badly`);
    assert.ok(layer.y + layer.height <= (expected.maxBottom ?? 768), `${spec.id} ${layerName} does not overflow the bottom edge badly`);
  }
}

const clip = lib.thumbnailPresets.find((item) => item.id === "clip");
const clipFrameIndex = clip.layers.findIndex((layer) => layer.name === "図形 8（動画フレーム）");
const clipTitleIndex = clip.layers.findIndex((layer) => layer.name === "テキスト 1（見出し）");
assert.ok(clipFrameIndex > -1 && clipFrameIndex < clipTitleIndex, "clip video frame sits below the title text in layer order");

const streamAnnounce = lib.thumbnailPresets.find((item) => item.id === "stream_announce");
assert.deepEqual(
  streamAnnounce.layers.map((layer) => layer.name),
  [
    "画像 1（背景）",
    "画像 2（右立ち絵枠の発光）",
    "図形 6（見出し下ライン）",
    "画像 4（見出し左下アクセント）",
    "画像 5（見出し右アクセント）",
    "図形 3（立ち絵挿入ガイド）",
    "図形 4（ラベル横ライン）",
    "画像 6（ラベル土台）",
    "テキスト 4（ラベル）",
    "画像 3（小粒スパーク）",
    "テキスト 1（見出し）",
    "画像 7（時刻バッジ土台）",
    "図形 5（時刻下ライン）",
    "テキスト 2（時刻）",
    "テキスト 3（サブ）"
  ],
  "stream_announce layer order follows the saved manual placement draft"
);

console.log("thumbnail preset placement polish contract checks passed");
