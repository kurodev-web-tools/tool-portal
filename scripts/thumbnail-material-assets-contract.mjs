import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import zlib from "node:zlib";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
const componentPath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const source = fs.readFileSync(sourcePath, "utf8");
const componentSource = fs.readFileSync(componentPath, "utf8");
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

const materialPrefix = "/assets/images/thumbnail-editor/materials/batch1/";
const labelMaterialPrefix = "/assets/images/thumbnail-editor/materials/labels/";
const badgeMaterialPrefix = "/assets/images/thumbnail-editor/materials/badges/";
const frameMaterialPrefix = "/assets/images/thumbnail-editor/materials/frames/";
const dividerMaterialPrefix = "/assets/images/thumbnail-editor/materials/dividers/";
const effectMaterialPrefix = "/assets/images/thumbnail-editor/materials/effects/";
const cornerMaterialPrefix = "/assets/images/thumbnail-editor/materials/corners/";
const impactMaterialPrefix = "/assets/images/thumbnail-editor/materials/impact/";
const phase5Prefix = "/assets/images/thumbnail-editor/decorations/phase5/";
const expectedMaterials = [
  {
    id: "label-plaque-cyan",
    category: "label-base",
    src: `${phase5Prefix}stream-label-plaque-cyan-uniform-cell.png`,
    width: 430,
    height: 144,
    recommended: "左上のラベル土台"
  },
  {
    id: "date-badge-navy-gold",
    category: "date-badge",
    src: `${phase5Prefix}announcement-date-badge-navy-gold-uniform-cell.png`,
    width: 480,
    height: 120,
    recommended: "下部の日付・時間バッジ"
  },
  {
    id: "week-range-badge-blue",
    category: "date-badge",
    src: `${phase5Prefix}weekly-schedule-range-badge-blue-uniform-cell.png`,
    width: 390,
    height: 120,
    recommended: "週範囲や短い期間表示"
  },
  {
    id: "corner-ornament-gold",
    category: "corner",
    src: `${phase5Prefix}announcement-corner-ornament-gold-uniform-cell.png`,
    width: 180,
    height: 120,
    recommended: "情報枠の角"
  },
  {
    id: "soft-glint-gold",
    category: "accent",
    src: `${phase5Prefix}announcement-soft-glint-cluster-gold-uniform-cell.png`,
    width: 260,
    height: 174,
    recommended: "見出し周辺の控えめな光"
  },
  {
    id: "hud-corner-frame-green",
    category: "frame",
    src: `${phase5Prefix}game-live-hud-corner-frame-uniform-cell.png`,
    width: 460,
    height: 306,
    recommended: "立ち絵・情報枠のHUD角"
  },
  {
    id: "schedule-table-accent-cyan",
    category: "frame",
    src: `${phase5Prefix}weekly-schedule-table-accent-cyan-uniform-cell.png`,
    width: 520,
    height: 468,
    recommended: "予定表や区切りアクセント"
  },
  {
    id: "duo-guide-spotlight",
    category: "frame",
    src: `${phase5Prefix}collaboration-duo-guide-spotlight-uniform-cell.png`,
    width: 560,
    height: 374,
    recommended: "複数人・動画枠の薄いガイド"
  },
  {
    id: "hud-divider-cyan",
    category: "divider",
    src: `${materialPrefix}hud-divider-cyan-uniform-cell.png`,
    width: 520,
    height: 120,
    recommended: "見出し下やセクション区切り"
  },
  {
    id: "video-comment-frame-blue",
    category: "frame",
    src: `${materialPrefix}video-comment-frame-blue-uniform-cell.png`,
    width: 600,
    height: 360,
    recommended: "動画枠・コメント枠の土台"
  },
  {
    id: "label-tech-plate-navy-cyan",
    category: "label-base",
    src: `${labelMaterialPrefix}label-tech-plate-navy-cyan.png`,
    width: 620,
    height: 156,
    recommended: "見出し背面の横長テックプレート"
  },
  {
    id: "label-glass-plate-white-blue",
    category: "label-base",
    src: `${labelMaterialPrefix}label-glass-plate-white-blue.png`,
    width: 600,
    height: 148,
    recommended: "短い補足テキスト背面のガラス風ラベル"
  },
  {
    id: "label-champagne-plaque-dark-trim",
    category: "label-base",
    src: `${labelMaterialPrefix}label-champagne-plaque-dark-trim.png`,
    width: 590,
    height: 150,
    recommended: "上品な告知見出しの横長台座"
  },
  {
    id: "label-diagonal-ribbon-slate-cyan",
    category: "label-base",
    src: `${labelMaterialPrefix}label-diagonal-ribbon-slate-cyan.png`,
    width: 580,
    height: 142,
    recommended: "斜めカットのサブ見出しリボン"
  },
  {
    id: "badge-status-magenta-cyan",
    category: "date-badge",
    src: `${badgeMaterialPrefix}badge-status-magenta-cyan.png`,
    width: 320,
    height: 170,
    recommended: "日付や短いステータスの背面"
  },
  {
    id: "badge-time-amber-charcoal",
    category: "date-badge",
    src: `${badgeMaterialPrefix}badge-time-amber-charcoal.png`,
    width: 430,
    height: 128,
    recommended: "時刻表示の背面ピル"
  },
  {
    id: "badge-notice-mint-white",
    category: "date-badge",
    src: `${badgeMaterialPrefix}badge-notice-mint-white.png`,
    width: 340,
    height: 146,
    recommended: "軽い通知や短い補足の背面"
  },
  {
    id: "badge-tech-hex-cyan-violet",
    category: "date-badge",
    src: `${badgeMaterialPrefix}badge-tech-hex-cyan-violet.png`,
    width: 270,
    height: 220,
    recommended: "短いテック系ステータス表示"
  },
  {
    id: "frame-smoke-glass-blue-rim",
    category: "frame",
    src: `${frameMaterialPrefix}frame-smoke-glass-blue-rim.png`,
    width: 660,
    height: 382,
    recommended: "動画枠や情報ブロックの背面パネル"
  },
  {
    id: "frame-offwhite-navy-info-panel",
    category: "frame",
    src: `${frameMaterialPrefix}frame-offwhite-navy-info-panel.png`,
    width: 620,
    height: 344,
    recommended: "読みやすい情報ブロックの背面"
  },
  {
    id: "frame-thin-gold-technical",
    category: "frame",
    src: `${frameMaterialPrefix}frame-thin-gold-technical.png`,
    width: 640,
    height: 396,
    recommended: "上品な動画枠や立ち絵余白のガイド"
  },
  {
    id: "frame-translucent-comment-panel",
    category: "frame",
    src: `${frameMaterialPrefix}frame-translucent-comment-panel.png`,
    width: 610,
    height: 292,
    recommended: "コメント枠や短い案内文の背面"
  },
  {
    id: "frame-muted-schedule-panel",
    category: "frame",
    src: `${frameMaterialPrefix}frame-muted-schedule-panel.png`,
    width: 650,
    height: 404,
    recommended: "予定表エリアや低彩度の情報枠"
  },
  {
    id: "divider-cyan-thin-hud",
    category: "divider",
    src: `${dividerMaterialPrefix}divider-cyan-thin-hud.png`,
    width: 620,
    height: 96,
    recommended: "見出し下の細いアクセントライン"
  },
  {
    id: "divider-soft-white-dotted",
    category: "divider",
    src: `${dividerMaterialPrefix}divider-soft-white-dotted.png`,
    width: 560,
    height: 86,
    recommended: "情報ブロック間の点線区切り"
  },
  {
    id: "divider-muted-teal-l-corner-guide",
    category: "divider",
    src: `${dividerMaterialPrefix}divider-muted-teal-l-corner-guide.png`,
    width: 360,
    height: 220,
    recommended: "予定表や情報枠のL字ガイド"
  },
  {
    id: "divider-pale-cyan-segmented-underline",
    category: "divider",
    src: `${dividerMaterialPrefix}divider-pale-cyan-segmented-underline.png`,
    width: 590,
    height: 92,
    recommended: "見出しや短い説明の分割下線"
  },
  {
    id: "divider-navy-white-technical-rule",
    category: "divider",
    src: `${dividerMaterialPrefix}divider-navy-white-technical-rule.png`,
    width: 610,
    height: 104,
    recommended: "予定表エリアの補助罫線"
  },
  {
    id: "effect-warm-gold-subtle-glint",
    category: "accent",
    src: `${effectMaterialPrefix}effect-warm-gold-subtle-glint.png`,
    width: 260,
    height: 174,
    recommended: "見出しやバッジ横の小さな金色グリント"
  },
  {
    id: "effect-soft-white-sparkle-cluster",
    category: "accent",
    src: `${effectMaterialPrefix}effect-soft-white-sparkle-cluster.png`,
    width: 300,
    height: 190,
    recommended: "CTAや重要情報近くの淡い白スパークル"
  },
  {
    id: "effect-pale-cyan-diagonal-streak",
    category: "accent",
    src: `${effectMaterialPrefix}effect-pale-cyan-diagonal-streak.png`,
    width: 620,
    height: 180,
    recommended: "背景へ軽く重ねる淡シアンの斜光"
  },
  {
    id: "effect-blue-glow-wash",
    category: "accent",
    src: `${effectMaterialPrefix}effect-blue-glow-wash.png`,
    width: 560,
    height: 300,
    recommended: "素材同士の境界をなじませる淡い青の光だまり"
  },
  {
    id: "corner-rose-gold-asymmetric-shard",
    category: "corner",
    src: `${cornerMaterialPrefix}corner-rose-gold-asymmetric-shard.png`,
    width: 230,
    height: 154,
    recommended: "見出し横や情報枠角の非対称アクセント"
  },
  {
    id: "corner-cyan-navy-tech-chevron",
    category: "corner",
    src: `${cornerMaterialPrefix}corner-cyan-navy-tech-chevron.png`,
    width: 210,
    height: 132,
    recommended: "重要情報横の小さな方向づけマーク"
  },
  {
    id: "corner-white-charcoal-diagonal-tab",
    category: "corner",
    src: `${cornerMaterialPrefix}corner-white-charcoal-diagonal-tab.png`,
    width: 240,
    height: 142,
    recommended: "画面端や余白へ足す斜めタブ"
  },
  {
    id: "corner-champagne-glint-bracket",
    category: "corner",
    src: `${cornerMaterialPrefix}corner-champagne-glint-bracket.png`,
    width: 190,
    height: 134,
    recommended: "他素材の角に重ねる小さな金具アクセント"
  },
  {
    id: "impact-arrow-cyan-black",
    category: "corner",
    src: `${impactMaterialPrefix}impact-arrow-cyan-black.png`,
    width: 250,
    height: 150,
    recommended: "見出し横や注目箇所への矢印アクセント"
  },
  {
    id: "impact-burst-yellow-black",
    category: "accent",
    src: `${impactMaterialPrefix}impact-burst-yellow-black.png`,
    width: 250,
    height: 190,
    recommended: "強調したい要素の背面や横の衝撃マーク"
  },
  {
    id: "impact-speed-lines-white-cyan",
    category: "divider",
    src: `${impactMaterialPrefix}impact-speed-lines-white-cyan.png`,
    width: 540,
    height: 150,
    recommended: "見出し下や画面端へ足すスピード線"
  },
  {
    id: "impact-focus-lines-monochrome",
    category: "accent",
    src: `${impactMaterialPrefix}impact-focus-lines-monochrome.png`,
    width: 420,
    height: 280,
    recommended: "注目箇所の背面へ薄く置く集中線"
  },
  {
    id: "impact-outline-pop-base-white-black",
    category: "date-badge",
    src: `${impactMaterialPrefix}impact-outline-pop-base-white-black.png`,
    width: 340,
    height: 150,
    recommended: "短い日付やステータスを載せる白黒フチ風の小型土台"
  }
];
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const minimumAlphaPadding = 40;
const categories = new Set(["label-base", "date-badge", "corner", "accent", "divider", "frame"]);

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
  let chromaKeyGreenPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = y * rowBytes + x * bytesPerPixel;
      const alpha = pixels[offset + 3];
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      if (alpha > 8 && green > 210 && red < 80 && blue < 80) {
        chromaKeyGreenPixels += 1;
      }
    }
  }
  return { width, height, minX, minY, maxX, maxY, chromaKeyGreenPixels };
};

assert.ok(Array.isArray(lib.thumbnailMaterialLibrary), "thumbnail material library is exported");
assert.equal(typeof lib.createThumbnailMaterialLayer, "function", "material layer factory is exported");
assert.equal(lib.thumbnailMaterialCategoryLabels["date-badge"], "バッジ", "date-badge category is shown as バッジ for the category PR");
assert.equal(lib.thumbnailMaterialCategoryLabels.frame, "フレーム / パネル", "frame category is shown as フレーム / パネル for the category PR");
assert.equal(lib.thumbnailMaterialCategoryLabels.divider, "HUD線 / 区切り", "divider category is shown as HUD線 / 区切り for the category PR");
assert.equal(lib.thumbnailMaterialCategoryLabels.accent, "光 / グリント / エフェクト", "accent category is shown as 光 / グリント / エフェクト for the category PR");
assert.equal(lib.thumbnailMaterialCategoryLabels.corner, "角飾り", "corner category is reused for the corner accent category PR");

assert.equal(lib.thumbnailMaterialLibrary.length, expectedMaterials.length, "material library keeps the expected scoped size");
assert.deepEqual(
  lib.thumbnailMaterialLibrary.map((material) => material.id),
  expectedMaterials.map((material) => material.id),
  "material library exposes the expected first batch in review order"
);

for (const expected of expectedMaterials) {
  const material = lib.thumbnailMaterialLibrary.find((item) => item.id === expected.id);
  assert.ok(material, `${expected.id} material is registered`);
  assert.equal(material.category, expected.category, `${expected.id} category is stable`);
  assert.ok(categories.has(material.category), `${expected.id} category belongs to the compact first-batch set`);
  assert.equal(material.src, expected.src, `${expected.id} source is stable`);
  assert.equal(typeof material.name, "string", `${expected.id} has a display name`);
  assert.ok(material.name.length > 0 && material.name.length <= 24, `${expected.id} display name is concise`);
  assert.equal(typeof material.description, "string", `${expected.id} has an alt-style description`);
  assert.ok(material.description.length >= 12, `${expected.id} description is useful`);
  assert.equal(material.initialSize.width, expected.width, `${expected.id} initial width is defined`);
  assert.equal(material.initialSize.height, expected.height, `${expected.id} initial height is defined`);
  assert.equal(material.recommendedPlacement, expected.recommended, `${expected.id} recommended placement is defined`);

  const publicPath = path.join(root, "public", material.src.replace(/^\//, ""));
  assert.equal(fs.existsSync(publicPath), true, `${expected.id} material file exists`);
  assert.deepEqual(readPngSize(publicPath), { width: 768, height: 512 }, `${expected.id} uses the shared 768x512 material canvas`);
  const bounds = readPngAlphaBounds(publicPath);
  assert.ok(bounds.minX >= minimumAlphaPadding, `${expected.id} keeps left alpha padding`);
  assert.ok(bounds.width - bounds.maxX - 1 >= minimumAlphaPadding, `${expected.id} keeps right alpha padding`);
  assert.ok(bounds.minY >= minimumAlphaPadding, `${expected.id} keeps top alpha padding`);
  assert.ok(bounds.height - bounds.maxY - 1 >= minimumAlphaPadding, `${expected.id} keeps bottom alpha padding`);
  if (expected.src.startsWith(frameMaterialPrefix)) {
    assert.equal(bounds.chromaKeyGreenPixels, 0, `${expected.id} does not keep visible chroma-key green pixels`);
  }
  if (expected.src.startsWith(dividerMaterialPrefix)) {
    assert.equal(bounds.chromaKeyGreenPixels, 0, `${expected.id} does not keep visible chroma-key green pixels`);
  }
  if (expected.src.startsWith(effectMaterialPrefix)) {
    assert.equal(bounds.chromaKeyGreenPixels, 0, `${expected.id} does not keep visible chroma-key green pixels`);
  }
  if (expected.src.startsWith(cornerMaterialPrefix)) {
    assert.equal(bounds.chromaKeyGreenPixels, 0, `${expected.id} does not keep visible chroma-key green pixels`);
  }
  if (expected.src.startsWith(impactMaterialPrefix)) {
    assert.equal(bounds.chromaKeyGreenPixels, 0, `${expected.id} does not keep visible chroma-key green pixels`);
  }

  const layer = lib.createThumbnailMaterialLayer(expected.id);
  assert.equal(layer.type, "image", `${expected.id} creates an image layer`);
  assert.equal(layer.src, expected.src, `${expected.id} layer source matches material`);
  assert.equal(layer.name, `素材: ${material.name}`, `${expected.id} layer name is recognizable`);
  assert.equal(layer.width, expected.width, `${expected.id} layer width uses initial size`);
  assert.equal(layer.height, expected.height, `${expected.id} layer height uses initial size`);
  assert.equal(layer.locked, false, `${expected.id} layer is editable after insertion`);
}

assert.equal(lib.createThumbnailMaterialLayer("missing-material"), null, "unknown material ids are ignored");

const newMaterialSources = new Set(expectedMaterials.filter((item) => item.src.startsWith(materialPrefix)).map((item) => item.src));
for (const item of expectedMaterials.filter((item) => item.src.startsWith(labelMaterialPrefix))) {
  newMaterialSources.add(item.src);
}
for (const item of expectedMaterials.filter((item) => item.src.startsWith(badgeMaterialPrefix))) {
  newMaterialSources.add(item.src);
}
for (const item of expectedMaterials.filter((item) => item.src.startsWith(frameMaterialPrefix))) {
  newMaterialSources.add(item.src);
}
for (const item of expectedMaterials.filter((item) => item.src.startsWith(dividerMaterialPrefix))) {
  newMaterialSources.add(item.src);
}
for (const item of expectedMaterials.filter((item) => item.src.startsWith(effectMaterialPrefix))) {
  newMaterialSources.add(item.src);
}
for (const item of expectedMaterials.filter((item) => item.src.startsWith(cornerMaterialPrefix))) {
  newMaterialSources.add(item.src);
}
for (const item of expectedMaterials.filter((item) => item.src.startsWith(impactMaterialPrefix))) {
  newMaterialSources.add(item.src);
}
for (const preset of lib.thumbnailPresets) {
  for (const layer of preset.layers) {
    assert.equal(newMaterialSources.has(layer.src), false, `${preset.id} does not receive new material-only assets in initial layers`);
  }
}

assert.ok(componentSource.includes("MaterialLibraryPanel"), "Thumbnail Editor renders a material library panel");
assert.ok(componentSource.includes("onMaterial"), "quick add controls expose material insertion");
assert.ok(componentSource.includes("thumbnailMaterialLibrary"), "component uses the shared material library data");
assert.ok(
  componentSource.includes("素材はプリセットに後から足す飾りです。選ぶとレイヤーへ追加されます。"),
  "material library reads as a light supporting route for decorating a chosen preset"
);
assert.ok(componentSource.includes("materialSearchQuery"), "material library keeps local search state");
assert.ok(componentSource.includes("素材名・説明・推奨配置で検索"), "material library exposes lightweight search copy");
assert.ok(componentSource.includes("materialCategoryCounts"), "material library shows category counts");
assert.ok(componentSource.includes("max-h-[min(60vh,38rem)]"), "material library keeps dense results scrollable");
assert.ok(componentSource.includes("material.description"), "material cards keep descriptions visible and searchable");

console.log("thumbnail material asset contract checks passed");
