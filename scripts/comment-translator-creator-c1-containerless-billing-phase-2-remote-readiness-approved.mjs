import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  APPROVAL_ID,
  reduceRemoteReadinessCliResult
} from "./comment-translator-creator-c1-containerless-billing-phase-2-remote-readiness-reducer.mjs";

const REVIEWED_BASE = "ea6928f5f0160ab3db453f845e4fb16245bb4e9e";
const MIGRATION_PATH =
  "supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql";
const MIGRATION_BLOB = "331db8095fc2ec09332718e9a5d05f62f26d18e8";
const MIGRATION_SHA256 =
  "27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15";

export function createRemoteReadinessSql() {
  return fs.readFileSync(
    new URL(
      "./comment-translator-creator-c1-containerless-billing-phase-2-remote-readiness.sql",
      import.meta.url
    ),
    "utf8"
  );
}

export function createRemoteReadinessCommand(file, sql) {
  return {
    file,
    args: [
      "db",
      "query",
      "--linked",
      sql,
      "--output",
      "json",
      "--log-level",
      "error"
    ]
  };
}

function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error("local git identity unavailable");
  }
  return result.stdout.trim();
}

function assertLocalIdentity(root, cliPath) {
  if (git("rev-parse", "HEAD") !== REVIEWED_BASE) {
    throw new Error("reviewed base mismatch");
  }
  if (git("rev-parse", `HEAD:${MIGRATION_PATH}`) !== MIGRATION_BLOB) {
    throw new Error("migration blob mismatch");
  }
  const canonical = spawnSync("git", ["cat-file", "blob", MIGRATION_BLOB]);
  if (
    canonical.status !== 0
    || crypto.createHash("sha256").update(canonical.stdout).digest("hex")
      !== MIGRATION_SHA256
  ) {
    throw new Error("migration hash mismatch");
  }
  if (
    !fs.existsSync(cliPath)
    || !fs.existsSync(path.join(root, "supabase", ".temp", "project-ref"))
    || git("check-ignore", "supabase/.temp/project-ref")
      !== "supabase/.temp/project-ref"
  ) {
    throw new Error("trusted linked CLI unavailable");
  }
  const version = spawnSync(cliPath, ["--version"], { encoding: "utf8" });
  if (version.status !== 0 || version.stdout.trim() !== "2.109.0") {
    throw new Error("CLI version mismatch");
  }
}

function printResult(result) {
  for (const [key, value] of Object.entries(result)) {
    process.stdout.write(`${key}=${value}\n`);
  }
}

function main() {
  if (
    process.argv[2] !== "--execute-approved"
    || process.env.C1_PHASE2_REMOTE_READINESS_APPROVAL_ID !== APPROVAL_ID
  ) {
    process.stdout.write("execution_status=blocked-approval-gate\n");
    process.stdout.write("remote_read_attempt_count=0\n");
    process.stdout.write("remote_mutation_attempt_count=0\n");
    process.exitCode = 2;
    return;
  }
  const root = process.cwd();
  const cliPath = path.join(
    root,
    "node_modules",
    "@supabase",
    `cli-windows-${process.arch}`,
    "bin",
    "supabase.exe"
  );
  try {
    assertLocalIdentity(root, cliPath);
  } catch {
    process.stdout.write("execution_status=blocked-local-precondition\n");
    process.stdout.write("remote_read_attempt_count=0\n");
    process.stdout.write("remote_mutation_attempt_count=0\n");
    process.exitCode = 2;
    return;
  }
  const command = createRemoteReadinessCommand(
    cliPath,
    createRemoteReadinessSql()
  );
  const cliResult = spawnSync(command.file, command.args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 1024 * 1024,
    timeout: 60_000,
    windowsHide: true
  });
  const result = reduceRemoteReadinessCliResult(cliResult);
  printResult(result);
  if (result.execution_status !== "readiness-pass") {
    process.exitCode = 2;
  }
}

const entryPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (entryPath === import.meta.url) {
  main();
}
