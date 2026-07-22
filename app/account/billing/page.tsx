import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  createCommentTranslatorBillingCheckoutAction,
  createCommentTranslatorBillingPortalAction
} from "@/app/account/billing/actions";
import { AccountBillingShell } from "@/components/account/AccountBillingShell";
import { CommentTranslatorPrivateLaunchUnavailable } from "@/components/comment-translator/CommentTranslatorPrivateLaunchUnavailable";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  createCommentTranslatorBillingBrowserSafeViewModel,
  readCommentTranslatorBillingEntitlementSnapshot
} from "@/lib/comment-translator-billing-runtime";
import { readCommentTranslatorPrivateLaunchAccessForAccountSession } from "@/lib/comment-translator-private-launch-access-gate";
import { authorizeYouTubeOAuthCredentialStatusCaller } from "@/lib/comment-translator-youtube-credential-status-boundary";
import { isRecoverySessionPending } from "@/lib/supabase/recovery-session";
import { createBrowserSafeAccountSessionViewModel, getAccountSessionState } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "Comment Translator billing",
  description: "Manage Free and Paid plan status for Kuro Live Comment Translator."
};

export const dynamic = "force-dynamic";

type AccountBillingPageProps = {
  searchParams?: Promise<{
    billing?: string;
  }>;
};

export default async function AccountBillingPage({ searchParams }: AccountBillingPageProps) {
  const [params, accountSession, recoveryPending] = await Promise.all([
    searchParams,
    getAccountSessionState(),
    isRecoverySessionPending()
  ]);

  if (accountSession.authStatus === "signed-out") {
    redirect("/login?next=/account/billing");
  }

  if (recoveryPending) {
    redirect("/account/security?auth=recovery-pending");
  }

  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });

  if (launchAccess.status === "blocked") {
    return (
      <PortalShell>
        <CommentTranslatorPrivateLaunchUnavailable surface="billing" access={launchAccess} />
      </PortalShell>
    );
  }

  const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: accountSession.authStatus === "signed-in" ? accountSession.user?.id ?? null : null,
    authUnavailable: accountSession.authStatus === "unavailable"
  });
  const billingSnapshot = await readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
  const billingView = createCommentTranslatorBillingBrowserSafeViewModel({
    snapshot: billingSnapshot,
    env: process.env
  });
  const browserSafeAccountSession = createBrowserSafeAccountSessionViewModel(accountSession);

  return (
    <PortalShell>
      <AccountBillingShell
        accountStatus={browserSafeAccountSession}
        billingMessage={params?.billing ?? null}
        billing={billingView}
        createCheckoutAction={createCommentTranslatorBillingCheckoutAction}
        createPortalAction={createCommentTranslatorBillingPortalAction}
      />
    </PortalShell>
  );
}
