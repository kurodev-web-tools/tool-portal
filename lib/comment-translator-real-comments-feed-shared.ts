import type {
  CommentTranslatorComment,
  CommentTranslatorSurfaceMode,
  CommentTranslatorTargetLanguageId
} from "./comment-translator";
import type { CommentTranslationCacheOutcome } from "./comment-translator-provider-boundary";
import type { Locale } from "./locale";

export type CommentTranslatorRealCommentsFeedStatus = "ready" | "inactive" | "unavailable";
export type CommentTranslatorLiveProviderDiagnostics = {
  pollTickStatus: "polled" | "empty" | "not-due" | "recoverable" | "terminal" | "missing-state";
  returnedCount: number;
  acceptedCount: number;
  skippedCount: number;
  preStartSkippedCount: number;
  skipReasonCounts: readonly {
    reason: "duplicate" | "language-policy" | "usage-limit" | "provider-unavailable";
    count: number;
  }[];
  providerCallCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
  duplicateTextCacheHitCount: number;
  duplicateTextSkippedCount: number;
  languagePolicySkippedCount: number;
  translatedCount: number;
  persistedFeedRowCount: number;
  nextPollDue: "due" | "waiting";
  stopReason: string | null;
  nextResetAtIso?: string | null;
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
  serverOnlyCursor: "not-returned-by-design";
};
export type CommentTranslatorRealCommentsTranslationStatus =
  | "not-run-f9"
  | "translated-f10"
  | "skipped-f10-language-policy"
  | "skipped-f10-non-translatable"
  | "provider-unavailable-f10"
  | "provider-error-f10-recoverable"
  | "provider-error-f10-terminal"
  | "skipped-f12-usage-limit";

export type CommentTranslatorRealCommentsDisplayRow = {
  id: string;
  provider: "youtube";
  messageReferenceId: string;
  kind: "text" | "super-chat" | "super-sticker" | "member" | "system" | "deleted" | "banned" | "ended";
  timestamp: string;
  publishedAtIso: string;
  source: "youtube-live-chat";
  sourceAttributionLabel: "Source: YouTube Live Chat";
  role: "owner" | "moderator" | "member" | "viewer" | "unknown";
  authorLabel: "YouTube viewer";
  authorDisplayName: string | null;
  originalText: string | null;
  translatedText: string | null;
  targetLanguage: CommentTranslatorTargetLanguageId;
  translationStatus: CommentTranslatorRealCommentsTranslationStatus;
  translationCacheStatus: CommentTranslationCacheOutcome | null;
  moderationLabel: "visible" | "deleted" | "banned" | "ended" | "system";
  deletionPropagation: "not-deleted" | "message-reference-tombstone-only" | "author-history-p1-deferred" | "stream-ended";
  badgeLabel: "owner" | "moderator" | "member" | "super-chat" | "super-sticker" | "system" | null;
  purchaseLabel: string | null;
  memberMonthCount: number | null;
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  authorChannelMaterial: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
  serverOnlyCursor: "not-returned-by-design";
};

export type CommentTranslatorRealCommentsFeedState = {
  status: CommentTranslatorRealCommentsFeedStatus;
  source: "server-owned-live-session-state";
  rows: readonly CommentTranslatorRealCommentsDisplayRow[];
  unavailableReason:
    | "session-not-active"
    | "live-provider-polling-not-approved"
    | "polling-runtime-not-wired"
    | "durable-usage-ledger-unavailable"
    | null;
  sanitizedSummary: {
    displayRowCount: number;
    safeRowSource: "f8-browser-safe-projection";
    fixtureFeedAuthority: "disabled";
    manualFeedAuthority: "disabled";
    rawProviderPayload: "not-returned-by-design";
    rawComments: "not-returned-by-design";
    authorChannelMaterial: "not-returned-by-design";
    providerTargetMetadata: "forbidden";
    serverOnlyCursor: "not-returned-by-design";
    liveProviderDiagnostics: CommentTranslatorLiveProviderDiagnostics | null;
  };
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
  serverOnlyCursor: "not-returned-by-design";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  publicLaunchAllowed: false;
};

export type CommentTranslatorPreviewViewMode = "normal" | "comments";
export type CommentTranslatorAuthorDisplayNamePolicyMarker =
  | "operator-safe-display-name"
  | "stream-safe-generic-default"
  | "stream-safe-safe-display-name-enabled";
export type CommentTranslatorAuthorDisplayNamePolicy = {
  readonly marker: CommentTranslatorAuthorDisplayNamePolicyMarker;
  readonly streamSafe: boolean;
  readonly showSafeAuthorDisplayName: boolean;
  readonly genericViewerLabel: "YouTube viewer";
  readonly maxDisplayNameCharacters: number;
};

const commentTranslatorStreamSafeMaxDisplayNameCharacters = 32;

const normalOperatorAuthorDisplayNamePolicy: CommentTranslatorAuthorDisplayNamePolicy = {
  marker: "operator-safe-display-name",
  streamSafe: false,
  showSafeAuthorDisplayName: true,
  genericViewerLabel: "YouTube viewer",
  maxDisplayNameCharacters: commentTranslatorStreamSafeMaxDisplayNameCharacters
};

export function createUnavailableCommentTranslatorRealCommentsFeedState({
  reason,
  liveProviderDiagnostics = null
}: {
  reason: CommentTranslatorRealCommentsFeedState["unavailableReason"];
  liveProviderDiagnostics?: CommentTranslatorLiveProviderDiagnostics | null;
}): CommentTranslatorRealCommentsFeedState {
  return {
    status: reason === "session-not-active" ? "inactive" : "unavailable",
    source: "server-owned-live-session-state",
    rows: [],
    unavailableReason: reason,
    sanitizedSummary: {
      displayRowCount: 0,
      safeRowSource: "f8-browser-safe-projection",
      fixtureFeedAuthority: "disabled",
      manualFeedAuthority: "disabled",
      rawProviderPayload: "not-returned-by-design",
      rawComments: "not-returned-by-design",
      authorChannelMaterial: "not-returned-by-design",
      providerTargetMetadata: "forbidden",
      serverOnlyCursor: "not-returned-by-design",
      liveProviderDiagnostics
    },
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    publicLaunchAllowed: false
  };
}

export function attachCommentTranslatorLiveProviderDiagnosticsToFeed({
  feed,
  diagnostics
}: {
  feed: CommentTranslatorRealCommentsFeedState;
  diagnostics: CommentTranslatorLiveProviderDiagnostics | null;
}): CommentTranslatorRealCommentsFeedState {
  if (!diagnostics) {
    return feed;
  }

  const existingDiagnostics = feed.sanitizedSummary.liveProviderDiagnostics;
  if (
    !hasNonZeroCommentTranslatorLiveProviderDiagnosticsCount(diagnostics) &&
    hasNonZeroCommentTranslatorLiveProviderDiagnosticsCount(existingDiagnostics)
  ) {
    return feed;
  }

  return {
    ...feed,
    sanitizedSummary: {
      ...feed.sanitizedSummary,
      liveProviderDiagnostics: diagnostics
    }
  };
}

export function hasNonZeroCommentTranslatorLiveProviderDiagnosticsCount(
  diagnostics: CommentTranslatorLiveProviderDiagnostics | null
) {
  if (!diagnostics) {
    return false;
  }

  return [
    diagnostics.providerCallCount,
    diagnostics.cacheHitCount,
    diagnostics.cacheMissCount,
    diagnostics.duplicateTextCacheHitCount,
    diagnostics.duplicateTextSkippedCount,
    diagnostics.languagePolicySkippedCount,
    diagnostics.translatedCount,
    diagnostics.persistedFeedRowCount
  ].some((value) => value > 0);
}

export function mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed,
  targetLanguageLabel,
  locale = "en",
  timeZone = resolveCommentTranslatorBrowserTimeZone(),
  authorDisplayNamePolicy = normalOperatorAuthorDisplayNamePolicy
}: {
  feed: CommentTranslatorRealCommentsFeedState;
  targetLanguageLabel: string;
  locale?: Locale;
  timeZone?: string;
  authorDisplayNamePolicy?: CommentTranslatorAuthorDisplayNamePolicy;
}): CommentTranslatorComment[] {
  return sortCommentTranslatorRealCommentsFeedRowsNewestFirst(feed.rows).map((row) => {
    const sourceLanguage = "YT";
    const targetLanguage = row.targetLanguage.toLocaleUpperCase();
    const baseComment: CommentTranslatorComment = {
      id: row.id,
      timestamp: formatCommentTranslatorBrowserLocalTimestamp({
        publishedAtIso: row.publishedAtIso,
        locale,
        timeZone
      }),
      authorName: resolveCommentTranslatorAuthorDisplayName({ row, policy: authorDisplayNamePolicy }),
      source: "server",
      sourceLabel: row.sourceAttributionLabel,
      sourceLanguage,
      targetLanguage,
      originalText: row.originalText ?? moderationFallbackText(row.moderationLabel),
      translatedText: row.translatedText ?? undefined,
      status: resolveUiStatus(row),
      cacheStatus: resolveUiCacheStatus(row),
      skipReason: resolveSkipReason(row),
      errorMessage: resolveErrorMessage(row),
      badge: row.badgeLabel ?? undefined,
      unitCost: row.translationStatus === "translated-f10" ? 1 : 0
    };

    if (row.moderationLabel === "ended") {
      return {
        ...baseComment,
        originalText: "Stream ended",
        skipReason: "Stream ended"
      };
    }

    if (row.kind === "super-chat" || row.kind === "super-sticker") {
      return {
        ...baseComment,
        badge: row.purchaseLabel ?? row.badgeLabel ?? undefined
      };
    }

    if (row.kind === "member" && row.memberMonthCount) {
      return {
        ...baseComment,
        badge: `member ${row.memberMonthCount}`
      };
    }

    return baseComment;
  });
}

export function resolveCommentTranslatorAuthorDisplayNamePolicy({
  surfaceMode,
  viewMode,
  showSafeAuthorDisplayNamesInStreamSafeMode
}: {
  readonly surfaceMode: CommentTranslatorSurfaceMode;
  readonly viewMode: CommentTranslatorPreviewViewMode;
  readonly showSafeAuthorDisplayNamesInStreamSafeMode: boolean;
}): CommentTranslatorAuthorDisplayNamePolicy {
  const compactSurface = surfaceMode === "obs-browser-dock" || surfaceMode === "narrow-viewport";
  const streamSafe = compactSurface && viewMode === "comments";

  if (!streamSafe) {
    return normalOperatorAuthorDisplayNamePolicy;
  }

  if (showSafeAuthorDisplayNamesInStreamSafeMode) {
    return {
      marker: "stream-safe-safe-display-name-enabled",
      streamSafe: true,
      showSafeAuthorDisplayName: true,
      genericViewerLabel: "YouTube viewer",
      maxDisplayNameCharacters: commentTranslatorStreamSafeMaxDisplayNameCharacters
    };
  }

  return {
    marker: "stream-safe-generic-default",
    streamSafe: true,
    showSafeAuthorDisplayName: false,
    genericViewerLabel: "YouTube viewer",
    maxDisplayNameCharacters: commentTranslatorStreamSafeMaxDisplayNameCharacters
  };
}

export function resolveCommentTranslatorAuthorDisplayName({
  row,
  policy
}: {
  readonly row: Pick<CommentTranslatorRealCommentsDisplayRow, "authorDisplayName" | "authorLabel">;
  readonly policy: CommentTranslatorAuthorDisplayNamePolicy;
}): string {
  if (!policy.showSafeAuthorDisplayName) {
    return policy.genericViewerLabel;
  }

  const safeAuthorDisplayName = row.authorDisplayName ?? row.authorLabel;
  if (!policy.streamSafe) {
    return safeAuthorDisplayName;
  }

  return compactCommentTranslatorAuthorDisplayName({
    displayName: safeAuthorDisplayName,
    maxCharacters: policy.maxDisplayNameCharacters
  });
}

function compactCommentTranslatorAuthorDisplayName({
  displayName,
  maxCharacters
}: {
  readonly displayName: string;
  readonly maxCharacters: number;
}): string {
  const characters = Array.from(displayName);
  if (characters.length <= maxCharacters) {
    return displayName;
  }

  return `${characters.slice(0, Math.max(0, maxCharacters - 3)).join("")}...`;
}

export function sortCommentTranslatorRealCommentsFeedRowsNewestFirst(
  rows: readonly CommentTranslatorRealCommentsDisplayRow[]
): CommentTranslatorRealCommentsDisplayRow[] {
  return [...rows].sort((left, right) => {
    const rightTime = parseCommentTranslatorPublishedAt(right.publishedAtIso);
    const leftTime = parseCommentTranslatorPublishedAt(left.publishedAtIso);

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return right.id.localeCompare(left.id);
  });
}

export function resolveCommentTranslatorBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatCommentTranslatorBrowserLocalTimestamp({
  publishedAtIso,
  locale,
  timeZone
}: {
  publishedAtIso: string;
  locale: Locale;
  timeZone: string;
}): string {
  const parsed = Date.parse(publishedAtIso);
  if (!Number.isFinite(parsed)) {
    return `--:-- ${timeZone}`;
  }

  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone,
    timeZoneName: "short"
  })
    .format(new Date(parsed))
    .replace(/\s+/g, " ");
}

function parseCommentTranslatorPublishedAt(publishedAtIso: string) {
  const parsed = Date.parse(publishedAtIso);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moderationFallbackText(label: CommentTranslatorRealCommentsDisplayRow["moderationLabel"]) {
  if (label === "deleted") {
    return "Message deleted";
  }

  if (label === "banned") {
    return "User banned";
  }

  if (label === "ended") {
    return "Stream ended";
  }

  if (label === "system") {
    return "System event";
  }

  return "";
}

function moderationSkipReason(label: CommentTranslatorRealCommentsDisplayRow["moderationLabel"]) {
  if (label === "deleted") {
    return "Deleted message";
  }

  if (label === "banned") {
    return "Banned user event";
  }

  if (label === "ended") {
    return "Stream ended";
  }

  return "System event";
}

function resolveUiStatus(row: CommentTranslatorRealCommentsDisplayRow): CommentTranslatorComment["status"] {
  if (row.translationStatus === "translated-f10") {
    return "translated";
  }

  if (row.translationStatus === "provider-error-f10-recoverable" || row.translationStatus === "provider-error-f10-terminal") {
    return "error";
  }

  return "skipped";
}

function resolveUiCacheStatus(row: CommentTranslatorRealCommentsDisplayRow): CommentTranslatorComment["cacheStatus"] {
  if (row.translationStatus !== "translated-f10") {
    return "none";
  }

  return row.translationCacheStatus === "hit" ? "hit" : "miss";
}

function resolveSkipReason(row: CommentTranslatorRealCommentsDisplayRow) {
  if (row.translationStatus === "translated-f10" || row.translationStatus === "provider-error-f10-recoverable" || row.translationStatus === "provider-error-f10-terminal") {
    return undefined;
  }

  if (row.translationStatus === "skipped-f10-language-policy") {
    return "Language policy";
  }

  if (row.translationStatus === "skipped-f10-non-translatable") {
    return row.moderationLabel === "visible" ? "Not translatable" : moderationSkipReason(row.moderationLabel);
  }

  if (row.translationStatus === "provider-unavailable-f10") {
    return "Translation provider unavailable";
  }

  if (row.translationStatus === "skipped-f12-usage-limit") {
    return "Usage limit reached";
  }

  return row.moderationLabel === "visible" ? "Translation not run" : moderationSkipReason(row.moderationLabel);
}

function resolveErrorMessage(row: CommentTranslatorRealCommentsDisplayRow) {
  if (row.translationStatus === "provider-error-f10-recoverable") {
    return "Translation provider temporarily unavailable";
  }

  if (row.translationStatus === "provider-error-f10-terminal") {
    return "Translation provider rejected this comment";
  }

  return undefined;
}
