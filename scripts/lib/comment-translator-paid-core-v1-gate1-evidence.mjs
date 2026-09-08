import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const AUTHORITY_STAGES = Object.freeze([
  "sourceCommit",
  "previewReadback",
  "rehearsalBackup",
  "finalBackup",
  "productionReadback",
  "canonicalReadback",
  "vaultReadback",
  "cronReadback",
  "rollbackEvidence"
]);

export const AUTHORITY_DOCUMENT_PATH = "docs/active/COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md";

const AUTHORITY_START_MARKER = "<!-- gate1-actual-evidence-index:start -->";
const AUTHORITY_END_MARKER = "<!-- gate1-actual-evidence-index:end -->";
const TARGET_BINDING_KEYS = Object.freeze([
  "repository",
  "preview",
  "production",
  "rehearsal",
  "recovery",
  "cloudflare"
]);
const AUTHORITY_POLICY_KEYS = Object.freeze([
  "schemaVersion",
  "expectedAuthorityCommit",
  "expectedSourceCommit",
  "expectedMigrationCorpusSha256",
  "stages"
]);
const POLICY_STAGE_KEYS = Object.freeze(["producer", "targetBindings", "observationWindow"]);
const PRODUCER_KEYS = Object.freeze(["entry", "sha256"]);
const OBSERVATION_WINDOW_KEYS = Object.freeze(["notBefore", "notAfter"]);
const INDEX_KEYS = Object.freeze(["schemaVersion", "sourceCommit", "migrationCorpusSha256", "stages"]);
const INDEX_STAGE_KEYS = Object.freeze([
  "producer",
  "targetBindings",
  "startedAt",
  "completedAt",
  "receipt",
  "artifacts"
]);
const RECEIPT_REFERENCE_KEYS = Object.freeze(["path", "sha256", "bytes"]);
const ARTIFACT_REFERENCE_KEYS = Object.freeze(["role", "path", "sha256", "bytes"]);
const NATIVE_RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "stage",
  "sourceCommit",
  "migrationCorpusSha256",
  "producer",
  "targetBindings",
  "startedAt",
  "completedAt",
  "native",
  "artifacts"
]);
const NATIVE_KEYS = Object.freeze([
  "kind",
  "exitCode",
  "signal",
  "error",
  "captureComplete",
  "stdoutBytes",
  "stderrBytes"
]);
const MAX_REFERENCE_BYTES = 1 * 1024 * 1024;
const MAX_AUTHORITY_DOCUMENT_BYTES = 1 * 1024 * 1024;
const MAX_TOTAL_JSON_BYTES = 32 * 1024 * 1024;
const MAX_GIT_CAPTURE_BYTES = 8 * 1024 * 1024;
const GIT_TIMEOUT_MS = 10 * 1000;
const WINDOWS_REPARSE_CAPTURE_BYTES = 64 * 1024;
const WINDOWS_REPARSE_TIMEOUT_MS = 10 * 1000;
const WINDOWS_REPARSE_SCRIPT = String.raw`$ErrorActionPreference = 'Stop'
$inputPaths=ConvertFrom-Json -InputObject ([Console]::In.ReadToEnd())
if ($inputPaths -isnot [System.Array]) { throw 'INPUT_SHAPE' }
$checkedCount=0
$reparseCount=0
foreach ($path in $inputPaths) {
  if ($path -isnot [string] -or [string]::IsNullOrWhiteSpace($path)) { throw 'PATH_SHAPE' }
  $attributes=[System.IO.File]::GetAttributes($path)
  $checkedCount += 1
  if (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { $reparseCount += 1 }
}
[Console]::Out.Write((ConvertTo-Json -Compress -InputObject ([ordered]@{checkedCount=$checkedCount;reparseCount=$reparseCount})))`;
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ROLE_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const SAFE_PATH_SEGMENT_PATTERN = /^[^\\/]+$/;

const REASONS = Object.freeze({
  POLICY_UNAVAILABLE: "AUTHORITY_POLICY_UNAVAILABLE",
  POLICY_INVALID: "AUTHORITY_POLICY_INVALID",
  ROOT_INVALID: "AUTHORITY_ROOT_INVALID",
  GIT_UNAVAILABLE: "AUTHORITY_GIT_UNAVAILABLE",
  GIT_COMMIT_INVALID: "AUTHORITY_GIT_COMMIT_INVALID",
  GIT_PARENT_INVALID: "AUTHORITY_GIT_PARENT_INVALID",
  GIT_DIFF_INVALID: "AUTHORITY_GIT_DIFF_INVALID",
  GIT_ANCESTRY_INVALID: "AUTHORITY_GIT_ANCESTRY_INVALID",
  GIT_BLOB_INVALID: "AUTHORITY_GIT_BLOB_INVALID",
  PRODUCER_INVALID: "AUTHORITY_PRODUCER_INVALID",
  DOCUMENT_INVALID: "AUTHORITY_DOCUMENT_INVALID",
  INDEX_INVALID: "AUTHORITY_INDEX_INVALID",
  BINDING_INVALID: "AUTHORITY_BINDING_INVALID",
  TIME_INVALID: "AUTHORITY_TIME_INVALID",
  ARTIFACT_INVALID: "AUTHORITY_ARTIFACT_INVALID",
  RECEIPT_INVALID: "AUTHORITY_RECEIPT_INVALID"
});

class AuthorityFailure extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function fail(reason) {
  throw new AuthorityFailure(reason);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function exactKeys(value, expected) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(REASONS.DOCUMENT_INVALID);
  }
}

function stripJsonWhitespaceOutsideStrings(source) {
  let inString = false;
  let escaped = false;
  let result = "";
  for (const character of source) {
    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
    } else if (!/[\t\n\r ]/.test(character)) {
      result += character;
    }
  }
  return result;
}

export function parseStrictJson(source) {
  if (typeof source !== "string") fail(REASONS.INDEX_INVALID);
  let index = 0;

  const skipWhitespace = () => {
    while (index < source.length && /[\t\n\r ]/.test(source[index])) index += 1;
  };

  const parseString = () => {
    if (source[index] !== '"') fail(REASONS.INDEX_INVALID);
    const start = index;
    index += 1;
    let escaped = false;
    while (index < source.length) {
      const character = source[index];
      if (!escaped && character === '"') {
        index += 1;
        const token = source.slice(start, index);
        try {
          const value = JSON.parse(token);
          if (typeof value !== "string") fail(REASONS.INDEX_INVALID);
          return value;
        } catch (error) {
          if (error instanceof AuthorityFailure) throw error;
          fail(REASONS.INDEX_INVALID);
        }
      }
      if (!escaped && character.charCodeAt(0) <= 0x1f) fail(REASONS.INDEX_INVALID);
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      index += 1;
    }
    fail(REASONS.INDEX_INVALID);
  };

  const parseNumber = () => {
    const match = source.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) fail(REASONS.INDEX_INVALID);
    index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) fail(REASONS.INDEX_INVALID);
    return value;
  };

  const parseValue = () => {
    skipWhitespace();
    const character = source[index];
    if (character === '"') return parseString();
    if (character === "{") return parseObject();
    if (character === "[") return parseArray();
    if (character === "-" || /\d/.test(character ?? "")) return parseNumber();
    if (source.startsWith("true", index)) {
      index += 4;
      return true;
    }
    if (source.startsWith("false", index)) {
      index += 5;
      return false;
    }
    if (source.startsWith("null", index)) {
      index += 4;
      return null;
    }
    fail(REASONS.INDEX_INVALID);
  };

  const parseObject = () => {
    index += 1;
    const object = Object.create(null);
    const keys = new Set();
    skipWhitespace();
    if (source[index] === "}") {
      index += 1;
      return object;
    }
    while (index < source.length) {
      skipWhitespace();
      const key = parseString();
      if (keys.has(key)) fail(REASONS.INDEX_INVALID);
      keys.add(key);
      skipWhitespace();
      if (source[index] !== ":") fail(REASONS.INDEX_INVALID);
      index += 1;
      const value = parseValue();
      Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true });
      skipWhitespace();
      if (source[index] === "}") {
        index += 1;
        return object;
      }
      if (source[index] !== ",") fail(REASONS.INDEX_INVALID);
      index += 1;
    }
    fail(REASONS.INDEX_INVALID);
  };

  const parseArray = () => {
    index += 1;
    const array = [];
    skipWhitespace();
    if (source[index] === "]") {
      index += 1;
      return array;
    }
    while (index < source.length) {
      array.push(parseValue());
      skipWhitespace();
      if (source[index] === "]") {
        index += 1;
        return array;
      }
      if (source[index] !== ",") fail(REASONS.INDEX_INVALID);
      index += 1;
    }
    fail(REASONS.INDEX_INVALID);
  };

  const value = parseValue();
  skipWhitespace();
  if (index !== source.length) fail(REASONS.INDEX_INVALID);
  let canonical;
  try {
    canonical = JSON.stringify(value);
  } catch {
    fail(REASONS.INDEX_INVALID);
  }
  if (stripJsonWhitespaceOutsideStrings(source) !== canonical) fail(REASONS.INDEX_INVALID);
  return value;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.includes("\0")) return false;
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === ".." || !SAFE_PATH_SEGMENT_PATTERN.test(segment))) return false;
  return path.posix.normalize(value) === value;
}

function isSafeProducerEntry(value) {
  return isSafeRelativePath(value) && (value === AUTHORITY_DOCUMENT_PATH || value.startsWith("scripts/"));
}

function isCommit(value) {
  return typeof value === "string" && SHA1_PATTERN.test(value);
}

function isSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isUtcIso(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function validateTargetBindings(value) {
  if (!isObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length >= 1
    && keys.length <= TARGET_BINDING_KEYS.length
    && keys.every((key) => TARGET_BINDING_KEYS.includes(key) && isSha256(value[key]));
}

function validatePolicyShape(policy) {
  if (!exactKeys(policy, AUTHORITY_POLICY_KEYS) || policy.schemaVersion !== 1) return false;
  if (!isCommit(policy.expectedAuthorityCommit) || !isCommit(policy.expectedSourceCommit) || policy.expectedAuthorityCommit === policy.expectedSourceCommit) return false;
  if (!isSha256(policy.expectedMigrationCorpusSha256) || !isObject(policy.stages)) return false;
  if (Object.keys(policy.stages).sort().join("\0") !== [...AUTHORITY_STAGES].sort().join("\0")) return false;
  for (const stage of AUTHORITY_STAGES) {
    const descriptor = policy.stages[stage];
    if (!exactKeys(descriptor, POLICY_STAGE_KEYS)
      || !exactKeys(descriptor.producer, PRODUCER_KEYS)
      || !isSafeProducerEntry(descriptor.producer.entry)
      || !isSha256(descriptor.producer.sha256)
      || !validateTargetBindings(descriptor.targetBindings)
      || !exactKeys(descriptor.observationWindow, OBSERVATION_WINDOW_KEYS)
      || !isUtcIso(descriptor.observationWindow.notBefore)
      || !isUtcIso(descriptor.observationWindow.notAfter)
      || new Date(descriptor.observationWindow.notBefore).getTime() > new Date(descriptor.observationWindow.notAfter).getTime()) {
      return false;
    }
  }
  return true;
}

export function validateAuthorityPolicy(policy, nowMs = Date.now()) {
  if (!validatePolicyShape(policy)) return { status: "AUTHORITY_UNAVAILABLE", reason: REASONS.POLICY_INVALID };
  for (const stage of AUTHORITY_STAGES) {
    const window = policy.stages[stage].observationWindow;
    if (new Date(window.notAfter).getTime() > nowMs) return { status: "AUTHORITY_UNAVAILABLE", reason: REASONS.TIME_INVALID };
  }
  return { status: "AUTHORITY_VALID", reason: null };
}

function minimalGitEnvironment() {
  const environment = {
    PATH: process.env.PATH ?? "",
    PATHEXT: process.env.PATHEXT ?? "",
    SystemRoot: process.env.SystemRoot ?? "",
    WINDIR: process.env.WINDIR ?? "",
    ComSpec: process.env.ComSpec ?? "",
    TEMP: process.env.TEMP ?? "",
    TMP: process.env.TMP ?? "",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0"
  };
  return environment;
}

function runNativeGit(repositoryRoot, args) {
  const result = spawnSync("git", ["--no-replace-objects", ...args], {
    cwd: repositoryRoot,
    env: minimalGitEnvironment(),
    shell: false,
    windowsHide: true,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: MAX_GIT_CAPTURE_BYTES,
    encoding: null
  });
  const stdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? "");
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr ?? "");
  const captureComplete = stdout.length + stderr.length <= MAX_GIT_CAPTURE_BYTES;
  return {
    status: typeof result.status === "number" ? result.status : null,
    signal: result.signal ?? null,
    error: result.error ?? null,
    stdout,
    stderr,
    captureComplete
  };
}

function runGit(repositoryRoot, args, reason = REASONS.GIT_UNAVAILABLE) {
  const result = runNativeGit(repositoryRoot, args);
  if (result.status !== 0 || result.signal !== null || result.error || result.stderr.length !== 0 || !result.captureComplete) fail(reason);
  return result.stdout;
}

function verifyRoot(root) {
  if (typeof root !== "string" || !path.isAbsolute(root)) fail(REASONS.ROOT_INVALID);
  const originalRoot = path.resolve(root);
  let stat;
  try {
    const originalPaths = originalArtifactPaths(originalRoot, "");
    const reparseProbe = runWindowsReparseProbe(originalPaths);
    if (process.platform === "win32" && reparseProbe.status !== "PASS") fail(REASONS.ROOT_INVALID);
    for (const current of originalPaths) {
      stat = fs.lstatSync(current);
      if (current === originalRoot && !stat.isDirectory()) fail(REASONS.ROOT_INVALID);
      if (stat.isSymbolicLink() || !samePath(path.resolve(fs.realpathSync.native(current)), path.resolve(current))) fail(REASONS.ROOT_INVALID);
    }
  } catch (error) {
    if (error instanceof AuthorityFailure) throw error;
    fail(REASONS.ROOT_INVALID);
  }
  return { root: originalRoot };
}

function samePath(left, right) {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function runWindowsReparseProbe(originalPaths) {
  if (process.platform !== "win32") return { status: "SKIPPED", checkedCount: 0, reparseCount: 0 };
  if (!Array.isArray(originalPaths) || originalPaths.length < 1 || originalPaths.some((value) => typeof value !== "string" || !path.isAbsolute(value))) {
    return { status: "FAIL", checkedCount: 0, reparseCount: 0 };
  }
  const systemRoot = process.env.SystemRoot;
  if (typeof systemRoot !== "string" || !path.isAbsolute(systemRoot)) return { status: "FAIL", checkedCount: 0, reparseCount: 0 };
  const powershellPath = path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const result = spawnSync(powershellPath, ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_REPARSE_SCRIPT], {
    input: Buffer.from(JSON.stringify(originalPaths), "utf8"),
    shell: false,
    windowsHide: true,
    timeout: WINDOWS_REPARSE_TIMEOUT_MS,
    maxBuffer: WINDOWS_REPARSE_CAPTURE_BYTES,
    encoding: null
  });
  const stdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? "");
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr ?? "");
  if (result.status !== 0 || result.signal !== null || result.error || stderr.length !== 0 || stdout.length + stderr.length > WINDOWS_REPARSE_CAPTURE_BYTES) {
    return { status: "FAIL", checkedCount: 0, reparseCount: 0 };
  }
  let parsed;
  try {
    parsed = JSON.parse(decodeUtf8(stdout));
  } catch {
    return { status: "FAIL", checkedCount: 0, reparseCount: 0 };
  }
  if (!exactKeys(parsed, ["checkedCount", "reparseCount"])
    || parsed.checkedCount !== originalPaths.length
    || parsed.reparseCount !== 0
    || !Number.isSafeInteger(parsed.checkedCount)
    || !Number.isSafeInteger(parsed.reparseCount)) {
    return { status: "FAIL", checkedCount: 0, reparseCount: 0 };
  }
  return { status: "PASS", checkedCount: parsed.checkedCount, reparseCount: parsed.reparseCount };
}

function assertWindowsNoReparse(originalPaths) {
  const result = runWindowsReparseProbe(originalPaths);
  if (process.platform === "win32" && result.status !== "PASS") fail(REASONS.ARTIFACT_INVALID);
}

function originalArtifactPaths(root, relativePath) {
  const originalRoot = path.resolve(root);
  const ancestors = [];
  let current = originalRoot;
  while (true) {
    ancestors.unshift(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  current = originalRoot;
  for (const segment of relativePath ? relativePath.split("/") : []) {
    current = path.join(current, segment);
    ancestors.push(current);
  }
  return ancestors;
}

function safeArtifactPath(evidence, relativePath) {
  if (!isSafeRelativePath(relativePath)) fail(REASONS.ARTIFACT_INVALID);
  const resolved = path.resolve(evidence.root, ...relativePath.split("/"));
  const rootPrefix = evidence.root.endsWith(path.sep) ? evidence.root : `${evidence.root}${path.sep}`;
  if (!samePath(resolved, evidence.root) && !samePath(resolved.slice(0, rootPrefix.length), rootPrefix)) fail(REASONS.ARTIFACT_INVALID);
  assertWindowsNoReparse(originalArtifactPaths(evidence.root, relativePath));
  let current = evidence.root;
  for (const segment of relativePath.split("/")) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch {
      fail(REASONS.ARTIFACT_INVALID);
    }
    if (stat.isSymbolicLink() || !samePath(path.resolve(fs.realpathSync.native(current)), path.resolve(current))) fail(REASONS.ARTIFACT_INVALID);
  }
  return resolved;
}

function sameMetadata(left, right) {
  return left.isFile() === right.isFile()
    && left.isSymbolicLink() === right.isSymbolicLink()
    && left.size === right.size
    && left.mode === right.mode
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs
    && left.dev === right.dev
    && left.ino === right.ino;
}

function readArtifact(evidence, reference) {
  if (!exactKeys(reference, RECEIPT_REFERENCE_KEYS) && !exactKeys(reference, ARTIFACT_REFERENCE_KEYS)) fail(REASONS.ARTIFACT_INVALID);
  if (!isSha256(reference.sha256) || !Number.isSafeInteger(reference.bytes) || reference.bytes < 1 || reference.bytes > MAX_REFERENCE_BYTES || !reference.path.endsWith(".json")) fail(REASONS.ARTIFACT_INVALID);
  const filePath = safeArtifactPath(evidence, reference.path);
  let descriptor;
  let fd;
  try {
    descriptor = fs.lstatSync(filePath);
    if (!descriptor.isFile() || descriptor.isSymbolicLink()) fail(REASONS.ARTIFACT_INVALID);
    fd = fs.openSync(filePath, "r");
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.size !== reference.bytes) fail(REASONS.ARTIFACT_INVALID);
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    if (!sameMetadata(before, after) || !sameMetadata(descriptor, after) || bytes.length !== reference.bytes || sha256Bytes(bytes) !== reference.sha256) fail(REASONS.ARTIFACT_INVALID);
    fs.closeSync(fd);
    fd = undefined;
    const finalDescriptor = fs.lstatSync(filePath);
    if (!sameMetadata(descriptor, finalDescriptor)) fail(REASONS.ARTIFACT_INVALID);
    assertWindowsNoReparse(originalArtifactPaths(evidence.root, reference.path));
    return bytes;
  } catch (error) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* closed below */ }
    }
    if (error instanceof AuthorityFailure) throw error;
    fail(REASONS.ARTIFACT_INVALID);
  }
}

function parseGitTreeRecord(bytes, reason = REASONS.GIT_BLOB_INVALID) {
  const text = decodeUtf8(bytes);
  const records = text.split("\0").filter(Boolean);
  if (records.length !== 1) fail(reason);
  const match = records[0].match(/^(\d{6}) blob ([a-f0-9]{40})\t(.+)$/);
  if (!match) fail(reason);
  return { mode: match[1], object: match[2], entry: match[3] };
}

function parseGitBlobSize(bytes) {
  const text = decodeUtf8(bytes);
  const match = text.match(/^(0|[1-9]\d*)\r?\n$/);
  if (!match) fail(REASONS.DOCUMENT_INVALID);
  const size = Number(match[1]);
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_AUTHORITY_DOCUMENT_BYTES) fail(REASONS.DOCUMENT_INVALID);
  return size;
}

function verifyAuthorityCommit(repositoryRoot, policy) {
  const authorityCommit = policy.expectedAuthorityCommit;
  const sourceCommit = policy.expectedSourceCommit;
  runGit(repositoryRoot, ["cat-file", "-e", `${authorityCommit}^{commit}`], REASONS.GIT_COMMIT_INVALID);
  runGit(repositoryRoot, ["cat-file", "-e", `${sourceCommit}^{commit}`], REASONS.GIT_COMMIT_INVALID);
  const parentText = decodeUtf8(runGit(repositoryRoot, ["show", "-s", "--format=%P", authorityCommit], REASONS.GIT_PARENT_INVALID)).trim();
  const parents = parentText ? parentText.split(/\s+/) : [];
  if (parents.length !== 1 || !isCommit(parents[0])) fail(REASONS.GIT_PARENT_INVALID);
  const diffText = decodeUtf8(runGit(repositoryRoot, [
    "diff-tree",
    "--no-commit-id",
    "--raw",
    "--no-renames",
    "--no-ext-diff",
    "--no-textconv",
    "-r",
    parents[0],
    authorityCommit
  ], REASONS.GIT_DIFF_INVALID)).trimEnd();
  const diffLines = diffText ? diffText.split(/\r?\n/) : [];
  if (diffLines.length !== 1) fail(REASONS.GIT_DIFF_INVALID);
  const diff = diffLines[0].match(/^:(\d{6}) (\d{6}) ([a-f0-9]{40}) ([a-f0-9]{40}) M\t(.+)$/);
  if (!diff || diff[1] !== "100644" || diff[2] !== "100644" || diff[5] !== AUTHORITY_DOCUMENT_PATH) fail(REASONS.GIT_DIFF_INVALID);
  const ancestry = runNativeGit(repositoryRoot, ["merge-base", "--is-ancestor", sourceCommit, authorityCommit]);
  if (ancestry.status === 1 && ancestry.signal === null && !ancestry.error && ancestry.stderr.length === 0 && ancestry.captureComplete) fail(REASONS.GIT_ANCESTRY_INVALID);
  if (ancestry.status !== 0 || ancestry.signal !== null || ancestry.error || ancestry.stderr.length !== 0 || !ancestry.captureComplete) fail(REASONS.GIT_ANCESTRY_INVALID);
  const authorityTree = parseGitTreeRecord(runGit(repositoryRoot, ["ls-tree", "-z", authorityCommit, "--", AUTHORITY_DOCUMENT_PATH], REASONS.GIT_BLOB_INVALID));
  if (authorityTree.mode !== "100644" || authorityTree.entry !== AUTHORITY_DOCUMENT_PATH) fail(REASONS.GIT_BLOB_INVALID);
  const authoritySize = parseGitBlobSize(runGit(repositoryRoot, ["cat-file", "-s", authorityTree.object], REASONS.DOCUMENT_INVALID));
  const authorityBytes = runGit(repositoryRoot, ["show", `${authorityCommit}:${AUTHORITY_DOCUMENT_PATH}`], REASONS.DOCUMENT_INVALID);
  if (authorityBytes.length !== authoritySize || authorityBytes.length < 1 || authorityBytes.length > MAX_AUTHORITY_DOCUMENT_BYTES) fail(REASONS.DOCUMENT_INVALID);
  for (const stage of AUTHORITY_STAGES) {
    const producer = policy.stages[stage].producer;
    const commit = sourceCommit;
    const tree = parseGitTreeRecord(runGit(repositoryRoot, ["ls-tree", "-z", commit, "--", producer.entry], REASONS.PRODUCER_INVALID), REASONS.PRODUCER_INVALID);
    if (!(["100644", "100755"].includes(tree.mode)) || tree.entry !== producer.entry) fail(REASONS.PRODUCER_INVALID);
    const bytes = runGit(repositoryRoot, ["show", `${commit}:${producer.entry}`], REASONS.PRODUCER_INVALID);
    if (sha256Bytes(bytes) !== producer.sha256) fail(REASONS.PRODUCER_INVALID);
  }
  return authorityBytes;
}

function extractAuthorityIndex(authorityBytes) {
  if (!Buffer.isBuffer(authorityBytes) || authorityBytes.length < 1 || authorityBytes.length > MAX_AUTHORITY_DOCUMENT_BYTES) fail(REASONS.DOCUMENT_INVALID);
  const source = decodeUtf8(authorityBytes);
  const startCount = source.split(AUTHORITY_START_MARKER).length - 1;
  const endCount = source.split(AUTHORITY_END_MARKER).length - 1;
  if (startCount !== 1 || endCount !== 1) fail(REASONS.DOCUMENT_INVALID);
  const start = source.indexOf(AUTHORITY_START_MARKER);
  const end = source.indexOf(AUTHORITY_END_MARKER);
  if (start < 0 || end <= start) fail(REASONS.DOCUMENT_INVALID);
  const body = source.slice(start + AUTHORITY_START_MARKER.length, end);
  const fence = body.match(/^\s*```json\r?\n([\s\S]*?)\r?\n```\s*$/);
  if (!fence || (body.match(/```/g) ?? []).length !== 2) fail(REASONS.DOCUMENT_INVALID);
  try {
    return parseStrictJson(fence[1]);
  } catch (error) {
    if (error instanceof AuthorityFailure) throw error;
    fail(REASONS.DOCUMENT_INVALID);
  }
}

function validateReference(reference, kind) {
  const keys = kind === "receipt" ? RECEIPT_REFERENCE_KEYS : ARTIFACT_REFERENCE_KEYS;
  if (!exactKeys(reference, keys) || !isSha256(reference.sha256) || !Number.isSafeInteger(reference.bytes) || reference.bytes < 1 || reference.bytes > MAX_REFERENCE_BYTES || typeof reference.path !== "string" || !reference.path.endsWith(".json")) fail(REASONS.INDEX_INVALID);
  if (kind === "artifact" && !ROLE_PATTERN.test(reference.role)) fail(REASONS.INDEX_INVALID);
}

function validateIndexShape(index, policy) {
  if (!exactKeys(index, INDEX_KEYS) || index.schemaVersion !== 1 || index.sourceCommit !== policy.expectedSourceCommit || index.migrationCorpusSha256 !== policy.expectedMigrationCorpusSha256 || !isObject(index.stages)) fail(REASONS.INDEX_INVALID);
  if (Object.keys(index.stages).sort().join("\0") !== [...AUTHORITY_STAGES].sort().join("\0")) fail(REASONS.INDEX_INVALID);
  const seenPaths = new Map();
  let totalBytes = 0;
  for (const stage of AUTHORITY_STAGES) {
    const descriptor = index.stages[stage];
    const policyStage = policy.stages[stage];
    if (!exactKeys(descriptor, INDEX_STAGE_KEYS)
      || !exactKeys(descriptor.producer, PRODUCER_KEYS)
      || !isSafeProducerEntry(descriptor.producer.entry)
      || !isSha256(descriptor.producer.sha256)
      || !validateTargetBindings(descriptor.targetBindings)
      || !isUtcIso(descriptor.startedAt)
      || !isUtcIso(descriptor.completedAt)
      || !exactKeys(descriptor.receipt, RECEIPT_REFERENCE_KEYS)
      || !Array.isArray(descriptor.artifacts)
      || descriptor.artifacts.length < 1
      || descriptor.artifacts.length > 16
      || stableStringify(descriptor.producer) !== stableStringify(policyStage.producer)
      || stableStringify(descriptor.targetBindings) !== stableStringify(policyStage.targetBindings)) fail(REASONS.INDEX_INVALID);
    if (new Date(descriptor.startedAt).getTime() > new Date(descriptor.completedAt).getTime()) fail(REASONS.TIME_INVALID);
    validateReference(descriptor.receipt, "receipt");
    totalBytes += descriptor.receipt.bytes;
    if (totalBytes > MAX_TOTAL_JSON_BYTES) fail(REASONS.ARTIFACT_INVALID);
    const receiptEntry = seenPaths.get(descriptor.receipt.path);
    if (receiptEntry && (receiptEntry.kind !== "receipt" || receiptEntry.sha256 !== descriptor.receipt.sha256 || receiptEntry.bytes !== descriptor.receipt.bytes)) fail(REASONS.INDEX_INVALID);
    seenPaths.set(descriptor.receipt.path, { kind: "receipt", sha256: descriptor.receipt.sha256, bytes: descriptor.receipt.bytes });
    const roles = new Set();
    const artifactPaths = new Set();
    for (const artifact of descriptor.artifacts) {
      validateReference(artifact, "artifact");
      if (roles.has(artifact.role)) fail(REASONS.INDEX_INVALID);
      if (artifactPaths.has(artifact.path)) fail(REASONS.INDEX_INVALID);
      roles.add(artifact.role);
      artifactPaths.add(artifact.path);
      totalBytes += artifact.bytes;
      if (totalBytes > MAX_TOTAL_JSON_BYTES) fail(REASONS.ARTIFACT_INVALID);
      const existing = seenPaths.get(artifact.path);
      if (existing && (existing.kind !== "artifact" || existing.sha256 !== artifact.sha256 || existing.bytes !== artifact.bytes)) fail(REASONS.INDEX_INVALID);
      if (existing?.kind === "receipt") fail(REASONS.INDEX_INVALID);
      seenPaths.set(artifact.path, { kind: "artifact", sha256: artifact.sha256, bytes: artifact.bytes });
    }
  }
  return { totalBytes, seenPaths };
}

function validateTimeBindings(index, policy, nowMs) {
  for (const stage of AUTHORITY_STAGES) {
    const descriptor = index.stages[stage];
    const window = policy.stages[stage].observationWindow;
    const notBefore = new Date(window.notBefore).getTime();
    const notAfter = new Date(window.notAfter).getTime();
    const startedAt = new Date(descriptor.startedAt).getTime();
    const completedAt = new Date(descriptor.completedAt).getTime();
    if (notAfter > nowMs || startedAt > completedAt || startedAt < notBefore || completedAt > notAfter || completedAt > nowMs) fail(REASONS.TIME_INVALID);
  }
}

function compareReceipt(stage, descriptor, receipt, sourceCommit, migrationCorpusSha256) {
  if (!exactKeys(receipt, NATIVE_RECEIPT_KEYS)
    || receipt.schemaVersion !== 1
    || receipt.stage !== stage
    || receipt.sourceCommit !== sourceCommit
    || receipt.migrationCorpusSha256 !== migrationCorpusSha256
    || stableStringify(receipt.producer) !== stableStringify(descriptor.producer)
    || stableStringify(receipt.targetBindings) !== stableStringify(descriptor.targetBindings)
    || receipt.startedAt !== descriptor.startedAt
    || receipt.completedAt !== descriptor.completedAt
    || !exactKeys(receipt.native, NATIVE_KEYS)
    || !Array.isArray(receipt.artifacts)
    || stableStringify(receipt.artifacts) !== stableStringify(descriptor.artifacts)) fail(REASONS.RECEIPT_INVALID);
  if (receipt.native.kind !== "process"
    || receipt.native.exitCode !== 0
    || receipt.native.signal !== null
    || receipt.native.error !== null
    || receipt.native.captureComplete !== true
    || !Number.isSafeInteger(receipt.native.stdoutBytes)
    || receipt.native.stdoutBytes < 0
    || receipt.native.stdoutBytes > MAX_GIT_CAPTURE_BYTES
    || receipt.native.stderrBytes !== 0) fail(REASONS.RECEIPT_INVALID);
}

export function validateEvidenceIndex(index, policy, evidenceRoot, nowMs = Date.now()) {
  try {
    const policyCheck = validateAuthorityPolicy(policy, nowMs);
    if (policyCheck.status !== "AUTHORITY_VALID") return policyCheck;
    const evidence = verifyRoot(evidenceRoot);
    const { totalBytes } = validateIndexShape(index, policy);
    validateTimeBindings(index, policy, nowMs);
    const artifacts = Object.create(null);
    for (const stage of AUTHORITY_STAGES) {
      const descriptor = index.stages[stage];
      const receiptBytes = readArtifact(evidence, descriptor.receipt);
      let receipt;
      try {
        receipt = parseStrictJson(decodeUtf8(receiptBytes));
      } catch (error) {
        if (error instanceof AuthorityFailure) throw new AuthorityFailure(REASONS.RECEIPT_INVALID);
        fail(REASONS.RECEIPT_INVALID);
      }
      compareReceipt(stage, descriptor, receipt, policy.expectedSourceCommit, policy.expectedMigrationCorpusSha256);
      for (const artifact of descriptor.artifacts) {
        const bytes = readArtifact(evidence, artifact);
        artifacts[artifact.path] = bytes;
      }
    }
    const summary = { status: "AUTHORITY_VALID", reason: null, stageCount: AUTHORITY_STAGES.length, remoteCalls: 0, mutations: 0 };
    Object.defineProperty(summary, "bundle", {
      value: { index, artifacts, totalBytes },
      enumerable: false,
      writable: false
    });
    return summary;
  } catch (error) {
    if (error instanceof AuthorityFailure) return { status: "AUTHORITY_UNAVAILABLE", reason: error.reason, stageCount: 0, remoteCalls: 0, mutations: 0 };
    return { status: "AUTHORITY_UNAVAILABLE", reason: REASONS.ARTIFACT_INVALID, stageCount: 0, remoteCalls: 0, mutations: 0 };
  }
}

export function verifyAuthorityBundle({ repositoryRoot, evidenceRoot, policy } = {}) {
  if (policy === undefined || policy === null) return { status: "AUTHORITY_UNAVAILABLE", reason: REASONS.POLICY_UNAVAILABLE, stageCount: 0, remoteCalls: 0, mutations: 0 };
  const policyCheck = validateAuthorityPolicy(policy);
  if (policyCheck.status !== "AUTHORITY_VALID") return { ...policyCheck, stageCount: 0, remoteCalls: 0, mutations: 0 };
  try {
    const repository = verifyRoot(repositoryRoot);
    const authorityBytes = verifyAuthorityCommit(repository.root, policy);
    const index = extractAuthorityIndex(authorityBytes);
    return validateEvidenceIndex(index, policy, evidenceRoot);
  } catch (error) {
    if (error instanceof AuthorityFailure) return { status: "AUTHORITY_UNAVAILABLE", reason: error.reason, stageCount: 0, remoteCalls: 0, mutations: 0 };
    return { status: "AUTHORITY_UNAVAILABLE", reason: REASONS.GIT_UNAVAILABLE, stageCount: 0, remoteCalls: 0, mutations: 0 };
  }
}
