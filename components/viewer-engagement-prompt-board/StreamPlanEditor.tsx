"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { streamPlanStatuses, type StreamPlan, type StreamPlanStatus } from "@/lib/viewer-engagement-prompt-board-storage";
import type { StreamPlanMetadataInput } from "@/lib/viewer-engagement-prompt-board-stream-plans";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

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

function formatScheduledAt(value: string, locale: string, placeholder: string): string {
  if (value === "") {
    return placeholder;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : placeholder;
}

function focusAndReveal(element: HTMLElement | null) {
  element?.focus({ preventScroll: true });
  element?.scrollIntoView({ block: "center", inline: "nearest" });
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
  const copy = useViewerEngagementPromptBoardCopy();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(plan?.title ?? "");
  const [scheduledAt, setScheduledAt] = useState(toDateTimeLocalValue(plan?.scheduledAt ?? null));
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [status, setStatus] = useState<StreamPlanStatus>(plan?.status ?? "idea");
  const [manualOrder, setManualOrder] = useState(String(plan?.manualOrder ?? defaultManualOrder));
  const [error, setError] = useState<"title" | "order" | "date" | null>(null);

  useEffect(() => {
    focusAndReveal(titleRef.current);
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    const parsedOrder = Number(manualOrder);
    const scheduledDate = scheduledAt === "" ? null : new Date(scheduledAt);
    if (normalizedTitle.length === 0) {
      setError("title");
      focusAndReveal(titleRef.current);
      return;
    }
    if (manualOrder.trim() === "" || !Number.isSafeInteger(parsedOrder) || parsedOrder < 0) {
      setError("order");
      return;
    }
    if (scheduledDate !== null && !Number.isFinite(scheduledDate.getTime())) {
      setError("date");
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
          <p className="text-xs font-bold uppercase tracking-wide text-primary-strong">{copy.planEditor.eyebrow}</p>
          <h2 id="stream-plan-editor-title" className="mt-1 text-lg font-black text-foreground">
            {plan === null ? copy.planEditor.createTitle : copy.planEditor.editTitle}
          </h2>
        </div>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={onCancel}>
          {copy.planEditor.close}
        </button>
      </div>

      <form className="grid gap-4" onSubmit={submit} noValidate data-stream-plan-editor={plan === null ? "create" : "edit"}>
        <label className="grid gap-1.5 text-sm font-bold text-foreground">
          {copy.planEditor.title} <span className="text-red-600">{copy.planEditor.required}</span>
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
            {copy.planEditor.scheduledAt}
            <span className="relative min-h-11 rounded-base border border-border bg-surface focus-within:ring-2 focus-within:ring-primary">
              <span aria-hidden="true" className="pointer-events-none flex min-h-11 items-center justify-between gap-2 px-3 py-2 font-normal text-foreground">
                <span>{formatScheduledAt(scheduledAt, copy.dateLocale, copy.planEditor.scheduledAtPlaceholder)}</span>
                <span>▾</span>
              </span>
              <input
                type="datetime-local"
                lang={copy.dateLocale}
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                onClick={(event) => event.currentTarget.showPicker?.()}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            {copy.planEditor.status}
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
                <option key={option} value={option}>{copy.status[option]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            {copy.planEditor.manualOrder}
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
          {copy.planEditor.notes}
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 resize-y rounded-base border border-border bg-surface px-3 py-2 text-foreground"
            maxLength={2_000}
          />
        </label>

        {error === null ? null : <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-300">{copy.planEditor[`${error}Error`]}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="flat-control min-h-11 px-4 py-2" onClick={onCancel}>{copy.planEditor.cancel}</button>
          <button type="submit" className="min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-primary-strong">
            {plan === null ? copy.planEditor.create : copy.planEditor.save}
          </button>
        </div>
      </form>
    </section>
  );
}
