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
const thumbnailPhase5BackgroundAssetPrefix = `${thumbnailPresetAssetPrefix}phase5/`;
const thumbnailPhase5DecorationAssetPrefix = `${thumbnailPresetAssetPrefix}decorations/phase5/`;

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
      x: 670,
      y: row.y,
      width: 84,
      color: "#9dfaff",
      align: "center"
    }),
    textLayer({
      ...weeklyScheduleTextBase,
      name: `${row.day} / 時間`,
      text: row.time,
      x: 770,
      y: row.y,
      width: 106,
      color: "#f7feff",
      align: "center"
    }),
    textLayer({
      ...weeklyScheduleTextBase,
      name: `${row.day} / 予定`,
      text: row.detail,
      x: 890,
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
      assetBackgroundLayer("画像 1（背景）", `${thumbnailPhase1BackgroundAssetPrefix}stream-announce-background.png`),
      assetDecorationLayer({ name: "画像 2（控えめな光粒）", src: `${thumbnailPhase4DecorationAssetPrefix}soft-light-particles.svg`, x: 560, y: 32, width: 560, height: 330, opacity: 0.28 }),
      assetDecorationLayer({ name: "画像 3（星の発光粒）", src: `${thumbnailPhase4DecorationAssetPrefix}stream-star-sparks.svg`, x: 26, y: 118, width: 705, height: 432, opacity: 0.82 }),
      assetDecorationLayer({ name: "画像 4（立ち絵枠の角飾り）", src: `${thumbnailPhase4DecorationAssetPrefix}stream-tech-corner-frame.svg`, x: 748, y: 28, width: 500, height: 666, opacity: 0.86 }),
      assetDecorationLayer({ name: "画像 5（ラベル横の短いダッシュ）", src: `${thumbnailPhase4DecorationAssetPrefix}stream-tech-dash-row.svg`, x: 520, y: 72, width: 340, height: 76, opacity: 0.84 }),
      assetDecorationLayer({ name: "画像 6（見出し背面グロー）", src: `${thumbnailPhase4DecorationAssetPrefix}stream-title-glow-backplate.svg`, x: 42, y: 142, width: 705, height: 308, opacity: 0.76 }),
      assetDecorationLayer({ name: "画像 7（見出し左下の大きな強調片）", src: `${thumbnailPhase4DecorationAssetPrefix}stream-emphasis-bursts.svg`, x: 2, y: 340, width: 238, height: 158, rotation: -10, opacity: 0.9 }),
      assetDecorationLayer({ name: "画像 8（見出し右の強調片）", src: `${thumbnailPhase4DecorationAssetPrefix}stream-emphasis-bursts.svg`, x: 650, y: 260, width: 200, height: 118, rotation: 13, opacity: 0.72 }),
      assetDecorationLayer({ name: "画像 9（時刻左の強調片）", src: `${thumbnailPhase4DecorationAssetPrefix}stream-emphasis-bursts.svg`, x: 2, y: 464, width: 190, height: 118, rotation: -14, opacity: 0.68 }),
      shapeLayer({ name: "図形 4（ラベル横ライン）", shapeType: "line", x: 500, y: 108, width: 260, height: 16, fillColor: "#7afcff", strokeColor: "#7afcff", strokeWidth: 4, borderRadius: 8, opacity: 0.68 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 780, y: 60, width: 430, height: 604, fillColor: "#03172435", strokeColor: "#31eaff", strokeWidth: 2, borderRadius: 36, opacity: 0.72 }),
      assetDecorationLayer({ name: "画像 10（ラベル帯）", src: `${thumbnailPhase4DecorationAssetPrefix}stream-label-band-base.svg`, x: 58, y: 42, width: 462, height: 90, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "配信 / YouTube", x: 112, y: 67, width: 350, height: 42, fontSize: 35, color: "#041421", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 }),
      textLayer({ name: "テキスト 1（見出し）", text: "初見さん\n大歓迎!", x: 72, y: 148, width: 705, height: 286, fontSize: 118, lineHeight: 0.99, color: "#ffffff", strokeColor: "#06112f", strokeWidth: 13, shadowColor: "#00cfff", shadowBlur: 20, shadowOffsetX: 6, shadowOffsetY: 8 }),
      assetDecorationLayer({ name: "画像 11（時刻バッジ）", src: `${thumbnailPhase4DecorationAssetPrefix}stream-time-banner-base.svg`, x: 72, y: 480, width: 672, height: 124, rotation: -2, opacity: 0.98 }),
      shapeLayer({ name: "図形 5（時刻下ライン）", shapeType: "line", x: 116, y: 604, width: 520, height: 18, fillColor: "#5ef7ff", strokeColor: "#5ef7ff", strokeWidth: 4, borderRadius: 8, opacity: 0.72 }),
      textLayer({ name: "テキスト 2（時刻）", text: "21:00 START", x: 122, y: 512, width: 530, height: 58, fontSize: 57, color: "#ffffff", strokeColor: "#5b0637", strokeWidth: 4, shadowColor: "#06111c", shadowBlur: 10, shadowOffsetX: 4, shadowOffsetY: 5 }),
      textLayer({ name: "テキスト 3（サブ）", text: "一緒に楽しくお話ししよう!", x: 150, y: 624, width: 560, height: 46, fontSize: 34, lineHeight: 1.1, strokeWidth: 5 })
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
      assetDecorationLayer({ name: "画像 2（歌枠の星光り）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-spark-field.svg`, x: 0, y: 0, width: 1280, height: 720, opacity: 0.86 }),
      assetDecorationLayer({ name: "画像 3（シアン音符オーナメント）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-ornament-note-cyan.png`, x: 790, y: 195, width: 170, height: 196, rotation: -8, opacity: 0.74 }),
      assetDecorationLayer({ name: "画像 4（金色音符オーナメント）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-ornament-note-gold.png`, x: 1043, y: 409, width: 134, height: 153, rotation: 7, opacity: 0.62 }),
      assetDecorationLayer({ name: "画像 5（ピンク星きらめき）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-ornament-star-pink.png`, x: 656, y: 342, width: 148, height: 139, opacity: 0.72 }),
      assetDecorationLayer({ name: "画像 6（金色星きらめき）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-ornament-star-gold.png`, x: 1101, y: 497, width: 126, height: 126, opacity: 0.6 }),
      assetDecorationLayer({ name: "画像 7（小粒きらめきクラスター）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-ornament-sparkle-cluster-pink-cyan.png`, x: 0, y: 444, width: 286, height: 218, opacity: 0.52 }),
      assetDecorationLayer({ name: "画像 8（白金小粒きらめき）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-sparkle-dust-white-gold.png`, x: 4, y: 16, width: 610, height: 352, opacity: 0.28 }),
      assetDecorationLayer({ name: "画像 9（ピンクシアン小粒きらめき）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-sparkle-dust-pink-cyan.png`, x: 724, y: 112, width: 452, height: 260, opacity: 0.24 }),
      assetDecorationLayer({ name: "画像 10（単体白グリント）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-glint-single-soft-white.png`, x: 360, y: 396, width: 158, height: 154, opacity: 0.5 }),
      assetDecorationLayer({ name: "画像 11（見出し背面グロー）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-title-glow-backplate.svg`, x: 38, y: 126, width: 710, height: 336, opacity: 0.82 }),
      assetDecorationLayer({ name: "画像 12（右立ち絵の装飾枠）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-ornate-frame.svg`, x: 760, y: 30, width: 470, height: 660, opacity: 0.92 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 792, y: 92, width: 376, height: 536, fillColor: "#16082633", strokeColor: "#fff0fb", strokeWidth: 2, borderRadius: 42, opacity: 0.46 }),
      shapeLayer({ name: "図形 2（ラベル横ライン）", shapeType: "line", x: 444, y: 104, width: 154, height: 14, fillColor: "#ffd484", strokeColor: "#ffd484", strokeWidth: 4, borderRadius: 8, opacity: 0.68 }),
      assetDecorationLayer({ name: "画像 13（ラベル帯）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-label-band-base.svg`, x: 84, y: 58, width: 388, height: 98, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "歌枠 / YouTube", x: 130, y: 86, width: 294, height: 42, fontSize: 32, color: "#21071d", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 }),
      textLayer({ name: "テキスト 1（見出し）", text: "歌枠\nSINGING\nSTREAM", x: 74, y: 150, width: 640, height: 302, fontSize: 92, lineHeight: 0.94, color: "#fff4fb", strokeColor: "#2b061f", strokeWidth: 12, shadowColor: "#ff4cc2", shadowBlur: 20, shadowOffsetX: 5, shadowOffsetY: 7 }),
      shapeLayer({ name: "図形 4（見出し下ライン）", shapeType: "line", x: 118, y: 462, width: 590, height: 18, fillColor: "#ffd484", strokeColor: "#ffd484", strokeWidth: 5, borderRadius: 10, opacity: 0.82 }),
      assetDecorationLayer({ name: "画像 14（時刻バッジ）", src: `${thumbnailPhase4DecorationAssetPrefix}karaoke-time-banner-base.svg`, x: 86, y: 494, width: 668, height: 122, opacity: 0.98 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 START", x: 176, y: 524, width: 490, height: 66, fontSize: 58, color: "#ffe8b7", strokeColor: "#39071e", strokeWidth: 4, shadowColor: "#ff4cc2", shadowBlur: 12, shadowOffsetX: 3, shadowOffsetY: 4 }),
      textLayer({ name: "テキスト 3（サブ）", text: "リクエスト歓迎 / 初見さん歓迎", x: 150, y: 610, width: 610, height: 52, fontSize: 35, align: "center", color: "#fff9f4", strokeColor: "#1b0820", strokeWidth: 4, shadowColor: "#ff4cc2", shadowBlur: 8, shadowOffsetX: 2, shadowOffsetY: 3 })
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
      assetDecorationLayer({ name: "画像 2（光粒）", src: `${thumbnailPhase4DecorationAssetPrefix}soft-light-particles.svg`, x: 54, y: 34, width: 590, height: 320, opacity: 0.34 }),
      assetDecorationLayer({ name: "画像 3（小さなきらめき）", src: `${thumbnailPhase4DecorationAssetPrefix}sparkle-small.svg`, x: 418, y: 116, width: 112, height: 98, rotation: -8, opacity: 0.42 }),
      shapeLayer({ name: "図形 4（やわらかい下線）", shapeType: "line", x: 92, y: 548, width: 458, height: 18, fillColor: "#f0aa66", strokeColor: "#f0aa66", strokeWidth: 4, borderRadius: 12, opacity: 0.58 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 730, y: 48, width: 420, height: 628, fillColor: "#f3b17a16", strokeColor: "#fff0db", strokeWidth: 2, borderRadius: 64, opacity: 0.48 }),
      shapeLayer({ name: "図形 2（ラベル）", shapeType: "rect", x: 92, y: 72, width: 282, height: 40, fillColor: "#070b18cc", strokeColor: "#c8a3ff", strokeWidth: 2, borderRadius: 20, opacity: 0.94 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "CHATTING / YouTube", x: 120, y: 82, width: 226, height: 24, fontSize: 20, color: "#f8f2ff", strokeWidth: 0, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 1（見出し）", text: "ゆるっと\n雑談配信", x: 78, y: 138, width: 600, height: 288, fontSize: 106, lineHeight: 1.06, color: "#fffaf2", strokeColor: "#2e1430", strokeWidth: 10, shadowColor: "#eba36d", shadowBlur: 16, shadowOffsetX: 4, shadowOffsetY: 5 }),
      shapeLayer({ name: "図形 1（時刻バッジ）", shapeType: "rect", x: 90, y: 466, width: 430, height: 76, fillColor: "#15111fe8", strokeColor: "#f0aa66", strokeWidth: 3, borderRadius: 24 }),
      shapeLayer({ name: "図形 5（時刻アイコン外円）", shapeType: "circle", x: 118, y: 486, width: 38, height: 38, fillColor: "#00000000", strokeColor: "#f3c17c", strokeWidth: 4, borderRadius: 0, opacity: 0.9 }),
      shapeLayer({ name: "図形 6（時刻アイコン短針）", shapeType: "line", x: 136, y: 495, width: 2, height: 20, rotation: -90, fillColor: "#f3c17c", strokeColor: "#f3c17c", strokeWidth: 4, borderRadius: 4, opacity: 0.92 }),
      shapeLayer({ name: "図形 7（時刻アイコン長針）", shapeType: "line", x: 140, y: 506, width: 16, height: 2, fillColor: "#f3c17c", strokeColor: "#f3c17c", strokeWidth: 4, borderRadius: 4, opacity: 0.92 }),
      textLayer({ name: "テキスト 2（時刻）", text: "21:00 START", x: 180, y: 484, width: 310, height: 46, fontSize: 43, color: "#fff4df", strokeColor: "#2b1630", strokeWidth: 3, shadowColor: "#000000", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4 }),
      textLayer({ name: "テキスト 3（サブ）", text: "今日の話題を一緒に整理しよう", x: 94, y: 584, width: 570, height: 42, fontSize: 29, color: "#fff8ee", strokeColor: "#140b21", strokeWidth: 3, shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3 })
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
      textLayer({ name: "テキスト 4（ラベル）", text: "見どころ", x: 112, y: 102, width: 238, height: 48, rotation: -5, fontSize: 44, color: "#ffffff", strokeColor: "#050505", strokeWidth: 6, shadowColor: "#d233ff", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4 }),
      textLayer({ name: "テキスト 1（見出し）", text: "神回\nまとめ", x: 542, y: 400, width: 456, height: 156, rotation: -2, fontSize: 74, lineHeight: 0.9, align: "center", color: "#ffd329", strokeColor: "#060606", strokeWidth: 12, shadowColor: "#9b22ff", shadowBlur: 10, shadowOffsetX: 4, shadowOffsetY: 6 }),
      assetDecorationLayer({ name: "画像 7（時刻バッジ土台）", src: `${thumbnailPhase5DecorationAssetPrefix}clip-time-badge-sticker-purple-uniform-cell.png`, x: 672, y: 214, width: 374, height: 249, rotation: 2, opacity: 0.98 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 公開", x: 748, y: 302, width: 228, height: 48, rotation: 2, fontSize: 39, color: "#ffd32b", strokeColor: "#050505", strokeWidth: 5, shadowColor: "#ffffff", shadowBlur: 2, shadowOffsetX: 1, shadowOffsetY: 1, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 3（サブ）", text: "ショート動画 / プレミア公開", x: 480, y: 608, width: 540, height: 44, fontSize: 31, align: "center", color: "#ffffff", strokeColor: "#070707", strokeWidth: 6, shadowColor: "#d233ff", shadowBlur: 8, shadowOffsetX: 3, shadowOffsetY: 4 })
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
      assetDecorationLayer({ name: "画像 2（ゲームHUDの線）", src: `${thumbnailPhase4DecorationAssetPrefix}game-live-hud-lines.svg`, x: 0, y: 0, width: 1280, height: 720, opacity: 0.88 }),
      assetDecorationLayer({ name: "画像 3（下部スピード線）", src: `${thumbnailPhase4DecorationAssetPrefix}clip-speed-lines.svg`, x: 508, y: 538, width: 665, height: 100, opacity: 0.46 }),
      assetDecorationLayer({ name: "画像 4（右立ち絵guideのHUD枠）", src: `${thumbnailPhase4DecorationAssetPrefix}game-live-standee-guide-lines.svg`, x: 770, y: 38, width: 470, height: 642, opacity: 0.9 }),
      shapeLayer({ name: "図形 5（斜め強調ベース）", shapeType: "polygon", x: 48, y: 158, width: 725, height: 252, rotation: -1, fillColor: "#020c12b8", strokeColor: "#39faff", strokeWidth: 3, borderRadius: 0, opacity: 0.78 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 818, y: 112, width: 330, height: 492, fillColor: "#07192424", strokeColor: "#dffeff", strokeWidth: 2, borderRadius: 66, opacity: 0.5 }),
      shapeLayer({ name: "図形 6（ゲーム感ライン）", shapeType: "line", x: 514, y: 102, width: 250, height: 16, fillColor: "#66fff0", strokeColor: "#66fff0", strokeWidth: 4, borderRadius: 8, opacity: 0.68 }),
      assetDecorationLayer({ name: "画像 5（ラベル帯）", src: `${thumbnailPhase4DecorationAssetPrefix}game-live-label-band-base.svg`, x: 58, y: 60, width: 500, height: 106, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "GAME LIVE", x: 122, y: 92, width: 310, height: 46, fontSize: 43, color: "#b9ffbe", strokeColor: "#06120e", strokeWidth: 2, shadowColor: "#42ff6f", shadowBlur: 8, shadowOffsetX: 0, shadowOffsetY: 2, fontFamily: "Oswald", italic: true }),
      textLayer({ name: "テキスト 1（見出し）", text: "参加型\nゲーム実況", x: 72, y: 156, width: 720, height: 292, fontSize: 116, lineHeight: 0.98, color: "#ffffff", strokeColor: "#051016", strokeWidth: 15, shadowColor: "#2dfaff", shadowBlur: 12, shadowOffsetX: 6, shadowOffsetY: 8 }),
      assetDecorationLayer({ name: "画像 6（時刻バッジ）", src: `${thumbnailPhase4DecorationAssetPrefix}game-live-time-banner-base.svg`, x: 74, y: 488, width: 705, height: 128, opacity: 0.98 }),
      shapeLayer({ name: "図形 2（時刻下ライン）", shapeType: "line", x: 134, y: 610, width: 492, height: 14, fillColor: "#35f8ff", strokeColor: "#35f8ff", strokeWidth: 3, borderRadius: 8, opacity: 0.62 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 START", x: 190, y: 522, width: 390, height: 62, fontSize: 56, color: "#5ffcff", strokeColor: "#021018", strokeWidth: 3, shadowColor: "#42ff6f", shadowBlur: 10, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 3（サブ）", text: "初見さん歓迎 / 一緒に遊ぼう", x: 112, y: 632, width: 610, height: 46, fontSize: 34, align: "center", color: "#f4fff1", strokeColor: "#01110a", strokeWidth: 4, shadowColor: "#42ff6f", shadowBlur: 6, shadowOffsetX: 2, shadowOffsetY: 3 })
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
      assetDecorationLayer({ name: "画像 2（コラボの控えめな光）", src: `${thumbnailPhase4DecorationAssetPrefix}collaboration-soft-glints.svg`, x: 0, y: 0, width: 1280, height: 720, opacity: 0.78 }),
      assetDecorationLayer({ name: "画像 3（2人立ち絵guideのスポット）", src: `${thumbnailPhase4DecorationAssetPrefix}collaboration-duo-guide-lines.svg`, x: 0, y: 0, width: 1280, height: 720, opacity: 0.94 }),
      assetDecorationLayer({ name: "画像 4（接続線と下部ライン）", src: `${thumbnailPhase4DecorationAssetPrefix}collaboration-connection-lines.svg`, x: 0, y: 0, width: 1280, height: 720, opacity: 0.84 }),
      assetDecorationLayer({ name: "画像 5（小さなきらめき）", src: `${thumbnailPhase4DecorationAssetPrefix}sparkle-small.svg`, x: 502, y: 330, width: 142, height: 122, rotation: -8, opacity: 0.48 }),
      shapeLayer({ name: "図形 1（左立ち絵ガイド）", shapeType: "frame", x: 660, y: 158, width: 285, height: 448, fillColor: "#ff7b5918", strokeColor: "#ffd28c", strokeWidth: 2, borderRadius: 72, opacity: 0.54 }),
      shapeLayer({ name: "図形 2（右立ち絵ガイド）", shapeType: "frame", x: 912, y: 158, width: 295, height: 448, fillColor: "#ff4cc218", strokeColor: "#ffc4f0", strokeWidth: 2, borderRadius: 72, opacity: 0.54 }),
      shapeLayer({ name: "図形 5（二人配置ライン）", shapeType: "line", x: 686, y: 620, width: 484, height: 16, fillColor: "#ffe8d8", strokeColor: "#ffe8d8", strokeWidth: 3, borderRadius: 8, opacity: 0.5 }),
      assetDecorationLayer({ name: "画像 6（ラベル帯）", src: `${thumbnailPhase4DecorationAssetPrefix}collaboration-label-band-base.svg`, x: 76, y: 62, width: 420, height: 98, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "GUEST", x: 156, y: 92, width: 230, height: 42, fontSize: 42, color: "#fff8ec", strokeColor: "#7d2307", strokeWidth: 2, shadowColor: "#25050b", shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 2, fontFamily: "Oswald", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "コラボ\n配信", x: 70, y: 170, width: 590, height: 250, fontSize: 116, lineHeight: 0.96, color: "#fff8ef", strokeColor: "#330804", strokeWidth: 14, shadowColor: "#ff4d31", shadowBlur: 12, shadowOffsetX: 5, shadowOffsetY: 7 }),
      assetDecorationLayer({ name: "画像 7（時刻バッジ）", src: `${thumbnailPhase4DecorationAssetPrefix}collaboration-time-badge-base.svg`, x: 86, y: 452, width: 470, height: 96, opacity: 0.98 }),
      textLayer({ name: "テキスト 2（時刻）", text: "20:00 START", x: 174, y: 476, width: 310, height: 52, fontSize: 46, color: "#fff2c2", strokeColor: "#23050a", strokeWidth: 3, shadowColor: "#ff3b86", shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 3（サブ）", text: "ゲスト名 / 企画名", x: 102, y: 584, width: 470, height: 50, fontSize: 36, align: "center", color: "#fffdf7", strokeColor: "#180610", strokeWidth: 4, shadowColor: "#ff7a2b", shadowBlur: 8, shadowOffsetX: 2, shadowOffsetY: 3 })
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
      assetDecorationLayer({ name: "画像 2（控えめな金色グリント）", src: `${thumbnailPhase4DecorationAssetPrefix}announcement-soft-glints.svg`, x: 0, y: 0, width: 1280, height: 720, opacity: 0.72 }),
      assetDecorationLayer({ name: "画像 3（右立ち絵guideの細線）", src: `${thumbnailPhase4DecorationAssetPrefix}announcement-guide-lines.svg`, x: 0, y: 0, width: 1280, height: 720, opacity: 0.82 }),
      assetDecorationLayer({ name: "画像 4（角飾り）", src: `${thumbnailPhase4DecorationAssetPrefix}x-corner-ornaments.svg`, x: 58, y: 88, width: 710, height: 480, opacity: 0.24 }),
      shapeLayer({ name: "図形 1（本文パネル）", shapeType: "frame", x: 70, y: 110, width: 650, height: 438, fillColor: "#040d1d8c", strokeColor: "#e8c369", strokeWidth: 2, borderRadius: 30, opacity: 0.7 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 826, y: 104, width: 390, height: 548, fillColor: "#ffeece12", strokeColor: "#ffe6aa", strokeWidth: 2, borderRadius: 92, opacity: 0.38 }),
      assetDecorationLayer({ name: "画像 5（ラベル帯）", src: `${thumbnailPhase4DecorationAssetPrefix}announcement-label-band-base.svg`, x: 142, y: 58, width: 460, height: 86, opacity: 0.98 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "NEWS", x: 274, y: 84, width: 198, height: 40, fontSize: 34, color: "#111827", strokeWidth: 0, shadowColor: "#ffffff", shadowBlur: 3, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Oswald" }),
      textLayer({ name: "テキスト 1（見出し）", text: "大切な\nお知らせ", x: 116, y: 164, width: 590, height: 228, fontSize: 82, lineHeight: 1.18, color: "#fff8e7", strokeColor: "#080d17", strokeWidth: 9, shadowColor: "#d99b42", shadowBlur: 10, shadowOffsetX: 3, shadowOffsetY: 4 }),
      shapeLayer({ name: "図形 5（本文罫線）", shapeType: "line", x: 126, y: 404, width: 530, height: 14, fillColor: "#e8c369", strokeColor: "#e8c369", strokeWidth: 3, borderRadius: 8, opacity: 0.82 }),
      assetDecorationLayer({ name: "画像 6（日付バッジ）", src: `${thumbnailPhase4DecorationAssetPrefix}announcement-date-badge-base.svg`, x: 104, y: 432, width: 548, height: 98, opacity: 0.98 }),
      textLayer({ name: "テキスト 2（時刻）", text: "5/10 公開", x: 202, y: 456, width: 360, height: 54, fontSize: 47, align: "center", color: "#fff0be", strokeColor: "#090c14", strokeWidth: 3, shadowColor: "#d59642", shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3 }),
      shapeLayer({ name: "図形 6（サブ下ライン）", shapeType: "line", x: 170, y: 620, width: 372, height: 12, fillColor: "#dfb86a", strokeColor: "#dfb86a", strokeWidth: 2, borderRadius: 8, opacity: 0.54 }),
      textLayer({ name: "テキスト 3（サブ）", text: "今後の活動について", x: 128, y: 552, width: 520, height: 52, fontSize: 34, align: "center", color: "#fffdf5", strokeColor: "#080c16", strokeWidth: 3, shadowColor: "#000000", shadowBlur: 7, shadowOffsetX: 2, shadowOffsetY: 3 })
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
      assetDecorationLayer({ name: "画像 2（週間予定の控えめな光）", src: `${thumbnailPhase4DecorationAssetPrefix}weekly-soft-glints.svg`, x: 0, y: 0, width: 1280, height: 720, opacity: 0.66 }),
      assetDecorationLayer({ name: "画像 3（丸ドット区切り）", src: `${thumbnailPhase4DecorationAssetPrefix}dot-dash-row.svg`, x: 662, y: 42, width: 538, height: 34, opacity: 0.3 }),
      assetDecorationLayer({ name: "画像 4（予定表の補助線）", src: `${thumbnailPhase4DecorationAssetPrefix}weekly-table-accent-lines.svg`, x: 630, y: 42, width: 610, height: 622, opacity: 0.9 }),
      shapeLayer({ name: "図形 4（予定表フレーム）", shapeType: "frame", x: 630, y: 46, width: 610, height: 614, fillColor: "#04172e40", strokeColor: "#a1fbff", strokeWidth: 2, borderRadius: 22, opacity: 0.62 }),
      shapeLayer({ name: "図形 5（予定表区切り線 上）", shapeType: "line", x: 666, y: 146, width: 526, height: 16, fillColor: "#8cf8ff", strokeColor: "#8cf8ff", strokeWidth: 2, borderRadius: 4, opacity: 0.32 }),
      shapeLayer({ name: "図形 6（予定表区切り線 下）", shapeType: "line", x: 666, y: 545, width: 526, height: 16, fillColor: "#8cf8ff", strokeColor: "#8cf8ff", strokeWidth: 2, borderRadius: 4, opacity: 0.3 }),
      shapeLayer({ name: "図形 2（ラベル）", shapeType: "rect", x: 150, y: 115, width: 345, height: 60, fillColor: "#081a33d9", strokeColor: "#a8fbff", strokeWidth: 2, borderRadius: 18, opacity: 0.9 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "WEEKLY SCHEDULE", x: 190, y: 130, width: 270, height: 35, fontSize: 28, color: "#bffbff", strokeWidth: 0, shadowColor: "#4dd8ff", shadowBlur: 8, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "今週の\n配信予定", x: 50, y: 185, width: 530, height: 240, fontSize: 98, lineHeight: 1.02, color: "#f8feff", align: "center", bold: true, italic: true, strokeColor: "#04143a", strokeWidth: 10, shadowColor: "#35e6ff", shadowBlur: 18, shadowOffsetX: 4, shadowOffsetY: 6 }),
      shapeLayer({ name: "図形 1（週範囲バッジ）", shapeType: "rect", x: 205, y: 400, width: 220, height: 65, fillColor: "#081b34b8", strokeColor: "#99fbff", strokeWidth: 2, borderRadius: 18, opacity: 0.78 }),
      assetDecorationLayer({ name: "画像 5（週範囲バッジ土台）", src: `${thumbnailPhase4DecorationAssetPrefix}weekly-range-badge-base.svg`, x: 182, y: 390, width: 300, height: 86, opacity: 0.98 }),
      textLayer({ name: "テキスト 2（時刻）", text: "5/4 - 5/10", x: 240, y: 415, width: 245, height: 40, fontSize: 35, color: "#ffffff", strokeColor: "#20306d", strokeWidth: 2, shadowColor: "#8ffcff", shadowBlur: 6, shadowOffsetX: 0, shadowOffsetY: 1, fontFamily: "Oswald" }),
      ...weeklyScheduleRowLayers(),
      assetDecorationLayer({ name: "画像 6（立ち絵guideの細線）", src: `${thumbnailPhase4DecorationAssetPrefix}weekly-standee-guide-lines.svg`, x: 70, y: 494, width: 530, height: 180, opacity: 0.76 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 80, y: 505, width: 510, height: 155, fillColor: "#0317242e", strokeColor: "#d8f8ff", strokeWidth: 2, borderRadius: 18, opacity: 0.42 })
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
      assetDecorationLayer({ name: "画像 2（淡い光粒）", src: `${thumbnailPhase4DecorationAssetPrefix}soft-light-particles.svg`, x: 514, y: 34, width: 620, height: 350, opacity: 0.22 }),
      assetDecorationLayer({ name: "画像 3（投稿カード土台）", src: `${thumbnailPhase4DecorationAssetPrefix}x-post-card-base.svg`, x: 64, y: 142, width: 780, height: 432, opacity: 0.98 }),
      assetDecorationLayer({ name: "画像 4（角飾り）", src: `${thumbnailPhase4DecorationAssetPrefix}x-corner-ornaments.svg`, x: 68, y: 154, width: 760, height: 430, opacity: 0.32 }),
      assetDecorationLayer({ name: "画像 5（立ち絵guideの細線）", src: `${thumbnailPhase4DecorationAssetPrefix}x-standee-guide-lines.svg`, x: 832, y: 78, width: 350, height: 558, opacity: 0.72 }),
      shapeLayer({ name: "図形 3（立ち絵挿入ガイド）", shapeType: "frame", x: 862, y: 100, width: 298, height: 520, fillColor: "#f8fbff08", strokeColor: "#8ca5df", strokeWidth: 2, borderRadius: 86, opacity: 0.26 }),
      assetDecorationLayer({ name: "画像 6（ラベル帯）", src: `${thumbnailPhase4DecorationAssetPrefix}x-label-band-base.svg`, x: 296, y: 142, width: 292, height: 74, opacity: 0.96 }),
      textLayer({ name: "テキスト 4（ラベル）", text: "X POST", x: 360, y: 165, width: 166, height: 32, fontSize: 29, color: "#ffffff", strokeColor: "#566cc4", strokeWidth: 2, shadowColor: "#ffffff", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald", align: "center" }),
      textLayer({ name: "テキスト 1（見出し）", text: "本日のお知らせ", x: 110, y: 270, width: 676, height: 92, fontSize: 76, lineHeight: 1, color: "#16246b", strokeColor: "#ffffff", strokeWidth: 0, shadowColor: "#cfdcff", shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 2 }),
      shapeLayer({ name: "図形 5（本文罫線）", shapeType: "line", x: 120, y: 395, width: 612, height: 16, fillColor: "#d1ad58", strokeColor: "#d1ad58", strokeWidth: 2, borderRadius: 8, opacity: 0.58 }),
      textLayer({ name: "テキスト 3（サブ）", text: "配信予定と最新情報をまとめました", x: 162, y: 426, width: 560, height: 42, fontSize: 30, align: "center", color: "#22306f", strokeColor: "#ffffff", strokeWidth: 0, shadowColor: "#dce6ff", shadowBlur: 3, shadowOffsetX: 0, shadowOffsetY: 1 }),
      assetDecorationLayer({ name: "画像 7（丸ドット点線）", src: `${thumbnailPhase4DecorationAssetPrefix}dot-dash-row.svg`, x: 236, y: 498, width: 428, height: 32, opacity: 0.26 }),
      assetDecorationLayer({ name: "画像 8（日付バッジ）", src: `${thumbnailPhase4DecorationAssetPrefix}x-date-badge-base.svg`, x: 278, y: 488, width: 344, height: 88, opacity: 0.98 }),
      shapeLayer({ name: "図形 6（日付バッジ端の光）", shapeType: "burst", x: 596, y: 514, width: 34, height: 34, fillColor: "#ffffff", strokeColor: "#d9bb66", strokeWidth: 2, borderRadius: 0, opacity: 0.42 }),
      textLayer({ name: "テキスト 2（時刻）", text: "05.06 WED", x: 354, y: 512, width: 200, height: 42, fontSize: 38, color: "#ffffff", strokeColor: "#536ac7", strokeWidth: 2, shadowColor: "#ffffff", shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 0, fontFamily: "Oswald", align: "center" })
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
