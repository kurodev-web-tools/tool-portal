"use server";

import "server-only";

import { redirect } from "next/navigation";
import {
  commentTranslatorCreatorBillingActivationPolicy,
  createCommentTranslatorCreatorCheckoutCommand,
  createCommentTranslatorCreatorPortalCommand,
  createCommentTranslatorCreatorProductionCheckoutDependencies,
  createCommentTranslatorCreatorProductionPortalDependencies,
  type CommentTranslatorCreatorBillingCaller
} from "@/lib/comment-translator-creator-billing-runtime";
import { assertCommentTranslatorAbuseRequestAllowed } from "@/lib/comment-translator-abuse-rate-limit-runtime";
import { readCommentTranslatorPrivateLaunchAccessForAccountSession } from "@/lib/comment-translator-private-launch-access-gate";
import { authorizeYouTubeOAuthCredentialStatusCaller } from "@/lib/comment-translator-youtube-credential-status-boundary";
import { getAccountSessionState } from "@/lib/supabase/session";

export async function createCommentTranslatorBillingCheckoutAction() {
  const context = await readCommentTranslatorCreatorBillingActionContext();
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-billing-actions",
    action: "billing-checkout",
    callerAuthorization: context.callerAuthorization
  });
  if (abuseCheck.status === "blocked") redirect("/account/billing?billing=rate-limit-exceeded");
  if (context.launchAccess.status === "blocked") {
    const directCallDenialCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization: context.callerAuthorization
    });
    redirect(
      directCallDenialCheck.status === "blocked"
        ? "/account/billing?billing=rate-limit-exceeded"
        : "/account/billing?billing=private-launch-gated"
    );
  }
  const result = await createCommentTranslatorCreatorCheckoutCommand({
    caller: createCommentTranslatorCreatorBillingActionCaller(context),
    dependencies: {
      ...createCommentTranslatorCreatorProductionCheckoutDependencies(),
      activationPolicy: commentTranslatorCreatorBillingActivationPolicy
    }
  });

  if (result.status === "redirect-ready") {
    redirect(result.redirectUrl);
  }
  redirect(`/account/billing?billing=${result.reason}`);
}

export async function createCommentTranslatorBillingPortalAction() {
  const context = await readCommentTranslatorCreatorBillingActionContext();
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-billing-actions",
    action: "billing-portal",
    callerAuthorization: context.callerAuthorization
  });
  if (abuseCheck.status === "blocked") redirect("/account/billing?billing=rate-limit-exceeded");
  if (context.launchAccess.status === "blocked") {
    const directCallDenialCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization: context.callerAuthorization
    });
    redirect(
      directCallDenialCheck.status === "blocked"
        ? "/account/billing?billing=rate-limit-exceeded"
        : "/account/billing?billing=private-launch-gated"
    );
  }
  const result = await createCommentTranslatorCreatorPortalCommand({
    caller: createCommentTranslatorCreatorBillingActionCaller(context),
    dependencies: {
      ...createCommentTranslatorCreatorProductionPortalDependencies(),
      activationPolicy: commentTranslatorCreatorBillingActivationPolicy
    }
  });

  if (result.status === "redirect-ready") {
    redirect(result.redirectUrl);
  }
  redirect(`/account/billing?billing=${result.reason}`);
}

async function readCommentTranslatorCreatorBillingActionContext() {
  const accountSession = await getAccountSessionState();
  const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: accountSession.authStatus === "signed-in" ? accountSession.user?.id ?? null : null,
    authUnavailable: accountSession.authStatus === "unavailable"
  });
  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });

  return { callerAuthorization, launchAccess };
}

function createCommentTranslatorCreatorBillingActionCaller(
  context: Awaited<ReturnType<typeof readCommentTranslatorCreatorBillingActionContext>>
): CommentTranslatorCreatorBillingCaller {
  if (context.callerAuthorization.status !== "authorized") {
    return context.callerAuthorization.status === "unavailable"
      ? { status: "blocked", reason: "auth-unavailable" }
      : { status: "unauthenticated" };
  }
  if (context.launchAccess.status !== "allowed") {
    return { status: "blocked", reason: "private-launch-gated" };
  }
  return {
    status: "allowed",
    caller: {
      status: "authorized",
      ownerUserId: context.callerAuthorization.ownerUserId
    }
  };
}
