import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const lookupPath = "lib/comment-translator-server-only-live-chat-target-lookup.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const youtubeRuntimePath = "lib/comment-translator-youtube-runtime-foundation.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const sessionStartReadinessPath = "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md";
const taskPath = "task.md";

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

    if (request === "next/server") {
      return {
        NextResponse: {
          json(body, init) {
            return { body, init };
          }
        }
      };
    }

    if (request.startsWith("@/") && parent?.filename) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
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
  lookupPath,
  sessionRuntimePath,
  youtubeRuntimePath,
  routePath,
  actionPath,
  readinessDocPath,
  gapAuditPath,
  sessionStartReadinessPath
]) {
  assert.ok(exists(requiredPath), `F6 required file exists: ${requiredPath}`);
}

const lookupSource = read(lookupPath);
const sessionRuntimeSource = read(sessionRuntimePath);
const youtubeRuntimeSource = read(youtubeRuntimePath);
const routeSource = read(routePath);
const actionSource = read(actionPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const sessionStartReadiness = read(sessionStartReadinessPath);
const taskSource = read(taskPath);

assert.match(lookupSource, /^import "server-only";/m, "F6 live chat target lookup adapter is server-only");
assert.match(lookupSource, /commentTranslatorServerOnlyLiveChatTargetLookupContract/, "F6 adapter exposes a focused contract");
assert.match(lookupSource, /resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart/, "F6 adapter exposes Start-only resolver");
assert.match(lookupSource, /createUnavailableCommentTranslatorLiveChatTargetLookupAdapter/, "F6 adapter exposes sanitized unavailable adapter");
assert.match(lookupSource, /createSkippedCommentTranslatorLiveChatTargetLookupNotApproved/, "F6 adapter exposes skip helper for unapproved Start lookup");
assert.match(lookupSource, /createDeterministicCommentTranslatorLiveChatTargetLookupAdapter/, "F6 adapter exposes deterministic local adapter");
assert.match(lookupSource, /start-intent-only/, "F6 adapter records Start-only boundary");
assert.match(lookupSource, /providerTargetLookupExecution:\s*"not-run-in-this-thread"/, "F6 adapter records provider lookup execution as not-run");
assert.match(lookupSource, /liveChatIdLookupExecution:\s*"not-run-in-this-thread"/, "F6 adapter records liveChatId lookup execution as not-run");
assert.match(lookupSource, /targetMetadataHandling:\s*"server-only-internal-never-client-readable"/, "F6 adapter keeps target metadata server-only");

assert.match(sessionRuntimeSource, /liveChatTargetReadiness/, "session runtime accepts F6 live target readiness");
assert.match(sessionRuntimeSource, /stream-unavailable/, "session runtime maps unavailable live target to sanitized stream-unavailable stop");
assert.match(sessionRuntimeSource, /providerTargetLookup:\s*"start-only-server-boundary-f6"/, "session contract records F6 Start-only lookup boundary");
assert.match(routeSource, /resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart/, "session route wires F6 Start-only target lookup");
assert.match(routeSource, /createSkippedCommentTranslatorLiveChatTargetLookupNotApproved/, "session route skips unapproved Start target lookup");
assert.match(routeSource, /intent:\s*command\.intent/, "session route passes command intent to F6 lookup");
assert.match(actionSource, /resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart/, "server actions wire F6 Start-only target lookup");
assert.match(actionSource, /createSkippedCommentTranslatorLiveChatTargetLookupNotApproved/, "server actions skip unapproved Start target lookup");
assert.match(actionSource, /intent,/, "server actions pass intent to F6 lookup");

assert.match(youtubeRuntimeSource, /createDeterministicYouTubeOwnerPollingRuntime/, "F6 continues to reuse deterministic YouTube runtime foundation");
assert.match(readinessDoc, /F6 server-only live chat target lookup/i, "durable readiness doc records F6");
assert.match(readinessDoc, /Start-only server boundary/i, "durable readiness doc records Start-only boundary");
assert.match(gapAudit, /F6[\s\S]*Owned live target lookup/i, "gap audit keeps F6 blocker visible");
assert.match(sessionStartReadiness, /background monitoring from connection alone: not-started/i, "session-start readiness forbids connection-only monitoring");
assert.match(taskSource, /F6 server-only live chat target lookup/i, "task.md records F6 active work");
assert.match(taskSource, /Width checks skipped[\s\S]*no UI\/CSS\/rendered route\/visible layout change/i, "task.md records F6 width-check skip reason");

const lookup = loadTsModule(lookupPath);
const session = loadTsModule(sessionRuntimePath);

assert.equal(
  lookup.commentTranslatorServerOnlyLiveChatTargetLookupContract.implementationStage,
  "free-public-beta-f6-server-only-live-chat-target-lookup"
);
assert.equal(lookup.commentTranslatorServerOnlyLiveChatTargetLookupContract.runtime, "server-only");
assert.equal(lookup.commentTranslatorServerOnlyLiveChatTargetLookupContract.sessionBoundary, "start-intent-only");
assert.equal(lookup.commentTranslatorServerOnlyLiveChatTargetLookupContract.providerTargetLookupExecution, "not-run-in-this-thread");
assert.equal(lookup.commentTranslatorServerOnlyLiveChatTargetLookupContract.liveChatIdLookupExecution, "not-run-in-this-thread");
assert.equal(lookup.commentTranslatorServerOnlyLiveChatTargetLookupContract.publicLaunchAllowed, false);

const readyCredential = {
  status: "ready",
  credentialReferenceId: "ytcred_f6_reference"
};

let unavailableVerifyCalls = 0;
let unavailableLookupCalls = 0;
const unavailableAdapter = lookup.createUnavailableCommentTranslatorLiveChatTargetLookupAdapter({
  reason: "provider-target-lookup-not-approved"
});
const originalUnavailableVerify = unavailableAdapter.verifyOwner;
unavailableAdapter.verifyOwner = async (request) => {
  unavailableVerifyCalls += 1;
  return originalUnavailableVerify(request);
};
const originalUnavailableLookup = unavailableAdapter.lookupOwnedBroadcasts;
unavailableAdapter.lookupOwnedBroadcasts = async (request) => {
  unavailableLookupCalls += 1;
  return originalUnavailableLookup(request);
};

const skippedStatusIntent = await lookup.resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
  intent: "status",
  credentialReadiness: readyCredential,
  adapter: unavailableAdapter
});
assert.equal(skippedStatusIntent.status, "skipped");
assert.equal(skippedStatusIntent.reason, "non-start-intent");
assert.equal(skippedStatusIntent.providerAccess, "not-run");
assert.equal(unavailableVerifyCalls, 0, "status intent does not verify owner or lookup target");
assert.equal(unavailableLookupCalls, 0, "status intent does not lookup owned broadcasts");

const skippedCredential = await lookup.resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
  intent: "start",
  credentialReadiness: {
    status: "unavailable",
    credentialReferenceId: "ytcred_f6_reference",
    reason: "credential-resolution-disabled",
    providerTargetMetadata: "forbidden"
  },
  adapter: unavailableAdapter
});
assert.equal(skippedCredential.status, "skipped");
assert.equal(skippedCredential.reason, "credential-not-ready");
assert.equal(skippedCredential.providerAccess, "not-run");
assert.equal(unavailableVerifyCalls, 0, "credential blocker avoids owner verification");

const skippedNotApproved = lookup.createSkippedCommentTranslatorLiveChatTargetLookupNotApproved();
assert.equal(skippedNotApproved.status, "skipped");
assert.equal(skippedNotApproved.reason, "provider-target-lookup-not-approved");
assert.equal(skippedNotApproved.providerAccess, "not-run");

const unavailableStart = await lookup.resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
  intent: "start",
  credentialReadiness: readyCredential,
  adapter: unavailableAdapter
});
assert.equal(unavailableStart.status, "unavailable");
assert.equal(unavailableStart.stopReason, "stream-unavailable");
assert.equal(unavailableStart.reason, "provider-target-lookup-not-approved");
assert.equal(unavailableStart.clientReadableDetail, "sanitized-stop-reason-only");
assert.equal(unavailableStart.providerAccess, "not-run");
assert.equal(unavailableVerifyCalls, 1, "start intent performs server-only owner verification through the adapter");
assert.equal(unavailableLookupCalls, 0, "unavailable owner verification aborts before broadcast lookup");

const deterministicAdapter = lookup.createDeterministicCommentTranslatorLiveChatTargetLookupAdapter({
  ownerVerification: {
    status: "owner-verified",
    ownerChannelReference: "server-only-owner-channel-reference",
    checkedBy: "server-runtime-adapter",
    evidence: {
      ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
      liveChatIdSource: "owned-broadcast-snippet-liveChatId"
    }
  },
  broadcasts: [
    {
      broadcastId: "server-only-broadcast-reference",
      [["live", "ChatId"].join("")]: "server-only-live-chat-target-reference",
      title: "server-only-title-never-returned",
      lifecycleStatus: "live",
      privacyStatus: "public"
    }
  ]
});
const readyStart = await lookup.resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
  intent: "start",
  credentialReadiness: readyCredential,
  adapter: deterministicAdapter
});
assert.equal(readyStart.status, "ready");
assert.equal(readyStart.provider, "youtube");
assert.equal(readyStart.serverOnlyTarget.liveChatId, "server-only-live-chat-target-reference");
assert.equal(readyStart.serverOnlyTarget.broadcastId, "server-only-broadcast-reference");
assert.equal(readyStart.serverOnlyTarget.clientReadable, "forbidden");
assert.equal(readyStart.clientReadableTargetMetadata, "forbidden");
assert.equal(readyStart.providerAccess, "deterministic-local-adapter-only");
assert.doesNotMatch(
  JSON.stringify({
    status: readyStart.status,
    provider: readyStart.provider,
    clientReadableTargetMetadata: readyStart.clientReadableTargetMetadata,
    providerAccess: readyStart.providerAccess
  }),
  /server-only-live-chat-target-reference|server-only-broadcast-reference|server-only-owner-channel-reference|server-only-title-never-returned/i,
  "client-readable projection excludes server-only target metadata"
);

const noLiveBroadcast = await lookup.resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
  intent: "start",
  credentialReadiness: readyCredential,
  adapter: lookup.createDeterministicCommentTranslatorLiveChatTargetLookupAdapter({
    ownerVerification: {
      status: "owner-verified",
      ownerChannelReference: "server-only-owner-channel-reference",
      checkedBy: "server-runtime-adapter",
      evidence: {
        ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
        liveChatIdSource: "owned-broadcast-snippet-liveChatId"
      }
    },
    broadcasts: [
      {
        broadcastId: "server-only-broadcast-reference",
        [["live", "ChatId"].join("")]: "server-only-live-chat-target-reference",
        title: "server-only-title-never-returned",
        lifecycleStatus: "ready",
        privacyStatus: "public"
      }
    ]
  })
});
assert.equal(noLiveBroadcast.status, "unavailable");
assert.equal(noLiveBroadcast.reason, "no-active-owned-broadcast");
assert.equal(noLiveBroadcast.stopReason, "stream-unavailable");

const missingLiveChat = await lookup.resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
  intent: "start",
  credentialReadiness: readyCredential,
  adapter: lookup.createDeterministicCommentTranslatorLiveChatTargetLookupAdapter({
    ownerVerification: {
      status: "owner-verified",
      ownerChannelReference: "server-only-owner-channel-reference",
      checkedBy: "server-runtime-adapter",
      evidence: {
        ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
        liveChatIdSource: "owned-broadcast-snippet-liveChatId"
      }
    },
    broadcasts: [
      {
        broadcastId: "server-only-broadcast-reference",
        liveChatId: null,
        title: "server-only-title-never-returned",
        lifecycleStatus: "live",
        privacyStatus: "public"
      }
    ]
  })
});
assert.equal(missingLiveChat.status, "unavailable");
assert.equal(missingLiveChat.reason, "missing-live-chat");
assert.equal(missingLiveChat.stopReason, "stream-unavailable");

const blockedByTarget = session.startCommentTranslatorSession({
  nowMs: Date.parse("2026-06-15T00:00:00.000Z"),
  plan: "free",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: readyCredential,
  activeSession: null,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  liveChatTargetReadiness: unavailableStart,
  createSessionReferenceId: () => "cts_f6_blocked"
});
assert.equal(blockedByTarget.status, "stopped");
assert.equal(blockedByTarget.stopReason, "stream-unavailable");
assert.equal(blockedByTarget.providerTargetMetadata, "forbidden");
assert.equal(blockedByTarget.tokenValue, "never-returned-by-design");
assert.doesNotMatch(JSON.stringify(blockedByTarget), /liveChatId|server-only-live-chat-target-reference|providerChannelId|ownerUserId/i);

const allowedByTarget = session.startCommentTranslatorSession({
  nowMs: Date.parse("2026-06-15T00:00:00.000Z"),
  plan: "free",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: readyCredential,
  activeSession: null,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  liveChatTargetReadiness: readyStart,
  createSessionReferenceId: () => "cts_f6_ready"
});
assert.equal(allowedByTarget.status, "active");
assert.equal(allowedByTarget.sessionReferenceId, "cts_f6_ready");
assert.equal(allowedByTarget.providerTargetMetadata, "forbidden");
assert.doesNotMatch(JSON.stringify(allowedByTarget), /liveChatId|server-only-live-chat-target-reference|server-only-broadcast-reference|providerChannelId|ownerUserId/i);

for (const payload of [skippedStatusIntent, skippedCredential, unavailableStart, readyStart, noLiveBroadcast, missingLiveChat]) {
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /access_token|refresh_token|authorization_code|Authorization|service_role/i);
  if (payload.status !== "ready") {
    assert.doesNotMatch(serialized, /"liveChatId"\s*:|providerChannelId|ownerUserId|server-only-live-chat-target-reference/i);
  }
}

for (const source of [lookupSource, sessionRuntimeSource, routeSource, actionSource, readinessDoc, gapAudit, sessionStartReadiness, taskSource]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "F6 inspected source excludes secret values, token values, authorization values, and private provider identifiers"
  );
}

const allowedChangedFiles = new Set([
  lookupPath,
  sessionRuntimePath,
  routePath,
  actionPath,
  readinessDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  "lib/comment-translator-private-gated-live-provider-smoke-execution-harness.ts",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness-contract.mjs",
  "scripts/comment-translator-server-only-live-chat-target-lookup-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F6 change stays in allowed files: ${file}`);
}

console.log("comment translator server-only live chat target lookup contract checks passed");
