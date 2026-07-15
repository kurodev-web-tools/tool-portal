"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { streamPlanStatuses, type StreamPlan, type StreamPlanStatus } from "@/lib/viewer-engagement-prompt-board-storage";
import type { StreamPlanMetadataInput } from "@/lib/viewer-engagement-prompt-board-stream-plans";

const statusLabels: Readonly<Record<StreamPlanStatus, string>> = {
  idea: "アイデア",
  preparing: "準備中",
  live: "配信中",
  completed: "完了"
};

function toDateTimeLocalValue(scheduledAt: string | null): string {
  if (scheduledAt === null) {
    return "";
  }
  const date = new Date(scheduledAt);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function isStreamPlanStatus(value: string): value is StreamPlanStatus {
  return streamPlanStatuses.some((status) => status === value);
}

export function StreamPlanEditor({
  plan,
  defaultManualOrder,
  onSubmit,
  onCancel
}: {
  readonly plan: StreamPlan | null;
  readonly defaultManualOrder: number;
  readonly onSubmit: (input: StreamPlanMetadataInput) => void;
  readonly onCancel: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(plan?.title ?? "");
  const [scheduledAt, setScheduledAt] = useState(toDateTimeLocalValue(plan?.scheduledAt ?? null));
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [status, setStatus] = useState<StreamPlanStatus>(plan?.status ?? "idea");
  const [manualOrder, setManualOrder] = useState(String(plan?.manualOrder ?? defaultManualOrder));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    const parsedOrder = Number(manualOrder);
    const scheduledDate = scheduledAt === "" ? null : new Date(scheduledAt);
    if (normalizedTitle.length === 0) {
      setError("タイトルを入力してください。");
      return;
    }
    if (manualOrder.trim() === "" || !Number.isSafeInteger(parsedOrder) || parsedOrder < 0) {
      setError("手動表示順は0以上の整数で入力してください。");
      return;
    }
    if (scheduledDate !== null && !Number.isFinite(scheduledDate.getTime())) {
      setError("予定日時を確認してください。");
      return;
    }
    onSubmit({
      title: normalizedTitle,
      scheduledAt: scheduledDate?.toISOString() ?? null,
      notes,
      status,
      manualOrder: parsedOrder
    });
  };

  return (
    <section className="panel mb-5 p-4 sm:p-5" aria-labelledby="stream-plan-editor-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-strong">配信プラン</p>
          <h2 id="stream-plan-editor-title" className="mt-1 text-lg font-black text-foreground">
            {plan === null ? "新しい配信プラン" : "配信プランを編集"}
          </h2>
        </div>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={onCancel}>
          閉じる
        </button>
      </div>

      <form className="grid gap-4" onSubmit={submit} data-stream-plan-editor={plan === null ? "create" : "edit"}>
        <label className="grid gap-1.5 text-sm font-bold text-foreground">
          タイトル <span className="text-red-600">必須</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-11 rounded-base border border-border bg-surface px-3 py-2 text-foreground"
            maxLength={120}
            required
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            予定日時（任意）
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="min-h-11 rounded-base border border-border bg-surface px-3 py-2 text-foreground"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            状態
            <select
              value={status}
              onChange={(event) => {
                if (isStreamPlanStatus(event.target.value)) {
                  setStatus(event.target.value);
                }
              }}
              className="min-h-11 rounded-base border border-border bg-surface px-3 py-2 text-foreground"
            >
              {streamPlanStatuses.map((option) => (
                <option key={option} value={option}>{statusLabels[option]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            手動表示順
            <input
              type="number"
              min="0"
              step="1"
              value={manualOrder}
              onChange={(event) => setManualOrder(event.target.value)}
              className="min-h-11 rounded-base border border-border bg-surface px-3 py-2 text-foreground"
              required
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-sm font-bold text-foreground">
          配信全体メモ
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 resize-y rounded-base border border-border bg-surface px-3 py-2 text-foreground"
            maxLength={2_000}
          />
        </label>

        {error === null ? null : <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="flat-control min-h-11 px-4 py-2" onClick={onCancel}>キャンセル</button>
          <button type="submit" className="min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-primary-strong">
            {plan === null ? "配信プランを作成" : "変更を保存"}
          </button>
        </div>
      </form>
    </section>
  );
}
