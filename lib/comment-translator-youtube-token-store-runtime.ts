import "server-only";

import { type YouTubeReadOnlyOAuthScope } from "./comment-translator-youtube-api-adapter";

const youtubeReadonlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly" as const;

export type YouTubeOAuthCredentialPersistenceDraftInput = {
  ownerUserId: string;
  credentialReferenceId: string;
  providerChannelId: string;
  scopeSet: readonly YouTubeReadOnlyOAuthScope[];
  expiresAtIso: string;
  accessTokenCiphertextReference: string;
  refreshTokenCiphertextReference: string;
  encryptionKeyReference: string;
  encryptionKeyVersion: string;
  nowIso: string;
};

export type YouTubeOAuthCredentialPersistenceDraft = {
  ownerUserId: string;
  credentialReferenceId: string;
  provider: "youtube";
  providerChannelId: string;
  scopeSet: readonly YouTubeReadOnlyOAuthScope[];
  scopeMetadata: {
    readonly access: "read-only";
    readonly provider: "youtube";
  };
  expiresAtIso: string;
  revokedAtIso: null;
  accessTokenCiphertextReference: string;
  refreshTokenCiphertextReference: string;
  encryptionKeyReference: string;
  encryptionKeyVersion: string;
  status: "active";
  createdAtIso: string;
  updatedAtIso: string;
  tokenValue: "never-accepted-by-design";
  refreshTokenValue: "never-accepted-by-design";
};

export type YouTubeOAuthCredentialSanitizedStatus = {
  credentialReferenceId: string;
  provider: "youtube";
  providerChannelId: string;
  scopeSet: readonly YouTubeReadOnlyOAuthScope[];
  expiresAtIso: string;
  revoked: boolean;
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
};

export type YouTubeOAuthCredentialPersistenceResult =
  | (YouTubeOAuthCredentialSanitizedStatus & {
      status: "persisted";
    })
  | {
      status: "credential-resolution-disabled";
      credentialReferenceId: string;
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
    };

export type YouTubeOAuthCredentialRevocationResult = {
  status: "revoked";
  credentialReferenceId: string;
  revokedAtIso: string;
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
};

export type YouTubeOAuthCredentialStore = {
  upsertEncryptedCredential: (
    row: YouTubeOAuthCredentialPersistenceDraft
  ) => Promise<YouTubeOAuthCredentialPersistenceDraft>;
  markCredentialRevoked: (
    credentialReferenceId: string,
    reason: "rollback-unusable-reference" | "user-disconnect" | "security-disable"
  ) => Promise<{
    credentialReferenceId: string;
    revokedAtIso: string;
    reason: string;
  }>;
};

export type PersistYouTubeOAuthCredentialReferenceRequest = {
  draft: YouTubeOAuthCredentialPersistenceDraft;
  store: YouTubeOAuthCredentialStore;
  credentialResolutionDisabled: boolean;
};

export type InvalidateYouTubeOAuthCredentialReferenceRequest = {
  credentialReferenceId: string;
  reason: "rollback-unusable-reference" | "user-disconnect" | "security-disable";
  store: YouTubeOAuthCredentialStore;
};

export const youtubeOAuthTokenStoreKeyManagementReferences = {
  keyReferenceEnv: "YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF",
  keyVersionEnv: "YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION",
  credentialResolutionDisabledEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  managedSecretReference: "managed-secret-or-kms-reference-only",
  secretValueHandling: "never-read-or-printed-by-this-contract",
  clientDecrypt: "forbidden"
} as const;

export const youtubeOAuthCredentialTokenStoreRuntimeContract = {
  implementationStage: "server-only-token-persistence-runtime-skeleton",
  tableName: "youtube_oauth_credentials",
  rowOwner: "trusted-server-runtime",
  browserReadableState: "credential-reference-and-sanitized-status-only",
  tokenValueInput: "forbidden",
  tokenValueOutput: "never-returned-by-design",
  ciphertextReferenceInput: "server-only-reference",
  keyManagement: youtubeOAuthTokenStoreKeyManagementReferences,
  rlsPosture: "service-role-only-encrypted-row-access",
  clientDecrypt: "forbidden",
  googleApiLiveCall: "not-implemented",
  refreshRuntime: "follow-up",
  revocationRuntime: "minimal-reference-invalidation-only",
  quotaWrite: "not-implemented"
} as const;

export function createYouTubeOAuthCredentialPersistenceDraft(
  input: YouTubeOAuthCredentialPersistenceDraftInput
): YouTubeOAuthCredentialPersistenceDraft {
  return {
    ownerUserId: input.ownerUserId,
    credentialReferenceId: input.credentialReferenceId,
    provider: "youtube",
    providerChannelId: input.providerChannelId,
    scopeSet: [...input.scopeSet],
    scopeMetadata: {
      access: "read-only",
      provider: "youtube"
    },
    expiresAtIso: input.expiresAtIso,
    revokedAtIso: null,
    accessTokenCiphertextReference: input.accessTokenCiphertextReference,
    refreshTokenCiphertextReference: input.refreshTokenCiphertextReference,
    encryptionKeyReference: input.encryptionKeyReference,
    encryptionKeyVersion: input.encryptionKeyVersion,
    status: "active",
    createdAtIso: input.nowIso,
    updatedAtIso: input.nowIso,
    tokenValue: "never-accepted-by-design",
    refreshTokenValue: "never-accepted-by-design"
  };
}

export async function persistYouTubeOAuthCredentialReference(
  request: PersistYouTubeOAuthCredentialReferenceRequest
): Promise<YouTubeOAuthCredentialPersistenceResult> {
  if (request.credentialResolutionDisabled) {
    return {
      status: "credential-resolution-disabled",
      credentialReferenceId: request.draft.credentialReferenceId,
      tokenValue: "never-returned-by-design",
      refreshTokenValue: "never-returned-by-design"
    };
  }

  const persisted = await request.store.upsertEncryptedCredential(request.draft);

  return {
    status: "persisted",
    ...createYouTubeOAuthCredentialStatus(persisted)
  };
}

export function createYouTubeOAuthCredentialStatus(
  row: YouTubeOAuthCredentialPersistenceDraft
): YouTubeOAuthCredentialSanitizedStatus {
  return {
    credentialReferenceId: row.credentialReferenceId,
    provider: row.provider,
    providerChannelId: row.providerChannelId,
    scopeSet: row.scopeSet,
    expiresAtIso: row.expiresAtIso,
    revoked: row.revokedAtIso !== null,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design"
  };
}

export async function invalidateYouTubeOAuthCredentialReference(
  request: InvalidateYouTubeOAuthCredentialReferenceRequest
): Promise<YouTubeOAuthCredentialRevocationResult> {
  const revoked = await request.store.markCredentialRevoked(request.credentialReferenceId, request.reason);

  return {
    status: "revoked",
    credentialReferenceId: revoked.credentialReferenceId,
    revokedAtIso: revoked.revokedAtIso,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design"
  };
}

export function isYouTubeOAuthCredentialResolutionDisabled(env: Record<string, string | undefined>): boolean {
  const value = env[youtubeOAuthTokenStoreKeyManagementReferences.credentialResolutionDisabledEnv];
  return value === "1" || value?.toLocaleLowerCase() === "true";
}

export const youtubeOAuthCredentialDefaultScopeSet = [youtubeReadonlyOAuthScope] as const;
