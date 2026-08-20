import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  linkSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const repairScriptPath = path.join(
  projectRoot,
  "scripts/comment-translator-open-next-middleware-manifest-runtime-repair.mjs"
);

assert.ok(existsSync(repairScriptPath), "runtime repair script exists");

const repairModule = await import(pathToFileURL(repairScriptPath).href);
assert.equal(
  typeof repairModule.repairMiddlewareManifestSource,
  "function",
  "runtime repair exports source transformer"
);
assert.equal(
  typeof repairModule.STATIC_MIDDLEWARE_MANIFEST_MARKER,
  "string",
  "runtime repair exports stable marker"
);
assert.equal(
  typeof repairModule.replaceFileAtomically,
  "function",
  "runtime repair exports atomic replacement helper"
);
assert.equal(
  typeof repairModule.resolvePathWithinRoot,
  "function",
  "runtime repair exports resolved path safety helper"
);
assert.equal(
  typeof repairModule.repairGeneratedNextServer,
  "function",
  "runtime repair exports generated server repair for bounded filesystem contract coverage"
);

const source = `
class NextNodeServer {
  getMiddlewareManifest() {
    if (this.minimalMode) {
      return null;
    } else {
      const manifest = require(this.middlewareManifestPath);
      return manifest;
    }
  }
}
`;
const manifest = {
  version: 3,
  middleware: {
    "/": {
      matchers: [{ regexp: "^/account(?:/.*)?$" }]
    }
  },
  functions: {}
};

const repaired = repairModule.repairMiddlewareManifestSource(source, manifest);
assert.doesNotMatch(
  repaired,
  /require\(\s*this\.middlewareManifestPath\s*\)/,
  "runtime repair removes dynamic middleware manifest require"
);
assert.match(
  repaired,
  new RegExp(repairModule.STATIC_MIDDLEWARE_MANIFEST_MARKER),
  "runtime repair leaves a stable compatibility marker"
);
assert.match(
  repaired,
  /\"version\":3/,
  "runtime repair inlines the build manifest"
);
assert.equal(
  repairModule.repairMiddlewareManifestSource(repaired, manifest),
  repaired,
  "runtime repair is idempotent"
);
const methodTamperedWithMovedDynamicRequire = `
class NextNodeServer {
  getMiddlewareManifest() {
    return {};
  }
}
function unusedManifestFunction() {
  const manifest = require(this.middlewareManifestPath);
  return manifest;
}
`;
assert.throws(
  () =>
    repairModule.repairMiddlewareManifestSource(
      methodTamperedWithMovedDynamicRequire,
      manifest
    ),
  /dynamic middleware manifest assignment is not tied to getMiddlewareManifest/,
  "runtime repair fails closed when the dynamic require moves outside the actual middleware method"
);
const assignmentStart = repaired.indexOf("const manifest =");
const assignmentEnd = repaired.indexOf(";", assignmentStart) + 1;
const staticAssignment = repaired.slice(assignmentStart, assignmentEnd);
const methodTamperedWithMovedAssignment = `
class NextNodeServer {
  getMiddlewareManifest() {
    return {};
  }
}
function unusedManifestFunction() {
  ${staticAssignment}
  return manifest;
}
`;
assert.throws(
  () =>
    repairModule.repairMiddlewareManifestSource(
      methodTamperedWithMovedAssignment,
      manifest
    ),
  /static middleware manifest assignment is not tied to getMiddlewareManifest/,
  "runtime repair fails closed when the marked assignment moves outside the actual middleware method"
);
const tamperedInlineManifest = repaired.replace(
  JSON.stringify(manifest),
  "{}"
);
assert.notEqual(
  tamperedInlineManifest,
  repaired,
  "runtime repair contract tampers the inline manifest while retaining the marker"
);
assert.throws(
  () =>
    repairModule.repairMiddlewareManifestSource(
      tamperedInlineManifest,
      manifest
    ),
  /static middleware manifest marker does not match manifest/,
  "runtime repair fails closed when the marked inline manifest is tampered"
);
const staleManifest = {
  ...manifest,
  functions: {
    "/api/stale": {
      matchers: [{ regexp: "^/api/stale$" }]
    }
  }
};
assert.throws(
  () => repairModule.repairMiddlewareManifestSource(repaired, staleManifest),
  /static middleware manifest marker does not match manifest/,
  "runtime repair fails closed when a marked source receives a different manifest"
);
assert.throws(
  () =>
    repairModule.repairMiddlewareManifestSource(
      "class NextNodeServer {}",
      manifest
    ),
  /dynamic middleware manifest require not found/,
  "runtime repair fails closed when the expected Next shape changes"
);

const fixtureDirectory = mkdtempSync(
  path.join(projectRoot, `.runtime-repair-contract-${process.pid}-`)
);
try {
  const standaloneFixtureRoot = path.join(fixtureDirectory, "standalone");
  const relocatedStandaloneRoot = path.join(
    fixtureDirectory,
    "relocated-standalone"
  );
  const outsideFixtureRoot = path.join(fixtureDirectory, "outside");
  const junctionLikeDestinationPath = path.join(
    standaloneFixtureRoot,
    "node_modules/next/dist/server/next-server.js"
  );
  const resolvedOutsideDestinationPath = path.join(
    outsideFixtureRoot,
    "next-server.js"
  );
  const relocatedDestinationPath = path.join(
    relocatedStandaloneRoot,
    "node_modules/next/dist/server/next-server.js"
  );
  mkdirSync(standaloneFixtureRoot);
  mkdirSync(path.dirname(relocatedDestinationPath), { recursive: true });
  mkdirSync(outsideFixtureRoot);
  writeFileSync(
    relocatedDestinationPath,
    "relocated root destination must remain unchanged\n",
    "utf8"
  );
  writeFileSync(
    resolvedOutsideDestinationPath,
    "outside destination must remain unchanged\n",
    "utf8"
  );
  let relocatedRootMutationAttempted = false;
  const relocatedRootRealpath = (candidatePath) => {
    const resolvedCandidatePath = path.resolve(candidatePath);
    if (resolvedCandidatePath === path.resolve(projectRoot)) {
      return path.resolve(projectRoot);
    }
    if (resolvedCandidatePath === path.resolve(standaloneFixtureRoot)) {
      return path.resolve(relocatedStandaloneRoot);
    }
    throw new Error("unexpected relocated-root fixture path");
  };
  assert.throws(
    () => {
      const safeStandaloneRoot = repairModule.resolvePathWithinRoot(
        standaloneFixtureRoot,
        projectRoot,
        {
          expectedTargetPath: standaloneFixtureRoot,
          realpath: relocatedRootRealpath
        }
      );
      relocatedRootMutationAttempted = true;
      repairModule.replaceFileAtomically(
        path.join(safeStandaloneRoot, "next-server.js"),
        "must not be installed\n"
      );
    },
    /resolved path does not match intended lexical path/,
    "runtime repair fails closed when the standalone root is relocated by a junction"
  );
  assert.equal(
    relocatedRootMutationAttempted,
    false,
    "standalone root relocation rejection occurs before atomic replacement"
  );
  assert.equal(
    readFileSync(relocatedDestinationPath, "utf8"),
    "relocated root destination must remain unchanged\n",
    "standalone root relocation rejection leaves the relocated destination unchanged"
  );
  let outsideMutationAttempted = false;
  const fixtureRealpath = (candidatePath) => {
    const resolvedCandidatePath = path.resolve(candidatePath);
    if (resolvedCandidatePath === path.resolve(standaloneFixtureRoot)) {
      return path.resolve(standaloneFixtureRoot);
    }
    if (resolvedCandidatePath === path.resolve(junctionLikeDestinationPath)) {
      return path.resolve(resolvedOutsideDestinationPath);
    }
    throw new Error("unexpected fixture path");
  };
  assert.throws(
    () => {
      const safeDestinationPath = repairModule.resolvePathWithinRoot(
        junctionLikeDestinationPath,
        standaloneFixtureRoot,
        { realpath: fixtureRealpath }
      );
      outsideMutationAttempted = true;
      repairModule.replaceFileAtomically(
        safeDestinationPath,
        "must not be installed\n"
      );
    },
    /resolved path escapes allowed root/,
    "runtime repair fails closed when a junction-like destination resolves outside standalone"
  );
  assert.equal(
    outsideMutationAttempted,
    false,
    "junction-like path rejection occurs before atomic replacement"
  );
  assert.equal(
    readFileSync(resolvedOutsideDestinationPath, "utf8"),
    "outside destination must remain unchanged\n",
    "junction-like path rejection leaves the resolved outside destination unchanged"
  );

  const manifestEscapeNextServerPath = path.join(
    standaloneFixtureRoot,
    "next-server-for-manifest-escape.js"
  );
  const junctionLikeManifestPath = path.join(
    standaloneFixtureRoot,
    ".next/server/middleware-manifest.json"
  );
  const resolvedOutsideManifestPath = path.join(
    outsideFixtureRoot,
    "middleware-manifest.json"
  );
  let manifestReadAttempted = false;
  let manifestEscapeMutationAttempted = false;
  const manifestEscapeRealpath = (candidatePath) => {
    const resolvedCandidatePath = path.resolve(candidatePath);
    if (resolvedCandidatePath === path.resolve(fixtureDirectory)) {
      return path.resolve(fixtureDirectory);
    }
    if (resolvedCandidatePath === path.resolve(standaloneFixtureRoot)) {
      return path.resolve(standaloneFixtureRoot);
    }
    if (resolvedCandidatePath === path.resolve(manifestEscapeNextServerPath)) {
      return path.resolve(manifestEscapeNextServerPath);
    }
    if (resolvedCandidatePath === path.resolve(junctionLikeManifestPath)) {
      return path.resolve(resolvedOutsideManifestPath);
    }
    throw new Error("unexpected manifest-escape fixture path");
  };
  assert.throws(
    () =>
      repairModule.repairGeneratedNextServer({
        projectRootPath: fixtureDirectory,
        standaloneRootPath: standaloneFixtureRoot,
        nextServerPath: manifestEscapeNextServerPath,
        middlewareManifestPath: junctionLikeManifestPath,
        exists: () => true,
        realpath: manifestEscapeRealpath,
        readFile: (candidatePath) => {
          if (path.resolve(candidatePath) === path.resolve(junctionLikeManifestPath)) {
            manifestReadAttempted = true;
            return JSON.stringify(manifest);
          }
          if (
            path.resolve(candidatePath) ===
            path.resolve(manifestEscapeNextServerPath)
          ) {
            return source;
          }
          throw new Error("unexpected manifest-escape read path");
        },
        replaceFile: () => {
          manifestEscapeMutationAttempted = true;
        }
      }),
    /resolved path escapes allowed root/,
    "runtime repair fails closed when the manifest resolves outside standalone"
  );
  assert.equal(
    manifestReadAttempted,
    false,
    "manifest escape rejection occurs before reading the manifest"
  );
  assert.equal(
    manifestEscapeMutationAttempted,
    false,
    "manifest escape rejection occurs before destination mutation"
  );

  const hardlinkTargetPath = path.join(fixtureDirectory, "hardlink-target.js");
  const hardlinkDestinationPath = path.join(fixtureDirectory, "hardlink-destination.js");
  const originalHardlinkContent = "original shared content\n";
  const repairedHardlinkContent = "repaired destination content\n";
  writeFileSync(hardlinkTargetPath, originalHardlinkContent, "utf8");

  let hardlinkSupported = true;
  try {
    linkSync(hardlinkTargetPath, hardlinkDestinationPath);
  } catch (error) {
    const unsupportedHardlinkCodes = new Set([
      "EACCES",
      "ENOSYS",
      "ENOTSUP",
      "EOPNOTSUPP",
      "EPERM"
    ]);
    if (!unsupportedHardlinkCodes.has(error?.code)) {
      throw error;
    }
    hardlinkSupported = false;
    console.log("SKIP hardlink atomic replacement: filesystem capability unavailable");
  }

  if (hardlinkSupported) {
    repairModule.replaceFileAtomically(
      hardlinkDestinationPath,
      repairedHardlinkContent
    );
    assert.equal(
      readFileSync(hardlinkTargetPath, "utf8"),
      originalHardlinkContent,
      "atomic replacement leaves the original hardlink target content unchanged"
    );
    assert.equal(
      readFileSync(hardlinkDestinationPath, "utf8"),
      repairedHardlinkContent,
      "atomic replacement installs repaired destination content"
    );
  }

  const failureDestinationPath = path.join(fixtureDirectory, "failure-destination.js");
  const failureOriginalContent = "failure original content\n";
  writeFileSync(failureDestinationPath, failureOriginalContent, "utf8");
  const entriesBeforeFailure = readdirSync(fixtureDirectory).sort();
  const injectedRenameError = new Error("injected atomic rename failure");
  assert.throws(
    () =>
      repairModule.replaceFileAtomically(
        failureDestinationPath,
        "must not be installed\n",
        {
          rename: () => {
            throw injectedRenameError;
          }
        }
      ),
    (error) => error === injectedRenameError,
    "atomic replacement rethrows rename failure"
  );
  assert.equal(
    readFileSync(failureDestinationPath, "utf8"),
    failureOriginalContent,
    "failed atomic replacement leaves destination content unchanged"
  );
  assert.deepEqual(
    readdirSync(fixtureDirectory).sort(),
    entriesBeforeFailure,
    "failed atomic replacement leaves no temporary destination"
  );
} finally {
  rmSync(fixtureDirectory, { recursive: true, force: true });
}

const openNextConfig = readFileSync(
  path.join(projectRoot, "open-next.config.ts"),
  "utf8"
);
const repairScript = readFileSync(repairScriptPath, "utf8");
const previewBuildScriptPath = path.join(
  projectRoot,
  "scripts/comment-translator-open-next-middleware-manifest-preview-build.mjs"
);
const previewBuildScript = existsSync(previewBuildScriptPath)
  ? readFileSync(previewBuildScriptPath, "utf8")
  : "";
const previewWranglerConfig = readFileSync(
  path.join(projectRoot, "wrangler.preview.jsonc"),
  "utf8"
);
assert.match(
  openNextConfig,
  /process\.env\.COMMENT_TRANSLATOR_PREVIEW_BUILD\s*===\s*["']true["']/,
  "OpenNext repair build command is gated by the explicit Preview env flag"
);
assert.match(
  openNextConfig,
  /process\.env\.COMMENT_TRANSLATOR_PREVIEW_BUILD[\s\S]*?buildCommand:[\s\S]*?comment-translator-open-next-middleware-manifest-runtime-repair\.mjs[\s\S]*?cloudflareConfig/,
  "OpenNext production path returns the normal Cloudflare config without the repair"
);
assert.ok(
  existsSync(previewBuildScriptPath),
  "Preview build wrapper exists"
);
assert.match(
  previewBuildScript,
  /COMMENT_TRANSLATOR_PREVIEW_BUILD\s*:\s*["']true["']/,
  "Preview build wrapper enables the explicit Preview env flag"
);
assert.match(
  previewBuildScript,
  /process\.platform\s*===\s*["']win32["'][\s\S]*?npm\.cmd[\s\S]*?build:cloudflare/,
  "Preview build wrapper uses the Windows npm.cmd Cloudflare build command"
);
assert.match(
  previewBuildScript,
  /process\.platform\s*===\s*["']win32["'][\s\S]*?npm[\s\S]*?build:cloudflare/,
  "Preview build wrapper uses the cross-platform npm Cloudflare build command"
);
assert.match(
  previewWranglerConfig,
  /"build"\s*:\s*\{[\s\S]*?"command"\s*:\s*"node scripts\/comment-translator-open-next-middleware-manifest-preview-build\.mjs"/,
  "Preview Wrangler config invokes the Preview-only build wrapper"
);
assert.doesNotMatch(
  repairScript,
  /writeFileSync\(\s*nextServerPath\b/,
  "runtime repair never writes repaired content directly to the destination"
);
assert.match(
  repairScript,
  /writeFileSync\(\s*temporaryNextServerPath\s*,[\s\S]*?flag:\s*["']wx["']/,
  "runtime repair writes a newly-created temporary file exclusively"
);
assert.match(
  repairScript,
  /path\.dirname\(nextServerPath\)[\s\S]*?temporaryNextServerPath/,
  "runtime repair creates the temporary file in the standalone destination directory"
);
assert.match(
  repairScript,
  /renameSync\(\s*temporaryNextServerPath\s*,\s*nextServerPath\s*\)/,
  "runtime repair atomically replaces the destination from the temporary file"
);
assert.match(
  repairScript,
  /shell:\s*process\.platform\s*===\s*["']win32["']/,
  "runtime repair invokes npm.cmd through the Windows shell"
);
assert.match(
  repairScript,
  /NEXT_PRIVATE_STANDALONE:\s*["']true["']/,
  "runtime repair preserves the OpenNext standalone build mode"
);
assert.doesNotMatch(
  repairScript,
  /NEXT_PRIVATE_MINIMAL_MODE/,
  "runtime repair does not enable Next private minimal mode"
);
assert.match(
  openNextConfig,
  /buildCommand:\s*["']node scripts\/comment-translator-open-next-middleware-manifest-runtime-repair\.mjs["']/,
  "OpenNext build uses the runtime repair before bundling"
);

const generatedNextServerPath = path.join(
  projectRoot,
  ".next/standalone/node_modules/next/dist/server/next-server.js"
);
const outputHandlerPath = path.join(
  projectRoot,
  ".open-next/server-functions/default/handler.mjs"
);
const outputManifestPath = path.join(
  projectRoot,
  ".open-next/server-functions/default/.next/server/middleware-manifest.json"
);

assert.ok(existsSync(generatedNextServerPath), "generated Next server exists");
const generatedNextServer = readFileSync(generatedNextServerPath, "utf8");
assert.doesNotMatch(
  generatedNextServer,
  /require\(\s*this\.middlewareManifestPath\s*\)/,
  "generated Next server has no dynamic middleware manifest require"
);
assert.ok(existsSync(outputHandlerPath), "OpenNext default handler exists");
assert.ok(existsSync(outputManifestPath), "OpenNext middleware manifest remains packaged");
const outputHandler = readFileSync(outputHandlerPath, "utf8");
const outputManifest = JSON.parse(readFileSync(outputManifestPath, "utf8"));
const expectedManifestDigest = createHash("sha256")
  .update(JSON.stringify(outputManifest))
  .digest("hex");
const expectedGeneratedMarker =
  `${repairModule.STATIC_MIDDLEWARE_MANIFEST_MARKER}:${expectedManifestDigest}`;
const generatedMarkers = generatedNextServer.match(
  new RegExp(
    `${repairModule.STATIC_MIDDLEWARE_MANIFEST_MARKER}:[a-f0-9]{64}`,
    "g"
  )
) ?? [];
const generatedMarkerNameCount = generatedNextServer.split(
  repairModule.STATIC_MIDDLEWARE_MANIFEST_MARKER
).length - 1;
assert.doesNotMatch(
  outputHandler,
  /require\(\s*this\.middlewareManifestPath\s*\)/,
  "OpenNext default handler has no dynamic middleware manifest require"
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMinifiedLiteralPattern(value) {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return escapeRegExp(JSON.stringify(value));
  }
  if (Array.isArray(value)) {
    return `\\[\\s*${value.map(buildMinifiedLiteralPattern).join("\\s*,\\s*")}\\s*\\]`;
  }
  if (value && typeof value === "object") {
    const properties = Object.entries(value).map(([key, propertyValue]) => {
      const encodedKey = escapeRegExp(JSON.stringify(key));
      const unquotedKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
        ? `(?:${escapeRegExp(key)}|${encodedKey})`
        : encodedKey;
      return `${unquotedKey}\\s*:\\s*${buildMinifiedLiteralPattern(propertyValue)}`;
    });
    return `\\{\\s*${properties.join("\\s*,\\s*")}\\s*\\}`;
  }
  throw new TypeError("middleware manifest contains an unsupported value");
}

assert.match(
  outputHandler,
  new RegExp(buildMinifiedLiteralPattern(outputManifest)),
  "OpenNext default handler retains the exact static middleware manifest structure and values"
);
assert.deepEqual(
  generatedMarkers,
  [expectedGeneratedMarker],
  "generated Next server has exactly one repair marker with the output manifest digest"
);
assert.equal(
  generatedMarkerNameCount,
  generatedMarkers.length,
  "generated Next server has no legacy repair marker without a digest"
);

console.log("OpenNext middleware manifest runtime repair contract checks passed");
