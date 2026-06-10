import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeYouTubeOAuthCredentialStatusCaller,
  type YouTubeOAuthCredentialStatusCallerAuthorization
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import {
  createYouTubeOAuthCredentialDisconnectUnavailablePayload,
  readYouTubeOAuthCredentialDisconnectResult
} from "@/lib/comment-translator-youtube-disconnect-runtime";
import { createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime } from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export async function POST(request: NextRequest) {
  const credentialReferenceId = await readCredentialReferenceId(request);

  if (!credentialReferenceId) {
    return NextResponse.json(
      createYouTubeOAuthCredentialDisconnectUnavailablePayload({
        credentialReferenceId: "missing-credential-reference",
        reason: "trusted-disconnect-adapter-not-wired"
      }),
      { status: 400 }
    );
  }

  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const callerAuthorization = credentialResolutionDisabled
    ? authorizeYouTubeOAuthCredentialStatusCaller({ callerUserId: null })
    : await readCallerAuthorization();
  const trustedDisconnectRuntime =
    credentialResolutionDisabled || callerAuthorization.status !== "authorized"
      ? null
      : createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime();

  const disconnectResult = await readYouTubeOAuthCredentialDisconnectResult({
    credentialReferenceId,
    trustedDisconnectAdapter: trustedDisconnectRuntime?.trustedDisconnectAdapter ?? null,
    callerAuthorization,
    credentialResolutionDisabled
  });

  return NextResponse.json(disconnectResult);
}

async function readCredentialReferenceId(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { credentialReferenceId?: unknown };
      return typeof body.credentialReferenceId === "string" && body.credentialReferenceId.trim()
        ? body.credentialReferenceId.trim()
        : null;
    } catch {
      return null;
    }
  }

  try {
    const formData = await request.formData();
    const value = formData.get("credentialReferenceId");
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

async function readCallerAuthorization(): Promise<YouTubeOAuthCredentialStatusCallerAuthorization> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: null,
      authUnavailable: true
    });
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: error ? null : user?.id ?? null,
      authUnavailable: Boolean(error)
    });
  } catch {
    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: null,
      authUnavailable: true
    });
  }
}
