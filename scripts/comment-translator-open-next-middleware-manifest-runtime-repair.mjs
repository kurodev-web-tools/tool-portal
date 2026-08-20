import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STATIC_MIDDLEWARE_MANIFEST_MARKER =
  "comment-translator-static-middleware-manifest-v1";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRootPath = path.join(projectRoot, ".next/standalone");
const nextServerPath = path.join(
  standaloneRootPath,
  "node_modules/next/dist/server/next-server.js"
);
const middlewareManifestPath = path.join(
  projectRoot,
  ".next/standalone/.next/server/middleware-manifest.json"
);

const dynamicMiddlewareManifestRequire =
  /const\s+manifest\s*=\s*require\s*\(\s*this\.middlewareManifestPath\s*\)\s*;/g;

function digestMiddlewareManifest(manifest) {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

function normalizePathIdentity(filePath) {
  const normalizedPath = path.normalize(path.resolve(filePath));
  return process.platform === "win32"
    ? normalizedPath.toLowerCase()
    : normalizedPath;
}

export function resolvePathWithinRoot(targetPath, allowedRootPath, options = {}) {
  const resolveRealpath = options.realpath ?? realpathSync;
  const resolvedAllowedRootPath = path.resolve(resolveRealpath(allowedRootPath));
  const resolvedTargetPath = path.resolve(resolveRealpath(targetPath));
  if (
    options.expectedTargetPath !== undefined &&
    normalizePathIdentity(resolvedTargetPath) !==
      normalizePathIdentity(options.expectedTargetPath)
  ) {
    throw new Error("resolved path does not match intended lexical path");
  }
  const relativeTargetPath = path.relative(
    resolvedAllowedRootPath,
    resolvedTargetPath
  );
  if (
    relativeTargetPath === ".." ||
    relativeTargetPath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeTargetPath)
  ) {
    throw new Error("resolved path escapes allowed root");
  }
  return resolvedTargetPath;
}

function findMatchingClosingBrace(source, openingBraceIndex) {
  let braceDepth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openingBraceIndex; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "/" && nextCharacter === "/") {
      index += 1;
      while (index + 1 < source.length && source[index + 1] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (character === "/" && nextCharacter === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        index += 1;
      }
      if (index >= source.length) {
        return -1;
      }
      index += 1;
      continue;
    }

    if (character === "{") {
      braceDepth += 1;
    } else if (character === "}") {
      braceDepth -= 1;
      if (braceDepth === 0) {
        return index;
      }
      if (braceDepth < 0) {
        return -1;
      }
    }
  }

  return -1;
}

function findOccurrencesOutsideStringsAndComments(source, text) {
  const occurrences = [];
  let quote = null;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "/" && nextCharacter === "/") {
      index += 1;
      while (index + 1 < source.length && source[index + 1] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (character === "/" && nextCharacter === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        index += 1;
      }
      if (index >= source.length) {
        return occurrences;
      }
      index += 1;
      continue;
    }

    if (source.startsWith(text, index)) {
      occurrences.push(index);
      index += text.length - 1;
      continue;
    }
  }

  return occurrences;
}

function getMiddlewareManifestMethodBody(source, assignmentKind) {
  const methodMatches = [
    ...source.matchAll(/\bgetMiddlewareManifest\s*\(\s*\)\s*\{/g)
  ];
  if (methodMatches.length !== 1) {
    throw new Error(
      `${assignmentKind} middleware manifest method shape is not uniquely identifiable`
    );
  }

  const methodMatch = methodMatches[0];
  const openingBraceIndex = methodMatch.index + methodMatch[0].lastIndexOf("{");
  const closingBraceIndex = findMatchingClosingBrace(
    source,
    openingBraceIndex
  );
  if (closingBraceIndex < 0) {
    throw new Error(
      `${assignmentKind} middleware manifest method body is not balanced`
    );
  }

  return source.slice(openingBraceIndex + 1, closingBraceIndex);
}

function assertStaticManifestAssignmentInMiddlewareMethod(
  source,
  expectedStaticAssignment
) {
  const methodBody = getMiddlewareManifestMethodBody(source, "static");
  const assignmentOccurrences = findOccurrencesOutsideStringsAndComments(
    methodBody,
    expectedStaticAssignment
  );
  const returnOccurrences = findOccurrencesOutsideStringsAndComments(
    methodBody,
    "return manifest;"
  );
  if (
    assignmentOccurrences.length !== 1 ||
    returnOccurrences.length !== 1 ||
    returnOccurrences[0] < assignmentOccurrences[0]
  ) {
    throw new Error(
      "static middleware manifest assignment is not tied to getMiddlewareManifest"
    );
  }
}

function assertDynamicManifestAssignmentInMiddlewareMethod(source) {
  const methodBody = getMiddlewareManifestMethodBody(source, "dynamic");
  const assignmentMatches = [
    ...methodBody.matchAll(dynamicMiddlewareManifestRequire)
  ];
  const returnOccurrences = findOccurrencesOutsideStringsAndComments(
    methodBody,
    "return manifest;"
  );
  if (
    assignmentMatches.length !== 1 ||
    returnOccurrences.length !== 1 ||
    returnOccurrences[0] < assignmentMatches[0].index
  ) {
    throw new Error(
      "dynamic middleware manifest assignment is not tied to getMiddlewareManifest"
    );
  }
}

export function repairMiddlewareManifestSource(source, manifest) {
  if (typeof source !== "string" || source.length === 0) {
    throw new TypeError("Next server source is required");
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new TypeError("middleware manifest object is required");
  }

  const matches = source.match(dynamicMiddlewareManifestRequire) ?? [];
  const manifestDigest = digestMiddlewareManifest(manifest);
  const expectedMarker = `${STATIC_MIDDLEWARE_MANIFEST_MARKER}:${manifestDigest}`;
  const inlineManifest = JSON.stringify(manifest);
  const expectedStaticAssignment =
    `const manifest = /* ${expectedMarker} */ ${inlineManifest};`;
  if (source.includes(STATIC_MIDDLEWARE_MANIFEST_MARKER)) {
    if (matches.length > 0) {
      throw new Error("static middleware manifest marker conflicts with dynamic require");
    }
    const markerPattern = new RegExp(
      `${STATIC_MIDDLEWARE_MANIFEST_MARKER}:([a-f0-9]{64})`,
      "g"
    );
    const markers = [...source.matchAll(markerPattern)];
    const staticAssignmentCount =
      source.split(expectedStaticAssignment).length - 1;
    if (
      markers.length !== 1 ||
      markers[0][1] !== manifestDigest ||
      staticAssignmentCount !== 1
    ) {
      throw new Error("static middleware manifest marker does not match manifest");
    }
    assertStaticManifestAssignmentInMiddlewareMethod(
      source,
      expectedStaticAssignment
    );
    return source;
  }

  if (matches.length !== 1) {
    throw new Error(
      "dynamic middleware manifest require not found exactly once"
    );
  }

  assertDynamicManifestAssignmentInMiddlewareMethod(source);

  return source.replace(
    dynamicMiddlewareManifestRequire,
    `const manifest = /* ${expectedMarker} */ ${inlineManifest};`
  );
}

export function replaceFileAtomically(nextServerPath, repaired, options = {}) {
  const nextServerDirectory = path.dirname(nextServerPath);
  const temporaryNextServerPath = path.join(
    nextServerDirectory,
    `.next-server.js.runtime-repair-${process.pid}-${randomUUID()}.tmp`
  );
  writeFileSync(temporaryNextServerPath, repaired, {
    encoding: "utf8",
    flag: "wx"
  });

  try {
    if (options.rename) {
      options.rename(temporaryNextServerPath, nextServerPath);
    } else {
      renameSync(temporaryNextServerPath, nextServerPath);
    }
  } catch (error) {
    rmSync(temporaryNextServerPath, { force: true });
    throw error;
  }
}

export function repairGeneratedNextServer(options = {}) {
  const repairProjectRoot = options.projectRootPath ?? projectRoot;
  const repairStandaloneRootPath =
    options.standaloneRootPath ?? standaloneRootPath;
  const repairNextServerPath = options.nextServerPath ?? nextServerPath;
  const repairMiddlewareManifestPath =
    options.middlewareManifestPath ?? middlewareManifestPath;
  const pathExists = options.exists ?? existsSync;
  const readFile = options.readFile ?? readFileSync;
  const replaceFile = options.replaceFile ?? replaceFileAtomically;
  const resolveRealpath = options.realpath ?? realpathSync;

  if (
    !pathExists(repairNextServerPath) ||
    !pathExists(repairMiddlewareManifestPath)
  ) {
    throw new Error("expected standalone Next server and middleware manifest are unavailable");
  }
  const resolvedStandaloneRootPath = resolvePathWithinRoot(
    repairStandaloneRootPath,
    repairProjectRoot,
    {
      expectedTargetPath: repairStandaloneRootPath,
      realpath: resolveRealpath
    }
  );
  const resolvedNextServerPath = resolvePathWithinRoot(
    repairNextServerPath,
    resolvedStandaloneRootPath,
    { realpath: resolveRealpath }
  );
  const resolvedMiddlewareManifestPath = resolvePathWithinRoot(
    repairMiddlewareManifestPath,
    resolvedStandaloneRootPath,
    { realpath: resolveRealpath }
  );

  let manifest;
  try {
    manifest = JSON.parse(readFile(resolvedMiddlewareManifestPath, "utf8"));
  } catch {
    throw new Error("standalone middleware manifest is not valid JSON");
  }

  const source = readFile(resolvedNextServerPath, "utf8");
  const repaired = repairMiddlewareManifestSource(source, manifest);
  if (repaired !== source) {
    replaceFile(resolvedNextServerPath, repaired);
  }

  return repaired !== source;
}

function runNextBuild() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const buildEnvironment = {
    ...process.env,
    NEXT_PRIVATE_STANDALONE: "true",
    NEXT_PRIVATE_OUTPUT_TRACE_ROOT: projectRoot
  };
  const result = spawnSync(npmCommand, ["run", "build"], {
    cwd: projectRoot,
    env: buildEnvironment,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.error || result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runNextBuild();
  const changed = repairGeneratedNextServer();
  console.log(
    `OpenNext middleware manifest runtime repair applied (changed=${changed ? "yes" : "no"})`
  );
}
