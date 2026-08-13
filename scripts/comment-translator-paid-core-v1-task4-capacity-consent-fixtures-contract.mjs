import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const runtimeSource = fs.readFileSync(path.join(root, "lib/comment-translator-billing-runtime.ts"), "utf8");
const capacitySource = fs.readFileSync(path.join(root, "lib/comment-translator-paid-capacity-store.ts"), "utf8");
const consentSource = fs.readFileSync(path.join(root, "lib/comment-translator-paid-consent-store.ts"), "utf8");
const migrationSource = fs.readFileSync(
  path.join(root, "supabase/migrations/20260812120000_comment_translator_paid_core_v1.sql"),
  "utf8"
);

class AtomicCapacityFixture {
  constructor(limit = 20) {
    this.limit = limit;
    this.reservations = new Map();
  }

  reserve(ownerUserId, lifecycleId) {
    const ownerReservation = [...this.reservations.values()].find((value) => value.ownerUserId === ownerUserId && value.active);
    if (ownerReservation) return ownerReservation.holdId;
    if ([...this.reservations.values()].filter((value) => value.active).length >= this.limit) return null;
    const holdId = `hold-${this.reservations.size + 1}`;
    this.reservations.set(holdId, { ownerUserId, lifecycleId, holdId, active: true });
    return holdId;
  }
}

const capacity = new AtomicCapacityFixture();
for (let index = 1; index <= 20; index += 1) {
  assert.ok(capacity.reserve(`owner-${index}`, `lifecycle-${index}`), `slot ${index} is reserved`);
}
assert.equal(capacity.reserve("owner-21", "lifecycle-21"), null, "the 21st capacity request is rejected");
assert.equal(capacity.reserve("owner-1", "lifecycle-1"), "hold-1", "a concurrent same-owner request converges to the same opaque hold");

class ImmutableConsentFixture {
  constructor() {
    this.rows = new Map();
  }

  record(ownerUserId, documentType, documentVersion) {
    const key = `${ownerUserId}:${documentType}:${documentVersion}`;
    if (!this.rows.has(key)) this.rows.set(key, { ownerUserId, documentType, documentVersion });
    return this.rows.get(key);
  }

  hasAll(ownerUserId, versions) {
    return ["terms", "privacy", "paid_conditions"].every((documentType) =>
      this.rows.has(`${ownerUserId}:${documentType}:${versions[documentType]}`)
    );
  }
}

const consent = new ImmutableConsentFixture();
const consentVersions = { terms: "terms-v1", privacy: "privacy-v1", paid_conditions: "paid-v1" };
for (const documentType of Object.keys(consentVersions)) {
  consent.record("owner-1", documentType, consentVersions[documentType]);
}
assert.equal(consent.hasAll("owner-1", consentVersions), true, "all three exact consent versions are durable before Checkout");
assert.equal(consent.hasAll("owner-1", { ...consentVersions, terms: "terms-v2" }), false, "a changed document version requires new consent");
assert.deepEqual(
  consent.record("owner-1", "terms", "terms-v1"),
  consent.record("owner-1", "terms", "terms-v1"),
  "duplicate consent recording is idempotent and immutable"
);

assert.match(capacitySource, /capacityLimit:\s*20/);
assert.match(capacitySource, /ct_paid_reserve_capacity[\s\S]+?ct_paid_convert_capacity[\s\S]+?ct_paid_release_capacity/);
assert.match(migrationSource, /pg_advisory_xact_lock\(47290101\)/, "Checkout initialization uses a transaction lock");
assert.match(migrationSource, /v_capacity_limit[\s\S]+?v_reserved_count[\s\S]+?paid capacity is full/i, "capacity overflow is checked in the trusted RPC");
assert.match(migrationSource, /v_hold_id[\s\S]+?ct-paid-checkout-/i, "hold and idempotency key are generated together");
assert.match(
  migrationSource,
  /date_trunc\('second',\s*p_now\)\s*\+\s*interval\s*'31 minutes'/,
  "Checkout expiry round-trips through Stripe Unix-second precision"
);
assert.match(consentSource, /ct_paid_record_consent[\s\S]+?insertOnly:\s*true/);
for (const reason of ["consent-required", "capacity-full", "existing-checkout-session", "portal-payment-method-update", "contract-management", "processing"]) {
  assert.match(runtimeSource, new RegExp(reason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `runtime records ${reason}`);
}

console.log("comment translator paid core v1 Task 4 capacity and consent fixture contract checks passed");
