import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorObsOverlayBrowserSessionRecord = {
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly tokenVersion: number;
  readonly capabilityDigest: string;
  readonly issuedAtIso: string;
  readonly expiresAtIso: string;
};

export type CommentTranslatorObsOverlayBrowserSessionStore = {
  readonly readByDigest: (capabilityDigest: string) => Promise<CommentTranslatorObsOverlayBrowserSessionRecord | null>;
  readonly writeCurrent: (record: CommentTranslatorObsOverlayBrowserSessionRecord) => Promise<void>;
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
  readonly select: (columns: typeof commentTranslatorObsOverlayBrowserSessionStoreContract.trustedSelectColumns) => BrowserSessionQuery;
  readonly eq: (column: "capability_digest", value: string) => BrowserSessionQuery;
  readonly single: () => Promise<SupabaseResult>;
  readonly upsert: (
    row: Readonly<Record<string, string | number>>,
    options: { readonly onConflict: "owner_user_id" }
  ) => Promise<{ readonly error: { readonly code?: string } | null }>;
};

export type CommentTranslatorObsOverlayBrowserSessionSupabaseClient = {
  readonly from: (table: typeof commentTranslatorObsOverlayBrowserSessionStoreContract.tableName) => BrowserSessionQuery;
};

export const commentTranslatorObsOverlayBrowserSessionStoreContract = {
  implementationStage: "creator-closed-beta-c6-obs-overlay-browser-session-store",
  tableName: "comment_translator_obs_overlay_browser_sessions",
  runtime: "server-only",
  rowAccess: "trusted-server-service-role-only",
  persistence: "opaque-capability-sha256-digest-only",
  c5TokenPersistence: "forbidden",
  currentAuthority: "one-current-browser-session-per-owner",
  trustedSelectColumns: "owner_user_id, session_reference_id, token_version, capability_digest, issued_at, expires_at"
} as const;

export function createTrustedCommentTranslatorObsOverlayBrowserSessionStore({
  env = process.env,
  createSupabaseClient = createTrustedClient
}: {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorObsOverlayBrowserSessionSupabaseClient;
} = {}): CommentTranslatorObsOverlayBrowserSessionStore | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createCommentTranslatorObsOverlayBrowserSessionStore(createSupabaseClient(url, serviceRoleKey));
}

export function createCommentTranslatorObsOverlayBrowserSessionStore(
  supabase: CommentTranslatorObsOverlayBrowserSessionSupabaseClient
): CommentTranslatorObsOverlayBrowserSessionStore {
  return {
    async readByDigest(capabilityDigest) {
      const result = await supabase
        .from(commentTranslatorObsOverlayBrowserSessionStoreContract.tableName)
        .select(commentTranslatorObsOverlayBrowserSessionStoreContract.trustedSelectColumns)
        .eq("capability_digest", capabilityDigest)
        .single();
      if (!result.data && (!result.error || result.error.code === "PGRST116")) return null;
      if (result.error || !result.data) throw new Error("Trusted OBS overlay browser session read failed.");
      const record = parseRecord(result.data);
      if (!record) throw new Error("Trusted OBS overlay browser session row is unreadable.");
      return record;
    },
    async writeCurrent(record) {
      const result = await supabase.from(commentTranslatorObsOverlayBrowserSessionStoreContract.tableName).upsert({
        owner_user_id: record.ownerUserId,
        session_reference_id: record.sessionReferenceId,
        token_version: record.tokenVersion,
        capability_digest: record.capabilityDigest,
        issued_at: record.issuedAtIso,
        expires_at: record.expiresAtIso,
        updated_at: record.issuedAtIso
      }, { onConflict: "owner_user_id" });
      if (result.error) throw new Error("Trusted OBS overlay browser session write failed.");
    }
  };
}

function parseRecord(row: BrowserSessionRow): CommentTranslatorObsOverlayBrowserSessionRecord | null {
  if (!row.owner_user_id || !row.session_reference_id || row.token_version === null || row.token_version < 1 ||
      !row.capability_digest || !/^[a-f0-9]{64}$/.test(row.capability_digest) ||
      !row.issued_at || Number.isNaN(Date.parse(row.issued_at)) ||
      !row.expires_at || Number.isNaN(Date.parse(row.expires_at))) return null;
  return {
    ownerUserId: row.owner_user_id,
    sessionReferenceId: row.session_reference_id,
    tokenVersion: row.token_version,
    capabilityDigest: row.capability_digest,
    issuedAtIso: row.issued_at,
    expiresAtIso: row.expires_at
  };
}

function createTrustedClient(url: string, serviceRoleKey: string): CommentTranslatorObsOverlayBrowserSessionSupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let selectedColumns = commentTranslatorObsOverlayBrowserSessionStoreContract.trustedSelectColumns;
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
        .from(commentTranslatorObsOverlayBrowserSessionStoreContract.tableName)
        .select(selectedColumns)
        .eq("capability_digest", capabilityDigest)
        .single();
      return { data: result.data, error: result.error ? { code: result.error.code } : null };
    },
    async upsert(row, options) {
      const result = await client
        .from(commentTranslatorObsOverlayBrowserSessionStoreContract.tableName)
        .upsert(row, { onConflict: options.onConflict });
      return { error: result.error ? { code: result.error.code } : null };
    }
  };
  return { from: () => query };
}
