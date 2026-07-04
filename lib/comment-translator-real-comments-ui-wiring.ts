import "server-only";

import {
  projectCommentTranslatorNormalizedLiveMessagesForBrowser,
  type CommentTranslatorLiveMessageBrowserSafeRow,
  type CommentTranslatorNormalizedLiveMessage
} from "./comment-translator-live-message-normalization";
import type {
  CommentTranslatorLiveProviderDiagnostics,
  CommentTranslatorRealCommentsDisplayRow,
  CommentTranslatorRealCommentsFeedState
} from "./comment-translator-real-comments-feed-shared";
import type { CommentTranslatorSessionBrowserSafeState } from "./comment-translator-session-runtime";
import type { CommentTranslatorTargetLanguageId } from "./comment-translator";

export const commentTranslatorRealCommentsUiWiringContract = {
  implementationStage: "free-public-beta-f9-real-comments-ui-wiring",
  runtime: "server-only",
  safeRowSource: "f8-browser-safe-projection",
  feedAuthority: "server-owned-live-session-state",
  fixtureFeedAuthority: "disabled",
  manualFeedAuthority: "disabled",
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  providerPollingExecution: "not-run-in-this-thread",
  providerTargetLookupExecution: "not-run-in-this-thread",
  liveChatMessagesListExecution: "not-run-in-this-thread",
  translationProviderExecution: "not-run-in-this-thread",
  routeRenderLookup: "not-run",
  connectionOnlyMonitoring: "not-started",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  publicLaunchAllowed: false,
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "live-target-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "server-only-cursor",
    "author-channel-id",
    "author-channel-url",
    "author-profile-image-url"
  ]
} as const;

export function createCommentTranslatorRealCommentsFeedStateFromNormalizedMessages({
  messages,
  sessionStatus,
  targetLanguage
}: {
  messages: readonly CommentTranslatorNormalizedLiveMessage[];
  sessionStatus: CommentTranslatorSessionBrowserSafeState["status"];
  targetLanguage: CommentTranslatorTargetLanguageId;
}): CommentTranslatorRealCommentsFeedState {
  return createCommentTranslatorRealCommentsFeedStateFromBrowserSafeRows({
    rows: projectCommentTranslatorNormalizedLiveMessagesForBrowser(messages),
    sessionStatus,
    targetLanguage
  });
}

export function createCommentTranslatorRealCommentsFeedStateFromBrowserSafeRows({
  rows,
  sessionStatus,
  targetLanguage
}: {
  rows: readonly CommentTranslatorLiveMessageBrowserSafeRow[];
  sessionStatus: CommentTranslatorSessionBrowserSafeState["status"];
  targetLanguage: CommentTranslatorTargetLanguageId;
}): CommentTranslatorRealCommentsFeedState {
  if (sessionStatus !== "active") {
    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: "session-not-active"
    });
  }

  return createFeedState({
    status: "ready",
    rows: rows.map((row) => mapBrowserSafeRowToDisplayRow({ row, targetLanguage })),
    unavailableReason: null
  });
}

export function createUnavailableCommentTranslatorRealCommentsFeedState({
  reason,
  liveProviderDiagnostics = null
}: {
  reason: CommentTranslatorRealCommentsFeedState["unavailableReason"];
  liveProviderDiagnostics?: CommentTranslatorLiveProviderDiagnostics | null;
}): CommentTranslatorRealCommentsFeedState {
  return createFeedState({
    status: reason === "session-not-active" ? "inactive" : "unavailable",
    rows: [],
    unavailableReason: reason,
    liveProviderDiagnostics
  });
}

function createFeedState({
  status,
  rows,
  unavailableReason,
  liveProviderDiagnostics = null
}: {
  status: CommentTranslatorRealCommentsFeedState["status"];
  rows: readonly CommentTranslatorRealCommentsDisplayRow[];
  unavailableReason: CommentTranslatorRealCommentsFeedState["unavailableReason"];
  liveProviderDiagnostics?: CommentTranslatorLiveProviderDiagnostics | null;
}): CommentTranslatorRealCommentsFeedState {
  return {
    status,
    source: "server-owned-live-session-state",
    rows,
    unavailableReason,
    sanitizedSummary: {
      displayRowCount: rows.length,
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

function mapBrowserSafeRowToDisplayRow({
  row,
  targetLanguage
}: {
  row: CommentTranslatorLiveMessageBrowserSafeRow;
  targetLanguage: CommentTranslatorTargetLanguageId;
}): CommentTranslatorRealCommentsDisplayRow {
  return {
    id: row.messageReferenceId,
    provider: row.provider,
    messageReferenceId: row.messageReferenceId,
    kind: row.kind,
    timestamp: formatTimestamp(row.publishedAtIso),
    publishedAtIso: row.publishedAtIso,
    source: row.source,
    sourceAttributionLabel: row.sourceAttributionLabel,
    role: row.role,
    authorLabel: "YouTube viewer",
    authorDisplayName: row.authorDisplayName,
    originalText: row.text,
    translatedText: null,
    targetLanguage,
    translationStatus: "not-run-f9",
    translationCacheStatus: null,
    moderationLabel: row.moderationLabel,
    deletionPropagation: row.deletionPropagation,
    badgeLabel: resolveBadgeLabel(row),
    purchaseLabel: row.purchase?.amountDisplayString ?? null,
    memberMonthCount: row.member?.monthCount ?? null,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    authorChannelMaterial: row.authorChannelMaterial,
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design"
  };
}

function resolveBadgeLabel(
  row: CommentTranslatorLiveMessageBrowserSafeRow
): CommentTranslatorRealCommentsDisplayRow["badgeLabel"] {
  if (row.kind === "super-chat") {
    return "super-chat";
  }

  if (row.kind === "super-sticker") {
    return "super-sticker";
  }

  if (row.kind === "system") {
    return "system";
  }

  if (row.role === "owner" || row.role === "moderator" || row.role === "member") {
    return row.role;
  }

  return null;
}

function formatTimestamp(publishedAtIso: string) {
  const parsed = Date.parse(publishedAtIso);
  if (!Number.isFinite(parsed)) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC"
  }).format(new Date(parsed));
}
