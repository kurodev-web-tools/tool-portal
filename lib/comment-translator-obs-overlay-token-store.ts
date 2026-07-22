import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  commentTranslatorObsOverlayScope,
  type CommentTranslatorObsOverlayTokenRecord,
  type CommentTranslatorObsOverlayTokenStore,
  type CommentTranslatorObsOverlayTokenStoreFactoryEnvName,
  type CommentTranslatorObsOverlayTokenStoreFactoryResult
} from "./comment-translator-obs-overlay-token-types";

type OverlayTokenDbRow = {
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
  readonly data: OverlayTokenDbRow | null;
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
  readonly select: (columns: typeof commentTranslatorObsOverlayTokenStoreContract.trustedSelectColumns) => SupabaseFilterQuery;
};

export type CommentTranslatorObsOverlayTokenSupabaseClient = {
  readonly from: (tableName: typeof commentTranslatorObsOverlayTokenStoreContract.tableName) => SupabaseTableQuery;
  readonly rpc: (
    functionName: "write_comment_translator_obs_overlay_token" | "revoke_comment_translator_obs_overlay_token",
    params: Readonly<Record<string, string>>
  ) => Promise<SupabaseRpcResult>;
};

export const commentTranslatorObsOverlayTokenStoreContract = {
  implementationStage: "creator-closed-beta-c5-obs-overlay-token-durable-store",
  runtime: "server-only",
  tableName: "comment_translator_obs_overlay_tokens",
  rowAccess: "trusted-server-service-role-only",
  persistence: "sha256-digest-only",
  currentTokenAuthority: "atomic-owner-scope-row",
  sessionBinding: "authoritative-session-reference",
  remoteSupabaseMigrationApply: "not-run-in-c5-local-implementation",
  remoteSupabaseMutation: "not-run-by-codex-in-c5-local-implementation",
  trustedSelectColumns: "owner_user_id, session_reference_id, scope, token_digest, issued_at, expires_at, revoked_at, version",
  forbiddenReadableOutput: [
    "plaintext-token-value",
    "owner-user-id-value",
    "session-reference-value",
    "token-digest-value",
    "provider-target-metadata",
    "liveChatId-value",
    "private-url-value"
  ]
} as const;

export function createTrustedCommentTranslatorObsOverlayTokenSupabaseStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  readonly env?: Partial<Record<CommentTranslatorObsOverlayTokenStoreFactoryEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorObsOverlayTokenSupabaseClient;
  readonly nowIso?: () => string;
} = {}): CommentTranslatorObsOverlayTokenStoreFactoryResult {
  const trustedEnv = env ?? process.env;
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorObsOverlayTokenStoreFactoryEnvName[] = [];
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
  return {
    status: "ready",
    store: createCommentTranslatorObsOverlayTokenSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey),
      nowIso
    }),
    missingEnvReferences: []
  };
}

export function createCommentTranslatorObsOverlayTokenSupabaseStore({
  supabase,
  nowIso
}: {
  readonly supabase: CommentTranslatorObsOverlayTokenSupabaseClient;
  readonly nowIso: () => string;
}): CommentTranslatorObsOverlayTokenStore {
  async function readBy(column: "owner_user_id" | "token_digest", value: string) {
    const result = await supabase
      .from(commentTranslatorObsOverlayTokenStoreContract.tableName)
      .select(commentTranslatorObsOverlayTokenStoreContract.trustedSelectColumns)
      .eq(column, value)
      .eq("scope", commentTranslatorObsOverlayScope)
      .single();
    if (!result.data && (!result.error || result.error.code === "PGRST116")) return null;
    if (result.error || !result.data) throw new CommentTranslatorObsOverlayTokenStoreError("read-failed");
    const record = parseRecord(result.data);
    if (!record) throw new CommentTranslatorObsOverlayTokenStoreError("row-unreadable");
    return record;
  }

  return {
    readCurrent: (request) => readBy("owner_user_id", request.ownerUserId),
    readByDigest: (request) => readBy("token_digest", request.tokenDigest),
    async writeCurrent(request) {
      const result = await supabase.rpc("write_comment_translator_obs_overlay_token", {
        p_owner_user_id: request.record.ownerUserId,
        p_session_reference_id: request.record.sessionReferenceId,
        p_scope: request.record.scope,
        p_token_digest: request.record.tokenDigest,
        p_issued_at: request.record.issuedAtIso,
        p_expires_at: request.record.expiresAtIso,
        p_mode: request.mode
      });
      if (result.error || !isWriteResult(result.data)) {
        throw new CommentTranslatorObsOverlayTokenStoreError("write-failed");
      }
      return result.data;
    },
    async revokeCurrent(request) {
      const result = await supabase.rpc("revoke_comment_translator_obs_overlay_token", {
        p_owner_user_id: request.ownerUserId,
        p_scope: request.scope,
        p_revoked_at: request.revokedAtIso || nowIso()
      });
      if (result.error || !isRevokeResult(result.data)) {
        throw new CommentTranslatorObsOverlayTokenStoreError("revoke-failed");
      }
      return result.data;
    }
  };
}

class CommentTranslatorObsOverlayTokenStoreError extends Error {
  readonly name = "CommentTranslatorObsOverlayTokenStoreError";
  readonly operation: "read-failed" | "row-unreadable" | "write-failed" | "revoke-failed";
  constructor(operation: "read-failed" | "row-unreadable" | "write-failed" | "revoke-failed") {
    super("Trusted OBS overlay token store operation failed.");
    this.operation = operation;
  }
}

function parseRecord(row: OverlayTokenDbRow): CommentTranslatorObsOverlayTokenRecord | null {
  if (
    !row.owner_user_id || !row.session_reference_id || row.scope !== commentTranslatorObsOverlayScope ||
    !row.token_digest || !/^[a-f0-9]{64}$/.test(row.token_digest) ||
    !row.issued_at || Number.isNaN(Date.parse(row.issued_at)) ||
    !row.expires_at || Number.isNaN(Date.parse(row.expires_at)) ||
    (row.revoked_at !== null && Number.isNaN(Date.parse(row.revoked_at))) ||
    row.version === null || !Number.isSafeInteger(row.version) || row.version < 1
  ) return null;
  return {
    ownerUserId: row.owner_user_id,
    sessionReferenceId: row.session_reference_id,
    scope: commentTranslatorObsOverlayScope,
    tokenDigest: row.token_digest,
    issuedAtIso: row.issued_at,
    expiresAtIso: row.expires_at,
    revokedAtIso: row.revoked_at,
    version: row.version
  };
}

function isWriteResult(value: string | null): value is "applied" | "current-token-exists" | "missing-current-token" {
  return value === "applied" || value === "current-token-exists" || value === "missing-current-token";
}

function isRevokeResult(value: string | null): value is "revoked" | "missing-token" {
  return value === "revoked" || value === "missing-token";
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorObsOverlayTokenStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorObsOverlayTokenStoreFactoryEnvName
) {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorObsOverlayTokenSupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    from(tableName) { return client.from(tableName); },
    async rpc(functionName, params) { return client.rpc(functionName, params); }
  };
}
