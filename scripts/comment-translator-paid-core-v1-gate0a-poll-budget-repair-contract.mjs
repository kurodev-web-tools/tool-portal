import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const originalMigrationPath = path.join(
  root,
  "supabase/migrations/20260814100000_comment_translator_paid_task7_runtime_authority.sql"
);
const repairMigrationPath = path.join(
  root,
  "supabase/migrations/20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair.sql"
);
const usageStorePath = path.join(root, "lib/comment-translator-paid-usage-store.ts");

const originalMigration = fs.readFileSync(originalMigrationPath, "utf8");
assert.equal(
  fs.existsSync(repairMigrationPath),
  true,
  "Gate 0-A repair migration exists as an additive migration"
);
const repairMigration = fs.readFileSync(repairMigrationPath, "utf8");
const usageStore = fs.readFileSync(usageStorePath, "utf8");

function functionSource(sql, functionName) {
  const start = sql.indexOf(`create or replace function public.${functionName}(`);
  assert.ok(start >= 0, `${functionName} is defined in the migration`);
  const endMarkers = [
    "create or replace function public.",
    "revoke all on function public."
  ];
  const end = endMarkers
    .map((marker) => sql.indexOf(marker, start + 1))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  return sql.slice(start, end ?? sql.length);
}

const originalSource = functionSource(originalMigration, "ct_paid_read_poll_budget");
const repairSource = functionSource(repairMigration, "ct_paid_read_poll_budget");

assert.match(
  repairSource,
  /ct_paid_read_poll_budget\(\s*p_session_reference_id\s+text,\s*p_owner_user_id\s+uuid,\s*p_now\s+timestamptz\s+default\s+now\(\)\s*\)/i,
  "the repair preserves the existing RPC signature"
);
assert.match(
  repairSource,
  /returns table \(\s*utc_day date,\s*daily_budget integer,\s*reserved_polls integer,\s*session_reserved_polls integer,\s*session_reservation_present boolean,\s*next_reset_at timestamptz\s*\)/i,
  "the repair preserves the existing return contract"
);
assert.match(repairSource, /language plpgsql[\s\S]+?stable[\s\S]+?security definer/i);
assert.match(repairSource, /set search_path = pg_catalog, public/i);
assert.match(repairSource, /v_now\s*:=\s*statement_timestamp\(\)/i);

assert.match(
  repairSource,
  /from public\.comment_translator_paid_poll_reservations\s+reservation[\s\S]+?reservation\.session_reference_id\s*=\s*p_session_reference_id[\s\S]+?reservation\.utc_day\s*=\s*v_utc_day/i,
  "the reservation UTC-day predicate is table-qualified"
);
assert.match(
  repairSource,
  /from public\.comment_translator_paid_poll_budget_buckets\s+bucket[\s\S]+?bucket\.utc_day\s*=\s*v_utc_day/i,
  "the bucket UTC-day predicate is table-qualified"
);
assert.doesNotMatch(
  repairSource,
  /\b(?:where|and)\s+utc_day\s*=/i,
  "the repair contains no unqualified UTC-day predicate"
);

assert.match(
  repairSource,
  /return query[\s\S]+?v_bucket\.daily_budget[\s\S]+?v_reservation\.reserved_polls[\s\S]+?v_day_end/i,
  "the repair keeps the existing authority values and reset projection"
);
assert.match(
  repairMigration,
  /revoke all on function public\.ct_paid_read_poll_budget\(text, uuid, timestamptz\)[\s\S]+?from public, anon, authenticated;[\s\S]+?grant execute on function public\.ct_paid_read_poll_budget\(text, uuid, timestamptz\)[\s\S]+?to service_role;/i,
  "the repair preserves the server-only execute boundary"
);

const readPollBudgetAdapterStart = usageStore.indexOf("async readPollBudget(request)");
assert.ok(readPollBudgetAdapterStart >= 0, "the trusted usage adapter exposes the poll-budget read");
assert.match(
  usageStore.slice(readPollBudgetAdapterStart, readPollBudgetAdapterStart + 500),
  /rpc\("ct_paid_read_poll_budget",\s*\{[\s\S]+?p_session_reference_id:\s*request\.sessionReferenceId[\s\S]+?p_owner_user_id:\s*request\.ownerUserId[\s\S]+?p_now:\s*request\.nowIso/i,
  "the runtime keeps the existing RPC call and argument contract"
);
assert.match(
  usageStore,
  /function readPollBudgetAuthority\(result[\s\S]+?readString\(row, "utc_day"\)[\s\S]+?readSafeIntegerField\(row, "reserved_polls"\)[\s\S]+?readString\(row, "next_reset_at"\)/i,
  "the runtime keeps the existing browser-safe return-field parser"
);

assert.match(
  originalSource,
  /from public\.comment_translator_paid_poll_reservations[\s\S]+?and utc_day\s*=\s*v_utc_day/i,
  "the pre-repair migration remains the historical source and is not rewritten"
);

console.log("comment-translator-paid-core-v1-gate0a-poll-budget-repair-contract: PASS");
