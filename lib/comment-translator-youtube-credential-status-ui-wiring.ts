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

export const youtubeOAuthCredentialStatusUiWiringContract = {
  implementationStage: "credential-status-ui-wiring-readiness-contract",
  clientReadableInput: "sanitized-credential-status-metadata-only",
  uiStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
  serverAction: "getYouTubeOAuthCredentialStatusAction",
  credentialReferenceClientPayload: "readiness-only-no-new-client-payload",
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
