import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const paths = {
  harness: "scripts/comment-translator-paid-core-v1-task11-preview-load-harness.mjs",
  runtime: "scripts/fixtures/comment-translator-paid-core-v1-task11-preview-runtime.sql",
  storage: "scripts/fixtures/comment-translator-paid-core-v1-task11-preview-storage.sql",
  cleanup: "scripts/fixtures/comment-translator-paid-core-v1-task11-preview-cleanup.sql",
  runbook: "docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md"
};

for (const [label, relativePath] of Object.entries(paths)) {
  assert.equal(fs.existsSync(path.join(root, relativePath)), true, `Task 11 Preview ${label} exists`);
}

const harness = fs.readFileSync(path.join(root, paths.harness), "utf8");
const runtime = fs.readFileSync(path.join(root, paths.runtime), "utf8");
const storage = fs.readFileSync(path.join(root, paths.storage), "utf8");
const cleanup = fs.readFileSync(path.join(root, paths.cleanup), "utf8");
const runbook = fs.readFileSync(path.join(root, paths.runbook), "utf8");

assert.match(harness, /parseArgs|parseArguments/, "harness has explicit argument parsing");
assert.match(harness, /--dry-run[\s\S]+--preflight[\s\S]+--execute[\s\S]+--cleanup/, "harness exposes bounded dry-run, preflight, execute, and cleanup modes");
assert.match(harness, /--run-id[\s\S]+task11-preview-[0-9]{8}-[a-z0-9]/i, "harness requires a strict synthetic Task 11 run id");
assert.match(harness, /--confirm-preview-target/, "remote modes require an explicit Preview target confirmation flag");
assert.match(harness, /COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_TARGET[\s\S]+preview/, "harness requires the exact Preview target identity");
assert.match(harness, /COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_PROJECT_REF/, "harness requires an explicit Preview project reference");
assert.match(harness, /supabase[\\/]\.temp[\\/]project-ref|project-ref/, "harness checks the linked project metadata");
assert.match(harness, /migration["']?,\s*["']list["'][\s\S]+--linked|migration list --linked/i, "preflight performs a linked migration identity check");
assert.match(harness, /db["']?,\s*["']query["'][\s\S]+--linked[\s\S]+--file[\s\S]+--workdir|db query --linked --file/i, "remote SQL uses the Supabase CLI linked file path");
assert.doesNotMatch(harness, /--db-url|SUPABASE_URL\s*\)|SUPABASE_URL\s*:/i, "harness has no direct database URL path");
assert.match(harness, /SUPABASE_SERVICE_ROLE_KEY[\s\S]+service-role-environment-present/i, "harness fails closed when a service-role environment is present");
assert.doesNotMatch(harness, /shell\s*:\s*true|https?:\/\//i, "harness has no shell injection or provider/network endpoint path");
assert.match(harness, /execFileSync|spawnSync|execFile/, "harness invokes the CLI without a shell");
assert.match(harness, /timeout\s*:/, "harness bounds the CLI request timeout");
assert.match(harness, /maxBuffer\s*:/, "harness bounds captured CLI output");
assert.match(harness, /COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_LOAD_APPROVAL[\s\S]+--approved-preview-load/, "execute mode requires the exact load approval");
assert.match(harness, /COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_CLEANUP_APPROVAL[\s\S]+--approved-preview-cleanup/, "cleanup mode requires a separate exact cleanup approval");
assert.match(harness, /mkdtempSync[\s\S]+finally[\s\S]+rmSync[\s\S]+recursive:\s*true/, "generated SQL is removed in a finally block");
assert.match(harness, /sqlLiteral|quoteSqlLiteral/, "run-id substitution uses a SQL literal helper");
assert.match(harness, /__TASK11_PREVIEW_RUN_ID__[\s\S]+exactly once|single replacement|replace\(/i, "harness replaces one fixed run-id marker and does not accept arbitrary SQL");
assert.match(harness, /MAX_SESSIONS\s*=\s*20|MAX_SESSIONS\s*:\s*20|20/, "harness has a hard 20-session cap");
assert.match(harness, /sanitize|sanitized|safeResult|safeOutput/i, "harness reports sanitized output only");
assert.match(harness, /rpc_latency[\s\S]+p50_microseconds[\s\S]+p95_microseconds/i, "harness preserves sanitized RPC latency evidence");
assert.match(harness, /printSanitized|print.*Result|rpc_latency_operations/i, "harness prints nested latency only through a sanitized formatter");
assert.match(harness, /return\s+.*blocked|throw new Error|failClosed|fail-closed/i, "harness fails closed on preflight and approval failures");

assert.match(runtime, /^begin;/im, "runtime fixture is transaction bounded");
assert.match(runtime, /set local statement_timeout\s*=\s*'10min'/i, "runtime fixture uses a bounded PostgreSQL statement timeout");
assert.match(runtime, /set local lock_timeout\s*=\s*'5s'/i, "runtime fixture uses a bounded PostgreSQL lock timeout");
assert.match(runtime, /__TASK11_PREVIEW_RUN_ID__/, "runtime fixture is namespaced by the supplied run id");
assert.match(runtime, /generate_series\(1,\s*20\)/i, "runtime fixture has exactly 20 synthetic sessions");
assert.match(runtime, /generate_series\(1,\s*720\)/i, "runtime fixture covers 720 fifteen-second polls per session");
assert.match(runtime, /generate_series\(1,\s*180\)/i, "runtime fixture covers one coalesced heartbeat per minute for three hours");
assert.match(runtime, /generate_series\(1,\s*8\)[\s\S]+24.?hour|24.?hour[\s\S]+generate_series\(1,\s*8\)/i, "runtime fixture records the eight-window 24-hour restart plan");
assert.match(runtime, /115200|115,200/, "runtime fixture records the bounded Cloudflare request fixture count");
assert.match(runtime, /ct_paid_start_session_and_reserve_poll_budget/, "runtime fixture exercises the atomic Paid session start authority");
assert.match(runtime, /ct_paid_read_poll_budget/, "runtime fixture exercises the empty poll budget read path");
assert.match(runtime, /ct_paid_touch_active_paid_session_heartbeat/, "runtime fixture exercises the durable heartbeat authority");
assert.match(runtime, /ct_paid_reserve_message_rate[\s\S]+ct_paid_finalize_message_rate/, "runtime fixture exercises the message-rate reserve/finalize RPCs");
assert.match(runtime, /generate_series\(1,\s*60\)/i, "runtime fixture exercises one comment per minute and the 60-message boundary");
assert.match(runtime, /61st|sixty.?first|rate-limited/i, "runtime fixture proves the 61st message is rate limited");
assert.match(runtime, /openai_attempt[\s\S]+azure_direct_fallback|openai[\s\S]+azure_fallback/i, "runtime fixture uses provider-kind fixtures for OpenAI and Azure fallback");
assert.match(runtime, /same.?hour|utc_hour[\s\S]+2/i, "runtime fixture asserts same-UTC-hour provider accounting");
assert.match(runtime, /empty.?poll[\s\S]+0|provider_calls[\s\S]+0/i, "runtime fixture asserts empty polls do not call a provider");
assert.match(runtime, /percentile_cont\(0\.50\)[\s\S]+percentile_cont\(0\.95\)/i, "runtime fixture reports RPC p50 and p95 latency");
assert.match(runtime, /task11_empty_poll_observations[\s\S]+insert into task11_empty_poll_observations/i, "runtime fixture records every empty poll observation");
assert.match(runtime, /sum\(provider_call_count\)[\s\S]+empty_poll_provider_calls/i, "runtime fixture derives empty-poll provider calls from observations");
assert.match(runtime, /count\(\*\)[\s\S]+task11_empty_poll_observations[\s\S]+14400|task11_empty_poll_observations[\s\S]+count\(\*\)[\s\S]+14400/i, "runtime fixture asserts the complete empty-poll sample count");
assert.match(runtime, /has_function_privilege[\s\S]+service_role[\s\S]+anon[\s\S]+authenticated/i, "runtime fixture checks RPC ACLs without widening privileges");
assert.match(runtime, /task11_preview_owners[\s\S]+delete|delete[\s\S]+task11_preview_owners/i, "runtime cleanup is restricted to the run-derived owner set");
assert.match(runtime, /assert|raise exception[\s\S]+cleanup|cleanup[\s\S]+0/i, "runtime fixture asserts exact cleanup before rollback");
assert.match(runtime, /^rollback;/im, "runtime fixture rolls back all synthetic Preview rows");
assert.doesNotMatch(runtime, /fetch\(|https?:\/\/|stripe\.com|openai\.com|azure\.com|workers\.dev/i, "runtime fixture has no real provider, Stripe, or Cloudflare communication");

assert.match(storage, /^begin;/im, "storage fixture is transaction bounded");
assert.match(storage, /set local statement_timeout\s*=\s*'10min'/i, "storage fixture uses a bounded PostgreSQL statement timeout");
assert.match(storage, /__TASK11_PREVIEW_RUN_ID__/, "storage fixture is namespaced by the supplied run id");
assert.match(storage, /generate_series\(1,\s*129600\)/i, "storage fixture covers the 27-hour attempt receipt plan");
assert.match(storage, /generate_series\(1,\s*28800\)/i, "storage fixture covers the two-provider hourly detail plan");
assert.match(storage, /generate_series\(1,\s*14400\)/i, "storage fixture covers the 90-day session summary plan");
assert.match(storage, /interval\s+'90 days'[\s\S]+14399|14399[\s\S]+interval\s+'90 days'/i, "storage fixture distributes summaries over the full 90-day retention span");
assert.match(storage, /create temporary table task11_preview_storage_logical_attempts/i, "storage fixture keeps logical attempts in a run-local temporary relation");
assert.match(storage, /create temporary table task11_preview_storage_attempt_receipts/i, "storage fixture keeps attempt receipts in a run-local temporary relation");
assert.match(storage, /create temporary table task11_preview_storage_provider_detail_source_receipts/i, "storage fixture keeps provider source receipts in a run-local temporary relation");
assert.match(storage, /create temporary table task11_preview_storage_provider_hourly_details/i, "storage fixture keeps provider hourly rows in a run-local temporary relation");
assert.match(storage, /create temporary table task11_preview_storage_session_summaries/i, "storage fixture keeps session summaries in a run-local temporary relation");
assert.doesNotMatch(storage, /insert\s+into\s+public\.comment_translator_paid_/i, "storage fixture never inserts synthetic rows into shared Preview relations");
assert.match(storage, /pg_temp_|pg_namespace[\s\S]+task11_preview_storage/i, "storage fixture measures only its temporary relation allocation");
assert.match(storage, /task11_preview_storage_provider_source_plan[\s\S]+provider_detail_source_receipts[\s\S]+provider_hourly_details/i, "storage fixture uses one source plan for provider receipts and hourly details");
assert.match(storage, /pg_total_relation_size[\s\S]+pg_indexes_size/i, "storage fixture reports relation and index allocation separately");
assert.match(storage, /transaction.?observation|dashboard.?quota|UNKNOWN/i, "storage fixture does not mislabel transactional SQL size as Dashboard quota evidence");
assert.match(storage, /drop table task11_preview_storage_[a-z_]+/i, "storage cleanup drops only the run-local temporary relations");
assert.match(storage, /^rollback;/im, "storage fixture rolls back synthetic Preview rows");
assert.doesNotMatch(storage, /truncate|delete\s+from\s+public\.comment_translator_paid_poll_budget_buckets/i, "storage fixture has no broad or shared poll-bucket cleanup");

assert.match(cleanup, /^begin;/im, "cleanup fixture is atomic");
assert.match(cleanup, /__TASK11_PREVIEW_RUN_ID__/, "cleanup fixture is bound to the supplied run id");
assert.match(cleanup, /task11_preview_owners|md5\([^)]*__TASK11_PREVIEW_RUN_ID__/i, "cleanup derives an exact owner namespace from the run id");
assert.doesNotMatch(cleanup, /truncate|delete\s+from\s+public\.comment_translator_paid_poll_budget_buckets|delete\s+from\s+public\.comment_translator_paid_provider_circuits/i, "cleanup never truncates or mutates shared global runtime state");
assert.match(cleanup, /raise exception|assert|remaining|zero/i, "cleanup fails closed unless no run-scoped rows remain");
assert.match(cleanup, /commit;/i, "approved cleanup commits only the exact run-scoped deletion");
assert.match(cleanup, /comment_translator_paid_message_rate_reservation_tombstones[\s\S]+comment_translator_paid_message_rate_reservations[\s\S]+comment_translator_paid_message_rate_buckets[\s\S]+comment_translator_paid_poll_reservations[\s\S]+comment_translator_paid_session_leases/i, "cleanup assertion covers every runtime-owned auxiliary relation");
assert.doesNotMatch(cleanup, /['"]cleanup_rows_remaining['"]\s*,\s*0/i, "cleanup result does not hard-code a zero remaining-row count");

assert.match(runbook, /Preview.*bounded.*load|bounded.*Preview.*load/i, "existing Runbook documents the Preview bounded load harness");
assert.match(runbook, /Management|Dashboard[\s\S]+Egress|Egress[\s\S]+Realtime/i, "Runbook separates Management/Dashboard Egress and Realtime evidence from SQL metrics");
assert.match(runbook, /UNKNOWN|externally-unverified/i, "Runbook preserves UNKNOWN for unavailable external measurements");
assert.match(runbook, /supabase\.com\/docs\/guides\/platform\/manage-your-usage\/egress/i, "Runbook links the official Supabase Egress specification");
assert.match(runbook, /supabase\.com\/docs\/guides\/realtime\/reports/i, "Runbook links the official Supabase Realtime reports specification");

const harnessModule = await import(pathToFileURL(path.join(root, paths.harness)).href);
assert.equal(typeof harnessModule.parseArgs, "function", "harness exposes its argument parser for behavior contract coverage");
assert.equal(typeof harnessModule.parseSanitizedRemoteResult, "function", "harness exposes its sanitized result parser for behavior contract coverage");
assert.equal(typeof harnessModule.runFixture, "function", "harness exposes fixture orchestration for fake-CLI behavior coverage");
assert.throws(
  () => harnessModule.parseArgs(["--dry-run", "--run-id", "invalid"]),
  /invalid-run-id/,
  "argument parser rejects an unscoped run id"
);

const fakeRuntimeResult = {
  marker: "TASK11_PREVIEW_RESULT",
  fixture: "runtime",
  session_count: 20,
  poll_read_count: 14400,
  heartbeat_write_count: 3600,
  restart_plan_count: 160,
  cloudflare_request_fixture_count: 115200,
  empty_poll_count: 14400,
  empty_poll_provider_calls: 0,
  rpc_latency: {
    read_poll_budget: {
      sample_count: 14400,
      p50_microseconds: 1,
      p95_microseconds: 2,
      max_microseconds: 3
    }
  },
  raw_provider_payload: "must-not-be-forwarded"
};
const sanitizedResult = harnessModule.parseSanitizedRemoteResult(
  JSON.stringify([{ task11_preview_result: fakeRuntimeResult }]),
  "runtime"
);
assert.equal(sanitizedResult.rpc_latency.read_poll_budget.p95_microseconds, 2, "sanitizer preserves approved latency scalars");
assert.equal(Object.hasOwn(sanitizedResult, "raw_provider_payload"), false, "sanitizer drops raw result fields");

let capturedSqlPath = null;
const fakeRunResult = harnessModule.runFixture(
  "runtime",
  "task11-preview-20260831-abcd1234",
  (cliArgs) => {
    capturedSqlPath = cliArgs[cliArgs.indexOf("--file") + 1];
    return { ok: true, stdout: JSON.stringify([{ task11_preview_result: fakeRuntimeResult }]) };
  }
);
assert.equal(fakeRunResult.fixture, "runtime", "fake CLI fixture orchestration returns sanitized runtime evidence");
assert.equal(fs.existsSync(capturedSqlPath), false, "fixture SQL temporary file is removed after fake execution");
assert.equal(fs.existsSync(path.dirname(capturedSqlPath)), false, "fixture SQL temporary directory is removed after fake execution");

function runHarnessBehavior(args) {
  return spawnSync(process.execPath, [path.join(root, paths.harness), ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 10000,
    maxBuffer: 128 * 1024,
    windowsHide: true
  });
}

const dryRunBehavior = runHarnessBehavior([
  "--dry-run",
  "--fixture",
  "runtime",
  "--run-id",
  "task11-preview-20260831-abcd1234"
]);
assert.equal(dryRunBehavior.status, 0, "dry-run behavior completes without external target configuration");
assert.match(dryRunBehavior.stdout, /target=preview-not-contacted/, "dry-run reports that Preview was not contacted");

const preflightGuardBehavior = runHarnessBehavior([
  "--preflight",
  "--fixture",
  "runtime",
  "--run-id",
  "task11-preview-20260831-abcd1234",
  "--confirm-preview-target"
]);
assert.equal(preflightGuardBehavior.status, 1, "preflight fails closed without target identity");
assert.match(preflightGuardBehavior.stdout, /status=blocked reason=/, "preflight exposes only sanitized guard status");

const approvalGuardBehavior = runHarnessBehavior([
  "--execute",
  "--fixture",
  "runtime",
  "--run-id",
  "task11-preview-20260831-abcd1234",
  "--confirm-preview-target"
]);
assert.equal(approvalGuardBehavior.status, 1, "execute fails closed without its explicit approval flag");
assert.match(approvalGuardBehavior.stdout, /reason=load-approval-required/, "execute reports the missing approval without command output");

console.log("comment-translator-paid-core-v1 Task 11 Preview load harness contract: PASS");
