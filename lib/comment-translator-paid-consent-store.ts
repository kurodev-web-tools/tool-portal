import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CommentTranslatorPaidConsentDocumentType = "terms" | "privacy" | "paid_conditions";

export type CommentTranslatorPaidConsent = {
  ownerUserId: string;
  documentType: CommentTranslatorPaidConsentDocumentType;
  documentVersion: string;
  consentedAtIso: string;
};

export type CommentTranslatorPaidConsentStore = {
  recordConsent: (request: {
    ownerUserId: string;
    documentType: CommentTranslatorPaidConsentDocumentType;
    documentVersion: string;
    consentedAtIso: string;
    nowIso: string;
  }) => Promise<string>;
  readConsent: (request: {
    ownerUserId: string;
    documentType: CommentTranslatorPaidConsentDocumentType;
    documentVersion: string;
  }) => Promise<CommentTranslatorPaidConsent | null>;
};

export type CommentTranslatorPaidConsentStoreFactoryResult =
  | {
      status: "ready";
      store: CommentTranslatorPaidConsentStore;
      missingEnvReferences: readonly [];
      failClosed: false;
    }
  | {
      status: "unavailable";
      store: null;
      missingEnvReferences: readonly ("NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY")[];
      failClosed: true;
      reason: "trusted-service-role-env-missing";
    };

type SupabaseError = { code?: string; message?: string } | null;
type SupabaseRpcResult = { data: unknown; error: SupabaseError };
type SupabaseQueryResult = { data: unknown; error: SupabaseError };
type SupabaseQuery = {
  select: (columns: string) => SupabaseQuery;
  eq: (column: string, value: string) => SupabaseQuery;
  maybeSingle: () => Promise<SupabaseQueryResult>;
};
type SupabaseClient = {
  from: (tableName: string) => SupabaseQuery;
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<SupabaseRpcResult>;
};

export const commentTranslatorPaidConsentStoreContract = {
  implementationStage: "comment-translator-paid-v1-task2-durable-consent-adapter",
  runtime: "server-only",
  tableName: "comment_translator_paid_consents",
  documentVersion: "immutable-versioned-consent-record",
  mutationAuthority: "ct_paid_record_consent",
  insertOnly: true,
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  browserReadableOutput: "never-returned-by-this-server-only-adapter",
  failClosedFallback: "paid-consent-unavailable",
  trustedRpcNames: ["ct_paid_record_consent"] as const
} as const;

export function createTrustedCommentTranslatorPaidConsentStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  env?: Partial<Record<"NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY", string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => SupabaseClient;
} = {}): CommentTranslatorPaidConsentStoreFactoryResult {
  const trustedEnv = env ?? process.env;
  const url = trustedEnv.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = trustedEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missingEnvReferences: ("NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY")[] = [];
  if (!url) missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missingEnvReferences.length > 0 || !url || !serviceRoleKey) {
    return {
      status: "unavailable",
      store: null,
      missingEnvReferences,
      failClosed: true,
      reason: "trusted-service-role-env-missing"
    };
  }
  return {
    status: "ready",
    store: createCommentTranslatorPaidConsentStore({ supabase: createSupabaseClient(url, serviceRoleKey) }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorPaidConsentStore({
  supabase
}: {
  supabase: SupabaseClient;
}): CommentTranslatorPaidConsentStore {
  return {
    async recordConsent(request) {
      const result = await supabase.rpc("ct_paid_record_consent", {
        p_owner_user_id: request.ownerUserId,
        p_document_type: request.documentType,
        p_document_version: request.documentVersion,
        p_consented_at: request.consentedAtIso,
        p_now: request.nowIso
      });
      if (result.error) throw new Error("Paid consent record failed.");
      const value = Array.isArray(result.data) ? result.data[0] : result.data;
      if (typeof value === "string" && value.length > 0) return value;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const id = (value as Record<string, unknown>).id;
        if (typeof id === "string" && id.length > 0) return id;
      }
      throw new Error("Paid consent record response is invalid.");
    },
    async readConsent(request) {
      const result = await supabase
        .from(commentTranslatorPaidConsentStoreContract.tableName)
        .select("owner_user_id, document_type, document_version, consented_at")
        .eq("owner_user_id", request.ownerUserId)
        .eq("document_type", request.documentType)
        .eq("document_version", request.documentVersion)
        .maybeSingle();
      if (result.error) throw new Error("Paid consent read failed.");
      if (!result.data) return null;
      const row = asRecord(result.data);
      const documentType = readString(row, "document_type");
      if (!isDocumentType(documentType)) throw new Error("Paid consent row is invalid.");
      return {
        ownerUserId: readString(row, "owner_user_id"),
        documentType,
        documentVersion: readString(row, "document_version"),
        consentedAtIso: readString(row, "consented_at")
      };
    }
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Trusted Paid store response is invalid.");
  return value as Record<string, unknown>;
}

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) throw new Error("Trusted Paid store response is invalid.");
  return value;
}

function isDocumentType(value: string): value is CommentTranslatorPaidConsentDocumentType {
  return value === "terms" || value === "privacy" || value === "paid_conditions";
}

function createTrustedSupabaseServiceRoleClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as unknown as SupabaseClient;
}
