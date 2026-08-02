import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { CommentTranslatorCreatorObsTokenBrowserSessionAuthority } from "./comment-translator-creator-obs-token-types";
import type {
  CommentTranslatorCreatorObsOverlayBrowserSessionStore
} from "./comment-translator-creator-obs-overlay-browser-session-store";

export const commentTranslatorCreatorObsOverlayBrowserSessionRuntimeContract = {
  implementationStage: "nc-o2-local-obs-overlay-browser-session-runtime",
  transport: "post-body-one-time-redemption",
  cookie: "http-only-secure-samesite-strict-overlay-capability",
  browserPersistence: "sha256-capability-digest-only",
  currentAuthority: "nc-o1-token-version-and-durable-session-rechecked-on-every-read",
  browserOwnerSessionSelection: "forbidden",
  creatorActivation: "fixed-closed"
} as const;

type Unavailable = {
  readonly status: "unavailable";
  readonly reason: "invalid-credential" | "overlay-unavailable";
  readonly retryable: boolean;
};

export type CommentTranslatorCreatorObsOverlayBrowserSessionRedeemResult =
  | { readonly status: "ready"; readonly capability: string; readonly expiresAtIso: string }
  | Unavailable;

export type CommentTranslatorCreatorObsOverlayBrowserSessionAuthorizationResult =
  | {
      readonly status: "authorized";
      readonly ownerUserId: string;
      readonly sessionReferenceId: string;
      readonly expiresAtIso: string;
    }
  | Unavailable;

type AuthorityRequest = {
  readonly tokenRuntime: CommentTranslatorCreatorObsTokenBrowserSessionAuthority;
  readonly browserSessionStore: CommentTranslatorCreatorObsOverlayBrowserSessionStore | null;
  readonly nowMs: number;
};

type BrowserSessionRedemptionRequest = Pick<AuthorityRequest, "browserSessionStore" | "nowMs">;

export async function redeemCommentTranslatorCreatorObsOverlayBrowserSession({
  presentedToken,
  createCapability = () => randomBytes(32).toString("base64url"),
  ...request
}: BrowserSessionRedemptionRequest & {
  readonly presentedToken: string;
  readonly createCapability?: () => string;
}): Promise<CommentTranslatorCreatorObsOverlayBrowserSessionRedeemResult> {
  if (!request.browserSessionStore) return unavailable("overlay-unavailable", true);
  if (!isOpaqueCapability(presentedToken)) return unavailable("invalid-credential", false);
  const capability = createCapability();
  if (!isOpaqueCapability(capability)) return unavailable("overlay-unavailable", true);
  try {
    const stored = await request.browserSessionStore.redeemAndWriteCurrent({
      tokenDigest: digestCapability(presentedToken),
      capabilityDigest: digestCapability(capability),
      nowIso: new Date(request.nowMs).toISOString()
    });
    if (stored.status === "redeemed") {
      return { status: "ready", capability, expiresAtIso: stored.record.expiresAtIso };
    }
    if (stored.status === "denied") return unavailable("invalid-credential", false);
    return unavailable("overlay-unavailable", stored.retryable);
  } catch {
    return unavailable("overlay-unavailable", false);
  }
}

export async function authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
  capability,
  ...request
}: AuthorityRequest & {
  readonly capability: string;
}): Promise<CommentTranslatorCreatorObsOverlayBrowserSessionAuthorizationResult> {
  if (!isOpaqueCapability(capability)) return unavailable("invalid-credential", false);
  if (!request.browserSessionStore) return unavailable("overlay-unavailable", true);
  try {
    const read = await request.browserSessionStore.readByDigest(digestCapability(capability));
    if (read.status === "missing") return unavailable("invalid-credential", false);
    if (read.status === "unreadable") return unavailable("overlay-unavailable", true);
    if (Date.parse(read.record.expiresAtIso) <= request.nowMs) return unavailable("invalid-credential", false);
    const current = await request.tokenRuntime.validateBrowserSession({
      ownerUserId: read.record.ownerUserId,
      sessionReferenceId: read.record.sessionReferenceId,
      tokenVersion: read.record.tokenVersion,
      expiresAtIso: read.record.expiresAtIso,
      nowMs: request.nowMs
    });
    if (current.status !== "authorized") {
      return unavailable(current.reason === "overlay-unavailable" ? "overlay-unavailable" : "invalid-credential", current.retryable);
    }
    if (current.expiresAtIso !== read.record.expiresAtIso) return unavailable("invalid-credential", false);
    return {
      status: "authorized",
      ownerUserId: read.record.ownerUserId,
      sessionReferenceId: read.record.sessionReferenceId,
      expiresAtIso: current.expiresAtIso
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
