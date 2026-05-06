export type ThumbnailCanvasSizeId = "hd" | "full-hd";
export type ThumbnailPresetId =
  | "stream_announce"
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
  category: ThumbnailPresetCategory;
  usageLabel: string;
  description: string;
  accent: string;
  layers: ThumbnailLayer[];
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

export type ThumbnailPresetFilter = {
  query: string;
  category: ThumbnailPresetCategory | "all";
  usageLabel: string | "all";
};

export type ThumbnailPresetDiscoveryState = {
  version: 1;
  recentPresetIds: ThumbnailPresetId[];
  favoritePresetIds: ThumbnailPresetId[];
};

export const thumbnailMainTextCarryoverTargets = [
  { id: "headline", label: "見出し", namePart: "見出し" },
  { id: "time", label: "時刻", namePart: "時刻" },
  { id: "sub", label: "サブ", namePart: "サブ" },
  { id: "label", label: "ラベル", namePart: "ラベル" }
] as const;
export type ThumbnailMainTextCarryoverKey = (typeof thumbnailMainTextCarryoverTargets)[number]["id"];
export type ThumbnailMainTextCarryover = Partial<Record<ThumbnailMainTextCarryoverKey, string>>;

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

const thumbnailPresetAssetPrefix = "/assets/images/thumbnail-editor/";
const thumbnailPhase1BackgroundAssetPrefix = `${thumbnailPresetAssetPrefix}phase1/`;
const thumbnailPhase2BackgroundAssetPrefix = `${thumbnailPresetAssetPrefix}phase2/`;
const thumbnailPhase3BackgroundAssetPrefix = `${thumbnailPresetAssetPrefix}phase3/`;
const thumbnailPhase4DecorationAssetPrefix = `${thumbnailPresetAssetPrefix}decorations/phase4/`;

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
  fontSize: 35,
  lineHeight: 1.64,
  strokeColor: "#061849",
  strokeWidth: 4,
  shadowColor: "#02101f",
  shadowBlur: 7,
  shadowOffsetX: 3,
  shadowOffsetY: 4
} as const;

const weeklyScheduleRowLayers = () =>
  weeklyScheduleRows.flatMap((row) => [
    textLayer({
      ...weeklyScheduleTextBase,
      name: `${row.day} / 曜日`,
      text: row.label,
      x: 670,
      y: row.y,
      width: 84,
      color: "#8cf8ff",
      align: "center"
    }),
    textLayer({
      ...weeklyScheduleTextBase,
      name: `${row.day} / 時間`,
      text: row.time,
      x: 770,
      y: row.y,
      width: 106,
      color: "#ffffff",
      align: "center"
    }),
    textLayer({
      ...weeklyScheduleTextBase,
      name: `${row.day} / 予定`,
      text: row.detail,
      x: 890,
      y: row.y,
      width: 330,
      color: "#ffffff",
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase1BackgroundAssetPrefix}stream-announce-background.png`),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "rect", x: 782, y: 68, width: 418, height: 598, fillColor: "#0317245c", strokeColor: "#31eaff", strokeWidth: 4, borderRadius: 34 }),
      shapeLayer({ name: "図形 2（ラベル帯）", shapeType: "rect", x: 78, y: 54, width: 380, height: 72, fillColor: "#1ed7c6", strokeColor: "#7afcff", strokeWidth: 4, borderRadius: 18 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "配信 / YouTube", x: 112, y: 72, width: 314, height: 42, fontSize: 34, color: "#041421", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 }),
      textLayer({ name: "テキスト 1（見出し）", text: "初見さん\n大歓迎!", x: 88, y: 166, width: 650, height: 250, fontSize: 112, lineHeight: 1.02, color: "#ffffff", strokeColor: "#06112f", strokeWidth: 12, shadowColor: "#00cfff", shadowBlur: 16, shadowOffsetX: 6, shadowOffsetY: 8 }),
      shapeLayer({ name: "図形 1（時刻バッジ）", shapeType: "rect", x: 98, y: 496, width: 526, height: 86, fillColor: "#f70e8fcc", strokeColor: "#5ef7ff", strokeWidth: 5, borderRadius: 16 }),
      textLayer({ name: "テキスト 2（時刻）", text: "21:00 START", x: 132, y: 510, width: 456, height: 58, fontSize: 56, color: "#ffffff", strokeColor: "#5b0637", strokeWidth: 4, shadowColor: "#06111c", shadowBlur: 10, shadowOffsetX: 4, shadowOffsetY: 5 }),
      textLayer({ name: "テキスト 3（サブ）", text: "一緒に楽しくお話ししよう!", x: 150, y: 620, width: 560, height: 46, fontSize: 34, lineHeight: 1.1, strokeWidth: 5 })
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase1BackgroundAssetPrefix}karaoke-background.png`),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "rect", x: 764, y: 82, width: 404, height: 560, fillColor: "#16082675", strokeColor: "#ff9fe3", strokeWidth: 4, borderRadius: 30 }),
      shapeLayer({ name: "図形 2（ラベル）", shapeType: "rect", x: 94, y: 76, width: 316, height: 66, fillColor: "#ff75c8cc", strokeColor: "#ffe0fb", strokeWidth: 4, borderRadius: 18 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "歌枠 / YouTube", x: 126, y: 92, width: 252, height: 38, fontSize: 30, color: "#21071d", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 }),
      textLayer({ name: "テキスト 1（見出し）", text: "歌枠\nSINGING\nSTREAM", x: 84, y: 152, width: 560, height: 260, fontSize: 74, lineHeight: 1.0, color: "#fff4fb", strokeColor: "#31061f", strokeWidth: 10, shadowColor: "#ff4cc2", shadowBlur: 16, shadowOffsetX: 5, shadowOffsetY: 7 }),
      shapeLayer({ name: "図形 1（時刻バッジ）", shapeType: "rect", x: 92, y: 486, width: 514, height: 78, fillColor: "#281021d9", strokeColor: "#ffb86c", strokeWidth: 4, borderRadius: 16 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 START", x: 128, y: 502, width: 430, height: 52, fontSize: 48, color: "#ffe8b7", strokeColor: "#39071e", strokeWidth: 4, shadowColor: "#ff4cc2", shadowBlur: 10, shadowOffsetX: 3, shadowOffsetY: 4 }),
      textLayer({ name: "テキスト 3（サブ）", text: "リクエスト歓迎 / 初見さん歓迎", x: 116, y: 602, width: 620, height: 50, fontSize: 34, strokeColor: "#1b0820", strokeWidth: 4 })
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase3BackgroundAssetPrefix}chatting-background.png`),
      assetDecorationLayer({ name: "画像 2（光粒）", src: `${thumbnailPhase4DecorationAssetPrefix}soft-light-particles.svg`, x: 34, y: 28, width: 650, height: 350, opacity: 0.72 }),
      assetDecorationLayer({ name: "画像 3（小さなきらめき）", src: `${thumbnailPhase4DecorationAssetPrefix}sparkle-small.svg`, x: 558, y: 110, width: 132, height: 118, rotation: -8, opacity: 0.78 }),
      shapeLayer({ name: "図形 4（やわらかい下線）", shapeType: "line", x: 108, y: 548, width: 320, height: 20, fillColor: "#f0aa66", strokeColor: "#f0aa66", strokeWidth: 8, borderRadius: 12 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 748, y: 78, width: 340, height: 560, fillColor: "#f3b17a2e", strokeColor: "#fff0db", strokeWidth: 3, borderRadius: 42 }),
      shapeLayer({ name: "図形 2（ラベル）", shapeType: "rect", x: 92, y: 74, width: 282, height: 40, fillColor: "#070b18d4", strokeColor: "#b36dff", strokeWidth: 3, borderRadius: 20 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "CHATTING / YouTube", x: 120, y: 84, width: 226, height: 24, fontSize: 20, color: "#f8f2ff", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 1（見出し）", text: "ゆるっと\n雑談配信", x: 86, y: 142, width: 585, height: 270, fontSize: 100, lineHeight: 1.1, color: "#fff7ec", strokeColor: "#3b1632", strokeWidth: 9, shadowColor: "#f3aa72", shadowBlur: 12, shadowOffsetX: 4, shadowOffsetY: 5 }),
      shapeLayer({ name: "図形 1（時刻バッジ）", shapeType: "rect", x: 90, y: 470, width: 402, height: 70, fillColor: "#15121fdb", strokeColor: "#f0aa66", strokeWidth: 3, borderRadius: 18 }),
      textLayer({ name: "テキスト 2（時刻）", text: "21:00 START", x: 138, y: 486, width: 310, height: 44, fontSize: 42, color: "#fff4df", strokeColor: "#2b1630", strokeWidth: 3, shadowColor: "#000000", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4 }),
      textLayer({ name: "テキスト 3（サブ）", text: "今日の話題を一緒に整理しよう", x: 94, y: 574, width: 560, height: 42, fontSize: 28, color: "#fff8ee", strokeColor: "#140b21", strokeWidth: 3, shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3 })
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase3BackgroundAssetPrefix}clip-background.png`),
      assetDecorationLayer({ name: "画像 2（集中線）", src: `${thumbnailPhase4DecorationAssetPrefix}clip-focus-rays.svg`, x: 585, y: 26, width: 620, height: 390, rotation: 2, opacity: 0.78 }),
      assetDecorationLayer({ name: "画像 3（スピード線）", src: `${thumbnailPhase4DecorationAssetPrefix}clip-speed-lines.svg`, x: 548, y: 558, width: 655, height: 96, opacity: 0.86 }),
      shapeLayer({ name: "図形 5（ギザギザ強調ベース）", shapeType: "polygon", x: 386, y: 424, width: 850, height: 136, rotation: -1, fillColor: "#d233ff", strokeColor: "#050505", strokeWidth: 7, borderRadius: 0, opacity: 0.92 }),
      shapeLayer({ name: "図形 6（衝撃マーク）", shapeType: "burst", x: 590, y: 112, width: 178, height: 138, rotation: 8, fillColor: "#ffd329", strokeColor: "#070707", strokeWidth: 6, borderRadius: 0 }),
      assetDecorationLayer({ name: "画像 4（矢印アクセント）", src: `${thumbnailPhase4DecorationAssetPrefix}arrow-accent.svg`, x: 338, y: 92, width: 190, height: 90, rotation: -12, opacity: 0.88 }),
      shapeLayer({ name: "図形 3（動画フレーム）", shapeType: "frame", x: 50, y: 126, width: 590, height: 360, rotation: -3, fillColor: "#070914d9", strokeColor: "#ffffff", strokeWidth: 7, borderRadius: 10 }),
      shapeLayer({ name: "図形 1（強調ラベル）", shapeType: "rect", x: 34, y: 48, width: 285, height: 76, rotation: -5, fillColor: "#08080c", strokeColor: "#d233ff", strokeWidth: 5, borderRadius: 10 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "切り抜き", x: 70, y: 63, width: 220, height: 48, rotation: -5, fontSize: 44, color: "#ffffff", strokeColor: "#050505", strokeWidth: 7, shadowColor: "#d233ff", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4 }),
      textLayer({ name: "テキスト 1（見出し）", text: "神回まとめ", x: 410, y: 418, width: 820, height: 130, fontSize: 116, lineHeight: 1, color: "#ffd329", strokeColor: "#060606", strokeWidth: 14, shadowColor: "#9b22ff", shadowBlur: 10, shadowOffsetX: 5, shadowOffsetY: 7 }),
      shapeLayer({ name: "図形 2（時刻バッジ）", shapeType: "rect", x: 898, y: 340, width: 286, height: 72, fillColor: "#07070cef", strokeColor: "#d233ff", strokeWidth: 5, borderRadius: 14 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 公開", x: 930, y: 354, width: 232, height: 44, fontSize: 38, color: "#ffd32b", strokeColor: "#050505", strokeWidth: 5, shadowColor: "#ffffff", shadowBlur: 2, shadowOffsetX: 1, shadowOffsetY: 1 }),
      textLayer({ name: "テキスト 3（サブ）", text: "一番盛り上がった瞬間だけ", x: 650, y: 604, width: 520, height: 44, fontSize: 34, color: "#ffffff", strokeColor: "#070707", strokeWidth: 6, shadowColor: "#d233ff", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4 })
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase2BackgroundAssetPrefix}game-live-background.png`),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "rect", x: 775, y: 76, width: 390, height: 560, fillColor: "#03181f4e", strokeColor: "#5dffc4", strokeWidth: 5, borderRadius: 34 }),
      shapeLayer({ name: "図形 1（ラベル帯）", shapeType: "rect", x: 78, y: 62, width: 370, height: 66, fillColor: "#7ddf64e6", strokeColor: "#e1ffeb", strokeWidth: 4, borderRadius: 16 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "GAME LIVE", x: 112, y: 78, width: 300, height: 42, fontSize: 40, color: "#04111c", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 1（見出し）", text: "参加型\nゲーム実況", x: 82, y: 166, width: 680, height: 220, fontSize: 96, lineHeight: 1.16, color: "#ffffff", strokeColor: "#020e08", strokeWidth: 13, shadowColor: "#7ddf64", shadowBlur: 10, shadowOffsetX: 4, shadowOffsetY: 5 }),
      shapeLayer({ name: "図形 2（時刻バッジ）", shapeType: "rect", x: 94, y: 505, width: 430, height: 78, fillColor: "#051219e1", strokeColor: "#7ddf64", strokeWidth: 5, borderRadius: 16 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 START", x: 128, y: 520, width: 365, height: 52, fontSize: 42, color: "#e6ffde", strokeColor: "#001008", strokeWidth: 3, shadowColor: "#000000", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4 }),
      textLayer({ name: "テキスト 3（サブ）", text: "初見さん歓迎 / 一緒に遊ぼう", x: 104, y: 612, width: 610, height: 48, fontSize: 34, color: "#dcffda", strokeColor: "#01110a", strokeWidth: 4 })
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase2BackgroundAssetPrefix}collaboration-background.png`),
      shapeLayer({ name: "図形 1（左立ち絵ガイド）", shapeType: "rect", x: 650, y: 118, width: 270, height: 470, fillColor: "#ff7b593a", strokeColor: "#ffbe82", strokeWidth: 5, borderRadius: 38 }),
      shapeLayer({ name: "図形 2（右立ち絵ガイド）", shapeType: "rect", x: 900, y: 138, width: 280, height: 455, fillColor: "#ff4cc23a", strokeColor: "#ffb4e6", strokeWidth: 5, borderRadius: 38 }),
      shapeLayer({ name: "図形 3（ラベル帯）", shapeType: "rect", x: 78, y: 74, width: 292, height: 66, fillColor: "#ff7a59e6", strokeColor: "#ffe8d8", strokeWidth: 4, borderRadius: 16 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "COLLAB", x: 120, y: 88, width: 210, height: 42, fontSize: 44, color: "#170804", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 1（見出し）", text: "コラボ\n企画配信", x: 82, y: 190, width: 585, height: 220, fontSize: 88, lineHeight: 1.12, color: "#fff5ef", strokeColor: "#1c0704", strokeWidth: 12, shadowColor: "#ff7a59", shadowBlur: 9, shadowOffsetX: 4, shadowOffsetY: 5 }),
      shapeLayer({ name: "図形 4（時刻バッジ）", shapeType: "rect", x: 92, y: 456, width: 360, height: 70, fillColor: "#17080fde", strokeColor: "#ffb278", strokeWidth: 4, borderRadius: 15 }),
      textLayer({ name: "テキスト 2（時刻）", text: "5/5 20:00", x: 122, y: 470, width: 300, height: 48, fontSize: 42, color: "#ffe3d6", strokeColor: "#280906", strokeWidth: 3 }),
      textLayer({ name: "テキスト 3（サブ）", text: "ゲスト名 / 企画名を入れる", x: 96, y: 552, width: 560, height: 48, fontSize: 34, color: "#ffffff", strokeColor: "#1e080e", strokeWidth: 4 })
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase2BackgroundAssetPrefix}announcement-background.png`),
      shapeLayer({ name: "図形 1（本文パネル）", shapeType: "rect", x: 76, y: 102, width: 640, height: 430, fillColor: "#040d1dda", strokeColor: "#e4b966", strokeWidth: 5, borderRadius: 24 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "rect", x: 800, y: 124, width: 330, height: 500, fillColor: "#ffeece2e", strokeColor: "#f4d28e", strokeWidth: 4, borderRadius: 32 }),
      shapeLayer({ name: "図形 2（ラベル）", shapeType: "rect", x: 108, y: 80, width: 245, height: 58, fillColor: "#e8c369eb", strokeColor: "#fff4cc", strokeWidth: 3, borderRadius: 14 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "NEWS", x: 148, y: 93, width: 166, height: 36, fontSize: 30, color: "#0e1112", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 1（見出し）", text: "大切な\nお知らせ", x: 118, y: 172, width: 548, height: 200, fontSize: 72, lineHeight: 1.34, color: "#fff8dc", strokeColor: "#12100a", strokeWidth: 10, shadowColor: "#000000", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4 }),
      shapeLayer({ name: "図形 4（時刻バッジ）", shapeType: "rect", x: 124, y: 394, width: 250, height: 62, fillColor: "#161d2ddc", strokeColor: "#e8c369", strokeWidth: 4, borderRadius: 14 }),
      textLayer({ name: "テキスト 2（時刻）", text: "5/5 公開", x: 152, y: 406, width: 198, height: 42, fontSize: 34, color: "#ffe88c", strokeColor: "#090c14", strokeWidth: 3 }),
      textLayer({ name: "テキスト 3（サブ）", text: "詳細は本文でお知らせします", x: 126, y: 470, width: 530, height: 42, fontSize: 30, color: "#ffffff", strokeColor: "#080c16", strokeWidth: 3 })
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase1BackgroundAssetPrefix}weekly-schedule-background.png`),
      shapeLayer({ name: "図形 2（ラベル）", shapeType: "rect", x: 150, y: 115, width: 345, height: 60, fillColor: "#0a223acc", strokeColor: "#4dd8ff", strokeWidth: 4, borderRadius: 18 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "WEEKLY SCHEDULE", x: 190, y: 130, width: 270, height: 35, fontSize: 28, color: "#8cf8ff", strokeWidth: 0, shadowColor: "#4dd8ff", shadowBlur: 8, shadowOffsetX: 0, shadowOffsetY: 0 }),
      textLayer({ name: "テキスト 1（見出し）", text: "今週の\n配信予定", x: 50, y: 185, width: 530, height: 240, fontSize: 96, lineHeight: 1.04, color: "#f8feff", align: "center", bold: true, italic: true, strokeColor: "#061849", strokeWidth: 11, shadowColor: "#35e6ff", shadowBlur: 16, shadowOffsetX: 5, shadowOffsetY: 7 }),
      shapeLayer({ name: "図形 1（週範囲バッジ）", shapeType: "rect", x: 205, y: 400, width: 220, height: 65, fillColor: "#08233ecc", strokeColor: "#4dd8ff", strokeWidth: 4, borderRadius: 18 }),
      textLayer({ name: "テキスト 2（時刻）", text: "5/4 - 5/10", x: 240, y: 415, width: 245, height: 40, fontSize: 34, color: "#ffffff", strokeWidth: 3 }),
      ...weeklyScheduleRowLayers(),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "rect", x: 80, y: 505, width: 510, height: 155, fillColor: "#03172466", strokeColor: "#d8f8ff", strokeWidth: 3, borderRadius: 18 })
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase3BackgroundAssetPrefix}x-announcement-background.png`),
      assetDecorationLayer({ name: "画像 2（淡い光粒）", src: `${thumbnailPhase4DecorationAssetPrefix}soft-light-particles.svg`, x: 596, y: 50, width: 520, height: 320, opacity: 0.42 }),
      assetDecorationLayer({ name: "画像 3（角飾り）", src: `${thumbnailPhase4DecorationAssetPrefix}x-corner-ornaments.svg`, x: 58, y: 128, width: 784, height: 448, opacity: 0.7 }),
      shapeLayer({ name: "図形 5（上品な罫線）", shapeType: "line", x: 160, y: 248, width: 548, height: 18, fillColor: "#8ca5ef", strokeColor: "#8ca5ef", strokeWidth: 3, borderRadius: 8, opacity: 0.8 }),
      assetDecorationLayer({ name: "画像 4（丸ドット点線）", src: `${thumbnailPhase4DecorationAssetPrefix}dot-dash-row.svg`, x: 184, y: 463, width: 520, height: 34, opacity: 0.58 }),
      shapeLayer({ name: "図形 1（投稿カード）", shapeType: "frame", x: 80, y: 168, width: 740, height: 378, fillColor: "#fffffff2", strokeColor: "#c6d7f0", strokeWidth: 3, borderRadius: 28 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 888, y: 92, width: 250, height: 540, fillColor: "#f8fbff24", strokeColor: "#8ca5df", strokeWidth: 2, borderRadius: 42 }),
      shapeLayer({ name: "図形 2（ラベル）", shapeType: "rect", x: 306, y: 166, width: 238, height: 58, fillColor: "#8ca5efe8", strokeColor: "#fefefe", strokeWidth: 3, borderRadius: 12 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "X POST", x: 342, y: 179, width: 166, height: 32, fontSize: 28, color: "#ffffff", strokeColor: "#5e73c4", strokeWidth: 2, shadowColor: "#ffffff", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 1（見出し）", text: "本日のお知らせ", x: 112, y: 274, width: 666, height: 92, fontSize: 74, lineHeight: 1, color: "#16246b", strokeColor: "#ffffff", strokeWidth: 0, shadowColor: "#dce6ff", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 2 }),
      textLayer({ name: "テキスト 3（サブ）", text: "配信予定と最新情報をまとめました", x: 198, y: 410, width: 500, height: 42, fontSize: 30, color: "#22306f", strokeColor: "#ffffff", strokeWidth: 0, shadowColor: "#dce6ff", shadowBlur: 3, shadowOffsetX: 0, shadowOffsetY: 1 }),
      shapeLayer({ name: "図形 6（日付バッジアクセント）", shapeType: "burst", x: 534, y: 486, width: 52, height: 52, fillColor: "#ffffff", strokeColor: "#7998f0", strokeWidth: 2, borderRadius: 0, opacity: 0.72 }),
      shapeLayer({ name: "図形 4（時刻バッジ）", shapeType: "rect", x: 300, y: 494, width: 250, height: 62, fillColor: "#7998f0e8", strokeColor: "#ffffff", strokeWidth: 3, borderRadius: 12 }),
      textLayer({ name: "テキスト 2（時刻）", text: "05.06 WED", x: 342, y: 506, width: 168, height: 38, fontSize: 34, color: "#ffffff", strokeColor: "#536ac7", strokeWidth: 2, shadowColor: "#ffffff", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald" })
    ]
  }
];

const thumbnailPresetIds = new Set<ThumbnailPresetId>(thumbnailPresets.map((preset) => preset.id));
const isThumbnailPresetId = (value: unknown): value is ThumbnailPresetId =>
  typeof value === "string" && thumbnailPresetIds.has(value as ThumbnailPresetId);

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

export const normalizeThumbnailPresetDiscoveryState = (value: unknown): ThumbnailPresetDiscoveryState => {
  if (!value || typeof value !== "object") {
    return { version: 1, recentPresetIds: [], favoritePresetIds: [] };
  }

  const state = value as Partial<ThumbnailPresetDiscoveryState>;
  return {
    version: 1,
    recentPresetIds: uniquePresetIds(state.recentPresetIds, thumbnailPresetRecentLimit),
    favoritePresetIds: uniquePresetIds(state.favoritePresetIds)
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
  if (canvas?.width === 1920 && canvas.height === 1080) {
    return { width: 1920, height: 1080 };
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
    return typeof image.src === "string" && isSafeImageSource(image.src) ? { ...base, type: "image", src: image.src } : null;
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
    fontFamily: typeof text.fontFamily === "string" && thumbnailFonts.includes(text.fontFamily) ? text.fontFamily : "Noto Sans JP",
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
