import type { CommentTranslatorComment, CommentTranslatorDisplayMode, CommentTranslatorStatusFilter } from "@/lib/comment-translator";
import type { CommentTranslatorAuthorDisplayNamePolicy } from "@/lib/comment-translator-real-comments-feed-shared";
import { CommentTranslatorCommentCard } from "./CommentTranslatorCommentCard";
import type { CommentTranslatorUiCopy, OperatorSessionState } from "./comment-translator-dock-model";

export function CommentTranslatorFeedPanel({ locale, copy, commentOnly, sessionStatus, authorDisplayNamePolicy, searchQuery, statusFilter, statusFilters, filteredComments, publicCommentCount, translatedCount, displayMode, targetLanguageLabel, isPending, hasRetainedRows, errorMessage, unavailableMessage, onNormalView, onSearchQueryChange, onStatusFilterChange, onRefresh, onClear }: {
  readonly locale: "ja" | "en";
  readonly copy: CommentTranslatorUiCopy;
  readonly commentOnly: boolean;
  readonly sessionStatus: OperatorSessionState["status"];
  readonly authorDisplayNamePolicy: CommentTranslatorAuthorDisplayNamePolicy;
  readonly searchQuery: string;
  readonly statusFilter: CommentTranslatorStatusFilter;
  readonly statusFilters: readonly { readonly id: CommentTranslatorStatusFilter }[];
  readonly filteredComments: readonly CommentTranslatorComment[];
  readonly publicCommentCount: number;
  readonly translatedCount: number;
  readonly displayMode: CommentTranslatorDisplayMode;
  readonly targetLanguageLabel: string;
  readonly isPending: boolean;
  readonly hasRetainedRows: boolean;
  readonly errorMessage: string | null;
  readonly unavailableMessage: string | null;
  readonly onNormalView: () => void;
  readonly onSearchQueryChange: (value: string) => void;
  readonly onStatusFilterChange: (value: CommentTranslatorStatusFilter) => void;
  readonly onRefresh: () => void;
  readonly onClear: () => void;
}) {
  return (
    <main data-comment-translator-real-comments-feed="server-owned-safe-rows" data-comment-translator-obs-dock-display-name-policy={authorDisplayNamePolicy.marker} className="panel flex min-h-[34rem] min-w-0 flex-col overflow-hidden">
      <div data-layout="live-header-two-row" className="grid gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-primary-strong">{copy.sections.comments}</p><h2 className="mt-1 break-words text-xl font-black tracking-tight text-foreground">{commentOnly ? locale === "ja" ? "コメントのみ表示" : "Comments only" : locale === "ja" ? <><span className="inline-block">YouTubeチャット</span><span className="inline-block">公開版プレビュー</span></> : copy.header.feedTitle}</h2></div>{commentOnly ? <button type="button" onClick={onNormalView} className="min-h-10 rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">{locale === "ja" ? "通常表示へ戻る" : "Back to normal"}</button> : <div className="flex flex-wrap gap-2"><span className="rounded-base border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-black text-primary-strong">{translatedCount} {copy.stats.translated}</span><span className="rounded-base border border-border bg-surface px-2.5 py-1 text-xs font-black text-muted">{authorDisplayNamePolicy.showSafeAuthorDisplayName ? copy.displayNamePolicy.streamSafeShownBadge : copy.displayNamePolicy.streamSafeDefaultBadge}</span></div>}</div>
        {!commentOnly ? <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><label className="min-w-0"><span className="sr-only">{copy.controls.searchPlaceholder}</span><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder={copy.controls.searchPlaceholder} className="min-h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm placeholder:text-muted hover:border-primary/60 focus:border-primary" /></label><div className="flex min-w-0 flex-wrap gap-2"><span data-comment-translator-preview-feed-auto-refresh="active-session-safe-periodic" className="inline-flex min-h-10 items-center rounded-base border border-border bg-surface px-3 py-2 text-xs font-black text-muted">{sessionStatus === "active" ? locale === "ja" ? "自動更新中" : "Auto refresh on" : locale === "ja" ? "自動更新停止中" : "Auto refresh off"}</span><button type="button" onClick={onRefresh} disabled={isPending} className="min-h-10 rounded-base border border-primary bg-primary px-3 py-2 text-xs font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70">{isPending ? locale === "ja" ? "更新中" : "Refreshing" : locale === "ja" ? "コメント更新" : "Refresh"}</button>{statusFilters.map((filter) => { const selected = filter.id === statusFilter; return <button key={filter.id} type="button" onClick={() => onStatusFilterChange(filter.id)} className={["min-h-10 rounded-base border px-3 py-2 text-xs font-black transition", selected ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface text-muted hover:border-primary/60 hover:bg-primary-soft/40"].join(" ")}>{copy.filters[filter.id]}</button>; })}</div></div> : null}
        {hasRetainedRows ? <div data-comment-translator-preview-retention="stopped-previous-results" className="rounded-base border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="break-words font-black">{copy.operatorSession.previousResultsTitle}</p><p className="mt-1 break-words font-semibold leading-5 text-amber-800">{copy.operatorSession.previousResultsBody}</p></div><button type="button" data-comment-translator-preview-clear="manual-safe-feed-clear" onClick={onClear} disabled={isPending} className="min-h-10 rounded-base border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70">{isPending ? locale === "ja" ? "クリア中" : "Clearing" : copy.actions.clearPreview}</button></div></div> : null}
      </div>
      {!commentOnly ? <div className="grid grid-cols-2 gap-2 border-b border-border bg-surface-muted/30 p-3 text-center text-xs font-bold text-muted sm:grid-cols-3"><span className="rounded-base bg-surface px-2 py-2">{filteredComments.length} {copy.stats.shown}</span><span className="rounded-base bg-surface px-2 py-2">{publicCommentCount} {copy.stats.total}</span><span className="rounded-base bg-emerald-50 px-2 py-2 text-emerald-700">{translatedCount} {copy.stats.translated}</span></div> : null}
      <div className="scrollbar-accent min-h-0 flex-1 space-y-3 overflow-auto p-3 sm:p-4">{filteredComments.length > 0 ? filteredComments.map((comment) => <CommentTranslatorCommentCard key={comment.id} comment={comment} displayMode={displayMode} authorDisplayNamePolicy={authorDisplayNamePolicy} targetLanguageLabel={targetLanguageLabel} copy={copy} />) : <div className="grid min-h-72 place-items-center rounded-base border border-dashed border-border bg-background/70 p-4 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-base bg-surface-muted text-2xl text-muted">...</div><p className="mt-3 text-sm font-black text-foreground">{locale === "ja" ? <><span className="inline-block">一致するコメントは</span><span className="inline-block">ありません</span></> : copy.empty.title}</p><p className="mt-1 text-xs leading-5 text-muted">{errorMessage ?? unavailableMessage ?? copy.empty.body}</p></div></div>}</div>
    </main>
  );
}
