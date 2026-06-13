import "server-only";

import {
  authorizeYouTubeOAuthCredentialStatusCaller,
  createYouTubeOAuthCredentialStatusUnavailablePayload,
  readYouTubeOAuthCredentialStatus,
  type YouTubeOAuthCredentialStatusCallerAuthorization
} from "./comment-translator-youtube-credential-status-boundary";
import {
  createYouTubeAccountIntegrationViewModelFromCredentialStatus,
  type YouTubeAccountIntegrationViewModel
} from "./comment-translator-youtube-account-integration";
import { createYouTubeOAuthCredentialReferenceId } from "./comment-translator-youtube-oauth-token-store-persistence";
import {
  createTrustedYouTubeOAuthCredentialSupabaseStatusReader,
  type TrustedYouTubeOAuthCredentialSupabaseAdapter
} from "./comment-translator-youtube-token-store-supabase-adapter";
import { isYouTubeOAuthCredentialResolutionDisabled } from "./comment-translator-youtube-token-store-runtime";
import type { AccountSessionState } from "./supabase/session";

const credentialReferenceSecretEnv = "YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET";
const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export type YouTubeOAuthCredentialReferenceUnavailableReason =
  | "credential-resolution-disabled"
  | "credential-reference-env-missing"
  | "auth-unavailable"
  | "caller-not-authenticated";

export type YouTubeAccountIntegrationCredentialReferenceResult =
  | {
      status: "ready";
      credentialReferenceId: string;
      callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
    }
  | {
      status: "unavailable";
      reason: YouTubeOAuthCredentialReferenceUnavailableReason;
      callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
    };

export async function readYouTubeAccountIntegrationStatusViewModel({
  accountSession,
  env = process.env,
  trustedAdapter
}: {
  accountSession: AccountSessionState;
  env?: Record<string, string | undefined>;
  trustedAdapter?: Pick<TrustedYouTubeOAuthCredentialSupabaseAdapter, "getCredentialStatus"> | null;
}): Promise<YouTubeAccountIntegrationViewModel> {
  const reference = readYouTubeAccountIntegrationCredentialReference({ accountSession, env });

  if (reference.status === "unavailable") {
    const status =
      reference.reason === "credential-resolution-disabled"
        ? await readYouTubeOAuthCredentialStatus({
            credentialReferenceId: "credential-resolution-disabled",
            trustedAdapter: null,
            callerAuthorization: reference.callerAuthorization,
            credentialResolutionDisabled: true
          })
        : createYouTubeOAuthCredentialStatusUnavailablePayload({
            credentialReferenceId: "credential-reference-unavailable",
            reason:
              reference.reason === "caller-not-authenticated" || reference.reason === "auth-unavailable"
                ? reference.reason
                : "trusted-adapter-not-wired"
          });

    return createYouTubeAccountIntegrationViewModelFromCredentialStatus(status);
  }

  const trustedStatusReader =
    trustedAdapter === undefined ? createTrustedYouTubeOAuthCredentialSupabaseStatusReader().trustedAdapter : trustedAdapter;

  const status = await readYouTubeOAuthCredentialStatus({
    credentialReferenceId: reference.credentialReferenceId,
    trustedAdapter: trustedStatusReader ?? null,
    callerAuthorization: reference.callerAuthorization,
    credentialResolutionDisabled: false
  });

  return createYouTubeAccountIntegrationViewModelFromCredentialStatus(status);
}

export function readYouTubeAccountIntegrationCredentialReference({
  accountSession,
  env = process.env
}: {
  accountSession: AccountSessionState;
  env?: Record<string, string | undefined>;
}): YouTubeAccountIntegrationCredentialReferenceResult {
  const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: accountSession.authStatus === "signed-in" ? accountSession.user?.id ?? null : null,
    authUnavailable: accountSession.authStatus === "unavailable"
  });

  return readYouTubeOAuthCredentialReferenceForCaller({ callerAuthorization, env });
}

export function readYouTubeOAuthCredentialReferenceForCaller({
  callerAuthorization,
  env = process.env
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  env?: Record<string, string | undefined>;
}): YouTubeAccountIntegrationCredentialReferenceResult {
  if (callerAuthorization.status !== "authorized") {
    return {
      status: "unavailable",
      reason: callerAuthorization.reason,
      callerAuthorization
    };
  }

  if (
    isYouTubeOAuthCredentialResolutionDisabled({
      [credentialResolutionDisabledEnv]: env[credentialResolutionDisabledEnv]
    })
  ) {
    return {
      status: "unavailable",
      reason: "credential-resolution-disabled",
      callerAuthorization
    };
  }

  const credentialReferenceSecret = readNonemptyString(env[credentialReferenceSecretEnv]);
  if (!credentialReferenceSecret) {
    return {
      status: "unavailable",
      reason: "credential-reference-env-missing",
      callerAuthorization
    };
  }

  return {
    status: "ready",
    credentialReferenceId: createYouTubeOAuthCredentialReferenceId({
      ownerUserId: callerAuthorization.ownerUserId,
      credentialReferenceSecret
    }),
    callerAuthorization
  };
}

function readNonemptyString(value: string | undefined | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
