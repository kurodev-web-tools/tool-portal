import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalToolsIndex } from "@/components/portal/PortalToolsIndex";
import { portalMetadata } from "@/lib/portal-metadata";
import { portalCopy } from "@/lib/portal-copy";

const toolsMetadata = portalMetadata.ja.tools;

export const metadata: Metadata = {
  title: toolsMetadata.title,
  description: toolsMetadata.description
};

export default function ToolsPage() {
  return (
    <PortalShell>
      <Suspense fallback={<div className="panel p-8 text-sm text-muted">{portalCopy.ja.loading.tools}</div>}>
        <PortalToolsIndex />
      </Suspense>
    </PortalShell>
  );
}
