"use client";

import { useEffect, useRef } from "react";
import {
  splitLivePromptTextPhrases,
  type LiveModeView
} from "@/lib/viewer-engagement-prompt-board-live-mode";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

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
  const copy = useViewerEngagementPromptBoardCopy();
  return (
    <div className="min-w-0" data-live-prompt-detail={view.currentCard.id}>
      <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border bg-primary-soft/50 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-base border border-primary/30 bg-surface px-2 py-1 text-xs font-black text-primary-strong">
              {copy.category[view.currentCard.category]}
            </span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-black text-slate-950">
              {copy.segment[view.currentCard.segment]}
            </span>
          </div>
          <h3 id="live-prompt-detail-title" className="mt-3 break-words text-lg font-black text-foreground [word-break:auto-phrase]">
            {copy.liveDetail.title}
          </h3>
          <p className="mt-1 text-sm font-bold text-muted" aria-live="polite" aria-atomic="true">
            {view.currentIndex + 1} / {view.total} · {copy.category[view.currentCard.category]}
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
            <p className="font-black">{copy.liveDetail.safetyNotes}</p>
            <p className="mt-1 whitespace-pre-wrap break-words leading-6 [overflow-wrap:anywhere] [word-break:auto-phrase]">
              {view.currentCard.safetyNotes}
            </p>
          </aside>
        )}
      </div>

      <div className="grid gap-3 border-t border-border bg-surface-muted/60 px-4 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-6" aria-label={copy.liveDetail.controlsLabel}>
        <button
          type="button"
          className="flat-control min-h-12 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!view.canPrevious}
          onClick={() => onMove("previous")}
        >
          {copy.liveDetail.previous}
        </button>
        <button type="button" className="min-h-12 rounded-base bg-primary px-5 py-3 text-sm font-black text-slate-950 hover:bg-primary-strong" onClick={onCopy}>
          {copy.liveDetail.copy}
        </button>
        <button
          type="button"
          className="flat-control min-h-12 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!view.canNext}
          onClick={() => onMove("next")}
        >
          {copy.liveDetail.next}
        </button>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {copy.liveDetail.promptPosition(copy.category[view.currentCard.category], view.currentIndex + 1, view.total)}
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
  const copy = useViewerEngagementPromptBoardCopy();
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    detailRef.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div ref={detailRef} className="mt-3 scroll-mt-44 overflow-hidden rounded-base border border-primary/30 bg-surface shadow-panel" id="mobile-live-prompt-detail">
      <LivePromptDetailContent {...props} closeLabel={copy.liveDetail.back} focusCloseOnMount={false} />
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
  const copy = useViewerEngagementPromptBoardCopy();
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
        closeLabel={copy.liveDetail.close}
        focusCloseOnMount={true}
        onClose={onClose}
        onMove={onMove}
        onCopy={onCopy}
      />
    </dialog>
  );
}
