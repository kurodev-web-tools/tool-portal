import { type YouTubeOAuthCredentialStatusUiStateId } from "./comment-translator-youtube-credential-status-ui-wiring";

export type YouTubeOAuthClientSafeCredentialReferenceSourceId =
  | "existing-owned-session-credential-reference"
  | "missing-approved-client-safe-reference-source";

export type YouTubeOAuthClientSafeCredentialReferenceIdentifier = {
  credentialReferenceId: string;
  identifierShape: "opaque-non-secret-credential-reference-id";
};

export type YouTubeOAuthClientSafeCredentialReferenceSourceDefinition = {
  sourceId: Exclude<
    YouTubeOAuthClientSafeCredentialReferenceSourceId,
    "missing-approved-client-safe-reference-source"
  >;
  approvalStatus: "approved";
  identifierShape: "opaque-non-secret-credential-reference-id";
  sourceBoundary: "existing-client-safe-source-only";
  payloadBoundary: "sanitized-credential-status-metadata-only";
  storageBoundary: "no-localStorage-indexedDB-or-handoff-payload-change";
  ownerAuthorizationBoundary: "caller-must-own-credential-before-status-read";
  emergencyDisableEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";
  clientReadableValues: readonly ["credentialReferenceId", "sanitizedCredentialStatusMetadata"];
  forbiddenClientValues: typeof youtubeOAuthClientSafeCredentialReferenceSourceContract.forbiddenClientValues;
};

export type YouTubeOAuthClientSafeCredentialReferenceSourceReadiness =
  | {
      status: "ready-for-display-wiring-contract-only";
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      nextStep: "wire-status-display-in-separate-pr-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-pending-approved-client-safe-reference-source";
      approvedSource: null;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "approved-client-safe-credential-reference-source-required-before-display-wiring";
      nextPrConditions: readonly [
        "identify-existing-client-safe-reference-source-or-get-explicit-approval-for-new-source",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
      ];
    };

export type YouTubeOAuthClientSafeCredentialReferenceSurfaceSource =
  | "existing-page-or-dock-client-safe-credential-reference"
  | "definition-only-not-surfaced"
  | "new-client-payload-required";

export type YouTubeOAuthApprovedClientSafeCredentialDisplayWiringReadiness =
  | {
      status: "ready-for-display-wiring-to-approved-source";
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      surfaceClientReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      nextStep: "wire-status-display-to-approved-source-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-approved-source-not-available-to-surface";
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      surfaceClientReferenceSource: Exclude<
        YouTubeOAuthClientSafeCredentialReferenceSurfaceSource,
        "existing-page-or-dock-client-safe-credential-reference"
      >;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "approved-source-definition-is-not-surfaced-to-comment-translator";
      nextPrConditions: readonly [
        "surface-existing-approved-client-safe-credential-reference-to-comment-translator",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
      ];
    };

export type YouTubeOAuthSurfacedApprovedClientSafeCredentialReferenceSourceGate =
  | {
      status: "ready-for-status-display-wiring-contract";
      surface: "/tools/comment-translator";
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "wire-status-display-to-surfaced-approved-source-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-no-surfaced-approved-client-safe-credential-reference-source";
      surface: "/tools/comment-translator";
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      surfacedCredentialReferenceSource: null;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "surface-approved-client-safe-credential-reference-before-status-display-wiring";
      nextPrConditions: readonly [
        "identify-an-existing-page-or-dock-surfaced-approved-client-safe-credentialReferenceId-source",
        "do-not-call-status-action-until-that-source-exists",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
      ];
    };

export const youtubeOAuthClientSafeCredentialReferenceSourceContract = {
  implementationStage: "approved-client-safe-credential-reference-source-readiness-definition",
  currentClientPayloadSource: "not-wired",
  displaySurfaceSource: "not-surfaced-to-comment-translator",
  clientIdentifierShape: "opaque-non-secret-credential-reference-id",
  allowedStatusMetadata: "sanitized-credential-status-metadata-only",
  safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"] as const satisfies readonly YouTubeOAuthCredentialStatusUiStateId[],
  emergencyDisableEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  ownerAuthorizationBoundary: "caller-must-own-credential-before-status-read",
  storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
  forbiddenClientValues: [
    "encrypted-row",
    "ciphertext-reference",
    "decrypt-capability",
    "service-role-key",
    "managed-secret-value",
    "oauth-access-token-value",
    "oauth-refresh-token-value",
    "authorization-code-value"
  ] as const,
  rollbackBoundary: "revoke-or-invalidate-unusable-credential-reference",
  loggingPolicy: "no-token-value-logging"
} as const;

export function defineYouTubeOAuthClientSafeCredentialReferenceSource(
  definition: Omit<
    YouTubeOAuthClientSafeCredentialReferenceSourceDefinition,
    "clientReadableValues" | "forbiddenClientValues"
  >
): YouTubeOAuthClientSafeCredentialReferenceSourceDefinition {
  return {
    ...definition,
    clientReadableValues: ["credentialReferenceId", "sanitizedCredentialStatusMetadata"],
    forbiddenClientValues: youtubeOAuthClientSafeCredentialReferenceSourceContract.forbiddenClientValues
  };
}

export function assessYouTubeOAuthClientSafeCredentialReferenceSourceReadiness({
  approvedSource,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthClientSafeCredentialReferenceSourceReadiness {
  if (approvedSource && requestedClientPayloadChange === "none") {
    return {
      status: "ready-for-display-wiring-contract-only",
      approvedSource,
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      nextStep: "wire-status-display-in-separate-pr-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-pending-approved-client-safe-reference-source",
    approvedSource: null,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "approved-client-safe-credential-reference-source-required-before-display-wiring",
    nextPrConditions: [
      "identify-existing-client-safe-reference-source-or-get-explicit-approval-for-new-source",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  };
}

export function assessYouTubeOAuthApprovedClientSafeCredentialDisplayWiringReadiness({
  approvedSource,
  surfaceClientReferenceSource,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surfaceClientReferenceSource: YouTubeOAuthClientSafeCredentialReferenceSurfaceSource;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthApprovedClientSafeCredentialDisplayWiringReadiness {
  if (
    approvedSource &&
    surfaceClientReferenceSource === "existing-page-or-dock-client-safe-credential-reference" &&
    requestedClientPayloadChange === "none"
  ) {
    return {
      status: "ready-for-display-wiring-to-approved-source",
      approvedSource,
      surfaceClientReferenceSource,
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      nextStep: "wire-status-display-to-approved-source-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-approved-source-not-available-to-surface",
    approvedSource,
    surfaceClientReferenceSource:
      surfaceClientReferenceSource === "existing-page-or-dock-client-safe-credential-reference"
        ? "definition-only-not-surfaced"
        : surfaceClientReferenceSource,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "approved-source-definition-is-not-surfaced-to-comment-translator",
    nextPrConditions: [
      "surface-existing-approved-client-safe-credential-reference-to-comment-translator",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  };
}

export function assessYouTubeOAuthSurfacedApprovedClientSafeCredentialReferenceSourceGate({
  approvedSource,
  surface,
  pageOrDockHasSurfacedCredentialReferenceId,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surface: "/tools/comment-translator";
  pageOrDockHasSurfacedCredentialReferenceId: boolean;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthSurfacedApprovedClientSafeCredentialReferenceSourceGate {
  if (approvedSource && pageOrDockHasSurfacedCredentialReferenceId && requestedClientPayloadChange === "none") {
    return {
      status: "ready-for-status-display-wiring-contract",
      surface,
      approvedSource,
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates: youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
      nextStep: "wire-status-display-to-surfaced-approved-source-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-no-surfaced-approved-client-safe-credential-reference-source",
    surface,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "surface-approved-client-safe-credential-reference-before-status-display-wiring",
    nextPrConditions: [
      "identify-an-existing-page-or-dock-surfaced-approved-client-safe-credentialReferenceId-source",
      "do-not-call-status-action-until-that-source-exists",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  };
}
