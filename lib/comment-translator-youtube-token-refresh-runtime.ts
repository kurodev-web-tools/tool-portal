import "server-only";

import { type YouTubeReadOnlyOAuthScope } from "./comment-translator-youtube-api-adapter";
import { type YouTubeOAuthCredentialSupabaseStatus } from "./comment-translator-youtube-token-store-supabase-adapter";

const youtubeReadonlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly" as const;

export type YouTubeOAuthCredentialRefreshFailureReason =
  | "provider-rejected-refresh"
  | "provider-unavailable"
  | "refresh-runtime-error";

export type YouTubeOAuthCredentialReconnectReason = "expired" | "refresh-failed" | "revoked";

export type YouTubeOAuthCredentialRefreshRuntimeResult =
  | {
      status: "refreshed";
      credentialStatus: YouTubeOAuthCredentialSupabaseStatus;
    }
  | {
      status: "refresh-failed";
      reason: YouTubeOAuthCredentialRefreshFailureReason;
      providerErrorBody: "never-returned-by-design";
    };

export type YouTubeOAuthCredentialRefreshRuntime = {
  refreshExpiredCredential: (request: {
    credentialReferenceId: string;
    requiredScope: YouTubeReadOnlyOAuthScope;
  }) => Promise<YouTubeOAuthCredentialRefreshRuntimeResult>;
};

export type YouTubeOAuthCredentialRefreshBrowserReadableStatus =
  | {
      status: "available";
      credentialReferenceId: string;
      provider: "youtube";
      scopeLabel: "youtube.readonly";
      scopeSet: readonly YouTubeReadOnlyOAuthScope[];
      expiresAtIso: string;
      expiryStatus: "active";
      revoked: false;
      revokedAtIso: null;
      reconnectRequired: false;
      reconnectGuidance: "none";
      refreshAttempted: boolean;
      refreshStatus: "not-needed" | "refreshed";
    }
  | {
      status: "reconnect-required";
      credentialReferenceId: string;
      provider: "youtube";
      reason: YouTubeOAuthCredentialReconnectReason;
      scopeLabel: "youtube.readonly";
      scopeSet: readonly YouTubeReadOnlyOAuthScope[];
      expiresAtIso: string;
      expiryStatus: "expired" | "revoked";
      revoked: boolean;
      revokedAtIso: string | null;
      reconnectRequired: true;
      reconnectGuidance: "reconnect-youtube";
      refreshAttempted: boolean;
      refreshStatus: "refresh-runtime-unavailable" | "refresh-failed" | "not-needed";
      providerErrorBody: "never-returned-by-design";
    };

export type ReadYouTubeOAuthCredentialRefreshStatusRequest = {
  credentialStatus: YouTubeOAuthCredentialSupabaseStatus;
  trustedRefreshRuntime: YouTubeOAuthCredentialRefreshRuntime | null;
};

export const youtubeOAuthCredentialTokenRefreshRuntimeContract = {
  implementationStage: "server-only-token-refresh-reconnect-status",
  runtime: "server-only",
  browserReadableOutput: "sanitized-refresh-and-reconnect-status-only",
  safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
  tokenValueOutput: "never-returned-by-design",
  refreshTokenValueOutput: "never-returned-by-design",
  providerErrorBodyOutput: "never-returned-by-design",
  providerTargetMetadataOutput: "forbidden",
  liveProviderExecution: "not-run-by-default-route-or-action",
  browserStorage: "forbidden",
  loggingPolicy: "no-token-value-or-provider-body-logging"
} as const;

export function createYouTubeOAuthCredentialRefreshBrowserReadableStatus(
  status: YouTubeOAuthCredentialSupabaseStatus,
  refreshMetadata: {
    refreshAttempted: boolean;
    refreshStatus: "not-needed" | "refreshed";
  }
): YouTubeOAuthCredentialRefreshBrowserReadableStatus {
  if (status.expiryStatus === "active" && !status.revoked) {
    return {
      status: "available",
      credentialReferenceId: status.credentialReferenceId,
      provider: status.provider,
      scopeLabel: status.scopeLabel,
      scopeSet: status.scopeSet,
      expiresAtIso: status.expiresAtIso,
      expiryStatus: "active",
      revoked: false,
      revokedAtIso: null,
      reconnectRequired: false,
      reconnectGuidance: "none",
      refreshAttempted: refreshMetadata.refreshAttempted,
      refreshStatus: refreshMetadata.refreshStatus
    };
  }

  return createReconnectRequiredStatus(status, {
    reason: status.expiryStatus === "revoked" || status.revoked ? "revoked" : "expired",
    refreshAttempted: false,
    refreshStatus: "not-needed"
  });
}

export async function readYouTubeOAuthCredentialRefreshStatus(
  request: ReadYouTubeOAuthCredentialRefreshStatusRequest
): Promise<YouTubeOAuthCredentialRefreshBrowserReadableStatus> {
  if (request.credentialStatus.expiryStatus === "active" && !request.credentialStatus.revoked) {
    return createYouTubeOAuthCredentialRefreshBrowserReadableStatus(request.credentialStatus, {
      refreshAttempted: false,
      refreshStatus: "not-needed"
    });
  }

  if (request.credentialStatus.expiryStatus === "revoked" || request.credentialStatus.revoked) {
    return createReconnectRequiredStatus(request.credentialStatus, {
      reason: "revoked",
      refreshAttempted: false,
      refreshStatus: "not-needed"
    });
  }

  if (!request.trustedRefreshRuntime) {
    return createReconnectRequiredStatus(request.credentialStatus, {
      reason: "expired",
      refreshAttempted: false,
      refreshStatus: "refresh-runtime-unavailable"
    });
  }

  try {
    const refreshResult = await request.trustedRefreshRuntime.refreshExpiredCredential({
      credentialReferenceId: request.credentialStatus.credentialReferenceId,
      requiredScope: youtubeReadonlyOAuthScope
    });

    if (refreshResult.status === "refreshed" && refreshResult.credentialStatus.expiryStatus === "active") {
      return createYouTubeOAuthCredentialRefreshBrowserReadableStatus(refreshResult.credentialStatus, {
        refreshAttempted: true,
        refreshStatus: "refreshed"
      });
    }
  } catch {
    return createReconnectRequiredStatus(request.credentialStatus, {
      reason: "refresh-failed",
      refreshAttempted: true,
      refreshStatus: "refresh-failed"
    });
  }

  return createReconnectRequiredStatus(request.credentialStatus, {
    reason: "refresh-failed",
    refreshAttempted: true,
    refreshStatus: "refresh-failed"
  });
}

function createReconnectRequiredStatus(
  status: YouTubeOAuthCredentialSupabaseStatus,
  metadata: {
    reason: YouTubeOAuthCredentialReconnectReason;
    refreshAttempted: boolean;
    refreshStatus: "refresh-runtime-unavailable" | "refresh-failed" | "not-needed";
  }
): YouTubeOAuthCredentialRefreshBrowserReadableStatus {
  return {
    status: "reconnect-required",
    credentialReferenceId: status.credentialReferenceId,
    provider: status.provider,
    reason: metadata.reason,
    scopeLabel: status.scopeLabel,
    scopeSet: status.scopeSet,
    expiresAtIso: status.expiresAtIso,
    expiryStatus: status.expiryStatus === "revoked" || status.revoked ? "revoked" : "expired",
    revoked: status.revoked,
    revokedAtIso: status.revokedAtIso,
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    refreshAttempted: metadata.refreshAttempted,
    refreshStatus: metadata.refreshStatus,
    providerErrorBody: "never-returned-by-design"
  };
}
