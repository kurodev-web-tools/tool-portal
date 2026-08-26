import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const stripSqlComments = (sql) => sql
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--[^\r\n]*/g, "");

const coreMigrationPath = "supabase/migrations/20260812120000_comment_translator_paid_core_v1.sql";
const floorMigrationPath = "supabase/migrations/20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor.sql";
const coreMigration = read(coreMigrationPath);
const retentionSource = read("lib/comment-translator-paid-retention.ts");
const reconcilerSource = read("lib/comment-translator-paid-control-plane-reconciler.ts");
const schedulerIntervalMinutes = 5;
const recoveryGuardMinutes = 30;
const recoverySafetyMarginMinutes = 5;
const requiredRecoveryFloorMinutes = schedulerIntervalMinutes + recoveryGuardMinutes + recoverySafetyMarginMinutes;

const baseTargetMatch = coreMigration.match(
  /v_checkout_expires_at_target\s*:=\s*date_trunc\('second',\s*p_now\)\s*\+\s*interval\s+'(\d+)\s+minutes'/i
);
assert.ok(baseTargetMatch, "the existing Checkout initialization target remains parser-visible");
const existingTargetMinutes = Number(baseTargetMatch[1]);
assert.equal(existingTargetMinutes, 31, "the RED baseline is the existing 31-minute Checkout target");
assert.ok(
  existingTargetMinutes - recoveryGuardMinutes < schedulerIntervalMinutes + recoverySafetyMarginMinutes,
  `RED baseline: ${existingTargetMinutes}-minute target leaves too little recovery time for a ${schedulerIntervalMinutes}-minute scheduler and ${recoverySafetyMarginMinutes}-minute margin`
);
assert.match(
  retentionSource,
  /schedule:\s*["']\*\/5 \* \* \* \*["']/i,
  "the existing Task 9 scheduler remains five-minute based"
);
assert.match(
  reconcilerSource,
  /checkoutExpiresAtTargetMs\s*<=\s*nowMs\s*\+\s*30\s*\*\s*60\s*\*\s*1000/i,
  "the existing unbound recovery guard remains the thirty-minute Stripe minimum"
);

if (!fs.existsSync(path.join(root, floorMigrationPath))) {
  assert.fail(
    `RED: ${floorMigrationPath} is absent; the ${existingTargetMinutes}-minute target does not satisfy the ${requiredRecoveryFloorMinutes}-minute recovery floor`
  );
}

const floorMigration = read(floorMigrationPath);
const executableFloorMigration = stripSqlComments(floorMigration);
const floorFunctionStart = executableFloorMigration.indexOf("function public.ct_paid_checkout_hold_recovery_window_floor");
assert.notEqual(floorFunctionStart, -1, "recovery-window floor trigger function exists");
const floorFunctionEnd = executableFloorMigration.indexOf("$$;", floorFunctionStart);
assert.notEqual(floorFunctionEnd, -1, "recovery-window floor trigger function has a bounded body");
const floorFunction = executableFloorMigration.slice(floorFunctionStart, floorFunctionEnd + 3);

assert.match(floorFunction, /returns trigger/i, "floor function is a trigger function");
assert.match(floorFunction, /security definer\s+set search_path = pg_catalog, public/i, "floor function has a fixed search path");
assert.match(
  floorFunction,
  /v_floor_expires_at\s+timestamptz\s*:=\s*statement_timestamp\(\)\s*\+\s*interval\s+'40 minutes';/i,
  "floor binds the server-authoritative DB statement clock to the exact 40-minute floor expression"
);
const floorConditionStart = floorFunction.search(
  /if\s+new\.checkout_expires_at_target\s+is null\s+or\s+new\.checkout_expires_at_target\s*<\s*v_floor_expires_at\s+then/i
);
assert.notEqual(floorConditionStart, -1, "floor checks for a null or earlier caller target");
const floorConditionEnd = floorFunction.indexOf("end if;", floorConditionStart);
assert.notEqual(floorConditionEnd, -1, "floor condition has a bounded first end if");
const floorConditionBlock = floorFunction.slice(floorConditionStart, floorConditionEnd + "end if;".length);
assert.match(
  floorConditionBlock,
  /new\.checkout_expires_at_target\s*:=\s*v_floor_expires_at;/i,
  "floor assigns the DB-clock floor inside the matching condition block"
);
assert.equal(
  (floorConditionBlock.match(/new\.checkout_expires_at_target\s*:=/gi) ?? []).length,
  1,
  "floor has one conditional assignment inside the matching condition block"
);
assert.equal(
  (floorFunction.match(/new\.checkout_expires_at_target\s*:=/gi) ?? []).length,
  1,
  "floor has no unconditional overwrite of a later caller target"
);
assert.match(floorFunction, /end if;\s*return new;/i, "the floor assignment block returns the unchanged NEW row afterward");
assert.match(
  executableFloorMigration,
  /create trigger comment_translator_paid_checkout_hold_recovery_window_floor\s+before insert on public\.comment_translator_paid_checkout_holds\s+for each row execute function public\.ct_paid_checkout_hold_recovery_window_floor\(\)/i,
  "Checkout hold INSERT trigger is bound to the floor function"
);
assert.doesNotMatch(
  executableFloorMigration,
  /\bupdate\s+(?:only\s+)?(?:public\.)?comment_translator_paid_checkout_holds\b/i,
  "floor migration does not backfill or update existing Checkout holds"
);
const normalizeSqlStatement = (statement) => statement.replace(/\s+/g, " ").trim().toLowerCase();
const floorRevokeStatements = executableFloorMigration.match(/\brevoke\b[\s\S]*?;/gi) ?? [];
assert.deepEqual(
  floorRevokeStatements.map(normalizeSqlStatement),
  ["revoke all on function public.ct_paid_checkout_hold_recovery_window_floor() from public, anon, authenticated;"],
  "floor migration has exactly one strict revoke for the trigger function"
);
const floorGrantStatements = executableFloorMigration.match(/\bgrant\b[\s\S]*?;/gi) ?? [];
assert.deepEqual(
  floorGrantStatements.map(normalizeSqlStatement),
  ["grant execute on function public.ct_paid_checkout_hold_recovery_window_floor() to service_role;"],
  "floor migration has exactly one service_role-only grant and no entitlement or schema-wide grant"
);

const clampExpiry = (callerTargetMinutes, statementMinute) => Math.max(
  callerTargetMinutes,
  statementMinute + requiredRecoveryFloorMinutes
);
assert.equal(clampExpiry(31, 0), 40, "the current 31-minute target is raised to the 40-minute floor");
assert.equal(clampExpiry(45, 0), 45, "a later valid caller target is preserved");

console.log(
  `comment translator paid core v1 Gate 0-A recovery-window floor contract checks passed (base=${existingTargetMinutes}m, floor=${requiredRecoveryFloorMinutes}m, scheduler=${schedulerIntervalMinutes}m, guard=${recoveryGuardMinutes}m, margin=${recoverySafetyMarginMinutes}m)`
);
