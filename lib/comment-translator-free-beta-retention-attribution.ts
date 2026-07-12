import "server-only";

import type { YouTubeOAuthCredentialDisconnectResult } from "./comment-translator-youtube-disconnect-runtime";

export type CommentTranslatorFreeBetaRetentionAttributionUnavailableReason =
  | "durable-session-unreadable"
  | "durable-usage-unreadable"
  | "missing-entitlement"
  | "missing-provider-readiness";

export type CommentTranslatorFreeBetaRetentionAttributionInput = {
  durableSessionState: "ready" | "unreadable";
  durableUsageState: "ready" | "unreadable";
  entitlementState: "ready" | "missing";
  providerReadinessState: "ready" | "missing";
  nowMs: number;
};

export type CommentTranslatorOAuthDisconnectCleanupReadiness =
  | {
      status: "ready";
      trigger: "oauth-disconnect";
      execution: "server-owned-cleanup-required-not-run-by-contract";
      target: "durable-session-usage-and-session-scoped-feed-state";
      clientReadableDetail: "sanitized-cleanup-readiness-only";
      rawProviderPayload: "not-returned-by-design";
      rawComments: "not-returned-by-design";
      providerTargetMetadata: "forbidden";
    }
  | {
      status: "unavailable";
      trigger: "oauth-disconnect";
      unavailableReason:
        | "disconnect-unavailable"
        | "disconnect-failed"
        | "durable-session-unreadable"
        | "durable-usage-unreadable";
      execution: "not-run";
      clientReadableDetail: "sanitized-unavailable-only";
      rawProviderPayload: "not-returned-by-design";
      rawComments: "not-returned-by-design";
      providerTargetMetadata: "forbidden";
    };

export type CommentTranslatorFreeBetaRetentionAttributionState = {
  status: "available" | "unavailable";
  unavailableReason: CommentTranslatorFreeBetaRetentionAttributionUnavailableReason | null;
  dataDeletion: {
    requestPath: "server-action:requestCommentTranslatorDataDeletionAction";
    buttonState: "enabled" | "disabled";
    deletionScope: "server-owned-session-usage-and-session-scoped-feed-state";
    execution: "server-owned-cleanup-required-not-run-by-contract" | "not-run";
    clientReadableDetail: "sanitized-request-status-only" | "sanitized-unavailable-only";
  };
  retentionJob: {
    status: "ready" | "unavailable";
    authority: "server-owned-durable-session-and-usage-state";
    sessionScopedFeedRetention: "active-session-only";
    usageLedgerRetention: "current-month-for-free-cap-readiness";
    rawCommentRetention: "disabled-by-default";
    clientReadableDetail: "sanitized-retention-readiness-only" | "sanitized-unavailable-only";
  };
  oauthDisconnectCleanup: CommentTranslatorOAuthDisconnectCleanupReadiness;
  deletedMessagePropagation: {
    source: "f8-message-reference-only";
    strategy: "message-reference-tombstone-only";
    browserReadableText: "tombstone-only";
    rawCommentText: "never-returned-by-design";
    rawProviderPayload: "not-returned-by-design";
  };
  sourceAttribution: {
    source: "youtube-live-chat";
    label: "Source: YouTube Live Chat";
    relevantSurfaces: readonly ["live-comment-card", "live-feed-summary", "retention-attribution-panel"];
  };
  generatedAtIso: string;
  clientReadableDetail: "sanitized-retention-attribution-only";
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  authorChannelMaterial: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
  serverOnlyCursor: "not-returned-by-design";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  publicLaunchAllowed: false;
};

export const commentTranslatorFreeBetaRetentionAttributionContract = {
  implementationStage: "free-public-beta-f13-retention-attribution",
  runtime: "server-only",
  dataDeletionRequestPath: "server-action:requestCommentTranslatorDataDeletionAction",
  dataDeletionAuthority: "server-owned-durable-session-usage-and-session-scoped-feed-state",
  oauthDisconnectCleanup: "sanitized-cleanup-readiness-only",
  retentionJob: "server-owned-readiness-no-remote-mutation-in-this-thread",
  deletedMessagePropagation: "message-reference-tombstone-only",
  sourceAttribution: {
    source: "youtube-live-chat",
    label: "Source: YouTube Live Chat"
  },
  rawCommentRetention: "disabled-by-default",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
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

export function createCommentTranslatorFreeBetaRetentionAttributionState(
  input: CommentTranslatorFreeBetaRetentionAttributionInput
): CommentTranslatorFreeBetaRetentionAttributionState {
  const unavailableReason = resolveUnavailableReason(input);
  const available = unavailableReason === null;

  return {
    status: available ? "available" : "unavailable",
    unavailableReason,
    dataDeletion: {
      requestPath: "server-action:requestCommentTranslatorDataDeletionAction",
      buttonState: available ? "enabled" : "disabled",
      deletionScope: "server-owned-session-usage-and-session-scoped-feed-state",
      execution: available ? "server-owned-cleanup-required-not-run-by-contract" : "not-run",
      clientReadableDetail: available ? "sanitized-request-status-only" : "sanitized-unavailable-only"
    },
    retentionJob: {
      status: available ? "ready" : "unavailable",
      authority: "server-owned-durable-session-and-usage-state",
      sessionScopedFeedRetention: "active-session-only",
      usageLedgerRetention: "current-month-for-free-cap-readiness",
      rawCommentRetention: "disabled-by-default",
      clientReadableDetail: available ? "sanitized-retention-readiness-only" : "sanitized-unavailable-only"
    },
    oauthDisconnectCleanup: resolveCommentTranslatorOAuthDisconnectCleanupReadiness({
      disconnectStatus: "disconnected",
      durableSessionState: input.durableSessionState,
      durableUsageState: input.durableUsageState
    }),
    deletedMessagePropagation: {
      source: "f8-message-reference-only",
      strategy: "message-reference-tombstone-only",
      browserReadableText: "tombstone-only",
      rawCommentText: "never-returned-by-design",
      rawProviderPayload: "not-returned-by-design"
    },
    sourceAttribution: {
      source: "youtube-live-chat",
      label: "Source: YouTube Live Chat",
      relevantSurfaces: ["live-comment-card", "live-feed-summary", "retention-attribution-panel"]
    },
    generatedAtIso: new Date(input.nowMs).toISOString(),
    clientReadableDetail: "sanitized-retention-attribution-only",
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    authorChannelMaterial: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    publicLaunchAllowed: false
  };
}

export function resolveCommentTranslatorOAuthDisconnectCleanupReadiness({
  disconnectStatus,
  durableSessionState,
  durableUsageState
}: {
  disconnectStatus: YouTubeOAuthCredentialDisconnectResult["status"];
  durableSessionState: "ready" | "unreadable";
  durableUsageState: "ready" | "unreadable";
}): CommentTranslatorOAuthDisconnectCleanupReadiness {
  if (disconnectStatus === "disconnect-unavailable" || disconnectStatus === "disconnect-failed") {
    return createUnavailableOAuthDisconnectCleanupReadiness({
      unavailableReason: disconnectStatus
    });
  }

  if (durableSessionState !== "ready") {
    return createUnavailableOAuthDisconnectCleanupReadiness({
      unavailableReason: "durable-session-unreadable"
    });
  }

  if (durableUsageState !== "ready") {
    return createUnavailableOAuthDisconnectCleanupReadiness({
      unavailableReason: "durable-usage-unreadable"
    });
  }

  return {
    status: "ready",
    trigger: "oauth-disconnect",
    execution: "server-owned-cleanup-required-not-run-by-contract",
    target: "durable-session-usage-and-session-scoped-feed-state",
    clientReadableDetail: "sanitized-cleanup-readiness-only",
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

function resolveUnavailableReason(
  input: CommentTranslatorFreeBetaRetentionAttributionInput
): CommentTranslatorFreeBetaRetentionAttributionUnavailableReason | null {
  if (input.durableSessionState !== "ready") {
    return "durable-session-unreadable";
  }

  if (input.durableUsageState !== "ready") {
    return "durable-usage-unreadable";
  }

  if (input.entitlementState !== "ready") {
    return "missing-entitlement";
  }

  if (input.providerReadinessState !== "ready") {
    return "missing-provider-readiness";
  }

  return null;
}

function createUnavailableOAuthDisconnectCleanupReadiness({
  unavailableReason
}: {
  unavailableReason: Extract<CommentTranslatorOAuthDisconnectCleanupReadiness, { status: "unavailable" }>["unavailableReason"];
}): Extract<CommentTranslatorOAuthDisconnectCleanupReadiness, { status: "unavailable" }> {
  return {
    status: "unavailable",
    trigger: "oauth-disconnect",
    unavailableReason,
    execution: "not-run",
    clientReadableDetail: "sanitized-unavailable-only",
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}
