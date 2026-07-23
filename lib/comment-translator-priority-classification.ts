export type CommentTranslatorPriorityCategory =
  | "super-chat"
  | "super-sticker"
  | "owner"
  | "moderator"
  | "member"
  | "standard";

export type CommentTranslatorPriorityFilter = "all" | "priority";

export type CommentTranslatorPriorityClassification = {
  readonly category: CommentTranslatorPriorityCategory;
  readonly lane: "priority" | "standard";
  readonly rank: 0 | 1 | 2 | 3 | 4 | 5;
  readonly badgeLabel: "Super Chat" | "Super Sticker" | "Owner" | "Moderator" | "Member" | null;
};

type CommentTranslatorPriorityClassificationInput = {
  readonly kind: unknown;
  readonly role: unknown;
  readonly purchase: unknown;
  readonly member: unknown;
  readonly system?: unknown;
};

const standardClassification: CommentTranslatorPriorityClassification = {
  category: "standard",
  lane: "standard",
  rank: 5,
  badgeLabel: null
};

export function resolveCommentTranslatorPriorityClassification({
  kind,
  role,
  purchase,
  member,
  system
}: CommentTranslatorPriorityClassificationInput): CommentTranslatorPriorityClassification {
  if (!isPriorityEligibleKind(kind, system)) {
    return standardClassification;
  }

  if (kind === "super-chat" && hasMatchingPurchaseKind(purchase, "super-chat")) {
    return { category: "super-chat", lane: "priority", rank: 0, badgeLabel: "Super Chat" };
  }

  if (kind === "super-sticker" && hasMatchingPurchaseKind(purchase, "super-sticker")) {
    return { category: "super-sticker", lane: "priority", rank: 1, badgeLabel: "Super Sticker" };
  }

  if (role === "owner") {
    return { category: "owner", lane: "priority", rank: 2, badgeLabel: "Owner" };
  }

  if (role === "moderator") {
    return { category: "moderator", lane: "priority", rank: 3, badgeLabel: "Moderator" };
  }

  if (
    (kind === "member" && isRecord(member)) ||
    (kind === "system" && hasMatchingSystemSubtype(system, "new-sponsor")) ||
    role === "member"
  ) {
    return { category: "member", lane: "priority", rank: 4, badgeLabel: "Member" };
  }

  return standardClassification;
}

export function filterCommentTranslatorPriorityRows<
  TRow extends { readonly priority?: CommentTranslatorPriorityClassification }
>(rows: readonly TRow[], filter: CommentTranslatorPriorityFilter): readonly TRow[] {
  return filter === "all"
    ? rows
    : rows.filter((row) => readCommentTranslatorProjectedPriority(row.priority).lane === "priority");
}

export function readCommentTranslatorProjectedPriority(
  value: unknown
): CommentTranslatorPriorityClassification {
  if (!isRecord(value)) {
    return standardClassification;
  }

  const expected = classificationByCategory[value.category as CommentTranslatorPriorityCategory];
  return expected &&
    value.lane === expected.lane &&
    value.rank === expected.rank &&
    value.badgeLabel === expected.badgeLabel
    ? expected
    : standardClassification;
}

const classificationByCategory: Readonly<
  Record<CommentTranslatorPriorityCategory, CommentTranslatorPriorityClassification>
> = {
  "super-chat": { category: "super-chat", lane: "priority", rank: 0, badgeLabel: "Super Chat" },
  "super-sticker": { category: "super-sticker", lane: "priority", rank: 1, badgeLabel: "Super Sticker" },
  owner: { category: "owner", lane: "priority", rank: 2, badgeLabel: "Owner" },
  moderator: { category: "moderator", lane: "priority", rank: 3, badgeLabel: "Moderator" },
  member: { category: "member", lane: "priority", rank: 4, badgeLabel: "Member" },
  standard: standardClassification
};

function isPriorityEligibleKind(
  value: unknown,
  system: unknown
): value is "text" | "super-chat" | "super-sticker" | "member" | "system" {
  return (
    value === "text" ||
    value === "super-chat" ||
    value === "super-sticker" ||
    value === "member" ||
    (value === "system" && hasMatchingSystemSubtype(system, "new-sponsor"))
  );
}

function hasMatchingPurchaseKind(value: unknown, kind: "super-chat" | "super-sticker"): boolean {
  return isRecord(value) && "kind" in value && value.kind === kind;
}

function hasMatchingSystemSubtype(value: unknown, subtype: "new-sponsor"): boolean {
  return isRecord(value) && "subtype" in value && value.subtype === subtype;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
