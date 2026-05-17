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
const expectedBackground = `${phase5BackgroundPrefix}project-stream-background-v1.png`;
const minimumUniformCellPadding = 76;
const expectedDecorationFiles = [
  "project-stream-cue-card-panel-teal-uniform-cell.png",
  "project-stream-cue-card-panel-yellow-uniform-cell.png",
  "project-stream-label-plaque-coral-teal-uniform-cell.png",
  "project-stream-time-badge-coral-uniform-cell.png",
  "project-stream-arrow-accent-teal-coral-uniform-cell.png",
  "project-stream-sticker-tab-teal-yellow-uniform-cell.png",
  "project-stream-sticker-tab-coral-uniform-cell.png"
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

const projectPreset = lib.thumbnailPresets.find((item) => item.id === "project_stream");
assert.ok(projectPreset, "project_stream preset exists");
assert.equal(projectPreset.name, "企画配信", "project_stream keeps the expected display name");
assert.equal(projectPreset.category, "配信ジャンル", "project_stream stays in the existing streaming category");
assert.equal(projectPreset.usageLabel, "企画 / 視聴者参加", "project_stream uses the scoped usage label");

const background = projectPreset.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"));
assert.ok(background, "project_stream has a background image layer");
assert.equal(background.src, expectedBackground, "project_stream uses the generated production background");
assert.equal(background.locked, true, "project_stream background is locked by default");
const backgroundPath = path.join(root, "public", expectedBackground.replace(/^\//, ""));
assert.equal(fs.existsSync(backgroundPath), true, "project_stream generated background exists");
assert.deepEqual(readPngSize(backgroundPath), { width: 1280, height: 720 }, "project_stream background uses the app canvas size");
assert.ok(fs.statSync(backgroundPath).size < 1_800_000, "project_stream background stays reasonably lightweight");

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
  projectPreset.layers
    .filter((layer) => layer.type === "image" && layer.src.startsWith(phase5DecorationPrefix))
    .map((layer) => path.basename(layer.src))
);
for (const fileName of expectedDecorationFiles) {
  assert.equal(decorationSources.has(fileName), true, `project_stream preset uses ${fileName}`);
}

assert.equal(
  projectPreset.layers.some((layer) => layer.type === "image" && layer.src.includes("/decorations/phase4/")),
  false,
  "project_stream does not depend on phase 4 decoration asset layers"
);

const expectedEditableText = new Map([
  ["見出し", "新企画"],
  ["英字", "SPECIAL PROGRAM"],
  ["サブ", "今日は何が起きる?"],
  ["ラベル", "視聴者参加型"],
  ["時刻", "20:30 START"]
]);
for (const [roleName, text] of expectedEditableText) {
  const layer = projectPreset.layers.find((item) => item.type === "text" && item.name.includes(roleName));
  assert.ok(layer, `project_stream keeps editable ${roleName} text layer`);
  assert.equal(layer.text, text, `project_stream initial ${roleName} text matches the scoped copy`);
}

for (const editableShapeName of ["立ち絵挿入ガイド", "見出し下ライン", "カード区切りライン", "時刻下ライン"]) {
  assert.ok(
    projectPreset.layers.some((layer) => layer.type === "shape" && layer.name.includes(editableShapeName)),
    `project_stream keeps editable ${editableShapeName} as a shape layer`
  );
}

assert.ok(
  projectPreset.layers.some(
    (layer) =>
      layer.type === "image" &&
      layer.src.endsWith("project-stream-cue-card-panel-teal-uniform-cell.png") &&
      layer.width >= 280 &&
      layer.height >= 170
  ),
  "project_stream keeps a large cue-card panel asset layer"
);

const arrowLayers = projectPreset.layers.filter(
  (layer) => layer.type === "image" && path.basename(layer.src) === "project-stream-arrow-accent-teal-coral-uniform-cell.png"
);
assert.ok(arrowLayers.length >= 2, "project_stream reuses one arrow accent asset in multiple placements");
assert.ok(arrowLayers.some((layer) => layer.rotation !== 0), "project_stream rotates the reusable arrow accent");

const tabLayers = projectPreset.layers.filter((layer) => layer.type === "image" && path.basename(layer.src).startsWith("project-stream-sticker-tab-"));
assert.equal(tabLayers.length, 2, "project_stream keeps the manually adjusted sticker tab count");
assert.equal(
  projectPreset.layers.some((layer) => layer.name === "画像 9（中央カードタブ）"),
  false,
  "project_stream removes the obsolete center card tab from the adjusted public draft"
);

assert.equal(
  lib.thumbnailPresetBatchCandidates.some((candidate) => candidate.id === "project_stream"),
  false,
  "project_stream is no longer listed as a future preset-body candidate"
);

const draft = lib.createDraftFromPreset("project_stream");
const normalized = lib.normalizeThumbnailDraft(draft);
assert.equal(
  normalized?.layers.find((layer) => layer.type === "image" && layer.name.includes("背景"))?.src,
  expectedBackground,
  "project_stream background survives draft normalization"
);

console.log("thumbnail project_stream usecase preset contract checks passed");
