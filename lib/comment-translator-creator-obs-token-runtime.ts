import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { CommentTranslatorCreatorCallerAuthority } from "./comment-translator-creator-entitlement-runtime";
import type {
  CommentTranslatorCreatorObsTokenRecord,
  CommentTranslatorCreatorObsTokenStore
} from "./comment-translator-creator-obs-token-store";
import type {
  CommentTranslatorCreatorObsSessionAuthority,
  CommentTranslatorCreatorObsSessionAuthorityResult,
  CommentTranslatorCreatorObsTokenBrowserSessionAuthority,
  CommentTranslatorCreatorObsTokenBrowserSessionValidation,
  CommentTranslatorCreatorObsTokenFailClosed,
  CommentTranslatorCreatorObsTokenFailClosedReason,
  CommentTranslatorCreatorObsTokenIssueResult,
  CommentTranslatorCreatorObsTokenRedeemResult,
  CommentTranslatorCreatorObsTokenSafeStatus
} from "./comment-translator-creator-obs-token-types";

const commentTranslatorCreatorObsTokenScope = "obs-overlay-read" as const;

type RuntimeDependencies = {
  readonly tokenStore: CommentTranslatorCreatorObsTokenStore | null;
  readonly sessionAuthority: CommentTranslatorCreatorObsSessionAuthority;
};

type CallerRequest = {
  readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
  readonly nowMs: number;
};

export const commentTranslatorCreatorObsTokenRuntimeContract = {
  implementationStage: "nc-o1-local-obs-token-runtime",
  runtime: "server-only",
  callerAuthority: "server-derived-owner-only",
  sessionAuthority: "current-durable-session-rechecked",
  tokenFormat: "opaque-random-32-byte-base64url",
  persistence: "sha256-digest-only",
  plaintextDelivery: "authenticated-issue-or-rotate-once",
  replayPolicy: "atomic-single-redemption",
  browserProjection: "sanitized-capability-metadata-only",
  creatorActivation: "fixed-closed",
  productionRouteWiring: "nc-o2-local-browser-route-activation-closed",
  remoteSupabaseMigrationApply: "not-run-in-this-thread"
} as const;

export function createCommentTranslatorCreatorObsTokenRuntime(dependencies: RuntimeDependencies) {
  const browserSessionAuthority: CommentTranslatorCreatorObsTokenBrowserSessionAuthority = {
    validateBrowserSession: (request) => validateBrowserSession(dependencies, request)
  };
  return {
    issue: (request: CallerRequest): Promise<CommentTranslatorCreatorObsTokenIssueResult> => writeToken(dependencies, request, "issue"),
    rotate: (request: CallerRequest): Promise<CommentTranslatorCreatorObsTokenIssueResult> => writeToken(dependencies, request, "rotate"),
    async readStatus(request: CallerRequest): Promise<CommentTranslatorCreatorObsTokenSafeStatus> {
      const ownerUserId = readOwner(request.callerAuthority);
      if (!ownerUserId) return failClosed("caller-unavailable", false);
      if (!dependencies.tokenStore) return failClosed("token-store-unavailable", true);
      try {
        const read = await dependencies.tokenStore.readCurrent({ ownerUserId });
        if (read.status === "missing") return failClosed("token-missing", false);
        if (read.status === "unreadable") return failClosed("token-store-unavailable", true);
        const authority = await validateCurrentSession(dependencies.sessionAuthority, ownerUserId, read.record, request.nowMs);
        if (authority) return authority;
        if (read.record.redeemedAtIso) return failClosed("token-replayed", false);
        return {
          status: "ready",
          scope: commentTranslatorCreatorObsTokenScope,
          access: "read-only",
          expiresAtIso: read.record.expiresAtIso,
          browserSafe: true
        };
      } catch (error) {
        if (error instanceof Error) return failClosed("token-store-unavailable", true);
        return failClosed("token-store-unavailable", true);
      }
    },
    async revoke(request: CallerRequest) {
      const ownerUserId = readOwner(request.callerAuthority);
      if (!ownerUserId) return failClosed("caller-unavailable", false);
      if (!dependencies.tokenStore) return failClosed("token-store-unavailable", true);
      try {
        const session = await dependencies.sessionAuthority.readCurrentForOwner(ownerUserId, request.nowMs);
        if (session.status === "unavailable") {
          return failClosed("session-unavailable", session.reason === "session-authority-unavailable");
        }
        if (session.expiresAtMs <= request.nowMs) return failClosed("session-unavailable", false);
        const result = await dependencies.tokenStore.revokeCurrent({
          ownerUserId,
          revokedAtIso: new Date(request.nowMs).toISOString()
        });
        if (result.status === "unreadable") return failClosed("token-store-unavailable", true);
        if (result.status === "missing") return failClosed("token-missing", false);
        return {
          status: "revoked" as const,
          scope: commentTranslatorCreatorObsTokenScope,
          access: "read-only" as const,
          browserSafe: true as const
        };
      } catch (error) {
        if (error instanceof Error) return failClosed("token-store-unavailable", true);
        return failClosed("token-store-unavailable", true);
      }
    },
    async redeem({ presentedToken, nowMs }: { readonly presentedToken: string; readonly nowMs: number }): Promise<CommentTranslatorCreatorObsTokenRedeemResult> {
      if (!/^[A-Za-z0-9_-]{43}$/.test(presentedToken)) return denied("invalid-token", false);
      if (!dependencies.tokenStore) return denied("overlay-unavailable", true);
      try {
        const tokenDigest = digestToken(presentedToken);
        const preflight = await dependencies.tokenStore.readByDigest({ tokenDigest });
        if (preflight.status === "missing") return denied("invalid-token", false);
        if (preflight.status === "unreadable") return denied("overlay-unavailable", true);
        const authority = await validateCurrentSession(
          dependencies.sessionAuthority,
          preflight.record.ownerUserId,
          preflight.record,
          nowMs
        );
        if (authority) {
          return denied(authority.retryable ? "overlay-unavailable" : "invalid-token", authority.retryable);
        }
        const result = await dependencies.tokenStore.redeemByDigest({
          tokenDigest,
          nowIso: new Date(nowMs).toISOString()
        });
        if (result.status === "denied") {
          return result.reason === "unreadable"
            ? denied("overlay-unavailable", true)
            : denied(result.reason, false);
        }
        return {
          status: "authorized",
          scope: commentTranslatorCreatorObsTokenScope,
          access: "read-only",
          browserSafe: true
        };
      } catch {
        return denied("overlay-unavailable", true);
      }
    },
    ...browserSessionAuthority
  };
}

async function validateBrowserSession(
  dependencies: RuntimeDependencies,
  request: {
    readonly ownerUserId: string;
    readonly sessionReferenceId: string;
    readonly tokenVersion: number;
    readonly expiresAtIso: string;
    readonly nowMs: number;
  }
): Promise<CommentTranslatorCreatorObsTokenBrowserSessionValidation> {
  if (!dependencies.tokenStore) return denied("overlay-unavailable", true);
  try {
    const current = await dependencies.tokenStore.readCurrent({ ownerUserId: request.ownerUserId });
    if (current.status === "missing") return denied("invalid-token", false);
    if (current.status === "unreadable") return denied("overlay-unavailable", true);
    if (
      current.record.ownerUserId !== request.ownerUserId ||
      current.record.sessionReferenceId !== request.sessionReferenceId ||
      current.record.version !== request.tokenVersion ||
      current.record.expiresAtIso !== request.expiresAtIso ||
      current.record.redeemedAtIso === null
    ) return denied("invalid-token", false);
    const authority = await validateCurrentSession(
      dependencies.sessionAuthority,
      request.ownerUserId,
      current.record,
      request.nowMs
    );
    if (authority) return denied(authority.retryable ? "overlay-unavailable" : "invalid-token", authority.retryable);
    return { status: "authorized", expiresAtIso: current.record.expiresAtIso };
  } catch {
    return denied("overlay-unavailable", true);
  }
}

async function writeToken(
  dependencies: RuntimeDependencies,
  request: CallerRequest,
  mode: "issue" | "rotate"
): Promise<CommentTranslatorCreatorObsTokenIssueResult> {
  const ownerUserId = readOwner(request.callerAuthority);
  if (!ownerUserId) return failClosed("caller-unavailable", false);
  if (!dependencies.tokenStore) return failClosed("token-store-unavailable", true);
  let session: CommentTranslatorCreatorObsSessionAuthorityResult;
  try {
    session = await dependencies.sessionAuthority.readCurrentForOwner(ownerUserId, request.nowMs);
  } catch (error) {
    if (error instanceof Error) return failClosed("session-unavailable", true);
    return failClosed("session-unavailable", true);
  }
  if (session.status === "unavailable") {
    return failClosed("session-unavailable", session.reason === "session-authority-unavailable");
  }
  if (session.expiresAtMs <= request.nowMs) return failClosed("session-unavailable", false);
  try {
    const token = randomBytes(32).toString("base64url");
    const result = await dependencies.tokenStore.issueOrRotate({
      mode,
      record: {
        ownerUserId,
        sessionReferenceId: session.sessionReferenceId,
        tokenDigest: digestToken(token),
        issuedAtIso: new Date(request.nowMs).toISOString(),
        expiresAtIso: new Date(session.expiresAtMs).toISOString(),
        revokedAtIso: null,
        redeemedAtIso: null
      }
    });
    if (result.status === "rejected") {
      return result.reason === "unreadable"
        ? failClosed("token-store-unavailable", true)
        : failClosed(result.reason, false);
    }
    return {
      status: mode === "issue" ? "issued" : "rotated",
      token,
      scope: commentTranslatorCreatorObsTokenScope,
      access: "read-only",
      expiresAtIso: new Date(session.expiresAtMs).toISOString(),
      browserSafe: true
    };
  } catch (error) {
    if (error instanceof Error) return failClosed("token-store-unavailable", true);
    return failClosed("token-store-unavailable", true);
  }
}

async function validateCurrentSession(
  sessionAuthority: CommentTranslatorCreatorObsSessionAuthority,
  ownerUserId: string,
  record: CommentTranslatorCreatorObsTokenRecord,
  nowMs: number
): Promise<CommentTranslatorCreatorObsTokenFailClosed | null> {
  const session = await sessionAuthority.readCurrentForOwner(ownerUserId, nowMs);
  if (session.status === "unavailable") {
    return failClosed("session-unavailable", session.reason === "session-authority-unavailable");
  }
  if (session.expiresAtMs <= nowMs) return failClosed("session-unavailable", false);
  if (
    record.ownerUserId !== ownerUserId || record.sessionReferenceId !== session.sessionReferenceId ||
    record.revokedAtIso !== null || Date.parse(record.expiresAtIso) <= nowMs
  ) return failClosed("session-mismatch", false);
  return null;
}

function readOwner(authority: CommentTranslatorCreatorCallerAuthority): string | null {
  return authority.status === "authenticated" ? authority.ownerUserId : null;
}
function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
function failClosed(
  reason: CommentTranslatorCreatorObsTokenFailClosedReason,
  retryable: boolean
): CommentTranslatorCreatorObsTokenFailClosed {
  return { status: "fail-closed", reason, retryable, browserSafe: true };
}
function denied(
  reason: "invalid-token" | "stale-or-replayed-token" | "overlay-unavailable",
  retryable: boolean
): Extract<CommentTranslatorCreatorObsTokenRedeemResult, { readonly status: "denied" }> {
  return { status: "denied", reason, retryable, browserSafe: true };
}
