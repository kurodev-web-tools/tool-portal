import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type {
  YouTubeRuntimeReadOnlyOAuthScope,
  YouTubeServerOnlyLiveTokenMaterialResolver
} from "./comment-translator-youtube-runtime-foundation";
import type {
  YouTubeOAuthCredentialSupabaseStatus,
  YouTubeOAuthCredentialSupabaseTokenMaterial,
  TrustedYouTubeOAuthCredentialSupabaseTokenMaterialAdapter
} from "./comment-translator-youtube-token-store-supabase-adapter";

const googleOAuthTokenEndpoint = "https://oauth2.googleapis.com/token";
const youtubeReadonlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly" as const;
const sealedPrefix = "ytseal_v1";

export type YouTubeOAuthStoredTokenMaterialEnvName =
  | "GOOGLE_OAUTH_CLIENT_ID"
  | "GOOGLE_OAUTH_CLIENT_SECRET"
  | "YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET";

export type YouTubeOAuthRefreshTokenExchangeResult =
  | {
      status: "refreshed";
      accessTokenMaterial: string;
      refreshTokenMaterial: string | null;
      expiresAtIso: string;
      scopeSet: readonly YouTubeRuntimeReadOnlyOAuthScope[];
    }
  | {
      status: "refresh-failed";
      reason: "provider-rejected-refresh" | "provider-unavailable" | "provider-response-invalid";
      providerErrorBody: "never-returned-by-design";
    };

export type YouTubeOAuthRefreshTokenExchangeAdapter = {
  refreshAccessToken(request: {
    refreshTokenMaterial: string;
    clientId: string;
    clientSecret: string;
  }): Promise<YouTubeOAuthRefreshTokenExchangeResult>;
};

export const youtubeOAuthStoredTokenMaterialRuntimeContract = {
  implementationStage: "normal-ui-stored-token-material-live-provider",
  runtime: "server-only",
  tokenStorage: "sealed-token-material-in-trusted-token-store-row",
  refreshRuntime: "server-side-refresh-and-persist",
  browserReadableOutput: "sanitized-status-counts-reasons-only",
  legacyReferenceHandling: "sanitized-unavailable-reconnect-required",
  tokenValueOutput: "never-returned-by-design",
  refreshTokenValueOutput: "never-returned-by-design",
  authorizationHeaderOutput: "never-returned-by-design",
  providerErrorBodyOutput: "never-returned-by-design",
  loggingPolicy: "no-token-value-or-provider-body-logging"
} as const;

export function createYouTubeOAuthTokenMaterialCiphertextReferences({
  credentialReferenceId,
  accessTokenMaterial,
  refreshTokenMaterial,
  encryptionKeyReference,
  encryptionKeyVersion,
  credentialReferenceSecret
}: {
  credentialReferenceId: string;
  accessTokenMaterial: string;
  refreshTokenMaterial: string;
  encryptionKeyReference: string;
  encryptionKeyVersion: string;
  credentialReferenceSecret: string;
}) {
  return {
    accessTokenCiphertextReference: sealYouTubeOAuthTokenMaterial({
      credentialReferenceId,
      tokenKind: "access",
      tokenMaterial: accessTokenMaterial,
      encryptionKeyReference,
      encryptionKeyVersion,
      credentialReferenceSecret
    }),
    refreshTokenCiphertextReference: sealYouTubeOAuthTokenMaterial({
      credentialReferenceId,
      tokenKind: "refresh",
      tokenMaterial: refreshTokenMaterial,
      encryptionKeyReference,
      encryptionKeyVersion,
      credentialReferenceSecret
    }),
    encryptionKeyReference,
    encryptionKeyVersion
  };
}

export function sealYouTubeOAuthTokenMaterial({
  credentialReferenceId,
  tokenKind,
  tokenMaterial,
  encryptionKeyReference,
  encryptionKeyVersion,
  credentialReferenceSecret,
  iv = randomBytes(12)
}: {
  credentialReferenceId: string;
  tokenKind: "access" | "refresh";
  tokenMaterial: string;
  encryptionKeyReference: string;
  encryptionKeyVersion: string;
  credentialReferenceSecret: string;
  iv?: Buffer;
}) {
  const key = deriveTokenStoreKey({
    credentialReferenceSecret,
    encryptionKeyReference,
    encryptionKeyVersion
  });
  const aad = createAdditionalAuthenticatedData({
    credentialReferenceId,
    tokenKind,
    encryptionKeyReference,
    encryptionKeyVersion
  });
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(tokenMaterial, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    sealedPrefix,
    tokenKind,
    encryptionKeyVersion,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(":");
}

export function unsealYouTubeOAuthTokenMaterial({
  credentialReferenceId,
  tokenKind,
  sealedTokenMaterial,
  encryptionKeyReference,
  encryptionKeyVersion,
  credentialReferenceSecret
}: {
  credentialReferenceId: string;
  tokenKind: "access" | "refresh";
  sealedTokenMaterial: string;
  encryptionKeyReference: string;
  encryptionKeyVersion: string;
  credentialReferenceSecret: string;
}) {
  const parts = sealedTokenMaterial.split(":");
  if (parts.length !== 6 || parts[0] !== sealedPrefix || parts[1] !== tokenKind || parts[2] !== encryptionKeyVersion) {
    return null;
  }

  try {
    const [, , , ivValue, tagValue, ciphertextValue] = parts;
    const key = deriveTokenStoreKey({
      credentialReferenceSecret,
      encryptionKeyReference,
      encryptionKeyVersion
    });
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAAD(
      createAdditionalAuthenticatedData({
        credentialReferenceId,
        tokenKind,
        encryptionKeyReference,
        encryptionKeyVersion
      })
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function createGoogleOAuthRefreshTokenExchangeAdapter({
  fetchImplementation = fetch,
  nowMs = () => Date.now()
}: {
  fetchImplementation?: typeof fetch;
  nowMs?: () => number;
} = {}): YouTubeOAuthRefreshTokenExchangeAdapter {
  return {
    async refreshAccessToken(request) {
      try {
        const response = await fetchImplementation(googleOAuthTokenEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            client_id: request.clientId,
            client_secret: request.clientSecret,
            refresh_token: request.refreshTokenMaterial,
            grant_type: "refresh_token"
          })
        });

        if (!response.ok) {
          return refreshFailure("provider-rejected-refresh");
        }

        const payload = (await response.json()) as Partial<{
          access_token: string;
          refresh_token: string;
          expires_in: number;
          scope: string;
        }>;
        const accessTokenMaterial = readNonemptyString(payload.access_token);
        const expiresInSeconds = typeof payload.expires_in === "number" ? payload.expires_in : null;
        if (!accessTokenMaterial || !expiresInSeconds) {
          return refreshFailure("provider-response-invalid");
        }

        return {
          status: "refreshed",
          accessTokenMaterial,
          refreshTokenMaterial: readNonemptyString(payload.refresh_token),
          expiresAtIso: new Date(nowMs() + expiresInSeconds * 1000).toISOString(),
          scopeSet: normalizeScopeSet(parseScopeSet(payload.scope))
        };
      } catch {
        return refreshFailure("provider-unavailable");
      }
    }
  };
}

export function createTrustedYouTubeOAuthStoredTokenMaterialResolver({
  tokenMaterialAdapter,
  refreshAdapter = createGoogleOAuthRefreshTokenExchangeAdapter(),
  env = process.env,
  nowIso = () => new Date().toISOString()
}: {
  tokenMaterialAdapter: Pick<
    TrustedYouTubeOAuthCredentialSupabaseTokenMaterialAdapter,
    "getCredentialTokenMaterial" | "updateCredentialTokenMaterial"
  >;
  refreshAdapter?: YouTubeOAuthRefreshTokenExchangeAdapter;
  env?: Record<string, string | undefined>;
  nowIso?: () => string;
}): YouTubeServerOnlyLiveTokenMaterialResolver {
  return {
    async resolveServerOnlyTokenMaterial(request) {
      const envReadiness = readStoredTokenMaterialEnv(env);
      if (envReadiness.status === "missing") {
        return unavailable("stored-token-material-env-missing");
      }

      let material: YouTubeOAuthCredentialSupabaseTokenMaterial;
      try {
        material = await tokenMaterialAdapter.getCredentialTokenMaterial({
          credentialReferenceId: request.credentialReferenceId,
          ownerUserId: request.ownerUserId
        });
      } catch {
        return unavailable("stored-token-material-unavailable");
      }

      if (material.revoked || material.expiryStatus === "revoked") {
        return unavailable("stored-token-material-revoked");
      }

      if (!material.scopeSet.includes(request.requiredScope)) {
        return {
          status: "scope-missing",
          reason: "stored-token-material-scope-missing"
        };
      }

      const accessTokenMaterial = unsealStoredMaterial({
        material,
        tokenKind: "access",
        credentialReferenceSecret: envReadiness.credentialReferenceSecret
      });
      const refreshTokenMaterial = unsealStoredMaterial({
        material,
        tokenKind: "refresh",
        credentialReferenceSecret: envReadiness.credentialReferenceSecret
      });

      if (!refreshTokenMaterial) {
        return unavailable("stored-token-material-unavailable");
      }

      if (!isExpiredMaterial(material, nowIso())) {
        if (!accessTokenMaterial) {
          return unavailable("stored-token-material-unavailable");
        }

        return available(accessTokenMaterial, material.expiresAtIso);
      }

      const refreshed = await refreshAdapter.refreshAccessToken({
        refreshTokenMaterial,
        clientId: envReadiness.clientId,
        clientSecret: envReadiness.clientSecret
      });
      if (refreshed.status !== "refreshed") {
        return unavailable("stored-token-refresh-failed");
      }

      const sealed = createYouTubeOAuthTokenMaterialCiphertextReferences({
        credentialReferenceId: material.credentialReferenceId,
        accessTokenMaterial: refreshed.accessTokenMaterial,
        refreshTokenMaterial: refreshed.refreshTokenMaterial ?? refreshTokenMaterial,
        encryptionKeyReference: material.encryptionKeyReference,
        encryptionKeyVersion: material.encryptionKeyVersion,
        credentialReferenceSecret: envReadiness.credentialReferenceSecret
      });

      try {
        await tokenMaterialAdapter.updateCredentialTokenMaterial({
          credentialReferenceId: material.credentialReferenceId,
          ownerUserId: request.ownerUserId,
          accessTokenCiphertextReference: sealed.accessTokenCiphertextReference,
          refreshTokenCiphertextReference: sealed.refreshTokenCiphertextReference,
          expiresAtIso: refreshed.expiresAtIso,
          scopeSet: normalizeScopeSet(refreshed.scopeSet)
        });
      } catch {
        return unavailable("stored-token-refresh-persist-failed");
      }

      return available(refreshed.accessTokenMaterial, refreshed.expiresAtIso);
    }
  };
}

export function createTrustedYouTubeOAuthStoredCredentialRefreshRuntime({
  tokenMaterialAdapter,
  refreshAdapter = createGoogleOAuthRefreshTokenExchangeAdapter(),
  env = process.env,
  nowIso = () => new Date().toISOString()
}: {
  tokenMaterialAdapter: Pick<
    TrustedYouTubeOAuthCredentialSupabaseTokenMaterialAdapter,
    "getCredentialTokenMaterial" | "updateCredentialTokenMaterial"
  >;
  refreshAdapter?: YouTubeOAuthRefreshTokenExchangeAdapter;
  env?: Record<string, string | undefined>;
  nowIso?: () => string;
}) {
  const resolver = createTrustedYouTubeOAuthStoredTokenMaterialResolver({
    tokenMaterialAdapter,
    refreshAdapter,
    env,
    nowIso
  });

  return {
    async refreshExpiredCredential(request: {
      credentialReferenceId: string;
      requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
    }) {
      let material: YouTubeOAuthCredentialSupabaseTokenMaterial;
      try {
        material = await tokenMaterialAdapter.getCredentialTokenMaterial({
          credentialReferenceId: request.credentialReferenceId,
          ownerUserId: ""
        });
      } catch {
        return refreshRuntimeFailure("refresh-runtime-error");
      }

      const resolved = await resolver.resolveServerOnlyTokenMaterial({
        credentialReferenceId: request.credentialReferenceId,
        ownerUserId: material.ownerUserId,
        requiredScope: request.requiredScope
      });
      if (resolved.status !== "available") {
        return refreshRuntimeFailure("provider-rejected-refresh");
      }

      return {
        status: "refreshed" as const,
        credentialStatus: createSanitizedStatusFromMaterial({
          material,
          expiresAtIso: resolved.expiresAtIso,
          scopeSet: material.scopeSet
        })
      };
    }
  };
}

function createSanitizedStatusFromMaterial({
  material,
  expiresAtIso,
  scopeSet
}: {
  material: YouTubeOAuthCredentialSupabaseTokenMaterial;
  expiresAtIso: string;
  scopeSet: readonly YouTubeRuntimeReadOnlyOAuthScope[];
}): YouTubeOAuthCredentialSupabaseStatus {
  return {
    credentialReferenceId: material.credentialReferenceId,
    provider: "youtube",
    providerChannelId: material.providerChannelId,
    scopeLabel: "youtube.readonly",
    scopeSet,
    expiresAtIso,
    expiryStatus: "active",
    revoked: false,
    revokedAtIso: null,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    ciphertext: "never-returned-by-design",
    decryptCapability: "forbidden"
  };
}

function unsealStoredMaterial({
  material,
  tokenKind,
  credentialReferenceSecret
}: {
  material: YouTubeOAuthCredentialSupabaseTokenMaterial;
  tokenKind: "access" | "refresh";
  credentialReferenceSecret: string;
}) {
  return unsealYouTubeOAuthTokenMaterial({
    credentialReferenceId: material.credentialReferenceId,
    tokenKind,
    sealedTokenMaterial:
      tokenKind === "access" ? material.accessTokenCiphertextReference : material.refreshTokenCiphertextReference,
    encryptionKeyReference: material.encryptionKeyReference,
    encryptionKeyVersion: material.encryptionKeyVersion,
    credentialReferenceSecret
  });
}

function available(serverTokenMaterial: string, expiresAtIso: string) {
  return {
    status: "available" as const,
    serverAuthorizationHeader: `Bearer ${serverTokenMaterial}`,
    expiresAtIso
  };
}

function unavailable(reason: string) {
  return {
    status: "unavailable" as const,
    reason
  };
}

function refreshFailure(reason: Exclude<YouTubeOAuthRefreshTokenExchangeResult, { status: "refreshed" }>["reason"]) {
  return {
    status: "refresh-failed" as const,
    reason,
    providerErrorBody: "never-returned-by-design" as const
  };
}

function refreshRuntimeFailure(reason: "provider-rejected-refresh" | "provider-unavailable" | "refresh-runtime-error") {
  return {
    status: "refresh-failed" as const,
    reason,
    providerErrorBody: "never-returned-by-design" as const
  };
}

function isExpiredMaterial(material: YouTubeOAuthCredentialSupabaseTokenMaterial, nowIso: string) {
  if (material.expiryStatus === "expired") {
    return true;
  }

  const expiresAtMs = Date.parse(material.expiresAtIso);
  const nowMs = Date.parse(nowIso);
  return Number.isFinite(expiresAtMs) && Number.isFinite(nowMs) && expiresAtMs <= nowMs;
}

function deriveTokenStoreKey({
  credentialReferenceSecret,
  encryptionKeyReference,
  encryptionKeyVersion
}: {
  credentialReferenceSecret: string;
  encryptionKeyReference: string;
  encryptionKeyVersion: string;
}) {
  return createHash("sha256")
    .update(`${credentialReferenceSecret}:${encryptionKeyReference}:${encryptionKeyVersion}`)
    .digest();
}

function createAdditionalAuthenticatedData({
  credentialReferenceId,
  tokenKind,
  encryptionKeyReference,
  encryptionKeyVersion
}: {
  credentialReferenceId: string;
  tokenKind: "access" | "refresh";
  encryptionKeyReference: string;
  encryptionKeyVersion: string;
}) {
  return Buffer.from(
    `youtube-token-store:${credentialReferenceId}:${tokenKind}:${encryptionKeyReference}:${encryptionKeyVersion}`,
    "utf8"
  );
}

function readStoredTokenMaterialEnv(env: Record<string, string | undefined>):
  | {
      status: "ready";
      clientId: string;
      clientSecret: string;
      credentialReferenceSecret: string;
    }
  | {
      status: "missing";
      missingEnvReferences: readonly YouTubeOAuthStoredTokenMaterialEnvName[];
    } {
  const clientId = readNonemptyString(env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = readNonemptyString(env.GOOGLE_OAUTH_CLIENT_SECRET);
  const credentialReferenceSecret = readNonemptyString(env.YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET);
  const missingEnvReferences: YouTubeOAuthStoredTokenMaterialEnvName[] = [];

  if (!clientId) {
    missingEnvReferences.push("GOOGLE_OAUTH_CLIENT_ID");
  }

  if (!clientSecret) {
    missingEnvReferences.push("GOOGLE_OAUTH_CLIENT_SECRET");
  }

  if (!credentialReferenceSecret) {
    missingEnvReferences.push("YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET");
  }

  if (missingEnvReferences.length > 0 || !clientId || !clientSecret || !credentialReferenceSecret) {
    return {
      status: "missing",
      missingEnvReferences
    };
  }

  return {
    status: "ready",
    clientId,
    clientSecret,
    credentialReferenceSecret
  };
}

function normalizeScopeSet(scopeSet: readonly string[] | null | undefined): readonly YouTubeRuntimeReadOnlyOAuthScope[] {
  return scopeSet?.includes(youtubeReadonlyOAuthScope) ? [youtubeReadonlyOAuthScope] : [youtubeReadonlyOAuthScope];
}

function parseScopeSet(scope: string | undefined): readonly string[] {
  return typeof scope === "string" ? scope.split(/\s+/).filter(Boolean) : [];
}

function readNonemptyString(value: string | undefined | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
