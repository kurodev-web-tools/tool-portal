import "server-only";

import type { CommentTranslatorCreatorCallerAuthority } from "./comment-translator-creator-entitlement-runtime";
import type {
  CommentTranslatorCreatorHistoryPaidAuthority,
  CommentTranslatorCreatorHistorySafeFeed,
  CommentTranslatorCreatorHistorySessionAuthority,
  CommentTranslatorCreatorSafeHistoryRow,
  CommentTranslatorCreatorSafeHistorySnapshot,
  CommentTranslatorCreatorSafeHistoryStore
} from "./comment-translator-creator-history-types";

const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
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

export const commentTranslatorCreatorSafeHistoryRuntimeContract = {
  implementationStage: "nc-h1-local-seven-day-safe-history-runtime",
  runtime: "server-only",
  paidAuthority: "nc-d1-nc-e1-server-owned-paid-active-only",
  currentSessionAuthority: "durable-server-owned-active-session-only",
  safeFeedAuthority: "existing-server-owned-safe-feed-only",
  retention: "inclusive-seven-days-server-clock-rpc",
  productionActivation: "fixed-closed",
  productionLiveOperation: "fixed-closed",
  browserAuthority: "forbidden",
  cleanup: "owner-derived-idempotent-disconnect-and-account-seams",
  scheduler: "forbidden"
} as const;

export function createCommentTranslatorCreatorSafeHistoryRuntime({
  historyStore,
  paidAuthority,
  sessionAuthority,
  readSafeFeed
}: {
  readonly historyStore: CommentTranslatorCreatorSafeHistoryStore | null;
  readonly paidAuthority: CommentTranslatorCreatorHistoryPaidAuthority["authorize"];
  readonly sessionAuthority: CommentTranslatorCreatorHistorySessionAuthority;
  readonly readSafeFeed: CommentTranslatorCreatorHistorySafeFeed["readCurrentSafeRows"];
}) {
  return {
    capture: (request: { readonly callerAuthority: CommentTranslatorCreatorCallerAuthority; readonly nowMs: number }) =>
      captureSafeHistory({ historyStore, paidAuthority, sessionAuthority, readSafeFeed, ...request }),
    read: (request: { readonly callerAuthority: CommentTranslatorCreatorCallerAuthority; readonly nowMs: number }) =>
      readSafeHistory({ historyStore, paidAuthority, sessionAuthority, ...request }),
    cleanupForDisconnect: (request: { readonly callerAuthority: CommentTranslatorCreatorCallerAuthority }) =>
      cleanupOwnerHistory({ historyStore, callerAuthority: request.callerAuthority }),
    cleanupForAccountDeletion: (request: { readonly callerAuthority: CommentTranslatorCreatorCallerAuthority }) =>
      cleanupOwnerHistory({ historyStore, callerAuthority: request.callerAuthority })
  };
}

export function isCommentTranslatorCreatorSafeHistoryWithinInclusiveCutoff({
  sourcePublishedAtIso,
  nowMs
}: {
  readonly sourcePublishedAtIso: string;
  readonly nowMs: number;
}): boolean {
  const sourcePublishedAtMs = Date.parse(sourcePublishedAtIso);
  return Number.isFinite(nowMs) && Number.isFinite(sourcePublishedAtMs) && sourcePublishedAtMs <= nowMs && sourcePublishedAtMs >= nowMs - sevenDaysMs;
}

async function captureSafeHistory({
  historyStore,
  paidAuthority,
  sessionAuthority,
  readSafeFeed,
  callerAuthority,
  nowMs
}: {
  readonly historyStore: CommentTranslatorCreatorSafeHistoryStore | null;
  readonly paidAuthority: CommentTranslatorCreatorHistoryPaidAuthority["authorize"];
  readonly sessionAuthority: CommentTranslatorCreatorHistorySessionAuthority;
  readonly readSafeFeed: CommentTranslatorCreatorHistorySafeFeed["readCurrentSafeRows"];
  readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
  readonly nowMs: number;
}) {
  const context = await readAuthorizedContext({ historyStore, paidAuthority, sessionAuthority, callerAuthority, nowMs });
  if (!context) return unavailable();
  let safeFeed: Awaited<ReturnType<CommentTranslatorCreatorHistorySafeFeed["readCurrentSafeRows"]>>;
  try {
    safeFeed = await readSafeFeed({ ...context, nowMs });
  } catch {
    return unavailable();
  }
  if (safeFeed.status !== "ready" || !safeFeed.rows.every((row) => isSafeHistorySnapshot(row, nowMs))) return unavailable();
  try {
    const written = await historyStore.appendSafeHistory({ ...context, rows: safeFeed.rows });
    return written.status === "recorded" ? written : unavailable();
  } catch {
    return unavailable();
  }
}

async function readSafeHistory({
  historyStore,
  paidAuthority,
  sessionAuthority,
  callerAuthority,
  nowMs
}: {
  readonly historyStore: CommentTranslatorCreatorSafeHistoryStore | null;
  readonly paidAuthority: CommentTranslatorCreatorHistoryPaidAuthority["authorize"];
  readonly sessionAuthority: CommentTranslatorCreatorHistorySessionAuthority;
  readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
  readonly nowMs: number;
}) {
  const context = await readAuthorizedContext({ historyStore, paidAuthority, sessionAuthority, callerAuthority, nowMs });
  if (!context) return unavailable();
  try {
    const read = await historyStore.readSafeHistory(context);
    const evaluatedAtMs = read.status === "ready" ? Date.parse(read.evaluatedAtIso) : Number.NaN;
    if (read.status !== "ready" || !Number.isFinite(evaluatedAtMs) || !read.rows.every((row) => isSafeHistoryRow(row, evaluatedAtMs))) return unavailable();
    return { status: "ready" as const, rows: read.rows };
  } catch {
    return unavailable();
  }
}

async function cleanupOwnerHistory({
  historyStore,
  callerAuthority
}: {
  readonly historyStore: CommentTranslatorCreatorSafeHistoryStore | null;
  readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
}) {
  const ownerUserId = readOwner(callerAuthority);
  if (!historyStore || !ownerUserId) return unavailable();
  try {
    const result = await historyStore.cleanupOwner({ ownerUserId });
    return result.status === "deleted" ? result : unavailable();
  } catch {
    return unavailable();
  }
}

async function readAuthorizedContext({
  historyStore,
  paidAuthority,
  sessionAuthority,
  callerAuthority,
  nowMs
}: {
  readonly historyStore: CommentTranslatorCreatorSafeHistoryStore | null;
  readonly paidAuthority: CommentTranslatorCreatorHistoryPaidAuthority["authorize"];
  readonly sessionAuthority: CommentTranslatorCreatorHistorySessionAuthority;
  readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
  readonly nowMs: number;
}): Promise<{ readonly ownerUserId: string; readonly sessionReferenceId: string } | null> {
  const ownerUserId = readOwner(callerAuthority);
  if (!historyStore || !ownerUserId || !Number.isFinite(nowMs)) return null;
  let paid: Awaited<ReturnType<CommentTranslatorCreatorHistoryPaidAuthority["authorize"]>>;
  try {
    paid = await paidAuthority({ callerAuthority, nowMs });
  } catch {
    return null;
  }
  if (paid.status !== "ready") return null;
  try {
    const session = await sessionAuthority.readCurrentForOwner(ownerUserId, nowMs);
    return session.status === "ready" && isNonEmpty(session.sessionReferenceId)
      ? { ownerUserId, sessionReferenceId: session.sessionReferenceId }
      : null;
  } catch {
    return null;
  }
}

function isSafeHistoryRow(row: CommentTranslatorCreatorSafeHistoryRow, evaluatedAtMs: number): boolean {
  return isSafeHistoryFields(row) &&
    isTimestamp(row.recordedAtIso) &&
    isCommentTranslatorCreatorSafeHistoryWithinInclusiveCutoff({ sourcePublishedAtIso: row.sourcePublishedAtIso, nowMs: evaluatedAtMs });
}

function isSafeHistorySnapshot(row: CommentTranslatorCreatorSafeHistorySnapshot, nowMs: number): boolean {
  return isCorrelationDigest(row.messageCorrelationDigest) &&
    isCommentTranslatorCreatorSafeHistoryWithinInclusiveCutoff({ sourcePublishedAtIso: row.sourcePublishedAtIso, nowMs }) &&
    isSafeHistoryFields(row);
}

function isSafeHistoryFields(row: CommentTranslatorCreatorSafeHistorySnapshot | CommentTranslatorCreatorSafeHistoryRow): boolean {
  if (row.sourceAttributionLabel !== "Source: YouTube Live Chat" || row.authorLabel !== "YouTube viewer") return false;
  if (!translationStatuses.has(row.translationStatus) || !moderationLabels.has(row.moderationLabel)) return false;
  if (row.badgeLabel !== null && !badgeLabels.has(row.badgeLabel)) return false;
  if (!isNullableString(row.authorDisplayName) || !isNullableString(row.originalText) || !isNullableString(row.translatedText) || !isNullableString(row.purchaseLabel)) return false;
  return row.moderationLabel === "visible" || (row.originalText === null && row.translatedText === null);
}

function readOwner(callerAuthority: CommentTranslatorCreatorCallerAuthority): string | null {
  return callerAuthority.status === "authenticated" && isNonEmpty(callerAuthority.ownerUserId) ? callerAuthority.ownerUserId : null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isCorrelationDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function unavailable() {
  return { status: "unavailable" as const };
}
