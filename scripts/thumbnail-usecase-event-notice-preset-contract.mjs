import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import zlib from "node:zlib";
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

const phase5BackgroundPrefix = "/assets/images/thumbnail-editor/phase5/";
const phase5DecorationPrefix = "/assets/images/thumbnail-editor/decorations/phase5/";
const expectedBackground = `${phase5BackgroundPrefix}event-notice-background-v1.png`;
const minimumUniformCellPadding = 32;
const expectedDecorationFiles = [
  "event-notice-ticket-date-badge-emerald-uniform-cell.png",
  "event-notice-info-band-navy-emerald-uniform-cell.png",
  "event-notice-map-line-divider-emerald-gold-uniform-cell.png",
  "event-notice-key-visual-frame-emerald-uniform-cell.png",
  "event-notice-corner-mark-emerald-gold-uniform-cell.png"
];

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const readPngSize = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.subarray(0, 8).equals(pngSignature), true, `${path.basename(filePath)} is a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

const readPngAlphaBounds = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.subarray(0, 8).equals(pngSignature), true, `${path.basename(filePath)} is a PNG`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  assert.equal(bitDepth, 8, `${path.basename(filePath)} uses 8-bit PNG channels`);
  assert.equal(colorType, 6, `${path.basename(filePath)} uses RGBA PNG color type`);

  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const pixels = Buffer.alloc(rowBytes * height);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    const rowStart = y * rowBytes;
    const previousRowStart = rowStart - rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = inflated[inputOffset + x];
      const left = x >= bytesPerPixel ? pixels[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[previousRowStart + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? pixels[previousRowStart + x - bytesPerPixel] : 0;
      let value = raw;
      if (filterType === 1) value = raw + left;
      if (filterType === 2) value = raw + up;
      if (filterType === 3) value = raw + Math.floor((left + up) / 2);
      if (filterType === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      }
      pixels[rowStart + x] = value & 0xff;
    }
    inputOffset += rowBytes;
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[y * rowBytes + x * bytesPerPixel + 3];
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  assert.ok(maxX >= 0 && maxY >= 0, `${path.basename(filePath)} has visible alpha content`);
  return { width, height, minX, minY, maxX, maxY };
};

const preset = lib.thumbnailPresets.find((item) => item.id === "event_notice");
assert.ok(preset, "event_notice preset exists");
assert.equal(preset.name, "イベント告知", "event_notice keeps the expected display name");
assert.equal(preset.category, "告知画像", "event_notice stays in the announcement category");
assert.equal(preset.usageLabel, "イベント / 参加情報", "event_notice uses the scoped usage label");

const background = preset.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
assert.ok(background, "event_notice has a background image layer");
assert.equal(background.src, expectedBackground, "event_notice uses the generated production background");
assert.equal(background.locked, true, "event_notice background is locked by default");
const backgroundPath = path.join(root, "public", expectedBackground.replace(/^\//, ""));
assert.equal(fs.existsSync(backgroundPath), true, "event_notice generated background exists");
assert.deepEqual(readPngSize(backgroundPath), { width: 1280, height: 720 }, "event_notice background uses the app canvas size");
assert.ok(fs.statSync(backgroundPath).size < 1_800_000, "event_notice background stays reasonably lightweight");

for (const fileName of expectedDecorationFiles) {
  const assetPath = path.join(root, "public", "assets", "images", "thumbnail-editor", "decorations", "phase5", fileName);
  assert.equal(fs.existsSync(assetPath), true, `${fileName} generated asset exists`);
  assert.deepEqual(readPngSize(assetPath), { width: 768, height: 512 }, `${fileName} uses the shared 768x512 canvas`);
  const bounds = readPngAlphaBounds(assetPath);
  assert.ok(bounds.minX >= minimumUniformCellPadding, `${fileName} keeps uniform left transparent padding`);
  assert.ok(bounds.width - bounds.maxX - 1 >= minimumUniformCellPadding, `${fileName} keeps uniform right transparent padding`);
  assert.ok(bounds.minY >= minimumUniformCellPadding, `${fileName} keeps uniform top transparent padding`);
  assert.ok(bounds.height - bounds.maxY - 1 >= minimumUniformCellPadding, `${fileName} keeps uniform bottom transparent padding`);
  assert.ok(fs.statSync(assetPath).size < 700_000, `${fileName} stays reasonably lightweight`);
}

const decorationSources = new Set(
  preset.layers
    .filter((layer) => layer.type === "image" && layer.src.startsWith(phase5DecorationPrefix))
    .map((layer) => path.basename(layer.src))
);
for (const fileName of expectedDecorationFiles) {
  assert.equal(decorationSources.has(fileName), true, `event_notice preset uses ${fileName}`);
}

assert.equal(
  preset.layers.some((layer) => layer.type === "image" && layer.src.includes("/decorations/phase4/")),
  false,
  "event_notice does not depend on phase 4 decoration asset layers"
);

const expectedEditableText = new Map([
  ["見出し", "イベント告知"],
  ["ラベル", "EVENT INFO"],
  ["時刻", "06.15 SAT"],
  ["サブ", "参加情報まとめ"],
  ["キービジュアル注記", "KEY VISUAL"]
]);
for (const [roleName, text] of expectedEditableText) {
  const layer = preset.layers.find((item) => item.type === "text" && item.name.includes(roleName));
  assert.ok(layer, `event_notice keeps editable ${roleName} text layer`);
  assert.equal(layer.text, text, `event_notice initial ${roleName} text matches the scoped copy`);
}

for (const editableShapeName of ["キービジュアル挿入ガイド", "ラベル土台", "見出し下ライン", "情報区切りライン"]) {
  assert.ok(
    preset.layers.some((layer) => layer.type === "shape" && layer.name.includes(editableShapeName)),
    `event_notice keeps editable ${editableShapeName} as a shape layer`
  );
}

const cornerLayers = preset.layers.filter(
  (layer) => layer.type === "image" && path.basename(layer.src) === "event-notice-corner-mark-emerald-gold-uniform-cell.png"
);
assert.equal(cornerLayers.length, 2, "event_notice keeps the manually adjusted corner mark count");
assert.ok(cornerLayers.some((layer) => layer.rotation !== 0), "event_notice rotates the reusable corner mark asset");
assert.equal(
  preset.layers.some((layer) => layer.name === "画像 3（左上角マーク）"),
  false,
  "event_notice removes the obsolete left-top corner mark from the adjusted public draft"
);

assert.ok(
  preset.layers.some(
    (layer) =>
      layer.type === "image" &&
      layer.src.endsWith("event-notice-key-visual-frame-emerald-uniform-cell.png") &&
      layer.width >= 440 &&
      layer.height >= 600
  ),
  "event_notice keeps a large key visual frame asset layer"
);

assert.equal(
  lib.thumbnailPresetBatchCandidates.some((candidate) => candidate.id === "event_notice"),
  false,
  "event_notice is not listed as a future preset-body candidate"
);

const draft = lib.createDraftFromPreset("event_notice");
const normalized = lib.normalizeThumbnailDraft(draft);
assert.equal(
  normalized?.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  expectedBackground,
  "event_notice background survives draft normalization"
);

console.log("thumbnail event_notice usecase preset contract checks passed");
