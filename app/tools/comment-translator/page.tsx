import type { Metadata } from "next";
import { CommentTranslatorDock } from "@/components/comment-translator/CommentTranslatorDock";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = {
  title: "Kuro Live Comment Translator",
  description: "A fixture-only Kuro Stream Kit tool shell for reviewing a YouTube-first read-only broadcaster dock."
};

export const dynamic = "force-dynamic";

export default function CommentTranslatorPage() {
  return (
    <PortalShell mode="workspace">
      <CommentTranslatorDock />
    </PortalShell>
  );
}
