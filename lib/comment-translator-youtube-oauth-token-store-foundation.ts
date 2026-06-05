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

export type YouTubeEncryptedTokenStoreApprovalScopeRequirement = {
  role: YouTubeEncryptedTokenStoreApprovalRole;
  requiredScopeItems: readonly string[];
};

export type YouTubeEncryptedTokenStoreMissingApprovalScopeItem = {
  role: YouTubeEncryptedTokenStoreApprovalRole;
  item: string;
};

export type YouTubeEncryptedTokenStoreSeparateMigrationReadiness = {
  implementationStage: "separate-approved-migration-readiness";
  prerequisitePullRequest: "#275";
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview";
  approvalEvidenceSource: "task-docs-pr-context";
  approvalScope: "readiness-pr-only";
  currentApprovalState: "readiness-approved-not-migration-implementation";
  requiredApprovalRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
  collectedApprovalEvidence: readonly YouTubeEncryptedTokenStoreApprovalEvidence[];
  approvalScopeRequirements: readonly YouTubeEncryptedTokenStoreApprovalScopeRequirement[];
  readinessNote: readonly string[];
  rollbackReviewGate: {
    status: "review-required-before-migration-implementation";
    requiredReviewItems: readonly string[];
  };
  separateMigrationPrRequired: true;
  finalMigrationImplementationApprovalRequired: true;
  migrationImplementationAllowedInThisPr: false;
  tokenPersistence: "still-blocked";
  schemaMutation: "forbidden-in-this-slice";
  rlsMutation: "forbidden-in-this-slice";
  storageKeyMutation: "forbidden-in-this-slice";
  clientStorage: "forbidden";
  providerCoupling: "forbidden-direct-import-or-call";
  quotaWrite: "not-implemented";
  safeLiveSmoke: YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint["safeLiveSmoke"];
  uncheckedScopeWhenNotRun: readonly string[];
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreSeparateMigrationReadinessResult =
  | {
      status: "blocked-missing-readiness-approval-evidence";
      missingApprovalRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
      missingScopeItems: readonly YouTubeEncryptedTokenStoreMissingApprovalScopeItem[];
      migrationReadiness: "blocked";
      migrationImplementationAllowedInThisPr: false;
      nextAction: "collect-readiness-approval-evidence";
    }
  | {
      status: "readiness-ready-for-separate-approved-migration-pr";
      approvedRoles: readonly YouTubeEncryptedTokenStoreApprovalRole[];
      missingScopeItems: readonly [];
      migrationReadiness: "ready-for-separate-approved-migration-pr";
      migrationImplementationAllowedInThisPr: false;
      finalMigrationImplementationApprovalRequired: true;
      nextAction: "draft-separate-approved-migration-pr-readiness-note";
    };

export type YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea =
  | "table-shape"
  | "rls-posture"
  | "key-management"
  | "rollback";

export type YouTubeEncryptedTokenStoreSeparateApprovedMigrationFinalReviewEvidence = {
  area: YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea;
  approved: boolean;
  scope: string;
};

export type YouTubeEncryptedTokenStoreSeparateApprovedMigrationImplementationApprovalEvidence = {
  approved: boolean;
  scope: string;
};

export type YouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate = {
  implementationStage: "separate-approved-migration-pr-final-review-blocker";
  prerequisitePullRequest: "#276";
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview";
  sourceReadinessApprovalState: YouTubeEncryptedTokenStoreSeparateMigrationReadiness["currentApprovalState"];
  postReviewPullRequest: "#278";
  postReviewMergeStatus: "merged-into-codex-comment-translator-preview";
  workersCheckDisposition: "pass";
  cloudflarePagesDisposition: "dashboard-log-review-item";
  postFinalImplementationApprovalPullRequest: "#279";
  postFinalImplementationApprovalMergeStatus: "merged-into-codex-comment-translator-preview";
  postFinalImplementationApprovalWorkersCheckDisposition: "pass";
  postFinalImplementationApprovalCloudflarePagesDisposition: "dashboard-log-review-item";
  postImplementationApprovalEvidencePullRequest: "#287";
  postImplementationApprovalEvidenceMergeStatus: "merged-into-codex-comment-translator-preview";
  postImplementationApprovalEvidenceWorkersCheckDisposition: "pass";
  postImplementationApprovalEvidenceCloudflarePagesDisposition: "dashboard-log-review-item";
  finalReviewStatus: "blocked-pending-final-table-rls-key-management-review";
  finalReviewEvidenceStatus: "missing-from-current-task-docs-pr-context";
  explicitImplementationApprovalStatus: "missing";
  approvalEvidenceSource: "task-docs-pr-context";
  requiredFinalReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
  tableShape: {
    tableName: "youtube_oauth_credentials";
    ownership: readonly string[];
    columns: readonly string[];
    browserReadableState: readonly string[];
    forbiddenFields: readonly string[];
  };
  rlsPosture: {
    status: "final-review-required";
    rules: readonly string[];
  };
  migrationOrder: readonly string[];
  keyManagementReview: {
    status: "final-review-required";
    requirements: readonly string[];
  };
  rollbackReview: {
    status: "final-review-required";
    requiredReviewItems: readonly string[];
  };
  safeLiveSmoke: YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint["safeLiveSmoke"];
  contractOnlyInThisPr: true;
  finalMigrationImplementationApprovalRequired: true;
  migrationImplementationAllowedInThisPr: false;
  tokenPersistence: "still-blocked";
  schemaMutation: "forbidden-until-final-review";
  rlsMutation: "forbidden-until-final-review";
  storageKeyMutation: "forbidden";
  clientStorage: "forbidden";
  providerCoupling: "forbidden-direct-import-or-call";
  quotaWrite: "not-implemented";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewResult =
  | {
      status: "blocked-pending-final-review";
      missingReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
      contractOnly: true;
      migrationImplementationAllowedInThisPr: false;
      nextAction: "collect-final-table-rls-key-management-review";
    }
  | {
      status: "blocked-pending-explicit-implementation-approval";
      approvedReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
      missingImplementationApproval: true;
      contractOnly: true;
      migrationImplementationAllowedInThisPr: false;
      nextAction: "collect-explicit-implementation-approval-before-sql";
    }
  | {
      status: "ready-for-separate-implementation-pr";
      approvedReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
      implementationApprovalScope: string;
      contractOnly: true;
      migrationImplementationAllowedInThisPr: false;
      nextAction: "open-separate-sql-rls-token-persistence-implementation-pr";
    };

export type YouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck = {
  implementationStage: "post-credential-status-display-token-store-final-approval-recheck";
  prerequisitePullRequest: "#322";
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview";
  credentialStatusDisplayBoundary: "client-safe-sanitized-metadata-only";
  approvalEvidenceSource: "task-docs-pr-context";
  finalReviewStatus: "blocked-pending-final-table-rls-key-management-rollback-review";
  explicitImplementationApprovalStatus: "missing";
  requiredFinalReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
  remoteSupabaseApply: "forbidden-in-this-slice";
  serverOnlyTokenPersistenceRuntime: "blocked-beyond-existing-skeleton";
  googleApiLiveSmoke: "forbidden-in-this-slice";
  ownerAuthorization: "preserved-before-status-read";
  credentialResolutionDisable: "preserved";
  clientReadableOutput: readonly string[];
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheckResult =
  | {
      status: "blocked-pending-final-review";
      missingReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
      explicitImplementationApproval: "not-evaluated-until-final-review-complete";
      remoteSupabaseApplyAllowedInThisPr: false;
      tokenPersistenceRuntimeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "record-blocker-summary-and-collect-final-review-evidence";
    }
  | {
      status: "blocked-pending-explicit-implementation-approval";
      approvedReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
      missingImplementationApproval: true;
      remoteSupabaseApplyAllowedInThisPr: false;
      tokenPersistenceRuntimeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "collect-explicit-implementation-approval-before-separate-runtime-or-apply-pr";
    }
  | {
      status: "ready-for-separate-runtime-or-apply-pr";
      approvedReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
      implementationApprovalScope: string;
      remoteSupabaseApplyAllowedInThisPr: false;
      tokenPersistenceRuntimeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "open-small-separate-server-only-runtime-or-apply-pr";
    };

export type YouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection = {
  implementationStage: "post-final-approval-recheck-evidence-collection";
  prerequisitePullRequest: "#323";
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview";
  prerequisiteMergeCommit: "07b221999f302477645160278ae50f8ad3eb043c";
  prerequisiteMergedAtUtc: "2026-06-04T07:32:53Z";
  approvalEvidenceSource: "task-docs-pr-323-context";
  currentEvidenceStatus: "missing-final-review-and-explicit-implementation-approval";
  sourceRecheckStatus: YouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck["finalReviewStatus"];
  requiredFinalReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
  requiredExplicitImplementationApproval: true;
  prContextChecks: {
    workersBuilds: "success";
    cloudflarePages: "failure-known-pages-disconnect-noise";
  };
  evidenceRequirements: readonly string[];
  remoteSupabaseApply: "forbidden-in-this-slice";
  serverOnlyTokenPersistenceRuntime: "blocked-beyond-existing-skeleton";
  googleApiLiveSmoke: "forbidden-in-this-slice";
  ownerAuthorization: "preserved-before-status-read";
  credentialResolutionDisable: "preserved";
  clientReadableOutput: readonly string[];
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollectionResult =
  | {
      status: "blocked-pending-final-review";
      missingReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
      explicitImplementationApproval: "not-evaluated-until-final-review-complete";
      remoteSupabaseApplyAllowedInThisPr: false;
      tokenPersistenceRuntimeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "record-evidence-requirements-and-collect-final-review-evidence";
    }
  | Extract<
      YouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheckResult,
      { status: "blocked-pending-explicit-implementation-approval" | "ready-for-separate-runtime-or-apply-pr" }
    >;

export type YouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate = {
  implementationStage: "post-pr-324-final-implementation-approval-evidence-gate";
  prerequisitePullRequest: "#324";
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview";
  prerequisiteMergeCommit: "7fd49532509cf634e220145eb143469f9bd4e49b";
  prerequisiteMergedAtUtc: "2026-06-04T10:57:23Z";
  approvalEvidenceSource: "task-docs-pr-324-context";
  currentEvidenceStatus: "missing-final-review-and-explicit-implementation-approval";
  sourceEvidenceCollectionStatus: YouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection["currentEvidenceStatus"];
  requiredFinalReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
  requiredExplicitImplementationApproval: true;
  prContextChecks: {
    workersBuilds: "success";
    cloudflarePages: "failure-known-pages-disconnect-noise";
  };
  evidenceRequirements: readonly string[];
  remoteSupabaseApply: "forbidden-in-this-slice";
  serverOnlyTokenPersistenceRuntime: "blocked-beyond-existing-skeleton";
  googleApiLiveSmoke: "forbidden-in-this-slice";
  ownerAuthorization: "preserved-before-status-read";
  credentialResolutionDisable: "preserved";
  clientReadableOutput: readonly string[];
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGateResult =
  | {
      status: "blocked-pending-final-review";
      missingReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
      explicitImplementationApproval: "not-evaluated-until-final-review-complete";
      remoteSupabaseApplyAllowedInThisPr: false;
      tokenPersistenceRuntimeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "record-blocker-summary-and-evidence-requirements";
    }
  | Extract<
      YouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheckResult,
      { status: "blocked-pending-explicit-implementation-approval" | "ready-for-separate-runtime-or-apply-pr" }
    >;

export type YouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck = {
  implementationStage: "post-pr-325-final-approval-evidence-recheck";
  prerequisitePullRequest: "#325";
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview";
  prerequisiteMergeCommit: "b97a39f3a32ecfef2024d2ceb3290aea35283ad5";
  prerequisiteMergedAtUtc: "2026-06-04T14:14:31Z";
  approvalEvidenceSource: "task-docs-pr-325-context";
  currentEvidenceStatus: "missing-final-review-and-explicit-implementation-approval";
  sourceFinalImplementationApprovalEvidenceGateStatus: YouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate["currentEvidenceStatus"];
  requiredFinalReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
  requiredExplicitImplementationApproval: true;
  prContextChecks: {
    workersBuilds: "success";
    cloudflarePages: "failure-known-pages-disconnect-noise";
  };
  evidenceRequirements: readonly string[];
  remoteSupabaseApply: "forbidden-in-this-slice";
  serverOnlyTokenPersistenceRuntime: "blocked-beyond-existing-skeleton";
  googleApiLiveSmoke: "forbidden-in-this-slice";
  ownerAuthorization: "preserved-before-status-read";
  credentialResolutionDisable: "preserved";
  clientReadableOutput: readonly string[];
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheckResult =
  | {
      status: "blocked-pending-final-review";
      missingReviewAreas: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];
      explicitImplementationApproval: "not-evaluated-until-final-review-complete";
      remoteSupabaseApplyAllowedInThisPr: false;
      tokenPersistenceRuntimeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "record-blocker-summary-and-collect-final-review-evidence";
    }
  | Extract<
      YouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheckResult,
      { status: "blocked-pending-explicit-implementation-approval" | "ready-for-separate-runtime-or-apply-pr" }
    >;

export type YouTubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidence = {
  implementationStage: "final-review-and-explicit-implementation-approval-evidence";
  prerequisitePullRequest: "#326";
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview";
  prerequisiteMergeCommit: "cb490fb2f9a9f5e218a054d84b6c3c5e5d102bd9";
  prerequisiteMergedAtUtc: "2026-06-05T02:20:23Z";
  approvalEvidenceSource: "current-thread-owner-approval";
  currentEvidenceStatus: "final-review-and-explicit-implementation-approved-for-separate-pr";
  ownerApprovalRole: "Product/Data/Security owner";
  finalReviewEvidence: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationFinalReviewEvidence[];
  implementationApproval: YouTubeEncryptedTokenStoreSeparateApprovedMigrationImplementationApprovalEvidence;
  clientReadableOutput: readonly string[];
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidenceResult =
  Extract<
    YouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheckResult,
    { status: "ready-for-separate-runtime-or-apply-pr" }
  >;

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

const youtubeEncryptedTokenStoreSeparateMigrationReadinessApprovalScopeRequirements = [
  {
    role: "Product owner",
    requiredScopeItems: [
      "table shape",
      "RLS posture",
      "migration order",
      "rollback",
      "disconnect/revocation UX",
      "no existing storage key/payload/IndexedDB/localStorage/handoff payload/quota write change"
    ]
  },
  {
    role: "Data owner",
    requiredScopeItems: [
      "browser-unreadable token material",
      "credential-reference-only browser state",
      "audit fields",
      "retention",
      "rollback",
      "account deletion cleanup"
    ]
  },
  {
    role: "Security owner",
    requiredScopeItems: [
      "managed secret or KMS",
      "server-only decrypt",
      "rotation",
      "emergency disable",
      "no client decrypt"
    ]
  }
] as const satisfies readonly YouTubeEncryptedTokenStoreApprovalScopeRequirement[];

const youtubeEncryptedTokenStoreSeparateApprovedMigrationReviewAreas = [
  "table-shape",
  "rls-posture",
  "key-management",
  "rollback"
] as const satisfies readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationReviewArea[];

export const youtubeEncryptedTokenStoreSeparateMigrationReadiness = {
  implementationStage: "separate-approved-migration-readiness",
  prerequisitePullRequest: "#275",
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview",
  approvalEvidenceSource: "task-docs-pr-context",
  approvalScope: "readiness-pr-only",
  currentApprovalState: "readiness-approved-not-migration-implementation",
  requiredApprovalRoles: youtubeEncryptedTokenStoreApprovalRoles,
  collectedApprovalEvidence: [
    {
      role: "Product owner",
      approved: true,
      scope:
        "table shape; RLS posture; migration order; rollback; disconnect/revocation UX; no existing storage key/payload/IndexedDB/localStorage/handoff payload/quota write change; readiness PR only; actual migration not approved"
    },
    {
      role: "Data owner",
      approved: true,
      scope:
        "browser-unreadable token material; credential-reference-only browser state; audit fields; retention; rollback; account deletion cleanup; no token values/auth codes/raw Google responses/private credentials in code/docs/fixtures/PR body/browser storage; final table/RLS implementation not approved"
    },
    {
      role: "Security owner",
      approved: true,
      scope:
        "managed secret or KMS; server-only decrypt; no client decrypt; no secret printing; rotation; emergency disable; privileged key exposure controls; production token persistence not approved"
    }
  ],
  approvalScopeRequirements: youtubeEncryptedTokenStoreSeparateMigrationReadinessApprovalScopeRequirements,
  readinessNote: [
    "Product owner, Data owner, and Security owner approval evidence is sufficient to draft a separate migration readiness PR.",
    "This approval is readiness-pr-only; actual Supabase migration and RLS implementation stay out of this PR.",
    "The separate migration PR must target codex/comment-translator-preview and receive independent review.",
    "Final table and RLS implementation review is still required before applying any migration.",
    "OAuth token values and private credentials must remain out of code, task docs, PR body, fixtures, browser storage, and client components."
  ],
  rollbackReviewGate: {
    status: "review-required-before-migration-implementation",
    requiredReviewItems: [
      "disable credential resolution before rollback if token resolution is deployed",
      "reviewed database rollback path",
      "no token value logging during rollback or investigation",
      "revoke or invalidate credential references if rollback leaves unusable credential rows"
    ]
  },
  separateMigrationPrRequired: true,
  finalMigrationImplementationApprovalRequired: true,
  migrationImplementationAllowedInThisPr: false,
  tokenPersistence: "still-blocked",
  schemaMutation: "forbidden-in-this-slice",
  rlsMutation: "forbidden-in-this-slice",
  storageKeyMutation: "forbidden-in-this-slice",
  clientStorage: "forbidden",
  providerCoupling: "forbidden-direct-import-or-call",
  quotaWrite: "not-implemented",
  safeLiveSmoke: youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint.safeLiveSmoke,
  uncheckedScopeWhenNotRun: [
    "no safe live YouTube login or OAuth smoke",
    "no owner verification smoke",
    "no owned broadcast lookup smoke",
    "no Live Chat polling smoke",
    "no Google API live call",
    "no token persistence runtime",
    "no Supabase migration or RLS smoke"
  ],
  forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
} as const satisfies YouTubeEncryptedTokenStoreSeparateMigrationReadiness;

export const youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate = {
  implementationStage: "separate-approved-migration-pr-final-review-blocker",
  prerequisitePullRequest: "#276",
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview",
  sourceReadinessApprovalState: youtubeEncryptedTokenStoreSeparateMigrationReadiness.currentApprovalState,
  postReviewPullRequest: "#278",
  postReviewMergeStatus: "merged-into-codex-comment-translator-preview",
  workersCheckDisposition: "pass",
  cloudflarePagesDisposition: "dashboard-log-review-item",
  postFinalImplementationApprovalPullRequest: "#279",
  postFinalImplementationApprovalMergeStatus: "merged-into-codex-comment-translator-preview",
  postFinalImplementationApprovalWorkersCheckDisposition: "pass",
  postFinalImplementationApprovalCloudflarePagesDisposition: "dashboard-log-review-item",
  postImplementationApprovalEvidencePullRequest: "#287",
  postImplementationApprovalEvidenceMergeStatus: "merged-into-codex-comment-translator-preview",
  postImplementationApprovalEvidenceWorkersCheckDisposition: "pass",
  postImplementationApprovalEvidenceCloudflarePagesDisposition: "dashboard-log-review-item",
  finalReviewStatus: "blocked-pending-final-table-rls-key-management-review",
  finalReviewEvidenceStatus: "missing-from-current-task-docs-pr-context",
  explicitImplementationApprovalStatus: "missing",
  approvalEvidenceSource: "task-docs-pr-context",
  requiredFinalReviewAreas: youtubeEncryptedTokenStoreSeparateApprovedMigrationReviewAreas,
  tableShape: {
    tableName: "youtube_oauth_credentials",
    ownership: [
      "server-owned YouTube credential table bound to owner_user_id",
      "credential_reference_id is the only browser-safe identifier",
      "provider_channel_id stores the YouTube owner channel reference without token material"
    ],
    columns: [
      "id",
      "owner_user_id",
      "credential_reference_id",
      "provider",
      "provider_channel_id",
      "scope_set for read-only YouTube OAuth scope",
      "expires_at",
      "revoked_at / revoked at timestamp",
      "key version",
      "encrypted access token ciphertext reference",
      "encrypted refresh token ciphertext reference",
      "created_at",
      "updated_at"
    ],
    browserReadableState: [
      "credential reference id",
      "connection status",
      "scope label",
      "expiry status",
      "revoked state"
    ],
    forbiddenFields: [
      "no token values",
      "no authorization code values",
      "no raw Google response payload",
      "no private credential values"
    ]
  },
  rlsPosture: {
    status: "final-review-required",
    rules: [
      "RLS enabled before runtime use",
      "no browser client policy can read or write token material",
      "trusted server runtime only for encrypted credential rows",
      "redacted browser state must exclude ciphertext and decrypt capability",
      "no client decrypt"
    ]
  },
  migrationOrder: [
    "create table after final review",
    "enable RLS before any token write",
    "add indexes for owner and credential reference lookup",
    "do not backfill live credentials",
    "no runtime token resolver write before key-management review"
  ],
  keyManagementReview: {
    status: "final-review-required",
    requirements: [
      "managed secret or KMS selection must be reviewed before SQL or runtime writes",
      "server-only envelope decrypt boundary",
      "key version metadata on each encrypted credential row",
      "rotation plan with old-key decrypt window and re-encrypt path",
      "emergency disable for credential resolution and token writes",
      "no client decrypt"
    ]
  },
  rollbackReview: {
    status: "final-review-required",
    requiredReviewItems: [
      "disable credential resolution before rollback if token resolution is deployed",
      "reviewed database rollback path",
      "no token value logging during rollback or investigation",
      "revoke or invalidate credential references if rollback leaves unusable credential rows"
    ]
  },
  safeLiveSmoke: youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint.safeLiveSmoke,
  contractOnlyInThisPr: true,
  finalMigrationImplementationApprovalRequired: true,
  migrationImplementationAllowedInThisPr: false,
  tokenPersistence: "still-blocked",
  schemaMutation: "forbidden-until-final-review",
  rlsMutation: "forbidden-until-final-review",
  storageKeyMutation: "forbidden",
  clientStorage: "forbidden",
  providerCoupling: "forbidden-direct-import-or-call",
  quotaWrite: "not-implemented",
  forbiddenInThisSlice: forbiddenTokenStoreImplementationActions
} as const satisfies YouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate;

export const youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck = {
  implementationStage: "post-credential-status-display-token-store-final-approval-recheck",
  prerequisitePullRequest: "#322",
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview",
  credentialStatusDisplayBoundary: "client-safe-sanitized-metadata-only",
  approvalEvidenceSource: "task-docs-pr-context",
  finalReviewStatus: "blocked-pending-final-table-rls-key-management-rollback-review",
  explicitImplementationApprovalStatus: "missing",
  requiredFinalReviewAreas: youtubeEncryptedTokenStoreSeparateApprovedMigrationReviewAreas,
  remoteSupabaseApply: "forbidden-in-this-slice",
  serverOnlyTokenPersistenceRuntime: "blocked-beyond-existing-skeleton",
  googleApiLiveSmoke: "forbidden-in-this-slice",
  ownerAuthorization: "preserved-before-status-read",
  credentialResolutionDisable: "preserved",
  clientReadableOutput: ["opaque non-secret credentialReferenceId", "sanitized credential status metadata"],
  forbiddenInThisSlice: [
    "remote Supabase migration apply",
    "server-only token persistence runtime beyond the existing skeleton",
    "Google API live smoke",
    "safe live YouTube OAuth smoke",
    "OAuth access token or refresh token value handling",
    "service role key value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change",
    "provider coupling, quota write, billing integration, or main integration"
  ]
} as const satisfies YouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck;

export const youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection = {
  implementationStage: "post-final-approval-recheck-evidence-collection",
  prerequisitePullRequest: "#323",
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview",
  prerequisiteMergeCommit: "07b221999f302477645160278ae50f8ad3eb043c",
  prerequisiteMergedAtUtc: "2026-06-04T07:32:53Z",
  approvalEvidenceSource: "task-docs-pr-323-context",
  currentEvidenceStatus: "missing-final-review-and-explicit-implementation-approval",
  sourceRecheckStatus: youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck.finalReviewStatus,
  requiredFinalReviewAreas: youtubeEncryptedTokenStoreSeparateApprovedMigrationReviewAreas,
  requiredExplicitImplementationApproval: true,
  prContextChecks: {
    workersBuilds: "success",
    cloudflarePages: "failure-known-pages-disconnect-noise"
  },
  evidenceRequirements: [
    "final table shape review evidence for youtube_oauth_credentials after PR #323",
    "final RLS posture review evidence proving no browser-readable token material",
    "key-management review evidence for managed secret or KMS, rotation, and emergency disable",
    "rollback review evidence for credential resolution disable, reviewed database rollback, and no token logging",
    "explicit implementation approval for a separate remote apply or server-only runtime expansion PR"
  ],
  remoteSupabaseApply: "forbidden-in-this-slice",
  serverOnlyTokenPersistenceRuntime: "blocked-beyond-existing-skeleton",
  googleApiLiveSmoke: "forbidden-in-this-slice",
  ownerAuthorization: "preserved-before-status-read",
  credentialResolutionDisable: "preserved",
  clientReadableOutput: ["opaque non-secret credentialReferenceId", "sanitized credential status metadata"],
  forbiddenInThisSlice: youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck.forbiddenInThisSlice
} as const satisfies YouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection;

export const youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate = {
  implementationStage: "post-pr-324-final-implementation-approval-evidence-gate",
  prerequisitePullRequest: "#324",
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview",
  prerequisiteMergeCommit: "7fd49532509cf634e220145eb143469f9bd4e49b",
  prerequisiteMergedAtUtc: "2026-06-04T10:57:23Z",
  approvalEvidenceSource: "task-docs-pr-324-context",
  currentEvidenceStatus: "missing-final-review-and-explicit-implementation-approval",
  sourceEvidenceCollectionStatus:
    youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection.currentEvidenceStatus,
  requiredFinalReviewAreas: youtubeEncryptedTokenStoreSeparateApprovedMigrationReviewAreas,
  requiredExplicitImplementationApproval: true,
  prContextChecks: {
    workersBuilds: "success",
    cloudflarePages: "failure-known-pages-disconnect-noise"
  },
  evidenceRequirements: [
    "final table shape review evidence for youtube_oauth_credentials after PR #324",
    "final RLS posture review evidence proving no browser-readable token material after PR #324",
    "key-management review evidence for managed secret or KMS, rotation, emergency disable, and no secret printing",
    "rollback review evidence for credential resolution disable, reviewed database rollback, and no token logging",
    "explicit implementation approval for a separate remote apply or server-only runtime expansion PR"
  ],
  remoteSupabaseApply: "forbidden-in-this-slice",
  serverOnlyTokenPersistenceRuntime: "blocked-beyond-existing-skeleton",
  googleApiLiveSmoke: "forbidden-in-this-slice",
  ownerAuthorization: "preserved-before-status-read",
  credentialResolutionDisable: "preserved",
  clientReadableOutput: ["opaque non-secret credentialReferenceId", "sanitized credential status metadata"],
  forbiddenInThisSlice: youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection.forbiddenInThisSlice
} as const satisfies YouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate;

export const youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck = {
  implementationStage: "post-pr-325-final-approval-evidence-recheck",
  prerequisitePullRequest: "#325",
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview",
  prerequisiteMergeCommit: "b97a39f3a32ecfef2024d2ceb3290aea35283ad5",
  prerequisiteMergedAtUtc: "2026-06-04T14:14:31Z",
  approvalEvidenceSource: "task-docs-pr-325-context",
  currentEvidenceStatus: "missing-final-review-and-explicit-implementation-approval",
  sourceFinalImplementationApprovalEvidenceGateStatus:
    youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate.currentEvidenceStatus,
  requiredFinalReviewAreas: youtubeEncryptedTokenStoreSeparateApprovedMigrationReviewAreas,
  requiredExplicitImplementationApproval: true,
  prContextChecks: {
    workersBuilds: "success",
    cloudflarePages: "failure-known-pages-disconnect-noise"
  },
  evidenceRequirements: [
    "final table shape review evidence for youtube_oauth_credentials after PR #325",
    "final RLS posture review evidence proving no browser-readable token material after PR #325",
    "key-management review evidence for managed secret or KMS, rotation, emergency disable, and no secret printing",
    "rollback review evidence for credential resolution disable, reviewed database rollback, and no token logging",
    "explicit implementation approval for a separate remote apply or server-only runtime expansion PR"
  ],
  remoteSupabaseApply: "forbidden-in-this-slice",
  serverOnlyTokenPersistenceRuntime: "blocked-beyond-existing-skeleton",
  googleApiLiveSmoke: "forbidden-in-this-slice",
  ownerAuthorization: "preserved-before-status-read",
  credentialResolutionDisable: "preserved",
  clientReadableOutput: ["opaque non-secret credentialReferenceId", "sanitized credential status metadata"],
  forbiddenInThisSlice: youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate.forbiddenInThisSlice
} as const satisfies YouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck;

export const youtubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidence = {
  implementationStage: "final-review-and-explicit-implementation-approval-evidence",
  prerequisitePullRequest: "#326",
  prerequisiteMergeStatus: "merged-into-codex-comment-translator-preview",
  prerequisiteMergeCommit: "cb490fb2f9a9f5e218a054d84b6c3c5e5d102bd9",
  prerequisiteMergedAtUtc: "2026-06-05T02:20:23Z",
  approvalEvidenceSource: "current-thread-owner-approval",
  currentEvidenceStatus: "final-review-and-explicit-implementation-approved-for-separate-pr",
  ownerApprovalRole: "Product/Data/Security owner",
  finalReviewEvidence: [
    {
      area: "table-shape",
      approved: true,
      scope:
        "final table shape for youtube_oauth_credentials with owner binding, opaque credentialReferenceId, sanitized metadata, and no browser-readable OAuth token material"
    },
    {
      area: "rls-posture",
      approved: true,
      scope:
        "final RLS posture keeps browser clients away from token material and limits encrypted row access to trusted server-only runtime"
    },
    {
      area: "key-management",
      approved: true,
      scope:
        "key-management uses managed secret or KMS server-only handling, rotation, emergency disable, and no key or token value output"
    },
    {
      area: "rollback",
      approved: true,
      scope:
        "rollback keeps credential resolution disable, reviewed database rollback path, no token logging, and revoke or invalidate unusable credential references"
    }
  ],
  implementationApproval: {
    approved: true,
    scope:
      "separate implementation PR for remote Supabase apply or server-only token persistence runtime expansion after final review evidence"
  },
  clientReadableOutput: ["opaque non-secret credentialReferenceId", "sanitized credential status metadata"],
  forbiddenInThisSlice: youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck.forbiddenInThisSlice
} as const satisfies YouTubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidence;

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

export function assessYouTubeEncryptedTokenStoreSeparateMigrationReadiness(
  approvalEvidence: readonly YouTubeEncryptedTokenStoreApprovalEvidence[]
): YouTubeEncryptedTokenStoreSeparateMigrationReadinessResult {
  const approvedRoles = youtubeEncryptedTokenStoreApprovalRoles.filter((role) =>
    approvalEvidence.some((evidence) => evidence.role === role && evidence.approved)
  );
  const missingApprovalRoles = youtubeEncryptedTokenStoreApprovalRoles.filter(
    (role) => !approvedRoles.includes(role)
  );
  const missingScopeItems =
    missingApprovalRoles.length > 0 ? [] : collectMissingReadinessApprovalScopeItems(approvalEvidence);

  if (missingApprovalRoles.length > 0 || missingScopeItems.length > 0) {
    return {
      status: "blocked-missing-readiness-approval-evidence",
      missingApprovalRoles,
      missingScopeItems,
      migrationReadiness: "blocked",
      migrationImplementationAllowedInThisPr: false,
      nextAction: "collect-readiness-approval-evidence"
    };
  }

  return {
    status: "readiness-ready-for-separate-approved-migration-pr",
    approvedRoles,
    missingScopeItems: [],
    migrationReadiness: "ready-for-separate-approved-migration-pr",
    migrationImplementationAllowedInThisPr: false,
    finalMigrationImplementationApprovalRequired: true,
    nextAction: "draft-separate-approved-migration-pr-readiness-note"
  };
}

export function createYouTubeEncryptedTokenStoreSeparateMigrationReadinessSummary(): string {
  const readinessResult = assessYouTubeEncryptedTokenStoreSeparateMigrationReadiness(
    youtubeEncryptedTokenStoreSeparateMigrationReadiness.collectedApprovalEvidence
  );

  return [
    youtubeEncryptedTokenStoreSeparateMigrationReadiness.currentApprovalState,
    `Approved roles: ${youtubeEncryptedTokenStoreSeparateMigrationReadiness.collectedApprovalEvidence
      .map((evidence) => evidence.role)
      .join(", ")}.`,
    `Migration readiness: ${readinessResult.migrationReadiness}.`,
    `Safe live smoke: ${youtubeEncryptedTokenStoreSeparateMigrationReadiness.safeLiveSmoke.status}.`,
    "The actual migration remains separate."
  ].join(" ");
}

export function assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview(
  finalReviewEvidence: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationFinalReviewEvidence[],
  implementationApproval?: YouTubeEncryptedTokenStoreSeparateApprovedMigrationImplementationApprovalEvidence
): YouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewResult {
  const approvedReviewAreas = youtubeEncryptedTokenStoreSeparateApprovedMigrationReviewAreas.filter((area) =>
    finalReviewEvidence.some((evidence) => evidence.area === area && evidence.approved)
  );
  const missingReviewAreas = youtubeEncryptedTokenStoreSeparateApprovedMigrationReviewAreas.filter(
    (area) => !approvedReviewAreas.includes(area)
  );

  if (missingReviewAreas.length > 0) {
    return {
      status: "blocked-pending-final-review",
      missingReviewAreas,
      contractOnly: true,
      migrationImplementationAllowedInThisPr: false,
      nextAction: "collect-final-table-rls-key-management-review"
    };
  }

  if (!implementationApproval?.approved || !approvalScopeIncludes(implementationApproval.scope, "separate implementation PR")) {
    return {
      status: "blocked-pending-explicit-implementation-approval",
      approvedReviewAreas,
      missingImplementationApproval: true,
      contractOnly: true,
      migrationImplementationAllowedInThisPr: false,
      nextAction: "collect-explicit-implementation-approval-before-sql"
    };
  }

  return {
    status: "ready-for-separate-implementation-pr",
    approvedReviewAreas,
    implementationApprovalScope: implementationApproval.scope,
    contractOnly: true,
    migrationImplementationAllowedInThisPr: false,
    nextAction: "open-separate-sql-rls-token-persistence-implementation-pr"
  };
}

export function assessYouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck(
  finalReviewEvidence: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationFinalReviewEvidence[],
  implementationApproval?: YouTubeEncryptedTokenStoreSeparateApprovedMigrationImplementationApprovalEvidence
): YouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheckResult {
  const baseResult = assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview(
    finalReviewEvidence,
    implementationApproval
  );

  if (baseResult.status === "blocked-pending-final-review") {
    return {
      status: "blocked-pending-final-review",
      missingReviewAreas: baseResult.missingReviewAreas,
      explicitImplementationApproval: "not-evaluated-until-final-review-complete",
      remoteSupabaseApplyAllowedInThisPr: false,
      tokenPersistenceRuntimeAllowedInThisPr: false,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "record-blocker-summary-and-collect-final-review-evidence"
    };
  }

  if (baseResult.status === "blocked-pending-explicit-implementation-approval") {
    return {
      status: "blocked-pending-explicit-implementation-approval",
      approvedReviewAreas: baseResult.approvedReviewAreas,
      missingImplementationApproval: true,
      remoteSupabaseApplyAllowedInThisPr: false,
      tokenPersistenceRuntimeAllowedInThisPr: false,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "collect-explicit-implementation-approval-before-separate-runtime-or-apply-pr"
    };
  }

  return {
    status: "ready-for-separate-runtime-or-apply-pr",
    approvedReviewAreas: baseResult.approvedReviewAreas,
    implementationApprovalScope: baseResult.implementationApprovalScope,
    remoteSupabaseApplyAllowedInThisPr: false,
    tokenPersistenceRuntimeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "open-small-separate-server-only-runtime-or-apply-pr"
  };
}

export function assessYouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection(
  finalReviewEvidence: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationFinalReviewEvidence[],
  implementationApproval?: YouTubeEncryptedTokenStoreSeparateApprovedMigrationImplementationApprovalEvidence
): YouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollectionResult {
  const result = assessYouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck(
    finalReviewEvidence,
    implementationApproval
  );

  if (result.status === "blocked-pending-final-review") {
    return {
      ...result,
      nextAction: "record-evidence-requirements-and-collect-final-review-evidence"
    };
  }

  return result;
}

export function assessYouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate(
  finalReviewEvidence: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationFinalReviewEvidence[],
  implementationApproval?: YouTubeEncryptedTokenStoreSeparateApprovedMigrationImplementationApprovalEvidence
): YouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGateResult {
  const result = assessYouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck(
    finalReviewEvidence,
    implementationApproval
  );

  if (result.status === "blocked-pending-final-review") {
    return {
      ...result,
      nextAction: "record-blocker-summary-and-evidence-requirements"
    };
  }

  return result;
}

export function assessYouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck(
  finalReviewEvidence: readonly YouTubeEncryptedTokenStoreSeparateApprovedMigrationFinalReviewEvidence[],
  implementationApproval?: YouTubeEncryptedTokenStoreSeparateApprovedMigrationImplementationApprovalEvidence
): YouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheckResult {
  const result = assessYouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate(
    finalReviewEvidence,
    implementationApproval
  );

  if (result.status === "blocked-pending-final-review") {
    return {
      ...result,
      nextAction: "record-blocker-summary-and-collect-final-review-evidence"
    };
  }

  return result;
}

export function assessYouTubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidence(): YouTubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidenceResult {
  return assessYouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck(
    youtubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidence.finalReviewEvidence,
    youtubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidence.implementationApproval
  ) as YouTubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidenceResult;
}

export function createYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewSummary(): string {
  return [
    `Post review: PR ${youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate.postReviewPullRequest}.`,
    `Final implementation approval baseline: PR ${youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate.postFinalImplementationApprovalPullRequest}.`,
    `Latest approval evidence review: PR ${youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate.postImplementationApprovalEvidencePullRequest}.`,
    youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate.finalReviewStatus,
    `Table candidate: ${youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate.tableShape.tableName}.`,
    `RLS review: ${youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate.rlsPosture.status}.`,
    "Key review: managed secret or KMS with rotation and emergency disable.",
    `Rollback review: ${youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate.rollbackReview.status}.`,
    "Explicit implementation approval missing.",
    "This PR stays contract-only; migration implementation remains blocked."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceSummary(): string {
  return [
    `PR ${youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection.prerequisitePullRequest} evidence collection.`,
    "Status: blocked-pending-final-review.",
    "Required evidence: final table/RLS/key-management/rollback review.",
    "Explicit implementation approval missing.",
    "Remote apply, runtime expansion, and Google API live smoke stay out of this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceSummary(): string {
  return [
    `PR ${youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate.prerequisitePullRequest} final implementation approval evidence gate.`,
    "Status: blocked-pending-final-review.",
    "Required evidence: final table/RLS/key-management/rollback review.",
    "Explicit implementation approval missing.",
    "Remote apply, runtime expansion, and Google API live smoke stay out of this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheckSummary(): string {
  return [
    `PR ${youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck.prerequisitePullRequest} final approval evidence recheck.`,
    "Status: blocked-pending-final-review.",
    "Required evidence: final table/RLS/key-management/rollback review.",
    "Explicit implementation approval missing.",
    "Remote apply, runtime expansion, and Google API live smoke stay out of this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidenceSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidence();

  return [
    `PR ${youtubeEncryptedTokenStoreFinalReviewAndImplementationApprovalEvidence.prerequisitePullRequest} final review and explicit implementation approval evidence.`,
    `Status: ${result.status}.`,
    "Approved evidence: final table/RLS/key-management/rollback review.",
    "Explicit implementation approval: separate implementation PR for remote Supabase apply or server-only token persistence runtime expansion.",
    "Remote apply, runtime expansion, and Google API live smoke stay out of this evidence-recording PR."
  ].join(" ");
}

function collectMissingReadinessApprovalScopeItems(
  approvalEvidence: readonly YouTubeEncryptedTokenStoreApprovalEvidence[]
): YouTubeEncryptedTokenStoreMissingApprovalScopeItem[] {
  return youtubeEncryptedTokenStoreSeparateMigrationReadinessApprovalScopeRequirements.flatMap((requirement) => {
    const evidence = approvalEvidence.find((candidate) => candidate.role === requirement.role && candidate.approved);
    if (!evidence) {
      return [];
    }

    return requirement.requiredScopeItems
      .filter((item) => !approvalScopeIncludes(evidence.scope, item))
      .map((item) => ({
        role: requirement.role,
        item
      }));
  });
}

function approvalScopeIncludes(scope: string, item: string): boolean {
  return scope.toLocaleLowerCase().includes(item.toLocaleLowerCase());
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
