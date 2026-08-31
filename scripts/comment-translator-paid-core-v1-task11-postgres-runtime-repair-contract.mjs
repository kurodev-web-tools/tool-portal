import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const coreMigrationPath = "supabase/migrations/20260812120000_comment_translator_paid_core_v1.sql";
const task7MigrationPath = "supabase/migrations/20260814100000_comment_translator_paid_task7_runtime_authority.sql";
const repairMigrationName = "20260831100000_comment_translator_paid_task11_message_rate_runtime_repair.sql";
const repairMigrationPath = path.join(root, "supabase", "migrations", repairMigrationName);
const task7Migration = fs.readFileSync(path.join(root, task7MigrationPath), "utf8");

assert.equal(fs.existsSync(repairMigrationPath), true, "Task 11 message-rate runtime repair migration exists");
const repairMigration = fs.readFileSync(repairMigrationPath, "utf8");
const coreMigration = fs.readFileSync(path.join(root, coreMigrationPath), "utf8");
assert.match(
  coreMigration,
  /v_provider_receipt\.provider_kind\s+is distinct from\s+\(case[\s\S]+?end\)\s+then/i,
  "the historical provider-hourly CASE expression is PostgreSQL 17-valid"
);
assert.ok(repairMigrationName > path.basename(task7MigrationPath), "repair migration is ordered after Task 7 runtime authority");
assert.match(
  repairMigration,
  /create or replace function public\.ct_paid_reserve_message_rate\([\s\S]+?returns table\s*\([\s\S]+?minute_start timestamptz[\s\S]+?\)\s*language plpgsql\s+security definer\s+set search_path = pg_catalog, public/i,
  "repair preserves the existing service-only RPC signature and security boundary"
);
assert.match(
  repairMigration,
  /create or replace function public\.ct_paid_finalize_message_rate\([\s\S]+?returns table\s*\([\s\S]+?minute_start timestamptz[\s\S]+?\)\s*language plpgsql\s+security definer\s+set search_path = pg_catalog, public/i,
  "repair preserves the existing finalize RPC signature and security boundary"
);
assert.match(
  repairMigration,
  /create or replace function public\.ct_paid_reserve_message_rate\(\s*p_owner_user_id uuid,\s*p_session_reference_id text,\s*p_reservation_key text,\s*p_message_count integer,\s*p_now timestamptz default now\(\)\s*\)[\s\S]+?returns table/i,
  "reserve repair keeps the complete parameter list and types"
);
assert.match(
  repairMigration,
  /create or replace function public\.ct_paid_finalize_message_rate\(\s*p_owner_user_id uuid,\s*p_session_reference_id text,\s*p_reservation_key text,\s*p_translated_message_count integer,\s*p_now timestamptz default now\(\)\s*\)[\s\S]+?returns table/i,
  "finalize repair keeps the complete parameter list and types"
);
assert.match(
  task7Migration,
  /revoke all on function public\.ct_paid_reserve_message_rate\(uuid, text, text, integer, timestamptz\)\s+from public, anon, authenticated;\s+grant execute on function public\.ct_paid_reserve_message_rate\(uuid, text, text, integer, timestamptz\)\s+to service_role;/i,
  "Task 7 reserve RPC baseline keeps service_role-only execution ACL"
);
assert.match(
  task7Migration,
  /revoke all on function public\.ct_paid_finalize_message_rate\(uuid, text, text, integer, timestamptz\)\s+from public, anon, authenticated;\s+grant execute on function public\.ct_paid_finalize_message_rate\(uuid, text, text, integer, timestamptz\)\s+to service_role;/i,
  "Task 7 finalize RPC baseline keeps service_role-only execution ACL"
);
assert.equal(
  (repairMigration.match(/on conflict on constraint comment_translator_paid_message_rate_buckets_pkey\s+do nothing/gi) ?? []).length,
  2,
  "repair uses the bucket primary-key constraint for both idempotent inserts"
);
assert.doesNotMatch(
  repairMigration,
  /on conflict\s*\(\s*owner_user_id\s*,\s*minute_start\s*\)/i,
  "repair removes the PL/pgSQL output-variable ambiguity from conflict targets"
);
assert.match(
  repairMigration,
  /update public\.comment_translator_paid_message_rate_buckets[\s\S]+?set reserved_messages = [a-z_]+\.reserved_messages \+ p_message_count/i,
  "repair qualifies bucket column reads in the reservation update"
);
assert.match(
  repairMigration,
  /update public\.comment_translator_paid_message_rate_buckets[\s\S]+?set reserved_messages = [a-z_]+\.reserved_messages - v_reservation\.reserved_messages[\s\S]+?where [a-z_]+\.owner_user_id = p_owner_user_id[\s\S]+?and [a-z_]+\.minute_start = v_reservation\.minute_start[\s\S]+?and [a-z_]+\.reserved_messages >= v_reservation\.reserved_messages/i,
  "repair qualifies finalize bucket reads and the output-column minute predicate"
);
assert.doesNotMatch(repairMigration, /\b(?:drop\s+table|truncate\s+table|delete\s+from|grant\s+|revoke\s+)\b/i, "repair changes no data or privileges");
assert.match(task7Migration, /comment_translator_paid_message_rate_buckets[\s\S]+?primary key \(owner_user_id, minute_start\)/i, "Task 7 defines the stable bucket primary key used by the repair");

console.log("comment-translator-paid-core-v1 Task 11 PostgreSQL runtime repair contract: PASS");
