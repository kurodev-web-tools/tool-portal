import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalToolsIndex } from "@/components/portal/PortalToolsIndex";

export default function ToolsPage() {
  return (
    <PortalShell>
      <Suspense fallback={<div className="panel p-8 text-sm text-muted">ツール一覧を読み込んでいます。</div>}>
        <PortalToolsIndex />
      </Suspense>
    </PortalShell>
  );
}
