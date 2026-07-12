import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { saveLocaleThemePreferenceAction, signOutAction } from "@/app/account/actions";
import { AccountPreferencesShell } from "@/components/account/AccountPreferencesShell";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  createCommentTranslatorBillingBrowserSafeViewModel,
  readCommentTranslatorBillingEntitlementSnapshot
} from "@/lib/comment-translator-billing-runtime";
import { readYouTubeAccountIntegrationStatusViewModel } from "@/lib/comment-translator-youtube-account-integration-status";
import { authorizeYouTubeOAuthCredentialStatusCaller } from "@/lib/comment-translator-youtube-credential-status-boundary";
import { portalMetadata } from "@/lib/portal-metadata";
import { isRecoverySessionPending } from "@/lib/supabase/recovery-session";
import { createBrowserSafeAccountSessionViewModel, getAccountSessionState } from "@/lib/supabase/session";

const accountMetadata = portalMetadata.en.account;

export const metadata: Metadata = {
  title: accountMetadata.title,
  description: accountMetadata.description
};

type AccountPageProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [authMessage, accountSession, recoveryPending] = await Promise.all([
    (await searchParams)?.auth ?? null,
    getAccountSessionState(),
    isRecoverySessionPending()
  ]);

  if (accountSession.authStatus === "signed-out") {
    redirect("/login?next=/account");
  }

  if (recoveryPending) {
    redirect("/account/security?auth=recovery-pending");
  }

  const [youtubeIntegration, billing] = await Promise.all([
    readYouTubeAccountIntegrationStatusViewModel({ accountSession }),
    Promise.resolve().then(() => {
      const callerAuthorization = authorizeYouTubeOAuthCredentialStatusCaller({
        callerUserId: accountSession.authStatus === "signed-in" ? accountSession.user?.id ?? null : null,
        authUnavailable: accountSession.authStatus === "unavailable"
      });
      const billingSnapshot = readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
      return createCommentTranslatorBillingBrowserSafeViewModel({
        snapshot: billingSnapshot,
        env: process.env
      });
    })
  ]);
  const browserSafeAccountSession = createBrowserSafeAccountSessionViewModel(accountSession);

  return (
    <PortalShell>
      <AccountPreferencesShell
        authMessage={authMessage}
        authStatus={browserSafeAccountSession}
        youtubeIntegration={youtubeIntegration}
        billing={billing}
        saveLocaleThemePreferenceAction={saveLocaleThemePreferenceAction}
        signOutAction={signOutAction}
      />
    </PortalShell>
  );
}
