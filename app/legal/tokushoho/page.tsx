import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { PortalShell } from "@/components/portal/PortalShell";
import { legalDocuments } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Legal Information",
  description: "Kuro Stream Kit の特定商取引法に基づく表記。"
};

export const dynamic = "force-dynamic";

export default function TokushohoPage() {
  return (
    <PortalShell>
      <LegalDocumentPage document={legalDocuments.tokushoho} />
    </PortalShell>
  );
}
