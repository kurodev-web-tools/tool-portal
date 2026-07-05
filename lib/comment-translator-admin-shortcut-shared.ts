export const globalAdminDashboardPath = "/admin";
export const commentTranslatorAdminDashboardPath = "/admin/comment-translator";
export const commentTranslatorAdminShortcutVisibility = "server-allowlisted-admin-only";

export type CommentTranslatorAdminShortcutState =
  | {
      readonly status: "available";
      readonly href: typeof globalAdminDashboardPath;
      readonly label: "Admin dashboard";
      readonly visibility: typeof commentTranslatorAdminShortcutVisibility;
      readonly clientReadableDetail: "sanitized-admin-shortcut-only";
    }
  | {
      readonly status: "hidden";
      readonly visibility: "hidden";
      readonly clientReadableDetail: "sanitized-admin-shortcut-only";
    };

export const commentTranslatorAdminShortcutAvailableState: CommentTranslatorAdminShortcutState = {
  status: "available",
  href: globalAdminDashboardPath,
  label: "Admin dashboard",
  visibility: commentTranslatorAdminShortcutVisibility,
  clientReadableDetail: "sanitized-admin-shortcut-only"
};

export const commentTranslatorAdminShortcutHiddenState: CommentTranslatorAdminShortcutState = {
  status: "hidden",
  visibility: "hidden",
  clientReadableDetail: "sanitized-admin-shortcut-only"
};
