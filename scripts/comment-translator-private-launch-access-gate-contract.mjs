import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const accessGatePath = "lib/comment-translator-private-launch-access-gate.ts";
const toolPagePath = "app/tools/comment-translator/page.tsx";
const toolActionsPath = "app/tools/comment-translator/actions.ts";
const sessionRoutePath = "app/api/comment-translator/session/route.ts";
const credentialStatusRoutePath = "app/api/comment-translator/youtube/credential-status/route.ts";
const disconnectRoutePath = "app/api/comment-translator/youtube/disconnect/route.ts";
const accountIntegrationsPagePath = "app/account/integrations/page.tsx";
const accountBillingPagePath = "app/account/billing/page.tsx";
const accountBillingActionsPath = "app/account/billing/actions.ts";
const privateLaunchUnavailablePath = "components/comment-translator/CommentTranslatorPrivateLaunchUnavailable.tsx";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function resolveAlias(request) {
    if (!request.startsWith("@/")) {
      return null;
    }

    const withoutAlias = request.slice(2);
    for (const extension of [".ts", ".tsx"]) {
      const candidate = path.join(root, `${withoutAlias}${extension}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) {
      return moduleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
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
    if (request === "server-only" || request === "next/link") {
      return {};
    }

    const aliasPath = resolveAlias(request);
    if (aliasPath) {
      return compileTsModule(aliasPath);
    }

    if (request.startsWith(".") && parent?.filename) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.resolve(path.dirname(parent.filename), `${request}${extension}`);
        if (fs.existsSync(candidate)) {
          return compileTsModule(candidate);
        }
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

assert.ok(exists(accessGatePath), "private launch access gate server-only helper exists");
assert.ok(exists(privateLaunchUnavailablePath), "private launch unavailable UI state exists");
assert.ok(exists(toolPagePath), "comment translator page exists");
assert.ok(exists(toolActionsPath), "comment translator server actions exist");
assert.ok(exists(sessionRoutePath), "comment translator session API exists");
assert.ok(exists(credentialStatusRoutePath), "credential status API exists");
assert.ok(exists(disconnectRoutePath), "disconnect API exists");
assert.ok(exists(accountIntegrationsPagePath), "account integrations entry point exists");
assert.ok(exists(accountBillingPagePath), "account billing entry point exists");
assert.ok(exists(accountBillingActionsPath), "account billing actions exist");

const accessGateSource = read(accessGatePath);
const toolPageSource = read(toolPagePath);
const toolActionsSource = read(toolActionsPath);
const sessionRouteSource = read(sessionRoutePath);
const credentialStatusRouteSource = read(credentialStatusRoutePath);
const disconnectRouteSource = read(disconnectRoutePath);
const accountIntegrationsPageSource = read(accountIntegrationsPagePath);
const accountBillingPageSource = read(accountBillingPagePath);
const accountBillingActionsSource = read(accountBillingActionsPath);
const privateLaunchUnavailableSource = read(privateLaunchUnavailablePath);
const requirementsSource = read(requirementsPath);
const taskSource = read(taskPath);

assert.match(accessGateSource, /^import "server-only";/m, "private launch helper is server-only");
assert.match(accessGateSource, /COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES/, "allowlist is server-only env based");
assert.doesNotMatch(accessGateSource, /ALLOWED_USER_IDS|OWNER_USER_IDS|USER_IDS/, "allowlist does not use raw user id env naming");
assert.match(toolPageSource, /readCommentTranslatorPrivateLaunchAccessForAccountSession/, "tool page gates existing preview flow");
assert.match(toolActionsSource, /readCommentTranslatorPrivateLaunchAccess/, "server actions gate session and credential actions");
assert.match(sessionRouteSource, /readCommentTranslatorPrivateLaunchAccess/, "session API gates direct calls");
assert.match(credentialStatusRouteSource, /readCommentTranslatorPrivateLaunchAccess/, "credential status API gates direct calls");
assert.match(disconnectRouteSource, /readCommentTranslatorPrivateLaunchAccess/, "disconnect API gates direct calls");
assert.match(accountIntegrationsPageSource, /readCommentTranslatorPrivateLaunchAccessForAccountSession/, "account integrations page has private launch gate");
assert.match(accountBillingPageSource, /readCommentTranslatorPrivateLaunchAccessForAccountSession/, "account billing page has private launch gate");
assert.match(accountBillingActionsSource, /readCommentTranslatorPrivateLaunchAccessForAccountSession/, "billing actions block checkout and portal before Stripe calls");
assert.match(privateLaunchUnavailableSource, /coming-soon|private-launch|準備中|not yet available/i, "public UI state is disabled or coming soon");
assert.match(requirementsSource, /Sensitive Data Boundaries/, "canonical requirements still carry sensitive data boundary");
assert.match(taskSource, /Task 17|Private launch access gate/i, "task board records Task 17");

for (const source of [
  accessGateSource,
  toolPageSource,
  toolActionsSource,
  sessionRouteSource,
  credentialStatusRouteSource,
  disconnectRouteSource,
  accountIntegrationsPageSource,
  accountBillingPageSource,
  accountBillingActionsSource,
  privateLaunchUnavailableSource
]) {
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "private launch gate source does not contain token values, provider targets, Stripe secret values, authorization values, or private keys"
  );
}

const accessGate = loadTsModule(accessGatePath);

assert.equal(accessGate.commentTranslatorPrivateLaunchAccessGateContract.runtime, "server-only");
assert.equal(
  accessGate.commentTranslatorPrivateLaunchAccessGateContract.allowedTesterPolicy,
  "sha256-owner-user-id-allowlist",
  "allowed tester policy is hash based"
);
assert.equal(
  accessGate.commentTranslatorPrivateLaunchAccessGateContract.defaultAccess,
  "closed-to-general-users",
  "default private launch posture fails closed"
);
assert.equal(accessGate.commentTranslatorPrivateLaunchAccessGateContract.browserStorage, "forbidden");
assert.equal(accessGate.commentTranslatorPrivateLaunchAccessGateContract.handoffPayload, "unchanged");

const ownerUserId = "server-only-owner-value";
const ownerHash = accessGate.createCommentTranslatorPrivateLaunchTesterHash(ownerUserId);
assert.match(ownerHash, /^[a-f0-9]{64}$/, "tester hash is a SHA-256 hex digest");
assert.doesNotMatch(ownerHash, /server-only-owner-value/, "tester hash does not expose the owner id value");

const allowed = accessGate.readCommentTranslatorPrivateLaunchAccess({
  callerAuthorization: {
    status: "authorized",
    ownerUserId
  },
  env: {
    COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES: ` ${ownerHash}\n`
  }
});
assert.equal(allowed.status, "allowed", "hash-allowlisted tester can access existing preview flow");
assert.equal(allowed.access, "allowed-tester");
assert.doesNotMatch(JSON.stringify(allowed), /server-only-owner-value/, "allowed access output excludes raw owner id");

const rawIdEnv = accessGate.readCommentTranslatorPrivateLaunchAccess({
  callerAuthorization: {
    status: "authorized",
    ownerUserId
  },
  env: {
    COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES: ownerUserId
  }
});
assert.equal(rawIdEnv.status, "blocked", "raw owner id values are not accepted as tester allowlist entries");
assert.equal(rawIdEnv.reason, "private-launch-gate");

const noAllowlist = accessGate.readCommentTranslatorPrivateLaunchAccess({
  callerAuthorization: {
    status: "authorized",
    ownerUserId
  },
  env: {}
});
assert.equal(noAllowlist.status, "blocked", "authorized non-allowlisted user is blocked");
assert.equal(noAllowlist.reason, "private-launch-gate");
assert.doesNotMatch(JSON.stringify(noAllowlist), /server-only-owner-value/, "blocked output excludes raw owner id");

const signedOut = accessGate.readCommentTranslatorPrivateLaunchAccess({
  callerAuthorization: {
    status: "unavailable",
    reason: "caller-not-authenticated",
    reconnectRequired: true
  },
  env: {
    COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES: ownerHash
  }
});
assert.equal(signedOut.status, "blocked", "signed-out users are blocked");
assert.equal(signedOut.reason, "caller-not-authenticated");

const blockedSession = accessGate.createCommentTranslatorPrivateLaunchBlockedSessionState({
  nowMs: 1_000,
  plan: "free",
  access: noAllowlist
});
assert.equal(blockedSession.status, "stopped", "blocked session API returns a stopped browser-safe state");
assert.equal(blockedSession.stopReason, "auth-failed", "blocked session start cannot create an active session");
assert.equal(blockedSession.launchAccess, "private-launch-gated", "blocked session carries sanitized private launch marker");
assert.equal(blockedSession.providerApiUsage, "stopped");
assert.equal(blockedSession.aiTranslationUsage, "stopped");
assert.doesNotMatch(
  JSON.stringify(blockedSession),
  /server-only-owner-value|providerChannelId|liveChatId|access_token|refresh_token|authorization_code|Authorization|service_role|ciphertext|decrypt/i,
  "blocked session state excludes owner ids, provider targets, credentials, and decrypt capability"
);

console.log("comment translator private launch access gate contract checks passed");
