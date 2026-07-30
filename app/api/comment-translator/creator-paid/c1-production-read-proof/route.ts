import { NextResponse } from "next/server";
import {
  createCommentTranslatorBillingUserReference,
  isCommentTranslatorCreatorClosedBetaBillingActiveForCaller,
} from "@/lib/comment-translator-billing-runtime";
import { readCommentTranslatorC1ProductionBillingProof } from "@/lib/comment-translator-c1-production-read";
import { authorizeYouTubeOAuthCredentialStatusCaller } from "@/lib/comment-translator-youtube-credential-status-boundary";
import { getAccountSessionState } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

const approvalUnit = "CP1-A-C1-PRODUCTION-ACTIVATION-READ-PROOF-1";
const reviewedBase = "b0fe19823e260d768749604affa57cf30d3c7329";
const attemptKey =
  "b48b861afa50f8eefdf119afff68d3b01b48f439b0d7664f77f3cc2e5fff182e";

export async function POST() {
  const accountSession = await getAccountSessionState();
  const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId:
      accountSession.authStatus === "signed-in"
        ? (accountSession.user?.id ?? null)
        : null,
    authUnavailable: accountSession.authStatus === "unavailable",
  });
  const billingUserReferenceId =
    createCommentTranslatorBillingUserReference(callerAuthorization);
  const isActive =
    billingUserReferenceId !== null
    && isCommentTranslatorCreatorClosedBetaBillingActiveForCaller({
      callerAuthorization,
      env: process.env,
    });

  const proof = isActive
    ? await readCommentTranslatorC1ProductionBillingProof({
        billingUserReferenceId,
        attemptKey,
      })
    : blockedProof();

  return NextResponse.json(
    {
      approvalUnit,
      reviewedBase,
      targetLabel: "production-worker",
      authorizationStatus: isActive ? "authorized" : "unavailable",
      ...proof,
      checkoutInvocationCount: 0,
      stripeSdkInitializationCount: 0,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function blockedProof() {
  return {
    bindingStatus: "unavailable",
    containerReachabilityStatus: "unavailable",
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    billingState: null,
    terminationStatus: "authorization-unavailable",
    bindingAcquisitionCount: 0,
    containerInvocationCount: 0,
    parentExitCodeObserved: false,
    childExitCodeObserved: false,
    parentBufferZeroFillCount: 0,
    childBufferZeroFillCount: 0,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
  } as const;
}
