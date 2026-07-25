import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  type CommentTranslatorCustomDictionaryEntryRecord,
  type CommentTranslatorCustomDictionarySourceLanguage,
  type CommentTranslatorCustomDictionaryStore,
  type CommentTranslatorCustomDictionaryStoreFactoryEnvName,
  type CommentTranslatorCustomDictionaryStoreFactoryResult,
  type CommentTranslatorCustomDictionaryStoreMutationResult,
  type CommentTranslatorCustomDictionaryTargetLanguage
} from "./comment-translator-custom-dictionary-types";

type CustomDictionaryDbRow = {
  readonly entry_id: string | null;
  readonly owner_user_id: string | null;
  readonly term: string | null;
  readonly normalized_term: string | null;
  readonly replacement: string | null;
  readonly note: string | null;
  readonly source_language: string | null;
  readonly target_language: string | null;
  readonly created_at: string | null;
  readonly updated_at: string | null;
};

type SupabaseListResult = {
  readonly data: readonly CustomDictionaryDbRow[] | null;
  readonly error: { readonly code?: string; readonly message?: string } | null;
};

type SupabaseRpcResult = {
  readonly data: string | null;
  readonly error: { readonly code?: string; readonly message?: string } | null;
};

type SupabaseListQuery = {
  readonly eq: (column: "owner_user_id", value: string) => SupabaseListQuery;
  readonly order: (column: "entry_id", options: { readonly ascending: true }) => Promise<SupabaseListResult>;
};

type SupabaseTableQuery = {
  readonly select: (columns: typeof commentTranslatorCustomDictionaryStoreContract.trustedSelectColumns) => SupabaseListQuery;
};

export type CommentTranslatorCustomDictionarySupabaseClient = {
  readonly from: (tableName: typeof commentTranslatorCustomDictionaryStoreContract.tableName) => SupabaseTableQuery;
  readonly rpc: (
    functionName:
      | "create_comment_translator_custom_dictionary_entry"
      | "update_comment_translator_custom_dictionary_entry"
      | "delete_comment_translator_custom_dictionary_entry",
    params: Readonly<Record<string, string | null>>
  ) => Promise<SupabaseRpcResult>;
};

export const commentTranslatorCustomDictionaryStoreContract = {
  implementationStage: "creator-closed-beta-c9-custom-dictionary-durable-store",
  runtime: "server-only",
  tableName: "comment_translator_custom_dictionary_entries",
  rowAccess: "trusted-server-service-role-only",
  ownerIsolation: "owner-filter-required-for-every-read-and-mutation",
  maximumCurrentTerms: 30,
  versionAuthority: "runtime-sha256-of-durable-effective-rows",
  remoteSupabaseMigrationApply: "not-run-in-c9-local-implementation",
  remoteSupabaseMutation: "not-run-by-codex-in-c9-local-implementation",
  trustedSelectColumns:
    "entry_id, owner_user_id, term, normalized_term, replacement, note, source_language, target_language, created_at, updated_at"
} as const;

export function createTrustedCommentTranslatorCustomDictionarySupabaseStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  readonly env?: Partial<Record<CommentTranslatorCustomDictionaryStoreFactoryEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorCustomDictionarySupabaseClient;
} = {}): CommentTranslatorCustomDictionaryStoreFactoryResult {
  const trustedEnv = env ?? {
    ["NEXT_PUBLIC_SUPABASE_URL"]: process.env.NEXT_PUBLIC_SUPABASE_URL,
    ["SUPABASE_SERVICE_ROLE_KEY"]: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorCustomDictionaryStoreFactoryEnvName[] = [];
  if (!url) missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    return { status: "unavailable", store: null, missingEnvReferences, reason: "trusted-service-role-env-missing" };
  }
  return {
    status: "ready",
    store: createCommentTranslatorCustomDictionarySupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey)
    }),
    missingEnvReferences: []
  };
}

export function createCommentTranslatorCustomDictionarySupabaseStore({
  supabase
}: {
  readonly supabase: CommentTranslatorCustomDictionarySupabaseClient;
}): CommentTranslatorCustomDictionaryStore {
  return {
    async readCurrent({ ownerUserId }) {
      const result = await supabase
        .from(commentTranslatorCustomDictionaryStoreContract.tableName)
        .select(commentTranslatorCustomDictionaryStoreContract.trustedSelectColumns)
        .eq("owner_user_id", ownerUserId)
        .order("entry_id", { ascending: true });
      if (result.error || !result.data) throw new CommentTranslatorCustomDictionaryStoreError("read-failed");
      const entries = result.data.map(parseRecord);
      if (entries.some((entry) => entry === null)) throw new CommentTranslatorCustomDictionaryStoreError("row-unreadable");
      return entries.filter((entry): entry is CommentTranslatorCustomDictionaryEntryRecord => entry !== null);
    },
    async createEntry({ ownerUserId, entry }) {
      return runMutation(supabase, "create_comment_translator_custom_dictionary_entry", {
        p_owner_user_id: ownerUserId,
        ...entryParams(entry)
      });
    },
    async updateEntry({ ownerUserId, entryId, expectedUpdatedAtIso, entry }) {
      return runMutation(supabase, "update_comment_translator_custom_dictionary_entry", {
        ...entryParams(entry),
        p_owner_user_id: ownerUserId,
        p_entry_id: entryId,
        p_expected_updated_at: expectedUpdatedAtIso
      });
    },
    async deleteEntry({ ownerUserId, entryId, expectedUpdatedAtIso }) {
      return runMutation(supabase, "delete_comment_translator_custom_dictionary_entry", {
        p_owner_user_id: ownerUserId,
        p_entry_id: entryId,
        p_expected_updated_at: expectedUpdatedAtIso
      });
    }
  };
}

class CommentTranslatorCustomDictionaryStoreError extends Error {
  readonly name = "CommentTranslatorCustomDictionaryStoreError";
  readonly operation: "read-failed" | "row-unreadable" | "mutation-failed";

  constructor(operation: "read-failed" | "row-unreadable" | "mutation-failed") {
    super("Trusted custom dictionary store operation failed.");
    this.operation = operation;
  }
}

async function runMutation(
  supabase: CommentTranslatorCustomDictionarySupabaseClient,
  functionName: Parameters<CommentTranslatorCustomDictionarySupabaseClient["rpc"]>[0],
  params: Readonly<Record<string, string | null>>
): Promise<CommentTranslatorCustomDictionaryStoreMutationResult> {
  const result = await supabase.rpc(functionName, params);
  if (result.error || !isMutationResult(result.data)) {
    throw new CommentTranslatorCustomDictionaryStoreError("mutation-failed");
  }
  return result.data;
}

function entryParams(entry: Omit<CommentTranslatorCustomDictionaryEntryRecord, "ownerUserId">) {
  return {
    p_entry_id: entry.entryId,
    p_term: entry.term,
    p_normalized_term: entry.normalizedTerm,
    p_replacement: entry.replacement,
    p_note: entry.note,
    p_source_language: entry.sourceLanguage,
    p_target_language: entry.targetLanguage,
    p_created_at: entry.createdAtIso,
    p_updated_at: entry.updatedAtIso
  };
}

function parseRecord(row: CustomDictionaryDbRow): CommentTranslatorCustomDictionaryEntryRecord | null {
  if (
    !row.entry_id || !row.owner_user_id || !row.term || !row.normalized_term || !row.replacement ||
    !isSourceLanguage(row.source_language) || !isTargetLanguage(row.target_language) ||
    row.source_language === row.target_language || !row.created_at || Number.isNaN(Date.parse(row.created_at)) ||
    !row.updated_at || Number.isNaN(Date.parse(row.updated_at))
  ) return null;
  return {
    entryId: row.entry_id,
    ownerUserId: row.owner_user_id,
    term: row.term,
    normalizedTerm: row.normalized_term,
    replacement: row.replacement,
    note: row.note,
    sourceLanguage: row.source_language,
    targetLanguage: row.target_language,
    createdAtIso: row.created_at,
    updatedAtIso: row.updated_at
  };
}

function isMutationResult(value: string | null): value is CommentTranslatorCustomDictionaryStoreMutationResult {
  return value === "applied" || value === "unchanged" || value === "duplicate-entry" ||
    value === "conflicting-entry" || value === "term-limit-reached" || value === "entry-missing" ||
    value === "stale-entry" || value === "invalid-entry";
}

function isSourceLanguage(value: string | null): value is CommentTranslatorCustomDictionarySourceLanguage {
  return value === "ja" || value === "en" || value === "ko" || value === "zh";
}

function isTargetLanguage(value: string | null): value is CommentTranslatorCustomDictionaryTargetLanguage {
  return value === "ja" || value === "en";
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorCustomDictionaryStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorCustomDictionaryStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorCustomDictionarySupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    from(tableName) {
      let selectedColumns = commentTranslatorCustomDictionaryStoreContract.trustedSelectColumns;
      let ownerUserId = "";
      const listQuery: SupabaseListQuery = {
        eq(_column, value) {
          ownerUserId = value;
          return listQuery;
        },
        async order(column, options) {
          const result = await client
            .from(tableName)
            .select(selectedColumns)
            .eq("owner_user_id", ownerUserId)
            .order(column, options);
          return {
            data: result.data,
            error: result.error ? { code: result.error.code, message: result.error.message } : null
          };
        }
      };
      return {
        select(columns) {
          selectedColumns = columns;
          return listQuery;
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
