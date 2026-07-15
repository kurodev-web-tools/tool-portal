import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { ViewerEngagementPromptBoardApp } from "@/components/viewer-engagement-prompt-board/ViewerEngagementPromptBoardApp";

export const metadata: Metadata = {
  title: "配信カンペボード",
  description: "配信ごとの話題、注意事項、進行メモをブラウザだけで整理する Kuro Stream Kit の無料ツールです。"
};

export const dynamic = "force-dynamic";

export default function ViewerEngagementPromptBoardPage() {
  return (
    <PortalShell mode="workspace">
      <ViewerEngagementPromptBoardApp />
    </PortalShell>
  );
}
