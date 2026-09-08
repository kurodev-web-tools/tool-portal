import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { cleanupGeneratedRuntimeResources } from "./lib/comment-translator-paid-core-v1-gate1-runtime-cleanup.mjs";

const sourcePath = path.join(
  process.cwd(),
  "scripts",
  "comment-translator-paid-core-v1-gate1-database-integration-contract.mjs"
);
const source = fs.readFileSync(sourcePath, "utf8");
const cleanupSource = fs.readFileSync(
  path.join(process.cwd(), "scripts", "lib", "comment-translator-paid-core-v1-gate1-runtime-cleanup.mjs"),
  "utf8"
);
const contractSource = `${source}\n${cleanupSource}`;

function functionBody(functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} exists`);
  const bodyStart = source.indexOf("{", start);
  assert.notEqual(bodyStart, -1, `${functionName} has a body`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart, index + 1);
    }
  }
  throw new Error(`${functionName} body is unterminated`);
}

const cliBody = functionBody("runCliRollbackHistoryAtomicCase");
const integrationBody = functionBody("run");
const isolatedBridgeBody = functionBody("runCliIsolatedBridgeReplayCase");

const atomicityMarkerGuardStart = cliBody.indexOf("if (failedUp.terminationUnknown === true");
const atomicityMarkerGuardEnd = cliBody.indexOf("if (failedUp.status === 0)", atomicityMarkerGuardStart);
assert.ok(atomicityMarkerGuardStart >= 0 && atomicityMarkerGuardEnd > atomicityMarkerGuardStart, "atomicity marker guard is executable");
const atomicityMarkerGuard = new Function("classifyLocalCliResult", "localCliFailureDiagnostics", `
  return function check(failedUp) {
    ${cliBody.slice(atomicityMarkerGuardStart, atomicityMarkerGuardEnd)}
  };
`)(() => "INJECTED_ATOMICITY_FAILURE", () => ({ failureClass: "synthetic" }));

const bridgeMarkerGuardStart = isolatedBridgeBody.indexOf("if (bridgeReplay.terminationUnknown === true");
const bridgeMarkerGuardEnd = isolatedBridgeBody.indexOf("if (bridgeReplay.status === 0)", bridgeMarkerGuardStart);
assert.ok(bridgeMarkerGuardStart >= 0 && bridgeMarkerGuardEnd > bridgeMarkerGuardStart, "isolated bridge marker guard is executable");
const bridgeMarkerGuard = new Function("classifyLocalCliResult", `
  return function check(bridgeReplay) {
    const bridgeAssertionCode = bridgeReplay.bridgeAssertionCode;
    const bridgeAssertionInputCount = bridgeReplay.bridgeAssertionInputCount;
    const bridgeAssertionAllowlistMatch = bridgeReplay.bridgeAssertionAllowlistMatch;
    const baseResult = { markerGuardProbe: true };
    ${isolatedBridgeBody.slice(bridgeMarkerGuardStart, bridgeMarkerGuardEnd)}
    if (bridgeReplay.status === 0) {
      return { status: "PASS", diagnosis: "NO_ALLOWLISTED_ASSERTION", ...baseResult };
    }
    if (bridgeAssertionCode !== "NONE" && bridgeAssertionAllowlistMatch === true) {
      return { status: "PASS", diagnosis: "ASSERTION_IDENTIFIED", ...baseResult };
    }
    return { status: "FAIL", reason: "ISOLATED_BRIDGE_ASSERTION_UNIDENTIFIED", ...baseResult };
  };
`)(() => "CLI_BRIDGE_RUNNER_FAILURE");

for (const [label, marker] of [
  ["success", /status:\s*["']PASS["']/],
  ["setup-blocked", /status:\s*["']SETUP_BLOCKED["']/],
  ["fail", /status:\s*["']FAIL["']/],
  ["exception", /catch\s*\(\s*error\s*\)/]
]) {
  assert.match(cliBody, marker, `CLI ${label} path remains represented`);
}

assert.match(
  cliBody,
  /finally\s*\{[\s\S]*cleanupGeneratedRuntimeResources[\s\S]*\}/,
  "CLI success, SETUP_BLOCKED, FAIL, and exception paths share finally cleanup"
);
assert.match(
  cliBody,
  /["']stop["'][\s\S]*["']--project-id["'][\s\S]*["']--no-backup["'][\s\S]*["']--yes["']/,
  "CLI cleanup stops the exact generated project without backup"
);
assert.match(
  source,
  /fs\.rmSync\(workDirectory[\s\S]*recursive:\s*true[\s\S]*force:\s*true/,
  "CLI cleanup removes only the generated temporary workdir"
);
assert.match(
  integrationBody,
  /finally\s*\{[\s\S]*cleanupGeneratedRuntimeResources[\s\S]*\}/,
  "direct runtime paths share finally cleanup"
);
assert.match(
  isolatedBridgeBody,
  /bridgeReplay\.signal\s*!==\s*["']NONE["']/,
  "isolated bridge marker guard rejects a signaled child before marker classification"
);
for (const dockerAction of [
  /["']rm["'][\s\S]*["']-f["']/,
  /["']volume["'][\s\S]*["']rm["']/,
  /["']network["'][\s\S]*["']rm["']/
]) {
  assert.match(contractSource, dockerAction, "direct cleanup uses exact Docker resource removal");
}
assert.match(
  contractSource,
  /GENERATED_RESOURCE_CLEANUP_FAILED/,
  "cleanup failure is surfaced fail-closed"
);
assert.match(
  source,
  /const localCliRunnerMaxBufferBytes\s*=\s*4\s*\*\s*1024\s*\*\s*1024/,
  "local CLI runner output is bounded"
);
assert.match(
  source,
  /spawnSync\(process\.execPath,\s*\[cliRunnerPath\]/,
  "local CLI is executed through the bounded runner"
);
assert.match(
  source,
  /maxBuffer:\s*localCliRunnerMaxBufferBytes/,
  "local CLI runner uses the bounded capture size"
);
assert.doesNotMatch(
  source,
  /spawnSync\(cliPath,/,
  "local CLI no longer captures the command directly without a ring buffer"
);
assert.match(source, /const dockerContextName\s*=\s*["']desktop-linux["']/,
  "native Docker context is fixed to desktop-linux");
assert.match(source, /const dockerEndpoint\s*=\s*["']npipe:\/\/\/\/\.\/pipe\/dockerDesktopLinuxEngine["']/,
  "native Docker endpoint is fixed to Docker Desktop Linux");
assert.match(source, /function inheritedDockerOverrides\(\)/,
  "inherited Docker and Supabase routing overrides are checked");
assert.match(source, /function buildWindowsEssentialEnvironment\(endpoint\s*=\s*undefined\)/,
  "child processes receive a Windows-essential-only environment");
assert.match(source, /timeout:\s*dockerControlTimeoutMs/,
  "native Docker calls use the bounded control timeout");
assert.doesNotMatch(source, /maxBuffer:\s*localCliRunnerMaxBufferBytes,[\s\S]*?timeout:\s*localCliTimeoutMs/,
  "outer CLI spawnSync does not own the child timeout");
assert.match(source, /timeoutMs:\s*localCliTimeoutMs/,
  "bounded timeout is owned by the CLI runner");
assert.ok(/command:\s*usePinnedGo \? previewGoCliPath : process\.execPath[\s\S]*args:\s*usePinnedGo \? args : \[(?:supabaseCliPath|typeof supabaseCliPath)[\s\S]*\.\.\.args\]/.test(source),
  "Supabase CLI uses the installed entrypoint or hash-pinned Go binary with argv arrays");
assert.doesNotMatch(source, /node_modules["'\\/]\.bin["'\\/]supabase\.cmd|process\.platform\s*===\s*["']win32["'][\s\S]*shell:/,
  "Supabase CLI does not use the shell .cmd shim");
assert.match(source, /env:\s*transport\.environment/,
  "Docker and CLI paths receive the verified transport environment");
assert.match(
  source,
  /if\s*\(cliResult\.status\s*!==\s*["']PASS["']\)\s*process\.exitCode\s*=\s*1/,
  "CLI phase returns a failing process status for a non-PASS result"
);

const removeDirectoryBody = functionBody("removeGeneratedCliWorkDirectory");
const guardedRemoveDirectory = new Function("terminationUnknown", "path", "process", "os", "fs", `return function removeGeneratedCliWorkDirectory(workDirectory) ${removeDirectoryBody};`)(true, path, process, os, fs);
let guardedRemoveCalls = 0;
const unknownStopCleanup = cleanupGeneratedRuntimeResources({
  cliProjectId: "gate1-ct-paid-v1-a3-999-z9",
  stopCli: () => ({ status: null, terminationUnknown: true }),
  workDirectory: "generated-work-directory",
  removeDirectory: (directory) => { guardedRemoveDirectory(directory); guardedRemoveCalls += 1; }
});
assert.equal(unknownStopCleanup.status, "FAIL", "unknown stop fails cleanup closed");
assert.equal(guardedRemoveCalls, 0, "unknown stop prevents the directory delete operation");
assert.throws(() => guardedRemoveDirectory("generated-work-directory"), /CLI_TERMINATION_UNKNOWN/, "guard itself blocks directory deletion");
assert.ok(unknownStopCleanup.failures.some(({ action }) => action === "CLI_WORK_DIRECTORY_REMOVE"), "unknown stop prevents directory deletion");

const statuslessCleanup = cleanupGeneratedRuntimeResources({
  cliProjectId: "gate1-ct-paid-v1-a3-999-z9",
  stopCli: () => ({}),
  workDirectory: "generated-work-directory",
  removeDirectory: () => ({ status: 0 })
});
assert.equal(statuslessCleanup.status, "FAIL", "statusless stop is not cleanup success");
assert.ok(statuslessCleanup.failures.some(({ action, code }) => action === "CLI_STOP" && code === "CLEANUP_RESULT_INVALID"));

let residueInspection = 0;
const residueCleanup = cleanupGeneratedRuntimeResources({
  directResources: {
    container: {
      plannedName: "gate1-ct-paid-v1-a3-999-z9-db",
      verifiedName: "gate1-ct-paid-v1-a3-999-z9-db",
      observedId: "owned-container-id",
      attempted: true
    }
  },
  inspectResource: () => {
    residueInspection += 1;
    return { status: "OWNED", observedId: "owned-container-id", verifiedName: "gate1-ct-paid-v1-a3-999-z9-db" };
  },
  removeResource: () => ({ status: 0 })
});
assert.equal(residueCleanup.status, "FAIL", "residue after a nominal remove fails closed");
assert.equal(residueInspection, 2, "owned resource is revalidated after remove");
assert.ok(residueCleanup.failures.some(({ code }) => code === "RESOURCE_RESIDUE_PRESENT"));

const callbackMissingCleanup = cleanupGeneratedRuntimeResources({
  directResources: { container: { plannedName: "gate1-ct-paid-v1-a3-999-z9-db", attempted: true } },
  runDocker: () => ({ exitCode: 0 })
});
assert.equal(callbackMissingCleanup.status, "FAIL", "unverified direct cleanup callbacks fail closed");
assert.ok(callbackMissingCleanup.failures.some(({ action, code }) => action === "DOCKER_CONTAINER_REMOVE" && code === "CALLBACK_MISSING"));

assert.match(source, /crypto\.randomBytes\(12\)/, "direct and CLI namespaces use a cryptographic nonce");
assert.match(source, /directResourceLabelKey/, "direct resources carry an exact run label");
assert.match(source, /--env",\s*"POSTGRES_PASSWORD/, "password is passed by Docker child environment lookup");
assert.doesNotMatch(source, /POSTGRES_PASSWORD=\$\{password\}/, "password is absent from argv");
assert.match(source, /major_version[\s\S]*pooler[\s\S]*experimental\.pgdelta/, "CLI config pins Postgres 17, pooler off and pgdelta off");
assert.doesNotMatch(source, /ensureTomlSectionValue\(config,\s*"db",\s*"major_version"/, "fresh CLI db major is verified rather than overwritten");
assert.doesNotMatch(source, /ensureTomlSectionValue\(config,\s*"db\.pooler",\s*"enabled"/, "fresh CLI pooler profile is verified rather than overwritten");
assert.match(source, /const cliRequiredImages\s*=\s*cliImageReferences/, "CLI cache inventory uses all pinned image references");
assert.match(source, /HostConfig\?\.Binds/, "failed-start ownership checks use configured mounts");
assert.match(source, /DIRECT_RESOURCE_ID_CHANGED/, "cleanup revalidation rejects replacement IDs");
assert.match(source, /com\.supabase\.cli\.project[\s\S]*com\.docker\.compose\.project/, "CLI cleanup inventories both exact project labels");
assert.match(source, /REQUIRED_LOCAL_IMAGE_ID_DIGEST_CHANGED/, "CLI cached image identity is immutable through cleanup");
assert.match(source, /fs\.lstatSync\(workDirectory\)[\s\S]*return \{ status: 0 \}/, "work-directory cleanup verifies absence and returns explicit success");
assert.doesNotMatch(cleanupSource, /if\s*\(typeof runDocker !== "function"\)[\s\S]*runDocker\(/, "cleanup helper has no unverified Docker-name fallback");

const configCheckBody = functionBody("assertGeneratedCliConfig");
const assertGeneratedConfig = new Function("path", "fs", `return function assertGeneratedCliConfig(workDirectory, options = {}) ${configCheckBody};`)(path, fs);
const configProbeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gate1-cli-config-shape-"));
try {
  const configProbeDirectory = path.join(configProbeRoot, "supabase");
  fs.mkdirSync(configProbeDirectory, { recursive: true });
  const validConfig = `project_id = "gate1-ct-paid-v1-a3-deadbeef"\n[db]\nport = 55421\nmajor_version = 17\n[db.pooler]\nenabled = false\nport = 55424\n[experimental.pgdelta]\nenabled = false\n`;
  const configPath = path.join(configProbeDirectory, "config.toml");
  fs.writeFileSync(configPath, validConfig, "utf8");
  assert.equal(assertGeneratedConfig(configProbeRoot).status, "PASS", "generated CLI profile shape passes");
  fs.writeFileSync(configPath, validConfig.replace("major_version = 17", "major_version = 16"), "utf8");
  assert.equal(assertGeneratedConfig(configProbeRoot).status, "SETUP_BLOCKED", "generated CLI major drift blocks setup");
  fs.writeFileSync(configPath, `${validConfig}[db]\nmajor_version = 17\n`, "utf8");
  assert.equal(assertGeneratedConfig(configProbeRoot).status, "SETUP_BLOCKED", "generated CLI duplicate profile blocks setup");
} finally {
  fs.rmSync(configProbeRoot, { recursive: true, force: true });
}

const directInspectBody = functionBody("inspectOwnedDirectResource");
const inspectDirect = new Function(
  "terminationUnknown",
  "listDockerResourceRows",
  "resourceListName",
  "inspectDockerResource",
  "directResourceLabelKey",
  "resourceLabels",
  "containerName",
  `return function inspectOwnedDirectResource(resource) ${directInspectBody};`
)(
  false,
  () => ({ status: "PASS", rows: [{ ID: "container-id-1", Names: "gate1-ct-paid-v1-a3-999-z9-db" }] }),
  (kind, value) => kind === "container" ? String(value.Names ?? "").replace(/^\/+/, "") : String(value.Name ?? ""),
  () => ({
    status: "PRESENT",
    value: {
      Id: "container-id-1",
      Name: "/gate1-ct-paid-v1-a3-999-z9-db",
      Image: "sha256:image-id",
      Config: { Image: "repo@sha256:digest" },
      HostConfig: {
        Binds: ["gate1-ct-paid-v1-a3-999-z9-volume:/var/lib/postgresql/data"],
        NetworkMode: "gate1-ct-paid-v1-a3-999-z9-net"
      },
      Mounts: [],
      NetworkSettings: { Networks: {} },
      Labels: { "com.comment_translator.gate1.run": "run-label" }
    }
  }),
  "com.comment_translator.gate1.run",
  (value) => value?.Config?.Labels ?? value?.Labels ?? {},
  (value) => String(value?.Name ?? "").replace(/^\//, "")
);
const configuredOnlyResource = {
  kind: "container",
  plannedName: "gate1-ct-paid-v1-a3-999-z9-db",
  runLabel: "run-label",
  imageId: "sha256:image-id",
  imageReference: "repo@sha256:digest",
  networkName: "gate1-ct-paid-v1-a3-999-z9-net",
  volumeName: "gate1-ct-paid-v1-a3-999-z9-volume",
  mountTarget: "/var/lib/postgresql/data",
  observedId: "container-id-1"
};
assert.equal(inspectDirect(configuredOnlyResource).status, "OWNED", "configured failed-start state can be recovered");
assert.equal(inspectDirect({ ...configuredOnlyResource, observedId: "replacement-id" }).status, "MISMATCH", "replacement container ID is held");

function runInjectedTransportProbe({ endpoint, inheritedOverride, captureFailure = false, runnerReceipt = null, runnerOuterFailure = false, checks }) {
  const seam = `
const transportCalls = [];
const spawnSync = (command, args, options = {}) => {
  transportCalls.push({ command, args, options });
  if (command === "C:/Program Files/Docker/Docker/resources/bin/docker.exe" && args[0] === "context" && args[1] === "inspect") {
    return ${JSON.stringify(captureFailure
      ? { status: null, stdout: "", stderr: "", signal: "SIGTERM", error: { code: "ETIMEDOUT" } }
      : { status: 0, stdout: JSON.stringify({ docker: { Host: endpoint } }), stderr: "" })};
  }
  if (command === process.execPath && args[0] === cliRunnerPath) {
    const receipt = ${JSON.stringify(runnerReceipt)} ?? {
      status: 0,
      signal: "NONE",
      errorCode: "NONE",
      stdout: "",
      terminationConfirmed: true,
      timedOut: false,
      preSpawnFailure: false,
      captureFailure: false,
      diagnostics: {
        outputClass: "UNCLASSIFIED",
        lastErrorClass: "NONE",
        bridgeAssertionCode: "NONE",
        bridgeAssertionInputCount: 0,
        bridgeAssertionAllowlistMatch: false,
        stdoutTruncated: false,
        stderrTruncated: false
      }
    };
    return { status: ${runnerOuterFailure ? 1 : 0}, stdout: typeof receipt === "string" ? receipt : JSON.stringify(receipt), stderr: "" };
  }
  return { status: 0, stdout: "", stderr: "" };
};
`;
  const entry = source.replace(
    /\ntry \{\n  run\(\);\n\} catch \(error\) \{[\s\S]*?\n\}\s*$/,
    "\n"
  );
  assert.notEqual(entry, source, "transport probe removes the integration entrypoint");
  const injected = entry
    .replaceAll('from "./lib/', 'from "./scripts/lib/')
    .replace('import { spawnSync } from "node:child_process";', seam)
    + `\n${checks}\n`;
  const env = { ...process.env };
  for (const key of [
    "DOCKER_HOST",
    "DOCKER_CONTEXT",
    "DOCKER_CONFIG",
    "DOCKER_TLS_VERIFY",
    "DOCKER_CERT_PATH",
    "SUPABASE_CLI_BINARY_OVERRIDE"
  ]) {
    for (const existingKey of Object.keys(env)) {
      if (existingKey.toUpperCase() === key) delete env[existingKey];
    }
  }
  if (inheritedOverride) env[inheritedOverride] = "synthetic-untrusted-routing";
  return spawnSync(process.execPath, ["--input-type=module"], {
    input: injected,
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
    timeout: 10000
  });
}

const pinnedGoProbe = runInjectedTransportProbe({
  endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
  checks: `
localCliProfile = "preview-pinned-go";
fs.lstatSync = () => ({ isSymbolicLink: () => false });
fs.readFileSync = () => Buffer.from("synthetic-binary");
sha256Bytes = () => previewGoCliSha256;
const result = runLocalSupabaseCli(root, ["migration", "up", "--local", "--include-all"]);
assert.equal(result.status, 0);
const configured = JSON.parse(transportCalls.at(-1).options.input);
assert.equal(configured.command, previewGoCliPath);
assert.deepEqual(configured.args, ["migration", "up", "--local", "--include-all"]);
assert.equal(configured.shell, false);
assert.equal(configured.env.DO_NOT_TRACK, "1");
assert.equal(configured.env.SUPABASE_TELEMETRY_DISABLED, "1");
const beforeMismatch = transportCalls.length;
sha256Bytes = () => "0".repeat(64);
assert.throws(() => runLocalSupabaseCli(root, ["migration", "up", "--local", "--include-all"]), /PREVIEW_GO_BINARY_IDENTITY/);
assert.equal(transportCalls.length, beforeMismatch, "wrong binary blocks before runner spawn");
sha256Bytes = () => previewGoCliSha256;
fs.lstatSync = () => ({ isSymbolicLink: () => true });
assert.throws(() => runLocalSupabaseCli(root, ["--version"]), /PREVIEW_GO_BINARY_REGULAR/);
assert.equal(transportCalls.length, beforeMismatch, "symlink blocks before runner spawn");
`
});
assert.equal(pinnedGoProbe.status, 0, "hash-pinned local Go routing accepts the exact binary and rejects drift before spawn");

const validTransportProbe = runInjectedTransportProbe({
  endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
  checks: `
const dockerResult = runDocker(["version"]);
assert.equal(dockerResult.exitCode, 0);
assert.deepEqual(runDockerDiscardingOutput(["ps"]), { exitCode: 0, signal: "NONE", errorCode: "NONE" });
assert.equal(runStreamedDockerInput(["exec"], bridgePath).status, 0);
assert.equal(runLocalSupabaseCli(root, ["status", "-o", "json"]).status, 0);
assert.equal(transportCalls.length, 5);
assert.deepEqual(transportCalls[0].args, ["context", "inspect", "desktop-linux", "--format", "{{json .Endpoints}}"]);
assert.equal(transportCalls[0].options.timeout, 60000);
assert.equal(transportCalls[0].options.shell, false);
assert.equal(transportCalls[0].options.env.DOCKER_HOST, undefined);
const directCalls = transportCalls.filter(call => call.command === "C:/Program Files/Docker/Docker/resources/bin/docker.exe").slice(1);
assert.equal(directCalls.length, 2);
for (const call of directCalls) {
  assert.equal(call.options.timeout, 60000);
  assert.equal(call.options.shell, false);
  assert.equal(call.options.env.DOCKER_HOST, "npipe:////./pipe/dockerDesktopLinuxEngine");
  assert.equal(call.options.env.DOCKER_CONTEXT, undefined);
  assert.equal(call.options.env.DOCKER_CONFIG, undefined);
  assert.equal(call.options.env.SUPABASE_CLI_BINARY_OVERRIDE, undefined);
}
const runnerCalls = transportCalls.filter(call => call.command === process.execPath && call.args[0] === cliRunnerPath);
assert.equal(runnerCalls.length, 2);
for (const call of runnerCalls) {
  assert.equal(call.options.timeout, undefined);
  assert.equal(call.options.shell, false);
  assert.equal(call.options.env.DOCKER_HOST, "npipe:////./pipe/dockerDesktopLinuxEngine");
  const config = JSON.parse(call.options.input);
  assert.equal(config.timeoutMs, 300000);
  assert.equal(config.shell, false);
  assert.deepEqual(config.env, call.options.env);
  assert.equal(config.env.PGHOST, undefined);
  assert.equal(config.env.DATABASE_URL, undefined);
  assert.equal(config.env.SUPABASE_ACCESS_TOKEN, undefined);
}
console.log("TRANSPORT_PROBE=PASS");
`
});
assert.equal(validTransportProbe.status, 0, validTransportProbe.stderr);
assert.equal(validTransportProbe.stdout.trim(), "TRANSPORT_PROBE=PASS");

for (const override of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_CONFIG",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
  "SUPABASE_CLI_BINARY_OVERRIDE"
]) {
  const blocked = runInjectedTransportProbe({
    endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
    inheritedOverride: override,
    checks: `
const result = runDocker(["version"]);
assert.equal(result.exitCode, 1);
assert.equal(transportCalls.length, 0);
console.log("OVERRIDE_REJECTED=${override}");
`
  });
  assert.equal(blocked.status, 0, `${override}: ${blocked.stderr}`);
  assert.equal(blocked.stdout.trim(), `OVERRIDE_REJECTED=${override}`);
}

for (const scenario of [
  { endpoint: "tcp://synthetic.invalid:2375", label: "WRONG_ENDPOINT" },
  { endpoint: "", label: "MISSING_ENDPOINT" }
]) {
  const blocked = runInjectedTransportProbe({
    ...scenario,
    checks: `
const result = runDocker(["version"]);
assert.equal(result.exitCode, 1);
assert.equal(transportCalls.length, 1);
console.log("${scenario.label}");
`
  });
  assert.equal(blocked.status, 0, `${scenario.label}: ${blocked.stderr}`);
  assert.equal(blocked.stdout.trim(), scenario.label);
}

const captureBlocked = runInjectedTransportProbe({
  endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
  captureFailure: true,
  checks: `
const result = runDocker(["version"]);
assert.equal(result.exitCode, 1);
assert.equal(transportCalls.length, 1);
console.log("CAPTURE_FAILURE_REJECTED");
`
});
assert.equal(captureBlocked.status, 0, captureBlocked.stderr);
assert.equal(captureBlocked.stdout.trim(), "CAPTURE_FAILURE_REJECTED");

const baseReceiptDiagnostics = {
  outputClass: "UNCLASSIFIED",
  lastErrorClass: "NONE",
  bridgeAssertionCode: "NONE",
  bridgeAssertionInputCount: 0,
  bridgeAssertionAllowlistMatch: false,
  stdoutTruncated: false,
  stderrTruncated: false
};

const realStopReceiptCleanup = runInjectedTransportProbe({
  endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
  runnerReceipt: {
    status: 1,
    signal: "NONE",
    errorCode: "NONE",
    stdout: "",
    terminationConfirmed: false,
    timedOut: false,
    preSpawnFailure: false,
    captureFailure: false,
    diagnostics: baseReceiptDiagnostics
  },
  checks: `
assert.equal(terminationUnknown, false);
let cleanup = null;
let fsRemoveCalls = 0;
const originalRmSync = fs.rmSync;
fs.rmSync = (...args) => { fsRemoveCalls += 1; throw new Error("UNEXPECTED_TEST_FILESYSTEM_REMOVE"); };
try {
  throw new Error("synthetic-primary-failure");
} catch {
  // The cleanup below is intentionally reached through the same finally shape as the runtime case.
} finally {
  cleanup = cleanupGeneratedRuntimeResources({
    cliProjectId: "gate1-ct-paid-v1-a3-999-z9",
    stopCli: (projectId) => runLocalSupabaseCli(root, ["stop", "--project-id", projectId, "--no-backup", "--yes"]),
    workDirectory: path.join(os.tmpdir(), "gate1-cli-atomicity-runtime-cleanup"),
    removeDirectory: removeGeneratedCliWorkDirectory
  });
  fs.rmSync = originalRmSync;
}
assert.equal(terminationUnknown, true, "the real UNKNOWN receipt latches terminationUnknown during stop");
assert.equal(cleanup.status, "FAIL");
assert.equal(fsRemoveCalls, 0, "the same finally cleanup path performs no filesystem removal after UNKNOWN stop");
assert.ok(cleanup.failures.some(({ action }) => action === "CLI_STOP"));
assert.ok(cleanup.failures.some(({ action }) => action === "CLI_WORK_DIRECTORY_REMOVE"));
console.log("REAL_STOP_RECEIPT_LATCHED_CLEANUP_GUARDED");
`
});
assert.equal(realStopReceiptCleanup.status, 0, realStopReceiptCleanup.stderr);
assert.equal(realStopReceiptCleanup.stdout.trim(), "REAL_STOP_RECEIPT_LATCHED_CLEANUP_GUARDED");

const missingReceipt = runInjectedTransportProbe({
  endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
  runnerReceipt: { status: 1, signal: "NONE", errorCode: "NONE", stdout: "", diagnostics: baseReceiptDiagnostics },
  checks: `
const result = runLocalSupabaseCli(root, ["status", "-o", "json"]);
assert.equal(result.terminationUnknown, true);
assert.equal(result.errorCode, "CLI_RUNNER_RECEIPT_INCOMPLETE");
assert.equal(runDocker(["version"]).exitCode, 1);
assert.equal(transportCalls.length, 2);
console.log("MISSING_RECEIPT_LATCHED");
`
});
assert.equal(missingReceipt.status, 0, missingReceipt.stderr);
assert.equal(missingReceipt.stdout.trim(), "MISSING_RECEIPT_LATCHED");

const outerRunnerFailure = runInjectedTransportProbe({
  endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
  runnerOuterFailure: true,
  runnerReceipt: "",
  checks: `
const result = runLocalSupabaseCli(root, ["status", "-o", "json"]);
assert.equal(result.terminationUnknown, true);
assert.equal(result.errorCode, "CLI_RUNNER_OUTER_FAILURE");
assert.equal(runDocker(["version"]).exitCode, 1);
console.log("OUTER_RUNNER_FAILURE_LATCHED");
`
});
assert.equal(outerRunnerFailure.status, 0, outerRunnerFailure.stderr);
assert.equal(outerRunnerFailure.stdout.trim(), "OUTER_RUNNER_FAILURE_LATCHED");

const preSpawnFailure = runInjectedTransportProbe({
  endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
  runnerReceipt: {
    status: 1,
    signal: "NONE",
    errorCode: "ENOENT",
    stdout: "",
    terminationConfirmed: false,
    timedOut: false,
    preSpawnFailure: true,
    captureFailure: false,
    diagnostics: baseReceiptDiagnostics
  },
  checks: `
const result = runLocalSupabaseCli(root, ["status", "-o", "json"]);
assert.equal(result.terminationUnknown, false);
assert.equal(result.status, null);
assert.equal(result.errorCode, "ENOENT");
assert.equal(runDocker(["version"]).exitCode, 0);
console.log("PRESPAWN_FAILURE_SAFE");
`
});
assert.equal(preSpawnFailure.status, 0, preSpawnFailure.stderr);
assert.equal(preSpawnFailure.stdout.trim(), "PRESPAWN_FAILURE_SAFE");

for (const scenario of [
  { label: "TIMEOUT", errorCode: "CLI_TIMEOUT", timedOut: true },
  { label: "INPUT_ERROR", errorCode: "CLI_INPUT_FILE_ERROR", timedOut: false }
]) {
  const boundedReceipt = {
    status: 1,
    signal: "NONE",
    errorCode: scenario.errorCode,
    stdout: "",
    terminationConfirmed: true,
    timedOut: scenario.timedOut,
    preSpawnFailure: false,
    captureFailure: false,
    diagnostics: {
      ...baseReceiptDiagnostics,
      outputClass: "SQL",
      lastErrorClass: "INJECTED_ATOMICITY_FAILURE",
      injectedAtomicityFailure: true
    }
  };
  const boundedConsumers = runInjectedTransportProbe({
    endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
    runnerReceipt: boundedReceipt,
    checks: `
const localResult = runLocalSupabaseCli(root, ["migration", "up", "--local"]);
assert.equal(localResult.cliDiagnostics.injectedAtomicityFailure, true);
const streamedResult = runStreamedDockerInput(["exec"], bridgePath);
assert.equal(transportCalls.filter(call => call.command === process.execPath && call.args[0] === cliRunnerPath).length, 2);
console.log(JSON.stringify({
  label: "${scenario.label}",
  local: {
    status: localResult.status,
    signal: localResult.signal,
    errorCode: localResult.errorCode,
    terminationUnknown: localResult.terminationUnknown,
    timedOut: localResult.timedOut,
    captureFailure: localResult.captureFailure,
    cliDiagnostics: localResult.cliDiagnostics
  },
  streamed: {
    status: streamedResult.status,
    signal: streamedResult.signal,
    errorCode: streamedResult.errorCode,
    terminationUnknown: streamedResult.terminationUnknown,
    timedOut: streamedResult.timedOut,
    captureFailure: streamedResult.captureFailure,
    bridgeAssertionCode: streamedResult.bridgeAssertionCode,
    bridgeAssertionInputCount: streamedResult.bridgeAssertionInputCount,
    bridgeAssertionAllowlistMatch: streamedResult.bridgeAssertionAllowlistMatch
  }
}));
`
  });
  assert.equal(boundedConsumers.status, 0, boundedConsumers.stderr);
  const boundedPayload = JSON.parse(boundedConsumers.stdout.trim());
  assert.equal(boundedPayload.label, scenario.label);
  assert.equal(atomicityMarkerGuard(boundedPayload.local).status, "FAIL", `${scenario.label} local result fails before the expected SQL marker`);
  assert.equal(bridgeMarkerGuard(boundedPayload.streamed).status, "FAIL", `${scenario.label} streamed result fails before the expected SQL marker`);
}

const signalMarkerProbe = runInjectedTransportProbe({
  endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
  runnerReceipt: {
    status: 1,
    signal: "SIGTERM",
    errorCode: "NONE",
    stdout: "",
    terminationConfirmed: true,
    timedOut: false,
    preSpawnFailure: false,
    captureFailure: false,
    diagnostics: {
      ...baseReceiptDiagnostics,
      outputClass: "SQL",
      lastErrorClass: "BRIDGE_CANONICAL_ASSERTION",
      bridgeAssertionCode: "BRIDGE_CLEAN_STATE_MISMATCH",
      bridgeAssertionInputCount: 1,
      bridgeAssertionAllowlistMatch: true
    }
  },
  checks: `
const streamedResult = runStreamedDockerInput(["exec"], bridgePath);
assert.equal(streamedResult.status, 1);
assert.equal(streamedResult.signal, "SIGTERM");
assert.equal(streamedResult.errorCode, "CLI_RUNNER_ERROR");
assert.equal(streamedResult.terminationConfirmed, true);
assert.equal(streamedResult.timedOut, false);
assert.equal(streamedResult.bridgeAssertionCode, "BRIDGE_CLEAN_STATE_MISMATCH");
assert.equal(streamedResult.bridgeAssertionAllowlistMatch, true);
console.log(JSON.stringify(streamedResult));
`
});
assert.equal(signalMarkerProbe.status, 0, signalMarkerProbe.stderr);
const signalMarkerResult = JSON.parse(signalMarkerProbe.stdout.trim());
assert.equal(bridgeMarkerGuard(signalMarkerResult).status, "FAIL", "a signaled child fails before a valid bridge marker is accepted");

const normalMarkerProbe = runInjectedTransportProbe({
  endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
  runnerReceipt: {
    status: 1,
    signal: "NONE",
    errorCode: "NONE",
    stdout: "",
    terminationConfirmed: true,
    timedOut: false,
    preSpawnFailure: false,
    captureFailure: false,
    diagnostics: {
      ...baseReceiptDiagnostics,
      outputClass: "SQL",
      lastErrorClass: "BRIDGE_CANONICAL_ASSERTION",
      bridgeAssertionCode: "BRIDGE_CLEAN_STATE_MISMATCH",
      bridgeAssertionInputCount: 1,
      bridgeAssertionAllowlistMatch: true
    }
  },
  checks: `
const streamedResult = runStreamedDockerInput(["exec"], bridgePath);
assert.equal(streamedResult.status, 1);
assert.equal(streamedResult.signal, "NONE");
assert.equal(streamedResult.errorCode, "NONE");
assert.equal(streamedResult.bridgeAssertionCode, "BRIDGE_CLEAN_STATE_MISMATCH");
assert.equal(streamedResult.bridgeAssertionAllowlistMatch, true);
console.log(JSON.stringify(streamedResult));
`
});
assert.equal(normalMarkerProbe.status, 0, normalMarkerProbe.stderr);
const normalMarkerResult = JSON.parse(normalMarkerProbe.stdout.trim());
assert.equal(bridgeMarkerGuard(normalMarkerResult).status, "PASS", "a normal nonzero SQL result still accepts its valid bridge marker");

const generatedProjectId = "gate1-ct-paid-v1-a3-999-z9";
const generatedResources = {
  container: { plannedName: "gate1-ct-paid-v1-a3-999-z9-db", verifiedName: "gate1-ct-paid-v1-a3-999-z9-db", observedId: "gate1-db-id", attempted: true },
  volume: { plannedName: "gate1-ct-paid-v1-a3-999-z9-volume", verifiedName: "gate1-ct-paid-v1-a3-999-z9-volume", observedId: "gate1-volume-id", attempted: true },
  network: { plannedName: "gate1-ct-paid-v1-a3-999-z9-net", verifiedName: "gate1-ct-paid-v1-a3-999-z9-net", observedId: "gate1-network-id", attempted: true }
};

for (const outcomeStatus of ["PASS", "SETUP_BLOCKED", "FAIL", "EXCEPTION"]) {
  const calls = [];
  const removedKinds = new Set();
  let outcome = null;
  let cleanup = null;
  try {
    if (outcomeStatus === "EXCEPTION") throw new Error("simulated-secret-value");
    outcome = { status: outcomeStatus };
  } catch {
    outcome = { status: "FAIL", reason: "SANITIZED_EXCEPTION" };
  } finally {
    cleanup = cleanupGeneratedRuntimeResources({
      cliProjectId: generatedProjectId,
      stopCli: (projectId) => {
        calls.push(["CLI_STOP", projectId]);
        return { status: 0 };
      },
      directResources: generatedResources,
      inspectResource: (resource) => {
        if (removedKinds.has(resource.kind)) return { status: "ABSENT" };
        return { status: "OWNED", observedId: resource.observedId, verifiedName: resource.verifiedName };
      },
      removeResource: (resource, inspected) => {
        const target = resource.kind === "volume" ? inspected.verifiedName : inspected.observedId;
        const args = resource.kind === "container"
          ? ["rm", "-f", target]
          : resource.kind === "network"
            ? ["network", "rm", target]
            : ["volume", "rm", target];
        calls.push(["DOCKER", args]);
        removedKinds.add(resource.kind);
        return { exitCode: 0 };
      },
      workDirectory: "generated-work-directory",
      removeDirectory: (directory) => { calls.push(["WORK_DIRECTORY", directory]); return { status: 0 }; }
    });
  }
  assert.equal(outcome.status, outcomeStatus === "EXCEPTION" ? "FAIL" : outcomeStatus);
  assert.equal(cleanup.status, "PASS", `${outcomeStatus} cleanup passes`);
  assert.deepEqual(calls.map(([action]) => action), [
    "CLI_STOP",
    "DOCKER",
    "DOCKER",
    "DOCKER",
    "WORK_DIRECTORY"
  ], `${outcomeStatus} path performs every cleanup action`);
}

const failedCleanup = cleanupGeneratedRuntimeResources({
  cliProjectId: generatedProjectId,
  stopCli: () => ({ status: 7 }),
  directResources: generatedResources,
  runDocker: () => { throw new Error("simulated-secret-value"); },
  workDirectory: "generated-work-directory",
  removeDirectory: () => undefined
});
assert.equal(failedCleanup.status, "FAIL", "cleanup failures fail closed");
assert.ok(failedCleanup.failures.every(({ code }) => !code.includes("simulated-secret-value")));

// R4B/C review repairs: these probes exercise the production seams themselves.
const resourceListIdentityBody = functionBody("resourceListIdentity");
const resourceListIdentity = new Function(`return function resourceListIdentity(kind, value) ${resourceListIdentityBody};`)();
const parseDockerJsonLinesBody = functionBody("parseDockerJsonLines");
const parseDockerJsonLines = new Function(
  "resourceListIdentity",
  `return function parseDockerJsonLines(stdout, kind) ${parseDockerJsonLinesBody};`
)(resourceListIdentity);
assert.deepEqual(
  parseDockerJsonLines('{"Name":"gate1-ct-paid-v1-a3-999-z9-volume"}\n', "volume"),
  [{ Name: "gate1-ct-paid-v1-a3-999-z9-volume" }],
  "complete volume inventory parses one strict row"
);
for (const [kind, row] of [
  ["container", "null"],
  ["network", "[]"],
  ["volume", "7"],
  ["container", '{"Names":"helper"}'],
  ["network", '{"Name":"helper"}'],
  ["volume", '{"Name":""}'],
  ["volume", '{not-json}']
]) {
  assert.equal(parseDockerJsonLines(row, kind), null, `${kind} malformed or identity-incomplete row is rejected`);
}
assert.deepEqual(parseDockerJsonLines("", "volume"), [], "complete empty inventory is the only zero-row form");

const listDockerResourceRowsBody = functionBody("listDockerResourceRows");
const dockerResourceListCommandBody = functionBody("dockerResourceListCommand");
const dockerResourceListCommand = new Function(`return function dockerResourceListCommand(kind, name) ${dockerResourceListCommandBody};`)();
const listDockerResourceRows = new Function(
  "terminationUnknown",
  "runDocker",
  "parseDockerJsonLines",
  "dockerResourceListCommand",
  `return function listDockerResourceRows(kind, plannedName) ${listDockerResourceRowsBody};`
)(false, () => ({ exitCode: 0, stdout: "", stderr: "", signal: "NONE", errorCode: "NONE" }), parseDockerJsonLines, dockerResourceListCommand);
assert.equal(listDockerResourceRows("volume", "gate1-ct-paid-v1-a3-999-z9-volume").status, "PASS", "empty list is a verified absence candidate");
for (const result of [
  { exitCode: 1, stdout: "no such volume", stderr: "", signal: "NONE", errorCode: "NONE" },
  { exitCode: 0, stdout: '{"Name":"x"}\n{not-json}\n', stderr: "", signal: "NONE", errorCode: "NONE" },
  { exitCode: 0, stdout: '{"Name":"x"}\n', stderr: "", signal: "SIGTERM", errorCode: "NONE" }
]) {
  const resultRows = new Function(
    "terminationUnknown",
    "runDocker",
    "parseDockerJsonLines",
    "dockerResourceListCommand",
    `return function listDockerResourceRows(kind, plannedName) ${listDockerResourceRowsBody};`
  )(false, () => result, parseDockerJsonLines, dockerResourceListCommand)("volume", "gate1-ct-paid-v1-a3-999-z9-volume");
  assert.equal(resultRows.status, "UNKNOWN", "daemon, malformed, and signaled list results never become ABSENT");
}

let unattemptedRemoveCalls = 0;
const unattemptedCleanup = cleanupGeneratedRuntimeResources({
  directResources: {
    container: {
      plannedName: "gate1-ct-paid-v1-a3-999-z9-db",
      verifiedName: "gate1-ct-paid-v1-a3-999-z9-db",
      observedId: "foreign-id",
      attempted: false
    }
  },
  inspectResource: () => ({ status: "OWNED", observedId: "foreign-id", verifiedName: "gate1-ct-paid-v1-a3-999-z9-db" }),
  removeResource: () => { unattemptedRemoveCalls += 1; return { status: 0 }; }
});
assert.equal(unattemptedRemoveCalls, 0, "unattempted direct resources are never removed");
assert.equal(unattemptedCleanup.status, "FAIL", "unattempted cleanup is fail-closed");

const imageInspectionBody = functionBody("imageInspection");
const imageInspectResult = (config) => new Function(
  "terminationUnknown",
  "runDocker",
  "parseDockerInspectResult",
  `return function imageInspection(reference, options) ${imageInspectionBody};`
)(false, () => ({ exitCode: 0, stdout: "{}", stderr: "", signal: "NONE", errorCode: "NONE" }), () => ({
  Id: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  RepoDigests: ["public.ecr.aws/supabase/postgres@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
  ...(config === undefined ? {} : { Config: config })
}));
for (const [label, config, expectedStatus] of [
  ["absent Volumes", {}, "PASS"],
  ["null Volumes", { Volumes: null }, "PASS"],
  ["empty Volumes", { Volumes: {} }, "PASS"],
  ["nonempty Volumes", { Volumes: { "/var/lib/postgresql/data": {} } }, "UNKNOWN"],
  ["array Volumes", { Volumes: [] }, "UNKNOWN"]
]) {
  const inspected = imageInspectResult(config)("public.ecr.aws/supabase/postgres:17.6.1.140", { requireEmptyConfigVolumes: true });
  assert.equal(inspected.status, expectedStatus, `direct PG image ${label} handling`);
}
for (const config of [undefined, null, [], "invalid"]) {
  const inspected = imageInspectResult(config)("public.ecr.aws/supabase/postgres:17.6.1.140", { requireEmptyConfigVolumes: true });
  assert.equal(inspected.status, "UNKNOWN", "direct PG image rejects incomplete or invalid Config");
}

const directValue = {
  Id: "container-id-1",
  Name: "/gate1-ct-paid-v1-a3-999-z9-db",
  Image: "sha256:image-id",
  Config: { Image: "repo@sha256:digest" },
  HostConfig: {
    Binds: ["gate1-ct-paid-v1-a3-999-z9-volume:/var/lib/postgresql/data"],
    NetworkMode: "gate1-ct-paid-v1-a3-999-z9-net"
  },
  Mounts: [],
  NetworkSettings: { Networks: {} },
  Labels: { "com.comment_translator.gate1.run": "run-label" }
};
const makeDirectInspector = (value, listResult = { status: "PASS", rows: [{ ID: "container-id-1", Names: "gate1-ct-paid-v1-a3-999-z9-db" }] }, inspectedResult = { status: "PRESENT", value }) => new Function(
  "terminationUnknown",
  "listDockerResourceRows",
  "resourceListName",
  "inspectDockerResource",
  "directResourceLabelKey",
  "resourceLabels",
  "containerName",
  `return function inspectOwnedDirectResource(resource) ${directInspectBody};`
)(
  false,
  () => listResult,
  (kind, row) => kind === "container" ? String(row.Names ?? "").replace(/^\/+/, "") : String(row.Name ?? ""),
  () => inspectedResult,
  "com.comment_translator.gate1.run",
  (value) => value?.Config?.Labels ?? value?.Labels ?? {},
  (value) => String(value?.Name ?? "").replace(/^\//, "")
);
const directResource = {
  kind: "container",
  plannedName: "gate1-ct-paid-v1-a3-999-z9-db",
  runLabel: "run-label",
  imageId: "sha256:image-id",
  imageReference: "repo@sha256:digest",
  networkName: "gate1-ct-paid-v1-a3-999-z9-net",
  volumeName: "gate1-ct-paid-v1-a3-999-z9-volume",
  mountTarget: "/var/lib/postgresql/data",
  observedId: "container-id-1"
};
assert.equal(makeDirectInspector(directValue)(directResource).status, "OWNED", "exact listed resource is owned");
for (const [label, value] of [
  ["label", { ...directValue, Labels: { "com.comment_translator.gate1.run": "foreign" } }],
  ["id", { ...directValue, Id: "replacement-id" }],
  ["image", { ...directValue, Image: "sha256:other" }],
  ["mount", { ...directValue, HostConfig: { ...directValue.HostConfig, Binds: ["foreign-volume:/var/lib/postgresql/data"] } }],
  ["network", { ...directValue, HostConfig: { ...directValue.HostConfig, NetworkMode: "foreign-network" } }]
]) {
  assert.equal(makeDirectInspector(value)(directResource).status, "MISMATCH", `direct resource ${label} mismatch is held`);
}
assert.equal(makeDirectInspector(directValue, { status: "PASS", rows: [{ ID: "other-id", Names: "gate1-ct-paid-v1-a3-999-z9-db-helper" }] })(directResource).status, "ABSENT", "substring list match does not prove exact planned-name presence");
assert.equal(makeDirectInspector(directValue, { status: "UNKNOWN", code: "DOCKER_RESOURCE_LIST_UNKNOWN" })(directResource).status, "UNKNOWN", "incomplete list blocks ownership");
assert.equal(makeDirectInspector(directValue, { status: "PASS", rows: [{ ID: "container-id-1", Names: "gate1-ct-paid-v1-a3-999-z9-db" }] }, { status: "UNKNOWN", code: "DOCKER_INSPECTION_FAILED" })(directResource).status, "UNKNOWN", "inspect failure after presence never becomes absence");

const createRuntimeBody = functionBody("createDisposableDatabaseRuntime");
function makeCreateRuntimeProbe({ collisionKind = "", failedKind = "", readinessExitCodes = [] } = {}) {
  const state = new Map();
  const calls = [];
  let readinessIndex = 0;
  let sleepCalls = 0;
  const processProbe = { env: {} };
  const imageInspectionProbe = () => ({
    status: "PASS",
    reference: "public.ecr.aws/supabase/postgres:17.6.1.140",
    id: "sha256:image-id",
    digest: "sha256:image-digest",
    repoDigest: "public.ecr.aws/supabase/postgres@sha256:image-digest"
  });
  const inspectProbe = (resource) => {
    if (collisionKind === resource.kind && !state.has(resource.kind)) return { status: "MISMATCH", code: "DIRECT_RESOURCE_LABEL_MISMATCH" };
    const current = state.get(resource.kind);
    return current
      ? { status: "OWNED", verifiedName: resource.plannedName, observedId: current.observedId }
      : { status: "ABSENT" };
  };
  const runDockerProbe = (args, _input, options = {}) => {
    calls.push({ args, options });
    if (args[0] === "network" && args[1] === "create") {
      const kind = "network";
      state.set(kind, { observedId: "network-id" });
      return { exitCode: failedKind === kind ? 1 : 0, stdout: "network-id", stderr: "", signal: "NONE", errorCode: "NONE" };
    }
    if (args[0] === "volume" && args[1] === "create") {
      const kind = "volume";
      state.set(kind, { observedId: "volume-id" });
      return { exitCode: failedKind === kind ? 1 : 0, stdout: "volume-name", stderr: "", signal: "NONE", errorCode: "NONE" };
    }
    if (args[0] === "run") {
      const kind = "container";
      state.set(kind, { observedId: "container-id" });
      return { exitCode: failedKind === kind ? 1 : 0, stdout: "container-id", stderr: "", signal: "NONE", errorCode: "NONE" };
    }
    if (args[0] === "exec" && args.includes("pg_isready")) {
      const index = Math.min(readinessIndex++, Math.max(readinessExitCodes.length - 1, 0));
      const exitCode = readinessExitCodes.length > 0 ? readinessExitCodes[index] : 0;
      return { exitCode, stdout: "", stderr: "", signal: "NONE", errorCode: "NONE" };
    }
    if (args[0] === "exec") return { exitCode: 0, stdout: "", stderr: "", signal: "NONE", errorCode: "NONE" };
    return { exitCode: 0, stdout: "", stderr: "", signal: "NONE", errorCode: "NONE" };
  };
  const runtime = new Function(
    "runDocker",
    "inspectOwnedDirectResource",
    "imageInspection",
    "crypto",
    "generatedRunLabel",
    "directResourceNames",
    "localSleep",
    "disposableDatabaseImage",
    "directResourceLabelKey",
    "process",
    `let container = "";
     let disposableRuntime = null;
     let disposableRuntimeResources = { container: "", network: "", volume: "" };
     let verifiedDockerTransport = { environment: { PATH: "safe-path", BASELINE: "keep" } };
     let terminationUnknown = false;
     function createDisposableDatabaseRuntime() ${createRuntimeBody}
     return { createDisposableDatabaseRuntime, resources: () => disposableRuntimeResources };`
  )(
    runDockerProbe,
    inspectProbe,
    imageInspectionProbe,
    crypto,
    () => "gate1-ct-paid-v1-a3-999-z9",
    (label) => ({ container: `${label}-db`, network: `${label}-net`, volume: `${label}-volume` }),
    () => { sleepCalls += 1; },
    "public.ecr.aws/supabase/postgres:17.6.1.140",
    "com.comment_translator.gate1.run",
    processProbe
  );
  const result = runtime.createDisposableDatabaseRuntime();
  return { ...runtime, result, calls, state, processProbe, sleepCalls };
}

const collisionProbe = makeCreateRuntimeProbe({ collisionKind: "network" });
assert.equal(collisionProbe.result.status, "SETUP_BLOCKED", "same-name collision blocks before create");
assert.equal(collisionProbe.calls.length, 0, "collision emits no create call");
let collisionRemoveCalls = 0;
const collisionCleanup = cleanupGeneratedRuntimeResources({
  directResources: collisionProbe.resources(),
  inspectResource: () => ({ status: "OWNED", observedId: "foreign-id" }),
  removeResource: () => { collisionRemoveCalls += 1; return { status: 0 }; }
});
assert.equal(collisionRemoveCalls, 0, "collision resource is not registered for cleanup");
assert.equal(collisionCleanup.status, "PASS", "no attempted collision candidate leaves cleanup empty");

const failedCreateProbe = makeCreateRuntimeProbe({ failedKind: "network" });
assert.equal(failedCreateProbe.result.status, "SETUP_BLOCKED", "failed network create blocks runtime");
assert.equal(failedCreateProbe.resources().network.attempted, true, "failed create is registered as attempted");
let recoveredRemoveCalls = 0;
const recoveredCleanup = cleanupGeneratedRuntimeResources({
  directResources: failedCreateProbe.resources(),
  inspectResource: (resource) => failedCreateProbe.state.has(resource.kind)
    ? { status: "OWNED", observedId: failedCreateProbe.state.get(resource.kind).observedId, verifiedName: resource.verifiedName || resource.plannedName }
    : { status: "ABSENT" },
  removeResource: (resource) => {
    recoveredRemoveCalls += 1;
    failedCreateProbe.state.delete(resource.kind);
    return { status: 0 };
  }
});
assert.equal(recoveredCleanup.status, "PASS", "failed-create owned resource is recovered through cleanup");
assert.equal(recoveredRemoveCalls, 1, "only the failed-create owned resource is removed");

const passwordProbe = makeCreateRuntimeProbe();
assert.equal(passwordProbe.result.status, "PASS", "injected direct runtime create succeeds");
const runCall = passwordProbe.calls.find(({ args }) => args[0] === "run");
assert.ok(runCall, "container run call is emitted");
const envIndex = runCall.args.indexOf("--env");
assert.equal(runCall.args[envIndex + 1], "POSTGRES_PASSWORD", "password argv contains only the environment key");
assert.equal(runCall.args.some((value) => String(value).includes("POSTGRES_PASSWORD=")), false, "password value is absent from argv");
assert.equal(typeof runCall.options.environment.POSTGRES_PASSWORD, "string", "password exists only in Docker child environment");
assert.equal(passwordProbe.processProbe.env.POSTGRES_PASSWORD, undefined, "parent environment is unchanged");
for (const kind of ["network", "volume", "container"]) {
  assert.equal(passwordProbe.resources()[kind].attempted, true, `${kind} create is registered immediately before create`);
}

const readinessProbe = makeCreateRuntimeProbe({ readinessExitCodes: [2, 0] });
assert.equal(readinessProbe.result.status, "PASS", "runtime waits for TCP readiness before succeeding");
const readinessCalls = readinessProbe.calls.filter(({ args }) => args.includes("pg_isready"));
assert.equal(readinessCalls.length, 2, "runtime retries readiness until the second probe succeeds");
assert.deepEqual(readinessCalls[0].args, ["exec", "gate1-ct-paid-v1-a3-999-z9-db", "pg_isready", "--host=127.0.0.1", "--port=5432", "--username=postgres", "--dbname=postgres"], "readiness probe uses explicit loopback TCP host and port");
assert.deepEqual(readinessCalls[1].args, readinessCalls[0].args, "readiness retries preserve the exact TCP probe arguments");
assert.equal(readinessProbe.sleepCalls, 1, "readiness sleeps only between failed probes");
const neverReadyProbe = makeCreateRuntimeProbe({ readinessExitCodes: [2] });
assert.equal(neverReadyProbe.result.status, "SETUP_BLOCKED", "never-ready runtime is bounded as setup blocked");
assert.equal(neverReadyProbe.result.reason, "DISPOSABLE_DATABASE_NOT_READY");
assert.equal(neverReadyProbe.calls.filter(({ args }) => args.includes("pg_isready")).length, 60, "never-ready runtime performs exactly sixty readiness probes");
assert.equal(neverReadyProbe.sleepCalls, 60, "never-ready runtime uses the bounded sleep stub after each failed probe");

const pgdeltaProbeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gate1-cli-pgdelta-shape-"));
try {
  const pgdeltaProbeDirectory = path.join(pgdeltaProbeRoot, "supabase");
  fs.mkdirSync(pgdeltaProbeDirectory, { recursive: true });
  const pgdeltaPath = path.join(pgdeltaProbeDirectory, "config.toml");
  const pgdeltaConfig = `project_id = "gate1-ct-paid-v1-a3-deadbeef"\n[db]\nmajor_version = 17\n[db.pooler]\nenabled = false\n[experimental.pgdelta]\nenabled = true\n`;
  fs.writeFileSync(pgdeltaPath, pgdeltaConfig, "utf8");
  assert.equal(assertGeneratedConfig(pgdeltaProbeRoot).status, "PASS", "initial generated config accepts an existing pgdelta boolean");
  assert.equal(assertGeneratedConfig(pgdeltaProbeRoot, { requirePgdeltaDisabled: true }).status, "SETUP_BLOCKED", "start/reset preflight requires pgdelta false");
  fs.writeFileSync(pgdeltaPath, pgdeltaConfig.replace("major_version = 17", "major_version = 16"), "utf8");
  assert.equal(assertGeneratedConfig(pgdeltaProbeRoot).status, "SETUP_BLOCKED", "db major drift is not overwritten");
  fs.writeFileSync(pgdeltaPath, pgdeltaConfig.replace("enabled = false", "enabled = true"), "utf8");
  assert.equal(assertGeneratedConfig(pgdeltaProbeRoot).status, "SETUP_BLOCKED", "pooler enabled drift is not overwritten");
} finally {
  fs.rmSync(pgdeltaProbeRoot, { recursive: true, force: true });
}

const configureRuntimeBody = functionBody("configureDisposableCliRuntime");
const readCliProjectIdBody = functionBody("readCliProjectId");
const updateTomlBody = functionBody("updateTomlSectionValue");
const updateTomlValue = new Function(`return function updateTomlSectionValue(source, section, key, value) ${updateTomlBody};`)();
const ensureTomlBody = functionBody("ensureTomlSectionValue");
const ensureTomlValue = new Function(`return function ensureTomlSectionValue(source, section, key, value) ${ensureTomlBody};`)();
const configureProbeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gate1-cli-config-flow-"));
try {
  const configureDirectory = path.join(configureProbeRoot, "supabase");
  fs.mkdirSync(configureDirectory, { recursive: true });
  fs.writeFileSync(path.join(configureDirectory, "config.toml"), `project_id = "gate1-ct-paid-v1-a3-original"\n[api]\nport = 54321\n[db]\nport = 54322\nshadow_port = 54323\nmajor_version = 17\n[db.pooler]\nport = 54324\nenabled = false\n[studio]\nport = 54325\n[local_smtp]\nport = 54326\n[analytics]\nport = 54327\n[edge_runtime]\ninspector_port = 54328\n[experimental.pgdelta]\nenabled = true\n`, "utf8");
  const configureFlow = new Function(
    "path",
    "fs",
    "assert",
    "allocateNonConflictingPortBlock",
    "generatedNonce",
    "updateTomlSectionValue",
    "ensureTomlSectionValue",
    "assertGeneratedCliConfig",
    `return function configureDisposableCliRuntime(workDirectory) ${configureRuntimeBody};`
  )(
    path,
    fs,
    assert,
    () => [55421, 55422, 55423, 55424, 55425, 55426, 55427, 55428],
    () => "0123456789abcdef01234567",
    updateTomlValue,
    ensureTomlValue,
    assertGeneratedConfig
  );
  const configured = configureFlow(configureProbeRoot);
  const configuredText = fs.readFileSync(path.join(configureDirectory, "config.toml"), "utf8");
  assert.equal(configured.projectId, "gate1-ct-paid-v1-a3-0123456789abcdef0123", "CLI config flow bounds a full nonce to the 40-character project id limit");
  assert.equal(configured.projectId.length, 40, "CLI config flow emits the native CLI's maximum project id length");
  const readConfiguredProjectId = new Function(
    "path",
    "fs",
    `return function readCliProjectId(workDirectory) ${readCliProjectIdBody};`
  )(path, fs);
  assert.equal(readConfiguredProjectId(configureProbeRoot), configured.projectId, "read and configured CLI project ids remain identical");
  const overlengthProjectId = `gate1-ct-paid-v1-a3-${"a".repeat(21)}`;
  fs.writeFileSync(
    path.join(configureDirectory, "config.toml"),
    configuredText.replace(/^project_id\s*=\s*"[^"]*"$/m, `project_id = "${overlengthProjectId}"`),
    "utf8"
  );
  assert.throws(() => readConfiguredProjectId(configureProbeRoot), /CLI_PROJECT_ID_INVALID/, "read rejects an overlength CLI project id instead of normalizing it");
  assert.match(configuredText, /^\[experimental\.pgdelta\]\s*\n(?:[^\n]*\n)*enabled = false\s*$/m, "CLI config flow sets pgdelta false before first start/reset");
  assert.equal(assertGeneratedConfig(configureProbeRoot, { requirePgdeltaDisabled: true }).status, "PASS", "post-config first start/reset profile is strict-pass");
} finally {
  fs.rmSync(configureProbeRoot, { recursive: true, force: true });
}

console.log("comment-translator-paid-core-v1-gate1 runtime cleanup regression: PASS");
