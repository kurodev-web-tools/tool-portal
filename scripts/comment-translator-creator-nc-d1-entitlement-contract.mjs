import assert from "node:assert/strict";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260801010000_comment_translator_creator_paid_entitlements.sql";
const billingReservationsMigrationPath = "supabase/migrations/20260803010000_comment_translator_creator_billing_reservations.sql";
const adapterPath = "lib/comment-translator-creator-entitlement-store.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

assert.ok(fs.existsSync(path.join(root, migrationPath)), "NC-D1 additive entitlement migration exists");
assert.ok(fs.existsSync(path.join(root, billingReservationsMigrationPath)), "NC-B1 additive billing reservation migration exists");
assert.ok(fs.existsSync(path.join(root, adapterPath)), "NC-D1 server-only entitlement store adapter exists");

const migration = read(migrationPath);
const billingReservationsMigration = read(billingReservationsMigrationPath);
const adapterSource = read(adapterPath);

for (const marker of [
  "create table if not exists public.comment_translator_creator_checkout_reservations",
  "reservation_id text primary key",
  "owner_user_id uuid not null",
  "alter table public.comment_translator_creator_checkout_reservations enable row level security",
  "revoke all on table public.comment_translator_creator_checkout_reservations from anon",
  "revoke all on table public.comment_translator_creator_checkout_reservations from authenticated",
  "revoke all on table public.comment_translator_creator_checkout_reservations from service_role",
  "create or replace function public.reserve_comment_translator_creator_checkout",
  "create or replace function public.finalize_comment_translator_creator_checkout",
  "create or replace function public.release_comment_translator_creator_checkout",
  "create or replace function public.apply_comment_translator_creator_signed_checkout_lifecycle",
  "create table if not exists public.comment_translator_creator_checkout_lifecycle_evidence",
  "alter table public.comment_translator_creator_checkout_lifecycle_evidence enable row level security",
  "revoke all on table public.comment_translator_creator_checkout_lifecycle_evidence from anon",
  "revoke all on table public.comment_translator_creator_checkout_lifecycle_evidence from authenticated",
  "revoke all on table public.comment_translator_creator_checkout_lifecycle_evidence from service_role",
  "checkout-completed",
  "checkout-expired",
  "last_checkout_lifecycle_event_created_at",
  "last_checkout_lifecycle_event_reference",
  "p_stripe_checkout_session_reference",
  "p_lifecycle not in ('completed', 'expired')",
  "stale-or-replayed-lifecycle",
  "reservation-session-mismatch",
  "lifecycle-state-mismatch",
  "p_ttl_seconds < 1800",
  "p_ttl_seconds > 86400",
  "stripe_checkout_session_reference",
  "p_checkout_reservation_id",
  "reservation-binding-mismatch",
  "reservation-binding-required",
  "periodless-inactive-requires-existing-entitlement",
  "p_status = 'inactive' and p_period_start is null and p_period_end is null",
  "case when p_period_start is null then existing_entitlement.period_start else p_period_start end",
  "case when p_period_end is null then existing_entitlement.period_end else p_period_end end",
  "inactive-wins-tie",
  "p_status = 'active' and (",
  "greatest(public.comment_translator_creator_paid_entitlements.period_start, excluded.period_start)",
  "greatest(public.comment_translator_creator_paid_entitlements.period_end, excluded.period_end)",
  "and state = 'reserved'",
  "existing_entitlement.status = 'active' and p_status = 'inactive'",
  "existing_entitlement.status = 'inactive' and p_status = 'active'",
  "reservation-required",
  "grant execute on function public.reserve_comment_translator_creator_checkout",
  "grant execute on function public.finalize_comment_translator_creator_checkout",
  "grant execute on function public.release_comment_translator_creator_checkout"
  ,"grant execute on function public.apply_comment_translator_creator_signed_checkout_lifecycle"
]) {
  assert.match(billingReservationsMigration, new RegExp(escapeRegExp(marker), "i"), `NC-B1 reservation predicate exists: ${marker}`);
}
assert.doesNotMatch(
  billingReservationsMigration,
  /owner_user_id\s+uuid\s+primary\s+key/i,
  "NC-B1 preserves historical Checkout rows instead of using owner as the sole reservation key"
);
assert.match(
  billingReservationsMigration,
  /and\s*\(\s*excluded\.status\s*=\s*'inactive'\s*or\s*\(\s*public\.comment_translator_creator_paid_entitlements\.period_start\s*<=\s*excluded\.period_start/s,
  "NC-B1 lets later inactive evidence advance its authority even when its provider period regresses"
);
assert.doesNotMatch(
  billingReservationsMigration,
  /delete from public\.comment_translator_creator_checkout_reservations[\s\S]{0,180}expires_at\s*<=\s*now\(\)/i,
  "NC-B1 never releases a durable reservation solely because wall-clock TTL elapsed"
);
assert.match(
  billingReservationsMigration,
  /where owner_user_id = p_owner_user_id\s+and state in \('reserved', 'session-created', 'checkout-completed'\)/s,
  "NC-B1 blocks every nonterminal Checkout reservation regardless of expiry"
);
const signedReservationFunctionSource = billingReservationsMigration.slice(
  billingReservationsMigration.indexOf("p_checkout_reservation_id")
);
assert.match(
  signedReservationFunctionSource,
  /where owner_user_id = p_owner_user_id\s+and reservation_id = p_checkout_reservation_id\s+for update;/s,
  "NC-B1 resolves delayed signed evidence by its exact historical reservation"
);
assert.doesNotMatch(
  signedReservationFunctionSource.slice(0, signedReservationFunctionSource.indexOf("if not found")),
  /expires_at\s*<=\s*now\(\)/i,
  "NC-B1 does not discard an expired session-created binding before delayed signed evidence"
);
assert.doesNotMatch(
  billingReservationsMigration,
  /raw_provider_payload\s+(jsonb|text)|payload_json\s+(jsonb|text)|checkout_redirect|browser_plan/i,
  "NC-B1 reservation migration stores no raw provider payload or browser authority"
);

for (const marker of [
  "create table if not exists public.comment_translator_creator_paid_entitlements",
  "create table if not exists public.comment_translator_creator_entitlement_evidence",
  "owner_user_id uuid not null references auth.users(id) on delete cascade",
  "alter table public.comment_translator_creator_paid_entitlements enable row level security",
  "alter table public.comment_translator_creator_entitlement_evidence enable row level security",
  "revoke all on table public.comment_translator_creator_paid_entitlements from anon",
  "revoke all on table public.comment_translator_creator_paid_entitlements from authenticated",
  "revoke all on table public.comment_translator_creator_entitlement_evidence from anon",
  "revoke all on table public.comment_translator_creator_entitlement_evidence from authenticated",
  "revoke all on table public.comment_translator_creator_paid_entitlements from service_role",
  "revoke all on table public.comment_translator_creator_entitlement_evidence from service_role",
  "grant select on table public.comment_translator_creator_paid_entitlements to service_role",
  "create or replace function public.apply_comment_translator_creator_signed_entitlement_evidence",
  "auth.role() is distinct from 'service_role'",
  "p_signature_verified is not true",
  "p_plan_key is distinct from 'creator'",
  "p_product_compatibility_key is distinct from 'comment_translator_creator_v1'",
  "p_price_compatibility_key is distinct from 'creator_monthly_jpy_980_v1'",
  "p_period_end <= p_period_start",
  "p_status = 'active' and p_period_end <= now()",
  "p_event_created_at > now() + interval '5 minutes'",
  "last_event_created_at >= p_event_created_at",
  "period_start > p_period_start",
  "period_end > p_period_end",
  "on conflict (stripe_event_reference) do nothing",
  "last_event_created_at < excluded.last_event_created_at",
  "period_start <= excluded.period_start",
  "period_end <= excluded.period_end",
  "returning id into applied_entitlement_id",
  "revoke all on function public.apply_comment_translator_creator_signed_entitlement_evidence",
  "grant execute on function public.apply_comment_translator_creator_signed_entitlement_evidence",
  "to service_role"
]) {
  assert.match(migration, new RegExp(escapeRegExp(marker), "i"), `migration predicate exists: ${marker}`);
}

assert.doesNotMatch(
  migration,
  /grant\s+(select|insert|update|delete|all).*\b(anon|authenticated)\b/i,
  "ordinary browser roles receive no table privileges"
);
assert.doesNotMatch(
  migration,
  /raw_provider_payload\s+(jsonb|text)|payload_json\s+(jsonb|text)|checkout_redirect|browser_plan/i,
  "schema stores no raw payload or browser authority"
);

assert.match(adapterSource, /^import "server-only";/, "entitlement adapter is server-only");
assert.match(adapterSource, /SUPABASE_SERVICE_ROLE_KEY/, "adapter requires trusted service-role configuration");
assert.match(adapterSource, /apply_comment_translator_creator_signed_entitlement_evidence/, "writes use the atomic signed-evidence RPC only");
assert.match(adapterSource, /reserve_comment_translator_creator_checkout/, "adapter reserves Checkout atomically through NC-D1");
assert.match(adapterSource, /p_checkout_reservation_id/, "adapter binds signed evidence to the sealed Checkout reservation");
assert.match(adapterSource, /apply_comment_translator_creator_signed_checkout_lifecycle/, "adapter writes signed Checkout lifecycle through its dedicated RPC");
assert.doesNotMatch(adapterSource, /localStorage|sessionStorage|indexedDB|console\.|fetch\s*\(/, "adapter exposes no browser store, logging, or provider execution");

const executableSource = stripTypeScriptTypes(
  adapterSource
    .replace('import "server-only";', "")
    .replace('import { createClient } from "@supabase/supabase-js";', "const createClient = () => { throw new Error('not-used'); };") ,
  { mode: "transform" }
);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(executableSource).toString("base64")}`;
const adapter = await import(moduleUrl);

const unavailable = adapter.createTrustedCommentTranslatorCreatorEntitlementStore({ env: {} });
assert.deepEqual(unavailable, {
  status: "unavailable",
  store: null,
  missingEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  failClosed: true,
  reason: "trusted-service-role-env-missing"
});

const calls = [];
const ready = adapter.createTrustedCommentTranslatorCreatorEntitlementStore({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-only"
  },
  createSupabaseClient() {
    return {
      from(tableName) {
        assert.equal(tableName, "comment_translator_creator_paid_entitlements");
        return {
          select() {
            return this;
          },
          eq(column, value) {
            calls.push(["eq", column, value]);
            return this;
          },
          async single() {
            return { data: null, error: { code: "PGRST116" } };
          }
        };
      },
      async rpc(name, parameters) {
        calls.push(["rpc", name, parameters]);
        return { data: { status: "applied" }, error: null };
      }
    };
  },
  nowMs: () => Date.parse("2026-08-15T00:00:00.000Z")
});
assert.equal(ready.status, "ready");
assert.deepEqual(await ready.store.readEntitlement({ ownerUserId: "fixture-owner" }), {
  status: "paid-inactive",
  entitlement: null,
  authority: "fail-closed",
  reason: "missing"
});
assert.equal(calls[0][1], "owner_user_id", "read is always owner scoped");
assert.deepEqual(await ready.store.readBillingOwnership({ ownerUserId: "fixture-owner" }), {
  status: "unavailable",
  reason: "missing"
});

const ownedCustomerStore = adapter.createCommentTranslatorCreatorEntitlementSupabaseStore({
  supabase: createFixtureSupabaseClient({
    data: { stripe_customer_reference: "fixture-owned-customer" },
    error: null
  })
});
assert.deepEqual(await ownedCustomerStore.readBillingOwnership({ ownerUserId: "fixture-owner" }), {
  status: "ready",
  customerReference: "fixture-owned-customer"
});

const billingRpcCalls = [];
const billingStore = adapter.createCommentTranslatorCreatorEntitlementSupabaseStore({
  supabase: {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async single() { return { data: null, error: { code: "PGRST116" } }; }
      };
    },
    async rpc(name, parameters) {
      billingRpcCalls.push([name, parameters]);
      if (name === "reserve_comment_translator_creator_checkout") {
        return {
          data: {
            status: "reserved",
            reservationId: "fixture-reservation",
            idempotencyKey: "fixture-idempotency",
            expiresAtIso: "2026-08-15T00:45:00.000Z"
          },
          error: null
        };
      }
      if (name === "finalize_comment_translator_creator_checkout") return { data: { status: "finalized" }, error: null };
      if (name === "release_comment_translator_creator_checkout") return { data: { status: "released" }, error: null };
      return { data: { status: "applied" }, error: null };
    }
  }
});
assert.deepEqual(
  await billingStore.reserveCheckout({
    ownerUserId: "fixture-owner",
    priceCompatibilityKey: "creator_monthly_jpy_980_v1",
    ttlSeconds: 2700
  }),
  {
    status: "reserved",
    reservationId: "fixture-reservation",
    idempotencyKey: "fixture-idempotency",
    expiresAtMs: Date.parse("2026-08-15T00:45:00.000Z")
  }
);
assert.deepEqual(
  await billingStore.finalizeCheckout({
    ownerUserId: "fixture-owner",
    reservationId: "fixture-reservation",
    stripeCheckoutSessionReference: "fixture-checkout-session"
  }),
  { status: "finalized" }
);
assert.deepEqual(
  await billingStore.releaseCheckout({ ownerUserId: "fixture-owner", reservationId: "fixture-reservation" }),
  { status: "released" }
);
assert.equal(billingRpcCalls[0][0], "reserve_comment_translator_creator_checkout");
assert.equal(billingRpcCalls[1][0], "finalize_comment_translator_creator_checkout");
assert.equal(billingRpcCalls[2][0], "release_comment_translator_creator_checkout");
assert.deepEqual(
  await billingStore.applySignedCheckoutLifecycle({
    ownerUserId: "fixture-owner",
    checkoutReservationId: "fixture-reservation",
    stripeCheckoutSessionReference: "fixture-checkout-session",
    stripeEventReference: "fixture-checkout-expired-event",
    signatureVerified: true,
    lifecycle: "expired",
    eventCreatedAtIso: "2026-08-15T01:00:00.000Z"
  }),
  { status: "applied" }
);
assert.equal(billingRpcCalls[3][0], "apply_comment_translator_creator_signed_checkout_lifecycle");
assert.deepEqual(
  [billingRpcCalls[3][1].p_lifecycle, billingRpcCalls[3][1].p_stripe_checkout_session_reference],
  ["expired", "fixture-checkout-session"],
  "signed lifecycle forwards only explicit lifecycle/session references to NC-D1"
);

const unreadableStore = adapter.createCommentTranslatorCreatorEntitlementSupabaseStore({
  supabase: createFixtureSupabaseClient({ data: null, error: { code: "fixture-read-error" } })
});
assert.deepEqual(await unreadableStore.readEntitlement({ ownerUserId: "fixture-owner" }), {
  status: "paid-inactive",
  entitlement: null,
  authority: "fail-closed",
  reason: "unreadable"
});

const validEntitlementRow = {
  id: "fixture-entitlement",
  plan_key: "creator",
  product_compatibility_key: "comment_translator_creator_v1",
  price_compatibility_key: "creator_monthly_jpy_980_v1",
  status: "active",
  period_start: "2026-08-01T00:00:00.000Z",
  period_end: "2026-09-01T00:00:00.000Z",
  last_event_created_at: "2026-08-01T00:00:00.000Z",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z"
};

const throwingStore = adapter.createCommentTranslatorCreatorEntitlementSupabaseStore({
  supabase: {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async single() {
          throw new Error("fixture-read-failure");
        }
      };
    },
    async rpc() {
      throw new Error("fixture-rpc-failure");
    }
  }
});
assert.deepEqual(await throwingStore.readEntitlement({ ownerUserId: "fixture-owner" }), {
  status: "paid-inactive",
  entitlement: null,
  authority: "fail-closed",
  reason: "unreadable"
});

const malformedStore = adapter.createCommentTranslatorCreatorEntitlementSupabaseStore({
  supabase: createFixtureSupabaseClient({
    data: {
      ...validEntitlementRow,
      period_start: "2026-09-01T00:00:00.000Z",
      period_end: "2026-08-01T00:00:00.000Z"
    },
    error: null
  }),
  nowMs: () => Date.parse("2026-08-15T00:00:00.000Z")
});
assert.deepEqual(await malformedStore.readEntitlement({ ownerUserId: "fixture-owner" }), {
  status: "paid-inactive",
  entitlement: null,
  authority: "fail-closed",
  reason: "malformed"
});

const inactiveStore = adapter.createCommentTranslatorCreatorEntitlementSupabaseStore({
  supabase: createFixtureSupabaseClient({
    data: { ...validEntitlementRow, status: "inactive" },
    error: null
  }),
  nowMs: () => Date.parse("2026-08-15T00:00:00.000Z")
});
assert.equal((await inactiveStore.readEntitlement({ ownerUserId: "fixture-owner" })).reason, "inactive");

const staleStore = adapter.createCommentTranslatorCreatorEntitlementSupabaseStore({
  supabase: createFixtureSupabaseClient({
    data: { ...validEntitlementRow, period_end: "2026-08-10T00:00:00.000Z" },
    error: null
  }),
  nowMs: () => Date.parse("2026-08-15T00:00:00.000Z")
});
assert.equal((await staleStore.readEntitlement({ ownerUserId: "fixture-owner" })).reason, "stale");

const applied = await ready.store.applySignedEvidence({
  ownerUserId: "fixture-owner",
  stripeCustomerReference: "fixture-customer",
  stripeSubscriptionReference: "fixture-subscription",
  stripeEventReference: "fixture-event",
  checkoutReservationId: "fixture-reservation",
  signatureVerified: true,
  planKey: "creator",
  productCompatibilityKey: "comment_translator_creator_v1",
  priceCompatibilityKey: "creator_monthly_jpy_980_v1",
  status: "active",
  periodStartIso: "2026-08-01T00:00:00.000Z",
  periodEndIso: "2026-09-01T00:00:00.000Z",
  eventCreatedAtIso: "2026-08-01T00:00:00.000Z"
});
assert.deepEqual(applied, { status: "applied" });
assert.equal(calls.at(-1)[0], "rpc");
assert.equal(calls.at(-1)[1], "apply_comment_translator_creator_signed_entitlement_evidence");
assert.equal(calls.at(-1)[2].p_checkout_reservation_id, "fixture-reservation", "signed evidence binds the durable reservation");

const periodlessInactive = await ready.store.applySignedEvidence({
  ownerUserId: "fixture-owner",
  stripeCustomerReference: "fixture-customer",
  stripeSubscriptionReference: "fixture-subscription",
  stripeEventReference: "fixture-price-removed-event",
  checkoutReservationId: "fixture-reservation",
  signatureVerified: true,
  planKey: "creator",
  productCompatibilityKey: "comment_translator_creator_v1",
  priceCompatibilityKey: "creator_monthly_jpy_980_v1",
  status: "inactive",
  periodStartIso: null,
  periodEndIso: null,
  eventCreatedAtIso: "2026-08-02T00:00:00.000Z"
});
assert.deepEqual(periodlessInactive, { status: "applied" }, "periodless inactive evidence remains an explicit signed RPC request");
assert.deepEqual(
  [calls.at(-1)[2].p_status, calls.at(-1)[2].p_period_start, calls.at(-1)[2].p_period_end],
  ["inactive", null, null],
  "NC-D1 receives null periods without fabricating a positive entitlement period"
);

const unavailableWriteStore = adapter.createCommentTranslatorCreatorEntitlementSupabaseStore({
  supabase: createFixtureSupabaseClient(
    { data: null, error: null },
    { data: null, error: { code: "fixture-rpc-error" } }
  )
});
assert.deepEqual(
  await unavailableWriteStore.applySignedEvidence({
    ownerUserId: "fixture-owner",
    stripeCustomerReference: "fixture-customer",
    stripeSubscriptionReference: "fixture-subscription",
    stripeEventReference: "fixture-event",
    checkoutReservationId: "fixture-reservation",
    signatureVerified: true,
    planKey: "creator",
    productCompatibilityKey: "comment_translator_creator_v1",
    priceCompatibilityKey: "creator_monthly_jpy_980_v1",
    status: "active",
    periodStartIso: "2026-08-01T00:00:00.000Z",
    periodEndIso: "2026-09-01T00:00:00.000Z",
    eventCreatedAtIso: "2026-08-01T00:00:00.000Z"
  }),
  { status: "rejected", reason: "rpc-unavailable" }
);
assert.deepEqual(
  await throwingStore.applySignedEvidence({
    ownerUserId: "fixture-owner",
    stripeCustomerReference: "fixture-customer",
    stripeSubscriptionReference: "fixture-subscription",
    stripeEventReference: "fixture-event",
    checkoutReservationId: "fixture-reservation",
    signatureVerified: true,
    planKey: "creator",
    productCompatibilityKey: "comment_translator_creator_v1",
    priceCompatibilityKey: "creator_monthly_jpy_980_v1",
    status: "active",
    periodStartIso: "2026-08-01T00:00:00.000Z",
    periodEndIso: "2026-09-01T00:00:00.000Z",
    eventCreatedAtIso: "2026-08-01T00:00:00.000Z"
  }),
  { status: "rejected", reason: "rpc-unavailable" }
);

assert.deepEqual(adapter.commentTranslatorCreatorEntitlementStoreContract, {
  implementationStage: "nc-d1-local-schema-adapter",
  runtime: "server-only",
  tableName: "comment_translator_creator_paid_entitlements",
  evidenceTableName: "comment_translator_creator_entitlement_evidence",
  checkoutReservationsTableName: "comment_translator_creator_checkout_reservations",
  signedEvidenceRpc: "apply_comment_translator_creator_signed_entitlement_evidence",
  reserveCheckoutRpc: "reserve_comment_translator_creator_checkout",
  finalizeCheckoutRpc: "finalize_comment_translator_creator_checkout",
  releaseCheckoutRpc: "release_comment_translator_creator_checkout",
  signedCheckoutLifecycleRpc: "apply_comment_translator_creator_signed_checkout_lifecycle",
  writeAuthority: "signed-stripe-webhook-evidence-only",
  rowAccess: "trusted-server-service-role-only",
  writeMode: "atomic-rpc-only",
  browserAuthority: "forbidden",
  rawProviderPayloadPersistence: "forbidden",
  missingOrUnreadableFallback: "paid-inactive",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseReadWrite: "not-run-in-this-thread",
  creatorActivation: "disabled-nc-f1-boundary-unchanged",
  containerFallback: "forbidden",
  billingOwnershipSelectColumns: "stripe_customer_reference",
  trustedSelectColumns:
    "id, plan_key, product_compatibility_key, price_compatibility_key, status, period_start, period_end, last_event_created_at, created_at, updated_at"
});

process.stdout.write("comment translator NC-D1 entitlement schema and adapter contract passed\n");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createFixtureSupabaseClient(readResult, rpcResult = { data: { status: "applied" }, error: null }) {
  return {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async single() {
          return readResult;
        }
      };
    },
    async rpc() {
      return rpcResult;
    }
  };
}
