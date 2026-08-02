import { NextResponse, type NextRequest } from "next/server";
import {
  commentTranslatorCreatorObsOverlayBrowserSessionCookieName,
  createCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions,
  createExpiredCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions
} from "@/lib/comment-translator-creator-obs-overlay-browser-session-cookie";
import {
  redeemCommentTranslatorCreatorObsOverlayBrowserSession
} from "@/lib/comment-translator-creator-obs-overlay-browser-session-runtime";
import {
  createTrustedCommentTranslatorCreatorObsOverlayBrowserSessionStore
} from "@/lib/comment-translator-creator-obs-overlay-browser-session-store";
import {
  isCommentTranslatorCreatorObsOverlayBrowserRouteClosed
} from "@/lib/comment-translator-creator-obs-overlay-session-authority";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const overlayUrl = new URL("/tools/comment-translator/overlay/", request.url);
  if (isCommentTranslatorCreatorObsOverlayBrowserRouteClosed()) {
    return redirectWithExpiredCapability(overlayUrl);
  }
  const browserSessionStoreResult = createTrustedCommentTranslatorCreatorObsOverlayBrowserSessionStore();
  const result = await redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: await readPresentedToken(request),
    browserSessionStore: browserSessionStoreResult.status === "ready" ? browserSessionStoreResult.store : null,
    nowMs: Date.now()
  });
  const response = NextResponse.redirect(overlayUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  if (result.status === "ready") {
    response.cookies.set(
      commentTranslatorCreatorObsOverlayBrowserSessionCookieName,
      result.capability,
      createCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions(result.expiresAtIso)
    );
  } else {
    response.cookies.set(
      commentTranslatorCreatorObsOverlayBrowserSessionCookieName,
      "",
      createExpiredCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions()
    );
  }
  return response;
}

function redirectWithExpiredCapability(overlayUrl: URL) {
  const response = NextResponse.redirect(overlayUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(
    commentTranslatorCreatorObsOverlayBrowserSessionCookieName,
    "",
    createExpiredCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions()
  );
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
