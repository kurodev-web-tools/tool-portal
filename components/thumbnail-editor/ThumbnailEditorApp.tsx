"use client";

import { ChangeEvent, MouseEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cloneThumbnailLayer,
  applyThumbnailMainTextCarryover,
  createNextRecentThumbnailPresetIds,
  createDraftFromPreset,
  createImageLayer,
  createThumbnailMaterialLayer,
  createShapeLayer,
  createTextLayer,
  drawThumbnail,
  filterThumbnailPresets,
  getThumbnailMainTextCarryover,
  getLayerCenter,
  hitTestLayerHandle,
  isThumbnailDraftPristineForPreset,
  layerContainsPoint,
  normalizeThumbnailDraft,
  normalizeThumbnailLayerName,
  normalizeThumbnailPresetDiscoveryState,
  pointToLayerLocal,
  thumbnailCanvasSizes,
  thumbnailDraftStorageKey,
  thumbnailFontGroups,
  thumbnailFonts,
  thumbnailMainTextCarryoverTargets,
  thumbnailMaterialCategoryLabels,
  thumbnailMaterialLibrary,
  thumbnailPresetDiscoveryStorageKey,
  thumbnailPresets,
  toggleThumbnailPresetFavorite,
  type ThumbnailHandleKind,
  type ThumbnailMainTextCarryover,
  type ThumbnailResizeHandle,
  type ThumbnailCanvasSizeId,
  type ThumbnailEditorDraft,
  type ThumbnailLayer,
  type ThumbnailMaterialCategory,
  type ThumbnailPreset,
  type ThumbnailPresetCategory,
  type ThumbnailPresetDiscoveryState,
  type ThumbnailPresetId,
  type ThumbnailShapeType,
  type ThumbnailTextAlign
} from "@/lib/thumbnail-editor";
import {
  buildToolHandoffUrl,
  createThumbnailToSnsHandoffPayload,
  readToolHandoff,
  writeToolHandoff,
  type ScheduleHandoffPayload
} from "@/lib/tool-handoff";
import { writeStoredImageSource } from "@/components/sns-split-image-maker/snsSplitDraftPersistence";

type ToastTone = "info" | "success" | "warning" | "error";
type ToastState = { tone: ToastTone; message: string } | null;
type MobilePanel = "canvas" | "materials" | "layers" | "text" | "export";
type EditorMode = "edit" | "pan";
type PresetApplyMode = "plain" | "carryover" | "handoff";
type CanvasInteractionMode = "drag" | "resize" | "rotate";
type CanvasCursor = "default" | "move" | "grab" | "grabbing" | "crosshair" | "nwse-resize" | "nesw-resize";
type CanvasInteractionState = {
  pointerId: number;
  pointerType: string;
  layerId: string;
  mode: CanvasInteractionMode;
  resizeHandle?: ThumbnailResizeHandle;
  startPointer: { x: number; y: number };
  startLayer: ThumbnailLayer;
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
type LastTapState = {
  time: number;
  clientX: number;
  clientY: number;
  layerId: string | null;
};

const toneClassName: Record<ToastTone, string> = {
  info: "border-sky-400/60 bg-sky-500/12 text-foreground",
  success: "border-emerald-400/60 bg-emerald-500/12 text-foreground",
  warning: "border-amber-400/60 bg-amber-500/12 text-foreground",
  error: "border-rose-400/60 bg-rose-500/12 text-foreground"
};

const mobilePanels: { id: MobilePanel; label: string; icon: string }[] = [
  { id: "canvas", label: "キャンバス", icon: "▧" },
  { id: "materials", label: "素材", icon: "◇" },
  { id: "layers", label: "レイヤー", icon: "▤" },
  { id: "text", label: "テキスト", icon: "T" },
  { id: "export", label: "書き出し", icon: "⇧" }
];
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
const sanitizeFilePatternPart = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 32);
const getFirstTextLayerValue = (draft: ThumbnailEditorDraft, namePart: string) => {
  const layer = draft.layers.find((item) => item.type === "text" && item.name.includes(namePart));
  return layer?.type === "text" ? firstMeaningfulLine(layer.text) : "";
};
const defaultPresetDiscoveryState: ThumbnailPresetDiscoveryState = {
  version: 1,
  recentPresetIds: [],
  favoritePresetIds: []
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
const thumbnailPresetCategories = Array.from(new Set(thumbnailPresets.map((preset) => preset.category))) as ThumbnailPresetCategory[];
const thumbnailPresetUsageLabels = Array.from(new Set(thumbnailPresets.map((preset) => preset.usageLabel)));
const normalizeMaterialSearchText = (value: string) => value.trim().toLocaleLowerCase("ja-JP");
const getPresetsByIds = (presetIds: ThumbnailPresetId[]) =>
  presetIds
    .map((presetId) => thumbnailPresets.find((preset) => preset.id === presetId))
    .filter((preset): preset is ThumbnailPreset => Boolean(preset));
const createThumbnailToSnsImageStorageId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${thumbnailToSnsImageStoragePrefix}-${crypto.randomUUID()}`;
  }
  return `${thumbnailToSnsImageStoragePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
const applyScheduleHandoffToThumbnailDraft = (draft: ThumbnailEditorDraft, payload: ScheduleHandoffPayload): ThumbnailEditorDraft => {
  const titleText = compactLayerText(payload.title || "無題の予定", 42);
  const dateText = formatHandoffDate(payload.date);
  const timeRange = [payload.startTime, payload.endTime].filter(Boolean).join("-");
  const timeText = compactLayerText([dateText, timeRange].filter(Boolean).join(" "), 24);
  const subText = compactLayerText(
    firstMeaningfulLine(payload.announcementText) ||
      [formatHandoffDate(payload.date), payload.categoryLabel, payload.hashtags].filter(Boolean).join(" / "),
    54
  );
  const labelText = compactLayerText([payload.categoryLabel, payload.platform].filter(Boolean).join(" / ") || payload.announcementStatusLabel || "配信告知", 22);
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
const createThumbnailDraftFromHandoff = (payload: ScheduleHandoffPayload, canvas = thumbnailCanvasSizes.hd): ThumbnailEditorDraft =>
  applyScheduleHandoffToThumbnailDraft(createDraftFromPreset("stream_announce", canvas), payload);

export function ThumbnailEditorApp() {
  const [draft, setDraft] = useState<ThumbnailEditorDraft>(() => createDraftFromPreset());
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("canvas");
  const [zoom, setZoom] = useState(0.72);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState<"preset" | "canvas" | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [handoffPayload, setHandoffPayload] = useState<ScheduleHandoffPayload | null>(null);
  const [presetDiscoveryState, setPresetDiscoveryState] = useState<ThumbnailPresetDiscoveryState>(defaultPresetDiscoveryState);
  const [pendingPresetApplyId, setPendingPresetApplyId] = useState<ThumbnailPresetId | null>(null);
  const [canvasCursor, setCanvasCursor] = useState<CanvasCursor>("grab");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobilePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const interactionRef = useRef<CanvasInteractionState | null>(null);
  const panRef = useRef<CanvasPanState | null>(null);
  const lastTapRef = useRef<LastTapState | null>(null);
  const userAdjustedZoomRef = useRef(false);
  const canvasRenderVersionRef = useRef(0);
  const mobilePreviewRenderVersionRef = useRef(0);

  const selectedLayer = useMemo(
    () => draft.layers.find((layer) => layer.id === draft.selectedLayerId) ?? null,
    [draft.layers, draft.selectedLayerId]
  );

  const selectedPreset = useMemo(
    () => thumbnailPresets.find((preset) => preset.id === draft.presetId) ?? thumbnailPresets[0],
    [draft.presetId]
  );
  const pendingPreset = useMemo(
    () => thumbnailPresets.find((preset) => preset.id === pendingPresetApplyId) ?? null,
    [pendingPresetApplyId]
  );
  const currentMainTextCarryover = useMemo(() => getThumbnailMainTextCarryover(draft), [draft]);
  const pendingPresetDefaultText = useMemo(
    () => (pendingPreset ? getThumbnailMainTextCarryover(createDraftFromPreset(pendingPreset.id, draft.canvas)) : {}),
    [draft.canvas, pendingPreset]
  );

  useEffect(() => {
    setFontMenuOpen(false);
  }, [draft.selectedLayerId]);
  useEffect(() => {
    setHeaderMenuOpen(null);
  }, [draft.presetId, draft.canvas.width, draft.canvas.height]);
  useEffect(() => {
    setCanvasCursor(editorMode === "pan" ? "grab" : "default");
  }, [editorMode]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(thumbnailPresetDiscoveryStorageKey);
      setPresetDiscoveryState(saved ? normalizeThumbnailPresetDiscoveryState(JSON.parse(saved)) : defaultPresetDiscoveryState);
    } catch {
      window.localStorage.removeItem(thumbnailPresetDiscoveryStorageKey);
      setPresetDiscoveryState(defaultPresetDiscoveryState);
    }
  }, []);
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

  useEffect(() => {
    try {
      const handoffPayload = readToolHandoff("thumbnail-editor");
      if (handoffPayload) {
        setDraft(createThumbnailDraftFromHandoff(handoffPayload));
        setHandoffPayload(handoffPayload);
        showToast("success", "Schedule Calendarの予定から初期テキストを反映しました。");
        setHydrated(true);
        return;
      }

      const saved = window.localStorage.getItem(thumbnailDraftStorageKey);
      if (!saved) {
        setHydrated(true);
        return;
      }
      const normalized = normalizeThumbnailDraft(JSON.parse(saved));
      if (normalized) {
        setDraft(normalized);
        showToast("info", "前回の下書きを復元しました。");
      } else {
        window.localStorage.removeItem(thumbnailDraftStorageKey);
        setDraft(createDraftFromPreset());
        showToast("warning", "破損した下書きを初期化しました。必要に応じて保存し直してください。");
      }
    } catch {
      window.localStorage.removeItem(thumbnailDraftStorageKey);
      setDraft(createDraftFromPreset());
      showToast("warning", "破損した下書きを初期化しました。必要に応じて保存し直してください。");
    } finally {
      setHydrated(true);
    }
  }, [showToast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const renderVersion = (canvasRenderVersionRef.current += 1);
    const buffer = document.createElement("canvas");
    drawThumbnail(buffer, draft, { selectedLayerId: draft.selectedLayerId, includeSelection: true }).then(() => {
      if (canvasRenderVersionRef.current !== renderVersion || canvasRef.current !== canvas) {
        return;
      }
      canvas.width = buffer.width;
      canvas.height = buffer.height;
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      context?.drawImage(buffer, 0, 0);
    }).catch(() => {
      if (canvasRenderVersionRef.current === renderVersion) {
        showToast("error", "キャンバスの描画に失敗しました。");
      }
    });
  }, [draft, showToast]);

  useEffect(() => {
    if (!mobilePreviewOpen) {
      return;
    }

    const canvas = mobilePreviewCanvasRef.current;
    if (!canvas) {
      return;
    }

    const renderVersion = (mobilePreviewRenderVersionRef.current += 1);
    const buffer = document.createElement("canvas");
    drawThumbnail(buffer, draft, { selectedLayerId: null, includeSelection: false }).then(() => {
      if (mobilePreviewRenderVersionRef.current !== renderVersion || mobilePreviewCanvasRef.current !== canvas) {
        return;
      }
      canvas.width = buffer.width;
      canvas.height = buffer.height;
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      context?.drawImage(buffer, 0, 0);
    }).catch(() => {
      if (mobilePreviewRenderVersionRef.current === renderVersion) {
        showToast("error", "全体プレビューの描画に失敗しました。");
      }
    });
  }, [draft, mobilePreviewOpen, showToast]);

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
        showToast("error", "下書きデータが不正なため自動保存を中断しました。");
        return;
      }
      try {
        window.localStorage.setItem(
          thumbnailDraftStorageKey,
          JSON.stringify({ ...normalized, updatedAt: new Date().toISOString() })
        );
      } catch {
        showToast("error", "下書きの自動保存に失敗しました。");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, hydrated, showToast]);

  const updateDraft = (updater: (current: ThumbnailEditorDraft) => ThumbnailEditorDraft) => {
    setDraft((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
  };

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

  const openLayerPanelForPoint = useCallback(
    (point: { x: number; y: number }) => {
      if (typeof window === "undefined" || window.innerWidth < 1024) {
        return null;
      }
      const target = [...draft.layers].reverse().find((layer) => layerContainsPoint(layer, point));
      if (!target) {
        return null;
      }
      setDraft((current) => ({ ...current, selectedLayerId: target.id }));
      setSidePanelCollapsed(false);
      return target.id;
    },
    [draft.layers]
  );

  const handleCanvasDoubleClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasPointFromClient(event.clientX, event.clientY);
      if (!point) {
        return;
      }
      if (openLayerPanelForPoint(point)) {
        event.preventDefault();
      }
    },
    [getCanvasPointFromClient, openLayerPanelForPoint]
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

      if (isDoubleTap && target && openLayerPanelForPoint(point)) {
        lastTapRef.current = null;
        event.preventDefault();
      }
    },
    [draft.layers, getCanvasPointFromClient, openLayerPanelForPoint]
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
    if (!handoffPayload && isThumbnailDraftPristineForPreset(draft)) {
      applyPreset(presetId, "plain");
      return;
    }
    setPendingPresetApplyId(presetId);
    setHeaderMenuOpen(null);
  };

  const applyPreset = (presetId: ThumbnailPresetId, mode: PresetApplyMode) => {
    recordPresetUse(presetId);
    const next = createDraftFromPreset(presetId, draft.canvas);
    const nextDraft =
      mode === "handoff" && handoffPayload
        ? applyScheduleHandoffToThumbnailDraft(next, handoffPayload)
        : mode === "carryover"
          ? applyThumbnailMainTextCarryover(next, getThumbnailMainTextCarryover(draft))
          : next;
    setDraft(nextDraft);
    setMobilePanel("canvas");
    setPendingPresetApplyId(null);
    showToast(
      "success",
      mode === "handoff"
        ? "プリセットへ予定テキストを引き継ぎました。"
        : mode === "carryover"
          ? "プリセットへ主要テキストを引き継ぎました。"
          : "プリセットを適用しました。"
    );
  };

  const changeCanvasSize = (sizeId: ThumbnailCanvasSizeId) => {
    const canvas = thumbnailCanvasSizes[sizeId];
    const next = createDraftFromPreset(draft.presetId, canvas);
    setDraft(handoffPayload ? applyScheduleHandoffToThumbnailDraft(next, handoffPayload) : next);
    showToast("info", handoffPayload ? `${canvas.label} に予定テキストを引き継ぎました。` : `${canvas.label} で新規作成しました。`);
  };

  const saveDraft = () => {
    const normalized = normalizeThumbnailDraft(draft);
    if (!normalized) {
      showToast("error", "下書きデータが不正なため保存できません。");
      return;
    }
    try {
      window.localStorage.setItem(
        thumbnailDraftStorageKey,
        JSON.stringify({ ...normalized, updatedAt: new Date().toISOString() })
      );
      showToast("success", "下書きを保存しました。");
    } catch {
      showToast("error", "下書き保存に失敗しました。");
    }
  };

  const newDraft = () => {
    setDraft(createDraftFromPreset(draft.presetId, draft.canvas));
    setMobilePanel("canvas");
    showToast("info", "新規キャンバスを作成しました。");
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
      showToast("error", "PNG/JPEG画像ファイルを選択してください。");
      return;
    }
    if (file.size > imageUploadMaxBytes) {
      showToast("error", "画像は8MB以下にしてください。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        showToast("error", "画像の読み込みに失敗しました。");
        return;
      }
      addLayer(createImageLayer(reader.result));
      showToast("success", "画像レイヤーを追加しました。");
    };
    reader.onerror = () => showToast("error", "画像の読み込みに失敗しました。");
    reader.readAsDataURL(file);
  };

  const addMaterialLayer = (materialId: string) => {
    const layer = createThumbnailMaterialLayer(materialId, draft.canvas);
    if (!layer) {
      showToast("error", "素材を追加できませんでした。");
      return;
    }
    const material = thumbnailMaterialLibrary.find((item) => item.id === materialId);
    addLayer(layer);
    showToast("success", material ? `「${material.name}」を素材レイヤーとして追加しました。` : "素材レイヤーを追加しました。");
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
        showToast("warning", "最低1レイヤーは残してください。");
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

      setDraft((current) => ({ ...current, selectedLayerId: activeLayer.id }));
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
        startCenter: center,
        rotateOffsetRad: angle - rad,
        moved: false
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [draft.canvas.width, draft.layers, draft.selectedLayerId, editorMode, getCanvasPointFromClient]
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
        return { ...current, layers };
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
    }
  }, [editorMode, handleTapEditIntent]);

  const exportImage = async () => {
    const normalized = normalizeThumbnailDraft(draft);
    if (!normalized) {
      showToast("error", "下書きデータが不正なため書き出しできません。");
      return;
    }
    const hasVisibleImage = normalized.layers.some((layer) => layer.type === "image" && !layer.hidden && layer.src);
    if (!hasVisibleImage) {
      showToast("error", "画像レイヤーがないため書き出しできません。画像を追加してください。");
      return;
    }
    try {
      const exportCanvas = document.createElement("canvas");
      await drawThumbnail(exportCanvas, normalized, { forceJpegBackground: exportFormat === "jpeg" });
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
      showToast("success", `${exportFormat.toUpperCase()}を書き出しました。`);
    } catch {
      showToast("error", "書き出しに失敗しました。");
    }
  };

  const sendToSnsSplit = async () => {
    const normalized = normalizeThumbnailDraft(draft);
    if (!normalized) {
      showToast("error", "下書きデータが不正なためSNS分割画像へ渡せません。");
      return;
    }

    try {
      const exportCanvas = document.createElement("canvas");
      await drawThumbnail(exportCanvas, normalized, { forceJpegBackground: false });
      const dataUrl = exportCanvas.toDataURL("image/png", 0.92);
      if (!dataUrl || dataUrl === "data:,") {
        throw new Error("Canvas export failed.");
      }

      const title = getFirstTextLayerValue(normalized, "見出し") || handoffPayload?.title || selectedPreset.name;
      const date = handoffPayload?.date ?? "";
      const imageStorageId = createThumbnailToSnsImageStorageId();
      const fileNameBase = [date.replaceAll("-", ""), sanitizeFilePatternPart(title)].filter(Boolean).join("_") || "thumbnail";
      const payload = createThumbnailToSnsHandoffPayload({
        imageStorageId,
        title,
        date,
        categoryLabel: handoffPayload?.categoryLabel ?? selectedPreset.category,
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
      showToast("error", "SNS分割画像メーカーへの受け渡しに失敗しました。");
    }
  };

  const canvasSizeId: ThumbnailCanvasSizeId = draft.canvas.width === 1920 ? "full-hd" : "hd";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="hidden shrink-0 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur min-[1024px]:block md:px-5 xl:px-6">
        <div className="flex flex-wrap items-center gap-3 min-[1024px]:flex-nowrap">
          <div className="hidden min-w-[11rem] flex-1 min-[1024px]:block">
            <p className="text-xs font-semibold text-primary-strong">画像・デザイン</p>
            <h1 className="whitespace-nowrap text-lg font-black tracking-normal text-foreground xl:text-xl">Thumbnail Editor</h1>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 min-[1024px]:w-auto min-[1024px]:min-w-[29rem] xl:min-w-[31rem] xl:flex xl:items-center">
            <label className="min-w-0 text-xs font-bold text-muted">
              プリセット
              <ListboxField
                className="mt-1"
                isOpen={headerMenuOpen === "preset"}
                value={selectedPreset.name}
                onToggle={() => setHeaderMenuOpen((current) => (current === "preset" ? null : "preset"))}
                options={thumbnailPresets.map((preset) => ({
                  id: preset.id,
                  label: preset.name
                }))}
                onSelect={(id) => requestPresetApply(id as ThumbnailPresetId)}
              />
            </label>
            <label className="min-w-0 text-xs font-bold text-muted">
              キャンバスサイズ
              <ListboxField
                className="mt-1"
                isOpen={headerMenuOpen === "canvas"}
                value={thumbnailCanvasSizes[canvasSizeId].label}
                onToggle={() => setHeaderMenuOpen((current) => (current === "canvas" ? null : "canvas"))}
                options={Object.entries(thumbnailCanvasSizes).map(([id, size]) => ({
                  id,
                  label: size.label
                }))}
                onSelect={(id) => changeCanvasSize(id as ThumbnailCanvasSizeId)}
              />
            </label>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-2 min-[1024px]:w-auto min-[1024px]:justify-end">
            <ModeToggle editorMode={editorMode} onModeChange={setEditorMode} className="min-[1024px]:hidden" />
            <div className="flex flex-nowrap justify-end gap-2">
              <button className="flat-control px-4 py-2 font-bold" type="button" onClick={newDraft} aria-label="新規キャンバスを作成" title="新規キャンバスを作成">
                新規
              </button>
              <button className="flat-control px-4 py-2 font-bold" type="button" onClick={saveDraft} aria-label="下書きを保存" title="下書きを保存">
                下書き
              </button>
              <button className="flat-control px-4 py-2 font-bold" type="button" onClick={sendToSnsSplit} aria-label="SNS分割画像メーカーで使う" title="SNS分割画像メーカーで使う">
                SNS分割
              </button>
              <button className="rounded-base bg-primary px-4 py-2 text-sm font-bold text-white" type="button" onClick={exportImage} aria-label="サムネイルを書き出し" title="サムネイルを書き出し">
                出力
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
            <section className="mb-4 grid gap-3 min-[1024px]:hidden">
              <div className="grid grid-cols-2 gap-3">
                <label className="min-w-0 text-xs font-bold text-muted">
                  プリセット
                  <ListboxField
                    className="mt-1"
                    isOpen={headerMenuOpen === "preset"}
                    value={selectedPreset.name}
                    onToggle={() => setHeaderMenuOpen((current) => (current === "preset" ? null : "preset"))}
                    options={thumbnailPresets.map((preset) => ({
                      id: preset.id,
                      label: preset.name
                    }))}
                    onSelect={(id) => requestPresetApply(id as ThumbnailPresetId)}
                  />
                </label>
                <label className="min-w-0 text-xs font-bold text-muted">
                  キャンバスサイズ
                  <ListboxField
                    className="mt-1"
                    isOpen={headerMenuOpen === "canvas"}
                    value={thumbnailCanvasSizes[canvasSizeId].label}
                    onToggle={() => setHeaderMenuOpen((current) => (current === "canvas" ? null : "canvas"))}
                    options={Object.entries(thumbnailCanvasSizes).map(([id, size]) => ({
                      id,
                      label: size.label
                    }))}
                    onSelect={(id) => changeCanvasSize(id as ThumbnailCanvasSizeId)}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ModeToggle editorMode={editorMode} onModeChange={setEditorMode} />
                <div className="flex flex-nowrap justify-end gap-2">
                  <button className="flat-control px-4 py-2 font-bold" type="button" onClick={newDraft} aria-label="新規キャンバスを作成" title="新規キャンバスを作成">
                    新規
                  </button>
                  <button className="flat-control px-4 py-2 font-bold" type="button" onClick={saveDraft} aria-label="下書きを保存" title="下書きを保存">
                    下書き
                  </button>
                  <button className="flat-control px-4 py-2 font-bold" type="button" onClick={sendToSnsSplit} aria-label="SNS分割画像メーカーで使う" title="SNS分割画像メーカーで使う">
                    SNS分割
                  </button>
                  <button className="rounded-base bg-primary px-4 py-2 text-sm font-bold text-white" type="button" onClick={exportImage} aria-label="サムネイルを書き出し" title="サムネイルを書き出し">
                    出力
                  </button>
                </div>
              </div>
            </section>
            <section className={["panel mx-auto p-3 md:p-4", sidePanelCollapsed ? "max-w-none" : "max-w-[76rem]"].join(" ")}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{selectedPreset.name}</p>
                  <p className="text-xs text-muted">{draft.canvas.width} x {draft.canvas.height} / 16:9</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    className="flat-control hidden px-3 py-2 text-xs font-bold min-[1024px]:inline-flex"
                    type="button"
                    onClick={() => setSidePanelCollapsed((value) => !value)}
                    aria-label={sidePanelCollapsed ? "設定パネルを表示" : "設定パネルを非表示"}
                  >
                    {sidePanelCollapsed ? "パネル表示" : "パネル非表示"}
                  </button>
                  <div className="flex items-center gap-2 min-[1024px]:hidden">
                    <button className="flat-control h-9 px-3 text-xs font-bold" type="button" onClick={() => setMobilePreviewOpen(true)} aria-label="サムネイル全体を確認">
                      全体
                    </button>
                    <button className="flat-control h-9 w-9" type="button" onClick={() => updateZoom((value) => Math.max(0.42, value - 0.08))} title="縮小" aria-label="キャンバスを縮小">
                      −
                    </button>
                    <span className="w-14 text-center text-sm font-bold text-muted">{Math.round(zoom * 100)}%</span>
                    <button className="flat-control h-9 w-9" type="button" onClick={() => updateZoom((value) => Math.min(1.6, value + 0.08))} title="拡大" aria-label="キャンバスを拡大">
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="rounded-base bg-surface-muted p-2 md:p-4">
                <div className="flex min-h-0 gap-3">
                  <DesktopToolRail
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
                        表示移動中
                      </div>
                    )}
                    <canvas
                      ref={canvasRef}
                      className="mx-auto block aspect-video max-w-none touch-none rounded-base border border-border bg-[#081117] shadow-lg"
                      style={{ width: `${draft.canvas.width * zoom}px`, cursor: canvasCursor }}
                      onPointerDown={beginInteraction}
                      onPointerMove={updateInteraction}
                      onPointerUp={endInteraction}
                      onPointerCancel={endInteraction}
                      onDoubleClick={handleCanvasDoubleClick}
                      aria-label="サムネイル編集キャンバス"
                    />
                  </div>
                </div>
                <div className="mt-3 hidden justify-center min-[1024px]:flex">
                  <div className="inline-flex items-center gap-2 rounded-base border border-border bg-surface px-2 py-2">
                    <button className="flat-control h-8 w-8 text-xs" type="button" onClick={() => updateZoom((value) => Math.max(0.42, value - 0.08))} title="縮小" aria-label="キャンバスを縮小">
                      −
                    </button>
                    <span className="w-12 text-center text-xs font-bold text-muted">{Math.round(zoom * 100)}%</span>
                    <button className="flat-control h-8 w-8 text-xs" type="button" onClick={() => updateZoom((value) => Math.min(1.6, value + 0.08))} title="拡大" aria-label="キャンバスを拡大">
                      +
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-4 grid gap-3 min-[1024px]:hidden">
              <QuickAddBar
                onText={() => addLayer(createTextLayer())}
                onShape={(shapeType) => addLayer(createShapeLayer(shapeType))}
                onImage={() => fileInputRef.current?.click()}
                onMaterial={() => setMobilePanel("materials")}
              />
              {mobilePanel === "canvas" && (
                <PresetCards
                  currentPresetId={draft.presetId}
                  favoritePresetIds={presetDiscoveryState.favoritePresetIds}
                  recentPresetIds={presetDiscoveryState.recentPresetIds}
                  onApply={requestPresetApply}
                  onFavoriteToggle={togglePresetFavorite}
                />
              )}
              {mobilePanel === "materials" && <MaterialLibraryPanel onAdd={addMaterialLayer} />}
              {mobilePanel === "layers" && (
                <LayerPanel
                  layers={draft.layers}
                  presetId={draft.presetId}
                  selectedLayerId={draft.selectedLayerId}
                  onSelect={(id) => setDraft((current) => ({ ...current, selectedLayerId: id }))}
                  onMove={moveLayer}
                  onDuplicate={duplicateLayer}
                  onDelete={deleteLayer}
                  onToggleFlag={toggleLayerFlag}
                />
              )}
              {mobilePanel === "text" && selectedLayer && (
                <PropertyPanel layer={selectedLayer} fontMenuOpen={fontMenuOpen} onFontMenuOpenChange={setFontMenuOpen} onChange={updateSelectedLayer} />
              )}
              {mobilePanel === "export" && (
                <ExportPanel exportFormat={exportFormat} onFormatChange={setExportFormat} onSave={saveDraft} onExport={exportImage} onSendToSns={sendToSnsSplit} />
              )}
            </section>

            <div className="hidden min-[1024px]:mt-4 min-[1024px]:block">
              <PresetCards
                currentPresetId={draft.presetId}
                favoritePresetIds={presetDiscoveryState.favoritePresetIds}
                recentPresetIds={presetDiscoveryState.recentPresetIds}
                onApply={requestPresetApply}
                onFavoriteToggle={togglePresetFavorite}
              />
            </div>
          </main>

          <aside className={sidePanelCollapsed ? "hidden" : "hidden min-h-0 border-l border-border bg-surface/78 min-[1024px]:block"}>
            <div className="h-full space-y-3 overflow-y-auto p-4 scrollbar-accent xl:p-5">
              <QuickAddBar
                onText={() => addLayer(createTextLayer())}
                onShape={(shapeType) => addLayer(createShapeLayer(shapeType))}
                onImage={() => fileInputRef.current?.click()}
                onMaterial={() => setSidePanelCollapsed(false)}
              />
              <MaterialLibraryPanel onAdd={addMaterialLayer} />
              <LayerPanel
                layers={draft.layers}
                presetId={draft.presetId}
                selectedLayerId={draft.selectedLayerId}
                onSelect={(id) => setDraft((current) => ({ ...current, selectedLayerId: id }))}
                onMove={moveLayer}
                onDuplicate={duplicateLayer}
                onDelete={deleteLayer}
                onToggleFlag={toggleLayerFlag}
              />
              {selectedLayer ? (
                <PropertyPanel layer={selectedLayer} fontMenuOpen={fontMenuOpen} onFontMenuOpenChange={setFontMenuOpen} onChange={updateSelectedLayer} />
              ) : (
                <div className="panel p-4 text-sm text-muted">編集するレイヤーを選択してください。</div>
              )}
              <ExportPanel exportFormat={exportFormat} onFormatChange={setExportFormat} onSave={saveDraft} onExport={exportImage} onSendToSns={sendToSnsSplit} />
            </div>
          </aside>
        </div>
      </div>

      <nav className="grid shrink-0 grid-cols-5 border-t border-border bg-surface/95 min-[1024px]:hidden">
        {mobilePanels.map((item) => (
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
            {item.label}
          </button>
        ))}
      </nav>

      {mobilePreviewOpen ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground min-[1024px]:hidden" role="dialog" aria-modal="true" aria-label="サムネイル全体プレビュー">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary-strong">全体確認</p>
              <h2 className="truncate text-base font-black text-foreground">{selectedPreset.name}</h2>
            </div>
            <button type="button" className="flat-control px-3 py-2 text-sm font-bold" onClick={() => setMobilePreviewOpen(false)} aria-label="全体プレビューを閉じる">
              閉じる
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
            <canvas
              ref={mobilePreviewCanvasRef}
              className="aspect-video h-auto max-h-[calc(100vh-8rem)] w-full max-w-[min(100%,calc((100vh-8rem)*16/9))] rounded-base border border-border bg-[#081117] object-contain shadow-panel"
              aria-label="サムネイル全体確認"
            />
          </div>
          <p className="shrink-0 border-t border-border px-4 py-3 text-center text-xs leading-5 text-muted">
            確認専用です。編集に戻るには閉じるを押してください。
          </p>
        </div>
      ) : null}

      {pendingPreset ? (
        <PresetApplyConfirmDialog
          currentPresetName={selectedPreset.name}
          targetPreset={pendingPreset}
          currentText={currentMainTextCarryover}
          targetText={pendingPresetDefaultText}
          hasScheduleHandoff={Boolean(handoffPayload)}
          onApplyPlain={() => applyPreset(pendingPreset.id, "plain")}
          onApplyCarryover={() => applyPreset(pendingPreset.id, handoffPayload ? "handoff" : "carryover")}
          onCancel={() => setPendingPresetApplyId(null)}
        />
      ) : null}

      <input ref={fileInputRef} className="hidden" type="file" accept="image/png,image/jpeg" onChange={handleImageUpload} aria-label="画像ファイルを選択" />
      {toast && (
        <div className={`fixed bottom-20 left-4 right-4 z-50 rounded-base border px-4 py-3 text-sm font-bold shadow-panel min-[1024px]:bottom-5 min-[1024px]:left-auto min-[1024px]:right-5 min-[1024px]:w-96 ${toneClassName[toast.tone]}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function QuickAddBar({
  onText,
  onShape,
  onImage,
  onMaterial
}: {
  onText: () => void;
  onShape: (shapeType: ThumbnailShapeType) => void;
  onImage: () => void;
  onMaterial: () => void;
}) {
  return (
    <section className="panel p-3">
      <div className="grid grid-cols-5 gap-2">
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={onText} aria-label="テキストレイヤーを追加">
          T テキスト
        </button>
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={() => onShape("rect")} aria-label="矩形レイヤーを追加">
          ▭ 矩形
        </button>
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={() => onShape("circle")} aria-label="円レイヤーを追加">
          ○ 円
        </button>
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={onImage} aria-label="画像レイヤーを追加">
          ▧ 画像
        </button>
        <button className="flat-control whitespace-nowrap px-1.5 py-2 text-[10px] font-bold xl:text-xs" type="button" onClick={onMaterial} aria-label="素材ライブラリを開く">
          ◇ 素材
        </button>
      </div>
    </section>
  );
}

function MaterialLibraryPanel({ onAdd }: { onAdd: (id: string) => void }) {
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
    () => {
      const query = normalizeMaterialSearchText(materialSearchQuery);
      return thumbnailMaterialLibrary.filter((material) => {
        if (selectedCategory !== "all" && material.category !== selectedCategory) {
          return false;
        }
        if (!query) {
          return true;
        }
        return normalizeMaterialSearchText(
          [material.name, material.description, material.recommendedPlacement, thumbnailMaterialCategoryLabels[material.category]].join(" ")
        ).includes(query);
      });
    },
    [materialSearchQuery, selectedCategory]
  );
  const selectedCategoryCount = selectedCategory === "all" ? thumbnailMaterialLibrary.length : materialCategoryCounts[selectedCategory];

  return (
    <section className="panel space-y-3 p-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-black text-foreground">素材ライブラリ</h2>
        <p className="shrink-0 text-right text-xs font-bold leading-5 text-muted">
          {filteredMaterials.length} / {selectedCategoryCount}点
          <span className="block text-[11px] font-bold text-muted/80">全{thumbnailMaterialLibrary.length}点</span>
        </p>
      </div>
      <label className="block">
        <span className="sr-only">素材名・説明・推奨配置で検索</span>
        <input
          className="w-full rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:bg-primary-soft/20"
          type="search"
          value={materialSearchQuery}
          onChange={(event) => setMaterialSearchQuery(event.target.value)}
          placeholder="素材名・説明・推奨配置で検索"
          aria-label="素材名・説明・推奨配置で検索"
        />
      </label>
      <div className="scrollbar-accent flex gap-2 overflow-x-auto pb-1 [scrollbar-gutter:stable] min-[520px]:flex-wrap min-[520px]:overflow-visible min-[520px]:pb-0">
        {[
          { id: "all", label: "すべて", count: thumbnailMaterialLibrary.length },
          ...materialCategories.map((category) => ({
            id: category,
            label: thumbnailMaterialCategoryLabels[category],
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
        {filteredMaterials.map((material) => (
          <button
            key={material.id}
            className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2 rounded-base border border-border bg-surface p-2 text-left transition hover:border-primary hover:bg-primary-soft/35 md:grid-cols-[5.25rem_minmax(0,1fr)]"
            type="button"
            onClick={() => onAdd(material.id)}
            aria-label={`${material.name}を素材として追加`}
            title={material.description}
          >
            <span className="grid aspect-video place-items-center overflow-hidden rounded-sm border border-border bg-[#07111c]">
              <span
                className="block h-full w-full bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${material.src})` }}
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-foreground">{material.name}</span>
              <span className="mt-1 inline-flex rounded-sm border border-primary/40 bg-primary-soft/40 px-2 py-0.5 text-[11px] font-bold text-primary-strong">
                {thumbnailMaterialCategoryLabels[material.category]}
              </span>
              <span className="mt-1 line-clamp-1 block text-xs leading-5 text-muted">{material.recommendedPlacement}</span>
              <span className="line-clamp-1 block text-[11px] leading-4 text-muted/85">{material.description}</span>
            </span>
          </button>
        ))}
        {filteredMaterials.length === 0 ? (
          <div className="rounded-base border border-dashed border-border bg-surface-muted/40 px-3 py-5 text-center text-xs font-bold leading-5 text-muted">
            条件に合う素材はありません。
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ModeToggle({
  editorMode,
  onModeChange,
  className = ""
}: {
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
        編集
      </button>
      <button
        className={`px-3 py-1 text-xs font-bold ${editorMode === "pan" ? "rounded-sm bg-primary text-white" : "text-muted"}`}
        type="button"
        onClick={() => onModeChange("pan")}
      >
        表示移動
      </button>
    </div>
  );
}

function DesktopToolRail({
  editorMode,
  onModeChange,
  onText,
  onShape,
  onImage,
  onMaterial
}: {
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
      <button className={toolButtonClass(editorMode === "edit")} type="button" onClick={() => onModeChange("edit")} title="選択">
        <span className="text-lg">⌖</span>
        選択
      </button>
      <button className={toolButtonClass(false)} type="button" onClick={onText} title="テキスト">
        <span className="text-lg">T</span>
        テキスト
      </button>
      <div ref={shapeMenuRef} className="relative">
        <button className={toolButtonClass(shapeMenuOpen)} type="button" onClick={() => setShapeMenuOpen((current) => !current)} title="図形">
          <span className="text-lg">◇</span>
          図形
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
              ▭ 矩形
            </button>
            <button
              className="block w-full rounded-base px-3 py-2 text-left text-xs font-bold text-foreground hover:bg-primary-soft"
              type="button"
              onClick={() => {
                onShape("circle");
                setShapeMenuOpen(false);
              }}
            >
              ○ 円
            </button>
          </div>
        )}
      </div>
      <button className={toolButtonClass(false)} type="button" onClick={onImage} title="画像">
        <span className="text-lg">▧</span>
        画像
      </button>
      <button className={toolButtonClass(false)} type="button" onClick={onMaterial} title="素材">
        <span className="text-lg">◇</span>
        素材
      </button>
      <div className="my-1 h-px w-10 bg-border" />
      <button className={toolButtonClass(editorMode === "pan")} type="button" onClick={() => onModeChange("pan")} title="表示移動">
        <span className="text-lg">⌕</span>
        ズーム
      </button>
    </div>
  );
}

function LayerPanel({
  layers,
  presetId,
  selectedLayerId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onToggleFlag
}: {
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
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{compactName ?? layer.name}</span>
        <span className="text-xs text-muted">{layer.type}</span>
      </button>
      <div className="mt-2 grid grid-cols-6 gap-1">
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onMove(layer.id, "front")} title="前面へ">
          ↑
        </button>
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onMove(layer.id, "back")} title="背面へ">
          ↓
        </button>
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onDuplicate(layer.id)} title="複製">
          複
        </button>
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onToggleFlag(layer.id, "hidden")} title="表示切替">
          {layer.hidden ? "非" : "目"}
        </button>
        <button className="flat-control py-1 text-xs" type="button" onClick={() => onToggleFlag(layer.id, "locked")} title="ロック切替">
          {layer.locked ? "錠" : "開"}
        </button>
        <button className="flat-control py-1 text-xs text-rose-500" type="button" onClick={() => onDelete(layer.id)} title="削除">
          削
        </button>
      </div>
    </div>
  );

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-black text-foreground">レイヤー一覧</h2>
        <p className="text-xs font-bold text-muted">上が前面</p>
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
                  aria-label={`${group.label}グループを${collapsed ? "開く" : "閉じる"}`}
                  onClick={() => setCollapsedGroups((current) => ({ ...current, [group.id]: !collapsed }))}
                >
                  <span>週間予定レイヤー / {group.label}</span>
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
  layer,
  fontMenuOpen,
  onFontMenuOpenChange,
  onChange
}: {
  layer: ThumbnailLayer;
  fontMenuOpen: boolean;
  onFontMenuOpenChange: (open: boolean) => void;
  onChange: (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => void;
}) {
  return (
    <section className="panel space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-foreground">{layer.type === "text" ? "テキスト設定" : layer.type === "shape" ? "図形設定" : "画像設定"}</h2>
        <span className="rounded-base bg-surface-muted px-2 py-1 text-xs font-bold text-muted">{layer.name}</span>
      </div>

      <label className="block text-xs font-bold text-muted">
        レイヤー名
        <input
          className="mt-1 w-full rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground"
          maxLength={40}
          type="text"
          value={layer.name}
          onChange={(event) => onChange((item) => ({ ...item, name: event.target.value.slice(0, 40) }))}
          onBlur={(event) => {
            const fallback = layer.type === "text" ? "テキスト" : layer.type === "shape" ? "図形" : "画像";
            onChange((item) => ({ ...item, name: normalizeThumbnailLayerName(event.target.value, fallback) }));
          }}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="X" value={layer.x} min={-2000} max={4000} onChange={(x) => onChange((item) => ({ ...item, x }))} />
        <NumberField label="Y" value={layer.y} min={-2000} max={4000} onChange={(y) => onChange((item) => ({ ...item, y }))} />
        <NumberField label="幅" value={layer.width} min={16} max={4000} onChange={(width) => onChange((item) => ({ ...item, width }))} />
        <NumberField label="高さ" value={layer.height} min={16} max={4000} onChange={(height) => onChange((item) => ({ ...item, height }))} />
      </div>

      {layer.type === "text" && <TextControls layer={layer} fontMenuOpen={fontMenuOpen} onFontMenuOpenChange={onFontMenuOpenChange} onChange={onChange} />}
      {layer.type === "shape" && <ShapeControls layer={layer} onChange={onChange} />}
      <EffectControls layer={layer} onChange={onChange} />
    </section>
  );
}

function TextControls({
  layer,
  fontMenuOpen,
  onFontMenuOpenChange,
  onChange
}: {
  layer: Extract<ThumbnailLayer, { type: "text" }>;
  fontMenuOpen: boolean;
  onFontMenuOpenChange: (open: boolean) => void;
  onChange: (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => void;
}) {
  const update = <K extends keyof typeof layer>(key: K, value: (typeof layer)[K]) => onChange((item) => (item.type === "text" ? { ...item, [key]: value } : item));
  const fontMenuRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <label className="block text-xs font-bold text-muted">
        テキスト
        <textarea
          className="mt-1 min-h-24 w-full rounded-base border border-border bg-surface px-3 py-2 text-sm text-foreground"
          maxLength={150}
          value={layer.text}
          onChange={(event) => update("text", event.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div ref={fontMenuRef} className="relative text-xs font-bold text-muted">
          フォント
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
              <div className="scrollbar-accent max-h-48 overflow-y-auto [scrollbar-gutter:stable]" role="listbox">
                {thumbnailFontGroups.map((group) => (
                  <div key={group.label}>
                    <p className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-normal text-muted">{group.label}</p>
                    {group.fonts.map((font) => (
                      <button
                        key={font}
                        type="button"
                        role="option"
                        aria-selected={font === layer.fontFamily}
                        className={[
                          "block w-full rounded-base px-3 py-2 text-left text-sm font-bold",
                          font === layer.fontFamily ? "bg-primary-soft text-primary-strong" : "text-foreground hover:bg-surface-muted"
                        ].join(" ")}
                        style={{ fontFamily: `"${font}", sans-serif` }}
                        onClick={() => {
                          update("fontFamily", font);
                          onFontMenuOpenChange(false);
                        }}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <NumberField label="サイズ" value={layer.fontSize} min={12} max={240} onChange={(fontSize) => update("fontSize", fontSize)} />
        <NumberField label="行間" value={Number(layer.lineHeight.toFixed(2))} min={0.8} max={2} step={0.05} onChange={(lineHeight) => update("lineHeight", lineHeight)} />
        <ColorField label="色" value={layer.color} onChange={(color) => update("color", color)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["left", "center", "right"] as ThumbnailTextAlign[]).map((align) => (
          <button
            key={align}
            className={`flat-control py-2 text-xs font-bold ${layer.align === align ? "border-primary bg-primary-soft text-primary-strong" : ""}`}
            type="button"
            onClick={() => update("align", align)}
          >
            {align === "left" ? "左" : align === "center" ? "中央" : "右"}
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

function ShapeControls({ layer, onChange }: { layer: Extract<ThumbnailLayer, { type: "shape" }>; onChange: (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => void }) {
  const update = <K extends keyof typeof layer>(key: K, value: (typeof layer)[K]) => onChange((item) => (item.type === "shape" ? { ...item, [key]: value } : item));

  return (
    <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
      <ColorField label="塗りつぶし" value={layer.fillColor} popoverAlign="left" onChange={(fillColor) => update("fillColor", fillColor)} />
      <ColorField label="枠線" value={layer.strokeColor} onChange={(strokeColor) => update("strokeColor", strokeColor)} />
      <NumberField label="枠線の太さ" value={layer.strokeWidth} min={0} max={48} onChange={(strokeWidth) => update("strokeWidth", strokeWidth)} />
      <NumberField label="角丸" value={layer.borderRadius} min={0} max={120} onChange={(borderRadius) => update("borderRadius", borderRadius)} />
    </div>
  );
}

function EffectControls({ layer, onChange }: { layer: ThumbnailLayer; onChange: (updater: (layer: ThumbnailLayer) => ThumbnailLayer) => void }) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-black text-foreground">エフェクト</h3>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="透明度" value={Math.round(layer.opacity * 100)} min={0} max={100} onChange={(value) => onChange((item) => ({ ...item, opacity: value / 100 }))} suffix="%" />
        <NumberField label="ぼかし" value={layer.blur} min={0} max={24} onChange={(blur) => onChange((item) => ({ ...item, blur }))} />
        {layer.type === "text" && (
          <>
            <NumberField label="縁取り" value={layer.strokeWidth} min={0} max={48} onChange={(strokeWidth) => onChange((item) => (item.type === "text" ? { ...item, strokeWidth } : item))} />
            <ColorField label="縁取り色" value={layer.strokeColor} onChange={(strokeColor) => onChange((item) => (item.type === "text" ? { ...item, strokeColor } : item))} />
            <NumberField label="影ぼかし" value={layer.shadowBlur} min={0} max={64} onChange={(shadowBlur) => onChange((item) => (item.type === "text" ? { ...item, shadowBlur } : item))} />
            <ColorField label="影色" value={layer.shadowColor} onChange={(shadowColor) => onChange((item) => (item.type === "text" ? { ...item, shadowColor } : item))} />
            <NumberField label="影X" value={layer.shadowOffsetX} min={-80} max={80} onChange={(shadowOffsetX) => onChange((item) => (item.type === "text" ? { ...item, shadowOffsetX } : item))} />
            <NumberField label="影Y" value={layer.shadowOffsetY} min={-80} max={80} onChange={(shadowOffsetY) => onChange((item) => (item.type === "text" ? { ...item, shadowOffsetY } : item))} />
          </>
        )}
      </div>
    </div>
  );
}

function PresetApplyConfirmDialog({
  currentPresetName,
  targetPreset,
  currentText,
  targetText,
  hasScheduleHandoff,
  onApplyPlain,
  onApplyCarryover,
  onCancel
}: {
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
          <p className="text-xs font-bold text-primary-strong">プリセット適用の確認</p>
          <h2 id="preset-apply-title" className="mt-1 text-lg font-black text-foreground">
            {currentPresetName} から {targetPreset.name} へ変更
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            プリセット適用で現在のレイヤー構成は置き換わります。画像、図形、自由追加レイヤーの高度なマージは今回行いません。
          </p>
          {hasScheduleHandoff ? (
            <p className="mt-2 rounded-base border border-primary/40 bg-primary-soft/35 px-3 py-2 text-xs font-bold leading-5 text-primary-strong">
              Schedule Calendar 由来の予定テキストを優先し、新しいプリセットの見出し、時刻、サブ、ラベルへ再反映します。
            </p>
          ) : null}
        </div>
        <div className="max-h-[52vh] overflow-auto px-4 py-4 md:px-5">
          <div className="grid gap-2">
            {thumbnailMainTextCarryoverTargets.map((target) => (
              <div key={target.id} className="grid gap-2 rounded-base border border-border bg-surface p-3 text-xs min-[640px]:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)]">
                <p className="font-black text-foreground">{target.label}</p>
                <div className="min-w-0">
                  <p className="mb-1 font-bold text-muted">現在</p>
                  <p className="line-clamp-2 break-words font-bold text-foreground">{currentText[target.id] || "未設定"}</p>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 font-bold text-muted">新プリセット初期値</p>
                  <p className="line-clamp-2 break-words font-bold text-foreground">{targetText[target.id] || "未設定"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 min-[640px]:flex-row min-[640px]:justify-end md:px-5">
          <button className="flat-control px-4 py-2 text-sm font-bold" type="button" onClick={onCancel}>
            キャンセル
          </button>
          {!hasScheduleHandoff ? (
            <button className="flat-control px-4 py-2 text-sm font-bold" type="button" onClick={onApplyPlain}>
              プリセットをそのまま適用
            </button>
          ) : null}
          <button className="rounded-base bg-primary px-4 py-2 text-sm font-bold text-white" type="button" onClick={onApplyCarryover}>
            {hasScheduleHandoff ? "予定テキストを引き継いで適用" : "主要テキストを引き継いで適用"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PresetCards({
  currentPresetId,
  favoritePresetIds,
  recentPresetIds,
  onApply,
  onFavoriteToggle
}: {
  currentPresetId: ThumbnailPresetId;
  favoritePresetIds: ThumbnailPresetId[];
  recentPresetIds: ThumbnailPresetId[];
  onApply: (id: ThumbnailPresetId) => void;
  onFavoriteToggle: (id: ThumbnailPresetId) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ThumbnailPresetCategory | "all">("all");
  const [selectedUsageLabel, setSelectedUsageLabel] = useState<string | "all">("all");
  const filteredPresets = useMemo(
    () =>
      filterThumbnailPresets(thumbnailPresets, {
        query,
        category: selectedCategory,
        usageLabel: selectedUsageLabel
      }),
    [query, selectedCategory, selectedUsageLabel]
  );
  const favoritePresets = useMemo(() => getPresetsByIds(favoritePresetIds), [favoritePresetIds]);
  const recentPresets = useMemo(() => getPresetsByIds(recentPresetIds), [recentPresetIds]);
  const hasActiveFilters = query.trim() !== "" || selectedCategory !== "all" || selectedUsageLabel !== "all";
  const clearFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setSelectedUsageLabel("all");
  };

  return (
    <section className="panel space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-black text-foreground">プリセット一覧</h2>
          <p className="mt-1 text-xs font-bold text-muted">検索、カテゴリ、用途ラベルで絞り込みできます。</p>
        </div>
        <p className="text-xs font-bold text-muted">
          {filteredPresets.length} / {thumbnailPresets.length}種
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block text-xs font-bold text-muted">
          検索
          <input
            className="mt-1 w-full rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="プリセット名・カテゴリ・用途・説明"
          />
        </label>
        <button
          className="flat-control self-end px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          条件クリア
        </button>
      </div>

      <PresetFilterChips
        label="カテゴリ"
        value={selectedCategory}
        options={thumbnailPresetCategories}
        allLabel="すべて"
        onChange={(category) => setSelectedCategory(category as ThumbnailPresetCategory | "all")}
      />
      <PresetFilterChips
        label="用途ラベル"
        value={selectedUsageLabel}
        options={thumbnailPresetUsageLabels}
        allLabel="すべて"
        onChange={setSelectedUsageLabel}
      />

      {favoritePresets.length > 0 ? <PresetShortcutRow title="お気に入り" presets={favoritePresets} onApply={onApply} /> : null}
      {recentPresets.length > 0 ? <PresetShortcutRow title="最近使った" presets={recentPresets} onApply={onApply} /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {filteredPresets.map((preset) => {
          const isFavorite = favoritePresetIds.includes(preset.id);
          return (
          <article
            key={preset.id}
            className={[
              "rounded-base border bg-surface p-3 text-left transition",
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
                aria-label={isFavorite ? `${preset.name}のお気に入りを解除` : `${preset.name}をお気に入りに追加`}
                aria-pressed={isFavorite}
                title={isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
              >
                {isFavorite ? "★" : "☆"}
              </button>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="rounded-sm border border-border bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-muted">{preset.category}</span>
              <span className="rounded-sm border border-primary/40 bg-primary-soft/40 px-2 py-0.5 text-[11px] font-bold text-primary-strong">{preset.usageLabel}</span>
            </div>
            <p className="text-sm font-black text-foreground">{preset.name}</p>
            <p className="mt-1 min-h-10 text-xs leading-5 text-muted">{preset.description}</p>
            <button
              className="mt-3 inline-flex rounded-base border border-primary/50 px-3 py-1 text-xs font-bold text-primary-strong transition hover:bg-primary-soft"
              type="button"
              onClick={() => onApply(preset.id)}
              aria-pressed={currentPresetId === preset.id}
            >
              このプリセットを使用
            </button>
          </article>
          );
        })}
      </div>
      {filteredPresets.length === 0 ? (
        <div className="rounded-base border border-dashed border-border bg-surface-muted px-4 py-5 text-sm font-bold text-muted">
          条件に一致するプリセットがありません。
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
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  allLabel: string;
  onChange: (value: string | "all") => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {[{ id: "all", label: allLabel }, ...options.map((option) => ({ id: option, label: option }))].map((option) => (
          <button
            key={option.id}
            className={[
              "rounded-base border px-3 py-1.5 text-xs font-bold transition",
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

function PresetShortcutRow({ title, presets, onApply }: { title: string; presets: ThumbnailPreset[]; onApply: (id: ThumbnailPresetId) => void }) {
  return (
    <div className="space-y-2 rounded-base border border-border bg-surface-muted p-3">
      <p className="text-xs font-black text-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            className="rounded-base border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary-strong"
            type="button"
            onClick={() => onApply(preset.id)}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExportPanel({
  exportFormat,
  onFormatChange,
  onSave,
  onExport,
  onSendToSns
}: {
  exportFormat: "png" | "jpeg";
  onFormatChange: (format: "png" | "jpeg") => void;
  onSave: () => void;
  onExport: () => void;
  onSendToSns: () => void;
}) {
  return (
    <section className="panel space-y-3 p-4">
      <h2 className="text-base font-black text-foreground">保存 / 書き出し</h2>
      <div className="grid grid-cols-2 gap-2">
        <button className={`flat-control py-2 text-sm font-bold ${exportFormat === "png" ? "border-primary bg-primary-soft text-primary-strong" : ""}`} type="button" onClick={() => onFormatChange("png")}>
          PNG
        </button>
        <button className={`flat-control py-2 text-sm font-bold ${exportFormat === "jpeg" ? "border-primary bg-primary-soft text-primary-strong" : ""}`} type="button" onClick={() => onFormatChange("jpeg")}>
          JPEG
        </button>
      </div>
      <button className="flat-control w-full px-4 py-2 font-bold" type="button" onClick={onSave} aria-label="下書きを保存">
        下書き保存
      </button>
      <button className="flat-control w-full px-4 py-2 font-bold" type="button" onClick={onSendToSns} aria-label="SNS分割画像メーカーで使う">
        SNS分割画像で使う
      </button>
      <button className="w-full rounded-base bg-primary px-4 py-2 text-sm font-bold text-white" type="button" onClick={onExport} aria-label="サムネイルを書き出し">
        書き出し
      </button>
      <p className="text-xs leading-5 text-muted">下書きはこのブラウザの localStorage に保存されます。PNG/JPEG は表示中キャンバスと同じ描画結果で1枚出力します。SNS分割画像への受け渡し画像は一時的にIndexedDBへ保存します。</p>
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
  label,
  value,
  popoverAlign = "right",
  onChange
}: {
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
            aria-label={`${label}を選ぶ`}
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
                  aria-label={`色 ${swatch}`}
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
  onToggle,
  onSelect,
  className
}: {
  value: string;
  options: { id: string; label: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        className="flex w-full items-center justify-between rounded-base border border-border bg-surface px-3 py-2 text-left text-sm font-bold text-foreground"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={`${value} の選択肢を開く`}
      >
        <span className="truncate">{value}</span>
        <span className="text-xs text-muted">▾</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-auto rounded-base border border-border bg-surface shadow-lg">
          {options.map((option) => (
            <button
              key={option.id}
              className="block w-full border-b border-border/60 px-3 py-2 text-left text-sm font-bold text-foreground transition hover:bg-primary/12 last:border-b-0"
              type="button"
              onClick={() => onSelect(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
