import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  resolveCommentTranslatorModeratorShareTokenPrivateAuthorization,
  validateCommentTranslatorModeratorShareTokenPrivateAuthorization
} from "./comment-translator-moderator-share-token-runtime";
import type { CommentTranslatorModeratorShareBrowserSessionStore } from "./comment-translator-moderator-share-browser-session-store";
import type {
  CommentTranslatorModeratorShareSessionAuthority,
  CommentTranslatorModeratorShareTokenStore
} from "./comment-translator-moderator-share-token-types";

export const commentTranslatorModeratorShareBrowserSessionContract = {
  implementationStage: "creator-closed-beta-c8-moderator-share-browser-session-runtime",
  transport: "post-body-redemption",
  cookie: "http-only-secure-same-site-strict-moderator-capability",
  c7TokenInUrl: "forbidden",
  c7TokenPersistence: "forbidden",
  browserSessionPersistence: "sha256-digest-only",
  authority: "c7-token-version-plus-authoritative-session-on-every-read",
  crossTokenInteroperability: "c5-c6-c7-c8-separated",
  access: "read-only"
} as const;

type Unavailable = {
  readonly status: "unavailable";
  readonly reason: "invalid-credential" | "moderator-share-unavailable";
  readonly retryable: boolean;
};

export type CommentTranslatorModeratorShareBrowserSessionRedeemResult =
  | {
      readonly status: "ready";
      readonly capability: string;
      readonly expiresAtIso: string;
    }
  | Unavailable;

export type CommentTranslatorModeratorShareBrowserSessionAuthorizationResult =
  | {
      readonly status: "authorized";
      readonly ownerUserId: string;
      readonly sessionReferenceId: string;
      readonly expiresAtIso: string;
    }
  | Unavailable;

type AuthorityRequest = {
  readonly sessionAuthority: CommentTranslatorModeratorShareSessionAuthority;
  readonly tokenStore: CommentTranslatorModeratorShareTokenStore | null;
  readonly browserSessionStore: CommentTranslatorModeratorShareBrowserSessionStore | null;
  readonly nowMs: number;
};

export async function redeemCommentTranslatorModeratorShareBrowserSession({
  presentedToken,
  createCapability = () => randomBytes(32).toString("base64url"),
  ...request
}: AuthorityRequest & {
  readonly presentedToken: string;
  readonly createCapability?: () => string;
}): Promise<CommentTranslatorModeratorShareBrowserSessionRedeemResult> {
  if (!request.browserSessionStore) return unavailable("moderator-share-unavailable", true);
  const authorization = await resolveCommentTranslatorModeratorShareTokenPrivateAuthorization({
    presentedToken,
    sessionAuthority: request.sessionAuthority,
    tokenStore: request.tokenStore,
    nowMs: request.nowMs
  });
  if (authorization.status !== "authorized") {
    return unavailable(
      authorization.reason === "invalid-token" ? "invalid-credential" : "moderator-share-unavailable",
      authorization.retryable
    );
  }
  const capability = createCapability();
  if (!isOpaqueCapability(capability)) return unavailable("moderator-share-unavailable", true);
  try {
    await request.browserSessionStore.writeCurrent({
      ownerUserId: authorization.ownerUserId,
      sessionReferenceId: authorization.sessionReferenceId,
      tokenVersion: authorization.tokenVersion,
      capabilityDigest: digestCapability(capability),
      issuedAtIso: new Date(request.nowMs).toISOString(),
      expiresAtIso: authorization.expiresAtIso
    });
    return { status: "ready", capability, expiresAtIso: authorization.expiresAtIso };
  } catch {
    return unavailable("moderator-share-unavailable", true);
  }
}

export async function authorizeCommentTranslatorModeratorShareBrowserSession({
  capability,
  ...request
}: AuthorityRequest & {
  readonly capability: string;
}): Promise<CommentTranslatorModeratorShareBrowserSessionAuthorizationResult> {
  if (!isOpaqueCapability(capability)) return unavailable("invalid-credential", false);
  if (!request.browserSessionStore) return unavailable("moderator-share-unavailable", true);
  try {
    const record = await request.browserSessionStore.readByDigest(digestCapability(capability));
    if (!record || Date.parse(record.expiresAtIso) <= request.nowMs) {
      return unavailable("invalid-credential", false);
    }
    const current = await validateCommentTranslatorModeratorShareTokenPrivateAuthorization({
      authorization: {
        status: "authorized",
        ownerUserId: record.ownerUserId,
        sessionReferenceId: record.sessionReferenceId,
        tokenVersion: record.tokenVersion,
        expiresAtIso: record.expiresAtIso
      },
      sessionAuthority: request.sessionAuthority,
      tokenStore: request.tokenStore,
      nowMs: request.nowMs
    });
    if (current.status !== "authorized") {
      return unavailable(
        current.reason === "invalid-token" ? "invalid-credential" : "moderator-share-unavailable",
        current.retryable
      );
    }
    return {
      status: "authorized",
      ownerUserId: record.ownerUserId,
      sessionReferenceId: record.sessionReferenceId,
      expiresAtIso: record.expiresAtIso
    };
  } catch {
    return unavailable("moderator-share-unavailable", true);
  }
}

function isOpaqueCapability(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

function digestCapability(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function unavailable(reason: Unavailable["reason"], retryable: boolean): Unavailable {
  return { status: "unavailable", reason, retryable };
}
