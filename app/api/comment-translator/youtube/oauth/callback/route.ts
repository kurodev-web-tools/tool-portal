import { NextResponse, type NextRequest } from "next/server";
import {
  buildYouTubeOAuthCallbackRedirect,
  validateYouTubeOAuthCallbackRequest
} from "@/lib/comment-translator-youtube-oauth-connect-callback";
import { persistYouTubeOAuthCallbackCredential } from "@/lib/comment-translator-youtube-oauth-token-store-persistence";
import { readCommentTranslatorFreeBetaRuntimeAccessForAccountSession } from "@/lib/comment-translator-private-launch-access-gate";
import { createTrustedYouTubeOAuthCredentialSupabasePersistenceRuntime } from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { getAccountSessionState } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const accountSession = await getAccountSessionState();
  const launchAccess = readCommentTranslatorFreeBetaRuntimeAccessForAccountSession({ accountSession });
  const decision = await validateYouTubeOAuthCallbackRequest({
    requestUrl: request.nextUrl,
    accountSessionUserId: accountSession.user?.id ?? null,
    privateLaunchAllowed: launchAccess.status === "allowed"
  });

  let status = decision.status;

  if (decision.status === "youtube-oauth-token-store-blocked" && accountSession.user) {
    const trustedPersistenceRuntime = createTrustedYouTubeOAuthCredentialSupabasePersistenceRuntime();
    const persistence = await persistYouTubeOAuthCallbackCredential({
      authorizationCode: request.nextUrl.searchParams.get("code"),
      ownerAuthorization: {
        status: "authorized",
        ownerUserId: accountSession.user.id
      },
      intent: decision.intent ?? "connect",
      trustedStore: trustedPersistenceRuntime.status === "ready" ? trustedPersistenceRuntime.trustedStore : null,
      missingTrustedStoreReferences:
        trustedPersistenceRuntime.status === "unavailable" ? trustedPersistenceRuntime.missingEnvReferences : []
    });
    status = persistence.status;
  }

  return NextResponse.redirect(buildYouTubeOAuthCallbackRedirect(status, request.nextUrl.origin));
}
