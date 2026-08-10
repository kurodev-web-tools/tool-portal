import "server-only";

export const commentTranslatorCreatorObsOverlayTemplateValues = [
  "default",
  "compact",
  "high-contrast"
] as const;

export type CommentTranslatorCreatorObsOverlayTemplate =
  (typeof commentTranslatorCreatorObsOverlayTemplateValues)[number];

export const commentTranslatorCreatorObsOverlayTemplateDefault: CommentTranslatorCreatorObsOverlayTemplate = "default";
export const commentTranslatorCreatorObsOverlayTemplateCookieName = "vst-comment-translator-creator-obs-overlay-template";

export const commentTranslatorCreatorObsOverlayTemplateContract = {
  implementationStage: "nc-x4-static-overlay-templates",
  values: commentTranslatorCreatorObsOverlayTemplateValues,
  defaultTemplate: commentTranslatorCreatorObsOverlayTemplateDefault,
  browserAuthority: "forbidden",
  storage: "overlay-path-http-only-secure-samesite-strict-cookie",
  expiryAuthority: "existing-overlay-session-expiry",
  feedProjection: "unchanged-safe-feed-and-nc-v1-priority"
} as const;

export function isCommentTranslatorCreatorObsOverlayTemplate(
  value: unknown
): value is CommentTranslatorCreatorObsOverlayTemplate {
  return typeof value === "string" && (commentTranslatorCreatorObsOverlayTemplateValues as readonly string[]).includes(value);
}

export function readCommentTranslatorCreatorObsOverlayTemplate(
  value: unknown
): CommentTranslatorCreatorObsOverlayTemplate {
  try {
    return isCommentTranslatorCreatorObsOverlayTemplate(value)
      ? value
      : commentTranslatorCreatorObsOverlayTemplateDefault;
  } catch {
    return commentTranslatorCreatorObsOverlayTemplateDefault;
  }
}

export function createCommentTranslatorCreatorObsOverlayTemplateCookieOptions(expiresAtIso: string) {
  const expires = readTemplateCookieExpiry(expiresAtIso);
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: true,
    path: "/tools/comment-translator/overlay/",
    expires
  };
}

export function createExpiredCommentTranslatorCreatorObsOverlayTemplateCookieOptions() {
  return {
    ...createCommentTranslatorCreatorObsOverlayTemplateCookieOptions(new Date(0).toISOString()),
    maxAge: 0
  };
}

function readTemplateCookieExpiry(expiresAtIso: string): Date {
  const expires = new Date(expiresAtIso);
  return Number.isFinite(expires.getTime()) ? expires : new Date(0);
}
