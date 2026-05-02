export type SnsSplitMode = "concatenate" | "replace";
export type SnsSplitAspectRatioId = "16:27";
export type SnsSplitExportFormat = "png" | "jpeg";
export type SnsSplitSlotId = `slot-${number}`;
export type SnsSplitPostIndex = 1 | 2 | 3 | 4;

export type SnsSplitImageSource = {
  id: "base" | SnsSplitSlotId;
  name: string;
  src: string | null;
};

export type SnsSplitConfig = {
  splitX: number;
  splitY: number;
  seamFix: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  postAdjustments: Record<SnsSplitPostIndex, SnsSplitPostAdjustment>;
  showSeam: boolean;
  showGrid: boolean;
  seamColor: string;
  seamWidth: number;
};

export type SnsSplitPostAdjustment = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type SnsSplitExportSettings = {
  format: SnsSplitExportFormat;
  quality: number;
  filePattern: string;
};

export type SnsSplitDraft = {
  version: 1;
  mode: SnsSplitMode;
  aspectRatio: SnsSplitAspectRatioId;
  images: SnsSplitImageSource[];
  config: SnsSplitConfig;
  exportSettings: SnsSplitExportSettings;
  updatedAt: string;
};

export type SnsSplitTile = {
  index: SnsSplitPostIndex;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export const snsSplitDraftStorageKey = "v-streamer-tools:sns-split-image-maker:draft:v1";
export const snsSplitBaseCanvas = { width: 1280, height: 720 };
export const snsSplitPostCanvas = { width: 1280, height: 2160 };
export const snsSplitCanvas = snsSplitBaseCanvas;
export const snsSplitSlotCountByMode: Record<SnsSplitMode, number> = {
  concatenate: 8,
  replace: 4
};

export const defaultSnsSplitPostAdjustment: SnsSplitPostAdjustment = {
  offsetX: 0,
  offsetY: 0,
  scale: 100
};

export const defaultSnsSplitConfig: SnsSplitConfig = {
  splitX: 50,
  splitY: 50,
  seamFix: 0,
  offsetX: 0,
  offsetY: 0,
  scale: 100,
  postAdjustments: {
    1: { ...defaultSnsSplitPostAdjustment },
    2: { ...defaultSnsSplitPostAdjustment },
    3: { ...defaultSnsSplitPostAdjustment },
    4: { ...defaultSnsSplitPostAdjustment }
  },
  showSeam: true,
  showGrid: false,
  seamColor: "#00d1b2",
  seamWidth: 8
};

export const defaultSnsSplitExportSettings: SnsSplitExportSettings = {
  format: "png",
  quality: 0.9,
  filePattern: "split_{n}"
};

const nowIso = () => new Date().toISOString();
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object";
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const numberValue = (value: unknown, fallback: number) => (isFiniteNumber(value) ? value : fallback);
const booleanValue = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const safeString = (value: unknown, fallback: string, maxLength: number) =>
  typeof value === "string" ? value.slice(0, maxLength) : fallback;
const isSafeImageSource = (src: string) => src.startsWith("data:image/png;") || src.startsWith("data:image/jpeg;");

const clonePostAdjustments = (): Record<SnsSplitPostIndex, SnsSplitPostAdjustment> => ({
  1: { ...defaultSnsSplitPostAdjustment },
  2: { ...defaultSnsSplitPostAdjustment },
  3: { ...defaultSnsSplitPostAdjustment },
  4: { ...defaultSnsSplitPostAdjustment }
});

const normalizePostAdjustment = (value: unknown): SnsSplitPostAdjustment => {
  const raw = isObject(value) ? value : {};
  return {
    offsetX: clamp(numberValue(raw.offsetX, defaultSnsSplitPostAdjustment.offsetX), -480, 480),
    offsetY: clamp(numberValue(raw.offsetY, defaultSnsSplitPostAdjustment.offsetY), -480, 480),
    scale: clamp(numberValue(raw.scale, defaultSnsSplitPostAdjustment.scale), 50, 180)
  };
};

export const getSnsSplitPostAdjustment = (
  config: Pick<SnsSplitConfig, "postAdjustments">,
  postIndex: SnsSplitPostIndex
): SnsSplitPostAdjustment => config.postAdjustments[postIndex] ?? defaultSnsSplitPostAdjustment;

export const createSnsSplitImages = (mode: SnsSplitMode = "concatenate"): SnsSplitImageSource[] => [
  { id: "base", name: "分割用メイン画像", src: null },
  ...Array.from({ length: snsSplitSlotCountByMode[mode] }, (_, index) => ({
    id: `slot-${index + 1}` as SnsSplitSlotId,
    name: `追加画像 ${index + 1}`,
    src: null
  }))
];

export const createSnsSplitDraft = (mode: SnsSplitMode = "concatenate"): SnsSplitDraft => ({
  version: 1,
  mode,
  aspectRatio: "16:27",
  images: createSnsSplitImages(mode),
  config: { ...defaultSnsSplitConfig, postAdjustments: clonePostAdjustments() },
  exportSettings: { ...defaultSnsSplitExportSettings },
  updatedAt: nowIso()
});

export const getSnsSplitTiles = (config: SnsSplitConfig): SnsSplitTile[] => {
  const seam = clamp(config.seamFix, -80, 80);
  const splitX = clamp(Math.round((snsSplitBaseCanvas.width * clamp(config.splitX, 10, 90)) / 100 + seam), 80, snsSplitBaseCanvas.width - 80);
  const splitY = clamp(Math.round((snsSplitBaseCanvas.height * clamp(config.splitY, 10, 90)) / 100 + seam), 60, snsSplitBaseCanvas.height - 60);

  return [
    { index: 1, sx: 0, sy: 0, sw: splitX, sh: splitY },
    { index: 2, sx: splitX, sy: 0, sw: snsSplitBaseCanvas.width - splitX, sh: splitY },
    { index: 3, sx: 0, sy: splitY, sw: splitX, sh: snsSplitBaseCanvas.height - splitY },
    { index: 4, sx: splitX, sy: splitY, sw: snsSplitBaseCanvas.width - splitX, sh: snsSplitBaseCanvas.height - splitY }
  ];
};

export const getConcatenateSlotIdsForPost = (postIndex: SnsSplitTile["index"]) => ({
  top: `slot-${(postIndex - 1) * 2 + 1}` as SnsSplitSlotId,
  bottom: `slot-${(postIndex - 1) * 2 + 2}` as SnsSplitSlotId
});

export const getSnsSplitSlotLabel = (mode: SnsSplitMode, index: number) => {
  if (mode === "replace") {
    return `投稿${index} フレーム`;
  }
  const postIndex = Math.floor((index - 1) / 2) + 1;
  return `投稿${postIndex} ${index % 2 === 1 ? "上部" : "下部"}`;
};

export const getRequiredSlotCount = (mode: SnsSplitMode) => snsSplitSlotCountByMode[mode];

export const normalizeSnsSplitDraft = (value: unknown): SnsSplitDraft | null => {
  if (!isObject(value) || value.version !== 1) {
    return null;
  }

  const mode: SnsSplitMode = value.mode === "replace" ? "replace" : "concatenate";
  const requiredSlots = getRequiredSlotCount(mode);
  const rawImages = Array.isArray(value.images) ? value.images : [];
  const imageMap = new Map<string, SnsSplitImageSource>();
  rawImages.forEach((raw) => {
    if (!isObject(raw) || typeof raw.id !== "string") {
      return;
    }
    const src = typeof raw.src === "string" && isSafeImageSource(raw.src) ? raw.src : null;
    imageMap.set(raw.id, {
      id: raw.id as SnsSplitImageSource["id"],
      name: safeString(raw.name, raw.id === "base" ? "分割用メイン画像" : raw.id, 40),
      src
    });
  });

  const fallback = createSnsSplitDraft(mode);
  const images = fallback.images.map((image) => {
    const saved = imageMap.get(image.id);
    return saved ? { ...image, src: saved.src } : image;
  });
  const rawConfig = isObject(value.config) ? value.config : {};
  const rawExport = isObject(value.exportSettings) ? value.exportSettings : {};

  return {
    version: 1,
    mode,
    aspectRatio: "16:27",
    images: images.slice(0, requiredSlots + 1),
    config: {
      splitX: clamp(numberValue(rawConfig.splitX, defaultSnsSplitConfig.splitX), 10, 90),
      splitY: clamp(numberValue(rawConfig.splitY, defaultSnsSplitConfig.splitY), 10, 90),
      seamFix: clamp(numberValue(rawConfig.seamFix, defaultSnsSplitConfig.seamFix), -80, 80),
      offsetX: clamp(numberValue(rawConfig.offsetX, defaultSnsSplitConfig.offsetX), -240, 240),
      offsetY: clamp(numberValue(rawConfig.offsetY, defaultSnsSplitConfig.offsetY), -240, 240),
      scale: clamp(numberValue(rawConfig.scale, defaultSnsSplitConfig.scale), 50, 180),
      postAdjustments: {
        1: normalizePostAdjustment(isObject(rawConfig.postAdjustments) ? rawConfig.postAdjustments[1] : null),
        2: normalizePostAdjustment(isObject(rawConfig.postAdjustments) ? rawConfig.postAdjustments[2] : null),
        3: normalizePostAdjustment(isObject(rawConfig.postAdjustments) ? rawConfig.postAdjustments[3] : null),
        4: normalizePostAdjustment(isObject(rawConfig.postAdjustments) ? rawConfig.postAdjustments[4] : null)
      },
      showSeam: booleanValue(rawConfig.showSeam, defaultSnsSplitConfig.showSeam),
      showGrid: booleanValue(rawConfig.showGrid, defaultSnsSplitConfig.showGrid),
      seamColor: safeString(rawConfig.seamColor, defaultSnsSplitConfig.seamColor, 24),
      seamWidth: clamp(numberValue(rawConfig.seamWidth, defaultSnsSplitConfig.seamWidth), 0, 32)
    },
    exportSettings: {
      format: rawExport.format === "jpeg" ? "jpeg" : "png",
      quality: clamp(numberValue(rawExport.quality, defaultSnsSplitExportSettings.quality), 0.5, 1),
      filePattern: safeString(rawExport.filePattern, defaultSnsSplitExportSettings.filePattern, 48)
    },
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : nowIso()
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

const drawPlaceholder = (context: CanvasRenderingContext2D, label: string) => {
  context.fillStyle = "rgba(15, 25, 33, 0.78)";
  context.fillRect(0, 0, snsSplitCanvas.width, snsSplitCanvas.height);
  context.strokeStyle = "rgba(31, 178, 169, 0.44)";
  context.setLineDash([12, 8]);
  context.lineWidth = 3;
  context.strokeRect(24, 24, snsSplitCanvas.width - 48, snsSplitCanvas.height - 48);
  context.setLineDash([]);
  context.fillStyle = "rgba(232, 240, 243, 0.82)";
  context.font = "700 34px sans-serif";
  context.textAlign = "center";
  context.fillText(label, snsSplitCanvas.width / 2, snsSplitCanvas.height / 2);
};

const drawBaseComposite = async (
  canvas: HTMLCanvasElement,
  draft: Pick<SnsSplitDraft, "images" | "config">,
  options: { forceJpegBackground?: boolean } = {}
) => {
  canvas.width = snsSplitBaseCanvas.width;
  canvas.height = snsSplitBaseCanvas.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (options.forceJpegBackground) {
    context.fillStyle = "#081117";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const base = draft.images.find((image) => image.id === "base");
  if (base?.src) {
    const image = await loadImage(base.src);
    const scale = draft.config.scale / 100;
    const drawWidth = canvas.width * scale;
    const drawHeight = canvas.height * scale;
    const dx = (canvas.width - drawWidth) / 2 + draft.config.offsetX;
    const dy = (canvas.height - drawHeight) / 2 + draft.config.offsetY;
    context.drawImage(image, dx, dy, drawWidth, drawHeight);
  } else {
    drawPlaceholder(context, "ベース画像を選択してください");
  }
};

export const drawSnsSplitComposite = async (
  canvas: HTMLCanvasElement,
  draft: Pick<SnsSplitDraft, "images" | "config" | "mode">,
  options: { includeGuides?: boolean; forceJpegBackground?: boolean } = {}
) => {
  const tiles = getSnsSplitTiles(draft.config);
  canvas.width = snsSplitPostCanvas.width * 2;
  canvas.height = snsSplitPostCanvas.height * 2;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = options.forceJpegBackground ? "#081117" : "#0f1921";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const scratch = document.createElement("canvas");
  await drawBaseComposite(scratch, draft, { forceJpegBackground: options.forceJpegBackground });

  for (const tile of tiles) {
    const postCanvas = document.createElement("canvas");
    await drawSnsSplitPostImage(postCanvas, draft, tile, {
      baseCanvas: scratch,
      includeGuides: options.includeGuides,
      forceJpegBackground: options.forceJpegBackground
    });
    const dx = (tile.index === 1 || tile.index === 3) ? 0 : snsSplitPostCanvas.width;
    const dy = tile.index <= 2 ? 0 : snsSplitPostCanvas.height;
    context.drawImage(postCanvas, dx, dy);
  }

  if (options.includeGuides) {
    drawCompositeGuides(context);
  }
};

const drawImageCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  const sw = sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
  const sh = sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;
  context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
};

export const drawSnsSplitTile = async (
  canvas: HTMLCanvasElement,
  draft: Pick<SnsSplitDraft, "images" | "config" | "mode">,
  tile: SnsSplitTile,
  options: { includeGuides?: boolean; forceJpegBackground?: boolean } = {}
) => {
  const scratch = document.createElement("canvas");
  await drawBaseComposite(scratch, draft, {
    forceJpegBackground: options.forceJpegBackground
  });
  await drawSnsSplitPostImage(canvas, draft, tile, {
    baseCanvas: scratch,
    includeGuides: options.includeGuides,
    forceJpegBackground: options.forceJpegBackground
  });
};

export const drawSnsSplitMainTile = async (
  canvas: HTMLCanvasElement,
  draft: Pick<SnsSplitDraft, "images" | "config">,
  tile: SnsSplitTile,
  options: { includeGuides?: boolean; forceJpegBackground?: boolean } = {}
) => {
  canvas.width = snsSplitPostCanvas.width;
  canvas.height = snsSplitPostCanvas.width * 9 / 16;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = options.forceJpegBackground ? "#081117" : "#0f1921";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const scratch = document.createElement("canvas");
  await drawBaseComposite(scratch, draft, {
    forceJpegBackground: options.forceJpegBackground
  });

  const postAdjustment = getSnsSplitPostAdjustment(draft.config, tile.index);
  const mainScale = postAdjustment.scale / 100;
  const mainWidth = canvas.width * mainScale;
  const mainHeight = canvas.height * mainScale;
  const mainX = (canvas.width - mainWidth) / 2 + postAdjustment.offsetX;
  const mainY = (canvas.height - mainHeight) / 2 + postAdjustment.offsetY;

  context.save();
  context.beginPath();
  context.rect(0, 0, canvas.width, canvas.height);
  context.clip();
  context.drawImage(scratch, tile.sx, tile.sy, tile.sw, tile.sh, mainX, mainY, mainWidth, mainHeight);
  context.restore();

  if (options.includeGuides) {
    context.save();
    context.strokeStyle = draft.config.seamColor;
    context.lineWidth = 2;
    context.globalAlpha = 0.72;
    context.setLineDash([18, 14]);
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.moveTo(0, canvas.height / 2);
    context.lineTo(canvas.width, canvas.height / 2);
    context.stroke();
    context.restore();
  }
};

const drawSnsSplitPostImage = async (
  canvas: HTMLCanvasElement,
  draft: Pick<SnsSplitDraft, "images" | "config" | "mode">,
  tile: SnsSplitTile,
  options: { baseCanvas: HTMLCanvasElement; includeGuides?: boolean; forceJpegBackground?: boolean }
) => {
  canvas.width = snsSplitPostCanvas.width;
  canvas.height = snsSplitPostCanvas.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  const bandHeight = snsSplitPostCanvas.height / 3;
  context.fillStyle = options.forceJpegBackground ? "#081117" : "#0f1921";
  context.fillRect(0, 0, snsSplitPostCanvas.width, snsSplitPostCanvas.height);

  if (draft.mode === "replace") {
    const frame = draft.images.find((image) => image.id === `slot-${tile.index}`);
    if (frame?.src) {
      const image = await loadImage(frame.src);
      drawImageCover(context, image, 0, 0, snsSplitPostCanvas.width, snsSplitPostCanvas.height);
    }
  } else {
    const slots = getConcatenateSlotIdsForPost(tile.index);
    const top = draft.images.find((image) => image.id === slots.top);
    const bottom = draft.images.find((image) => image.id === slots.bottom);
    if (top?.src) {
      const image = await loadImage(top.src);
      drawImageCover(context, image, 0, 0, snsSplitPostCanvas.width, bandHeight);
    }
    if (bottom?.src) {
      const image = await loadImage(bottom.src);
      drawImageCover(context, image, 0, bandHeight * 2, snsSplitPostCanvas.width, bandHeight);
    }
  }

  const postAdjustment = getSnsSplitPostAdjustment(draft.config, tile.index);
  const mainScale = postAdjustment.scale / 100;
  const mainWidth = snsSplitPostCanvas.width * mainScale;
  const mainHeight = bandHeight * mainScale;
  const mainX = (snsSplitPostCanvas.width - mainWidth) / 2 + postAdjustment.offsetX;
  const mainY = bandHeight + (bandHeight - mainHeight) / 2 + postAdjustment.offsetY;

  context.save();
  context.beginPath();
  context.rect(0, bandHeight, snsSplitPostCanvas.width, bandHeight);
  context.clip();
  context.drawImage(options.baseCanvas, tile.sx, tile.sy, tile.sw, tile.sh, mainX, mainY, mainWidth, mainHeight);
  context.restore();

  if (options.includeGuides) {
    context.save();
    context.strokeStyle = draft.config.seamColor;
    context.lineWidth = Math.max(2, draft.config.seamWidth / 2);
    context.globalAlpha = 0.86;
    context.beginPath();
    context.moveTo(0, bandHeight);
    context.lineTo(snsSplitPostCanvas.width, bandHeight);
    context.moveTo(0, bandHeight * 2);
    context.lineTo(snsSplitPostCanvas.width, bandHeight * 2);
    context.stroke();
    context.restore();

    context.save();
    context.strokeStyle = draft.config.seamColor;
    context.lineWidth = 2;
    context.globalAlpha = 0.72;
    context.setLineDash([18, 14]);
    context.beginPath();
    context.moveTo(snsSplitPostCanvas.width / 2, bandHeight);
    context.lineTo(snsSplitPostCanvas.width / 2, bandHeight * 2);
    context.moveTo(0, bandHeight + bandHeight / 2);
    context.lineTo(snsSplitPostCanvas.width, bandHeight + bandHeight / 2);
    context.stroke();
    context.restore();
  }
};

export const drawGuides = (context: CanvasRenderingContext2D, config: SnsSplitConfig) => {
  const tiles = getSnsSplitTiles(config);
  const splitX = tiles[1].sx;
  const splitY = tiles[2].sy;

  if (config.showGrid) {
    context.save();
    context.strokeStyle = "rgba(148, 163, 184, 0.28)";
    context.lineWidth = 1;
    for (let x = snsSplitCanvas.width / 4; x < snsSplitCanvas.width; x += snsSplitCanvas.width / 4) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, snsSplitCanvas.height);
      context.stroke();
    }
    for (let y = snsSplitCanvas.height / 4; y < snsSplitCanvas.height; y += snsSplitCanvas.height / 4) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(snsSplitCanvas.width, y);
      context.stroke();
    }
    context.restore();
  }

  if (!config.showSeam || config.seamWidth <= 0) {
    return;
  }

  context.save();
  context.strokeStyle = config.seamColor;
  context.lineWidth = config.seamWidth;
  context.globalAlpha = 0.9;
  context.beginPath();
  context.moveTo(splitX, 0);
  context.lineTo(splitX, snsSplitCanvas.height);
  context.moveTo(0, splitY);
  context.lineTo(snsSplitCanvas.width, splitY);
  context.stroke();
  context.restore();
};

const drawCompositeGuides = (context: CanvasRenderingContext2D) => {
  context.save();
  context.strokeStyle = "rgba(31, 178, 169, 0.72)";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(snsSplitPostCanvas.width, 0);
  context.lineTo(snsSplitPostCanvas.width, snsSplitPostCanvas.height * 2);
  context.moveTo(0, snsSplitPostCanvas.height);
  context.lineTo(snsSplitPostCanvas.width * 2, snsSplitPostCanvas.height);
  context.stroke();
  context.restore();
};

export const createSnsSplitFileName = (pattern: string, index: number, format: SnsSplitExportFormat) => {
  const safePattern = pattern.trim().slice(0, 48) || defaultSnsSplitExportSettings.filePattern;
  const base = safePattern
    .replace("{n}", String(index))
    .replace("{nn}", String(index).padStart(2, "0"))
    .replace(/[^a-zA-Z0-9_\-]/g, "_");
  return `${base}.${format === "jpeg" ? "jpg" : "png"}`;
};

export const countReadySnsSplitImages = (draft: Pick<SnsSplitDraft, "images" | "mode">) => {
  const requiredSlots = getRequiredSlotCount(draft.mode);
  const baseReady = Boolean(draft.images.find((image) => image.id === "base")?.src);
  const slotReady = draft.images
    .filter((image) => image.id !== "base")
    .slice(0, requiredSlots)
    .filter((image) => Boolean(image.src)).length;
  return { baseReady, slotReady, requiredSlots };
};
