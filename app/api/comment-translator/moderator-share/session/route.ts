import { NextResponse, type NextRequest } from "next/server";
import {
  commentTranslatorCreatorModeratorBrowserSessionCookieName,
  createCommentTranslatorCreatorModeratorBrowserSessionCookieOptions,
  createExpiredCommentTranslatorCreatorModeratorBrowserSessionCookieOptions
} from "@/lib/comment-translator-creator-moderator-browser-session-cookie";
import {
  redeemCommentTranslatorCreatorModeratorBrowserSession
} from "@/lib/comment-translator-creator-moderator-browser-session-runtime";
import {
  createTrustedCommentTranslatorCreatorModeratorBrowserSessionStore
} from "@/lib/comment-translator-creator-moderator-browser-session-store";
import {
  isCommentTranslatorCreatorModeratorBrowserRouteClosed
} from "@/lib/comment-translator-creator-moderator-session-authority";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const moderatorUrl = new URL("/tools/comment-translator/moderator/", request.url);
  if (isCommentTranslatorCreatorModeratorBrowserRouteClosed()) {
    return redirectWithExpiredCapability(moderatorUrl);
  }
  const browserSessionStoreResult = createTrustedCommentTranslatorCreatorModeratorBrowserSessionStore();
  const result = await redeemCommentTranslatorCreatorModeratorBrowserSession({
    presentedToken: await readPresentedToken(request),
    browserSessionStore: browserSessionStoreResult.status === "ready" ? browserSessionStoreResult.store : null,
    nowMs: Date.now()
  });
  const response = NextResponse.redirect(moderatorUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  if (result.status === "ready") {
    response.cookies.set(
      commentTranslatorCreatorModeratorBrowserSessionCookieName,
      result.capability,
      createCommentTranslatorCreatorModeratorBrowserSessionCookieOptions(result.expiresAtIso)
    );
  } else {
    response.cookies.set(
      commentTranslatorCreatorModeratorBrowserSessionCookieName,
      "",
      createExpiredCommentTranslatorCreatorModeratorBrowserSessionCookieOptions()
    );
  }
  return response;
}

function redirectWithExpiredCapability(moderatorUrl: URL) {
  const response = NextResponse.redirect(moderatorUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(
    commentTranslatorCreatorModeratorBrowserSessionCookieName,
    "",
    createExpiredCommentTranslatorCreatorModeratorBrowserSessionCookieOptions()
  );
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
