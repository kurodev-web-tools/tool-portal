import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { SnsSplitImageMakerApp } from "@/components/sns-split-image-maker/SnsSplitImageMakerApp";

export const metadata: Metadata = {
  title: "SNS Split Image Maker",
  description: "A Kuro Stream Kit tool for choosing SNS posting presets, tuning 2-, 3-, and 4-split images, and exporting PNG/JPEG files in posting order."
};

export const dynamic = "force-dynamic";

export default function SnsSplitImageMakerPage() {
  return (
    <PortalShell mode="workspace">
      <SnsSplitImageMakerApp />
    </PortalShell>
  );
}
