import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import {
  applyCommentTranslatorCreatorSignedWebhookCommand,
  commentTranslatorCreatorBillingActivationPolicy,
  createCommentTranslatorCreatorProductionSignedWebhookDependencies
} from "@/lib/comment-translator-creator-billing-runtime";
import {
  assertCommentTranslatorAbuseRequestAllowed,
  readCommentTranslatorRequestIp
} from "@/lib/comment-translator-abuse-rate-limit-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "/api/comment-translator/billing/webhook",
    action: "billing-webhook",
    callerAuthorization: { status: "unauthenticated" },
    requestIp: readCommentTranslatorRequestIp(request.headers)
  });
  if (abuseCheck.status === "blocked") {
    return NextResponse.json(
      {
        status: "rejected",
        reason: abuseCheck.reason,
        retryAfterSeconds: abuseCheck.retryAfterSeconds,
        browserReadableOutput: abuseCheck.browserReadableOutput
      },
      { status: 429 }
    );
  }
  const productionDependencies = createCommentTranslatorCreatorProductionSignedWebhookDependencies();
  const rawBody =
    productionDependencies.activationPolicy.status === "closed" ? "" : await request.text();
  const result = await applyCommentTranslatorCreatorSignedWebhookCommand({
    rawBody,
    signature: request.headers.get("stripe-signature"),
    dependencies: {
      ...productionDependencies,
      activationPolicy: commentTranslatorCreatorBillingActivationPolicy
    }
  });
  const retryable = "retryable" in result && result.retryable;
  const responseStatus = retryable ? 503 : result.status === "rejected" ? 400 : 200;

  return NextResponse.json(
    {
      status: result.status,
      reason: "reason" in result ? result.reason : "processed",
      retryable
    },
    { status: responseStatus }
  );
}
