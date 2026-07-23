import "server-only";

import { createHash } from "node:crypto";
import {
  commentTranslatorModeratorShareScope,
  type CommentTranslatorModeratorShareSessionAuthority,
  type CommentTranslatorModeratorShareTokenPrivateAuthorization,
  type CommentTranslatorModeratorShareTokenPrivateAuthorizationResult,
  type CommentTranslatorModeratorShareTokenStore,
  type CommentTranslatorModeratorShareTokenValidationResult
} from "./comment-translator-moderator-share-token-types";

export async function resolveCommentTranslatorModeratorShareTokenPrivateAuthorization({
  presentedToken,
  sessionAuthority,
  tokenStore,
  nowMs
}: {
  readonly presentedToken: string;
  readonly sessionAuthority: CommentTranslatorModeratorShareSessionAuthority;
  readonly tokenStore: CommentTranslatorModeratorShareTokenStore | null;
  readonly nowMs: number;
}): Promise<CommentTranslatorModeratorShareTokenPrivateAuthorizationResult> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(presentedToken)) return denied("invalid-token", false);
  if (!tokenStore) return denied("moderator-share-unavailable", true);

  try {
    const record = await tokenStore.readByDigest({
      tokenDigest: createHash("sha256").update(presentedToken, "utf8").digest("hex"),
      scope: commentTranslatorModeratorShareScope
    });
    if (
      !record || record.scope !== commentTranslatorModeratorShareScope || record.revokedAtIso ||
      Date.parse(record.expiresAtIso) <= nowMs
    ) {
      return denied("invalid-token", false);
    }
    const session = await sessionAuthority.readCurrentForOwner(record.ownerUserId);
    if (session.status === "unavailable") return mapUnavailableSession(session.reason);
    if (session.sessionReferenceId !== record.sessionReferenceId || session.expiresAtMs <= nowMs) {
      return denied("invalid-token", false);
    }
    return {
      status: "authorized",
      ownerUserId: record.ownerUserId,
      sessionReferenceId: record.sessionReferenceId,
      tokenVersion: record.version,
      expiresAtIso: record.expiresAtIso
    };
  } catch {
    return denied("moderator-share-unavailable", true);
  }
}

export async function validateCommentTranslatorModeratorShareTokenPrivateAuthorization({
  authorization,
  sessionAuthority,
  tokenStore,
  nowMs
}: {
  readonly authorization: CommentTranslatorModeratorShareTokenPrivateAuthorization;
  readonly sessionAuthority: CommentTranslatorModeratorShareSessionAuthority;
  readonly tokenStore: CommentTranslatorModeratorShareTokenStore | null;
  readonly nowMs: number;
}): Promise<CommentTranslatorModeratorShareTokenValidationResult> {
  if (!tokenStore) return denied("moderator-share-unavailable", true);

  try {
    const record = await tokenStore.readCurrent({
      ownerUserId: authorization.ownerUserId,
      scope: commentTranslatorModeratorShareScope
    });
    if (
      !record || record.scope !== commentTranslatorModeratorShareScope || record.revokedAtIso ||
      record.version !== authorization.tokenVersion ||
      record.sessionReferenceId !== authorization.sessionReferenceId ||
      record.expiresAtIso !== authorization.expiresAtIso || Date.parse(record.expiresAtIso) <= nowMs
    ) {
      return denied("invalid-token", false);
    }
    const session = await sessionAuthority.readCurrentForOwner(record.ownerUserId);
    if (session.status === "unavailable") return mapUnavailableSession(session.reason);
    if (session.sessionReferenceId !== record.sessionReferenceId || session.expiresAtMs <= nowMs) {
      return denied("invalid-token", false);
    }
    return { status: "authorized", scope: commentTranslatorModeratorShareScope, access: "read-only" };
  } catch {
    return denied("moderator-share-unavailable", true);
  }
}

function mapUnavailableSession(reason: "active-session-missing" | "session-authority-unavailable") {
  return reason === "session-authority-unavailable"
    ? denied("moderator-share-unavailable", true)
    : denied("invalid-token", false);
}

function denied(
  reason: Extract<CommentTranslatorModeratorShareTokenValidationResult, { status: "denied" }>["reason"],
  retryable: boolean
): Extract<CommentTranslatorModeratorShareTokenValidationResult, { status: "denied" }> {
  return { status: "denied", reason, retryable };
}
