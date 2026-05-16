import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "sns-split-image-maker.ts");
const appSourcePath = path.join(root, "components", "sns-split-image-maker", "SnsSplitImageMakerApp.tsx");
const landingSourcePath = path.join(root, "components", "sns-split-image-maker", "SnsSplitPresetLanding.tsx");
const pageSourcePath = path.join(root, "app", "tools", "sns-split-image-maker", "page.tsx");
const designSourcePath = path.join(root, "docs", "design-sns-split-image-maker.md");
const scheduleReadmeSourcePath = path.join(root, "docs", "SCHEDULE_CALENDAR_README.md");
const source = fs.readFileSync(sourcePath, "utf8");
const appSource = fs.readFileSync(appSourcePath, "utf8");
const landingSource = fs.readFileSync(landingSourcePath, "utf8");
const pageSource = fs.readFileSync(pageSourcePath, "utf8");
const designSource = fs.readFileSync(designSourcePath, "utf8");
const scheduleReadmeSource = fs.readFileSync(scheduleReadmeSourcePath, "utf8");
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

assert.equal(lib.getRequiredSlotCount("split-3", "concatenate"), 6, "split-3 individual mode requires 6 slots");
assert.equal(lib.getRequiredSlotCount("split-3", "replace"), 3, "split-3 frame mode requires 3 slots");

assert.deepEqual(
  lib.getSnsSplitTiles(lib.defaultSnsSplitConfig, "split-2"),
  [
    { index: 1, sx: 0, sy: 0, sw: 640, sh: 720 },
    { index: 2, sx: 640, sy: 0, sw: 640, sh: 720 }
  ],
  "split-2 keeps left/right order"
);

assert.deepEqual(
  lib.getSnsSplitTiles(lib.defaultSnsSplitConfig, "split-4").map((tile) => tile.index),
  [1, 2, 3, 4],
  "split-4 keeps split_1 through split_4 order"
);

assert.deepEqual(
  lib.getSnsSplitTiles(lib.defaultSnsSplitConfig, "split-3"),
  [
    { index: 1, sx: 0, sy: 0, sw: 640, sh: 720 },
    { index: 2, sx: 640, sy: 0, sw: 640, sh: 360 },
    { index: 3, sx: 640, sy: 360, sw: 640, sh: 360 }
  ],
  "split-3 main image is left half plus right top/bottom"
);

assert.deepEqual(lib.getSnsSplitPostCanvas("split-3", 1), { width: 1920, height: 720 }, "split-3 first output is 24:9");
assert.deepEqual(lib.getSnsSplitPostCanvas("split-3", 2), { width: 1280, height: 2160 }, "split-3 second output is 8:13.5");
assert.deepEqual(lib.getSnsSplitPostCanvas("split-3", 3), { width: 1280, height: 2160 }, "split-3 third output is 8:13.5");
assert.deepEqual(lib.getSnsSplitPostCanvas("split-2", 1), { width: 1920, height: 720 }, "split-2 output remains 24:9");
assert.deepEqual(lib.getSnsSplitPostCanvas("split-4", 1), { width: 1280, height: 2160 }, "split-4 output remains 8:13.5");
assert.deepEqual(lib.snsSplitFreezePolicy.presetScope, ["split-2", "split-3", "split-4"], "freeze scope stays on the three X post presets");
assert.deepEqual(lib.snsSplitFreezePolicy.exportFormats, ["png", "jpeg"], "freeze export formats stay limited to png/jpeg");
assert.equal(lib.snsSplitFreezePolicy.requiresBaseImageBeforeExport, true, "export requires a main image before download");
assert.equal(lib.snsSplitFreezePolicy.exportPackaging, "individual-single-format-downloads", "freeze export stays as individual files in one selected format");
assert.equal(lib.snsSplitFreezePolicy.allowsMultiFormatBatch, false, "multi-format batch export is not a current feature");
assert.equal(lib.snsSplitFreezePolicy.allowsZipExport, false, "zip export is not a current feature");
assert.deepEqual(
  lib.snsSplitFreezePolicy.deferredExportExpansions,
  ["zip", "non-x-ratios", "multi-format-batch"],
  "zip, non-X ratios, and multi-format batch export stay deferred"
);
assert.deepEqual(lib.getSnsSplitExportOrder("split-2"), [1, 2], "split-2 export order is split_1 through split_2");
assert.deepEqual(lib.getSnsSplitExportOrder("split-3"), [1, 2, 3], "split-3 export order is split_1 through split_3");
assert.deepEqual(lib.getSnsSplitExportOrder("split-4"), [1, 2, 3, 4], "split-4 export order is split_1 through split_4");
assert.equal(lib.getSnsSplitExportOrderLabel("split-2"), "split_1 → split_2", "split-2 order label is explicit");
assert.equal(lib.getSnsSplitExportOrderLabel("split-3"), "split_1 → split_2 → split_3", "split-3 order label is explicit");
assert.equal(lib.getSnsSplitExportOrderLabel("split-4"), "split_1 → split_2 → split_3 → split_4", "split-4 order label is explicit");
const draftWithoutBase = lib.createSnsSplitDraft("concatenate", "split-3");
assert.equal(lib.canExportSnsSplitDraft(draftWithoutBase), false, "export guard blocks drafts without a main image");
const draftWithBase = {
  ...draftWithoutBase,
  images: draftWithoutBase.images.map((image) => (image.id === "base" ? { ...image, src: "data:image/png;base64,test" } : image))
};
assert.equal(lib.canExportSnsSplitDraft(draftWithBase), true, "export guard allows drafts with a main image");

assert.equal(lib.getSnsSplitSlotLabel("concatenate", 1, "split-3"), "画像1 左");
assert.equal(lib.getSnsSplitSlotLabel("concatenate", 2, "split-3"), "画像1 右");
assert.equal(lib.getSnsSplitSlotLabel("concatenate", 3, "split-3"), "画像2 上");
assert.equal(lib.getSnsSplitSlotLabel("concatenate", 4, "split-3"), "画像2 下");
assert.equal(lib.getSnsSplitSlotLabel("concatenate", 5, "split-3"), "画像3 上");
assert.equal(lib.getSnsSplitSlotLabel("concatenate", 6, "split-3"), "画像3 下");
assert.equal(lib.getSnsSplitSlotLabel("replace", 1, "split-3"), "画像1 フレーム");
assert.equal(lib.getSnsSplitSlotLabel("replace", 2, "split-3"), "画像2 フレーム");
assert.equal(lib.getSnsSplitSlotLabel("replace", 3, "split-3"), "画像3 フレーム");

assert.match(appSource, /label: "個別追加"/, "UI labels include individual-add mode");
assert.match(appSource, /label: "フレーム追加"/, "UI labels include frame-add mode");
assert.match(appSource, /label: "メイン分割"/, "preview tabs expose main-split label");
assert.match(appSource, /disabled=\{!canExport\}/, "export buttons are guarded by main-image readiness");
assert.match(appSource, /メイン画像を選択してから出力してください。/, "manual export call warns before exporting without a main image");
assert.match(appSource, /メイン画像を選ぶと、投稿順プレビューとPNG\/JPEG保存が有効になります。/, "empty main-image state explains why export is disabled");
assert.match(appSource, /Thumbnail Editorからの画像が見つからなかったため、メイン画像は未選択のまま開始しました。/, "failed thumbnail handoff has a concrete recovery message");
assert.match(appSource, /投稿順プレビュー/, "preview tab names the posting-order preview explicitly");
assert.match(appSource, /split_1から保存順に確認/, "posting-order preview explains the save order");
assert.match(appSource, /境界を動かすときは枠線を表示したまま/, "boundary adjustment guidance stays visible near preview controls");
assert.match(appSource, /投稿別調整はドラッグまたはスライダーで行います。/, "post adjustment guidance explains drag and slider controls");
assert.match(appSource, /選択中の形式で個別ファイル保存/, "export section describes single-format individual file output");
assert.match(appSource, /getExportButtonLabel/, "export button label is generated from current PNG/JPEG format and post count");
assert.match(appSource, /の順で\$\{postCount\}枚を書き出しました。/, "successful export toast includes output order and count");
assert.match(appSource, /PNG\/JPEGはどちらか1形式を選び、ZIPや複数形式の一括出力は後続候補です。/, "export copy keeps zip and multi-format batch out of current features");
assert.match(appSource, /role="status"/, "handoff and toast status areas are exposed to assistive tech");
assert.match(appSource, /aria-live="polite"/, "handoff and toast updates use polite announcements");
assert.match(appSource, /Thumbnail Editorから画像を受け取りました。/, "thumbnail handoff copy says the base image was received");
assert.match(appSource, /Schedule Calendarから告知文メモを受け取りました。/, "schedule handoff copy says only text memo was received");
assert.match(appSource, /受け取った画像をメイン画像として確認し、必要なら追加画像を入れてから保存します。/, "thumbnail handoff next action stays concrete");
assert.match(appSource, /メイン画像は未選択です。画像を選んでから、告知文メモを投稿文へ使えます。/, "schedule handoff next action explains the missing main image");
assert.match(appSource, /aria-label=\{isThumbnailToSnsHandoffPayload\(handoffPayload\) \? "Thumbnail Editorから受け取った告知文メモ" : "Schedule Calendarから受け取った告知文メモ"\}/, "handoff textarea label names the source");
assert.match(appSource, /createNumberedFilePattern/, "app uses the shared numbered filename pattern helper for handoff candidates");
assert.doesNotMatch(appSource, /getOutputOrderLabel\(/, "app uses the shared export order helper consistently");
assert.doesNotMatch(appSource, /const sanitizeFilePatternPart =/, "app does not keep a local handoff filename sanitizer");
assert.doesNotMatch(appSource, /label: "投稿時"/, "preview tab label no longer says post-time");
assert.doesNotMatch(appSource, /label: "1\+8連結"/, "primary 4-split mode label no longer uses legacy 1+8 text");
assert.doesNotMatch(appSource, /label: "1\+4差し替え"/, "primary 4-split mode label no longer uses legacy 1+4 text");
assert.doesNotMatch(appSource + source, /JSZip|application\/zip|new Blob\(/, "freeze scope does not add zip packaging");
assert.match(landingSource, /個別追加 \/ フレーム追加/, "landing card uses unified 4-split mode labels");
assert.match(pageSource, /2分割\/3分割\/4分割画像/, "page metadata includes all available split presets");
assert.match(designSource, /2分割 \/ 3分割 \/ 4分割/, "design doc describes current preset scope");
assert.match(designSource, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366/, "design doc lists freeze-readiness viewport widths");
assert.match(designSource, /Freeze Boundary/, "design doc has an explicit freeze boundary section");
assert.match(designSource, /PNG\/JPEGはいずれか1形式を選んで個別ファイルとして保存する/, "design doc says export is a single selected format");
assert.match(designSource, /ZIP 出力、X 以外の比率、複数形式の大規模 export は freeze 後/, "design doc keeps deferred export expansion out of freeze scope");
assert.match(scheduleReadmeSource, /Schedule Calendar 由来ではメイン画像は未選択/, "Schedule README documents the Schedule -> SNS next action");
assert.match(scheduleReadmeSource, /Thumbnail Editor 由来では受け取った画像を確認してから/, "Schedule README documents the Thumbnail -> SNS next action");

console.log("sns-split-image-maker contract checks passed");
