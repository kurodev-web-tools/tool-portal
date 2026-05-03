"use client";

import { ChangeEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  countReadySnsSplitImages,
  createSnsSplitDraft,
  createSnsSplitFileName,
  defaultSnsSplitPreset,
  defaultSnsSplitConfig,
  defaultSnsSplitPostAdjustment,
  drawSnsSplitComposite,
  drawSnsSplitMainTile,
  drawSnsSplitTile,
  getSnsSplitPostAdjustment,
  getRequiredSlotCount,
  getSnsSplitSlotLabel,
  getSnsSplitTiles,
  isSnsSplitPreset,
  type SnsSplitConfig,
  type SnsSplitDraft,
  type SnsSplitExportFormat,
  type SnsSplitImageSource,
  type SnsSplitJoinType,
  type SnsSplitMode,
  type SnsSplitPreset,
  type SnsSplitPostIndex,
  type SnsSplitTile
} from "@/lib/sns-split-image-maker";
import { SnsSplitPresetLanding } from "./SnsSplitPresetLanding";
import {
  persistDraftMetadata,
  readImageFile,
  restoreDraft,
  writeStoredImageSource,
  writeStoredImageSources
} from "./snsSplitDraftPersistence";

type ToastTone = "info" | "success" | "warning" | "error";
type ToastState = { tone: ToastTone; message: string } | null;
type MobileView = "preview" | "edit";
type PreviewMode = "edit" | "grid" | "post";
type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
  latestOffsetX: number;
  latestOffsetY: number;
  moved: boolean;
};
type DragPreviewRequest = {
  postIndex: SnsSplitPostIndex;
  offsetX: number;
  offsetY: number;
};

const modeOptions: { id: SnsSplitMode; label: string; note: string }[] = [
  { id: "concatenate", label: "1+8連結", note: "投稿ごとに上部/下部の追加画像でメイン分割を挟みます" },
  { id: "replace", label: "1+4差し替え", note: "各投稿のフレーム中央にメイン分割を差し込みます" }
];
const splitTwoModeOptions: { id: SnsSplitMode; label: string; note: string }[] = [
  { id: "concatenate", label: "個別追加", note: "投稿ごとに左右または上下左右の追加画像でメイン分割を挟みます" },
  { id: "replace", label: "フレーム追加", note: "投稿ごとの横長フレーム中央にメイン分割を差し込みます" }
];
const splitTwoJoinOptions: { id: SnsSplitJoinType; label: string; note: string }[] = [
  { id: "three", label: "3連結", note: "左追加 / 中央メイン / 右追加で構成します" },
  { id: "five", label: "5連結", note: "左上下 / 中央メイン / 右上下で構成します" }
];
const previewModes: { id: PreviewMode; label: string }[] = [
  { id: "edit", label: "編集" },
  { id: "grid", label: "全体" },
  { id: "post", label: "投稿時" }
];
const postAdjustmentSnapThreshold = 32;
const toneClassName: Record<ToastTone, string> = {
  info: "border-sky-400/60 bg-sky-500/12",
  success: "border-emerald-400/60 bg-emerald-500/12",
  warning: "border-amber-400/60 bg-amber-500/12",
  error: "border-rose-400/60 bg-rose-500/12"
};

const clampPostOffset = (value: number) => Math.min(Math.max(Math.round(value), -480), 480);
const snapPostOffset = (value: number) => {
  const rounded = clampPostOffset(value);
  return Math.abs(rounded) <= postAdjustmentSnapThreshold ? 0 : rounded;
};
const usesAdditionalModeLabels = (preset: SnsSplitPreset) => preset === "split-2" || preset === "split-3";
const getPresetRatioLabel = (preset: SnsSplitPreset) => {
  if (preset === "split-2") {
    return "24:9";
  }
  if (preset === "split-3") {
    return "24:9 / 8:13.5";
  }
  return "16:27";
};
const getPostOrderLabel = (preset: SnsSplitPreset) => {
  if (preset === "split-2") {
    return "1 → 2";
  }
  if (preset === "split-3") {
    return "1 → 2 → 3";
  }
  return "1 → 2 → 3 → 4";
};
const getPreviewDescription = (preset: SnsSplitPreset) => {
  if (preset === "split-2") {
    return "編集、24:9完成画像、左右のメイン分割を切り替えて確認します。";
  }
  if (preset === "split-3") {
    return "編集、上1枚+下2枚の完成画像、左大+右上下のメイン分割を切り替えて確認します。";
  }
  return "編集、4枚全体、投稿時のメイン分割を切り替えて確認します。";
};
const getSlotGroupLabel = (draft: SnsSplitDraft) => {
  if (draft.preset === "split-2") {
    if (draft.mode === "replace") {
      return "投稿別フレーム";
    }
    return draft.config.joinType === "five" ? "投稿別の左右上下" : "投稿別の左右";
  }
  if (draft.preset === "split-3") {
    return draft.mode === "replace" ? "画像別フレーム" : "画像別の左右/上下";
  }
  return draft.mode === "replace" ? "投稿別フレーム" : "投稿別の上部/下部";
};
const getSlotDescription = (draft: SnsSplitDraft) => {
  if (draft.preset === "split-2") {
    if (draft.mode === "replace") {
      return "フレーム追加では、各24:9フレーム画像の中央8:9へメイン分割を差し込みます。";
    }
    return draft.config.joinType === "five"
      ? "5連結では、各投稿を「左上下 / 中央メイン / 右上下」の24:9画像として作成します。"
      : "3連結では、各投稿を「左追加 / 中央メイン / 右追加」の24:9画像として作成します。";
  }
  if (draft.preset === "split-3") {
    return draft.mode === "replace"
      ? "フレーム追加では、画像1は24:9、画像2/3は8:13.5のフレーム全面へ描画し、中央メイン領域を上書きします。"
      : "個別追加では、画像1は左右8:9、画像2/3は上下8:4.5の追加画像でメイン分割を挟みます。";
  }
  return draft.mode === "concatenate"
    ? "1+8連結では、各投稿を「追加画像（上）/ メイン分割 / 追加画像（下）」で作成します。"
    : "1+4差し替えでは、各フレーム画像の中央1/3へメイン分割を差し込みます。";
};
const getFilePatternHint = (preset: SnsSplitPreset) => {
  if (preset === "split-2") {
    return "{n}: 1〜2、{nn}: 01〜02";
  }
  if (preset === "split-3") {
    return "{n}: 1〜3、{nn}: 01〜03";
  }
  return "{n}: 1〜4、{nn}: 01〜04";
};
const getPresetFromLocation = (): SnsSplitPreset | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const preset = new URLSearchParams(window.location.search).get("preset");
  return isSnsSplitPreset(preset) ? preset : null;
};
const createDraftForPreset = (current: SnsSplitDraft, preset: SnsSplitPreset) => {
  if (current.preset === preset) {
    return current;
  }
  const next = createSnsSplitDraft("concatenate", preset);
  const imageById = new Map(current.images.map((image) => [image.id, image.src]));
  return {
    ...next,
    exportSettings: current.exportSettings,
    images: next.images.map((image) => ({ ...image, src: imageById.get(image.id) ?? null }))
  };
};

export function SnsSplitImageMakerApp() {
  const [draft, setDraft] = useState<SnsSplitDraft>(() => createSnsSplitDraft());
  const [activePreset, setActivePreset] = useState<SnsSplitPreset | null>(null);
  const [hasStoredDraft, setHasStoredDraft] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [mobileView, setMobileView] = useState<MobileView>("preview");
  const [selectedPost, setSelectedPost] = useState<SnsSplitPostIndex>(1);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("grid");
  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const postPreviewCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragPreviewFrameRef = useRef<number | null>(null);
  const dragPreviewRenderingRef = useRef(false);
  const dragPreviewRequestRef = useRef<DragPreviewRequest | null>(null);
  const draftRef = useRef(draft);
  const selectedTileRef = useRef<SnsSplitTile>(getSnsSplitTiles(draft.config, draft.preset)[0]);

  const tiles = useMemo(() => getSnsSplitTiles(draft.config, draft.preset), [draft.config, draft.preset]);
  const imageStatus = useMemo(() => countReadySnsSplitImages(draft), [draft]);
  const visibleSlots = useMemo(
    () => draft.images.filter((image) => image.id !== "base").slice(0, getRequiredSlotCount(draft.preset, draft.mode, draft.config.joinType)),
    [draft.config.joinType, draft.images, draft.mode, draft.preset]
  );
  const baseImage = draft.images.find((image) => image.id === "base") ?? null;
  const canExport = imageStatus.baseReady;
  const selectedTile = tiles.find((tile) => tile.index === selectedPost) ?? tiles[0];
  const selectedAdjustment = getSnsSplitPostAdjustment(draft.config, selectedPost);
  const activeModeOptions = usesAdditionalModeLabels(draft.preset) ? splitTwoModeOptions : modeOptions;
  const postCount = tiles.length;
  const exportButtonLabel = `画像を出力（${postCount}枚）`;

  useEffect(() => {
    draftRef.current = draft;
    selectedTileRef.current = selectedTile;
  }, [draft, selectedTile]);

  useEffect(() => {
    if (!tiles.some((tile) => tile.index === selectedPost)) {
      setSelectedPost(tiles[0]?.index ?? 1);
    }
  }, [selectedPost, tiles]);

  useEffect(
    () => () => {
      if (dragPreviewFrameRef.current !== null) {
        cancelAnimationFrame(dragPreviewFrameRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const syncPresetFromLocation = () => setActivePreset(getPresetFromLocation());
    syncPresetFromLocation();
    window.addEventListener("popstate", syncPresetFromLocation);
    return () => window.removeEventListener("popstate", syncPresetFromLocation);
  }, []);

  useEffect(() => {
    let active = true;
    const hydrateDraft = async () => {
      const result = await restoreDraft();
      if (active && result.invalidStoredDraft) {
        setToast({ tone: "warning", message: "保存データを復元できなかったため初期状態で開始しました。" });
      }
      if (result.brokenStoredDraft) {
        if (active) {
          setToast({ tone: "warning", message: "保存データが破損していたため安全に初期化しました。" });
        }
      }
      if (active && result.imageRestoreFailed && result.restoredFromStorage) {
        setToast({ tone: "warning", message: "設定は復元しましたが、画像の復元に失敗しました。" });
      } else if (active && (result.restoredFromStorage || result.restoredStoredImages)) {
        setToast({ tone: "success", message: "前回の作業状態を復元しました。" });
      }
      if (active) {
        const urlPreset = getPresetFromLocation();
        setDraft(urlPreset ? createDraftForPreset(result.draft, urlPreset) : result.draft);
        setHasStoredDraft(result.restoredFromStorage || result.restoredStoredImages);
        setHydrated(true);
      }
    };
    void hydrateDraft();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      persistDraftMetadata(draft);
    } catch {
      setToast({ tone: "warning", message: "設定の自動保存に失敗しました。画像は編集中の画面上では維持されています。" });
    }
  }, [draft, hydrated]);

  const renderPreviews = useCallback(async () => {
    const snapshot = draft;
    try {
      if (editorCanvasRef.current) {
        await drawSnsSplitTile(editorCanvasRef.current, snapshot, selectedTile, { includeGuides: snapshot.config.showSeam || snapshot.config.showGrid });
      }
      await Promise.all(
        tiles.map((tile, index) => {
          const canvas = postPreviewCanvasRefs.current[index];
          return canvas ? drawSnsSplitMainTile(canvas, snapshot, tile) : Promise.resolve();
        })
      );
      if (compositeCanvasRef.current) {
        await drawSnsSplitComposite(compositeCanvasRef.current, snapshot, {
          includeGuides: snapshot.config.showSeam || snapshot.config.showGrid
        });
      }
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "プレビュー生成に失敗しました。" });
    }
  }, [draft, selectedTile, tiles]);

  useEffect(() => {
    void renderPreviews();
  }, [previewMode, renderPreviews]);

  const updateDraft = (updater: (current: SnsSplitDraft) => SnsSplitDraft) => {
    setDraft((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
  };
  const updateConfig = (partial: Partial<SnsSplitConfig>) => {
    updateDraft((current) => ({ ...current, config: { ...current.config, ...partial } }));
  };
  const switchJoinType = (joinType: SnsSplitJoinType) => {
    updateDraft((current) => {
      const next = createSnsSplitDraft(current.mode, current.preset, joinType);
      const imageById = new Map(current.images.map((image) => [image.id, image.src]));
      return {
        ...next,
        exportSettings: current.exportSettings,
        config: { ...current.config, joinType, postAdjustments: current.config.postAdjustments },
        images: next.images.map((image) => ({ ...image, src: imageById.get(image.id) ?? null }))
      };
    });
    setToast({ tone: "info", message: `${joinType === "three" ? "3連結" : "5連結"}に切り替えました。` });
  };
  const updatePostAdjustment = (postIndex: SnsSplitPostIndex, partial: Partial<typeof defaultSnsSplitPostAdjustment>) => {
    updateDraft((current) => ({
      ...current,
      config: {
        ...current.config,
        postAdjustments: {
          ...current.config.postAdjustments,
          [postIndex]: {
            ...getSnsSplitPostAdjustment(current.config, postIndex),
            ...partial
          }
        }
      }
    }));
  };
  const scheduleDragPreviewRender = () => {
    if (dragPreviewFrameRef.current !== null || dragPreviewRenderingRef.current) {
      return;
    }
    dragPreviewFrameRef.current = requestAnimationFrame(async () => {
      dragPreviewFrameRef.current = null;
      const request = dragPreviewRequestRef.current;
      dragPreviewRequestRef.current = null;
      if (!request) {
        return;
      }
      const canvas = editorCanvasRef.current;
      if (!canvas) {
        return;
      }
      dragPreviewRenderingRef.current = true;
      const currentDraft = draftRef.current;
      const currentAdjustment = getSnsSplitPostAdjustment(currentDraft.config, request.postIndex);
      const previewDraft: SnsSplitDraft = {
        ...currentDraft,
        config: {
          ...currentDraft.config,
          postAdjustments: {
            ...currentDraft.config.postAdjustments,
            [request.postIndex]: {
              ...currentAdjustment,
              offsetX: request.offsetX,
              offsetY: request.offsetY
            }
          }
        }
      };
      try {
        await drawSnsSplitTile(canvas, previewDraft, selectedTileRef.current, {
          includeGuides: previewDraft.config.showSeam || previewDraft.config.showGrid
        });
      } finally {
        dragPreviewRenderingRef.current = false;
        scheduleDragPreviewRender();
      }
    });
  };
  const renderDragPreview = (postIndex: SnsSplitPostIndex, offsetX: number, offsetY: number) => {
    dragPreviewRequestRef.current = { postIndex, offsetX, offsetY };
    scheduleDragPreviewRender();
  };
  const updateExport = (partial: Partial<SnsSplitDraft["exportSettings"]>) => {
    updateDraft((current) => ({ ...current, exportSettings: { ...current.exportSettings, ...partial } }));
  };
  const openPreset = (preset: SnsSplitPreset) => {
    setDraft((current) => createDraftForPreset(current, preset));
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("preset", preset);
      window.history.pushState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
    }
    setActivePreset(preset);
    setMobileView("preview");
  };
  const returnToPresetLanding = () => {
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", window.location.pathname);
    }
    setActivePreset(null);
    setMobileView("preview");
  };
  const switchMode = (mode: SnsSplitMode) => {
    updateDraft((current) => {
      const next = createSnsSplitDraft(mode, current.preset, current.config.joinType);
      const imageById = new Map(current.images.map((image) => [image.id, image.src]));
      return {
        ...next,
        preset: current.preset,
        exportSettings: current.exportSettings,
        config: { ...current.config, joinType: current.config.joinType, postAdjustments: current.config.postAdjustments },
        images: next.images.map((image) => ({ ...image, src: imageById.get(image.id) ?? null }))
      };
    });
    setToast({
      tone: "info",
      message:
        usesAdditionalModeLabels(draft.preset)
          ? `${mode === "concatenate" ? "個別追加" : "フレーム追加"}に切り替えました。`
          : mode === "concatenate"
            ? "1+8連結モードに切り替えました。"
            : "1+4差し替えモードに切り替えました。"
    });
  };
  const setImageSource = (id: SnsSplitImageSource["id"], src: string | null) => {
    updateDraft((current) => ({
      ...current,
      images: current.images.map((image) => (image.id === id ? { ...image, src } : image))
    }));
    void writeStoredImageSource(id, src).catch(() => {
      setToast({ tone: "warning", message: "画像の復元用保存に失敗しました。現在の編集画面ではそのまま利用できます。" });
    });
  };
  const handleImageFile = async (file: File, id: SnsSplitImageSource["id"]) => {
    try {
      const src = await readImageFile(file);
      setImageSource(id, src);
      setToast({ tone: "success", message: id === "base" ? "メイン画像を読み込みました。" : "追加画像を読み込みました。" });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "画像を読み込めませんでした。" });
    }
  };
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>, id: SnsSplitImageSource["id"]) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    await handleImageFile(file, id);
  };
  const resetConfig = () => {
    updateConfig({
      ...defaultSnsSplitConfig,
      postAdjustments: {
        1: { ...defaultSnsSplitPostAdjustment },
        2: { ...defaultSnsSplitPostAdjustment },
        3: { ...defaultSnsSplitPostAdjustment },
        4: { ...defaultSnsSplitPostAdjustment }
      }
    });
    setToast({ tone: "info", message: "分割・合成設定をリセットしました。" });
  };
  const resetSelectedPostAdjustment = () => {
    updatePostAdjustment(selectedPost, { ...defaultSnsSplitPostAdjustment });
    setToast({ tone: "info", message: `投稿${selectedPost}の表示位置をリセットしました。` });
  };
  const canvasPointFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = editorCanvasRef.current;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      scaleX: canvas.width / rect.width,
      scaleY: canvas.height / rect.height
    };
  };
  const handleEditorPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }
    const point = canvasPointFromPointer(event);
    if (!point) {
      return;
    }
    const bandHeight = editorCanvasRef.current!.height / 3;
    if (draft.preset === "split-2" || (draft.preset === "split-3" && selectedPost === 1)) {
      const columnWidth = editorCanvasRef.current!.width / 3;
      if (point.x < columnWidth || point.x > columnWidth * 2) {
        return;
      }
    } else if (point.y < bandHeight || point.y > bandHeight * 2) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: selectedAdjustment.offsetX,
      startOffsetY: selectedAdjustment.offsetY,
      latestOffsetX: selectedAdjustment.offsetX,
      latestOffsetY: selectedAdjustment.offsetY,
      moved: false
    };
  };
  const handleEditorPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || event.pointerType !== "mouse") {
      return;
    }
    const point = canvasPointFromPointer(event);
    if (!point) {
      return;
    }
    const dx = (event.clientX - drag.startClientX) * point.scaleX;
    const dy = (event.clientY - drag.startClientY) * point.scaleY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      drag.moved = true;
    }
    const offsetX = snapPostOffset(drag.startOffsetX + dx);
    const offsetY = snapPostOffset(drag.startOffsetY + dy);
    if (drag.latestOffsetX === offsetX && drag.latestOffsetY === offsetY) {
      return;
    }
    drag.latestOffsetX = offsetX;
    drag.latestOffsetY = offsetY;
    renderDragPreview(selectedPost, offsetX, offsetY);
  };
  const handleEditorPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    updatePostAdjustment(selectedPost, {
      offsetX: drag.latestOffsetX,
      offsetY: drag.latestOffsetY
    });
  };
  const saveDraft = async () => {
    try {
      await writeStoredImageSources(draft.images);
      persistDraftMetadata(draft);
      setToast({ tone: "success", message: "作業状態を保存しました。" });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "作業状態の保存に失敗しました。" });
    }
  };
  const exportTiles = async () => {
    if (!canExport) {
      setToast({ tone: "warning", message: "メイン画像を選択してから出力してください。" });
      return;
    }
    const canvas = exportCanvasRef.current ?? document.createElement("canvas");
    exportCanvasRef.current = canvas;
    try {
      for (const tile of tiles) {
        await drawSnsSplitTile(canvas, draft, tile, { forceJpegBackground: draft.exportSettings.format === "jpeg" });
        const mime = draft.exportSettings.format === "jpeg" ? "image/jpeg" : "image/png";
        const dataUrl = canvas.toDataURL(mime, draft.exportSettings.quality);
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = createSnsSplitFileName(draft.exportSettings.filePattern, tile.index, draft.exportSettings.format);
        link.click();
      }
      setToast({ tone: "success", message: `投稿順1→${postCount}で${postCount}枚を書き出しました。` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "画像の書き出しに失敗しました。" });
    }
  };

  if (activePreset !== "split-2" && activePreset !== "split-3" && activePreset !== "split-4") {
    return <SnsSplitPresetLanding hasStoredDraft={hasStoredDraft} storedPreset={draft.preset ?? defaultSnsSplitPreset} onOpenPreset={openPreset} />;
  }

  return (
    <div className="h-full overflow-y-auto bg-background/72 pb-20 text-foreground scrollbar-accent lg:pb-0">
      <div className="mx-auto flex min-h-full w-full max-w-[1640px] flex-col gap-4 px-4 py-4 lg:px-5 xl:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary-strong">画像・デザイン</p>
            <h1 className="truncate text-xl font-black tracking-tight text-foreground lg:text-2xl">SNS分割画像メーカー</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={returnToPresetLanding} className="flat-control px-3 py-2 text-xs font-bold">
              プリセットを変更
            </button>
            <button type="button" className="flat-control px-3 py-2 text-xs font-bold" disabled>
              ? 使い方
            </button>
            <button type="button" onClick={saveDraft} className="flat-control hidden px-4 py-2 text-xs font-bold sm:inline-flex">
              下書き保存
            </button>
            <button type="button" onClick={exportTiles} className="hidden rounded-base bg-primary px-4 py-2 text-sm font-black text-white shadow-panel disabled:cursor-not-allowed disabled:opacity-55 sm:inline-flex" disabled={!canExport}>
              画像を保存
            </button>
          </div>
        </header>

        <section className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black">{usesAdditionalModeLabels(draft.preset) ? "追加方式" : "モード"}</span>
            <div className="flex overflow-hidden rounded-base border border-border bg-surface">
              {activeModeOptions.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => switchMode(mode.id)}
                  className={[
                    "min-h-10 px-4 text-sm font-black transition",
                    draft.mode === mode.id ? "bg-primary text-white" : "text-muted hover:bg-surface-muted hover:text-foreground"
                  ].join(" ")}
                  title={mode.note}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          {draft.preset === "split-2" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">連結タイプ</span>
              <div className="flex overflow-hidden rounded-base border border-border bg-surface">
                {splitTwoJoinOptions.map((joinType) => (
                  <button
                    key={joinType.id}
                    type="button"
                    onClick={() => switchJoinType(joinType.id)}
                    className={[
                      "min-h-10 px-4 text-sm font-black transition",
                      draft.config.joinType === joinType.id ? "bg-primary text-white" : "text-muted hover:bg-surface-muted hover:text-foreground"
                    ].join(" ")}
                    title={joinType.note}
                  >
                    {joinType.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-black">
            最終比率
            <select className="flat-control h-10 px-4 font-bold" value={getPresetRatioLabel(draft.preset)} disabled>
              <option>{getPresetRatioLabel(draft.preset)}</option>
            </select>
          </label>
        </section>

        <main className="grid flex-1 gap-4 lg:min-h-[760px] lg:grid-cols-[minmax(0,1fr)_minmax(360px,43%)] xl:min-h-[820px] xl:grid-cols-[minmax(0,1fr)_minmax(440px,45%)]">
          <section className={["panel min-h-[560px] flex-col gap-4 overflow-hidden p-4 shadow-none lg:flex lg:min-h-[760px] xl:min-h-[820px]", mobileView === "preview" ? "flex" : "hidden"].join(" ")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionTitle title="プレビュー" description={getPreviewDescription(draft.preset)} />
              <div className="flex items-center gap-2 rounded-base border border-border bg-surface px-3 py-2 text-xs text-muted">
                <span className="font-bold text-primary-strong">投稿順</span>
                <span>{getPostOrderLabel(draft.preset)}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-base border border-border bg-surface">
              {previewModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPreviewMode(mode.id)}
                  className={[
                    "min-h-10 px-2 text-xs font-black",
                    previewMode === mode.id ? "bg-primary text-white" : "text-muted hover:bg-surface-muted"
                  ].join(" ")}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {previewMode === "edit" ? (
              <div className="flex flex-wrap items-center gap-2">
                {tiles.map((tile) => (
                  <button
                    key={tile.index}
                    type="button"
                    onClick={() => setSelectedPost(tile.index)}
                    className={[
                      "rounded-base border px-3 py-2 text-xs font-black transition",
                      selectedPost === tile.index ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface text-muted hover:bg-surface-muted"
                    ].join(" ")}
                  >
                    投稿{tile.index}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="min-h-[320px] flex-1 overflow-hidden rounded-base border border-primary/40 bg-surface-muted p-3 lg:min-h-[560px] xl:min-h-[640px]">
              {previewMode === "edit" ? (
                <div className={["mx-auto flex h-full min-h-0 w-full flex-col", draft.preset === "split-2" || (draft.preset === "split-3" && selectedPost === 1) ? "max-w-[860px]" : "max-w-[520px]"].join(" ")}>
                  <p className="mb-2 shrink-0 text-xs leading-5 text-muted">投稿{selectedPost}を編集中です。中央のメイン分割画像はPCのマウス操作でドラッグ移動できます。中心線に近づくと吸着します。</p>
                  <div className="flex min-h-0 flex-1 justify-center">
                    <canvas
                      ref={editorCanvasRef}
                      className="h-full w-auto max-w-full cursor-grab rounded-base bg-background object-contain active:cursor-grabbing"
                      aria-label={`投稿${selectedPost}の編集プレビュー`}
                      onPointerDown={handleEditorPointerDown}
                      onPointerMove={handleEditorPointerMove}
                      onPointerUp={handleEditorPointerUp}
                      onPointerCancel={handleEditorPointerUp}
                    />
                  </div>
                </div>
              ) : null}
              {previewMode === "grid" ? (
                <div className={["mx-auto flex h-full min-h-0 w-full justify-center", draft.preset === "split-2" ? "max-w-[900px]" : draft.preset === "split-3" ? "max-w-[760px]" : "max-w-[720px]"].join(" ")}>
                  <canvas ref={compositeCanvasRef} className="h-full w-auto max-w-full rounded-base bg-background object-contain" aria-label={`${postCount}枚投稿の並び確認`} />
                </div>
              ) : null}
              {previewMode === "post" ? (
                draft.preset === "split-3" ? (
                  <div className="m-auto grid aspect-video w-full max-w-[860px] overflow-hidden rounded-base border border-primary/40" style={{ gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" }}>
                    {tiles.map((tile, index) => (
                      <button
                        key={tile.index}
                        type="button"
                        onClick={() => setSelectedPost(tile.index)}
                        className={[
                          "relative flex items-center justify-center overflow-hidden border-primary/35 bg-transparent",
                          tile.index === 1 ? "border-r" : "",
                          tile.index === 2 ? "border-b" : "",
                          selectedPost === tile.index ? "outline outline-2 outline-primary outline-offset-[-2px]" : ""
                        ].join(" ")}
                        style={tile.index === 1 ? { gridRow: "1 / span 2" } : undefined}
                      >
                        <span className="absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-primary/80 text-xs font-black text-white">
                          {tile.index}
                        </span>
                        <canvas
                          ref={(element) => {
                            postPreviewCanvasRefs.current[index] = element;
                          }}
                          className="h-full w-full object-cover"
                          aria-label={`画像${tile.index}のメイン分割プレビュー`}
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="m-auto grid w-full overflow-hidden rounded-base border border-primary/40 sm:grid-cols-2">
                    {tiles.map((tile, index) => (
                      <button
                        key={tile.index}
                        type="button"
                        onClick={() => setSelectedPost(tile.index)}
                        className={[
                          "relative flex items-center justify-center overflow-hidden border-primary/35 bg-transparent",
                          draft.preset === "split-2" ? "aspect-[8/9]" : "aspect-video",
                          index % 2 === 0 ? "sm:border-r" : "",
                          index < 2 ? "border-b" : "",
                          selectedPost === tile.index ? "outline outline-2 outline-primary outline-offset-[-2px]" : ""
                        ].join(" ")}
                      >
                        <span className="absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-primary/80 text-xs font-black text-white">
                          {tile.index}
                        </span>
                        <canvas
                          ref={(element) => {
                            postPreviewCanvasRefs.current[index] = element;
                          }}
                          className="aspect-video w-full max-h-full object-contain"
                          aria-label={`投稿${tile.index}のメイン分割プレビュー`}
                        />
                      </button>
                    ))}
                  </div>
                )
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-base border border-border bg-surface-muted/70 px-3 py-3 text-xs text-muted">
              <span>枠線は目安です。実際の投稿画像には含まれません。</span>
              <div className="flex items-center gap-2">
                <ToggleButton label="枠線を表示" checked={draft.config.showSeam} onChange={(checked) => updateConfig({ showSeam: checked })} />
                <ToggleButton label="グリッドを表示" checked={draft.config.showGrid} onChange={(checked) => updateConfig({ showGrid: checked })} />
              </div>
            </div>
          </section>

          <aside className={["flex-col gap-3 lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1 lg:scrollbar-accent", mobileView === "edit" ? "flex" : "hidden"].join(" ")}>
            <ControlSection>
              <SectionTitle index="1" title="入力エリア" />
              <div className="grid gap-3">
                {baseImage ? <ImagePicker image={baseImage} onChange={handleFileChange} onDropFile={handleImageFile} onRemove={setImageSource} prominent /> : null}
                <div className="rounded-base border border-border bg-surface-muted/60 p-3">
                    <p className="text-sm font-black text-foreground">追加画像スロット（{getSlotGroupLabel(draft)}）</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {visibleSlots.map((image, index) => (
                      <ImagePicker
                        key={image.id}
                        image={image}
                        index={index + 1}
                        roleLabel={getSnsSplitSlotLabel(draft.mode, index + 1, draft.preset, draft.config.joinType)}
                        mode={draft.mode}
                        onChange={handleFileChange}
                        onDropFile={handleImageFile}
                        onRemove={setImageSource}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {getSlotDescription(draft)}
                  </p>
                  <p className="mt-2 text-xs text-muted">画像は16:9推奨です。異なる比率の画像は中央基準でトリミングされます。</p>
                  <p className="mt-1 text-xs text-muted">画像処理と復元用保存はブラウザ内で完結し、外部へ送信しません。</p>
                </div>
              </div>
            </ControlSection>

            <ControlSection>
              <SectionTitle index="2" title="分割・合成設定" />
              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-2 text-xs font-black text-primary-strong">投稿{selectedPost}の中央メイン調整</p>
                  <div className="grid gap-3">
                    <RangeControl label="投稿別 X" value={selectedAdjustment.offsetX} min={-480} max={480} unit="px" onChange={(value) => updatePostAdjustment(selectedPost, { offsetX: value })} />
                    <RangeControl label="投稿別 Y" value={selectedAdjustment.offsetY} min={-480} max={480} unit="px" onChange={(value) => updatePostAdjustment(selectedPost, { offsetY: value })} />
                    <RangeControl label="投稿別 拡大率" value={selectedAdjustment.scale} min={50} max={180} unit="%" onChange={(value) => updatePostAdjustment(selectedPost, { scale: value })} />
                  </div>
                </div>
                <button type="button" onClick={resetSelectedPostAdjustment} className="flat-control min-h-11 w-full px-3 py-2 font-bold">
                  投稿{selectedPost}リセット
                </button>
                <details className="rounded-base border border-border bg-surface-muted/50">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-black text-foreground marker:hidden">
                    <span>基本分割調整</span>
                    <span className="text-xs font-bold text-muted">開く</span>
                  </summary>
                  <div className="grid gap-3 border-t border-border px-3 pb-3 pt-3 xl:grid-cols-2">
                    <RangeControl label="メイン分割 縦位置（splitY）" value={draft.config.splitY} min={10} max={90} unit="%" onChange={(value) => updateConfig({ splitY: value })} />
                    <RangeControl label="メイン分割 横位置（splitX）" value={draft.config.splitX} min={10} max={90} unit="%" onChange={(value) => updateConfig({ splitX: value })} />
                    <RangeControl label="シーム補正" value={draft.config.seamFix} min={-80} max={80} unit="px" onChange={(value) => updateConfig({ seamFix: value })} />
                    <RangeControl label="境界線の太さ" value={draft.config.seamWidth} min={0} max={32} unit="px" onChange={(value) => updateConfig({ seamWidth: value })} />
                    <RangeControl label="Xオフセット" value={draft.config.offsetX} min={-240} max={240} unit="px" onChange={(value) => updateConfig({ offsetX: value })} />
                    <RangeControl label="Yオフセット" value={draft.config.offsetY} min={-240} max={240} unit="px" onChange={(value) => updateConfig({ offsetY: value })} />
                    <div className="xl:col-span-2">
                      <RangeControl label="全体スケール" value={draft.config.scale} min={50} max={180} unit="%" onChange={(value) => updateConfig({ scale: value })} />
                    </div>
                    <label className="flex items-center gap-3 rounded-base border border-border bg-surface-muted/60 px-3 py-2 text-sm font-bold">
                      色
                      <input type="color" value={draft.config.seamColor} onChange={(event) => updateConfig({ seamColor: event.target.value })} className="h-8 w-10 rounded border border-border bg-surface" />
                      <span className="font-mono text-xs text-muted">{draft.config.seamColor.toUpperCase()}</span>
                    </label>
                    <button type="button" onClick={resetConfig} className="flat-control min-h-11 px-3 py-2 font-bold">
                      全体リセット
                    </button>
                  </div>
                </details>
              </div>
            </ControlSection>

            <ControlSection>
              <SectionTitle index="3" title="エクスポート設定" />
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                  <div>
                    <p className="mb-2 text-xs font-bold text-muted">出力形式</p>
                    <div className="flex overflow-hidden rounded-base border border-border bg-surface">
                      {(["png", "jpeg"] as SnsSplitExportFormat[]).map((format) => (
                        <button
                          key={format}
                          type="button"
                          onClick={() => updateExport({ format })}
                          className={[
                            "min-h-10 px-4 text-sm font-black uppercase",
                            draft.exportSettings.format === format ? "bg-primary text-white" : "text-muted hover:bg-surface-muted"
                          ].join(" ")}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>
                  <RangeControl label="画質" value={Math.round(draft.exportSettings.quality * 100)} min={50} max={100} unit="%" onChange={(value) => updateExport({ quality: value / 100 })} compact />
                </div>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-muted">ファイル名の形式</span>
                  <input
                    value={draft.exportSettings.filePattern}
                    onChange={(event) => updateExport({ filePattern: event.target.value })}
                    className="h-11 w-full rounded-base border border-border bg-surface px-3 text-sm font-bold text-foreground"
                  />
                  <span className="mt-1 block text-xs text-muted">{getFilePatternHint(draft.preset)}</span>
                </label>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={saveDraft} className="flat-control min-h-12 px-4 py-2 font-black">
                  下書き保存
                </button>
                <button type="button" onClick={exportTiles} disabled={!canExport} className="min-h-12 rounded-base bg-primary px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-55">
                  {exportButtonLabel}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                メイン画像: {imageStatus.baseReady ? "選択済み" : "未選択"} / 追加画像: {imageStatus.slotReady}/{imageStatus.requiredSlots}
              </p>
              <p className="mt-1 text-xs text-muted">出力はブラウザのダウンロードとして{postCount}枚の画像を保存します。</p>
            </ControlSection>
          </aside>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-[90] grid grid-cols-[1fr_1fr_1.2fr] gap-2 border-t border-border bg-surface/96 px-3 py-3 shadow-panel backdrop-blur lg:hidden" aria-label="モバイル操作">
        <button
          type="button"
          onClick={() => setMobileView("preview")}
          className={[
            "min-h-11 rounded-base border px-3 text-sm font-black",
            mobileView === "preview" ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-background text-muted"
          ].join(" ")}
        >
          プレビュー
        </button>
        <button
          type="button"
          onClick={() => setMobileView("edit")}
          className={[
            "min-h-11 rounded-base border px-3 text-sm font-black",
            mobileView === "edit" ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-background text-muted"
          ].join(" ")}
        >
          編集
        </button>
        <button type="button" onClick={exportTiles} disabled={!canExport} className="min-h-11 rounded-base bg-primary px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55">
          保存
        </button>
      </nav>

      {toast ? (
        <div className={["fixed bottom-24 left-4 right-4 z-[100] rounded-base border px-4 py-3 text-sm font-bold shadow-panel sm:left-auto sm:w-[360px] lg:bottom-4", toneClassName[toast.tone]].join(" ")}>
          <div className="flex items-center justify-between gap-3">
            <span>{toast.message}</span>
            <button type="button" className="text-muted" onClick={() => setToast(null)} aria-label="通知を閉じる">
              x
            </button>
          </div>
        </div>
      ) : null}
      <canvas ref={exportCanvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}

function SectionTitle({ index, title, description }: { index?: string; title: string; description?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {index ? <span className="grid h-6 w-6 place-items-center rounded-full border border-primary text-xs font-black text-primary-strong">{index}</span> : null}
        <h2 className="text-base font-black text-foreground">{title}</h2>
      </div>
      {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
    </div>
  );
}

function ControlSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={["panel p-4 shadow-none", className].filter(Boolean).join(" ")}>{children}</section>;
}

function ImagePicker({
  image,
  index,
  roleLabel,
  mode,
  onChange,
  onDropFile,
  onRemove,
  prominent = false
}: {
  image: SnsSplitImageSource;
  index?: number;
  roleLabel?: string;
  mode?: SnsSplitMode;
  prominent?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>, id: SnsSplitImageSource["id"]) => void;
  onDropFile: (file: File, id: SnsSplitImageSource["id"]) => void;
  onRemove: (id: SnsSplitImageSource["id"], src: string | null) => void;
}) {
  const compactSlot = !prominent;
  return (
    <div className={prominent ? "rounded-base border border-border bg-surface-muted/60 p-3" : "min-w-0"}>
      {prominent ? <p className="mb-3 text-sm font-black text-foreground">分割用メイン画像（1枚）</p> : null}
      <label
        className={[
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-base border border-dashed border-border bg-surface text-center transition hover:border-primary",
          prominent ? "min-h-36 px-3 py-5" : "aspect-video p-2"
        ].join(" ")}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) {
            onDropFile(file, image.id);
          }
        }}
      >
        {index ? <span className="absolute left-2 top-2 text-xs font-bold text-muted">{index}</span> : null}
        {roleLabel ? (
          <span className="absolute bottom-1 left-1 right-1 z-10 rounded bg-background/86 px-1 py-1 text-[9px] font-black leading-tight text-foreground">
            {roleLabel}
          </span>
        ) : null}
        {image.src ? (
          <span className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url("${image.src}")` }} aria-hidden="true" />
        ) : (
          <>
            <span className="text-2xl text-muted">{prominent ? "⇩" : "▧"}</span>
            <span className={["font-black text-foreground", compactSlot ? "mt-1 text-[10px]" : "mt-2 text-xs"].join(" ")}>{prominent ? "画像を選択" : "+"}</span>
            {prominent ? <span className="mt-1 text-xs text-muted">またはドラッグ&ドロップ</span> : null}
          </>
        )}
        <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => onChange(event, image.id)} />
      </label>
      {image.src ? (
        <button type="button" onClick={() => onRemove(image.id, null)} className="mt-2 text-xs font-bold text-muted hover:text-primary-strong">
          画像を外す
        </button>
      ) : null}
      {prominent ? <p className="mt-3 text-xs text-muted">推奨: 16:9（例: 1920x1080）。解像度違いは自動で拡大縮小します。</p> : null}
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  unit,
  onChange,
  compact = false
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  compact?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={["block rounded-base border border-border bg-surface-muted/60 px-3 py-2", compact ? "" : ""].join(" ")}>
      <span className="mb-2 block text-xs font-bold text-muted">{label}</span>
      <span className="flex items-center gap-3">
        <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 accent-primary" />
        <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-9 w-16 rounded-base border border-border bg-surface px-2 text-right text-sm font-bold" />
        <span className="w-7 text-xs text-muted">{unit}</span>
      </span>
    </label>
  );
}

function ToggleButton({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={["rounded-base border px-3 py-2 text-xs font-bold", checked ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface text-muted"].join(" ")}>
      {label}
    </button>
  );
}
