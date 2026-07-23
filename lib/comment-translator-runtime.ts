import {
  commentTranslatorConnectionStates,
  commentTranslatorDisplayModeOptions,
  commentTranslatorManualSamples,
  commentTranslatorOperatorFlowSteps,
  commentTranslatorPlatform,
  commentTranslatorQuotaPreview,
  commentTranslatorQuotaScenarios,
  commentTranslatorSettings,
  commentTranslatorSkipReasons,
  commentTranslatorSourceLanguageOptions,
  commentTranslatorStatusFilters,
  commentTranslatorStreamOptions,
  commentTranslatorSurfaceOptions,
  commentTranslatorTargetLanguageOptions
} from "./comment-translator-snapshot-data";
import { commentTranslatorComments } from "./comment-translator-fixture-comments";
import type {
  CommentTranslatorComment,
  CommentTranslatorManualResultMode,
  CommentTranslatorStatusFilter,
  CommentTranslatorTargetLanguageId
} from "./comment-translator-types";
import type { CommentTranslatorPriorityFilter } from "./comment-translator-priority-classification";

export function findCommentTranslatorOption<TOption extends { id: string }>(
  options: TOption[],
  id: string,
  fallback = options[0]
) {
  return options.find((option) => option.id === id) ?? fallback;
}

export function splitManualCommentInput({
  singleComment,
  multilinePaste
}: {
  singleComment: string;
  multilinePaste: string;
}) {
  return [singleComment, ...multilinePaste.split(/\r?\n/)]
    .map((text) => text.trim())
    .filter(Boolean);
}

export function createManualCommentRows({
  texts,
  resultMode,
  targetLanguage,
  targetLanguageLabel,
  startIndex
}: {
  texts: string[];
  resultMode: CommentTranslatorManualResultMode;
  targetLanguage: CommentTranslatorTargetLanguageId;
  targetLanguageLabel: string;
  startIndex: number;
}): CommentTranslatorComment[] {
  const targetLanguageCode = targetLanguage.toLocaleUpperCase();

  return texts.map((text, index) => {
    const rowNumber = startIndex + index;
    const baseComment: CommentTranslatorComment = {
      id: `manual-${String(rowNumber).padStart(3, "0")}`,
      timestamp: `manual ${String(rowNumber).padStart(2, "0")}`,
      authorName: "Manual input",
      source: "manual",
      sourceLabel: "Manual input",
      sourceLanguage: "MANUAL",
      targetLanguage: targetLanguageCode,
      originalText: text,
      badge: "manual",
      unitCost: 0,
      status: resultMode,
      cacheStatus: "none"
    };

    if (resultMode === "translated") {
      return {
        ...baseComment,
        translatedText: `[Mock ${targetLanguageCode} / ${targetLanguageLabel}] preview translation ${String(rowNumber).padStart(2, "0")}`,
        cacheStatus: "miss",
        unitCost: 1
      };
    }

    if (resultMode === "skipped") {
      return {
        ...baseComment,
        skipReason: text.length <= 2 ? "Too short" : "Same language"
      };
    }

    return {
      ...baseComment,
      errorMessage: `Manual preview error for ${targetLanguageLabel}`
    };
  });
}

export function filterCommentTranslatorComments(
  comments: CommentTranslatorComment[],
  {
    statusFilter,
    searchQuery,
    priorityFilter = "all"
  }: {
    statusFilter: CommentTranslatorStatusFilter;
    searchQuery: string;
    priorityFilter?: CommentTranslatorPriorityFilter;
  }
) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  return comments.filter((comment) => {
    const statusMatches = statusFilter === "all" || comment.status === statusFilter;
    if (!statusMatches) {
      return false;
    }

    if (priorityFilter === "priority" && (!comment.priorityCategory || comment.priorityCategory === "standard")) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      comment.authorName,
      comment.sourceLanguage,
      comment.targetLanguage,
      comment.originalText,
      comment.translatedText ?? "",
      comment.skipReason ?? "",
      comment.errorMessage ?? "",
      comment.badge ?? "",
      comment.source ?? "",
      comment.sourceLabel ?? ""
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}

export class MockTranslationProvider {
  readonly name = "MockTranslationProvider";

  getSnapshot() {
    return {
      platform: commentTranslatorPlatform,
      settings: commentTranslatorSettings,
      quota: commentTranslatorQuotaPreview,
      connectionStates: commentTranslatorConnectionStates,
      streams: commentTranslatorStreamOptions,
      sourceLanguages: commentTranslatorSourceLanguageOptions,
      targetLanguages: commentTranslatorTargetLanguageOptions,
      displayModes: commentTranslatorDisplayModeOptions,
      surfaceOptions: commentTranslatorSurfaceOptions,
      statusFilters: commentTranslatorStatusFilters,
      quotaScenarios: commentTranslatorQuotaScenarios,
      skipReasons: commentTranslatorSkipReasons,
      manualSamples: commentTranslatorManualSamples,
      comments: commentTranslatorComments
    };
  }
}

export const mockTranslationProvider = new MockTranslationProvider();
