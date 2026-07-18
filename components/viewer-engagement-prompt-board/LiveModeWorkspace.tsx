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

function getCopyNotice(result: LiveModeCopyResult): LivePromptCopyNotice {
  if (result.ok) {
    return { kind: "success", message: "カンペ本文をコピーしました。" };
  }
  return result.reason === "clipboard-unavailable"
    ? { kind: "error", message: "このブラウザではコピー機能を利用できません。本文を選択してコピーしてください。" }
    : { kind: "error", message: "コピーできませんでした。ブラウザの権限設定を確認してください。" };
}

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
        <p className="text-xs font-black uppercase tracking-wide text-primary-strong">配信中</p>
        <h3 className="mt-2 text-xl font-black text-foreground [word-break:auto-phrase]">現在の配信はありません</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted [word-break:auto-phrase]">配信プランを「現在の配信」に切り替えると、ここでカンペをカテゴリ別に表示できます。</p>
        <button type="button" className="mt-5 min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950" onClick={onShowPlans}>配信プランへ</button>
      </section>
    );
  }

  if (view.kind === "empty") {
    return (
      <section className="panel min-w-0 px-4 py-12 text-center sm:px-6" data-live-mode-state="empty">
        <p className="text-xs font-black uppercase tracking-wide text-primary-strong">現在の配信</p>
        <h3 className="mx-auto mt-2 max-w-2xl break-words text-xl font-black text-foreground [word-break:auto-phrase]">{view.plan.title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted [word-break:auto-phrase]">この配信プランにはカンペがありません。カンペ編集で最初の1枚を追加してください。</p>
        <button type="button" className="mt-5 min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950" onClick={() => onEditCards(view.plan.id)}>このプランのカンペを編集</button>
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
    setCopyNotice(getCopyNotice(await copyLivePromptCardBody(view.currentCard.body, clipboard)));
  };

  return (
    <div className="grid min-w-0 gap-5" data-live-mode-state="ready">
      <section className="panel min-w-0 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-primary-strong">現在の配信</p>
            <h3 className="mt-1 break-words text-xl font-black text-foreground [word-break:auto-phrase]">{view.plan.title}</h3>
            <p className="mt-2 text-sm text-muted [word-break:auto-phrase]">カテゴリからカンペを選び、全文と同じカテゴリ内の前後を確認できます。</p>
          </div>
          <button type="button" className="min-h-11 rounded-base border border-border bg-surface px-4 py-2 text-sm font-black text-foreground hover:border-primary" onClick={() => onEditCards(view.plan.id)}>カンペ編集へ戻る</button>
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
