import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const asModule = (source) =>
  `data:text/javascript,${encodeURIComponent(source)}`;

globalThis.__c1ProofFixture = {
  active: true,
  proofInvocationCount: 0,
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return {
        shortCircuit: true,
        url: asModule(`
          export const NextResponse = {
            json(body, init) {
              return {
                body,
                status: init?.status ?? 200,
                headers: new Headers(init?.headers)
              };
            }
          };
        `),
      };
    }
    if (specifier === "@/lib/comment-translator-billing-runtime") {
      return {
        shortCircuit: true,
        url: asModule(`
          export function createCommentTranslatorBillingUserReference() {
            return "ctbill_${"a".repeat(24)}";
          }
          export function isCommentTranslatorCreatorClosedBetaBillingActiveForCaller() {
            return globalThis.__c1ProofFixture.active;
          }
        `),
      };
    }
    if (specifier === "@/lib/comment-translator-c1-production-read") {
      return {
        shortCircuit: true,
        url: asModule(`
          export async function readCommentTranslatorC1ProductionBillingProof(input) {
            globalThis.__c1ProofFixture.proofInvocationCount += 1;
            globalThis.__c1ProofFixture.attemptKey = input.attemptKey;
            return {
              bindingStatus: "available",
              containerReachabilityStatus: "reachable",
              executionStatus: "pass",
              resultStatus: "missing",
              billingState: null,
              terminationStatus: "parent-and-child-exited-zero",
              bindingAcquisitionCount: 1,
              containerInvocationCount: 1,
              parentExitCodeObserved: true,
              childExitCodeObserved: true,
              parentBufferZeroFillCount: 3,
              childBufferZeroFillCount: 3,
              childConstructionAttemptCount: 1,
              childReadAttemptCount: 1
            };
          }
        `),
      };
    }
    if (
      specifier
      === "@/lib/comment-translator-youtube-credential-status-boundary"
    ) {
      return {
        shortCircuit: true,
        url: asModule(`
          export function authorizeYouTubeOAuthCredentialStatusCaller() {
            return { status: "authorized", ownerUserId: "synthetic-owner" };
          }
        `),
      };
    }
    if (specifier === "@/lib/supabase/session") {
      return {
        shortCircuit: true,
        url: asModule(`
          export async function getAccountSessionState() {
            return {
              authStatus: "signed-in",
              user: { id: "synthetic-owner" }
            };
          }
        `),
      };
    }
    return nextResolve(specifier, context);
  },
});

const routeUrl = new URL(
  "../app/api/comment-translator/creator-paid/c1-production-read-proof/route.ts",
  import.meta.url,
);
const route = await import(routeUrl.href);
assert.equal(typeof route.POST, "function");
assert.equal(route.GET, undefined);

const active = await route.POST();
assert.equal(active.status, 200);
assert.equal(active.headers.get("Cache-Control"), "no-store");
assert.equal(active.headers.get("X-Content-Type-Options"), "nosniff");
assert.deepEqual(active.body, {
  approvalUnit: "CP1-A-C1-PRODUCTION-ACTIVATION-READ-PROOF-RETRY-1",
  reviewedBase: "918ba6b3646baa40965a6b22f475159b7dd7e90f",
  targetLabel: "production-worker",
  authorizationStatus: "authorized",
  bindingStatus: "available",
  containerReachabilityStatus: "reachable",
  executionStatus: "pass",
  resultStatus: "missing",
  billingState: null,
  terminationStatus: "parent-and-child-exited-zero",
  bindingAcquisitionCount: 1,
  containerInvocationCount: 1,
  parentExitCodeObserved: true,
  childExitCodeObserved: true,
  parentBufferZeroFillCount: 3,
  childBufferZeroFillCount: 3,
  childConstructionAttemptCount: 1,
  childReadAttemptCount: 1,
  checkoutInvocationCount: 0,
  stripeSdkInitializationCount: 0,
});
assert.equal(globalThis.__c1ProofFixture.proofInvocationCount, 1);
assert.equal(
  globalThis.__c1ProofFixture.attemptKey,
  "b48b861afa50f8eefdf119afff68d3b01b48f439b0d7664f77f3cc2e5fff182e",
);

globalThis.__c1ProofFixture.active = false;
const blocked = await route.POST();
assert.equal(blocked.body.authorizationStatus, "unavailable");
assert.equal(blocked.body.resultStatus, "unavailable");
assert.equal(blocked.body.containerInvocationCount, 0);
assert.equal(blocked.body.checkoutInvocationCount, 0);
assert.equal(globalThis.__c1ProofFixture.proofInvocationCount, 1);

process.stdout.write(
  "comment_translator_creator_c1_production_read_proof_route_contract=pass\n",
);
