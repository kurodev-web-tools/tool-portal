"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CommentTranslatorRealCommentsDisplayRow } from "@/lib/comment-translator-real-comments-feed-shared";

const moderatorRefreshIntervalMs = 15_000;

type ModeratorSafeRow = Pick<
  CommentTranslatorRealCommentsDisplayRow,
  | "authorLabel"
  | "authorDisplayName"
  | "originalText"
  | "translatedText"
  | "badgeLabel"
  | "purchaseLabel"
  | "sourceAttributionLabel"
  | "translationStatus"
  | "moderationLabel"
>;

export type CommentTranslatorModeratorShareFeed =
  | { readonly status: "ready"; readonly rows: readonly ModeratorSafeRow[] }
  | { readonly status: "unavailable" };

const moderatorStateLabels = {
  visible: "Visible",
  deleted: "Deleted",
  banned: "Banned",
  ended: "Stream ended",
  system: "System event"
} as const satisfies Record<ModeratorSafeRow["moderationLabel"], string>;

export function CommentTranslatorModeratorShare({
  feed,
  showCredentialForm
}: {
  readonly feed: CommentTranslatorModeratorShareFeed;
  readonly showCredentialForm: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    const refreshHandle = window.setInterval(() => router.refresh(), moderatorRefreshIntervalMs);
    return () => window.clearInterval(refreshHandle);
  }, [router]);

  if (feed.status !== "ready") return <CommentTranslatorModeratorShareUnavailable showCredentialForm={showCredentialForm} />;

  return (
    <main className="comment-translator-moderator-share-canvas" aria-live="polite">
      <section className="comment-translator-moderator-share-feed" aria-label="Read-only translated comments">
        <header className="comment-translator-moderator-share-header">
          <p>Comment Translator</p>
          <h1>Moderator share</h1>
          <span>Read-only safe feed</span>
        </header>
        {feed.rows.length > 0 ? (
          <ol className="comment-translator-moderator-share-rows">
            {feed.rows.map((row, index) => <ModeratorFeedRow key={`${index}-${row.sourceAttributionLabel}`} row={row} />)}
          </ol>
        ) : (
          <p className="comment-translator-moderator-share-empty">No safe comments are currently available.</p>
        )}
      </section>
    </main>
  );
}

function ModeratorFeedRow({ row }: { readonly row: ModeratorSafeRow }) {
  const unavailable = row.moderationLabel !== "visible";
  const moderationStateLabel = resolveModeratorStateLabel(row.moderationLabel);
  const translationLabel = row.translationStatus === "translated-f10" ? "Translated" : "Translation unavailable";
  const safeText = unavailable ? "Comment unavailable" : row.translatedText ?? row.originalText ?? "Comment unavailable";
  return (
    <li className="comment-translator-moderator-share-row">
      <div className="comment-translator-moderator-share-row-header">
        <strong>{row.authorDisplayName ?? row.authorLabel}</strong>
        {row.badgeLabel ? <span>{row.badgeLabel}</span> : null}
        {row.purchaseLabel ? <span>{row.purchaseLabel}</span> : null}
      </div>
      <p className="comment-translator-moderator-share-text">{safeText}</p>
      <p className="comment-translator-moderator-share-state">{unavailable ? moderationStateLabel : `${moderationStateLabel} · ${translationLabel}`}</p>
      {!unavailable && row.originalText ? (
        <details className="comment-translator-moderator-share-original">
          <summary>Original</summary>
          <p>{row.originalText}</p>
        </details>
      ) : null}
      <p className="comment-translator-moderator-share-source">{row.sourceAttributionLabel}</p>
    </li>
  );
}

function resolveModeratorStateLabel(label: ModeratorSafeRow["moderationLabel"]): string {
  return moderatorStateLabels[label];
}

function CommentTranslatorModeratorShareUnavailable({
  showCredentialForm
}: {
  readonly showCredentialForm: boolean;
}) {
  return (
    <main className="comment-translator-moderator-share-canvas" aria-live="polite">
      <section className="comment-translator-moderator-share-unavailable" aria-labelledby="moderator-share-title">
        <p>Comment Translator</p>
        <h1 id="moderator-share-title">Moderator view unavailable</h1>
        <p>This read-only feed is unavailable.</p>
        {showCredentialForm ? (
          <form action="/api/comment-translator/moderator-share/session/" method="post" className="comment-translator-moderator-share-form">
            <label htmlFor="moderatorShareCredential">Share credential</label>
            <input
              id="moderatorShareCredential"
              name="moderatorShareCredential"
              type="password"
              required
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
            />
            <button type="submit">Open moderator view</button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
