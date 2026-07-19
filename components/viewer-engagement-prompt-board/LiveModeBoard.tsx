"use client";

import { useEffect, useState } from "react";
import {
  LivePromptDetailDialog,
  LivePromptInlineDetail,
  LivePromptPhraseText,
  type LivePromptCopyNotice
} from "@/components/viewer-engagement-prompt-board/LivePromptDetail";
import {
  summarizeLivePromptCardBody,
  type LiveModeView
} from "@/lib/viewer-engagement-prompt-board-live-mode";
import type { PromptCardCategory } from "@/lib/viewer-engagement-prompt-board-storage";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

type ReadyLiveModeView = Extract<LiveModeView, { readonly kind: "ready" }>;

export function LiveModeBoard({
  view,
  detailOpen,
  desktopDetail,
  copyNotice,
  onSelectCard,
  onClearSelection,
  onCloseDetail,
  onMove,
  onCopy
}: {
  readonly view: ReadyLiveModeView;
  readonly detailOpen: boolean;
  readonly desktopDetail: boolean;
  readonly copyNotice: LivePromptCopyNotice;
  readonly onSelectCard: (cardId: string, trigger: HTMLButtonElement) => void;
  readonly onClearSelection: () => void;
  readonly onCloseDetail: () => void;
  readonly onMove: (direction: "previous" | "next") => void;
  readonly onCopy: () => void;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  const [openCategory, setOpenCategory] = useState<PromptCardCategory | null>(view.groups[0]?.category ?? null);

  useEffect(() => {
    if (detailOpen) {
      setOpenCategory(view.currentCard.category);
      return;
    }
    if (openCategory !== null && !view.groups.some((group) => group.category === openCategory)) {
      setOpenCategory(view.groups[0]?.category ?? null);
    }
  }, [detailOpen, openCategory, view]);

  return (
    <>
      <section className="hidden min-w-0 gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-3" aria-label={copy.liveBoard.boardLabel} data-live-mode-layout="signboard">
        {view.groups.map((group) => (
          <section key={group.category} className="min-w-0 rounded-base border border-border bg-surface-muted/45 p-3" aria-labelledby={`live-category-${group.category}`}>
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
              <h3 id={`live-category-${group.category}`} className="text-sm font-black text-foreground">
                {copy.category[group.category]}
              </h3>
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary-strong">
                {copy.liveBoard.cardCount(group.cards.length)}
              </span>
            </div>
            <div className="grid gap-3">
              {group.cards.map((card, index) => (
                <button
                  key={card.id}
                  type="button"
                  className="group min-h-36 min-w-0 rounded-base border border-border bg-gradient-to-br from-surface to-primary-soft/30 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-panel"
                  aria-haspopup="dialog"
                  aria-label={copy.liveBoard.openDetailLabel(copy.category[card.category], index + 1)}
                  data-live-prompt-signboard={card.id}
                  onClick={(event) => onSelectCard(card.id, event.currentTarget)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-black text-slate-950">
                      {copy.segment[card.segment]}
                    </span>
                    <span className="text-xs font-black text-muted">{index + 1} / {group.cards.length}</span>
                  </span>
                  <span className="mt-4 block break-words text-pretty text-base font-black leading-7 text-foreground [overflow-wrap:anywhere] [word-break:auto-phrase]" data-live-prompt-summary>
                    <LivePromptPhraseText text={summarizeLivePromptCardBody(card.body)} />
                  </span>
                  <span className="mt-3 block text-xs font-black text-primary-strong group-hover:underline">{copy.liveBoard.openFull}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </section>

      <section className="grid min-w-0 gap-3 lg:hidden" aria-label={copy.liveBoard.listLabel} data-live-mode-layout="accordion">
        {view.groups.map((group) => {
          const expanded = openCategory === group.category;
          const controlsId = `mobile-live-category-${group.category}`;
          return (
            <section key={group.category} className="min-w-0 overflow-hidden rounded-base border border-border bg-surface">
              <h3>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center justify-between gap-3 bg-surface-muted/60 px-4 py-3 text-left text-sm font-black text-foreground"
                  aria-expanded={expanded}
                  aria-controls={controlsId}
                  onClick={() => {
                    setOpenCategory(expanded ? null : group.category);
                    onClearSelection();
                  }}
                >
                  <span>{copy.category[group.category]}</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary-strong">{copy.liveBoard.cardCount(group.cards.length)}</span>
                    <span aria-hidden="true" className="text-lg text-primary-strong">{expanded ? "−" : "+"}</span>
                  </span>
                </button>
              </h3>
              <div id={controlsId} className={expanded ? "grid min-w-0 gap-2 border-t border-border p-3" : "hidden"}>
                {group.cards.map((card, index) => {
                  const selected = detailOpen && view.currentCard.id === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      className={selected
                        ? "min-w-0 rounded-base border border-primary bg-primary-soft/55 px-3 py-3 text-left"
                        : "min-w-0 rounded-base border border-border bg-surface px-3 py-3 text-left hover:border-primary/60"}
                      aria-expanded={selected}
                      aria-controls={selected ? "mobile-live-prompt-detail" : undefined}
                      onClick={(event) => onSelectCard(card.id, event.currentTarget)}
                    >
                      <span className="flex min-w-0 items-center justify-between gap-3">
                        <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-black text-primary-strong">
                          {copy.segment[card.segment]}
                        </span>
                        <span className="text-xs font-black text-muted">{index + 1} / {group.cards.length}</span>
                      </span>
                      <span className="mt-2 block break-words text-pretty text-sm font-bold leading-6 text-foreground [overflow-wrap:anywhere] [word-break:auto-phrase]" data-live-prompt-summary>
                        <LivePromptPhraseText text={summarizeLivePromptCardBody(card.body)} />
                      </span>
                    </button>
                  );
                })}
                {!desktopDetail && detailOpen && view.currentCard.category === group.category ? (
                  <LivePromptInlineDetail
                    view={view}
                    copyNotice={copyNotice}
                    onClose={onCloseDetail}
                    onMove={onMove}
                    onCopy={onCopy}
                  />
                ) : null}
              </div>
            </section>
          );
        })}
      </section>

      {desktopDetail && detailOpen ? (
        <LivePromptDetailDialog
          view={view}
          copyNotice={copyNotice}
          onClose={onCloseDetail}
          onMove={onMove}
          onCopy={onCopy}
        />
      ) : null}
    </>
  );
}
