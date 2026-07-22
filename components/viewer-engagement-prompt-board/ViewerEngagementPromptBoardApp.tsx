"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StreamPlanEditor } from "@/components/viewer-engagement-prompt-board/StreamPlanEditor";
import { StreamPlanList } from "@/components/viewer-engagement-prompt-board/StreamPlanList";
import { PromptCardWorkspace } from "@/components/viewer-engagement-prompt-board/PromptCardWorkspace";
import { LiveModeWorkspace } from "@/components/viewer-engagement-prompt-board/LiveModeWorkspace";
import { DeleteConfirmationDialog } from "@/components/viewer-engagement-prompt-board/DeleteConfirmationDialog";
import { PromptBoardNotice, type PromptBoardNoticeValue } from "@/components/viewer-engagement-prompt-board/PromptBoardNotice";
import {
  DataManagementWorkspace,
  getPromptBoardStorageFailureMessage
} from "@/components/viewer-engagement-prompt-board/DataManagementWorkspace";
import {
  createEmptyPromptBoardData,
  loadPromptBoardData,
  savePromptBoardData,
  type PromptBoardData,
  type StreamPlan
} from "@/lib/viewer-engagement-prompt-board-storage";
import {
  completeStreamPlan,
  createStreamPlan,
  deleteStreamPlan,
  duplicateStreamPlan,
  groupStreamPlans,
  moveIdeaToPreparing,
  reorderStreamPlan,
  switchCurrentStreamPlan,
  updateStreamPlanMetadata,
  type StreamPlanMetadataInput,
  type StreamPlanMutationContext,
  type StreamPlanMutationResult
} from "@/lib/viewer-engagement-prompt-board-stream-plans";
import {
  resolvePromptCardPlanId,
  type PromptCardMutationResult
} from "@/lib/viewer-engagement-prompt-board-prompt-cards";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

type EditorState = { readonly kind: "create" } | { readonly kind: "edit"; readonly planId: string } | null;
type ActiveSection = "plans" | "cards" | "live" | "data";

function createMutationContext(): StreamPlanMutationContext {
  return {
    now: new Date().toISOString(),
    createId: (kind) => `${kind}-${crypto.randomUUID()}`
  };
}

export function ViewerEngagementPromptBoardApp() {
  const copy = useViewerEngagementPromptBoardCopy();
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const previousCopyRef = useRef(copy);
  const [data, setData] = useState<PromptBoardData>(createEmptyPromptBoardData);
  const [editor, setEditor] = useState<EditorState>(null);
  const [notice, setNotice] = useState<PromptBoardNoticeValue | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>("plans");
  const [requestedCardPlanId, setRequestedCardPlanId] = useState<string | null>(null);
  const [pendingPlanDeletion, setPendingPlanDeletion] = useState<Readonly<{ planId: string; title: string }> | null>(null);
  const groups = useMemo(() => groupStreamPlans(data.streamPlans), [data.streamPlans]);
  const selectedCardPlanId = useMemo(
    () => resolvePromptCardPlanId(data, requestedCardPlanId),
    [data, requestedCardPlanId]
  );
  const editedPlan = editor?.kind === "edit"
    ? data.streamPlans.find((plan) => plan.id === editor.planId) ?? null
    : null;
  const defaultManualOrder = data.streamPlans.length === 0
    ? 0
    : Math.max(...data.streamPlans.map((plan) => plan.manualOrder)) + 1;

  useEffect(() => {
    const result = loadPromptBoardData(createEmptyPromptBoardData());
    setData(result.data);
    if (result.kind === "loaded") {
      setNotice({ kind: "success", message: copy.app.restoredSavedPlans });
    } else if (result.kind === "failure") {
      setNotice({ kind: "error", message: getPromptBoardStorageFailureMessage(result.reason, copy.data.failures) });
    }
    setLoaded(true);
  }, [copy.app.restoredSavedPlans, copy.data.failures]);

  useEffect(() => {
    if (previousCopyRef.current !== copy) {
      setNotice(null);
      previousCopyRef.current = copy;
    }
  }, [copy]);

  const closeEditorAndRestoreFocus = () => {
    setEditor(null);
    requestAnimationFrame(() => createButtonRef.current?.focus());
  };

  const restoreData = (restoredData: PromptBoardData) => {
    setData(restoredData);
    setEditor(null);
    setRequestedCardPlanId(null);
  };

  const persistMutation = (result: StreamPlanMutationResult | PromptCardMutationResult, successMessage: string, shouldCloseEditor = false): boolean => {
    if (!result.ok) {
      setNotice({ kind: "error", message: result.reason === "invalid-input" ? copy.app.invalidInput : copy.app.updateFailed });
      return false;
    }
    const saved = savePromptBoardData(result.data, data);
    setData(saved.data);
    if (saved.kind === "failure") {
      setNotice({ kind: "error", message: getPromptBoardStorageFailureMessage(saved.reason, copy.data.failures) });
      return false;
    }
    setNotice({ kind: "success", message: successMessage });
    if (shouldCloseEditor) {
      closeEditorAndRestoreFocus();
    }
    return true;
  };

  const submitEditor = (input: StreamPlanMetadataInput) => {
    const context = createMutationContext();
    if (editor?.kind === "edit") {
      persistMutation(updateStreamPlanMetadata(data, editor.planId, input, context), copy.app.planUpdated, true);
      return;
    }
    persistMutation(createStreamPlan(data, input, context), copy.app.planCreated, true);
  };

  const editPlan = (plan: StreamPlan) => {
    setEditor({ kind: "edit", planId: plan.id });
    setNotice(null);
  };

  const deletePlan = (planId: string) => {
    const plan = data.streamPlans.find((candidate) => candidate.id === planId);
    if (plan === undefined) {
      return;
    }
    setPendingPlanDeletion({ planId, title: plan.title });
  };

  const confirmDeletePlan = () => {
    const request = pendingPlanDeletion;
    setPendingPlanDeletion(null);
    if (request !== null) {
      const deleted = persistMutation(
        deleteStreamPlan(data, request.planId),
        copy.app.planDeleted,
        editor?.kind === "edit" && editor.planId === request.planId
      );
      if (deleted) {
        requestAnimationFrame(() => createButtonRef.current?.focus());
      }
    }
  };

  const showCardEditor = (planId: string) => {
    setRequestedCardPlanId(planId);
    setActiveSection("cards");
    setNotice(null);
  };

  const showLivePlan = (planId: string) => {
    if (data.streamPlans.some((plan) => plan.id === planId && plan.status === "live")) {
      setActiveSection("live");
      setNotice(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background" data-viewer-engagement-prompt-board={activeSection}>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary-strong">Kuro Stream Kit</p>
              <h1 className="mt-1 text-xl font-black text-foreground sm:text-2xl">{copy.app.title}</h1>
              <p className="mt-1 text-sm text-muted [word-break:auto-phrase]">
                {copy.app.description}
              </p>
            </div>
            {activeSection === "plans" ? <button
              ref={createButtonRef}
              type="button"
              className="min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-primary-strong"
              onClick={() => {
                setEditor({ kind: "create" });
                setNotice(null);
              }}
            >
              {copy.app.newPlan}
            </button> : null}
          </div>
          <nav className="grid grid-cols-4 gap-0 sm:flex sm:gap-1" aria-label={copy.app.navigationLabel}>
            <button type="button" aria-current={activeSection === "plans" ? "page" : undefined} className={activeSection === "plans" ? "min-h-11 whitespace-nowrap border-b-2 border-primary px-1 py-2 text-xs font-black text-primary-strong sm:px-3 sm:text-sm" : "min-h-11 whitespace-nowrap border-b-2 border-transparent px-1 py-2 text-xs font-bold text-muted hover:text-foreground sm:px-3 sm:text-sm"} onClick={() => setActiveSection("plans")}>
              {copy.app.tabs.plans}
            </button>
            <button type="button" aria-current={activeSection === "cards" ? "page" : undefined} className={activeSection === "cards" ? "min-h-11 whitespace-nowrap border-b-2 border-primary px-1 py-2 text-xs font-black text-primary-strong sm:px-3 sm:text-sm" : "min-h-11 whitespace-nowrap border-b-2 border-transparent px-1 py-2 text-xs font-bold text-muted hover:text-foreground sm:px-3 sm:text-sm"} onClick={() => setActiveSection("cards")}>
              {copy.app.tabs.cards}
            </button>
            <button type="button" aria-current={activeSection === "live" ? "page" : undefined} className={activeSection === "live" ? "min-h-11 whitespace-nowrap border-b-2 border-primary px-1 py-2 text-xs font-black text-primary-strong sm:px-3 sm:text-sm" : "min-h-11 whitespace-nowrap border-b-2 border-transparent px-1 py-2 text-xs font-bold text-muted hover:text-foreground sm:px-3 sm:text-sm"} onClick={() => setActiveSection("live")}>
              {copy.app.tabs.live}
            </button>
            <button type="button" aria-current={activeSection === "data" ? "page" : undefined} className={activeSection === "data" ? "min-h-11 whitespace-nowrap border-b-2 border-primary px-1 py-2 text-xs font-black text-primary-strong sm:px-3 sm:text-sm" : "min-h-11 whitespace-nowrap border-b-2 border-transparent px-1 py-2 text-xs font-bold text-muted hover:text-foreground sm:px-3 sm:text-sm"} onClick={() => setActiveSection("data")}>
              {copy.app.tabs.data}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-foreground">{copy.app.sectionTitles[activeSection]}</h2>
            <p className="mt-1 text-sm text-muted [word-break:auto-phrase]">
              {copy.app.sectionDescriptions[activeSection]}
            </p>
          </div>
          <p className="text-sm font-bold text-muted" aria-live="polite">{loaded ? activeSection === "plans" ? copy.app.planCount(data.streamPlans.length) : copy.app.cardCount(data.streamPlans.reduce((count, plan) => count + plan.promptCards.length, 0)) : copy.app.checkingSavedData}</p>
        </div>

        <PromptBoardNotice notice={notice} />

        {activeSection === "plans" && editor !== null ? (
          <StreamPlanEditor
            key={editor.kind === "create" ? "create" : editor.planId}
            plan={editedPlan}
            defaultManualOrder={defaultManualOrder}
            onSubmit={submitEditor}
            onCancel={closeEditorAndRestoreFocus}
          />
        ) : null}

        {activeSection === "plans" ? <StreamPlanList
          groups={groups}
          onEdit={editPlan}
          onDuplicate={(planId) => persistMutation(duplicateStreamPlan(data, planId, createMutationContext()), copy.app.planDuplicated)}
          onMove={(planId, direction) => persistMutation(reorderStreamPlan(data, planId, direction, createMutationContext()), copy.app.orderUpdated)}
          onMakeCurrent={(planId) => persistMutation(switchCurrentStreamPlan(data, planId, createMutationContext()), copy.app.currentSwitched)}
          onComplete={(planId) => persistMutation(completeStreamPlan(data, planId, createMutationContext()), copy.app.planCompleted)}
          onPrepare={(planId) => persistMutation(moveIdeaToPreparing(data, planId, createMutationContext()), copy.app.ideaPrepared)}
          onDelete={deletePlan}
          onEditCards={showCardEditor}
          onShowLive={showLivePlan}
        /> : null}
        {activeSection === "cards" ? (
          <PromptCardWorkspace
            data={data}
            selectedPlanId={selectedCardPlanId}
            onSelectPlan={setRequestedCardPlanId}
            onShowPlans={() => setActiveSection("plans")}
            onMutation={persistMutation}
          />
        ) : null}
        {activeSection === "live" ? (
          <LiveModeWorkspace
            data={data}
            onShowPlans={() => setActiveSection("plans")}
            onEditCards={showCardEditor}
          />
        ) : null}
        {activeSection === "data" ? <DataManagementWorkspace data={data} onRestore={restoreData} /> : null}
      </main>
      {pendingPlanDeletion === null ? null : (
        <DeleteConfirmationDialog
          message={copy.app.deletePlanConfirm(pendingPlanDeletion.title)}
          onCancel={() => setPendingPlanDeletion(null)}
          onConfirm={confirmDeletePlan}
        />
      )}
    </div>
  );
}
