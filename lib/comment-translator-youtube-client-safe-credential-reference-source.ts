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

export type YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus = "approved" | "missing";

export type YouTubeOAuthCredentialReferenceSourceSurfacingApprovalGate =
  | {
      status: "ready-for-surfaced-source-display-wiring-contract";
      surface: "/tools/comment-translator";
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      sourceSurfacingApproval: "approved";
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr";
    }
  | {
      status: "blocked-pending-source-surfacing-approval";
      surface: "/tools/comment-translator";
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      sourceSurfacingApproval: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
      surfacedCredentialReferenceSource: null;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "source-surfacing-approval-required-before-status-display-wiring";
      nextPrConditions: readonly [
        "obtain-explicit-approval-for-surfacing-existing-approved-client-safe-credentialReferenceId-source",
        "do-not-call-status-action-until-source-surfacing-is-approved-and-present",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
      ];
    };

export type YouTubeOAuthCredentialReferenceSurfaceApprovalEvidenceGate =
  | {
      status: "ready-for-status-display-wiring-after-source-approval-evidence";
      surface: "/tools/comment-translator";
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      sourceSurfacingApprovalEvidence: "approved";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-missing-surfaced-source-or-approval-evidence";
      surface: "/tools/comment-translator";
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      surfacedCredentialReferenceSource: null;
      sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "existing-surfaced-source-and-source-surfacing-approval-evidence-required-before-status-display-wiring";
      nextPrConditions: readonly [
        "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
        "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
        "do-not-call-status-action-until-source-and-approval-evidence-are-present",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
      ];
    };

export type YouTubeOAuthCredentialReferenceSurfaceSourceRecheck =
  | {
      status: "ready-for-status-display-wiring-after-pr300-source-recheck";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 300;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      sourceSurfacingApprovalEvidence: "approved";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-pr300-follow-up-missing-surfaced-source-or-approval-evidence";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 300;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      surfacedCredentialReferenceSource: null;
      sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring";
      nextPrConditions: readonly [
        "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
        "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
        "do-not-call-status-action-until-source-and-approval-evidence-are-present",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
      ];
    };

export type YouTubeOAuthCredentialReferenceSurfaceSourceApprovalRecheck =
  | {
      status: "ready-for-status-display-wiring-after-pr301-source-and-approval-recheck";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 301;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      sourceSurfacingApprovalEvidence: "approved";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-pr301-follow-up-missing-surfaced-source-or-approval-evidence";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 301;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      surfacedCredentialReferenceSource: null;
      sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring";
      nextPrConditions: readonly [
        "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
        "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
        "do-not-call-status-action-until-source-and-approval-evidence-are-present",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
      ];
    };

export type YouTubeOAuthCredentialReferenceSurfaceSourceFinalGate =
  | {
      status: "ready-for-status-display-wiring-after-pr302-final-gate";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 302;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      sourceSurfacingApprovalEvidence: "approved";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-pr302-final-gate-missing-surfaced-source-or-approval-evidence";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 302;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      surfacedCredentialReferenceSource: null;
      sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring";
      nextPrConditions: readonly [
        "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
        "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
        "do-not-call-status-action-until-source-and-approval-evidence-are-present",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
      ];
    };

export type YouTubeOAuthCredentialStatusDisplaySourceIntakeGate =
  | {
      status: "ready-for-status-display-wiring-after-pr303-source-intake-gate";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 303;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      sourceSurfacingApprovalEvidence: "approved";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-pr303-intake-gate-missing-surfaced-source-or-approval-evidence";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 303;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      surfacedCredentialReferenceSource: null;
      sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring";
      nextPrConditions: readonly [
        "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
        "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
        "do-not-call-status-action-until-source-and-approval-evidence-are-present",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
      ];
    };

export type YouTubeOAuthCredentialStatusDisplaySourceEvidenceFinalReadinessGate =
  | {
      status: "ready-for-status-display-wiring-after-pr304-final-readiness-gate";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 304;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      sourceSurfacingApprovalEvidence: "approved";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "record-readiness-and-defer-status-display-ui-wiring-to-separate-pr-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-pr304-final-readiness-missing-surfaced-source-or-approval-evidence";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 304;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      surfacedCredentialReferenceSource: null;
      sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring";
      nextPrConditions: readonly [
        "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
        "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
        "do-not-call-status-action-until-source-and-approval-evidence-are-present",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
        "defer-status-display-ui-wiring-to-separate-pr-even-if-final-readiness-is-met"
      ];
    };

export type YouTubeOAuthCredentialStatusDisplaySourceEvidencePostPr305ReviewGate =
  | {
      status: "ready-for-status-display-wiring-after-pr305-source-evidence-review-gate";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 305;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition;
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference";
      sourceSurfacingApprovalEvidence: "approved";
      currentClientPayloadSource: "existing-approved-client-safe-source";
      clientPayloadBoundary: "sanitized-credential-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      nextStep: "record-readiness-and-defer-status-display-ui-wiring-to-separate-pr-without-storage-or-handoff-changes";
    }
  | {
      status: "blocked-pr305-source-evidence-review-missing-surfaced-source-or-approval-evidence";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 305;
      prerequisiteMergeCommit: string;
      approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
      surfacedCredentialReferenceSource: null;
      sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
      currentClientPayloadSource: "not-wired";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring";
      nextPrConditions: readonly [
        "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
        "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
        "do-not-call-status-action-until-source-and-approval-evidence-are-present",
        "do-not-add-new-client-payload-without-explicit-source-approval",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
        "defer-status-display-ui-wiring-to-separate-pr-even-if-source-and-approval-evidence-are-present"
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

export function assessYouTubeOAuthCredentialReferenceSourceSurfacingApprovalGate({
  approvedSource,
  surface,
  sourceSurfacingApproval,
  pageOrDockHasSurfacedCredentialReferenceId,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surface: "/tools/comment-translator";
  sourceSurfacingApproval: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
  pageOrDockHasSurfacedCredentialReferenceId: boolean;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthCredentialReferenceSourceSurfacingApprovalGate {
  if (
    approvedSource &&
    sourceSurfacingApproval === "approved" &&
    pageOrDockHasSurfacedCredentialReferenceId &&
    requestedClientPayloadChange === "none"
  ) {
    return {
      status: "ready-for-surfaced-source-display-wiring-contract",
      surface,
      approvedSource,
      sourceSurfacingApproval,
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates: youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr"
    };
  }

  return {
    status: "blocked-pending-source-surfacing-approval",
    surface,
    approvedSource,
    sourceSurfacingApproval,
    surfacedCredentialReferenceSource: null,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "source-surfacing-approval-required-before-status-display-wiring",
    nextPrConditions: [
      "obtain-explicit-approval-for-surfacing-existing-approved-client-safe-credentialReferenceId-source",
      "do-not-call-status-action-until-source-surfacing-is-approved-and-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  };
}

export function assessYouTubeOAuthCredentialReferenceSurfaceApprovalEvidenceGate({
  approvedSource,
  surface,
  pageOrDockHasSurfacedCredentialReferenceId,
  sourceSurfacingApprovalEvidence,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surface: "/tools/comment-translator";
  pageOrDockHasSurfacedCredentialReferenceId: boolean;
  sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthCredentialReferenceSurfaceApprovalEvidenceGate {
  if (
    approvedSource &&
    pageOrDockHasSurfacedCredentialReferenceId &&
    sourceSurfacingApprovalEvidence === "approved" &&
    requestedClientPayloadChange === "none"
  ) {
    return {
      status: "ready-for-status-display-wiring-after-source-approval-evidence",
      surface,
      approvedSource,
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
      sourceSurfacingApprovalEvidence,
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates: youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-missing-surfaced-source-or-approval-evidence",
    surface,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "existing-surfaced-source-and-source-surfacing-approval-evidence-required-before-status-display-wiring",
    nextPrConditions: [
      "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
      "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  };
}

export function recheckYouTubeOAuthCredentialReferenceSurfaceSourceReadiness({
  approvedSource,
  surface,
  prerequisitePullRequest,
  prerequisiteMergeCommit,
  pageOrDockHasSurfacedCredentialReferenceId,
  sourceSurfacingApprovalEvidence,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surface: "/tools/comment-translator";
  prerequisitePullRequest: 300;
  prerequisiteMergeCommit: string;
  pageOrDockHasSurfacedCredentialReferenceId: boolean;
  sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthCredentialReferenceSurfaceSourceRecheck {
  if (
    approvedSource &&
    pageOrDockHasSurfacedCredentialReferenceId &&
    sourceSurfacingApprovalEvidence === "approved" &&
    requestedClientPayloadChange === "none"
  ) {
    return {
      status: "ready-for-status-display-wiring-after-pr300-source-recheck",
      surface,
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      approvedSource,
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
      sourceSurfacingApprovalEvidence,
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates: youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-pr300-follow-up-missing-surfaced-source-or-approval-evidence",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker:
      "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
    nextPrConditions: [
      "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
      "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  };
}

export function recheckYouTubeOAuthCredentialReferenceSurfaceSourceApprovalReadiness({
  approvedSource,
  surface,
  prerequisitePullRequest,
  prerequisiteMergeCommit,
  pageOrDockHasSurfacedCredentialReferenceId,
  sourceSurfacingApprovalEvidence,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surface: "/tools/comment-translator";
  prerequisitePullRequest: 301;
  prerequisiteMergeCommit: string;
  pageOrDockHasSurfacedCredentialReferenceId: boolean;
  sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthCredentialReferenceSurfaceSourceApprovalRecheck {
  if (
    approvedSource &&
    pageOrDockHasSurfacedCredentialReferenceId &&
    sourceSurfacingApprovalEvidence === "approved" &&
    requestedClientPayloadChange === "none"
  ) {
    return {
      status: "ready-for-status-display-wiring-after-pr301-source-and-approval-recheck",
      surface,
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      approvedSource,
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
      sourceSurfacingApprovalEvidence,
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates: youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-pr301-follow-up-missing-surfaced-source-or-approval-evidence",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker:
      "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
    nextPrConditions: [
      "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
      "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  };
}

export function assessYouTubeOAuthCredentialReferenceSurfaceSourceFinalGate({
  approvedSource,
  surface,
  prerequisitePullRequest,
  prerequisiteMergeCommit,
  pageOrDockHasSurfacedCredentialReferenceId,
  sourceSurfacingApprovalEvidence,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surface: "/tools/comment-translator";
  prerequisitePullRequest: 302;
  prerequisiteMergeCommit: string;
  pageOrDockHasSurfacedCredentialReferenceId: boolean;
  sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthCredentialReferenceSurfaceSourceFinalGate {
  if (
    approvedSource &&
    pageOrDockHasSurfacedCredentialReferenceId &&
    sourceSurfacingApprovalEvidence === "approved" &&
    requestedClientPayloadChange === "none"
  ) {
    return {
      status: "ready-for-status-display-wiring-after-pr302-final-gate",
      surface,
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      approvedSource,
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
      sourceSurfacingApprovalEvidence,
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates: youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-pr302-final-gate-missing-surfaced-source-or-approval-evidence",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker:
      "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
    nextPrConditions: [
      "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
      "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  };
}

export function assessYouTubeOAuthCredentialStatusDisplaySourceIntakeGate({
  approvedSource,
  surface,
  prerequisitePullRequest,
  prerequisiteMergeCommit,
  pageOrDockHasSurfacedCredentialReferenceId,
  sourceSurfacingApprovalEvidence,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surface: "/tools/comment-translator";
  prerequisitePullRequest: 303;
  prerequisiteMergeCommit: string;
  pageOrDockHasSurfacedCredentialReferenceId: boolean;
  sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthCredentialStatusDisplaySourceIntakeGate {
  if (
    approvedSource &&
    pageOrDockHasSurfacedCredentialReferenceId &&
    sourceSurfacingApprovalEvidence === "approved" &&
    requestedClientPayloadChange === "none"
  ) {
    return {
      status: "ready-for-status-display-wiring-after-pr303-source-intake-gate",
      surface,
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      approvedSource,
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
      sourceSurfacingApprovalEvidence,
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates: youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
      nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-pr303-intake-gate-missing-surfaced-source-or-approval-evidence",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker:
      "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
    nextPrConditions: [
      "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
      "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  };
}

export function assessYouTubeOAuthCredentialStatusDisplaySourceEvidenceFinalReadinessGate({
  approvedSource,
  surface,
  prerequisitePullRequest,
  prerequisiteMergeCommit,
  pageOrDockHasSurfacedCredentialReferenceId,
  sourceSurfacingApprovalEvidence,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surface: "/tools/comment-translator";
  prerequisitePullRequest: 304;
  prerequisiteMergeCommit: string;
  pageOrDockHasSurfacedCredentialReferenceId: boolean;
  sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthCredentialStatusDisplaySourceEvidenceFinalReadinessGate {
  if (
    approvedSource &&
    pageOrDockHasSurfacedCredentialReferenceId &&
    sourceSurfacingApprovalEvidence === "approved" &&
    requestedClientPayloadChange === "none"
  ) {
    return {
      status: "ready-for-status-display-wiring-after-pr304-final-readiness-gate",
      surface,
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      approvedSource,
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
      sourceSurfacingApprovalEvidence,
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates: youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
      nextStep: "record-readiness-and-defer-status-display-ui-wiring-to-separate-pr-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-pr304-final-readiness-missing-surfaced-source-or-approval-evidence",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker:
      "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
    nextPrConditions: [
      "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
      "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "defer-status-display-ui-wiring-to-separate-pr-even-if-final-readiness-is-met"
    ]
  };
}

export function assessYouTubeOAuthCredentialStatusDisplaySourceEvidencePostPr305ReviewGate({
  approvedSource,
  surface,
  prerequisitePullRequest,
  prerequisiteMergeCommit,
  pageOrDockHasSurfacedCredentialReferenceId,
  sourceSurfacingApprovalEvidence,
  requestedClientPayloadChange
}: {
  approvedSource: YouTubeOAuthClientSafeCredentialReferenceSourceDefinition | null;
  surface: "/tools/comment-translator";
  prerequisitePullRequest: 305;
  prerequisiteMergeCommit: string;
  pageOrDockHasSurfacedCredentialReferenceId: boolean;
  sourceSurfacingApprovalEvidence: YouTubeOAuthCredentialReferenceSourceSurfacingApprovalStatus;
  requestedClientPayloadChange: "none" | "new-client-payload";
}): YouTubeOAuthCredentialStatusDisplaySourceEvidencePostPr305ReviewGate {
  if (
    approvedSource &&
    pageOrDockHasSurfacedCredentialReferenceId &&
    sourceSurfacingApprovalEvidence === "approved" &&
    requestedClientPayloadChange === "none"
  ) {
    return {
      status: "ready-for-status-display-wiring-after-pr305-source-evidence-review-gate",
      surface,
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      approvedSource,
      surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
      sourceSurfacingApprovalEvidence,
      currentClientPayloadSource: "existing-approved-client-safe-source",
      clientPayloadBoundary: "sanitized-credential-status-metadata-only",
      safeStates: youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
      nextStep: "record-readiness-and-defer-status-display-ui-wiring-to-separate-pr-without-storage-or-handoff-changes"
    };
  }

  return {
    status: "blocked-pr305-source-evidence-review-missing-surfaced-source-or-approval-evidence",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker:
      "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
    nextPrConditions: [
      "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
      "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "defer-status-display-ui-wiring-to-separate-pr-even-if-source-and-approval-evidence-are-present"
    ]
  };
}
