"use server";

import {
  createYouTubeOAuthCredentialStatusUnavailablePayload,
  readYouTubeOAuthCredentialStatus
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import { createTrustedYouTubeOAuthCredentialSupabaseStatusReader } from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

function readCredentialReferenceId(formData: FormData) {
  const value = formData.get("credentialReferenceId");
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function getYouTubeOAuthCredentialStatusAction(formData: FormData) {
  const credentialReferenceId = readCredentialReferenceId(formData);

  if (!credentialReferenceId) {
    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId: "missing-credential-reference",
      reason: "trusted-adapter-not-wired"
    });
  }

  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const trustedStatusReader = credentialResolutionDisabled
    ? null
    : createTrustedYouTubeOAuthCredentialSupabaseStatusReader();

  return readYouTubeOAuthCredentialStatus({
    credentialReferenceId,
    trustedAdapter: trustedStatusReader?.trustedAdapter ?? null,
    credentialResolutionDisabled
  });
}
