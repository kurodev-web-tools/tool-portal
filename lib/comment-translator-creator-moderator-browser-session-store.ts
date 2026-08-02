import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorCreatorModeratorBrowserSessionRecord = {
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly tokenVersion: number;
  readonly capabilityDigest: string;
  readonly issuedAtIso: string;
  readonly expiresAtIso: string;
};

export interface CommentTranslatorCreatorModeratorBrowserSessionStore {
  readByDigest(request: { readonly capabilityDigest: string; readonly nowIso: string }): Promise<
    | { readonly status: "ready"; readonly record: CommentTranslatorCreatorModeratorBrowserSessionRecord }
    | { readonly status: "missing" | "unreadable" }
  >;
  redeemAndWriteCurrent(request: {
    readonly tokenDigest: string;
    readonly capabilityDigest: string;
    readonly nowIso: string;
  }): Promise<
    | { readonly status: "redeemed"; readonly record: CommentTranslatorCreatorModeratorBrowserSessionRecord }
    | { readonly status: "denied"; readonly reason: "invalid-token" }
    | { readonly status: "unreadable"; readonly retryable: boolean }
  >;
}

type TrustedEnvName = "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY";
type SupabaseRpcResult = { readonly data: unknown; readonly error: { readonly code?: string } | null };

export type CommentTranslatorCreatorModeratorBrowserSessionSupabaseClient = {
  rpc(functionName: string, parameters: Record<string, unknown>): Promise<SupabaseRpcResult>;
};

export const commentTranslatorCreatorModeratorBrowserSessionStoreContract = {
  implementationStage: "nc-m2-local-moderator-browser-session-store",
  runtime: "server-only",
  tableName: "comment_translator_creator_moderator_browser_sessions",
  rowAccess: "trusted-server-service-role-rpc-only",
  persistence: "sha256-capability-digest-only",
  currentAuthority: "owner-session-moderator-token-version-bound",
  redemption: "atomic-nc-m1-consume-and-browser-capability-replacement",
  creatorActivation: "fixed-closed",
  remoteSupabaseMigrationApply: "not-run-in-this-thread"
} as const;

export function createTrustedCommentTranslatorCreatorModeratorBrowserSessionStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  readonly env?: Partial<Record<TrustedEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorCreatorModeratorBrowserSessionSupabaseClient;
} = {}):
  | { readonly status: "ready"; readonly store: CommentTranslatorCreatorModeratorBrowserSessionStore }
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
    store: createCommentTranslatorCreatorModeratorBrowserSessionStore({
      supabase: createSupabaseClient(url, serviceRoleKey)
    })
  };
}

export function createCommentTranslatorCreatorModeratorBrowserSessionStore({
  supabase
}: {
  readonly supabase: CommentTranslatorCreatorModeratorBrowserSessionSupabaseClient;
}): CommentTranslatorCreatorModeratorBrowserSessionStore {
  return {
    async readByDigest({ capabilityDigest, nowIso }) {
      const result = await callRpc(supabase, "read_comment_translator_creator_moderator_browser_session", {
        p_capability_digest: capabilityDigest,
        p_now: nowIso
      });
      if (!result || result.error) return { status: "unreadable" };
      if (isRecord(result.data) && result.data.status === "missing") return { status: "missing" };
      const record = parseRecord(result.data);
      return record ? { status: "ready", record } : { status: "unreadable" };
    },
    async redeemAndWriteCurrent({ tokenDigest, capabilityDigest, nowIso }) {
      const result = await callRpc(supabase, "redeem_and_write_comment_translator_creator_moderator_browser_session", {
        p_token_digest: tokenDigest,
        p_capability_digest: capabilityDigest,
        p_redeemed_at: nowIso
      });
      if (!result || result.error || !isRecord(result.data)) return { status: "unreadable", retryable: false };
      if (result.data.status === "redeemed") {
        const record = parseRecord(result.data);
        return record ? { status: "redeemed", record } : { status: "unreadable", retryable: false };
      }
      if (result.data.status === "denied") return { status: "denied", reason: "invalid-token" };
      return { status: "unreadable", retryable: false };
    }
  };
}

async function callRpc(
  supabase: CommentTranslatorCreatorModeratorBrowserSessionSupabaseClient,
  functionName: string,
  parameters: Record<string, unknown>
): Promise<SupabaseRpcResult | null> {
  try {
    return await supabase.rpc(functionName, parameters);
  } catch {
    return null;
  }
}

function parseRecord(value: unknown): CommentTranslatorCreatorModeratorBrowserSessionRecord | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.owner_user_id !== "string" || typeof value.session_reference_id !== "string" ||
    typeof value.token_version !== "number" || !Number.isSafeInteger(value.token_version) || value.token_version < 1 ||
    typeof value.capability_digest !== "string" || !/^[a-f0-9]{64}$/.test(value.capability_digest) ||
    !isTimestamp(value.issued_at) || !isTimestamp(value.expires_at)
  ) return null;
  return {
    ownerUserId: value.owner_user_id,
    sessionReferenceId: value.session_reference_id,
    tokenVersion: value.token_version,
    capabilityDigest: value.capability_digest,
    issuedAtIso: value.issued_at,
    expiresAtIso: value.expires_at
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorCreatorModeratorBrowserSessionSupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async rpc(functionName, parameters) {
      const { data, error } = await client.rpc(functionName, parameters);
      return { data, error: error ? { code: error.code } : null };
    }
  };
}
