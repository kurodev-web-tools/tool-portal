"use client";

import { useState } from "react";
import {
  resolveCommentTranslatorAuthorDisplayName,
  resolveCommentTranslatorAuthorDisplayNamePolicy,
  sortCommentTranslatorRealCommentsFeedRowsNewestFirst,
  type CommentTranslatorRealCommentsDisplayRow,
  type CommentTranslatorRealCommentsFeedState
} from "@/lib/comment-translator-real-comments-feed-shared";
import {
  filterCommentTranslatorPriorityRows,
  readCommentTranslatorProjectedPriority,
  type CommentTranslatorPriorityFilter
} from "@/lib/comment-translator-priority-classification";

const authorDisplayNamePolicy = resolveCommentTranslatorAuthorDisplayNamePolicy({
  surfaceMode: "narrow-viewport",
  viewMode: "normal",
  showSafeAuthorDisplayNamesInStreamSafeMode: false
});

export function CommentTranslatorModeratorShare({
  feed
}: {
  readonly feed: CommentTranslatorRealCommentsFeedState;
}) {
  const [priorityFilter, setPriorityFilter] = useState<CommentTranslatorPriorityFilter>("all");
  const availableRows = sortCommentTranslatorRealCommentsFeedRowsNewestFirst(feed.rows).filter(
    (row) =>
      (row.translationStatus === "translated-f10" && Boolean(row.translatedText)) ||
      row.moderationLabel !== "visible"
  );

  if (feed.status !== "ready" || availableRows.length === 0) {
    return <CommentTranslatorModeratorShareUnavailable showCredentialForm={false} />;
  }
  const rows = filterCommentTranslatorPriorityRows(availableRows, priorityFilter);

  return (
    <main
      data-comment-translator-moderator-share-root="ready"
      className="min-h-[100dvh] bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid w-full max-w-4xl gap-4">
        <header className="rounded-base border border-border bg-surface p-4 shadow-panel sm:p-6">
          <p className="m-0 text-xs font-black uppercase tracking-widest text-primary">Comment Translator</p>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">Moderator share</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Read-only translated feed. This view cannot control the creator session or change comments.
          </p>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Priority filter">
            {(["all", "priority"] as const).map((filter) => {
              const selected = filter === priorityFilter;
              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPriorityFilter(filter)}
                  className={[
                    "min-h-11 rounded-base border px-4 py-2 text-sm font-black transition",
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-muted hover:border-primary/60 hover:bg-primary-soft/40"
                  ].join(" ")}
                >
                  {filter === "priority" ? "Priority" : "All comments"}
                </button>
              );
            })}
          </div>
        </header>
        {rows.length > 0 ? (
          <ol className="m-0 grid list-none gap-3 p-0" aria-label="Latest translated comments">
            {rows.map((row) => (
              <ModeratorFeedCard key={row.id} row={row} />
            ))}
          </ol>
        ) : (
          <p className="rounded-base border border-dashed border-border bg-surface p-5 text-sm font-bold text-muted">
            No priority comments in this feed.
          </p>
        )}
      </div>
    </main>
  );
}

function ModeratorFeedCard({ row }: { readonly row: CommentTranslatorRealCommentsDisplayRow }) {
  const priority = readCommentTranslatorProjectedPriority(row.priority);
  const stateLabel = resolveModerationStateLabel(row);
  const displayText = row.translatedText ?? stateLabel;
  const safeBadgeLabel = priority.badgeLabel ?? (row.badgeLabel === "system" ? "System" : null);

  return (
    <li
      data-priority-category={priority.category}
      className="min-w-0 rounded-base border border-border bg-surface p-4 shadow-panel sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <strong className="break-words text-foreground">
          {resolveCommentTranslatorAuthorDisplayName({ row, policy: authorDisplayNamePolicy })}
        </strong>
        {safeBadgeLabel ? <SafeBadge>{safeBadgeLabel}</SafeBadge> : null}
        {stateLabel ? <StateBadge>{stateLabel}</StateBadge> : null}
      </div>
      <p className="mt-3 break-words text-lg font-bold leading-7 text-foreground sm:text-xl">
        {displayText}
      </p>
      {row.purchaseLabel ? (
        <p className="mt-2 break-words text-sm font-bold text-primary-strong">{row.purchaseLabel}</p>
      ) : null}
      {row.memberMonthCount ? (
        <p className="mt-2 text-sm text-muted">Member month {row.memberMonthCount}</p>
      ) : null}
      {row.originalText && row.moderationLabel === "visible" ? (
        <details className="mt-3 text-sm text-muted">
          <summary className="w-fit cursor-pointer font-bold text-foreground">Original</summary>
          <p className="mt-2 break-words leading-6">{row.originalText}</p>
        </details>
      ) : null}
      <p className="mt-3 text-xs font-bold text-muted">{row.sourceAttributionLabel}</p>
    </li>
  );
}

function SafeBadge({ children }: { readonly children: string }) {
  return (
    <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-black text-primary-strong">
      {children}
    </span>
  );
}

function StateBadge({ children }: { readonly children: string }) {
  return (
    <span className="rounded-full border border-border bg-surface-muted px-2 py-1 text-xs font-black text-foreground">
      {children}
    </span>
  );
}

function resolveModerationStateLabel(row: CommentTranslatorRealCommentsDisplayRow): string | null {
  if (row.moderationLabel === "deleted") return "Deleted";
  if (row.moderationLabel === "banned") return "Banned";
  if (row.moderationLabel === "ended") return "Stream ended";
  if (row.moderationLabel === "system") return "System";
  return null;
}

export function CommentTranslatorModeratorShareUnavailable({
  showCredentialForm
}: {
  readonly showCredentialForm: boolean;
}) {
  return (
    <main
      data-comment-translator-moderator-share-root="unavailable"
      className="grid min-h-[100dvh] place-items-center bg-background px-4 py-6 text-foreground sm:px-6"
    >
      <section
        className="w-full max-w-md rounded-base border border-border bg-surface p-5 shadow-panel sm:p-6"
        aria-labelledby="moderator-share-unavailable-title"
      >
        <p className="m-0 text-xs font-black uppercase tracking-widest text-primary">Comment Translator</p>
        <h1 id="moderator-share-unavailable-title" className="mt-2 text-2xl font-black leading-tight">
          Moderator view unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          This read-only translated feed is not available. Ask the creator for a current share credential.
        </p>
        {showCredentialForm ? (
          <form
            action="/api/comment-translator/moderator-share/session/"
            method="post"
            className="mt-4 grid gap-2"
          >
            <label htmlFor="moderatorShareCredential" className="text-sm font-bold">
              Share credential
            </label>
            <input
              id="moderatorShareCredential"
              name="moderatorShareCredential"
              type="password"
              required
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              className="min-h-11 min-w-0 rounded-base border border-border bg-surface px-3 py-2 text-foreground"
            />
            <button
              type="submit"
              className="min-h-11 rounded-base bg-primary px-4 py-2 font-black text-surface hover:bg-primary-strong active:bg-primary-strong"
            >
              Open moderator view
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
