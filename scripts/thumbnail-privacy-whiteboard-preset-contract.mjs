import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
const componentSourcePath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const toolHandoffSourcePath = path.join(root, "lib", "tool-handoff.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const componentSource = fs.readFileSync(componentSourcePath, "utf8");
const toolHandoffSource = fs.readFileSync(toolHandoffSourcePath, "utf8");
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

const scopedPresets = [
  {
    id: "privacy_notice",
    name: "プライバシー告知",
    usageLabel: "予定 / 非公開情報配慮",
    expectedTexts: {
      見出し: "予定のお知らせ",
      時刻: "20:00 START",
      サブ: "詳しい内容は当日の告知で案内します",
      ラベル: "SAFE NOTICE"
    },
    expectedBackground: "/assets/images/thumbnail-editor/phase5/x-announcement-background-v1.png",
    expectedAssets: [
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-label-plaque-navy-gold-v1.png",
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-main-card-ivory-gold-v1.png",
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-sub-info-card-ivory-v1.png",
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-redaction-stack-v1.png",
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-private-panel-blue-v1.png",
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-lock-badge-medal-v1.png",
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-time-pill-navy-gold-v1.png"
    ],
    shapeName: "全体トーン"
  },
  {
    id: "whiteboard_plan",
    name: "ホワイトボード",
    usageLabel: "予定 / 説明整理",
    expectedTexts: {
      見出し: "今日の配信予定",
      時刻: "21:00 START",
      サブ: "やることを一緒に確認しよう",
      ラベル: "TODAY'S PLAN"
    },
    expectedBackground: null,
    expectedAssets: [],
    shapeName: "白板面"
  }
];

for (const scopedPreset of scopedPresets) {
  const preset = lib.thumbnailPresets.find((item) => item.id === scopedPreset.id);
  assert.ok(preset, `${scopedPreset.id} preset exists`);
  assert.equal(preset.name, scopedPreset.name, `${scopedPreset.id} keeps the display name`);
  assert.equal(preset.category, "告知画像", `${scopedPreset.id} stays in the announcement category`);
  assert.equal(preset.usageLabel, scopedPreset.usageLabel, `${scopedPreset.id} uses the scoped usage label`);
  assert.ok(preset.description.length <= 48, `${scopedPreset.id} preset card copy stays short`);

  const background = preset.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
  if (scopedPreset.expectedBackground) {
    assert.ok(background, `${scopedPreset.id} has a background image layer`);
    assert.equal(background.src, scopedPreset.expectedBackground, `${scopedPreset.id} reuses an existing phase 5 background`);
    assert.equal(fs.existsSync(path.join(root, "public", scopedPreset.expectedBackground.replace(/^\//, ""))), true, `${scopedPreset.id} background exists`);
  } else {
    assert.equal(background, undefined, `${scopedPreset.id} does not use a raster background asset`);
  }

  if (scopedPreset.expectedAssets.length > 0) {
    for (const expectedAsset of scopedPreset.expectedAssets) {
      const generatedAssetLayers = preset.layers.filter((layer) => layer.type === "image" && layer.src === expectedAsset);
      assert.equal(generatedAssetLayers.length, 1, `${scopedPreset.id} uses ${expectedAsset} once`);
      assert.equal(fs.existsSync(path.join(root, "public", expectedAsset.replace(/^\//, ""))), true, `${expectedAsset} exists`);
      assert.equal(generatedAssetLayers[0].crop, undefined, `${expectedAsset} is placed as a complete object without preset crop`);
    }
    for (const legacyAsset of [
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-redaction-bar-v1.png",
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-mask-panel-v1.png",
      "/assets/images/thumbnail-editor/decorations/phase5/privacy-lock-badge-v1.png"
    ]) {
      assert.equal(
        preset.layers.some((layer) => layer.type === "image" && layer.src === legacyAsset),
        false,
        `${scopedPreset.id} no longer uses legacy ${legacyAsset}`
      );
    }
  } else {
    assert.equal(
      preset.layers.some((layer) => layer.type === "image"),
      false,
      `${scopedPreset.id} stays free of image assets`
    );
  }

  for (const [roleName, expectedText] of Object.entries(scopedPreset.expectedTexts)) {
    const layer = preset.layers.find((item) => item.type === "text" && item.name.includes(roleName));
    assert.ok(layer, `${scopedPreset.id} has editable ${roleName} text layer`);
    assert.equal(layer.text, expectedText, `${scopedPreset.id} initial ${roleName} text matches the scoped copy`);
  }

  assert.ok(
    preset.layers.some((layer) => layer.type === "shape" && layer.name.includes(scopedPreset.shapeName)),
    `${scopedPreset.id} keeps the defining whiteboard/privacy shape editable`
  );

  if (scopedPreset.id === "whiteboard_plan") {
    const nonTextLayers = preset.layers.filter((layer) => layer.type !== "text");
    assert.deepEqual(
      nonTextLayers.map((layer) => layer.name),
      ["図形 1（白板面）"],
      "whiteboard_plan is a blank utility preset with only a plain board surface plus editable text"
    );
  }

  const draft = lib.createDraftFromPreset(scopedPreset.id);
  const normalized = lib.normalizeThumbnailDraft(draft);
  assert.ok(normalized, `${scopedPreset.id} draft normalizes`);
  assert.equal(normalized.presetId, scopedPreset.id, `${scopedPreset.id} keeps draft preset id`);
  assert.ok(normalized.layers.some((layer) => layer.type === "text" && layer.name.includes("見出し")), `${scopedPreset.id} normalized draft keeps headline`);
}

const privacyFiltered = lib.filterThumbnailPresets(lib.thumbnailPresets, {
  query: "",
  category: "all",
  usageLabel: "予定 / 非公開情報配慮"
});
assert.deepEqual(privacyFiltered.map((preset) => preset.id), ["privacy_notice"], "privacy usage label filter is unambiguous");

const whiteboardFiltered = lib.filterThumbnailPresets(lib.thumbnailPresets, {
  query: "",
  category: "all",
  usageLabel: "予定 / 説明整理"
});
assert.deepEqual(whiteboardFiltered.map((preset) => preset.id), ["whiteboard_plan"], "whiteboard usage label filter is unambiguous");

assert.match(
  componentSource,
  /通常告知、プライバシー告知、ホワイトボード/,
  "preset selection copy names the practical choices for schedule handoff"
);
assert.match(
  componentSource,
  /予定テキストはプリセット変更後も見出し、時刻、サブ、ラベルへ引き継ぎます。/,
  "handoff canvas copy explains text carryover without a modal tutorial"
);
assert.match(componentSource, /SNS分割画像へ進む/, "export panel copy keeps the thumbnail to sns next action natural");
assert.match(componentSource, /予定テキストで適用/, "handoff preset apply action stays concise");

assert.equal(toolHandoffSource.includes("privacy_notice"), false, "tool handoff payload schema does not gain preset-specific fields");
assert.equal(toolHandoffSource.includes("whiteboard_plan"), false, "tool handoff payload schema does not gain whiteboard-specific fields");
assert.equal(componentSource.includes("schema"), false, "component copy does not expose schema language to users");
assert.equal(componentSource.includes("Google Calendar"), false, "thumbnail preset pass does not introduce calendar integration copy");

console.log("thumbnail privacy / whiteboard preset contract checks passed");
