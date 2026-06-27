import "server-only";

import { createClient } from "@supabase/supabase-js";
import { type YouTubeOAuthCredentialTrustedDisconnectAdapter } from "./comment-translator-youtube-disconnect-runtime";
import { type YouTubeReadOnlyOAuthScope } from "./comment-translator-youtube-api-adapter";
import {
  type YouTubeOAuthCredentialPersistenceDraft,
  type YouTubeOAuthCredentialStore
} from "./comment-translator-youtube-token-store-runtime";

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

export type YouTubeOAuthCredentialSupabaseTokenMaterial = {
  credentialReferenceId: string;
  ownerUserId: string;
  provider: "youtube";
  providerChannelId: string;
  scopeLabel: "youtube.readonly";
  scopeSet: readonly YouTubeReadOnlyOAuthScope[];
  expiresAtIso: string;
  expiryStatus: "active" | "expired" | "revoked";
  revoked: boolean;
  revokedAtIso: string | null;
  accessTokenCiphertextReference: string;
  refreshTokenCiphertextReference: string;
  encryptionKeyReference: string;
  encryptionKeyVersion: string;
};

export type YouTubeOAuthCredentialStatusOwnerAuthorizedReadRequest = {
  credentialReferenceId: string;
  ownerUserId: string;
};

type SupabaseSingleResult = {
  data: YouTubeOAuthCredentialSupabaseRow | null;
  error: { code?: string; message?: string } | null;
};

type SupabaseSingleQuery = {
  single: () => Promise<SupabaseSingleResult>;
};

type SupabaseFilteredSelectQuery = SupabaseSingleQuery & {
  eq: (
    column: "credential_reference_id" | "owner_user_id",
    value: string
  ) => SupabaseFilteredSelectQuery;
};

type SupabaseSelectQuery = {
  select: (columns: typeof youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns) => SupabaseFilteredSelectQuery;
};

type SupabaseUpdateFilter = {
  eq: (column: "credential_reference_id" | "owner_user_id", value: string) => SupabaseUpdateFilter;
} & SupabaseSelectQuery;

type SupabaseTableQuery = {
  select: (columns: typeof youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns) => SupabaseFilteredSelectQuery;
  upsert: (
    row: YouTubeOAuthCredentialSupabaseInsert,
    options: { onConflict: "credential_reference_id" }
  ) => SupabaseSelectQuery;
  update: (
    row: Partial<
      Pick<
        YouTubeOAuthCredentialSupabaseInsert,
        | "revoked_at"
        | "revocation_reason"
        | "updated_at"
        | "access_token_ciphertext_ref"
        | "refresh_token_ciphertext_ref"
        | "expires_at"
        | "scope_set"
      >
    >
  ) => SupabaseUpdateFilter;
};

export type TrustedYouTubeOAuthCredentialSupabaseClient = {
  from: (tableName: typeof youtubeOAuthCredentialSupabaseAdapterContract.tableName) => SupabaseTableQuery;
};

export type TrustedYouTubeOAuthCredentialSupabaseAdapter = {
  getCredentialStatus: (
    request: YouTubeOAuthCredentialStatusOwnerAuthorizedReadRequest
  ) => Promise<YouTubeOAuthCredentialSupabaseStatus>;
  getCredentialTokenMaterial: (
    request: YouTubeOAuthCredentialStatusOwnerAuthorizedReadRequest
  ) => Promise<YouTubeOAuthCredentialSupabaseTokenMaterial>;
  updateCredentialTokenMaterial: (request: {
    credentialReferenceId: string;
    ownerUserId: string;
    accessTokenCiphertextReference: string;
    refreshTokenCiphertextReference: string;
    expiresAtIso: string;
    scopeSet: readonly YouTubeReadOnlyOAuthScope[];
  }) => Promise<YouTubeOAuthCredentialSupabaseStatus>;
  upsertCredentialStatus: (
    draft: YouTubeOAuthCredentialPersistenceDraft
  ) => Promise<YouTubeOAuthCredentialSupabaseStatus>;
  markCredentialRevokedStatus: (request: {
    credentialReferenceId: string;
    reason: "rollback-unusable-reference" | "user-disconnect" | "security-disable";
  }) => Promise<YouTubeOAuthCredentialSupabaseStatus>;
  disconnectCredentialStatus: (request: {
    credentialReferenceId: string;
    ownerUserId: string;
    reason: "user-disconnect";
  }) => Promise<YouTubeOAuthCredentialSupabaseStatus>;
};

export type TrustedYouTubeOAuthCredentialSupabaseTokenMaterialAdapter = Pick<
  TrustedYouTubeOAuthCredentialSupabaseAdapter,
  "getCredentialTokenMaterial" | "updateCredentialTokenMaterial"
>;

export type TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type TrustedYouTubeOAuthCredentialStatusReaderFactoryResult =
  | {
      status: "ready";
      trustedAdapter: Pick<TrustedYouTubeOAuthCredentialSupabaseAdapter, "getCredentialStatus">;
      missingEnvReferences: readonly [];
    }
  | {
      status: "unavailable";
      trustedAdapter: null;
      missingEnvReferences: readonly TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName[];
      reconnectRequired: true;
      reason: "trusted-service-role-env-missing";
    };

export type TrustedYouTubeOAuthCredentialPersistenceRuntimeFactoryResult =
  | {
      status: "ready";
      trustedStore: YouTubeOAuthCredentialStore;
      missingEnvReferences: readonly [];
    }
  | {
      status: "unavailable";
      trustedStore: null;
      missingEnvReferences: readonly TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName[];
      reconnectRequired: true;
      reason: "trusted-service-role-env-missing";
    };

export type TrustedYouTubeOAuthCredentialTokenMaterialRuntimeFactoryResult =
  | {
      status: "ready";
      trustedTokenMaterialAdapter: Pick<
        TrustedYouTubeOAuthCredentialSupabaseAdapter,
        "getCredentialTokenMaterial" | "updateCredentialTokenMaterial"
      >;
      missingEnvReferences: readonly [];
    }
  | {
      status: "unavailable";
      trustedTokenMaterialAdapter: null;
      missingEnvReferences: readonly TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName[];
      reconnectRequired: true;
      reason: "trusted-service-role-env-missing";
    };

export type TrustedYouTubeOAuthCredentialDisconnectRuntimeFactoryResult =
  | {
      status: "ready";
      trustedDisconnectAdapter: YouTubeOAuthCredentialTrustedDisconnectAdapter;
      missingEnvReferences: readonly [];
    }
  | {
      status: "unavailable";
      trustedDisconnectAdapter: null;
      missingEnvReferences: readonly TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName[];
      reconnectRequired: true;
      reason: "trusted-service-role-env-missing";
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

export const youtubeOAuthCredentialTrustedServiceRoleStatusReaderContract = {
  implementationStage: "trusted-service-role-status-wiring-contract",
  runtime: "server-only",
  dependency: "@supabase/supabase-js",
  requiredEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  rowAccess: "trusted-server-service-role-only",
  queryMode: "credential-status-read-only",
  unavailableState: "sanitized-unavailable-reconnect-required",
  outputTokenValues: "never-returned-by-design",
  ciphertextOutput: "never-returned-by-design",
  decryptCapability: "forbidden-to-client-and-not-implemented",
  loggingPolicy: "no-token-value-logging",
  rollbackBoundary: "revoke-or-invalidate-unusable-credential-reference"
} as const;

export const youtubeOAuthCredentialTrustedServiceRolePersistenceRuntimeContract = {
  implementationStage: "trusted-service-role-token-persistence-runtime-expansion",
  prerequisiteApprovalGate: {
    pullRequest: "#327",
    mergeCommit: "22c66bb8928e4594a9c732a12e22af63b4254bed",
    status: "ready-for-separate-runtime-or-apply-pr"
  },
  runtime: "server-only",
  dependency: "@supabase/supabase-js",
  requiredEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  storeInterface: "YouTubeOAuthCredentialStore",
  rowAccess: "trusted-server-service-role-only",
  writeMode: "credential-reference-persistence-and-invalidation",
  remoteSupabaseApply: "forbidden-in-this-slice",
  browserReadableOutput: "credential-reference-and-sanitized-status-only",
  credentialResolutionDisabledEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  inputTokenValues: "forbidden",
  outputTokenValues: "never-returned-by-design",
  ciphertextOutput: "never-returned-by-design",
  decryptCapability: "forbidden-to-client-and-not-implemented",
  liveGoogleApiCall: "not-implemented",
  refreshRuntime: "follow-up",
  revocationRuntime: "minimal-reference-invalidation-only",
  loggingPolicy: "no-token-value-logging",
  rollbackBoundary: "revoke-or-invalidate-unusable-credential-reference"
} as const;

export const youtubeOAuthCredentialTrustedServiceRoleTokenMaterialRuntimeContract = {
  implementationStage: "trusted-service-role-stored-token-material-runtime",
  runtime: "server-only",
  dependency: "@supabase/supabase-js",
  requiredEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  rowAccess: "trusted-server-service-role-only",
  readMode: "owner-authorized-sealed-token-material-read",
  writeMode: "owner-authorized-refreshed-token-material-update",
  browserReadableOutput: "forbidden",
  tokenValueOutput: "never-returned-by-design",
  refreshTokenValueOutput: "never-returned-by-design",
  loggingPolicy: "no-token-value-logging"
} as const;

export const youtubeOAuthCredentialTrustedServiceRoleDisconnectRuntimeContract = {
  implementationStage: "trusted-service-role-disconnect-runtime",
  runtime: "server-only",
  dependency: "@supabase/supabase-js",
  requiredEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  rowAccess: "trusted-server-service-role-only",
  writeMode: "owner-authorized-user-disconnect-and-revocation",
  remoteSupabaseApply: "forbidden-in-this-slice",
  browserReadableOutput: "sanitized-disconnect-status-only",
  inputTokenValues: "forbidden",
  outputTokenValues: "never-returned-by-design",
  ciphertextOutput: "never-returned-by-design",
  decryptCapability: "forbidden-to-client-and-not-implemented",
  liveGoogleApiCall: "not-implemented",
  loggingPolicy: "no-token-value-logging",
  rollbackBoundary: "revoke-or-invalidate-unusable-credential-reference"
} as const;

export class YouTubeOAuthCredentialNotFoundError extends Error {
  constructor() {
    super("Trusted YouTube OAuth credential was not found.");
    this.name = "YouTubeOAuthCredentialNotFoundError";
  }
}

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

export function createYouTubeOAuthCredentialSupabaseTokenMaterial(
  row: YouTubeOAuthCredentialSupabaseRow
): YouTubeOAuthCredentialSupabaseTokenMaterial {
  const status = createYouTubeOAuthCredentialSupabaseStatus(row);

  return {
    credentialReferenceId: row.credential_reference_id,
    ownerUserId: row.owner_user_id,
    provider: row.provider,
    providerChannelId: row.provider_channel_id,
    scopeLabel: status.scopeLabel,
    scopeSet: row.scope_set,
    expiresAtIso: row.expires_at,
    expiryStatus: status.expiryStatus,
    revoked: status.revoked,
    revokedAtIso: status.revokedAtIso,
    accessTokenCiphertextReference: row.access_token_ciphertext_ref,
    refreshTokenCiphertextReference: row.refresh_token_ciphertext_ref,
    encryptionKeyReference: row.encryption_key_ref,
    encryptionKeyVersion: row.encryption_key_version
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
    async getCredentialStatus(request) {
      const result = await supabase
        .from(youtubeOAuthCredentialSupabaseAdapterContract.tableName)
        .select(youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns)
        .eq("owner_user_id", request.ownerUserId)
        .eq("credential_reference_id", request.credentialReferenceId)
        .single();

      return createYouTubeOAuthCredentialSupabaseStatus(requireSupabaseRow(result));
    },
    async getCredentialTokenMaterial(request) {
      const query = supabase
        .from(youtubeOAuthCredentialSupabaseAdapterContract.tableName)
        .select(youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns)
        .eq("credential_reference_id", request.credentialReferenceId);
      const result = request.ownerUserId
        ? await query.eq("owner_user_id", request.ownerUserId).single()
        : await query.single();

      return createYouTubeOAuthCredentialSupabaseTokenMaterial(requireSupabaseRow(result));
    },
    async updateCredentialTokenMaterial(request) {
      const updatedAtIso = nowIso();
      const result = await supabase
        .from(youtubeOAuthCredentialSupabaseAdapterContract.tableName)
        .update({
          access_token_ciphertext_ref: request.accessTokenCiphertextReference,
          refresh_token_ciphertext_ref: request.refreshTokenCiphertextReference,
          expires_at: request.expiresAtIso,
          scope_set: request.scopeSet,
          updated_at: updatedAtIso
        })
        .eq("owner_user_id", request.ownerUserId)
        .eq("credential_reference_id", request.credentialReferenceId)
        .select(youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns)
        .single();

      return createYouTubeOAuthCredentialSupabaseStatus(requireSupabaseRow(result));
    },
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
    },
    async disconnectCredentialStatus(request) {
      const revokedAtIso = nowIso();
      const result = await supabase
        .from(youtubeOAuthCredentialSupabaseAdapterContract.tableName)
        .update({
          revoked_at: revokedAtIso,
          revocation_reason: request.reason,
          updated_at: revokedAtIso
        })
        .eq("owner_user_id", request.ownerUserId)
        .eq("credential_reference_id", request.credentialReferenceId)
        .select(youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns)
        .single();

      return createYouTubeOAuthCredentialSupabaseStatus(requireSupabaseRow(result));
    }
  };
}

export function createTrustedYouTubeOAuthCredentialSupabasePersistenceStore({
  supabase,
  nowIso
}: {
  supabase: TrustedYouTubeOAuthCredentialSupabaseClient;
  nowIso: () => string;
}): YouTubeOAuthCredentialStore {
  const adapter = createTrustedYouTubeOAuthCredentialSupabaseAdapter({ supabase, nowIso });

  return {
    async upsertEncryptedCredential(draft) {
      await adapter.upsertCredentialStatus(draft);
      return draft;
    },
    async markCredentialRevoked(credentialReferenceId, reason) {
      const status = await adapter.markCredentialRevokedStatus({
        credentialReferenceId,
        reason
      });

      if (!status.revokedAtIso) {
        throw new Error("Trusted YouTube OAuth credential revocation did not return a revocation timestamp.");
      }

      return {
        credentialReferenceId: status.credentialReferenceId,
        revokedAtIso: status.revokedAtIso,
        reason
      };
    }
  };
}

export function createTrustedYouTubeOAuthCredentialSupabaseStatusReader({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  env?: Partial<Record<TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName, string | undefined>>;
  createSupabaseClient?: (
    url: string,
    serviceRoleKey: string
  ) => TrustedYouTubeOAuthCredentialSupabaseClient;
  nowIso?: () => string;
} = {}): TrustedYouTubeOAuthCredentialStatusReaderFactoryResult {
  const trustedEnv =
    env ?? (process.env as Partial<Record<TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName[] = [];

  if (!url) {
    missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missingEnvReferences.length > 0 || !url || !serviceRoleKey) {
    return {
      status: "unavailable",
      trustedAdapter: null,
      missingEnvReferences,
      reconnectRequired: true,
      reason: "trusted-service-role-env-missing"
    };
  }

  const adapter = createTrustedYouTubeOAuthCredentialSupabaseAdapter({
    supabase: createSupabaseClient(url, serviceRoleKey),
    nowIso
  });

  return {
    status: "ready",
    trustedAdapter: {
      getCredentialStatus: adapter.getCredentialStatus
    },
    missingEnvReferences: []
  };
}

export function createTrustedYouTubeOAuthCredentialSupabasePersistenceRuntime({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  env?: Partial<Record<TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName, string | undefined>>;
  createSupabaseClient?: (
    url: string,
    serviceRoleKey: string
  ) => TrustedYouTubeOAuthCredentialSupabaseClient;
  nowIso?: () => string;
} = {}): TrustedYouTubeOAuthCredentialPersistenceRuntimeFactoryResult {
  const trustedEnv =
    env ?? (process.env as Partial<Record<TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName[] = [];

  if (!url) {
    missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missingEnvReferences.length > 0 || !url || !serviceRoleKey) {
    return {
      status: "unavailable",
      trustedStore: null,
      missingEnvReferences,
      reconnectRequired: true,
      reason: "trusted-service-role-env-missing"
    };
  }

  return {
    status: "ready",
    trustedStore: createTrustedYouTubeOAuthCredentialSupabasePersistenceStore({
      supabase: createSupabaseClient(url, serviceRoleKey),
      nowIso
    }),
    missingEnvReferences: []
  };
}

export function createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  env?: Partial<Record<TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName, string | undefined>>;
  createSupabaseClient?: (
    url: string,
    serviceRoleKey: string
  ) => TrustedYouTubeOAuthCredentialSupabaseClient;
  nowIso?: () => string;
} = {}): TrustedYouTubeOAuthCredentialTokenMaterialRuntimeFactoryResult {
  const trustedEnv =
    env ?? (process.env as Partial<Record<TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName[] = [];

  if (!url) {
    missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missingEnvReferences.length > 0 || !url || !serviceRoleKey) {
    return {
      status: "unavailable",
      trustedTokenMaterialAdapter: null,
      missingEnvReferences,
      reconnectRequired: true,
      reason: "trusted-service-role-env-missing"
    };
  }

  const adapter = createTrustedYouTubeOAuthCredentialSupabaseAdapter({
    supabase: createSupabaseClient(url, serviceRoleKey),
    nowIso
  });

  return {
    status: "ready",
    trustedTokenMaterialAdapter: {
      getCredentialTokenMaterial: adapter.getCredentialTokenMaterial,
      updateCredentialTokenMaterial: adapter.updateCredentialTokenMaterial
    },
    missingEnvReferences: []
  };
}

export function createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  env?: Partial<Record<TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName, string | undefined>>;
  createSupabaseClient?: (
    url: string,
    serviceRoleKey: string
  ) => TrustedYouTubeOAuthCredentialSupabaseClient;
  nowIso?: () => string;
} = {}): TrustedYouTubeOAuthCredentialDisconnectRuntimeFactoryResult {
  const trustedEnv =
    env ?? (process.env as Partial<Record<TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName[] = [];

  if (!url) {
    missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missingEnvReferences.length > 0 || !url || !serviceRoleKey) {
    return {
      status: "unavailable",
      trustedDisconnectAdapter: null,
      missingEnvReferences,
      reconnectRequired: true,
      reason: "trusted-service-role-env-missing"
    };
  }

  const adapter = createTrustedYouTubeOAuthCredentialSupabaseAdapter({
    supabase: createSupabaseClient(url, serviceRoleKey),
    nowIso
  });

  return {
    status: "ready",
    trustedDisconnectAdapter: {
      getCredentialStatus: adapter.getCredentialStatus,
      disconnectCredentialStatus: adapter.disconnectCredentialStatus
    },
    missingEnvReferences: []
  };
}

function requireSupabaseRow(result: SupabaseSingleResult): YouTubeOAuthCredentialSupabaseRow {
  if (!result.data && (!result.error || result.error.code === "PGRST116")) {
    throw new YouTubeOAuthCredentialNotFoundError();
  }

  if (result.error || !result.data) {
    throw new Error("Trusted YouTube OAuth credential Supabase adapter query failed.");
  }

  return result.data;
}

function isExpired(row: YouTubeOAuthCredentialSupabaseRow): boolean {
  return Date.parse(row.expires_at) <= Date.parse(row.updated_at);
}

function readTrustedEnv(
  env: Partial<Record<TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName, string | undefined>>,
  name: TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): TrustedYouTubeOAuthCredentialSupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as unknown as TrustedYouTubeOAuthCredentialSupabaseClient;
}
