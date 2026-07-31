import crypto from "node:crypto";
import path from "node:path";

import {
  AUTHORITY_PROJECT_REF,
  CANDIDATES,
  CLI_VERSION,
  INTEGRATION_REF,
  LOCAL_PROCESS_TIMEOUT_MS,
  MAX_BUFFER,
  REVIEWED_BASE,
  SQL_BYTES,
  SQL_PATH,
  SQL_SHA256,
  TARGET,
  runLocalContract,
  runOrderedLocalGates
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs";

function processSucceeded(result) {
  return result?.status === 0
    && result.error === undefined
    && result.signal == null;
}

function processText({ root, file, args, runProcess }) {
  let result;
  try {
    result = runProcess(file, args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: MAX_BUFFER,
      timeout: LOCAL_PROCESS_TIMEOUT_MS,
      windowsHide: true
    });
  } catch {
    return null;
  }
  return processSucceeded(result) && typeof result.stdout === "string"
    ? result.stdout.trim()
    : null;
}

function gitText(root, args, runProcess) {
  return processText({ root, file: "git", args, runProcess });
}

function matchesCanonicalIdentity(root, identity, runProcess) {
  if (
    !path.basename(identity.path).startsWith(`${identity.version}_`)
    || gitText(root, ["rev-parse", `HEAD:${identity.path}`], runProcess)
      !== identity.blob
  ) {
    return false;
  }
  let canonical;
  try {
    canonical = runProcess(
      "git",
      ["cat-file", "blob", identity.blob],
      {
        cwd: root,
        maxBuffer: MAX_BUFFER,
        timeout: LOCAL_PROCESS_TIMEOUT_MS,
        windowsHide: true
      }
    );
  } catch {
    return false;
  }
  return processSucceeded(canonical)
    && Buffer.isBuffer(canonical.stdout)
    && canonical.stdout.length === identity.bytes
    && crypto.createHash("sha256").update(canonical.stdout).digest("hex")
      === identity.sha256;
}

function candidatesMatch(root, runProcess) {
  const migrationTree = gitText(
    root,
    ["ls-tree", "--name-only", "HEAD:supabase/migrations"],
    runProcess
  );
  if (migrationTree === null) return false;
  const names = migrationTree.split(/\r?\n/);
  if (CANDIDATES.some((identity) =>
    names[Number(identity.order) - 1] !== path.basename(identity.path))) {
    return false;
  }
  return CANDIDATES.every((identity) =>
    matchesCanonicalIdentity(root, identity, runProcess));
}

function cliMatches(cliPath, root, runProcess, fileSystem) {
  return fileSystem.existsSync(cliPath)
    && processText({
      root,
      file: cliPath,
      args: ["--version"],
      runProcess
    }) === CLI_VERSION;
}

function linkedMetadataMatches(root, runProcess, fileSystem) {
  const linkedPath = path.join(root, "supabase", ".temp", "project-ref");
  return fileSystem.existsSync(linkedPath)
    && gitText(
      root,
      ["check-ignore", "supabase/.temp/project-ref"],
      runProcess
    ) === "supabase/.temp/project-ref"
    && fileSystem.readFileSync(linkedPath).length > 0;
}

function linkedTargetMatches(root, fileSystem) {
  const linkedPath = path.join(root, "supabase", ".temp", "project-ref");
  if (
    !fileSystem.existsSync(linkedPath)
    || !fileSystem.existsSync(AUTHORITY_PROJECT_REF)
  ) {
    return false;
  }
  const linkedTarget = fileSystem.readFileSync(linkedPath);
  const authorityTarget = fileSystem.readFileSync(AUTHORITY_PROJECT_REF);
  return linkedTarget.length > 0
    && linkedTarget.length === authorityTarget.length
    && crypto.timingSafeEqual(linkedTarget, authorityTarget);
}

function sqlFingerprintMatches(root, fileSystem) {
  const sql = fileSystem.readFileSync(path.join(root, SQL_PATH));
  return Buffer.isBuffer(sql)
    && sql.length === SQL_BYTES
    && crypto.createHash("sha256").update(sql).digest("hex") === SQL_SHA256;
}

export function runLocalIdentityGates({
  root,
  cliPath,
  env,
  runProcess,
  fileSystem
}) {
  runOrderedLocalGates({
    "base-ref": () =>
      gitText(root, ["rev-parse", "HEAD"], runProcess) === REVIEWED_BASE
      && gitText(root, ["rev-parse", INTEGRATION_REF], runProcess)
        === REVIEWED_BASE,
    "candidate-identity": () => candidatesMatch(root, runProcess),
    "target-identity": () =>
      matchesCanonicalIdentity(root, TARGET, runProcess),
    "cli-version": () =>
      cliMatches(cliPath, root, runProcess, fileSystem),
    "linked-metadata": () =>
      linkedMetadataMatches(root, runProcess, fileSystem),
    "linked-target": () => linkedTargetMatches(root, fileSystem),
    "local-contract": () => {
      runLocalContract(root, env, runProcess);
      return sqlFingerprintMatches(root, fileSystem);
    }
  });
}
