import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  try {
    const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-preview...HEAD", {
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

    return [...new Set([...committedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") {
      return {};
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const testModule = new Module(sourcePath);
    testModule.filename = sourcePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
    testModule._compile(compiled, sourcePath);
    return testModule.exports;
  } finally {
    Module._load = originalLoad;
  }
}

const boundaryPath = "lib/comment-translator-youtube-input-boundary.ts";
const designDocPath = "docs/future/COMMENT_TRANSLATOR_YOUTUBE_INPUT_BOUNDARY_DESIGN.md";

assert.ok(exists(boundaryPath), "server-only YouTube input boundary module exists");
assert.ok(exists(designDocPath), "YouTube input boundary design memo exists");

const boundarySource = read(boundaryPath);
const designDoc = read(designDocPath);
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const deeplProviderSource = read("lib/comment-translator-deepl-provider.ts");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const mockLibSource = read("lib/comment-translator.ts");
const taskSource = read("task.md");

assert.match(boundarySource, /^import "server-only";/m, "YouTube input boundary is server-only");

for (const exportedType of [
  "YouTubeOAuthTokenBoundary",
  "YouTubeOwnerVerificationDecision",
  "YouTubeBroadcasterReadOnlyDockBoundary",
  "YouTubeLiveChatPollingCursor",
  "YouTubeLiveChatPollingPolicy",
  "YouTubeLiveChatRetrySemantics",
  "YouTubeProviderSafeCommentPayload",
  "YouTubeInputDiagnosticLogPolicy",
  "YouTubeInputCacheKeyContact",
  "YouTubeInputBoundaryContract"
]) {
  assert.match(boundarySource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConst of [
  "youtubeOAuthTokenBoundary",
  "youtubeBroadcasterReadOnlyDockBoundary",
  "youtubeLiveChatPollingPolicy",
  "youtubeProviderSafeCommentPayloadContract",
  "youtubeInputDiagnosticLogPolicy",
  "youtubeInputBoundaryContract"
]) {
  assert.match(boundarySource, new RegExp(`export const ${exportedConst}\\b`), `exports ${exportedConst}`);
}

const boundary = loadTsModule(boundaryPath);

assert.equal(boundary.youtubeOAuthTokenBoundary.runtime, "server-only", "OAuth tokens stay server-only");
assert.equal(
  boundary.youtubeOAuthTokenBoundary.clientComponent,
  "forbidden",
  "client components cannot receive OAuth tokens"
);
assert.equal(boundary.youtubeOAuthTokenBoundary.localStorage, "forbidden", "OAuth tokens cannot use localStorage");
assert.equal(boundary.youtubeOAuthTokenBoundary.indexedDB, "forbidden", "OAuth tokens cannot use IndexedDB");
assert.equal(boundary.youtubeOAuthTokenBoundary.fixtures, "forbidden", "OAuth tokens cannot enter fixtures");
assert.equal(boundary.youtubeOAuthTokenBoundary.docsAndPullRequests, "no-token-values", "docs and PRs avoid token values");
assert.ok(
  boundary.youtubeOAuthTokenBoundary.allowedScopeCandidates.includes(
    "https://www.googleapis.com/auth/youtube.readonly"
  ),
  "read-only YouTube OAuth scope candidate is documented"
);

assert.equal(
  boundary.youtubeBroadcasterReadOnlyDockBoundary.viewerFacingOverlay,
  "forbidden",
  "viewer overlay stays out of the read-only dock boundary"
);
assert.equal(
  boundary.youtubeBroadcasterReadOnlyDockBoundary.commentMutation,
  "forbidden",
  "comment mutation is not part of owner-only read-only dock"
);
assert.equal(
  boundary.youtubeBroadcasterReadOnlyDockBoundary.ownerOnlyDecision,
  "server-owned",
  "owner-only decision is a server responsibility"
);

assert.equal(
  boundary.youtubeLiveChatPollingPolicy.cursorMaterial,
  "nextPageToken-only",
  "polling cursor is based on the YouTube continuation token only"
);
assert.equal(
  boundary.youtubeLiveChatPollingPolicy.providerRequest,
  "forbidden",
  "polling cursor is not forwarded to provider requests"
);
assert.equal(
  boundary.youtubeLiveChatPollingPolicy.intervalSource,
  "pollingIntervalMillis",
  "polling interval follows the YouTube response boundary"
);
assert.equal(
  boundary.youtubeLiveChatPollingPolicy.rateLimitExceeded,
  "recoverable-backoff",
  "rate-limit state maps to recoverable backoff"
);
assert.equal(
  boundary.youtubeLiveChatPollingPolicy.runtimeImplementation,
  "not-implemented",
  "polling runtime is out of scope"
);

assert.deepEqual(
  boundary.youtubeProviderSafeCommentPayloadContract.allowedFields,
  ["commentId", "publishedAt", "text", "platformLanguageHint"],
  "provider-safe comment payload is minimal"
);
assert.deepEqual(
  boundary.youtubeProviderSafeCommentPayloadContract.forbiddenFields,
  ["oauthAccessToken", "oauthRefreshToken", "channelSecret", "viewerIdentifier", "rawOAuthState", "pollingCursor"],
  "provider-safe comment payload excludes token, viewer, OAuth state, and cursor material"
);

assert.equal(
  boundary.youtubeInputBoundaryContract.providerCoupling,
  "forbidden-direct-import-or-call",
  "YouTube input module does not call provider modules directly"
);
assert.equal(
  boundary.youtubeInputBoundaryContract.storageMutation,
  "forbidden-in-this-slice",
  "storage and schema mutation stay out of this design slice"
);
assert.equal(
  boundary.youtubeInputDiagnosticLogPolicy.retention,
  "short-lived-only",
  "diagnostic logs are short-lived"
);
assert.equal(
  boundary.youtubeInputDiagnosticLogPolicy.rawTextLogging,
  "disabled-by-default",
  "raw chat text logging is disabled by default"
);
assert.deepEqual(
  boundary.youtubeInputCacheKeyContact.excludedMaterial,
  ["oauthToken", "refreshToken", "channelSecret", "viewerIdentifier", "rawOAuthState", "pollingCursor"],
  "cache key contact excludes tokens, viewer identity, raw OAuth state, and cursor material"
);

for (const docFragment of [
  "YouTube OAuth",
  "owner verification",
  "broadcaster read-only dock",
  "server-only",
  "pollingIntervalMillis",
  "nextPageToken",
  "rateLimitExceeded",
  "backoff",
  "retry",
  "comment id",
  "published time",
  "text",
  "platform language hint",
  "No OAuth access token",
  "No refresh token",
  "No polling cursor",
  "short-lived diagnostic",
  "PII minimization",
  "cache key material",
  "No storage key",
  "No Supabase schema",
  "No direct provider import"
]) {
  assert.match(designDoc, new RegExp(docFragment, "i"), `design doc records: ${docFragment}`);
}

assert.doesNotMatch(
  boundarySource,
  /comment-translator-provider-boundary|comment-translator-deepl-provider/,
  "YouTube input boundary does not import provider modules"
);
assert.doesNotMatch(
  `${providerBoundarySource}\n${deeplProviderSource}`,
  /comment-translator-youtube-input-boundary/,
  "provider modules do not import YouTube input boundary"
);
assert.doesNotMatch(
  `${componentSource}\n${routeSource}\n${mockLibSource}`,
  /comment-translator-youtube-input-boundary|liveChatMessages|youtube\.googleapis|GoogleAuth|OAuth2Client|refresh_token|access_token|localStorage|indexedDB/,
  "client UI, route shell, and fixture mock are not coupled to YouTube runtime or token storage"
);

for (const pattern of [
  /fetch\s*\(/,
  /XMLHttpRequest/,
  /EventSource/,
  /WebSocket/,
  /youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)/,
  /process\.env/,
  /localStorage\./,
  /indexedDB\./,
  /createClient/,
  /from\(["']usage_quotas["']\)/,
  /insert\s*\(/,
  /upsert\s*\(/,
  /update\s*\(/,
  /stripe|checkout|gtag|GA4|cookie consent/i
]) {
  assert.doesNotMatch(boundarySource, pattern, `YouTube boundary stays pure design/type-only: ${pattern}`);
}

for (const file of changedFiles()) {
  for (const pattern of [
    /^components\/comment-translator\//,
    /^app\/tools\/comment-translator\//,
    /^app\/api\//,
    /^supabase\//,
    /^migrations?\//,
    /^lib\/supabase\//,
    /^lib\/tool-handoff/,
    /^lib\/.*storage/i
  ]) {
    assert.doesNotMatch(file, pattern, `YouTube input boundary design does not change forbidden path: ${file}`);
  }

  if (!file.endsWith("comment-translator-youtube-input-boundary-contract.mjs")) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/i,
      `${file} does not contain token or service role material`
    );
  }
}

assert.match(
  taskSource,
  /comment translator YouTube input boundary contract/i,
  "task.md records the new YouTube input boundary check"
);

console.log("comment translator YouTube input boundary contract checks passed");
