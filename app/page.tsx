import type { Metadata } from "next";
import { PortalHome } from "@/components/portal/PortalHome";
import { PortalShell } from "@/components/portal/PortalShell";
import { portalMetadata } from "@/lib/portal-metadata";
import { getAccountSessionState } from "@/lib/supabase/session";

const homeMetadata = portalMetadata.en.home;

export const metadata: Metadata = {
  title: homeMetadata.title,
  description: homeMetadata.description
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const accountStatus = await getAccountSessionState();

  return (
    <PortalShell accountStatus={accountStatus}>
      <PortalHome accountStatus={accountStatus} />
    </PortalShell>
  );
}
