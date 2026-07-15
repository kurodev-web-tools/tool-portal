"use client";

import { useEffect, useMemo, useState } from "react";
import {
  copyLivePromptCardBody,
  moveLiveModeSelection,
  resolveLiveModeView,
  type LiveModeCopyResult,
  type LiveModeSelection
} from "@/lib/viewer-engagement-prompt-board-live-mode";
import { orderPromptCardsForDisplay } from "@/lib/viewer-engagement-prompt-board-prompt-cards";
import type { PromptBoardData } from "@/lib/viewer-engagement-prompt-board-storage";

type CopyNotice = Readonly<{ kind: "success" | "error"; message: string }> | null;

function getCopyNotice(result: LiveModeCopyResult): CopyNotice {
  if (result.ok) {
    return { kind: "success", message: "カンペ本文をコピーしました。" };
  }
  return result.reason === "clipboard-unavailable"
    ? { kind: "error", message: "このブラウザではコピー機能を利用できません。本文を選択してコピーしてください。" }
    : { kind: "error", message: "コピーできませんでした。ブラウザの権限設定を確認してください。" };
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
  const [copyNotice, setCopyNotice] = useState<CopyNotice>(null);
  const view = useMemo(
    () => resolveLiveModeView(data, selection, orderPromptCardsForDisplay),
    [data, selection]
  );

  useEffect(() => {
    if (view.kind === "ready" && (
      selection === null ||
      selection.cardId !== view.currentCard.id ||
      selection.index !== view.currentIndex
    )) {
      setSelection({ cardId: view.currentCard.id, index: view.currentIndex });
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
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted [word-break:auto-phrase]">配信プランを「現在の配信」に切り替えると、ここでカンペを順番に表示できます。</p>
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

  const move = (direction: "previous" | "next") => {
    setSelection(moveLiveModeSelection(view, direction));
    setCopyNotice(null);
  };

  const copyCurrentCard = async () => {
    const clipboard = typeof navigator === "undefined" || navigator.clipboard === undefined
      ? null
      : navigator.clipboard;
    setCopyNotice(getCopyNotice(await copyLivePromptCardBody(view.currentCard.body, clipboard)));
  };

  return (
    <div className="grid min-w-0 gap-5" data-live-mode-state="ready">
      <section className="panel min-w-0 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-primary-strong">現在の配信</p>
            <h3 className="mt-1 break-words text-xl font-black text-foreground [word-break:auto-phrase]">{view.plan.title}</h3>
          </div>
          <button type="button" className="min-h-11 rounded-base border border-border bg-surface px-4 py-2 text-sm font-black text-foreground hover:border-primary" onClick={() => onEditCards(view.plan.id)}>カンペ編集へ戻る</button>
        </div>
      </section>

      <section className="panel min-w-0 overflow-hidden border-primary/30" aria-labelledby="current-live-prompt-title">
        <div className="border-b border-border bg-primary-soft/50 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="current-live-prompt-title" className="text-sm font-black text-primary-strong">現在のカンペ</h3>
            <p className="rounded-full bg-surface px-3 py-1 text-sm font-black text-foreground" aria-live="polite" aria-atomic="true">{view.currentIndex + 1} / {view.total}</p>
          </div>
        </div>
        <div className="px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          <p className="whitespace-pre-wrap break-words text-balance text-2xl font-black leading-relaxed text-foreground [overflow-wrap:anywhere] [word-break:auto-phrase] sm:text-3xl lg:text-4xl">{view.currentCard.body}</p>
          {view.currentCard.safetyNotes.length === 0 ? null : (
            <aside className="mt-8 rounded-base border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-black">注意メモ</p>
              <p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:auto-phrase]">{view.currentCard.safetyNotes}</p>
            </aside>
          )}
        </div>
      </section>

      <section className="panel min-w-0 p-4 sm:p-5" aria-label="カンペ操作">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <button type="button" className="min-h-12 rounded-base border border-border bg-surface px-4 py-3 text-sm font-black text-foreground enabled:hover:border-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!view.canPrevious} onClick={() => move("previous")}>前のカンペ</button>
          <button type="button" className="min-h-12 rounded-base bg-primary px-5 py-3 text-sm font-black text-slate-950 hover:bg-primary-strong" onClick={copyCurrentCard}>本文をコピー</button>
          <button type="button" className="min-h-12 rounded-base border border-border bg-surface px-4 py-3 text-sm font-black text-foreground enabled:hover:border-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!view.canNext} onClick={() => move("next")}>次のカンペ</button>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">{view.currentIndex + 1}枚目、全{view.total}枚</p>
        {copyNotice === null ? null : (
          <p role={copyNotice.kind === "error" ? "alert" : "status"} className={copyNotice.kind === "error" ? "mt-3 text-sm font-bold text-red-700 dark:text-red-200" : "mt-3 text-sm font-bold text-primary-strong"}>{copyNotice.message}</p>
        )}
      </section>
    </div>
  );
}
