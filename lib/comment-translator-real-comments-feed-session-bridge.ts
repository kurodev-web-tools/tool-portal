import "server-only";

import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { CommentTranslatorActiveSessionRecord } from "./comment-translator-session-runtime";
import {
  createUnavailableCommentTranslatorRealCommentsFeedState
} from "./comment-translator-real-comments-ui-wiring";
import type { CommentTranslatorRealCommentsFeedState } from "./comment-translator-real-comments-feed-shared";

export type CommentTranslatorRealCommentsFeedSessionBridgePersistResult =
  | {
      status: "persisted";
      feedAuthority: "server-owned-session-scoped-safe-feed";
      displayRowCount: number;
      rawProviderPayload: "not-returned-by-design";
      rawComments: "not-returned-by-design";
      providerTargetMetadata: "forbidden";
      publicLaunchAllowed: false;
    }
  | {
      status: "skipped-caller-not-authorized" | "skipped-empty-session-reference" | "skipped-feed-not-ready";
      feedAuthority: "not-persisted";
      displayRowCount: 0;
      rawProviderPayload: "not-returned-by-design";
      rawComments: "not-returned-by-design";
      providerTargetMetadata: "forbidden";
      publicLaunchAllowed: false;
    };

type CommentTranslatorRealCommentsFeedSessionBridgeRecord = {
  sessionReferenceId: string;
  recordedAtMs: number;
  feed: CommentTranslatorRealCommentsFeedState;
};

export const commentTranslatorRealCommentsFeedSessionBridgeContract = {
  implementationStage: "free-public-beta-pl-g3-feed-bridge-session-persistence",
  runtime: "server-only",
  feedAuthority: "server-owned-session-scoped-safe-feed",
  persistedShape: "CommentTranslatorRealCommentsFeedState",
  readableByBrowser: "safe-feed-rows-only",
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  authorChannelMaterial: "not-returned-by-design",
  providerTargetMetadata: "forbidden",
  serverOnlyCursor: "not-returned-by-design",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  publicLaunchAllowed: false
} as const;

const feedByAuthorizedOwner = new Map<string, CommentTranslatorRealCommentsFeedSessionBridgeRecord>();

export function persistCommentTranslatorRealCommentsFeedForActiveSession({
  callerAuthorization,
  sessionReferenceId,
  feed,
  recordedAtMs = Date.now()
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  sessionReferenceId: string;
  feed: CommentTranslatorRealCommentsFeedState;
  recordedAtMs?: number;
}): CommentTranslatorRealCommentsFeedSessionBridgePersistResult {
  if (callerAuthorization.status !== "authorized") {
    return skippedPersist("skipped-caller-not-authorized");
  }

  if (!sessionReferenceId.trim()) {
    return skippedPersist("skipped-empty-session-reference");
  }

  if (feed.status !== "ready") {
    return skippedPersist("skipped-feed-not-ready");
  }

  feedByAuthorizedOwner.set(callerAuthorization.ownerUserId, {
    sessionReferenceId,
    recordedAtMs,
    feed
  });

  return {
    status: "persisted",
    feedAuthority: "server-owned-session-scoped-safe-feed",
    displayRowCount: feed.rows.length,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    publicLaunchAllowed: false
  };
}

export function readCommentTranslatorRealCommentsFeedForActiveSession({
  callerAuthorization,
  activeSession
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  activeSession: CommentTranslatorActiveSessionRecord | null;
}): CommentTranslatorRealCommentsFeedState {
  if (callerAuthorization.status !== "authorized" || !activeSession) {
    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: "session-not-active"
    });
  }

  const record = feedByAuthorizedOwner.get(callerAuthorization.ownerUserId);
  if (!record || record.sessionReferenceId !== activeSession.sessionReferenceId) {
    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: "live-provider-polling-not-approved"
    });
  }

  void record.recordedAtMs;
  return record.feed;
}

export function clearCommentTranslatorRealCommentsFeedForSession({
  callerAuthorization,
  sessionReferenceId
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  sessionReferenceId: string | null | undefined;
}) {
  if (callerAuthorization.status !== "authorized" || !sessionReferenceId) {
    return;
  }

  const record = feedByAuthorizedOwner.get(callerAuthorization.ownerUserId);
  if (record?.sessionReferenceId === sessionReferenceId) {
    feedByAuthorizedOwner.delete(callerAuthorization.ownerUserId);
  }
}

export function resetCommentTranslatorRealCommentsFeedSessionBridgeForTests() {
  feedByAuthorizedOwner.clear();
}

function skippedPersist(
  status: Extract<CommentTranslatorRealCommentsFeedSessionBridgePersistResult, { feedAuthority: "not-persisted" }>["status"]
): CommentTranslatorRealCommentsFeedSessionBridgePersistResult {
  return {
    status,
    feedAuthority: "not-persisted",
    displayRowCount: 0,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    publicLaunchAllowed: false
  };
}
