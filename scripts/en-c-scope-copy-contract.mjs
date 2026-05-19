import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const testModule = new Module(sourcePath);
  testModule.filename = sourcePath;
  testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  testModule._compile(compiled, sourcePath);
  return testModule.exports;
}

const scheduleCopy = loadTsModule("lib/schedule-calendar-copy.ts");
const thumbnailCopy = loadTsModule("lib/thumbnail-editor-copy.ts");
const snsCopy = loadTsModule("lib/sns-split-image-maker-copy.ts");
const scheduleSource = read("components/schedule-calendar/ScheduleCalendarApp.tsx");
const thumbnailSource = read("components/thumbnail-editor/ThumbnailEditorApp.tsx");
const snsSource = read("components/sns-split-image-maker/SnsSplitImageMakerApp.tsx");

assert.equal(scheduleCopy.getScheduleCalendarCopy("en").aria.previousMonth, "Previous month", "Schedule Calendar exposes English month navigation aria");
assert.equal(scheduleCopy.getScheduleCalendarCopy("en").aria.closeSchedulePanel, "Close schedule panel", "Schedule Calendar exposes English panel close aria");
assert.equal(scheduleCopy.getScheduleCalendarCopy("en").dragMoveGuide("20:00", "21:00"), "Move here 20:00 - 21:00", "Schedule Calendar exposes localized drag move guide");
assert.match(scheduleSource, /scheduleCopy\.aria\.previousMonth/, "Schedule Calendar uses localized month navigation aria");
assert.match(scheduleSource, /scheduleCopy\.dragMoveGuide/, "Schedule Calendar uses localized drag move guide");
assert.doesNotMatch(scheduleSource, /ariaLabel="カテゴリで絞り込み"|aria-label="予定パネルを閉じる"|ここに移動/, "Schedule Calendar avoids C-scope Japanese UI copy literals in visible/aria paths");

assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").messages.canvasRenderFailed, "Could not render the canvas.", "Thumbnail Editor exposes English render error");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").layerControls.duplicate, "Duplicate", "Thumbnail Editor exposes English layer action labels");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").quickAdjust.title, "Quick adjust", "Thumbnail Editor exposes English quick-adjust labels");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").textControls.fontSearchPlaceholder, "Search", "Thumbnail Editor exposes English font search placeholder");
assert.match(thumbnailSource, /copy\.messages\.canvasRenderFailed/, "Thumbnail Editor uses localized render error");
assert.match(thumbnailSource, /copy\.layerControls\.duplicate/, "Thumbnail Editor uses localized layer action labels");
assert.match(thumbnailSource, /copy\.quickAdjust\.title/, "Thumbnail Editor uses localized quick-adjust labels");
assert.match(thumbnailSource, /copy\.textControls\.fontSearchPlaceholder/, "Thumbnail Editor uses localized text/font labels");
assert.doesNotMatch(thumbnailSource, /下書きデータが不正|画像は8MB以下|操作補助|フォントを検索|お気に入りを解除/, "Thumbnail Editor avoids C-scope Japanese UI/status literals");

assert.equal(snsCopy.getSnsSplitImageMakerCopy("en").messages.previewFailed, "Could not generate preview.", "SNS Split exposes English preview error");
assert.equal(snsCopy.getSnsSplitImageMakerCopy("en").aria.mobileActions, "Mobile actions", "SNS Split exposes English mobile nav aria");
assert.equal(snsCopy.getSnsSplitModeNote("concatenate", "en"), "Place individual images in each preset's extra slots.", "SNS Split exposes English mode tooltips");
assert.match(snsSource, /getSnsSplitModeNote\(mode\.id, locale\)/, "SNS Split uses localized mode tooltip");
assert.match(snsSource, /copy\.messages\.previewFailed/, "SNS Split uses localized preview error");
assert.match(snsSource, /copy\.aria\.mobileActions/, "SNS Split uses localized mobile nav aria");
assert.doesNotMatch(snsSource, /プレビュー生成に失敗|作業状態の保存に失敗|モバイル操作|通知を閉じる/, "SNS Split avoids C-scope Japanese UI/status literals");

console.log("EN C-scope copy contract checks passed");
