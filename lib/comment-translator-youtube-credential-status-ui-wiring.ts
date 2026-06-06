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

export type YouTubeOAuthCredentialStatusDisplayFollowupPostPr352Readiness =
  | {
      status: "ready-for-credential-status-display-human-review-after-pr352-service-role-smoke-success";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 352;
      prerequisiteMergeCommit: string;
      serviceRoleSmokeResult: "passed-bounded-service-role-status-persistence-smoke";
      displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness";
      clientPayloadSource: "new-client-payload-credentialReferenceId-source";
      serverAction: "getYouTubeOAuthCredentialStatusAction";
      clientPayloadBoundary: "credentialReferenceId-and-sanitized-status-metadata-only";
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change";
      serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
      liveProviderBoundary: "no-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime";
      nextStep: "human-review-existing-display-wiring-or-plan-separate-ux-follow-up-with-width-checks";
    }
  | {
      status: "blocked-pr352-display-followup-missing-bounded-service-role-smoke-success";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 352;
      prerequisiteMergeCommit: string;
      serviceRoleSmokeResult: "not-run-or-blocked";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "bounded-service-role-status-persistence-smoke-success-required-before-display-followup-readiness";
      nextPrConditions: readonly [
        "record-sanitized-bounded-service-role-status-persistence-smoke-success",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-owner-authorization-before-status-read",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
        "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime"
      ];
    };

export type YouTubeOAuthCredentialStatusDisplayHumanReviewPostPr353Readiness =
  | {
      status: "ready-for-human-review-only-after-pr353-display-followup-readiness";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 353;
      prerequisiteMergeCommit: string;
      previousReadiness: "ready-for-credential-status-display-human-review-after-pr352-service-role-smoke-success";
      displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness";
      clientPayloadSource: "new-client-payload-credentialReferenceId-source";
      serverAction: "getYouTubeOAuthCredentialStatusAction";
      clientReadableValues: readonly ["credentialReferenceId", "sanitizedCredentialStatusMetadata"];
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      reviewScope: "human-review-existing-pr321-display-wiring-with-pr353-post-service-role-smoke-readiness-no-new-ui";
      storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change";
      serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved";
      forbiddenFollowups: readonly [
        "storage-change",
        "handoff-payload-change",
        "google-api-live-call",
        "safe-live-youtube-oauth-smoke",
        "token-refresh-runtime",
        "full-revocation-runtime",
        "remote-supabase-mutation"
      ];
      nextPrConditions: readonly [
        "complete-human-review-of-existing-pr321-display-wiring-against-pr353-readiness",
        "record-reviewed-ui-text-layout-or-accessibility-observation-without-secrets",
        "run-width-checks-for-any-future-ui-text-layout-or-css-follow-up"
      ];
    }
  | {
      status: "blocked-pr353-human-review-missing-post-service-role-readiness";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 353;
      prerequisiteMergeCommit: string;
      previousReadiness: "blocked-or-not-reviewed";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "post-pr353-display-followup-readiness-required-before-human-review-only-slice";
      nextPrConditions: readonly [
        "record-post-service-role-smoke-display-followup-readiness",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
        "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-full-revocation-runtime-or-remote-supabase-mutation"
      ];
    };

export type YouTubeOAuthCredentialStatusDisplayHumanReviewResultPostPr354Evidence =
  | {
      status: "human-review-completed-after-pr354-readiness";
      surface: "/tools/comment-translator";
      browserUrl: "http://localhost:3000/tools/comment-translator/";
      pageTitle: "Kuro Live Comment Translator | Kuro Stream Kit";
      prerequisitePullRequest: 354;
      prerequisiteMergeCommit: string;
      previousReadiness: "ready-for-human-review-only-after-pr353-display-followup-readiness";
      browserReview: "completed-non-secret-repo-local-evidence";
      displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness";
      clientPayloadSource: "new-client-payload-credentialReferenceId-source";
      serverAction: "getYouTubeOAuthCredentialStatusAction";
      renderedResult: "meaningful-app-content-no-nextjs-framework-overlay";
      consoleResult: "no-warn-or-error-observed";
      interactionResult: "credential-status-refresh-clicked-once-no-runtime-error";
      observedFallbackReason: "auth-unavailable";
      fallbackBoundary: "sanitized-fallback-not-secret-bearing-failure";
      clientReadableValues: readonly ["opaqueCredentialReferenceId", "sanitizedCredentialStatusMetadata"];
      safeStates: readonly YouTubeOAuthCredentialStatusUiStateId[];
      forbiddenExposureScan: readonly [
        "no-service-role-marker",
        "no-service-role-env-reference",
        "no-oauth-access-token-marker",
        "no-oauth-refresh-token-marker",
        "no-oauth-authorization-code-marker",
        "no-private-key-marker",
        "no-owner-user-id-value",
        "no-provider-channel-id-value"
      ];
      visualObservation: "credential-reference-wraps-inside-left-panel-without-obvious-overlap-or-broken-layout";
      visualFollowupBoundary: "non-blocking-unless-future-ui-text-layout-or-accessibility-pr";
      storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change";
      liveProviderBoundary: "no-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime";
      remoteMutationBoundary: "no-remote-supabase-mutation";
      nextPrConditions: readonly [
        "separate-ui-text-layout-or-accessibility-follow-up-only-if-human-review-finds-a-specific-issue",
        "run-width-checks-for-any-future-ui-text-layout-or-css-follow-up",
        "keep-client-readable-values-to-opaque-credentialReferenceId-and-sanitized-status-metadata"
      ];
    }
  | {
      status: "blocked-pr354-human-review-result-missing-readiness-or-safe-evidence";
      surface: "/tools/comment-translator";
      prerequisitePullRequest: 354;
      prerequisiteMergeCommit: string;
      previousReadiness: "blocked-or-not-reviewed";
      browserReview: "not-completed-or-secret-bearing";
      currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled";
      blocker: "post-pr354-human-review-result-requires-pr353-readiness-and-non-secret-browser-evidence";
      nextPrConditions: readonly [
        "complete-human-review-against-existing-pr321-display-wiring",
        "record-only-non-secret-repo-local-evidence",
        "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
        "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
        "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-full-revocation-runtime-or-remote-supabase-mutation"
      ];
    };

export const youtubeOAuthCredentialStatusUiWiringContract = {
  implementationStage: "credential-status-display-ui-wiring-implemented",
  clientReadableInput: "sanitized-credential-status-metadata-only",
  uiStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
  serverAction: "getYouTubeOAuthCredentialStatusAction",
  credentialReferenceClientPayload: "new-client-payload-credentialReferenceId-source",
  displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
  postServiceRoleSmokeDisplayFollowup:
    "readiness-only-after-pr352-bounded-service-role-status-persistence-smoke-success",
  postPr353HumanReviewReadiness: "human-review-only-after-pr353-display-followup-readiness",
  postPr354HumanReviewResult: "actual-human-review-result-after-pr354-readiness-non-secret-repo-local-evidence",
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

export function assessYouTubeOAuthCredentialStatusDisplayFollowupPostPr352Readiness({
  surface,
  prerequisitePullRequest,
  prerequisiteMergeCommit,
  serviceRoleSmokeResult,
  displayWiringStage,
  clientPayloadSource,
  serverAction
}: {
  surface: "/tools/comment-translator";
  prerequisitePullRequest: 352;
  prerequisiteMergeCommit: string;
  serviceRoleSmokeResult: "passed-bounded-service-role-status-persistence-smoke" | "not-run-or-blocked";
  displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness";
  clientPayloadSource: "new-client-payload-credentialReferenceId-source";
  serverAction: "getYouTubeOAuthCredentialStatusAction";
}): YouTubeOAuthCredentialStatusDisplayFollowupPostPr352Readiness {
  if (serviceRoleSmokeResult === "passed-bounded-service-role-status-persistence-smoke") {
    return {
      status: "ready-for-credential-status-display-human-review-after-pr352-service-role-smoke-success",
      surface,
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      serviceRoleSmokeResult,
      displayWiringStage,
      clientPayloadSource,
      serverAction,
      clientPayloadBoundary: "credentialReferenceId-and-sanitized-status-metadata-only",
      safeStates,
      storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
      liveProviderBoundary:
        "no-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime",
      nextStep: "human-review-existing-display-wiring-or-plan-separate-ux-follow-up-with-width-checks"
    };
  }

  return {
    status: "blocked-pr352-display-followup-missing-bounded-service-role-smoke-success",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    serviceRoleSmokeResult,
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "bounded-service-role-status-persistence-smoke-success-required-before-display-followup-readiness",
    nextPrConditions: [
      "record-sanitized-bounded-service-role-status-persistence-smoke-success",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime"
    ]
  };
}

export function assessYouTubeOAuthCredentialStatusDisplayHumanReviewPostPr353Readiness({
  surface,
  prerequisitePullRequest,
  prerequisiteMergeCommit,
  previousReadiness,
  displayWiringStage,
  clientPayloadSource,
  serverAction
}: {
  surface: "/tools/comment-translator";
  prerequisitePullRequest: 353;
  prerequisiteMergeCommit: string;
  previousReadiness:
    | "ready-for-credential-status-display-human-review-after-pr352-service-role-smoke-success"
    | "blocked-or-not-reviewed";
  displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness";
  clientPayloadSource: "new-client-payload-credentialReferenceId-source";
  serverAction: "getYouTubeOAuthCredentialStatusAction";
}): YouTubeOAuthCredentialStatusDisplayHumanReviewPostPr353Readiness {
  if (previousReadiness === "ready-for-credential-status-display-human-review-after-pr352-service-role-smoke-success") {
    return {
      status: "ready-for-human-review-only-after-pr353-display-followup-readiness",
      surface,
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      previousReadiness,
      displayWiringStage,
      clientPayloadSource,
      serverAction,
      clientReadableValues: ["credentialReferenceId", "sanitizedCredentialStatusMetadata"],
      safeStates,
      reviewScope:
        "human-review-existing-pr321-display-wiring-with-pr353-post-service-role-smoke-readiness-no-new-ui",
      storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
      forbiddenFollowups: [
        "storage-change",
        "handoff-payload-change",
        "google-api-live-call",
        "safe-live-youtube-oauth-smoke",
        "token-refresh-runtime",
        "full-revocation-runtime",
        "remote-supabase-mutation"
      ],
      nextPrConditions: [
        "complete-human-review-of-existing-pr321-display-wiring-against-pr353-readiness",
        "record-reviewed-ui-text-layout-or-accessibility-observation-without-secrets",
        "run-width-checks-for-any-future-ui-text-layout-or-css-follow-up"
      ]
    };
  }

  return {
    status: "blocked-pr353-human-review-missing-post-service-role-readiness",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    previousReadiness,
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "post-pr353-display-followup-readiness-required-before-human-review-only-slice",
    nextPrConditions: [
      "record-post-service-role-smoke-display-followup-readiness",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-full-revocation-runtime-or-remote-supabase-mutation"
    ]
  };
}

export function assessYouTubeOAuthCredentialStatusDisplayHumanReviewResultPostPr354Evidence({
  surface,
  prerequisitePullRequest,
  prerequisiteMergeCommit,
  previousReadiness,
  browserReview,
  displayWiringStage,
  clientPayloadSource,
  serverAction,
  observedFallbackReason
}: {
  surface: "/tools/comment-translator";
  prerequisitePullRequest: 354;
  prerequisiteMergeCommit: string;
  previousReadiness: "ready-for-human-review-only-after-pr353-display-followup-readiness" | "blocked-or-not-reviewed";
  browserReview: "completed-non-secret-repo-local-evidence" | "not-completed-or-secret-bearing";
  displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness";
  clientPayloadSource: "new-client-payload-credentialReferenceId-source";
  serverAction: "getYouTubeOAuthCredentialStatusAction";
  observedFallbackReason: "auth-unavailable";
}): YouTubeOAuthCredentialStatusDisplayHumanReviewResultPostPr354Evidence {
  if (
    previousReadiness === "ready-for-human-review-only-after-pr353-display-followup-readiness" &&
    browserReview === "completed-non-secret-repo-local-evidence"
  ) {
    return {
      status: "human-review-completed-after-pr354-readiness",
      surface,
      browserUrl: "http://localhost:3000/tools/comment-translator/",
      pageTitle: "Kuro Live Comment Translator | Kuro Stream Kit",
      prerequisitePullRequest,
      prerequisiteMergeCommit,
      previousReadiness,
      browserReview,
      displayWiringStage,
      clientPayloadSource,
      serverAction,
      renderedResult: "meaningful-app-content-no-nextjs-framework-overlay",
      consoleResult: "no-warn-or-error-observed",
      interactionResult: "credential-status-refresh-clicked-once-no-runtime-error",
      observedFallbackReason,
      fallbackBoundary: "sanitized-fallback-not-secret-bearing-failure",
      clientReadableValues: ["opaqueCredentialReferenceId", "sanitizedCredentialStatusMetadata"],
      safeStates,
      forbiddenExposureScan: [
        "no-service-role-marker",
        "no-service-role-env-reference",
        "no-oauth-access-token-marker",
        "no-oauth-refresh-token-marker",
        "no-oauth-authorization-code-marker",
        "no-private-key-marker",
        "no-owner-user-id-value",
        "no-provider-channel-id-value"
      ],
      visualObservation: "credential-reference-wraps-inside-left-panel-without-obvious-overlap-or-broken-layout",
      visualFollowupBoundary: "non-blocking-unless-future-ui-text-layout-or-accessibility-pr",
      storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      liveProviderBoundary:
        "no-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime",
      remoteMutationBoundary: "no-remote-supabase-mutation",
      nextPrConditions: [
        "separate-ui-text-layout-or-accessibility-follow-up-only-if-human-review-finds-a-specific-issue",
        "run-width-checks-for-any-future-ui-text-layout-or-css-follow-up",
        "keep-client-readable-values-to-opaque-credentialReferenceId-and-sanitized-status-metadata"
      ]
    };
  }

  return {
    status: "blocked-pr354-human-review-result-missing-readiness-or-safe-evidence",
    surface,
    prerequisitePullRequest,
    prerequisiteMergeCommit,
    previousReadiness: "blocked-or-not-reviewed",
    browserReview: "not-completed-or-secret-bearing",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "post-pr354-human-review-result-requires-pr353-readiness-and-non-secret-browser-evidence",
    nextPrConditions: [
      "complete-human-review-against-existing-pr321-display-wiring",
      "record-only-non-secret-repo-local-evidence",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-full-revocation-runtime-or-remote-supabase-mutation"
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
