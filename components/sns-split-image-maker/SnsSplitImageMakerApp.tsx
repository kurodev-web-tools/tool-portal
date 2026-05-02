"use client";

import { ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  countReadySnsSplitImages,
  createSnsSplitDraft,
  createSnsSplitFileName,
  defaultSnsSplitConfig,
  drawSnsSplitComposite,
  drawSnsSplitTile,
  getRequiredSlotCount,
  getSnsSplitSlotLabel,
  getSnsSplitTiles,
  normalizeSnsSplitDraft,
  snsSplitDraftStorageKey,
  type SnsSplitConfig,
  type SnsSplitDraft,
  type SnsSplitExportFormat,
  type SnsSplitImageSource,
  type SnsSplitMode
} from "@/lib/sns-split-image-maker";

type ToastTone = "info" | "success" | "warning" | "error";
type ToastState = { tone: ToastTone; message: string } | null;
type MobilePanel = "input" | "settings" | "export";

const modeOptions: { id: SnsSplitMode; label: string; note: string }[] = [
  { id: "concatenate", label: "1+8連結", note: "投稿ごとに上部/下部の追加画像でメイン分割を挟みます" },
  { id: "replace", label: "1+4差し替え", note: "各投稿のフレーム中央にメイン分割を差し込みます" }
];
const mobilePanels: { id: MobilePanel; label: string }[] = [
  { id: "input", label: "素材" },
  { id: "settings", label: "調整" },
  { id: "export", label: "出力" }
];
const allowedImageMimeTypes = new Set(["image/png", "image/jpeg"]);
const allowedImageExtensions = new Set(["png", "jpg", "jpeg"]);
const imageUploadMaxBytes = 12 * 1024 * 1024;
const toneClassName: Record<ToastTone, string> = {
  info: "border-sky-400/60 bg-sky-500/12",
  success: "border-emerald-400/60 bg-emerald-500/12",
  warning: "border-amber-400/60 bg-amber-500/12",
  error: "border-rose-400/60 bg-rose-500/12"
};

const isValidImageFile = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return allowedImageMimeTypes.has(file.type) && allowedImageExtensions.has(extension);
};
const readImageFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!isValidImageFile(file)) {
      reject(new Error("PNGまたはJPEG画像を選択してください。"));
      return;
    }
    if (file.size > imageUploadMaxBytes) {
      reject(new Error("画像は12MB以下にしてください。"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("画像を読み込めませんでした。")));
    reader.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });

export function SnsSplitImageMakerApp() {
  const [draft, setDraft] = useState<SnsSplitDraft>(() => createSnsSplitDraft());
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("input");
  const tileCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const tiles = useMemo(() => getSnsSplitTiles(draft.config), [draft.config]);
  const imageStatus = useMemo(() => countReadySnsSplitImages(draft), [draft]);
  const visibleSlots = useMemo(
    () => draft.images.filter((image) => image.id !== "base").slice(0, getRequiredSlotCount(draft.mode)),
    [draft.images, draft.mode]
  );
  const baseImage = draft.images.find((image) => image.id === "base") ?? null;
  const canExport = imageStatus.baseReady;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(snsSplitDraftStorageKey);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw);
      const normalized = normalizeSnsSplitDraft(parsed);
      if (!normalized) {
        localStorage.removeItem(snsSplitDraftStorageKey);
        setToast({ tone: "warning", message: "保存データを復元できなかったため初期状態で開始しました。" });
        setHydrated(true);
        return;
      }
      setDraft(normalized);
      setToast({ tone: "success", message: "前回の作業状態を復元しました。" });
    } catch {
      localStorage.removeItem(snsSplitDraftStorageKey);
      setToast({ tone: "warning", message: "保存データが破損していたため安全に初期化しました。" });
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const normalized = normalizeSnsSplitDraft({ ...draft, updatedAt: new Date().toISOString() });
    if (!normalized) {
      return;
    }
    localStorage.setItem(snsSplitDraftStorageKey, JSON.stringify(normalized));
  }, [draft, hydrated]);

  const renderPreviews = useCallback(async () => {
    const snapshot = draft;
    try {
      await Promise.all(
        tiles.map((tile, index) => {
          const canvas = tileCanvasRefs.current[index];
          return canvas ? drawSnsSplitTile(canvas, snapshot, tile, { includeGuides: snapshot.config.showSeam || snapshot.config.showGrid }) : Promise.resolve();
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
  }, [draft, tiles]);

  useEffect(() => {
    void renderPreviews();
  }, [renderPreviews]);

  const updateDraft = (updater: (current: SnsSplitDraft) => SnsSplitDraft) => {
    setDraft((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
  };
  const updateConfig = (partial: Partial<SnsSplitConfig>) => {
    updateDraft((current) => ({ ...current, config: { ...current.config, ...partial } }));
  };
  const updateExport = (partial: Partial<SnsSplitDraft["exportSettings"]>) => {
    updateDraft((current) => ({ ...current, exportSettings: { ...current.exportSettings, ...partial } }));
  };
  const switchMode = (mode: SnsSplitMode) => {
    updateDraft((current) => {
      const next = createSnsSplitDraft(mode);
      const imageById = new Map(current.images.map((image) => [image.id, image.src]));
      return {
        ...next,
        config: current.config,
        exportSettings: current.exportSettings,
        images: next.images.map((image) => ({ ...image, src: imageById.get(image.id) ?? null }))
      };
    });
    setToast({ tone: "info", message: mode === "concatenate" ? "1+8連結モードに切り替えました。" : "1+4差し替えモードに切り替えました。" });
  };
  const setImageSource = (id: SnsSplitImageSource["id"], src: string | null) => {
    updateDraft((current) => ({
      ...current,
      images: current.images.map((image) => (image.id === id ? { ...image, src } : image))
    }));
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
    updateConfig({ ...defaultSnsSplitConfig });
    setToast({ tone: "info", message: "分割・合成設定をリセットしました。" });
  };
  const saveDraft = () => {
    const normalized = normalizeSnsSplitDraft({ ...draft, updatedAt: new Date().toISOString() });
    if (!normalized) {
      setToast({ tone: "error", message: "下書き保存用のデータを正規化できませんでした。" });
      return;
    }
    localStorage.setItem(snsSplitDraftStorageKey, JSON.stringify(normalized));
    setToast({ tone: "success", message: "作業状態を保存しました。" });
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
      setToast({ tone: "success", message: "投稿順1→4で4枚を書き出しました。" });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "画像の書き出しに失敗しました。" });
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background/72 text-foreground scrollbar-accent">
      <div className="mx-auto flex min-h-full w-full max-w-[1640px] flex-col gap-4 px-4 py-4 lg:px-5 xl:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary-strong">画像・デザイン</p>
            <h1 className="truncate text-xl font-black tracking-tight text-foreground lg:text-2xl">SNS分割画像メーカー</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="flat-control px-3 py-2 text-xs font-bold" disabled>
              ? 使い方
            </button>
            <button type="button" onClick={saveDraft} className="flat-control hidden px-4 py-2 text-xs font-bold sm:inline-flex">
              下書き保存
            </button>
            <button type="button" onClick={exportTiles} className="rounded-base bg-primary px-4 py-2 text-sm font-black text-white shadow-panel disabled:cursor-not-allowed disabled:opacity-55" disabled={!canExport}>
              画像を保存
            </button>
          </div>
        </header>

        <section className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black">モード</span>
            <div className="flex overflow-hidden rounded-base border border-border bg-surface">
              {modeOptions.map((mode) => (
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
          <label className="flex items-center gap-2 text-sm font-black">
            最終比率
            <select className="flat-control h-10 px-4 font-bold" value={draft.aspectRatio} disabled>
              <option>16:27</option>
            </select>
          </label>
          <div className="ml-auto hidden items-center gap-2 rounded-base border border-border bg-surface px-3 py-2 text-xs text-muted lg:flex">
            <span className="font-bold text-primary-strong">投稿順</span>
            <span>1 → 2 → 3 → 4</span>
          </div>
        </section>

        <main className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,43%)] xl:grid-cols-[minmax(0,1fr)_minmax(440px,45%)]">
          <section className="panel flex min-h-[560px] flex-col gap-4 p-4 shadow-none">
            <SectionTitle index="1" title="投稿前最終確認（投稿順）" description="16:27の投稿画像を、Xに投稿する順番で表示しています（1→2→3→4）" />
            <div className="grid flex-1 grid-cols-2 gap-2 sm:gap-3">
              {tiles.map((tile, index) => (
                <div key={tile.index} className="relative aspect-[16/27] min-h-[260px] overflow-hidden rounded-base border border-primary/40 bg-surface-muted sm:min-h-[340px]">
                  <span className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-primary/80 text-lg font-black text-white">
                    {tile.index}
                  </span>
                  <canvas
                    ref={(element) => {
                      tileCanvasRefs.current[index] = element;
                    }}
                    className="h-full w-full object-cover"
                    aria-label={`投稿順${tile.index}の分割後プレビュー`}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-base border border-border bg-surface-muted/70 px-3 py-3 text-xs text-muted">
              <span>枠線は目安です。実際の投稿画像には含まれません。</span>
              <div className="flex items-center gap-2">
                <ToggleButton label="枠線を表示" checked={draft.config.showSeam} onChange={(checked) => updateConfig({ showSeam: checked })} />
                <ToggleButton label="グリッドを表示" checked={draft.config.showGrid} onChange={(checked) => updateConfig({ showGrid: checked })} />
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-3">
            <div className="lg:hidden">
              <div className="grid grid-cols-3 overflow-hidden rounded-base border border-border bg-surface">
                {mobilePanels.map((panel) => (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={() => setMobilePanel(panel.id)}
                    className={[
                      "min-h-10 text-sm font-black",
                      mobilePanel === panel.id ? "bg-primary text-white" : "text-muted"
                    ].join(" ")}
                  >
                    {panel.label}
                  </button>
                ))}
              </div>
            </div>

            <ControlSection className={mobilePanel === "input" ? "" : "hidden lg:block"}>
              <SectionTitle index="2" title="入力エリア" />
              <div className="grid gap-3 xl:grid-cols-[1fr_1.45fr]">
                {baseImage ? <ImagePicker image={baseImage} onChange={handleFileChange} onDropFile={handleImageFile} onRemove={setImageSource} prominent /> : null}
                <div className="rounded-base border border-border bg-surface-muted/60 p-3">
                  <p className="text-sm font-black text-foreground">追加画像スロット（{draft.mode === "concatenate" ? "投稿別の上部/下部" : "投稿別フレーム"}）</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    {visibleSlots.map((image, index) => (
                      <ImagePicker
                        key={image.id}
                        image={image}
                        index={index + 1}
                        roleLabel={getSnsSplitSlotLabel(draft.mode, index + 1)}
                        mode={draft.mode}
                        onChange={handleFileChange}
                        onDropFile={handleImageFile}
                        onRemove={setImageSource}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {draft.mode === "concatenate"
                      ? "1+8連結では、各投稿を「追加画像（上）/ メイン分割 / 追加画像（下）」で作成します。"
                      : "1+4差し替えでは、各フレーム画像の中央1/3へメイン分割を差し込みます。"}
                  </p>
                </div>
              </div>
            </ControlSection>

            <ControlSection>
              <SectionTitle index="3" title="4枚投稿の並び確認" description="投稿1〜4を2x2で並べた補助確認です" />
              <div className="overflow-hidden rounded-base border border-primary/40 bg-surface-muted">
                <canvas ref={compositeCanvasRef} className="aspect-[16/27] w-full" aria-label="4枚投稿の並び確認" />
              </div>
            </ControlSection>

            <ControlSection className={mobilePanel === "settings" ? "" : "hidden lg:block"}>
              <SectionTitle index="4" title="分割・合成設定" />
              <div className="grid gap-3 xl:grid-cols-2">
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
                  リセット
                </button>
              </div>
            </ControlSection>

            <ControlSection className={mobilePanel === "export" ? "" : "hidden lg:block"}>
              <SectionTitle index="5" title="エクスポート設定" />
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] xl:grid-cols-[auto_1fr_1.1fr]">
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
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-muted">ファイル名の形式</span>
                  <input
                    value={draft.exportSettings.filePattern}
                    onChange={(event) => updateExport({ filePattern: event.target.value })}
                    className="h-11 w-full rounded-base border border-border bg-surface px-3 text-sm font-bold text-foreground"
                  />
                  <span className="mt-1 block text-xs text-muted">{"{n}: 1〜4、{nn}: 01〜04"}</span>
                </label>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={saveDraft} className="flat-control min-h-12 px-4 py-2 font-black">
                  下書き保存
                </button>
                <button type="button" onClick={exportTiles} disabled={!canExport} className="min-h-12 rounded-base bg-primary px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-55">
                  画像を出力（4枚）
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                メイン画像: {imageStatus.baseReady ? "選択済み" : "未選択"} / 追加画像: {imageStatus.slotReady}/{imageStatus.requiredSlots}
              </p>
            </ControlSection>
          </aside>
        </main>
      </div>

      {toast ? (
        <div className={["fixed bottom-4 left-4 right-4 z-[100] rounded-base border px-4 py-3 text-sm font-bold shadow-panel sm:left-auto sm:w-[360px]", toneClassName[toast.tone]].join(" ")}>
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

function SectionTitle({ index, title, description }: { index: string; title: string; description?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-primary text-xs font-black text-primary-strong">{index}</span>
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
  return (
    <div className={prominent ? "rounded-base border border-border bg-surface-muted/60 p-3" : "min-w-0"}>
      {prominent ? <p className="mb-3 text-sm font-black text-foreground">分割用メイン画像（1枚）</p> : null}
      <label
        className={[
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-base border border-dashed border-border bg-surface text-center transition hover:border-primary",
          prominent ? "min-h-36 px-3 py-5" : mode === "replace" ? "aspect-[16/27] p-2" : "aspect-video p-2"
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
          <span className="absolute bottom-1 left-1 right-1 z-10 rounded bg-background/86 px-1 py-1 text-[10px] font-black leading-tight text-foreground">
            {roleLabel}
          </span>
        ) : null}
        {image.src ? (
          <span className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url("${image.src}")` }} aria-hidden="true" />
        ) : (
          <>
            <span className="text-2xl text-muted">{prominent ? "⇩" : "▧"}</span>
            <span className="mt-2 text-xs font-black text-foreground">{prominent ? "画像を選択" : "+"}</span>
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
      {prominent ? <p className="mt-3 text-xs text-muted">推奨: 16:9（例: 1920x1080）</p> : null}
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
