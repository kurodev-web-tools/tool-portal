import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const paths = {
  harness: "scripts/comment-translator-paid-core-v1-task11-local-load-fixture.ps1",
  runtime: "scripts/fixtures/comment-translator-paid-core-v1-task11-local-runtime.sql",
  storage: "scripts/fixtures/comment-translator-paid-core-v1-task11-local-storage.sql"
};

for (const [label, relativePath] of Object.entries(paths)) {
  assert.equal(fs.existsSync(path.join(root, relativePath)), true, `Task 11 ${label} fixture exists`);
}

const harness = fs.readFileSync(path.join(root, paths.harness), "utf8");
const runtime = fs.readFileSync(path.join(root, paths.runtime), "utf8");
const storage = fs.readFileSync(path.join(root, paths.storage), "utf8");

assert.match(harness, /ValidateSet\("Runtime",\s*"Storage",\s*"All"\)/, "harness exposes separated runtime and storage modes");
assert.match(harness, /\[switch\]\s*\$ConfirmLocalReset/, "storage measurement requires an explicit local-reset confirmation");
assert.match(harness, /podman[\s\S]+?ps[\s\S]+?label=com\.supabase\.cli\.project=/i, "harness discovers only the active local Supabase project database container");
assert.match(harness, /podman[\s\S]+?exec[\s\S]+?--interactive[\s\S]+?psql[\s\S]+?ON_ERROR_STOP=1/i, "multi-statement fixture SQL uses the local container psql fallback");
assert.match(harness, /Resolve-Path[\s\S]+?Get-Location[\s\S]+?Expected the fixture to run from its exact repository worktree root/i, "harness refuses a caller outside its exact worktree root");
assert.match(harness, /podman inspect[\s\S]+?databaseContainerId[\s\S]+?Reset-LocalDatabase[\s\S]+?currentDatabaseContainerId[\s\S]+?databaseContainerId/i, "harness verifies the SQL and reset target use the same container identity");
assert.doesNotMatch(harness, /["']db["']?,\s*["']query["']?/, "harness avoids the CLI prepared-statement path that rejects multi-statement fixture files");
assert.match(harness, /db["']?,\s*["']reset["']?,\s*["']--local["']?,\s*["']--yes["']?,\s*["']--workdir["']?,\s*\$repoRoot/, "storage mode resets only the exact local worktree database after measurement");
assert.doesNotMatch(harness, /--linked|--db-url|service_role|SUPABASE_SERVICE_ROLE_KEY/i, "harness has no remote or secret-bearing database path");

assert.match(runtime, /^begin;/im, "runtime fixture is transaction bounded");
assert.match(runtime, /set local statement_timeout = '10min'/i, "runtime fixture uses PostgreSQL-valid timeout units");
assert.match(runtime, /^rollback;/im, "runtime fixture rolls back all synthetic rows");
assert.match(runtime, /generate_series\(1,\s*20\)/i, "runtime fixture creates exactly 20 local owners and sessions");
assert.match(runtime, /generate_series\(1,\s*720\)/i, "runtime fixture performs all 720 poll-budget reads per session");
assert.match(runtime, /generate_series\(1,\s*180\)/i, "runtime fixture performs one coalesced heartbeat per minute for three hours");
assert.match(runtime, /update\s+public\.comment_translator_sessions[\s\S]+?last_heartbeat_at\s*=\s*statement_timestamp\(\)\s*-\s*interval\s+'1 minute'[\s\S]+?ct_paid_touch_active_paid_session_heartbeat/i, "heartbeat load forces and measures the once-per-minute durable write path");
assert.match(runtime, /percentile_cont\(0\.50\)[\s\S]+percentile_cont\(0\.95\)/i, "runtime fixture reports RPC p50 and p95 latency");
assert.match(runtime, /ct_paid_record_provider_hourly_detail[\s\S]+?'openai'[\s\S]+ct_paid_record_provider_hourly_detail[\s\S]+?'azure_fallback'/i, "runtime fixture records OpenAI and Azure fallback in the same UTC hour");
assert.match(runtime, /if\s+same_utc_hour_provider_rows\s+<>\s+2\s+then/i, "runtime fixture asserts two provider buckets for the same owner and UTC hour");
assert.match(runtime, /if\s+replay_committed_messages\s+<>\s+1\s+then/i, "runtime fixture proves committed message replay is idempotent");
assert.match(runtime, /if\s+sixty_first_reservation_status\s+<>\s+'rate-limited'\s+then/i, "runtime fixture proves the 61st message is rate limited");
assert.match(runtime, /ct_paid_cleanup_attempt_ledgers/i, "runtime fixture executes the bounded cleanup authority");
assert.match(runtime, /'cleanup_attempt_ledger'[\s\S]+?task11_rpc_latency/i, "runtime fixture records bounded cleanup latency");
assert.match(runtime, /group by operation\s+having count\(\*\) < 20/i, "every reported percentile has at least 20 samples");
assert.match(runtime, /has_function_privilege[\s\S]+?service_role[\s\S]+?anon[\s\S]+?authenticated/i, "runtime fixture checks privileged RPC ACLs without widening them");
assert.match(runtime, /has_function_privilege\('service_role',\s*'public\.ct_paid_finalize_message_rate/i, "runtime fixture checks finalize RPC service-role execution");
assert.match(runtime, /has_function_privilege\('anon',\s*'public\.ct_paid_finalize_message_rate/i, "runtime fixture checks finalize RPC anon closure");
assert.match(runtime, /has_function_privilege\('authenticated',\s*'public\.ct_paid_finalize_message_rate/i, "runtime fixture checks finalize RPC authenticated closure");

assert.match(storage, /^begin;/im, "storage fixture measures a transactionally isolated synthetic load");
assert.match(storage, /set local statement_timeout = '10min'/i, "storage fixture uses PostgreSQL-valid timeout units");
assert.match(storage, /generate_series\(1,\s*129600\)/i, "storage fixture materializes the 27-hour attempt-receipt plan");
assert.match(storage, /insert into public\.comment_translator_paid_logical_attempts[\s\S]+?generate_series\(1,\s*129600\)/i, "storage fixture materializes the companion logical-attempt ledger");
assert.match(storage, /generate_series\(1,\s*28800\)/i, "storage fixture materializes the 30-day two-provider hourly-detail plan");
assert.match(storage, /insert into public\.comment_translator_paid_provider_detail_source_receipts[\s\S]+?generate_series\(1,\s*28800\)/i, "storage fixture materializes provider-detail replay receipts");
assert.match(storage, /create temporary table task11_storage_provider_source_plan[\s\S]+?generate_series\(1,\s*28800\)/i, "storage fixture defines one source of truth for provider source and hourly rows");
assert.match(storage, /insert into public\.comment_translator_paid_provider_detail_source_receipts[\s\S]+?from task11_storage_provider_source_plan/i, "provider source receipts are generated from the shared source plan");
assert.match(storage, /insert into public\.comment_translator_paid_provider_hourly_details[\s\S]+?from task11_storage_provider_source_plan/i, "provider hourly rows are generated from the shared source plan");
assert.match(storage, /group by logical_attempt\.attempt_id[\s\S]+?having count\(attempt_receipt\.id\)\s*<>\s*1/i, "storage fixture rejects any non-one-to-one logical attempt receipt mapping");
assert.match(storage, /join task11_storage_provider_source_plan[\s\S]+?provider_hourly_details[\s\S]+?provider_detail_source_receipts/i, "storage fixture proves source receipts and hourly rows match the shared owner/provider/hour plan");
assert.match(storage, /generate_series\(1,\s*14400\)/i, "storage fixture materializes the 90-day session-summary plan");
assert.match(storage, /pg_total_relation_size/i, "storage fixture measures real PostgreSQL data plus index allocation");
assert.match(storage, /pg_indexes_size/i, "storage fixture reports index allocation separately");
assert.match(storage, /if\s+paid_total_bytes\s+>=\s+300\s*\*\s*1024\s*\*\s*1024\s+then/i, "storage fixture asserts the approved local 300MB Paid ceiling");
assert.match(storage, /if\s+local_database_bytes\s+>=\s+300\s*\*\s*1024\s*\*\s*1024\s+then/i, "storage fixture asserts the approved local 300MB whole-database ceiling");
assert.match(storage, /^rollback;/im, "storage fixture releases logical synthetic rows before the mandatory local reset");

console.log("comment-translator-paid-core-v1 Task 11 local load fixture contract: PASS");
