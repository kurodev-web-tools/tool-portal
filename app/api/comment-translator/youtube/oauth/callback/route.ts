import { NextResponse, type NextRequest } from "next/server";
import {
  buildYouTubeOAuthCallbackRedirect,
  validateYouTubeOAuthCallbackRequest
} from "@/lib/comment-translator-youtube-oauth-connect-callback";
import { readCommentTranslatorPrivateLaunchAccessForAccountSession } from "@/lib/comment-translator-private-launch-access-gate";
import { getAccountSessionState } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const accountSession = await getAccountSessionState();
  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });
  const decision = await validateYouTubeOAuthCallbackRequest({
    requestUrl: request.nextUrl,
    accountSessionUserId: accountSession.user?.id ?? null,
    privateLaunchAllowed: launchAccess.status === "allowed"
  });

  return NextResponse.redirect(buildYouTubeOAuthCallbackRedirect(decision.status, request.nextUrl.origin));
}
