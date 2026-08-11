import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  CommentTranslatorCreatorSafeHistoryRow,
  CommentTranslatorCreatorSafeHistorySearchPage,
  CommentTranslatorCreatorSafeHistorySnapshot,
  CommentTranslatorCreatorSafeHistoryStore
} from "./comment-translator-creator-history-types";
import { readCommentTranslatorProjectedPriority } from "./comment-translator-priority-classification";

type TrustedEnvName = "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY";
type RpcResult = { readonly data: unknown; readonly error: { readonly code?: string; readonly message?: string } | null };

export type CommentTranslatorCreatorSafeHistorySupabaseClient = {
  rpc(functionName: string, parameters: Record<string, unknown>): Promise<RpcResult>;
};

export const commentTranslatorCreatorSafeHistoryStoreContract = {
  implementationStage: "nc-x2b-r1-local-thirty-day-bounded-search-store",
  runtime: "server-only",
  tableName: "comment_translator_creator_safe_history",
  rowAccess: "trusted-service-role-rpc-only",
  writeAuthority: "atomic-rpc-current-paid-active-owner-session-only",
  readAuthority: "atomic-rpc-current-paid-active-owner-session-only",
  searchAuthority: "atomic-rpc-current-paid-active-owner-session-only",
  searchBound: "50-rows-fetch-51-no-total-count",
  searchFields: "author-display-name-original-text-translated-text-only",
  cursor: "opaque-owner-and-query-bound-pagination-key-only",
  cleanupAuthority: "atomic-rpc-owner-derived-server-only",
  retention: "thirty-days-inclusive-server-clock-only",
  directTableCrud: "forbidden",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  productionLiveOperation: "fixed-closed"
} as const;

export function createTrustedCommentTranslatorCreatorSafeHistoryStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  readonly env?: Partial<Record<TrustedEnvName, string | undefined>>;
  readonly createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorCreatorSafeHistorySupabaseClient;
} = {}):
  | { readonly status: "ready"; readonly store: CommentTranslatorCreatorSafeHistoryStore }
  | { readonly status: "unavailable"; readonly store: null; readonly reason: "trusted-service-role-env-missing" } {
  const trustedEnv = env ?? {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  const url = trustedEnv.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = trustedEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    return { status: "unavailable", store: null, reason: "trusted-service-role-env-missing" };
  }
  return {
    status: "ready",
    store: createCommentTranslatorCreatorSafeHistorySupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey)
    })
  };
}

export function createCommentTranslatorCreatorSafeHistorySupabaseStore({
  supabase
}: {
  readonly supabase: CommentTranslatorCreatorSafeHistorySupabaseClient;
}): CommentTranslatorCreatorSafeHistoryStore {
  return {
    async appendSafeHistory({ ownerUserId, sessionReferenceId, rows }) {
      const result = await callRpc(supabase, "append_comment_translator_creator_safe_history", {
        p_owner_user_id: ownerUserId,
        p_session_reference_id: sessionReferenceId,
        p_rows: rows.map(toRpcSnapshot)
      });
      return parseRecorded(result);
    },
    async readSafeHistory({ ownerUserId, sessionReferenceId }) {
      const result = await callRpc(supabase, "read_comment_translator_creator_safe_history", {
        p_owner_user_id: ownerUserId,
        p_session_reference_id: sessionReferenceId
      });
      return parseRead(result);
    },
    async searchSafeHistory({ ownerUserId, sessionReferenceId, query, cursor }) {
      const result = await callRpc(supabase, "search_comment_translator_creator_safe_history", {
        p_owner_user_id: ownerUserId,
        p_session_reference_id: sessionReferenceId,
        p_query: query,
        p_cursor: cursor
      });
      return parseSearch(result);
    },
    async cleanupOwner({ ownerUserId }) {
      const result = await callRpc(supabase, "cleanup_comment_translator_creator_safe_history_for_owner", {
        p_owner_user_id: ownerUserId
      });
      return parseDeleted(result);
    }
  };
}

function toRpcSnapshot(row: CommentTranslatorCreatorSafeHistorySnapshot) {
  return {
    message_correlation_digest: row.messageCorrelationDigest,
    source_published_at: row.sourcePublishedAtIso,
    source_attribution_label: row.sourceAttributionLabel,
    author_label: row.authorLabel,
    author_display_name: row.authorDisplayName,
    original_text: row.originalText,
    translated_text: row.translatedText,
    translation_status: row.translationStatus,
    moderation_label: row.moderationLabel,
    badge_label: row.badgeLabel,
    purchase_label: row.purchaseLabel
  };
}

async function callRpc(
  supabase: CommentTranslatorCreatorSafeHistorySupabaseClient,
  functionName: string,
  parameters: Record<string, unknown>
): Promise<RpcResult | null> {
  try {
    return await supabase.rpc(functionName, parameters);
  } catch {
    return null;
  }
}

function parseRecorded(result: RpcResult | null): { readonly status: "recorded"; readonly recordedCount: number } | { readonly status: "unavailable" } {
  if (!result || result.error || !isRecord(result.data) || result.data.status !== "recorded" || !isCount(result.data.recorded_count)) return unavailable();
  return { status: "recorded", recordedCount: result.data.recorded_count };
}

function parseRead(result: RpcResult | null): { readonly status: "ready"; readonly evaluatedAtIso: string; readonly rows: readonly CommentTranslatorCreatorSafeHistoryRow[] } | { readonly status: "unavailable" } {
  if (!result || result.error || !isRecord(result.data) || result.data.status !== "ready" || !isTimestamp(result.data.evaluated_at) || !Array.isArray(result.data.rows)) return unavailable();
  const rows = result.data.rows.map(parseRow);
  return rows.every((row): row is CommentTranslatorCreatorSafeHistoryRow => row !== null)
    ? { status: "ready", evaluatedAtIso: result.data.evaluated_at, rows }
    : unavailable();
}

function parseSearch(result: RpcResult | null): CommentTranslatorCreatorSafeHistorySearchPage {
  if (!result || result.error || !isRecord(result.data) || result.data.status !== "ready" ||
    !isTimestamp(result.data.evaluated_at) || !Array.isArray(result.data.rows) ||
    !(result.data.next_cursor === null || isOpaqueCursor(result.data.next_cursor))) return unavailable();
  const rows = result.data.rows.map(parseRow);
  return rows.every((row): row is CommentTranslatorCreatorSafeHistoryRow => row !== null)
    ? {
        status: "ready",
        evaluatedAtIso: result.data.evaluated_at,
        rows,
        nextCursor: result.data.next_cursor
      }
    : unavailable();
}

function parseDeleted(result: RpcResult | null): { readonly status: "deleted"; readonly removedCount: number } | { readonly status: "unavailable" } {
  if (!result || result.error || !isRecord(result.data) || result.data.status !== "deleted" || !isCount(result.data.removed_count)) return unavailable();
  return { status: "deleted", removedCount: result.data.removed_count };
}

function parseRow(value: unknown): CommentTranslatorCreatorSafeHistoryRow | null {
  if (!isRecord(value) ||
    value.source_attribution_label !== "Source: YouTube Live Chat" ||
    value.author_label !== "YouTube viewer" ||
    !isNullableString(value.author_display_name) ||
    !isNullableString(value.original_text) ||
    !isNullableString(value.translated_text) ||
    !isTranslationStatus(value.translation_status) ||
    !isModerationLabel(value.moderation_label) ||
    !isBadgeLabel(value.badge_label) ||
    !isNullableString(value.purchase_label) ||
    !isTimestamp(value.source_published_at) ||
    !isTimestamp(value.recorded_at) ||
    (value.moderation_label !== "visible" && (value.original_text !== null || value.translated_text !== null))) return null;
  return {
    sourceAttributionLabel: value.source_attribution_label,
    authorLabel: value.author_label,
    authorDisplayName: value.author_display_name,
    originalText: value.original_text,
    translatedText: value.translated_text,
    translationStatus: value.translation_status,
    moderationLabel: value.moderation_label,
    priority: readCommentTranslatorProjectedPriority(undefined),
    badgeLabel: value.badge_label,
    purchaseLabel: value.purchase_label,
    sourcePublishedAtIso: value.source_published_at,
    recordedAtIso: value.recorded_at
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isOpaqueCursor(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 2048 && /^[A-Za-z0-9_-]+=*$/.test(value);
}

function isTranslationStatus(value: unknown): value is CommentTranslatorCreatorSafeHistorySnapshot["translationStatus"] {
  return typeof value === "string" && [
    "not-run-f9", "translated-f10", "skipped-f10-language-policy", "skipped-f10-non-translatable",
    "provider-unavailable-f10", "provider-error-f10-recoverable", "provider-error-f10-terminal", "skipped-f12-usage-limit"
  ].includes(value);
}

function isModerationLabel(value: unknown): value is CommentTranslatorCreatorSafeHistorySnapshot["moderationLabel"] {
  return typeof value === "string" && ["visible", "deleted", "banned", "ended", "system"].includes(value);
}

function isBadgeLabel(value: unknown): value is CommentTranslatorCreatorSafeHistorySnapshot["badgeLabel"] {
  return value === null || (typeof value === "string" && ["owner", "moderator", "member", "super-chat", "super-sticker", "system"].includes(value));
}

function unavailable() {
  return { status: "unavailable" as const };
}

function createTrustedSupabaseServiceRoleClient(url: string, serviceRoleKey: string): CommentTranslatorCreatorSafeHistorySupabaseClient {
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async rpc(functionName, parameters) {
      const { data, error } = await client.rpc(functionName, parameters);
      return { data, error };
    }
  };
}
