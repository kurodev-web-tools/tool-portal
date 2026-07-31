import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  APPROVAL_ID,
  reduceMigrationHistoryReconciliationCliResult
} from "./comment-translator-creator-c1-containerless-billing-phase-2-migration-history-reconciliation-reducer.mjs";

const REVIEWED_BASE = "38f0d7fa7fc5bb3e2ef443abce3f261e5026dd07";
const INTEGRATION_REF =
  "origin/codex/comment-translator-free-public-beta-integration";
const MIGRATION_PATH =
  "supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql";
const MIGRATION_BLOB = "331db8095fc2ec09332718e9a5d05f62f26d18e8";
const MIGRATION_SHA256 =
  "27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15";
const AUTHORITY_PROJECT_REF =
  "D:/V_streamer_tools/supabase/.temp/project-ref";
const EXPECTED_MIGRATION_FILES = [
  "20260527000000_account_preferences_foundation.sql",
  "20260601000000_youtube_oauth_credentials.sql",
  "20260615000000_comment_translator_sessions.sql",
  "20260615001000_comment_translator_usage_ledger_events.sql",
  "20260623000000_comment_translator_real_comments_feed_snapshots.sql",
  "20260624000000_account_display_timezone_preference.sql",
  "20260705000000_comment_translator_creator_waitlist_registrations.sql",
  "20260706073204_supabase_default_privileges_guard.sql",
  "20260722000000_comment_translator_paid_entitlements.sql",
  "20260722001000_comment_translator_paid_usage_counters.sql",
  "20260722002000_comment_translator_obs_overlay_tokens.sql",
  "20260722003000_comment_translator_obs_overlay_browser_sessions.sql",
  "20260723000000_comment_translator_moderator_share_tokens.sql",
  "20260723001000_comment_translator_moderator_share_browser_sessions.sql",
  "20260723002000_comment_translator_custom_dictionary.sql",
  "20260723003000_comment_translator_creator_history.sql",
  "20260730000000_comment_translator_c1_containerless_billing_read.sql"
];

export function createMigrationHistoryReconciliationSql() {
  return fs.readFileSync(
    new URL(
      "./comment-translator-creator-c1-containerless-billing-phase-2-migration-history-reconciliation.sql",
      import.meta.url
    ),
    "utf8"
  );
}

export function createMigrationHistoryReconciliationCommand(file, sql) {
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

export function opaqueTargetBindingsMatch(linkedTarget, authorityTarget) {
  return (
    Buffer.isBuffer(linkedTarget)
    && Buffer.isBuffer(authorityTarget)
    && linkedTarget.length > 0
    && linkedTarget.length === authorityTarget.length
    && crypto.timingSafeEqual(linkedTarget, authorityTarget)
  );
}

function assertLocalIdentity(root, cliPath) {
  if (
    git("rev-parse", "HEAD") !== REVIEWED_BASE
    || git("rev-parse", INTEGRATION_REF) !== REVIEWED_BASE
  ) {
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
  const migrationFiles = git(
    "ls-tree",
    "--name-only",
    "HEAD:supabase/migrations"
  ).split(/\r?\n/);
  if (migrationFiles.join("\n") !== EXPECTED_MIGRATION_FILES.join("\n")) {
    throw new Error("known migration order mismatch");
  }
  const projectRefPath = path.join(root, "supabase", ".temp", "project-ref");
  if (
    !fs.existsSync(cliPath)
    || !fs.existsSync(projectRefPath)
    || !fs.existsSync(AUTHORITY_PROJECT_REF)
    || git("check-ignore", "supabase/.temp/project-ref")
      !== "supabase/.temp/project-ref"
  ) {
    throw new Error("trusted linked CLI unavailable");
  }
  if (
    !opaqueTargetBindingsMatch(
      fs.readFileSync(projectRefPath),
      fs.readFileSync(AUTHORITY_PROJECT_REF)
    )
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
    const printable = typeof value === "object" ? JSON.stringify(value) : value;
    process.stdout.write(`${key}=${printable}\n`);
  }
}

function printBlocked(executionStatus) {
  process.stdout.write(`execution_status=${executionStatus}\n`);
  process.stdout.write("remote_read_attempt_count=0\n");
  process.stdout.write("remote_mutation_attempt_count=0\n");
  process.stdout.write("migration_repair_attempt_count=0\n");
  process.stdout.write("migration_apply_attempt_count=0\n");
  process.stdout.write("backfill_attempt_count=0\n");
}

function main() {
  if (
    process.argv[2] !== "--execute-approved"
    || process.env.C1_PHASE2_MIGRATION_HISTORY_RECONCILIATION_APPROVAL_ID
      !== APPROVAL_ID
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
  const command = createMigrationHistoryReconciliationCommand(
    cliPath,
    createMigrationHistoryReconciliationSql()
  );
  const cliResult = spawnSync(command.file, command.args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 1024 * 1024,
    timeout: 60_000,
    windowsHide: true
  });
  const result = reduceMigrationHistoryReconciliationCliResult(cliResult);
  printResult(result);
  if (result.execution_status !== "reconciliation-complete") {
    process.exitCode = 2;
  }
}

const entryPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (entryPath === import.meta.url) {
  main();
}
