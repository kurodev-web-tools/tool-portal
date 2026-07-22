import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  commentTranslatorModeratorShareScope,
  type CommentTranslatorModeratorShareTokenRecord,
  type CommentTranslatorModeratorShareTokenStore,
  type CommentTranslatorModeratorShareTokenStoreFactoryEnvName,
  type CommentTranslatorModeratorShareTokenStoreFactoryResult
} from "./comment-translator-moderator-share-token-types";

type ModeratorShareTokenDbRow = {
  readonly owner_user_id: string | null;
  readonly session_reference_id: string | null;
  readonly scope: string | null;
  readonly token_digest: string | null;
  readonly issued_at: string | null;
  readonly expires_at: string | null;
  readonly revoked_at: string | null;
  readonly version: number | null;
};

type SupabaseSingleResult = {
  readonly data: ModeratorShareTokenDbRow | null;
  readonly error: { readonly code?: string; readonly message?: string } | null;
};

type SupabaseRpcResult = {
  readonly data: string | null;
  readonly error: { readonly code?: string; readonly message?: string } | null;
};

type SupabaseFilterQuery = {
  readonly eq: (column: "owner_user_id" | "scope" | "token_digest", value: string) => SupabaseFilterQuery;
  readonly single: () => Promise<SupabaseSingleResult>;
};

type SupabaseTableQuery = {
  readonly select: (columns: typeof commentTranslatorModeratorShareTokenStoreContract.trustedSelectColumns) => SupabaseFilterQuery;
};

export type CommentTranslatorModeratorShareTokenSupabaseClient = {
  readonly from: (tableName: typeof commentTranslatorModeratorShareTokenStoreContract.tableName) => SupabaseTableQuery;
  readonly rpc: (
    functionName: "write_comment_translator_moderator_share_token" | "revoke_comment_translator_moderator_share_token",
    params: Readonly<Record<string, string>>
  ) => Promise<SupabaseRpcResult>;
};

export const commentTranslatorModeratorShareTokenStoreContract = {
  implementationStage: "creator-closed-beta-c7-moderator-share-token-durable-store",
  runtime: "server-only",
  tableName: "comment_translator_moderator_share_tokens",
  rowAccess: "trusted-server-service-role-only",
  persistence: "sha256-digest-only",
  currentTokenAuthority: "atomic-owner-scope-row",
  sessionBinding: "authoritative-session-reference",
  obsOverlayInteroperability: "forbidden-separate-table-scope-and-rpcs",
  remoteSupabaseMigrationApply: "not-run-in-c7-local-implementation",
  remoteSupabaseMutation: "not-run-by-codex-in-c7-local-implementation",
  trustedSelectColumns: "owner_user_id, session_reference_id, scope, token_digest, issued_at, expires_at, revoked_at, version"
} as const;

export function createTrustedCommentTranslatorModeratorShareTokenSupabaseStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  readonly env?: Partial<Record<CommentTranslatorModeratorShareTokenStoreFactoryEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorModeratorShareTokenSupabaseClient;
} = {}): CommentTranslatorModeratorShareTokenStoreFactoryResult {
  const trustedEnv: Partial<Record<CommentTranslatorModeratorShareTokenStoreFactoryEnvName, string | undefined>> = env ?? {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorModeratorShareTokenStoreFactoryEnvName[] = [];
  if (!url) missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    return { status: "unavailable", store: null, missingEnvReferences, reason: "trusted-service-role-env-missing" };
  }
  return {
    status: "ready",
    store: createCommentTranslatorModeratorShareTokenSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey)
    }),
    missingEnvReferences: []
  };
}

export function createCommentTranslatorModeratorShareTokenSupabaseStore({
  supabase
}: {
  readonly supabase: CommentTranslatorModeratorShareTokenSupabaseClient;
}): CommentTranslatorModeratorShareTokenStore {
  async function readBy(column: "owner_user_id" | "token_digest", value: string) {
    const result = await supabase
      .from(commentTranslatorModeratorShareTokenStoreContract.tableName)
      .select(commentTranslatorModeratorShareTokenStoreContract.trustedSelectColumns)
      .eq(column, value)
      .eq("scope", commentTranslatorModeratorShareScope)
      .single();
    if (!result.data && (!result.error || result.error.code === "PGRST116")) return null;
    if (result.error || !result.data) throw new CommentTranslatorModeratorShareTokenStoreError("read-failed");
    const record = parseRecord(result.data);
    if (!record) throw new CommentTranslatorModeratorShareTokenStoreError("row-unreadable");
    return record;
  }

  return {
    readCurrent: (request) => readBy("owner_user_id", request.ownerUserId),
    readByDigest: (request) => readBy("token_digest", request.tokenDigest),
    async writeCurrent(request) {
      const result = await supabase.rpc("write_comment_translator_moderator_share_token", {
        p_owner_user_id: request.record.ownerUserId,
        p_session_reference_id: request.record.sessionReferenceId,
        p_scope: request.record.scope,
        p_token_digest: request.record.tokenDigest,
        p_issued_at: request.record.issuedAtIso,
        p_expires_at: request.record.expiresAtIso
      });
      if (result.error || !isWriteResult(result.data)) {
        throw new CommentTranslatorModeratorShareTokenStoreError("write-failed");
      }
      return result.data;
    },
    async revokeCurrent(request) {
      const result = await supabase.rpc("revoke_comment_translator_moderator_share_token", {
        p_owner_user_id: request.ownerUserId,
        p_scope: request.scope,
        p_revoked_at: request.revokedAtIso
      });
      if (result.error || !isRevokeResult(result.data)) {
        throw new CommentTranslatorModeratorShareTokenStoreError("revoke-failed");
      }
      return result.data;
    }
  };
}

class CommentTranslatorModeratorShareTokenStoreError extends Error {
  readonly name = "CommentTranslatorModeratorShareTokenStoreError";
  readonly operation: "read-failed" | "row-unreadable" | "write-failed" | "revoke-failed";

  constructor(operation: "read-failed" | "row-unreadable" | "write-failed" | "revoke-failed") {
    super("Trusted moderator share token store operation failed.");
    this.operation = operation;
  }
}

function parseRecord(row: ModeratorShareTokenDbRow): CommentTranslatorModeratorShareTokenRecord | null {
  if (
    !row.owner_user_id || !row.session_reference_id || row.scope !== commentTranslatorModeratorShareScope ||
    !row.token_digest || !/^[a-f0-9]{64}$/.test(row.token_digest) ||
    !row.issued_at || Number.isNaN(Date.parse(row.issued_at)) ||
    !row.expires_at || Number.isNaN(Date.parse(row.expires_at)) ||
    (row.revoked_at !== null && Number.isNaN(Date.parse(row.revoked_at))) ||
    row.version === null || !Number.isSafeInteger(row.version) || row.version < 1
  ) return null;
  return {
    ownerUserId: row.owner_user_id,
    sessionReferenceId: row.session_reference_id,
    scope: commentTranslatorModeratorShareScope,
    tokenDigest: row.token_digest,
    issuedAtIso: row.issued_at,
    expiresAtIso: row.expires_at,
    revokedAtIso: row.revoked_at,
    version: row.version
  };
}

function isWriteResult(value: string | null): value is "applied" | "current-token-exists" {
  return value === "applied" || value === "current-token-exists";
}

function isRevokeResult(value: string | null): value is "revoked" | "missing-token" {
  return value === "revoked" || value === "missing-token";
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorModeratorShareTokenStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorModeratorShareTokenStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorModeratorShareTokenSupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    from(tableName) {
      let selectedColumns = commentTranslatorModeratorShareTokenStoreContract.trustedSelectColumns;
      const filters: Array<{ column: "owner_user_id" | "scope" | "token_digest"; value: string }> = [];
      const filterQuery: SupabaseFilterQuery = {
        eq(column, value) {
          filters.push({ column, value });
          return filterQuery;
        },
        async single() {
          let query = client.from(tableName).select(selectedColumns);
          for (const filter of filters) query = query.eq(filter.column, filter.value);
          const result = await query.single();
          return { data: result.data, error: result.error ? { code: result.error.code, message: result.error.message } : null };
        }
      };
      return {
        select(columns) {
          selectedColumns = columns;
          return filterQuery;
        }
      };
    },
    async rpc(functionName, params) {
      const result = await client.rpc(functionName, params);
      return {
        data: typeof result.data === "string" ? result.data : null,
        error: result.error ? { code: result.error.code, message: result.error.message } : null
      };
    }
  };
}
