import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const liveProviderPath = "lib/comment-translator-youtube-live-provider-runtime-adapter.ts";
const targetLookupFoundationPath = "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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
        createClient() {
          return { from: () => ({}) };
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

const liveProviderSource = read(liveProviderPath);
const targetLookupFoundationSource = read(targetLookupFoundationPath);

assert.match(liveProviderSource, /^import "server-only";/m, "normal UI live provider adapter is server-only");
assert.match(targetLookupFoundationSource, /^import "server-only";/m, "target lookup foundation is server-only");
assert.match(
  `${liveProviderSource}\n${targetLookupFoundationSource}`,
  /broadcastType/,
  "owned active broadcast lookup records the all-broadcast-types query parameter"
);
assert.doesNotMatch(
  `${liveProviderSource}\n${targetLookupFoundationSource}`,
  /console\.(?:log|info|warn|error)|localStorage\.|indexedDB\.|sessionStorage\./i,
  "target lookup diagnostics stay out of logs and browser storage"
);

const liveProvider = loadTsModule(liveProviderPath);
const targetLookupFoundation = loadTsModule(targetLookupFoundationPath);
const capturedRequests = [];

const runtime = liveProvider.createCommentTranslatorYouTubeLiveProviderRuntimeAdapterForTests({
  fetchGoogleApi: async (request) => {
    capturedRequests.push(request);
    return {
      ok: true,
      status: 200,
      body: {
        items: [
          {
            id: "server-only-broadcast-reference",
            snippet: {
              title: "server-only-title-never-returned",
              liveChatId: "server-only-live-chat-target-reference"
            },
            status: {
              lifeCycleStatus: "live",
              privacyStatus: "public"
            }
          }
        ]
      }
    };
  }
});

const owner = await runtime.targetLookupAdapter.verifyOwner({
  credentialReferenceId: "credential-reference-for-contract"
});
assert.equal(owner.status, "owner-verified");

const lookup = await runtime.targetLookupAdapter.lookupOwnedBroadcasts({
  ownerChannelReference: "provider-channel-reference"
});
assert.equal(lookup.broadcasts.length, 1);

const providerRequest = capturedRequests.find((request) => request.endpoint === "liveBroadcasts.list");
assert.ok(providerRequest, "normal UI Start lookup performs a liveBroadcasts.list request");
const providerUrl = new URL(providerRequest.url);
assert.deepEqual(
  ["broadcastStatus", "id", "mine"].filter((key) => providerUrl.searchParams.has(key)),
  ["broadcastStatus"],
  "normal UI active lookup uses broadcastStatus as the single YouTube filter"
);
assert.equal(providerUrl.searchParams.has("mine"), false, "normal UI lookup does not combine mine with broadcastStatus");
assert.equal(providerUrl.searchParams.get("broadcastStatus"), "active");
assert.equal(
  providerUrl.searchParams.get("broadcastType"),
  "all",
  "normal UI active broadcast lookup includes persistent and event broadcasts"
);
assert.equal(providerUrl.searchParams.get("part"), "id,snippet,status");

const foundationRequest = targetLookupFoundation.createYouTubeLiveBroadcastsListTargetLookupRequest({
  serverAuthorizationHeader: "server-only-authorization-reference"
});
const foundationUrl = new URL(foundationRequest.url);
assert.equal(foundationRequest.query.broadcastType, "all");
assert.equal(foundationRequest.query.broadcastStatus, "active");
assert.deepEqual(
  ["broadcastStatus", "id", "mine"].filter((key) => foundationUrl.searchParams.has(key)),
  ["broadcastStatus"],
  "target lookup foundation uses broadcastStatus as the single YouTube filter"
);
assert.equal(foundationUrl.searchParams.has("mine"), false);
assert.equal(foundationUrl.searchParams.get("broadcastType"), "all");
assert.equal(foundationUrl.searchParams.get("broadcastStatus"), "active");
assert.doesNotMatch(
  JSON.stringify({ providerRequest, foundationRequest, lookup }),
  /Authorization:\s*Bearer|access_token|refresh_token|authorization_code|service_role/i
);

console.log("comment translator YouTube active broadcast type contract checks passed");
