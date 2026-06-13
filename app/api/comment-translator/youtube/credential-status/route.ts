import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeYouTubeOAuthCredentialStatusCaller,
  createYouTubeOAuthCredentialStatusUnavailablePayload,
  type YouTubeOAuthCredentialStatusCallerAuthorization,
  readYouTubeOAuthCredentialStatus
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import { createTrustedYouTubeOAuthCredentialSupabaseStatusReader } from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";
import { readCommentTranslatorPrivateLaunchAccess } from "@/lib/comment-translator-private-launch-access-gate";
import {
  assertCommentTranslatorAbuseRequestAllowed,
  readCommentTranslatorRequestIp
} from "@/lib/comment-translator-abuse-rate-limit-runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const callerAuthorization = await readCallerAuthorization();
  const requestIp = readCommentTranslatorRequestIp(request.headers);
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "/api/comment-translator/youtube/credential-status",
    action: "credential-status",
    callerAuthorization,
    requestIp
  });
  if (abuseCheck.status === "blocked") {
    return NextResponse.json(
      {
        ...createYouTubeOAuthCredentialStatusUnavailablePayload({
          credentialReferenceId,
          reason: "private-launch-gated"
        }),
        rateLimit: "exceeded",
        rateLimitReason: abuseCheck.reason,
        retryAfterSeconds: abuseCheck.retryAfterSeconds
      },
      { status: 429 }
    );
  }

  const launchAccess = readCommentTranslatorPrivateLaunchAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    const privateLaunchAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization,
      requestIp
    });
    if (privateLaunchAbuseCheck.status === "blocked") {
      return NextResponse.json(
        {
          ...createYouTubeOAuthCredentialStatusUnavailablePayload({
            credentialReferenceId,
            reason: "private-launch-gated"
          }),
          rateLimit: "exceeded",
          rateLimitReason: privateLaunchAbuseCheck.reason,
          retryAfterSeconds: privateLaunchAbuseCheck.retryAfterSeconds
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      createYouTubeOAuthCredentialStatusUnavailablePayload({
        credentialReferenceId,
        reason: "private-launch-gated"
      }),
      { status: 403 }
    );
  }

  const trustedStatusReader =
    credentialResolutionDisabled || callerAuthorization.status !== "authorized"
      ? null
      : createTrustedYouTubeOAuthCredentialSupabaseStatusReader();

  const status = await readYouTubeOAuthCredentialStatus({
    credentialReferenceId,
    trustedAdapter: trustedStatusReader?.trustedAdapter ?? null,
    callerAuthorization,
    credentialResolutionDisabled
  });

  return NextResponse.json(status);
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
