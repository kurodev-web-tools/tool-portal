import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(
  root,
  "supabase/migrations/20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair.sql"
);
const storePath = path.join(root, "lib/comment-translator-paid-entitlement-store.ts");

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "Gate 0-A lifecycle read repair migration exists as an additive migration"
);

const migration = fs.readFileSync(migrationPath, "utf8");
const store = fs.readFileSync(storePath, "utf8");

const directLifecycleReadTables = [
  "comment_translator_paid_customers",
  "comment_translator_paid_billing_lifecycles",
  "comment_translator_paid_checkout_holds",
  "comment_translator_paid_checkout_session_bindings",
  "comment_translator_paid_subscription_bindings"
];

const checkoutLifecycleStart = store.indexOf("async readCheckoutLifecycle({ ownerUserId })");
assert.ok(checkoutLifecycleStart >= 0, "the trusted store exposes checkout lifecycle read");
const checkoutLifecycleSource = store.slice(checkoutLifecycleStart, checkoutLifecycleStart + 3200);

const billingLifecycleStart = store.indexOf("async readBillingLifecycle({ lifecycleId })");
assert.ok(billingLifecycleStart >= 0, "the trusted store exposes billing lifecycle read");
const billingLifecycleSource = store.slice(billingLifecycleStart, billingLifecycleStart + 5000);

assert.match(
  billingLifecycleSource,
  /const entitlement = await readEntitlement\(\{\s*ownerUserId:\s*lifecycleOwnerUserId,\s*lifecycleId\s*\}\)/,
  "billing lifecycle read resolves entitlement through the owner-scoped RPC-backed helper"
);
assert.doesNotMatch(
  billingLifecycleSource,
  /readMaybeTrustedRow\(\s*supabase,\s*[\"']comment_translator_paid_entitlements[\"']/,
  "billing lifecycle read does not directly select the entitlement table"
);
assert.match(
  billingLifecycleSource,
  /currentPeriodStartIso:\s*entitlement\?\.currentPeriodStartIso[\s\S]+currentPeriodEndIso:\s*entitlement\?\.currentPeriodEndIso[\s\S]+disputeState:\s*entitlement\?\.disputeState/,
  "billing lifecycle read maps entitlement period and dispute fields from the RPC result"
);

for (const table of directLifecycleReadTables) {
  assert.match(
    checkoutLifecycleSource,
    new RegExp(`comment_translator_paid_${table.replace("comment_translator_paid_", "")}`, "i"),
    `checkout lifecycle read path references ${table}`
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
  /grant\s+select\s+on\s+table\s+public\.comment_translator_paid_entitlements\s+to\s+service_role/i,
  "entitlement table direct SELECT remains closed behind its RPC authority"
);
assert.doesNotMatch(
  migration,
  /grant\s+(?:all|insert|update|delete|truncate|references|trigger)\s+on\s+table/i,
  "the repair grants no table DML or broad privilege"
);
assert.doesNotMatch(
  migration,
  /grant\s+select\s+on\s+table[\s\S]+?to\s+(?:public|anon|authenticated)/i,
  "the repair exposes no billing table to public API roles"
);
assert.doesNotMatch(
  migration,
  /\b(?:drop\s+table|truncate\s+table|delete\s+from|alter\s+table|create\s+table)\b/i,
  "the repair is additive and non-destructive"
);

console.log("comment-translator-paid-core-v1-gate0a-lifecycle-read-repair-contract: PASS");
