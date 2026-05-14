export type ThumbnailCanvasSizeId = "hd" | "full-hd";
export type ThumbnailPresetId =
  | "stream_announce"
  | "first_stream"
  | "anniversary_stream"
  | "endurance_stream"
  | "project_stream"
  | "karaoke"
  | "chatting"
  | "clip"
  | "game_live"
  | "collaboration"
  | "announcement"
  | "weekly_schedule"
  | "x_announcement";
export type ThumbnailPresetCategory = "配信ジャンル" | "告知画像" | "スケジュール";
export type ThumbnailLayerType = "image" | "text" | "shape";
export type ThumbnailShapeType = "rect" | "circle" | "line" | "burst" | "frame" | "polygon";
export type ThumbnailMaterialCategory = "label-base" | "date-badge" | "corner" | "accent" | "divider" | "frame";
export type ThumbnailMaterial = {
  id: string;
  name: string;
  category: ThumbnailMaterialCategory;
  description: string;
  src: string;
  initialSize: {
    width: number;
    height: number;
  };
  initialPosition: {
    x: number;
    y: number;
  };
  recommendedPlacement: string;
};
export type ThumbnailImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type ThumbnailProjectMaterialBoundary = {
  owner: "project";
  imageStorage: "public-assets";
  mutableByUser: false;
  srcPrefix: "/assets/images/thumbnail-editor/";
};
export type ThumbnailUserMaterialStoragePolicy = {
  owner: "user";
  imageStorage: "indexeddb";
  localStorageStoresImageBody: false;
  localStorageStores: ["metadata", "storageId"];
  supportedMimeTypes: ThumbnailUserMaterialMimeType[];
  maxRefs: number;
  maxFileBytes: number;
  maxTotalBytes: number;
};
export type ThumbnailUserMaterialMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";
export type ThumbnailUserMaterialRef = {
  id: string;
  name: string;
  storageId: string;
  storage: "indexeddb";
  mimeType: ThumbnailUserMaterialMimeType;
  width?: number;
  height?: number;
  byteSize?: number;
  createdAt?: string;
  updatedAt?: string;
};
export type ThumbnailUserMaterialFallbackReason = "deleted" | "replaced" | "load-failed";
export type ThumbnailUserMaterialUsageSummary = {
  count: number;
  maxCount: number;
  totalBytes: number;
  maxTotalBytes: number;
  remainingBytes: number;
};
export type ThumbnailUserMaterialCapacityResult =
  | { ok: true }
  | { ok: false; reason: "file-too-large" | "library-full" | "total-bytes-exceeded" };
export type ThumbnailStandeePlacementPresetId =
  | "solo-right-half"
  | "solo-left-half"
  | "solo-center-half"
  | "solo-right-bust"
  | "solo-center-face"
  | "duo-left"
  | "duo-right"
  | "trio-left"
  | "trio-center"
  | "trio-right";
export type ThumbnailStandeePlacementPreset = {
  id: ThumbnailStandeePlacementPresetId;
  name: string;
  description: string;
  group: "1人" | "2人" | "3人";
  disabledReason?: string;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  crop?: ThumbnailImageCrop;
};

export type ThumbnailCanvas = {
  width: number;
  height: number;
};
export type ThumbnailPresetVariantId = "landscape-16-9" | "portrait-9-16" | "square-1-1";
export type ThumbnailPresetVariantAspectRatio = "16:9" | "9:16" | "1:1";
export type ThumbnailPresetVariant = {
  id: ThumbnailPresetVariantId;
  label: string;
  canvas: ThumbnailCanvas;
  aspectRatio: ThumbnailPresetVariantAspectRatio;
  intendedUse: string;
};
export type ThumbnailPresetVariantRef = {
  presetId: ThumbnailPresetId;
  variantId: ThumbnailPresetVariantId;
};
export type ThumbnailPresetVariantRelation = {
  presetId: ThumbnailPresetId;
  familyId: string;
  defaultVariantId: ThumbnailPresetVariantId;
  variantIds: ThumbnailPresetVariantId[];
};
export type ThumbnailPresetBatchCandidateId =
  | "karaoke_stream"
  | "chat_stream"
  | "gameplay_stream"
  | "notice_stream"
  | "highlight_clip";
export type ThumbnailPresetBatchTextLayerRole = "見出し" | "時刻" | "サブ" | "ラベル";
export type ThumbnailPresetBatchDependency = "variant" | "partial-apply" | "font-policy" | "material-boundary" | "handoff";
export type ThumbnailPresetBatchCandidate = {
  id: ThumbnailPresetBatchCandidateId;
  label: string;
  useCase: string;
  recommendedVariantId: ThumbnailPresetVariantId;
  requiredTextLayerRoles: ThumbnailPresetBatchTextLayerRole[];
  requiredMaterialCategories: ThumbnailMaterialCategory[];
  dependsOn: ThumbnailPresetBatchDependency[];
};
export type ThumbnailPresetBatchReadinessPolicy = {
  owner: "thumbnail-editor";
  checksOnly: boolean;
  allowsAutoFix: boolean;
  allowsGeneration: boolean;
  addsPresetBodies: boolean;
  addsAssets: boolean;
  addsFontAssets: boolean;
  changesMaterialRegistration: boolean;
};
export type ThumbnailPresetBatchReadinessWarning = {
  id: string;
  message: string;
  tone: "warning";
};
export type ThumbnailPresetBatchReadiness = {
  candidateId: string;
  ready: boolean;
  warnings: ThumbnailPresetBatchReadinessWarning[];
  policy: ThumbnailPresetBatchReadinessPolicy;
};
export type ThumbnailPresetBatchReadinessSummary = {
  total: number;
  readyCount: number;
  warningCount: number;
  items: ThumbnailPresetBatchReadiness[];
};

export type ThumbnailFontPolicy = {
  owner: "thumbnail-editor";
  source: "system-or-browser-installed" | "self-hosted-thumbnail-editor-assets";
  allowsExternalNetworkFonts: boolean;
  allowsGoogleFonts: boolean;
  allowsCdnFonts: boolean;
  allowsBundledFontAssetsInThisPr: boolean;
  fallbackFamily: string;
  fallbackStack: string[];
};
export type ThumbnailFontLanguage = "ja" | "en";
export type ThumbnailFontAsset = {
  weight: number;
  style: "normal";
  format: "woff2";
  path: string;
};
export type ThumbnailFontManifestEntry = {
  family: string;
  language: ThumbnailFontLanguage;
  category: string;
  mood: string;
  bestFor: string;
  caution: string;
  sourceUrl: string;
  assetBasePath?: string;
  assetSubset?: string;
  license?: string;
  assets?: ThumbnailFontAsset[];
};
export type ThumbnailFontListboxOption = {
  family: string;
  label: string;
  language: ThumbnailFontLanguage;
  category: string;
  mood: string;
};
export type ThumbnailFontListboxCategory = {
  label: string;
  options: ThumbnailFontListboxOption[];
};
export type ThumbnailFontListboxGroup = {
  language: ThumbnailFontLanguage;
  label: string;
  categories: ThumbnailFontListboxCategory[];
};
export type ThumbnailFontLoadRequest = {
  fontFamily: string;
  canvasFont: string;
};
export type ThumbnailFontFaceSetLike = {
  load?: (font: string) => Promise<unknown> | unknown;
  ready?: Promise<unknown> | unknown;
};
export type ThumbnailFontLoadResult = {
  status: "loaded" | "unsupported" | "timeout" | "failed";
  attemptedFonts: string[];
  loadedFonts: string[];
  failedFonts: string[];
  timedOut: boolean;
  usedFallback: boolean;
};

export type ThumbnailBaseLayer = {
  id: string;
  name: string;
  type: ThumbnailLayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  blur: number;
  locked?: boolean;
  hidden?: boolean;
};

export type ThumbnailImageLayer = ThumbnailBaseLayer & {
  type: "image";
  src: string;
  materialRef?: ThumbnailUserMaterialRef;
  crop?: ThumbnailImageCrop;
};

export type ThumbnailTextAlign = "left" | "center" | "right";

export type ThumbnailTextLayer = ThumbnailBaseLayer & {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  align: ThumbnailTextAlign;
  bold: boolean;
  italic: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
};

export type ThumbnailShapeLayer = ThumbnailBaseLayer & {
  type: "shape";
  shapeType: ThumbnailShapeType;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius: number;
};

export type ThumbnailLayer = ThumbnailImageLayer | ThumbnailTextLayer | ThumbnailShapeLayer;
export type ThumbnailResizeHandle = "nw" | "ne" | "sw" | "se";
export type ThumbnailHandleKind = ThumbnailResizeHandle | "rotate";

export type ThumbnailEditorDraft = {
  version: 1;
  canvas: ThumbnailCanvas;
  presetId: ThumbnailPresetId;
  layers: ThumbnailLayer[];
  selectedLayerId: string | null;
  updatedAt: string;
};

export type ThumbnailPreset = {
  id: ThumbnailPresetId;
  name: string;
  category: ThumbnailPresetCategory;
  usageLabel: string;
  description: string;
  accent: string;
  layers: ThumbnailLayer[];
};

export type ThumbnailQualityGuardTone = "warning" | "hint" | "ok";
export type ThumbnailQualityGuardItem = {
  id: string;
  tone: ThumbnailQualityGuardTone;
  message: string;
};
export type ThumbnailQualityGuardSummary = {
  tone: ThumbnailQualityGuardTone;
  label: string;
  messages: string[];
};

export const thumbnailDraftStorageKey = "v-streamer-tools:thumbnail-editor:draft:v1";
export const thumbnailPresetDiscoveryStorageKey = "v-streamer-tools:thumbnail-editor:preset-discovery:v1";
export const thumbnailPresetRecentLimit = 6;
export const thumbnailShapeTypeLabels: Record<ThumbnailShapeType, string> = {
  rect: "矩形",
  circle: "円形",
  line: "線",
  burst: "衝撃マーク",
  frame: "枠",
  polygon: "多角形"
};
export const thumbnailMaterialCategoryLabels: Record<ThumbnailMaterialCategory, string> = {
  "label-base": "ラベル土台",
  "date-badge": "バッジ",
  corner: "角飾り",
  accent: "光 / グリント / エフェクト",
  divider: "HUD線 / 区切り",
  frame: "フレーム / パネル"
};
export const thumbnailProjectMaterialBoundary: ThumbnailProjectMaterialBoundary = {
  owner: "project",
  imageStorage: "public-assets",
  mutableByUser: false,
  srcPrefix: "/assets/images/thumbnail-editor/"
};
export const thumbnailUserMaterialStoragePolicy: ThumbnailUserMaterialStoragePolicy = {
  owner: "user",
  imageStorage: "indexeddb",
  localStorageStoresImageBody: false,
  localStorageStores: ["metadata", "storageId"],
  supportedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  maxRefs: 24,
  maxFileBytes: 8 * 1024 * 1024,
  maxTotalBytes: 48 * 1024 * 1024
};

export type ThumbnailPresetFilter = {
  query: string;
  category: ThumbnailPresetCategory | "all";
  usageLabel: string | "all";
};

export type ThumbnailPresetDiscoveryState = {
  version: 1;
  recentPresetIds: ThumbnailPresetId[];
  favoritePresetIds: ThumbnailPresetId[];
  recentPresetVariantRefs: ThumbnailPresetVariantRef[];
  favoritePresetVariantRefs: ThumbnailPresetVariantRef[];
};

export const thumbnailMainTextCarryoverTargets = [
  { id: "headline", label: "見出し", namePart: "見出し" },
  { id: "time", label: "時刻", namePart: "時刻" },
  { id: "sub", label: "サブ", namePart: "サブ" },
  { id: "label", label: "ラベル", namePart: "ラベル" }
] as const;
export type ThumbnailMainTextCarryoverKey = (typeof thumbnailMainTextCarryoverTargets)[number]["id"];
export type ThumbnailMainTextCarryover = Partial<Record<ThumbnailMainTextCarryoverKey, string>>;

const thumbnailQualitySafeAreaInsetRatio = 0.04;
const thumbnailQualityTextWidthWarnRatio = 0.92;
const thumbnailQualityCropWarnRatio = 0.65;
const thumbnailQualityOpacityWarnRatio = 0.65;
const thumbnailHexToRgb = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16)
  };
};
const thumbnailRelativeLuminance = (color: { r: number; g: number; b: number }) => {
  const values = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
};
const thumbnailContrastRatio = (a: string, b: string) => {
  const first = thumbnailHexToRgb(a);
  const second = thumbnailHexToRgb(b);
  if (!first || !second) {
    return 1;
  }
  const light = Math.max(thumbnailRelativeLuminance(first), thumbnailRelativeLuminance(second));
  const dark = Math.min(thumbnailRelativeLuminance(first), thumbnailRelativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
};
const getThumbnailEstimatedTextLineWidth = (text: string, fontSize: number) =>
  Array.from(text).reduce((total, character) => total + (/[ -~]/.test(character) ? 0.55 : 1), 0) * fontSize * 0.9;
const hasThumbnailTextReadabilityRisk = (layer: ThumbnailTextLayer) =>
  layer.text
    .split("\n")
    .some((line) => line.trim().length > 0 && getThumbnailEstimatedTextLineWidth(line.trim(), layer.fontSize) > layer.width * thumbnailQualityTextWidthWarnRatio);
const hasThumbnailImageCropRisk = (layer: ThumbnailImageLayer) =>
  Boolean(layer.crop && (layer.crop.width < thumbnailQualityCropWarnRatio || layer.crop.height < thumbnailQualityCropWarnRatio));
const hasThumbnailImageUnresolvedRisk = (layer: ThumbnailImageLayer) =>
  Boolean(
    layer.materialRef &&
      (layer.src === thumbnailUserMaterialFallbackImageSrc || layer.name.includes("削除済み") || layer.name.includes("読み込み失敗"))
  );
const isThumbnailQualityUserImageLayer = (layer: ThumbnailLayer): layer is ThumbnailImageLayer =>
  layer.type === "image" && (layer.src.startsWith("data:image/") || Boolean(layer.materialRef) || layer.name === "画像" || layer.name === "ユーザー素材");

const getThumbnailQualityGuardItemsForLayers = (
  draft: ThumbnailEditorDraft,
  targetLayers: ThumbnailLayer[],
  scope: "selected" | "overall"
): ThumbnailQualityGuardItem[] => {
  const items: ThumbnailQualityGuardItem[] = [];
  const safeX = draft.canvas.width * thumbnailQualitySafeAreaInsetRatio;
  const safeY = draft.canvas.height * thumbnailQualitySafeAreaInsetRatio;
  const minTextSize = scope === "overall" ? (draft.canvas.width >= 1800 ? 48 : 32) : draft.canvas.width >= 1800 ? 54 : 36;

  const hasUnsafeLayer = targetLayers.some(
    (layer) => layer.x < safeX || layer.y < safeY || layer.x + layer.width > draft.canvas.width - safeX || layer.y + layer.height > draft.canvas.height - safeY
  );
  if (hasUnsafeLayer) {
    items.push({ id: scope === "selected" ? "selected-layer-safe-area" : "overall-safe-area", tone: "warning", message: "セーフエリア外に注意" });
  }

  const textLayers = targetLayers.filter((layer): layer is ThumbnailTextLayer => layer.type === "text");
  if (textLayers.some((layer) => layer.fontSize < minTextSize)) {
    items.push({ id: scope === "selected" ? "selected-text-size" : "overall-text-size", tone: "warning", message: "文字が小さめです" });
  }
  if (
    textLayers.some((layer) => {
      const strokeContrast = thumbnailContrastRatio(layer.color, layer.strokeColor);
      const shadowContrast = thumbnailContrastRatio(layer.color, layer.shadowColor);
      return layer.strokeWidth < 4 && layer.shadowBlur < 8 && Math.max(strokeContrast, shadowContrast) < 3;
    })
  ) {
    items.push({ id: scope === "selected" ? "selected-text-contrast" : "overall-text-contrast", tone: "hint", message: "縁取りか影を足すと安心" });
  }
  if (textLayers.some(hasThumbnailTextReadabilityRisk)) {
    items.push({ id: scope === "selected" ? "selected-text-readability" : "overall-text-readability", tone: "hint", message: "長文は改行も確認" });
  }
  if (textLayers.some((layer) => layer.opacity < thumbnailQualityOpacityWarnRatio)) {
    items.push({ id: scope === "selected" ? "selected-text-opacity" : "overall-text-opacity", tone: "hint", message: "文字の透け具合を確認" });
  }

  const imageLayers = targetLayers.filter((layer): layer is ThumbnailImageLayer => layer.type === "image");
  if (imageLayers.some(hasThumbnailImageUnresolvedRisk)) {
    items.push({ id: scope === "selected" ? "selected-image-unresolved" : "overall-image-unresolved", tone: "warning", message: "画像の再追加を確認" });
  }
  if (imageLayers.some(hasThumbnailImageCropRisk)) {
    items.push({ id: scope === "selected" ? "selected-image-crop" : "overall-image-crop", tone: "hint", message: "見切れ具合を確認" });
  }

  return items;
};

const sortThumbnailQualityGuardItems = (items: ThumbnailQualityGuardItem[]) => {
  const toneOrder: Record<ThumbnailQualityGuardTone, number> = {
    warning: 0,
    hint: 1,
    ok: 2
  };
  return [...items].sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);
};

export const getThumbnailQualityGuardItems = (draft: ThumbnailEditorDraft, selectedLayerId: string | null = draft.selectedLayerId): ThumbnailQualityGuardItem[] => {
  const selectedLayer = draft.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const targetLayers = selectedLayer ? [selectedLayer] : draft.layers;
  const items = getThumbnailQualityGuardItemsForLayers(draft, targetLayers, "selected");

  return items.length > 0 ? sortThumbnailQualityGuardItems(items) : [{ id: "thumbnail-quality-ok", tone: "ok", message: "品質チェックOK" }];
};

const isThumbnailQualityStructuralBackgroundLayer = (draft: ThumbnailEditorDraft, layer: ThumbnailLayer) =>
  layer.type === "image" && layer.name.includes("背景") && layer.width >= draft.canvas.width && layer.height >= draft.canvas.height;

export const getThumbnailOverallQualityGuardItems = (draft: ThumbnailEditorDraft): ThumbnailQualityGuardItem[] => {
  const textLayers = draft.layers.filter((layer): layer is ThumbnailTextLayer => layer.type === "text" && !layer.hidden);
  const userImageLayers = draft.layers.filter((layer) => !layer.hidden && isThumbnailQualityUserImageLayer(layer));
  const items = getThumbnailQualityGuardItemsForLayers(draft, [...textLayers, ...userImageLayers], "overall");

  if (draft.layers.some((layer) => !isThumbnailQualityStructuralBackgroundLayer(draft, layer) && layer.hidden)) {
    items.push({ id: "overall-hidden-layers", tone: "hint", message: "非表示レイヤーあり" });
  }
  if (draft.layers.some((layer) => !isThumbnailQualityStructuralBackgroundLayer(draft, layer) && layer.locked)) {
    items.push({ id: "overall-locked-layers", tone: "hint", message: "ロック中レイヤーあり" });
  }

  return items.length > 0 ? sortThumbnailQualityGuardItems(items) : [{ id: "thumbnail-quality-ok", tone: "ok", message: "品質チェックOK" }];
};

export const getThumbnailQualityGuardSummary = (items: ThumbnailQualityGuardItem[]): ThumbnailQualityGuardSummary => {
  const activeItems = items.filter((item) => item.tone !== "ok");
  if (activeItems.length === 0) {
    return { tone: "ok", label: "品質チェックOK", messages: ["そのまま書き出せます"] };
  }
  return {
    tone: activeItems.some((item) => item.tone === "warning") ? "warning" : "hint",
    label: `注意 ${activeItems.length}件`,
    messages: activeItems.slice(0, 2).map((item) => item.message)
  };
};

export const thumbnailStandeePlacementPresets = [
  {
    id: "solo-right-half",
    name: "右 / 半身",
    description: "右側に半身立ち絵を置く基本位置。",
    group: "1人",
    frame: { x: 790, y: 70, width: 390, height: 610 }
  },
  {
    id: "solo-left-half",
    name: "左 / 半身",
    description: "左側に半身立ち絵を置く基本位置。",
    group: "1人",
    frame: { x: 100, y: 70, width: 390, height: 610 }
  },
  {
    id: "solo-center-half",
    name: "中央 / 半身",
    description: "中央に半身立ち絵を置く基本位置。",
    group: "1人",
    frame: { x: 445, y: 70, width: 390, height: 610 }
  },
  {
    id: "solo-right-bust",
    name: "右 / バスト",
    description: "右側にバストアップを大きめに置く。",
    group: "1人",
    frame: { x: 730, y: 110, width: 470, height: 560 },
    crop: { x: 0, y: 0, width: 1, height: 0.5 }
  },
  {
    id: "solo-center-face",
    name: "中央 / 顔寄り",
    description: "中央に顔寄りの大きな立ち絵を置く。",
    group: "1人",
    frame: { x: 390, y: 36, width: 500, height: 650 },
    crop: { x: 0, y: 0, width: 1, height: 1 / 3 }
  },
  {
    id: "duo-left",
    name: "2人 / 左",
    description: "コラボ2人用の左側スロット。",
    group: "2人",
    frame: { x: 250, y: 96, width: 360, height: 585 }
  },
  {
    id: "duo-right",
    name: "2人 / 右",
    description: "コラボ2人用の右側スロット。",
    group: "2人",
    frame: { x: 670, y: 96, width: 360, height: 585 }
  },
  {
    id: "trio-left",
    name: "3人 / 左",
    description: "コラボ3人用の左側スロット。",
    group: "3人",
    frame: { x: 300, y: 110, width: 320, height: 550 }
  },
  {
    id: "trio-center",
    name: "3人 / 中央",
    description: "コラボ3人用の中央スロット。",
    group: "3人",
    frame: { x: 480, y: 110, width: 320, height: 550 }
  },
  {
    id: "trio-right",
    name: "3人 / 右",
    description: "コラボ3人用の右側スロット。",
    group: "3人",
    frame: { x: 660, y: 110, width: 320, height: 550 }
  }
] satisfies ThumbnailStandeePlacementPreset[];

export const thumbnailCanvasSizes: Record<ThumbnailCanvasSizeId, ThumbnailCanvas & { label: string }> = {
  hd: { width: 1280, height: 720, label: "1280 x 720 (16:9)" },
  "full-hd": { width: 1920, height: 1080, label: "1920 x 1080 (16:9)" }
};
export const thumbnailPresetVariants: Record<ThumbnailPresetVariantId, ThumbnailPresetVariant> = {
  "landscape-16-9": {
    id: "landscape-16-9",
    label: "横長 16:9",
    canvas: { width: 1280, height: 720 },
    aspectRatio: "16:9",
    intendedUse: "YouTube配信サムネ / 通常告知"
  },
  "portrait-9-16": {
    id: "portrait-9-16",
    label: "縦長 9:16",
    canvas: { width: 1080, height: 1920 },
    aspectRatio: "9:16",
    intendedUse: "Shorts / 縦長告知の設計候補"
  },
  "square-1-1": {
    id: "square-1-1",
    label: "正方形 1:1",
    canvas: { width: 1080, height: 1080 },
    aspectRatio: "1:1",
    intendedUse: "SNS投稿 / 正方形告知の設計候補"
  }
};

export const thumbnailFontGroups = [
  {
    label: "日本語",
    fonts: [
      "Noto Sans JP",
      "M PLUS 1p",
      "M PLUS Rounded 1c",
      "Zen Kaku Gothic New",
      "BIZ UDPGothic",
      "Kosugi Maru",
      "Yomogi",
      "Hachi Maru Pop",
      "Kiwi Maru",
      "Noto Serif JP"
    ]
  },
  {
    label: "English",
    fonts: [
      "Anton",
      "Oswald",
      "Bebas Neue",
      "Bangers",
      "Fredoka",
      "Poppins",
      "Montserrat",
      "Playfair Display",
      "Pacifico",
      "Rubik"
    ]
  }
];
export const thumbnailFonts = thumbnailFontGroups.flatMap((group) => group.fonts);
export const thumbnailJapaneseFontAssetSubset = "thumbnail-editor-ja-seed-v1";
export const thumbnailEnglishFontAssetSubset = "thumbnail-editor-en-seed-v1";
export const thumbnailJapaneseFontLicense = "SIL Open Font License 1.1; see public/fonts/thumbnail-editor/LICENSES.md";
export const thumbnailEnglishFontLicense = "SIL Open Font License 1.1; see public/fonts/thumbnail-editor/LICENSES.md";
const createThumbnailJapaneseFontAssets = (slug: string, weights: number[]): ThumbnailFontAsset[] =>
  weights.map((weight) => ({
    weight,
    style: "normal",
    format: "woff2",
    path: `/fonts/thumbnail-editor/${slug}/${slug}-${weight}-ja-seed-v1.woff2`
  }));
const createThumbnailEnglishFontAssets = (slug: string, weights: number[]): ThumbnailFontAsset[] =>
  weights.map((weight) => ({
    weight,
    style: "normal",
    format: "woff2",
    path: `/fonts/thumbnail-editor/${slug}/${slug}-${weight}-en-seed-v1.woff2`
  }));
const withThumbnailJapaneseFontAssets = (
  entry: Omit<ThumbnailFontManifestEntry, "assetBasePath" | "assetSubset" | "license" | "assets">,
  slug: string,
  weights: number[]
): ThumbnailFontManifestEntry => ({
  ...entry,
  assetBasePath: `/fonts/thumbnail-editor/${slug}/`,
  assetSubset: thumbnailJapaneseFontAssetSubset,
  license: thumbnailJapaneseFontLicense,
  assets: createThumbnailJapaneseFontAssets(slug, weights)
});
const withThumbnailEnglishFontAssets = (
  entry: Omit<ThumbnailFontManifestEntry, "assetBasePath" | "assetSubset" | "license" | "assets">,
  slug: string,
  weights: number[]
): ThumbnailFontManifestEntry => ({
  ...entry,
  assetBasePath: `/fonts/thumbnail-editor/${slug}/`,
  assetSubset: thumbnailEnglishFontAssetSubset,
  license: thumbnailEnglishFontLicense,
  assets: createThumbnailEnglishFontAssets(slug, weights)
});
export const thumbnailFontManifest: ThumbnailFontManifestEntry[] = [
  withThumbnailJapaneseFontAssets({
    family: "Noto Sans JP",
    language: "ja",
    category: "太字見出し / 汎用",
    mood: "太字見出し、読みやすいゴシック",
    bestFor: "見出し、サブ、UI 的な短文",
    caution: "weight が多く日本語容量が重い。初期 load は必要 weight を絞る。",
    sourceUrl: "https://fonts.google.com/specimen/Noto+Sans+JP"
  }, "noto-sans-jp", [400, 700, 900]),
  withThumbnailJapaneseFontAssets({
    family: "M PLUS 1p",
    language: "ja",
    category: "太字見出し / 汎用",
    mood: "ポップ、現代的、太字向き",
    bestFor: "見出し、告知文、サブ",
    caution: "細い weight はサムネで弱い。見出しは bold 系前提。",
    sourceUrl: "https://fonts.google.com/specimen/M+PLUS+1p"
  }, "m-plus-1p", [400, 700, 900]),
  withThumbnailJapaneseFontAssets({
    family: "BIZ UDPGothic",
    language: "ja",
    category: "読みやすいゴシック",
    mood: "読みやすい、実用、情報整理",
    bestFor: "サブ、日程、説明、長めの日本語",
    caution: "display 感は弱い。装飾は stroke / shadow 側で補う。",
    sourceUrl: "https://fonts.google.com/specimen/BIZ+UDPGothic"
  }, "biz-udpgothic", [400, 700]),
  withThumbnailJapaneseFontAssets({
    family: "Zen Kaku Gothic New",
    language: "ja",
    category: "読みやすいゴシック",
    mood: "すっきり、上品、配信告知向き",
    bestFor: "見出し、サブ、告知",
    caution: "太字でもやや静か。強いゲーム系には別 font を使う。",
    sourceUrl: "https://fonts.google.com/specimen/Zen+Kaku+Gothic+New"
  }, "zen-kaku-gothic-new", [400, 700, 900]),
  withThumbnailJapaneseFontAssets({
    family: "M PLUS Rounded 1c",
    language: "ja",
    category: "かわいい / 丸ゴ",
    mood: "かわいい、やわらかい、親しみ",
    bestFor: "雑談、歌枠、かわいい見出し",
    caution: "丸さが強い。硬い告知やシリアス用途では使いすぎ注意。",
    sourceUrl: "https://fonts.google.com/specimen/M+PLUS+Rounded+1c"
  }, "m-plus-rounded-1c", [400, 700, 900]),
  withThumbnailJapaneseFontAssets({
    family: "Kosugi Maru",
    language: "ja",
    category: "かわいい / 丸ゴ",
    mood: "やさしい、丸い、軽い",
    bestFor: "サブ、ラベル、かわいい短文",
    caution: "weight が限定的。大見出しは縁取りで補強する。",
    sourceUrl: "https://fonts.google.com/specimen/Kosugi+Maru"
  }, "kosugi-maru", [400]),
  withThumbnailJapaneseFontAssets({
    family: "Noto Serif JP",
    language: "ja",
    category: "上品 / 和風",
    mood: "上品、和風、落ち着き",
    bestFor: "記念配信、告知、上品な見出し",
    caution: "日本語容量が重い。本文より短い見出し向き。",
    sourceUrl: "https://fonts.google.com/specimen/Noto+Serif+JP"
  }, "noto-serif-jp", [400, 700, 900]),
  withThumbnailJapaneseFontAssets({
    family: "Kiwi Maru",
    language: "ja",
    category: "上品 / レトロ",
    mood: "ほんのりレトロ、上品、丸み",
    bestFor: "雑談、レトロ、柔らかい見出し",
    caution: "700 がないため強め用途は 500 と縁取りで補う。大きめサイズで使う。",
    sourceUrl: "https://fonts.google.com/specimen/Kiwi+Maru"
  }, "kiwi-maru", [400, 500]),
  withThumbnailJapaneseFontAssets({
    family: "Yomogi",
    language: "ja",
    category: "手書き / ラフ",
    mood: "手書き、ゆるい、親近感",
    bestFor: "手書きコメント、補足、ゆるい告知",
    caution: "長文や小サイズは読みにくい。アクセント用途を基本にする。",
    sourceUrl: "https://fonts.google.com/specimen/Yomogi"
  }, "yomogi", [400]),
  withThumbnailJapaneseFontAssets({
    family: "Hachi Maru Pop",
    language: "ja",
    category: "手書き / ポップ",
    mood: "手書き、かわいい、個性強め",
    bestFor: "かわいいアクセント、短い見出し",
    caution: "display 向き。可読性が必要な本文には使わない。",
    sourceUrl: "https://fonts.google.com/specimen/Hachi+Maru+Pop"
  }, "hachi-maru-pop", [400]),
  withThumbnailJapaneseFontAssets({
    family: "RocknRoll One",
    language: "ja",
    category: "レトロ / ポップ",
    mood: "レトロ、元気、ポップ",
    bestFor: "強めの日本語見出し、企画タイトル",
    caution: "weight 選択が少ない。繊細な用途には不向き。",
    sourceUrl: "https://fonts.google.com/specimen/RocknRoll+One"
  }, "rocknroll-one", [400]),
  withThumbnailJapaneseFontAssets({
    family: "DotGothic16",
    language: "ja",
    category: "レトロ / ピクセル",
    mood: "ピクセル、ゲーム風、レトロ",
    bestFor: "ゲーム風ラベル、ドット風企画",
    caution: "小サイズでは潰れやすい。本文や細かい日程には使わない。",
    sourceUrl: "https://fonts.google.com/specimen/DotGothic16"
  }, "dotgothic16", [400]),
  withThumbnailEnglishFontAssets({
    family: "Anton",
    language: "en",
    category: "Impact headline",
    mood: "太字、圧縮、インパクト",
    bestFor: "英字見出し、強いラベル",
    caution: "日本語は不可。英字大文字中心で使う。",
    sourceUrl: "https://fonts.google.com/specimen/Anton"
  }, "anton", [400]),
  withThumbnailEnglishFontAssets({
    family: "Bebas Neue",
    language: "en",
    category: "Impact headline",
    mood: "スタイリッシュ、縦長、サムネ向き",
    bestFor: "配信タイトル、時刻、強調ラベル",
    caution: "小文字や長文では単調。tracking 調整を後続で検討。",
    sourceUrl: "https://fonts.google.com/specimen/Bebas+Neue"
  }, "bebas-neue", [400]),
  withThumbnailEnglishFontAssets({
    family: "Oswald",
    language: "en",
    category: "Label / readable condensed",
    mood: "読みやすい、配信 UI、凝縮",
    bestFor: "時刻、カテゴリ、ラベル",
    caution: "既存 preset で使用中。英字アクセント向き。",
    sourceUrl: "https://fonts.google.com/specimen/Oswald"
  }, "oswald", [400, 700]),
  withThumbnailEnglishFontAssets({
    family: "Montserrat",
    language: "en",
    category: "Label / readable sans",
    mood: "モダン、安定、読みやすい",
    bestFor: "ラベル、サブ、告知文",
    caution: "display の個性は控えめ。太字 weight を使う。",
    sourceUrl: "https://fonts.google.com/specimen/Montserrat"
  }, "montserrat", [400, 700, 900]),
  withThumbnailEnglishFontAssets({
    family: "Poppins",
    language: "en",
    category: "Readable sans",
    mood: "丸み、現代的、親しみ",
    bestFor: "サブ、告知、柔らかい英字",
    caution: "見出しではやや軽い。bold weight 前提。",
    sourceUrl: "https://fonts.google.com/specimen/Poppins"
  }, "poppins", [400, 700, 900]),
  withThumbnailEnglishFontAssets({
    family: "Rubik",
    language: "en",
    category: "Readable sans",
    mood: "丸い、軽快、読みやすい",
    bestFor: "ラベル、ゲーム UI 風の短文",
    caution: "強い装飾性は低い。色 / shape 側で補う。",
    sourceUrl: "https://fonts.google.com/specimen/Rubik"
  }, "rubik", [400, 700, 900]),
  withThumbnailEnglishFontAssets({
    family: "Fredoka",
    language: "en",
    category: "Cute / comic",
    mood: "かわいい、丸い、ポップ",
    bestFor: "かわいい英字、雑談、歌枠",
    caution: "大人っぽい告知には合いにくい。",
    sourceUrl: "https://fonts.google.com/specimen/Fredoka"
  }, "fredoka", [400, 700]),
  withThumbnailEnglishFontAssets({
    family: "Bangers",
    language: "en",
    category: "Cute / comic",
    mood: "コミック、派手、強い",
    bestFor: "驚き系見出し、切り抜き、勢い",
    caution: "display 専用。長文や日本語混在には不向き。",
    sourceUrl: "https://fonts.google.com/specimen/Bangers"
  }, "bangers", [400]),
  withThumbnailEnglishFontAssets({
    family: "Playfair Display",
    language: "en",
    category: "Elegant / stylish",
    mood: "上品、クラシック、ファッション寄り",
    bestFor: "記念配信、上品な英字アクセント",
    caution: "小サイズや太い縁取りで細部が潰れやすい。",
    sourceUrl: "https://fonts.google.com/specimen/Playfair+Display"
  }, "playfair-display", [400, 700, 900]),
  withThumbnailEnglishFontAssets({
    family: "Pacifico",
    language: "en",
    category: "Handwritten / personal",
    mood: "手書き、華やか、親しみ",
    bestFor: "サイン風、軽いアクセント",
    caution: "display / accent 専用。大文字羅列や長文には向かない。",
    sourceUrl: "https://fonts.google.com/specimen/Pacifico"
  }, "pacifico", [400]),
  withThumbnailEnglishFontAssets({
    family: "Orbitron",
    language: "en",
    category: "Game / futuristic",
    mood: "近未来、テック、ゲーム風",
    bestFor: "近未来、ゲーム、SF ラベル",
    caution: "日本語不可。数字 / 英字短文に限定する。",
    sourceUrl: "https://fonts.google.com/specimen/Orbitron"
  }, "orbitron", [400, 700, 900]),
  withThumbnailEnglishFontAssets({
    family: "Press Start 2P",
    language: "en",
    category: "Game / pixel",
    mood: "ピクセル、ゲーム、強い個性",
    bestFor: "レトロゲーム、ドット風短文",
    caution: "大容量ではないが可読性が低い。大きめ短文だけにする。",
    sourceUrl: "https://fonts.google.com/specimen/Press+Start+2P"
  }, "press-start-2p", [400])
];
const thumbnailFontLanguageLabels: Record<ThumbnailFontLanguage, string> = {
  ja: "日本語",
  en: "English"
};
const createThumbnailFontListboxGroup = (language: ThumbnailFontLanguage): ThumbnailFontListboxGroup => {
  const categories = new Map<string, ThumbnailFontListboxOption[]>();
  for (const font of thumbnailFontManifest.filter((item) => item.language === language)) {
    const options = categories.get(font.category) ?? [];
    options.push({
      family: font.family,
      label: font.family,
      language: font.language,
      category: font.category,
      mood: font.mood
    });
    categories.set(font.category, options);
  }

  return {
    language,
    label: thumbnailFontLanguageLabels[language],
    categories: Array.from(categories, ([label, options]) => ({ label, options }))
  };
};
export const thumbnailFontListboxGroups: ThumbnailFontListboxGroup[] = [createThumbnailFontListboxGroup("ja"), createThumbnailFontListboxGroup("en")];
export const thumbnailFontRecentStorageKey = "v-streamer-tools:thumbnail-editor:recent-fonts:v1";
export const thumbnailFontRecentLimit = 4;
const normalizeThumbnailFontSearchText = (value: string) => value.trim().toLowerCase();
export const filterThumbnailFontListboxGroups = (query: string): ThumbnailFontListboxGroup[] => {
  const normalizedQuery = normalizeThumbnailFontSearchText(query);
  if (!normalizedQuery) {
    return thumbnailFontListboxGroups;
  }

  return thumbnailFontListboxGroups
    .map((group) => {
      const languageMatches = normalizeThumbnailFontSearchText(group.label).includes(normalizedQuery) || group.language.includes(normalizedQuery);
      const categories = group.categories
        .map((category) => {
          const options = category.options.filter((option) => {
            const searchableText = [option.family, group.label, option.language, option.category, option.mood].map(normalizeThumbnailFontSearchText).join(" ");
            return searchableText.includes(normalizedQuery);
          });
          return languageMatches ? category : { ...category, options };
        })
        .filter((category) => category.options.length > 0);
      return { ...group, categories };
    })
    .filter((group) => group.categories.length > 0);
};
export const normalizeThumbnailRecentFontFamilies = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const recentFonts: string[] = [];
  for (const item of value) {
    const rawFontFamily = typeof item === "string" ? item.trim() : "";
    const fontFamily = normalizeThumbnailFontFamily(item);
    if (fontFamily === thumbnailFontFallbackFamily && rawFontFamily !== thumbnailFontFallbackFamily) {
      continue;
    }
    if (!recentFonts.includes(fontFamily)) {
      recentFonts.push(fontFamily);
    }
    if (recentFonts.length >= thumbnailFontRecentLimit) {
      break;
    }
  }
  return recentFonts;
};
export const createNextRecentThumbnailFontFamilies = (current: unknown, selectedFontFamily: unknown): string[] => {
  const rawFontFamily = typeof selectedFontFamily === "string" ? selectedFontFamily.trim() : "";
  const fontFamily = normalizeThumbnailFontFamily(selectedFontFamily);
  if (fontFamily === thumbnailFontFallbackFamily && rawFontFamily !== thumbnailFontFallbackFamily) {
    return normalizeThumbnailRecentFontFamilies(current);
  }
  return normalizeThumbnailRecentFontFamilies([fontFamily, ...normalizeThumbnailRecentFontFamilies(current)]);
};
export const thumbnailFontFallbackFamily = "Noto Sans JP";
export const thumbnailCanvasFontFallbackStack = [thumbnailFontFallbackFamily, "BIZ UDPGothic", "Yu Gothic", "Meiryo", "sans-serif"];
export const thumbnailFontLoadTimeoutMs = 1200;
export const thumbnailFontPolicy: ThumbnailFontPolicy = {
  owner: "thumbnail-editor",
  source: "self-hosted-thumbnail-editor-assets",
  allowsExternalNetworkFonts: false,
  allowsGoogleFonts: false,
  allowsCdnFonts: false,
  allowsBundledFontAssetsInThisPr: true,
  fallbackFamily: thumbnailFontFallbackFamily,
  fallbackStack: thumbnailCanvasFontFallbackStack
};
export const thumbnailPresetBatchReadinessPolicy: ThumbnailPresetBatchReadinessPolicy = {
  owner: "thumbnail-editor",
  checksOnly: true,
  allowsAutoFix: false,
  allowsGeneration: false,
  addsPresetBodies: false,
  addsAssets: false,
  addsFontAssets: false,
  changesMaterialRegistration: false
};

const quoteCanvasFontFamily = (fontFamily: string) => (fontFamily === "sans-serif" ? fontFamily : `"${fontFamily}"`);
const isUnsafeThumbnailFontFamily = (fontFamily: string) =>
  !fontFamily ||
  fontFamily.includes(",") ||
  fontFamily.includes("\"") ||
  fontFamily.includes("'") ||
  /^(?:https?:|data:|blob:|@import\b)/i.test(fontFamily) ||
  /(?:url\(|fonts\.googleapis|fonts\.gstatic|cdn)/i.test(fontFamily);

export const normalizeThumbnailFontFamily = (fontFamily: unknown): string => {
  if (typeof fontFamily !== "string") {
    return thumbnailFontFallbackFamily;
  }

  const normalized = fontFamily.trim();
  if (isUnsafeThumbnailFontFamily(normalized)) {
    return thumbnailFontFallbackFamily;
  }

  const manifestEntry = getThumbnailFontManifestEntry(normalized);
  return thumbnailFonts.includes(normalized) || Boolean(manifestEntry?.assets?.length) ? normalized : thumbnailFontFallbackFamily;
};

export const getThumbnailFontManifestEntry = (fontFamily: unknown): ThumbnailFontManifestEntry | null => {
  if (typeof fontFamily !== "string") {
    return null;
  }

  const normalized = fontFamily.trim();
  if (isUnsafeThumbnailFontFamily(normalized)) {
    return null;
  }

  return thumbnailFontManifest.find((font) => font.family === normalized) ?? null;
};

export const getThumbnailCanvasFontFamily = (fontFamily: unknown): string => {
  const normalized = normalizeThumbnailFontFamily(fontFamily);
  const stack = normalized === thumbnailFontFallbackFamily ? thumbnailCanvasFontFallbackStack : [normalized, ...thumbnailCanvasFontFallbackStack];
  return stack.filter((family, index) => stack.indexOf(family) === index).map(quoteCanvasFontFamily).join(", ");
};

export const getThumbnailCanvasFont = (
  layer: Pick<ThumbnailTextLayer, "fontFamily" | "fontSize" | "bold" | "italic">
): string => {
  const fontSize = typeof layer.fontSize === "number" && Number.isFinite(layer.fontSize) ? Math.round(layer.fontSize) : 64;
  const style = layer.italic ? "italic " : "";
  const weight = layer.bold ? "700" : "400";
  return `${style}${weight} ${fontSize}px ${getThumbnailCanvasFontFamily(layer.fontFamily)}`;
};

export const getThumbnailFontLoadRequests = (draft: Pick<ThumbnailEditorDraft, "layers">): ThumbnailFontLoadRequest[] => {
  const requests = new Map<string, ThumbnailFontLoadRequest>();
  for (const layer of draft.layers) {
    if (layer.type !== "text" || layer.hidden) {
      continue;
    }
    const fontFamily = normalizeThumbnailFontFamily(layer.fontFamily);
    const canvasFont = getThumbnailCanvasFont({ ...layer, fontFamily });
    requests.set(canvasFont, { fontFamily, canvasFont });
  }
  return Array.from(requests.values());
};

const getDefaultThumbnailFontFaceSet = (): ThumbnailFontFaceSetLike | null => {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return null;
  }
  return document.fonts as ThumbnailFontFaceSetLike;
};

const uniqueThumbnailFontFamilies = (requests: ThumbnailFontLoadRequest[]) =>
  requests.map((request) => request.fontFamily).filter((fontFamily, index, values) => values.indexOf(fontFamily) === index);

const waitForThumbnailFontPromise = async <T>(promise: Promise<T>, timeoutMs: number): Promise<{ timedOut: true } | { timedOut: false; value: T }> =>
  new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve({ timedOut: true }), Math.max(0, timeoutMs));
    promise.then((value) => {
      clearTimeout(timeoutId);
      resolve({ timedOut: false, value });
    });
  });

const loadThumbnailFontRequest = (fontFaceSet: ThumbnailFontFaceSetLike, request: ThumbnailFontLoadRequest) => {
  try {
    return Promise.resolve(fontFaceSet.load?.(request.canvasFont));
  } catch (error) {
    return Promise.reject(error);
  }
};

export const waitForThumbnailFontLoadRequests = async (
  requests: ThumbnailFontLoadRequest[],
  options: { fontFaceSet?: ThumbnailFontFaceSetLike | null; timeoutMs?: number } = {}
): Promise<ThumbnailFontLoadResult> => {
  const fontFaceSet = "fontFaceSet" in options ? options.fontFaceSet : getDefaultThumbnailFontFaceSet();
  const attemptedFonts = uniqueThumbnailFontFamilies(requests);
  const emptyResult: ThumbnailFontLoadResult = {
    status: "loaded",
    attemptedFonts,
    loadedFonts: [],
    failedFonts: [],
    timedOut: false,
    usedFallback: false
  };

  if (requests.length === 0) {
    return emptyResult;
  }
  if (!fontFaceSet || typeof fontFaceSet.load !== "function") {
    return { ...emptyResult, status: "unsupported", usedFallback: true };
  }

  const timeoutMs = options.timeoutMs ?? thumbnailFontLoadTimeoutMs;
  const loadPromise = Promise.allSettled(requests.map((request) => loadThumbnailFontRequest(fontFaceSet, request))).then(
    async (results) => {
      if (fontFaceSet.ready && typeof (fontFaceSet.ready as Promise<unknown>).then === "function") {
        try {
          await fontFaceSet.ready;
        } catch (reason) {
          return requests.map(() => ({ status: "rejected" as const, reason }));
        }
      }
      return results;
    }
  );
  const loaded = await waitForThumbnailFontPromise(loadPromise, timeoutMs);

  if (loaded.timedOut) {
    return { ...emptyResult, status: "timeout", timedOut: true, usedFallback: true };
  }

  const failedFonts = requests
    .filter((_, index) => loaded.value[index]?.status === "rejected")
    .map((request) => request.fontFamily)
    .filter((fontFamily, index, values) => values.indexOf(fontFamily) === index);

  if (failedFonts.length > 0) {
    return {
      ...emptyResult,
      status: "failed",
      loadedFonts: attemptedFonts.filter((fontFamily) => !failedFonts.includes(fontFamily)),
      failedFonts,
      usedFallback: true
    };
  }

  return { ...emptyResult, loadedFonts: attemptedFonts };
};

export const waitForThumbnailDraftFonts = (
  draft: Pick<ThumbnailEditorDraft, "layers">,
  options: { fontFaceSet?: ThumbnailFontFaceSetLike | null; timeoutMs?: number } = {}
): Promise<ThumbnailFontLoadResult> => waitForThumbnailFontLoadRequests(getThumbnailFontLoadRequests(draft), options);

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const svgDataUrl = (title: string, from: string, to: string, accent: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}" offset="0"/><stop stop-color="${to}" offset="1"/></linearGradient><radialGradient id="glow" cx="72%" cy="40%" r="45%"><stop stop-color="${accent}" stop-opacity=".72" offset="0"/><stop stop-color="${accent}" stop-opacity="0" offset="1"/></radialGradient><pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0v64" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/></pattern></defs><rect width="1280" height="720" fill="url(#bg)"/><rect width="1280" height="720" fill="url(#grid)"/><circle cx="930" cy="260" r="330" fill="url(#glow)"/><path d="M60 584C250 470 375 612 565 486C756 360 890 414 1220 168" fill="none" stroke="${accent}" stroke-opacity=".5" stroke-width="18"/><text x="72" y="660" fill="rgba(255,255,255,.28)" font-family="Arial, sans-serif" font-size="32" font-weight="700">${title}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const backgroundLayer = (name: string, title: string, from: string, to: string, accent: string): ThumbnailImageLayer => ({
  id: createId("image"),
  name,
  type: "image",
  x: 0,
  y: 0,
  width: 1280,
  height: 720,
  rotation: 0,
  opacity: 1,
  blur: 0,
  src: svgDataUrl(title, from, to, accent)
});

const thumbnailPresetAssetPrefix = "/assets/images/thumbnail-editor/";
const thumbnailPhase1BackgroundAssetPrefix = `${thumbnailPresetAssetPrefix}phase1/`;
const thumbnailPhase2BackgroundAssetPrefix = `${thumbnailPresetAssetPrefix}phase2/`;
const thumbnailPhase3BackgroundAssetPrefix = `${thumbnailPresetAssetPrefix}phase3/`;
const thumbnailPhase4DecorationAssetPrefix = `${thumbnailPresetAssetPrefix}decorations/phase4/`;
const thumbnailPhase5BackgroundAssetPrefix = `${thumbnailPresetAssetPrefix}phase5/`;
const thumbnailPhase5DecorationAssetPrefix = `${thumbnailPresetAssetPrefix}decorations/phase5/`;
const thumbnailMaterialBatch1AssetPrefix = `${thumbnailPresetAssetPrefix}materials/batch1/`;
const thumbnailMaterialLabelAssetPrefix = `${thumbnailPresetAssetPrefix}materials/labels/`;
const thumbnailMaterialBadgeAssetPrefix = `${thumbnailPresetAssetPrefix}materials/badges/`;
const thumbnailMaterialFrameAssetPrefix = `${thumbnailPresetAssetPrefix}materials/frames/`;
const thumbnailMaterialDividerAssetPrefix = `${thumbnailPresetAssetPrefix}materials/dividers/`;
const thumbnailMaterialEffectAssetPrefix = `${thumbnailPresetAssetPrefix}materials/effects/`;
const thumbnailMaterialCornerAssetPrefix = `${thumbnailPresetAssetPrefix}materials/corners/`;
const thumbnailMaterialImpactAssetPrefix = `${thumbnailPresetAssetPrefix}materials/impact/`;

const assetBackgroundLayer = (name: string, src: string): ThumbnailImageLayer => ({
  id: createId("image"),
  name,
  type: "image",
  x: 0,
  y: 0,
  width: 1280,
  height: 720,
  rotation: 0,
  opacity: 1,
  blur: 0,
  locked: true,
  src
});

const assetDecorationLayer = (partial: Partial<ThumbnailImageLayer> & Pick<ThumbnailImageLayer, "name" | "src" | "x" | "y" | "width" | "height">): ThumbnailImageLayer => ({
  id: createId("image"),
  type: "image",
  rotation: 0,
  opacity: 1,
  blur: 0,
  ...partial
});

const textLayer = (partial: Partial<ThumbnailTextLayer> & Pick<ThumbnailTextLayer, "name" | "text" | "x" | "y" | "width" | "height">): ThumbnailTextLayer => ({
  id: createId("text"),
  type: "text",
  rotation: 0,
  opacity: 1,
  blur: 0,
  fontFamily: "Noto Sans JP",
  fontSize: 96,
  lineHeight: 1.08,
  color: "#ffffff",
  align: "left",
  bold: true,
  italic: false,
  strokeColor: "#07111c",
  strokeWidth: 10,
  shadowColor: "#000000",
  shadowBlur: 14,
  shadowOffsetX: 7,
  shadowOffsetY: 8,
  ...partial
});

const weeklyScheduleRows = [
  { day: "月曜", label: "MON", time: "20:00", detail: "雑談", y: 75 },
  { day: "火曜", label: "TUE", time: "20:00", detail: "雑談", y: 159 },
  { day: "水曜", label: "WED", time: "-", detail: "休み", y: 238 },
  { day: "木曜", label: "THU", time: "20:00", detail: "ゲーム", y: 315 },
  { day: "金曜", label: "FRI", time: "22:00", detail: "コラボ", y: 393 },
  { day: "土曜", label: "SAT", time: "19:00", detail: "企画", y: 474 },
  { day: "日曜", label: "SUN", time: "21:00", detail: "振り返り", y: 555 }
] as const;

const weeklyScheduleTextBase = {
  height: 52,
  fontFamily: "BIZ UDPGothic",
  fontSize: 34,
  lineHeight: 1.62,
  strokeColor: "#03122f",
  strokeWidth: 3,
  shadowColor: "#02101f",
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 3
} as const;

const weeklyScheduleRowLayers = () =>
  weeklyScheduleRows.flatMap((row) => [
    textLayer({
      ...weeklyScheduleTextBase,
      name: `${row.day} / 曜日`,
      text: row.label,
      x: 540,
      y: row.y,
      width: 126,
      fontFamily: "Oswald",
      color: "#9dfaff",
      align: "center"
    }),
    textLayer({
      ...weeklyScheduleTextBase,
      name: `${row.day} / 時間`,
      text: row.time,
      x: 690,
      y: row.y,
      width: 142,
      fontFamily: "Oswald",
      color: "#f7feff",
      align: "center"
    }),
    textLayer({
      ...weeklyScheduleTextBase,
      name: `${row.day} / 予定`,
      text: row.detail,
      x: 860,
      y: row.y,
      width: 330,
      color: "#fffaf2",
      align: "left"
    })
  ]);

const shapeLayer = (partial: Partial<ThumbnailShapeLayer> & Pick<ThumbnailShapeLayer, "name" | "shapeType" | "x" | "y" | "width" | "height">): ThumbnailShapeLayer => ({
  id: createId("shape"),
  type: "shape",
  rotation: 0,
  opacity: 1,
  blur: 0,
  fillColor: "#1ed7c6",
  strokeColor: "#ffffff",
  strokeWidth: 4,
  borderRadius: 20,
  ...partial
});

export const thumbnailPresets: ThumbnailPreset[] = [
  {
    id: "stream_announce",
    name: "配信告知",
    category: "告知画像",
    usageLabel: "通常告知",
    description: "開始時刻と見出しを大きく見せる告知向け。",
    accent: "#1ed7c6",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}stream-announce-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（右立ち絵枠の発光）", src: `${thumbnailPhase5DecorationAssetPrefix}stream-standee-frame-glow-uniform-cell.png`, x: 688, y: -34, width: 650, height: 720, opacity: 0.46 }),
      assetDecorationLayer({ name: "画像 3（小粒スパーク）", src: `${thumbnailPhase5DecorationAssetPrefix}stream-spark-cluster-cyan-uniform-cell.png`, x: 8, y: 132, width: 360, height: 240, opacity: 0.74 }),
      assetDecorationLayer({ name: "画像 4（見出し左下アクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}stream-triangle-accent-magenta-uniform-cell.png`, x: -18, y: 348, width: 292, height: 195, rotation: -9, opacity: 0.9 }),
      assetDecorationLayer({ name: "画像 5（見出し右アクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}stream-triangle-accent-magenta-uniform-cell.png`, x: 606, y: 300, width: 224, height: 149, rotation: 13, opacity: 0.6 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 844, y: 72, width: 342, height: 560, fillColor: "#03172422", strokeColor: "#73f7ff", strokeWidth: 2, borderRadius: 46, opacity: 0.36 }),
      shapeLayer({ name: "図形 4（ラベル横ライン）", shapeType: "line", x: 492, y: 112, width: 264, height: 16, fillColor: "#79fbff", strokeColor: "#79fbff", strokeWidth: 4, borderRadius: 8, opacity: 0.64 }),
      assetDecorationLayer({ name: "画像 6（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}stream-label-plaque-cyan-uniform-cell.png`, x: 42, y: 28, width: 516, height: 144, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "配信 / YouTube", x: 122, y: 82, width: 340, height: 42, fontSize: 35, color: "#031321", strokeWidth: 0, shadowColor: "#ffffff", shadowBlur: 2, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Zen Kaku Gothic New", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "初見さん\n大歓迎!", x: 66, y: 164, width: 708, height: 272, fontSize: 116, lineHeight: 0.98, color: "#ffffff", strokeColor: "#06112f", strokeWidth: 13, shadowColor: "#00cfff", shadowBlur: 20, shadowOffsetX: 6, shadowOffsetY: 8, fontFamily: "RocknRoll One" }),
      shapeLayer({ name: "図形 6（見出し下ライン）", shapeType: "line", x: 94, y: 448, width: 600, height: 16, fillColor: "#72f9ff", strokeColor: "#72f9ff", strokeWidth: 4, borderRadius: 8, opacity: 0.54 }),
      assetDecorationLayer({ name: "画像 7（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}stream-time-badge-magenta-cyan-uniform-cell.png`, x: 46, y: 454, width: 706, height: 166, rotation: -2, opacity: 0.98 }),
      shapeLayer({ name: "図形 5（時刻下ライン）", shapeType: "line", x: 116, y: 606, width: 520, height: 18, fillColor: "#5ef7ff", strokeColor: "#5ef7ff", strokeWidth: 4, borderRadius: 8, opacity: 0.58 }),
      textLayer({ name: "テキスト 2（時刻）", text: "21:00 START", x: 136, y: 508, width: 520, height: 64, fontSize: 60, color: "#ffffff", strokeColor: "#5b0637", strokeWidth: 4, shadowColor: "#06111c", shadowBlur: 10, shadowOffsetX: 4, shadowOffsetY: 5, fontFamily: "Bebas Neue" }),
      textLayer({ name: "テキスト 3（サブ）", text: "一緒に楽しくお話ししよう!", x: 132, y: 632, width: 588, height: 46, fontSize: 34, lineHeight: 1.1, strokeWidth: 5, fontFamily: "Zen Kaku Gothic New" })
    ]
  },
  {
    id: "first_stream",
    name: "初配信",
    category: "配信ジャンル",
    usageLabel: "初回 / 自己紹介",
    description: "初回配信や自己紹介に使いやすい明るい歓迎向け。",
    accent: "#7bdcff",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}first-stream-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（右立ち絵枠の発光）", src: `${thumbnailPhase5DecorationAssetPrefix}first-stream-standee-frame-glow-uniform-cell.png`, x: 682, y: 36, width: 620, height: 620, opacity: 0.82 }),
      assetDecorationLayer({ name: "画像 3（左上リボン）", src: `${thumbnailPhase5DecorationAssetPrefix}first-stream-ribbon-accent-cyan-pink-uniform-cell.png`, x: -120, y: 36, width: 410, height: 274, rotation: -16, opacity: 0.56 }),
      assetDecorationLayer({ name: "画像 4（右下リボン）", src: `${thumbnailPhase5DecorationAssetPrefix}first-stream-ribbon-accent-cyan-pink-uniform-cell.png`, x: 896, y: 452, width: 430, height: 287, rotation: 12, opacity: 0.48 }),
      assetDecorationLayer({ name: "画像 5（小粒きらめき）", src: `${thumbnailPhase5DecorationAssetPrefix}first-stream-sparkle-cluster-cyan-pink-uniform-cell.png`, x: 286, y: 114, width: 350, height: 233, opacity: 0.72 }),
      assetDecorationLayer({ name: "画像 6（右側きらめき）", src: `${thumbnailPhase5DecorationAssetPrefix}first-stream-sparkle-cluster-cyan-pink-uniform-cell.png`, x: 588, y: 286, width: 280, height: 187, rotation: 8, opacity: 0.54 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 836, y: 86, width: 322, height: 548, fillColor: "#ffffff18", strokeColor: "#8ee9ff", strokeWidth: 2, borderRadius: 92, opacity: 0.34 }),
      shapeLayer({ name: "図形 4（ラベル横ライン）", shapeType: "line", x: 448, y: 126, width: 238, height: 12, fillColor: "#f3c9d9", strokeColor: "#f3c9d9", strokeWidth: 3, borderRadius: 8, opacity: 0.6 }),
      assetDecorationLayer({ name: "画像 7（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}first-stream-label-plaque-ivory-uniform-cell.png`, x: 64, y: 48, width: 492, height: 144, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "DEBUT STREAM", x: 146, y: 100, width: 324, height: 42, fontSize: 34, color: "#17496a", strokeWidth: 0, shadowColor: "#ffffff", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Poppins", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "初配信", x: 72, y: 198, width: 686, height: 166, fontSize: 158, lineHeight: 0.96, color: "#fff8f4", strokeColor: "#28638f", strokeWidth: 11, shadowColor: "#f49abd", shadowBlur: 15, shadowOffsetX: 4, shadowOffsetY: 6, fontFamily: "RocknRoll One" }),
      shapeLayer({ name: "図形 6（見出し下ライン）", shapeType: "line", x: 92, y: 404, width: 568, height: 14, fillColor: "#88e4ff", strokeColor: "#88e4ff", strokeWidth: 4, borderRadius: 8, opacity: 0.54 }),
      assetDecorationLayer({ name: "画像 8（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}first-stream-time-badge-cyan-pink-uniform-cell.png`, x: 54, y: 454, width: 660, height: 154, opacity: 0.98 }),
      shapeLayer({ name: "図形 5（時刻下ライン）", shapeType: "line", x: 154, y: 610, width: 418, height: 12, fillColor: "#f4b7ca", strokeColor: "#f4b7ca", strokeWidth: 3, borderRadius: 8, opacity: 0.46 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 START", x: 152, y: 506, width: 470, height: 62, fontSize: 60, color: "#164865", strokeColor: "#fffaf2", strokeWidth: 2, shadowColor: "#9feaff", shadowBlur: 8, shadowOffsetX: 0, shadowOffsetY: 2, fontFamily: "Bebas Neue", align: "center" }),
      textLayer({ name: "テキスト 3（サブ）", text: "はじめまして、よろしくね", x: 116, y: 632, width: 560, height: 44, fontSize: 32, align: "center", color: "#17496a", strokeColor: "#fffaf2", strokeWidth: 3, shadowColor: "#f2abc0", shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 2, fontFamily: "Zen Kaku Gothic New" })
    ]
  },
  {
    id: "anniversary_stream",
    name: "記念配信",
    category: "告知画像",
    usageLabel: "記念 / milestone",
    description: "周年や登録者記念を上品に見せる premium milestone 向け。",
    accent: "#d8b56a",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}anniversary-stream-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（左上金飾り）", src: `${thumbnailPhase5DecorationAssetPrefix}anniversary-stream-corner-ornament-gold-uniform-cell.png`, x: -28, y: -2, width: 274, height: 183, opacity: 0.88 }),
      assetDecorationLayer({ name: "画像 3（右下金飾り）", src: `${thumbnailPhase5DecorationAssetPrefix}anniversary-stream-corner-ornament-gold-uniform-cell.png`, x: 1026, y: 542, width: 274, height: 183, rotation: 180, opacity: 0.66 }),
      assetDecorationLayer({ name: "画像 4（記念バッジ）", src: `${thumbnailPhase5DecorationAssetPrefix}anniversary-stream-milestone-badge-gold-uniform-cell.png`, x: 670, y: 72, width: 190, height: 190, opacity: 0.94 }),
      assetDecorationLayer({ name: "画像 5（金ローズきらめき）", src: `${thumbnailPhase5DecorationAssetPrefix}anniversary-stream-glint-cluster-gold-rose-uniform-cell.png`, x: 282, y: 122, width: 370, height: 247, opacity: 0.72 }),
      assetDecorationLayer({ name: "画像 6（右側きらめき）", src: `${thumbnailPhase5DecorationAssetPrefix}anniversary-stream-glint-cluster-gold-rose-uniform-cell.png`, x: 724, y: 304, width: 300, height: 200, rotation: 5, opacity: 0.46 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 830, y: 76, width: 350, height: 564, fillColor: "#f4d7e61c", strokeColor: "#f6d991", strokeWidth: 2, borderRadius: 106, opacity: 0.32 }),
      shapeLayer({ name: "図形 4（ラベル横ライン）", shapeType: "line", x: 164, y: 156, width: 436, height: 12, fillColor: "#d8b56a", strokeColor: "#d8b56a", strokeWidth: 3, borderRadius: 8, opacity: 0.52 }),
      textLayer({ name: "テキスト 1（見出し）", text: "1周年記念", x: 76, y: 190, width: 704, height: 148, fontSize: 126, lineHeight: 0.96, color: "#fff5dc", strokeColor: "#17152d", strokeWidth: 10, shadowColor: "#d99a58", shadowBlur: 17, shadowOffsetX: 4, shadowOffsetY: 6, fontFamily: "Noto Serif JP", bold: true }),
      shapeLayer({ name: "図形 6（見出し下ライン）", shapeType: "line", x: 108, y: 356, width: 548, height: 14, fillColor: "#dfbf72", strokeColor: "#dfbf72", strokeWidth: 4, borderRadius: 8, opacity: 0.58 }),
      assetDecorationLayer({ name: "画像 7（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}anniversary-stream-label-plaque-navy-gold-uniform-cell.png`, x: 162, y: 374, width: 520, height: 122, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "ANNIVERSARY LIVE", x: 254, y: 416, width: 338, height: 40, fontSize: 35, color: "#ffe5a6", strokeColor: "#090a18", strokeWidth: 2, shadowColor: "#d99a58", shadowBlur: 7, shadowOffsetX: 1, shadowOffsetY: 2, fontFamily: "Playfair Display", align: "center" }),
      textLayer({ name: "テキスト 3（サブ）", text: "ありがとうを伝える特別な夜", x: 98, y: 500, width: 652, height: 52, fontSize: 38, align: "center", color: "#fff8ee", strokeColor: "#19122c", strokeWidth: 4, shadowColor: "#e7a0a8", shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Noto Serif JP" }),
      assetDecorationLayer({ name: "画像 8（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}anniversary-stream-time-badge-navy-gold-uniform-cell.png`, x: 66, y: 544, width: 640, height: 148, opacity: 0.98 }),
      shapeLayer({ name: "図形 5（時刻下ライン）", shapeType: "line", x: 226, y: 650, width: 322, height: 12, fillColor: "#d8b56a", strokeColor: "#d8b56a", strokeWidth: 3, borderRadius: 8, opacity: 0.46 }),
      textLayer({ name: "テキスト 2（時刻）", text: "21:00 START", x: 222, y: 590, width: 344, height: 54, fontSize: 52, color: "#fff0be", strokeColor: "#090a18", strokeWidth: 3, shadowColor: "#d99a58", shadowBlur: 8, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Montserrat", align: "center" })
    ]
  },
  {
    id: "endurance_stream",
    name: "耐久配信",
    category: "配信ジャンル",
    usageLabel: "耐久 / 目標",
    description: "長時間企画や達成目標を強く見せる challenge / progress 向け。",
    accent: "#c9ff00",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}endurance-stream-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（右上フレーム角）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-frame-corner-right-lime-cyan-uniform-cell.png`, x: 720, y: -54, width: 560, height: 373, opacity: 0.92 }),
      assetDecorationLayer({ name: "画像 3（右下フレーム角）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-frame-corner-left-lime-cyan-uniform-cell.png`, x: 774, y: 396, width: 560, height: 373, rotation: 180, opacity: 0.88 }),
      assetDecorationLayer({ name: "画像 4（左上フレーム角）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-frame-corner-left-lime-cyan-uniform-cell.png`, x: -144, y: -76, width: 520, height: 347, opacity: 0.46 }),
      assetDecorationLayer({ name: "画像 5（左下フレーム角）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-frame-corner-right-lime-cyan-uniform-cell.png`, x: -116, y: 424, width: 520, height: 347, rotation: 180, opacity: 0.42 }),
      assetDecorationLayer({ name: "画像 6（稲妻アクセント大）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-lightning-bolt-lime-uniform-cell.png`, x: 586, y: 88, width: 430, height: 287, rotation: -8, opacity: 0.74 }),
      assetDecorationLayer({ name: "画像 7（稲妻アクセント小）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-lightning-bolt-cyan-uniform-cell.png`, x: 700, y: 286, width: 330, height: 220, rotation: 8, opacity: 0.54 }),
      assetDecorationLayer({ name: "画像 8（右側シェブロン）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-chevron-cluster-lime-cyan-uniform-cell.png`, x: 576, y: 84, width: 440, height: 293, opacity: 0.62 }),
      assetDecorationLayer({ name: "画像 9（右側レールアクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-rail-accent-lime-cyan-uniform-cell.png`, x: 614, y: 304, width: 500, height: 333, opacity: 0.56 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 844, y: 86, width: 332, height: 548, fillColor: "#10182033", strokeColor: "#c9ff00", strokeWidth: 2, borderRadius: 28, opacity: 0.34 }),
      assetDecorationLayer({ name: "画像 10（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-challenge-label-plaque-lime-uniform-cell.png`, x: 306, y: 36, width: 454, height: 303, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "CHALLENGE", x: 418, y: 124, width: 244, height: 48, fontSize: 42, color: "#10180f", strokeWidth: 0, shadowColor: "#d8ff00", shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Anton", italic: true, align: "center" }),
      shapeLayer({ name: "図形 4（ラベル横ライン）", shapeType: "line", x: 646, y: 132, width: 150, height: 12, fillColor: "#33f5ff", strokeColor: "#33f5ff", strokeWidth: 3, borderRadius: 8, opacity: 0.66 }),
      textLayer({ name: "テキスト 1（見出し）", text: "耐久配信", x: 64, y: 182, width: 724, height: 172, fontSize: 142, lineHeight: 0.96, color: "#f8fbf6", strokeColor: "#050704", strokeWidth: 15, shadowColor: "#c9ff00", shadowBlur: 18, shadowOffsetX: 6, shadowOffsetY: 8, fontFamily: "M PLUS 1p" }),
      shapeLayer({ name: "図形 6（見出し下ライン）", shapeType: "line", x: 82, y: 370, width: 630, height: 16, fillColor: "#c9ff00", strokeColor: "#c9ff00", strokeWidth: 5, borderRadius: 10, opacity: 0.68 }),
      assetDecorationLayer({ name: "画像 11（目標バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-goal-badge-panel-lime-orange-uniform-cell.png`, x: 62, y: 382, width: 682, height: 218, opacity: 0.98 }),
      textLayer({ name: "テキスト 5（目標）", text: "目標 100回", x: 136, y: 444, width: 462, height: 76, fontSize: 64, color: "#ff9a1f", strokeColor: "#07100f", strokeWidth: 7, shadowColor: "#c9ff00", shadowBlur: 10, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Orbitron", align: "center" }),
      textLayer({ name: "テキスト 3（サブ）", text: "達成するまで終われない", x: 94, y: 572, width: 616, height: 52, fontSize: 39, align: "center", color: "#f8fbf6", strokeColor: "#07100f", strokeWidth: 5, shadowColor: "#31f8ff", shadowBlur: 8, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "BIZ UDPGothic" }),
      assetDecorationLayer({ name: "画像 12（進捗ディバイダー）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-progress-divider-lime-cyan-orange-uniform-cell.png`, x: 30, y: 612, width: 760, height: 126, opacity: 0.96 }),
      assetDecorationLayer({ name: "画像 13（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}endurance-stream-time-badge-orange-uniform-cell.png`, x: 940, y: 476, width: 276, height: 184, opacity: 0.98 }),
      shapeLayer({ name: "図形 5（時刻下ライン）", shapeType: "line", x: 984, y: 618, width: 190, height: 10, fillColor: "#ff7b1d", strokeColor: "#ff7b1d", strokeWidth: 3, borderRadius: 8, opacity: 0.54 }),
      textLayer({ name: "テキスト 2（時刻）", text: "19:00 START", x: 980, y: 548, width: 202, height: 48, fontSize: 39, color: "#ff8a1f", strokeColor: "#060a0a", strokeWidth: 4, shadowColor: "#33f5ff", shadowBlur: 8, shadowOffsetX: 1, shadowOffsetY: 2, fontFamily: "Orbitron", align: "center" })
    ]
  },
  {
    id: "project_stream",
    name: "企画配信",
    category: "配信ジャンル",
    usageLabel: "企画 / 視聴者参加",
    description: "特別企画や視聴者参加型の内容を明るく整理して見せる variety show 向け。",
    accent: "#13b8b3",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}project-stream-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（右上矢印アクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}project-stream-arrow-accent-teal-coral-uniform-cell.png`, x: 936, y: 54, width: 340, height: 227, rotation: -4, opacity: 0.88 }),
      assetDecorationLayer({ name: "画像 3（見出し左矢印アクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}project-stream-arrow-accent-teal-coral-uniform-cell.png`, x: 18, y: 352, width: 232, height: 155, rotation: 180, opacity: 0.72 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 852, y: 74, width: 338, height: 560, fillColor: "#fff7e81f", strokeColor: "#8d8d8d", strokeWidth: 2, borderRadius: 98, opacity: 0.42 }),
      assetDecorationLayer({ name: "画像 4（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}project-stream-label-plaque-coral-teal-uniform-cell.png`, x: 42, y: 34, width: 540, height: 180, rotation: -5, opacity: 0.98 }),
      textLayer({ name: "テキスト 5（英字）", text: "SPECIAL PROGRAM", x: 104, y: 88, width: 404, height: 48, fontSize: 41, color: "#151c24", strokeColor: "#fffaf0", strokeWidth: 2, shadowColor: "#13b8b3", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Montserrat", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "新企画", x: 70, y: 174, width: 650, height: 198, fontSize: 166, lineHeight: 0.94, color: "#fffaf0", strokeColor: "#261915", strokeWidth: 15, shadowColor: "#ff6b57", shadowBlur: 17, shadowOffsetX: 6, shadowOffsetY: 8, fontFamily: "RocknRoll One" }),
      shapeLayer({ name: "図形 6（見出し下ライン）", shapeType: "line", x: 96, y: 396, width: 560, height: 16, fillColor: "#13b8b3", strokeColor: "#13b8b3", strokeWidth: 5, borderRadius: 10, opacity: 0.7 }),
      assetDecorationLayer({ name: "画像 5（サブ用キューカード）", src: `${thumbnailPhase5DecorationAssetPrefix}project-stream-cue-card-panel-teal-uniform-cell.png`, x: 104, y: 408, width: 610, height: 406, rotation: -3, opacity: 0.98 }),
      shapeLayer({ name: "図形 7（カード区切りライン）", shapeType: "line", x: 188, y: 548, width: 410, height: 12, fillColor: "#f5bd3d", strokeColor: "#f5bd3d", strokeWidth: 3, borderRadius: 8, opacity: 0.7 }),
      textLayer({ name: "テキスト 3（サブ）", text: "今日は何が起きる?", x: 160, y: 472, width: 486, height: 68, fontSize: 48, align: "center", color: "#151c24", strokeColor: "#fffaf0", strokeWidth: 4, shadowColor: "#13b8b3", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 2, fontFamily: "M PLUS 1p" }),
      assetDecorationLayer({ name: "画像 6（参加ラベル用カード）", src: `${thumbnailPhase5DecorationAssetPrefix}project-stream-cue-card-panel-yellow-uniform-cell.png`, x: 28, y: 556, width: 324, height: 216, rotation: 1, opacity: 0.98 }),
      assetDecorationLayer({ name: "画像 7（時刻カード土台）", src: `${thumbnailPhase5DecorationAssetPrefix}project-stream-time-badge-coral-uniform-cell.png`, x: 502, y: 548, width: 326, height: 217, rotation: -1, opacity: 0.98 }),
      assetDecorationLayer({ name: "画像 8（左カードタブ）", src: `${thumbnailPhase5DecorationAssetPrefix}project-stream-sticker-tab-teal-yellow-uniform-cell.png`, x: 92, y: 524, width: 132, height: 88, opacity: 0.96 }),
      assetDecorationLayer({ name: "画像 9（中央カードタブ）", src: `${thumbnailPhase5DecorationAssetPrefix}project-stream-sticker-tab-coral-uniform-cell.png`, x: 404, y: 402, width: 118, height: 79, rotation: 2, opacity: 0.94 }),
      assetDecorationLayer({ name: "画像 10（時刻カードタブ）", src: `${thumbnailPhase5DecorationAssetPrefix}project-stream-sticker-tab-coral-uniform-cell.png`, x: 594, y: 520, width: 128, height: 85, rotation: -2, opacity: 0.94 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "視聴者参加型", x: 82, y: 628, width: 236, height: 42, fontSize: 33, color: "#151c24", strokeColor: "#fffaf0", strokeWidth: 3, shadowColor: "#f5bd3d", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Fredoka", align: "center" }),
      shapeLayer({ name: "図形 5（時刻下ライン）", shapeType: "line", x: 574, y: 670, width: 170, height: 10, fillColor: "#ff6b57", strokeColor: "#ff6b57", strokeWidth: 3, borderRadius: 8, opacity: 0.58 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:30 START", x: 562, y: 610, width: 220, height: 52, fontSize: 43, color: "#151c24", strokeColor: "#fffaf0", strokeWidth: 3, shadowColor: "#ff6b57", shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 2, fontFamily: "Montserrat", align: "center" })
    ]
  },
  {
    id: "karaoke",
    name: "歌枠",
    category: "配信ジャンル",
    usageLabel: "音楽配信",
    description: "音楽配信に合う強いコントラスト。",
    accent: "#ff4cc2",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}karaoke-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（ピンク三角アクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}karaoke-triangle-burst-rose-uniform-cell.png`, x: -16, y: 70, width: 390, height: 260, opacity: 0.62 }),
      assetDecorationLayer({ name: "画像 3（小粒きらめき）", src: `${thumbnailPhase5DecorationAssetPrefix}karaoke-sparkle-cluster-rose-cyan-uniform-cell.png`, x: 332, y: 106, width: 380, height: 253, opacity: 0.52 }),
      assetDecorationLayer({ name: "画像 4（ピンク音符）", src: `${thumbnailPhase5DecorationAssetPrefix}karaoke-music-note-rose-uniform-cell.png`, x: -8, y: 348, width: 260, height: 173, rotation: -7, opacity: 0.78 }),
      assetDecorationLayer({ name: "画像 5（金色音符）", src: `${thumbnailPhase5DecorationAssetPrefix}karaoke-music-note-gold-uniform-cell.png`, x: 1014, y: 414, width: 238, height: 159, rotation: 8, opacity: 0.72 }),
      assetDecorationLayer({ name: "画像 6（右立ち絵枠の発光）", src: `${thumbnailPhase5DecorationAssetPrefix}karaoke-standee-frame-glow-uniform-cell.png`, x: 622, y: -58, width: 830, height: 842, opacity: 0.96 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 800, y: 70, width: 390, height: 590, fillColor: "#1608261f", strokeColor: "#fff0fb", strokeWidth: 2, borderRadius: 48, opacity: 0.34 }),
      shapeLayer({ name: "図形 2（ラベル横ライン）", shapeType: "line", x: 432, y: 112, width: 174, height: 14, fillColor: "#ffd484", strokeColor: "#ffd484", strokeWidth: 4, borderRadius: 8, opacity: 0.62 }),
      assetDecorationLayer({ name: "画像 7（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}karaoke-label-plaque-rose-uniform-cell.png`, x: 72, y: 32, width: 460, height: 154, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "歌枠 / YouTube", x: 156, y: 80, width: 300, height: 44, fontSize: 35, color: "#26051f", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "M PLUS Rounded 1c" }),
      textLayer({ name: "テキスト 1（見出し）", text: "歌枠", x: 72, y: 146, width: 640, height: 230, fontSize: 184, lineHeight: 0.94, color: "#fff4fb", strokeColor: "#2b061f", strokeWidth: 16, shadowColor: "#ff4cc2", shadowBlur: 24, shadowOffsetX: 6, shadowOffsetY: 8, fontFamily: "M PLUS Rounded 1c" }),
      textLayer({ name: "テキスト 5（見出し英字）", text: "SINGING STREAM", x: 104, y: 398, width: 610, height: 70, fontSize: 54, align: "center", color: "#fff4fb", strokeColor: "#3b082d", strokeWidth: 5, shadowColor: "#ff4cc2", shadowBlur: 14, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Fredoka" }),
      shapeLayer({ name: "図形 4（見出し下ライン）", shapeType: "line", x: 118, y: 472, width: 578, height: 16, fillColor: "#ffd484", strokeColor: "#ffd484", strokeWidth: 5, borderRadius: 10, opacity: 0.78 }),
      assetDecorationLayer({ name: "画像 8（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}karaoke-time-badge-gold-uniform-cell.png`, x: 74, y: 488, width: 640, height: 166, opacity: 0.98 }),
      shapeLayer({ name: "図形 5（時刻下ライン）", shapeType: "line", x: 158, y: 612, width: 470, height: 14, fillColor: "#ff7bd2", strokeColor: "#ff7bd2", strokeWidth: 4, borderRadius: 8, opacity: 0.38 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 START", x: 166, y: 526, width: 500, height: 78, fontSize: 70, color: "#ffe8b7", strokeColor: "#39071e", strokeWidth: 5, shadowColor: "#ff4cc2", shadowBlur: 12, shadowOffsetX: 3, shadowOffsetY: 4, fontFamily: "Bebas Neue" }),
      textLayer({ name: "テキスト 3（サブ）", text: "リクエスト歓迎 / 初見さん歓迎", x: 132, y: 636, width: 610, height: 52, fontSize: 38, align: "center", color: "#fff9f4", strokeColor: "#1b0820", strokeWidth: 5, shadowColor: "#ff4cc2", shadowBlur: 9, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "M PLUS Rounded 1c" })
    ]
  },
  {
    id: "chatting",
    name: "雑談",
    category: "配信ジャンル",
    usageLabel: "トーク",
    description: "トーク配信・近況報告に使いやすい余白設計。",
    accent: "#36aaff",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}chatting-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（やわらかい光粒）", src: `${thumbnailPhase5DecorationAssetPrefix}chatting-soft-glow-dots-uniform-cell.png`, x: 48, y: 76, width: 520, height: 347, opacity: 0.28 }),
      shapeLayer({ name: "図形 4（やわらかい下線）", shapeType: "line", x: 92, y: 610, width: 474, height: 14, fillColor: "#efb36f", strokeColor: "#efb36f", strokeWidth: 3, borderRadius: 10, opacity: 0.58 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 762, y: 92, width: 358, height: 528, fillColor: "#fff3df0c", strokeColor: "#fff0db", strokeWidth: 2, borderRadius: 120, opacity: 0.28 }),
      assetDecorationLayer({ name: "画像 3（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}chatting-label-plaque-cozy-uniform-cell.png`, x: 58, y: 10, width: 360, height: 162, opacity: 0.96 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "CHATTING / YouTube", x: 118, y: 80, width: 250, height: 28, fontSize: 22, color: "#fff8ef", strokeWidth: 0, shadowColor: "#20142c", shadowBlur: 3, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Fredoka", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "ゆるっと\n雑談配信", x: 86, y: 150, width: 640, height: 268, fontSize: 105, lineHeight: 1.03, color: "#fffaf2", strokeColor: "#251431", strokeWidth: 10, shadowColor: "#df8f58", shadowBlur: 15, shadowOffsetX: 4, shadowOffsetY: 5, fontFamily: "Kiwi Maru" }),
      assetDecorationLayer({ name: "画像 4（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}chatting-time-badge-cozy-uniform-cell.png`, x: 42, y: 420, width: 510, height: 168, opacity: 0.94 }),
      shapeLayer({ name: "図形 5（時刻アイコン外円）", shapeType: "circle", x: 118, y: 486, width: 38, height: 38, fillColor: "#00000000", strokeColor: "#f3c17c", strokeWidth: 4, borderRadius: 0, opacity: 0.9 }),
      shapeLayer({ name: "図形 6（時刻アイコン短針）", shapeType: "line", x: 136, y: 495, width: 2, height: 20, rotation: -90, fillColor: "#f3c17c", strokeColor: "#f3c17c", strokeWidth: 4, borderRadius: 4, opacity: 0.92 }),
      shapeLayer({ name: "図形 7（時刻アイコン長針）", shapeType: "line", x: 140, y: 506, width: 16, height: 2, fillColor: "#f3c17c", strokeColor: "#f3c17c", strokeWidth: 4, borderRadius: 4, opacity: 0.92 }),
      textLayer({ name: "テキスト 2（時刻）", text: "21:00 START", x: 178, y: 482, width: 320, height: 52, fontSize: 47, color: "#fff4df", strokeColor: "#20142c", strokeWidth: 3, shadowColor: "#000000", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4, fontFamily: "Poppins" }),
      textLayer({ name: "テキスト 3（サブ）", text: "今日の話題を一緒に整理しよう", x: 94, y: 574, width: 590, height: 44, fontSize: 30, color: "#fff8ee", strokeColor: "#140b21", strokeWidth: 3, shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "BIZ UDPGothic" })
    ]
  },
  {
    id: "clip",
    name: "切り抜き",
    category: "告知画像",
    usageLabel: "動画告知",
    description: "短い強調語と勢いを出す切り抜き向け。",
    accent: "#f59e0b",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}clip-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（小さな破片候補）", src: `${thumbnailPhase5DecorationAssetPrefix}clip-spark-shards-purple-uniform-cell.png`, x: 612, y: 516, width: 360, height: 240, rotation: -4, opacity: 0.62 }),
      assetDecorationLayer({ name: "画像 3（衝撃マーク）", src: `${thumbnailPhase5DecorationAssetPrefix}clip-impact-burst-yellow-uniform-cell.png`, x: 788, y: 72, width: 168, height: 112, rotation: 9, opacity: 0.94 }),
      assetDecorationLayer({ name: "画像 4（矢印アクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}clip-arrow-yellow-uniform-cell.png`, x: 346, y: 512, width: 264, height: 176, rotation: 7, opacity: 0.9 }),
      assetDecorationLayer({ name: "画像 5（見出しステッカー土台）", src: `${thumbnailPhase5DecorationAssetPrefix}clip-title-sticker-backplate-uniform-cell.png`, x: 480, y: 354, width: 600, height: 400, rotation: -2, opacity: 0.96 }),
      shapeLayer({ name: "図形 1（見出し下線）", shapeType: "line", x: 620, y: 552, width: 342, height: 18, rotation: -2, fillColor: "#ffd329", strokeColor: "#ffd329", strokeWidth: 5, borderRadius: 12, opacity: 0.84 }),
      shapeLayer({ name: "図形 2（左下補助ライン）", shapeType: "line", x: 96, y: 574, width: 440, height: 18, rotation: -4, fillColor: "#ffffff", strokeColor: "#ffffff", strokeWidth: 3, borderRadius: 10, opacity: 0.38 }),
      shapeLayer({ name: "図形 3（右側区切り線）", shapeType: "line", x: 740, y: 194, width: 260, height: 18, rotation: 10, fillColor: "#ff9f1a", strokeColor: "#ff9f1a", strokeWidth: 4, borderRadius: 10, opacity: 0.46 }),
      assetDecorationLayer({ name: "画像 6（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}clip-label-sticker-yellow-uniform-cell.png`, x: 30, y: 34, width: 420, height: 280, rotation: -5, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "見どころ", x: 112, y: 102, width: 238, height: 48, rotation: -5, fontSize: 44, color: "#ffffff", strokeColor: "#050505", strokeWidth: 6, shadowColor: "#d233ff", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4, fontFamily: "RocknRoll One" }),
      textLayer({ name: "テキスト 1（見出し）", text: "神回\nまとめ", x: 542, y: 400, width: 456, height: 156, rotation: -2, fontSize: 74, lineHeight: 0.9, align: "center", color: "#ffd329", strokeColor: "#060606", strokeWidth: 12, shadowColor: "#9b22ff", shadowBlur: 10, shadowOffsetX: 4, shadowOffsetY: 6, fontFamily: "RocknRoll One" }),
      assetDecorationLayer({ name: "画像 7（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}clip-time-badge-sticker-purple-uniform-cell.png`, x: 672, y: 214, width: 374, height: 249, rotation: 2, opacity: 0.98 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 公開", x: 748, y: 302, width: 228, height: 48, rotation: 2, fontSize: 39, color: "#ffd32b", strokeColor: "#050505", strokeWidth: 5, shadowColor: "#ffffff", shadowBlur: 2, shadowOffsetX: 1, shadowOffsetY: 1, fontFamily: "M PLUS 1p" }),
      textLayer({ name: "テキスト 3（サブ）", text: "ショート動画 / プレミア公開", x: 480, y: 608, width: 540, height: 44, fontSize: 31, align: "center", color: "#ffffff", strokeColor: "#070707", strokeWidth: 6, shadowColor: "#d233ff", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4, fontFamily: "M PLUS 1p" })
    ]
  },
  {
    id: "game_live",
    name: "ゲーム実況",
    category: "配信ジャンル",
    usageLabel: "実況・参加型",
    description: "ゲームタイトルと配信時刻を分けて見せる実況向け。",
    accent: "#7ddf64",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}game-live-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（スピードアクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}game-live-speed-accent-green-uniform-cell.png`, x: 428, y: 446, width: 350, height: 234, rotation: -7, opacity: 0.6 }),
      assetDecorationLayer({ name: "画像 3（立ち絵guideのHUD角）", src: `${thumbnailPhase5DecorationAssetPrefix}game-live-hud-corner-frame-uniform-cell.png`, x: 746, y: 66, width: 480, height: 320, opacity: 0.66 }),
      shapeLayer({ name: "図形 3（立ち絵guide枠）", shapeType: "frame", x: 820, y: 112, width: 330, height: 492, fillColor: "#03172418", strokeColor: "#dffeff", strokeWidth: 2, borderRadius: 70, opacity: 0.38 }),
      shapeLayer({ name: "図形 6（ゲーム感ライン）", shapeType: "line", x: 510, y: 112, width: 225, height: 16, fillColor: "#66fff0", strokeColor: "#66fff0", strokeWidth: 4, borderRadius: 8, opacity: 0.64 }),
      assetDecorationLayer({ name: "画像 4（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}game-live-label-plaque-neon-uniform-cell.png`, x: 46, y: 36, width: 490, height: 328, opacity: 0.96 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "GAME LIVE", x: 136, y: 106, width: 300, height: 44, fontSize: 40, color: "#b9ffbe", strokeColor: "#06120e", strokeWidth: 2, shadowColor: "#42ff6f", shadowBlur: 8, shadowOffsetX: 0, shadowOffsetY: 2, fontFamily: "Orbitron", italic: true, align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "参加型\nゲーム実況", x: 82, y: 166, width: 664, height: 266, fontSize: 108, lineHeight: 0.98, color: "#ffffff", strokeColor: "#031017", strokeWidth: 14, shadowColor: "#2dfaff", shadowBlur: 12, shadowOffsetX: 6, shadowOffsetY: 8, fontFamily: "DotGothic16" }),
      assetDecorationLayer({ name: "画像 5（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}game-live-time-badge-cyan-uniform-cell.png`, x: 74, y: 382, width: 560, height: 374, opacity: 0.92 }),
      shapeLayer({ name: "図形 2（時刻下ライン）", shapeType: "line", x: 148, y: 610, width: 430, height: 14, fillColor: "#35f8ff", strokeColor: "#35f8ff", strokeWidth: 3, borderRadius: 8, opacity: 0.58 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 START", x: 202, y: 516, width: 304, height: 58, fontSize: 51, color: "#5ffcff", strokeColor: "#021018", strokeWidth: 3, shadowColor: "#42ff6f", shadowBlur: 10, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Orbitron", align: "center" }),
      textLayer({ name: "テキスト 3（サブ）", text: "初見さん歓迎 / 一緒に遊ぼう", x: 106, y: 634, width: 590, height: 46, fontSize: 33, align: "center", color: "#f4fff1", strokeColor: "#01110a", strokeWidth: 4, shadowColor: "#42ff6f", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "BIZ UDPGothic" })
    ]
  },
  {
    id: "collaboration",
    name: "コラボ",
    category: "配信ジャンル",
    usageLabel: "2人以上",
    description: "参加者名や企画名を載せやすいコラボ配信用。",
    accent: "#ff7a59",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}collaboration-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（2人guideスポット）", src: `${thumbnailPhase5DecorationAssetPrefix}collaboration-duo-guide-spotlight-uniform-cell.png`, x: 594, y: 102, width: 628, height: 419, opacity: 0.18 }),
      assetDecorationLayer({ name: "画像 3（接続アクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}collaboration-connection-accent-uniform-cell.png`, x: 596, y: 318, width: 596, height: 397, opacity: 0.42 }),
      shapeLayer({ name: "図形 1（左立ち絵ガイド）", shapeType: "frame", x: 650, y: 150, width: 292, height: 452, fillColor: "#ff7b5912", strokeColor: "#ffd28c", strokeWidth: 2, borderRadius: 76, opacity: 0.42 }),
      shapeLayer({ name: "図形 2（右立ち絵ガイド）", shapeType: "frame", x: 902, y: 150, width: 300, height: 452, fillColor: "#ff4cc212", strokeColor: "#ffc4f0", strokeWidth: 2, borderRadius: 76, opacity: 0.42 }),
      shapeLayer({ name: "図形 5（二人配置ライン）", shapeType: "line", x: 682, y: 618, width: 496, height: 16, fillColor: "#ffe8d8", strokeColor: "#ffe8d8", strokeWidth: 3, borderRadius: 8, opacity: 0.42 }),
      assetDecorationLayer({ name: "画像 4（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}collaboration-label-plaque-warm-uniform-cell.png`, x: 48, y: -25, width: 467, height: 251, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "GUEST", x: 158, y: 75, width: 250, height: 44, fontSize: 42, color: "#fff8ec", strokeColor: "#7d2307", strokeWidth: 2, shadowColor: "#25050b", shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 2, fontFamily: "Montserrat", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "コラボ\n配信", x: 72, y: 178, width: 590, height: 248, fontSize: 112, lineHeight: 0.96, color: "#fff8ef", strokeColor: "#330804", strokeWidth: 14, shadowColor: "#ff4d31", shadowBlur: 12, shadowOffsetX: 5, shadowOffsetY: 7, fontFamily: "M PLUS 1p" }),
      assetDecorationLayer({ name: "画像 5（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}collaboration-time-badge-rose-gold-uniform-cell.png`, x: 18, y: 380, width: 540, height: 267, opacity: 0.96 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 START", x: 184, y: 492, width: 304, height: 52, fontSize: 46, color: "#fff2c2", strokeColor: "#23050a", strokeWidth: 3, shadowColor: "#ff3b86", shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Montserrat", align: "center" }),
      textLayer({ name: "テキスト 3（サブ）", text: "ゲスト名 / 企画名", x: 100, y: 592, width: 490, height: 50, fontSize: 35, align: "center", color: "#fffdf7", strokeColor: "#180610", strokeWidth: 4, shadowColor: "#ff7a2b", shadowBlur: 8, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Zen Kaku Gothic New" })
    ]
  },
  {
    id: "announcement",
    name: "お知らせ",
    category: "告知画像",
    usageLabel: "重要告知",
    description: "配信以外の案内や大事なお知らせを読みやすく整理。",
    accent: "#ffd34d",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}announcement-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（控えめな金色グリント）", src: `${thumbnailPhase5DecorationAssetPrefix}announcement-soft-glint-cluster-gold-uniform-cell.png`, x: 716, y: 86, width: 310, height: 206, opacity: 0.42 }),
      assetDecorationLayer({ name: "画像 3（角飾り）", src: `${thumbnailPhase5DecorationAssetPrefix}announcement-corner-ornament-gold-uniform-cell.png`, x: 66, y: 82, width: 155, height: 104, opacity: 0.5 }),
      shapeLayer({ name: "図形 3（立ち絵guide枠）", shapeType: "frame", x: 888, y: 126, width: 302, height: 506, fillColor: "#fff2d012", strokeColor: "#ffe4a2", strokeWidth: 2, borderRadius: 78, opacity: 0.34 }),
      assetDecorationLayer({ name: "画像 5（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}announcement-label-plaque-ivory-uniform-cell.png`, x: 118, y: 54, width: 418, height: 112, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "NEWS", x: 232, y: 91, width: 190, height: 40, fontSize: 34, color: "#111827", strokeWidth: 0, shadowColor: "#ffffff", shadowBlur: 3, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Playfair Display", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "大切な\nお知らせ", x: 126, y: 174, width: 610, height: 224, fontSize: 82, lineHeight: 1.16, color: "#fff8e7", strokeColor: "#080d17", strokeWidth: 9, shadowColor: "#d99b42", shadowBlur: 10, shadowOffsetX: 3, shadowOffsetY: 4, fontFamily: "Noto Serif JP" }),
      shapeLayer({ name: "図形 5（本文罫線）", shapeType: "line", x: 134, y: 404, width: 518, height: 14, fillColor: "#e8c369", strokeColor: "#e8c369", strokeWidth: 3, borderRadius: 8, opacity: 0.68 }),
      assetDecorationLayer({ name: "画像 6（日付バッジ）", src: `${thumbnailPhase5DecorationAssetPrefix}announcement-date-badge-navy-gold-uniform-cell.png`, x: 104, y: 432, width: 566, height: 126, opacity: 0.98 }),
      textLayer({ name: "テキスト 2（時刻）", text: "5/10 公開", x: 194, y: 470, width: 390, height: 54, fontSize: 47, align: "center", color: "#fff0be", strokeColor: "#090c14", strokeWidth: 3, shadowColor: "#d59642", shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "BIZ UDPGothic" }),
      shapeLayer({ name: "図形 6（サブ下ライン）", shapeType: "line", x: 178, y: 616, width: 390, height: 12, fillColor: "#dfb86a", strokeColor: "#dfb86a", strokeWidth: 2, borderRadius: 8, opacity: 0.48 }),
      textLayer({ name: "テキスト 3（サブ）", text: "今後の活動について", x: 128, y: 558, width: 520, height: 52, fontSize: 34, align: "center", color: "#fffdf5", strokeColor: "#080c16", strokeWidth: 3, shadowColor: "#000000", shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Noto Serif JP" })
    ]
  },
  {
    id: "weekly_schedule",
    name: "週間予定",
    category: "スケジュール",
    usageLabel: "週まとめ",
    description: "今週の予定や配信枠を一覧風に見せる横長画像。",
    accent: "#4dd8ff",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}weekly-schedule-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（予定表アクセント）", src: `${thumbnailPhase5DecorationAssetPrefix}weekly-schedule-table-accent-cyan-uniform-cell.png`, x: 596, y: 48, width: 620, height: 558, opacity: 0.24 }),
      assetDecorationLayer({ name: "画像 3（控えめな角グリント）", src: `${thumbnailPhase5DecorationAssetPrefix}weekly-schedule-corner-glints-cyan-uniform-cell.png`, x: 18, y: 62, width: 430, height: 287, opacity: 0.34 }),
      shapeLayer({ name: "図形 4（予定表フレーム）", shapeType: "frame", x: 482, y: 52, width: 732, height: 556, fillColor: "#04172e16", strokeColor: "#9dfaff", strokeWidth: 2, borderRadius: 24, opacity: 0.3 }),
      shapeLayer({ name: "図形 5（予定表区切り線 上）", shapeType: "line", x: 530, y: 145, width: 642, height: 14, fillColor: "#8cf8ff", strokeColor: "#8cf8ff", strokeWidth: 2, borderRadius: 4, opacity: 0.18 }),
      shapeLayer({ name: "図形 6（予定表区切り線 下）", shapeType: "line", x: 530, y: 546, width: 642, height: 14, fillColor: "#8cf8ff", strokeColor: "#8cf8ff", strokeWidth: 2, borderRadius: 4, opacity: 0.16 }),
      assetDecorationLayer({ name: "画像 4（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}weekly-schedule-label-plaque-cyan-uniform-cell.png`, x: 54, y: 54, width: 470, height: 138, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "WEEKLY SCHEDULE", x: 132, y: 100, width: 312, height: 38, fontSize: 31, color: "#d9feff", strokeWidth: 0, shadowColor: "#4dd8ff", shadowBlur: 9, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Bebas Neue", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "今週の\n配信予定", x: 44, y: 174, width: 510, height: 232, fontSize: 92, lineHeight: 1.04, color: "#f8feff", align: "center", bold: true, italic: true, strokeColor: "#04143a", strokeWidth: 11, shadowColor: "#35e6ff", shadowBlur: 19, shadowOffsetX: 4, shadowOffsetY: 6, fontFamily: "Zen Kaku Gothic New" }),
      assetDecorationLayer({ name: "画像 5（週範囲バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}weekly-schedule-range-badge-blue-uniform-cell.png`, x: 116, y: 410, width: 390, height: 120, opacity: 0.98 }),
      textLayer({ name: "テキスト 2（時刻）", text: "5/4 - 5/10", x: 192, y: 452, width: 245, height: 42, fontSize: 36, color: "#ffffff", strokeColor: "#20306d", strokeWidth: 2, shadowColor: "#8ffcff", shadowBlur: 7, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Oswald", align: "center" }),
      ...weeklyScheduleRowLayers(),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 66, y: 536, width: 438, height: 118, fillColor: "#0317242e", strokeColor: "#d8f8ff", strokeWidth: 2, borderRadius: 20, opacity: 0.34 })
    ]
  },
  {
    id: "x_announcement",
    name: "X告知画像",
    category: "告知画像",
    usageLabel: "投稿添付",
    description: "X投稿に添える短文告知画像。本文の1行目を活かしやすい。",
    accent: "#00b7ff",
    layers: [
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase5BackgroundAssetPrefix}x-announcement-background-v1.png`),
      assetDecorationLayer({ name: "画像 2（控えめな青金グリント）", src: `${thumbnailPhase5DecorationAssetPrefix}x-announcement-soft-glint-cluster-blue-uniform-cell.png`, x: 670, y: 72, width: 275, height: 184, opacity: 0.34 }),
      assetDecorationLayer({ name: "画像 3（角飾り）", src: `${thumbnailPhase5DecorationAssetPrefix}x-announcement-corner-ornament-gold-uniform-cell.png`, x: 82, y: 130, width: 138, height: 92, opacity: 0.5 }),
      shapeLayer({ name: "図形 3（立ち絵guide枠）", shapeType: "frame", x: 872, y: 110, width: 306, height: 520, fillColor: "#f8fbff08", strokeColor: "#8ca5df", strokeWidth: 2, borderRadius: 86, opacity: 0.24 }),
      assetDecorationLayer({ name: "画像 5（ラベル土台）", src: `${thumbnailPhase5DecorationAssetPrefix}x-announcement-label-plaque-blue-uniform-cell.png`, x: 260, y: 116, width: 360, height: 104, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "X POST", x: 350, y: 151, width: 180, height: 34, fontSize: 30, color: "#ffffff", strokeColor: "#243d84", strokeWidth: 2, shadowColor: "#ffffff", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Montserrat", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "本日のお知らせ", x: 116, y: 258, width: 674, height: 94, fontSize: 75, lineHeight: 1, color: "#172766", strokeColor: "#ffffff", strokeWidth: 0, shadowColor: "#cfdcff", shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 2, fontFamily: "Zen Kaku Gothic New" }),
      shapeLayer({ name: "図形 5（本文罫線）", shapeType: "line", x: 128, y: 386, width: 604, height: 16, fillColor: "#d1ad58", strokeColor: "#d1ad58", strokeWidth: 2, borderRadius: 8, opacity: 0.54 }),
      textLayer({ name: "テキスト 3（サブ）", text: "配信予定と最新情報をまとめました", x: 158, y: 420, width: 564, height: 44, fontSize: 31, align: "center", color: "#22306f", strokeColor: "#ffffff", strokeWidth: 0, shadowColor: "#dce6ff", shadowBlur: 3, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "BIZ UDPGothic" }),
      shapeLayer({ name: "図形 6（サブ下ライン）", shapeType: "line", x: 244, y: 482, width: 392, height: 12, fillColor: "#d1ad58", strokeColor: "#d1ad58", strokeWidth: 2, borderRadius: 8, opacity: 0.38 }),
      assetDecorationLayer({ name: "画像 6（日付バッジ）", src: `${thumbnailPhase5DecorationAssetPrefix}x-announcement-date-badge-blue-gold-uniform-cell.png`, x: 250, y: 498, width: 380, height: 112, opacity: 0.98 }),
      textLayer({ name: "テキスト 2（時刻）", text: "05.06 WED", x: 334, y: 535, width: 216, height: 42, fontSize: 38, color: "#ffffff", strokeColor: "#243d84", strokeWidth: 2, shadowColor: "#ffffff", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Montserrat", align: "center" })
    ]
  }
];

const thumbnailDefaultPresetVariantId: ThumbnailPresetVariantId = "landscape-16-9";
const thumbnailSupportedPresetVariantIds: ThumbnailPresetVariantId[] = ["landscape-16-9", "portrait-9-16", "square-1-1"];
export const thumbnailPresetVariantRelations = Object.fromEntries(
  thumbnailPresets.map((preset) => [
    preset.id,
    {
      presetId: preset.id,
      familyId: preset.id.replace(/_/g, "-"),
      defaultVariantId: thumbnailDefaultPresetVariantId,
      variantIds: [...thumbnailSupportedPresetVariantIds]
    }
  ])
) as Record<ThumbnailPresetId, ThumbnailPresetVariantRelation>;

const thumbnailPresetIds = new Set<ThumbnailPresetId>(thumbnailPresets.map((preset) => preset.id));
const isThumbnailPresetId = (value: unknown): value is ThumbnailPresetId =>
  typeof value === "string" && thumbnailPresetIds.has(value as ThumbnailPresetId);
const thumbnailPresetVariantIds = new Set<ThumbnailPresetVariantId>(
  Object.keys(thumbnailPresetVariants) as ThumbnailPresetVariantId[]
);
const isThumbnailPresetVariantId = (value: unknown): value is ThumbnailPresetVariantId =>
  typeof value === "string" && thumbnailPresetVariantIds.has(value as ThumbnailPresetVariantId);
const thumbnailPresetBatchTextLayerRoles: ThumbnailPresetBatchTextLayerRole[] = ["見出し", "時刻", "サブ", "ラベル"];
const thumbnailPresetBatchDependencies: ThumbnailPresetBatchDependency[] = [
  "variant",
  "partial-apply",
  "font-policy",
  "material-boundary",
  "handoff"
];

export const thumbnailPresetBatchCandidates: ThumbnailPresetBatchCandidate[] = [
  {
    id: "karaoke_stream",
    label: "歌枠",
    useCase: "歌枠や音楽配信の開始告知向け",
    recommendedVariantId: "landscape-16-9",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"],
    requiredMaterialCategories: ["label-base", "date-badge", "accent", "corner"],
    dependsOn: thumbnailPresetBatchDependencies
  },
  {
    id: "chat_stream",
    label: "雑談",
    useCase: "雑談配信や近況共有の開始告知向け",
    recommendedVariantId: "landscape-16-9",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"],
    requiredMaterialCategories: ["label-base", "date-badge", "frame", "divider"],
    dependsOn: thumbnailPresetBatchDependencies
  },
  {
    id: "gameplay_stream",
    label: "ゲーム実況",
    useCase: "ゲーム実況、参加型、シリーズ配信向け",
    recommendedVariantId: "landscape-16-9",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"],
    requiredMaterialCategories: ["label-base", "date-badge", "divider", "frame"],
    dependsOn: thumbnailPresetBatchDependencies
  },
  {
    id: "notice_stream",
    label: "告知",
    useCase: "配信外のお知らせや公開案内向け",
    recommendedVariantId: "landscape-16-9",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"],
    requiredMaterialCategories: ["label-base", "date-badge", "frame", "corner"],
    dependsOn: thumbnailPresetBatchDependencies
  },
  {
    id: "highlight_clip",
    label: "切り抜き",
    useCase: "切り抜き、見どころ、公開予定の告知向け",
    recommendedVariantId: "landscape-16-9",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"],
    requiredMaterialCategories: ["label-base", "date-badge", "accent", "divider"],
    dependsOn: thumbnailPresetBatchDependencies
  }
];

const toPresetBatchStringArray = (values: unknown): string[] => (Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : []);

export const getThumbnailPresetBatchReadiness = (
  candidate: Partial<ThumbnailPresetBatchCandidate> & { id?: unknown } = thumbnailPresetBatchCandidates[0]
): ThumbnailPresetBatchReadiness => {
  const candidateId = typeof candidate.id === "string" ? candidate.id : "unknown";
  const warnings: ThumbnailPresetBatchReadinessWarning[] = [];

  if (isThumbnailPresetId(candidate.id)) {
    warnings.push({
      id: "preset-id-collision",
      message: `${candidateId} は既存 preset id と衝突します。`,
      tone: "warning"
    });
  }

  if (!isThumbnailPresetVariantId(candidate.recommendedVariantId)) {
    warnings.push({
      id: "unsupported-variant",
      message: `${candidateId} は現時点で未対応の variant body を前提にしています。`,
      tone: "warning"
    });
  }

  const roles = toPresetBatchStringArray(candidate.requiredTextLayerRoles);
  const unsupportedRoles = roles.filter((role) => !thumbnailPresetBatchTextLayerRoles.includes(role as ThumbnailPresetBatchTextLayerRole));
  if (roles.length === 0 || unsupportedRoles.length > 0) {
    warnings.push({
      id: "unsupported-text-layer-role",
      message: `${candidateId} に未対応の text layer role があります。`,
      tone: "warning"
    });
  }

  const dependencies = toPresetBatchStringArray(candidate.dependsOn);
  for (const dependency of thumbnailPresetBatchDependencies) {
    if (!dependencies.includes(dependency)) {
      warnings.push({
        id: `missing-${dependency}`,
        message: `${candidateId} は ${dependency} contract の前提が不足しています。`,
        tone: "warning"
      });
    }
  }

  if (thumbnailFontPolicy.allowsExternalNetworkFonts || thumbnailFontPolicy.allowsGoogleFonts || thumbnailFontPolicy.allowsCdnFonts) {
    warnings.push({
      id: "network-font-policy",
      message: `${candidateId} は外部 network font 非依存の前提を満たしていません。`,
      tone: "warning"
    });
  }

  if (thumbnailUserMaterialStoragePolicy.localStorageStoresImageBody) {
    warnings.push({
      id: "material-storage-boundary",
      message: `${candidateId} は user material storage boundary の前提を満たしていません。`,
      tone: "warning"
    });
  }

  return {
    candidateId,
    ready: warnings.length === 0,
    warnings,
    policy: thumbnailPresetBatchReadinessPolicy
  };
};

export const getThumbnailPresetBatchReadinessSummary = (
  candidates: readonly ThumbnailPresetBatchCandidate[] = thumbnailPresetBatchCandidates
): ThumbnailPresetBatchReadinessSummary => {
  const items = candidates.map((candidate) => getThumbnailPresetBatchReadiness(candidate));
  return {
    total: items.length,
    readyCount: items.filter((item) => item.ready).length,
    warningCount: items.reduce((total, item) => total + item.warnings.length, 0),
    items
  };
};

const uniquePresetIds = (values: unknown, limit = thumbnailPresets.length): ThumbnailPresetId[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const ids: ThumbnailPresetId[] = [];
  for (const value of values) {
    if (isThumbnailPresetId(value) && !ids.includes(value)) {
      ids.push(value);
    }
    if (ids.length >= limit) {
      break;
    }
  }
  return ids;
};

export const getDefaultThumbnailPresetVariantRef = (presetId: ThumbnailPresetId): ThumbnailPresetVariantRef => {
  const relation = thumbnailPresetVariantRelations[presetId];
  return {
    presetId,
    variantId: relation.defaultVariantId
  };
};

export const getThumbnailPresetVariant = (
  presetId: ThumbnailPresetId,
  variantId: ThumbnailPresetVariantId = thumbnailPresetVariantRelations[presetId].defaultVariantId
): ThumbnailPresetVariant | null => {
  const relation = thumbnailPresetVariantRelations[presetId];
  if (!relation.variantIds.includes(variantId)) {
    return null;
  }
  return thumbnailPresetVariants[variantId] ?? null;
};

export const getThumbnailPresetCanvasFromVariant = (
  presetId: ThumbnailPresetId,
  variantId: ThumbnailPresetVariantId = thumbnailPresetVariantRelations[presetId].defaultVariantId
): ThumbnailCanvas | null => {
  const variant = getThumbnailPresetVariant(presetId, variantId);
  return variant ? { ...variant.canvas } : null;
};

export const normalizeThumbnailPresetVariantRefs = (values: unknown, limit = thumbnailPresets.length): ThumbnailPresetVariantRef[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const refs: ThumbnailPresetVariantRef[] = [];
  for (const value of values) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const ref = value as Partial<ThumbnailPresetVariantRef>;
    if (!isThumbnailPresetId(ref.presetId) || !isThumbnailPresetVariantId(ref.variantId)) {
      continue;
    }
    if (!getThumbnailPresetVariant(ref.presetId, ref.variantId)) {
      continue;
    }
    if (refs.some((item) => item.presetId === ref.presetId && item.variantId === ref.variantId)) {
      continue;
    }

    refs.push({ presetId: ref.presetId, variantId: ref.variantId });
    if (refs.length >= limit) {
      break;
    }
  }
  return refs;
};

export const normalizeThumbnailPresetDiscoveryState = (value: unknown): ThumbnailPresetDiscoveryState => {
  if (!value || typeof value !== "object") {
    return { version: 1, recentPresetIds: [], favoritePresetIds: [], recentPresetVariantRefs: [], favoritePresetVariantRefs: [] };
  }

  const state = value as Partial<ThumbnailPresetDiscoveryState>;
  return {
    version: 1,
    recentPresetIds: uniquePresetIds(state.recentPresetIds, thumbnailPresetRecentLimit),
    favoritePresetIds: uniquePresetIds(state.favoritePresetIds),
    recentPresetVariantRefs: normalizeThumbnailPresetVariantRefs(state.recentPresetVariantRefs, thumbnailPresetRecentLimit),
    favoritePresetVariantRefs: normalizeThumbnailPresetVariantRefs(state.favoritePresetVariantRefs)
  };
};

export const getThumbnailPresetSearchText = (preset: ThumbnailPreset) =>
  [preset.name, preset.category, preset.usageLabel, preset.description].join(" ").toLowerCase();

export const filterThumbnailPresets = (presets: ThumbnailPreset[], filter: ThumbnailPresetFilter) => {
  const query = filter.query.trim().toLowerCase();
  return presets.filter((preset) => {
    if (filter.category !== "all" && preset.category !== filter.category) {
      return false;
    }
    if (filter.usageLabel !== "all" && preset.usageLabel !== filter.usageLabel) {
      return false;
    }
    return query ? getThumbnailPresetSearchText(preset).includes(query) : true;
  });
};

export const createNextRecentThumbnailPresetIds = (
  currentPresetIds: ThumbnailPresetId[],
  presetId: ThumbnailPresetId
): ThumbnailPresetId[] => uniquePresetIds([presetId, ...currentPresetIds], thumbnailPresetRecentLimit);

export const toggleThumbnailPresetFavorite = (
  currentPresetIds: ThumbnailPresetId[],
  presetId: ThumbnailPresetId
): ThumbnailPresetId[] => {
  if (currentPresetIds.includes(presetId)) {
    return currentPresetIds.filter((id) => id !== presetId);
  }
  return uniquePresetIds([...currentPresetIds, presetId]);
};

export const getThumbnailMainTextCarryover = (draft: Pick<ThumbnailEditorDraft, "layers">): ThumbnailMainTextCarryover => {
  const carryover: ThumbnailMainTextCarryover = {};
  for (const target of thumbnailMainTextCarryoverTargets) {
    const layer = draft.layers.find((item) => item.type === "text" && item.name.includes(target.namePart));
    if (layer?.type === "text") {
      carryover[target.id] = layer.text;
    }
  }
  return carryover;
};

export const applyThumbnailMainTextCarryover = (
  draft: ThumbnailEditorDraft,
  carryover: ThumbnailMainTextCarryover
): ThumbnailEditorDraft => {
  let selectedLayerId = draft.selectedLayerId;
  let firstChangedLayerId: string | null = null;
  const layers = draft.layers.map((layer) => {
    if (layer.type !== "text") {
      return layer;
    }

    const target = thumbnailMainTextCarryoverTargets.find((item) => layer.name.includes(item.namePart));
    const text = target ? carryover[target.id] : undefined;
    if (!target || typeof text !== "string") {
      return layer;
    }

    firstChangedLayerId ??= layer.id;
    if (target.id === "headline") {
      selectedLayerId = layer.id;
    }
    return { ...layer, text };
  });

  return {
    ...draft,
    layers,
    selectedLayerId: selectedLayerId ?? firstChangedLayerId ?? draft.selectedLayerId,
    updatedAt: nowIso()
  };
};

const comparableLayer = (layer: ThumbnailLayer): Omit<ThumbnailLayer, "id"> => {
  const { id: _id, ...rest } = layer;
  return rest;
};

export const isThumbnailDraftPristineForPreset = (draft: ThumbnailEditorDraft): boolean => {
  const presetDraft = createDraftFromPreset(draft.presetId, draft.canvas);
  if (draft.layers.length !== presetDraft.layers.length) {
    return false;
  }

  return draft.layers.every((layer, index) => {
    const presetLayer = presetDraft.layers[index];
    return presetLayer ? JSON.stringify(comparableLayer(layer)) === JSON.stringify(comparableLayer(presetLayer)) : false;
  });
};

const isThumbnailUserImageLayer = (layer: ThumbnailLayer): layer is ThumbnailImageLayer =>
  layer.type === "image" && (layer.src.startsWith("data:image/") || layer.name.startsWith("素材:") || Boolean(layer.materialRef));

export const applyThumbnailPresetPartial = (
  draft: ThumbnailEditorDraft,
  targetPresetId: ThumbnailPresetId
): ThumbnailEditorDraft => {
  const targetDraft = createDraftFromPreset(targetPresetId, draft.canvas);
  if (isThumbnailDraftPristineForPreset(draft)) {
    return targetDraft;
  }

  const withMainText = applyThumbnailMainTextCarryover(targetDraft, getThumbnailMainTextCarryover(draft));
  const preservedImageLayers = draft.layers
    .filter(isThumbnailUserImageLayer)
    .map((layer) => ({ ...layer }));
  const selectedLayerId = preservedImageLayers.some((layer) => layer.id === draft.selectedLayerId)
    ? draft.selectedLayerId
    : withMainText.selectedLayerId;

  return {
    ...withMainText,
    layers: [...withMainText.layers, ...preservedImageLayers],
    selectedLayerId,
    updatedAt: nowIso()
  };
};

export const normalizeThumbnailLayerName = (value: string, fallback: string) => {
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 40);
  return normalized || fallback.slice(0, 40) || "レイヤー";
};

const copySuffixPattern = /(?:\sコピー(?:\s\d+)?)+$/;

export const createThumbnailDuplicateLayerName = (name: string, existingNames: string[]) => {
  const baseName = normalizeThumbnailLayerName(name, "レイヤー").replace(copySuffixPattern, "").trim() || "レイヤー";
  const usedNames = new Set(existingNames);
  const firstCopy = `${baseName} コピー`;
  if (!usedNames.has(firstCopy)) {
    return firstCopy;
  }

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${baseName} コピー ${index}`;
    if (!usedNames.has(candidate)) {
      return candidate;
    }
  }

  return `${baseName} コピー ${Date.now().toString().slice(-4)}`;
};

export const cloneThumbnailLayer = (layer: ThumbnailLayer, existingNames: string[] = []): ThumbnailLayer => ({
  ...layer,
  id: createId(layer.type),
  name: createThumbnailDuplicateLayerName(layer.name, existingNames),
  x: Math.min(layer.x + 24, 1180),
  y: Math.min(layer.y + 24, 620)
} as ThumbnailLayer);

export const createTextLayer = (): ThumbnailTextLayer =>
  textLayer({
    name: "テキスト",
    text: "新しいテキスト",
    x: 180,
    y: 190,
    width: 600,
    height: 140
  });

export const createShapeLayer = (shapeType: ThumbnailShapeType): ThumbnailShapeLayer =>
  shapeLayer({
    name: thumbnailShapeTypeLabels[shapeType],
    shapeType,
    x: shapeType === "circle" ? 840 : 150,
    y: shapeType === "circle" ? 430 : shapeType === "line" ? 540 : 470,
    width: shapeType === "circle" ? 170 : shapeType === "burst" ? 180 : 420,
    height: shapeType === "circle" ? 170 : shapeType === "line" ? 24 : shapeType === "burst" ? 140 : 92,
    fillColor: shapeType === "circle" ? "#ff5ca8" : shapeType === "line" ? "#f7b500" : "#111a22cc",
    strokeColor: shapeType === "line" ? "#f7b500" : "#ffffff",
    strokeWidth: shapeType === "line" ? 8 : 4,
    borderRadius: shapeType === "line" ? 12 : 20
  });

export const createImageLayer = (src: string): ThumbnailImageLayer => ({
  id: createId("image"),
  name: "画像",
  type: "image",
  src,
  x: 340,
  y: 120,
  width: 520,
  height: 330,
  rotation: 0,
  opacity: 1,
  blur: 0
});

export const thumbnailUserMaterialFallbackImageSrc = svgDataUrl("MATERIAL MISSING", "#111827", "#475569", "#e5e7eb");

const thumbnailUserMaterialMimeTypes: ThumbnailUserMaterialMimeType[] = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const thumbnailUserMaterialFallbackLabels: Record<ThumbnailUserMaterialFallbackReason, string> = {
  deleted: "削除済み",
  replaced: "差し替え待ち",
  "load-failed": "読み込み失敗"
};
const normalizeThumbnailUserMaterialText = (value: unknown, fallback: string, maxLength: number) => {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
  return normalized || fallback;
};
const normalizeThumbnailUserMaterialPositiveNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
const normalizeThumbnailUserMaterialTimestamp = (value: unknown) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : undefined;

export const normalizeThumbnailUserMaterialRef = (value: unknown): ThumbnailUserMaterialRef | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const ref = value as Partial<ThumbnailUserMaterialRef>;
  if (ref.storage && ref.storage !== "indexeddb") {
    return null;
  }
  if (!ref.mimeType || !thumbnailUserMaterialMimeTypes.includes(ref.mimeType)) {
    return null;
  }

  const id = normalizeThumbnailUserMaterialText(ref.id, "", 72);
  const storageId = normalizeThumbnailUserMaterialText(ref.storageId, "", 96);
  if (!id || !storageId || id.startsWith("data:") || storageId.startsWith("data:")) {
    return null;
  }

  const normalized: ThumbnailUserMaterialRef = {
    id,
    name: normalizeThumbnailUserMaterialText(ref.name, "ユーザー素材", 32),
    storageId,
    storage: "indexeddb",
    mimeType: ref.mimeType
  };
  const width = normalizeThumbnailUserMaterialPositiveNumber(ref.width);
  const height = normalizeThumbnailUserMaterialPositiveNumber(ref.height);
  const byteSize = normalizeThumbnailUserMaterialPositiveNumber(ref.byteSize);
  const createdAt = normalizeThumbnailUserMaterialTimestamp(ref.createdAt);
  const updatedAt = normalizeThumbnailUserMaterialTimestamp(ref.updatedAt);
  if (width) normalized.width = width;
  if (height) normalized.height = height;
  if (byteSize) normalized.byteSize = byteSize;
  if (createdAt) normalized.createdAt = createdAt;
  if (updatedAt) normalized.updatedAt = updatedAt;
  return normalized;
};

export const normalizeThumbnailUserMaterialRefs = (values: unknown, limit = thumbnailUserMaterialStoragePolicy.maxRefs): ThumbnailUserMaterialRef[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const refs: ThumbnailUserMaterialRef[] = [];
  for (const value of values) {
    const ref = normalizeThumbnailUserMaterialRef(value);
    if (!ref || refs.some((item) => item.storageId === ref.storageId)) {
      continue;
    }

    refs.push(ref);
    if (refs.length >= limit) {
      break;
    }
  }
  return refs;
};

export const formatThumbnailUserMaterialBytes = (bytes: number) => {
  const normalized = normalizeThumbnailUserMaterialPositiveNumber(bytes) ?? 0;
  if (normalized <= 0) {
    return "0KB";
  }
  if (normalized >= 1024 * 1024) {
    return `${Math.ceil(normalized / (1024 * 1024))}MB`;
  }
  return `${Math.ceil(normalized / 1024)}KB`;
};

export const getThumbnailUserMaterialUsageSummary = (values: unknown): ThumbnailUserMaterialUsageSummary => {
  const refs = normalizeThumbnailUserMaterialRefs(values);
  const totalBytes = refs.reduce((sum, ref) => sum + (ref.byteSize ?? 0), 0);
  return {
    count: refs.length,
    maxCount: thumbnailUserMaterialStoragePolicy.maxRefs,
    totalBytes,
    maxTotalBytes: thumbnailUserMaterialStoragePolicy.maxTotalBytes,
    remainingBytes: Math.max(0, thumbnailUserMaterialStoragePolicy.maxTotalBytes - totalBytes)
  };
};

export const canAddThumbnailUserMaterialRef = (
  currentRefsValue: unknown,
  nextByteSizeValue: unknown,
  replaceStorageId?: string
): ThumbnailUserMaterialCapacityResult => {
  const nextByteSize = normalizeThumbnailUserMaterialPositiveNumber(nextByteSizeValue) ?? 0;
  if (nextByteSize > thumbnailUserMaterialStoragePolicy.maxFileBytes) {
    return { ok: false, reason: "file-too-large" };
  }

  const currentRefs = normalizeThumbnailUserMaterialRefs(currentRefsValue);
  const retainedRefs = replaceStorageId ? currentRefs.filter((ref) => ref.storageId !== replaceStorageId) : currentRefs;
  if (!replaceStorageId && retainedRefs.length >= thumbnailUserMaterialStoragePolicy.maxRefs) {
    return { ok: false, reason: "library-full" };
  }

  const nextTotalBytes = retainedRefs.reduce((sum, ref) => sum + (ref.byteSize ?? 0), 0) + nextByteSize;
  if (nextTotalBytes > thumbnailUserMaterialStoragePolicy.maxTotalBytes) {
    return { ok: false, reason: "total-bytes-exceeded" };
  }

  return { ok: true };
};

const getThumbnailUserMaterialInitialSize = (ref: ThumbnailUserMaterialRef, canvas: ThumbnailCanvas) => {
  const sourceWidth = ref.width && ref.width > 0 ? ref.width : 520;
  const sourceHeight = ref.height && ref.height > 0 ? ref.height : 330;
  const maxWidth = canvas.width * 0.42;
  const maxHeight = canvas.height * 0.46;
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale)
  };
};

export const createThumbnailUserMaterialLayer = (
  value: ThumbnailUserMaterialRef,
  canvas: ThumbnailCanvas = thumbnailCanvasSizes.hd
): ThumbnailImageLayer => {
  const materialRef = normalizeThumbnailUserMaterialRef(value) ?? {
    id: "user-material",
    name: "ユーザー素材",
    storageId: "missing-user-material",
    storage: "indexeddb",
    mimeType: "image/png"
  };
  const size = getThumbnailUserMaterialInitialSize(materialRef, canvas);
  return {
    id: createId("image"),
    name: `素材: ${materialRef.name}`,
    type: "image",
    src: thumbnailUserMaterialFallbackImageSrc,
    x: Math.round((canvas.width - size.width) / 2),
    y: Math.round((canvas.height - size.height) / 2),
    width: size.width,
    height: size.height,
    rotation: 0,
    opacity: 1,
    blur: 0,
    locked: false,
    materialRef
  };
};

export const applyThumbnailUserMaterialLayerFallback = (
  draft: ThumbnailEditorDraft,
  storageId: string,
  reason: ThumbnailUserMaterialFallbackReason
): ThumbnailEditorDraft => {
  const label = thumbnailUserMaterialFallbackLabels[reason];
  return {
    ...draft,
    layers: draft.layers.map((layer) => {
      if (layer.type !== "image" || layer.materialRef?.storageId !== storageId) {
        return layer;
      }
      return {
        ...layer,
        name: `素材: ${layer.materialRef.name}（${label}）`,
        src: thumbnailUserMaterialFallbackImageSrc
      };
    }),
    updatedAt: nowIso()
  };
};

export const replaceThumbnailUserMaterialLayerRef = (
  draft: ThumbnailEditorDraft,
  layerId: string,
  nextRefValue: ThumbnailUserMaterialRef
): ThumbnailEditorDraft => {
  const nextRef = normalizeThumbnailUserMaterialRef(nextRefValue);
  if (!nextRef) {
    return draft;
  }

  return {
    ...draft,
    layers: draft.layers.map((layer) =>
      layer.id === layerId && layer.type === "image"
        ? {
            ...layer,
            name: `素材: ${nextRef.name}`,
            src: thumbnailUserMaterialFallbackImageSrc,
            materialRef: nextRef
          }
        : layer
    ),
    selectedLayerId: draft.layers.some((layer) => layer.id === layerId) ? layerId : draft.selectedLayerId,
    updatedAt: nowIso()
  };
};

export const thumbnailMaterialLibrary = [
  {
    id: "label-plaque-cyan",
    name: "シアンラベル土台",
    category: "label-base",
    description: "短いラベル文字を重ねるためのシアン発光プレート。",
    src: `${thumbnailPhase5DecorationAssetPrefix}stream-label-plaque-cyan-uniform-cell.png`,
    initialSize: { width: 430, height: 144 },
    initialPosition: { x: 56, y: 52 },
    recommendedPlacement: "左上のラベル土台"
  },
  {
    id: "date-badge-navy-gold",
    name: "紺金日付バッジ",
    category: "date-badge",
    description: "日付、時間、公開予定などを載せる横長の紺金バッジ。",
    src: `${thumbnailPhase5DecorationAssetPrefix}announcement-date-badge-navy-gold-uniform-cell.png`,
    initialSize: { width: 480, height: 120 },
    initialPosition: { x: 96, y: 452 },
    recommendedPlacement: "下部の日付・時間バッジ"
  },
  {
    id: "week-range-badge-blue",
    name: "週範囲バッジ",
    category: "date-badge",
    description: "週範囲や短い期間表示に使いやすい青系バッジ。",
    src: `${thumbnailPhase5DecorationAssetPrefix}weekly-schedule-range-badge-blue-uniform-cell.png`,
    initialSize: { width: 390, height: 120 },
    initialPosition: { x: 116, y: 410 },
    recommendedPlacement: "週範囲や短い期間表示"
  },
  {
    id: "corner-ornament-gold",
    name: "金角飾り",
    category: "corner",
    description: "情報枠やカード角に添える控えめな金色の角飾り。",
    src: `${thumbnailPhase5DecorationAssetPrefix}announcement-corner-ornament-gold-uniform-cell.png`,
    initialSize: { width: 180, height: 120 },
    initialPosition: { x: 80, y: 88 },
    recommendedPlacement: "情報枠の角"
  },
  {
    id: "soft-glint-gold",
    name: "控えめ金グリント",
    category: "accent",
    description: "見出しやバッジ周辺に足す小さな金色の光粒。",
    src: `${thumbnailPhase5DecorationAssetPrefix}announcement-soft-glint-cluster-gold-uniform-cell.png`,
    initialSize: { width: 260, height: 174 },
    initialPosition: { x: 760, y: 94 },
    recommendedPlacement: "見出し周辺の控えめな光"
  },
  {
    id: "hud-corner-frame-green",
    name: "HUD角フレーム",
    category: "frame",
    description: "立ち絵、動画枠、情報枠に重ねやすい緑系HUD角。",
    src: `${thumbnailPhase5DecorationAssetPrefix}game-live-hud-corner-frame-uniform-cell.png`,
    initialSize: { width: 460, height: 306 },
    initialPosition: { x: 700, y: 110 },
    recommendedPlacement: "立ち絵・情報枠のHUD角"
  },
  {
    id: "schedule-table-accent-cyan",
    name: "予定表アクセント",
    category: "frame",
    description: "予定表、区切り枠、情報グリッドに重ねるシアン線。",
    src: `${thumbnailPhase5DecorationAssetPrefix}weekly-schedule-table-accent-cyan-uniform-cell.png`,
    initialSize: { width: 520, height: 468 },
    initialPosition: { x: 610, y: 72 },
    recommendedPlacement: "予定表や区切りアクセント"
  },
  {
    id: "duo-guide-spotlight",
    name: "薄い複数枠ガイド",
    category: "frame",
    description: "複数人配置、動画枠、コメント枠の背面に置く薄いガイド光。",
    src: `${thumbnailPhase5DecorationAssetPrefix}collaboration-duo-guide-spotlight-uniform-cell.png`,
    initialSize: { width: 560, height: 374 },
    initialPosition: { x: 620, y: 128 },
    recommendedPlacement: "複数人・動画枠の薄いガイド"
  },
  {
    id: "hud-divider-cyan",
    name: "シアンHUD区切り",
    category: "divider",
    description: "見出し下やセクション境界に使う細いシアンHUDライン。",
    src: `${thumbnailMaterialBatch1AssetPrefix}hud-divider-cyan-uniform-cell.png`,
    initialSize: { width: 520, height: 120 },
    initialPosition: { x: 104, y: 364 },
    recommendedPlacement: "見出し下やセクション区切り"
  },
  {
    id: "video-comment-frame-blue",
    name: "動画コメント枠",
    category: "frame",
    description: "動画枠、コメント欄、予定表の大きな情報枠に使える青系フレーム。",
    src: `${thumbnailMaterialBatch1AssetPrefix}video-comment-frame-blue-uniform-cell.png`,
    initialSize: { width: 600, height: 360 },
    initialPosition: { x: 120, y: 140 },
    recommendedPlacement: "動画枠・コメント枠の土台"
  },
  {
    id: "label-tech-plate-navy-cyan",
    name: "紺シアン横長プレート",
    category: "label-base",
    description: "見出し文字の背面に置く紺色とシアン縁の横長テックプレート。",
    src: `${thumbnailMaterialLabelAssetPrefix}label-tech-plate-navy-cyan.png`,
    initialSize: { width: 620, height: 156 },
    initialPosition: { x: 84, y: 74 },
    recommendedPlacement: "見出し背面の横長テックプレート"
  },
  {
    id: "label-glass-plate-white-blue",
    name: "白青ガラスラベル",
    category: "label-base",
    description: "短い補足文の背面に重ねやすい白と淡青のガラス風ラベル。",
    src: `${thumbnailMaterialLabelAssetPrefix}label-glass-plate-white-blue.png`,
    initialSize: { width: 600, height: 148 },
    initialPosition: { x: 96, y: 472 },
    recommendedPlacement: "短い補足テキスト背面のガラス風ラベル"
  },
  {
    id: "label-champagne-plaque-dark-trim",
    name: "金縁タイトル台座",
    category: "label-base",
    description: "上品な告知見出しを載せるシャンパンゴールドの横長台座。",
    src: `${thumbnailMaterialLabelAssetPrefix}label-champagne-plaque-dark-trim.png`,
    initialSize: { width: 590, height: 150 },
    initialPosition: { x: 92, y: 92 },
    recommendedPlacement: "上品な告知見出しの横長台座"
  },
  {
    id: "label-diagonal-ribbon-slate-cyan",
    name: "斜めカットリボン",
    category: "label-base",
    description: "サブ見出しや短い注釈の背面に置く斜めカットの横長リボン。",
    src: `${thumbnailMaterialLabelAssetPrefix}label-diagonal-ribbon-slate-cyan.png`,
    initialSize: { width: 580, height: 142 },
    initialPosition: { x: 122, y: 426 },
    recommendedPlacement: "斜めカットのサブ見出しリボン"
  },
  {
    id: "badge-status-magenta-cyan",
    name: "マゼンタ丸バッジ",
    category: "date-badge",
    description: "日付や短いステータスの背面に置くマゼンタとシアンの小型丸バッジ。",
    src: `${thumbnailMaterialBadgeAssetPrefix}badge-status-magenta-cyan.png`,
    initialSize: { width: 320, height: 170 },
    initialPosition: { x: 126, y: 444 },
    recommendedPlacement: "日付や短いステータスの背面"
  },
  {
    id: "badge-time-amber-charcoal",
    name: "琥珀時刻ピル",
    category: "date-badge",
    description: "時刻や公開時間の背面に置きやすい琥珀色とチャコールのピルバッジ。",
    src: `${thumbnailMaterialBadgeAssetPrefix}badge-time-amber-charcoal.png`,
    initialSize: { width: 430, height: 128 },
    initialPosition: { x: 94, y: 464 },
    recommendedPlacement: "時刻表示の背面ピル"
  },
  {
    id: "badge-notice-mint-white",
    name: "ミント通知タグ",
    category: "date-badge",
    description: "軽い通知や短い補足の背面に置くミントと白の小型タグバッジ。",
    src: `${thumbnailMaterialBadgeAssetPrefix}badge-notice-mint-white.png`,
    initialSize: { width: 340, height: 146 },
    initialPosition: { x: 116, y: 86 },
    recommendedPlacement: "軽い通知や短い補足の背面"
  },
  {
    id: "badge-tech-hex-cyan-violet",
    name: "シアン六角バッジ",
    category: "date-badge",
    description: "短いテック系ステータスを載せるためのシアンと紫の小型六角バッジ。",
    src: `${thumbnailMaterialBadgeAssetPrefix}badge-tech-hex-cyan-violet.png`,
    initialSize: { width: 270, height: 220 },
    initialPosition: { x: 104, y: 402 },
    recommendedPlacement: "短いテック系ステータス表示"
  },
  {
    id: "frame-smoke-glass-blue-rim",
    name: "青縁スモークパネル",
    category: "frame",
    description: "動画枠や情報ブロックの背面に置く、青縁の低彩度スモークガラスパネル。",
    src: `${thumbnailMaterialFrameAssetPrefix}frame-smoke-glass-blue-rim.png`,
    initialSize: { width: 660, height: 382 },
    initialPosition: { x: 120, y: 132 },
    recommendedPlacement: "動画枠や情報ブロックの背面パネル"
  },
  {
    id: "frame-offwhite-navy-info-panel",
    name: "白紺情報パネル",
    category: "frame",
    description: "読みやすい情報ブロックの背面に使う、オフホワイト地と紺線のパネル。",
    src: `${thumbnailMaterialFrameAssetPrefix}frame-offwhite-navy-info-panel.png`,
    initialSize: { width: 620, height: 344 },
    initialPosition: { x: 126, y: 164 },
    recommendedPlacement: "読みやすい情報ブロックの背面"
  },
  {
    id: "frame-thin-gold-technical",
    name: "細金テック枠",
    category: "frame",
    description: "上品な動画枠や立ち絵余白のガイドに使う、細い金色のテクニカル枠。",
    src: `${thumbnailMaterialFrameAssetPrefix}frame-thin-gold-technical.png`,
    initialSize: { width: 640, height: 396 },
    initialPosition: { x: 590, y: 122 },
    recommendedPlacement: "上品な動画枠や立ち絵余白のガイド"
  },
  {
    id: "frame-translucent-comment-panel",
    name: "透けコメントパネル",
    category: "frame",
    description: "コメント枠や短い案内文の背面に置きやすい、透け感のある横長パネル。",
    src: `${thumbnailMaterialFrameAssetPrefix}frame-translucent-comment-panel.png`,
    initialSize: { width: 610, height: 292 },
    initialPosition: { x: 116, y: 356 },
    recommendedPlacement: "コメント枠や短い案内文の背面"
  },
  {
    id: "frame-muted-schedule-panel",
    name: "低彩度予定パネル",
    category: "frame",
    description: "予定表エリアや情報枠の背面に使う、低彩度で薄い罫線入りのパネル。",
    src: `${thumbnailMaterialFrameAssetPrefix}frame-muted-schedule-panel.png`,
    initialSize: { width: 650, height: 404 },
    initialPosition: { x: 84, y: 126 },
    recommendedPlacement: "予定表エリアや低彩度の情報枠"
  },
  {
    id: "divider-cyan-thin-hud",
    name: "細シアンHUDライン",
    category: "divider",
    description: "見出し下へ薄く重ねる、細いシアンのHUDアクセントライン。",
    src: `${thumbnailMaterialDividerAssetPrefix}divider-cyan-thin-hud.png`,
    initialSize: { width: 620, height: 96 },
    initialPosition: { x: 92, y: 372 },
    recommendedPlacement: "見出し下の細いアクセントライン"
  },
  {
    id: "divider-soft-white-dotted",
    name: "白点線セパレーター",
    category: "divider",
    description: "情報ブロックの間へ入れやすい、淡い白の点線区切り。",
    src: `${thumbnailMaterialDividerAssetPrefix}divider-soft-white-dotted.png`,
    initialSize: { width: 560, height: 86 },
    initialPosition: { x: 116, y: 430 },
    recommendedPlacement: "情報ブロック間の点線区切り"
  },
  {
    id: "divider-muted-teal-l-corner-guide",
    name: "ティールL字ガイド",
    category: "divider",
    description: "予定表や情報枠の角へ足す、低彩度ティールのL字ガイド。",
    src: `${thumbnailMaterialDividerAssetPrefix}divider-muted-teal-l-corner-guide.png`,
    initialSize: { width: 360, height: 220 },
    initialPosition: { x: 710, y: 104 },
    recommendedPlacement: "予定表や情報枠のL字ガイド"
  },
  {
    id: "divider-pale-cyan-segmented-underline",
    name: "淡シアン分割下線",
    category: "divider",
    description: "見出しや短い説明に添える、淡いシアンの分割下線。",
    src: `${thumbnailMaterialDividerAssetPrefix}divider-pale-cyan-segmented-underline.png`,
    initialSize: { width: 590, height: 92 },
    initialPosition: { x: 104, y: 468 },
    recommendedPlacement: "見出しや短い説明の分割下線"
  },
  {
    id: "divider-navy-white-technical-rule",
    name: "紺白テクニカル罫線",
    category: "divider",
    description: "予定表エリアの補助罫線として使う、紺白の低主張テクニカル線。",
    src: `${thumbnailMaterialDividerAssetPrefix}divider-navy-white-technical-rule.png`,
    initialSize: { width: 610, height: 104 },
    initialPosition: { x: 92, y: 392 },
    recommendedPlacement: "予定表エリアの補助罫線"
  },
  {
    id: "effect-warm-gold-subtle-glint",
    name: "薄金グリント",
    category: "accent",
    description: "見出しやバッジの横に薄く足す、低主張の金色グリント。",
    src: `${thumbnailMaterialEffectAssetPrefix}effect-warm-gold-subtle-glint.png`,
    initialSize: { width: 260, height: 174 },
    initialPosition: { x: 808, y: 108 },
    recommendedPlacement: "見出しやバッジ横の小さな金色グリント"
  },
  {
    id: "effect-soft-white-sparkle-cluster",
    name: "白小粒スパークル",
    category: "accent",
    description: "CTAや重要情報の近くに置く、淡い白の小さな光粒。",
    src: `${thumbnailMaterialEffectAssetPrefix}effect-soft-white-sparkle-cluster.png`,
    initialSize: { width: 300, height: 190 },
    initialPosition: { x: 840, y: 396 },
    recommendedPlacement: "CTAや重要情報近くの淡い白スパークル"
  },
  {
    id: "effect-pale-cyan-diagonal-streak",
    name: "淡シアン斜光",
    category: "accent",
    description: "背景へ軽く重ねる、淡いシアンの斜めハイライト。",
    src: `${thumbnailMaterialEffectAssetPrefix}effect-pale-cyan-diagonal-streak.png`,
    initialSize: { width: 620, height: 180 },
    initialPosition: { x: 342, y: 178 },
    recommendedPlacement: "背景へ軽く重ねる淡シアンの斜光"
  },
  {
    id: "effect-blue-glow-wash",
    name: "青グロー光だまり",
    category: "accent",
    description: "素材同士の境界をなじませる、淡い青の低主張グロー。",
    src: `${thumbnailMaterialEffectAssetPrefix}effect-blue-glow-wash.png`,
    initialSize: { width: 560, height: 300 },
    initialPosition: { x: 584, y: 214 },
    recommendedPlacement: "素材同士の境界をなじませる淡い青の光だまり"
  },
  {
    id: "corner-rose-gold-asymmetric-shard",
    name: "ローズ金斜め破片",
    category: "corner",
    description: "見出し横や情報枠の角へ控えめに置く、ローズと金色の非対称アクセント。",
    src: `${thumbnailMaterialCornerAssetPrefix}corner-rose-gold-asymmetric-shard.png`,
    initialSize: { width: 230, height: 154 },
    initialPosition: { x: 88, y: 94 },
    recommendedPlacement: "見出し横や情報枠角の非対称アクセント"
  },
  {
    id: "corner-cyan-navy-tech-chevron",
    name: "紺シアン小シェブロン",
    category: "corner",
    description: "重要情報の横へ小さく添える、紺とシアンの方向づけシェブロン。",
    src: `${thumbnailMaterialCornerAssetPrefix}corner-cyan-navy-tech-chevron.png`,
    initialSize: { width: 210, height: 132 },
    initialPosition: { x: 812, y: 102 },
    recommendedPlacement: "重要情報横の小さな方向づけマーク"
  },
  {
    id: "corner-white-charcoal-diagonal-tab",
    name: "白チャコール斜めタブ",
    category: "corner",
    description: "画面端や余白へ足しやすい、白とチャコールの小さな斜めタブ。",
    src: `${thumbnailMaterialCornerAssetPrefix}corner-white-charcoal-diagonal-tab.png`,
    initialSize: { width: 240, height: 142 },
    initialPosition: { x: 862, y: 456 },
    recommendedPlacement: "画面端や余白へ足す斜めタブ"
  },
  {
    id: "corner-champagne-glint-bracket",
    name: "小金具グリント角",
    category: "corner",
    description: "他素材の角に一点だけ重ねて締まりを出す、小さなシャンパン金具。",
    src: `${thumbnailMaterialCornerAssetPrefix}corner-champagne-glint-bracket.png`,
    initialSize: { width: 190, height: 134 },
    initialPosition: { x: 940, y: 78 },
    recommendedPlacement: "他素材の角に重ねる小さな金具アクセント"
  },
  {
    id: "impact-arrow-cyan-black",
    name: "シアン矢印アクセント",
    category: "corner",
    description: "見出し横や注目箇所へ足す、シアンと黒の小型矢印アクセント。",
    src: `${thumbnailMaterialImpactAssetPrefix}impact-arrow-cyan-black.png`,
    initialSize: { width: 250, height: 150 },
    initialPosition: { x: 706, y: 108 },
    recommendedPlacement: "見出し横や注目箇所への矢印アクセント"
  },
  {
    id: "impact-burst-yellow-black",
    name: "黄黒衝撃マーク",
    category: "accent",
    description: "強調したい要素の背面や横へ置く、黄色と黒の抽象衝撃マーク。",
    src: `${thumbnailMaterialImpactAssetPrefix}impact-burst-yellow-black.png`,
    initialSize: { width: 250, height: 190 },
    initialPosition: { x: 780, y: 318 },
    recommendedPlacement: "強調したい要素の背面や横の衝撃マーク"
  },
  {
    id: "impact-speed-lines-white-cyan",
    name: "白シアンスピード線",
    category: "divider",
    description: "見出し下や画面端へ足す、白とシアンの斜めスピード線。",
    src: `${thumbnailMaterialImpactAssetPrefix}impact-speed-lines-white-cyan.png`,
    initialSize: { width: 540, height: 150 },
    initialPosition: { x: 84, y: 388 },
    recommendedPlacement: "見出し下や画面端へ足すスピード線"
  },
  {
    id: "impact-focus-lines-monochrome",
    name: "白黒集中線",
    category: "accent",
    description: "注目箇所の背面へ薄く置ける、白黒の抽象集中線。",
    src: `${thumbnailMaterialImpactAssetPrefix}impact-focus-lines-monochrome.png`,
    initialSize: { width: 420, height: 280 },
    initialPosition: { x: 680, y: 176 },
    recommendedPlacement: "注目箇所の背面へ薄く置く集中線"
  },
  {
    id: "impact-outline-pop-base-white-black",
    name: "白黒フチ強調土台",
    category: "date-badge",
    description: "短い日付やステータスを載せやすい、白黒フチ風の小型強調土台。",
    src: `${thumbnailMaterialImpactAssetPrefix}impact-outline-pop-base-white-black.png`,
    initialSize: { width: 340, height: 150 },
    initialPosition: { x: 116, y: 438 },
    recommendedPlacement: "短い日付やステータスを載せる白黒フチ風の小型土台"
  }
] satisfies ThumbnailMaterial[];

export const createThumbnailMaterialLayer = (materialId: string, canvas: ThumbnailCanvas = thumbnailCanvasSizes.hd): ThumbnailImageLayer | null => {
  const material = thumbnailMaterialLibrary.find((item) => item.id === materialId);
  if (!material) {
    return null;
  }

  const scaleX = canvas.width / thumbnailCanvasSizes.hd.width;
  const scaleY = canvas.height / thumbnailCanvasSizes.hd.height;
  return {
    id: createId("image"),
    name: `素材: ${material.name}`,
    type: "image",
    src: material.src,
    x: Math.round(material.initialPosition.x * scaleX),
    y: Math.round(material.initialPosition.y * scaleY),
    width: Math.round(material.initialSize.width * scaleX),
    height: Math.round(material.initialSize.height * scaleY),
    rotation: 0,
    opacity: 1,
    blur: 0,
    locked: false
  };
};

export const applyThumbnailStandeePlacementPreset = (
  draft: ThumbnailEditorDraft,
  presetId: string,
  layerId: string | null = draft.selectedLayerId
): ThumbnailEditorDraft | null => {
  const preset = thumbnailStandeePlacementPresets.find((item) => item.id === presetId);
  if (!preset || !layerId) {
    return null;
  }

  const target = draft.layers.find((layer) => layer.id === layerId);
  if (target?.type !== "image" || target.locked) {
    return null;
  }

  const scaleX = draft.canvas.width / thumbnailCanvasSizes.hd.width;
  const scaleY = draft.canvas.height / thumbnailCanvasSizes.hd.height;
  const layers = draft.layers.map((layer) =>
    layer.id === layerId && layer.type === "image"
      ? (() => {
          const { crop: _crop, ...imageLayer } = layer;
          return {
            ...imageLayer,
            x: Math.round(preset.frame.x * scaleX),
            y: Math.round(preset.frame.y * scaleY),
            width: Math.round(preset.frame.width * scaleX),
            height: Math.round(preset.frame.height * scaleY),
            rotation: 0,
            ...(preset.crop ? { crop: { ...preset.crop } } : {})
          };
        })()
      : layer
  );

  return {
    ...draft,
    layers,
    selectedLayerId: layerId,
    updatedAt: nowIso()
  };
};

export const createDraftFromPreset = (
  presetId: ThumbnailPresetId = "stream_announce",
  canvas: ThumbnailCanvas = thumbnailCanvasSizes.hd
): ThumbnailEditorDraft => {
  const preset = thumbnailPresets.find((item) => item.id === presetId) ?? thumbnailPresets[0];
  const scaleX = canvas.width / 1280;
  const scaleY = canvas.height / 720;
  const layers = preset.layers.map((layer) => ({
    ...layer,
    id: createId(layer.type),
    x: Math.round(layer.x * scaleX),
    y: Math.round(layer.y * scaleY),
    width: Math.round(layer.width * scaleX),
    height: Math.round(layer.height * scaleY),
    ...(layer.type === "text"
      ? {
          fontSize: Math.round(layer.fontSize * scaleY),
          strokeWidth: Math.round(layer.strokeWidth * scaleY),
          shadowBlur: Math.round(layer.shadowBlur * scaleY),
          shadowOffsetX: Math.round(layer.shadowOffsetX * scaleX),
          shadowOffsetY: Math.round(layer.shadowOffsetY * scaleY)
        }
      : {}),
    ...(layer.type === "shape"
      ? {
          strokeWidth: Math.round(layer.strokeWidth * scaleY),
          borderRadius: Math.round(layer.borderRadius * scaleY)
        }
      : {})
  })) as ThumbnailLayer[];

  return {
    version: 1,
    canvas: { width: canvas.width, height: canvas.height },
    presetId,
    layers,
    selectedLayerId: layers[layers.length - 1]?.id ?? null,
    updatedAt: nowIso()
  };
};

export const createDraftFromPresetVariant = (
  presetId: ThumbnailPresetId = "stream_announce",
  variantId: ThumbnailPresetVariantId = thumbnailPresetVariantRelations[presetId].defaultVariantId
): ThumbnailEditorDraft => {
  const canvas = getThumbnailPresetCanvasFromVariant(presetId, variantId) ?? thumbnailPresetVariants[thumbnailDefaultPresetVariantId].canvas;
  return createDraftFromPreset(presetId, canvas);
};

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const numberValue = (value: unknown, fallback: number) => (isFiniteNumber(value) ? value : fallback);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const normalizeRotation = (value: number) => {
  let normalized = value % 360;
  if (normalized > 180) {
    normalized -= 360;
  }
  if (normalized < -180) {
    normalized += 360;
  }
  return normalized;
};
const normalizeCanvas = (canvas: Partial<ThumbnailCanvas> | undefined): ThumbnailCanvas => {
  const supportedCanvas = [
    thumbnailCanvasSizes.hd,
    thumbnailCanvasSizes["full-hd"],
    ...Object.values(thumbnailPresetVariants).map((variant) => variant.canvas)
  ].find((item) => item.width === canvas?.width && item.height === canvas?.height);
  if (supportedCanvas) {
    return { width: supportedCanvas.width, height: supportedCanvas.height };
  }
  return { width: 1280, height: 720 };
};
const isSafeImageSource = (src: string) =>
  src.startsWith("data:image/png;") ||
  src.startsWith("data:image/jpeg;") ||
  src.startsWith("data:image/svg+xml;") ||
  (src.startsWith(thumbnailPresetAssetPrefix) && /\.(png|jpe?g|webp|svg)$/i.test(src));
const safeText = (value: unknown, fallback: string, maxLength: number) =>
  typeof value === "string" ? value.slice(0, maxLength) : fallback;
const thumbnailShapeTypes: ThumbnailShapeType[] = ["rect", "circle", "line", "burst", "frame", "polygon"];
const normalizeShapeType = (value: unknown): ThumbnailShapeType =>
  typeof value === "string" && thumbnailShapeTypes.includes(value as ThumbnailShapeType) ? (value as ThumbnailShapeType) : "rect";

const normalizeImageCrop = (value: unknown): ThumbnailImageCrop | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const crop = value as Partial<ThumbnailImageCrop>;
  const x = clamp(numberValue(crop.x, 0), 0, 0.95);
  const y = clamp(numberValue(crop.y, 0), 0, 0.95);
  const width = clamp(numberValue(crop.width, 1), 0.05, 1 - x);
  const height = clamp(numberValue(crop.height, 1), 0.05, 1 - y);

  if (x === 0 && y === 0 && width === 1 && height === 1) {
    return null;
  }

  return { x, y, width, height };
};

export const normalizeThumbnailDraft = (value: unknown): ThumbnailEditorDraft | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const draft = value as Partial<ThumbnailEditorDraft>;
  if (draft.version !== 1 || !draft.canvas || !Array.isArray(draft.layers)) {
    return null;
  }

  const canvas = normalizeCanvas(draft.canvas);
  const presetId: ThumbnailPresetId = thumbnailPresets.some((preset) => preset.id === draft.presetId)
    ? (draft.presetId as ThumbnailPresetId)
    : "stream_announce";
  const normalizedLayers = draft.layers
    .map((layer) => normalizeLayer(layer, canvas))
    .filter((layer): layer is ThumbnailLayer => layer !== null);

  if (normalizedLayers.length === 0) {
    return null;
  }

  const selectedLayerId = normalizedLayers.some((layer) => layer.id === draft.selectedLayerId)
    ? draft.selectedLayerId ?? null
    : normalizedLayers[normalizedLayers.length - 1]?.id ?? null;

  return {
    version: 1,
    canvas,
    presetId,
    layers: normalizedLayers,
    selectedLayerId,
    updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : nowIso()
  };
};

const normalizeLayer = (layer: unknown, canvas: ThumbnailCanvas): ThumbnailLayer | null => {
  if (!layer || typeof layer !== "object") {
    return null;
  }
  const item = layer as Partial<ThumbnailLayer>;
  if (item.type !== "image" && item.type !== "text" && item.type !== "shape") {
    return null;
  }

  const base = {
    id: typeof item.id === "string" ? item.id : createId(item.type),
    name: safeText(item.name, item.type, 40),
    type: item.type,
    x: clamp(numberValue(item.x, 0), -canvas.width, canvas.width * 2),
    y: clamp(numberValue(item.y, 0), -canvas.height, canvas.height * 2),
    width: clamp(numberValue(item.width, 160), 16, canvas.width * 2),
    height: clamp(numberValue(item.height, 90), 16, canvas.height * 2),
    rotation: normalizeRotation(numberValue(item.rotation, 0)),
    opacity: clamp(numberValue(item.opacity, 1), 0, 1),
    blur: clamp(numberValue(item.blur, 0), 0, 24),
    locked: Boolean(item.locked),
    hidden: Boolean(item.hidden)
  };

  if (item.type === "image") {
    const image = item as Partial<ThumbnailImageLayer>;
    if (typeof image.src !== "string" || !isSafeImageSource(image.src)) {
      return null;
    }

    const crop = normalizeImageCrop(image.crop);
    const materialRef = normalizeThumbnailUserMaterialRef(image.materialRef);
    const imageLayer = crop ? { ...base, type: "image" as const, src: image.src, crop } : { ...base, type: "image" as const, src: image.src };
    return materialRef ? { ...imageLayer, materialRef } : imageLayer;
  }

  if (item.type === "shape") {
    const shape = item as Partial<ThumbnailShapeLayer>;
    return {
      ...base,
      type: "shape",
      shapeType: normalizeShapeType(shape.shapeType),
      fillColor: typeof shape.fillColor === "string" ? shape.fillColor : "#1ed7c6",
      strokeColor: typeof shape.strokeColor === "string" ? shape.strokeColor : "#ffffff",
      strokeWidth: clamp(numberValue(shape.strokeWidth, 0), 0, 48),
      borderRadius: clamp(numberValue(shape.borderRadius, 0), 0, 120)
    };
  }

  const text = item as Partial<ThumbnailTextLayer>;
  return {
    ...base,
    type: "text",
    text: safeText(text.text, "テキスト", 150),
    fontFamily: normalizeThumbnailFontFamily(text.fontFamily),
    fontSize: clamp(numberValue(text.fontSize, 64), 12, 240),
    lineHeight: clamp(numberValue(text.lineHeight, 1.1), 0.8, 2),
    color: typeof text.color === "string" ? text.color : "#ffffff",
    align: text.align === "center" || text.align === "right" ? text.align : "left",
    bold: text.bold ?? true,
    italic: Boolean(text.italic),
    strokeColor: typeof text.strokeColor === "string" ? text.strokeColor : "#000000",
    strokeWidth: clamp(numberValue(text.strokeWidth, 0), 0, 48),
    shadowColor: typeof text.shadowColor === "string" ? text.shadowColor : "#000000",
    shadowBlur: clamp(numberValue(text.shadowBlur, 0), 0, 64),
    shadowOffsetX: clamp(numberValue(text.shadowOffsetX, 0), -80, 80),
    shadowOffsetY: clamp(numberValue(text.shadowOffsetY, 0), -80, 80)
  };
};

const imageCache = new Map<string, HTMLImageElement>();

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const cached = imageCache.get(src);
    if (cached?.complete) {
      resolve(cached);
      return;
    }

    const image = new Image();
    image.onload = () => {
      imageCache.set(src, image);
      resolve(image);
    };
    image.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    image.src = src;
  });

export const getThumbnailImageCropSourceRect = (
  layer: ThumbnailImageLayer,
  image: { naturalWidth?: number; naturalHeight?: number; width: number; height: number }
) => {
  if (!layer.crop) {
    return null;
  }

  const sourceWidth = image.naturalWidth && image.naturalWidth > 0 ? image.naturalWidth : image.width;
  const sourceHeight = image.naturalHeight && image.naturalHeight > 0 ? image.naturalHeight : image.height;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return null;
  }

  const cropX = layer.crop.x * sourceWidth;
  const cropY = layer.crop.y * sourceHeight;
  const cropWidth = layer.crop.width * sourceWidth;
  const cropHeight = layer.crop.height * sourceHeight;
  const layerAspect = layer.width / layer.height;
  const cropAspect = cropWidth / cropHeight;

  if (cropAspect > layerAspect) {
    const fittedWidth = cropHeight * layerAspect;
    return {
      x: cropX + (cropWidth - fittedWidth) / 2,
      y: cropY,
      width: fittedWidth,
      height: cropHeight
    };
  }

  const fittedHeight = cropWidth / layerAspect;
  return {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: fittedHeight
  };
};

export const drawThumbnail = async (
  canvas: HTMLCanvasElement,
  draft: Pick<ThumbnailEditorDraft, "canvas" | "layers">,
  options: { selectedLayerId?: string | null; includeSelection?: boolean; forceJpegBackground?: boolean } = {}
) => {
  canvas.width = draft.canvas.width;
  canvas.height = draft.canvas.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = options.forceJpegBackground ? "#081117" : "#0b1117";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (const layer of draft.layers) {
    if (layer.hidden) {
      continue;
    }
    await drawLayer(context, layer);
  }

  if (options.includeSelection && options.selectedLayerId) {
    const selected = draft.layers.find((layer) => layer.id === options.selectedLayerId && !layer.hidden);
    if (selected) {
      drawSelection(context, selected);
    }
  }
};

const drawLayer = async (context: CanvasRenderingContext2D, layer: ThumbnailLayer) => {
  context.save();
  context.globalAlpha = layer.opacity;
  context.filter = layer.blur > 0 ? `blur(${layer.blur}px)` : "none";
  context.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
  context.rotate((layer.rotation * Math.PI) / 180);
  context.translate(-layer.width / 2, -layer.height / 2);

  if (layer.type === "image") {
    const image = await loadImage(layer.src);
    const crop = getThumbnailImageCropSourceRect(layer, image);
    if (crop) {
      context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, layer.width, layer.height);
    } else {
      context.drawImage(image, 0, 0, layer.width, layer.height);
    }
  } else if (layer.type === "shape") {
    drawShape(context, layer);
  } else {
    drawText(context, layer);
  }

  context.restore();
};

const drawShape = (context: CanvasRenderingContext2D, layer: ThumbnailShapeLayer) => {
  context.beginPath();
  if (layer.shapeType === "circle") {
    context.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
  } else if (layer.shapeType === "line") {
    context.moveTo(0, layer.height / 2);
    context.lineTo(layer.width, layer.height / 2);
  } else if (layer.shapeType === "burst") {
    burstPath(context, layer.width, layer.height);
  } else if (layer.shapeType === "polygon") {
    polygonPath(context, layer.width, layer.height);
  } else {
    roundedRect(context, 0, 0, layer.width, layer.height, layer.borderRadius);
  }
  if (layer.shapeType !== "line") {
    context.fillStyle = layer.fillColor;
    context.fill();
  }
  if (layer.strokeWidth > 0) {
    context.lineWidth = layer.strokeWidth;
    context.strokeStyle = layer.strokeColor;
    context.lineCap = layer.shapeType === "line" ? "round" : "butt";
    context.lineJoin = layer.shapeType === "burst" || layer.shapeType === "polygon" ? "round" : "miter";
    context.stroke();
    if (layer.shapeType === "frame" && layer.strokeWidth >= 4) {
      context.beginPath();
      const inset = layer.strokeWidth * 1.7;
      roundedRect(
        context,
        inset,
        inset,
        Math.max(1, layer.width - inset * 2),
        Math.max(1, layer.height - inset * 2),
        Math.max(0, layer.borderRadius - inset)
      );
      context.globalAlpha *= 0.68;
      context.lineWidth = Math.max(1, Math.round(layer.strokeWidth / 2));
      context.stroke();
    }
  }
};

const drawText = (context: CanvasRenderingContext2D, layer: ThumbnailTextLayer) => {
  const lines = layer.text.split("\n").slice(0, 5);
  const linePx = layer.fontSize * layer.lineHeight;
  context.font = getThumbnailCanvasFont(layer);
  context.textBaseline = "top";
  context.textAlign = layer.align;
  context.shadowColor = layer.shadowColor;
  context.shadowBlur = layer.shadowBlur;
  context.shadowOffsetX = layer.shadowOffsetX;
  context.shadowOffsetY = layer.shadowOffsetY;

  const x = layer.align === "center" ? layer.width / 2 : layer.align === "right" ? layer.width : 0;
  lines.forEach((line, index) => {
    const y = index * linePx;
    if (layer.strokeWidth > 0) {
      context.lineJoin = "round";
      context.miterLimit = 2;
      context.lineWidth = layer.strokeWidth;
      context.strokeStyle = layer.strokeColor;
      context.strokeText(line, x, y);
    }
    context.fillStyle = layer.color;
    context.fillText(line, x, y);
  });
};

const drawSelection = (context: CanvasRenderingContext2D, layer: ThumbnailLayer) => {
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.height / 2;
  const rad = (layer.rotation * Math.PI) / 180;
  const rotateHandleOffset = Math.max(36, Math.round(context.canvas.width / 24));
  const rotateHandleRadius = Math.max(10, Math.round(context.canvas.width / 92));

  context.save();
  context.strokeStyle = "#1ed7c6";
  context.lineWidth = Math.max(3, Math.round(context.canvas.width / 480));
  context.translate(centerX, centerY);
  context.rotate(rad);
  context.translate(-layer.width / 2, -layer.height / 2);
  context.setLineDash([12, 8]);
  context.strokeRect(0, 0, layer.width, layer.height);
  context.setLineDash([]);
  context.fillStyle = "#ffffff";
  const handleSize = Math.max(12, Math.round(context.canvas.width / 80));
  [
    [0, 0],
    [layer.width, 0],
    [0, layer.height],
    [layer.width, layer.height]
  ].forEach(([x, y]) => context.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize));
  context.beginPath();
  context.moveTo(layer.width / 2, 0);
  context.lineTo(layer.width / 2, -rotateHandleOffset);
  context.stroke();
  context.beginPath();
  context.arc(layer.width / 2, -rotateHandleOffset, rotateHandleRadius, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

const roundedRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
};

const polygonPath = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const notch = Math.min(width * 0.08, height * 0.45);
  context.moveTo(notch, 0);
  context.lineTo(width, 0);
  context.lineTo(width - notch, height);
  context.lineTo(0, height);
  context.closePath();
};

const burstPath = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const points = 18;
  const outerX = width / 2;
  const outerY = height / 2;
  const innerX = width * 0.36;
  const innerY = height * 0.34;

  for (let index = 0; index < points; index += 1) {
    const angle = -Math.PI / 2 + (index / points) * Math.PI * 2;
    const isOuter = index % 2 === 0;
    const radiusX = isOuter ? outerX : innerX;
    const radiusY = isOuter ? outerY : innerY;
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
};

const rotatePoint = (point: { x: number; y: number }, radians: number) => {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
};

export const getLayerCenter = (layer: ThumbnailLayer) => ({
  x: layer.x + layer.width / 2,
  y: layer.y + layer.height / 2
});

export const pointToLayerLocal = (layer: ThumbnailLayer, point: { x: number; y: number }) => {
  const center = getLayerCenter(layer);
  const rotated = rotatePoint({ x: point.x - center.x, y: point.y - center.y }, (-layer.rotation * Math.PI) / 180);
  return {
    x: rotated.x + layer.width / 2,
    y: rotated.y + layer.height / 2
  };
};

export const layerContainsPoint = (layer: ThumbnailLayer, point: { x: number; y: number }) => {
  if (layer.hidden) {
    return false;
  }
  const local = pointToLayerLocal(layer, point);
  return local.x >= 0 && local.x <= layer.width && local.y >= 0 && local.y <= layer.height;
};

export const getLayerHandlePoints = (layer: ThumbnailLayer, rotateHandleOffset: number) => {
  const center = getLayerCenter(layer);
  const rad = (layer.rotation * Math.PI) / 180;
  const toGlobal = (localX: number, localY: number) => {
    const rotated = rotatePoint({ x: localX - layer.width / 2, y: localY - layer.height / 2 }, rad);
    return { x: center.x + rotated.x, y: center.y + rotated.y };
  };

  return {
    nw: toGlobal(0, 0),
    ne: toGlobal(layer.width, 0),
    sw: toGlobal(0, layer.height),
    se: toGlobal(layer.width, layer.height),
    rotate: toGlobal(layer.width / 2, -rotateHandleOffset)
  };
};

export const hitTestLayerHandle = (
  layer: ThumbnailLayer,
  point: { x: number; y: number },
  options: { handleSize: number; rotateHandleOffset: number; rotateHandleRadius: number }
): ThumbnailHandleKind | null => {
  const handles = getLayerHandlePoints(layer, options.rotateHandleOffset);
  const half = options.handleSize / 2;
  const inSquare = (target: { x: number; y: number }) =>
    Math.abs(point.x - target.x) <= half && Math.abs(point.y - target.y) <= half;
  const inCircle = (target: { x: number; y: number }) => Math.hypot(point.x - target.x, point.y - target.y) <= options.rotateHandleRadius;

  if (inCircle(handles.rotate)) {
    return "rotate";
  }
  if (inSquare(handles.nw)) {
    return "nw";
  }
  if (inSquare(handles.ne)) {
    return "ne";
  }
  if (inSquare(handles.sw)) {
    return "sw";
  }
  if (inSquare(handles.se)) {
    return "se";
  }
  return null;
};
