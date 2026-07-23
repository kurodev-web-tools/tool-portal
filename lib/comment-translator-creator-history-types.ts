import type {
  CommentTranslatorRealCommentsDisplayRow,
  CommentTranslatorRealCommentsTranslationStatus
} from "./comment-translator-real-comments-feed-shared";
import type { CommentTranslatorPriorityClassification } from "./comment-translator-priority-classification";

export type CommentTranslatorCreatorHistoryAccess = "paid-active" | "unavailable";

export type CommentTranslatorCreatorHistoryDisplayRow = {
  readonly publishedAtIso: string;
  readonly authorLabel: "YouTube viewer";
  readonly authorDisplayName: string | null;
  readonly originalText: string | null;
  readonly translatedText: string | null;
  readonly targetLanguage: "ja" | "en";
  readonly translationStatus: CommentTranslatorRealCommentsTranslationStatus;
  readonly moderationLabel: CommentTranslatorRealCommentsDisplayRow["moderationLabel"];
  readonly deletionPropagation: CommentTranslatorRealCommentsDisplayRow["deletionPropagation"];
  readonly priority: CommentTranslatorPriorityClassification;
  readonly purchaseLabel: string | null;
  readonly memberMonthCount: number | null;
  readonly sourceAttributionLabel: "Source: YouTube Live Chat";
};

export type CommentTranslatorCreatorHistoryState =
  | {
      readonly status: "ready";
      readonly entries: readonly {
        readonly recordedAtIso: string;
        readonly rows: readonly CommentTranslatorCreatorHistoryDisplayRow[];
      }[];
      readonly windowStartedAtIso: string;
      readonly windowEndedAtIso: string;
    }
  | {
      readonly status: "unavailable";
      readonly reason:
        | "auth-unavailable"
        | "creator-access-unavailable"
        | "history-store-unavailable"
        | "history-unreadable";
      readonly entries: readonly [];
      readonly windowStartedAtIso: null;
      readonly windowEndedAtIso: null;
    };

export type CommentTranslatorCreatorHistoryCleanupResult =
  | {
      readonly status: "completed";
      readonly trigger: "oauth-disconnect" | "account-deletion";
      readonly ownerScoped: true;
      readonly idempotent: true;
    }
  | {
      readonly status: "unavailable";
      readonly trigger: "oauth-disconnect" | "account-deletion";
      readonly reason: "auth-unavailable" | "history-store-unavailable";
      readonly ownerScoped: true;
      readonly idempotent: true;
    };
