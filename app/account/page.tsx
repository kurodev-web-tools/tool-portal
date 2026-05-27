import type { Metadata } from "next";
import { AccountPreferencesShell } from "@/components/account/AccountPreferencesShell";
import { PortalShell } from "@/components/portal/PortalShell";
import { portalMetadata } from "@/lib/portal-metadata";

const accountMetadata = portalMetadata.en.account;

export const metadata: Metadata = {
  title: accountMetadata.title,
  description: accountMetadata.description
};

export default function AccountPage() {
  return (
    <PortalShell>
      <AccountPreferencesShell />
    </PortalShell>
  );
}
