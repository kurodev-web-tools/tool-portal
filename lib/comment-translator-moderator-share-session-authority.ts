import "server-only";

import type { CommentTranslatorDurableSessionStoreFactoryResult } from "./comment-translator-durable-session-store";
import {
  commentTranslatorModeratorShareScope,
  type CommentTranslatorModeratorShareSessionAuthority,
  type CommentTranslatorModeratorShareTokenStore
} from "./comment-translator-moderator-share-token-types";

export function createCommentTranslatorModeratorShareSessionAuthority({
  durableSessionStore,
  tokenStore
}: {
  readonly durableSessionStore: CommentTranslatorDurableSessionStoreFactoryResult;
  readonly tokenStore: CommentTranslatorModeratorShareTokenStore | null;
}): CommentTranslatorModeratorShareSessionAuthority {
  return {
    async readCurrentForOwner(ownerUserId) {
      if (durableSessionStore.status !== "ready" || !tokenStore) {
        return { status: "unavailable", reason: "session-authority-unavailable" };
      }
      try {
        const [activeSession, tokenRecord] = await Promise.all([
          durableSessionStore.store.readActiveSession({ ownerUserId }),
          tokenStore.readCurrent({ ownerUserId, scope: commentTranslatorModeratorShareScope })
        ]);
        if (
          !activeSession || !tokenRecord || tokenRecord.revokedAtIso ||
          tokenRecord.sessionReferenceId !== activeSession.sessionReferenceId
        ) {
          return { status: "unavailable", reason: "active-session-missing" };
        }
        const expiresAtMs = Date.parse(tokenRecord.expiresAtIso);
        if (!Number.isFinite(expiresAtMs)) {
          return { status: "unavailable", reason: "session-authority-unavailable" };
        }
        return {
          status: "active",
          sessionReferenceId: activeSession.sessionReferenceId,
          expiresAtMs
        };
      } catch {
        return { status: "unavailable", reason: "session-authority-unavailable" };
      }
    }
  };
}
