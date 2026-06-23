import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { CommentTranslatorRealCommentsFeedState } from "./comment-translator-real-comments-feed-shared";

export type CommentTranslatorRealCommentsFeedDurableRow = {
  id: string;
  owner_user_id: string;
  session_reference_id: string;
  feed_snapshot: CommentTranslatorRealCommentsFeedState;
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
  }) => Promise<void>;
  readSafeFeed: (request: {
    ownerUserId: string;
    sessionReferenceId: string;
  }) => Promise<CommentTranslatorRealCommentsFeedState | null>;
  clearSafeFeed: (request: {
    ownerUserId: string;
    sessionReferenceId: string;
  }) => Promise<void>;
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
  select: (columns: typeof commentTranslatorRealCommentsFeedDurableStoreContract.trustedSelectColumns) => SupabaseQuery;
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
      const result = await supabase
        .from(commentTranslatorRealCommentsFeedDurableStoreContract.tableName)
        .upsert(
          {
            owner_user_id: request.ownerUserId,
            session_reference_id: request.sessionReferenceId,
            feed_snapshot: request.feed,
            display_row_count: request.feed.rows.length,
            recorded_at: request.recordedAtIso,
            updated_at: nowIso()
          },
          { onConflict: "session_reference_id" }
        )
        .select(commentTranslatorRealCommentsFeedDurableStoreContract.trustedSelectColumns)
        .single();

      assertSuccessfulWrite(result);
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

      return isDurableSafeFeedState(result.data.feed_snapshot) ? result.data.feed_snapshot : null;
    },
    async clearSafeFeed(request) {
      const result = await supabase
        .from(commentTranslatorRealCommentsFeedDurableStoreContract.tableName)
        .delete()
        .eq("owner_user_id", request.ownerUserId)
        .eq("session_reference_id", request.sessionReferenceId)
        .select(commentTranslatorRealCommentsFeedDurableStoreContract.trustedSelectColumns)
        .single();

      if (result.error && result.error.code !== "PGRST116") {
        throw new Error("Trusted comment translator feed snapshot clear failed.");
      }
    }
  };
}

export function createInMemoryCommentTranslatorRealCommentsFeedDurableStoreForTests(): CommentTranslatorRealCommentsFeedDurableStore {
  const rowsByOwnerAndSession = new Map<string, CommentTranslatorRealCommentsFeedState>();

  return {
    async persistSafeFeed(request) {
      rowsByOwnerAndSession.set(toStoreKey(request), request.feed);
    },
    async readSafeFeed(request) {
      return rowsByOwnerAndSession.get(toStoreKey(request)) ?? null;
    },
    async clearSafeFeed(request) {
      rowsByOwnerAndSession.delete(toStoreKey(request));
    }
  };
}

function isDurableSafeFeedState(value: unknown): value is CommentTranslatorRealCommentsFeedState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const feed = value as Partial<CommentTranslatorRealCommentsFeedState>;
  return (
    (feed.status === "ready" || feed.status === "inactive" || feed.status === "unavailable") &&
    feed.source === "server-owned-live-session-state" &&
    Array.isArray(feed.rows) &&
    feed.rawProviderPayload === "not-returned-by-design" &&
    feed.rawComments === "not-returned-by-design" &&
    feed.providerTargetMetadata === "forbidden" &&
    feed.serverOnlyCursor === "not-returned-by-design" &&
    feed.browserStorage === "unchanged" &&
    feed.handoffPayload === "unchanged" &&
    feed.publicLaunchAllowed === false
  );
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

function assertSuccessfulWrite(result: SupabaseSingleResult) {
  if (result.error || !result.data) {
    throw new Error("Trusted comment translator feed snapshot write failed.");
  }
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
