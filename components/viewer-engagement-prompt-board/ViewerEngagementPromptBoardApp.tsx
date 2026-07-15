"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StreamPlanEditor } from "@/components/viewer-engagement-prompt-board/StreamPlanEditor";
import { StreamPlanList } from "@/components/viewer-engagement-prompt-board/StreamPlanList";
import { PromptCardWorkspace } from "@/components/viewer-engagement-prompt-board/PromptCardWorkspace";
import { LiveModeWorkspace } from "@/components/viewer-engagement-prompt-board/LiveModeWorkspace";
import {
  createEmptyPromptBoardData,
  loadPromptBoardData,
  savePromptBoardData,
  type PromptBoardData,
  type PromptBoardStorageFailureReason,
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

type Notice = Readonly<{ kind: "success" | "error"; message: string }>;
type EditorState = { readonly kind: "create" } | { readonly kind: "edit"; readonly planId: string } | null;
type ActiveSection = "plans" | "cards" | "live";

function createMutationContext(): StreamPlanMutationContext {
  return {
    now: new Date().toISOString(),
    createId: (kind) => `${kind}-${crypto.randomUUID()}`
  };
}

function getStorageFailureMessage(reason: PromptBoardStorageFailureReason): string {
  switch (reason) {
    case "malformed-json":
    case "corrupt-data":
    case "invalid-data":
      return "保存データが破損しているため読み込めませんでした。現在のデータは置き換えていません。";
    case "unsupported-schema":
      return "この保存データは未対応のバージョンです。現在のデータは置き換えていません。";
    case "storage-unavailable":
      return "ブラウザ保存を利用できません。タブを閉じる前に設定を確認してください。";
    case "write-failed":
      return "保存に失敗しました。直前までのデータを維持しています。ブラウザの空き容量を確認してください。";
  }
}

export function ViewerEngagementPromptBoardApp() {
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [data, setData] = useState<PromptBoardData>(createEmptyPromptBoardData);
  const [editor, setEditor] = useState<EditorState>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>("plans");
  const [requestedCardPlanId, setRequestedCardPlanId] = useState<string | null>(null);
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
      setNotice({ kind: "success", message: "ブラウザに保存した配信プランを復元しました。" });
    } else if (result.kind === "failure") {
      setNotice({ kind: "error", message: getStorageFailureMessage(result.reason) });
    }
    setLoaded(true);
  }, []);

  const closeEditorAndRestoreFocus = () => {
    setEditor(null);
    requestAnimationFrame(() => createButtonRef.current?.focus());
  };

  const persistMutation = (result: StreamPlanMutationResult | PromptCardMutationResult, successMessage: string, shouldCloseEditor = false): boolean => {
    if (!result.ok) {
      setNotice({ kind: "error", message: result.reason === "invalid-input" ? "入力内容を確認してください。" : "対象の配信プランを更新できませんでした。" });
      return false;
    }
    const saved = savePromptBoardData(result.data, data);
    setData(saved.data);
    if (saved.kind === "failure") {
      setNotice({ kind: "error", message: getStorageFailureMessage(saved.reason) });
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
      persistMutation(updateStreamPlanMetadata(data, editor.planId, input, context), "配信プランを更新しました。", true);
      return;
    }
    persistMutation(createStreamPlan(data, input, context), "配信プランを作成しました。", true);
  };

  const editPlan = (plan: StreamPlan) => {
    setEditor({ kind: "edit", planId: plan.id });
    setNotice(null);
  };

  const deletePlan = (planId: string) => {
    const plan = data.streamPlans.find((candidate) => candidate.id === planId);
    if (plan === undefined || !window.confirm(`「${plan.title}」を削除しますか？この操作は元に戻せません。`)) {
      return;
    }
    persistMutation(deleteStreamPlan(data, planId), "配信プランを削除しました。", editor?.kind === "edit" && editor.planId === planId);
  };

  const showCardEditor = (planId: string) => {
    setRequestedCardPlanId(planId);
    setActiveSection("cards");
    setNotice(null);
  };

  return (
    <div className="h-full overflow-y-auto bg-background" data-viewer-engagement-prompt-board={activeSection}>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary-strong">Kuro Stream Kit</p>
              <h1 className="mt-1 text-xl font-black text-foreground sm:text-2xl">配信カンペボード</h1>
              <p className="mt-1 text-sm text-muted [word-break:auto-phrase]">配信ごとの話題と注意事項を、まずプラン単位で整理します。</p>
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
              新しい配信プラン
            </button> : null}
          </div>
          <nav className="flex gap-1" aria-label="配信カンペボード内ナビゲーション">
            <button type="button" aria-current={activeSection === "plans" ? "page" : undefined} className={activeSection === "plans" ? "min-h-11 border-b-2 border-primary px-3 py-2 text-sm font-black text-primary-strong" : "min-h-11 border-b-2 border-transparent px-3 py-2 text-sm font-bold text-muted hover:text-foreground"} onClick={() => setActiveSection("plans")}>
              配信プラン
            </button>
            <button type="button" aria-current={activeSection === "cards" ? "page" : undefined} className={activeSection === "cards" ? "min-h-11 border-b-2 border-primary px-3 py-2 text-sm font-black text-primary-strong" : "min-h-11 border-b-2 border-transparent px-3 py-2 text-sm font-bold text-muted hover:text-foreground"} onClick={() => setActiveSection("cards")}>
              カンペ編集
            </button>
            <button type="button" aria-current={activeSection === "live" ? "page" : undefined} className={activeSection === "live" ? "min-h-11 border-b-2 border-primary px-3 py-2 text-sm font-black text-primary-strong" : "min-h-11 border-b-2 border-transparent px-3 py-2 text-sm font-bold text-muted hover:text-foreground"} onClick={() => setActiveSection("live")}>
              配信中
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-foreground">{activeSection === "plans" ? "配信プラン一覧" : activeSection === "cards" ? "配信プラン編集" : "配信中ワークスペース"}</h2>
            <p className="mt-1 text-sm text-muted [word-break:auto-phrase]">{activeSection === "plans" ? "日時順と手動表示順から、次の配信を自動で並べます。" : activeSection === "cards" ? "配信プランを選び、カンペカードの内容と順番を整えます。" : "現在の配信で読むカンペを、大きく見やすく表示します。"}</p>
          </div>
          <p className="text-sm font-bold text-muted" aria-live="polite">{loaded ? activeSection === "plans" ? `${data.streamPlans.length}件のプラン` : `${data.streamPlans.reduce((count, plan) => count + plan.promptCards.length, 0)}枚のカンペ` : "保存データを確認中"}</p>
        </div>

        {notice === null ? null : (
          <div
            role={notice.kind === "error" ? "alert" : "status"}
            className={[
              "mb-5 rounded-base border px-4 py-3 text-sm font-bold",
              notice.kind === "error"
                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                : "border-primary/30 bg-primary-soft/70 text-primary-strong"
            ].join(" ")}
          >
            {notice.message}
          </div>
        )}

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
          onDuplicate={(planId) => persistMutation(duplicateStreamPlan(data, planId, createMutationContext()), "配信プランを複製しました。")}
          onMove={(planId, direction) => persistMutation(reorderStreamPlan(data, planId, direction, createMutationContext()), "表示順を更新しました。")}
          onMakeCurrent={(planId) => persistMutation(switchCurrentStreamPlan(data, planId, createMutationContext()), "現在の配信を切り替えました。")}
          onComplete={(planId) => persistMutation(completeStreamPlan(data, planId, createMutationContext()), "配信プランを完了にしました。")}
          onPrepare={(planId) => persistMutation(moveIdeaToPreparing(data, planId, createMutationContext()), "アイデアを準備中へ移しました。")}
          onDelete={deletePlan}
          onEditCards={showCardEditor}
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
      </main>
    </div>
  );
}
