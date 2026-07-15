"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StreamPlanEditor } from "@/components/viewer-engagement-prompt-board/StreamPlanEditor";
import { StreamPlanList } from "@/components/viewer-engagement-prompt-board/StreamPlanList";
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

type Notice = Readonly<{ kind: "success" | "error"; message: string }>;
type EditorState = { readonly kind: "create" } | { readonly kind: "edit"; readonly planId: string } | null;

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
  const groups = useMemo(() => groupStreamPlans(data.streamPlans), [data.streamPlans]);
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

  const persistMutation = (result: StreamPlanMutationResult, successMessage: string, shouldCloseEditor = false) => {
    if (!result.ok) {
      setNotice({ kind: "error", message: result.reason === "invalid-input" ? "入力内容を確認してください。" : "対象の配信プランを更新できませんでした。" });
      return;
    }
    const saved = savePromptBoardData(result.data, data);
    setData(saved.data);
    if (saved.kind === "failure") {
      setNotice({ kind: "error", message: getStorageFailureMessage(saved.reason) });
      return;
    }
    setNotice({ kind: "success", message: successMessage });
    if (shouldCloseEditor) {
      closeEditorAndRestoreFocus();
    }
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

  return (
    <div className="h-full overflow-y-auto bg-background" data-viewer-engagement-prompt-board="stream-plans">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary-strong">Kuro Stream Kit</p>
              <h1 className="mt-1 text-xl font-black text-foreground sm:text-2xl">配信カンペボード</h1>
              <p className="mt-1 text-sm text-muted [word-break:auto-phrase]">配信ごとの話題と注意事項を、まずプラン単位で整理します。</p>
            </div>
            <button
              ref={createButtonRef}
              type="button"
              className="min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-primary-strong"
              onClick={() => {
                setEditor({ kind: "create" });
                setNotice(null);
              }}
            >
              新しい配信プラン
            </button>
          </div>
          <nav className="flex gap-1" aria-label="配信カンペボード内ナビゲーション">
            <button type="button" aria-current="page" className="border-b-2 border-primary px-3 py-2 text-sm font-black text-primary-strong">
              配信プラン
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-foreground">配信プラン一覧</h2>
            <p className="mt-1 text-sm text-muted [word-break:auto-phrase]">日時順と手動表示順から、次の配信を自動で並べます。</p>
          </div>
          <p className="text-sm font-bold text-muted" aria-live="polite">{loaded ? `${data.streamPlans.length}件のプラン` : "保存データを確認中"}</p>
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

        {editor === null ? null : (
          <StreamPlanEditor
            key={editor.kind === "create" ? "create" : editor.planId}
            plan={editedPlan}
            defaultManualOrder={defaultManualOrder}
            onSubmit={submitEditor}
            onCancel={closeEditorAndRestoreFocus}
          />
        )}

        <StreamPlanList
          groups={groups}
          onEdit={editPlan}
          onDuplicate={(planId) => persistMutation(duplicateStreamPlan(data, planId, createMutationContext()), "配信プランを複製しました。")}
          onMove={(planId, direction) => persistMutation(reorderStreamPlan(data, planId, direction, createMutationContext()), "表示順を更新しました。")}
          onMakeCurrent={(planId) => persistMutation(switchCurrentStreamPlan(data, planId, createMutationContext()), "現在の配信を切り替えました。")}
          onComplete={(planId) => persistMutation(completeStreamPlan(data, planId, createMutationContext()), "配信プランを完了にしました。")}
          onPrepare={(planId) => persistMutation(moveIdeaToPreparing(data, planId, createMutationContext()), "アイデアを準備中へ移しました。")}
          onDelete={deletePlan}
        />
      </main>
    </div>
  );
}
