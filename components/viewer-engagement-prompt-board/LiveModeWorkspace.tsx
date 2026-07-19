"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LiveModeBoard } from "@/components/viewer-engagement-prompt-board/LiveModeBoard";
import type { LivePromptCopyNotice } from "@/components/viewer-engagement-prompt-board/LivePromptDetail";
import {
  copyLivePromptCardBody,
  moveLiveModeSelection,
  resolveLiveModeView,
  selectLiveModeCard,
  type LiveModeCopyResult,
  type LiveModeSelection
} from "@/lib/viewer-engagement-prompt-board-live-mode";
import { orderPromptCardsForDisplay } from "@/lib/viewer-engagement-prompt-board-prompt-cards";
import type { PromptBoardData } from "@/lib/viewer-engagement-prompt-board-storage";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

function useDesktopLiveDetail(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return desktop;
}

export function LiveModeWorkspace({
  data,
  onShowPlans,
  onEditCards
}: {
  readonly data: PromptBoardData;
  readonly onShowPlans: () => void;
  readonly onEditCards: (planId: string) => void;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  const [selection, setSelection] = useState<LiveModeSelection>(null);
  const [copyNotice, setCopyNotice] = useState<LivePromptCopyNotice>(null);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const desktopDetail = useDesktopLiveDetail();
  const view = useMemo(
    () => resolveLiveModeView(data, selection, orderPromptCardsForDisplay),
    [data, selection]
  );

  useEffect(() => {
    if (view.kind === "ready" && selection !== null && (
      selection.cardId !== view.currentCard.id ||
      selection.category !== view.currentCard.category ||
      selection.index !== view.currentIndex
    )) {
      setSelection(selectLiveModeCard(view, view.currentCard.id));
    }
    if (view.kind !== "ready" && selection !== null) {
      setSelection(null);
    }
  }, [selection, view]);

  if (view.kind === "no-live") {
    return (
      <section className="panel min-w-0 px-4 py-12 text-center sm:px-6" data-live-mode-state="no-live">
        <p className="text-xs font-black uppercase tracking-wide text-primary-strong">{copy.liveWorkspace.live}</p>
        <h3 className="mt-2 text-xl font-black text-foreground [word-break:auto-phrase]">{copy.liveWorkspace.noCurrentTitle}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted [word-break:auto-phrase]">{copy.liveWorkspace.noCurrentDescription}</p>
        <button type="button" className="mt-5 min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950" onClick={onShowPlans}>{copy.liveWorkspace.plans}</button>
      </section>
    );
  }

  if (view.kind === "empty") {
    return (
      <section className="panel min-w-0 px-4 py-12 text-center sm:px-6" data-live-mode-state="empty">
        <p className="text-xs font-black uppercase tracking-wide text-primary-strong">{copy.liveWorkspace.current}</p>
        <h3 className="mx-auto mt-2 max-w-2xl break-words text-xl font-black text-foreground [word-break:auto-phrase]">{view.plan.title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted [word-break:auto-phrase]">{copy.liveWorkspace.noCardsDescription}</p>
        <button type="button" className="mt-5 min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950" onClick={() => onEditCards(view.plan.id)}>{copy.liveWorkspace.editThisPlan}</button>
      </section>
    );
  }

  const closeDetail = () => {
    setSelection(null);
    setCopyNotice(null);
    requestAnimationFrame(() => detailTriggerRef.current?.focus());
  };
  const move = (direction: "previous" | "next") => {
    setSelection(moveLiveModeSelection(view, direction));
    setCopyNotice(null);
  };
  const copyCurrentCard = async () => {
    const clipboard = navigator.clipboard === undefined ? null : navigator.clipboard;
    const result: LiveModeCopyResult = await copyLivePromptCardBody(view.currentCard.body, clipboard);
    setCopyNotice(result.ok
      ? { kind: "success", message: copy.liveWorkspace.copied }
      : result.reason === "clipboard-unavailable"
        ? { kind: "error", message: copy.liveWorkspace.clipboardUnavailable }
        : { kind: "error", message: copy.liveWorkspace.copyFailed });
  };

  return (
    <div className="grid min-w-0 gap-5" data-live-mode-state="ready">
      <section className="panel min-w-0 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-primary-strong">{copy.liveWorkspace.current}</p>
            <h3 className="mt-1 break-words text-xl font-black text-foreground [word-break:auto-phrase]">{view.plan.title}</h3>
            <p className="mt-2 text-sm text-muted [word-break:auto-phrase]">{copy.liveWorkspace.description}</p>
          </div>
          <button type="button" className="min-h-11 rounded-base border border-border bg-surface px-4 py-2 text-sm font-black text-foreground hover:border-primary" onClick={() => onEditCards(view.plan.id)}>{copy.liveWorkspace.backToEdit}</button>
        </div>
      </section>

      <LiveModeBoard
        view={view}
        detailOpen={selection !== null}
        desktopDetail={desktopDetail}
        copyNotice={copyNotice}
        onSelectCard={(cardId, trigger) => {
          detailTriggerRef.current = trigger;
          setSelection(selectLiveModeCard(view, cardId));
          setCopyNotice(null);
        }}
        onClearSelection={() => {
          setSelection(null);
          setCopyNotice(null);
        }}
        onCloseDetail={closeDetail}
        onMove={move}
        onCopy={copyCurrentCard}
      />
    </div>
  );
}
