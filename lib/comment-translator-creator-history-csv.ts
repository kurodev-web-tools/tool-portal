import "server-only";

import { readCommentTranslatorProjectedPriority } from "./comment-translator-priority-classification";
import type { CommentTranslatorCreatorSafeHistoryRow } from "./comment-translator-creator-history-types";

export const commentTranslatorCreatorSafeHistoryCsvHeaders = [
  "author",
  "badge",
  "purchase",
  "translated_text",
  "original_text",
  "moderation",
  "source"
] as const;

export const commentTranslatorCreatorSafeHistoryCsvMaxRows = 500;

const moderationLabels = {
  visible: "Visible",
  deleted: "Deleted",
  banned: "Banned",
  ended: "Stream ended",
  system: "System event"
} as const;

const badgeLabels = new Set(["owner", "moderator", "member", "super-chat", "super-sticker", "system"]);
const formulaCellPattern = /^[\s\p{C}]*[=+\-@]/u;

export function serializeCommentTranslatorCreatorSafeHistoryCsv(
  rows: readonly CommentTranslatorCreatorSafeHistoryRow[]
): string | null {
  try {
    if (!Array.isArray(rows) || rows.length > commentTranslatorCreatorSafeHistoryCsvMaxRows) return null;

    const records: Array<readonly (string | null)[]> = [commentTranslatorCreatorSafeHistoryCsvHeaders];
    for (const row of rows) {
      const cells = readSafeHistoryCsvCells(row);
      if (!cells) return null;
      records.push(cells);
    }

    return `\uFEFF${records.map((record) => record.map(encodeCsvCell).join(",")).join("\r\n")}\r\n`;
  } catch {
    return null;
  }
}

function readSafeHistoryCsvCells(row: unknown): readonly (string | null)[] | null {
  if (!isRecord(row)) return null;
  if (row.sourceAttributionLabel !== "Source: YouTube Live Chat" || row.authorLabel !== "YouTube viewer") return null;
  if (!isNullableString(row.authorDisplayName) || !isNullableString(row.originalText) ||
    !isNullableString(row.translatedText) || !isNullableString(row.purchaseLabel)) return null;
  if (!isModerationLabel(row.moderationLabel) || !isBadgeLabel(row.badgeLabel)) return null;
  if (row.moderationLabel !== "visible" && (row.originalText !== null || row.translatedText !== null)) return null;

  if (!isRecord(row.priority)) return null;
  const priority = readCommentTranslatorProjectedPriority(row.priority);

  return [
    row.authorDisplayName ?? row.authorLabel,
    priority.badgeLabel ?? row.badgeLabel,
    row.purchaseLabel,
    row.translatedText,
    row.originalText,
    moderationLabels[row.moderationLabel],
    row.sourceAttributionLabel
  ];
}

function encodeCsvCell(value: string | null): string {
  const text = value ?? "";
  const guardedText = formulaCellPattern.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(guardedText) ? `"${guardedText.replaceAll('"', '""')}"` : guardedText;
}

function isModerationLabel(value: unknown): value is keyof typeof moderationLabels {
  return typeof value === "string" && Object.hasOwn(moderationLabels, value);
}

function isBadgeLabel(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && badgeLabels.has(value));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
