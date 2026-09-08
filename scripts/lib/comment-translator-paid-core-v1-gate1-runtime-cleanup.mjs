const generatedProjectPattern = /^gate1-ct-paid-v1-a3-(?:\d+-)?[a-z0-9]+$/;
const generatedResourcePatterns = Object.freeze({
  container: /^gate1-ct-paid-v1-a3-(?:\d+-)?[a-z0-9]+-db$/,
  network: /^gate1-ct-paid-v1-a3-(?:\d+-)?[a-z0-9]+-net$/,
  volume: /^gate1-ct-paid-v1-a3-(?:\d+-)?[a-z0-9]+-volume$/
});

function sanitizedFailureCode(error) {
  const code = error && typeof error === "object" && typeof error.code === "string"
    ? error.code
    : "";
  return /^[A-Z0-9_-]{1,64}$/.test(code) ? code : "CLEANUP_EXCEPTION";
}

function resultSucceeded(result) {
  if (result === undefined || result === null) return false;
  if (typeof result === "boolean") return result === true;
  if (typeof result === "number") return result === 0;
  if (typeof result !== "object") return false;
  if (result.terminationUnknown === true || result.timedOut === true || result.captureFailure === true) return false;
  if (typeof result.signal === "string" && result.signal !== "NONE") return false;
  const hasExitCode = Object.prototype.hasOwnProperty.call(result, "exitCode");
  const hasStatus = Object.prototype.hasOwnProperty.call(result, "status");
  if (!hasExitCode && !hasStatus) return false;
  const exitCode = hasExitCode ? result.exitCode : result.status;
  return exitCode === 0;
}

function resultFailureCode(result) {
  if (result && typeof result === "object") {
    const exitCode = Object.prototype.hasOwnProperty.call(result, "exitCode")
      ? result.exitCode
      : Object.prototype.hasOwnProperty.call(result, "status")
        ? result.status
        : undefined;
    if (exitCode === null) return "PROCESS_UNAVAILABLE";
    if (typeof exitCode === "number" && Number.isInteger(exitCode)) return `EXIT_${exitCode}`;
  }
  if (typeof result === "number" && Number.isInteger(result)) return `EXIT_${result}`;
  return "CLEANUP_RESULT_INVALID";
}

function validateGeneratedName(kind, value) {
  const pattern = kind === "cliProjectId"
    ? generatedProjectPattern
    : generatedResourcePatterns[kind];
  return typeof value === "string" && pattern?.test(value) === true;
}

/**
 * Remove only resources recorded as created by this invocation.
 * Every callback is injected so the contract can be exercised without Docker.
 */
export function cleanupGeneratedRuntimeResources({
  cliProjectId = "",
  stopCli = null,
  directResources = {},
  runDocker = null,
  inspectResource = null,
  removeResource = null,
  workDirectory = "",
  removeDirectory = null
} = {}) {
  const failures = [];
  let actionCount = 0;
  let cliStopSucceeded = true;

  const attempt = (action, callback) => {
    actionCount += 1;
    try {
      const result = callback();
      if (!resultSucceeded(result)) {
        failures.push({ action, code: resultFailureCode(result) });
      }
    } catch (error) {
      failures.push({ action, code: sanitizedFailureCode(error) });
    }
  };

  if (cliProjectId) {
    if (!validateGeneratedName("cliProjectId", cliProjectId)) {
      failures.push({ action: "CLI_STOP", code: "GENERATED_PROJECT_ID_INVALID" });
      cliStopSucceeded = false;
    } else if (typeof stopCli !== "function") {
      failures.push({ action: "CLI_STOP", code: "CALLBACK_MISSING" });
      cliStopSucceeded = false;
    } else {
      const beforeFailureCount = failures.length;
      attempt("CLI_STOP", () => stopCli(cliProjectId));
      cliStopSucceeded = failures.length === beforeFailureCount;
    }
  }

  for (const kind of ["container", "volume", "network"]) {
    const configured = directResources?.[kind] ?? "";
    const resource = configured && typeof configured === "object"
      ? { kind, ...configured }
      : { kind, plannedName: configured, verifiedName: configured, observedId: configured };
    if (resource.knownAbsent === true && !resource.verifiedName) continue;
    const name = resource.verifiedName || resource.plannedName || "";
    if (!name) continue;
    if (resource.attempted !== true) {
      failures.push({ action: `DOCKER_${kind.toUpperCase()}_REMOVE`, code: "RESOURCE_NOT_ATTEMPTED" });
      continue;
    }
    if (!validateGeneratedName(kind, name)) {
      failures.push({ action: `DOCKER_${kind.toUpperCase()}_REMOVE`, code: "GENERATED_RESOURCE_NAME_INVALID" });
      continue;
    }
    if (typeof inspectResource !== "function" || typeof removeResource !== "function") {
      failures.push({ action: `DOCKER_${kind.toUpperCase()}_REMOVE`, code: "CALLBACK_MISSING" });
      continue;
    }
    attempt(`DOCKER_${kind.toUpperCase()}_REMOVE`, () => {
      const before = inspectResource(resource);
      if (!before || before.status !== "OWNED") {
        const error = new Error("RESOURCE_OWNERSHIP_UNVERIFIED");
        error.code = before?.code ?? "RESOURCE_OWNERSHIP_UNVERIFIED";
        throw error;
      }
      const removed = removeResource(resource, before);
      if (!resultSucceeded(removed)) return removed;
      const after = inspectResource(resource);
      if (!after || after.status !== "ABSENT") {
        const error = new Error("RESOURCE_RESIDUE_PRESENT");
        error.code = after?.code ?? "RESOURCE_RESIDUE_PRESENT";
        throw error;
      }
      return { status: 0 };
    });
  }

  if (workDirectory) {
    if (typeof removeDirectory !== "function") {
      failures.push({ action: "CLI_WORK_DIRECTORY_REMOVE", code: "CALLBACK_MISSING" });
    } else if (!cliStopSucceeded) {
      failures.push({ action: "CLI_WORK_DIRECTORY_REMOVE", code: "CLI_STOP_NOT_CONFIRMED" });
    } else {
      attempt("CLI_WORK_DIRECTORY_REMOVE", () => removeDirectory(workDirectory));
    }
  }

  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    actionCount,
    failureCount: failures.length,
    failures
  };
}
