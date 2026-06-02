import { NextResponse, type NextRequest } from "next/server";
import {
  createYouTubeOAuthCredentialStatusUnavailablePayload,
  readYouTubeOAuthCredentialStatus
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import { createTrustedYouTubeOAuthCredentialSupabaseStatusReader } from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";

export const dynamic = "force-dynamic";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const credentialReferenceId = requestUrl.searchParams.get("credentialReferenceId")?.trim();

  if (!credentialReferenceId) {
    return NextResponse.json(
      createYouTubeOAuthCredentialStatusUnavailablePayload({
        credentialReferenceId: "missing-credential-reference",
        reason: "trusted-adapter-not-wired"
      }),
      { status: 400 }
    );
  }

  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const trustedStatusReader = credentialResolutionDisabled
    ? null
    : createTrustedYouTubeOAuthCredentialSupabaseStatusReader();

  const status = await readYouTubeOAuthCredentialStatus({
    credentialReferenceId,
    trustedAdapter: trustedStatusReader?.trustedAdapter ?? null,
    credentialResolutionDisabled
  });

  return NextResponse.json(status);
}
