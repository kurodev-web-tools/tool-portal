import "server-only";

export const commentTranslatorCreatorObsOverlayBrowserSessionCookieName = "vst-comment-translator-creator-obs-overlay";

export function createCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions(expiresAtIso: string) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/tools/comment-translator/overlay/",
    expires: new Date(expiresAtIso)
  };
}

export function createExpiredCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions() {
  return {
    ...createCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions(new Date(0).toISOString()),
    maxAge: 0
  };
}
