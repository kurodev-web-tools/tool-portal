import { NextResponse, type NextRequest } from "next/server";
import {
  commentTranslatorModeratorShareBrowserSessionCookieName,
  createCommentTranslatorModeratorShareBrowserSessionCookieOptions,
  createExpiredCommentTranslatorModeratorShareBrowserSessionCookieOptions
} from "@/lib/comment-translator-moderator-share-browser-session-cookie";
import { redeemCommentTranslatorModeratorShareBrowserSession } from "@/lib/comment-translator-moderator-share-browser-session-runtime";
import { createTrustedCommentTranslatorModeratorShareBrowserSessionStore } from "@/lib/comment-translator-moderator-share-browser-session-store";
import { createCommentTranslatorModeratorShareSessionAuthority } from "@/lib/comment-translator-moderator-share-session-authority";
import { createTrustedCommentTranslatorModeratorShareTokenSupabaseStore } from "@/lib/comment-translator-moderator-share-token-store";
import { createTrustedCommentTranslatorSessionSupabaseStore } from "@/lib/comment-translator-durable-session-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const moderatorUrl = new URL("/tools/comment-translator/moderator/", request.url);
  const presentedToken = await readPresentedToken(request);
  const tokenStoreResult = createTrustedCommentTranslatorModeratorShareTokenSupabaseStore();
  const tokenStore = tokenStoreResult.status === "ready" ? tokenStoreResult.store : null;
  const sessionAuthority = createCommentTranslatorModeratorShareSessionAuthority({
    durableSessionStore: createTrustedCommentTranslatorSessionSupabaseStore(),
    tokenStore
  });
  const result = await redeemCommentTranslatorModeratorShareBrowserSession({
    presentedToken,
    sessionAuthority,
    tokenStore,
    browserSessionStore: createTrustedCommentTranslatorModeratorShareBrowserSessionStore(),
    nowMs: Date.now()
  });
  const response = NextResponse.redirect(moderatorUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  if (result.status === "ready") {
    response.cookies.set(
      commentTranslatorModeratorShareBrowserSessionCookieName,
      result.capability,
      createCommentTranslatorModeratorShareBrowserSessionCookieOptions(result.expiresAtIso)
    );
  } else {
    response.cookies.set(
      commentTranslatorModeratorShareBrowserSessionCookieName,
      "",
      createExpiredCommentTranslatorModeratorShareBrowserSessionCookieOptions()
    );
  }
  return response;
}

async function readPresentedToken(request: NextRequest): Promise<string> {
  try {
    const formData = await request.formData();
    const value = formData.get("moderatorShareCredential");
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}
