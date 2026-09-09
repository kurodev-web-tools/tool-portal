import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  assertCanonicalObservationAgainstStructure,
  assertCatalogReadbackArtifact,
  assertCanonicalPaidRpcSecurityBoundary,
  assertCanonicalStructuralState,
  canonicalStructuralEqual,
  computeObjectDigest,
  maskSql,
  projectCanonicalStructuralState,
  sortKeysDeep
} from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";
import { cleanupGeneratedRuntimeResources } from "./lib/comment-translator-paid-core-v1-gate1-runtime-cleanup.mjs";
import { POSTAPPLY_CATALOG_SQL } from "./lib/comment-translator-paid-core-v1-gate1-postapply-acquire.mjs";
import { inspectPostApplyCatalogArtifact } from "./lib/comment-translator-paid-core-v1-gate1-postapply-catalog.mjs";
import { parseStrictJson } from "./lib/comment-translator-paid-core-v1-gate1-evidence.mjs";

const root = process.cwd();
const fixturesRoot = path.join(root, "scripts", "fixtures");
const migrationsRoot = path.join(root, "supabase", "migrations");
const historyFixturePath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-production-history.json");
const bridgeStatesPath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-bridge-states.json");
const canonicalAuthorityPath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-canonical-authority.json");
const bridgePath = path.join(migrationsRoot, "20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql");
const r13ArtifactPath = "C:/ProgramData/Codex/Gate1/catalog-readback-20260903-r13/preview/preview-catalog-readback.json";
const r3ProductionArtifactPath = "C:/ProgramData/Codex/Gate1/catalog-readback-20260902-r3/production/production-catalog-readback.json";
const forwardConvergenceMigration = "20260904000000_comment_translator_paid_gate1_a3_canonical_convergence";
const expectedR13Sha256 = "489b36c13953b9fa1f508ea7e8bdb9a6ca5cb0aa0998de07cbbbe4189d174a16";
const legacyFiles = [
  "20260722000000_comment_translator_paid_entitlements.sql",
  "20260722001000_comment_translator_paid_usage_counters.sql",
  "20260726111154_comment_translator_paid_entitlements.sql",
  "20260728135736_comment_translator_paid_usage_counters.sql"
];
const legacyVersions = new Set(["20260722000000", "20260722001000", "20260726111154", "20260728135736"]);
const legacyDir = process.env.GATE1_LEGACY_SQL_DIR;
const dockerCli = "C:/Program Files/Docker/Docker/resources/bin/docker.exe";
const dockerContextName = "desktop-linux";
const dockerEndpoint = "npipe:////./pipe/dockerDesktopLinuxEngine";
const dockerControlTimeoutMs = 60 * 1000;
const localCliTimeoutMs = 300 * 1000;
const dockerMaxBufferBytes = 64 * 1024 * 1024;
const cliRunnerPath = path.join(root, "scripts", "lib", "comment-translator-paid-core-v1-gate1-cli-runner.cjs");
const supabaseCliPath = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const localCliRunnerMaxBufferBytes = 4 * 1024 * 1024;
const disposableDatabaseImage = "public.ecr.aws/supabase/postgres:17.6.1.140";
const directResourceLabelKey = "com.comment_translator.gate1.run";
const cliImageReferences = Object.freeze([
  disposableDatabaseImage,
  "public.ecr.aws/supabase/gotrue:v2.192.0",
  "public.ecr.aws/supabase/realtime:v2.112.1",
  "public.ecr.aws/supabase/storage-api:v1.61.7",
  "public.ecr.aws/supabase/mailpit:v1.30.2",
  "public.ecr.aws/supabase/postgrest:v14.14",
  "public.ecr.aws/supabase/postgres-meta:v0.96.6",
  "public.ecr.aws/supabase/logflare:1.45.6"
]);
const localObjectRole = "postgres";
const localAdminRole = "supabase_admin";
const unverifiedDefinitionDriftObservation = "UNVERIFIED_UNTIL_LOCAL_REPLAY";
const database = `gate1_ct_paid_v1_a3_${process.pid}_${Date.now().toString(36)}`;
let container = "";
let disposableRuntime = null;
let disposableRuntimeResources = {
  container: "",
  network: "",
  volume: ""
};
let verifiedDockerTransport = null;
let terminationUnknown = false;
let cliStartAttemptedProjects = new Set();
let cliCachedImageInventory = null;
// Preview acceptance uses the same bundled Go binary as the approved native
// linked list/dry-run, rather than treating equal version text as binary identity.
let localCliProfile = process.argv.includes("--local-cli=pinned-go") ? "preview-pinned-go" : "bundled-entrypoint";
const bundledGoCliPath = path.join(root, "node_modules", "@supabase", "cli-windows-x64", "bin", "supabase-go.exe");
// Fixed approved setup location; never accept an executable path from the environment.
const previewGoCliPath = fs.existsSync(bundledGoCliPath)
  ? bundledGoCliPath
  : path.join(root, ".tmp", "tools", "supabase-2.109.0", "supabase-go.exe");
const previewGoCliSha256 = "59cd06ac674fdf5d6add75206408ada0a24b1dcb796d099c13b1f2aaf3f463f0";

function latchTerminationUnknown() {
  terminationUnknown = true;
  verifiedDockerTransport = null;
}

function terminationUnknownResult() {
  return {
    status: null,
    exitCode: 1,
    signal: "NONE",
    stdout: "",
    stderr: "",
    errorCode: "CLI_TERMINATION_UNKNOWN",
    error: { code: "CLI_TERMINATION_UNKNOWN" },
    terminationConfirmed: false,
    terminationUnknown: true,
    timedOut: false,
    preSpawnFailure: false,
    captureFailure: false,
    cliDiagnostics: emptyCliRunnerDiagnostics("RUNNER")
  };
}

const processEssentialEnvironmentKeys = Object.freeze([
  "PATH",
  "SystemRoot",
  "WINDIR",
  "ComSpec",
  "TEMP",
  "TMP",
  "HOME",
  "USERPROFILE"
]);
const rejectedInheritedEnvironmentKeys = new Set([
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_CONFIG",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
  "SUPABASE_CLI_BINARY_OVERRIDE"
]);

const highConfidenceSecretPattern = /(?:postgres(?:ql)?:\/\/|sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|authorization\s*:|bearer\s+)/i;
const topLevelStatementPattern = /^(create|alter|drop|grant|revoke|comment|insert|update|delete|truncate|do|set|begin|commit)\b/i;
const functionStartPattern = /^create\s+(?:or\s+replace\s+)?function\b/i;
const dollarTagPattern = /\$[A-Za-z_0-9]*\$/g;
let queryJsonCall = 0;

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizedJsonSha256(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(sortKeysDeep(value)), "utf8"));
}

function md5Bytes(value) {
  return crypto.createHash("md5").update(value).digest("hex");
}

function generatedNonce() {
  return crypto.randomBytes(12).toString("hex");
}

function generatedRunLabel() {
  return `gate1-ct-paid-v1-a3-${generatedNonce()}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function canonicalSourceBytes(filePath) {
  const stat = fs.lstatSync(filePath);
  assert.equal(stat.isSymbolicLink(), false, "local source input is not a symlink");
  const source = fs.readFileSync(filePath, "utf8");
  return Buffer.from(source.replace(/\r\n?/g, "\n"), "utf8");
}

function canonicalMigrationBytes(fileName) {
  assert.match(fileName, /^\d{14}_[a-z0-9_]+\.sql$/, "migration source filename");
  return canonicalSourceBytes(path.join(migrationsRoot, fileName));
}

function environmentValue(key) {
  const entry = Object.keys(process.env).find((candidate) => candidate.toUpperCase() === key.toUpperCase());
  return entry ? process.env[entry] : undefined;
}

function inheritedDockerOverrides() {
  return [...rejectedInheritedEnvironmentKeys].filter((key) => {
    const value = environmentValue(key);
    return typeof value === "string" && value.trim().length > 0;
  });
}

function buildWindowsEssentialEnvironment(endpoint = undefined) {
  const environment = {};
  for (const key of processEssentialEnvironmentKeys) {
    const value = environmentValue(key);
    if (typeof value === "string" && value.length > 0) environment[key] = value;
  }
  const inheritedPath = environmentValue("PATH");
  const pathEntries = [path.dirname(dockerCli), inheritedPath].filter((value) => typeof value === "string" && value.length > 0);
  if (pathEntries.length > 0) environment.PATH = [...new Set(pathEntries)].join(path.delimiter);
  for (const key of rejectedInheritedEnvironmentKeys) delete environment[key];
  if (endpoint) environment.DOCKER_HOST = endpoint;
  return environment;
}

function completeNativeCapture(result) {
  const stdout = typeof result?.stdout === "string" ? result.stdout : "";
  const stderr = typeof result?.stderr === "string" ? result.stderr : "";
  return !result?.error
    && !result?.signal
    && typeof result?.status === "number"
    && typeof result?.stdout === "string"
    && typeof result?.stderr === "string"
    && Buffer.byteLength(stdout, "utf8") + Buffer.byteLength(stderr, "utf8") <= dockerMaxBufferBytes;
}

function inspectDockerContext(environment) {
  if (terminationUnknown) return { ok: false, reason: "CLI_TERMINATION_UNKNOWN" };
  let result;
  try {
    result = spawnSync(dockerCli, [
      "context",
      "inspect",
      dockerContextName,
      "--format",
      "{{json .Endpoints}}"
    ], {
      cwd: root,
      env: environment,
      encoding: "utf8",
      maxBuffer: dockerMaxBufferBytes,
      timeout: dockerControlTimeoutMs,
      windowsHide: true,
      shell: false
    });
  } catch {
    return { ok: false, reason: "DOCKER_CONTEXT_INVALID" };
  }
  if (!completeNativeCapture(result)) {
    if (result?.error || result?.signal || typeof result?.status !== "number") latchTerminationUnknown();
    return { ok: false, reason: "DOCKER_CONTEXT_INVALID" };
  }
  if (result.status !== 0 || result.stderr.trim() !== "") {
    return { ok: false, reason: "DOCKER_CONTEXT_INVALID" };
  }
  let endpoint;
  try {
    endpoint = JSON.parse(result.stdout.trim())?.docker?.Host;
  } catch {
    return { ok: false, reason: "DOCKER_CONTEXT_INVALID" };
  }
  if (endpoint !== dockerEndpoint) return { ok: false, reason: "DOCKER_CONTEXT_REMOTE" };
  return { ok: true, contextName: dockerContextName, endpoint };
}

function verifiedDockerTransportOrNull() {
  if (terminationUnknown) return null;
  if (inheritedDockerOverrides().length > 0) return null;
  if (verifiedDockerTransport) return verifiedDockerTransport;
  const environment = buildWindowsEssentialEnvironment();
  const context = inspectDockerContext(environment);
  if (!context.ok) return null;
  verifiedDockerTransport = {
    contextName: context.contextName,
    endpoint: context.endpoint,
    environment: buildWindowsEssentialEnvironment(context.endpoint)
  };
  return verifiedDockerTransport;
}

function runNativeDocker(args, input = undefined, { discardOutput = false, environment = undefined, captureByteLimit = dockerMaxBufferBytes } = {}) {
  if (!Number.isSafeInteger(captureByteLimit) || captureByteLimit < 1 || captureByteLimit > dockerMaxBufferBytes) {
    throw new Error("DOCKER_CAPTURE_LIMIT_INVALID");
  }
  if (terminationUnknown) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "",
      signal: "NONE",
      errorCode: "CLI_TERMINATION_UNKNOWN",
      terminationUnknown: true
    };
  }
  const transport = verifiedDockerTransportOrNull();
  if (!transport) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "",
      signal: "NONE",
      errorCode: "DOCKER_TRANSPORT_UNAVAILABLE"
    };
  }
  let result;
  try {
    result = spawnSync(dockerCli, args, {
      cwd: root,
      env: environment ?? transport.environment,
      input,
      encoding: "utf8",
      maxBuffer: captureByteLimit,
      timeout: dockerControlTimeoutMs,
      windowsHide: true,
      shell: false,
      ...(discardOutput ? { stdio: ["pipe", "ignore", "ignore"] } : {})
    });
  } catch {
    latchTerminationUnknown();
    return {
      exitCode: 1,
      stdout: "",
      stderr: "",
      signal: "NONE",
      errorCode: "DOCKER_PROCESS_ERROR",
      terminationUnknown: true,
      captureFailure: true
    };
  }
  const captureComplete = discardOutput
    ? !result?.error && !result?.signal && typeof result?.status === "number"
    : completeNativeCapture(result);
  if (!captureComplete && !result?.preSpawnFailure) latchTerminationUnknown();
  const exitCode = captureComplete && typeof result.status === "number" ? result.status : 1;
  return {
    exitCode,
    stdout: discardOutput ? "" : (typeof result.stdout === "string" ? result.stdout : ""),
    stderr: discardOutput ? "" : (typeof result.stderr === "string" ? result.stderr : ""),
    signal: result.signal ?? "NONE",
    errorCode: result.error?.code && /^[A-Z0-9_-]{1,64}$/.test(result.error.code)
      ? result.error.code
      : "NONE",
    terminationUnknown: !captureComplete && !result?.preSpawnFailure,
    captureFailure: !captureComplete
  };
}

function runDocker(args, input = undefined, options = {}) {
  const result = runNativeDocker(args, input, options);
  return {
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    signal: result.signal,
    errorCode: result.errorCode,
    terminationUnknown: result.terminationUnknown === true || terminationUnknown,
    captureFailure: result.captureFailure === true
  };
}

function dockerInspectCommand(kind, name) {
  if (kind === "container") return ["container", "inspect", name, "--format", "{{json .}}"];
  if (kind === "network") return ["network", "inspect", name, "--format", "{{json .}}"];
  if (kind === "volume") return ["volume", "inspect", name, "--format", "{{json .}}"];
  throw new Error("DOCKER_RESOURCE_KIND_INVALID");
}

function parseDockerInspectResult(result) {
  if (!result || result.terminationUnknown === true || (result.signal && result.signal !== "NONE")) return null;
  if (result.exitCode !== 0) return null;
  try {
    const parsed = JSON.parse(String(result.stdout ?? "").trim());
    return Array.isArray(parsed) ? parsed[0] ?? null : parsed;
  } catch {
    return null;
  }
}

function inspectDockerResource(kind, name) {
  if (terminationUnknown) return { status: "UNKNOWN", code: "CLI_TERMINATION_UNKNOWN" };
  const result = runDocker(dockerInspectCommand(kind, name));
  if (result.terminationUnknown === true || (result.signal && result.signal !== "NONE")) {
    return { status: "UNKNOWN", code: result.errorCode || "DOCKER_INSPECTION_UNKNOWN" };
  }
  if (result.captureFailure === true || result.exitCode !== 0) return { status: "UNKNOWN", code: "DOCKER_INSPECTION_FAILED" };
  const value = parseDockerInspectResult(result);
  return value ? { status: "PRESENT", value } : { status: "UNKNOWN", code: "DOCKER_INSPECTION_INCOMPLETE" };
}

function dockerResourceListCommand(kind, name = "") {
  const filter = name ? ["--filter", `name=${name}`] : [];
  if (kind === "container") return ["ps", "-a", ...filter, "--format", "{{json .}}"];
  if (kind === "network") return ["network", "ls", ...filter, "--format", "{{json .}}"];
  if (kind === "volume") return ["volume", "ls", ...filter, "--format", "{{json .}}"];
  throw new Error("DOCKER_RESOURCE_KIND_INVALID");
}

function resourceListIdentity(kind, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  if (kind === "container") {
    const id = typeof value.ID === "string" ? value.ID : typeof value.Id === "string" ? value.Id : "";
    const names = typeof value.Names === "string" ? value.Names : "";
    return id && names ? id : "";
  }
  if (kind === "network") {
    const id = typeof value.ID === "string" ? value.ID : typeof value.Id === "string" ? value.Id : "";
    const name = typeof value.Name === "string" ? value.Name : "";
    return id && name ? id : "";
  }
  if (kind === "volume") return typeof value.Name === "string" && value.Name.length > 0 ? value.Name : "";
  return "";
}

function resourceListName(kind, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  if (kind === "container") return typeof value.Names === "string" ? value.Names.replace(/^\/+/, "") : "";
  return typeof value.Name === "string" ? value.Name : "";
}

function listDockerResourceRows(kind, plannedName = "") {
  if (terminationUnknown) return { status: "UNKNOWN", code: "CLI_TERMINATION_UNKNOWN" };
  const result = runDocker(dockerResourceListCommand(kind, plannedName));
  if (result.terminationUnknown === true || result.captureFailure === true || (result.signal && result.signal !== "NONE")) {
    return { status: "UNKNOWN", code: result.errorCode || "DOCKER_RESOURCE_LIST_UNKNOWN" };
  }
  if (result.exitCode !== 0 || typeof result.stdout !== "string") {
    return { status: "UNKNOWN", code: result.errorCode || "DOCKER_RESOURCE_LIST_FAILED" };
  }
  const rows = parseDockerJsonLines(result.stdout, kind);
  if (!rows) return { status: "UNKNOWN", code: "DOCKER_RESOURCE_LIST_INCOMPLETE" };
  return { status: "PASS", rows };
}

function imageInspection(reference, options) {
  const requireEmptyConfigVolumes = options?.requireEmptyConfigVolumes === true;
  if (terminationUnknown) return { status: "UNKNOWN", code: "CLI_TERMINATION_UNKNOWN" };
  const result = runDocker(["image", "inspect", reference, "--format", "{{json .}}"]);
  if (result.terminationUnknown === true || (result.signal && result.signal !== "NONE")) {
    return { status: "UNKNOWN", code: result.errorCode || "DOCKER_IMAGE_INSPECTION_UNKNOWN" };
  }
  if (result.exitCode !== 0) return { status: "ABSENT" };
  const value = parseDockerInspectResult(result);
  const id = typeof value?.Id === "string" ? value.Id : "";
  const repoDigests = Array.isArray(value?.RepoDigests) ? value.RepoDigests.filter((item) => typeof item === "string") : [];
  const repository = reference.replace(/:[^:]+$/, "");
  const digestReference = repoDigests.find((item) => item.startsWith(`${repository}@sha256:`)) ?? "";
  if (!id || !/^sha256:[0-9a-f]{64}$/i.test(id) || !digestReference) {
    return { status: "UNKNOWN", code: "REQUIRED_LOCAL_IMAGE_ID_DIGEST_UNAVAILABLE" };
  }
  if (requireEmptyConfigVolumes) {
    const config = value?.Config;
    const isPlainObject = (candidate) => {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
      const prototype = Object.getPrototypeOf(candidate);
      return prototype === Object.prototype || prototype === null;
    };
    if (!isPlainObject(config)) {
      return { status: "UNKNOWN", code: "DIRECT_PG_CONFIG_INVALID" };
    }
    const volumes = config.Volumes;
    if (volumes !== undefined && volumes !== null
      && (!isPlainObject(volumes) || Object.keys(volumes).length !== 0)) {
      return { status: "UNKNOWN", code: "DIRECT_PG_CONFIG_VOLUMES_INVALID" };
    }
  }
  return {
    status: "PASS",
    reference,
    id,
    digest: digestReference.slice(digestReference.indexOf("@") + 1),
    repoDigest: digestReference
  };
}

function resourceLabels(value) {
  return value?.Config?.Labels ?? value?.Labels ?? {};
}

function containerName(value) {
  return typeof value?.Name === "string" ? value.Name.replace(/^\//, "") : "";
}

function inspectOwnedDirectResource(resource) {
  const plannedName = resource?.plannedName ?? resource?.verifiedName ?? "";
  if (!plannedName) return { status: "ABSENT" };
  const listed = listDockerResourceRows(resource.kind, plannedName);
  if (listed.status !== "PASS") return listed;
  const exact = listed.rows.find((row) => resourceListName(resource.kind, row) === plannedName);
  if (!exact) return { status: "ABSENT" };
  const inspected = inspectDockerResource(resource.kind, plannedName);
  if (inspected.status !== "PRESENT") return inspected;
  const value = inspected.value;
  const labels = resourceLabels(value);
  if (labels[directResourceLabelKey] !== resource.runLabel) {
    return { status: "MISMATCH", code: "DIRECT_RESOURCE_LABEL_MISMATCH" };
  }
  if (resource.kind === "container") {
    const mount = Array.isArray(value.Mounts)
      ? value.Mounts.find((entry) => entry?.Name === resource.volumeName || entry?.Source === resource.volumeName)
      : null;
    const configuredBinds = Array.isArray(value?.HostConfig?.Binds) ? value.HostConfig.Binds : [];
    const configuredMount = configuredBinds.some((bind) => {
      const [source, destination] = String(bind).split(":");
      return source === resource.volumeName && destination === resource.mountTarget;
    });
    const networks = value?.NetworkSettings?.Networks ?? {};
    const configuredNetwork = value?.HostConfig?.NetworkMode === resource.networkName;
    const imageIdentity = value?.Image ?? "";
    const configuredImage = value?.Config?.Image ?? "";
    if (!imageIdentity || imageIdentity !== resource.imageId || configuredImage !== resource.imageReference) {
      return { status: "MISMATCH", code: "DIRECT_RESOURCE_IMAGE_MISMATCH" };
    }
    if ((!mount || mount.Destination !== resource.mountTarget) && !configuredMount) {
      return { status: "MISMATCH", code: "DIRECT_RESOURCE_MOUNT_MISMATCH" };
    }
    if (!networks[resource.networkName] && !configuredNetwork) {
      return { status: "MISMATCH", code: "DIRECT_RESOURCE_MOUNT_NETWORK_MISMATCH" };
    }
    const observedId = typeof value.Id === "string" && value.Id.length > 0 ? value.Id : "";
    if (!observedId || !containerName(value) || containerName(value) !== plannedName) {
      return { status: "MISMATCH", code: "DIRECT_RESOURCE_ID_MISSING" };
    }
    if (resource.observedId && resource.observedId !== observedId) {
      return { status: "MISMATCH", code: "DIRECT_RESOURCE_ID_CHANGED" };
    }
    return { status: "OWNED", verifiedName: plannedName, observedId, value };
  }
  if (typeof value.Name !== "string" || value.Name !== plannedName) {
    return { status: "MISMATCH", code: "DIRECT_RESOURCE_NAME_MISMATCH" };
  }
  if (resource.kind === "network") {
    const observedId = typeof value.Id === "string" && value.Id.length > 0 ? value.Id : "";
    if (!observedId) return { status: "MISMATCH", code: "DIRECT_RESOURCE_ID_MISSING" };
    if (resource.observedId && resource.observedId !== observedId) {
      return { status: "MISMATCH", code: "DIRECT_RESOURCE_ID_CHANGED" };
    }
    return { status: "OWNED", verifiedName: plannedName, observedId, value };
  }
  return { status: "OWNED", verifiedName: plannedName, observedId: plannedName, value };
}

function removeOwnedDirectResource(resource, inspected) {
  if (terminationUnknown) return { exitCode: 1, errorCode: "CLI_TERMINATION_UNKNOWN", terminationUnknown: true };
  if (!inspected || inspected.status !== "OWNED") return { exitCode: 1, errorCode: "RESOURCE_OWNERSHIP_UNVERIFIED" };
  const target = resource.kind === "container" || resource.kind === "network"
    ? inspected.observedId
    : inspected.verifiedName;
  if (!target) return { exitCode: 1, errorCode: "RESOURCE_ID_UNAVAILABLE" };
  const args = resource.kind === "container"
    ? ["rm", "-f", target]
    : resource.kind === "network"
      ? ["network", "rm", target]
      : ["volume", "rm", target];
  return runDocker(args);
}

function directResourceNames(runLabel) {
  return {
    container: `${runLabel}-db`,
    network: `${runLabel}-net`,
    volume: `${runLabel}-volume`
  };
}

function localSleep(milliseconds) {
  const waitArray = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(waitArray, 0, 0, milliseconds);
}

function createDisposableDatabaseRuntime() {
  disposableRuntimeResources = {
    container: "",
    network: "",
    volume: ""
  };
  if (process.env.GATE1_LOCAL_CONTAINER || process.env.GATE1_LOCAL_DATABASE) {
    return { status: "SETUP_BLOCKED", reason: "EXISTING_RUNTIME_REUSE_REJECTED" };
  }

  const inspectedImage = imageInspection(disposableDatabaseImage, { requireEmptyConfigVolumes: true });
  if (inspectedImage.status !== "PASS") {
    return { status: "SETUP_BLOCKED", reason: inspectedImage.code ?? "REQUIRED_LOCAL_IMAGE_UNAVAILABLE" };
  }
  const imageReference = inspectedImage.repoDigest;
  const runLabel = generatedRunLabel();
  const resourceNames = directResourceNames(runLabel);
  const metadata = {
    container: {
      kind: "container",
      plannedName: resourceNames.container,
      verifiedName: "",
      observedId: "",
      runLabel,
      imageReference,
      imageId: inspectedImage.id,
      imageDigest: inspectedImage.digest,
      networkName: resourceNames.network,
      volumeName: resourceNames.volume,
      mountTarget: "/var/lib/postgresql/data"
    },
    network: {
      kind: "network",
      plannedName: resourceNames.network,
      verifiedName: "",
      observedId: "",
      runLabel
    },
    volume: {
      kind: "volume",
      plannedName: resourceNames.volume,
      verifiedName: "",
      observedId: "",
      runLabel
    }
  };
  const precreate = (kind) => {
    const resource = metadata[kind];
    const before = inspectOwnedDirectResource(resource);
    if (before.status !== "ABSENT") {
      return { status: "SETUP_BLOCKED", reason: before.code ?? `DISPOSABLE_${kind.toUpperCase()}_NAME_NOT_ABSENT` };
    }
    return null;
  };
  const registerReadback = (kind, createResult, reason) => {
    const resource = metadata[kind];
    const after = inspectOwnedDirectResource(resource);
    if (after.status === "OWNED") {
      resource.verifiedName = after.verifiedName;
      resource.observedId = after.observedId;
      resource.ownershipVerified = true;
    } else if (after.status === "ABSENT") {
      resource.knownAbsent = true;
      resource.verifiedName = "";
    }
    if (createResult.exitCode !== 0 || after.status !== "OWNED") {
      return {
        status: "SETUP_BLOCKED",
        reason: after.status === "UNKNOWN" || after.status === "MISMATCH"
          ? (after.code ?? "DISPOSABLE_RESOURCE_OWNERSHIP_UNVERIFIED")
          : reason
      };
    }
    return null;
  };
  let blocked = precreate("network");
  if (blocked) return blocked;
  metadata.network.attempted = true;
  disposableRuntimeResources.network = metadata.network;
  const network = runDocker([
    "network", "create",
    "--label", `${directResourceLabelKey}=${runLabel}`,
    resourceNames.network
  ]);
  blocked = registerReadback("network", network, "DISPOSABLE_NETWORK_CREATE_FAILED");
  if (blocked) return blocked;

  blocked = precreate("volume");
  if (blocked) return blocked;
  metadata.volume.attempted = true;
  disposableRuntimeResources.volume = metadata.volume;
  const volume = runDocker([
    "volume", "create",
    "--label", `${directResourceLabelKey}=${runLabel}`,
    resourceNames.volume
  ]);
  blocked = registerReadback("volume", volume, "DISPOSABLE_VOLUME_CREATE_FAILED");
  if (blocked) return blocked;

  blocked = precreate("container");
  if (blocked) return blocked;
  const password = crypto.randomBytes(32).toString("base64url");
  const passwordEnvironment = {
    ...verifiedDockerTransport?.environment,
    POSTGRES_PASSWORD: password
  };
  metadata.container.attempted = true;
  disposableRuntimeResources.container = metadata.container;
  const started = runDocker([
    "run",
    "--detach",
    "--pull=never",
    "--name", resourceNames.container,
    "--label", `${directResourceLabelKey}=${runLabel}`,
    "--network", resourceNames.network,
    "--volume", `${resourceNames.volume}:/var/lib/postgresql/data`,
    "--env", "POSTGRES_PASSWORD",
    "--env", "POSTGRES_DB=postgres",
    imageReference
  ], undefined, { environment: passwordEnvironment });
  blocked = registerReadback("container", started, "DISPOSABLE_DATABASE_START_FAILED");
  if (blocked) return blocked;

  container = resourceNames.container;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = runDocker(["exec", container, "pg_isready", "--host=127.0.0.1", "--port=5432", "--username=postgres", "--dbname=postgres"]);
    if (ready.exitCode === 0) {
      disposableRuntime = {
        status: "PASS",
        image: "PINNED_LOCAL_REPO_DIGEST",
        imageDigest: inspectedImage.digest,
        container: "UNIQUE_GENERATED",
        network: "UNIQUE_GENERATED",
        volume: "UNIQUE_GENERATED"
      };
      return disposableRuntime;
    }
    localSleep(500);
  }
  return { status: "SETUP_BLOCKED", reason: "DISPOSABLE_DATABASE_NOT_READY" };
}

function classifyPsqlFailure(result) {
  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (output.includes("syntax error")) return "SYNTAX_ERROR";
  if (output.includes("column") && output.includes("does not exist")) return "MISSING_COLUMN";
  if (output.includes("schema") && output.includes("does not exist")) return "MISSING_SCHEMA";
  if (output.includes("relation") && output.includes("does not exist")) {
    const relation = output.match(/relation\s+"([^"]+)"/)?.[1] ?? "";
    const relationHash = sha256Bytes(Buffer.from(relation, "utf8")).slice(0, 16);
    if (relation.startsWith("auth.")) return `MISSING_AUTH_RELATION_${relationHash}`;
    if (relation.startsWith("cron.")) return `MISSING_CRON_RELATION_${relationHash}`;
    if (relation.startsWith("extensions.")) return `MISSING_EXTENSION_RELATION_${relationHash}`;
    if (relation.includes("usage_events")) return `MISSING_PUBLIC_USAGE_EVENTS_${relationHash}`;
    if (relation.includes("usage_counters")) return `MISSING_PUBLIC_USAGE_COUNTERS_${relationHash}`;
    if (relation.includes("entitlements")) return `MISSING_PUBLIC_ENTITLEMENTS_${relationHash}`;
    if (relation.startsWith("public.")) return `MISSING_PUBLIC_RELATION_${relationHash}`;
    return `MISSING_RELATION_${relationHash}`;
  }
  if (output.includes("function") && output.includes("does not exist")) return "MISSING_FUNCTION";
  if (output.includes("type") && output.includes("does not exist")) return "MISSING_TYPE";
  if (output.includes("does not exist")) return "MISSING_OBJECT";
  if (output.includes("already exists")) return "DUPLICATE_OBJECT";
  if (output.includes("permission denied")) return "PERMISSION_DENIED";
  if (output.includes("connection")) return "CONNECTION_ERROR";
  if (output.includes("gate 1")) return "BRIDGE_ASSERTION";
  return "PSQL_EXIT";
}

function psql(databaseName, sql, options = {}) {
  const username = options.username ?? localObjectRole;
  const args = [
    "exec",
    "--interactive",
    container,
    "psql",
    "--no-psqlrc",
    "--quiet",
    "--set=ON_ERROR_STOP=1",
    `--username=${username}`,
    "--dbname",
    databaseName
  ];
  if (options.singleTransaction) args.push("--single-transaction");
  if (options.query) args.push("--tuples-only", "--no-align", "--command", sql);
  else return runDocker(args, sql);
  return runDocker(args);
}

function query(databaseName, sql) {
  const result = psql(databaseName, sql, { query: true });
  if (result.exitCode !== 0) throw new Error(`PSQL_QUERY_FAIL:${classifyPsqlFailure(result)}`);
  return result.stdout.trim();
}

function queryJson(databaseName, sql) {
  const callNumber = ++queryJsonCall;
  const value = query(databaseName, sql);
  assert.notEqual(value, "", "local query returned a value");
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`PSQL_QUERY_SHAPE_CALL_${callNumber}`);
  }
}

function assertLocalPsql(databaseName, sql, label) {
  const result = psql(databaseName, sql);
  if (result.exitCode !== 0) throw new Error(`${label}:${classifyPsqlFailure(result)}`);
  return result;
}

function assertLocalPsqlAsRole(databaseName, sql, label, username) {
  const result = psql(databaseName, sql, { username });
  if (result.exitCode !== 0) throw new Error(`${label}:${classifyPsqlFailure(result)}`);
  return result;
}

function validateR13Artifact() {
  const stat = fs.lstatSync(r13ArtifactPath);
  assert.equal(stat.isSymbolicLink(), false, "r13 artifact is not a symlink");
  const bytes = fs.readFileSync(r13ArtifactPath);
  assert.equal(sha256Bytes(bytes), expectedR13Sha256, "r13 artifact SHA-256");
  const artifact = JSON.parse(bytes.toString("utf8"));
  const strictReadback = assertCatalogReadbackArtifact(artifact, "preview");
  assert.equal(strictReadback.valid, true, `r13 strict readback: ${strictReadback.missing.join(",")}`);
  assert.equal(artifact.schemaVersion, 1);
  assert.equal(artifact.target, "preview");
  assert.equal(artifact.readOnly.transactionReadOnly, "on");
  assert.equal(artifact.readOnly.defaultTransactionReadOnly, "on");
  assert.equal(artifact.readOnly.transactionIsolation, "repeatable read");
  assert.equal(artifact.canonical.tables.length, 33);
  assert.equal(artifact.canonical.functions.length, 81);
  assert.equal(artifact.canonical.triggers.length, 16);
  assert.equal(artifact.canonicalRpc.functions.length, 81);
  assert.equal(artifact.history.count, 30);
  assert.equal(artifact.history.targetRows, 0);
  assert.equal(artifact.history.targetMatches, 0);
  for (const row of artifact.canonical.functions) {
    assert.deepEqual(Object.keys(row).sort(), [
      "acls",
      "config",
      "definitionMd5",
      "identityArguments",
      "name",
      "owner",
      "resultType",
      "schema",
      "securityDefiner"
    ]);
  }
  const structural = projectCanonicalStructuralState(artifact.canonical);
  const observation = {
    sourceArtifactSha256: expectedR13Sha256,
    rows: artifact.canonical.tables
      .map(({ schema, name, rowCount }) => ({ schema, name, rowCount }))
      .sort((left, right) => `${left.schema}.${left.name}`.localeCompare(`${right.schema}.${right.name}`)),
    aggregateSha256: ""
  };
  observation.aggregateSha256 = computeObjectDigest(observation);
  assertCanonicalObservationAgainstStructure(observation, structural, expectedR13Sha256);
  return {
    sha256: expectedR13Sha256,
    bytes: bytes.length,
    canonicalTables: artifact.canonical.tables.length,
    canonicalFunctions: artifact.canonical.functions.length,
    canonicalTriggers: artifact.canonical.triggers.length,
    dependencyFields: Object.keys(artifact.canonical.dependencyCounts).length,
    strictReadback: "PASS",
    derivedSchemaVersion: 2,
    canonicalStructuralTableCount: structural.tables.length,
    canonicalObservationRowCount: observation.rows.length,
    canonicalObservationAggregateSha256: observation.aggregateSha256
  };
}

function validateProductionArtifactBoundary() {
  const artifact = readJson(r3ProductionArtifactPath);
  assert.equal(artifact.target, "production");
  assert.equal(Object.prototype.hasOwnProperty.call(artifact, "canonical"), false, "production canonical wrapper remains explicitly incomplete");
  assert.equal(artifact.paidLegacy.tables.length, 3);
  assert.equal(artifact.paidLegacy.functions.length, 3);
  assert.equal(artifact.paidLegacy.triggers.length, 1);
  assert.equal(artifact.sourceEra.tables.length, 6);
  assert.equal(artifact.sourceEra.functions.length, 7);
  return { canonicalWrapper: "MISSING_BY_ARTIFACT", paidLegacyTables: 3, sourceEraFunctions: 7 };
}

function validateLegacyInputs() {
  assert.ok(legacyDir, "GATE1_LEGACY_SQL_DIR is supplied in the task process");
  const history = readJson(historyFixturePath);
  const expectedByFile = new Map(
    history.rows
      .filter((row) => legacyVersions.has(row.version))
      .map((row) => [`${row.version}_${row.name}.sql`, row])
  );
  assert.equal(expectedByFile.size, 4);
  const entries = fs.readdirSync(legacyDir, { withFileTypes: true });
  assert.equal(entries.length, 4, "legacy directory contains exactly four entries");
  assert.equal(entries.every((entry) => entry.isFile() && !entry.isSymbolicLink()), true, "legacy directory has four regular non-symlink files");
  const rows = legacyFiles.map((fileName) => {
    const expected = expectedByFile.get(fileName);
    assert.ok(expected, `approved history row exists for ${fileName}`);
    const filePath = path.join(legacyDir, fileName);
    const stat = fs.lstatSync(filePath);
    assert.equal(stat.isSymbolicLink(), false);
    const bytes = fs.readFileSync(filePath);
    assert.equal(bytes.length, expected.sqlBytes, `${fileName} bytes`);
    assert.equal(md5Bytes(bytes), expected.statementsMd5, `${fileName} MD5`);
    assert.equal(highConfidenceSecretPattern.test(bytes.toString("utf8")), false, `${fileName} secret scan`);
    return { fileName, bytes: bytes.length, md5: expected.statementsMd5, recordedStatementCount: expected.statementCount };
  });
  return rows;
}

function scanDollarTags(line) {
  return line.match(dollarTagPattern) ?? [];
}

// The acquisition contract deliberately writes statements.join("\n\n") + "\n"
// without adding terminators. This parser only reconstructs executable boundaries
// in memory; it never rewrites the approved files or changes their digests.
function splitRecoveredSql(source) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const statements = [];
  let current = [];
  let currentKind = null;
  let protectedBlock = false;
  let dollarTag = null;

  function finish() {
    const text = current.join("\n").trim();
    if (text) statements.push(text.endsWith(";") ? text : `${text};`);
    current = [];
    currentKind = null;
  }

  function consumeDollarTags(line) {
    const wasInsideDollarQuote = dollarTag !== null;
    for (const tag of scanDollarTags(line)) {
      if (dollarTag === null) dollarTag = tag;
      else if (dollarTag === tag) dollarTag = null;
    }
    if (protectedBlock && wasInsideDollarQuote && dollarTag === null) protectedBlock = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const columnZero = line.length === line.trimStart().length;
    const candidate = columnZero && topLevelStatementPattern.test(trimmed);
    const candidateKind = candidate ? trimmed.match(topLevelStatementPattern)[1].toUpperCase() : null;

    if (protectedBlock) {
      current.push(line);
      consumeDollarTags(line);
      continue;
    }

    if (current.length > 0 && candidate && candidateKind !== "SELECT" && candidateKind !== "WITH") {
      finish();
    }

    if (candidate && current.length === 0) {
      currentKind = candidateKind;
      current.push(line);
      if (functionStartPattern.test(trimmed) || candidateKind === "DO") {
        protectedBlock = true;
        consumeDollarTags(line);
      }
      continue;
    }

    if (current.length === 0 && trimmed === "") continue;
    current.push(line);
  }
  finish();
  return statements;
}

function localBootstrapSql() {
  return [
    "create schema if not exists auth",
    "create table if not exists auth.users (id uuid primary key)",
    "create schema if not exists extensions",
    "create schema if not exists cron",
    "create table if not exists cron.job (jobid bigint generated by default as identity primary key, schedule text not null, command text not null, nodatabase text, username text, active boolean not null default true, jobname text)"
  ].join(";\n") + ";\n";
}

function localExtensionBootstrapSql({ includePgNet = false } = {}) {
  const statements = ["create extension if not exists pgcrypto"];
  if (includePgNet) statements.push("create extension if not exists pg_net with schema extensions");
  return `${statements.join(";\n")};\n`;
}

function waitForLocalDatabase(databaseName, label) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      if (query(databaseName, "select 1") === "1") return;
    } catch (error) {
      if (errorClass(error) !== "CONNECTION_ERROR" || attempt === 9) {
        throw new Error(`${label}:${errorClass(error)}`);
      }
    }
    localSleep(500);
  }
  throw new Error(`${label}:CONNECTION_ERROR`);
}

function bootstrapLocalDatabase(databaseName, bootstrapSql, label, options = {}) {
  waitForLocalDatabase(databaseName, `${label}_DATABASE_READY`);
  assertLocalPsql(databaseName, bootstrapSql, `${label}_BOOTSTRAP`);
  assertLocalPsqlAsRole(
    databaseName,
    localExtensionBootstrapSql(options),
    `${label}_EXTENSIONS`,
    localAdminRole
  );
}

function allocateFreshDatabaseName(suffix) {
  const base = `${database}_${suffix}`.replace(/[^a-z0-9_]/g, "_").slice(0, 55);
  for (let index = 0; index < 100; index += 1) {
    const candidate = `${base}_${String(index + 1).padStart(2, "0")}`;
    const exists = query("postgres", `select exists (select 1 from pg_database where datname = '${candidate}')`);
    if (exists === "f") return candidate;
  }
  throw new Error("FRESH_DATABASE_NAME_UNAVAILABLE");
}

function errorClass(error) {
  return error instanceof Error
    ? error.message.match(/:([A-Z0-9_-]+)$/)?.[1] ?? "PSQL_EXIT"
    : "PSQL_EXIT";
}

function createFreshDatabase(databaseName, label, template = "") {
  assert.match(databaseName, /^[a-z0-9_]+$/, `${label} database identifier`);
  const createSql = `create database ${databaseName}${template ? ` template ${template}` : ""}`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let exists;
    try {
      exists = query("postgres", `select exists (select 1 from pg_database where datname = '${databaseName}')`);
    } catch (error) {
      if (errorClass(error) !== "CONNECTION_ERROR" || attempt === 4) {
        throw new Error(`${label}:${errorClass(error)}`);
      }
      localSleep(500);
      continue;
    }
    if (exists === "t") return databaseName;

    const result = psql("postgres", createSql);
    if (result.exitCode === 0) return databaseName;
    const classification = classifyPsqlFailure(result);
    if (classification !== "CONNECTION_ERROR" || attempt === 4) {
      throw new Error(`${label}:${classification}`);
    }
    localSleep(500);
  }
  throw new Error(`${label}:CONNECTION_ERROR`);
}

function ensureFreshDatabase() {
  const localDatabase = allocateFreshDatabaseName("clean");
  createFreshDatabase(localDatabase, "CREATE_DATABASE");
  bootstrapLocalDatabase(localDatabase, localBootstrapSql(), "CLEAN", { includePgNet: false });
  return localDatabase;
}

function scopedSummary(databaseName) {
  return queryJson(databaseName, `select json_build_object(
    'publicLegacyTables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p') and c.relname in ('comment_translator_paid_entitlements','comment_translator_paid_usage_counters','comment_translator_paid_usage_events')),
    'publicLegacyFunctions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('apply_comment_translator_paid_entitlement_evidence','apply_comment_translator_paid_usage','sync_comment_translator_paid_usage_from_entitlement')),
    'archiveSchemaCount', (select count(*) from pg_namespace where nspname = 'comment_translator_paid_legacy_archive'),
    'archiveTables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'comment_translator_paid_legacy_archive' and c.relkind in ('r','p')),
    'archiveFunctions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'comment_translator_paid_legacy_archive'),
    'archiveTriggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'comment_translator_paid_legacy_archive' and not t.tgisinternal),
    'publicPaidLikeRelations', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p') and c.relname like 'comment_translator_paid_%')
  )`);
}

function runBridge(databaseName) {
  return psql(databaseName, canonicalSourceBytes(bridgePath));
}

function bridgeStateSnapshot(databaseName) {
  const source = fs.readFileSync(bridgePath, "utf8").replace(/\r\n?/g, "\n");
  const start = source.indexOf("\n  with\n  known_tables as");
  const end = source.indexOf("\n  select jsonb_object_agg(scope_name, state)\n  into v_states", start);
  assert.ok(start >= 0 && end > start, "bridge state query boundaries");
  const cte = source.slice(start + 1, end);
  return queryJson(databaseName, `${cte}\nselect jsonb_object_agg(scope_name, state) from states;`);
}

function sqlIdentifier(identifier) {
  assert.match(identifier, /^[a-z0-9_]+$/, "local catalog identifier");
  return `"${identifier}"`;
}

function sqlLiteral(value) {
  assert.equal(typeof value, "string", "local catalog literal is a string");
  return `'${value.replaceAll("'", "''")}'`;
}

function canonicalCountRows(databaseName, tableNames) {
  const selects = tableNames.map((tableName) => [
    "select",
    `${sqlLiteral("public")}::text as schema_name,`,
    `${sqlLiteral(tableName)}::text as table_name,`,
    `(select count(*)::bigint from public.${sqlIdentifier(tableName)}) as row_count`
  ].join(" "));
  return queryJson(databaseName, `select coalesce(jsonb_agg(jsonb_build_object(
    'schema', schema_name,
    'name', table_name,
    'rowCount', row_count
  ) order by schema_name, table_name), '[]'::jsonb) from (${selects.join(" union all ")}) as counts;`);
}

function countRowsTotal(rows) {
  assert.equal(Array.isArray(rows), true, "canonical count rows are an array");
  return rows.reduce((total, row) => total + row.rowCount, 0);
}

function canonicalRowFingerprints(databaseName, tableNames) {
  const selects = tableNames.map((tableName) => [
    "select",
    `${sqlLiteral("public")}::text as schema_name,`,
    `${sqlLiteral(tableName)}::text as table_name,`,
    "count(*)::bigint as row_count,",
    "encode(digest(coalesce(jsonb_agg(to_jsonb(row_data) order by to_jsonb(row_data)::text)::text, '[]'), 'sha256'), 'hex') as row_digest",
    `from public.${sqlIdentifier(tableName)} as row_data`
  ].join(" "));
  return queryJson(databaseName, `select coalesce(jsonb_agg(jsonb_build_object(
    'schema_name', schema_name,
    'table_name', table_name,
    'row_count', row_count,
    'row_digest', row_digest
  ) order by schema_name, table_name), '[]'::jsonb) from (${selects.join(" union all ")}) as fingerprints;`);
}

function canonicalAclRows(state) {
  return [
    ...state.tables.flatMap((table) => table.acls),
    ...state.functions.flatMap((fn) => fn.acls)
  ];
}

function aclRowKey(row) {
  return [row.schema, row.objectKind, row.objectIdentity, row.grantee, row.privilege, row.grantable].join("|");
}

function summarizeAclDifferences(actual, expected) {
  const actualRows = canonicalAclRows(actual);
  const expectedRows = canonicalAclRows(expected);
  const actualKeys = new Set(actualRows.map(aclRowKey));
  const expectedKeys = new Set(expectedRows.map(aclRowKey));
  const describe = (row) => ({
    objectKind: row.objectKind,
    objectIdentitySha256: sha256Bytes(Buffer.from(row.objectIdentity, "utf8")),
    grantee: row.grantee,
    privilege: row.privilege,
    grantable: row.grantable
  });
  return {
    expectedRows: expectedRows.length,
    actualRows: actualRows.length,
    missingRows: expectedRows.filter((row) => !actualKeys.has(aclRowKey(row))).map(describe),
    extraRows: actualRows.filter((row) => !expectedKeys.has(aclRowKey(row))).map(describe)
  };
}

function lineEndingClass(value) {
  const hasCrlf = /\r\n/.test(value);
  const hasBareCr = /\r(?!\n)/.test(value);
  const hasBareLf = /(?<!\r)\n/.test(value);
  if (hasCrlf && !hasBareCr && !hasBareLf) return "CRLF";
  if (!hasCrlf && !hasBareCr && hasBareLf) return "LF";
  if (!hasCrlf && hasBareCr && !hasBareLf) return "CR";
  if (!hasCrlf && !hasBareCr && !hasBareLf) return "NONE";
  return "MIXED";
}

function dollarTagAt(source, offset) {
  return source.slice(offset).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0] ?? null;
}

function extractFunctionDefinitions(source, maskedSource, functionName) {
  const pattern = new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${functionName}\\s*\\(`, "gi");
  const definitions = [];
  for (const match of maskedSource.matchAll(pattern)) {
    const start = match.index;
    let offset = start;
    let dollarTag = null;
    let quote = null;
    let parentheses = 0;
    let lineComment = false;
    let blockComment = false;
    for (; offset < source.length; offset += 1) {
      const character = source[offset];
      const next = source[offset + 1];
      if (lineComment) {
        if (character === "\n") lineComment = false;
        continue;
      }
      if (blockComment) {
        if (character === "*" && next === "/") {
          blockComment = false;
          offset += 1;
        }
        continue;
      }
      if (dollarTag) {
        if (source.startsWith(dollarTag, offset)) {
          offset += dollarTag.length - 1;
          dollarTag = null;
        }
        continue;
      }
      if (quote) {
        if (character === quote && source[offset + 1] === quote) {
          offset += 1;
        } else if (character === quote) {
          quote = null;
        } else if (quote === "'" && character === "\\") {
          offset += 1;
        }
        continue;
      }
      if (character === "-" && next === "-") {
        lineComment = true;
        offset += 1;
        continue;
      }
      if (character === "/" && next === "*") {
        blockComment = true;
        offset += 1;
        continue;
      }
      const tag = character === "$" ? dollarTagAt(source, offset) : null;
      if (tag) {
        dollarTag = tag;
        offset += tag.length - 1;
        continue;
      }
      if (character === "'" || character === '"') {
        quote = character;
        continue;
      }
      if (character === "(") parentheses += 1;
      if (character === ")") parentheses -= 1;
      if (character === ";" && parentheses === 0) {
        definitions.push({ start, end: offset + 1, bytes: Buffer.from(source.slice(start, offset + 1), "utf8") });
        break;
      }
    }
  }
  return definitions;
}

function sourceFunctionDiagnostic(functionName) {
  const candidates = [];
  for (const fileName of fs.readdirSync(migrationsRoot)
    .filter((name) => name.endsWith(".sql") && name !== `${forwardConvergenceMigration}.sql`)
    .sort()) {
    const filePath = path.join(migrationsRoot, fileName);
    const source = fs.readFileSync(filePath, "utf8");
    const maskedSource = maskSql(source);
    const definitions = extractFunctionDefinitions(source, maskedSource, functionName);
    for (const definition of definitions) candidates.push({ fileName, definition });
  }
  const selected = candidates.at(-1);
  if (!selected) return { sourceDefinition: "NOT_FOUND" };
  const relativePath = path.join("supabase", "migrations", selected.fileName).replaceAll("\\", "/");
  const worktreeFile = fs.readFileSync(path.join(migrationsRoot, selected.fileName));
  const gitBlob = spawnSync("git", ["show", `HEAD:${relativePath}`], { encoding: null, maxBuffer: 64 * 1024 * 1024 });
  const gitBytes = gitBlob.status === 0 ? (gitBlob.stdout ?? Buffer.alloc(0)) : Buffer.alloc(0);
  const definitionBytes = selected.definition.bytes;
  const lfDefinitionBytes = Buffer.from(definitionBytes.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
  const gitText = gitBytes.toString("utf8");
  const gitDefinitions = extractFunctionDefinitions(gitText, maskSql(gitText), functionName);
  const gitDefinition = gitDefinitions.at(-1)?.bytes ?? Buffer.alloc(0);
  return {
    sourceFile: selected.fileName,
    sourceDefinitionSha256: sha256Bytes(definitionBytes),
    sourceDefinitionLfSha256: sha256Bytes(lfDefinitionBytes),
    sourceDefinitionBytes: definitionBytes.length,
    sourceDefinitionLineEndings: lineEndingClass(definitionBytes.toString("utf8")),
    worktreeFileSha256: sha256Bytes(worktreeFile),
    gitBlobSha256: sha256Bytes(gitBytes),
    gitDefinitionSha256: sha256Bytes(gitDefinition),
    gitDefinitionBytes: gitDefinition.length,
    gitDefinitionLineEndings: lineEndingClass(gitDefinition.toString("utf8")),
    gitDefinitionAvailable: gitBlob.status === 0
  };
}

const diagnosticFunctionNames = [
  "ct_paid_azure_direct_fallback",
  "ct_paid_checkout_hold_recovery_window_floor",
  "ct_paid_record_provider_hourly_detail",
  "ct_paid_schedule_unbound_checkout_recovery",
  "ct_paid_terminalize_unbound_checkout_hold"
];

function functionIdentitySql(row) {
  assert.match(row.name, /^ct_paid_[a-z0-9_]+$/);
  return `public.${sqlIdentifier(row.name)}(${row.identityArguments})`;
}

function localFunctionDefinitionReadback(databaseName, state, functionName) {
  const row = state.functions.find((candidate) => candidate.name === functionName);
  if (!row) return { actual: "NOT_FOUND" };
  const result = queryJson(databaseName, `select json_build_object(
    'definitionMd5', md5(pg_get_functiondef(p.oid)),
    'definitionSha256', encode(digest(pg_get_functiondef(p.oid), 'sha256'), 'hex')
  ) from pg_proc as p join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = ${sqlLiteral(row.schema)}
    and p.proname = ${sqlLiteral(row.name)}
    and pg_get_function_identity_arguments(p.oid) = ${sqlLiteral(row.identityArguments)};`);
  return result;
}

function diagnoseFunctionDefinitions(databaseName, actual, expected) {
  const preview = readJson(r13ArtifactPath);
  const previewFunctions = preview.canonical.functions;
  return diagnosticFunctionNames.map((functionName) => {
    const expectedRow = expected.functions.find((row) => row.name === functionName);
    const actualRow = actual.functions.find((row) => row.name === functionName);
    const previewRow = previewFunctions.find((row) => row.name === functionName);
    const source = sourceFunctionDiagnostic(functionName);
    const actualReadback = localFunctionDefinitionReadback(databaseName, actual, functionName);
    return {
      functionName,
      identitySha256: expectedRow ? sha256Bytes(Buffer.from(functionIdentitySql(expectedRow), "utf8")) : "NOT_FOUND",
      expectedDefinitionMd5: expectedRow?.definitionMd5 ?? "NOT_FOUND",
      actualDefinitionMd5: actualRow?.definitionMd5 ?? "NOT_FOUND",
      rawDefinitionMd5Match: expectedRow?.definitionMd5 === actualRow?.definitionMd5,
      previewDefinitionMd5: previewRow?.definitionMd5 ?? "NOT_FOUND",
      definitionDriftClassification: actualRow?.definitionMd5 === previewRow?.definitionMd5
        ? "LF_REPLAY_MATCH"
        : "TRUE_DEFINITION_DRIFT",
      actualDefinitionSha256: actualReadback.definitionSha256 ?? "NOT_AVAILABLE",
      actualDefinitionMd5Readback: actualReadback.definitionMd5 ?? "NOT_AVAILABLE",
      ...source,
      lfNormalizedDiagnostic: source.sourceDefinitionLfSha256 === source.gitDefinitionSha256 ? "EQUAL" : "DIFFERENT",
      replayInput: "LF"
    };
  });
}

function assertFiveFunctionDefinitionClassification(diagnostics, expectedTrueDefinitionDriftCount) {
  assert.equal(diagnostics.length, 5, "five definition-drift diagnostics are present");
  assert.equal(Number.isInteger(expectedTrueDefinitionDriftCount), true, "expected true definition-drift count is explicit");
  const matches = diagnostics.filter(({ definitionDriftClassification }) => definitionDriftClassification === "LF_REPLAY_MATCH");
  const drifts = diagnostics.filter(({ definitionDriftClassification }) => definitionDriftClassification === "TRUE_DEFINITION_DRIFT");
  assert.equal(matches.length, 3, "three definition differences are resolved by LF replay");
  assert.equal(drifts.length, expectedTrueDefinitionDriftCount, "true definition differences require forward migration convergence");
  return {
    observationStatus: "VERIFIED_AFTER_LOCAL_REPLAY",
    total: diagnostics.length,
    lfReplayMatches: matches.map(({ functionName }) => functionName),
    trueDefinitionDrifts: drifts.map(({ functionName }) => functionName)
  };
}

function localRoleAndDefaultPrivilegeDiagnostic(databaseName) {
  return queryJson(databaseName, `select json_build_object(
    'roleCount', (select count(*) from pg_roles),
    'postgresRolePresent', exists (select 1 from pg_roles where rolname = 'postgres'),
    'serviceRolePresent', exists (select 1 from pg_roles where rolname = 'service_role'),
    'anonRolePresent', exists (select 1 from pg_roles where rolname = 'anon'),
    'authenticatedRolePresent', exists (select 1 from pg_roles where rolname = 'authenticated'),
    'defaultPrivilegeRowCount', (select count(*) from pg_default_acl),
    'publicDefaultPrivilegeRowCount', (select count(*) from pg_default_acl as defaults join pg_namespace as namespaces on namespaces.oid = defaults.defaclnamespace where namespaces.nspname = 'public')
  );`);
}

function canonicalStateDiffs(actual, expected) {
  const diffs = [];
  function walk(left, right, location) {
    if (typeof left !== typeof right || (left === null) !== (right === null)) {
      diffs.push(location);
      return;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
        diffs.push(`${location}[length]`);
        return;
      }
      for (let index = 0; index < left.length; index += 1) walk(left[index], right[index], `${location}[${index}]`);
      return;
    }
    if (left && typeof left === "object") {
      const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
      for (const key of keys) walk(left[key], right[key], `${location}.${key}`);
      return;
    }
    if (left !== right) diffs.push(location);
  }
  walk(actual, expected, "canonical");
  return diffs;
}

function summarizeCanonicalDiffs(diffs) {
  const classes = {};
  for (const location of diffs) {
    const field = location.endsWith("[length]")
      ? "arrayLength"
      : location.match(/\.(rowCount|definitionMd5|acls|config|owner|securityDefiner|resultType|rlsEnabled)$/)?.[1] ?? "other";
    classes[field] = (classes[field] ?? 0) + 1;
  }
  return { diffCount: diffs.length, diffClasses: classes, firstDiffs: diffs.slice(0, 20) };
}

function canonicalBootstrapSql() {
  return [
    "create schema if not exists auth",
    "create table if not exists auth.users (id uuid primary key)",
    "create or replace function auth.uid() returns uuid language sql stable set search_path = pg_catalog, auth as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$",
    "create schema if not exists extensions",
    "create schema if not exists vault",
    "create table if not exists vault.decrypted_secrets (id uuid, name text, decrypted_secret text)",
    "create schema if not exists cron",
    "create table if not exists cron.job (jobid bigint generated by default as identity primary key, schedule text not null, command text not null, nodatabase text, username text, active boolean not null default true, jobname text)"
  ].join(";\n") + ";\n";
}

function ensureFreshDatabaseNamed(databaseName, bootstrapSql, label, options = {}) {
  createFreshDatabase(databaseName, `CREATE_${label}_DATABASE`, "template0");
  bootstrapLocalDatabase(databaseName, bootstrapSql, label, options);
}

function repositoryMigrationNames({ includeForward = true } = {}) {
  const names = fs.readdirSync(migrationsRoot)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  if (includeForward) return names;
  return names.filter((name) => name !== `${forwardConvergenceMigration}.sql`);
}

function repositoryMigrationNamesBeforeBridge() {
  const names = repositoryMigrationNames();
  const bridgeName = path.basename(bridgePath);
  const bridgeIndex = names.indexOf(bridgeName);
  if (bridgeIndex < 0) throw new Error("BRIDGE_MIGRATION_NOT_IN_REPOSITORY_INVENTORY");
  return names.slice(0, bridgeIndex);
}

function applyRepositoryMigrations(databaseName, { includeForward = true } = {}) {
  const names = repositoryMigrationNames({ includeForward });
  assert.equal(names.length, includeForward ? 56 : 55, `repository migration inventory has ${includeForward ? 56 : 55} files`);
  for (const name of names) {
    const result = psql(databaseName, canonicalMigrationBytes(name), { singleTransaction: true });
    if (result.exitCode !== 0) throw new Error(`CANONICAL_MIGRATION_${name.slice(0, 14)}_${classifyPsqlFailure(result)}`);
  }
  return names.length;
}

function applyForwardConvergenceMigration(databaseName) {
  const migrationName = `${forwardConvergenceMigration}.sql`;
  if (!fs.existsSync(path.join(migrationsRoot, migrationName))) {
    throw new Error("A3_FORWARD_CONVERGENCE_MIGRATION_UNVERIFIED");
  }
  const result = psql(databaseName, canonicalMigrationBytes(migrationName), { singleTransaction: true });
  if (result.exitCode !== 0) throw new Error(`A3_FORWARD_CONVERGENCE_${classifyPsqlFailure(result)}`);
  return migrationName;
}

function runCanonicalCase() {
  const localDatabase = allocateFreshDatabaseName("canonical");
  ensureFreshDatabaseNamed(localDatabase, canonicalBootstrapSql(), "CANONICAL", { includePgNet: true });
  const baselineMigrationCount = applyRepositoryMigrations(localDatabase, { includeForward: false });
  const bridgeStates = readJson(bridgeStatesPath);
  const authority = readJson(canonicalAuthorityPath);
  const expected = bridgeStates.canonical;
  assert.equal(authority.definitionDriftObservation, unverifiedDefinitionDriftObservation);
  assertCanonicalStructuralState(expected);
  assertCanonicalPaidRpcSecurityBoundary(expected, { browserExecuteRoles: authority.browserExecuteRoles });
  assertCanonicalObservationAgainstStructure(
    bridgeStates.canonicalObservation,
    expected,
    expectedR13Sha256
  );
  const baseline = bridgeStateSnapshot(localDatabase).canonical;
  const previewStructural = projectCanonicalStructuralState(readJson(r13ArtifactPath).canonical);
  const observedCountRows = canonicalCountRows(localDatabase, expected.tables.map(({ name }) => name));
  const observedCountTotal = countRowsTotal(observedCountRows);
  const expectedCountTotal = countRowsTotal(bridgeStates.canonicalObservation.rows);
  const functionDefinitionDiagnostics = diagnoseFunctionDefinitions(localDatabase, baseline, expected);
  const functionDefinitionClassification = assertFiveFunctionDefinitionClassification(
    functionDefinitionDiagnostics,
    authority.definitionDriftExpectedTrueCount
  );
  const baselineDiagnostics = {
    acl: summarizeAclDifferences(baseline, expected),
    previewObservedDrift: {
      structural: summarizeCanonicalDiffs(canonicalStateDiffs(baseline, previewStructural)),
      acl: summarizeAclDifferences(baseline, previewStructural)
    },
    rolesAndDefaultPrivileges: (() => {
      try {
        return localRoleAndDefaultPrivilegeDiagnostic(localDatabase);
      } catch (error) {
        return { status: "UNVERIFIED", reason: safeCaseReason(error) };
      }
    })(),
    functionDefinitions: (() => {
      return {
        definitionDriftExpectedTrueCount: authority.definitionDriftExpectedTrueCount,
        definitionDriftObservation: authority.definitionDriftObservation,
        ...functionDefinitionClassification,
        rows: functionDefinitionDiagnostics
      };
    })()
  };
  if (!fs.existsSync(path.join(migrationsRoot, `${forwardConvergenceMigration}.sql`))) {
    return {
      status: "SETUP_BLOCKED",
      reason: "A3_FORWARD_CONVERGENCE_MIGRATION_UNVERIFIED",
      migrationCount: baselineMigrationCount,
      canonicalStructural: "UNVERIFIED_UNTIL_FORWARD_CONVERGENCE",
      canonicalObservation: {
        sourceArtifactSha256: expectedR13Sha256,
        observedTotalRows: observedCountTotal,
        expectedPreviewTotalRows: expectedCountTotal,
        comparison: observedCountTotal === expectedCountTotal ? "MATCH" : "DIFFERENT_BY_DESIGN"
      },
      diagnostics: baselineDiagnostics,
      bridgeExitCode: "NOT_RUN",
      normalizedDigestEquality: "NOT_RUN"
    };
  }
  applyForwardConvergenceMigration(localDatabase);
  const migrationCount = baselineMigrationCount + 1;
  const before = bridgeStateSnapshot(localDatabase).canonical;
  const beforeDigest = normalizedJsonSha256(before);
  const diffs = canonicalStateDiffs(before, expected);
  assertCanonicalPaidRpcSecurityBoundary(before, { browserExecuteRoles: authority.browserExecuteRoles });
  const diagnostics = {
    ...baselineDiagnostics,
    postConvergenceRawDefinitionMd5Matches: before.functions.filter((row) => {
      const expectedRow = expected.functions.find((candidate) => candidate.name === row.name && candidate.identityArguments === row.identityArguments);
      return expectedRow?.definitionMd5 === row.definitionMd5;
    }).length
  };
  const bridgeResult = runBridge(localDatabase);
  const after = bridgeStateSnapshot(localDatabase).canonical;
  const afterDigest = normalizedJsonSha256(after);
  assert.equal(afterDigest, beforeDigest, "canonical mismatch must not mutate the catalog");
  if (diffs.length > 0) {
    assert.notEqual(bridgeResult.exitCode, 0, "canonical mismatch fails closed before DDL");
    return {
      status: "FAIL",
      reason: "CANONICAL_STATE_MISMATCH",
      migrationCount,
      bridgeExitCode: bridgeResult.exitCode,
      normalizedDigestEquality: "PASS",
      canonicalStructural: "FAIL",
      canonicalObservation: {
        sourceArtifactSha256: expectedR13Sha256,
        observedTotalRows: observedCountTotal,
        expectedPreviewTotalRows: expectedCountTotal,
        comparison: observedCountTotal === expectedCountTotal ? "MATCH" : "DIFFERENT_BY_DESIGN"
      },
      diagnostics,
      ...summarizeCanonicalDiffs(diffs)
    };
  }
  assert.equal(bridgeResult.exitCode, 0, `canonical bridge exit ${classifyPsqlFailure(bridgeResult)}`);
  return {
    status: "PASS",
    migrationCount,
    bridgeExitCode: 0,
    normalizedDigestEquality: "PASS",
    canonicalStructural: "PASS",
    canonicalObservation: {
      sourceArtifactSha256: expectedR13Sha256,
      observedTotalRows: observedCountTotal,
      expectedPreviewTotalRows: expectedCountTotal,
      comparison: observedCountTotal === expectedCountTotal ? "MATCH" : "DIFFERENT_BY_DESIGN"
    },
    diagnostics,
    noOp: true
  };
}

const syntheticOwnership = Object.freeze({
  table: "comment_translator_paid_openai_minute_buckets",
  columns: ["minute_start", "reserved_requests"]
});

function runSyntheticCanonicalPreservationCase(expected) {
  const localDatabase = allocateFreshDatabaseName("synthetic");
  ensureFreshDatabaseNamed(localDatabase, canonicalBootstrapSql(), "SYNTHETIC", { includePgNet: true });
  applyRepositoryMigrations(localDatabase);
  const beforeStructure = bridgeStateSnapshot(localDatabase).canonical;
  const beforeStructureDigest = normalizedJsonSha256(beforeStructure);
  const tableNames = expected.tables.map(({ name }) => name);
  const beforeRows = canonicalRowFingerprints(localDatabase, tableNames);
  assert.equal(beforeRows.find((row) => row.table_name === syntheticOwnership.table)?.row_count, 0, "synthetic target starts empty");
  assertLocalPsql(localDatabase, `insert into public.${sqlIdentifier(syntheticOwnership.table)} (minute_start, reserved_requests)
    values (timestamptz '2026-01-01 00:00:00+00', 0);`, "SYNTHETIC_INSERT");
  const afterInsertRows = canonicalRowFingerprints(localDatabase, tableNames);
  const targetAfterInsert = afterInsertRows.find((row) => row.table_name === syntheticOwnership.table);
  assert.equal(targetAfterInsert?.row_count, 1, "synthetic fixture inserts one deterministic local row");
  const bridgeResult = runBridge(localDatabase);
  const afterBridgeStructure = bridgeStateSnapshot(localDatabase).canonical;
  const afterRows = canonicalRowFingerprints(localDatabase, tableNames);
  assert.deepEqual(afterBridgeStructure, beforeStructure, "bridge preserves canonical structure on synthetic data");
  assert.deepEqual(afterRows, afterInsertRows, "bridge preserves lossless per-table row fingerprints");
  assert.equal(normalizedJsonSha256(afterBridgeStructure), beforeStructureDigest, "bridge preserves canonical structural digest");

  const beforeUpdateAllRows = canonicalRowFingerprints(localDatabase, tableNames);
  const beforeUpdateRows = beforeUpdateAllRows.filter((row) => row.table_name === syntheticOwnership.table);
  assertLocalPsql(localDatabase, `update public.${sqlIdentifier(syntheticOwnership.table)}
    set reserved_requests = reserved_requests + 1
    where minute_start = timestamptz '2026-01-01 00:00:00+00';`, "SYNTHETIC_SAME_COUNT_UPDATE");
  const afterUpdateRows = canonicalRowFingerprints(localDatabase, [syntheticOwnership.table]);
  const sameCountUpdateDetected = beforeUpdateRows[0]?.row_count === afterUpdateRows[0]?.row_count
    && beforeUpdateRows[0]?.row_digest !== afterUpdateRows[0]?.row_digest;
  assert.equal(sameCountUpdateDetected, true, "same-count update oracle detects changed row content");
  const updateBridgeResult = runBridge(localDatabase);
  const afterUpdateBridgeRows = canonicalRowFingerprints(localDatabase, tableNames);
  const expectedAfterUpdateRows = afterUpdateRows.length === 1
    ? beforeUpdateAllRows.map((row) => row.table_name === syntheticOwnership.table ? afterUpdateRows[0] : row)
    : afterUpdateBridgeRows;
  assert.deepEqual(afterUpdateBridgeRows, expectedAfterUpdateRows, "same-count update row fingerprint remains stable through bridge");
  const structuralMatchesExpected = canonicalStructuralEqual(beforeStructure, expected);
  if (structuralMatchesExpected) {
    assert.equal(bridgeResult.exitCode, 0, "exact canonical synthetic state accepts a no-op bridge");
    assert.equal(updateBridgeResult.exitCode, 0, "exact canonical same-count update accepts a no-op bridge");
  } else {
    assert.notEqual(bridgeResult.exitCode, 0, "local structural baseline mismatch fails closed");
    assert.notEqual(updateBridgeResult.exitCode, 0, "local structural baseline mismatch remains fail-closed");
  }
  return {
    status: "PASS",
    table: syntheticOwnership.table,
    columns: syntheticOwnership.columns,
    insertedRows: 1,
    structuralBeforeAfter: "PASS",
    losslessPerTableRowEquality: "PASS",
    sameCountUpdateOracle: "PASS",
    bridgeGate: structuralMatchesExpected ? "PASS" : "FAIL_CLOSED_LOCAL_BASELINE",
    bridgeExitCode: bridgeResult.exitCode,
    updateBridgeExitCode: updateBridgeResult.exitCode,
    expectedStructuralMatch: structuralMatchesExpected
  };
}

function safeCaseReason(error) {
  return error instanceof Error
    ? error.message.split(":")[0].replace(/[^A-Z0-9_-]/gi, "_")
    : "CASE_FAILURE";
}

function ensureLocalRole(databaseName, roleName) {
  assert.match(roleName, /^[a-z0-9_]+$/);
  assertLocalPsql(databaseName, `do $$
begin
  if not exists (select 1 from pg_roles where rolname = '${roleName}') then
    create role ${sqlIdentifier(roleName)} noinherit;
  end if;
end
$$;`, "CREATE_LOCAL_ROLE");
}

function functionArgumentTypes(identityArguments) {
  if (identityArguments === "") return "";
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index <= identityArguments.length; index += 1) {
    const character = identityArguments[index];
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if ((character === "," && depth === 0) || index === identityArguments.length) {
      const part = identityArguments.slice(start, index).trim();
      const named = part.match(/^(?:inout|out|in|variadic)\s+([a-z_][a-z0-9_$]*)\s+(.+)$/i);
      parts.push((named ? named[2] : part).trim());
      start = index + 1;
    }
  }
  return parts.join(", ");
}

function functionSignatureSql(row) {
  return `public.${sqlIdentifier(row.name)}(${functionArgumentTypes(row.identityArguments)})`;
}

function firstForeignKey(expected) {
  for (const table of expected.tables) {
    const constraint = table.constraints.find(({ type }) => type === "f");
    if (constraint) return { table, constraint };
  }
  throw new Error("EXPECTED_FOREIGN_KEY_NOT_FOUND");
}

function setupNegativeCase(databaseName, spec, expected, inputRows) {
  if (spec.mode === "canonical") {
    ensureFreshDatabaseNamed(databaseName, canonicalBootstrapSql(), "NEGATIVE", { includePgNet: true });
    applyRepositoryMigrations(databaseName);
  } else {
    ensureFreshDatabaseNamed(databaseName, localBootstrapSql(), "NEGATIVE", { includePgNet: false });
    if (spec.replayLegacy) executeLegacyBodies(databaseName, inputRows);
  }
  spec.setup(databaseName, expected);
}

function runNegativeCase(spec, expected, inputRows) {
  const localDatabase = allocateFreshDatabaseName(`negative_${spec.id}`);
  try {
    setupNegativeCase(localDatabase, spec, expected, inputRows);
    const beforeSummary = scopedSummary(localDatabase);
    const beforeCatalog = bridgeStateSnapshot(localDatabase);
    const beforeDigest = normalizedJsonSha256(beforeCatalog);
    const bridgeResult = runBridge(localDatabase);
    const afterSummary = scopedSummary(localDatabase);
    const afterCatalog = bridgeStateSnapshot(localDatabase);
    const afterDigest = normalizedJsonSha256(afterCatalog);
    assert.notEqual(bridgeResult.exitCode, 0, `${spec.id} must fail closed`);
    assert.deepEqual(afterSummary, beforeSummary, `${spec.id} summary is unchanged`);
    assert.deepEqual(afterCatalog, beforeCatalog, `${spec.id} complete state is unchanged`);
    assert.equal(afterDigest, beforeDigest, `${spec.id} normalized digest is unchanged`);
    return {
      id: spec.id,
      status: "PASS",
      bridgeExitCode: bridgeResult.exitCode,
      beforeAfterState: "EQUAL",
      normalizedDigestEquality: "PASS"
    };
  } catch (error) {
    return {
      id: spec.id,
      status: "FAIL",
      reason: safeCaseReason(error)
    };
  }
}

function runNegativeMatrix(expected, inputRows) {
  const wrongOwnerTable = "comment_translator_paid_capacity_config";
  const aclTable = "comment_translator_paid_capacity_config";
  const rlsTable = "comment_translator_paid_capacity_config";
  const triggerTable = "comment_translator_paid_billing_lifecycles";
  const triggerName = "comment_translator_paid_durable_reconcile_schedule";
  const definitionDrift = expected.functions.find((row) => row.name === "ct_paid_assert_current_utc_month");
  const configDrift = expected.functions.find((row) => row.name === "ct_paid_begin_checkout");
  const foreignKey = firstForeignKey(expected);
  const cases = [
    {
      id: "partial-objects",
      mode: "partial",
      setup: (databaseName) => assertLocalPsql(databaseName, "create table public.comment_translator_paid_entitlements (billing_user_reference_id text not null);", "NEGATIVE_SETUP")
    },
    {
      id: "mixed-objects",
      mode: "partial",
      setup: (databaseName) => assertLocalPsql(databaseName, "create table public.comment_translator_paid_entitlements (billing_user_reference_id text not null); create function public.ct_paid_gate1_mixed_marker() returns text language sql as $$ select 'mixed' $$;", "NEGATIVE_SETUP")
    },
    {
      id: "non-empty-legacy-table",
      mode: "legacy",
      replayLegacy: true,
      setup: (databaseName) => assertLocalPsql(databaseName, "insert into public.comment_translator_paid_entitlements (billing_user_reference_id, subscription_status, billing_state, evidence_event_reference_id, evidence_created_at, evidence_recorded_at, updated_at) values ('ctbill_000000000000000000000000', 'canceled', 'paid-inactive', 'gate1-negative-event', timestamptz '2026-01-01 00:00:00+00', timestamptz '2026-01-01 00:00:00+00', timestamptz '2026-01-01 00:00:00+00');", "NEGATIVE_SETUP")
    },
    {
      id: "wrong-owner",
      mode: "canonical",
      setup: (databaseName) => {
        ensureLocalRole(databaseName, "gate1_wrong_owner");
        assertLocalPsql(databaseName, `grant gate1_wrong_owner to postgres; grant create on schema public to gate1_wrong_owner; alter table public.${sqlIdentifier(wrongOwnerTable)} owner to gate1_wrong_owner; revoke create on schema public from gate1_wrong_owner; revoke gate1_wrong_owner from postgres;`, "NEGATIVE_SETUP");
      }
    },
    {
      id: "rls-drift",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, `alter table public.${sqlIdentifier(rlsTable)} disable row level security;`, "NEGATIVE_SETUP")
    },
    {
      id: "acl-drift",
      mode: "canonical",
      setup: (databaseName) => {
        ensureLocalRole(databaseName, "service_role");
        assertLocalPsql(databaseName, `revoke select on table public.${sqlIdentifier(aclTable)} from service_role;`, "NEGATIVE_SETUP");
      }
    },
    {
      id: "function-identity-drift",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, "create function public.ct_paid_begin_checkout(p_owner_user_id uuid) returns text language sql immutable as $$ select 'identity-drift' $$;", "NEGATIVE_SETUP")
    },
    {
      id: "function-result-type-drift",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, `drop function public.${sqlIdentifier(definitionDrift.name)}(timestamp with time zone); create function public.${sqlIdentifier(definitionDrift.name)}(p_now timestamp with time zone) returns text language sql stable as $$ select 'result-drift' $$;`, "NEGATIVE_SETUP")
    },
    {
      id: "function-config-drift",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, `alter function ${functionSignatureSql(configDrift)} set search_path = pg_catalog, public, extensions;`, "NEGATIVE_SETUP")
    },
    {
      id: "function-security-definer-drift",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, `alter function ${functionSignatureSql(configDrift)} security invoker;`, "NEGATIVE_SETUP")
    },
    {
      id: "function-definition-digest-drift",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, `create or replace function public.${sqlIdentifier(definitionDrift.name)}(p_now timestamp with time zone) returns boolean language sql stable security definer set search_path = pg_catalog, public as $$ select true $$;`, "NEGATIVE_SETUP")
    },
    {
      id: "trigger-absent",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, `drop trigger ${sqlIdentifier(triggerName)} on public.${sqlIdentifier(triggerTable)};`, "NEGATIVE_SETUP")
    },
    {
      id: "trigger-disabled",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, `alter table public.${sqlIdentifier(triggerTable)} disable trigger ${sqlIdentifier(triggerName)};`, "NEGATIVE_SETUP")
    },
    {
      id: "internal-foreign-key-drift",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, `alter table public.${sqlIdentifier(foreignKey.table.name)} drop constraint ${sqlIdentifier(foreignKey.constraint.name)};`, "NEGATIVE_SETUP")
    },
    {
      id: "pre-existing-archive-schema",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, "create schema comment_translator_paid_legacy_archive;", "NEGATIVE_SETUP")
    },
    {
      id: "canonical-extra-identity-present-in-legacy",
      mode: "legacy",
      replayLegacy: true,
      setup: (databaseName) => assertLocalPsql(databaseName, "create function public.ct_paid_gate1_legacy_extra(p_marker text) returns text language sql immutable as $$ select p_marker $$;", "NEGATIVE_SETUP")
    },
    {
      id: "malformed-legacy-object",
      mode: "partial",
      setup: (databaseName) => assertLocalPsql(databaseName, "create table public.comment_translator_paid_entitlements (unexpected_marker integer);", "NEGATIVE_SETUP")
    },
    {
      id: "extra-legacy-object",
      mode: "legacy",
      replayLegacy: true,
      setup: (databaseName) => assertLocalPsql(databaseName, "create table public.comment_translator_paid_extra_legacy (id bigint);", "NEGATIVE_SETUP")
    },
    {
      id: "duplicate-legacy-identity",
      mode: "legacy",
      replayLegacy: true,
      setup: (databaseName) => assertLocalPsql(databaseName, "create function public.apply_comment_translator_paid_usage(p_marker text) returns text language sql immutable as $$ select p_marker $$;", "NEGATIVE_SETUP")
    },
    {
      id: "paid-cron-present",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, "insert into cron.job (schedule, command, jobname) values ('* * * * *', 'select 1', 'comment-translator-paid-maintenance');", "NEGATIVE_SETUP")
    },
    {
      id: "external-view-dependency",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, "create view public.gate1_external_view as select config_key from public.comment_translator_paid_capacity_config;", "NEGATIVE_SETUP")
    },
    {
      id: "external-function-reference",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, "create function public.gate1_external_function() returns bigint language sql stable as $$ select count(*) from public.comment_translator_paid_capacity_config $$;", "NEGATIVE_SETUP")
    },
    {
      id: "external-constraint-dependency",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, "create table public.gate1_external_constraint (id text primary key, config_key boolean); alter table public.gate1_external_constraint add constraint gate1_external_constraint_fk foreign key (config_key) references public.comment_translator_paid_capacity_config(config_key);", "NEGATIVE_SETUP")
    },
    {
      id: "external-trigger-dependency",
      mode: "canonical",
      setup: (databaseName) => assertLocalPsql(databaseName, "create function public.gate1_external_trigger_fn() returns trigger language plpgsql as $$ begin return new; end $$; create trigger gate1_external_trigger before insert on public.comment_translator_paid_capacity_config for each row execute function public.gate1_external_trigger_fn();", "NEGATIVE_SETUP")
    }
  ];
  const results = [];
  for (let index = 0; index < cases.length; index += 1) {
    const result = runNegativeCase(cases[index], expected, inputRows);
    results.push(result);
    if (result.status !== "PASS") {
      return {
        status: "FAIL",
        caseCount: cases.length,
        executedCaseCount: results.length,
        results,
        unexecutedCaseIds: cases.slice(index + 1).map((spec) => spec.id)
      };
    }
  }
  return {
    status: "PASS",
    caseCount: cases.length,
    executedCaseCount: results.length,
    results,
    unexecutedCaseIds: []
  };
}

function cliNeedsStructuredStdout(args) {
  return (
    (args.includes("--output-format") && args.includes("json"))
    || (args.includes("-o") && args.includes("json"))
    || (args.length === 1 && args[0] === "--version")
  );
}

function emptyCliRunnerDiagnostics(outputClass = "RUNNER") {
  return {
    outputClass,
    lastErrorClass: "CLI_RUNNER_ERROR",
    bridgeAssertionCode: "NONE",
    bridgeAssertionInputCount: 0,
    bridgeAssertionAllowlistMatch: false,
    injectedAtomicityFailure: false,
    migrationVersions: [],
    migrationBasenames: [],
    lastMigrationBasename: "UNSPECIFIED",
    sqlStates: [],
    missingRelationIdentities: [],
    stdoutBytes: 0,
    stderrBytes: 0,
    stdoutLimitBytes: 0,
    stdoutTruncated: false,
    stderrTruncated: false
  };
}

function runLocalSupabaseCli(workDirectory, args) {
  const serialized = args.join(" ");
  if (/(?:^|\s)--linked(?:\s|$)|(?:^|\s)--db-url(?:\s|$)|\b(?:db\s+(?:push|pull|dump)|migration\s+repair)\b/i.test(serialized)) {
    throw new Error("REMOTE_CLI_ARGUMENT_REJECTED");
  }
  if (args[0] === "start" || (args[0] === "db" && args[1] === "reset")) {
    const preflight = cliStartResetPreflight(workDirectory, args);
    if (preflight.status !== "PASS") {
      return {
        status: 1,
        signal: "NONE",
        stdout: "",
        stderr: "",
        errorCode: preflight.code ?? "CLI_START_RESET_PREFLIGHT_BLOCKED",
        preflightBlocked: true,
        terminationConfirmed: true,
        terminationUnknown: false,
        timedOut: false,
        captureFailure: false,
        cliDiagnostics: emptyCliRunnerDiagnostics("PREFLIGHT")
      };
    }
    if (args[0] === "start") {
      const projectId = readCliProjectId(workDirectory);
      cliStartAttemptedProjects.add(projectId);
    }
  }
  const transport = typeof verifiedDockerTransportOrNull === "function"
    ? verifiedDockerTransportOrNull()
    : { environment: {} };
  const cliTimeoutMs = typeof localCliTimeoutMs === "number" ? localCliTimeoutMs : 300 * 1000;
  if (typeof terminationUnknown !== "undefined" && terminationUnknown) return terminationUnknownResult();
  if (!transport) {
    if (typeof terminationUnknown !== "undefined" && terminationUnknown) return terminationUnknownResult();
    return {
      status: null,
      signal: "NONE",
      stdout: "",
      stderr: "",
      error: { code: "DOCKER_TRANSPORT_UNAVAILABLE" },
      cliDiagnostics: emptyCliRunnerDiagnostics()
    };
  }
  const usePinnedGo = typeof localCliProfile === "string" && localCliProfile === "preview-pinned-go";
  if (usePinnedGo) {
    assert.equal(fs.lstatSync(previewGoCliPath).isSymbolicLink(), false, "PREVIEW_GO_BINARY_REGULAR");
    assert.equal(sha256Bytes(fs.readFileSync(previewGoCliPath)), previewGoCliSha256, "PREVIEW_GO_BINARY_IDENTITY");
  }
  const runnerResult = spawnSync(process.execPath, [cliRunnerPath], {
    input: JSON.stringify({
      command: usePinnedGo ? previewGoCliPath : process.execPath,
      args: usePinnedGo ? args : [typeof supabaseCliPath === "string" ? supabaseCliPath : path.join(root, "node_modules", "supabase", "dist", "supabase.js"), ...args],
      cwd: workDirectory,
      shell: false,
      preserveStdout: cliNeedsStructuredStdout(args) || (args[0] === "migration" && args[1] === "list"),
      structuredStdout: cliNeedsStructuredStdout(args),
      timeoutMs: cliTimeoutMs,
      env: usePinnedGo ? {...transport.environment, DO_NOT_TRACK:"1", SUPABASE_TELEMETRY_DISABLED:"1"} : transport.environment
    }),
    cwd: root,
    env: transport.environment,
    encoding: "utf8",
    maxBuffer: localCliRunnerMaxBufferBytes,
    windowsHide: true,
    shell: false
  });
  const runnerOuterFailure = Boolean(runnerResult.error || runnerResult.signal || runnerResult.status !== 0);
  const unknownRunnerResult = (code = "CLI_TERMINATION_UNKNOWN") => {
    latchTerminationUnknown();
    return {
      ...terminationUnknownResult(),
      signal: runnerResult.signal ?? "NONE",
      errorCode: code,
      error: { code },
      cliDiagnostics: emptyCliRunnerDiagnostics("RUNNER")
    };
  };
  let payload = null;
  try {
    payload = JSON.parse(String(runnerResult.stdout ?? "").trim());
  } catch {
    if (!runnerOuterFailure) return unknownRunnerResult("CLI_RUNNER_JSON_UNAVAILABLE");
    return unknownRunnerResult("CLI_RUNNER_OUTER_FAILURE");
  }
  if (runnerOuterFailure) {
    return unknownRunnerResult("CLI_RUNNER_OUTER_FAILURE");
  }
  if (!payload || typeof payload.status !== "number" || !payload.diagnostics) {
    return unknownRunnerResult("CLI_RUNNER_SHAPE");
  }
  if (typeof payload.terminationConfirmed !== "boolean" || typeof payload.timedOut !== "boolean") {
    return unknownRunnerResult("CLI_RUNNER_RECEIPT_INCOMPLETE");
  }
  if (payload.preSpawnFailure !== true && payload.terminationConfirmed !== true) {
    return unknownRunnerResult("CLI_TERMINATION_UNKNOWN");
  }
  const requiredStdout = cliNeedsStructuredStdout(args) || (args[0] === "migration" && args[1] === "list");
  const captureFailure = payload.captureFailure === true
    || (requiredStdout && payload.diagnostics.stdoutTruncated === true);
  if (captureFailure) {
    if (payload.preSpawnFailure !== true) latchTerminationUnknown();
    return {
      status: null,
      signal: runnerResult.signal ?? "NONE",
      stdout: "",
      stderr: "",
      error: { code: "CLI_CAPTURE_FAILURE" },
      errorCode: "CLI_CAPTURE_FAILURE",
      captureFailure: true,
      terminationConfirmed: payload.terminationConfirmed === true,
      terminationUnknown: payload.preSpawnFailure !== true,
      timedOut: payload.timedOut === true,
      preSpawnFailure: payload.preSpawnFailure === true,
      cliDiagnostics: { ...payload.diagnostics, outputClass: "RUNNER", lastErrorClass: "CLI_RUNNER_ERROR" }
    };
  }
  const diagnostics = payload.diagnostics;
  const childSignal = payload.signal ?? "NONE";
  const childErrorCode = payload.errorCode ?? "NONE";
  const childFailed = childSignal !== "NONE" || childErrorCode !== "NONE" || payload.timedOut === true;
  return {
    status: childFailed ? null : payload.status,
    signal: childSignal,
    stdout: typeof payload.stdout === "string" ? payload.stdout : "",
    stderr: "",
    error: childFailed
      ? { code: childErrorCode !== "NONE" ? childErrorCode : "CLI_RUNNER_ERROR" }
      : undefined,
    errorCode: childErrorCode,
    terminationConfirmed: payload.terminationConfirmed === true,
    terminationUnknown: false,
    timedOut: payload.timedOut === true,
    preSpawnFailure: payload.preSpawnFailure === true,
    captureFailure: false,
    cliDiagnostics: diagnostics
  };
}

function runDockerDiscardingOutput(args, input = undefined) {
  const result = runNativeDocker(args, input, { discardOutput: true });
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    errorCode: result.errorCode
  };
}

function runStreamedDockerInput(args, inputFile, { bridgeSourceFile = bridgePath } = {}) {
  if (terminationUnknown) {
    return {
      status: 1,
      signal: "NONE",
      errorCode: "CLI_TERMINATION_UNKNOWN",
      terminationConfirmed: false,
      terminationUnknown: true,
      timedOut: false,
      captureFailure: false,
      bridgeAssertionCode: "NONE",
      bridgeAssertionInputCount: 0,
      bridgeAssertionAllowlistMatch: false
    };
  }
  let stat;
  try {
    stat = fs.lstatSync(inputFile);
  } catch {
    return {
      status: 1,
      signal: "NONE",
      errorCode: "CLI_INPUT_FILE_UNAVAILABLE",
      terminationConfirmed: true,
      terminationUnknown: false,
      timedOut: false,
      captureFailure: false,
      bridgeAssertionCode: "NONE",
      bridgeAssertionInputCount: 0,
      bridgeAssertionAllowlistMatch: false
    };
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    return {
      status: 1,
      signal: "NONE",
      errorCode: "CLI_INPUT_FILE_INVALID",
      terminationConfirmed: true,
      terminationUnknown: false,
      timedOut: false,
      captureFailure: false,
      bridgeAssertionCode: "NONE",
      bridgeAssertionInputCount: 0,
      bridgeAssertionAllowlistMatch: false
    };
  }
  const transport = verifiedDockerTransportOrNull();
  if (!transport) {
    if (terminationUnknown) {
      return {
        status: 1,
        signal: "NONE",
        errorCode: "CLI_TERMINATION_UNKNOWN",
        terminationConfirmed: false,
        terminationUnknown: true,
        timedOut: false,
        captureFailure: false,
        bridgeAssertionCode: "NONE",
        bridgeAssertionInputCount: 0,
        bridgeAssertionAllowlistMatch: false
      };
    }
    return {
      status: 1,
      signal: "NONE",
      errorCode: "DOCKER_TRANSPORT_UNAVAILABLE",
      terminationConfirmed: true,
      terminationUnknown: false,
      timedOut: false,
      captureFailure: false,
      bridgeAssertionCode: "NONE",
      bridgeAssertionInputCount: 0,
      bridgeAssertionAllowlistMatch: false
    };
  }
  const runnerResult = spawnSync(process.execPath, [cliRunnerPath], {
    input: JSON.stringify({
      command: dockerCli,
      args,
      cwd: root,
      shell: false,
      env: transport.environment,
      preserveStdout: false,
      retainOutput: false,
      bridgeOnly: true,
      inputFile,
      timeoutMs: localCliTimeoutMs,
      bridgeSourceFile
    }),
    cwd: root,
    env: transport.environment,
    encoding: "utf8",
    maxBuffer: localCliRunnerMaxBufferBytes,
    windowsHide: true,
    shell: false
  });
  const runnerOuterFailure = Boolean(runnerResult.error || runnerResult.signal || runnerResult.status !== 0);
  const unknownRunnerResult = (code = "CLI_TERMINATION_UNKNOWN") => {
    latchTerminationUnknown();
    return {
      status: 1,
      signal: runnerResult.signal ?? "NONE",
      errorCode: code,
      terminationConfirmed: false,
      terminationUnknown: true,
      timedOut: false,
      captureFailure: false,
      bridgeAssertionCode: "NONE",
      bridgeAssertionInputCount: 0,
      bridgeAssertionAllowlistMatch: false
    };
  };
  let payload;
  try {
    payload = JSON.parse(String(runnerResult.stdout ?? "").trim());
  } catch {
    return unknownRunnerResult(runnerOuterFailure ? "CLI_RUNNER_OUTER_FAILURE" : "CLI_RUNNER_JSON_UNAVAILABLE");
  }
  if (runnerOuterFailure) {
    return unknownRunnerResult("CLI_RUNNER_OUTER_FAILURE");
  }
  if (!payload || typeof payload.status !== "number" || !payload.diagnostics) {
    return unknownRunnerResult("CLI_RUNNER_SHAPE");
  }
  if (typeof payload.terminationConfirmed !== "boolean" || typeof payload.timedOut !== "boolean") {
    return unknownRunnerResult("CLI_RUNNER_RECEIPT_INCOMPLETE");
  }
  if (payload.preSpawnFailure !== true && payload.terminationConfirmed !== true) {
    return unknownRunnerResult("CLI_TERMINATION_UNKNOWN");
  }
  if (payload.captureFailure === true) {
    if (payload.preSpawnFailure !== true) latchTerminationUnknown();
    return {
      status: 1,
      signal: payload.signal ?? "NONE",
      errorCode: "CLI_CAPTURE_FAILURE",
      terminationConfirmed: payload.terminationConfirmed === true,
      terminationUnknown: payload.preSpawnFailure !== true,
      timedOut: payload.timedOut === true,
      preSpawnFailure: payload.preSpawnFailure === true,
      captureFailure: true,
      bridgeAssertionCode: "NONE",
      bridgeAssertionInputCount: 0,
      bridgeAssertionAllowlistMatch: false
    };
  }
  const diagnostics = payload?.diagnostics;
  const childSignal = payload?.signal ?? "NONE";
  const childErrorCode = payload?.errorCode ?? "NONE";
  const childFailed = childSignal !== "NONE" || childErrorCode !== "NONE" || payload.timedOut === true;
  const bridgeAssertionCode = typeof diagnostics?.bridgeAssertionCode === "string"
    && /^[A-Z0-9_]{1,64}$/.test(diagnostics.bridgeAssertionCode)
    ? diagnostics.bridgeAssertionCode
    : "NONE";
  return {
    status: childFailed || typeof payload?.status !== "number" ? 1 : payload.status,
    signal: typeof childSignal === "string" ? childSignal : "NONE",
    errorCode: childFailed
      ? (typeof childErrorCode === "string" && childErrorCode !== "NONE" && /^[A-Z0-9_-]{1,64}$/.test(childErrorCode)
        ? childErrorCode
        : "CLI_RUNNER_ERROR")
      : (typeof childErrorCode === "string" && /^[A-Z0-9_-]{1,64}$/.test(childErrorCode)
      ? childErrorCode
      : "NONE"),
    terminationConfirmed: payload.terminationConfirmed === true,
    terminationUnknown: false,
    timedOut: payload.timedOut === true,
    preSpawnFailure: payload.preSpawnFailure === true,
    captureFailure: false,
    bridgeAssertionCode,
    bridgeAssertionInputCount: Number.isInteger(diagnostics?.bridgeAssertionInputCount)
      ? Math.max(0, diagnostics.bridgeAssertionInputCount)
      : 0,
    bridgeAssertionAllowlistMatch: diagnostics?.bridgeAssertionAllowlistMatch === true
  };
}

function parseCliQueryJson(output) {
  let payload;
  try {
    payload = JSON.parse(String(output ?? "").trim());
  } catch {
    throw new Error("CLI_QUERY_SHAPE");
  }
  const rows = Array.isArray(payload)
    ? payload
    : (payload && typeof payload === "object" && Array.isArray(payload.rows) ? payload.rows : null);
  if (!rows || rows.length !== 1) {
    throw new Error("CLI_QUERY_SHAPE");
  }
  const row = rows[0];
  if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("CLI_QUERY_SHAPE");
  const keys = Object.keys(row);
  if (keys.length !== 1) throw new Error("CLI_QUERY_SHAPE");
  const value = row[keys[0]];
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("CLI_QUERY_SHAPE");
  return value;
}

function classifyLocalCliResult(result) {
  if (result?.terminationUnknown === true) return "CLI_TERMINATION_UNKNOWN";
  if (result?.captureFailure === true) return "CLI_CAPTURE_FAILURE";
  if (result?.timedOut === true) return "CLI_TIMEOUT";
  const diagnostics = result.cliDiagnostics;
  if (diagnostics) {
    if (diagnostics.injectedAtomicityFailure === true || diagnostics.lastErrorClass === "INJECTED_ATOMICITY_FAILURE") {
      return "INJECTED_ATOMICITY_FAILURE";
    }
    if (diagnostics.lastErrorClass === "SYNTAX_ERROR") return "CLI_SQL_SYNTAX_ERROR";
    if (["MISSING_COLUMN", "MISSING_FUNCTION", "MISSING_RELATION", "MISSING_SCHEMA", "MISSING_TYPE"].includes(diagnostics.lastErrorClass)) {
      return "CLI_SQL_MISSING_OBJECT";
    }
    if (diagnostics.lastErrorClass === "PERMISSION_DENIED") return "CLI_SQL_PERMISSION_DENIED";
    if (diagnostics.lastErrorClass === "DUPLICATE_OBJECT") return "CLI_SQL_DUPLICATE_OBJECT";
    if (diagnostics.lastErrorClass === "MIGRATION_FAILURE") return "CLI_SQL_MIGRATION_FAILURE";
    if (diagnostics.lastErrorClass === "BRIDGE_CANONICAL_ASSERTION") return "CLI_SQL_BRIDGE_CANONICAL_ASSERTION";
    if (
      diagnostics.bridgeAssertionCode
      && diagnostics.bridgeAssertionCode !== "NONE"
      && diagnostics.bridgeAssertionCode !== "UNKNOWN_USER_RAISED_ASSERTION"
    ) return "CLI_SQL_BRIDGE_ASSERTION";
    if (diagnostics.lastErrorClass === "USER_RAISED_EXCEPTION") return "CLI_SQL_USER_RAISED_EXCEPTION";
    if (result.status === null || diagnostics.lastErrorClass === "CONNECTION_ERROR" || diagnostics.outputClass === "HEALTH") {
      return "LOCAL_SUPABASE_RUNTIME_UNAVAILABLE";
    }
    if (diagnostics.outputClass === "PORT") return "LOCAL_SUPABASE_RUNTIME_UNAVAILABLE";
    if (diagnostics.outputClass === "RUNNER") return "CLI_RUNNER_FAILURE";
    return "CLI_FAILURE";
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.toLowerCase();
  if (output.includes("gate1-atomicity-test")) return "INJECTED_ATOMICITY_FAILURE";
  if (/syntax error/i.test(output)) return "CLI_SQL_SYNTAX_ERROR";
  if (/permission denied/i.test(output)) return "CLI_SQL_PERMISSION_DENIED";
  if (/does not exist/i.test(output)) return "CLI_SQL_MISSING_OBJECT";
  if (/duplicate key|already exists/i.test(output)) return "CLI_SQL_DUPLICATE_OBJECT";
  if (/sqlstate|migration failed|failed to apply migration|error applying migration|psql:.*(error|fatal)/i.test(output)) {
    return "CLI_SQL_MIGRATION_FAILURE";
  }
  if (result.status === null || /connection refused|could not connect|not running|docker daemon|database system is unavailable|timed out|timeout/i.test(output)) {
    return "LOCAL_SUPABASE_RUNTIME_UNAVAILABLE";
  }
  return "CLI_FAILURE";
}

function classifyMissingRelationIdentity(identity) {
  if (identity === "cron.job") return "CRON_JOB";
  if (identity === "vault.decrypted_secrets") return "VAULT_SECRETS";
  if (identity === "auth.users") return "AUTH_USERS";
  if (identity === "supabase_migrations.schema_migrations") return "HISTORY";
  return identity.includes(".") ? "QUALIFIED_OTHER" : "UNQUALIFIED_OTHER";
}

function localCliFailureDiagnostics(result) {
  const structured = result.cliDiagnostics;
  if (structured) {
    const missingRelationIdentities = Array.isArray(structured.missingRelationIdentities)
      ? structured.missingRelationIdentities
      : [];
    const lastErrorClass = structured.lastErrorClass ?? "NONE";
    const missingObjectClass = {
      MISSING_COLUMN: "COLUMN",
      MISSING_FUNCTION: "FUNCTION",
      MISSING_RELATION: "RELATION",
      MISSING_SCHEMA: "SCHEMA",
      MISSING_TYPE: "TYPE"
    }[lastErrorClass] ?? (missingRelationIdentities.length > 0 ? "RELATION" : "UNCLASSIFIED");
    return {
      failureClass: classifyLocalCliResult(result),
      outputClass: structured.outputClass ?? "UNCLASSIFIED",
      missingObjectClass,
      missingRelationClasses: [...new Set(missingRelationIdentities.map(classifyMissingRelationIdentity))],
      missingRelationIdentities,
      migrationVersion: structured.migrationVersions?.at(-1) ?? "UNSPECIFIED",
      migrationVersions: structured.migrationVersions ?? [],
      migrationBasenames: structured.migrationBasenames ?? [],
      lastMigrationBasename: structured.lastMigrationBasename ?? "UNSPECIFIED",
      sqlStates: structured.sqlStates ?? [],
      bridgeAssertionCode: structured.bridgeAssertionCode ?? "NONE",
      bridgeAssertionInputCount: Number.isInteger(structured.bridgeAssertionInputCount)
        ? structured.bridgeAssertionInputCount
        : 0,
      bridgeAssertionAllowlistMatch: structured.bridgeAssertionAllowlistMatch === true,
      finalErrorClass: lastErrorClass,
      processStatus: result.status === null ? "NULL" : result.status,
      processSignal: result.signal ?? "NONE",
      processErrorCode: /^[A-Z0-9_-]{1,64}$/.test(result.error?.code ?? "") ? result.error.code : "NONE",
      terminationConfirmed: result.terminationConfirmed === true,
      terminationUnknown: result.terminationUnknown === true,
      timedOut: result.timedOut === true,
      captureFailure: result.captureFailure === true,
      stdoutBytes: structured.stdoutBytes ?? 0,
      stderrBytes: structured.stderrBytes ?? 0,
      stdoutLimitBytes: structured.stdoutLimitBytes ?? 0,
      stdoutTruncated: structured.stdoutTruncated === true,
      stderrTruncated: structured.stderrTruncated === true
    };
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.toLowerCase();
  const migrationVersions = [...output.matchAll(/\b(\d{14})\b/g)].map((match) => match[1]);
  const relationNames = [...output.matchAll(/relation\s+"([^"]+)"\s+does not exist/gi)].map((match) => match[1].toLowerCase());
  const relationClasses = [...new Set(relationNames.map((name) => {
    if (name === "cron.job") return "CRON_JOB";
    if (name === "vault.decrypted_secrets") return "VAULT_SECRETS";
    if (name === "auth.users") return "AUTH_USERS";
    if (name === "supabase_migrations.schema_migrations") return "HISTORY";
    return name.includes(".") ? "QUALIFIED_OTHER" : "UNQUALIFIED_OTHER";
  }))];
  const missingObjectClass = /relation .* does not exist/i.test(output)
    ? "RELATION"
    : /schema .* does not exist/i.test(output)
      ? "SCHEMA"
      : /function .* does not exist/i.test(output)
        ? "FUNCTION"
        : /column .* does not exist/i.test(output)
          ? "COLUMN"
          : "UNCLASSIFIED";
  const outputClass = /port|bind|listen/i.test(output)
    ? "PORT"
    : /health|ready|refused/i.test(output)
      ? "HEALTH"
      : /memory|resource|no space/i.test(output)
        ? "RESOURCE"
        : /image|pull|manifest/i.test(output)
          ? "IMAGE"
          : /network/i.test(output)
            ? "NETWORK"
            : /permission|access denied/i.test(output)
              ? "PERMISSION"
              : "UNCLASSIFIED";
  return {
    failureClass: classifyLocalCliResult(result),
    outputClass,
    missingObjectClass,
    missingRelationClasses: relationClasses,
    bridgeAssertionCode: "NONE",
    bridgeAssertionInputCount: 0,
    bridgeAssertionAllowlistMatch: false,
    migrationVersion: migrationVersions.at(-1) ?? "UNSPECIFIED",
    processStatus: result.status === null ? "NULL" : result.status,
    processSignal: result.signal ?? "NONE",
    processErrorCode: result.error?.code ?? "NONE",
    terminationConfirmed: result.terminationConfirmed === true,
    terminationUnknown: result.terminationUnknown === true,
    timedOut: result.timedOut === true,
    captureFailure: result.captureFailure === true,
    stdoutBytes: Buffer.byteLength(String(result.stdout ?? ""), "utf8"),
    stderrBytes: Buffer.byteLength(String(result.stderr ?? ""), "utf8")
  };
}

function availableTcpPorts() {
  const result = spawnSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("LOCAL_PORT_INSPECTION_FAILED");
  return new Set([...String(result.stdout ?? "").matchAll(/(?:TCP|UDP)\s+[^\s:]+:(\d+)\s+/gi)].map((match) => Number(match[1])));
}

function allocateNonConflictingPortBlock(size = 8) {
  const occupied = availableTcpPorts();
  for (let base = 55421; base <= 55800; base += 10) {
    const ports = Array.from({ length: size }, (_, offset) => base + offset);
    if (ports.every((port) => !occupied.has(port))) return ports;
  }
  throw new Error("LOCAL_PORT_BLOCK_UNAVAILABLE");
}

function updateTomlSectionValue(source, section, key, value) {
  const lines = source.split(/\r?\n/);
  let activeSection = "";
  let replaced = false;
  let matchCount = 0;
  const keyPattern = new RegExp(`^${key}\\s*=`);
  const updated = lines.map((line) => {
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) activeSection = sectionMatch[1];
    if (activeSection === section && keyPattern.test(line)) {
      matchCount += 1;
      replaced = true;
      return `${key} = ${value}`;
    }
    return line;
  });
  if (!replaced) throw new Error(`CLI_CONFIG_KEY_MISSING_${section}_${key}`);
  if (matchCount !== 1) throw new Error("CLI_CONFIG_PROFILE_SHAPE_INVALID");
  return updated.join("\n");
}

function ensureTomlSectionValue(source, section, key, value) {
  const lines = source.split(/\r?\n/);
  const sectionPattern = new RegExp(`^\\[${section.replace(/\./g, "\\.")}\\]$`);
  const sectionIndex = lines.findIndex((line) => sectionPattern.test(line.trim()));
  if (sectionIndex < 0) return `${source.replace(/\s*$/, "")}\n\n[${section}]\n${key} = ${value}\n`;
  const nextSection = lines.findIndex((line, index) => index > sectionIndex && /^\[[^\]]+\]$/.test(line.trim()));
  const end = nextSection < 0 ? lines.length : nextSection;
  const keyPattern = new RegExp(`^${key}\\s*=`);
  for (let index = sectionIndex + 1; index < end; index += 1) {
    if (keyPattern.test(lines[index].trim())) {
      lines[index] = `${key} = ${value}`;
      return lines.join("\n");
    }
  }
  lines.splice(end, 0, `${key} = ${value}`);
  return lines.join("\n");
}

function assertGeneratedCliConfig(workDirectory, options) {
  const requirePgdeltaDisabled = options?.requirePgdeltaDisabled === true;
  const configPath = path.join(workDirectory, "supabase", "config.toml");
  let config;
  try {
    const stat = fs.lstatSync(configPath);
    if (stat.isSymbolicLink() || !stat.isFile()) return { status: "SETUP_BLOCKED", code: "CLI_CONFIG_INVALID" };
    config = fs.readFileSync(configPath, "utf8");
  } catch {
    return { status: "SETUP_BLOCKED", code: "CLI_CONFIG_UNAVAILABLE" };
  }
  if ((config.match(/^project_id\s*=/gmi) ?? []).length !== 1) {
    return { status: "SETUP_BLOCKED", code: "CLI_CONFIG_PROFILE_SHAPE_INVALID" };
  }
  const sectionCount = (section) => (config.match(new RegExp(`^\\[${section.replace(/\./g, "\\.")}\\]\\s*$`, "gmi")) ?? []).length;
  if (sectionCount("db") !== 1 || sectionCount("db.pooler") !== 1 || sectionCount("experimental.pgdelta") !== 1) {
    return { status: "SETUP_BLOCKED", code: "CLI_CONFIG_PROFILE_SHAPE_INVALID" };
  }
  const dbSectionStart = config.search(/^\[db\]\s*$/m);
  const poolerSectionStart = config.search(/^\[db\.pooler\]\s*$/m);
  const experimentalPgdeltaSectionStart = config.search(/^\[experimental\.pgdelta\]\s*$/m);
  const sectionValue = (start, sectionEnd, key) => {
    if (start < 0) return "";
    const section = config.slice(start, sectionEnd < 0 ? config.length : sectionEnd);
    return section.match(new RegExp(`^${key}\\s*=\\s*(true|false|[0-9]+)\\s*$`, "mi"))?.[1] ?? "";
  };
  const nextSection = (start) => {
    if (start < 0) return -1;
    const match = config.slice(start + 1).search(/^\[[^\]]+\]\s*$/m);
    return match < 0 ? -1 : start + 1 + match;
  };
  const sectionKeyCount = (start, end, key) => {
    const section = config.slice(start, end < 0 ? config.length : end);
    return (section.match(new RegExp(`^${key}\\s*=`, "gmi")) ?? []).length;
  };
  if (sectionKeyCount(dbSectionStart, nextSection(dbSectionStart), "major_version") !== 1
    || sectionKeyCount(poolerSectionStart, nextSection(poolerSectionStart), "enabled") !== 1
    || sectionKeyCount(experimentalPgdeltaSectionStart, nextSection(experimentalPgdeltaSectionStart), "enabled") !== 1) {
    return { status: "SETUP_BLOCKED", code: "CLI_CONFIG_PROFILE_SHAPE_INVALID" };
  }
  const major = sectionValue(dbSectionStart, nextSection(dbSectionStart), "major_version");
  const pooler = sectionValue(poolerSectionStart, nextSection(poolerSectionStart), "enabled");
  const pgdelta = sectionValue(experimentalPgdeltaSectionStart, nextSection(experimentalPgdeltaSectionStart), "enabled");
  if (major !== "17" || pooler !== "false" || (requirePgdeltaDisabled && pgdelta !== "false")) {
    return { status: "SETUP_BLOCKED", code: "CLI_CONFIG_PROFILE_MISMATCH" };
  }
  return { status: "PASS", majorVersion: 17, poolerEnabled: false, pgdeltaEnabled: pgdelta === "true" };
}

function cliVersionResult() {
  if (!fs.existsSync(typeof localCliProfile === "string" && localCliProfile === "preview-pinned-go" ? previewGoCliPath : supabaseCliPath)) return { status: "SETUP_BLOCKED", code: "SUPABASE_CLI_MISSING" };
  const result = runLocalSupabaseCli(root, ["--version"]);
  if (result.terminationUnknown === true) return { status: "UNKNOWN", code: "CLI_TERMINATION_UNKNOWN" };
  if (result.status !== 0 || result.signal !== "NONE" || result.errorCode !== "NONE") {
    return { status: "SETUP_BLOCKED", code: "SUPABASE_CLI_VERSION_UNAVAILABLE" };
  }
  const version = String(result.stdout ?? "").trim();
  if (!/(?:^|\s)v?2\.109\.0(?:\s|$)/.test(version)) {
    return { status: "SETUP_BLOCKED", code: "SUPABASE_CLI_VERSION_MISMATCH" };
  }
  return { status: "PASS", version: "2.109.0" };
}

function cliRequiresPreflight(args) {
  return args[0] === "start" || (args[0] === "db" && args[1] === "reset");
}

function cliStartResetPreflight(workDirectory, args) {
  const version = cliVersionResult();
  if (version.status !== "PASS") return version;
   const config = assertGeneratedCliConfig(workDirectory, { requirePgdeltaDisabled: true });
  if (config.status !== "PASS") return config;
  const images = assertRequiredLocalImages();
  if (!images.available) return { status: "SETUP_BLOCKED", code: images.reason ?? "REQUIRED_LOCAL_IMAGE_CACHE_INCOMPLETE", missingImages: images.missingImages };
  if (args[0] === "start") {
    const projectId = readCliProjectId(workDirectory);
    const absent = assertCliProjectAbsent(projectId);
    if (absent.status !== "PASS") return absent;
  }
  return { status: "PASS", version, config, images };
}

function readCliProjectId(workDirectory) {
  const configPath = path.join(workDirectory, "supabase", "config.toml");
  let config;
  try {
    config = fs.readFileSync(configPath, "utf8");
  } catch {
    throw new Error("CLI_PROJECT_ID_UNAVAILABLE");
  }
  const projectId = config.match(/^project_id\s*=\s*"([^\"]+)"/m)?.[1] ?? "";
  if (projectId.length > 40 || !/^gate1-ct-paid-v1-a3-[a-z0-9-]+$/i.test(projectId)) throw new Error("CLI_PROJECT_ID_INVALID");
  return projectId;
}

function configureDisposableCliRuntime(workDirectory) {
  const configPath = path.join(workDirectory, "supabase", "config.toml");
  const configStat = fs.lstatSync(configPath);
  assert.equal(configStat.isSymbolicLink(), false, "CLI config is not a symlink");
   const initialProfile = assertGeneratedCliConfig(workDirectory);
  if (initialProfile.status !== "PASS") throw new Error(initialProfile.code);
  const projectId = `gate1-ct-paid-v1-a3-${generatedNonce().slice(0, 20)}`;
  const ports = allocateNonConflictingPortBlock();
  let config = fs.readFileSync(configPath, "utf8");
  if ((config.match(/^project_id\s*=/gmi) ?? []).length !== 1) throw new Error("CLI_CONFIG_PROFILE_SHAPE_INVALID");
  config = config.replace(/^project_id\s*=\s*"[^"]*"$/m, `project_id = "${projectId}"`);
  assert.match(config, new RegExp(`^project_id\\s*=\\s*"${projectId}"$`, "m"));
  config = updateTomlSectionValue(config, "api", "port", ports[0]);
  config = updateTomlSectionValue(config, "db", "port", ports[1]);
  config = updateTomlSectionValue(config, "db", "shadow_port", ports[2]);
  config = updateTomlSectionValue(config, "db.pooler", "port", ports[3]);
  config = updateTomlSectionValue(config, "studio", "port", ports[4]);
  config = updateTomlSectionValue(config, "local_smtp", "port", ports[5]);
  config = updateTomlSectionValue(config, "analytics", "port", ports[6]);
  config = updateTomlSectionValue(config, "edge_runtime", "inspector_port", ports[7]);
  config = ensureTomlSectionValue(config, "experimental.pgdelta", "enabled", false);
  fs.writeFileSync(configPath, config, "utf8");
   const profile = assertGeneratedCliConfig(workDirectory, { requirePgdeltaDisabled: true });
  if (profile.status !== "PASS") throw new Error(profile.code);
  return {
    projectId,
    ports: {
      api: ports[0],
      db: ports[1],
      shadow: ports[2],
      pooler: ports[3],
      studio: ports[4],
      smtp: ports[5],
      analytics: ports[6],
      inspector: ports[7]
    }
  };
}

function removeGeneratedCliWorkDirectory(workDirectory) {
  if (terminationUnknown) throw new Error("CLI_TERMINATION_UNKNOWN");
  const resolvedDirectory = path.resolve(workDirectory);
  const temporaryRoot = path.resolve(os.tmpdir());
  const samePath = process.platform === "win32"
    ? (left, right) => left.toLowerCase() === right.toLowerCase()
    : (left, right) => left === right;
  if (!samePath(path.dirname(resolvedDirectory), temporaryRoot)
      && !samePath(path.dirname(resolvedDirectory), path.resolve(process.cwd(), ".tmp", "gate1-local-replay"))) {
    throw new Error("CLI_WORK_DIRECTORY_SCOPE_INVALID");
  }
  if (!/^gate1-cli-(?:atomicity|bridge-replay|preview)-/.test(path.basename(resolvedDirectory))) {
    throw new Error("CLI_WORK_DIRECTORY_NAME_INVALID");
  }
  let stat = null;
  try {
    stat = fs.lstatSync(workDirectory);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (stat) {
    if (stat.isSymbolicLink()) throw new Error("CLI_WORK_DIRECTORY_REPARSE_POINT");
    const realDirectory = path.resolve(fs.realpathSync.native(workDirectory));
    if (!samePath(realDirectory, resolvedDirectory)) {
      throw new Error("CLI_WORK_DIRECTORY_REPARSE_POINT");
    }
  }
  fs.rmSync(workDirectory, { recursive: true, force: true });
  try {
    fs.lstatSync(workDirectory);
    throw new Error("CLI_WORK_DIRECTORY_RESIDUE_PRESENT");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return { status: 0 };
}

const cliExcludedServices = "edge-runtime,imgproxy,kong,realtime,studio,vector";
const cliRequiredImages = cliImageReferences;
const cliProjectLabelKeys = Object.freeze([
  "com.supabase.cli.project",
  "com.docker.compose.project"
]);
const cliProjectResourceKinds = Object.freeze(["container", "network", "volume"]);

function parseDockerJsonLines(stdout, kind) {
  const text = typeof stdout === "string" ? stdout : "";
  if (text.trim() === "") return [];
  const values = [];
  for (const line of text.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      return null;
    }
    if (!value || typeof value !== "object" || Array.isArray(value) || !resourceListIdentity(kind, value)) return null;
    values.push(value);
  }
  return values;
}

function cliProjectListArgs(kind, labelKey, projectId) {
  const label = `label=${labelKey}=${projectId}`;
  if (kind === "container") return ["ps", "-a", "--filter", label, "--format", "{{json .}}"];
  if (kind === "network") return ["network", "ls", "--filter", label, "--format", "{{json .}}"];
  if (kind === "volume") return ["volume", "ls", "--filter", label, "--format", "{{json .}}"];
  throw new Error("CLI_PROJECT_RESOURCE_KIND_INVALID");
}

function cliProjectInventory(projectId) {
  if (terminationUnknown) return { status: "UNKNOWN", code: "CLI_TERMINATION_UNKNOWN" };
  if (typeof projectId !== "string" || projectId.length > 40 || !/^gate1-ct-paid-v1-a3-[a-z0-9-]+$/i.test(projectId)) {
    return { status: "MISMATCH", code: "CLI_PROJECT_ID_INVALID" };
  }
  const resources = [];
  for (const kind of cliProjectResourceKinds) {
    for (const labelKey of cliProjectLabelKeys) {
      const result = runDocker(cliProjectListArgs(kind, labelKey, projectId));
      if (result.terminationUnknown === true || (result.signal && result.signal !== "NONE")) {
        return { status: "UNKNOWN", code: result.errorCode || "CLI_PROJECT_INVENTORY_UNKNOWN" };
      }
      if (result.exitCode !== 0) return { status: "UNKNOWN", code: "CLI_PROJECT_INVENTORY_FAILED" };
       const listed = parseDockerJsonLines(result.stdout, kind);
       if (!listed) return { status: "UNKNOWN", code: "CLI_PROJECT_INVENTORY_INCOMPLETE" };
       for (const value of listed) {
         const identity = resourceListIdentity(kind, value);
         const listedName = resourceListName(kind, value);
         if (!identity || !listedName) return { status: "UNKNOWN", code: "CLI_PROJECT_RESOURCE_ID_MISSING" };
         if (!resources.some((entry) => entry.kind === kind && entry.identity === identity)) {
           const resourceName = listedName;
          const inspected = inspectDockerResource(kind, resourceName);
          if (inspected.status !== "PRESENT") return { status: "UNKNOWN", code: "CLI_PROJECT_RESOURCE_INSPECTION_INCOMPLETE" };
          const labels = resourceLabels(inspected.value);
          if (labels["com.supabase.cli.project"] !== projectId || labels["com.docker.compose.project"] !== projectId) {
            return { status: "MISMATCH", code: "CLI_PROJECT_LABEL_MISMATCH" };
          }
          resources.push({ kind, identity, labelKey, value: inspected.value });
        }
      }
    }
  }
  return { status: "PASS", projectId, resources };
}

function assertCliProjectAbsent(projectId) {
  const inventory = cliProjectInventory(projectId);
  if (inventory.status !== "PASS") return inventory;
  if (inventory.resources.length > 0) return { status: "COLLISION", code: "CLI_PROJECT_RESOURCE_COLLISION" };
  return inventory;
}

function validateCliInventoryImageIdentities(inventory) {
  if (!cliCachedImageInventory) return { status: "UNKNOWN", code: "REQUIRED_LOCAL_IMAGE_CACHE_UNAVAILABLE" };
  for (const resource of inventory.resources) {
    if (resource.kind !== "container") continue;
    const name = resource.value.Names ?? resource.value.Name ?? resource.identity;
    const inspected = inspectDockerResource("container", String(name).replace(/^\//, ""));
    if (inspected.status !== "PRESENT") return { status: "UNKNOWN", code: "CLI_STOP_RESOURCE_INSPECTION_INCOMPLETE" };
    const imageId = inspected.value?.Image;
    const configuredImage = inspected.value?.Config?.Image;
    const cached = Object.values(cliCachedImageInventory).find((entry) => entry.id === imageId
      && (entry.reference === configuredImage || entry.repoDigest === configuredImage));
    if (!cached || !configuredImage) {
      return { status: "MISMATCH", code: "CLI_STOP_IMAGE_ID_DIGEST_MISMATCH" };
    }
  }
  return { status: "PASS" };
}

function stopGeneratedCliProject(workDirectory, projectId, stopArgs = ["stop", "--project-id", projectId, "--no-backup", "--yes"]) {
  if (terminationUnknown) return { status: null, errorCode: "CLI_TERMINATION_UNKNOWN", terminationUnknown: true };
  const images = assertRequiredLocalImages();
  if (!images.available) return { status: 1, errorCode: images.reason ?? "CLI_STOP_IMAGE_PREFLIGHT_BLOCKED", preflightBlocked: true };
  const before = cliProjectInventory(projectId);
  if (before.status !== "PASS") return { status: 1, errorCode: before.code ?? "CLI_STOP_INVENTORY_BLOCKED", preflightBlocked: true };
  const identities = validateCliInventoryImageIdentities(before);
  if (identities.status !== "PASS") return { status: 1, errorCode: identities.code, preflightBlocked: true };
  const stopped = runLocalSupabaseCli(workDirectory, stopArgs);
  if (stopped.terminationUnknown === true || stopped.terminationConfirmed !== true || stopped.signal !== "NONE" || stopped.errorCode !== "NONE" || stopped.status !== 0) {
    return {
      status: stopped.status,
      exitCode: stopped.status === 0 ? 0 : 1,
      signal: stopped.signal,
      errorCode: stopped.errorCode || "CLI_STOP_FAILED",
      terminationUnknown: stopped.terminationUnknown === true,
      terminationConfirmed: stopped.terminationConfirmed === true,
      timedOut: stopped.timedOut === true
    };
  }
  const after = cliProjectInventory(projectId);
  if (after.status !== "PASS") {
    return {
      status: 1,
      errorCode: after.status === "UNKNOWN" ? "CLI_STOP_RESIDUE_UNKNOWN" : (after.code ?? "CLI_STOP_RESIDUE_UNKNOWN")
    };
  }
  if (after.resources.length > 0) return { status: 1, errorCode: "CLI_STOP_RESOURCE_RESIDUE" };
  return { status: 0, exitCode: 0, terminationConfirmed: true, errorCode: "NONE" };
}

function assertRequiredLocalImages() {
  const inventory = {};
  const missing = [];
  for (const image of cliRequiredImages) {
    const inspected = imageInspection(image);
    if (inspected.status !== "PASS") {
      missing.push(image);
    } else {
      inventory[image] = {
        reference: image,
        id: inspected.id,
        digest: inspected.digest,
        repoDigest: inspected.repoDigest
      };
    }
  }
  if (missing.length > 0) {
    return { available: false, missingCount: missing.length, missingImages: missing.map((image) => image.replace(/^.*\//, "")) };
  }
  if (cliCachedImageInventory) {
    for (const image of cliRequiredImages) {
      const before = cliCachedImageInventory[image];
      const after = inventory[image];
      if (!before || !after || before.reference !== after.reference || before.id !== after.id || before.digest !== after.digest || before.repoDigest !== after.repoDigest) {
        return { available: false, missingCount: 0, reason: "REQUIRED_LOCAL_IMAGE_ID_DIGEST_CHANGED" };
      }
    }
  } else {
    cliCachedImageInventory = inventory;
  }
  return { available: true, missingCount: 0, imageCount: cliRequiredImages.length, inventory };
}

function cliDatabaseContainer(workDirectory) {
  const configPath = path.join(workDirectory, "supabase", "config.toml");
  const config = fs.readFileSync(configPath, "utf8");
  const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1] ?? "";
  if (!projectId) throw new Error("CLI_PROJECT_ID_UNAVAILABLE");
  const listed = runDocker(["ps", "--format", "{{.ID}}|{{.Names}}"]);
  if (listed.exitCode !== 0) throw new Error("CLI_DATABASE_CONTAINER_UNAVAILABLE");
  const candidates = listed.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|"))
    .filter(([id, name]) => id && name && name.includes(projectId) && /(?:^|[-_])db(?:[-_]|$)/i.test(name))
    .map(([id]) => id);
  if (candidates.length !== 1) throw new Error("CLI_DATABASE_CONTAINER_UNAVAILABLE");
  return candidates[0];
}

function cliRuntimeIdentity(workDirectory, expectedHostPort) {
  const assertionFile = path.join(workDirectory, "runtime-identity.sql");
  fs.writeFileSync(assertionFile, `select json_build_object(
    'database', current_database(),
    'serverPort', inet_server_port(),
    'serverVersionNum', current_setting('server_version_num')
  );\n`, "utf8");
  const identity = runCliQuery(workDirectory, assertionFile);
  assert.equal(identity.database, "postgres", "CLI runtime database identity");
  assert.equal(Number(identity.serverPort), 5432, "CLI runtime database port identity");
  assert.match(String(identity.serverVersionNum), /^17/, "CLI runtime PostgreSQL major");
  return {
    database: "postgres",
    serverPort: Number(identity.serverPort),
    hostPort: expectedHostPort,
    postgresMajor: 17
  };
}

function catalogFixtureSqlLiteral(value) {
  assert.equal(typeof value, "string", "catalog fixture identifier is a string");
  assert.match(value, /^[a-z0-9_]+$/, "catalog fixture identifier is safe");
  return `'${value}'`;
}

function legacyPublicTableStructureCountSql() {
  const fixture = readJson(bridgeStatesPath);
  const canonical = assertCanonicalStructuralState(fixture.canonical);
  const canonicalPublicNames = new Set(
    canonical.tables
      .filter(({ schema }) => schema === "public")
      .map(({ name }) => name)
  );
  const legacyTables = fixture.legacy?.tables;
  assert.ok(Array.isArray(legacyTables) && legacyTables.length > 0, "legacy table fixture is present");
  const predicates = legacyTables.map((table) => {
    assert.equal(table.schema, "public", "legacy table fixture is public");
    assert.match(table.name, /^[a-z0-9_]+$/, "legacy table fixture name is safe");
    const columnNames = table.columns.map(({ name }) => {
      assert.match(name, /^[a-z0-9_]+$/, "legacy column fixture name is safe");
      return name;
    });
    assert.ok(columnNames.length > 0, "legacy table fixture has columns");
    const columnList = columnNames.map(catalogFixtureSqlLiteral).join(", ");
    return `(
      n.nspname = ${catalogFixtureSqlLiteral(table.schema)}
      and c.relname = ${catalogFixtureSqlLiteral(table.name)}
      and (select count(*) from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) = ${columnNames.length}
      and not exists (
        select 1
        from pg_attribute a
        where a.attrelid = c.oid
          and a.attnum > 0
          and not a.attisdropped
          and a.attname not in (${columnList})
      )
    )`;
  });
  const canonicalOverlap = legacyTables
    .filter(({ schema, name }) => schema === "public" && canonicalPublicNames.has(name))
    .map(({ name }) => name);
  assert.equal(canonicalOverlap.length, 1, "catalog fixture has one canonical/legacy identity overlap");
  return `(select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r','p')
      and (${predicates.join(" or ")}))`;
}

function cliCanonicalCatalogAssertionSql() {
  const source = fs.readFileSync(bridgePath, "utf8").replace(/\r\n?/g, "\n");
  const start = source.indexOf("\n  with\n  known_tables as");
  const end = source.indexOf("\n  select jsonb_object_agg(scope_name, state)\n  into v_states", start);
  assert.ok(start >= 0 && end > start, "bridge catalog query boundaries");
  const cte = source.slice(start + 1, end);
  return `${cte}\nselect jsonb_object_agg(scope_name, state) from states;\n`;
}

const cliAtomicityAssertionSql = Object.freeze({
  failed: `select json_build_object(
    'publicLegacyTables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p') and c.relname in ('comment_translator_paid_entitlements','comment_translator_paid_usage_counters','comment_translator_paid_usage_events')),
    'publicLegacyFunctions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('apply_comment_translator_paid_entitlement_evidence','apply_comment_translator_paid_usage','sync_comment_translator_paid_usage_from_entitlement')),
    'archiveSchemaCount', (select count(*) from pg_namespace where nspname = 'comment_translator_paid_legacy_archive'),
    'archiveTables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'comment_translator_paid_legacy_archive' and c.relkind in ('r','p')),
    'archiveFunctions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'comment_translator_paid_legacy_archive'),
    'archiveTriggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'comment_translator_paid_legacy_archive' and not t.tgisinternal),
    'historyCount', (select count(*) from supabase_migrations.schema_migrations),
    'historyVersionPresent', exists (select 1 from pg_catalog.pg_tables where schemaname = 'supabase_migrations' and tablename = 'schema_migrations' and exists (select 1 from supabase_migrations.schema_migrations where version = '20260811000000'))
  );`,
  succeeded: `select json_build_object(
    'publicLegacyTables', ${legacyPublicTableStructureCountSql()},
    'publicLegacyFunctions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('apply_comment_translator_paid_entitlement_evidence','apply_comment_translator_paid_usage','sync_comment_translator_paid_usage_from_entitlement')),
    'archiveSchemaCount', (select count(*) from pg_namespace where nspname = 'comment_translator_paid_legacy_archive'),
    'archiveTables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'comment_translator_paid_legacy_archive' and c.relkind in ('r','p')),
    'archiveFunctions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'comment_translator_paid_legacy_archive'),
    'archiveTriggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'comment_translator_paid_legacy_archive' and not t.tgisinternal),
    'historyCount', (select count(*) from supabase_migrations.schema_migrations),
    'historyVersionPresent', exists (select 1 from supabase_migrations.schema_migrations where version = '20260811000000')
  );`
});

function runCliQuery(workDirectory, sqlFile) {
  const result = runLocalSupabaseCli(workDirectory, ["db", "query", "--local", "-o", "json", "--file", sqlFile]);
  try {
    if (result.terminationUnknown === true) throw new Error("CLI_TERMINATION_UNKNOWN");
    if (result.timedOut === true) throw new Error("CLI_TIMEOUT");
    if (result.captureFailure === true) throw new Error("CLI_CAPTURE_FAILURE");
    if (result.cliDiagnostics?.stdoutTruncated === true) throw new Error("CLI_QUERY_STDOUT_TRUNCATED");
    if (result.status !== 0) throw new Error(`CLI_QUERY_${classifyLocalCliResult(result)}`);
    return parseCliQueryJson(result.stdout);
  } catch (error) {
    error.cliDiagnostics = localCliFailureDiagnostics(result);
    throw error;
  }
}

function assertCliAtomicState(state, expected, label) {
  for (const [key, value] of Object.entries(expected)) assert.equal(state[key], value, `${label}.${key}`);
}

function migrationListCount(output) {
  const versions = [...String(output ?? "").matchAll(/\b(\d{14})\b/g)].map((match) => match[1]);
  return new Set(versions).size;
}

function migrationListVersions(output) {
  return new Set([...String(output ?? "").matchAll(/\b(\d{14})\b/g)].map((match) => match[1]));
}

function runCliIsolatedBridgeReplayCase(inputRows) {
  if (!fs.existsSync(typeof localCliProfile === "string" && localCliProfile === "preview-pinned-go" ? previewGoCliPath : supabaseCliPath)) return { status: "SETUP_BLOCKED", reason: "SUPABASE_CLI_MISSING" };
  cliCachedImageInventory = null;
  const versionCheck = cliVersionResult();
  if (versionCheck.status !== "PASS") return { status: "SETUP_BLOCKED", reason: versionCheck.code ?? "SUPABASE_CLI_VERSION_UNAVAILABLE" };
  const imageCheck = assertRequiredLocalImages();
  if (!imageCheck.available) {
    return { status: "SETUP_BLOCKED", reason: "REQUIRED_LOCAL_IMAGE_MISSING", missingImageCount: imageCheck.missingCount };
  }

  const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gate1-cli-bridge-replay-"));
  let phase = "WORK_DIRECTORY_CREATED";
  let runtime = null;
  let result = null;
  try {
    result = (() => {
      phase = "CLI_INIT";
      const init = runLocalSupabaseCli(workDirectory, ["init", "--force"]);
      if (init.status !== 0) return { status: "SETUP_BLOCKED", phase, reason: "SUPABASE_CLI_INIT_FAILED" };

      phase = "CLI_RUNTIME_CONFIGURE";
      runtime = configureDisposableCliRuntime(workDirectory);
      const migrationsDirectory = path.join(workDirectory, "supabase", "migrations");
      fs.mkdirSync(migrationsDirectory, { recursive: true });
      assert.equal(fs.lstatSync(migrationsDirectory).isSymbolicLink(), false, "CLI migrations directory is not a symlink");

      phase = "CLI_START";
      const started = runLocalSupabaseCli(workDirectory, ["start", "--ignore-health-check", "--exclude", cliExcludedServices]);
      if (started.status !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_RUNTIME_UNAVAILABLE",
          failureClass: classifyLocalCliResult(started),
          failureDiagnostics: localCliFailureDiagnostics(started),
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }

      phase = "CLI_STATUS";
      const status = runLocalSupabaseCli(workDirectory, ["status", "-o", "json"]);
      if (status.status !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_RUNTIME_STATUS_FAILED",
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }

      phase = "RUNTIME_IDENTITY";
      const runtimeIdentity = cliRuntimeIdentity(workDirectory, runtime.ports.db);

      phase = "WRITE_PRE_BRIDGE_MIGRATIONS";
      const preBridgeMigrations = repositoryMigrationNamesBeforeBridge();
      const preBridgeSet = new Set(preBridgeMigrations);
      for (const migrationName of preBridgeMigrations) {
        fs.writeFileSync(path.join(migrationsDirectory, migrationName), canonicalMigrationBytes(migrationName));
      }
      for (const row of inputRows) {
        assert.equal(preBridgeSet.has(row.fileName), true, `${row.fileName} must precede bridge`);
        const recoveredSource = canonicalSourceBytes(path.join(legacyDir, row.fileName)).toString("utf8");
        const recoveredStatements = splitRecoveredSql(recoveredSource);
        assert.ok(recoveredStatements.length > 0, `${row.fileName} has executable statements`);
        fs.writeFileSync(
          path.join(migrationsDirectory, row.fileName),
          `${recoveredStatements.join("\n")}\n`,
          "utf8"
        );
      }

      phase = "CLI_PRE_BRIDGE_RESET";
      const reset = runLocalSupabaseCli(workDirectory, ["db", "reset", "--local", "--no-seed"]);
      if (reset.status !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_PRE_BRIDGE_RESET_FAILED",
          failureClass: classifyLocalCliResult(reset),
          failureDiagnostics: localCliFailureDiagnostics(reset),
          preBridgeMigrationCount: preBridgeMigrations.length,
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }

      phase = "BOOTSTRAP_CLI_EXTERNAL_DEPENDENCY";
      const externalDependencySql = `create extension if not exists pg_cron;
do $$
begin
  if to_regclass('cron.job') is null then
    raise exception 'CLI pg_cron catalog unavailable';
  end if;
end
$$;
`;
      const externalDependency = runDockerDiscardingOutput([
        "exec",
        "--interactive",
        cliDatabaseContainer(workDirectory),
        "psql",
        "--no-psqlrc",
        "--quiet",
        "--set=ON_ERROR_STOP=1",
        "--username=postgres",
        "--dbname=postgres"
      ], externalDependencySql);
      if (externalDependency.exitCode !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_EXTERNAL_DEPENDENCY_UNAVAILABLE",
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }

      phase = "APPLY_ORIGINAL_BRIDGE_SINGLE_TRANSACTION";
      const bridgeReplay = runStreamedDockerInput([
        "exec",
        "--interactive",
        cliDatabaseContainer(workDirectory),
        "psql",
        "--no-psqlrc",
        "--quiet",
        "--set=ON_ERROR_STOP=1",
        "--single-transaction",
        "--username=postgres",
        "--dbname=postgres"
      ], bridgePath, { bridgeSourceFile: bridgePath });
      const bridgeAssertionCode = bridgeReplay.bridgeAssertionCode;
      const bridgeAssertionInputCount = bridgeReplay.bridgeAssertionInputCount;
      const bridgeAssertionAllowlistMatch = bridgeReplay.bridgeAssertionAllowlistMatch;
      const baseResult = {
        preBridgeMigrationCount: preBridgeMigrations.length,
        bridgeApplication: "ORIGINAL_REPOSITORY_SOURCE",
        singleTransaction: "PASS",
        bridgeAssertionCode,
        bridgeAssertionInputCount,
        bridgeAssertionAllowlistMatch,
        rawOutput: "NOT_RETAINED",
        projectId: "UNIQUE_GENERATED",
        ports: runtime.ports,
        runtimeIdentity
      };
      if (bridgeReplay.terminationUnknown === true || bridgeReplay.timedOut === true || bridgeReplay.captureFailure === true || bridgeReplay.signal !== "NONE" || bridgeReplay.errorCode !== "NONE") {
        return {
          status: "FAIL",
          reason: bridgeReplay.terminationUnknown === true ? "CLI_TERMINATION_UNKNOWN" : "CLI_BRIDGE_RUNNER_FAILURE",
          failureClass: classifyLocalCliResult(bridgeReplay),
          ...baseResult
        };
      }
      if (bridgeReplay.status === 0) {
        return { status: "PASS", diagnosis: "NO_ALLOWLISTED_ASSERTION", ...baseResult };
      }
      if (bridgeAssertionCode !== "NONE" && bridgeAssertionAllowlistMatch === true) {
        return { status: "PASS", diagnosis: "ASSERTION_IDENTIFIED", ...baseResult };
      }
      return {
        status: "FAIL",
        reason: "ISOLATED_BRIDGE_ASSERTION_UNIDENTIFIED",
        ...baseResult
      };
    })();
  } catch (error) {
    const setupBlocked = /^CLI_(?:CONFIG|PROJECT_ID)_/.test(error?.message ?? "");
    result = {
      status: setupBlocked ? "SETUP_BLOCKED" : "FAIL",
      reason: setupBlocked ? error.message : `${phase}_${safeCaseReason(error)}`,
      projectId: runtime ? "UNIQUE_GENERATED" : "NOT_STARTED"
    };
  } finally {
    const cleanup = cleanupGeneratedRuntimeResources({
      cliProjectId: runtime?.projectId && cliStartAttemptedProjects.has(runtime.projectId) ? runtime.projectId : "",
      stopCli: (projectId) => stopGeneratedCliProject(workDirectory, projectId, ["stop", "--project-id", projectId, "--no-backup", "--yes"]),
      workDirectory,
      removeDirectory: removeGeneratedCliWorkDirectory
    });
    if (cleanup.status !== "PASS") {
      result = {
        status: "FAIL",
        reason: "GENERATED_RESOURCE_CLEANUP_FAILED",
        cleanup
      };
    } else {
      result = {
        ...(result ?? { status: "FAIL", reason: "CLI_CASE_NO_RESULT" }),
        generatedResourceCleanup: cleanup
      };
    }
  }
  return result;
}

function verifiedPostapplyContainer(projectId) {
  if (!assertRequiredLocalImages().available) throw new Error("POSTAPPLY_IMAGE_UNAVAILABLE");
  const inventory = cliProjectInventory(projectId);
  if (inventory.status !== "PASS") throw new Error("POSTAPPLY_OWNERSHIP_UNAVAILABLE");
  const cached = cliCachedImageInventory?.[disposableDatabaseImage];
  if (!cached) throw new Error("POSTAPPLY_IMAGE_UNAVAILABLE");
  const candidates = inventory.resources.filter((resource) => resource.kind === "container"
    && resource.value?.Image === cached.id
    && [cached.reference, cached.repoDigest].includes(resource.value?.Config?.Image));
  if (candidates.length !== 1) throw new Error("POSTAPPLY_DATABASE_AMBIGUOUS");
  const first = candidates[0].value;
  if (typeof first.Id !== "string" || !/^[a-f0-9]{64}$/.test(first.Id)) throw new Error("POSTAPPLY_CONTAINER_ID_INVALID");
  const inspected = inspectDockerResource("container", first.Id);
  const current = inspected.value;
  if (inspected.status !== "PRESENT" || current?.Id !== first.Id
    || current?.Name !== first.Name || current?.Created !== first.Created
    || current?.Image !== cached.id || ![cached.reference, cached.repoDigest].includes(current?.Config?.Image)
    || current?.State?.Running !== true
    || resourceLabels(current)["com.supabase.cli.project"] !== projectId
    || resourceLabels(current)["com.docker.compose.project"] !== projectId) {
    throw new Error("POSTAPPLY_CONTAINER_IDENTITY_CHANGED");
  }
  return current.Id;
}

function normalizeLocalPostapplyArtifact(artifact) {
  const copy = structuredClone(artifact);
  const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  for (const scope of ["canonical", "archive", "sourceEra"]) {
    copy[scope].tables.sort((left, right) => compare(`${left.schema}.${left.name}`, `${right.schema}.${right.name}`));
    copy[scope].functions.sort((left, right) => compare(`${left.schema}.${left.name}(${left.identityArguments})`, `${right.schema}.${right.name}(${right.identityArguments})`));
    copy[scope].triggers.sort((left, right) => compare(`${left.tableSchema}.${left.tableName}.${left.name}`, `${right.tableSchema}.${right.tableName}.${right.name}`));
  }
  for (const scope of ["canonical", "archive", "sourceEra"]) {
    const edgeKey = (edge) => JSON.stringify({
      classid: edge.classid, refclassid: edge.refclassid, deptype: edge.deptype,
      dependent: { type: edge.dependent?.type, schema: edge.dependent?.schema, name: edge.dependent?.name, identity: edge.dependent?.identity },
      referenced: { type: edge.referenced?.type, schema: edge.referenced?.schema, name: edge.referenced?.name, identity: edge.referenced?.identity }
    });
    copy.pgDependEdges[scope].sort((left, right) => compare(edgeKey(left), edgeKey(right)));
  }
  return copy;
}

function readLocalPostapplyRow(projectId) {
  const containerId = verifiedPostapplyContainer(projectId);
  const capture = runDocker([
    "exec", "--interactive", "--env", "PGOPTIONS=-c default_transaction_read_only=on", containerId,
    "psql", "--no-psqlrc", "--no-password", "--quiet", "--tuples-only", "--no-align",
    "--set=ON_ERROR_STOP=1", "--username=postgres", "--dbname=postgres"
  ], POSTAPPLY_CATALOG_SQL, { captureByteLimit: 1024 * 1024 });
  if (capture.exitCode !== 0 || capture.signal !== "NONE" || capture.errorCode !== "NONE"
    || capture.terminationUnknown !== false || capture.captureFailure !== false
    || typeof capture.stdout !== "string" || typeof capture.stderr !== "string" || capture.stderr !== ""
    || Buffer.byteLength(capture.stdout, "utf8") + Buffer.byteLength(capture.stderr, "utf8") > 1024 * 1024) {
    const failure = new Error("POSTAPPLY_QUERY_CAPTURE_INVALID");
    failure.cliDiagnostics = {
      failureClass: "POSTAPPLY_QUERY_CAPTURE_INVALID",
      exitCode: Number.isInteger(capture.exitCode) ? capture.exitCode : null,
      errorCode: typeof capture.errorCode === "string" && /^[A-Z0-9_-]{1,64}$/.test(capture.errorCode) ? capture.errorCode : "UNKNOWN",
      signalPresent: capture.signal !== "NONE",
      terminationUnknown: capture.terminationUnknown === true,
      captureFailure: capture.captureFailure === true,
      stdoutBytes: typeof capture.stdout === "string" ? Buffer.byteLength(capture.stdout, "utf8") : null,
      stderrBytes: typeof capture.stderr === "string" ? Buffer.byteLength(capture.stderr, "utf8") : null
    };
    throw failure;
  }
  const lines = capture.stdout.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length !== 1) throw new Error("POSTAPPLY_QUERY_ROW_COUNT");
  let row;
  try {
    row = parseStrictJson(lines[0]);
  } catch {
    throw new Error("POSTAPPLY_QUERY_JSON_INVALID");
  }
  const keys = ["readOnly", "history", "canonical", "archive", "sourceEra", "edgeScopeVersion", "pgDependEdges"];
  if (!row || typeof row !== "object" || Array.isArray(row)
    || Object.keys(row).length !== keys.length || !keys.every((key) => Object.hasOwn(row, key))) {
    throw new Error("POSTAPPLY_QUERY_ROW_SHAPE");
  }
  return row;
}

function assertLocalPostapplyObservation(row) {
  // These sentinel annotations are only inputs to a local shape-refusal check.
  // They are never a source revision, target binding, receipt, or hosted evidence.
  const artifact = normalizeLocalPostapplyArtifact({
    schemaVersion: 2, target: "production",
    sourceCommit: "0".repeat(40), migrationCorpusSha256: "0".repeat(64),
    targetBindingSha256: "0".repeat(64), ...row
  });
  assert.deepEqual(artifact.readOnly, {
    serverVersionMajor: "17", transactionReadOnly: "on",
    defaultTransactionReadOnly: "on", transactionIsolation: "repeatable read"
  }, "local query read-only boundary");
  const expectedHistory = repositoryMigrationNames().map((name) => {
    const match = /^(\d{14})_([a-z0-9_]+)\.sql$/.exec(name);
    assert.ok(match, "repository migration filename");
    return { version: match[1], name: match[2] };
  }).sort((a, b) => a.version < b.version ? -1 : a.version > b.version ? 1 : 0);
  assert.equal(expectedHistory.length, 56, "exact repository history");
  assert.deepEqual(artifact.history, { rows: expectedHistory }, "independently selected history");
  const expected = assertCanonicalStructuralState(readJson(bridgeStatesPath).canonical);
  const observed = projectCanonicalStructuralState(artifact.canonical);
  assert.ok(canonicalStructuralEqual(observed, expected), "independent canonical structure");
  assert.equal(artifact.archive.tables.length, 3);
  assert.equal(artifact.archive.functions.length, 3);
  assert.equal(artifact.archive.triggers.length, 1);
  assert.equal(artifact.sourceEra.tables.length, 0);
  assert.equal(artifact.sourceEra.functions.length, 0);
  assert.equal(artifact.sourceEra.triggers.length, 0);
  assert.equal(artifact.pgDependEdges.sourceEra.length, 0);
  const inspection = inspectPostApplyCatalogArtifact(artifact);
  assert.equal(inspection.status, "POSTAPPLY_CATALOG_SHAPE_INVALID", "local replay cannot establish Production");
  assert.equal(inspection.reason, "source-era-mismatch", "only the known missing source era is expected");
  return {
    sqlExecution: "PASS", canonicalStructural: "PASS", migrationHistory: "PASS",
    migrationHistoryCount: expectedHistory.length,
    archiveTableCount: artifact.archive.tables.length, archiveFunctionCount: artifact.archive.functions.length,
    sourceEraTableCount: 0, sourceEraFunctionCount: 0,
    productionShape: "NOT_ESTABLISHED", shapeRefusal: "source-era-mismatch", hostedEvidence: false,
    querySha256: crypto.createHash("sha256").update(POSTAPPLY_CATALOG_SQL).digest("hex"),
    localArtifactSha256: crypto.createHash("sha256").update(JSON.stringify(artifact)).digest("hex")
  };
}

function runCliPreviewConvergenceCase() {
  // All writes are confined to a newly owned local CLI project. Hosted input
  // contains only two function definitions and metadata, never production rows.
  const fixture = readJson(path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-preview-entry-observation.json"));
  const inputPath = process.env.GATE1_PREVIEW_REPRODUCTION_INPUT;
  assert.ok(inputPath && fs.existsSync(inputPath), "PREVIEW_REPRODUCTION_INPUT_REQUIRED");
  const input = readJson(inputPath);
  assert.equal(input.functions.length, 2, "PREVIEW_TWO_SEMANTIC_INPUTS");
  const expected = readJson(bridgeStatesPath).canonical;
  for (const name of ["ct_paid_azure_direct_fallback", "ct_paid_record_provider_hourly_detail"]) {
    const rows = input.functions.filter(f => f.name === name);
    assert.equal(rows.length, 1, "PREVIEW_INPUT_IDENTITY");
    const row = rows[0];
    assert.equal(md5Bytes(row.definition), fixture.canonical.functions.find(f => f.name === name).definitionMd5, "PREVIEW_INPUT_HASH");
    assert.equal(highConfidenceSecretPattern.test(row.definition), false, "PREVIEW_INPUT_SECRET_REJECTED");
  }
  const old = spawnSync("git", ["show", "a7532540c5a4d3998b36eaf1dec45d741348a810:supabase/migrations/20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql"], { cwd: root, encoding: "utf8", timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(old.status, 0, "PREVIEW_OLD_BRIDGE_REQUIRED");
  localCliProfile = "preview-pinned-go";
  const version = cliVersionResult();
  if (version.status !== "PASS") return { status: "SETUP_BLOCKED", reason: "SUPABASE_CLI_VERSION_UNAVAILABLE" };
  cliCachedImageInventory = null;
  if (!assertRequiredLocalImages().available) return { status: "SETUP_BLOCKED", reason: "REQUIRED_LOCAL_IMAGE_MISSING" };
  const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gate1-cli-preview-"));
  let runtime = null;
  let phase = "CLI_INIT";
  let result;
  let lastLocalSqlFailure = null;
  try {
    const init = runLocalSupabaseCli(workDirectory, ["init", "--force"]);
    assert.equal(init.status, 0, "PREVIEW_CLI_INIT");
    runtime = configureDisposableCliRuntime(workDirectory);
    phase = "CLI_START";
    const start = runLocalSupabaseCli(workDirectory, ["start", "--ignore-health-check", "--exclude", cliExcludedServices]);
    if (start.status !== 0) {
      const failure = new Error("PREVIEW_CLI_START");
      failure.cliDiagnostics = localCliFailureDiagnostics(start);
      throw failure;
    }
    const runtimeIdentity = cliRuntimeIdentity(workDirectory, runtime.ports.db);
    const containerId = verifiedPostapplyContainer(runtime.projectId);
    const sql = (text, allowFailure = false, role = localObjectRole) => {
      assert.ok([localObjectRole, localAdminRole].includes(role), "PREVIEW_LOCAL_ROLE_ALLOWLIST");
      const response = runDocker(["exec", "--interactive", containerId, "psql", "--no-psqlrc", "--no-password", "--quiet", "--tuples-only", "--no-align", "--set=ON_ERROR_STOP=1", `--username=${role}`, "--dbname=postgres"], text, { captureByteLimit: 2 * 1024 * 1024 });
      assert.equal(response.terminationUnknown, false, "PREVIEW_PSQL_TERMINATION");
      assert.equal(response.captureFailure, false, "PREVIEW_PSQL_CAPTURE");
      if (response.exitCode !== 0) lastLocalSqlFailure = {phase,stderr:response.stderr};
      if (!allowFailure && response.exitCode !== 0) {
        const diagnosticsPath = process.env.GATE1_LOCAL_DIAGNOSTICS_PATH;
        if (diagnosticsPath) {
          const resolved = path.resolve(diagnosticsPath + ".psql.json");
          assert.ok(resolved.startsWith(path.resolve(root, ".tmp") + path.sep), "PREVIEW_DIAGNOSTICS_SCOPE");
          assert.equal(highConfidenceSecretPattern.test(response.stderr), false, "PREVIEW_DIAGNOSTICS_SECRET_REJECTED");
          fs.writeFileSync(resolved, JSON.stringify({phase,stderr:response.stderr}, null, 2), {flag:"wx"});
        }
        throw new Error("PREVIEW_LOCAL_SQL_FAILED");
      }
      return response;
    };
    const json = text => JSON.parse(sql(text).stdout.trim());
    const postgresSearchPath = json("select to_jsonb(current_setting('search_path')); ");
    assert.equal(typeof postgresSearchPath, "string", "PREVIEW_POSTGRES_SEARCH_PATH");
    // SET ROLE does not load the target role's per-role GUCs. Match the actual
    // postgres connection's deparser context before running the bridge.
    const postgresContextSql = `set local role postgres; select set_config('search_path', ${sqlLiteral(postgresSearchPath)}, true);`;
    const cron = fixture.cron;
    const insertPreviewCronSql = `insert into cron.job (schedule, command, nodename, nodeport, database, username, active, jobname) values (${sqlLiteral(cron.schedule)}, ${sqlLiteral(cron.command)}, ${sqlLiteral(cron.nodename)}, ${cron.nodeport}, ${sqlLiteral(cron.database)}, ${sqlLiteral(cron.username)}, false, ${sqlLiteral(cron.jobname)});`;
    const migrationNames = repositoryMigrationNames();
    const migrationsDirectory = path.join(workDirectory, "supabase", "migrations");
    fs.mkdirSync(migrationsDirectory, { recursive: true });
    phase = "BOOTSTRAP_CANONICAL";
    sql("create extension if not exists pg_cron;");
    phase = "LOCAL_FIXTURE_ROLE_PREFLIGHT";
    sql(`begin;\n${insertPreviewCronSql}\n${postgresContextSql}\nrollback;`, false, localAdminRole);
    phase = "BOOTSTRAP_CANONICAL";
    for (const name of migrationNames.filter(n => n !== `${forwardConvergenceMigration}.sql`)) fs.writeFileSync(path.join(migrationsDirectory, name), canonicalMigrationBytes(name));
    const bootstrap = runLocalSupabaseCli(workDirectory, ["migration", "up", "--local", "--include-all"]);
    if (bootstrap.status !== 0) {
      const diagnosticsPath = process.env.GATE1_LOCAL_DIAGNOSTICS_PATH;
      if (diagnosticsPath) {
        const resolved = path.resolve(diagnosticsPath);
        const privateRoot = path.resolve(root, ".tmp");
        assert.ok(resolved.startsWith(privateRoot + path.sep), "PREVIEW_DIAGNOSTICS_SCOPE");
        assert.equal(highConfidenceSecretPattern.test(bootstrap.stderr), false, "PREVIEW_DIAGNOSTICS_SECRET_REJECTED");
        fs.writeFileSync(resolved, JSON.stringify({phase, stderr:bootstrap.stderr}, null, 2), {flag:"wx"});
      }
      const failure = new Error("PREVIEW_CANONICAL_BOOTSTRAP");
      failure.cliDiagnostics = localCliFailureDiagnostics(bootstrap);
      throw failure;
    }
    phase = "CHECK_A3_NATIVE_SQL";
    sql(`begin;\n${canonicalMigrationBytes(`${forwardConvergenceMigration}.sql`).toString("utf8")}\nrollback;`);
    fs.writeFileSync(path.join(migrationsDirectory, `${forwardConvergenceMigration}.sql`), canonicalMigrationBytes(`${forwardConvergenceMigration}.sql`));
    phase = "BOOTSTRAP_A3_CLI";
    const bootstrapForward = runLocalSupabaseCli(workDirectory, ["migration", "up", "--local", "--include-all"]);
    assert.equal(bootstrapForward.status, 0, "PREVIEW_A3_CLI_BOOTSTRAP");
    const baseline = normalizeLocalPostapplyArtifact(readLocalPostapplyRow(runtime.projectId));
    const baselineStructure = projectCanonicalStructuralState(baseline.canonical);
    if (!canonicalStructuralEqual(baselineStructure, expected)) {
      const differences = [];
      for (const kind of ["tables", "functions", "triggers"]) {
        for (const row of baselineStructure[kind]) {
          const final = expected[kind].find(r => r.name === row.name && r.identityArguments === row.identityArguments && r.tableName === row.tableName);
          const fields = Object.keys(row).filter(k => JSON.stringify(sortKeysDeep(row[k])) !== JSON.stringify(sortKeysDeep(final?.[k])));
          if (fields.length) differences.push({kind,name:row.name,fields,...(fields.includes("definitionMd5") ? {observedMd5:row.definitionMd5,expectedMd5:final?.definitionMd5} : {})});
        }
      }
      if (JSON.stringify(sortKeysDeep(baselineStructure.dependencyCounts)) !== JSON.stringify(sortKeysDeep(expected.dependencyCounts))) differences.push({kind:"dependencyCounts",observed:baselineStructure.dependencyCounts,expected:expected.dependencyCounts});
      const failure = new Error("PREVIEW_CANONICAL_BASELINE");
      failure.cliDiagnostics = {differences};
      throw failure;
    }
    phase = "CANONICAL_ENTRY_COMPATIBILITY";
    sql(`begin;\n${canonicalMigrationBytes(path.basename(bridgePath)).toString("utf8")}\nrollback;`);
    assert.ok(canonicalStructuralEqual(projectCanonicalStructuralState(normalizeLocalPostapplyArtifact(readLocalPostapplyRow(runtime.projectId)).canonical), expected), "PREVIEW_CANONICAL_ENTRY_PRESERVED");
    const canonicalCronRefusal = sql(`begin;\n${insertPreviewCronSql}\n${postgresContextSql}\n${canonicalMigrationBytes(path.basename(bridgePath)).toString("utf8")}\ncommit;`, true, localAdminRole);
    assert.notEqual(canonicalCronRefusal.exitCode, 0, "PREVIEW_NO_GENERIC_CANONICAL_CRON_EXCEPTION");
    assert.ok(canonicalCronRefusal.stderr.includes("Gate 1 Paid Cron job already exists"), "PREVIEW_CANONICAL_CRON_EXPECTED_REFUSAL");
    phase = "REPRODUCE_OBSERVED_ENTRY";
    const reproductionStatements = [];
    for (const identity of fixture.newlineOnlyFunctions) {
      const desired = expected.functions.find(f => f.name === identity.name && f.identityArguments === identity.identityArguments);
      assert.ok(desired, "PREVIEW_NEWLINE_IDENTITY");
      // Replace on the server: Windows stdin must not normalize the CRLF body.
      reproductionStatements.push(`do $reproduce$ declare definition text; begin
        select pg_get_functiondef(p.oid) into strict definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname=${sqlLiteral(identity.schema)} and p.proname=${sqlLiteral(identity.name)} and pg_get_function_identity_arguments(p.oid)=${sqlLiteral(identity.identityArguments)};
        execute replace(definition, E'\\n', E'\\r\\n');
      end $reproduce$;`);
    }
    for (const row of input.functions) reproductionStatements.push(`do $reproduce$ begin execute convert_from(decode('${Buffer.from(row.definition, "utf8").toString("hex")}', 'hex'), 'UTF8'); end $reproduce$;`);
    // Restore only the four observed pre-convergence ACL differences.
    for (const table of fixture.canonical.tables) {
      const final = expected.tables.find(t => t.name === table.name);
      if (JSON.stringify(sortKeysDeep(table.acls)) === JSON.stringify(sortKeysDeep(final.acls))) continue;
      for (const acl of table.acls.filter(a => a.grantee !== "postgres")) {
        assert.equal(acl.grantable, false, "PREVIEW_TABLE_ACL_GRANTABLE");
        assert.match(acl.privilege, /^(SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|MAINTAIN)$/);
        assert.ok(["PUBLIC", "anon", "authenticated", "service_role"].includes(acl.grantee));
        reproductionStatements.push(`grant ${acl.privilege} on table public.${sqlIdentifier(table.name)} to ${acl.grantee === "PUBLIC" ? "public" : sqlIdentifier(acl.grantee)};`);
      }
    }
    reproductionStatements.push("grant execute on function public.ct_paid_schedule_durable_reconciliation() to public, anon, authenticated, service_role;");
    sql(`begin;\n${reproductionStatements.join("\n")}\ncommit;`);
    // Synthetic values only. No reads of either encrypted or decrypted secret.
    for (const name of fixture.vaultNames) sql(`select vault.create_secret('LOCAL_SYNTHETIC_NOT_A_CREDENTIAL', ${sqlLiteral(name)});`);
    // Direct catalog writes are local fixture setup only; never widen grants.
    sql(insertPreviewCronSql, false, localAdminRole);
    sql(`delete from supabase_migrations.schema_migrations;
      insert into supabase_migrations.schema_migrations(version,name,statements) values ${fixture.history.map(r => `(${sqlLiteral(r.version)},${sqlLiteral(r.name)},array[]::text[])`).join(",")};
      insert into public.comment_translator_paid_openai_minute_buckets(minute_start,reserved_requests) values ('2026-01-01T00:00:00Z',0);`);
    const entry = normalizeLocalPostapplyArtifact(readLocalPostapplyRow(runtime.projectId));
    assert.ok(canonicalStructuralEqual(projectCanonicalStructuralState(entry.canonical), fixture.canonical), "PREVIEW_EXACT_OBSERVED_ENTRY");
    assert.deepEqual(entry.history.rows, fixture.history, "PREVIEW_EXACT30_HISTORY");
    assert.equal(entry.archive.tables.length + entry.archive.functions.length + entry.sourceEra.tables.length + entry.sourceEra.functions.length, 0);
    const snapshotSql = `select jsonb_build_object(
      'cron',(select jsonb_agg(to_jsonb(j) order by jobid) from cron.job j),
      'vault',(select jsonb_agg(jsonb_build_object('id',id,'name',name,'created',created_at,'updated',updated_at) order by name) from vault.secrets),
      'runs',(select count(*) from cron.job_run_details),
      'history',(select jsonb_agg(jsonb_build_object('version',version,'name',name) order by version) from supabase_migrations.schema_migrations),
      'rows',jsonb_build_object(${expected.tables.map(t => `${sqlLiteral(t.name)},(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.${sqlIdentifier(t.name)} r)`).join(",")})
    );`;
    const before = json(snapshotSql);
    phase = "OLD_SOURCE_RED";
    const red = sql(`begin;\n${old.stdout}\nrollback;`, true);
    assert.notEqual(red.exitCode, 0, "PREVIEW_OLD_SOURCE_MUST_REFUSE");
    assert.ok(red.stderr.includes("Gate 1 bridge state is partial, mixed, or unknown"), "PREVIEW_EXPECTED_OLD_REFUSAL");
    assert.deepEqual(json(snapshotSql), before, "PREVIEW_OLD_REFUSAL_PRESERVES_STATE");
    phase = "NEGATIVE_ENTRY_MATRIX";
    const repaired = canonicalMigrationBytes(path.basename(bridgePath)).toString("utf8");
    const negatives = [
      ["active", "update cron.job set active=true where jobname='comment-translator-paid-maintenance';"],
      ["duplicate", "insert into cron.job(schedule,command,nodename,nodeport,database,jobname,username,active) values ('*/5 * * * *','select 1','localhost',5432,'postgres','comment-translator-paid-maintenance','supabase_admin',false);"],
      ["wrong-command", "update cron.job set command='select 1' where jobname='comment-translator-paid-maintenance';"],
      ["unknown-acl", "grant select on public.comment_translator_paid_openai_minute_buckets to anon;"],
      ["unknown-hash", "create or replace function public.ct_paid_schedule_durable_reconciliation() returns trigger language plpgsql set search_path=pg_catalog,public as $$ begin return new; end $$;"],
      ["unknown-object", "create table public.comment_translator_paid_unknown_entry(id integer);"],
      ["unknown-view", "create view public.comment_translator_paid_unknown_entry as select 1 as id;"],
      ["source-era", "create table public.comment_translator_creator_history(id integer);"],
      ["vault-name", "update vault.secrets set name='comment_translator_paid_unexpected' where name='comment_translator_paid_cron_token';"]
    ];
    for (const [name, mutation] of negatives) {
      const administrativeFixture = ["active", "duplicate", "wrong-command", "vault-name"].includes(name);
      const refused = sql(`begin;\n${mutation}\n${administrativeFixture ? postgresContextSql : ""}\n${repaired}\ncommit;`, true, administrativeFixture ? localAdminRole : localObjectRole);
      assert.notEqual(refused.exitCode, 0, `PREVIEW_NEGATIVE_${name}`);
      assert.ok(/Gate 1 (?:bridge state|observed Preview)/.test(refused.stderr), `PREVIEW_NEGATIVE_REACHED_BRIDGE_${name}`);
      assert.deepEqual(json(snapshotSql), before, `PREVIEW_NEGATIVE_ROLLBACK_${name}`);
    }
    phase = "EXACT_PENDING26";
    const applied = new Set(fixture.history.map(r => r.version));
    const pending = migrationNames.filter(n => !applied.has(n.slice(0, 14)));
    assert.equal(pending.length, 26, "PREVIEW_PENDING26");
    phase = "CLI_FAILED_MIGRATION_ROLLBACK";
    const bridgeName = path.basename(bridgePath);
    fs.writeFileSync(path.join(migrationsDirectory, bridgeName), repaired + "\ndo $$ begin raise exception 'GATE1_R7_INJECTED_FAILURE'; end $$;\n");
    const failed = runLocalSupabaseCli(workDirectory, ["migration", "up", "--local", "--include-all"]);
    assert.notEqual(failed.status, 0, "PREVIEW_INJECTED_MIGRATION_REFUSED");
    const partial = json(snapshotSql);
    assert.equal(partial.history.length, 53, "PREVIEW_PRIOR23_ONLY_HISTORY");
    assert.equal(partial.history.some(r => r.version === "20260811000000"), false, "PREVIEW_FAILED_BRIDGE_NO_HISTORY");
    for (const field of ["cron", "vault", "runs", "rows"]) assert.deepEqual(partial[field], before[field], `PREVIEW_FAILED_BRIDGE_PRESERVES_${field}`);
    // Reset only this owned synthetic local history to rerun the full exact26.
    sql(`delete from supabase_migrations.schema_migrations where version not in (${fixture.history.map(r => sqlLiteral(r.version)).join(",")});`);
    fs.writeFileSync(path.join(migrationsDirectory, bridgeName), canonicalMigrationBytes(bridgeName));
    phase = "CLI_EXACT26_SUCCESS";
    const migrated = runLocalSupabaseCli(workDirectory, ["migration", "up", "--local", "--include-all"]);
    assert.equal(migrated.status, 0, "PREVIEW_MIGRATION_UP_SUCCESS");
    const after = normalizeLocalPostapplyArtifact(readLocalPostapplyRow(runtime.projectId));
    assert.ok(canonicalStructuralEqual(projectCanonicalStructuralState(after.canonical), expected), "PREVIEW_FINAL_COMPLETE_CANONICAL");
    assertCanonicalPaidRpcSecurityBoundary(projectCanonicalStructuralState(after.canonical));
    assert.deepEqual(after.history.rows, migrationNames.map(n => ({version:n.slice(0,14),name:n.slice(15,-4)})), "PREVIEW_FINAL_EXACT56");
    assert.equal(after.archive.tables.length + after.archive.functions.length + after.sourceEra.tables.length + after.sourceEra.functions.length, 0);
    const finalSnapshot = json(snapshotSql);
    for (const field of ["cron", "vault", "runs", "rows"]) assert.deepEqual(finalSnapshot[field], before[field], `PREVIEW_SUCCESS_PRESERVES_${field}`);
    assert.equal(json("select to_jsonb(exists(select 1 from pg_extension where extname='pg_net'));"), true);
    result = {status:"PASS",runtimeIdentity,cliVersion:"2.109.0",cliProfile:"preview-pinned-go",cliBinarySha256:previewGoCliSha256,oldSourceRed:"PASS",exactObservedEntry:"PASS",pendingCount:26,historyCount:56,canonicalFunctionCount:81,negativeCases:negatives.length,failedMigrationHistoryRollback:"PASS",operationalRowsPreserved:true,cronVaultMetadataPreserved:true,cronRunDelta:0,secretValueReads:0,remoteMutations:0,hostedEvidence:false};
  } catch (error) {
    const diagnosticsPath = process.env.GATE1_LOCAL_DIAGNOSTICS_PATH;
    if (diagnosticsPath && lastLocalSqlFailure) {
      const resolved = path.resolve(diagnosticsPath + ".last-sql.json");
      if (resolved.startsWith(path.resolve(root, ".tmp") + path.sep) && !fs.existsSync(resolved)
        && !highConfidenceSecretPattern.test(lastLocalSqlFailure.stderr)) {
        fs.writeFileSync(resolved, JSON.stringify(lastLocalSqlFailure, null, 2), {flag:"wx"});
      }
    }
    result = {status:"FAIL",phase,reason:safeCaseReason(error),hostedEvidence:false,...(error.cliDiagnostics ? {diagnostics:error.cliDiagnostics} : {})};
  } finally {
    const cleanup = cleanupGeneratedRuntimeResources({
      cliProjectId: runtime?.projectId && cliStartAttemptedProjects.has(runtime.projectId) ? runtime.projectId : "",
      stopCli: projectId => stopGeneratedCliProject(workDirectory, projectId, ["stop", "--project-id", projectId, "--no-backup", "--yes"]),
      workDirectory, removeDirectory: removeGeneratedCliWorkDirectory
    });
    result = cleanup.status === "PASS" ? {...result,generatedResourceCleanup:cleanup} : {status:"FAIL",reason:"GENERATED_RESOURCE_CLEANUP_FAILED",caseResult:result,cleanup};
  }
  return result;
}

function runCliPostapplyQueryCase(inputRows) {
  if (!fs.existsSync(typeof localCliProfile === "string" && localCliProfile === "preview-pinned-go" ? previewGoCliPath : supabaseCliPath)) return { status: "SETUP_BLOCKED", reason: "SUPABASE_CLI_MISSING" };
  cliCachedImageInventory = null;
  const versionCheck = cliVersionResult();
  if (versionCheck.status !== "PASS") return { status: "SETUP_BLOCKED", reason: versionCheck.code ?? "SUPABASE_CLI_VERSION_UNAVAILABLE" };
  const imageCheck = assertRequiredLocalImages();
  if (!imageCheck.available) {
    return { status: "SETUP_BLOCKED", reason: "REQUIRED_LOCAL_IMAGE_MISSING", missingImageCount: imageCheck.missingCount };
  }
  const scratchRoot = (process.argv?.includes("--phase=local-replay") || process.argv?.includes("--phase=local-restore-replay")) ? path.join(process.cwd(), ".tmp", "gate1-local-replay") : os.tmpdir();
  const workDirectory = fs.mkdtempSync(path.join(scratchRoot, "gate1-cli-atomicity-"));
  let phase = "WORK_DIRECTORY_CREATED";
  let runtime = null;
  let result = null;
  let sixFileRoundTrip = null;
  try {
    result = (() => {
      phase = "CLI_INIT";
      const init = runLocalSupabaseCli(workDirectory, ["init", "--force"]);
      if (init.status !== 0) return { status: "SETUP_BLOCKED", reason: "SUPABASE_CLI_INIT_FAILED" };
      phase = "CLI_RUNTIME_CONFIGURE";
      runtime = configureDisposableCliRuntime(workDirectory);
      const migrationsDirectory = path.join(workDirectory, "supabase", "migrations");
      fs.mkdirSync(migrationsDirectory, { recursive: true });
      assert.equal(fs.lstatSync(migrationsDirectory).isSymbolicLink(), false, "CLI migrations directory is not a symlink");
      phase = "CLI_START";
      const started = runLocalSupabaseCli(workDirectory, ["start", "--ignore-health-check", "--exclude", cliExcludedServices]);
      if (started.status !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_RUNTIME_UNAVAILABLE",
          failureClass: classifyLocalCliResult(started),
          failureDiagnostics: localCliFailureDiagnostics(started),
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }
      phase = "CLI_STATUS";
      const status = runLocalSupabaseCli(workDirectory, ["status", "-o", "json"]);
      if (status.status !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_RUNTIME_STATUS_FAILED",
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }
      phase = "RUNTIME_IDENTITY";
      const runtimeIdentity = cliRuntimeIdentity(workDirectory, runtime.ports.db);
      phase = "WRITE_PRE_BRIDGE_MIGRATIONS";
      const preBridgeMigrations = repositoryMigrationNamesBeforeBridge();
      for (const migrationName of preBridgeMigrations) {
        fs.writeFileSync(
          path.join(migrationsDirectory, migrationName),
          canonicalMigrationBytes(migrationName)
        );
      }
      phase = "COPY_LEGACY_MIGRATIONS";
      for (const row of inputRows) {
        const recoveredSource = canonicalSourceBytes(path.join(legacyDir, row.fileName)).toString("utf8");
        const recoveredStatements = splitRecoveredSql(recoveredSource);
        assert.ok(recoveredStatements.length > 0, `${row.fileName} has executable statements`);
        fs.writeFileSync(
          path.join(migrationsDirectory, row.fileName),
          `${recoveredStatements.join("\n")}\n`,
          "utf8"
        );
      }
      const preBridgeMigrationCount = preBridgeMigrations.length;
      phase = "CLI_INITIAL_RESET";
      const initialReset = runLocalSupabaseCli(workDirectory, ["db", "reset", "--local", "--no-seed"]);
      if (initialReset.status !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_RUNTIME_UNAVAILABLE",
          failureClass: classifyLocalCliResult(initialReset),
          failureDiagnostics: localCliFailureDiagnostics(initialReset),
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }

      if (process.argv?.includes("--phase=local-restore-replay")) {
        const nativeRoundTrip = (mode) => {
          const child = spawnSync(process.execPath, [path.join(root, "scripts", "comment-translator-paid-core-v1-gate1-local-roundtrip.mjs")], {
            input: JSON.stringify({mode, projectId:runtime.projectId, containerId:verifiedPostapplyContainer(runtime.projectId), workDirectory}),
            cwd:root, env:verifiedDockerTransportOrNull().environment, encoding:"utf8", windowsHide:true, shell:false, timeout:180000, maxBuffer:131072
          });
          let observation;
          try { observation = JSON.parse(child.stdout); } catch { throw new Error("LOCAL_ROUNDTRIP_OUTPUT_INVALID"); }
          if (child.error || child.signal || child.status !== 0 || child.stderr !== "" ||
              observation.status !== (mode === "capture" ? "LOCAL_SIX_FILE_CAPTURED" : "RESTORE_STATE_MATCH_OBSERVED")) {
            const error = new Error("LOCAL_ROUNDTRIP_CHILD_FAILED");
            error.cliDiagnostics = {roundTripPhase:mode, reason:/^[A-Z_]+$/.test(observation.reason ?? "") ? observation.reason : "CHILD_FAILED", phase:observation.phase ?? null, native:observation.native ?? null, comparison:observation.comparison ?? null};
            throw error;
          }
          return observation;
        };
        phase = "CAPTURE_LOCAL_SIX_FILES";
        const capture = nativeRoundTrip("capture");
        phase = "RESET_LOCAL_RESTORE_TARGET";
        const savedMigrations = path.join(workDirectory, "pre-restore-migrations");
        fs.renameSync(migrationsDirectory, savedMigrations);
        fs.mkdirSync(migrationsDirectory);
        const reset = runLocalSupabaseCli(workDirectory, ["db", "reset", "--local", "--no-seed"]);
        if (reset.status !== 0 || reset.terminationUnknown || reset.captureFailure || reset.timedOut) throw new Error("LOCAL_RESTORE_RESET_FAILED");
        phase = "RESTORE_LOCAL_SIX_FILES";
        const restore = nativeRoundTrip("restore");
        fs.renameSync(migrationsDirectory, path.join(workDirectory, "empty-reset-migrations"));
        fs.renameSync(savedMigrations, migrationsDirectory);
        sixFileRoundTrip = {capture, restore, productionHistoryReproduced:false};
      }

      phase = "BOOTSTRAP_CLI_EXTERNAL_DEPENDENCY";
      const externalDependencySql = `create extension if not exists pg_cron;
do $$
begin
  if to_regclass('cron.job') is null then
    raise exception 'CLI pg_cron catalog unavailable';
  end if;
end
$$;
`;
      const externalDependency = runDockerDiscardingOutput([
        "exec",
        "--interactive",
        verifiedPostapplyContainer(runtime.projectId),
        "psql",
        "--no-psqlrc",
        "--quiet",
        "--set=ON_ERROR_STOP=1",
        "--username=postgres",
        "--dbname=postgres"
      ], externalDependencySql);
      if (externalDependency.exitCode !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_EXTERNAL_DEPENDENCY_UNAVAILABLE",
          failureClass: "LOCAL_PSQL_FAILURE",
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }

      phase = "WRITE_ORIGINAL_BRIDGE_AND_POST_MIGRATIONS";
      const migrationNames = repositoryMigrationNames();
      const bridgeIndex = migrationNames.indexOf(path.basename(bridgePath));
      assert.ok(bridgeIndex >= 0, "original bridge in repository inventory");
      for (const name of migrationNames.slice(bridgeIndex)) {
        fs.writeFileSync(path.join(migrationsDirectory, name), canonicalMigrationBytes(name));
      }
      phase = "CLI_SUCCESS_MIGRATION_UP";
      const migrated = runLocalSupabaseCli(workDirectory, ["migration", "up", "--local"]);
      if (migrated.status !== 0 || migrated.signal !== "NONE" || migrated.errorCode !== "NONE"
        || migrated.terminationUnknown === true || migrated.timedOut === true || migrated.captureFailure === true) {
        return { status: "FAIL", reason: "POSTAPPLY_MIGRATION_UP_FAILED" };
      }
      phase = "READ_LOCAL_POSTAPPLY";
      const row = readLocalPostapplyRow(runtime.projectId);
      phase = "VALIDATE_LOCAL_POSTAPPLY";
      const observation = assertLocalPostapplyObservation(row);
      return {
        status: "PASS", ...observation, runtimeIdentity, ...(sixFileRoundTrip ? {sixFileRoundTrip} : {}),
        existingRemoteConnections: 0, remoteMutations: 0,
        workDirectory: "RESTRICTED_DISPOSABLE_CREATED"
      };
    })();
  } catch (error) {
    const setupBlocked = /^CLI_(?:CONFIG|PROJECT_ID)_/.test(error?.message ?? "");
    result = {
      status: setupBlocked ? "SETUP_BLOCKED" : "FAIL",
      reason: setupBlocked ? error.message : `${phase}_${safeCaseReason(error)}`,
      workDirectory: "RESTRICTED_DISPOSABLE_CREATED",
      ...(error.cliDiagnostics ? { diagnostics: error.cliDiagnostics } : {})
    };
  } finally {
    const cleanup = cleanupGeneratedRuntimeResources({
      cliProjectId: runtime?.projectId && cliStartAttemptedProjects.has(runtime.projectId) ? runtime.projectId : "",
      stopCli: (projectId) => stopGeneratedCliProject(workDirectory, projectId, ["stop", "--project-id", projectId, "--no-backup", "--yes"]),
      workDirectory,
      removeDirectory: removeGeneratedCliWorkDirectory
    });
    if (cleanup.status !== "PASS") {
      result = {
        status: "FAIL",
        reason: "GENERATED_RESOURCE_CLEANUP_FAILED",
        ...(result?.diagnostics ? { diagnostics: result.diagnostics } : {}),
        cleanup
      };
    } else {
      result = {
        ...(result ?? { status: "FAIL", reason: "CLI_CASE_NO_RESULT" }),
        generatedResourceCleanup: cleanup
      };
    }
  }
  return { ...result, productionShape: "NOT_ESTABLISHED", hostedEvidence: false };
}

function runCliRollbackHistoryAtomicCase(inputRows) {
  if (!fs.existsSync(typeof localCliProfile === "string" && localCliProfile === "preview-pinned-go" ? previewGoCliPath : supabaseCliPath)) return { status: "SETUP_BLOCKED", reason: "SUPABASE_CLI_MISSING" };
  cliCachedImageInventory = null;
  const versionCheck = cliVersionResult();
  if (versionCheck.status !== "PASS") return { status: "SETUP_BLOCKED", reason: versionCheck.code ?? "SUPABASE_CLI_VERSION_UNAVAILABLE" };
  const imageCheck = assertRequiredLocalImages();
  if (!imageCheck.available) {
    return { status: "SETUP_BLOCKED", reason: "REQUIRED_LOCAL_IMAGE_MISSING", missingImageCount: imageCheck.missingCount };
  }
  const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gate1-cli-atomicity-"));
  let phase = "WORK_DIRECTORY_CREATED";
  let runtime = null;
  let result = null;
  try {
    result = (() => {
      phase = "CLI_INIT";
      const init = runLocalSupabaseCli(workDirectory, ["init", "--force"]);
      if (init.status !== 0) return { status: "SETUP_BLOCKED", reason: "SUPABASE_CLI_INIT_FAILED" };
      phase = "CLI_RUNTIME_CONFIGURE";
      runtime = configureDisposableCliRuntime(workDirectory);
      const migrationsDirectory = path.join(workDirectory, "supabase", "migrations");
      fs.mkdirSync(migrationsDirectory, { recursive: true });
      assert.equal(fs.lstatSync(migrationsDirectory).isSymbolicLink(), false, "CLI migrations directory is not a symlink");
      phase = "CLI_START";
      const started = runLocalSupabaseCli(workDirectory, ["start", "--ignore-health-check", "--exclude", cliExcludedServices]);
      if (started.status !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_RUNTIME_UNAVAILABLE",
          failureClass: classifyLocalCliResult(started),
          failureDiagnostics: localCliFailureDiagnostics(started),
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }
      phase = "CLI_STATUS";
      const status = runLocalSupabaseCli(workDirectory, ["status", "-o", "json"]);
      if (status.status !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_RUNTIME_STATUS_FAILED",
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }
      phase = "RUNTIME_IDENTITY";
      const runtimeIdentity = cliRuntimeIdentity(workDirectory, runtime.ports.db);
      phase = "WRITE_PRE_BRIDGE_MIGRATIONS";
      const preBridgeMigrations = repositoryMigrationNamesBeforeBridge();
      for (const migrationName of preBridgeMigrations) {
        fs.writeFileSync(
          path.join(migrationsDirectory, migrationName),
          canonicalMigrationBytes(migrationName)
        );
      }
      phase = "COPY_LEGACY_MIGRATIONS";
      for (const row of inputRows) {
        const recoveredSource = canonicalSourceBytes(path.join(legacyDir, row.fileName)).toString("utf8");
        const recoveredStatements = splitRecoveredSql(recoveredSource);
        assert.ok(recoveredStatements.length > 0, `${row.fileName} has executable statements`);
        fs.writeFileSync(
          path.join(migrationsDirectory, row.fileName),
          `${recoveredStatements.join("\n")}\n`,
          "utf8"
        );
      }
      const preBridgeMigrationCount = preBridgeMigrations.length;
      phase = "CLI_INITIAL_RESET";
      const initialReset = runLocalSupabaseCli(workDirectory, ["db", "reset", "--local", "--no-seed"]);
      if (initialReset.status !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_RUNTIME_UNAVAILABLE",
          failureClass: classifyLocalCliResult(initialReset),
          failureDiagnostics: localCliFailureDiagnostics(initialReset),
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }

      phase = "BOOTSTRAP_CLI_EXTERNAL_DEPENDENCY";
      const externalDependencySql = `create extension if not exists pg_cron;
do $$
begin
  if to_regclass('cron.job') is null then
    raise exception 'CLI pg_cron catalog unavailable';
  end if;
end
$$;
`;
      const externalDependency = runDockerDiscardingOutput([
        "exec",
        "--interactive",
        cliDatabaseContainer(workDirectory),
        "psql",
        "--no-psqlrc",
        "--quiet",
        "--set=ON_ERROR_STOP=1",
        "--username=postgres",
        "--dbname=postgres"
      ], externalDependencySql);
      if (externalDependency.exitCode !== 0) {
        return {
          status: "SETUP_BLOCKED",
          phase,
          reason: "LOCAL_SUPABASE_EXTERNAL_DEPENDENCY_UNAVAILABLE",
          failureClass: "LOCAL_PSQL_FAILURE",
          projectId: "UNIQUE_GENERATED",
          ports: runtime.ports
        };
      }

      phase = "READ_BRIDGE";
      const bridgeFile = path.join(migrationsDirectory, path.basename(bridgePath));
      const originalBridge = canonicalMigrationBytes(path.basename(bridgePath)).toString("utf8");
      const movePattern = /(alter\s+table\s+public\.[^;]+set\s+schema\s+comment_translator_paid_legacy_archive\s*;)/i;
      if ((originalBridge.match(new RegExp(movePattern.source, "gi")) ?? []).length < 1) return { status: "FAIL", reason: "ATOMICITY_MOVE_NOT_FOUND" };
      const injectedBridge = originalBridge.replace(movePattern, "$1\n  raise exception 'gate1-atomicity-test';");
      phase = "WRITE_INJECTED_BRIDGE_AND_POST_MIGRATIONS";
      fs.writeFileSync(bridgeFile, injectedBridge, "utf8");
      const migrationNames = repositoryMigrationNames();
      const bridgeIndex = migrationNames.indexOf(path.basename(bridgePath));
      if (bridgeIndex < 0) return { status: "FAIL", reason: "ATOMICITY_BRIDGE_INVENTORY_MISMATCH" };
      for (const migrationName of migrationNames.slice(bridgeIndex + 1)) {
        fs.writeFileSync(
          path.join(migrationsDirectory, migrationName),
          canonicalMigrationBytes(migrationName)
        );
      }
      const assertionFile = path.join(workDirectory, "assertion.sql");
      phase = "WRITE_FAILED_ASSERTION";
      fs.writeFileSync(assertionFile, cliAtomicityAssertionSql.failed, "utf8");
      phase = "CLI_FAILED_MIGRATION_UP";
      const failedUp = runLocalSupabaseCli(workDirectory, ["migration", "up", "--local"]);
      if (failedUp.terminationUnknown === true || failedUp.timedOut === true || failedUp.captureFailure === true || failedUp.status === null || failedUp.signal !== "NONE" || failedUp.errorCode !== "NONE") {
        return {
          status: "FAIL",
          reason: failedUp.terminationUnknown === true ? "CLI_TERMINATION_UNKNOWN" : "CLI_FAILURE_BEFORE_EXPECTED_ATOMICITY_ASSERTION",
          failureClass: classifyLocalCliResult(failedUp),
          failureDiagnostics: localCliFailureDiagnostics(failedUp)
        };
      }
      if (failedUp.status === 0) return { status: "FAIL", reason: "ATOMICITY_INJECTED_FAILURE_NOT_OBSERVED" };
      if (classifyLocalCliResult(failedUp) !== "INJECTED_ATOMICITY_FAILURE") {
        return { status: "SETUP_BLOCKED", reason: "LOCAL_SUPABASE_RUNTIME_UNAVAILABLE", failureClass: classifyLocalCliResult(failedUp) };
      }
      phase = "READ_ROLLBACK_STATE";
      const failedState = runCliQuery(workDirectory, assertionFile);
      assertCliAtomicState(failedState, {
        publicLegacyTables: 3,
        publicLegacyFunctions: 3,
        archiveSchemaCount: 0,
        archiveTables: 0,
         archiveFunctions: 0,
         archiveTriggers: 0,
         historyCount: preBridgeMigrationCount,
         historyVersionPresent: false
      }, "rollback-state");
      phase = "RESTORE_BRIDGE";
      fs.writeFileSync(bridgeFile, originalBridge, "utf8");
      phase = "CLI_SUCCESS_MIGRATION_UP";
      const succeededUp = runLocalSupabaseCli(workDirectory, ["migration", "up", "--local"]);
      if (succeededUp.status !== 0) return { status: "FAIL", reason: "ATOMICITY_RESTORE_MIGRATION_UP_FAILED" };
      phase = "WRITE_SUCCESS_ASSERTION";
      fs.writeFileSync(assertionFile, cliAtomicityAssertionSql.succeeded, "utf8");
      phase = "READ_SUCCESS_STATE";
      const succeededState = runCliQuery(workDirectory, assertionFile);
      assertCliAtomicState(succeededState, {
        publicLegacyTables: 0,
        publicLegacyFunctions: 0,
        archiveSchemaCount: 1,
        archiveTables: 3,
        archiveFunctions: 3,
        archiveTriggers: 1,
        historyCount: repositoryMigrationNames().length,
        historyVersionPresent: true
      }, "success-state");
      phase = "READ_SUCCESS_CATALOG";
      const successCatalogFile = path.join(workDirectory, "success-catalog.sql");
      fs.writeFileSync(successCatalogFile, cliCanonicalCatalogAssertionSql(), "utf8");
      const observedStates = runCliQuery(workDirectory, successCatalogFile);
      const expectedCanonical = assertCanonicalStructuralState(readJson(bridgeStatesPath).canonical);
      const observedCanonical = assertCanonicalStructuralState(observedStates.canonical);
      if (!canonicalStructuralEqual(observedCanonical, expectedCanonical)) {
        return { status: "FAIL", reason: "FINAL_CANONICAL_STRUCTURE_MISMATCH" };
      }
      phase = "CLI_MIGRATION_LIST";
      const list = runLocalSupabaseCli(workDirectory, ["migration", "list", "--local"]);
      const expectedVersions = new Set(repositoryMigrationNames().map((name) => name.slice(0, 14)));
      const observedVersions = migrationListVersions(list.stdout);
      const expectedMigrationCount = repositoryMigrationNames().length;
      if (list.status !== 0 || migrationListCount(list.stdout) !== expectedMigrationCount || observedVersions.size !== expectedVersions.size || [...expectedVersions].some((version) => !observedVersions.has(version))) {
        return { status: "FAIL", reason: "MIGRATION_HISTORY_VERSION_MISMATCH" };
      }
      return {
        status: "PASS",
        injectedMigrationUp: "FAIL_EXPECTED",
        rollbackState: "PASS",
        restoredMigrationUp: "PASS",
        successState: "PASS",
        finalCatalog: "PASS",
        canonicalStructural: "PASS",
        migrationListCount: expectedMigrationCount,
        databaseReadiness: "PASS",
        nonDatabaseHealthChecks: "IGNORED_AND_NOT_CLAIMED",
        remoteArguments: "REJECTED",
        projectId: "UNIQUE_GENERATED",
        runtimeIdentity,
        ports: runtime.ports,
        workDirectory: "RESTRICTED_DISPOSABLE_CREATED"
      };
    })();
  } catch (error) {
    const setupBlocked = /^CLI_(?:CONFIG|PROJECT_ID)_/.test(error?.message ?? "");
    result = {
      status: setupBlocked ? "SETUP_BLOCKED" : "FAIL",
      reason: setupBlocked ? error.message : `${phase}_${safeCaseReason(error)}`,
      workDirectory: "RESTRICTED_DISPOSABLE_CREATED",
      ...(error.cliDiagnostics ? { diagnostics: error.cliDiagnostics } : {})
    };
  } finally {
    const cleanup = cleanupGeneratedRuntimeResources({
      cliProjectId: runtime?.projectId && cliStartAttemptedProjects.has(runtime.projectId) ? runtime.projectId : "",
      stopCli: (projectId) => stopGeneratedCliProject(workDirectory, projectId, ["stop", "--project-id", projectId, "--no-backup", "--yes"]),
      workDirectory,
      removeDirectory: removeGeneratedCliWorkDirectory
    });
    if (cleanup.status !== "PASS") {
      result = {
        status: "FAIL",
        reason: "GENERATED_RESOURCE_CLEANUP_FAILED",
        ...(result?.diagnostics ? { diagnostics: result.diagnostics } : {}),
        cleanup
      };
    } else {
      result = {
        ...(result ?? { status: "FAIL", reason: "CLI_CASE_NO_RESULT" }),
        generatedResourceCleanup: cleanup
      };
    }
  }
  return result;
}

function executeLegacyBodies(databaseName, inputRows) {
  let executableStatementCount = 0;
  for (const row of inputRows) {
    const source = fs.readFileSync(path.join(legacyDir, row.fileName), "utf8");
    const statements = splitRecoveredSql(source);
    assert.ok(statements.length > 0, `${row.fileName} has executable statements`);
    executableStatementCount += statements.length;
    const sql = `begin;\n${statements.join("\n")}\ncommit;\n`;
    const result = psql(databaseName, sql);
    if (result.exitCode !== 0) {
      throw new Error(`LEGACY_REPLAY_${row.fileName.slice(0, 14)}_${classifyPsqlFailure(result)}`);
    }
  }
  return executableStatementCount;
}

function runCleanCase(localDatabase) {
  const before = scopedSummary(localDatabase);
  const beforeCatalog = bridgeStateSnapshot(localDatabase);
  const beforeDigest = normalizedJsonSha256(beforeCatalog);
  assert.deepEqual(before, {
    publicLegacyTables: 0,
    publicLegacyFunctions: 0,
    archiveSchemaCount: 0,
    archiveTables: 0,
    archiveFunctions: 0,
    archiveTriggers: 0,
    publicPaidLikeRelations: 0
  });
  const result = runBridge(localDatabase);
  assert.equal(result.exitCode, 0, `clean bridge exit ${classifyPsqlFailure(result)}`);
  const after = scopedSummary(localDatabase);
  const afterCatalog = bridgeStateSnapshot(localDatabase);
  const afterDigest = normalizedJsonSha256(afterCatalog);
  assert.deepEqual(after, before, "clean bridge is a no-op");
  assert.deepEqual(afterCatalog, beforeCatalog, "clean bridge preserves the complete scoped catalog");
  assert.equal(afterDigest, beforeDigest, "clean bridge preserves the normalized catalog digest");
  return { status: "PASS", bridgeExitCode: 0, noOp: true, normalizedDigestEquality: "PASS", normalizedSha256: beforeDigest };
}

function runLegacyCase(inputRows) {
  const localDatabase = allocateFreshDatabaseName("legacy");
  createFreshDatabase(localDatabase, "CREATE_LEGACY_DATABASE");
  bootstrapLocalDatabase(localDatabase, localBootstrapSql(), "LEGACY", { includePgNet: false });
  const executableStatementCount = executeLegacyBodies(localDatabase, inputRows);
  const beforeBridge = scopedSummary(localDatabase);
  assert.equal(beforeBridge.publicLegacyTables, 3, "legacy replay creates three public tables");
  assert.equal(beforeBridge.publicLegacyFunctions, 3, "legacy replay creates three public functions");
  const result = runBridge(localDatabase);
  assert.equal(result.exitCode, 0, `legacy bridge exit ${classifyPsqlFailure(result)}`);
  const after = scopedSummary(localDatabase);
  assert.deepEqual(after, {
    publicLegacyTables: 0,
    publicLegacyFunctions: 0,
    archiveSchemaCount: 1,
    archiveTables: 3,
    archiveFunctions: 3,
    archiveTriggers: 1,
    publicPaidLikeRelations: 0
  });
  return { status: "PASS", bridgeExitCode: 0, executableStatementCount, archivedTables: 3, archivedFunctions: 3 };
}

function runNegativePartialCase() {
  const localDatabase = allocateFreshDatabaseName("negative_partial");
  createFreshDatabase(localDatabase, "CREATE_NEGATIVE_DATABASE");
  bootstrapLocalDatabase(localDatabase, localBootstrapSql(), "NEGATIVE", { includePgNet: false });
  assertLocalPsql(localDatabase, "create table public.comment_translator_paid_entitlements (billing_user_reference_id text not null);", "NEGATIVE_SETUP");
  const before = scopedSummary(localDatabase);
  const beforeCatalog = bridgeStateSnapshot(localDatabase);
  const beforeDigest = normalizedJsonSha256(beforeCatalog);
  const result = runBridge(localDatabase);
  assert.notEqual(result.exitCode, 0, "partial legacy state fails closed");
  const after = scopedSummary(localDatabase);
  const afterCatalog = bridgeStateSnapshot(localDatabase);
  const afterDigest = normalizedJsonSha256(afterCatalog);
  assert.deepEqual(after, before, "partial legacy failure preserves scoped object summary");
  assert.deepEqual(afterCatalog, beforeCatalog, "partial legacy failure preserves the complete scoped catalog");
  assert.equal(afterDigest, beforeDigest, "partial legacy failure preserves the normalized catalog digest");
  return { status: "PASS", bridgeExitCode: result.exitCode, beforeAfterSummaryEqual: true, normalizedDigestEquality: "PASS", normalizedSha256: beforeDigest };
}

function runNegativeThenAtomicity(expected, inputRows, options) {
  const injection = options ?? {};
  const negativeRunner = injection.negativeRunner ?? runNegativeMatrix;
  const atomicityRunner = injection.atomicityRunner ?? runCliRollbackHistoryAtomicCase;
  const negatives = negativeRunner(expected, inputRows);
  if (negatives.status !== "PASS") {
    return {
      status: "FAIL",
      reason: "NEGATIVE_MATRIX_FAILED",
      negatives,
      atomicity: null,
      unverifiedCases: ["cli-rollback-history-atomicity"]
    };
  }
  const atomicity = atomicityRunner(inputRows);
  return {
    status: atomicity.status === "PASS" ? "PASS" : "FAIL",
    reason: atomicity.status === "PASS" ? undefined : "CLI_ROLLBACK_HISTORY_ATOMICITY_FAILED",
    negatives,
    atomicity,
    unverifiedCases: []
  };
}

function run() {
  assert.equal(fs.existsSync(bridgePath), true, "bridge migration exists");
  if (process.argv.includes("--phase=preview-convergence")) {
    const result = runCliPreviewConvergenceCase();
    console.log(JSON.stringify({schemaVersion:2,target:"local-only",phase:"preview-convergence",result,remoteMutations:0}));
    if (result.status !== "PASS") process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--phase=local-replay") || process.argv.includes("--phase=local-restore-replay")) {
    const result = runCliPostapplyQueryCase(validateLegacyInputs());
    console.log(JSON.stringify({schemaVersion:2,target:"local-only",phase:process.argv.includes("--phase=local-restore-replay") ? "local-restore-replay" : "local-replay",result,remoteMutations:0}));
    if (result.status !== "PASS") process.exitCode = 1;
    return;
  }
  const r13 = validateR13Artifact();
  const production = validateProductionArtifactBoundary();
  const legacyInputs = validateLegacyInputs();
  if (process.argv.includes("--phase=parse")) {
    const parserCounts = legacyInputs.map((row) => ({
      fileName: row.fileName,
      recordedStatementCount: row.recordedStatementCount,
      executableStatementCount: splitRecoveredSql(fs.readFileSync(path.join(legacyDir, row.fileName), "utf8")).length
    }));
    console.log(JSON.stringify({ schemaVersion: 1, phase: "parse", parserCounts }));
    return;
  }
  if (process.argv.includes("--phase=source-diagnostics")) {
    const expectedCanonical = readJson(bridgeStatesPath).canonical;
    const sourceDiagnostics = diagnosticFunctionNames.map((functionName) => ({
      functionName,
      source: sourceFunctionDiagnostic(functionName)
    }));
    console.log(JSON.stringify({
      schemaVersion: 2,
      phase: "source-diagnostics",
      sourceDiagnostics,
      actualReplay: "SETUP_BLOCKED_UNTIL_DOCKER_SERVER_AVAILABLE",
      expectedCanonicalFunctionCount: expectedCanonical.functions.length,
      remoteMutations: 0
    }));
    return;
  }
  if (process.argv.includes("--phase=isolated-bridge-replay")) {
    const replayResult = runCliIsolatedBridgeReplayCase(legacyInputs);
    console.log(JSON.stringify({
      schemaVersion: 2,
      target: "local-only",
      phase: "isolated-bridge-replay",
      result: replayResult,
      remoteMutations: 0
    }));
    if (replayResult.status !== "PASS") process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--phase=postapply-query")) {
    const queryResult = runCliPostapplyQueryCase(legacyInputs);
    console.log(JSON.stringify({ schemaVersion: 2, target: "local-only", phase: "postapply-query", result: queryResult, remoteMutations: 0 }));
    if (queryResult.status !== "PASS") process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--phase=cli-atomicity")) {
    const cliResult = runCliRollbackHistoryAtomicCase(legacyInputs);
    console.log(JSON.stringify({
      schemaVersion: 2,
      target: "local-only",
      phase: "cli-atomicity",
      result: cliResult,
      remoteMutations: 0
    }));
    if (cliResult.status !== "PASS") process.exitCode = 1;
    return;
  }
  const dockerVersion = runDocker(["version", "--format", "{{.Server.Version}}"]);
  if (dockerVersion.exitCode !== 0 || dockerVersion.stdout.trim() === "") {
    console.log(JSON.stringify({
      schemaVersion: 2,
      target: "local-only",
      status: "SETUP_BLOCKED",
      reason: "DOCKER_SERVER_UNAVAILABLE",
      dockerClient: "AVAILABLE",
      dockerServer: "UNAVAILABLE",
      r13Artifact: r13,
      productionBoundary: production,
      legacyInputCount: legacyInputs.length,
      executedCases: [],
      unverifiedCases: [
        "clean",
        "legacy",
        "canonical",
        "synthetic-canonical-preservation",
        "negative-matrix",
        "cli-rollback-history-atomicity"
      ],
      existingRemoteConnections: 0,
      remoteMutations: 0,
      mutationCounts: { ddl: 0, dml: 0, rpc: 0, remote: 0, total: 0 }
    }));
    process.exitCode = 1;
    return;
  }
  let report = null;
  let phase = "RUNTIME_CREATE";
  try {
    report = (() => {
      phase = "RUNTIME_CREATE";
      const runtime = createDisposableDatabaseRuntime();
      if (runtime.status !== "PASS") {
        return {
          schemaVersion: 2,
          target: "local-only",
          status: "SETUP_BLOCKED",
          reason: runtime.reason,
          dockerClient: "AVAILABLE",
          dockerServer: dockerVersion.stdout.trim(),
          disposableRuntime: runtime,
          r13Artifact: r13,
          productionBoundary: production,
          legacyInputCount: legacyInputs.length,
          executedCases: [],
          unverifiedCases: [
            "clean",
            "legacy",
            "canonical",
            "synthetic-canonical-preservation",
            "negative-matrix",
            "cli-rollback-history-atomicity"
          ],
          existingRemoteConnections: 0,
          remoteMutations: 0,
          mutationCounts: { ddl: 0, dml: 0, rpc: 0, remote: 0, total: 0 }
        };
      }
      phase = "PSQL_VERSION";
      const psqlVersion = runDocker(["exec", container, "psql", "--version"]);
      assert.equal(psqlVersion.exitCode, 0, "container PostgreSQL client is available");
      const psqlVersionText = `${psqlVersion.stdout}\n${psqlVersion.stderr}`;
      const psqlMajor = psqlVersionText.match(/(?:psql\s+\(PostgreSQL\)|PostgreSQL)\s+(\d+)/i)?.[1] ?? "";
      assert.equal(psqlMajor, "17", "container psql major is 17");
      phase = "CLEAN_DATABASE_SETUP";
      const cleanDatabase = ensureFreshDatabase();
      phase = "CLEAN_CASE";
      const clean = runCleanCase(cleanDatabase);
      phase = "LEGACY_CASE";
      const legacy = runLegacyCase(legacyInputs);
      phase = "CANONICAL_CASE";
      const canonical = runCanonicalCase();
      const expectedCanonical = readJson(bridgeStatesPath).canonical;
      if (canonical.status !== "PASS") {
        return {
          schemaVersion: 2,
          target: "local-only",
          status: "FAIL",
          reason: "CANONICAL_CASE_FAILED",
          postgresMajor: 17,
          dockerServer: dockerVersion.stdout.trim(),
          disposableRuntime: runtime,
          r13Artifact: r13,
          productionBoundary: production,
          legacyInputCount: legacyInputs.length,
          clean,
          legacy,
          canonical,
          unverifiedCases: [
            "synthetic-canonical-preservation",
            "negative-matrix",
            "cli-rollback-history-atomicity"
          ],
          existingRemoteConnections: 0,
          remoteMutations: 0,
          mutationCounts: { ddl: 0, dml: 0, rpc: 0, remote: 0, total: 0 }
        };
      }
      phase = "SYNTHETIC_CASE";
      const synthetic = runSyntheticCanonicalPreservationCase(expectedCanonical);
      phase = "NEGATIVE_AND_ATOMICITY";
      const negativeAtomicity = runNegativeThenAtomicity(expectedCanonical, legacyInputs);
      const negatives = negativeAtomicity.negatives;
      if (negativeAtomicity.status !== "PASS" && negatives.status !== "PASS") {
        return {
          schemaVersion: 2,
          target: "local-only",
          status: "FAIL",
          reason: "NEGATIVE_MATRIX_FAILED",
          postgresMajor: 17,
          dockerServer: dockerVersion.stdout.trim(),
          disposableRuntime: runtime,
          r13Artifact: r13,
          productionBoundary: production,
          legacyInputCount: legacyInputs.length,
          clean,
          legacy,
          canonical,
          syntheticCanonicalPreservation: synthetic,
          negatives,
          unverifiedCases: negativeAtomicity.unverifiedCases,
          existingRemoteConnections: 0,
          remoteMutations: 0
        };
      }
      const rollbackHistoryAtomic = negativeAtomicity.atomicity;
      const results = [clean, legacy, canonical, synthetic, negatives, rollbackHistoryAtomic];
      return {
        schemaVersion: 2,
        target: "local-only",
        status: results.every((result) => result.status === "PASS") ? "PASS" : "FAIL",
        postgresMajor: 17,
        dockerServer: dockerVersion.stdout.trim(),
        disposableRuntime: runtime,
        r13Artifact: r13,
        productionBoundary: production,
        legacyInputCount: legacyInputs.length,
        clean,
        legacy,
        negatives,
        canonical,
        syntheticCanonicalPreservation: synthetic,
        rollbackHistoryAtomic,
        existingRemoteConnections: 0,
        remoteMutations: 0
      };
    })();
  } catch (error) {
    const fixedFailureClasses = new Set([
      "SYNTAX_ERROR",
      "MISSING_COLUMN",
      "MISSING_SCHEMA",
      "MISSING_FUNCTION",
      "MISSING_TYPE",
      "MISSING_OBJECT",
      "DUPLICATE_OBJECT",
      "PERMISSION_DENIED",
      "CONNECTION_ERROR",
      "BRIDGE_ASSERTION",
      "PSQL_EXIT"
    ]);
    const errorCode = error && typeof error === "object" && typeof error.code === "string" ? error.code : "";
    const errorMessage = error && typeof error.message === "string" ? error.message : "";
    const suffix = errorMessage.match(/:([A-Z0-9_]+)$/)?.[1] ?? "";
    const failureClass = errorCode === "ERR_ASSERTION"
      ? "ASSERTION_FAILED"
      : fixedFailureClasses.has(suffix)
        ? suffix
        : "UNKNOWN_ERROR";
    report = {
      schemaVersion: 2,
      target: "local-only",
      status: "FAIL",
      reason: "LOCAL_VERIFICATION_EXCEPTION",
      phase,
      failureClass,
      existingRemoteConnections: 0,
      remoteMutations: 0
    };
  } finally {
    const cleanup = cleanupGeneratedRuntimeResources({
      directResources: disposableRuntimeResources,
      inspectResource: inspectOwnedDirectResource,
      removeResource: removeOwnedDirectResource
    });
    if (cleanup.status !== "PASS") {
      report = {
        ...(report ?? { schemaVersion: 2, target: "local-only" }),
        status: "FAIL",
        reason: "GENERATED_RESOURCE_CLEANUP_FAILED",
        generatedResourceCleanup: cleanup
      };
      process.exitCode = 1;
    } else if (report) {
      report = { ...report, generatedResourceCleanup: cleanup };
    }
  }
  console.log(JSON.stringify(report));
  if (report?.status !== "PASS") process.exitCode = 1;
}

try {
  run();
} catch (error) {
  const reasonMatch = error instanceof Error
    ? error.message.match(/^([A-Z0-9_-]+)(?::([A-Z0-9_-]+))?/)
    : null;
  const reason = reasonMatch
    ? [reasonMatch[1], reasonMatch[2]].filter(Boolean).join("_")
    : "CONTRACT_FAILURE";
  console.error(`GATE1_DATABASE_INTEGRATION_FAIL:${reason}`);
  process.exitCode = 1;
}
