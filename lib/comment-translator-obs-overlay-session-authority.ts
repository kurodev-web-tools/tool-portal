import "server-only";

import type { CommentTranslatorDurableSessionStoreFactoryResult } from "./comment-translator-durable-session-store";
import {
  commentTranslatorObsOverlayScope,
  type CommentTranslatorObsOverlaySessionAuthority,
  type CommentTranslatorObsOverlayTokenStore
} from "./comment-translator-obs-overlay-token-types";

export function createCommentTranslatorObsOverlaySessionAuthority({
  durableSessionStore,
  tokenStore
}: {
  readonly durableSessionStore: CommentTranslatorDurableSessionStoreFactoryResult;
  readonly tokenStore: CommentTranslatorObsOverlayTokenStore | null;
}): CommentTranslatorObsOverlaySessionAuthority {
  return {
    async readCurrentForOwner(ownerUserId) {
      if (durableSessionStore.status !== "ready" || !tokenStore) {
        return { status: "unavailable", reason: "session-authority-unavailable" };
      }
      try {
        const [activeSession, tokenRecord] = await Promise.all([
          durableSessionStore.store.readActiveSession({ ownerUserId }),
          tokenStore.readCurrent({ ownerUserId, scope: commentTranslatorObsOverlayScope })
        ]);
        if (!activeSession || !tokenRecord || tokenRecord.revokedAtIso ||
            tokenRecord.sessionReferenceId !== activeSession.sessionReferenceId) {
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
