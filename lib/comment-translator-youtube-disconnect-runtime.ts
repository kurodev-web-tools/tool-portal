import "server-only";

import {
  type YouTubeOAuthCredentialBrowserReadableStatus,
  type YouTubeOAuthCredentialStatusCallerAuthorization
} from "./comment-translator-youtube-credential-status-boundary";
import { type YouTubeOAuthCredentialSupabaseStatus } from "./comment-translator-youtube-token-store-supabase-adapter";

export type YouTubeOAuthCredentialDisconnectUnavailableReason =
  | "credential-resolution-disabled"
  | "credential-reference-env-missing"
  | "trusted-disconnect-adapter-not-wired"
  | "trusted-disconnect-query-failed"
  | "auth-unavailable"
  | "caller-not-authenticated"
  | "private-launch-gated";

export type YouTubeOAuthCredentialDisconnectAuditEvent = {
  type: "youtube-oauth-credential-disconnect";
  provider: "youtube";
  credentialReferenceId: string;
  outcome: "revoked" | "already-revoked" | "unavailable" | "disconnect-failed";
  actor: "authenticated-owner" | "unavailable";
  ownerUserIdValue: "server-only-not-returned";
  tokenValue: "never-returned-by-design";
  providerTargetMetadata: "forbidden";
};

export type YouTubeOAuthCredentialDisconnectResult =
  | {
      status: "disconnected";
      credentialReferenceId: string;
      provider: "youtube";
      revocationStatus: "revoked";
      revokedAtIso: string;
      reconnectRequired: true;
      reconnectGuidance: "reconnect-youtube";
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      providerErrorBody: "never-returned-by-design";
      auditEvent: YouTubeOAuthCredentialDisconnectAuditEvent;
    }
  | {
      status: "already-disconnected";
      credentialReferenceId: string;
      provider: "youtube";
      revocationStatus: "already-revoked";
      revokedAtIso: string;
      reconnectRequired: true;
      reconnectGuidance: "reconnect-youtube";
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      providerErrorBody: "never-returned-by-design";
      auditEvent: YouTubeOAuthCredentialDisconnectAuditEvent;
    }
  | {
      status: "disconnect-unavailable";
      credentialReferenceId: string;
      provider: "youtube";
      reason: YouTubeOAuthCredentialDisconnectUnavailableReason;
      revocationStatus: "not-run";
      reconnectRequired: true;
      reconnectGuidance: "reconnect-youtube";
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      providerErrorBody: "never-returned-by-design";
      auditEvent: YouTubeOAuthCredentialDisconnectAuditEvent;
    }
  | {
      status: "disconnect-failed";
      credentialReferenceId: string;
      provider: "youtube";
      reason: "trusted-cleanup-failed";
      revocationStatus: "disconnect-failed";
      reconnectRequired: true;
      reconnectGuidance: "reconnect-youtube";
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      providerErrorBody: "never-returned-by-design";
      auditEvent: YouTubeOAuthCredentialDisconnectAuditEvent;
    };

export type YouTubeOAuthCredentialTrustedDisconnectAdapter = {
  getCredentialStatus: (request: {
    credentialReferenceId: string;
    ownerUserId: string;
  }) => Promise<YouTubeOAuthCredentialSupabaseStatus>;
  disconnectCredentialStatus: (request: {
    credentialReferenceId: string;
    ownerUserId: string;
    reason: "user-disconnect";
  }) => Promise<YouTubeOAuthCredentialSupabaseStatus>;
};

export type ReadYouTubeOAuthCredentialDisconnectRequest = {
  credentialReferenceId: string;
  trustedDisconnectAdapter: YouTubeOAuthCredentialTrustedDisconnectAdapter | null;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  credentialResolutionDisabled: boolean;
};

export type YouTubeOAuthCredentialTranslatorStartReadiness =
  | {
      status: "ready";
      provider: "youtube";
      credentialReferenceId: string;
      translatorStartAllowed: true;
      reconnectGuidance: "none";
    }
  | {
      status: "blocked-reconnect-required" | "blocked-unavailable";
      provider: "youtube";
      credentialReferenceId: string;
      reason:
        | "expired"
        | "refresh-failed"
        | "revoked"
        | "trusted-adapter-not-wired"
        | "credential-reference-env-missing"
        | "trusted-adapter-query-failed"
        | "credential-not-found"
        | "auth-unavailable"
        | "caller-not-authenticated"
        | "private-launch-gated"
        | "credential-resolution-disabled";
      translatorStartAllowed: false;
      reconnectGuidance: "reconnect-youtube";
    };

export const youtubeOAuthCredentialDisconnectRuntimeContract = {
  implementationStage: "server-only-disconnect-revocation-runtime",
  runtime: "server-only",
  browserReadableOutput: "sanitized-disconnect-status-only",
  safeStates: ["disconnected", "already-disconnected", "disconnect-unavailable", "disconnect-failed"],
  auditEventShape: "credential-reference-outcome-and-static-boundary-markers-only",
  tokenValueOutput: "never-returned-by-design",
  refreshTokenValueOutput: "never-returned-by-design",
  providerErrorBodyOutput: "never-returned-by-design",
  providerTargetMetadataOutput: "forbidden",
  oauthDisconnectCleanup: "f13-sanitized-cleanup-readiness-only",
  liveProviderExecution: "not-run-by-default-route-or-action",
  browserStorage: "forbidden",
  loggingPolicy: "no-token-value-or-provider-body-logging",
  translatorStartRevokedCredentialPolicy: "blocked-reconnect-required"
} as const;

export function createYouTubeOAuthCredentialDisconnectUnavailablePayload({
  credentialReferenceId,
  reason
}: {
  credentialReferenceId: string;
  reason: YouTubeOAuthCredentialDisconnectUnavailableReason;
}): YouTubeOAuthCredentialDisconnectResult {
  return {
    status: "disconnect-unavailable",
    credentialReferenceId,
    provider: "youtube",
    reason,
    revocationStatus: "not-run",
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    providerErrorBody: "never-returned-by-design",
    auditEvent: createAuditEvent({
      credentialReferenceId,
      outcome: "unavailable",
      actor: "unavailable"
    })
  };
}

export async function readYouTubeOAuthCredentialDisconnectResult(
  request: ReadYouTubeOAuthCredentialDisconnectRequest
): Promise<YouTubeOAuthCredentialDisconnectResult> {
  if (request.credentialResolutionDisabled) {
    return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
      credentialReferenceId: request.credentialReferenceId,
      reason: "credential-resolution-disabled"
    });
  }

  if (request.callerAuthorization.status !== "authorized") {
    return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
      credentialReferenceId: request.credentialReferenceId,
      reason: request.callerAuthorization.reason
    });
  }

  if (!request.trustedDisconnectAdapter) {
    return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
      credentialReferenceId: request.credentialReferenceId,
      reason: "trusted-disconnect-adapter-not-wired"
    });
  }

  try {
    const currentStatus = await request.trustedDisconnectAdapter.getCredentialStatus({
      credentialReferenceId: request.credentialReferenceId,
      ownerUserId: request.callerAuthorization.ownerUserId
    });

    if (currentStatus.revoked || currentStatus.expiryStatus === "revoked") {
      return createAlreadyDisconnectedPayload(currentStatus);
    }

    const revokedStatus = await request.trustedDisconnectAdapter.disconnectCredentialStatus({
      credentialReferenceId: request.credentialReferenceId,
      ownerUserId: request.callerAuthorization.ownerUserId,
      reason: "user-disconnect"
    });

    if (!revokedStatus.revokedAtIso) {
      return createDisconnectFailedPayload(request.credentialReferenceId);
    }

    return {
      status: "disconnected",
      credentialReferenceId: revokedStatus.credentialReferenceId,
      provider: "youtube",
      revocationStatus: "revoked",
      revokedAtIso: revokedStatus.revokedAtIso,
      reconnectRequired: true,
      reconnectGuidance: "reconnect-youtube",
      tokenValue: "never-returned-by-design",
      refreshTokenValue: "never-returned-by-design",
      providerErrorBody: "never-returned-by-design",
      auditEvent: createAuditEvent({
        credentialReferenceId: revokedStatus.credentialReferenceId,
        outcome: "revoked",
        actor: "authenticated-owner"
      })
    };
  } catch {
    return createDisconnectFailedPayload(request.credentialReferenceId);
  }
}

export function assessYouTubeOAuthCredentialTranslatorStartReadiness(
  status: YouTubeOAuthCredentialBrowserReadableStatus
): YouTubeOAuthCredentialTranslatorStartReadiness {
  if (status.status === "available" && !status.revoked) {
    return {
      status: "ready",
      provider: "youtube",
      credentialReferenceId: status.credentialReferenceId,
      translatorStartAllowed: true,
      reconnectGuidance: "none"
    };
  }

  if (status.status === "reconnect-required") {
    return {
      status: "blocked-reconnect-required",
      provider: "youtube",
      credentialReferenceId: status.credentialReferenceId,
      reason: status.reason,
      translatorStartAllowed: false,
      reconnectGuidance: "reconnect-youtube"
    };
  }

  if (status.status === "disconnected") {
    return {
      status: "blocked-reconnect-required",
      provider: "youtube",
      credentialReferenceId: status.credentialReferenceId,
      reason: "credential-not-found",
      translatorStartAllowed: false,
      reconnectGuidance: "reconnect-youtube"
    };
  }

  return {
    status: "blocked-unavailable",
    provider: "youtube",
    credentialReferenceId: status.credentialReferenceId,
    reason:
      status.status === "credential-resolution-disabled"
        ? "credential-resolution-disabled"
        : status.status === "error"
          ? status.reason
          : status.reason,
    translatorStartAllowed: false,
    reconnectGuidance: "reconnect-youtube"
  };
}

function createAlreadyDisconnectedPayload(
  status: YouTubeOAuthCredentialSupabaseStatus
): YouTubeOAuthCredentialDisconnectResult {
  return {
    status: "already-disconnected",
    credentialReferenceId: status.credentialReferenceId,
    provider: "youtube",
    revocationStatus: "already-revoked",
    revokedAtIso: status.revokedAtIso ?? "already-revoked",
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    providerErrorBody: "never-returned-by-design",
    auditEvent: createAuditEvent({
      credentialReferenceId: status.credentialReferenceId,
      outcome: "already-revoked",
      actor: "authenticated-owner"
    })
  };
}

function createDisconnectFailedPayload(credentialReferenceId: string): YouTubeOAuthCredentialDisconnectResult {
  return {
    status: "disconnect-failed",
    credentialReferenceId,
    provider: "youtube",
    reason: "trusted-cleanup-failed",
    revocationStatus: "disconnect-failed",
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    providerErrorBody: "never-returned-by-design",
    auditEvent: createAuditEvent({
      credentialReferenceId,
      outcome: "disconnect-failed",
      actor: "authenticated-owner"
    })
  };
}

function createAuditEvent({
  credentialReferenceId,
  outcome,
  actor
}: {
  credentialReferenceId: string;
  outcome: YouTubeOAuthCredentialDisconnectAuditEvent["outcome"];
  actor: YouTubeOAuthCredentialDisconnectAuditEvent["actor"];
}): YouTubeOAuthCredentialDisconnectAuditEvent {
  return {
    type: "youtube-oauth-credential-disconnect",
    provider: "youtube",
    credentialReferenceId,
    outcome,
    actor,
    ownerUserIdValue: "server-only-not-returned",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}
