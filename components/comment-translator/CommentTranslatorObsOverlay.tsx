import {
  resolveCommentTranslatorAuthorDisplayName,
  resolveCommentTranslatorAuthorDisplayNamePolicy,
  sortCommentTranslatorRealCommentsFeedRowsNewestFirst,
  type CommentTranslatorRealCommentsFeedState
} from "@/lib/comment-translator-real-comments-feed-shared";
import { readCommentTranslatorProjectedPriority } from "@/lib/comment-translator-priority-classification";

const authorDisplayNamePolicy = resolveCommentTranslatorAuthorDisplayNamePolicy({
  surfaceMode: "obs-browser-dock",
  viewMode: "comments",
  showSafeAuthorDisplayNamesInStreamSafeMode: false
});

export function CommentTranslatorObsOverlay({ feed }: { readonly feed: CommentTranslatorRealCommentsFeedState }) {
  const rows = sortCommentTranslatorRealCommentsFeedRowsNewestFirst(feed.rows).filter(
    (row) => row.translationStatus === "translated-f10" && Boolean(row.translatedText)
  );

  if (feed.status !== "ready" || rows.length === 0) {
    return <CommentTranslatorObsOverlayUnavailable showCredentialForm={false} />;
  }

  return (
    <main data-comment-translator-obs-overlay-root="ready" className="obs-overlay-root" aria-live="polite">
      <ol className="obs-overlay-stack" aria-label="Latest translated comments">
        {rows.map((row) => {
          const priority = readCommentTranslatorProjectedPriority(row.priority);
          return (
            <li key={row.id} data-priority-category={priority.category} className="obs-overlay-card">
              <div className="obs-overlay-card-header">
                <strong>{resolveCommentTranslatorAuthorDisplayName({ row, policy: authorDisplayNamePolicy })}</strong>
                {priority.badgeLabel || row.badgeLabel ? (
                  <span className="obs-overlay-badge">{priority.badgeLabel ?? row.badgeLabel}</span>
                ) : null}
                {row.purchaseLabel ? <span className="obs-overlay-purchase">{row.purchaseLabel}</span> : null}
              </div>
              <p className="obs-overlay-translation">{row.translatedText}</p>
              {row.originalText ? (
                <details className="obs-overlay-original">
                  <summary>Original</summary>
                  <p>{row.originalText}</p>
                </details>
              ) : null}
              <p className="obs-overlay-source">{row.sourceAttributionLabel}</p>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

export function CommentTranslatorObsOverlayUnavailable({
  showCredentialForm
}: {
  readonly showCredentialForm: boolean;
}) {
  return (
    <main data-comment-translator-obs-overlay-root="unavailable" className="obs-overlay-root obs-overlay-unavailable">
      <section className="obs-overlay-unavailable-card" aria-labelledby="obs-overlay-unavailable-title">
        <p className="obs-overlay-kicker">Comment Translator</p>
        <h1 id="obs-overlay-unavailable-title">Overlay unavailable</h1>
        <p>The overlay cannot read an active translated-comment session.</p>
        {showCredentialForm ? (
          <form action="/api/comment-translator/obs-overlay/session/" method="post" className="obs-overlay-credential-form">
            <label htmlFor="overlayCredential">Overlay credential</label>
            <input
              id="overlayCredential"
              name="overlayCredential"
              type="password"
              required
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
            />
            <button type="submit">Open overlay</button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
