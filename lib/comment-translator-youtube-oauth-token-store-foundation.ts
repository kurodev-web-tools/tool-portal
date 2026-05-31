import "server-only";

import {
  youtubeEncryptedTokenStoreDesignPolicy,
  youtubeGoogleApiSafeLiveSmokePolicy,
  youtubeTokenReferenceResolverContract,
  type YouTubeGoogleApiSafeLiveSmokePolicy,
  type YouTubeReadOnlyOAuthScope
} from "./comment-translator-youtube-api-adapter";

export type YouTubeOAuthConsentRuntimeContract = {
  implementationStage: "server-only-consent-runtime-foundation";
  platform: "youtube";
  requiredScope: YouTubeReadOnlyOAuthScope;
  consentEndpointOwner: "future-server-route-handler";
  callbackEndpointOwner: "future-server-route-handler";
  stateProtection: "server-generated-reference";
  authorizationCodeHandling: "server-callback-exchange-only";
  accessType: "offline-required-for-refresh-token";
  prompt: "consent-required-for-refresh-token";
  clientTokenExposure: "forbidden";
  liveGoogleApiCall: "not-implemented";
  tokenPersistence: "blocked-on-encrypted-store";
  storageMutation: "forbidden-in-this-slice";
};

export type YouTubeOAuthConsentDraftRequest = {
  stateReferenceId: string;
  redirectUriReference: string;
  ownerHintReference: string | null;
  nowMs: number;
};

export type YouTubeOAuthConsentRuntimeDraft = {
  status: "draft-only";
  stateReferenceId: string;
  redirectUriReference: string;
  ownerHintReference: string | null;
  requiredScope: YouTubeReadOnlyOAuthScope;
  accessType: "offline-required-for-refresh-token";
  prompt: "consent-required-for-refresh-token";
  tokenValue: "never-produced-by-design";
  refreshTokenValue: "never-produced-by-design";
  liveGoogleApiCall: "not-implemented";
  createdAtMs: number;
};

export type YouTubeOAuthCallbackValidationRequest = {
  stateReferenceId: string;
  expectedStateReferenceId: string;
  authorizationCodeReceived: boolean;
  error: string | null;
  nowMs: number;
};

export type YouTubeOAuthCallbackValidationResult =
  | {
      status: "ready-for-server-exchange";
      stateReferenceId: string;
      authorizationCodeHandling: "server-callback-exchange-only";
      tokenPersistence: "blocked-on-encrypted-store";
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      validatedAtMs: number;
    }
  | {
      status: "state-mismatch" | "oauth-error" | "code-missing";
      stateReferenceId: string;
      reason: string;
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      validatedAtMs: number;
    };

export type YouTubeEncryptedTokenStoreImplementationBlocker = {
  id:
    | "schema-approval"
    | "key-management"
    | "token-refresh"
    | "revocation"
    | "audit-log"
    | "retention-policy"
    | "live-smoke-approval";
  requiredBeforeImplementation: true;
  thisSlice: "document-only";
  blocker: string;
};

export type YouTubeEncryptedTokenStoreRuntimeDesign = {
  implementationStage: "blocked-design-only";
  storageOwner: "future-server-encrypted-token-store";
  schemaMutation: "blocked-until-approved";
  schemaCandidate: "separate-approved-migration-required";
  keyManagement: "future-managed-secret-or-kms";
  accessTokenStorage: "encrypted-server-only";
  refreshTokenStorage: "encrypted-server-only";
  refresh: "blocked-on-refresh-policy";
  revocation: "blocked-on-revocation-policy";
  audit: "blocked-on-audit-policy";
  retention: "blocked-on-retention-policy";
  clientComponent: "forbidden";
  fixtures: "forbidden";
  taskDocsAndPullRequests: "no-token-values";
  localStorage: "forbidden";
  indexedDB: "forbidden";
};

export type YouTubeOAuthTokenResolverRuntimeContract = {
  implementationStage: "server-only-token-resolver-runtime-foundation";
  input: "credentialReferenceId";
  requiredScope: YouTubeReadOnlyOAuthScope;
  tokenReferenceContract: typeof youtubeTokenReferenceResolverContract;
  outputTokenValue: "never-returned-by-design";
  outputRefreshTokenValue: "never-returned-by-design";
  authorizationBinding: "server-fetch-only";
  refreshBehavior: "blocked-on-refresh-policy";
  revocationBehavior: "blocked-on-revocation-policy";
  providerCoupling: "forbidden-direct-import-or-call";
  quotaWrite: "not-implemented";
};

export type YouTubeOAuthTokenStoreFoundationContract = {
  implementationStage: "design-contract-only";
  platform: "youtube";
  consentRuntime: YouTubeOAuthConsentRuntimeContract;
  encryptedTokenStore: YouTubeEncryptedTokenStoreRuntimeDesign;
  tokenResolverRuntime: YouTubeOAuthTokenResolverRuntimeContract;
  blockers: readonly YouTubeEncryptedTokenStoreImplementationBlocker[];
  safeLiveSmoke: YouTubeGoogleApiSafeLiveSmokePolicy;
  clientStorage: "forbidden";
  providerCoupling: "forbidden-direct-import-or-call";
  storageMutation: "forbidden-in-this-slice";
  schemaMutation: "forbidden-in-this-slice";
};

const youtubeReadonlyOAuthScope = youtubeTokenReferenceResolverContract.requiredScope;

export const youtubeOAuthConsentRuntimeContract = {
  implementationStage: "server-only-consent-runtime-foundation",
  platform: "youtube",
  requiredScope: youtubeReadonlyOAuthScope,
  consentEndpointOwner: "future-server-route-handler",
  callbackEndpointOwner: "future-server-route-handler",
  stateProtection: "server-generated-reference",
  authorizationCodeHandling: "server-callback-exchange-only",
  accessType: "offline-required-for-refresh-token",
  prompt: "consent-required-for-refresh-token",
  clientTokenExposure: "forbidden",
  liveGoogleApiCall: "not-implemented",
  tokenPersistence: "blocked-on-encrypted-store",
  storageMutation: "forbidden-in-this-slice"
} as const satisfies YouTubeOAuthConsentRuntimeContract;

export const youtubeEncryptedTokenStoreImplementationBlockers = [
  {
    id: "schema-approval",
    requiredBeforeImplementation: true,
    thisSlice: "document-only",
    blocker: "Schema approval must define table ownership, RLS posture, migration path, and rollback before storage exists."
  },
  {
    id: "key-management",
    requiredBeforeImplementation: true,
    thisSlice: "document-only",
    blocker: "Key management must choose managed secret or KMS rotation semantics before any encrypted token write."
  },
  {
    id: "token-refresh",
    requiredBeforeImplementation: true,
    thisSlice: "document-only",
    blocker: "Refresh behavior must define expiry handling, retry limits, and failure states before refresh is enabled."
  },
  {
    id: "revocation",
    requiredBeforeImplementation: true,
    thisSlice: "document-only",
    blocker: "Revocation must define user disconnect behavior and server cleanup before token persistence is enabled."
  },
  {
    id: "audit-log",
    requiredBeforeImplementation: true,
    thisSlice: "document-only",
    blocker: "Audit policy must define allowed event fields without token material before sensitive actions are recorded."
  },
  {
    id: "retention-policy",
    requiredBeforeImplementation: true,
    thisSlice: "document-only",
    blocker: "Retention policy must define token lifetime, stale credential cleanup, and account deletion behavior."
  },
  {
    id: "live-smoke-approval",
    requiredBeforeImplementation: true,
    thisSlice: "document-only",
    blocker: "Safe live smoke approval must define the test owner account, endpoints, and no-print credential handling."
  }
] as const satisfies readonly YouTubeEncryptedTokenStoreImplementationBlocker[];

export const youtubeEncryptedTokenStoreRuntimeDesign = {
  implementationStage: "blocked-design-only",
  storageOwner: youtubeEncryptedTokenStoreDesignPolicy.storageOwner,
  schemaMutation: "blocked-until-approved",
  schemaCandidate: "separate-approved-migration-required",
  keyManagement: youtubeEncryptedTokenStoreDesignPolicy.keyManagement,
  accessTokenStorage: youtubeEncryptedTokenStoreDesignPolicy.accessTokenPersistence,
  refreshTokenStorage: youtubeEncryptedTokenStoreDesignPolicy.refreshTokenPersistence,
  refresh: "blocked-on-refresh-policy",
  revocation: "blocked-on-revocation-policy",
  audit: "blocked-on-audit-policy",
  retention: "blocked-on-retention-policy",
  clientComponent: youtubeEncryptedTokenStoreDesignPolicy.clientComponent,
  fixtures: youtubeEncryptedTokenStoreDesignPolicy.fixtures,
  taskDocsAndPullRequests: youtubeEncryptedTokenStoreDesignPolicy.taskDocsAndPullRequests,
  localStorage: youtubeEncryptedTokenStoreDesignPolicy.localStorage,
  indexedDB: youtubeEncryptedTokenStoreDesignPolicy.indexedDB
} as const satisfies YouTubeEncryptedTokenStoreRuntimeDesign;

export const youtubeOAuthTokenResolverRuntimeContract = {
  implementationStage: "server-only-token-resolver-runtime-foundation",
  input: "credentialReferenceId",
  requiredScope: youtubeReadonlyOAuthScope,
  tokenReferenceContract: youtubeTokenReferenceResolverContract,
  outputTokenValue: "never-returned-by-design",
  outputRefreshTokenValue: "never-returned-by-design",
  authorizationBinding: "server-fetch-only",
  refreshBehavior: "blocked-on-refresh-policy",
  revocationBehavior: "blocked-on-revocation-policy",
  providerCoupling: "forbidden-direct-import-or-call",
  quotaWrite: "not-implemented"
} as const satisfies YouTubeOAuthTokenResolverRuntimeContract;

export const youtubeOAuthTokenStoreFoundationContract = {
  implementationStage: "design-contract-only",
  platform: "youtube",
  consentRuntime: youtubeOAuthConsentRuntimeContract,
  encryptedTokenStore: youtubeEncryptedTokenStoreRuntimeDesign,
  tokenResolverRuntime: youtubeOAuthTokenResolverRuntimeContract,
  blockers: youtubeEncryptedTokenStoreImplementationBlockers,
  safeLiveSmoke: youtubeGoogleApiSafeLiveSmokePolicy,
  clientStorage: "forbidden",
  providerCoupling: "forbidden-direct-import-or-call",
  storageMutation: "forbidden-in-this-slice",
  schemaMutation: "forbidden-in-this-slice"
} as const satisfies YouTubeOAuthTokenStoreFoundationContract;

export function createYouTubeOAuthConsentDraft(
  request: YouTubeOAuthConsentDraftRequest
): YouTubeOAuthConsentRuntimeDraft {
  return {
    status: "draft-only",
    stateReferenceId: request.stateReferenceId,
    redirectUriReference: request.redirectUriReference,
    ownerHintReference: request.ownerHintReference,
    requiredScope: youtubeReadonlyOAuthScope,
    accessType: youtubeOAuthConsentRuntimeContract.accessType,
    prompt: youtubeOAuthConsentRuntimeContract.prompt,
    tokenValue: "never-produced-by-design",
    refreshTokenValue: "never-produced-by-design",
    liveGoogleApiCall: "not-implemented",
    createdAtMs: request.nowMs
  };
}

export function validateYouTubeOAuthCallbackDraft(
  request: YouTubeOAuthCallbackValidationRequest
): YouTubeOAuthCallbackValidationResult {
  if (request.stateReferenceId !== request.expectedStateReferenceId) {
    return callbackBlocked(request, "state-mismatch", "OAuth callback state reference did not match.");
  }

  if (request.error) {
    return callbackBlocked(request, "oauth-error", "OAuth provider returned an error.");
  }

  if (!request.authorizationCodeReceived) {
    return callbackBlocked(request, "code-missing", "OAuth callback did not include an authorization code reference.");
  }

  return {
    status: "ready-for-server-exchange",
    stateReferenceId: request.stateReferenceId,
    authorizationCodeHandling: "server-callback-exchange-only",
    tokenPersistence: "blocked-on-encrypted-store",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    validatedAtMs: request.nowMs
  };
}

export function createYouTubeOAuthTokenStoreBlockerSummary(): string {
  return youtubeEncryptedTokenStoreImplementationBlockers
    .map((blocker) => blocker.blocker)
    .join(" ");
}

function callbackBlocked(
  request: YouTubeOAuthCallbackValidationRequest,
  status: Extract<YouTubeOAuthCallbackValidationResult["status"], "state-mismatch" | "oauth-error" | "code-missing">,
  reason: string
): YouTubeOAuthCallbackValidationResult {
  return {
    status,
    stateReferenceId: request.stateReferenceId,
    reason,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    validatedAtMs: request.nowMs
  };
}
