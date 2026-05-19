import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { ThumbnailEditorApp } from "@/components/thumbnail-editor/ThumbnailEditorApp";

export const metadata: Metadata = {
  title: "Thumbnail Editor",
  description: "A Kuro Stream Kit tool for choosing purpose-built presets and replacing text or standee images to assemble VTuber thumbnails."
};

export default function ThumbnailEditorPage() {
  return (
    <PortalShell mode="workspace">
      <ThumbnailEditorApp />
    </PortalShell>
  );
}
