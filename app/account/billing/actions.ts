"use server";

import { redirect } from "next/navigation";
import {
  createCommentTranslatorStripeAdapter,
  createCommentTranslatorStripeCheckoutSessionResult,
  createCommentTranslatorStripePortalSessionResult,
  readCommentTranslatorPaidCheckoutConsentInput
} from "@/lib/comment-translator-billing-runtime";
import { readCommentTranslatorPaidRegionFromCloudflareContext } from "@/lib/comment-translator-paid-region-gate";
import { readCommentTranslatorPrivateLaunchAccessForAccountSession } from "@/lib/comment-translator-private-launch-access-gate";
import { authorizeYouTubeOAuthCredentialStatusCaller } from "@/lib/comment-translator-youtube-credential-status-boundary";
import { getAccountSessionState } from "@/lib/supabase/session";
import { assertCommentTranslatorAbuseRequestAllowed } from "@/lib/comment-translator-abuse-rate-limit-runtime";

export async function createCommentTranslatorBillingCheckoutAction(formData: FormData) {
  const accountSession = await getAccountSessionState();
  const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: accountSession.authStatus === "signed-in" ? accountSession.user?.id ?? null : null,
    authUnavailable: accountSession.authStatus === "unavailable"
  });
  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });
  if (launchAccess.status === "blocked") {
    const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization
    });
    if (abuseCheck.status === "blocked") {
      redirect("/account/billing?billing=rate-limit-exceeded");
    }

    redirect("/account/billing?billing=private-launch-gated");
  }

  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-billing-actions",
    action: "billing-checkout",
    callerAuthorization
  });
  if (abuseCheck.status === "blocked") {
    redirect("/account/billing?billing=rate-limit-exceeded");
  }

  const stripeAdapter = createCommentTranslatorStripeAdapter(process.env);
  const result = await createCommentTranslatorStripeCheckoutSessionResult({
    callerAuthorization,
    env: process.env,
    customerEmail: accountSession.user?.email ?? null,
    regionGate: readCommentTranslatorPaidRegionFromCloudflareContext(),
    consent: readCommentTranslatorPaidCheckoutConsentInput(formData),
    abuseRateLimit: {
      rateLimitAlreadyChecked: true
    },
    stripeAdapter
  });

  if (result.status === "redirect-ready") {
    redirect(result.url);
  }

  redirect(`/account/billing?billing=${result.reason}`);
}

export async function createCommentTranslatorBillingPortalAction() {
  const accountSession = await getAccountSessionState();
  const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: accountSession.authStatus === "signed-in" ? accountSession.user?.id ?? null : null,
    authUnavailable: accountSession.authStatus === "unavailable"
  });
  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });
  if (launchAccess.status === "blocked") {
    const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization
    });
    if (abuseCheck.status === "blocked") {
      redirect("/account/billing?billing=rate-limit-exceeded");
    }

    redirect("/account/billing?billing=private-launch-gated");
  }

  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-billing-actions",
    action: "billing-portal",
    callerAuthorization
  });
  if (abuseCheck.status === "blocked") {
    redirect("/account/billing?billing=rate-limit-exceeded");
  }

  const result = await createCommentTranslatorStripePortalSessionResult({
    callerAuthorization,
    env: process.env,
    abuseRateLimit: {
      rateLimitAlreadyChecked: true
    },
    stripeAdapter: createCommentTranslatorStripeAdapter(process.env)
  });

  if (result.status === "redirect-ready") {
    redirect(result.url);
  }

  redirect(`/account/billing?billing=${result.reason}`);
}
