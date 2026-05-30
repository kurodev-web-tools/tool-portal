import {
  mockTranslationProvider,
  type CommentTranslatorComment
} from "@/lib/comment-translator";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function statusClassName(status: CommentTranslatorComment["status"]) {
  if (status === "translated") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "skipped") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function statusLabel(comment: CommentTranslatorComment) {
  if (comment.status === "translated") {
    return comment.cacheStatus === "hit" ? "cached" : "translated";
  }

  return comment.status;
}

function CommentCard({ comment }: { comment: CommentTranslatorComment }) {
  return (
    <article
      className={[
        "rounded-base border bg-surface p-3 shadow-sm sm:p-4",
        comment.badge === "support" ? "border-amber-200 bg-amber-50/35" : "border-border",
        comment.status === "error" ? "border-red-200 bg-red-50/35" : ""
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-base bg-primary-soft text-sm font-black text-primary-strong">
          {comment.authorName.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-black text-foreground">{comment.authorName}</h3>
            <span className="rounded-base bg-surface-muted px-2 py-1 text-[11px] font-bold text-muted">
              {comment.timestamp}
            </span>
            {comment.badge ? (
              <span className="rounded-base border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                {comment.badge}
              </span>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2">
            <div className="grid gap-2 rounded-base border border-border/70 bg-background/60 p-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
              <span className="w-fit rounded-base bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                {comment.sourceLanguage}
              </span>
              <p className="min-w-0 break-words text-sm leading-6 text-foreground">
                {comment.originalText}
              </p>
            </div>
            {comment.translatedText ? (
              <div className="grid gap-2 rounded-base border border-emerald-200 bg-emerald-50/60 p-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
                <span className="w-fit rounded-base bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800">
                  {comment.targetLanguage}
                </span>
                <p className="min-w-0 break-words text-sm font-semibold leading-6 text-foreground">
                  {comment.translatedText}
                </p>
              </div>
            ) : null}
          </div>
          {comment.skipReason || comment.errorMessage ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {comment.skipReason ? (
                <span className="rounded-base border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                  skipped: {comment.skipReason}
                </span>
              ) : null}
              {comment.errorMessage ? (
                <span className="rounded-base border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                  error: {comment.errorMessage}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <span className={["rounded-base border px-2.5 py-1 text-xs font-black", statusClassName(comment.status)].join(" ")}>
          {statusLabel(comment)}
        </span>
      </div>
    </article>
  );
}

function StatTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-base border border-border bg-surface p-3">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-normal text-foreground">{value}</p>
      <p className="mt-1 text-xs font-semibold text-primary-strong">{helper}</p>
    </div>
  );
}

export function CommentTranslatorDock() {
  const { platform, settings, quota, skipReasons, comments } = mockTranslationProvider.getSnapshot();
  const quotaPercent = Math.round((quota.usedUnits / quota.limitUnits) * 100);

  return (
    <div className="h-full min-h-0 overflow-auto bg-background px-3 py-3 sm:px-4 lg:px-5">
      <div className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col gap-3">
        <header className="panel sticky top-0 z-20 flex flex-col gap-3 p-3 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-base bg-red-600 text-sm font-black text-white">
              ▶
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-lg font-black tracking-tight text-foreground sm:text-xl">
                Kuro Live Comment Translator
              </h1>
              <p className="mt-1 text-xs font-semibold text-muted">
                YouTube first / broadcaster-only mock
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-xs font-bold sm:grid-cols-3 lg:min-w-[28rem]">
            <span className="rounded-base border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              Live mock
            </span>
            <span className="rounded-base border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              Read-only Dock
            </span>
            <span className="rounded-base border border-border bg-surface-muted px-3 py-2 text-muted">
              Target {settings.targetLanguage.toUpperCase()} {settings.targetLanguageLabel}
            </span>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[19rem_minmax(0,1fr)] 2xl:grid-cols-[20rem_minmax(0,1fr)_20rem]">
          <aside className="grid content-start gap-3">
            <section className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-foreground">Setup / Connection</h2>
                <span className="rounded-base bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                  {platform.statusLabel}
                </span>
              </div>
              <div className="mt-4 rounded-base border border-border bg-surface-muted/50 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-base bg-red-600 text-xs font-black text-white">
                    ▶
                  </span>
                  <div>
                    <p className="text-sm font-black text-foreground">{platform.name}</p>
                    <p className="text-xs font-semibold text-muted">{platform.streamTitle}</p>
                  </div>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Mode</dt>
                    <dd className="font-black text-primary-strong">{platform.mode}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Channel</dt>
                    <dd className="break-words font-semibold text-foreground">{platform.channelName}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="panel p-4">
              <h2 className="text-base font-black text-foreground">Display Settings</h2>
              <div className="mt-4 grid gap-3">
                {[
                  ["Source", "Auto detect"],
                  ["Target", `${settings.targetLanguage.toUpperCase()} ${settings.targetLanguageLabel}`],
                  ["View", "Original + translated"],
                  ["Surface", "OBS Browser Dock"]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-base border border-border bg-surface-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted">{label}</span>
                    <span className="break-words text-right font-bold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-foreground">Empty State</h2>
                <span className="rounded-base bg-surface-muted px-2 py-1 text-xs font-bold text-muted">mock</span>
              </div>
              <div className="mt-4 rounded-base border border-dashed border-border bg-background/70 p-4 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-base bg-surface-muted text-2xl text-muted">
                  …
                </div>
                <p className="mt-3 text-sm font-black text-foreground">No comments yet</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Live comments will appear here when the fixture feed is empty.
                </p>
              </div>
            </section>
          </aside>

          <main className="panel flex min-h-[34rem] flex-col overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-primary-strong">Live Comments</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">
                  YouTube chat fixture
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-muted">
                <span className="rounded-base bg-surface-muted px-2 py-2">{comments.length} total</span>
                <span className="rounded-base bg-emerald-50 px-2 py-2 text-emerald-700">{quota.translatedCount} translated</span>
                <span className="rounded-base bg-amber-50 px-2 py-2 text-amber-700">{quota.skippedCount} skipped</span>
              </div>
            </div>
            <div className="scrollbar-accent min-h-0 flex-1 space-y-3 overflow-auto p-3 sm:p-4">
              {comments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
            </div>
          </main>

          <aside className="grid content-start gap-3 lg:col-span-2 2xl:col-span-1">
            <section className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-foreground">Cache / Quota Preview</h2>
                <span className="rounded-base bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                  mock data
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-surface-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${quotaPercent}%` }} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
                <StatTile label="Quota" value={`${formatNumber(quota.usedUnits)} / ${formatNumber(quota.limitUnits)}`} helper={`${quotaPercent}% used`} />
                <StatTile label="Cache hit rate" value={`${quota.cacheHitRate}%`} helper={`${formatNumber(quota.cacheHits)} cached`} />
              </div>
            </section>

            <section className="panel p-4">
              <h2 className="text-base font-black text-foreground">Skipped Reasons</h2>
              <div className="mt-4 grid gap-3">
                {skipReasons.map((reason) => (
                  <div key={reason.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                    <span className="min-w-0 break-words text-muted">{reason.label}</span>
                    <span className="rounded-base bg-amber-50 px-2 py-1 font-black text-amber-700">{reason.count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel border-red-200 bg-red-50/40 p-4">
              <h2 className="text-base font-black text-red-700">Error-like State</h2>
              <p className="mt-2 text-sm leading-6 text-red-700">
                One fixture row shows a recoverable translation failure without retrying or sending anything externally.
              </p>
            </section>

            <section className="panel border-blue-200 bg-blue-50/45 p-4">
              <h2 className="text-base font-black text-blue-800">Read-only Safety</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-900">
                <li>Viewer-facing overlay is not included.</li>
                <li>Reply generation and auto-posting are absent.</li>
                <li>All values are fixture-only for UI review.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
