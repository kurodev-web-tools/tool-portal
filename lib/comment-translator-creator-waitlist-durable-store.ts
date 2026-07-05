import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  commentTranslatorCreatorWaitlistCampaign,
  commentTranslatorCreatorWaitlistDiscountIntent,
  type CommentTranslatorCreatorWaitlistStatus,
  type CommentTranslatorCreatorWaitlistStore,
  type CommentTranslatorCreatorWaitlistStoreRegistration
} from "./comment-translator-free-beta-creator-locked-waitlist";

export type CommentTranslatorCreatorWaitlistStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

type CommentTranslatorCreatorWaitlistDbRow = {
  readonly id: string;
  readonly owner_user_id: string;
  readonly account_email: string | null;
  readonly account_display_name: string | null;
  readonly campaign: typeof commentTranslatorCreatorWaitlistCampaign;
  readonly status: CommentTranslatorCreatorWaitlistStatus;
  readonly discount_intent: typeof commentTranslatorCreatorWaitlistDiscountIntent;
  readonly registered_at: string;
  readonly created_at: string;
  readonly updated_at: string;
};

type CommentTranslatorCreatorWaitlistDbInsert = {
  readonly owner_user_id: string;
  readonly account_email: string | null;
  readonly account_display_name: string | null;
  readonly campaign: typeof commentTranslatorCreatorWaitlistCampaign;
  readonly status: "registered";
  readonly discount_intent: typeof commentTranslatorCreatorWaitlistDiscountIntent;
  readonly registered_at: string;
  readonly updated_at: string;
};

type SupabaseError = { readonly code?: string; readonly message?: string } | null;
type SupabaseSingleResult = {
  readonly data: CommentTranslatorCreatorWaitlistDbRow | null;
  readonly error: SupabaseError;
};
type SupabaseRowsResult = {
  readonly data: readonly CommentTranslatorCreatorWaitlistDbRow[] | null;
  readonly error: SupabaseError;
};
type SupabaseSelectQuery = PromiseLike<SupabaseRowsResult> & {
  readonly eq: (column: "owner_user_id" | "campaign", value: string) => SupabaseSelectQuery;
  readonly order: (column: "registered_at", options: { readonly ascending: boolean }) => SupabaseSelectQuery;
  readonly limit: (count: number) => SupabaseSelectQuery;
  readonly single: () => PromiseLike<SupabaseSingleResult>;
};
type SupabaseMutationQuery = {
  readonly select: (columns: typeof commentTranslatorCreatorWaitlistDurableStoreContract.trustedSelectColumns) => SupabaseSelectQuery;
};
type SupabaseTableQuery = {
  readonly select: (columns: typeof commentTranslatorCreatorWaitlistDurableStoreContract.trustedSelectColumns) => SupabaseSelectQuery;
  readonly insert: (row: CommentTranslatorCreatorWaitlistDbInsert) => SupabaseMutationQuery;
};

export type CommentTranslatorCreatorWaitlistSupabaseClient = {
  readonly from: (tableName: string) => SupabaseTableQuery;
};

export type CommentTranslatorCreatorWaitlistStoreFactoryResult =
  | {
      readonly status: "ready";
      readonly store: CommentTranslatorCreatorWaitlistStore;
      readonly missingEnvReferences: readonly [];
      readonly failClosed: false;
    }
  | {
      readonly status: "unavailable";
      readonly store: null;
      readonly missingEnvReferences: readonly CommentTranslatorCreatorWaitlistStoreFactoryEnvName[];
      readonly failClosed: true;
      readonly reason: "trusted-service-role-env-missing";
    };

export const commentTranslatorCreatorWaitlistDurableStoreContract = {
  implementationStage: "creator-closed-beta-waitlist-durable-store",
  runtime: "server-only",
  tableName: "comment_translator_creator_waitlist_registrations",
  rowAccess: "trusted-server-service-role-only",
  duplicatePolicy: "unique-owner-user-id-and-campaign",
  trustedSelectColumns:
    "id, owner_user_id, account_email, account_display_name, campaign, status, discount_intent, registered_at, created_at, updated_at",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  publicLaunchAllowed: false,
  migrationOwnership: "on delete cascade",
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text"
  ]
} as const;

export function createTrustedCommentTranslatorCreatorWaitlistSupabaseStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  readonly env?: Partial<Record<CommentTranslatorCreatorWaitlistStoreFactoryEnvName, string | undefined>>;
  readonly createSupabaseClient?: (
    url: string,
    serviceRoleKey: string
  ) => CommentTranslatorCreatorWaitlistSupabaseClient;
  readonly nowIso?: () => string;
} = {}): CommentTranslatorCreatorWaitlistStoreFactoryResult {
  const trustedEnv = env ?? (process.env as Partial<Record<CommentTranslatorCreatorWaitlistStoreFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorCreatorWaitlistStoreFactoryEnvName[] = [];

  if (!url) {
    missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  }

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
    store: createCommentTranslatorCreatorWaitlistSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey),
      nowIso
    }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorCreatorWaitlistSupabaseStore({
  supabase,
  nowIso
}: {
  readonly supabase: CommentTranslatorCreatorWaitlistSupabaseClient;
  readonly nowIso: () => string;
}): CommentTranslatorCreatorWaitlistStore {
  return {
    async readRegistration(request) {
      const result = await supabase
        .from(commentTranslatorCreatorWaitlistDurableStoreContract.tableName)
        .select(commentTranslatorCreatorWaitlistDurableStoreContract.trustedSelectColumns)
        .eq("owner_user_id", request.ownerUserId)
        .eq("campaign", request.campaign)
        .single();

      if (!result.data && (!result.error || result.error.code === "PGRST116")) {
        return null;
      }

      if (result.error || !result.data) {
        throw new Error("Trusted comment translator Creator waitlist read failed.");
      }

      return createRegistrationFromRow(result.data);
    },
    async insertRegistration(draft) {
      const result = await supabase
        .from(commentTranslatorCreatorWaitlistDurableStoreContract.tableName)
        .insert(createInsertFromRegistration({ ...draft, updatedAtIso: nowIso() }))
        .select(commentTranslatorCreatorWaitlistDurableStoreContract.trustedSelectColumns)
        .single();

      if (result.error?.code === "23505") {
        const existing = await this.readRegistration({
          ownerUserId: draft.ownerUserId,
          campaign: draft.campaign
        });
        if (existing) {
          return { ...existing, duplicatePrevented: true };
        }
      }

      if (result.error || !result.data) {
        throw new Error("Trusted comment translator Creator waitlist insert failed.");
      }

      return createRegistrationFromRow(result.data);
    },
    async listRegistrations(request) {
      const result = await supabase
        .from(commentTranslatorCreatorWaitlistDurableStoreContract.tableName)
        .select(commentTranslatorCreatorWaitlistDurableStoreContract.trustedSelectColumns)
        .eq("campaign", request.campaign)
        .order("registered_at", { ascending: false })
        .limit(request.limit);

      if (result.error || !result.data) {
        throw new Error("Trusted comment translator Creator waitlist list failed.");
      }

      return result.data.map(createRegistrationFromRow);
    }
  };
}

function createRegistrationFromRow(row: CommentTranslatorCreatorWaitlistDbRow): CommentTranslatorCreatorWaitlistStoreRegistration {
  return {
    ownerUserId: row.owner_user_id,
    accountEmail: row.account_email,
    accountDisplayName: row.account_display_name,
    campaign: row.campaign,
    status: row.status,
    discountIntent: row.discount_intent,
    registeredAtIso: row.registered_at,
    updatedAtIso: row.updated_at
  };
}

function createInsertFromRegistration(
  registration: CommentTranslatorCreatorWaitlistStoreRegistration
): CommentTranslatorCreatorWaitlistDbInsert {
  return {
    owner_user_id: registration.ownerUserId,
    account_email: registration.accountEmail,
    account_display_name: registration.accountDisplayName,
    campaign: registration.campaign,
    status: "registered",
    discount_intent: registration.discountIntent,
    registered_at: registration.registeredAtIso,
    updated_at: registration.updatedAtIso
  };
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorCreatorWaitlistStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorCreatorWaitlistStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorCreatorWaitlistSupabaseClient {
  const client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return {
    from(tableName) {
      return client.from(tableName) as unknown as SupabaseTableQuery;
    }
  };
}
