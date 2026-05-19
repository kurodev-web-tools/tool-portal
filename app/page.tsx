import type { Metadata } from "next";
import { PortalHome } from "@/components/portal/PortalHome";
import { PortalShell } from "@/components/portal/PortalShell";
import { portalMetadata } from "@/lib/portal-metadata";

const homeMetadata = portalMetadata.en.home;

export const metadata: Metadata = {
  title: homeMetadata.title,
  description: homeMetadata.description
};

export default function Home() {
  return (
    <PortalShell>
      <PortalHome />
    </PortalShell>
  );
}
