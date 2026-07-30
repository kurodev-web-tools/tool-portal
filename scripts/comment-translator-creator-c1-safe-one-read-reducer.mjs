export async function runCommentTranslatorC1SafeOneRead(request) {
  const blocked = (blocker) => ({
    executionStatus: "blocked",
    blocker,
  });
  const expectedKeys = [
    "approvalUnit",
    "authorizationStatus",
    "billingState",
    "bindingAcquisitionCount",
    "bindingStatus",
    "checkoutInvocationCount",
    "childBufferZeroFillCount",
    "childConstructionAttemptCount",
    "childExitCodeObserved",
    "childReadAttemptCount",
    "containerInvocationCount",
    "containerReachabilityStatus",
    "executionStatus",
    "parentBufferZeroFillCount",
    "parentExitCodeObserved",
    "resultStatus",
    "reviewedBase",
    "stripeSdkInitializationCount",
    "targetLabel",
    "terminationStatus",
  ].sort();
  const allowedTerminationStatuses = new Set([
    "aborted",
    "container-boundary-unavailable",
    "invalid-boundary",
    "invalid-result",
    "late-success-suppressed",
    "parent-and-child-exited-zero",
    "process-failed",
    "repeat-suppressed",
    "runtime-error",
    "termination-unobserved",
  ]);

  let response;
  try {
    response = await request(
      "/api/comment-translator/creator-paid/c1-production-read-proof/",
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { Accept: "application/json" },
      },
    );
  } catch {
    return blocked("request-unavailable");
  }

  if (
    response.status !== 200
    || response.redirected
    || response.headers.get("Cache-Control") !== "no-store"
    || response.headers.get("X-Content-Type-Options") !== "nosniff"
    || !response.headers.get("Content-Type")?.startsWith("application/json")
  ) {
    return blocked("sanitized-output-rejected");
  }

  let value;
  try {
    const text = await response.text();
    if (text.length > 4096) return blocked("sanitized-output-rejected");
    value = JSON.parse(text);
  } catch {
    return blocked("sanitized-output-rejected");
  }
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys)
    || value.approvalUnit
      !== "CP1-A-C1-PRODUCTION-ACTIVATION-READ-PROOF-RETRY-1"
    || value.reviewedBase
      !== "918ba6b3646baa40965a6b22f475159b7dd7e90f"
    || value.targetLabel !== "production-worker"
    || value.authorizationStatus !== "authorized"
    || value.bindingStatus !== "available"
    || !["reachable", "unavailable"].includes(
      value.containerReachabilityStatus,
    )
    || !["pass", "fail-closed"].includes(value.executionStatus)
    || !["available", "missing", "unavailable"].includes(value.resultStatus)
    || !allowedTerminationStatuses.has(value.terminationStatus)
    || value.bindingAcquisitionCount !== 1
    || value.containerInvocationCount !== 1
    || ![0, 3].includes(value.parentBufferZeroFillCount)
    || ![0, 3].includes(value.childBufferZeroFillCount)
    || ![0, 1].includes(value.childConstructionAttemptCount)
    || ![0, 1].includes(value.childReadAttemptCount)
    || value.checkoutInvocationCount !== 0
    || value.stripeSdkInitializationCount !== 0
    || typeof value.parentExitCodeObserved !== "boolean"
    || typeof value.childExitCodeObserved !== "boolean"
  ) {
    return blocked("sanitized-output-rejected");
  }
  if (
    (value.resultStatus === "available"
      && !["paid-active", "paid-inactive"].includes(value.billingState))
    || (value.resultStatus !== "available" && value.billingState !== null)
    || (value.executionStatus === "pass"
      && (
        value.containerReachabilityStatus !== "reachable"
        || value.resultStatus === "unavailable"
        || value.parentExitCodeObserved !== true
        || value.childExitCodeObserved !== true
        || value.parentBufferZeroFillCount !== 3
        || value.childBufferZeroFillCount !== 3
        || value.childConstructionAttemptCount !== 1
        || value.childReadAttemptCount !== 1
      ))
  ) {
    return blocked("sanitized-output-rejected");
  }
  return Object.freeze(value);
}
