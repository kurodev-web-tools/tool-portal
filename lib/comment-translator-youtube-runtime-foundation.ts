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

export type YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Check = {
  id:
    | "pr357-runtime-smoke-readiness-merged"
    | "source-thread-final-operator-approval-recorded"
    | "runtime-smoke-scope-isolated-from-ui-and-storage"
    | "client-readable-output-boundary-preserved"
    | "no-secret-logging-boundary-preserved"
    | "concrete-non-secret-youtube-runtime-target-metadata-required"
    | "codex-process-env-reference-presence-required"
    | "codex-process-fixture-reference-presence-required"
    | "dedicated-sanitized-live-runtime-smoke-command-required"
    | "owner-authorization-execution-before-live-smoke-required";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeRuntimeSafeLiveSmokeReadinessPostPr357 = {
  implementationStage: "post-pr357-youtube-runtime-safe-live-smoke-execution-gate";
  selectedFollowUp: "record-youtube-runtime-safe-live-smoke-execution-gate-after-pr357-merge";
  prerequisiteRuntimeSmokeReadiness: {
    pullRequest: "#357";
    mergeCommit: "98a702ff9741d586d75671cb0fd4536c934b8f82";
    status: "post-pr356-youtube-runtime-safe-live-smoke-readiness-merged";
  };
  mergeGate: "fresh-pr357-merge-state-confirmed";
  finalOperatorApproval: "recorded-from-source-thread-for-safe-live-youtube-oauth-owner-verification-live-chat-polling-smoke";
  actualSafeLiveRuntimeSmoke: "not-run-blocked-pending-target-metadata-env-fixture-and-live-runtime-command-boundary";
  safeLiveYouTubeOAuthSmoke: "not-run";
  ownerVerificationSmoke: "not-run";
  liveChatPollingSmoke: "not-run";
  googleApiLiveCall: "not-run";
  codexProcessReferencePresence: {
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
    presenceResult: "missing-by-presence-only-check";
    valuesReadOrPrinted: false;
  };
  assessedMissingPreconditions: readonly [
    "concrete-non-secret-youtube-runtime-target-metadata",
    "codex-process-env-reference-presence",
    "codex-process-fixture-reference-presence",
    "dedicated-sanitized-live-runtime-smoke-command",
    "owner-authorization-execution-before-owner-verification-or-live-chat-polling"
  ];
  requiredReadinessChecks: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Check[];
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
  ownerAuthorization: "required-before-owner-verification-status-read-or-live-chat-polling";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  secretHandling: "presence-and-sanitized-output-only-no-values";
  browserStorage: "unchanged";
  nextAction: "collect-safe-target-metadata-env-fixture-and-dedicated-sanitized-live-runtime-command-before-actual-smoke";
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

export type YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Assessment =
  | {
      status: "blocked-missing-youtube-runtime-safe-live-smoke-execution-gate-checks";
      missingCheckIds: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      nextAction: "record-post-pr357-youtube-runtime-safe-live-smoke-execution-blockers-without-live-provider-call";
    }
  | {
      status: "blocked-pending-target-metadata-env-fixture-and-live-runtime-command-boundary";
      completedCheckIds: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Check["id"][];
      blockingCheckIds: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      nextAction: "collect-safe-target-metadata-env-fixture-and-dedicated-sanitized-live-runtime-command-before-actual-smoke";
    };

export type YouTubeRuntimeSafeLiveSmokeCommandPostPr358Check = {
  id:
    | "pr358-runtime-smoke-execution-gate-merged"
    | "operator-local-service-role-smoke-success-evidence-recorded"
    | "dedicated-sanitized-live-runtime-command-added"
    | "command-preflight-sanitized-output-preserved"
    | "env-reference-presence-required"
    | "fixture-reference-presence-required"
    | "target-metadata-reference-presence-required"
    | "owner-authorization-preflight-required"
    | "server-only-live-token-resolution-runtime-required";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeRuntimeSafeLiveSmokeCommandPostPr358 = {
  implementationStage: "post-pr358-dedicated-sanitized-youtube-live-runtime-smoke-command";
  selectedFollowUp: "add-dedicated-sanitized-live-runtime-smoke-command-after-pr358-merge";
  prerequisiteRuntimeSmokeExecutionGate: {
    pullRequest: "#358";
    mergeCommit: "b4d441096a6cde3abf6a301f36020e2c1569bd12";
    status: "post-pr357-youtube-runtime-safe-live-smoke-execution-gate-merged";
  };
  operatorLocalServiceRoleSmokeEvidence: {
    commandCheckState: "ready-for-bounded-service-role-smoke-command";
    commandExecuteState: "passed";
    persistenceStatus: "persisted";
    readStatus: "available";
    credentialReferenceId: "smoke-pr351-local-20260606a";
    tokenValue: "never-returned-by-design";
    refreshTokenValue: "never-returned-by-design";
  };
  commandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs";
  actualSafeLiveRuntimeSmoke: "not-run-blocked-pending-env-fixture-target-owner-authorization-or-live-token-resolution";
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
  requiredTargetMetadataReferences: readonly ["YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT"];
  ownerAuthorizationPreflightReference: "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED";
  requiredReadinessChecks: readonly YouTubeRuntimeSafeLiveSmokeCommandPostPr358Check[];
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  secretHandling: "presence-and-sanitized-output-only-no-values";
  browserStorage: "unchanged";
  nextAction: "run-dedicated-command-only-when-sanitized-preflight-and-server-only-live-token-resolution-exist";
  forbiddenInThisSlice: readonly [
    "Google API live call",
    "safe live YouTube OAuth smoke execution",
    "owner verification live smoke execution",
    "Live Chat polling smoke execution",
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

export type YouTubeRuntimeSafeLiveSmokeCommandPostPr358Assessment =
  | {
      status: "blocked-missing-youtube-live-runtime-smoke-command-checks";
      missingCheckIds: readonly YouTubeRuntimeSafeLiveSmokeCommandPostPr358Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      nextAction: "record-post-pr358-command-readiness-without-live-provider-call";
    }
  | {
      status: "blocked-pending-env-fixture-target-owner-authorization-or-live-token-resolution";
      completedCheckIds: readonly YouTubeRuntimeSafeLiveSmokeCommandPostPr358Check["id"][];
      blockingCheckIds: readonly YouTubeRuntimeSafeLiveSmokeCommandPostPr358Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      nextAction: "run-dedicated-command-only-when-sanitized-preflight-and-server-only-live-token-resolution-exist";
    };

export type YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Check = {
  id:
    | "pr359-live-runtime-smoke-command-merged"
    | "command-execute-token-resolution-blocker-recorded"
    | "server-only-live-token-resolution-boundary-preserved"
    | "token-store-success-evidence-reference-recorded"
    | "server-only-live-token-resolution-runtime-required";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeRuntimeLiveTokenResolutionReadinessPostPr359 = {
  implementationStage: "post-pr359-server-only-live-token-resolution-readiness";
  selectedFollowUp: "record-server-only-live-token-resolution-readiness-after-pr359-merge";
  prerequisiteLiveRuntimeSmokeCommand: {
    pullRequest: "#359";
    mergeCommit: "6972c0c600acbbb8bd596d2635416921f4fa6751";
    status: "post-pr358-dedicated-sanitized-live-runtime-smoke-command-merged";
  };
  mergeGate: "fresh-pr359-merge-state-confirmed";
  commandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs";
  serverOnlyLiveTokenResolutionRuntime: "not-implemented-readiness-only";
  actualSafeLiveRuntimeSmoke: "not-run-blocked-pending-server-only-live-token-resolution-runtime";
  safeLiveYouTubeOAuthSmoke: "not-run";
  ownerVerificationSmoke: "not-run";
  liveChatPollingSmoke: "not-run";
  googleApiLiveCall: "not-run";
  requiredReadinessChecks: readonly YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Check[];
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  secretHandling: "presence-and-sanitized-output-only-no-values";
  browserStorage: "unchanged";
  nextAction: "implement-server-only-live-token-resolution-runtime-in-separate-approved-pr-before-actual-live-smoke";
  forbiddenInThisSlice: readonly [
    "Google API live call",
    "safe live YouTube OAuth smoke execution",
    "owner verification live smoke execution",
    "Live Chat polling smoke execution",
    "token refresh runtime",
    "full revocation runtime",
    "OAuth browser flow",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "owner user id or provider channel id display",
    "remote Supabase DB mutation",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change",
    "UI, CSS, or rendered text change"
  ];
};

export type YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Assessment =
  | {
      status: "blocked-missing-server-only-live-token-resolution-readiness-checks";
      missingCheckIds: readonly YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      nextAction: "record-post-pr359-server-only-live-token-resolution-readiness-without-live-provider-call";
    }
  | {
      status: "blocked-pending-server-only-live-token-resolution-runtime";
      completedCheckIds: readonly YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Check["id"][];
      blockingCheckIds: readonly YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      nextAction: "implement-server-only-live-token-resolution-runtime-in-separate-approved-pr-before-actual-live-smoke";
    };

export type YouTubeRuntimeReadOnlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly";

export type YouTubeLiveTokenResolutionOwnerAuthorization =
  | {
      status: "authorized";
      ownerUserId: string;
    }
  | {
      status: "blocked";
      reason: "owner-authorization-preflight-not-confirmed" | "caller-not-authenticated" | "auth-unavailable";
    };

export type YouTubeLiveTokenResolutionTrustedStatus = {
  credentialReferenceId: string;
  provider: "youtube";
  providerChannelId: string;
  scopeLabel: "youtube.readonly";
  scopeSet: readonly YouTubeRuntimeReadOnlyOAuthScope[];
  expiresAtIso: string;
  expiryStatus: "active" | "expired" | "revoked";
  revoked: boolean;
  revokedAtIso: string | null;
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  ciphertext: "never-returned-by-design";
  decryptCapability: "forbidden";
};

export type YouTubeLiveTokenResolutionTrustedStatusReader = {
  getCredentialStatus(request: {
    credentialReferenceId: string;
    ownerUserId: string;
  }): Promise<YouTubeLiveTokenResolutionTrustedStatus>;
};

export type YouTubeServerOnlyLiveTokenMaterialRequest = {
  credentialReferenceId: string;
  ownerUserId: string;
  requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
};

export type YouTubeServerOnlyLiveTokenMaterial =
  | {
      status: "available";
      serverAuthorizationHeader: string;
      expiresAtIso: string;
    }
  | {
      status: "unavailable" | "expired" | "scope-missing";
      reason: string;
    };

export type YouTubeServerOnlyLiveTokenMaterialResolver = {
  resolveServerOnlyTokenMaterial(
    request: YouTubeServerOnlyLiveTokenMaterialRequest
  ): Promise<YouTubeServerOnlyLiveTokenMaterial>;
};

export type YouTubeServerFetchAuthorizationConsumer = (binding: {
  credentialReferenceId: string;
  requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
  serverAuthorizationHeader: string;
  expiresAtIso: string;
}) => Promise<{
  serverFetchBinding: "resolved-for-server-fetch";
}>;

export type YouTubeLiveTokenResolutionRuntimeRequest = {
  credentialReferenceId: string;
  ownerAuthorization: YouTubeLiveTokenResolutionOwnerAuthorization;
  credentialResolutionDisabled: boolean;
  requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
  nowIso: string;
  trustedStatusReader: YouTubeLiveTokenResolutionTrustedStatusReader | null;
  tokenMaterialResolver: YouTubeServerOnlyLiveTokenMaterialResolver;
  consumeServerFetchAuthorization: YouTubeServerFetchAuthorizationConsumer;
};

export type YouTubeLiveTokenResolutionRuntimeResult =
  | {
      status: "resolved-for-server-fetch";
      credentialReferenceId: string;
      provider: "youtube";
      scopeLabel: "youtube.readonly";
      expiryStatus: "active";
      serverFetchBinding: "resolved-for-server-fetch";
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
    }
  | {
      status:
        | "unavailable"
        | "scope-missing"
        | "expired"
        | "credential-resolution-disabled"
        | "blocked-owner-authorization";
      credentialReferenceId: string;
      provider: "youtube";
      reason: string;
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
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

export const youtubeRuntimeSafeLiveSmokeReadinessPostPr357 = {
  implementationStage: "post-pr357-youtube-runtime-safe-live-smoke-execution-gate",
  selectedFollowUp: "record-youtube-runtime-safe-live-smoke-execution-gate-after-pr357-merge",
  prerequisiteRuntimeSmokeReadiness: {
    pullRequest: "#357",
    mergeCommit: "98a702ff9741d586d75671cb0fd4536c934b8f82",
    status: "post-pr356-youtube-runtime-safe-live-smoke-readiness-merged"
  },
  mergeGate: "fresh-pr357-merge-state-confirmed",
  finalOperatorApproval:
    "recorded-from-source-thread-for-safe-live-youtube-oauth-owner-verification-live-chat-polling-smoke",
  actualSafeLiveRuntimeSmoke: "not-run-blocked-pending-target-metadata-env-fixture-and-live-runtime-command-boundary",
  safeLiveYouTubeOAuthSmoke: "not-run",
  ownerVerificationSmoke: "not-run",
  liveChatPollingSmoke: "not-run",
  googleApiLiveCall: "not-run",
  codexProcessReferencePresence: {
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
    presenceResult: "missing-by-presence-only-check",
    valuesReadOrPrinted: false
  },
  assessedMissingPreconditions: [
    "concrete-non-secret-youtube-runtime-target-metadata",
    "codex-process-env-reference-presence",
    "codex-process-fixture-reference-presence",
    "dedicated-sanitized-live-runtime-smoke-command",
    "owner-authorization-execution-before-owner-verification-or-live-chat-polling"
  ],
  requiredReadinessChecks: [
    {
      id: "pr357-runtime-smoke-readiness-merged",
      status: "recorded",
      evidence:
        "Fresh fetch and GitHub PR metadata confirm PR #357 is merged into codex/comment-translator-preview with merge commit 98a702ff9741d586d75671cb0fd4536c934b8f82."
    },
    {
      id: "source-thread-final-operator-approval-recorded",
      status: "recorded",
      evidence:
        "The source thread approval permits moving toward safe live YouTube OAuth, owner verification, and Live Chat polling smoke within the no-secret/no-token boundary."
    },
    {
      id: "runtime-smoke-scope-isolated-from-ui-and-storage",
      status: "recorded",
      evidence:
        "This slice does not change UI, CSS, rendered text, localStorage, IndexedDB, sessionStorage, or handoff payloads."
    },
    {
      id: "client-readable-output-boundary-preserved",
      status: "recorded",
      evidence: "Client-readable output remains limited to opaque credentialReferenceId and sanitized credential status metadata."
    },
    {
      id: "no-secret-logging-boundary-preserved",
      status: "recorded",
      evidence:
        "Service role key values, managed secret values, OAuth token values, owner user ids, and provider channel ids are not requested, printed, stored, or committed."
    },
    {
      id: "concrete-non-secret-youtube-runtime-target-metadata-required",
      status: "blocking-external-action",
      evidence: "No repo-local safe non-secret YouTube runtime target metadata is available in this worktree."
    },
    {
      id: "codex-process-env-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "Codex process env reference presence is missing for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED."
    },
    {
      id: "codex-process-fixture-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "Codex process fixture reference presence is missing for credential reference, owner reference, and provider channel reference names."
    },
    {
      id: "dedicated-sanitized-live-runtime-smoke-command-required",
      status: "blocking-external-action",
      evidence:
        "No dedicated sanitized live YouTube runtime smoke command exists for OAuth, owner verification, and Live Chat polling execution without raw provider response exposure."
    },
    {
      id: "owner-authorization-execution-before-live-smoke-required",
      status: "blocking-external-action",
      evidence:
        "Owner authorization has not executed in this worktree and must run before owner verification status read or Live Chat polling smoke."
    }
  ],
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
  ownerAuthorization: "required-before-owner-verification-status-read-or-live-chat-polling",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  secretHandling: "presence-and-sanitized-output-only-no-values",
  browserStorage: "unchanged",
  nextAction: "collect-safe-target-metadata-env-fixture-and-dedicated-sanitized-live-runtime-command-before-actual-smoke",
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
} as const satisfies YouTubeRuntimeSafeLiveSmokeReadinessPostPr357;

export const youtubeRuntimeSafeLiveSmokeCommandPostPr358 = {
  implementationStage: "post-pr358-dedicated-sanitized-youtube-live-runtime-smoke-command",
  selectedFollowUp: "add-dedicated-sanitized-live-runtime-smoke-command-after-pr358-merge",
  prerequisiteRuntimeSmokeExecutionGate: {
    pullRequest: "#358",
    mergeCommit: "b4d441096a6cde3abf6a301f36020e2c1569bd12",
    status: "post-pr357-youtube-runtime-safe-live-smoke-execution-gate-merged"
  },
  operatorLocalServiceRoleSmokeEvidence: {
    commandCheckState: "ready-for-bounded-service-role-smoke-command",
    commandExecuteState: "passed",
    persistenceStatus: "persisted",
    readStatus: "available",
    credentialReferenceId: "smoke-pr351-local-20260606a",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design"
  },
  commandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  actualSafeLiveRuntimeSmoke:
    "not-run-blocked-pending-env-fixture-target-owner-authorization-or-live-token-resolution",
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
  requiredTargetMetadataReferences: ["YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT"],
  ownerAuthorizationPreflightReference: "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED",
  requiredReadinessChecks: [
    {
      id: "pr358-runtime-smoke-execution-gate-merged",
      status: "recorded",
      evidence:
        "Fresh fetch and GitHub PR metadata confirm PR #358 is merged into codex/comment-translator-preview with merge commit b4d441096a6cde3abf6a301f36020e2c1569bd12."
    },
    {
      id: "operator-local-service-role-smoke-success-evidence-recorded",
      status: "recorded",
      evidence:
        "The handoff thread records sanitized operator-local bounded service-role status/persistence smoke success with opaque credentialReferenceId only."
    },
    {
      id: "dedicated-sanitized-live-runtime-command-added",
      status: "recorded",
      evidence:
        "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs provides check-env-only and execute modes with sanitized output."
    },
    {
      id: "command-preflight-sanitized-output-preserved",
      status: "recorded",
      evidence:
        "The command reports env, fixture, target, and owner-authorization preflight blockers by reference name only."
    },
    {
      id: "env-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "Actual live runtime smoke requires env reference presence for Supabase URL, service-role key, and credential-resolution disabled boundary without printing values."
    },
    {
      id: "fixture-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "Actual live runtime smoke requires fixture reference presence for credential, owner, and provider channel references without printing values."
    },
    {
      id: "target-metadata-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "Actual live runtime smoke requires repo/operator-local non-secret target metadata presence before live provider calls."
    },
    {
      id: "owner-authorization-preflight-required",
      status: "blocking-external-action",
      evidence:
        "Owner authorization preflight must be confirmed before owner verification or Live Chat polling smoke."
    },
    {
      id: "server-only-live-token-resolution-runtime-required",
      status: "blocking-external-action",
      evidence:
        "Actual Google API calls still require a server-only live token resolution runtime that obtains token material without returning or printing it."
    }
  ],
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  secretHandling: "presence-and-sanitized-output-only-no-values",
  browserStorage: "unchanged",
  nextAction: "run-dedicated-command-only-when-sanitized-preflight-and-server-only-live-token-resolution-exist",
  forbiddenInThisSlice: [
    "Google API live call",
    "safe live YouTube OAuth smoke execution",
    "owner verification live smoke execution",
    "Live Chat polling smoke execution",
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
} as const satisfies YouTubeRuntimeSafeLiveSmokeCommandPostPr358;

export const youtubeRuntimeLiveTokenResolutionReadinessPostPr359 = {
  implementationStage: "post-pr359-server-only-live-token-resolution-readiness",
  selectedFollowUp: "record-server-only-live-token-resolution-readiness-after-pr359-merge",
  prerequisiteLiveRuntimeSmokeCommand: {
    pullRequest: "#359",
    mergeCommit: "6972c0c600acbbb8bd596d2635416921f4fa6751",
    status: "post-pr358-dedicated-sanitized-live-runtime-smoke-command-merged"
  },
  mergeGate: "fresh-pr359-merge-state-confirmed",
  commandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  serverOnlyLiveTokenResolutionRuntime: "not-implemented-readiness-only",
  actualSafeLiveRuntimeSmoke: "not-run-blocked-pending-server-only-live-token-resolution-runtime",
  safeLiveYouTubeOAuthSmoke: "not-run",
  ownerVerificationSmoke: "not-run",
  liveChatPollingSmoke: "not-run",
  googleApiLiveCall: "not-run",
  requiredReadinessChecks: [
    {
      id: "pr359-live-runtime-smoke-command-merged",
      status: "recorded",
      evidence:
        "Fresh fetch and GitHub PR metadata confirm PR #359 is merged into codex/comment-translator-preview with merge commit 6972c0c600acbbb8bd596d2635416921f4fa6751."
    },
    {
      id: "command-execute-token-resolution-blocker-recorded",
      status: "recorded",
      evidence:
        "The dedicated live runtime smoke command records blocked-pending-server-only-live-token-resolution-runtime before any live provider call."
    },
    {
      id: "server-only-live-token-resolution-boundary-preserved",
      status: "recorded",
      evidence:
        "The readiness boundary keeps token material server-only and returns only sanitized metadata."
    },
    {
      id: "token-store-success-evidence-reference-recorded",
      status: "recorded",
      evidence:
        "Prior operator-local token-store smoke success evidence is referenced by opaque credentialReferenceId only; token values remain never-returned-by-design."
    },
    {
      id: "server-only-live-token-resolution-runtime-required",
      status: "blocking-external-action",
      evidence:
        "Actual OAuth, owner verification, and Live Chat polling smoke still require a separate approved runtime that obtains token material without returning or printing it."
    }
  ],
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  secretHandling: "presence-and-sanitized-output-only-no-values",
  browserStorage: "unchanged",
  nextAction: "implement-server-only-live-token-resolution-runtime-in-separate-approved-pr-before-actual-live-smoke",
  forbiddenInThisSlice: [
    "Google API live call",
    "safe live YouTube OAuth smoke execution",
    "owner verification live smoke execution",
    "Live Chat polling smoke execution",
    "token refresh runtime",
    "full revocation runtime",
    "OAuth browser flow",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "owner user id or provider channel id display",
    "remote Supabase DB mutation",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change",
    "UI, CSS, or rendered text change"
  ]
} as const satisfies YouTubeRuntimeLiveTokenResolutionReadinessPostPr359;

export const youtubeLiveTokenResolutionRuntimeContract = {
  implementationStage: "post-pr360-server-only-live-token-resolution-runtime",
  prerequisiteReadiness: {
    pullRequest: "#360",
    mergeCommit: "5aba3649083352f7daad83791e7ee4fa811c22c9",
    status: "post-pr359-server-only-live-token-resolution-readiness-merged"
  },
  input: "credentialReferenceId-and-owner-authorization-context",
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  tokenMaterialHandling: "internal-server-fetch-consumer-only",
  outputPolicy: "sanitized-metadata-only",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  liveGoogleApiCall: "not-run",
  refreshRuntime: "not-implemented",
  revocationRuntime: "not-implemented",
  browserStorage: "unchanged"
} as const;

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

export function assessYouTubeRuntimeSafeLiveSmokeReadinessPostPr357(
  completedChecks: readonly YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Check[]
): YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Assessment {
  const requiredCheckIds = youtubeRuntimeSafeLiveSmokeReadinessPostPr357.requiredReadinessChecks.map(
    (check) => check.id
  );
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingCheckIds = requiredCheckIds.filter((id) => !completedCheckIds.includes(id));
  const missingRecordedCheckIds = youtubeRuntimeSafeLiveSmokeReadinessPostPr357.requiredReadinessChecks
    .filter((check) => check.status === "recorded" && missingCheckIds.includes(check.id))
    .map((check) => check.id);

  if (completedChecks.length === 0 || missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-youtube-runtime-safe-live-smoke-execution-gate-checks",
      missingCheckIds: completedChecks.length === 0 ? missingCheckIds : missingRecordedCheckIds,
      safeLiveYouTubeOAuthSmokeExecuted: false,
      ownerVerificationSmokeExecuted: false,
      liveChatPollingSmokeExecuted: false,
      googleApiLiveCallExecuted: false,
      nextAction: "record-post-pr357-youtube-runtime-safe-live-smoke-execution-blockers-without-live-provider-call"
    };
  }

  const blockingCheckIds = youtubeRuntimeSafeLiveSmokeReadinessPostPr357.requiredReadinessChecks
    .filter((check) => check.status === "blocking-external-action")
    .map((check) => check.id);

  return {
    status: "blocked-pending-target-metadata-env-fixture-and-live-runtime-command-boundary",
    completedCheckIds,
    blockingCheckIds,
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    nextAction: "collect-safe-target-metadata-env-fixture-and-dedicated-sanitized-live-runtime-command-before-actual-smoke"
  };
}

export function createYouTubeRuntimeSafeLiveSmokeReadinessPostPr357Summary(): string {
  const assessment = assessYouTubeRuntimeSafeLiveSmokeReadinessPostPr357(
    youtubeRuntimeSafeLiveSmokeReadinessPostPr357.requiredReadinessChecks
  );

  return [
    `Stage: ${youtubeRuntimeSafeLiveSmokeReadinessPostPr357.implementationStage}.`,
    `Result: ${assessment.status}.`,
    `PR ${youtubeRuntimeSafeLiveSmokeReadinessPostPr357.prerequisiteRuntimeSmokeReadiness.pullRequest} runtime smoke readiness is recorded as ${youtubeRuntimeSafeLiveSmokeReadinessPostPr357.prerequisiteRuntimeSmokeReadiness.status}.`,
    `Actual safe live runtime smoke: ${youtubeRuntimeSafeLiveSmokeReadinessPostPr357.actualSafeLiveRuntimeSmoke}.`,
    "Source-thread operator approval is recorded, but no Google API live call, safe live YouTube OAuth smoke, owner verification smoke, or Live Chat polling smoke is run in this PR."
  ].join(" ");
}

export function assessYouTubeRuntimeSafeLiveSmokeCommandPostPr358(
  completedChecks: readonly YouTubeRuntimeSafeLiveSmokeCommandPostPr358Check[]
): YouTubeRuntimeSafeLiveSmokeCommandPostPr358Assessment {
  const requiredCheckIds = youtubeRuntimeSafeLiveSmokeCommandPostPr358.requiredReadinessChecks.map((check) => check.id);
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingCheckIds = requiredCheckIds.filter((id) => !completedCheckIds.includes(id));
  const missingRecordedCheckIds = youtubeRuntimeSafeLiveSmokeCommandPostPr358.requiredReadinessChecks
    .filter((check) => check.status === "recorded" && missingCheckIds.includes(check.id))
    .map((check) => check.id);

  if (completedChecks.length === 0 || missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-youtube-live-runtime-smoke-command-checks",
      missingCheckIds: completedChecks.length === 0 ? missingCheckIds : missingRecordedCheckIds,
      safeLiveYouTubeOAuthSmokeExecuted: false,
      ownerVerificationSmokeExecuted: false,
      liveChatPollingSmokeExecuted: false,
      googleApiLiveCallExecuted: false,
      nextAction: "record-post-pr358-command-readiness-without-live-provider-call"
    };
  }

  const blockingCheckIds = youtubeRuntimeSafeLiveSmokeCommandPostPr358.requiredReadinessChecks
    .filter((check) => check.status === "blocking-external-action")
    .map((check) => check.id);

  return {
    status: "blocked-pending-env-fixture-target-owner-authorization-or-live-token-resolution",
    completedCheckIds,
    blockingCheckIds,
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    nextAction: "run-dedicated-command-only-when-sanitized-preflight-and-server-only-live-token-resolution-exist"
  };
}

export function createYouTubeRuntimeSafeLiveSmokeCommandPostPr358Summary(): string {
  const assessment = assessYouTubeRuntimeSafeLiveSmokeCommandPostPr358(
    youtubeRuntimeSafeLiveSmokeCommandPostPr358.requiredReadinessChecks
  );

  return [
    `Stage: ${youtubeRuntimeSafeLiveSmokeCommandPostPr358.implementationStage}.`,
    `Result: ${assessment.status}.`,
    `PR ${youtubeRuntimeSafeLiveSmokeCommandPostPr358.prerequisiteRuntimeSmokeExecutionGate.pullRequest} runtime smoke execution gate is recorded as ${youtubeRuntimeSafeLiveSmokeCommandPostPr358.prerequisiteRuntimeSmokeExecutionGate.status}.`,
    `Command: ${youtubeRuntimeSafeLiveSmokeCommandPostPr358.commandPath}.`,
    `Actual safe live runtime smoke: ${youtubeRuntimeSafeLiveSmokeCommandPostPr358.actualSafeLiveRuntimeSmoke}.`,
    "No Google API live call, safe live YouTube OAuth smoke execution, owner verification smoke execution, or Live Chat polling smoke execution is run in this PR."
  ].join(" ");
}

export function assessYouTubeRuntimeLiveTokenResolutionReadinessPostPr359(
  completedChecks: readonly YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Check[]
): YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Assessment {
  const requiredCheckIds = youtubeRuntimeLiveTokenResolutionReadinessPostPr359.requiredReadinessChecks.map(
    (check) => check.id
  );
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingCheckIds = requiredCheckIds.filter((id) => !completedCheckIds.includes(id));
  const missingRecordedCheckIds = youtubeRuntimeLiveTokenResolutionReadinessPostPr359.requiredReadinessChecks
    .filter((check) => check.status === "recorded" && missingCheckIds.includes(check.id))
    .map((check) => check.id);

  if (completedChecks.length === 0 || missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-server-only-live-token-resolution-readiness-checks",
      missingCheckIds: completedChecks.length === 0 ? missingCheckIds : missingRecordedCheckIds,
      safeLiveYouTubeOAuthSmokeExecuted: false,
      ownerVerificationSmokeExecuted: false,
      liveChatPollingSmokeExecuted: false,
      googleApiLiveCallExecuted: false,
      nextAction: "record-post-pr359-server-only-live-token-resolution-readiness-without-live-provider-call"
    };
  }

  const blockingCheckIds = youtubeRuntimeLiveTokenResolutionReadinessPostPr359.requiredReadinessChecks
    .filter((check) => check.status === "blocking-external-action")
    .map((check) => check.id);

  return {
    status: "blocked-pending-server-only-live-token-resolution-runtime",
    completedCheckIds,
    blockingCheckIds,
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    nextAction: "implement-server-only-live-token-resolution-runtime-in-separate-approved-pr-before-actual-live-smoke"
  };
}

export function createYouTubeRuntimeLiveTokenResolutionReadinessPostPr359Summary(): string {
  const assessment = assessYouTubeRuntimeLiveTokenResolutionReadinessPostPr359(
    youtubeRuntimeLiveTokenResolutionReadinessPostPr359.requiredReadinessChecks
  );

  return [
    `Stage: ${youtubeRuntimeLiveTokenResolutionReadinessPostPr359.implementationStage}.`,
    `Result: ${assessment.status}.`,
    `PR ${youtubeRuntimeLiveTokenResolutionReadinessPostPr359.prerequisiteLiveRuntimeSmokeCommand.pullRequest} live runtime smoke command is recorded as ${youtubeRuntimeLiveTokenResolutionReadinessPostPr359.prerequisiteLiveRuntimeSmokeCommand.status}.`,
    `Server-only live token resolution runtime: ${youtubeRuntimeLiveTokenResolutionReadinessPostPr359.serverOnlyLiveTokenResolutionRuntime}.`,
    `Actual safe live runtime smoke: ${youtubeRuntimeLiveTokenResolutionReadinessPostPr359.actualSafeLiveRuntimeSmoke}.`,
    "No Google API live call, safe live YouTube OAuth smoke execution, owner verification smoke execution, or Live Chat polling smoke execution is run in this PR."
  ].join(" ");
}

export async function resolveYouTubeLiveTokenForServerFetch(
  request: YouTubeLiveTokenResolutionRuntimeRequest
): Promise<YouTubeLiveTokenResolutionRuntimeResult> {
  if (request.credentialResolutionDisabled) {
    return unresolvedLiveTokenResolution(request.credentialReferenceId, "credential-resolution-disabled", "credential resolution is disabled");
  }

  if (request.ownerAuthorization.status !== "authorized") {
    return unresolvedLiveTokenResolution(
      request.credentialReferenceId,
      "blocked-owner-authorization",
      request.ownerAuthorization.reason
    );
  }

  if (!request.trustedStatusReader) {
    return unresolvedLiveTokenResolution(request.credentialReferenceId, "unavailable", "trusted status reader is not wired");
  }

  let status: YouTubeLiveTokenResolutionTrustedStatus;
  try {
    status = await request.trustedStatusReader.getCredentialStatus({
      credentialReferenceId: request.credentialReferenceId,
      ownerUserId: request.ownerAuthorization.ownerUserId
    });
  } catch {
    return unresolvedLiveTokenResolution(request.credentialReferenceId, "unavailable", "trusted status read failed");
  }

  if (status.revoked || status.expiryStatus === "revoked") {
    return unresolvedLiveTokenResolution(request.credentialReferenceId, "unavailable", "credential reference is revoked");
  }

  if (status.expiryStatus === "expired" || Date.parse(status.expiresAtIso) <= Date.parse(request.nowIso)) {
    return unresolvedLiveTokenResolution(request.credentialReferenceId, "expired", "credential reference is expired");
  }

  if (!status.scopeSet.includes(request.requiredScope)) {
    return unresolvedLiveTokenResolution(request.credentialReferenceId, "scope-missing", "credential reference lacks required scope");
  }

  const tokenMaterial = await request.tokenMaterialResolver.resolveServerOnlyTokenMaterial({
    credentialReferenceId: request.credentialReferenceId,
    ownerUserId: request.ownerAuthorization.ownerUserId,
    requiredScope: request.requiredScope
  });

  if (tokenMaterial.status !== "available") {
    return unresolvedLiveTokenResolution(request.credentialReferenceId, tokenMaterial.status, tokenMaterial.reason);
  }

  const binding = await request.consumeServerFetchAuthorization({
    credentialReferenceId: request.credentialReferenceId,
    requiredScope: request.requiredScope,
    serverAuthorizationHeader: tokenMaterial.serverAuthorizationHeader,
    expiresAtIso: tokenMaterial.expiresAtIso
  });

  return {
    status: "resolved-for-server-fetch",
    credentialReferenceId: request.credentialReferenceId,
    provider: "youtube",
    scopeLabel: "youtube.readonly",
    expiryStatus: "active",
    serverFetchBinding: binding.serverFetchBinding,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design"
  };
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

function unresolvedLiveTokenResolution(
  credentialReferenceId: string,
  status: Exclude<YouTubeLiveTokenResolutionRuntimeResult["status"], "resolved-for-server-fetch">,
  reason: string
): YouTubeLiveTokenResolutionRuntimeResult {
  return {
    status,
    credentialReferenceId,
    provider: "youtube",
    reason,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design"
  };
}
