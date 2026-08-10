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
import {
  commentTranslatorCreatorObsOverlayTemplateCookieName,
  createCommentTranslatorCreatorObsOverlayTemplateCookieOptions,
  createExpiredCommentTranslatorCreatorObsOverlayTemplateCookieOptions,
  isCommentTranslatorCreatorObsOverlayTemplate,
  readCommentTranslatorCreatorObsOverlayTemplate
} from "@/lib/comment-translator-creator-obs-overlay-template";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const overlayUrl = new URL("/tools/comment-translator/overlay/", request.url);
  if (isCommentTranslatorCreatorObsOverlayBrowserRouteClosed()) {
    return redirectWithExpiredCapability(overlayUrl);
  }
  const browserSessionStoreResult = createTrustedCommentTranslatorCreatorObsOverlayBrowserSessionStore();
  const form = await readForm(request);
  const result = await redeemCommentTranslatorCreatorObsOverlayBrowserSession({
    presentedToken: form.overlayCredential,
    browserSessionStore: browserSessionStoreResult.status === "ready" ? browserSessionStoreResult.store : null,
    nowMs: Date.now()
  });
  const response = NextResponse.redirect(overlayUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  if (result.status === "ready") {
    const overlayTemplate = isCommentTranslatorCreatorObsOverlayTemplate(form.overlayTemplate)
      ? form.overlayTemplate
      : readCommentTranslatorCreatorObsOverlayTemplate(form.overlayTemplate);
    response.cookies.set(
      commentTranslatorCreatorObsOverlayBrowserSessionCookieName,
      result.capability,
      createCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions(result.expiresAtIso)
    );
    response.cookies.set(
      commentTranslatorCreatorObsOverlayTemplateCookieName,
      overlayTemplate,
      createCommentTranslatorCreatorObsOverlayTemplateCookieOptions(result.expiresAtIso)
    );
  } else {
    expireOverlayCookies(response);
  }
  return response;
}

function redirectWithExpiredCapability(overlayUrl: URL) {
  const response = NextResponse.redirect(overlayUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  expireOverlayCookies(response);
  return response;
}

async function readForm(request: NextRequest): Promise<{ overlayCredential: string; overlayTemplate: unknown }> {
  try {
    const formData = await request.formData();
    const credential = formData.get("overlayCredential");
    const overlayTemplate = formData.get("overlayTemplate");
    return {
      overlayCredential: typeof credential === "string" ? credential.trim() : "",
      overlayTemplate: typeof overlayTemplate === "string" ? overlayTemplate.trim() : null
    };
  } catch {
    return { overlayCredential: "", overlayTemplate: null };
  }
}

function expireOverlayCookies(response: NextResponse) {
  response.cookies.set(
    commentTranslatorCreatorObsOverlayBrowserSessionCookieName,
    "",
    createExpiredCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions()
  );
  response.cookies.set(
    commentTranslatorCreatorObsOverlayTemplateCookieName,
    "",
    createExpiredCommentTranslatorCreatorObsOverlayTemplateCookieOptions()
  );
}
