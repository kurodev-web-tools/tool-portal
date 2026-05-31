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

export type YouTubeEncryptedTokenStoreBlockerId = YouTubeEncryptedTokenStoreImplementationBlocker["id"];

export type YouTubeEncryptedTokenStoreBlockerResolutionDecision = {
  id: YouTubeEncryptedTokenStoreBlockerId;
  implementationStage: "approval-required-before-implementation";
  decisionUnit: string;
  proposedResolution: string;
  requiredApproval: string;
  implementationGate: "blocked-until-approved";
  separatePrRequired: true;
  forbiddenInThisSlice: readonly [
    "token persistence implementation",
    "Supabase schema, migration, or RLS policy change",
    "OAuth access token or refresh token value handling",
    "Google API live call"
  ];
};

export type YouTubeEncryptedTokenStoreBlockerResolutionPlan = {
  implementationStage: "blocker-resolution-plan-only";
  sourceBlockerIds: readonly YouTubeEncryptedTokenStoreBlockerId[];
  decisions: readonly YouTubeEncryptedTokenStoreBlockerResolutionDecision[];
  tokenPersistence: "blocked-until-approvals-and-separate-implementation";
  schemaMutation: "forbidden-in-this-slice";
  rlsMutation: "forbidden-in-this-slice";
  storageKeyMutation: "forbidden-in-this-slice";
  clientStorage: "forbidden";
  providerCoupling: "forbidden-direct-import-or-call";
  quotaWrite: "not-implemented";
  safeLiveSmoke: YouTubeGoogleApiSafeLiveSmokePolicy;
};

export type YouTubeEncryptedTokenStoreImplementationReadiness =
  | {
      status: "blocked";
      missingDecisionIds: readonly YouTubeEncryptedTokenStoreBlockerId[];
      requiredApprovals: readonly string[];
      tokenPersistence: "forbidden";
      schemaMutation: "forbidden-in-this-slice";
      liveSmoke: "not-run-in-this-slice";
    }
  | {
      status: "ready-for-separate-implementation-pr";
      approvedDecisionIds: readonly YouTubeEncryptedTokenStoreBlockerId[];
      tokenPersistence: "still-not-implemented-in-this-slice";
      schemaMutation: "still-forbidden-in-this-slice";
      liveSmoke: "still-not-run-in-this-slice";
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

const forbiddenTokenStoreImplementationActions = [
  "token persistence implementation",
  "Supabase schema, migration, or RLS policy change",
  "OAuth access token or refresh token value handling",
  "Google API live call"
] as const;

export const youtubeEncryptedTokenStoreBlockerResolutionDecisions = [
  {
    id: "schema-approval",
    implementationStage: "approval-required-before-implementation",
    decisionUnit:
      "Approve the credential record ownership model, minimum metadata fields, RLS posture, migration rollout, and rollback plan.",
    proposedResolution:
      "Keep this PR proposal-only. A separate approved migration must define a server-owned YouTube credential table, owner binding, credential reference id, scope set, expiry metadata, revoked state, and encrypted token ciphertext fields without exposing token values to browser clients.",
    requiredApproval:
      "Product and data-owner approval for the table shape, RLS posture, migration order, rollback path, and no browser-readable token material before any schema implementation PR.",
    implementationGate: "blocked-until-approved",
    separatePrRequired: true,
    forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
  },
  {
    id: "key-management",
    implementationStage: "approval-required-before-implementation",
    decisionUnit:
      "Choose the encryption boundary, managed secret or KMS owner, rotation semantics, and decryption access rules.",
    proposedResolution:
      "Use a server-only envelope where token values can be decrypted only inside trusted runtime code. The final implementation must choose managed secret or KMS handling, rotation cadence, versioned key metadata, and a no-client-decrypt rule.",
    requiredApproval:
      "Security approval for managed secret or KMS selection, rotation procedure, emergency disable path, and secret handling rules before any encrypted token write.",
    implementationGate: "blocked-until-approved",
    separatePrRequired: true,
    forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
  },
  {
    id: "token-refresh",
    implementationStage: "approval-required-before-implementation",
    decisionUnit:
      "Define refresh timing, expiry states, bounded retry, backoff, concurrent refresh locking, and user-visible failure states.",
    proposedResolution:
      "Refresh should be server-only, triggered before expiry or on expired reference resolution, use bounded retry with backoff, avoid direct provider coupling, and mark credentials expired or reconnect-required after terminal failures.",
    requiredApproval:
      "Runtime approval for expiry thresholds, retry/backoff limits, lock behavior, terminal expired states, and no quota or billing write in the refresh path.",
    implementationGate: "blocked-until-approved",
    separatePrRequired: true,
    forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
  },
  {
    id: "revocation",
    implementationStage: "approval-required-before-implementation",
    decisionUnit:
      "Define broadcaster disconnect behavior, Google revoke handling, local cleanup, and post-revocation user state.",
    proposedResolution:
      "Disconnect should be server-only, mark the credential revoked before or with cleanup, call the provider revoke endpoint only from trusted runtime code when approved, and remove or invalidate encrypted token material after a bounded cleanup step.",
    requiredApproval:
      "Product and security approval for disconnect UX state, revoke endpoint usage, cleanup order, retry policy, and failure display before revocation implementation.",
    implementationGate: "blocked-until-approved",
    separatePrRequired: true,
    forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
  },
  {
    id: "audit-log",
    implementationStage: "approval-required-before-implementation",
    decisionUnit:
      "Define which sensitive token-store actions need audit events and which fields are allowed without token material.",
    proposedResolution:
      "Audit should record event type, owner reference, credential reference id, non-secret status, timestamp, and failure class only. It must never record OAuth access tokens, refresh tokens, authorization codes, raw Google responses, or private credentials.",
    requiredApproval:
      "Privacy and security approval for allowed audit event fields, retention period, redaction rules, and whether audit storage needs a separate schema PR.",
    implementationGate: "blocked-until-approved",
    separatePrRequired: true,
    forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
  },
  {
    id: "retention-policy",
    implementationStage: "approval-required-before-implementation",
    decisionUnit:
      "Define credential lifetime, stale credential cleanup, revoked credential cleanup, and account deletion behavior.",
    proposedResolution:
      "Retention should keep encrypted token records only while the broadcaster connection is active, clean up stale or revoked credentials on a documented schedule, and delete credential material during account deletion or explicit disconnect cleanup.",
    requiredApproval:
      "Privacy and product approval for active credential lifetime, stale cleanup timing, revoked cleanup timing, and account deletion behavior before persistence implementation.",
    implementationGate: "blocked-until-approved",
    separatePrRequired: true,
    forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
  },
  {
    id: "live-smoke-approval",
    implementationStage: "approval-required-before-implementation",
    decisionUnit:
      "Define the safe live smoke owner account, endpoints, credential handling, logging limits, and abort conditions.",
    proposedResolution:
      "Safe live smoke may only run after explicit approval for a safe test YouTube owner account, server-only token handling, read-only scope, and bounded calls to channels.list, liveBroadcasts.list, and one liveChatMessages.list step with no token printing.",
    requiredApproval:
      "User approval for the safe test YouTube owner account, target endpoints, no-print credential handling, and documented unchecked scope before any live Google API call.",
    implementationGate: "blocked-until-approved",
    separatePrRequired: true,
    forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
  }
] as const satisfies readonly YouTubeEncryptedTokenStoreBlockerResolutionDecision[];

export const youtubeEncryptedTokenStoreBlockerResolutionPlan = {
  implementationStage: "blocker-resolution-plan-only",
  sourceBlockerIds: youtubeEncryptedTokenStoreImplementationBlockers.map((blocker) => blocker.id),
  decisions: youtubeEncryptedTokenStoreBlockerResolutionDecisions,
  tokenPersistence: "blocked-until-approvals-and-separate-implementation",
  schemaMutation: "forbidden-in-this-slice",
  rlsMutation: "forbidden-in-this-slice",
  storageKeyMutation: "forbidden-in-this-slice",
  clientStorage: "forbidden",
  providerCoupling: "forbidden-direct-import-or-call",
  quotaWrite: "not-implemented",
  safeLiveSmoke: youtubeGoogleApiSafeLiveSmokePolicy
} as const satisfies YouTubeEncryptedTokenStoreBlockerResolutionPlan;

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

export function createYouTubeEncryptedTokenStoreBlockerResolutionMemo(): string {
  const decisionSummary = youtubeEncryptedTokenStoreBlockerResolutionDecisions
    .map((decision) => `${decision.id}: ${decision.requiredApproval}`)
    .join(" ");

  return `${youtubeEncryptedTokenStoreBlockerResolutionPlan.tokenPersistence}. ${decisionSummary}`;
}

export function assessYouTubeEncryptedTokenStoreImplementationReadiness(
  approvedDecisionIds: readonly YouTubeEncryptedTokenStoreBlockerId[]
): YouTubeEncryptedTokenStoreImplementationReadiness {
  const approved = new Set(approvedDecisionIds);
  const missingDecisionIds = youtubeEncryptedTokenStoreBlockerResolutionPlan.sourceBlockerIds.filter(
    (id) => !approved.has(id)
  );

  if (missingDecisionIds.length > 0) {
    const missing = new Set(missingDecisionIds);

    return {
      status: "blocked",
      missingDecisionIds,
      requiredApprovals: youtubeEncryptedTokenStoreBlockerResolutionDecisions
        .filter((decision) => missing.has(decision.id))
        .map((decision) => decision.requiredApproval),
      tokenPersistence: "forbidden",
      schemaMutation: "forbidden-in-this-slice",
      liveSmoke: "not-run-in-this-slice"
    };
  }

  return {
    status: "ready-for-separate-implementation-pr",
    approvedDecisionIds: youtubeEncryptedTokenStoreBlockerResolutionPlan.sourceBlockerIds,
    tokenPersistence: "still-not-implemented-in-this-slice",
    schemaMutation: "still-forbidden-in-this-slice",
    liveSmoke: "still-not-run-in-this-slice"
  };
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
