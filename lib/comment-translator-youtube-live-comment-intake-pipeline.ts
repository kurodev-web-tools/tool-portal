import "server-only";

import type {
  CommentTranslationCacheKeyMaterial,
  CommentTranslationProvider,
  CommentTranslationProviderRequest,
  CommentTranslationProviderResult,
  CommentTranslationUsageHandoff
} from "./comment-translator-provider-boundary";
import {
  evaluateCommentTranslatorLanguagePolicy,
  normalizeCommentTranslatorTextForPolicyDedupe,
  type CommentTranslatorLanguagePolicyAcceptedComment
} from "./comment-translator-language-policy-runtime";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";
import type { YouTubeLiveChatPollingStepResult } from "./comment-translator-youtube-runtime-foundation";

export type YouTubeLiveCommentIntakePipelineContract = {
  implementationStage: "live-comment-intake-to-translator-pipeline";
  source: "youtube-live-chat-polling-step-result";
  inputBoundary: "youtube-provider-safe-comment-payload-only";
  translatorInputKind: "live-comment";
  serverOnlyDataFlow: "polling-result-to-injected-translator-provider";
  providerExecution: "injected-server-only-provider-only";
  providerTargetMetadata: "operator-local-server-only-consumed-never-returned";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  uiRewiring: "not-implemented";
  pollingLoop: "not-implemented";
  quotaWrite: "not-implemented";
  remoteMutation: "not-implemented";
  abortBehavior: readonly [
    "abort-terminal-polling-state-before-provider-call",
    "skip-empty-polling-result-before-provider-call",
    "skip-blank-comment-text-before-provider-call",
    "apply-filtering-language-policy-before-provider-call"
  ];
};

export type YouTubeLiveCommentIntakePipelineRequest = {
  pollingResult: YouTubeLiveChatPollingStepResult;
  targetLanguage: string;
  sourceLanguages?: readonly string[];
  glossaryTerms?: readonly string[];
  glossaryVersion?: string | null;
  providerCapabilityVersion?: string;
  moderationPolicyVersion?: string;
};

export type YouTubeLiveCommentIntakePipelineCommentRequest = Omit<YouTubeLiveCommentIntakePipelineRequest, "pollingResult"> & {
  comments: readonly YouTubeProviderSafeCommentPayload[];
};

export type YouTubeLiveCommentIntakePipelineRunRequest = YouTubeLiveCommentIntakePipelineRequest & {
  provider: CommentTranslationProvider;
};

type YouTubeLiveCommentIntakeSanitizedSummary = {
  acceptedCommentCount: number;
  skippedCommentCount: number;
  textPayload: "server-only-translator-provider-input";
  allowedCommentFields: readonly ["commentId", "publishedAt", "text", "platformLanguageHint", "authorDisplayName"];
  forbiddenMetadata: "not-returned-by-design";
};

type YouTubeLiveCommentIntakePipelineResultBase = {
  implementationStage: YouTubeLiveCommentIntakePipelineContract["implementationStage"];
  source: YouTubeLiveCommentIntakePipelineContract["source"];
  inputBoundary: YouTubeLiveCommentIntakePipelineContract["inputBoundary"];
  translatorInputKind: YouTubeLiveCommentIntakePipelineContract["translatorInputKind"];
  serverOnlyDataFlow: YouTubeLiveCommentIntakePipelineContract["serverOnlyDataFlow"];
  providerExecution: YouTubeLiveCommentIntakePipelineContract["providerExecution"];
  providerTargetMetadata: "not-returned-by-design";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  uiRewiring: "not-implemented";
  pollingLoop: "not-implemented";
  quotaWrite: "not-implemented";
  remoteMutation: "not-implemented";
};

export type YouTubeLiveCommentIntakePipelineBridgeResult =
  | (YouTubeLiveCommentIntakePipelineResultBase & {
      status: "ready-for-translator-pipeline";
      providerRequests: readonly CommentTranslationProviderRequest[];
      providerRequestCount: number;
      skippedCommentCount: number;
      sanitizedIntake: YouTubeLiveCommentIntakeSanitizedSummary;
    })
  | (YouTubeLiveCommentIntakePipelineResultBase & {
      status: "aborted-terminal-polling-state" | "no-live-comments-to-translate";
      providerRequests: readonly [];
      providerRequestCount: 0;
      skippedCommentCount: number;
      reason: string;
      sanitizedIntake: YouTubeLiveCommentIntakeSanitizedSummary;
    })
  | (YouTubeLiveCommentIntakePipelineResultBase & {
      status: "language-policy-rejected";
      providerRequests: readonly [];
      providerRequestCount: 0;
      skippedCommentCount: number;
      reason: string;
      sanitizedIntake: YouTubeLiveCommentIntakeSanitizedSummary;
    });

export type YouTubeLiveCommentIntakePipelineRunResult =
  | (YouTubeLiveCommentIntakePipelineResultBase & {
      status: "translated-live-comment-intake";
      providerRequestCount: number;
      providerResultCount: number;
      providerResults: readonly CommentTranslationProviderResult[];
      sanitizedIntake: YouTubeLiveCommentIntakeSanitizedSummary;
    })
  | (YouTubeLiveCommentIntakePipelineResultBase & {
      status:
        | "aborted-terminal-polling-state"
        | "no-live-comments-to-translate"
        | "language-policy-rejected"
        | "blocked-non-server-translator-provider";
      providerRequestCount: 0;
      providerResultCount: 0;
      providerResults: readonly [];
      skippedCommentCount: number;
      reason: string;
      sanitizedIntake: YouTubeLiveCommentIntakeSanitizedSummary;
    });

const allowedCommentFields = ["commentId", "publishedAt", "text", "platformLanguageHint", "authorDisplayName"] as const;

export const youtubeLiveCommentIntakePipelineContract = {
  implementationStage: "live-comment-intake-to-translator-pipeline",
  source: "youtube-live-chat-polling-step-result",
  inputBoundary: "youtube-provider-safe-comment-payload-only",
  translatorInputKind: "live-comment",
  serverOnlyDataFlow: "polling-result-to-injected-translator-provider",
  providerExecution: "injected-server-only-provider-only",
  providerTargetMetadata: "operator-local-server-only-consumed-never-returned",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  uiRewiring: "not-implemented",
  pollingLoop: "not-implemented",
  quotaWrite: "not-implemented",
  remoteMutation: "not-implemented",
  abortBehavior: [
    "abort-terminal-polling-state-before-provider-call",
    "skip-empty-polling-result-before-provider-call",
    "skip-blank-comment-text-before-provider-call",
    "apply-filtering-language-policy-before-provider-call"
  ]
} as const satisfies YouTubeLiveCommentIntakePipelineContract;

export function createYouTubeLiveCommentTranslatorPipelineRequests(
  request: YouTubeLiveCommentIntakePipelineRequest
): YouTubeLiveCommentIntakePipelineBridgeResult {
  const skippedCommentCount = request.pollingResult.comments.filter((comment) => !comment.text.trim()).length;

  if (request.pollingResult.state.terminal) {
    return {
      ...createResultBase(),
      status: "aborted-terminal-polling-state",
      providerRequests: [],
      providerRequestCount: 0,
      skippedCommentCount: request.pollingResult.comments.length,
      reason: "live chat polling state is terminal",
      sanitizedIntake: createSanitizedIntakeSummary({
        acceptedCommentCount: 0,
        skippedCommentCount: request.pollingResult.comments.length
      })
    };
  }

  const acceptedComments = request.pollingResult.comments.filter((comment) => comment.text.trim());
  if (acceptedComments.length === 0) {
    return {
      ...createResultBase(),
      status: "no-live-comments-to-translate",
      providerRequests: [],
      providerRequestCount: 0,
      skippedCommentCount,
      reason: "polling result did not include translatable live comments",
      sanitizedIntake: createSanitizedIntakeSummary({
        acceptedCommentCount: 0,
        skippedCommentCount
      })
    };
  }

  const languagePolicy = evaluateCommentTranslatorLanguagePolicy({
    sourceLanguages: request.sourceLanguages,
    targetLanguage: request.targetLanguage,
    comments: acceptedComments,
    policyVersion: request.moderationPolicyVersion ?? "live-comment-moderation-v1"
  });

  if (languagePolicy.status === "rejected") {
    return {
      ...createResultBase(),
      status: "language-policy-rejected",
      providerRequests: [],
      providerRequestCount: 0,
      skippedCommentCount: request.pollingResult.comments.length,
      reason: languagePolicy.clientReadableDetail,
      sanitizedIntake: createSanitizedIntakeSummary({
        acceptedCommentCount: 0,
        skippedCommentCount: request.pollingResult.comments.length
      })
    };
  }

  const policyCommentByCommentId = new Map(languagePolicy.acceptedComments.map((comment) => [comment.commentId, comment]));
  const policyAcceptedComments = acceptedComments.filter((comment) => policyCommentByCommentId.has(comment.commentId));
  const policySkippedCommentCount = languagePolicy.skippedComments.length;

  const providerRequests = policyAcceptedComments.map((comment) =>
    createProviderRequest({
      comment,
      policyComment: policyCommentByCommentId.get(comment.commentId),
      targetLanguage: request.targetLanguage,
      glossaryTerms: request.glossaryTerms ?? [],
      glossaryVersion: request.glossaryVersion ?? null,
      providerCapabilityVersion: request.providerCapabilityVersion ?? "live-comment-provider-v1",
      moderationPolicyVersion: request.moderationPolicyVersion ?? "live-comment-moderation-v1"
    })
  );

  return {
    ...createResultBase(),
    status: "ready-for-translator-pipeline",
    providerRequests,
    providerRequestCount: providerRequests.length,
    skippedCommentCount: skippedCommentCount + policySkippedCommentCount,
    sanitizedIntake: createSanitizedIntakeSummary({
      acceptedCommentCount: providerRequests.length,
      skippedCommentCount: skippedCommentCount + policySkippedCommentCount
    })
  };
}

export function createYouTubeLiveCommentTranslatorPipelineRequestsForComments(
  request: YouTubeLiveCommentIntakePipelineCommentRequest
): YouTubeLiveCommentIntakePipelineBridgeResult {
  return createYouTubeLiveCommentTranslatorPipelineRequests({
    ...request,
    pollingResult: {
      state: {
        liveChatId: "server-only-placeholder-never-returned",
        nextPageToken: null,
        retryCount: 0,
        nextPollAfterMs: 0,
        terminal: null
      },
      comments: request.comments
    }
  });
}

export async function runYouTubeLiveCommentTranslatorPipeline(
  request: YouTubeLiveCommentIntakePipelineRunRequest
): Promise<YouTubeLiveCommentIntakePipelineRunResult> {
  const bridge = createYouTubeLiveCommentTranslatorPipelineRequests(request);
  if (bridge.status !== "ready-for-translator-pipeline") {
    return {
      ...createResultBase(),
      status: bridge.status,
      providerRequestCount: 0,
      providerResultCount: 0,
      providerResults: [],
      skippedCommentCount: bridge.skippedCommentCount,
      reason: bridge.reason,
      sanitizedIntake: bridge.sanitizedIntake
    };
  }

  if (!isServerOnlyTranslatorProvider(request.provider)) {
    return {
      ...createResultBase(),
      status: "blocked-non-server-translator-provider",
      providerRequestCount: 0,
      providerResultCount: 0,
      providerResults: [],
      skippedCommentCount: bridge.skippedCommentCount,
      reason: "translator provider must be server-runtime-only with forbidden client, fixture, and docs secret boundaries",
      sanitizedIntake: bridge.sanitizedIntake
    };
  }

  const providerResults: CommentTranslationProviderResult[] = [];
  for (const providerRequest of bridge.providerRequests) {
    providerResults.push(await request.provider.translate(providerRequest));
  }

  return {
    ...createResultBase(),
    status: "translated-live-comment-intake",
    providerRequestCount: bridge.providerRequestCount,
    providerResultCount: providerResults.length,
    providerResults,
    sanitizedIntake: bridge.sanitizedIntake
  };
}

function createProviderRequest({
  comment,
  policyComment,
  targetLanguage,
  glossaryTerms,
  glossaryVersion,
  providerCapabilityVersion,
  moderationPolicyVersion
}: {
  comment: YouTubeProviderSafeCommentPayload;
  policyComment?: CommentTranslatorLanguagePolicyAcceptedComment;
  targetLanguage: string;
  glossaryTerms: readonly string[];
  glossaryVersion: string | null;
  providerCapabilityVersion: string;
  moderationPolicyVersion: string;
}): CommentTranslationProviderRequest {
  const normalizedTextHash = createStableTextHash(comment.text);
  const sourceLanguage =
    policyComment?.detectedLanguage.providerLanguageCode ?? normalizeProviderLanguageCode(comment.platformLanguageHint) ?? "auto";
  const normalizedTargetLanguage = normalizeProviderLanguageCode(targetLanguage) ?? targetLanguage;

  return {
    requestId: `youtube-live-comment:${comment.commentId}`,
    input: {
      kind: "live-comment",
      text: comment.text.trim(),
      sourceLanguage,
      targetLanguage: normalizedTargetLanguage
    },
    glossary: {
      terms: glossaryTerms,
      version: glossaryVersion
    },
    cache: {
      lookupKey: [
        "youtube-live-comment",
        normalizedTextHash,
        sourceLanguage,
        normalizedTargetLanguage,
        providerCapabilityVersion,
        glossaryVersion ?? "no-glossary",
        moderationPolicyVersion
      ].join(":"),
      keyMaterial: createCacheKeyMaterial({
        normalizedTextHash,
        sourceLanguage,
        targetLanguage: normalizedTargetLanguage,
        providerCapabilityVersion,
        glossaryVersion,
        moderationPolicyVersion
      })
    },
    privacy: {
      logRetention: "short-lived-only",
      rawTextLogging: "disabled-by-default",
      piiMinimization: "exclude-author-and-channel-identifiers",
      moderationSkipReason: null
    },
    usageHandoff: createUsageHandoff({
      commentId: comment.commentId,
      cacheOutcome: "miss"
    })
  };
}

function createCacheKeyMaterial({
  normalizedTextHash,
  sourceLanguage,
  targetLanguage,
  providerCapabilityVersion,
  glossaryVersion,
  moderationPolicyVersion
}: {
  normalizedTextHash: string;
  sourceLanguage: string;
  targetLanguage: string;
  providerCapabilityVersion: string;
  glossaryVersion: string | null;
  moderationPolicyVersion: string;
}): CommentTranslationCacheKeyMaterial {
  return {
    normalizedTextHash,
    sourceLanguage,
    targetLanguage,
    providerCapabilityVersion,
    glossaryVersion,
    moderationPolicyVersion,
    excludes: [
      "authorName",
      "channelId",
      "viewerId",
      "streamId",
      "rawSecret",
      "oauthToken",
      "refreshToken",
      "authorizationCode",
      "providerTargetIdentifier",
      "pollingCursor",
      "ownerIdentifier",
      "authorizationHeader",
      "serviceRoleKey",
      "browserLocalHandoffMaterial",
      "liveChatId",
      "providerChannelId",
      "rawProviderTargetMetadata"
    ]
  };
}

function normalizeProviderLanguageCode(language: string | null | undefined) {
  const normalized = language?.trim().toLocaleLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "kr" || normalized === "ko" || normalized === "korean") {
    return "ko";
  }

  if (normalized === "cn" || normalized === "zh" || normalized === "chinese") {
    return "zh";
  }

  if (normalized === "ja" || normalized === "jp" || normalized === "japanese") {
    return "ja";
  }

  if (normalized === "en" || normalized === "eng" || normalized === "english") {
    return "en";
  }

  return normalized;
}

function createUsageHandoff({
  commentId,
  cacheOutcome
}: {
  commentId: string;
  cacheOutcome: CommentTranslationUsageHandoff["cacheOutcome"];
}): CommentTranslationUsageHandoff {
  return {
    meteringEventId: `youtube-live-comment:${commentId}`,
    providerId: "pending-provider-selection",
    billingCategory: "translation",
    estimatedUnits: 1,
    cacheOutcome,
    enforcement: "not-implemented",
    databaseWrite: "not-implemented",
    logPolicy: "short-lived-provider-diagnostic-only"
  };
}

function createResultBase(): YouTubeLiveCommentIntakePipelineResultBase {
  return {
    implementationStage: youtubeLiveCommentIntakePipelineContract.implementationStage,
    source: youtubeLiveCommentIntakePipelineContract.source,
    inputBoundary: youtubeLiveCommentIntakePipelineContract.inputBoundary,
    translatorInputKind: youtubeLiveCommentIntakePipelineContract.translatorInputKind,
    serverOnlyDataFlow: youtubeLiveCommentIntakePipelineContract.serverOnlyDataFlow,
    providerExecution: youtubeLiveCommentIntakePipelineContract.providerExecution,
    providerTargetMetadata: "not-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    uiRewiring: "not-implemented",
    pollingLoop: "not-implemented",
    quotaWrite: "not-implemented",
    remoteMutation: "not-implemented"
  };
}

function createSanitizedIntakeSummary({
  acceptedCommentCount,
  skippedCommentCount
}: {
  acceptedCommentCount: number;
  skippedCommentCount: number;
}): YouTubeLiveCommentIntakeSanitizedSummary {
  return {
    acceptedCommentCount,
    skippedCommentCount,
    textPayload: "server-only-translator-provider-input",
    allowedCommentFields,
    forbiddenMetadata: "not-returned-by-design"
  };
}

function isServerOnlyTranslatorProvider(provider: CommentTranslationProvider): boolean {
  return (
    provider.runtimeScope === "server-runtime-only" &&
    provider.secretBoundary.runtime === "server-env-only" &&
    provider.secretBoundary.clientBundle === "forbidden" &&
    provider.secretBoundary.fixtures === "forbidden" &&
    provider.secretBoundary.docsAndTaskNotes === "no-secret-values"
  );
}

function createStableTextHash(text: string): string {
  const normalizedText = normalizeCommentTranslatorTextForPolicyDedupe(text);
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalizedText.length; index += 1) {
    hash ^= normalizedText.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
