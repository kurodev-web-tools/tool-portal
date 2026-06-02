import "server-only";

import {
  type TrustedYouTubeOAuthCredentialSupabaseAdapter,
  type YouTubeOAuthCredentialSupabaseStatus
} from "./comment-translator-youtube-token-store-supabase-adapter";
import { type YouTubeReadOnlyOAuthScope } from "./comment-translator-youtube-api-adapter";

export type YouTubeOAuthCredentialBrowserReadableStatus =
  | {
      status: "available";
      credentialReferenceId: string;
      provider: "youtube";
      providerChannelId: string;
      scopeLabel: "youtube.readonly";
      scopeSet: readonly YouTubeReadOnlyOAuthScope[];
      expiresAtIso: string;
      expiryStatus: "active" | "expired" | "revoked";
      revoked: boolean;
      revokedAtIso: string | null;
      reconnectRequired: boolean;
    }
  | {
      status: "credential-resolution-disabled";
      credentialReferenceId: string;
      provider: "youtube";
      reconnectRequired: true;
    }
  | {
      status: "unavailable";
      credentialReferenceId: string;
      provider: "youtube";
      reason: "trusted-adapter-not-wired" | "trusted-adapter-query-failed";
      reconnectRequired: true;
    };

export type ReadYouTubeOAuthCredentialStatusRequest = {
  credentialReferenceId: string;
  trustedAdapter: Pick<TrustedYouTubeOAuthCredentialSupabaseAdapter, "getCredentialStatus"> | null;
  credentialResolutionDisabled: boolean;
};

export const youtubeOAuthCredentialStatusBoundaryContract = {
  implementationStage: "credential-status-endpoint-and-server-action-skeleton",
  runtime: "server-only",
  browserReadableOutput: "credential-status-metadata-only",
  endpoint: "/api/comment-translator/youtube/credential-status",
  serverAction: "getYouTubeOAuthCredentialStatusAction",
  emergencyDisableEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  forbiddenBrowserOutput: [
    "encrypted-row",
    "ciphertext-reference",
    "decrypt-capability",
    "service-role-key",
    "managed-secret-value",
    "oauth-token-value",
    "authorization-code-value"
  ],
  rollbackBoundary: "revoke-or-invalidate-unusable-credential-reference",
  loggingPolicy: "no-token-value-logging"
} as const;

export function createYouTubeOAuthCredentialBrowserReadableStatus(
  status: YouTubeOAuthCredentialSupabaseStatus
): YouTubeOAuthCredentialBrowserReadableStatus {
  return {
    status: "available",
    credentialReferenceId: status.credentialReferenceId,
    provider: status.provider,
    providerChannelId: status.providerChannelId,
    scopeLabel: status.scopeLabel,
    scopeSet: status.scopeSet,
    expiresAtIso: status.expiresAtIso,
    expiryStatus: status.expiryStatus,
    revoked: status.revoked,
    revokedAtIso: status.revokedAtIso,
    reconnectRequired: status.expiryStatus !== "active" || status.revoked
  };
}

export function createYouTubeOAuthCredentialStatusUnavailablePayload({
  credentialReferenceId,
  reason
}: {
  credentialReferenceId: string;
  reason: "trusted-adapter-not-wired" | "trusted-adapter-query-failed";
}): YouTubeOAuthCredentialBrowserReadableStatus {
  return {
    status: "unavailable",
    credentialReferenceId,
    provider: "youtube",
    reason,
    reconnectRequired: true
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
      reconnectRequired: true
    };
  }

  if (!request.trustedAdapter) {
    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId: request.credentialReferenceId,
      reason: "trusted-adapter-not-wired"
    });
  }

  try {
    return createYouTubeOAuthCredentialBrowserReadableStatus(
      await request.trustedAdapter.getCredentialStatus({
        credentialReferenceId: request.credentialReferenceId
      })
    );
  } catch {
    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId: request.credentialReferenceId,
      reason: "trusted-adapter-query-failed"
    });
  }
}
