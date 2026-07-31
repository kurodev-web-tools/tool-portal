import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  createBlockedBeforeRemoteResult,
  reduceStrictSourceEquivalenceCliResult
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs";
import {
  MAX_BUFFER,
  RUNNER_PRINT_KEYS,
  TIMEOUT_MS,
  GateFailure,
  createFutureCommand,
  createSanitizedContractEnv,
  hasExactApproval
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs";
import {
  runLocalIdentityGates
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-boundaries.mjs";

export * from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs";
export * from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-boundaries.mjs";

function createCliPath(root, arch) {
  return path.join(
    root,
    "node_modules",
    "@supabase",
    `cli-windows-${arch}`,
    "bin",
    "supabase.exe"
  );
}

function createRemoteOptions(root, env) {
  return {
    cwd: root,
    encoding: "utf8",
    env: { ...createSanitizedContractEnv(env), NO_COLOR: "1" },
    maxBuffer: MAX_BUFFER,
    timeout: TIMEOUT_MS,
    windowsHide: true
  };
}

export function runApprovedProof({
  argv,
  env,
  root,
  runProcess = spawnSync,
  fileSystem = fs,
  arch = process.arch
}) {
  if (!hasExactApproval(argv, env)) {
    return createBlockedBeforeRemoteResult("approval-gate");
  }
  const cliPath = createCliPath(root, arch);
  try {
    runLocalIdentityGates({
      root, cliPath, env, runProcess, fileSystem
    });
  } catch (error) {
    if (error instanceof GateFailure) {
      return createBlockedBeforeRemoteResult(error.gateId);
    }
    throw error;
  }
  const command = createFutureCommand(cliPath);
  let cliResult;
  try {
    cliResult = runProcess(
      command.file,
      command.args,
      createRemoteOptions(root, env)
    );
  } catch {
    cliResult = { status: null, stdout: "", error: { code: "SPAWN_FAILED" } };
  }
  return reduceStrictSourceEquivalenceCliResult({
    status: cliResult?.status,
    timedOut: cliResult?.error?.code === "ETIMEDOUT",
    stdout: typeof cliResult?.stdout === "string" ? cliResult.stdout : ""
  });
}

function printResult(result) {
  for (const key of RUNNER_PRINT_KEYS) {
    if (!Object.hasOwn(result, key)) continue;
    const value = result[key];
    process.stdout.write(
      `${key}=${typeof value === "object" ? JSON.stringify(value) : value}\n`
    );
  }
}

function finish(result) {
  printResult(result);
  if (result.execution_status !== "strict-source-equivalence-complete") {
    process.exitCode = 2;
  }
}

function main() {
  finish(runApprovedProof({
    argv: process.argv,
    env: process.env,
    root: process.cwd()
  }));
}

const entryPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (entryPath === import.meta.url) main();
