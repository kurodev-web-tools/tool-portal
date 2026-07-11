import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";

const root = process.cwd();
const accessGatePath = "lib/comment-translator-private-launch-access-gate.ts";
const previewOverridePath = "lib/comment-translator-free-beta-preview-rate-limit-smoke-override.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    const cached = moduleCache.get(normalizedModulePath);
    if (cached) return cached.exports;

    let compiled = Module.stripTypeScriptTypes(fs.readFileSync(normalizedModulePath, "utf8"), {
      mode: "transform",
      sourceMap: false
    });
    const exportedNames = [];
    compiled = compiled.replace(/^import\s+"[^"]+";\s*$/gm, "");
    compiled = compiled.replace(/import\s+\{([\s\S]*?)\}\s+from\s+"([^"]+)";/g, "const {$1} = require(\"$2\");");
    compiled = compiled.replace(/export\s+const\s+(\w+)/g, (_, name) => {
      exportedNames.push(name);
      return `const ${name}`;
    });
    compiled = compiled.replace(/export\s+function\s+(\w+)/g, (_, name) => {
      exportedNames.push(name);
      return `function ${name}`;
    });
    compiled += `\nObject.assign(exports, { ${exportedNames.join(", ")} });\n`;
    const testModule = new Module(normalizedModulePath);
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") return {};
    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) return compileTsModule(candidate);
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

const accessGate = loadTsModule(accessGatePath);
const previewOverride = loadTsModule(previewOverridePath);
const testerSubject = "server-only-contract-tester";
const generalSubject = "server-only-contract-general-user";
const testerHash = accessGate.createCommentTranslatorPrivateLaunchTesterHash(testerSubject);
const privateEnv = { COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES: testerHash };
const activeEnv = {
  ...privateEnv,
  COMMENT_TRANSLATOR_FREE_BETA_RUNTIME_ACCESS: "login-only-reviewed"
};
const authorized = (id) => ({ status: "authorized", ownerUserId: id });

for (const env of [
  privateEnv,
  { ...privateEnv, COMMENT_TRANSLATOR_FREE_BETA_RUNTIME_ACCESS: "" },
  { ...privateEnv, COMMENT_TRANSLATOR_FREE_BETA_RUNTIME_ACCESS: "login-only" },
  { ...privateEnv, COMMENT_TRANSLATOR_FREE_BETA_RUNTIME_ACCESS: " LOGIN-ONLY-REVIEWED " }
]) {
  const access = accessGate.readCommentTranslatorFreeBetaRuntimeAccess({
    callerAuthorization: authorized(generalSubject),
    env
  });
  assert.equal(access.status, "blocked", "unset and non-exact activation retain private allowlist behavior");
  assert.equal(access.reason, "private-launch-gate");
}

const generalAccess = accessGate.readCommentTranslatorFreeBetaRuntimeAccess({
  callerAuthorization: authorized(generalSubject),
  env: activeEnv
});
assert.equal(generalAccess.status, "allowed", "exact activation allows an authenticated Free user");
assert.equal(generalAccess.access, "authenticated-free-user");

for (const callerAuthorization of [
  { status: "unavailable", reason: "caller-not-authenticated", reconnectRequired: true },
  { status: "unavailable", reason: "auth-unavailable", reconnectRequired: true }
]) {
  const access = accessGate.readCommentTranslatorFreeBetaRuntimeAccess({ callerAuthorization, env: activeEnv });
  assert.equal(access.status, "blocked", "signed-out and auth-unavailable callers remain blocked");
  assert.equal(access.reason, callerAuthorization.reason);
}

const missingSignedInUser = accessGate.readCommentTranslatorFreeBetaRuntimeAccessForAccountSession({
  accountSession: { authStatus: "signed-in", user: null },
  env: activeEnv
});
assert.equal(missingSignedInUser.status, "blocked", "signed-in state without a trusted user fails closed");
assert.equal(missingSignedInUser.reason, "auth-unavailable");

for (const env of [privateEnv, activeEnv]) {
  const access = accessGate.readCommentTranslatorFreeBetaRuntimeAccess({
    callerAuthorization: authorized(testerSubject),
    env
  });
  assert.equal(access.status, "allowed", "the existing tester remains allowed in both safe modes");
}

const generalPrivateAccess = accessGate.readCommentTranslatorPrivateLaunchAccess({
  callerAuthorization: authorized(generalSubject),
  env: activeEnv
});
const generalPreviewOverride = previewOverride.resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
  env: {
    COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE: "cloudflare-preview-rate-limit-smoke-reviewed",
    COMMENT_TRANSLATOR_CLOUDFLARE_RUNTIME_CHANNEL: "cloudflare-preview"
  },
  privateLaunchAccess: generalPrivateAccess
});
assert.equal(generalPreviewOverride.status, "inactive", "login-only access does not broaden the preview 5/min override");
assert.equal(generalPreviewOverride.translatedMessagesPerMinute, 30);

const allowedTesterAccess = accessGate.readCommentTranslatorPrivateLaunchAccess({
  callerAuthorization: authorized(testerSubject),
  env: activeEnv
});
const testerPreviewOverride = previewOverride.resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
  env: {
    COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE: "cloudflare-preview-rate-limit-smoke-reviewed",
    COMMENT_TRANSLATOR_CLOUDFLARE_RUNTIME_CHANNEL: "cloudflare-preview"
  },
  privateLaunchAccess: allowedTesterAccess
});
assert.equal(testerPreviewOverride.status, "active", "the specifically allowed tester retains the exact preview override");

const billingSources = ["app/account/billing/page.tsx", "app/account/billing/actions.ts"].map(read).join("\n");
assert.match(billingSources, /readCommentTranslatorPrivateLaunchAccessForAccountSession/);
assert.doesNotMatch(billingSources, /readCommentTranslatorFreeBetaRuntimeAccess/);

const freeRuntimeConsumerPaths = [
  "app/account/actions.ts",
  "app/account/integrations/page.tsx",
  "app/api/comment-translator/session/route.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/api/comment-translator/youtube/disconnect/route.ts",
  "app/api/comment-translator/youtube/oauth/callback/route.ts",
  "app/tools/comment-translator/account-actions.ts",
  "app/tools/comment-translator/page.tsx",
  "app/tools/comment-translator/session-actions.ts"
];
for (const relativePath of freeRuntimeConsumerPaths) {
  assert.match(read(relativePath), /readCommentTranslatorFreeBetaRuntimeAccess/, `${relativePath} uses login-only runtime authority`);
}

const privilegedSources = [
  "app/api/comment-translator/free-beta/route-api-harness/route.ts",
  "app/tools/comment-translator/retention-waitlist-actions.ts"
].map(read).join("\n");
assert.match(privilegedSources, /readCommentTranslatorPrivateLaunchAccess/);

for (const relativePath of [
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/feed-actions.ts",
  "app/tools/comment-translator/retention-waitlist-actions.ts",
  "app/tools/comment-translator/session-actions.ts"
]) {
  assert.match(
    read(relativePath),
    /readCommentTranslatorPrivateLaunchAccess/,
    `${relativePath} keeps private tester authority for the preview override`
  );
}

const connectionSources = [
  "app/account/integrations/page.tsx",
  "app/account/actions.ts",
  "app/api/comment-translator/youtube/oauth/callback/route.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/api/comment-translator/youtube/disconnect/route.ts"
].map(read).join("\n");
assert.doesNotMatch(connectionSources, /runCommentTranslatorLiveProviderSessionStep|createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter/);
assert.doesNotMatch(
  [read("app/tools/comment-translator/page.tsx"), read("app/account/integrations/page.tsx")].join("\n"),
  /COMMENT_TRANSLATOR_FREE_BETA_RUNTIME_ACCESS|login-only-reviewed/,
  "browser-rendered source does not expose activation control or its reviewed state"
);

for (const output of [generalAccess, generalPrivateAccess]) {
  assert.doesNotMatch(
    JSON.stringify(output),
    /server-only-contract|login-only-reviewed|providerChannelId|liveChatId|access_token|refresh_token|authorization|cookie|header|raw-comment|browser-storage/i,
    "browser-safe access output excludes owner ids, activation values, provider metadata, credentials, raw payloads, and storage"
  );
}

console.log("comment translator login-only runtime access contract checks passed");
