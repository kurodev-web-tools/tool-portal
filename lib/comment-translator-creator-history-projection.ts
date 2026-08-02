import "server-only";

import { createHash } from "node:crypto";
import type { CommentTranslatorCreatorSafeHistorySnapshot } from "./comment-translator-creator-history-types";
import type { CommentTranslatorRealCommentsDisplayRow } from "./comment-translator-real-comments-feed-shared";

const translationStatuses = new Set([
  "not-run-f9",
  "translated-f10",
  "skipped-f10-language-policy",
  "skipped-f10-non-translatable",
  "provider-unavailable-f10",
  "provider-error-f10-recoverable",
  "provider-error-f10-terminal",
  "skipped-f12-usage-limit"
]);
const moderationLabels = new Set(["visible", "deleted", "banned", "ended", "system"]);
const badgeLabels = new Set(["owner", "moderator", "member", "super-chat", "super-sticker", "system"]);

export const commentTranslatorCreatorSafeHistoryProjectionContract = {
  implementationStage: "nc-h1-local-safe-history-projection",
  runtime: "server-only",
  sourceAuthority: "existing-durable-safe-feed-only",
  safeFields: "source-original-translated-author-badge-purchase-moderation-only",
  tombstoneTextPolicy: "non-visible-rows-must-not-carry-text",
  futureOrMalformedSourceTimestamp: "fail-closed",
  rawPersistence: "forbidden",
  creatorActivation: "fixed-closed"
} as const;

export function projectCommentTranslatorCreatorSafeHistoryRow({
  row,
  ownerUserId,
  sessionReferenceId,
  nowMs = Date.now()
}: {
  readonly row: Pick<
    CommentTranslatorRealCommentsDisplayRow,
    | "sourceAttributionLabel"
    | "authorLabel"
    | "authorDisplayName"
    | "originalText"
    | "translatedText"
    | "translationStatus"
    | "moderationLabel"
    | "badgeLabel"
    | "purchaseLabel"
    | "publishedAtIso"
    | "messageReferenceId"
  >;
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly nowMs?: number;
}): CommentTranslatorCreatorSafeHistorySnapshot | null {
  const publishedAtMs = Date.parse(row.publishedAtIso);
  const cutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(nowMs) || !Number.isFinite(publishedAtMs) || publishedAtMs > nowMs || publishedAtMs < cutoffMs) return null;
  if (!isNonEmpty(ownerUserId) || !isNonEmpty(sessionReferenceId) || !isNonEmpty(row.messageReferenceId)) return null;
  if (row.sourceAttributionLabel !== "Source: YouTube Live Chat" || row.authorLabel !== "YouTube viewer") return null;
  if (!translationStatuses.has(row.translationStatus) || !moderationLabels.has(row.moderationLabel)) return null;
  if (row.badgeLabel !== null && !badgeLabels.has(row.badgeLabel)) return null;
  if (!isNullableString(row.authorDisplayName) || !isNullableString(row.originalText) || !isNullableString(row.translatedText) || !isNullableString(row.purchaseLabel)) return null;
  if (row.moderationLabel !== "visible" && (row.originalText !== null || row.translatedText !== null)) return null;

  return {
    messageCorrelationDigest: createCommentTranslatorCreatorSafeHistoryCorrelationDigest({
      ownerUserId,
      sessionReferenceId,
      messageReferenceId: row.messageReferenceId
    }),
    sourcePublishedAtIso: row.publishedAtIso,
    sourceAttributionLabel: row.sourceAttributionLabel,
    authorLabel: row.authorLabel,
    authorDisplayName: row.authorDisplayName,
    originalText: row.originalText,
    translatedText: row.translatedText,
    translationStatus: row.translationStatus,
    moderationLabel: row.moderationLabel,
    badgeLabel: row.badgeLabel,
    purchaseLabel: row.purchaseLabel
  };
}

export function createCommentTranslatorCreatorSafeHistoryCorrelationDigest({
  ownerUserId,
  sessionReferenceId,
  messageReferenceId
}: {
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly messageReferenceId: string;
}): string {
  return createHash("sha256")
    .update(`${ownerUserId}\u0000${sessionReferenceId}\u0000${messageReferenceId}`, "utf8")
    .digest("hex");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
