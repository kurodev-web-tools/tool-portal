"use client";

import { useState, useTransition } from "react";
import { getCommentTranslatorCreatorHistoryAction } from "@/app/tools/comment-translator/actions";
import type {
  CommentTranslatorCreatorHistoryDisplayRow,
  CommentTranslatorCreatorHistoryState
} from "@/lib/comment-translator-creator-history";
import { readCommentTranslatorProjectedPriority } from "@/lib/comment-translator-priority-classification";

export function CommentTranslatorCreatorHistoryPanel({
  locale
}: {
  readonly locale: "ja" | "en";
}) {
  const [history, setHistory] = useState<CommentTranslatorCreatorHistoryState | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      setHistory(await getCommentTranslatorCreatorHistoryAction());
    });
  };

  return (
    <section
      data-comment-translator-creator-history="server-owned-seven-day"
      className="panel grid min-w-0 gap-3 p-4 sm:p-5"
      aria-labelledby="comment-translator-history-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary-strong">Creator</p>
          <h2
            id="comment-translator-history-title"
            className="mt-1 break-words text-xl font-black tracking-tight text-foreground"
          >
            {locale === "ja" ? "過去7日間の履歴" : "7-day history"}
          </h2>
          <p className="mt-2 break-words text-sm leading-6 text-muted">
            {locale === "ja"
              ? "サーバーに保存された安全な表示項目だけを、直近7日分表示します。"
              : "Shows only browser-safe projected fields retained by the server for the last 7 days."}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isPending}
          className="min-h-11 rounded-base border border-primary bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
        >
          {isPending
            ? locale === "ja"
              ? "読み込み中"
              : "Loading"
            : locale === "ja"
              ? "履歴を表示"
              : "Load history"}
        </button>
      </div>
      {history?.status === "unavailable" ? (
        <p className="rounded-base border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
          {locale === "ja"
            ? "履歴を安全に読み込めませんでした。"
            : "History is unavailable because it could not be read safely."}
        </p>
      ) : null}
      {history?.status === "ready" && history.entries.length === 0 ? (
        <p className="rounded-base border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
          {locale === "ja" ? "過去7日間の履歴はありません。" : "No history is available for the last 7 days."}
        </p>
      ) : null}
      {history?.status === "ready" && history.entries.length > 0 ? (
        <ol className="m-0 grid list-none gap-4 p-0" aria-label="7-day history">
          {history.entries.map((entry, entryIndex) => (
            <li key={`${entry.recordedAtIso}-${entryIndex}`} className="grid min-w-0 gap-3">
              <p className="text-xs font-black text-muted">
                {formatHistoryTimestamp(entry.recordedAtIso, locale)}
              </p>
              <ol className="m-0 grid list-none gap-3 p-0">
                {entry.rows.map((row, index) => (
                  <HistoryRow
                    key={`${entry.recordedAtIso}-${row.publishedAtIso}-${index}`}
                    row={row}
                    locale={locale}
                  />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function HistoryRow({
  row,
  locale
}: {
  readonly row: CommentTranslatorCreatorHistoryDisplayRow;
  readonly locale: "ja" | "en";
}) {
  const priority = readCommentTranslatorProjectedPriority(row.priority);
  const moderationLabel = readModerationLabel(row, locale);
  return (
    <li
      data-priority-category={priority.category}
      className="min-w-0 rounded-base border border-border bg-surface p-3 shadow-sm sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <strong className="break-words text-foreground">
          {row.authorDisplayName ?? row.authorLabel}
        </strong>
        <span className="rounded-base bg-surface-muted px-2 py-1 text-xs font-bold text-muted">
          {formatHistoryTimestamp(row.publishedAtIso, locale)}
        </span>
        {priority.badgeLabel ? (
          <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-black text-primary-strong">
            {priority.badgeLabel}
          </span>
        ) : null}
        {moderationLabel ? (
          <span className="rounded-full border border-border bg-surface-muted px-2 py-1 text-xs font-black text-foreground">
            {moderationLabel}
          </span>
        ) : null}
      </div>
      {row.translatedText ? (
        <p className="mt-3 break-words text-base font-bold leading-7 text-foreground">
          {row.translatedText}
        </p>
      ) : moderationLabel ? (
        <p className="mt-3 break-words text-sm font-bold leading-6 text-muted">{moderationLabel}</p>
      ) : null}
      {row.originalText ? (
        <details className="mt-3 text-sm text-muted">
          <summary className="w-fit cursor-pointer font-bold text-foreground">
            {locale === "ja" ? "原文" : "Original"}
          </summary>
          <p className="mt-2 break-words leading-6">{row.originalText}</p>
        </details>
      ) : null}
      {row.purchaseLabel ? (
        <p className="mt-2 break-words text-sm font-bold text-primary-strong">
          {row.purchaseLabel}
        </p>
      ) : null}
      <p className="mt-3 text-xs font-bold text-muted">Source: YouTube Live Chat</p>
    </li>
  );
}

function readModerationLabel(
  row: CommentTranslatorCreatorHistoryDisplayRow,
  locale: "ja" | "en"
): string | null {
  if (row.moderationLabel === "deleted") return locale === "ja" ? "削除済み" : "Deleted";
  if (row.moderationLabel === "banned") return locale === "ja" ? "ブロック済み" : "Banned";
  if (row.moderationLabel === "ended") return locale === "ja" ? "配信終了" : "Stream ended";
  if (row.moderationLabel === "system") return locale === "ja" ? "システム" : "System";
  return null;
}

function formatHistoryTimestamp(value: string, locale: "ja" | "en"): string {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
