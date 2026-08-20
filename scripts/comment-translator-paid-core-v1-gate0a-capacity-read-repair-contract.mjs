import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(
  root,
  "supabase/migrations/20260819110000_comment_translator_paid_gate0a_capacity_read_repair.sql"
);
const runtimePath = path.join(root, "lib/comment-translator-billing-runtime.ts");

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "Gate 0-A capacity read repair migration exists as an additive migration"
);

const migration = fs.readFileSync(migrationPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const authorityStart = runtime.indexOf("async readCheckoutSafetyAuthority");
assert.ok(authorityStart >= 0, "the billing runtime exposes the checkout safety authority reader");
const authoritySource = runtime.slice(authorityStart, authorityStart + 2200);

const directCapacityReadTables = [
  "comment_translator_paid_capacity_config",
  "comment_translator_paid_capacity_reservations"
];

for (const table of directCapacityReadTables) {
  assert.match(
    authoritySource,
    new RegExp(`from\\(\\"${table}\\"\\)`, "i"),
    `checkout safety reader references ${table}`
  );
  assert.match(
    migration,
    new RegExp(
      `grant\\s+select\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+service_role\\s*;`,
      "i"
    ),
    `service_role receives SELECT only for ${table}`
  );
}

assert.doesNotMatch(
  migration,
  /grant\s+select\s+on\s+table\s+public\.(?:comment_translator_paid_poll_budget_buckets|comment_translator_paid_poll_reservations|comment_translator_paid_entitlements)\s+to\s+service_role/i,
  "poll-budget and entitlement tables remain behind their existing RPC authorities"
);
assert.doesNotMatch(
  migration,
  /grant\s+(?:all|insert|update|delete|truncate|references|trigger)\s+on\s+table/i,
  "the repair grants no table DML or broad privilege"
);
assert.doesNotMatch(
  migration,
  /grant\s+select\s+on\s+table[\s\S]+?to\s+(?:public|anon|authenticated)/i,
  "the repair exposes no capacity table to public API roles"
);
assert.doesNotMatch(
  migration,
  /\b(?:drop\s+table|truncate\s+table|delete\s+from|alter\s+table|create\s+table)\b/i,
  "the repair is additive and non-destructive"
);

console.log("comment-translator-paid-core-v1-gate0a-capacity-read-repair-contract: PASS");
