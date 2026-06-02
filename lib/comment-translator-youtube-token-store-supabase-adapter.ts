import "server-only";

import { type YouTubeReadOnlyOAuthScope } from "./comment-translator-youtube-api-adapter";
import { type YouTubeOAuthCredentialPersistenceDraft } from "./comment-translator-youtube-token-store-runtime";

export type YouTubeOAuthCredentialSupabaseRow = {
  id: string;
  owner_user_id: string;
  credential_reference_id: string;
  provider: "youtube";
  provider_channel_id: string;
  scope_set: readonly YouTubeReadOnlyOAuthScope[];
  scope_metadata: {
    readonly access: "read-only";
    readonly provider: "youtube";
  };
  expires_at: string;
  revoked_at: string | null;
  revocation_reason: "rollback-unusable-reference" | "user-disconnect" | "security-disable" | null;
  access_token_ciphertext_ref: string;
  refresh_token_ciphertext_ref: string;
  encryption_key_ref: string;
  encryption_key_version: string;
  created_at: string;
  updated_at: string;
};

export type YouTubeOAuthCredentialSupabaseInsert = Omit<YouTubeOAuthCredentialSupabaseRow, "id">;

export type YouTubeOAuthCredentialSupabaseStatus = {
  credentialReferenceId: string;
  provider: "youtube";
  providerChannelId: string;
  scopeLabel: "youtube.readonly";
  scopeSet: readonly YouTubeReadOnlyOAuthScope[];
  expiresAtIso: string;
  expiryStatus: "active" | "expired" | "revoked";
  revoked: boolean;
  revokedAtIso: string | null;
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  ciphertext: "never-returned-by-design";
  decryptCapability: "forbidden";
};

type SupabaseSingleResult = {
  data: YouTubeOAuthCredentialSupabaseRow | null;
  error: { message?: string } | null;
};

type SupabaseSingleQuery = {
  single: () => Promise<SupabaseSingleResult>;
};

type SupabaseSelectQuery = {
  select: (columns: typeof youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns) => SupabaseSingleQuery;
};

type SupabaseUpdateFilter = {
  eq: (column: "credential_reference_id", value: string) => SupabaseSelectQuery;
};

type SupabaseTableQuery = {
  upsert: (
    row: YouTubeOAuthCredentialSupabaseInsert,
    options: { onConflict: "credential_reference_id" }
  ) => SupabaseSelectQuery;
  update: (
    row: Pick<YouTubeOAuthCredentialSupabaseInsert, "revoked_at" | "revocation_reason" | "updated_at">
  ) => SupabaseUpdateFilter;
};

export type TrustedYouTubeOAuthCredentialSupabaseClient = {
  from: (tableName: typeof youtubeOAuthCredentialSupabaseAdapterContract.tableName) => SupabaseTableQuery;
};

export type TrustedYouTubeOAuthCredentialSupabaseAdapter = {
  upsertCredentialStatus: (
    draft: YouTubeOAuthCredentialPersistenceDraft
  ) => Promise<YouTubeOAuthCredentialSupabaseStatus>;
  markCredentialRevokedStatus: (request: {
    credentialReferenceId: string;
    reason: "rollback-unusable-reference" | "user-disconnect" | "security-disable";
  }) => Promise<YouTubeOAuthCredentialSupabaseStatus>;
};

export const youtubeOAuthCredentialSupabaseAdapterContract = {
  implementationStage: "trusted-supabase-adapter-status-skeleton",
  tableName: "youtube_oauth_credentials",
  rowAccess: "trusted-server-service-role-only",
  browserReadableOutput: "sanitized-status-only",
  inputTokenValues: "forbidden",
  outputTokenValues: "never-returned-by-design",
  ciphertextOutput: "never-returned-by-design",
  decryptCapability: "forbidden-to-client-and-not-implemented",
  emergencyDisableEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  trustedSelectColumns:
    "id, owner_user_id, credential_reference_id, provider, provider_channel_id, scope_set, scope_metadata, expires_at, revoked_at, revocation_reason, access_token_ciphertext_ref, refresh_token_ciphertext_ref, encryption_key_ref, encryption_key_version, created_at, updated_at",
  rollbackBoundary: "revoke-or-invalidate-unusable-credential-reference",
  loggingPolicy: "no-token-value-logging"
} as const;

export function createYouTubeOAuthCredentialSupabaseInsert(
  draft: YouTubeOAuthCredentialPersistenceDraft
): YouTubeOAuthCredentialSupabaseInsert {
  return {
    owner_user_id: draft.ownerUserId,
    credential_reference_id: draft.credentialReferenceId,
    provider: draft.provider,
    provider_channel_id: draft.providerChannelId,
    scope_set: draft.scopeSet,
    scope_metadata: draft.scopeMetadata,
    expires_at: draft.expiresAtIso,
    revoked_at: draft.revokedAtIso,
    revocation_reason: null,
    access_token_ciphertext_ref: draft.accessTokenCiphertextReference,
    refresh_token_ciphertext_ref: draft.refreshTokenCiphertextReference,
    encryption_key_ref: draft.encryptionKeyReference,
    encryption_key_version: draft.encryptionKeyVersion,
    created_at: draft.createdAtIso,
    updated_at: draft.updatedAtIso
  };
}

export function createYouTubeOAuthCredentialSupabaseStatus(
  row: YouTubeOAuthCredentialSupabaseRow
): YouTubeOAuthCredentialSupabaseStatus {
  const revoked = row.revoked_at !== null;

  return {
    credentialReferenceId: row.credential_reference_id,
    provider: row.provider,
    providerChannelId: row.provider_channel_id,
    scopeLabel: "youtube.readonly",
    scopeSet: row.scope_set,
    expiresAtIso: row.expires_at,
    expiryStatus: revoked ? "revoked" : isExpired(row) ? "expired" : "active",
    revoked,
    revokedAtIso: row.revoked_at,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    ciphertext: "never-returned-by-design",
    decryptCapability: "forbidden"
  };
}

export function createTrustedYouTubeOAuthCredentialSupabaseAdapter({
  supabase,
  nowIso
}: {
  supabase: TrustedYouTubeOAuthCredentialSupabaseClient;
  nowIso: () => string;
}): TrustedYouTubeOAuthCredentialSupabaseAdapter {
  return {
    async upsertCredentialStatus(draft) {
      const result = await supabase
        .from(youtubeOAuthCredentialSupabaseAdapterContract.tableName)
        .upsert(createYouTubeOAuthCredentialSupabaseInsert(draft), {
          onConflict: "credential_reference_id"
        })
        .select(youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns)
        .single();

      return createYouTubeOAuthCredentialSupabaseStatus(requireSupabaseRow(result));
    },
    async markCredentialRevokedStatus(request) {
      const revokedAtIso = nowIso();
      const result = await supabase
        .from(youtubeOAuthCredentialSupabaseAdapterContract.tableName)
        .update({
          revoked_at: revokedAtIso,
          revocation_reason: request.reason,
          updated_at: revokedAtIso
        })
        .eq("credential_reference_id", request.credentialReferenceId)
        .select(youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns)
        .single();

      return createYouTubeOAuthCredentialSupabaseStatus(requireSupabaseRow(result));
    }
  };
}

function requireSupabaseRow(result: SupabaseSingleResult): YouTubeOAuthCredentialSupabaseRow {
  if (result.error || !result.data) {
    throw new Error("Trusted YouTube OAuth credential Supabase adapter query failed.");
  }

  return result.data;
}

function isExpired(row: YouTubeOAuthCredentialSupabaseRow): boolean {
  return Date.parse(row.expires_at) <= Date.parse(row.updated_at);
}
