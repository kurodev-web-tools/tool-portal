import type {
  CommentTranslatorRealCommentsDisplayRow,
  CommentTranslatorRealCommentsTranslationStatus
} from "./comment-translator-real-comments-feed-shared";
import {
  readCommentTranslatorProjectedPriority,
  type CommentTranslatorPriorityClassification
} from "./comment-translator-priority-classification";
import type { CommentTranslatorCreatorHistoryStoredRow } from "./comment-translator-creator-history-store-types";
import type {
  CommentTranslatorCreatorHistoryDisplayRow,
  CommentTranslatorCreatorHistoryState
} from "./comment-translator-creator-history-types";

export function projectCommentTranslatorCreatorHistoryEntries({
  ownerUserId,
  storedRows,
  windowStartedAtIso,
  windowEndedAtIso
}: {
  readonly ownerUserId: string;
  readonly storedRows: readonly CommentTranslatorCreatorHistoryStoredRow[];
  readonly windowStartedAtIso: string;
  readonly windowEndedAtIso: string;
}): CommentTranslatorCreatorHistoryState["entries"] | null {
  const entries = [];
  const windowStartedAtMs = Date.parse(windowStartedAtIso);
  const windowEndedAtMs = Date.parse(windowEndedAtIso);
  if (Number.isNaN(windowStartedAtMs) || Number.isNaN(windowEndedAtMs)) return null;
  for (const storedRow of storedRows) {
    const recordedAtMs = Date.parse(storedRow.recordedAtIso);
    if (
      storedRow.ownerUserId !== ownerUserId ||
      !storedRow.sessionReferenceId.trim() ||
      Number.isNaN(recordedAtMs) ||
      recordedAtMs < windowStartedAtMs ||
      recordedAtMs > windowEndedAtMs
    ) {
      return null;
    }
    const rows = projectCommentTranslatorCreatorHistoryRows(storedRow.rows);
    if (!rows) return null;
    entries.push({ recordedAtIso: storedRow.recordedAtIso, rows });
  }
  return entries;
}

export function projectCommentTranslatorCreatorHistoryRows(
  values: readonly unknown[]
): readonly CommentTranslatorCreatorHistoryDisplayRow[] | null {
  const rows = values.map(projectHistoryRow);
  if (rows.some((row) => row === null)) return null;
  return rows.filter((row): row is CommentTranslatorCreatorHistoryDisplayRow => row !== null);
}

function projectHistoryRow(value: unknown): CommentTranslatorCreatorHistoryDisplayRow | null {
  if (!isRecord(value)) return null;
  const priority = readStrictPriority(value.priority);
  if (
    typeof value.publishedAtIso !== "string" ||
    Number.isNaN(Date.parse(value.publishedAtIso)) ||
    value.authorLabel !== "YouTube viewer" ||
    !isNullableString(value.authorDisplayName) ||
    !isNullableString(value.originalText) ||
    !isNullableString(value.translatedText) ||
    !isTargetLanguage(value.targetLanguage) ||
    !isTranslationStatus(value.translationStatus) ||
    !isModerationLabel(value.moderationLabel) ||
    !isDeletionPropagation(value.deletionPropagation) ||
    !priority ||
    !isNullableString(value.purchaseLabel) ||
    !isNullablePositiveInteger(value.memberMonthCount) ||
    value.sourceAttributionLabel !== "Source: YouTube Live Chat" ||
    !hasValidDeletedMessageProjection(value)
  ) {
    return null;
  }
  return {
    publishedAtIso: value.publishedAtIso,
    authorLabel: value.authorLabel,
    authorDisplayName: value.authorDisplayName,
    originalText: value.originalText,
    translatedText: value.translatedText,
    targetLanguage: value.targetLanguage,
    translationStatus: value.translationStatus,
    moderationLabel: value.moderationLabel,
    deletionPropagation: value.deletionPropagation,
    priority,
    purchaseLabel: value.purchaseLabel,
    memberMonthCount: value.memberMonthCount,
    sourceAttributionLabel: value.sourceAttributionLabel
  };
}

function hasValidDeletedMessageProjection(value: Record<string, unknown>): boolean {
  const isDeleted =
    value.moderationLabel === "deleted" ||
    value.deletionPropagation === "message-reference-tombstone-only";
  return !isDeleted || (
    value.moderationLabel === "deleted" &&
    value.deletionPropagation === "message-reference-tombstone-only" &&
    value.originalText === null &&
    value.translatedText === null
  );
}

function readStrictPriority(value: unknown): CommentTranslatorPriorityClassification | null {
  if (!isRecord(value)) return null;
  const priority = readCommentTranslatorProjectedPriority(value);
  return (
    value.category === priority.category &&
    value.lane === priority.lane &&
    value.rank === priority.rank &&
    value.badgeLabel === priority.badgeLabel
  )
    ? priority
    : null;
}

function isTargetLanguage(value: unknown): value is "ja" | "en" {
  return value === "ja" || value === "en";
}

function isTranslationStatus(value: unknown): value is CommentTranslatorRealCommentsTranslationStatus {
  return (
    value === "not-run-f9" ||
    value === "translated-f10" ||
    value === "skipped-f10-language-policy" ||
    value === "skipped-f10-non-translatable" ||
    value === "provider-unavailable-f10" ||
    value === "provider-error-f10-recoverable" ||
    value === "provider-error-f10-terminal" ||
    value === "skipped-f12-usage-limit"
  );
}

function isModerationLabel(
  value: unknown
): value is CommentTranslatorRealCommentsDisplayRow["moderationLabel"] {
  return value === "visible" || value === "deleted" || value === "banned" ||
    value === "ended" || value === "system";
}

function isDeletionPropagation(
  value: unknown
): value is CommentTranslatorRealCommentsDisplayRow["deletionPropagation"] {
  return value === "not-deleted" || value === "message-reference-tombstone-only" ||
    value === "author-history-p1-deferred" || value === "stream-ended";
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNullablePositiveInteger(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
