import "server-only";

import type { CommentTranslatorCreatorCallerAuthority } from "./comment-translator-creator-entitlement-runtime";
import type { CommentTranslatorProjectedPriority } from "./comment-translator-priority-classification";

export type CommentTranslatorCreatorSafeHistoryFields = {
  readonly sourceAttributionLabel: "Source: YouTube Live Chat";
  readonly authorLabel: "YouTube viewer";
  readonly authorDisplayName: string | null;
  readonly originalText: string | null;
  readonly translatedText: string | null;
  readonly translationStatus:
    | "not-run-f9"
    | "translated-f10"
    | "skipped-f10-language-policy"
    | "skipped-f10-non-translatable"
    | "provider-unavailable-f10"
    | "provider-error-f10-recoverable"
    | "provider-error-f10-terminal"
    | "skipped-f12-usage-limit";
  readonly moderationLabel: "visible" | "deleted" | "banned" | "ended" | "system";
  readonly priority: CommentTranslatorProjectedPriority;
  readonly badgeLabel: "owner" | "moderator" | "member" | "super-chat" | "super-sticker" | "system" | null;
  readonly purchaseLabel: string | null;
};

export type CommentTranslatorCreatorSafeHistorySnapshot = CommentTranslatorCreatorSafeHistoryFields & {
  readonly messageCorrelationDigest: string;
  readonly sourcePublishedAtIso: string;
};

export type CommentTranslatorCreatorSafeHistoryRow = CommentTranslatorCreatorSafeHistoryFields & {
  readonly sourcePublishedAtIso: string;
  readonly recordedAtIso: string;
};

export type CommentTranslatorCreatorSafeHistoryStore = {
  appendSafeHistory(request: {
    readonly ownerUserId: string;
    readonly sessionReferenceId: string;
    readonly rows: readonly CommentTranslatorCreatorSafeHistorySnapshot[];
  }): Promise<{ readonly status: "recorded"; readonly recordedCount: number } | { readonly status: "unavailable" }>;
  readSafeHistory(request: {
    readonly ownerUserId: string;
    readonly sessionReferenceId: string;
  }): Promise<{
    readonly status: "ready";
    readonly evaluatedAtIso: string;
    readonly rows: readonly CommentTranslatorCreatorSafeHistoryRow[];
  } | { readonly status: "unavailable" }>;
  cleanupOwner(request: {
    readonly ownerUserId: string;
  }): Promise<{ readonly status: "deleted"; readonly removedCount: number } | { readonly status: "unavailable" }>;
};

export type CommentTranslatorCreatorHistoryPaidAuthority = {
  authorize(request: {
    readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
    readonly nowMs: number;
  }): Promise<{ readonly status: "ready" } | { readonly status: "fail-closed"; readonly reason: string }>;
};

export type CommentTranslatorCreatorHistorySessionAuthority = {
  readCurrentForOwner(ownerUserId: string, nowMs: number): Promise<
    | { readonly status: "ready"; readonly sessionReferenceId: string }
    | { readonly status: "unavailable"; readonly reason: string }
  >;
};

export type CommentTranslatorCreatorHistorySafeFeed = {
  readCurrentSafeRows(request: {
    readonly ownerUserId: string;
    readonly sessionReferenceId: string;
    readonly nowMs: number;
  }): Promise<
    | { readonly status: "ready"; readonly rows: readonly CommentTranslatorCreatorSafeHistorySnapshot[] }
    | { readonly status: "unavailable"; readonly reason: string }
  >;
};
