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
const thumbnailUserMaterialStorageSource = read("components/thumbnail-editor/thumbnailUserMaterialStorage.ts");
const snsSource = read("components/sns-split-image-maker/SnsSplitImageMakerApp.tsx");
const thumbnailLibSource = read("lib/thumbnail-editor.ts");
const snsLib = loadTsModule("lib/sns-split-image-maker.ts");
const snsLibSource = read("lib/sns-split-image-maker.ts");
const themeToggleSource = read("components/portal/ThemeToggle.tsx");
const toolsPageSource = read("app/tools/page.tsx");

assert.equal(scheduleCopy.getScheduleCalendarCopy("en").aria.previousMonth, "Previous month", "Schedule Calendar exposes English month navigation aria");
assert.equal(scheduleCopy.getScheduleCalendarCopy("en").aria.closeSchedulePanel, "Close schedule panel", "Schedule Calendar exposes English panel close aria");
assert.equal(scheduleCopy.getScheduleCalendarCopy("en").dragMoveGuide("20:00", "21:00"), "Move here 20:00 - 21:00", "Schedule Calendar exposes localized drag move guide");
assert.equal(scheduleCopy.getPostTemplateVariableLabel(scheduleCopy.getScheduleCalendarCopy("en"), "{announcementText}", "告知文"), "Announcement", "Schedule Calendar exposes English template variable button labels");
assert.match(scheduleSource, /scheduleCopy\.aria\.previousMonth/, "Schedule Calendar uses localized month navigation aria");
assert.match(scheduleSource, /scheduleCopy\.dragMoveGuide/, "Schedule Calendar uses localized drag move guide");
assert.match(scheduleSource, /getPostTemplateVariableLabel\(scheduleCopy,\s*option\.token,\s*option\.label\)/, "Schedule Calendar uses localized template variable labels without changing tokens");
assert.doesNotMatch(scheduleSource, /ariaLabel="カテゴリで絞り込み"|aria-label="予定パネルを閉じる"|ここに移動/, "Schedule Calendar avoids C-scope Japanese UI copy literals in visible/aria paths");

assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").messages.canvasRenderFailed, "Could not render the canvas.", "Thumbnail Editor exposes English render error");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").layerControls.duplicate, "Duplicate", "Thumbnail Editor exposes English layer action labels");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").quickAdjust.title, "Quick adjust", "Thumbnail Editor exposes English quick-adjust labels");
assert.equal(thumbnailCopy.getThumbnailEditorCopy("en").textControls.fontSearchPlaceholder, "Search", "Thumbnail Editor exposes English font search placeholder");
assert.equal(thumbnailCopy.getThumbnailMaterialName("label-plaque-cyan", "en"), "Cyan Label Plate", "Thumbnail material names have English display copy");
assert.equal(thumbnailCopy.getThumbnailMaterialCategoryLabel("label-base", "en"), "Label base", "Thumbnail material category labels have English display copy");
assert.match(thumbnailCopy.getThumbnailMaterialDescription({ id: "label-plaque-cyan", description: "" }, "en"), /cyan glow/i, "Thumbnail material descriptions have English display copy");
assert.match(thumbnailCopy.getThumbnailMaterialRecommendedPlacement({ id: "label-plaque-cyan", recommendedPlacement: "" }, "en"), /upper-left/i, "Thumbnail material recommended placement has English display copy");
assert.equal(thumbnailCopy.getThumbnailLayerDisplayName({ name: "テキスト 1（見出し）", type: "text" }, "en"), "Text 1 (Headline)", "Thumbnail preset layer names have UI-only English display copy");
assert.equal(thumbnailCopy.getThumbnailLayerDisplayName({ name: "Custom Layer", type: "text" }, "en"), "Custom Layer", "Custom layer names are not translated");
assert.equal(thumbnailCopy.getThumbnailStandeePlacementName("solo-right-half", "en"), "Right / half body", "Standee placement names have English display copy");
assert.equal(thumbnailCopy.getThumbnailStandeePlacementGroup("1人", "en"), "1 person", "Standee placement groups have English display copy");
assert.equal(thumbnailCopy.getThumbnailFontCategoryLabel("太字見出し / 汎用", "en"), "Bold headline / general", "Font category metadata has English display copy");
assert.equal(thumbnailCopy.getThumbnailFontMoodLabel("太字見出し、読みやすいゴシック", "en"), "Bold headline, readable gothic", "Font mood metadata has English display copy");
assert.equal(thumbnailCopy.getThumbnailMainTextCarryoverLabel("headline", "en"), "Headline", "Main text carryover target labels have English display copy");
assert.match(thumbnailSource, /copy\.messages\.canvasRenderFailed/, "Thumbnail Editor uses localized render error");
assert.match(thumbnailSource, /copy\.layerControls\.duplicate/, "Thumbnail Editor uses localized layer action labels");
assert.match(thumbnailSource, /copy\.quickAdjust\.title/, "Thumbnail Editor uses localized quick-adjust labels");
assert.match(thumbnailSource, /copy\.textControls\.fontSearchPlaceholder/, "Thumbnail Editor uses localized text/font labels");
assert.match(thumbnailSource, /getThumbnailMaterialName\(material\.id,\s*locale/, "Thumbnail material cards use localized material names");
assert.match(thumbnailSource, /filterLocalizedThumbnailMaterials/, "Thumbnail material search includes localized material copy");
assert.match(thumbnailSource, /getThumbnailLayerDisplayName\(layer,\s*locale/, "Thumbnail layer list uses UI-only localized layer names");
assert.match(thumbnailSource, /value=\{getThumbnailLayerDisplayName\(layer,\s*locale\)\}/, "Thumbnail property layer-name input uses UI-only localized layer names");
assert.match(thumbnailSource, /event\.target\.value === layerNameDisplayValue && layer\.name !== event\.target\.value/, "Thumbnail layer-name input display alias does not overwrite stored layer.name on blur");
assert.match(thumbnailSource, /getThumbnailStandeePlacementName\(preset\.id,\s*locale/, "Thumbnail standee placement panel uses localized placement names");
assert.match(thumbnailSource, /getThumbnailFontCategoryLabel\(fontCategory\.label,\s*locale/, "Thumbnail font listbox uses localized category labels");
assert.match(thumbnailSource, /getThumbnailMainTextCarryoverLabel\(target\.id,\s*locale/, "Thumbnail preset apply dialog uses localized carryover labels");
assert.doesNotMatch(thumbnailSource, /下書きデータが不正|画像は8MB以下|操作補助|フォントを検索|お気に入りを解除/, "Thumbnail Editor avoids C-scope Japanese UI/status literals");
assert.match(thumbnailLibSource, /v-streamer-tools:thumbnail-editor:draft:v1/, "Thumbnail draft storage key remains unchanged");
assert.match(thumbnailUserMaterialStorageSource, /v-streamer-tools:thumbnail-editor:user-materials/, "Thumbnail user material IndexedDB name remains unchanged");

assert.equal(snsCopy.getSnsSplitImageMakerCopy("en").messages.previewFailed, "Could not generate preview.", "SNS Split exposes English preview error");
assert.equal(snsCopy.getSnsSplitImageMakerCopy("en").aria.mobileActions, "Mobile actions", "SNS Split exposes English mobile nav aria");
assert.equal(snsCopy.getSnsSplitModeNote("concatenate", "en"), "Place individual images in each preset's extra slots.", "SNS Split exposes English mode tooltips");
assert.equal(snsLib.getSnsSplitSlotLabel("concatenate", 1, "split-4", "five", "en"), "Post 1 top", "SNS Split slot labels have English display copy");
assert.equal(snsLib.getSnsSplitSlotLabel("replace", 1, "split-3", "five", "en"), "Image 1 frame", "SNS Split frame labels have English display copy");
assert.equal(snsCopy.getSnsSplitImageMakerCopy("en").preview.placeholder.mainImage, "Select the main image", "SNS Split canvas placeholder has English display copy");
assert.match(snsSource, /getSnsSplitModeNote\(mode\.id, locale\)/, "SNS Split uses localized mode tooltip");
assert.match(snsSource, /getSnsSplitSlotLabel\(draft\.mode,\s*index \+ 1,\s*draft\.preset,\s*draft\.config\.joinType,\s*locale\)/, "SNS Split uses localized additional slot labels");
assert.match(snsSource, /placeholder:\s*copy\.preview\.placeholder\.mainImage/, "SNS Split passes localized no-image canvas placeholder");
assert.match(snsSource, /copy\.messages\.previewFailed/, "SNS Split uses localized preview error");
assert.match(snsSource, /copy\.aria\.mobileActions/, "SNS Split uses localized mobile nav aria");
assert.doesNotMatch(snsSource, /message:\s*error instanceof Error \? error\.message : copy\.toasts\.exportFailed/, "SNS Split export error does not expose raw Japanese errors in English mode");
assert.doesNotMatch(snsSource, /プレビュー生成に失敗|作業状態の保存に失敗|モバイル操作|通知を閉じる/, "SNS Split avoids C-scope Japanese UI/status literals");
assert.match(snsLibSource, /v-streamer-tools:sns-split-image-maker:draft:v1/, "SNS Split draft storage key remains unchanged");

assert.match(themeToggleSource, /useLocale\(\)/, "ThemeToggle reads the active locale");
assert.doesNotMatch(themeToggleSource, /ライトモードとダークモードを切り替える|テーマ切替|ライト<\/span>|ダーク<\/span>/, "ThemeToggle avoids raw Japanese visible/aria labels");
assert.match(toolsPageSource, /portalCopy\.ja\.loading\.tools/, "Tools page keeps static fallback centralized in portal copy");

console.log("EN C-scope copy contract checks passed");
