"use server";

import { assertCommentTranslatorAbuseRequestAllowed } from "@/lib/comment-translator-abuse-rate-limit-runtime";
import { readYouTubeOAuthCredentialReferenceForCaller } from "@/lib/comment-translator-youtube-account-integration-status";
import {
  createYouTubeOAuthCredentialStatusUnavailablePayload
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import {
  createYouTubeOAuthCredentialDisconnectUnavailablePayload,
  readYouTubeOAuthCredentialDisconnectResult
} from "@/lib/comment-translator-youtube-disconnect-runtime";
import { readCommentTranslatorPrivateLaunchAccess } from "@/lib/comment-translator-private-launch-access-gate";
import {
  createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime
} from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";
import { readCommentTranslatorToolCredentialStatus } from "@/lib/comment-translator-youtube-tool-credential-source";
import { readCommentTranslatorActionCallerAuthorization } from "./action-context";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export async function getYouTubeOAuthCredentialStatusAction() {
  const callerAuthorization = await readCommentTranslatorActionCallerAuthorization();
  const actionAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action: "credential-status",
    callerAuthorization
  });
  if (actionAbuseCheck.status === "blocked") return unavailableCredentialStatus();
  const launchAccess = readCommentTranslatorPrivateLaunchAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization
    });
    return unavailableCredentialStatus();
  }
  return readCommentTranslatorToolCredentialStatus({ callerAuthorization });
}

export async function disconnectYouTubeOAuthCredentialAction() {
  const callerAuthorization = await readCommentTranslatorActionCallerAuthorization();
  const actionAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action: "credential-disconnect",
    callerAuthorization
  });
  if (actionAbuseCheck.status === "blocked") return unavailableDisconnect("private-launch-gated");
  const launchAccess = readCommentTranslatorPrivateLaunchAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization
    });
    return unavailableDisconnect("private-launch-gated");
  }
  const credentialReference = readYouTubeOAuthCredentialReferenceForCaller({ callerAuthorization });
  if (credentialReference.status === "unavailable") {
    const reason = credentialReference.reason === "credential-reference-env-missing"
      ? "credential-reference-env-missing"
      : credentialReference.reason === "credential-resolution-disabled"
        ? "credential-resolution-disabled"
        : credentialReference.reason;
    return unavailableDisconnect(reason);
  }
  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const trustedDisconnectRuntime = credentialResolutionDisabled || callerAuthorization.status !== "authorized"
    ? null
    : createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime();
  return readYouTubeOAuthCredentialDisconnectResult({
    credentialReferenceId: credentialReference.credentialReferenceId,
    trustedDisconnectAdapter: trustedDisconnectRuntime?.trustedDisconnectAdapter ?? null,
    callerAuthorization,
    credentialResolutionDisabled
  });
}

function unavailableCredentialStatus() {
  return createYouTubeOAuthCredentialStatusUnavailablePayload({
    credentialReferenceId: "server-owned-credential-reference-unavailable",
    reason: "private-launch-gated"
  });
}

function unavailableDisconnect(
  reason: Parameters<typeof createYouTubeOAuthCredentialDisconnectUnavailablePayload>[0]["reason"]
) {
  return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
    credentialReferenceId: "server-owned-credential-reference-unavailable",
    reason
  });
}
