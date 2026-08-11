"use client";

import { useState, type FormEvent } from "react";
import type { CommentTranslatorCreatorSafeHistoryRow } from "@/lib/comment-translator-creator-history-types";
import {
  filterCommentTranslatorPriorityRows,
  readCommentTranslatorProjectedPriority,
  readCommentTranslatorPriorityFilter,
  type CommentTranslatorPriorityFilter
} from "@/lib/comment-translator-priority-classification";

export type CommentTranslatorCreatorHistoryPanelState =
  | {
      readonly status: "ready";
      readonly rows: readonly CommentTranslatorCreatorSafeHistoryRow[];
      readonly searchQuery?: string;
      readonly nextCursor?: string | null;
    }
  | { readonly status: "unavailable" }
  | { readonly status: "deleted" };

export type CommentTranslatorCreatorHistoryPanelProps = {
  readonly history: CommentTranslatorCreatorHistoryPanelState;
  readonly onSearch?: (query: string) => void;
  readonly onLoadMore?: (cursor: string) => void;
};

export const commentTranslatorCreatorHistoryPanelContract = {
  dataBoundary: "safe-history-props-only",
  lifecycleReachability: "deterministic-props-only-not-production-wired",
  searchAuthority: "optional-server-owned-callback-only",
  cursorAuthority: "opaque-prop-forward-only",
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
  history,
  onSearch,
  onLoadMore
}: CommentTranslatorCreatorHistoryPanelProps) {
  const [priorityFilter, setPriorityFilter] = useState<CommentTranslatorPriorityFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  if (history.status === "unavailable") {
    return <HistoryUnavailable />;
  }
  if (history.status === "deleted") {
    return <HistoryDeleted />;
  }
  if (history.status === "ready") {
    const filteredRows = filterCommentTranslatorPriorityRows(history.rows, priorityFilter);
    const priorityOnlyEmpty = priorityFilter === "priority" && history.rows.length > 0 && filteredRows.length === 0;
    const appliedSearchQuery = history.searchQuery ?? "";
    const searchEmpty = appliedSearchQuery.trim().length > 0;
    const hasLoadMore = Boolean(history.nextCursor && onLoadMore);
    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onSearch?.(searchInput);
    };
    const clearSearch = () => {
      setSearchInput("");
      onSearch?.("");
    };
    return (
      <section className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 text-slate-900" aria-live="polite" aria-labelledby="creator-history-title">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm text-slate-600">Creator</p>
            <h2 id="creator-history-title" className="text-lg font-semibold">Thirty-day safe history</h2>
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
        <form onSubmit={submitSearch} className="mb-4 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" aria-label="Search thirty-day safe history">
          <label className="min-w-0">
            <span className="sr-only">Search safe history</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              disabled={!onSearch}
              placeholder="Search author or comment text"
              aria-describedby="creator-history-search-help"
              className="min-h-10 w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>
          <div className="flex min-w-0 flex-wrap gap-2">
            <button type="submit" disabled={!onSearch} className="min-h-10 rounded border border-indigo-700 bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500">Search</button>
            <button type="button" onClick={clearSearch} disabled={!onSearch || searchInput.length === 0} className="min-h-10 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">Clear</button>
          </div>
          <p id="creator-history-search-help" className="text-xs text-slate-500 sm:col-span-2">Search uses only the safe author and comment text fields. Search is unavailable until the server-owned callback is wired.</p>
        </form>
        <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          <p>Only the existing thirty-day safe-history window is exported. Current retention and deletion rules continue to apply. Downloading does not delete server history or local copies.</p>
          <a href="/api/comment-translator/history/export" download className="mt-2 inline-block font-medium text-indigo-700 underline">Download safe history CSV</a>
        </div>
        {filteredRows.length === 0 ? (
          <p role="status" className="rounded-md bg-slate-50 p-3 text-sm">{priorityOnlyEmpty ? "No priority safe history is available." : searchEmpty ? "No safe history matches this search." : "No safe history is available yet."}</p>
        ) : (
          <ol className="min-w-0 space-y-3">
            {filteredRows.map((row, index) => <HistoryRow key={`${row.recordedAtIso}-${index}`} row={row} />)}
          </ol>
        )}
        {hasLoadMore ? (
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={() => onLoadMore?.(history.nextCursor as string)} className="min-h-10 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200">Load more</button>
          </div>
        ) : null}
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
      <h2 id="creator-history-title" className="text-lg font-semibold">Thirty-day safe history unavailable</h2>
      <p role="status" className="mt-2 text-sm text-slate-600">Safe history is unavailable.</p>
    </section>
  );
}

function HistoryDeleted() {
  return (
    <section className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 text-slate-900" aria-live="polite" aria-labelledby="creator-history-title">
      <h2 id="creator-history-title" className="text-lg font-semibold">Thirty-day safe history deleted</h2>
      <p role="status" className="mt-2 text-sm text-slate-600">Safe history has been deleted.</p>
    </section>
  );
}
