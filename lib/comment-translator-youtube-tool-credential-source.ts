import "server-only";

import {
  authorizeYouTubeOAuthCredentialStatusCaller,
  createYouTubeOAuthCredentialStatusUnavailablePayload,
  readYouTubeOAuthCredentialStatus,
  type YouTubeOAuthCredentialBrowserReadableStatus,
  type YouTubeOAuthCredentialStatusCallerAuthorization
} from "./comment-translator-youtube-credential-status-boundary";
import { createYouTubeOAuthCredentialStatusUiWiring, type YouTubeOAuthCredentialStatusUiStateId } from "./comment-translator-youtube-credential-status-ui-wiring";
import {
  readYouTubeOAuthCredentialReferenceForCaller,
  type YouTubeOAuthCredentialReferenceUnavailableReason
} from "./comment-translator-youtube-account-integration-status";
import {
  createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime,
  createTrustedYouTubeOAuthCredentialSupabaseStatusReader,
  type TrustedYouTubeOAuthCredentialSupabaseAdapter
} from "./comment-translator-youtube-token-store-supabase-adapter";
import { createTrustedYouTubeOAuthStoredCredentialRefreshRuntime } from "./comment-translator-youtube-token-material-runtime";
import type { AccountSessionState } from "./supabase/session";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export type CommentTranslatorToolCredentialStatusSource = {
  sourceId: "server-owned-trusted-connected-credential-status";
  statusMetadata: {
    status: YouTubeOAuthCredentialStatusUiStateId;
    provider: "youtube";
    reconnectRequired: boolean;
    scopeLabel: "youtube.readonly" | null;
    expiresAtIso: string | null;
    reason: string | null;
    payloadBoundary: "sanitized-credential-status-metadata-only";
  };
  clientReadableValues: "sanitized-credential-status-metadata-only";
  storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change";
  backgroundMonitoring: "not-started-by-connection";
};

export const commentTranslatorToolCredentialSourceContract = {
  implementationStage: "tool-server-owned-credential-source-wiring",
  runtime: "server-only",
  route: "/tools/comment-translator",
  sourceId: "server-owned-trusted-connected-credential-status",
  activeToolReadinessPath: "trusted-connected-credential-status-reference",
  fixedPreviewCredentialReference: "removed-from-active-tool-readiness-path",
  trustedAdapterBoundary: "preserved",
  clientReadableValues: "sanitized-credential-status-metadata-only",
  safeStates: ["available", "reconnect-required", "disconnected", "credential-resolution-disabled", "unavailable", "error"],
  emergencyDisableEnv: credentialResolutionDisabledEnv,
  failClosedStates: ["credential-resolution-disabled", "credential-reference-env-missing", "auth-unavailable", "caller-not-authenticated", "error"],
  providerTargetLookup: "not-run",
  liveChatIdLookup: "not-run",
  liveProviderExecution: "not-run",
  backgroundMonitoring: "not-started-by-connection",
  browserStorage: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change"
} as const;

export async function readCommentTranslatorToolCredentialStatusSource({
  accountSession,
  env = process.env,
  trustedAdapter
}: {
  accountSession: AccountSessionState;
  env?: Record<string, string | undefined>;
  trustedAdapter?: TrustedYouTubeCredentialStatusAdapter | null;
}): Promise<CommentTranslatorToolCredentialStatusSource> {
  const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: accountSession.authStatus === "signed-in" ? accountSession.user?.id ?? null : null,
    authUnavailable: accountSession.authStatus === "unavailable"
  });

  const status = await readCommentTranslatorToolCredentialStatus({
    callerAuthorization,
    env,
    trustedAdapter
  });

  return createCommentTranslatorToolCredentialStatusSource(status);
}

export async function readCommentTranslatorToolCredentialStatus({
  callerAuthorization,
  env = process.env,
  trustedAdapter
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  env?: Record<string, string | undefined>;
  trustedAdapter?: TrustedYouTubeCredentialStatusAdapter | null;
}): Promise<YouTubeOAuthCredentialBrowserReadableStatus> {
  const reference = readYouTubeOAuthCredentialReferenceForCaller({ callerAuthorization, env });

  if (reference.status === "unavailable") {
    return createUnavailableStatusForReferenceResolution(reference.reason, reference.callerAuthorization);
  }

  const trustedStatusReader =
    trustedAdapter === undefined ? createTrustedYouTubeOAuthCredentialSupabaseStatusReader().trustedAdapter : trustedAdapter;
  const trustedTokenMaterialRuntime =
    trustedAdapter === undefined ? createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime() : null;

  return readYouTubeOAuthCredentialStatus({
    credentialReferenceId: reference.credentialReferenceId,
    trustedAdapter: trustedStatusReader ?? null,
    trustedRefreshRuntime:
      trustedTokenMaterialRuntime?.status === "ready"
        ? createTrustedYouTubeOAuthStoredCredentialRefreshRuntime({
            tokenMaterialAdapter: trustedTokenMaterialRuntime.trustedTokenMaterialAdapter
          })
        : null,
    callerAuthorization: reference.callerAuthorization,
    credentialResolutionDisabled: false
  });
}

export function createCommentTranslatorToolCredentialStatusSource(
  status: YouTubeOAuthCredentialBrowserReadableStatus
): CommentTranslatorToolCredentialStatusSource {
  const viewModel = createYouTubeOAuthCredentialStatusUiWiring(status);

  return {
    sourceId: "server-owned-trusted-connected-credential-status",
    statusMetadata: {
      status: viewModel.state,
      provider: "youtube",
      reconnectRequired: status.reconnectRequired,
      scopeLabel: viewModel.scopeLabel,
      expiresAtIso: viewModel.expiresAtIso,
      reason: viewModel.reason,
      payloadBoundary: "sanitized-credential-status-metadata-only"
    },
    clientReadableValues: "sanitized-credential-status-metadata-only",
    storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
    backgroundMonitoring: "not-started-by-connection"
  };
}

function createUnavailableStatusForReferenceResolution(
  reason: YouTubeOAuthCredentialReferenceUnavailableReason,
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization
) {
  if (reason === "credential-resolution-disabled") {
    return readYouTubeOAuthCredentialStatus({
      credentialReferenceId: "credential-resolution-disabled",
      trustedAdapter: null,
      callerAuthorization,
      credentialResolutionDisabled: true
    });
  }

  return createYouTubeOAuthCredentialStatusUnavailablePayload({
    credentialReferenceId: "server-owned-credential-reference-unavailable",
    reason
  });
}

type TrustedYouTubeCredentialStatusAdapter = Pick<TrustedYouTubeOAuthCredentialSupabaseAdapter, "getCredentialStatus">;
