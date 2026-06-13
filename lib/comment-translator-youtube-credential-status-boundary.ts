import "server-only";

import {
  type TrustedYouTubeOAuthCredentialSupabaseAdapter,
  type YouTubeOAuthCredentialSupabaseStatus
} from "./comment-translator-youtube-token-store-supabase-adapter";
import {
  type YouTubeOAuthCredentialRefreshBrowserReadableStatus,
  type YouTubeOAuthCredentialRefreshRuntime,
  createYouTubeOAuthCredentialRefreshBrowserReadableStatus,
  readYouTubeOAuthCredentialRefreshStatus
} from "./comment-translator-youtube-token-refresh-runtime";

export type YouTubeOAuthCredentialStatusUnavailableReason =
  | "trusted-adapter-not-wired"
  | "trusted-adapter-query-failed"
  | "auth-unavailable"
  | "caller-not-authenticated"
  | "private-launch-gated";

export type YouTubeOAuthCredentialBrowserReadableStatus =
  | YouTubeOAuthCredentialRefreshBrowserReadableStatus
  | {
      status: "credential-resolution-disabled";
      credentialReferenceId: string;
      provider: "youtube";
      reconnectRequired: true;
      reconnectGuidance: "reconnect-youtube";
    }
  | {
      status: "unavailable";
      credentialReferenceId: string;
      provider: "youtube";
      reason: YouTubeOAuthCredentialStatusUnavailableReason;
      reconnectRequired: true;
      reconnectGuidance: "reconnect-youtube";
    };

export type YouTubeOAuthCredentialStatusCallerAuthorization =
  | {
      status: "authorized";
      ownerUserId: string;
    }
  | {
      status: "unavailable";
      reason: "auth-unavailable" | "caller-not-authenticated";
      reconnectRequired: true;
    };

export type ReadYouTubeOAuthCredentialStatusRequest = {
  credentialReferenceId: string;
  trustedAdapter: Pick<TrustedYouTubeOAuthCredentialSupabaseAdapter, "getCredentialStatus"> | null;
  trustedRefreshRuntime?: YouTubeOAuthCredentialRefreshRuntime | null;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  credentialResolutionDisabled: boolean;
};

export const youtubeOAuthCredentialStatusBoundaryContract = {
  implementationStage: "credential-status-endpoint-and-server-action-skeleton",
  runtime: "server-only",
  browserReadableOutput: "credential-status-metadata-only",
  endpoint: "/api/comment-translator/youtube/credential-status",
  serverAction: "getYouTubeOAuthCredentialStatusAction",
  authorizationBoundary: "caller-must-own-credential-before-status-read",
  authorizationFailureState: ["auth-unavailable", "caller-not-authenticated"],
  emergencyDisableEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  forbiddenBrowserOutput: [
    "encrypted-row",
    "ciphertext-reference",
    "decrypt-capability",
    "service-role-key",
    "managed-secret-value",
    "oauth-token-value",
    "authorization-code-value",
    "provider-channel-id-value",
    "provider-error-body"
  ],
  tokenRefreshRuntime: "server-only-expired-token-refresh-and-reconnect-status",
  rollbackBoundary: "revoke-or-invalidate-unusable-credential-reference",
  loggingPolicy: "no-token-value-logging"
} as const;

export function authorizeYouTubeOAuthCredentialStatusCaller({
  callerUserId,
  authUnavailable = false
}: {
  callerUserId: string | null;
  authUnavailable?: boolean;
}): YouTubeOAuthCredentialStatusCallerAuthorization {
  if (authUnavailable) {
    return {
      status: "unavailable",
      reason: "auth-unavailable",
      reconnectRequired: true
    };
  }

  if (!callerUserId) {
    return {
      status: "unavailable",
      reason: "caller-not-authenticated",
      reconnectRequired: true
    };
  }

  return {
    status: "authorized",
    ownerUserId: callerUserId
  };
}

export function createYouTubeOAuthCredentialBrowserReadableStatus(
  status: YouTubeOAuthCredentialSupabaseStatus
): YouTubeOAuthCredentialBrowserReadableStatus {
  return createYouTubeOAuthCredentialRefreshBrowserReadableStatus(status, {
    refreshAttempted: false,
    refreshStatus: "not-needed"
  });
}

export function createYouTubeOAuthCredentialStatusUnavailablePayload({
  credentialReferenceId,
  reason
}: {
  credentialReferenceId: string;
  reason: YouTubeOAuthCredentialStatusUnavailableReason;
}): YouTubeOAuthCredentialBrowserReadableStatus {
  return {
    status: "unavailable",
    credentialReferenceId,
    provider: "youtube",
    reason,
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube"
  };
}

export async function readYouTubeOAuthCredentialStatus(
  request: ReadYouTubeOAuthCredentialStatusRequest
): Promise<YouTubeOAuthCredentialBrowserReadableStatus> {
  if (request.credentialResolutionDisabled) {
    return {
      status: "credential-resolution-disabled",
      credentialReferenceId: request.credentialReferenceId,
      provider: "youtube",
      reconnectRequired: true,
      reconnectGuidance: "reconnect-youtube"
    };
  }

  if (request.callerAuthorization.status !== "authorized") {
    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId: request.credentialReferenceId,
      reason: request.callerAuthorization.reason
    });
  }

  if (!request.trustedAdapter) {
    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId: request.credentialReferenceId,
      reason: "trusted-adapter-not-wired"
    });
  }

  try {
    return await readYouTubeOAuthCredentialRefreshStatus({
      credentialStatus: await request.trustedAdapter.getCredentialStatus({
        credentialReferenceId: request.credentialReferenceId,
        ownerUserId: request.callerAuthorization.ownerUserId
      }),
      trustedRefreshRuntime: request.trustedRefreshRuntime ?? null
    });
  } catch {
    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId: request.credentialReferenceId,
      reason: "trusted-adapter-query-failed"
    });
  }
}
