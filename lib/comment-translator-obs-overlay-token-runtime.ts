import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import {
  commentTranslatorObsOverlayScope,
  type CommentTranslatorObsOverlaySessionAuthority,
  type CommentTranslatorObsOverlayTokenIssueResult,
  type CommentTranslatorObsOverlayTokenReadResult,
  type CommentTranslatorObsOverlayTokenRecord,
  type CommentTranslatorObsOverlayTokenRevokeResult,
  type CommentTranslatorObsOverlayTokenStore,
  type CommentTranslatorObsOverlayTokenUnavailableReason,
  type CommentTranslatorObsOverlayTokenUnavailableResult,
  type CommentTranslatorObsOverlayTokenValidationResult
} from "./comment-translator-obs-overlay-token-types";
import { resolveCommentTranslatorObsOverlayTokenPrivateAuthorization } from "./comment-translator-obs-overlay-token-private-authorization";

export {
  resolveCommentTranslatorObsOverlayTokenPrivateAuthorization,
  validateCommentTranslatorObsOverlayTokenPrivateAuthorization
} from "./comment-translator-obs-overlay-token-private-authorization";

export const commentTranslatorObsOverlayTokenContract = {
  implementationStage: "creator-closed-beta-c5-obs-overlay-token-runtime",
  runtime: "server-only",
  scope: commentTranslatorObsOverlayScope,
  access: "read-only",
  tokenFormat: "opaque-32-byte-base64url",
  plaintextPersistence: "forbidden-digest-only",
  digestAlgorithm: "sha256",
  expiryAuthority: "authoritative-session-expiry",
  currentTokenSemantics: "one-current-token-per-owner-and-scope",
  rotationSemantics: "replace-current-and-invalidate-previous",
  browserReadableOutput: "plaintext-on-authenticated-issue-or-rotate-only",
  publicRoute: "not-implemented-c6"
} as const;

type AuthenticatedRequest = {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly sessionAuthority: CommentTranslatorObsOverlaySessionAuthority;
  readonly tokenStore: CommentTranslatorObsOverlayTokenStore | null;
  readonly nowMs: number;
};

type WriteRequest = AuthenticatedRequest;

export async function issueCommentTranslatorObsOverlayToken(
  request: WriteRequest
): Promise<CommentTranslatorObsOverlayTokenIssueResult> {
  return writeToken(request, "issue");
}

export async function rotateCommentTranslatorObsOverlayToken(
  request: WriteRequest
): Promise<CommentTranslatorObsOverlayTokenIssueResult> {
  return writeToken(request, "rotate");
}

export async function readCommentTranslatorObsOverlayToken(
  request: AuthenticatedRequest
): Promise<CommentTranslatorObsOverlayTokenReadResult> {
  const ownerUserId = authorizedOwner(request.callerAuthorization);
  if (!ownerUserId) return unavailable("auth-unavailable", false);
  if (!request.tokenStore) return unavailable("token-store-unavailable", true);

  try {
    const [session, record] = await Promise.all([
      request.sessionAuthority.readCurrentForOwner(ownerUserId),
      request.tokenStore.readCurrent({ ownerUserId, scope: commentTranslatorObsOverlayScope })
    ]);
    if (!record) return unavailable("token-missing", false);
    if (session.status === "unavailable") {
      return unavailable("active-session-unavailable", session.reason === "session-authority-unavailable");
    }
    if (session.expiresAtMs <= request.nowMs || !isCurrentRecord(record, ownerUserId, session.sessionReferenceId, request.nowMs)) {
      return unavailable("active-session-unavailable", false);
    }
    return {
      status: "ready",
      tokenState: "current",
      scope: commentTranslatorObsOverlayScope,
      expiresAtIso: record.expiresAtIso,
      access: "read-only"
    };
  } catch {
    return unavailable("token-store-unavailable", true);
  }
}

export async function revokeCommentTranslatorObsOverlayToken(
  request: AuthenticatedRequest
): Promise<CommentTranslatorObsOverlayTokenRevokeResult> {
  const ownerUserId = authorizedOwner(request.callerAuthorization);
  if (!ownerUserId) return unavailable("auth-unavailable", false);
  if (!request.tokenStore) return unavailable("token-store-unavailable", true);

  try {
    const result = await request.tokenStore.revokeCurrent({
      ownerUserId,
      scope: commentTranslatorObsOverlayScope,
      revokedAtIso: new Date(request.nowMs).toISOString()
    });
    if (result === "missing-token") return unavailable("token-missing", false);
    return { status: "revoked", scope: commentTranslatorObsOverlayScope, access: "read-only" };
  } catch {
    return unavailable("token-store-unavailable", true);
  }
}

export async function validateCommentTranslatorObsOverlayToken({
  presentedToken,
  sessionAuthority,
  tokenStore,
  nowMs
}: {
  readonly presentedToken: string;
  readonly sessionAuthority: CommentTranslatorObsOverlaySessionAuthority;
  readonly tokenStore: CommentTranslatorObsOverlayTokenStore | null;
  readonly nowMs: number;
}): Promise<CommentTranslatorObsOverlayTokenValidationResult> {
  const result = await resolveCommentTranslatorObsOverlayTokenPrivateAuthorization({
    presentedToken,
    sessionAuthority,
    tokenStore,
    nowMs
  });
  return result.status === "authorized"
    ? { status: "authorized", scope: commentTranslatorObsOverlayScope, access: "read-only" }
    : result;
}

async function writeToken(
  request: WriteRequest,
  mode: "issue" | "rotate"
): Promise<CommentTranslatorObsOverlayTokenIssueResult> {
  const ownerUserId = authorizedOwner(request.callerAuthorization);
  if (!ownerUserId) return unavailable("auth-unavailable", false);
  if (!request.tokenStore) return unavailable("token-store-unavailable", true);

  try {
    const session = await request.sessionAuthority.readCurrentForOwner(ownerUserId);
    if (session.status === "unavailable") {
      return unavailable("active-session-unavailable", session.reason === "session-authority-unavailable");
    }
    if (session.expiresAtMs <= request.nowMs) {
      return unavailable("active-session-unavailable", false);
    }
    const token = randomBytes(32).toString("base64url");
    const result = await request.tokenStore.writeCurrent({
      mode,
      record: {
        ownerUserId,
        sessionReferenceId: session.sessionReferenceId,
        scope: commentTranslatorObsOverlayScope,
        tokenDigest: digestToken(token),
        issuedAtIso: new Date(request.nowMs).toISOString(),
        expiresAtIso: new Date(session.expiresAtMs).toISOString(),
        revokedAtIso: null
      }
    });
    if (result === "current-token-exists") return unavailable("current-token-exists", false);
    if (result === "missing-current-token") return unavailable("current-token-missing", false);
    return {
      status: mode === "issue" ? "issued" : "rotated",
      token,
      scope: commentTranslatorObsOverlayScope,
      expiresAtIso: new Date(session.expiresAtMs).toISOString(),
      access: "read-only"
    };
  } catch {
    return unavailable("token-store-unavailable", true);
  }
}

function authorizedOwner(authorization: YouTubeOAuthCredentialStatusCallerAuthorization): string | null {
  return authorization.status === "authorized" ? authorization.ownerUserId : null;
}

function isCurrentRecord(record: CommentTranslatorObsOverlayTokenRecord, ownerUserId: string, sessionReferenceId: string, nowMs: number) {
  return record.ownerUserId === ownerUserId && record.sessionReferenceId === sessionReferenceId &&
    !record.revokedAtIso && Date.parse(record.expiresAtIso) > nowMs;
}

function isOpaqueToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function unavailable(reason: CommentTranslatorObsOverlayTokenUnavailableReason, retryable: boolean): CommentTranslatorObsOverlayTokenUnavailableResult {
  return { status: "unavailable", reason, retryable };
}

function denied(
  reason: Extract<CommentTranslatorObsOverlayTokenValidationResult, { status: "denied" }>["reason"],
  retryable: boolean
): CommentTranslatorObsOverlayTokenValidationResult {
  return { status: "denied", reason, retryable };
}
