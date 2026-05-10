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

const decorationPrefix = "/assets/images/thumbnail-editor/decorations/phase4/";
const expectedDecorationFiles = [
  "soft-light-particles.svg",
  "sparkle-small.svg",
  "clip-focus-rays.svg",
  "clip-speed-lines.svg",
  "clip-label-band-base.svg",
  "clip-time-badge-base.svg",
  "clip-video-frame-accent.svg",
  "clip-impact-marks.svg",
  "arrow-accent.svg",
  "x-corner-ornaments.svg",
  "dot-dash-row.svg",
  "stream-emphasis-bursts.svg",
  "stream-tech-corner-frame.svg",
  "stream-tech-dash-row.svg",
  "stream-title-glow-backplate.svg",
  "stream-star-sparks.svg",
  "stream-time-banner-base.svg",
  "stream-label-band-base.svg",
  "karaoke-label-band-base.svg",
  "karaoke-title-glow-backplate.svg",
  "karaoke-time-banner-base.svg",
  "karaoke-ornate-frame.svg",
  "karaoke-spark-field.svg",
  "karaoke-ornament-note-pink.png",
  "karaoke-ornament-note-cyan.png",
  "karaoke-ornament-note-gold.png",
  "karaoke-ornament-star-pink.png",
  "karaoke-ornament-star-gold.png",
  "karaoke-ornament-sparkle-cluster-pink-cyan.png",
  "karaoke-sparkle-dust-white-gold.png",
  "karaoke-sparkle-dust-pink-cyan.png",
  "karaoke-glint-single-soft-white.png",
  "game-live-label-band-base.svg",
  "game-live-time-banner-base.svg",
  "game-live-hud-lines.svg",
  "game-live-standee-guide-lines.svg",
  "collaboration-label-band-base.svg",
  "collaboration-time-badge-base.svg",
  "collaboration-duo-guide-lines.svg",
  "collaboration-connection-lines.svg",
  "collaboration-soft-glints.svg",
  "announcement-label-band-base.svg",
  "announcement-date-badge-base.svg",
  "announcement-guide-lines.svg",
  "announcement-soft-glints.svg",
  "weekly-table-accent-lines.svg",
  "weekly-range-badge-base.svg",
  "weekly-standee-guide-lines.svg",
  "weekly-soft-glints.svg",
  "x-post-card-base.svg",
  "x-label-band-base.svg",
  "x-date-badge-base.svg",
  "x-standee-guide-lines.svg"
];
const phase4PresetIds = [
  "weekly_schedule"
];
const phase4PresetExpectations = {
  weekly_schedule: { minDecorationImages: 5, shapeTypes: ["line", "frame"] }
};

for (const fileName of expectedDecorationFiles) {
  const filePath = path.join(root, "public", "assets", "images", "thumbnail-editor", "decorations", "phase4", fileName);
  assert.equal(fs.existsSync(filePath), true, `${fileName} decoration asset exists`);
  const maxAssetSize = fileName.endsWith(".png") ? 220_000 : 16_000;
  assert.ok(fs.statSync(filePath).size < maxAssetSize, `${fileName} stays lightweight`);

  if (fileName.endsWith(".svg")) {
    const svg = fs.readFileSync(filePath, "utf8");
    assert.match(svg, /<svg\b/, `${fileName} is an SVG`);
    assert.doesNotMatch(svg, /<text\b|font-family|<image\b|href=/i, `${fileName} has no embedded readable text, image refs, or external hrefs`);
  } else {
    const signature = fs.readFileSync(filePath).subarray(0, 8);
    assert.equal(signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true, `${fileName} is a PNG`);
  }
}

for (const presetId of phase4PresetIds) {
  const preset = lib.thumbnailPresets.find((item) => item.id === presetId);
  assert.ok(preset, `${presetId} preset exists`);

  const decorationLayers = preset.layers.filter((layer) => layer.type === "image" && layer.src.startsWith(decorationPrefix));
  const expectation = phase4PresetExpectations[presetId];
  assert.ok(decorationLayers.length >= expectation.minDecorationImages, `${presetId} uses initial phase 4 decoration image layers`);

  for (const layer of decorationLayers) {
    const filePath = path.join(root, "public", layer.src.replace(/^\//, ""));
    assert.equal(fs.existsSync(filePath), true, `${presetId} decoration layer asset exists: ${layer.src}`);
  }

  const shapeTypes = new Set(preset.layers.filter((layer) => layer.type === "shape").map((layer) => layer.shapeType));
  for (const shapeType of expectation.shapeTypes) {
    assert.equal(shapeTypes.has(shapeType), true, `${presetId} uses editable ${shapeType} shape layer`);
  }
}

const streamAnnouncePreset = lib.thumbnailPresets.find((item) => item.id === "stream_announce");
assert.ok(streamAnnouncePreset, "stream_announce preset exists");
assert.equal(
  streamAnnouncePreset.layers.some((layer) => layer.type === "image" && layer.src.startsWith(decorationPrefix)),
  false,
  "stream_announce migrated to phase 5 decoration assets"
);

const karaokePreset = lib.thumbnailPresets.find((item) => item.id === "karaoke");
assert.ok(karaokePreset, "karaoke preset exists");
assert.equal(
  karaokePreset.layers.some((layer) => layer.type === "image" && layer.src.startsWith(decorationPrefix)),
  false,
  "karaoke migrated to phase 5 decoration assets"
);

const weeklySchedulePreset = lib.thumbnailPresets.find((item) => item.id === "weekly_schedule");
const weeklyScheduleDecorationSources = new Set(
  weeklySchedulePreset.layers
    .filter((layer) => layer.type === "image" && layer.src.startsWith(decorationPrefix))
    .map((layer) => path.basename(layer.src))
);
for (const fileName of [
  "weekly-table-accent-lines.svg",
  "weekly-range-badge-base.svg",
  "weekly-standee-guide-lines.svg",
  "weekly-soft-glints.svg",
  "dot-dash-row.svg"
]) {
  assert.equal(weeklyScheduleDecorationSources.has(fileName), true, `weekly_schedule uses dedicated or shared ${fileName}`);
}
assert.ok(
  weeklySchedulePreset.layers.some((layer) => layer.type === "image" && layer.src.endsWith("/phase1/weekly-schedule-background.png") && layer.locked === true),
  "weekly_schedule keeps the locked phase 1 background"
);
for (const textRole of ["見出し", "時刻", "ラベル"]) {
  assert.ok(
    weeklySchedulePreset.layers.some((layer) => layer.type === "text" && layer.name.includes(textRole)),
    `weekly_schedule keeps editable ${textRole} text layer`
  );
}
for (const dayName of ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"]) {
  for (const columnName of ["曜日", "時間", "予定"]) {
    assert.ok(
      weeklySchedulePreset.layers.some((layer) => layer.type === "text" && layer.name === `${dayName} / ${columnName}`),
      `weekly_schedule keeps editable ${dayName} ${columnName} layer`
    );
  }
}

const allShapeTypes = new Set(lib.thumbnailPresets.flatMap((preset) => preset.layers.filter((layer) => layer.type === "shape").map((layer) => layer.shapeType)));
for (const shapeType of ["line", "frame"]) {
  assert.equal(allShapeTypes.has(shapeType), true, `${shapeType} shapeType is used by preset initial layers`);
}
for (const shapeType of ["line", "burst", "frame", "polygon"]) {
  assert.equal(typeof lib.thumbnailShapeTypeLabels[shapeType], "string", `${shapeType} has a shape label`);
}

for (const presetId of phase4PresetIds) {
  const draft = lib.createDraftFromPreset(presetId);
  const normalizedDraft = lib.normalizeThumbnailDraft(draft);
  for (const shapeType of phase4PresetExpectations[presetId].shapeTypes) {
    assert.ok(
      normalizedDraft?.layers.some((layer) => layer.type === "shape" && layer.shapeType === shapeType),
      `${presetId} ${shapeType} shape survives draft normalization`
    );
  }
}

console.log("thumbnail phase 4 decoration asset contract checks passed");
