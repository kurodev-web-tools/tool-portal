export const NC_Q1_EVIDENCE_CLASSES = Object.freeze(["fixture", "local", "gated", "blocked", "live"]);

function freeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) {
      freeze(child);
    }
  }
  return Object.freeze(value);
}

const fixture = freeze({
  evidence: {
    kind: "fixture",
    acceptedClasses: NC_Q1_EVIDENCE_CLASSES,
    productionProof: false,
    deployedProof: false,
    fixtureAndLocalSuccess: ["fixture", "local"],
    localOnly: true
  },
  fixtureHarness: {
    marker: "fixture-only-harness",
    deployedProof: false
  },
  activation: {
    status: "closed",
    gates: [
      { name: "external-services", status: "closed" },
      { name: "durable-schema", status: "closed" },
      { name: "deployed-runtime", status: "closed" },
      { name: "public-paid-access", status: "closed" }
    ]
  },
  free: {
    tier: "Free",
    permanent: true,
    paidInference: false
  },
  entitlement: {
    writeAuthority: "signed-webhook-only",
    checkoutResultIsEvidence: false
  },
  authorityMatrix: [
    {
      label: "unauthenticated",
      authentication: "missing",
      entitlementEvidence: "none",
      expected: { tier: "denied", paid: false, canUsePaidProvider: false, canWritePaidState: false }
    },
    {
      label: "authenticated-free",
      authentication: "authenticated",
      entitlementEvidence: "free",
      expected: { tier: "Free", paid: false, canUsePaidProvider: false, canWritePaidState: false }
    },
    {
      label: "paid-inactive",
      authentication: "authenticated",
      entitlementEvidence: "verified-signed-inactive",
      expected: { tier: "Free", paid: false, canUsePaidProvider: false, canWritePaidState: false }
    },
    {
      label: "missing-authority",
      authentication: "authenticated",
      entitlementEvidence: "missing",
      expected: { tier: "Free", paid: false, canUsePaidProvider: false, canWritePaidState: false }
    },
    {
      label: "incomplete-authority",
      authentication: "authenticated",
      entitlementEvidence: "incomplete",
      expected: { tier: "Free", paid: false, canUsePaidProvider: false, canWritePaidState: false }
    },
    {
      label: "ambiguous-authority",
      authentication: "authenticated",
      entitlementEvidence: "ambiguous",
      expected: { tier: "Free", paid: false, canUsePaidProvider: false, canWritePaidState: false }
    },
    {
      label: "checkout-completion",
      authentication: "authenticated",
      entitlementEvidence: "checkout-completion",
      expected: { tier: "Free", paid: false, canUsePaidProvider: false, canWritePaidState: false }
    },
    {
      label: "verified-signed-active",
      authentication: "authenticated",
      entitlementEvidence: "verified-signed-active",
      expected: { tier: "Paid", paid: true, canUsePaidProvider: true, canWritePaidState: false }
    }
  ],
  authorityFailures: [
    { label: "stale", evidence: "verified-signed-active", marker: "fixture-stale", observedAt: 100 },
    { label: "replay", evidence: "verified-signed-active", marker: "fixture-active", observedAt: 101 },
    { label: "idempotency", evidence: "verified-signed-active", marker: "fixture-active", observedAt: 102 }
  ],
  crossLane: {
    lanes: ["NC-F1", "NC-D1", "NC-E1", "NC-U1", "NC-P1", "NC-C1", "NC-O1", "NC-O2", "NC-M1", "NC-M2", "NC-H1", "NC-V1", "NC-B1"],
    priority: "server-derived",
    history: "safe-projection",
    usage: "signed-period-and-deduped",
    dictionary: "bounded-safe-terms"
  },
  safeSurfaces: [
    { lane: "NC-O2", readOnly: true, authority: "server-derived", externalState: false },
    { lane: "NC-M2", readOnly: true, authority: "server-derived", externalState: false },
    { lane: "NC-H1", readOnly: true, authority: "server-derived", externalState: false },
    { lane: "NC-V1", readOnly: true, authority: "server-derived", externalState: false }
  ]
});

export function createCommentTranslatorCreatorNcQ1Fixture() {
  return fixture;
}
