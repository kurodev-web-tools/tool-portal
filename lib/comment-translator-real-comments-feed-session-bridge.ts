import "server-only";

import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { CommentTranslatorActiveSessionRecord } from "./comment-translator-session-runtime";
import { persistCommentTranslatorCreatorHistorySnapshot } from "./comment-translator-creator-history";
import type { CommentTranslatorCreatorHistoryStoreFactoryResult } from "./comment-translator-creator-history-store";
import type { CommentTranslatorCreatorHistoryAccess } from "./comment-translator-creator-history-types";
import {
  createUnavailableCommentTranslatorRealCommentsFeedState
} from "./comment-translator-real-comments-ui-wiring";
import type { CommentTranslatorRealCommentsFeedState } from "./comment-translator-real-comments-feed-shared";
import {
  createTrustedCommentTranslatorRealCommentsFeedDurableStore,
  createFailedCommentTranslatorRealCommentsFeedDurablePersistDiagnostics,
  createUnavailableCommentTranslatorRealCommentsFeedDurablePersistDiagnostics,
  type CommentTranslatorRealCommentsFeedDurablePersistDiagnostics,
  type CommentTranslatorRealCommentsFeedDurableStoreFactoryResult
} from "./comment-translator-real-comments-feed-durable-store";

export type CommentTranslatorRealCommentsFeedSessionBridgePersistResult =
  | {
      status: "persisted";
      feedAuthority: "server-owned-session-scoped-safe-feed";
      durableFeedPersistResultLabel: "durable-feed-persisted" | "durable-feed-store-unavailable" | "durable-feed-persist-failed";
      durableFeedPersistDiagnostics: CommentTranslatorRealCommentsFeedDurablePersistDiagnostics;
      displayRowCount: number;
      rawProviderPayload: "not-returned-by-design";
      rawComments: "not-returned-by-design";
      providerTargetMetadata: "forbidden";
      publicLaunchAllowed: false;
    }
  | {
      status: "skipped-caller-not-authorized" | "skipped-empty-session-reference" | "skipped-feed-not-ready";
      feedAuthority: "not-persisted";
      durableFeedPersistResultLabel: "not-run";
      durableFeedPersistDiagnostics: CommentTranslatorRealCommentsFeedDurablePersistDiagnostics;
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
  durableAuthority: "comment_translator_real_comments_feed_snapshots",
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
  recordedAtMs = Date.now(),
  durableFeedStore,
  creatorHistoryAccess,
  historyStore
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  sessionReferenceId: string;
  feed: CommentTranslatorRealCommentsFeedState;
  recordedAtMs?: number;
  durableFeedStore?: CommentTranslatorRealCommentsFeedDurableStoreFactoryResult;
  creatorHistoryAccess: CommentTranslatorCreatorHistoryAccess;
  historyStore?: CommentTranslatorCreatorHistoryStoreFactoryResult;
}): Promise<CommentTranslatorRealCommentsFeedSessionBridgePersistResult> {
  if (callerAuthorization.status !== "authorized") {
    return Promise.resolve(skippedPersist("skipped-caller-not-authorized"));
  }

  if (!sessionReferenceId.trim()) {
    return Promise.resolve(skippedPersist("skipped-empty-session-reference"));
  }

  if (feed.status !== "ready") {
    return Promise.resolve(skippedPersist("skipped-feed-not-ready"));
  }

  feedByAuthorizedOwner.set(callerAuthorization.ownerUserId, {
    sessionReferenceId,
    recordedAtMs,
    feed
  });

  return persistDurableSafeFeed({
    callerAuthorization,
    sessionReferenceId,
    feed,
    recordedAtMs,
    durableFeedStore
  }).then(async (durableFeedPersistResult) => {
    await persistCommentTranslatorCreatorHistorySnapshot({
      callerAuthorization,
      creatorAccess: creatorHistoryAccess,
      sessionReferenceId,
      feed,
      recordedAtMs,
      historyStore
    });
    return {
      status: "persisted",
      feedAuthority: "server-owned-session-scoped-safe-feed",
      durableFeedPersistResultLabel: durableFeedPersistResult.durableFeedPersistResultLabel,
      durableFeedPersistDiagnostics: durableFeedPersistResult.durableFeedPersistDiagnostics,
      displayRowCount: feed.rows.length,
      rawProviderPayload: "not-returned-by-design",
      rawComments: "not-returned-by-design",
      providerTargetMetadata: "forbidden",
      publicLaunchAllowed: false
    };
  });
}

export async function readCommentTranslatorRealCommentsFeedForActiveSession({
  callerAuthorization,
  activeSession,
  durableFeedStore
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  activeSession: CommentTranslatorActiveSessionRecord | null;
  durableFeedStore?: CommentTranslatorRealCommentsFeedDurableStoreFactoryResult;
}): Promise<CommentTranslatorRealCommentsFeedState> {
  if (callerAuthorization.status !== "authorized" || !activeSession) {
    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: "session-not-active"
    });
  }

  const record = feedByAuthorizedOwner.get(callerAuthorization.ownerUserId);
  if (!record || record.sessionReferenceId !== activeSession.sessionReferenceId) {
    const durableFeed = await readDurableSafeFeed({
      callerAuthorization,
      activeSession,
      durableFeedStore
    });
    if (durableFeed) {
      feedByAuthorizedOwner.set(callerAuthorization.ownerUserId, {
        sessionReferenceId: activeSession.sessionReferenceId,
        recordedAtMs: Date.now(),
        feed: durableFeed
      });

      return durableFeed;
    }

    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: "live-provider-polling-not-approved"
    });
  }

  void record.recordedAtMs;
  return record.feed;
}

export async function clearCommentTranslatorRealCommentsFeedForSession({
  callerAuthorization,
  sessionReferenceId,
  durableFeedStore
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  sessionReferenceId: string | null | undefined;
  durableFeedStore?: CommentTranslatorRealCommentsFeedDurableStoreFactoryResult;
}) {
  if (callerAuthorization.status !== "authorized" || !sessionReferenceId) {
    return;
  }

  const record = feedByAuthorizedOwner.get(callerAuthorization.ownerUserId);
  if (record?.sessionReferenceId === sessionReferenceId) {
    feedByAuthorizedOwner.delete(callerAuthorization.ownerUserId);
  }

  const durableStore = durableFeedStore ?? createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  if (durableStore.status !== "ready") {
    return;
  }

  try {
    await durableStore.store.clearSafeFeed({
      ownerUserId: callerAuthorization.ownerUserId,
      sessionReferenceId
    });
  } catch {
    return;
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
    durableFeedPersistResultLabel: "not-run",
    durableFeedPersistDiagnostics: {
      storeReadyLabel: "unavailable",
      tableShapeLabel: "unknown",
      persistOperationLabel: "not-run",
      persistFailureBucketLabel: "store-unavailable",
      rowsTouchedCount: 0,
      readbackLabel: "not-run-store-unavailable"
    },
    displayRowCount: 0,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    publicLaunchAllowed: false
  };
}

async function persistDurableSafeFeed({
  callerAuthorization,
  sessionReferenceId,
  feed,
  recordedAtMs,
  durableFeedStore
}: {
  callerAuthorization: Extract<YouTubeOAuthCredentialStatusCallerAuthorization, { status: "authorized" }>;
  sessionReferenceId: string;
  feed: CommentTranslatorRealCommentsFeedState;
  recordedAtMs: number;
  durableFeedStore?: CommentTranslatorRealCommentsFeedDurableStoreFactoryResult;
}) {
  const durableStore = durableFeedStore ?? createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  if (durableStore.status !== "ready") {
    return {
      durableFeedPersistResultLabel: "durable-feed-store-unavailable" as const,
      durableFeedPersistDiagnostics: createUnavailableCommentTranslatorRealCommentsFeedDurablePersistDiagnostics()
    };
  }

  try {
    const result = await durableStore.store.persistSafeFeed({
      ownerUserId: callerAuthorization.ownerUserId,
      sessionReferenceId,
      feed,
      recordedAtIso: new Date(recordedAtMs).toISOString()
    });
    return result;
  } catch (error) {
    return {
      durableFeedPersistResultLabel: "durable-feed-persist-failed" as const,
      durableFeedPersistDiagnostics: createFailedCommentTranslatorRealCommentsFeedDurablePersistDiagnostics(error)
    };
  }
}

async function readDurableSafeFeed({
  callerAuthorization,
  activeSession,
  durableFeedStore
}: {
  callerAuthorization: Extract<YouTubeOAuthCredentialStatusCallerAuthorization, { status: "authorized" }>;
  activeSession: CommentTranslatorActiveSessionRecord;
  durableFeedStore?: CommentTranslatorRealCommentsFeedDurableStoreFactoryResult;
}) {
  const durableStore = durableFeedStore ?? createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  if (durableStore.status !== "ready") {
    return null;
  }

  try {
    return await durableStore.store.readSafeFeed({
      ownerUserId: callerAuthorization.ownerUserId,
      sessionReferenceId: activeSession.sessionReferenceId
    });
  } catch {
    return null;
  }
}
