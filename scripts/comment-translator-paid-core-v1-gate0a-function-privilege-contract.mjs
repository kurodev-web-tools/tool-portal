import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair.sql";
assert.ok(fs.existsSync(path.join(root, migrationPath)), "the additive schedule-function privilege repair migration exists");
const migration = fs.readFileSync(path.join(root, migrationPath), "utf8");
const scheduleFunctionGrants = migration.match(/grant\s+(?:all(?:\s+privileges)?|execute)\s+on\s+(?:function|routine)\s+public\.ct_paid_schedule_unbound_checkout_recovery\(\)[\s\S]*?;/gi) ?? [];
const scheduleSchemaGrants = migration.match(/grant\s+(?:all(?:\s+privileges)?|execute)\s+on\s+all\s+(?:functions|routines)\s+in\s+schema\s+public[\s\S]*?;/gi) ?? [];

assert.match(
  migration,
  /revoke all on function public\.ct_paid_schedule_unbound_checkout_recovery\(\)[\s\S]+?from public, anon, authenticated/i,
  "the trigger SECURITY DEFINER function is not executable by public, anon, or authenticated"
);
assert.match(
  migration,
  /grant execute on function public\.ct_paid_schedule_unbound_checkout_recovery\(\)[\s\S]+?to service_role/i,
  "the trigger SECURITY DEFINER function remains executable by service_role"
);
assert.deepEqual(
  scheduleFunctionGrants.map((statement) => statement.replace(/\s+/g, " ").trim()),
  ["grant execute on function public.ct_paid_schedule_unbound_checkout_recovery() to service_role;"],
  "the trigger SECURITY DEFINER function has exactly one service_role-only EXECUTE grant"
);
assert.deepEqual(scheduleSchemaGrants, [], "the privilege repair does not use a broad public-schema function grant");
assert.doesNotMatch(
  migration,
  /grant\s+select\s+on\s+table\s+public\.comment_translator_paid_entitlements\s+to\s+service_role/i,
  "the privilege repair does not widen direct entitlement SELECT access"
);

console.log("comment translator paid core v1 Gate 0-A function privilege contract checks passed");
