import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { CommentTranslatorCreatorCallerAuthority } from "./comment-translator-creator-entitlement-runtime";
import type {
  CommentTranslatorCreatorModeratorSessionAuthority,
  CommentTranslatorCreatorModeratorTokenFailClosed,
  CommentTranslatorCreatorModeratorTokenFailClosedReason,
  CommentTranslatorCreatorModeratorTokenIssueResult,
  CommentTranslatorCreatorModeratorTokenRecord,
  CommentTranslatorCreatorModeratorTokenSafeStatus,
  CommentTranslatorCreatorModeratorTokenStore,
  CommentTranslatorCreatorModeratorTokenValidationResult
} from "./comment-translator-creator-moderator-token-types";

const moderatorScope = "moderator-share-read" as const;

type RuntimeDependencies = {
  readonly tokenStore: CommentTranslatorCreatorModeratorTokenStore | null;
  readonly sessionAuthority: CommentTranslatorCreatorModeratorSessionAuthority;
};
type CallerRequest = { readonly callerAuthority: CommentTranslatorCreatorCallerAuthority; readonly nowMs: number };

export const commentTranslatorCreatorModeratorTokenRuntimeContract = {
  implementationStage: "nc-m1-local-moderator-share-token-runtime",
  runtime: "server-only",
  scope: "moderator-share-read",
  callerAuthority: "server-derived-owner-only",
  sessionAuthority: "current-durable-session-rechecked",
  tokenFormat: "opaque-random-32-byte-base64url",
  persistence: "sha256-digest-only",
  plaintextDelivery: "authenticated-issue-once",
  currentTokenSemantics: "one-current-token-per-owner-session-scope",
  replayPolicy: "revoked-expired-reissued-or-cross-scope-denied",
  moderatorIdentityAuthority: "not-established-or-persisted",
  browserSessionValidation: "current-token-version-and-durable-session-rechecked",
  creatorActivation: "fixed-closed",
  productionLiveOperation: "fixed-closed",
  remoteSupabaseMigrationApply: "not-run-in-this-thread"
} as const;

export function createCommentTranslatorCreatorModeratorTokenRuntime(dependencies: RuntimeDependencies) {
  return {
    issue: (request: CallerRequest): Promise<CommentTranslatorCreatorModeratorTokenIssueResult> => issue(dependencies, request),
    readStatus: (request: CallerRequest): Promise<CommentTranslatorCreatorModeratorTokenSafeStatus> => readStatus(dependencies, request),
    revoke: (request: CallerRequest) => revoke(dependencies, request),
    validatePresentedToken: ({ presentedToken, nowMs }: { readonly presentedToken: string; readonly nowMs: number }): Promise<CommentTranslatorCreatorModeratorTokenValidationResult> =>
      validatePresentedToken(dependencies, presentedToken, nowMs),
    validateBrowserSession: (request: {
      readonly ownerUserId: string;
      readonly sessionReferenceId: string;
      readonly tokenVersion: number;
      readonly expiresAtIso: string;
      readonly nowMs: number;
    }) => validateBrowserSession(dependencies, request)
  };
}

async function issue(dependencies: RuntimeDependencies, request: CallerRequest): Promise<CommentTranslatorCreatorModeratorTokenIssueResult> {
  const ownerUserId = readOwner(request.callerAuthority);
  if (!ownerUserId) return failClosed("caller-unavailable", false);
  if (!dependencies.tokenStore) return failClosed("token-store-unavailable", true);
  const session = await readSession(dependencies.sessionAuthority, ownerUserId, request.nowMs);
  if (!session) return failClosed("session-unavailable", true);
  if (session.status === "unavailable") return failClosed("session-unavailable", session.reason === "session-authority-unavailable");
  if (session.expiresAtMs <= request.nowMs) return failClosed("session-unavailable", false);

  try {
    const token = randomBytes(32).toString("base64url");
    const result = await dependencies.tokenStore.issueCurrent({
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
      if (result.reason === "current-token-exists") return failClosed("current-token-exists", false);
      if (result.reason === "session-mismatch") return failClosed("session-mismatch", false);
      return failClosed("token-store-unavailable", true);
    }
    return {
      status: "issued",
      token,
      scope: moderatorScope,
      access: "read-only",
      expiresAtIso: new Date(session.expiresAtMs).toISOString(),
      browserSafe: true
    };
  } catch {
    return failClosed("token-store-unavailable", true);
  }
}

async function readStatus(dependencies: RuntimeDependencies, request: CallerRequest): Promise<CommentTranslatorCreatorModeratorTokenSafeStatus> {
  const ownerUserId = readOwner(request.callerAuthority);
  if (!ownerUserId) return failClosed("caller-unavailable", false);
  if (!dependencies.tokenStore) return failClosed("token-store-unavailable", true);
  try {
    const current = await dependencies.tokenStore.readCurrent({ ownerUserId, nowIso: new Date(request.nowMs).toISOString() });
    if (current.status !== "ready") {
      return current.status === "unreadable"
        ? failClosed("token-store-unavailable", true)
        : failClosed("token-missing", false);
    }
    const session = await readSession(dependencies.sessionAuthority, ownerUserId, request.nowMs);
    const reason = currentRecordFailure(current.record, ownerUserId, session, request.nowMs);
    if (reason) return failClosed(reason, reason === "token-store-unavailable");
    return {
      status: "ready",
      scope: moderatorScope,
      access: "read-only",
      expiresAtIso: current.record.expiresAtIso,
      browserSafe: true
    };
  } catch {
    return failClosed("token-store-unavailable", true);
  }
}

async function revoke(dependencies: RuntimeDependencies, request: CallerRequest) {
  const ownerUserId = readOwner(request.callerAuthority);
  if (!ownerUserId) return failClosed("caller-unavailable", false);
  if (!dependencies.tokenStore) return failClosed("token-store-unavailable", true);
  const session = await readSession(dependencies.sessionAuthority, ownerUserId, request.nowMs);
  if (!session) return failClosed("session-unavailable", true);
  if (session.status === "unavailable") return failClosed("session-unavailable", session.reason === "session-authority-unavailable");
  if (session.expiresAtMs <= request.nowMs) return failClosed("session-unavailable", false);
  try {
    const result = await dependencies.tokenStore.revokeCurrent({
      ownerUserId,
      sessionReferenceId: session.sessionReferenceId,
      revokedAtIso: new Date(request.nowMs).toISOString()
    });
    if (result.status === "unreadable") return failClosed("token-store-unavailable", true);
    if (result.status === "missing") return failClosed("token-missing", false);
    return { status: "revoked" as const, scope: moderatorScope, access: "read-only" as const, browserSafe: true as const };
  } catch {
    return failClosed("token-store-unavailable", true);
  }
}

async function validatePresentedToken(
  dependencies: RuntimeDependencies,
  presentedToken: string,
  nowMs: number
): Promise<CommentTranslatorCreatorModeratorTokenValidationResult> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(presentedToken)) return denied("invalid-token", false);
  if (!dependencies.tokenStore) return denied("moderator-share-unavailable", true);
  try {
    const current = await dependencies.tokenStore.readByDigest({
      tokenDigest: digestToken(presentedToken),
      nowIso: new Date(nowMs).toISOString()
    });
    if (current.status !== "ready") {
      return current.status === "unreadable"
        ? denied("moderator-share-unavailable", true)
        : denied("invalid-token", false);
    }
    if (current.record.redeemedAtIso !== null) return denied("invalid-token", false);
    const session = await readSession(dependencies.sessionAuthority, current.record.ownerUserId, nowMs);
    const reason = currentRecordFailure(current.record, current.record.ownerUserId, session, nowMs);
    if (reason) return denied(reason === "token-store-unavailable" ? "moderator-share-unavailable" : "invalid-token", reason === "token-store-unavailable");
    return { status: "authorized", scope: moderatorScope, access: "read-only", browserSafe: true };
  } catch {
    return denied("moderator-share-unavailable", true);
  }
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
) {
  if (
    !request.ownerUserId || !request.sessionReferenceId || !Number.isSafeInteger(request.tokenVersion) || request.tokenVersion < 1 ||
    !Number.isFinite(request.nowMs) || !Number.isFinite(Date.parse(request.expiresAtIso))
  ) return denied("invalid-token", false);
  if (!dependencies.tokenStore) return denied("moderator-share-unavailable", true);
  try {
    const current = await dependencies.tokenStore.readCurrent({
      ownerUserId: request.ownerUserId,
      nowIso: new Date(request.nowMs).toISOString()
    });
    if (current.status !== "ready") {
      return current.status === "unreadable"
        ? denied("moderator-share-unavailable", true)
        : denied("invalid-token", false);
    }
    if (
      current.record.ownerUserId !== request.ownerUserId ||
      current.record.sessionReferenceId !== request.sessionReferenceId ||
      current.record.version !== request.tokenVersion ||
      current.record.expiresAtIso !== request.expiresAtIso ||
      current.record.redeemedAtIso === null
    ) return denied("invalid-token", false);
    const session = await readSession(dependencies.sessionAuthority, request.ownerUserId, request.nowMs);
    const reason = currentRecordFailure(current.record, request.ownerUserId, session, request.nowMs);
    if (reason) return denied(reason === "token-store-unavailable" ? "moderator-share-unavailable" : "invalid-token", reason === "token-store-unavailable");
    return { status: "authorized" as const, expiresAtIso: current.record.expiresAtIso };
  } catch {
    return denied("moderator-share-unavailable", true);
  }
}

async function readSession(
  sessionAuthority: CommentTranslatorCreatorModeratorSessionAuthority,
  ownerUserId: string,
  nowMs: number
) {
  try {
    return await sessionAuthority.readCurrentForOwner(ownerUserId, nowMs);
  } catch {
    return null;
  }
}

function currentRecordFailure(
  record: CommentTranslatorCreatorModeratorTokenRecord,
  ownerUserId: string,
  session: Awaited<ReturnType<CommentTranslatorCreatorModeratorSessionAuthority["readCurrentForOwner"]>> | null,
  nowMs: number
): "session-unavailable" | "session-mismatch" | "token-missing" | "token-store-unavailable" | null {
  if (record.scope !== moderatorScope || record.ownerUserId !== ownerUserId || record.revokedAtIso || Date.parse(record.expiresAtIso) <= nowMs) {
    return "token-missing";
  }
  if (!session) return "token-store-unavailable";
  if (session.status === "unavailable") return session.reason === "session-authority-unavailable" ? "token-store-unavailable" : "session-unavailable";
  if (session.sessionReferenceId !== record.sessionReferenceId || session.expiresAtMs <= nowMs) return "session-mismatch";
  return null;
}

function readOwner(callerAuthority: CommentTranslatorCreatorCallerAuthority): string | null {
  return callerAuthority.status === "authenticated" && typeof callerAuthority.ownerUserId === "string" && callerAuthority.ownerUserId ? callerAuthority.ownerUserId : null;
}
function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
function failClosed(reason: CommentTranslatorCreatorModeratorTokenFailClosedReason, retryable: boolean): CommentTranslatorCreatorModeratorTokenFailClosed {
  return { status: "fail-closed", reason, retryable, browserSafe: true };
}
function denied(
  reason: "invalid-token" | "moderator-share-unavailable",
  retryable: boolean
): Extract<CommentTranslatorCreatorModeratorTokenValidationResult, { readonly status: "denied" }> {
  return { status: "denied", reason, retryable, browserSafe: true };
}
