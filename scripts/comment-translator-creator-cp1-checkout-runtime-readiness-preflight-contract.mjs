import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";

const root = process.cwd();
const readinessPath = "lib/comment-translator-creator-paid-readiness.ts";
const contractPath =
  "scripts/comment-translator-creator-cp1-checkout-runtime-readiness-preflight-contract.mjs";
const billingPath = "lib/comment-translator-billing-runtime.ts";
const containerBoundaryPath = "lib/comment-translator-c1-container-boundary.ts";
const workerPath = "cloudflare-worker.mjs";
const authorityPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_CP1_EXTERNAL_EVIDENCE_RECONCILIATION_PREFLIGHT.md";

const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

for (const requiredPath of [
  readinessPath,
  billingPath,
  containerBoundaryPath,
  workerPath,
  authorityPath,
]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)));
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export{}" };
    }
    return nextResolve(specifier, context);
  },
});

const readiness = await import(
  "../lib/comment-translator-creator-paid-readiness.ts"
);
const completeSyntheticEnv = {
  STRIPE_SECRET_KEY: "synthetic-present",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "synthetic-present",
  NEXT_PUBLIC_SITE_URL: "synthetic-present",
  COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "synthetic-unread",
  COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES: "synthetic-unread",
};
const readyReferences =
  readiness.readCommentTranslatorCreatorPaidReadiness(completeSyntheticEnv)
    .checkout;

assert.deepEqual(readyReferences, {
  status: "blocked",
  blocker: "c1-durable-billing-state-read-disconnected",
  references: [
    { name: "STRIPE_SECRET_KEY", status: "present" },
    { name: "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID", status: "present" },
    { name: "NEXT_PUBLIC_SITE_URL", status: "present" },
    {
      name: "COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS",
      status: "unreviewed",
    },
    {
      name: "COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES",
      status: "unreviewed",
    },
    {
      name: "C1_DURABLE_BILLING_STATE_READ",
      status: "disconnected-fail-closed",
    },
  ],
  counts: {
    total: 6,
    present: 3,
    missing: 0,
    unreviewed: 2,
    disconnected: 1,
  },
  checkoutInvocationCount: 0,
});

const missingReferences =
  readiness.readCommentTranslatorCreatorPaidReadiness({}).checkout;
assert.deepEqual(missingReferences.counts, {
  total: 6,
  present: 0,
  missing: 5,
  unreviewed: 0,
  disconnected: 1,
});
assert.equal(missingReferences.checkoutInvocationCount, 0);
assert.equal(
  missingReferences.references.filter(
    (reference) => reference.status === "disconnected-fail-closed",
  ).length,
  1,
);

const billingSource = read(billingPath);
const workerSource = read(workerPath);
const authoritySource = read(authorityPath);
const missingConfigIndex = billingSource.indexOf(
  "const missingEnvReferences = missingCheckoutEnvReferences(env)",
);
const durableReadIndex = billingSource.indexOf(
  "await durableStore.readByBillingUserReference(billingUserReferenceId)",
  missingConfigIndex,
);
const stripeCallIndex = billingSource.indexOf(
  "await stripeAdapter.createCheckoutSession",
  durableReadIndex,
);

assert.ok(missingConfigIndex > 0);
assert.ok(durableReadIndex > missingConfigIndex);
assert.ok(stripeCallIndex > durableReadIndex);
assert.doesNotMatch(
  billingSource,
  /comment-translator-c1-container-boundary|COMMENT_TRANSLATOR_C1_CONTAINER/,
);
assert.match(workerSource, /export \{ CommentTranslatorC1Container \}/);
assert.match(
  read(containerBoundaryPath),
  /runCommentTranslatorC1ContainerBoundary/,
);
assert.match(
  authoritySource,
  /runtime_readiness_blocker=c1-durable-billing-state-read-disconnected/,
);

for (const relativePath of [readinessPath, contractPath]) {
  const logicalLines = read(relativePath)
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("//")).length;
  assert.ok(logicalLines < 200, `${relativePath} must stay under 200 logical LOC`);
}

console.log(
  "comment_translator_creator_cp1_checkout_runtime_readiness_preflight_contract=pass",
);
