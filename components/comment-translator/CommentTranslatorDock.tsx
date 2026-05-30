"use client";

import { useState } from "react";
import {
  commentTranslatorConnectionStates,
  commentTranslatorDisplayModeOptions,
  commentTranslatorQuotaScenarios,
  commentTranslatorSourceLanguageOptions,
  commentTranslatorStatusFilters,
  commentTranslatorStreamOptions,
  commentTranslatorSurfaceOptions,
  commentTranslatorTargetLanguageOptions,
  filterCommentTranslatorComments,
  findCommentTranslatorOption,
  mockTranslationProvider,
  type CommentTranslatorComment,
  type CommentTranslatorConnectionStateId,
  type CommentTranslatorDisplayMode,
  type CommentTranslatorQuotaScenarioId,
  type CommentTranslatorSourceLanguageId,
  type CommentTranslatorStatusFilter,
  type CommentTranslatorSurfaceMode,
  type CommentTranslatorTargetLanguageId
} from "@/lib/comment-translator";

type SelectOption = {
  id: string;
  label: string;
  helper?: string;
  shortLabel?: string;
};

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

function toneClassName(tone: "normal" | "warning" | "empty" | "error") {
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50/45 text-amber-800";
  }

  if (tone === "empty") {
    return "border-border bg-surface-muted/50 text-muted";
  }

  if (tone === "error") {
    return "border-red-200 bg-red-50/45 text-red-700";
  }

  return "border-emerald-200 bg-emerald-50/45 text-emerald-700";
}

function statusLabel(comment: CommentTranslatorComment) {
  if (comment.status === "translated") {
    return comment.cacheStatus === "hit" ? "cached" : "translated";
  }

  return comment.status;
}

function ControlSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span className="text-xs font-black uppercase tracking-normal text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/60 focus:border-primary"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SegmentedControl({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-black uppercase tracking-normal text-muted">{label}</p>
      <div role="group" aria-label={label} className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={[
                "min-h-14 rounded-base border px-3 py-2 text-left transition",
                selected
                  ? "border-primary bg-primary-soft text-primary-strong"
                  : "border-border bg-surface text-foreground hover:border-primary/60 hover:bg-primary-soft/40"
              ].join(" ")}
            >
              <span className="block text-sm font-black">{option.label}</span>
              {option.helper ? (
                <span className={["mt-0.5 block text-xs leading-5", selected ? "text-primary-strong" : "text-muted"].join(" ")}>
                  {option.helper}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-base border border-border bg-surface p-3">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-2 break-words text-2xl font-black tracking-normal text-foreground">{value}</p>
      <p className="mt-1 break-words text-xs font-semibold text-primary-strong">{helper}</p>
    </div>
  );
}

function CommentCard({
  comment,
  displayMode,
  targetLanguageLabel
}: {
  comment: CommentTranslatorComment;
  displayMode: CommentTranslatorDisplayMode;
  targetLanguageLabel: string;
}) {
  const showOriginal = displayMode === "both" || displayMode === "original";
  const showTranslated = (displayMode === "both" || displayMode === "translated") && Boolean(comment.translatedText);
  const showTranslatedFallback = displayMode === "translated" && !comment.translatedText;

  return (
    <article
      className={[
        "rounded-base border bg-surface p-3 shadow-sm sm:p-4",
        comment.badge === "support" ? "border-amber-200 bg-amber-50/35" : "border-border",
        comment.status === "error" ? "border-red-200 bg-red-50/35" : ""
      ].join(" ")}
    >
      <div className="grid gap-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-start">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-base bg-primary-soft text-sm font-black text-primary-strong">
          {comment.authorName.slice(0, 1)}
        </div>
        <div className="min-w-0">
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
            <span className="rounded-base border border-border bg-background px-2 py-1 text-[11px] font-bold text-muted">
              cache {comment.cacheStatus}
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {showOriginal ? (
              <div className="grid min-w-0 gap-2 rounded-base border border-border/70 bg-background/60 p-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
                <span className="w-fit rounded-base bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                  {comment.sourceLanguage}
                </span>
                <p className="min-w-0 break-words text-sm leading-6 text-foreground">{comment.originalText}</p>
              </div>
            ) : null}
            {showTranslated ? (
              <div className="grid min-w-0 gap-2 rounded-base border border-emerald-200 bg-emerald-50/60 p-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
                <span className="w-fit rounded-base bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800">
                  {comment.targetLanguage}
                </span>
                <p className="min-w-0 break-words text-sm font-semibold leading-6 text-foreground">
                  {comment.translatedText}
                </p>
              </div>
            ) : null}
            {showTranslatedFallback ? (
              <div className="rounded-base border border-dashed border-border bg-surface-muted/50 p-2.5">
                <p className="text-sm font-bold leading-6 text-muted">No translated text for {targetLanguageLabel}</p>
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
        <span className={["w-fit rounded-base border px-2.5 py-1 text-xs font-black", statusClassName(comment.status)].join(" ")}>
          {statusLabel(comment)}
        </span>
      </div>
    </article>
  );
}

export function CommentTranslatorDock() {
  const {
    platform,
    settings,
    quota,
    connectionStates,
    streams,
    sourceLanguages,
    targetLanguages,
    displayModes,
    surfaceOptions,
    statusFilters,
    quotaScenarios,
    skipReasons,
    comments
  } = mockTranslationProvider.getSnapshot();
  const [connectionId, setConnectionId] = useState<CommentTranslatorConnectionStateId>("connected");
  const [streamId, setStreamId] = useState(commentTranslatorStreamOptions[0].id);
  const [sourceLanguage, setSourceLanguage] = useState<CommentTranslatorSourceLanguageId>(settings.sourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState<CommentTranslatorTargetLanguageId>(settings.targetLanguage);
  const [displayMode, setDisplayMode] = useState<CommentTranslatorDisplayMode>(settings.displayMode);
  const [surfaceMode, setSurfaceMode] = useState<CommentTranslatorSurfaceMode>(settings.surfaceMode);
  const [statusFilter, setStatusFilter] = useState<CommentTranslatorStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [quotaScenarioId, setQuotaScenarioId] = useState<CommentTranslatorQuotaScenarioId>(quota.id);

  const selectedConnection = findCommentTranslatorOption(connectionStates, connectionId);
  const selectedStream = findCommentTranslatorOption(streams, streamId);
  const selectedSourceLanguage = findCommentTranslatorOption(sourceLanguages, sourceLanguage);
  const selectedTargetLanguage = findCommentTranslatorOption(targetLanguages, targetLanguage);
  const selectedSurface = findCommentTranslatorOption(surfaceOptions, surfaceMode);
  const quotaPreview = findCommentTranslatorOption(quotaScenarios, quotaScenarioId, quota);
  const filteredComments = filterCommentTranslatorComments(comments, { statusFilter, searchQuery });
  const quotaPercent = quotaPreview.limitUnits > 0 ? Math.min(100, Math.round((quotaPreview.usedUnits / quotaPreview.limitUnits) * 100)) : 0;
  const shellIsNarrow = surfaceMode === "narrow-viewport";
  const dockStatusLabel = selectedConnection.dockStatus === "blocked" ? selectedConnection.dockStatusLabel : selectedStream.dockStatusLabel;

  return (
    <div className="h-full min-h-0 overflow-auto bg-background px-2 py-3 sm:px-4 lg:px-5">
      <div className={["mx-auto flex min-h-full w-full flex-col gap-3", shellIsNarrow ? "max-w-[42rem]" : "max-w-[1500px]"].join(" ")}>
        <header className="panel sticky top-0 z-20 flex flex-col gap-3 p-3 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-base bg-red-600 text-sm font-black text-white">
              ▶
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-lg font-black tracking-tight text-foreground sm:text-xl">
                Kuro Live Comment Translator
              </h1>
              <p className="mt-1 break-words text-xs font-semibold text-muted">
                {platform.name} first / {selectedSurface.label}
              </p>
            </div>
          </div>
          <div className="grid min-w-0 gap-2 text-xs font-bold sm:grid-cols-3 lg:min-w-[28rem]">
            <span className={["rounded-base border px-3 py-2", toneClassName(selectedConnection.dockStatus === "blocked" ? "error" : "normal")].join(" ")}>
              {selectedConnection.statusLabel}
            </span>
            <span className="rounded-base border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              Read-only Dock
            </span>
            <span className="rounded-base border border-border bg-surface-muted px-3 py-2 text-muted">
              {selectedTargetLanguage.shortLabel} {selectedTargetLanguage.label}
            </span>
          </div>
        </header>

        <div
          className={[
            "grid min-h-0 flex-1 gap-3",
            shellIsNarrow ? "grid-cols-1" : "lg:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[20rem_minmax(0,1fr)_21rem]"
          ].join(" ")}
        >
          <aside className="grid min-w-0 content-start gap-3">
            <section className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-black text-foreground">Setup / Connection</h2>
                <span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(selectedConnection.dockStatus === "blocked" ? "error" : "normal")].join(" ")}>
                  {dockStatusLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                <ControlSelect
                  label="YouTube mock connection"
                  value={connectionId}
                  options={connectionStates}
                  onChange={(value) => setConnectionId(value as CommentTranslatorConnectionStateId)}
                />
                <ControlSelect
                  label="Stream selection"
                  value={streamId}
                  options={streams.map((stream) => ({ id: stream.id, label: stream.title, helper: stream.scheduledLabel }))}
                  onChange={setStreamId}
                />
                <div className="rounded-base border border-border bg-surface-muted/50 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-base bg-red-600 text-xs font-black text-white">
                      ▶
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-foreground">{selectedStream.title}</p>
                      <p className="break-words text-xs font-semibold text-muted">{selectedStream.scheduledLabel}</p>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Mode</dt>
                      <dd className="break-words text-right font-black text-primary-strong">{selectedStream.viewerMode}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Channel</dt>
                      <dd className="break-words text-right font-semibold text-foreground">{selectedConnection.channelName}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Dock</dt>
                      <dd className="break-words text-right font-semibold text-foreground">{dockStatusLabel}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            <section className="panel p-4">
              <h2 className="text-base font-black text-foreground">Display Settings</h2>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <ControlSelect
                    label="Source language"
                    value={sourceLanguage}
                    options={commentTranslatorSourceLanguageOptions}
                    onChange={(value) => setSourceLanguage(value as CommentTranslatorSourceLanguageId)}
                  />
                  <ControlSelect
                    label="Target language"
                    value={targetLanguage}
                    options={commentTranslatorTargetLanguageOptions}
                    onChange={(value) => setTargetLanguage(value as CommentTranslatorTargetLanguageId)}
                  />
                </div>
                <SegmentedControl
                  label="Comment text"
                  value={displayMode}
                  options={displayModes}
                  onChange={(value) => setDisplayMode(value as CommentTranslatorDisplayMode)}
                />
                <ControlSelect
                  label="Surface"
                  value={surfaceMode}
                  options={surfaceOptions}
                  onChange={(value) => setSurfaceMode(value as CommentTranslatorSurfaceMode)}
                />
                <div className="rounded-base border border-border bg-background/65 px-3 py-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Current pair</span>
                    <span className="break-words text-right font-black text-foreground">
                      {selectedSourceLanguage.shortLabel} → {selectedTargetLanguage.shortLabel}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <main className="panel flex min-w-0 min-h-[34rem] flex-col overflow-hidden">
            <div className="grid gap-3 border-b border-border p-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary-strong">Live Comments</p>
                <h2 className="mt-1 break-words text-xl font-black tracking-tight text-foreground">
                  YouTube chat fixture
                </h2>
              </div>
              <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_16rem] xl:w-[34rem]">
                <div className="flex min-w-0 flex-wrap gap-2">
                  {statusFilters.map((filter) => {
                    const selected = filter.id === statusFilter;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setStatusFilter(filter.id)}
                        className={[
                          "rounded-base border px-3 py-2 text-xs font-black transition",
                          selected
                            ? "border-primary bg-primary-soft text-primary-strong"
                            : "border-border bg-surface text-muted hover:border-primary/60 hover:bg-primary-soft/40"
                        ].join(" ")}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
                <label className="min-w-0">
                  <span className="sr-only">Search live comments</span>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search comments"
                    className="min-h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm placeholder:text-muted hover:border-primary/60 focus:border-primary"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-b border-border bg-surface-muted/30 p-3 text-center text-xs font-bold text-muted sm:grid-cols-4">
              <span className="rounded-base bg-surface px-2 py-2">{filteredComments.length} shown</span>
              <span className="rounded-base bg-surface px-2 py-2">{comments.length} total</span>
              <span className="rounded-base bg-emerald-50 px-2 py-2 text-emerald-700">{quotaPreview.translatedCount} translated</span>
              <span className="rounded-base bg-amber-50 px-2 py-2 text-amber-700">{quotaPreview.skippedCount} skipped</span>
            </div>

            <div className="scrollbar-accent min-h-0 flex-1 space-y-3 overflow-auto p-3 sm:p-4">
              {filteredComments.length > 0 ? (
                filteredComments.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    displayMode={displayMode}
                    targetLanguageLabel={selectedTargetLanguage.label}
                  />
                ))
              ) : (
                <div className="grid min-h-72 place-items-center rounded-base border border-dashed border-border bg-background/70 p-4 text-center">
                  <div>
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-base bg-surface-muted text-2xl text-muted">
                      ...
                    </div>
                    <p className="mt-3 text-sm font-black text-foreground">No matching comments</p>
                    <p className="mt-1 text-xs leading-5 text-muted">Adjust the search or status tab to show fixture rows.</p>
                  </div>
                </div>
              )}
            </div>
          </main>

          <aside className={["grid min-w-0 content-start gap-3", shellIsNarrow ? "" : "lg:col-span-2 2xl:col-span-1"].join(" ")}>
            <section className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-black text-foreground">Cache / Quota Preview</h2>
                <span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(quotaPreview.tone)].join(" ")}>
                  {quotaPreview.statusLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                <ControlSelect
                  label="Mock state"
                  value={quotaScenarioId}
                  options={commentTranslatorQuotaScenarios}
                  onChange={(value) => setQuotaScenarioId(value as CommentTranslatorQuotaScenarioId)}
                />
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${quotaPercent}%` }} />
                </div>
                <p className="break-words text-xs font-semibold leading-5 text-muted">{quotaPreview.helper}</p>
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
                  <StatTile label="Quota" value={`${formatNumber(quotaPreview.usedUnits)} / ${formatNumber(quotaPreview.limitUnits)}`} helper={`${quotaPercent}% used`} />
                  <StatTile label="Cache hit" value={`${quotaPreview.cacheHitRate}%`} helper={`${formatNumber(quotaPreview.cacheHits)} hits`} />
                  <StatTile label="Cache miss" value={formatNumber(quotaPreview.cacheMisses)} helper="Fixture misses" />
                  <StatTile label="Error rows" value={formatNumber(quotaPreview.errorCount)} helper="Recoverable state" />
                </div>
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

            <section className="panel border-blue-200 bg-blue-50/45 p-4">
              <h2 className="text-base font-black text-blue-800">Read-only Safety</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-900">
                <li>Viewer-facing overlay is absent.</li>
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
