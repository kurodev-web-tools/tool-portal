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

const phase1Backgrounds = new Map([
  ["weekly_schedule", "/assets/images/thumbnail-editor/phase1/weekly-schedule-background.png"]
]);

for (const [presetId, expectedSrc] of phase1Backgrounds) {
  const preset = lib.thumbnailPresets.find((item) => item.id === presetId);
  assert.ok(preset, `${presetId} preset exists`);

  const background = preset.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
  assert.ok(background, `${presetId} has a background image layer`);
  assert.equal(background.src, expectedSrc, `${presetId} uses the phase 1 background asset`);
  assert.equal(background.locked, true, `${presetId} background is locked by default`);

  const publicPath = path.join(root, "public", expectedSrc.replace(/^\//, ""));
  assert.equal(fs.existsSync(publicPath), true, `${presetId} background asset exists in public`);

  const draft = lib.createDraftFromPreset(presetId);
  const normalized = lib.normalizeThumbnailDraft(draft);
  const normalizedBackground = normalized?.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
  assert.equal(normalizedBackground?.src, expectedSrc, `${presetId} asset src survives draft normalization`);

  const requiredRoleNames = presetId === "weekly_schedule" ? ["見出し", "時刻", "ラベル"] : ["見出し", "時刻", "サブ", "ラベル"];
  for (const roleName of requiredRoleNames) {
    assert.ok(
      preset.layers.some((layer) => layer.type === "text" && layer.name.includes(roleName)),
      `${presetId} keeps ${roleName} text handoff target`
    );
  }

  if (presetId === "weekly_schedule") {
    for (const dayName of ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"]) {
      for (const columnName of ["曜日", "時間", "予定"]) {
        assert.ok(
          preset.layers.some((layer) => layer.type === "text" && layer.name === `${dayName} / ${columnName}`),
          `${presetId} keeps ${dayName} ${columnName} text layer`
        );
      }
    }
  }
}

console.log("thumbnail phase 1 preset asset contract checks passed");
