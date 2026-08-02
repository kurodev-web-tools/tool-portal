import "server-only";

export const commentTranslatorCreatorModeratorBrowserSessionCookieName = "vst-comment-translator-creator-moderator";

export function createCommentTranslatorCreatorModeratorBrowserSessionCookieOptions(expiresAtIso: string) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: true,
    path: "/tools/comment-translator/moderator/",
    expires: new Date(expiresAtIso)
  };
}

export function createExpiredCommentTranslatorCreatorModeratorBrowserSessionCookieOptions() {
  return {
    ...createCommentTranslatorCreatorModeratorBrowserSessionCookieOptions(new Date(0).toISOString()),
    maxAge: 0
  };
}
