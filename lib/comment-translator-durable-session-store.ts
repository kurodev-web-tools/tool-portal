import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  createCommentTranslatorSessionPlanEntitlement,
  stopCommentTranslatorSession,
  type CommentTranslatorActiveSessionRecord,
  type CommentTranslatorSessionBrowserSafeState,
  type CommentTranslatorSessionPlan,
  type CommentTranslatorSessionStopReason
} from "./comment-translator-session-runtime";
import { type YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";

export type CommentTranslatorDurableSessionRow = {
  id: string;
  owner_user_id: string;
  session_reference_id: string;
  provider: "youtube";
  plan: CommentTranslatorSessionPlan;
  plan_entitlement_reference_id: string;
  status: "active" | "stopped";
  started_at: string;
  last_heartbeat_at: string;
  stopped_at: string | null;
  stop_reason: CommentTranslatorSessionStopReason | null;
  credential_reference_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CommentTranslatorDurableSessionRowDraft = Omit<CommentTranslatorDurableSessionRow, "id" | "created_at"> & {
  provider_target_metadata: "forbidden";
  token_value: "never-returned-by-design";
  authorization_header_value: "never-returned-by-design";
  raw_provider_payload: "never-recorded-by-design";
};

export type CommentTranslatorDurableSessionRead =
  | {
      status: "ready";
      activeSession: CommentTranslatorActiveSessionRecord | null;
      authority: "durable-store";
    }
  | {
      status: "fail-closed";
      activeSession: null;
      stopReason: "session-limit";
      authority: "durable-store-unavailable";
      reason: "trusted-service-role-env-missing" | "caller-not-authorized" | "query-failed";
      clientReadableDetail: "sanitized-stop-reason-only";
    };

export type CommentTranslatorDurableSessionPersistResult =
  | {
      status: "persisted";
      authority: "durable-store";
    }
  | Extract<CommentTranslatorDurableSessionRead, { status: "fail-closed" }>;

export type CommentTranslatorDurableSessionStore = {
  readActiveSession: (request: { ownerUserId: string }) => Promise<CommentTranslatorActiveSessionRecord | null>;
  persistSessionState: (request: {
    ownerUserId: string;
    state: CommentTranslatorSessionBrowserSafeState;
    planEntitlementReferenceId: string;
    nowIso: string;
  }) => Promise<void>;
};

export type CommentTranslatorDurableSessionStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorDurableSessionStoreFactoryResult =
  | {
      status: "ready";
      store: CommentTranslatorDurableSessionStore;
      missingEnvReferences: readonly [];
      failClosed: false;
    }
  | {
      status: "unavailable";
      store: null;
      missingEnvReferences: readonly CommentTranslatorDurableSessionStoreFactoryEnvName[];
      failClosed: true;
      reason: "trusted-service-role-env-missing";
    };

type SupabaseSingleResult = {
  data: CommentTranslatorDurableSessionRow | null;
  error: { code?: string; message?: string } | null;
};

type SupabaseQuery = {
  select: (columns: typeof commentTranslatorDurableSessionStoreContract.trustedSelectColumns) => SupabaseQuery;
  upsert: (
    row: Omit<CommentTranslatorDurableSessionRowDraft, "provider_target_metadata" | "token_value" | "authorization_header_value" | "raw_provider_payload">,
    options: { onConflict: "session_reference_id" }
  ) => SupabaseQuery;
  update: (row: Partial<Pick<CommentTranslatorDurableSessionRow, "status" | "last_heartbeat_at" | "stopped_at" | "stop_reason" | "updated_at">>) => SupabaseQuery;
  eq: (column: "owner_user_id" | "status" | "session_reference_id", value: string) => SupabaseQuery;
  single: () => Promise<SupabaseSingleResult>;
};

export type CommentTranslatorDurableSessionSupabaseClient = {
  from: (tableName: typeof commentTranslatorDurableSessionStoreContract.tableName) => SupabaseQuery;
};

export const commentTranslatorDurableSessionStoreContract = {
  implementationStage: "free-public-beta-f3-durable-session-schema-adapter",
  runtime: "server-only",
  tableName: "comment_translator_sessions",
  rowAccess: "trusted-server-service-role-only",
  activeSessionsPerUserAuthority: "durable-store-required",
  sessionHistoryAuthority: "durable-store-required",
  browserReadableOutput: "sanitized-session-metadata-only",
  failClosedFallback: "stop-session-when-durable-store-unavailable",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  publicLaunchAllowed: false,
  trustedSelectColumns:
    "id, owner_user_id, session_reference_id, provider, plan, plan_entitlement_reference_id, status, started_at, last_heartbeat_at, stopped_at, stop_reason, credential_reference_id, created_at, updated_at",
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text"
  ]
} as const;

export function createTrustedCommentTranslatorSessionSupabaseStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  env?: Partial<Record<CommentTranslatorDurableSessionStoreFactoryEnvName, string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorDurableSessionSupabaseClient;
  nowIso?: () => string;
} = {}): CommentTranslatorDurableSessionStoreFactoryResult {
  const trustedEnv = env ?? (process.env as Partial<Record<CommentTranslatorDurableSessionStoreFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorDurableSessionStoreFactoryEnvName[] = [];

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
    store: createCommentTranslatorDurableSessionSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey),
      nowIso
    }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorDurableSessionSupabaseStore({
  supabase,
  nowIso
}: {
  supabase: CommentTranslatorDurableSessionSupabaseClient;
  nowIso: () => string;
}): CommentTranslatorDurableSessionStore {
  return {
    async readActiveSession(request) {
      const result = await supabase
        .from(commentTranslatorDurableSessionStoreContract.tableName)
        .select(commentTranslatorDurableSessionStoreContract.trustedSelectColumns)
        .eq("owner_user_id", request.ownerUserId)
        .eq("status", "active")
        .single();

      if (!result.data && (!result.error || result.error.code === "PGRST116")) {
        return null;
      }

      if (result.error || !result.data) {
        throw new Error("Trusted comment translator session read failed.");
      }

      return createCommentTranslatorActiveSessionRecordFromRow(result.data);
    },
    async persistSessionState(request) {
      if (request.state.status === "not-started") {
        return;
      }

      if (request.state.status === "stopped" && !request.state.sessionReferenceId) {
        return;
      }

      const rowDraft = createCommentTranslatorDurableSessionRowDraft({
        ownerUserId: request.ownerUserId,
        state: request.state,
        planEntitlementReferenceId: request.planEntitlementReferenceId,
        nowIso: nowIso()
      });

      const row = omitBrowserSafetyMarkers(rowDraft);

      if (row.status === "active") {
        const result = await supabase
          .from(commentTranslatorDurableSessionStoreContract.tableName)
          .upsert(row, { onConflict: "session_reference_id" })
          .select(commentTranslatorDurableSessionStoreContract.trustedSelectColumns)
          .single();

        assertSuccessfulWrite(result);
        return;
      }

      const result = await supabase
        .from(commentTranslatorDurableSessionStoreContract.tableName)
        .update({
          status: row.status,
          last_heartbeat_at: row.last_heartbeat_at,
          stopped_at: row.stopped_at,
          stop_reason: row.stop_reason,
          updated_at: row.updated_at
        })
        .eq("owner_user_id", request.ownerUserId)
        .eq("session_reference_id", row.session_reference_id)
        .select(commentTranslatorDurableSessionStoreContract.trustedSelectColumns)
        .single();

      assertSuccessfulWrite(result);
    }
  };
}

export async function readCommentTranslatorDurableActiveSessionOrFailClosed({
  callerAuthorization,
  durableSessionStore
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  durableSessionStore: CommentTranslatorDurableSessionStoreFactoryResult;
}): Promise<CommentTranslatorDurableSessionRead> {
  if (callerAuthorization.status !== "authorized") {
    return createUnavailableCommentTranslatorDurableSessionRead({
      reason: "caller-not-authorized"
    });
  }

  if (durableSessionStore.status !== "ready") {
    return createUnavailableCommentTranslatorDurableSessionRead({
      reason: durableSessionStore.reason
    });
  }

  try {
    return {
      status: "ready",
      activeSession: await durableSessionStore.store.readActiveSession({
        ownerUserId: callerAuthorization.ownerUserId
      }),
      authority: "durable-store"
    };
  } catch {
    return createUnavailableCommentTranslatorDurableSessionRead({
      reason: "query-failed"
    });
  }
}

export async function persistCommentTranslatorDurableSessionStateOrFailClosed({
  callerAuthorization,
  durableSessionStore,
  state,
  planEntitlementReferenceId,
  nowIso = () => new Date().toISOString()
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  durableSessionStore: CommentTranslatorDurableSessionStoreFactoryResult;
  state: CommentTranslatorSessionBrowserSafeState;
  planEntitlementReferenceId: string;
  nowIso?: () => string;
}): Promise<CommentTranslatorDurableSessionPersistResult> {
  if (state.status === "not-started") {
    return {
      status: "persisted",
      authority: "durable-store"
    };
  }

  if (state.status === "stopped" && !state.sessionReferenceId) {
    return {
      status: "persisted",
      authority: "durable-store"
    };
  }

  if (callerAuthorization.status !== "authorized") {
    return createUnavailableCommentTranslatorDurableSessionRead({
      reason: "caller-not-authorized"
    });
  }

  if (durableSessionStore.status !== "ready") {
    return createUnavailableCommentTranslatorDurableSessionRead({
      reason: durableSessionStore.reason
    });
  }

  try {
    await durableSessionStore.store.persistSessionState({
      ownerUserId: callerAuthorization.ownerUserId,
      state,
      planEntitlementReferenceId,
      nowIso: nowIso()
    });

    return {
      status: "persisted",
      authority: "durable-store"
    };
  } catch {
    return createUnavailableCommentTranslatorDurableSessionRead({
      reason: "query-failed"
    });
  }
}

export function createUnavailableCommentTranslatorDurableSessionRead({
  reason
}: {
  reason: Extract<CommentTranslatorDurableSessionRead, { status: "fail-closed" }>["reason"];
}): Extract<CommentTranslatorDurableSessionRead, { status: "fail-closed" }> {
  return {
    status: "fail-closed",
    activeSession: null,
    stopReason: "session-limit",
    authority: "durable-store-unavailable",
    reason,
    clientReadableDetail: "sanitized-stop-reason-only"
  };
}

export function createCommentTranslatorDurableSessionFailClosedState({
  nowMs,
  plan
}: {
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
}): CommentTranslatorSessionBrowserSafeState {
  return stopCommentTranslatorSession({
    activeSession: null,
    nowMs,
    plan,
    reason: "session-limit",
    usage: {
      dailyUsedMs: 0,
      translatedMessagesInCurrentMinute: 0,
      providerBudgetAvailable: false,
      globalBudgetAvailable: false,
      aiBudgetAvailable: false,
      translationProviderAvailable: false,
      planEntitlement: createCommentTranslatorSessionPlanEntitlement({ plan })
    }
  });
}

export function createCommentTranslatorDurableSessionRowDraft({
  ownerUserId,
  state,
  planEntitlementReferenceId,
  nowIso
}: {
  ownerUserId: string;
  state: Exclude<CommentTranslatorSessionBrowserSafeState, { status: "not-started" }>;
  planEntitlementReferenceId: string;
  nowIso: string;
}): CommentTranslatorDurableSessionRowDraft {
  const sessionReferenceId = state.sessionReferenceId;
  if (!sessionReferenceId) {
    throw new Error("A durable session row requires an opaque session reference.");
  }

  const startedAtIso = state.startedAtIso ?? nowIso;
  const lastHeartbeatAtIso = state.heartbeat.lastHeartbeatAtIso ?? startedAtIso;

  return {
    owner_user_id: ownerUserId,
    session_reference_id: sessionReferenceId,
    provider: "youtube",
    plan: state.plan,
    plan_entitlement_reference_id: planEntitlementReferenceId,
    status: state.status,
    started_at: startedAtIso,
    last_heartbeat_at: lastHeartbeatAtIso,
    stopped_at: state.stoppedAtIso,
    stop_reason: state.status === "stopped" ? state.stopReason : null,
    credential_reference_id: state.credentialReferenceId,
    updated_at: nowIso,
    provider_target_metadata: "forbidden",
    token_value: "never-returned-by-design",
    authorization_header_value: "never-returned-by-design",
    raw_provider_payload: "never-recorded-by-design"
  };
}

function createCommentTranslatorActiveSessionRecordFromRow(
  row: CommentTranslatorDurableSessionRow
): CommentTranslatorActiveSessionRecord {
  return {
    sessionReferenceId: row.session_reference_id,
    startedAtMs: Date.parse(row.started_at),
    lastHeartbeatAtMs: Date.parse(row.last_heartbeat_at),
    credentialReferenceId: row.credential_reference_id ?? undefined
  };
}

function omitBrowserSafetyMarkers(
  rowDraft: CommentTranslatorDurableSessionRowDraft
): Omit<CommentTranslatorDurableSessionRowDraft, "provider_target_metadata" | "token_value" | "authorization_header_value" | "raw_provider_payload"> {
  const {
    provider_target_metadata: _providerTargetMetadata,
    token_value: _tokenValue,
    authorization_header_value: _authorizationHeaderValue,
    raw_provider_payload: _rawProviderPayload,
    ...row
  } = rowDraft;

  return row;
}

function assertSuccessfulWrite(result: SupabaseSingleResult) {
  if (result.error || !result.data) {
    throw new Error("Trusted comment translator session write failed.");
  }
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorDurableSessionStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorDurableSessionStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorDurableSessionSupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as unknown as CommentTranslatorDurableSessionSupabaseClient;
}
