import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const adapterPath = "lib/comment-translator-durable-session-store.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const readinessRuntimePath = "lib/comment-translator-durable-persistence-readiness.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";
const migrationPath = "supabase/migrations/20260615000000_comment_translator_sessions.sql";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const base = "origin/codex/comment-translator-free-public-beta-integration";
  const committedDiff = execSync(`git diff --name-only ${base}...HEAD`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const uncommittedDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
}

function loadTsModule(relativePath) {
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
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [
  adapterPath,
  sessionRuntimePath,
  routePath,
  actionPath,
  readinessRuntimePath,
  readinessDocPath,
  gapAuditPath,
  migrationPath
]) {
  assert.ok(exists(requiredPath), `F3 required file exists: ${requiredPath}`);
}

const adapterSource = read(adapterPath);
const sessionRuntimeSource = read(sessionRuntimePath);
const routeSource = read(routePath);
const actionSource = read(actionPath);
const readinessRuntimeSource = read(readinessRuntimePath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const migration = read(migrationPath);
const taskSource = read(taskPath);

assert.match(adapterSource, /^import "server-only";/m, "durable session adapter is server-only");
assert.match(adapterSource, /commentTranslatorDurableSessionStoreContract/, "adapter exposes a durable session store contract");
assert.match(adapterSource, /createTrustedCommentTranslatorSessionSupabaseStore/, "adapter exposes trusted Supabase store wiring");
assert.match(adapterSource, /createUnavailableCommentTranslatorDurableSessionRead/, "adapter exposes fail-closed unavailable reads");
assert.match(adapterSource, /createCommentTranslatorDurableSessionRowDraft/, "adapter maps active browser state to a durable row draft");
assert.match(adapterSource, /createCommentTranslatorDurableSessionFailClosedState/, "adapter exposes browser-safe fail-closed state helper");
assert.match(adapterSource, /activeSessionsPerUserAuthority:\s*"durable-store-required"/, "adapter contract makes durable store the active-session authority");
assert.match(adapterSource, /remoteSupabaseMigrationApply:\s*"not-run-in-this-thread"/, "adapter contract records remote migration apply not-run");

assert.match(sessionRuntimeSource, /durableSessionAuthority:\s*"required-before-public-session-start"/, "session runtime records durable authority requirement");

assert.match(routeSource, /createTrustedCommentTranslatorSessionSupabaseStore/, "session route wires the durable session store factory");
assert.match(routeSource, /readCommentTranslatorDurableActiveSessionOrFailClosed/, "session route reads durable active session with fail-closed fallback");
assert.match(routeSource, /persistCommentTranslatorDurableSessionStateOrFailClosed/, "session route persists durable session state through the adapter");
assert.match(actionSource, /createTrustedCommentTranslatorSessionSupabaseStore/, "server action wires the durable session store factory");
assert.match(actionSource, /readCommentTranslatorDurableActiveSessionOrFailClosed/, "server action reads durable active session with fail-closed fallback");
assert.match(actionSource, /persistCommentTranslatorDurableSessionStateOrFailClosed/, "server action persists durable session state through the adapter");

for (const requiredSql of [
  "create table if not exists public.comment_translator_sessions",
  "owner_user_id uuid not null references auth.users(id) on delete cascade",
  "session_reference_id text not null",
  "status text not null",
  "credential_reference_id text",
  "plan_entitlement_reference_id text not null",
  "last_heartbeat_at timestamptz not null",
  "stopped_at timestamptz",
  "stop_reason text",
  "alter table public.comment_translator_sessions enable row level security",
  "revoke all on table public.comment_translator_sessions from anon",
  "revoke all on table public.comment_translator_sessions from authenticated",
  "grant all on table public.comment_translator_sessions to service_role",
  "comment_translator_sessions_one_active_per_owner_idx"
]) {
  assert.match(migration, new RegExp(requiredSql.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `migration includes ${requiredSql}`);
}

assert.doesNotMatch(
  migration,
  /access_token|refresh_token|authorization_code|Authorization\s*[:=]|service_role\s*[:=]|liveChatId|providerChannelId|provider target|raw provider|raw comment/i,
  "migration does not store or describe token values, provider targets, liveChatId values, or raw provider payloads"
);

assert.match(readinessRuntimeSource, /comment_translator_sessions/, "durable readiness continues to point F3 at comment_translator_sessions");
assert.match(readinessDoc, /comment_translator_sessions/, "durable readiness doc continues to mention the session durable store");
assert.match(gapAudit, /F3[\s\S]*Durable schema\/adapter or approved migration plan plus fail-closed reads and rollback/i, "gap audit F3 requirement remains visible");

const adapter = loadTsModule(adapterPath);

assert.equal(adapter.commentTranslatorDurableSessionStoreContract.implementationStage, "free-public-beta-f3-durable-session-schema-adapter");
assert.equal(adapter.commentTranslatorDurableSessionStoreContract.runtime, "server-only");
assert.equal(adapter.commentTranslatorDurableSessionStoreContract.tableName, "comment_translator_sessions");
assert.equal(adapter.commentTranslatorDurableSessionStoreContract.browserReadableOutput, "sanitized-session-metadata-only");
assert.equal(adapter.commentTranslatorDurableSessionStoreContract.failClosedFallback, "stop-session-when-durable-store-unavailable");
assert.equal(adapter.commentTranslatorDurableSessionStoreContract.publicLaunchAllowed, false);

const unavailableRuntime = adapter.createTrustedCommentTranslatorSessionSupabaseStore({
  env: {},
  createSupabaseClient: () => {
    throw new Error("must not create Supabase client when env is missing");
  }
});
assert.equal(unavailableRuntime.status, "unavailable", "missing trusted env yields unavailable runtime");
assert.deepEqual(
  unavailableRuntime.missingEnvReferences.sort(),
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].sort(),
  "unavailable runtime reports only env reference names"
);
assert.equal(unavailableRuntime.failClosed, true, "unavailable durable runtime is fail closed");
assert.doesNotMatch(JSON.stringify(unavailableRuntime), /secret.*value|token|ownerUserId|providerChannelId|liveChatId/i);

const failClosedRead = adapter.createUnavailableCommentTranslatorDurableSessionRead({
  reason: "trusted-service-role-env-missing"
});
assert.equal(failClosedRead.status, "fail-closed");
assert.equal(failClosedRead.activeSession, null);
assert.equal(failClosedRead.stopReason, "session-limit");
assert.doesNotMatch(JSON.stringify(failClosedRead), /owner|providerChannelId|liveChatId|access_token|refresh_token|Authorization|service_role/i);

const failClosedState = adapter.createCommentTranslatorDurableSessionFailClosedState({
  nowMs: 1_000,
  plan: "free"
});
assert.equal(failClosedState.status, "stopped");
assert.equal(failClosedState.stopReason, "session-limit");
assert.equal(failClosedState.providerTargetMetadata, "forbidden");
assert.equal(failClosedState.tokenValue, "never-returned-by-design");

let noReferencePersistCalls = 0;
const noReferencePersist = await adapter.persistCommentTranslatorDurableSessionStateOrFailClosed({
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  durableSessionStore: {
    status: "ready",
    store: {
      async readActiveSession() {
        return null;
      },
      async persistSessionState() {
        noReferencePersistCalls += 1;
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  state: {
    status: "stopped",
    provider: "youtube",
    plan: "free",
    sessionReferenceId: null,
    credentialReferenceId: "ytcred_session_reference_001",
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
  planEntitlementReferenceId: "comment-translator-free-public-v1"
});
assert.equal(noReferencePersist.status, "persisted", "stopped states without a session reference do not fail closed");
assert.equal(noReferencePersistCalls, 0, "stopped states without a session reference do not create durable rows");

const rowDraft = adapter.createCommentTranslatorDurableSessionRowDraft({
  ownerUserId: "server-only-owner-reference",
  state: {
    status: "active",
    provider: "youtube",
    plan: "free",
    sessionReferenceId: "cts_session_reference_001",
    credentialReferenceId: "ytcred_session_reference_001",
    startedAtIso: "2026-06-15T00:00:00.000Z",
    stoppedAtIso: null,
    elapsedSeconds: 0,
    remainingSessionSeconds: 1_800,
    remainingDailySeconds: 1_800,
    heartbeat: {
      required: true,
      timeoutSeconds: 45,
      lastHeartbeatAtIso: "2026-06-15T00:00:00.000Z"
    },
    stopReason: null,
    nextAction: "send-heartbeat-or-stop",
    providerApiUsage: "allowed-after-explicit-start-not-run-in-task-7",
    aiTranslationUsage: "allowed-after-explicit-start-not-run-in-task-7",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  },
  planEntitlementReferenceId: "comment-translator-free-public-v1",
  nowIso: "2026-06-15T00:00:01.000Z"
});
assert.equal(rowDraft.owner_user_id, "server-only-owner-reference");
assert.equal(rowDraft.status, "active");
assert.equal(rowDraft.stop_reason, null);
assert.equal(rowDraft.provider_target_metadata, "forbidden");
assert.equal(rowDraft.token_value, "never-returned-by-design");
assert.equal(rowDraft.authorization_header_value, "never-returned-by-design");
assert.doesNotMatch(JSON.stringify(rowDraft), /liveChatId|providerChannelId|access_token|refresh_token|Authorization: Bearer|raw provider|raw comment/i);

assert.match(taskSource, /F3 status[\s\S]*Status: complete in this PR/i, "task.md records F3 completion");
assert.match(taskSource, /remote Supabase migration apply[\s\S]*not-run\/approval-gated/i, "task.md records remote migration apply as not-run/gated");
assert.match(taskSource, /width checks skipped[\s\S]*no UI\/CSS\/rendered route\/visible layout change/i, "task.md records width-check skip reason");

for (const source of [adapterSource, sessionRuntimeSource, routeSource, actionSource, migration, taskSource]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "F3 inspected source excludes secret values, token values, authorization values, and private provider identifiers"
  );
}

const allowedChangedFiles = new Set([
  adapterPath,
  sessionRuntimePath,
  routePath,
  actionPath,
  migrationPath,
  "scripts/comment-translator-durable-session-schema-adapter-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F3 change stays in allowed files: ${file}`);
}

console.log("comment translator durable session schema adapter contract checks passed");
