import "server-only";

import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { CommentTranslatorActiveSessionRecord, CommentTranslatorSessionBrowserSafeState } from "./comment-translator-session-types";

const activeSessionsByOwner = new Map<string, CommentTranslatorActiveSessionRecord>();

export function readInMemoryCommentTranslatorActiveSession(
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization
): CommentTranslatorActiveSessionRecord | null {
  if (callerAuthorization.status !== "authorized") return null;
  return activeSessionsByOwner.get(callerAuthorization.ownerUserId) ?? null;
}

export function persistInMemoryCommentTranslatorActiveSession({
  callerAuthorization,
  state
}: {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly state: CommentTranslatorSessionBrowserSafeState;
}): void {
  if (callerAuthorization.status !== "authorized") return;
  if (state.status === "active") {
    activeSessionsByOwner.set(callerAuthorization.ownerUserId, {
      sessionReferenceId: state.sessionReferenceId,
      startedAtMs: Date.parse(state.startedAtIso),
      lastHeartbeatAtMs: state.heartbeat.lastHeartbeatAtIso
        ? Date.parse(state.heartbeat.lastHeartbeatAtIso)
        : Date.parse(state.startedAtIso),
      credentialReferenceId: state.credentialReferenceId ?? undefined
    });
    return;
  }
  if (state.status === "stopped") activeSessionsByOwner.delete(callerAuthorization.ownerUserId);
}
