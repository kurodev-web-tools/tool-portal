import "server-only";

export const commentTranslatorObsOverlayBrowserSessionCookieName = "vst-comment-translator-obs-overlay";

export function createCommentTranslatorObsOverlayBrowserSessionCookieOptions(expiresAtIso: string) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/tools/comment-translator/overlay/",
    expires: new Date(expiresAtIso)
  };
}

export function createExpiredCommentTranslatorObsOverlayBrowserSessionCookieOptions() {
  return {
    ...createCommentTranslatorObsOverlayBrowserSessionCookieOptions(new Date(0).toISOString()),
    maxAge: 0
  };
}
