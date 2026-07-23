import "server-only";

export const commentTranslatorModeratorShareBrowserSessionCookieName =
  "vst-comment-translator-moderator-share";

export function createCommentTranslatorModeratorShareBrowserSessionCookieOptions(expiresAtIso: string) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: true,
    path: "/tools/comment-translator/moderator/",
    expires: new Date(expiresAtIso)
  };
}

export function createExpiredCommentTranslatorModeratorShareBrowserSessionCookieOptions() {
  return {
    ...createCommentTranslatorModeratorShareBrowserSessionCookieOptions(new Date(0).toISOString()),
    maxAge: 0
  };
}
