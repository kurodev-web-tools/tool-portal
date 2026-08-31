import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const supabaseEntrypoint = path.join(repoRoot, "node_modules", "supabase", "dist", "supabase.js");
const linkedProjectRefPath = path.join(repoRoot, "supabase", ".temp", "project-ref");
const fixtureRoot = path.join(repoRoot, "scripts", "fixtures");

const MAX_SESSIONS = 20;
const COMMAND_TIMEOUT_MS = 12 * 60 * 1000;
const MAX_BUFFER_BYTES = 512 * 1024;
const RUN_ID_PATTERN = /^task11-preview-[0-9]{8}-[a-z0-9]{8,24}$/;
const LOAD_APPROVAL_ENV = "COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_LOAD_APPROVAL";
const CLEANUP_APPROVAL_ENV = "COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_CLEANUP_APPROVAL";
const APPROVALS = Object.freeze({
  load: "I approve the Task 11 bounded Preview load harness against the currently verified Preview target only; use synthetic fixtures with transaction rollback and exact run cleanup; do not run providers, Stripe, Cloudflare deploy, scheduler activation, production, or main.",
  cleanup: "I approve exact cleanup of the Task 11 synthetic Preview run namespace only; do not delete shared, production, or unrelated fixture data."
});
const FIXTURE_FILES = Object.freeze({
  runtime: "comment-translator-paid-core-v1-task11-preview-runtime.sql",
  storage: "comment-translator-paid-core-v1-task11-preview-storage.sql",
  cleanup: "comment-translator-paid-core-v1-task11-preview-cleanup.sql"
});

class HarnessError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function fail(code) {
  // Every validation and external-command failure is fail-closed.
  throw new HarnessError(code);
}

function parseArgs(argv) {
  const args = {
    operation: null,
    fixture: "runtime",
    fixtureProvided: false,
    runId: null,
    confirmPreviewTarget: false,
    approvedPreviewLoad: false,
    approvedPreviewCleanup: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") {
      args.help = true;
      continue;
    }
    if (["--dry-run", "--preflight", "--execute", "--cleanup"].includes(value)) {
      if (args.operation) {
        fail("multiple-operation-modes");
      }
      args.operation = value.slice(2);
      continue;
    }
    if (value === "--confirm-preview-target") {
      args.confirmPreviewTarget = true;
      continue;
    }
    if (value === "--approved-preview-load") {
      args.approvedPreviewLoad = true;
      continue;
    }
    if (value === "--approved-preview-cleanup") {
      args.approvedPreviewCleanup = true;
      continue;
    }
    if (value === "--local" || value.startsWith("--db-") || value === "--service-role" || value === "--linked") {
      fail("unsupported-target-selector");
    }
    if (value === "--run-id") {
      if (args.runId !== null || index + 1 >= argv.length) {
        fail("run-id-required-once");
      }
      args.runId = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === "--fixture") {
      if (index + 1 >= argv.length || args.fixtureProvided) {
        fail("fixture-required-once");
      }
      args.fixture = argv[index + 1].toLowerCase();
      args.fixtureProvided = true;
      index += 1;
      continue;
    }
    fail("unknown-argument");
  }

  if (args.help) {
    if (argv.some((value) => value !== "--help" && value !== "-h")) {
      fail("help-cannot-be-combined");
    }
    return args;
  }
  if (!args.operation) {
    fail("operation-required");
  }
  if (!args.runId || !RUN_ID_PATTERN.test(args.runId)) {
    fail("invalid-run-id");
  }
  if (!["runtime", "storage", "all"].includes(args.fixture)) {
    fail("invalid-fixture");
  }
  if (args.operation === "cleanup" && args.fixture !== "runtime" && args.fixture !== "all") {
    fail("cleanup-fixture-must-cover-run");
  }
  if (args.operation !== "dry-run" && !args.confirmPreviewTarget) {
    fail("preview-target-confirmation-required");
  }
  if (args.operation === "execute" && !args.approvedPreviewLoad) {
    fail("load-approval-required");
  }
  if (args.operation === "cleanup" && !args.approvedPreviewCleanup) {
    fail("cleanup-approval-required");
  }
  return args;
}

function printHelp() {
  console.log("usage=task11-preview-harness --dry-run|--preflight|--execute|--cleanup --fixture runtime|storage|all --run-id task11-preview-20260831-abcd1234");
  console.log("remote_execute_requires=--confirm-preview-target,--approved-preview-load");
  console.log("remote_cleanup_requires=--confirm-preview-target,--approved-preview-cleanup");
  console.log("target=verified-preview-only");
}

function requireLocalCli() {
  if (!fs.existsSync(supabaseEntrypoint)) {
    fail("supabase-cli-entrypoint-missing");
  }
}

function requirePreviewTarget() {
  if (process.env.COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_TARGET !== "preview") {
    fail("preview-target-identity-missing");
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    fail("service-role-environment-present");
  }
  const projectRef = process.env.COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_PROJECT_REF;
  if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) {
    fail("preview-project-ref-missing");
  }
  if (!fs.existsSync(linkedProjectRefPath)) {
    fail("linked-project-metadata-missing");
  }
  const linkedProjectRef = fs.readFileSync(linkedProjectRefPath, "utf8").trim();
  if (linkedProjectRef !== projectRef) {
    fail("linked-project-ref-mismatch");
  }
  return { projectRef }; // Never print this value.
}

function invokeSupabase(cliArgs) {
  const result = spawnSync(process.execPath, [supabaseEntrypoint, ...cliArgs], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER_BYTES,
    windowsHide: true
  });
  if (result.error || result.status !== 0 || result.signal) {
    return { ok: false, stdout: "" };
  }
  return { ok: true, stdout: result.stdout ?? "" };
}

function runLinkedMigrationPreflight() {
  requireLocalCli();
  requirePreviewTarget();
  const result = invokeSupabase([
    "migration",
    "list",
    "--linked",
    "--output-format",
    "json",
    "--log-level",
    "error",
    "--workdir",
    repoRoot
  ]);
  if (!result.ok) {
    fail("linked-migration-preflight-failed");
  }
}

function sqlLiteral(value) {
  if (!RUN_ID_PATTERN.test(value)) {
    fail("invalid-run-id");
  }
  return `'${value.replaceAll("'", "''")}'`;
}

function materializeFixture(fixture, runId) {
  const fileName = FIXTURE_FILES[fixture];
  if (!fileName) {
    fail("fixture-template-missing");
  }
  const templatePath = path.join(fixtureRoot, fileName);
  if (!fs.existsSync(templatePath)) {
    fail("fixture-template-missing");
  }
  const marker = "__TASK11_PREVIEW_RUN_ID__";
  const template = fs.readFileSync(templatePath, "utf8");
  if (template.split(marker).length !== 2) {
    fail("run-id-marker-count-invalid");
  }
  const sql = template.replace(marker, sqlLiteral(runId));
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ct11-preview-"));
  try {
    const sqlPath = path.join(tempDirectory, "fixture.sql");
    fs.writeFileSync(sqlPath, sql, { encoding: "utf8", flag: "wx" });
    return { tempDirectory, sqlPath };
  } catch (error) {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
    throw error;
  }
}

function findMarkedObject(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMarkedObject(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  if (value.marker === "TASK11_PREVIEW_RESULT") return value;
  for (const item of Object.values(value)) {
    const found = findMarkedObject(item);
    if (found) return found;
  }
  return null;
}

function requireSafeInteger(result, key) {
  if (!Number.isSafeInteger(result[key]) || result[key] < 0) {
    fail(`remote-result-${key}-missing`);
  }
  return result[key];
}

function requireSafeNumber(value, key) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail(`remote-result-${key}-missing`);
  }
  return value;
}

function parseSanitizedLatency(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("remote-result-rpc-latency-missing");
  }
  const safeLatency = {};
  for (const [operation, metrics] of Object.entries(value)) {
    if (!/^[a-z0-9_]+$/.test(operation) || !metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
      fail("remote-result-rpc-latency-invalid");
    }
    const sampleCount = requireSafeInteger(metrics, "sample_count");
    if (sampleCount < 20) {
      fail("remote-result-rpc-latency-sample-count-too-small");
    }
    safeLatency[operation] = {
      sample_count: sampleCount,
      p50_microseconds: requireSafeNumber(metrics.p50_microseconds, "rpc-latency-p50"),
      p95_microseconds: requireSafeNumber(metrics.p95_microseconds, "rpc-latency-p95"),
      max_microseconds: requireSafeNumber(metrics.max_microseconds, "rpc-latency-max")
    };
  }
  if (Object.keys(safeLatency).length === 0) {
    fail("remote-result-rpc-latency-empty");
  }
  return safeLatency;
}

function parseSanitizedRemoteResult(stdout, expectedFixture) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    fail("remote-result-not-json");
  }
  const result = findMarkedObject(parsed);
  if (!result || result.fixture !== expectedFixture) {
    fail("remote-result-marker-mismatch");
  }
  const safe = {
    fixture: expectedFixture,
    measurement: "sql-transaction-observation",
    external_egress: "UNKNOWN",
    external_realtime: "UNKNOWN"
  };
  for (const key of [
    "session_count",
    "poll_read_count",
    "heartbeat_write_count",
    "restart_plan_count",
    "cloudflare_request_fixture_count",
    "message_rate_committed_count",
    "same_utc_hour_provider_rows",
    "empty_poll_count",
    "empty_poll_provider_calls",
    "logical_attempt_rows",
    "attempt_receipt_rows",
    "provider_source_receipt_rows",
    "provider_hourly_rows",
    "session_summary_rows",
    "paid_relation_total_bytes",
    "paid_relation_index_bytes",
    "cleanup_rows_remaining"
  ]) {
    if (Object.hasOwn(result, key)) safe[key] = requireSafeInteger(result, key);
  }
  if (expectedFixture === "runtime") {
    requireSafeInteger(safe, "session_count");
    requireSafeInteger(safe, "poll_read_count");
    requireSafeInteger(safe, "heartbeat_write_count");
    requireSafeInteger(safe, "restart_plan_count");
    requireSafeInteger(safe, "cloudflare_request_fixture_count");
    requireSafeInteger(safe, "empty_poll_count");
    requireSafeInteger(safe, "empty_poll_provider_calls");
    if (!Object.hasOwn(result, "rpc_latency")) {
      fail("remote-result-rpc-latency-missing");
    }
    safe.rpc_latency = parseSanitizedLatency(result.rpc_latency);
  }
  if (expectedFixture === "storage") {
    for (const key of [
      "logical_attempt_rows",
      "attempt_receipt_rows",
      "provider_source_receipt_rows",
      "provider_hourly_rows",
      "session_summary_rows",
      "paid_relation_total_bytes",
      "paid_relation_index_bytes"
    ]) requireSafeInteger(safe, key);
  }
  return safe;
}

function runFixture(fixture, runId, invoke = invokeSupabase) {
  let materialized;
  try {
    materialized = materializeFixture(fixture, runId);
    const result = invoke([
      "db",
      "query",
      "--linked",
      "--file",
      materialized.sqlPath,
      "--output-format",
      "json",
      "--log-level",
      "error",
      "--workdir",
      repoRoot
    ]);
    if (!result.ok) {
      fail(`linked-${fixture}-execution-failed`);
    }
    return parseSanitizedRemoteResult(result.stdout, fixture);
  } finally {
    if (materialized) {
      fs.rmSync(materialized.tempDirectory, { recursive: true, force: true });
    }
  }
}

function printSanitizedResult(result) {
  for (const [key, value] of Object.entries(result)) {
    if (key === "fixture" || key === "rpc_latency") continue;
    console.log(`${key}=${value}`);
  }
  if (result.rpc_latency) {
    const operations = Object.keys(result.rpc_latency);
    console.log(`rpc_latency_operations=${operations.join(",")}`);
    for (const operation of operations) {
      const metrics = result.rpc_latency[operation];
      console.log(`rpc_latency_${operation}_samples=${metrics.sample_count}`);
      console.log(`rpc_latency_${operation}_p50_microseconds=${metrics.p50_microseconds}`);
      console.log(`rpc_latency_${operation}_p95_microseconds=${metrics.p95_microseconds}`);
      console.log(`rpc_latency_${operation}_max_microseconds=${metrics.max_microseconds}`);
    }
  }
}

function runDryRun(args) {
  console.log("status=dry-run");
  console.log(`run_id=${args.runId}`);
  console.log(`fixture=${args.fixture}`);
  console.log(`max_concurrent_sessions=${MAX_SESSIONS}`);
  console.log("target=preview-not-contacted");
  console.log("providers=strict-fixture-only");
  console.log("stripe=strict-fixture-only");
  console.log("cloudflare=fixture-plan-only");
  console.log("transaction=begin-rollback");
  console.log("egress_realtime=dashboard-management-measurement-required");
}

function runPreflight(args) {
  runLinkedMigrationPreflight();
  console.log("status=preflight-pass");
  console.log(`run_id=${args.runId}`);
  console.log(`fixture=${args.fixture}`);
  console.log("target=verified-preview");
  console.log("remote_mutation=not-run");
  console.log("providers=strict-fixture-only");
}

function runExecution(args) {
  runLinkedMigrationPreflight();
  const fixtures = args.fixture === "all" ? ["runtime", "storage"] : [args.fixture];
  for (const fixture of fixtures) {
    const result = runFixture(fixture, args.runId);
    console.log(`status=execute-pass fixture=${result.fixture}`);
    console.log(`run_id=${args.runId}`);
    printSanitizedResult(result);
  }
  console.log("provider_network_calls=0");
  console.log("stripe_network_calls=0");
  console.log("cloudflare_deploy=not-run");
  console.log("scheduler_activation=not-run");
}

function runCleanup(args) {
  runLinkedMigrationPreflight();
  const result = runFixture("cleanup", args.runId);
  console.log(`status=cleanup-pass fixture=${result.fixture}`);
  console.log(`run_id=${args.runId}`);
  printSanitizedResult(result);
  console.log("scope=exact-run-namespace-only");
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }
    if (args.operation === "dry-run") {
      runDryRun(args);
      return;
    }
    if (args.operation === "preflight") {
      runPreflight(args);
      return;
    }
    if (args.operation === "execute") {
      if (process.env[LOAD_APPROVAL_ENV] !== APPROVALS.load) {
        fail("load-approval-text-mismatch");
      }
      runExecution(args);
      return;
    }
    if (args.operation === "cleanup") {
      if (process.env[CLEANUP_APPROVAL_ENV] !== APPROVALS.cleanup) {
        fail("cleanup-approval-text-mismatch");
      }
      runCleanup(args);
      return;
    }
    fail("operation-required");
  } catch (error) {
    const code = error instanceof HarnessError ? error.code : "unexpected-harness-error";
    console.log(`status=blocked reason=${code}`);
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(scriptPath)) {
  main();
}

export { materializeFixture, parseArgs, parseSanitizedRemoteResult, runFixture };
