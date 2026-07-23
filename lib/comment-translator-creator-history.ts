import "server-only";

import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { CommentTranslatorRealCommentsFeedState } from "./comment-translator-real-comments-feed-shared";
import {
  createTrustedCommentTranslatorCreatorHistoryStore,
  type CommentTranslatorCreatorHistoryStoreFactoryResult
} from "./comment-translator-creator-history-store";
import {
  projectCommentTranslatorCreatorHistoryEntries,
  projectCommentTranslatorCreatorHistoryRows
} from "./comment-translator-creator-history-projection";
import type {
  CommentTranslatorCreatorHistoryAccess,
  CommentTranslatorCreatorHistoryCleanupResult,
  CommentTranslatorCreatorHistoryState
} from "./comment-translator-creator-history-types";
export type {
  CommentTranslatorCreatorHistoryAccess,
  CommentTranslatorCreatorHistoryCleanupResult,
  CommentTranslatorCreatorHistoryDisplayRow,
  CommentTranslatorCreatorHistoryState
} from "./comment-translator-creator-history-types";

const rollingWindowMs = 7 * 24 * 60 * 60 * 1_000;

export const commentTranslatorCreatorHistoryContract = {
  implementationStage: "creator-closed-beta-c11-simple-seven-day-history",
  rollingWindowDays: 7,
  cutoffAuthority: "server-derived-recorded-at-inclusive",
  ownerAuthority: "authenticated-server-derived-caller-only",
  browserInputAuthority: "display-refresh-only",
  persistedShape: "browser-safe-history-display-rows-only",
  deletedMessagePropagation: "message-reference-tombstone-without-reference-output",
  cleanup: "owner-scoped-deterministic-idempotent-service-role-only",
  providerExecution: "forbidden",
  browserStorage: "unchanged",
  publicApi: "unchanged"
} as const;

export async function persistCommentTranslatorCreatorHistorySnapshot({
  callerAuthorization,
  creatorAccess,
  sessionReferenceId,
  feed,
  recordedAtMs = Date.now(),
  historyStore
}: {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly creatorAccess: CommentTranslatorCreatorHistoryAccess;
  readonly sessionReferenceId: string;
  readonly feed: CommentTranslatorRealCommentsFeedState;
  readonly recordedAtMs?: number;
  readonly historyStore?: CommentTranslatorCreatorHistoryStoreFactoryResult;
}): Promise<{
  readonly status:
    | "persisted"
    | "skipped-caller-not-authorized"
    | "skipped-creator-access-unavailable"
    | "skipped-empty-session-reference"
    | "skipped-feed-not-ready"
    | "skipped-feed-unreadable"
    | "history-store-unavailable";
}> {
  if (callerAuthorization.status !== "authorized") {
    return { status: "skipped-caller-not-authorized" };
  }
  if (creatorAccess !== "paid-active") {
    return { status: "skipped-creator-access-unavailable" };
  }
  if (!sessionReferenceId.trim()) return { status: "skipped-empty-session-reference" };
  if (feed.status !== "ready") return { status: "skipped-feed-not-ready" };
  const rows = projectCommentTranslatorCreatorHistoryRows(feed.rows);
  if (!rows) return { status: "skipped-feed-unreadable" };
  const storeFactory = resolveHistoryStore(historyStore);
  if (storeFactory.status !== "ready") return { status: "history-store-unavailable" };
  try {
    await storeFactory.store.persistSnapshot({
      ownerUserId: callerAuthorization.ownerUserId,
      sessionReferenceId,
      recordedAtIso: new Date(recordedAtMs).toISOString(),
      rows
    });
    return { status: "persisted" };
  } catch {
    return { status: "history-store-unavailable" };
  }
}

export async function readCommentTranslatorCreatorHistory({
  callerAuthorization,
  creatorAccess,
  nowMs = Date.now(),
  historyStore
}: {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly creatorAccess: CommentTranslatorCreatorHistoryAccess;
  readonly nowMs?: number;
  readonly historyStore?: CommentTranslatorCreatorHistoryStoreFactoryResult;
}): Promise<CommentTranslatorCreatorHistoryState> {
  if (callerAuthorization.status !== "authorized") return unavailable("auth-unavailable");
  if (creatorAccess !== "paid-active") return unavailable("creator-access-unavailable");
  const storeFactory = resolveHistoryStore(historyStore);
  if (storeFactory.status !== "ready") return unavailable("history-store-unavailable");
  const windowEndedAtIso = new Date(nowMs).toISOString();
  const windowStartedAtIso = new Date(nowMs - rollingWindowMs).toISOString();
  try {
    await storeFactory.store.deleteExpiredForOwner({
      ownerUserId: callerAuthorization.ownerUserId,
      cutoffIso: windowStartedAtIso
    });
    const storedRows = await storeFactory.store.readHistorySince({
      ownerUserId: callerAuthorization.ownerUserId,
      cutoffIso: windowStartedAtIso,
      nowIso: windowEndedAtIso
    });
    const entries = projectCommentTranslatorCreatorHistoryEntries({
      ownerUserId: callerAuthorization.ownerUserId,
      storedRows,
      windowStartedAtIso,
      windowEndedAtIso
    });
    if (!entries) return unavailable("history-unreadable");
    return { status: "ready", entries, windowStartedAtIso, windowEndedAtIso };
  } catch {
    return unavailable("history-unreadable");
  }
}

export async function cleanupCommentTranslatorCreatorHistoryForOwner({
  callerAuthorization,
  trigger,
  historyStore
}: {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly trigger: "oauth-disconnect" | "account-deletion";
  readonly historyStore?: CommentTranslatorCreatorHistoryStoreFactoryResult;
}): Promise<CommentTranslatorCreatorHistoryCleanupResult> {
  if (callerAuthorization.status !== "authorized") {
    return { status: "unavailable", trigger, reason: "auth-unavailable", ownerScoped: true, idempotent: true };
  }
  const storeFactory = resolveHistoryStore(historyStore);
  if (storeFactory.status !== "ready") {
    return {
      status: "unavailable",
      trigger,
      reason: "history-store-unavailable",
      ownerScoped: true,
      idempotent: true
    };
  }
  try {
    await storeFactory.store.deleteAllForOwner({ ownerUserId: callerAuthorization.ownerUserId });
    return { status: "completed", trigger, ownerScoped: true, idempotent: true };
  } catch {
    return {
      status: "unavailable",
      trigger,
      reason: "history-store-unavailable",
      ownerScoped: true,
      idempotent: true
    };
  }
}

function unavailable(reason: Extract<CommentTranslatorCreatorHistoryState, { status: "unavailable" }>["reason"]):
  Extract<CommentTranslatorCreatorHistoryState, { status: "unavailable" }> {
  return { status: "unavailable", reason, entries: [], windowStartedAtIso: null, windowEndedAtIso: null };
}

function resolveHistoryStore(
  historyStore: CommentTranslatorCreatorHistoryStoreFactoryResult | undefined
): CommentTranslatorCreatorHistoryStoreFactoryResult {
  if (historyStore) return historyStore;
  try {
    return createTrustedCommentTranslatorCreatorHistoryStore();
  } catch {
    return {
      status: "unavailable",
      store: null,
      missingEnvReferences: [],
      reason: "trusted-service-role-env-missing"
    };
  }
}
