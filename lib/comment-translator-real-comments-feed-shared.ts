import type { CommentTranslatorComment, CommentTranslatorTargetLanguageId } from "./comment-translator";

export type CommentTranslatorRealCommentsFeedStatus = "ready" | "inactive" | "unavailable";
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
  role: "owner" | "moderator" | "member" | "viewer" | "unknown";
  authorLabel: "YouTube viewer";
  originalText: string | null;
  translatedText: string | null;
  targetLanguage: CommentTranslatorTargetLanguageId;
  translationStatus: CommentTranslatorRealCommentsTranslationStatus;
  moderationLabel: "visible" | "deleted" | "banned" | "ended" | "system";
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
  unavailableReason: "session-not-active" | "live-provider-polling-not-approved" | "polling-runtime-not-wired" | null;
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
  };
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
  serverOnlyCursor: "not-returned-by-design";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  publicLaunchAllowed: false;
};

export function mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed,
  targetLanguageLabel
}: {
  feed: CommentTranslatorRealCommentsFeedState;
  targetLanguageLabel: string;
}): CommentTranslatorComment[] {
  return feed.rows.map((row) => {
    const sourceLanguage = "YT";
    const targetLanguage = row.targetLanguage.toLocaleUpperCase();
    const baseComment: CommentTranslatorComment = {
      id: row.id,
      timestamp: row.timestamp,
      authorName: row.authorLabel,
      source: "server",
      sourceLabel: "YouTube Live Chat",
      sourceLanguage,
      targetLanguage,
      originalText: row.originalText ?? moderationFallbackText(row.moderationLabel),
      translatedText: row.translatedText ?? undefined,
      status: resolveUiStatus(row),
      cacheStatus: row.translationStatus === "translated-f10" ? "miss" : "none",
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
