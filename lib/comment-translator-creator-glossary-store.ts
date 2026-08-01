import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorCreatorGlossaryEntry = {
  readonly term: string;
  readonly replacement: string;
  readonly note: string | null;
  readonly languageScope: string;
  readonly normalizedTerm: string;
};

export type CommentTranslatorCreatorGlossaryRead =
  | {
      readonly status: "ready";
      readonly version: number;
      readonly effectiveVersion: string;
      readonly termCount: number;
      readonly entries: readonly CommentTranslatorCreatorGlossaryEntry[];
    }
  | { readonly status: "fail-closed"; readonly reason: "missing" | "unreadable" };

export type CommentTranslatorCreatorGlossaryReplaceResult =
  | {
      readonly status: "updated";
      readonly version: number;
      readonly effectiveVersion: string;
      readonly termCount: number;
    }
  | {
      readonly status: "rejected";
      readonly reason: "expected-version-stale" | "term-limit-exceeded" | "normalized-term-collision" | "malformed" | "unreadable";
    };

export interface CommentTranslatorCreatorGlossaryStore {
  readGlossary(request: { readonly ownerUserId: string }): Promise<CommentTranslatorCreatorGlossaryRead>;
  replaceGlossary(request: {
    readonly ownerUserId: string;
    readonly expectedVersion: number;
    readonly entries: readonly CommentTranslatorCreatorGlossaryEntry[];
  }): Promise<CommentTranslatorCreatorGlossaryReplaceResult>;
}

type TrustedEnvName = "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY";
type SupabaseError = { readonly code?: string; readonly message?: string } | null;
type SupabaseRpcResult = { readonly data: unknown; readonly error: SupabaseError };

export type CommentTranslatorCreatorGlossarySupabaseClient = {
  rpc(functionName: string, parameters: Record<string, unknown>): Promise<SupabaseRpcResult>;
};

export const commentTranslatorCreatorGlossaryStoreContract = {
  implementationStage: "nc-c1-local-glossary-store",
  runtime: "server-only",
  readRpc: "read_comment_translator_creator_glossary",
  replaceRpc: "replace_comment_translator_creator_glossary",
  rowAccess: "trusted-server-service-role-rpc-only",
  browserAuthority: "forbidden",
  inMemoryAuthority: "forbidden",
  maximumTermCount: 30,
  productionRouteWiring: "disconnected",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  creatorActivation: "fixed-closed"
} as const;

export function createTrustedCommentTranslatorCreatorGlossaryStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  readonly env?: Partial<Record<TrustedEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorCreatorGlossarySupabaseClient;
} = {}):
  | { readonly status: "ready"; readonly store: CommentTranslatorCreatorGlossaryStore }
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
    store: createCommentTranslatorCreatorGlossarySupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey)
    })
  };
}

export function createCommentTranslatorCreatorGlossarySupabaseStore({
  supabase
}: {
  readonly supabase: CommentTranslatorCreatorGlossarySupabaseClient;
}): CommentTranslatorCreatorGlossaryStore {
  return {
    async readGlossary({ ownerUserId }) {
      const result = await callRpc(supabase, commentTranslatorCreatorGlossaryStoreContract.readRpc, {
        p_owner_user_id: ownerUserId
      });
      if (!result || result.error) return { status: "fail-closed", reason: "unreadable" };
      return parseRead(result.data);
    },
    async replaceGlossary({ ownerUserId, expectedVersion, entries }) {
      const result = await callRpc(supabase, commentTranslatorCreatorGlossaryStoreContract.replaceRpc, {
        p_owner_user_id: ownerUserId,
        p_expected_version: expectedVersion,
        p_entries: entries.map(({ term, replacement, note, languageScope, normalizedTerm }) => ({
          term,
          replacement,
          note,
          language_scope: languageScope,
          normalized_term: normalizedTerm
        }))
      });
      if (!result || result.error) return { status: "rejected", reason: "unreadable" };
      return parseReplace(result.data);
    }
  };
}

async function callRpc(
  supabase: CommentTranslatorCreatorGlossarySupabaseClient,
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

function parseRead(data: unknown): CommentTranslatorCreatorGlossaryRead {
  if (!isRecord(data)) return { status: "fail-closed", reason: "unreadable" };
  if (data.status === "missing") return { status: "fail-closed", reason: "missing" };
  const entries = parseEntries(data.entries);
  if (
    data.status !== "ready" ||
    !isVersion(data.version) ||
    typeof data.effective_version !== "string" ||
    !isCount(data.term_count) ||
    !entries ||
    entries.length !== data.term_count
  ) return { status: "fail-closed", reason: "unreadable" };
  return {
    status: "ready",
    version: data.version,
    effectiveVersion: data.effective_version,
    termCount: data.term_count,
    entries
  };
}

function parseReplace(data: unknown): CommentTranslatorCreatorGlossaryReplaceResult {
  if (!isRecord(data)) return { status: "rejected", reason: "unreadable" };
  if (
    data.status === "updated" &&
    isVersion(data.version) &&
    typeof data.effective_version === "string" &&
    isCount(data.term_count)
  ) {
    return { status: "updated", version: data.version, effectiveVersion: data.effective_version, termCount: data.term_count };
  }
  if (data.status !== "rejected") return { status: "rejected", reason: "unreadable" };
  switch (data.reason) {
    case "expected-version-stale":
    case "term-limit-exceeded":
    case "normalized-term-collision":
    case "malformed":
      return { status: "rejected", reason: data.reason };
    default:
      return { status: "rejected", reason: "unreadable" };
  }
}

function parseEntries(value: unknown): readonly CommentTranslatorCreatorGlossaryEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries: CommentTranslatorCreatorGlossaryEntry[] = [];
  for (const item of value) {
    if (
      !isRecord(item) || typeof item.term !== "string" || typeof item.replacement !== "string" ||
      (item.note !== null && typeof item.note !== "string") || typeof item.language_scope !== "string" ||
      typeof item.normalized_term !== "string"
    ) return null;
    entries.push({
      term: item.term,
      replacement: item.replacement,
      note: item.note,
      languageScope: item.language_scope,
      normalizedTerm: item.normalized_term
    });
  }
  return entries;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function isVersion(value: unknown): value is number { return isCount(value) && value > 0; }

function createTrustedSupabaseServiceRoleClient(url: string, serviceRoleKey: string): CommentTranslatorCreatorGlossarySupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async rpc(functionName, parameters) {
      const { data, error } = await client.rpc(functionName, parameters);
      return { data, error };
    }
  };
}
