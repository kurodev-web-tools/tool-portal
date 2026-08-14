import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  CommentTranslatorRealCommentsDisplayRow,
  CommentTranslatorRealCommentsFeedState
} from "./comment-translator-real-comments-feed-shared";
import type { CommentTranslatorTargetLanguageId } from "./comment-translator";
import {
  commentTranslatorPaidRetentionPolicy,
  isCommentTranslatorPaidFeedSnapshotWithinHardLimit
} from "./comment-translator-paid-retention";

export type CommentTranslatorRealCommentsDurableFeedSnapshotRow = Pick<
  CommentTranslatorRealCommentsDisplayRow,
  | "originalText"
  | "translatedText"
  | "authorDisplayName"
> & {
  publishedAtIso: string | null;
};

export type CommentTranslatorRealCommentsDurableFeedSnapshot = Pick<
  CommentTranslatorRealCommentsFeedState,
  | "status"
  | "source"
  | "unavailableReason"
  | "rawProviderPayload"
  | "rawComments"
  | "providerTargetMetadata"
  | "serverOnlyCursor"
  | "browserStorage"
  | "handoffPayload"
  | "publicLaunchAllowed"
> & {
  rows: readonly CommentTranslatorRealCommentsDurableFeedSnapshotRow[];
};

export type CommentTranslatorRealCommentsFeedDurableRow = {
  id: string;
  owner_user_id: string;
  session_reference_id: string;
  feed_snapshot: CommentTranslatorRealCommentsDurableFeedSnapshot;
  display_row_count: number;
  recorded_at: string;
  created_at: string;
  updated_at: string;
};

export type CommentTranslatorRealCommentsFeedDurableStore = {
  persistSafeFeed: (request: {
    ownerUserId: string;
    sessionReferenceId: string;
    feed: CommentTranslatorRealCommentsFeedState;
    recordedAtIso: string;
  }) => Promise<CommentTranslatorRealCommentsFeedDurablePersistResult>;
  readSafeFeed: (request: {
    ownerUserId: string;
    sessionReferenceId: string;
    targetLanguage: CommentTranslatorTargetLanguageId;
  }) => Promise<CommentTranslatorRealCommentsFeedState | null>;
  clearSafeFeed: (request: {
    ownerUserId: string;
    sessionReferenceId: string;
  }) => Promise<void>;
};

export type CommentTranslatorRealCommentsFeedDurablePersistFailureBucketLabel =
  | "none"
  | "store-unavailable"
  | "table-shape-missing-or-unavailable"
  | "column-shape-mismatch"
  | "conflict-shape-mismatch"
  | "policy-or-permission-denied"
  | "owner-session-key-rejected"
  | "safe-feed-shape-rejected"
  | "row-write-not-confirmed"
  | "durable-store-operation-failed";

export type CommentTranslatorRealCommentsFeedDurablePersistDiagnostics = {
  storeReadyLabel: "ready" | "unavailable";
  tableShapeLabel: "available" | "missing-or-unavailable" | "column-shape-mismatch" | "conflict-shape-mismatch" | "unknown";
  persistOperationLabel: "upsert-select-single" | "not-run";
  persistFailureBucketLabel: CommentTranslatorRealCommentsFeedDurablePersistFailureBucketLabel;
  rowsTouchedCount: number;
  readbackLabel:
    | "readback-ready"
    | "readback-missing"
    | "readback-shape-mismatch"
    | "readback-failed"
    | "not-run-persist-failed"
    | "not-run-store-unavailable";
};

export type CommentTranslatorRealCommentsFeedDurablePersistResult = {
  durableFeedPersistResultLabel: "durable-feed-persisted" | "durable-feed-persist-failed";
  durableFeedPersistDiagnostics: CommentTranslatorRealCommentsFeedDurablePersistDiagnostics;
};

export type CommentTranslatorRealCommentsFeedDurableStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorRealCommentsFeedDurableStoreFactoryResult =
  | {
      status: "ready";
      store: CommentTranslatorRealCommentsFeedDurableStore;
      missingEnvReferences: readonly [];
      failClosed: false;
    }
  | {
      status: "unavailable";
      store: null;
      missingEnvReferences: readonly CommentTranslatorRealCommentsFeedDurableStoreFactoryEnvName[];
      failClosed: true;
      reason: "trusted-service-role-env-missing";
    };

type SupabaseSingleResult = {
  data: CommentTranslatorRealCommentsFeedDurableRow | null;
  error: { code?: string; message?: string } | null;
};

type SupabaseQuery = {
  select: (
    columns:
      | typeof commentTranslatorRealCommentsFeedDurableStoreContract.trustedSelectColumns
      | "id, display_row_count"
      | "id"
  ) => SupabaseQuery;
  upsert: (
    row: Omit<CommentTranslatorRealCommentsFeedDurableRow, "id" | "created_at">,
    options: { onConflict: "session_reference_id" }
  ) => SupabaseQuery;
  delete: () => SupabaseQuery;
  eq: (column: "owner_user_id" | "session_reference_id", value: string) => SupabaseQuery;
  single: () => Promise<SupabaseSingleResult>;
};

export type CommentTranslatorRealCommentsFeedDurableSupabaseClient = {
  from: (tableName: typeof commentTranslatorRealCommentsFeedDurableStoreContract.tableName) => SupabaseQuery;
};

export const commentTranslatorRealCommentsFeedDurableStoreContract = {
  implementationStage: "free-public-beta-pl-g3-browser-visible-feed-snapshot-persistence",
  runtime: "server-only",
  tableName: "comment_translator_real_comments_feed_snapshots",
  rowAccess: "trusted-server-service-role-only",
  feedAuthority: "durable-server-owned-session-scoped-safe-feed",
  browserReadableOutput: "safe-feed-rows-only",
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  authorChannelMaterial: "not-returned-by-design",
  providerTargetMetadata: "forbidden",
  serverOnlyCursor: "not-returned-by-design",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  retentionBoundary: "session-end-plus-24-hours",
  latestRowOnly: true,
  standardFeedSnapshotBytes: commentTranslatorPaidRetentionPolicy.standardFeedSnapshotBytes,
  hardFeedSnapshotBytes: commentTranslatorPaidRetentionPolicy.hardFeedSnapshotBytes,
  persistReadback: "id-and-count-only",
  activePollSupabaseEgress: "no-full-row-readback",
  durableFeedSnapshotRowKeys: [
    "originalText",
    "translatedText",
    "authorDisplayName",
    "publishedAtIso"
  ] as const,
  restoredIdentifierPolicy: "deterministic-browser-safe-not-provider-derived",
  publicLaunchAllowed: false,
  trustedSelectColumns:
    "id, owner_user_id, session_reference_id, feed_snapshot, display_row_count, recorded_at, created_at, updated_at",
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "server-only-cursor",
    "author-channel-id",
    "author-channel-url",
    "author-profile-image-url"
  ]
} as const;

export function createTrustedCommentTranslatorRealCommentsFeedDurableStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  env?: Partial<Record<CommentTranslatorRealCommentsFeedDurableStoreFactoryEnvName, string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorRealCommentsFeedDurableSupabaseClient;
  nowIso?: () => string;
} = {}): CommentTranslatorRealCommentsFeedDurableStoreFactoryResult {
  const trustedEnv = env ?? (process.env as Partial<Record<CommentTranslatorRealCommentsFeedDurableStoreFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorRealCommentsFeedDurableStoreFactoryEnvName[] = [];

  if (!url) {
    missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missingEnvReferences.length > 0 || !url || !serviceRoleKey) {
    return {
      status: "unavailable",
      store: null,
      missingEnvReferences,
      failClosed: true,
      reason: "trusted-service-role-env-missing"
    };
  }

  return {
    status: "ready",
    store: createCommentTranslatorRealCommentsFeedSupabaseDurableStore({
      supabase: createSupabaseClient(url, serviceRoleKey),
      nowIso
    }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorRealCommentsFeedSupabaseDurableStore({
  supabase,
  nowIso
}: {
  supabase: CommentTranslatorRealCommentsFeedDurableSupabaseClient;
  nowIso: () => string;
}): CommentTranslatorRealCommentsFeedDurableStore {
  return {
    async persistSafeFeed(request) {
      const feedSnapshot = projectCommentTranslatorRealCommentsFeedSnapshot(request.feed);
      if (!feedSnapshot || !isCommentTranslatorPaidFeedSnapshotWithinHardLimit(feedSnapshot)) {
        return {
          durableFeedPersistResultLabel: "durable-feed-persist-failed",
          durableFeedPersistDiagnostics: {
            storeReadyLabel: "ready",
            tableShapeLabel: "available",
            persistOperationLabel: "not-run",
            persistFailureBucketLabel: "safe-feed-shape-rejected",
            rowsTouchedCount: 0,
            readbackLabel: "not-run-persist-failed"
          }
        };
      }

      const result = await supabase
        .from(commentTranslatorRealCommentsFeedDurableStoreContract.tableName)
        .upsert(
          {
            owner_user_id: request.ownerUserId,
            session_reference_id: request.sessionReferenceId,
            feed_snapshot: feedSnapshot,
            display_row_count: feedSnapshot.rows.length,
            recorded_at: request.recordedAtIso,
            updated_at: nowIso()
          },
          { onConflict: "session_reference_id" }
        )
        .select("id, display_row_count")
        .single();

      const writeFailure = createPersistFailureDiagnosticsFromSupabaseResult(result);
      if (writeFailure) {
        return {
          durableFeedPersistResultLabel: "durable-feed-persist-failed",
          durableFeedPersistDiagnostics: writeFailure
        };
      }

      if (
        typeof result.data?.id !== "string"
        || result.data.id.trim().length === 0
        || result.data.display_row_count !== feedSnapshot.rows.length
      ) {
        return {
          durableFeedPersistResultLabel: "durable-feed-persist-failed",
          durableFeedPersistDiagnostics: {
            storeReadyLabel: "ready",
            tableShapeLabel: "available",
            persistOperationLabel: "upsert-select-single",
            persistFailureBucketLabel: "row-write-not-confirmed",
            rowsTouchedCount: 0,
            readbackLabel: "readback-shape-mismatch"
          }
        };
      }

      return {
        durableFeedPersistResultLabel: "durable-feed-persisted",
        durableFeedPersistDiagnostics: {
          storeReadyLabel: "ready",
          tableShapeLabel: "available",
          persistOperationLabel: "upsert-select-single",
          persistFailureBucketLabel: "none",
          rowsTouchedCount: 1,
          readbackLabel: "readback-ready"
        }
      };
    },
    async readSafeFeed(request) {
      const result = await supabase
        .from(commentTranslatorRealCommentsFeedDurableStoreContract.tableName)
        .select(commentTranslatorRealCommentsFeedDurableStoreContract.trustedSelectColumns)
        .eq("owner_user_id", request.ownerUserId)
        .eq("session_reference_id", request.sessionReferenceId)
        .single();

      if (!result.data && (!result.error || result.error.code === "PGRST116")) {
        return null;
      }

      if (result.error || !result.data) {
        throw new Error("Trusted comment translator feed snapshot read failed.");
      }

      const snapshot = normalizeDurableFeedSnapshot(result.data.feed_snapshot);
      return snapshot
        ? restoreCommentTranslatorRealCommentsFeedState({
            snapshot,
            restoredAtIso: nowIso(),
            targetLanguage: request.targetLanguage
          })
        : null;
    },
    async clearSafeFeed(request) {
      const result = await supabase
        .from(commentTranslatorRealCommentsFeedDurableStoreContract.tableName)
        .delete()
        .eq("owner_user_id", request.ownerUserId)
        .eq("session_reference_id", request.sessionReferenceId)
        .select("id")
        .single();

      if (result.error && result.error.code !== "PGRST116") {
        throw new Error("Trusted comment translator feed snapshot clear failed.");
      }
    }
  };
}

export function createInMemoryCommentTranslatorRealCommentsFeedDurableStoreForTests(): CommentTranslatorRealCommentsFeedDurableStore {
  const rowsByOwnerAndSession = new Map<string, CommentTranslatorRealCommentsDurableFeedSnapshot>();

  return {
    async persistSafeFeed(request) {
      const snapshot = projectCommentTranslatorRealCommentsFeedSnapshot(request.feed);
      if (!snapshot) {
        return {
          durableFeedPersistResultLabel: "durable-feed-persist-failed",
          durableFeedPersistDiagnostics: {
            storeReadyLabel: "ready",
            tableShapeLabel: "available",
            persistOperationLabel: "not-run",
            persistFailureBucketLabel: "safe-feed-shape-rejected",
            rowsTouchedCount: 0,
            readbackLabel: "not-run-persist-failed"
          }
        };
      }
      rowsByOwnerAndSession.set(toStoreKey(request), snapshot);
      return {
        durableFeedPersistResultLabel: "durable-feed-persisted",
        durableFeedPersistDiagnostics: {
          storeReadyLabel: "ready",
          tableShapeLabel: "available",
          persistOperationLabel: "upsert-select-single",
          persistFailureBucketLabel: "none",
          rowsTouchedCount: 1,
          readbackLabel: "readback-ready"
        }
      };
    },
    async readSafeFeed(request) {
      const snapshot = rowsByOwnerAndSession.get(toStoreKey(request));
      return snapshot
        ? restoreCommentTranslatorRealCommentsFeedState({
            snapshot,
            restoredAtIso: new Date().toISOString(),
            targetLanguage: request.targetLanguage
          })
        : null;
    },
    async clearSafeFeed(request) {
      rowsByOwnerAndSession.delete(toStoreKey(request));
    }
  };
}

export function projectCommentTranslatorRealCommentsFeedSnapshot(
  value: unknown
): CommentTranslatorRealCommentsDurableFeedSnapshot | null {
  if (!isRecord(value) || !isFeedProtocolEnvelope(value) || !Array.isArray(value.rows)) {
    return null;
  }

  const rows: CommentTranslatorRealCommentsDurableFeedSnapshotRow[] = [];
  for (const valueRow of value.rows) {
    if (!isRecord(valueRow) || !isProjectableFeedRow(valueRow)) {
      return null;
    }
    rows.push({
      originalText: valueRow.originalText,
      translatedText: valueRow.translatedText,
      authorDisplayName: sanitizeAuthorDisplayName(valueRow.authorDisplayName),
      publishedAtIso: normalizeSafePublishedAtIso(valueRow.publishedAtIso)
    });
  }

  const snapshot: CommentTranslatorRealCommentsDurableFeedSnapshot = {
    status: value.status,
    source: "server-owned-live-session-state",
    rows,
    unavailableReason: isUnavailableReason(value.unavailableReason) ? value.unavailableReason : null,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    publicLaunchAllowed: false
  };
  return isCommentTranslatorPaidFeedSnapshotWithinHardLimit(snapshot) ? snapshot : null;
}

export function restoreCommentTranslatorRealCommentsFeedState({
  snapshot,
  targetLanguage
}: {
  snapshot: CommentTranslatorRealCommentsDurableFeedSnapshot;
  restoredAtIso: string;
  targetLanguage: CommentTranslatorTargetLanguageId;
}): CommentTranslatorRealCommentsFeedState {
  const rows = snapshot.rows.map((row, index): CommentTranslatorRealCommentsDisplayRow => ({
    id: `restored-safe-row-${index}`,
    provider: "youtube",
    messageReferenceId: `restored-safe-row-${index}`,
    kind: "text",
    timestamp: "--:-- UTC",
    publishedAtIso: row.publishedAtIso ?? deterministicRestoredPublishedAtIso(snapshot.rows.length, index),
    source: "youtube-live-chat",
    sourceAttributionLabel: "Source: YouTube Live Chat",
    role: "unknown",
    authorLabel: "YouTube viewer",
    authorDisplayName: row.authorDisplayName,
    originalText: row.originalText,
    translatedText: row.translatedText,
    targetLanguage,
    translationStatus: row.translatedText !== null ? "translated-f10" : "not-run-f9",
    translationCacheStatus: null,
    moderationLabel: "visible",
    deletionPropagation: "not-deleted",
    badgeLabel: null,
    purchaseLabel: null,
    memberMonthCount: null,
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    authorChannelMaterial: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design"
  }));

  return {
    status: snapshot.status,
    source: "server-owned-live-session-state",
    rows,
    unavailableReason: snapshot.unavailableReason,
    sanitizedSummary: {
      displayRowCount: rows.length,
      safeRowSource: "f8-browser-safe-projection",
      fixtureFeedAuthority: "disabled",
      manualFeedAuthority: "disabled",
      rawProviderPayload: "not-returned-by-design",
      rawComments: "not-returned-by-design",
      authorChannelMaterial: "not-returned-by-design",
      providerTargetMetadata: "forbidden",
      serverOnlyCursor: "not-returned-by-design",
      liveProviderDiagnostics: null
    },
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    publicLaunchAllowed: false
  };
}

function normalizeDurableFeedSnapshot(value: unknown): CommentTranslatorRealCommentsDurableFeedSnapshot | null {
  if (isDurableFeedSnapshot(value)) {
    return value;
  }
  return projectCommentTranslatorRealCommentsFeedSnapshot(value);
}

function isDurableFeedSnapshot(value: unknown): value is CommentTranslatorRealCommentsDurableFeedSnapshot {
  if (!isRecord(value) || !isFeedProtocolEnvelope(value) || !Array.isArray(value.rows)) {
    return false;
  }
  return value.rows.every((row) => {
    if (!isRecord(row) || !isDurableFeedSnapshotRow(row)) {
      return false;
    }
    const keys = Object.keys(row).sort();
    const allowedKeys = [...commentTranslatorRealCommentsFeedDurableStoreContract.durableFeedSnapshotRowKeys].sort();
    return keys.length === allowedKeys.length && keys.every((key, index) => key === allowedKeys[index]);
  }) && isCommentTranslatorPaidFeedSnapshotWithinHardLimit(value as { rows: readonly unknown[] });
}

function isFeedProtocolEnvelope(value: Record<string, unknown>) {
  return (
    (value.status === "ready" || value.status === "inactive" || value.status === "unavailable")
    && value.source === "server-owned-live-session-state"
    && value.rawProviderPayload === "not-returned-by-design"
    && value.rawComments === "not-returned-by-design"
    && value.providerTargetMetadata === "forbidden"
    && value.serverOnlyCursor === "not-returned-by-design"
    && isUnavailableReason(value.unavailableReason)
    && value.browserStorage === "unchanged"
    && value.handoffPayload === "unchanged"
    && value.publicLaunchAllowed === false
  );
}

function isProjectableFeedRow(row: Record<string, unknown>): boolean {
  return (
    isNullableString(row.originalText)
    && isNullableString(row.translatedText)
    && isNullableString(row.authorDisplayName)
    && (row.publishedAtIso === undefined || row.publishedAtIso === null || normalizeSafePublishedAtIso(row.publishedAtIso) !== null)
  );
}

function isDurableFeedSnapshotRow(row: Record<string, unknown>): row is CommentTranslatorRealCommentsDurableFeedSnapshotRow {
  return isProjectableFeedRow(row)
    && Object.keys(row).length === commentTranslatorRealCommentsFeedDurableStoreContract.durableFeedSnapshotRowKeys.length;
}

export function createCommentTranslatorSafeFeedConvergenceKey(
  row: Pick<
    CommentTranslatorRealCommentsDisplayRow,
    "originalText" | "authorDisplayName" | "publishedAtIso"
  >
) {
  return JSON.stringify([
    row.originalText,
    sanitizeAuthorDisplayName(row.authorDisplayName),
    normalizeSafePublishedAtIso(row.publishedAtIso)
  ]);
}

function normalizeSafePublishedAtIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function deterministicRestoredPublishedAtIso(rowCount: number, index: number) {
  return new Date(Math.max(0, rowCount - index)).toISOString();
}

function sanitizeAuthorDisplayName(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const compact = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return compact || null;
}

function isUnavailableReason(value: unknown): value is CommentTranslatorRealCommentsFeedState["unavailableReason"] {
  return value === null || [
    "session-not-active",
    "live-provider-polling-not-approved",
    "polling-runtime-not-wired",
    "durable-usage-ledger-unavailable"
  ].includes(String(value));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStoreKey({
  ownerUserId,
  sessionReferenceId
}: {
  ownerUserId: string;
  sessionReferenceId: string;
}) {
  return `${ownerUserId}:${sessionReferenceId}`;
}

export function createUnavailableCommentTranslatorRealCommentsFeedDurablePersistDiagnostics(): CommentTranslatorRealCommentsFeedDurablePersistDiagnostics {
  return {
    storeReadyLabel: "unavailable",
    tableShapeLabel: "unknown",
    persistOperationLabel: "not-run",
    persistFailureBucketLabel: "store-unavailable",
    rowsTouchedCount: 0,
    readbackLabel: "not-run-store-unavailable"
  };
}

export function createFailedCommentTranslatorRealCommentsFeedDurablePersistDiagnostics(
  error: unknown
): CommentTranslatorRealCommentsFeedDurablePersistDiagnostics {
  const bucket = resolvePersistFailureBucket(readSupabaseErrorCode(error));
  return {
    storeReadyLabel: "ready",
    tableShapeLabel: resolveTableShapeLabel(bucket),
    persistOperationLabel: "upsert-select-single",
    persistFailureBucketLabel: bucket,
    rowsTouchedCount: 0,
    readbackLabel: "not-run-persist-failed"
  };
}

function createPersistFailureDiagnosticsFromSupabaseResult(
  result: SupabaseSingleResult
): CommentTranslatorRealCommentsFeedDurablePersistDiagnostics | null {
  if (!result.error && result.data) {
    return null;
  }

  const bucket = resolvePersistFailureBucket(result.error?.code);
  return {
    storeReadyLabel: "ready",
    tableShapeLabel: resolveTableShapeLabel(bucket),
    persistOperationLabel: "upsert-select-single",
    persistFailureBucketLabel: result.error ? bucket : "row-write-not-confirmed",
    rowsTouchedCount: 0,
    readbackLabel: "not-run-persist-failed"
  };
}

function resolvePersistFailureBucket(code: string | undefined): CommentTranslatorRealCommentsFeedDurablePersistFailureBucketLabel {
  if (code === "42P01" || code === "PGRST205") {
    return "table-shape-missing-or-unavailable";
  }

  if (code === "42703" || code === "PGRST204") {
    return "column-shape-mismatch";
  }

  if (code === "42P10") {
    return "conflict-shape-mismatch";
  }

  if (code === "42501" || code === "401" || code === "403") {
    return "policy-or-permission-denied";
  }

  if (code === "22P02" || code === "23503") {
    return "owner-session-key-rejected";
  }

  if (code === "23514") {
    return "safe-feed-shape-rejected";
  }

  return "durable-store-operation-failed";
}

function resolveTableShapeLabel(
  bucket: CommentTranslatorRealCommentsFeedDurablePersistFailureBucketLabel
): CommentTranslatorRealCommentsFeedDurablePersistDiagnostics["tableShapeLabel"] {
  if (bucket === "table-shape-missing-or-unavailable") {
    return "missing-or-unavailable";
  }

  if (bucket === "column-shape-mismatch") {
    return "column-shape-mismatch";
  }

  if (bucket === "conflict-shape-mismatch") {
    return "conflict-shape-mismatch";
  }

  if (bucket === "none") {
    return "available";
  }

  return "unknown";
}

function readSupabaseErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorRealCommentsFeedDurableStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorRealCommentsFeedDurableStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorRealCommentsFeedDurableSupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as unknown as CommentTranslatorRealCommentsFeedDurableSupabaseClient;
}
