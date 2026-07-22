import { NextResponse, type NextRequest } from "next/server";
import {
  commentTranslatorObsOverlayBrowserSessionCookieName,
  createCommentTranslatorObsOverlayBrowserSessionCookieOptions,
  createExpiredCommentTranslatorObsOverlayBrowserSessionCookieOptions
} from "@/lib/comment-translator-obs-overlay-browser-session-cookie";
import { redeemCommentTranslatorObsOverlayBrowserSession } from "@/lib/comment-translator-obs-overlay-browser-session-runtime";
import { createTrustedCommentTranslatorObsOverlayBrowserSessionStore } from "@/lib/comment-translator-obs-overlay-browser-session-store";
import { createCommentTranslatorObsOverlaySessionAuthority } from "@/lib/comment-translator-obs-overlay-session-authority";
import { createTrustedCommentTranslatorObsOverlayTokenSupabaseStore } from "@/lib/comment-translator-obs-overlay-token-store";
import { createTrustedCommentTranslatorSessionSupabaseStore } from "@/lib/comment-translator-durable-session-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const overlayUrl = new URL("/tools/comment-translator/overlay/", request.url);
  const presentedToken = await readPresentedToken(request);
  const tokenStoreResult = createTrustedCommentTranslatorObsOverlayTokenSupabaseStore();
  const tokenStore = tokenStoreResult.status === "ready" ? tokenStoreResult.store : null;
  const sessionAuthority = createCommentTranslatorObsOverlaySessionAuthority({
    durableSessionStore: createTrustedCommentTranslatorSessionSupabaseStore(),
    tokenStore
  });
  const result = await redeemCommentTranslatorObsOverlayBrowserSession({
    presentedToken,
    sessionAuthority,
    tokenStore,
    browserSessionStore: createTrustedCommentTranslatorObsOverlayBrowserSessionStore(),
    nowMs: Date.now()
  });
  const response = NextResponse.redirect(overlayUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  if (result.status === "ready") {
    response.cookies.set(
      commentTranslatorObsOverlayBrowserSessionCookieName,
      result.capability,
      createCommentTranslatorObsOverlayBrowserSessionCookieOptions(result.expiresAtIso)
    );
  } else {
    response.cookies.set(
      commentTranslatorObsOverlayBrowserSessionCookieName,
      "",
      createExpiredCommentTranslatorObsOverlayBrowserSessionCookieOptions()
    );
  }
  return response;
}

async function readPresentedToken(request: NextRequest): Promise<string> {
  try {
    const formData = await request.formData();
    const value = formData.get("overlayCredential");
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}
