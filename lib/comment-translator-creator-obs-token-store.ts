import "server-only";

import { createClient } from "@supabase/supabase-js";

export const commentTranslatorCreatorObsTokenScope = "obs-overlay-read" as const;

export type CommentTranslatorCreatorObsTokenRecord = {
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly tokenDigest: string;
  readonly issuedAtIso: string;
  readonly expiresAtIso: string;
  readonly revokedAtIso: string | null;
  readonly redeemedAtIso: string | null;
  readonly version: number;
};

export interface CommentTranslatorCreatorObsTokenStore {
  readCurrent(request: { readonly ownerUserId: string }): Promise<
    | { readonly status: "ready"; readonly record: CommentTranslatorCreatorObsTokenRecord }
    | { readonly status: "missing" }
    | { readonly status: "unreadable" }
  >;
  readByDigest(request: { readonly tokenDigest: string }): Promise<
    | { readonly status: "ready"; readonly record: CommentTranslatorCreatorObsTokenRecord }
    | { readonly status: "missing" }
    | { readonly status: "unreadable" }
  >;
  issueOrRotate(request: {
    readonly mode: "issue" | "rotate";
    readonly record: Omit<CommentTranslatorCreatorObsTokenRecord, "version">;
  }): Promise<
    | { readonly status: "applied" }
    | { readonly status: "rejected"; readonly reason: "current-token-exists" | "current-token-missing" | "unreadable" }
  >;
  revokeCurrent(request: { readonly ownerUserId: string; readonly revokedAtIso: string }): Promise<
    { readonly status: "revoked" | "missing" | "unreadable" }
  >;
  redeemByDigest(request: { readonly tokenDigest: string; readonly nowIso: string }): Promise<
    | { readonly status: "redeemed"; readonly record: CommentTranslatorCreatorObsTokenRecord }
    | { readonly status: "denied"; readonly reason: "invalid-token" | "stale-or-replayed-token" | "unreadable" }
  >;
}

type TrustedEnvName = "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY";
type SupabaseRpcResult = {
  readonly data: unknown;
  readonly error: { readonly code?: string; readonly message?: string } | null;
};

export type CommentTranslatorCreatorObsTokenSupabaseClient = {
  rpc(functionName: string, parameters: Record<string, unknown>): Promise<SupabaseRpcResult>;
};

export const commentTranslatorCreatorObsTokenStoreContract = {
  implementationStage: "nc-o1-local-obs-token-store",
  runtime: "server-only",
  tableName: "comment_translator_creator_obs_tokens",
  rowAccess: "trusted-server-service-role-rpc-only",
  persistence: "sha256-digest-only",
  operationAuthority: "atomic-owner-session-scope-row",
  browserAuthority: "forbidden",
  creatorActivation: "fixed-closed",
  productionRouteWiring: "disconnected-until-nc-o2",
  remoteSupabaseMigrationApply: "not-run-in-this-thread"
} as const;

export function createTrustedCommentTranslatorCreatorObsTokenStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  readonly env?: Partial<Record<TrustedEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorCreatorObsTokenSupabaseClient;
} = {}):
  | { readonly status: "ready"; readonly store: CommentTranslatorCreatorObsTokenStore }
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
    store: createCommentTranslatorCreatorObsTokenSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey)
    })
  };
}

export function createCommentTranslatorCreatorObsTokenSupabaseStore({
  supabase
}: {
  readonly supabase: CommentTranslatorCreatorObsTokenSupabaseClient;
}): CommentTranslatorCreatorObsTokenStore {
  return {
    async readCurrent({ ownerUserId }) {
      const result = await callRpc(supabase, "read_comment_translator_creator_obs_token", {
        p_owner_user_id: ownerUserId
      });
      if (!result || result.error) return { status: "unreadable" };
      if (isRecord(result.data) && result.data.status === "missing") return { status: "missing" };
      const record = parseRecord(result.data);
      return record ? { status: "ready", record } : { status: "unreadable" };
    },
    async readByDigest({ tokenDigest }) {
      const result = await callRpc(supabase, "read_comment_translator_creator_obs_token_by_digest", {
        p_token_digest: tokenDigest
      });
      if (!result || result.error) return { status: "unreadable" };
      if (isRecord(result.data) && result.data.status === "missing") return { status: "missing" };
      const record = parseRecord(result.data);
      return record ? { status: "ready", record } : { status: "unreadable" };
    },
    async issueOrRotate({ mode, record }) {
      const result = await callRpc(supabase, "issue_or_rotate_comment_translator_creator_obs_token", {
        p_owner_user_id: record.ownerUserId,
        p_session_reference_id: record.sessionReferenceId,
        p_scope: commentTranslatorCreatorObsTokenScope,
        p_token_digest: record.tokenDigest,
        p_issued_at: record.issuedAtIso,
        p_expires_at: record.expiresAtIso,
        p_mode: mode
      });
      if (!result || result.error || !isRecord(result.data)) return rejected("unreadable");
      if (result.data.status === "applied") return { status: "applied" };
      switch (result.data.reason) {
        case "current-token-exists":
        case "current-token-missing":
          return rejected(result.data.reason);
        default:
          return rejected("unreadable");
      }
    },
    async revokeCurrent({ ownerUserId, revokedAtIso }) {
      const result = await callRpc(supabase, "revoke_comment_translator_creator_obs_token", {
        p_owner_user_id: ownerUserId,
        p_revoked_at: revokedAtIso
      });
      if (!result || result.error || !isRecord(result.data)) return { status: "unreadable" };
      return result.data.status === "revoked"
        ? { status: "revoked" }
        : result.data.status === "missing" ? { status: "missing" } : { status: "unreadable" };
    },
    async redeemByDigest({ tokenDigest, nowIso }) {
      const result = await callRpc(supabase, "redeem_comment_translator_creator_obs_token", {
        p_token_digest: tokenDigest,
        p_redeemed_at: nowIso
      });
      if (!result || result.error || !isRecord(result.data)) return denied("unreadable");
      if (result.data.status === "redeemed") {
        const record = parseRecord(result.data);
        return record ? { status: "redeemed", record } : denied("unreadable");
      }
      return result.data.reason === "invalid-token" || result.data.reason === "stale-or-replayed-token"
        ? denied(result.data.reason)
        : denied("unreadable");
    }
  };
}

async function callRpc(
  supabase: CommentTranslatorCreatorObsTokenSupabaseClient,
  functionName: string,
  parameters: Record<string, unknown>
): Promise<SupabaseRpcResult | null> {
  try {
    return await supabase.rpc(functionName, parameters);
  } catch (error) {
    if (error instanceof Error) return null;
    return null;
  }
}

function parseRecord(value: unknown): CommentTranslatorCreatorObsTokenRecord | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.owner_user_id !== "string" || typeof value.session_reference_id !== "string" ||
    typeof value.token_digest !== "string" || !/^[a-f0-9]{64}$/.test(value.token_digest) ||
    !isTimestamp(value.issued_at) || !isTimestamp(value.expires_at) ||
    !isNullableTimestamp(value.revoked_at) || !isNullableTimestamp(value.redeemed_at) ||
    typeof value.version !== "number" || !Number.isSafeInteger(value.version) || value.version < 1
  ) return null;
  return {
    ownerUserId: value.owner_user_id,
    sessionReferenceId: value.session_reference_id,
    tokenDigest: value.token_digest,
    issuedAtIso: value.issued_at,
    expiresAtIso: value.expires_at,
    revokedAtIso: value.revoked_at,
    redeemedAtIso: value.redeemed_at,
    version: value.version
  };
}

function rejected(reason: "current-token-exists" | "current-token-missing" | "unreadable") {
  return { status: "rejected" as const, reason };
}
function denied(reason: "invalid-token" | "stale-or-replayed-token" | "unreadable") {
  return { status: "denied" as const, reason };
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

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorCreatorObsTokenSupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async rpc(functionName, parameters) {
      const { data, error } = await client.rpc(functionName, parameters);
      return { data, error };
    }
  };
}
