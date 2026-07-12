import "server-only";

import { createHash } from "node:crypto";
import {
  commentTranslatorAdminShortcutAvailableState,
  commentTranslatorAdminShortcutHiddenState,
  type CommentTranslatorAdminShortcutState
} from "./comment-translator-admin-shortcut-shared";
import type { AccountSessionState } from "./supabase/session";

export type CommentTranslatorAdminAccount =
  | {
      readonly status: "authenticated";
      readonly ownerUserId: string;
    }
  | {
      readonly status: "unauthenticated";
      readonly reason: "auth-unavailable" | "caller-not-authenticated";
    };

export type CommentTranslatorAdminAccess =
  | {
      readonly status: "allowed";
      readonly access: "admin-allowlist";
      readonly browserReadableOutput: "sanitized-admin-access-metadata-only";
    }
  | {
      readonly status: "blocked";
      readonly reason: "auth-unavailable" | "caller-not-authenticated" | "admin-allowlist";
      readonly access: "blocked";
      readonly browserReadableOutput: "sanitized-admin-access-metadata-only";
      readonly privateIdentifiers: "not-returned-by-design";
    };

export type CommentTranslatorAdminAccessEnv = Record<string, string | undefined>;

export const commentTranslatorAdminAccessGateContract = {
  implementationStage: "comment-translator-admin-access-gate",
  runtime: "server-only",
  allowlistEnv: "COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES",
  allowlistPolicy: "sha256-owner-user-id-allowlist",
  defaultAccess: "blocked",
  gatedSurfaces: ["/admin", "/admin/comment-translator", "/admin/comment-translator/creator-waitlist"],
  browserReadableOutput: "sanitized-admin-access-metadata-only",
  forbiddenReadableOutput: [
    "owner-user-id-value",
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "liveChatId-value"
  ]
} as const;

const adminAllowedHashesEnv = "COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES";
const sha256HexPattern = /^[a-f0-9]{64}$/;

export function createCommentTranslatorAdminUserHash(ownerUserId: string): string {
  return createHash("sha256").update(ownerUserId).digest("hex");
}

export function readCommentTranslatorAdminAccess({
  account,
  env = process.env
}: {
  readonly account: CommentTranslatorAdminAccount;
  readonly env?: CommentTranslatorAdminAccessEnv;
}): CommentTranslatorAdminAccess {
  if (account.status !== "authenticated") {
    return createBlockedAdminAccess(account.reason);
  }

  const allowedHashes = readAllowedAdminHashes(env);
  const callerHash = createCommentTranslatorAdminUserHash(account.ownerUserId);

  if (allowedHashes.has(callerHash)) {
    return {
      status: "allowed",
      access: "admin-allowlist",
      browserReadableOutput: "sanitized-admin-access-metadata-only"
    };
  }

  return createBlockedAdminAccess("admin-allowlist");
}

export function readCommentTranslatorAdminShortcutStateForAccountSession({
  accountSession,
  env = process.env
}: {
  readonly accountSession: AccountSessionState;
  readonly env?: CommentTranslatorAdminAccessEnv;
}): CommentTranslatorAdminShortcutState {
  const access = readCommentTranslatorAdminAccess({
    account: createCommentTranslatorAdminAccountFromSession(accountSession),
    env
  });

  return access.status === "allowed" ? commentTranslatorAdminShortcutAvailableState : commentTranslatorAdminShortcutHiddenState;
}

export function readCommentTranslatorAdminAccessForAccountSession({
  accountSession,
  env = process.env
}: {
  readonly accountSession: AccountSessionState;
  readonly env?: CommentTranslatorAdminAccessEnv;
}): CommentTranslatorAdminAccess {
  return readCommentTranslatorAdminAccess({
    account: createCommentTranslatorAdminAccountFromSession(accountSession),
    env
  });
}

function createCommentTranslatorAdminAccountFromSession(accountSession: AccountSessionState): CommentTranslatorAdminAccount {
  if (accountSession.authStatus === "signed-in" && accountSession.user?.id) {
    return {
      status: "authenticated",
      ownerUserId: accountSession.user.id
    };
  }

  return {
    status: "unauthenticated",
    reason: accountSession.authStatus === "unavailable" ? "auth-unavailable" : "caller-not-authenticated"
  };
}

function createBlockedAdminAccess(reason: Extract<CommentTranslatorAdminAccess, { readonly status: "blocked" }>["reason"]) {
  return {
    status: "blocked",
    reason,
    access: "blocked",
    browserReadableOutput: "sanitized-admin-access-metadata-only",
    privateIdentifiers: "not-returned-by-design"
  } as const;
}

function readAllowedAdminHashes(env: CommentTranslatorAdminAccessEnv) {
  return new Set(
    (env[adminAllowedHashesEnv] ?? "")
      .split(/[\s,]+/)
      .map((value) => value.trim().toLowerCase())
      .filter((value) => sha256HexPattern.test(value))
  );
}
