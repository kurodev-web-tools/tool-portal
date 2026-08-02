"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CommentTranslatorRealCommentsFeedState } from "@/lib/comment-translator-real-comments-feed-shared";

const overlayRefreshIntervalMs = 15_000;

export function CommentTranslatorObsOverlay({
  feed
}: {
  readonly feed: CommentTranslatorRealCommentsFeedState;
}) {
  const router = useRouter();
  useEffect(() => {
    const refreshHandle = window.setInterval(() => router.refresh(), overlayRefreshIntervalMs);
    return () => window.clearInterval(refreshHandle);
  }, [router]);
  const translatedRows = feed.status === "ready"
    ? feed.rows.filter((row) => row.translationStatus === "translated-f10" && Boolean(row.translatedText))
    : [];

  return (
    <main className="comment-translator-obs-overlay-canvas" aria-live="polite">
      <section className="comment-translator-obs-overlay-feed" aria-label="Translated live comments">
        {translatedRows.map((row) => (
          <article key={row.id} className="comment-translator-obs-overlay-row">
            <div className="comment-translator-obs-overlay-row-header">
              <p className="comment-translator-obs-overlay-author">{row.authorDisplayName ?? row.authorLabel}</p>
              {row.badgeLabel ? <span className="comment-translator-obs-overlay-badge">{row.badgeLabel}</span> : null}
              {row.purchaseLabel ? <span className="comment-translator-obs-overlay-purchase">{row.purchaseLabel}</span> : null}
            </div>
            <p className="comment-translator-obs-overlay-translated">{row.translatedText}</p>
            <details className="comment-translator-obs-overlay-original">
              <summary>Original</summary>
              <p>{row.originalText ?? "Original text unavailable"}</p>
            </details>
            <p className="comment-translator-obs-overlay-source">{row.sourceAttributionLabel}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
