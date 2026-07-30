import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const productionReadPath = path.join(
  root,
  "lib/comment-translator-c1-production-read.ts",
);
const routePath = path.join(
  root,
  "app/api/comment-translator/creator-paid/c1-production-read-proof/route.ts",
);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export{}" };
    }
    if (specifier === "@opennextjs/cloudflare") {
      return {
        shortCircuit: true,
        url:
          "data:text/javascript,"
          + "export function getCloudflareContext(){throw new Error()}",
      };
    }
    if (specifier === "./comment-translator-c1-container-boundary") {
      return {
        shortCircuit: true,
        url: pathToFileURL(
          path.join(root, "lib/comment-translator-c1-container-boundary.ts"),
        ).href,
      };
    }
    return nextResolve(specifier, context);
  },
});

const productionRead = await import(pathToFileURL(productionReadPath).href);
const environment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role",
};
const attemptKey =
  "b48b861afa50f8eefdf119afff68d3b01b48f439b0d7664f77f3cc2e5fff182e";
const settled = new Set();
let bindingCount = 0;
let invocationCount = 0;
const namespace = {
  getByName(name) {
    bindingCount += 1;
    assert.equal(name, "creator-billing-entitlement-read-v1");
    return {
      async runAttempt(candidateAttemptKey, input) {
        invocationCount += 1;
        assert.equal(candidateAttemptKey, attemptKey);
        assert.ok((await new Response(input).arrayBuffer()).byteLength > 12);
        if (settled.has(candidateAttemptKey)) {
          return unavailable("repeat-suppressed");
        }
        settled.add(candidateAttemptKey);
        return {
          executionStatus: "pass",
          resultStatus: "available",
          billingState: "paid-active",
          terminationStatus: "parent-and-child-exited-zero",
          parentExitCodeObserved: true,
          childExitCodeObserved: true,
          parentBufferZeroFillCount: 3,
          childBufferZeroFillCount: 3,
          childConstructionAttemptCount: 1,
          childReadAttemptCount: 1,
        };
      },
    };
  },
};

const first =
  await productionRead.readCommentTranslatorC1ProductionBillingProof({
    billingUserReferenceId: `ctbill_${"a".repeat(24)}`,
    attemptKey,
    environment,
    containerNamespace: namespace,
  });
assert.deepEqual(first, {
  bindingStatus: "available",
  containerReachabilityStatus: "reachable",
  executionStatus: "pass",
  resultStatus: "available",
  billingState: "paid-active",
  terminationStatus: "parent-and-child-exited-zero",
  bindingAcquisitionCount: 1,
  containerInvocationCount: 1,
  parentExitCodeObserved: true,
  childExitCodeObserved: true,
  parentBufferZeroFillCount: 3,
  childBufferZeroFillCount: 3,
  childConstructionAttemptCount: 1,
  childReadAttemptCount: 1,
});

const repeat =
  await productionRead.readCommentTranslatorC1ProductionBillingProof({
    billingUserReferenceId: `ctbill_${"a".repeat(24)}`,
    attemptKey,
    environment,
    containerNamespace: namespace,
  });
assert.equal(repeat.resultStatus, "unavailable");
assert.equal(repeat.terminationStatus, "repeat-suppressed");
assert.equal(repeat.childReadAttemptCount, 0);

const missingBinding =
  await productionRead.readCommentTranslatorC1ProductionBillingProof({
    billingUserReferenceId: `ctbill_${"b".repeat(24)}`,
    attemptKey: "c".repeat(64),
    environment,
    containerNamespace: null,
  });
assert.deepEqual(missingBinding, {
  bindingStatus: "unavailable",
  containerReachabilityStatus: "unavailable",
  executionStatus: "fail-closed",
  resultStatus: "unavailable",
  billingState: null,
  terminationStatus: "binding-unavailable",
  bindingAcquisitionCount: 0,
  containerInvocationCount: 0,
  parentExitCodeObserved: false,
  childExitCodeObserved: false,
  parentBufferZeroFillCount: 0,
  childBufferZeroFillCount: 0,
  childConstructionAttemptCount: 0,
  childReadAttemptCount: 0,
});
assert.deepEqual({ bindingCount, invocationCount }, {
  bindingCount: 2,
  invocationCount: 2,
});

assert.equal(fs.existsSync(routePath), true, "the POST-only proof route exists");
const routeSource = fs.readFileSync(routePath, "utf8");
assert.match(routeSource, /export\s+async\s+function\s+POST\s*\(/);
assert.doesNotMatch(routeSource, /export\s+async\s+function\s+GET\s*\(/);
assert.match(routeSource, /isCommentTranslatorCreatorClosedBetaBillingActiveForCaller/);
assert.match(routeSource, /createCommentTranslatorBillingUserReference/);
assert.match(routeSource, /918ba6b3646baa40965a6b22f475159b7dd7e90f/);
assert.match(routeSource, new RegExp(attemptKey));
assert.doesNotMatch(
  routeSource,
  /\b(fetch|console\.|redirect|Stripe|createCheckoutSession|createPortalSession)\b/,
);

process.stdout.write(
  "comment_translator_creator_c1_production_activation_read_proof_contract=pass\n",
);

function unavailable(terminationStatus) {
  return {
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    billingState: null,
    terminationStatus,
    parentExitCodeObserved: false,
    childExitCodeObserved: false,
    parentBufferZeroFillCount: 0,
    childBufferZeroFillCount: 0,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
  };
}
