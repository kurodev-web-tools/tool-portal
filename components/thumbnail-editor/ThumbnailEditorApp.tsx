"use client";

import { ChangeEvent, MouseEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  cloneThumbnailLayer,
  applyThumbnailMainTextCarryover,
  applyThumbnailPresetPartial,
  applyThumbnailStandeePlacementPreset,
  applyThumbnailUserMaterialLayerFallback,
  createChattingIriamSquareDraft,
  createDarkGachaIriamSquareDraft,
  createNextRecentThumbnailPresetIds,
  createKaraokeIriamSquareDraft,
  createDraftFromPreset,
  createDraftFromPresetVariant,
  createImageLayer,
  createThumbnailMaterialLayer,
  createThumbnailUserMaterialLayer,
  createShapeLayer,
  createTextLayer,
  canAddThumbnailUserMaterialRef,
  drawThumbnail,
  formatThumbnailUserMaterialBytes,
  createNextRecentThumbnailFontFamilies,
  filterThumbnailFontListboxGroups,
  getThumbnailMainTextCarryover,
  getThumbnailFontManifestEntry,
  getThumbnailQualityGuardItems,
  getThumbnailOverallQualityGuardItems,
  getThumbnailQualityGuardSummary,
  getThumbnailUserMaterialUsageSummary,
  getLayerCenter,
  hitTestLayerHandle,
  isThumbnailDraftPristineForPreset,
  layerContainsPoint,
  normalizeThumbnailDraft,
  normalizeThumbnailLayerName,
  normalizeThumbnailRecentFontFamilies,
  normalizeThumbnailPresetDiscoveryState,
  pointToLayerLocal,
  replaceThumbnailUserMaterialLayerRef,
  getThumbnailIriamSquareKaraokeBackgroundAsset,
  getThumbnailIriamSquareKaraokeTitleAsset,
  getThumbnailIriamSquareTitleAsset,
  thumbnailCanvasSizes,
  thumbnailDraftStorageKey,
  thumbnailFontRecentStorageKey,
  thumbnailIriamSquareColorways,
  thumbnailIriamSquareKaraokeBackgroundStyles,
  thumbnailMainTextCarryoverTargets,
  thumbnailMaterialLibrary,
  thumbnailPresetDiscoveryStorageKey,
  thumbnailPresets,
  thumbnailPresetVariants,
  thumbnailStandeePlacementPresets,
  toggleThumbnailPresetFavorite,
  waitForThumbnailDraftFonts,
  type ThumbnailHandleKind,
  type ThumbnailMainTextCarryover,
  type ThumbnailResizeHandle,
  type ThumbnailCanvas,
  type ThumbnailCanvasSizeId,
  type ThumbnailEditorDraft,
  type ThumbnailIriamSquareChattingPresetConfig,
  type ThumbnailIriamSquareColorway,
  type ThumbnailIriamSquareDarkGachaPresetConfig,
  type ThumbnailIriamSquareKaraokeBackgroundStyle,
  type ThumbnailIriamSquareKaraokePresetConfig,
  type ThumbnailIriamSquareKaraokeTitleColorway,
  type ThumbnailIriamSquareTitleColorway,
  type ThumbnailLayer,
  type ThumbnailMaterialCategory,
  type ThumbnailPreset,
  type ThumbnailPresetCategory,
  type ThumbnailPresetDiscoveryState,
  type ThumbnailPresetId,
  type ThumbnailPresetVariantId,
  type ThumbnailQualityGuardItem,
  type ThumbnailQualityGuardSummary,
  type ThumbnailShapeType,
  type ThumbnailStandeePlacementPresetId,
  type ThumbnailTextAlign,
  type ThumbnailUserMaterialUsageSummary,
  type ThumbnailUserMaterialRef
} from "@/lib/thumbnail-editor";
import { useLocale } from "@/components/portal/LocaleProvider";
import type { Locale } from "@/lib/locale";
import {
  filterLocalizedThumbnailPresets,
  filterLocalizedThumbnailMaterials,
  getLocalizedThumbnailQualityGuardItems,
  getLocalizedThumbnailQualityGuardSummary,
  getThumbnailEditorCopy,
  getThumbnailFontCategoryLabel,
  getThumbnailFontLanguageLabel,
  getThumbnailFontMoodLabel,
  getThumbnailLayerDisplayName,
  getThumbnailMainTextCarryoverLabel,
  getThumbnailMaterialCategoryLabel,
  getThumbnailMaterialDescription,
  getThumbnailMaterialName,
  getThumbnailMaterialRecommendedPlacement,
  getThumbnailPresetCategoryLabel,
  getThumbnailPresetDescription,
  getThumbnailPresetName,
  getThumbnailPresetVariantDescription,
  getThumbnailPresetVariantLabel,
  getThumbnailPresetUsageLabel,
  getThumbnailStandeePlacementDescription,
  getThumbnailStandeePlacementGroup,
  getThumbnailStandeePlacementName,
  localizeThumbnailPresetTextLayerBodies
} from "@/lib/thumbnail-editor-copy";
import { createHandoffFileNameBase } from "@/lib/file-name";
import {
  buildToolHandoffUrl,
  createThumbnailToSnsHandoffPayload,
  readToolHandoff,
  writeToolHandoff,
  type ScheduleHandoffPayload
} from "@/lib/tool-handoff";
import { writeStoredImageSource } from "@/components/sns-split-image-maker/snsSplitDraftPersistence";
import {
  deleteThumbnailUserMaterialImage,
  isThumbnailUserMaterialFile,
  readThumbnailUserMaterialRefsMetadata,
  resolveThumbnailUserMaterialImageUrl,
  saveThumbnailUserMaterialFile,
  writeThumbnailUserMaterialRefsMetadata
} from "@/components/thumbnail-editor/thumbnailUserMaterialStorage";
import thumbnailFontAssets from "@/components/thumbnail-editor/thumbnailFontAssets.module.css";

type ToastTone = "info" | "success" | "warning" | "error";
type ToastState = { tone: ToastTone; message: string } | null;
type MobilePanel = "canvas" | "materials" | "layers" | "text" | "export";
type EditorMode = "edit" | "pan";
type PresetApplyMode = "plain" | "carryover" | "handoff";
type CanvasInteractionMode = "drag" | "resize" | "rotate";
type CanvasCursor = "default" | "move" | "grab" | "grabbing" | "crosshair" | "nwse-resize" | "nesw-resize";
type IriamSquarePresetModalPresetId = "karaoke" | "dark_gacha" | "chatting";
type IriamSquarePresetModalConfig = ThumbnailIriamSquareKaraokePresetConfig | ThumbnailIriamSquareDarkGachaPresetConfig | ThumbnailIriamSquareChattingPresetConfig;
type CanvasInteractionState = {
  pointerId: number;
  pointerType: string;
  layerId: string;
  mode: CanvasInteractionMode;
  resizeHandle?: ThumbnailResizeHandle;
  startPointer: { x: number; y: number };
  startLayer: ThumbnailLayer;
  startDraft: ThumbnailEditorDraft;
  startCenter: { x: number; y: number };
  rotateOffsetRad: number;
  moved: boolean;
};
type CanvasPanState = {
  pointerId: number;
  pointerType: string;
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startScrollTop: number;
  moved: boolean;
};
type InlineTextEditState = {
  layerId: string;
  value: string;
};
type LastTapState = {
  time: number;
  clientX: number;
  clientY: number;
  layerId: string | null;
};
type DraftHistoryState = {
  past: ThumbnailEditorDraft[];
  future: ThumbnailEditorDraft[];
};
type DraftHistoryAvailability = {
  canUndo: boolean;
  canRedo: boolean;
};
type PreviewControlToolbarCopy = ReturnType<typeof getThumbnailEditorCopy>["canvas"];

const toneClassName: Record<ToastTone, string> = {
  info: "border-sky-400/60 bg-sky-500/12 text-foreground",
  success: "border-emerald-400/60 bg-emerald-500/12 text-foreground",
  warning: "border-amber-400/60 bg-amber-500/12 text-foreground",
  error: "border-rose-400/60 bg-rose-500/12 text-foreground"
};
const maxDraftHistoryEntries = 30;

const areDraftHistorySnapshotsEqual = (a: ThumbnailEditorDraft, b: ThumbnailEditorDraft) =>
  JSON.stringify({ ...a, updatedAt: "" }) === JSON.stringify({ ...b, updatedAt: "" });

const withDraftUpdatedAt = (value: ThumbnailEditorDraft): ThumbnailEditorDraft => ({
  ...value,
  updatedAt: new Date().toISOString()
});

const fitZoomForCanvas = (canvasWidth: number, canvasHeight: number, viewportWidth: number, viewportHeight: number) => {
  const paddedWidth = Math.max(320, viewportWidth - 48);
  const paddedHeight = Math.max(220, viewportHeight - 280);
  const next = Math.min(paddedWidth / canvasWidth, paddedHeight / canvasHeight, 1.15);
  return clamp(Number(next.toFixed(2)), 0.42, 1.6);
};

const mobilePanelItems: { id: MobilePanel; icon: string }[] = [
  { id: "canvas", icon: "▧" },
  { id: "materials", icon: "◇" },
  { id: "layers", icon: "▤" },
  { id: "text", icon: "T" },
  { id: "export", icon: "⇧" }
];
function CanvasCenterGuideOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-base" aria-hidden="true" data-thumbnail-preview-guide="center">
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 border-l border-dashed border-white/55 opacity-80 shadow-[0_0_0_1px_rgba(0,0,0,0.28)]" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 border-t border-dashed border-white/55 opacity-80 shadow-[0_0_0_1px_rgba(0,0,0,0.28)]" />
    </div>
  );
}

function PreviewControlToolbar({
  copy,
  zoom,
  showCenterGuide,
  canUndo,
  canRedo,
  compact = false,
  onUndo,
  onRedo,
  onGuideToggle,
  onZoomOut,
  onZoomIn,
  onZoomReset,
  onZoomFit
}: {
  copy: PreviewControlToolbarCopy;
  zoom: number;
  showCenterGuide: boolean;
  canUndo: boolean;
  canRedo: boolean;
  compact?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onGuideToggle: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
}) {
  const buttonSize = compact ? "h-9" : "h-8";
  const iconButton = `${buttonSize} w-9 text-xs`;
  const textButton = `${buttonSize} px-3 text-xs font-bold`;
  const toolbarWidth = compact ? "w-[calc(100vw-6.5rem)] max-w-[20rem]" : "max-w-full";

  return (
    <div className={`scrollbar-accent flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-gutter:stable] ${toolbarWidth}`} data-thumbnail-preview-toolbar="controls">
      <button className={`flat-control ${iconButton}`} type="button" onClick={onUndo} disabled={!canUndo} aria-label={copy.undo} title={`${copy.undo} (Ctrl+Z)`}>
        ↶
      </button>
      <button className={`flat-control ${iconButton}`} type="button" onClick={onRedo} disabled={!canRedo} aria-label={copy.redo} title={`${copy.redo} (Ctrl+Y / Ctrl+Shift+Z)`}>
        ↷
      </button>
      <button
        className={`flat-control ${textButton} ${showCenterGuide ? "border-primary bg-primary-soft text-primary-strong" : ""}`}
        type="button"
        onClick={onGuideToggle}
        aria-pressed={showCenterGuide}
        aria-label={showCenterGuide ? copy.hideGuide : copy.showGuide}
        title={showCenterGuide ? copy.hideGuide : copy.showGuide}
      >
        {copy.guide}
      </button>
      <span className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
      <button className={`flat-control ${iconButton}`} type="button" onClick={onZoomOut} title={copy.zoomOut} aria-label={copy.zoomOutAria}>
        −
      </button>
      <button className={`flat-control ${compact ? "h-9 w-16" : "h-8 w-14"} text-xs font-bold`} type="button" onClick={onZoomReset} aria-label={copy.zoomResetAria} title={copy.zoomReset}>
        {Math.round(zoom * 100)}%
      </button>
      <button className={`flat-control ${iconButton}`} type="button" onClick={onZoomIn} title={copy.zoomIn} aria-label={copy.zoomInAria}>
        +
      </button>
      <button className={`flat-control ${textButton}`} type="button" onClick={onZoomFit} aria-label={copy.zoomFitAria} title={copy.zoomFitAria}>
        {copy.zoomFit}
      </button>
    </div>
  );
}

const colorSwatches = [
  "#ffffff",
  "#000000",
  "#1ed7c6",
  "#37a0ff",
  "#8d4df5",
  "#ff7b54",
  "#f7b500",
  "#e8415f"
];
const imageUploadMaxBytes = 8 * 1024 * 1024;
const allowedImageMimeTypes = new Set(["image/png", "image/jpeg"]);
const allowedImageExtensions = new Set(["png", "jpg", "jpeg"]);

const selectedLayerFallback = (layers: ThumbnailLayer[]) => layers[layers.length - 1]?.id ?? null;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const clampFinite = (value: number, min: number, max: number, fallback = min) => clamp(Number.isFinite(value) ? value : fallback, min, max);
const toHexByte = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
const normalizeHexColor = (value: string, fallback = "#ffffff") => {
  const normalized = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized.toLowerCase()}`;
  }
  return fallback;
};
const hexToRgb = (value: string) => {
  const hex = normalizeHexColor(value).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
};
const rgbToHex = (r: number, g: number, b: number) => `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
const rgbToHsv = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }
  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100
  };
};
const hsvToHex = (h: number, s: number, v: number) => {
  const safeH = ((h % 360) + 360) % 360;
  const safeS = clamp(s, 0, 100) / 100;
  const safeV = clamp(v, 0, 100) / 100;
  const c = safeV * safeS;
  const x = c * (1 - Math.abs(((safeH / 60) % 2) - 1));
  const m = safeV - c;
  const [rp, gp, bp] =
    safeH < 60
      ? [c, x, 0]
      : safeH < 120
        ? [x, c, 0]
        : safeH < 180
          ? [0, c, x]
          : safeH < 240
            ? [0, x, c]
            : safeH < 300
              ? [x, 0, c]
              : [c, 0, x];
  return rgbToHex((rp + m) * 255, (gp + m) * 255, (bp + m) * 255);
};
const getDefaultZoomForViewport = () => {
  if (typeof window === "undefined") {
    return 0.72;
  }
  if (window.innerWidth >= 1280) {
    return 0.72;
  }
  if (window.innerWidth >= 1024) {
    return 0.56;
  }
  return 0.42;
};
const normalizeDeg = (deg: number) => {
  let value = deg % 360;
  if (value > 180) {
    value -= 360;
  }
  if (value < -180) {
    value += 360;
  }
  return value;
};
const isValidImageFile = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return allowedImageMimeTypes.has(file.type) && allowedImageExtensions.has(extension);
};
const formatHandoffDate = (date: string) => {
  const [, month, day] = date.split("-");
  return month && day ? `${Number(month)}/${Number(day)}` : date;
};
const firstMeaningfulLine = (text: string) => text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
const compactLayerText = (text: string, maxLength: number) => (text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text);
const thumbnailToSnsImageStoragePrefix = "thumbnail-handoff";
const getFirstTextLayerValue = (draft: ThumbnailEditorDraft, namePart: string) => {
  const layer = draft.layers.find((item) => item.type === "text" && item.name.includes(namePart));
  return layer?.type === "text" ? firstMeaningfulLine(layer.text) : "";
};
const defaultPresetDiscoveryState: ThumbnailPresetDiscoveryState = {
  version: 1,
  recentPresetIds: [],
  favoritePresetIds: [],
  recentPresetVariantRefs: [],
  favoritePresetVariantRefs: []
};
const weeklyScheduleLayerGroupPattern = /^(月曜|火曜|水曜|木曜|金曜|土曜|日曜) \/ (曜日|時間|予定)$/;
const weeklyScheduleGroupOrder = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];
const weeklyScheduleColumnOrder = ["曜日", "時間", "予定"];
const getWeeklyScheduleLayerGroup = (layer: ThumbnailLayer) => {
  const match = layer.name.match(weeklyScheduleLayerGroupPattern);
  if (!match) {
    return null;
  }

  return {
    groupId: match[1],
    groupLabel: match[1],
    itemLabel: match[2]
  };
};
const getPresetsByIds = (presetIds: ThumbnailPresetId[]) =>
  presetIds
    .map((presetId) => thumbnailPresets.find((preset) => preset.id === presetId))
    .filter((preset): preset is ThumbnailPreset => Boolean(preset));
const isPresetSelectableForVariant = (presetId: ThumbnailPresetId, variantId: ThumbnailPresetVariantId) =>
  variantId === "square-1-1" ? presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting" || presetId === "first_stream" : presetId !== "dark_gacha";
const getThumbnailPresetsForVariant = (variantId: ThumbnailPresetVariantId) =>
  thumbnailPresets.filter((preset) => isPresetSelectableForVariant(preset.id, variantId));
const defaultThumbnailIriamSquarePresetConfig: ThumbnailIriamSquareKaraokePresetConfig = {
  backgroundStyle: "soft_cloud",
  backgroundColorway: "pink-blue",
  titleColorway: "match-background"
};
const defaultThumbnailIriamSquareDarkGachaPresetConfig: ThumbnailIriamSquareDarkGachaPresetConfig = {
  backgroundColorway: "purple",
  titleColorway: "match-background"
};
const defaultThumbnailIriamSquareChattingPresetConfig: ThumbnailIriamSquareChattingPresetConfig = {
  backgroundColorway: "pink-blue",
  titleColorway: "match-background"
};
const createThumbnailToSnsImageStorageId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${thumbnailToSnsImageStoragePrefix}-${crypto.randomUUID()}`;
  }
  return `${thumbnailToSnsImageStoragePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
const scheduleHandoffCanvasFallbacks: Record<Locale, { title: string; label: string }> = {
  ja: { title: "無題の予定", label: "配信告知" },
  en: { title: "Untitled event", label: "Stream notice" }
};
const applyScheduleHandoffToThumbnailDraft = (draft: ThumbnailEditorDraft, payload: ScheduleHandoffPayload, locale: Locale): ThumbnailEditorDraft => {
  const fallback = scheduleHandoffCanvasFallbacks[locale] ?? scheduleHandoffCanvasFallbacks.ja;
  const titleText = compactLayerText(payload.title || fallback.title, 42);
  const dateText = formatHandoffDate(payload.date);
  const timeRange = [payload.startTime, payload.endTime].filter(Boolean).join("-");
  const timeText = compactLayerText([dateText, timeRange].filter(Boolean).join(" "), 24);
  const subText = compactLayerText(
    firstMeaningfulLine(payload.announcementText) ||
      [formatHandoffDate(payload.date), payload.categoryLabel, payload.hashtags].filter(Boolean).join(" / "),
    54
  );
  const labelText = compactLayerText([payload.categoryLabel, payload.platform].filter(Boolean).join(" / ") || payload.announcementStatusLabel || fallback.label, 22);
  let selectedLayerId = draft.selectedLayerId;
  const layers = draft.layers.map((layer) => {
    if (layer.type !== "text") {
      return layer;
    }

    if (layer.name.includes("見出し")) {
      selectedLayerId = layer.id;
      return { ...layer, text: titleText };
    }

    if (layer.name.includes("時刻")) {
      return { ...layer, text: timeText };
    }

    if (layer.name.includes("サブ")) {
      return { ...layer, text: subText };
    }

    if (layer.name.includes("ラベル")) {
      return { ...layer, text: labelText };
    }

    return layer;
  });

  return { ...draft, layers, selectedLayerId, updatedAt: new Date().toISOString() };
};
const createThumbnailDraftFromHandoff = (payload: ScheduleHandoffPayload, locale: Locale, canvas = thumbnailCanvasSizes.hd): ThumbnailEditorDraft =>
  applyScheduleHandoffToThumbnailDraft(createDraftFromPreset("stream_announce", canvas), payload, locale);

export function ThumbnailEditorApp() {
  const { locale, isLocaleReady } = useLocale();
  const copy = getThumbnailEditorCopy(locale);
  const createPresetDraftForLocale = useCallback(
    (presetId: ThumbnailPresetId = "stream_announce", canvas: ThumbnailCanvas = thumbnailCanvasSizes.hd) =>
      localizeThumbnailPresetTextLayerBodies(createDraftFromPreset(presetId, canvas), locale),
    [locale]
  );
  const [draft, setDraft] = useState<ThumbnailEditorDraft>(() =>
    localizeThumbnailPresetTextLayerBodies(createDraftFromPreset(), locale)
  );
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("canvas");
  const [zoom, setZoom] = useState(0.72);
  const [showCenterGuide, setShowCenterGuide] = useState(true);
  const [draftHistoryAvailability, setDraftHistoryAvailability] = useState<DraftHistoryAvailability>({ canUndo: false, canRedo: false });
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState<"preset" | "canvas" | "variant" | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [handoffPayload, setHandoffPayload] = useState<ScheduleHandoffPayload | null>(null);
  const [presetDiscoveryState, setPresetDiscoveryState] = useState<ThumbnailPresetDiscoveryState>(defaultPresetDiscoveryState);
  const [userMaterialRefs, setUserMaterialRefs] = useState<ThumbnailUserMaterialRef[]>([]);
  const [userMaterialImageUrls, setUserMaterialImageUrls] = useState<Record<string, string>>({});
  const [replaceUserMaterialRef, setReplaceUserMaterialRef] = useState<ThumbnailUserMaterialRef | null>(null);
  const [pendingPresetApplyId, setPendingPresetApplyId] = useState<ThumbnailPresetId | null>(null);
  const [iriamSquarePresetModalPresetId, setIriamSquarePresetModalPresetId] = useState<IriamSquarePresetModalPresetId | null>(null);
  const [thumbnailIriamSquarePresetConfig, setThumbnailIriamSquarePresetConfig] = useState<ThumbnailIriamSquareKaraokePresetConfig>(defaultThumbnailIriamSquarePresetConfig);
  const [thumbnailIriamSquareDarkGachaPresetConfig, setThumbnailIriamSquareDarkGachaPresetConfig] = useState<ThumbnailIriamSquareDarkGachaPresetConfig>(defaultThumbnailIriamSquareDarkGachaPresetConfig);
  const [thumbnailIriamSquareChattingPresetConfig, setThumbnailIriamSquareChattingPresetConfig] = useState<ThumbnailIriamSquareChattingPresetConfig>(defaultThumbnailIriamSquareChattingPresetConfig);
  const [inlineTextEdit, setInlineTextEdit] = useState<InlineTextEditState | null>(null);
  const [canvasCursor, setCanvasCursor] = useState<CanvasCursor>("grab");
  const [canvasAttachVersion, setCanvasAttachVersion] = useState(0);
  const [mobilePreviewCanvasAttachVersion, setMobilePreviewCanvasAttachVersion] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobilePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userMaterialFileInputRef = useRef<HTMLInputElement | null>(null);
  const inlineTextEditTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftRef = useRef<ThumbnailEditorDraft>(draft);
  const draftHistoryRef = useRef<DraftHistoryState>({ past: [], future: [] });
  const interactionRef = useRef<CanvasInteractionState | null>(null);
  const panRef = useRef<CanvasPanState | null>(null);
  const lastTapRef = useRef<LastTapState | null>(null);
  const userAdjustedZoomRef = useRef(false);
  const canvasRenderVersionRef = useRef(0);
  const mobilePreviewRenderVersionRef = useRef(0);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const selectedLayer = useMemo(
    () => draft.layers.find((layer) => layer.id === draft.selectedLayerId) ?? null,
    [draft.layers, draft.selectedLayerId]
  );
  const inlineTextEditLayerId = inlineTextEdit?.layerId ?? null;
  const inlinePreviewDraft = useMemo<ThumbnailEditorDraft>(
    () =>
      inlineTextEdit
        ? {
            ...draft,
            layers: draft.layers.map((layer) =>
              layer.id === inlineTextEdit.layerId && layer.type === "text" && !layer.locked && !layer.hidden
                ? { ...layer, text: inlineTextEdit.value }
                : layer
            )
          }
        : draft,
    [draft, inlineTextEdit]
  );
  const resolvedPreviewDraft = useMemo(
    () => ({
      ...inlinePreviewDraft,
      layers: inlinePreviewDraft.layers.map((layer) =>
        layer.type === "image" && layer.materialRef
          ? { ...layer, src: userMaterialImageUrls[layer.materialRef.storageId] ?? layer.src }
          : layer
      )
    }),
    [inlinePreviewDraft, userMaterialImageUrls]
  );
  const resolvedDraft = useMemo(
    () => ({
      ...draft,
      layers: draft.layers.map((layer) =>
        layer.type === "image" && layer.materialRef
          ? { ...layer, src: userMaterialImageUrls[layer.materialRef.storageId] ?? layer.src }
          : layer
      )
    }),
    [draft, userMaterialImageUrls]
  );
  const qualityGuardItems = useMemo(
    () => getThumbnailQualityGuardItems(resolvedDraft, selectedLayer?.id ?? draft.selectedLayerId),
    [draft.selectedLayerId, resolvedDraft, selectedLayer?.id]
  );
  const overallQualityGuardItems = useMemo(() => getThumbnailOverallQualityGuardItems(resolvedDraft), [resolvedDraft]);
  const localizedQualityGuardItems = useMemo(() => getLocalizedThumbnailQualityGuardItems(qualityGuardItems, locale), [locale, qualityGuardItems]);
  const localizedOverallQualityGuardItems = useMemo(() => getLocalizedThumbnailQualityGuardItems(overallQualityGuardItems, locale), [locale, overallQualityGuardItems]);
  const overallQualityGuardSummary = useMemo(
    () => getLocalizedThumbnailQualityGuardSummary(getThumbnailQualityGuardSummary(overallQualityGuardItems), localizedOverallQualityGuardItems, locale),
    [locale, localizedOverallQualityGuardItems, overallQualityGuardItems]
  );

  const selectedPresetBase = useMemo(
    () => thumbnailPresets.find((preset) => preset.id === draft.presetId) ?? thumbnailPresets[0],
    [draft.presetId]
  );
  const selectedPresetName = getThumbnailPresetName(selectedPresetBase.id, locale, selectedPresetBase.name);
  const currentVariantId: ThumbnailPresetVariantId =
    (Object.values(thumbnailPresetVariants).find((variant) => variant.canvas.width === draft.canvas.width && variant.canvas.height === draft.canvas.height)?.id as ThumbnailPresetVariantId | undefined) ??
    "landscape-16-9";
  const pendingPreset = useMemo(
    () => thumbnailPresets.find((preset) => preset.id === pendingPresetApplyId) ?? null,
    [pendingPresetApplyId]
  );
  const currentMainTextCarryover = useMemo(() => getThumbnailMainTextCarryover(draft), [draft]);
  const pendingPresetDefaultText = useMemo(
    () => (pendingPreset ? getThumbnailMainTextCarryover(createPresetDraftForLocale(pendingPreset.id, draft.canvas)) : {}),
    [createPresetDraftForLocale, draft.canvas, pendingPreset]
  );
  const userMaterialUsageSummary = useMemo(() => getThumbnailUserMaterialUsageSummary(userMaterialRefs), [userMaterialRefs]);
  const inlineTextEditLayer = useMemo<Extract<ThumbnailLayer, { type: "text" }> | null>(() => {
    const layer = draft.layers.find((item) => item.id === inlineTextEditLayerId);
    return layer && layer.type === "text" && !layer.locked && !layer.hidden ? layer : null;
  }, [draft.layers, inlineTextEditLayerId]);
  const inlineTextEditStyle = useMemo<CSSProperties | null>(() => {
    if (!inlineTextEditLayer) {
      return null;
    }
    const minCanvasWidth = Math.min(160, draft.canvas.width);
    const minCanvasHeight = Math.min(48, draft.canvas.height);
    const safeLeft = clamp(inlineTextEditLayer.x, 0, Math.max(0, draft.canvas.width - minCanvasWidth));
    const safeTop = clamp(inlineTextEditLayer.y, 0, Math.max(0, draft.canvas.height - minCanvasHeight));
    const safeWidth = clamp(inlineTextEditLayer.width, minCanvasWidth, Math.max(minCanvasWidth, draft.canvas.width - safeLeft));
    const safeHeight = clamp(inlineTextEditLayer.height, minCanvasHeight, Math.max(minCanvasHeight, draft.canvas.height - safeTop));

    return {
      left: `${safeLeft * zoom}px`,
      top: `${safeTop * zoom}px`,
      width: `${safeWidth * zoom}px`,
      height: `${safeHeight * zoom}px`,
      transform: `rotate(${inlineTextEditLayer.rotation}deg)`,
      transformOrigin: "center",
      fontFamily: inlineTextEditLayer.fontFamily,
      fontSize: `${clamp(inlineTextEditLayer.fontSize * zoom, 12, 96)}px`,
      lineHeight: inlineTextEditLayer.lineHeight,
      fontWeight: inlineTextEditLayer.bold ? 800 : 500,
      fontStyle: inlineTextEditLayer.italic ? "italic" : "normal",
      textAlign: inlineTextEditLayer.align,
      color: "transparent",
      caretColor: "#1ed7c6",
      opacity: clamp(inlineTextEditLayer.opacity, 0.2, 1),
      overflow: "hidden"
    };
  }, [draft.canvas.height, draft.canvas.width, inlineTextEditLayer, zoom]);

  useEffect(() => {
    setFontMenuOpen(false);
  }, [draft.selectedLayerId]);
  useEffect(() => {
    setHeaderMenuOpen(null);
  }, [draft.presetId, draft.canvas.width, draft.canvas.height]);
  useEffect(() => {
    if (!headerMenuOpen) {
      return;
    }

    const handleHeaderMenuPointerDown = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-thumbnail-menu-root]")) {
        return;
      }
      setHeaderMenuOpen(null);
    };
    const handleHeaderMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHeaderMenuOpen(null);
      }
    };

    document.addEventListener("pointerdown", handleHeaderMenuPointerDown);
    document.addEventListener("keydown", handleHeaderMenuKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleHeaderMenuPointerDown);
      document.removeEventListener("keydown", handleHeaderMenuKeyDown);
    };
  }, [headerMenuOpen]);
  useEffect(() => {
    setCanvasCursor(editorMode === "pan" ? "grab" : "default");
  }, [editorMode]);
  useEffect(() => {
    if (!inlineTextEdit) {
      return;
    }
    if (!inlineTextEditLayer) {
      setInlineTextEdit(null);
    }
  }, [inlineTextEdit, inlineTextEditLayer]);
  useEffect(() => {
    if (!inlineTextEditLayerId) {
      return;
    }
    const textarea = inlineTextEditTextareaRef.current;
    textarea?.focus();
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [inlineTextEditLayerId]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(thumbnailPresetDiscoveryStorageKey);
      setPresetDiscoveryState(saved ? normalizeThumbnailPresetDiscoveryState(JSON.parse(saved)) : defaultPresetDiscoveryState);
    } catch {
      window.localStorage.removeItem(thumbnailPresetDiscoveryStorageKey);
      setPresetDiscoveryState(defaultPresetDiscoveryState);
    }
    setUserMaterialRefs(readThumbnailUserMaterialRefsMetadata());
  }, []);
  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    Promise.all(
      userMaterialRefs.map(async (ref) => {
        const url = await resolveThumbnailUserMaterialImageUrl(ref).catch(() => null);
        if (url) {
          createdUrls.push(url);
        }
        return [ref.storageId, url] as const;
      })
    ).then((entries) => {
      if (cancelled) {
        for (const url of createdUrls) {
          URL.revokeObjectURL(url);
        }
        return;
      }
      const nextUrls = Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
      const missingStorageIds = entries.filter(([, url]) => !url).map(([storageId]) => storageId);
      if (missingStorageIds.length > 0) {
        setDraft((current) =>
          missingStorageIds.reduce((nextDraft, storageId) => applyThumbnailUserMaterialLayerFallback(nextDraft, storageId, "load-failed"), current)
        );
      }
      setUserMaterialImageUrls((current) => {
        for (const url of Object.values(current)) {
          URL.revokeObjectURL(url);
        }
        return nextUrls;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [userMaterialRefs]);
  useEffect(
    () => () => {
      for (const url of Object.values(userMaterialImageUrls)) {
        URL.revokeObjectURL(url);
      }
    },
    [userMaterialImageUrls]
  );
  useEffect(() => {
    const updateDefaultZoom = () => {
      if (!userAdjustedZoomRef.current) {
        setZoom(getDefaultZoomForViewport());
      }
    };
    updateDefaultZoom();
    window.addEventListener("resize", updateDefaultZoom);
    return () => window.removeEventListener("resize", updateDefaultZoom);
  }, []);

  const showToast = useCallback((tone: ToastTone, message: string) => {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 3200);
  }, []);
  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    setCanvasAttachVersion((version) => version + 1);
  }, []);
  const setMobilePreviewCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    mobilePreviewCanvasRef.current = node;
    setMobilePreviewCanvasAttachVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (!isLocaleReady) {
      return;
    }
    try {
      const handoffPayload = readToolHandoff("thumbnail-editor");
      if (handoffPayload) {
        setDraft(createThumbnailDraftFromHandoff(handoffPayload, locale));
        setHandoffPayload(handoffPayload);
        showToast("success", copy.toasts.handoffApplied);
        setHydrated(true);
        return;
      }

      const saved = window.localStorage.getItem(thumbnailDraftStorageKey);
      if (!saved) {
        setDraft((current) =>
          locale === "en" && isThumbnailDraftPristineForPreset(current)
            ? localizeThumbnailPresetTextLayerBodies(current, locale)
            : current
        );
        setHydrated(true);
        return;
      }
      const normalized = normalizeThumbnailDraft(JSON.parse(saved));
      if (normalized) {
        setDraft(normalized);
        showToast("info", copy.toasts.restored);
      } else {
        window.localStorage.removeItem(thumbnailDraftStorageKey);
        setDraft(createPresetDraftForLocale());
        showToast("warning", copy.toasts.brokenDraft);
      }
    } catch {
      window.localStorage.removeItem(thumbnailDraftStorageKey);
      setDraft(createPresetDraftForLocale());
      showToast("warning", copy.toasts.brokenDraft);
    } finally {
      setHydrated(true);
    }
  }, [copy.toasts.brokenDraft, copy.toasts.handoffApplied, copy.toasts.restored, createPresetDraftForLocale, isLocaleReady, locale, showToast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const renderVersion = (canvasRenderVersionRef.current += 1);

    const renderThumbnailPreview = async () => {
      const buffer = document.createElement("canvas");
      try {
        await drawThumbnail(buffer, resolvedPreviewDraft, { selectedLayerId: draft.selectedLayerId, includeSelection: true });
        if (canvasRenderVersionRef.current !== renderVersion || canvasRef.current !== canvas) {
          return;
        }
        canvas.width = buffer.width;
        canvas.height = buffer.height;
        const context = canvas.getContext("2d");
        context?.clearRect(0, 0, canvas.width, canvas.height);
        context?.drawImage(buffer, 0, 0);
      } catch {
        if (canvasRenderVersionRef.current === renderVersion) {
          showToast("error", copy.messages.canvasRenderFailed);
        }
      }
    };
    const renderThumbnailPreviewAfterFonts = async () => {
      await waitForThumbnailDraftFonts(resolvedPreviewDraft);
      await renderThumbnailPreview();
    };

    void renderThumbnailPreview();
    void renderThumbnailPreviewAfterFonts();
  }, [canvasAttachVersion, copy.messages.canvasRenderFailed, draft.selectedLayerId, resolvedPreviewDraft, showToast]);

  useEffect(() => {
    if (!mobilePreviewOpen) {
      return;
    }

    const canvas = mobilePreviewCanvasRef.current;
    if (!canvas) {
      return;
    }

    const renderVersion = (mobilePreviewRenderVersionRef.current += 1);

    const renderMobileThumbnailPreview = async () => {
      const buffer = document.createElement("canvas");
      try {
        await drawThumbnail(buffer, resolvedDraft, { selectedLayerId: null, includeSelection: false });
        if (mobilePreviewRenderVersionRef.current !== renderVersion || mobilePreviewCanvasRef.current !== canvas) {
          return;
        }
        canvas.width = buffer.width;
        canvas.height = buffer.height;
        const context = canvas.getContext("2d");
        context?.clearRect(0, 0, canvas.width, canvas.height);
        context?.drawImage(buffer, 0, 0);
      } catch {
        if (mobilePreviewRenderVersionRef.current === renderVersion) {
          showToast("error", copy.messages.fullPreviewRenderFailed);
        }
      }
    };
    const renderMobileThumbnailPreviewAfterFonts = async () => {
      await waitForThumbnailDraftFonts(resolvedDraft);
      await renderMobileThumbnailPreview();
    };

    void renderMobileThumbnailPreview();
    void renderMobileThumbnailPreviewAfterFonts();
  }, [copy.messages.fullPreviewRenderFailed, mobilePreviewCanvasAttachVersion, mobilePreviewOpen, resolvedDraft, showToast]);

  useEffect(() => {
    if (!mobilePreviewOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobilePreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobilePreviewOpen]);

  useEffect(() => {
    if (!pendingPresetApplyId) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPendingPresetApplyId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pendingPresetApplyId]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const timer = window.setTimeout(() => {
      const normalized = normalizeThumbnailDraft(draft);
      if (!normalized) {
        showToast("error", copy.messages.invalidAutoSave);
        return;
      }
      try {
        window.localStorage.setItem(
          thumbnailDraftStorageKey,
          JSON.stringify({ ...normalized, updatedAt: new Date().toISOString() })
        );
      } catch {
        showToast("error", copy.messages.autoSaveFailed);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [copy.messages.autoSaveFailed, copy.messages.invalidAutoSave, draft, hydrated, showToast]);

  const syncDraftHistoryAvailability = useCallback(() => {
    const history = draftHistoryRef.current;
    setDraftHistoryAvailability({ canUndo: history.past.length > 0, canRedo: history.future.length > 0 });
  }, []);

  const pushDraftHistory = useCallback(
    (previous: ThumbnailEditorDraft, next: ThumbnailEditorDraft) => {
      if (areDraftHistorySnapshotsEqual(previous, next)) {
        return;
      }
      const history = draftHistoryRef.current;
      history.past = [...history.past, previous].slice(-maxDraftHistoryEntries);
      history.future = [];
      syncDraftHistoryAvailability();
    },
    [syncDraftHistoryAvailability]
  );

  const replaceDraft = useCallback(
    (nextDraft: ThumbnailEditorDraft, options: { recordHistory?: boolean } = {}) => {
      const next = withDraftUpdatedAt(nextDraft);
      if (options.recordHistory) {
        pushDraftHistory(draftRef.current, next);
      }
      draftRef.current = next;
      setDraft(next);
    },
    [pushDraftHistory]
  );

  const updateDraft = useCallback(
    (updater: (current: ThumbnailEditorDraft) => ThumbnailEditorDraft) => {
      const current = draftRef.current;
      const next = withDraftUpdatedAt(updater(current));
      pushDraftHistory(current, next);
      draftRef.current = next;
      setDraft(next);
    },
    [pushDraftHistory]
  );

  const undoDraft = () => {
    const history = draftHistoryRef.current;
    const previous = history.past.at(-1);
    if (!previous) {
      return;
    }
    const current = draftRef.current;
    history.past = history.past.slice(0, -1);
    history.future = [current, ...history.future].slice(0, maxDraftHistoryEntries);
    const next = withDraftUpdatedAt(previous);
    draftRef.current = next;
    setDraft(next);
    syncDraftHistoryAvailability();
  };

  const redoDraft = () => {
    const history = draftHistoryRef.current;
    const nextHistoryDraft = history.future[0];
    if (!nextHistoryDraft) {
      return;
    }
    const current = draftRef.current;
    history.future = history.future.slice(1);
    history.past = [...history.past, current].slice(-maxDraftHistoryEntries);
    const next = withDraftUpdatedAt(nextHistoryDraft);
    draftRef.current = next;
    setDraft(next);
    syncDraftHistoryAvailability();
  };

  useEffect(() => {
    const applyUndo = () => {
      const history = draftHistoryRef.current;
      const previous = history.past.at(-1);
      if (!previous) {
        return;
      }
      const current = draftRef.current;
      history.past = history.past.slice(0, -1);
      history.future = [current, ...history.future].slice(0, maxDraftHistoryEntries);
      const next = withDraftUpdatedAt(previous);
      draftRef.current = next;
      setDraft(next);
      syncDraftHistoryAvailability();
    };
    const applyRedo = () => {
      const history = draftHistoryRef.current;
      const nextHistoryDraft = history.future[0];
      if (!nextHistoryDraft) {
        return;
      }
      const current = draftRef.current;
      history.future = history.future.slice(1);
      history.past = [...history.past, current].slice(-maxDraftHistoryEntries);
      const next = withDraftUpdatedAt(nextHistoryDraft);
      draftRef.current = next;
      setDraft(next);
      syncDraftHistoryAvailability();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditingText = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditingText || (!event.ctrlKey && !event.metaKey)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          applyRedo();
        } else {
          applyUndo();
        }
      } else if (key === "y") {
        event.preventDefault();
        applyRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [syncDraftHistoryAvailability]);

  const resolveUserMaterialLayersForOutput = (value: ThumbnailEditorDraft): ThumbnailEditorDraft => ({
    ...value,
    layers: value.layers.map((layer) =>
      layer.type === "image" && layer.materialRef
        ? { ...layer, src: userMaterialImageUrls[layer.materialRef.storageId] ?? layer.src }
        : layer
    )
  });

  const updateSelectedLayer = (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => {
    updateDraft((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === current.selectedLayerId ? updater(layer) : layer))
    }));
  };

  const updateZoom = (updater: (value: number) => number) => {
    userAdjustedZoomRef.current = true;
    setZoom(updater);
  };
  const resetZoom = () => {
    userAdjustedZoomRef.current = true;
    setZoom(1);
  };
  const fitZoomToViewport = () => {
    userAdjustedZoomRef.current = true;
    const viewport = canvasViewportRef.current;
    setZoom(fitZoomForCanvas(draft.canvas.width, draft.canvas.height, viewport?.clientWidth ?? window.innerWidth, viewport?.clientHeight ?? window.innerHeight));
  };

  const commitPresetDiscoveryState = useCallback((updater: (current: ThumbnailPresetDiscoveryState) => ThumbnailPresetDiscoveryState) => {
    setPresetDiscoveryState((current) => {
      const next = normalizeThumbnailPresetDiscoveryState(updater(current));
      try {
        window.localStorage.setItem(thumbnailPresetDiscoveryStorageKey, JSON.stringify(next));
      } catch {
        // Preset discovery data is recoverable and must not block editing.
      }
      return next;
    });
  }, []);

  const recordPresetUse = useCallback(
    (presetId: ThumbnailPresetId) => {
      commitPresetDiscoveryState((current) => ({
        ...current,
        recentPresetIds: createNextRecentThumbnailPresetIds(current.recentPresetIds, presetId)
      }));
    },
    [commitPresetDiscoveryState]
  );

  const togglePresetFavorite = useCallback(
    (presetId: ThumbnailPresetId) => {
      commitPresetDiscoveryState((current) => ({
        ...current,
        favoritePresetIds: toggleThumbnailPresetFavorite(current.favoritePresetIds, presetId)
      }));
    },
    [commitPresetDiscoveryState]
  );

  const getCanvasPointFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * draft.canvas.width,
        y: ((clientY - rect.top) / rect.height) * draft.canvas.height
      };
    },
    [draft.canvas.height, draft.canvas.width]
  );

  const beginInlineTextEdit = useCallback((target: ThumbnailLayer) => {
    if (target.type !== "text" || target.locked || target.hidden) {
      return false;
    }
    setDraft((current) => ({ ...current, selectedLayerId: target.id }));
    setSidePanelCollapsed(false);
    setInlineTextEdit({ layerId: target.id, value: target.text });
    return true;
  }, []);

  const commitInlineTextEdit = useCallback(() => {
    if (!inlineTextEdit) {
      return;
    }
    updateDraft((current) => ({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === inlineTextEdit.layerId && layer.type === "text" && !layer.locked && !layer.hidden
          ? { ...layer, text: inlineTextEdit.value }
          : layer
      ),
      selectedLayerId: inlineTextEdit.layerId
    }));
    setInlineTextEdit(null);
  }, [inlineTextEdit, updateDraft]);

  const cancelInlineTextEdit = useCallback(() => {
    setInlineTextEdit(null);
  }, []);

  const selectLayerFromEditor = useCallback(
    (layerId: string) => {
      if (inlineTextEditLayerId && inlineTextEditLayerId !== layerId) {
        commitInlineTextEdit();
      }
      setDraft((current) => ({ ...current, selectedLayerId: layerId }));
    },
    [commitInlineTextEdit, inlineTextEditLayerId]
  );

  const openLayerPanelForPoint = useCallback(
    (point: { x: number; y: number }) => {
      if (typeof window === "undefined" || window.innerWidth < 1024) {
        return null;
      }
      const target = [...draft.layers].reverse().find((layer) => layerContainsPoint(layer, point));
      if (!target) {
        return null;
      }
      selectLayerFromEditor(target.id);
      setSidePanelCollapsed(false);
      return target.id;
    },
    [draft.layers, selectLayerFromEditor]
  );

  const handleCanvasDoubleClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasPointFromClient(event.clientX, event.clientY);
      if (!point) {
        return;
      }
      const target = [...draft.layers].reverse().find((layer) => layerContainsPoint(layer, point));
      if (target && beginInlineTextEdit(target)) {
        event.preventDefault();
        return;
      }
      if (openLayerPanelForPoint(point)) {
        event.preventDefault();
      }
    },
    [beginInlineTextEdit, draft.layers, getCanvasPointFromClient, openLayerPanelForPoint]
  );

  const handleTapEditIntent = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") {
        return;
      }
      const point = getCanvasPointFromClient(event.clientX, event.clientY);
      if (!point) {
        lastTapRef.current = null;
        return;
      }
      const target = [...draft.layers].reverse().find((layer) => layerContainsPoint(layer, point));
      const now = window.performance.now();
      const previous = lastTapRef.current;
      const isDoubleTap =
        Boolean(previous) &&
        previous?.layerId === (target?.id ?? null) &&
        now - previous.time <= 360 &&
        Math.hypot(event.clientX - previous.clientX, event.clientY - previous.clientY) <= 28;

      lastTapRef.current = {
        time: now,
        clientX: event.clientX,
        clientY: event.clientY,
        layerId: target?.id ?? null
      };

      if (isDoubleTap && target && beginInlineTextEdit(target)) {
        lastTapRef.current = null;
        event.preventDefault();
        return;
      }
      if (isDoubleTap && target && openLayerPanelForPoint(point)) {
        lastTapRef.current = null;
        event.preventDefault();
      }
    },
    [beginInlineTextEdit, draft.layers, getCanvasPointFromClient, openLayerPanelForPoint]
  );

  const constrainLayer = useCallback(
    (layer: ThumbnailLayer): ThumbnailLayer => ({
      ...layer,
      width: clamp(layer.width, 16, draft.canvas.width * 2),
      height: clamp(layer.height, 16, draft.canvas.height * 2),
      x: clamp(layer.x, -draft.canvas.width, draft.canvas.width * 2),
      y: clamp(layer.y, -draft.canvas.height, draft.canvas.height * 2),
      rotation: normalizeDeg(layer.rotation)
    }),
    [draft.canvas.height, draft.canvas.width]
  );

  const requestPresetApply = (presetId: ThumbnailPresetId) => {
    if (!isPresetSelectableForVariant(presetId, currentVariantId)) {
      setHeaderMenuOpen(null);
      return;
    }
    if (currentVariantId === "square-1-1" && (presetId === "karaoke" || presetId === "dark_gacha" || presetId === "chatting")) {
      if (presetId === "karaoke") {
        setThumbnailIriamSquarePresetConfig(defaultThumbnailIriamSquarePresetConfig);
      } else if (presetId === "dark_gacha") {
        setThumbnailIriamSquareDarkGachaPresetConfig(defaultThumbnailIriamSquareDarkGachaPresetConfig);
      } else {
        setThumbnailIriamSquareChattingPresetConfig(defaultThumbnailIriamSquareChattingPresetConfig);
      }
      setIriamSquarePresetModalPresetId(presetId);
      setPendingPresetApplyId(null);
      setHeaderMenuOpen(null);
      return;
    }
    if (!handoffPayload && isThumbnailDraftPristineForPreset(draft)) {
      applyPreset(presetId, "plain");
      return;
    }
    setPendingPresetApplyId(presetId);
    setHeaderMenuOpen(null);
  };

  const applyPreset = (presetId: ThumbnailPresetId, mode: PresetApplyMode) => {
    recordPresetUse(presetId);
    const next =
      currentVariantId === "square-1-1"
        ? localizeThumbnailPresetTextLayerBodies(createDraftFromPresetVariant(presetId, currentVariantId), locale)
        : createPresetDraftForLocale(presetId, draft.canvas);
    const nextDraft =
      mode === "handoff" && handoffPayload
        ? applyScheduleHandoffToThumbnailDraft(next, handoffPayload, locale)
        : mode === "carryover"
          ? applyThumbnailPresetPartial(draft, presetId, next)
          : next;
    replaceDraft(nextDraft, { recordHistory: true });
    setMobilePanel("canvas");
    setPendingPresetApplyId(null);
    showToast(
      "success",
      mode === "handoff"
        ? copy.toasts.applyHandoff
        : mode === "carryover"
          ? copy.toasts.applyCarryover
          : copy.toasts.applyPlain
    );
  };

  const applyKaraokeIriamSquarePreset = (config: ThumbnailIriamSquareKaraokePresetConfig) => {
    recordPresetUse("karaoke");
    const next = localizeThumbnailPresetTextLayerBodies(createKaraokeIriamSquareDraft(config), locale);
    const nextDraft = handoffPayload
      ? applyScheduleHandoffToThumbnailDraft(next, handoffPayload, locale)
      : applyThumbnailMainTextCarryover(next, getThumbnailMainTextCarryover(draft));
    replaceDraft(nextDraft, { recordHistory: true });
    setThumbnailIriamSquarePresetConfig(config);
    setIriamSquarePresetModalPresetId(null);
    setMobilePanel("canvas");
    showToast("success", copy.toasts.applyPlain);
  };

  const applyDarkGachaIriamSquarePreset = (config: ThumbnailIriamSquareDarkGachaPresetConfig) => {
    recordPresetUse("dark_gacha");
    const next = localizeThumbnailPresetTextLayerBodies(createDarkGachaIriamSquareDraft(config), locale);
    const nextDraft = handoffPayload
      ? applyScheduleHandoffToThumbnailDraft(next, handoffPayload, locale)
      : applyThumbnailMainTextCarryover(next, getThumbnailMainTextCarryover(draft));
    replaceDraft(nextDraft, { recordHistory: true });
    setThumbnailIriamSquareDarkGachaPresetConfig(config);
    setIriamSquarePresetModalPresetId(null);
    setMobilePanel("canvas");
    showToast("success", copy.toasts.applyPlain);
  };

  const applyChattingIriamSquarePreset = (config: ThumbnailIriamSquareChattingPresetConfig) => {
    recordPresetUse("chatting");
    const next = localizeThumbnailPresetTextLayerBodies(createChattingIriamSquareDraft(config), locale);
    const nextDraft = handoffPayload
      ? applyScheduleHandoffToThumbnailDraft(next, handoffPayload, locale)
      : applyThumbnailMainTextCarryover(next, getThumbnailMainTextCarryover(draft));
    replaceDraft(nextDraft, { recordHistory: true });
    setThumbnailIriamSquareChattingPresetConfig(config);
    setIriamSquarePresetModalPresetId(null);
    setMobilePanel("canvas");
    showToast("success", copy.toasts.applyPlain);
  };

  const changeCanvasSize = (sizeId: ThumbnailCanvasSizeId) => {
    const canvas = thumbnailCanvasSizes[sizeId];
    const targetPresetId = draft.presetId === "dark_gacha" ? "karaoke" : draft.presetId;
    const next = createPresetDraftForLocale(targetPresetId, canvas);
    const nextDraft = handoffPayload
      ? applyScheduleHandoffToThumbnailDraft(next, handoffPayload, locale)
      : applyThumbnailMainTextCarryover(next, getThumbnailMainTextCarryover(draft));
    replaceDraft(nextDraft, { recordHistory: true });
    showToast("info", handoffPayload ? copy.toasts.resizeHandoff(canvas.label) : copy.toasts.resizeCarryover(canvas.label));
  };

  const changePresetVariant = (variantId: ThumbnailPresetVariantId) => {
    const variant = thumbnailPresetVariants[variantId];
    const targetPresetId =
      variantId === "square-1-1"
        ? isPresetSelectableForVariant(draft.presetId, variantId)
          ? draft.presetId
          : "karaoke"
        : draft.presetId === "dark_gacha"
          ? "karaoke"
          : draft.presetId;
    const next = localizeThumbnailPresetTextLayerBodies(createDraftFromPresetVariant(targetPresetId, variantId), locale);
    const nextDraft = handoffPayload
      ? applyScheduleHandoffToThumbnailDraft(next, handoffPayload, locale)
      : applyThumbnailMainTextCarryover(next, getThumbnailMainTextCarryover(draft));
    replaceDraft(nextDraft, { recordHistory: true });
    setMobilePanel("canvas");
    setHeaderMenuOpen(null);
    const localizedVariantLabel = getThumbnailPresetVariantLabel(variant.id, locale, variant.label);
    showToast("info", handoffPayload ? copy.toasts.resizeHandoff(localizedVariantLabel) : copy.toasts.resizeCarryover(localizedVariantLabel));
  };

  const saveDraft = () => {
    const normalized = normalizeThumbnailDraft(draft);
    if (!normalized) {
      showToast("error", copy.messages.invalidSave);
      return;
    }
    try {
      window.localStorage.setItem(
        thumbnailDraftStorageKey,
        JSON.stringify({ ...normalized, updatedAt: new Date().toISOString() })
      );
      showToast("success", copy.toasts.saveDraft);
    } catch {
      showToast("error", copy.messages.saveFailed);
    }
  };

  const newDraft = () => {
    replaceDraft(createPresetDraftForLocale(draft.presetId, draft.canvas), { recordHistory: true });
    setMobilePanel("canvas");
    showToast("info", copy.toasts.newDraft);
  };

  const addLayer = (layer: ThumbnailLayer) => {
    updateDraft((current) => ({
      ...current,
      layers: [...current.layers, layer],
      selectedLayerId: layer.id
    }));
    setMobilePanel(layer.type === "text" ? "text" : "layers");
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!isValidImageFile(file)) {
      showToast("error", copy.messages.imageTypeInvalid);
      return;
    }
    if (file.size > imageUploadMaxBytes) {
      showToast("error", copy.messages.imageTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        showToast("error", copy.messages.imageReadFailed);
        return;
      }
      addLayer(createImageLayer(reader.result));
      showToast("success", copy.messages.imageLayerAdded);
    };
    reader.onerror = () => showToast("error", copy.messages.imageReadFailed);
    reader.readAsDataURL(file);
  };

  const addMaterialLayer = (materialId: string) => {
    const layer = createThumbnailMaterialLayer(materialId, draft.canvas);
    if (!layer) {
      showToast("error", copy.messages.materialAddFailed);
      return;
    }
    const material = thumbnailMaterialLibrary.find((item) => item.id === materialId);
    addLayer(layer);
    showToast("success", material ? copy.messages.materialLayerAddedWithName(getThumbnailMaterialName(material.id, locale, material.name)) : copy.messages.materialLayerAdded);
  };

  const commitUserMaterialRefs = (refs: ThumbnailUserMaterialRef[]) => {
    setUserMaterialRefs(refs);
    try {
      writeThumbnailUserMaterialRefsMetadata(refs);
    } catch {
      showToast("error", copy.messages.userMaterialListSaveFailed);
    }
  };

  const openUserMaterialFilePicker = (replaceRef: ThumbnailUserMaterialRef | null = null) => {
    setReplaceUserMaterialRef(replaceRef);
    userMaterialFileInputRef.current?.click();
  };

  const handleUserMaterialUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      setReplaceUserMaterialRef(null);
      return;
    }
    if (!isThumbnailUserMaterialFile(file)) {
      showToast("error", copy.messages.userMaterialTypeInvalid);
      setReplaceUserMaterialRef(null);
      return;
    }
    const capacity = canAddThumbnailUserMaterialRef(userMaterialRefs, file.size, replaceUserMaterialRef?.storageId);
    if (!capacity.ok) {
      showToast("error", copy.messages.userMaterialCapacity[capacity.reason]);
      setReplaceUserMaterialRef(null);
      return;
    }

    try {
      const nextRef = await saveThumbnailUserMaterialFile(file, replaceUserMaterialRef ?? undefined);
      const nextRefs = replaceUserMaterialRef
        ? userMaterialRefs.map((ref) => (ref.storageId === replaceUserMaterialRef.storageId ? nextRef : ref))
        : [nextRef, ...userMaterialRefs].slice(0, 24);
      commitUserMaterialRefs(nextRefs);

      if (replaceUserMaterialRef) {
        updateDraft((current) =>
          current.layers
            .filter((layer) => layer.type === "image" && layer.materialRef?.storageId === replaceUserMaterialRef.storageId)
            .reduce((nextDraft, layer) => replaceThumbnailUserMaterialLayerRef(nextDraft, layer.id, nextRef), current)
        );
        showToast("success", copy.messages.userMaterialReplaced(nextRef.name));
      } else {
        addLayer(createThumbnailUserMaterialLayer(nextRef, draft.canvas));
        setMobilePanel("layers");
        showToast("success", copy.messages.userMaterialAdded(nextRef.name));
      }
    } catch (error) {
      showToast("error", locale === "ja" && error instanceof Error ? error.message : copy.messages.userMaterialSaveFailed);
    } finally {
      setReplaceUserMaterialRef(null);
    }
  };

  const addUserMaterialLayer = (ref: ThumbnailUserMaterialRef) => {
    addLayer(createThumbnailUserMaterialLayer(ref, draft.canvas));
    showToast("success", copy.messages.userMaterialLayerAdded(ref.name));
  };

  const deleteUserMaterial = async (ref: ThumbnailUserMaterialRef) => {
    try {
      await deleteThumbnailUserMaterialImage(ref.storageId);
      commitUserMaterialRefs(userMaterialRefs.filter((item) => item.storageId !== ref.storageId));
      updateDraft((current) => applyThumbnailUserMaterialLayerFallback(current, ref.storageId, "deleted"));
      showToast("warning", copy.messages.userMaterialDeleted(ref.name));
    } catch {
      setDraft((current) => applyThumbnailUserMaterialLayerFallback(current, ref.storageId, "load-failed"));
      showToast("error", copy.messages.userMaterialDeleteFailed);
    }
  };

  const applyStandeePlacementPreset = (presetId: ThumbnailStandeePlacementPresetId) => {
    const targetLayer = draft.layers.find((layer) => layer.id === draft.selectedLayerId && layer.type === "image" && !layer.locked);
    const next = applyThumbnailStandeePlacementPreset(draft, presetId);
    if (!next) {
      showToast("warning", copy.messages.editableImageRequired);
      return;
    }

    const preset = thumbnailStandeePlacementPresets.find((item) => item.id === presetId);
    const targetLayerName = targetLayer ? getThumbnailLayerDisplayName(targetLayer, locale) : copy.panels.property.imageFallback;
    replaceDraft(next, { recordHistory: true });
    setMobilePanel("layers");
    showToast(
      "success",
      preset
        ? copy.messages.standeePlacementApplied(targetLayerName, getThumbnailStandeePlacementName(preset.id, locale, preset.name))
        : copy.messages.standeePlacementAppliedFallback(targetLayerName)
    );
  };

  const moveLayer = (layerId: string, direction: "front" | "back") => {
    updateDraft((current) => {
      const index = current.layers.findIndex((layer) => layer.id === layerId);
      const nextIndex = direction === "front" ? index + 1 : index - 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.layers.length) {
        return current;
      }
      const layers = [...current.layers];
      [layers[index], layers[nextIndex]] = [layers[nextIndex], layers[index]];
      return { ...current, layers };
    });
  };

  const duplicateLayer = (layerId: string) => {
    updateDraft((current) => {
      const layer = current.layers.find((item) => item.id === layerId);
      if (!layer) {
        return current;
      }
      const cloned = cloneThumbnailLayer(
        layer,
        current.layers.map((item) => item.name)
      );
      const index = current.layers.findIndex((item) => item.id === layerId);
      const layers = [...current.layers];
      layers.splice(index + 1, 0, cloned);
      return { ...current, layers, selectedLayerId: cloned.id };
    });
  };

  const deleteLayer = (layerId: string) => {
    updateDraft((current) => {
      if (current.layers.length <= 1) {
        showToast("warning", copy.messages.minimumLayerRequired);
        return current;
      }
      const layers = current.layers.filter((layer) => layer.id !== layerId);
      return { ...current, layers, selectedLayerId: selectedLayerFallback(layers) };
    });
  };

  const toggleLayerFlag = (layerId: string, flag: "hidden" | "locked") => {
    updateDraft((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === layerId ? { ...layer, [flag]: !layer[flag] } : layer))
    }));
  };

  const beginInteraction = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (editorMode === "pan") {
        const viewport = canvasViewportRef.current;
        if (!viewport) {
          return;
        }
        panRef.current = {
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startScrollLeft: viewport.scrollLeft,
          startScrollTop: viewport.scrollTop,
          moved: false
        };
        setCanvasCursor("grabbing");
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }
      const point = getCanvasPointFromClient(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      const selected = draft.layers.find((layer) => layer.id === draft.selectedLayerId && !layer.hidden);
      const isTouchLike = event.pointerType === "touch" || event.pointerType === "pen";
      const handleSize = Math.max(isTouchLike ? 18 : 12, Math.round(draft.canvas.width / 80));
      const rotateHandleOffset = Math.max(isTouchLike ? 42 : 36, Math.round(draft.canvas.width / 24));
      const rotateHandleRadius = Math.max(isTouchLike ? 14 : 10, Math.round(draft.canvas.width / 92));
      const targetByPoint = [...draft.layers].reverse().find((layer) => layerContainsPoint(layer, point));
      const target = targetByPoint ?? selected ?? null;
      if (!target) {
        return;
      }

      const handle = selected && !selected.locked ? hitTestLayerHandle(selected, point, { handleSize, rotateHandleOffset, rotateHandleRadius }) : null;
      const activeLayer = handle ? selected : target;
      if (!activeLayer) {
        return;
      }

      selectLayerFromEditor(activeLayer.id);
      if (activeLayer.locked) {
        return;
      }

      const center = getLayerCenter(activeLayer);
      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      const rad = (activeLayer.rotation * Math.PI) / 180;
      const mode: CanvasInteractionMode = handle === "rotate" ? "rotate" : handle ? "resize" : "drag";
      setCanvasCursor(mode === "rotate" ? "crosshair" : mode === "resize" ? "nwse-resize" : "grabbing");

      interactionRef.current = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        layerId: activeLayer.id,
        mode,
        resizeHandle: handle && handle !== "rotate" ? handle : undefined,
        startPointer: point,
        startLayer: { ...activeLayer },
        startDraft: draft,
        startCenter: center,
        rotateOffsetRad: angle - rad,
        moved: false
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [draft, editorMode, getCanvasPointFromClient, selectLayerFromEditor]
  );

  const resizeLayerFromHandle = useCallback((state: CanvasInteractionState, point: { x: number; y: number }) => {
    const layer = state.startLayer;
    if (state.resizeHandle === undefined) {
      return layer;
    }

    const rad = (layer.rotation * Math.PI) / 180;
    const toLocal = (p: { x: number; y: number }) => ({
      x: (p.x - state.startCenter.x) * Math.cos(-rad) - (p.y - state.startCenter.y) * Math.sin(-rad),
      y: (p.x - state.startCenter.x) * Math.sin(-rad) + (p.y - state.startCenter.y) * Math.cos(-rad)
    });
    const currentLocal = toLocal(point);
    const minSize = 16;

    const oppositeMap: Record<ThumbnailResizeHandle, { x: number; y: number }> = {
      nw: { x: layer.width / 2, y: layer.height / 2 },
      ne: { x: -layer.width / 2, y: layer.height / 2 },
      sw: { x: layer.width / 2, y: -layer.height / 2 },
      se: { x: -layer.width / 2, y: -layer.height / 2 }
    };

    const anchor = oppositeMap[state.resizeHandle];
    const rawWidth = Math.abs(anchor.x - currentLocal.x);
    const rawHeight = Math.abs(anchor.y - currentLocal.y);
    const width = Math.max(minSize, rawWidth);
    const height = Math.max(minSize, rawHeight);
    const cornerByHandle: Record<ThumbnailResizeHandle, { x: number; y: number }> = {
      nw: { x: anchor.x - width, y: anchor.y - height },
      ne: { x: anchor.x + width, y: anchor.y - height },
      sw: { x: anchor.x - width, y: anchor.y + height },
      se: { x: anchor.x + width, y: anchor.y + height }
    };
    const corner = cornerByHandle[state.resizeHandle];
    const centerLocal = {
      x: (corner.x + anchor.x) / 2,
      y: (corner.y + anchor.y) / 2
    };
    const centerGlobal = {
      x: state.startCenter.x + centerLocal.x * Math.cos(rad) - centerLocal.y * Math.sin(rad),
      y: state.startCenter.y + centerLocal.x * Math.sin(rad) + centerLocal.y * Math.cos(rad)
    };

    return {
      ...layer,
      x: centerGlobal.x - width / 2,
      y: centerGlobal.y - height / 2,
      width,
      height
    };
  }, []);
  const cursorFromHandle = useCallback((handle: ThumbnailHandleKind): CanvasCursor => {
    if (handle === "rotate") {
      return "crosshair";
    }
    if (handle === "ne" || handle === "sw") {
      return "nesw-resize";
    }
    return "nwse-resize";
  }, []);

  const updateInteraction = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      const pan = panRef.current;
      if (pan && pan.pointerId === event.pointerId) {
        const viewport = canvasViewportRef.current;
        if (!viewport) {
          return;
        }
        const dx = event.clientX - pan.startClientX;
        const dy = event.clientY - pan.startClientY;
        if (Math.hypot(dx, dy) > 8) {
          pan.moved = true;
        }
        viewport.scrollLeft = pan.startScrollLeft - dx;
        viewport.scrollTop = pan.startScrollTop - dy;
        setCanvasCursor("grabbing");
        event.preventDefault();
        return;
      }
      const state = interactionRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        const point = getCanvasPointFromClient(event.clientX, event.clientY);
        if (!point) {
          return;
        }
        const selected = draft.layers.find((layer) => layer.id === draft.selectedLayerId && !layer.hidden) ?? null;
        if (selected && !selected.locked) {
          const handle = hitTestLayerHandle(selected, point, {
            handleSize: Math.max(12, Math.round(draft.canvas.width / 80)),
            rotateHandleOffset: Math.max(36, Math.round(draft.canvas.width / 24)),
            rotateHandleRadius: Math.max(10, Math.round(draft.canvas.width / 92))
          });
          if (handle) {
            setCanvasCursor(cursorFromHandle(handle));
            return;
          }
        }
        const hovered = [...draft.layers].reverse().find((layer) => layerContainsPoint(layer, point));
        setCanvasCursor(hovered && !hovered.locked ? "grab" : "default");
        return;
      }
      const point = getCanvasPointFromClient(event.clientX, event.clientY);
      if (!point) {
        return;
      }
      if (Math.hypot(point.x - state.startPointer.x, point.y - state.startPointer.y) > 6) {
        state.moved = true;
      }

      setDraft((current) => {
        const layers = current.layers.map((layer) => {
          if (layer.id !== state.layerId || layer.locked) {
            return layer;
          }
          if (state.mode === "drag") {
            const dx = point.x - state.startPointer.x;
            const dy = point.y - state.startPointer.y;
            return constrainLayer({ ...state.startLayer, x: state.startLayer.x + dx, y: state.startLayer.y + dy });
          }
          if (state.mode === "resize") {
            return constrainLayer(resizeLayerFromHandle(state, point));
          }
          const center = getLayerCenter(state.startLayer);
          const angle = Math.atan2(point.y - center.y, point.x - center.x);
          const rotation = ((angle - state.rotateOffsetRad) * 180) / Math.PI;
          return constrainLayer({ ...state.startLayer, rotation });
        });
        const next = { ...current, layers };
        draftRef.current = next;
        return next;
      });
      if (state.mode === "rotate") {
        setCanvasCursor("crosshair");
      } else if (state.mode === "resize") {
        setCanvasCursor(state.resizeHandle ? cursorFromHandle(state.resizeHandle) : "nwse-resize");
      } else {
        setCanvasCursor("grabbing");
      }
      event.preventDefault();
    },
    [constrainLayer, cursorFromHandle, draft.canvas.width, draft.layers, draft.selectedLayerId, getCanvasPointFromClient, resizeLayerFromHandle]
  );

  const endInteraction = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const pan = panRef.current;
    if (pan && pan.pointerId === event.pointerId) {
      panRef.current = null;
      setCanvasCursor(editorMode === "pan" ? "grab" : "default");
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!pan.moved) {
        handleTapEditIntent(event);
      }
      return;
    }
    const state = interactionRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    interactionRef.current = null;
    setCanvasCursor(editorMode === "pan" ? "grab" : "default");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!state.moved) {
      handleTapEditIntent(event);
    } else {
      pushDraftHistory(state.startDraft, draftRef.current);
    }
  }, [editorMode, handleTapEditIntent, pushDraftHistory]);

  const exportImage = async () => {
    const normalized = normalizeThumbnailDraft(draft);
    if (!normalized) {
      showToast("error", copy.messages.invalidExport);
      return;
    }
    const outputDraft = resolveUserMaterialLayersForOutput(normalized);
    const hasVisibleImage = outputDraft.layers.some((layer) => layer.type === "image" && !layer.hidden && layer.src);
    if (!hasVisibleImage) {
      showToast("error", copy.messages.exportNeedsImage);
      return;
    }
    try {
      const exportCanvas = document.createElement("canvas");
      await waitForThumbnailDraftFonts(outputDraft);
      await drawThumbnail(exportCanvas, outputDraft, { forceJpegBackground: exportFormat === "jpeg" });
      const mimeType = exportFormat === "png" ? "image/png" : "image/jpeg";
      const dataUrl = exportCanvas.toDataURL(mimeType, 0.92);
      if (!dataUrl || dataUrl === "data:,") {
        throw new Error("Canvas export failed.");
      }
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13).replace("T", "-");
      anchor.href = dataUrl;
      anchor.download = `thumbnail-${stamp}.${exportFormat === "png" ? "png" : "jpg"}`;
      anchor.click();
      showToast("success", copy.toasts.exportDone(exportFormat.toUpperCase()));
    } catch {
      showToast("error", copy.messages.exportFailed);
    }
  };

  const sendToSnsSplit = async () => {
    const normalized = normalizeThumbnailDraft(draft);
    if (!normalized) {
      showToast("error", copy.messages.invalidSnsHandoff);
      return;
    }

    try {
      const exportCanvas = document.createElement("canvas");
      const outputDraft = resolveUserMaterialLayersForOutput(normalized);
      await waitForThumbnailDraftFonts(outputDraft);
      await drawThumbnail(exportCanvas, outputDraft, { forceJpegBackground: false });
      const dataUrl = exportCanvas.toDataURL("image/png", 0.92);
      if (!dataUrl || dataUrl === "data:,") {
        throw new Error("Canvas export failed.");
      }

      const title = getFirstTextLayerValue(normalized, "見出し") || handoffPayload?.title || selectedPresetName;
      const date = handoffPayload?.date ?? "";
      const imageStorageId = createThumbnailToSnsImageStorageId();
      const fileNameBase = createHandoffFileNameBase(date, title);
      const payload = createThumbnailToSnsHandoffPayload({
        imageStorageId,
        title,
        date,
        categoryLabel: handoffPayload?.categoryLabel ?? getThumbnailPresetCategoryLabel(selectedPresetBase.category, locale),
        platform: handoffPayload?.platform ?? "",
        announcementText: handoffPayload?.announcementText ?? getFirstTextLayerValue(normalized, "サブ"),
        hashtags: handoffPayload?.hashtags ?? "",
        fileNameBase
      });

      await writeStoredImageSource(imageStorageId, dataUrl);
      const token = writeToolHandoff(payload);
      if (!token) {
        await writeStoredImageSource(imageStorageId, null);
        throw new Error("Handoff token was not created.");
      }

      window.location.href = buildToolHandoffUrl("sns-split-image-maker", token);
    } catch {
      showToast("error", copy.toasts.sendToSnsError);
    }
  };

  const canvasSizeId: ThumbnailCanvasSizeId = draft.canvas.width === 1920 ? "full-hd" : "hd";
  const currentVariant = thumbnailPresetVariants[currentVariantId];
  const currentVariantLabel = getThumbnailPresetVariantLabel(currentVariant.id, locale, currentVariant.label);
  const canvasSizeLabel =
    currentVariantId === "landscape-16-9" ? thumbnailCanvasSizes[canvasSizeId].label : `${draft.canvas.width} x ${draft.canvas.height} (${currentVariant.aspectRatio})`;
  const variantOptions = Object.values(thumbnailPresetVariants).map((variant) => {
    const disabled = !["landscape-16-9", "square-1-1"].includes(variant.id);
    return {
      id: variant.id,
      label: disabled ? `${getThumbnailPresetVariantLabel(variant.id, locale, variant.label)}${copy.header.laterCandidateSuffix}` : getThumbnailPresetVariantLabel(variant.id, locale, variant.label),
      description: getThumbnailPresetVariantDescription(variant.id, locale, variant.intendedUse, disabled),
      disabled
    };
  });
  const availablePresets = getThumbnailPresetsForVariant(currentVariantId);
  const presetOptions = availablePresets.map((preset) => {
    const disabled = !isPresetSelectableForVariant(preset.id, currentVariantId);
    return {
      id: preset.id,
      label: disabled ? `${getThumbnailPresetName(preset.id, locale, preset.name)}${copy.header.laterCandidateSuffix}` : getThumbnailPresetName(preset.id, locale, preset.name),
      disabled
    };
  });
  const mobilePreviewFrameStyle: CSSProperties = {
    aspectRatio: `${draft.canvas.width} / ${draft.canvas.height}`,
    maxWidth: `min(100%, calc((100vh - 8rem) * ${draft.canvas.width} / ${draft.canvas.height}))`
  };

  return (
    <div className={`flex h-full min-h-0 flex-col bg-background text-foreground ${thumbnailFontAssets.thumbnailFontAssetScope}`}>
      <header className="relative z-[80] hidden shrink-0 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur min-[1024px]:block md:px-5 xl:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden min-w-[10rem] flex-1 min-[1024px]:block">
            <p className="text-xs font-semibold text-primary-strong">{copy.header.category}</p>
            <h1 className="whitespace-nowrap text-lg font-black tracking-normal text-foreground xl:text-xl">{copy.header.title}</h1>
          </div>
          <div
            className="relative z-[90] grid w-full grid-cols-1 gap-3 min-[520px]:grid-cols-3 min-[1024px]:w-[min(100%,38rem)] min-[1180px]:w-[40rem] xl:w-[43rem]"
            data-thumbnail-header-menu-layer="desktop"
            data-thumbnail-responsive-header-controls="true"
          >
            <label className="min-w-0 text-xs font-bold text-muted">
              {copy.header.preset}
              <ListboxField
                className="mt-1"
                isOpen={headerMenuOpen === "preset"}
                value={selectedPresetName}
                openLabel={copy.header.openOptions}
                onToggle={() => setHeaderMenuOpen((current) => (current === "preset" ? null : "preset"))}
                options={presetOptions}
                onSelect={(id) => {
                  setHeaderMenuOpen(null);
                  requestPresetApply(id as ThumbnailPresetId);
                }}
              />
            </label>
            <label className="min-w-0 text-xs font-bold text-muted">
              {copy.header.canvasSize}
              <ListboxField
                className="mt-1"
                isOpen={headerMenuOpen === "canvas"}
                value={canvasSizeLabel}
                openLabel={copy.header.openOptions}
                onToggle={() => setHeaderMenuOpen((current) => (current === "canvas" ? null : "canvas"))}
                options={Object.entries(thumbnailCanvasSizes).map(([id, size]) => ({
                  id,
                  label: size.label
                }))}
                onSelect={(id) => {
                  setHeaderMenuOpen(null);
                  changeCanvasSize(id as ThumbnailCanvasSizeId);
                }}
              />
            </label>
            <label className="min-w-0 text-xs font-bold text-muted">
              {copy.header.outputRatio}
              <ListboxField
                className="mt-1"
                isOpen={headerMenuOpen === "variant"}
                value={currentVariantLabel}
                openLabel={copy.header.openOptions}
                onToggle={() => setHeaderMenuOpen((current) => (current === "variant" ? null : "variant"))}
                options={variantOptions}
                onSelect={(id) => {
                  setHeaderMenuOpen(null);
                  changePresetVariant(id as ThumbnailPresetVariantId);
                }}
              />
            </label>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-2 min-[1180px]:w-auto min-[1180px]:justify-end">
            <ModeToggle copy={copy} editorMode={editorMode} onModeChange={setEditorMode} className="min-[1024px]:hidden" />
            <div className="scrollbar-accent flex max-w-full flex-nowrap justify-end gap-2 overflow-x-auto pb-1 [scrollbar-gutter:stable]">
              <button className="flat-control shrink-0 px-3 py-2 text-sm font-bold xl:px-4" type="button" onClick={newDraft} aria-label={copy.header.newDraftAria} title={copy.header.newDraftAria}>
                {copy.header.newDraft}
              </button>
              <button className="flat-control shrink-0 px-3 py-2 text-sm font-bold xl:px-4" type="button" onClick={saveDraft} aria-label={copy.header.saveDraftAria} title={copy.header.saveDraftAria}>
                {copy.header.saveDraft}
              </button>
              <button className="flat-control shrink-0 px-3 py-2 text-sm font-bold xl:px-4" type="button" onClick={sendToSnsSplit} aria-label={copy.header.sendToSnsAria} title={copy.header.sendToSnsAria}>
                {copy.header.sendToSns}
              </button>
              <button className="shrink-0 rounded-base bg-primary px-3 py-2 text-sm font-bold text-white xl:px-4" type="button" onClick={exportImage} aria-label={copy.header.exportAria} title={copy.header.exportAria}>
                {copy.header.export}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className={[
            "grid h-full min-h-0 grid-cols-1",
            sidePanelCollapsed ? "min-[1024px]:grid-cols-1" : "min-[1024px]:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_28rem]"
          ].join(" ")}
        >
          <main className="scrollbar-accent min-h-0 overflow-y-auto p-4 [scrollbar-gutter:stable] md:p-5 xl:p-6">
            <section className="relative z-[70] mb-4 grid gap-3 min-[1024px]:hidden" data-thumbnail-header-menu-layer="mobile">
              <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-3">
                <label className="min-w-0 text-xs font-bold text-muted">
                  {copy.header.preset}
                  <ListboxField
                    className="mt-1"
                    isOpen={headerMenuOpen === "preset"}
                    value={selectedPresetName}
                    openLabel={copy.header.openOptions}
                    onToggle={() => setHeaderMenuOpen((current) => (current === "preset" ? null : "preset"))}
                    options={presetOptions}
                    onSelect={(id) => {
                      setHeaderMenuOpen(null);
                      requestPresetApply(id as ThumbnailPresetId);
                    }}
                  />
                </label>
                <label className="min-w-0 text-xs font-bold text-muted">
                  {copy.header.canvasSize}
                  <ListboxField
                    className="mt-1"
                    isOpen={headerMenuOpen === "canvas"}
                    value={canvasSizeLabel}
                    openLabel={copy.header.openOptions}
                    onToggle={() => setHeaderMenuOpen((current) => (current === "canvas" ? null : "canvas"))}
                    options={Object.entries(thumbnailCanvasSizes).map(([id, size]) => ({
                      id,
                      label: size.label
                    }))}
                    onSelect={(id) => {
                      setHeaderMenuOpen(null);
                      changeCanvasSize(id as ThumbnailCanvasSizeId);
                    }}
                  />
                </label>
                <label className="min-w-0 text-xs font-bold text-muted">
                  {copy.header.outputRatio}
                  <ListboxField
                    className="mt-1"
                    isOpen={headerMenuOpen === "variant"}
                    value={currentVariantLabel}
                    openLabel={copy.header.openOptions}
                    onToggle={() => setHeaderMenuOpen((current) => (current === "variant" ? null : "variant"))}
                    options={variantOptions}
                    onSelect={(id) => {
                      setHeaderMenuOpen(null);
                      changePresetVariant(id as ThumbnailPresetVariantId);
                    }}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ModeToggle copy={copy} editorMode={editorMode} onModeChange={setEditorMode} />
                <div
                  className="scrollbar-accent flex min-w-0 max-w-full flex-nowrap justify-end gap-2 overflow-x-auto pb-1 [scrollbar-gutter:stable]"
                  data-thumbnail-mobile-action-toolbar="true"
                >
                  <button className="flat-control shrink-0 px-3 py-2 text-sm font-bold" type="button" onClick={newDraft} aria-label={copy.header.newDraftAria} title={copy.header.newDraftAria}>
                    {copy.header.newDraft}
                  </button>
                  <button className="flat-control shrink-0 px-3 py-2 text-sm font-bold" type="button" onClick={saveDraft} aria-label={copy.header.saveDraftAria} title={copy.header.saveDraftAria}>
                    {copy.header.saveDraft}
                  </button>
                  <button className="flat-control shrink-0 px-3 py-2 text-sm font-bold" type="button" onClick={sendToSnsSplit} aria-label={copy.header.sendToSnsAria} title={copy.header.sendToSnsAria}>
                    {copy.header.sendToSns}
                  </button>
                  <button className="shrink-0 rounded-base bg-primary px-3 py-2 text-sm font-bold text-white" type="button" onClick={exportImage} aria-label={copy.header.exportAria} title={copy.header.exportAria}>
                    {copy.header.export}
                  </button>
                </div>
              </div>
            </section>
            <section className={["panel mx-auto p-3 md:p-4", sidePanelCollapsed ? "max-w-none" : "max-w-[76rem]"].join(" ")}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{selectedPresetName}</p>
                  <p className="text-xs text-muted">{draft.canvas.width} x {draft.canvas.height} / {currentVariant.aspectRatio}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {handoffPayload ? copy.canvas.handoffGuide : copy.canvas.defaultGuide}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    className="flat-control hidden px-3 py-2 text-xs font-bold min-[1024px]:inline-flex"
                    type="button"
                    onClick={() => setSidePanelCollapsed((value) => !value)}
                    aria-label={sidePanelCollapsed ? copy.canvas.showPanel : copy.canvas.hidePanel}
                  >
                    {sidePanelCollapsed ? copy.canvas.showPanel : copy.canvas.hidePanel}
                  </button>
                  <div className="flex items-center gap-2 min-[1024px]:hidden">
                    <button className="flat-control h-9 px-3 text-xs font-bold" type="button" onClick={() => setMobilePreviewOpen(true)} aria-label={copy.canvas.fullPreviewAria}>
                      {copy.canvas.fullPreview}
                    </button>
                    <PreviewControlToolbar
                      copy={copy.canvas}
                      zoom={zoom}
                      showCenterGuide={showCenterGuide}
                      canUndo={draftHistoryAvailability.canUndo}
                      canRedo={draftHistoryAvailability.canRedo}
                      compact
                      onUndo={undoDraft}
                      onRedo={redoDraft}
                      onGuideToggle={() => setShowCenterGuide((value) => !value)}
                      onZoomOut={() => updateZoom((value) => Math.max(0.42, value - 0.08))}
                      onZoomIn={() => updateZoom((value) => Math.min(1.6, value + 0.08))}
                      onZoomReset={resetZoom}
                      onZoomFit={fitZoomToViewport}
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-base bg-surface-muted p-2 md:p-4">
                <div className="flex min-h-0 gap-3">
                  <DesktopToolRail
                    copy={copy}
                    editorMode={editorMode}
                    onModeChange={setEditorMode}
                    onText={() => addLayer(createTextLayer())}
                    onShape={(shapeType) => addLayer(createShapeLayer(shapeType))}
                    onImage={() => fileInputRef.current?.click()}
                    onMaterial={() => setSidePanelCollapsed(false)}
                  />
                  <div ref={canvasViewportRef} className="scrollbar-accent min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable] min-[1024px]:max-h-[calc(100vh-20rem)]">
                    {editorMode === "pan" && (
                      <div className="mb-2 inline-flex rounded-sm border border-primary/50 bg-primary/20 px-2 py-1 text-[11px] font-bold text-primary-strong min-[1024px]:hidden">
                        {copy.canvas.panMode}
                      </div>
                    )}
                    <div className="relative mx-auto w-fit">
                      <canvas
                        ref={setCanvasRef}
                        className="block max-w-none touch-none rounded-base border border-border bg-[#081117] shadow-lg"
                        style={{ width: `${draft.canvas.width * zoom}px`, height: `${draft.canvas.height * zoom}px`, cursor: canvasCursor }}
                        onPointerDown={beginInteraction}
                        onPointerMove={updateInteraction}
                        onPointerUp={endInteraction}
                        onPointerCancel={endInteraction}
                        onDoubleClick={handleCanvasDoubleClick}
                        aria-label={copy.canvas.canvasAria}
                      />
                      {showCenterGuide ? <CanvasCenterGuideOverlay /> : null}
                      {inlineTextEdit && inlineTextEditLayer && inlineTextEditStyle ? (
                        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-base">
                          <textarea
                            ref={inlineTextEditTextareaRef}
                            data-thumbnail-inline-text-editor
                            className="pointer-events-auto absolute resize-none overflow-hidden rounded-sm border border-primary/70 bg-transparent px-0 py-0 text-transparent caret-primary outline-none ring-1 ring-primary/20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={inlineTextEditStyle}
                            maxLength={150}
                            spellCheck={false}
                            value={inlineTextEdit.value}
                            onPointerDown={(event) => event.stopPropagation()}
                            onChange={(event) => setInlineTextEdit((current) => (current ? { ...current, value: event.target.value } : current))}
                            onBlur={() => commitInlineTextEdit()}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelInlineTextEdit();
                                return;
                              }
                              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                                event.preventDefault();
                                commitInlineTextEdit();
                              }
                            }}
                            aria-label={copy.canvas.inlineTextEditorAria}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 hidden justify-center min-[1024px]:flex">
                  <div className="inline-flex items-center gap-2 rounded-base border border-border bg-surface px-2 py-2">
                    <PreviewControlToolbar
                      copy={copy.canvas}
                      zoom={zoom}
                      showCenterGuide={showCenterGuide}
                      canUndo={draftHistoryAvailability.canUndo}
                      canRedo={draftHistoryAvailability.canRedo}
                      onUndo={undoDraft}
                      onRedo={redoDraft}
                      onGuideToggle={() => setShowCenterGuide((value) => !value)}
                      onZoomOut={() => updateZoom((value) => Math.max(0.42, value - 0.08))}
                      onZoomIn={() => updateZoom((value) => Math.min(1.6, value + 0.08))}
                      onZoomReset={resetZoom}
                      onZoomFit={fitZoomToViewport}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-4 grid min-w-0 gap-3 min-[1024px]:hidden">
                <QuickAddBar
                  copy={copy}
                  onText={() => addLayer(createTextLayer())}
                onShape={(shapeType) => addLayer(createShapeLayer(shapeType))}
                onImage={() => fileInputRef.current?.click()}
                onMaterial={() => setMobilePanel("materials")}
              />
              {mobilePanel === "canvas" && (
                <PresetCards
                  copy={copy}
                  locale={locale}
                  currentPresetId={draft.presetId}
                  favoritePresetIds={presetDiscoveryState.favoritePresetIds}
                  recentPresetIds={presetDiscoveryState.recentPresetIds}
                  currentVariantId={currentVariantId}
                  hasScheduleHandoff={Boolean(handoffPayload)}
                  onApply={requestPresetApply}
                  onFavoriteToggle={togglePresetFavorite}
                />
              )}
              {mobilePanel === "materials" && (
                <>
                  <MaterialLibraryPanel copy={copy} locale={locale} onAdd={addMaterialLayer} />
                  <UserMaterialLibraryPanel
                    copy={copy}
                    refs={userMaterialRefs}
                    imageUrls={userMaterialImageUrls}
                    usageSummary={userMaterialUsageSummary}
                    onUpload={() => openUserMaterialFilePicker()}
                    onAdd={addUserMaterialLayer}
                    onReplaceUserMaterial={openUserMaterialFilePicker}
                    onDeleteUserMaterial={deleteUserMaterial}
                  />
                </>
              )}
              {mobilePanel === "layers" && (
                <LayerPanel
                  copy={copy}
                  locale={locale}
                  layers={draft.layers}
                  presetId={draft.presetId}
                  selectedLayerId={draft.selectedLayerId}
                  onSelect={selectLayerFromEditor}
                  onMove={moveLayer}
                  onDuplicate={duplicateLayer}
                  onDelete={deleteLayer}
                  onToggleFlag={toggleLayerFlag}
                />
              )}
              {mobilePanel === "text" && selectedLayer && (
                <PropertyPanel
                  copy={copy}
                  locale={locale}
                  layer={selectedLayer}
                  canvas={draft.canvas}
                  qualityGuardItems={localizedQualityGuardItems}
                  fontMenuOpen={fontMenuOpen}
                  onFontMenuOpenChange={setFontMenuOpen}
                  onChange={updateSelectedLayer}
                  onStandeePlacement={applyStandeePlacementPreset}
                />
              )}
              {mobilePanel === "export" && (
                <ExportPanel
                  copy={copy}
                  exportFormat={exportFormat}
                  qualityGuardSummary={overallQualityGuardSummary}
                  onFormatChange={setExportFormat}
                  onSave={saveDraft}
                  onExport={exportImage}
                  onSendToSns={sendToSnsSplit}
                />
              )}
            </section>

            <div className="hidden min-[1024px]:mt-4 min-[1024px]:block">
              <PresetCards
                copy={copy}
                locale={locale}
                currentPresetId={draft.presetId}
                favoritePresetIds={presetDiscoveryState.favoritePresetIds}
                recentPresetIds={presetDiscoveryState.recentPresetIds}
                currentVariantId={currentVariantId}
                hasScheduleHandoff={Boolean(handoffPayload)}
                onApply={requestPresetApply}
                onFavoriteToggle={togglePresetFavorite}
              />
            </div>
          </main>

          <aside className={sidePanelCollapsed ? "hidden" : "hidden min-h-0 border-l border-border bg-surface/78 min-[1024px]:block"}>
            <div className="h-full space-y-3 overflow-y-auto p-4 scrollbar-accent xl:p-5">
              <QuickAddBar
                copy={copy}
                onText={() => addLayer(createTextLayer())}
                onShape={(shapeType) => addLayer(createShapeLayer(shapeType))}
                onImage={() => fileInputRef.current?.click()}
                onMaterial={() => setSidePanelCollapsed(false)}
              />
              <MaterialLibraryPanel copy={copy} locale={locale} onAdd={addMaterialLayer} />
              <UserMaterialLibraryPanel
                copy={copy}
                refs={userMaterialRefs}
                imageUrls={userMaterialImageUrls}
                usageSummary={userMaterialUsageSummary}
                onUpload={() => openUserMaterialFilePicker()}
                onAdd={addUserMaterialLayer}
                onReplaceUserMaterial={openUserMaterialFilePicker}
                onDeleteUserMaterial={deleteUserMaterial}
              />
              <LayerPanel
                copy={copy}
                locale={locale}
                layers={draft.layers}
                presetId={draft.presetId}
                selectedLayerId={draft.selectedLayerId}
                onSelect={selectLayerFromEditor}
                onMove={moveLayer}
                onDuplicate={duplicateLayer}
                onDelete={deleteLayer}
                onToggleFlag={toggleLayerFlag}
              />
              {selectedLayer ? (
                <PropertyPanel
                  copy={copy}
                  locale={locale}
                  layer={selectedLayer}
                  canvas={draft.canvas}
                  qualityGuardItems={localizedQualityGuardItems}
                  fontMenuOpen={fontMenuOpen}
                  onFontMenuOpenChange={setFontMenuOpen}
                  onChange={updateSelectedLayer}
                  onStandeePlacement={applyStandeePlacementPreset}
                />
              ) : (
                <div className="panel p-4 text-sm text-muted">{copy.canvas.selectLayerEmpty}</div>
              )}
              <ExportPanel
                copy={copy}
                exportFormat={exportFormat}
                qualityGuardSummary={overallQualityGuardSummary}
                onFormatChange={setExportFormat}
                onSave={saveDraft}
                onExport={exportImage}
                onSendToSns={sendToSnsSplit}
              />
            </div>
          </aside>
        </div>
      </div>

      <nav className="grid shrink-0 grid-cols-5 border-t border-border bg-surface/95 min-[1024px]:hidden">
        {mobilePanelItems.map((item) => (
          <button
            key={item.id}
            className={[
              "flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold",
              mobilePanel === item.id ? "text-primary-strong" : "text-muted"
            ].join(" ")}
            type="button"
            onClick={() => setMobilePanel(item.id)}
          >
            <span className="text-lg">{item.icon}</span>
            {copy.mobilePanels[item.id]}
          </button>
        ))}
      </nav>

      {mobilePreviewOpen ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground min-[1024px]:hidden" role="dialog" aria-modal="true" aria-label={copy.canvas.previewTitle}>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary-strong">{copy.canvas.previewTitle}</p>
              <h2 className="truncate text-base font-black text-foreground">{selectedPresetName}</h2>
            </div>
            <button type="button" className="flat-control px-3 py-2 text-sm font-bold" onClick={() => setMobilePreviewOpen(false)} aria-label={copy.aria.closeFullPreview}>
              {copy.canvas.previewClose}
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
            <div className="relative w-full" style={mobilePreviewFrameStyle}>
              <canvas
                ref={setMobilePreviewCanvasRef}
                className="h-full w-full rounded-base border border-border bg-[#081117] object-contain shadow-panel"
                aria-label={copy.aria.fullPreviewCanvas}
              />
              {showCenterGuide ? <CanvasCenterGuideOverlay /> : null}
            </div>
          </div>
          <p className="shrink-0 border-t border-border px-4 py-3 text-center text-xs leading-5 text-muted">
            {copy.canvas.previewNote}
          </p>
        </div>
      ) : null}

      {iriamSquarePresetModalPresetId ? (
        <IriamSquareKaraokePresetDialog
          copy={copy}
          presetId={iriamSquarePresetModalPresetId}
          config={
            iriamSquarePresetModalPresetId === "dark_gacha"
              ? thumbnailIriamSquareDarkGachaPresetConfig
              : iriamSquarePresetModalPresetId === "chatting"
                ? thumbnailIriamSquareChattingPresetConfig
                : thumbnailIriamSquarePresetConfig
          }
          onConfigChange={(config) => {
            if (iriamSquarePresetModalPresetId === "dark_gacha") {
              setThumbnailIriamSquareDarkGachaPresetConfig(config as ThumbnailIriamSquareDarkGachaPresetConfig);
            } else if (iriamSquarePresetModalPresetId === "chatting") {
              setThumbnailIriamSquareChattingPresetConfig(config as ThumbnailIriamSquareChattingPresetConfig);
            } else {
              setThumbnailIriamSquarePresetConfig(config as ThumbnailIriamSquareKaraokePresetConfig);
            }
          }}
          onApply={() => {
            if (iriamSquarePresetModalPresetId === "dark_gacha") {
              applyDarkGachaIriamSquarePreset(thumbnailIriamSquareDarkGachaPresetConfig);
            } else if (iriamSquarePresetModalPresetId === "chatting") {
              applyChattingIriamSquarePreset(thumbnailIriamSquareChattingPresetConfig);
            } else {
              applyKaraokeIriamSquarePreset(thumbnailIriamSquarePresetConfig);
            }
          }}
          onCancel={() => setIriamSquarePresetModalPresetId(null)}
        />
      ) : null}

      {pendingPreset ? (
        <PresetApplyConfirmDialog
          copy={copy}
          locale={locale}
          currentPresetName={selectedPresetName}
          targetPreset={pendingPreset}
          currentText={currentMainTextCarryover}
          targetText={pendingPresetDefaultText}
          hasScheduleHandoff={Boolean(handoffPayload)}
          onApplyPlain={() => applyPreset(pendingPreset.id, "plain")}
          onApplyCarryover={() => applyPreset(pendingPreset.id, handoffPayload ? "handoff" : "carryover")}
          onCancel={() => setPendingPresetApplyId(null)}
        />
      ) : null}

      <input ref={fileInputRef} className="hidden" type="file" accept="image/png,image/jpeg" onChange={handleImageUpload} aria-label={copy.aria.imageFileInput} />
      <input
        ref={userMaterialFileInputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleUserMaterialUpload}
        aria-label={copy.aria.userMaterialFileInput}
      />
      {toast && (
        <div className={`fixed bottom-20 left-4 right-4 z-50 rounded-base border px-4 py-3 text-sm font-bold shadow-panel min-[1024px]:bottom-5 min-[1024px]:left-auto min-[1024px]:right-5 min-[1024px]:w-96 ${toneClassName[toast.tone]}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function QuickAddBar({
  copy,
  onText,
  onShape,
  onImage,
  onMaterial
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  onText: () => void;
  onShape: (shapeType: ThumbnailShapeType) => void;
  onImage: () => void;
  onMaterial: () => void;
}) {
  return (
    <section className="panel p-3">
      <div className="grid grid-cols-5 gap-2">
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={onText} aria-label={copy.quickAdd.textAria}>
          {copy.quickAdd.text}
        </button>
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={() => onShape("rect")} aria-label={copy.quickAdd.rectAria}>
          {copy.quickAdd.rect}
        </button>
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={() => onShape("circle")} aria-label={copy.quickAdd.circleAria}>
          {copy.quickAdd.circle}
        </button>
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={onImage} aria-label={copy.quickAdd.imageAria}>
          {copy.quickAdd.image}
        </button>
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={onMaterial} aria-label={copy.quickAdd.materialAria}>
          {copy.quickAdd.material}
        </button>
      </div>
    </section>
  );
}

function MaterialLibraryPanel({ copy, locale, onAdd }: { copy: ReturnType<typeof getThumbnailEditorCopy>; locale: Locale; onAdd: (id: string) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<ThumbnailMaterialCategory | "all">("all");
  const [materialSearchQuery, setMaterialSearchQuery] = useState("");
  const materialCategories = useMemo(
    () => Array.from(new Set(thumbnailMaterialLibrary.map((material) => material.category))) as ThumbnailMaterialCategory[],
    []
  );
  const materialCategoryCounts = useMemo(() => {
    const counts = Object.fromEntries(materialCategories.map((category) => [category, 0])) as Record<ThumbnailMaterialCategory, number>;
    for (const material of thumbnailMaterialLibrary) {
      counts[material.category] += 1;
    }
    return counts;
  }, [materialCategories]);
  const filteredMaterials = useMemo(
    () => filterLocalizedThumbnailMaterials(thumbnailMaterialLibrary, materialSearchQuery, selectedCategory, locale),
    [locale, materialSearchQuery, selectedCategory]
  );
  const selectedCategoryCount = selectedCategory === "all" ? thumbnailMaterialLibrary.length : materialCategoryCounts[selectedCategory];

  return (
    <section className="panel space-y-3 p-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-foreground">{copy.panels.materials.title}</h2>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-muted">{copy.panels.materials.guide}</p>
        </div>
        <p className="shrink-0 text-right text-xs font-bold leading-5 text-muted">
          {filteredMaterials.length} / {selectedCategoryCount}{copy.panels.materials.itemUnit}
          <span className="block text-[11px] font-bold text-muted/80">{copy.panels.materials.allPrefix}{thumbnailMaterialLibrary.length}{copy.panels.materials.itemUnit}</span>
        </p>
      </div>
      <label className="block">
        <span className="sr-only">{copy.panels.materials.search}</span>
        <input
          className="w-full rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:bg-primary-soft/20"
          type="search"
          value={materialSearchQuery}
          onChange={(event) => setMaterialSearchQuery(event.target.value)}
          placeholder={copy.panels.materials.search}
          aria-label={copy.panels.materials.search}
        />
      </label>
      <div className="scrollbar-accent flex gap-2 overflow-x-auto pb-1 [scrollbar-gutter:stable] min-[520px]:flex-wrap min-[520px]:overflow-visible min-[520px]:pb-0">
        {[
          { id: "all", label: copy.panels.materials.all, count: thumbnailMaterialLibrary.length },
          ...materialCategories.map((category) => ({
            id: category,
            label: getThumbnailMaterialCategoryLabel(category, locale),
            count: materialCategoryCounts[category]
          }))
        ].map((option) => (
          <button
            key={option.id}
            className={[
              "shrink-0 rounded-base border px-2.5 py-1.5 text-xs font-bold transition",
              selectedCategory === option.id ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface text-muted hover:text-foreground"
            ].join(" ")}
            type="button"
            onClick={() => setSelectedCategory(option.id as ThumbnailMaterialCategory | "all")}
            aria-pressed={selectedCategory === option.id}
          >
            {option.label}
            <span className="ml-1 text-[11px] opacity-75">{option.count}</span>
          </button>
        ))}
      </div>
      <div className="scrollbar-accent grid max-h-[min(60vh,38rem)] gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        {filteredMaterials.map((material) => {
          const materialName = getThumbnailMaterialName(material.id, locale, material.name);
          const materialDescription = getThumbnailMaterialDescription(material, locale);
          const materialPlacement = getThumbnailMaterialRecommendedPlacement(material, locale);
          const materialCategory = getThumbnailMaterialCategoryLabel(material.category, locale);
          return (
            <button
              key={material.id}
              className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2 rounded-base border border-border bg-surface p-2 text-left transition hover:border-primary hover:bg-primary-soft/35 md:grid-cols-[5.25rem_minmax(0,1fr)]"
              type="button"
              onClick={() => onAdd(material.id)}
              aria-label={copy.aria.addMaterial(materialName)}
              title={materialDescription}
            >
              <span className="grid aspect-video place-items-center overflow-hidden rounded-sm border border-border bg-[#07111c]">
                <span
                  className="block h-full w-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${material.src})` }}
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-foreground">{materialName}</span>
                <span className="mt-1 inline-flex rounded-sm border border-primary/40 bg-primary-soft/40 px-2 py-0.5 text-[11px] font-bold text-primary-strong">
                  {materialCategory}
                </span>
                <span className="mt-1 line-clamp-1 block text-xs leading-5 text-muted">{materialPlacement}</span>
                <span className="line-clamp-1 block text-[11px] leading-4 text-muted/85">{materialDescription}</span>
              </span>
            </button>
          );
        })}
        {filteredMaterials.length === 0 ? (
          <div className="rounded-base border border-dashed border-border bg-surface-muted/40 px-3 py-5 text-center text-xs font-bold leading-5 text-muted">
            {copy.panels.materials.empty}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ModeToggle({
  copy,
  editorMode,
  onModeChange,
  className = ""
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  editorMode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex rounded-base border border-border bg-surface p-1 ${className}`}>
      <button
        className={`px-3 py-1 text-xs font-bold ${editorMode === "edit" ? "rounded-sm bg-primary text-white" : "text-muted"}`}
        type="button"
        onClick={() => onModeChange("edit")}
      >
        {copy.tools.edit}
      </button>
      <button
        className={`px-3 py-1 text-xs font-bold ${editorMode === "pan" ? "rounded-sm bg-primary text-white" : "text-muted"}`}
        type="button"
        onClick={() => onModeChange("pan")}
      >
        {copy.tools.pan}
      </button>
    </div>
  );
}

function DesktopToolRail({
  copy,
  editorMode,
  onModeChange,
  onText,
  onShape,
  onImage,
  onMaterial
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  editorMode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onText: () => void;
  onShape: (shapeType: ThumbnailShapeType) => void;
  onImage: () => void;
  onMaterial: () => void;
}) {
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const shapeMenuRef = useRef<HTMLDivElement | null>(null);
  const toolButtonClass = (active: boolean) =>
    [
      "flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-base border text-[11px] font-bold transition",
      active ? "border-primary bg-primary-soft text-primary-strong" : "border-transparent text-muted hover:border-border hover:bg-surface"
    ].join(" ");

  useEffect(() => {
    if (!shapeMenuOpen) {
      return;
    }
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!shapeMenuRef.current?.contains(event.target as Node)) {
        setShapeMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [shapeMenuOpen]);

  return (
    <div className="hidden w-16 shrink-0 flex-col items-center gap-2 rounded-base border border-border bg-surface p-2 min-[1024px]:flex">
      <button className={toolButtonClass(editorMode === "edit")} type="button" onClick={() => onModeChange("edit")} title={copy.tools.select}>
        <span className="text-lg">⌖</span>
        {copy.tools.select}
      </button>
      <button className={toolButtonClass(false)} type="button" onClick={onText} title={copy.tools.text}>
        <span className="text-lg">T</span>
        {copy.tools.text}
      </button>
      <div ref={shapeMenuRef} className="relative">
        <button className={toolButtonClass(shapeMenuOpen)} type="button" onClick={() => setShapeMenuOpen((current) => !current)} title={copy.tools.shape}>
          <span className="text-lg">◇</span>
          {copy.tools.shape}
        </button>
        {shapeMenuOpen && (
          <div className="absolute left-full top-0 z-50 ml-2 w-32 rounded-base border border-border bg-surface p-1 shadow-panel">
            <button
              className="block w-full rounded-base px-3 py-2 text-left text-xs font-bold text-foreground hover:bg-primary-soft"
              type="button"
              onClick={() => {
                onShape("rect");
                setShapeMenuOpen(false);
              }}
            >
              {copy.quickAdd.rect}
            </button>
            <button
              className="block w-full rounded-base px-3 py-2 text-left text-xs font-bold text-foreground hover:bg-primary-soft"
              type="button"
              onClick={() => {
                onShape("circle");
                setShapeMenuOpen(false);
              }}
            >
              {copy.quickAdd.circle}
            </button>
          </div>
        )}
      </div>
      <button className={toolButtonClass(false)} type="button" onClick={onImage} title={copy.tools.image}>
        <span className="text-lg">▧</span>
        {copy.tools.image}
      </button>
      <button className={toolButtonClass(false)} type="button" onClick={onMaterial} title={copy.tools.material}>
        <span className="text-lg">◇</span>
        {copy.tools.material}
      </button>
      <div className="my-1 h-px w-10 bg-border" />
      <button className={toolButtonClass(editorMode === "pan")} type="button" onClick={() => onModeChange("pan")} title={copy.tools.pan}>
        <span className="text-lg">⌕</span>
        {copy.tools.zoom}
      </button>
    </div>
  );
}

function LayerPanel({
  copy,
  locale,
  layers,
  presetId,
  selectedLayerId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onToggleFlag
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  locale: Locale;
  layers: ThumbnailLayer[];
  presetId: ThumbnailPresetId;
  selectedLayerId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "front" | "back") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFlag: (id: string, flag: "hidden" | "locked") => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const usesWeeklyGroups = presetId === "weekly_schedule";
  const orderedLayers = useMemo(() => [...layers].reverse(), [layers]);
  const weeklyGroups = useMemo(() => {
    if (!usesWeeklyGroups) {
      return [];
    }

    return weeklyScheduleGroupOrder
      .map((dayName) => {
        const groupLayers = layers
          .filter((layer) => getWeeklyScheduleLayerGroup(layer)?.groupId === dayName)
          .sort((a, b) => {
            const aLabel = getWeeklyScheduleLayerGroup(a)?.itemLabel ?? "";
            const bLabel = getWeeklyScheduleLayerGroup(b)?.itemLabel ?? "";
            return weeklyScheduleColumnOrder.indexOf(aLabel) - weeklyScheduleColumnOrder.indexOf(bLabel);
          });

        return {
          id: dayName,
          label: dayName,
          layers: groupLayers
        };
      })
      .filter((group) => group.layers.length > 0);
  }, [layers, usesWeeklyGroups]);
  const groupedLayerIds = useMemo(() => new Set(weeklyGroups.flatMap((group) => group.layers.map((layer) => layer.id))), [weeklyGroups]);
  const ungroupedLayers = usesWeeklyGroups ? orderedLayers.filter((layer) => !groupedLayerIds.has(layer.id)) : orderedLayers;

  const renderLayerCard = (layer: ThumbnailLayer, compactName?: string) => (
    <div
      key={layer.id}
      className={[
        "rounded-base border p-2 transition",
        layer.id === selectedLayerId ? "border-primary bg-primary-soft/70" : "border-border bg-surface"
      ].join(" ")}
    >
      <button className="flex w-full items-center gap-2 text-left" type="button" onClick={() => onSelect(layer.id)}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-base bg-surface-muted text-sm font-black text-primary-strong">
          {layer.type === "text" ? "T" : layer.type === "image" ? "▧" : layer.type === "shape" && layer.shapeType === "circle" ? "●" : "■"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{getThumbnailLayerDisplayName(layer, locale, compactName)}</span>
        <span className="text-xs text-muted">{layer.type}</span>
      </button>
      <div className="mt-2 grid grid-cols-6 gap-1">
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onMove(layer.id, "front")} title={copy.layerControls.moveFront}>
          ↑
        </button>
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onMove(layer.id, "back")} title={copy.layerControls.moveBack}>
          ↓
        </button>
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onDuplicate(layer.id)} title={copy.layerControls.duplicate}>
          {copy.layerControls.duplicateShort}
        </button>
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onToggleFlag(layer.id, "hidden")} title={copy.layerControls.toggleVisibility}>
          {layer.hidden ? copy.layerControls.hiddenShort : copy.layerControls.visibleShort}
        </button>
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onToggleFlag(layer.id, "locked")} title={copy.layerControls.toggleLock}>
          {layer.locked ? copy.layerControls.lockedShort : copy.layerControls.unlockedShort}
        </button>
        <button className="flat-control py-1 text-xs text-rose-500" type="button" onClick={() => onDelete(layer.id)} title={copy.layerControls.delete}>
          {copy.layerControls.deleteShort}
        </button>
      </div>
    </div>
  );

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-black text-foreground">{copy.panels.layers.title}</h2>
        <p className="text-xs font-bold text-muted">{copy.panels.layers.guide}</p>
      </div>
      <div className="scrollbar-accent max-h-[min(52vh,560px)] overflow-y-auto [scrollbar-gutter:stable]">
        <div className="space-y-2 pr-1">
          {ungroupedLayers.map((layer) => renderLayerCard(layer))}
          {weeklyGroups.map((group) => {
            const groupSelected = group.layers.some((layer) => layer.id === selectedLayerId);
            const collapsed = collapsedGroups[group.id] ?? !groupSelected;

            return (
              <div key={group.id} className="rounded-base border border-border bg-surface-muted/45 p-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-base px-2 py-2 text-left text-sm font-black text-foreground hover:bg-surface-muted"
                  aria-expanded={!collapsed}
                  aria-label={copy.aria.toggleWeeklyGroup(group.label, collapsed)}
                  onClick={() => setCollapsedGroups((current) => ({ ...current, [group.id]: !collapsed }))}
                >
                  <span>{copy.panels.layers.weeklyGroupPrefix} / {getThumbnailLayerDisplayName({ name: group.label, type: "text" }, locale)}</span>
                  <span className="text-base font-black text-muted" aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
                </button>
                {!collapsed ? (
                  <div className="mt-2 space-y-2">
                    {group.layers.map((layer) => renderLayerCard(layer, getWeeklyScheduleLayerGroup(layer)?.itemLabel ?? layer.name))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PropertyPanel({
  copy,
  locale,
  layer,
  canvas,
  qualityGuardItems,
  fontMenuOpen,
  onFontMenuOpenChange,
  onChange,
  onStandeePlacement
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  locale: Locale;
  layer: ThumbnailLayer;
  canvas: ThumbnailEditorDraft["canvas"];
  qualityGuardItems: ThumbnailQualityGuardItem[];
  fontMenuOpen: boolean;
  onFontMenuOpenChange: (open: boolean) => void;
  onChange: (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => void;
  onStandeePlacement: (presetId: ThumbnailStandeePlacementPresetId) => void;
}) {
  const layerGuidance =
    layer.type === "text"
      ? copy.panels.property.textGuide
      : layer.type === "image"
        ? copy.panels.property.imageGuide
        : null;
  const layerNameDisplayValue = getThumbnailLayerDisplayName(layer, locale);

  return (
    <section className="panel min-w-0 space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-foreground">{layer.type === "text" ? copy.panels.property.textTitle : layer.type === "shape" ? copy.panels.property.shapeTitle : copy.panels.property.imageTitle}</h2>
          {layerGuidance ? <p className="mt-1 text-[11px] font-semibold leading-5 text-muted">{layerGuidance}</p> : null}
        </div>
        <span className="rounded-base bg-surface-muted px-2 py-1 text-xs font-bold text-muted">{getThumbnailLayerDisplayName(layer, locale)}</span>
      </div>

      <label className="block text-xs font-bold text-muted">
        {copy.panels.property.layerName}
        <input
          className="mt-1 w-full rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground"
          maxLength={40}
          type="text"
          value={getThumbnailLayerDisplayName(layer, locale)}
          onChange={(event) => onChange((item) => ({ ...item, name: event.target.value.slice(0, 40) }))}
          onBlur={(event) => {
            if (event.target.value === layerNameDisplayValue && layer.name !== event.target.value) {
              return;
            }
            const fallback = layer.type === "text" ? copy.panels.property.textFallback : layer.type === "shape" ? copy.panels.property.shapeFallback : copy.panels.property.imageFallback;
            onChange((item) => ({ ...item, name: normalizeThumbnailLayerName(event.target.value, fallback) }));
          }}
        />
      </label>
      <ThumbnailQualityGuardPanel copy={copy} items={qualityGuardItems} />
      <LayerQuickAdjustPanel copy={copy} locale={locale} layer={layer} canvas={canvas} onChange={onChange} />

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="X" value={layer.x} min={-2000} max={4000} onChange={(x) => onChange((item) => ({ ...item, x }))} />
        <NumberField label="Y" value={layer.y} min={-2000} max={4000} onChange={(y) => onChange((item) => ({ ...item, y }))} />
        <NumberField label={copy.panels.property.width} value={layer.width} min={16} max={4000} onChange={(width) => onChange((item) => ({ ...item, width }))} />
        <NumberField label={copy.panels.property.height} value={layer.height} min={16} max={4000} onChange={(height) => onChange((item) => ({ ...item, height }))} />
      </div>

      {layer.type === "text" && <TextControls copy={copy} locale={locale} layer={layer} fontMenuOpen={fontMenuOpen} onFontMenuOpenChange={onFontMenuOpenChange} onChange={onChange} />}
      {layer.type === "shape" && <ShapeControls copy={copy} layer={layer} onChange={onChange} />}
      {layer.type === "image" && <StandeePlacementPanel copy={copy} locale={locale} layer={layer} onApply={onStandeePlacement} />}
      <EffectControls copy={copy} layer={layer} onChange={onChange} />
    </section>
  );
}

function LayerQuickAdjustPanel({
  copy,
  locale,
  layer,
  canvas,
  onChange
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  locale: Locale;
  layer: ThumbnailLayer;
  canvas: ThumbnailEditorDraft["canvas"];
  onChange: (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => void;
}) {
  const scaleLayer = (scale: number) => {
    onChange((item) => {
      const center = getLayerCenter(item);
      const width = clamp(Math.round(item.width * scale), 16, 4000);
      const height = clamp(Math.round(item.height * scale), 16, 4000);
      return {
        ...item,
        width,
        height,
        x: Math.round(center.x - width / 2),
        y: Math.round(center.y - height / 2)
      };
    });
  };
  const rotateLayer = (delta: number) => {
    onChange((item) => ({ ...item, rotation: normalizeDeg(item.rotation + delta) }));
  };
  const centerLayer = () => {
    onChange((item) => ({
      ...item,
      x: Math.round((canvas.width - item.width) / 2),
      y: Math.round((canvas.height - item.height) / 2)
    }));
  };
  const layerDisplayName = getThumbnailLayerDisplayName(layer, locale);

  return (
    <div className="rounded-base border border-border bg-surface-muted/55 p-3" data-thumbnail-layer-rescue-controls="true">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-black text-foreground">{copy.quickAdjust.title}</h3>
        <span className="text-[10px] font-bold text-muted">{copy.quickAdjust.note}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="flat-control px-2 py-2 text-xs font-bold" type="button" onClick={() => scaleLayer(0.9)} aria-label={copy.quickAdjust.shrinkAria(layerDisplayName)}>
          {copy.quickAdjust.shrink}
        </button>
        <button className="flat-control px-2 py-2 text-xs font-bold" type="button" onClick={() => scaleLayer(1.1)} aria-label={copy.quickAdjust.enlargeAria(layerDisplayName)}>
          {copy.quickAdjust.enlarge}
        </button>
        <button className="flat-control px-2 py-2 text-xs font-bold" type="button" onClick={() => rotateLayer(-5)} aria-label={copy.quickAdjust.rotateLeftAria(layerDisplayName)}>
          {copy.quickAdjust.rotateLeft}
        </button>
        <button className="flat-control px-2 py-2 text-xs font-bold" type="button" onClick={() => rotateLayer(5)} aria-label={copy.quickAdjust.rotateRightAria(layerDisplayName)}>
          {copy.quickAdjust.rotateRight}
        </button>
        <button className="flat-control col-span-2 px-2 py-2 text-xs font-bold" type="button" onClick={centerLayer} aria-label={copy.quickAdjust.centerAria(layerDisplayName)}>
          {copy.quickAdjust.center}
        </button>
      </div>
    </div>
  );
}

function ThumbnailQualityGuardPanel({ copy, items }: { copy: ReturnType<typeof getThumbnailEditorCopy>; items: ThumbnailQualityGuardItem[] }) {
  const toneClassName: Record<ThumbnailQualityGuardItem["tone"], string> = {
    warning: "border-amber-400/55 bg-amber-500/10 text-amber-200",
    hint: "border-sky-400/45 bg-sky-500/10 text-sky-100",
    ok: "border-emerald-400/45 bg-emerald-500/10 text-emerald-100"
  };

  return (
    <div className="rounded-base border border-border bg-surface-muted/55 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-black text-foreground">{copy.panels.quality.title}</h3>
        <span className="text-[10px] font-bold text-muted">{copy.panels.quality.note}</span>
      </div>
      <div className="grid gap-1.5">
        {items.map((item) => (
          <p key={item.id} className={`rounded-sm border px-2 py-1.5 text-[11px] font-bold leading-5 ${toneClassName[item.tone]}`}>
            {item.message}
          </p>
        ))}
      </div>
    </div>
  );
}

function StandeePlacementPanel({
  copy,
  locale,
  layer,
  onApply
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  locale: Locale;
  layer: Extract<ThumbnailLayer, { type: "image" }>;
  onApply: (presetId: ThumbnailStandeePlacementPresetId) => void;
}) {
  const groups = ["1人", "2人", "3人"] as const;
  const lockedReason = copy.standee.lockedReason;
  const layerDisplayName = getThumbnailLayerDisplayName(layer, locale);

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-foreground">{copy.standee.title}</h3>
        {layer.locked ? <span className="text-[11px] font-bold text-muted">{copy.standee.locked}</span> : null}
      </div>
      <p className="truncate text-[11px] font-bold text-muted">
        {copy.standee.target}: <span className="text-foreground">{layerDisplayName}</span>
      </p>
      {layer.locked ? <p className="text-[11px] font-semibold text-muted">{copy.standee.unlockGuide}</p> : null}
      <p className="text-[11px] font-semibold leading-relaxed text-muted">{copy.standee.multiGuide}</p>
      {groups.map((group) => (
        <div key={group} className="space-y-2">
          <p className="text-[11px] font-black text-muted">{getThumbnailStandeePlacementGroup(group, locale)}</p>
          <div className="grid grid-cols-2 gap-2">
            {thumbnailStandeePlacementPresets
              .filter((preset) => preset.group === group)
              .map((preset) => {
                const placementName = getThumbnailStandeePlacementName(preset.id, locale, preset.name);
                const placementDescription = getThumbnailStandeePlacementDescription(preset, locale);
                return (
                <button
                  key={preset.id}
                  className="flat-control min-h-12 px-2 py-2 text-left text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                  type="button"
                  disabled={Boolean(layer.locked)}
                  onClick={() => onApply(preset.id)}
                  title={layer.locked ? `${placementDescription} (${lockedReason})` : placementDescription}
                  aria-label={layer.locked ? `${placementName}. ${lockedReason}.` : placementName}
                >
                  <span className="block text-foreground">{placementName}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{placementDescription}</span>
                </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TextControls({
  copy,
  locale,
  layer,
  fontMenuOpen,
  onFontMenuOpenChange,
  onChange
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  locale: Locale;
  layer: Extract<ThumbnailLayer, { type: "text" }>;
  fontMenuOpen: boolean;
  onFontMenuOpenChange: (open: boolean) => void;
  onChange: (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => void;
}) {
  const update = <K extends keyof typeof layer>(key: K, value: (typeof layer)[K]) => onChange((item) => (item.type === "text" ? { ...item, [key]: value } : item));
  const fontMenuRef = useRef<HTMLDivElement | null>(null);
  const [fontSearch, setFontSearch] = useState("");
  const [recentFonts, setRecentFonts] = useState<string[]>([]);
  const filteredFontGroups = useMemo(() => filterThumbnailFontListboxGroups(fontSearch), [fontSearch]);
  const recentFontOptions = useMemo(
    () =>
      recentFonts
        .map((family) => getThumbnailFontManifestEntry(family))
        .filter((font): font is NonNullable<ReturnType<typeof getThumbnailFontManifestEntry>> => Boolean(font)),
    [recentFonts]
  );
  const persistRecentFonts = (fontFamily: string) => {
    setRecentFonts((current) => {
      const next = createNextRecentThumbnailFontFamilies(current, fontFamily);
      try {
        window.localStorage.setItem(thumbnailFontRecentStorageKey, JSON.stringify(next));
      } catch {
        // Recent fonts are convenience-only; selection should still work when storage is unavailable.
      }
      return next;
    });
  };
  const selectFontFamily = (fontFamily: string) => {
    update("fontFamily", fontFamily);
    persistRecentFonts(fontFamily);
    onFontMenuOpenChange(false);
  };

  useEffect(() => {
    if (!fontMenuOpen) {
      return;
    }
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!fontMenuRef.current?.contains(event.target as Node)) {
        onFontMenuOpenChange(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [fontMenuOpen, onFontMenuOpenChange]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(thumbnailFontRecentStorageKey);
      setRecentFonts(saved ? normalizeThumbnailRecentFontFamilies(JSON.parse(saved)) : []);
    } catch {
      window.localStorage.removeItem(thumbnailFontRecentStorageKey);
      setRecentFonts([]);
    }
  }, []);

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <label className="block text-xs font-bold text-muted">
        {copy.textControls.text}
        <textarea
          className="mt-1 min-h-24 w-full rounded-base border border-border bg-surface px-3 py-2 text-sm text-foreground"
          maxLength={150}
          value={layer.text}
          onChange={(event) => update("text", event.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div ref={fontMenuRef} className="relative text-xs font-bold text-muted">
          {copy.textControls.font}
          <button
            type="button"
            className="mt-1 flex w-full items-center justify-between gap-2 rounded-base border border-border bg-surface px-3 py-2 text-left text-sm font-bold text-foreground"
            aria-haspopup="listbox"
            aria-expanded={fontMenuOpen}
            onClick={() => onFontMenuOpenChange(!fontMenuOpen)}
          >
            <span className="min-w-0 truncate">{layer.fontFamily}</span>
            <span className="shrink-0 text-muted">⌄</span>
          </button>
          {fontMenuOpen ? (
            <div className="absolute left-0 right-0 top-full z-[30] mt-1 rounded-base border border-border bg-surface p-1 shadow-panel">
              <div className="p-1">
                <input
                  className="w-full rounded-base border border-border bg-background px-2 py-1.5 text-xs font-bold text-foreground placeholder:text-muted"
                  type="search"
                  value={fontSearch}
                  onChange={(event) => setFontSearch(event.target.value)}
                  placeholder={copy.textControls.fontSearchPlaceholder}
                  aria-label={copy.textControls.fontSearchAria}
                />
              </div>
              {recentFontOptions.length > 0 && !fontSearch.trim() ? (
                <div className="border-b border-border px-1 pb-2">
                  <p className="px-2 pb-1 pt-1 text-[10px] font-black tracking-normal text-muted/80">{copy.textControls.recent}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {recentFontOptions.map((recentFont) => (
                      <button
                        key={recentFont.family}
                        type="button"
                        className={[
                          "min-w-0 rounded-base px-2 py-1.5 text-left text-xs font-bold",
                          recentFont.family === layer.fontFamily ? "bg-primary-soft text-primary-strong" : "text-foreground hover:bg-surface-muted"
                        ].join(" ")}
                        style={{ fontFamily: `"${recentFont.family}", sans-serif` }}
                        onClick={() => selectFontFamily(recentFont.family)}
                      >
                        <span className="block truncate">{recentFont.family}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="scrollbar-accent max-h-48 overflow-y-auto [scrollbar-gutter:stable]" role="listbox">
                {filteredFontGroups.length > 0 ? (
                  filteredFontGroups.map((group) => (
                  <div key={group.language}>
                    <p className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-normal text-muted">{getThumbnailFontLanguageLabel(group.language, locale)}</p>
                    {group.categories.map((fontCategory) => (
                      <div key={`${group.language}-${fontCategory.label}`}>
                        <p className="px-3 pb-1 pt-2 text-[10px] font-black tracking-normal text-muted/80">{getThumbnailFontCategoryLabel(fontCategory.label, locale)}</p>
                        {fontCategory.options.map((fontOption) => (
                          <button
                            key={fontOption.family}
                            type="button"
                            role="option"
                            aria-selected={fontOption.family === layer.fontFamily}
                            className={[
                              "block w-full rounded-base px-3 py-2 text-left text-sm font-bold",
                              fontOption.family === layer.fontFamily ? "bg-primary-soft text-primary-strong" : "text-foreground hover:bg-surface-muted"
                            ].join(" ")}
                            style={{ fontFamily: `"${fontOption.family}", sans-serif` }}
                            onClick={() => selectFontFamily(fontOption.family)}
                          >
                            <span className="block truncate">{fontOption.label}</span>
                            <span className="mt-0.5 block truncate text-[10px] font-bold text-muted/80">{getThumbnailFontMoodLabel(fontOption.mood, locale)}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  ))
                ) : (
                  <p className="px-3 py-4 text-center text-xs font-bold text-muted">{copy.textControls.noResults}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <NumberField label={copy.textControls.size} value={layer.fontSize} min={12} max={240} onChange={(fontSize) => update("fontSize", fontSize)} />
        <NumberField label={copy.textControls.lineHeight} value={Number(layer.lineHeight.toFixed(2))} min={0.8} max={2} step={0.05} onChange={(lineHeight) => update("lineHeight", lineHeight)} />
        <ColorField copy={copy} label={copy.textControls.color} value={layer.color} onChange={(color) => update("color", color)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["left", "center", "right"] as ThumbnailTextAlign[]).map((align) => (
          <button
            key={align}
            className={`flat-control py-2 text-xs font-bold ${layer.align === align ? "border-primary bg-primary-soft text-primary-strong" : ""}`}
            type="button"
            onClick={() => update("align", align)}
          >
            {align === "left" ? copy.textControls.alignLeft : align === "center" ? copy.textControls.alignCenter : copy.textControls.alignRight}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className={`flat-control py-2 text-sm font-black ${layer.bold ? "border-primary bg-primary-soft text-primary-strong" : ""}`} type="button" onClick={() => update("bold", !layer.bold)}>
          B
        </button>
        <button className={`flat-control py-2 text-sm font-black italic ${layer.italic ? "border-primary bg-primary-soft text-primary-strong" : ""}`} type="button" onClick={() => update("italic", !layer.italic)}>
          I
        </button>
      </div>
    </div>
  );
}

function ShapeControls({ copy, layer, onChange }: { copy: ReturnType<typeof getThumbnailEditorCopy>; layer: Extract<ThumbnailLayer, { type: "shape" }>; onChange: (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => void }) {
  const update = <K extends keyof typeof layer>(key: K, value: (typeof layer)[K]) => onChange((item) => (item.type === "shape" ? { ...item, [key]: value } : item));

  return (
    <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
      <ColorField copy={copy} label={copy.shapeControls.fill} value={layer.fillColor} popoverAlign="left" onChange={(fillColor) => update("fillColor", fillColor)} />
      <ColorField copy={copy} label={copy.shapeControls.stroke} value={layer.strokeColor} onChange={(strokeColor) => update("strokeColor", strokeColor)} />
      <NumberField label={copy.shapeControls.strokeWidth} value={layer.strokeWidth} min={0} max={48} onChange={(strokeWidth) => update("strokeWidth", strokeWidth)} />
      <NumberField label={copy.shapeControls.radius} value={layer.borderRadius} min={0} max={120} onChange={(borderRadius) => update("borderRadius", borderRadius)} />
    </div>
  );
}

function EffectControls({ copy, layer, onChange }: { copy: ReturnType<typeof getThumbnailEditorCopy>; layer: ThumbnailLayer; onChange: (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => void }) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-black text-foreground">{copy.effectControls.title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={copy.effectControls.opacity} value={Math.round(layer.opacity * 100)} min={0} max={100} onChange={(value) => onChange((item) => ({ ...item, opacity: value / 100 }))} suffix="%" />
        <NumberField label={copy.effectControls.blur} value={layer.blur} min={0} max={24} onChange={(blur) => onChange((item) => ({ ...item, blur }))} />
        {layer.type === "text" && (
          <>
            <NumberField label={copy.effectControls.outline} value={layer.strokeWidth} min={0} max={48} onChange={(strokeWidth) => onChange((item) => (item.type === "text" ? { ...item, strokeWidth } : item))} />
            <ColorField copy={copy} label={copy.effectControls.outlineColor} value={layer.strokeColor} onChange={(strokeColor) => onChange((item) => (item.type === "text" ? { ...item, strokeColor } : item))} />
            <NumberField label={copy.effectControls.shadowBlur} value={layer.shadowBlur} min={0} max={64} onChange={(shadowBlur) => onChange((item) => (item.type === "text" ? { ...item, shadowBlur } : item))} />
            <ColorField copy={copy} label={copy.effectControls.shadowColor} value={layer.shadowColor} onChange={(shadowColor) => onChange((item) => (item.type === "text" ? { ...item, shadowColor } : item))} />
            <NumberField label={copy.effectControls.shadowX} value={layer.shadowOffsetX} min={-80} max={80} onChange={(shadowOffsetX) => onChange((item) => (item.type === "text" ? { ...item, shadowOffsetX } : item))} />
            <NumberField label={copy.effectControls.shadowY} value={layer.shadowOffsetY} min={-80} max={80} onChange={(shadowOffsetY) => onChange((item) => (item.type === "text" ? { ...item, shadowOffsetY } : item))} />
          </>
        )}
      </div>
    </div>
  );
}

function UserMaterialLibraryPanel({
  copy,
  refs,
  imageUrls,
  usageSummary,
  onUpload,
  onAdd,
  onReplaceUserMaterial,
  onDeleteUserMaterial
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  refs: ThumbnailUserMaterialRef[];
  imageUrls: Record<string, string>;
  usageSummary: ThumbnailUserMaterialUsageSummary;
  onUpload: () => void;
  onAdd: (ref: ThumbnailUserMaterialRef) => void;
  onReplaceUserMaterial: (ref: ThumbnailUserMaterialRef) => void;
  onDeleteUserMaterial: (ref: ThumbnailUserMaterialRef) => void;
}) {
  return (
    <section className="panel space-y-3 p-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-foreground">{copy.panels.userMaterials.title}</h2>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-muted">{copy.panels.userMaterials.guide}</p>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-muted">
            {copy.panels.userMaterials.limitGuide} {usageSummary.count}/{usageSummary.maxCount} / {formatThumbnailUserMaterialBytes(usageSummary.totalBytes)}.
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-muted">{copy.panels.userMaterials.recoveryGuide}</p>
        </div>
        <button className="flat-control shrink-0 px-3 py-2 text-xs font-bold" type="button" onClick={onUpload}>
          {copy.panels.userMaterials.upload}
        </button>
      </div>
      <div className="grid gap-2">
        {refs.map((ref) => {
          const imageUrl = imageUrls[ref.storageId] ?? null;
          return (
            <article key={ref.storageId} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2 rounded-base border border-border bg-surface p-2 md:grid-cols-[5.25rem_minmax(0,1fr)]">
              <span className="grid aspect-video place-items-center overflow-hidden rounded-sm border border-border bg-[#07111c]">
                {imageUrl ? (
                  <span className="block h-full w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${imageUrl})` }} aria-hidden="true" />
                ) : (
                  <span className="px-2 text-center text-[10px] font-bold leading-4 text-muted">{copy.panels.userMaterials.needsReadd}</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-foreground">{ref.name}</span>
                <span className="mt-1 block text-[11px] font-bold leading-4 text-muted">
                  {ref.mimeType.replace("image/", "").toUpperCase()}
                  {ref.width && ref.height ? ` / ${ref.width}x${ref.height}` : ""}
                  {ref.byteSize ? ` / ${Math.ceil(ref.byteSize / 1024)}KB` : ""}
                </span>
                <span className="mt-2 grid grid-cols-3 gap-1.5">
                  <button className="flat-control px-2 py-1.5 text-[11px] font-bold" type="button" onClick={() => onAdd(ref)}>
                    {copy.panels.userMaterials.place}
                  </button>
                  <button className="flat-control px-2 py-1.5 text-[11px] font-bold" type="button" onClick={() => onReplaceUserMaterial(ref)}>
                    {copy.panels.userMaterials.replace}
                  </button>
                  <button className="flat-control px-2 py-1.5 text-[11px] font-bold text-rose-100" type="button" onClick={() => onDeleteUserMaterial(ref)}>
                    {copy.panels.userMaterials.delete}
                  </button>
                </span>
              </span>
            </article>
          );
        })}
        {refs.length === 0 ? (
          <div className="rounded-base border border-dashed border-border bg-surface-muted/40 px-3 py-5 text-center text-xs font-bold leading-5 text-muted">
            {copy.panels.userMaterials.empty}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PresetApplyConfirmDialog({
  copy,
  locale,
  currentPresetName,
  targetPreset,
  currentText,
  targetText,
  hasScheduleHandoff,
  onApplyPlain,
  onApplyCarryover,
  onCancel
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  locale: Locale;
  currentPresetName: string;
  targetPreset: ThumbnailPreset;
  currentText: ThumbnailMainTextCarryover;
  targetText: ThumbnailMainTextCarryover;
  hasScheduleHandoff: boolean;
  onApplyPlain: () => void;
  onApplyCarryover: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-end bg-black/58 p-3 text-foreground min-[640px]:items-center min-[640px]:justify-center" role="dialog" aria-modal="true" aria-labelledby="preset-apply-title">
      <div className="w-full max-w-2xl rounded-base border border-border bg-background shadow-panel">
        <div className="border-b border-border px-4 py-3 md:px-5">
          <p className="text-xs font-bold text-primary-strong">{copy.presetDialog.eyebrow}</p>
          <h2 id="preset-apply-title" className="mt-1 text-lg font-black text-foreground">
            {copy.presetDialog.fromTo(currentPresetName, getThumbnailPresetName(targetPreset.id, locale, targetPreset.name))}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {copy.presetDialog.body}
          </p>
          {hasScheduleHandoff ? (
            <p className="mt-2 rounded-base border border-primary/40 bg-primary-soft/35 px-3 py-2 text-xs font-bold leading-5 text-primary-strong">
              {copy.presetDialog.handoff}
            </p>
          ) : null}
        </div>
        <div className="max-h-[52vh] overflow-auto px-4 py-4 md:px-5">
          <div className="grid gap-2">
            {thumbnailMainTextCarryoverTargets.map((target) => (
              <div key={target.id} className="grid gap-2 rounded-base border border-border bg-surface p-3 text-xs min-[640px]:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)]">
                <p className="font-black text-foreground">{getThumbnailMainTextCarryoverLabel(target.id, locale)}</p>
                <div className="min-w-0">
                  <p className="mb-1 font-bold text-muted">{copy.presetDialog.current}</p>
                  <p className="line-clamp-2 break-words font-bold text-foreground">{currentText[target.id] || copy.presetDialog.unset}</p>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 font-bold text-muted">{copy.presetDialog.targetDefault}</p>
                  <p className="line-clamp-2 break-words font-bold text-foreground">{targetText[target.id] || copy.presetDialog.unset}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 min-[640px]:flex-row min-[640px]:justify-end md:px-5">
          <button className="flat-control px-4 py-2 text-sm font-bold" type="button" onClick={onCancel}>
            {copy.presetDialog.cancel}
          </button>
          {!hasScheduleHandoff ? (
            <button className="flat-control px-4 py-2 text-sm font-bold" type="button" onClick={onApplyPlain}>
              {copy.presetDialog.applyPlain}
            </button>
          ) : null}
          <button className="rounded-base bg-primary px-4 py-2 text-sm font-bold text-white" type="button" onClick={onApplyCarryover}>
            {hasScheduleHandoff ? copy.presetDialog.applyHandoff : copy.presetDialog.applyCarryover}
          </button>
        </div>
      </div>
    </div>
  );
}

function IriamSquareKaraokePresetDialog({
  copy,
  presetId,
  config,
  onConfigChange,
  onApply,
  onCancel
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  presetId: IriamSquarePresetModalPresetId;
  config: IriamSquarePresetModalConfig;
  onConfigChange: (config: IriamSquarePresetModalConfig) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const backgroundStyle: ThumbnailIriamSquareKaraokeBackgroundStyle =
    presetId === "dark_gacha" ? "dark_cute" : presetId === "chatting" ? "pop_bubble" : (config as ThumbnailIriamSquareKaraokePresetConfig).backgroundStyle;
  const background = getThumbnailIriamSquareKaraokeBackgroundAsset(backgroundStyle, config.backgroundColorway);
  const title =
    presetId === "dark_gacha"
      ? getThumbnailIriamSquareTitleAsset("dark_gacha", config.titleColorway, config.backgroundColorway)
      : presetId === "chatting"
        ? getThumbnailIriamSquareTitleAsset("chatting", config.titleColorway, config.backgroundColorway)
      : getThumbnailIriamSquareKaraokeTitleAsset(config.titleColorway as ThumbnailIriamSquareKaraokeTitleColorway, config.backgroundColorway);
  const updateConfig = (partial: Partial<IriamSquarePresetModalConfig>) => onConfigChange({ ...config, ...partial } as IriamSquarePresetModalConfig);
  const titleColorOptions: ThumbnailIriamSquareTitleColorway[] = ["match-background", ...thumbnailIriamSquareColorways];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end bg-black/62 p-3 text-foreground min-[760px]:items-center min-[760px]:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="iriam-square-preset-title"
      data-thumbnail-iriam-square-modal="true"
      data-thumbnail-iriam-square-modal-preset={presetId}
    >
      <div className="grid max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-base border border-border bg-background shadow-panel min-[900px]:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-h-0 overflow-auto border-b border-border p-4 min-[900px]:border-b-0 min-[900px]:border-r md:p-5">
          <p className="text-xs font-bold text-primary-strong">{copy.iriamSquareDialog.eyebrow}</p>
          <h2 id="iriam-square-preset-title" className="mt-1 text-lg font-black text-foreground">
            {copy.iriamSquareDialog.presetTitles[presetId]}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">{copy.iriamSquareDialog.presetBodies[presetId]}</p>
          <div className="mx-auto mt-4 w-full max-w-[34rem]">
            <p className="mb-2 text-xs font-bold text-muted">{copy.iriamSquareDialog.preview}</p>
            <div className="relative aspect-square overflow-hidden rounded-base border border-border bg-surface-muted shadow-panel">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${background.src})` }} />
              <div className="absolute left-[14%] top-[7%] h-[40%] w-[72%] rounded-full bg-white/15 blur-xl" />
              <div className="absolute left-[14.8%] top-[11.7%] aspect-[760/320] w-[70.4%] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${title?.src ?? ""})` }} />
              <div className="absolute bottom-[13%] left-[9%] h-[10.5%] w-[42%] rounded-full border border-white/65 bg-white/78" />
              <div className="absolute bottom-[8%] right-[11%] h-[38%] w-[31%] rounded-[2.4rem] border-2 border-white/75 bg-white/10" />
            </div>
          </div>
        </div>
        <div className="min-h-0 overflow-auto p-4 md:p-5">
          <div className="space-y-4">
            {presetId === "karaoke" ? (
              <IriamSquareOptionGroup
                label={copy.iriamSquareDialog.backgroundStyle}
                options={thumbnailIriamSquareKaraokeBackgroundStyles}
                value={(config as ThumbnailIriamSquareKaraokePresetConfig).backgroundStyle}
                getLabel={(value) => copy.iriamSquareDialog.styleLabels[value as ThumbnailIriamSquareKaraokeBackgroundStyle]}
                onChange={(value) => updateConfig({ backgroundStyle: value as ThumbnailIriamSquareKaraokeBackgroundStyle })}
              />
            ) : null}
            <IriamSquareOptionGroup
              label={copy.iriamSquareDialog.backgroundColor}
              options={thumbnailIriamSquareColorways}
              value={config.backgroundColorway}
              getLabel={(value) => copy.iriamSquareDialog.colorLabels[value as ThumbnailIriamSquareColorway]}
              onChange={(value) => updateConfig({ backgroundColorway: value as ThumbnailIriamSquareColorway })}
            />
            <IriamSquareOptionGroup
              label={copy.iriamSquareDialog.titleColor}
              options={titleColorOptions}
              value={config.titleColorway}
              getLabel={(value) =>
                value === "match-background"
                  ? copy.iriamSquareDialog.matchBackground
                  : copy.iriamSquareDialog.colorLabels[value as ThumbnailIriamSquareColorway]
              }
              onChange={(value) => updateConfig({ titleColorway: value as ThumbnailIriamSquareTitleColorway })}
            />
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 min-[520px]:flex-row min-[520px]:justify-end">
            <button className="flat-control px-4 py-2 text-sm font-bold" type="button" onClick={onCancel}>
              {copy.iriamSquareDialog.cancel}
            </button>
            <button className="rounded-base bg-primary px-4 py-2 text-sm font-bold text-white" type="button" onClick={onApply}>
              {copy.iriamSquareDialog.create}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IriamSquareOptionGroup({
  label,
  options,
  value,
  getLabel,
  onChange
}: {
  label: string;
  options: string[];
  value: string;
  getLabel: (value: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold text-muted">{label}</legend>
      <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 min-[900px]:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            className={[
              "min-h-10 rounded-base border px-3 py-2 text-xs font-bold transition",
              value === option ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface text-muted hover:text-foreground"
            ].join(" ")}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
          >
            {getLabel(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function PresetCards({
  copy,
  locale,
  currentPresetId,
  favoritePresetIds,
  recentPresetIds,
  currentVariantId,
  hasScheduleHandoff,
  onApply,
  onFavoriteToggle
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  locale: Locale;
  currentPresetId: ThumbnailPresetId;
  favoritePresetIds: ThumbnailPresetId[];
  recentPresetIds: ThumbnailPresetId[];
  currentVariantId: ThumbnailPresetVariantId;
  hasScheduleHandoff: boolean;
  onApply: (id: ThumbnailPresetId) => void;
  onFavoriteToggle: (id: ThumbnailPresetId) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ThumbnailPresetCategory | "all">("all");
  const [selectedUsageLabel, setSelectedUsageLabel] = useState<string | "all">("all");
  const availablePresets = useMemo(() => getThumbnailPresetsForVariant(currentVariantId), [currentVariantId]);
  const availablePresetCategories = useMemo(() => Array.from(new Set(availablePresets.map((preset) => preset.category))) as ThumbnailPresetCategory[], [availablePresets]);
  const availablePresetUsageLabels = useMemo(() => Array.from(new Set(availablePresets.map((preset) => preset.usageLabel))), [availablePresets]);
  const filteredPresets = useMemo(
    () =>
      filterLocalizedThumbnailPresets(availablePresets, {
        query,
        category: selectedCategory,
        usageLabel: selectedUsageLabel
      }, locale),
    [availablePresets, locale, query, selectedCategory, selectedUsageLabel]
  );
  const favoritePresets = useMemo(
    () => getPresetsByIds(favoritePresetIds).filter((preset) => isPresetSelectableForVariant(preset.id, currentVariantId)),
    [currentVariantId, favoritePresetIds]
  );
  const recentPresets = useMemo(
    () => getPresetsByIds(recentPresetIds).filter((preset) => isPresetSelectableForVariant(preset.id, currentVariantId)),
    [currentVariantId, recentPresetIds]
  );
  const hasActiveFilters = query.trim() !== "" || selectedCategory !== "all" || selectedUsageLabel !== "all";
  const clearFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setSelectedUsageLabel("all");
  };
  useEffect(() => {
    if (selectedCategory !== "all" && !availablePresetCategories.includes(selectedCategory)) {
      setSelectedCategory("all");
    }
    if (selectedUsageLabel !== "all" && !availablePresetUsageLabels.includes(selectedUsageLabel)) {
      setSelectedUsageLabel("all");
    }
  }, [availablePresetCategories, availablePresetUsageLabels, selectedCategory, selectedUsageLabel]);

  return (
    <section className="panel min-w-0 space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-black text-foreground">{copy.panels.presets.title}</h2>
          <p className="mt-1 text-xs font-bold text-muted">
            {hasScheduleHandoff
              ? copy.panels.presets.handoffGuide
              : copy.panels.presets.normalGuide}
          </p>
        </div>
        <p className="text-xs font-bold text-muted">
          {filteredPresets.length} / {availablePresets.length}{copy.panels.presets.countUnit}
        </p>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block text-xs font-bold text-muted">
          {copy.panels.presets.search}
          <input
            className="mt-1 w-full rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.panels.presets.searchPlaceholder}
          />
        </label>
        <button
          className="flat-control self-end px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          {copy.panels.presets.clear}
        </button>
      </div>

      {hasScheduleHandoff ? (
        <div className="rounded-base border border-primary/30 bg-primary-soft/25 px-3 py-2 text-xs font-bold leading-5 text-primary-strong">
          {copy.panels.presets.handoffNotice}
        </div>
      ) : null}

      <PresetFilterChips
        label={copy.panels.presets.category}
        value={selectedCategory}
        options={availablePresetCategories}
        allLabel={copy.panels.presets.all}
        getOptionLabel={(category) => getThumbnailPresetCategoryLabel(category as ThumbnailPresetCategory, locale)}
        onChange={(category) => setSelectedCategory(category as ThumbnailPresetCategory | "all")}
      />
      <PresetFilterChips
        label={copy.panels.presets.usage}
        value={selectedUsageLabel}
        options={availablePresetUsageLabels}
        allLabel={copy.panels.presets.all}
        getOptionLabel={(usageLabel) => getThumbnailPresetUsageLabel(usageLabel, locale)}
        onChange={setSelectedUsageLabel}
      />

      {favoritePresets.length > 0 ? <PresetShortcutRow title={copy.panels.presets.favorites} locale={locale} presets={favoritePresets} currentVariantId={currentVariantId} onApply={onApply} /> : null}
      {recentPresets.length > 0 ? <PresetShortcutRow title={copy.panels.presets.recent} locale={locale} presets={recentPresets} currentVariantId={currentVariantId} onApply={onApply} /> : null}

      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {filteredPresets.map((preset) => {
          const isFavorite = favoritePresetIds.includes(preset.id);
          return (
          <article
            key={preset.id}
            data-thumbnail-preset-card="true"
            className={[
              "flex min-w-0 flex-col rounded-base border bg-surface p-3 text-left transition",
              currentPresetId === preset.id ? "border-primary bg-primary-soft/55" : "border-border"
            ].join(" ")}
          >
            <div className="relative mb-3 aspect-video rounded-base border border-border" style={{ background: `linear-gradient(135deg, #07111c, ${preset.accent})` }}>
              <button
                className={[
                  "absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border text-sm font-black shadow-panel",
                  isFavorite ? "border-primary bg-primary text-white" : "border-border bg-surface/88 text-muted hover:text-primary-strong"
                ].join(" ")}
                type="button"
                onClick={() => onFavoriteToggle(preset.id)}
                aria-label={isFavorite ? copy.favorite.remove(getThumbnailPresetName(preset.id, locale, preset.name)) : copy.favorite.add(getThumbnailPresetName(preset.id, locale, preset.name))}
                aria-pressed={isFavorite}
                title={isFavorite ? copy.favorite.removeTitle : copy.favorite.addTitle}
              >
                {isFavorite ? "★" : "☆"}
              </button>
            </div>
            <div
              data-thumbnail-preset-card-chips="true"
              className="mb-2 flex max-w-full min-w-0 flex-wrap gap-1.5"
            >
              <span className="min-w-0 max-w-full whitespace-normal break-words rounded-sm border border-border bg-surface-muted px-2 py-0.5 text-[11px] font-bold leading-4 text-muted">{getThumbnailPresetCategoryLabel(preset.category, locale)}</span>
              <span className="min-w-0 max-w-full whitespace-normal break-words rounded-sm border border-primary/40 bg-primary-soft/40 px-2 py-0.5 text-[11px] font-bold leading-4 text-primary-strong">{getThumbnailPresetUsageLabel(preset.usageLabel, locale)}</span>
            </div>
            <p className="text-sm font-black text-foreground">{getThumbnailPresetName(preset.id, locale, preset.name)}</p>
            <p className="mt-1 min-h-10 text-xs leading-5 text-muted">{getThumbnailPresetDescription(preset, locale)}</p>
            <button
              data-thumbnail-preset-cta="true"
              className="mt-auto inline-flex self-start rounded-base border border-primary/50 px-3 py-1 text-xs font-bold text-primary-strong transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
              type="button"
              onClick={() => onApply(preset.id)}
              aria-pressed={currentPresetId === preset.id}
            >
              {copy.panels.presets.usePreset}
            </button>
          </article>
          );
        })}
      </div>
      {filteredPresets.length === 0 ? (
        <div className="rounded-base border border-dashed border-border bg-surface-muted px-4 py-5 text-sm font-bold text-muted">
           {copy.panels.presets.empty}
        </div>
      ) : null}
    </section>
  );
}

function PresetFilterChips({
  label,
  value,
  options,
  allLabel,
  getOptionLabel = (option) => option,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  allLabel: string;
  getOptionLabel?: (option: string) => string;
  onChange: (value: string | "all") => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted">{label}</p>
      <div
        className="scrollbar-accent -mx-1 flex max-w-full flex-nowrap gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible md:pb-0"
        data-thumbnail-preset-filter-chips="true"
      >
        {[{ id: "all", label: allLabel }, ...options.map((option) => ({ id: option, label: getOptionLabel(option) }))].map((option) => (
          <button
            key={option.id}
            className={[
              "shrink-0 rounded-base border px-3 py-1.5 text-xs font-bold transition",
              value === option.id ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface text-muted hover:text-foreground"
            ].join(" ")}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PresetShortcutRow({
  title,
  locale,
  presets,
  currentVariantId,
  onApply
}: {
  title: string;
  locale: Locale;
  presets: ThumbnailPreset[];
  currentVariantId: ThumbnailPresetVariantId;
  onApply: (id: ThumbnailPresetId) => void;
}) {
  return (
    <div className="space-y-2 rounded-base border border-border bg-surface-muted p-3">
      <p className="text-xs font-black text-foreground">{title}</p>
      <div className="scrollbar-accent -mx-1 flex max-w-full flex-nowrap gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible md:pb-0">
        {presets.filter((preset) => isPresetSelectableForVariant(preset.id, currentVariantId)).map((preset) => (
            <button
              key={preset.id}
              className="shrink-0 rounded-base border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary-strong"
              type="button"
              onClick={() => onApply(preset.id)}
            >
              {getThumbnailPresetName(preset.id, locale, preset.name)}
            </button>
          ))}
      </div>
    </div>
  );
}

function ExportPanel({
  copy,
  exportFormat,
  qualityGuardSummary,
  onFormatChange,
  onSave,
  onExport,
  onSendToSns
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  exportFormat: "png" | "jpeg";
  qualityGuardSummary: ThumbnailQualityGuardSummary;
  onFormatChange: (format: "png" | "jpeg") => void;
  onSave: () => void;
  onExport: () => void;
  onSendToSns: () => void;
}) {
  const summaryToneClassName: Record<ThumbnailQualityGuardSummary["tone"], string> = {
    warning: "border-amber-400/55 bg-amber-500/10 text-amber-200",
    hint: "border-sky-400/45 bg-sky-500/10 text-sky-100",
    ok: "border-emerald-400/45 bg-emerald-500/10 text-emerald-100"
  };

  return (
    <section className="panel space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-foreground">{copy.export.title}</h2>
          <p className="mt-1 text-[11px] font-semibold text-muted">{copy.export.guide}</p>
        </div>
        <span className={`rounded-sm border px-2 py-1 text-[11px] font-bold ${summaryToneClassName[qualityGuardSummary.tone]}`}>
          {qualityGuardSummary.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className={`flat-control py-2 text-sm font-bold ${exportFormat === "png" ? "border-primary bg-primary-soft text-primary-strong" : ""}`} type="button" onClick={() => onFormatChange("png")}>
          PNG
        </button>
        <button className={`flat-control py-2 text-sm font-bold ${exportFormat === "jpeg" ? "border-primary bg-primary-soft text-primary-strong" : ""}`} type="button" onClick={() => onFormatChange("jpeg")}>
          JPEG
        </button>
      </div>
      <button className="flat-control w-full px-4 py-2 font-bold" type="button" onClick={onSave} aria-label={copy.header.saveDraftAria}>
        {copy.export.saveDraft}
      </button>
      <button className="flat-control w-full px-4 py-2 font-bold" type="button" onClick={onSendToSns} aria-label={copy.header.sendToSnsAria}>
        {copy.export.sendToSns}
      </button>
      <button className="w-full rounded-base bg-primary px-4 py-2 text-sm font-bold text-white" type="button" onClick={onExport} aria-label={copy.header.exportAria}>
        {copy.export.export}
      </button>
      <div className="space-y-1 border-t border-border pt-2">
        <p className="text-[11px] font-bold text-muted">{copy.export.preflight}</p>
        <ul className="grid gap-1">
          {qualityGuardSummary.messages.map((message, index) => (
            <li key={`${message}-${index}`} className="text-xs font-semibold leading-5 text-muted">
              {message}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-1 border-t border-border pt-2">
        <p className="text-[11px] font-bold text-muted">{copy.export.assetNoticeTitle}</p>
        <p className="text-xs font-semibold leading-5 text-muted">
          {copy.export.assetNotice}
        </p>
      </div>
      <p className="text-xs leading-5 text-muted">{copy.export.storageNote}</p>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "px",
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-bold text-muted">
      {label}
      <div className="mt-1 flex overflow-hidden rounded-base border border-border bg-surface">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-bold text-foreground"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (!Number.isFinite(parsed)) {
              return;
            }
            onChange(clampFinite(parsed, min, max, value));
          }}
          onBlur={(event) => {
            const parsed = Number(event.target.value);
            onChange(clampFinite(parsed, min, max, value));
          }}
        />
        <span className="grid w-12 place-items-center border-l border-border text-xs text-muted">{suffix}</span>
      </div>
    </label>
  );
}

function ColorField({
  copy,
  label,
  value,
  popoverAlign = "right",
  onChange
}: {
  copy: ReturnType<typeof getThumbnailEditorCopy>;
  label: string;
  value: string;
  popoverAlign?: "left" | "right";
  onChange: (value: string) => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [textValue, setTextValue] = useState(normalizeHexColor(value));
  const pickerRootRef = useRef<HTMLDivElement | null>(null);
  const saturationRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const normalizedValue = normalizeHexColor(value);
  const hsv = useMemo(() => rgbToHsv(hexToRgb(normalizedValue)), [normalizedValue]);
  const hueColor = hsvToHex(hsv.h, 100, 100);

  useEffect(() => {
    setTextValue(normalizedValue);
  }, [normalizedValue]);
  useEffect(() => {
    if (!paletteOpen) {
      return;
    }
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!pickerRootRef.current?.contains(event.target as Node)) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [paletteOpen]);

  const commitColor = (next: string) => {
    const normalized = normalizeHexColor(next, normalizedValue);
    setTextValue(normalized);
    onChange(normalized);
  };

  const updateFromSaturation = (event: PointerEvent<HTMLDivElement>) => {
    const rect = saturationRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const s = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp(100 - ((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    commitColor(hsvToHex(hsv.h, s, v));
  };

  const updateFromHue = (event: PointerEvent<HTMLDivElement>) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const h = clamp(((event.clientX - rect.left) / rect.width) * 360, 0, 359);
    commitColor(hsvToHex(h, hsv.s, hsv.v));
  };

  const handleHexInput = (next: string) => {
    setTextValue(next);
    if (/^#?[0-9a-fA-F]{6}$/.test(next.trim())) {
      onChange(normalizeHexColor(next));
    }
  };

  return (
    <div ref={pickerRootRef} className="relative block text-xs font-bold text-muted">
      <p>{label}</p>
      <div className="mt-1 space-y-2 rounded-base border border-border bg-surface p-2">
        <div className="flex items-center gap-2">
          <button
            className="h-10 w-10 shrink-0 rounded-sm border border-primary/80 shadow-[0_0_0_2px_rgba(30,215,198,0.18)]"
            type="button"
            style={{ backgroundColor: normalizedValue }}
            onClick={() => setPaletteOpen((current) => !current)}
            aria-label={copy.aria.selectColor(label)}
          />
          <input
            className="min-w-0 flex-1 rounded-sm border border-border bg-transparent px-2 py-2 text-sm font-bold text-foreground"
            value={textValue}
            onChange={(event) => handleHexInput(event.target.value)}
            onBlur={() => setTextValue(normalizedValue)}
          />
        </div>
        {paletteOpen && (
          <div
            className={[
              "absolute z-50 mt-2 w-[calc(200%+0.75rem)] max-w-[calc(100vw-2rem)] space-y-3 rounded-base border border-border bg-background p-3 shadow-panel",
              popoverAlign === "left" ? "left-0" : "right-0"
            ].join(" ")}
          >
            <div
              ref={saturationRef}
              className="relative h-52 cursor-crosshair rounded-sm border border-border"
              style={{
                background: `linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, ${hueColor})`
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                updateFromSaturation(event);
              }}
              onPointerMove={(event) => {
                if (event.buttons === 1) {
                  updateFromSaturation(event);
                }
              }}
            >
              <span
                className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.75)]"
                style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
              />
            </div>
            <div
              ref={hueRef}
              className="relative h-4 cursor-pointer rounded-full border border-border"
              style={{
                background:
                  "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                updateFromHue(event);
              }}
              onPointerMove={(event) => {
                if (event.buttons === 1) {
                  updateFromHue(event);
                }
              }}
            >
              <span
                className="absolute top-1/2 h-5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-background shadow"
                style={{ left: `${(hsv.h / 360) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-8 gap-2">
              {colorSwatches.map((swatch) => (
                <button
                  key={swatch}
                  className="h-7 w-full rounded-sm border border-border transition hover:scale-105"
                  type="button"
                  style={{ backgroundColor: swatch }}
                  onClick={() => commitColor(swatch)}
                  aria-label={copy.aria.colorSwatch(swatch)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ListboxField({
  value,
  options,
  isOpen,
  openLabel,
  onToggle,
  onSelect,
  className
}: {
  value: string;
  options: { id: string; label: string; description?: string; disabled?: boolean }[];
  isOpen: boolean;
  openLabel: (value: string) => string;
  onToggle: () => void;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`} data-thumbnail-menu-root="true">
      <button
        className="flex w-full items-center justify-between rounded-base border border-border bg-surface px-3 py-2 text-left text-sm font-bold text-foreground"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={openLabel(value)}
      >
        <span className="truncate">{value}</span>
        <span className="text-xs text-muted">▾</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 z-[120] mt-1 max-h-60 overflow-auto rounded-base border border-border bg-surface shadow-lg">
          {options.map((option) => (
            <button
              key={option.id}
              className={[
                "block w-full border-b border-border/60 px-3 py-2 text-left text-sm font-bold transition last:border-b-0",
                option.disabled ? "cursor-not-allowed bg-surface-muted/70 text-muted opacity-75" : "text-foreground hover:bg-primary/12"
              ].join(" ")}
              type="button"
              onClick={() => onSelect(option.id)}
              disabled={option.disabled}
              aria-disabled={option.disabled || undefined}
              title={option.description}
            >
              <span className="block">{option.label}</span>
              {option.description ? <span className="mt-0.5 block text-[11px] leading-4 text-muted">{option.description}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
