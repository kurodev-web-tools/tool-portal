"use client";

import { useRef, useState } from "react";
import { PromptCardEditor } from "@/components/viewer-engagement-prompt-board/PromptCardEditor";
import { PromptCardList } from "@/components/viewer-engagement-prompt-board/PromptCardList";
import { PromptCardPlanSelector } from "@/components/viewer-engagement-prompt-board/PromptCardPlanSelector";
import { DeleteConfirmationDialog } from "@/components/viewer-engagement-prompt-board/DeleteConfirmationDialog";
import {
  createPromptCard,
  deletePromptCard,
  movePromptCard,
  orderPromptCardsForDisplay,
  reorderPromptCard,
  updatePromptCard,
  type PromptCardInput,
  type PromptCardMutationContext,
  type PromptCardMutationResult
} from "@/lib/viewer-engagement-prompt-board-prompt-cards";
import type { PromptBoardData, PromptCard } from "@/lib/viewer-engagement-prompt-board-storage";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

type CardEditorState = { readonly kind: "create" } | { readonly kind: "edit"; readonly cardId: string } | null;

function createMutationContext(): PromptCardMutationContext {
  return {
    now: new Date().toISOString(),
    createId: () => `card-${crypto.randomUUID()}`
  };
}

export function PromptCardWorkspace({
  data,
  selectedPlanId,
  onSelectPlan,
  onShowPlans,
  onMutation
}: {
  readonly data: PromptBoardData;
  readonly selectedPlanId: string | null;
  readonly onSelectPlan: (planId: string) => void;
  readonly onShowPlans: () => void;
  readonly onMutation: (result: PromptCardMutationResult, successMessage: string) => boolean;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [editor, setEditor] = useState<CardEditorState>(null);
  const [pendingDeleteCardId, setPendingDeleteCardId] = useState<string | null>(null);
  const selectedPlan = selectedPlanId === null
    ? null
    : data.streamPlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const editedCard = editor?.kind === "edit"
    ? selectedPlan?.promptCards.find((card) => card.id === editor.cardId) ?? null
    : null;
  const orderedCards = selectedPlan === null ? [] : orderPromptCardsForDisplay(selectedPlan.promptCards);

  const focusAfterListMutation = () => {
    requestAnimationFrame(() => addButtonRef.current?.focus());
  };

  const closeEditor = () => {
    setEditor(null);
    focusAfterListMutation();
  };

  const submitEditor = (input: PromptCardInput) => {
    if (selectedPlan === null) {
      return;
    }
    const result = editor?.kind === "edit"
      ? updatePromptCard(data, { planId: selectedPlan.id, cardId: editor.cardId, input }, createMutationContext())
      : createPromptCard(data, { planId: selectedPlan.id, input }, createMutationContext());
    if (onMutation(result, editor?.kind === "edit" ? copy.cardWorkspace.updated : copy.cardWorkspace.added)) {
      closeEditor();
    }
  };

  const deleteCard = (card: PromptCard) => {
    if (selectedPlan === null) {
      return;
    }
    setPendingDeleteCardId(card.id);
  };

  const confirmDeleteCard = () => {
    const cardId = pendingDeleteCardId;
    setPendingDeleteCardId(null);
    if (selectedPlan === null || cardId === null) {
      return;
    }
    const saved = onMutation(
      deletePromptCard(data, { planId: selectedPlan.id, cardId }, createMutationContext()),
      copy.cardWorkspace.deleted
    );
    if (!saved) {
      return;
    }
    if (editor?.kind === "edit" && editor.cardId === cardId) {
      closeEditor();
      return;
    }
    focusAfterListMutation();
  };

  const moveCard = (cardId: string, destinationPlanId: string) => {
    if (selectedPlan === null) {
      return;
    }
    const saved = onMutation(
      movePromptCard(data, { sourcePlanId: selectedPlan.id, cardId, destinationPlanId }, createMutationContext()),
      copy.cardWorkspace.moved
    );
    if (!saved) {
      return;
    }
    if (editor?.kind === "edit" && editor.cardId === cardId) {
      closeEditor();
      return;
    }
    focusAfterListMutation();
  };

  return (
    <div className="grid min-w-0 gap-5" data-prompt-card-workspace={selectedPlanId ?? "empty"}>
      <section className="panel min-w-0 p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <PromptCardPlanSelector
            plans={data.streamPlans}
            selectedPlanId={selectedPlanId}
            onSelect={(planId) => {
              setEditor(null);
              onSelectPlan(planId);
            }}
          />
          {selectedPlan === null ? null : (
            <button
              ref={addButtonRef}
              type="button"
              className="min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-primary-strong"
              onClick={() => setEditor({ kind: "create" })}
            >
              {copy.cardWorkspace.add}
            </button>
          )}
        </div>
      </section>

      {selectedPlan === null ? (
        <section className="panel min-w-0 px-4 py-10 text-center sm:px-6">
          <h3 className="text-lg font-black text-foreground">{copy.cardWorkspace.createPlanTitle}</h3>
          <p className="mt-2 text-sm text-muted [word-break:auto-phrase]">{copy.cardWorkspace.createPlanDescription}</p>
          <button type="button" className="mt-5 min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950" onClick={onShowPlans}>{copy.cardWorkspace.plans}</button>
        </section>
      ) : (
        <>
          <section className="panel min-w-0 p-4 sm:p-5" aria-labelledby="selected-prompt-plan-title">
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-primary-strong">{copy.cardWorkspace.eyebrow}</p>
                <h2 id="selected-prompt-plan-title" className="mt-1 break-words text-xl font-black text-foreground [word-break:auto-phrase]">{selectedPlan.title}</h2>
                <p className="mt-1 text-sm text-muted">{copy.cardWorkspace.description}</p>
              </div>
              <p className="rounded-base bg-surface-muted px-3 py-2 text-sm font-black text-primary-strong">{copy.cardWorkspace.cardCount(selectedPlan.promptCards.length)}</p>
            </div>
          </section>

          {editor === null ? null : (
            <PromptCardEditor
              key={editor.kind === "create" ? `create-${selectedPlan.id}` : editor.cardId}
              card={editedCard}
              onSubmit={submitEditor}
              onCancel={closeEditor}
            />
          )}

          <section className="panel min-w-0 p-4 sm:p-5" aria-labelledby="prompt-card-list-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 id="prompt-card-list-title" className="text-lg font-black text-foreground">{copy.cardWorkspace.listTitle}</h3>
                <p className="mt-1 text-sm text-muted [word-break:auto-phrase]">{copy.cardWorkspace.listDescription}</p>
              </div>
            </div>
            <PromptCardList
              cards={orderedCards}
              plans={data.streamPlans}
              currentPlanId={selectedPlan.id}
              onEdit={(card) => setEditor({ kind: "edit", cardId: card.id })}
              onReorder={(cardId, direction) => onMutation(
                reorderPromptCard(data, { planId: selectedPlan.id, cardId, direction }, createMutationContext()),
                copy.cardWorkspace.orderUpdated
              )}
              onMove={moveCard}
              onDelete={deleteCard}
            />
          </section>
        </>
      )}
      {pendingDeleteCardId === null ? null : (
        <DeleteConfirmationDialog
          message={copy.cardWorkspace.deleteConfirm}
          onCancel={() => setPendingDeleteCardId(null)}
          onConfirm={confirmDeleteCard}
        />
      )}
    </div>
  );
}
