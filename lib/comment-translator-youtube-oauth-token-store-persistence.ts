import "server-only";

import { createHmac } from "node:crypto";
import {
  createYouTubeOAuthCredentialPersistenceDraft,
  isYouTubeOAuthCredentialResolutionDisabled,
  youtubeOAuthCredentialDefaultScopeSet,
  type YouTubeOAuthCredentialStore
} from "./comment-translator-youtube-token-store-runtime";
import { type YouTubeReadOnlyOAuthScope } from "./comment-translator-youtube-api-adapter";
import { type YouTubeOAuthIntent } from "./comment-translator-youtube-oauth-connect-callback";

const googleOAuthTokenEndpoint = "https://oauth2.googleapis.com/token";

const envReferenceNames = {
  clientId: "GOOGLE_OAUTH_CLIENT_ID",
  clientSecret: "GOOGLE_OAUTH_CLIENT_SECRET",
  redirectUri: "GOOGLE_OAUTH_REDIRECT_URI",
  credentialReferenceSecret: "YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET",
  tokenStoreKeyReference: "YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF",
  tokenStoreKeyVersion: "YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION",
  credentialResolutionDisabled: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
} as const;

export type YouTubeOAuthCallbackOwnerAuthorization =
  | {
      status: "authorized";
      ownerUserId: string;
    }
  | {
      status: "unavailable";
      reason: "auth-unavailable" | "caller-not-authenticated";
      reconnectRequired: true;
    };

type YouTubeOAuthTokenExchangeRequest = {
  authorizationCode: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type YouTubeOAuthTokenExchangeResult =
  | {
      status: "exchanged";
      accessTokenMaterial: string;
      refreshTokenMaterial: string;
      expiresAtIso: string;
      scopeSet: readonly YouTubeReadOnlyOAuthScope[];
    }
  | {
      status: "exchange-failed";
      reason: "provider-rejected-code" | "provider-unavailable" | "provider-response-invalid";
    };

export type YouTubeOAuthAuthorizationCodeExchangeAdapter = {
  exchangeAuthorizationCode: (request: YouTubeOAuthTokenExchangeRequest) => Promise<YouTubeOAuthTokenExchangeResult>;
};

export type YouTubeOAuthCallbackPersistenceResult =
  | {
      status: "youtube-oauth-connected";
      credentialReferenceId: string;
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      authorizationCodeValue: "never-returned-by-design";
    }
  | {
      status:
        | "youtube-oauth-disabled"
        | "youtube-oauth-sign-in-required"
        | "youtube-oauth-env-missing"
        | "youtube-oauth-callback-error"
        | "youtube-oauth-persistence-unavailable"
        | "youtube-oauth-token-exchange-failed"
        | "youtube-oauth-persistence-failed";
      credentialReferenceId: string | null;
      missingEnvReferences?: readonly string[];
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      authorizationCodeValue: "never-returned-by-design";
    };

export const youtubeOAuthTokenStorePersistenceWiringContract = {
  implementationStage: "task-4-server-only-callback-token-store-persistence-wiring",
  runtime: "server-only",
  callbackAdapter: "authorization-code-to-trusted-token-store",
  credentialReferenceCreation: "idempotent-owner-bound-opaque-reference",
  encryptionKeyHandling: "reference-and-version-only",
  ownerAuthorization: "required-before-exchange-or-store",
  reconnectSemantics: "same-owner-upsert-same-credential-reference",
  browserReadableOutput: "sanitized-status-and-credential-reference-only",
  providerChannelResolution: "not-run-provider-channel-pending-owner-verification",
  remoteSupabaseApply: "not-run-by-this-task",
  liveGoogleOAuthConnectExecution: "not-run-by-this-task",
  googleOAuthTokenEndpointExecution: "adapter-only-not-run-by-contract",
  forbiddenOutput: [
    "authorization-code-value",
    "oauth-access-token-value",
    "oauth-refresh-token-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "authorization-header-value",
    "service-role-key-value",
    "provider-target-metadata",
    "browser-storage-payload",
    "handoff-payload"
  ],
  envReferenceNames
} as const;

export async function persistYouTubeOAuthCallbackCredential({
  authorizationCode,
  ownerAuthorization,
  intent,
  trustedStore,
  missingTrustedStoreReferences = [],
  exchangeAdapter = createGoogleOAuthAuthorizationCodeExchangeAdapter(),
  nowIso = new Date().toISOString(),
  env = process.env
}: {
  authorizationCode: string | null;
  ownerAuthorization: YouTubeOAuthCallbackOwnerAuthorization;
  intent: YouTubeOAuthIntent;
  trustedStore: YouTubeOAuthCredentialStore | null;
  missingTrustedStoreReferences?: readonly string[];
  exchangeAdapter?: YouTubeOAuthAuthorizationCodeExchangeAdapter;
  nowIso?: string;
  env?: Record<string, string | undefined>;
}): Promise<YouTubeOAuthCallbackPersistenceResult> {
  if (
    isYouTubeOAuthCredentialResolutionDisabled({
      [envReferenceNames.credentialResolutionDisabled]: env[envReferenceNames.credentialResolutionDisabled]
    })
  ) {
    return createSanitizedFailure("youtube-oauth-disabled");
  }

  if (ownerAuthorization.status !== "authorized") {
    return createSanitizedFailure("youtube-oauth-sign-in-required");
  }

  if (!authorizationCode?.trim()) {
    return createSanitizedFailure("youtube-oauth-callback-error");
  }

  const envReadiness = readYouTubeOAuthTokenStorePersistenceEnvReadiness(env);
  if (envReadiness.status === "missing") {
    return createSanitizedFailure("youtube-oauth-persistence-unavailable", {
      missingEnvReferences: envReadiness.missingEnvReferences
    });
  }

  if (!trustedStore) {
    return createSanitizedFailure("youtube-oauth-persistence-unavailable", {
      missingEnvReferences: missingTrustedStoreReferences
    });
  }

  const credentialReferenceId = createYouTubeOAuthCredentialReferenceId({
    ownerUserId: ownerAuthorization.ownerUserId,
    credentialReferenceSecret: envReadiness.credentialReferenceSecret
  });

  const exchangeResult = await exchangeAdapter.exchangeAuthorizationCode({
    authorizationCode: authorizationCode.trim(),
    clientId: envReadiness.clientId,
    clientSecret: envReadiness.clientSecret,
    redirectUri: envReadiness.redirectUri
  });

  if (exchangeResult.status !== "exchanged") {
    return createSanitizedFailure("youtube-oauth-token-exchange-failed", { credentialReferenceId });
  }

  try {
    const ciphertextReferences = createYouTubeOAuthTokenMaterialCiphertextReferences({
      credentialReferenceId,
      accessTokenMaterial: exchangeResult.accessTokenMaterial,
      refreshTokenMaterial: exchangeResult.refreshTokenMaterial,
      encryptionKeyReference: envReadiness.tokenStoreKeyReference,
      encryptionKeyVersion: envReadiness.tokenStoreKeyVersion,
      credentialReferenceSecret: envReadiness.credentialReferenceSecret
    });

    const draft = createYouTubeOAuthCredentialPersistenceDraft({
      ownerUserId: ownerAuthorization.ownerUserId,
      credentialReferenceId,
      providerChannelId: "provider-channel-pending-owner-verification",
      scopeSet: normalizeScopeSet(exchangeResult.scopeSet),
      expiresAtIso: exchangeResult.expiresAtIso,
      accessTokenCiphertextReference: ciphertextReferences.accessTokenCiphertextReference,
      refreshTokenCiphertextReference: ciphertextReferences.refreshTokenCiphertextReference,
      encryptionKeyReference: ciphertextReferences.encryptionKeyReference,
      encryptionKeyVersion: ciphertextReferences.encryptionKeyVersion,
      nowIso
    });

    await trustedStore.upsertEncryptedCredential(draft);

    return {
      status: "youtube-oauth-connected",
      credentialReferenceId,
      tokenValue: "never-returned-by-design",
      refreshTokenValue: "never-returned-by-design",
      authorizationCodeValue: "never-returned-by-design"
    };
  } catch {
    return createSanitizedFailure("youtube-oauth-persistence-failed", { credentialReferenceId });
  }
}

export function createYouTubeOAuthCredentialReferenceId({
  ownerUserId,
  credentialReferenceSecret
}: {
  ownerUserId: string;
  credentialReferenceSecret: string;
}) {
  return `ytcred_${createHmac("sha256", credentialReferenceSecret)
    .update(`youtube:${ownerUserId}`)
    .digest("base64url")
    .slice(0, 36)}`;
}

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
    accessTokenCiphertextReference: createCiphertextReference({
      credentialReferenceId,
      tokenKind: "access",
      tokenMaterial: accessTokenMaterial,
      encryptionKeyReference,
      encryptionKeyVersion,
      credentialReferenceSecret
    }),
    refreshTokenCiphertextReference: createCiphertextReference({
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

export function createGoogleOAuthAuthorizationCodeExchangeAdapter({
  fetchImplementation = fetch,
  nowMs = () => Date.now()
}: {
  fetchImplementation?: typeof fetch;
  nowMs?: () => number;
} = {}): YouTubeOAuthAuthorizationCodeExchangeAdapter {
  return {
    async exchangeAuthorizationCode(request) {
      try {
        const body = new URLSearchParams({
          code: request.authorizationCode,
          client_id: request.clientId,
          client_secret: request.clientSecret,
          redirect_uri: request.redirectUri,
          grant_type: "authorization_code"
        });
        const response = await fetchImplementation(googleOAuthTokenEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded"
          },
          body
        });

        if (!response.ok) {
          return { status: "exchange-failed", reason: "provider-rejected-code" };
        }

        const payload = (await response.json()) as Partial<{
          access_token: string;
          refresh_token: string;
          expires_in: number;
          scope: string;
        }>;
        const accessTokenMaterial = readNonemptyString(payload.access_token);
        const refreshTokenMaterial = readNonemptyString(payload.refresh_token);
        const expiresInSeconds = typeof payload.expires_in === "number" ? payload.expires_in : null;

        if (!accessTokenMaterial || !refreshTokenMaterial || !expiresInSeconds) {
          return { status: "exchange-failed", reason: "provider-response-invalid" };
        }

        return {
          status: "exchanged",
          accessTokenMaterial,
          refreshTokenMaterial,
          expiresAtIso: new Date(nowMs() + expiresInSeconds * 1000).toISOString(),
          scopeSet: normalizeScopeSet(parseScopeSet(payload.scope))
        };
      } catch {
        return { status: "exchange-failed", reason: "provider-unavailable" };
      }
    }
  };
}

function readYouTubeOAuthTokenStorePersistenceEnvReadiness(env: Record<string, string | undefined>):
  | {
      status: "ready";
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      credentialReferenceSecret: string;
      tokenStoreKeyReference: string;
      tokenStoreKeyVersion: string;
    }
  | {
      status: "missing";
      missingEnvReferences: readonly string[];
    } {
  const clientId = readNonemptyString(env[envReferenceNames.clientId]);
  const clientSecret = readNonemptyString(env[envReferenceNames.clientSecret]);
  const redirectUri = readNonemptyString(env[envReferenceNames.redirectUri]);
  const credentialReferenceSecret = readNonemptyString(env[envReferenceNames.credentialReferenceSecret]);
  const tokenStoreKeyReference = readNonemptyString(env[envReferenceNames.tokenStoreKeyReference]);
  const tokenStoreKeyVersion = readNonemptyString(env[envReferenceNames.tokenStoreKeyVersion]);
  const missingEnvReferences: string[] = [];

  if (!clientId) {
    missingEnvReferences.push(envReferenceNames.clientId);
  }

  if (!clientSecret) {
    missingEnvReferences.push(envReferenceNames.clientSecret);
  }

  if (!redirectUri) {
    missingEnvReferences.push(envReferenceNames.redirectUri);
  }

  if (!credentialReferenceSecret) {
    missingEnvReferences.push(envReferenceNames.credentialReferenceSecret);
  }

  if (!tokenStoreKeyReference) {
    missingEnvReferences.push(envReferenceNames.tokenStoreKeyReference);
  }

  if (!tokenStoreKeyVersion) {
    missingEnvReferences.push(envReferenceNames.tokenStoreKeyVersion);
  }

  if (
    missingEnvReferences.length > 0 ||
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !credentialReferenceSecret ||
    !tokenStoreKeyReference ||
    !tokenStoreKeyVersion
  ) {
    return { status: "missing", missingEnvReferences };
  }

  return {
    status: "ready",
    clientId,
    clientSecret,
    redirectUri,
    credentialReferenceSecret,
    tokenStoreKeyReference,
    tokenStoreKeyVersion
  };
}

function createCiphertextReference({
  credentialReferenceId,
  tokenKind,
  tokenMaterial,
  encryptionKeyReference,
  encryptionKeyVersion,
  credentialReferenceSecret
}: {
  credentialReferenceId: string;
  tokenKind: "access" | "refresh";
  tokenMaterial: string;
  encryptionKeyReference: string;
  encryptionKeyVersion: string;
  credentialReferenceSecret: string;
}) {
  const digest = createHmac("sha256", credentialReferenceSecret)
    .update(`${credentialReferenceId}:${tokenKind}:${encryptionKeyReference}:${encryptionKeyVersion}:${tokenMaterial}`)
    .digest("base64url");

  return `kms://youtube-token-store/${tokenKind}/${credentialReferenceId}/${encryptionKeyVersion}/${digest}`;
}

function normalizeScopeSet(scopeSet: readonly string[] | null | undefined): readonly YouTubeReadOnlyOAuthScope[] {
  return scopeSet?.includes(youtubeOAuthCredentialDefaultScopeSet[0])
    ? youtubeOAuthCredentialDefaultScopeSet
    : youtubeOAuthCredentialDefaultScopeSet;
}

function parseScopeSet(scope: string | undefined): readonly string[] {
  return typeof scope === "string" ? scope.split(/\s+/).filter(Boolean) : [];
}

function readNonemptyString(value: string | undefined | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function createSanitizedFailure(
  status: Exclude<YouTubeOAuthCallbackPersistenceResult["status"], "youtube-oauth-connected">,
  options: {
    credentialReferenceId?: string | null;
    missingEnvReferences?: readonly string[];
  } = {}
): YouTubeOAuthCallbackPersistenceResult {
  const result: YouTubeOAuthCallbackPersistenceResult = {
    status,
    credentialReferenceId: options.credentialReferenceId ?? null,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    authorizationCodeValue: "never-returned-by-design"
  };

  if (options.missingEnvReferences) {
    return {
      ...result,
      missingEnvReferences: options.missingEnvReferences
    };
  }

  return result;
}
