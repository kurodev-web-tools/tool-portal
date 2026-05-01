export type ThumbnailCanvasSizeId = "hd" | "full-hd";
export type ThumbnailPresetId = "stream_announce" | "karaoke" | "chatting" | "clip";
export type ThumbnailLayerType = "image" | "text" | "shape";
export type ThumbnailShapeType = "rect" | "circle";

export type ThumbnailCanvas = {
  width: number;
  height: number;
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
  description: string;
  accent: string;
  layers: ThumbnailLayer[];
};

export const thumbnailDraftStorageKey = "v-streamer-tools:thumbnail-editor:draft:v1";

export const thumbnailCanvasSizes: Record<ThumbnailCanvasSizeId, ThumbnailCanvas & { label: string }> = {
  hd: { width: 1280, height: 720, label: "1280 x 720 (16:9)" },
  "full-hd": { width: 1920, height: 1080, label: "1920 x 1080 (16:9)" }
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
    description: "開始時刻と見出しを大きく見せる告知向け。",
    accent: "#1ed7c6",
    layers: [
      backgroundLayer("画像 1（背景）", "STREAM ANNOUNCE", "#17224d", "#05121f", "#2cf4e6"),
      shapeLayer({ name: "図形 1（時刻バッジ）", shapeType: "circle", x: 940, y: 456, width: 210, height: 210, fillColor: "#ff5ca8", strokeColor: "#ffffff", strokeWidth: 6 }),
      textLayer({ name: "テキスト 2（時刻）", text: "21:00\n配信開始", x: 966, y: 506, width: 158, height: 132, fontSize: 48, lineHeight: 1.05, align: "center", strokeWidth: 3 }),
      textLayer({ name: "テキスト 1（見出し）", text: "初見さん\n大歓迎!", x: 90, y: 186, width: 720, height: 250, fontSize: 104, lineHeight: 1.03, color: "#ffffff", strokeWidth: 12 }),
      textLayer({ name: "テキスト 3（サブ）", text: "一緒に楽しくお話ししよう!", x: 160, y: 502, width: 560, height: 58, fontSize: 38, lineHeight: 1.1, strokeWidth: 5 })
    ]
  },
  {
    id: "karaoke",
    name: "歌枠",
    description: "音楽配信に合う強いコントラスト。",
    accent: "#ff4cc2",
    layers: [
      backgroundLayer("画像 1（背景）", "KARAOKE STREAM", "#30123f", "#07121f", "#ff4cc2"),
      shapeLayer({ name: "図形 1（帯）", shapeType: "rect", x: 70, y: 466, width: 720, height: 86, fillColor: "#07111ccc", strokeColor: "#ff4cc2", strokeWidth: 4, borderRadius: 10 }),
      textLayer({ name: "テキスト 1（見出し）", text: "歌枠\nSINGING STREAM", x: 80, y: 170, width: 820, height: 230, fontSize: 108, lineHeight: 1.0, color: "#fff3fb", strokeColor: "#1b0820", strokeWidth: 10 }),
      textLayer({ name: "テキスト 2（サブ）", text: "リクエスト歓迎 / 初見さん歓迎", x: 106, y: 488, width: 650, height: 52, fontSize: 36, strokeWidth: 3 })
    ]
  },
  {
    id: "chatting",
    name: "雑談",
    description: "トーク配信・近況報告に使いやすい余白設計。",
    accent: "#36aaff",
    layers: [
      backgroundLayer("画像 1（背景）", "CHATTING", "#102a42", "#06111c", "#36aaff"),
      shapeLayer({ name: "図形 1（コメント枠）", shapeType: "rect", x: 86, y: 130, width: 590, height: 408, fillColor: "#07111cd9", strokeColor: "#36aaff", strokeWidth: 5, borderRadius: 24 }),
      textLayer({ name: "テキスト 1（見出し）", text: "ゆるっと\n雑談配信", x: 122, y: 180, width: 526, height: 206, fontSize: 88, lineHeight: 1.08, strokeWidth: 8 }),
      textLayer({ name: "テキスト 2（サブ）", text: "今日の話題を一緒に整理しよう", x: 128, y: 430, width: 500, height: 58, fontSize: 34, color: "#cfe9ff", strokeWidth: 2 })
    ]
  },
  {
    id: "clip",
    name: "切り抜き",
    description: "短い強調語と勢いを出す切り抜き向け。",
    accent: "#f59e0b",
    layers: [
      backgroundLayer("画像 1（背景）", "CLIP HIGHLIGHT", "#2e2107", "#06111c", "#f59e0b"),
      shapeLayer({ name: "図形 1（強調ラベル）", shapeType: "rect", x: 76, y: 76, width: 292, height: 92, fillColor: "#f59e0b", strokeColor: "#ffffff", strokeWidth: 4, borderRadius: 12 }),
      textLayer({ name: "テキスト 2（ラベル）", text: "切り抜き", x: 110, y: 96, width: 224, height: 54, fontSize: 42, color: "#081117", strokeColor: "#ffffff", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 }),
      textLayer({ name: "テキスト 1（見出し）", text: "神回\nまとめ", x: 92, y: 236, width: 650, height: 224, fontSize: 112, lineHeight: 1.02, color: "#fff7dc", strokeColor: "#0b0b0b", strokeWidth: 12 }),
      textLayer({ name: "テキスト 3（サブ）", text: "一番盛り上がった瞬間だけ", x: 110, y: 500, width: 560, height: 58, fontSize: 36, strokeWidth: 4 })
    ]
  }
];

export const cloneThumbnailLayer = (layer: ThumbnailLayer): ThumbnailLayer => ({
  ...layer,
  id: createId(layer.type),
  name: `${layer.name} コピー`,
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
    name: shapeType === "circle" ? "円形" : "矩形",
    shapeType,
    x: shapeType === "circle" ? 840 : 150,
    y: shapeType === "circle" ? 430 : 470,
    width: shapeType === "circle" ? 170 : 420,
    height: shapeType === "circle" ? 170 : 92,
    fillColor: shapeType === "circle" ? "#ff5ca8" : "#111a22cc"
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

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const numberValue = (value: unknown, fallback: number) => (isFiniteNumber(value) ? value : fallback);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const normalizeThumbnailDraft = (value: unknown): ThumbnailEditorDraft | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const draft = value as Partial<ThumbnailEditorDraft>;
  if (draft.version !== 1 || !draft.canvas || !Array.isArray(draft.layers)) {
    return null;
  }

  const canvasWidth = isFiniteNumber(draft.canvas.width) ? draft.canvas.width : 1280;
  const canvasHeight = isFiniteNumber(draft.canvas.height) ? draft.canvas.height : 720;
  const presetId: ThumbnailPresetId = thumbnailPresets.some((preset) => preset.id === draft.presetId)
    ? (draft.presetId as ThumbnailPresetId)
    : "stream_announce";
  const normalizedLayers = draft.layers
    .map((layer) => normalizeLayer(layer, { width: canvasWidth, height: canvasHeight }))
    .filter((layer): layer is ThumbnailLayer => layer !== null);

  if (normalizedLayers.length === 0) {
    return null;
  }

  const selectedLayerId = normalizedLayers.some((layer) => layer.id === draft.selectedLayerId)
    ? draft.selectedLayerId ?? null
    : normalizedLayers[normalizedLayers.length - 1]?.id ?? null;

  return {
    version: 1,
    canvas: { width: canvasWidth, height: canvasHeight },
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
    name: typeof item.name === "string" ? item.name : item.type,
    type: item.type,
    x: clamp(numberValue(item.x, 0), -canvas.width, canvas.width * 2),
    y: clamp(numberValue(item.y, 0), -canvas.height, canvas.height * 2),
    width: clamp(numberValue(item.width, 160), 16, canvas.width * 2),
    height: clamp(numberValue(item.height, 90), 16, canvas.height * 2),
    rotation: numberValue(item.rotation, 0),
    opacity: clamp(numberValue(item.opacity, 1), 0, 1),
    blur: clamp(numberValue(item.blur, 0), 0, 24),
    locked: Boolean(item.locked),
    hidden: Boolean(item.hidden)
  };

  if (item.type === "image") {
    const image = item as Partial<ThumbnailImageLayer>;
    return typeof image.src === "string" ? { ...base, type: "image", src: image.src } : null;
  }

  if (item.type === "shape") {
    const shape = item as Partial<ThumbnailShapeLayer>;
    return {
      ...base,
      type: "shape",
      shapeType: shape.shapeType === "circle" ? "circle" : "rect",
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
    text: typeof text.text === "string" ? text.text.slice(0, 150) : "テキスト",
    fontFamily: typeof text.fontFamily === "string" ? text.fontFamily : "Noto Sans JP",
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
    context.drawImage(image, 0, 0, layer.width, layer.height);
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
  } else {
    roundedRect(context, 0, 0, layer.width, layer.height, layer.borderRadius);
  }
  context.fillStyle = layer.fillColor;
  context.fill();
  if (layer.strokeWidth > 0) {
    context.lineWidth = layer.strokeWidth;
    context.strokeStyle = layer.strokeColor;
    context.stroke();
  }
};

const drawText = (context: CanvasRenderingContext2D, layer: ThumbnailTextLayer) => {
  const lines = layer.text.split("\n").slice(0, 5);
  const linePx = layer.fontSize * layer.lineHeight;
  context.font = `${layer.italic ? "italic " : ""}${layer.bold ? "700 " : "400 "}${layer.fontSize}px "${layer.fontFamily}", sans-serif`;
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
