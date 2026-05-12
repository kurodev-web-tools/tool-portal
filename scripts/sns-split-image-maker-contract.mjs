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
const source = fs.readFileSync(sourcePath, "utf8");
const appSource = fs.readFileSync(appSourcePath, "utf8");
const landingSource = fs.readFileSync(landingSourcePath, "utf8");
const pageSource = fs.readFileSync(pageSourcePath, "utf8");
const designSource = fs.readFileSync(designSourcePath, "utf8");
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
assert.doesNotMatch(appSource, /label: "投稿時"/, "preview tab label no longer says post-time");
assert.doesNotMatch(appSource, /label: "1\+8連結"/, "primary 4-split mode label no longer uses legacy 1+8 text");
assert.doesNotMatch(appSource, /label: "1\+4差し替え"/, "primary 4-split mode label no longer uses legacy 1+4 text");
assert.match(landingSource, /個別追加 \/ フレーム追加/, "landing card uses unified 4-split mode labels");
assert.match(pageSource, /2分割\/3分割\/4分割画像/, "page metadata includes all available split presets");
assert.match(designSource, /2分割 \/ 3分割 \/ 4分割/, "design doc describes current preset scope");
assert.match(designSource, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366/, "design doc lists freeze-readiness viewport widths");

console.log("sns-split-image-maker contract checks passed");
