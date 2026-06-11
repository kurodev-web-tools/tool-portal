import { NextResponse, type NextRequest } from "next/server";
import {
  createCommentTranslatorStripeWebhookVerifier,
  readCommentTranslatorStripeWebhookResult
} from "@/lib/comment-translator-billing-runtime";

export const dynamic = "force-dynamic";

const stripeWebhookSecretEnvReference = "STRIPE_WEBHOOK_SECRET";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const result = await readCommentTranslatorStripeWebhookResult({
    payload,
    signature,
    env: {
      ...process.env,
      STRIPE_WEBHOOK_SECRET: process.env[stripeWebhookSecretEnvReference]
    },
    verifier: {
      constructEvent: (payloadToVerify, signatureToVerify, webhookSecret) =>
        createCommentTranslatorStripeWebhookVerifier().constructEvent(payloadToVerify, signatureToVerify, webhookSecret)
    }
  });

  const status = result.status === "rejected" ? 400 : 200;
  return NextResponse.json(result, { status });
}
