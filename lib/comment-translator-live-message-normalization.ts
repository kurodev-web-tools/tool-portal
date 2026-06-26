import "server-only";

import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";

export type CommentTranslatorNormalizedLiveMessageKind =
  | "text"
  | "super-chat"
  | "super-sticker"
  | "member"
  | "system"
  | "deleted"
  | "banned"
  | "ended";

export type CommentTranslatorLiveMessageNormalizationState = {
  seenMessageReferenceIds: readonly string[];
  deletedMessageReferenceIds: readonly string[];
  bannedSessionAuthorKeys: readonly string[];
};

export type CommentTranslatorYouTubeLiveMessageProviderPayload = {
  id?: string;
  snippet?: {
    type?: string;
    publishedAt?: string;
    displayMessage?: string;
    hasDisplayContent?: boolean;
    textMessageDetails?: {
      messageText?: string;
    };
    superChatDetails?: {
      userComment?: string;
      amountDisplayString?: string;
      tier?: number;
    };
    superStickerDetails?: {
      amountDisplayString?: string;
      tier?: number;
      superStickerMetadata?: {
        altText?: string;
      };
    };
    memberMilestoneChatDetails?: {
      userComment?: string;
      memberMonth?: number;
    };
    newSponsorDetails?: Record<string, unknown>;
    messageDeletedDetails?: {
      deletedMessageId?: string;
    };
    userBannedDetails?: {
      banType?: string;
      bannedUserDetails?: Record<string, unknown>;
      affectedMessageIds?: readonly string[];
      deletedMessageIds?: readonly string[];
    };
    liveChatEndedDetails?: Record<string, unknown>;
  };
  authorDetails?: {
    isChatOwner?: boolean;
    isChatModerator?: boolean;
    isChatSponsor?: boolean;
    channelId?: string;
    channelUrl?: string;
    profileImageUrl?: string;
    displayName?: string;
  };
};

export type CommentTranslatorNormalizedLiveMessage = {
  provider: "youtube";
  messageReferenceId: string;
  kind: CommentTranslatorNormalizedLiveMessageKind;
  publishedAtIso: string;
  text: string | null;
  source: "youtube-live-chat";
  role: "owner" | "moderator" | "member" | "viewer" | "unknown";
  purchase: {
    kind: "super-chat" | "super-sticker";
    amountDisplayString: string | null;
    tier: number | null;
  } | null;
  member: {
    monthCount: number | null;
  } | null;
  system: {
    subtype: "new-sponsor" | "system-message" | "unknown";
  } | null;
  targetMessageReferenceId: string | null;
  terminalSignal: "stream-ended" | null;
  moderation: {
    visibility: "visible" | "deleted" | "banned" | "system" | "ended";
    deletionHandling:
      | "not-deleted"
      | "deleted-message-propagation"
      | "ban-author-history-p1-deferred-without-session-author-key"
      | "stream-ended";
    historyUpdateStrategy: "message-reference-only" | "p1-defer-author-key-unavailable" | "not-required";
  };
  rawProviderPayload: "not-returned-by-design";
  authorChannelMaterial: "not-returned-by-design";
};

export type CommentTranslatorLiveMessageBrowserSafeRow = {
  provider: "youtube";
  messageReferenceId: string;
  kind: CommentTranslatorNormalizedLiveMessageKind;
  publishedAtIso: string;
  text: string | null;
  source: "youtube-live-chat";
  sourceAttributionLabel: "Source: YouTube Live Chat";
  role: CommentTranslatorNormalizedLiveMessage["role"];
  purchase: CommentTranslatorNormalizedLiveMessage["purchase"];
  member: CommentTranslatorNormalizedLiveMessage["member"];
  moderationLabel: "visible" | "deleted" | "banned" | "ended" | "system";
  deletionPropagation: "not-deleted" | "message-reference-tombstone-only" | "author-history-p1-deferred" | "stream-ended";
  rawProviderPayload: "not-returned-by-design";
  authorChannelMaterial: "not-returned-by-design";
};

export type CommentTranslatorLiveMessageNormalizationResult = {
  status: "normalized";
  normalizedMessages: readonly CommentTranslatorNormalizedLiveMessage[];
  duplicateMessageReferenceIds: readonly string[];
  nextState: CommentTranslatorLiveMessageNormalizationState;
  sanitizedSummary: {
    receivedProviderItemCount: number;
    normalizedMessageCount: number;
    duplicateMessageCount: number;
    deletedMessageCount: number;
    bannedEventCount: number;
    endedEventCount: number;
    rawProviderPayload: "not-returned-by-design";
    authorChannelMaterial: "not-returned-by-design";
    providerTargetMetadata: "forbidden";
    browserStorage: "unchanged";
    handoffPayload: "unchanged";
    publicLaunchAllowed: false;
  };
};

export const commentTranslatorLiveMessageNormalizationContract = {
  implementationStage: "free-public-beta-f8-live-message-normalization",
  runtime: "server-only",
  source: "youtube-live-chat-polling-provider-payload",
  normalizationLayer: "deterministic-local-adapter",
  normalizedEventKinds: ["text", "super-chat", "super-sticker", "member", "system", "deleted", "banned", "ended"],
  dedupe: "dedupe-policy-message-reference-id",
  deletionHandling: "deleted-message-propagation",
  banEventHistoricalUpdates: "ban-author-history-p1-deferred-without-session-author-key",
  authorChannelIdPersistence: "forbidden",
  authorChannelUrlPersistence: "forbidden",
  authorProfileImageUrlPersistence: "forbidden",
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  providerPollingExecution: "not-run-in-this-thread",
  providerTargetLookupExecution: "not-run-in-this-thread",
  liveChatMessagesListExecution: "not-run-in-this-thread",
  translationProviderExecution: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  publicLaunchAllowed: false,
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "server-only-cursor",
    "author-channel-id",
    "author-channel-url",
    "author-profile-image-url"
  ]
} as const;

export function createInitialCommentTranslatorLiveMessageNormalizationState(): CommentTranslatorLiveMessageNormalizationState {
  return {
    seenMessageReferenceIds: [],
    deletedMessageReferenceIds: [],
    bannedSessionAuthorKeys: []
  };
}

export function normalizeCommentTranslatorLiveMessages({
  state = createInitialCommentTranslatorLiveMessageNormalizationState(),
  providerPayloads
}: {
  state?: CommentTranslatorLiveMessageNormalizationState;
  providerPayloads: readonly CommentTranslatorYouTubeLiveMessageProviderPayload[];
}): CommentTranslatorLiveMessageNormalizationResult {
  const seenMessageReferenceIds = new Set(state.seenMessageReferenceIds);
  const deletedMessageReferenceIds = new Set(state.deletedMessageReferenceIds);
  const bannedSessionAuthorKeys = new Set(state.bannedSessionAuthorKeys);
  const normalizedMessages: CommentTranslatorNormalizedLiveMessage[] = [];
  const duplicateMessageReferenceIds: string[] = [];

  for (const payload of providerPayloads) {
    const messageReferenceId = normalizeMessageReferenceId(payload);
    if (!messageReferenceId) {
      continue;
    }

    if (seenMessageReferenceIds.has(messageReferenceId)) {
      duplicateMessageReferenceIds.push(messageReferenceId);
      continue;
    }

    seenMessageReferenceIds.add(messageReferenceId);
    const normalized = normalizeProviderPayload({ payload, messageReferenceId });

    if (normalized.kind === "deleted" && normalized.targetMessageReferenceId) {
      deletedMessageReferenceIds.add(normalized.targetMessageReferenceId);
    }

    for (const affectedMessageReferenceId of readBanAffectedMessageReferenceIds(payload)) {
      deletedMessageReferenceIds.add(affectedMessageReferenceId);
    }

    normalizedMessages.push(normalized);
  }

  return {
    status: "normalized",
    normalizedMessages,
    duplicateMessageReferenceIds,
    nextState: {
      seenMessageReferenceIds: Array.from(seenMessageReferenceIds),
      deletedMessageReferenceIds: Array.from(deletedMessageReferenceIds),
      bannedSessionAuthorKeys: Array.from(bannedSessionAuthorKeys)
    },
    sanitizedSummary: {
      receivedProviderItemCount: providerPayloads.length,
      normalizedMessageCount: normalizedMessages.length,
      duplicateMessageCount: duplicateMessageReferenceIds.length,
      deletedMessageCount: normalizedMessages.filter((message) => message.kind === "deleted").length,
      bannedEventCount: normalizedMessages.filter((message) => message.kind === "banned").length,
      endedEventCount: normalizedMessages.filter((message) => message.kind === "ended").length,
      rawProviderPayload: "not-returned-by-design",
      authorChannelMaterial: "not-returned-by-design",
      providerTargetMetadata: "forbidden",
      browserStorage: "unchanged",
      handoffPayload: "unchanged",
      publicLaunchAllowed: false
    }
  };
}

export function projectCommentTranslatorNormalizedLiveMessagesForBrowser(
  messages: readonly CommentTranslatorNormalizedLiveMessage[]
): readonly CommentTranslatorLiveMessageBrowserSafeRow[] {
  return messages.map((message) => ({
    provider: message.provider,
    messageReferenceId: message.messageReferenceId,
    kind: message.kind,
    publishedAtIso: message.publishedAtIso,
    text: message.kind === "deleted" || message.kind === "banned" || message.kind === "ended" ? null : message.text,
    source: message.source,
    sourceAttributionLabel: "Source: YouTube Live Chat",
    role: message.role,
    purchase: message.purchase,
    member: message.member,
    moderationLabel: mapModerationLabel(message),
    deletionPropagation: mapDeletionPropagation(message),
    rawProviderPayload: "not-returned-by-design",
    authorChannelMaterial: "not-returned-by-design"
  }));
}

export function mapYouTubeProviderSafeCommentsToNormalizedLiveMessages(
  comments: readonly YouTubeProviderSafeCommentPayload[]
): readonly CommentTranslatorNormalizedLiveMessage[] {
  return comments
    .map((comment) => ({
      provider: "youtube" as const,
      messageReferenceId: normalizeString(comment.commentId) ?? "",
      kind: "text" as const,
      publishedAtIso: normalizePublishedAtIso(comment.publishedAt),
      text: normalizeText(comment.text),
      source: "youtube-live-chat" as const,
      role: "unknown" as const,
      purchase: null,
      member: null,
      system: null,
      targetMessageReferenceId: null,
      terminalSignal: null,
      moderation: visibleModeration(),
      rawProviderPayload: "not-returned-by-design" as const,
      authorChannelMaterial: "not-returned-by-design" as const
    }))
    .filter((message) => message.messageReferenceId);
}

function normalizeProviderPayload({
  payload,
  messageReferenceId
}: {
  payload: CommentTranslatorYouTubeLiveMessageProviderPayload;
  messageReferenceId: string;
}): CommentTranslatorNormalizedLiveMessage {
  const type = normalizeProviderType(payload.snippet?.type);
  const publishedAtIso = normalizePublishedAtIso(payload.snippet?.publishedAt);
  const role = normalizeAuthorRole(payload.authorDetails);
  const base = {
    provider: "youtube" as const,
    messageReferenceId,
    publishedAtIso,
    source: "youtube-live-chat" as const,
    role,
    targetMessageReferenceId: null,
    terminalSignal: null,
    rawProviderPayload: "not-returned-by-design" as const,
    authorChannelMaterial: "not-returned-by-design" as const
  };

  if (type === "deleted") {
    return {
      ...base,
      kind: "deleted",
      text: null,
      purchase: null,
      member: null,
      system: null,
      targetMessageReferenceId: normalizeString(payload.snippet?.messageDeletedDetails?.deletedMessageId),
      moderation: {
        visibility: "deleted",
        deletionHandling: "deleted-message-propagation",
        historyUpdateStrategy: "message-reference-only"
      }
    };
  }

  if (type === "banned") {
    return {
      ...base,
      kind: "banned",
      text: null,
      purchase: null,
      member: null,
      system: null,
      moderation: {
        visibility: "banned",
        deletionHandling: "ban-author-history-p1-deferred-without-session-author-key",
        historyUpdateStrategy: "p1-defer-author-key-unavailable"
      }
    };
  }

  if (type === "ended") {
    return {
      ...base,
      kind: "ended",
      text: null,
      purchase: null,
      member: null,
      system: null,
      terminalSignal: "stream-ended",
      moderation: {
        visibility: "ended",
        deletionHandling: "stream-ended",
        historyUpdateStrategy: "not-required"
      }
    };
  }

  if (type === "super-chat") {
    return {
      ...base,
      kind: "super-chat",
      text: normalizeText(payload.snippet?.superChatDetails?.userComment ?? payload.snippet?.displayMessage),
      purchase: {
        kind: "super-chat",
        amountDisplayString: normalizeString(payload.snippet?.superChatDetails?.amountDisplayString),
        tier: normalizeNumber(payload.snippet?.superChatDetails?.tier)
      },
      member: null,
      system: null,
      moderation: visibleModeration()
    };
  }

  if (type === "super-sticker") {
    return {
      ...base,
      kind: "super-sticker",
      text: normalizeText(payload.snippet?.superStickerDetails?.superStickerMetadata?.altText ?? payload.snippet?.displayMessage),
      purchase: {
        kind: "super-sticker",
        amountDisplayString: normalizeString(payload.snippet?.superStickerDetails?.amountDisplayString),
        tier: normalizeNumber(payload.snippet?.superStickerDetails?.tier)
      },
      member: null,
      system: null,
      moderation: visibleModeration()
    };
  }

  if (type === "member") {
    return {
      ...base,
      kind: "member",
      text: normalizeText(payload.snippet?.memberMilestoneChatDetails?.userComment ?? payload.snippet?.displayMessage),
      purchase: null,
      member: {
        monthCount: normalizeNumber(payload.snippet?.memberMilestoneChatDetails?.memberMonth)
      },
      system: null,
      moderation: visibleModeration()
    };
  }

  if (type === "system") {
    return {
      ...base,
      kind: "system",
      text: normalizeText(payload.snippet?.displayMessage),
      purchase: null,
      member: null,
      system: {
        subtype: payload.snippet?.type === "newSponsorEvent" ? "new-sponsor" : "system-message"
      },
      moderation: {
        visibility: "system",
        deletionHandling: "not-deleted",
        historyUpdateStrategy: "not-required"
      }
    };
  }

  return {
    ...base,
    kind: "text",
    text: normalizeText(payload.snippet?.textMessageDetails?.messageText ?? payload.snippet?.displayMessage),
    purchase: null,
    member: null,
    system: null,
    moderation: visibleModeration()
  };
}

function normalizeProviderType(type: string | null | undefined): CommentTranslatorNormalizedLiveMessageKind {
  if (type === "superChatEvent") {
    return "super-chat";
  }

  if (type === "superStickerEvent") {
    return "super-sticker";
  }

  if (type === "memberMilestoneChatEvent") {
    return "member";
  }

  if (type === "newSponsorEvent" || type === "sponsorOnlyModeStartedEvent" || type === "sponsorOnlyModeEndedEvent") {
    return "system";
  }

  if (type === "messageDeletedEvent" || type === "tombstone") {
    return "deleted";
  }

  if (type === "userBannedEvent") {
    return "banned";
  }

  if (type === "liveChatEndedEvent" || type === "chatEndedEvent") {
    return "ended";
  }

  return "text";
}

function normalizeMessageReferenceId(payload: CommentTranslatorYouTubeLiveMessageProviderPayload): string | null {
  return normalizeString(payload.id);
}

function normalizePublishedAtIso(publishedAt: string | null | undefined): string {
  const parsed = typeof publishedAt === "string" ? Date.parse(publishedAt) : Number.NaN;
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }

  return new Date(0).toISOString();
}

function normalizeText(text: string | null | undefined): string | null {
  const normalized = normalizeString(text);
  return normalized ? normalized : null;
}

function normalizeString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeAuthorRole(
  authorDetails: CommentTranslatorYouTubeLiveMessageProviderPayload["authorDetails"]
): CommentTranslatorNormalizedLiveMessage["role"] {
  if (authorDetails?.isChatOwner) {
    return "owner";
  }

  if (authorDetails?.isChatModerator) {
    return "moderator";
  }

  if (authorDetails?.isChatSponsor) {
    return "member";
  }

  if (authorDetails) {
    return "viewer";
  }

  return "unknown";
}

function readBanAffectedMessageReferenceIds(payload: CommentTranslatorYouTubeLiveMessageProviderPayload): readonly string[] {
  const details = payload.snippet?.userBannedDetails;
  return [...(details?.affectedMessageIds ?? []), ...(details?.deletedMessageIds ?? [])]
    .map((value) => normalizeString(value))
    .filter((value): value is string => Boolean(value));
}

function visibleModeration(): CommentTranslatorNormalizedLiveMessage["moderation"] {
  return {
    visibility: "visible",
    deletionHandling: "not-deleted",
    historyUpdateStrategy: "not-required"
  };
}

function mapModerationLabel(message: CommentTranslatorNormalizedLiveMessage): CommentTranslatorLiveMessageBrowserSafeRow["moderationLabel"] {
  if (message.kind === "deleted") {
    return "deleted";
  }

  if (message.kind === "banned") {
    return "banned";
  }

  if (message.kind === "ended") {
    return "ended";
  }

  if (message.kind === "system") {
    return "system";
  }

  return "visible";
}

function mapDeletionPropagation(
  message: CommentTranslatorNormalizedLiveMessage
): CommentTranslatorLiveMessageBrowserSafeRow["deletionPropagation"] {
  if (message.kind === "deleted") {
    return "message-reference-tombstone-only";
  }

  if (message.kind === "banned") {
    return "author-history-p1-deferred";
  }

  if (message.kind === "ended") {
    return "stream-ended";
  }

  return "not-deleted";
}
