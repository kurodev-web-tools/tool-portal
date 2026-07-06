import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const durableUsagePath = "lib/comment-translator-durable-usage-counter-store.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const durableSessionPath = "lib/comment-translator-durable-session-store.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const migrationPath = "supabase/migrations/20260615001000_comment_translator_usage_ledger_events.sql";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) {
      return moduleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;

    const testModule = new Module(normalizedModulePath);
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") {
      return {};
    }

    if (request === "@supabase/supabase-js") {
      return {
        createClient(url, key) {
          return { url, key, from: () => ({}) };
        }
      };
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(sourcePath);
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [
  durableUsagePath,
  usageLedgerPath,
  durableSessionPath,
  routePath,
  actionPath,
  readinessDocPath,
  gapAuditPath,
  migrationPath
]) {
  assert.ok(exists(requiredPath), `F4 required file exists: ${requiredPath}`);
}

const durableUsageSource = read(durableUsagePath);
const usageLedgerSource = read(usageLedgerPath);
const routeSource = read(routePath);
const actionSource = read(actionPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const migration = read(migrationPath);
const taskSource = read(taskPath);

assert.match(durableUsageSource, /^import "server-only";/m, "durable usage counter adapter is server-only");
assert.match(durableUsageSource, /commentTranslatorDurableUsageCounterStoreContract/, "adapter exposes durable usage counter contract");
assert.match(durableUsageSource, /createTrustedCommentTranslatorUsageCounterSupabaseStore/, "adapter exposes trusted Supabase factory");
assert.match(durableUsageSource, /readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "adapter exposes fail-closed durable snapshot reads");
assert.match(durableUsageSource, /recordCommentTranslatorDurableUsageLedgerEventOrFailClosed/, "adapter exposes server-owned durable event writes");
assert.match(durableUsageSource, /createCommentTranslatorDurableUsageCounterRowDraft/, "adapter maps sanitized ledger events to durable row drafts");
assert.match(durableUsageSource, /monthlyUsageAuthority:\s*"durable-store-required"/, "adapter contract requires monthly durable usage authority");
assert.match(durableUsageSource, /dailyUsageAuthority:\s*"durable-store-required"/, "adapter contract requires daily durable usage authority");
assert.match(durableUsageSource, /sessionUsageAuthority:\s*"durable-store-required"/, "adapter contract requires session durable usage authority");
assert.match(durableUsageSource, /remoteSupabaseMigrationApply:\s*"not-run-in-this-thread"/, "adapter contract records remote migration apply not-run");

assert.match(usageLedgerSource, /storageStage:\s*"durable-counter-adapter-f4"/, "usage ledger storage stage points to F4 durable adapter");
assert.match(routeSource, /createTrustedCommentTranslatorUsageCounterSupabaseStore/, "session route wires the durable usage store factory");
assert.match(routeSource, /readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "session route reads durable usage counters with fail-closed fallback");
assert.match(routeSource, /recordCommentTranslatorDurableSessionLedgerStateOrFailClosed/, "session route writes durable session usage events");
assert.match(actionSource, /createTrustedCommentTranslatorUsageCounterSupabaseStore/, "session actions wire the durable usage store factory");
assert.match(actionSource, /readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "session actions read durable usage counters with fail-closed fallback");
assert.match(actionSource, /recordCommentTranslatorDurableSessionLedgerStateOrFailClosed/, "session actions write durable session usage events");

for (const requiredSql of [
  "create table if not exists public.comment_translator_usage_ledger_events",
  "owner_user_id uuid not null references auth.users(id) on delete cascade",
  "user_ledger_reference_id text not null",
  "session_reference_id text",
  "usage_day date not null",
  "usage_month date not null",
  "event_type text not null",
  "provider_request_estimate_count integer not null default 0",
  "translated_message_estimate integer not null default 0",
  "translated_character_estimate integer not null default 0",
  "quota_stop_category text",
  "alter table public.comment_translator_usage_ledger_events enable row level security",
  "revoke all on table public.comment_translator_usage_ledger_events from anon",
  "revoke all on table public.comment_translator_usage_ledger_events from authenticated",
  "grant all on table public.comment_translator_usage_ledger_events to service_role",
  "comment_translator_usage_ledger_events_owner_month_idx",
  "comment_translator_usage_ledger_events_session_idx"
]) {
  assert.match(migration, new RegExp(requiredSql.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `migration includes ${requiredSql}`);
}

assert.doesNotMatch(
  migration,
  /access_token|refresh_token|authorization_code|Authorization\s*[:=]|service_role\s*[:=]|liveChatId|providerChannelId|provider target|raw provider|raw comment/i,
  "migration does not store or describe token values, provider targets, liveChatId values, or raw provider/comment payloads"
);

assert.match(readinessDoc, /comment_translator_usage_ledger_events/, "durable readiness doc mentions durable usage ledger events");
assert.match(gapAudit, /F4[\s\S]*Durable usage ledger rows, monthly\/daily\/session counters, quota stop events, and server-owned writes/i, "gap audit F4 requirement remains visible");

const durableUsage = loadTsModule(durableUsagePath);
const usageLedger = loadTsModule(usageLedgerPath);

assert.equal(durableUsage.commentTranslatorDurableUsageCounterStoreContract.implementationStage, "free-public-beta-f4-durable-usage-counter-schema-adapter");
assert.equal(durableUsage.commentTranslatorDurableUsageCounterStoreContract.runtime, "server-only");
assert.equal(durableUsage.commentTranslatorDurableUsageCounterStoreContract.tableName, "comment_translator_usage_ledger_events");
assert.equal(durableUsage.commentTranslatorDurableUsageCounterStoreContract.browserReadableOutput, "sanitized-usage-metadata-only");
assert.equal(durableUsage.commentTranslatorDurableUsageCounterStoreContract.publicLaunchAllowed, false);

const unavailableRuntime = durableUsage.createTrustedCommentTranslatorUsageCounterSupabaseStore({
  env: {},
  createSupabaseClient: () => {
    throw new Error("must not create Supabase client when env is missing");
  }
});
assert.equal(unavailableRuntime.status, "unavailable", "missing trusted env yields unavailable durable usage runtime");
assert.deepEqual(
  unavailableRuntime.missingEnvReferences.sort(),
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].sort(),
  "unavailable runtime reports only env reference names"
);
assert.equal(unavailableRuntime.failClosed, true, "unavailable durable usage runtime is fail closed");
assert.doesNotMatch(JSON.stringify(unavailableRuntime), /secret.*value|token|ownerUserId|providerChannelId|liveChatId/i);

const failClosedRead = durableUsage.createUnavailableCommentTranslatorDurableUsageRead({
  reason: "trusted-service-role-env-missing"
});
assert.equal(failClosedRead.status, "fail-closed");
assert.equal(failClosedRead.snapshot, null);
assert.equal(failClosedRead.stopReason, "global-budget-stop");
assert.doesNotMatch(JSON.stringify(failClosedRead), /owner|providerChannelId|liveChatId|access_token|refresh_token|Authorization|service_role/i);

const callerAuthorization = {
  status: "authorized",
  ownerUserId: "server-only-owner-reference"
};
const freeEntitlement = usageLedger.resolveCommentTranslatorUsagePlanEntitlement({ plan: "free" });
const activeSession = {
  sessionReferenceId: "cts_usage_session_f4",
  startedAtMs: Date.parse("2026-06-15T00:00:00.000Z"),
  lastHeartbeatAtMs: Date.parse("2026-06-15T00:00:10.000Z"),
  credentialReferenceId: "ytcred_usage_reference_001"
};

const aiUsageRowDraft = durableUsage.createCommentTranslatorDurableUsageCounterRowDraft({
  ownerUserId: callerAuthorization.ownerUserId,
  userLedgerReferenceId: usageLedger.createCommentTranslatorUsageLedgerUserReference(callerAuthorization),
  event: {
    type: "ai-usage-estimated",
    provider: "youtube",
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: Date.parse("2026-06-15T00:00:30.000Z"),
    translatedMessageEstimate: 7,
    translatedCharacterEstimate: 280,
    estimatedCostMicros: 1400,
    rawCommentText: "never-recorded-by-design"
  },
  nowIso: "2026-06-15T00:00:31.000Z"
});
assert.equal(aiUsageRowDraft.owner_user_id, callerAuthorization.ownerUserId);
assert.equal(aiUsageRowDraft.usage_day, "2026-06-15");
assert.equal(aiUsageRowDraft.usage_month, "2026-06-01");
assert.equal(aiUsageRowDraft.event_type, "ai-usage-estimated");
assert.equal(aiUsageRowDraft.translated_message_estimate, 7);
assert.equal(aiUsageRowDraft.translated_character_estimate, 280);
assert.equal(aiUsageRowDraft.raw_comment_text, "never-recorded-by-design");
assert.equal(aiUsageRowDraft.provider_target_metadata, "forbidden");
assert.doesNotMatch(JSON.stringify(aiUsageRowDraft), /liveChatId|providerChannelId|access_token|refresh_token|Authorization: Bearer|raw provider|raw comment/i);

const quotaStopRowDraft = durableUsage.createCommentTranslatorDurableUsageCounterRowDraft({
  ownerUserId: callerAuthorization.ownerUserId,
  userLedgerReferenceId: usageLedger.createCommentTranslatorUsageLedgerUserReference(callerAuthorization),
  event: {
    type: "quota-budget-stop",
    provider: "youtube",
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: Date.parse("2026-06-15T00:00:40.000Z"),
    stopReason: "global-budget-stop",
    stopCategory: "global-budget",
    clientReadableDetail: "sanitized-stop-reason-only"
  },
  nowIso: "2026-06-15T00:00:41.000Z"
});
assert.equal(quotaStopRowDraft.event_type, "quota-budget-stop");
assert.equal(quotaStopRowDraft.quota_stop_category, "global-budget");
assert.equal(quotaStopRowDraft.stop_reason, "global-budget-stop");
assert.equal(quotaStopRowDraft.client_readable_detail, "sanitized-stop-reason-only");

const persistedRows = [];
const readyStore = durableUsage.createCommentTranslatorDurableUsageCounterSupabaseStore({
  nowIso: () => "2026-06-15T00:01:00.000Z",
  supabase: {
    from(tableName) {
      assert.equal(tableName, "comment_translator_usage_ledger_events");
      return {
        insert(row) {
          persistedRows.push(row);
          return this;
        },
        select() {
          return this;
        },
        eq() {
          return this;
        },
        gte() {
          return this;
        },
        order() {
          return this;
        },
        single() {
          return Promise.resolve({ data: persistedRows.at(-1) ?? null, error: null });
        },
        then(resolve) {
          resolve({ data: persistedRows, error: null });
        }
      };
    }
  }
});

const writeResult = await durableUsage.recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: {
    status: "ready",
    store: readyStore,
    missingEnvReferences: [],
    failClosed: false
  },
  event: {
    type: "provider-request-estimated",
    provider: "youtube",
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: Date.parse("2026-06-15T00:00:20.000Z"),
    requestEstimateCount: 3,
    quotaUnitEstimate: 3,
    providerTargetMetadata: "forbidden"
  }
});
assert.equal(writeResult.status, "persisted", "durable usage event writes persist through trusted store");
assert.equal(persistedRows.length, 1);
assert.equal(persistedRows[0].provider_request_estimate_count, 3);

const noReferenceStoppedResult = await durableUsage.recordCommentTranslatorDurableSessionLedgerStateOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: {
    status: "ready",
    store: readyStore,
    missingEnvReferences: [],
    failClosed: false
  },
  intent: "start",
  state: {
    status: "stopped",
    provider: "youtube",
    plan: "free",
    sessionReferenceId: null,
    credentialReferenceId: "ytcred_usage_reference_001",
    startedAtIso: null,
    stoppedAtIso: "2026-06-15T00:00:01.000Z",
    elapsedSeconds: 0,
    remainingSessionSeconds: 1_800,
    remainingDailySeconds: 1_800,
    heartbeat: {
      required: true,
      timeoutSeconds: 45,
      lastHeartbeatAtIso: null
    },
    stopReason: "reconnect-required",
    nextAction: "reconnect-or-sign-in",
    providerApiUsage: "stopped",
    aiTranslationUsage: "stopped",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    providerErrorBody: "never-returned-by-design"
  },
  occurredAtMs: Date.parse("2026-06-15T00:00:25.000Z"),
  planEntitlement: freeEntitlement
});
assert.equal(noReferenceStoppedResult.status, "persisted", "stopped states without session reference do not create invalid session-stopped rows");
assert.equal(persistedRows.length, 1, "non-quota stopped states without session reference do not create durable usage rows");

await durableUsage.recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: {
    status: "ready",
    store: readyStore,
    missingEnvReferences: [],
    failClosed: false
  },
  event: {
    type: "session-stopped",
    provider: "youtube",
    planEntitlement: freeEntitlement,
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: Date.parse("2026-06-15T00:30:00.000Z"),
    elapsedMs: 1_800_000,
    stopReason: "session-time-limit"
  }
});
await durableUsage.recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: {
    status: "ready",
    store: readyStore,
    missingEnvReferences: [],
    failClosed: false
  },
  event: {
    type: "ai-usage-estimated",
    provider: "youtube",
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: Date.parse("2026-06-15T00:30:30.000Z"),
    translatedMessageEstimate: 7,
    translatedCharacterEstimate: 280,
    estimatedCostMicros: 1400,
    rawCommentText: "never-recorded-by-design"
  }
});

const snapshotRead = await durableUsage.readCommentTranslatorDurableUsageSnapshotOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: {
    status: "ready",
    store: readyStore,
    missingEnvReferences: [],
    failClosed: false
  },
  nowMs: Date.parse("2026-06-15T00:31:00.000Z"),
  plan: "free",
  activeSession
});
assert.equal(snapshotRead.status, "ready");
assert.equal(snapshotRead.snapshot.dailyUsedMs, 1_800_000);
assert.equal(snapshotRead.snapshot.providerRequestEstimate.requestEstimateCount, 3);
assert.equal(snapshotRead.snapshot.aiUsageEstimate.translatedMessageEstimate, 7);
assert.equal(snapshotRead.snapshot.aiUsageEstimate.translatedCharacterEstimate, 280);
assert.equal(snapshotRead.snapshot.monthlyTranslatedCharacterEstimate, 280);
assert.equal(snapshotRead.snapshot.currentSessionElapsedMs, 55_000);
assert.doesNotMatch(
  JSON.stringify(snapshotRead),
  /server-only-owner-reference|ytcred_usage_reference_001|providerChannelId|liveChatId|access_token|refresh_token|authorization_code|Authorization|service_role|raw comment/i,
  "durable usage snapshot excludes owner id values, credential refs, provider targets, credentials, and raw comments"
);

const crossDayRows = [];
const crossDayStore = durableUsage.createCommentTranslatorDurableUsageCounterSupabaseStore({
  nowIso: () => "2026-06-16T00:01:00.000Z",
  supabase: {
    from(tableName) {
      assert.equal(tableName, "comment_translator_usage_ledger_events");
      return {
        insert(row) {
          crossDayRows.push(row);
          return this;
        },
        select() {
          return this;
        },
        eq() {
          return this;
        },
        gte() {
          return this;
        },
        order() {
          return this;
        },
        single() {
          return Promise.resolve({ data: crossDayRows.at(-1) ?? null, error: null });
        },
        then(resolve) {
          resolve({ data: crossDayRows, error: null });
        }
      };
    }
  }
});
const crossDayDurableStore = {
  status: "ready",
  store: crossDayStore,
  missingEnvReferences: [],
  failClosed: false
};
await durableUsage.recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: crossDayDurableStore,
  event: {
    type: "session-stopped",
    provider: "youtube",
    planEntitlement: freeEntitlement,
    sessionReferenceId: "cts_usage_cross_day",
    occurredAtMs: Date.parse("2026-06-16T00:00:30.000Z"),
    elapsedMs: 60_000,
    stopReason: "user-stop"
  }
});
const previousDayCrossSnapshot = await durableUsage.readCommentTranslatorDurableUsageSnapshotOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: crossDayDurableStore,
  nowMs: Date.parse("2026-06-15T23:59:45.000Z"),
  plan: "free",
  activeSession: null
});
const currentDayCrossSnapshot = await durableUsage.readCommentTranslatorDurableUsageSnapshotOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: crossDayDurableStore,
  nowMs: Date.parse("2026-06-16T00:01:00.000Z"),
  plan: "free",
  activeSession: null
});
assert.equal(previousDayCrossSnapshot.status, "ready");
assert.equal(currentDayCrossSnapshot.status, "ready");
assert.equal(
  previousDayCrossSnapshot.snapshot.dailyUsedMs,
  30_000,
  "cross-day stopped session charges only the elapsed overlap before the UTC day boundary to the previous day"
);
assert.equal(
  currentDayCrossSnapshot.snapshot.dailyUsedMs,
  30_000,
  "cross-day stopped session charges only the elapsed overlap after the UTC day boundary to the current day"
);

const staleStopRows = [];
const staleStopStore = durableUsage.createCommentTranslatorDurableUsageCounterSupabaseStore({
  nowIso: () => "2026-06-16T12:00:00.000Z",
  supabase: {
    from(tableName) {
      assert.equal(tableName, "comment_translator_usage_ledger_events");
      return {
        insert(row) {
          staleStopRows.push(row);
          return this;
        },
        select() {
          return this;
        },
        eq() {
          return this;
        },
        gte() {
          return this;
        },
        order() {
          return this;
        },
        single() {
          return Promise.resolve({ data: staleStopRows.at(-1) ?? null, error: null });
        },
        then(resolve) {
          resolve({ data: staleStopRows, error: null });
        }
      };
    }
  }
});
const staleStopDurableStore = {
  status: "ready",
  store: staleStopStore,
  missingEnvReferences: [],
  failClosed: false
};
await durableUsage.recordCommentTranslatorDurableSessionLedgerStateOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: staleStopDurableStore,
  intent: "heartbeat",
  state: {
    status: "stopped",
    provider: "youtube",
    plan: "free",
    sessionReferenceId: "cts_usage_stale_cross_day",
    credentialReferenceId: "ytcred_usage_reference_001",
    startedAtIso: "2026-06-15T23:55:00.000Z",
    stoppedAtIso: "2026-06-16T12:00:00.000Z",
    elapsedSeconds: 75,
    remainingSessionSeconds: 1_725,
    remainingDailySeconds: 1_725,
    heartbeat: {
      required: true,
      timeoutSeconds: 45,
      lastHeartbeatAtIso: "2026-06-15T23:55:30.000Z"
    },
    stopReason: "missing-heartbeat",
    nextAction: "session-stopped",
    providerApiUsage: "stopped",
    aiTranslationUsage: "stopped",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    providerErrorBody: "never-returned-by-design"
  },
  occurredAtMs: Date.parse("2026-06-16T12:00:00.000Z"),
  planEntitlement: freeEntitlement
});
assert.equal(staleStopRows.length, 1, "stale stop persists one bounded session-stopped row");
assert.equal(staleStopRows[0].usage_day, "2026-06-15", "stale stop usage day follows chargeable heartbeat end, not late cleanup time");
assert.equal(staleStopRows[0].occurred_at, "2026-06-15T23:56:15.000Z", "stale stop occurred_at is chargeable end metadata");
assert.equal(staleStopRows[0].session_elapsed_ms, 75_000, "stale stop row stores bounded chargeable elapsed");
const stalePreviousDaySnapshot = await durableUsage.readCommentTranslatorDurableUsageSnapshotOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: staleStopDurableStore,
  nowMs: Date.parse("2026-06-15T23:59:00.000Z"),
  plan: "free",
  activeSession: null
});
const staleCurrentDaySnapshot = await durableUsage.readCommentTranslatorDurableUsageSnapshotOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore: staleStopDurableStore,
  nowMs: Date.parse("2026-06-16T12:01:00.000Z"),
  plan: "free",
  activeSession: null
});
assert.equal(stalePreviousDaySnapshot.status, "ready");
assert.equal(staleCurrentDaySnapshot.status, "ready");
assert.equal(stalePreviousDaySnapshot.snapshot.dailyUsedMs, 75_000, "stale stop charges the active heartbeat window to the previous UTC day");
assert.equal(staleCurrentDaySnapshot.snapshot.dailyUsedMs, 0, "stale stop does not consume the next UTC day after heartbeat stopped");

assert.match(taskSource, /PL-G3/i, "task.md keeps the active PL-G3 state visible");
assert.match(taskSource, /public-release capable label: no/i, "task.md keeps public release blocked");

for (const source of [durableUsageSource, usageLedgerSource, routeSource, actionSource, migration, taskSource]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "F4 inspected source excludes secret values, token values, authorization values, and private provider identifiers"
  );
}

console.log("comment translator durable usage counter schema adapter contract checks passed");
