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

export type YouTubeEncryptedTokenStoreRemoteSupabaseApplyReadinessCheck = {
  id:
    | "preview-merge-state-verified"
    | "approval-gate-ready"
    | "server-runtime-expansion-merged"
    | "migration-file-reviewed"
    | "remote-target-identified-by-operator"
    | "apply-command-reviewed-not-run"
    | "rollback-plan-reviewed"
    | "post-apply-verification-plan-recorded"
    | "cloudflare-pages-noise-separated"
    | "human-remote-apply-approval-required";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeEncryptedTokenStoreRemoteSupabaseApplyReadiness = {
  implementationStage: "remote-supabase-migration-apply-readiness";
  selectedFollowUp: "remote-supabase-migration-apply-readiness-only";
  prerequisiteApprovalGate: {
    pullRequest: "#327";
    mergeCommit: "22c66bb8928e4594a9c732a12e22af63b4254bed";
    status: "ready-for-separate-runtime-or-apply-pr";
  };
  prerequisiteRuntimeExpansion: {
    pullRequest: "#328";
    mergeCommit: "62de91361a93633c314b03ab162cc0acf3c081b7";
    status: "merged-into-codex-comment-translator-preview";
  };
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql";
  requiredReadinessChecks: readonly YouTubeEncryptedTokenStoreRemoteSupabaseApplyReadinessCheck[];
  remoteSupabaseApply: "not-applied-readiness-only";
  serviceRoleSmoke: "out-of-scope-this-pr";
  googleApiLiveCall: "forbidden-in-this-pr";
  safeLiveYouTubeOAuthSmoke: "forbidden-in-this-pr";
  ownerAuthorization: "preserved-before-status-read";
  credentialResolutionDisable: "preserved";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  nextExternalAction: "request-explicit-human-remote-apply-run-approval-in-a-separate-step";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreRemoteSupabaseApplyReadinessResult =
  | {
      status: "blocked-missing-remote-apply-readiness-checks";
      missingCheckIds: readonly YouTubeEncryptedTokenStoreRemoteSupabaseApplyReadinessCheck["id"][];
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "record-readiness-blockers-without-remote-db-connection";
    }
  | {
      status: "readiness-recorded-remote-apply-blocked-pending-human-apply-approval";
      completedCheckIds: readonly YouTubeEncryptedTokenStoreRemoteSupabaseApplyReadinessCheck["id"][];
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "request-explicit-human-remote-apply-run-approval-in-a-separate-step";
    };

export type YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessCheck = {
  id:
    | "preview-merge-state-verified"
    | "remote-apply-readiness-merged"
    | "service-role-env-reference-names-recorded"
    | "missing-env-sanitized-state-recorded"
    | "credential-resolution-disable-preserved"
    | "owner-authorization-before-read-write-recorded"
    | "post-apply-verification-scope-recorded"
    | "remote-apply-confirmed-before-smoke"
    | "cloudflare-pages-noise-separated";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeEncryptedTokenStoreServiceRoleSmokeReadiness = {
  implementationStage: "safe-live-service-role-status-persistence-smoke-readiness";
  selectedFollowUp: "service-role-status-persistence-smoke-readiness-only";
  prerequisiteRemoteApplyReadiness: {
    pullRequest: "#329";
    mergeCommit: "c773a52155fafc2f1148c947745688eb89dd8d76";
    status: "not-applied-readiness-only";
  };
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql";
  requiredReadinessChecks: readonly YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessCheck[];
  remoteSupabaseApply: "forbidden-in-this-pr";
  actualServiceRoleSmoke: "not-run-readiness-only";
  postApplyPrerequisite: "blocked-pending-remote-apply";
  requiredEnvReferences: readonly ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  missingEnvState: "sanitized-unavailable-reconnect-required";
  credentialResolutionDisabledState: "credential-resolution-disabled";
  ownerAuthorization: "required-before-status-read-or-persistence-write";
  statusReadSmoke: "sanitized-status-only-after-remote-apply-confirmed";
  persistenceWriteSmoke: "sanitized-reference-only-after-remote-apply-confirmed";
  googleApiLiveCall: "forbidden-in-this-pr";
  safeLiveYouTubeOAuthSmoke: "forbidden-in-this-pr";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  nextExternalAction: "wait-for-remote-apply-confirmation-before-safe-live-service-role-smoke";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessResult =
  | {
      status: "blocked-missing-service-role-smoke-readiness-checks";
      missingCheckIds: readonly YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessCheck["id"][];
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "record-service-role-smoke-readiness-blockers-without-remote-db-connection";
    }
  | {
      status: "blocked-pending-remote-apply";
      completedCheckIds: readonly YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessCheck["id"][];
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "wait-for-remote-apply-confirmation-before-safe-live-service-role-smoke";
    };

export type YouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateInput = {
  remoteApplyConfirmed: boolean;
  supabaseUrlEnvReferencePresent: boolean;
  serviceRoleKeyEnvReferencePresent: boolean;
  finalOperatorConfirmationForServiceRoleSmoke: boolean;
  ownerAuthorizationConfirmed: boolean;
  credentialResolutionBoundaryReviewed: boolean;
  serviceRoleSmokeExecuted: boolean;
  googleApiLiveSmokeRequested: boolean;
  requiresSecretOrTokenValue: boolean;
};

export type YouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateContract = {
  implementationStage: "post-remote-apply-service-role-smoke-gate";
  selectedFollowUp: "service-role-smoke-gate-after-youtube-remote-apply";
  prerequisiteYouTubeOAuthCredentialsRemoteApplyRun: {
    pullRequest: "#342";
    mergeCommit: "9102011f3b11ffb03f7ee92314d99a5af219d20a";
    previousPreviewHead: "dff517199f099488a43d67f7e31cc775b1b913f6";
    status: "remote-applied-youtube-oauth-credentials-migration-confirmed";
  };
  migrationHistoryState: "account-preferences-and-youtube-migrations-local-remote-present";
  dryRunState: "remote-database-up-to-date-no-pending-migrations";
  threadApproval: "not-recorded-for-service-role-smoke-execution";
  envReferencePresence: "missing-in-codex-process";
  requiredEnvReferences: readonly ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  remoteSupabaseApply: "forbidden-in-this-pr";
  actualServiceRoleSmoke: "not-run-blocked-pending-env-and-final-operator-confirmation";
  serviceRoleSmokeScope: "bounded-status-read-and-persistence-write-smoke-only-after-final-confirmation";
  ownerAuthorization: "required-before-status-read-or-persistence-write";
  credentialResolutionDisabledState: "credential-resolution-disabled-boundary-preserved";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  googleApiLiveCall: "forbidden-in-this-pr";
  safeLiveYouTubeOAuthSmoke: "forbidden-in-this-pr";
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  nextAction: "request-env-reference-presence-and-fresh-final-operator-confirmation-before-service-role-smoke";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateAssessment =
  | {
      status: "blocked-secret-required-for-service-role-smoke-gate";
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      serviceRoleSmokeExecuted: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "record-secret-required-blocker-without-requesting-secret-values";
    }
  | {
      status: "blocked-pending-remote-apply-confirmation";
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      serviceRoleSmokeExecuted: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "wait-for-youtube-oauth-credentials-remote-apply-confirmation";
    }
  | {
      status: "blocked-google-api-live-smoke-out-of-scope";
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      serviceRoleSmokeExecuted: boolean;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "split-google-api-live-smoke-into-a-separate-pr";
    }
  | {
      status: "blocked-pending-service-role-smoke-env-and-final-operator-confirmation";
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      serviceRoleSmokeExecuted: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "request-env-reference-presence-and-fresh-final-operator-confirmation-before-service-role-smoke";
    }
  | {
      status: "blocked-pending-owner-authorization-or-credential-boundary-review";
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      serviceRoleSmokeExecuted: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "confirm-owner-authorization-and-credential-resolution-boundary-before-smoke";
    }
  | {
      status: "ready-for-service-role-smoke-execution-command-only";
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: true;
      serviceRoleSmokeExecuted: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "run-bounded-service-role-status-persistence-smoke-only-after-final-confirmation";
    };

export type YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffCheck = {
  id:
    | "preview-merge-state-verified"
    | "service-role-smoke-readiness-merged"
    | "remote-apply-readiness-not-applied-confirmed"
    | "remote-target-selection-required"
    | "explicit-human-run-approval-required"
    | "apply-execution-command-boundary-recorded"
    | "env-reference-names-recorded"
    | "missing-env-sanitized-state-recorded"
    | "credential-resolution-disable-preserved"
    | "owner-authorization-before-post-apply-smoke-recorded"
    | "rollback-abort-conditions-recorded"
    | "dashboard-log-unverified-scope-recorded"
    | "cloudflare-pages-noise-separated";
  status: "recorded" | "blocking-external-action";
  evidence: string;
};

export type YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoff = {
  implementationStage: "human-approved-remote-supabase-migration-apply-execution-handoff";
  selectedFollowUp: "remote-supabase-migration-apply-execution-handoff-only";
  prerequisiteServiceRoleSmokeReadiness: {
    pullRequest: "#330";
    mergeCommit: "70ff213bd203ee979336d059253999ea2ce33565";
    status: "blocked-pending-remote-apply";
  };
  prerequisiteRemoteApplyReadiness: {
    pullRequest: "#329";
    mergeCommit: "c773a52155fafc2f1148c947745688eb89dd8d76";
    status: "not-applied-readiness-only";
  };
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql";
  remoteTarget: "required-opaque-project-target-reference";
  explicitHumanRunApproval: "required-before-any-remote-db-mutation";
  requiredReadinessChecks: readonly YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffCheck[];
  remoteSupabaseApply: "not-run-pending-explicit-human-target-and-run-approval";
  actualServiceRoleSmoke: "out-of-scope-this-pr";
  postApplyPrerequisite: "remote-apply-confirmation-required-before-service-role-smoke";
  requiredEnvReferences: readonly ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  missingEnvState: "sanitized-unavailable-reconnect-required";
  credentialResolutionDisabledState: "credential-resolution-disabled";
  ownerAuthorization: "required-before-post-apply-status-read-or-persistence-write";
  googleApiLiveCall: "forbidden-in-this-pr";
  safeLiveYouTubeOAuthSmoke: "forbidden-in-this-pr";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  dashboardLogUnverifiedScope: readonly string[];
  nextExternalAction: "handoff-apply-run-checklist-without-connecting-to-remote-db";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffResult =
  | {
      status: "blocked-missing-remote-apply-execution-handoff-checks";
      missingCheckIds: readonly YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffCheck["id"][];
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "record-apply-execution-handoff-blockers-without-remote-db-connection";
    }
  | {
      status: "blocked-pending-explicit-human-remote-apply-target-and-run-approval";
      completedCheckIds: readonly YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffCheck["id"][];
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      googleApiLiveSmokeAllowedInThisPr: false;
      nextAction: "handoff-apply-run-checklist-without-connecting-to-remote-db";
    };

export type YouTubeEncryptedTokenStoreRemoteApplyRunDecision = {
  explicitHumanRunApproval: boolean;
  safeConcreteRemoteTargetConfirmed: boolean;
  migrationDiffMatchesReviewedFile: boolean;
  credentialResolutionDisabledBeforeApply: boolean;
};

export type YouTubeEncryptedTokenStoreRemoteApplyRunContract = {
  implementationStage: "remote-supabase-migration-apply-run-target-blocker";
  selectedFollowUp: "remote-supabase-migration-apply-run-only";
  prerequisiteRemoteApplyExecutionHandoff: {
    pullRequest: "#331";
    mergeCommit: "42f03817563f047e3703be27d9b9cc6c92654305";
    headCommit: "ed22885d01e481ac7432fd9a77d4bbcbfe3f4e30";
    status: "blocked-pending-explicit-human-remote-apply-target-and-run-approval";
  };
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql";
  threadApproval: "explicit-human-remote-apply-run-approval-recorded";
  safeConcreteRemoteTarget: "not-confirmed-no-repo-supabase-cli-target-metadata";
  targetDiscoveryEvidence: readonly [
    "supabase/config.toml missing",
    ".supabase link metadata missing",
    "no repo-local non-secret project target metadata found"
  ];
  approvalScope: "apply-reviewed-youtube-oauth-credentials-migration-only";
  migrationDiff: "reviewed-file-only";
  remoteSupabaseApply: "not-run-blocked-pending-safe-concrete-remote-target";
  applyCommand: "not-run";
  actualServiceRoleSmoke: "out-of-scope-separate-pr";
  postApplyVerification: "schema-and-rls-presence-only-if-apply-runs";
  credentialResolutionDisabledState: "credential-resolution-disabled-before-apply-required";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  nextAction: "record-target-blocker-without-running-remote-apply";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreRemoteApplyRunAssessment =
  | {
      status: "blocked-pending-human-remote-apply-run-approval";
      remoteSupabaseApplyAllowed: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-approval-blocker-without-running-remote-apply";
    }
  | {
      status: "blocked-pending-safe-concrete-remote-target";
      remoteSupabaseApplyAllowed: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-target-blocker-without-running-remote-apply";
    }
  | {
      status: "blocked-pending-reviewed-apply-preconditions";
      remoteSupabaseApplyAllowed: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-apply-precondition-blocker-without-running-remote-apply";
    }
  | {
      status: "ready-for-remote-apply-command-only";
      remoteSupabaseApplyAllowed: true;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "run-reviewed-migration-apply-command-only-after-final-operator-confirmation";
    };

export type YouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationInput = {
  supabaseConfigTomlPresent: boolean;
  supabaseCliLinkMetadataPresent: boolean;
  nonSecretProjectReferenceUnique: boolean;
  multipleTargetCandidates: boolean;
  requiresSecretOrTokenValue: boolean;
};

export type YouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract = {
  implementationStage: "safe-concrete-remote-supabase-target-metadata-confirmation";
  selectedFollowUp: "remote-target-metadata-confirmation-only";
  prerequisiteRemoteApplyTargetBlocker: {
    pullRequest: "#332";
    mergeCommit: "85998d2265eaa6348a265241f13799bfbc46759e";
    headCommit: "7ed1c5de42f73a3e403d30605e23f9b6f5a81577";
    status: "not-run-blocked-pending-safe-concrete-remote-target";
  };
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql";
  repoLocalTargetMetadata: "not-confirmed-no-repo-supabase-cli-target-metadata";
  targetConfirmation: "blocked-missing-repo-local-non-secret-target-metadata";
  targetDiscoveryEvidence: readonly [
    "supabase/config.toml missing",
    ".supabase link metadata missing",
    "no repo-local non-secret project target metadata found"
  ];
  allowedTargetMetadataSources: readonly ["supabase/config.toml", "Supabase CLI link metadata in .supabase"];
  rejectedTargetSources: readonly string[];
  remoteSupabaseApply: "not-run-target-confirmation-only";
  applyCommandOnlyNextCondition: "separate-pr-after-safe-concrete-target-is-confirmed";
  actualServiceRoleSmoke: "out-of-scope-separate-pr";
  credentialResolutionDisabledState: "credential-resolution-disabled-before-apply-required";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  nextAction: "record-target-metadata-blocker-without-running-remote-apply";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationAssessment =
  | {
      status: "blocked-missing-repo-local-target-metadata";
      remoteTargetConfirmed: false;
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-target-metadata-blocker-without-running-remote-apply";
    }
  | {
      status: "blocked-ambiguous-remote-target";
      remoteTargetConfirmed: false;
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-ambiguous-target-blocker-without-running-remote-apply";
    }
  | {
      status: "blocked-secret-required-for-target-confirmation";
      remoteTargetConfirmed: false;
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-secret-required-blocker-without-requesting-secret-values";
    }
  | {
      status: "ready-for-separate-apply-command-pr";
      remoteTargetConfirmed: true;
      remoteSupabaseApplyAllowedInThisPr: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-target-confirmed-readiness-and-open-separate-apply-command-pr";
    };

export type YouTubeEncryptedTokenStoreRemoteApplyCommandGateInput = {
  supabaseCliLocalLinkMetadataPresent: boolean;
  nonSecretProjectReferenceUnique: boolean;
  metadataIgnoredAndNotCommitted: boolean;
  migrationDiffMatchesReviewedFile: boolean;
  credentialResolutionDisabledBeforeApply: boolean;
  finalOperatorConfirmation: boolean;
};

export type YouTubeEncryptedTokenStoreRemoteApplyCommandGateContract = {
  implementationStage: "remote-supabase-apply-command-only-gate";
  selectedFollowUp: "remote-apply-command-gate-without-actual-apply";
  prerequisiteRemoteTargetMetadataConfirmation: {
    pullRequest: "#333";
    mergeCommit: "ebe6b1baccaf18459d7e606f5d3d7150641dea71";
    headCommit: "ff8c15aef43b39109a7c37327cd30331d635e54d";
    status: "not-run-target-confirmation-only";
  };
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql";
  operatorLocalTargetMetadata: "confirmed-from-supabase-cli-local-link-metadata";
  targetDiscoveryEvidence: readonly [
    "supabase/.temp/project-ref present",
    "supabase/.temp/linked-project.json present",
    "project reference is a single non-secret 20-character project ref",
    "supabase/.temp/ is ignored and not committed"
  ];
  allowedTargetMetadataSources: readonly ["supabase/config.toml", "Supabase CLI local link metadata in supabase/.temp"];
  rejectedTargetSources: readonly string[];
  remoteSupabaseApply: "not-run-pending-final-operator-confirmation";
  applyCommandOnlyGate: "ready-after-final-operator-confirmation";
  actualServiceRoleSmoke: "out-of-scope-separate-pr";
  credentialResolutionDisabledState: "credential-resolution-disabled-before-apply-required";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  nextAction: "record-apply-command-gate-without-running-remote-apply";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreRemoteApplyCommandGateAssessment =
  | {
      status:
        | "blocked-missing-or-uncommitted-link-metadata"
        | "blocked-ambiguous-remote-target"
        | "blocked-pending-reviewed-apply-preconditions";
      remoteTargetConfirmed: false;
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-command-gate-blocker-without-running-remote-apply";
    }
  | {
      status: "ready-for-final-operator-confirmation-before-apply-command";
      remoteTargetConfirmed: true;
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-apply-command-gate-without-running-remote-apply";
    }
  | {
      status: "ready-for-remote-apply-command-only";
      remoteTargetConfirmed: true;
      remoteSupabaseApplyAllowedInThisPr: true;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "run-reviewed-migration-apply-command-only";
    };

export type YouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateInput = {
  applyCommandGateReady: boolean;
  pendingMigrationNames: readonly string[];
  reviewedMigrationName: string;
};

export type YouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateContract = {
  implementationStage: "remote-supabase-apply-dry-run-single-reviewed-migration-gate";
  selectedFollowUp: "dry-run-blocker-summary-only";
  prerequisiteRemoteApplyCommandGate: {
    pullRequest: "#334";
    mergeCommit: "cc3b95e59efbe028075e210e3b8ae405b75e2806";
    headCommit: "8a4ae6aeac6f35f5877585a95e5c7bb1c09b905d";
    status: "not-run-pending-final-operator-confirmation";
  };
  prerequisiteDryRunBlockerRecord: {
    pullRequest: "#337";
    mergeCommit: "ffb1337011a15df635b7f830c6a2704a0b927b39";
    headCommit: "55a79ff684ad7a629d686a05dc111e77ce5e74a5";
    status: "not-run-blocked-pending-single-reviewed-migration-only";
  };
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql";
  reviewedMigrationName: "20260601000000_youtube_oauth_credentials.sql";
  dryRunCommand: "npx supabase db push --linked --dry-run";
  pendingMigrationEvidence: readonly [
    "20260527000000_account_preferences_foundation.sql pending in linked remote migration history",
    "20260601000000_youtube_oauth_credentials.sql pending in linked remote migration history",
    "linked remote migration history is missing the account/preferences foundation baseline",
    "single reviewed migration only is not satisfied"
  ];
  exactBlockingMigration: "20260527000000_account_preferences_foundation.sql";
  remoteMigrationHistoryStatus: "linked-remote-history-missing-reviewed-baseline";
  remoteSupabaseApply: "not-run-blocked-pending-single-reviewed-migration-only";
  actualServiceRoleSmoke: "out-of-scope-separate-pr";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  nextAction: "record-dry-run-blocker-without-running-remote-apply";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateAssessment =
  | {
      status: "blocked-pending-apply-command-gate";
      blockingPendingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-apply-command-gate-blocker-without-running-remote-apply";
    }
  | {
      status: "blocked-pending-single-reviewed-migration-only";
      blockingPendingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-dry-run-blocker-without-running-remote-apply";
    }
  | {
      status: "ready-for-reviewed-migration-apply-command-only";
      blockingPendingMigrationNames: readonly [];
      remoteSupabaseApplyAllowedInThisPr: true;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "run-reviewed-migration-apply-command-only";
    };

export type YouTubeEncryptedTokenStoreRemoteBaselineMismatchGateInput = {
  pendingMigrationNames: readonly string[];
  reviewedTargetMigrationName: string;
  accountPreferencesBaselineResolved: boolean;
  safeResolutionPathSelected: boolean;
  finalOperatorConfirmation: boolean;
  requiresSecretOrTokenValue: boolean;
};

export type YouTubeEncryptedTokenStoreRemoteBaselineMismatchGateContract = {
  implementationStage: "linked-remote-migration-history-baseline-mismatch-gate";
  selectedFollowUp: "baseline-mismatch-resolution-gate-only";
  prerequisiteDryRunSingleMigrationGate: {
    pullRequest: "#338";
    mergeCommit: "eddc49f573dcb98320dfa4ee337de2a1ac34b07c";
    previousPreviewHead: "ffb1337011a15df635b7f830c6a2704a0b927b39";
    status: "not-run-blocked-pending-single-reviewed-migration-only";
  };
  accountPreferencesFoundationMigration: "20260527000000_account_preferences_foundation.sql";
  reviewedTargetMigration: "20260601000000_youtube_oauth_credentials.sql";
  remoteHistoryDiagnosis: "linked-remote-missing-account-preferences-foundation-baseline";
  remoteSupabaseApply: "not-run-blocked-pending-linked-remote-baseline-resolution";
  baselineRemoteMutation: "not-run-requires-separate-reviewed-baseline-pr-or-target-reselection";
  safeResolutionPaths: readonly [
    "separate-reviewed-account-preferences-foundation-baseline-pr-before-youtube-apply",
    "separate-reviewed-migration-history-repair-only-if-account-preferences-schema-already-exists",
    "select-different-linked-target-with-account-preferences-baseline-already-applied"
  ];
  actualServiceRoleSmoke: "out-of-scope-separate-pr";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  nextAction: "record-baseline-mismatch-blocker-without-remote-db-mutation";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreRemoteBaselineMismatchGateAssessment =
  | {
      status: "blocked-secret-required-for-baseline-resolution";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-secret-required-blocker-without-requesting-secret-values";
    }
  | {
      status: "blocked-pending-linked-remote-baseline-resolution";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-baseline-mismatch-blocker-without-remote-db-mutation";
    }
  | {
      status: "ready-for-fresh-final-operator-confirmation-before-youtube-apply";
      blockingMigrationNames: readonly [];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "recheck-single-reviewed-migration-and-request-fresh-final-operator-confirmation";
    }
  | {
      status: "ready-for-reviewed-youtube-apply-command-only";
      blockingMigrationNames: readonly [];
      remoteSupabaseApplyAllowedInThisPr: true;
      remoteSupabaseApplyExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "run-reviewed-youtube-migration-apply-command-only";
    };

export type YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionPath =
  | "none-selected"
  | "account-preferences-foundation-baseline-apply"
  | "account-preferences-migration-history-repair"
  | "different-linked-target-reselection";

export type YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateInput = {
  pendingMigrationNames: readonly string[];
  accountPreferencesMigrationName: string;
  reviewedTargetMigrationName: string;
  selectedResolutionPath: YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionPath;
  accountPreferencesRemoteSchemaVerified: boolean;
  dryRunShowsOnlyReviewedTargetAfterResolution: boolean;
  finalOperatorConfirmationForSelectedRemoteMutation: boolean;
  requiresSecretOrTokenValue: boolean;
};

export type YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateContract = {
  implementationStage: "account-preferences-baseline-resolution-gate";
  selectedFollowUp: "safe-baseline-resolution-path-gate-only";
  prerequisiteBaselineMismatchGate: {
    pullRequest: "#339";
    mergeCommit: "a334f3f4eded06ed4e44f27a1658e1d3f6de0a05";
    previousPreviewHead: "eddc49f573dcb98320dfa4ee337de2a1ac34b07c";
    status: "not-run-blocked-pending-linked-remote-baseline-resolution";
  };
  threadApproval: "conditional-human-approval-not-sufficient-for-ambiguous-remote-mutation";
  accountPreferencesFoundationMigration: "20260527000000_account_preferences_foundation.sql";
  reviewedTargetMigration: "20260601000000_youtube_oauth_credentials.sql";
  dryRunEvidence: "account-preferences-and-youtube-migrations-still-pending";
  migrationListEvidence: "account-preferences-and-youtube-migrations-remote-blank";
  separateRemoteMutationPaths: readonly [
    "account-preferences-foundation-baseline-apply",
    "account-preferences-migration-history-repair",
    "different-linked-target-reselection"
  ];
  remoteSupabaseApply: "not-run-blocked-pending-safe-baseline-resolution-path";
  migrationHistoryRepair: "not-run-blocked-pending-confirmed-existing-schema-and-fresh-approval";
  youtubeRemoteApply: "not-run-blocked-pending-single-reviewed-migration-only";
  actualServiceRoleSmoke: "out-of-scope-separate-pr";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  nextAction: "record-baseline-resolution-path-blocker-without-remote-db-mutation";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateAssessment =
  | {
      status: "blocked-secret-required-for-baseline-resolution";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-secret-required-blocker-without-requesting-secret-values";
    }
  | {
      status: "blocked-pending-safe-baseline-resolution-path";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-baseline-resolution-path-blocker-without-remote-db-mutation";
    }
  | {
      status: "blocked-pending-remote-schema-existence-confirmation-before-repair";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "confirm-account-preferences-schema-before-migration-history-repair";
    }
  | {
      status: "blocked-pending-different-linked-target-with-baseline-applied";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "select-one-linked-target-then-recheck-dry-run-single-reviewed-migration";
    }
  | {
      status: "blocked-pending-fresh-final-operator-confirmation-for-selected-baseline-resolution";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "request-fresh-final-operator-confirmation-for-one-selected-remote-mutation";
    }
  | {
      status: "ready-for-account-preferences-baseline-apply-command-only";
      blockingMigrationNames: readonly [];
      remoteSupabaseApplyAllowedInThisPr: true;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "run-account-preferences-baseline-apply-command-only";
    }
  | {
      status: "ready-for-account-preferences-migration-history-repair-command-only";
      blockingMigrationNames: readonly [];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: true;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "run-account-preferences-migration-history-repair-command-only";
    }
  | {
      status: "ready-for-youtube-single-reviewed-migration-recheck-after-baseline-resolution";
      blockingMigrationNames: readonly [];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "recheck-youtube-dry-run-single-reviewed-migration-before-fresh-apply-confirmation";
    };

export type YouTubeEncryptedTokenStoreAccountPreferencesBaselineApplyRunInput = {
  accountPreferencesBaselineApplied: boolean;
  pendingMigrationNamesAfterApply: readonly string[];
  reviewedTargetMigrationName: string;
  finalOperatorConfirmationForYoutubeApply: boolean;
  requiresSecretOrTokenValue: boolean;
};

export type YouTubeEncryptedTokenStoreAccountPreferencesBaselineApplyRunContract = {
  implementationStage: "account-preferences-foundation-baseline-apply-run";
  selectedResolutionPath: "account-preferences-foundation-baseline-apply";
  prerequisiteBaselineResolutionGate: {
    pullRequest: "#340";
    mergeCommit: "781cc7a361ee02047632a678c2f0861c5961f257";
    previousPreviewHead: "a334f3f4eded06ed4e44f27a1658e1d3f6de0a05";
    status: "not-run-blocked-pending-safe-baseline-resolution-path";
  };
  threadApproval: "explicit-human-account-preferences-baseline-apply-approval-recorded";
  accountPreferencesFoundationMigration: "20260527000000_account_preferences_foundation.sql";
  reviewedTargetMigration: "20260601000000_youtube_oauth_credentials.sql";
  preApplyDryRun: "single-account-preferences-foundation-migration-only";
  remoteSupabaseApply: "applied-account-preferences-foundation-baseline-only";
  applyResultNote: "existing-account-preferences-relations-skipped-by-if-not-exists-and-migration-history-recorded";
  postApplyMigrationList: "account-preferences-remote-present-youtube-remote-blank";
  postApplyDryRun: "single-reviewed-youtube-migration-only";
  youtubeRemoteApply: "not-run-pending-fresh-final-operator-confirmation";
  migrationHistoryRepair: "not-run-not-needed-for-account-preferences-baseline";
  actualServiceRoleSmoke: "out-of-scope-separate-pr";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  nextAction: "request-fresh-final-operator-confirmation-for-youtube-apply-command-only";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreAccountPreferencesBaselineApplyRunAssessment =
  | {
      status: "blocked-secret-required-for-post-baseline-apply";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: true;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-secret-required-blocker-without-requesting-secret-values";
    }
  | {
      status: "blocked-account-preferences-baseline-not-applied";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "do-not-run-youtube-apply-until-baseline-apply-is-confirmed";
    }
  | {
      status: "blocked-post-apply-dry-run-not-single-reviewed-youtube-migration-only";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: true;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "record-post-baseline-apply-dry-run-blocker";
    }
  | {
      status: "ready-for-fresh-final-operator-confirmation-before-youtube-apply";
      blockingMigrationNames: readonly [];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: true;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "request-fresh-final-operator-confirmation-for-youtube-apply-command-only";
    }
  | {
      status: "ready-for-reviewed-youtube-apply-command-only";
      blockingMigrationNames: readonly [];
      remoteSupabaseApplyAllowedInThisPr: true;
      remoteSupabaseApplyExecuted: true;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      nextAction: "run-reviewed-youtube-migration-apply-command-only";
    };

export type YouTubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRunInput = {
  youtubeOAuthCredentialsMigrationRemoteApplied: boolean;
  postApplyPendingMigrationNames: readonly string[];
  reviewedTargetMigrationName: string;
  credentialResolutionDisabledMaintained: boolean;
  serviceRoleSmokeExecuted: boolean;
  requiresSecretOrTokenValue: boolean;
};

export type YouTubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRunContract = {
  implementationStage: "youtube-oauth-credentials-remote-apply-run";
  selectedFollowUp: "youtube-oauth-credentials-apply-confirmation-only";
  prerequisiteAccountPreferencesBaselineApplyRun: {
    pullRequest: "#341";
    mergeCommit: "dff517199f099488a43d67f7e31cc775b1b913f6";
    previousPreviewHead: "781cc7a361ee02047632a678c2f0861c5961f257";
    status: "applied-account-preferences-foundation-baseline-only";
  };
  threadApproval: "explicit-human-youtube-oauth-credentials-apply-approval-recorded";
  accountPreferencesFoundationMigration: "20260527000000_account_preferences_foundation.sql";
  reviewedTargetMigration: "20260601000000_youtube_oauth_credentials.sql";
  preApplyMigrationList: "account-preferences-remote-present-youtube-remote-blank";
  preApplyDryRunCodexAttempt: "blocked-db-auth-env-missing-before-pending-list-confirmation";
  operatorLocalDryRunEvidence: "remote-database-up-to-date";
  remoteSupabaseApply: "remote-applied-youtube-oauth-credentials-migration-confirmed";
  applyCommandExecution: "not-executed-by-codex-process-db-password-unavailable";
  postApplyMigrationList: "account-preferences-and-youtube-migrations-local-remote-present";
  postApplyDryRun: "remote-database-up-to-date-no-pending-migrations";
  migrationHistoryRepair: "not-run-not-needed";
  actualServiceRoleSmoke: "out-of-scope-separate-pr";
  clientReadableOutput: readonly ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"];
  secretHandling: "env-reference-names-only-no-values";
  browserStorage: "unchanged";
  rollbackAbortConditions: readonly string[];
  nextAction: "open-separate-service-role-smoke-readiness-or-execution-pr";
  forbiddenInThisSlice: readonly string[];
};

export type YouTubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRunAssessment =
  | {
      status: "blocked-secret-required-for-youtube-remote-apply-confirmation";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      serviceRoleSmokeExecuted: false;
      nextAction: "record-secret-required-blocker-without-requesting-secret-values";
    }
  | {
      status: "blocked-youtube-oauth-credentials-migration-not-confirmed-applied";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: false;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      serviceRoleSmokeExecuted: false;
      nextAction: "record-youtube-apply-confirmation-blocker-without-service-role-smoke";
    }
  | {
      status:
        | "blocked-post-youtube-apply-dry-run-still-pending"
        | "blocked-credential-resolution-disable-not-maintained"
        | "blocked-service-role-smoke-mixed-into-apply-pr";
      blockingMigrationNames: readonly string[];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: true;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      serviceRoleSmokeExecuted: boolean;
      nextAction: "record-post-youtube-apply-boundary-blocker";
    }
  | {
      status: "ready-for-separate-service-role-smoke-pr";
      blockingMigrationNames: readonly [];
      remoteSupabaseApplyAllowedInThisPr: false;
      remoteSupabaseApplyExecuted: true;
      migrationHistoryRepairAllowedInThisPr: false;
      migrationHistoryRepairExecuted: false;
      serviceRoleSmokeAllowedInThisPr: false;
      serviceRoleSmokeExecuted: false;
      nextAction: "open-separate-service-role-smoke-readiness-or-execution-pr";
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

export const youtubeEncryptedTokenStoreRemoteSupabaseApplyReadiness = {
  implementationStage: "remote-supabase-migration-apply-readiness",
  selectedFollowUp: "remote-supabase-migration-apply-readiness-only",
  prerequisiteApprovalGate: {
    pullRequest: "#327",
    mergeCommit: "22c66bb8928e4594a9c732a12e22af63b4254bed",
    status: "ready-for-separate-runtime-or-apply-pr"
  },
  prerequisiteRuntimeExpansion: {
    pullRequest: "#328",
    mergeCommit: "62de91361a93633c314b03ab162cc0acf3c081b7",
    status: "merged-into-codex-comment-translator-preview"
  },
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  requiredReadinessChecks: [
    {
      id: "preview-merge-state-verified",
      status: "recorded",
      evidence: "origin/codex/comment-translator-preview is at PR #328 merge commit 62de91361a93633c314b03ab162cc0acf3c081b7."
    },
    {
      id: "approval-gate-ready",
      status: "recorded",
      evidence: "PR #327 final review and explicit implementation approval status is ready-for-separate-runtime-or-apply-pr."
    },
    {
      id: "server-runtime-expansion-merged",
      status: "recorded",
      evidence: "PR #328 server-only persistence runtime expansion is merged before remote apply readiness."
    },
    {
      id: "migration-file-reviewed",
      status: "recorded",
      evidence: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql remains the reviewed migration candidate."
    },
    {
      id: "remote-target-identified-by-operator",
      status: "blocking-external-action",
      evidence: "The remote Supabase project target must be selected by the operator without printing service-role or managed secret values."
    },
    {
      id: "apply-command-reviewed-not-run",
      status: "recorded",
      evidence: "This readiness PR records the apply command boundary but does not run a remote Supabase DB mutation."
    },
    {
      id: "rollback-plan-reviewed",
      status: "recorded",
      evidence: "Credential resolution disable, reviewed database rollback, no token logging, and revoke/invalidate unusable references remain the rollback boundary."
    },
    {
      id: "post-apply-verification-plan-recorded",
      status: "recorded",
      evidence: "Post-apply checks are schema/RLS presence and sanitized service-role status/persistence smoke in a separate step."
    },
    {
      id: "cloudflare-pages-noise-separated",
      status: "recorded",
      evidence: "Cloudflare Pages failure remains known Pages disconnect noise; Workers Builds and local verification remain the actionable signals."
    },
    {
      id: "human-remote-apply-approval-required",
      status: "blocking-external-action",
      evidence: "Remote Supabase apply is an external DB mutation and requires explicit human run approval outside this readiness PR."
    }
  ],
  remoteSupabaseApply: "not-applied-readiness-only",
  serviceRoleSmoke: "out-of-scope-this-pr",
  googleApiLiveCall: "forbidden-in-this-pr",
  safeLiveYouTubeOAuthSmoke: "forbidden-in-this-pr",
  ownerAuthorization: "preserved-before-status-read",
  credentialResolutionDisable: "preserved",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  nextExternalAction: "request-explicit-human-remote-apply-run-approval-in-a-separate-step",
  forbiddenInThisSlice: [
    "remote Supabase DB migration apply",
    "safe live service-role status or persistence smoke",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreRemoteSupabaseApplyReadiness;

export const youtubeEncryptedTokenStoreServiceRoleSmokeReadiness = {
  implementationStage: "safe-live-service-role-status-persistence-smoke-readiness",
  selectedFollowUp: "service-role-status-persistence-smoke-readiness-only",
  prerequisiteRemoteApplyReadiness: {
    pullRequest: "#329",
    mergeCommit: "c773a52155fafc2f1148c947745688eb89dd8d76",
    status: "not-applied-readiness-only"
  },
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  requiredReadinessChecks: [
    {
      id: "preview-merge-state-verified",
      status: "recorded",
      evidence: "origin/codex/comment-translator-preview includes PR #329 merge commit c773a52155fafc2f1148c947745688eb89dd8d76."
    },
    {
      id: "remote-apply-readiness-merged",
      status: "recorded",
      evidence: "PR #329 recorded remote Supabase apply readiness as not-applied-readiness-only."
    },
    {
      id: "service-role-env-reference-names-recorded",
      status: "recorded",
      evidence: "Only NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY reference names are recorded; values are not requested or printed."
    },
    {
      id: "missing-env-sanitized-state-recorded",
      status: "recorded",
      evidence: "Missing env references map to sanitized unavailable/reconnect-required status metadata."
    },
    {
      id: "credential-resolution-disable-preserved",
      status: "recorded",
      evidence: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED remains the emergency credential-resolution-disabled state."
    },
    {
      id: "owner-authorization-before-read-write-recorded",
      status: "recorded",
      evidence: "Owner authorization is required before any trusted service-role status read or persistence write smoke."
    },
    {
      id: "post-apply-verification-scope-recorded",
      status: "recorded",
      evidence: "The smoke scope is limited to sanitized status metadata and opaque credentialReferenceId persistence verification after apply."
    },
    {
      id: "remote-apply-confirmed-before-smoke",
      status: "blocking-external-action",
      evidence: "Safe live service-role smoke can run only after remote Supabase migration apply is confirmed by the operator."
    },
    {
      id: "cloudflare-pages-noise-separated",
      status: "recorded",
      evidence: "Cloudflare Pages failure remains known Pages disconnect noise; Workers Builds and local verification remain the actionable signals."
    }
  ],
  remoteSupabaseApply: "forbidden-in-this-pr",
  actualServiceRoleSmoke: "not-run-readiness-only",
  postApplyPrerequisite: "blocked-pending-remote-apply",
  requiredEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  missingEnvState: "sanitized-unavailable-reconnect-required",
  credentialResolutionDisabledState: "credential-resolution-disabled",
  ownerAuthorization: "required-before-status-read-or-persistence-write",
  statusReadSmoke: "sanitized-status-only-after-remote-apply-confirmed",
  persistenceWriteSmoke: "sanitized-reference-only-after-remote-apply-confirmed",
  googleApiLiveCall: "forbidden-in-this-pr",
  safeLiveYouTubeOAuthSmoke: "forbidden-in-this-pr",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  nextExternalAction: "wait-for-remote-apply-confirmation-before-safe-live-service-role-smoke",
  forbiddenInThisSlice: [
    "remote Supabase DB migration apply",
    "safe live service-role status or persistence smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreServiceRoleSmokeReadiness;

export const youtubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate = {
  implementationStage: "post-remote-apply-service-role-smoke-gate",
  selectedFollowUp: "service-role-smoke-gate-after-youtube-remote-apply",
  prerequisiteYouTubeOAuthCredentialsRemoteApplyRun: {
    pullRequest: "#342",
    mergeCommit: "9102011f3b11ffb03f7ee92314d99a5af219d20a",
    previousPreviewHead: "dff517199f099488a43d67f7e31cc775b1b913f6",
    status: "remote-applied-youtube-oauth-credentials-migration-confirmed"
  },
  migrationHistoryState: "account-preferences-and-youtube-migrations-local-remote-present",
  dryRunState: "remote-database-up-to-date-no-pending-migrations",
  threadApproval: "not-recorded-for-service-role-smoke-execution",
  envReferencePresence: "missing-in-codex-process",
  requiredEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  remoteSupabaseApply: "forbidden-in-this-pr",
  actualServiceRoleSmoke: "not-run-blocked-pending-env-and-final-operator-confirmation",
  serviceRoleSmokeScope: "bounded-status-read-and-persistence-write-smoke-only-after-final-confirmation",
  ownerAuthorization: "required-before-status-read-or-persistence-write",
  credentialResolutionDisabledState: "credential-resolution-disabled-boundary-preserved",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  googleApiLiveCall: "forbidden-in-this-pr",
  safeLiveYouTubeOAuthSmoke: "forbidden-in-this-pr",
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-env-references-are-missing",
    "abort-if-final-operator-confirmation-is-missing",
    "abort-if-owner-authorization-is-not-confirmed",
    "abort-if-credential-resolution-boundary-is-not-reviewed",
    "abort-if-google-api-live-smoke-would-be-mixed-into-this-pr",
    "abort-if-any-secret-or-token-value-would-be-printed"
  ],
  nextAction: "request-env-reference-presence-and-fresh-final-operator-confirmation-before-service-role-smoke",
  forbiddenInThisSlice: [
    "remote Supabase DB migration apply",
    "remote Supabase migration history repair",
    "service-role smoke execution without fresh final operator confirmation",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateContract;

export const youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff = {
  implementationStage: "human-approved-remote-supabase-migration-apply-execution-handoff",
  selectedFollowUp: "remote-supabase-migration-apply-execution-handoff-only",
  prerequisiteServiceRoleSmokeReadiness: {
    pullRequest: "#330",
    mergeCommit: "70ff213bd203ee979336d059253999ea2ce33565",
    status: "blocked-pending-remote-apply"
  },
  prerequisiteRemoteApplyReadiness: {
    pullRequest: "#329",
    mergeCommit: "c773a52155fafc2f1148c947745688eb89dd8d76",
    status: "not-applied-readiness-only"
  },
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  remoteTarget: "required-opaque-project-target-reference",
  explicitHumanRunApproval: "required-before-any-remote-db-mutation",
  requiredReadinessChecks: [
    {
      id: "preview-merge-state-verified",
      status: "recorded",
      evidence: "origin/codex/comment-translator-preview includes PR #330 merge commit 70ff213bd203ee979336d059253999ea2ce33565."
    },
    {
      id: "service-role-smoke-readiness-merged",
      status: "recorded",
      evidence: "PR #330 records service-role status/persistence smoke readiness as blocked-pending-remote-apply."
    },
    {
      id: "remote-apply-readiness-not-applied-confirmed",
      status: "recorded",
      evidence: "PR #329 remote Supabase apply readiness remains not-applied-readiness-only; no prior remote apply confirmation is recorded."
    },
    {
      id: "remote-target-selection-required",
      status: "blocking-external-action",
      evidence: "The operator must provide the concrete remote Supabase target as an opaque project reference before any apply run."
    },
    {
      id: "explicit-human-run-approval-required",
      status: "blocking-external-action",
      evidence: "Remote Supabase migration apply mutates an external DB and requires explicit human run approval in the apply thread."
    },
    {
      id: "apply-execution-command-boundary-recorded",
      status: "recorded",
      evidence: "This handoff records the apply-run checklist boundary without connecting to a remote DB or running an apply command."
    },
    {
      id: "env-reference-names-recorded",
      status: "recorded",
      evidence: "Only NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY reference names are recorded for post-apply readiness; values are not requested."
    },
    {
      id: "missing-env-sanitized-state-recorded",
      status: "recorded",
      evidence: "Missing env references must degrade to sanitized unavailable/reconnect-required metadata."
    },
    {
      id: "credential-resolution-disable-preserved",
      status: "recorded",
      evidence: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED remains the emergency credential-resolution-disabled state."
    },
    {
      id: "owner-authorization-before-post-apply-smoke-recorded",
      status: "recorded",
      evidence: "Owner authorization is still required before any post-apply trusted service-role status read or persistence write smoke."
    },
    {
      id: "rollback-abort-conditions-recorded",
      status: "recorded",
      evidence: "Abort on ambiguous target or approval, unexpected migration diff, unavailable rollback path, credential resolution already enabled, or any secret/token print risk."
    },
    {
      id: "dashboard-log-unverified-scope-recorded",
      status: "recorded",
      evidence: "Cloudflare Pages, Workers Builds, Supabase dashboard apply history, and remote DB logs remain unchecked from this local handoff."
    },
    {
      id: "cloudflare-pages-noise-separated",
      status: "recorded",
      evidence: "Cloudflare Pages failure remains known Pages disconnect noise; Workers Builds and local verification remain the actionable signals."
    }
  ],
  remoteSupabaseApply: "not-run-pending-explicit-human-target-and-run-approval",
  actualServiceRoleSmoke: "out-of-scope-this-pr",
  postApplyPrerequisite: "remote-apply-confirmation-required-before-service-role-smoke",
  requiredEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  missingEnvState: "sanitized-unavailable-reconnect-required",
  credentialResolutionDisabledState: "credential-resolution-disabled",
  ownerAuthorization: "required-before-post-apply-status-read-or-persistence-write",
  googleApiLiveCall: "forbidden-in-this-pr",
  safeLiveYouTubeOAuthSmoke: "forbidden-in-this-pr",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-remote-target-or-approval-is-ambiguous",
    "abort-if-migration-diff-does-not-match-reviewed-file",
    "abort-if-rollback-path-is-not-confirmed",
    "abort-if-credential-resolution-is-enabled-before-apply",
    "abort-if-any-secret-or-token-value-would-be-printed"
  ],
  dashboardLogUnverifiedScope: [
    "Cloudflare Pages dashboard log",
    "Workers Builds dashboard log",
    "Supabase dashboard migration/apply history",
    "remote database schema/RLS inspection logs"
  ],
  nextExternalAction: "handoff-apply-run-checklist-without-connecting-to-remote-db",
  forbiddenInThisSlice: [
    "remote Supabase DB migration apply",
    "safe live service-role status or persistence smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoff;

export const youtubeEncryptedTokenStoreRemoteApplyRunContract = {
  implementationStage: "remote-supabase-migration-apply-run-target-blocker",
  selectedFollowUp: "remote-supabase-migration-apply-run-only",
  prerequisiteRemoteApplyExecutionHandoff: {
    pullRequest: "#331",
    mergeCommit: "42f03817563f047e3703be27d9b9cc6c92654305",
    headCommit: "ed22885d01e481ac7432fd9a77d4bbcbfe3f4e30",
    status: "blocked-pending-explicit-human-remote-apply-target-and-run-approval"
  },
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  threadApproval: "explicit-human-remote-apply-run-approval-recorded",
  safeConcreteRemoteTarget: "not-confirmed-no-repo-supabase-cli-target-metadata",
  targetDiscoveryEvidence: [
    "supabase/config.toml missing",
    ".supabase link metadata missing",
    "no repo-local non-secret project target metadata found"
  ],
  approvalScope: "apply-reviewed-youtube-oauth-credentials-migration-only",
  migrationDiff: "reviewed-file-only",
  remoteSupabaseApply: "not-run-blocked-pending-safe-concrete-remote-target",
  applyCommand: "not-run",
  actualServiceRoleSmoke: "out-of-scope-separate-pr",
  postApplyVerification: "schema-and-rls-presence-only-if-apply-runs",
  credentialResolutionDisabledState: "credential-resolution-disabled-before-apply-required",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-safe-concrete-remote-target-is-not-confirmed",
    "abort-if-migration-diff-does-not-match-reviewed-file",
    "abort-if-credential-resolution-is-not-disabled-before-apply",
    "abort-if-service-role-smoke-would-be-mixed-into-this-pr",
    "abort-if-any-secret-or-token-value-would-be-printed"
  ],
  nextAction: "record-target-blocker-without-running-remote-apply",
  forbiddenInThisSlice: [
    "service-role smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreRemoteApplyRunContract;

export const youtubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract = {
  implementationStage: "safe-concrete-remote-supabase-target-metadata-confirmation",
  selectedFollowUp: "remote-target-metadata-confirmation-only",
  prerequisiteRemoteApplyTargetBlocker: {
    pullRequest: "#332",
    mergeCommit: "85998d2265eaa6348a265241f13799bfbc46759e",
    headCommit: "7ed1c5de42f73a3e403d30605e23f9b6f5a81577",
    status: "not-run-blocked-pending-safe-concrete-remote-target"
  },
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  repoLocalTargetMetadata: "not-confirmed-no-repo-supabase-cli-target-metadata",
  targetConfirmation: "blocked-missing-repo-local-non-secret-target-metadata",
  targetDiscoveryEvidence: [
    "supabase/config.toml missing",
    ".supabase link metadata missing",
    "no repo-local non-secret project target metadata found"
  ],
  allowedTargetMetadataSources: ["supabase/config.toml", "Supabase CLI link metadata in .supabase"],
  rejectedTargetSources: [
    "service_role key value",
    "managed secret value",
    "OAuth token value",
    "human-pasted private credential",
    "browser storage",
    "existing handoff payload"
  ],
  remoteSupabaseApply: "not-run-target-confirmation-only",
  applyCommandOnlyNextCondition: "separate-pr-after-safe-concrete-target-is-confirmed",
  actualServiceRoleSmoke: "out-of-scope-separate-pr",
  credentialResolutionDisabledState: "credential-resolution-disabled-before-apply-required",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-repo-local-non-secret-target-metadata-is-missing",
    "abort-if-target-is-ambiguous-or-multiple-candidates",
    "abort-if-secret-or-token-value-is-needed-for-target-confirmation",
    "abort-if-migration-diff-does-not-match-reviewed-file",
    "abort-if-credential-resolution-is-not-disabled-before-apply",
    "abort-if-service-role-smoke-would-be-mixed-into-this-pr"
  ],
  nextAction: "record-target-metadata-blocker-without-running-remote-apply",
  forbiddenInThisSlice: [
    "remote Supabase DB migration apply",
    "service-role smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract;

export const youtubeEncryptedTokenStoreRemoteApplyCommandGateContract = {
  implementationStage: "remote-supabase-apply-command-only-gate",
  selectedFollowUp: "remote-apply-command-gate-without-actual-apply",
  prerequisiteRemoteTargetMetadataConfirmation: {
    pullRequest: "#333",
    mergeCommit: "ebe6b1baccaf18459d7e606f5d3d7150641dea71",
    headCommit: "ff8c15aef43b39109a7c37327cd30331d635e54d",
    status: "not-run-target-confirmation-only"
  },
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  operatorLocalTargetMetadata: "confirmed-from-supabase-cli-local-link-metadata",
  targetDiscoveryEvidence: [
    "supabase/.temp/project-ref present",
    "supabase/.temp/linked-project.json present",
    "project reference is a single non-secret 20-character project ref",
    "supabase/.temp/ is ignored and not committed"
  ],
  allowedTargetMetadataSources: ["supabase/config.toml", "Supabase CLI local link metadata in supabase/.temp"],
  rejectedTargetSources: [
    "service_role key value",
    "managed secret value",
    "OAuth token value",
    "human-pasted private credential",
    "browser storage",
    "existing handoff payload"
  ],
  remoteSupabaseApply: "not-run-pending-final-operator-confirmation",
  applyCommandOnlyGate: "ready-after-final-operator-confirmation",
  actualServiceRoleSmoke: "out-of-scope-separate-pr",
  credentialResolutionDisabledState: "credential-resolution-disabled-before-apply-required",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-supabase-cli-local-link-metadata-is-missing",
    "abort-if-target-is-ambiguous-or-multiple-candidates",
    "abort-if-link-metadata-would-need-secret-or-token-values",
    "abort-if-migration-diff-does-not-match-reviewed-file",
    "abort-if-credential-resolution-is-not-disabled-before-apply",
    "abort-if-final-operator-confirmation-is-missing",
    "abort-if-service-role-smoke-would-be-mixed-into-this-pr",
    "abort-if-any-secret-or-token-value-would-be-printed"
  ],
  nextAction: "record-apply-command-gate-without-running-remote-apply",
  forbiddenInThisSlice: [
    "remote Supabase DB migration apply",
    "service-role smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreRemoteApplyCommandGateContract;

export const youtubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate = {
  implementationStage: "remote-supabase-apply-dry-run-single-reviewed-migration-gate",
  selectedFollowUp: "dry-run-blocker-summary-only",
  prerequisiteRemoteApplyCommandGate: {
    pullRequest: "#334",
    mergeCommit: "cc3b95e59efbe028075e210e3b8ae405b75e2806",
    headCommit: "8a4ae6aeac6f35f5877585a95e5c7bb1c09b905d",
    status: "not-run-pending-final-operator-confirmation"
  },
  prerequisiteDryRunBlockerRecord: {
    pullRequest: "#337",
    mergeCommit: "ffb1337011a15df635b7f830c6a2704a0b927b39",
    headCommit: "55a79ff684ad7a629d686a05dc111e77ce5e74a5",
    status: "not-run-blocked-pending-single-reviewed-migration-only"
  },
  migrationPath: "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  reviewedMigrationName: "20260601000000_youtube_oauth_credentials.sql",
  dryRunCommand: "npx supabase db push --linked --dry-run",
  pendingMigrationEvidence: [
    "20260527000000_account_preferences_foundation.sql pending in linked remote migration history",
    "20260601000000_youtube_oauth_credentials.sql pending in linked remote migration history",
    "linked remote migration history is missing the account/preferences foundation baseline",
    "single reviewed migration only is not satisfied"
  ],
  exactBlockingMigration: "20260527000000_account_preferences_foundation.sql",
  remoteMigrationHistoryStatus: "linked-remote-history-missing-reviewed-baseline",
  remoteSupabaseApply: "not-run-blocked-pending-single-reviewed-migration-only",
  actualServiceRoleSmoke: "out-of-scope-separate-pr",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-apply-command-gate-is-not-satisfied",
    "abort-if-dry-run-does-not-show-the-reviewed-migration-as-the-only-pending-migration",
    "abort-if-a-non-reviewed-migration-is-pending-in-linked-remote-history",
    "abort-if-migration-diff-does-not-match-reviewed-file",
    "abort-if-credential-resolution-is-not-disabled-before-apply",
    "abort-if-service-role-smoke-would-be-mixed-into-this-pr",
    "abort-if-any-secret-or-token-value-would-be-printed"
  ],
  nextAction: "record-dry-run-blocker-without-running-remote-apply",
  forbiddenInThisSlice: [
    "remote Supabase DB migration apply",
    "service-role smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateContract;

export const youtubeEncryptedTokenStoreRemoteBaselineMismatchGate = {
  implementationStage: "linked-remote-migration-history-baseline-mismatch-gate",
  selectedFollowUp: "baseline-mismatch-resolution-gate-only",
  prerequisiteDryRunSingleMigrationGate: {
    pullRequest: "#338",
    mergeCommit: "eddc49f573dcb98320dfa4ee337de2a1ac34b07c",
    previousPreviewHead: "ffb1337011a15df635b7f830c6a2704a0b927b39",
    status: "not-run-blocked-pending-single-reviewed-migration-only"
  },
  accountPreferencesFoundationMigration: "20260527000000_account_preferences_foundation.sql",
  reviewedTargetMigration: "20260601000000_youtube_oauth_credentials.sql",
  remoteHistoryDiagnosis: "linked-remote-missing-account-preferences-foundation-baseline",
  remoteSupabaseApply: "not-run-blocked-pending-linked-remote-baseline-resolution",
  baselineRemoteMutation: "not-run-requires-separate-reviewed-baseline-pr-or-target-reselection",
  safeResolutionPaths: [
    "separate-reviewed-account-preferences-foundation-baseline-pr-before-youtube-apply",
    "separate-reviewed-migration-history-repair-only-if-account-preferences-schema-already-exists",
    "select-different-linked-target-with-account-preferences-baseline-already-applied"
  ],
  actualServiceRoleSmoke: "out-of-scope-separate-pr",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-account-preferences-foundation-would-be-bundled-with-youtube-oauth-apply",
    "abort-if-account-preferences-foundation-baseline-is-not-reviewed-in-a-separate-pr",
    "abort-if-migration-history-repair-would-run-without-confirmed-existing-schema",
    "abort-if-linked-target-remains-missing-account-preferences-baseline",
    "abort-if-migration-diff-does-not-match-reviewed-file",
    "abort-if-credential-resolution-is-not-disabled-before-apply",
    "abort-if-service-role-smoke-would-be-mixed-into-this-pr",
    "abort-if-any-secret-or-token-value-would-be-printed"
  ],
  nextAction: "record-baseline-mismatch-blocker-without-remote-db-mutation",
  forbiddenInThisSlice: [
    "remote Supabase DB migration apply",
    "remote Supabase migration history repair",
    "service-role smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreRemoteBaselineMismatchGateContract;

export const youtubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate = {
  implementationStage: "account-preferences-baseline-resolution-gate",
  selectedFollowUp: "safe-baseline-resolution-path-gate-only",
  prerequisiteBaselineMismatchGate: {
    pullRequest: "#339",
    mergeCommit: "a334f3f4eded06ed4e44f27a1658e1d3f6de0a05",
    previousPreviewHead: "eddc49f573dcb98320dfa4ee337de2a1ac34b07c",
    status: "not-run-blocked-pending-linked-remote-baseline-resolution"
  },
  threadApproval: "conditional-human-approval-not-sufficient-for-ambiguous-remote-mutation",
  accountPreferencesFoundationMigration: "20260527000000_account_preferences_foundation.sql",
  reviewedTargetMigration: "20260601000000_youtube_oauth_credentials.sql",
  dryRunEvidence: "account-preferences-and-youtube-migrations-still-pending",
  migrationListEvidence: "account-preferences-and-youtube-migrations-remote-blank",
  separateRemoteMutationPaths: [
    "account-preferences-foundation-baseline-apply",
    "account-preferences-migration-history-repair",
    "different-linked-target-reselection"
  ],
  remoteSupabaseApply: "not-run-blocked-pending-safe-baseline-resolution-path",
  migrationHistoryRepair: "not-run-blocked-pending-confirmed-existing-schema-and-fresh-approval",
  youtubeRemoteApply: "not-run-blocked-pending-single-reviewed-migration-only",
  actualServiceRoleSmoke: "out-of-scope-separate-pr",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-remote-mutation-path-is-ambiguous-or-multiple",
    "abort-if-account-preferences-foundation-would-be-bundled-with-youtube-oauth-apply",
    "abort-if-account-preferences-baseline-apply-would-run-without-fresh-final-confirmation",
    "abort-if-migration-history-repair-would-run-without-confirmed-existing-schema",
    "abort-if-migration-history-repair-would-run-without-fresh-final-confirmation",
    "abort-if-different-linked-target-is-not-unique-and-non-secret",
    "abort-if-dry-run-after-baseline-resolution-is-not-single-reviewed-youtube-migration-only",
    "abort-if-service-role-smoke-would-be-mixed-into-this-pr",
    "abort-if-any-secret-or-token-value-would-be-printed"
  ],
  nextAction: "record-baseline-resolution-path-blocker-without-remote-db-mutation",
  forbiddenInThisSlice: [
    "remote Supabase DB migration apply",
    "remote Supabase migration history repair",
    "service-role smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateContract;

export const youtubeEncryptedTokenStoreAccountPreferencesBaselineApplyRun = {
  implementationStage: "account-preferences-foundation-baseline-apply-run",
  selectedResolutionPath: "account-preferences-foundation-baseline-apply",
  prerequisiteBaselineResolutionGate: {
    pullRequest: "#340",
    mergeCommit: "781cc7a361ee02047632a678c2f0861c5961f257",
    previousPreviewHead: "a334f3f4eded06ed4e44f27a1658e1d3f6de0a05",
    status: "not-run-blocked-pending-safe-baseline-resolution-path"
  },
  threadApproval: "explicit-human-account-preferences-baseline-apply-approval-recorded",
  accountPreferencesFoundationMigration: "20260527000000_account_preferences_foundation.sql",
  reviewedTargetMigration: "20260601000000_youtube_oauth_credentials.sql",
  preApplyDryRun: "single-account-preferences-foundation-migration-only",
  remoteSupabaseApply: "applied-account-preferences-foundation-baseline-only",
  applyResultNote: "existing-account-preferences-relations-skipped-by-if-not-exists-and-migration-history-recorded",
  postApplyMigrationList: "account-preferences-remote-present-youtube-remote-blank",
  postApplyDryRun: "single-reviewed-youtube-migration-only",
  youtubeRemoteApply: "not-run-pending-fresh-final-operator-confirmation",
  migrationHistoryRepair: "not-run-not-needed-for-account-preferences-baseline",
  actualServiceRoleSmoke: "out-of-scope-separate-pr",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-baseline-apply-dry-run-is-not-single-account-preferences-migration-only",
    "abort-if-youtube-migration-would-be-bundled-with-account-preferences-baseline-apply",
    "abort-if-post-apply-dry-run-is-not-single-reviewed-youtube-migration-only",
    "abort-if-youtube-apply-would-run-without-fresh-final-confirmation",
    "abort-if-service-role-smoke-would-be-mixed-into-this-pr",
    "abort-if-any-secret-or-token-value-would-be-printed"
  ],
  nextAction: "request-fresh-final-operator-confirmation-for-youtube-apply-command-only",
  forbiddenInThisSlice: [
    "YouTube OAuth credential migration apply",
    "remote Supabase migration history repair",
    "service-role smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreAccountPreferencesBaselineApplyRunContract;

export const youtubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRun = {
  implementationStage: "youtube-oauth-credentials-remote-apply-run",
  selectedFollowUp: "youtube-oauth-credentials-apply-confirmation-only",
  prerequisiteAccountPreferencesBaselineApplyRun: {
    pullRequest: "#341",
    mergeCommit: "dff517199f099488a43d67f7e31cc775b1b913f6",
    previousPreviewHead: "781cc7a361ee02047632a678c2f0861c5961f257",
    status: "applied-account-preferences-foundation-baseline-only"
  },
  threadApproval: "explicit-human-youtube-oauth-credentials-apply-approval-recorded",
  accountPreferencesFoundationMigration: "20260527000000_account_preferences_foundation.sql",
  reviewedTargetMigration: "20260601000000_youtube_oauth_credentials.sql",
  preApplyMigrationList: "account-preferences-remote-present-youtube-remote-blank",
  preApplyDryRunCodexAttempt: "blocked-db-auth-env-missing-before-pending-list-confirmation",
  operatorLocalDryRunEvidence: "remote-database-up-to-date",
  remoteSupabaseApply: "remote-applied-youtube-oauth-credentials-migration-confirmed",
  applyCommandExecution: "not-executed-by-codex-process-db-password-unavailable",
  postApplyMigrationList: "account-preferences-and-youtube-migrations-local-remote-present",
  postApplyDryRun: "remote-database-up-to-date-no-pending-migrations",
  migrationHistoryRepair: "not-run-not-needed",
  actualServiceRoleSmoke: "out-of-scope-separate-pr",
  clientReadableOutput: ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  secretHandling: "env-reference-names-only-no-values",
  browserStorage: "unchanged",
  rollbackAbortConditions: [
    "abort-if-youtube-oauth-credentials-migration-is-not-confirmed-in-remote-history",
    "abort-if-post-apply-dry-run-still-shows-pending-migrations",
    "abort-if-credential-resolution-disable-is-not-maintained",
    "abort-if-service-role-smoke-would-be-mixed-into-this-pr",
    "abort-if-any-secret-or-token-value-would-be-printed"
  ],
  nextAction: "open-separate-service-role-smoke-readiness-or-execution-pr",
  forbiddenInThisSlice: [
    "service-role smoke execution",
    "Google API live call",
    "safe live YouTube OAuth smoke",
    "OAuth token value handling",
    "service_role key value handling",
    "managed secret value handling",
    "localStorage, IndexedDB, sessionStorage, or handoff payload change"
  ]
} as const satisfies YouTubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRunContract;

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

export function assessYouTubeEncryptedTokenStoreRemoteSupabaseApplyReadiness(
  completedChecks: readonly YouTubeEncryptedTokenStoreRemoteSupabaseApplyReadinessCheck[]
): YouTubeEncryptedTokenStoreRemoteSupabaseApplyReadinessResult {
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingCheckIds = youtubeEncryptedTokenStoreRemoteSupabaseApplyReadiness.requiredReadinessChecks
    .map((check) => check.id)
    .filter((id) => !completedCheckIds.includes(id));

  if (missingCheckIds.length > 0) {
    return {
      status: "blocked-missing-remote-apply-readiness-checks",
      missingCheckIds,
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "record-readiness-blockers-without-remote-db-connection"
    };
  }

  return {
    status: "readiness-recorded-remote-apply-blocked-pending-human-apply-approval",
    completedCheckIds,
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: youtubeEncryptedTokenStoreRemoteSupabaseApplyReadiness.nextExternalAction
  };
}

export function assessYouTubeEncryptedTokenStoreServiceRoleSmokeReadiness(
  completedChecks: readonly YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessCheck[]
): YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessResult {
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingRecordedCheckIds = youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.requiredReadinessChecks
    .filter((check) => check.status === "recorded")
    .map((check) => check.id)
    .filter((id) => !completedCheckIds.includes(id));

  if (missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-service-role-smoke-readiness-checks",
      missingCheckIds: youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.requiredReadinessChecks
        .map((check) => check.id)
        .filter((id) => !completedCheckIds.includes(id)),
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "record-service-role-smoke-readiness-blockers-without-remote-db-connection"
    };
  }

  return {
    status: "blocked-pending-remote-apply",
    completedCheckIds,
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.nextExternalAction
  };
}

export function assessYouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate(
  input: YouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateInput
): YouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateAssessment {
  if (input.requiresSecretOrTokenValue) {
    return {
      status: "blocked-secret-required-for-service-role-smoke-gate",
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: false,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "record-secret-required-blocker-without-requesting-secret-values"
    };
  }

  if (!input.remoteApplyConfirmed) {
    return {
      status: "blocked-pending-remote-apply-confirmation",
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: false,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "wait-for-youtube-oauth-credentials-remote-apply-confirmation"
    };
  }

  if (input.googleApiLiveSmokeRequested) {
    return {
      status: "blocked-google-api-live-smoke-out-of-scope",
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: input.serviceRoleSmokeExecuted,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "split-google-api-live-smoke-into-a-separate-pr"
    };
  }

  if (
    !input.supabaseUrlEnvReferencePresent ||
    !input.serviceRoleKeyEnvReferencePresent ||
    !input.finalOperatorConfirmationForServiceRoleSmoke
  ) {
    return {
      status: "blocked-pending-service-role-smoke-env-and-final-operator-confirmation",
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: false,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "request-env-reference-presence-and-fresh-final-operator-confirmation-before-service-role-smoke"
    };
  }

  if (!input.ownerAuthorizationConfirmed || !input.credentialResolutionBoundaryReviewed) {
    return {
      status: "blocked-pending-owner-authorization-or-credential-boundary-review",
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: false,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "confirm-owner-authorization-and-credential-resolution-boundary-before-smoke"
    };
  }

  return {
    status: "ready-for-service-role-smoke-execution-command-only",
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: true,
    serviceRoleSmokeExecuted: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "run-bounded-service-role-status-persistence-smoke-only-after-final-confirmation"
  };
}

export function assessYouTubeEncryptedTokenStoreRemoteApplyExecutionHandoff(
  completedChecks: readonly YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffCheck[]
): YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffResult {
  const completedCheckIds = completedChecks.map((check) => check.id);
  const missingRecordedCheckIds = youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.requiredReadinessChecks
    .filter((check) => check.status === "recorded")
    .map((check) => check.id)
    .filter((id) => !completedCheckIds.includes(id));

  if (missingRecordedCheckIds.length > 0) {
    return {
      status: "blocked-missing-remote-apply-execution-handoff-checks",
      missingCheckIds: youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.requiredReadinessChecks
        .map((check) => check.id)
        .filter((id) => !completedCheckIds.includes(id)),
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      googleApiLiveSmokeAllowedInThisPr: false,
      nextAction: "record-apply-execution-handoff-blockers-without-remote-db-connection"
    };
  }

  return {
    status: "blocked-pending-explicit-human-remote-apply-target-and-run-approval",
    completedCheckIds,
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.nextExternalAction
  };
}

export function assessYouTubeEncryptedTokenStoreRemoteApplyRun(
  decision: YouTubeEncryptedTokenStoreRemoteApplyRunDecision
): YouTubeEncryptedTokenStoreRemoteApplyRunAssessment {
  if (!decision.explicitHumanRunApproval) {
    return {
      status: "blocked-pending-human-remote-apply-run-approval",
      remoteSupabaseApplyAllowed: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-approval-blocker-without-running-remote-apply"
    };
  }

  if (!decision.safeConcreteRemoteTargetConfirmed) {
    return {
      status: "blocked-pending-safe-concrete-remote-target",
      remoteSupabaseApplyAllowed: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-target-blocker-without-running-remote-apply"
    };
  }

  if (!decision.migrationDiffMatchesReviewedFile || !decision.credentialResolutionDisabledBeforeApply) {
    return {
      status: "blocked-pending-reviewed-apply-preconditions",
      remoteSupabaseApplyAllowed: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-apply-precondition-blocker-without-running-remote-apply"
    };
  }

  return {
    status: "ready-for-remote-apply-command-only",
    remoteSupabaseApplyAllowed: true,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "run-reviewed-migration-apply-command-only-after-final-operator-confirmation"
  };
}

export function assessYouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmation(
  input: YouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationInput
): YouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationAssessment {
  if (input.requiresSecretOrTokenValue) {
    return {
      status: "blocked-secret-required-for-target-confirmation",
      remoteTargetConfirmed: false,
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-secret-required-blocker-without-requesting-secret-values"
    };
  }

  if (!input.supabaseConfigTomlPresent && !input.supabaseCliLinkMetadataPresent) {
    return {
      status: "blocked-missing-repo-local-target-metadata",
      remoteTargetConfirmed: false,
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-target-metadata-blocker-without-running-remote-apply"
    };
  }

  if (!input.nonSecretProjectReferenceUnique || input.multipleTargetCandidates) {
    return {
      status: "blocked-ambiguous-remote-target",
      remoteTargetConfirmed: false,
      remoteSupabaseApplyAllowedInThisPr: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-ambiguous-target-blocker-without-running-remote-apply"
    };
  }

  return {
    status: "ready-for-separate-apply-command-pr",
    remoteTargetConfirmed: true,
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-target-confirmed-readiness-and-open-separate-apply-command-pr"
  };
}

export function assessYouTubeEncryptedTokenStoreRemoteApplyCommandGate(
  input: YouTubeEncryptedTokenStoreRemoteApplyCommandGateInput
): YouTubeEncryptedTokenStoreRemoteApplyCommandGateAssessment {
  if (!input.supabaseCliLocalLinkMetadataPresent || !input.metadataIgnoredAndNotCommitted) {
    return {
      status: "blocked-missing-or-uncommitted-link-metadata",
      remoteTargetConfirmed: false,
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-command-gate-blocker-without-running-remote-apply"
    };
  }

  if (!input.nonSecretProjectReferenceUnique) {
    return {
      status: "blocked-ambiguous-remote-target",
      remoteTargetConfirmed: false,
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-command-gate-blocker-without-running-remote-apply"
    };
  }

  if (!input.migrationDiffMatchesReviewedFile || !input.credentialResolutionDisabledBeforeApply) {
    return {
      status: "blocked-pending-reviewed-apply-preconditions",
      remoteTargetConfirmed: false,
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-command-gate-blocker-without-running-remote-apply"
    };
  }

  if (!input.finalOperatorConfirmation) {
    return {
      status: "ready-for-final-operator-confirmation-before-apply-command",
      remoteTargetConfirmed: true,
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-apply-command-gate-without-running-remote-apply"
    };
  }

  return {
    status: "ready-for-remote-apply-command-only",
    remoteTargetConfirmed: true,
    remoteSupabaseApplyAllowedInThisPr: true,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "run-reviewed-migration-apply-command-only"
  };
}

export function assessYouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate(
  input: YouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateInput
): YouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateAssessment {
  if (!input.applyCommandGateReady) {
    return {
      status: "blocked-pending-apply-command-gate",
      blockingPendingMigrationNames: [],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-apply-command-gate-blocker-without-running-remote-apply"
    };
  }

  const isSingleReviewedMigrationOnly =
    input.pendingMigrationNames.length === 1 && input.pendingMigrationNames[0] === input.reviewedMigrationName;

  if (!isSingleReviewedMigrationOnly) {
    return {
      status: "blocked-pending-single-reviewed-migration-only",
      blockingPendingMigrationNames: [...input.pendingMigrationNames],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-dry-run-blocker-without-running-remote-apply"
    };
  }

  return {
    status: "ready-for-reviewed-migration-apply-command-only",
    blockingPendingMigrationNames: [],
    remoteSupabaseApplyAllowedInThisPr: true,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "run-reviewed-migration-apply-command-only"
  };
}

export function assessYouTubeEncryptedTokenStoreRemoteBaselineMismatchGate(
  input: YouTubeEncryptedTokenStoreRemoteBaselineMismatchGateInput
): YouTubeEncryptedTokenStoreRemoteBaselineMismatchGateAssessment {
  if (input.requiresSecretOrTokenValue) {
    return {
      status: "blocked-secret-required-for-baseline-resolution",
      blockingMigrationNames: [...input.pendingMigrationNames],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-secret-required-blocker-without-requesting-secret-values"
    };
  }

  const isSingleReviewedTargetOnly =
    input.pendingMigrationNames.length === 1 && input.pendingMigrationNames[0] === input.reviewedTargetMigrationName;

  if (!input.accountPreferencesBaselineResolved || !input.safeResolutionPathSelected || !isSingleReviewedTargetOnly) {
    return {
      status: "blocked-pending-linked-remote-baseline-resolution",
      blockingMigrationNames: [...input.pendingMigrationNames],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-baseline-mismatch-blocker-without-remote-db-mutation"
    };
  }

  if (!input.finalOperatorConfirmation) {
    return {
      status: "ready-for-fresh-final-operator-confirmation-before-youtube-apply",
      blockingMigrationNames: [],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "recheck-single-reviewed-migration-and-request-fresh-final-operator-confirmation"
    };
  }

  return {
    status: "ready-for-reviewed-youtube-apply-command-only",
    blockingMigrationNames: [],
    remoteSupabaseApplyAllowedInThisPr: true,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "run-reviewed-youtube-migration-apply-command-only"
  };
}

export function assessYouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate(
  input: YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateInput
): YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateAssessment {
  if (input.requiresSecretOrTokenValue) {
    return {
      status: "blocked-secret-required-for-baseline-resolution",
      blockingMigrationNames: [...input.pendingMigrationNames],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-secret-required-blocker-without-requesting-secret-values"
    };
  }

  if (input.selectedResolutionPath === "none-selected") {
    return {
      status: "blocked-pending-safe-baseline-resolution-path",
      blockingMigrationNames: [...input.pendingMigrationNames],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-baseline-resolution-path-blocker-without-remote-db-mutation"
    };
  }

  if (
    input.selectedResolutionPath === "account-preferences-migration-history-repair" &&
    !input.accountPreferencesRemoteSchemaVerified
  ) {
    return {
      status: "blocked-pending-remote-schema-existence-confirmation-before-repair",
      blockingMigrationNames: [input.accountPreferencesMigrationName],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "confirm-account-preferences-schema-before-migration-history-repair"
    };
  }

  if (input.selectedResolutionPath === "different-linked-target-reselection") {
    const isSingleReviewedTargetOnly =
      input.pendingMigrationNames.length === 1 && input.pendingMigrationNames[0] === input.reviewedTargetMigrationName;

    if (!input.dryRunShowsOnlyReviewedTargetAfterResolution || !isSingleReviewedTargetOnly) {
      return {
        status: "blocked-pending-different-linked-target-with-baseline-applied",
        blockingMigrationNames: [...input.pendingMigrationNames],
        remoteSupabaseApplyAllowedInThisPr: false,
        remoteSupabaseApplyExecuted: false,
        migrationHistoryRepairAllowedInThisPr: false,
        migrationHistoryRepairExecuted: false,
        serviceRoleSmokeAllowedInThisPr: false,
        nextAction: "select-one-linked-target-then-recheck-dry-run-single-reviewed-migration"
      };
    }

    return {
      status: "ready-for-youtube-single-reviewed-migration-recheck-after-baseline-resolution",
      blockingMigrationNames: [],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "recheck-youtube-dry-run-single-reviewed-migration-before-fresh-apply-confirmation"
    };
  }

  if (!input.finalOperatorConfirmationForSelectedRemoteMutation) {
    return {
      status: "blocked-pending-fresh-final-operator-confirmation-for-selected-baseline-resolution",
      blockingMigrationNames: [input.accountPreferencesMigrationName],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "request-fresh-final-operator-confirmation-for-one-selected-remote-mutation"
    };
  }

  if (input.selectedResolutionPath === "account-preferences-migration-history-repair") {
    return {
      status: "ready-for-account-preferences-migration-history-repair-command-only",
      blockingMigrationNames: [],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      migrationHistoryRepairAllowedInThisPr: true,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "run-account-preferences-migration-history-repair-command-only"
    };
  }

  return {
    status: "ready-for-account-preferences-baseline-apply-command-only",
    blockingMigrationNames: [],
    remoteSupabaseApplyAllowedInThisPr: true,
    remoteSupabaseApplyExecuted: false,
    migrationHistoryRepairAllowedInThisPr: false,
    migrationHistoryRepairExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "run-account-preferences-baseline-apply-command-only"
  };
}

export function assessYouTubeEncryptedTokenStoreAccountPreferencesBaselineApplyRun(
  input: YouTubeEncryptedTokenStoreAccountPreferencesBaselineApplyRunInput
): YouTubeEncryptedTokenStoreAccountPreferencesBaselineApplyRunAssessment {
  if (input.requiresSecretOrTokenValue) {
    return {
      status: "blocked-secret-required-for-post-baseline-apply",
      blockingMigrationNames: [...input.pendingMigrationNamesAfterApply],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: true,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-secret-required-blocker-without-requesting-secret-values"
    };
  }

  if (!input.accountPreferencesBaselineApplied) {
    return {
      status: "blocked-account-preferences-baseline-not-applied",
      blockingMigrationNames: [...input.pendingMigrationNamesAfterApply],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "do-not-run-youtube-apply-until-baseline-apply-is-confirmed"
    };
  }

  const isSingleReviewedTargetOnly =
    input.pendingMigrationNamesAfterApply.length === 1 &&
    input.pendingMigrationNamesAfterApply[0] === input.reviewedTargetMigrationName;

  if (!isSingleReviewedTargetOnly) {
    return {
      status: "blocked-post-apply-dry-run-not-single-reviewed-youtube-migration-only",
      blockingMigrationNames: [...input.pendingMigrationNamesAfterApply],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: true,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "record-post-baseline-apply-dry-run-blocker"
    };
  }

  if (!input.finalOperatorConfirmationForYoutubeApply) {
    return {
      status: "ready-for-fresh-final-operator-confirmation-before-youtube-apply",
      blockingMigrationNames: [],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: true,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      nextAction: "request-fresh-final-operator-confirmation-for-youtube-apply-command-only"
    };
  }

  return {
    status: "ready-for-reviewed-youtube-apply-command-only",
    blockingMigrationNames: [],
    remoteSupabaseApplyAllowedInThisPr: true,
    remoteSupabaseApplyExecuted: true,
    migrationHistoryRepairAllowedInThisPr: false,
    migrationHistoryRepairExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "run-reviewed-youtube-migration-apply-command-only"
  };
}

export function assessYouTubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRun(
  input: YouTubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRunInput
): YouTubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRunAssessment {
  if (input.requiresSecretOrTokenValue) {
    return {
      status: "blocked-secret-required-for-youtube-remote-apply-confirmation",
      blockingMigrationNames: [...input.postApplyPendingMigrationNames],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: false,
      nextAction: "record-secret-required-blocker-without-requesting-secret-values"
    };
  }

  if (!input.youtubeOAuthCredentialsMigrationRemoteApplied) {
    return {
      status: "blocked-youtube-oauth-credentials-migration-not-confirmed-applied",
      blockingMigrationNames: [...input.postApplyPendingMigrationNames],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: false,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: false,
      nextAction: "record-youtube-apply-confirmation-blocker-without-service-role-smoke"
    };
  }

  if (input.postApplyPendingMigrationNames.length > 0) {
    return {
      status: "blocked-post-youtube-apply-dry-run-still-pending",
      blockingMigrationNames: [...input.postApplyPendingMigrationNames],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: true,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: input.serviceRoleSmokeExecuted,
      nextAction: "record-post-youtube-apply-boundary-blocker"
    };
  }

  if (!input.credentialResolutionDisabledMaintained) {
    return {
      status: "blocked-credential-resolution-disable-not-maintained",
      blockingMigrationNames: [],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: true,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: input.serviceRoleSmokeExecuted,
      nextAction: "record-post-youtube-apply-boundary-blocker"
    };
  }

  if (input.serviceRoleSmokeExecuted) {
    return {
      status: "blocked-service-role-smoke-mixed-into-apply-pr",
      blockingMigrationNames: [],
      remoteSupabaseApplyAllowedInThisPr: false,
      remoteSupabaseApplyExecuted: true,
      migrationHistoryRepairAllowedInThisPr: false,
      migrationHistoryRepairExecuted: false,
      serviceRoleSmokeAllowedInThisPr: false,
      serviceRoleSmokeExecuted: true,
      nextAction: "record-post-youtube-apply-boundary-blocker"
    };
  }

  return {
    status: "ready-for-separate-service-role-smoke-pr",
    blockingMigrationNames: [],
    remoteSupabaseApplyAllowedInThisPr: false,
    remoteSupabaseApplyExecuted: true,
    migrationHistoryRepairAllowedInThisPr: false,
    migrationHistoryRepairExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    serviceRoleSmokeExecuted: false,
    nextAction: "open-separate-service-role-smoke-readiness-or-execution-pr"
  };
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

export function createYouTubeEncryptedTokenStoreRemoteSupabaseApplyReadinessSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreRemoteSupabaseApplyReadiness(
    youtubeEncryptedTokenStoreRemoteSupabaseApplyReadiness.requiredReadinessChecks
  );

  return [
    `PR ${youtubeEncryptedTokenStoreRemoteSupabaseApplyReadiness.prerequisiteRuntimeExpansion.pullRequest} server runtime expansion is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreRemoteSupabaseApplyReadiness.implementationStage}.`,
    `Status: ${result.status}.`,
    `Remote apply: ${youtubeEncryptedTokenStoreRemoteSupabaseApplyReadiness.remoteSupabaseApply}.`,
    "No service-role smoke, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreServiceRoleSmokeReadinessSummary(): string {
  const recordedChecks = youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.requiredReadinessChecks.filter(
    (check) => check.status === "recorded"
  );
  const result = assessYouTubeEncryptedTokenStoreServiceRoleSmokeReadiness(recordedChecks);

  return [
    `PR ${youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.prerequisiteRemoteApplyReadiness.pullRequest} remote apply readiness is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.implementationStage}.`,
    `Status: ${result.status}.`,
    `Post-apply prerequisite: ${youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.postApplyPrerequisite}.`,
    "No remote Supabase migration apply, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateSummary(): string {
  const result = assessYouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate({
    remoteApplyConfirmed: true,
    supabaseUrlEnvReferencePresent: false,
    serviceRoleKeyEnvReferencePresent: false,
    finalOperatorConfirmationForServiceRoleSmoke: false,
    ownerAuthorizationConfirmed: false,
    credentialResolutionBoundaryReviewed: true,
    serviceRoleSmokeExecuted: false,
    googleApiLiveSmokeRequested: false,
    requiresSecretOrTokenValue: false
  });

  return [
    `PR ${youtubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate.prerequisiteYouTubeOAuthCredentialsRemoteApplyRun.pullRequest} YouTube OAuth credentials remote apply is merged.`,
    `Stage: ${youtubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate.implementationStage}.`,
    `Status: ${result.status}.`,
    `Actual service-role smoke: ${youtubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate.actualServiceRoleSmoke}.`,
    "Remote apply is confirmed, but service-role smoke still requires env reference presence, owner authorization, and fresh final operator confirmation.",
    "No remote Supabase migration apply, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffSummary(): string {
  const recordedChecks = youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.requiredReadinessChecks.filter(
    (check) => check.status === "recorded"
  );
  const result = assessYouTubeEncryptedTokenStoreRemoteApplyExecutionHandoff(recordedChecks);

  return [
    `PR ${youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.prerequisiteServiceRoleSmokeReadiness.pullRequest} service-role smoke readiness is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.implementationStage}.`,
    `Status: ${result.status}.`,
    `Remote apply: ${youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.remoteSupabaseApply}.`,
    "No remote Supabase migration apply, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreRemoteApplyRunSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreRemoteApplyRun({
    explicitHumanRunApproval: true,
    safeConcreteRemoteTargetConfirmed: false,
    migrationDiffMatchesReviewedFile: true,
    credentialResolutionDisabledBeforeApply: true
  });

  return [
    `PR ${youtubeEncryptedTokenStoreRemoteApplyRunContract.prerequisiteRemoteApplyExecutionHandoff.pullRequest} remote apply execution handoff is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreRemoteApplyRunContract.implementationStage}.`,
    `Status: ${result.status}.`,
    `Remote apply: ${youtubeEncryptedTokenStoreRemoteApplyRunContract.remoteSupabaseApply}.`,
    "Thread approval is recorded, but no safe concrete remote Supabase target was found in repo-local non-secret config or Supabase CLI metadata.",
    "No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmation({
    supabaseConfigTomlPresent: false,
    supabaseCliLinkMetadataPresent: false,
    nonSecretProjectReferenceUnique: false,
    multipleTargetCandidates: false,
    requiresSecretOrTokenValue: false
  });

  return [
    `PR ${youtubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract.prerequisiteRemoteApplyTargetBlocker.pullRequest} remote apply target blocker is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract.implementationStage}.`,
    `Status: ${result.status}.`,
    `Target confirmation: ${youtubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract.targetConfirmation}.`,
    `Actual apply: ${youtubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract.remoteSupabaseApply}.`,
    "Only repo-local non-secret Supabase config or CLI link metadata can confirm the target.",
    "No remote Supabase migration apply, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreRemoteApplyCommandGateSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreRemoteApplyCommandGate({
    supabaseCliLocalLinkMetadataPresent: true,
    nonSecretProjectReferenceUnique: true,
    metadataIgnoredAndNotCommitted: true,
    migrationDiffMatchesReviewedFile: true,
    credentialResolutionDisabledBeforeApply: true,
    finalOperatorConfirmation: false
  });

  return [
    `PR ${youtubeEncryptedTokenStoreRemoteApplyCommandGateContract.prerequisiteRemoteTargetMetadataConfirmation.pullRequest} remote target metadata confirmation is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreRemoteApplyCommandGateContract.implementationStage}.`,
    `Status: ${result.status}.`,
    `Target metadata: ${youtubeEncryptedTokenStoreRemoteApplyCommandGateContract.operatorLocalTargetMetadata}.`,
    `Actual apply: ${youtubeEncryptedTokenStoreRemoteApplyCommandGateContract.remoteSupabaseApply}.`,
    "Supabase CLI local link metadata in supabase/.temp is ignored and not committed.",
    "No remote Supabase migration apply, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate({
    applyCommandGateReady: true,
    pendingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    reviewedMigrationName: youtubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate.reviewedMigrationName
  });

  return [
    `PR ${youtubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate.prerequisiteDryRunBlockerRecord.pullRequest} dry-run blocker record is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate.implementationStage}.`,
    `Status: ${result.status}.`,
    `Remote apply: ${youtubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate.remoteSupabaseApply}.`,
    "Dry-run and migration-list evidence show both 20260527000000_account_preferences_foundation.sql and 20260601000000_youtube_oauth_credentials.sql pending in linked remote history.",
    "No remote Supabase migration apply, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreRemoteBaselineMismatchGateSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreRemoteBaselineMismatchGate({
    pendingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    reviewedTargetMigrationName: youtubeEncryptedTokenStoreRemoteBaselineMismatchGate.reviewedTargetMigration,
    accountPreferencesBaselineResolved: false,
    safeResolutionPathSelected: false,
    finalOperatorConfirmation: false,
    requiresSecretOrTokenValue: false
  });

  return [
    `PR ${youtubeEncryptedTokenStoreRemoteBaselineMismatchGate.prerequisiteDryRunSingleMigrationGate.pullRequest} single migration gate is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreRemoteBaselineMismatchGate.implementationStage}.`,
    `Status: ${result.status}.`,
    `Remote apply: ${youtubeEncryptedTokenStoreRemoteBaselineMismatchGate.remoteSupabaseApply}.`,
    "Safe paths: separate reviewed account/preferences baseline PR, separate reviewed migration-history repair only if that schema already exists, or a different linked target with the baseline already applied.",
    "No remote Supabase migration apply, No migration-history repair, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate({
    pendingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    accountPreferencesMigrationName:
      youtubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate.accountPreferencesFoundationMigration,
    reviewedTargetMigrationName: youtubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate.reviewedTargetMigration,
    selectedResolutionPath: "none-selected",
    accountPreferencesRemoteSchemaVerified: false,
    dryRunShowsOnlyReviewedTargetAfterResolution: false,
    finalOperatorConfirmationForSelectedRemoteMutation: true,
    requiresSecretOrTokenValue: false
  });

  return [
    `PR ${youtubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate.prerequisiteBaselineMismatchGate.pullRequest} baseline mismatch gate is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate.implementationStage}.`,
    `Status: ${result.status}.`,
    `Thread approval: ${youtubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate.threadApproval}.`,
    `Remote apply: ${youtubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate.remoteSupabaseApply}.`,
    "The conditional approval is not runnable while account/preferences baseline apply, migration-history repair, and target reselection remain multiple candidate paths.",
    "No remote Supabase migration apply, No remote Supabase migration history repair, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreAccountPreferencesBaselineApplyRunSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreAccountPreferencesBaselineApplyRun({
    accountPreferencesBaselineApplied: true,
    pendingMigrationNamesAfterApply: ["20260601000000_youtube_oauth_credentials.sql"],
    reviewedTargetMigrationName: youtubeEncryptedTokenStoreAccountPreferencesBaselineApplyRun.reviewedTargetMigration,
    finalOperatorConfirmationForYoutubeApply: false,
    requiresSecretOrTokenValue: false
  });

  return [
    `PR ${youtubeEncryptedTokenStoreAccountPreferencesBaselineApplyRun.prerequisiteBaselineResolutionGate.pullRequest} baseline resolution gate is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreAccountPreferencesBaselineApplyRun.implementationStage}.`,
    `Status: ${result.status}.`,
    `Baseline apply: ${youtubeEncryptedTokenStoreAccountPreferencesBaselineApplyRun.remoteSupabaseApply}.`,
    `Post-apply dry-run: ${youtubeEncryptedTokenStoreAccountPreferencesBaselineApplyRun.postApplyDryRun}.`,
    "The account/preferences foundation baseline is applied, but the reviewed YouTube migration apply still requires a fresh final operator confirmation.",
    "No YouTube OAuth credential migration apply, No migration-history repair, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
  ].join(" ");
}

export function createYouTubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRunSummary(): string {
  const result = assessYouTubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRun({
    youtubeOAuthCredentialsMigrationRemoteApplied: true,
    postApplyPendingMigrationNames: [],
    reviewedTargetMigrationName:
      youtubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRun.reviewedTargetMigration,
    credentialResolutionDisabledMaintained: true,
    serviceRoleSmokeExecuted: false,
    requiresSecretOrTokenValue: false
  });

  return [
    `PR ${youtubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRun.prerequisiteAccountPreferencesBaselineApplyRun.pullRequest} account/preferences baseline apply run is merged.`,
    `Stage: ${youtubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRun.implementationStage}.`,
    `Status: ${result.status}.`,
    `Remote apply: ${youtubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRun.remoteSupabaseApply}.`,
    `Post-apply dry-run: ${youtubeEncryptedTokenStoreYouTubeOAuthCredentialsRemoteApplyRun.postApplyDryRun}.`,
    "The reviewed YouTube OAuth credentials migration is confirmed in remote migration history, but the Codex process did not directly execute the apply command because the DB auth env was unavailable.",
    "No migration-history repair, No service-role smoke execution, No Google API live smoke, and No safe live YouTube OAuth smoke are run in this PR."
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
