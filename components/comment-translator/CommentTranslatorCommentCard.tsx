import type { CommentTranslatorComment, CommentTranslatorDisplayMode } from "@/lib/comment-translator";
import type { CommentTranslatorAuthorDisplayNamePolicy } from "@/lib/comment-translator-real-comments-feed-shared";
import { readCommentTranslatorProjectedPriority } from "@/lib/comment-translator-priority-classification";
import { skipReasonLabel, statusClassName, statusLabel } from "./comment-translator-dock-format";
import type { CommentTranslatorUiCopy } from "./comment-translator-dock-model";

export function CommentTranslatorCommentCard({ comment, displayMode, authorDisplayNamePolicy, targetLanguageLabel, copy }: {
  readonly comment: CommentTranslatorComment;
  readonly displayMode: CommentTranslatorDisplayMode;
  readonly authorDisplayNamePolicy: CommentTranslatorAuthorDisplayNamePolicy;
  readonly targetLanguageLabel: string;
  readonly copy: CommentTranslatorUiCopy;
}) {
  const showOriginal = displayMode === "both" || displayMode === "original";
  const showTranslated = (displayMode === "both" || displayMode === "translated") && Boolean(comment.translatedText);
  const showTranslatedFallback = displayMode === "translated" && !comment.translatedText;
  const priority = readCommentTranslatorProjectedPriority(comment.priority);
  const safeBadgeLabel = priority.badgeLabel ?? (comment.source !== "manual" ? comment.badge : undefined);
  return (
    <article className={["rounded-base border bg-surface p-3 shadow-sm sm:p-4", comment.badge === "support" ? "border-amber-200 bg-amber-50/35" : "border-border", comment.status === "error" ? "border-red-200 bg-red-50/35" : ""].join(" ")}>
      <div className="grid gap-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-start">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-base bg-primary-soft text-sm font-black text-primary-strong">{comment.authorName.slice(0, 1)}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 data-comment-translator-preview-author-display-name="safe-display-name" data-comment-translator-obs-dock-author-display-name={authorDisplayNamePolicy.marker} className={["min-w-0 max-w-full text-sm font-black text-foreground", authorDisplayNamePolicy.streamSafe ? "max-w-[11rem] truncate" : "break-words"].join(" ")}>{comment.authorName}</h3>
            <span className="rounded-base bg-surface-muted px-2 py-1 text-[11px] font-bold text-muted">{comment.timestamp}</span>
            {comment.source === "manual" ? <span className="rounded-base border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-bold text-cyan-700">{copy.manualInput.sourceBadge}</span> : null}
            {comment.source === "server" && comment.sourceLabel ? <span className="rounded-base border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">{comment.sourceLabel}</span> : null}
            {safeBadgeLabel ? <span className="rounded-base border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">{safeBadgeLabel}</span> : null}
          </div>
          <div className="mt-3 grid gap-2">
            {showOriginal ? <div className="grid min-w-0 gap-2 rounded-base border border-border/70 bg-background/60 p-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)]"><span className="w-fit rounded-base bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">{comment.sourceLanguage}</span><p className="min-w-0 break-words text-sm leading-6 text-foreground">{comment.originalText}</p></div> : null}
            {showTranslated ? <div className="grid min-w-0 gap-2 rounded-base border border-emerald-200 bg-emerald-50/60 p-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)]"><span className="w-fit rounded-base bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800">{comment.targetLanguage}</span><p className="min-w-0 break-words text-sm font-semibold leading-6 text-foreground">{comment.translatedText}</p></div> : null}
            {showTranslatedFallback ? <div className="rounded-base border border-dashed border-border bg-surface-muted/50 p-2.5"><p className="text-sm font-bold leading-6 text-muted">{copy.commentMeta.noTranslatedText} {targetLanguageLabel}</p></div> : null}
          </div>
          {comment.skipReason || comment.errorMessage ? <div className="mt-3 flex flex-wrap gap-2">
            {comment.skipReason ? <span className="rounded-base border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{copy.commentMeta.skipped}: {skipReasonLabel(comment.skipReason, copy)}</span> : null}
            {comment.errorMessage ? <span className="rounded-base border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">{copy.commentMeta.error}: {comment.errorMessage}</span> : null}
          </div> : null}
        </div>
        <span className={["w-fit rounded-base border px-2.5 py-1 text-xs font-black", statusClassName(comment.status)].join(" ")}>{statusLabel(comment, copy)}</span>
      </div>
    </article>
  );
}
