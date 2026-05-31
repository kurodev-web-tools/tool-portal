import "server-only";

import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";

export type YouTubeOwnerPollingRuntimeContract = {
  implementationStage: "server-only-runtime-foundation";
  platform: "youtube";
  tokenPersistence: "not-implemented";
  tokenRefresh: "not-implemented";
  tokenRevocation: "not-implemented";
  ownerVerification: "server-runtime-adapter";
  ownedBroadcastLookup: "liveBroadcasts.list-mine-true";
  readOnlyDockAuthorization: "server-owned";
  pollingCursor: "nextPageToken-server-session-only";
  pollingInterval: "pollingIntervalMillis";
  rateLimit: "recoverable-backoff";
  retry: "bounded-retry-without-network-runtime";
  terminalState: "explicit-stop-reason";
  sanitizedCommentBridgeAllowedFields: readonly ["commentId", "publishedAt", "text", "platformLanguageHint"];
  forbiddenRuntimeStorage: readonly [
    "localStorage",
    "IndexedDB",
    "Supabase schema",
    "migration",
    "RLS policy",
    "handoff payload"
  ];
  providerCoupling: "forbidden-direct-import-or-call";
  quotaWrite: "not-implemented";
};

export type YouTubeOwnerVerificationRuntimeRequest = {
  credentialReferenceId: string;
  expectedChannelReference?: string | null;
};

export type YouTubeOwnerVerificationRuntimeResult =
  | {
      status: "owner-verified";
      ownerChannelReference: string;
      checkedBy: "server-runtime-adapter";
      evidence: {
        ownedBroadcastLookup: "liveBroadcasts.list-mine-true";
        liveChatIdSource: "owned-broadcast-snippet-liveChatId";
      };
    }
  | {
      status: "not-owner" | "not-live-enabled" | "unverified" | "unavailable";
      checkedBy: "server-runtime-adapter";
      reason: string;
      evidence: {
        ownedBroadcastLookup: "liveBroadcasts.list-mine-true";
        liveChatIdSource: "owned-broadcast-snippet-liveChatId";
      } | null;
    };

export type YouTubeOwnedBroadcast = {
  broadcastId: string;
  liveChatId: string | null;
  title: string;
  lifecycleStatus: "created" | "ready" | "testing" | "live" | "complete" | "revoked";
  privacyStatus: "public" | "unlisted" | "private";
};

export type YouTubeOwnedBroadcastLookupRequest = {
  ownerChannelReference: string;
  includeNonLive?: boolean;
};

export type YouTubeOwnedBroadcastLookupResult = {
  lookup: "liveBroadcasts.list-mine-true";
  broadcasts: readonly YouTubeOwnedBroadcast[];
  providerRequest: "forbidden";
};

export type YouTubeReadOnlyDockAuthorization =
  | {
      status: "authorized";
      mode: "broadcaster-read-only";
      broadcastId: string;
      liveChatId: string;
      providerRequest: "forbidden";
      clientTrust: "display-only";
    }
  | {
      status: "blocked";
      mode: "broadcaster-read-only";
      reason: "owner-verification-failed";
      providerRequest: "forbidden";
      clientTrust: "display-only";
    }
  | {
      status: "unavailable";
      mode: "broadcaster-read-only";
      reason: "broadcast-not-found" | "broadcast-not-live" | "missing-live-chat";
      providerRequest: "forbidden";
      clientTrust: "display-only";
    };

export type YouTubeLiveChatTerminalStateCode =
  | "liveChatDisabled"
  | "liveChatEnded"
  | "liveChatNotFound"
  | "owner-verification-failed";

export type YouTubeLiveChatPollingRuntimeState = {
  liveChatId: string;
  nextPageToken: string | null;
  retryCount: number;
  nextPollAfterMs: number;
  terminal: {
    code: YouTubeLiveChatTerminalStateCode;
    stoppedAtMs: number;
  } | null;
};

export type YouTubeLiveChatPollingStepRequest = {
  state: YouTubeLiveChatPollingRuntimeState;
  nowMs: number;
};

export type YouTubeLiveChatSanitizableMessage = {
  id?: string;
  commentId?: string;
  publishedAt: string;
  text: string;
  platformLanguageHint: string | null;
  readonly [key: string]: unknown;
};

export type YouTubeLiveChatPollingStepInput =
  | {
      type: "messages";
      receivedAtMs: number;
      nextPageToken: string | null;
      pollingIntervalMillis: number;
      comments: readonly YouTubeLiveChatSanitizableMessage[];
    }
  | {
      type: "recoverable-error";
      code: "rateLimitExceeded" | "networkTimeout" | "temporaryUnavailable";
      receivedAtMs: number;
      pollingIntervalMillis: number | null;
      retryAfterMs: number | null;
    }
  | {
      type: "terminal";
      code: YouTubeLiveChatTerminalStateCode;
      receivedAtMs: number;
    };

export type YouTubeLiveChatPollingStepResult = {
  state: YouTubeLiveChatPollingRuntimeState;
  comments: readonly YouTubeProviderSafeCommentPayload[];
};

export type YouTubeSanitizedCommentBridgeResult = YouTubeLiveChatPollingStepResult;

export type YouTubeLiveChatRuntimeAdapter = {
  verifyOwner(request: YouTubeOwnerVerificationRuntimeRequest): Promise<YouTubeOwnerVerificationRuntimeResult>;
  lookupOwnedBroadcasts(request: YouTubeOwnedBroadcastLookupRequest): Promise<YouTubeOwnedBroadcastLookupResult>;
  pollLiveChatOnce(state: YouTubeLiveChatPollingRuntimeState): Promise<YouTubeLiveChatPollingStepResult>;
};

export const youtubeOwnerPollingRuntimeContract = {
  implementationStage: "server-only-runtime-foundation",
  platform: "youtube",
  tokenPersistence: "not-implemented",
  tokenRefresh: "not-implemented",
  tokenRevocation: "not-implemented",
  ownerVerification: "server-runtime-adapter",
  ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
  readOnlyDockAuthorization: "server-owned",
  pollingCursor: "nextPageToken-server-session-only",
  pollingInterval: "pollingIntervalMillis",
  rateLimit: "recoverable-backoff",
  retry: "bounded-retry-without-network-runtime",
  terminalState: "explicit-stop-reason",
  sanitizedCommentBridgeAllowedFields: ["commentId", "publishedAt", "text", "platformLanguageHint"],
  forbiddenRuntimeStorage: ["localStorage", "IndexedDB", "Supabase schema", "migration", "RLS policy", "handoff payload"],
  providerCoupling: "forbidden-direct-import-or-call",
  quotaWrite: "not-implemented"
} as const satisfies YouTubeOwnerPollingRuntimeContract;

export function createInitialYouTubeLiveChatPollingState({
  liveChatId,
  nowMs
}: {
  liveChatId: string;
  nowMs: number;
}): YouTubeLiveChatPollingRuntimeState {
  return {
    liveChatId,
    nextPageToken: null,
    retryCount: 0,
    nextPollAfterMs: nowMs,
    terminal: null
  };
}

export function authorizeYouTubeReadOnlyDock(
  ownerVerification: YouTubeOwnerVerificationRuntimeResult,
  broadcast: YouTubeOwnedBroadcast | null
): YouTubeReadOnlyDockAuthorization {
  if (ownerVerification.status !== "owner-verified") {
    return {
      status: "blocked",
      mode: "broadcaster-read-only",
      reason: "owner-verification-failed",
      providerRequest: "forbidden",
      clientTrust: "display-only"
    };
  }

  if (!broadcast) {
    return {
      status: "unavailable",
      mode: "broadcaster-read-only",
      reason: "broadcast-not-found",
      providerRequest: "forbidden",
      clientTrust: "display-only"
    };
  }

  if (broadcast.lifecycleStatus !== "live") {
    return {
      status: "unavailable",
      mode: "broadcaster-read-only",
      reason: "broadcast-not-live",
      providerRequest: "forbidden",
      clientTrust: "display-only"
    };
  }

  if (!broadcast.liveChatId) {
    return {
      status: "unavailable",
      mode: "broadcaster-read-only",
      reason: "missing-live-chat",
      providerRequest: "forbidden",
      clientTrust: "display-only"
    };
  }

  return {
    status: "authorized",
    mode: "broadcaster-read-only",
    broadcastId: broadcast.broadcastId,
    liveChatId: broadcast.liveChatId,
    providerRequest: "forbidden",
    clientTrust: "display-only"
  };
}

export function sanitizeYouTubeLiveChatMessage(
  message: YouTubeLiveChatSanitizableMessage
): YouTubeProviderSafeCommentPayload {
  const commentId = typeof message.commentId === "string" ? message.commentId : message.id;

  if (!commentId) {
    throw new Error("YouTube live chat message is missing a comment id.");
  }

  return {
    commentId,
    publishedAt: message.publishedAt,
    text: message.text,
    platformLanguageHint: message.platformLanguageHint
  };
}

export function advanceYouTubeLiveChatPollingState(
  currentState: YouTubeLiveChatPollingRuntimeState,
  step: YouTubeLiveChatPollingStepInput
): YouTubeLiveChatPollingStepResult {
  if (currentState.terminal) {
    return {
      state: currentState,
      comments: []
    };
  }

  if (step.type === "terminal") {
    return {
      state: {
        ...currentState,
        terminal: {
          code: step.code,
          stoppedAtMs: step.receivedAtMs
        }
      },
      comments: []
    };
  }

  if (step.type === "recoverable-error") {
    const retryCount = currentState.retryCount + 1;
    const retryDelayMs = chooseRecoverableDelayMs({
      retryCount,
      pollingIntervalMillis: step.pollingIntervalMillis,
      retryAfterMs: step.retryAfterMs
    });

    return {
      state: {
        ...currentState,
        retryCount,
        nextPollAfterMs: step.receivedAtMs + retryDelayMs
      },
      comments: []
    };
  }

  return {
    state: {
      ...currentState,
      nextPageToken: step.nextPageToken,
      retryCount: 0,
      nextPollAfterMs: step.receivedAtMs + clampPollingIntervalMs(step.pollingIntervalMillis)
    },
    comments: step.comments.map((comment) => sanitizeYouTubeLiveChatMessage(comment))
  };
}

export function createDeterministicYouTubeOwnerPollingRuntime({
  ownerVerification,
  broadcasts,
  pollSteps
}: {
  ownerVerification: YouTubeOwnerVerificationRuntimeResult;
  broadcasts: readonly YouTubeOwnedBroadcast[];
  pollSteps: readonly YouTubeLiveChatPollingStepInput[];
}): YouTubeLiveChatRuntimeAdapter {
  let pollIndex = 0;

  return {
    async verifyOwner() {
      return ownerVerification;
    },
    async lookupOwnedBroadcasts() {
      return {
        lookup: "liveBroadcasts.list-mine-true",
        broadcasts,
        providerRequest: "forbidden"
      };
    },
    async pollLiveChatOnce(state) {
      const step = pollSteps[pollIndex] ?? {
        type: "terminal",
        code: "liveChatEnded",
        receivedAtMs: state.nextPollAfterMs
      };
      pollIndex += 1;

      return advanceYouTubeLiveChatPollingState(state, step);
    }
  };
}

function chooseRecoverableDelayMs({
  retryCount,
  pollingIntervalMillis,
  retryAfterMs
}: {
  retryCount: number;
  pollingIntervalMillis: number | null;
  retryAfterMs: number | null;
}): number {
  const candidateDelays = [
    retryAfterMs ?? 0,
    pollingIntervalMillis ?? 0,
    1_000 * 2 ** Math.max(0, retryCount - 1)
  ];

  return Math.min(60_000, Math.max(1_000, ...candidateDelays));
}

function clampPollingIntervalMs(pollingIntervalMillis: number): number {
  return Math.min(60_000, Math.max(1_000, pollingIntervalMillis));
}
