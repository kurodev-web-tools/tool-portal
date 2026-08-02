import "server-only";

import {
  createTrustedCommentTranslatorSessionSupabaseStore,
  type CommentTranslatorDurableSessionStoreFactoryResult
} from "./comment-translator-durable-session-store";
import {
  commentTranslatorSessionLimitMs,
  isCommentTranslatorHeartbeatMissing
} from "./comment-translator-session-policy";
import type { CommentTranslatorCreatorModeratorSessionAuthority } from "./comment-translator-creator-moderator-token-types";

type ReadSessionLimitMsForOwner = (ownerUserId: string) => number | null | Promise<number | null>;

export const commentTranslatorCreatorModeratorSessionAuthorityContract = {
  implementationStage: "nc-m2-local-moderator-session-authority",
  runtime: "server-only",
  durableSessionAuthority: "createTrustedCommentTranslatorSessionSupabaseStore-readActiveSession",
  expiryBound: "server-owned-session-limit-with-request-time-heartbeat-revalidation",
  closedPathSessionLimit: "commentTranslatorSessionLimitMs-free",
  futureActivationSessionLimit: "authoritative-owner-resolver-required",
  browserOwnerSessionSelection: "forbidden",
  creatorActivation: "fixed-closed"
} as const;

export function isCommentTranslatorCreatorModeratorBrowserRouteClosed({
  nodeEnv = process.env.NODE_ENV
}: {
  readonly nodeEnv?: string | undefined;
} = {}): boolean {
  return nodeEnv === "production";
}

export function createCommentTranslatorCreatorModeratorSessionAuthority({
  durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore(),
  readSessionLimitMsForOwner,
  requireAuthoritativeSessionLimit = false
}: {
  readonly durableSessionStore?: CommentTranslatorDurableSessionStoreFactoryResult;
  readonly readSessionLimitMsForOwner?: ReadSessionLimitMsForOwner;
  readonly requireAuthoritativeSessionLimit?: boolean;
} = {}): CommentTranslatorCreatorModeratorSessionAuthority {
  return {
    async readCurrentForOwner(ownerUserId, nowMs = Date.now()) {
      if (durableSessionStore.status !== "ready" || !Number.isFinite(nowMs)) {
        return { status: "unavailable", reason: "session-authority-unavailable" };
      }
      try {
        const activeSession = await durableSessionStore.store.readActiveSession({ ownerUserId });
        if (!activeSession) return { status: "unavailable", reason: "active-session-missing" };
        const sessionLimitMs = await resolveSessionLimitMs({
          ownerUserId,
          readSessionLimitMsForOwner,
          requireAuthoritativeSessionLimit
        });
        if (sessionLimitMs === null) return { status: "unavailable", reason: "session-authority-unavailable" };
        if (
          !Number.isFinite(activeSession.startedAtMs) ||
          !Number.isFinite(activeSession.lastHeartbeatAtMs) ||
          isCommentTranslatorHeartbeatMissing(activeSession, nowMs)
        ) return { status: "unavailable", reason: "active-session-missing" };
        const expiresAtMs = activeSession.startedAtMs + sessionLimitMs;
        if (!Number.isFinite(expiresAtMs)) return { status: "unavailable", reason: "session-authority-unavailable" };
        return { status: "active", sessionReferenceId: activeSession.sessionReferenceId, expiresAtMs };
      } catch {
        return { status: "unavailable", reason: "session-authority-unavailable" };
      }
    }
  };
}

async function resolveSessionLimitMs({
  ownerUserId,
  readSessionLimitMsForOwner,
  requireAuthoritativeSessionLimit
}: {
  readonly ownerUserId: string;
  readonly readSessionLimitMsForOwner: ReadSessionLimitMsForOwner | undefined;
  readonly requireAuthoritativeSessionLimit: boolean;
}): Promise<number | null> {
  if (!readSessionLimitMsForOwner) {
    return requireAuthoritativeSessionLimit ? null : commentTranslatorSessionLimitMs("free");
  }
  const sessionLimitMs = await readSessionLimitMsForOwner(ownerUserId);
  return typeof sessionLimitMs === "number" && Number.isFinite(sessionLimitMs) && sessionLimitMs > 0
    ? sessionLimitMs
    : null;
}
