import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import zlib from "node:zlib";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
const copyPath = path.join(root, "lib", "thumbnail-editor-copy.ts");
const componentPath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const userMaterialStoragePath = path.join(root, "components", "thumbnail-editor", "thumbnailUserMaterialStorage.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const copySource = fs.readFileSync(copyPath, "utf8");
const componentSource = fs.readFileSync(componentPath, "utf8");
const userMaterialStorageSource = fs.existsSync(userMaterialStoragePath) ? fs.readFileSync(userMaterialStoragePath, "utf8") : "";
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
const iriamSquareAccentMaterialPrefix = "/assets/images/thumbnail-editor/materials/iriam-square-accent/";
const iriamSquareLabelBaseMaterialPrefix = "/assets/images/thumbnail-editor/materials/iriam-square-label-base/";
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
  },
  {
    id: "iriam-square-accent-puffy-star-pink",
    category: "accent",
    src: `${iriamSquareAccentMaterialPrefix}iriam-square-accent-puffy-star-pink-v1.png`,
    width: 220,
    height: 220,
    recommended: "タイトル横や余白に置く小さな星飾り"
  },
  {
    id: "iriam-square-accent-soft-heart-blue",
    category: "accent",
    src: `${iriamSquareAccentMaterialPrefix}iriam-square-accent-soft-heart-blue-v1.png`,
    width: 220,
    height: 200,
    recommended: "ゆるい告知や雑談向けの小さなハート"
  },
  {
    id: "iriam-square-accent-sparkle-mint",
    category: "accent",
    src: `${iriamSquareAccentMaterialPrefix}iriam-square-accent-sparkle-mint-v1.png`,
    width: 260,
    height: 210,
    recommended: "見出し周辺に重ねる軽いきらきら"
  },
  {
    id: "iriam-square-accent-hand-line-yellow",
    category: "accent",
    src: `${iriamSquareAccentMaterialPrefix}iriam-square-accent-hand-line-yellow-v1.png`,
    width: 420,
    height: 110,
    recommended: "短い見出し下へ置く手描きライン"
  },
  {
    id: "iriam-square-label-speech-bubble-pink",
    category: "label-base",
    src: `${iriamSquareLabelBaseMaterialPrefix}iriam-square-label-speech-bubble-pink-v1.png`,
    width: 390,
    height: 210,
    recommended: "短い一言や時刻の背面に置くピンク吹き出し"
  },
  {
    id: "iriam-square-label-rounded-mint",
    category: "label-base",
    src: `${iriamSquareLabelBaseMaterialPrefix}iriam-square-label-rounded-mint-v1.png`,
    width: 340,
    height: 136,
    recommended: "小さな補足やタグの背面に置くミントラベル"
  },
  {
    id: "iriam-square-label-cloud-blue",
    category: "label-base",
    src: `${iriamSquareLabelBaseMaterialPrefix}iriam-square-label-cloud-blue-v1.png`,
    width: 360,
    height: 178,
    recommended: "ゆるい告知や雑談メモの背面に置く青い雲ラベル"
  },
  {
    id: "iriam-square-label-tiny-ribbon-yellow-pink",
    category: "label-base",
    src: `${iriamSquareLabelBaseMaterialPrefix}iriam-square-label-tiny-ribbon-yellow-pink-v1.png`,
    width: 420,
    height: 150,
    recommended: "短いステータスや注釈の背面に置く小型リボン"
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
assert.equal(typeof lib.thumbnailProjectMaterialBoundary, "object", "project material boundary is exported");
assert.equal(typeof lib.thumbnailUserMaterialStoragePolicy, "object", "user material storage policy is exported");
assert.equal(typeof lib.normalizeThumbnailUserMaterialRef, "function", "user material ref normalizer is exported");
assert.equal(typeof lib.normalizeThumbnailUserMaterialRefs, "function", "user material ref list normalizer is exported");
assert.equal(typeof lib.createThumbnailUserMaterialLayer, "function", "user material layer factory is exported");
assert.equal(typeof lib.applyThumbnailUserMaterialLayerFallback, "function", "user material fallback helper is exported");
assert.equal(typeof lib.replaceThumbnailUserMaterialLayerRef, "function", "user material replace helper is exported");
assert.equal(typeof lib.formatThumbnailUserMaterialBytes, "function", "user material byte formatter is exported");
assert.equal(typeof lib.getThumbnailUserMaterialUsageSummary, "function", "user material usage summary helper is exported");
assert.equal(typeof lib.canAddThumbnailUserMaterialRef, "function", "user material capacity helper is exported");
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

assert.deepEqual(
  lib.thumbnailProjectMaterialBoundary,
  {
    owner: "project",
    imageStorage: "public-assets",
    mutableByUser: false,
    srcPrefix: "/assets/images/thumbnail-editor/"
  },
  "registered material stays project-bound and backed by repo assets"
);
assert.deepEqual(
  lib.thumbnailUserMaterialStoragePolicy,
  {
    owner: "user",
    imageStorage: "indexeddb",
    localStorageStoresImageBody: false,
    localStorageStores: ["metadata", "storageId"],
    supportedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
    maxRefs: 24,
    maxFileBytes: 8 * 1024 * 1024,
    maxTotalBytes: 48 * 1024 * 1024
  },
  "user-added material stores image bodies outside localStorage"
);

for (const expected of expectedMaterials) {
  const material = lib.thumbnailMaterialLibrary.find((item) => item.id === expected.id);
  assert.ok(material, `${expected.id} material is registered`);
  assert.equal(Object.hasOwn(material, "storageId"), false, `${expected.id} does not mix user storage ids into project material`);
  assert.equal(Object.hasOwn(material, "materialRef"), false, `${expected.id} does not mix user refs into project material`);
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
  if (expected.src.startsWith(iriamSquareAccentMaterialPrefix)) {
    assert.equal(bounds.chromaKeyGreenPixels, 0, `${expected.id} does not keep visible chroma-key green pixels`);
  }
  if (expected.src.startsWith(iriamSquareLabelBaseMaterialPrefix)) {
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

const userMaterialRef = lib.normalizeThumbnailUserMaterialRef({
  id: "user-material-01",
  name: "  配信者ロゴ  ",
  storageId: "thumb-user-material-logo-01",
  mimeType: "image/png",
  width: 1200,
  height: 630,
  byteSize: 348_512,
  createdAt: "2026-05-12T00:00:00.000Z",
  updatedAt: "2026-05-12T01:00:00.000Z",
  src: "data:image/png;base64,should-not-survive",
  imageData: "data:image/png;base64,should-not-survive",
  blob: { size: 348_512 },
  draft: { layers: [] }
});

assert.deepEqual(
  userMaterialRef,
  {
    id: "user-material-01",
    name: "配信者ロゴ",
    storageId: "thumb-user-material-logo-01",
    storage: "indexeddb",
    mimeType: "image/png",
    width: 1200,
    height: 630,
    byteSize: 348_512,
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T01:00:00.000Z"
  },
  "user material ref keeps only lightweight metadata and storage id"
);
assert.equal(JSON.stringify(userMaterialRef).includes("data:image"), false, "user material ref serialization excludes image bodies");
assert.equal(lib.formatThumbnailUserMaterialBytes(0), "0KB", "user material byte formatter handles empty libraries");
assert.equal(lib.formatThumbnailUserMaterialBytes(1536), "2KB", "user material byte formatter keeps small sizes concise");
assert.equal(lib.formatThumbnailUserMaterialBytes(8 * 1024 * 1024), "8MB", "user material byte formatter keeps large sizes concise");
assert.equal(
  lib.normalizeThumbnailUserMaterialRef({
    id: "user-material-02",
    name: "ロゴ",
    storageId: "thumb-user-material-logo-02",
    storage: "localStorage",
    mimeType: "image/png"
  }),
  null,
  "user material refs cannot claim localStorage image storage"
);
assert.deepEqual(
  lib.normalizeThumbnailUserMaterialRefs(
    [
      userMaterialRef,
      { ...userMaterialRef, id: "user-material-duplicate" },
      { ...userMaterialRef, id: "user-material-02", storageId: "thumb-user-material-logo-02", imageData: "data:image/png;base64,drop-me" },
      { ...userMaterialRef, id: "bad-mime", storageId: "thumb-user-material-logo-03", mimeType: "image/gif" }
    ],
    4
  ),
  [
    userMaterialRef,
    { ...userMaterialRef, id: "user-material-02", storageId: "thumb-user-material-logo-02" }
  ],
  "recent and favorite user material refs stay lightweight and unique by storage id"
);
const usageSummary = lib.getThumbnailUserMaterialUsageSummary([
  userMaterialRef,
  { ...userMaterialRef, id: "user-material-02", storageId: "thumb-user-material-logo-02", byteSize: 5 * 1024 * 1024 }
]);
assert.deepEqual(
  usageSummary,
  {
    count: 2,
    maxCount: 24,
    totalBytes: 5 * 1024 * 1024 + 348_512,
    maxTotalBytes: 48 * 1024 * 1024,
    remainingBytes: 48 * 1024 * 1024 - (5 * 1024 * 1024 + 348_512)
  },
  "user material usage summary is derived from lightweight metadata"
);
assert.deepEqual(
  lib.canAddThumbnailUserMaterialRef([userMaterialRef], 1024),
  { ok: true },
  "small user material can be added when count and total capacity allow it"
);
assert.deepEqual(
  lib.canAddThumbnailUserMaterialRef([userMaterialRef], 9 * 1024 * 1024),
  { ok: false, reason: "file-too-large" },
  "single user material file size is bounded"
);
assert.deepEqual(
  lib.canAddThumbnailUserMaterialRef(Array.from({ length: 24 }, (_, index) => ({ ...userMaterialRef, id: `full-${index}`, storageId: `full-${index}`, byteSize: 1024 })), 1024),
  { ok: false, reason: "library-full" },
  "user material count stays bounded"
);
assert.deepEqual(
  lib.canAddThumbnailUserMaterialRef([{ ...userMaterialRef, byteSize: 47 * 1024 * 1024 }], 2 * 1024 * 1024),
  { ok: false, reason: "total-bytes-exceeded" },
  "total user material metadata capacity is checked before saving another image body"
);
assert.deepEqual(
  lib.canAddThumbnailUserMaterialRef([{ ...userMaterialRef, byteSize: 47 * 1024 * 1024 }], 6 * 1024 * 1024, userMaterialRef.storageId),
  { ok: true },
  "replacement capacity subtracts the old lightweight ref before checking total size"
);

const userMaterialLayer = lib.createThumbnailUserMaterialLayer(userMaterialRef);
assert.equal(userMaterialLayer.type, "image", "user material creates an image layer");
assert.equal(userMaterialLayer.name, "素材: 配信者ロゴ", "user material layer remains recognizable as material");
assert.equal(userMaterialLayer.src, lib.thumbnailUserMaterialFallbackImageSrc, "user material layer does not embed the original image body in draft src");
assert.ok(decodeURIComponent(lib.thumbnailUserMaterialFallbackImageSrc).includes("MATERIAL MISSING"), "user material fallback canvas label reads as a missing image state");
assert.equal(decodeURIComponent(lib.thumbnailUserMaterialFallbackImageSrc).includes("USER MATERIAL"), false, "user material fallback canvas label does not look like a recoverable normal material");
assert.deepEqual(userMaterialLayer.materialRef, userMaterialRef, "user material layer carries the lightweight ref");
assert.equal(JSON.stringify(userMaterialLayer).includes("should-not-survive"), false, "user material layer serialization excludes dropped image bodies");

const draftWithUserMaterial = {
  ...lib.createDraftFromPreset("stream_announce"),
  layers: [...lib.createDraftFromPreset("stream_announce").layers, { ...userMaterialLayer, id: "user-material-layer", crop: { x: 0, y: 0, width: 1, height: 0.5 } }],
  selectedLayerId: "user-material-layer"
};
const deletedFallbackDraft = lib.applyThumbnailUserMaterialLayerFallback(draftWithUserMaterial, "thumb-user-material-logo-01", "deleted");
const deletedFallbackLayer = deletedFallbackDraft.layers.find((layer) => layer.id === "user-material-layer");
assert.equal(deletedFallbackLayer.type, "image", "delete fallback keeps an image layer instead of corrupting the draft");
assert.equal(deletedFallbackLayer.src, lib.thumbnailUserMaterialFallbackImageSrc, "delete fallback uses the shared missing material image");
assert.deepEqual(deletedFallbackLayer.crop, { x: 0, y: 0, width: 1, height: 0.5 }, "delete fallback preserves crop metadata");
assert.deepEqual(deletedFallbackLayer.materialRef, userMaterialRef, "delete fallback keeps the lightweight ref for recovery messaging");
assert.ok(deletedFallbackLayer.name.includes("削除済み"), "delete fallback labels the missing user material state");

const replacedRef = {
  ...userMaterialRef,
  id: "user-material-03",
  name: "差し替えロゴ",
  storageId: "thumb-user-material-logo-03",
  width: 1024,
  height: 512,
  byteSize: 222_000,
  updatedAt: "2026-05-12T02:00:00.000Z"
};
const replacedDraft = lib.replaceThumbnailUserMaterialLayerRef(draftWithUserMaterial, "user-material-layer", replacedRef);
const replacedLayer = replacedDraft.layers.find((layer) => layer.id === "user-material-layer");
assert.equal(replacedLayer.name, "素材: 差し替えロゴ", "replace helper updates the material layer label");
assert.deepEqual(replacedLayer.materialRef, replacedRef, "replace helper swaps to the new lightweight ref");
assert.equal(replacedLayer.src, lib.thumbnailUserMaterialFallbackImageSrc, "replace helper does not persist an image body in draft src");
assert.deepEqual(replacedLayer.crop, { x: 0, y: 0, width: 1, height: 0.5 }, "replace helper preserves crop metadata");

const loadFailureDraft = lib.applyThumbnailUserMaterialLayerFallback(replacedDraft, "thumb-user-material-logo-03", "load-failed");
const loadFailureLayer = loadFailureDraft.layers.find((layer) => layer.id === "user-material-layer");
assert.ok(loadFailureLayer.name.includes("読み込み失敗"), "load failure fallback has a visible boundary");
assert.equal(JSON.stringify(loadFailureDraft).includes("data:image/png;base64"), false, "fallback drafts do not store uploaded image bodies");

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
for (const item of expectedMaterials.filter((item) => item.src.startsWith(iriamSquareAccentMaterialPrefix))) {
  newMaterialSources.add(item.src);
}
for (const item of expectedMaterials.filter((item) => item.src.startsWith(iriamSquareLabelBaseMaterialPrefix))) {
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
  copySource.includes("素材はプリセットに後から足す飾りです。選ぶとレイヤーへ追加されます。"),
  "material library reads as a light supporting route for decorating a chosen preset"
);
assert.ok(componentSource.includes("materialSearchQuery"), "material library keeps local search state");
assert.ok(copySource.includes("素材名・説明・推奨配置で検索"), "material library exposes lightweight search copy");
assert.ok(componentSource.includes("materialCategoryCounts"), "material library shows category counts");
assert.ok(componentSource.includes("max-h-[min(60vh,38rem)]"), "material library keeps dense results scrollable");
assert.ok(componentSource.includes("materialDescription"), "material cards keep descriptions visible and searchable");
assert.ok(userMaterialStorageSource.includes("indexedDB.open"), "user material image bodies are stored through IndexedDB");
assert.ok(userMaterialStorageSource.includes("thumbnailUserMaterialRefsStorageKey"), "user material metadata has an explicit storage key");
assert.equal(userMaterialStorageSource.includes("localStorage.setItem") && userMaterialStorageSource.includes("data:image"), false, "user material metadata persistence does not write image bodies to localStorage");
assert.ok(componentSource.includes("UserMaterialLibraryPanel"), "Thumbnail Editor renders a separate user material library panel");
assert.ok(copySource.includes("ユーザー素材"), "user-added material UI is visible as a separate responsibility");
assert.ok(copySource.includes("登録済み素材"), "registered material UI remains visually separate from user-added material UI");
assert.ok(copySource.includes("追加した画像はこのブラウザに保存され、下書きには参照だけを残します。"), "user material panel explains storage without mixing it with registered material copy");
assert.ok(copySource.includes("最大24件 / 1点8MB / 合計48MB"), "user material panel shows the lightweight capacity boundary");
assert.ok(copySource.includes("要再追加の素材は置換で復旧できます。不要な素材は削除してください。"), "user material panel gives concise recovery and cleanup guidance");
assert.equal(componentSource.includes(">fallback<"), false, "user material fallback preview does not expose English implementation copy");
assert.ok(copySource.includes("要再追加"), "user material fallback preview makes clear the image must be added again");
assert.equal(componentSource.includes(">復元待ち<"), false, "user material fallback preview does not imply waiting will restore the image");
assert.ok(copySource.includes("配置済みレイヤーは残ります"), "user material delete copy explains existing layers are preserved");
assert.ok(componentSource.includes("onReplaceUserMaterial"), "user-added material UI exposes replace without changing geometry");
assert.ok(componentSource.includes("onDeleteUserMaterial"), "user-added material UI exposes delete with fallback handling");
assert.ok(componentSource.includes("replaceThumbnailUserMaterialLayerRef"), "user material replace uses the shared geometry-preserving helper");
assert.ok(componentSource.includes("resolveThumbnailUserMaterialImageUrl"), "canvas rendering resolves user material blobs at render time instead of persisting image bodies in draft");

console.log("thumbnail material asset contract checks passed");
