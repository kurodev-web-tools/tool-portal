import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql";
const pgTapPath = "supabase/tests/comment_translator_c1_containerless_billing_read.test.sql";
const projectionPath = "lib/comment-translator-c1-containerless-billing-read.ts";

const migration = fs.readFileSync(path.join(root, migrationPath), "utf8");
const pgTap = fs.readFileSync(path.join(root, pgTapPath), "utf8");
const projectionSource = fs.readFileSync(path.join(root, projectionPath), "utf8");
const normalizedMigration = migration.replace(/\s+/g, " ").toLowerCase();

for (const requiredSql of [
  "create schema if not exists comment_translator_private",
  "create schema if not exists comment_translator_api",
  "paid_entitlement_owner_bindings",
  "owner_user_id uuid primary key",
  "billing_user_reference_id text not null unique",
  "alter table comment_translator_private.paid_entitlement_owner_bindings force row level security",
  "alter table public.comment_translator_paid_entitlements force row level security",
  "create policy comment_translator_paid_entitlement_bindings_owner_read",
  "create policy comment_translator_paid_entitlements_owner_read",
  "using ((select auth.uid()) = owner_user_id)",
  "comment_translator_private.create_paid_entitlement_owner_binding",
  "after insert on auth.users",
  "comment-translator-billing:",
  "extensions.digest",
  "comment_translator_private.reject_paid_entitlement_owner_binding_mutation",
  "before update or delete",
  "raise exception 'paid entitlement owner binding is immutable'",
  "paid entitlement owner binding is required",
  "create or replace function comment_translator_api.read_comment_translator_billing_state_v1()",
  "returns table(result_status text, billing_state text)",
  "security definer",
  "set search_path = ''",
  "grant execute on function comment_translator_api.read_comment_translator_billing_state_v1() to authenticated",
  "revoke all on function comment_translator_api.read_comment_translator_billing_state_v1() from public, anon, authenticated, service_role",
  "alter default privileges for role postgres in schema comment_translator_api",
  "alter default privileges for role comment_translator_api_owner in schema comment_translator_api",
  "alter default privileges for role postgres revoke execute on functions from public, anon, authenticated, service_role",
  "alter default privileges for role comment_translator_api_owner revoke execute on functions from public, anon, authenticated, service_role",
  "revoke execute on functions from public, anon, authenticated, service_role",
  "comment_translator_api_owner",
  "comment_translator_billing_reader",
  "nobypassrls",
  "pg_auth_members"
]) {
  assert.ok(
    normalizedMigration.includes(requiredSql.toLowerCase()),
    `migration keeps required boundary: ${requiredSql}`
  );
}

for (const forbiddenSql of [
  "owner_user_id uuid references auth.users",
  "grant all on table public.comment_translator_paid_entitlements to service_role",
  "grant execute on function comment_translator_api.read_comment_translator_billing_state_v1() to anon",
  "grant create on schema comment_translator_api to authenticated",
  "grant create on schema comment_translator_api to service_role"
]) {
  assert.ok(
    !normalizedMigration.includes(forbiddenSql.toLowerCase()),
    `migration rejects forbidden boundary: ${forbiddenSql}`
  );
}

const provisioningStart = migration.indexOf(
  "comment_translator_private.create_paid_entitlement_owner_binding()"
);
const provisioningEnd = migration.indexOf(
  "create trigger comment_translator_create_paid_entitlement_owner_binding"
);
assert.ok(provisioningStart >= 0 && provisioningEnd > provisioningStart);
assert.doesNotMatch(
  migration.slice(provisioningStart, provisioningEnd),
  /on conflict/i,
  "forward provisioning rejects duplicate or conflicting bindings"
);

for (const requiredTest of [
  "select plan(",
  "available",
  "paid-active",
  "paid-inactive",
  "trialing",
  "missing",
  "unavailable",
  "auth.uid()",
  "has_function_privilege",
  "has_table_privilege",
  "pg_auth_members",
  "rollback"
]) {
  assert.ok(pgTap.toLowerCase().includes(requiredTest.toLowerCase()), `pgTAP covers ${requiredTest}`);
}

assert.match(
  projectionSource,
  /comment_translator_api[\s\S]*read_comment_translator_billing_state_v1/,
  "application seam fixes the schema-specific zero-argument RPC"
);
assert.doesNotMatch(
  projectionSource,
  /service_role|billing_user_reference|stripe|customer|subscription|reason/i,
  "application seam cannot name private billing authority material"
);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export{}" };
    }
    return nextResolve(specifier, context);
  }
});

const projection = await import("../lib/comment-translator-c1-containerless-billing-read.ts");

const validCases = [
  {
    value: [{ result_status: "available", billing_state: "paid-active" }],
    expected: { resultStatus: "available", billingState: "paid-active" }
  },
  {
    value: [{ result_status: "available", billing_state: "paid-inactive" }],
    expected: { resultStatus: "available", billingState: "paid-inactive" }
  },
  {
    value: [{ result_status: "missing", billing_state: null }],
    expected: { resultStatus: "missing", billingState: null }
  },
  {
    value: [{ result_status: "unavailable", billing_state: null }],
    expected: { resultStatus: "unavailable", billingState: null }
  }
];

for (const testCase of validCases) {
  assert.deepEqual(
    projection.parseCommentTranslatorC1BillingProjection(testCase.value),
    testCase.expected
  );
}

for (const malformed of [
  null,
  [],
  [{ result_status: "available", billing_state: "paid-active" }, { result_status: "missing", billing_state: null }],
  [{ result_status: "available", billing_state: null }],
  [{ result_status: "missing", billing_state: "paid-inactive" }],
  [{ result_status: "unexpected", billing_state: null }],
  [{ result_status: "available", billing_state: "paid-active", owner_user_id: "forbidden" }],
  { result_status: "available", billing_state: "paid-active" }
]) {
  assert.deepEqual(
    projection.parseCommentTranslatorC1BillingProjection(malformed),
    { resultStatus: "unavailable", billingState: null }
  );
}

let rpcCount = 0;
let observedArgumentCount = null;
const active = await projection.readCommentTranslatorC1ContainerlessBillingProjection({
  authStatus: "signed-in",
  supabase: {
    schema(schemaName) {
      assert.equal(schemaName, "comment_translator_api");
      return {
        async rpc(functionName, ...args) {
          rpcCount += 1;
          observedArgumentCount = args.length;
          assert.equal(functionName, "read_comment_translator_billing_state_v1");
          return {
            data: [{ result_status: "available", billing_state: "paid-active" }],
            error: null
          };
        }
      };
    }
  }
});
assert.deepEqual(active, { resultStatus: "available", billingState: "paid-active" });
assert.deepEqual({ rpcCount, observedArgumentCount }, { rpcCount: 1, observedArgumentCount: 0 });

for (const authStatus of ["signed-out", "recovery-pending", "unavailable"]) {
  const unavailable = await projection.readCommentTranslatorC1ContainerlessBillingProjection({
    authStatus,
    supabase: {
      schema() {
        throw new Error("non-signed-in callers must not create an RPC query");
      }
    }
  });
  assert.deepEqual(unavailable, { resultStatus: "unavailable", billingState: null });
}

const failed = await projection.readCommentTranslatorC1ContainerlessBillingProjection({
  authStatus: "signed-in",
  supabase: {
    schema() {
      return {
        async rpc() {
          throw new Error("synthetic timeout");
        }
      };
    }
  }
});
assert.deepEqual(failed, { resultStatus: "unavailable", billingState: null });

process.stdout.write(
  "comment_translator_creator_c1_containerless_billing_read_contract=pass\n"
);
