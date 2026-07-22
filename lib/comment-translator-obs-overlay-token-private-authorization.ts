import "server-only";

import { createHash } from "node:crypto";
import {
  commentTranslatorObsOverlayScope,
  type CommentTranslatorObsOverlaySessionAuthority,
  type CommentTranslatorObsOverlayTokenPrivateAuthorization,
  type CommentTranslatorObsOverlayTokenPrivateAuthorizationResult,
  type CommentTranslatorObsOverlayTokenStore,
  type CommentTranslatorObsOverlayTokenValidationResult
} from "./comment-translator-obs-overlay-token-types";

export async function resolveCommentTranslatorObsOverlayTokenPrivateAuthorization({
  presentedToken,
  sessionAuthority,
  tokenStore,
  nowMs
}: {
  readonly presentedToken: string;
  readonly sessionAuthority: CommentTranslatorObsOverlaySessionAuthority;
  readonly tokenStore: CommentTranslatorObsOverlayTokenStore | null;
  readonly nowMs: number;
}): Promise<CommentTranslatorObsOverlayTokenPrivateAuthorizationResult> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(presentedToken)) return denied("invalid-token", false);
  if (!tokenStore) return denied("overlay-unavailable", true);
  try {
    const record = await tokenStore.readByDigest({
      tokenDigest: createHash("sha256").update(presentedToken, "utf8").digest("hex"),
      scope: commentTranslatorObsOverlayScope
    });
    if (!record || record.revokedAtIso || Date.parse(record.expiresAtIso) <= nowMs) {
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
    return denied("overlay-unavailable", true);
  }
}

export async function validateCommentTranslatorObsOverlayTokenPrivateAuthorization({
  authorization,
  sessionAuthority,
  tokenStore,
  nowMs
}: {
  readonly authorization: CommentTranslatorObsOverlayTokenPrivateAuthorization;
  readonly sessionAuthority: CommentTranslatorObsOverlaySessionAuthority;
  readonly tokenStore: CommentTranslatorObsOverlayTokenStore | null;
  readonly nowMs: number;
}): Promise<CommentTranslatorObsOverlayTokenValidationResult> {
  if (!tokenStore) return denied("overlay-unavailable", true);
  try {
    const record = await tokenStore.readCurrent({
      ownerUserId: authorization.ownerUserId,
      scope: commentTranslatorObsOverlayScope
    });
    if (!record || record.revokedAtIso || record.version !== authorization.tokenVersion ||
        record.sessionReferenceId !== authorization.sessionReferenceId ||
        record.expiresAtIso !== authorization.expiresAtIso || Date.parse(record.expiresAtIso) <= nowMs) {
      return denied("invalid-token", false);
    }
    const session = await sessionAuthority.readCurrentForOwner(record.ownerUserId);
    if (session.status === "unavailable") return mapUnavailableSession(session.reason);
    if (session.sessionReferenceId !== record.sessionReferenceId || session.expiresAtMs <= nowMs) {
      return denied("invalid-token", false);
    }
    return { status: "authorized", scope: commentTranslatorObsOverlayScope, access: "read-only" };
  } catch {
    return denied("overlay-unavailable", true);
  }
}

function mapUnavailableSession(reason: "active-session-missing" | "session-authority-unavailable") {
  return reason === "session-authority-unavailable"
    ? denied("overlay-unavailable", true)
    : denied("invalid-token", false);
}

function denied(
  reason: Extract<CommentTranslatorObsOverlayTokenValidationResult, { status: "denied" }>["reason"],
  retryable: boolean
): Extract<CommentTranslatorObsOverlayTokenValidationResult, { status: "denied" }> {
  return { status: "denied", reason, retryable };
}
