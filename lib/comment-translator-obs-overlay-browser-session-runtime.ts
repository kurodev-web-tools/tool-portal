import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  resolveCommentTranslatorObsOverlayTokenPrivateAuthorization,
  validateCommentTranslatorObsOverlayTokenPrivateAuthorization
} from "./comment-translator-obs-overlay-token-runtime";
import type {
  CommentTranslatorObsOverlaySessionAuthority,
  CommentTranslatorObsOverlayTokenStore
} from "./comment-translator-obs-overlay-token-types";
import type { CommentTranslatorObsOverlayBrowserSessionStore } from "./comment-translator-obs-overlay-browser-session-store";

export const commentTranslatorObsOverlayBrowserSessionContract = {
  implementationStage: "creator-closed-beta-c6-obs-overlay-browser-session-runtime",
  transport: "post-body-redemption",
  cookie: "http-only-secure-overlay-capability",
  c5TokenInUrl: "forbidden",
  c5TokenPersistence: "forbidden",
  browserSessionPersistence: "sha256-digest-only",
  authority: "c5-token-version-plus-authoritative-session",
  access: "read-only"
} as const;

type Unavailable = {
  readonly status: "unavailable";
  readonly reason: "invalid-credential" | "overlay-unavailable";
  readonly retryable: boolean;
};

export type CommentTranslatorObsOverlayBrowserSessionRedeemResult =
  | {
      readonly status: "ready";
      readonly capability: string;
      readonly expiresAtIso: string;
    }
  | Unavailable;

export type CommentTranslatorObsOverlayBrowserSessionAuthorizationResult =
  | {
      readonly status: "authorized";
      readonly ownerUserId: string;
      readonly sessionReferenceId: string;
      readonly expiresAtIso: string;
    }
  | Unavailable;

type AuthorityRequest = {
  readonly sessionAuthority: CommentTranslatorObsOverlaySessionAuthority;
  readonly tokenStore: CommentTranslatorObsOverlayTokenStore | null;
  readonly browserSessionStore: CommentTranslatorObsOverlayBrowserSessionStore | null;
  readonly nowMs: number;
};

export async function redeemCommentTranslatorObsOverlayBrowserSession({
  presentedToken,
  createCapability = () => randomBytes(32).toString("base64url"),
  ...request
}: AuthorityRequest & {
  readonly presentedToken: string;
  readonly createCapability?: () => string;
}): Promise<CommentTranslatorObsOverlayBrowserSessionRedeemResult> {
  if (!request.browserSessionStore) return unavailable("overlay-unavailable", true);
  const authorization = await resolveCommentTranslatorObsOverlayTokenPrivateAuthorization({
    presentedToken,
    sessionAuthority: request.sessionAuthority,
    tokenStore: request.tokenStore,
    nowMs: request.nowMs
  });
  if (authorization.status !== "authorized") {
    return unavailable(
      authorization.reason === "invalid-token" ? "invalid-credential" : "overlay-unavailable",
      authorization.retryable
    );
  }
  const capability = createCapability();
  if (!isOpaqueCapability(capability)) return unavailable("overlay-unavailable", true);
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
    return unavailable("overlay-unavailable", true);
  }
}

export async function authorizeCommentTranslatorObsOverlayBrowserSession({
  capability,
  ...request
}: AuthorityRequest & { readonly capability: string }): Promise<CommentTranslatorObsOverlayBrowserSessionAuthorizationResult> {
  if (!isOpaqueCapability(capability)) return unavailable("invalid-credential", false);
  if (!request.browserSessionStore) return unavailable("overlay-unavailable", true);
  try {
    const record = await request.browserSessionStore.readByDigest(digestCapability(capability));
    if (!record || Date.parse(record.expiresAtIso) <= request.nowMs) {
      return unavailable("invalid-credential", false);
    }
    const authorization = {
      status: "authorized",
      ownerUserId: record.ownerUserId,
      sessionReferenceId: record.sessionReferenceId,
      tokenVersion: record.tokenVersion,
      expiresAtIso: record.expiresAtIso
    } as const;
    const current = await validateCommentTranslatorObsOverlayTokenPrivateAuthorization({
      authorization,
      sessionAuthority: request.sessionAuthority,
      tokenStore: request.tokenStore,
      nowMs: request.nowMs
    });
    if (current.status !== "authorized") {
      return unavailable(
        current.reason === "invalid-token" ? "invalid-credential" : "overlay-unavailable",
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
    return unavailable("overlay-unavailable", true);
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
