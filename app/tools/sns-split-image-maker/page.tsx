import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { SnsSplitImageMakerApp } from "@/components/sns-split-image-maker/SnsSplitImageMakerApp";

export const metadata: Metadata = {
  title: "SNS分割画像メーカー",
  description: "SNS投稿向けの分割画像プリセットを選び、2分割/3分割/4分割画像を手動調整して投稿順どおりにPNG/JPEGで書き出せるV Streamer Toolsのツールです。"
};

export default function SnsSplitImageMakerPage() {
  return (
    <PortalShell mode="workspace">
      <SnsSplitImageMakerApp />
    </PortalShell>
  );
}
