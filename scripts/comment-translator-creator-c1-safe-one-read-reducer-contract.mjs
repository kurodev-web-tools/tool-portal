import assert from "node:assert/strict";
import {
  runCommentTranslatorC1SafeOneRead,
} from "./comment-translator-creator-c1-safe-one-read-reducer.mjs";

const validBody = {
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
};

let requestCount = 0;
const pass = await runCommentTranslatorC1SafeOneRead(async (path, init) => {
  requestCount += 1;
  assert.equal(
    path,
    "/api/comment-translator/creator-paid/c1-production-read-proof/",
  );
  assert.deepEqual(init, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: { Accept: "application/json" },
  });
  return response(validBody);
});
assert.deepEqual(pass, validBody);
assert.equal(requestCount, 1);

for (const fixture of [
  response({ ...validBody, privateValue: "forbidden" }),
  response({ ...validBody, reviewedRevision: "unexpected" }),
  response({ ...validBody, childReadAttemptCount: 2 }),
  response(validBody, { redirected: true }),
]) {
  const blocked = await runCommentTranslatorC1SafeOneRead(async () => fixture);
  assert.deepEqual(blocked, {
    executionStatus: "blocked",
    blocker: "sanitized-output-rejected",
  });
}

let failureRequestCount = 0;
const unavailable = await runCommentTranslatorC1SafeOneRead(async () => {
  failureRequestCount += 1;
  throw new TypeError("synthetic-network-error");
});
assert.deepEqual(unavailable, {
  executionStatus: "blocked",
  blocker: "request-unavailable",
});
assert.equal(failureRequestCount, 1);

process.stdout.write(
  "comment_translator_creator_c1_safe_one_read_reducer_contract=pass\n",
);

function response(body, override = {}) {
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
  if (override.redirected !== true) return response;
  return {
    status: response.status,
    redirected: true,
    headers: response.headers,
    text: () => response.text(),
  };
}
