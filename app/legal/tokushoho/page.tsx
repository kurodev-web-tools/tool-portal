import type { Metadata } from "next";
import { LocalizedTokushohoDocumentPage } from "@/components/legal/LocalizedTokushohoDocumentPage";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = {
  title: "Legal Information",
  description: "Kuro Stream Kit の特定商取引法に基づく表記。",
  alternates: {
    canonical: "/legal/tokushoho"
  }
};

export const dynamic = "force-dynamic";

export default function TokushohoPage() {
  return (
    <PortalShell>
      <LocalizedTokushohoDocumentPage />
    </PortalShell>
  );
}
