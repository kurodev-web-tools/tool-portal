import "server-only";

export type CommentTranslatorDurablePersistenceDecisionId =
  | "usage-ledger"
  | "active-session-state"
  | "session-history"
  | "entitlement-state"
  | "admin-aggregates"
  | "abuse-rate-limit-buckets"
  | "provider-target-metadata";

export type CommentTranslatorDurablePersistenceDecision = {
  id: CommentTranslatorDurablePersistenceDecisionId;
  label: string;
  currentState: "in-memory-only" | "server-owned-reference-only" | "derived-sanitized-aggregate" | "operator-local-server-only";
  persistenceDecision:
    | "durable-required-before-public-operation"
    | "derived-from-durable-events"
    | "operator-local-server-only-consumption";
  requiredForPublicOperation: boolean;
  publicLaunchBlocker: boolean;
  proposedDurableStore: string;
  inMemoryFallbackBoundary: string;
  migrationPhase: string;
  clientReadableOutput: "sanitized-metadata-only" | "sanitized-aggregate-only" | "forbidden";
};

export type CommentTranslatorDurablePersistenceApprovalGate = {
  finalSchemaReview: boolean;
  rollbackReview: boolean;
  explicitInThreadApproval: boolean;
  sanitizedOutputReview: boolean;
  remoteApplyPreflight: boolean;
};

export type CommentTranslatorDurablePersistenceReadinessReport = {
  stage: typeof commentTranslatorDurablePersistenceReadinessContract.implementationStage;
  overallStatus: "blocked-pending-approved-durable-store" | "ready-for-approved-separate-migration-pr";
  publicLaunchAllowed: false;
  remoteSupabaseMigrationApplyStatus: "not-run" | "approval-gate-complete-but-not-run-in-this-pr";
  schemaProposal: typeof commentTranslatorDurablePersistenceReadinessContract.schemaProposal;
  outputPolicy: "sanitized-metadata-only";
  decisions: readonly CommentTranslatorDurablePersistenceDecision[];
  publicLaunchBlockers: readonly CommentTranslatorDurablePersistenceDecisionId[];
  missingApprovalGates: readonly string[];
  migrationOrdering: readonly string[];
  rollbackPlan: readonly string[];
  forbiddenReadableOutput: readonly string[];
};

export const commentTranslatorDurablePersistenceReadinessContract = {
  implementationStage: "pre-main-task-23-durable-persistence-schema-readiness",
  runtime: "server-only",
  schemaProposal: "reference-only-approval-gated",
  remoteSupabaseMigrationApply: "not-run-by-contract",
  remoteMutation: "not-run-by-contract",
  sqlMigrationFile: "not-added-in-task-23",
  browserStorage: "unchanged-forbidden-for-private-values",
  handoffPayload: "unchanged",
  publicLaunchCapability: "blocked-until-approved-durable-store",
  approvalGate: [
    "final schema review",
    "rollback review",
    "explicit in-thread approval",
    "sanitized output review",
    "remote apply preflight"
  ],
  requiredDurableTables: [
    "comment_translator_sessions",
    "comment_translator_usage_ledger_events",
    "comment_translator_entitlements",
    "comment_translator_admin_daily_aggregates",
    "comment_translator_abuse_rate_limit_buckets"
  ],
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "private-owner-reference-value",
    "private-provider-channel-reference-value",
    "live-chat-reference-value",
    "service-role-key-value",
    "authorization-header-value",
    "stripe-secret-key-value",
    "stripe-webhook-secret-value",
    "provider-target-metadata",
    "raw-comment-text",
    "provider-error-body",
    "raw-request-ip"
  ]
} as const;

export const commentTranslatorDurablePersistenceDecisions: readonly CommentTranslatorDurablePersistenceDecision[] = [
  {
    id: "usage-ledger",
    label: "usage ledger durability",
    currentState: "in-memory-only",
    persistenceDecision: "durable-required-before-public-operation",
    requiredForPublicOperation: true,
    publicLaunchBlocker: true,
    proposedDurableStore: "comment_translator_usage_ledger_events",
    inMemoryFallbackBoundary: "allowed only for local contracts and private-gated preview; fail closed for public enforcement reads",
    migrationPhase: "dual-write-server-owned-events",
    clientReadableOutput: "sanitized-metadata-only"
  },
  {
    id: "active-session-state",
    label: "active session state",
    currentState: "in-memory-only",
    persistenceDecision: "durable-required-before-public-operation",
    requiredForPublicOperation: true,
    publicLaunchBlocker: true,
    proposedDurableStore: "comment_translator_sessions",
    inMemoryFallbackBoundary: "allowed only as a short-lived runtime cache backed by durable session rows",
    migrationPhase: "switch-enforcement-reads-to-durable-store",
    clientReadableOutput: "sanitized-metadata-only"
  },
  {
    id: "session-history",
    label: "session history",
    currentState: "in-memory-only",
    persistenceDecision: "durable-required-before-public-operation",
    requiredForPublicOperation: true,
    publicLaunchBlocker: true,
    proposedDurableStore: "comment_translator_sessions",
    inMemoryFallbackBoundary: "not sufficient for public stop history, support review, or quota reset auditing",
    migrationPhase: "backfill-sanitized-history-from-available-local-evidence",
    clientReadableOutput: "sanitized-metadata-only"
  },
  {
    id: "entitlement-state",
    label: "entitlement persistence",
    currentState: "server-owned-reference-only",
    persistenceDecision: "durable-required-before-public-operation",
    requiredForPublicOperation: true,
    publicLaunchBlocker: true,
    proposedDurableStore: "comment_translator_entitlements",
    inMemoryFallbackBoundary: "missing or unreadable durable entitlement degrades to safe Free limits",
    migrationPhase: "create-durable-tables-and-policies",
    clientReadableOutput: "sanitized-metadata-only"
  },
  {
    id: "admin-aggregates",
    label: "admin aggregates",
    currentState: "derived-sanitized-aggregate",
    persistenceDecision: "derived-from-durable-events",
    requiredForPublicOperation: true,
    publicLaunchBlocker: true,
    proposedDurableStore: "comment_translator_admin_daily_aggregates",
    inMemoryFallbackBoundary: "allowed for local estimates only; public operations need durable event-derived aggregates",
    migrationPhase: "operator-verified-cutover",
    clientReadableOutput: "sanitized-aggregate-only"
  },
  {
    id: "abuse-rate-limit-buckets",
    label: "abuse/rate-limit buckets",
    currentState: "in-memory-only",
    persistenceDecision: "durable-required-before-public-operation",
    requiredForPublicOperation: true,
    publicLaunchBlocker: true,
    proposedDurableStore: "comment_translator_abuse_rate_limit_buckets or approved edge rate-limit control",
    inMemoryFallbackBoundary: "allowed only for deterministic local tests; distributed public traffic requires durable or edge-backed limits",
    migrationPhase: "keep-in-memory-fallback-fail-closed",
    clientReadableOutput: "sanitized-metadata-only"
  },
  {
    id: "provider-target-metadata",
    label: "provider target metadata",
    currentState: "operator-local-server-only",
    persistenceDecision: "operator-local-server-only-consumption",
    requiredForPublicOperation: false,
    publicLaunchBlocker: false,
    proposedDurableStore: "none in this readiness proposal",
    inMemoryFallbackBoundary: "operator-local env/server-only consumption only; never in client output, docs, PR text, browser storage, or handoff payload",
    migrationPhase: "not-persisted-in-task-23",
    clientReadableOutput: "forbidden"
  }
] as const;

export const commentTranslatorDurablePersistenceMigrationOrdering = [
  "freeze-new-public-sessions",
  "create-durable-tables-and-policies",
  "dual-write-server-owned-events",
  "backfill-sanitized-history-from-available-local-evidence",
  "switch-enforcement-reads-to-durable-store",
  "keep-in-memory-fallback-fail-closed",
  "operator-verified-cutover"
] as const;

export const commentTranslatorDurablePersistenceRollbackPlan = [
  "Disable new public session starts while preserving signed-in account access.",
  "Keep durable rows for audit and rollback evidence; do not export private values.",
  "Revert enforcement reads to safe Free limits only when durable reads are unavailable.",
  "Disable paid-limit activation before rolling back entitlement reads.",
  "Keep provider and billing execution approval-gated until sanitized verification is reviewed."
] as const;

export function createCommentTranslatorDurablePersistenceReadinessReport({
  approvalGate
}: {
  approvalGate: CommentTranslatorDurablePersistenceApprovalGate;
}): CommentTranslatorDurablePersistenceReadinessReport {
  const missingApprovalGates = [
    approvalGate.finalSchemaReview ? null : "final schema review",
    approvalGate.rollbackReview ? null : "rollback review",
    approvalGate.explicitInThreadApproval ? null : "explicit in-thread approval",
    approvalGate.sanitizedOutputReview ? null : "sanitized output review",
    approvalGate.remoteApplyPreflight ? null : "remote apply preflight"
  ].filter((gate): gate is string => Boolean(gate));

  return {
    stage: commentTranslatorDurablePersistenceReadinessContract.implementationStage,
    overallStatus:
      missingApprovalGates.length === 0
        ? "ready-for-approved-separate-migration-pr"
        : "blocked-pending-approved-durable-store",
    publicLaunchAllowed: false,
    remoteSupabaseMigrationApplyStatus:
      missingApprovalGates.length === 0 ? "approval-gate-complete-but-not-run-in-this-pr" : "not-run",
    schemaProposal: commentTranslatorDurablePersistenceReadinessContract.schemaProposal,
    outputPolicy: "sanitized-metadata-only",
    decisions: commentTranslatorDurablePersistenceDecisions,
    publicLaunchBlockers: commentTranslatorDurablePersistenceDecisions
      .filter((decision) => decision.publicLaunchBlocker)
      .map((decision) => decision.id),
    missingApprovalGates,
    migrationOrdering: commentTranslatorDurablePersistenceMigrationOrdering,
    rollbackPlan: commentTranslatorDurablePersistenceRollbackPlan,
    forbiddenReadableOutput: commentTranslatorDurablePersistenceReadinessContract.forbiddenReadableOutput
  };
}
