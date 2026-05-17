import type { Metadata } from "next";
import { PortalHome } from "@/components/portal/PortalHome";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = {
  title: "Home",
  description: "Kuro Stream Kitの公開最小セットへの入口。Schedule Calendar、Thumbnail Editor、SNS分割画像メーカーへ移動できます。"
};

export default function Home() {
  return (
    <PortalShell>
      <PortalHome />
    </PortalShell>
  );
}
