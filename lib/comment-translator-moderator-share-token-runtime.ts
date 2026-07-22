import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import {
  commentTranslatorModeratorShareScope,
  type CommentTranslatorModeratorShareSessionAuthority,
  type CommentTranslatorModeratorShareTokenIssueResult,
  type CommentTranslatorModeratorShareTokenReadResult,
  type CommentTranslatorModeratorShareTokenRecord,
  type CommentTranslatorModeratorShareTokenRevokeResult,
  type CommentTranslatorModeratorShareTokenStore,
  type CommentTranslatorModeratorShareTokenUnavailableReason,
  type CommentTranslatorModeratorShareTokenUnavailableResult,
  type CommentTranslatorModeratorShareTokenValidationResult
} from "./comment-translator-moderator-share-token-types";

export const commentTranslatorModeratorShareTokenContract = {
  implementationStage: "creator-closed-beta-c7-moderator-share-token-runtime",
  runtime: "server-only",
  scope: commentTranslatorModeratorShareScope,
  access: "read-only",
  tokenFormat: "opaque-32-byte-base64url",
  plaintextPersistence: "forbidden-digest-only",
  digestAlgorithm: "sha256",
  expiryAuthority: "authoritative-session-expiry",
  currentTokenSemantics: "one-current-token-per-owner-and-scope",
  reissueSemantics: "allowed-after-revocation-or-expiry",
  browserReadableOutput: "plaintext-on-authenticated-issue-only",
  moderatorIdentityAuthority: "not-established-by-token",
  publicRoute: "not-implemented-c8",
  obsOverlayInteroperability: "forbidden"
} as const;

type AuthenticatedRequest = {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly sessionAuthority: CommentTranslatorModeratorShareSessionAuthority;
  readonly tokenStore: CommentTranslatorModeratorShareTokenStore | null;
  readonly nowMs: number;
};

export async function issueCommentTranslatorModeratorShareToken(
  request: AuthenticatedRequest
): Promise<CommentTranslatorModeratorShareTokenIssueResult> {
  const ownerUserId = authorizedOwner(request.callerAuthorization);
  if (!ownerUserId) return unavailable("auth-unavailable", false);
  if (!request.tokenStore) return unavailable("token-store-unavailable", true);

  try {
    const session = await request.sessionAuthority.readCurrentForOwner(ownerUserId);
    if (session.status === "unavailable") {
      return unavailable("active-session-unavailable", session.reason === "session-authority-unavailable");
    }
    if (session.expiresAtMs <= request.nowMs) return unavailable("active-session-unavailable", false);

    const token = randomBytes(32).toString("base64url");
    const result = await request.tokenStore.writeCurrent({
      record: {
        ownerUserId,
        sessionReferenceId: session.sessionReferenceId,
        scope: commentTranslatorModeratorShareScope,
        tokenDigest: digestToken(token),
        issuedAtIso: new Date(request.nowMs).toISOString(),
        expiresAtIso: new Date(session.expiresAtMs).toISOString(),
        revokedAtIso: null
      }
    });
    if (result === "current-token-exists") return unavailable("current-token-exists", false);
    return {
      status: "issued",
      token,
      scope: commentTranslatorModeratorShareScope,
      expiresAtIso: new Date(session.expiresAtMs).toISOString(),
      access: "read-only"
    };
  } catch {
    return unavailable("token-store-unavailable", true);
  }
}

export async function readCommentTranslatorModeratorShareToken(
  request: AuthenticatedRequest
): Promise<CommentTranslatorModeratorShareTokenReadResult> {
  const ownerUserId = authorizedOwner(request.callerAuthorization);
  if (!ownerUserId) return unavailable("auth-unavailable", false);
  if (!request.tokenStore) return unavailable("token-store-unavailable", true);

  try {
    const [session, record] = await Promise.all([
      request.sessionAuthority.readCurrentForOwner(ownerUserId),
      request.tokenStore.readCurrent({ ownerUserId, scope: commentTranslatorModeratorShareScope })
    ]);
    if (!record) return unavailable("token-missing", false);
    if (session.status === "unavailable") {
      return unavailable("active-session-unavailable", session.reason === "session-authority-unavailable");
    }
    if (!isCurrentRecord(record, ownerUserId, session.sessionReferenceId, request.nowMs) ||
        session.expiresAtMs <= request.nowMs) {
      return unavailable("active-session-unavailable", false);
    }
    return {
      status: "ready",
      tokenState: "current",
      scope: commentTranslatorModeratorShareScope,
      expiresAtIso: record.expiresAtIso,
      access: "read-only"
    };
  } catch {
    return unavailable("token-store-unavailable", true);
  }
}

export async function revokeCommentTranslatorModeratorShareToken(
  request: AuthenticatedRequest
): Promise<CommentTranslatorModeratorShareTokenRevokeResult> {
  const ownerUserId = authorizedOwner(request.callerAuthorization);
  if (!ownerUserId) return unavailable("auth-unavailable", false);
  if (!request.tokenStore) return unavailable("token-store-unavailable", true);

  try {
    const result = await request.tokenStore.revokeCurrent({
      ownerUserId,
      scope: commentTranslatorModeratorShareScope,
      revokedAtIso: new Date(request.nowMs).toISOString()
    });
    if (result === "missing-token") return unavailable("token-missing", false);
    return { status: "revoked", scope: commentTranslatorModeratorShareScope, access: "read-only" };
  } catch {
    return unavailable("token-store-unavailable", true);
  }
}

export async function validateCommentTranslatorModeratorShareToken({
  presentedToken,
  sessionAuthority,
  tokenStore,
  nowMs
}: {
  readonly presentedToken: string;
  readonly sessionAuthority: CommentTranslatorModeratorShareSessionAuthority;
  readonly tokenStore: CommentTranslatorModeratorShareTokenStore | null;
  readonly nowMs: number;
}): Promise<CommentTranslatorModeratorShareTokenValidationResult> {
  if (!isOpaqueToken(presentedToken)) return denied("invalid-token", false);
  if (!tokenStore) return denied("moderator-share-unavailable", true);
  try {
    const record = await tokenStore.readByDigest({
      tokenDigest: digestToken(presentedToken),
      scope: commentTranslatorModeratorShareScope
    });
    if (!record || record.scope !== commentTranslatorModeratorShareScope || record.revokedAtIso ||
        Date.parse(record.expiresAtIso) <= nowMs) {
      return denied("invalid-token", false);
    }
    const session = await sessionAuthority.readCurrentForOwner(record.ownerUserId);
    if (session.status === "unavailable") {
      return session.reason === "session-authority-unavailable"
        ? denied("moderator-share-unavailable", true)
        : denied("invalid-token", false);
    }
    if (session.sessionReferenceId !== record.sessionReferenceId || session.expiresAtMs <= nowMs) {
      return denied("invalid-token", false);
    }
    return { status: "authorized", scope: commentTranslatorModeratorShareScope, access: "read-only" };
  } catch {
    return denied("moderator-share-unavailable", true);
  }
}

function authorizedOwner(authorization: YouTubeOAuthCredentialStatusCallerAuthorization): string | null {
  return authorization.status === "authorized" ? authorization.ownerUserId : null;
}

function isCurrentRecord(
  record: CommentTranslatorModeratorShareTokenRecord,
  ownerUserId: string,
  sessionReferenceId: string,
  nowMs: number
): boolean {
  return record.scope === commentTranslatorModeratorShareScope && record.ownerUserId === ownerUserId &&
    record.sessionReferenceId === sessionReferenceId && !record.revokedAtIso && Date.parse(record.expiresAtIso) > nowMs;
}

function isOpaqueToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function unavailable(
  reason: CommentTranslatorModeratorShareTokenUnavailableReason,
  retryable: boolean
): CommentTranslatorModeratorShareTokenUnavailableResult {
  return { status: "unavailable", reason, retryable };
}

function denied(
  reason: Extract<CommentTranslatorModeratorShareTokenValidationResult, { status: "denied" }>["reason"],
  retryable: boolean
): Extract<CommentTranslatorModeratorShareTokenValidationResult, { status: "denied" }> {
  return { status: "denied", reason, retryable };
}
