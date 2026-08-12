import { NextResponse, type NextRequest } from "next/server";
import {
  createCommentTranslatorStripeWebhookVerifier,
  createCommentTranslatorStripeCurrentObjectReader,
  getCommentTranslatorStripeWebhookHttpStatus,
  readCommentTranslatorStripeWebhookResult
} from "@/lib/comment-translator-billing-runtime";
import { createTrustedCommentTranslatorPaidEntitlementStore } from "@/lib/comment-translator-paid-entitlement-store";
import {
  assertCommentTranslatorAbuseRequestAllowed,
  readCommentTranslatorRequestIp
} from "@/lib/comment-translator-abuse-rate-limit-runtime";

export const dynamic = "force-dynamic";

const stripeWebhookSecretEnvReference = "STRIPE_WEBHOOK_SECRET";

export async function POST(request: NextRequest) {
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "/api/comment-translator/billing/webhook",
    action: "billing-webhook",
    callerAuthorization: {
      status: "unauthenticated"
    },
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

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const env = {
    ...process.env,
    STRIPE_WEBHOOK_SECRET: process.env[stripeWebhookSecretEnvReference]
  };
  const storeResult = createTrustedCommentTranslatorPaidEntitlementStore({ env });
  const result = await readCommentTranslatorStripeWebhookResult({
    payload,
    signature,
    env,
    verifier: createCommentTranslatorStripeWebhookVerifier(env),
    currentObjectReader: createCommentTranslatorStripeCurrentObjectReader(env),
    store: storeResult.status === "ready" ? storeResult.store : undefined,
    projectionEnabled: true,
    nowIso: new Date().toISOString()
  });

  const status = getCommentTranslatorStripeWebhookHttpStatus(result);
  return NextResponse.json(result, { status });
}
