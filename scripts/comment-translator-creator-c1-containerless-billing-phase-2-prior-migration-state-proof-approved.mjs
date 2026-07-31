import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  APPROVAL_ID,
  reducePriorMigrationStateProofCliResult
} from "./comment-translator-creator-c1-containerless-billing-phase-2-prior-migration-state-proof-reducer.mjs";

const REVIEWED_BASE = "38f0d7fa7fc5bb3e2ef443abce3f261e5026dd07";
const INTEGRATION_REF =
  "origin/codex/comment-translator-free-public-beta-integration";
const TARGET = {
  path: "supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql",
  blob: "331db8095fc2ec09332718e9a5d05f62f26d18e8",
  sha256: "27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15",
  bytes: 22041
};
const CANDIDATES = [
  ["supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql", "cead8d52e3361149f8476f3852263aabdc38b369", "618233207efc605f70d2c806ad2fc705052ec8db7eeed361defc3dfb0cca0522", 3474],
  ["supabase/migrations/20260624000000_account_display_timezone_preference.sql", "01352c948683ddffbc246b7ea26bb220e4465b3c", "e027e146d5094b5010fe35ba6201c66fb42a537daa7bf63c1f223e407418aae2", 701],
  ["supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql", "86253c3d8751d01df1359dc6e407553d31419902", "037e3a72b20502e26e8c45e4d4227e25a1e4405b6bd28c39fcd246e4b7ddcfd0", 3318],
  ["supabase/migrations/20260706073204_supabase_default_privileges_guard.sql", "761e3e740c8e317a76da4c5bb9505060b7746ce5", "5454fc4ed5381eb29e11d573d0655b4c62172b6f46429d7a3222ebe03184291e", 1135]
];

export function createPriorMigrationStateProofSql() {
  return fs.readFileSync(
    new URL(
      "./comment-translator-creator-c1-containerless-billing-phase-2-prior-migration-state-proof.sql",
      import.meta.url
    ),
    "utf8"
  );
}

export function createPriorMigrationStateProofCommand(file, sql) {
  return {
    file,
    args: [
      "db", "query", "--linked", sql,
      "--output", "json", "--log-level", "error"
    ]
  };
}

function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error("local git identity unavailable");
  return result.stdout.trim();
}

function assertBlob(identity) {
  const [file, blob, sha256, bytes] = identity;
  if (git("rev-parse", `HEAD:${file}`) !== blob) {
    throw new Error("migration blob mismatch");
  }
  const canonical = spawnSync("git", ["cat-file", "blob", blob]);
  if (
    canonical.status !== 0
    || canonical.stdout.length !== bytes
    || crypto.createHash("sha256").update(canonical.stdout).digest("hex") !== sha256
  ) {
    throw new Error("migration identity mismatch");
  }
}

function assertLocalIdentity(root, cliPath) {
  if (
    git("rev-parse", "HEAD") !== REVIEWED_BASE
    || git("rev-parse", INTEGRATION_REF) !== REVIEWED_BASE
  ) {
    throw new Error("reviewed base mismatch");
  }
  assertBlob([TARGET.path, TARGET.blob, TARGET.sha256, TARGET.bytes]);
  for (const candidate of CANDIDATES) assertBlob(candidate);
  const projectRef = path.join(root, "supabase", ".temp", "project-ref");
  const authorityProjectRef =
    "D:/V_streamer_tools/supabase/.temp/project-ref";
  if (
    !fs.existsSync(cliPath)
    || !fs.existsSync(projectRef)
    || !fs.existsSync(authorityProjectRef)
    || git("check-ignore", "supabase/.temp/project-ref")
      !== "supabase/.temp/project-ref"
  ) {
    throw new Error("trusted linked CLI unavailable");
  }
  const linkedTarget = fs.readFileSync(projectRef);
  const authorityTarget = fs.readFileSync(authorityProjectRef);
  if (
    linkedTarget.length === 0
    || linkedTarget.length !== authorityTarget.length
    || !crypto.timingSafeEqual(linkedTarget, authorityTarget)
  ) {
    throw new Error("opaque target binding mismatch");
  }
  const version = spawnSync(cliPath, ["--version"], { encoding: "utf8" });
  if (version.status !== 0 || version.stdout.trim() !== "2.109.0") {
    throw new Error("CLI version mismatch");
  }
}

function printResult(result) {
  for (const [key, value] of Object.entries(result)) {
    process.stdout.write(
      `${key}=${typeof value === "object" ? JSON.stringify(value) : value}\n`
    );
  }
}

function printBlocked(status) {
  process.stdout.write(`execution_status=${status}\n`);
  process.stdout.write("remote_read_attempt_count=0\n");
  process.stdout.write("remote_mutation_attempt_count=0\n");
  process.stdout.write("migration_repair_attempt_count=0\n");
  process.stdout.write("migration_apply_attempt_count=0\n");
}

function main() {
  if (
    process.argv[2] !== "--execute-approved"
    || process.env.C1_PHASE2_PRIOR_MIGRATION_STATE_PROOF_APPROVAL_ID !== APPROVAL_ID
    || process.env.C1_PHASE2_MIGRATION_HISTORY_CURRENT_AUTHORITY
      !== "current-confirmed"
  ) {
    printBlocked("blocked-approval-gate");
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
    printBlocked("blocked-local-precondition");
    process.exitCode = 2;
    return;
  }
  const command = createPriorMigrationStateProofCommand(
    cliPath,
    createPriorMigrationStateProofSql()
  );
  const cliResult = spawnSync(command.file, command.args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 1024 * 1024,
    timeout: 60_000,
    windowsHide: true
  });
  const result = reducePriorMigrationStateProofCliResult(cliResult);
  printResult(result);
  if (result.execution_status !== "prior-migration-state-proof-complete") {
    process.exitCode = 2;
  }
}

const entryPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (entryPath === import.meta.url) main();
