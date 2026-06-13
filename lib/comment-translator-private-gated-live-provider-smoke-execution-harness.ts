import "server-only";

export type CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessContract = {
  implementationStage: "task-27-private-gated-live-provider-smoke-execution-harness";
  runtime: "server-only";
  commandPath: "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs";
  outputPolicy: "sanitized-metadata-only";
  providerTargetLookup: "approval-gated-same-command-process";
  liveChatPolling: "approval-gated-bounded-one-step";
  translatorPipelineWiring: "implemented-sanitized-summary-only";
  providerTranslationExecution: "approval-gated-operator-local-server-only-provider";
  evidence: "counts-status-stop-reasons-only";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
};

export type Task27ProviderTargetLookupResult = {
  status: "target-present" | "target-absent" | "target-lookup-failed";
  providerTargetLookup: "executed-presence-only" | "not-run" | "failed-sanitized";
  liveChatTarget: "present" | "absent";
  stopReason?: Task27LiveProviderSmokeStopReason | null;
};

export type Task27LiveChatPollingResult = {
  status: "polling-completed" | "polling-stopped" | "polling-failed";
  liveChatPollingSmoke: "executed-bounded-readonly-one-step" | "not-run" | "failed-bounded-readonly-one-step";
  returnedItemCount: number;
  eligibleCommentCount: number;
  skippedCommentCount: number;
  stopReason: Task27LiveProviderSmokeStopReason | null;
};

export type Task27TranslationProviderResult = {
  status: "translation-completed" | "translation-stopped" | "translation-failed";
  providerRequestCount: number;
  providerCallCount: number;
  translatedCount: number;
  skippedCount: number;
  languagePolicySkippedCount: number;
  perMinuteSkippedCount: number;
  providerUnavailableSkippedCount: number;
  recoverableErrorCount: number;
  terminalErrorCount: number;
  stopReason: Task27LiveProviderSmokeStopReason | null;
};

export type Task27LiveProviderSmokeStopReason =
  | "stream-ended"
  | "stream-unavailable"
  | "auth-failed"
  | "provider-quota-stop"
  | "global-budget-stop"
  | "ai-budget-stop"
  | "translated-message-cap"
  | "terminal-provider-error";

export type CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessRequest = {
  credentialReferenceId: string;
  providerTargetLookupReady: boolean;
  liveChatTargetPresent: boolean;
  liveChatPollingReady: boolean;
  translationProviderReady: boolean;
  sanitizedOutputReviewConfirmed: boolean;
  explicitApprovalConfirmed: boolean;
  targetLookup: () => Promise<Task27ProviderTargetLookupResult>;
  pollLiveChatOnce: () => Promise<Task27LiveChatPollingResult>;
  translateEligibleComments: () => Promise<Task27TranslationProviderResult>;
};

export type CommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters = {
  adapterWiring: "operator-local-runtime-adapters-connected";
  targetLookup: CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessRequest["targetLookup"];
  pollLiveChatOnce: CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessRequest["pollLiveChatOnce"];
  translateEligibleComments: CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessRequest["translateEligibleComments"];
};

export type CommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapterSourceRequest = {
  targetLookup: () => Promise<Record<string, unknown>>;
  pollLiveChatOnce: () => Promise<Record<string, unknown>>;
  translateEligibleComments: () => Promise<Record<string, unknown>>;
};

export type CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessWithOperatorLocalAdaptersRequest = Omit<
  CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessRequest,
  "targetLookup" | "pollLiveChatOnce" | "translateEligibleComments"
> & {
  adapters: CommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters;
};

export type CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessResult =
  | {
      status: "task-27-live-provider-smoke-sanitized-result";
      command: "task-27-private-gated-live-provider-smoke-execution-harness";
      outputPolicy: "sanitized-metadata-only";
      credentialReferenceId: string;
      liveProviderExecution: "approved-bounded-execution";
      translatorPipelineWiring: "implemented-sanitized-summary-only";
      evidence: {
        providerTargetLookup: "executed-presence-only";
        liveChatPollingSmoke: "executed-bounded-readonly-one-step";
        translationProviderExecution: "executed-server-only-provider";
        returnedItemCount: number;
        eligibleCommentCount: number;
        providerRequestCount: number;
        providerCallCount: number;
        translatedCount: number;
        skippedCount: number;
        languagePolicySkippedCount: number;
        perMinuteSkippedCount: number;
        providerUnavailableSkippedCount: number;
        recoverableErrorCount: number;
        terminalErrorCount: number;
        stopReason: Task27LiveProviderSmokeStopReason | null;
      };
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      authorizationHeaderValue: "never-returned-by-design";
      rawCommentText: "never-returned-by-design";
      browserStorage: "unchanged";
      handoffPayload: "unchanged";
    }
  | {
      status:
        | "blocked-provider-target-lookup-not-ready"
        | "blocked-live-chat-target-not-present"
        | "blocked-live-chat-polling-not-ready"
        | "blocked-translation-provider-not-ready"
        | "blocked-sanitized-output-review-not-confirmed"
        | "blocked-pending-explicit-private-gated-live-provider-smoke-approval"
        | "blocked-target-lookup-sanitized"
        | "blocked-polling-sanitized"
        | "blocked-translation-sanitized";
      command: "task-27-private-gated-live-provider-smoke-execution-harness";
      outputPolicy: "sanitized-metadata-only";
      credentialReferenceId: string;
      liveProviderExecution: "not-run" | "aborted-after-approved-target-lookup" | "aborted-after-approved-polling";
      providerTargetLookup: "not-run" | "executed-presence-only";
      liveChatPollingSmoke: "not-run" | "executed-bounded-readonly-one-step";
      translationProviderExecution: "not-run";
      translatorPipelineWiring: "implemented-sanitized-summary-only";
      stopReason: Task27LiveProviderSmokeStopReason | null;
      reason: string;
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      authorizationHeaderValue: "never-returned-by-design";
      rawCommentText: "never-returned-by-design";
      browserStorage: "unchanged";
      handoffPayload: "unchanged";
    };

export const commentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessContract = {
  implementationStage: "task-27-private-gated-live-provider-smoke-execution-harness",
  runtime: "server-only",
  commandPath: "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
  outputPolicy: "sanitized-metadata-only",
  providerTargetLookup: "approval-gated-same-command-process",
  liveChatPolling: "approval-gated-bounded-one-step",
  translatorPipelineWiring: "implemented-sanitized-summary-only",
  providerTranslationExecution: "approval-gated-operator-local-server-only-provider",
  evidence: "counts-status-stop-reasons-only",
  browserStorage: "unchanged",
  handoffPayload: "unchanged"
} as const satisfies CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessContract;

export function createCommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters(
  request: CommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapterSourceRequest
): CommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters {
  return {
    adapterWiring: "operator-local-runtime-adapters-connected",
    async targetLookup() {
      return mapOperatorLocalTargetLookupResult(await request.targetLookup());
    },
    async pollLiveChatOnce() {
      return mapOperatorLocalPollingResult(await request.pollLiveChatOnce());
    },
    async translateEligibleComments() {
      return mapOperatorLocalTranslationResult(await request.translateEligibleComments());
    }
  };
}

export async function runCommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessWithOperatorLocalAdapters(
  request: CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessWithOperatorLocalAdaptersRequest
): Promise<CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessResult> {
  return runCommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarness({
    ...request,
    targetLookup: request.adapters.targetLookup,
    pollLiveChatOnce: request.adapters.pollLiveChatOnce,
    translateEligibleComments: request.adapters.translateEligibleComments
  });
}

export async function runCommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarness(
  request: CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessRequest
): Promise<CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessResult> {
  const prerequisiteBlocker = validatePrerequisites(request);
  if (prerequisiteBlocker) {
    return prerequisiteBlocker;
  }

  const targetLookup = await request.targetLookup();
  if (targetLookup.status !== "target-present" || targetLookup.liveChatTarget !== "present") {
    return blocked("blocked-target-lookup-sanitized", request.credentialReferenceId, {
      liveProviderExecution: "not-run",
      providerTargetLookup: targetLookup.providerTargetLookup === "executed-presence-only" ? "executed-presence-only" : "not-run",
      liveChatPollingSmoke: "not-run",
      stopReason: targetLookup.stopReason ?? "stream-unavailable",
      reason: "provider target lookup did not produce presence-only ready evidence"
    });
  }

  const polling = await request.pollLiveChatOnce();
  if (polling.status !== "polling-completed" || polling.liveChatPollingSmoke !== "executed-bounded-readonly-one-step") {
    return blocked("blocked-polling-sanitized", request.credentialReferenceId, {
      liveProviderExecution: "aborted-after-approved-target-lookup",
      providerTargetLookup: "executed-presence-only",
      liveChatPollingSmoke:
        polling.liveChatPollingSmoke === "executed-bounded-readonly-one-step"
          ? "executed-bounded-readonly-one-step"
          : "not-run",
      stopReason: polling.stopReason ?? "terminal-provider-error",
      reason: "bounded Live Chat polling did not complete with sanitized ready evidence"
    });
  }
  if (nonNegativeInteger(polling.eligibleCommentCount) < 1) {
    return blocked("blocked-polling-sanitized", request.credentialReferenceId, {
      liveProviderExecution: "aborted-after-approved-target-lookup",
      providerTargetLookup: "executed-presence-only",
      liveChatPollingSmoke: "executed-bounded-readonly-one-step",
      stopReason: polling.stopReason,
      reason: "bounded Live Chat polling did not include eligible comments"
    });
  }

  const translation = await request.translateEligibleComments();
  if (translation.status !== "translation-completed") {
    return blocked("blocked-translation-sanitized", request.credentialReferenceId, {
      liveProviderExecution: "aborted-after-approved-polling",
      providerTargetLookup: "executed-presence-only",
      liveChatPollingSmoke: "executed-bounded-readonly-one-step",
      stopReason: translation.stopReason ?? "terminal-provider-error",
      reason: "translation provider execution did not complete with sanitized evidence"
    });
  }

  return {
    status: "task-27-live-provider-smoke-sanitized-result",
    command: "task-27-private-gated-live-provider-smoke-execution-harness",
    outputPolicy: "sanitized-metadata-only",
    credentialReferenceId: request.credentialReferenceId,
    liveProviderExecution: "approved-bounded-execution",
    translatorPipelineWiring: "implemented-sanitized-summary-only",
    evidence: {
      providerTargetLookup: "executed-presence-only",
      liveChatPollingSmoke: "executed-bounded-readonly-one-step",
      translationProviderExecution: "executed-server-only-provider",
      returnedItemCount: nonNegativeInteger(polling.returnedItemCount),
      eligibleCommentCount: nonNegativeInteger(polling.eligibleCommentCount),
      providerRequestCount: nonNegativeInteger(translation.providerRequestCount),
      providerCallCount: nonNegativeInteger(translation.providerCallCount),
      translatedCount: nonNegativeInteger(translation.translatedCount),
      skippedCount: nonNegativeInteger(polling.skippedCommentCount) + nonNegativeInteger(translation.skippedCount),
      languagePolicySkippedCount: nonNegativeInteger(translation.languagePolicySkippedCount),
      perMinuteSkippedCount: nonNegativeInteger(translation.perMinuteSkippedCount),
      providerUnavailableSkippedCount: nonNegativeInteger(translation.providerUnavailableSkippedCount),
      recoverableErrorCount: nonNegativeInteger(translation.recoverableErrorCount),
      terminalErrorCount: nonNegativeInteger(translation.terminalErrorCount),
      stopReason: translation.stopReason ?? polling.stopReason
    },
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    authorizationHeaderValue: "never-returned-by-design",
    rawCommentText: "never-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged"
  };
}

function validatePrerequisites(
  request: CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessRequest
): CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessResult | null {
  if (!request.providerTargetLookupReady) {
    return blocked("blocked-provider-target-lookup-not-ready", request.credentialReferenceId, {
      reason: "provider target lookup ready preflight is missing"
    });
  }

  if (!request.liveChatTargetPresent) {
    return blocked("blocked-live-chat-target-not-present", request.credentialReferenceId, {
      reason: "Live Chat target presence-only evidence is missing",
      stopReason: "stream-unavailable"
    });
  }

  if (!request.liveChatPollingReady) {
    return blocked("blocked-live-chat-polling-not-ready", request.credentialReferenceId, {
      reason: "Live Chat polling ready preflight is missing"
    });
  }

  if (!request.translationProviderReady) {
    return blocked("blocked-translation-provider-not-ready", request.credentialReferenceId, {
      reason: "translation provider ready preflight is missing",
      stopReason: "terminal-provider-error"
    });
  }

  if (!request.sanitizedOutputReviewConfirmed) {
    return blocked("blocked-sanitized-output-review-not-confirmed", request.credentialReferenceId, {
      reason: "sanitized output review is required before provider-affecting execution"
    });
  }

  if (!request.explicitApprovalConfirmed) {
    return blocked("blocked-pending-explicit-private-gated-live-provider-smoke-approval", request.credentialReferenceId, {
      reason: "same-thread explicit approval is required for the exact Task 27 command"
    });
  }

  return null;
}

function blocked(
  status: Extract<CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessResult, { reason: string }>["status"],
  credentialReferenceId: string,
  overrides: Partial<Extract<CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessResult, { reason: string }>> = {}
): Extract<CommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessResult, { reason: string }> {
  return {
    status,
    command: "task-27-private-gated-live-provider-smoke-execution-harness",
    outputPolicy: "sanitized-metadata-only",
    credentialReferenceId,
    liveProviderExecution: "not-run",
    providerTargetLookup: "not-run",
    liveChatPollingSmoke: "not-run",
    translationProviderExecution: "not-run",
    translatorPipelineWiring: "implemented-sanitized-summary-only",
    stopReason: null,
    reason: "Task 27 execution harness prerequisite is missing",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    authorizationHeaderValue: "never-returned-by-design",
    rawCommentText: "never-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    ...overrides
  };
}

function nonNegativeInteger(value: number) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function mapOperatorLocalTargetLookupResult(result: Record<string, unknown>): Task27ProviderTargetLookupResult {
  if (result.status === "live-chat-target-lookup-sanitized-result" && result.liveChatTarget === "present") {
    return {
      status: "target-present",
      providerTargetLookup: "executed-presence-only",
      liveChatTarget: "present"
    };
  }

  if (typeof result.status === "string" && result.status.includes("failed")) {
    return {
      status: "target-lookup-failed",
      providerTargetLookup: "failed-sanitized",
      liveChatTarget: "absent",
      stopReason: "terminal-provider-error"
    };
  }

  return {
    status: "target-absent",
    providerTargetLookup: result.liveChatTargetLookup === "executed-bounded-readonly-one-step" ? "executed-presence-only" : "not-run",
    liveChatTarget: "absent",
    stopReason: "stream-unavailable"
  };
}

function mapOperatorLocalPollingResult(result: Record<string, unknown>): Task27LiveChatPollingResult {
  const responseMetadata = asRecord(result.responseMetadata);
  const returnedItemCount = readCount(responseMetadata.returnedItemCount);
  const eligibleCommentCount = readCount(result.eligibleCommentCount ?? responseMetadata.eligibleCommentCount ?? returnedItemCount);
  const skippedCommentCount = readCount(result.skippedCommentCount);

  if (result.status === "live-chat-polling-smoke-sanitized-result" && result.liveChatPollingSmoke === "executed-bounded-readonly-one-step") {
    return {
      status: "polling-completed",
      liveChatPollingSmoke: "executed-bounded-readonly-one-step",
      returnedItemCount,
      eligibleCommentCount,
      skippedCommentCount,
      stopReason: mapStopReason(result.stopReason)
    };
  }

  if (typeof result.status === "string" && result.status.includes("failed")) {
    return {
      status: "polling-failed",
      liveChatPollingSmoke: "failed-bounded-readonly-one-step",
      returnedItemCount: 0,
      eligibleCommentCount: 0,
      skippedCommentCount: 0,
      stopReason: "terminal-provider-error"
    };
  }

  return {
    status: "polling-stopped",
    liveChatPollingSmoke: "not-run",
    returnedItemCount: 0,
    eligibleCommentCount: 0,
    skippedCommentCount: 0,
    stopReason: mapStopReason(result.stopReason) ?? "stream-unavailable"
  };
}

function mapOperatorLocalTranslationResult(result: Record<string, unknown>): Task27TranslationProviderResult {
  if (result.status === "completed") {
    return {
      status: "translation-completed",
      providerRequestCount: readCount(result.providerRequestCount),
      providerCallCount: readCount(result.providerCallCount),
      translatedCount: readCount(result.translatedCount),
      skippedCount: readCount(result.skippedCount),
      languagePolicySkippedCount: readCount(asRecord(result.skipsByReason).languagePolicy),
      perMinuteSkippedCount: readCount(asRecord(result.skipsByReason).perMinuteCap),
      providerUnavailableSkippedCount: readCount(asRecord(result.skipsByReason).providerUnavailable),
      recoverableErrorCount: readCount(asRecord(result.errorCounts).recoverable),
      terminalErrorCount: readCount(asRecord(result.errorCounts).terminal),
      stopReason: mapStopReason(result.stopReason)
    };
  }

  if (result.status === "blocked-abuse-rate-limit") {
    return {
      status: "translation-stopped",
      providerRequestCount: 0,
      providerCallCount: 0,
      translatedCount: 0,
      skippedCount: readCount(result.skippedCount),
      languagePolicySkippedCount: readCount(asRecord(result.skipsByReason).languagePolicy),
      perMinuteSkippedCount: readCount(asRecord(result.skipsByReason).perMinuteCap),
      providerUnavailableSkippedCount: readCount(asRecord(result.skipsByReason).providerUnavailable),
      recoverableErrorCount: readCount(asRecord(result.errorCounts).recoverable),
      terminalErrorCount: readCount(asRecord(result.errorCounts).terminal),
      stopReason: "translated-message-cap"
    };
  }

  return {
    status: "translation-failed",
    providerRequestCount: readCount(result.providerRequestCount),
    providerCallCount: readCount(result.providerCallCount),
    translatedCount: readCount(result.translatedCount),
    skippedCount: readCount(result.skippedCount),
    languagePolicySkippedCount: readCount(asRecord(result.skipsByReason).languagePolicy),
    perMinuteSkippedCount: readCount(asRecord(result.skipsByReason).perMinuteCap),
    providerUnavailableSkippedCount: readCount(asRecord(result.skipsByReason).providerUnavailable),
    recoverableErrorCount: readCount(asRecord(result.errorCounts).recoverable),
    terminalErrorCount: readCount(asRecord(result.errorCounts).terminal),
    stopReason: mapStopReason(result.stopReason) ?? "terminal-provider-error"
  };
}

function readCount(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}

function mapStopReason(value: unknown): Task27LiveProviderSmokeStopReason | null {
  if (
    value === "stream-ended" ||
    value === "stream-unavailable" ||
    value === "auth-failed" ||
    value === "provider-quota-stop" ||
    value === "global-budget-stop" ||
    value === "ai-budget-stop" ||
    value === "translated-message-cap" ||
    value === "terminal-provider-error"
  ) {
    return value;
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
