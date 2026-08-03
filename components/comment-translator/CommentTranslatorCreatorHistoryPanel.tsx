"use client";

import { useState } from "react";
import type { CommentTranslatorCreatorSafeHistoryRow } from "@/lib/comment-translator-creator-history-types";
import {
  filterCommentTranslatorPriorityRows,
  readCommentTranslatorProjectedPriority,
  readCommentTranslatorPriorityFilter,
  type CommentTranslatorPriorityFilter
} from "@/lib/comment-translator-priority-classification";

export type CommentTranslatorCreatorHistoryPanelState =
  | { readonly status: "ready"; readonly rows: readonly CommentTranslatorCreatorSafeHistoryRow[] }
  | { readonly status: "unavailable" }
  | { readonly status: "deleted" };

export const commentTranslatorCreatorHistoryPanelContract = {
  dataBoundary: "safe-history-props-only",
  lifecycleReachability: "deterministic-props-only-not-production-wired",
  publicActivation: "fixed-closed"
} as const;

const moderationLabels = {
  visible: "Visible",
  deleted: "Deleted",
  banned: "Banned",
  ended: "Stream ended",
  system: "System event"
} as const;

export function CommentTranslatorCreatorHistoryPanel({
  history
}: {
  readonly history: CommentTranslatorCreatorHistoryPanelState;
}) {
  const [priorityFilter, setPriorityFilter] = useState<CommentTranslatorPriorityFilter>("all");
  if (history.status === "unavailable") {
    return <HistoryUnavailable />;
  }
  if (history.status === "deleted") {
    return <HistoryDeleted />;
  }
  if (history.status === "ready") {
    const filteredRows = filterCommentTranslatorPriorityRows(history.rows, priorityFilter);
    const priorityOnlyEmpty = priorityFilter === "priority" && history.rows.length > 0 && filteredRows.length === 0;
    return (
      <section className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 text-slate-900" aria-live="polite" aria-labelledby="creator-history-title">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm text-slate-600">Creator</p>
            <h2 id="creator-history-title" className="text-lg font-semibold">Seven-day safe history</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <span>Priority</span>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(readCommentTranslatorPriorityFilter(event.target.value))} className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900">
                <option value="all">All safe items</option>
                <option value="priority">Priority only</option>
              </select>
            </label>
            <span>{filteredRows.length} safe items</span>
          </div>
        </header>
        {filteredRows.length === 0 ? (
          <p role="status" className="rounded-md bg-slate-50 p-3 text-sm">{priorityOnlyEmpty ? "No priority safe history is available." : "No safe history is available yet."}</p>
        ) : (
          <ol className="space-y-3">
            {filteredRows.map((row, index) => <HistoryRow key={`${row.recordedAtIso}-${index}`} row={row} />)}
          </ol>
        )}
      </section>
    );
  }
  return (
    <HistoryUnavailable />
  );
}

function HistoryRow({ row }: { readonly row: CommentTranslatorCreatorSafeHistoryRow }) {
  const isTombstone = row.moderationLabel !== "visible";
  const priority = readCommentTranslatorProjectedPriority(row.priority);
  const safeBadgeLabel = priority.badgeLabel ?? row.badgeLabel;
  const displayedText = isTombstone ? "Comment unavailable" : row.translatedText ?? row.originalText ?? "Comment unavailable";
  return (
    <li className="w-full break-words rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <strong>{row.authorDisplayName ?? row.authorLabel}</strong>
        {safeBadgeLabel ? <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-800">{safeBadgeLabel}</span> : null}
        {row.purchaseLabel ? <span className="rounded bg-slate-100 px-2 py-0.5">{row.purchaseLabel}</span> : null}
      </div>
      <p className="mt-2 whitespace-pre-wrap">{displayedText}</p>
      <p className="mt-2 text-sm text-slate-600">{moderationLabels[row.moderationLabel]}</p>
      {!isTombstone && row.originalText ? (
        <details className="mt-2 rounded border border-slate-200 p-2">
          <summary className="cursor-pointer font-medium">Original text</summary>
          <p className="mt-2 whitespace-pre-wrap">{row.originalText}</p>
        </details>
      ) : null}
      <p className="mt-2 text-sm text-slate-600">{row.sourceAttributionLabel}</p>
    </li>
  );
}

function HistoryUnavailable() {
  return (
    <section className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 text-slate-900" aria-live="polite" aria-labelledby="creator-history-title">
      <h2 id="creator-history-title" className="text-lg font-semibold">Seven-day safe history unavailable</h2>
      <p role="status" className="mt-2 text-sm text-slate-600">Safe history is unavailable.</p>
    </section>
  );
}

function HistoryDeleted() {
  return (
    <section className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 text-slate-900" aria-live="polite" aria-labelledby="creator-history-title">
      <h2 id="creator-history-title" className="text-lg font-semibold">Seven-day safe history deleted</h2>
      <p role="status" className="mt-2 text-sm text-slate-600">Safe history has been deleted.</p>
    </section>
  );
}
