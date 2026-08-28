import type { Metadata } from "next";
import { PortalHome } from "@/components/portal/PortalHome";
import { PortalShell } from "@/components/portal/PortalShell";
import { portalMetadata } from "@/lib/portal-metadata";
import { createBrowserSafeAccountSessionViewModel, getAccountSessionState } from "@/lib/supabase/session";

const homeMetadata = portalMetadata.en.home;

export const metadata: Metadata = {
  title: homeMetadata.title,
  description: homeMetadata.description,
  alternates: {
    canonical: "/"
  }
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const accountStatus = await getAccountSessionState();
  const browserSafeAccountStatus = createBrowserSafeAccountSessionViewModel(accountStatus);

  return (
    <PortalShell accountStatus={accountStatus}>
      <PortalHome accountStatus={browserSafeAccountStatus} />
    </PortalShell>
  );
}
