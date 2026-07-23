import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorModeratorShareBrowserSessionRecord = {
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly tokenVersion: number;
  readonly capabilityDigest: string;
  readonly issuedAtIso: string;
  readonly expiresAtIso: string;
};

export type CommentTranslatorModeratorShareBrowserSessionStore = {
  readonly readByDigest: (
    capabilityDigest: string
  ) => Promise<CommentTranslatorModeratorShareBrowserSessionRecord | null>;
  readonly writeCurrent: (record: CommentTranslatorModeratorShareBrowserSessionRecord) => Promise<void>;
};

type BrowserSessionRow = {
  readonly owner_user_id: string | null;
  readonly session_reference_id: string | null;
  readonly token_version: number | null;
  readonly capability_digest: string | null;
  readonly issued_at: string | null;
  readonly expires_at: string | null;
};

type SupabaseResult = {
  readonly data: BrowserSessionRow | null;
  readonly error: { readonly code?: string } | null;
};

type BrowserSessionQuery = {
  readonly select: (
    columns: typeof commentTranslatorModeratorShareBrowserSessionStoreContract.trustedSelectColumns
  ) => BrowserSessionQuery;
  readonly eq: (column: "capability_digest", value: string) => BrowserSessionQuery;
  readonly single: () => Promise<SupabaseResult>;
  readonly upsert: (
    row: Readonly<Record<string, string | number>>,
    options: { readonly onConflict: "owner_user_id" }
  ) => Promise<{ readonly error: { readonly code?: string } | null }>;
};

export type CommentTranslatorModeratorShareBrowserSessionSupabaseClient = {
  readonly from: (
    table: typeof commentTranslatorModeratorShareBrowserSessionStoreContract.tableName
  ) => BrowserSessionQuery;
};

export const commentTranslatorModeratorShareBrowserSessionStoreContract = {
  implementationStage: "creator-closed-beta-c8-moderator-share-browser-session-store",
  tableName: "comment_translator_moderator_share_browser_sessions",
  runtime: "server-only",
  rowAccess: "trusted-server-service-role-only",
  persistence: "opaque-capability-sha256-digest-only",
  c7TokenPersistence: "forbidden",
  c5C6Interoperability: "forbidden-separate-table-cookie-and-capability",
  currentAuthority: "one-current-moderator-browser-session-per-owner",
  trustedSelectColumns:
    "owner_user_id, session_reference_id, token_version, capability_digest, issued_at, expires_at"
} as const;

export function createTrustedCommentTranslatorModeratorShareBrowserSessionStore({
  env = process.env,
  createSupabaseClient = createTrustedClient
}: {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly createSupabaseClient?: (
    url: string,
    serviceRoleKey: string
  ) => CommentTranslatorModeratorShareBrowserSessionSupabaseClient;
} = {}): CommentTranslatorModeratorShareBrowserSessionStore | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createCommentTranslatorModeratorShareBrowserSessionStore(
    createSupabaseClient(url, serviceRoleKey)
  );
}

export function createCommentTranslatorModeratorShareBrowserSessionStore(
  supabase: CommentTranslatorModeratorShareBrowserSessionSupabaseClient
): CommentTranslatorModeratorShareBrowserSessionStore {
  return {
    async readByDigest(capabilityDigest) {
      const result = await supabase
        .from(commentTranslatorModeratorShareBrowserSessionStoreContract.tableName)
        .select(commentTranslatorModeratorShareBrowserSessionStoreContract.trustedSelectColumns)
        .eq("capability_digest", capabilityDigest)
        .single();
      if (!result.data && (!result.error || result.error.code === "PGRST116")) return null;
      if (result.error || !result.data) {
        throw new CommentTranslatorModeratorShareBrowserSessionStoreError("read-failed");
      }
      const record = parseRecord(result.data);
      if (!record) {
        throw new CommentTranslatorModeratorShareBrowserSessionStoreError("row-unreadable");
      }
      return record;
    },
    async writeCurrent(record) {
      const result = await supabase
        .from(commentTranslatorModeratorShareBrowserSessionStoreContract.tableName)
        .upsert(
          {
            owner_user_id: record.ownerUserId,
            session_reference_id: record.sessionReferenceId,
            token_version: record.tokenVersion,
            capability_digest: record.capabilityDigest,
            issued_at: record.issuedAtIso,
            expires_at: record.expiresAtIso,
            updated_at: record.issuedAtIso
          },
          { onConflict: "owner_user_id" }
        );
      if (result.error) {
        throw new CommentTranslatorModeratorShareBrowserSessionStoreError("write-failed");
      }
    }
  };
}

class CommentTranslatorModeratorShareBrowserSessionStoreError extends Error {
  readonly name = "CommentTranslatorModeratorShareBrowserSessionStoreError";
  readonly operation: "read-failed" | "row-unreadable" | "write-failed";

  constructor(operation: "read-failed" | "row-unreadable" | "write-failed") {
    super("Trusted moderator share browser session store operation failed.");
    this.operation = operation;
  }
}

function parseRecord(row: BrowserSessionRow): CommentTranslatorModeratorShareBrowserSessionRecord | null {
  if (
    !row.owner_user_id || !row.session_reference_id || row.token_version === null ||
    !Number.isSafeInteger(row.token_version) || row.token_version < 1 ||
    !row.capability_digest || !/^[a-f0-9]{64}$/.test(row.capability_digest) ||
    !row.issued_at || Number.isNaN(Date.parse(row.issued_at)) ||
    !row.expires_at || Number.isNaN(Date.parse(row.expires_at))
  ) return null;
  return {
    ownerUserId: row.owner_user_id,
    sessionReferenceId: row.session_reference_id,
    tokenVersion: row.token_version,
    capabilityDigest: row.capability_digest,
    issuedAtIso: row.issued_at,
    expiresAtIso: row.expires_at
  };
}

function createTrustedClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorModeratorShareBrowserSessionSupabaseClient {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return {
    from(tableName) {
      let selectedColumns = commentTranslatorModeratorShareBrowserSessionStoreContract.trustedSelectColumns;
      let capabilityDigest = "";
      const query: BrowserSessionQuery = {
        select(columns) {
          selectedColumns = columns;
          return query;
        },
        eq(_column, value) {
          capabilityDigest = value;
          return query;
        },
        async single() {
          const result = await client
            .from(tableName)
            .select(selectedColumns)
            .eq("capability_digest", capabilityDigest)
            .single();
          return {
            data: result.data,
            error: result.error ? { code: result.error.code } : null
          };
        },
        async upsert(row, options) {
          const result = await client.from(tableName).upsert(row, { onConflict: options.onConflict });
          return { error: result.error ? { code: result.error.code } : null };
        }
      };
      return query;
    }
  };
}
