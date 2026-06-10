import "server-only";

import type {
  CommentTranslationCacheKeyMaterial,
  CommentTranslationProvider,
  CommentTranslationProviderRequest,
  CommentTranslationProviderResult,
  CommentTranslationUsageHandoff
} from "./comment-translator-provider-boundary";
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
    "skip-blank-comment-text-before-provider-call"
  ];
};

export type YouTubeLiveCommentIntakePipelineRequest = {
  pollingResult: YouTubeLiveChatPollingStepResult;
  targetLanguage: string;
  glossaryTerms?: readonly string[];
  glossaryVersion?: string | null;
  providerCapabilityVersion?: string;
  moderationPolicyVersion?: string;
};

export type YouTubeLiveCommentIntakePipelineRunRequest = YouTubeLiveCommentIntakePipelineRequest & {
  provider: CommentTranslationProvider;
};

type YouTubeLiveCommentIntakeSanitizedSummary = {
  acceptedCommentCount: number;
  skippedCommentCount: number;
  textPayload: "server-only-translator-provider-input";
  allowedCommentFields: readonly ["commentId", "publishedAt", "text", "platformLanguageHint"];
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
        | "blocked-non-server-translator-provider";
      providerRequestCount: 0;
      providerResultCount: 0;
      providerResults: readonly [];
      skippedCommentCount: number;
      reason: string;
      sanitizedIntake: YouTubeLiveCommentIntakeSanitizedSummary;
    });

const allowedCommentFields = ["commentId", "publishedAt", "text", "platformLanguageHint"] as const;

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
    "skip-blank-comment-text-before-provider-call"
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

  const providerRequests = acceptedComments.map((comment) =>
    createProviderRequest({
      comment,
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
    skippedCommentCount,
    sanitizedIntake: createSanitizedIntakeSummary({
      acceptedCommentCount: providerRequests.length,
      skippedCommentCount
    })
  };
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
  targetLanguage,
  glossaryTerms,
  glossaryVersion,
  providerCapabilityVersion,
  moderationPolicyVersion
}: {
  comment: YouTubeProviderSafeCommentPayload;
  targetLanguage: string;
  glossaryTerms: readonly string[];
  glossaryVersion: string | null;
  providerCapabilityVersion: string;
  moderationPolicyVersion: string;
}): CommentTranslationProviderRequest {
  const normalizedTextHash = createStableTextHash(comment.text);
  const sourceLanguage = comment.platformLanguageHint?.trim() || "auto";

  return {
    requestId: `youtube-live-comment:${comment.commentId}`,
    input: {
      kind: "live-comment",
      text: comment.text.trim(),
      sourceLanguage,
      targetLanguage
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
        targetLanguage,
        providerCapabilityVersion,
        glossaryVersion ?? "no-glossary",
        moderationPolicyVersion
      ].join(":"),
      keyMaterial: createCacheKeyMaterial({
        normalizedTextHash,
        sourceLanguage,
        targetLanguage,
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
    excludes: ["authorName", "channelId", "viewerId", "streamId", "rawSecret"]
  };
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
  const normalizedText = text.trim().toLocaleLowerCase();
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalizedText.length; index += 1) {
    hash ^= normalizedText.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
