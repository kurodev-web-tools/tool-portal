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

export type YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Check = {
  id:
    | "pr356-credential-status-width-review-merged"
    | "runtime-smoke-scope-isolated-from-ui"
    | "client-readable-output-boundary-preserved"
    | "credential-resolution-disabled-boundary-preserved"
    | "no-secret-logging-boundary-recorded"
    | "fresh-final-operator-confirmation-required"
    | "concrete-non-secret-target-metadata-required"
    | "env-reference-presence-required"
    | "fixture-reference-presence-required"
    | "owner-authorization-before-live-smoke-required";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeRuntimeSafeLiveSmokeReadinessPostPr356 = {
  implementationStage: "post-pr356-youtube-runtime-safe-live-smoke-readiness";
  selectedFollowUp: "record-youtube-runtime-safe-live-smoke-readiness-after-pr356-merge";
  prerequisiteCredentialStatusWidthReview: {
    pullRequest: "#356";
    mergeCommit: "83f1d5c4d90183b6f7bf97df8150650bc011cded";
    status: "credential-status-display-width-review-merged-no-ui-followup";
  };
  mergeGate: "fresh-pr356-merge-state-confirmed";
  actualSafeLiveRuntimeSmoke: "not-run-blocked-pending-fresh-operator-confirmation-target-metadata-env-and-no-secret-boundary";
  safeLiveYouTubeOAuthSmoke: "not-run";
  ownerVerificationSmoke: "not-run";
  liveChatPollingSmoke: "not-run";
  googleApiLiveCall: "not-run";
  requiredEnvReferences: readonly [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
  ];
  requiredFixtureReferences: readonly [
    "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
    "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
    "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
  ];
  requiredReadinessChecks: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Check[];
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
  ownerAuthorization: "required-before-owner-verification-status-read-or-live-chat-polling";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  secretHandling: "presence-and-sanitized-output-only-no-values";
  browserStorage: "unchanged";
  nextAction: "collect-final-operator-confirmation-target-metadata-env-references-and-no-secret-boundary-in-separate-runtime-smoke-thread";
  forbiddenInThisSlice: readonly [
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "owner verification live smoke",
    "Live Chat polling smoke",
    "refresh runtime",
    "full revocation runtime",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "owner user id or provider channel id display",
    "remote Supabase DB mutation",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change",
    "UI, CSS, or rendered text change"
  ];
};

export type YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Assessment =
  | {
      status: "blocked-missing-youtube-runtime-safe-live-smoke-readiness-checks";
      missingCheckIds: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Check["id"][];
      safeLiveYouTubeOAuthSmokeAllowedInThisPr: false;
      ownerVerificationSmokeAllowedInThisPr: false;
      liveChatPollingSmokeAllowedInThisPr: false;
      googleApiLiveCallAllowedInThisPr: false;
      nextAction: "record-post-pr356-youtube-runtime-safe-live-smoke-blockers-without-live-provider-call";
    }
  | {
      status: "blocked-pending-final-operator-confirmation-target-metadata-env-and-no-secret-boundary";
      completedCheckIds: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Check["id"][];
      blockingCheckIds: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Check["id"][];
      safeLiveYouTubeOAuthSmokeAllowedInThisPr: false;
      ownerVerificationSmokeAllowedInThisPr: false;
      liveChatPollingSmokeAllowedInThisPr: false;
      googleApiLiveCallAllowedInThisPr: false;
      nextAction: "collect-final-operator-confirmation-target-metadata-env-references-and-no-secret-boundary-in-separate-runtime-smoke-thread";
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

export const youtubeRuntimeSafeLiveSmokeReadinessPostPr356 = {
  implementationStage: "post-pr356-youtube-runtime-safe-live-smoke-readiness",
  selectedFollowUp: "record-youtube-runtime-safe-live-smoke-readiness-after-pr356-merge",
  prerequisiteCredentialStatusWidthReview: {
    pullRequest: "#356",
    mergeCommit: "83f1d5c4d90183b6f7bf97df8150650bc011cded",
    status: "credential-status-display-width-review-merged-no-ui-followup"
  },
  mergeGate: "fresh-pr356-merge-state-confirmed",
  actualSafeLiveRuntimeSmoke:
    "not-run-blocked-pending-fresh-operator-confirmation-target-metadata-env-and-no-secret-boundary",
  safeLiveYouTubeOAuthSmoke: "not-run",
  ownerVerificationSmoke: "not-run",
  liveChatPollingSmoke: "not-run",
  googleApiLiveCall: "not-run",
  requiredEnvReferences: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
  ],
  requiredFixtureReferences: [
    "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
    "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
    "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
  ],
  requiredReadinessChecks: [
    {
      id: "pr356-credential-status-width-review-merged",
      status: "recorded",
      evidence:
        "Fresh fetch and GitHub PR metadata confirm PR #356 is merged into codex/comment-translator-preview with merge commit 83f1d5c4d90183b6f7bf97df8150650bc011cded."
    },
    {
      id: "runtime-smoke-scope-isolated-from-ui",
      status: "recorded",
      evidence: "PR #356 concluded no actual credential status display UI follow-up; this slice does not change UI, CSS, or rendered text."
    },
    {
      id: "client-readable-output-boundary-preserved",
      status: "recorded",
      evidence: "Client-readable output remains limited to opaque credentialReferenceId and sanitized credential status metadata."
    },
    {
      id: "credential-resolution-disabled-boundary-preserved",
      status: "recorded",
      evidence: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED remains the emergency credential-resolution-disabled boundary."
    },
    {
      id: "no-secret-logging-boundary-recorded",
      status: "recorded",
      evidence: "Service role key values, managed secret values, OAuth token values, owner user ids, and provider channel ids must not be requested, printed, stored, or committed."
    },
    {
      id: "fresh-final-operator-confirmation-required",
      status: "blocking-external-action",
      evidence: "This thread does not contain final operator confirmation for safe live YouTube OAuth, owner verification, or Live Chat polling smoke."
    },
    {
      id: "concrete-non-secret-target-metadata-required",
      status: "blocking-external-action",
      evidence: "This thread does not contain concrete non-secret target metadata for the YouTube runtime smoke target."
    },
    {
      id: "env-reference-presence-required",
      status: "blocking-external-action",
      evidence: "Codex process env reference presence is missing for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED."
    },
    {
      id: "fixture-reference-presence-required",
      status: "blocking-external-action",
      evidence: "Codex process fixture reference presence is missing for credential reference, owner reference, and provider channel reference names."
    },
    {
      id: "owner-authorization-before-live-smoke-required",
      status: "blocking-external-action",
      evidence: "Owner authorization must run before any owner verification status read or Live Chat polling smoke."
    }
  ],
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
  ownerAuthorization: "required-before-owner-verification-status-read-or-live-chat-polling",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  secretHandling: "presence-and-sanitized-output-only-no-values",
  browserStorage: "unchanged",
  nextAction: "collect-final-operator-confirmation-target-metadata-env-references-and-no-secret-boundary-in-separate-runtime-smoke-thread",
  forbiddenInThisSlice: [
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "owner verification live smoke",
    "Live Chat polling smoke",
    "refresh runtime",
    "full revocation runtime",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "owner user id or provider channel id display",
    "remote Supabase DB mutation",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change",
    "UI, CSS, or rendered text change"
  ]
} as const satisfies YouTubeRuntimeSafeLiveSmokeReadinessPostPr356;

export function assessYouTubeRuntimeSafeLiveSmokeReadinessPostPr356(
  completedChecks: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Check[]
): YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Assessment {
  const requiredCheckIds = youtubeRuntimeSafeLiveSmokeReadinessPostPr356.requiredReadinessChecks.map(
    (check) => check.id
  );
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingCheckIds = requiredCheckIds.filter((id) => !completedCheckIds.includes(id));
  const missingRecordedCheckIds = youtubeRuntimeSafeLiveSmokeReadinessPostPr356.requiredReadinessChecks
    .filter((check) => check.status === "recorded" && missingCheckIds.includes(check.id))
    .map((check) => check.id);

  if (completedChecks.length === 0 || missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-youtube-runtime-safe-live-smoke-readiness-checks",
      missingCheckIds: completedChecks.length === 0 ? missingCheckIds : missingRecordedCheckIds,
      safeLiveYouTubeOAuthSmokeAllowedInThisPr: false,
      ownerVerificationSmokeAllowedInThisPr: false,
      liveChatPollingSmokeAllowedInThisPr: false,
      googleApiLiveCallAllowedInThisPr: false,
      nextAction: "record-post-pr356-youtube-runtime-safe-live-smoke-blockers-without-live-provider-call"
    };
  }

  const blockingCheckIds = youtubeRuntimeSafeLiveSmokeReadinessPostPr356.requiredReadinessChecks
    .filter((check) => check.status === "blocking-external-action")
    .map((check) => check.id);

  return {
    status: "blocked-pending-final-operator-confirmation-target-metadata-env-and-no-secret-boundary",
    completedCheckIds,
    blockingCheckIds,
    safeLiveYouTubeOAuthSmokeAllowedInThisPr: false,
    ownerVerificationSmokeAllowedInThisPr: false,
    liveChatPollingSmokeAllowedInThisPr: false,
    googleApiLiveCallAllowedInThisPr: false,
    nextAction: "collect-final-operator-confirmation-target-metadata-env-references-and-no-secret-boundary-in-separate-runtime-smoke-thread"
  };
}

export function createYouTubeRuntimeSafeLiveSmokeReadinessPostPr356Summary(): string {
  const assessment = assessYouTubeRuntimeSafeLiveSmokeReadinessPostPr356(
    youtubeRuntimeSafeLiveSmokeReadinessPostPr356.requiredReadinessChecks
  );

  return [
    `Stage: ${youtubeRuntimeSafeLiveSmokeReadinessPostPr356.implementationStage}.`,
    `Result: ${assessment.status}.`,
    `PR ${youtubeRuntimeSafeLiveSmokeReadinessPostPr356.prerequisiteCredentialStatusWidthReview.pullRequest} credential status width review is recorded as ${youtubeRuntimeSafeLiveSmokeReadinessPostPr356.prerequisiteCredentialStatusWidthReview.status}.`,
    `Actual safe live runtime smoke: ${youtubeRuntimeSafeLiveSmokeReadinessPostPr356.actualSafeLiveRuntimeSmoke}.`,
    "No Google API live call, No safe live YouTube OAuth smoke, No owner verification smoke, and No Live Chat polling smoke are run in this PR."
  ].join(" ");
}

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
