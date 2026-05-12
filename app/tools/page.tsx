import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalToolsIndex } from "@/components/portal/PortalToolsIndex";

export const metadata: Metadata = {
  title: "Tools",
  description: "V Streamer Toolsのツール一覧。公開版で利用できるSchedule Calendar、Thumbnail Editor、SNS分割画像メーカーと準備中の候補を確認できます。"
};

export default function ToolsPage() {
  return (
    <PortalShell>
      <Suspense fallback={<div className="panel p-8 text-sm text-muted">ツール一覧を読み込んでいます。</div>}>
        <PortalToolsIndex />
      </Suspense>
    </PortalShell>
  );
}
