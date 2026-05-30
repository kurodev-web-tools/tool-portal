import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { PortalShell } from "@/components/portal/PortalShell";
import { legalDocuments } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Kuro Stream Kit の利用規約。"
};

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <PortalShell>
      <LegalDocumentPage document={legalDocuments.terms} />
    </PortalShell>
  );
}
