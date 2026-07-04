import "server-only";

export type YouTubeOAuthTokenBoundary = {
  runtime: "server-only";
  tokenKinds: readonly ["access-token", "refresh-token"];
  persistedStorage: "future-server-encrypted-token-store";
  clientComponent: "forbidden";
  localStorage: "forbidden";
  indexedDB: "forbidden";
  fixtures: "forbidden";
  docsAndPullRequests: "no-token-values";
  allowedScopeCandidates: readonly ["https://www.googleapis.com/auth/youtube.readonly"];
  consentPurpose: "read-owned-live-broadcast-and-live-chat";
  runtimeImplementation: "not-implemented";
};

export type YouTubeOwnerVerificationDecision = {
  status: "owner-verified" | "not-owner" | "not-live-enabled" | "unverified" | "unavailable";
  checkedBy: "future-server-oauth-orchestrator";
  evidence: {
    ownedBroadcastLookup: "liveBroadcasts.list-mine-true";
    liveChatIdSource: "owned-broadcast-snippet-liveChatId";
  };
  clientTrust: "display-only";
  providerRequest: "forbidden";
  runtimeImplementation: "not-implemented";
};

export type YouTubeBroadcasterReadOnlyDockBoundary = {
  ownerOnlyDecision: "server-owned";
  dockMode: "broadcaster-read-only";
  viewerFacingOverlay: "forbidden";
  commentMutation: "forbidden";
  moderationMutation: "forbidden";
  autoReply: "forbidden";
  clientComponentRole: "render-approved-state-only";
};

export type YouTubeLiveChatPollingCursor = {
  kind: "youtube-live-chat-next-page-token";
  value: string;
  retention: "short-lived-server-session-only";
  providerRequest: "forbidden";
  clientStorage: "forbidden";
};

export type YouTubeLiveChatPollingPolicy = {
  cursorMaterial: "nextPageToken-only";
  intervalSource: "pollingIntervalMillis";
  initialHistory: "youtube-api-most-recent-window";
  minBackoffMs: 1_000;
  maxBackoffMs: 60_000;
  jitter: "required";
  rateLimitExceeded: "recoverable-backoff";
  terminalStates: readonly ["liveChatDisabled", "liveChatEnded", "liveChatNotFound", "owner-verification-failed"];
  providerRequest: "forbidden";
  runtimeImplementation: "not-implemented";
};

export type YouTubeLiveChatRetrySemantics = {
  rateLimitExceeded: {
    type: "recoverable";
    action: "honor-polling-interval-and-backoff";
  };
  networkTimeout: {
    type: "recoverable";
    action: "retry-with-bounded-backoff";
  };
  forbidden: {
    type: "terminal-or-owner-required";
    action: "recheck-owner-verification-before-runtime-retry";
  };
  liveChatEnded: {
    type: "terminal";
    action: "stop-polling";
  };
};

export type YouTubeProviderSafeCommentPayload = {
  commentId: string;
  publishedAt: string;
  text: string;
  platformLanguageHint: string | null;
  authorDisplayName?: string | null;
};

export type YouTubeInputDiagnosticLogPolicy = {
  retention: "short-lived-only";
  rawTextLogging: "disabled-by-default";
  piiMinimization: "exclude-author-channel-viewer-and-token-material";
  allowedEventFields: readonly [
    "requestId",
    "pollAttemptId",
    "pollOutcome",
    "messageCount",
    "retryAfterMs",
    "ownerVerificationStatus"
  ];
  forbiddenEventFields: readonly [
    "oauthAccessToken",
    "oauthRefreshToken",
    "channelSecret",
    "viewerIdentifier",
    "rawOAuthState",
    "pollingCursor",
    "rawCommentText"
  ];
};

export type YouTubeInputCacheKeyContact = {
  includedMaterial: readonly [
    "normalizedCommentTextHash",
    "publishedAtBucket",
    "sourceLanguageHint",
    "targetLanguage",
    "moderationPolicyVersion"
  ];
  excludedMaterial: readonly [
    "oauthToken",
    "refreshToken",
    "channelSecret",
    "viewerIdentifier",
    "rawOAuthState",
    "pollingCursor"
  ];
};

export type YouTubeInputBoundaryContract = {
  implementationStage: "design-contract-only";
  platform: "youtube";
  oauthBoundary: YouTubeOAuthTokenBoundary;
  ownerVerification: YouTubeOwnerVerificationDecision;
  readOnlyDock: YouTubeBroadcasterReadOnlyDockBoundary;
  pollingPolicy: YouTubeLiveChatPollingPolicy;
  retrySemantics: YouTubeLiveChatRetrySemantics;
  providerSafeCommentPayload: {
    allowedFields: readonly ["commentId", "publishedAt", "text", "platformLanguageHint", "authorDisplayName"];
    forbiddenFields: readonly [
      "oauthAccessToken",
      "oauthRefreshToken",
      "channelSecret",
      "viewerIdentifier",
      "rawOAuthState",
      "pollingCursor"
    ];
  };
  diagnosticLogPolicy: YouTubeInputDiagnosticLogPolicy;
  cacheKeyContact: YouTubeInputCacheKeyContact;
  providerCoupling: "forbidden-direct-import-or-call";
  providerBridgeOwner: "future-server-orchestrator";
  storageMutation: "forbidden-in-this-slice";
};

export const youtubeOAuthTokenBoundary = {
  runtime: "server-only",
  tokenKinds: ["access-token", "refresh-token"],
  persistedStorage: "future-server-encrypted-token-store",
  clientComponent: "forbidden",
  localStorage: "forbidden",
  indexedDB: "forbidden",
  fixtures: "forbidden",
  docsAndPullRequests: "no-token-values",
  allowedScopeCandidates: ["https://www.googleapis.com/auth/youtube.readonly"],
  consentPurpose: "read-owned-live-broadcast-and-live-chat",
  runtimeImplementation: "not-implemented"
} as const satisfies YouTubeOAuthTokenBoundary;

export const youtubeOwnerVerificationDecision = {
  status: "unverified",
  checkedBy: "future-server-oauth-orchestrator",
  evidence: {
    ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
    liveChatIdSource: "owned-broadcast-snippet-liveChatId"
  },
  clientTrust: "display-only",
  providerRequest: "forbidden",
  runtimeImplementation: "not-implemented"
} as const satisfies YouTubeOwnerVerificationDecision;

export const youtubeBroadcasterReadOnlyDockBoundary = {
  ownerOnlyDecision: "server-owned",
  dockMode: "broadcaster-read-only",
  viewerFacingOverlay: "forbidden",
  commentMutation: "forbidden",
  moderationMutation: "forbidden",
  autoReply: "forbidden",
  clientComponentRole: "render-approved-state-only"
} as const satisfies YouTubeBroadcasterReadOnlyDockBoundary;

export const youtubeLiveChatPollingPolicy = {
  cursorMaterial: "nextPageToken-only",
  intervalSource: "pollingIntervalMillis",
  initialHistory: "youtube-api-most-recent-window",
  minBackoffMs: 1_000,
  maxBackoffMs: 60_000,
  jitter: "required",
  rateLimitExceeded: "recoverable-backoff",
  terminalStates: ["liveChatDisabled", "liveChatEnded", "liveChatNotFound", "owner-verification-failed"],
  providerRequest: "forbidden",
  runtimeImplementation: "not-implemented"
} as const satisfies YouTubeLiveChatPollingPolicy;

export const youtubeLiveChatRetrySemantics = {
  rateLimitExceeded: {
    type: "recoverable",
    action: "honor-polling-interval-and-backoff"
  },
  networkTimeout: {
    type: "recoverable",
    action: "retry-with-bounded-backoff"
  },
  forbidden: {
    type: "terminal-or-owner-required",
    action: "recheck-owner-verification-before-runtime-retry"
  },
  liveChatEnded: {
    type: "terminal",
    action: "stop-polling"
  }
} as const satisfies YouTubeLiveChatRetrySemantics;

export const youtubeProviderSafeCommentPayloadContract = {
  allowedFields: ["commentId", "publishedAt", "text", "platformLanguageHint", "authorDisplayName"],
  forbiddenFields: [
    "oauthAccessToken",
    "oauthRefreshToken",
    "channelSecret",
    "viewerIdentifier",
    "rawOAuthState",
    "pollingCursor"
  ]
} as const;

export const youtubeInputDiagnosticLogPolicy = {
  retention: "short-lived-only",
  rawTextLogging: "disabled-by-default",
  piiMinimization: "exclude-author-channel-viewer-and-token-material",
  allowedEventFields: [
    "requestId",
    "pollAttemptId",
    "pollOutcome",
    "messageCount",
    "retryAfterMs",
    "ownerVerificationStatus"
  ],
  forbiddenEventFields: [
    "oauthAccessToken",
    "oauthRefreshToken",
    "channelSecret",
    "viewerIdentifier",
    "rawOAuthState",
    "pollingCursor",
    "rawCommentText"
  ]
} as const satisfies YouTubeInputDiagnosticLogPolicy;

export const youtubeInputCacheKeyContact = {
  includedMaterial: [
    "normalizedCommentTextHash",
    "publishedAtBucket",
    "sourceLanguageHint",
    "targetLanguage",
    "moderationPolicyVersion"
  ],
  excludedMaterial: ["oauthToken", "refreshToken", "channelSecret", "viewerIdentifier", "rawOAuthState", "pollingCursor"]
} as const satisfies YouTubeInputCacheKeyContact;

export const youtubeInputBoundaryContract = {
  implementationStage: "design-contract-only",
  platform: "youtube",
  oauthBoundary: youtubeOAuthTokenBoundary,
  ownerVerification: youtubeOwnerVerificationDecision,
  readOnlyDock: youtubeBroadcasterReadOnlyDockBoundary,
  pollingPolicy: youtubeLiveChatPollingPolicy,
  retrySemantics: youtubeLiveChatRetrySemantics,
  providerSafeCommentPayload: youtubeProviderSafeCommentPayloadContract,
  diagnosticLogPolicy: youtubeInputDiagnosticLogPolicy,
  cacheKeyContact: youtubeInputCacheKeyContact,
  providerCoupling: "forbidden-direct-import-or-call",
  providerBridgeOwner: "future-server-orchestrator",
  storageMutation: "forbidden-in-this-slice"
} as const satisfies YouTubeInputBoundaryContract;
