import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { CommentTranslatorCreatorModeratorTokenBrowserSessionAuthority } from "./comment-translator-creator-moderator-token-types";
import type { CommentTranslatorCreatorModeratorBrowserSessionStore } from "./comment-translator-creator-moderator-browser-session-store";

export const commentTranslatorCreatorModeratorBrowserSessionRuntimeContract = {
  implementationStage: "nc-m2-local-moderator-browser-session-runtime",
  transport: "post-body-one-time-redemption",
  cookie: "http-only-secure-samesite-strict-moderator-capability",
  browserPersistence: "sha256-capability-digest-only",
  currentAuthority: "nc-m1-token-version-and-durable-session-rechecked-on-every-read",
  browserOwnerSessionSelection: "forbidden",
  creatorActivation: "fixed-closed"
} as const;

type Unavailable = {
  readonly status: "unavailable";
  readonly reason: "invalid-credential" | "moderator-share-unavailable";
  readonly retryable: boolean;
};

export type CommentTranslatorCreatorModeratorBrowserSessionRedeemResult =
  | { readonly status: "ready"; readonly capability: string; readonly expiresAtIso: string }
  | Unavailable;

export type CommentTranslatorCreatorModeratorBrowserSessionAuthorizationResult =
  | {
      readonly status: "authorized";
      readonly ownerUserId: string;
      readonly sessionReferenceId: string;
      readonly expiresAtIso: string;
    }
  | Unavailable;

type AuthorityRequest = {
  readonly tokenRuntime: CommentTranslatorCreatorModeratorTokenBrowserSessionAuthority;
  readonly browserSessionStore: CommentTranslatorCreatorModeratorBrowserSessionStore | null;
  readonly nowMs: number;
};

export async function redeemCommentTranslatorCreatorModeratorBrowserSession({
  presentedToken,
  createCapability = () => randomBytes(32).toString("base64url"),
  browserSessionStore,
  nowMs
}: Pick<AuthorityRequest, "browserSessionStore" | "nowMs"> & {
  readonly presentedToken: string;
  readonly createCapability?: () => string;
}): Promise<CommentTranslatorCreatorModeratorBrowserSessionRedeemResult> {
  if (!browserSessionStore) return unavailable("moderator-share-unavailable", true);
  if (!isOpaqueCapability(presentedToken)) return unavailable("invalid-credential", false);
  const capability = createCapability();
  if (!isOpaqueCapability(capability)) return unavailable("moderator-share-unavailable", true);
  try {
    const stored = await browserSessionStore.redeemAndWriteCurrent({
      tokenDigest: digestCapability(presentedToken),
      capabilityDigest: digestCapability(capability),
      nowIso: new Date(nowMs).toISOString()
    });
    if (stored.status === "redeemed") return { status: "ready", capability, expiresAtIso: stored.record.expiresAtIso };
    if (stored.status === "denied") return unavailable("invalid-credential", false);
    return unavailable("moderator-share-unavailable", stored.retryable);
  } catch {
    return unavailable("moderator-share-unavailable", false);
  }
}

export async function authorizeCommentTranslatorCreatorModeratorBrowserSession({
  capability,
  tokenRuntime,
  browserSessionStore,
  nowMs
}: AuthorityRequest & {
  readonly capability: string;
}): Promise<CommentTranslatorCreatorModeratorBrowserSessionAuthorizationResult> {
  if (!isOpaqueCapability(capability)) return unavailable("invalid-credential", false);
  if (!browserSessionStore) return unavailable("moderator-share-unavailable", true);
  try {
    const read = await browserSessionStore.readByDigest({
      capabilityDigest: digestCapability(capability),
      nowIso: new Date(nowMs).toISOString()
    });
    if (read.status !== "ready") {
      return read.status === "unreadable"
        ? unavailable("moderator-share-unavailable", true)
        : unavailable("invalid-credential", false);
    }
    if (Date.parse(read.record.expiresAtIso) <= nowMs) return unavailable("invalid-credential", false);
    const current = await tokenRuntime.validateBrowserSession({
      ownerUserId: read.record.ownerUserId,
      sessionReferenceId: read.record.sessionReferenceId,
      tokenVersion: read.record.tokenVersion,
      expiresAtIso: read.record.expiresAtIso,
      nowMs
    });
    if (current.status !== "authorized") {
      return unavailable(current.reason === "moderator-share-unavailable" ? "moderator-share-unavailable" : "invalid-credential", current.retryable);
    }
    if (current.expiresAtIso !== read.record.expiresAtIso) return unavailable("invalid-credential", false);
    return {
      status: "authorized",
      ownerUserId: read.record.ownerUserId,
      sessionReferenceId: read.record.sessionReferenceId,
      expiresAtIso: current.expiresAtIso
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
