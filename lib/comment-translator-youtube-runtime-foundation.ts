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

export type YouTubeRuntimeActualSafeLiveSmokePostPr361Check = {
  id:
    | "pr361-server-only-live-token-resolution-runtime-merged"
    | "dedicated-sanitized-live-runtime-smoke-command-preserved"
    | "server-only-live-token-resolution-runtime-available"
    | "current-codex-process-check-env-only-preflight-recorded"
    | "env-reference-presence-required"
    | "fixture-reference-presence-required"
    | "target-metadata-reference-presence-required"
    | "owner-authorization-preflight-required"
    | "execute-forbidden-while-preflight-blocked";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeRuntimeActualSafeLiveSmokePostPr361 = {
  implementationStage: "post-pr361-actual-safe-live-youtube-smoke-preflight-execution-gate";
  selectedFollowUp: "record-actual-safe-live-youtube-oauth-owner-verification-live-chat-polling-smoke-preflight-after-pr361";
  prerequisiteServerOnlyLiveTokenResolutionRuntime: {
    pullRequest: "#361";
    mergeCommit: "e3ad69d0499422dc7ea064e55ca7ee319782bb5b";
    status: "post-pr360-server-only-live-token-resolution-runtime-merged";
  };
  dedicatedCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs";
  commandExecutionMode: "check-env-only-first-execute-only-after-sanitized-ready-preflight";
  serverOnlyLiveTokenResolutionRuntime: "implemented-server-only-sanitized-runtime";
  currentCodexProcessPreflight: {
    command: "node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json";
    status: "blocked-missing-env-fixture-or-target-references";
    missingEnvReferences: readonly [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
    ];
    missingFixtureReferences: readonly [
      "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
      "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
      "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
    ];
    missingTargetMetadataReferences: readonly ["YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT"];
    ownerAuthorizationPreflightReference: "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED";
    valuesReadOrPrinted: false;
  };
  actualSafeLiveRuntimeSmoke: "not-run-blocked-missing-env-fixture-or-target-references";
  commandExecuteResult: "not-run-preflight-blocked";
  safeLiveYouTubeOAuthSmoke: "not-run";
  ownerVerificationSmoke: "not-run";
  liveChatPollingSmoke: "not-run";
  googleApiLiveCall: "not-run";
  remoteMigrationApply: "not-run";
  requiredReadinessChecks: readonly YouTubeRuntimeActualSafeLiveSmokePostPr361Check[];
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  secretHandling: "presence-and-sanitized-output-only-no-values";
  browserStorage: "unchanged";
  nextAction: "provide-sanitized-env-fixture-target-and-owner-authorization-references-before-actual-live-smoke";
  forbiddenWhilePreflightBlocked: readonly [
    "Google API live call",
    "safe live YouTube OAuth smoke execution",
    "owner verification live smoke execution",
    "Live Chat polling smoke execution",
    "command --execute",
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

export type YouTubeRuntimeActualSafeLiveSmokePostPr361Assessment =
  | {
      status: "blocked-missing-actual-safe-live-smoke-preflight-checks";
      missingCheckIds: readonly YouTubeRuntimeActualSafeLiveSmokePostPr361Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      commandExecuteAllowed: false;
      nextAction: "record-post-pr361-preflight-blocker-without-live-provider-call";
    }
  | {
      status: "blocked-missing-env-fixture-or-target-references";
      completedCheckIds: readonly YouTubeRuntimeActualSafeLiveSmokePostPr361Check["id"][];
      blockingCheckIds: readonly YouTubeRuntimeActualSafeLiveSmokePostPr361Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      commandExecuteAllowed: false;
      nextAction: "provide-sanitized-env-fixture-target-and-owner-authorization-references-before-actual-live-smoke";
    };

export type YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Check = {
  id:
    | "pr362-actual-safe-live-smoke-gate-merged"
    | "post-pr362-check-env-only-preflight-recorded"
    | "dedicated-sanitized-live-runtime-smoke-command-preserved"
    | "actual-live-smoke-not-run-in-readiness-repoint"
    | "env-reference-presence-required"
    | "fixture-reference-presence-required"
    | "target-metadata-reference-presence-required"
    | "owner-authorization-preflight-required"
    | "execute-forbidden-for-readiness-repoint";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362 = {
  implementationStage: "post-pr362-actual-safe-live-youtube-smoke-readiness-blocker-repoint";
  selectedFollowUp: "repoint-actual-safe-live-youtube-smoke-readiness-blocker-after-pr362";
  prerequisiteActualSafeLiveSmokeGate: {
    pullRequest: "#362";
    mergeCommit: "5a7d564d3360e5ba7b06ee74856980a68232adce";
    status: "post-pr361-actual-safe-live-youtube-smoke-preflight-execution-gate-merged";
  };
  dedicatedCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs";
  commandExecutionMode: "check-env-only-first-execute-not-run-in-this-readiness-repoint";
  currentCodexProcessPreflight: YouTubeRuntimeActualSafeLiveSmokePostPr361["currentCodexProcessPreflight"];
  actualSafeLiveRuntimeSmoke: "not-run-blocked-missing-env-fixture-or-target-references";
  commandExecuteResult: "not-run-readiness-repoint-only";
  safeLiveYouTubeOAuthSmoke: "not-run";
  ownerVerificationSmoke: "not-run";
  liveChatPollingSmoke: "not-run";
  googleApiLiveCall: "not-run";
  remoteMigrationApply: "not-run";
  requiredReadinessChecks: readonly YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Check[];
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  secretHandling: "presence-and-sanitized-output-only-no-values";
  browserStorage: "unchanged";
  nextAction: "open-separate-live-smoke-execution-pr-only-after-sanitized-references-and-owner-authorization-are-present";
  forbiddenInThisSlice: YouTubeRuntimeActualSafeLiveSmokePostPr361["forbiddenWhilePreflightBlocked"];
};

export type YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Assessment =
  | {
      status: "blocked-missing-actual-safe-live-smoke-readiness-checks";
      missingCheckIds: readonly YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      commandExecuteAllowed: false;
      nextAction: "record-post-pr362-readiness-blocker-without-live-provider-call";
    }
  | {
      status: "blocked-missing-env-fixture-or-target-references";
      completedCheckIds: readonly YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Check["id"][];
      blockingCheckIds: readonly YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      commandExecuteAllowed: false;
      nextAction: "open-separate-live-smoke-execution-pr-only-after-sanitized-references-and-owner-authorization-are-present";
    };

export type YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Check = {
  id:
    | "pr364-safe-live-smoke-blocker-merged"
    | "post-pr364-check-env-only-preflight-recorded"
    | "dedicated-sanitized-live-runtime-smoke-command-preserved"
    | "server-only-live-token-resolution-runtime-preserved"
    | "actual-live-smoke-not-run-while-preflight-blocked"
    | "repo-local-concrete-non-secret-target-metadata-required"
    | "env-reference-presence-required"
    | "fixture-reference-presence-required"
    | "owner-authorization-preflight-required"
    | "execute-forbidden-while-preflight-blocked";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364 = {
  implementationStage: "post-pr364-safe-live-youtube-smoke-target-metadata-preflight";
  selectedFollowUp: "record-target-metadata-env-fixture-owner-authorization-preflight-after-pr364";
  prerequisiteSafeLiveSmokeBlocker: {
    pullRequest: "#364";
    mergeCommit: "3b722a6c6d2f21ab32565e48a2d2727ca7da75a4";
    status: "post-pr363-safe-live-smoke-blocker-merged";
  };
  dedicatedCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs";
  commandExecutionMode: "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked";
  serverOnlyLiveTokenResolutionRuntime: "implemented-server-only-sanitized-runtime";
  currentCodexProcessPreflight: YouTubeRuntimeActualSafeLiveSmokePostPr361["currentCodexProcessPreflight"];
  targetMetadataPreflight: "blocked-missing-repo-local-concrete-non-secret-target-metadata-reference";
  actualSafeLiveRuntimeSmoke: "not-run-blocked-missing-env-fixture-or-target-references";
  commandExecuteResult: "not-run-preflight-blocked";
  safeLiveYouTubeOAuthSmoke: "not-run";
  ownerVerificationSmoke: "not-run";
  liveChatPollingSmoke: "not-run";
  googleApiLiveCall: "not-run";
  remoteMigrationApply: "not-run";
  requiredReadinessChecks: readonly YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Check[];
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  secretHandling: "presence-and-sanitized-output-only-no-values";
  browserStorage: "unchanged";
  nextAction: "collect-repo-local-non-secret-target-metadata-env-fixture-and-owner-authorization-before-actual-live-smoke";
  forbiddenInThisSlice: YouTubeRuntimeActualSafeLiveSmokePostPr361["forbiddenWhilePreflightBlocked"];
};

export type YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Assessment =
  | {
      status: "blocked-missing-target-metadata-preflight-checks";
      missingCheckIds: readonly YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      commandExecuteAllowed: false;
      nextAction: "record-post-pr364-target-metadata-preflight-blocker-without-live-provider-call";
    }
  | {
      status: "blocked-missing-env-fixture-or-target-references";
      completedCheckIds: readonly YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Check["id"][];
      blockingCheckIds: readonly YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Check["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      commandExecuteAllowed: false;
      nextAction: "collect-repo-local-non-secret-target-metadata-env-fixture-and-owner-authorization-before-actual-live-smoke";
    };

export type YouTubeRuntimeSafeLiveSmokePostPr365PreflightCheck = {
  id:
    | "pr365-safe-live-target-metadata-preflight-merged"
    | "post-pr365-check-env-only-preflight-recorded"
    | "dedicated-sanitized-live-runtime-smoke-command-preserved"
    | "server-only-live-token-resolution-runtime-preserved"
    | "actual-live-smoke-not-run-while-preflight-blocked"
    | "concrete-non-secret-target-metadata-required"
    | "env-reference-presence-required"
    | "fixture-reference-presence-required"
    | "owner-authorization-preflight-required"
    | "execute-forbidden-while-preflight-blocked";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeRuntimeSafeLiveSmokePostPr365Preflight = {
  implementationStage: "post-pr365-safe-live-youtube-smoke-preflight";
  selectedFollowUp: "record-target-metadata-env-fixture-owner-authorization-and-runtime-preflight-after-pr365";
  prerequisiteSafeLiveTargetMetadataPreflight: {
    pullRequest: "#365";
    mergeCommit: "84f476b27c100eb7b1b5640bcd8a7905143c1e5f";
    status: "post-pr364-safe-live-target-metadata-preflight-merged";
  };
  dedicatedCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs";
  commandExecutionMode: "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked";
  serverOnlyLiveTokenResolutionRuntime: "implemented-server-only-sanitized-runtime";
  currentCodexProcessPreflight: YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364["currentCodexProcessPreflight"];
  targetMetadataPreflight: "blocked-missing-repo-local-concrete-non-secret-target-metadata-reference";
  actualSafeLiveRuntimeSmoke: "not-run-blocked-missing-env-fixture-or-target-references";
  commandExecuteResult: "not-run-preflight-blocked";
  safeLiveYouTubeOAuthSmoke: "not-run";
  ownerVerificationSmoke: "not-run";
  liveChatPollingSmoke: "not-run";
  googleApiLiveCall: "not-run";
  remoteMigrationApply: "not-run";
  requiredReadinessChecks: readonly YouTubeRuntimeSafeLiveSmokePostPr365PreflightCheck[];
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  secretHandling: "presence-and-sanitized-output-only-no-values";
  browserStorage: "unchanged";
  nextAction: "collect-concrete-target-metadata-env-fixture-owner-authorization-and-server-only-runtime-in-separate-live-smoke-pr";
  forbiddenInThisSlice: YouTubeRuntimeActualSafeLiveSmokePostPr361["forbiddenWhilePreflightBlocked"];
};

export type YouTubeRuntimeSafeLiveSmokePostPr365PreflightAssessment =
  | {
      status: "blocked-missing-post-pr365-preflight-checks";
      missingCheckIds: readonly YouTubeRuntimeSafeLiveSmokePostPr365PreflightCheck["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      commandExecuteAllowed: false;
      nextAction: "record-post-pr365-preflight-blocker-without-live-provider-call";
    }
  | {
      status: "blocked-missing-env-fixture-or-target-references";
      completedCheckIds: readonly YouTubeRuntimeSafeLiveSmokePostPr365PreflightCheck["id"][];
      blockingCheckIds: readonly YouTubeRuntimeSafeLiveSmokePostPr365PreflightCheck["id"][];
      safeLiveYouTubeOAuthSmokeExecuted: false;
      ownerVerificationSmokeExecuted: false;
      liveChatPollingSmokeExecuted: false;
      googleApiLiveCallExecuted: false;
      commandExecuteAllowed: false;
      nextAction: "collect-concrete-target-metadata-env-fixture-owner-authorization-and-server-only-runtime-in-separate-live-smoke-pr";
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

export const youtubeRuntimeActualSafeLiveSmokePostPr361 = {
  implementationStage: "post-pr361-actual-safe-live-youtube-smoke-preflight-execution-gate",
  selectedFollowUp: "record-actual-safe-live-youtube-oauth-owner-verification-live-chat-polling-smoke-preflight-after-pr361",
  prerequisiteServerOnlyLiveTokenResolutionRuntime: {
    pullRequest: "#361",
    mergeCommit: "e3ad69d0499422dc7ea064e55ca7ee319782bb5b",
    status: "post-pr360-server-only-live-token-resolution-runtime-merged"
  },
  dedicatedCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  commandExecutionMode: "check-env-only-first-execute-only-after-sanitized-ready-preflight",
  serverOnlyLiveTokenResolutionRuntime: "implemented-server-only-sanitized-runtime",
  currentCodexProcessPreflight: {
    command: "node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json",
    status: "blocked-missing-env-fixture-or-target-references",
    missingEnvReferences: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
    ],
    missingFixtureReferences: [
      "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
      "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
      "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
    ],
    missingTargetMetadataReferences: ["YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT"],
    ownerAuthorizationPreflightReference: "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED",
    valuesReadOrPrinted: false
  },
  actualSafeLiveRuntimeSmoke: "not-run-blocked-missing-env-fixture-or-target-references",
  commandExecuteResult: "not-run-preflight-blocked",
  safeLiveYouTubeOAuthSmoke: "not-run",
  ownerVerificationSmoke: "not-run",
  liveChatPollingSmoke: "not-run",
  googleApiLiveCall: "not-run",
  remoteMigrationApply: "not-run",
  requiredReadinessChecks: [
    {
      id: "pr361-server-only-live-token-resolution-runtime-merged",
      status: "recorded",
      evidence: "PR #361 merge commit is included in origin/codex/comment-translator-preview."
    },
    {
      id: "dedicated-sanitized-live-runtime-smoke-command-preserved",
      status: "recorded",
      evidence: "Dedicated command remains scripts/comment-translator-youtube-live-runtime-smoke-command.mjs."
    },
    {
      id: "server-only-live-token-resolution-runtime-available",
      status: "recorded",
      evidence: "PR #361 server-only live token resolution runtime returns sanitized server-fetch binding metadata only."
    },
    {
      id: "current-codex-process-check-env-only-preflight-recorded",
      status: "recorded",
      evidence: "check-env-only preflight was recorded as blocked by reference names only."
    },
    {
      id: "env-reference-presence-required",
      status: "blocking-external-action",
      evidence: "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED are missing by presence-only check."
    },
    {
      id: "fixture-reference-presence-required",
      status: "blocking-external-action",
      evidence: "credentialReferenceId, owner user, and provider channel fixture references are missing by presence-only check."
    },
    {
      id: "target-metadata-reference-presence-required",
      status: "blocking-external-action",
      evidence: "YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT is missing by presence-only check."
    },
    {
      id: "owner-authorization-preflight-required",
      status: "blocking-external-action",
      evidence: "Owner authorization must be confirmed by reference before owner verification or Live Chat polling."
    },
    {
      id: "execute-forbidden-while-preflight-blocked",
      status: "blocking-external-action",
      evidence: "--execute is not run while sanitized preflight remains blocked."
    }
  ],
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  secretHandling: "presence-and-sanitized-output-only-no-values",
  browserStorage: "unchanged",
  nextAction: "provide-sanitized-env-fixture-target-and-owner-authorization-references-before-actual-live-smoke",
  forbiddenWhilePreflightBlocked: [
    "Google API live call",
    "safe live YouTube OAuth smoke execution",
    "owner verification live smoke execution",
    "Live Chat polling smoke execution",
    "command --execute",
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
} as const satisfies YouTubeRuntimeActualSafeLiveSmokePostPr361;

export const youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362 = {
  implementationStage: "post-pr362-actual-safe-live-youtube-smoke-readiness-blocker-repoint",
  selectedFollowUp: "repoint-actual-safe-live-youtube-smoke-readiness-blocker-after-pr362",
  prerequisiteActualSafeLiveSmokeGate: {
    pullRequest: "#362",
    mergeCommit: "5a7d564d3360e5ba7b06ee74856980a68232adce",
    status: "post-pr361-actual-safe-live-youtube-smoke-preflight-execution-gate-merged"
  },
  dedicatedCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  commandExecutionMode: "check-env-only-first-execute-not-run-in-this-readiness-repoint",
  currentCodexProcessPreflight: youtubeRuntimeActualSafeLiveSmokePostPr361.currentCodexProcessPreflight,
  actualSafeLiveRuntimeSmoke: "not-run-blocked-missing-env-fixture-or-target-references",
  commandExecuteResult: "not-run-readiness-repoint-only",
  safeLiveYouTubeOAuthSmoke: "not-run",
  ownerVerificationSmoke: "not-run",
  liveChatPollingSmoke: "not-run",
  googleApiLiveCall: "not-run",
  remoteMigrationApply: "not-run",
  requiredReadinessChecks: [
    {
      id: "pr362-actual-safe-live-smoke-gate-merged",
      status: "recorded",
      evidence:
        "Fresh fetch and GitHub PR metadata confirm PR #362 is merged into codex/comment-translator-preview with merge commit 5a7d564d3360e5ba7b06ee74856980a68232adce."
    },
    {
      id: "post-pr362-check-env-only-preflight-recorded",
      status: "recorded",
      evidence:
        "node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json returned the sanitized blocked-missing-env-fixture-or-target-references result by reference names only."
    },
    {
      id: "dedicated-sanitized-live-runtime-smoke-command-preserved",
      status: "recorded",
      evidence: "Dedicated command remains scripts/comment-translator-youtube-live-runtime-smoke-command.mjs."
    },
    {
      id: "actual-live-smoke-not-run-in-readiness-repoint",
      status: "recorded",
      evidence:
        "This repoint records blocker/readiness evidence only; safe live YouTube OAuth, owner verification, Live Chat polling, Google API live calls, and command --execute are not run."
    },
    {
      id: "env-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED are missing by presence-only check."
    },
    {
      id: "fixture-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "credentialReferenceId, owner user, and provider channel fixture references are missing by presence-only check."
    },
    {
      id: "target-metadata-reference-presence-required",
      status: "blocking-external-action",
      evidence: "YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT is missing by presence-only check."
    },
    {
      id: "owner-authorization-preflight-required",
      status: "blocking-external-action",
      evidence: "Owner authorization must be confirmed by reference before owner verification or Live Chat polling."
    },
    {
      id: "execute-forbidden-for-readiness-repoint",
      status: "blocking-external-action",
      evidence:
        "--execute is not run in this readiness/blocker repoint; actual execution belongs in a separate live-smoke PR after sanitized preconditions are present."
    }
  ],
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  secretHandling: "presence-and-sanitized-output-only-no-values",
  browserStorage: "unchanged",
  nextAction: "open-separate-live-smoke-execution-pr-only-after-sanitized-references-and-owner-authorization-are-present",
  forbiddenInThisSlice: youtubeRuntimeActualSafeLiveSmokePostPr361.forbiddenWhilePreflightBlocked
} as const satisfies YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362;

export const youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364 = {
  implementationStage: "post-pr364-safe-live-youtube-smoke-target-metadata-preflight",
  selectedFollowUp: "record-target-metadata-env-fixture-owner-authorization-preflight-after-pr364",
  prerequisiteSafeLiveSmokeBlocker: {
    pullRequest: "#364",
    mergeCommit: "3b722a6c6d2f21ab32565e48a2d2727ca7da75a4",
    status: "post-pr363-safe-live-smoke-blocker-merged"
  },
  dedicatedCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  commandExecutionMode: "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked",
  serverOnlyLiveTokenResolutionRuntime: "implemented-server-only-sanitized-runtime",
  currentCodexProcessPreflight: youtubeRuntimeActualSafeLiveSmokePostPr361.currentCodexProcessPreflight,
  targetMetadataPreflight: "blocked-missing-repo-local-concrete-non-secret-target-metadata-reference",
  actualSafeLiveRuntimeSmoke: "not-run-blocked-missing-env-fixture-or-target-references",
  commandExecuteResult: "not-run-preflight-blocked",
  safeLiveYouTubeOAuthSmoke: "not-run",
  ownerVerificationSmoke: "not-run",
  liveChatPollingSmoke: "not-run",
  googleApiLiveCall: "not-run",
  remoteMigrationApply: "not-run",
  requiredReadinessChecks: [
    {
      id: "pr364-safe-live-smoke-blocker-merged",
      status: "recorded",
      evidence:
        "Fresh fetch, local history, and GitHub PR metadata confirm PR #364 is merged into codex/comment-translator-preview with merge commit 3b722a6c6d2f21ab32565e48a2d2727ca7da75a4."
    },
    {
      id: "post-pr364-check-env-only-preflight-recorded",
      status: "recorded",
      evidence:
        "node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json returned blocked-missing-env-fixture-or-target-references with sanitized reference names only."
    },
    {
      id: "dedicated-sanitized-live-runtime-smoke-command-preserved",
      status: "recorded",
      evidence:
        "The dedicated sanitized live runtime smoke command remains scripts/comment-translator-youtube-live-runtime-smoke-command.mjs."
    },
    {
      id: "server-only-live-token-resolution-runtime-preserved",
      status: "recorded",
      evidence:
        "The server-only live token resolution runtime remains implemented as sanitized metadata only and is not overclaimed as actual live smoke."
    },
    {
      id: "actual-live-smoke-not-run-while-preflight-blocked",
      status: "recorded",
      evidence:
        "No --execute, safe live YouTube OAuth smoke, owner verification smoke, Live Chat polling smoke, Google API live call, or remote migration apply is run while preflight is blocked."
    },
    {
      id: "repo-local-concrete-non-secret-target-metadata-required",
      status: "blocking-external-action",
      evidence:
        "No repo-local concrete non-secret YouTube live runtime smoke target metadata is present; owner user id and provider channel id values do not qualify for repo-local recording."
    },
    {
      id: "env-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "Current process env reference presence is missing for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED."
    },
    {
      id: "fixture-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "Current process fixture reference presence is missing for YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID, YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID, and YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID."
    },
    {
      id: "owner-authorization-preflight-required",
      status: "blocking-external-action",
      evidence:
        "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED is required before owner verification or Live Chat polling smoke."
    },
    {
      id: "execute-forbidden-while-preflight-blocked",
      status: "blocking-external-action",
      evidence: "--execute is forbidden until target metadata, env, fixture, and owner authorization references are sanitized-ready in the same thread."
    }
  ],
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  secretHandling: "presence-and-sanitized-output-only-no-values",
  browserStorage: "unchanged",
  nextAction: "collect-repo-local-non-secret-target-metadata-env-fixture-and-owner-authorization-before-actual-live-smoke",
  forbiddenInThisSlice: youtubeRuntimeActualSafeLiveSmokePostPr361.forbiddenWhilePreflightBlocked
} as const satisfies YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364;

export const youtubeRuntimeSafeLiveSmokePostPr365Preflight = {
  implementationStage: "post-pr365-safe-live-youtube-smoke-preflight",
  selectedFollowUp: "record-target-metadata-env-fixture-owner-authorization-and-runtime-preflight-after-pr365",
  prerequisiteSafeLiveTargetMetadataPreflight: {
    pullRequest: "#365",
    mergeCommit: "84f476b27c100eb7b1b5640bcd8a7905143c1e5f",
    status: "post-pr364-safe-live-target-metadata-preflight-merged"
  },
  dedicatedCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  commandExecutionMode: "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked",
  serverOnlyLiveTokenResolutionRuntime: "implemented-server-only-sanitized-runtime",
  currentCodexProcessPreflight: youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.currentCodexProcessPreflight,
  targetMetadataPreflight: "blocked-missing-repo-local-concrete-non-secret-target-metadata-reference",
  actualSafeLiveRuntimeSmoke: "not-run-blocked-missing-env-fixture-or-target-references",
  commandExecuteResult: "not-run-preflight-blocked",
  safeLiveYouTubeOAuthSmoke: "not-run",
  ownerVerificationSmoke: "not-run",
  liveChatPollingSmoke: "not-run",
  googleApiLiveCall: "not-run",
  remoteMigrationApply: "not-run",
  requiredReadinessChecks: [
    {
      id: "pr365-safe-live-target-metadata-preflight-merged",
      status: "recorded",
      evidence:
        "Fresh fetch, local history, and GitHub PR metadata confirm PR #365 is merged into codex/comment-translator-preview with merge commit 84f476b27c100eb7b1b5640bcd8a7905143c1e5f."
    },
    {
      id: "post-pr365-check-env-only-preflight-recorded",
      status: "recorded",
      evidence:
        "node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json returned blocked-missing-env-fixture-or-target-references with sanitized reference names only."
    },
    {
      id: "dedicated-sanitized-live-runtime-smoke-command-preserved",
      status: "recorded",
      evidence:
        "The dedicated sanitized live runtime smoke command remains scripts/comment-translator-youtube-live-runtime-smoke-command.mjs."
    },
    {
      id: "server-only-live-token-resolution-runtime-preserved",
      status: "recorded",
      evidence:
        "The server-only live token resolution runtime remains implemented as sanitized metadata only and is not overclaimed as actual live smoke."
    },
    {
      id: "actual-live-smoke-not-run-while-preflight-blocked",
      status: "recorded",
      evidence:
        "No --execute, safe live YouTube OAuth smoke, owner verification smoke, Live Chat polling smoke, Google API live call, or remote migration apply is run while preflight is blocked."
    },
    {
      id: "concrete-non-secret-target-metadata-required",
      status: "blocking-external-action",
      evidence:
        "Concrete non-secret target metadata, env reference presence, fixture reference presence, owner authorization preflight, dedicated sanitized command, and server-only live token resolution runtime are not all sanitized-ready in this thread."
    },
    {
      id: "env-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "Current process env reference presence is missing for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED."
    },
    {
      id: "fixture-reference-presence-required",
      status: "blocking-external-action",
      evidence:
        "Current process fixture reference presence is missing for YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID, YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID, and YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID."
    },
    {
      id: "owner-authorization-preflight-required",
      status: "blocking-external-action",
      evidence:
        "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED is required before owner verification or Live Chat polling smoke."
    },
    {
      id: "execute-forbidden-while-preflight-blocked",
      status: "blocking-external-action",
      evidence:
        "--execute is forbidden until concrete non-secret target metadata, env, fixture, owner authorization, dedicated command, and server-only runtime are sanitized-ready in the same thread."
    }
  ],
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  credentialResolutionDisabledBoundary: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
  ownerAuthorization: "required-before-owner-verification-or-live-chat-polling",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  secretHandling: "presence-and-sanitized-output-only-no-values",
  browserStorage: "unchanged",
  nextAction: "collect-concrete-target-metadata-env-fixture-owner-authorization-and-server-only-runtime-in-separate-live-smoke-pr",
  forbiddenInThisSlice: youtubeRuntimeActualSafeLiveSmokePostPr361.forbiddenWhilePreflightBlocked
} as const satisfies YouTubeRuntimeSafeLiveSmokePostPr365Preflight;

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

export function assessYouTubeRuntimeActualSafeLiveSmokePostPr361(
  completedChecks: readonly YouTubeRuntimeActualSafeLiveSmokePostPr361Check[]
): YouTubeRuntimeActualSafeLiveSmokePostPr361Assessment {
  const requiredCheckIds = youtubeRuntimeActualSafeLiveSmokePostPr361.requiredReadinessChecks.map((check) => check.id);
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingCheckIds = requiredCheckIds.filter((id) => !completedCheckIds.includes(id));
  const missingRecordedCheckIds = youtubeRuntimeActualSafeLiveSmokePostPr361.requiredReadinessChecks
    .filter((check) => check.status === "recorded" && missingCheckIds.includes(check.id))
    .map((check) => check.id);

  if (completedChecks.length === 0 || missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-actual-safe-live-smoke-preflight-checks",
      missingCheckIds: completedChecks.length === 0 ? missingCheckIds : missingRecordedCheckIds,
      safeLiveYouTubeOAuthSmokeExecuted: false,
      ownerVerificationSmokeExecuted: false,
      liveChatPollingSmokeExecuted: false,
      googleApiLiveCallExecuted: false,
      commandExecuteAllowed: false,
      nextAction: "record-post-pr361-preflight-blocker-without-live-provider-call"
    };
  }

  const blockingCheckIds = youtubeRuntimeActualSafeLiveSmokePostPr361.requiredReadinessChecks
    .filter((check) => check.status === "blocking-external-action")
    .map((check) => check.id);

  return {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds,
    blockingCheckIds,
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "provide-sanitized-env-fixture-target-and-owner-authorization-references-before-actual-live-smoke"
  };
}

export function createYouTubeRuntimeActualSafeLiveSmokePostPr361Summary(): string {
  const assessment = assessYouTubeRuntimeActualSafeLiveSmokePostPr361(
    youtubeRuntimeActualSafeLiveSmokePostPr361.requiredReadinessChecks
  );

  return [
    `Stage: ${youtubeRuntimeActualSafeLiveSmokePostPr361.implementationStage}.`,
    `Result: ${assessment.status}.`,
    `PR ${youtubeRuntimeActualSafeLiveSmokePostPr361.prerequisiteServerOnlyLiveTokenResolutionRuntime.pullRequest} server-only live token resolution runtime is recorded as ${youtubeRuntimeActualSafeLiveSmokePostPr361.prerequisiteServerOnlyLiveTokenResolutionRuntime.status}.`,
    `Command preflight: ${youtubeRuntimeActualSafeLiveSmokePostPr361.currentCodexProcessPreflight.status}.`,
    `Actual safe live runtime smoke: ${youtubeRuntimeActualSafeLiveSmokePostPr361.actualSafeLiveRuntimeSmoke}.`,
    "No command --execute, Google API live call, safe live YouTube OAuth smoke execution, owner verification smoke execution, or Live Chat polling smoke execution is run while preflight is blocked."
  ].join(" ");
}

export function assessYouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362(
  completedChecks: readonly YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Check[]
): YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Assessment {
  const requiredCheckIds = youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362.requiredReadinessChecks.map(
    (check) => check.id
  );
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingCheckIds = requiredCheckIds.filter((id) => !completedCheckIds.includes(id));
  const missingRecordedCheckIds = youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362.requiredReadinessChecks
    .filter((check) => check.status === "recorded" && missingCheckIds.includes(check.id))
    .map((check) => check.id);

  if (completedChecks.length === 0 || missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-actual-safe-live-smoke-readiness-checks",
      missingCheckIds: completedChecks.length === 0 ? missingCheckIds : missingRecordedCheckIds,
      safeLiveYouTubeOAuthSmokeExecuted: false,
      ownerVerificationSmokeExecuted: false,
      liveChatPollingSmokeExecuted: false,
      googleApiLiveCallExecuted: false,
      commandExecuteAllowed: false,
      nextAction: "record-post-pr362-readiness-blocker-without-live-provider-call"
    };
  }

  const blockingCheckIds = youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362.requiredReadinessChecks
    .filter((check) => check.status === "blocking-external-action")
    .map((check) => check.id);

  return {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds,
    blockingCheckIds,
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "open-separate-live-smoke-execution-pr-only-after-sanitized-references-and-owner-authorization-are-present"
  };
}

export function createYouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Summary(): string {
  const assessment = assessYouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362(
    youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362.requiredReadinessChecks
  );

  return [
    `Stage: ${youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362.implementationStage}.`,
    `Result: ${assessment.status}.`,
    `PR ${youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362.prerequisiteActualSafeLiveSmokeGate.pullRequest} actual safe live smoke gate is recorded as ${youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362.prerequisiteActualSafeLiveSmokeGate.status}.`,
    `Command preflight: ${youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362.currentCodexProcessPreflight.status}.`,
    `Actual safe live runtime smoke: ${youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362.actualSafeLiveRuntimeSmoke}.`,
    "No command --execute, Google API live call, safe live YouTube OAuth smoke execution, owner verification smoke execution, or Live Chat polling smoke execution is run in this readiness repoint."
  ].join(" ");
}

export function assessYouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364(
  completedChecks: readonly YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Check[]
): YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Assessment {
  const requiredCheckIds = youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.requiredReadinessChecks.map(
    (check) => check.id
  );
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingCheckIds = requiredCheckIds.filter((id) => !completedCheckIds.includes(id));
  const missingRecordedCheckIds = youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.requiredReadinessChecks
    .filter((check) => check.status === "recorded" && missingCheckIds.includes(check.id))
    .map((check) => check.id);

  if (completedChecks.length === 0 || missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-target-metadata-preflight-checks",
      missingCheckIds: completedChecks.length === 0 ? missingCheckIds : missingRecordedCheckIds,
      safeLiveYouTubeOAuthSmokeExecuted: false,
      ownerVerificationSmokeExecuted: false,
      liveChatPollingSmokeExecuted: false,
      googleApiLiveCallExecuted: false,
      commandExecuteAllowed: false,
      nextAction: "record-post-pr364-target-metadata-preflight-blocker-without-live-provider-call"
    };
  }

  const blockingCheckIds = youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.requiredReadinessChecks
    .filter((check) => check.status === "blocking-external-action")
    .map((check) => check.id);

  return {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds,
    blockingCheckIds,
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "collect-repo-local-non-secret-target-metadata-env-fixture-and-owner-authorization-before-actual-live-smoke"
  };
}

export function createYouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Summary(): string {
  const assessment = assessYouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364(
    youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.requiredReadinessChecks
  );

  return [
    `Stage: ${youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.implementationStage}.`,
    `Result: ${assessment.status}.`,
    `PR ${youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.prerequisiteSafeLiveSmokeBlocker.pullRequest} safe live smoke blocker is recorded as ${youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.prerequisiteSafeLiveSmokeBlocker.status}.`,
    `Command preflight: ${youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.currentCodexProcessPreflight.status}.`,
    `Target metadata preflight: ${youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.targetMetadataPreflight}.`,
    `Actual safe live runtime smoke: ${youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364.actualSafeLiveRuntimeSmoke}.`,
    "No command --execute, Google API live call, safe live YouTube OAuth smoke execution, owner verification smoke execution, or Live Chat polling smoke execution is run while target metadata preflight is blocked."
  ].join(" ");
}

export function assessYouTubeRuntimeSafeLiveSmokePostPr365Preflight(
  completedChecks: readonly YouTubeRuntimeSafeLiveSmokePostPr365PreflightCheck[]
): YouTubeRuntimeSafeLiveSmokePostPr365PreflightAssessment {
  const requiredCheckIds = youtubeRuntimeSafeLiveSmokePostPr365Preflight.requiredReadinessChecks.map((check) => check.id);
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingCheckIds = requiredCheckIds.filter((id) => !completedCheckIds.includes(id));
  const missingRecordedCheckIds = youtubeRuntimeSafeLiveSmokePostPr365Preflight.requiredReadinessChecks
    .filter((check) => check.status === "recorded" && missingCheckIds.includes(check.id))
    .map((check) => check.id);

  if (completedChecks.length === 0 || missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-post-pr365-preflight-checks",
      missingCheckIds: completedChecks.length === 0 ? missingCheckIds : missingRecordedCheckIds,
      safeLiveYouTubeOAuthSmokeExecuted: false,
      ownerVerificationSmokeExecuted: false,
      liveChatPollingSmokeExecuted: false,
      googleApiLiveCallExecuted: false,
      commandExecuteAllowed: false,
      nextAction: "record-post-pr365-preflight-blocker-without-live-provider-call"
    };
  }

  const blockingCheckIds = youtubeRuntimeSafeLiveSmokePostPr365Preflight.requiredReadinessChecks
    .filter((check) => check.status === "blocking-external-action")
    .map((check) => check.id);

  return {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds,
    blockingCheckIds,
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "collect-concrete-target-metadata-env-fixture-owner-authorization-and-server-only-runtime-in-separate-live-smoke-pr"
  };
}

export function createYouTubeRuntimeSafeLiveSmokePostPr365PreflightSummary(): string {
  const assessment = assessYouTubeRuntimeSafeLiveSmokePostPr365Preflight(
    youtubeRuntimeSafeLiveSmokePostPr365Preflight.requiredReadinessChecks
  );

  return [
    `Stage: ${youtubeRuntimeSafeLiveSmokePostPr365Preflight.implementationStage}.`,
    `Result: ${assessment.status}.`,
    `PR ${youtubeRuntimeSafeLiveSmokePostPr365Preflight.prerequisiteSafeLiveTargetMetadataPreflight.pullRequest} safe live target metadata preflight is recorded as ${youtubeRuntimeSafeLiveSmokePostPr365Preflight.prerequisiteSafeLiveTargetMetadataPreflight.status}.`,
    `Command preflight: ${youtubeRuntimeSafeLiveSmokePostPr365Preflight.currentCodexProcessPreflight.status}.`,
    `Target metadata preflight: ${youtubeRuntimeSafeLiveSmokePostPr365Preflight.targetMetadataPreflight}.`,
    `Actual safe live runtime smoke: ${youtubeRuntimeSafeLiveSmokePostPr365Preflight.actualSafeLiveRuntimeSmoke}.`,
    "No command --execute, Google API live call, safe live YouTube OAuth smoke execution, owner verification smoke execution, or Live Chat polling smoke execution is run while post-PR365 preflight is blocked."
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
