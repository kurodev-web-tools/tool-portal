import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { PortalShell } from "@/components/portal/PortalShell";
import { legalDocuments } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Kuro Stream Kit のプライバシーポリシー。"
};

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <PortalShell>
      <LegalDocumentPage document={legalDocuments.privacy} />
    </PortalShell>
  );
}
