import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  CommentTranslatorCreatorHistoryStoredRow,
  CommentTranslatorCreatorHistoryStore,
  CommentTranslatorCreatorHistoryStoreFactoryEnvName,
  CommentTranslatorCreatorHistoryStoreFactoryResult,
  CommentTranslatorCreatorHistorySupabaseClient
} from "./comment-translator-creator-history-store-types";
export type {
  CommentTranslatorCreatorHistoryStoredRow,
  CommentTranslatorCreatorHistoryStore,
  CommentTranslatorCreatorHistoryStoreFactoryEnvName,
  CommentTranslatorCreatorHistoryStoreFactoryResult,
  CommentTranslatorCreatorHistorySupabaseClient
} from "./comment-translator-creator-history-store-types";

type CreatorHistoryDbRow = {
  readonly owner_user_id: unknown;
  readonly session_reference_id: unknown;
  readonly history_rows: unknown;
  readonly recorded_at: unknown;
};

export const commentTranslatorCreatorHistoryStoreContract = {
  implementationStage: "creator-closed-beta-c11-simple-seven-day-history",
  runtime: "server-only",
  tableName: "comment_translator_creator_history",
  rowAccess: "trusted-server-service-role-only",
  ownerIsolation: "owner-filter-required-for-every-operation",
  retentionBoundary: "recorded-at-greater-than-or-equal-to-server-derived-seven-day-cutoff",
  cleanup: "owner-scoped-deterministic-idempotent",
  remoteSupabaseMigrationApply: "not-run-in-c11-local-implementation",
  remoteSupabaseMutation: "not-run-by-codex-in-c11-local-implementation"
} as const;

export function createTrustedCommentTranslatorCreatorHistoryStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  readonly env?: Partial<Record<CommentTranslatorCreatorHistoryStoreFactoryEnvName, string | undefined>>;
  readonly createSupabaseClient?: (
    url: string,
    serviceRoleKey: string
  ) => CommentTranslatorCreatorHistorySupabaseClient;
  readonly nowIso?: () => string;
} = {}): CommentTranslatorCreatorHistoryStoreFactoryResult {
  const trustedEnv = env ?? process.env;
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorCreatorHistoryStoreFactoryEnvName[] = [];
  if (!url) missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    return {
      status: "unavailable",
      store: null,
      missingEnvReferences,
      reason: "trusted-service-role-env-missing"
    };
  }
  try {
    return {
      status: "ready",
      store: createCommentTranslatorCreatorHistorySupabaseStore({
        supabase: createSupabaseClient(url, serviceRoleKey),
        nowIso
      }),
      missingEnvReferences: []
    };
  } catch {
    return {
      status: "unavailable",
      store: null,
      missingEnvReferences: [],
      reason: "trusted-service-role-client-unavailable"
    };
  }
}

export function createCommentTranslatorCreatorHistorySupabaseStore({
  supabase,
  nowIso
}: {
  readonly supabase: CommentTranslatorCreatorHistorySupabaseClient;
  readonly nowIso: () => string;
}): CommentTranslatorCreatorHistoryStore {
  return {
    async persistSnapshot(request) {
      const result = await supabase.upsertHistory({
        owner_user_id: request.ownerUserId,
        session_reference_id: request.sessionReferenceId,
        history_rows: request.rows,
        recorded_at: request.recordedAtIso,
        updated_at: nowIso()
      });
      if (result.error) throw new CommentTranslatorCreatorHistoryStoreError("write-failed");
    },
    async readHistorySince(request) {
      const result = await supabase.readHistory(request);
      if (result.error) throw new CommentTranslatorCreatorHistoryStoreError("read-failed");
      const rows = parseDbRows(result.data);
      if (!rows) throw new CommentTranslatorCreatorHistoryStoreError("row-unreadable");
      return rows;
    },
    async deleteExpiredForOwner(request) {
      const result = await supabase.deleteExpired(request);
      if (result.error) throw new CommentTranslatorCreatorHistoryStoreError("cleanup-failed");
    },
    async deleteAllForOwner(request) {
      const result = await supabase.deleteAll(request);
      if (result.error) throw new CommentTranslatorCreatorHistoryStoreError("cleanup-failed");
    }
  };
}

export function createInMemoryCommentTranslatorCreatorHistoryStoreForTests(): CommentTranslatorCreatorHistoryStore {
  const rowsByOwnerAndSession = new Map<string, CommentTranslatorCreatorHistoryStoredRow>();
  return {
    async persistSnapshot(request) {
      rowsByOwnerAndSession.set(toStoreKey(request.ownerUserId, request.sessionReferenceId), request);
    },
    async readHistorySince({ ownerUserId, cutoffIso, nowIso }) {
      return [...rowsByOwnerAndSession.values()]
        .filter(
          (row) =>
            row.ownerUserId === ownerUserId &&
            row.recordedAtIso >= cutoffIso &&
            row.recordedAtIso <= nowIso
        )
        .sort((left, right) => right.recordedAtIso.localeCompare(left.recordedAtIso));
    },
    async deleteExpiredForOwner({ ownerUserId, cutoffIso }) {
      for (const [key, row] of rowsByOwnerAndSession) {
        if (row.ownerUserId === ownerUserId && row.recordedAtIso < cutoffIso) {
          rowsByOwnerAndSession.delete(key);
        }
      }
    },
    async deleteAllForOwner({ ownerUserId }) {
      for (const [key, row] of rowsByOwnerAndSession) {
        if (row.ownerUserId === ownerUserId) rowsByOwnerAndSession.delete(key);
      }
    }
  };
}

class CommentTranslatorCreatorHistoryStoreError extends Error {
  readonly name = "CommentTranslatorCreatorHistoryStoreError";
  readonly operation: "write-failed" | "read-failed" | "row-unreadable" | "cleanup-failed";

  constructor(operation: CommentTranslatorCreatorHistoryStoreError["operation"]) {
    super("Trusted Creator history store operation failed.");
    this.operation = operation;
  }
}

function parseDbRows(value: unknown): readonly CommentTranslatorCreatorHistoryStoredRow[] | null {
  if (!Array.isArray(value)) return null;
  const parsedRows = value.map(parseDbRow);
  if (parsedRows.some((row) => row === null)) return null;
  return parsedRows.filter(
    (row): row is CommentTranslatorCreatorHistoryStoredRow => row !== null
  );
}

function parseDbRow(value: unknown): CommentTranslatorCreatorHistoryStoredRow | null {
  if (!isRecord(value)) return null;
  const row: CreatorHistoryDbRow = {
    owner_user_id: value.owner_user_id,
    session_reference_id: value.session_reference_id,
    history_rows: value.history_rows,
    recorded_at: value.recorded_at
  };
  if (
    typeof row.owner_user_id !== "string" ||
    typeof row.session_reference_id !== "string" ||
    !row.session_reference_id.trim() ||
    !Array.isArray(row.history_rows) ||
    typeof row.recorded_at !== "string" ||
    Number.isNaN(Date.parse(row.recorded_at))
  ) {
    return null;
  }
  return {
    ownerUserId: row.owner_user_id,
    sessionReferenceId: row.session_reference_id,
    rows: row.history_rows,
    recordedAtIso: row.recorded_at
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStoreKey(ownerUserId: string, sessionReferenceId: string): string {
  return `${ownerUserId}:${sessionReferenceId}`;
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorCreatorHistoryStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorCreatorHistoryStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorCreatorHistorySupabaseClient {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const tableName = commentTranslatorCreatorHistoryStoreContract.tableName;
  return {
    async upsertHistory(request) {
      const result = await client.from(tableName).upsert(request, {
        onConflict: "owner_user_id,session_reference_id"
      });
      return { data: result.data, error: result.error };
    },
    async readHistory({ ownerUserId, cutoffIso, nowIso }) {
      const result = await client
        .from(tableName)
        .select("owner_user_id, session_reference_id, history_rows, recorded_at")
        .eq("owner_user_id", ownerUserId)
        .gte("recorded_at", cutoffIso)
        .lte("recorded_at", nowIso)
        .order("recorded_at", { ascending: false });
      return { data: result.data, error: result.error };
    },
    async deleteExpired({ ownerUserId, cutoffIso }) {
      const result = await client
        .from(tableName)
        .delete()
        .eq("owner_user_id", ownerUserId)
        .lt("recorded_at", cutoffIso);
      return { data: result.data, error: result.error };
    },
    async deleteAll({ ownerUserId }) {
      const result = await client.from(tableName).delete().eq("owner_user_id", ownerUserId);
      return { data: result.data, error: result.error };
    }
  };
}
