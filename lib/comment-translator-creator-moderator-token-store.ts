import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  CommentTranslatorCreatorModeratorTokenRecord,
  CommentTranslatorCreatorModeratorTokenRecordDraft,
  CommentTranslatorCreatorModeratorTokenStore
} from "./comment-translator-creator-moderator-token-types";

const moderatorScope = "moderator-share-read" as const;
type TrustedEnvName = "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY";
type RpcResult = { readonly data: unknown; readonly error: { readonly code?: string; readonly message?: string } | null };

export interface CommentTranslatorCreatorModeratorTokenSupabaseClient {
  rpc(functionName: string, parameters: Record<string, unknown>): Promise<RpcResult>;
}

export const commentTranslatorCreatorModeratorTokenStoreContract = {
  implementationStage: "nc-m1-local-moderator-share-token-store",
  runtime: "server-only",
  tableName: "comment_translator_creator_moderator_tokens",
  rowAccess: "trusted-service-role-rpc-only",
  scope: moderatorScope,
  persistence: "sha256-digest-only",
  operationAuthority: "atomic-owner-session-scope-row",
  obsOverlayInteroperability: "forbidden-separate-table-scope-and-rpcs",
  creatorActivation: "fixed-closed",
  remoteSupabaseMigrationApply: "not-run-in-this-thread"
} as const;

export function createTrustedCommentTranslatorCreatorModeratorTokenStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  readonly env?: Partial<Record<TrustedEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorCreatorModeratorTokenSupabaseClient;
} = {}):
  | { readonly status: "ready"; readonly store: CommentTranslatorCreatorModeratorTokenStore }
  | { readonly status: "unavailable"; readonly store: null; readonly reason: "trusted-service-role-env-missing" } {
  const trustedEnv = env ?? {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  const url = trustedEnv.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = trustedEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    return { status: "unavailable", store: null, reason: "trusted-service-role-env-missing" };
  }
  return {
    status: "ready",
    store: createCommentTranslatorCreatorModeratorTokenSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey)
    })
  };
}

export function createCommentTranslatorCreatorModeratorTokenSupabaseStore({
  supabase
}: {
  readonly supabase: CommentTranslatorCreatorModeratorTokenSupabaseClient;
}): CommentTranslatorCreatorModeratorTokenStore {
  return {
    async readCurrent({ ownerUserId, nowIso }) {
      const result = await callRpc(supabase, "read_comment_translator_creator_moderator_token", {
        p_owner_user_id: ownerUserId,
        p_now: nowIso
      });
      return parseReadResult(result);
    },
    async readByDigest({ tokenDigest, nowIso }) {
      const result = await callRpc(supabase, "read_comment_translator_creator_moderator_token_by_digest", {
        p_token_digest: tokenDigest,
        p_now: nowIso
      });
      return parseReadResult(result);
    },
    async issueCurrent({ record }) {
      const result = await callRpc(supabase, "issue_comment_translator_creator_moderator_token", {
        p_owner_user_id: record.ownerUserId,
        p_session_reference_id: record.sessionReferenceId,
        p_scope: moderatorScope,
        p_token_digest: record.tokenDigest,
        p_issued_at: record.issuedAtIso,
        p_expires_at: record.expiresAtIso
      });
      if (!result || result.error || !isRecord(result.data)) return { status: "rejected", reason: "unreadable" };
      if (result.data.status === "applied") return { status: "applied" };
      return result.data.reason === "current-token-exists" || result.data.reason === "session-mismatch"
        ? { status: "rejected", reason: result.data.reason }
        : { status: "rejected", reason: "unreadable" };
    },
    async revokeCurrent({ ownerUserId, sessionReferenceId, revokedAtIso }) {
      const result = await callRpc(supabase, "revoke_comment_translator_creator_moderator_token", {
        p_owner_user_id: ownerUserId,
        p_session_reference_id: sessionReferenceId,
        p_revoked_at: revokedAtIso
      });
      if (!result || result.error || !isRecord(result.data)) return { status: "unreadable" };
      return result.data.status === "revoked" ? { status: "revoked" } : result.data.status === "missing" ? { status: "missing" } : { status: "unreadable" };
    }
  };
}

async function callRpc(
  supabase: CommentTranslatorCreatorModeratorTokenSupabaseClient,
  functionName: string,
  parameters: Record<string, unknown>
): Promise<RpcResult | null> {
  try {
    return await supabase.rpc(functionName, parameters);
  } catch {
    return null;
  }
}

function parseReadResult(result: RpcResult | null):
  | { readonly status: "ready"; readonly record: CommentTranslatorCreatorModeratorTokenRecord }
  | { readonly status: "missing" | "unreadable" } {
  if (!result || result.error || !isRecord(result.data)) return { status: "unreadable" };
  if (result.data.status === "missing") return { status: "missing" };
  const record = parseRecord(result.data);
  return record ? { status: "ready", record } : { status: "unreadable" };
}

function parseRecord(value: Record<string, unknown>): CommentTranslatorCreatorModeratorTokenRecord | null {
  if (
    typeof value.owner_user_id !== "string" || typeof value.session_reference_id !== "string" ||
    value.scope !== moderatorScope || typeof value.token_digest !== "string" || !/^[a-f0-9]{64}$/.test(value.token_digest) ||
    !isTimestamp(value.issued_at) || !isTimestamp(value.expires_at) || !isNullableTimestamp(value.revoked_at) ||
    typeof value.version !== "number" || !Number.isSafeInteger(value.version) || value.version < 1
  ) return null;
  return {
    ownerUserId: value.owner_user_id,
    sessionReferenceId: value.session_reference_id,
    scope: moderatorScope,
    tokenDigest: value.token_digest,
    issuedAtIso: value.issued_at,
    expiresAtIso: value.expires_at,
    revokedAtIso: value.revoked_at,
    version: value.version
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function createTrustedSupabaseServiceRoleClient(url: string, serviceRoleKey: string): CommentTranslatorCreatorModeratorTokenSupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async rpc(functionName, parameters) {
      const { data, error } = await client.rpc(functionName, parameters);
      return { data, error };
    }
  };
}
