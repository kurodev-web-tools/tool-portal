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

export type YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint = {
  implementationStage: "schema-key-approval-checkpoint";
  status: "proposal-only-pending-explicit-approval";
  sourcePlanStatus: YouTubeEncryptedTokenStoreBlockerResolutionPlan["tokenPersistence"];
  sourceDecisionIds: readonly ["schema-approval", "key-management"];
  requiredApprovers: {
    schema: readonly string[];
    keyManagement: readonly string[];
    approvedMigrationPr: readonly string[];
  };
  requiredConfirmationItems: {
    schema: readonly string[];
    keyManagement: readonly string[];
    boundaries: readonly string[];
  };
  proposalOnlyConditions: readonly string[];
  approvedMigrationPrConditions: readonly string[];
  separateMigrationPrRequired: true;
  implementationAllowedInThisPr: false;
  tokenPersistence: "still-blocked";
  schemaMutation: "forbidden-in-this-slice";
  rlsMutation: "forbidden-in-this-slice";
  storageKeyMutation: "forbidden-in-this-slice";
  clientStorage: "forbidden";
  providerCoupling: "forbidden-direct-import-or-call";
  quotaWrite: "not-implemented";
  safeLiveSmoke: {
    status: "not-run-until-safe-live-smoke-conditions";
    requiredConditions: readonly string[];
    uncheckedScopeWhenNotRun: readonly string[];
  };
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreApprovalRole = "Product owner" | "Data owner" | "Security owner";

export type YouTubeEncryptedTokenStoreApprovalEvidence = {
  role: YouTubeEncryptedTokenStoreApprovalRole;
  approved: boolean;
  scope: string;
};

export type YouTubeEncryptedTokenStoreApprovedMigrationProposalGate = {
  implementationStage: "approved-migration-proposal-gate";
  prerequisitePullRequest: "#273";
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview";
  currentApprovalState: "blocked-missing-explicit-owner-approvals";
  sourceCheckpointStatus: YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint["status"];
  requiredApprovalRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
  missingApprovalRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
  approvalCollectionNote: readonly string[];
  requiredConfirmationItems: YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint["requiredConfirmationItems"];
  migrationProposalConditions: readonly string[];
  rollbackPlan: readonly string[];
  separateMigrationPrRequired: true;
  proposalOnlyWhenApprovalMissing: true;
  migrationImplementationAllowedInThisPr: false;
  tokenPersistence: "still-blocked";
  schemaMutation: "forbidden-in-this-slice";
  rlsMutation: "forbidden-in-this-slice";
  storageKeyMutation: "forbidden-in-this-slice";
  clientStorage: "forbidden";
  providerCoupling: "forbidden-direct-import-or-call";
  quotaWrite: "not-implemented";
  safeLiveSmoke: YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint["safeLiveSmoke"];
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreApprovedMigrationProposalGateResult =
  | {
      status: "blocked-missing-explicit-owner-approvals";
      missingApprovalRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
      proposalOnly: true;
      migrationImplementationAllowedInThisPr: false;
      nextAction: "collect-explicit-owner-approvals";
    }
  | {
      status: "proposal-ready-for-separate-migration-pr";
      approvedRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
      proposalOnly: true;
      migrationImplementationAllowedInThisPr: false;
      nextAction: "draft-separate-approved-migration-pr";
    };

export type YouTubeEncryptedTokenStoreExplicitApprovalCollection = {
  implementationStage: "explicit-approval-collection";
  prerequisitePullRequest: "#274";
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview";
  sourceApprovedMigrationProposalGateStatus: YouTubeEncryptedTokenStoreApprovedMigrationProposalGate["currentApprovalState"];
  approvalEvidenceSource: "task-docs-pr-context";
  currentApprovalState: "blocked-missing-explicit-owner-approvals";
  requiredApprovalRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
  collectedApprovalEvidence: readonly YouTubeEncryptedTokenStoreApprovalEvidence[];
  missingApprovalRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
  blockerSummary: readonly string[];
  requiredConfirmationItems: YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint["requiredConfirmationItems"];
  ownerConfirmationQuestions: {
    productOwner: readonly string[];
    dataOwner: readonly string[];
    securityOwner: readonly string[];
  };
  boundaries: readonly string[];
  approvalEvidenceOnlyInThisPr: true;
  separateMigrationPrRequired: true;
  migrationImplementationAllowedInThisPr: false;
  migrationReadiness: "blocked-until-explicit-owner-approvals";
  tokenPersistence: "still-blocked";
  schemaMutation: "forbidden-in-this-slice";
  rlsMutation: "forbidden-in-this-slice";
  storageKeyMutation: "forbidden-in-this-slice";
  clientStorage: "forbidden";
  providerCoupling: "forbidden-direct-import-or-call";
  quotaWrite: "not-implemented";
  safeLiveSmoke: YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint["safeLiveSmoke"];
  uncheckedScopeWhenBlocked: readonly string[];
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreExplicitApprovalCollectionResult =
  | {
      status: "blocked-missing-explicit-owner-approvals";
      missingApprovalRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
      approvalEvidenceOnlyInThisPr: true;
      migrationImplementationAllowedInThisPr: false;
      migrationReadiness: "blocked";
      nextAction: "collect-explicit-owner-approvals";
    }
  | {
      status: "approval-evidence-ready-for-separate-migration-pr";
      approvedRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
      approvalEvidenceOnlyInThisPr: true;
      migrationImplementationAllowedInThisPr: false;
      migrationReadiness: "ready-for-separate-approved-migration-pr";
      nextAction: "draft-separate-approved-migration-pr";
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

export const youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint = {
  implementationStage: "schema-key-approval-checkpoint",
  status: "proposal-only-pending-explicit-approval",
  sourcePlanStatus: youtubeEncryptedTokenStoreBlockerResolutionPlan.tokenPersistence,
  sourceDecisionIds: ["schema-approval", "key-management"],
  requiredApprovers: {
    schema: ["Product owner", "Data owner"],
    keyManagement: ["Security owner"],
    approvedMigrationPr: ["Product owner", "Data owner", "Security owner"]
  },
  requiredConfirmationItems: {
    schema: [
      "server-owned YouTube credential table ownership model",
      "owner binding and credential reference id semantics",
      "RLS posture that never exposes token material to browser clients",
      "migration rollout order and rollback path",
      "no existing storage key, payload, IndexedDB key, localStorage key, handoff payload, or quota write change"
    ],
    keyManagement: [
      "managed secret or KMS owner selection",
      "server-only envelope and decrypt access boundary",
      "rotation cadence and versioned key metadata",
      "emergency disable and incident handling path",
      "no client decrypt, no secret printing, and no privileged server key exposure"
    ],
    boundaries: [
      "no OAuth token persistence implementation in this PR",
      "no Supabase schema, migration, or RLS policy change in this PR",
      "no client component Google API, provider, or polling runtime call",
      "no translation provider coupling",
      "no storage key, payload, IndexedDB, localStorage, handoff payload, or quota write change"
    ]
  },
  proposalOnlyConditions: [
    "schema/RLS/table shape approval is missing or incomplete",
    "managed secret or KMS owner and rotation policy are not approved",
    "safe live smoke owner/account/endpoints are not approved",
    "migration rollback or data-owner review is pending",
    "implementation would touch Supabase schema, migration, RLS, storage keys, payloads, browser storage, provider coupling, or quota writes in this PR"
  ],
  approvedMigrationPrConditions: [
    "product and data-owner approve table shape, RLS posture, migration order, and rollback",
    "security approves managed secret/KMS selection, rotation procedure, emergency disable path, and no client decrypt",
    "separate migration PR targets codex/comment-translator-preview and is reviewed independently",
    "no OAuth token values or private credentials appear in the migration PR, task docs, PR body, fixtures, browser storage, or client components",
    "Google API live smoke remains separate until safe live smoke conditions are satisfied"
  ],
  separateMigrationPrRequired: true,
  implementationAllowedInThisPr: false,
  tokenPersistence: "still-blocked",
  schemaMutation: "forbidden-in-this-slice",
  rlsMutation: "forbidden-in-this-slice",
  storageKeyMutation: "forbidden-in-this-slice",
  clientStorage: "forbidden",
  providerCoupling: "forbidden-direct-import-or-call",
  quotaWrite: "not-implemented",
  safeLiveSmoke: {
    status: "not-run-until-safe-live-smoke-conditions",
    requiredConditions: [
      "explicit user approval for a safe test YouTube owner account",
      "server-only token resolver implementation that can obtain token material without returning it to callers",
      "encrypted server token store implemented and reviewed without hidden schema changes",
      "read-only YouTube OAuth scope",
      "bounded calls to channels.list, liveBroadcasts.list, and one liveChatMessages.list step",
      "no OAuth token value in client components, fixtures, task docs, PR body, localStorage, or IndexedDB"
    ],
    uncheckedScopeWhenNotRun: [
      "no safe live YouTube login or OAuth smoke",
      "no owner verification smoke",
      "no owned broadcast lookup smoke",
      "no Live Chat polling smoke",
      "no Google API live call"
    ]
  },
  forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
} as const satisfies YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint;

const youtubeEncryptedTokenStoreApprovalRoles = [
  "Product owner",
  "Data owner",
  "Security owner"
] as const satisfies readonly YouTubeEncryptedTokenStoreApprovalRole[];

export const youtubeEncryptedTokenStoreApprovedMigrationProposalGate = {
  implementationStage: "approved-migration-proposal-gate",
  prerequisitePullRequest: "#273",
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview",
  currentApprovalState: "blocked-missing-explicit-owner-approvals",
  sourceCheckpointStatus: youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint.status,
  requiredApprovalRoles: youtubeEncryptedTokenStoreApprovalRoles,
  missingApprovalRoles: youtubeEncryptedTokenStoreApprovalRoles,
  approvalCollectionNote: [
    "Product owner approval for table shape, RLS posture, migration order, and rollback is still required.",
    "Data owner approval for browser-unreadable token material and rollback is still required.",
    "Security owner approval for managed secret or KMS selection, rotation, emergency disable, and no client decrypt is still required.",
    "Until those approvals are explicit, this PR remains proposal-only and cannot add token persistence, Supabase schema, migrations, or RLS policies."
  ],
  requiredConfirmationItems: youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint.requiredConfirmationItems,
  migrationProposalConditions: [
    "separate migration PR targets codex/comment-translator-preview",
    "independent review covers schema shape, RLS posture, key management, and rollback plan",
    "no OAuth token values or private credentials appear in code, task docs, PR body, fixtures, browser storage, or client components",
    "rollback plan is documented before migration execution",
    "Google API live smoke remains separate until safe live smoke conditions are satisfied"
  ],
  rollbackPlan: [
    "disable credential resolution before rollback if token resolution is deployed",
    "revert migration through a reviewed database rollback path",
    "no token value logging during rollback or investigation",
    "revoke or invalidate credential references if rollback leaves unusable credential rows"
  ],
  separateMigrationPrRequired: true,
  proposalOnlyWhenApprovalMissing: true,
  migrationImplementationAllowedInThisPr: false,
  tokenPersistence: "still-blocked",
  schemaMutation: "forbidden-in-this-slice",
  rlsMutation: "forbidden-in-this-slice",
  storageKeyMutation: "forbidden-in-this-slice",
  clientStorage: "forbidden",
  providerCoupling: "forbidden-direct-import-or-call",
  quotaWrite: "not-implemented",
  safeLiveSmoke: youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint.safeLiveSmoke,
  forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
} as const satisfies YouTubeEncryptedTokenStoreApprovedMigrationProposalGate;

export const youtubeEncryptedTokenStoreExplicitApprovalCollection = {
  implementationStage: "explicit-approval-collection",
  prerequisitePullRequest: "#274",
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview",
  sourceApprovedMigrationProposalGateStatus: youtubeEncryptedTokenStoreApprovedMigrationProposalGate.currentApprovalState,
  approvalEvidenceSource: "task-docs-pr-context",
  currentApprovalState: "blocked-missing-explicit-owner-approvals",
  requiredApprovalRoles: youtubeEncryptedTokenStoreApprovalRoles,
  collectedApprovalEvidence: [],
  missingApprovalRoles: youtubeEncryptedTokenStoreApprovalRoles,
  blockerSummary: [
    "Product owner explicit approval is missing for table shape, RLS posture, migration order, rollback, and disconnect UX readiness.",
    "Data owner explicit approval is missing for browser-unreadable token material, audit/retention fields, rollback, and account deletion cleanup.",
    "Security owner explicit approval is missing for managed secret or KMS selection, rotation, emergency disable, server-only decrypt access, and no client decrypt.",
    "Because owner approvals are missing, migration readiness remains blocked and this PR stays approval-evidence-only."
  ],
  requiredConfirmationItems: youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint.requiredConfirmationItems,
  ownerConfirmationQuestions: {
    productOwner: [
      "Approve the server-owned YouTube credential table shape and owner binding semantics.",
      "Approve the RLS posture, migration order, rollback path, and disconnect/revocation user state.",
      "Confirm no existing storage key, payload, IndexedDB key, localStorage key, handoff payload, or quota write changes are included."
    ],
    dataOwner: [
      "Approve browser-unreadable token material for OAuth access/refresh tokens that is only referenced by credential reference id.",
      "Approve allowed audit fields, retention period, stale/revoked cleanup timing, rollback handling, and account deletion cleanup.",
      "Confirm no token values, authorization codes, raw Google responses, or private credentials appear in docs, fixtures, PR body, or browser storage."
    ],
    securityOwner: [
      "Approve managed secret or KMS ownership, server-only envelope handling, and decrypt access boundary.",
      "Approve rotation cadence, versioned key metadata, emergency disable path, and incident handling.",
      "Confirm no client decrypt, no secret printing, and no privileged server key exposure."
    ]
  },
  boundaries: [
    "no OAuth token persistence implementation in this PR",
    "no Supabase schema, migration, or RLS policy change in this PR",
    "no client component Google API, provider, or polling runtime call",
    "no translation provider coupling",
    "no storage key, payload, IndexedDB, localStorage, handoff payload, or quota write change"
  ],
  approvalEvidenceOnlyInThisPr: true,
  separateMigrationPrRequired: true,
  migrationImplementationAllowedInThisPr: false,
  migrationReadiness: "blocked-until-explicit-owner-approvals",
  tokenPersistence: "still-blocked",
  schemaMutation: "forbidden-in-this-slice",
  rlsMutation: "forbidden-in-this-slice",
  storageKeyMutation: "forbidden-in-this-slice",
  clientStorage: "forbidden",
  providerCoupling: "forbidden-direct-import-or-call",
  quotaWrite: "not-implemented",
  safeLiveSmoke: youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint.safeLiveSmoke,
  uncheckedScopeWhenBlocked: [
    "no safe live YouTube login or OAuth smoke",
    "no owner verification smoke",
    "no owned broadcast lookup smoke",
    "no Live Chat polling smoke",
    "no Google API live call",
    "no token persistence runtime"
  ],
  forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
} as const satisfies YouTubeEncryptedTokenStoreExplicitApprovalCollection;

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

export function assessYouTubeEncryptedTokenStoreApprovedMigrationProposalGate(
  approvalEvidence: readonly YouTubeEncryptedTokenStoreApprovalEvidence[]
): YouTubeEncryptedTokenStoreApprovedMigrationProposalGateResult {
  const approvedRoles = youtubeEncryptedTokenStoreApprovalRoles.filter((role) =>
    approvalEvidence.some((evidence) => evidence.role === role && evidence.approved)
  );
  const missingApprovalRoles = youtubeEncryptedTokenStoreApprovalRoles.filter(
    (role) => !approvedRoles.includes(role)
  );

  if (missingApprovalRoles.length > 0) {
    return {
      status: "blocked-missing-explicit-owner-approvals",
      missingApprovalRoles,
      proposalOnly: true,
      migrationImplementationAllowedInThisPr: false,
      nextAction: "collect-explicit-owner-approvals"
    };
  }

  return {
    status: "proposal-ready-for-separate-migration-pr",
    approvedRoles,
    proposalOnly: true,
    migrationImplementationAllowedInThisPr: false,
    nextAction: "draft-separate-approved-migration-pr"
  };
}

export function createYouTubeEncryptedTokenStoreApprovalCollectionNote(): string {
  return youtubeEncryptedTokenStoreApprovedMigrationProposalGate.approvalCollectionNote.join(" ");
}

export function assessYouTubeEncryptedTokenStoreExplicitApprovalCollection(
  approvalEvidence: readonly YouTubeEncryptedTokenStoreApprovalEvidence[]
): YouTubeEncryptedTokenStoreExplicitApprovalCollectionResult {
  const approvedRoles = youtubeEncryptedTokenStoreApprovalRoles.filter((role) =>
    approvalEvidence.some((evidence) => evidence.role === role && evidence.approved)
  );
  const missingApprovalRoles = youtubeEncryptedTokenStoreApprovalRoles.filter(
    (role) => !approvedRoles.includes(role)
  );

  if (missingApprovalRoles.length > 0) {
    return {
      status: "blocked-missing-explicit-owner-approvals",
      missingApprovalRoles,
      approvalEvidenceOnlyInThisPr: true,
      migrationImplementationAllowedInThisPr: false,
      migrationReadiness: "blocked",
      nextAction: "collect-explicit-owner-approvals"
    };
  }

  return {
    status: "approval-evidence-ready-for-separate-migration-pr",
    approvedRoles,
    approvalEvidenceOnlyInThisPr: true,
    migrationImplementationAllowedInThisPr: false,
    migrationReadiness: "ready-for-separate-approved-migration-pr",
    nextAction: "draft-separate-approved-migration-pr"
  };
}

export function createYouTubeEncryptedTokenStoreExplicitApprovalCollectionSummary(): string {
  return [
    youtubeEncryptedTokenStoreExplicitApprovalCollection.currentApprovalState,
    youtubeEncryptedTokenStoreExplicitApprovalCollection.blockerSummary.join(" "),
    `Missing roles: ${youtubeEncryptedTokenStoreExplicitApprovalCollection.missingApprovalRoles.join(", ")}.`,
    `Safe live smoke: ${youtubeEncryptedTokenStoreExplicitApprovalCollection.safeLiveSmoke.status}.`
  ].join(" ");
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
