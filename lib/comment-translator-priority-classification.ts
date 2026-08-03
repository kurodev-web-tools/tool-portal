export type CommentTranslatorPriorityCategory =
  | "super-chat"
  | "super-sticker"
  | "owner"
  | "moderator"
  | "member"
  | "standard";

export type CommentTranslatorProjectedPriority = {
  readonly category: CommentTranslatorPriorityCategory;
  readonly lane: "priority" | "standard";
  readonly rank: 0 | 1 | 2 | 3 | 4 | 5;
  readonly badgeLabel: "Super Chat" | "Super Sticker" | "Owner" | "Moderator" | "Member" | null;
};

export type CommentTranslatorPriorityFilter = "all" | "priority";

export type CommentTranslatorPriorityClassificationSignals = {
  readonly kind: unknown;
  readonly role: unknown;
  readonly purchase: unknown;
  readonly member: unknown;
  readonly system?: unknown;
  readonly moderation?: unknown;
};

const projectedPriorityByCategory = {
  "super-chat": { category: "super-chat", lane: "priority", rank: 0, badgeLabel: "Super Chat" },
  "super-sticker": { category: "super-sticker", lane: "priority", rank: 1, badgeLabel: "Super Sticker" },
  owner: { category: "owner", lane: "priority", rank: 2, badgeLabel: "Owner" },
  moderator: { category: "moderator", lane: "priority", rank: 3, badgeLabel: "Moderator" },
  member: { category: "member", lane: "priority", rank: 4, badgeLabel: "Member" },
  standard: { category: "standard", lane: "standard", rank: 5, badgeLabel: null }
} as const satisfies Record<CommentTranslatorPriorityCategory, CommentTranslatorProjectedPriority>;

const supportedKinds = new Set(["text", "super-chat", "super-sticker", "member", "system", "deleted", "banned", "ended"]);
const supportedModerationStates = new Set(["visible", "deleted", "banned", "ended", "system"]);

export function resolveCommentTranslatorPriorityClassification(
  signals: CommentTranslatorPriorityClassificationSignals
): CommentTranslatorProjectedPriority {
  const kind = typeof signals.kind === "string" && supportedKinds.has(signals.kind) ? signals.kind : null;
  const moderation = readModerationState(signals.moderation);
  if (!kind || !moderation || kind === "deleted" || kind === "banned" || kind === "ended") return standardPriority();
  if (moderation === "deleted" || moderation === "banned" || moderation === "ended") return standardPriority();

  if (kind === "super-chat") {
    return moderation === "visible" && hasMatchingPurchase(signals.purchase, "super-chat")
      ? projectedPriorityByCategory["super-chat"]
      : standardPriority();
  }

  if (kind === "super-sticker") {
    return moderation === "visible" && hasMatchingPurchase(signals.purchase, "super-sticker")
      ? projectedPriorityByCategory["super-sticker"]
      : standardPriority();
  }

  if (kind === "system") {
    if (moderation !== "system" || !hasNewSponsorSystemEvent(signals.system)) return standardPriority();
    if (signals.role === "owner") return projectedPriorityByCategory.owner;
    if (signals.role === "moderator") return projectedPriorityByCategory.moderator;
    return projectedPriorityByCategory.member;
  }

  if (moderation !== "visible") return standardPriority();
  if (kind === "member" && !hasNormalizedMemberEvent(signals.member)) return standardPriority();
  if (signals.role === "owner") return projectedPriorityByCategory.owner;
  if (signals.role === "moderator") return projectedPriorityByCategory.moderator;
  if (signals.role === "member" || kind === "member") {
    return projectedPriorityByCategory.member;
  }
  return standardPriority();
}

export function readCommentTranslatorProjectedPriority(value: unknown): CommentTranslatorProjectedPriority {
  if (!isRecord(value) || typeof value.category !== "string" || !isPriorityCategory(value.category)) return standardPriority();
  const canonical = projectedPriorityByCategory[value.category];
  return value.lane === canonical.lane && value.rank === canonical.rank && value.badgeLabel === canonical.badgeLabel
    ? canonical
    : standardPriority();
}

export function readCommentTranslatorPriorityFilter(value: unknown): CommentTranslatorPriorityFilter {
  return value === "priority" ? "priority" : "all";
}

export function filterCommentTranslatorPriorityRows<TRow extends { readonly priority?: unknown }>(
  rows: readonly TRow[],
  filter: unknown
): TRow[] {
  const selectedFilter = readCommentTranslatorPriorityFilter(filter);
  return rows.filter((row) => selectedFilter === "all" || readCommentTranslatorProjectedPriority(row.priority).lane === "priority");
}

function standardPriority(): CommentTranslatorProjectedPriority {
  return projectedPriorityByCategory.standard;
}

function hasMatchingPurchase(value: unknown, kind: "super-chat" | "super-sticker"): boolean {
  return isRecord(value) && value.kind === kind;
}

function hasNormalizedMemberEvent(value: unknown): boolean {
  return isRecord(value) && Object.hasOwn(value, "monthCount") &&
    (value.monthCount === null || (typeof value.monthCount === "number" && Number.isFinite(value.monthCount)));
}

function hasNewSponsorSystemEvent(value: unknown): boolean {
  return isRecord(value) && value.subtype === "new-sponsor";
}

function readModerationState(value: unknown): "visible" | "deleted" | "banned" | "ended" | "system" | null {
  if (value === undefined) return "visible";
  if (typeof value === "string" && supportedModerationStates.has(value)) return value as "visible" | "deleted" | "banned" | "ended" | "system";
  if (isRecord(value) && typeof value.visibility === "string" && supportedModerationStates.has(value.visibility)) {
    return value.visibility as "visible" | "deleted" | "banned" | "ended" | "system";
  }
  return null;
}

function isPriorityCategory(value: string): value is CommentTranslatorPriorityCategory {
  return Object.hasOwn(projectedPriorityByCategory, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
