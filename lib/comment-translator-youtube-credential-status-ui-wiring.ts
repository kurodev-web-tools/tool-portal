import type { YouTubeOAuthNewClientPayloadCredentialReferenceSource } from "./comment-translator-youtube-client-safe-credential-reference-source";

export type YouTubeOAuthCredentialStatusUiStateId =
  | "available"
  | "reconnect-required"
  | "unavailable"
  | "credential-resolution-disabled";

type YouTubeReadOnlyScope = "https://www.googleapis.com/auth/youtube.readonly";

type YouTubeOAuthCredentialStatusUiAvailableInput = {
  status: "available";
  credentialReferenceId: string;
  provider: "youtube";
  providerChannelId: string;
  scopeLabel: "youtube.readonly";
  scopeSet: readonly YouTubeReadOnlyScope[];
  expiresAtIso: string;
  expiryStatus: "active" | "expired" | "revoked";
  revoked: boolean;
  revokedAtIso: string | null;
  reconnectRequired: boolean;
};

type YouTubeOAuthCredentialStatusUiUnavailableInput = {
  status: "unavailable";
  credentialReferenceId: string;
  provider: "youtube";
  reason: "trusted-adapter-not-wired" | "trusted-adapter-query-failed" | "auth-unavailable" | "caller-not-authenticated";
  reconnectRequired: true;
};

type YouTubeOAuthCredentialStatusUiDisabledInput = {
  status: "credential-resolution-disabled";
  credentialReferenceId: string;
  provider: "youtube";
  reconnectRequired: true;
};

export type YouTubeOAuthCredentialStatusUiWiringInput =
  | YouTubeOAuthCredentialStatusUiAvailableInput
  | YouTubeOAuthCredentialStatusUiUnavailableInput
  | YouTubeOAuthCredentialStatusUiDisabledInput;

export type YouTubeOAuthCredentialStatusUiWiringViewModel = {
  state: YouTubeOAuthCredentialStatusUiStateId;
  provider: "youtube";
  reconnectRequired: boolean;
  credentialReferenceId: string;
  providerChannelId: string | null;
  scopeLabel: "youtube.readonly" | null;
  expiresAtIso: string | null;
  reason: YouTubeOAuthCredentialStatusUiUnavailableInput["reason"] | null;
  clientPayloadBoundary: "sanitized-credential-status-metadata-only";
};

export type YouTubeOAuthCredentialStatusUiWiringReadiness =
  | {
      status: "ready-for-sanitized-status-ui";
      serverAction: "getYouTubeOAuthCredentialStatusAction";
      clientCredentialReferencePayload: "existing-approved-sanitized-reference";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
    }
  | {
      status: "blocked-pending-approved-client-reference-payload";
      serverAction: "getYouTubeOAuthCredentialStatusAction";
      clientCredentialReferencePayload: "not-wired";
      blocker: "new-client-credential-reference-payload-requires-separate-approval";
      safeFallbackStates: readonly ["unavailable", "credential-resolution-disabled"];
    };

export type YouTubeOAuthCredentialStatusDisplayWiringReadiness =
  | {
      status: "ready-for-display-wiring-pr";
      surface: "/tools/comment-translator";
      serverAction: "getYouTubeOAuthCredentialStatusAction";
      approvedClientCredentialReferenceSource: "existing-approved-client-safe-credential-reference";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "wire-status-display-to-existing-approved-client-safe-reference";
    }
  | {
      status: "blocked-pending-client-reference-source";
      surface: "/tools/comment-translator";
      serverAction: "getYouTubeOAuthCredentialStatusAction";
      approvedClientCredentialReferenceSource:
        | "missing-client-safe-credential-reference"
        | "approved-source-definition-only-not-surfaced"
        | "new-client-payload-required";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "approved-client-safe-credential-reference-source-required";
      nextPrConditions: readonly string[];
    };

export type YouTubeOAuthCredentialStatusDisplayReadinessAfterPayloadSource =
  | {
      status: "ready-for-display-ui-wiring-pr-after-pr320-payload-source-readiness";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 320;
      prerequisiteMergeCommit: string;
      serverAction: "getYouTubeOAuthCredentialStatusAction";
      payloadSource: YouTubeOAuthNewClientPayloadCredentialReferenceSource;
      currentClientPayloadSource: "new-client-payload-credentialReferenceId-source";
      clientPayloadBoundary: "credentialReferenceId-and-sanitized-status-metadata-only";
      clientReadableValues: readonly ["credentialReferenceId", "sanitizedCredentialStatusMetadata"];
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change";
      serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
      displayUiWiring: "deferred-to-separate-pr-after-readiness-pr-merge";
      nextStep: "wire-status-display-in-separate-pr-after-readiness-merge";
    }
  | {
      status: "blocked-pr320-payload-source-readiness-missing-payload-source";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 320;
      prerequisiteMergeCommit: string;
      serverAction: "getYouTubeOAuthCredentialStatusAction";
      payloadSource: null;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "new-client-payload-credentialReferenceId-source-required-before-display-ui-wiring-readiness";
      nextPrConditions: readonly [
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
        "defer-display-ui-wiring-to-separate-pr-after-readiness-pr-merge"
      ];
    };

export const youtubeOAuthCredentialStatusUiWiringContract = {
  implementationStage: "credential-status-display-wiring-readiness-contract",
  clientReadableInput: "sanitized-credential-status-metadata-only",
  uiStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
  serverAction: "getYouTubeOAuthCredentialStatusAction",
  credentialReferenceClientPayload: "readiness-only-no-new-client-payload",
  displayWiringStage: "blocked-until-approved-client-safe-credential-reference-source",
  emergencyDisableEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  forbiddenClientValues: [
    "encrypted-row",
    "ciphertext-reference",
    "decrypt-capability",
    "service-role-key",
    "managed-secret-value",
    "oauth-access-token-value",
    "oauth-refresh-token-value",
    "authorization-code-value"
  ],
  rollbackBoundary: "revoke-or-invalidate-unusable-credential-reference",
  loggingPolicy: "no-token-value-logging"
} as const;

const safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[] =
  youtubeOAuthCredentialStatusUiWiringContract.uiStates;

export function createYouTubeOAuthCredentialStatusUiWiring(
  input: YouTubeOAuthCredentialStatusUiWiringInput
): YouTubeOAuthCredentialStatusUiWiringViewModel {
  if (input.status === "credential-resolution-disabled") {
    return createBaseUiWiring(input, "credential-resolution-disabled", {
      providerChannelId: null,
      scopeLabel: null,
      expiresAtIso: null,
      reason: null
    });
  }

  if (input.status === "unavailable") {
    return createBaseUiWiring(input, "unavailable", {
      providerChannelId: null,
      scopeLabel: null,
      expiresAtIso: null,
      reason: input.reason
    });
  }

  return createBaseUiWiring(input, input.reconnectRequired ? "reconnect-required" : "available", {
    providerChannelId: input.providerChannelId,
    scopeLabel: input.scopeLabel,
    expiresAtIso: input.expiresAtIso,
    reason: null
  });
}

export function createYouTubeOAuthCredentialStatusUiWiringReadiness({
  serverAction,
  clientCredentialReferencePayload
}: {
  serverAction: "getYouTubeOAuthCredentialStatusAction";
  clientCredentialReferencePayload: "existing-approved-sanitized-reference" | "not-wired";
}): YouTubeOAuthCredentialStatusUiWiringReadiness {
  if (clientCredentialReferencePayload === "existing-approved-sanitized-reference") {
    return {
      status: "ready-for-sanitized-status-ui",
      serverAction,
      clientCredentialReferencePayload,
      safeStates
    };
  }

  return {
    status: "blocked-pending-approved-client-reference-payload",
    serverAction,
    clientCredentialReferencePayload,
    blocker: "new-client-credential-reference-payload-requires-separate-approval",
    safeFallbackStates: ["unavailable", "credential-resolution-disabled"]
  };
}

export function assessYouTubeOAuthCredentialStatusDisplayWiringReadiness({
  serverAction,
  approvedClientCredentialReferenceSource,
  surface
}: {
  serverAction: "getYouTubeOAuthCredentialStatusAction";
  approvedClientCredentialReferenceSource:
    | "existing-approved-client-safe-credential-reference"
    | "missing-client-safe-credential-reference"
    | "approved-source-definition-only-not-surfaced"
    | "new-client-payload-required";
  surface: "/tools/comment-translator";
}): YouTubeOAuthCredentialStatusDisplayWiringReadiness {
  if (approvedClientCredentialReferenceSource === "existing-approved-client-safe-credential-reference") {
    return {
      status: "ready-for-display-wiring-pr",
      surface,
      serverAction,
      approvedClientCredentialReferenceSource,
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates,
      nextStep: "wire-status-display-to-existing-approved-client-safe-reference"
    };
  }

  const nextPrConditions =
    approvedClientCredentialReferenceSource === "approved-source-definition-only-not-surfaced"
      ? [
          "surface-existing-approved-client-safe-credential-reference-to-comment-translator",
          "keep-client-payload-to-sanitized-credential-status-metadata-only",
          "preserve-no-localStorage-indexedDB-or-handoff-payload-change",
          "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
          "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
        ]
      : [
          "define-approved-client-safe-credential-reference-source",
          "keep-client-payload-to-sanitized-credential-status-metadata-only",
          "preserve-no-localStorage-indexedDB-or-handoff-payload-change",
          "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
          "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
        ];

  return {
    status: "blocked-pending-client-reference-source",
    surface,
    serverAction,
    approvedClientCredentialReferenceSource,
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "approved-client-safe-credential-reference-source-required",
    nextPrConditions
  };
}

export function assessYouTubeOAuthCredentialStatusDisplayReadinessAfterPayloadSource({
  serverAction,
  payloadSource,
  prerequisiteMergeCommit,
  prerequisitePullRequest,
  surface
}: {
  serverAction: "getYouTubeOAuthCredentialStatusAction";
  payloadSource: YouTubeOAuthNewClientPayloadCredentialReferenceSource | null;
  prerequisiteMergeCommit: string;
  prerequisitePullRequest: 320;
  surface: "/tools/comment-translator";
}): YouTubeOAuthCredentialStatusDisplayReadinessAfterPayloadSource {
  if (payloadSource) {
    return {
      status: "ready-for-display-ui-wiring-pr-after-pr320-payload-source-readiness",
      surface,
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      serverAction,
      payloadSource,
      currentClientPayloadSource: "new-client-payload-credentialReferenceId-source",
      clientPayloadBoundary: "credentialReferenceId-and-sanitized-status-metadata-only",
      clientReadableValues: ["credentialReferenceId", "sanitizedCredentialStatusMetadata"],
      safeStates,
      storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
      displayUiWiring: "deferred-to-separate-pr-after-readiness-pr-merge",
      nextStep: "wire-status-display-in-separate-pr-after-readiness-merge"
    };
  }

  return {
    status: "blocked-pr320-payload-source-readiness-missing-payload-source",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    serverAction,
    payloadSource: null,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "new-client-payload-credentialReferenceId-source-required-before-display-ui-wiring-readiness",
    nextPrConditions: [
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "defer-display-ui-wiring-to-separate-pr-after-readiness-pr-merge"
    ]
  };
}

function createBaseUiWiring(
  input: YouTubeOAuthCredentialStatusUiWiringInput,
  state: YouTubeOAuthCredentialStatusUiStateId,
  metadata: Pick<
    YouTubeOAuthCredentialStatusUiWiringViewModel,
    "providerChannelId" | "scopeLabel" | "expiresAtIso" | "reason"
  >
): YouTubeOAuthCredentialStatusUiWiringViewModel {
  return {
    state,
    provider: input.provider,
    reconnectRequired: input.reconnectRequired,
    credentialReferenceId: input.credentialReferenceId,
    ...metadata,
    clientPayloadBoundary: "sanitized-credential-status-metadata-only"
  };
}
