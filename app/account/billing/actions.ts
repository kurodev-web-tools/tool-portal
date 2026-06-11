"use server";

import { redirect } from "next/navigation";
import {
  createCommentTranslatorStripeAdapter,
  createCommentTranslatorStripeCheckoutSessionResult,
  createCommentTranslatorStripePortalSessionResult
} from "@/lib/comment-translator-billing-runtime";
import { readCommentTranslatorPrivateLaunchAccessForAccountSession } from "@/lib/comment-translator-private-launch-access-gate";
import { authorizeYouTubeOAuthCredentialStatusCaller } from "@/lib/comment-translator-youtube-credential-status-boundary";
import { getAccountSessionState } from "@/lib/supabase/session";

export async function createCommentTranslatorBillingCheckoutAction() {
  const accountSession = await getAccountSessionState();
  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });
  if (launchAccess.status === "blocked") {
    redirect("/account/billing?billing=private-launch-gated");
  }

  const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: accountSession.authStatus === "signed-in" ? accountSession.user?.id ?? null : null,
    authUnavailable: accountSession.authStatus === "unavailable"
  });
  const result = await createCommentTranslatorStripeCheckoutSessionResult({
    callerAuthorization,
    env: process.env,
    customerEmail: accountSession.user?.email ?? null,
    stripeAdapter: {
      createCheckoutSession: (params) => createCommentTranslatorStripeAdapter().createCheckoutSession(params)
    }
  });

  if (result.status === "redirect-ready") {
    redirect(result.url);
  }

  redirect(`/account/billing?billing=${result.reason}`);
}

export async function createCommentTranslatorBillingPortalAction() {
  const accountSession = await getAccountSessionState();
  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });
  if (launchAccess.status === "blocked") {
    redirect("/account/billing?billing=private-launch-gated");
  }

  const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: accountSession.authStatus === "signed-in" ? accountSession.user?.id ?? null : null,
    authUnavailable: accountSession.authStatus === "unavailable"
  });
  const result = await createCommentTranslatorStripePortalSessionResult({
    callerAuthorization,
    env: process.env,
    stripeAdapter: {
      createPortalSession: (params) => createCommentTranslatorStripeAdapter().createPortalSession(params)
    }
  });

  if (result.status === "redirect-ready") {
    redirect(result.url);
  }

  redirect(`/account/billing?billing=${result.reason}`);
}
