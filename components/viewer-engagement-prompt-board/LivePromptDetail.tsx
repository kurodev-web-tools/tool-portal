"use client";

import { useEffect, useRef } from "react";
import {
  splitLivePromptTextPhrases,
  type LiveModeView
} from "@/lib/viewer-engagement-prompt-board-live-mode";
import type {
  PromptCardCategory,
  PromptCardSegment
} from "@/lib/viewer-engagement-prompt-board-storage";

export const livePromptCategoryLabels: Readonly<Record<PromptCardCategory, string>> = {
  "talking-point": "トークポイント",
  question: "質問",
  announcement: "お知らせ",
  reminder: "注意・確認",
  other: "その他"
};

export const livePromptSegmentLabels: Readonly<Record<PromptCardSegment, string>> = {
  opening: "オープニング",
  main: "本編",
  intermission: "中休み",
  closing: "クロージング",
  anytime: "いつでも"
};

export type LivePromptCopyNotice = Readonly<{
  kind: "success" | "error";
  message: string;
}> | null;

type ReadyLiveModeView = Extract<LiveModeView, { readonly kind: "ready" }>;

export function LivePromptPhraseText({ text }: { readonly text: string }) {
  return splitLivePromptTextPhrases(text).map((phrase, index) => /^\s+$/.test(phrase)
    ? phrase
    : (
      <span
        key={`${index}-${phrase}`}
        className={phrase.length <= 14 ? "inline-block whitespace-nowrap" : "[overflow-wrap:anywhere]"}
      >
        {phrase}
      </span>
    ));
}

function LivePromptDetailContent({
  view,
  copyNotice,
  closeLabel,
  focusCloseOnMount,
  onClose,
  onMove,
  onCopy
}: {
  readonly view: ReadyLiveModeView;
  readonly copyNotice: LivePromptCopyNotice;
  readonly closeLabel: string;
  readonly focusCloseOnMount: boolean;
  readonly onClose: () => void;
  readonly onMove: (direction: "previous" | "next") => void;
  readonly onCopy: () => void;
}) {
  return (
    <div className="min-w-0" data-live-prompt-detail={view.currentCard.id}>
      <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border bg-primary-soft/50 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-base border border-primary/30 bg-surface px-2 py-1 text-xs font-black text-primary-strong">
              {livePromptCategoryLabels[view.currentCard.category]}
            </span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-black text-slate-950">
              {livePromptSegmentLabels[view.currentCard.segment]}
            </span>
          </div>
          <h3 id="live-prompt-detail-title" className="mt-3 break-words text-lg font-black text-foreground [word-break:auto-phrase]">
            カンペ詳細
          </h3>
          <p className="mt-1 text-sm font-bold text-muted" aria-live="polite" aria-atomic="true">
            {view.currentIndex + 1} / {view.total} · {livePromptCategoryLabels[view.currentCard.category]}
          </p>
        </div>
        <button
          type="button"
          className="flat-control min-h-11 shrink-0 px-3 py-2 font-black"
          onClick={onClose}
          autoFocus={focusCloseOnMount}
        >
          {closeLabel}
        </button>
      </div>

      <div className="max-h-[min(62dvh,38rem)] overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <p className="whitespace-pre-wrap break-words text-pretty text-2xl font-black leading-relaxed text-foreground [overflow-wrap:anywhere] [word-break:auto-phrase] sm:text-3xl">
          <LivePromptPhraseText text={view.currentCard.body} />
        </p>
        {view.currentCard.safetyNotes.length === 0 ? null : (
          <aside className="mt-6 rounded-base border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-black">注意メモ</p>
            <p className="mt-1 whitespace-pre-wrap break-words leading-6 [overflow-wrap:anywhere] [word-break:auto-phrase]">
              {view.currentCard.safetyNotes}
            </p>
          </aside>
        )}
      </div>

      <div className="grid gap-3 border-t border-border bg-surface-muted/60 px-4 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-6" aria-label="カテゴリ内のカンペ操作">
        <button
          type="button"
          className="flat-control min-h-12 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!view.canPrevious}
          onClick={() => onMove("previous")}
        >
          前のカンペ
        </button>
        <button type="button" className="min-h-12 rounded-base bg-primary px-5 py-3 text-sm font-black text-slate-950 hover:bg-primary-strong" onClick={onCopy}>
          本文をコピー
        </button>
        <button
          type="button"
          className="flat-control min-h-12 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!view.canNext}
          onClick={() => onMove("next")}
        >
          次のカンペ
        </button>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {livePromptCategoryLabels[view.currentCard.category]}の{view.currentIndex + 1}枚目、全{view.total}枚
      </p>
      {copyNotice === null ? null : (
        <p
          role={copyNotice.kind === "error" ? "alert" : "status"}
          className={copyNotice.kind === "error" ? "border-t border-border px-4 py-3 text-sm font-bold text-red-700 dark:text-red-200 sm:px-6" : "border-t border-border px-4 py-3 text-sm font-bold text-primary-strong sm:px-6"}
        >
          {copyNotice.message}
        </p>
      )}
    </div>
  );
}

export function LivePromptInlineDetail(props: Omit<Parameters<typeof LivePromptDetailContent>[0], "closeLabel" | "focusCloseOnMount">) {
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    detailRef.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div ref={detailRef} className="mt-3 scroll-mt-44 overflow-hidden rounded-base border border-primary/30 bg-surface shadow-panel" id="mobile-live-prompt-detail">
      <LivePromptDetailContent {...props} closeLabel="一覧に戻る" focusCloseOnMount={false} />
    </div>
  );
}

export function LivePromptDetailDialog({
  view,
  copyNotice,
  onClose,
  onMove,
  onCopy
}: Omit<Parameters<typeof LivePromptDetailContent>[0], "closeLabel" | "focusCloseOnMount">) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] overflow-hidden rounded-base border border-border bg-surface p-0 text-foreground shadow-panel backdrop:bg-slate-950/70"
      aria-labelledby="live-prompt-detail-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <LivePromptDetailContent
        view={view}
        copyNotice={copyNotice}
        closeLabel="閉じる"
        focusCloseOnMount={true}
        onClose={onClose}
        onMove={onMove}
        onCopy={onCopy}
      />
    </dialog>
  );
}
